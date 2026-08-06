import { cn } from '../lib/cn';
import { Card } from './Card';

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200/70', className)} />;
}

// Pre-shaped skeleton for the most common case (a list of cards) so pages
// don't each invent their own skeleton layout. Composes the real Card
// instead of a third hardcoded copy of its shell (see AnalyticsCard.jsx /
// ChartCard.jsx — all three used to duplicate this independently).
export function CardSkeleton() {
  return (
    <Card className="space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </Card>
  );
}
