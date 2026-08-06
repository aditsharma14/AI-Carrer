const stubProvider = require('./stubProvider');

// Only 'stub' is implemented right now — that was a deliberate scope
// decision (no LLM API key configured yet), not an oversight. Adding a real
// provider later means writing one new file with the same { complete, embed }
// shape and adding one line here — every AI service stays untouched.
const PROVIDERS = {
  stub: stubProvider,
};

function getProvider(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(
      `AI provider '${providerName}' is not implemented yet. ` +
      `Implement ai/client/providers/${providerName}.js with { complete, embed } and register it here.`
    );
  }
  return provider;
}

module.exports = { getProvider };
