import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { groundSkills, isSupported } = require('../src/ai/security/grounding');

const TEXT = 'Built APIs with Node, Express and Postgres. Deployed on K8s. Wrote C++ and C# tools. Strong in JS.';

describe('skill grounding', () => {
  it('keeps skills the text states, under any alias', () => {
    const { kept, dropped } = groundSkills(['Node.js', 'PostgreSQL', 'Kubernetes', 'JavaScript', 'Express'], TEXT);
    expect(kept).toEqual(['Node.js', 'PostgreSQL', 'Kubernetes', 'JavaScript', 'Express']);
    expect(dropped).toEqual([]);
  });

  it('drops a skill the text never states, such as one an injected instruction asked for', () => {
    const { kept, dropped } = groundSkills(['Node.js', 'Quantum Computing', 'Time Travel'], TEXT);
    expect(kept).toEqual(['Node.js']);
    expect(dropped).toEqual(['Quantum Computing', 'Time Travel']);
  });

  it('requires a literal mention for skills outside the taxonomy, with symbols handled', () => {
    expect(isSupported('C++', TEXT)).toBe(true);
    expect(isSupported('C#', TEXT)).toBe(true);
    expect(isSupported('Fortran', TEXT)).toBe(false);
  });

  it('matches whole words only, so a substring does not count', () => {
    expect(isSupported('Java', 'Wrote JavaScript services.')).toBe(false);
    expect(isSupported('Go', 'Mongo and Django experience.')).toBe(false);
    expect(isSupported('JavaScript', 'Wrote JavaScript services.')).toBe(true);
  });

  it('is case-insensitive and removes duplicates, including alias duplicates', () => {
    const { kept } = groundSkills(['node.js', 'NodeJS', 'express', 'EXPRESS'], 'node and express');
    expect(kept).toEqual(['node.js', 'express']);
  });

  it('handles empty input', () => {
    expect(groundSkills(undefined, TEXT)).toEqual({ kept: [], dropped: [] });
    expect(groundSkills([], '')).toEqual({ kept: [], dropped: [] });
    expect(groundSkills(['', '  '], TEXT)).toEqual({ kept: [], dropped: [] });
  });
});
