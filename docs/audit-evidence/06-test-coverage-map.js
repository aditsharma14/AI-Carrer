// Audit evidence script. Run from the repository root:  node docs/audit-evidence/06-test-coverage-map.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// Which backend source files are required (directly or via mock targets) by ANY test?
const fs = require('fs');
const path = require('path');
const B = (REPO + '/backend');

const walk = (d, o = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, o);
    else if (/\.js$/.test(e.name)) o.push(p);
  }
  return o;
};

const src = walk(`${B}/src`).map((f) => path.relative(`${B}/src`, f).replace(/\\/g, '/'));
const tests = walk(`${B}/test`).concat(walk(`${B}/eval`)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');

// Directly referenced by a test (require('../src/...') or via eval runner).
const direct = new Set(src.filter((f) => tests.includes(f.replace(/\.js$/, '')) || tests.includes(f)));

// Transitively loaded by directly-tested files (so it at least executes at import).
const transitive = new Set(direct);
const stack = [...direct];
while (stack.length) {
  const f = stack.pop();
  const text = fs.readFileSync(`${B}/src/${f}`, 'utf8');
  for (const m of text.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
    for (const c of [base + '.js', base + '/index.js', base]) {
      if (src.includes(c) && !transitive.has(c)) { transitive.add(c); stack.push(c); }
    }
  }
}

const group = (f) => f.split('/').slice(0, f.startsWith('modules/') ? 2 : 1).join('/');
const stats = {};
for (const f of src) {
  const g = group(f);
  stats[g] ||= { total: 0, direct: 0, imported: 0, none: [] };
  stats[g].total++;
  if (direct.has(f)) stats[g].direct++;
  else if (transitive.has(f)) stats[g].imported++;
  else stats[g].none.push(f);
}
console.log('area'.padEnd(22), 'files  tested-directly  only-imported  never-loaded-by-tests');
for (const [g, s] of Object.entries(stats).sort()) {
  console.log(g.padEnd(22), String(s.total).padStart(5), String(s.direct).padStart(16), String(s.imported).padStart(14), String(s.none.length).padStart(20));
}
const total = src.length;
console.log(`\nTOTAL ${total} files: ${direct.size} referenced directly by a test, ${transitive.size - direct.size} only imported, ${total - transitive.size} never loaded.`);
