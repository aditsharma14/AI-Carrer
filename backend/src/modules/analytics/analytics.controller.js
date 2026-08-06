const analyticsService = require('./analytics.service');

async function getOverview(req, res) {
  const result = await analyticsService.getOverview(req.tenant.id);
  res.status(200).json(result);
}

async function getHiringFunnel(req, res) {
  const result = await analyticsService.getHiringFunnel(req.tenant.id);
  res.status(200).json(result);
}

async function getTimeToHire(req, res) {
  const result = await analyticsService.getTimeToHire(req.tenant.id);
  res.status(200).json(result);
}

module.exports = { getOverview, getHiringFunnel, getTimeToHire };
