const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// The join between User and Organization — and the home of `role`, which is
// a property of the *relationship* (this person, in this org), not of the
// user globally. This single design choice is what lets one person be a
// seeker for themselves and a recruiter for a company without two user types.
const membershipSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['org_admin', 'recruiter', 'hiring_manager', 'interviewer', 'seeker'],
      required: true,
    },
    status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// One membership per (org, user) pair — a person can't join the same org twice.
membershipSchema.index({ orgId: 1, userId: 1 }, { unique: true });
// Serves "list all admins in this org" / "list all recruiters in this org" directly.
membershipSchema.index({ orgId: 1, role: 1 });

membershipSchema.plugin(tenantScopePlugin);

module.exports = model('Membership', membershipSchema);
