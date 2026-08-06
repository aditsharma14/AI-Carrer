const analyticsRepository = require('./analytics.repository');
const jobRepository = require('../jobs/job.repository');
const applicationRepository = require('../jobs/application.repository');

// How long a precomputed OrgStats doc is trusted before a read triggers a
// live recompute — the "dashboards read a small aggregate" steady state from
// docs/ARCHITECTURE.md §4.4, with a bounded staleness window rather than a
// cache that never refreshes itself.
const STALE_AFTER_MS = 15 * 60 * 1000;

const FUNNEL_STAGES = ['applied', 'screening', 'interviewing', 'offered', 'hired'];
const TIME_TO_HIRE_MONTHS = 6;

function daysBetween(a, b) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function monthKey(date) {
  return date.toISOString().slice(0, 7); // 'YYYY-MM' — stable, sortable, locale-independent
}

// Real aggregation over Job/Application — no AI involved. Done in
// application code over a fetched array rather than a Mongo aggregation
// pipeline for readability; at this project's scale that trade-off is fine,
// and a single $facet pipeline is the documented next step if an org's
// application volume ever makes this a hot path.
async function computeOrgStats(orgId) {
  const [openJobs, applications] = await Promise.all([
    jobRepository.countByOrgAndStatus(orgId, 'open'),
    applicationRepository.listAllByOrg(orgId),
  ]);

  const activeCandidates = applications.filter((a) => !['hired', 'rejected'].includes(a.status)).length;

  const hired = applications.filter((a) => a.status === 'hired');
  const offeredOrHired = applications.filter((a) => a.status === 'offered' || a.status === 'hired');

  const avgTimeToHireDays = hired.length
    ? Math.round(hired.reduce((sum, a) => sum + daysBetween(a.createdAt, a.updatedAt), 0) / hired.length)
    : null;

  const offerAcceptanceRate = offeredOrHired.length
    ? Math.round((hired.length / offeredOrHired.length) * 100)
    : null;

  const stages = FUNNEL_STAGES.map((stage) => ({
    stage,
    count: applications.filter((a) => a.status === stage).length,
  }));

  const monthBuckets = new Map();
  for (const app of hired) {
    const key = monthKey(app.updatedAt);
    const bucket = monthBuckets.get(key) || [];
    bucket.push(daysBetween(app.createdAt, app.updatedAt));
    monthBuckets.set(key, bucket);
  }
  const points = [...monthBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-TIME_TO_HIRE_MONTHS)
    .map(([month, days]) => ({ month, avgDays: Math.round(days.reduce((sum, d) => sum + d, 0) / days.length) }));

  return {
    openJobs,
    activeCandidates,
    avgTimeToHireDays,
    offerAcceptanceRate,
    hiringFunnel: { stages },
    timeToHire: { points },
  };
}

async function getOrComputeStats(orgId) {
  const cached = await analyticsRepository.findByOrg(orgId);
  const isStale = !cached || Date.now() - cached.computedAt.getTime() > STALE_AFTER_MS;

  if (!isStale) return cached;

  const stats = await computeOrgStats(orgId);
  return analyticsRepository.upsert(orgId, stats);
}

async function getOverview(orgId) {
  const stats = await getOrComputeStats(orgId);
  return {
    openJobs: stats.openJobs,
    activeCandidates: stats.activeCandidates,
    avgTimeToHireDays: stats.avgTimeToHireDays,
    offerAcceptanceRate: stats.offerAcceptanceRate,
  };
}

async function getHiringFunnel(orgId) {
  const stats = await getOrComputeStats(orgId);
  return { stages: stats.hiringFunnel.stages };
}

async function getTimeToHire(orgId) {
  const stats = await getOrComputeStats(orgId);
  return { points: stats.timeToHire.points };
}

module.exports = { computeOrgStats, getOverview, getHiringFunnel, getTimeToHire };
