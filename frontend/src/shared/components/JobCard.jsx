import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';

const STATUS_VARIANT = { open: 'success', draft: 'neutral', closed: 'danger' };

// Used by the recruiter Jobs list and the seeker Job Matching feed — same
// card, different link target and an optional match-score badge for the
// seeker-facing usage (job.matchScore is undefined on the recruiter side).
// `onMouseEnter` is optional and deliberately generic (no feature-specific
// prefetch call baked in here) — shared/components must not import from
// features/*, so the caller wires its own query prefetch through this prop
// (see JobListPage.jsx for the one place that does).
// Wrapped in memo() since this renders inside long, frequently-scrolled list
// grids where the parent's search/pagination state changes shouldn't force
// every unrelated card to re-render.
export const JobCard = memo(function JobCard({ job, to, onMouseEnter }) {
  return (
    <Card as={Link} variant="interactive" to={to} onMouseEnter={onMouseEnter}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{job.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <MapPin size={12} /> {job.location || 'Remote'}
          </p>
        </div>
        {job.status && <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {typeof job.matchScore === 'number' && (
          <Badge variant="ai">{job.matchScore}% match</Badge>
        )}
        {typeof job.applicantCount === 'number' && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users size={13} /> {job.applicantCount} applicants
          </span>
        )}
      </div>
    </Card>
  );
});
