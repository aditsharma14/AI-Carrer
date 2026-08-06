import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Skeleton } from '../../shared/components/Skeleton';

// Enforced once at the route level rather than per-component — a forgotten
// `if (!user) return null` inside one page is a real vulnerability class; a
// missing route guard means the route renders nothing at all.
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
