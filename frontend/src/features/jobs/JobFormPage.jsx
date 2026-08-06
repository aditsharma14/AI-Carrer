import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobPostingSchema } from '../../shared/lib/schemas/job.schema';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';
import { Card, CardHeader } from '../../shared/components/Card';
import { FilterSelect } from '../../shared/components/FilterSelect';
import { fadeUp } from '../../shared/lib/motion';
import { useCreateJob } from './hooks';

const TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

export function JobFormPage() {
  const navigate = useNavigate();
  const createJob = useCreateJob();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: { title: '', location: '', employmentType: 'full_time', description: '', status: 'draft' },
  });

  async function onSubmit(values) {
    const job = await createJob.mutateAsync(values);
    navigate(`/app/jobs/${job.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New job posting</h1>
        <p className="text-sm text-slate-500 mt-1">
          Requirements and seniority are extracted from the description automatically once saved.
        </p>
      </motion.div>

      <Card>
        <CardHeader title="Details" />
        <div className="space-y-5">
          <Input label="Job title" error={errors.title?.message} {...register('title')} />
          <Input label="Location" placeholder="Remote" {...register('location')} />

          <div>
            <label htmlFor="employmentType" className="text-sm font-medium text-slate-700">Employment type</label>
            <Controller
              control={control}
              name="employmentType"
              render={({ field }) => (
                <FilterSelect id="employmentType" className="mt-1.5 w-full" value={field.value} onChange={field.onChange} options={TYPE_OPTIONS} />
              )}
            />
          </div>

          <div>
            <label htmlFor="description" className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              id="description"
              rows={8}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              placeholder="Responsibilities, requirements, nice-to-haves..."
              {...register('description')}
            />
            {errors.description && <p id="description-error" className="text-xs text-rose-600 mt-1">{errors.description.message}</p>}
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={createJob.isPending}>
          Save job posting
        </Button>
      </div>
    </form>
  );
}
