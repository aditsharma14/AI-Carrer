const jobRepository = require('./job.repository');
const applicationRepository = require('./application.repository');
const resumeRepository = require('../resumes/resume.repository');
const ApiError = require('../../lib/ApiError');

// Same lightweight heuristic list used by resumeParser.service.js's stub
// mode — kept local rather than imported so this module doesn't reach into
// the AI layer for something that isn't an AI decision: pulling known skill
// names out of free text is plain string matching, not model inference.
const KNOWN_SKILLS = [
  'javascript', 'typescript', 'react', 'node.js', 'node', 'express', 'mongodb', 'sql', 'python',
  'java', 'aws', 'docker', 'kubernetes', 'graphql', 'css', 'html', 'redux', 'next.js', 'vue',
  'angular', 'c++', 'c#', 'go', 'rust', 'figma', 'project management', 'leadership',
];

function extractSkillsFromDescription(description) {
  const lower = description.toLowerCase();
  return KNOWN_SKILLS.filter((skill) => lower.includes(skill));
}

// Every service function below hands the frontend `id`, never a raw Mongoose
// document's `_id` — same convention as resume.service.js's shapeResume().
function shapeJob(job) {
  return {
    id: String(job._id),
    title: job.title,
    location: job.location,
    employmentType: job.employmentType,
    description: job.description,
    requirements: job.requirements,
    status: job.status,
    applicantCount: job.applicantCount,
    createdAt: job.createdAt,
  };
}

async function createJob(orgId, userId, payload) {
  const skills = extractSkillsFromDescription(payload.description);
  const job = await jobRepository.createJob(orgId, userId, { ...payload, skills });
  return shapeJob(job);
}

async function getJob(orgId, jobId) {
  const job = await jobRepository.findByIdScoped(orgId, jobId);
  if (!job) throw ApiError.notFound('Job');
  return shapeJob(job);
}

async function updateJob(orgId, userId, role, jobId, updates) {
  const existing = await jobRepository.findByIdScoped(orgId, jobId);
  if (!existing) throw ApiError.notFound('Job');

  // ':own' capability check that requirePermission() can't do itself — see
  // rbac.middleware.js's comment on why ownership checks live here, once the
  // resource is actually loaded.
  if (role !== 'org_admin' && String(existing.createdBy) !== String(userId)) {
    throw ApiError.forbidden('You can only edit jobs you created');
  }

  if (updates.description) updates.requirements = { skills: extractSkillsFromDescription(updates.description) };
  const updated = await jobRepository.updateJob(orgId, jobId, updates);
  return shapeJob(updated);
}

async function listJobs(orgId, query) {
  const page = await jobRepository.listByOrg(orgId, query);
  return { items: page.items.map(shapeJob), nextCursor: page.nextCursor };
}

async function getOpenJob(jobId) {
  const job = await jobRepository.findOpenByIdAnyOrg(jobId);
  if (!job) throw ApiError.notFound('Job');
  return job;
}

// The one write in the system where the acting org isn't req.tenant.id.
// Applying to a job is inherently a cross-tenant action: the candidate's
// session is scoped to their own personal org, but the write lands in the
// job's (recruiter) org. See application.model.js for the full rationale.
async function applyToJob(candidateUserId, candidateOrgId, jobId) {
  const job = await getOpenJob(jobId);

  const existing = await applicationRepository.findByJobAndCandidate(jobId, candidateUserId);
  if (existing) throw ApiError.conflict('You have already applied to this job');

  const { items } = await resumeRepository.listByOrgUser(candidateOrgId, candidateUserId, { limit: 1 });
  if (!items[0]) throw ApiError.badRequest('Upload a resume before applying');

  const application = await applicationRepository.create(job.orgId, {
    jobId: job._id,
    candidateUserId,
    candidateOrgId,
    resumeId: items[0]._id,
  });
  await jobRepository.incrementApplicantCount(job.orgId, jobId);

  return { id: String(application._id), status: application.status };
}

module.exports = { createJob, getJob, updateJob, listJobs, getOpenJob, applyToJob };
