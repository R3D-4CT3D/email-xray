import { test, expect, afterEach, vi } from 'vitest';
import worker from '../src/index.js';
import { stubFetch } from './stub.js';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const env = { ALLOWED_ORIGINS: 'https://r3d-4ct3d.github.io,http://localhost:5173' };
const ctx = { waitUntil(){} };
const call = (path, init = {}, e = env) => worker.fetch(new Request('https://api.example' + path, init), e, ctx);

test('health check', async () => {
  const res = await call('/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test('CORS is granted only to allowed origins', async () => {
  const ok = await call('/health', { headers: { origin: 'https://r3d-4ct3d.github.io' } });
  expect(ok.headers.get('access-control-allow-origin')).toBe('https://r3d-4ct3d.github.io');
  const other = await call('/health', { headers: { origin: 'https://evil.example' } });
  expect(other.headers.get('access-control-allow-origin')).toBeNull();
});

test('bad input is a 400 with a plain explanation, and nothing is fetched', async () => {
  const calls = stubFetch({});
  for (const p of ['/domain/localhost/age', '/ip/10.0.0.1', '/url/expand?u=https://evil.example/x', '/url/expand?u=javascript:alert(1)']){
    const res = await call(p);
    expect(res.status, p).toBe(400);
    expect((await res.json()).error, p).toMatch(/^(Send|Only)/);
  }
  expect(calls).toHaveLength(0);
});

test('unknown paths and methods', async () => {
  expect((await call('/nope')).status).toBe(404);
  expect((await call('/health', { method: 'POST' })).status).toBe(405);
  expect((await call('/health', { method: 'OPTIONS' })).status).toBe(204);
});

test('rate limiting returns 429 keyed by client IP', async () => {
  const keys = [];
  const limited = { ...env, RATE_LIMITER: { limit: async ({ key }) => { keys.push(key); return { success: false }; } } };
  const res = await call('/ip/8.8.8.8', { headers: { 'cf-connecting-ip': '198.51.100.9' } }, limited);
  expect(res.status).toBe(429);
  expect(keys).toEqual(['ip:198.51.100.9']);
});

test('upstream failure is a 502, and logs carry the route but never the looked-up value', async () => {
  stubFetch({ 'https://rdap.org/domain/paypa1-secure.com': { status: 503 } });
  const logs = [];
  vi.spyOn(console, 'error').mockImplementation(m => logs.push(m));
  vi.spyOn(console, 'log').mockImplementation(m => logs.push(m));
  const res = await call('/domain/paypa1-secure.com/age');
  expect(res.status).toBe(502);
  expect(JSON.parse(logs[0])).toMatchObject({ message: 'request', route: 'domain-age', status: 502 });
  expect(logs.join('\n')).not.toContain('paypa1');
});

test('a lookup end to end', async () => {
  stubFetch({ 'https://rdap.org/domain/example.com': { body: { events: [{ eventAction: 'registration', eventDate: '1995-08-14T04:00:00Z' }] } } });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const res = await call('/domain/Example.com/age');
  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toBe('public, max-age=86400');
  expect(await res.json()).toMatchObject({ domain: 'example.com', found: true, registered: '1995-08-14T04:00:00.000Z' });
});
