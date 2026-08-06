import { z } from 'zod';

// Shape for the recruiter's job posting form. Structured requirements
// (skills, seniority) are extracted from `description` by the backend's job
// requirement-extraction step — the form only collects what a human types.
export const jobPostingSchema = z.object({
  title: z.string().min(1, 'Job title is required').max(160),
  location: z.string().max(120).optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']).default('full_time'),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(['draft', 'open', 'closed']).default('draft'),
});
