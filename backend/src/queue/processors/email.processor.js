const { UnrecoverableError } = require('bullmq');
const { z } = require('zod');
const { sendEmail } = require('../../lib/mailer');

// The job payload is validated before anything is sent. Anything that put a job
// on this queue is trusted code, but a malformed payload (or a subject with a
// line break, the classic email header injection) must never reach the mail
// server, and retrying it can never succeed.
const emailJobSchema = z.object({
  to: z.string().email().max(254),
  subject: z.string().min(1).max(200).refine((s) => !/[\r\n]/.test(s), 'subject must be one line'),
  text: z.string().min(1).max(20000),
  html: z.string().max(100000).optional(),
});

// SMTP says whether a failure is worth retrying: 4xx is temporary (greylisting,
// rate limit, mailbox busy), 5xx is permanent (bad address, rejected content).
const isPermanent = (err) => typeof err.responseCode === 'number' && err.responseCode >= 500;

// Invoked by queue/workers/notificationWorker.js for each 'email' job.
module.exports = async function processEmailJob(job) {
  const parsed = emailJobSchema.safeParse(job.data);
  if (!parsed.success) {
    // UnrecoverableError tells BullMQ to fail the job now instead of retrying it.
    throw new UnrecoverableError(`invalid email job: ${parsed.error.issues[0].message}`);
  }

  try {
    return await sendEmail(parsed.data);
  } catch (err) {
    if (isPermanent(err)) throw new UnrecoverableError(`email rejected (${err.responseCode}): ${err.message}`);
    throw err; // temporary or unknown: BullMQ retries with backoff (see queue/queues.js)
  }
};
