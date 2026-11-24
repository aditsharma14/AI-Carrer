# 0005. Fall back between chat providers with a circuit breaker; never for embeddings

Status: Accepted   ·   Date: 2026-11-24

## Context

We depend on hosted model APIs (Groq, Hugging Face) that have outages, rate limits and bad days, and on an
optional local model. When the primary fails, requests either fail or wait out a long timeout (up to two
minutes by default), so a provider problem would become a whole-product latency problem. We also use model
outputs in two different ways: chat completions (any decent model can answer) and embeddings (vectors that
only mean something relative to the model that produced them).

## Options considered

- **Fail when the provider fails.** Simple and honest, but every provider hiccup is a user-visible error.
- **Retry the same provider.** Helps with a blip, but not with an outage or a rate limit, and it adds delay.
- **Fall back to another provider, with a breaker.** More moving parts, but degrades gracefully.
- **Fall back for embeddings too.** Tempting for consistency, and wrong: see consequences.

## Decision

`AI_FALLBACK_PROVIDERS` lists chat providers to try in order. Each has a **circuit breaker**: after 5
consecutive outage failures (unreachable, timeout, rate limit, HTTP error, bad key) it is skipped for 30 seconds,
then one trial request decides whether to close it. Content failures (malformed or truncated output, model not
installed) fall back to the next provider but do **not** count against the breaker, because the provider answered.
Our own errors (a malformed prompt) are never retried elsewhere: another provider would fail identically and the
bug would be hidden. If every breaker is open, the call fails immediately with a clear error. **Embeddings never
fall back.**

## Consequences

- A dead provider costs one fast skip, not a timeout per request.
- Quality can differ on the fallback model; the `ai_fallbacks_total` metric and `ai.fallback` logs make that visible.
- Mixing embedding models would silently corrupt every similarity score (vectors from different models live in
  different spaces and have different sizes), so an embedding outage is an error, on purpose. Matching and
  coaching search are unavailable until the embedding provider recovers.
- Breaker state is per process, so each instance learns of an outage separately.
- More configuration and more states to reason about; covered by 15 tests and by the breaker-state metric.

## Revisit when

Embedding availability becomes a problem (then run a second embedding model *in parallel* into a separate index,
rather than falling back mid-flight), or we run many instances and want shared breaker state in Redis.
