# 0006. Tenant isolation by convention, with a safety net and known gaps

Status: Accepted   ·   Date: 2026-11-24

## Context

Many organisations share one database. A recruiter at one company must never see another company's jobs,
applicants or resumes. A leak is the worst kind of bug for this product: invisible until it is reported, and
damaging to trust and to the data subjects. We also have a few intentional cross-tenant reads: a job seeker
applies to jobs that belong to other organisations, and the seeker's resume lives in their own personal tenant.

## Options considered

- **A database per tenant.** Strongest isolation, but operationally heavy at the scale we expect.
- **Row-level scoping by convention only.** Cheap, and one forgotten filter is a data leak.
- **Convention plus an automatic safety net.** Cheap, and a forgotten filter fails loudly instead of leaking.

## Decision

Every tenant-owned document has an `orgId`, and every repository method takes `orgId` as its **first, mandatory
argument**. On top of that, `tenantScope.plugin.js` makes any Mongoose query on a tenant-scoped model **throw** if
its filter has no `orgId`, unless the query opts out with an explicit `allowCrossTenant: true`. The three
legitimate cross-tenant reads (a user's own memberships, the public list of open jobs, duplicate-application
checks) carry that flag, so every exception is greppable.

## Consequences

- A forgotten filter becomes an error in development and tests, not a silent leak.
- **The plugin does not cover everything.** `bulkWrite`, `insertMany` and `aggregate()` skip Mongoose query
  middleware, so for those the only protection is writing `orgId` into every operation by hand. An audit of this
  codebase found exactly one such defect: matching upserts filtered on job and application ids without the
  tenant. It is fixed, and `test/matchingTenancy.test.js` now pins it for every bulk operation. There are no
  `aggregate()` calls at present; adding one needs `$match: { orgId }` as its first stage and a test.
- Isolation is only as good as the convention is followed, which is a review discipline.
- **Not yet tested end to end:** there are no API-level tests against a real database proving that tenant A cannot
  read tenant B's data through each endpoint. That is the largest remaining gap in this area.

## Revisit when

A customer requires physical separation (then a database per tenant for that customer), or the number of
exceptions to the rule grows. The next concrete step is integration tests in CI (MongoDB and Redis as service
containers) that sign up two tenants and attempt every cross-read.
