#!/usr/bin/env node
// AI accuracy evaluation. Scores the real parsing and matching code paths on
// the labeled dataset in eval/data and reports quality, latency and token use.
//
//   npm run eval                                 (uses AI_PROVIDER from .env)
//   npm run eval -- --provider groq --embedding huggingface
//   npm run eval -- --provider ollama --embedding ollama --limit 10
//   npm run eval:check                           (stub run vs committed baseline)
//
// See eval/README.md for what each metric means and its limits.
const fs = require('node:fs');
const path = require('node:path');

const FLAGS_WITH_VALUE = ['provider', 'embedding', 'model', 'embedding-model', 'suites', 'limit', 'jobs', 'concurrency', 'tolerance', 'price-in', 'price-out'];
const FLAGS_BOOLEAN = ['check', 'write-baseline', 'help'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, '');
    if (FLAGS_BOOLEAN.includes(name)) args[name] = true;
    else if (FLAGS_WITH_VALUE.includes(name)) args[name] = argv[++i];
    else throw new Error(`Unknown option: ${argv[i]} (try --help)`);
  }
  return args;
}

const HELP = `Usage: npm run eval -- [options]

  --provider <stub|groq|huggingface|ollama>   chat provider (default: AI_PROVIDER or stub)
  --embedding <stub|huggingface|ollama>       embedding provider (default: EMBEDDING_PROVIDER or stub)
  --model <id>  --embedding-model <id>        override the default models
  --suites <parse,match,injection>            which suites to run (default: all)
  --limit <n>        parse only the first n resumes   (quick/cheap run; disables --check)
  --jobs <n>         match only the first n jobs      (quick/cheap run; disables --check)
  --concurrency <n>  parallel parse calls (default 1; free tiers rate-limit)
  --check            fail (exit 1) if a metric is worse than the committed baseline
  --write-baseline   save this run as the committed baseline for this provider/model
  --tolerance <x>    allowed drop per metric for --check (default 0.03; 0 for stub)
  --price-in <usd> --price-out <usd>   price per 1M tokens, to report cost per 1,000 resumes
`;

// Metrics that gate a merge: [suite, metric, which direction is better].
const GATED = [
  ['parse', 'skillF1', 'higher'],
  ['parse', 'skillPrecision', 'higher'],
  ['parse', 'skillRecall', 'higher'],
  ['parse', 'trapFalsePositiveRate', 'lower'],
  ['parse', 'companyRecall', 'higher'],
  ['parse', 'schoolRecall', 'higher'],
  ['parse', 'failureRate', 'lower'],
  ['match', 'ndcg10', 'higher'],
  ['match', 'mrr', 'higher'],
  ['match', 'precision5', 'higher'],
  ['injection', 'attackSuccessRate', 'lower'],
];

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const num = (x, d = 3) => (typeof x === 'number' ? x.toFixed(d) : String(x));
const ms = (x) => `${Math.round(x)} ms`;

function table(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => `| ${cells.map((c, i) => String(c).padEnd(widths[i])).join(' | ')} |`;
  return [line(headers), `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`, ...rows.map(line)].join('\n');
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, '_').replace(/^_|_$/g, '');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);

  const partial = args.limit !== undefined || args.jobs !== undefined;
  if (partial && (args.check || args['write-baseline'])) {
    throw new Error('--limit/--jobs run a subset, so they cannot be checked against or saved as a baseline');
  }

  // Flags must be applied BEFORE the app config is loaded (it reads the
  // environment once at import). Flags beat .env because dotenv never
  // overrides a variable that is already set.
  process.env.MONGODB_URI ||= 'mongodb://eval.invalid/eval';
  process.env.JWT_ACCESS_SECRET ||= 'eval';
  process.env.JWT_REFRESH_SECRET ||= 'eval';
  process.env.LOG_LEVEL ||= 'error';
  if (args.provider) process.env.AI_PROVIDER = args.provider;
  if (args.embedding) process.env.EMBEDDING_PROVIDER = args.embedding;
  if (args.model) process.env.AI_MODEL = args.model;
  if (args['embedding-model']) process.env.EMBEDDING_MODEL = args['embedding-model'];

  const env = require('../src/config/env');
  const aiClient = require('../src/ai/client/aiClient');
  const { structureResume } = require('../src/ai/services/resumeParser.service');
  const { scoreApplications } = require('../src/ai/services/jobMatcher.service');
  const { runParse } = require('./suites/parse');
  const { runMatch } = require('./suites/match');
  const { runInjection } = require('./suites/injection');

  const read = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', `${name}.json`), 'utf8'));
  const data = { resumes: read('resumes'), jobs: read('jobs'), relevance: read('relevance'), injections: read('injections') };

  const provider = env.ai.provider;
  const embedding = env.ai.embeddingProvider;
  const chatModel = provider === 'stub' ? 'stub' : env.ai.modelFor(provider);
  const embedModel = embedding === 'stub' ? 'stub' : env.ai.embeddingModelFor(embedding);
  const key = [provider, chatModel, embedding, embedModel].map(slug).join('__');

  const suites = (args.suites || 'parse,match,injection').split(',');
  const concurrency = Number(args.concurrency || 1);
  const progress = (label) => (i, n) => {
    if (process.stderr.isTTY) process.stderr.write(`\r${label} ${i}/${n}   `);
  };

  const resumes = args.limit ? data.resumes.slice(0, Number(args.limit)) : data.resumes;
  const jobs = args.jobs ? data.jobs.slice(0, Number(args.jobs)) : data.jobs;

  console.log(`\nEvaluating  chat: ${provider} (${chatModel})   embeddings: ${embedding} (${embedModel})`);
  console.log(`Dataset     ${resumes.length} resumes, ${jobs.length} jobs, ${data.injections.length} injection cases\n`);

  const report = { meta: { date: new Date().toISOString(), provider, chatModel, embedding, embedModel, key, partial }, usage: {} };
  const snapshot = () => {
    const s = aiClient.getStats();
    return { calls: s.calls, errors: s.errors, outputErrors: s.outputErrors, repaired: s.repaired, tokensIn: s.tokensIn, tokensOut: s.tokensOut };
  };

  if (suites.includes('parse')) {
    aiClient.resetStats();
    report.parse = await runParse({ resumes, structureResume, concurrency, onProgress: progress('parsing') });
    report.usage.parse = snapshot();
  }
  if (suites.includes('match')) {
    aiClient.resetStats();
    report.match = await runMatch({ resumes: data.resumes, jobs, relevance: data.relevance, scoreApplications, onProgress: progress('matching') });
    report.usage.match = snapshot();
  }
  if (suites.includes('injection')) {
    aiClient.resetStats();
    report.injection = await runInjection({ injections: data.injections, structureResume });
    report.usage.injection = snapshot();
  }
  if (process.stderr.isTTY) process.stderr.write('\r'.padEnd(40) + '\r');

  printReport(report, args);

  const resultsDir = path.join(__dirname, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const file = path.join(resultsDir, `${report.meta.date.replace(/[:.]/g, '-')}__${key}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nFull results: ${path.relative(process.cwd(), file)}`);

  const baselineFile = path.join(__dirname, 'baselines', `${key}.json`);
  if (args['write-baseline']) {
    fs.mkdirSync(path.dirname(baselineFile), { recursive: true });
    fs.writeFileSync(baselineFile, `${JSON.stringify(toBaseline(report), null, 2)}\n`);
    console.log(`Baseline written: ${path.relative(process.cwd(), baselineFile)}`);
  }
  if (args.check) process.exitCode = checkAgainstBaseline(report, baselineFile, args, provider === 'stub');
}

// What a baseline stores: just the gated metric values (no timings, which
// vary by machine) plus how it was produced.
function toBaseline(report) {
  const metrics = {};
  for (const [suite, metric] of GATED) {
    if (report[suite]) metrics[`${suite}.${metric}`] = report[suite].metrics[metric];
  }
  return { ...report.meta, partial: undefined, date: undefined, metrics };
}

function checkAgainstBaseline(report, baselineFile, args, isStub) {
  if (!fs.existsSync(baselineFile)) {
    console.error(`\nNo baseline for this configuration (${path.basename(baselineFile)}). Create one with --write-baseline.`);
    return 2;
  }
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  // The stub is deterministic, so any change at all is a real code change.
  const tolerance = args.tolerance !== undefined ? Number(args.tolerance) : isStub ? 1e-9 : 0.03;

  const rows = [];
  let regressions = 0;
  for (const [suite, metric, better] of GATED) {
    const base = baseline.metrics[`${suite}.${metric}`];
    if (!report[suite] || base === undefined) continue;
    const current = report[suite].metrics[metric];
    const delta = current - base;
    const worse = better === 'higher' ? delta < -tolerance : delta > tolerance;
    if (worse) regressions += 1;
    rows.push([`${suite}.${metric}`, num(base), num(current), `${delta >= 0 ? '+' : ''}${num(delta)}`, worse ? 'REGRESSED' : 'ok']);
  }

  console.log(`\nBaseline check (tolerance ${tolerance}):`);
  console.log(table(['metric', 'baseline', 'current', 'change', 'status'], rows));
  if (regressions > 0) {
    console.error(`\n${regressions} metric(s) regressed. If the change is intended, re-run with --write-baseline and commit the new baseline.`);
    return 1;
  }
  console.log('\nNo regressions.');
  return 0;
}

function printReport(report, args) {
  if (report.parse) {
    const p = report.parse.metrics;
    console.log('## Resume parsing');
    console.log(table(['metric', 'value'], [
      ['skill F1', num(p.skillF1)],
      ['skill precision', num(p.skillPrecision)],
      ['skill recall', num(p.skillRecall)],
      ['claimed a skill the resume denies (lower is better)', pct(p.trapFalsePositiveRate)],
      ['spurious skills per non-technical resume', num(p.spuriousSkillsPerNonTechResume, 2)],
      ['employer recall', pct(p.companyRecall)],
      ['school recall', pct(p.schoolRecall)],
      ['failed parses', pct(p.failureRate)],
      ['latency p50 / p95', `${ms(p.latencyP50Ms)} / ${ms(p.latencyP95Ms)}`],
    ]));
    console.log('\nSkill F1 by resume layout:');
    console.log(table(['layout', 'resumes', 'F1'], Object.entries(report.parse.perStyle).map(([s, v]) => [s, v.n, num(v.f1)])));
    if (Object.keys(report.parse.errorCodes).length) console.log('\nErrors:', JSON.stringify(report.parse.errorCodes));

    const u = report.usage.parse;
    const lines = [`${u.calls} calls, ${u.tokensIn} tokens in, ${u.tokensOut} tokens out, ${u.repaired} needed the JSON repair retry, ${u.outputErrors} invalid outputs`];
    if (args['price-in'] !== undefined && args['price-out'] !== undefined && p.n) {
      const usd = ((u.tokensIn * Number(args['price-in']) + u.tokensOut * Number(args['price-out'])) / 1e6 / p.n) * 1000;
      lines.push(`estimated cost: $${usd.toFixed(3)} per 1,000 resumes parsed`);
    }
    console.log(`\nUsage: ${lines.join('; ')}\n`);
  }

  if (report.match) {
    const s = report.match.metrics;
    const b = report.match.baselines;
    console.log('## Candidate-to-job ranking');
    const row = (name, x) => [name, num(x.ndcg5), num(x.ndcg10), num(x.mrr), num(x.precision5)];
    console.log(table(['ranker', 'NDCG@5', 'NDCG@10', 'MRR', 'precision@5'], [
      row('this system (embeddings)', s),
      row('tf-idf baseline', b.tfidf),
      row('keyword baseline', b.keyword),
      row('random', b.random),
    ]));
    console.log(`\n${s.jobs} jobs ranked against every resume; ${s.failedJobs} failed; ${ms(s.latencyPerJobMs)} per job`);
    if (Object.keys(report.match.errorCodes).length) console.log('Errors:', JSON.stringify(report.match.errorCodes));
    if (report.meta.embedding === 'stub') console.log('NOTE: stub embeddings carry no meaning, so this row is expected to sit near random.');
    console.log();
  }

  if (report.injection) {
    const i = report.injection.metrics;
    console.log('## Prompt injection');
    console.log(`${i.cases} attack payloads; attack success rate ${pct(i.attackSuccessRate)} (lower is better)` +
      (i.errored ? `; ${i.errored} errored` : '') +
      (report.injection.succeeded.length ? `\nSucceeded: ${report.injection.succeeded.join(', ')}` : ''));
    if (report.meta.provider === 'stub') console.log('NOTE: the stub parser cannot be steered, so 0% here is not evidence of robustness.');
  }
}

main().catch((err) => {
  console.error(`\neval failed: ${err.message}`);
  process.exit(1);
});
