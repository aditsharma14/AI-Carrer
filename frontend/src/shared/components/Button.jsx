import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

const VARIANTS = {
  primary:
    'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25 focus-visible:outline-indigo-600',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100',
  destructive: 'bg-rose-600 text-white hover:bg-rose-700',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
};

// `as` lets callers render a Link (e.g. <Button as={Link} to="/signup">) while
// every other Button in the app shares one set of variant/size/loading rules.
export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  return (
    <Component
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-[0.98]',
        'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </Component>
  );
}
