import { cn } from '../lib/cn';

// One heading pattern reused at the top of every landing-page section —
// eyebrow pill, headline, optional centered subtext — so sections read as
// one connected page instead of independently designed blocks.
export function SectionTitle({ eyebrow, title, description, align = 'center', className }) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl text-left', className)}>
      {eyebrow && (
        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-lg text-slate-600">{description}</p>}
    </div>
  );
}
