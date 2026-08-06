import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { Briefcase, Users, Clock, TrendingUp } from 'lucide-react';
import { AnalyticsCard } from '../../shared/components/AnalyticsCard';
import { ChartCard } from '../../shared/components/ChartCard';
import { Skeleton } from '../../shared/components/Skeleton';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useAnalyticsOverview, useHiringFunnel, useTimeToHire } from './hooks';

export function HiringAnalyticsPage() {
  const overview = useAnalyticsOverview();
  const funnel = useHiringFunnel();
  const timeToHire = useTimeToHire();

  return (
    <div className="space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hiring Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Funnel health and hiring velocity across your organization.</p>
      </motion.div>

      {overview.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-4 gap-5"
        >
          <motion.div variants={fadeUp}>
            <AnalyticsCard label="Open jobs" value={overview.data?.openJobs ?? 0} icon={Briefcase} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <AnalyticsCard label="Active candidates" value={overview.data?.activeCandidates ?? 0} icon={Users} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <AnalyticsCard label="Avg. time to hire" value={overview.data?.avgTimeToHireDays ? `${overview.data.avgTimeToHireDays}d` : '—'} icon={Clock} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <AnalyticsCard
              label="Offer acceptance"
              value={overview.data?.offerAcceptanceRate ? `${overview.data.offerAcceptanceRate}%` : '—'}
              icon={TrendingUp}
            />
          </motion.div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Hiring funnel" description="Applicants by stage, this quarter">
          <BarChart data={funnel.data?.stages || []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="stage" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Time to hire" description="Average days from application to offer, by month">
          <LineChart data={timeToHire.data?.points || []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip />
            <Line type="monotone" dataKey="avgDays" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}
