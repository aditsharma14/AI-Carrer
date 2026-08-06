const env = require('../../config/env');
const logger = require('../../config/logger');
const { getProvider } = require('./providers');

// THE chokepoint. No module service, controller, or repository is allowed to
// import a provider directly — they all call complete()/embed() here. This
// is the one place cost logging, retries, and provider-swapping live.
//
// `mock` is only consumed by the stub provider (see stubProvider.js) — a real
// provider implementation ignores it and builds an actual API call from
// `messages` instead. Every AI service passes both so it works under either.
async function complete({ promptVersion, messages, mock }) {
  const provider = getProvider(env.ai.provider);
  const start = Date.now();

  const result = await provider.complete({ messages, mock });

  logger.info('ai.complete', {
    provider: env.ai.provider,
    promptVersion,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latencyMs: Date.now() - start,
  });

  return result.content;
}

async function embed(text) {
  const provider = getProvider(env.ai.provider);
  const start = Date.now();

  const vector = await provider.embed(text);

  logger.info('ai.embed', { provider: env.ai.provider, latencyMs: Date.now() - start });

  return vector;
}

module.exports = { complete, embed };
