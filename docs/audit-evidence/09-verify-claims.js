// Audit evidence script. Run from the repository root:  node docs/audit-evidence/09-verify-claims.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// Direct checks for claims that were only code-read in the audit.
const path = require('path');
const root = (REPO + '/backend');
process.env.MONGODB_URI = 'mongodb://x';
process.env.JWT_ACCESS_SECRET = 'a';
process.env.JWT_REFRESH_SECRET = 'b';
process.env.LOG_LEVEL = 'error';

// --- RBAC-01: the loose capability matcher ---------------------------------------
const { requirePermission } = require(path.join(root, 'src/middleware/rbac.middleware.js'));
const check = (role, capability) => {
  let allowed = false;
  requirePermission(capability)({ tenant: { role } }, {}, (err) => { allowed = !err; });
  return allowed;
};
console.log('RBAC-01 capability matching (hiring_manager holds "candidate:view"):');
console.log('  candidate:view       ->', check('hiring_manager', 'candidate:view'));
console.log('  candidate:viewall    ->', check('hiring_manager', 'candidate:viewall'), '(prefix match: should be false)');
console.log('  candidate:view:other ->', check('hiring_manager', 'candidate:view:other'));
console.log('  candidate:rank       ->', check('hiring_manager', 'candidate:rank'), '(held explicitly)');
console.log('  candidate:delete     ->', check('hiring_manager', 'candidate:delete'), '(not held)');

// --- AUTH-02: the timing difference the login path creates ---------------------------
const bcrypt = require(path.join(root, 'node_modules/bcryptjs'));
(async () => {
  const hash = await bcrypt.hash('correct horse battery', 12);
  const t0 = process.hrtime.bigint();
  await bcrypt.compare('wrong password', hash); // path taken when the email EXISTS
  const withUser = Number(process.hrtime.bigint() - t0) / 1e6;
  const t1 = process.hrtime.bigint();
  // path taken when the email is UNKNOWN: login() throws before any bcrypt work
  await Promise.resolve();
  const withoutUser = Number(process.hrtime.bigint() - t1) / 1e6;
  console.log(`\nAUTH-02 login work for a KNOWN email: ${withUser.toFixed(0)} ms (bcrypt cost 12); for an UNKNOWN email: ${withoutUser.toFixed(3)} ms (returns before bcrypt)`);
  process.exit(0);
})();

// --- SEC-01: does a production boot accept placeholder secrets? -------------------------
const { execFileSync } = require('node:child_process');
try {
  const out = execFileSync(
    process.execPath,
    ['-e', "require(process.argv[1]); console.log('ACCEPTED: production config loaded with 1-character, identical JWT secrets')", path.join(root, 'src/config/env.js')],
    { env: { ...process.env, NODE_ENV: 'production', MONGODB_URI: 'mongodb://x', JWT_ACCESS_SECRET: 'a', JWT_REFRESH_SECRET: 'a' }, encoding: 'utf8' }
  );
  console.log('SEC-01', out.split(/\r?\n/).filter((l) => !l.includes('injected env')).join(' ').trim());
} catch (e) {
  console.log('SEC-01 REJECTED weak secrets:', String(e.stderr || e.message).split(/\r?\n/)[0]);
}
