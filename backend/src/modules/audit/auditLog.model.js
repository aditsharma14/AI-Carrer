const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// Append-only trail of significant actions (member invited/removed, org
// settings changed, job posted, etc.) — written via audit.service.js's
// record(), never updated or deleted. No controller/routes: this exists for
// future compliance/support tooling, not as a feature an end user browses
// in this build.
const auditLogSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g. 'member.invited', 'org.settings_updated'
    targetType: { type: String, default: null }, // e.g. 'Membership', 'Organization'
    targetId: { type: Schema.Types.ObjectId, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ orgId: 1, createdAt: -1 });

auditLogSchema.plugin(tenantScopePlugin);

module.exports = model('AuditLog', auditLogSchema);
