const logger = require('../../config/logger');

// notification.service.js's notify() already writes the Notification
// document synchronously before this job is even enqueued — the in-app
// notification exists and is queryable the moment notify() returns. This
// worker is the seam for the part that genuinely needs to be async: pushing
// the notification over a transport that isn't a database read, such as a
// websocket emit or a mobile push. No such transport is wired up in this
// build, so there's nothing to plug in yet — the queue/job already exists so
// that adding one later is a change to this file alone, not to every caller
// of notify().
module.exports = async function processNotificationJob(job) {
  const { notificationId } = job.data;
  logger.info('notification.deliver', { notificationId });
};
