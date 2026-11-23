const { cacheConnection } = require('../../config/redis');
const logger = require('../../config/logger');
const env = require('../../config/env');

// Generic cache-or-compute wrapper. Every AI service builds its own cache key
// (it's the only layer that knows what makes two requests "the same" — a
// resume score's key depends on resumeVersionId+jobId, a coaching reply's key
// depends on the user+question) and wraps its aiClient call in this.
//
// This is the single highest-leverage cost-control lever in the whole AI
// layer: a cache hit costs one Redis round-trip; a cache miss costs a billed
// LLM call. Same code path either way — callers never need to know which happened.
// Namespaced by provider + model: a result cached while running on the stub
// (or an older model) must never be served after switching to a real one.
function namespaced(cacheKey) {
  return `ai:${env.ai.provider}:${env.ai.model}:${env.ai.embeddingProvider}:${env.ai.embeddingModel}:${cacheKey}`;
}

async function withCache(rawKey, ttlSeconds, computeFn) {
  const cacheKey = namespaced(rawKey);
  const cached = await cacheConnection.get(cacheKey);
  if (cached) {
    logger.info('ai.cache', { cacheKey, hit: true });
    return JSON.parse(cached);
  }

  const result = await computeFn();
  await cacheConnection.set(cacheKey, JSON.stringify(result), 'EX', ttlSeconds);
  logger.info('ai.cache', { cacheKey, hit: false });
  return result;
}

async function invalidate(rawKey) {
  await cacheConnection.del(namespaced(rawKey));
}

module.exports = { withCache, invalidate };
