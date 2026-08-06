const { createConnection } = require('../config/redis');

// One connection shared by every Queue *producer* (the .add() calls module
// services make). This is safe to share because producing is lightweight —
// it's the opposite of a Worker, which blocks waiting for jobs and gets its
// own dedicated connection per queue/workers/*.js later, so a busy worker can
// never stall another module from enqueueing new work.
const queueConnection = createConnection();

module.exports = { queueConnection };
