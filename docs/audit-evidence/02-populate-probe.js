// Audit evidence script. Run from the repository root:  node docs/audit-evidence/02-populate-probe.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// A CORRECTED copy of the plugin (async hook, no next) living only in this scratch
// file. Question: once hooks work, are populate queries on a scoped model refused?
const path = require('path');
const mongoose = require(path.join((REPO + '/backend'), 'node_modules/mongoose'));
mongoose.set('bufferCommands', false);

function fixedPlugin(schema) {
  for (const method of ['find', 'findOne', 'findOneAndUpdate', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'countDocuments']) {
    schema.pre(method, async function () {
      const filter = typeof this.getFilter === 'function' ? this.getFilter() : this.getQuery();
      if (!filter.orgId && !this.getOptions().allowCrossTenant) throw new Error(`REFUSED ${method} without orgId`);
    });
  }
}

const versionSchema = new mongoose.Schema({ orgId: mongoose.Schema.Types.ObjectId, rawText: String });
versionSchema.plugin(fixedPlugin);
const Version = mongoose.model('ProbeVersion', versionSchema);

const resumeSchema = new mongoose.Schema({
  orgId: mongoose.Schema.Types.ObjectId,
  currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProbeVersion' },
});
resumeSchema.plugin(fixedPlugin);
const Resume = mongoose.model('ProbeResume', resumeSchema);

async function attempt(label, fn) {
  try {
    await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT: hook passed, reached the driver')), 1500))]);
    console.log(`${label}: completed`);
  } catch (e) {
    console.log(`${label}: ${e.message.slice(0, 100)}`);
  }
}

(async () => {
  const orgId = new mongoose.Types.ObjectId();
  const versionId = new mongoose.Types.ObjectId();
  const resume = Resume.hydrate({ _id: new mongoose.Types.ObjectId(), orgId, currentVersionId: versionId });

  await attempt('scoped find                         ', () => Version.find({ orgId }));
  await attempt('unscoped find                       ', () => Version.find({}));
  await attempt('populate (as resume.repository does)', () => Resume.populate(resume, { path: 'currentVersionId' }));
  await attempt('populate with match { orgId }       ', () => Resume.populate(resume, { path: 'currentVersionId', match: { orgId } }));
  await attempt('populate with allowCrossTenant      ', () => Resume.populate(resume, { path: 'currentVersionId', options: { allowCrossTenant: true } }));
  process.exit(0);
})();
