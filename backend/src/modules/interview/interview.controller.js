const interviewService = require('./interview.service');

async function generate(req, res) {
  const result = await interviewService.generateQuestions(req.tenant.id, req.user.id, req.body);
  res.status(200).json(result);
}

async function listMockSessions(req, res) {
  const result = await interviewService.listSessions(req.tenant.id, req.user.id, req.query);
  res.status(200).json(result);
}

async function startMockSession(req, res) {
  const session = await interviewService.startMockSession(req.tenant.id, req.user.id, req.body.interviewSetId);
  res.status(201).json(session);
}

async function getMockSession(req, res) {
  const session = await interviewService.getSession(req.tenant.id, req.user.id, req.params.sessionId);
  res.status(200).json(session);
}

async function respond(req, res) {
  const session = await interviewService.respondToSession(req.tenant.id, req.user.id, req.params.sessionId, req.body.answer);
  res.status(200).json(session);
}

module.exports = { generate, listMockSessions, startMockSession, getMockSession, respond };
