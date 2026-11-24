# Runbook

What to check and do when something is wrong. Each entry names the **symptom**, what
to look at, the likely cause and the fix. Metric names are exactly what
`GET /metrics` exposes; log messages are exactly what the code writes (logs are JSON
lines with a `requestId`, so one request can be followed end to end with
`grep <requestId>`).

## First five minutes (any incident)

1. **Is it up?** `npm run check:deployment -- <api-url> <web-url>` (in `backend/`).
   It names what is broken: liveness, readiness (and which dependency), headers, CORS.
2. **What changed?** Last deploy time, last config change. Most incidents are a change.
   Roll back first, investigate after (`docs/DEPLOYMENT.md`, section 8).
3. **Which layer?** `/ready` failing means a dependency (MongoDB or Redis). `/ready`
   fine but errors high means the app or the AI provider. Latency high with CPU low means
   waiting on something external.
4. **Write down** what you saw and when. It becomes the post-incident note.

## Reading the system

| Question | Look at |
| --- | --- |
| Is the API serving errors? | `sum(rate(http_requests_total{status_class="5xx"}[5m])) / sum(rate(http_requests_total[5m]))` |
| Is it slow? | `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))` |
| Is the AI provider failing? | `sum by (provider, outcome) (rate(ai_calls_total[5m]))` |
| Is a provider cut off? | `ai_circuit_breaker_state` (0 closed, 1 half-open, **2 open**) |
| Are we on the fallback? | `rate(ai_fallbacks_total[5m])` above 0 |
| Are workers behind? | `queue_jobs{state="waiting"}` and `{state="failed"}` per queue |
| What is AI costing? | `sum(increase(ai_cost_usd_total[1d]))` (needs `AI_PRICING`) |
| Is the process healthy? | `process_resident_memory_bytes`, `nodejs_eventloop_lag_seconds` |

### Suggested alerts

| Alert | Condition | Why |
| --- | --- | --- |
| API down | `/ready` failing for 2 minutes | users cannot use the product |
| Error rate | 5xx above 2% of requests for 5 minutes | something is broken |
| Slow | p95 above 2 s for 10 minutes on a non-AI route | users feel it |
| AI provider cut off | `ai_circuit_breaker_state == 2` for 5 minutes | features are degraded or on fallback |
| Queue backlog | `queue_jobs{state="waiting"}` above 100 for 10 minutes | workers are behind or down |
| Failed jobs | `queue_jobs{state="failed"}` rising | jobs exhausted their 3 attempts |
| AI spend | daily cost above your budget | runaway usage or a retry loop |

## Incidents

### `/ready` returns 503

`GET /ready` lists each dependency with an error. Liveness (`/health`) stays 200, so the
platform will stop sending traffic but will not restart the process in a loop.

- **`mongodb: not connected` or a timeout:** Atlas is down, the network allow-list no longer
  includes the host's address, the password was rotated, or the cluster is paused. Check
  Atlas status and Network Access, then `MONGODB_URI`.
- **`redis: ...`:** Redis is down or full, or `REDIS_TLS`/`REDIS_HOST` is wrong. Managed Redis
  that requires encryption needs `REDIS_TLS=true`.
- **`shutting_down`:** a deploy or restart is in progress. It should clear within about a minute.

### Users cannot sign in, or are signed out constantly

- **Everyone gets "Too many requests":** `TRUST_PROXY` is not set behind the host's proxy,
  so all users share one rate limit (20 logins per 15 minutes in total). Set `TRUST_PROXY=1`.
- **Sign-in succeeds but the next request is unauthenticated:** the refresh cookie is not
  being sent. If the web app and API are on different sites (two `*.onrender.com` hosts) set
  `COOKIE_SAMESITE=none`; also check `CLIENT_ORIGIN` equals the web origin exactly.
- **Signed out when logging in on a second device:** known limit, one session per user.

### Resume uploads stay "processing" or end in "failed_needs_review"

1. `queue_jobs{queue="resume-parse"}`: waiting growing and nothing active means **the worker
   is not running**. Start or restart it; jobs are not lost, they wait in Redis.
2. Logs: `resume-parse job failed` shows the reason. Common ones:
   - `Unsupported file type`: not a PDF or DOCX.
   - `This PDF looks like a scanned image`: no selectable text. OCR is not built; ask for a
     text PDF or DOCX.
   - an AI error (below).
3. Each job is attempted 3 times with exponential backoff, then marked failed. After fixing the
   cause, have the user upload again.

### AI features fail or are slow

1. `ai_circuit_breaker_state`. **2 (open)** means a provider failed 5 times in a row and is being
   skipped for 30 seconds at a time. Calls go to `AI_FALLBACK_PROVIDERS` if set; with none, they
   fail immediately with code `unavailable` instead of waiting out a timeout.
2. Logs `ai.provider_failed` show the `code` and whether another provider was tried:
   - `rate_limited` (HTTP 429): you hit the provider's limit. Lower the AI queue concurrency, wait,
     or move to a higher tier. The fallback absorbs this if configured.
   - `auth`: the API key is wrong, expired or lacks permission. Replace it and restart.
   - `timeout` / `unreachable`: provider outage or a network problem. Check the provider's status page.
   - `bad_output`: the model keeps returning JSON that fails validation. Check whether the model or
     `AI_MODEL` changed; the fallback is used meanwhile.
3. `ai.fallback` logs show calls being served by a backup provider. Quality can differ, so
   treat a long fallback period as degraded service.
4. **Embeddings have no fallback on purpose** (vectors from different models are not comparable).
   If the embedding provider is down, matching and the coaching search error until it recovers.

### Job matching or candidate ranking gives odd scores

- With `EMBEDDING_PROVIDER=stub`, scores are meaningless by design. Check the setting.
- After changing the embedding model, cached scores are keyed by model and expire on their own;
  no manual flush is needed.

### Queue backlog

`queue_jobs{state="waiting"}` high:

- Worker down: check the worker service and its logs for `worker process started` and the queue names.
- Workers up but slow: each AI queue runs at most 5 jobs at once on purpose (provider rate limits and
  cost). Raising it helps only if the provider's limits allow it.
- A poison job: `state="failed"` rising for one queue. Read the `... job failed` log for it.

### Emails are not arriving

- `EMAIL_PROVIDER=log` (the default) sends nothing; logs show `email (log mode, not sent)`. Set
  `EMAIL_PROVIDER=smtp` and `SMTP_URL`.
- Logs `email sent` with a `messageId` mean the SMTP service accepted it. Then check the service's own
  delivery log and your domain's SPF and DKIM records.
- A rejected address (a 5xx response) is not retried; a temporary failure is retried by the queue.

### Memory or CPU climbing

`process_resident_memory_bytes` growing steadily across hours suggests a leak. Restart to recover
(`shutdown started` then `shutdown step done` lines confirm a clean stop), keep the heap snapshot or
the metrics graph, and open an issue. Uploads are capped at 5 MB, so large single requests are not the cause.

### Suspected prompt-injection resumes

A resume that contained text aimed at AI tools is marked: the candidate detail response has
`resumeFlagged: true` and `flagReasons`, and logs show `resumeParser: defenses acted on this resume`.
The offending sentences were removed before parsing, so nothing was obeyed, but treat the candidate's
original text with care.

## Data

### Restore from a backup

1. Restore the Atlas snapshot **into a new cluster**, not over production.
2. Point a staging API at it and run `npm run check:deployment`.
3. Spot-check: sign in, open a resume, check an application's history.
4. Switch production's `MONGODB_URI` to the restored cluster during a quiet period, or copy the needed
   collections back. Redeploy the API and the worker.

### A user asks to delete their data

Account and resume deletion endpoints do not exist yet (see the roadmap). Until they do, deletion is a
manual, audited operation in MongoDB: remove the user, their memberships, resumes and versions, and
their applications, and record who did it and when.

## After an incident

Write three lines: **what happened, how it was found, what stops it happening again.** If a check or
an alert would have caught it sooner, add it (`scripts/check-deployment.js`, or an alert above).
