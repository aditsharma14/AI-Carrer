const Notification = require('./notification.model');
const { enqueueJob, QUEUE_NAMES } = require('../../queue/queues');

// Talks to the model directly, no repository — same internal-infra
// exception as audit.service.js. Every other module calls notify() rather
// than touching Notification directly.
async function notify(orgId, userId, { type, message, link = null }) {
  const notification = await Notification.create({ orgId, userId, type, message, link });

  // Fire-and-forget into the queue, not awaited inline — queueing a
  // notification job is itself nearly instant; it's the worker side
  // (queue/processors/notification.processor.js) that would do anything
  // slower, like a push notification or websocket emit, later.
  await enqueueJob(QUEUE_NAMES.NOTIFICATION, 'deliver', { notificationId: String(notification._id) });

  return notification;
}

module.exports = { notify };
