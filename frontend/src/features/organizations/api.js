import { axiosClient } from '../../shared/api/axiosClient';

export const organizationsApi = {
  listMyMemberships: () => axiosClient.get('/organizations/my-memberships').then((r) => r.data),
  getSettings: () => axiosClient.get('/organizations/settings').then((r) => r.data),
  updateSettings: (payload) => axiosClient.patch('/organizations/settings', payload).then((r) => r.data),
  listMembers: () => axiosClient.get('/organizations/members').then((r) => r.data),
  inviteMember: (payload) => axiosClient.post('/organizations/invites', payload).then((r) => r.data),
  removeMember: (membershipId) => axiosClient.delete(`/organizations/members/${membershipId}`).then((r) => r.data),
};
