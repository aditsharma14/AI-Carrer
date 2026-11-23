const env = require('../../config/env');
const logger = require('../../config/logger');
const { getProvider, getEmbeddingProvider } = require('./providers');
const { getSchema, isStructured } = require('../schemas');

// THE chokepoint. No module service, controller, or repository is allowed to
// import a provider directly — they all call complete()/embed() here. This
// is the one place cost logging, output validation, and provider-swapping live.
//
// `mock` is only consumed by the stub provider (see stubProvider.js) — a real
// provider implementation ignores it and builds an actual API call from
// `messages` instead. Every AI service passes both so it works under either.

class AiOutputError extends Error {
  constructor(promptVersion, issues) {
    super(`AI output for ${promptVersion} did not match its schema`);
    this.name = 'AiOutputError';
    this.issues = issues;
  }
}

// Validates against the promptVersion's contract (ai/schemas.js) for EVERY
// provider — including the stub, so a mock that drifts from what a real
// model is constrained to return fails loudly in tests.
function validate(promptVersion, value) {
  const result = getSchema(promptVersion).safeParse(value);
  if (!result.success) throw new AiOutputError(promptVersion, result.error.issues.slice(0, 5));
  return result.data;
}

// tools: [{ name, description }] — only passed by agentOrchestrator.
// agent: true makes the provider return { reply, toolCall }.
async function complete({ promptVersion, messages, mock, tools = [], agent = false }) {
  const provider = getProvider(env.ai.provider);
  const start = Date.now();

  const result = await provider.complete({
    messages,
    mock,
    tools,
    agent,
    schema: getSchema(promptVersion),
    structured: isStructured(promptVersion),
  });

  logger.info('ai.complete', {
    provider: env.ai.provider,
    model: env.ai.provider === 'stub' ? undefined : env.ai.model,
    promptVersion,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latencyMs: Date.now() - start,
  });

  if (!agent) return validate(promptVersion, result.content);

  // Agent envelope: a tool call has no reply to validate yet.
  const { reply, toolCall } = result.content;
  if (toolCall) return { reply: null, toolCall };
  return { reply: validate(promptVersion, reply), toolCall: null };
}

// inputType: 'query' | 'document' — a hint for retrieval-tuned embedding
// models; the stub ignores it.
async function embed(text, { inputType } = {}) {
  const provider = getEmbeddingProvider(env.ai.embeddingProvider);
  const start = Date.now();

  const vector = await provider.embed(text, { inputType });

  logger.info('ai.embed', { provider: env.ai.embeddingProvider, count: 1, latencyMs: Date.now() - start });
  return vector;
}

async function embedMany(texts, { inputType } = {}) {
  if (texts.length === 0) return [];
  const provider = getEmbeddingProvider(env.ai.embeddingProvider);
  const start = Date.now();

  const vectors = await provider.embedMany(texts, { inputType });

  logger.info('ai.embed', { provider: env.ai.embeddingProvider, count: texts.length, latencyMs: Date.now() - start });
  return vectors;
}

module.exports = { complete, embed, embedMany, AiOutputError };
