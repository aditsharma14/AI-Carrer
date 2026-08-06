const ApiError = require('../../lib/ApiError');
const resumeService = require('./resume.service');

async function createManual(req, res) {
  const resume = await resumeService.createManualResume(req.tenant.id, req.user.id, req.body);
  res.status(201).json(resume);
}

async function upload(req, res) {
  if (!req.file) throw ApiError.badRequest('No file uploaded — expected a "resume" field');
  const result = await resumeService.requestUpload(req.tenant.id, req.user.id, req.file);
  res.status(202).json(result);
}

async function list(req, res) {
  const page = await resumeService.listResumes(req.tenant.id, req.user.id, req.query);
  res.status(200).json(page);
}

async function getOne(req, res) {
  const resume = await resumeService.getResume(req.tenant.id, req.user.id, req.params.resumeId);
  res.status(200).json(resume);
}

async function review(req, res) {
  const result = await resumeService.reviewResume(req.tenant.id, req.user.id, req.params.resumeId);
  res.status(200).json(result);
}

async function atsScore(req, res) {
  const result = await resumeService.requestAtsScore(req.tenant.id, req.user.id, req.params.resumeId, req.body.jobId);
  res.status(202).json(result);
}

async function latestAtsScore(req, res) {
  const result = await resumeService.getLatestAtsScore(req.tenant.id, req.user.id);
  res.status(200).json(result);
}

module.exports = { createManual, upload, list, getOne, review, atsScore, latestAtsScore };
