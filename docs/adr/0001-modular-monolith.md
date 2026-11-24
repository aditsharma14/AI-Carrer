# 0001. One deployable, organised as modules, not microservices

Status: Accepted   ·   Date: 2026-11-24

## Context

The product has distinct domains (identity, resumes, jobs, matching, coaching, interviews,
analytics) and a heavy asynchronous workload (AI calls through queues). One team builds it. The
slow, expensive part of a request is the AI provider, not our own CPU. Early on, speed of
iteration and the cost of operating the system matter more than independent scaling of parts.

## Options considered

- **Microservices per domain.** Independent deploys and fault isolation, at the price of
  distributed transactions, network calls where there were function calls, per-service pipelines
  and monitoring, and cross-service versioning. None of those benefits is needed yet.
- **A separate Python AI service.** Python's ML ecosystem is richer, but we only call hosted model
  APIs over HTTP, which Node does well; a second language and deployable would add cost for no
  capability we use.
- **One deployable with enforced module boundaries.** Folder per domain, controllers calling
  services calling repositories, no reaching into another module's models.

## Decision

One Node/Express codebase, deployed as **two processes from one image**: the API and the queue
worker. Domains are separate modules with a service interface between them. The AI layer sits behind
a single client (ADR 0003) so it could be extracted later without touching controllers.

## Consequences

- One repository, one pipeline, one place to debug a request that crosses domains.
- Refactoring across modules is a code change, not an API migration.
- A bug or memory leak in one module can take down the whole API process. Mitigated by the worker
  being a separate process (a stuck AI job cannot block HTTP requests) and by health/readiness
  probes plus graceful shutdown.
- Scaling is whole-process. Acceptable while the bottleneck is the AI provider.
- Module boundaries are a convention, not a compiler guarantee, so they need review discipline.

## Revisit when

A domain needs a different runtime or scaling profile (for example GPU inference or a very hot
search path), two teams are blocked on each other's releases, or one module's load forces the whole
API to be over-provisioned. The first likely extraction is the AI layer.
