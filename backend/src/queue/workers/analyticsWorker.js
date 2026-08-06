const { Worker } = require('bullmq');
const { createConnection } = require('../../config/redis');
const { QUEUE_NAMES } = require('../queues');
const logger = require('../../config/logger');

const processAnalyticsAggregationJob = require('../processors/analyticsAggregation.processor');

const workerConnection = createConnection();

// Low concurrency on purpose — each job here can scan an org's entire
// Application history (see analytics.service.js's computeOrgStats()); this
// is the one non-AI queue where concurrency is still a deliberate cost
// control, just against database load instead of an LLM provider's rate limit.
const CONCURRENCY = 2;

function startAnalyticsWorker() {
  const worker = new Worker(QUEUE_NAMES.ANALYTICS_AGGREGATION, processAnalyticsAggregationJob, {
    connection: workerConnection,
    concurrency: CONCURRENCY,
  });

  worker.on('completed', (job) => logger.info('worker.completed', { queue: worker.name, jobId: job.id }));
  worker.on('failed', (job, err) => logger.error('worker.failed', { queue: worker.name, jobId: job?.id, error: err.message }));

  return worker;
}

module.exports = { startAnalyticsWorker };
