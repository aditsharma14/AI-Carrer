// Two different questions, two endpoints (see app.js):
//
//   /health  (liveness)  "is the process alive?" Never touches a dependency,
//            so a Mongo or Redis outage can't make the orchestrator kill and
//            restart a perfectly healthy API in a loop.
//   /ready   (readiness) "should this instance receive traffic right now?"
//            Checks MongoDB and Redis, and flips to 503 the moment shutdown
//            starts so the load balancer drains it before connections close.

const CHECK_TIMEOUT_MS = 1500;

let shuttingDown = false;
function markShuttingDown() {
  shuttingDown = true;
}
// Test helper: module state would otherwise leak between tests.
function resetShuttingDown() {
  shuttingDown = false;
}
function isShuttingDown() {
  return shuttingDown;
}

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} check timed out`)), CHECK_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Dependencies are resolved lazily (and can be injected in tests), so merely
// importing this file never opens a database or Redis connection.
function defaultDeps() {
  return { mongoose: require('../config/db').mongoose, redis: require('../config/redis').cacheConnection };
}

async function checkMongo({ mongoose }) {
  // readyState 1 = connected. ping confirms the server actually answers.
  if (mongoose.connection.readyState !== 1) throw new Error('not connected');
  await mongoose.connection.db.admin().ping();
}

async function checkRedis({ redis }) {
  const reply = await redis.ping();
  if (reply !== 'PONG') throw new Error(`unexpected reply ${reply}`);
}

async function runCheck(name, fn) {
  const start = Date.now();
  try {
    await withTimeout(fn(), name);
    return { name, ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { name, ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

async function readiness(deps = defaultDeps()) {
  if (shuttingDown) return { ready: false, status: 'shutting_down', checks: [] };

  const checks = await Promise.all([
    runCheck('mongodb', () => checkMongo(deps)),
    runCheck('redis', () => checkRedis(deps)),
  ]);
  const ready = checks.every((c) => c.ok);
  return { ready, status: ready ? 'ready' : 'degraded', checks };
}

module.exports = { readiness, markShuttingDown, resetShuttingDown, isShuttingDown };
