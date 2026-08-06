import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { Badge } from '../../shared/components/Badge';
import { DataTable } from '../../shared/components/DataTable';
import { EmptyState } from '../../shared/components/EmptyState';
import { Users } from 'lucide-react';
import { fadeUp } from '../../shared/lib/motion';
import { useJobs } from '../jobs/hooks';
import { useRankedCandidates, useCandidateSummary } from '../candidate-ranking/hooks';

// Not a 12th AI service — same pattern as CareerRoadmapPage: a workflow view
// that synthesizes existing AI output (Job Matcher's scores, the Candidate
// Summary Generator) into a triage list, rather than a new backend service
// for what is really "Candidate Ranker + a verdict threshold."
function verdict(score) {
  if (score >= 80) return { label: 'Strong fit', variant: 'success' };
  if (score >= 60) return { label: 'Possible fit', variant: 'warning' };
  return { label: 'Not a fit', variant: 'danger' };
}

export function AiScreeningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') || '';
  const { items: jobs } = useJobs({ status: 'open' });
  const { items: candidates, isLoading, isError, refetch } = useRankedCandidates(jobId);
  const summary = useCandidateSummary(jobId);
  const [summarized, setSummarized] = useState({});

  function generateSummary(candidateId) {
    summary.mutate(candidateId, {
      onSuccess: (data) => setSummarized((prev) => ({ ...prev, [candidateId]: data.summary })),
    });
  }

  const columns = [
    {
      key: 'name',
      header: 'Candidate',
      render: (c) => (
        <Link to={`/app/candidates/${c.id}?jobId=${jobId}`} className="font-medium text-slate-900 hover:text-indigo-600">
          {c.name}
        </Link>
      ),
    },
    {
      key: 'verdict',
      header: 'AI verdict',
      render: (c) => {
        const v = verdict(c.score);
        return <Badge variant={v.variant}>{v.label}</Badge>;
      },
    },
    { key: 'score', header: 'Score', render: (c) => `${c.score}%` },
    {
      key: 'summary',
      header: 'AI summary',
      render: (c) =>
        summarized[c.id] ? (
          <span className="text-slate-600 line-clamp-2 max-w-xs inline-block">{summarized[c.id]}</span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => generateSummary(c.id)} loading={summary.isPending}>
            <Sparkles size={13} /> Generate
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AI Screening</h1>
        <p className="text-sm text-slate-500 mt-1">Triage applicants by AI match score before a human review pass.</p>
      </motion.div>

      <FilterSelect
        label="Select a job"
        value={jobId}
        onChange={(v) => setSearchParams(v ? { jobId: v } : {})}
        options={jobs.map((j) => ({ value: j.id, label: j.title }))}
      />

      {!jobId && <EmptyState icon={Users} title="Select a job to start screening" />}

      {jobId && (
        <DataTable
          columns={columns}
          data={candidates}
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
        />
      )}
    </div>
  );
}
