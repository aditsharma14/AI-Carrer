const User = require('./user.model');

// Also not tenant-scoped — a user's identity exists independently of any
// one organization. Lean queries (.lean()) are used for reads that only
// need plain data (e.g. checking "does this email exist") — skipping
// Mongoose document hydration is a small but real win on a hot path like login.
module.exports = {
  create(data) {
    return User.create(data);
  },
  findById(userId) {
    return User.findById(userId);
  },
  findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  },
  existsByEmail(email) {
    return User.exists({ email: email.toLowerCase() });
  },
  updateById(userId, updates) {
    return User.findByIdAndUpdate(userId, updates, { new: true });
  },
  setRefreshTokenHash(userId, refreshTokenHash) {
    return User.findByIdAndUpdate(userId, { refreshTokenHash });
  },
};
