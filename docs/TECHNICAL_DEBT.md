# Technical Debt Inventory

Debt is a cost you carry (**interest**) for a shortcut taken or a task deferred; paying it down costs **principal**. Each entry says what the interest is, so priorities follow cost and not taste. Finding IDs refer to [`STAFF_ENGINEERING_AUDIT.md`](STAFF_ENGINEERING_AUDIT.md).

- **Type:** Design, Code, Test, Docs, Dependency, Infra.
- **Principal:** S (hours), M (1-3 days), L (about a week), XL (multi-week).
- **Priority:** **Now** = blocks correctness or is cheap relative to its risk; **Next** = schedule in the roadmap; **Later** = only if it starts to hurt.
- **Origin:** *Original* = present in the code I inherited; *Recent* = introduced by recent work in this engagement, listed honestly.

## 1. Critical debt (not optional)

| ID | Type | Debt | Interest (what it costs now) | Principal | Priority | Finding | Origin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TD-01 | Test | No test touches a real database; unit tests mock the Mongoose models | Hid a defect that breaks every tenant query; every database-level assumption is unverified | M | **Now** | TEST-01 | Original |
| TD-02 | Design | Tenant safety-net plugin written in a hook style the Mongoose version does not support | The defense-in-depth the docs describe has never run | S | **Now** | TEN-01, TEN-02 | Original |
| TD-03 | Design | UI and API contracts are maintained by hand with no check | Resume create, edit and delete are broken from the UI | M | **Now** | API-01 | Original |
| TD-04 | Design | Job lifecycle copied into 5 processors, with no state machine or idempotency | False failures, duplicate versions and notifications, wasted AI spend; every new processor repeats the flaw | L | **Now** | JOB-01, DEBT-01 | Original |
| TD-05 | Design | Uploaded files are carried in the queue payload and persisted in `AiJob.payload` | Privacy exposure, storage and Redis memory growth, no retention | M | **Now** | DATA-01 | Original |

## 2. Design and code debt

| ID | Type | Debt | Interest | Principal | Priority | Finding | Origin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TD-06 | Design | Multi-write operations (signup, apply, manual resume) are not atomic | Orphans that lock users out; counter drift | M | Now | DATA-03 | Original |
| TD-07 | Design | Stub coupling: 13 `mock:` callbacks passed to `aiClient.complete`, and stub-only heuristics (`KNOWN_SKILLS`, `QUESTION_TEMPLATES`, `mockReply`...) living in 11 production service and agent files | Production code carries test fixtures; every AI call site has to know about the stub; harder to read and to change | M | Next | n/a | Original |
| TD-08 | Code | Resume ownership check `String(resume.userId) !== String(userId)` repeated 7 times | A missed copy is an authorization bug; edits need seven changes | S | Next | DEBT-01 | Original |
| TD-09 | Design | Authorization is a mix of capabilities, roles and nothing (22 of 39 tenant-scoped endpoints declare no policy); the capability matcher uses `startsWith` | Over-broad reads; future privilege escalation | M | Next | RBAC-01 | Original |
| TD-10 | Design | Skill handling split three ways: an evaluation-only taxonomy, a 5-role static map for gaps, raw strings in matching | Shallow and inconsistent skill intelligence; each fix must be made three times | M | Next | AI-06 | Original (taxonomy moved to `src` in recent work) |
| TD-11 | Design | Retrieval recomputes embeddings per request and is used by one feature | Cost and latency grow with pool size; no candidate search | XL | Next | RAG-01 | Original |
| TD-12 | Code | Per-request tenant resolution loads and populates all memberships; ambiguous default organization | Extra query per request; wrong-organization surprises | S | Next | AUTH-04 | Original |
| TD-13 | Code | Unbounded reads: analytics loads every application; candidates list unpaginated with N+1 user lookups; coaching list loads transcripts to count them | Memory and latency grow with data | M | Next | JOB-03, API-02 | Original |
| TD-14 | Design | `AiJob` carries `Mixed` payload and result with no schema, no provenance (prompt, model, tokens) | Cannot trace or cost a result; untyped data in a hot collection | M | Next | AI-02 | Original |
| TD-15 | Code | Coaching keeps the whole transcript in one array and sends all of it to the model | Cost and failure grow with conversation length | M | Next | AI-01 | Original |
| TD-16 | Code | `identity.service.js` (220 lines) mixes authentication, profile, organization and team concerns | Harder to review; sessions and password reset will worsen it | M | Later | SEC-02, AUTH-01 | Original |
| TD-17 | Code | Path parameters unvalidated; invalid ids surface as a generic cast error | Unclear 400s | S | Later | API-03 | Original |
| TD-18 | Code | Frontend: unused `Modal` component; one React Compiler warning in `SignupPage`; a 449-line landing page | Noise; minor | S | Later | DEBT-02 | Original |

## 3. Test debt

| ID | Debt | Interest | Principal | Priority | Finding |
| --- | --- | --- | --- | --- | --- |
| TD-19 | 8 domain modules have no direct tests; `identity` has one; `middleware` has one of seven | Refactors are blind; defects ship | L | **Now** (with TD-01) | TEST-01 |
| TD-20 | Frontend has 5 test files / 31 tests, none for API clients, hooks, guards, the refresh interceptor or workflows; no accessibility or end-to-end tests | UI regressions and contract breaks unseen | L | Next | FE-01 |
| TD-21 | No load, chaos or security-abuse tests (duplicate delivery, worker crash, zip bomb, cross-tenant matrix) | Reliability claims unverified | L | Next | JOB-01, SEC-03 |
| TD-22 | The AI quality gate runs only the deterministic stub in CI; the real-model baselines and the post-hardening injection measurement do not exist | The gate protects code, not model behavior | M | Next | AI-04 |

## 4. Operational and infrastructure debt

| ID | Debt | Interest | Principal | Priority | Finding | Origin |
| --- | --- | --- | --- | --- | --- | --- |
| TD-23 | No tracing, error monitoring, database/Redis timings; workers expose no metrics or health | Slow requests and job failures hard to attribute | M | Next | OBS-01 | Original |
| TD-24 | In-memory rate limiter; single API instance only | The login limit weakens as the API scales | S | Next | SEC-05 | Original |
| TD-25 | Cache and queue connections share options that never fail fast | Redis outage hangs requests | S | Now | OPS-01 | Original |
| TD-26 | Web container serves no security headers or CSP | Weaker XSS/clickjacking posture for the page holding the access token | S | Next | SEC-04 | Recent (the nginx config was written in this engagement) |
| TD-27 | `render.yaml` and the release workflow have never been run or validated; compose falls back to development JWT secrets | Deployment may fail on first use; unsafe if copied | S | Next | OPS-02 | Recent |
| TD-28 | Worker metrics are not exposed, and the metrics registry is per process, so queue depth is only visible through the API process | Blind spot in incidents | S | Next | OBS-01 | Recent |
| TD-29 | Compose runs a standalone MongoDB, so transactions cannot be tested locally | Blocks TD-06 verification outside CI; the M1.0 harness needs a single-node replica set | S | **Now** (M1.0) | DATA-03 | Original |

## 5. Dependency debt

| ID | Debt | Interest | Principal | Priority | Finding |
| --- | --- | --- | --- | --- | --- |
| TD-30 | 15 open Dependabot pull requests, mostly major versions (bullmq 6, ioredis 6, vitest 5, jsdom 31, framer-motion 14, dotenv 18); Node 25 base-image bumps | Update queue grows; majors age; Node 25 is not LTS | M | Next (after TD-01) | DEP-01 |
| TD-31 | Caret ranges on core packages (for example `mongoose ^9.7.2` resolved to 9.12.3 between commits) | Silent minor drift in the package that holds the tenant plugin | S | **Now** (M1.0: pin `mongoose` exactly) | DEP-01 |
| TD-32 | `eslint-plugin-jsx-a11y` forces `legacy-peer-deps` in the frontend | An npm setting hides future peer conflicts | S | Later | n/a |

## 6. Documentation debt

| ID | Debt | Interest | Principal | Priority | Finding |
| --- | --- | --- | --- | --- | --- |
| TD-33 | `ARCHITECTURE.md` describes transactions, idempotency and vector search that the code does not implement | Readers and reviewers are misled | M | Next | DOC-01 |
| TD-34 | The header of `resumeParser.v2` and lines in `ARCHITECTURE.md` say the prompt version is stored on every `AiJob`; it is not (other prompt files do not make the claim) | Misleading provenance claim | S | Next | DOC-01, AI-02 |
| TD-35 | `GAP_ANALYSIS.md` marks Phase 0 done while TEN-01 is open | Status overstated | S | Now (corrected 2026-11-25 with the user's approval: a correction note now precedes the original status; the real-MongoDB item stays open until M1.0) | DOC-01 |
| TD-36 | No API contract document; no data-flow diagrams; no threat model; no SLOs | Review and onboarding cost | L | Next | roadmap Phases 7, 8 |

## 6b. Entries to split when scheduled

Some entries are too large to be one unit of work. Split them when their milestone starts, not before:

| Entry | Split into |
| --- | --- |
| TD-07 | one change per service (resume parser, matching, coaching, interview, recommendations...), each removing its `mock` callback |
| TD-13 | (a) analytics aggregation, (b) candidates list pagination and N+1, (c) coaching list projection |
| TD-19 | one test milestone per domain module, delivered inside the milestone that touches the module |
| TD-36 | (a) API contract document, (b) data-flow diagrams, (c) threat model, (d) SLOs |

Every entry has a milestone in the roadmap's "Technical-debt placement" table.

## 7. How debt is paid down

1. **Pay for correctness first** (section 1), then pair each feature milestone with the debt it touches, rather than scheduling cleanup separately.
2. **Never add a new copy.** New processors use the `runAiJob` wrapper (TD-04); new routes declare an authorization policy (TD-09); new AI calls take no `mock` parameter once TD-07 is done.
3. **Record new debt here** when a shortcut is taken on purpose, with its interest and who owns it.
4. **Review quarterly:** drop entries whose interest never materialized; promote any that did.

## 8. Debt deliberately NOT being paid

| Item | Why |
| --- | --- |
| Rewriting the repository/service/controller layering | It is consistent and sound; the defects are specific |
| Replacing Mongoose, BullMQ or Express | No evidence of a limit; the cost is large |
| Splitting the monolith | No measured need (ADR 0001) |
| Converting to TypeScript | Excluded by the project constraints |
| Reducing the 449-line landing page | Marketing content, low interest |
