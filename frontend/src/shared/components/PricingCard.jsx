import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { Badge } from './Badge';
import { cn } from '../lib/cn';

export function PricingCard({ plan }) {
  return (
    <Card
      variant={plan.highlighted ? 'elevated' : 'default'}
      className={cn('flex flex-col', plan.highlighted && 'border-indigo-600 ring-2 ring-indigo-100')}
    >
      {plan.highlighted && <Badge variant="gradient" className="mb-3 self-start">Most popular</Badge>}

      <h3 className="text-sm font-semibold text-slate-900">{plan.name}</h3>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {plan.price}
        {plan.period && <span className="text-sm font-normal text-slate-500">{plan.period}</span>}
      </p>
      <p className="mt-1 text-sm text-slate-500">{plan.description}</p>

      <ul className="mt-5 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        as={Link}
        to="/signup"
        variant={plan.highlighted ? 'primary' : 'secondary'}
        className="mt-6 w-full justify-center"
      >
        {plan.id === 'enterprise' ? 'Contact sales' : 'Get started'}
      </Button>
    </Card>
  );
}
