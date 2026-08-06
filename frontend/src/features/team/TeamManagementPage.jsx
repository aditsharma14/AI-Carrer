import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { UserMinus } from 'lucide-react';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { Card, CardHeader } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { DataTable } from '../../shared/components/DataTable';
import { fadeUp } from '../../shared/lib/motion';
import { useOrg } from '../organizations/OrgContext';
import { useOrgMembers, useInviteMember, useRemoveMember } from '../organizations/hooks';

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['recruiter', 'hiring_manager', 'interviewer', 'org_admin']),
});

const ROLE_OPTIONS = [
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'org_admin', label: 'Org Admin' },
];

export function TeamManagementPage() {
  const { role: myRole } = useOrg();
  const isAdmin = myRole === 'org_admin';
  const { data: members, isLoading, isError, refetch } = useOrgMembers();
  const invite = useInviteMember();
  const removeMember = useRemoveMember();

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'recruiter' },
  });

  function onInvite(values) {
    invite.mutate(values, { onSuccess: () => reset() });
  }

  const columns = [
    { key: 'name', header: 'Name', render: (m) => m.name },
    { key: 'email', header: 'Email', render: (m) => m.email },
    { key: 'role', header: 'Role', render: (m) => <Badge variant="info">{m.role.replace('_', ' ')}</Badge> },
    { key: 'status', header: 'Status', render: (m) => <Badge variant={m.status === 'active' ? 'success' : 'neutral'}>{m.status}</Badge> },
    ...(isAdmin
      ? [{
          key: 'actions',
          header: '',
          render: (m) => (
            <button
              onClick={() => removeMember.mutate(m.membershipId)}
              aria-label={`Remove ${m.name}`}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <UserMinus size={15} />
            </button>
          ),
        }]
      : []),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team</h1>
        <p className="text-sm text-slate-500 mt-1">Manage who has access to this organization.</p>
      </motion.div>

      {isAdmin && (
        <Card>
          <CardHeader title="Invite a teammate" />
          <form onSubmit={handleSubmit(onInvite)} className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="email@company.com" error={errors.email?.message} className="flex-1" {...register('email')} />
            <Controller
              control={control}
              name="role"
              render={({ field }) => <FilterSelect value={field.value} onChange={field.onChange} options={ROLE_OPTIONS} />}
            />
            <Button type="submit" loading={invite.isPending}>Send invite</Button>
          </form>
        </Card>
      )}

      <DataTable columns={columns} data={members} isLoading={isLoading} error={isError} onRetry={refetch} />
    </div>
  );
}
