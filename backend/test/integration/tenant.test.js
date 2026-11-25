import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { startHarness } = require('./support/harness');
const { createUserWithOrg, findMembershipRaw } = require('./support/factories');

// ============================================================================
// TEN-01: THE TENANT-ISOLATION PLUGIN THROWS ON EVERY QUERY  (STATUS: OPEN)
// ============================================================================
// backend/src/plugins/tenantScope.plugin.js registers `schema.pre(method, function (next) {...})`.
// Mongoose 9 no longer passes `next` to pre-hooks, so every query on a
// tenant-scoped model throws "next is not a function". That includes the
// membership lookup that tenant resolution performs for every authenticated
// tenant-scoped request, so those requests answer 500 today.
//
// This file does two things, deliberately:
//
//  1. KNOWN-DEFECT tests assert the failure as it is today, including the exact
//     error, so a reader and CI can see the defect against a real database. They
//     PASS while the defect exists.
//
//  2. TARGET-BEHAVIOR tests state what must be true once tenant isolation works.
//     They are written with `it.fails`, which makes the suite pass while the
//     behavior is broken and FAIL as soon as it starts working. That failure is
//     the signal to complete the M1.1 transition below. They are never skipped
//     and their assertions are not weakened.
//
// TRANSITION REQUIRED IN M1.1 (the fix to tenantScope.plugin.js):
//   a. delete the whole "KNOWN DEFECT" describe block (it asserts the bug);
//   b. change every `it.fails(` in "TARGET BEHAVIOR" to `it(`;
//   c. the suite must then pass with the SAME assertions, through real tenant
//      isolation. The integration job must be green on main before TEN-01 may
//      be recorded as closed.
// Nothing in this file closes TEN-01. TEN-02 (populate) is not tested here.
// ============================================================================

const PASSWORD = 'correct-horse-battery';

describe('tenant resolution against a real database', () => {
  let harness;
  let Membership;
  let User;

  beforeAll(async () => {
    harness = await startHarness();
    Membership = require('../../src/modules/identity/membership.model');
    User = require('../../src/modules/identity/user.model');
  });
  afterAll(async () => {
    await harness.stop();
  });
  beforeEach(async () => {
    await harness.reset();
  });

  async function loginAs(user) {
    const res = await harness.request('POST', '/auth/login', { body: { email: user.email, password: PASSWORD } });
    expect(res.status).toBe(200);
    return res.body.accessToken;
  }

  // Captures what the server writes to stderr during a callback, so a test can
  // assert the real cause of a 500 (the response body hides it by design).
  async function captureServerLog(fn) {
    const lines = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    try {
      return { result: await fn(), log: lines.join('') };
    } finally {
      spy.mockRestore();
    }
  }

  it('canary: the seeded membership exists and is active (read with the native driver)', async () => {
    const { user, organization } = await createUserWithOrg(harness.mongoose);
    const raw = await findMembershipRaw(harness.mongoose, { userId: user.id });

    expect(raw).toMatchObject({ role: 'org_admin', status: 'active' });
    expect(String(raw.orgId)).toBe(String(organization.id));
  });

  describe('KNOWN DEFECT TEN-01 (open): these tests assert the bug as it is today', () => {
    it('a scoped query with orgId throws "next is not a function"', async () => {
      const { user, organization } = await createUserWithOrg(harness.mongoose);

      await expect(Membership.findOne({ orgId: organization.id, userId: user.id }).exec()).rejects.toThrow(
        /next is not a function/
      );
    });

    it('the explicit opt-out { allowCrossTenant: true } throws too', async () => {
      const { user } = await createUserWithOrg(harness.mongoose);

      await expect(
        Membership.find({ userId: user.id, status: 'active' }, null, { allowCrossTenant: true }).exec()
      ).rejects.toThrow(/next is not a function/);
    });

    it('control: a model WITHOUT the plugin (User) queries normally against the same database', async () => {
      const { user } = await createUserWithOrg(harness.mongoose);

      const found = await User.findOne({ email: user.email });
      expect(found).toBeTruthy();
    });

    it('tenant resolution answers 500 and the server log names the cause', async () => {
      const { user } = await createUserWithOrg(harness.mongoose, { password: PASSWORD });
      const token = await loginAs(user);

      const { result: res, log } = await captureServerLog(() => harness.request('GET', '/organizations/settings', { token }));

      expect(res.status).toBe(500);
      expect(res.body.code).toBe('INTERNAL');
      expect(res.body.message).toBe('Internal server error'); // 5xx text is hidden from clients on purpose
      expect(log).toContain('next is not a function');
      expect(log).toContain(res.body.requestId); // the logged failure belongs to this request
    });

    it('listing my memberships answers 500 for the same reason', async () => {
      const { user } = await createUserWithOrg(harness.mongoose, { password: PASSWORD });
      const token = await loginAs(user);

      const { result: res, log } = await captureServerLog(() =>
        harness.request('GET', '/organizations/my-memberships', { token })
      );

      expect(res.status).toBe(500);
      expect(log).toContain('next is not a function');
    });
  });

  // `it.fails` = "this must currently fail". When the defect is fixed these start
  // passing, `it.fails` then reports a failure, and M1.1 converts them to `it`.
  describe('TARGET BEHAVIOR (it.fails until M1.1 fixes TEN-01)', () => {
    it.fails('resolves the caller\'s tenant: settings are returned for the caller\'s own organization', async () => {
      const { user, organization } = await createUserWithOrg(harness.mongoose, { password: PASSWORD });
      const token = await loginAs(user);

      const res = await harness.request('GET', '/organizations/settings', { token });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(organization.name);
    });

    it.fails('lists the caller\'s memberships with the organization name and role', async () => {
      const { user, organization } = await createUserWithOrg(harness.mongoose, { password: PASSWORD });
      const token = await loginAs(user);

      const res = await harness.request('GET', '/organizations/my-memberships', { token });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ orgName: organization.name, role: 'org_admin' });
    });

    it.fails('isolates tenants: a user cannot act in an organization they do not belong to', async () => {
      const a = await createUserWithOrg(harness.mongoose, { password: PASSWORD });
      const b = await createUserWithOrg(harness.mongoose, { password: PASSWORD });
      const tokenB = await loginAs(b.user);

      const res = await harness.request('GET', '/organizations/settings', { token: tokenB, orgId: a.organization.id });

      expect(res.status).toBe(403);
    });

    it.fails('isolates tenants: a user\'s own organization is returned, never another tenant\'s', async () => {
      const a = await createUserWithOrg(harness.mongoose, { password: PASSWORD });
      const b = await createUserWithOrg(harness.mongoose, { password: PASSWORD });
      const tokenB = await loginAs(b.user);

      const res = await harness.request('GET', '/organizations/settings', { token: tokenB });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(b.organization.name);
      expect(res.body.name).not.toBe(a.organization.name);
    });
  });
});
