const aiClient = require('../client/aiClient');
const buildCandidateRankerPrompt = require('../prompts/candidateRanker.v2');

// Deterministic re-sort, not an LLM call — see docs/ARCHITECTURE.md §5.2:
// "ranking is a comparator function, not an AI problem" once every
// candidate's score already exists (jobMatcher.service.js computed those).
function rankByScore(matchResults) {
  return [...matchResults].sort((a, b) => b.score - a.score).map((result, index) => ({ ...result, rank: index + 1 }));
}

// The one optional LLM call in this service — a recruiter explicitly asking
// "why did A rank above B," never run automatically over a full list.
async function explainRanking(candidateA, candidateB) {
  return aiClient.complete({
    promptVersion: 'candidateRanker.v2',
    messages: buildCandidateRankerPrompt(candidateA, candidateB),
    mock: () => {
      const [higher, lower] = candidateA.score >= candidateB.score ? ['A', 'B'] : ['B', 'A'];
      const higherScore = Math.max(candidateA.score, candidateB.score);
      const lowerScore = Math.min(candidateA.score, candidateB.score);
      return `Candidate ${higher} ranked higher with a ${higherScore}% match versus ${lowerScore}%.`;
    },
  });
}

module.exports = { rankByScore, explainRanking };
