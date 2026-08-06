const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');
const rateLimitTier = require('../../middleware/rateLimit.middleware');
const matchingController = require('./matching.controller');

const router = express.Router();

// IMPORTANT — mount this router BEFORE job.routes.js in routes/index.js.
// GET '/jobs/matches' below is a literal path with the same segment count as
// job.routes.js's dynamic GET '/jobs/:jobId' — whichever router is mounted
// first wins that match in Express's route-resolution order. See
// job.routes.js's matching header comment.

// Seeker-facing — self-scoped (operates only on the calling user's own
// resume/applications), so no requirePermission/requireRole, same precedent
// as coaching.routes.js's skill-gap and session endpoints.
router.get('/jobs/matches', authenticate, resolveTenant(), asyncHandler(matchingController.listSeekerMatches));
router.get('/jobs/:jobId/match', authenticate, resolveTenant(), asyncHandler(matchingController.getSeekerMatch));

// Recruiter-facing.
router.post(
  '/jobs/:jobId/match',
  authenticate,
  resolveTenant(),
  requirePermission('candidate:rank'),
  asyncHandler(matchingController.triggerMatching)
);
router.get(
  '/jobs/:jobId/candidates',
  authenticate,
  resolveTenant(),
  requirePermission('candidate:view'),
  asyncHandler(matchingController.listCandidates)
);
router.get(
  '/candidates/:candidateId',
  authenticate,
  resolveTenant(),
  requirePermission('candidate:view'),
  asyncHandler(matchingController.getCandidate)
);
router.post(
  '/jobs/:jobId/candidates/:candidateId/summary',
  authenticate,
  resolveTenant(),
  requirePermission('candidate:view'),
  rateLimitTier('aiHeavy'),
  asyncHandler(matchingController.generateCandidateSummary)
);

module.exports = router;
