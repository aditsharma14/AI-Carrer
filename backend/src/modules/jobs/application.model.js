const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// Applications are the one deliberate bridge between two tenants: a job
// lives in the recruiter org's tenant, but the candidate's resume lives in
// their OWN personal org. `orgId` below is the recruiter org (so every other
// query in this module can stay normally tenant-scoped); `candidateOrgId` is
// stored separately so the candidate's resume can still be looked up by its
// real owning tenant when a recruiter views this application.
const applicationSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    candidateUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    candidateOrgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interviewing', 'offered', 'hired', 'rejected'],
      default: 'applied',
    },
  },
  { timestamps: true }
);

applicationSchema.index({ orgId: 1, jobId: 1, status: 1 });
applicationSchema.index({ jobId: 1, candidateUserId: 1 }, { unique: true });

applicationSchema.plugin(tenantScopePlugin);

module.exports = model('Application', applicationSchema);
