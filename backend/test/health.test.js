import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const health = require('../src/lib/health');
const { registerShutdown } = require('../src/lib/shutdown');

const mongoUp = { connection: { readyState: 1, db: { admin: () => ({ ping: async () => ({ ok: 1 }) }) } } };
const mongoDown = { connection: { readyState: 0 } };
const redisUp = { ping: async () => 'PONG' };

beforeEach(() => health.resetShuttingDown());

describe('readiness', () => {
  it('is ready when MongoDB and Redis answer', async () => {
    const result = await health.readiness({ mongoose: mongoUp, redis: redisUp });
    expect(result.ready).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.checks.map((c) => c.name).sort()).toEqual(['mongodb', 'redis']);
  });

  it('reports which dependency is down', async () => {
    const result = await health.readiness({ mongoose: mongoDown, redis: redisUp });
    expect(result.ready).toBe(false);
    expect(result.status).toBe('degraded');
    expect(result.checks.find((c) => c.name === 'mongodb')).toMatchObject({ ok: false, error: 'not connected' });
    expect(result.checks.find((c) => c.name === 'redis').ok).toBe(true);
  });

  it('times out a hung dependency instead of hanging the probe', async () => {
    const hung = { ping: () => new Promise(() => {}) };
    const started = Date.now();
    const result = await health.readiness({ mongoose: mongoUp, redis: hung });
    expect(Date.now() - started).toBeLessThan(3000);
    expect(result.checks.find((c) => c.name === 'redis')).toMatchObject({ ok: false });
  });

  it('flips to not-ready as soon as shutdown starts, without touching dependencies', async () => {
    health.markShuttingDown();
    const ping = vi.fn();
    const result = await health.readiness({ mongoose: mongoUp, redis: { ping } });
    expect(result).toMatchObject({ ready: false, status: 'shutting_down' });
    expect(ping).not.toHaveBeenCalled();
  });
});

describe('registerShutdown', () => {
  let exit;
  let handlers;

  beforeEach(() => {
    exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
    handlers = {};
    vi.spyOn(process, 'on').mockImplementation((signal, fn) => {
      handlers[signal] = fn;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('runs steps in order, then exits 0', async () => {
    const order = [];
    const onStart = vi.fn(() => order.push('onStart'));
    registerShutdown({
      onStart,
      steps: [
        { name: 'a', run: async () => order.push('a') },
        { name: 'b', run: async () => order.push('b') },
      ],
    });
    await handlers.SIGTERM();
    expect(order).toEqual(['onStart', 'a', 'b']);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('still runs later steps when one fails, and exits 1', async () => {
    const later = vi.fn();
    registerShutdown({
      steps: [
        { name: 'boom', run: async () => { throw new Error('x'); } },
        { name: 'later', run: later },
      ],
    });
    await handlers.SIGINT();
    expect(later).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('ignores a second signal while shutting down', async () => {
    const step = vi.fn();
    registerShutdown({ steps: [{ name: 's', run: step }] });
    await Promise.all([handlers.SIGTERM(), handlers.SIGTERM()]);
    expect(step).toHaveBeenCalledTimes(1);
  });
});
