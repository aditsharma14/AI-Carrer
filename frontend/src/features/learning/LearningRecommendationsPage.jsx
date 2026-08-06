import { motion } from 'framer-motion';
import { GraduationCap, ExternalLink } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { EmptyState } from '../../shared/components/EmptyState';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useLearningRecommendations } from './hooks';

export function LearningRecommendationsPage() {
  const recs = useLearningRecommendations();
  const items = recs.result?.items || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Learning Recommendations</h1>
          <p className="text-sm text-slate-500 mt-1">Based on your most recent skill gap analysis.</p>
        </div>
        <Button onClick={() => recs.trigger(undefined)} loading={recs.isLoading}>
          Get recommendations
        </Button>
      </motion.div>

      {items.length === 0 && !recs.isLoading && (
        <EmptyState
          icon={GraduationCap}
          title="No recommendations yet"
          description="Run a skill gap analysis first, then come back here."
        />
      )}

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
        {items.map((item, i) => (
          <motion.div key={i} variants={fadeUp}>
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.provider}</p>
                </div>
                <Badge variant="ai">{item.skill}</Badge>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View resource <ExternalLink size={13} />
                </a>
              )}
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
