const aiClient = require('../client/aiClient');

async function embedChunks(chunks) {
  const embedded = [];
  for (const chunk of chunks) {
    const vector = await aiClient.embed(chunk.text);
    embedded.push({ ...chunk, vector });
  }
  return embedded;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dot / denominator;
}

module.exports = { embedChunks, cosineSimilarity };
