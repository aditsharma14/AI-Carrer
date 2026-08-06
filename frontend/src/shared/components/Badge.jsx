import { cn } from '../lib/cn';

// Semantic colors are never reused for anything else in the app — color
// always means the same thing (success/warning/danger/info/ai/neutral).
const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  info: 'bg-sky-50 text-sky-700',
  ai: 'bg-violet-100 text-violet-700',
  // Landing-page-only eyebrow pill ("AI-powered", "New") — a gradient accent
  // is reserved for marketing copy, never used for data-driven states.
  gradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
};

export function Badge({ variant = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
