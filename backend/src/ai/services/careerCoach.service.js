const buildCareerCoachPrompt = require('../prompts/careerCoach.v1');

// The single-call building block. No loop, no tools, no RAG fetching here —
// careerCoachAgent.js owns all of that and calls into this file for just
// "build the messages for this turn" / "what would a stub reply look like."
function buildMessages({ message, history, retrievedContext, toolResult }) {
  return buildCareerCoachPrompt({ message, history, retrievedContext, toolResult });
}

function mockReply({ message, retrievedContext }) {
  const topChunk = retrievedContext?.[0];
  const grounding = topChunk
    ? ` Looking at your background, I can see: "${topChunk.text.slice(0, 120)}" — let's build on that.`
    : '';

  return {
    reply: `Thanks for sharing that.${grounding} A concrete next step related to "${message}" would be worth trying this week.`,
    toolCall: null,
  };
}

module.exports = { buildMessages, mockReply };
