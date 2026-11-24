// First line of defense against prompt injection through uploaded text.
//
// A resume is written by the person being evaluated, so it is attacker-
// controlled input to the model. Wrapping it in tags and saying "this is data"
// (ai/prompts/dataBlock.js) asks the model to behave; on the first local-model
// evaluation a small model still obeyed 4 of 6 planted instructions. This
// layer does not ask: it finds sentences that read as instructions to an AI
// and removes them before the model sees them, and reports what it found so
// the resume can be flagged for a human.
//
// WHAT THIS IS NOT: a complete defense. It matches known phrasing in English;
// a paraphrase or another language gets through (test/injectionGuard.test.js
// pins two such gaps on purpose). It is one layer among several: the prompt
// (resumeParser.v2), output grounding (grounding.js) and human review of
// flagged resumes cover what it misses.
const REDACTION = '[removed: suspected prompt-injection text]';

// Where an injected instruction wants its text to end up.
const OUTPUT_TARGET =
  '(?:(?:to|in|into)\\s+the\\s+(?:skills?(?:\\s+list)?|summary(?:\\s+field)?|extracted\\s+skills|parsed\\s+(?:output|result)|output|json)' +
  '|(?:in|into|to)\\s+(?:your|this)\\s+(?:output|response|answer|summary|json|reply))\\b';

const TAGS = 'resume|resume_data|candidate_data|tool_result|context|transcript|skill_gaps|job_description|system|instructions?';

// Each rule is tested against one SENTENCE at a time, so a match removes that
// sentence and nothing around it.
const RULES = [
  {
    id: 'override-instructions',
    pattern: /\b(ignore|disregard|forget|override)\b[^.\n]{0,50}\b(previous|prior|above|earlier|preceding|all)\b[^.\n]{0,40}\b(instructions?|prompts?|rules?|directions?|context)\b/i,
  },
  { id: 'new-instructions', pattern: /\bnew\s+(instructions?|task|rules?)\s*:/i },
  { id: 'role-reassignment', pattern: /\byou\s+are\s+now\b/i },
  // Uppercase only: "Teaching Assistant:" and "Systems:" are normal resume text.
  { id: 'system-impersonation', pattern: /^\s*[[(]?\s*(SYSTEM|ASSISTANT|DEVELOPER)\s*[\])]?\s*:/m },
  {
    id: 'addresses-ai',
    pattern: /\b(note|message|instructions?|attention|reminder)\s+(to|for)\s+(the\s+)?(ai|a\.i\.|llm|language\s+model|model|assistant|chatbot|parser|ats|screening\s+(system|tool)|automated\s+system)/i,
  },
  {
    id: 'steers-output',
    pattern: new RegExp(`\\b(add|append|include|insert|write|put|inject|print)\\b[^.\\n]{0,70}\\b${OUTPUT_TARGET}`, 'i'),
  },
  { id: 'json-hijack', pattern: /\b(return|respond\s+with|reply\s+with|output)\s+(exactly\s+)?(this|the\s+following)\s+(json|object|text)\b/i },
  { id: 'tag-breakout', pattern: new RegExp(`<\\s*/?\\s*(${TAGS})\\b`, 'i') },
  {
    id: 'score-manipulation',
    pattern: /\b(rate|score|rank)\s+(this|the)\s+(candidate|applicant|resume)\b[^.\n]{0,30}\b(\d{2,3}\s*(\/|out of)\s*\d{2,3}|highest|perfect|top|best)\b/i,
  },
];

function matchingRules(sentence) {
  return RULES.filter((rule) => rule.pattern.test(sentence)).map((rule) => rule.id);
}

// Read-only check.
function scanForInjection(text) {
  const rules = new Set();
  for (const line of String(text).split('\n')) {
    for (const sentence of line.split(/(?<=[.!?])\s+/)) matchingRules(sentence).forEach((id) => rules.add(id));
  }
  return { suspicious: rules.size > 0, rules: [...rules].sort() };
}

// Returns the text with every matching sentence replaced by a fixed marker,
// plus what was found. Line breaks and untouched sentences are preserved
// exactly, so a clean resume comes back byte-for-byte identical.
function redactInjection(text) {
  const rules = new Set();
  let redactions = 0;

  const cleaned = String(text)
    .split('\n')
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => {
          const hit = matchingRules(sentence);
          if (hit.length === 0) return sentence;
          hit.forEach((id) => rules.add(id));
          redactions += 1;
          return REDACTION;
        })
        .join(' ')
    )
    .join('\n');

  return { text: cleaned, suspicious: redactions > 0, rules: [...rules].sort(), redactions };
}

module.exports = { scanForInjection, redactInjection, REDACTION, RULE_IDS: RULES.map((r) => r.id) };
