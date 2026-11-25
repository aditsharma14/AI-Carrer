# Phase 0 Approval Review

Governance review of the five Phase 0 documents, performed on 2026-11-25 before any Phase 1 work.

- Documents reviewed: [`STAFF_ENGINEERING_AUDIT.md`](STAFF_ENGINEERING_AUDIT.md), [`STAFF_ENGINEERING_ROADMAP.md`](STAFF_ENGINEERING_ROADMAP.md), [`STAFF_TRANSFORMATION_PROGRESS.md`](STAFF_TRANSFORMATION_PROGRESS.md), [`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md), [`RISK_REGISTER.md`](RISK_REGISTER.md).
- Evidence: [`audit-evidence/`](audit-evidence/README.md) (re-runnable scripts, read-only).
- **Scope of this review:** documents only. No application source file was changed, no dependency added, no Phase 1 work started, no finding closed.
- **Independence limit:** the review was done by the same agent that wrote the audit. It therefore leans on re-executable evidence rather than judgment, and **the user's decision is the only independent check**. This review does not approve itself.

---

> **Outcome (2026-11-25):** the user approved Phase 0 **with conditions**: commit the governance documents and evidence; correct `GAP_ANALYSIS.md` (D6, done); record D1 as CI replica-set service containers (done); keep TEN-01 and TEN-02 open until real-MongoDB and tenant-isolation regression tests pass; preserve all P0 gates and dependencies. Phase 1 is **not yet authorized**; the user will authorize M1.0 separately. Approval does not mean production readiness or closure of any defect. The sections below are the review as submitted; where an item has since changed, it is noted in this box only (D1 decided, D6 done, D7 pending the reviewed commit).

## A. Executive summary

- The audit's central claim holds: **TEN-01 is real and reproducible.** The tenant plugin throws `next is not a function` on every query under Mongoose 9.7.2 and 9.12.3 (script 01 and the version bisect). It is an original defect, not caused by a dependency update.
- Of 46 findings, **none was found false and none is resolved.** Several were **overstated or imprecise** in the first draft and have been corrected (section C). The most important corrections: a wrong test-file count (26 -> 25 plus `setup.js`), AI-05 numbers not reproducible from committed artifacts, DOC-01 over-broad as first written, and four vague acceptance criteria.
- The roadmap had **dependency and ordering errors** (a cycle between AUTH-01 and AUTH-02, DATA-02 before AUD-01, AI-01 after AGT-01, M1.4 bundling two independently verifiable changes) and **understated Phase 1** (labelled L; it is XL). These are corrected.
- The progress file lacked per-type completion criteria and conflated "audit complete" with "approved". Corrected, with five separate states.
- The risk register lacked closure plans for its Critical risks and had no entries for six evidence-supported risks. Added.
- **Recommendation: APPROVE WITH CONDITIONS** (section J). Phase 0 is a sound basis for Phase 1, provided four conditions are met, only one of which (decision D1) gates the first milestone.
- **Phase 0 does not fix the application.** TEN-01 and TEN-02 remain open; the application is not production-ready; nothing here claims otherwise.

## B. Five-document scores (out of 10, after corrections)

| Document | Score | Why not higher |
| --- | --- | --- |
| Audit | 8 | Strong evidence discipline and reproducibility; but all runtime consequences of static findings (SEC-02, DATA-01, DATA-03, JOB-01) are unverified until M1.0, and AI-05 numbers cannot be reproduced |
| Roadmap | 8 | Order, dependencies and verification now explicit per milestone; effort estimates are still estimates, and Phases 2 to 10 are outlined, not designed |
| Progress | 8 | Criteria, states and baseline are now checkable; the CI status and open-PR count in the baseline are observations, not script output |
| Technical debt | 8 | Every entry has a milestone; interest is stated; several entries are large and only flagged for splitting, not split |
| Risk register | 8 | Scores verified mechanically (28 of 28); closure plans exist for the five risks scoring 15 or more; likelihood values remain judgment, not data |

Scores describe the documents as planning and governance artifacts, not the application. A score of 8 is not "done": the gaps are listed in section I.

## C. Findings validation

**Classes used:** CONFIRMED (reproduced by a script, or the cited code/content read directly), PARTIALLY CONFIRMED (the claim holds in part), NOT REPRODUCED, RESOLVED WITH EVIDENCE, VERIFICATION REQUIRED (cannot be shown in this environment; the check is named). Where a finding has a mechanism (static) and a runtime consequence, the class applies to the mechanism and the consequence is listed separately as VERIFICATION REQUIRED. "Script NN" means `docs/audit-evidence/NN-*.js`. Severities were reviewed; none was changed.

| ID | Sev | Class | Evidence | Note |
| --- | --- | --- | --- | --- |
| TEN-01 | P0 | **CONFIRMED** | Scripts 01, bisect (9.7.2 and 9.12.3) | Failure is inside the hook, before any database access. End-to-end HTTP failure: VERIFICATION REQUIRED (M1.0) |
| TEN-02 | P0 | **CONFIRMED** (latent) | Script 02 | Uses a corrected async copy of the hook inside the script; the app is unchanged. Becomes live when TEN-01 is fixed |
| TEST-01 | P1 | CONFIRMED | Script 06 | 40 of 151 backend files referenced by a test; this measures references, not line coverage |
| API-01 | P1 | CONFIRMED | Scripts 03, 04 | 3 of 48 literal frontend calls have no route. Borderline P0 (core journey broken) but kept P1 because data is not exposed; recorded as a severity note |
| PROD-01 | P1 | CONFIRMED | Script 05 | `CoachingChatPage.jsx` unreachable |
| PROD-02 | P1 | CONFIRMED (absence) | Script 03 | No pipeline-status endpoint in the route table |
| SEC-01 | P1 | CONFIRMED | Script 09 | Production config loads with 1-character identical secrets |
| SEC-02 | P1 | CONFIRMED (mechanism, static) | `identity.service.js:122` | Refresh token survives password change by code path; runtime behavior: VERIFICATION REQUIRED (M1.5 test) |
| SEC-03 | P1 | CONFIRMED for DOCX | Script 08 | 150 KB -> 150 MB in 0.66 to 1.0 s, RSS +322 to +360 MB. PDF path untested; 5 MB worst case extrapolated, not run |
| DATA-01 | P1 | CONFIRMED (mechanism, static) | `resume.service.js:55` | Base64 file in the job payload; storage growth is a consequence not measured |
| DATA-02 | P1 | CONFIRMED (absence) | Script 03 | No delete or export endpoint |
| DATA-03 | P1 | CONFIRMED (mechanism, static) | `identity.service.js:51-53`, `job.service.js:95` | Writes are sequential and not in a transaction; failure behavior: VERIFICATION REQUIRED (M1.4a) |
| JOB-01 | P1 | CONFIRMED (mechanism, static) | Processor code | Duplicate and false-failure behavior: VERIFICATION REQUIRED (M1.4b) |
| OPS-01 | P1 | CONFIRMED | Script 07 | Cache read still pending after 5,000 ms with no Redis |
| AUTH-01 | P1 | CONFIRMED (absence) | Script 03 | No reset or verification routes |
| AUTH-02 | P2 | CONFIRMED | Script 09 | Known email about 420 to 490 ms vs 0.004 ms unknown. The first draft said "measurably faster" without a measurement; now measured |
| AUTH-03 | P2 | CONFIRMED (static) | Cookie options read | |
| AUTH-04 | P2 | CONFIRMED (static) | `tenant.middleware.js:21` | |
| RBAC-01 | P2 | CONFIRMED | Scripts 03, 09 | 22 of 39 tenant-scoped endpoints declare no policy; `candidate:viewall` allowed for a role holding `candidate:view` |
| AUD-01 | P2 | CONFIRMED (static) | Grep of audit-log call sites | 3 actions |
| JOB-02 | P2 | CONFIRMED (absence, static) | | |
| JOB-03 | P2 | **PARTIALLY CONFIRMED** | `analytics.service.js:30`, `application.repository.js:42` | The unbounded reads exist; the impact at realistic size is unmeasured |
| API-02 | P2 | CONFIRMED (static) | `matching.service.js:107`, `coaching.repository.js:22` | |
| AI-01 | P2 | CONFIRMED (static) | Coaching code | |
| AI-02 | P2 | CONFIRMED | Code and prompt header | The `AiJob` has no prompt version or model field |
| AI-03 | P2 | CONFIRMED (absence, static) | | |
| AI-04 | P2 | CONFIRMED (static) | | The real-model measurement does not exist: VERIFICATION REQUIRED |
| AI-05 | P2 | **PARTIALLY CONFIRMED** | Code | Raw-similarity scoring confirmed; the numbers quoted in the first draft **could not be reproduced from committed artifacts** and were removed or labelled |
| AI-06 | P2 | CONFIRMED | Code | |
| RAG-01 | P2 | CONFIRMED (static) | | Numbers corrected as for AI-05 |
| AGT-01 | P2 | CONFIRMED (static) | | Dependency corrected to "AI-02, AI-01" |
| PERF-01 | P2 | CONFIRMED (static) | | Impact unmeasured |
| SEC-04 | P2 | CONFIRMED | `nginx.conf` read | No security headers in the file |
| SEC-05 | P2 | CONFIRMED (static) | | In-memory limiter |
| FE-01 | P2 | CONFIRMED | Test file count | 5 files / 31 tests |
| FE-02 | P2 | CONFIRMED (static) | `useAiJobPolling.js:15` | |
| OBS-01 | P2 | CONFIRMED | Metrics code | No tracing; workers expose nothing |
| DOC-01 | P2 | **PARTIALLY CONFIRMED** as first written | Script 10 section 2 | Over-broad: the transaction and idempotency claims are in `ARCHITECTURE.md` (lines 258, 632); only the header of `resumeParser.v2` claims a stored prompt version. Corrected |
| PROD-03 | P2 | CONFIRMED (static) | | |
| SEC-06 | P3 | CONFIRMED (static) | | |
| API-03 | P3 | CONFIRMED | | |
| DEBT-01 | P3 | CONFIRMED | Ownership check repeated 7 times | |
| DEBT-02 | P3 | CONFIRMED | Script 05 | `Modal.jsx` unused; `CoachingChatPage.jsx` is PROD-01 |
| DEP-01 | P3 | CONFIRMED | `npm outdated`, PR list | 15 open Dependabot PRs observed at session start |
| OPS-02 | P3 | CONFIRMED | | Files exist, never run |
| PERF-02 | P3 | CONFIRMED | Build output | |

**Totals:** 46 findings; CONFIRMED 43; PARTIALLY CONFIRMED 3 (JOB-03, AI-05, DOC-01); NOT REPRODUCED 0; RESOLVED 0. Seven findings carry a VERIFICATION REQUIRED runtime consequence (TEN-01 end to end, SEC-02, DATA-01, DATA-03, JOB-01, AI-04, SEC-03 PDF path).

**Corrections made to the audit** (36 edits; the substantive ones): test-file count; "transactions mentioned 3 times" overstated; prompt-header claim narrowed to one prompt; AI-05 and RAG-01 numbers labelled non-reproducible; SEC-03 PDF untested; AUTH-02 now measured; four dependency-order errors; vague acceptance criteria made measurable (SEC-03, OPS-01, JOB-03, AUTH-02); Phase 1 complexity corrected.

## D. Cross-document consistency

Checked mechanically by `audit-evidence/10-governance-doc-check.js` after the corrections:

| Check | Result |
| --- | --- |
| Relative links resolve | 0 broken once this file exists |
| Cited `file:line` references (all 29) | 29 of 29 match the cited code |
| Finding IDs | 46 defined (2/13/24/7); no document references an undefined ID |
| Every finding appears in the roadmap | Yes (0 missing) |
| Every debt entry has a milestone | Yes (36 of 36 named in the placement table) |
| Risk scoring | 28 of 28 rows evaluated, 0 errors |
| Counts agree (findings, debt, risks, tests) | Yes after corrections (progress file said 26 test files and 22 risks; now 25 plus `setup.js` and 28) |

Not machine-checkable and checked by reading: M1.4 split into M1.4a/b is used consistently in the roadmap, the progress file and the debt placement; ADR numbering (0010 renamed, 0017 added) appears only in the roadmap.

**Known gaps in traceability.** Nine findings have neither a debt entry nor a risk: PROD-01, PROD-02, AUTH-02, AUTH-03, JOB-02, PERF-01, FE-02, SEC-06, PERF-02. They are all in the roadmap. This is acknowledged rather than padded: not every finding is debt or a standing risk, and inventing entries would add noise. PROD-01 and PROD-02 are product gaps rather than debt.

### Traceability matrix (Finding -> Debt -> Risk -> Roadmap -> Progress -> Verification evidence)

| Finding | Debt | Risk | Roadmap | Progress status | Verification evidence that will close it |
| --- | --- | --- | --- | --- | --- |
| TEN-01 | TD-02 | R-01, R-02 | M1.0, M1.1 | NOT STARTED | CI `integration` green on `main`, named regression test |
| TEN-02 | TD-02 | R-01, R-02 | M1.1 | NOT STARTED | Same run; populate-scoping test |
| TEST-01 | TD-01, TD-19 | R-19 | M1.0 | NOT STARTED | Real-database job in CI; journey tests |
| API-01 | TD-03 | (none) | M1.2 | NOT STARTED | Contract script reports 0 unmatched; journey tests |
| SEC-01 | (none) | R-03 | M1.3 | NOT STARTED | Production-boot test |
| SEC-03 | TD-21 | R-04 | M1.3 | NOT STARTED | Bomb test with stated limits |
| OPS-01 | TD-25 | R-05 | M1.3 | NOT STARTED | Redis-down integration test |
| DATA-03 | TD-06, TD-29 | R-08, R-24 | M1.4a | NOT STARTED | Failure-injection tests |
| JOB-01 | TD-04 | R-07, R-25, R-27 | M1.4b | NOT STARTED | Retry, duplicate, illegal-transition tests |
| SEC-02 | TD-16 | (none) | M1.5 | NOT STARTED | Session tests |
| DATA-01 | TD-05 | R-06 | M1.6 | NOT STARTED | No file bytes in `AiJob` or queue; TTL test |
| DATA-02 | (none) | R-06, R-28 | M5.7 | NOT STARTED | Deletion and export tests |
| RBAC-01 | TD-09 | R-22 | M7.1 | NOT STARTED | Policy-per-route test |
| AUD-01 | (none) | R-22 | M7.3 | NOT STARTED | Audit tests |
| AI-05, PROD-03 | (none) | R-11 | Phases 3, 4, 5 | NOT STARTED | Fairness evaluation |

Phase 2 to 10 findings follow the same pattern and are traced by the roadmap's debt placement table and the findings' own "Verified by" lines.

## E. Progress verification

| Task | Type | Claimed | Verified | Result |
| --- | --- | --- | --- | --- |
| 0.1 inventory | A | COMPLETED | Re-counted by scripts 03, 05, 06 | Corrected the test-file count; frontend counts added to baseline |
| 0.2 tenant audit | A | COMPLETED | Scripts 01, 02, bisect re-run from repo root | Probes were outside the repository, so not reproducible by others; now in `audit-evidence/` |
| 0.3 auth and API | A | COMPLETED | Scripts 03, 04, 09 | Matches |
| 0.4 queues and files | A | COMPLETED | Scripts 07, 08 | Matches; extrapolation stated |
| 0.4b AI and agents | A | COMPLETED | Code read | Real-model measurement never done; stated |
| 0.5 frontend and CI | A | COMPLETED | Scripts 05, 06 | Matches |
| 0.6 audit documents | D | COMPLETED | Script 10 | Counts corrected; 28 risks |
| 0.7 governance review | A + D | COMPLETED, subject to approval | This document | Added |

**Baseline** (progress file): backend 162 tests, frontend 31 tests, stub quality gate passing, production dependency vulnerabilities 0 and 0, 17 models, 47 endpoints. Re-run during the review: route table, contract, import graph, coverage map, Redis-down, DOCX bomb, claim checks. **Observed but not re-checked by a script:** CI result on `main` (commit `50c68da`), 15 open pull requests, the vulnerability counts.

**Phase gating.** The five states are now separate: audit completion COMPLETED, approval PENDING, Phase 1 authorization NOT GRANTED, Phase 1 completion NOT STARTED, production readiness NOT ASSESSED. The P0 gating rule is unchanged and now states exactly what closes TEN-01 and TEN-02.

## F. Risk and debt review

**Risk register.** All 22 original scores recomputed: no arithmetic error. Closure plans added for R-01 and R-06 (Critical) and R-02, R-03, R-11 (15). Each lists the linked finding, milestone, verification requirement, closure evidence, residual risk and status, and none can close on merge alone. R-06's residual risk is stated honestly: data held by AI providers and in backups outlives deletion.

**Added risks (evidence-supported only):** R-23 real-model quality unmonitored (9), R-24 backlog or stopped worker (9), R-25 concurrent modification (6), R-26 unauthorized agent tool execution (6, low because tools are read-only and tenant-bound), R-27 API/worker deploy skew (6), R-28 resume data sent to third-party providers without documented consent (16, High). No risk was removed or downgraded. R-28 is the most consequential addition: it is not in the original audit, and it should be weighed before any real user data is processed.

**Technical debt.** 36 entries kept. Priority changes: TD-29 (standalone MongoDB blocks transaction tests) and TD-31 (caret ranges; pin `mongoose`) promoted to **Now**, because M1.0 needs both. TD-34 wording narrowed. Large entries flagged for splitting (TD-07, TD-13, TD-19, TD-36). **Intentional constraints kept unchanged:** not replacing Express, Mongoose or BullMQ; not splitting the monolith; no TypeScript; the layering is sound; the landing page stays.

**Open item:** TD-35 (`GAP_ANALYSIS.md` marks Phase 0 done while TEN-01 is open). That file is outside the five governance documents, so it was **not edited**; it needs your approval.

## G. Phase 1 readiness

| Milestone | Depends on | Independently verifiable? | Ready to start? | Decision needed |
| --- | --- | --- | --- | --- |
| M1.0 Integration harness | none | Yes (CI job; deliberate TEN-01 failure visible) | **Yes, after D1** | D1 |
| M1.1 Tenant safety net | M1.0 | Yes (M1.0 test turns green) | After M1.0 | none |
| M1.2 UI/API contract | M1.1 | Yes (contract script, journeys) | After M1.1 | D2 |
| M1.3 Security and resilience | M1.0 (SEC-01, SEC-03 may be earlier) | Yes | After M1.0 | none |
| M1.4a Atomic writes | M1.1, M1.0 replica set | Yes (failure injection) | After M1.1 | none |
| M1.4b Job lifecycle | M1.4a | Yes | After M1.4a | D4 revisited |
| M1.5 Sessions | M1.0 | Yes | After M1.0 | none |
| M1.6 File handling | M1.4b | Yes | After M1.4b | D3 |

Only M1.0 has no dependency and no unmade decision other than D1. The harness commits a test that fails against the current plugin by design, so the milestone proves the harness can see TEN-01 before TEN-01 is fixed.

## H. Outstanding decisions

| # | Decision | Recommendation | Reason | Impact of delaying | Latest milestone |
| --- | --- | --- | --- | --- | --- |
| D1 | Real-database test approach | CI service containers; `mongodb-memory-server` only if you want local runs | No new dependency; this machine has no MongoDB or Docker | M1.0 cannot start | Before M1.0 |
| D2 | Resume contract direction | Change the frontend; add `PATCH`/`DELETE` | Backend routes are documented and tested | M1.2 blocked only | Before M1.2 |
| D3 | Retention periods | Files deleted after parsing; AI payloads and results 30 days; transcripts until user deletes | Needed for TTLs and the deletion test | M1.6 blocked; full policy needed by M5.7 | Before M1.6 |
| D4 | Held Dependabot majors | Hold `bullmq` 6 and `ioredis` 6 until queue integration tests; decline Node 25 images | Queue clients not exercised end to end; Node 25 is not LTS | None (holding is the default) | Revisit after M1.4b |
| D5 | Error monitoring | Decide in Phase 8 | Not needed for correctness | None before Phase 8 | Before M8.1 |
| D6 | `GAP_ANALYSIS.md` correction (TD-35) | Approve the edit to its Phase 0 status line | Status is overstated while TEN-01 is open | A stale claim stays in the repository | Before Phase 1 starts |
| D7 | Commit the governance documents and evidence | Commit them, on your instruction | They are untracked, so an approval would refer to files the repository does not contain | None technically; weakens the audit trail | Before M1.0 starts |

Only D1 and D7 should be settled before M1.0; D6 is cheap and best done with D7.

## I. Known limitations

- **No MongoDB, Redis, Docker or browser in this environment.** Everything needing them is VERIFICATION REQUIRED and is exactly what M1.0 exists to supply.
- **No load test, no profiler, no line-coverage tool.** Performance and coverage claims are structural, not measured.
- **Same-agent review.** The audit and its review share an author. Re-executable scripts reduce, but do not remove, that limit.
- **Scripts have limits** (README): script 04 sees literal URLs only; script 06 counts references, not tested lines; script 08 extrapolates the 5 MB case.
- **Scores and likelihoods are judgment.** Risk likelihoods and the 8/10 document scores are reasoned, not measured.
- **AI quality is unmeasured on a real model.** Only the deterministic stub is gated; AI-05 numbers could not be reproduced.
- **Documents are untracked** and `GAP_ANALYSIS.md` is not yet corrected.
- **Not covered:** a legal assessment (R-11, R-28 are engineering risks, not legal opinions), a penetration test, an accessibility audit.

## Approval-readiness criteria (17)

| # | Criterion | Result | Basis |
| --- | --- | --- | --- |
| 1 | Findings validated against the repository | PASS | Section C; 46 classified |
| 2 | Evidence reproducible by someone else | PASS | `audit-evidence/`, run from the repo root |
| 3 | Severities justified | PASS | API-01 borderline noted; none changed |
| 4 | Overstated claims corrected | PASS | 36 audit edits; DOC-01, AI-05 narrowed |
| 5 | Intentional constraints preserved | PASS | Section F |
| 6 | Roadmap dependencies acyclic and ordered | PASS | Cycles removed; script and reading |
| 7 | Milestones independently verifiable | PASS | Each has a "Verified by" entry |
| 8 | Acceptance criteria measurable | PASS | Phase 1 exit criteria numbered; four vague criteria fixed. Later phases remain outlines |
| 9 | Decisions listed with deadlines | PASS | Section H |
| 10 | P0 gating rule preserved and sharpened | PASS | TEN-01/TEN-02 close only on CI evidence |
| 11 | Progress file has per-type completion criteria | PASS | Types A to D |
| 12 | Approval states separated | PASS | Five states |
| 13 | Debt entries all placed | PASS | 36 of 36 |
| 14 | Risk scoring correct and closure plans for Critical | PASS | 28 of 28; 5 plans |
| 15 | Cross-document counts agree | PASS | Script 10 |
| 16 | Documents committed to the repository | **FAIL** | Untracked; needs D7 |
| 17 | Independent review | **PARTIAL** | Same agent; the user's approval is the independent step |

PASS 15, PARTIAL 1, FAIL 1, N/A 0.

## J. Recommendation: APPROVE WITH CONDITIONS

**Evidence for approving.** The core defects are reproduced, not asserted; the corrections found were fixed rather than defended; the roadmap's first milestone is small, has no dependency and is independently verifiable; and the gating rule prevents later phases from starting on a broken data path.

**Evidence against unconditional approval.** Criterion 16 fails (the documents are not in the repository) and criterion 17 is partial. Seven runtime consequences are unverified. GAP_ANALYSIS.md still contradicts the audit.

**Conditions.**

1. Commit the five documents, this review and `audit-evidence/` (D7). Until then the approval has no durable referent.
2. Decide D1 (real-database approach) before M1.0 begins.
3. Decide D6 (correct `GAP_ANALYSIS.md`), or accept it as an open item.
4. Treat this review as input, not as a sign-off: the decision to authorize Phase 1 is yours, and TEN-01 and TEN-02 stay open until the closure rule is met.

**Recommended first Phase 1 milestone: M1.0, the real-database integration harness.** It has no dependency, needs only D1, adds no new application dependency under the recommended option, and every later milestone relies on it.

Nothing in Phase 1 has been started.
