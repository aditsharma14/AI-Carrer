import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAiJobPolling } from './useAiJobPolling';

// Every "ask AI for X" action (ATS score, resume review, skill gap, interview
// generation) follows the same sync-if-cached / async-if-not shape from
// docs/ARCHITECTURE.md §5.1 §13: the request either returns the result
// directly (cache hit) or a { jobId } to poll. One hook handles both so each
// feature's code doesn't re-implement the branch.
export function useAiAction(mutationFn) {
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const lastArgsRef = useRef(undefined);

  const mutation = useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (data?.jobId) {
        setResult(null);
        setJobId(data.jobId);
      } else {
        setJobId(null);
        setResult(data);
      }
    },
  });

  const polling = useAiJobPolling(jobId, {
    onDone: (job) => setResult(job.resultRef || job.result),
  });

  const trigger = useCallback(
    (variables) => {
      lastArgsRef.current = variables;
      mutation.mutate(variables);
    },
    [mutation]
  );

  // Previously, a failed job left `jobId` set forever with no result and no
  // error surfaced (see useAiJobPolling's fix) — retriggering just started a
  // second job racing the stale one. `reset` clears all of that explicitly,
  // and `retry` replays the last arguments so a "Try again" button doesn't
  // need to know what was originally requested.
  const reset = useCallback(() => {
    setJobId(null);
    setResult(null);
    mutation.reset();
  }, [mutation]);

  const retry = useCallback(() => {
    reset();
    mutation.mutate(lastArgsRef.current);
  }, [mutation, reset]);

  return {
    trigger,
    triggerAsync: mutation.mutateAsync,
    retry,
    reset,
    result,
    isLoading: mutation.isPending || polling.isFetching,
    isPolling: !!jobId && !result && !polling.error,
    error: mutation.error || polling.error,
  };
}
