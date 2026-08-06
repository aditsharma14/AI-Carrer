const env = require('./config/env');
const logger = require('./config/logger');
const { connectDb, disconnectDb } = require('./config/db');
const app = require('./app');

async function start() {
  await connectDb();

  const server = app.listen(env.port, () => {
    logger.info('server started', { port: env.port, nodeEnv: env.nodeEnv });
  });

  const shutdown = async () => {
    logger.info('server shutting down');
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('failed to start server', { error: err.message });
  process.exit(1);
});
