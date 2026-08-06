const { z } = require('zod');

const createManualResumeSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(160),
    summary: z.string().max(600).optional(),
    skills: z.array(z.string()).default([]),
    experience: z
      .array(
        z.object({
          title: z.string().min(1),
          company: z.string().min(1),
          startDate: z.string().min(1),
          endDate: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .default([]),
    education: z
      .array(
        z.object({
          school: z.string().min(1),
          degree: z.string().min(1),
          year: z.string().optional(),
        })
      )
      .default([]),
  }),
});

const requestAtsScoreSchema = z.object({
  body: z.object({
    // Omit jobId entirely -> generic ATS ruleset instead of a job-specific one.
    jobId: z.string().optional(),
  }),
});

const listResumesSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
  }),
});

module.exports = { createManualResumeSchema, requestAtsScoreSchema, listResumesSchema };
