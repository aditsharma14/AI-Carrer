// Thin convenience over React Query's useInfiniteQuery: every cursor-paginated
// list page (resumes, candidates, jobs) needs the same three things — a flat
// items array, hasMore, and a loadMore callback — so that flattening logic
// lives here once instead of being copy-pasted into every feature's hooks.js.
export function flattenPages(infiniteQueryResult) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = infiniteQueryResult;
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  return { items, hasMore: !!hasNextPage, loadMore: fetchNextPage, isLoadingMore: isFetchingNextPage };
}
