const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// One document per (job, application) pair, created when a recruiter
// triggers matching on a job (see jobMatching.processor.js). This is
// deliberately separate from the seeker's own single-job match preview
// (GET /jobs/:jobId/match), which has no Application yet to attach to and
// is computed on demand, cached in Redis rather than persisted here.
const matchResultSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // denormalized for direct candidate-facing queries
    score: { type: Number, required: true },
    matchedSkills: { type: [String], default: [] },
    gapSkills: { type: [String], default: [] },
    rank: { type: Number, default: null }, // set by candidateRanker.service.js, not at write time
  },
  { timestamps: true }
);

matchResultSchema.index({ orgId: 1, jobId: 1, score: -1 });
matchResultSchema.index({ jobId: 1, applicationId: 1 }, { unique: true });

matchResultSchema.plugin(tenantScopePlugin);

module.exports = model('MatchResult', matchResultSchema);
