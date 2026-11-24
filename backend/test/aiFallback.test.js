import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const env = require('../src/config/env');
const aiClient = require('../src/ai/client/aiClient');
const { COMPLETION_PROVIDERS } = require('../src/ai/client/providers');
const { AiProviderError } = require('../src/ai/client/providers/errors');

const call = () => aiClient.complete({ promptVersion: 'atsScorer.v1', messages: [{ role: 'user', content: 'hi' }] });
const ok = (text) => ({ complete: vi.fn(async () => ({ content: text, tokensIn: 5, tokensOut: 2 })) });
const failing = (code) => ({ complete: vi.fn(async () => { throw new AiProviderError(`boom ${code}`, { code }); }) });

let saved;
beforeEach(() => {
  saved = { provider: env.ai.provider, fallbackProviders: env.ai.fallbackProviders, registry: { ...COMPLETION_PROVIDERS }, threshold: env.ai.breakerThreshold, cooldown: env.ai.breakerCooldownMs };
  env.ai.provider = 'groq';
  env.ai.fallbackProviders = ['huggingface'];
  env.ai.breakerThreshold = 3;
  env.ai.breakerCooldownMs = 30000;
  aiClient.resetBreakers();
  aiClient.resetStats();
});
afterEach(() => {
  Object.assign(env.ai, { provider: saved.provider, fallbackProviders: saved.fallbackProviders, breakerThreshold: saved.threshold, breakerCooldownMs: saved.cooldown });
  Object.assign(COMPLETION_PROVIDERS, saved.registry);
  aiClient.resetBreakers();
  vi.useRealTimers();
});

const use = (groq, huggingface) => {
  COMPLETION_PROVIDERS.groq = () => groq;
  COMPLETION_PROVIDERS.huggingface = () => huggingface;
};

describe('provider fallback', () => {
  it('uses only the primary when it works', async () => {
    const [g, h] = [ok('from groq'), ok('from hf')];
    use(g, h);
    expect(await call()).toBe('from groq');
    expect(h.complete).not.toHaveBeenCalled();
    expect(aiClient.getStats().fallbacks).toBe(0);
  });

  it('falls back when the primary is unreachable, and counts it', async () => {
    const [g, h] = [failing('unreachable'), ok('from hf')];
    use(g, h);
    expect(await call()).toBe('from hf');
    expect(aiClient.getStats().fallbacks).toBe(1);
  });

  it.each(['timeout', 'rate_limited', 'http_error', 'auth'])('falls back on %s', async (code) => {
    use(failing(code), ok('from hf'));
    expect(await call()).toBe('from hf');
  });

  it('falls back on unusable output without counting it against the provider', async () => {
    const g = failing('bad_output');
    use(g, ok('from hf'));
    for (let i = 0; i < 10; i++) expect(await call()).toBe('from hf');
    // Ten bad answers, threshold is 3, yet the primary is still being tried.
    expect(g.complete).toHaveBeenCalledTimes(10);
    expect(aiClient.getBreakerStates().groq.state).toBe('closed');
  });

  it('does not fall back on our own errors, since another provider would fail the same way', async () => {
    const h = ok('from hf');
    use(failing('bad_prompt'), h);
    await expect(call()).rejects.toMatchObject({ code: 'bad_prompt' });
    expect(h.complete).not.toHaveBeenCalled();
  });

  it('throws the last error when every provider fails', async () => {
    use(failing('unreachable'), failing('timeout'));
    await expect(call()).rejects.toMatchObject({ code: 'timeout' });
  });

  it('never lists the primary twice in the chain', async () => {
    env.ai.fallbackProviders = ['groq', 'huggingface'];
    const g = failing('unreachable');
    use(g, ok('from hf'));
    await call();
    expect(g.complete).toHaveBeenCalledTimes(1);
  });
});

describe('circuit breaker in the client', () => {
  it('stops sending requests to a dead provider after the threshold, then recovers after the cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const g = failing('unreachable');
    use(g, ok('from hf'));

    for (let i = 0; i < 3; i++) await call(); // three failures open the breaker
    expect(aiClient.getBreakerStates().groq.state).toBe('open');
    expect(g.complete).toHaveBeenCalledTimes(3);

    await call();
    await call();
    expect(g.complete).toHaveBeenCalledTimes(3); // skipped: failing fast, not waiting out a timeout
    expect(aiClient.getStats().breakerSkips).toBe(2);

    // Provider comes back; after the cooldown one trial request goes through.
    g.complete.mockImplementation(async () => ({ content: 'from groq', tokensIn: 1, tokensOut: 1 }));
    vi.setSystemTime(new Date('2026-01-01T00:00:31Z'));
    expect(await call()).toBe('from groq');
    expect(aiClient.getBreakerStates().groq.state).toBe('closed');
  });

  it('fails immediately with a clear error when every breaker is open', async () => {
    env.ai.fallbackProviders = [];
    const g = failing('unreachable');
    use(g, ok('unused'));
    for (let i = 0; i < 3; i++) await expect(call()).rejects.toMatchObject({ code: 'unreachable' });
    await expect(call()).rejects.toMatchObject({ code: 'unavailable', message: expect.stringContaining('circuit breakers are open') });
    expect(g.complete).toHaveBeenCalledTimes(3);
  });
});
