const { dataBlock, DATA_RULE } = require('./dataBlock');

// v2: retrieved context and tool results moved out of system messages into
// the user turn as tagged data. In v1 they were role:'system', which gave
// resume text the same authority as our own instructions.
//
// retrievedContext comes from ai/rag/retriever.js — already-ranked chunks
// from THIS user's own resume and conversation history.
module.exports = function buildCareerCoachPrompt({ message, history = [], retrievedContext = [], toolResult }) {
  const contextBlock = retrievedContext.length
    ? dataBlock('context', retrievedContext.map((c) => c.text).join('\n---\n'))
    : '(no relevant context retrieved for this question)';

  const finalUserTurn = [
    'Background retrieved for this question:',
    contextBlock,
    toolResult ? `Result of the tool you called:\n${dataBlock('tool_result', toolResult)}` : null,
    `Question: ${message}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    {
      role: 'system',
      content:
        'You are a career coach. Ground every answer in the background provided — never give generic advice when ' +
        'specific resume or skill-gap data is available. Give one or two concrete next steps. ' +
        DATA_RULE,
    },
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: finalUserTurn },
  ];
};
