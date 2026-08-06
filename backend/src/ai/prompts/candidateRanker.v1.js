// Ranking itself is a deterministic sort by score (candidateRanker.service.js
// never calls an LLM for the sort). This prompt only powers the optional
// "explain why A ranked above B" call a recruiter can request on demand.
module.exports = function buildCandidateRankerPrompt(candidateA, candidateB) {
  return [
    {
      role: 'system',
      content:
        'You explain, in one sentence, why one candidate ranked above another, using only the scores and skills given. ' +
        'Never speculate about anything not in the data.',
    },
    {
      role: 'user',
      content:
        `Candidate A — score ${candidateA.score}%, matched: ${candidateA.matchedSkills.join(', ') || 'none'}\n` +
        `Candidate B — score ${candidateB.score}%, matched: ${candidateB.matchedSkills.join(', ') || 'none'}\n\n` +
        'Which ranked higher and why, in one sentence?',
    },
  ];
};
