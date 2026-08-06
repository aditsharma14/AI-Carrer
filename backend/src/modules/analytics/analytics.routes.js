const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const { requireRole } = require('../../middleware/rbac.middleware');
const analyticsController = require('./analytics.controller');

// Not part of the original empty-file scaffold (analytics/ only had
// orgStats.model.js + analytics.service.js) — added here because
// frontend/src/features/analytics/api.js already calls these three routes.
// Same kind of deliberate, disclosed gap-fill as resumeVersion.model.js's
// denormalized latestAtsScore field back in the Resume module.
const router = express.Router();

// No 'analytics:*' capability exists in rbac.middleware.js's PERMISSIONS map
// (analytics wasn't modeled as its own domain) — requireRole() is used
// instead, same fallback as job.routes.js's plain GET /jobs listing.
const RECRUITER_ROLES = ['org_admin', 'hiring_manager', 'recruiter'];

router.get('/analytics/overview', authenticate, resolveTenant(), requireRole(...RECRUITER_ROLES), asyncHandler(analyticsController.getOverview));
router.get('/analytics/hiring-funnel', authenticate, resolveTenant(), requireRole(...RECRUITER_ROLES), asyncHandler(analyticsController.getHiringFunnel));
router.get('/analytics/time-to-hire', authenticate, resolveTenant(), requireRole(...RECRUITER_ROLES), asyncHandler(analyticsController.getTimeToHire));

module.exports = router;
