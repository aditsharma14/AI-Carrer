module.exports = function buildSkillGapPrompt({ targetRole, gaps, strengths }) {
  return [
    {
      role: 'system',
      content: 'You explain a skill gap analysis that has already been computed. Do not change the gaps or strengths listed.',
    },
    {
      role: 'user',
      content:
        `Target role: ${targetRole}\nGaps: ${gaps.map((g) => g.skill).join(', ') || 'none'}\n` +
        `Strengths: ${strengths.join(', ') || 'none'}\n\nWrite 2-3 encouraging, specific sentences.`,
    },
  ];
};
