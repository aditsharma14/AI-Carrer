const Application = require('./application.model');
const { cursorFilter, buildPage } = require('../../lib/pagination');

module.exports = {
  create(orgId, { jobId, candidateUserId, candidateOrgId, resumeId }) {
    return Application.create({ orgId, jobId, candidateUserId, candidateOrgId, resumeId });
  },

  findByJobAndCandidate(jobId, candidateUserId) {
    // No orgId in this filter by design — a candidate must never be able to
    // apply twice to the same job, and the unique index on
    // (jobId, candidateUserId) is the real enforcement; this lookup just
    // gives the service layer a friendly error instead of a duplicate-key one.
    return Application.findOne({ jobId, candidateUserId }, null, { allowCrossTenant: true });
  },

  findByIdScoped(orgId, applicationId) {
    return Application.findOne({ _id: applicationId, orgId });
  },

  findByJobAndCandidateScoped(orgId, jobId, candidateUserId) {
    return Application.findOne({ orgId, jobId, candidateUserId });
  },

  async listByJob(orgId, jobId, { cursor, limit = 50 } = {}) {
    const filter = { orgId, jobId, ...cursorFilter(cursor) };
    const docs = await Application.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
    return buildPage(docs, limit);
  },

  // Deliberately uncapped/unpaginated — unlike every other list method here,
  // this backs a queue processor batch job (jobMatching.processor.js), not a
  // user-facing endpoint. Cursor pagination exists to keep one HTTP response
  // fast; a worker that already needs every application to score them all
  // has no such constraint.
  listAllByJob(orgId, jobId) {
    return Application.find({ orgId, jobId }).lean();
  },

  // Same "backs a queue processor, not a user-facing endpoint" exemption as
  // listAllByJob — used by analytics.service.js's org-wide aggregation.
  listAllByOrg(orgId) {
    return Application.find({ orgId }).lean();
  },

  updateStatus(orgId, applicationId, status) {
    return Application.findOneAndUpdate({ _id: applicationId, orgId }, { status }, { new: true });
  },
};
