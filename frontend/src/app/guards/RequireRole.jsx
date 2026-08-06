import { Navigate, Outlet } from 'react-router-dom';
import { useOrg } from '../../features/organizations/OrgContext';

// roles: array of allowed role strings for this branch of the route tree,
// e.g. <RequireRole roles={['recruiter', 'hiring_manager', 'org_admin']} />
export function RequireRole({ roles }) {
  const { role } = useOrg();

  if (!roles.includes(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
}
