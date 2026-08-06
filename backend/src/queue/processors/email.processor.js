const logger = require('../../config/logger');

// Honest stub, not a fake implementation — no email-sending integration
// (e.g. SES, SendGrid, Postmark) is in this project's dependencies, and
// adding one was out of scope for this pass. This is the exact gap
// identity.service.js's inviteMember() already calls out: a full
// invite-by-email flow for people without an account yet needs this to be
// real. Nothing currently enqueues a job here — this is the seam for when it
// does, logging clearly instead of silently dropping the email.
module.exports = async function processEmailJob(job) {
  const { to, subject } = job.data;
  logger.warn('email.send not implemented — add a provider integration to enable it', { to, subject });
};
