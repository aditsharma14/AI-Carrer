import { useQuery } from '@tanstack/react-query';
import { atsScoringApi } from './api';

export function useLatestAtsScore() {
  return useQuery({ queryKey: ['ats-score', 'latest'], queryFn: atsScoringApi.latest });
}
