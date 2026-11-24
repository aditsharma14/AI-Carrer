const env = require('../../config/env');

// Estimated cost of one AI call in US dollars, from token counts and prices you
// supply in AI_PRICING, for example:
//   AI_PRICING={"groq":{"in":0.59,"out":0.79},"huggingface":{"in":0.15,"out":0.60}}
// Prices are USD per million tokens. Nothing is guessed: a provider with no
// entry (the stub, local Ollama) returns null, which callers treat as "unknown",
// not zero, so a missing price can never look like a free call.
function estimateCostUsd(provider, tokensIn = 0, tokensOut = 0) {
  const price = env.ai.pricing?.[provider];
  if (!price || typeof price.in !== 'number' || typeof price.out !== 'number') return null;
  return (tokensIn * price.in + tokensOut * price.out) / 1e6;
}

module.exports = { estimateCostUsd };
