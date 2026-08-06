import { Card } from './Card';

export function TestimonialCard({ quote, name, role }) {
  return (
    <Card variant="elevated">
      <p className="text-sm leading-relaxed text-slate-600">&ldquo;{quote}&rdquo;</p>
      <div className="mt-5 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{role}</p>
        </div>
      </div>
    </Card>
  );
}
