// A real implementation of the provider interface — it just returns
// caller-supplied fake data instead of calling a network API. Every AI
// service that calls aiClient.complete() passes a `mock` function describing
// "what would a plausible LLM response look like here"; this provider's only
// job is to invoke that function and shape the result like a real provider
// response would be shaped (so swapping to a real provider later changes
// nothing about how AI services consume the result).
async function complete({ mock }) {
  if (typeof mock !== 'function') {
    throw new Error('stubProvider.complete() requires a mock() function while AI_PROVIDER=stub');
  }

  const start = Date.now();
  const content = await mock();
  const latencyMs = Date.now() - start;

  return {
    content,
    tokensIn: 0,
    tokensOut: 0,
    latencyMs,
  };
}

// NOT semantically meaningful — this produces a structurally valid vector
// (same dimension every time, deterministic for the same input) so cosine
// similarity code in the matching/RAG layers runs end-to-end, but it does
// NOT represent real semantic closeness between texts. Swapping AI_PROVIDER
// to a real provider is required before trusting any matching score.
const EMBEDDING_DIM = 64;

async function embed(text) {
  const vector = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    vector[i % EMBEDDING_DIM] += text.charCodeAt(i);
  }
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

async function embedMany(texts) {
  return Promise.all(texts.map((text) => embed(text)));
}

module.exports = { complete, embed, embedMany };
