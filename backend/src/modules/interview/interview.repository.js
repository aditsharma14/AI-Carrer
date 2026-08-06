const InterviewSet = require('./interviewSet.model');
const MockInterviewSession = require('./mockInterviewSession.model');
const { cursorFilter, buildPage } = require('../../lib/pagination');

module.exports = {
  createInterviewSet(orgId, createdBy, { targetRole, jobId, type, questions }) {
    return InterviewSet.create({ orgId, createdBy, targetRole, jobId: jobId || null, type, questions });
  },

  findSetByIdScoped(orgId, interviewSetId) {
    return InterviewSet.findOne({ _id: interviewSetId, orgId });
  },

  createSession(orgId, userId, { interviewSetId, targetRole, transcript, totalQuestions }) {
    return MockInterviewSession.create({ orgId, userId, interviewSetId, targetRole, transcript, totalQuestions });
  },

  findSessionByIdScoped(orgId, sessionId) {
    return MockInterviewSession.findOne({ _id: sessionId, orgId });
  },

  async listSessionsByUser(orgId, userId, { cursor, limit = 20 } = {}) {
    const filter = { orgId, userId, ...cursorFilter(cursor) };
    const docs = await MockInterviewSession.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
    return buildPage(docs, limit);
  },

  updateSessionProgress(orgId, sessionId, { transcript, currentQuestionIndex }) {
    return MockInterviewSession.findOneAndUpdate(
      { _id: sessionId, orgId },
      { transcript, currentQuestionIndex },
      { new: true }
    );
  },

  completeSession(orgId, sessionId, { transcript, feedback }) {
    return MockInterviewSession.findOneAndUpdate(
      { _id: sessionId, orgId },
      { transcript, feedback, status: 'completed' },
      { new: true }
    );
  },
};
