import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { startHarness } = require('./support/harness');
const { createUser, DEFAULT_PASSWORD } = require('./support/factories');

const signupBody = (overrides = {}) => ({
  name: 'Ada Lovelace',
  email: 'ada@example.test',
  password: 'a-long-enough-password',
  organizationName: 'Analytical Engines Ltd',
  role: 'org_admin',
  ...overrides,
});

// Signup, login and token handling over real HTTP against a real database.
// None of these paths run a tenant-scoped Mongoose query (User is not
// tenant-scoped), so they pass today; the tenant-scoped paths are in
// tenant.test.js, where TEN-01 is demonstrated.
describe('signup, login and session over real HTTP', () => {
  let harness;
  beforeAll(async () => {
    harness = await startHarness();
  });
  afterAll(async () => {
    await harness.stop();
  });
  beforeEach(async () => {
    await harness.reset();
  });

  it('signup creates the user, an organization and an active membership, and returns tokens', async () => {
    const res = await harness.request('POST', '/auth/signup', { body: signupBody() });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.test' });
    expect(res.body.accessToken).toEqual(expect.any(String));
    // The refresh token travels only as an httpOnly cookie, never in the body.
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.cookies.join(';')).toMatch(/refreshToken=.+HttpOnly/i);

    // Read back with the native driver, independent of the code under test.
    const db = harness.mongoose.connection;
    const user = await db.collection('users').findOne({ email: 'ada@example.test' });
    expect(user).toBeTruthy();
    expect(user.passwordHash).not.toContain('a-long-enough-password');
    const organization = await db.collection('organizations').findOne({ name: 'Analytical Engines Ltd' });
    expect(organization).toBeTruthy();
    const membership = await db.collection('memberships').findOne({ userId: user._id });
    expect(membership).toMatchObject({ role: 'org_admin', status: 'active' });
    expect(String(membership.orgId)).toBe(String(organization._id));
  });

  it('rejects a duplicate email with 409 and does not create a second user', async () => {
    await harness.request('POST', '/auth/signup', { body: signupBody() });
    const res = await harness.request('POST', '/auth/signup', { body: signupBody({ organizationName: 'Other Co' }) });

    expect(res.status).toBe(409);
    expect(await harness.mongoose.connection.collection('users').countDocuments({ email: 'ada@example.test' })).toBe(1);
  });

  it('rejects an invalid signup body with 400', async () => {
    const res = await harness.request('POST', '/auth/signup', { body: signupBody({ password: 'short', role: 'admin' }) });
    expect(res.status).toBe(400);
  });

  it('login returns an access token for correct credentials', async () => {
    const seeded = await createUser(harness.mongoose);
    const res = await harness.request('POST', '/auth/login', { body: { email: seeded.email, password: DEFAULT_PASSWORD } });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(seeded.email);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.cookies.join(';')).toMatch(/refreshToken=/);
  });

  it('login rejects a wrong password and an unknown email with the same 401', async () => {
    const seeded = await createUser(harness.mongoose);
    const wrongPassword = await harness.request('POST', '/auth/login', { body: { email: seeded.email, password: 'not-the-password' } });
    const unknownEmail = await harness.request('POST', '/auth/login', { body: { email: 'nobody@example.test', password: 'whatever-1' } });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('GET /auth/me returns the user for a valid token and 401 without one', async () => {
    const signup = await harness.request('POST', '/auth/signup', { body: signupBody() });

    const me = await harness.request('GET', '/auth/me', { token: signup.body.accessToken });
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('ada@example.test');

    const anonymous = await harness.request('GET', '/auth/me');
    expect(anonymous.status).toBe(401);
  });

  it('refresh rotates the token: the old refresh cookie stops working', async () => {
    const signup = await harness.request('POST', '/auth/signup', { body: signupBody() });
    const firstCookie = signup.cookies.find((c) => c.startsWith('refreshToken=')).split(';')[0];

    // A refresh token is a JWT whose only varying claim is `iat` (whole seconds).
    // Refreshing within the same second as signup would mint a byte-identical
    // token, so wait past the second boundary for rotation to be observable.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const refreshed = await harness.request('POST', '/auth/refresh', { headers: { cookie: firstCookie } });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));

    // Re-using the first token after rotation must fail.
    const replay = await harness.request('POST', '/auth/refresh', { headers: { cookie: firstCookie } });
    expect(replay.status).toBe(401);
  });
});
