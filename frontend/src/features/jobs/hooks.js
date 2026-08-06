import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAiAction } from '../../shared/hooks/useAiAction';
import { flattenPages } from '../../shared/hooks/usePagination';
import { useOrg } from '../organizations/OrgContext';
import { jobsApi } from './api';

export function useJobs({ search, status } = {}) {
  const { activeOrgId } = useOrg();
  const query = useInfiniteQuery({
    queryKey: ['org', activeOrgId, 'jobs', search, status],
    queryFn: ({ pageParam }) => jobsApi.list({ cursor: pageParam, search, status }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!activeOrgId,
  });
  return flattenPages(query);
}

export function useJob(jobId) {
  return useQuery({ queryKey: ['job', jobId], queryFn: () => jobsApi.get(jobId), enabled: !!jobId });
}

export function useCreateJob() {
  const { activeOrgId } = useOrg();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', activeOrgId, 'jobs'] });
      toast.success('Job posting created');
    },
  });
}

export function useUpdateJob(jobId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => jobsApi.update(jobId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Job posting updated');
    },
  });
}

export function useTriggerMatching(jobId) {
  return useAiAction(() => jobsApi.triggerMatching(jobId));
}
