// The shared integration harness: the REAL Express app, on a real port, backed
// by a real MongoDB and Redis. Nothing is mocked. Tests call the app over HTTP
// exactly as the frontend does.
//
//   const harness = await startHarness();   // beforeAll
//   await harness.reset();                  // beforeEach
//   const res = await harness.request('POST', '/auth/signup', { body });
//   await harness.stop();                   // afterAll
//
// Requires test/integration/setup.js to have run first (it points the app at the
// integration database and refuses any database not named *_integration).

async function startHarness() {
  // Required lazily so importing this file never loads the app (and never opens
  // a connection) until a test actually asks for it.
  const mongoose = require('mongoose');
  const { connectDb, disconnectDb } = require('../../../src/config/db');
  const app = require('../../../src/app');
  const { cacheConnection } = require('../../../src/config/redis');
  const { queueConnection } = require('../../../src/queue/connection');
  const { queues } = require('../../../src/queue/queues');

  await connectDb();
  // Build every index (notably the unique ones) before the first test, so tests
  // see the same constraints production does.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  const rootUrl = `http://127.0.0.1:${server.address().port}`;

  // Plain fetch (built into Node 20+): no HTTP-test dependency is needed.
  async function request(method, path, { body, token, orgId, headers = {}, root = false } = {}) {
    const res = await fetch(`${root ? rootUrl : baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { 'x-org-id': String(orgId) } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, body: json, text, headers: res.headers, cookies: res.headers.getSetCookie?.() ?? [] };
  }

  // Empties every collection through the native driver. That bypasses Mongoose
  // query middleware on purpose: cleanup must not depend on the tenant plugin,
  // which is the thing under test.
  async function reset() {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  }

  async function stop() {
    await new Promise((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections?.();
    });
    await Promise.all(Object.values(queues).map((queue) => queue.close()));
    await Promise.allSettled([cacheConnection.quit(), queueConnection.quit()]);
    await disconnectDb();
  }

  return { request, reset, stop, mongoose, baseUrl };
}

module.exports = { startHarness };
