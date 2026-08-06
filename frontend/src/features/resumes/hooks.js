import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { resumesApi } from './api';
import { flattenPages } from '../../shared/hooks/usePagination';
import { useAiAction } from '../../shared/hooks/useAiAction';

export function useResumes() {
  const query = useInfiniteQuery({
    queryKey: ['resumes'],
    queryFn: ({ pageParam }) => resumesApi.list({ cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
  return { ...query, ...flattenPages(query) };
}

export function useResume(resumeId) {
  return useQuery({
    queryKey: ['resumes', resumeId],
    queryFn: () => resumesApi.get(resumeId),
    enabled: !!resumeId,
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumesApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume uploaded — parsing now');
    },
  });
}

export function useCreateManualResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumesApi.createManual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume saved');
    },
  });
}

export function useRequestAtsScore(resumeId) {
  return useAiAction((jobId) => resumesApi.requestAtsScore(resumeId, jobId));
}

export function useRequestReview(resumeId) {
  return useAiAction(() => resumesApi.requestReview(resumeId));
}
