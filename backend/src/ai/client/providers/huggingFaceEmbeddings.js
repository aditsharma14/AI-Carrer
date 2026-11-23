const env = require('../../../config/env');
const { postJson } = require('./openModelChat');
const { AiProviderError } = require('./errors');

// Embeddings through Hugging Face's feature-extraction task (served by HF's
// own "hf-inference" provider). Default model: BAAI/bge-small-en-v1.5 —
// small, fast, strong for retrieval. Override with EMBEDDING_MODEL, or the
// whole URL with HF_EMBEDDING_URL if HF changes its routing.
const MAX_BATCH = 32;

function embeddingUrl() {
  if (env.ai.huggingface.embeddingUrl) return env.ai.huggingface.embeddingUrl;
  const model = env.ai.embeddingModelFor('huggingface');
  return `https://router.huggingface.co/hf-inference/models/${model}/pipeline/feature-extraction`;
}

// Sentence-embedding models return one vector per input. Raw transformer
// models return one vector per TOKEN — mean-pool those into one.
function toSentenceVector(output) {
  if (Array.isArray(output[0])) {
    const dims = output[0].length;
    const sum = new Array(dims).fill(0);
    for (const token of output) for (let d = 0; d < dims; d++) sum[d] += token[d];
    return sum.map((v) => v / output.length);
  }
  return output;
}

async function embedMany(texts) {
  if (!env.ai.huggingface.token) {
    throw new AiProviderError('EMBEDDING_PROVIDER=huggingface needs HF_TOKEN', { code: 'auth' });
  }

  const vectors = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const json = await postJson(embeddingUrl(), {
      headers: { Authorization: `Bearer ${env.ai.huggingface.token}` },
      body: { inputs: texts.slice(i, i + MAX_BATCH), normalize: true },
      timeoutMs: env.ai.timeoutMs,
      providerName: 'Hugging Face embeddings',
    });
    if (!Array.isArray(json)) {
      throw new AiProviderError('Hugging Face embeddings returned an unexpected response', {
        code: 'bad_output',
        details: JSON.stringify(json).slice(0, 300),
      });
    }
    vectors.push(...json.map(toSentenceVector));
  }
  return vectors;
}

async function embed(text) {
  const [vector] = await embedMany([text]);
  return vector;
}

module.exports = { embed, embedMany, toSentenceVector };
