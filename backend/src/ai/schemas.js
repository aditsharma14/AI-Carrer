const { z } = require('zod');

// Output contracts, keyed by promptVersion. aiClient.complete() looks the
// schema up here and validates EVERY provider's output against it — the real
// provider uses it for structured outputs (the API constrains the JSON), and
// the stub provider is validated too, so a mock that drifts from the contract
// fails in tests instead of shipping a shape the frontend can't render.
//
// Prompts not listed here return free text (z.string()). Agent prompts
// (run through agentOrchestrator) validate the final `reply`, not the
// { reply, toolCall } envelope.
//
// Keep these schemas to features structured outputs supports: plain objects,
// arrays, strings, numbers, enums, nullable. No min/max/regex constraints —
// clamp numbers in code if a range matters.

const TEXT = z.string();

const resumeParser = z.object({
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      description: z.string(),
    })
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      year: z.string().nullable(),
    })
  ),
});

const interviewGenerator = z.object({
  questions: z.array(z.object({ question: z.string(), rationale: z.string() })),
});

const resumeReviewer = z.object({
  suggestions: z.array(
    z.object({
      section: z.string(),
      issue: z.string(),
      suggestion: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })
  ),
});

const learningRecommender = z.object({
  items: z.array(
    z.object({
      skill: z.string(),
      title: z.string(),
      provider: z.string(),
      url: z.string().nullable(),
    })
  ),
});

const mockInterviewFeedback = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  scorePerQuestion: z.array(z.object({ question: z.string(), score: z.number() })),
});

const SCHEMAS = {
  'resumeParser.v2': resumeParser,
  'interviewGenerator.v1': interviewGenerator,
  'resumeReviewer.v1': resumeReviewer,
  'learningRecommender.v2': learningRecommender,
  'mockInterviewAgent.v2': mockInterviewFeedback,
};

function getSchema(promptVersion) {
  return SCHEMAS[promptVersion] || TEXT;
}

function isStructured(promptVersion) {
  return Boolean(SCHEMAS[promptVersion]);
}

module.exports = { getSchema, isStructured, SCHEMAS };
