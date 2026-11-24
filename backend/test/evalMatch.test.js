import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { runMatch } = require('../eval/suites/match');

const dir = path.join(import.meta.dirname, '../eval/data');
const read = (n) => JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));
const resumes = read('resumes');
const jobs = read('jobs');
const relevance = read('relevance');

// A scorer that works for every job except the ones listed.
const scorer = (failFor = []) => async ({ jobDescription, applications }) => {
  if (failFor.some((j) => jobDescription === j.description)) {
    throw Object.assign(new Error('down'), { code: 'unreachable' });
  }
  return applications.map((a, i) => ({ applicationId: a.applicationId, similarity: ((i * 7) % 11) / 11 }));
};

describe('runMatch when some jobs fail', () => {
  it('averages the baselines over the same jobs as the system, so the comparison is fair', async () => {
    const subset = jobs.slice(0, 3);
    const withFailure = await runMatch({ resumes, jobs: subset, relevance, scoreApplications: scorer([subset[1]]) });
    const withoutThatJob = await runMatch({ resumes, jobs: [subset[0], subset[2]], relevance, scoreApplications: scorer() });

    expect(withFailure.metrics.failedJobs).toBe(1);
    expect(withFailure.errorCodes).toEqual({ unreachable: 1 });
    expect(withFailure.baselines).toEqual(withoutThatJob.baselines);
    expect(withFailure.metrics.ndcg10).toBeCloseTo(withoutThatJob.metrics.ndcg10, 10);
  });

  it('reports every job failing without throwing', async () => {
    const result = await runMatch({ resumes, jobs: jobs.slice(0, 2), relevance, scoreApplications: scorer(jobs.slice(0, 2)) });
    expect(result.metrics.failedJobs).toBe(2);
    expect(result.metrics.ndcg10).toBe(0);
  });
});
