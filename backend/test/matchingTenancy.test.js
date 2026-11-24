import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MatchResult = require('../src/modules/matching/matchResult.model');
const matchingRepository = require('../src/modules/matching/matching.repository');

afterEach(() => vi.restoreAllMocks());

// bulkWrite() skips Mongoose query middleware, so tenantScope.plugin.js cannot
// protect it. The only protection is that every operation names its tenant, so
// that is what is checked here.
function captureBulkOps() {
  const bulk = vi.spyOn(MatchResult, 'bulkWrite').mockResolvedValue({});
  vi.spyOn(MatchResult, 'find').mockReturnValue({ sort: () => [] });
  return () => bulk.mock.calls.flatMap(([ops]) => ops);
}

describe('bulk writes stay inside one tenant', () => {
  const orgId = '64b000000000000000000001';
  const jobId = '64b000000000000000000002';

  it('upsertMany filters on orgId, so it can never match another tenant\'s document', async () => {
    const ops = captureBulkOps();
    await matchingRepository.upsertMany(orgId, jobId, [
      { applicationId: 'a1', score: 90, matchedSkills: [], gapSkills: [] },
      { applicationId: 'a2', score: 70, matchedSkills: [], gapSkills: [] },
    ]);
    expect(ops()).toHaveLength(2);
    for (const op of ops()) {
      expect(op.updateOne.filter.orgId).toBe(orgId);
      expect(op.updateOne.update.$set.orgId).toBe(orgId);
      expect(op.updateOne.upsert).toBe(true);
    }
  });

  it('setRanks filters on orgId', async () => {
    const ops = captureBulkOps();
    await matchingRepository.setRanks(orgId, jobId, ['a1', 'a2', 'a3']);
    expect(ops()).toHaveLength(3);
    for (const op of ops()) expect(op.updateOne.filter).toMatchObject({ orgId, jobId });
    expect(ops().map((op) => op.updateOne.update.$set.rank)).toEqual([1, 2, 3]);
  });

  it('does nothing for an empty batch', async () => {
    const bulk = vi.spyOn(MatchResult, 'bulkWrite').mockResolvedValue({});
    await matchingRepository.upsertMany(orgId, jobId, []);
    await matchingRepository.setRanks(orgId, jobId, []);
    expect(bulk).not.toHaveBeenCalled();
  });
});
