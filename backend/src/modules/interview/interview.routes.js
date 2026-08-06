const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const rateLimitTier = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const interviewController = require('./interview.controller');
const { generateInterviewSchema, startMockSessionSchema, respondSchema } = require('./interview.validation');

const router = express.Router();

// Self-scoped throughout — generate operates on either the caller's own
// practice request (targetRole) or a job already scoped to the caller's own
// org (jobId, checked in interview.service.js via jobRepository.findByIdScoped),
// and every mock-sessions route only ever touches the calling user's own
// sessions. No requirePermission/requireRole needed, same precedent as
// coaching.routes.js and matching.routes.js's seeker-facing routes.
router.post(
  '/interviews/generate',
  authenticate,
  resolveTenant(),
  rateLimitTier('aiHeavy'),
  validate(generateInterviewSchema),
  asyncHandler(interviewController.generate)
);

router.get('/interviews/mock-sessions', authenticate, resolveTenant(), asyncHandler(interviewController.listMockSessions));
router.post(
  '/interviews/mock-sessions',
  authenticate,
  resolveTenant(),
  validate(startMockSessionSchema),
  asyncHandler(interviewController.startMockSession)
);
router.get('/interviews/mock-sessions/:sessionId', authenticate, resolveTenant(), asyncHandler(interviewController.getMockSession));
router.post(
  '/interviews/mock-sessions/:sessionId/respond',
  authenticate,
  resolveTenant(),
  rateLimitTier('aiHeavy'),
  validate(respondSchema),
  asyncHandler(interviewController.respond)
);

module.exports = router;
