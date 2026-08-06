import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { CardSkeleton } from '../../shared/components/Skeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Pagination } from '../../shared/components/Pagination';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { ResumeUploadCard } from './ResumeUploadCard';
import { useResumes } from './hooks';

const STATUS_VARIANT = { parsed: 'success', processing: 'warning', failed_needs_review: 'danger' };

// Layout: upload zone first (the most common action), then a card grid of
// existing resumes. No table here — resumes are few-per-user and visually
// scannable, unlike candidates/jobs which can run into the hundreds.
export function ResumeListPage() {
  const { items: resumes, isLoading, isError, refetch, hasMore, loadMore, isLoadingMore } = useResumes();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Resumes</h1>
          <p className="text-sm text-slate-500 mt-1">Upload a resume or build one from scratch.</p>
        </div>
        <Button as={Link} to="/app/resumes/new" variant="secondary" size="sm">
          <Plus size={15} /> Build manually
        </Button>
      </motion.div>

      <ResumeUploadCard />

      {isError && <ErrorState onRetry={refetch} />}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && !isError && resumes.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description="Upload your first resume to get an ATS score and AI feedback."
        />
      )}

      {resumes.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {resumes.map((resume) => (
            <motion.div key={resume.id} variants={fadeUp}>
              <Link
                to={`/app/resumes/${resume.id}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-sm font-medium text-slate-900">{resume.title}</span>
                  </div>
                  <Badge variant={STATUS_VARIANT[resume.status] || 'neutral'}>{resume.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Updated {new Date(resume.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Pagination hasMore={hasMore} loadMore={loadMore} isLoadingMore={isLoadingMore} />
    </div>
  );
}
