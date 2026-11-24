const env = require('./config/env');
const logger = require('./config/logger');
const { connectDb, disconnectDb } = require('./config/db');
const { cacheConnection } = require('./config/redis');
const { queueConnection } = require('./queue/connection');
const { markShuttingDown } = require('./lib/health');
const { registerQueueDepth } = require('./lib/metrics');
const { registerShutdown } = require('./lib/shutdown');
const app = require('./app');

async function start() {
  await connectDb();

  // Queue backlog per state on /metrics. Registered here, not at import, so the
  // metrics module never needs Redis just to be loaded.
  registerQueueDepth(() => require('./queue/queues').queues);

  const server = app.listen(env.port, () => {
    logger.info('server started', { port: env.port, nodeEnv: env.nodeEnv });
  });

  // Order matters:
  //  1. /ready already returns 503 (onStart), so the load balancer stops
  //     sending new requests while we finish the in-flight ones.
  //  2. Pause briefly so the balancer notices before we stop accepting.
  //  3. server.close() stops accepting and waits for open requests to finish.
  //  4. Only then close the data connections those requests were using.
  registerShutdown({
    onStart: markShuttingDown,
    steps: [
      { name: 'drain', run: () => new Promise((resolve) => setTimeout(resolve, env.shutdownDrainMs)) },
      {
        name: 'http',
        run: () =>
          new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
            server.closeIdleConnections?.();
          }),
      },
      { name: 'mongodb', run: disconnectDb },
      { name: 'redis-cache', run: () => cacheConnection.quit() },
      { name: 'redis-queue', run: () => queueConnection.quit() },
    ],
  });
}

start().catch((err) => {
  logger.error('failed to start server', { error: err.message });
  process.exit(1);
});
