import { Outlet } from 'react-router-dom';
import { useOrg } from '../../features/organizations/OrgContext';
import { Skeleton } from '../../shared/components/Skeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { Building2 } from 'lucide-react';

// Resolves the active tenant before any child route renders, so nothing
// downstream has to handle "no org yet" as a loading edge case of its own.
export function RequireOrgContext() {
  const { activeOrgId, isLoading, memberships } = useOrg();

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!memberships.length || !activeOrgId) {
    return (
      <EmptyState
        icon={Building2}
        title="No organization found"
        description="You're not a member of any organization yet."
      />
    );
  }

  return <Outlet />;
}
