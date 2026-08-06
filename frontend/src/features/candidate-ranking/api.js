import { axiosClient } from '../../shared/api/axiosClient';

export const candidatesApi = {
  // GET /jobs/:jobId/candidates?sort=score&cursor=... — see docs/ARCHITECTURE.md
  // §13. Ranking itself is a cheap re-sort over already-computed match scores,
  // so this is a plain paginated read, not an AI job to poll.
  listRanked: (jobId, { cursor, sort = 'score' } = {}) =>
    axiosClient.get(`/jobs/${jobId}/candidates`, { params: { cursor, sort } }).then((r) => r.data),

  getCandidate: (candidateId, { jobId } = {}) =>
    axiosClient.get(`/candidates/${candidateId}`, { params: { jobId } }).then((r) => r.data),

  // Sync-if-cache-warm (Candidate Summary Generator, §5.2) — returns the
  // summary directly, never a { jobId } to poll.
  getSummary: (jobId, candidateId) =>
    axiosClient.post(`/jobs/${jobId}/candidates/${candidateId}/summary`).then((r) => r.data),
};
