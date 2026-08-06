const { Queue } = require('bullmq');
const { queueConnection } = require('./connection');
const aiJobRepository = require('../modules/aiJobs/aiJob.repository');

// One queue per job type (not one generic queue dispatched by a `type`
// field) — see docs/ARCHITECTURE.md §9.2. Separate queues mean separate
// concurrency limits: AI-heavy queues stay capped low to respect LLM
// provider rate limits and control cost; a future notifications/email queue
// can run at much higher concurrency without that decision touching this file.
const QUEUE_NAMES = {
  RESUME_PARSE: 'resume-parse',
  ATS_SCORE: 'ats-score',
  JOB_MATCHING: 'job-matching',
  CANDIDATE_RANKING: 'candidate-ranking',
  INTERVIEW_GENERATION: 'interview-generation',
  // Not AI jobs — no LLM call, no AiJob polling record. Queued anyway
  // because the work itself is the kind that shouldn't block an HTTP
  // request: analytics aggregation can mean scanning an org's whole
  // Application history, and a notification/email send is an external I/O
  // call with its own latency and failure modes.
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
  NOTIFICATION: 'notification',
  EMAIL: 'email',
};

// 3 attempts, exponential backoff: past 3 tries, an LLM provider failure is
// treated as non-transient (rate limit exhaustion, bad prompt) rather than
// retried forever — the job lands in 'failed_needs_review' instead.
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600 }, // BullMQ job itself is disposable after an hour —
  removeOnFail: { age: 86400 }, // the AiJob Mongo document is the durable record.
};

function makeQueue(name) {
  return new Queue(name, { connection: queueConnection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
}

const queues = {
  [QUEUE_NAMES.RESUME_PARSE]: makeQueue(QUEUE_NAMES.RESUME_PARSE),
  [QUEUE_NAMES.ATS_SCORE]: makeQueue(QUEUE_NAMES.ATS_SCORE),
  [QUEUE_NAMES.JOB_MATCHING]: makeQueue(QUEUE_NAMES.JOB_MATCHING),
  [QUEUE_NAMES.CANDIDATE_RANKING]: makeQueue(QUEUE_NAMES.CANDIDATE_RANKING),
  [QUEUE_NAMES.INTERVIEW_GENERATION]: makeQueue(QUEUE_NAMES.INTERVIEW_GENERATION),
  [QUEUE_NAMES.ANALYTICS_AGGREGATION]: makeQueue(QUEUE_NAMES.ANALYTICS_AGGREGATION),
  [QUEUE_NAMES.NOTIFICATION]: makeQueue(QUEUE_NAMES.NOTIFICATION),
  [QUEUE_NAMES.EMAIL]: makeQueue(QUEUE_NAMES.EMAIL),
};

// The ONE function every module service calls to start async AI work. It
// does two things every async AI feature needs, in the right order:
//   1. creates the AiJob document the client will poll (status: 'queued')
//   2. adds the real job to BullMQ, carrying that document's id so the
//      worker knows which AiJob record to update when it finishes
// Without this helper, five module services would each hand-roll this same
// two-step dance slightly differently.
async function enqueueAiJob({ orgId, type, queueName, jobName, createdBy, payload }) {
  const aiJob = await aiJobRepository.create({ orgId, type, createdBy, payload });

  await queues[queueName].add(jobName, { aiJobId: String(aiJob._id), orgId, ...payload });

  return { jobId: String(aiJob._id), status: 'queued' };
}

// For the non-AI queues above — no AiJob document, nothing for a client to
// poll, just "do this work in the background." Plain BullMQ add, no
// aiJobRepository involved.
async function enqueueJob(queueName, jobName, data) {
  await queues[queueName].add(jobName, data);
}

module.exports = { QUEUE_NAMES, queues, enqueueAiJob, enqueueJob };
