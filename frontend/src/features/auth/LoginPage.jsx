import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginSchema } from '../../shared/lib/schemas/auth.schema';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { useLogin } from './hooks';

// Layout: a single centered card on the plain canvas background — no nav, no
// marketing chrome. Auth pages convert better when there's nothing else to
// look at, which is also why Linear/Vercel/Stripe all do the same thing.
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values) {
    try {
      await login.mutateAsync(values);
      navigate(location.state?.from?.pathname || '/app/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles size={17} />
          </div>
          <span className="text-base font-semibold text-slate-900">CareerCoach AI</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">Log in to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" loading={login.isPending}>
              Log in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
