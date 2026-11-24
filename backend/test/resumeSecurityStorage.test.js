import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ResumeVersion = require('../src/modules/resumes/resumeVersion.model');
const resumeRepository = require('../src/modules/resumes/resume.repository');

const ids = { orgId: '64b000000000000000000001', resumeId: '64b000000000000000000002' };

afterEach(() => vi.restoreAllMocks());

describe('resume version security report', () => {
  it('defaults to clean, so versions created before the field existed read as unflagged', () => {
    const version = new ResumeVersion({ ...ids, rawText: 'x' });
    expect(version.security.suspicious).toBe(false);
    expect(version.security.rules).toEqual([]);
    expect(version.security.redactions).toBe(0);
    expect(version.validateSync()).toBeUndefined();
  });

  it('stores what the defenses found', () => {
    const version = new ResumeVersion({
      ...ids,
      security: { suspicious: true, rules: ['override-instructions'], redactions: 2, droppedSkills: ['Quantum Computing'] },
    });
    expect(version.validateSync()).toBeUndefined();
    expect(version.security.rules).toEqual(['override-instructions']);
    expect(version.security.droppedSkills).toEqual(['Quantum Computing']);
  });

  it('passes the report through when a version is created', async () => {
    const create = vi.spyOn(ResumeVersion, 'create').mockResolvedValue({});
    const security = { suspicious: true, rules: ['tag-breakout'], redactions: 1, droppedSkills: [] };
    await resumeRepository.createVersion(ids.orgId, ids.resumeId, { rawText: 'r', structuredData: { skills: [] }, security });
    expect(create).toHaveBeenCalledWith({ ...ids, rawText: 'r', structuredData: { skills: [] }, security });
  });
});
