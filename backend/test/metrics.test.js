import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';

const require = createRequire(import.meta.url);
const env = require('../src/config/env');
const metrics = require('../src/lib/metrics');
const aiClient = require('../src/ai/client/aiClient');

let server;
let base;

async function start() {
  const app = express();
  app.use(metrics.httpMetrics);
  app.get('/metrics', metrics.metricsHandler);
  app.get('/users/:id', (req, res) => res.json({ id: req.params.id }));
  app.get('/boom', (req, res) => res.status(500).json({ error: 'x' }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
}

const scrape = async (headers = {}) => fetch(`${base}/metrics`, { headers });

beforeEach(start);
afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  env.metricsToken = '';
  env.nodeEnv = 'test';
  env.ai.pricing = {};
});

describe('GET /metrics', () => {
  it('serves Prometheus text with default process metrics', async () => {
    const res = await scrape();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const body = await res.text();
    expect(body).toContain('process_cpu_user_seconds_total');
    expect(body).toContain('# TYPE http_request_duration_seconds histogram');
  });

  it('labels requests by route pattern, so ids never create new series', async () => {
    await fetch(`${base}/users/1`);
    await fetch(`${base}/users/2`);
    await fetch(`${base}/users/12345`);
    await fetch(`${base}/no-such-page`);
    const body = await (await scrape()).text();

    expect(body).toMatch(/http_requests_total\{method="GET",route="\/users\/:id",status_class="2xx"\} 3/);
    expect(body).not.toContain('/users/12345');
    expect(body).toMatch(/route="unmatched",status_class="4xx"\} 1/);
  });

  it('counts server errors separately', async () => {
    await fetch(`${base}/boom`);
    const body = await (await scrape()).text();
    expect(body).toMatch(/route="\/boom",status_class="5xx"\} 1/);
  });

  it('requires the bearer token when one is configured', async () => {
    env.metricsToken = 's3cret-token';
    expect((await scrape()).status).toBe(401);
    expect((await scrape({ authorization: 'Bearer wrong-token!' })).status).toBe(401);
    expect((await scrape({ authorization: 'Bearer s3cret-token' })).status).toBe(200);
  });

  it('is disabled in production unless a token is set', async () => {
    env.nodeEnv = 'production';
    expect((await scrape()).status).toBe(404);
    env.metricsToken = 'tok';
    expect((await scrape({ authorization: 'Bearer tok' })).status).toBe(200);
  });
});

describe('AI metrics', () => {
  it('records calls, tokens, latency and estimated cost', async () => {
    env.ai.pricing = { groq: { in: 0.5, out: 1.5 } };
    metrics.observeAiCall({ provider: 'groq', outcome: 'success', latencyMs: 800, tokensIn: 2_000_000, tokensOut: 1_000_000 });
    metrics.observeFallback();
    const body = await (await scrape()).text();

    expect(body).toMatch(/ai_calls_total\{provider="groq",outcome="success"\} \d+/);
    expect(body).toMatch(/ai_tokens_total\{provider="groq",direction="in"\} 2000000/);
    expect(body).toMatch(/ai_tokens_total\{provider="groq",direction="out"\} 1000000/);
    expect(body).toMatch(/ai_cost_usd_total\{provider="groq"\} 2\.5/); // 2M*0.5/1M + 1M*1.5/1M
    expect(body).toMatch(/ai_fallbacks_total \d+/);
    expect(body).toContain('ai_call_duration_seconds_bucket');
  });

  it('exposes the circuit breaker state of each provider', async () => {
    vi.spyOn(aiClient, 'getBreakerStates').mockReturnValue({ groq: { state: 'open' }, huggingface: { state: 'closed' } });
    const body = await (await scrape()).text();
    expect(body).toContain('ai_circuit_breaker_state{provider="groq"} 2');
    expect(body).toContain('ai_circuit_breaker_state{provider="huggingface"} 0');
    vi.restoreAllMocks();
  });
});
