import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, FileText, Target, Mic, Briefcase, Users, BarChart3, Sparkles, Map, Pencil, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { SectionTitle } from '../../shared/components/SectionTitle';
import { StatCard } from '../../shared/components/StatCard';
import { FeatureCard } from '../../shared/components/FeatureCard';
import { PricingCard } from '../../shared/components/PricingCard';
import { TestimonialCard } from '../../shared/components/TestimonialCard';
import { AIInsightCard } from '../../shared/components/AIInsightCard';
import { ResumeScoreCard } from '../../shared/components/ResumeScoreCard';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { PRICING_PLANS } from './pricingPlans';
import { fadeUp, staggerContainer, viewportFadeUp } from '../../shared/lib/motion';
import { cn } from '../../shared/lib/cn';

const STATS = [
  { value: 10000, suffix: '+', label: 'Resumes scored' },
  { value: 3, suffix: 'x', label: 'Faster job search' },
  { value: 500, suffix: '+', label: 'Companies hiring' },
];

const SEEKER_FEATURES = [
  { icon: FileText, title: 'ATS-ready resumes', description: 'Get an instant score and concrete fixes before you apply.' },
  { icon: Target, title: 'Skill gap analysis', description: 'See exactly what separates you from your target role.' },
  { icon: Mic, title: 'Mock interviews', description: 'Practice with AI-generated questions and structured feedback.' },
];

const HIRING_FEATURES = [
  { icon: Briefcase, title: 'AI candidate matching', description: 'Every applicant scored against your job requirements automatically.' },
  { icon: Users, title: 'Ranked shortlists', description: 'Stop reading every resume — review a ranked, explainable shortlist.' },
  { icon: BarChart3, title: 'Hiring analytics', description: 'Funnel health and time-to-hire, visible at a glance.' },
];

const WORKFLOW_STEPS = [
  { step: '01', title: 'Upload your resume', description: 'Drop in a PDF or DOCX — parsed and structured in seconds.' },
  { step: '02', title: 'Get scored instantly', description: 'A reproducible ATS score with section-by-section AI suggestions.' },
  { step: '03', title: 'Close your skill gaps', description: 'See exactly what separates you from your target role.' },
  { step: '04', title: 'Practice interviews', description: 'Mock interviews with structured, evidence-based feedback.' },
];

const PREVIEWS = [
  { id: 'ats', label: 'ATS Analysis', icon: FileText },
  { id: 'interview', label: 'AI Interview', icon: Mic },
  { id: 'builder', label: 'Resume Builder', icon: Pencil },
  { id: 'roadmap', label: 'Career Roadmap', icon: Map },
];

const ROADMAP_PREVIEW = [
  { skill: 'System Design', priority: 'danger', label: 'High priority' },
  { skill: 'Kubernetes', priority: 'warning', label: 'Medium priority' },
  { skill: 'GraphQL', priority: 'neutral', label: 'Low priority' },
];

const TESTIMONIALS = [
  { quote: 'The ATS score caught three formatting issues I never would have found myself. Landed two interviews the same week.', name: 'Priya Nair', role: 'Software Engineer' },
  { quote: 'We cut resume screening time by more than half. The ranked shortlist is genuinely explainable, not a black box.', name: 'Daniel Osei', role: 'Head of Talent' },
  { quote: 'Mock interviews with real feedback made me feel prepared instead of anxious walking into the real one.', name: 'Maria Gomez', role: 'Recent CS Graduate' },
];

const FAQS = [
  { q: 'Is CareerCoach AI free for job seekers?', a: 'Yes — resume scoring, skill gap analysis, and a limited number of mock interviews are free forever.' },
  { q: 'How is the ATS score calculated?', a: "We score keywords, formatting, and section completeness against real ATS parsing rules, and it's reproducible — re-running it gives you the same score." },
  { q: 'Do recruiters see the same AI as job seekers?', a: 'Yes — the same resume parsing, scoring, and matching engine powers both products, just pointed at different problems.' },
  { q: 'Can I cancel my recruiter plan anytime?', a: 'Yes, monthly plans can be cancelled anytime from your organization settings — no lock-in contracts.' },
  { q: 'Is my resume data kept private?', a: 'Your resume and interview data are scoped to your account and never shared across organizations.' },
];

function HeroWidgetCluster() {
  return (
    <div className="relative flex justify-center py-10 lg:py-0">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-10 -top-10 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl"
          animate={{ x: [0, 24, 0], y: [0, 16, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-10 -right-4 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, -14, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
          <ResumeScoreCard
            score={86}
            breakdown={[
              { label: 'Keywords', value: 92 },
              { label: 'Formatting', value: 80 },
              { label: 'Sections', value: 88 },
            ]}
          />
        </motion.div>

        <motion.div
          className="absolute -right-8 -top-10 hidden w-56 sm:block"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <AIInsightCard title="AI Suggestion" className="shadow-lg shadow-slate-900/10">
            <p className="text-xs">Quantify the impact in your "Backend Engineer" bullet for a stronger ATS match.</p>
          </AIInsightCard>
        </motion.div>

        <motion.div
          className="absolute -bottom-8 -left-8 hidden sm:block"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >
          <Card variant="glass" className="w-36 p-3">
            <p className="text-xs font-medium text-slate-500">Interview Score</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">92%</p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function ProductPreviewPanel({ activePreview }) {
  if (activePreview === 'ats') {
    return (
      <div className="mx-auto max-w-xs">
        <ResumeScoreCard
          score={86}
          breakdown={[
            { label: 'Keywords', value: 92 },
            { label: 'Formatting', value: 80 },
            { label: 'Sections', value: 88 },
          ]}
        />
      </div>
    );
  }

  if (activePreview === 'interview') {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-violet-100 bg-violet-50 px-4 py-2.5 text-sm text-slate-700">
            Tell me about a challenging project you led.
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white">
            I led the migration of our checkout service to a new queue-based architecture.
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-violet-100 bg-violet-50 px-4 py-2.5 text-sm text-slate-700">
            Strong structure — quantify the impact next time (e.g. latency or error-rate improvement).
          </div>
        </div>
      </div>
    );
  }

  if (activePreview === 'builder') {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-400">Job title</p>
          <p className="text-sm font-medium text-slate-800">Senior Backend Engineer</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-400">Summary</p>
          <p className="text-sm text-slate-800">Backend engineer with 5 years building distributed systems...</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Node.js</Badge>
          <Badge>PostgreSQL</Badge>
          <Badge>AWS</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      {ROADMAP_PREVIEW.map((item, i) => (
        <div key={item.skill} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 shrink-0 rounded-full bg-indigo-600" />
            {i < ROADMAP_PREVIEW.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
          </div>
          <div className="pb-6">
            <p className="text-sm font-semibold text-slate-900">{item.skill}</p>
            <Badge variant={item.priority} className="mt-1">{item.label}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-slate-200 py-5">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-sm font-semibold text-slate-900">{faq.q}</span>
        <ChevronDown size={18} className={cn('shrink-0 text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="pt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LandingPage() {
  const [activePreview, setActivePreview] = useState('ats');
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="bg-canvas">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-2 lg:pt-24">
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            <motion.div variants={fadeUp}>
              <Badge variant="gradient" className="mb-5">
                <Sparkles size={12} /> AI Career Copilot
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              One AI for your career.
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                One copilot for hiring.
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-md text-lg text-slate-600">
              CareerCoach AI scores resumes, closes skill gaps, and runs mock interviews for job seekers —
              and ranks, screens, and summarizes candidates for recruiters. Same AI, two sides of the table.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/signup" size="lg">
                Get started free <ArrowRight size={16} />
              </Button>
              <Button as={Link} to="/features" variant="secondary" size="lg">
                See how it works
              </Button>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-5 text-sm text-slate-500">
              Free to start · No credit card required
            </motion.p>
          </motion.div>

          <HeroWidgetCluster />
        </div>
      </section>

      {/* Trusted by / stats */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            Trusted by job seekers and hiring teams
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6">
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionTitle
          eyebrow="Features"
          title="Built for both sides of hiring"
          description="One AI core, orchestrated differently for job seekers and recruiters."
        />
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-indigo-600">For job seekers</p>
            <div className="space-y-4">
              {SEEKER_FEATURES.map((f) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} tone="indigo" />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-violet-600">For recruiters</p>
            <div className="space-y-4">
              {HIRING_FEATURES.map((f) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} tone="violet" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Workflow */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionTitle
            eyebrow="How it works"
            title="From resume to offer, one workflow"
            description="Every step runs on the same AI core — no separate tools to juggle."
          />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-slate-200 lg:block" />
            {WORKFLOW_STEPS.map((s) => (
              <motion.div key={s.step} variants={fadeUp} className="relative text-center lg:text-left">
                <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-semibold text-white lg:mx-0">
                  {s.step}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{s.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Product previews */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionTitle
          eyebrow="Product"
          title="See it before you sign up"
          description="A quick look at the AI doing the actual work."
        />
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {PREVIEWS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePreview(p.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                activePreview === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
            >
              <p.icon size={15} /> {p.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activePreview}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-8"
          >
            <Card variant="elevated" className="mx-auto max-w-2xl py-10">
              <ProductPreviewPanel activePreview={activePreview} />
            </Card>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Pricing */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
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
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionTitle eyebrow="Testimonials" title="Loved by both sides of the table" />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-14 grid gap-5 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div key={t.name} variants={fadeUp}>
              <TestimonialCard {...t} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-2xl px-6">
          <SectionTitle eyebrow="FAQ" title="Frequently asked questions" />
          <div className="mt-10">
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.q} faq={faq} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.div {...viewportFadeUp} className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ready to see it in action?</h2>
          <p className="mt-3 text-indigo-100">Free to start. No credit card required.</p>
          <Button
            as={Link}
            to="/signup"
            size="lg"
            variant="secondary"
            className="mt-8 border-transparent bg-white text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
          >
            Create your account <ArrowRight size={16} />
          </Button>
        </motion.div>
      </section>

      <PublicFooter />
    </div>
  );
}
