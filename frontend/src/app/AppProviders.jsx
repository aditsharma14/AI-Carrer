import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './queryClient';
import { AuthProvider } from '../features/auth/AuthContext';
import { OrgProvider } from '../features/organizations/OrgContext';
import { AppRouter } from './router';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';

// Provider order matters: Auth must wrap Org (org membership lookup needs an
// authenticated user), and both must wrap the Router (route guards read both contexts).
// ErrorBoundary sits outermost so it catches throws from context providers too.
export function AppProviders() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <OrgProvider>
              <AppRouter />
            </OrgProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
