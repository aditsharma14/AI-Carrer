import { axiosClient } from '../../shared/api/axiosClient';

export const resumesApi = {
  list: ({ cursor } = {}) =>
    axiosClient.get('/resumes', { params: { cursor } }).then((r) => r.data),
  get: (resumeId) => axiosClient.get(`/resumes/${resumeId}`).then((r) => r.data),
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post('/resumes', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  createManual: (payload) => axiosClient.post('/resumes/manual', payload).then((r) => r.data),
  update: (resumeId, payload) => axiosClient.patch(`/resumes/${resumeId}`, payload).then((r) => r.data),
  remove: (resumeId) => axiosClient.delete(`/resumes/${resumeId}`).then((r) => r.data),
  requestAtsScore: (resumeId, jobId) =>
    axiosClient.post(`/resumes/${resumeId}/ats-score`, { jobId }).then((r) => r.data),
  requestReview: (resumeId) => axiosClient.post(`/resumes/${resumeId}/review`).then((r) => r.data),
};
