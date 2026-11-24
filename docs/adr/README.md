# Architecture decision records

A decision record explains **why** something is built the way it is: the situation, the
options that were weighed, what was chosen, what it costs, and **what would make us change
our minds**. The code shows what was built; these show what was rejected and why.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-modular-monolith.md) | One deployable, organised as modules, not microservices | Accepted |
| [0002](0002-deterministic-scores-llm-explains.md) | Scores are computed by code; the model only explains them | Accepted |
| [0003](0003-single-ai-chokepoint.md) | Every AI call goes through one client, and its output is validated | Accepted |
| [0004](0004-prompt-injection-defense.md) | Resume text is attacker input: three defense layers, measured | Accepted |
| [0005](0005-provider-fallback-and-breaker.md) | Fall back between chat providers with a circuit breaker; never for embeddings | Accepted |
| [0006](0006-tenant-isolation.md) | Tenant isolation by convention, with a safety net and known gaps | Accepted |
| [0007](0007-synthetic-evaluation-and-gate.md) | Evaluate AI quality on labeled synthetic data and gate merges on it | Accepted |
| [0008](0008-embeddings-on-demand.md) | Embed on demand now; add a vector store when measured limits are hit | Accepted (deferred) |

## Template

```markdown
# NNNN. Title

Status: Proposed | Accepted | Superseded by NNNN   ·   Date: YYYY-MM-DD

## Context
The forces at play: what problem, what constraints, what we knew.

## Options considered
Each with its real strengths and costs.

## Decision
What we chose, in one or two sentences.

## Consequences
What gets easier, what gets harder, what we now have to live with.

## Revisit when
The measurable condition that would make us change this.
```

Decisions are never edited away. When one changes, write a new record and mark the old one
superseded, so the history of the reasoning stays readable.
