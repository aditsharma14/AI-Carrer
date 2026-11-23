const { dataBlock, DATA_RULE } = require('./dataBlock');

// Evaluates a FINISHED transcript — this agent never picks the next
// question (the questions are already fixed by interviewGenerator.service.js
// up front); its only job is grading the whole conversation once it's over.
//
// v2: output shape enforced by ai/schemas.js; candidate background from the
// tool comes back as tagged user data, not a system message.
module.exports = function buildMockInterviewAgentPrompt({ targetRole, transcript, toolResult }) {
  const qaPairs = [];
  for (let i = 0; i < transcript.length; i += 2) {
    qaPairs.push({ question: transcript[i]?.text, answer: transcript[i + 1]?.text });
  }

  const parts = [dataBlock('transcript', qaPairs)];
  if (toolResult) parts.push(`Candidate background from the tool you called:\n${dataBlock('tool_result', toolResult)}`);
  parts.push('Score each question from 0 to 100 and list strengths and improvements.');

  return [
    {
      role: 'system',
      content:
        `You evaluate a finished mock interview for a ${targetRole} role. ` +
        'Be specific and evidence-based — every strength, improvement, and score must trace back to something the candidate actually said. ' +
        DATA_RULE,
    },
    { role: 'user', content: parts.join('\n\n') },
  ];
};
