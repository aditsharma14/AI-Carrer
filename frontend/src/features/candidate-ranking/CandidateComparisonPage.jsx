import { useSearchParams, Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Badge } from '../../shared/components/Badge';
import { Skeleton } from '../../shared/components/Skeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { CandidateScoreBadge } from './CandidateScoreBadge';
import { candidatesApi } from './api';
import { fadeUp } from '../../shared/lib/motion';
import { Users, ArrowLeft } from 'lucide-react';

// useQueries (not useQuery in a loop — hooks can't be called conditionally
// per-item) lets a dynamic, URL-driven list of candidate ids each fetch
// independently while still rendering as one side-by-side table.
export function CandidateComparisonPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') || undefined;
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['candidate', id, jobId],
      queryFn: () => candidatesApi.getCandidate(id, { jobId }),
      enabled: !!id,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const candidates = results.map((r) => r.data).filter(Boolean);

  if (ids.length === 0) {
    return <EmptyState icon={Users} title="No candidates selected" description="Select two or more candidates from the Candidates page to compare them." />;
  }

  if (isLoading) return <Skeleton className="h-80 w-full" />;

  const allSkills = [...new Set(candidates.flatMap((c) => c.topSkills || []))];

  return (
    <div className="space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Candidate Comparison</h1>
        <Link
          to={jobId ? `/app/candidates?jobId=${jobId}` : '/app/candidates'}
          className="mt-1 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={14} /> Back to candidates
        </Link>
      </motion.div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Candidate</th>
              {candidates.map((c) => (
                <th key={c.id} className="px-4 py-2.5">
                  <Link to={`/app/candidates/${c.id}${jobId ? `?jobId=${jobId}` : ''}`} className="font-medium text-slate-700 hover:text-indigo-600">
                    {c.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700">Match score</td>
              {candidates.map((c) => (
                <td key={c.id} className="px-4 py-3">
                  {typeof c.score === 'number' ? <CandidateScoreBadge score={c.score} /> : '—'}
                </td>
              ))}
            </tr>
            {allSkills.map((skill) => (
              <tr key={skill} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{skill}</td>
                {candidates.map((c) => (
                  <td key={c.id} className="px-4 py-3">
                    {c.topSkills?.includes(skill) ? <Badge variant="success">Yes</Badge> : <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
