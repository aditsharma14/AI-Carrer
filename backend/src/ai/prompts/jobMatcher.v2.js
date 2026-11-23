const { dataBlock, DATA_RULE } = require('./dataBlock');

// Like atsScorer.v1.js, this prompt never computes the score itself — the
// embedding-similarity + keyword-overlap numbers in jobMatcher.service.js
// are deterministic. This is only used for the optional "explain the top
// match" blurb, and only ever called for a small shortlist.
//
// v2: skill lists (resume-derived) are now inside the data block too.
module.exports = function buildJobMatcherPrompt({ jobTitle, matchedSkills, gapSkills, score }) {
  return [
    {
      role: 'system',
      content:
        'You write a one-sentence explanation of why a candidate matched a job, using only the skills data given. ' +
        DATA_RULE,
    },
    {
      role: 'user',
      content:
        dataBlock(
          'candidate_data',
          `Job title: ${jobTitle}\nScore: ${score}%\n` +
            `Matched skills: ${matchedSkills.join(', ') || 'none'}\nGap skills: ${gapSkills.join(', ') || 'none'}`
        ) + '\n\nWrite one sentence summarizing this match.',
    },
  ];
};
