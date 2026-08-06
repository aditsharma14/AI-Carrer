import { Search } from 'lucide-react';
import { cn } from '../lib/cn';

export function SearchInput({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm
                   placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      />
    </div>
  );
}
