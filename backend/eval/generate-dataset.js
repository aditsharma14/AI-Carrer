// Regenerates eval/data/*.json from the seed. Run:  npm run eval:data
// The generated files are committed, so every machine and CI scores the exact
// same data; a test asserts they still match this generator, so they can never
// be hand-edited by accident.
const fs = require('node:fs');
const path = require('node:path');
const { buildDataset } = require('./lib/dataset');

const SEED = 1337;
const dir = path.join(__dirname, 'data');
fs.mkdirSync(dir, { recursive: true });

const data = buildDataset(SEED);
for (const [name, value] of Object.entries(data)) {
  fs.writeFileSync(path.join(dir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}
console.log(
  `wrote ${data.resumes.length} resumes, ${data.jobs.length} jobs, ` +
    `${data.jobs.length * data.resumes.length} relevance labels, ${data.injections.length} injection cases (seed ${SEED})`
);
