import { Button } from './Button';

// The backend paginates by cursor, not page number (see docs/ARCHITECTURE.md
// §4.4) — there is no "jump to page 5" with cursor pagination, so the UI is a
// single Load more action rather than numbered page links.
export function Pagination({ hasMore, loadMore, isLoadingMore }) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center pt-4">
      <Button variant="secondary" size="sm" onClick={() => loadMore()} loading={isLoadingMore}>
        Load more
      </Button>
    </div>
  );
}
