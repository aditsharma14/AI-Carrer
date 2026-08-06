const learningRepository = require('./learning.repository');
const coachingRepository = require('../coaching/coaching.repository');
const ApiError = require('../../lib/ApiError');
const learningAgent = require('../../ai/agents/learningAgent');

function shapeRec(rec) {
  return { items: rec.items };
}

async function resolveSkillGapReport(orgId, userId, skillGapReportId) {
  const report = skillGapReportId
    ? await coachingRepository.findSkillGapReportByIdScoped(orgId, skillGapReportId)
    : await coachingRepository.findLatestSkillGapReportForUser(orgId, userId);

  if (!report || String(report.userId) !== String(userId)) {
    throw ApiError.badRequest('Run a skill gap analysis first');
  }
  return report;
}

// Synchronous — one bounded LLM call over a short list of gaps, same class
// of work as Resume Review and Skill Gap Analysis (both already synchronous
// in this codebase).
async function getRecommendations(orgId, userId, skillGapReportId) {
  const report = await resolveSkillGapReport(orgId, userId, skillGapReportId);

  const { items } = await learningAgent.recommend({
    orgId,
    userId,
    targetRole: report.targetRole,
    gaps: report.gaps,
  });

  const rec = await learningRepository.create(orgId, userId, { skillGapReportId: report._id, items });
  return shapeRec(rec);
}

async function getLatest(orgId, userId) {
  const rec = await learningRepository.findLatestByUser(orgId, userId);
  return rec ? shapeRec(rec) : { items: [] };
}

module.exports = { getRecommendations, getLatest };
