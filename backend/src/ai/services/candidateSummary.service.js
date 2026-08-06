const buildCandidateSummaryPrompt = require('../prompts/candidateSummary.v1');

// Single-call building block, same split as careerCoach.service.js —
// hiringAgent.js owns deciding whether it needs the candidate's full resume
// before summarizing; this file only knows how to build one prompt and one
// stub reply from whatever it's handed.
function buildMessages({ candidateProfile, matchResult, toolResult }) {
  return buildCandidateSummaryPrompt({ candidateProfile, matchResult, toolResult });
}

function mockReply({ candidateProfile, matchResult }) {
  const strengths = matchResult.matchedSkills.slice(0, 2).join(' and ') || 'their core skills';
  const gapsText = matchResult.gapSkills.length
    ? ` They don't yet show experience with ${matchResult.gapSkills.slice(0, 2).join(' and ')}.`
    : '';

  return {
    reply: `${candidateProfile.name} matches ${matchResult.score}% of this role's requirements, with strong alignment in ${strengths}.${gapsText}`,
    toolCall: null,
  };
}

module.exports = { buildMessages, mockReply };
