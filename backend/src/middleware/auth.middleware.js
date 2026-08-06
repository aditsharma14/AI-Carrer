const jwt = require('jsonwebtoken');
const ApiError = require('../lib/ApiError');
const env = require('../config/env');

// Answers "who is this?" — and only that. Figuring out "which org's data
// should this request see" is a separate concern (tenant.middleware.js),
// because one user can belong to more than one organization.
module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
};
