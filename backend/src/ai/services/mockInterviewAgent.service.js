const buildMockInterviewAgentPrompt = require('../prompts/mockInterviewAgent.v2');

// Single-call building block, same split as careerCoach.service.js and
// candidateSummary.service.js — interviewAgent.js owns deciding whether it
// needs the candidate's resume before grading; this file only knows how to
// build one prompt and one stub reply from whatever it's handed.
function buildMessages({ targetRole, transcript, toolResult }) {
  return buildMockInterviewAgentPrompt({ targetRole, transcript, toolResult });
}

// Heuristic stand-in for real grading: word count is a crude but honest
// proxy for "did the candidate give a substantive answer" when there's no
// real model to actually judge content quality.
function heuristicFeedback(transcript) {
  const questions = transcript.filter((t) => t.role === 'assistant');
  const answers = transcript.filter((t) => t.role === 'user');

  const scorePerQuestion = questions.map((q, i) => {
    const wordCount = (answers[i]?.text || '').trim().split(/\s+/).filter(Boolean).length;
    return { question: q.text, score: Math.min(100, 40 + wordCount * 4) };
  });

  const avgScore = scorePerQuestion.reduce((sum, s) => sum + s.score, 0) / (scorePerQuestion.length || 1);

  return {
    strengths:
      avgScore >= 60
        ? ['Answers were detailed and specific.', 'Communicated clearly across multiple questions.']
        : ['Engaged with every question asked.'],
    improvements:
      avgScore < 80
        ? ['Add more concrete examples to back up claims.', 'Expand on the impact or outcome of each story.']
        : ['Keep reinforcing specific metrics in your answers.'],
    scorePerQuestion,
  };
}

function mockReply({ transcript }) {
  return { reply: heuristicFeedback(transcript), toolCall: null };
}

module.exports = { buildMessages, mockReply };
