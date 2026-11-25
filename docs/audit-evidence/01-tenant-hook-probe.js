// Audit evidence script. Run from the repository root:  node docs/audit-evidence/01-tenant-hook-probe.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// Does the tenantScope plugin work AT ALL with the installed Mongoose?
const path = require('path');
const root = (REPO + '/backend');
process.env.MONGODB_URI = 'mongodb://x';
process.env.JWT_ACCESS_SECRET = 'a';
process.env.JWT_REFRESH_SECRET = 'b';
process.env.LOG_LEVEL = 'error';

const mongoose = require(path.join(root, 'node_modules/mongoose'));
console.log('mongoose version:', mongoose.version);
mongoose.set('bufferCommands', false);

const ResumeVersion = require(path.join(root, 'src/modules/resumes/resumeVersion.model'));

async function attempt(label, fn) {
  try {
    await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT (hook passed, reached the driver)')), 1500))]);
    console.log(`${label}: completed`);
  } catch (e) {
    console.log(`${label}: ${e.message.slice(0, 120)}`);
  }
}

(async () => {
  const orgId = new mongoose.Types.ObjectId();
  const id = new mongoose.Types.ObjectId();
  await attempt('SCOPED   find({ orgId, _id })      ', () => ResumeVersion.find({ orgId, _id: id }));
  await attempt('SCOPED   findOne({ orgId, _id })   ', () => ResumeVersion.findOne({ orgId, _id: id }));
  await attempt('UNSCOPED find({ _id })             ', () => ResumeVersion.find({ _id: id }));
  await attempt('OPT-OUT  find with allowCrossTenant', () => ResumeVersion.find({ _id: id }, null, { allowCrossTenant: true }));
  process.exit(0);
})();
