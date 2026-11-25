// Audit evidence script. Run from the repository root:  node docs/audit-evidence/10-governance-doc-check.js
// Read-only: it never modifies the repository. Needs Node 20+ and `npm install` in backend/ (and frontend/ for 04).
const REPO = require('node:path').resolve(__dirname, '../..').split(require('node:path').sep).join('/');
// Mechanical consistency checks across the five governance documents.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = REPO;
const DOCS = {
  audit: 'docs/STAFF_ENGINEERING_AUDIT.md',
  roadmap: 'docs/STAFF_ENGINEERING_ROADMAP.md',
  progress: 'docs/STAFF_TRANSFORMATION_PROGRESS.md',
  debt: 'docs/TECHNICAL_DEBT.md',
  risk: 'docs/RISK_REGISTER.md',
};
const text = Object.fromEntries(Object.entries(DOCS).map(([k, p]) => [k, fs.readFileSync(path.join(ROOT, p), 'utf8')]));
const ID_RE = /\b(?:TEN|TEST|API|PROD|SEC|DATA|JOB|OPS|AUTH|RBAC|AUD|AI|RAG|AGT|PERF|FE|OBS|DOC|DEBT|DEP)-\d{2}\b/g;

// ---- 1. markdown links resolve -------------------------------------------------
console.log('== 1. Relative markdown links');
let brokenLinks = 0;
for (const [k, p] of Object.entries(DOCS)) {
  const dir = path.dirname(path.join(ROOT, p));
  for (const m of text[k].matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:)/.test(target)) continue;
    const [file, anchor] = target.split('#');
    const resolved = file ? path.resolve(dir, file) : path.join(ROOT, p);
    if (!fs.existsSync(resolved)) { console.log(`  BROKEN  ${p} -> ${target}`); brokenLinks++; continue; }
    if (anchor && resolved.endsWith('.md')) {
      const slugs = [...fs.readFileSync(resolved, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) =>
        h[1].toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'));
      if (!slugs.includes(anchor)) { console.log(`  BAD ANCHOR  ${p} -> ${target}`); brokenLinks++; }
    }
  }
}
console.log(`  ${brokenLinks} broken`);

// ---- 2. cited file:line references ---------------------------------------------
console.log('\n== 2. Cited file:line references (audit)');
const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const byBase = {};
for (const f of tracked) (byBase[path.basename(f)] ||= []).push(f);
let badRefs = 0;
const seen = new Set();
for (const m of text.audit.matchAll(/`?((?:[\w.-]+\/)*[\w.-]+\.(?:js|jsx|json|conf|yml|yaml|md))`?:(\d+)(?:-(\d+))?/g)) {
  const [, ref, a, b] = m;
  const key = `${ref}:${a}${b ? '-' + b : ''}`;
  if (seen.has(key)) continue; seen.add(key);
  const candidates = tracked.filter((f) => f === ref || f.endsWith('/' + ref));
  if (candidates.length === 0) { console.log(`  NO FILE   ${key}`); badRefs++; continue; }
  const file = candidates[0];
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
  const end = Number(b || a);
  if (end > lines.length) { console.log(`  OUT OF RANGE ${key} (${file} has ${lines.length} lines)`); badRefs++; }
  else console.log(`  ok  ${key.padEnd(46)} ${lines[Number(a) - 1].trim().slice(0, 78)}`);
}
console.log(`  ${badRefs} unresolved`);

// ---- 3. finding IDs ---------------------------------------------------------------
console.log('\n== 3. Finding ID integrity');
const findings = {};
for (const m of text.audit.matchAll(/^#### (\S+) · (P\d) · (.+)$/gm)) findings[m[1]] = { sev: m[2], title: m[3] };
console.log(`  defined: ${Object.keys(findings).length}  (P0 ${Object.values(findings).filter((f) => f.sev === 'P0').length}, P1 ${Object.values(findings).filter((f) => f.sev === 'P1').length}, P2 ${Object.values(findings).filter((f) => f.sev === 'P2').length}, P3 ${Object.values(findings).filter((f) => f.sev === 'P3').length})`);
for (const [k, t] of Object.entries(text)) {
  const used = new Set(t.match(ID_RE) || []);
  const invalid = [...used].filter((id) => !findings[id]);
  if (invalid.length) console.log(`  ${k}: references undefined IDs ${invalid.join(', ')}`);
}

// ---- 4. traceability ------------------------------------------------------------
console.log('\n== 4. Traceability');
const roadmapIds = new Set(text.roadmap.match(ID_RE) || []);
const debtRows = [];
for (const m of text.debt.matchAll(/^\| (TD-\d+) \|(.+)$/gm)) if (!debtRows.some((d) => d.id === m[1])) debtRows.push({ id: m[1], row: m[2], ids: m[2].match(ID_RE) || [] }); // first row per ID (split-guidance rows repeat IDs)
const roadmapTd = new Set(text.roadmap.match(/TD-\d+/g) || []);
const riskRows = [...text.risk.matchAll(/^\| \*{0,2}(R-\d+)\*{0,2} \|(.+)$/gm)].map((m) => ({ id: m[1], row: m[2], ids: m[2].match(ID_RE) || [] }));
const debtIds = new Set(debtRows.flatMap((d) => d.ids));
const riskIds = new Set(riskRows.flatMap((r) => r.ids));

const noRoadmap = Object.keys(findings).filter((id) => !roadmapIds.has(id));
console.log(`  findings NOT mentioned in the roadmap (${noRoadmap.length}): ${noRoadmap.join(', ') || 'none'}`);
const noDebtOrRisk = Object.keys(findings).filter((id) => !debtIds.has(id) && !riskIds.has(id));
console.log(`  findings with neither a debt entry nor a risk (${noDebtOrRisk.length}): ${noDebtOrRisk.join(', ') || 'none'}`);
console.log(`  debt entries: ${debtRows.length}; without any finding ID: ${debtRows.filter((d) => d.ids.length === 0).map((d) => d.id).join(', ') || 'none'}`);
const debtNoRoadmap = debtRows.filter((d) => !roadmapTd.has(d.id) && !d.ids.some((id) => roadmapIds.has(id)) && !/Phase \d|roadmap/i.test(d.row));
console.log(`  debt entries with no milestone placement in the roadmap (by TD id, finding or phase): ${debtNoRoadmap.map((d) => d.id).join(', ') || 'none'}`);
const tdUnplaced = debtRows.filter((d) => !roadmapTd.has(d.id));
console.log(`  debt entries not named in the roadmap placement table: ${tdUnplaced.map((d) => d.id).join(', ') || 'none'}`);
console.log(`  risks: ${riskRows.length}; without any finding ID: ${riskRows.filter((r) => r.ids.length === 0).map((r) => r.id).join(', ') || 'none'}`);

// ---- 5. risk scoring --------------------------------------------------------------
console.log('\n== 5. Risk scoring (Score = L x I; Critical 20-25, High 12-19, Medium 6-11, Low 1-5)');
const band = (s) => (s >= 20 ? 'Critical' : s >= 12 ? 'High' : s >= 6 ? 'Medium' : 'Low');
let scoreErrors = 0, evaluated = 0;
for (const r of riskRows) {
  const cells = r.row.split('|').map((c) => c.trim());
  // risk text | L | I | score | ...
  const nums = cells.filter((c) => /^\d$/.test(c));
  const scoreCell = cells.find((c) => /^\**\d+\**\s*(Critical|High|Medium|Low)?\**$/.test(c) && !/^\d$/.test(c));
  if (nums.length < 2 || !scoreCell) continue;
  const [L, I] = nums.map(Number);
  evaluated++;
  const stated = Number(scoreCell.match(/\d+/)[0]);
  const statedBand = (scoreCell.match(/Critical|High|Medium|Low/) || [''])[0];
  const ok = stated === L * I && (!statedBand || statedBand === band(L * I));
  if (!ok) { console.log(`  MISMATCH ${r.id}: L${L} x I${I} = ${L * I} (${band(L * I)}), stated ${scoreCell}`); scoreErrors++; }
}
console.log(`  ${scoreErrors} scoring errors; ${evaluated} of ${riskRows.length} risk rows evaluated (rows in the closure-plan table carry no L/I and are skipped)`);
