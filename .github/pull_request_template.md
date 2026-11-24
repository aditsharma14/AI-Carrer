## What and why

<!-- What changed, and the reason. The diff shows what; this should say why. -->

## How it was checked

- [ ] `cd backend && npm test` and `npm run eval:check`
- [ ] `cd frontend && npm run lint && npm test && npm run build`
- [ ] New behaviour has a test in this PR, and the test fails without the change

## Risk

<!-- Delete the lines that do not apply. -->
- [ ] Touches tenant-scoped data: queries include `orgId`; any `bulkWrite`/`insertMany`/`aggregate` has it by hand (docs/adr/0006)
- [ ] Sends resume, job or transcript text to a model: it goes in a tagged data block, never a system message
- [ ] Changes a prompt's instructions: new version file, and the evaluation was re-run
- [ ] Changes configuration: `.env.example` and `docs/DEPLOYMENT.md` updated
- [ ] Changes a quality metric on purpose: baseline re-recorded and the reason explained

## Notes for the reviewer

<!-- Anything unfinished, a trade-off you made, or something you are unsure about. -->
