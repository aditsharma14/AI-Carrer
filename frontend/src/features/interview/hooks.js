import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAiAction } from '../../shared/hooks/useAiAction';
import { flattenPages } from '../../shared/hooks/usePagination';
import { interviewApi } from './api';

export function useGenerateInterview() {
  return useAiAction((payload) => interviewApi.generate(payload));
}

export function useMockSessions() {
  const query = useInfiniteQuery({
    queryKey: ['mock-sessions'],
    queryFn: ({ pageParam }) => interviewApi.listMockSessions({ cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  return flattenPages(query);
}

export function useStartMockSession() {
  return useMutation({ mutationFn: interviewApi.startMockSession });
}

// Drives the live Q&A loop: each answer either returns the next question or
// flips status to 'completed' with final feedback attached — the page just
// watches `session.status`, it doesn't manage the conversation state itself.
export function useMockInterviewSession(sessionId) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['mock-session', sessionId],
    queryFn: () => interviewApi.getMockSession(sessionId),
    enabled: !!sessionId,
  });

  const respond = useMutation({
    mutationFn: (answer) => interviewApi.respond(sessionId, answer),
    onSuccess: (data) => queryClient.setQueryData(['mock-session', sessionId], data),
  });

  return {
    session: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    error: sessionQuery.error,
    refetch: sessionQuery.refetch,
    // Previously a failed `respond` call surfaced nothing at all — the
    // answer just vanished with no error and no way to retry. `respondError`
    // lets the page show a retry affordance instead of silently losing the
    // answer; `respond.mutate`'s per-call options let the page only clear
    // the input on success (see MockInterviewSessionPage.jsx).
    respond: respond.mutate,
    respondError: respond.error,
    isResponding: respond.isPending,
  };
}
