import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Card, CardHeader } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { Skeleton } from '../../shared/components/Skeleton';
import { useLatestLearningRecommendations } from './hooks';

export function LearningRecsWidget() {
  const { data, isLoading } = useLatestLearningRecommendations();
  const items = data?.items || [];

  return (
    <Card>
      <CardHeader title="Learning Recommendations" />
      {isLoading && <Skeleton className="h-20 w-full" />}
      {!isLoading && items.length === 0 && <EmptyState icon={GraduationCap} title="No recommendations yet" />}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.slice(0, 3).map((item, i) => (
            <li key={i} className="text-sm text-slate-700 truncate">{item.title}</li>
          ))}
        </ul>
      )}
      <Link to="/app/learning" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
        View all →
      </Link>
    </Card>
  );
}
