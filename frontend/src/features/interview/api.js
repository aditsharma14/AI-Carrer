import { axiosClient } from '../../shared/api/axiosClient';

export const interviewApi = {
  // Shared by the seeker's practice flow and the recruiter's Interview
  // Generator — same endpoint, different payload (targetRole vs. jobId).
  generate: (payload) => axiosClient.post('/interviews/generate', payload).then((r) => r.data),

  listMockSessions: ({ cursor } = {}) =>
    axiosClient.get('/interviews/mock-sessions', { params: { cursor } }).then((r) => r.data),
  startMockSession: (payload) => axiosClient.post('/interviews/mock-sessions', payload).then((r) => r.data),
  getMockSession: (sessionId) => axiosClient.get(`/interviews/mock-sessions/${sessionId}`).then((r) => r.data),
  respond: (sessionId, answer) =>
    axiosClient.post(`/interviews/mock-sessions/${sessionId}/respond`, { answer }).then((r) => r.data),
};
