# Integration testing

Real-database tests for the backend. Introduced in milestone M1.0 of the staff transformation roadmap ([`STAFF_ENGINEERING_ROADMAP.md`](STAFF_ENGINEERING_ROADMAP.md)).

The unit suite (`npm test`) mocks the Mongoose models, which is why it could not see that the tenant-isolation plugin throws on every query (TEN-01). The integration suite runs the **real Express app over HTTP** against a **real MongoDB replica set** and a **real Redis**. Nothing is mocked. AI stays on the stub provider and email on the log provider, so no test can reach a paid or external service.

## What it contains

| Path | Purpose |
| --- | --- |
| `backend/vitest.integration.config.mjs` | Separate Vitest config; runs `test/integration/**`, one file at a time (shared database) |
| `backend/test/integration/setup.js` | Points the app at the integration database before any app module loads |
| `backend/test/integration/support/safety.js` | Refuses to run unless the database name ends in `_integration` (the harness deletes all data in it) |
| `backend/test/integration/support/harness.js` | `startHarness()`: connects, builds indexes, listens on a random port, offers `request()`, `reset()`, `stop()` |
| `backend/test/integration/support/factories.js` | Seed helpers for users, organizations and memberships, written through the native driver so seeding never depends on the tenant plugin |
| `harness.test.js` | The harness itself: replica set present, `/ready` checks MongoDB and Redis, cleanup works, the safety guard refuses unsafe databases |
| `auth.test.js` | Signup, duplicate email, validation, login, `/auth/me`, refresh rotation |
| `tenant.test.js` | Tenant resolution, including the **TEN-01 regression tests** (below) |

HTTP uses Node's built-in `fetch`. No `supertest` is needed and none was added (it was checked first: it is not a dependency of this repository).

## Running it

You need a MongoDB **replica set** and a Redis. The database name must end in `_integration`.

```powershell
# from the repository root, with Docker available
docker run -d --name ai-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
docker exec ai-mongo mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
docker run -d --name ai-redis -p 6379:6379 redis:7-alpine

cd backend
$env:INTEGRATION_MONGODB_URI = "mongodb://localhost:27017/ai_career_integration?directConnection=true"
npm run test:integration
```

`npm test` is unchanged and never needs a database: the integration directory is excluded from the unit config.

Without `INTEGRATION_MONGODB_URI` the suite stops immediately with an explanatory error. This is deliberate: a developer's real `MONGODB_URI` is never used.

## CI

The `integration` job in `.github/workflows/ci.yml` runs on every pull request and every push to `main`.

- **Redis 7** is an Actions service container with a `redis-cli ping` health check.
- **MongoDB 7** is started with `docker run ... --replSet rs0` in a step, then initiated as a single-node replica set, then polled until a writable primary exists. This is a container but not an Actions `services:` entry, because service containers cannot pass the `--replSet` argument.
- The job fails if MongoDB does not start or no primary is elected (the logs are printed), then installs dependencies and runs `npm run test:integration`.

## TEN-01 in this suite, and what green means

`tenant.test.js` contains two groups, on purpose:

1. **Known-defect tests** assert the failure as it is today against the real database: a scoped query and an `allowCrossTenant` query both reject with `next is not a function`; a model without the plugin (`User`) queries normally (the control); and tenant resolution answers `500` with the server log naming the same cause and the request's id. They **pass while the defect exists**.
2. **Target-behavior tests** state what must be true once isolation works (the caller's tenant is resolved; a user cannot act in another organization). They use `it.fails`, so they pass while the behavior is broken and **fail the moment it starts working**.

**A green integration job therefore does not mean TEN-01 is fixed.** It means the harness can see the defect and is reporting it exactly. TEN-01 and TEN-02 remain OPEN. Per the roadmap's closure rule, they close only when milestone M1.1 has fixed the plugin and the integration job is green on `main` with the target-behavior tests running as ordinary tests.

### Transition required in M1.1

When the tenant plugin is fixed, the target-behavior tests start passing and `it.fails` turns that into a failure. That is the cue to:

1. delete the whole `KNOWN DEFECT TEN-01` block in `tenant.test.js` (it asserts the bug);
2. change every `it.fails(` in `TARGET BEHAVIOR` to `it(`;
3. keep the same assertions; the suite must pass through real tenant isolation.

TEN-02 (`populate()` is refused once hooks work) is not tested here; it belongs to M1.1.

## Limits of this suite

- It covers signup, login, session refresh and tenant resolution only. Other journeys arrive with later milestones.
- The seeded users use bcrypt cost 4 for speed; the app's own signup path still uses cost 12.
- It does not test deletion, transactions or the queue worker.
- The first full run in CI is the first time these tests execute against a real MongoDB; see the milestone report for what was and was not run locally.
