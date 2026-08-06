import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThumbsUp, TrendingUp } from 'lucide-react';
import { AIInsightCard } from '../../shared/components/AIInsightCard';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Skeleton } from '../../shared/components/Skeleton';
import { ErrorState } from '../../shared/components/ErrorState';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useMockInterviewSession } from './hooks';

export function InterviewFeedbackPage() {
  const { sessionId } = useParams();
  const { session, isLoading, error, refetch } = useMockInterviewSession(sessionId);

  if (isLoading) return <Skeleton className="h-64 w-full max-w-2xl mx-auto" />;
  if (error || !session) return <ErrorState onRetry={refetch} />;

  const feedback = session.feedback || { strengths: [], improvements: [], scorePerQuestion: [] };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Interview Feedback</h1>
        <p className="text-sm text-slate-500 mt-1">{session.targetRole} · {new Date(session.createdAt).toLocaleDateString()}</p>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid sm:grid-cols-2 gap-5">
        <motion.div variants={fadeUp}>
          <AIInsightCard title="Strengths">
            <ul className="space-y-1.5">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ThumbsUp size={14} className="mt-0.5 shrink-0 text-violet-600" />
                  {s}
                </li>
              ))}
            </ul>
          </AIInsightCard>
        </motion.div>

        <motion.div variants={fadeUp}>
          <AIInsightCard title="Areas to improve">
            <ul className="space-y-1.5">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <TrendingUp size={14} className="mt-0.5 shrink-0 text-violet-600" />
                  {s}
                </li>
              ))}
            </ul>
          </AIInsightCard>
        </motion.div>
      </motion.div>

      {feedback.scorePerQuestion.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Per-question scores</h2>
          <div className="space-y-3">
            {feedback.scorePerQuestion.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate pr-3">{q.question}</span>
                <Badge variant={q.score >= 70 ? 'success' : q.score >= 50 ? 'warning' : 'danger'}>{q.score}/100</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button as={Link} to="/app/interview/mock" variant="secondary">
        Back to Mock Interview
      </Button>
    </div>
  );
}
