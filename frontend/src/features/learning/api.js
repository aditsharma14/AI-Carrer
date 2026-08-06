import { axiosClient } from '../../shared/api/axiosClient';

export const learningApi = {
  getRecommendations: (skillGapReportId) =>
    axiosClient.get('/learning/recommendations', { params: { skillGapReportId } }).then((r) => r.data),
  getLatest: () => axiosClient.get('/learning/recommendations/latest').then((r) => r.data),
};
