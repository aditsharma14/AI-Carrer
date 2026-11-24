const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');
const logger = require('../../config/logger');
const ApiError = require('../../lib/ApiError');
const userRepository = require('./user.repository');
const organizationRepository = require('./organization.repository');
const membershipRepository = require('./membership.repository');
const auditService = require('../audit/audit.service');
const { sendInviteEmail } = require('./inviteEmail');

const BCRYPT_COST = 12;

// ---- token helpers --------------------------------------------------------
// Passwords are low-entropy (humans pick them) -> bcrypt, which is
// deliberately slow to resist brute force. Refresh tokens are already
// high-entropy signed JWTs -> sha256 is the right tool there; running bcrypt
// on something that's already unguessable just burns CPU for no benefit.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl });
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  // Rotation: every issued refresh token immediately overwrites the
  // previous hash. A stolen-but-unused refresh token becomes worthless the
  // moment the real client refreshes, because the hash it would present no
  // longer matches anything stored.
  await userRepository.setRefreshTokenHash(user._id, hashToken(refreshToken));
  return { accessToken, refreshToken };
}

function toPublicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email };
}

// ---- auth -------------------------------------------------------------------

async function signup({ name, email, password, organizationName, role }) {
  const existing = await userRepository.existsByEmail(email);
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await userRepository.create({ name, email, passwordHash });

  // Signing up always creates the user's own organization — for an
  // org_admin that's their company's hiring workspace; for a seeker it's a
  // personal tenant that scopes their resumes/coaching data. This keeps
  // every document in the system tenant-scoped with no "users without an
  // org" special case threaded through the rest of the app.
  const organization = await organizationRepository.create({ name: organizationName });
  await membershipRepository.create({ orgId: organization._id, userId: user._id, role });

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw ApiError.unauthorized('Invalid email or password');

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

async function refreshTokens(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await userRepository.findById(payload.sub);
  if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
    // Hash mismatch means this token was already rotated away (reused) or
    // the user logged out — either way, it's no longer valid.
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  return issueTokenPair(user);
}

async function logout(userId) {
  await userRepository.setRefreshTokenHash(userId, null);
}

async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User');
  return toPublicUser(user);
}

// ---- profile ----------------------------------------------------------------

async function updateProfile(userId, { name, email }) {
  const conflictingUser = await userRepository.findByEmail(email);
  if (conflictingUser && String(conflictingUser._id) !== String(userId)) {
    throw ApiError.conflict('Email already in use');
  }
  const user = await userRepository.updateById(userId, { name, email });
  return toPublicUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userRepository.findById(userId);
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw ApiError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await userRepository.updateById(userId, { passwordHash });
}

// ---- organization -----------------------------------------------------------

async function listMyMemberships(userId) {
  const memberships = await membershipRepository.findActiveByUserId(userId);
  return memberships.map((m) => ({
    orgId: String(m.orgId._id),
    orgName: m.orgId.name,
    role: m.role,
  }));
}

async function getOrgSettings(orgId) {
  const organization = await organizationRepository.findById(orgId);
  if (!organization) throw ApiError.notFound('Organization');
  return organization;
}

async function updateOrgSettings(orgId, actorUserId, updates) {
  const organization = await organizationRepository.updateById(orgId, updates);
  await auditService.record(orgId, actorUserId, 'org.settings_updated', { targetType: 'Organization', targetId: orgId, metadata: updates });
  return organization;
}

// ---- team -------------------------------------------------------------------

async function listMembers(orgId) {
  const memberships = await membershipRepository.listByOrg(orgId);
  return memberships.map((m) => ({
    membershipId: String(m._id),
    id: String(m.userId._id),
    name: m.userId.name,
    email: m.userId.email,
    role: m.role,
    status: m.status,
  }));
}

async function inviteMember(orgId, invitedByUserId, { email, role }) {
  const invitee = await userRepository.findByEmail(email);
  // Scope limit, called out deliberately rather than silently half-built:
  // this requires the invitee to already have an account. They are emailed a
  // link to sign in and accept. Inviting someone with NO account (a signup link
  // carrying a single-use token) is still to do, now that email delivery exists.
  if (!invitee) {
    throw ApiError.badRequest('No account found for this email — ask them to sign up first, then invite them.');
  }

  const existingMembership = await membershipRepository.findByOrgAndUser(orgId, invitee._id);
  if (existingMembership) throw ApiError.conflict('This person is already a member of this organization');

  const membership = await membershipRepository.create({
    orgId,
    userId: invitee._id,
    role,
    status: 'invited',
    invitedBy: invitedByUserId,
  });

  await auditService.record(orgId, invitedByUserId, 'member.invited', { targetType: 'Membership', targetId: membership._id, metadata: { email, role } });

  // The membership exists now. Nothing about the notification email may turn a
  // successful invite into an error, including these two lookups.
  try {
    const [org, inviter] = await Promise.all([organizationRepository.findById(orgId), userRepository.findById(invitedByUserId)]);
    await sendInviteEmail({ to: email, inviterName: inviter?.name, orgName: org?.name, role });
  } catch (err) {
    logger.error('invite email skipped', { orgId: String(orgId), error: err.message });
  }
}

async function removeMember(orgId, actorUserId, membershipId) {
  await membershipRepository.deleteById(membershipId, orgId);
  await auditService.record(orgId, actorUserId, 'member.removed', { targetType: 'Membership', targetId: membershipId });
}

module.exports = {
  signup,
  login,
  refreshTokens,
  logout,
  getMe,
  updateProfile,
  changePassword,
  listMyMemberships,
  getOrgSettings,
  updateOrgSettings,
  listMembers,
  inviteMember,
  removeMember,
};
