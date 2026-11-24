const crypto = require('node:crypto');
const client = require('prom-client');
const env = require('../config/env');
const { estimateCostUsd } = require('../ai/client/pricing');

// Prometheus metrics, served at GET /metrics (see app.js). They answer the
// questions an on-call engineer asks first: is it slow, is it erroring, is the
// AI provider the problem, is the queue backing up, what is it costing.
//
// A private registry, not prom-client's global one, so tests and the worker
// process never see each other's counters.
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry }); // CPU, memory, event-loop lag, GC

const reg = { registers: [registry] };

// ---------------------------------------------------------------- HTTP
// Labelled with the matched ROUTE PATTERN ("/jobs/:jobId"), never the raw URL.
// A raw URL would create a new time series for every id and exhaust memory.
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency by route',
  labelNames: ['method', 'route', 'status_class'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  ...reg,
});
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests by route and status class',
  labelNames: ['method', 'route', 'status_class'],
  ...reg,
});

function httpMetrics(req, res, next) {
  const stop = httpDuration.startTimer();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: req.route?.path || 'unmatched', // 404s and scanners all share one label
      status_class: `${Math.floor(res.statusCode / 100)}xx`,
    };
    stop(labels);
    httpRequests.inc(labels);
  });
  next();
}

// ------------------------------------------------------------------ AI
const aiCalls = new client.Counter({
  name: 'ai_calls_total',
  help: 'AI calls by provider and outcome (success, error, invalid_output)',
  labelNames: ['provider', 'outcome'],
  ...reg,
});
const aiDuration = new client.Histogram({
  name: 'ai_call_duration_seconds',
  help: 'AI call latency by provider',
  labelNames: ['provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  ...reg,
});
const aiTokens = new client.Counter({
  name: 'ai_tokens_total',
  help: 'Tokens used by provider and direction',
  labelNames: ['provider', 'direction'],
  ...reg,
});
const aiCost = new client.Counter({
  name: 'ai_cost_usd_total',
  help: 'Estimated AI spend in USD, from AI_PRICING (providers without a price are not counted)',
  labelNames: ['provider'],
  ...reg,
});
const aiFallbacks = new client.Counter({
  name: 'ai_fallbacks_total',
  help: 'Calls served by a fallback provider because the primary failed',
  ...reg,
});
const BREAKER_STATE = { closed: 0, half_open: 1, open: 2 };
// Read on every scrape, so it is always current. Required lazily to avoid a
// load-time cycle (aiClient reports into this module).
new client.Gauge({
  name: 'ai_circuit_breaker_state',
  help: 'Per-provider circuit breaker: 0 closed, 1 half-open, 2 open',
  labelNames: ['provider'],
  ...reg,
  collect() {
    this.reset();
    const states = require('../ai/client/aiClient').getBreakerStates();
    for (const [provider, { state }] of Object.entries(states)) this.set({ provider }, BREAKER_STATE[state]);
  },
});

function observeAiCall({ provider, outcome, latencyMs, tokensIn = 0, tokensOut = 0 }) {
  aiCalls.inc({ provider, outcome });
  if (latencyMs !== undefined) aiDuration.observe({ provider }, latencyMs / 1000);
  if (tokensIn) aiTokens.inc({ provider, direction: 'in' }, tokensIn);
  if (tokensOut) aiTokens.inc({ provider, direction: 'out' }, tokensOut);
  const cost = estimateCostUsd(provider, tokensIn, tokensOut);
  if (cost) aiCost.inc({ provider }, cost);
}
const observeFallback = () => aiFallbacks.inc();

// -------------------------------------------------------------- queues
// Backlog per queue and job state: the number to alert on when workers fall
// behind. Registered by the processes that own the queues (server.js,
// worker.js) rather than at import, so loading this file never needs Redis.
let queueGaugeRegistered = false;
function registerQueueDepth(getQueues) {
  if (queueGaugeRegistered) return;
  queueGaugeRegistered = true;
  new client.Gauge({
    name: 'queue_jobs',
    help: 'Jobs per queue and state',
    labelNames: ['queue', 'state'],
    ...reg,
    async collect() {
      this.reset();
      await Promise.all(
        Object.entries(getQueues()).map(async ([name, queue]) => {
          try {
            const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
            for (const [state, value] of Object.entries(counts)) this.set({ queue: name, state }, value);
          } catch {
            // Redis unreachable: omit this queue rather than failing the scrape.
          }
        })
      );
    },
  });
}

// -------------------------------------------------------------- endpoint
// Off in production unless METRICS_TOKEN is set (metrics reveal internals, and a
// scrape endpoint on the public internet should never be open by default). With
// a token, requests need `Authorization: Bearer <token>`.
function tokenMatches(header, token) {
  const expected = Buffer.from(`Bearer ${token}`);
  const given = Buffer.from(header || '');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

async function metricsHandler(req, res) {
  const token = env.metricsToken;
  if (!token && env.nodeEnv === 'production') return res.status(404).end();
  if (token && !tokenMatches(req.get('authorization'), token)) {
    return res.status(401).set('WWW-Authenticate', 'Bearer').end();
  }
  res.set('Content-Type', registry.contentType);
  return res.end(await registry.metrics());
}

module.exports = { registry, httpMetrics, metricsHandler, observeAiCall, observeFallback, registerQueueDepth };
