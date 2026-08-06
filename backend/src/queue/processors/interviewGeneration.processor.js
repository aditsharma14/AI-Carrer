const aiJobRepository = require('../../modules/aiJobs/aiJob.repository');
const interviewRepository = require('../../modules/interview/interview.repository');
const jobRepository = require('../../modules/jobs/job.repository');
const interviewGeneratorService = require('../../ai/services/interviewGenerator.service');
const logger = require('../../config/logger');

// Exists because docs/ARCHITECTURE.md §9 lists interview generation as a
// queued task, and queue/queues.js already defines QUEUE_NAMES.INTERVIEW_GENERATION
// for it. In practice, generating 5-8 questions is one bounded LLM call —
// the same class of work as Resume Review or a coaching turn, both already
// synchronous in this codebase — so interview.service.js's generateQuestions()
// calls the AI service directly rather than enqueuing through here; that
// also matches the already-built frontend, which awaits the call and
// destructures the result immediately with no polling.
//
// This processor is the real, working async path for a use case that isn't
// wired to a route yet: bulk-generating interview kits (e.g. a recruiter
// generating question sets for many open roles in one pass). It is fully
// functional, just not currently triggered anywhere — the seam is here for
// when that feature exists.
module.exports = async function processInterviewGenerationJob(job) {
  const { aiJobId, orgId, createdBy, targetRole, jobId, type } = job.data;

  await aiJobRepository.markProcessing(orgId, aiJobId);

  try {
    let resolvedTargetRole = targetRole;
    let jobDescription;

    if (jobId) {
      const targetJob = await jobRepository.findByIdScoped(orgId, jobId);
      if (!targetJob) throw new Error('Job not found');
      resolvedTargetRole = targetJob.title;
      jobDescription = targetJob.description;
    }

    const { questions } = await interviewGeneratorService.generateQuestions({
      targetRole: resolvedTargetRole,
      jobDescription,
      type,
    });

    const set = await interviewRepository.createInterviewSet(orgId, createdBy, {
      targetRole: resolvedTargetRole,
      jobId,
      type,
      questions,
    });

    await aiJobRepository.markDone(orgId, aiJobId, { interviewSetId: String(set._id), questions: set.questions });
  } catch (err) {
    logger.error('interview-generation job failed', { aiJobId, jobId, error: err.message });
    await aiJobRepository.markFailed(orgId, aiJobId, err.message);
    throw err;
  }
};
