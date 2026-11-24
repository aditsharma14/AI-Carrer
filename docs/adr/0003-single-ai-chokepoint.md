# 0003. Every AI call goes through one client, and its output is validated

Status: Accepted   ·   Date: 2026-11-24

## Context

Many features call a language model (parsing, review, coaching, interview questions, summaries,
agents). Providers differ in wire format, in how reliably they return JSON, in token accounting and in
failure modes, and we want to run on hosted APIs and on a local model. The code that consumes a model
response must not care which one produced it, and a malformed response must never reach the database
or the UI.

## Options considered

- **Each feature calls a provider SDK directly.** Fastest to write, but retries, logging, cost
  tracking, validation and provider switching would be repeated in every feature, and a switch means
  touching all of them.
- **A framework** (LangChain and similar). Provides a lot, but also a large dependency surface and
  abstractions we would have to learn and work around for the small set of operations we use.
- **One thin client and a provider interface.** A few hundred lines we fully own.

## Decision

All AI calls go through `aiClient.complete()` and `embed()`. A provider implements one function
(`send`) and shares the same chat core. For prompts with a defined output shape, the response is parsed,
validated against a zod schema (`ai/schemas.js`), and if it is invalid the model is shown its own output
and the validation errors and gets **one** repair attempt; then it fails loudly. The same validation
runs on the stub provider, so a stub that drifts from the contract fails in tests. No module imports a
provider directly.

## Consequences

- Switching providers is configuration. Adding one means one file with one function.
- Logging, token counts, latency, cost estimates, metrics, fallback and circuit breaking each live in one
  place.
- Bad model output becomes a handled error code, never corrupted data.
- We own the abstraction, so we maintain it (new provider quirks, new features such as streaming).
- One repair attempt is a deliberate cap: a second costs money and a model that fails twice rarely
  succeeds a third time. It shows up in the "needed the repair retry" count of the evaluation.

## Revisit when

We need capabilities that are costly to rebuild (streaming tool calls across providers, long-running
agent graphs, tracing UIs), or a provider's native structured-output support is reliable enough that the
repair loop is rarely used.
