# AI accuracy evaluation

Measures how well the platform's AI features work, on a labeled dataset, and
fails a build when quality drops. It runs the real production code
(`structureResume` for parsing, `scoreApplications` for ranking), so a number
here is a number about the product.

```bash
cd backend
npm run eval:check                                   # stub vs the committed baseline (what CI runs)
npm run eval -- --provider ollama --embedding ollama # your local models
npm run eval -- --provider groq --embedding huggingface --concurrency 2
npm run eval -- --provider groq --embedding huggingface --price-in 0.59 --price-out 0.79
npm run eval -- --help
```

Output is a report plus a JSON file in `eval/results/` (git-ignored).

## What it measures

| Suite | Question | Headline metrics |
| --- | --- | --- |
| **Parsing** | Given resume text, does the structured output contain the candidate's real skills, employers and school, and avoid claiming skills they deny? | skill precision / recall / F1, *claimed a denied skill* rate, employer and school recall, failed parses, p50/p95 latency, F1 per layout |
| **Ranking** | For each job, are the best candidates ranked first? | NDCG@5, NDCG@10, MRR, precision@5, shown next to three baselines |
| **Injection** | Does text hidden in a resume steer the parser? | attack success rate over 6 payloads |

It also reports tokens used, how many calls needed the JSON repair retry, how
many outputs failed schema validation, and (with `--price-in/--price-out`) cost
per 1,000 resumes.

### How to read the ranking table

A model only deserves credit for what it adds over simple methods, so the same
candidates are ranked by:

- **random**: a seeded shuffle, the floor
- **keyword**: share of the job's required skills named anywhere in the text,
  like a basic applicant-tracking filter
- **tf-idf**: classic information-retrieval similarity

If "this system" does not beat tf-idf and keyword, embeddings are not earning
their cost. **Decoys** are what make this test hard: 12 resumes name every skill
a job requires but only to say they *don't* have it ("never worked with
Docker"). A word-counting ranker puts them first.

## Prompt-injection defenses (what the injection suite tests)

A resume is written by the person being evaluated, so it is attacker-controlled
input. Resume parsing therefore applies three layers, in this order
(`ai/services/resumeParser.service.js`):

| Layer | What it does | Catches | Misses |
| --- | --- | --- | --- |
| **1. Scanner** (`ai/security/injectionGuard.js`) | Removes sentences that read as instructions to an AI *before* the model sees them; flags the resume | Known English phrasing: "ignore previous instructions", `SYSTEM:`, "note to AI", "append X to the summary", `</resume>` break-outs | Paraphrases and other languages (kept in the data as `knownGap` payloads, pinned by a test) |
| **2. Prompt** (`resumeParser.v2`) | Names the attacks, defines a claimed skill, repeats the rule after the resume | Whatever the model can be told to resist; model-dependent | Anything a weak model still obeys |
| **3. Output grounding** (`ai/security/grounding.js`) | Drops any returned skill the resume text does not state | Injected or hallucinated skills, even if layers 1 and 2 missed the attack | Attacks that only change prose such as the summary |

A flagged resume is stored with its report (`ResumeVersion.security`) and the
candidate detail response exposes `resumeFlagged` and `flagReasons`.

What the suite reports is the end-to-end attack success rate, which cannot tell
which layer stopped an attack. The two `knownGap` payloads are the useful
probe: the scanner cannot see them, so anything that stops them is the prompt,
the model or grounding.

## The dataset

`eval/data/` holds 73 resumes, 14 jobs, 1,022 graded relevance labels (0-3) and
6 injection cases, generated from seed 1337 by `eval/lib/dataset.js`
(`npm run eval:data` regenerates it). Traps it contains:

- skill aliases ("JS", "Postgres", "K8s", "sklearn")
- skills mentioned only to deny them (40+ resumes), including the decoys
- four layouts: standard sections, compact pipes, prose with no skills section,
  skills stated only inside experience bullets
- three seniority levels, ten technical roles, eight non-technical resumes
- a taxonomy of 50 skills with aliases (`eval/lib/taxonomy.js`)

Tests (`test/evalDataset.test.js`) protect the labels: every claimed skill is
stated in the text, no skill appears unlabeled, hard negatives occur only in
non-claiming sentences, decoys fit no job, and the committed files equal what
the generator produces.

## Limits: read before quoting a number

- **The data is synthetic.** Real resumes are personal data and cannot be
  committed. Every label is correct by construction, but scores measure how a
  model copes with these traps, **not** its accuracy on real resumes. Use the
  numbers to compare models and catch regressions. To claim an absolute accuracy,
  add anonymised real resumes labeled independently by two people and report
  agreement between them.
- **Relevance labels are a rule**, not recruiter judgment: role family plus
  skill coverage. NDCG measures agreement with that rubric.
- **The parsing set is small** (73 resumes): differences under about 0.03 F1
  are within noise, which is why `--check` tolerates 0.03 for real models.
- **Six injection payloads are a smoke test**, not a security audit.
- **The stub numbers are the floor**, not a result: its parser is a keyword
  list and its embeddings carry no meaning. The committed stub baseline exists
  so a code change that moves a score is noticed.

## Regression gate

```bash
npm run eval -- --provider groq --embedding huggingface --write-baseline   # record
npm run eval -- --provider groq --embedding huggingface --check            # compare
```

A baseline is stored per provider, model and embedding combination in
`eval/baselines/`. `--check` exits 1 if any of 11 metrics is worse by more than
the tolerance, and exits 2 if there is no baseline (it never passes silently).
`--limit` and `--jobs` run a subset and therefore cannot be checked or saved.

CI runs `npm run eval:check` on the stub (deterministic, no keys). To gate a
real model, record its baseline and run the manual workflow in
`.github/workflows/eval.yml` with your API keys as repository secrets.

## Adding to it

- A new trap: add it to `eval/lib/dataset.js`, regenerate, and add an integrity
  test. Re-record baselines, since the data changed.
- A new skill: add it to `eval/lib/taxonomy.js` with its aliases.
- A new metric: add the formula to `eval/lib/metrics.js` with a hand-checked test.
