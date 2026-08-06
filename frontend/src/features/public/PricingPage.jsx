import { PricingCard } from '../../shared/components/PricingCard';
import { SectionTitle } from '../../shared/components/SectionTitle';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { PRICING_PLANS } from './pricingPlans';

export function PricingPage() {
  return (
    <div className="bg-canvas">
      <PublicHeader />

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-20">
        <SectionTitle
          eyebrow="Pricing"
          title="Simple, transparent pricing"
          description="Free for job seekers. Pay only once you're hiring."
        />

        <div className="mt-14 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
