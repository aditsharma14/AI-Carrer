import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { buildDataset } = require('../eval/lib/dataset');
const { SKILLS, canonicalSkill } = require('../eval/lib/taxonomy');

const dataDir = path.join(import.meta.dirname, '../eval/data');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8'));
const data = {
  resumes: read('resumes'),
  jobs: read('jobs'),
  relevance: read('relevance'),
  injections: read('injections'),
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
// Whole-word, CASE-SENSITIVE match of an alias exactly as written in the
// taxonomy ("REST" is a skill; "rest of the team" is not).
const aliasRegex = (alias) => new RegExp(`(?<![A-Za-z0-9+#])${escape(alias)}(?![A-Za-z0-9+#])`);

function skillsMentioned(text) {
  const found = new Set();
  for (const [canonical, aliases] of Object.entries(SKILLS)) {
    if ([canonical, ...aliases].some((a) => aliasRegex(a).test(text))) found.add(canonical);
  }
  return found;
}

describe('evaluation dataset', () => {
  it('is deterministic, and the committed files are exactly what the generator produces', () => {
    expect(buildDataset(1337)).toEqual(data);
  });

  it('has enough variety to be a meaningful test', () => {
    expect(data.resumes.length).toBeGreaterThanOrEqual(50);
    expect(new Set(data.resumes.map((r) => r.style)).size).toBe(4);
    expect(data.resumes.filter((r) => r.gold.hardNegatives.length > 0).length).toBeGreaterThanOrEqual(20);
    expect(data.resumes.some((r) => r.gold.skills.length === 0)).toBe(true); // non-technical resumes exist
    expect(new Set(data.resumes.map((r) => r.id)).size).toBe(data.resumes.length);
  });

  it('every claimed skill is actually stated in the resume text', () => {
    for (const r of data.resumes) {
      const mentioned = skillsMentioned(r.text);
      for (const skill of r.gold.skills) {
        expect(mentioned.has(skill), `${r.id} (${r.style}) never states ${skill}`).toBe(true);
      }
    }
  });

  it('no skill appears in a resume without a label (so a correct model is never penalised)', () => {
    for (const r of data.resumes) {
      const labeled = new Set([...r.gold.skills, ...r.gold.hardNegatives]);
      for (const skill of skillsMentioned(r.text)) {
        expect(labeled.has(skill), `${r.id} (${r.style}) mentions unlabeled skill ${skill}`).toBe(true);
      }
    }
  });

  it('hard negatives are mentioned only in a non-claiming sentence', () => {
    const negative = /Currently learning|Have never worked with|Interested in moving into/;
    for (const r of data.resumes) {
      for (const skill of r.gold.hardNegatives) {
        const lines = r.text.split(/(?<=\.)\s+|\n/).filter((l) => skillsMentioned(l).has(skill));
        expect(lines.length, `${r.id} ${skill}`).toBeGreaterThan(0);
        for (const line of lines) expect(negative.test(line), `${r.id} ${skill}: "${line}"`).toBe(true);
        expect(r.gold.skills).not.toContain(skill);
      }
    }
  });

  it('gold experience and education appear in the text', () => {
    for (const r of data.resumes) {
      expect(r.gold.experience.length).toBeGreaterThan(0);
      for (const e of r.gold.experience) {
        expect(r.text, `${r.id} company`).toContain(e.company);
        expect(r.text, `${r.id} title`).toContain(e.title);
      }
      for (const ed of r.gold.education) expect(r.text).toContain(ed.school);
    }
  });

  it('jobs state every required skill, and relevance covers every pair', () => {
    for (const job of data.jobs) {
      const mentioned = skillsMentioned(job.description);
      for (const skill of job.requiredSkills) expect(mentioned.has(skill), `${job.id} ${skill}`).toBe(true);
      expect(Object.keys(data.relevance[job.id])).toHaveLength(data.resumes.length);
    }
  });

  it('every job has relevant candidates to find (otherwise ranking metrics are meaningless)', () => {
    for (const job of data.jobs) {
      const rels = Object.values(data.relevance[job.id]);
      expect(rels.filter((v) => v >= 2).length, `${job.id} good fits`).toBeGreaterThanOrEqual(2);
      expect(rels.filter((v) => v === 0).length, `${job.id} non-fits`).toBeGreaterThanOrEqual(10);
    }
  });

  it('decoys name every required skill of their job but claim none, and fit no job', () => {
    const decoys = data.resumes.filter((r) => r.decoyFor);
    expect(decoys.length).toBeGreaterThanOrEqual(10);
    for (const d of decoys) {
      const job = data.jobs.find((j) => j.id === d.decoyFor);
      expect([...d.gold.hardNegatives].sort()).toEqual([...job.requiredSkills].sort());
      expect(d.gold.skills).toEqual([]);
      for (const skill of job.requiredSkills) expect(skillsMentioned(d.text).has(skill), `${d.id} ${skill}`).toBe(true);
      for (const j of data.jobs) expect(data.relevance[j.id][d.id], `${d.id} vs ${j.id}`).toBe(0);
    }
  });

  it('injection cases contain their marker, and the clean resume does not', () => {
    for (const inj of data.injections) {
      expect(inj.resumeText.toLowerCase()).toContain(inj.marker);
      expect(inj.resumeText.slice(0, inj.resumeText.length - inj.payload.length).toLowerCase()).not.toContain(inj.marker);
    }
  });
});

describe('taxonomy', () => {
  it('maps aliases to one canonical name', () => {
    expect(canonicalSkill('JS')).toBe('javascript');
    expect(canonicalSkill('Postgres')).toBe('postgresql');
    expect(canonicalSkill('k8s')).toBe('kubernetes');
    expect(canonicalSkill('Node')).toBe('node.js');
    expect(canonicalSkill('Something New')).toBe('somethingnew'); // unknown passes through normalised
  });
});
