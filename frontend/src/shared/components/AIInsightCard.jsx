import { Sparkles } from 'lucide-react';
import { cn } from '../lib/cn';

// The one visual marker for "this came from AI" used everywhere in the app —
// ATS feedback, skill gap reasoning, candidate summaries, interview feedback.
// Users should recognize AI-generated content at a glance without reading it,
// which is why this never shares styling with a regular Card.
export function AIInsightCard({ title, children, className }) {
  return (
    <div className={cn('rounded-xl border border-violet-200 bg-violet-50/50 p-5', className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white">
          <Sparkles size={13} />
        </div>
        <h3 className="text-sm font-semibold text-violet-900">{title}</h3>
      </div>
      <div className="text-sm text-slate-700 space-y-2">{children}</div>
    </div>
  );
}
