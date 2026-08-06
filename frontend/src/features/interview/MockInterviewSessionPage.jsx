import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, RotateCcw } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { Skeleton } from '../../shared/components/Skeleton';
import { ErrorState } from '../../shared/components/ErrorState';
import { TypewriterText } from '../../shared/components/TypewriterText';
import { cn } from '../../shared/lib/cn';
import { fadeUp } from '../../shared/lib/motion';
import { useMockInterviewSession } from './hooks';

// A simple request/response turn (not the SSE token-stream the full
// architecture calls for in §7.3) — same reasoning as CoachingChatPage:
// no live backend to stream from yet, and swapping in EventSource later only
// touches the hook, not this page. TypewriterText below simulates the reveal
// so it at least *feels* like streaming today.
export function MockInterviewSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { session, isLoading, error, respond, respondError, isResponding } = useMockInterviewSession(sessionId);
  const [answer, setAnswer] = useState('');
  const bottomRef = useRef(null);
  const prevLengthRef = useRef(0);
  const [freshIndex, setFreshIndex] = useState(-1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.transcript?.length]);

  useEffect(() => {
    if (session?.status === 'completed') {
      navigate(`/app/interview/feedback/${sessionId}`, { replace: true });
    }
  }, [session?.status, sessionId, navigate]);

  // Only the message that just arrived should type itself out — reopening
  // this page later (or re-rendering for an unrelated reason) must not
  // replay the whole conversation's animation from scratch.
  useEffect(() => {
    const length = session?.transcript?.length || 0;
    if (length > prevLengthRef.current) setFreshIndex(length - 1);
    prevLengthRef.current = length;
  }, [session?.transcript?.length]);

  if (isLoading) return <Skeleton className="h-96 w-full max-w-2xl mx-auto" />;
  if (error || !session) return <ErrorState onRetry={() => window.location.reload()} />;

  // Answer is only cleared on success — a failed request keeps the typed
  // text in the box instead of silently discarding it, so "Retry" doesn't
  // require retyping.
  function handleSubmit(e) {
    e.preventDefault();
    if (!answer.trim()) return;
    respond(answer.trim(), { onSuccess: () => setAnswer('') });
  }

  return (
    <div className="max-w-2xl mx-auto flex h-[calc(100vh-7rem)] flex-col">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <h1 className="text-base font-semibold text-slate-900">Mock Interview — {session.targetRole}</h1>
        <p className="text-xs text-slate-500 mt-0.5">Question {session.transcript.filter((t) => t.role === 'assistant').length} of {session.totalQuestions || '—'}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {session.transcript.map((turn, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className={cn('flex', turn.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-xl px-4 py-2.5 text-sm shadow-sm',
                turn.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-violet-50 text-slate-800 border border-violet-200'
              )}
            >
              {turn.role === 'assistant' ? (
                <TypewriterText text={turn.text} active={i === freshIndex} />
              ) : (
                turn.text
              )}
            </div>
          </motion.div>
        ))}
        {isResponding && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm text-slate-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 [animation-delay:300ms]" />
            </div>
          </motion.div>
        )}
        {respondError && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
              Couldn't send that answer.
              <button
                type="button"
                onClick={() => respond(answer.trim(), { onSuccess: () => setAnswer('') })}
                className="inline-flex items-center gap-1 font-medium underline hover:text-rose-800"
              >
                <RotateCcw size={13} /> Retry
              </button>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 pt-3 mt-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
          }}
          rows={2}
          placeholder="Type your answer..."
          className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        />
        <Button type="submit" disabled={!answer.trim()} loading={isResponding}>
          <Send size={15} />
        </Button>
      </form>
    </div>
  );
}
