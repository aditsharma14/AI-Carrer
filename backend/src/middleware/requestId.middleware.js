const crypto = require('crypto');
const { makeLogger } = require('../config/logger');

// Runs first in the chain (see app.js) so every middleware and controller
// after it can log with the same requestId — that's what lets you grep one
// request's entire story out of production logs.
module.exports = function requestId(req, res, next) {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  req.log = makeLogger(req.requestId);
  next();
};
