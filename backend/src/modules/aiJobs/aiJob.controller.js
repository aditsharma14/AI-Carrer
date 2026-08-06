const ApiError = require('../../lib/ApiError');
const aiJobRepository = require('./aiJob.repository');

// No service layer here on purpose — "look this job up by id and return its
// status" has no business logic to coordinate. Adding an empty pass-through
// service would be exactly the unnecessary abstraction the project avoids.
async function getStatus(req, res) {
  const job = await aiJobRepository.findByIdScoped(req.tenant.id, req.params.jobId);
  if (!job) throw ApiError.notFound('AI job');

  res.status(200).json({
    status: job.status,
    result: job.status === 'done' ? job.result : undefined,
    error: job.status === 'failed_needs_review' ? job.error : undefined,
  });
}

module.exports = { getStatus };
