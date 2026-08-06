const coachingService = require('./coaching.service');

async function createSession(req, res) {
  const session = await coachingService.createSession(req.tenant.id, req.user.id);
  res.status(201).json(session);
}

async function listSessions(req, res) {
  const sessions = await coachingService.listSessions(req.tenant.id, req.user.id);
  res.status(200).json(sessions);
}

async function sendMessage(req, res) {
  const result = await coachingService.sendMessage(req.tenant.id, req.user.id, req.params.sessionId, req.body.message);
  res.status(200).json(result);
}

async function getSkillGap(req, res) {
  const result = await coachingService.requestSkillGap(req.tenant.id, req.user.id, req.query.targetRole);
  res.status(200).json(result);
}

async function getLatestSkillGap(req, res) {
  const result = await coachingService.getLatestSkillGap(req.tenant.id, req.user.id);
  res.status(200).json(result);
}

module.exports = { createSession, listSessions, sendMessage, getSkillGap, getLatestSkillGap };
