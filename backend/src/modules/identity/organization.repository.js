const Organization = require('./organization.model');

// Repositories only talk to Mongoose — no business logic, no HTTP knowledge.
// Organization itself isn't tenant-scoped (it IS the tenant), so unlike every
// other repository in this app, these methods don't take an orgId filter.
module.exports = {
  create(data) {
    return Organization.create(data);
  },
  findById(orgId) {
    return Organization.findById(orgId);
  },
  updateById(orgId, updates) {
    return Organization.findByIdAndUpdate(orgId, updates, { new: true });
  },
};
