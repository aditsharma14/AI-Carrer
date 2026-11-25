// Audit evidence script. Run from the repository root:  node docs/audit-evidence/05-import-graph.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// Static import graph: which source files are never reached from the entry points?
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

function resolveImport(from, spec, files) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const c of [base, base + '.js', base + '.jsx', path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
    if (files.has(c)) return c;
  }
  return null;
}

function reach(root, entries, test) {
  const all = walk(root).filter((f) => !test(f));
  const files = new Set(all.map((f) => path.resolve(f)));
  const seen = new Set();
  const stack = entries.map((e) => path.resolve(e));
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !files.has(f)) continue;
    seen.add(f);
    const src = fs.readFileSync(f, 'utf8');
    const specs = [
      ...[...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
      ...[...src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
    ];
    for (const s of specs) {
      const r = resolveImport(f, s, files);
      if (r) stack.push(r);
    }
  }
  return [...files].filter((f) => !seen.has(f)).map((f) => path.relative(root, f).replace(/\\/g, '/'));
}

const B = (REPO + '/backend/src');
const backendDead = reach(B, [`${B}/server.js`, `${B}/worker.js`], () => false);
console.log('BACKEND files unreachable from server.js / worker.js:', backendDead.length);
backendDead.forEach((f) => console.log('  ', f));

const F = (REPO + '/frontend/src');
const frontendDead = reach(F, [`${F}/main.jsx`], (f) => /\.test\.(js|jsx)$/.test(f) || f.includes('/test/'));
console.log('\nFRONTEND files unreachable from main.jsx:', frontendDead.length);
frontendDead.forEach((f) => console.log('  ', f));
