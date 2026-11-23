const logger = require('../config/logger');

// One shutdown routine for the API and the worker, so both behave the same
// under SIGTERM (what Docker, Kubernetes and ECS send before killing a task).
//
// steps: ordered [{ name, run }]. Each step is attempted even if an earlier
// one fails, and the whole sequence is capped by `timeoutMs`; past that the
// process exits non-zero rather than hanging until the orchestrator SIGKILLs
// it mid-write.
function registerShutdown({ steps, timeoutMs = 25000, onStart = () => {} }) {
  let started = false;

  async function shutdown(signal) {
    if (started) return;
    started = true;
    logger.info('shutdown started', { signal });
    onStart();

    const forceExit = setTimeout(() => {
      logger.error('shutdown timed out, forcing exit', { timeoutMs });
      process.exit(1);
    }, timeoutMs);
    forceExit.unref();

    let failed = false;
    for (const step of steps) {
      try {
        await step.run();
        logger.info('shutdown step done', { step: step.name });
      } catch (err) {
        failed = true;
        logger.error('shutdown step failed', { step: step.name, error: err.message });
      }
    }

    clearTimeout(forceExit);
    process.exit(failed ? 1 : 0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return shutdown;
}

module.exports = { registerShutdown };
