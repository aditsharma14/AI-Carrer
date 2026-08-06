const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// One document per generation — kept (not overwritten) so "latest" is just
// the newest by createdAt, same pattern as SkillGapReport, which this model
// is always generated from.
const learningRecSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skillGapReportId: { type: Schema.Types.ObjectId, ref: 'SkillGapReport', required: true },
    items: [
      {
        title: { type: String, required: true },
        provider: { type: String, required: true },
        skill: { type: String, required: true },
        url: { type: String, default: null },
      },
    ],
  },
  { timestamps: true }
);

learningRecSchema.index({ orgId: 1, userId: 1, createdAt: -1 });

learningRecSchema.plugin(tenantScopePlugin);

module.exports = model('LearningRec', learningRecSchema);
