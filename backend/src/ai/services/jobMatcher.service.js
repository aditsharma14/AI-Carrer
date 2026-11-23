const aiClient = require('../client/aiClient');
const { cosineSimilarity } = require('../rag/embeddings');
const buildJobMatcherPrompt = require('../prompts/jobMatcher.v2');

// Same shortlist size used throughout the cost-control pattern described in
// docs/ARCHITECTURE.md §5.2/§12: cheap filter runs over everyone, expensive
// step runs only over a small shortlist.
const SHORTLIST_SIZE = 20;
const EXPLAIN_TOP_N = 3;

function normalize(skill) {
  return skill.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function diffSkills(resumeSkills, jobSkills) {
  const normalizedResumeSkills = new Set(resumeSkills.map(normalize));
  const matchedSkills = jobSkills.filter((skill) => normalizedResumeSkills.has(normalize(skill)));
  const gapSkills = jobSkills.filter((skill) => !normalizedResumeSkills.has(normalize(skill)));
  return { matchedSkills, gapSkills };
}

// Single-candidate score — used for the seeker's own "how do I match this
// job" preview (one job, one resume, cheap enough to run synchronously).
async function matchResumeToJob({ jobTitle, jobDescription, jobSkills, resumeText, resumeSkills }) {
  const [jobVector, resumeVector] = await Promise.all([
    aiClient.embed(jobDescription, { inputType: 'query' }),
    aiClient.embed(resumeText, { inputType: 'document' }),
  ]);
  const similarity = cosineSimilarity(jobVector, resumeVector);
  const { matchedSkills, gapSkills } = diffSkills(resumeSkills, jobSkills);
  const score = Math.round(similarity * 100);

  return { score, matchedSkills, gapSkills, jobTitle };
}

// Batch path — used by jobMatching.processor.js when a recruiter triggers
// matching on a job with many applications.
//
// Stage 1 (cheap): embed every application's resume text, score by cosine
// similarity to the job description. This runs over the WHOLE applicant pool.
// Stage 2 (cheap, still deterministic): keyword-overlap matched/gap skills,
// also over the whole pool — reliable and free, no reason to gate this behind
// a shortlist.
// Stage 3 (the only LLM call, and only for the top N): a one-sentence
// "why this matched" blurb, generated for the highest-scoring few candidates
// only — this is the actual cost-controlled step.
async function matchApplicationsToJob({ jobTitle, jobDescription, jobSkills, applications }) {
  // One batched embedding call for the whole applicant pool, not N calls.
  const [jobVector, resumeVectors] = await Promise.all([
    aiClient.embed(jobDescription, { inputType: 'query' }),
    aiClient.embedMany(
      applications.map((app) => app.resumeText),
      { inputType: 'document' }
    ),
  ]);

  const scored = applications.map((app, i) => {
    const similarity = cosineSimilarity(jobVector, resumeVectors[i]);
    const { matchedSkills, gapSkills } = diffSkills(app.resumeSkills, jobSkills);
    return { applicationId: app.applicationId, score: Math.round(similarity * 100), matchedSkills, gapSkills };
  });

  const ranked = scored.sort((a, b) => b.score - a.score);
  const shortlist = ranked.slice(0, Math.min(SHORTLIST_SIZE, ranked.length));

  for (const candidate of shortlist.slice(0, EXPLAIN_TOP_N)) {
    try {
      candidate.explanation = await aiClient.complete({
        promptVersion: 'jobMatcher.v2',
        messages: buildJobMatcherPrompt({ jobTitle, ...candidate }),
        mock: () =>
          `Matches ${candidate.score}% on this role, with strength in ${candidate.matchedSkills.slice(0, 2).join(' and ') || 'their listed skills'}.`,
      });
    } catch {
      candidate.explanation = null; // never block the score on the explanation failing
    }
  }

  return ranked;
}

module.exports = { matchResumeToJob, matchApplicationsToJob };
