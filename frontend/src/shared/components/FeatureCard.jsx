import { Card } from './Card';
import { cn } from '../lib/cn';

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  violet: 'bg-violet-100 text-violet-700',
};

export function FeatureCard({ icon: Icon, title, description, tone = 'indigo', className }) {
  return (
    <Card variant="elevated" className={className}>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', TONES[tone])}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500">{description}</p>
    </Card>
  );
}
