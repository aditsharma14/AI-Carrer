import { NavLink } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/cn';
import { useOrg } from '../../features/organizations/OrgContext';
import { NAV_BY_ROLE } from '../../features/dashboard/navConfig';

function SidebarNav({ items, onNavigate }) {
  return (
    <nav className="flex-1 space-y-0.5">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
            )
          }
        >
          <Icon size={17} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// Desktop: static column. Mobile: an off-canvas drawer driven by DashboardLayout's
// mobileNavOpen state, since Navbar (which has the hamburger) and Sidebar are siblings.
export function Sidebar({ mobileOpen = false, onClose }) {
  const { role } = useOrg();
  const items = NAV_BY_ROLE[role] || [];

  return (
    <>
      <aside className="hidden h-screen w-60 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <Sparkles size={16} />
          </div>
          <span className="text-sm font-semibold text-slate-900">CareerCoach AI</span>
        </div>
        <SidebarNav items={items} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white px-3 py-4 shadow-xl md:hidden"
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">CareerCoach AI</span>
                </div>
                <button onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <SidebarNav items={items} onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
