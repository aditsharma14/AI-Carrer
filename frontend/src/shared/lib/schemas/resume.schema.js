import { z } from 'zod';

// Shape for the manual Resume Builder form. Uploaded/parsed resumes (via the
// AI Resume Parser) produce the same shape server-side, so the builder and
// the parser converge on one structured resume format.
export const experienceEntrySchema = z.object({
  title: z.string().min(1, 'Required'),
  company: z.string().min(1, 'Required'),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export const educationEntrySchema = z.object({
  school: z.string().min(1, 'Required'),
  degree: z.string().min(1, 'Required'),
  year: z.string().optional(),
});

export const resumeBuilderSchema = z.object({
  title: z.string().min(1, 'Give this resume a name'),
  summary: z.string().max(600).optional(),
  skills: z.string().optional(), // comma-separated in the form, split on submit
  experience: z.array(experienceEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
});
