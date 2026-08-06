const { z } = require('zod');

const sendMessageSchema = z.object({
  params: z.object({ sessionId: z.string() }),
  body: z.object({ message: z.string().min(1).max(2000) }),
});

const skillGapQuerySchema = z.object({
  query: z.object({ targetRole: z.string().min(1) }),
});

module.exports = { sendMessageSchema, skillGapQuerySchema };
