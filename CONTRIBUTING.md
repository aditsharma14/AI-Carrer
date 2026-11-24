# Contributing

## Run it locally

```bash
cp backend/.env.example backend/.env
# For a run with no API keys, set AI_PROVIDER=stub and EMBEDDING_PROVIDER=stub in backend/.env
docker compose up --build        # MongoDB, Redis, API, worker and web app
```

Or run the pieces yourself: `cd backend && npm install && npm run dev` (plus `npm run worker:dev`) and
`cd frontend && npm install && npm run dev`. You need MongoDB and Redis running.

## Before you push

```bash
cd backend  && npm test && npm run eval:check
cd frontend && npm run lint && npm test && npm run build
```

CI runs the same, plus `npm audit` on production dependencies, a build of both Docker images, and a
smoke test that starts the whole stack and checks that it shuts down cleanly.

`npm run eval:check` is the **AI quality gate**: it fails if a change makes parsing or ranking measurably
worse. If a change is meant to move a score (new prompt, new dataset trap), re-record the baseline with
`npm run eval -- --provider stub --embedding stub --write-baseline` and explain why in the commit.
Read `backend/eval/README.md` first: it says what the numbers do and do not mean.

## Commits

One logical change per commit, with a message that says **what changed and why**, not only what:

```
fix(security): scope matching upserts to the tenant

Why it was wrong, what the fix does, what test pins it, what else was checked.
```

Types in use: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`. Prefer a scope:
`feat(ai):`, `fix(resumes):`. Keep tests in the same commit as the code they cover, and keep every commit
passing.

## Conventions worth knowing

- **Tenancy:** repository methods take `orgId` first. A query on a tenant-scoped model without it throws. For
  `bulkWrite`, `insertMany` and `aggregate()` the safety net does not run, so put `orgId` in by hand and add a test
  (see `docs/adr/0006`).
- **AI calls** go through `aiClient`, never a provider directly, and prompts that return structured data have a schema
  in `src/ai/schemas.js`. Changing a prompt's instructions means a new version file (`foo.v3.js`).
- **Anything from a resume, job post or transcript** is untrusted: put it in a tagged data block
  (`ai/prompts/dataBlock.js`), never in a system message.
- **Decisions:** if you make one that is hard to reverse, add a record under `docs/adr/`.

## Security

Report vulnerabilities privately; see `SECURITY.md`.
