const Job = require('./job.model');
const { cursorFilter, buildPage } = require('../../lib/pagination');

const LIST_PROJECTION = 'title location employmentType status applicantCount createdAt';

module.exports = {
  createJob(orgId, createdBy, { title, location, employmentType, description, skills }) {
    return Job.create({ orgId, createdBy, title, location, employmentType, description, requirements: { skills } });
  },

  findByIdScoped(orgId, jobId) {
    return Job.findOne({ _id: jobId, orgId });
  },

  // The one job lookup that doesn't know the caller's org ahead of time —
  // used by the seeker-facing match/apply flow, where a job's orgId comes
  // from the job document itself rather than from req.tenant. See
  // application.model.js's header comment for why this is a deliberate,
  // narrow exception rather than a tenant-isolation gap.
  findOpenByIdAnyOrg(jobId) {
    return Job.findOne({ _id: jobId, status: 'open' }, null, { allowCrossTenant: true });
  },

  updateJob(orgId, jobId, updates) {
    return Job.findOneAndUpdate({ _id: jobId, orgId }, updates, { new: true });
  },

  async listByOrg(orgId, { cursor, status, search, limit = 20 } = {}) {
    const filter = { orgId, ...cursorFilter(cursor) };
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const docs = await Job.find(filter, LIST_PROJECTION).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
    return buildPage(docs, limit);
  },

  // Cross-org by design — open job postings are semi-public listings, not
  // private recruiter data. Filtering to status:'open' is what keeps this
  // narrow: drafts and closed jobs from other orgs are never exposed here.
  // No LIST_PROJECTION here, unlike listByOrg() — matching.service.js needs
  // the full description + requirements.skills to score each job, not just
  // the summary fields a plain UI list view would need.
  async listOpenAcrossOrgs({ cursor, search, limit = 20 } = {}) {
    const filter = { status: 'open', ...cursorFilter(cursor) };
    if (search) filter.title = { $regex: search, $options: 'i' };

    const docs = await Job.find(filter, null, { allowCrossTenant: true })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    return buildPage(docs, limit);
  },

  incrementApplicantCount(orgId, jobId) {
    return Job.findOneAndUpdate({ _id: jobId, orgId }, { $inc: { applicantCount: 1 } });
  },

  // Cheap count, used by analytics.service.js — no reason to pull full
  // documents just to report a number on a dashboard card.
  countByOrgAndStatus(orgId, status) {
    return Job.countDocuments({ orgId, status });
  },
};
