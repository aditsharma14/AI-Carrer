import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { AIInsightCard } from '../../shared/components/AIInsightCard';
import { EmptyState } from '../../shared/components/EmptyState';
import { Target } from 'lucide-react';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useSkillGap } from '../coaching/hooks';

const PRIORITY_VARIANT = { high: 'danger', medium: 'warning', low: 'neutral' };

// Layout: a single target-role input drives the whole page — gaps and
// strengths render side by side once analyzed, so a seeker can see both
// "what's missing" and "what's already strong" in one glance.
export function SkillGapPage() {
  const [targetRole, setTargetRole] = useState('');
  const skillGap = useSkillGap(targetRole);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Skill Gap Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">
          See how your current skills compare to a target role.
        </p>
      </motion.div>

      <div className="flex gap-2">
        <Input
          placeholder="Target role, e.g. Senior Frontend Engineer"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => skillGap.trigger()} loading={skillGap.isLoading} disabled={!targetRole}>
          Analyze
        </Button>
      </div>

      {!skillGap.result && !skillGap.isLoading && (
        <EmptyState icon={Target} title="Enter a target role to get started" />
      )}

      {skillGap.result && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-5">
          <motion.div variants={fadeUp}>
            <AIInsightCard title="Gaps to close">
              <div className="space-y-2.5">
                {skillGap.result.gaps.map((gap) => (
                  <div key={gap.skill} className="flex items-center justify-between">
                    <span>{gap.skill}</span>
                    <Badge variant={PRIORITY_VARIANT[gap.priority] || 'neutral'}>{gap.priority}</Badge>
                  </div>
                ))}
              </div>
            </AIInsightCard>
          </motion.div>

          <motion.div variants={fadeUp}>
            <AIInsightCard title="Your strengths">
              <div className="flex flex-wrap gap-1.5">
                {skillGap.result.strengths.map((s) => <Badge key={s} variant="success">{s}</Badge>)}
              </div>
            </AIInsightCard>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
