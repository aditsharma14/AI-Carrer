const aiJobRepository = require('../../modules/aiJobs/aiJob.repository');
const jobRepository = require('../../modules/jobs/job.repository');
const applicationRepository = require('../../modules/jobs/application.repository');
const resumeRepository = require('../../modules/resumes/resume.repository');
const matchingRepository = require('../../modules/matching/matching.repository');
const jobMatcherService = require('../../ai/services/jobMatcher.service');
const notificationService = require('../../modules/notifications/notification.service');
const { enqueueAiJob, QUEUE_NAMES } = require('../queues');
const logger = require('../../config/logger');

// Invoked by queue/workers/aiWorker.js for a 'job-matching' job — the other
// half of matching.service.js's triggerMatching(). One embedding call per
// application is exactly the kind of work that would block an HTTP request
// for an unpredictable amount of time on a job with dozens of applicants.
module.exports = async function processJobMatchingJob(job) {
  const { aiJobId, orgId, jobId, createdBy } = job.data;

  await aiJobRepository.markProcessing(orgId, aiJobId);

  try {
    const targetJob = await jobRepository.findByIdScoped(orgId, jobId);
    if (!targetJob) throw new Error('Job not found');

    const applications = await applicationRepository.listAllByJob(orgId, jobId);

    const withResumeContent = await Promise.all(
      applications.map(async (application) => {
        const resume = await resumeRepository.findByIdScoped(application.candidateOrgId, application.resumeId);
        return {
          applicationId: String(application._id),
          candidateUserId: application.candidateUserId,
          resumeText: resume?.currentVersionId?.rawText || '',
          resumeSkills: resume?.currentVersionId?.structuredData.skills || [],
        };
      })
    );

    const results = await jobMatcherService.matchApplicationsToJob({
      jobTitle: targetJob.title,
      jobDescription: targetJob.description,
      jobSkills: targetJob.requirements.skills,
      applications: withResumeContent,
    });

    const candidateByApplication = new Map(withResumeContent.map((a) => [a.applicationId, a.candidateUserId]));
    await matchingRepository.upsertMany(
      orgId,
      jobId,
      results.map((r) => ({
        applicationId: r.applicationId,
        candidateUserId: candidateByApplication.get(r.applicationId),
        score: r.score,
        matchedSkills: r.matchedSkills,
        gapSkills: r.gapSkills,
      }))
    );

    await aiJobRepository.markDone(orgId, aiJobId, { jobId, matchedCount: results.length });

    // notify() and the chained enqueueAiJob() below are both isolated in
    // their own try/catch, on purpose — matching itself already succeeded
    // and its results are already persisted (upsertMany above), so a
    // transient failure in either "tell the recruiter" or "kick off ranking"
    // must never re-throw and cause the whole matching run (and its LLM
    // calls) to retry from scratch. Same reasoning candidateRanking.processor.js
    // already applies to its own per-candidate pre-warm calls.
    try {
      await notificationService.notify(orgId, createdBy, {
        type: 'matching-complete',
        message: `Candidate matching is complete for "${targetJob.title}" — ${results.length} candidate(s) scored.`,
        link: `/app/candidates?jobId=${jobId}`,
      });
    } catch (notifyErr) {
      logger.error('matching-complete notification failed (matching itself succeeded)', {
        aiJobId,
        jobId,
        error: notifyErr.message,
      });
    }

    // Deliberate, narrow exception to this codebase's usual "one user
    // action, one queued job" rule (resume-parse and ats-score are each
    // independently triggered by the user, never chained). Ranking and
    // pre-warming the top candidates' AI summaries are both meaningless
    // without matching having just finished, and the recruiter only ever
    // takes the single "Run candidate matching" action — there's no second
    // button to chain from, so the chain happens here instead.
    try {
      await enqueueAiJob({
        orgId,
        type: 'candidate-ranking',
        queueName: QUEUE_NAMES.CANDIDATE_RANKING,
        jobName: 'rank-candidates',
        createdBy,
        payload: { jobId: String(jobId) },
      });
    } catch (chainErr) {
      // Matching results are already saved; failing to kick off ranking is a
      // recoverable gap (an operator can re-trigger it), not a reason to
      // retry — and retrying here is exactly what used to create a second,
      // duplicate candidate-ranking job on a merely transient failure.
      logger.error('failed to enqueue candidate-ranking after job-matching succeeded', {
        aiJobId,
        jobId,
        error: chainErr.message,
      });
    }
  } catch (err) {
    logger.error('job-matching job failed', { aiJobId, jobId, error: err.message });
    await aiJobRepository.markFailed(orgId, aiJobId, err.message);
    throw err;
  }
};
