require('dotenv').config();

const { parseTrustProxy, parseSameSite } = require('./parsers');

// Anything the app cannot run without. If one of these is missing, we want
// the process to crash on boot — not 10 minutes into production traffic when
// some request finally exercises the code path that needed it.
const REQUIRED_VARS = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

function assertRequiredVarsExist() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required env var(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
    );
  }
}

assertRequiredVarsExist();

// Per-provider defaults. AI_MODEL / EMBEDDING_MODEL override the default
// for whichever provider is ACTIVE — so switching AI_PROVIDER without
// touching AI_MODEL still picks a model that provider actually serves.
const DEFAULT_CHAT_MODELS = {
  stub: 'stub',
  groq: 'llama-3.3-70b-versatile',
  huggingface: 'openai/gpt-oss-120b:fastest',
  ollama: 'llama3.1',
};

const DEFAULT_EMBEDDING_MODELS = {
  stub: 'stub-64',
  huggingface: 'BAAI/bge-small-en-v1.5',
  ollama: 'nomic-embed-text',
};

// How to ask for JSON on OpenAI-compatible APIs (see openaiCompatibleProvider.js).
const DEFAULT_JSON_MODES = { groq: 'json_object', huggingface: 'none' };

// AI_PRICING is JSON, USD per million tokens per provider (see ai/client/pricing.js).
// Invalid JSON fails at boot instead of silently reporting no cost.
function parsePricing(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('AI_PRICING must be valid JSON, e.g. {"groq":{"in":0.59,"out":0.79}}');
  }
}

function buildEmailConfig() {
  const provider = process.env.EMAIL_PROVIDER || 'log';
  if (!['log', 'smtp'].includes(provider)) throw new Error(`EMAIL_PROVIDER must be 'log' or 'smtp', got '${provider}'`);
  if (provider === 'smtp' && !process.env.SMTP_URL) throw new Error('EMAIL_PROVIDER=smtp requires SMTP_URL');
  return {
    provider,
    smtpUrl: process.env.SMTP_URL || '',
    from: process.env.EMAIL_FROM || 'AI Career <no-reply@localhost>',
  };
}

function buildAiConfig() {
  const provider = process.env.AI_PROVIDER || 'stub';
  const embeddingProvider = process.env.EMBEDDING_PROVIDER || 'stub';

  const modelFor = (name) =>
    name === provider && process.env.AI_MODEL ? process.env.AI_MODEL : DEFAULT_CHAT_MODELS[name];
  const embeddingModelFor = (name) =>
    name === embeddingProvider && process.env.EMBEDDING_MODEL ? process.env.EMBEDDING_MODEL : DEFAULT_EMBEDDING_MODELS[name];
  const jsonModeFor = (name) =>
    name === provider && process.env.AI_JSON_MODE ? process.env.AI_JSON_MODE : DEFAULT_JSON_MODES[name] || 'none';

  return {
    // Completions: 'stub' | 'groq' | 'huggingface' | 'ollama'
    provider,
    model: modelFor(provider),
    modelFor,
    jsonModeFor,
    // Tried in order when AI_PROVIDER fails, e.g. AI_FALLBACK_PROVIDERS=huggingface,ollama
    fallbackProviders: (process.env.AI_FALLBACK_PROVIDERS || '').split(',').map((p) => p.trim()).filter(Boolean),
    // A provider's circuit breaker opens after this many consecutive outage
    // failures, and lets one trial request through again after the cooldown.
    breakerThreshold: Number(process.env.AI_BREAKER_THRESHOLD) || 5,
    breakerCooldownMs: Number(process.env.AI_BREAKER_COOLDOWN_MS) || 30000,
    pricing: parsePricing(process.env.AI_PRICING),
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 4096,
    // Local Ollama on a laptop can take a while on the first (cold) call.
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 120000,

    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    },
    huggingface: {
      token: process.env.HF_TOKEN || '',
      baseUrl: process.env.HF_BASE_URL || 'https://router.huggingface.co/v1',
      embeddingUrl: process.env.HF_EMBEDDING_URL || '',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    },
    // Embeddings: 'stub' | 'huggingface' | 'ollama'
    embeddingProvider,
    embeddingModel: embeddingModelFor(embeddingProvider),
    embeddingModelFor,
  };
}

// Every other file in the app imports `config` from here instead of reading
// `process.env` directly — one place to see every setting the app depends on,
// and one place to add a default/validation if a new var is introduced.
module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // How long the API keeps serving after /ready flips to 503, so the load
  // balancer notices and stops routing before we close the listener.
  shutdownDrainMs: Number(process.env.SHUTDOWN_DRAIN_MS ?? 5000),

  // Reverse proxies in front of the app (see config/parsers.js). Set TRUST_PROXY=1
  // behind a hosting provider's load balancer, or every user shares one rate limit.
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  // Refresh-token cookie. Use COOKIE_SAMESITE=none when the web app and the API
  // are on different sites; the default suits a shared parent domain.
  cookie: { sameSite: parseSameSite(process.env.COOKIE_SAMESITE, process.env.NODE_ENV || 'development') },

  // Outbound email. 'log' (default) sends nothing; 'smtp' delivers via SMTP_URL.
  email: buildEmailConfig(),

  // Bearer token required to read GET /metrics. In production the endpoint is
  // disabled entirely unless this is set.
  metricsToken: process.env.METRICS_TOKEN || '',

  mongoUri: process.env.MONGODB_URI,

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    // Managed Redis (Upstash, ElastiCache, Render with TLS) usually requires an
    // encrypted connection. Local and private-network Redis does not.
    tls: process.env.REDIS_TLS === 'true',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },

  ai: buildAiConfig(),
};
