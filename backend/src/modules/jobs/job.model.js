const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

const jobSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    location: { type: String, default: 'Remote' },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship'],
      default: 'full_time',
    },
    description: { type: String, required: true },
    // Extracted from `description` by job.service.js on create/update — the
    // form only collects a description, not structured requirements (see
    // docs/ARCHITECTURE.md §13: "Do NOT generate CRUD boilerplate" / requirements
    // extraction is the one piece of intelligence on an otherwise plain CRUD resource).
    requirements: {
      skills: { type: [String], default: [] },
    },
    status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft' },
    applicantCount: { type: Number, default: 0 }, // denormalized counter, kept in sync by application.repository.js
  },
  { timestamps: true }
);

jobSchema.index({ orgId: 1, status: 1, createdAt: -1 });

jobSchema.plugin(tenantScopePlugin);

module.exports = model('Job', jobSchema);
