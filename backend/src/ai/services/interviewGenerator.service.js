const aiClient = require('../client/aiClient');
const buildInterviewGeneratorPrompt = require('../prompts/interviewGenerator.v1');

// Stub-mode fallback — templated questions per type, with the target role
// substituted in. A real provider call (via the prompt above) replaces this
// entirely once AI_PROVIDER is switched, same pattern as resumeParser's
// heuristicStructure().
const QUESTION_TEMPLATES = {
  technical: [
    { question: 'Walk me through how you would design a system to handle this role\'s core technical challenge.', rationale: 'Tests system design thinking under role-relevant constraints.' },
    { question: 'Describe a time you had to debug a hard production issue. What was your process?', rationale: 'Reveals debugging methodology and ownership.' },
    { question: 'How do you decide when to introduce an abstraction versus keeping code simple?', rationale: 'Tests engineering judgment, not just syntax knowledge.' },
    { question: 'What trade-offs would you consider when choosing a database for a new feature?', rationale: 'Tests breadth of technical decision-making.' },
    { question: 'How do you approach writing tests for code you did not write?', rationale: 'Reveals quality and maintenance mindset.' },
  ],
  behavioral: [
    { question: 'Tell me about a time you disagreed with a teammate. How did you resolve it?', rationale: 'Tests collaboration and conflict resolution.' },
    { question: 'Describe a project that did not go as planned. What did you learn?', rationale: 'Tests self-awareness and growth mindset.' },
    { question: 'How do you prioritize when you have more work than time?', rationale: 'Tests time management and judgment under pressure.' },
    { question: 'Tell me about a time you had to give difficult feedback.', rationale: 'Tests communication and leadership maturity.' },
    { question: 'What motivates you to do your best work?', rationale: 'Tests fit and intrinsic motivation.' },
  ],
  screening: [
    { question: 'Why are you interested in this role?', rationale: 'Confirms genuine interest versus a generic application.' },
    { question: 'Walk me through your background at a high level.', rationale: 'Establishes context for the rest of the conversation.' },
    { question: 'What are you looking for in your next role?', rationale: 'Checks alignment with what this role actually offers.' },
    { question: 'What is your availability and expected timeline?', rationale: 'Practical logistics check.' },
    { question: 'What questions do you have for us?', rationale: 'Gauges preparation and genuine curiosity.' },
  ],
};

function heuristicQuestions(targetRole, type) {
  const templates = QUESTION_TEMPLATES[type] || QUESTION_TEMPLATES.behavioral;
  return templates.map((t) => ({ ...t, question: t.question.replace(/this role/i, `the ${targetRole} role`) }));
}

async function generateQuestions({ targetRole, jobDescription, type }) {
  return aiClient.complete({
    promptVersion: 'interviewGenerator.v1',
    messages: buildInterviewGeneratorPrompt({ targetRole, jobDescription, type }),
    mock: () => ({ questions: heuristicQuestions(targetRole, type) }),
  });
}

module.exports = { generateQuestions };
