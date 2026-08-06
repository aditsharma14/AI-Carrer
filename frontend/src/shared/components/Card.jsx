import { cn } from '../lib/cn';

const VARIANTS = {
  default: 'border-slate-200 bg-white',
  interactive: 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md cursor-pointer transition-all',
  ai: 'border-violet-200 bg-violet-50/40',
  // Landing-page marketing cards: soft shadow + lift on hover instead of the
  // flatter dashboard card look.
  elevated: 'border-slate-200/80 bg-white shadow-md shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10 transition-all',
  // Frosted panel for content that sits on top of the hero's gradient background.
  glass: 'border-white/60 bg-white/70 backdrop-blur-md shadow-lg shadow-slate-900/5',
};

export function Card({ as: Component = 'div', variant = 'default', className, children, ...props }) {
  return (
    <Component
      className={cn('rounded-xl border shadow-sm p-5', VARIANTS[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
