// Separate process entrypoint from server.js — run as `node src/worker.js`
// (or `npm run worker`), never imported by the HTTP server. Workers block
// waiting for jobs; that has no business sharing a process (or a deploy
// unit, in production) with the thing answering HTTP requests.
const { connectDb, disconnectDb } = require('./config/db');
const logger = require('./config/logger');
const { startAiWorkers } = require('./queue/workers/aiWorker');
const { startNotificationWorkers } = require('./queue/workers/notificationWorker');
const { startAnalyticsWorker } = require('./queue/workers/analyticsWorker');

async function start() {
  await connectDb();

  const workers = [...startAiWorkers(), ...startNotificationWorkers(), startAnalyticsWorker()];
  logger.info('worker process started', { queues: workers.map((w) => w.name) });

  const shutdown = async () => {
    logger.info('worker process shutting down');
    await Promise.all(workers.map((w) => w.close()));
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('failed to start worker process', { error: err.message });
  process.exit(1);
});
