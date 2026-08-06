const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const rateLimitTier = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const coachingController = require('./coaching.controller');
const { sendMessageSchema, skillGapQuerySchema } = require('./coaching.validation');

const router = express.Router();

// Registered before '/coaching/skill-gap/:something'-shaped routes would be
// needed — there are none here, but kept first for readability/consistency
// with the rest of the codebase's "specific paths before :param paths" rule.
router.get(
  '/coaching/skill-gap/latest',
  authenticate,
  resolveTenant(),
  asyncHandler(coachingController.getLatestSkillGap)
);

router.get(
  '/coaching/skill-gap',
  authenticate,
  resolveTenant(),
  rateLimitTier('aiHeavy'),
  validate(skillGapQuerySchema),
  asyncHandler(coachingController.getSkillGap)
);

router.get('/coaching/sessions', authenticate, resolveTenant(), asyncHandler(coachingController.listSessions));
router.post('/coaching/sessions', authenticate, resolveTenant(), asyncHandler(coachingController.createSession));
router.post(
  '/coaching/sessions/:sessionId/messages',
  authenticate,
  resolveTenant(),
  rateLimitTier('aiHeavy'),
  validate(sendMessageSchema),
  asyncHandler(coachingController.sendMessage)
);

module.exports = router;
