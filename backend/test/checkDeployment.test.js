import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

const require = createRequire(import.meta.url);
const { checkDeployment } = require('../scripts/check-deployment');

let server;
afterEach(() => new Promise((resolve) => (server ? server.close(resolve) : resolve())));

// A small app that behaves like the real API where it matters to the checks.
async function start({ ready = true, metricsOpen = false, corsAny = false, poweredBy = false, leakStack = false } = {}) {
  const app = express();
  if (!poweredBy) app.disable('x-powered-by');
  // helmet removes X-Powered-By by default; switch that off to simulate a deployment without it.
  app.use(helmet(poweredBy ? { xPoweredBy: false } : {}));
  app.use(cors(corsAny ? { origin: '*' } : { origin: 'https://app.example.com' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/ready', (req, res) =>
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'degraded', checks: ready ? [] : [{ name: 'redis', ok: false, error: 'not connected' }] })
  );
  app.get('/metrics', (req, res) => (metricsOpen ? res.send('# metrics') : res.status(404).end()));
  app.get('/api/v1/auth/me', (req, res) => res.status(401).json({ code: 'UNAUTHORIZED' }));
  app.get('/', (req, res) => res.send('<html><body><div id="root"></div></body></html>'));
  app.get('/app/dashboard', (req, res) => res.send('<div id="root"></div>'));
  app.use((req, res) => {
    if (leakStack) return res.status(404).send('Error: nope\n    at handler (/app/node_modules/express/lib/router.js:10:5)');
    res.status(404).json({ code: 'NOT_FOUND' });
  });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}

const byName = (results, text) => results.find((r) => r.name.includes(text));

describe('check-deployment', () => {
  it('passes a correctly configured deployment (plain HTTP is the only local failure)', async () => {
    const url = await start();
    const results = await checkDeployment({ apiUrl: url, webUrl: url });
    const failed = results.filter((r) => !r.ok).map((r) => r.name);
    expect(failed.sort()).toEqual(['API is served over HTTPS', 'Web app is served over HTTPS']);
  });

  it('reports which dependency is down when the API is not ready', async () => {
    const results = await checkDeployment({ apiUrl: await start({ ready: false }) });
    const r = byName(results, 'ready');
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('redis: not connected');
  });

  it('flags public metrics, permissive CORS, a revealed framework and a leaked stack trace', async () => {
    const url = await start({ metricsOpen: true, corsAny: true, poweredBy: true, leakStack: true });
    const results = await checkDeployment({ apiUrl: url });
    expect(byName(results, '/metrics').ok).toBe(false);
    expect(byName(results, 'CORS').ok).toBe(false);
    expect(byName(results, 'Security headers').detail).toContain('X-Powered-By');
    expect(byName(results, 'stack trace').ok).toBe(false);
  });

  it('reports an unreachable server as failures instead of crashing', async () => {
    const results = await checkDeployment({ apiUrl: 'http://127.0.0.1:1' });
    expect(results.every((r) => r.ok === false || r.name.includes('HTTPS'))).toBe(true);
    expect(byName(results, 'alive').detail).toContain('could not run');
  });
});
