const learningService = require('./learning.service');

async function getRecommendations(req, res) {
  const result = await learningService.getRecommendations(req.tenant.id, req.user.id, req.query.skillGapReportId);
  res.status(200).json(result);
}

async function getLatest(req, res) {
  const result = await learningService.getLatest(req.tenant.id, req.user.id);
  res.status(200).json(result);
}

module.exports = { getRecommendations, getLatest };
