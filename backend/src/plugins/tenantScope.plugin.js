// Defense-in-depth, NOT the primary isolation mechanism. The primary
// mechanism is a team convention: every repository method takes `orgId` as
// its mandatory first argument. This plugin is the safety net for when that
// convention slips — it throws instead of silently leaking another tenant's
// data, because a loud error during development is infinitely cheaper than
// a quiet cross-tenant data leak in production.
const SCOPED_QUERY_METHODS = [
  'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
  'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'countDocuments',
];

module.exports = function tenantScopePlugin(schema) {
  for (const method of SCOPED_QUERY_METHODS) {
    schema.pre(method, function (next) {
      const filter = typeof this.getFilter === 'function' ? this.getFilter() : this.getQuery();

      if (!filter.orgId && !this.getOptions().allowCrossTenant) {
        return next(
          new Error(
            `Refusing to run ${method} on ${this.model.modelName} without an orgId filter. ` +
            `Pass { allowCrossTenant: true } explicitly if this query is intentionally global ` +
            `(e.g. looking up a user's own memberships across all their orgs).`
          )
        );
      }
      next();
    });
  }
};
