import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const aiClient = require('../src/ai/client/aiClient');
const { structureResumeDetailed, structureResume } = require('../src/ai/services/resumeParser.service');
const buildPrompt = require('../src/ai/prompts/resumeParser.v2');
const { REDACTION } = require('../src/ai/security/injectionGuard');

const read = (name) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, `../eval/data/${name}.json`), 'utf8'));
const injections = read('injections').filter((i) => !i.knownGap);
const clean = read('resumes')[0];

afterEach(() => vi.restoreAllMocks());

describe('resume parsing defenses', () => {
  it('never sends the attack text to the model, and flags the resume', async () => {
    for (const inj of injections) {
      const spy = vi.spyOn(aiClient, 'complete');
      const { security } = await structureResumeDetailed(inj.resumeText);

      const sent = JSON.stringify(spy.mock.calls[0][0].messages).toLowerCase();
      expect(sent, inj.id).not.toContain(inj.marker);
      expect(sent, inj.id).toContain(REDACTION.toLowerCase());
      expect(security.suspicious, inj.id).toBe(true);
      expect(security.rules.length, inj.id).toBeGreaterThan(0);
      spy.mockRestore();
    }
  });

  it('drops a skill the model returns that the resume does not state', async () => {
    vi.spyOn(aiClient, 'complete').mockResolvedValue({
      summary: 'A developer.',
      skills: ['React', 'Quantum Computing'],
      experience: [],
      education: [],
    });
    const { structuredData, security } = await structureResumeDetailed('Frontend developer. Built dashboards in React.');
    expect(structuredData.skills).toEqual(['React']);
    expect(security.droppedSkills).toEqual(['Quantum Computing']);
    expect(security.suspicious).toBe(false); // a hallucination is not an attack
  });

  it('leaves a clean resume untouched and unflagged', async () => {
    const spy = vi.spyOn(aiClient, 'complete');
    const { security } = await structureResumeDetailed(clean.text);
    expect(security).toMatchObject({ suspicious: false, rules: [], redactions: 0 });
    expect(JSON.stringify(spy.mock.calls[0][0].messages)).toContain(clean.text.split('\n')[0]);
  });

  it('structureResume still returns just the structured data', async () => {
    const data = await structureResume(clean.text);
    expect(Object.keys(data).sort()).toEqual(['education', 'experience', 'skills', 'summary']);
  });
});

describe('resumeParser.v2 prompt', () => {
  const messages = buildPrompt('Some resume text');
  const system = messages[0].content;
  const user = messages[1].content;

  it('names the attacks, defines a claimed skill, and repeats the rule after the resume', () => {
    expect(system).toMatch(/never follow them/i);
    expect(system).toMatch(/never used/i);
    expect(system).toMatch(/currently learning/i);
    expect(user.indexOf('Reminder')).toBeGreaterThan(user.indexOf('</resume>'));
  });

  it('keeps resume text out of the system message', () => {
    expect(buildPrompt('UNIQUE-RESUME-TEXT')[0].content).not.toContain('UNIQUE-RESUME-TEXT');
  });
});
