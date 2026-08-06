const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const { requirePermission, requireRole } = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const jobController = require('./job.controller');
const { createJobSchema, updateJobSchema, listJobsQuerySchema } = require('./job.validation');

const RECRUITER_ROLES = ['org_admin', 'hiring_manager', 'recruiter'];

const router = express.Router();

// IMPORTANT — route-ordering hazard across files: matching.routes.js
// registers a literal '/jobs/matches' path that looks like this module's
// dynamic '/jobs/:jobId'. Whichever router routes/index.js mounts first wins
// for any overlapping literal segment, exactly like Express resolves routes
// within a single file in registration order. routes/index.js MUST mount
// matching.routes.js before job.routes.js — see its own header comment.

// Recruiter-facing CRUD.
router.get('/jobs', authenticate, resolveTenant(), requireRole(...RECRUITER_ROLES), validate(listJobsQuerySchema), asyncHandler(jobController.listJobs));
router.post('/jobs', authenticate, resolveTenant(), requirePermission('job:create'), validate(createJobSchema), asyncHandler(jobController.createJob));
router.get('/jobs/:jobId', authenticate, resolveTenant(), requireRole(...RECRUITER_ROLES), asyncHandler(jobController.getJob));
router.patch('/jobs/:jobId', authenticate, resolveTenant(), requirePermission('job:edit:own'), validate(updateJobSchema), asyncHandler(jobController.updateJob));

// Seeker-facing — applying is the one write where the acting org isn't
// req.tenant.id (the job lives in a different org than the candidate's own).
// See job.service.js's applyToJob() and application.model.js for why.
router.post('/jobs/:jobId/apply', authenticate, resolveTenant(), asyncHandler(jobController.applyToJob));

module.exports = router;
