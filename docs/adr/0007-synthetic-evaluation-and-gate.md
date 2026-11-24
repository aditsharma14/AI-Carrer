# 0007. Evaluate AI quality on labeled synthetic data and gate merges on it

Status: Accepted   ·   Date: 2026-11-24

## Context

Without measurement, "the AI works" is an opinion, and a prompt tweak or a model swap can quietly make it
worse. We needed numbers for parsing and ranking, a way to compare models, and a check that blocks regressions.
Real resumes are personal data and cannot be committed to a public repository, and labeling them properly needs
two independent people.

## Options considered

- **Manual spot checks.** No cost to start, no repeatability.
- **Anonymised real resumes.** The only route to a true accuracy figure, but needs consent, anonymisation, and
  labeling effort we do not have yet.
- **Generated, fully labeled resumes from a fixed seed.** Labels are correct by construction, reproducible,
  and free; they measure behaviour on traps we design, not real-world accuracy.

## Decision

A generator (`eval/lib/dataset.js`, seed 1337) produces 73 resumes, 14 jobs, graded relevance labels and
injection payloads, committed as JSON and checked by tests. Traps include aliases ("JS", "K8s"), skills
mentioned only to deny them, four layouts, and **decoys** that name every skill a job needs but only to say the
candidate lacks it. The ranking test shows the model's result next to random, keyword and TF-IDF baselines.
`npm run eval:check` runs the deterministic stub against a committed baseline in CI and fails if any of 11
metrics gets worse; real-model runs are manual because they spend API quota.

## Consequences

- Regressions in parsing, matching, metrics or the data itself are caught on every push.
- The first benchmark was too easy: a keyword matcher scored 0.97 NDCG@10. Adding decoys brought it to 0.84,
  so the test could tell reading from word counting. Building the measurement taught us it needed this.
- **Scores are not real-world accuracy** and the README says so first. Relevance labels are a rule, not recruiter
  judgement, and 73 resumes is small enough that differences under about 0.03 are noise.
- The stub baseline is the floor a real model must beat, not a result to quote.

## Revisit when

We have anonymised real resumes with two independent labelers (then report inter-labeler agreement and move the
gate to real data), or the synthetic set stops discriminating (models saturate it).
