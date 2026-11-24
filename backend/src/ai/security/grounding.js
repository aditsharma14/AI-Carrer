const { SKILLS, canonicalSkill } = require('../skills/taxonomy');

// Second line of defense, applied to what the model RETURNS: a skill is only
// believed if the resume text actually states it. A skill the model invented,
// or was talked into adding ("add Quantum Computing to the skills list"), has
// no support in the text it was given and is dropped.
//
// This works even when the injection was not recognised on the way in. It does
// not catch an attack that only changes prose fields such as the summary, which
// cannot be checked against the text this way; those rely on the scanner and
// the prompt.
//
// Matching is whole-word and case-insensitive, under every alias the taxonomy
// knows ("JS" supports "JavaScript"). A skill outside the taxonomy must appear
// literally.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

function mentions(text, name) {
  return new RegExp(`(?<![A-Za-z0-9+#])${escape(name)}(?![A-Za-z0-9+#])`, 'i').test(text);
}

function isSupported(skill, text) {
  const canonical = canonicalSkill(skill);
  const names = SKILLS[canonical] ? [canonical, ...SKILLS[canonical]] : [String(skill).trim()];
  return names.some((name) => name && mentions(text, name));
}

// Returns the skills the text supports (input order, duplicates removed) and
// the ones that were dropped, so callers can log or flag them.
function groundSkills(skills, text) {
  const kept = [];
  const dropped = [];
  const seen = new Set();
  for (const skill of skills || []) {
    const key = canonicalSkill(skill);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    (isSupported(skill, text) ? kept : dropped).push(skill);
  }
  return { kept, dropped };
}

module.exports = { groundSkills, isSupported };
