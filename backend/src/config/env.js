require('dotenv').config();

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

// Every other file in the app imports `config` from here instead of reading
// `process.env` directly — one place to see every setting the app depends on,
// and one place to add a default/validation if a new var is introduced.
module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  mongoUri: process.env.MONGODB_URI,

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'stub',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  },
};
