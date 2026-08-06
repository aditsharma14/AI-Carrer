import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

// columns: [{ key, header, render(row) }]
// One table implementation for every dense list in the app (candidates, jobs,
// resumes, team members) — pages only ever define columns + data, never markup.
export function DataTable({
  columns,
  data,
  rowKey = (row) => row._id || row.id,
  isLoading,
  error,
  onRetry,
  empty,
}) {
  if (error) return <ErrorState onRetry={onRetry} />;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return empty || <EmptyState title="Nothing here yet" />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
