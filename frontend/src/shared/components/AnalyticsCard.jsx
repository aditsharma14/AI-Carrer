import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card } from './Card';
import { cn } from '../lib/cn';

// The single stat-card used across every dashboard (seeker + recruiter) —
// "fast scanning" comes from every KPI looking identical, not from each
// page styling its own number differently. Composes the real Card instead of
// hardcoding its own copy of the shell (previously duplicated across this
// file, ChartCard, and Skeleton's CardSkeleton).
export function AnalyticsCard({ label, value, icon: Icon, trend }) {
  const isPositive = trend?.direction === 'up';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {Icon && <Icon size={16} className="text-slate-400" strokeWidth={1.75} />}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {trend && (
        <p
          className={cn(
            'mt-1 flex items-center gap-1 text-xs font-medium',
            isPositive ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {trend.value}
        </p>
      )}
    </Card>
  );
}
