import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Card, CardHeader } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Skeleton } from '../../shared/components/Skeleton';
import { fadeUp } from '../../shared/lib/motion';
import { useOrgSettings, useUpdateOrgSettings } from './hooks';

export function OrgSettingsPage() {
  const { data, isLoading } = useOrgSettings();

  // Guard before the form mounts (rather than initializing state to empty
  // values and syncing from `data` via an effect) — by the time OrgSettingsForm
  // renders, `data` is guaranteed to exist, so useState's initial value is
  // already correct and never needs a second render to catch up.
  if (isLoading || !data) return <Skeleton className="h-64 w-full max-w-xl mx-auto" />;

  return <OrgSettingsForm data={data} />;
}

function OrgSettingsForm({ data }) {
  const updateSettings = useUpdateOrgSettings();
  const [name, setName] = useState(data.name);
  const [allowSeekerSelfSignup, setAllowSeekerSelfSignup] = useState(data.settings?.allowSeekerSelfSignup ?? true);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Organization Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your organization's profile and access policy.</p>
      </motion.div>

      <Card>
        <CardHeader title="General" action={<Badge variant="info">{data.plan} plan</Badge>} />
        <div className="space-y-5">
          <Input label="Organization name" value={name} onChange={(e) => setName(e.target.value)} />

          <label
            htmlFor="allowSeekerSelfSignup"
            aria-label="Allow seeker self-signup"
            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">Allow seeker self-signup</p>
              <p className="text-xs text-slate-500 mt-0.5">Job seekers can join this org without an invite.</p>
            </div>
            <input
              id="allowSeekerSelfSignup"
              type="checkbox"
              checked={allowSeekerSelfSignup}
              onChange={(e) => setAllowSeekerSelfSignup(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            />
          </label>

          <div className="flex justify-end">
            <Button
              onClick={() => updateSettings.mutate({ name, settings: { allowSeekerSelfSignup } })}
              loading={updateSettings.isPending}
            >
              Save changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
