import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { flattenPages } from '../../shared/hooks/usePagination';
import { jobMatchingApi } from './api';

export function useJobMatches(search) {
  const query = useInfiniteQuery({
    queryKey: ['job-matches', search],
    queryFn: ({ pageParam }) => jobMatchingApi.listMatches({ cursor: pageParam, search }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  return flattenPages(query);
}

export function useJobMatch(jobId) {
  return useQuery({
    queryKey: ['job-match', jobId],
    queryFn: () => jobMatchingApi.getJobMatch(jobId),
    enabled: !!jobId,
  });
}
