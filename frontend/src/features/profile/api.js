import { axiosClient } from '../../shared/api/axiosClient';

export const profileApi = {
  updateProfile: (payload) => axiosClient.patch('/users/me', payload).then((r) => r.data),
  changePassword: (payload) => axiosClient.post('/users/me/password', payload).then((r) => r.data),
};
