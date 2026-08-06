import { SectionTitle } from '../../shared/components/SectionTitle';
import { StatCard } from '../../shared/components/StatCard';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';

const STATS = [
  { value: 10000, suffix: '+', label: 'Resumes scored' },
  { value: 500, suffix: '+', label: 'Companies hiring' },
  { value: 1, label: 'AI core, two products' },
];

export function AboutPage() {
  return (
    <div className="bg-canvas">
      <PublicHeader />

      <section className="mx-auto max-w-2xl px-6 pt-20 pb-8">
        <SectionTitle align="left" eyebrow="About" title="About CareerCoach AI" />

        <div className="mt-6 space-y-5 leading-relaxed text-slate-600">
          <p>
            Hiring is broken from both sides of the table. Job seekers send resumes into systems they can't see
            inside of, and recruiters drown in applications they can't all read carefully. We built CareerCoach AI
            on a simple bet: both problems are solved by the same underlying AI — resume parsing, scoring, and
            matching — just pointed in different directions.
          </p>
          <p>
            For job seekers, that means an ATS score you can actually trust, a skill gap analysis grounded in your
            real resume, and mock interviews that give you evidence-based feedback instead of generic tips.
          </p>
          <p>
            For recruiters, it means every applicant arrives pre-scored against your actual job requirements, with
            a ranked, explainable shortlist instead of a folder of unsorted PDFs.
          </p>
          <p>One AI core. Two products. Built to be trusted by both sides.</p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-24">
        <div className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-white py-8 shadow-sm">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
