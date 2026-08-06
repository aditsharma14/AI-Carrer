import { axiosClient } from '../../shared/api/axiosClient';

export const authApi = {
  signup: (payload) => axiosClient.post('/auth/signup', payload).then((r) => r.data),
  login: (payload) => axiosClient.post('/auth/login', payload).then((r) => r.data),
  refresh: () => axiosClient.post('/auth/refresh').then((r) => r.data),
  me: () => axiosClient.get('/auth/me').then((r) => r.data),
  logout: () => axiosClient.post('/auth/logout').then((r) => r.data),
};
