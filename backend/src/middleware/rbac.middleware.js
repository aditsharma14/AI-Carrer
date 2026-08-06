const ApiError = require('../lib/ApiError');

// role -> list of capability strings. Checked centrally here, never as
// scattered `if (req.tenant.role === 'recruiter' || ...)` checks inside
// controllers — that pattern is exactly how a permission model drifts out of
// sync with itself as a codebase grows past a handful of routes.
const PERMISSIONS = {
  org_admin: ['org:manage', 'job:*', 'candidate:*', 'billing:manage', 'resume:*', 'coaching:*', 'interview:*'],
  hiring_manager: ['job:create', 'job:edit:own', 'candidate:view', 'candidate:rank', 'interview:*'],
  recruiter: ['job:create', 'job:edit:own', 'candidate:*', 'interview:*'],
  interviewer: ['candidate:view:assigned', 'interview:conduct'],
  seeker: ['resume:*:own', 'coaching:*:own', 'interview:practice:own', 'learning:*:own'],
};

// 'job:*' grants every 'job:...' action. The ':own' suffix is a naming
// convention only — middleware can check the *capability* shape, but it
// can't check "is this actually their resource" because it hasn't loaded
// the resource yet. That ownership check happens in the service layer.
function capabilityMatches(granted, required) {
  const [grantedDomain, grantedAction] = granted.split(':');
  const [requiredDomain] = required.split(':');
  if (grantedDomain !== requiredDomain) return false;
  if (grantedAction === '*') return true;
  return granted === required || required.startsWith(granted);
}

function requirePermission(capability) {
  return function (req, res, next) {
    const role = req.tenant && req.tenant.role;
    const granted = PERMISSIONS[role] || [];
    const allowed = granted.some((g) => capabilityMatches(g, capability));
    if (!allowed) {
      return next(ApiError.forbidden(`Role '${role}' lacks capability '${capability}'`));
    }
    next();
  };
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.tenant || !roles.includes(req.tenant.role)) {
      return next(ApiError.forbidden(`Requires one of roles: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { PERMISSIONS, requirePermission, requireRole };
