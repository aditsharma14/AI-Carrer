import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';

const require = createRequire(import.meta.url);
const { parseTrustProxy, parseSameSite } = require('../src/config/parsers');
const rateLimitTier = require('../src/middleware/rateLimit.middleware');

describe('parseTrustProxy', () => {
  it('is off by default', () => {
    for (const v of [undefined, '', 'false', '0', '  ']) expect(parseTrustProxy(v)).toBe(false);
  });

  it('accepts a number of proxy hops', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
  });

  it('accepts a list of trusted addresses', () => {
    expect(parseTrustProxy('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8');
  });

  it('refuses true, which would let any client pose as any address', () => {
    expect(() => parseTrustProxy('true')).toThrow(/bypass rate limits/);
  });
});

describe('parseSameSite', () => {
  it('defaults to lax and normalises case', () => {
    expect(parseSameSite(undefined, 'production')).toBe('lax');
    expect(parseSameSite('STRICT', 'production')).toBe('strict');
  });

  it('allows none only in production, where cookies are Secure', () => {
    expect(parseSameSite('none', 'production')).toBe('none');
    expect(() => parseSameSite('none', 'development')).toThrow(/NODE_ENV=production/);
  });

  it('rejects unknown values', () => {
    expect(() => parseSameSite('sometimes', 'production')).toThrow(/lax, strict or none/);
  });
});

// The reason TRUST_PROXY exists: what the rate limiter actually does behind a
// load balancer. Requests arrive from 127.0.0.1 (the "proxy") and carry the real
// client in X-Forwarded-For, like they do on any hosting provider.
describe('rate limiting behind a proxy', () => {
  let server;
  afterEach(() => new Promise((resolve) => server.close(resolve)));

  async function appWith(trustProxy) {
    const app = express();
    app.set('trust proxy', trustProxy);
    app.use(rateLimitTier('auth')); // 20 requests per 15 minutes per client
    app.get('/', (req, res) => res.json({ ip: req.ip }));
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    return `http://127.0.0.1:${server.address().port}/`;
  }
  const hit = (url, ip) => fetch(url, { headers: { 'x-forwarded-for': ip } });

  it('with TRUST_PROXY=1 each client gets their own limit', async () => {
    const url = await appWith(1);
    for (let i = 0; i < 20; i++) expect((await hit(url, '198.51.100.1')).status).toBe(200);
    expect((await hit(url, '198.51.100.1')).status).toBe(429); // client A is limited
    expect((await hit(url, '198.51.100.2')).status).toBe(200); // client B is not
    expect((await (await hit(url, '198.51.100.3')).json()).ip).toBe('198.51.100.3');
  });

  it('WITHOUT it, one client exhausts the limit for everybody (the bug being prevented)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // the limiter warns about the missing setting
    const url = await appWith(false);
    for (let i = 0; i < 20; i++) await hit(url, '198.51.100.1');
    expect((await hit(url, '198.51.100.2')).status).toBe(429); // an unrelated client is locked out
    vi.restoreAllMocks();
  });
});
