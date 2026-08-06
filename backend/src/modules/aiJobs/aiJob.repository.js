const AiJob = require('./aiJob.model');

module.exports = {
  create({ orgId, type, createdBy, payload }) {
    return AiJob.create({ orgId, type, createdBy, payload });
  },

  findByIdScoped(orgId, jobId) {
    return AiJob.findOne({ _id: jobId, orgId });
  },

  // orgId is mandatory here, not optional — AiJob has tenantScopePlugin
  // applied (see aiJob.model.js), which throws on any findOneAndUpdate-family
  // query missing orgId in its filter. findByIdAndUpdate is a thin wrapper
  // around findOneAndUpdate, so it was hitting that throw on every call:
  // every worker process has orgId on job.data already (see queue/queues.js's
  // enqueueAiJob, which always adds it to the job payload), so this is purely
  // about threading a value callers already have, not looking anything up.
  markProcessing(orgId, jobId) {
    return AiJob.findOneAndUpdate({ _id: jobId, orgId }, { status: 'processing', $inc: { attempts: 1 } });
  },

  markDone(orgId, jobId, result) {
    return AiJob.findOneAndUpdate({ _id: jobId, orgId }, { status: 'done', result, error: null });
  },

  markFailed(orgId, jobId, errorMessage) {
    return AiJob.findOneAndUpdate({ _id: jobId, orgId }, { status: 'failed_needs_review', error: errorMessage });
  },
};
