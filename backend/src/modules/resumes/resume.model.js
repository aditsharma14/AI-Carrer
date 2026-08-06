const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// The "pointer" document. The actual content lives on ResumeVersion — this
// just tracks ownership and which version is currently active. Kept separate
// so re-parsing or editing a resume never has to touch or grow this document.
const resumeSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    source: { type: String, enum: ['upload', 'manual'], required: true },
    status: {
      type: String,
      enum: ['processing', 'parsed', 'failed_needs_review'],
      default: 'processing',
    },
    currentVersionId: { type: Schema.Types.ObjectId, ref: 'ResumeVersion', default: null },
  },
  { timestamps: true }
);

// Serves "list this user's resumes" (the seeker's own resume list page),
// sorted newest-first via the same compound index.
resumeSchema.index({ orgId: 1, userId: 1, createdAt: -1 });

resumeSchema.plugin(tenantScopePlugin);

module.exports = model('Resume', resumeSchema);
