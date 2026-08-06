const aiClient = require('../client/aiClient');
const buildResumeReviewerPrompt = require('../prompts/resumeReviewer.v1');

// Stub-mode fallback: simple, real heuristics over the resume's own
// structured data — not random text. Good enough to demonstrate the feature
// working end-to-end; a real provider call replaces this once AI_PROVIDER
// is switched away from 'stub'.
function heuristicSuggestions(structuredData) {
  const suggestions = [];

  if (!structuredData.summary || structuredData.summary.length < 40) {
    suggestions.push({
      section: 'Summary',
      issue: 'Summary is missing or too short to convey your background.',
      suggestion: 'Add 2-3 sentences covering your role, years of experience, and your strongest skill area.',
      severity: 'medium',
    });
  }

  if (structuredData.skills.length < 3) {
    suggestions.push({
      section: 'Skills',
      issue: 'Fewer than 3 skills listed.',
      suggestion: 'List the specific tools and technologies you used in each role, not just general skills.',
      severity: 'high',
    });
  }

  for (const exp of structuredData.experience) {
    if (!exp.description || exp.description.length < 30) {
      suggestions.push({
        section: `Experience — ${exp.title || 'untitled role'}`,
        issue: 'Description is missing or too brief to show impact.',
        suggestion: 'Add a quantified result, e.g. "Reduced page load time by 40%" instead of a duty list.',
        severity: 'medium',
      });
    }
  }

  return suggestions;
}

async function reviewResume({ structuredData }) {
  const suggestions = await aiClient.complete({
    promptVersion: 'resumeReviewer.v1',
    messages: buildResumeReviewerPrompt(structuredData),
    mock: () => heuristicSuggestions(structuredData),
  });

  return { suggestions };
}

module.exports = { reviewResume };
