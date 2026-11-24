const MatchResult = require('./matchResult.model');

module.exports = {
  // Bulk-write once per matching run rather than N individual creates — a
  // job with 200 applications becomes one round-trip instead of 200.
  // Note: bulkWrite() bypasses Mongoose query middleware entirely, so
  // tenantScope.plugin.js's defense-in-depth check does NOT run here — every
  // op below must carry `orgId` by hand, in BOTH the filter and the $set.
  // (The filter used to omit it, so an upsert could match another tenant's
  // document; test/matchingTenancy.test.js now pins this for every op.)
  async upsertMany(orgId, jobId, results) {
    if (results.length === 0) return [];
    const ops = results.map((r) => ({
      updateOne: {
        filter: { orgId, jobId, applicationId: r.applicationId },
        update: { $set: { orgId, jobId, ...r } },
        upsert: true,
      },
    }));
    await MatchResult.bulkWrite(ops);
    return MatchResult.find({ orgId, jobId }).sort({ score: -1 });
  },

  async setRanks(orgId, jobId, rankedApplicationIds) {
    const ops = rankedApplicationIds.map((applicationId, index) => ({
      updateOne: { filter: { orgId, jobId, applicationId }, update: { $set: { rank: index + 1 } } },
    }));
    if (ops.length) await MatchResult.bulkWrite(ops);
  },

  listByJob(orgId, jobId) {
    return MatchResult.find({ orgId, jobId }).sort({ rank: 1, score: -1 }).lean();
  },

  findByJobAndApplication(orgId, jobId, applicationId) {
    return MatchResult.findOne({ orgId, jobId, applicationId });
  },
};
