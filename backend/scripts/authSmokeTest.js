const assert = require('node:assert/strict');

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromSetCookie(setCookieValue) {
    if (!setCookieValue) return;
    const firstPart = String(setCookieValue).split(';')[0];
    const idx = firstPart.indexOf('=');
    if (idx <= 0) return;
    const name = firstPart.slice(0, idx).trim();
    const value = firstPart.slice(idx + 1);
    if (!name) return;
    this.cookies.set(name, value);
  }

  addFromHeaders(headers) {
    if (!headers) return;
    if (typeof headers.getSetCookie === 'function') {
      const list = headers.getSetCookie();
      for (const item of list) this.setFromSetCookie(item);
      return;
    }
    const single = headers.get('set-cookie');
    if (single) this.setFromSetCookie(single);
  }

  headerValue() {
    if (this.cookies.size === 0) return '';
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  get(name) {
    return this.cookies.get(name);
  }
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForHttpOk(url, { timeoutMs = 30000 } = {}) {
  const start = Date.now();
  let lastErr = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(url, { method: 'GET' });
      if (resp.ok) return;
      lastErr = new Error(`HTTP ${resp.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(250);
  }
  throw lastErr || new Error('Timed out waiting for server');
}

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_for_smoke_tests_only';
  process.env.PORT = process.env.PORT || '0';
  process.env.MONGO_URI = process.env.MONGO_URI || `mongodb://127.0.0.1:27017/skillverse_auth_smoke_${Date.now()}`;
  process.env.SUBSCRIPTION_REMINDERS_ENABLED = process.env.SUBSCRIPTION_REMINDERS_ENABLED || '0';

  // Load server AFTER env vars are set (backend/index.js validates JWT_SECRET at import time).
  // eslint-disable-next-line global-require
  const { startServer } = require('../index.js');

  const started = await startServer();
  try {
    const port = started.server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForHttpOk(`${baseUrl}/api/csrf-token`);

    const jar = new CookieJar();

    async function api(path, { method = 'GET', body, csrf = true } = {}) {
      const headers = {};
      const cookie = jar.headerValue();
      if (cookie) headers.cookie = cookie;
      if (body !== undefined) headers['content-type'] = 'application/json';
      if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
        headers['x-xsrf-token'] = jar.get('XSRF-TOKEN') || '';
      }

      const resp = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      jar.addFromHeaders(resp.headers);
      const text = await resp.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { status: resp.status, json, text };
    }

    const csrfResp = await api('/api/csrf-token', { method: 'GET', csrf: false });
    assert.equal(csrfResp.status, 200);
    assert.ok(csrfResp.json?.token, 'csrf token returned');
    assert.ok(jar.get('XSRF-TOKEN'), 'csrf cookie set');
    assert.equal(jar.get('XSRF-TOKEN'), csrfResp.json.token, 'cookie and payload csrf match');

    const email = `user_${Date.now()}@example.com`;
    const password = 'StrongPassw0rd!';

    const registerResp = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test User', email, password }
    });
    assert.equal(registerResp.status, 201, registerResp.text);

    const loginBeforeVerify = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    assert.equal(loginBeforeVerify.status, 403, loginBeforeVerify.text);
    assert.match(String(loginBeforeVerify.json?.error || ''), /verify/i);

    const forgot = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: { email }
    });
    assert.equal(forgot.status, 200, forgot.text);
    assert.ok(forgot.json?.verificationCode, 'expected verificationCode in non-production response');

    const code = String(forgot.json.verificationCode);
    assert.ok(code, 'verification code parsed');

    const verifyResp = await api('/api/auth/verify', { method: 'POST', body: { email, code } });
    assert.equal(verifyResp.status, 200, verifyResp.text);

    const loginAfterVerify = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    assert.equal(loginAfterVerify.status, 200, loginAfterVerify.text);
    assert.ok(jar.get('authToken'), 'authToken cookie set');
    assert.ok(loginAfterVerify.json?.token, 'token returned');

    const protectedResp = await api('/api/protected', { method: 'GET', csrf: false });
    assert.equal(protectedResp.status, 200, protectedResp.text);
    assert.equal(protectedResp.json?.user?.email, email.toLowerCase());

    console.log('Auth smoke test passed');
  } finally {
    await started.stop();
  }
}

main().catch((err) => {
  console.error('Auth smoke test failed:', err?.stack || err?.message || String(err));
  process.exitCode = 1;
});

