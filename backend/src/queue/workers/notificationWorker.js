const { Worker } = require('bullmq');
const { createConnection } = require('../../config/redis');
const { QUEUE_NAMES } = require('../queues');
const logger = require('../../config/logger');

const processNotificationJob = require('../processors/notification.processor');
const processEmailJob = require('../processors/email.processor');

const workerConnection = createConnection();

// No LLM call in either queue here, so no cost-control reason to cap
// concurrency tightly — these are plain I/O-bound jobs (a DB read, or
// eventually an external email API call).
const CONCURRENCY = 20;

function attachLogging(worker, queueName) {
  worker.on('completed', (job) => logger.info('worker.completed', { queue: queueName, jobId: job.id }));
  worker.on('failed', (job, err) => logger.error('worker.failed', { queue: queueName, jobId: job?.id, error: err.message }));
}

function startNotificationWorkers() {
  const workers = [
    new Worker(QUEUE_NAMES.NOTIFICATION, processNotificationJob, { connection: workerConnection, concurrency: CONCURRENCY }),
    new Worker(QUEUE_NAMES.EMAIL, processEmailJob, { connection: workerConnection, concurrency: CONCURRENCY }),
  ];

  workers.forEach((worker) => attachLogging(worker, worker.name));
  return workers;
}

module.exports = { startNotificationWorkers };
