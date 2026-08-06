const CoachingSession = require('./coachingSession.model');
const SkillGapReport = require('./skillGapReport.model');

module.exports = {
  createSession(orgId, userId) {
    return CoachingSession.create({ orgId, userId, messages: [] });
  },

  findSessionScoped(orgId, sessionId) {
    return CoachingSession.findOne({ _id: sessionId, orgId });
  },

  appendMessage(orgId, sessionId, message) {
    return CoachingSession.findOneAndUpdate(
      { _id: sessionId, orgId },
      { $push: { messages: message } },
      { new: true }
    );
  },

  listSessionsByUser(orgId, userId) {
    return CoachingSession.find({ orgId, userId }).sort({ createdAt: -1 }).select('createdAt messages');
  },

  createSkillGapReport(orgId, userId, data) {
    return SkillGapReport.create({ orgId, userId, ...data });
  },

  findLatestSkillGapReportForUser(orgId, userId) {
    return SkillGapReport.findOne({ orgId, userId }).sort({ createdAt: -1 });
  },

  findSkillGapReportByIdScoped(orgId, reportId) {
    return SkillGapReport.findOne({ _id: reportId, orgId });
  },
};
