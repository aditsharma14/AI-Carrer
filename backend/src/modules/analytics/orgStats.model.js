const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// One document per org — a precomputed cache, not a source of truth.
// docs/ARCHITECTURE.md §4.4: dashboards read this small aggregate instead of
// live-aggregating the Job/Application collections on every page load.
// Recomputed by analytics.service.js's computeOrgStats(), either inline on a
// cache miss/staleness or via queue/processors/analyticsAggregation.processor.js.
const orgStatsSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    openJobs: { type: Number, default: 0 },
    activeCandidates: { type: Number, default: 0 },
    avgTimeToHireDays: { type: Number, default: null },
    offerAcceptanceRate: { type: Number, default: null },
    hiringFunnel: {
      stages: { type: [{ stage: String, count: Number }], default: [] },
    },
    timeToHire: {
      points: { type: [{ month: String, avgDays: Number }], default: [] },
    },
    computedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

orgStatsSchema.plugin(tenantScopePlugin);

module.exports = model('OrgStats', orgStatsSchema);
