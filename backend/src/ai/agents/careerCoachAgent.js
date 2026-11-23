const { runAgentStep } = require('./agentOrchestrator');
const { chunkResume, chunkConversation } = require('../rag/chunking');
const { retrieveTopChunks } = require('../rag/retriever');
const careerCoachService = require('../services/careerCoach.service');
const resumeRepository = require('../../modules/resumes/resume.repository');
const coachingRepository = require('../../modules/coaching/coaching.repository');

// Tools this agent can call — each one a repository read we already own,
// never an arbitrary external API needing sandboxing (docs/ARCHITECTURE.md §7.2).
function buildTools(orgId, userId) {
  return {
    getLatestSkillGap: {
      description: "Fetch the user's most recent skill-gap analysis (target role and missing skills). Use when the question is about what to learn or how ready they are for a role.",
      handler: async () => {
        const report = await coachingRepository.findLatestSkillGapReportForUser(orgId, userId);
        return report ? { targetRole: report.targetRole, gaps: report.gaps } : { message: 'No skill gap analysis on file yet' };
      },
    },
  };
}

// This is the part that makes Career Coach an AGENT and not just an AI
// service: it gathers context (RAG) and runs the bounded tool-call loop
// itself. ai/services/careerCoach.service.js stays a single-call building
// block with no awareness of either of those things.
async function converse({ orgId, userId, message, history }) {
  const { items: recentResumes } = await resumeRepository.listByOrgUser(orgId, userId, { limit: 1 });

  let resumeChunks = [];
  if (recentResumes[0]) {
    const resume = await resumeRepository.findByIdScoped(orgId, recentResumes[0]._id);
    if (resume?.currentVersionId) resumeChunks = chunkResume(resume.currentVersionId.structuredData);
  }

  const conversationChunks = chunkConversation(history);
  const retrievedContext = await retrieveTopChunks([...resumeChunks, ...conversationChunks], message);

  const { reply } = await runAgentStep({
    promptVersion: 'careerCoach.v2',
    buildMessages: (toolResult) => careerCoachService.buildMessages({ message, history, retrievedContext, toolResult }),
    tools: buildTools(orgId, userId),
    mock: () => careerCoachService.mockReply({ message, retrievedContext }),
  });

  return reply;
}

module.exports = { converse };
