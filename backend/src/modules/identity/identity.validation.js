const { z } = require('zod');

// Every route's exact accepted shape, in one place. validate.middleware.js
// runs these before the controller — by the time a controller function
// runs, it can trust req.body matches this shape exactly.

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    password: z.string().min(8),
    organizationName: z.string().min(1).max(160),
    // 'org_admin' = "I'm starting a new company's hiring account."
    // 'seeker' = "I'm here for myself, as a job seeker."
    role: z.enum(['org_admin', 'seeker']),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

const updateOrgSettingsSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(160).optional(),
    settings: z.object({ allowSeekerSelfSignup: z.boolean() }).partial().optional(),
  }),
});

const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['org_admin', 'recruiter', 'hiring_manager', 'interviewer']),
  }),
});

module.exports = {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateOrgSettingsSchema,
  inviteMemberSchema,
};
