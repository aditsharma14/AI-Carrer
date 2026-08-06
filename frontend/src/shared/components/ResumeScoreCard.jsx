import { cn } from '../lib/cn';

function scoreColor(score) {
  if (score >= 80) return { ring: '#059669', text: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (score >= 60) return { ring: '#d97706', text: 'text-amber-700', bg: 'bg-amber-50' };
  return { ring: '#e11d48', text: 'text-rose-700', bg: 'bg-rose-50' };
}

// A conic-gradient ring instead of a chart library — one number on a dial
// doesn't justify pulling recharts in; this is plain CSS.
export function ResumeScoreCard({ score, label = 'ATS Score', breakdown }) {
  const { ring, text, bg } = scoreColor(score);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-5">
        <div
          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${ring} ${score * 3.6}deg, #e2e8f0 0deg)` }}
        >
          <div className={cn('flex h-15 w-15 items-center justify-center rounded-full bg-white text-lg font-semibold', text)}>
            {score}
          </div>
        </div>
        <div>
          <p className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', bg, text)}>{label}</p>
          <p className="mt-1 text-sm text-slate-500">out of 100</p>
        </div>
      </div>

      {breakdown && (
        <div className="mt-4 space-y-2.5">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>{item.label}</span>
                <span className="font-medium">{item.value}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-indigo-500"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
