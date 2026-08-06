const analyticsRepository = require('../../modules/analytics/analytics.repository');
const analyticsService = require('../../modules/analytics/analytics.service');
const logger = require('../../config/logger');

// Not currently enqueued from anywhere in this pass. The state change that
// would make an org's cached stats meaningfully stale — an application
// changing status (offered/hired/rejected) — isn't wired to any route yet;
// no "update candidate status" endpoint exists in this build (matching.routes.js
// only ever reads/scores applications, never changes their status). This
// processor is real and functional regardless: analytics.service.js's
// getOverview()/getHiringFunnel()/getTimeToHire() already handle the
// steady-state case themselves via a 15-minute staleness check and an inline
// recompute on a cache miss, so the dashboard works correctly without this
// ever running. This is the seam for once a real status-change event exists
// to enqueue it from, instead of relying on the staleness window.
module.exports = async function processAnalyticsAggregationJob(job) {
  const { orgId } = job.data;

  try {
    const stats = await analyticsService.computeOrgStats(orgId);
    await analyticsRepository.upsert(orgId, stats);
  } catch (err) {
    logger.error('analytics-aggregation job failed', { orgId, error: err.message });
    throw err;
  }
};
