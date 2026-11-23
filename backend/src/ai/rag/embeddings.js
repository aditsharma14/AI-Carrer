const aiClient = require('../client/aiClient');

// One batched call for all chunks instead of one HTTP round trip per chunk.
async function embedChunks(chunks) {
  const vectors = await aiClient.embedMany(
    chunks.map((chunk) => chunk.text),
    { inputType: 'document' }
  );
  return chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] }));
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
