const { runAgentStep } = require('./agentOrchestrator');
const candidateSummaryService = require('../services/candidateSummary.service');
const resumeRepository = require('../../modules/resumes/resume.repository');

// One tool: fetch the candidate's full structured resume if the model
// decides the match score/skills alone aren't enough to summarize well.
// Same shape as careerCoachAgent.js's tools — a repository read we already
// own, not an external API.
function buildTools(candidateOrgId, resumeId) {
  return {
    getFullResume: async () => {
      const resume = await resumeRepository.findByIdScoped(candidateOrgId, resumeId);
      return resume?.currentVersionId?.structuredData || { message: 'Resume not available' };
    },
  };
}

async function summarizeCandidate({ candidateProfile, matchResult, candidateOrgId, resumeId }) {
  const { reply } = await runAgentStep({
    promptVersion: 'candidateSummary.v1',
    buildMessages: (toolResult) => candidateSummaryService.buildMessages({ candidateProfile, matchResult, toolResult }),
    tools: buildTools(candidateOrgId, resumeId),
    mock: () => candidateSummaryService.mockReply({ candidateProfile, matchResult }),
  });
  return reply;
}

module.exports = { summarizeCandidate };
