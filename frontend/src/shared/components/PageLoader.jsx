import { Skeleton } from './Skeleton';

// Suspense fallback for lazy-loaded route chunks (see app/router.jsx). Kept
// generic — a page-shaped skeleton, not a spinner — so the layout doesn't
// visibly jump once the real page mounts.
export function PageLoader() {
  return (
    <div className="space-y-4 p-1" role="status" aria-label="Loading page">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
