import { motion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { useOrg } from '../organizations/OrgContext';
import { WIDGETS_BY_ROLE } from './widgetRegistry';

export function Dashboard() {
  const { user } = useAuth();
  const { role } = useOrg();
  const widgets = WIDGETS_BY_ROLE[role] || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">Here's what's happening today.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {widgets.map((Widget, i) => (
          <Widget key={i} />
        ))}
      </motion.div>
    </div>
  );
}
