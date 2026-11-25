#!/usr/bin/env bash
# Runs the REAL tenantScope plugin against a chosen Mongoose version, in a throwaway directory.
# Needs network access (it installs that version of mongoose). The repository is not modified.
#   bash docs/audit-evidence/mongoose-version-bisect.sh 9.7.2
#   bash docs/audit-evidence/mongoose-version-bisect.sh 9.12.3
set -euo pipefail
VERSION="${1:?usage: mongoose-version-bisect.sh <mongoose-version>}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT
cd "$DIR"
echo '{"name":"probe","version":"1.0.0"}' > package.json
npm install "mongoose@${VERSION}" --no-audit --no-fund --silent >/dev/null 2>&1
PLUGIN="$REPO/backend/src/plugins/tenantScope.plugin.js" node -e "
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const s = new mongoose.Schema({ orgId: mongoose.Schema.Types.ObjectId });
s.plugin(require(process.env.PLUGIN));
const M = mongoose.model('P', s);
const run = async (label, q) => { try { await Promise.race([q(), new Promise((_, r) => setTimeout(() => r(new Error('TIMEOUT (hook passed, reached the driver)')), 1000))]); return label + 'completed'; } catch (e) { return label + e.message.slice(0, 80); } };
(async () => {
  const orgId = new mongoose.Types.ObjectId();
  console.log(mongoose.version.padEnd(8), await run('scoped: ', () => M.find({ orgId })), '|', await run('unscoped: ', () => M.find({})));
  process.exit(0);
})();"
