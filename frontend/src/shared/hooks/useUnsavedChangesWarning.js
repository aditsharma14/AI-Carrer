import { useEffect } from 'react';

// Browser-level protection only: warns on tab close, refresh, or navigating
// to an external URL via the native `beforeunload` event. Deliberately does
// NOT block in-app route changes — react-router's `useBlocker` only works
// with the data-router API (`createBrowserRouter`), and this app uses the
// classic <Routes>/<Route> API. Migrating routers to get that is a bigger
// architectural change than this hook is meant to make.
export function useUnsavedChangesWarning(shouldWarn) {
  useEffect(() => {
    if (!shouldWarn) return;

    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldWarn]);
}
