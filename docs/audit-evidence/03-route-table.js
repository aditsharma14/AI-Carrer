// Audit evidence script. Run from the repository root:  node docs/audit-evidence/03-route-table.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// Prints every API endpoint with the protections ACTUALLY attached to it.
const path = require('path');
const root = (REPO + '/backend');
process.env.MONGODB_URI = 'mongodb://x';
process.env.JWT_ACCESS_SECRET = 'a';
process.env.JWT_REFRESH_SECRET = 'b';
process.env.LOG_LEVEL = 'error';
const req = (p) => require(path.join(root, p));

// Tag the products of the middleware factories so the table can name them.
const tag = (fn, label) => Object.assign(fn, { __label: label });
const rbac = req('src/middleware/rbac.middleware.js');
const origPerm = rbac.requirePermission;
const origRole = rbac.requireRole;
rbac.requirePermission = (c) => tag(origPerm(c), `perm(${c})`);
rbac.requireRole = (...r) => tag(origRole(...r), `role(${r.join('|')})`);

const tenant = req('src/middleware/tenant.middleware.js');
const tenantModuleId = require.resolve(path.join(root, 'src/middleware/tenant.middleware.js'));
require.cache[tenantModuleId].exports = () => tag(tenant(), 'tenant');

const rl = req('src/middleware/rateLimit.middleware.js');
const rlId = require.resolve(path.join(root, 'src/middleware/rateLimit.middleware.js'));
require.cache[rlId].exports = (t) => tag(rl(t), `limit:${t}`);

const val = req('src/middleware/validate.middleware.js');
const valId = require.resolve(path.join(root, 'src/middleware/validate.middleware.js'));
require.cache[valId].exports = (s) => tag(val(s), `validate(${Object.keys(s).join(',')})`);

const auth = req('src/middleware/auth.middleware.js');
tag(auth, 'auth');

// Capture routes instead of building real routers.
const express = req('node_modules/express');
const routes = [];
const realRouter = express.Router;
express.Router = function () {
  const stub = {};
  for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
    stub[m] = (p, ...handlers) => {
      routes.push({ method: m.toUpperCase(), path: p, chain: handlers.map((h) => h.__label || (h.name && h.name !== 'anonymous' ? h.name : 'handler')) });
      return stub;
    };
  }
  stub.use = () => stub;
  return stub;
};

for (const mod of ['identity', 'resumes', 'coaching', 'matching', 'jobs', 'interview', 'learning', 'analytics', 'aiJobs']) {
  req(require('fs').readdirSync(path.join(root,'src/modules',mod)).filter(f=>f.endsWith('.routes.js')).map(f=>'src/modules/'+mod+'/'+f)[0]);
}
express.Router = realRouter;

const pad = (s, n) => String(s).padEnd(n);
for (const r of routes) {
  const c = r.chain;
  const has = (p) => c.some((x) => x.startsWith(p));
  console.log(
    `${pad(r.method, 6)} ${pad(r.path, 46)} auth:${has('auth') ? 'Y' : 'N'} tenant:${has('tenant') ? 'Y' : 'N'} ` +
      `rbac:${pad(c.filter((x) => x.startsWith('perm') || x.startsWith('role')).join('+') || '-', 26)} ` +
      `validate:${has('validate') ? 'Y' : 'N'} ${c.filter((x) => x.startsWith('limit')).join('')}`
  );
}
console.log(`\n${routes.length} endpoints`);
process.exit(0);
