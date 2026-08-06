import { Badge } from '../../shared/components/Badge';

// One score-to-color mapping shared by the candidate grid, comparison table,
// and details page — score thresholds only need to change in one place.
export function CandidateScoreBadge({ score, label }) {
  const variant = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
  return (
    <Badge variant={variant} className="tabular-nums">
      {label ? `${label}: ` : ''}{score}%
    </Badge>
  );
}
