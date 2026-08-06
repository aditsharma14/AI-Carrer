import {
  FileText, Target, Map, GraduationCap, Mic, Briefcase, Users, Sparkles, BarChart3, MessageSquare,
} from 'lucide-react';
import { FeatureCard } from '../../shared/components/FeatureCard';
import { SectionTitle } from '../../shared/components/SectionTitle';
import { Badge } from '../../shared/components/Badge';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';

const SEEKER = [
  { icon: FileText, title: 'Resume Analyzer & ATS Score', description: 'Upload a resume and get a reproducible ATS score plus section-by-section AI suggestions.' },
  { icon: Target, title: 'Skill Gap Analysis', description: 'Compare your skills against any target role and see exactly what to learn next.' },
  { icon: Map, title: 'Career Roadmap', description: 'Your skill gaps, ordered by priority, with resources to close each one.' },
  { icon: GraduationCap, title: 'Learning Recommendations', description: 'Curated courses and resources matched to your specific gaps — never invented links.' },
  { icon: MessageSquare, title: 'AI Career Coach', description: 'A conversational coach that has actually read your resume and your scores.' },
  { icon: Mic, title: 'Mock Interviews', description: 'Practice with AI-generated questions and get structured, evidence-based feedback.' },
];

const RECRUITER = [
  { icon: Briefcase, title: 'AI Job Matching', description: 'Every applicant scored against your job requirements the moment they apply.' },
  { icon: Users, title: 'Candidate Ranking & Comparison', description: 'A ranked, explainable shortlist instead of a folder of unsorted resumes.' },
  { icon: Sparkles, title: 'AI Screening & Summaries', description: 'Evidence-based candidate summaries that flag real gaps, never speculation.' },
  { icon: Mic, title: 'Interview Generator', description: 'Role-grounded interview questions in seconds, technical or behavioral.' },
  { icon: BarChart3, title: 'Hiring Analytics', description: 'Funnel health and time-to-hire, visible without exporting a spreadsheet.' },
];

function FeatureGrid({ items, tone }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((f) => (
        <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} tone={tone} />
      ))}
    </div>
  );
}

export function FeaturesPage() {
  return (
    <div className="bg-canvas">
      <PublicHeader />

      <section className="mx-auto max-w-5xl px-6 pt-20 pb-12">
        <SectionTitle
          eyebrow="Features"
          title="Everything runs on the same AI core"
          description="Resume parsing, scoring, and matching are the same underlying services on both sides of the platform — just orchestrated differently for job seekers and recruiters."
        />
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="info">Job seekers</Badge>
        </div>
        <FeatureGrid items={SEEKER} tone="indigo" />
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="ai">Recruiters</Badge>
        </div>
        <FeatureGrid items={RECRUITER} tone="violet" />
      </section>

      <PublicFooter />
    </div>
  );
}
