const ApiError = require('../lib/ApiError');
const membershipRepository = require('../modules/identity/membership.repository');

// Must run after authenticate() (needs req.user) and before every other
// middleware/controller below it (everything downstream assumes req.tenant
// exists). A user can belong to multiple orgs (a recruiter contracting for
// two companies, a seeker who's also an interviewer elsewhere) — the
// X-Org-Id header lets the client say which one this request is for.
module.exports = function resolveTenant() {
  return async function (req, res, next) {
    try {
      const requestedOrgId = req.headers['x-org-id'];

      const memberships = await membershipRepository.findActiveByUserId(req.user.id);
      if (memberships.length === 0) {
        return next(ApiError.forbidden('User has no active organization membership'));
      }

      const membership = requestedOrgId
        ? memberships.find((m) => String(m.orgId) === String(requestedOrgId))
        : memberships[0];

      if (!membership) {
        return next(ApiError.forbidden('User is not a member of the requested organization'));
      }

      req.tenant = { id: String(membership.orgId), role: membership.role, membershipId: String(membership._id) };
      next();
    } catch (err) {
      next(err);
    }
  };
};
