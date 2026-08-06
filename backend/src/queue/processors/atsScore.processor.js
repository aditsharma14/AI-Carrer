const aiJobRepository = require('../../modules/aiJobs/aiJob.repository');
const resumeRepository = require('../../modules/resumes/resume.repository');
// Forward reference: the Jobs module doesn't exist until Batch 8. Same
// pattern as tenant.middleware.js's earlier forward reference to the
// Identity module — this file is authored now because it belongs with the
// Resume module's queue logic, and will resolve once Batch 8 lands.
const jobRepository = require('../../modules/jobs/job.repository');
const atsScorerService = require('../../ai/services/atsScorer.service');
const logger = require('../../config/logger');

module.exports = async function processAtsScoreJob(job) {
  const { aiJobId, orgId, resumeId, versionId, targetJobId } = job.data;

  await aiJobRepository.markProcessing(orgId, aiJobId);

  try {
    const version = await resumeRepository.findVersionByIdScoped(orgId, versionId);
    if (!version) throw new Error('Resume version not found');

    let jobDescription = null;
    if (targetJobId) {
      const targetJob = await jobRepository.findByIdScoped(orgId, targetJobId);
      jobDescription = targetJob ? targetJob.description : null;
    }

    const result = await atsScorerService.scoreResume({ structuredData: version.structuredData, jobDescription });

    await resumeRepository.updateVersionAtsScore(orgId, versionId, {
      score: result.score,
      breakdown: result.breakdown,
      missingKeywords: result.missingKeywords,
      targetJobId: targetJobId || null,
    });
    await aiJobRepository.markDone(orgId, aiJobId, { resumeId, ...result });
  } catch (err) {
    logger.error('ats-score job failed', { aiJobId, resumeId, error: err.message });
    await aiJobRepository.markFailed(orgId, aiJobId, err.message);
    throw err;
  }
};
