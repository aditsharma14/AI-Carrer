import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../shared/components/Sidebar';
import { Navbar } from '../shared/components/Navbar';

// The shell: Sidebar + Navbar + a scrollable content area. Pages compose
// themselves inside <Outlet/> as widgets/sections — the shell never knows
// what page it's hosting.
export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Keyed by pathname so switching pages gets a brief cross-fade
              instead of an abrupt swap — mode="wait" so the old page finishes
              leaving before the new one enters, avoiding a layout-shifting
              overlap between two differently-sized pages. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
