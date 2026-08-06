import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card, CardHeader } from '../../shared/components/Card';
import { ResumeScoreCard } from '../../shared/components/ResumeScoreCard';
import { EmptyState } from '../../shared/components/EmptyState';
import { Skeleton } from '../../shared/components/Skeleton';
import { useLatestAtsScore } from './hooks';

// Dashboard widget — "AI insights highly visible" means the seeker's most
// recent ATS score is on the dashboard itself, not one click away.
export function AtsScoreWidget() {
  const { data, isLoading } = useLatestAtsScore();

  return (
    <Card>
      <CardHeader title="Latest ATS Score" />
      {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && !data && (
        <EmptyState
          icon={FileText}
          title="No score yet"
          description="Upload a resume to get your ATS score."
        />
      )}
      {data && (
        <>
          <ResumeScoreCard score={data.score} />
          <Link to={`/app/resumes/${data.resumeId}`} className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View full breakdown →
          </Link>
        </>
      )}
    </Card>
  );
}
