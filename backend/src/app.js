const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const requestId = require('./middleware/requestId.middleware');
const rateLimitTier = require('./middleware/rateLimit.middleware');
const errorHandler = require('./middleware/error.middleware');
const ApiError = require('./lib/ApiError');
const routes = require('./routes');
const { readiness } = require('./lib/health');
const { httpMetrics, metricsHandler } = require('./lib/metrics');

const app = express();

// Behind a hosting provider's proxy, read the real client address (see
// config/parsers.js). Must be set before any middleware that uses req.ip.
app.set('trust proxy', env.trustProxy);

// helmet first — security headers should apply to every response, including
// ones that error out before reaching a route.
app.use(helmet());

// credentials: true + an explicit origin (never '*') — the refresh token
// travels as an httpOnly cookie (see identity.controller.js), and browsers
// refuse to send credentialed requests to a wildcard-CORS origin anyway.
app.use(cors({ origin: env.clientOrigin, credentials: true }));

// Ahead of rate limiting and body parsing on purpose — a load balancer can
// hit this every few seconds from multiple nodes, and it needs neither a
// JSON body nor a budget shared with real traffic.
// /health = liveness (process is up, touches nothing else).
// /ready  = readiness (MongoDB + Redis reachable, not shutting down).
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
// Prometheus scrape endpoint. Before rate limiting and body parsing, like the
// probes, so a scraper never competes with real traffic for its budget.
app.get('/metrics', metricsHandler);
app.get('/ready', async (req, res) => {
  const { ready, status, checks } = await readiness();
  res.status(ready ? 200 : 503).json({ status, checks });
});

// Ahead of body parsing so a malformed-JSON request still gets a requestId
// on its error response, not just well-formed ones.
app.use(requestId);
app.use(httpMetrics);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(express.json());
app.use(cookieParser());

// Default tier for every route that doesn't ask for a stricter one of its
// own ('auth' on login/signup, 'aiHeavy' on LLM-calling routes) — see
// rateLimit.middleware.js. Stacking is intentional: a route under 'aiHeavy'
// is still also covered by this general budget.
app.use(rateLimitTier('general'));

// Matches the frontend's axiosClient baseURL (http://localhost:4000/api/v1).
app.use('/api/v1', routes);

app.use((req, res, next) => next(ApiError.notFound('Route')));

// Must be registered LAST — Express only treats a 4-argument middleware
// function as an error handler, and only one registered after everything
// else actually catches errors from everything else.
app.use(errorHandler);

module.exports = app;
