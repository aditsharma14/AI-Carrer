const OrgStats = require('./orgStats.model');

module.exports = {
  findByOrg(orgId) {
    return OrgStats.findOne({ orgId });
  },

  upsert(orgId, stats) {
    return OrgStats.findOneAndUpdate(
      { orgId },
      { orgId, ...stats, computedAt: new Date() },
      { upsert: true, new: true }
    );
  },
};
