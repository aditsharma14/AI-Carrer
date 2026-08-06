const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const rateLimitTier = require('../../middleware/rateLimit.middleware');
const learningController = require('./learning.controller');

const router = express.Router();

// Self-scoped — both routes only ever read/generate the calling user's own
// recommendations, no requirePermission/requireRole needed (same precedent
// as coaching.routes.js).
router.get('/learning/recommendations/latest', authenticate, resolveTenant(), asyncHandler(learningController.getLatest));
router.get(
  '/learning/recommendations',
  authenticate,
  resolveTenant(),
  rateLimitTier('aiHeavy'),
  asyncHandler(learningController.getRecommendations)
);

module.exports = router;
