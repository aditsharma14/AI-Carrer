const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// One schema covers every async AI job in the system. A resume parse and a
// candidate-ranking batch look structurally identical from the outside —
// "something is running, here's its status, here's the result when done" —
// so they share one model instead of five near-duplicate ones.
const aiJobSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    type: {
      type: String,
      enum: ['resume-parse', 'ats-score', 'job-matching', 'candidate-ranking', 'interview-generation'],
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'done', 'failed_needs_review'],
      default: 'queued',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    payload: { type: Schema.Types.Mixed }, // the input the job was started with
    result: { type: Schema.Types.Mixed }, // the output, once status === 'done'
    error: { type: String, default: null },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Serves "is this job done yet" (by id, via _id index automatically) and
// "show me this org's recent jobs of type X" for an admin/debug view.
aiJobSchema.index({ orgId: 1, status: 1, type: 1 });

aiJobSchema.plugin(tenantScopePlugin);

module.exports = model('AiJob', aiJobSchema);
