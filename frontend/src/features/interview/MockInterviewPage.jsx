import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { EmptyState } from '../../shared/components/EmptyState';
import { CardSkeleton } from '../../shared/components/Skeleton';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useGenerateInterview, useStartMockSession, useMockSessions } from './hooks';

const TYPE_OPTIONS = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'screening', label: 'Screening' },
];

const STATUS_VARIANT = { completed: 'success', in_progress: 'warning' };

export function MockInterviewPage() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState('');
  const [type, setType] = useState('behavioral');
  const generate = useGenerateInterview();
  const startSession = useStartMockSession();
  const { items: sessions, isLoading: loadingSessions } = useMockSessions();

  async function handleStart() {
    try {
      const interviewSet = await generate.triggerAsync({ targetRole, type });
      const session = await startSession.mutateAsync({ interviewSetId: interviewSet.interviewSetId });
      navigate(`/app/interview/mock/${session.id}`);
    } catch (err) {
      toast.error(err.message || 'Could not start the interview');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mock Interview</h1>
        <p className="text-sm text-slate-500 mt-1">
          Practice with AI-generated questions tailored to a role, then get structured feedback.
        </p>
      </motion.div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Target role, e.g. Product Manager"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="flex-1"
          />
          <FilterSelect value={type} onChange={setType} options={TYPE_OPTIONS} />
          <Button onClick={handleStart} disabled={!targetRole} loading={generate.isLoading || startSession.isPending}>
            Start <ChevronRight size={15} />
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Past sessions</h2>

        {loadingSessions && <CardSkeleton />}

        {!loadingSessions && sessions.length === 0 && (
          <EmptyState icon={Mic} title="No sessions yet" description="Your completed and in-progress sessions will show up here." />
        )}

        {sessions.length > 0 && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
            {sessions.map((s) => (
              <motion.button
                key={s.id}
                variants={fadeUp}
                onClick={() => navigate(s.status === 'completed' ? `/app/interview/feedback/${s.id}` : `/app/interview/mock/${s.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.targetRole}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={STATUS_VARIANT[s.status] || 'neutral'}>{s.status.replace('_', ' ')}</Badge>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
