const env = require('../../config/env');
const logger = require('../../config/logger');
const { orgInvite } = require('../../lib/emailTemplates');

// Queues the "you were invited" email. Kept out of identity.service.js so the
// service stays free of queue plumbing, and so this is testable without Redis:
// the real queue is required only when no `enqueue` is injected.
function defaultEnqueue(data) {
  const { enqueueJob, QUEUE_NAMES } = require('../../queue/queues');
  return enqueueJob(QUEUE_NAMES.EMAIL, 'send', data);
}

// Never throws: the membership has already been created, and a mail problem
// must not turn a successful invite into an error (or leave the inviter
// retrying an invite that already exists).
async function sendInviteEmail({ to, inviterName, orgName, role }, { enqueue = defaultEnqueue } = {}) {
  try {
    const message = orgInvite({ inviterName, orgName, role, loginUrl: `${env.clientOrigin}/login` });
    await enqueue({ to, ...message });
    return true;
  } catch (err) {
    logger.error('invite email could not be queued', { error: err.message });
    return false;
  }
}

module.exports = { sendInviteEmail };
