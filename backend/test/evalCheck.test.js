import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const run = (...args) =>
  spawnSync(process.execPath, ['eval/run.js', '--provider', 'stub', '--embedding', 'stub', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, LOG_LEVEL: 'error' },
  });

describe('evaluation runner (stub provider)', () => {
  it('passes the check against the committed baseline', () => {
    const result = run('--check');
    expect(result.stdout).toContain('No regressions.');
    expect(result.status).toBe(0);
  }, 60000);

  it('fails the check when a metric is worse than the baseline', () => {
    const baselineFile = path.join(root, 'eval/baselines/stub__stub__stub__stub.json');
    const original = fs.readFileSync(baselineFile, 'utf8');
    const tampered = JSON.parse(original);
    tampered.metrics['parse.skillF1'] = 0.99; // pretend we used to be far better
    fs.writeFileSync(baselineFile, JSON.stringify(tampered));
    try {
      const result = run('--check');
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('REGRESSED');
    } finally {
      fs.writeFileSync(baselineFile, original);
    }
  }, 60000);

  it('refuses to check or save a partial run', () => {
    const result = run('--limit', '3', '--check');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('subset');
  }, 60000);
});
