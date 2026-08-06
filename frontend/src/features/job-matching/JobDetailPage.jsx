import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Badge } from '../../shared/components/Badge';
import { AIInsightCard } from '../../shared/components/AIInsightCard';
import { Skeleton } from '../../shared/components/Skeleton';
import { ErrorState } from '../../shared/components/ErrorState';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useJobMatch } from './hooks';

export function JobDetailPage() {
  const { jobId } = useParams();
  const { data, isLoading, isError, refetch } = useJobMatch(jobId);

  if (isLoading) return <Skeleton className="h-64 w-full max-w-3xl mx-auto" />;
  if (isError || !data) return <ErrorState onRetry={refetch} />;

  const { job, matchScore, matchedSkills = [], gapSkills = [] } = data;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{job.title}</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
            <MapPin size={13} /> {job.location || 'Remote'}
          </p>
        </div>
        <Badge variant="ai">{matchScore}% match</Badge>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 whitespace-pre-line">
          {job.description}
        </motion.div>

        <motion.div variants={fadeUp}>
          <AIInsightCard title="Why you match">
            <div className="flex flex-wrap gap-1.5">
              {matchedSkills.map((s) => <Badge key={s} variant="success">{s}</Badge>)}
            </div>
          </AIInsightCard>
        </motion.div>

        {gapSkills.length > 0 && (
          <motion.div variants={fadeUp}>
            <AIInsightCard title="Skills this role expects that you haven't shown yet">
              <div className="flex flex-wrap gap-1.5">
                {gapSkills.map((s) => <Badge key={s} variant="warning">{s}</Badge>)}
              </div>
            </AIInsightCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
