import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

// One generic filter dropdown reused for every filter across recruiter/seeker
// pages (status, role, score range, etc.) instead of a bespoke select per page.
export function FilterSelect({ id, label, value, onChange, options, className }) {
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={!id && label ? label : undefined}
        className="h-9 appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-sm
                   text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        {label && <option value="">{label}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
    </div>
  );
}
