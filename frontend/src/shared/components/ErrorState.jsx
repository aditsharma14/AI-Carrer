import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

// Distinct from EmptyState on purpose — "there's nothing here" (neutral) and
// "something failed" (needs a retry, gets a warning color) read very
// differently to a user and should never share one component.
export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <AlertTriangle size={22} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
