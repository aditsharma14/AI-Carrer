const env = require('../../../config/env');
const { createOpenAICompatibleProvider } = require('./openaiCompatibleProvider');

// Hugging Face Inference Providers — one HF token routes chat requests to
// whichever backend serves the model (Groq, Together, Novita...). Model ids
// take an optional routing suffix: ':fastest', ':cheapest' or ':<provider>'.
//
// JSON: support for response_format varies by the provider HF routes to, so
// the default is 'none' (prompt instruction + schema validation + repair
// retry), which works for every model.
const provider = createOpenAICompatibleProvider(() => ({
  name: 'Hugging Face',
  keyEnvVar: 'HF_TOKEN',
  baseUrl: env.ai.huggingface.baseUrl,
  apiKey: env.ai.huggingface.token,
  model: env.ai.modelFor('huggingface'),
  maxTokens: env.ai.maxTokens,
  timeoutMs: env.ai.timeoutMs,
  jsonMode: env.ai.jsonModeFor('huggingface'),
}));

module.exports = { complete: provider.complete };
