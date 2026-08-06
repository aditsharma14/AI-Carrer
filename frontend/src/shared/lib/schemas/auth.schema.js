import { z } from 'zod';

// Mirrors backend/src/modules/identity/identity.validation.js so the same
// shape is rejected client-side before a request is ever sent.
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  organizationName: z.string().min(1, 'Organization name is required'),
  role: z.enum(['org_admin', 'seeker']),
});
