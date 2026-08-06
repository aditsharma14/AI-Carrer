const AuditLog = require('./auditLog.model');
const logger = require('../../config/logger');

// Talks to the model directly, no repository — this is an internal,
// cross-cutting infra module (every other module calls INTO this one), not
// a domain entity with its own queries to abstract. Same exception as
// notification.service.js.
//
// Deliberately fire-and-forget: a failure to write an audit entry must
// never fail the request that triggered it (inviting a member should not
// 500 because the audit log insert hiccuped) — logged instead, never thrown.
async function record(orgId, actorUserId, action, { targetType = null, targetId = null, metadata = null } = {}) {
  try {
    await AuditLog.create({ orgId, actorUserId, action, targetType, targetId, metadata });
  } catch (err) {
    logger.error('audit.record failed', { orgId, action, error: err.message });
  }
}

module.exports = { record };
