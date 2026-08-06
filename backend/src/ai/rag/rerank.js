// A coaching turn from yesterday and one from 6 months ago can be textually
// similar to a current question while being very different in usefulness —
// see docs/ARCHITECTURE.md §6.5. This nudges similarity score by recency, it
// doesn't override it outright; a highly relevant old chunk can still win.
const RECENCY_HALF_LIFE_DAYS = 30;

function rerankByRecency(scoredChunks) {
  const now = Date.now();
  return scoredChunks.map((chunk) => {
    if (!chunk.createdAt) return chunk;
    const ageDays = (now - new Date(chunk.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    // 70% original similarity, 30% recency — similarity still dominates.
    return { ...chunk, score: chunk.score * (0.7 + 0.3 * recencyFactor) };
  });
}

module.exports = { rerankByRecency };
