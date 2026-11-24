const Resume = require('./resume.model');
const ResumeVersion = require('./resumeVersion.model');
const { cursorFilter, buildPage } = require('../../lib/pagination');

// List-summary projection — the list page never needs structuredData/rawText,
// only enough to render a card (see docs/ARCHITECTURE.md §4.4: "list views
// project only summary fields, never pull big content blobs for list rendering").
const LIST_PROJECTION = 'title status source createdAt updatedAt';

module.exports = {
  createResume(orgId, userId, { title, source, status }) {
    return Resume.create({ orgId, userId, title, source, status });
  },

  createVersion(orgId, resumeId, { rawText, structuredData, security }) {
    return ResumeVersion.create({ orgId, resumeId, rawText, structuredData, security });
  },

  setCurrentVersion(orgId, resumeId, versionId, status) {
    return Resume.findOneAndUpdate({ _id: resumeId, orgId }, { currentVersionId: versionId, status }, { new: true });
  },

  markFailed(orgId, resumeId) {
    return Resume.findOneAndUpdate({ _id: resumeId, orgId }, { status: 'failed_needs_review' });
  },

  findByIdScoped(orgId, resumeId) {
    return Resume.findOne({ _id: resumeId, orgId }).populate('currentVersionId');
  },

  async listByOrgUser(orgId, userId, { cursor, limit = 20 } = {}) {
    const filter = { orgId, userId, ...cursorFilter(cursor) };
    // .lean() — this is a read-only list view, no need to hydrate full
    // Mongoose documents just to JSON.stringify them back out.
    const docs = await Resume.find(filter, LIST_PROJECTION).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
    return buildPage(docs, limit);
  },

  findVersionByIdScoped(orgId, versionId) {
    return ResumeVersion.findOne({ _id: versionId, orgId });
  },

  updateVersionAtsScore(orgId, versionId, atsScoreData) {
    return ResumeVersion.findOneAndUpdate(
      { _id: versionId, orgId },
      { latestAtsScore: { ...atsScoreData, computedAt: new Date() } },
      { new: true }
    );
  },

  // Powers the "latest ATS score" dashboard widget — across all of this
  // user's resumes, whichever version was scored most recently.
  async findLatestAtsScoreForUser(orgId, userId) {
    const resumeIds = await Resume.find({ orgId, userId }).distinct('_id');
    if (resumeIds.length === 0) return null;

    return ResumeVersion.findOne({ orgId, resumeId: { $in: resumeIds }, 'latestAtsScore.computedAt': { $ne: null } })
      .sort({ 'latestAtsScore.computedAt': -1 })
      .select('resumeId latestAtsScore');
  },
};
