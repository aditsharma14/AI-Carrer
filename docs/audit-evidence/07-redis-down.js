// Audit evidence script. Run from the repository root:  node docs/audit-evidence/07-redis-down.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// With the app's exact Redis options and NO Redis server: how long does a cache read take?
const path = require('path');
const root = (REPO + '/backend');
process.env.MONGODB_URI = 'mongodb://x';
process.env.JWT_ACCESS_SECRET = 'a';
process.env.JWT_REFRESH_SECRET = 'b';
process.env.LOG_LEVEL = 'error';
process.env.REDIS_PORT = '6399'; // nothing listens here
const Redis = require(path.join(root, 'node_modules/ioredis'));
const { buildOptions } = require(path.join(root, 'src/config/redisOptions'));

const redis = new Redis(buildOptions());
redis.on('error', () => {}); // keep the log quiet; retries continue silently

(async () => {
  const started = Date.now();
  const outcome = await Promise.race([
    redis.get('some-cache-key').then(() => 'resolved', (e) => `rejected: ${e.message}`),
    new Promise((resolve) => setTimeout(() => resolve('STILL PENDING after 5000 ms'), 5000)),
  ]);
  console.log(`cache read with Redis down -> ${outcome} (${Date.now() - started} ms)`);
  process.exit(0);
})();
