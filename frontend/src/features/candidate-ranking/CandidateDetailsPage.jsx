import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { AIInsightCard } from '../../shared/components/AIInsightCard';
import { Skeleton } from '../../shared/components/Skeleton';
import { ErrorState } from '../../shared/components/ErrorState';
import { CandidateScoreBadge } from './CandidateScoreBadge';
import { fadeUp } from '../../shared/lib/motion';
import { useCandidate, useCandidateSummary } from './hooks';

export function CandidateDetailsPage() {
  const { candidateId } = useParams();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') || undefined;

  const { data: candidate, isLoading, isError, refetch } = useCandidate(candidateId, jobId);
  const summary = useCandidateSummary(jobId);

  if (isLoading) return <Skeleton className="h-64 w-full max-w-3xl mx-auto" />;
  if (isError || !candidate) return <ErrorState onRetry={refetch} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-base font-semibold text-slate-600">
            {candidate.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{candidate.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{candidate.headline}</p>
          </div>
        </div>
        {typeof candidate.score === 'number' && <CandidateScoreBadge score={candidate.score} label="Match" />}
      </motion.div>

      {candidate.topSkills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {candidate.topSkills.map((skill) => <Badge key={skill} variant="neutral">{skill}</Badge>)}
        </div>
      )}

      {jobId && (
        <div>
          {!summary.data && (
            <Button onClick={() => summary.mutate(candidateId)} loading={summary.isPending}>
              <Sparkles size={15} /> Generate AI summary
            </Button>
          )}
          {summary.data && (
            <AIInsightCard title="AI Summary">
              <p>{summary.data.summary}</p>
            </AIInsightCard>
          )}
        </div>
      )}

      {candidate.experience?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3">Experience</h2>
          <div className="space-y-3">
            {candidate.experience.map((exp, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300">
                <p className="text-sm font-medium text-slate-900">{exp.title} · {exp.company}</p>
                <p className="text-xs text-slate-500 mt-0.5">{exp.startDate} — {exp.endDate || 'Present'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
