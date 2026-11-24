// A deliberately tiny logger — no external dependency. It does exactly one
// useful thing beyond `console.log`: every line is JSON with a `requestId`
// attached, so in production you can grep one request's entire journey
// (route -> service -> AI call -> DB write) out of a sea of concurrent logs.
const LEVELS = ['error', 'warn', 'info', 'debug'];

// LOG_LEVEL=error|warn|info|debug hides anything less severe. The default
// (debug) prints everything, which is the behaviour before this existed. Read
// per call, so tests and scripts can change it without reloading the module.
function enabled(level) {
  const configured = LEVELS.indexOf(process.env.LOG_LEVEL);
  return LEVELS.indexOf(level) <= (configured === -1 ? LEVELS.length - 1 : configured);
}

function formatLine(level, requestId, message, meta) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    requestId: requestId || undefined,
    message,
    ...meta,
  });
}

function makeLogger(requestId) {
  const logger = {};

  for (const level of LEVELS) {
    logger[level] = (message, meta) => {
      if (!enabled(level)) return;
      const line = formatLine(level, requestId, message, meta);
      // errors go to stderr so they're easy to separate from normal traffic
      // logs in any log aggregator (CloudWatch, Datadog, etc.)
      if (level === 'error') process.stderr.write(line + '\n');
      else process.stdout.write(line + '\n');
    };
  }

  // requestId.middleware.js calls this to get a logger scoped to one request.
  logger.child = (childRequestId) => makeLogger(childRequestId);
  return logger;
}

// Default export: an unscoped logger for use during boot, before any request exists.
module.exports = makeLogger();
module.exports.makeLogger = makeLogger;
