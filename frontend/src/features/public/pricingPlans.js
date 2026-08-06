// Mirrors backend Organization.plan exactly (free | starter | growth |
// enterprise, see docs/ARCHITECTURE.md §4.1) so the plan a customer sees here
// is literally the same string stored on their org document. Shared between
// PricingPage and the landing page's pricing section so both stay in sync.
export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'For individual job seekers getting started.',
    features: ['Resume ATS scoring', 'Skill gap analysis', '3 mock interviews / month'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$49',
    period: '/mo',
    description: 'For small teams hiring occasionally.',
    features: ['Up to 3 open jobs', 'AI candidate matching', 'Candidate summaries'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$199',
    period: '/mo',
    description: 'For teams hiring regularly across roles.',
    features: ['Unlimited open jobs', 'AI screening & ranking', 'Hiring analytics', 'Team management'],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For larger orgs with custom data and compliance needs.',
    features: ['Dedicated data isolation', 'SSO', 'Custom retention policy', 'Priority support'],
  },
];
