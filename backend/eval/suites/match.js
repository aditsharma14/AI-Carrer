const { baselines } = require('../lib/baselines');
const { withRetry } = require('../lib/pool');
const m = require('../lib/metrics');

// For each job, rank every resume and compare the ranking with the labeled
// relevance. The system under test is the production scorer (embedding cosine
// similarity); baselines run on the same candidates for context.
function summarise(perJob) {
  const ok = (key) => perJob.map((j) => j[key]).filter((v) => v !== null);
  return {
    ndcg5: m.mean(ok('ndcg5')),
    ndcg10: m.mean(ok('ndcg10')),
    mrr: m.mean(ok('mrr')),
    precision5: m.mean(ok('precision5')),
  };
}

function score(rankedIds, grades) {
  const ranked = rankedIds.map((id) => grades[id]);
  return {
    ndcg5: m.ndcg(ranked, 5),
    ndcg10: m.ndcg(ranked, 10),
    mrr: m.reciprocalRank(ranked),
    precision5: m.precisionAtK(ranked, 5),
  };
}

async function runMatch({ resumes, jobs, relevance, scoreApplications, onProgress }) {
  const applications = resumes.map((r) => ({ applicationId: r.id, resumeText: r.text, resumeSkills: [] }));
  const perJob = { system: [], random: [], keyword: [], tfidf: [] };
  const started = performance.now();
  let failed = 0;
  const errorCodes = {};

  for (const [i, job] of jobs.entries()) {
    const grades = relevance[job.id];
    try {
      const scored = await withRetry(() =>
        scoreApplications({ jobDescription: job.description, jobSkills: job.requiredSkills, applications })
      );
      const order = m.rankBy(scored.map((s) => ({ id: s.applicationId, s: s.similarity })), (x) => x.s).map((x) => x.id);
      perJob.system.push(score(order, grades));
    } catch (err) {
      failed += 1;
      const code = err.code || err.name || 'error';
      errorCodes[code] = (errorCodes[code] || 0) + 1;
    }
    for (const [name, fn] of Object.entries(baselines)) {
      const s = fn(job, resumes);
      perJob[name].push(score(m.rankBy(resumes.map((r) => ({ id: r.id })), (x) => s[x.id]).map((x) => x.id), grades));
    }
    onProgress?.(i + 1, jobs.length);
  }

  return {
    metrics: {
      jobs: jobs.length,
      failedJobs: failed,
      ...summarise(perJob.system),
      latencyPerJobMs: (performance.now() - started) / jobs.length,
    },
    baselines: {
      random: summarise(perJob.random),
      keyword: summarise(perJob.keyword),
      tfidf: summarise(perJob.tfidf),
    },
    errorCodes,
  };
}

module.exports = { runMatch };
