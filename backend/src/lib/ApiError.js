// One error shape for the entire app. Without this, every module invents its
// own "not found" response and the client ends up handling five different
// error formats. With it, error.middleware.js has exactly one shape to map
// to an HTTP response, no matter which layer threw.
class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; // machine-readable, e.g. 'NOT_FOUND' — the client can switch on this
    this.details = details; // optional extra info (e.g. Zod validation issues)
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(resource = 'Resource') {
    return new ApiError(404, 'NOT_FOUND', `${resource} not found`);
  }
  static conflict(message) {
    return new ApiError(409, 'CONFLICT', message);
  }
  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
  static internal(message = 'Internal server error', details) {
    return new ApiError(500, 'INTERNAL', message, details);
  }
}

module.exports = ApiError;
