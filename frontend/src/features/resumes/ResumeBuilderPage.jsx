import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { resumeBuilderSchema } from '../../shared/lib/schemas/resume.schema';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Card, CardHeader } from '../../shared/components/Card';
import { fadeUp } from '../../shared/lib/motion';
import { useUnsavedChangesWarning } from '../../shared/hooks/useUnsavedChangesWarning';
import { useCreateManualResume } from './hooks';

// Layout: one column of section cards (Basics, Experience, Education, Skills)
// rather than a multi-step wizard — a resume's sections aren't sequential
// dependencies, so there's no reason to force seekers through steps one at a time.
export function ResumeBuilderPage() {
  const navigate = useNavigate();
  const createResume = useCreateManualResume();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitSuccessful },
  } = useForm({
    resolver: zodResolver(resumeBuilderSchema),
    defaultValues: { title: '', summary: '', skills: '', experience: [], education: [] },
  });

  // Longest form in the app (Basics + repeatable Experience/Education) — the
  // one place losing unsaved work to an accidental refresh actually stings.
  useUnsavedChangesWarning(isDirty && !isSubmitSuccessful);

  const experience = useFieldArray({ control, name: 'experience' });
  const education = useFieldArray({ control, name: 'education' });

  async function onSubmit(values) {
    try {
      const resume = await createResume.mutateAsync({
        ...values,
        skills: values.skills ? values.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      navigate(`/app/resumes/${resume.id}`);
    } catch (err) {
      toast.error(err.message || 'Could not save resume');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Build a resume</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in your details — you can edit this anytime.</p>
      </motion.div>

      <Card>
        <CardHeader title="Basics" />
        <div className="space-y-4">
          <Input label="Resume name" placeholder="e.g. Senior Backend Engineer" error={errors.title?.message} {...register('title')} />
          <div>
            <label htmlFor="summary" className="text-sm font-medium text-slate-700">Summary</label>
            <textarea
              id="summary"
              rows={3}
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              placeholder="A short professional summary..."
              {...register('summary')}
            />
          </div>
          <Input label="Skills (comma separated)" placeholder="React, Node.js, SQL" {...register('skills')} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Experience"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => experience.append({ title: '', company: '', startDate: '', endDate: '', description: '' })}>
              <Plus size={14} /> Add
            </Button>
          }
        />
        <div className="space-y-4">
          {experience.fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-slate-200 p-4 space-y-3 transition-colors hover:border-slate-300">
              <div className="flex justify-end">
                <button type="button" onClick={() => experience.remove(index)} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Title" error={errors.experience?.[index]?.title?.message} {...register(`experience.${index}.title`)} />
                <Input label="Company" error={errors.experience?.[index]?.company?.message} {...register(`experience.${index}.company`)} />
                <Input label="Start date" placeholder="Jan 2022" error={errors.experience?.[index]?.startDate?.message} {...register(`experience.${index}.startDate`)} />
                <Input label="End date" placeholder="Present" {...register(`experience.${index}.endDate`)} />
              </div>
              <Input label="Description" {...register(`experience.${index}.description`)} />
            </div>
          ))}
          {experience.fields.length === 0 && <p className="text-sm text-slate-400">No experience added yet.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Education"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => education.append({ school: '', degree: '', year: '' })}>
              <Plus size={14} /> Add
            </Button>
          }
        />
        <div className="space-y-4">
          {education.fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-slate-200 p-4 space-y-3 transition-colors hover:border-slate-300">
              <div className="flex justify-end">
                <button type="button" onClick={() => education.remove(index)} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="School" error={errors.education?.[index]?.school?.message} {...register(`education.${index}.school`)} />
                <Input label="Degree" error={errors.education?.[index]?.degree?.message} {...register(`education.${index}.degree`)} />
                <Input label="Year" {...register(`education.${index}.year`)} />
              </div>
            </div>
          ))}
          {education.fields.length === 0 && <p className="text-sm text-slate-400">No education added yet.</p>}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={createResume.isPending}>
          Save resume
        </Button>
      </div>
    </form>
  );
}
