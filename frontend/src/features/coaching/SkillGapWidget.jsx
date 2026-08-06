import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { Card, CardHeader } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { EmptyState } from '../../shared/components/EmptyState';
import { Skeleton } from '../../shared/components/Skeleton';
import { useLatestSkillGap } from './hooks';

const PRIORITY_VARIANT = { high: 'danger', medium: 'warning', low: 'neutral' };

// Self-fetches via its own query (see docs/ARCHITECTURE.md §2.3: dashboard
// widgets own their own data fetching) — an independent loading/error
// boundary per widget, no shared "dashboard data" object to coordinate.
export function SkillGapWidget() {
  const { data, isLoading } = useLatestSkillGap();
  const gaps = data?.gaps || [];

  return (
    <Card>
      <CardHeader title="Skill Gaps" />
      {isLoading && <Skeleton className="h-20 w-full" />}
      {!isLoading && gaps.length === 0 && <EmptyState icon={Target} title="No analysis yet" />}
      {gaps.length > 0 && (
        <div className="space-y-2">
          {gaps.slice(0, 3).map((gap) => (
            <div key={gap.skill} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{gap.skill}</span>
              <Badge variant={PRIORITY_VARIANT[gap.priority] || 'neutral'}>{gap.priority}</Badge>
            </div>
          ))}
        </div>
      )}
      <Link to="/app/skill-gap" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
        View full analysis →
      </Link>
    </Card>
  );
}
