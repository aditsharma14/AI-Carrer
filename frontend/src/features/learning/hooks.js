import { useQuery } from '@tanstack/react-query';
import { useAiAction } from '../../shared/hooks/useAiAction';
import { learningApi } from './api';

export function useLearningRecommendations() {
  return useAiAction((skillGapReportId) => learningApi.getRecommendations(skillGapReportId));
}

export function useLatestLearningRecommendations() {
  return useQuery({ queryKey: ['learning', 'latest'], queryFn: learningApi.getLatest });
}
