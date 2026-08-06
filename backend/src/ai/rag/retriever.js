const aiClient = require('../client/aiClient');
const { embedChunks, cosineSimilarity } = require('./embeddings');
const { rerankByRecency } = require('./rerank');

const DEFAULT_TOP_K = 5;

// Deliberately generic — this function doesn't know what a "resume" or a
// "coaching session" is. The caller (careerCoachAgent.js) gathers the
// chunks via chunking.js and hands them here; that separation is what lets
// this same retriever serve any future RAG use case without changes.
//
// No persisted vector store: embeddings are computed fresh on every call
// over a small per-user chunk set. Honest scope decision for this stage —
// see Batch 7's Production Considerations for when that would need to change.
async function retrieveTopChunks(chunks, query, topK = DEFAULT_TOP_K) {
  if (chunks.length === 0) return [];

  const queryVector = await aiClient.embed(query);
  const embeddedChunks = await embedChunks(chunks);

  const scored = embeddedChunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryVector, chunk.vector),
  }));

  return rerankByRecency(scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { retrieveTopChunks };
