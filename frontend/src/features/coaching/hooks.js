import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { coachingApi } from './api';
import { useAiAction } from '../../shared/hooks/useAiAction';

export function useSkillGap(targetRole) {
  return useAiAction(() => coachingApi.getSkillGap(targetRole));
}

export function useLatestSkillGap() {
  return useQuery({ queryKey: ['coaching', 'skill-gap', 'latest'], queryFn: coachingApi.getLatestSkillGap });
}

// Plain request/response for now (not the SSE token-stream the full
// architecture calls for in §13) — kept simple here since this scaffold has
// no live backend to stream from yet; swapping in EventSource later only
// touches this hook, not the page.
export function useCoachingChat() {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);

  const ensureSession = useMutation({
    mutationFn: coachingApi.createSession,
    onSuccess: (data) => setSessionId(data.id),
  });

  const send = useMutation({
    mutationFn: async (text) => {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const session = await ensureSession.mutateAsync();
        activeSessionId = session.id;
      }
      setMessages((prev) => [...prev, { role: 'user', text }]);
      const reply = await coachingApi.sendMessage(activeSessionId, text);
      return reply;
    },
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: 'assistant', text: reply.message }]);
      queryClient.invalidateQueries({ queryKey: ['coaching', 'sessions'] });
    },
  });

  return { messages, sendMessage: send.mutate, isSending: send.isPending };
}
