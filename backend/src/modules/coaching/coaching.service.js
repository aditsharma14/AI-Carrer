const coachingRepository = require('./coaching.repository');
const resumeRepository = require('../resumes/resume.repository');
const ApiError = require('../../lib/ApiError');
const careerCoachAgent = require('../../ai/agents/careerCoachAgent');
const skillGapAnalyzerService = require('../../ai/services/skillGapAnalyzer.service');

async function createSession(orgId, userId) {
  const session = await coachingRepository.createSession(orgId, userId);
  return { id: String(session._id), createdAt: session.createdAt, messages: [] };
}

async function listSessions(orgId, userId) {
  const sessions = await coachingRepository.listSessionsByUser(orgId, userId);
  return sessions.map((s) => ({ id: String(s._id), createdAt: s.createdAt, messageCount: s.messages.length }));
}

// Synchronous, like Resume Review — one conversational turn is cheap enough
// not to need the async-job round trip. A real provider streaming tokens
// over SSE (the full architecture's design, §13) would replace the single
// awaited call below without changing anything else in this function.
async function sendMessage(orgId, userId, sessionId, message) {
  const session = await coachingRepository.findSessionScoped(orgId, sessionId);
  if (!session || String(session.userId) !== String(userId)) throw ApiError.notFound('Coaching session');

  await coachingRepository.appendMessage(orgId, sessionId, { role: 'user', text: message });

  const history = session.messages.map((m) => ({ role: m.role, text: m.text }));
  const reply = await careerCoachAgent.converse({ orgId, userId, message, history });

  const updated = await coachingRepository.appendMessage(orgId, sessionId, { role: 'assistant', text: reply });
  return { message: reply, sessionId: String(updated._id) };
}

async function requestSkillGap(orgId, userId, targetRole) {
  const { items } = await resumeRepository.listByOrgUser(orgId, userId, { limit: 1 });
  if (!items[0]) throw ApiError.badRequest('Upload a resume before running a skill gap analysis');

  const resume = await resumeRepository.findByIdScoped(orgId, items[0]._id);
  const resumeSkills = resume.currentVersionId?.structuredData.skills || [];

  const result = await skillGapAnalyzerService.analyzeSkillGap({ resumeSkills, targetRole });
  await coachingRepository.createSkillGapReport(orgId, userId, result);
  return result;
}

async function getLatestSkillGap(orgId, userId) {
  const report = await coachingRepository.findLatestSkillGapReportForUser(orgId, userId);
  if (!report) return null;
  return { targetRole: report.targetRole, gaps: report.gaps, strengths: report.strengths, explanation: report.explanation };
}

module.exports = { createSession, listSessions, sendMessage, requestSkillGap, getLatestSkillGap };
