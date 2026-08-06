const matchingService = require('./matching.service');

async function triggerMatching(req, res) {
  const result = await matchingService.triggerMatching(req.tenant.id, req.params.jobId, req.user.id);
  res.status(202).json(result);
}

async function listSeekerMatches(req, res) {
  const result = await matchingService.listSeekerMatches(req.tenant.id, req.user.id, req.query);
  res.status(200).json(result);
}

async function getSeekerMatch(req, res) {
  const result = await matchingService.getSeekerMatch(req.tenant.id, req.user.id, req.params.jobId);
  res.status(200).json(result);
}

async function listCandidates(req, res) {
  const result = await matchingService.listCandidates(req.tenant.id, req.params.jobId);
  res.status(200).json({ items: result, nextCursor: null });
}

async function getCandidate(req, res) {
  const jobId = req.query.jobId;
  const result = await matchingService.getCandidateDetail(req.tenant.id, jobId, req.params.candidateId);
  res.status(200).json(result);
}

async function generateCandidateSummary(req, res) {
  const result = await matchingService.generateCandidateSummary(req.tenant.id, req.params.jobId, req.params.candidateId);
  res.status(200).json(result);
}

module.exports = {
  triggerMatching,
  listSeekerMatches,
  getSeekerMatch,
  listCandidates,
  getCandidate,
  generateCandidateSummary,
};
