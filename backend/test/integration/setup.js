// Runs before every integration test file, and before any application module is
// imported (config/env.js reads the environment once, when first required).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { assertSafeIntegrationUri } = require('./support/safety');

// Deliberately a separate variable from MONGODB_URI: a developer's real
// connection string must never be picked up by accident.
assertSafeIntegrationUri(process.env.INTEGRATION_MONGODB_URI);

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.INTEGRATION_MONGODB_URI;
process.env.JWT_ACCESS_SECRET = 'integration-access-secret';
process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret';
// Redis comes from REDIS_HOST / REDIS_PORT (defaults localhost:6379).
// AI stays on the stub so no integration test can reach a paid API.
process.env.AI_PROVIDER = 'stub';
process.env.EMBEDDING_PROVIDER = 'stub';
process.env.EMAIL_PROVIDER = 'log';
// Expected 5xx responses (see tenant.test.js) log their stack on purpose; keep
// the test output readable without hiding the assertions.
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
