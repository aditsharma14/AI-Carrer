const { SKILLS } = require('./taxonomy');
const { createRng } = require('./rng');

// Matching baselines. A model only deserves credit for what it adds over
// these, so every report shows them next to the system under test.
//   random   seeded shuffle: the floor (what knowing nothing scores)
//   keyword  what a plain applicant-tracking filter does: the share of the job's
//            required skills whose name appears anywhere in the text, case
//            insensitively. It cannot tell "never used Terraform" from
//            "5 years of Terraform"
//   tfidf    cosine similarity of tf-idf vectors: classic information retrieval

const tokenize = (text) => text.toLowerCase().match(/[a-z0-9+#.]+/g) || [];

function keywordScores(job, resumes) {
  const lowerJobSkills = job.requiredSkills.map((s) => [s, ...SKILLS[s]].map((a) => a.toLowerCase()));
  return Object.fromEntries(
    resumes.map((r) => {
      const text = r.text.toLowerCase();
      const hit = lowerJobSkills.filter((names) => names.some((n) => text.includes(n))).length;
      return [r.id, hit / lowerJobSkills.length];
    })
  );
}

function tfidfScores(job, resumes) {
  const docs = [job.description, ...resumes.map((r) => r.text)].map(tokenize);
  const df = new Map();
  for (const tokens of docs) for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
  const idf = (t) => Math.log((docs.length + 1) / ((df.get(t) || 0) + 1)) + 1;

  const vector = (tokens) => {
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const v = new Map();
    let norm = 0;
    for (const [t, c] of tf) {
      const w = (1 + Math.log(c)) * idf(t);
      v.set(t, w);
      norm += w * w;
    }
    return { v, norm: Math.sqrt(norm) || 1 };
  };

  const jobVec = vector(docs[0]);
  return Object.fromEntries(
    resumes.map((r, i) => {
      const doc = vector(docs[i + 1]);
      let dot = 0;
      for (const [t, w] of doc.v) dot += w * (jobVec.v.get(t) || 0);
      return [r.id, dot / (doc.norm * jobVec.norm)];
    })
  );
}

function randomScores(job, resumes, seed = 7) {
  const rng = createRng(seed + [...job.id].reduce((a, c) => a + c.charCodeAt(0), 0));
  return Object.fromEntries(resumes.map((r) => [r.id, rng.next()]));
}

module.exports = { baselines: { random: randomScores, keyword: keywordScores, tfidf: tfidfScores } };
