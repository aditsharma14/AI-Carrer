# Risk Register

Risks to the product, its users and the transformation programme, scored from the evidence in [`STAFF_ENGINEERING_AUDIT.md`](STAFF_ENGINEERING_AUDIT.md). A risk is something that **may** happen; a defect that has already happened is a finding, and is linked here as its source.

## Scoring

- **Likelihood (L)** 1 rare, 2 unlikely, 3 possible, 4 likely, 5 occurring or certain.
- **Impact (I)** 1 negligible, 2 minor, 3 moderate, 4 major, 5 severe (data exposure, legal, product unusable).
- **Score** = L x I. **Critical** 20-25, **High** 12-19, **Medium** 6-11, **Low** 1-5.
- Scores reflect **current state including existing mitigations**, not the best case.
- **Status:** Open, Mitigating (work scheduled in the roadmap), Accepted (a deliberate decision), Closed.

- **Owner:** the single maintainer owns every risk (there is no team). Where a risk's mitigation is a roadmap milestone, that milestone is its owner of record.
- **A risk is never Closed because a pull request merged.** It closes only when its closure evidence (below) exists and is linked.
- **Nature:** *defect-consequence* (R-01, R-02, R-03, R-04, R-05, R-07, R-08, R-22), *residual* (what remains after a fix), *accepted*, or *programme* (R-16, R-17, R-19).

## Heat map (current)

| | I=1 | I=2 | I=3 | I=4 | I=5 |
| --- | --- | --- | --- | --- | --- |
| **L=5** | | | | | **R-01** |
| **L=4** | | | R-07, R-16, R-17 | **R-28** | R-06 |
| **L=3** | | R-09, R-18 | R-08, R-12, R-13, R-20, R-21, R-23, R-24 | R-04, R-05, R-10, R-15, R-19, R-22 | R-02, R-03, R-11 |
| **L=2** | | | R-25, R-26, R-27 | | R-14 |

## Closure plan for Critical and High-15+ risks

| Risk | Linked finding | Mitigation milestone | Verification requirement | Closure evidence (required) | Residual risk after closure | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 (25) | TEN-01, TEN-02 | M1.0, M1.1 | `integration` job against real MongoDB: tenant journeys and the populate-scoping test | CI run on `main`, linked in the progress file | Another dependency change reintroduces it: covered by R-19 and the pinned Mongoose | Open; not closed by merge alone |
| R-06 (20) | DATA-01, DATA-02 | M1.6, M5.7 | Test that no file bytes remain in `AiJob` or the queue; deletion and export tests across every collection holding personal data | Test output in CI; a recorded deletion drill | Data held by AI providers and in database backups outlives deletion: documented, with provider terms and backup expiry | Open |
| R-02 (15) | TEN-01, TEST-01 | M1.1 | Isolation matrix (tenant B cannot read or change tenant A, per endpoint group) plus the guard tests for bulk and populate | CI run on `main` | New code bypassing the plugin; a review rule and the matrix as a gate | Mitigating |
| R-03 (15) | SEC-01 | M1.3 | Test that a production boot rejects weak, identical or placeholder secrets | Unit test output; script 09 reports REJECTED | Operators can still choose a guessable strong-looking secret | Mitigating |
| R-11 (15) | AI-05, PROD-03 | M3.x, M4.x, a fairness evaluation before any use on real candidates | Fairness evaluation on proxy attributes; documented human-review step | Evaluation report; wording check that the product is not described as automated decision-making | Real-world bias not visible in synthetic data (R-21); legal review not done | Open |

## Register

### Correctness and security

| ID | Risk | L | I | Score | Early warning | Mitigation (planned) | Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **R-01** | The core data path does not work in any real deployment: every tenant-scoped query throws, so signup works but nothing after it does | 5 | 5 | **25 Critical** | First integration test, or first real sign-in, returns 500 on tenant resolution | Phase 1 M1.0 + M1.1: real-database harness, fixed plugin, populate scoped, journeys passing in CI | TEN-01, TEN-02 | **Open (confirmed)** |
| R-02 | Once queries work, a forgotten `orgId` (especially in new bulk, aggregate or populate code) leaks another tenant's data | 3 | 5 | **15 High** | A tenant-isolation test fails; an unscoped query in review | Isolation matrix in CI; rule that bulk/aggregate/populate carry the tenant by hand; plugin guards verified | TEN-01, TEST-01 | Mitigating |
| R-03 | A deployment copies the example environment and runs with a known JWT secret, letting anyone forge tokens | 3 | 5 | **15 High** | Boot succeeds with `change-me-*` values | Reject weak, identical or placeholder secrets in production at startup | SEC-01 | Mitigating |
| R-04 | One crafted upload (a DOCX decompression bomb, or a pathological PDF) exhausts a worker's memory and stalls parsing for everyone | 3 | 4 | **12 High** | Worker restarts; RSS spikes during parse jobs | Entry-size cap before inflating, text cap, per-job timeout | SEC-03 | Mitigating |
| R-10 | Prompt injection steers a summary or ranking: the scanner is English-only, prose-only attacks are not stopped by grounding, other inputs are unscanned, and the defense is unmeasured on a real model | 3 | 4 | **12 High** | A knownGap payload succeeds on the production model | Scan every candidate-authored input; measure on the production model; record in ADR 0004; keep recruiters seeing the original on flagged resumes | AI-04 | Mitigating |
| R-22 | Recruiters view candidate data with no audit trail; any org member can read AI results | 3 | 4 | **12 High** | A candidate or regulator asks who viewed their data | Audit sensitive actions; scope AI jobs to creator or admin | AUD-01, RBAC-01 | Open |
| R-11 | Scoring is biased or unexplainable in a regulated domain (hiring is high-risk under the EU AI Act and subject to bias-audit rules such as NYC Local Law 144) | 3 | 5 | **15 High** | A complaint, an audit request, or score gaps across groups on review | Explainable matching with evidence; a fairness evaluation on proxy attributes; documented human review; do not market as automated decision-making | AI-05, PROD-03 | Open |
| R-19 | A dependency change silently alters behavior the code relies on (Mongoose hook semantics already did) | 3 | 4 | **12 High** | Integration suite fails after an update | Integration tests gate every dependency PR; pin critical packages exactly; hold risky majors | TEST-01, DEP-01 | Mitigating |

### Data and compliance

| ID | Risk | L | I | Score | Early warning | Mitigation | Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-06 | Personal data cannot be deleted or exported, and uploaded files persist in Redis and MongoDB indefinitely, breaching DPDP/GDPR expectations | 4 | 5 | **20 Critical** | A deletion or access request arrives | Retention policy, cascading deletion, export, file stored once with expiry | DATA-01, DATA-02 | Open |
| R-08 | A failed signup leaves a user with no organization, locked out with no recovery path | 3 | 3 | 9 Medium | Support reports "no active organization membership" | Transactions or compensation; recovery sweep | DATA-03 | Open |
| R-14 | A database loss with no restore ever rehearsed | 2 | 5 | 10 Medium | Backups missing or untested | Enable managed backups; run a restore drill into a scratch cluster | OPS-02 | Mitigating |

### Reliability and cost

| ID | Risk | L | I | Score | Early warning | Mitigation | Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-05 | A Redis outage hangs API requests and producers instead of degrading | 3 | 4 | **12 High** | Request latency climbs while `/ready` is 503 | Fail-open cache with command timeouts; bounded enqueue returning 503 | OPS-01 | Mitigating |
| R-07 | Retries and re-deliveries repeat work: duplicate versions and notifications, repeated paid AI calls, false "failed" states shown to users | 4 | 3 | **12 High** | Duplicate rows; `ai_calls_total` grows faster than jobs | State machine, deterministic job ids, final-attempt-only failure | JOB-01 | Open |
| R-09 | An AI provider outage or rate limit degrades features | 3 | 2 | 6 Medium | `ai_circuit_breaker_state` = 2; `ai_fallbacks_total` rising | Existing fallback and circuit breakers; set `AI_FALLBACK_PROVIDERS`; embeddings have no fallback by design | (existing control) | Accepted (monitored) |
| R-12 | AI spend runs away or cannot be attributed to a tenant | 3 | 3 | 9 Medium | Daily `ai_cost_usd_total` above budget | Per-tenant attribution and budgets | AI-02, AI-03 | Open |
| R-20 | Slow requests and failing jobs are noticed late: no tracing, no error monitoring, workers invisible | 3 | 3 | 9 Medium | Support finds incidents before alerts do | Request-id propagation, worker metrics, alerts in the runbook | OBS-01 | Open |
| R-18 | Free-tier limits (LLM API, Atlas, Redis) throttle a pilot | 3 | 2 | 6 Medium | 429s, `rate_limited` errors | Fallback provider, queue concurrency caps, paid tier when needed | (operational) | Accepted |

### Delivery and credibility

| ID | Risk | L | I | Score | Early warning | Mitigation | Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-13 | The deployment blueprint, release workflow and images have never been run; the first deploy may fail or be unsafe | 3 | 3 | 9 Medium | First deploy attempt | Validate the blueprint; run one release; run `check:deployment` | OPS-02 | Open |
| R-15 | Held Dependabot major updates (queue and Redis clients) are merged without integration coverage and break job processing | 3 | 4 | **12 High** | CI passes but jobs fail in a real run | Hold until M1.0; verify with queue integration tests | DEP-01 | Mitigating |
| R-16 | Documentation, résumé or interview claims exceed the implementation (transactions, vector search, scale numbers) | 4 | 3 | **12 High** | A reviewer asks to see it run | Reconcile docs with code; claim only measured results; the audit is the status source | DOC-01 | Mitigating |
| R-17 | The programme is large and has one maintainer (bus factor 1); scope creep from adding technology | 4 | 3 | **12 High** | Milestones slip; new components appear without an ADR | Small shippable milestones; the "do not implement" list; ADR for each architectural change | roadmap | Mitigating |
| R-21 | Synthetic evaluation data leads to overconfidence about real-world AI quality | 3 | 3 | 9 Medium | Quality claims quoted without the caveat | State limits wherever numbers appear; plan anonymized real data with two labelers | ADR 0007 | Accepted (stated) |

### Added during the Phase 0 governance review (each is supported by evidence in the audit)

| ID | Risk | L | I | Score | Early warning | Mitigation | Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-23 | Real-model output quality degrades unnoticed: only the stub is gated in CI and no real-model baselines exist | 3 | 3 | 9 Medium | A provider or model change alters outputs with no failing check | Record real-model baselines; run the evaluation manually before a model change | AI-04, TD-22 | Open |
| R-24 | A queue backlog or a stopped worker leaves jobs queued with no one noticing | 3 | 3 | 9 Medium | `AiJob` rows stay `queued`; worker has no health or metrics | Worker metrics and alert; a sweeper that re-enqueues old `queued` jobs | OBS-01, DATA-03, JOB-01 | Open |
| R-25 | Two concurrent requests modify the same resume or job and one write is lost | 2 | 3 | 6 Medium | Duplicate or inconsistent rows | Compare-and-set state transitions; ownership checks in one helper | JOB-01, DEBT-01 | Open |
| R-26 | An agent runs a tool it should not. Tools are read-only and tenant-bound and the loop is capped, so the exposure today is low | 2 | 3 | 6 Medium | A new tool is added without a policy | Tool allow-list per agent and an authorization check per tool before adding write tools | AGT-01 | Open (low) |
| R-27 | API and worker are deployed out of step and a worker receives a job payload shape it does not understand | 2 | 3 | 6 Medium | Jobs fail right after a deploy | Versioned job payloads; deploy workers first; failure-injection test | JOB-01 | Open |
| R-28 | Resume content, which is personal data, is sent to third-party AI providers with no documented consent, data-processing terms or opt-out | 4 | 4 | **16 High** | A user or customer asks where their data goes | Document providers and terms; add a consent notice and a provider opt-out (Ollama) before real users; include in the retention policy | DATA-02, AI-02 | Open |

## Risks accepted on purpose

| Risk | Rationale | Revisit when |
| --- | --- | --- |
| R-09 provider outage degrading features | Fallback and breakers already bound the impact; embeddings failing hard is deliberate (mixing models would silently corrupt rankings) | Embedding availability becomes a measured problem |
| R-18 free-tier throttling | Acceptable for a pilot; the system degrades through backoff and fallback | Real users or a paid tier |
| R-21 synthetic-data overconfidence | The limit is documented; real labeled data is a later investment | The first customer data or a published accuracy claim |

## Review cadence

Re-score at the end of each roadmap phase. A risk whose finding is closed and verified moves to Closed with a link to the proof (test or run). New risks discovered during implementation are added here immediately and, if Critical, stop the current phase.
