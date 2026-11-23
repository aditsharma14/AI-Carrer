const { dataBlock, DATA_RULE } = require('./dataBlock');

// v2: output shape is enforced by ai/schemas.js (structured outputs), so the
// inline JSON example is gone; previous recommendations come back as tagged
// user data, not a system message.
module.exports = function buildLearningRecommenderPrompt({ targetRole, gaps, toolResult }) {
  const parts = [
    dataBlock('skill_gaps', gaps.map((g) => `${g.skill} (${g.priority})`).join(', ')),
    'Recommend one resource per gap, highest priority first. Set url to null if you are not certain of the exact URL.',
  ];
  if (toolResult) {
    parts.push(
      `Resources already recommended in a previous session — prefer a different one where reasonable:\n${dataBlock('tool_result', toolResult)}`
    );
  }

  return [
    {
      role: 'system',
      content:
        `You recommend specific, well-known learning resources (courses, docs, books) for a candidate targeting a ${targetRole} role, ` +
        'based only on the skill gaps given. Do not invent resources you are not reasonably confident exist. ' +
        DATA_RULE,
    },
    { role: 'user', content: parts.join('\n\n') },
  ];
};
