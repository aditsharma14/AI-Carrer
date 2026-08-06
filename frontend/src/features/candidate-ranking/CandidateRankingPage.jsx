import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Scale } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { CandidateCard } from '../../shared/components/CandidateCard';
import { CardSkeleton } from '../../shared/components/Skeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Pagination } from '../../shared/components/Pagination';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useJobs } from '../jobs/hooks';
import { useRankedCandidates } from './hooks';

const SORT_OPTIONS = [
  { value: 'score', label: 'Best match' },
  { value: 'recent', label: 'Most recent' },
];

export function CandidateRankingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') || '';
  const [sort, setSort] = useState('score');
  const [selected, setSelected] = useState([]);

  const { items: jobs } = useJobs({ status: 'open' });
  const { items: candidates, isLoading, isError, refetch, hasMore, loadMore, isLoadingMore } = useRankedCandidates(jobId, sort);

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Candidates</h1>
          <p className="text-sm text-slate-500 mt-1">Ranked by AI match score for the selected job.</p>
        </div>
        {selected.length >= 2 && (
          <Button onClick={() => navigate(`/app/candidates/compare?jobId=${jobId}&ids=${selected.join(',')}`)}>
            <Scale size={15} /> Compare ({selected.length})
          </Button>
        )}
      </motion.div>

      <div className="flex gap-3">
        <FilterSelect
          label="Select a job"
          value={jobId}
          onChange={(v) => setSearchParams(v ? { jobId: v } : {})}
          options={jobs.map((j) => ({ value: j.id, label: j.title }))}
        />
        {jobId && <FilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />}
      </div>

      {!jobId && (
        <EmptyState icon={Users} title="Select a job to view ranked candidates" />
      )}

      {jobId && isError && <ErrorState onRetry={refetch} />}

      {jobId && isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {jobId && !isLoading && !isError && candidates.length === 0 && (
        <EmptyState icon={Users} title="No candidates yet" description="Run candidate matching from the job posting page." />
      )}

      {candidates.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {candidates.map((candidate) => (
            <motion.div key={candidate.id} variants={fadeUp}>
              <CandidateCard
                candidate={candidate}
                selected={selected.includes(candidate.id)}
                onToggleSelect={toggleSelect}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <Pagination hasMore={hasMore} loadMore={loadMore} isLoadingMore={isLoadingMore} />
    </div>
  );
}
