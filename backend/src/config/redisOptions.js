const env = require('./env');

// Connection options for every Redis client (cache, queue producers, workers).
// Pure and free of side effects, so it can be tested without opening a
// connection; config/redis.js turns it into real clients.
function buildOptions(overrides = {}) {
  return {
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    // Managed Redis usually requires an encrypted connection; the server name
    // is needed for the certificate check.
    ...(env.redis.tls ? { tls: { servername: env.redis.host } } : {}),
    maxRetriesPerRequest: null, // required by BullMQ on any connection it owns
    ...overrides,
  };
}

module.exports = { buildOptions };
