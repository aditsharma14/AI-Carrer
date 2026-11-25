# Staff Engineering Roadmap

Companion to [`STAFF_ENGINEERING_AUDIT.md`](STAFF_ENGINEERING_AUDIT.md). Finding IDs (for example `TEN-01`) refer to that document. Progress is tracked in [`STAFF_TRANSFORMATION_PROGRESS.md`](STAFF_TRANSFORMATION_PROGRESS.md).

## Principles applied to the ordering

1. **Prove the foundation before building on it.** The core data path has not been exercised against a database (TEN-01). Nothing is "done" until a real-database test says so.
2. **Smallest complete increment.** Each milestone is shippable on its own, with tests, lint, build, diff review and documentation.
3. **Fix what blocks the product before adding to it.** The product cannot create a resume from the UI today (API-01); adding features first would stack unverified code on a broken base.
4. **Pull small, independent security fixes forward** instead of waiting for the security phase.
5. **No new infrastructure without evidence.** Every new component needs a measured reason and an ADR.

## Gating rules

- A phase does not start while the previous phase has an **unresolved P0**. No phase after Phase 1 may start until TEN-01 and TEN-02 are closed.
- **TEN-01 and TEN-02 are closed only when all of these hold:** (1) the fix is merged to `main`; (2) the named regression tests exist (the tenant-hook probe and the populate-scoping test, plus the isolation matrix); (3) the CI `integration` job, running against a **real MongoDB**, is green on `main` and the run is linked in the progress file. A merged code change, a local run, or a unit test with mocked models does not close them. Closure is recorded as VERIFICATION REQUIRED until all three are shown.
- **Phase 1 is not complete** until every exit criterion in its checklist (below) is met; passing most of them is IN PROGRESS.
- A task is **COMPLETED** only after: tests added and run, lint and build run, diff inspected, documentation updated, and the result recorded in the progress file. Anything that cannot be verified here (no database, no Docker on the development machine) is recorded as **VERIFICATION REQUIRED** with where it will be verified (CI).
- Every major architectural change gets an ADR with: context, problem, options considered, decision, trade-offs, consequences, revisit conditions.

## Pre-pilot gate (separate from the phase gates)

The phase gates protect correctness. A second, independent gate protects people: **no external user, and no real personal data, until all of these are verified**, even if the phases they sit in have not been reached:

| Requirement | Finding | Scheduled in |
| --- | --- | --- |
| Deletion, export and retention work | DATA-02 | M5.7 (pull forward if a pilot is planned earlier) |
| Password reset and email verification | AUTH-01 | M5.7 |
| AI job results scoped to their creator or admins | RBAC-01 | M7.1 |
| Sensitive actions audited | AUD-01 | M7.3 |
| Deployment validated and a backup restored once | OPS-02, R-14 | Phase 10 |

The gate does not replace or weaken the P0 rule; it exists because several P1 findings are scheduled after Phase 1.

## Summary

| Phase | Theme | Complexity | Main findings | Depends on |
| --- | --- | --- | --- | --- |
| 1 | Backend correctness and architecture | **XL** | TEST-01, TEN-01, TEN-02, API-01, PROD-01, SEC-01, SEC-03, OPS-01, DATA-03, JOB-01, SEC-02, DATA-01 | none |
| 2 | AI infrastructure (remaining delta) | **L** | AI-02, AI-03, AI-01, model routing | 1 |
| 3 | Persistent RAG | **XL** | AI-06, RAG-01, AI-05 | 1, 2 |
| 4 | Agent architecture | **L** | AGT-01, AI-04 | 2, 3 |
| 5 | Product completeness | **XL** | PROD-02, PROD-03, AUTH-01, DATA-02 | 1, 3 |
| 6 | Distributed systems | **L** | JOB-02, JOB-03, SEC-05 | 1 |
| 7 | Security review and threat model | **L** | AUTH-02, AUTH-03, RBAC-01, AUD-01, SEC-04, SEC-06, API-03 | 1, 5 |
| 8 | Performance and observability | **L** | OBS-01, PERF-01, PERF-02, SLOs, benchmarks | 1, 6 |
| 9 | Testing | **L** | FE-01, contract/E2E, load, security tests | 1 onward |
| 10 | Production readiness | **M** | OPS-02, DOC-01, DEP-01, DR drill | all |

*Phase complexity is the effort of the whole phase (the sum of its milestones), not of its hardest milestone. Phase 1 is XL because its eight milestones add up to several weeks.*

---

## Phase 1: Backend correctness and architecture

**Objective.** Make the existing system actually work, prove it with real-database tests, and close the P0/P1 defects that are small, independent or foundational.

**Exit criteria (all required; each is checked by a named CI job, not by reading code):**

1. TEN-01 and TEN-02 closed under the closure rule in the gating section.
2. These journeys pass as integration tests against real MongoDB and Redis: signup, login, tenant resolution; resume upload (PDF and DOCX), manual create, read, update, delete; apply to a job; trigger matching; poll an AI job to completion.
3. A tenant-isolation matrix passes: for every endpoint group, a user in tenant B cannot read or change tenant A's resource and receives 404 or 403.
4. The UI/API contract check reports 0 frontend calls without a backend route.
5. Production boot rejects weak secrets; the DOCX bomb is rejected within the stated limits; a Redis outage returns within the stated bounds.
6. Failure-injection tests show no orphan user after a failed signup, no duplicate `ResumeVersion` after a retry, and no file bytes in `AiJob` or the queue.
7. The AI quality gate, unit tests, lint and builds remain green; the progress file records each milestone with its CI run.
8. No P0 open.

| Milestone | Scope | Findings (debt) | Depends on | Independently verified by | Cx |
| --- | --- | --- | --- | --- | --- |
| **M1.0** Integration harness | Real-MongoDB (a single-node replica set, so transactions can be tested) and Redis integration job in CI via service containers; shared test-app factory and seed helpers; exact-pin `mongoose` (a caret range already moved it from 9.7.2 to 9.12.3); first tests: signup, login, tenant resolution. **The tenant regression test is committed in a state that fails against the current plugin**, recorded in the pull request, to prove the harness can see the defect | TEST-01 (TD-01, TD-19, TD-29, TD-31) | none | CI job `integration` runs against real services; the deliberate TEN-01 failure is visible in the run | M |
| **M1.1** Tenant safety net | Async plugin hooks; scope or replace the `populate`; guards for the methods that bypass query middleware; a test that fails if a `populate` targets a scoped model without a tenant match | TEN-01, TEN-02 (TD-02) | M1.0 | `integration` green on `main`: the M1.0 test now passes, plus scoped/unscoped/opt-out queries per guarded method | S |
| **M1.2** UI/API contract | Align the resume upload and manual-create paths; add `PATCH`/`DELETE /resumes/:id` with ownership checks; wire apply; route the coach page; a contract test (every frontend call has a backend route); one `getOwnedResume` helper | API-01, PROD-01 (TD-03, TD-08) | M1.1; decision 2 | Integration tests for upload, manual create, update, delete and apply through the UI's paths; contract script reports 0 unmatched | M |
| **M1.3** Fast security and resilience fixes | Production secret validation; DOCX/PDF size and time limits; fail-open cache and bounded enqueue returning 503 | SEC-01, SEC-03, OPS-01 (TD-25) | M1.0 (OPS-01 needs the Redis service; SEC-01 and SEC-03 are independent and may come earlier) | Unit tests (SEC-01); bomb test with measurable limits (SEC-03); Redis-down integration test (OPS-01) | M |
| **M1.4a** Atomic multi-write operations | Transactions for signup, apply and manual resume; a recoverable enqueue (a sweeper re-enqueues `queued` jobs older than N minutes) | DATA-03 (TD-06) | M1.1, M1.0 (replica set) | Failure-injection integration tests: no orphan user, no counter drift, stuck job recovered | M |
| **M1.4b** Job lifecycle | One `runAiJob` wrapper; compare-and-set state machine; failure recorded only on the final attempt; deterministic BullMQ job ids; idempotent writes; a payload version field so API and worker can be deployed out of step | JOB-01, DEBT-01 (TD-04, R-27) | M1.4a | Integration tests: retry (one success, no failed flash), duplicate delivery (one side effect), illegal transition (rejected) | L |
| **M1.5** Sessions | Revoke on password change; a `Session` model with rotated hashes, reuse detection and several devices | SEC-02 | M1.0 | Integration tests: old token rejected after password change; reuse revokes the family; two devices at once | M |
| **M1.6** File handling | Store the uploaded file once in MongoDB (GridFS or a TTL-indexed collection; no new service), pass only a reference through the queue and the `AiJob`, delete after parsing by policy | DATA-01 (TD-05) | M1.4b; decision 3 | Test: `AiJob` and queue payload contain no file bytes; TTL deletion verified | M |

Also in Phase 1 where touched: the standardized-response and error contract is already in place (`{ code, message, details, requestId }`); API versioning (`/api/v1`) exists; cursor pagination exists for the main lists and is extended where an endpoint is touched (API-02). No new response envelope is introduced.

**Decisions.** Only decision 1 is needed before Phase 1 starts; decision 2 before M1.2, decision 3 before M1.6, and decision 4 is a standing "hold" (see the decision table).

**ADRs.** ADR 0009 "Real-database integration testing"; ADR 0010 "Atomic writes, job lifecycle state machine and idempotency"; ADR 0011 "Session model and refresh-token reuse detection"; ADR 0017 "Uploaded file storage and retention".

## Phase 2: AI infrastructure (remaining delta)

Most of this phase already exists: provider abstraction, retries and timeouts, fallback, circuit breakers, structured-output validation, prompt versioning, token and cost metrics. What remains:

| Milestone | Scope | Findings | Cx |
| --- | --- | --- | --- |
| M2.1 Provenance | Persist `promptVersion`, `provider`, `model`, tokens and estimated cost on every AI-produced record | AI-02 | M |
| M2.2 Tenant attribution and budgets | Attribute usage to `orgId`; monthly soft and hard limits; clear errors | AI-03 | M |
| M2.3 Context budgets | Token-aware history window with a rolling summary; per-feature budgets | AI-01 | M |
| M2.4 Model routing | Route by task (cheap model for explanations, stronger for extraction) from configuration, evaluated by the existing harness before enabling; record real-model baselines | TD-22 | M |
| M2.5 Stub decoupling | AI services stop taking `mock` callbacks; the stub provider owns its fixtures; stub-only heuristics leave 11 production files | TD-07 | M |

**Exit criteria.** Every AI result is traceable to prompt, model and tenant; an over-budget tenant is refused cleanly; routing proven on the evaluation dataset, not asserted.

**ADRs.** ADR 0012 "AI usage attribution and budgets"; ADR 0013 "Model routing".

## Phase 3: Persistent RAG

**Objective.** Persist documents, chunks and embeddings; make retrieval tenant-aware, attributable and measured; enable candidate search.

**Preliminary vector-store evaluation** (the decision is made by ADR in this phase, after a small benchmark; this is the starting lean, not the decision):

| Option | For | Against | Lean |
| --- | --- | --- | --- |
| **MongoDB Atlas Vector Search** | Already the system of record; no new service; tenant pre-filter on `orgId`; hybrid with Atlas Search; one backup story | Requires Atlas (or the `atlas-local` image for development and CI); not available on plain `mongo:7`; vendor coupling | **Primary candidate**, because deployment already assumes Atlas |
| Qdrant | Purpose-built, strong filtering, hybrid and quantization | A new stateful service to run, secure and back up; dual-write consistency with MongoDB | Choose only if Atlas is ruled out or the benchmark shows a real gap |
| pgvector | Familiar, transactional | Introduces PostgreSQL, a second datastore the product does not otherwise need | Reject unless Postgres is adopted for other reasons |

Benchmark for the ADR: recall@10 against exact search, p95 latency, filtered-query correctness (a tenant must never see another tenant's chunks), on the evaluation dataset plus a generated larger corpus; results recorded with environment details. **No benchmark numbers are claimed before they are measured.**

| Milestone | Scope | Findings | Cx |
| --- | --- | --- | --- |
| M3.1 Taxonomy | Promote the skill taxonomy; normalize skills at parse time; role requirements from data | AI-06 | M |
| M3.2 Document and chunk store | Persist documents, chunks, metadata, embedding model name and version, with `orgId` | RAG-01 | L |
| M3.3 Ingestion and re-indexing | Embed on write through the queue; re-embed on model change; idempotent | RAG-01 | L |
| M3.4 Vector search | One chosen store; tenant pre-filtering; hybrid retrieval and reranking only if the evaluation shows a gain | RAG-01 | L |
| M3.5 Attribution and evaluation | Source attribution in responses; retrieval evaluation (recall@k, NDCG) in the CI gate | RAG-01, AI-05 | M |
| M3.6 Candidate search | Recruiter search over opted-in candidates with filters, explainable results | PROD-03 | L |

**Exit criteria.** A tenant-filtered search returns attributed results; a cross-tenant leak test passes; the retrieval evaluation is in CI; the old per-request embedding path is removed (no duplicate implementations).

**ADRs.** ADR 0014 "Vector store selection" (with benchmark); ADR 0015 "Persisted embeddings and re-indexing".

## Phase 4: Agent architecture

Review before adding. Today: Career Coach, Hiring (candidate summary), Interview (mock grading), Learning, on one orchestrator with a 3-round cap and tenant-bound tools. "Resume Intelligence", "Skill Intelligence" and "Job Matching" are services and should stay services unless an evaluation shows tool-using behavior helps.

| Milestone | Scope | Findings | Cx |
| --- | --- | --- | --- |
| M4.1 Contracts | Structured input and output per agent; tool authorization table | AGT-01 | M |
| M4.2 Control | Token budgets, timeouts, retry boundaries; no agent-to-agent calls | AGT-01 | S |
| M4.3 Traces | One trace record per run (steps, tools, tokens, latency, outcome) | AGT-01, OBS-01 | M |
| M4.4 Evaluation | A scenario suite (task success, correct tool choice, rounds, cost) added to the gate | AGT-01 | M |
| M4.5 Injection coverage | Scan every candidate-authored input; record real-model attack success and add it to the manual evaluation workflow | AI-04, TD-22 | S |

**Exit criteria.** Every agent run is traceable and bounded; the scenario evaluation passes in CI; no unbounded loops.

**ADR.** ADR 0016 "Agent boundaries and orchestration".

## Phase 5: Product completeness

Coherent journeys, not isolated screens. Each milestone ends with an end-to-end test.

| Milestone | Journey | Findings |
| --- | --- | --- |
| M5.1 Pipeline | Recruiter moves candidates through stages with history; seeker sees "my applications"; funnel analytics become real | PROD-02, JOB-03 |
| M5.2 Candidate profile | Profile built from the parsed resume with user edits winning; consent flags | PROD-03, DATA-02 |
| M5.3 Explainable matching | Score with per-requirement evidence and gaps; calibrated | AI-05 |
| M5.4 Recruiter collaboration | Notes and comments, shared shortlists, candidate comparison | PROD-03 |
| M5.5 Interview scorecards | Structured scorecards per interview, aggregated | PROD-03 |
| M5.6 Learning and roadmap persistence | Roadmap and progress stored per user | PROD-03 |
| M5.7 Account lifecycle | Password reset, email verification, deletion, export | AUTH-01, DATA-02 |

**Exit criteria.** The two main user journeys (seeker: upload, analyze, match, apply, track; recruiter: post, receive, rank, move, hire) pass end to end in CI.

## Phase 6: Distributed systems

| Milestone | Scope | Findings |
| --- | --- | --- |
| M6.1 Failure handling | Dead-letter listing and retry for failed jobs; prioritization for user-initiated work; Redis-down behavior verified for producers and workers | JOB-02, OPS-01 |
| M6.2 Work bounds | Bounded concurrency in processors; analytics by aggregation with a single-flight lock; scheduled refresh | JOB-03, PERF-01 |
| M6.3 Shared limits | Redis-backed rate limiting that fails open | SEC-05 |
| M6.4 Chaos verification | Tests for worker crash mid-job, duplicate delivery, timeouts and provider failure, asserting exactly-once effects | JOB-01 |

No Kafka or additional services: there is no measured need.

## Phase 7: Security

Threat model (STRIDE over the real data flows: browser, API, worker, queue, MongoDB, AI providers, email) and automated tests for the important boundaries.

| Milestone | Scope | Findings |
| --- | --- | --- |
| M7.1 Authorization | Scope AI jobs to creator or admin; a declared policy on every route enforced by a test; exact capability matching; resolve the default organization explicitly and cache memberships per token | RBAC-01, AUTH-04 (TD-09, TD-12) |
| M7.2 Auth hardening | Enumeration-safe responses; refresh cookie path and CSRF header; algorithm pinning; password limits; validated path parameters | AUTH-02, AUTH-03, SEC-06, API-03 (TD-17) |
| M7.3 Audit | Audit sensitive actions with an admin read endpoint | AUD-01 |
| M7.4 Web hardening | Security headers and CSP on the web container, checked by `check:deployment` | SEC-04 |
| M7.5 Threat model and tests | `docs/security/THREAT_MODEL.md`; isolation, injection and upload abuse tests in CI | all |

## Phase 8: Performance and observability

| Milestone | Scope | Findings |
| --- | --- | --- |
| M8.1 Signals | Request id propagated into jobs and logs; database and Redis timings; worker metrics and health; optional error monitoring | OBS-01 |
| M8.2 SLOs | Define SLIs and SLOs from measured baselines (not invented) | OBS-01 |
| M8.3 Benchmarks | Reproducible load tests (tool, hardware, dataset, concurrency, duration, throughput, p50/p95/p99, error rate, resource use) | PERF-01 |
| M8.4 Optimizations | Only those a benchmark justifies | PERF-01, PERF-02 |

**Rule:** no benchmark result is written into documentation unless it was produced by a recorded, reproducible run.

## Phase 9: Testing

Layered strategy, built incrementally from Phase 1.

- **Backend:** unit, real-MongoDB integration, API contract, tenant-isolation matrix, queue (duplicate delivery, retry, crash).
- **Frontend:** component, hook (mocked network), guard and interceptor tests, accessibility checks, a small Playwright suite over the critical journeys (FE-01); AI-job polling backoff and timeout (FE-02).
- **AI:** golden datasets, output schema tests, retrieval evaluation, injection tests, regression evaluation, provider-failure tests (most exist).
- **System:** end-to-end, load, security, deployment smoke tests.
- **CI:** every gate runs on every pull request; slow suites on a schedule.

## Phase 10: Production readiness

A review against: Docker builds, compose, configuration, CI/CD, deployment, health and readiness, graceful shutdown, logging, metrics, error monitoring, backup and **a tested restore**, rollback, runbooks, dependency security. The output is a signed-off list of remaining risks (see [`RISK_REGISTER.md`](RISK_REGISTER.md)). Documentation is reconciled with the code (DOC-01, TD-33 to TD-36). Housekeeping: DEBT-02 (unused component, lint warning; TD-18).

---

## Technical-debt placement

Every entry in [`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md) has a home. "Later" means intentionally unscheduled until its interest shows.

| Debt | Milestone | Debt | Milestone | Debt | Milestone |
| --- | --- | --- | --- | --- | --- |
| TD-01 | M1.0 | TD-13 | M5.1, M6.2 | TD-25 | M1.3 |
| TD-02 | M1.1 | TD-14 | M2.1 | TD-26 | M7.4 |
| TD-03 | M1.2 | TD-15 | M2.3 | TD-27 | Phase 10 (and before the first deploy) |
| TD-04 | M1.4b | TD-16 | M1.5, M5.7 (split the service as sessions and reset are added) | TD-28 | M8.1 |
| TD-05 | M1.6 | TD-17 | M7.2 | TD-29 | M1.0 |
| TD-06 | M1.4a | TD-18 | Phase 10 | TD-30 | After M1.0 and M1.4b (see decision 4) |
| TD-07 | M2.5 | TD-19 | M1.0, then every milestone | TD-31 | M1.0 |
| TD-08 | M1.2 | TD-20 | Phase 9 | TD-32 | Later |
| TD-09 | M7.1 | TD-21 | M6.4 | TD-33, TD-34 | Phase 10 (TD-34 with M2.1) |
| TD-10 | M3.1 | TD-22 | M2.4, M4.5 | TD-35 | Before Phase 1 starts (needs approval to edit `GAP_ANALYSIS.md`) |
| TD-11 | M3.2 to M3.4 | TD-23 | M8.1 | TD-36 | M7.5, M8.2, Phase 10 |
| TD-12 | M7.1 | TD-24 | M6.3 | | |

## Decisions: what is needed, and when

**Decision log.** D1 was **DECIDED on 2026-11-25**: use MongoDB replica-set service containers in CI for real-database integration tests (a single-node replica set, so transactions can be tested). `mongodb-memory-server` is **not** adopted; local runs are not required. No new application dependency follows from this decision. Decisions 2 to 5 remain open.

The recommendations below are unchanged from the first version of this roadmap; the columns say what happens if a decision is delayed and the latest milestone by which it must be made.

| # | Decision | Recommendation | Reason | Impact of delaying | Latest milestone |
| --- | --- | --- | --- | --- | --- |
| 1 | How to run real-database tests (**DECIDED 2026-11-25: CI replica-set service containers**) | (a) CI service containers only; add `mongodb-memory-server` (a dev dependency that downloads a `mongod` binary of roughly 100 to 200 MB) only if you want local runs | No new dependency; the development machine has neither MongoDB nor Docker; CI is where the gate runs anyway | **M1.0 cannot start**; nothing else in Phase 1 can be proven | **Before M1.0** |
| 2 | Contract direction for the resume endpoints | Change the frontend to the backend's routes; add the missing `PATCH`/`DELETE` | The backend routes are documented and tested; the frontend calls are the ones that do not exist | M1.2 blocked; M1.0, M1.1 and M1.3 to M1.5 unaffected | **Before M1.2** |
| 3 | Retention periods | Uploaded files deleted after parsing; `AiJob` payloads and results 30 days; coaching transcripts until the user deletes them | Needed to set TTLs and the deletion test; defaults are conservative | M1.6 blocked; DATA-02 later needs the full policy | **Before M1.6** (full policy before M5.7) |
| 4 | Held Dependabot majors | Hold `bullmq` 6 and `ioredis` 6 until queue integration tests exist (after M1.4b); decline the two Node 25 image bumps; merge frontend and tooling majors one at a time | Queue and Redis clients are not exercised end to end today; Node 25 is not LTS | **None**: holding is the default, and merging is optional work | Revisit **after M1.4b** |
| 5 | Error monitoring | Decide in Phase 8; do not add a dependency before then | Not needed to prove correctness; adds a dependency and a vendor | None for Phase 1 to 7 | **Before M8.1** |

## Estimating note

Complexity labels are relative, not calendar promises: **S** hours, **M** one to three days, **L** about a week, **XL** multiple weeks of focused work. Phases 3 and 5 are the largest and are deliberately split into milestones that each ship on their own.
