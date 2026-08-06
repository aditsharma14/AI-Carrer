const resumeRepository = require('./resume.repository');
const ApiError = require('../../lib/ApiError');
const { enqueueAiJob, QUEUE_NAMES } = require('../../queue/queues');
const resumeReviewerService = require('../../ai/services/resumeReviewer.service');

function shapeResume(resume, version) {
  return {
    id: String(resume._id),
    title: resume.title,
    status: resume.status,
    source: resume.source,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
    structuredData: version ? version.structuredData : null,
  };
}

// Fast, no AI involved — saved directly, no queue. See resumeParser vs.
// reviewer/scorer comments below for why uploads take a different path.
async function createManualResume(orgId, userId, payload) {
  const resume = await resumeRepository.createResume(orgId, userId, { title: payload.title, source: 'manual', status: 'processing' });
  const version = await resumeRepository.createVersion(orgId, resume._id, {
    rawText: null,
    structuredData: {
      summary: payload.summary || '',
      skills: payload.skills,
      experience: payload.experience,
      education: payload.education,
    },
  });
  const updated = await resumeRepository.setCurrentVersion(orgId, resume._id, version._id, 'parsed');
  return shapeResume(updated, version);
}

// Async by default (docs/ARCHITECTURE.md §1.4) — file parsing involves real
// I/O plus an LLM call, both slow enough that tying an HTTP request thread
// to them risks a load-balancer timeout. The controller gets back a jobId
// to hand to the client immediately; a worker does the actual work later.
async function requestUpload(orgId, userId, file) {
  const resume = await resumeRepository.createResume(orgId, userId, {
    title: file.originalname,
    source: 'upload',
    status: 'processing',
  });

  const { jobId } = await enqueueAiJob({
    orgId,
    type: 'resume-parse',
    queueName: QUEUE_NAMES.RESUME_PARSE,
    jobName: 'parse',
    createdBy: userId,
    payload: {
      resumeId: String(resume._id),
      userId: String(userId), // so resumeParse.processor.js can notify the right person on completion, without an extra fetch
      fileBuffer: file.buffer.toString('base64'), // BullMQ payloads are JSON — base64 is how a Buffer survives that
      mimetype: file.mimetype,
    },
  });

  return { jobId, resumeId: String(resume._id) };
}

async function listResumes(orgId, userId, { cursor }) {
  const page = await resumeRepository.listByOrgUser(orgId, userId, { cursor });
  return {
    items: page.items.map((r) => ({
      id: String(r._id),
      title: r.title,
      status: r.status,
      source: r.source,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    nextCursor: page.nextCursor,
  };
}

async function getResume(orgId, userId, resumeId) {
  const resume = await resumeRepository.findByIdScoped(orgId, resumeId);
  if (!resume || String(resume.userId) !== String(userId)) throw ApiError.notFound('Resume');
  return shapeResume(resume, resume.currentVersionId);
}

// Synchronous — the one exception in this module. A single cheap LLM call
// on text already in memory doesn't need the round-trip cost of polling.
async function reviewResume(orgId, userId, resumeId) {
  const resume = await resumeRepository.findByIdScoped(orgId, resumeId);
  if (!resume || String(resume.userId) !== String(userId)) throw ApiError.notFound('Resume');
  if (!resume.currentVersionId) throw ApiError.badRequest('This resume has no content yet');

  return resumeReviewerService.reviewResume({ structuredData: resume.currentVersionId.structuredData });
}

async function requestAtsScore(orgId, userId, resumeId, targetJobId) {
  const resume = await resumeRepository.findByIdScoped(orgId, resumeId);
  if (!resume || String(resume.userId) !== String(userId)) throw ApiError.notFound('Resume');
  if (!resume.currentVersionId) throw ApiError.badRequest('This resume has no content yet');

  const { jobId } = await enqueueAiJob({
    orgId,
    type: 'ats-score',
    queueName: QUEUE_NAMES.ATS_SCORE,
    jobName: 'score',
    createdBy: userId,
    payload: { resumeId: String(resumeId), versionId: String(resume.currentVersionId._id), targetJobId },
  });

  return { jobId };
}

async function getLatestAtsScore(orgId, userId) {
  const versionWithScore = await resumeRepository.findLatestAtsScoreForUser(orgId, userId);
  if (!versionWithScore) return null;

  return { resumeId: String(versionWithScore.resumeId), ...versionWithScore.latestAtsScore.toObject() };
}

module.exports = {
  createManualResume,
  requestUpload,
  listResumes,
  getResume,
  reviewResume,
  requestAtsScore,
  getLatestAtsScore,
};
