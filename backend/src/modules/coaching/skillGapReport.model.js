const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

const skillGapReportSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetRole: { type: String, required: true },
    gaps: [{ skill: String, priority: { type: String, enum: ['high', 'medium', 'low'] } }],
    strengths: [String],
    explanation: { type: String, default: null },
  },
  { timestamps: true }
);

skillGapReportSchema.index({ orgId: 1, userId: 1, createdAt: -1 });
skillGapReportSchema.plugin(tenantScopePlugin);

module.exports = model('SkillGapReport', skillGapReportSchema);
