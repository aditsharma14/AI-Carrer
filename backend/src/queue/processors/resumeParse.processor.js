const aiJobRepository = require('../../modules/aiJobs/aiJob.repository');
const resumeRepository = require('../../modules/resumes/resume.repository');
const resumeParserService = require('../../ai/services/resumeParser.service');
const notificationService = require('../../modules/notifications/notification.service');
const logger = require('../../config/logger');

// Invoked by queue/workers/aiWorker.js when a 'resume-parse' job is pulled
// off the queue. This is the other half of resume.service.js's
// requestUpload() — the part that actually does the work, running on a
// worker process instead of blocking an HTTP request thread.
module.exports = async function processResumeParseJob(job) {
  const { aiJobId, orgId, resumeId, userId, fileBuffer, mimetype } = job.data;

  await aiJobRepository.markProcessing(orgId, aiJobId);

  try {
    const { rawText, structuredData, security } = await resumeParserService.parseResume({
      fileBuffer: Buffer.from(fileBuffer, 'base64'),
      mimetype,
    });

    const version = await resumeRepository.createVersion(orgId, resumeId, { rawText, structuredData, security });
    await resumeRepository.setCurrentVersion(orgId, resumeId, version._id, 'parsed');
    await aiJobRepository.markDone(orgId, aiJobId, { resumeId, versionId: String(version._id), structuredData });

    // Isolated from the parse itself, on purpose: notify() does its own Mongo
    // write + queue add, and either can transiently fail. Before this fix,
    // that failure was caught by the outer catch below, which re-marked an
    // already-successfully-parsed resume as failed and re-threw for BullMQ to
    // retry — re-running the parse and creating a second, duplicate
    // ResumeVersion for work that had already completed. A failed
    // notification should never undo or re-run already-finished work.
    try {
      await notificationService.notify(orgId, userId, {
        type: 'resume-parsed',
        message: 'Your resume has been parsed and is ready to review.',
        link: `/app/resumes/${resumeId}`,
      });
    } catch (notifyErr) {
      logger.error('resume-parsed notification failed (parse itself succeeded)', {
        aiJobId,
        resumeId,
        error: notifyErr.message,
      });
    }
  } catch (err) {
    logger.error('resume-parse job failed', { aiJobId, resumeId, error: err.message });
    await resumeRepository.markFailed(orgId, resumeId);
    await aiJobRepository.markFailed(orgId, aiJobId, err.message);
    // Re-throw so BullMQ's own retry/backoff (3 attempts, exponential — see
    // queue/queues.js) actually runs, instead of swallowing the failure here.
    throw err;
  }
};
