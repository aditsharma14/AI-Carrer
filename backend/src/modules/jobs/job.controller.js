const jobService = require('./job.service');

async function createJob(req, res) {
  const job = await jobService.createJob(req.tenant.id, req.user.id, req.body);
  res.status(201).json(job);
}

async function listJobs(req, res) {
  const result = await jobService.listJobs(req.tenant.id, req.query);
  res.status(200).json(result);
}

async function getJob(req, res) {
  const job = await jobService.getJob(req.tenant.id, req.params.jobId);
  res.status(200).json(job);
}

async function updateJob(req, res) {
  const job = await jobService.updateJob(req.tenant.id, req.user.id, req.tenant.role, req.params.jobId, req.body);
  res.status(200).json(job);
}

async function applyToJob(req, res) {
  const result = await jobService.applyToJob(req.user.id, req.tenant.id, req.params.jobId);
  res.status(201).json(result);
}

module.exports = { createJob, listJobs, getJob, updateJob, applyToJob };
