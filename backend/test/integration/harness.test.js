import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { startHarness } = require('./support/harness');
const { assertSafeIntegrationUri } = require('./support/safety');

describe('integration harness', () => {
  let harness;
  beforeAll(async () => {
    harness = await startHarness();
  });
  afterAll(async () => {
    await harness.stop();
  });

  it('is connected to a real MongoDB replica set', async () => {
    // A replica set reports a setName; a standalone server does not. Transactions
    // (milestone M1.4a) need a replica set, so the harness must prove it has one.
    const hello = await harness.mongoose.connection.db.admin().command({ hello: 1 });
    expect(hello.setName).toBeTruthy();
    expect(hello.isWritablePrimary).toBe(true);
  });

  it('serves the real app: /ready is 200 with MongoDB and Redis both checked', async () => {
    const res = await harness.request('GET', '/ready', { root: true });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.map((c) => c.name).sort()).toEqual(['mongodb', 'redis']);
    expect(res.body.checks.every((c) => c.ok)).toBe(true);
  });

  it('empties every collection between tests without using Mongoose queries', async () => {
    await harness.mongoose.connection.collection('users').insertOne({ name: 'x' });
    await harness.reset();
    expect(await harness.mongoose.connection.collection('users').countDocuments()).toBe(0);
  });
});

describe('integration safety guard', () => {
  it('accepts a database named *_integration', () => {
    expect(assertSafeIntegrationUri('mongodb://localhost:27017/ai_career_integration?directConnection=true')).toBe(
      'ai_career_integration'
    );
  });

  it('refuses a database that is not named *_integration, because the harness deletes data', () => {
    expect(() => assertSafeIntegrationUri('mongodb://localhost:27017/ai_career')).toThrow(/must end with/);
    expect(() => assertSafeIntegrationUri('mongodb+srv://u:p@cluster.example.net/production')).toThrow(/must end with/);
  });

  it('refuses to run when no integration URI is provided', () => {
    expect(() => assertSafeIntegrationUri('')).toThrow(/INTEGRATION_MONGODB_URI is not set/);
  });
});
