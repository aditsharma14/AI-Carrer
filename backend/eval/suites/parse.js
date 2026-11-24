const { mapPool, withRetry } = require('../lib/pool');
const m = require('../lib/metrics');

// Resume text -> structured data. Measures what the product depends on: did we
// find the candidate's real skills, did we avoid claiming ones they said they
// don't have, and did we recover their employers and school.
async function runParse({ resumes, structureResume, concurrency, onProgress }) {
  const rows = await mapPool(resumes, concurrency, async (resume, i) => {
    const started = performance.now();
    let output = null;
    let error = null;
    try {
      output = await withRetry(() => structureResume(resume.text));
    } catch (err) {
      error = err.code || err.name || 'error';
    }
    onProgress?.(i + 1, resumes.length);
    return { resume, output, error, ms: performance.now() - started };
  });

  // A failed parse counts as "found nothing": the user got no skills, which is
  // what the product would have shown them. It is also reported separately.
  const counts = rows.map(({ resume, output }) =>
    m.skillCounts(output?.skills ?? [], resume.gold.skills, resume.gold.hardNegatives)
  );
  const overall = m.microPRF(counts);

  const sumEntity = (pick) =>
    rows.reduce(
      (acc, { resume, output }) => {
        const r = pick(resume, output);
        return { found: acc.found + r.found, total: acc.total + r.total };
      },
      { found: 0, total: 0 }
    );
  const company = sumEntity((resume, out) =>
    m.entityRecall((out?.experience ?? []).map((e) => e.company), resume.gold.experience.map((e) => e.company))
  );
  const school = sumEntity((resume, out) =>
    m.entityRecall((out?.education ?? []).map((e) => e.school), resume.gold.education.map((e) => e.school))
  );

  const perStyle = {};
  for (const style of ['standard', 'compact', 'narrative', 'buried']) {
    const idx = rows.map((r, i) => (r.resume.style === style ? i : -1)).filter((i) => i >= 0);
    if (idx.length) perStyle[style] = { n: idx.length, f1: m.microPRF(idx.map((i) => counts[i])).f1 };
  }

  // Skills claimed on resumes that state (almost) none: pure hallucination.
  const nonTech = rows.filter((r) => ['chef', 'accountant', 'teacher', 'sales'].includes(r.resume.archetype));
  const spurious = nonTech.map((r) => m.skillCounts(r.output?.skills ?? [], r.resume.gold.skills, []).fp);

  const failures = rows.filter((r) => r.error);
  const errorCodes = {};
  for (const f of failures) errorCodes[f.error] = (errorCodes[f.error] || 0) + 1;

  const ms = rows.map((r) => r.ms);
  return {
    metrics: {
      n: rows.length,
      skillPrecision: overall.precision,
      skillRecall: overall.recall,
      skillF1: overall.f1,
      trapFalsePositiveRate: m.trapFalsePositiveRate(counts),
      companyRecall: company.total ? company.found / company.total : 0,
      schoolRecall: school.total ? school.found / school.total : 0,
      failureRate: failures.length / rows.length,
      spuriousSkillsPerNonTechResume: m.mean(spurious),
      latencyP50Ms: m.percentile(ms, 50),
      latencyP95Ms: m.percentile(ms, 95),
    },
    perStyle,
    errorCodes,
  };
}

module.exports = { runParse };
