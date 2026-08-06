const { z } = require('zod');

const createJobSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120),
    location: z.string().max(120).optional(),
    employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']).optional(),
    description: z.string().min(20).max(8000),
    status: z.enum(['draft', 'open']).optional(),
  }),
});

const updateJobSchema = z.object({
  params: z.object({ jobId: z.string() }),
  body: z.object({
    title: z.string().min(2).max(120).optional(),
    location: z.string().max(120).optional(),
    employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']).optional(),
    description: z.string().min(20).max(8000).optional(),
    status: z.enum(['draft', 'open', 'closed']).optional(),
  }),
});

const listJobsQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    status: z.enum(['draft', 'open', 'closed']).optional(),
    search: z.string().optional(),
  }),
});

module.exports = { createJobSchema, updateJobSchema, listJobsQuerySchema };
