const { canonicalSkill } = require('../../src/ai/skills/taxonomy');

// ---------------------------------------------------------------- skills
// Compares a model's skill list with the gold labels after mapping both
// through the taxonomy, so "JS" == "JavaScript". Duplicates collapse.
function skillCounts(predicted, goldSkills, hardNegatives = []) {
  const pred = new Set((predicted || []).map(canonicalSkill).filter(Boolean));
  const gold = new Set(goldSkills.map(canonicalSkill));
  const trap = new Set(hardNegatives.map(canonicalSkill));

  let tp = 0;
  for (const s of pred) if (gold.has(s)) tp += 1;
  let trapHits = 0;
  for (const s of pred) if (trap.has(s)) trapHits += 1;

  return { tp, fp: pred.size - tp, fn: gold.size - tp, trapHits, traps: trap.size };
}

function f1(precision, recall) {
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

// Micro average: pool every resume's counts, then compute P/R/F1 once. Resumes
// with many skills weigh more, which matches "how many skills did we get right
// overall". Empty denominators score 1 only when there was nothing to find.
function microPRF(countsList) {
  const sum = countsList.reduce((a, c) => ({ tp: a.tp + c.tp, fp: a.fp + c.fp, fn: a.fn + c.fn }), { tp: 0, fp: 0, fn: 0 });
  const precision = sum.tp + sum.fp === 0 ? 1 : sum.tp / (sum.tp + sum.fp);
  const recall = sum.tp + sum.fn === 0 ? 1 : sum.tp / (sum.tp + sum.fn);
  return { precision, recall, f1: f1(precision, recall), ...sum };
}

// Of the skills that were mentioned only to say "I don't have this", what
// fraction did the model wrongly claim? The failure a keyword matcher makes.
function trapFalsePositiveRate(countsList) {
  const traps = countsList.reduce((a, c) => a + c.traps, 0);
  const hits = countsList.reduce((a, c) => a + c.trapHits, 0);
  return traps === 0 ? 0 : hits / traps;
}

// Loose entity matching for company and school names: case, punctuation and
// containment are ignored ("Harbor Payments" matches "Harbor Payments Pvt Ltd").
const normText = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function entityRecall(predictedNames, goldNames) {
  if (goldNames.length === 0) return { found: 0, total: 0 };
  const pred = (predictedNames || []).map(normText).filter(Boolean);
  let found = 0;
  for (const g of goldNames.map(normText)) {
    if (pred.some((p) => p === g || p.includes(g) || g.includes(p))) found += 1;
  }
  return { found, total: goldNames.length };
}

// --------------------------------------------------------------- ranking
// `ranked` is the list of true relevance grades (0-3) in the order the system
// ranked the candidates. Gain is 2^rel - 1, the usual NDCG convention, which
// rewards putting a grade-3 candidate first far more than a grade-1.
function dcg(rels, k) {
  return rels.slice(0, k).reduce((sum, rel, i) => sum + (2 ** rel - 1) / Math.log2(i + 2), 0);
}

function ndcg(ranked, k) {
  const ideal = dcg([...ranked].sort((a, b) => b - a), k);
  return ideal === 0 ? null : dcg(ranked, k) / ideal;
}

// Reciprocal rank of the first candidate who is a real fit (grade >= threshold).
function reciprocalRank(ranked, threshold = 2) {
  const i = ranked.findIndex((rel) => rel >= threshold);
  return i === -1 ? 0 : 1 / (i + 1);
}

function precisionAtK(ranked, k, threshold = 2) {
  const top = ranked.slice(0, k);
  return top.length === 0 ? 0 : top.filter((rel) => rel >= threshold).length / k;
}

// Sort by score descending. Ties break by id so the order is deterministic
// (the stub embedding produces many identical scores).
function rankBy(items, scoreOf) {
  return [...items].sort((a, b) => scoreOf(b) - scoreOf(a) || (a.id < b.id ? -1 : 1));
}

// ------------------------------------------------------------ statistics
const mean = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

function percentile(xs, p) {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

module.exports = {
  skillCounts, microPRF, f1, trapFalsePositiveRate, entityRecall,
  dcg, ndcg, reciprocalRank, precisionAtK, rankBy, mean, percentile,
};
