import { useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../features/auth/AuthContext';
import { useOrg } from '../../features/organizations/OrgContext';
import { cn } from '../lib/cn';

const dropdownMotion = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -4 },
  transition: { duration: 0.15 },
};

export function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { orgName, memberships, activeOrgId, switchOrg } = useOrg();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-1">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <Menu size={19} />
        </button>

        <div className="relative">
          {memberships.length > 1 ? (
            <button
              onClick={() => setOrgMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {orgName}
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          ) : (
            <span className="px-2 text-sm font-medium text-slate-700">{orgName}</span>
          )}

          <AnimatePresence>
            {orgMenuOpen && (
              <motion.div
                {...dropdownMotion}
                className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-md"
              >
                {memberships.map((m) => (
                  <button
                    key={m.orgId}
                    onClick={() => {
                      switchOrg(m.orgId);
                      setOrgMenuOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50',
                      m.orgId === activeOrgId && 'font-medium text-indigo-700'
                    )}
                  >
                    {m.orgName}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button aria-label="Notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={18} strokeWidth={1.75} />
        </button>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                {...dropdownMotion}
                className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-md"
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
