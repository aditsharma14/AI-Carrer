# 0002. Scores are computed by code; the model only explains them

Status: Accepted   ·   Date: 2026-11-24

## Context

The product shows candidates an ATS score, a job match score and a skill-gap analysis, and shows
recruiters a ranked list of applicants. These numbers drive decisions about people. Asking a
language model "how good is this resume, 0 to 100?" gives a different answer on a re-run, cannot be
audited, and cannot be explained beyond what the model says about itself.

## Options considered

- **Model produces the score.** Simple to build and can capture nuance, but it is not reproducible,
  not testable with exact expectations, costs a call per score, and invites a recruiter to ask "why
  did this person rank below that one?" with no real answer.
- **Code produces the score; the model writes the explanation.** Reproducible, free per item, unit
  testable, and the explanation is anchored to numbers that already exist.

## Decision

Scores come from deterministic code: weighted keyword and structure checks for ATS, embedding
similarity plus skill overlap for matching, a fixed comparison for skill gaps. The model is given the
finished numbers and asked only to explain them, with an instruction not to change them. Ranking is a
sort, not a model call. The one model call per candidate is limited to the top few matches and can fail
without affecting the score.

## Consequences

- The same input always gives the same score, so it can be tested, cached by input, and explained
  ("matched on these skills, missing these").
- AI cost is bounded: scoring is free and explanations are a small, capped number of calls.
- If the model is down, scores still work and only the written explanation is missing.
- The scores cannot capture what code does not measure. A strong candidate with an unusual background
  can score low. That is why a human reads the explanation and the evidence, not just the number.
- The scoring rules are now a product decision that needs owning and, for hiring, a fairness review.

## Revisit when

Measured agreement with human recruiters is poor and a learned ranker (trained on recruiter
decisions, evaluated against them) beats the rules on held-out data. A model may then propose a
score, with the deterministic one kept as a check.
