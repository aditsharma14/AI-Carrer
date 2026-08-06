import { Map, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../shared/lib/cn';
import { EmptyState } from '../../shared/components/EmptyState';
import { Skeleton } from '../../shared/components/Skeleton';
import { Badge } from '../../shared/components/Badge';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useLatestSkillGap } from '../coaching/hooks';
import { useLatestLearningRecommendations } from '../learning/hooks';

// Priority drives both the badge color and the timeline marker color, so a
// seeker can scan the left rail alone and see urgency without reading text.
const PRIORITY_STYLES = {
  high: { dot: 'bg-rose-500', badge: 'danger' },
  medium: { dot: 'bg-amber-500', badge: 'warning' },
  low: { dot: 'bg-slate-400', badge: 'neutral' },
};

// There's no dedicated "Career Roadmap" AI service in the backend — this page
// is a presentation layer that synthesizes the Skill Gap Analyzer's output
// with the Learning Recommendation Engine's output into one ordered timeline,
// rather than introducing a twelfth AI service for what is really a view concern.
export function CareerRoadmapPage() {
  const skillGap = useLatestSkillGap();
  const learning = useLatestLearningRecommendations();

  const isLoading = skillGap.isLoading || learning.isLoading;
  const gaps = [...(skillGap.data?.gaps || [])].sort((a, b) =>
    a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
  );

  function resourcesFor(skill) {
    return (learning.data?.items || []).filter((item) => item.skill === skill);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Career Roadmap</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your skill gaps, ordered by priority, with resources to close each one.
        </p>
      </motion.div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && gaps.length === 0 && (
        <EmptyState
          icon={Map}
          title="No roadmap yet"
          description="Run a skill gap analysis to generate your roadmap."
        />
      )}

      {gaps.length > 0 && (
        <motion.ol
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative space-y-6"
        >
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-slate-200" aria-hidden="true" />

          {gaps.map((gap, i) => {
            const style = PRIORITY_STYLES[gap.priority] || PRIORITY_STYLES.low;
            const resources = resourcesFor(gap.skill);
            return (
              <motion.li key={gap.skill} variants={fadeUp} className="relative pl-11">
                <span
                  className={cn(
                    'absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ring-4 ring-slate-50',
                    style.dot
                  )}
                >
                  {i + 1}
                </span>

                <div className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{gap.skill}</p>
                    <Badge variant={style.badge}>{gap.priority} priority</Badge>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {resources.map((r, j) => (
                      <li key={j} className="flex items-center gap-1.5 text-sm text-slate-600">
                        <ArrowRight size={13} className="shrink-0 text-indigo-400" />
                        {r.title}
                      </li>
                    ))}
                    {resources.length === 0 && (
                      <li className="text-sm text-slate-400">No matched resource yet</li>
                    )}
                  </ul>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      )}
    </div>
  );
}
