const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// One live Q&A walkthrough of an InterviewSet's question list. Progression
// is a fixed walk through `questions` (currentQuestionIndex), not a live
// "agent decides the next question" loop — the agent's real job here is
// evaluating the finished transcript (see ai/agents/interviewAgent.js),
// not picking questions that are already generated up front.
const mockInterviewSessionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    interviewSetId: { type: Schema.Types.ObjectId, ref: 'InterviewSet', required: true },
    targetRole: { type: String, required: true }, // denormalized from the set so the list page never needs a populate
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    transcript: [
      {
        role: { type: String, enum: ['assistant', 'user'], required: true },
        text: { type: String, required: true },
      },
    ],
    totalQuestions: { type: Number, required: true },
    currentQuestionIndex: { type: Number, default: 0 },
    // Mixed + default: null (not a typed nested schema) so this field stays
    // genuinely `null` — and therefore falsy — until the session completes.
    // A typed nested path here would auto-initialize to `{}` on every
    // document, which is truthy and would defeat the frontend's
    // `session.feedback || fallback` check in InterviewFeedbackPage.jsx.
    feedback: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

mockInterviewSessionSchema.index({ orgId: 1, userId: 1, createdAt: -1 });

mockInterviewSessionSchema.plugin(tenantScopePlugin);

module.exports = model('MockInterviewSession', mockInterviewSessionSchema);
