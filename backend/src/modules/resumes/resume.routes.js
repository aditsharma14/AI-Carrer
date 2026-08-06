const express = require('express');
const multer = require('multer');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const rateLimitTier = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');
const resumeController = require('./resume.controller');
const { createManualResumeSchema, requestAtsScoreSchema, listResumesSchema } = require('./resume.validation');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matches the frontend's stated limit
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    // This only checks the declared mimetype — fast rejection of obviously
    // wrong uploads. The real security check (magic bytes) happens inside
    // resumeParser.service.js, since trusting a client-declared mimetype
    // alone is exactly what docs/ARCHITECTURE.md §11.4 warns against.
    if (!allowed.includes(file.mimetype)) return cb(new Error('Only PDF and DOCX files are accepted'));
    cb(null, true);
  },
});

router.get(
  '/resumes',
  authenticate,
  resolveTenant(),
  requirePermission('resume:list'),
  validate(listResumesSchema),
  asyncHandler(resumeController.list)
);

router.post(
  '/resumes',
  authenticate,
  resolveTenant(),
  requirePermission('resume:create'),
  validate(createManualResumeSchema),
  asyncHandler(resumeController.createManual)
);

router.post(
  '/resumes/upload',
  authenticate,
  resolveTenant(),
  requirePermission('resume:create'),
  rateLimitTier('aiHeavy'),
  upload.single('resume'),
  asyncHandler(resumeController.upload)
);

// Must be registered before '/resumes/:resumeId' — otherwise Express would
// match this path's "latest-ats-score" segment as a :resumeId param instead.
router.get(
  '/resumes/latest-ats-score',
  authenticate,
  resolveTenant(),
  asyncHandler(resumeController.latestAtsScore)
);

router.get('/resumes/:resumeId', authenticate, resolveTenant(), asyncHandler(resumeController.getOne));

router.post(
  '/resumes/:resumeId/review',
  authenticate,
  resolveTenant(),
  rateLimitTier('aiHeavy'),
  asyncHandler(resumeController.review)
);

router.post(
  '/resumes/:resumeId/ats-score',
  authenticate,
  resolveTenant(),
  rateLimitTier('aiHeavy'),
  validate(requestAtsScoreSchema),
  asyncHandler(resumeController.atsScore)
);

module.exports = router;
