import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../shared/lib/cn';
import { signupSchema } from '../../shared/lib/schemas/auth.schema';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { useSignup } from './hooks';

const ROLE_OPTIONS = [
  { value: 'seeker', label: "I'm job seeking" },
  { value: 'org_admin', label: "I'm hiring" },
];

export function SignupPage() {
  const navigate = useNavigate();
  const signup = useSignup();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'seeker' },
  });

  const role = watch('role');

  async function onSubmit(values) {
    try {
      await signup.mutateAsync(values);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not create your account');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles size={17} />
          </div>
          <span className="text-base font-semibold text-slate-900">CareerCoach AI</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">Start free — no credit card required.</p>

          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      field.value === opt.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Full name" placeholder="Jane Doe" error={errors.name?.message} {...register('name')} />
            <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
            <Input
              label={role === 'org_admin' ? 'Company name' : 'A name for your workspace'}
              placeholder={role === 'org_admin' ? 'Acme Inc.' : 'My Career Workspace'}
              error={errors.organizationName?.message}
              {...register('organizationName')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" loading={signup.isPending}>
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
