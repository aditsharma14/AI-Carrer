import { axiosClient } from '../../shared/api/axiosClient';

export const analyticsApi = {
  // Backed by the precomputed orgStats document (docs/ARCHITECTURE.md §4.4) —
  // dashboards read a small aggregate instead of live-aggregating jobs/candidates
  // on every page load.
  getOverview: () => axiosClient.get('/analytics/overview').then((r) => r.data),
  getHiringFunnel: () => axiosClient.get('/analytics/hiring-funnel').then((r) => r.data),
  getTimeToHire: () => axiosClient.get('/analytics/time-to-hire').then((r) => r.data),
};
