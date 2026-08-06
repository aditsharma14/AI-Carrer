const interviewRepository = require('./interview.repository');
const jobRepository = require('../jobs/job.repository');
const ApiError = require('../../lib/ApiError');
const interviewGeneratorService = require('../../ai/services/interviewGenerator.service');
const interviewAgent = require('../../ai/agents/interviewAgent');

function shapeSession(session) {
  return {
    id: String(session._id),
    targetRole: session.targetRole,
    status: session.status,
    transcript: session.transcript,
    totalQuestions: session.totalQuestions,
    createdAt: session.createdAt,
    feedback: session.feedback || null,
  };
}

// Synchronous, not queued — generating 5-8 questions is one bounded LLM
// call, the same class of work as Resume Review or a coaching turn (both
// already synchronous in this codebase), not a per-item loop like resume
// parsing or candidate matching. This also matches the already-built
// frontend exactly: MockInterviewPage.jsx awaits this call and immediately
// destructures `interviewSetId` from the result, with no polling — see
// queue/processors/interviewGeneration.processor.js's header comment for
// where the queued version of this lives instead.
async function generateQuestions(orgId, userId, { targetRole, jobId, type }) {
  let resolvedTargetRole = targetRole;
  let jobDescription;

  if (jobId) {
    const job = await jobRepository.findByIdScoped(orgId, jobId);
    if (!job) throw ApiError.notFound('Job');
    resolvedTargetRole = job.title;
    jobDescription = job.description;
  }

  const { questions } = await interviewGeneratorService.generateQuestions({
    targetRole: resolvedTargetRole,
    jobDescription,
    type,
  });

  const set = await interviewRepository.createInterviewSet(orgId, userId, {
    targetRole: resolvedTargetRole,
    jobId,
    type,
    questions,
  });

  return { interviewSetId: String(set._id), questions: set.questions };
}

async function startMockSession(orgId, userId, interviewSetId) {
  const set = await interviewRepository.findSetByIdScoped(orgId, interviewSetId);
  if (!set) throw ApiError.notFound('Interview set');
  if (set.questions.length === 0) throw ApiError.badRequest('This interview set has no questions');

  const session = await interviewRepository.createSession(orgId, userId, {
    interviewSetId: set._id,
    targetRole: set.targetRole,
    transcript: [{ role: 'assistant', text: set.questions[0].question }],
    totalQuestions: set.questions.length,
  });

  return shapeSession(session);
}

async function getSession(orgId, userId, sessionId) {
  const session = await interviewRepository.findSessionByIdScoped(orgId, sessionId);
  if (!session || String(session.userId) !== String(userId)) throw ApiError.notFound('Mock interview session');
  return shapeSession(session);
}

async function listSessions(orgId, userId, query) {
  const page = await interviewRepository.listSessionsByUser(orgId, userId, query);
  return { items: page.items.map(shapeSession), nextCursor: page.nextCursor };
}

// Fixed walk through the InterviewSet's pre-generated question list — see
// mockInterviewSession.model.js's header comment for why this isn't a live
// "agent picks the next question" loop. The agent's real work only happens
// once, on the final answer, grading the whole transcript.
async function respondToSession(orgId, userId, sessionId, answer) {
  const session = await interviewRepository.findSessionByIdScoped(orgId, sessionId);
  if (!session || String(session.userId) !== String(userId)) throw ApiError.notFound('Mock interview session');
  if (session.status === 'completed') throw ApiError.badRequest('This interview session has already finished');

  const set = await interviewRepository.findSetByIdScoped(orgId, session.interviewSetId);
  if (!set) throw ApiError.notFound('Interview set');

  const transcript = [...session.transcript, { role: 'user', text: answer }];
  const nextIndex = session.currentQuestionIndex + 1;

  if (nextIndex < set.questions.length) {
    transcript.push({ role: 'assistant', text: set.questions[nextIndex].question });
    const updated = await interviewRepository.updateSessionProgress(orgId, sessionId, {
      transcript,
      currentQuestionIndex: nextIndex,
    });
    return shapeSession(updated);
  }

  // Synchronous, same reasoning as generateQuestions above — one bounded
  // call grading a short transcript, not a per-item loop.
  const feedback = await interviewAgent.evaluateSession({ orgId, userId, targetRole: session.targetRole, transcript });
  const completed = await interviewRepository.completeSession(orgId, sessionId, { transcript, feedback });
  return shapeSession(completed);
}

module.exports = { generateQuestions, startMockSession, getSession, listSessions, respondToSession };
