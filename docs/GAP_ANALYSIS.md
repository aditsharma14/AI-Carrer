# Gap Analysis & Roadmap — "AI Career Intelligence & Recruitment Platform"

Compares the target product description (B2C career intelligence + B2B recruitment SaaS) against what exists in this repo as of 2026-11-23, then lays out a phased build plan.

Legend: ✅ built · 🟡 partial / stubbed · ❌ missing

---

## 1. Where the repo stands today

A well-structured **modular monolith**: Express 5 + Mongoose backend with feature modules, tenant scoping, RBAC, BullMQ queues, rate limiting, audit log, and a React 19 + Vite frontend with ~40 pages. The AI layer is designed cleanly (versioned prompts, provider interface, cache, agent loop) **but runs only on a stub provider**. Every AI output is a hand-written mock and embeddings are a character-sum hash (no semantic meaning), so the AI features work as plumbing but not as intelligence yet.

The single biggest gap: **no real LLM or embedding provider.** Most of the description depends on that one piece.

---

## 2. Feature-by-feature comparison

### Student / job seeker side

| Capability | Status | Notes |
|---|---|---|
| Profile: education, skills, projects, certifications, experience, career goals | ❌ | `user.model.js` holds only email/name/password. Skills/experience exist only inside parsed resume `structuredData`. Needs a `CandidateProfile` model. |
| Resume upload | ✅ | `resumes` module, versioning (`resumeVersion.model.js`), magic-byte file sniffing. |
| Resume parsing — DOCX | ✅ | Real text extraction via JSZip. |
| Resume parsing — PDF | 🟡 | Returns a placeholder string (`resumeParser.service.js`). |
| OCR for scanned resumes | ❌ | |
| Information / skill / experience extraction | 🟡 | Prompt exists; stub uses a 27-word keyword list, `experience`/`education` always empty. |
| AI resume analysis / review, ATS scoring | 🟡 | Services + UI exist; outputs mocked. |
| Skill-gap analysis | 🟡 | Service + page; skill diff is exact-string match, no taxonomy/synonyms. |
| Career roadmap | 🟡 | `CareerRoadmapPage.jsx` exists; backed by coaching/learning stubs. |
| Job discovery | ✅/🟡 | Cross-org open-job feed with per-job match score (score not meaningful under stub embeddings). |
| Interview prep, mock interviews | 🟡 | Generator + mock session pages and models; mocked responses. |
| Project / learning recommendations | 🟡 | Learning recs exist; project recommendations don't. |

### Recruiter side

| Capability | Status | Notes |
|---|---|---|
| Organizations, memberships, team mgmt | ✅ | `identity` module, `TeamManagementPage`. Invite-by-email blocked on email provider. |
| Job creation | ✅ | `jobs` module + form. |
| Candidate discovery / talent search | ❌ | Recruiters only see candidates who applied to their job. No searchable talent pool. |
| Semantic search | ❌ | No vector index; embeddings recomputed per request. |
| Candidate–job matching | 🟡 | 3-stage pipeline (embed → skill diff → LLM blurb for top 3) is a good design; needs real embeddings. |
| Explainable matching (strengths + gaps) | 🟡 | `matchedSkills` / `gapSkills` returned — keep and enrich (weighted requirements, evidence quotes). |
| Applicant pipeline | 🟡 | `status` enum on Application; no kanban UI, stage history, or custom stages. |
| Interview management (scheduling, panels, feedback) | ❌ | Interview module is question generation, not scheduling. |
| Candidate notes | ❌ | |
| Recruiter collaboration (comments, @mentions, shared shortlists) | ❌ | |
| Hiring analytics | ✅/🟡 | Analytics module + aggregation worker + `HiringAnalyticsPage`. |
| Resume summarization, candidate comparison | 🟡 | `candidateSummary`, `CandidateComparisonPage` exist; mocked. |
| Interview-question generation | 🟡 | Exists; mocked. |
| JD generation, interview-note summarization, candidate communication, recruitment reports | ❌ | No prompts/services yet. |

### AI layer

| Capability | Status | Notes |
|---|---|---|
| LLM provider | ✅ | Groq, Hugging Face and local Ollama (was stub-only). |
| Embeddings | ❌ | 64-dim char-sum hash. |
| RAG over user's own data | 🟡 | Chunk → embed → cosine → recency rerank, in-memory per request. |
| Career knowledge base (resources, technical knowledge, interview material, skill taxonomy, JDs) | ❌ | No ingestion pipeline, no corpus, no vector store. |
| Five agents + supervisor | 🟡 | Have 4 agents (CareerCoach, Hiring, Interview, Learning) sharing one tool loop. Missing: Resume Analysis Agent, Job Matching Agent, Recruiter Operations Agent (Hiring Agent partially covers it), and the supervisor/router. |
| Evaluation / guardrails | ❌ | No eval set, no output-schema validation on LLM JSON, no prompt-injection handling for resume text. |

### Engineering layer

| Capability | Status | Notes |
|---|---|---|
| REST API | ✅ | `/api/v1`. |
| GraphQL | ❌ | |
| WebSockets / real-time dashboards | ❌ | Notification processor has a "websocket emit later" seam. |
| Queues | ✅ | BullMQ: AI, analytics, notification workers. |
| Caching | ✅ | Redis-backed `aiCache`. |
| Notifications | 🟡 | DB record + queue; no delivery channel (email stub, no push/in-app live). |
| RBAC, multi-tenancy | ✅ | Middleware + `tenantScope.plugin`. |
| Security basics | ✅ | helmet, CORS, rate-limit tiers, JWT + hashed refresh token, audit log. |
| Observability | 🟡 | JSON logs with requestId. No metrics, tracing, or LLM cost/latency dashboards. |
| FastAPI service | ❌ | No Python anywhere. |
| Docker | ❌ | No Dockerfile / compose. |
| AWS deployment | ❌ | |
| CI/CD | ❌ | No `.github/workflows`. |
| Tests | 🟡 | 4–5 frontend unit tests; backend `npm test` is the npm placeholder. |
| Dependency hygiene | ⚠️ | `backend/package.json` lists ~170 transitive packages as direct deps, including frontend libs (react-query, framer-motion, recharts, lucide-react). Should be trimmed to real direct deps. |

### Scale / infrastructure claims

| Claim | Status |
|---|---|
| Llama 70B-class inference at 5K tokens/sec | ❌ No self-hosted inference code. |
| 10M-document RAG | ❌ No vector store; current RAG is in-memory per request. |
| CV/document processing at 100K images/day, ~30 ms inference | ❌ No CV/OCR code. |
| 10K real-time data points at 60 FPS | ❌ No real-time transport or streaming charts. |
| Notifications for 100M users / 10M in 5 s | ❌ Design-level only at best; no fan-out infra or load tests. |

> **If this description is going on a resume or portfolio:** these scale numbers aren't backed by anything in the repo. Either label them clearly as design exercises / targets ("designed for", with a linked design doc and load-test results) or leave them out until there's a benchmark to point at. Interviewers will ask how you measured them.

---

## 3. Roadmap

Ordered so each phase unlocks the next. Rough sizes assume one developer.

### Phase 0 — Foundations (≈1 week)
1. Trim `backend/package.json` to real direct dependencies; add `npm test` with Vitest or Jest + supertest and `mongodb-memory-server`.
2. `docker-compose.yml` (api, worker, frontend, mongo, redis) + Dockerfiles.
3. GitHub Actions: lint, test, build on PR.
4. Fix README to match reality (provider options).

### Phase 1 — Make the AI real (≈1–2 weeks) — *highest leverage*

> **Status (2026-11-23):** items 1–4 done, except OCR. Providers: Groq, Hugging Face and local Ollama for completions; Hugging Face and Ollama for embeddings. Every AI response is validated against zod output contracts in `src/ai/schemas.js`, with one repair retry for malformed JSON. Also added: PDF text extraction (scanned PDFs are rejected with a clear message) and prompt hardening (untrusted text only as tagged user data, with tag break-outs neutralized). Backend tests: `npm test`. **Still open:** OCR fallback and item 5 (eval set).

1. Implement real completion and embedding providers (done: Groq, Hugging Face, Ollama).
2. Validate every LLM JSON response against a zod schema; retry/repair on failure.
3. Add `pdf-parse` (and OCR fallback via Tesseract or a cloud OCR API) to `resumeParser.service.js`.
4. Treat resume/JD text as untrusted input in prompts (delimit, instruct, never let it drive tool calls).
5. Small eval set (≈30 resumes × 10 JDs with expected skills/match tiers) + a script that scores prompt versions.

### Phase 2 — Profiles & vector search (≈2 weeks)
1. `CandidateProfile` model: education, skills (normalized to taxonomy IDs), projects, certifications, experience, goals, visibility/consent flags. Auto-populate from parsed resume; user edits win.
2. Skill taxonomy (seed from ESCO or O*NET) with synonyms → replaces exact-string skill diff.
3. Vector store: MongoDB Atlas Vector Search (least new infra) or Qdrant/pgvector. Persist embeddings on write via queue, not per request.
4. Knowledge-base ingestion worker for career resources, interview material, JDs → chunk, embed, store with metadata.

### Phase 3 — Explainable matching engine (≈1–2 weeks)
1. Score = weighted blend of semantic similarity + must-have/nice-to-have requirement coverage + seniority/location fit.
2. Return per-requirement evidence (which resume line satisfied which requirement) and gaps with suggested learning resources.
3. Talent search for recruiters over opted-in profiles (hybrid keyword + vector, filters).

### Phase 4 — Recruiter workspace (≈2–3 weeks)
1. Pipeline: configurable stages per job, stage history, kanban board UI.
2. Candidate notes, comments with @mentions, shared shortlists.
3. Interview management: scheduling, panel assignment, structured scorecards.
4. New AI tools: JD generation, interview-note summarization, candidate communication drafts, recruitment reports.

### Phase 5 — Agents & supervisor (≈1–2 weeks)
1. Add Resume Analysis, Job Matching, Recruiter Operations agents (fold `hiringAgent` into the last).
2. Supervisor: classify intent → route to one agent (start with a router, not free-form multi-agent chat); keep the existing bounded tool loop and per-agent tool allow-lists scoped by role/tenant.
3. Trace each agent run (agent, tools called, tokens, latency) into the `aiJobs` collection.

### Phase 6 — Real-time & notifications (≈1 week)
1. Socket.IO (with Redis adapter) for live pipeline/dashboard updates and in-app notifications.
2. Email via SES/Postmark; unblock invite-by-email.

### Phase 7 — Optional / showcase items
- **FastAPI service** only if there's a real reason (OCR, local embedding model, CV). Don't add it for its own sake.
- **GraphQL** only if the frontend actually needs flexible aggregation; REST + TanStack Query is fine today.
- **Observability:** OpenTelemetry traces, Prometheus metrics, LLM cost dashboard.
- **AWS:** ECS Fargate or App Runner + DocumentDB/Atlas + ElastiCache; Terraform.
- **Scale experiments:** if you want the throughput numbers, build each as a separate, benchmarked experiment with written results (k6 load tests for the notification fan-out, a vLLM benchmark for inference, etc.).

---

## 4. Suggested first step

Phase 1.1: a real provider. Until it lands, matching scores, skill gaps, and every agent reply are placeholders, so the other phases can't be judged on output quality.
