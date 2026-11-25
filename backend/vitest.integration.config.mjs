import { defineConfig } from 'vitest/config';

// Real-database integration tests. They talk to a real MongoDB (a replica set,
// so transactions can be tested later) and a real Redis; see
// docs/INTEGRATION_TESTING.md for how to provide both.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.test.js'],
    setupFiles: ['test/integration/setup.js'],
    // One shared database: files run one after another so they cannot clear
    // each other's data.
    fileParallelism: false,
    // bcrypt cost 12 and first-connection index builds are slow on a CI runner.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
