# AI Career Coach

A full-stack platform that helps candidates manage their job search — resume scoring, AI-driven coaching, job matching, mock interviews, learning recommendations, and analytics — plus tooling for organizations to screen and rank candidates.

## Tech Stack

**Backend** (`backend/`)
- Node.js, Express 5
- MongoDB (Mongoose) for persistence, Redis (ioredis) + BullMQ for background job queues
- JWT-based auth (access + refresh tokens), bcrypt for password hashing
- Pluggable AI provider layer (`AI_PROVIDER=stub | anthropic | openai`)

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

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` by default and expects the API at `http://localhost:4000`.

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for the full list, including `MONGODB_URI`, `REDIS_HOST`/`REDIS_PORT`, JWT secrets, and `AI_PROVIDER` (`stub`, `anthropic`, or `openai`) with its corresponding API key.

## Documentation

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a deeper dive into the system design.

## Scripts

| Location | Command | Description |
| --- | --- | --- |
| `backend/` | `npm run dev` | Start API in watch mode |
| `backend/` | `npm run worker:dev` | Start background worker in watch mode |
| `frontend/` | `npm run dev` | Start Vite dev server |
| `frontend/` | `npm run build` | Production build |
| `frontend/` | `npm run test` | Run tests (Vitest) |
| `frontend/` | `npm run lint` | Lint source |
