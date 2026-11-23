const env = require('../../../config/env');
const { createOpenAICompatibleProvider } = require('./openaiCompatibleProvider');
const { AiProviderError } = require('./errors');

// Groq — fast hosted inference for open models (Llama, gpt-oss, Qwen).
// OpenAI-compatible API. Groq has no embeddings endpoint, so pair it with
// EMBEDDING_PROVIDER=huggingface or ollama.
//
// JSON: 'json_object' works on most Groq models. 'json_schema' (strict
// constrained decoding) only on a few (e.g. openai/gpt-oss-120b) — set
// AI_JSON_MODE=json_schema when using one of those.
const provider = createOpenAICompatibleProvider(() => ({
  name: 'Groq',
  keyEnvVar: 'GROQ_API_KEY',
  baseUrl: env.ai.groq.baseUrl,
  apiKey: env.ai.groq.apiKey,
  model: env.ai.modelFor('groq'),
  maxTokens: env.ai.maxTokens,
  timeoutMs: env.ai.timeoutMs,
  jsonMode: env.ai.jsonModeFor('groq'),
}));

async function embed() {
  throw new AiProviderError('Groq has no embeddings API — set EMBEDDING_PROVIDER=huggingface or ollama', {
    code: 'no_embeddings',
  });
}

module.exports = { complete: provider.complete, embed, embedMany: embed };
