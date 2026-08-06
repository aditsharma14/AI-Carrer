import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { SearchInput } from '../../shared/components/SearchInput';
import { JobCard } from '../../shared/components/JobCard';
import { CardSkeleton } from '../../shared/components/Skeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Pagination } from '../../shared/components/Pagination';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useJobMatches } from './hooks';
import { jobMatchingApi } from './api';

export function JobListPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { items: jobs, isLoading, isError, refetch, hasMore, loadMore, isLoadingMore } = useJobMatches(debouncedSearch);
  const queryClient = useQueryClient();

  // Prefetch the detail view on hover — by the time a user finishes clicking
  // (~200-300ms of intent-to-click), the data's often already cached, so the
  // detail page mounts with no loading flicker. Uses the same query key
  // useJobMatch() reads in JobDetailPage.jsx, so this is a real cache warm,
  // not a wasted request.
  const handlePrefetchJob = useCallback(
    (jobId) => {
      queryClient.prefetchQuery({
        queryKey: ['job-match', jobId],
        queryFn: () => jobMatchingApi.getJobMatch(jobId),
      });
    },
    [queryClient]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Job Matching</h1>
        <p className="text-sm text-slate-500 mt-1">Open roles, ranked by how well they match your resume.</p>
      </motion.div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search by title or company..." className="max-w-sm" />

      {isError && <ErrorState onRetry={refetch} />}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <EmptyState icon={Briefcase} title="No matches yet" description="Upload a resume to start matching against open roles." />
      )}

      {jobs.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {jobs.map((job) => (
            <motion.div key={job.id} variants={fadeUp}>
              <JobCard job={job} to={`/app/job-matching/${job.id}`} onMouseEnter={() => handlePrefetchJob(job.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <Pagination hasMore={hasMore} loadMore={loadMore} isLoadingMore={isLoadingMore} />
    </div>
  );
}
