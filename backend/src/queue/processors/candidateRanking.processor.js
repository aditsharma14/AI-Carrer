const aiJobRepository = require('../../modules/aiJobs/aiJob.repository');
const matchingRepository = require('../../modules/matching/matching.repository');
const applicationRepository = require('../../modules/jobs/application.repository');
const userRepository = require('../../modules/identity/user.repository');
const candidateRankerService = require('../../ai/services/candidateRanker.service');
const hiringAgent = require('../../ai/agents/hiringAgent');
const { withCache } = require('../../ai/cache/aiCache');
const logger = require('../../config/logger');

// Only the top tier gets a pre-generated summary — see
// matching.service.js's generateCandidateSummary for the same cost-control
// reasoning: the expensive per-candidate LLM call only ever runs for a small,
// deliberately bounded set, never the whole applicant pool.
const PREWARM_TOP_N = 3;
const CANDIDATE_SUMMARY_CACHE_TTL_SECONDS = 60 * 60 * 24;

// Invoked by queue/workers/aiWorker.js for a 'candidate-ranking' job, always
// chained from jobMatching.processor.js (see its header comment) — never
// triggered directly by a user action.
module.exports = async function processCandidateRankingJob(job) {
  const { aiJobId, orgId, jobId } = job.data;

  await aiJobRepository.markProcessing(orgId, aiJobId);

  try {
    const matchResults = await matchingRepository.listByJob(orgId, jobId);
    const ranked = candidateRankerService.rankByScore(matchResults);
    await matchingRepository.setRanks(orgId, jobId, ranked.map((r) => r.applicationId));

    for (const result of ranked.slice(0, PREWARM_TOP_N)) {
      const application = await applicationRepository.findByIdScoped(orgId, result.applicationId);
      const candidateUser = await userRepository.findById(application.candidateUserId);
      const cacheKey = `candidate-summary:${jobId}:${application.resumeId}`;

      // Failure handling: a pre-warm that fails should never fail the whole
      // ranking job — the recruiter just gets a live (uncached) call instead
      // of an instant one the first time they open this candidate.
      try {
        await withCache(cacheKey, CANDIDATE_SUMMARY_CACHE_TTL_SECONDS, () =>
          hiringAgent.summarizeCandidate({
            candidateProfile: { name: candidateUser.name },
            matchResult: { score: result.score, matchedSkills: result.matchedSkills, gapSkills: result.gapSkills },
            candidateOrgId: application.candidateOrgId,
            resumeId: application.resumeId,
          })
        );
      } catch (err) {
        logger.error('candidate-summary pre-warm failed', { jobId, applicationId: result.applicationId, error: err.message });
      }
    }

    await aiJobRepository.markDone(orgId, aiJobId, { jobId, rankedCount: ranked.length });
  } catch (err) {
    logger.error('candidate-ranking job failed', { aiJobId, jobId, error: err.message });
    await aiJobRepository.markFailed(orgId, aiJobId, err.message);
    throw err;
  }
};
