# Staff Engineering Audit

**Scope:** the whole repository at commit `50c68da` (`main`, 2026-11-25): backend, frontend, models and indexes, authentication and authorization, tenant isolation, API surface, AI layer, queues, tests, CI/CD, containers, dependencies and documentation.
**Phase:** 0 (audit only). No application code was modified. Probe scripts were run from a scratch directory outside the repository.

## How to read this

- **Evidence standard.** A finding is marked *Verified* only when I executed something that demonstrates it (a probe, a measurement, an enumeration of the real route table or import graph). Findings that rest on reading code are marked *Code-read*. Anything I could not verify is said so under **Limits of this audit**.
- **Severity.** P0 critical correctness / security / data-loss. P1 high-priority production issue. P2 important engineering improvement. P3 optimization or future enhancement.
- **Complexity.** S (hours), M (1-3 days), L (about a week), XL (multi-week).
- Each finding has: ID, severity, affected files, evidence, user or business impact, technical impact, recommended solution, dependencies, acceptance criteria.
- Reproduction commands for the headline evidence are in [Appendix A](#appendix-a-reproducing-the-evidence). Runnable scripts for every executed probe are in [`audit-evidence/`](audit-evidence/README.md), and the per-finding verification status (CONFIRMED, PARTIALLY CONFIRMED, VERIFICATION REQUIRED) is in [`PHASE_0_APPROVAL_REVIEW.md`](PHASE_0_APPROVAL_REVIEW.md).

---

## 1. Executive summary

The repository is a well-organised **modular monolith with a strong AI and delivery layer and an unverified core data path**.

What is genuinely good: consistent Route to Controller to Service to Repository layering, `orgId` as the first argument of every repository method, centralized error handling that never leaks 5xx text, schema-validated AI output with provider fallback and circuit breakers, a three-layer prompt-injection defense, an AI evaluation harness gated in CI, Prometheus metrics, graceful shutdown, container images, dependency audits and code scanning.

What is wrong at the root: **the tenant-isolation plugin throws `next is not a function` on every query against every tenant-scoped model** with the Mongoose version the project has used since its first commit (TEN-01, *Verified*). Because the unit tests mock the models, and CI never talks to a database, nothing caught it. On top of that, the UI and API disagree about the resume endpoints (API-01), the AI coach page is not routed (PROD-01), and the hiring pipeline has no way to change a candidate's status (PROD-02).

**The honest status:** the AI infrastructure is in better shape than the product it serves. The product's core data path has, as far as the evidence shows, never run end to end. That is fixable quickly, and the first phase of the roadmap is built around proving it with real-database tests.

| Count | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| Findings | 2 | 13 | 24 | 7 |

---

## 2. Current architecture assessment

**Shape.** One Node/Express codebase, deployed as two processes (API, BullMQ worker) from one image; MongoDB via Mongoose; Redis for queues and the AI result cache; hosted LLM APIs (Groq, Hugging Face) or local Ollama behind one `aiClient`. React SPA with 30 lazily loaded pages. This is the right shape for the stated scale, and nothing in the evidence argues for a different one (see ADR 0001).

**Size.** Backend 151 source files / 7,062 lines; 17 Mongoose models (15 tenant-scoped through a plugin); 47 HTTP endpoints; 8 queues. Frontend 129 files (124 application, 5 test) / 6,034 lines. Backend tests: 25 test files (plus one setup file) / 162 tests; frontend 5 files / 31 tests. *(The first draft of this document said 26 backend test files; that count included `test/setup.js`, which is not a test. Corrected 2026-11-25.)*

**Layering is consistently applied.** Every database call in application code was enumerated (about 100 call sites). The repository layer owns them; services do not touch models directly except `notification.service` and `audit.service`, which are documented exceptions. There are **no unreachable backend modules** (import-graph check).

**Module boundaries** are by convention only. There is no tooling that prevents module A importing module B's model, and no circular-dependency check was run (not measured).

**Where the architecture is weakest:**

1. **Tenant isolation depends on a safety net that does not work** (TEN-01) and a convention that is followed but untested (TEST-01).
2. **Async work is not designed for failure.** The job lifecycle is neither transactional nor idempotent (JOB-01, DATA-03), and the full uploaded file is carried in Redis and persisted in MongoDB (DATA-01).
3. **Retrieval is ephemeral.** Embeddings are recomputed on every request and used by exactly one feature (RAG-01). There is no candidate search.
4. **The UI/API contract is not enforced** by any test (API-01).

---

## 3. Engineering maturity assessment

Scale 1 (absent) to 5 (strong, evidenced). These are judgements, but each cites its evidence.

| Dimension | Score | Evidence |
| --- | --- | --- |
| Architecture and modularity | 3.5 | Clean layering; boundaries by convention; no cycle analysis |
| Correctness of the core data path | **1.5** | TEN-01, TEN-02, API-01; never exercised against a database |
| Security | 2.5 | Good basics (bcrypt 12, rotation, httpOnly cookie, helmet, CORS, no secrets committed); gaps SEC-01 to SEC-05 |
| Reliability | 2.0 | Probes and shutdown are good; Redis outage hangs requests (measured), jobs not idempotent |
| Data management | 2.0 | Indexes mostly right; no transactions, no deletion/export, no retention, files stored in MongoDB |
| AI engineering | 3.5 | Provider abstraction, validation, fallback, breakers, injection defense, evaluation gate; traceability, budgets and real-model measurement missing |
| Testing | 2.0 | 162 backend tests, heavily weighted to the AI layer; **0 integration tests; domain modules have almost no direct tests** (Appendix G) |
| CI/CD and delivery | 3.5 | Tests, AI gate, audits, image builds, stack smoke test, CodeQL, Dependabot; no DB-backed tests, deployment never exercised |
| Observability | 2.5 | JSON logs with request ids, Prometheus metrics; no tracing, no error monitoring, workers invisible |
| Documentation | 3.5 | Extensive (architecture, 8 ADRs, runbook, deployment guide); several claims exceed the implementation (DOC-01) |
| Product completeness | 2.0 | Many pages exist; resume creation, coach chat, apply and pipeline are not wired end to end |

**Overall: about 2.5 / 5.** A promising system with strong AI and delivery foundations whose core path is unproven.

---

## 4. Verified strengths (keep and build on)

- Nearly every tenant-scoped repository method takes `orgId` as its first argument (or in its options object); the 4 cross-tenant reads (a user's memberships, the open-jobs feed, an open job by id, the duplicate-application check) are explicit (`allowCrossTenant`) and intentional.
- Centralized error middleware returns a uniform `{ code, message, details, requestId }` and hides 5xx text.
- Agent tools are closures bound to `(orgId, userId)`, so a model cannot ask for another tenant's data; the tool loop is capped at 3 rounds.
- AI output is validated against zod schemas for every provider, with one bounded repair retry.
- Provider fallback with per-provider circuit breakers; embeddings deliberately do not fall back.
- Access token in memory only; refresh token `httpOnly`, `Secure` in production, rotated, stored hashed.
- Cursor pagination (`createdAt` plus `_id`) on the user-facing lists.
- Upload limited to 5 MB and identified by content, not file name.
- No secrets in tracked files; no sensitive fields in logs; email recipients masked.
- Evaluation harness with a regression gate; injection payloads kept in the data, including known-uncovered ones.

## 5. Checked and found NOT to be problems

Recorded so they are not re-investigated.

- **Broken references in this document.** Every `file:line` citation (25) resolves to the code described, and every relative link resolves (checked mechanically with `audit-evidence/10-governance-doc-check.js`, 2026-11-25).

- **Missing membership index.** `membership.userId` has `index: true` (`membership.model.js:11`), so the per-request `findActiveByUserId` lookup is indexed. My first suspicion here was wrong.
- **AI job queries missing `orgId`.** Every `aiJob.repository` call now carries it (the earlier concern is resolved; what remains is JOB-01).
- **Dead backend code.** None (0 unreachable files).
- **Secrets or tokens in the repository.** None found; only `backend/.env.example` is tracked.
- **`aggregate()` / `insertMany` bypasses.** Neither is used anywhere. Two `bulkWrite` sites exist; both now filter on `orgId` (matching upserts were fixed in `c497329`).
- **Regression introduced by my earlier dependency update.** I checked: the Mongoose break is present in **9.7.2** (the version in the first commit) as well as 9.12.3, so TEN-01 is an original defect, not something `npm audit fix` caused.

---

## 6. Findings

### P0: critical

#### TEN-01 · P0 · The tenant-isolation plugin throws on every query *(Verified)*
- **Affected files:** `backend/src/plugins/tenantScope.plugin.js:14,18`; applied to 15 models (`aiJob, orgStats, auditLog, coachingSession, skillGapReport, membership, interviewSet, mockInterviewSession, application, job, learningRec, matchResult, notification, resume, resumeVersion`).
- **Evidence:** the plugin registers `schema.pre(method, function (next) { ... next() })`. Mongoose 9 does not pass `next` to query middleware. Running the real plugin against Mongoose **9.7.2 and 9.12.3** (`bisect.sh`, Appendix A) gives `next is not a function` for a correctly scoped `find({ orgId })`, an unscoped `find({})`, and a query with `allowCrossTenant`. The failure happens inside the hook, before any I/O, so it does not depend on a database being present. No other `.pre()`/`.post()` hooks exist in the application. Reproduced on 2026-11-25 from the Appendix A command exactly as written, from `audit-evidence/01-tenant-hook-probe.js`, and from `audit-evidence/mongoose-version-bisect.sh` for both versions.
- **User / business impact:** every request that reads or updates tenant data would fail with a 500. *(That downstream consequence is inferred from the code path and is VERIFICATION REQUIRED until M1.0 runs it over HTTP against a real database; the hook failure itself is verified.)* After signup (which only uses `create`, which is not hooked) a user cannot resolve their tenant (`membership.findOne`), so essentially every authenticated flow fails. The product does not work.
- **Technical impact:** the documented defense-in-depth for cross-tenant leaks has never been active. Writes via `create`/`bulkWrite` are unaffected, which hides the problem in a casual test.
- **Recommended solution:** rewrite the hooks as `async function () { ... throw new Error(...) }`, add `aggregate` and the document-level `save`/`insertMany` guards where relevant, and prove it with a real-database test that executes scoped, unscoped and opt-out queries.
- **Dependencies:** TEST-01 (needs a real MongoDB to prove the fix end to end). Must be fixed together with TEN-02.
- **Acceptance criteria:** (1) the probe in Appendix A prints `ok` for a scoped query and a refusal message for an unscoped one; (2) a CI integration test against a real MongoDB passes for scoped, unscoped (rejected) and `allowCrossTenant` queries on a representative model for every guarded method; (3) signup, login and a tenant-scoped read succeed through the HTTP API in CI.

#### TEN-02 · P0 · `populate()` on a tenant-scoped model will be refused once hooks work *(Verified, latent)*
- **Affected files:** `backend/src/modules/resumes/resume.repository.js:28` (`.populate('currentVersionId')`); every caller of `findByIdScoped` (resume detail, matching, coaching, ATS, candidate detail, interview/learning helpers).
- **Evidence:** with a corrected (async) copy of the plugin in a scratch file, `Resume.populate(doc, { path: 'currentVersionId' })` fails with `REFUSED find without orgId`, because populate runs an internal `find` on `ResumeVersion` whose filter has no `orgId`. `populate` with `match: { orgId }` and with `allowCrossTenant` both pass the hook.
- **User / business impact:** fixing TEN-01 alone would replace one outage with another on the most-used read path.
- **Technical impact:** `ResumeVersion` is both tenant-scoped and populated by id.
- **Recommended solution:** replace `populate` with an explicit second repository call (`findVersionByIdScoped(orgId, id)`) or `populate({ path, match: { orgId } })`; add a grep-style test that no `.populate()` targets a tenant-scoped model without `match`.
- **Dependencies:** TEN-01.
- **Acceptance criteria:** `GET /resumes/:id` returns the resume and its current version in a real-DB integration test; a lint-style test fails if a populate on a scoped model lacks a tenant `match`.

### P1: high priority

#### TEST-01 · P1 · No integration tests; the domain modules are essentially untested *(Verified)*
- **Affected files:** `backend/test/` (25 test files); all of `backend/src/modules/*`, `middleware/*`, `queue/*`.
- **Evidence:** of 151 backend source files, 40 are referenced directly by a test, 111 are only loaded transitively, 0 are real-database tested (Appendix G). `modules/aiJobs, analytics, audit, coaching, interview, jobs, learning, notifications` have **zero** direct tests; `identity` has one (`inviteEmail`); `middleware` has one of seven. The CI smoke test checks only `/health`, `/ready` and clean shutdown. Method and limits: `audit-evidence/06-test-coverage-map.js` counts files a test *references*, not lines covered (no coverage tool is installed).
- **User / business impact:** TEN-01, TEN-02 and API-01 all shipped for that reason.
- **Technical impact:** unit tests that mock Mongoose models cannot detect hook, populate, index or contract problems.
- **Recommended solution:** a real-MongoDB (and Redis) integration layer run in CI with service containers, a shared test app factory, and a first suite covering signup/login, tenant resolution, resume create/read, jobs, apply, matching trigger and AI-job polling, plus a tenant-isolation matrix.
- **Dependencies:** none; it unblocks everything.
- **Acceptance criteria:** CI runs an integration job against `mongo` and `redis` service containers; the suite includes at least one cross-tenant read attempt per endpoint group and asserts 404/403; the TEN-01 probe is a named regression test.

#### API-01 · P1 · UI and API disagree on the resume endpoints; nothing calls apply *(Verified)*
- **Affected files:** `frontend/src/features/resumes/api.js:10,12-14`; `backend/src/modules/resumes/resume.routes.js` (`POST /resumes`, `POST /resumes/upload`); `frontend/src/features/job-matching/*`.
- **Evidence:** matching 48 frontend calls to the real 47-endpoint table (Appendix D): the UI uploads a file with `POST /resumes` (multipart) but the backend expects JSON there and handles uploads at `POST /resumes/upload`; `createManual` posts to `/resumes/manual` (**no such route**); `update` (`PATCH /resumes/:id`) and `remove` (`DELETE /resumes/:id`) have **no backend route**; `POST /jobs/:jobId/apply` has no caller I could find.
- **User / business impact:** a user cannot create, edit or delete a resume from the UI, and a seeker cannot apply to a job.
- **Technical impact:** the contract is documented nowhere and tested nowhere.
- **Recommended solution:** treat the backend as the contract: fix the two client paths, add `PATCH`/`DELETE /resumes/:id` (with tenant-scoped ownership checks and cascading version cleanup, see DATA-02), add the apply call, and add a contract test that fails when a frontend call has no backend route.
- **Dependencies:** TEN-01, TEN-02, TEST-01.
- **Acceptance criteria:** an integration test performs upload (PDF and DOCX), manual create, update and delete through the same paths the UI uses; the contract script in Appendix D reports 0 unmatched calls.

#### PROD-01 · P1 · The AI Career Coach chat is not reachable *(Verified)*
- **Affected files:** `frontend/src/features/coaching/CoachingChatPage.jsx`, `frontend/src/app/router.jsx`, `frontend/src/features/dashboard/navConfig.js`.
- **Evidence:** the page is unreachable from `main.jsx` (import-graph check) and is neither routed nor linked; the backend coaching endpoints exist.
- **User / business impact:** the headline "AI career coach" feature cannot be used.
- **Technical impact:** the RAG/agent path is exercised by nothing in the UI.
- **Recommended solution:** add the route and nav entry; keep it behind the same guards as other seeker pages.
- **Dependencies:** TEN-01 (the page's API needs tenant reads).
- **Acceptance criteria:** a seeker can open the coach, send a message and see a grounded reply in an end-to-end test.

#### PROD-02 · P1 · The hiring pipeline cannot be operated *(Verified)*
- **Affected files:** `backend/src/modules/jobs/application.repository.js:updateStatus` (no caller), `job.routes.js`, `analytics.service.js`.
- **Evidence:** the route table has no endpoint that changes an application's status or lists a seeker's own applications. `updateStatus` exists in the repository but nothing calls it.
- **User / business impact:** recruiters cannot move candidates through stages; seekers cannot track applications; the hiring funnel, offer rate and time-to-hire analytics can only ever show "applied".
- **Technical impact:** `Application.status` is a state machine with no transition rules or history.
- **Recommended solution:** a small explicit transition table, a `PATCH /jobs/:jobId/applications/:id/status` endpoint with role checks, an append-only status history (also needed for honest time-to-hire), and `GET /applications/mine`.
- **Dependencies:** TEN-01, DATA-03 (history write with the status change).
- **Acceptance criteria:** integration test moves an application applied to hired, rejects an illegal transition, records history, and the funnel reflects it.

#### SEC-01 · P1 · Weak or default JWT secrets are accepted *(Code-read)*
- **Affected files:** `backend/src/config/env.js:8` (only presence is checked); `backend/.env.example` (`change-me-access`, `change-me-refresh`); `docker-compose.yml` (`dev-only-*` defaults).
- **Evidence:** `REQUIRED_VARS` checks that the variables exist, not their strength, whether the two differ, or the environment. Reproduced (`audit-evidence/09-verify-claims.js`): with `NODE_ENV=production` and both secrets set to the single character `a`, the configuration loads without complaint.
- **User / business impact:** a deployment that copies the example file lets anyone forge access tokens and impersonate any user or tenant.
- **Technical impact:** no guard exists at boot.
- **Recommended solution:** in production, require each secret to be at least 32 characters, distinct, and not a known placeholder; fail at startup with a clear message.
- **Dependencies:** none.
- **Acceptance criteria:** unit tests cover short, identical, placeholder and valid secrets; the app refuses to start in `NODE_ENV=production` with a placeholder.

#### SEC-02 · P1 · A stolen refresh token survives a password change; one global session *(Verified by code-read)*
- **Affected files:** `backend/src/modules/identity/identity.service.js:122` (`changePassword`), `user.model.js` (`refreshTokenHash` is a single field).
- **Evidence:** `changePassword` updates only `passwordHash`; `refreshTokenHash` is untouched, so the old refresh token keeps minting access tokens. There is one hash per user, so a login on a second device signs out the first, and there is no reuse detection or revoke-all.
- **User / business impact:** account takeover persists after the owner changes their password; poor multi-device experience.
- **Technical impact:** no session model.
- **Recommended solution:** invalidate the refresh hash on password change; move to a small `Session` collection (one record per device, rotated hash, family id, reuse detection that revokes the family); optional `tokenVersion` claim.
- **Dependencies:** TEN-01 not required (User is not tenant-scoped); TEST-01 for coverage.
- **Acceptance criteria:** tests show an old refresh token is rejected after a password change, reuse of a rotated token revokes the family, and two devices can be signed in at once.

#### SEC-03 · P1 · DOCX decompression bomb exhausts worker memory *(Verified)*
- **Affected files:** `backend/src/ai/services/resumeParser.service.js:24-28`; `backend/src/queue/processors/resumeParse.processor.js`.
- **Evidence:** a **150 KB** `.docx` whose `word/document.xml` expands to 150 MB was extracted by the app's exact code in 0.7 to 1.0 s across runs, growing process RSS by **322 to 360 MB** (Appendix F, `audit-evidence/08-docx-bomb.js`). The upload limit is 5 MB, and deflate ratios of 1000:1 mean a 5 MB file can claim about 5 GB (extrapolated, not run). The magic-byte check (`PK\x03\x04`) accepts any zip. Worker concurrency is 5.
- **User / business impact:** one malicious upload can crash the worker and stall resume parsing for everyone. (PDF parsing was not tested and is unassessed.)
- **Technical impact:** unbounded decompression and no per-job resource limit. The HTTP layer checks only the declared mimetype (`resume.routes.js` `fileFilter`); the magic-byte check runs in the worker after the file is already queued.
- **Recommended solution:** read the zip entry size from the central directory before inflating and reject above a cap (for example 5 MB of XML); stream with a byte limit; cap extracted text length; run parsing under a per-job timeout.
- **Dependencies:** none.
- **Acceptance criteria:** the 150 MB bomb is rejected in under 1 second with less than 50 MB of RSS growth; a normal DOCX still parses; a test asserts the size cap and the time limit.

#### DATA-01 · P1 · The whole uploaded file is stored in Redis and persisted in MongoDB *(Verified by code-read)*
- **Affected files:** `backend/src/modules/resumes/resume.service.js:55`; `backend/src/queue/queues.js:58-61`; `backend/src/modules/aiJobs/aiJob.model.js` (`payload: Mixed`, no TTL).
- **Evidence:** `enqueueAiJob` passes the same `payload` (including `fileBuffer`, base64, about 1.33x the file) to `aiJobRepository.create` **and** to the queue. BullMQ keeps failed jobs for 24 hours (`removeOnFail: { age: 86400 }`, `queues.js:33`). The `AiJob` document, with the file inside, has no expiry.
- **User / business impact:** every resume file (personal data) is duplicated into the database permanently and into Redis for hours, which is a retention and privacy problem and inflates storage and memory.
- **Technical impact:** Redis memory pressure (up to about 6.7 MB per queued upload); large documents in a hot collection.
- **Recommended solution:** store the file once in MongoDB (GridFS or a TTL-indexed collection, so no new service is added; object storage only if size or volume later justifies it) and pass only a reference through the queue and the `AiJob`; delete the original after parsing per a retention policy; never put raw payloads in `AiJob.payload`.
- **Dependencies:** roadmap decision 3 (retention periods), JOB-01. (DATA-02 builds on this finding, not the reverse.)
- **Acceptance criteria:** an upload produces an `AiJob` with no file bytes; the queue payload is small; the stored file is removed after the retention period in a test.

#### DATA-02 · P1 · No deletion, export or retention for personal data *(Verified)*
- **Affected files:** route table (no delete/export endpoints); `resumeVersion.model.js` (`rawText`), `aiJob.model.js`, `coachingSession.model.js`.
- **Evidence:** the only delete route is member removal. There is no account deletion, resume deletion (the UI calls one that does not exist, API-01), data export, or retention job. `rawText`, structured resume data, AI job payloads and results, and coaching transcripts persist indefinitely.
- **User / business impact:** the product handles personal and employment data without a way to honour deletion or access requests (India's DPDP Act, GDPR); a legal exposure for a hiring product.
- **Technical impact:** no cascade rules for the user, resume, version, application and job graph.
- **Recommended solution:** define a retention policy, add cascading `DELETE /users/me` and `DELETE /resumes/:id`, `GET /users/me/export`, TTL indexes on transient collections, and an audit entry for each.
- **Dependencies:** TEN-01, DATA-03, DATA-01. (Each deletion writes an entry through the existing `audit.service`; AUD-01 later widens audit coverage and builds on this finding, so the two are not circular.)
- **Acceptance criteria:** integration tests delete an account and show no remaining documents for that user across all collections; export returns the user's data; TTLs verified.

#### DATA-03 · P1 · Multi-write operations are not atomic *(Code-read)*
- **Affected files:** `identity.service.js:51` (signup: user, organization, membership, token), `job.service.js:95` (apply: create application then increment counter), `resume.service.js` (`createManualResume`: three writes), `queues.js:58` (AiJob then queue add).
- **Evidence:** none uses a transaction or a compensating step. A failure after the first write leaves an orphan.
- **User / business impact:** a user can exist with no organization or membership, so every later request fails ("no active membership"), with no way to recover; counters drift; jobs stay `queued` forever.
- **Technical impact:** a replica set (Atlas) supports transactions; local compose uses a standalone mongo.
- **Recommended solution:** wrap signup and apply in transactions (or ordered writes with cleanup); make AiJob creation and enqueue recoverable (an outbox or a sweeper that re-enqueues `queued` jobs older than N minutes); run the dev compose Mongo as a single-node replica set.
- **Dependencies:** TEST-01.
- **Acceptance criteria:** failure-injection tests show no orphan user after a failed membership create; a stuck `queued` AiJob is recovered.

#### JOB-01 · P1 · The job lifecycle is neither idempotent nor guarded *(Code-read)*
- **Affected files:** `backend/src/modules/aiJobs/aiJob.repository.js` (`markProcessing/markDone/markFailed`), `backend/src/queue/processors/*.processor.js`, `queues.js`.
- **Evidence:** (1) `markDone`/`markFailed` update by id with no check of the current status, so a late duplicate can overwrite a result. (2) `markFailed` runs on **every** failed attempt, before BullMQ retries, so a job flips `failed_needs_review` then back to `processing`, and a polling client reports failure for work that later succeeds. (3) On retry after a partial success, `resumeParse` creates a second `ResumeVersion`. (4) No job id or dedupe key, so a double submit or a stalled-job re-delivery repeats the LLM call and side effects (notifications). (5) `attempts` is incremented but never compared to the queue's limit.
- **User / business impact:** false failure messages, duplicate versions and notifications, wasted AI spend.
- **Technical impact:** no state machine, no idempotency keys.
- **Recommended solution:** one `runAiJob` wrapper for all processors; a compare-and-set state machine (`queued -> processing -> done | failed`), mark failed only on the final attempt, deterministic BullMQ `jobId` for dedupe, and idempotent writes (upsert by `aiJobId`).
- **Dependencies:** DATA-03, TEST-01.
- **Acceptance criteria:** tests for retry (one success, no failed flash), duplicate delivery (single side effect), and illegal transitions (rejected).

#### OPS-01 · P1 · A Redis outage hangs requests instead of degrading *(Verified)*
- **Affected files:** `backend/src/config/redisOptions.js` (`maxRetriesPerRequest: null`), `backend/src/ai/cache/aiCache.js:21`, `queue/queues.js` producers.
- **Evidence:** with the app's exact Redis options and no server, `cacheConnection.get()` was still pending after 5 seconds (Appendix E); with `maxRetriesPerRequest: null` and the offline queue enabled it never rejects. `withCache` has no guard, and queue `.add()` calls on the API process behave the same.
- **User / business impact:** when Redis is down, matching and every enqueue request hang until the client gives up, and Node accumulates pending commands.
- **Technical impact:** `/ready` correctly reports the outage, but in-flight requests are not bounded.
- **Recommended solution:** a separate cache connection with `commandTimeout`, `enableOfflineQueue: false` and a fail-open `withCache` (compute without cache on error); a bounded timeout and a clear 503 on enqueue failure; keep `maxRetriesPerRequest: null` only on BullMQ worker connections.
- **Dependencies:** none.
- **Acceptance criteria:** with Redis stopped, a cache-backed endpoint returns its result (computed uncached) in under 2 seconds beyond its normal time, and an enqueue returns 503 in under 2 seconds; covered by an integration test using an unreachable port.

#### AUTH-01 · P1 · No password reset and no email verification *(Verified)*
- **Affected files:** `identity.routes.js` (no such endpoints); `identity.service.js`.
- **Evidence:** the route table has neither; accounts are usable with any typed email. Email delivery now exists (mailer), so the blocker is gone.
- **User / business impact:** a user who forgets a password is locked out permanently; anyone can register with someone else's email and invite or be invited as them.
- **Technical impact:** no single-use token store.
- **Recommended solution:** single-use, hashed, expiring tokens for verification and reset (new collection with TTL); rate-limited endpoints; response that does not reveal whether an email exists (see AUTH-02).
- **Dependencies:** an email provider configured (the mailer exists). The new endpoints must themselves be enumeration-safe; AUTH-02 fixes the *existing* signup and login and is scheduled later, so it is not a prerequisite.
- **Acceptance criteria:** tests for the full reset and verify flows, token reuse and expiry rejected, no enumeration signal.

### P2: important engineering improvements

#### AUTH-02 · P2 · Account enumeration via signup and login timing *(Code-read)*
- **Affected files:** `identity.service.js:52-53` (409 "account already exists"), `login` (returns before the bcrypt compare when the user is missing).
- **Evidence:** signup states the email exists (`identity.service.js:53`). Login for an unknown email returns before any bcrypt work: measured at about 420 to 490 ms for a known email (bcrypt cost 12) versus 0.004 ms for an unknown one (`audit-evidence/09-verify-claims.js`). Only the bcrypt side was timed; the full HTTP path was not.
- **Impact:** an attacker can list registered emails; lower value than data exposure but relevant for a hiring product.
- **Solution:** generic responses plus a constant-time dummy compare; verification email for existing accounts.
- **Dependencies:** AUTH-01 (shares the enumeration-safe response design). **Acceptance:** identical response bodies and status codes, and latencies within 20% of each other over 50 requests, for known and unknown emails.

#### AUTH-03 · P2 · Refresh cookie scope and CSRF posture *(Code-read)*
- **Affected files:** `identity.controller.js` cookie options; `app.js`.
- **Evidence:** the cookie has no `path` restriction so it is sent to every API route; with `COOKIE_SAMESITE=none` (needed for cross-site deployments) the refresh and logout endpoints accept cross-site POSTs with no CSRF defense beyond CORS.
- **Impact:** a hostile page can force a refresh rotation or logout (annoyance, not data exposure, because CORS blocks reading responses).
- **Solution:** `path: '/api/v1/auth'`, require a custom header (`X-Requested-With`) on refresh and logout, and prefer same-site deployment.
- **Dependencies:** none. **Acceptance:** a cross-site POST without the header is rejected; same-site flows unchanged.

#### AUTH-04 · P2 · Default tenant is ambiguous, and tenant is resolved with a query per request *(Code-read)*
- **Affected files:** `middleware/tenant.middleware.js:21` (`memberships[0]`), `membership.repository.js:13` (populate of organization).
- **Evidence:** with no `X-Org-Id`, the first returned membership is used, with no defined order. Each authenticated request loads all memberships and populates the organization.
- **Impact:** a multi-org user can act in an unexpected organization; extra database load per request.
- **Solution:** define the default (last used or personal org), require the header when the user has more than one membership, and cache the membership set per access token for a short TTL.
- **Dependencies:** TEN-01. **Acceptance:** ambiguity test; query count per request measured.

#### RBAC-01 · P2 · Authorization gaps and a loose capability matcher *(Verified from the route table)*
- **Affected files:** `aiJob.routes.js`/`aiJob.controller.js`, `rbac.middleware.js:24`, route files.
- **Evidence:** the matcher's prefix rule is demonstrated (`audit-evidence/09-verify-claims.js`): a role holding only `candidate:view` is allowed `candidate:viewall` and `candidate:view:other`; no such capability is used by a route today, so this is latent. `GET /ai-jobs/:jobId` has no capability check and is scoped by organization but not by creator, so any member (including an interviewer) can read any job result in the org, including parsed resume data. 22 of the 39 tenant-scoped endpoints have no capability or role check (authenticated and tenant-scoped only; many are legitimately "own data" routes for seekers, but none declares that policy). `capabilityMatches` ends with `required.startsWith(granted)`, so `candidate:view` also matches `candidate:viewall` if such a capability is ever added.
- **Impact:** over-broad reads inside an organization; future privilege-escalation risk.
- **Solution:** scope AI jobs to creator or an admin capability; exact-match capability segments; a table-driven test that every route declares its policy.
- **Dependencies:** TEST-01. **Acceptance:** an interviewer cannot read another member's AI job; a test fails when a route lacks a declared policy.

#### AUD-01 · P2 · The audit log covers three actions *(Verified)*
- **Affected files:** `identity.service.js` (`org.settings_updated`, `member.invited`, `member.removed`).
- **Evidence:** no audit of sign-in, password change, job create/update, candidate status change, or a recruiter viewing a candidate's resume.
- **Impact:** a hiring product cannot answer "who looked at or changed this candidate".
- **Solution:** audit the sensitive actions above through one helper; add an index on `{ orgId, action, createdAt }`; a read endpoint for admins.
- **Dependencies:** PROD-02, DATA-02. **Acceptance:** each listed action writes an entry in an integration test.

#### JOB-02 · P2 · No dead-letter handling, replay, priorities, scheduling or worker health *(Code-read)*
- **Affected files:** `queue/queues.js`, `queue/workers/*`, `worker.js`.
- **Evidence:** failed jobs expire from BullMQ after 24 hours and the `AiJob` is marked `failed_needs_review`, but nothing lists or retries those; every queue has equal priority; analytics refresh is computed on demand, not scheduled; the worker has no health or metrics surface (no HTTP port), so `queue_jobs` is only visible through the API process.
- **Impact:** failures are silent, and a stuck worker is only noticed through a growing backlog.
- **Solution:** an admin list/retry endpoint for failed jobs, job priorities for user-initiated work, a scheduled analytics refresh, and a small worker health/metrics listener.
- **Dependencies:** JOB-01. **Acceptance:** a failed job can be listed and retried; worker metrics scrape works.

#### JOB-03 · P2 · Unbounded work inside processors *(Code-read)*
- **Affected files:** `queue/processors/jobMatching.processor.js`, `application.repository.js:42` (`listAllByOrg`), `analytics.service.js:30`.
- **Evidence:** the matching processor starts one resume lookup per application with `Promise.all` (unbounded concurrency) and re-embeds every resume on every run; analytics loads every application of the organization into memory and filters it five times.
- **Impact:** memory and connection pressure at a few thousand applicants.
- **Solution:** bounded concurrency; aggregation in MongoDB (`$match { orgId }` first, `$group`); persisted embeddings (RAG-01).
- **Dependencies:** TEN-01 (RAG-01 for the embedding part). **Acceptance:** a seeded benchmark (for example 5,000 applications) records peak RSS and wall time before and after; analytics issues one aggregation instead of loading every row; matching runs with at most a fixed number of concurrent database calls.

#### API-02 · P2 · Unbounded list endpoints *(Code-read)*
- **Affected files:** `matching.service.js:107` (`listCandidates`: all match results, then one user lookup each), `coaching.repository.js:22` (`.select('createdAt messages')` to count messages), `membership.repository.js:24`.
- **Impact:** response size and latency grow with data; transcripts are loaded only to count them.
- **Solution:** cursor pagination for candidates, a stored `messageCount`, batched user lookups (`$in`).
- **Dependencies:** TEN-01. **Acceptance:** list endpoints respect a limit; query counts do not grow with page size.

#### AI-01 · P2 · No context or token budget *(Code-read)*
- **Affected files:** `coaching.service.js` (passes the whole transcript as `history`), `careerCoach.v2.js`.
- **Evidence:** every prior message is sent on every turn; the transcript is a single growing array.
- **Impact:** cost and latency grow with conversation length; eventually a context-window or 16 MB document-size failure.
- **Solution:** token-aware history window plus a rolling summary; a per-agent budget; cap messages per session.
- **Dependencies:** AI-02. (AGT-01 builds on this finding, not the reverse.) **Acceptance:** a long-conversation test stays under the budget and keeps answering.

#### AI-02 · P2 · AI results are not traceable to a prompt version or model *(Verified)*
- **Affected files:** `aiJob.model.js`, `ai/prompts/resumeParser.v2.js:16`, `docs/ARCHITECTURE.md`.
- **Evidence:** the `resumeParser.v2` header says the version "travels with every AiJob record", but `AiJob` has no `promptVersion`, `provider`, `model` or token fields; they are only logged.
- **Impact:** cannot answer "which prompt/model produced this candidate summary", and cannot attribute cost to a tenant.
- **Solution:** persist a small `ai` block (`promptVersion`, `provider`, `model`, tokens, cost) with each AI-produced record.
- **Dependencies:** TEN-01. **Acceptance:** results carry provenance; a test asserts it.

#### AI-03 · P2 · No per-tenant AI usage attribution or quotas *(Code-read)*
- **Affected files:** `aiClient.js`, `rateLimit.middleware.js`.
- **Evidence:** cost is tracked per provider (metrics), not per organization; limits are per user per minute.
- **Impact:** one organization can drive unbounded spend; no basis for pricing or plan limits.
- **Solution:** attribute tokens to `orgId` (AI-02), monthly budgets and a soft/hard limit per org.
- **Dependencies:** AI-02. **Acceptance:** an org over budget gets a clear error; usage is queryable.

#### AI-04 · P2 · Injection defense covers resume parsing only, and is unmeasured on a real model *(Code-read)*
- **Affected files:** `ai/security/*` (used only by `resumeParser.service.js`); coaching messages, job descriptions, interview transcripts and review/summary prompts.
- **Evidence:** other untrusted inputs reach prompts inside tagged blocks (v2 prompts) but are not scanned; the post-hardening real-model re-run never completed.
- **Impact:** residual prompt-steering through other inputs; prose-only attacks the scanner cannot match (documented).
- **Solution:** apply the scanner to every candidate-authored input; complete the real-model measurement (Groq or a stable local model) and record numbers in ADR 0004.
- **Dependencies:** none. **Acceptance:** measured attack success rate recorded for the production model; gate added.

#### AI-05 · P2 · Matching score is raw similarity, and embedding quality is unproven *(Code-read; numbers PARTIALLY CONFIRMED)*
- **Affected files:** `jobMatcher.service.js`.
- **Evidence:** the score is `Math.round(cosine x 100)` and skill overlap is computed but not weighted into it (code, verified). The claim that unrelated candidates score about 44 comes from a single interactive run on a local embedding model during this engagement (an unrelated resume scored 44 against 86 for a matching one); the raw scores were not saved and **the figure cannot be reproduced from committed artifacts**. The local comparison of nomic embeddings with TF-IDF ran on 11 of 14 jobs (3 failed when the local server dropped; recorded in a git-ignored results file) and is not reliable.
- **Impact:** scores read as "partly qualified" for people who are not; ranking quality over simple baselines is unproven.
- **Solution:** calibrate/rescale, blend with required-skill coverage, evaluate against baselines on the full dataset before changing.
- **Dependencies:** AI-06, RAG-01. **Acceptance:** first, an evaluation run that prints raw per-candidate scores is added and committed so the compression claim is reproducible; then the new scorer beats TF-IDF on NDCG@10 over all 14 jobs including the decoys.

#### AI-06 · P2 · No canonical skill taxonomy in the product *(Verified)*
- **Affected files:** `skillGapAnalyzer.service.js` (5-role static map matched by substring), `ai/skills/taxonomy.js` (50 skills, used by grounding and evaluation only).
- **Evidence:** unknown roles fall back to four generic skills; "strengths" is the raw resume list; comparison is exact after punctuation stripping, so "JS" does not match "JavaScript".
- **Impact:** skill-gap and learning recommendations are shallow and often wrong.
- **Solution:** promote the taxonomy (aliases, categories, related roles), normalize skills at parse time, and drive role requirements from data.
- **Dependencies:** none. **Acceptance:** alias-insensitive gap results; a golden-dataset test.

#### RAG-01 · P2 · Retrieval is ephemeral and used once; no candidate search *(Verified)*
- **Affected files:** `ai/rag/*`, `careerCoachAgent.js`, `jobMatcher.service.js`.
- **Evidence:** embeddings are recomputed in memory on every request (so cost is linear in pool size by construction; an earlier single local timing of about 190 ms for a small chunk set was not recorded and is not relied on); only the coach uses retrieval; no vectors, documents or chunk metadata are persisted; no source attribution is returned; no retrieval evaluation exists; recruiters cannot search candidates.
- **Impact:** cost and latency grow with pool size; talent search, the core recruiter value, is impossible.
- **Solution:** see the Phase 3 plan (persist chunks and vectors with model name, tenant-aware, one vector store chosen by ADR).
- **Dependencies:** TEN-01, AI-06. **Acceptance:** persisted index, tenant-filtered search, attribution and a retrieval evaluation (recall@k) in CI.

#### AGT-01 · P2 · The agent layer lacks budgets, traces and evaluation *(Code-read)*
- **Affected files:** `ai/agents/*`.
- **Evidence:** 4 agents share one orchestrator (3-round cap, tool closures bound to the tenant: good). There is no token budget, no execution trace, no per-agent timeout beyond the provider's, no evaluation of tool-choice or task success, and "Resume Intelligence", "Job Matching" and "Recruiter Intelligence" exist as services, not agents.
- **Impact:** cannot debug or measure agent behavior.
- **Solution:** structured input/output per agent, a trace record per run, budgets, and a small scenario evaluation. Do not add agents without evidence they help.
- **Dependencies:** AI-02, AI-01. **Acceptance:** each agent run emits a trace; scenario tests pass.

#### PERF-01 · P2 · Seeker job feed recomputes the resume embedding per job; analytics can stampede *(Code-read)*
- **Affected files:** `matching.service.js` (`listSeekerMatches`, `scoreJobForResume`), `analytics.service.js` (`getOrComputeStats`).
- **Evidence:** each of up to 20 jobs per page calls `matchResumeToJob`, which embeds the same resume again (cached for an hour per pair); concurrent requests on a stale analytics cache all recompute with no lock.
- **Impact:** needless embedding cost; duplicate heavy work under load.
- **Solution:** embed the resume once per request (later persisted); a single-flight lock for stats.
- **Dependencies:** RAG-01. **Acceptance:** one embedding call per feed request; one recompute under concurrent load.

#### SEC-04 · P2 · The web container sends no security headers *(Verified)*
- **Affected files:** `frontend/nginx.conf`.
- **Evidence:** no `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or framing control (the file has only caching headers). The API side is covered by helmet; the HTML that runs the app is not.
- **Impact:** weaker XSS and clickjacking posture for the page that holds the in-memory access token.
- **Solution:** add the headers (with `always`, and repeated in each location because nginx does not inherit `add_header` into blocks that define their own); a CSP tuned to the app.
- **Dependencies:** none. **Acceptance:** `check:deployment` verifies the web headers.

#### SEC-05 · P2 · Rate limiting is per process *(Code-read)*
- **Affected files:** `middleware/rateLimit.middleware.js`.
- **Evidence:** the default in-memory store; N instances give each client N times the limit.
- **Impact:** the login brute-force defense weakens as the API scales.
- **Solution:** a Redis-backed store (once OPS-01 makes Redis failure safe: fail open with logging).
- **Dependencies:** OPS-01. **Acceptance:** two API instances share one counter in a test.

#### FE-01 · P2 · Thin frontend tests *(Verified)*
- **Affected files:** `frontend/src` (5 test files, 31 tests: three components, one hook, one page).
- **Evidence:** no tests for API clients, TanStack Query hooks, guards, the refresh interceptor, resume upload or any workflow; no accessibility tests (lint rules only); no end-to-end tests.
- **Impact:** UI regressions and the contract breaks in API-01 are not caught.
- **Solution:** hook and guard tests with a mocked network layer, a small Playwright suite over the critical journeys in CI.
- **Dependencies:** API-01. **Acceptance:** critical journeys covered end to end in CI.

#### FE-02 · P2 · AI-job polling never gives up and treats a transient failure as final *(Code-read)*
- **Affected files:** `frontend/src/shared/hooks/useAiJobPolling.js:15`.
- **Evidence:** polls every 1.5 s indefinitely; if the worker is down the status stays `queued` forever; a `failed_needs_review` seen between retries is shown as a failure (see JOB-01).
- **Impact:** wasted requests, misleading errors.
- **Solution:** backoff, a maximum duration with a clear "still working" state, and rely on the corrected server states.
- **Dependencies:** JOB-01. **Acceptance:** hook tests for timeout and for retry-then-success.

#### OBS-01 · P2 · No tracing or error monitoring; workers are invisible *(Verified)*
- **Affected files:** `lib/metrics.js`, `worker.js`.
- **Evidence:** metrics cover HTTP, AI and queue depth only; no database or Redis timings, no distributed trace linking request to queue job to AI call, no exception tracker; the worker exposes nothing.
- **Impact:** slow requests and job failures are hard to attribute.
- **Solution:** propagate the request id into job data and logs, add DB/Redis timing metrics, a worker metrics/health listener, and optional error monitoring behind an environment flag.
- **Dependencies:** JOB-02. **Acceptance:** a request id is searchable across API and worker logs; worker metrics scraped.

#### DOC-01 · P2 · Documentation claims exceed the implementation *(Verified)*
- **Affected files:** `docs/ARCHITECTURE.md:258` (states the service layer owns "transaction boundaries (Mongo sessions for multi-document writes)"; the code uses no transaction or session), `docs/ARCHITECTURE.md:632` (states every job handler is idempotent and "checks `aiJobs.status` before doing work"; none does), `docs/ARCHITECTURE.md:496` (describes storing embeddings in Atlas Vector Search; nothing is persisted, so this is design intent presented without that label), `ai/prompts/resumeParser.v2.js:16` (claims the prompt version is stored on every `AiJob`; it is not), `docs/GAP_ANALYSIS.md` (Phase 0 marked done while TEN-01 is open). *(The first draft over-stated this as "transactions mentioned three times"; one of the three mentions concerns microservices, not a claim about this system. Corrected 2026-11-25.)*
- **Impact:** readers (and interviewers) trust claims the code does not honour.
- **Solution:** reconcile each claim with the code, mark aspirational sections as design intent, and keep this audit as the source of truth for status.
- **Dependencies:** completion of each phase. **Acceptance:** a docs-versus-code checklist passes in review.

#### PROD-03 · P2 · Product workflows are incomplete *(Verified)*
- **Evidence:** missing: candidate profiles (user model is email and name only), candidate search, recruiter notes and collaboration, interview scorecards, career-roadmap persistence, learning progress, and recruiter-facing analytics beyond a funnel that cannot populate (PROD-02).
- **Impact:** the recruiter journey stops after viewing a ranked list.
- **Solution:** Phase 5 milestones, each as a coherent journey with tests.
- **Dependencies:** TEN-01, API-01, PROD-02, AI-06, RAG-01.

*(Additional P2 items are listed under **Investigation targets** and **Technical debt** where they overlap.)*

### P3: optimization and future enhancement

#### SEC-06 · P3 · JWT and password details *(Code-read)*
`jwt.verify` does not pin `algorithms: ['HS256']`; the password policy is length 8 only with no maximum (bcrypt silently truncates at 72 bytes); access tokens carry the email. **Solution:** pin the algorithm, add a 72-byte maximum and a breached-password check later. **Acceptance:** unit tests.

#### API-03 · P3 · Path parameters are not validated *(Verified)*
Ids in the URL (`:jobId`, `:resumeId`, `:sessionId`) are not validated; an invalid id becomes a generic Mongoose `CastError` mapped to 400. **Solution:** a shared `objectId` zod param schema. **Acceptance:** malformed ids return a clear 400 for every route.

#### DEBT-01 · P3 · Duplicated code *(Verified)*
The resume ownership check `String(resume.userId) !== String(userId)` is repeated 7 times; the AiJob lifecycle (`markProcessing`, try/catch, `markFailed`, rethrow) is copied across 5 processors. **Solution:** `getOwnedResume` helper; the `runAiJob` wrapper of JOB-01.

#### DEBT-02 · P3 · Small dead and warning-level code *(Verified)*
`frontend/src/shared/components/Modal.jsx` is used only by its test; one React Compiler lint warning in `SignupPage.jsx` (react-hook-form `watch`). **Solution:** remove or use; switch to `useWatch`.

#### DEP-01 · P3 · Dependency drift *(Verified)*
15 open Dependabot pull requests on 2026-11-25 (2 earlier ones, nginx and `actions/checkout`, were merged and passed CI; a new one, `docker/metadata-action` 6, opened), most major (bullmq 6, ioredis 6, vitest 5, jsdom 31, framer-motion 14, dotenv 18); two Node 25 base-image bumps would move production off LTS. Caret ranges let Mongoose float across minor versions. **Solution:** merge the safe ones, hold queue-related majors until integration tests exist, stay on an LTS Node.

#### OPS-02 · P3 · Deployment artifacts are unexercised *(Verified)*
`render.yaml` was never validated against Render; `docker-compose.yml` falls back to development JWT secrets if none are set; the release workflow has never run. **Solution:** validate the blueprint, remove the secret defaults for any non-local profile, run one release.

#### PERF-02 · P3 · Frontend bundle *(Verified)*
Main chunk 400 KB (about 129 KB gzip); the analytics page 378 KB because of the charting library (lazy, so only paid by recruiters); a 116 KB shared schemas chunk. Acceptable now; revisit with a bundle budget in CI.

---

## 7. Re-verification of the named investigation targets

| Target | Verdict | Findings |
| --- | --- | --- |
| AI job status transitions and missing organization context | **Partly resolved.** `orgId` is threaded through every call (the old gap is closed). Transitions are unguarded, flap during retries and are not idempotent. | JOB-01 |
| Tenant-scoped database operations | **Not working.** The plugin throws on every query; populate would be refused after the fix. | TEN-01, TEN-02 |
| Aggregate and bulk operations | **No `aggregate()` or `insertMany`.** Two `bulkWrite` sites, both scoped (one fixed earlier). Two `populate` sites. | TEN-02, TEN-01 note |
| Missing API integration tests against real MongoDB | **Confirmed**: zero. | TEST-01 |
| Persistent vs in-memory RAG | **Confirmed in-memory**, one consumer. | RAG-01 |
| Embedding quality and vector search | **Unproven**; no vector search; comparison incomplete. | AI-05, RAG-01 |
| Candidate search and recruitment workflows | **Confirmed missing** (no search; pipeline cannot advance). | PROD-02, PROD-03 |
| Queue idempotency and recovery | **Confirmed weak.** | JOB-01, JOB-02, DATA-03 |
| Analytics query efficiency | **Confirmed**: loads all applications into memory; recompute stampede. | JOB-03, PERF-01 |

---

## 8. Top 20 prioritized issues

| # | ID | Sev | One line | Why now | Cx |
| --- | --- | --- | --- | --- | --- |
| 1 | TEST-01 | P1 | Real-MongoDB integration harness in CI | Nothing else can be proven without it | M |
| 2 | TEN-01 | P0 | Fix the tenant plugin hooks | Every tenant query fails | S |
| 3 | TEN-02 | P0 | Scope the `populate` | Next outage once TEN-01 is fixed | S |
| 4 | API-01 | P1 | Align resume endpoints; add edit/delete; wire apply | Primary journey is broken | M |
| 5 | SEC-01 | P1 | Reject weak secrets in production | Forgeable tokens if misdeployed | S |
| 6 | DATA-01 | P1 | Stop storing files in Redis and `AiJob` | Privacy, storage, memory | M |
| 7 | JOB-01 | P1 | Idempotent, guarded job lifecycle | Duplicates, false failures | L |
| 8 | DATA-03 | P1 | Atomic signup/apply; recoverable enqueue | Orphans lock users out | M |
| 9 | OPS-01 | P1 | Fail-open cache, bounded enqueue | Redis outage hangs the API | S |
| 10 | SEC-03 | P1 | Cap decompression and parse time | One upload can crash the worker | S |
| 11 | SEC-02 | P1 | Revoke sessions on password change; session model | Account takeover persists | M |
| 12 | PROD-02 | P1 | Pipeline status transitions and history | Recruiters cannot hire | M |
| 13 | DATA-02 | P1 | Deletion, export, retention | Legal exposure | L |
| 14 | AUTH-01 | P1 | Password reset and email verification | Locked-out users | M |
| 15 | PROD-01 | P1 | Route the coach chat | Headline feature unreachable | S |
| 16 | RBAC-01 | P2 | Scope AI jobs; declared policy per route | Over-broad reads | M |
| 17 | AI-02 | P2 | Persist prompt, model, tokens, cost with results | Traceability and cost basis | M |
| 18 | AI-01 | P2 | Context and token budgets | Cost and failure at scale | M |
| 19 | RAG-01 | P2 | Persistent, tenant-aware retrieval and search | Core recruiter value | XL |
| 20 | OBS-01 | P2 | Tracing, worker metrics, error monitoring | Diagnosability | M |

---

## 9. Recommended implementation sequence, dependencies and complexity

```
Phase 1  Backend correctness        TEST-01 ─► TEN-01 ─► TEN-02 ─► API-01 ─► DATA-03 ─► JOB-01
                                    (+ pulled forward: SEC-01, SEC-03, OPS-01, SEC-02, DATA-01)   [XL]
Phase 2  AI infrastructure (delta)  AI-02 ─► AI-01 ─► AI-03 ; model routing                       [L]
Phase 3  Persistent RAG             AI-06 ─► RAG-01 (vector store ADR) ─► AI-05                    [XL]
Phase 4  Agents                     AGT-01 (traces, budgets, evaluation)                          [L]
Phase 5  Product completeness       PROD-01/02/03, AUTH-01, DATA-02                               [XL]
Phase 6  Distributed systems        JOB-02, JOB-03, SEC-05                                        [L]
Phase 7  Security review            AUTH-02/03, RBAC-01, AUD-01, SEC-04, threat model            [L]
Phase 8  Performance/observability  OBS-01, PERF-01, benchmarks, SLOs                             [L]
Phase 9  Testing                    FE-01, contract and E2E, load and security tests              [L]
Phase 10 Production readiness       OPS-02, DOC-01, runbooks, DR drill                            [M]
```

Two deliberate deviations from the order in the brief, with reasons:
1. **Integration testing starts in Phase 1, not Phase 9.** TEN-01 shipped *because* there was no real-database test; it cannot be proven fixed without one.
2. **Four security and resilience items (SEC-01, SEC-02, SEC-03, OPS-01) and the file-retention fix (DATA-01) move into Phase 1** because they are small, mostly independent, and P1; waiting for Phase 7 leaves known exploits open while features are added.

*Phase complexity is the effort of the whole phase (the sum of its milestones), not of its hardest milestone; Phase 1 is XL because its seven milestones add up to several weeks.*

**Gate rule:** per the brief, no phase after Phase 1 starts while a P0 is open; Phase 1 exits only when TEN-01 and TEN-02 are verified by CI against real MongoDB.

## 10. What should NOT be implemented

Not justified by evidence, or contrary to the stated constraints:

- **Microservices, an extracted AI service, Kafka, or a service mesh.** The bottleneck is correctness, not scale (ADR 0001).
- **GraphQL, WebSockets, or server-sent events.** REST plus polling is adequate until a measured need exists; the existing polling just needs backoff (FE-02).
- **Redux, TypeScript, or a state-management rewrite.** TanStack Query already owns server state.
- **A second vector store, or any in addition to the chosen one.** One, selected by ADR in Phase 3.
- **LangChain, LangGraph or a supervisor "agent of agents".** The 3-round orchestrator is adequate; add structure only where evaluation shows value.
- **Self-hosted LLM serving (vLLM, TensorRT-LLM), fine-tuning, computer vision, OCR, or text-to-image** inside this repository. They are separate projects with separate infrastructure.
- **Claims of 100M-user notification, 500K req/s, or 99.99% availability.** Nothing here supports them; SLOs will be set from measurement (Phase 8).
- **Kubernetes manifests, Helm, multi-region, or per-tenant databases.** Premature for one deployable.
- **A billing/payments system.** A pricing page exists; billing is out of scope.
- **Rewriting the repository/service pattern, replacing BullMQ, or replacing Mongoose.** The pattern is sound; the defects are in specific places.
- **Mass dependency upgrades.** Merge only what the new tests can verify; hold queue and Redis majors.

## 11. Limits of this audit

- **No database or Redis was available.** TEN-01's failure is independent of I/O (it fails inside the hook), but no HTTP request has been run end to end; claims about downstream behavior (login failing at membership resolution, resume reads failing) follow from the code path and should be confirmed by the first integration test.
- **No browser run.** Frontend findings come from code, the import graph and a static comparison with the route table; the contract comparison could miss dynamically built URLs (it found 48 literal calls).
- **No load test, no profiling, no circular-dependency analysis, no real-model run.** Performance statements are structural, not measured, except the three probes cited.
- **Counts of "unprotected endpoints" use the real middleware chain** but cannot judge whether a missing capability is intentional.
- The injection-defense and matching-quality conclusions depend on synthetic data (see `docs/adr/0007`).

---

## Appendix A: Reproducing the evidence

All commands run from `backend/`. Probe scripts were kept in a scratch directory; the essentials are inline.

**A1. TEN-01: the plugin on a scoped query** (expect `next is not a function`):

```bash
node -e "
const mongoose = require('mongoose'); mongoose.set('bufferCommands', false);
const plugin = require('./src/plugins/tenantScope.plugin');
const s = new mongoose.Schema({ orgId: mongoose.Schema.Types.ObjectId }); s.plugin(plugin);
const M = mongoose.model('Probe', s);
M.find({ orgId: new mongoose.Types.ObjectId() }).then(() => console.log('ok'), (e) => console.log(e.message));"
```

Version check (isolated install, repository untouched): the same script against `mongoose@9.7.2` and `mongoose@9.12.3` both print `next is not a function` for scoped and unscoped queries.

**A2. TEN-02: populate under a corrected hook.** With the hook rewritten as `async function () { ... throw new Error('REFUSED ...') }`, `Resume.populate(doc, { path: 'currentVersionId' })` rejects with `REFUSED find without orgId`; adding `match: { orgId }` or `options: { allowCrossTenant: true }` reaches the driver.

## Appendix B: Route table (47 endpoints, extracted at runtime)

Extracted by loading every `*.routes.js` with the middleware factories instrumented. Summary: 47 endpoints; 3 unauthenticated (`/auth/signup`, `/auth/login`, `/auth/refresh`); 5 authenticated but not tenant-scoped (`logout`, `me`, profile, password, my-memberships); 39 authenticated and tenant-scoped; 9 carry the `aiHeavy` rate limit and 3 the `auth` limit; **22 of the 39 tenant-scoped endpoints have no capability or role check**, among them `GET /ai-jobs/:jobId`, `GET /resumes/:id`, `POST /jobs/:jobId/apply`, all coaching, interview and learning routes.

## Appendix C: Authentication facts verified

bcrypt cost 12; refresh tokens hashed with SHA-256 and rotated on use; access token 15 minutes in memory only; refresh cookie `httpOnly`, `Secure` in production, `SameSite` configurable; helmet on; CORS limited to one origin; `trust proxy` configurable.

## Appendix D: UI to API contract check

48 literal `axiosClient` calls compared with the 47 backend routes: **3 without a route** (`POST /resumes/manual`, `PATCH /resumes/:id`, `DELETE /resumes/:id`); the upload call targets `POST /resumes` instead of `POST /resumes/upload`; **2 backend endpoints with no caller** (`POST /resumes/upload`, `POST /jobs/:jobId/apply`).

## Appendix E: Redis outage

The app's exact connection options (`maxRetriesPerRequest: null`) with nothing listening: a `get` was still pending after 5,000 ms.

## Appendix F: DOCX decompression

A 150 KB archive containing one 150 MB entry, processed with the app's own `JSZip.loadAsync` plus `async('string')`: 0.66 to 1.0 s and RSS +322 to +360 MB across runs (`audit-evidence/08-docx-bomb.js`).

## Appendix G: Test coverage by area (backend)

| Area | Files | Directly tested | Only imported |
| --- | --- | --- | --- |
| `ai/` | 49 | 20 | 29 |
| `middleware/` | 7 | 1 | 6 |
| `modules/identity` | 11 | 1 | 10 |
| `modules/resumes` | 7 | 2 | 5 |
| `modules/matching` | 5 | 2 | 3 |
| `modules/{aiJobs, analytics, audit, coaching, interview, jobs, learning, notifications}` | 38 | **0** | 38 |
| `queue/` | 13 | 1 | 12 |
| `plugins/` | 1 | 0 | 1 |
| **Total** | **151** | **40** | **111** |

"Only imported" means the file loads when a test runs but nothing asserts its behavior.
