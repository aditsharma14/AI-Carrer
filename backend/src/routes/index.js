const express = require('express');

const identityRoutes = require('../modules/identity/identity.routes');
const resumeRoutes = require('../modules/resumes/resume.routes');
const coachingRoutes = require('../modules/coaching/coaching.routes');
const matchingRoutes = require('../modules/matching/matching.routes');
const jobRoutes = require('../modules/jobs/job.routes');
const interviewRoutes = require('../modules/interview/interview.routes');
const learningRoutes = require('../modules/learning/learning.routes');
const analyticsRoutes = require('../modules/analytics/analytics.routes');
const aiJobRoutes = require('../modules/aiJobs/aiJob.routes');

const router = express.Router();

// Mount order matters for exactly one pair here: matching.routes.js's
// literal GET '/jobs/matches' and job.routes.js's dynamic GET '/jobs/:jobId'
// have the same path shape, and Express resolves routes in the order their
// routers were registered — matching MUST come before jobs, or '/jobs/matches'
// would be swallowed by '/jobs/:jobId' with jobId='matches'. See both routes
// files' own header comments. Every other router here is independent of
// mount order.
router.use(identityRoutes);
router.use(resumeRoutes);
router.use(coachingRoutes);
router.use(matchingRoutes);
router.use(jobRoutes);
router.use(interviewRoutes);
router.use(learningRoutes);
router.use(analyticsRoutes);
router.use(aiJobRoutes);

module.exports = router;
