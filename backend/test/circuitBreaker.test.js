import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CircuitBreaker } = require('../src/ai/client/circuitBreaker');

describe('CircuitBreaker', () => {
  let now;
  const clock = () => now;
  beforeEach(() => { now = 0; });

  it('opens at the threshold and reopens when the trial fails', () => {
    const b = new CircuitBreaker({ threshold: 2, cooldownMs: 100, now: clock });
    b.recordFailure();
    expect(b.canRequest()).toBe(true);
    b.recordFailure();
    expect(b.canRequest()).toBe(false);

    now = 100;
    expect(b.canRequest()).toBe(true); // half-open trial
    b.recordFailure();
    now = 150;
    expect(b.canRequest()).toBe(false); // re-opened for a fresh cooldown
  });

  it('lets only one trial through while half-open', () => {
    const b = new CircuitBreaker({ threshold: 1, cooldownMs: 100, now: clock });
    b.recordFailure();
    now = 100;
    expect(b.canRequest()).toBe(true);
    expect(b.canRequest()).toBe(false);
    b.recordSuccess();
    expect(b.canRequest()).toBe(true);
  });

  it('a success resets the failure count', () => {
    const b = new CircuitBreaker({ threshold: 3, cooldownMs: 100, now: clock });
    b.recordFailure();
    b.recordFailure();
    b.recordSuccess();
    b.recordFailure();
    b.recordFailure();
    expect(b.snapshot()).toEqual({ state: 'closed', consecutiveFailures: 2 });
  });
});
