const { Schema, model } = require('mongoose');

// The tenant. Every other tenant-owned document in the system (resumes,
// jobs, candidates...) carries this document's _id as `orgId`.
const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    plan: { type: String, enum: ['free', 'starter', 'growth', 'enterprise'], default: 'free' },
    settings: {
      allowSeekerSelfSignup: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = model('Organization', organizationSchema);
