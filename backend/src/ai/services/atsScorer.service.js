const aiClient = require('../client/aiClient');
const buildAtsScorerPrompt = require('../prompts/atsScorer.v1');

const STOPWORDS = new Set([
  'the', 'and', 'a', 'to', 'of', 'in', 'for', 'with', 'on', 'is', 'are', 'as', 'an', 'at',
  'by', 'or', 'be', 'that', 'this', 'will', 'we', 'you', 'your', 'our',
]);

function extractKeywords(text) {
  const words = text.toLowerCase().split(/[^a-z0-9+.#]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

// THE deterministic half. This is real code, not a stub — the number this
// produces must be reproducible no matter which AI provider is configured,
// because a score that can vary between two runs of the same resume is
// useless to a user comparing "did my edit help," and because keeping the
// score out of the LLM's hands entirely is the strongest defense against a
// prompt-injection attempt hidden inside resume or job description text
// (see docs/ARCHITECTURE.md §5.2 and §11.5 — the injected text literally
// cannot move a number it was never allowed to compute).
function computeDeterministicScore(structuredData, jobDescription) {
  const resumeText = [
    structuredData.summary,
    structuredData.skills.join(' '),
    structuredData.experience.map((e) => e.description).join(' '),
  ].join(' ');
  const resumeKeywords = new Set(extractKeywords(resumeText));

  let keywordScore;
  let missingKeywords = [];

  if (jobDescription) {
    const jobKeywords = extractKeywords(jobDescription);
    const matched = jobKeywords.filter((k) => resumeKeywords.has(k));
    missingKeywords = jobKeywords.filter((k) => !resumeKeywords.has(k)).slice(0, 10);
    keywordScore = jobKeywords.length ? Math.round((matched.length / jobKeywords.length) * 100) : 100;
  } else {
    // No target job given -> generic ATS ruleset: does the resume contain a
    // reasonable breadth of substantive keywords at all.
    keywordScore = Math.min(100, resumeKeywords.size * 4);
  }

  const formattingChecks = [
    Boolean(structuredData.summary && structuredData.summary.length > 20),
    structuredData.skills.length >= 3,
    structuredData.experience.length >= 1,
    structuredData.experience.every((e) => e.description && e.description.length > 20),
  ];
  const formattingScore = Math.round((formattingChecks.filter(Boolean).length / formattingChecks.length) * 100);

  const sectionsChecks = [
    Boolean(structuredData.summary),
    structuredData.skills.length > 0,
    structuredData.experience.length > 0,
    structuredData.education.length > 0,
  ];
  const sectionsScore = Math.round((sectionsChecks.filter(Boolean).length / sectionsChecks.length) * 100);

  const score = Math.round(keywordScore * 0.5 + formattingScore * 0.3 + sectionsScore * 0.2);

  return {
    score,
    breakdown: [
      { label: 'Keywords', value: keywordScore },
      { label: 'Formatting', value: formattingScore },
      { label: 'Sections', value: sectionsScore },
    ],
    missingKeywords,
  };
}

async function scoreResume({ structuredData, jobDescription }) {
  const deterministic = computeDeterministicScore(structuredData, jobDescription);

  // Failure handling per §5.2: the LLM explanation is allowed to fail
  // without ever blocking the numeric score the user actually cares about.
  let explanation;
  try {
    explanation = await aiClient.complete({
      promptVersion: 'atsScorer.v1',
      messages: buildAtsScorerPrompt(deterministic, jobDescription),
      mock: () =>
        `This resume scores ${deterministic.score}/100. ` +
        (deterministic.missingKeywords.length
          ? `Consider adding: ${deterministic.missingKeywords.join(', ')}.`
          : 'Good keyword coverage for this role.'),
    });
  } catch {
    explanation = 'The score breakdown above is accurate; a written explanation is temporarily unavailable.';
  }

  return { ...deterministic, explanation };
}

module.exports = { scoreResume, computeDeterministicScore };
