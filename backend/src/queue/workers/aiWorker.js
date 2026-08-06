const { Worker } = require('bullmq');
const { createConnection } = require('../../config/redis');
const { QUEUE_NAMES } = require('../queues');
const logger = require('../../config/logger');

const processResumeParseJob = require('../processors/resumeParse.processor');
const processAtsScoreJob = require('../processors/atsScore.processor');
const processJobMatchingJob = require('../processors/jobMatching.processor');
const processCandidateRankingJob = require('../processors/candidateRanking.processor');
const processInterviewGenerationJob = require('../processors/interviewGeneration.processor');

// A dedicated connection for workers, separate from queueConnection (used
// only by producers' .add() calls) — see queue/connection.js's comment.
// A worker blocks waiting for jobs; sharing that connection with producers
// could let a busy worker stall something trying to enqueue new work.
const workerConnection = createConnection();

// Capped concurrency on every AI queue, not Node's default — each job here
// makes a billed LLM call (or several), so concurrency is a cost/rate-limit
// control, not just a performance knob (see docs/ARCHITECTURE.md §9.2).
const AI_CONCURRENCY = 5;

function attachLogging(worker, queueName) {
  worker.on('completed', (job) => logger.info('worker.completed', { queue: queueName, jobId: job.id }));
  worker.on('failed', (job, err) => logger.error('worker.failed', { queue: queueName, jobId: job?.id, error: err.message }));
}

function startAiWorkers() {
  const workers = [
    new Worker(QUEUE_NAMES.RESUME_PARSE, processResumeParseJob, { connection: workerConnection, concurrency: AI_CONCURRENCY }),
    new Worker(QUEUE_NAMES.ATS_SCORE, processAtsScoreJob, { connection: workerConnection, concurrency: AI_CONCURRENCY }),
    new Worker(QUEUE_NAMES.JOB_MATCHING, processJobMatchingJob, { connection: workerConnection, concurrency: AI_CONCURRENCY }),
    new Worker(QUEUE_NAMES.CANDIDATE_RANKING, processCandidateRankingJob, { connection: workerConnection, concurrency: AI_CONCURRENCY }),
    new Worker(QUEUE_NAMES.INTERVIEW_GENERATION, processInterviewGenerationJob, { connection: workerConnection, concurrency: AI_CONCURRENCY }),
  ];

  workers.forEach((worker) => attachLogging(worker, worker.name));
  return workers;
}

module.exports = { startAiWorkers };
