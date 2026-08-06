const { z } = require('zod');

// Either targetRole (seeker practice flow) or jobId (recruiter flow,
// generating questions grounded in a specific posting) — never both, never
// neither. See InterviewGeneratorPage.jsx / MockInterviewPage.jsx.
const generateInterviewSchema = z.object({
  body: z
    .object({
      targetRole: z.string().min(2).max(120).optional(),
      jobId: z.string().optional(),
      type: z.enum(['technical', 'behavioral', 'screening']).default('behavioral'),
    })
    .refine((data) => Boolean(data.targetRole) !== Boolean(data.jobId), {
      message: 'Provide exactly one of targetRole or jobId',
    }),
});

const startMockSessionSchema = z.object({
  body: z.object({ interviewSetId: z.string() }),
});

const respondSchema = z.object({
  params: z.object({ sessionId: z.string() }),
  body: z.object({ answer: z.string().min(1).max(4000) }),
});

module.exports = { generateInterviewSchema, startMockSessionSchema, respondSchema };
