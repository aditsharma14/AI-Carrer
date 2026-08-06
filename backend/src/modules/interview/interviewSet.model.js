const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// A generated batch of questions — created once by interviewGenerator.service.js,
// then reused by zero or more mock interview sessions (a seeker can start a
// session from a set without re-generating it, or just browse the questions
// directly from the Interview Generator page).
const interviewSetSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetRole: { type: String, required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', default: null }, // set when generated from a job posting (recruiter flow)
    type: { type: String, enum: ['technical', 'behavioral', 'screening'], default: 'behavioral' },
    questions: [
      {
        question: { type: String, required: true },
        rationale: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

interviewSetSchema.index({ orgId: 1, createdAt: -1 });

interviewSetSchema.plugin(tenantScopePlugin);

module.exports = model('InterviewSet', interviewSetSchema);
