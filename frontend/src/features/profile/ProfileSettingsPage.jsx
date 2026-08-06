import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { profileSchema, changePasswordSchema } from '../../shared/lib/schemas/profile.schema';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Card, CardHeader } from '../../shared/components/Card';
import { fadeUp } from '../../shared/lib/motion';
import { useAuth } from '../auth/AuthContext';
import { useUpdateProfile, useChangePassword } from './hooks';

export function ProfileSettingsPage() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal account details.</p>
      </motion.div>

      <Card>
        <CardHeader title="Profile" />
        <form
          onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))}
          className="space-y-4"
        >
          <Input label="Name" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
          <Input label="Email" type="email" error={profileForm.formState.errors.email?.message} {...profileForm.register('email')} />
          <div className="flex justify-end">
            <Button type="submit" loading={updateProfile.isPending}>Save changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <form
          onSubmit={passwordForm.handleSubmit((values) => {
            changePassword.mutate(values, { onSuccess: () => passwordForm.reset() });
          })}
          className="space-y-4"
        >
          <Input
            label="Current password"
            type="password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="New password"
            type="password"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="Confirm new password"
            type="password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={changePassword.isPending}>Update password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
