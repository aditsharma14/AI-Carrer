import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { SearchInput } from '../../shared/components/SearchInput';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { DataTable } from '../../shared/components/DataTable';
import { Pagination } from '../../shared/components/Pagination';
import { fadeUp } from '../../shared/lib/motion';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useJobs } from './hooks';

const STATUS_VARIANT = { open: 'success', draft: 'neutral', closed: 'danger' };
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
];

export function JobsListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(search);
  const { items: jobs, isLoading, isError, refetch, hasMore, loadMore, isLoadingMore } = useJobs({
    search: debouncedSearch,
    status,
  });

  const columns = [
    {
      key: 'title',
      header: 'Job',
      render: (job) => (
        <Link to={`/app/jobs/${job.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
          {job.title}
        </Link>
      ),
    },
    { key: 'location', header: 'Location', render: (job) => job.location || 'Remote' },
    { key: 'applicants', header: 'Applicants', render: (job) => job.applicantCount ?? 0 },
    { key: 'status', header: 'Status', render: (job) => <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge> },
    { key: 'created', header: 'Created', render: (job) => new Date(job.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">Manage open roles and trigger AI candidate matching.</p>
        </div>
        <Button as={Link} to="/app/jobs/new">
          <Plus size={15} /> New job
        </Button>
      </motion.div>

      <div className="flex gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search jobs..." className="max-w-sm" />
        <FilterSelect label="All statuses" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>

      <DataTable columns={columns} data={jobs} isLoading={isLoading} error={isError} onRetry={refetch} />

      <Pagination hasMore={hasMore} loadMore={loadMore} isLoadingMore={isLoadingMore} />
    </div>
  );
}
