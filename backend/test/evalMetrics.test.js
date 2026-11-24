import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const m = require('../eval/lib/metrics');

describe('skill metrics', () => {
  it('maps aliases before comparing and ignores duplicates', () => {
    const c = m.skillCounts(['JS', 'javascript', 'Postgres', 'Fortran'], ['javascript', 'postgresql', 'react']);
    expect(c).toMatchObject({ tp: 2, fp: 1, fn: 1 });
  });

  it('micro-averages by pooling counts', () => {
    const r = m.microPRF([
      { tp: 8, fp: 2, fn: 0 },
      { tp: 1, fp: 0, fn: 3 },
    ]);
    expect(r.precision).toBeCloseTo(9 / 11, 6);
    expect(r.recall).toBeCloseTo(9 / 12, 6);
    expect(r.f1).toBeCloseTo((2 * (9 / 11) * (9 / 12)) / (9 / 11 + 9 / 12), 6);
  });

  it('scores an empty prediction on an empty gold set as perfect, but not when skills were missed', () => {
    expect(m.microPRF([{ tp: 0, fp: 0, fn: 0 }])).toMatchObject({ precision: 1, recall: 1, f1: 1 });
    expect(m.microPRF([{ tp: 0, fp: 0, fn: 4 }])).toMatchObject({ recall: 0, f1: 0 });
  });

  it('counts how often a "do not claim" skill was claimed', () => {
    const counts = [
      m.skillCounts(['Terraform', 'React'], ['react'], ['terraform', 'rust']), // fell for 1 of 2
      m.skillCounts(['React'], ['react'], []),
    ];
    expect(m.trapFalsePositiveRate(counts)).toBeCloseTo(0.5, 6);
    expect(m.trapFalsePositiveRate([m.skillCounts([], [], [])])).toBe(0);
  });

  it('matches company and school names loosely', () => {
    expect(m.entityRecall(['Harbor Payments Pvt. Ltd.', 'acme'], ['Harbor Payments', 'Northwind Labs'])).toEqual({ found: 1, total: 2 });
    expect(m.entityRecall([], ['x'])).toEqual({ found: 0, total: 1 });
    expect(m.entityRecall(['x'], [])).toEqual({ found: 0, total: 0 });
  });
});

describe('ranking metrics', () => {
  it('computes NDCG against the ideal ordering (hand-checked)', () => {
    // ranked grades [3,2,0,1]; ideal [3,2,1,0]
    // DCG   = 7 + 3/log2(3) + 0 + 1/log2(5) = 9.32347
    // IDCG  = 7 + 3/log2(3) + 1/log2(4)     = 9.39279
    expect(m.ndcg([3, 2, 0, 1], 4)).toBeCloseTo(0.99262, 4);
    expect(m.ndcg([3, 2, 1, 0], 4)).toBe(1);
  });

  it('penalises a good candidate buried at the bottom, and truncates at k', () => {
    expect(m.ndcg([0, 0, 0, 3], 4)).toBeCloseTo(7 / Math.log2(5) / 7, 6);
    expect(m.ndcg([0, 0, 0, 3], 3)).toBeCloseTo(0, 6); // cut off before the good one
  });

  it('returns null when nothing is relevant, so the job is skipped not scored zero', () => {
    expect(m.ndcg([0, 0, 0], 3)).toBeNull();
  });

  it('reciprocal rank uses the first real fit (grade >= 2)', () => {
    expect(m.reciprocalRank([0, 1, 2, 3])).toBeCloseTo(1 / 3, 6);
    expect(m.reciprocalRank([3, 0])).toBe(1);
    expect(m.reciprocalRank([0, 1, 1])).toBe(0);
  });

  it('precision@k counts real fits in the top k', () => {
    expect(m.precisionAtK([3, 0, 2, 0, 1], 5)).toBeCloseTo(2 / 5, 6);
    expect(m.precisionAtK([3, 3], 5)).toBeCloseTo(2 / 5, 6); // fewer than k candidates still divides by k
  });

  it('rankBy sorts by score descending with a deterministic tie-break', () => {
    const items = [{ id: 'b', s: 1 }, { id: 'a', s: 1 }, { id: 'c', s: 2 }];
    expect(m.rankBy(items, (i) => i.s).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('statistics', () => {
  it('mean and percentile', () => {
    expect(m.mean([1, 2, 3, 4])).toBe(2.5);
    expect(m.mean([])).toBe(0);
    const xs = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(m.percentile(xs, 50)).toBe(50);
    expect(m.percentile(xs, 95)).toBe(95);
    expect(m.percentile([], 95)).toBe(0);
    expect(m.percentile([7], 95)).toBe(7);
  });
});
