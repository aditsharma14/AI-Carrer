import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../shared/lib/cn';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { AIInsightCard } from '../../shared/components/AIInsightCard';
import { ResumeScoreCard } from '../../shared/components/ResumeScoreCard';
import { Skeleton } from '../../shared/components/Skeleton';
import { ErrorState } from '../../shared/components/ErrorState';
import { fadeUp, fadeIn, staggerContainer } from '../../shared/lib/motion';
import { useResume, useRequestReview, useRequestAtsScore } from './hooks';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'analyzer', label: 'AI Review' },
  { key: 'ats', label: 'ATS Score' },
];

// Three related AI outputs (overview, AI review, ATS score) live as tabs on
// one page instead of three separate routes — a seeker comparing "what the
// AI flagged" against "what's actually in the resume" shouldn't have to
// navigate away and lose context to do it.
export function ResumeDetailPage() {
  const { resumeId } = useParams();
  const [tab, setTab] = useState('overview');
  const { data: resume, isLoading, isError, refetch } = useResume(resumeId);

  if (isLoading) return <Skeleton className="h-64 w-full max-w-3xl mx-auto" />;
  if (isError || !resume) return <ErrorState onRetry={refetch} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{resume.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Updated {new Date(resume.updatedAt).toLocaleDateString()}
        </p>
      </motion.div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} variants={fadeIn} initial="hidden" animate="show">
        {tab === 'overview' && <OverviewTab resume={resume} />}
        {tab === 'analyzer' && <AnalyzerTab resumeId={resumeId} />}
        {tab === 'ats' && <AtsTab resumeId={resumeId} />}
      </motion.div>
    </div>
  );
}

function OverviewTab({ resume }) {
  const data = resume.structuredData || {};
  return (
    <div className="space-y-5">
      {data.summary && <p className="text-sm text-slate-700">{data.summary}</p>}

      {data.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.skills.map((s) => <Badge key={s}>{s}</Badge>)}
        </div>
      )}

      {data.experience?.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Experience</h2>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {data.experience.map((exp, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/60"
              >
                <p className="text-sm font-medium text-slate-900">{exp.title} · {exp.company}</p>
                <p className="text-xs text-slate-500 mt-0.5">{exp.startDate} — {exp.endDate || 'Present'}</p>
                {exp.description && <p className="text-sm text-slate-600 mt-1.5">{exp.description}</p>}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AnalyzerTab({ resumeId }) {
  const review = useRequestReview(resumeId);
  const suggestions = review.result?.suggestions || [];

  return (
    <div className="space-y-4">
      {!review.result && (
        <Button onClick={() => review.trigger()} loading={review.isLoading}>
          Run AI review
        </Button>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <AIInsightCard key={i} title={s.section}>
              <p className="font-medium text-slate-800">{s.issue}</p>
              <p>{s.suggestion}</p>
            </AIInsightCard>
          ))}
        </div>
      )}
    </div>
  );
}

function AtsTab({ resumeId }) {
  const ats = useRequestAtsScore(resumeId);

  return (
    <div className="space-y-4">
      {!ats.result && (
        <Button onClick={() => ats.trigger(undefined)} loading={ats.isLoading}>
          Calculate ATS score
        </Button>
      )}

      {ats.result && (
        <>
          <ResumeScoreCard score={ats.result.score} breakdown={ats.result.breakdown} />
          {ats.result.missingKeywords?.length > 0 && (
            <AIInsightCard title="Missing keywords">
              <div className="flex flex-wrap gap-1.5">
                {ats.result.missingKeywords.map((kw) => <Badge key={kw} variant="warning">{kw}</Badge>)}
              </div>
            </AIInsightCard>
          )}
        </>
      )}
    </div>
  );
}
