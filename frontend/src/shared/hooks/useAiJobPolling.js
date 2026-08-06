import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '../api/axiosClient';

const ACTIVE_STATUSES = ['queued', 'processing'];

// Every async AI job (resume parse, ATS score, candidate ranking, interview
// generation — see docs/ARCHITECTURE.md §13) reports through the same
// GET /ai-jobs/:jobId shape, so one polling hook covers all of them instead
// of a bespoke poller per feature.
export function useAiJobPolling(jobId, { onDone } = {}) {
  const query = useQuery({
    queryKey: ['ai-job', jobId],
    queryFn: () => axiosClient.get(`/ai-jobs/${jobId}`).then((r) => r.data),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && !ACTIVE_STATUSES.includes(status)) {
        if (status === 'done') onDone?.(query.state.data);
        return false;
      }
      return 1500;
    },
  });

  // A job that terminates with status 'failed' (or anything besides 'done')
  // is a real failure, not a query error — the HTTP request succeeded, the
  // job itself just didn't complete. Without this, that case surfaced no
  // error and no result, so useAiAction's `isPolling` stayed stuck true
  // forever with nothing on screen and no way to retry.
  const status = query.data?.status;
  const jobFailed = !!status && status !== 'done' && !ACTIVE_STATUSES.includes(status);

  return {
    ...query,
    error: query.error || (jobFailed ? new Error(query.data?.error || 'AI job failed') : null),
  };
}
