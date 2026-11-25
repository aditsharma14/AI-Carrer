# Audit evidence

Scripts that reproduce the evidence behind [`STAFF_ENGINEERING_AUDIT.md`](../STAFF_ENGINEERING_AUDIT.md). They exist so that no finding rests on "trust me": anyone can re-run them and compare.

- **Read-only.** None of them modifies the repository, the database or any configuration. They contain no application logic and add no dependencies.
- **Run from the repository root:** `node docs/audit-evidence/<script>`. They need Node 20+ and `npm install` already run in `backend/` (and `frontend/` for script 04). No MongoDB, Redis or Docker is needed; that is the point of several of them.
- **Results vary slightly between runs and machines** where they measure time or memory (scripts 07 and 08). The audit quotes ranges.
- **Status of the scripts:** all were run from the repository root on 2026-11-25 (Windows 11, Node 24.16.0) and produced the output recorded below.

| Script | Evidence for | What it does | Result recorded on 2026-11-25 |
| --- | --- | --- | --- |
| `01-tenant-hook-probe.js` | TEN-01 | Runs scoped, unscoped and opt-out queries through the **real** tenant plugin on a real model | All four fail with `next is not a function` (Mongoose 9.12.3) |
| `02-populate-probe.js` | TEN-02 | Uses a corrected async copy of the hook (inside the script, not in the app) to test populate | Populate is refused (`REFUSED find without orgId`); with `match: { orgId }` or `allowCrossTenant` it reaches the driver |
| `mongoose-version-bisect.sh <version>` | TEN-01 | Installs that Mongoose version into a temp folder and runs the real plugin (needs network) | 9.7.2 and 9.12.3 both fail, so the defect is original, not from a dependency update |
| `03-route-table.js` | RBAC-01, API-01, Appendix B | Loads every route file with instrumented middleware and prints each endpoint's real protection chain | 47 endpoints; 3 unauthenticated; 39 tenant-scoped; 22 of those with no declared policy; 9 `aiHeavy`; 3 `auth` limits |
| `04-ui-api-contract.js` | API-01 | Compares every literal frontend API call with the route table | 48 calls; 3 with no backend route; 2 backend endpoints with no caller |
| `05-import-graph.js` | PROD-01, DEBT-02 | Reachability from the entry points through `require`/`import` | 0 unreachable backend files; frontend: `CoachingChatPage.jsx`, `Modal.jsx` (and `test/setup.js`, a test-runner file that is not part of the app) |
| `06-test-coverage-map.js` | TEST-01 | Which source files a test references directly, or only loads transitively | 151 files: 40 referenced directly, 111 only imported |
| `07-redis-down.js` | OPS-01 | The app's exact Redis options with nothing listening: how long does a cache read take? | Still pending after 5,000 ms |
| `08-docx-bomb.js` | SEC-03 | Builds a small DOCX that expands to 150 MB and runs the app's own extraction call | 150 KB upload; 150 MB extracted in 0.66 to 1.0 s; RSS +322 to +360 MB across runs |
| `09-verify-claims.js` | RBAC-01, AUTH-02, SEC-01 | Capability-matcher behavior, bcrypt cost versus the early-return path, production config with weak secrets | `candidate:viewall` is allowed for a role holding only `candidate:view`; known email about 420 to 490 ms versus 0.004 ms for an unknown one; weak secrets accepted in production |
| `10-governance-doc-check.js` | all five documents | Link resolution, every cited `file:line`, finding-ID integrity, traceability gaps, risk scoring | Run it after any edit to the governance documents; it is the consistency gate for them |

## What these do NOT prove

- Scripts 01 and 02 show the failure happens **inside the hook, before any database access**. They do not show an HTTP request failing end to end; that needs a real MongoDB and is Phase 1 milestone M1.0.
- Script 08 shows a 1000:1 expansion for one 150 KB file. The 5 MB worst case (about 5 GB) is extrapolated, not run, because it would exhaust memory.
- Script 04 sees only literal URLs. A URL assembled dynamically would not be matched.
- Script 06 reports how many files a test *references*, not how well they are tested, and not line coverage (no coverage tool is installed).
