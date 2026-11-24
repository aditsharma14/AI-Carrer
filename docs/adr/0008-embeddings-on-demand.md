# 0008. Embed on demand now; add a vector store when measured limits are hit

Status: Accepted (deferred)   ·   Date: 2026-11-24

## Context

Matching compares a job description with resumes, and coaching searches a user's own resume and conversation
chunks. Both need embeddings. Today the pools are small: one user's chunks, or the applicants of one job. The long
term vision includes searching a large talent pool, which is a different problem.

## Options considered

- **A vector database from day one** (Atlas Vector Search, Qdrant, pgvector). Right for large corpora, but adds a
  service to run, an ingestion pipeline, index tuning and a re-embedding story on model change, before there is
  any data that needs it.
- **Compute embeddings on demand, in memory.** No new infrastructure, no stale index, trivially correct after a
  model change; costs an embedding call per request.

## Decision

Embed on demand with one **batched** request per operation (one call for a whole applicant pool, not one per
resume), mark inputs as `query` or `document` so retrieval-tuned models can use it, keep scoring in process, and
cache results in Redis keyed by provider and model so a configuration change starts clean. No persisted vectors yet.

## Consequences

- Nothing extra to operate, and no index that can go stale or need migrating.
- Cost and latency grow linearly with the pool: fine for hundreds of applicants, wrong for tens of thousands.
- Recruiter talent search across all opted-in candidates is **not possible** with this design. That feature needs a
  persisted index.
- Local-model embedding of a 73-resume pool takes seconds; a hosted API is faster but metered.

## Revisit when

A single job's applicant pool exceeds a few thousand, matching p95 latency passes about two seconds, embedding spend
becomes visible in `ai_cost_usd_total`, or talent search is started. The step then is to persist vectors with their
model name, embed once at upload through the queue, and re-embed on a model change.
