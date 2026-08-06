const { runAgentStep } = require('./agentOrchestrator');
const learningRecommenderService = require('../services/learningRecommender.service');
const learningRepository = require('../../modules/learning/learning.repository');

// One tool: the user's previously recommended resources, so a real provider
// can avoid suggesting the exact same course twice in a row when the user
// regenerates recommendations. Same shape as every other agent's tools here —
// a repository read we already own.
function buildTools(orgId, userId) {
  return {
    getPreviousRecommendations: async () => {
      const previous = await learningRepository.findLatestByUser(orgId, userId);
      return previous ? previous.items.map((item) => item.title) : { message: 'No previous recommendations' };
    },
  };
}

async function recommend({ orgId, userId, targetRole, gaps }) {
  const { reply } = await runAgentStep({
    promptVersion: 'learningRecommender.v1',
    buildMessages: (toolResult) => learningRecommenderService.buildMessages({ targetRole, gaps, toolResult }),
    tools: buildTools(orgId, userId),
    mock: () => learningRecommenderService.mockReply({ gaps }),
  });
  return reply;
}

module.exports = { recommend };
