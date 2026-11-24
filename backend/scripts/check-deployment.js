#!/usr/bin/env node
// Post-deploy verification. Run it against a live deployment and it checks the
// things that go wrong in real deployments and that a green CI cannot see:
//
//   node scripts/check-deployment.js https://api.example.com [https://app.example.com]
//   npm run check:deployment -- https://api.example.com https://app.example.com
//
// Exit code 1 if any check fails, so it can gate a release pipeline too. It only
// sends harmless GET and OPTIONS requests and never signs in.
const EVIL_ORIGIN = 'https://evil.example';

const ok = (detail = '') => ({ ok: true, detail });
const fail = (detail) => ({ ok: false, detail });

async function checkDeployment({ apiUrl, webUrl, fetchFn = fetch }) {
  const api = apiUrl.replace(/\/$/, '');
  const get = (path, init) => fetchFn(`${api}${path}`, { redirect: 'manual', ...init });
  const checks = [];
  const add = (name, run) => checks.push({ name, run });

  add('API is reachable and alive (/health)', async () => {
    const res = await get('/health');
    return res.status === 200 ? ok() : fail(`HTTP ${res.status}`);
  });

  add('API is ready: database and Redis reachable (/ready)', async () => {
    const res = await get('/ready');
    const body = await res.json().catch(() => ({}));
    if (res.status === 200) return ok();
    const down = (body.checks || []).filter((c) => !c.ok).map((c) => `${c.name}: ${c.error}`);
    return fail(`HTTP ${res.status}${down.length ? ` (${down.join('; ')})` : ` (${body.status || 'no body'})`}`);
  });

  add('API is served over HTTPS', async () => (api.startsWith('https://') ? ok() : fail('plain HTTP: tokens and cookies would travel unencrypted')));

  add('Security headers are set and the framework is not advertised', async () => {
    const res = await get('/health');
    const problems = [];
    if (res.headers.get('x-content-type-options') !== 'nosniff') problems.push('missing X-Content-Type-Options');
    if (res.headers.get('x-powered-by')) problems.push('X-Powered-By reveals the framework');
    if (api.startsWith('https://') && !res.headers.get('strict-transport-security')) problems.push('missing Strict-Transport-Security');
    return problems.length ? fail(problems.join('; ')) : ok();
  });

  add('Unknown routes return a JSON 404, not a stack trace', async () => {
    const res = await get('/api/v1/this-route-does-not-exist');
    const text = await res.text();
    if (res.status !== 404) return fail(`HTTP ${res.status}`);
    if (/node_modules|\bat .+\(.+:\d+:\d+\)/.test(text)) return fail('response leaks a stack trace');
    return (res.headers.get('content-type') || '').includes('json') ? ok() : fail('not JSON');
  });

  add('Protected routes refuse anonymous requests', async () => {
    const res = await get('/api/v1/auth/me');
    return res.status === 401 || res.status === 403 ? ok() : fail(`expected 401, got HTTP ${res.status}`);
  });

  add('/metrics is not public', async () => {
    const res = await get('/metrics');
    return res.status === 404 || res.status === 401 ? ok() : fail(`HTTP ${res.status}: internals are readable by anyone`);
  });

  add('CORS does not accept arbitrary origins', async () => {
    const res = await get('/api/v1/auth/login', {
      method: 'OPTIONS',
      headers: { origin: EVIL_ORIGIN, 'access-control-request-method': 'POST' },
    });
    const allowed = res.headers.get('access-control-allow-origin');
    if (allowed === '*' || allowed === EVIL_ORIGIN) return fail(`allows origin ${allowed}`);
    return ok();
  });

  if (webUrl) {
    const web = webUrl.replace(/\/$/, '');
    add('Web app is served', async () => {
      const res = await fetchFn(`${web}/`, { redirect: 'manual' });
      const html = await res.text();
      return res.status === 200 && /id=["']root["']/.test(html) ? ok() : fail(`HTTP ${res.status}, no app shell found`);
    });
    add('Web app routes fall back to the app (client-side routing)', async () => {
      const res = await fetchFn(`${web}/app/dashboard`, { redirect: 'manual' });
      return res.status === 200 ? ok() : fail(`HTTP ${res.status}: deep links and page refreshes would 404`);
    });
    add('Web app is served over HTTPS', async () => (web.startsWith('https://') ? ok() : fail('plain HTTP')));
  }

  const results = [];
  for (const { name, run } of checks) {
    try {
      results.push({ name, ...(await run()) });
    } catch (err) {
      results.push({ name, ...fail(`could not run: ${err.cause?.code || err.message}`) });
    }
  }
  return results;
}

async function main() {
  const [apiUrl, webUrl] = process.argv.slice(2);
  if (!apiUrl || !/^https?:\/\//.test(apiUrl)) {
    console.error('Usage: node scripts/check-deployment.js <api-url> [web-url]');
    process.exit(2);
  }
  const results = await checkDeployment({ apiUrl, webUrl });
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n        ${r.detail}` : ''}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main();

module.exports = { checkDeployment };
