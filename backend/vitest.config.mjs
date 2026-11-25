import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    // Integration tests need real MongoDB and Redis and run through their own
    // config (vitest.integration.config.mjs, `npm run test:integration`), so
    // the fast unit run never needs a database.
    exclude: [...configDefaults.exclude, 'test/integration/**'],
    setupFiles: ['test/setup.js'],
  },
});
