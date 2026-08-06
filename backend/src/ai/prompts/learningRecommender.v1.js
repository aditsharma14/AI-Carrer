module.exports = function buildLearningRecommenderPrompt({ targetRole, gaps, toolResult }) {
  const messages = [
    {
      role: 'system',
      content:
        `You recommend specific, well-known learning resources (courses, docs, books) for a candidate targeting a ${targetRole} role, ` +
        'based only on the skill gaps given. Do not invent resources you are not reasonably confident exist. ' +
        'Respond as JSON: { "items": [{ "title": "...", "provider": "...", "skill": "...", "url": "..." }] }.',
    },
    {
      role: 'user',
      content:
        `Skill gaps, highest priority first: ${gaps.map((g) => `${g.skill} (${g.priority})`).join(', ')}.\n` +
        'Recommend one resource per gap.',
    },
  ];
  if (toolResult) {
    messages.push({
      role: 'system',
      content: `Resources already recommended in a previous session — prefer a different one where reasonable: ${JSON.stringify(toolResult)}`,
    });
  }
  return messages;
};
