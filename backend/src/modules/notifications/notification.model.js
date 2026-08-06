const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// In-app notifications — written by other modules/processors via
// notification.service.js's notify(), read by... nothing yet. No
// frontend notification center exists in this build (Navbar.jsx's bell icon
// is a static placeholder), so there is deliberately no controller/routes
// file here, same as audit.service.js. This module exists to be called, not
// to be browsed.
const notificationSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true }, // e.g. 'resume-parsed', 'matching-complete', 'interview-generated'
    message: { type: String, required: true },
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ orgId: 1, userId: 1, createdAt: -1 });

notificationSchema.plugin(tenantScopePlugin);

module.exports = model('Notification', notificationSchema);
