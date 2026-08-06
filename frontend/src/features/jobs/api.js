import { axiosClient } from '../../shared/api/axiosClient';

export const jobsApi = {
  list: ({ cursor, search, status } = {}) =>
    axiosClient.get('/jobs', { params: { cursor, search, status } }).then((r) => r.data),
  get: (jobId) => axiosClient.get(`/jobs/${jobId}`).then((r) => r.data),
  create: (payload) => axiosClient.post('/jobs', payload).then((r) => r.data),
  update: (jobId, payload) => axiosClient.patch(`/jobs/${jobId}`, payload).then((r) => r.data),
  // Always async — batch-scores every applicant against this job (see
  // docs/ARCHITECTURE.md §5.2 Job Matcher) — so this always returns { jobId }
  // to poll, never a direct result.
  triggerMatching: (jobId) => axiosClient.post(`/jobs/${jobId}/match`).then((r) => r.data),
};
