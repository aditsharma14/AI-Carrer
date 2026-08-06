const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/auth.middleware');
const resolveTenant = require('../../middleware/tenant.middleware');
const rateLimitTier = require('../../middleware/rateLimit.middleware');
const validate = require('../../middleware/validate.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');
const identityController = require('./identity.controller');
const {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateOrgSettingsSchema,
  inviteMemberSchema,
} = require('./identity.validation');

const router = express.Router();

// --- auth: no authenticate() needed yet, this IS how a session begins ------
router.post('/auth/signup', rateLimitTier('auth'), validate(signupSchema), asyncHandler(identityController.signup));
router.post('/auth/login', rateLimitTier('auth'), validate(loginSchema), asyncHandler(identityController.login));
router.post('/auth/refresh', rateLimitTier('auth'), asyncHandler(identityController.refresh));

router.post('/auth/logout', authenticate, asyncHandler(identityController.logout));
router.get('/auth/me', authenticate, asyncHandler(identityController.me));

// --- profile -----------------------------------------------------------------
router.patch('/users/me', authenticate, validate(updateProfileSchema), asyncHandler(identityController.updateProfile));
router.post(
  '/users/me/password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(identityController.changePassword)
);

// --- organization --------------------------------------------------------------
// my-memberships has no resolveTenant() — it's how the frontend discovers
// which org(s) to even offer as "active," so it can't depend on one already
// being resolved.
router.get('/organizations/my-memberships', authenticate, asyncHandler(identityController.listMyMemberships));

router.get('/organizations/settings', authenticate, resolveTenant(), asyncHandler(identityController.getOrgSettings));
router.patch(
  '/organizations/settings',
  authenticate,
  resolveTenant(),
  requirePermission('org:manage'),
  validate(updateOrgSettingsSchema),
  asyncHandler(identityController.updateOrgSettings)
);

router.get('/organizations/members', authenticate, resolveTenant(), asyncHandler(identityController.listMembers));
router.post(
  '/organizations/invites',
  authenticate,
  resolveTenant(),
  requirePermission('org:manage'),
  validate(inviteMemberSchema),
  asyncHandler(identityController.inviteMember)
);
router.delete(
  '/organizations/members/:membershipId',
  authenticate,
  resolveTenant(),
  requirePermission('org:manage'),
  asyncHandler(identityController.removeMember)
);

module.exports = router;
