// Express does not catch rejected promises from an async route handler on
// its own — without this wrapper, a thrown error inside an `async function`
// controller becomes an unhandled rejection instead of a clean error response.
//
// Beginner note: compare these two:
//   router.get('/x', async (req, res) => { throw err })       // crashes silently
//   router.get('/x', asyncHandler(async (req, res) => { throw err }))  // reaches error.middleware.js
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
