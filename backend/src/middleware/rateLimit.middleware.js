const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Keyed by tenant+user once auth/tenant have run, not just IP — a 50-person
// org behind one office NAT shouldn't share a bucket with unrelated traffic,
// and one bad actor inside a big org shouldn't hide behind the org's overall
// budget. AI-route limits double as cost control, not just abuse prevention:
// every request in that tier is a billed LLM call.
//
// The IP fallback (anonymous requests — login/signup, before req.user
// exists) MUST go through express-rate-limit's own ipKeyGenerator, not raw
// req.ip: a raw IPv6 address has a huge number of equivalent representations,
// so comparing it as a plain string lets an attacker bypass the limit just by
// varying the address format. ipKeyGenerator normalizes that.
function keyGenerator(req) {
  if (req.tenant) return `org:${req.tenant.id}:user:${req.user.id}`;
  if (req.user) return `user:${req.user.id}`;
  return ipKeyGenerator(req.ip);
}

const TIERS = {
  auth: { windowMs: 15 * 60 * 1000, limit: 20 }, // brute-force defense on login/signup
  aiHeavy: { windowMs: 60 * 1000, limit: 10 }, // cost control on AI-calling routes
  general: { windowMs: 60 * 1000, limit: 120 },
};

function rateLimitTier(tierName) {
  const tier = TIERS[tierName] || TIERS.general;
  return rateLimit({
    windowMs: tier.windowMs,
    limit: tier.limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    message: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' },
  });
}

module.exports = rateLimitTier;
