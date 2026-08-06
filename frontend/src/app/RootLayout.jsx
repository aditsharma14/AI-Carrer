import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { OfflineBanner } from '../shared/components/OfflineBanner';

// Outermost layout — just the toast portal every page can fire into, plus
// the top-level <Outlet/> the router renders public/app branches through.
// OfflineBanner lives here (not in DashboardLayout) so both the public site
// and the authenticated app get it from one place.
export function RootLayout() {
  return (
    <>
      <OfflineBanner />
      <Outlet />
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </>
  );
}
