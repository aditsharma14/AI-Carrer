import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { Card, CardHeader } from '../../shared/components/Card';
import { AIInsightCard } from '../../shared/components/AIInsightCard';
import { EmptyState } from '../../shared/components/EmptyState';
import { fadeUp, staggerContainer } from '../../shared/lib/motion';
import { useGenerateInterview } from './hooks';

const TYPE_OPTIONS = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'screening', label: 'Screening' },
];

// Recruiter-facing use of the same /interviews/generate endpoint the seeker's
// Mock Interview flow uses — here the payload carries jobId (when launched
// from a job posting) so questions are grounded in that role's requirements
// instead of a free-text target role.
export function InterviewGeneratorPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') || undefined;
  const [targetRole, setTargetRole] = useState('');
  const [type, setType] = useState('technical');
  const generate = useGenerateInterview();

  function handleGenerate() {
    generate.trigger(jobId ? { jobId, type } : { targetRole, type });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Interview Generator</h1>
        <p className="text-sm text-slate-500 mt-1">
          {jobId ? 'Generating questions grounded in this job posting.' : 'Generate interview questions for any role.'}
        </p>
      </motion.div>

      <Card>
        <CardHeader title="Generate questions" description="Choose a question type and let AI draft them." />
        <div className="flex flex-col sm:flex-row gap-3">
          {!jobId && (
            <Input
              placeholder="Target role, e.g. Staff Backend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="flex-1"
            />
          )}
          <FilterSelect value={type} onChange={setType} options={TYPE_OPTIONS} />
          <Button onClick={handleGenerate} disabled={!jobId && !targetRole} loading={generate.isLoading}>
            <Sparkles size={15} /> Generate
          </Button>
        </div>
      </Card>

      {!generate.result && !generate.isLoading && (
        <EmptyState icon={Sparkles} title="No questions generated yet" />
      )}

      {generate.result?.questions?.length > 0 && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {generate.result.questions.map((q, i) => (
            <motion.div key={i} variants={fadeUp}>
              <AIInsightCard title={`Question ${i + 1}`}>
                <p className="font-medium text-slate-800">{q.question}</p>
                {q.rationale && <p className="text-slate-500">{q.rationale}</p>}
              </AIInsightCard>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
