import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const env = require('../src/config/env');
const { estimateCostUsd } = require('../src/ai/client/pricing');

afterEach(() => {
  env.ai.pricing = {};
});

describe('estimateCostUsd', () => {
  it('computes from per-million-token prices', () => {
    env.ai.pricing = { groq: { in: 0.59, out: 0.79 } };
    expect(estimateCostUsd('groq', 1_000_000, 1_000_000)).toBeCloseTo(1.38, 6);
    expect(estimateCostUsd('groq', 0, 0)).toBe(0);
  });

  it('returns null, not zero, when a provider has no price', () => {
    env.ai.pricing = { groq: { in: 1, out: 1 } };
    expect(estimateCostUsd('ollama', 1000, 1000)).toBeNull();
    expect(estimateCostUsd('groq', 1, 1)).not.toBeNull();
    env.ai.pricing = { groq: { in: 'x' } };
    expect(estimateCostUsd('groq', 1, 1)).toBeNull();
  });
});
