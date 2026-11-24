// Parsers for environment settings whose WRONG value is a security problem, kept
// separate from env.js so each can be tested on its own. Both reject unsafe or
// nonsensical input at boot, instead of quietly running misconfigured.

// TRUST_PROXY: how many reverse proxies sit in front of the app (a hosting
// provider's load balancer is usually 1). Express then reads the real client
// address from X-Forwarded-For. It matters for two things: rate limiting (behind
// a proxy EVERY user otherwise looks like the proxy's address, so they all share
// one limit) and req.ip in logs.
//
// A number of hops (or a list of trusted addresses / CIDR ranges) is accepted.
// `true` is refused: it trusts every X-Forwarded-For header, so any client could
// claim any address and walk around rate limits.
function parseTrustProxy(value) {
  const v = String(value ?? '').trim();
  if (v === '' || v === 'false' || v === '0') return false;
  if (v === 'true') {
    throw new Error(
      'TRUST_PROXY=true trusts every client-supplied address and lets anyone bypass rate limits. ' +
        'Use the number of proxies in front of the app (for example 1) or a list of trusted addresses.'
    );
  }
  if (/^\d+$/.test(v)) return Number(v);
  return v; // for example "loopback, 10.0.0.0/8"
}

// COOKIE_SAMESITE for the refresh-token cookie.
//   lax    (default) works when the web app and the API share a registrable
//          domain (app.example.com and api.example.com)
//   strict tightest, but the cookie is not sent when arriving from another site
//   none   needed when the web app and API are on DIFFERENT sites (for example
//          two *.onrender.com hosts). Requires HTTPS, so it is only accepted in
//          production, where cookies are already marked Secure.
function parseSameSite(value, nodeEnv) {
  const v = String(value || 'lax').trim().toLowerCase();
  if (!['lax', 'strict', 'none'].includes(v)) {
    throw new Error(`COOKIE_SAMESITE must be lax, strict or none, got '${value}'`);
  }
  if (v === 'none' && nodeEnv !== 'production') {
    throw new Error('COOKIE_SAMESITE=none requires NODE_ENV=production (browsers reject it without HTTPS)');
  }
  return v;
}

module.exports = { parseTrustProxy, parseSameSite };
