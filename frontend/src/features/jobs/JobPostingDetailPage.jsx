import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Sparkles, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Skeleton } from '../../shared/components/Skeleton';
import { ErrorState } from '../../shared/components/ErrorState';
import { fadeUp } from '../../shared/lib/motion';
import { useJob, useTriggerMatching } from './hooks';

const STATUS_VARIANT = { open: 'success', draft: 'neutral', closed: 'danger' };

export function JobPostingDetailPage() {
  const { jobId } = useParams();
  const { data: job, isLoading, isError, refetch } = useJob(jobId);
  const matching = useTriggerMatching(jobId);

  if (isLoading) return <Skeleton className="h-64 w-full max-w-3xl mx-auto" />;
  if (isError || !job) return <ErrorState onRetry={refetch} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{job.title}</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
            <MapPin size={13} /> {job.location || 'Remote'} · {job.applicantCount ?? 0} applicants
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
      </motion.div>

      <Card className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
        {job.description}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => matching.trigger()} loading={matching.isLoading}>
          <Sparkles size={15} /> Run candidate matching
        </Button>
        <Button as={Link} to={`/app/candidates?jobId=${jobId}`} variant="secondary">
          <Users size={15} /> View ranked candidates
        </Button>
        <Button as={Link} to={`/app/interview-generator?jobId=${jobId}`} variant="secondary">
          Generate interview questions
        </Button>
      </div>

      {matching.isPolling && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Loader2 size={15} className="animate-spin text-slate-400" />
          Matching candidates against this role — this can take a moment.
        </div>
      )}
      {matching.result && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={15} />
          Matching complete —{' '}
          <Link to={`/app/candidates?jobId=${jobId}`} className="font-medium underline underline-offset-2">
            view results
          </Link>
          .
        </div>
      )}
    </div>
  );
}
