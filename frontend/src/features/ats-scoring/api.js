import { axiosClient } from '../../shared/api/axiosClient';

export const atsScoringApi = {
  latest: () => axiosClient.get('/resumes/latest-ats-score').then((r) => r.data),
};
