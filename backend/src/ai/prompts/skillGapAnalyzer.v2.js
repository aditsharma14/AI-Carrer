const { dataBlock, DATA_RULE } = require('./dataBlock');

// v2: strengths are the user's own resume skills, so they are wrapped as data.
module.exports = function buildSkillGapPrompt({ targetRole, gaps, strengths }) {
  return [
    {
      role: 'system',
      content:
        'You explain a skill gap analysis that has already been computed. Do not change the gaps or strengths listed. ' +
        DATA_RULE,
    },
    {
      role: 'user',
      content:
        dataBlock(
          'candidate_data',
          `Target role: ${targetRole}\nGaps: ${gaps.map((g) => g.skill).join(', ') || 'none'}\n` +
            `Strengths: ${strengths.join(', ') || 'none'}`
        ) + '\n\nWrite 2-3 encouraging, specific sentences.',
    },
  ];
};
