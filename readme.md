# AI Career Coach

A full-stack platform that helps candidates manage their job search — resume scoring, AI-driven coaching, job matching, mock interviews, learning recommendations, and analytics — plus tooling for organizations to screen and rank candidates.

## Tech Stack

**Backend** (`backend/`)
- Node.js, Express 5
- MongoDB (Mongoose) for persistence, Redis (ioredis) + BullMQ for background job queues
- JWT-based auth (access + refresh tokens), bcrypt for password hashing
- Pluggable AI provider layer using open models: completions via Groq, Hugging Face or local Ollama (`AI_PROVIDER=stub | groq | huggingface | ollama`), embeddings via Hugging Face or Ollama (`EMBEDDING_PROVIDER=stub | huggingface | ollama`).

**Frontend** (`frontend/`)
- React 19 + Vite
- React Router, TanStack Query, React Hook Form
- Tailwind CSS 4, Framer Motion, Recharts
- Vitest + Testing Library for tests, ESLint + Prettier for linting/formatting

## Project Structure

```
AI-Carrer/
├── backend/          Express API + background worker
│   └── src/
│       ├── modules/  Feature modules (identity, resumes, coaching, matching,
│       │             jobs, interview, learning, analytics, aiJobs, notifications, audit)
│       ├── routes/   Route aggregation
│       ├── queue/    BullMQ queues/processors
│       ├── ai/       AI provider integration
│       └── config/   Environment & app config
├── frontend/         React SPA
│   └── src/
│       ├── features/ Feature-based UI modules (auth, dashboard, resumes,
│       │             job-matching, ats-scoring, interview, coaching, learning,
│       │             skill-gap, career-roadmap, screening, candidate-ranking,
│       │             analytics, organizations, team, profile, public)
│       ├── shared/   Shared components/utilities
│       └── app/      App shell, routing, providers
└── docs/             Architecture documentation
```

## Getting Started

### Prerequisites
- Node.js (LTS)
- MongoDB running locally or a connection string
- Redis running locally or a connection string

### Backend

```bash
cd backend
cp .env.example .env   # fill in secrets / connection strings
npm install
npm run dev             # starts the API with nodemon
npm run worker:dev      # starts the BullMQ worker (separate process)
```

The API listens on `http://localhost:4000` by default, mounted under `/api/v1`.

### Docker (whole stack in one command)

```bash
cp backend/.env.example backend/.env   # set AI_PROVIDER=stub for a no-keys run
docker compose up --build
```

Starts MongoDB, Redis, the API (`http://localhost:4000`), the queue worker and the web app (`http://localhost:8080`). The API and worker are one image run with different commands. Health endpoints: `/health` (liveness, touches nothing) and `/ready` (readiness: MongoDB and Redis reachable, returns 503 while shutting down). Both processes finish in-flight work on `SIGTERM` before exiting. To reach Ollama running on your host, set `OLLAMA_BASE_URL=http://host.docker.internal:11434`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` by default and expects the API at `http://localhost:4000`.

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for the full list, including `MONGODB_URI`, `REDIS_HOST`/`REDIS_PORT` and JWT secrets.

### AI providers

The recommended setup is **Groq for chat and Hugging Face for embeddings** (both have free tiers). This is what `.env.example` is configured for:

| Setup | `.env` | Cost |
| --- | --- | --- |
| **Groq + Hugging Face** (recommended) | `AI_PROVIDER=groq`, `GROQ_API_KEY=...`, `EMBEDDING_PROVIDER=huggingface`, `HF_TOKEN=...` | Free tiers available |
| **Hugging Face only** | `AI_PROVIDER=huggingface`, `EMBEDDING_PROVIDER=huggingface`, `HF_TOKEN=...` | Free tier available |
| **Fully local** | `AI_PROVIDER=ollama`, `EMBEDDING_PROVIDER=ollama` (first run `ollama pull llama3.1` and `ollama pull nomic-embed-text`) | Free, runs on your machine |
| **No AI** | `AI_PROVIDER=stub`, `EMBEDDING_PROVIDER=stub` | Free; canned answers, match scores meaningless |

Each provider has a default model; set `AI_MODEL` / `EMBEDDING_MODEL` to override. Groq has no embeddings API, so pair it with Hugging Face or Ollama embeddings. Every AI response is checked against its expected JSON shape, with one automatic retry if a model returns malformed output.

## Documentation

| Document | What it covers |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | The system design |
| [`docs/adr/`](docs/adr/) | Why it is built this way: eight decision records with the options rejected and when to revisit |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Taking it to production: configuration, domains and cookies, verification, rollback |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | What to check and do when something fails, with the metrics and alerts to use |
| [`backend/eval/README.md`](backend/eval/README.md) | The AI accuracy evaluation, what it measures and where it is weak |
| [`docs/GAP_ANALYSIS.md`](docs/GAP_ANALYSIS.md) | What is built, what is missing, and the roadmap |
| [`SECURITY.md`](SECURITY.md), [`CONTRIBUTING.md`](CONTRIBUTING.md) | Reporting vulnerabilities; how to contribute |

### Production readiness at a glance

Built: health and readiness probes, graceful shutdown, Prometheus metrics (HTTP, AI, queues, cost), provider
fallback with circuit breakers, prompt-injection defenses, a CI quality gate on AI accuracy, dependency and code
scanning, container images, a post-deploy verification script. Not yet: a live deployment, API-level tenant
isolation tests against a real database, account deletion and data export, a shared rate-limit store for running
more than one API instance.

## Scripts

| Location | Command | Description |
| --- | --- | --- |
| `backend/` | `npm run dev` | Start API in watch mode |
| `backend/` | `npm run worker:dev` | Start background worker in watch mode |
| `backend/` | `npm test` | Run backend tests (Vitest, no API calls) |
| `backend/` | `npm run eval:check` | AI quality gate: fail if parsing or ranking got worse |
| `backend/` | `npm run check:deployment -- <api> [web]` | Verify a live deployment |
| repo root | `docker compose up --build` | Run the full stack in containers |
| `frontend/` | `npm run dev` | Start Vite dev server |
| `frontend/` | `npm run build` | Production build |
| `frontend/` | `npm run test` | Run tests (Vitest) |
| `frontend/` | `npm run lint` | Lint source |
