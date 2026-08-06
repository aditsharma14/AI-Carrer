const ApiError = require('../lib/ApiError');

// schemas = { body?: ZodSchema, params?: ZodSchema, query?: ZodSchema }
//
// Runs before the controller so malformed input never reaches business logic.
// Zod's `.parse()` also *coerces and defaults* — so req.body coming out the
// other side isn't just validated, it's the exact shape the controller expects.
module.exports = function validate(schemas) {
  return function (req, res, next) {
    try {
      for (const key of ['params', 'query', 'body']) {
        if (schemas[key]) {
          req[key] = schemas[key].parse(req[key]);
        }
      }
      next();
    } catch (err) {
      next(ApiError.badRequest('Validation failed', err.errors || err.issues || String(err)));
    }
  };
};
