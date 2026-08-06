const { Schema, model } = require('mongoose');

// A login identity. Deliberately NOT tenant-scoped — a person is one user
// document no matter how many organizations they belong to; which orgs and
// with which role is entirely the Membership model's job.
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    // Hash of the current refresh token, never the raw token. Single field =
    // single active session per user (see identity.service.js comments for
    // the production note on multi-session support).
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = model('User', userSchema);
