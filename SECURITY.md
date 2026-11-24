# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately through GitHub: the repository's **Security** tab > **Report a vulnerability**
(private vulnerability reporting). Include what you found, how to reproduce it, and what an attacker
could do with it. You will get an acknowledgement, and the issue will be handled before it is
discussed publicly.

## What counts

Of particular interest, because this product handles hiring data:

- one organisation reading or changing another organisation's data (tenant isolation)
- bypassing sign-in, roles, or rate limits
- resume or job text that makes the AI parser or matcher do something it should not
  (prompt injection) and the effect on a candidate's profile or ranking
- exposure of resume contents, tokens or secrets in logs, responses or emails
- anything reachable without being signed in that should not be

## Defenses already in place

So you can judge a report against them; see `docs/adr/` for the reasoning:

- every query is tenant-scoped, and unscoped queries throw (`docs/adr/0006`)
- resume text is treated as attacker input: instruction-like sentences are removed before the model
  sees them, the prompt names the attacks, and returned skills must be stated in the text
  (`docs/adr/0004`). Known gaps are listed there and pinned by tests
- refresh tokens live in an `httpOnly` cookie (`Secure` in production); passwords are hashed with bcrypt
- uploads are limited to 5 MB and identified by content, not by file name
- production dependencies are audited in CI and fail the build on high-severity findings; code is
  scanned with CodeQL

## Supported versions

Only the latest commit on `main` is supported.
