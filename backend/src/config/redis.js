const Redis = require('ioredis');
const { buildOptions } = require('./redisOptions');

// A factory, not a singleton — BullMQ requires `maxRetriesPerRequest: null`
// on any connection it owns, and queues/workers (built later in src/queue)
// each create their own connection from this factory. The single shared
// `cacheConnection` below is only ever used for AI response caching, so a
// slow queue operation can never block a cache read or vice versa.
function createConnection(overrides = {}) {
  return new Redis(buildOptions(overrides));
}

const cacheConnection = createConnection();

module.exports = { createConnection, cacheConnection };
