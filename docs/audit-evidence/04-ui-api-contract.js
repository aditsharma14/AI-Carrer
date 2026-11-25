// Audit evidence script. Run from the repository root:  node docs/audit-evidence/04-ui-api-contract.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// Compare every API call in the frontend with the real backend route table.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Arguments are passed as an array: no shell, so the path is never interpreted as a command.
const table = execFileSync(process.execPath, [path.join(__dirname, '03-route-table.js')], { cwd: REPO + '/backend', encoding: 'utf8' });
const backend = [...table.matchAll(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/gm)].map((m) => ({
  method: m[1],
  re: new RegExp('^' + m[2].replace(/:[A-Za-z]+/g, '[^/]+') + '$'),
  raw: m[2],
}));

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/api\.js$|Hook|hooks\.js$|\.jsx?$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

const calls = [];
for (const f of walk((REPO + '/frontend/src'))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/axiosClient\s*\.\s*(get|post|put|patch|delete)\(\s*([`'"])([^`'"]+)\2/g)) {
    calls.push({ file: path.relative((REPO + '/frontend/src'), f).replace(/\\/g, '/'), method: m[1].toUpperCase(), url: m[3] });
  }
}

let missing = 0;
const used = new Set();
for (const c of calls) {
  const p = c.url.split('?')[0].replace(/\$\{[^}]+\}/g, 'X');
  const hit = backend.find((b) => b.method === c.method && b.re.test(p));
  if (hit) used.add(hit.raw + c.method);
  else {
    missing += 1;
    console.log(`NO BACKEND ROUTE  ${c.method} ${c.url}   (${c.file})`);
  }
}
console.log(`\n${calls.length} frontend API calls, ${missing} without a matching backend route`);
const unused = backend.filter((b) => !used.has(b.raw + b.method));
console.log(`${unused.length} of ${backend.length} backend endpoints are never called by the frontend:`);
unused.forEach((b) => console.log(`  ${b.method} ${b.raw}`));
