const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const aiJobController = require('./aiJob.controller');

const router = express.Router();

// The one generic endpoint every async AI feature polls — see
// docs/ARCHITECTURE.md §13. The frontend has exactly one polling hook
// reused for resume parsing, ATS scoring, job matching, etc.
router.get('/ai-jobs/:jobId', authenticate, resolveTenant(), asyncHandler(aiJobController.getStatus));

module.exports = router;
