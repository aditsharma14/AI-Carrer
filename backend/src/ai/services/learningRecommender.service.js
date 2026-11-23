const buildLearningRecommenderPrompt = require('../prompts/learningRecommender.v2');

// Same honest, labeled-placeholder pattern as skillGapAnalyzer.service.js's
// ROLE_SKILL_MAP: a small table of real, well-known resources with a generic
// fallback for any skill not in it, rather than pretending to cover everything.
const KNOWN_RESOURCES = {
  'node.js': { title: 'Node.js Documentation', provider: 'nodejs.org', url: 'https://nodejs.org/en/docs' },
  sql: { title: 'SQL for Data Analysis', provider: 'Mode Analytics', url: 'https://mode.com/sql-tutorial' },
  docker: { title: 'Docker Get Started Guide', provider: 'docker.com', url: 'https://docs.docker.com/get-started' },
  react: { title: 'React Documentation', provider: 'react.dev', url: 'https://react.dev/learn' },
  'api design': { title: 'Designing Web APIs', provider: "O'Reilly", url: null },
  'system design': { title: 'System Design Primer', provider: 'GitHub', url: 'https://github.com/donnemartin/system-design-primer' },
};
const GENERIC_RESOURCE = { title: 'Recommended courses', provider: 'Coursera', url: 'https://www.coursera.org' };

// Single-call building block, same split as careerCoach.service.js —
// learningAgent.js owns deciding whether it needs the user's previously
// recommended resources before building this prompt.
function buildMessages({ targetRole, gaps, toolResult }) {
  return buildLearningRecommenderPrompt({ targetRole, gaps, toolResult });
}

// The heuristic ignores toolResult (previous recommendations) by design — it's
// a fixed skill -> resource lookup, so the same gap always maps to the same
// resource, which is a feature for testing determinism. A real provider
// receiving the same toolResult could actually vary its picks across runs.
function mockReply({ gaps }) {
  const items = gaps.map(({ skill }) => {
    const resource = KNOWN_RESOURCES[skill.toLowerCase()] || GENERIC_RESOURCE;
    return { ...resource, skill };
  });
  return { reply: { items }, toolCall: null };
}

module.exports = { buildMessages, mockReply };
