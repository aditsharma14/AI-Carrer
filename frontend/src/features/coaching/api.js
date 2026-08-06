import { axiosClient } from '../../shared/api/axiosClient';

export const coachingApi = {
  getSkillGap: (targetRole) =>
    axiosClient.get('/coaching/skill-gap', { params: { targetRole } }).then((r) => r.data),
  getLatestSkillGap: () => axiosClient.get('/coaching/skill-gap/latest').then((r) => r.data),
  listSessions: () => axiosClient.get('/coaching/sessions').then((r) => r.data),
  createSession: () => axiosClient.post('/coaching/sessions').then((r) => r.data),
  sendMessage: (sessionId, message) =>
    axiosClient.post(`/coaching/sessions/${sessionId}/messages`, { message }).then((r) => r.data),
};
