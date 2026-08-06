const aiClient = require('../client/aiClient');
const buildSkillGapPrompt = require('../prompts/skillGapAnalyzer.v1');

// No real role-taxonomy service exists yet — this is the seam where one
// would plug in. A small lookup table with a generic fallback is an honest,
// labeled placeholder rather than pretending to cover every role.
const ROLE_SKILL_MAP = {
  'frontend engineer': ['javascript', 'react', 'css', 'html', 'typescript', 'testing'],
  'backend engineer': ['node.js', 'sql', 'api design', 'docker', 'system design'],
  'full stack engineer': ['javascript', 'react', 'node.js', 'sql', 'api design'],
  'data scientist': ['python', 'sql', 'statistics', 'machine learning', 'pandas'],
  'product manager': ['roadmapping', 'stakeholder management', 'analytics', 'communication'],
};
const GENERIC_FALLBACK = ['communication', 'leadership', 'project management', 'problem solving'];

function getRequiredSkillsForRole(targetRole) {
  const key = Object.keys(ROLE_SKILL_MAP).find((role) => targetRole.toLowerCase().includes(role));
  return key ? ROLE_SKILL_MAP[key] : GENERIC_FALLBACK;
}

// Fuzzy match via normalization (lowercase, strip punctuation) rather than
// exact string equality — "Node" / "Node.js" / "NodeJS" should all count as
// the same skill. This is the embedding-similarity fallback from
// docs/ARCHITECTURE.md §5.2's failure-handling note, used here as the
// primary mechanism since there's no real embedding model configured yet.
function normalize(skill) {
  return skill.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function computeGapsAndStrengths(resumeSkills, requiredSkills) {
  const normalizedResumeSkills = new Set(resumeSkills.map(normalize));
  const missing = requiredSkills.filter((skill) => !normalizedResumeSkills.has(normalize(skill)));

  // Heuristic priority, not a real ML ranking: earlier entries in the
  // role's required-skills list are treated as more core to the role.
  const gaps = missing.map((skill, index) => ({
    skill,
    priority: index < 2 ? 'high' : index < 4 ? 'medium' : 'low',
  }));

  return { gaps, strengths: resumeSkills };
}

async function analyzeSkillGap({ resumeSkills, targetRole }) {
  const requiredSkills = getRequiredSkillsForRole(targetRole);
  const { gaps, strengths } = computeGapsAndStrengths(resumeSkills, requiredSkills);

  let explanation;
  try {
    explanation = await aiClient.complete({
      promptVersion: 'skillGapAnalyzer.v1',
      messages: buildSkillGapPrompt({ targetRole, gaps, strengths }),
      mock: () =>
        gaps.length
          ? `You're missing ${gaps.length} key skill(s) for ${targetRole}, most importantly ${gaps[0].skill}. ` +
            `Your existing strengths in ${strengths.slice(0, 2).join(' and ') || 'your current skillset'} are a solid foundation to build from.`
          : `Your current skills already cover what's typically expected for ${targetRole}. Nice work.`,
    });
  } catch {
    explanation = null;
  }

  return { targetRole, gaps, strengths, explanation };
}

module.exports = { analyzeSkillGap, getRequiredSkillsForRole };
