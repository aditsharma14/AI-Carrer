const ApiError = require('../lib/ApiError');

// The single funnel for every error in the system. A controller throws, a
// service throws, an AI provider call fails, a Mongoose validator rejects —
// all of it lands here, and the client always gets back the same shape:
// { code, message, details, requestId }. This must be registered LAST in
// app.js — Express only treats a 4-argument function as an error handler.
module.exports = function errorHandler(err, req, res, next) {
  let apiError = err;

  if (!(err instanceof ApiError)) {
    if (err.name === 'ValidationError') {
      apiError = ApiError.badRequest('Validation failed', err.errors);
    } else if (err.name === 'CastError') {
      apiError = ApiError.badRequest(`Invalid value for ${err.path}`);
    } else if (err.code === 11000) {
      apiError = ApiError.conflict('Duplicate resource');
    } else {
      apiError = ApiError.internal(err.message);
    }
  }

  const log = req.log || console;
  log.error('request failed', {
    statusCode: apiError.statusCode,
    code: apiError.code,
    message: apiError.message,
    stack: err.stack,
  });

  res.status(apiError.statusCode).json({
    code: apiError.code,
    // Never leak internal error text for 5xx — the client gets a generic
    // message, the real one only goes to the server-side log above.
    message: apiError.statusCode >= 500 ? 'Internal server error' : apiError.message,
    details: apiError.statusCode >= 500 ? undefined : apiError.details,
    requestId: req.requestId,
  });
};
