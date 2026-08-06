const Membership = require('./membership.model');

module.exports = {
  create(data) {
    return Membership.create(data);
  },

  // The one legitimately cross-tenant query in the app: a user's own
  // memberships, by definition, span every org they belong to. We satisfy
  // the tenantScope plugin explicitly via `allowCrossTenant` rather than
  // weakening the plugin for everyone else.
  findActiveByUserId(userId) {
    return Membership.find({ userId, status: 'active' }, null, { allowCrossTenant: true }).populate(
      'orgId',
      'name plan'
    );
  },

  findByOrgAndUser(orgId, userId) {
    return Membership.findOne({ orgId, userId });
  },

  listByOrg(orgId) {
    return Membership.find({ orgId }).populate('userId', 'name email').sort({ createdAt: -1 });
  },

  updateStatus(membershipId, orgId, status) {
    return Membership.findOneAndUpdate({ _id: membershipId, orgId }, { status }, { new: true });
  },

  deleteById(membershipId, orgId) {
    return Membership.deleteOne({ _id: membershipId, orgId });
  },
};
