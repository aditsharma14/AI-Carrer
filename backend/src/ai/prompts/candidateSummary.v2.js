const { dataBlock, DATA_RULE } = require('./dataBlock');

// v2: the getFullResume tool result goes in as tagged user data instead of a
// system message (it is the candidate's own resume — untrusted text).
module.exports = function buildCandidateSummaryPrompt({ candidateProfile, matchResult, toolResult }) {
  const parts = [
    dataBlock(
      'candidate_data',
      `Name: ${candidateProfile.name}\nMatch score: ${matchResult.score}%\n` +
        `Matched skills: ${matchResult.matchedSkills.join(', ') || 'none'}\nGaps: ${matchResult.gapSkills.join(', ') || 'none'}`
    ),
  ];
  if (toolResult) parts.push(`Full resume from the tool you called:\n${dataBlock('tool_result', toolResult)}`);
  parts.push('Write 3-5 sentences: fit, strengths, and any evidence-based gaps.');

  return [
    {
      role: 'system',
      content:
        'You write evidence-based recruiter-facing candidate summaries. Flag only concerns backed by the data given — ' +
        'never speculate about protected characteristics (age, gender, ethnicity, etc.) or anything not in the data. ' +
        DATA_RULE,
    },
    { role: 'user', content: parts.join('\n\n') },
  ];
};
