const matchingRepository = require('./matching.repository');
const applicationRepository = require('../jobs/application.repository');
const jobRepository = require('../jobs/job.repository');
const resumeRepository = require('../resumes/resume.repository');
const userRepository = require('../identity/user.repository');
const ApiError = require('../../lib/ApiError');
const { withCache } = require('../../ai/cache/aiCache');
const jobMatcherService = require('../../ai/services/jobMatcher.service');
const candidateRankerService = require('../../ai/services/candidateRanker.service');
const hiringAgent = require('../../ai/agents/hiringAgent');
const { enqueueAiJob, QUEUE_NAMES } = require('../../queue/queues');

const SEEKER_MATCH_CACHE_TTL_SECONDS = 60 * 60; // 1 hour — resume content rarely changes minute to minute
const CANDIDATE_SUMMARY_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day — keyed by resumeVersionId+jobId below

async function getOwnLatestResume(orgId, userId) {
  const { items } = await resumeRepository.listByOrgUser(orgId, userId, { limit: 1 });
  if (!items[0]) throw ApiError.badRequest('Upload a resume before viewing job matches');
  return resumeRepository.findByIdScoped(orgId, items[0]._id);
}

// Async by default: a job can have hundreds of applications, each requiring
// an embedding call — this is exactly the "heavy task" category from
// docs/ARCHITECTURE.md §9 that must go through a queue rather than block an
// HTTP request.
async function triggerMatching(orgId, jobId, userId) {
  const job = await jobRepository.findByIdScoped(orgId, jobId);
  if (!job) throw ApiError.notFound('Job');

  return enqueueAiJob({
    orgId,
    type: 'job-matching',
    queueName: QUEUE_NAMES.JOB_MATCHING,
    jobName: 'match-job',
    createdBy: userId,
    // createdBy is duplicated into the payload (not just the AiJob doc)
    // because jobMatching.processor.js needs it on job.data to chain into
    // the candidate-ranking queue — see that processor's header comment.
    payload: { jobId: String(jobId), createdBy: String(userId) },
  });
}

async function scoreJobForResume(job, resume) {
  const cacheKey = `job-match:${job._id}:${resume.currentVersionId._id}`;
  return withCache(cacheKey, SEEKER_MATCH_CACHE_TTL_SECONDS, () =>
    jobMatcherService.matchResumeToJob({
      jobTitle: job.title,
      jobDescription: job.description || job.title,
      jobSkills: job.requirements?.skills || [],
      resumeText: resume.currentVersionId.rawText,
      resumeSkills: resume.currentVersionId.structuredData.skills,
    })
  );
}

// Synchronous — one job, one resume, cheap enough not to need the async-job
// round trip (same reasoning as Resume Review and a coaching turn).
async function getSeekerMatch(candidateOrgId, candidateUserId, jobId) {
  const job = await jobRepository.findOpenByIdAnyOrg(jobId);
  if (!job) throw ApiError.notFound('Job');

  const resume = await getOwnLatestResume(candidateOrgId, candidateUserId);
  const { score, matchedSkills, gapSkills } = await scoreJobForResume(job, resume);

  return {
    job: { title: job.title, location: job.location, description: job.description },
    matchScore: score,
    matchedSkills,
    gapSkills,
  };
}

// The seeker's job feed — cross-org by design (see job.repository.js). Each
// page's jobs are scored against the seeker's own resume; scoreJobForResume's
// per-job cache means revisiting the same page twice is nearly free. Flat
// shape (not { job, ...match }) because JobCard.jsx renders this list and the
// recruiter's own job list with the same component.
async function listSeekerMatches(candidateOrgId, candidateUserId, query) {
  const resume = await getOwnLatestResume(candidateOrgId, candidateUserId);
  const { items, nextCursor } = await jobRepository.listOpenAcrossOrgs(query);

  const matches = await Promise.all(
    items.map(async (job) => {
      const { score } = await scoreJobForResume(job, resume);
      return {
        id: String(job._id),
        title: job.title,
        location: job.location,
        status: job.status,
        applicantCount: job.applicantCount,
        matchScore: score,
      };
    })
  );

  return { items: matches, nextCursor };
}

// Ranked candidates for a job — re-sorts whatever jobMatching.processor.js
// already persisted, then joins in just enough identity data (name) for the
// card view. No LLM call on this path at all.
//
// One findById per candidate below — fine at the list sizes a single job
// posting realistically sees; if this module ever needs to rank thousands of
// applicants per job, the first optimization is batching this into one
// User.find({_id: {$in: [...]}}) rather than reaching for anything fancier.
async function listCandidates(orgId, jobId) {
  const matchResults = await matchingRepository.listByJob(orgId, jobId);
  const ranked = candidateRankerService.rankByScore(matchResults);

  return Promise.all(
    ranked.map(async (result) => {
      const candidateUser = await userRepository.findById(result.candidateUserId);
      return {
        id: String(result.candidateUserId),
        name: candidateUser.name,
        headline: result.matchedSkills.slice(0, 2).join(', ') || undefined,
        score: result.score,
        rank: result.rank,
        topSkills: result.matchedSkills,
      };
    })
  );
}

async function getCandidateDetail(orgId, jobId, candidateUserId) {
  if (!jobId) throw ApiError.badRequest('jobId is required to view a candidate');

  const application = await applicationRepository.findByJobAndCandidateScoped(orgId, jobId, candidateUserId);
  if (!application) throw ApiError.notFound('Candidate');

  const [candidateUser, matchResult, resume] = await Promise.all([
    userRepository.findById(candidateUserId),
    matchingRepository.findByJobAndApplication(orgId, jobId, application._id),
    resumeRepository.findByIdScoped(application.candidateOrgId, application.resumeId),
  ]);

  const structuredData = resume?.currentVersionId?.structuredData;
  return {
    id: String(candidateUserId),
    name: candidateUser.name,
    headline: matchResult?.matchedSkills.slice(0, 2).join(', ') || undefined,
    score: matchResult?.score ?? null,
    topSkills: matchResult?.matchedSkills ?? [],
    experience: structuredData?.experience ?? [],
  };
}

// The one genuinely expensive per-candidate call in this module, and it's
// strictly on-demand (one recruiter click) — cached by resumeVersionId+jobId
// so re-opening the same candidate never re-bills the provider.
async function generateCandidateSummary(orgId, jobId, candidateUserId) {
  const application = await applicationRepository.findByJobAndCandidateScoped(orgId, jobId, candidateUserId);
  if (!application) throw ApiError.notFound('Candidate');

  const matchResult = await matchingRepository.findByJobAndApplication(orgId, jobId, application._id);
  if (!matchResult) throw ApiError.notFound('Match result — run matching on this job first');

  const candidateUser = await userRepository.findById(candidateUserId);

  const cacheKey = `candidate-summary:${jobId}:${application.resumeId}`;
  const summary = await withCache(cacheKey, CANDIDATE_SUMMARY_CACHE_TTL_SECONDS, () =>
    hiringAgent.summarizeCandidate({
      candidateProfile: { name: candidateUser.name },
      matchResult: { score: matchResult.score, matchedSkills: matchResult.matchedSkills, gapSkills: matchResult.gapSkills },
      candidateOrgId: application.candidateOrgId,
      resumeId: application.resumeId,
    })
  );
  return { summary };
}

module.exports = {
  triggerMatching,
  getSeekerMatch,
  listSeekerMatches,
  listCandidates,
  getCandidateDetail,
  generateCandidateSummary,
};
