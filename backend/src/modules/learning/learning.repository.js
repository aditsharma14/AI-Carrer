const LearningRec = require('./learningRec.model');

module.exports = {
  create(orgId, userId, { skillGapReportId, items }) {
    return LearningRec.create({ orgId, userId, skillGapReportId, items });
  },

  findLatestByUser(orgId, userId) {
    return LearningRec.findOne({ orgId, userId }).sort({ createdAt: -1 });
  },
};
