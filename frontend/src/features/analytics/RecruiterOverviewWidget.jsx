import { Briefcase, Users, Clock } from 'lucide-react';
import { AnalyticsCard } from '../../shared/components/AnalyticsCard';
import { Skeleton } from '../../shared/components/Skeleton';
import { useAnalyticsOverview } from './hooks';

// The recruiter dashboard's equivalent of the seeker's ATS/skill-gap widgets —
// three KPIs a recruiter scans first thing, pulled from the precomputed
// orgStats aggregate rather than three separate live counts.
export function RecruiterOverviewWidget() {
  const { data, isLoading } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-5 col-span-full">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 col-span-full">
      <AnalyticsCard label="Open jobs" value={data?.openJobs ?? 0} icon={Briefcase} />
      <AnalyticsCard label="Active candidates" value={data?.activeCandidates ?? 0} icon={Users} />
      <AnalyticsCard label="Avg. time to hire" value={data?.avgTimeToHireDays ? `${data.avgTimeToHireDays}d` : '—'} icon={Clock} />
    </div>
  );
}
