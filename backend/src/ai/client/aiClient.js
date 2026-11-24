const env = require('../../config/env');
const logger = require('../../config/logger');
const { getProvider, getEmbeddingProvider } = require('./providers');
const { getSchema, isStructured } = require('../schemas');
const { CircuitBreaker } = require('./circuitBreaker');
const { AiProviderError } = require('./providers/errors');
const { estimateCostUsd } = require('./pricing');
const metrics = require('../../lib/metrics');

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

// In-process usage counters. Not a metrics system (that is Phase 3
// observability) — just enough for the evaluation suite and local debugging to
// answer "how many calls, how many tokens, how often did the repair retry
// fire, how often did output fail validation" for a run.
function freshStats() {
  return { calls: 0, errors: 0, outputErrors: 0, repaired: 0, fallbacks: 0, breakerSkips: 0, tokensIn: 0, tokensOut: 0, latenciesMs: [] };
}
let stats = freshStats();
const getStats = () => ({ ...stats, latenciesMs: [...stats.latenciesMs] });
const resetStats = () => {
  stats = freshStats();
};

// Validates against the promptVersion's contract (ai/schemas.js) for EVERY
// provider — including the stub, so a mock that drifts from what a real
// model is constrained to return fails loudly in tests.
function validate(promptVersion, value) {
  const result = getSchema(promptVersion).safeParse(value);
  if (!result.success) throw new AiOutputError(promptVersion, result.error.issues.slice(0, 5));
  return result.data;
}

// ---------------------------------------------------------------- fallback
// AI_PROVIDER is tried first; AI_FALLBACK_PROVIDERS (comma separated) are tried
// in order when it fails. Each provider has its own circuit breaker.
//
// Embeddings are deliberately NOT part of this: vectors from different models
// live in different spaces, so falling back mid-way would silently mix them and
// corrupt every similarity score. An embedding failure is an error, on purpose.
const breakers = new Map();
function breakerFor(name) {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker({ threshold: env.ai.breakerThreshold, cooldownMs: env.ai.breakerCooldownMs }));
  }
  return breakers.get(name);
}
const getBreakerStates = () => Object.fromEntries([...breakers].map(([name, b]) => [name, b.snapshot()]));
const resetBreakers = () => breakers.clear();

// The provider was unreachable or refused us: counts toward opening the breaker.
const OUTAGE_CODES = new Set(['unreachable', 'timeout', 'rate_limited', 'http_error', 'auth']);
// The provider answered but not usefully: try the next provider, but the
// provider itself is healthy. Anything else (for example bad_prompt, our own
// bug) is not retried elsewhere, since another provider would fail the same way.
const CONTENT_CODES = new Set(['bad_output', 'max_tokens', 'model_missing']);

function providerChain() {
  return [env.ai.provider, ...env.ai.fallbackProviders.filter((name) => name !== env.ai.provider)];
}

// One attempt against one named provider, including output validation.
async function completeWith(name, { promptVersion, messages, mock, tools, agent }) {
  const provider = getProvider(name);
  const start = Date.now();

  let result;
  try {
    result = await provider.complete({
      messages,
      mock,
      tools,
      agent,
      schema: getSchema(promptVersion),
      structured: isStructured(promptVersion),
    });
  } catch (err) {
    stats.calls += 1;
    stats.errors += 1;
    if (err.code === 'bad_output') stats.outputErrors += 1;
    metrics.observeAiCall({ provider: name, outcome: 'error', latencyMs: Date.now() - start });
    throw err;
  }

  stats.calls += 1;
  stats.tokensIn += result.tokensIn || 0;
  stats.tokensOut += result.tokensOut || 0;
  stats.latenciesMs.push(Date.now() - start);
  if (result.attempts > 1) stats.repaired += 1;

  logger.info('ai.complete', {
    provider: name,
    model: name === 'stub' ? undefined : env.ai.modelFor(name),
    promptVersion,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costUsd: estimateCostUsd(name, result.tokensIn, result.tokensOut) ?? undefined,
    latencyMs: Date.now() - start,
  });

  try {
    let output;
    if (!agent) {
      output = validate(promptVersion, result.content);
    } else {
      // Agent envelope: a tool call has no reply to validate yet.
      const { reply, toolCall } = result.content;
      output = toolCall ? { reply: null, toolCall } : { reply: validate(promptVersion, reply), toolCall: null };
    }
    metrics.observeAiCall({
      provider: name, outcome: 'success', latencyMs: Date.now() - start,
      tokensIn: result.tokensIn, tokensOut: result.tokensOut,
    });
    return output;
  } catch (err) {
    stats.errors += 1;
    stats.outputErrors += 1;
    // The call itself worked and was billed; only its output was unusable.
    metrics.observeAiCall({
      provider: name, outcome: 'invalid_output', latencyMs: Date.now() - start,
      tokensIn: result.tokensIn, tokensOut: result.tokensOut,
    });
    throw err;
  }
}

// tools: [{ name, description }] — only passed by agentOrchestrator.
// agent: true makes the provider return { reply, toolCall }.
async function complete({ promptVersion, messages, mock, tools = [], agent = false }) {
  const chain = providerChain();
  let lastError = null;

  for (const [index, name] of chain.entries()) {
    const breaker = breakerFor(name);
    if (!breaker.canRequest()) {
      stats.breakerSkips += 1;
      continue;
    }

    try {
      const output = await completeWith(name, { promptVersion, messages, mock, tools, agent });
      breaker.recordSuccess();
      if (index > 0) {
        stats.fallbacks += 1;
        metrics.observeFallback();
        logger.warn('ai.fallback', { served: name, primary: chain[0], promptVersion });
      }
      return output;
    } catch (err) {
      lastError = err;
      const outage = OUTAGE_CODES.has(err.code);
      // An output-validation failure (AiOutputError) is also a content failure.
      const content = CONTENT_CODES.has(err.code) || err instanceof AiOutputError;
      if (!outage && !content) throw err;

      // The provider answered, so it is reachable: only outages hurt the breaker.
      if (outage) breaker.recordFailure();
      else breaker.recordSuccess();

      logger.warn('ai.provider_failed', {
        provider: name,
        code: err.code || err.name,
        promptVersion,
        willTryNext: index < chain.length - 1,
      });
    }
  }

  if (lastError) throw lastError;
  // Every provider's breaker was open: fail immediately instead of waiting.
  throw new AiProviderError(`All AI providers are unavailable (${chain.join(', ')}); circuit breakers are open`, {
    code: 'unavailable',
  });
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

module.exports = { complete, embed, embedMany, AiOutputError, getStats, resetStats, getBreakerStates, resetBreakers };
