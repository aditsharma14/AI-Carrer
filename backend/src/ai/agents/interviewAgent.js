const { runAgentStep } = require('./agentOrchestrator');
const mockInterviewAgentService = require('../services/mockInterviewAgent.service');
const resumeRepository = require('../../modules/resumes/resume.repository');

// One tool: fetch the candidate's resume summary, so feedback can ground
// itself in their real background ("you mentioned 3 years of React — that
// matches what you described in question 2") instead of judging the
// transcript in a vacuum. Same shape as careerCoachAgent.js's tools.
function buildTools(orgId, userId) {
  return {
    getResumeSummary: {
      description: "Fetch the candidate's resume summary so feedback can reference their real background.",
      handler: async () => {
        const { items } = await resumeRepository.listByOrgUser(orgId, userId, { limit: 1 });
        if (!items[0]) return { message: 'No resume on file' };
        const resume = await resumeRepository.findByIdScoped(orgId, items[0]._id);
        return resume?.currentVersionId?.structuredData.summary || { message: 'No resume content yet' };
      },
    },
  };
}

// Evaluates a FINISHED transcript — never picks the next question (that's a
// fixed walk through the InterviewSet's pre-generated list, owned by
// interview.service.js). This is what makes Mock Interview grading an AGENT
// rather than a plain AI service: it decides whether it needs the
// candidate's resume before grading, and runs the bounded tool-call loop
// itself.
async function evaluateSession({ orgId, userId, targetRole, transcript }) {
  const { reply } = await runAgentStep({
    promptVersion: 'mockInterviewAgent.v2',
    buildMessages: (toolResult) => mockInterviewAgentService.buildMessages({ targetRole, transcript, toolResult }),
    tools: buildTools(orgId, userId),
    mock: () => mockInterviewAgentService.mockReply({ transcript }),
  });
  return reply;
}

module.exports = { evaluateSession };
