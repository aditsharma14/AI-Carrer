const ms = require('ms');
const env = require('../../config/env');
const identityService = require('./identity.service');

// Controllers only do three things: pull data out of the request, call
// exactly one service function, shape the response. No branching on
// business rules — that's what makes them safe to skim in five seconds.

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true, // never readable by frontend JS — the #1 XSS mitigation for this token
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: ms(env.jwt.refreshTtl),
};

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
}

async function signup(req, res) {
  const { refreshToken, ...result } = await identityService.signup(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json(result);
}

async function login(req, res) {
  const { refreshToken, ...result } = await identityService.login(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(200).json(result);
}

async function refresh(req, res) {
  const { refreshToken, ...result } = await identityService.refreshTokens(req.cookies[REFRESH_COOKIE]);
  setRefreshCookie(res, refreshToken);
  res.status(200).json(result);
}

async function logout(req, res) {
  await identityService.logout(req.user.id);
  res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);
  res.status(204).send();
}

async function me(req, res) {
  const user = await identityService.getMe(req.user.id);
  res.status(200).json(user);
}

async function updateProfile(req, res) {
  const user = await identityService.updateProfile(req.user.id, req.body);
  res.status(200).json(user);
}

async function changePassword(req, res) {
  await identityService.changePassword(req.user.id, req.body);
  res.status(204).send();
}

async function listMyMemberships(req, res) {
  const memberships = await identityService.listMyMemberships(req.user.id);
  res.status(200).json(memberships);
}

async function getOrgSettings(req, res) {
  const settings = await identityService.getOrgSettings(req.tenant.id);
  res.status(200).json(settings);
}

async function updateOrgSettings(req, res) {
  const settings = await identityService.updateOrgSettings(req.tenant.id, req.user.id, req.body);
  res.status(200).json(settings);
}

async function listMembers(req, res) {
  const members = await identityService.listMembers(req.tenant.id);
  res.status(200).json(members);
}

async function inviteMember(req, res) {
  await identityService.inviteMember(req.tenant.id, req.user.id, req.body);
  res.status(201).json({ message: 'Invite sent' });
}

async function removeMember(req, res) {
  await identityService.removeMember(req.tenant.id, req.user.id, req.params.membershipId);
  res.status(204).send();
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  changePassword,
  listMyMemberships,
  getOrgSettings,
  updateOrgSettings,
  listMembers,
  inviteMember,
  removeMember,
};
