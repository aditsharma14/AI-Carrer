// Separate process entrypoint from server.js — run as `node src/worker.js`
// (or `npm run worker`), never imported by the HTTP server. Workers block
// waiting for jobs; that has no business sharing a process (or a deploy
// unit, in production) with the thing answering HTTP requests.
const { connectDb, disconnectDb } = require('./config/db');
const logger = require('./config/logger');
const { cacheConnection } = require('./config/redis');
const { queueConnection } = require('./queue/connection');
const { registerShutdown } = require('./lib/shutdown');
const { startAiWorkers } = require('./queue/workers/aiWorker');
const { startNotificationWorkers } = require('./queue/workers/notificationWorker');
const { startAnalyticsWorker } = require('./queue/workers/analyticsWorker');

async function start() {
  await connectDb();

  const workers = [...startAiWorkers(), ...startNotificationWorkers(), startAnalyticsWorker()];
  logger.info('worker process started', { queues: workers.map((w) => w.name) });

  // worker.close() stops taking new jobs and waits for the job each worker is
  // running to finish, so a deploy doesn't kill a resume parse half way (BullMQ
  // would retry it, but that wastes an LLM call). Connections close after.
  registerShutdown({
    steps: [
      { name: 'workers', run: () => Promise.all(workers.map((w) => w.close())) },
      { name: 'mongodb', run: disconnectDb },
      { name: 'redis-cache', run: () => cacheConnection.quit() },
      { name: 'redis-queue', run: () => queueConnection.quit() },
    ],
  });
}

start().catch((err) => {
  logger.error('failed to start worker process', { error: err.message });
  process.exit(1);
});
