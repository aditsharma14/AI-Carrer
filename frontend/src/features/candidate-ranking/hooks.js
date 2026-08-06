import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { flattenPages } from '../../shared/hooks/usePagination';
import { candidatesApi } from './api';

export function useRankedCandidates(jobId, sort = 'score') {
  const query = useInfiniteQuery({
    queryKey: ['job', jobId, 'candidates', sort],
    queryFn: ({ pageParam }) => candidatesApi.listRanked(jobId, { cursor: pageParam, sort }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!jobId,
  });
  return flattenPages(query);
}

export function useCandidate(candidateId, jobId) {
  return useQuery({
    queryKey: ['candidate', candidateId, jobId],
    queryFn: () => candidatesApi.getCandidate(candidateId, { jobId }),
    enabled: !!candidateId,
  });
}

export function useCandidateSummary(jobId) {
  return useMutation({
    mutationFn: (candidateId) => candidatesApi.getSummary(jobId, candidateId),
  });
}
