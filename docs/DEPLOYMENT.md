# Deployment guide

How to run AI-Carrer in production. Everything here is prepared in the repository;
the steps that need **your own accounts and secrets** are marked **(you)**, because
they cannot be done from code.

## What gets deployed

```
                     ┌──────────────┐        ┌────────────────────┐
   browser ────────► │  web (static)│        │  MongoDB Atlas     │
      │              └──────────────┘        └─────────▲──────────┘
      │ HTTPS + cookie                                  │
      └─────────────► ┌──────────┐  jobs  ┌──────────┐  │
                      │   API    │───────►│  Redis   │  │
                      │ (Express)│        └────▲─────┘  │
                      └────┬─────┘             │ jobs   │
                           │             ┌─────┴────┐   │
                           └────────────►│  worker  │───┘
                              Groq / HF  │ (BullMQ) │
                                         └──────────┘
```

| Part | What it is | Scales by |
| --- | --- | --- |
| **API** | `node src/server.js`, stateless | more instances (see "Before running more than one API instance") |
| **Worker** | same image, `node src/worker.js`, no HTTP port | more instances; lower AI-queue concurrency if providers rate-limit you |
| **Web** | static files built by Vite (`VITE_API_URL` is baked in at build time) | CDN |
| **MongoDB** | managed (Atlas) | tier / replica set |
| **Redis** | managed, **persistence on and no eviction**: BullMQ stores queued jobs here | tier |
| **AI** | Groq for chat, Hugging Face for embeddings (hosted APIs) | provider limits |

## 1. Accounts you need (you)

| Service | Used for | Note |
| --- | --- | --- |
| **GitHub** | source, CI, container images | already set up |
| **MongoDB Atlas** | database | create a cluster and a database user; allow your hosts' IPs (or `0.0.0.0/0` while testing, then tighten) |
| **Hosting** | API, worker, web | Render has a blueprint in this repo ([`render.yaml`](../render.yaml)); any container host works (see section 4) |
| **Redis** | queues and cache | Render Key Value (in the blueprint), Upstash, or ElastiCache. If it requires TLS set `REDIS_TLS=true` |
| **Groq** | chat model | key at console.groq.com/keys |
| **Hugging Face** | embeddings | token with the "Make calls to Inference Providers" permission |
| **SMTP service** *(optional)* | invitation emails | Resend, SES, Postmark or Mailgun; without it emails are logged, not sent |

Free tiers and limits change often. Check each provider's current limits before
relying on them; in particular, background workers are not offered on every free plan.

## 2. Configuration reference

Set these on the **API**. The **worker** needs the same database, Redis, JWT and AI values.

| Variable | Required | Value |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` (turns on Secure cookies and disables `/metrics` unless a token is set) |
| `MONGODB_URI` | yes | Atlas connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | two different random strings: `openssl rand -base64 48` |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | yes | from your Redis provider; `REDIS_TLS=true` if it needs encryption |
| `CLIENT_ORIGIN` | yes | the web app's exact URL, e.g. `https://app.example.com` (CORS and cookies depend on it) |
| `TRUST_PROXY` | **yes, behind a host** | `1` behind one load balancer. If it is left at `0`, every user shares one rate limit |
| `COOKIE_SAMESITE` | see section 3 | `lax` (default) or `none` |
| `AI_PROVIDER`, `GROQ_API_KEY` | yes for real AI | `groq` and your key. `stub` runs with canned answers and meaningless match scores |
| `EMBEDDING_PROVIDER`, `HF_TOKEN` | yes for real AI | `huggingface` and your token |
| `AI_FALLBACK_PROVIDERS` | recommended | `huggingface`: used when Groq is down or rate-limiting you |
| `AI_PRICING` | optional | `{"groq":{"in":0.59,"out":0.79}}` USD per million tokens, to report estimated spend |
| `METRICS_TOKEN` | optional | bearer token for `GET /metrics`; the endpoint is off in production without it |
| `EMAIL_PROVIDER`, `SMTP_URL`, `EMAIL_FROM` | optional | `smtp` plus an SMTP URL to really send email |
| `LOG_LEVEL` | optional | `warn` hides routine info lines; the default prints everything |

Never put secrets in the repository. `.env` files are git-ignored; use your host's secret store.

## 3. Domains and cookies (read this before going live)

Sign-in uses a `httpOnly` refresh-token cookie. Browsers only send it when the
request is **same-site** with the page, so the domain layout decides what works:

| Layout | Example | Setting |
| --- | --- | --- |
| **Same parent domain** (recommended) | `app.example.com` + `api.example.com` | `COOKIE_SAMESITE=lax` |
| **Different sites** | `my-web.onrender.com` + `my-api.onrender.com` | `COOKIE_SAMESITE=none` (HTTPS only) |

Hosts' shared domains such as `onrender.com` count as different sites for every
customer, so the second layout needs `none`. Buying a domain and putting both
under it is cleaner and avoids third-party-cookie blocking in some browsers.

`CLIENT_ORIGIN` must equal the web origin exactly (scheme, host, no trailing slash).

## 4. Deploy

### Option A: Render Blueprint

1. **(you)** Create the accounts above, a MongoDB Atlas database, and a Groq key and Hugging Face token.
2. **(you)** In Render: **New > Blueprint**, select this repository. It reads
   [`render.yaml`](../render.yaml) and creates the API, the worker, the web app and Redis.
3. **(you)** When prompted, fill in the values marked as secrets: `MONGODB_URI`,
   `CLIENT_ORIGIN`, `GROQ_API_KEY`, `HF_TOKEN`, and `VITE_API_URL`
   (`https://<your-api>/api/v1`). Copy the generated `JWT_*` secrets to the worker.
4. After the first deploy, set `CLIENT_ORIGIN` to the web app's real URL and redeploy the API.
5. Run the verification script (section 5).

The blueprint was written without access to Render's validator; the dashboard reports
any schema error before creating anything, so fix what it names and continue.

### Option B: any container host (Fly.io, Railway, Cloud Run, ECS, a VM)

Release images are built by GitHub Actions ([`release.yml`](../.github/workflows/release.yml)):

```bash
git tag v0.1.0 && git push origin v0.1.0     # builds and publishes the images
```

They are published to `ghcr.io/<owner>/ai-career-api` (used for the API **and** the
worker) and `ghcr.io/<owner>/ai-career-web`. Run the API image as is, the worker image
with the command `node src/worker.js`, and give both the variables from section 2.
The API listens on `PORT` (default 4000) and exposes `/health` (liveness) and
`/ready` (readiness) for your platform's health checks.

Or locally with the whole stack: `docker compose up --build`.

## 5. Verify the deployment

```bash
cd backend
npm run check:deployment -- https://api.example.com https://app.example.com
```

It checks liveness and readiness, HTTPS, security headers, that unknown routes return
a clean JSON 404, that protected routes refuse anonymous requests, that `/metrics`
is not public, that CORS rejects other origins, and that the web app and its deep
links load. Fix anything it reports before sending real users.

Then, by hand: sign up, upload a PDF resume, confirm it parses (this exercises the
queue, the worker, the AI provider and the database), and read
[`RUNBOOK.md`](RUNBOOK.md) so you know what to do when something fails.

## 6. Before running more than one API instance

Two things are per-process today:

- **Rate-limit counters live in memory.** With N instances each client effectively
  gets N times the limit, and the 20-per-15-minutes login limit becomes weaker.
  A Redis-backed store (`rate-limit-redis`) is the fix; until then run a single API instance.
- **Refresh tokens: one session per user.** Signing in on a second device signs out the first.

## 7. Backups and recovery

- **MongoDB:** enable Atlas backups (continuous or scheduled snapshots). A backup you have
  never restored is a hope, not a backup: restore one into a scratch cluster and run
  `check:deployment` against it before you rely on it.
- **Redis:** holds queued jobs and cache only. Keep persistence on, but a loss costs
  at most in-flight jobs (uploaded resumes can be re-uploaded); nothing is only in Redis.
- **Secrets:** keep `JWT_*` in your host's secret store. Rotating them signs everyone out.

## 8. Rolling back

- **Render / most hosts:** redeploy the previous successful deploy from the dashboard.
- **Containers:** deploy the previous tag (`ghcr.io/<owner>/ai-career-api:v0.1.0`).
- Database changes are not migrated automatically, so keep schema changes backward
  compatible (add fields with defaults, never repurpose or drop them in the same release).
