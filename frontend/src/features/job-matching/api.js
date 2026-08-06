import { axiosClient } from '../../shared/api/axiosClient';

export const jobMatchingApi = {
  // Returns open jobs already scored against the current seeker's resume by
  // the Job Matcher AI service (embedding shortlist -> LLM refine, see
  // docs/ARCHITECTURE.md §5.2) — the list itself is never computed client-side.
  listMatches: ({ cursor, search } = {}) =>
    axiosClient.get('/jobs/matches', { params: { cursor, search } }).then((r) => r.data),
  getJobMatch: (jobId) => axiosClient.get(`/jobs/${jobId}/match`).then((r) => r.data),
};
