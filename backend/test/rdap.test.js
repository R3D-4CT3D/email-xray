import { test, expect, afterEach, vi } from 'vitest';
import { domainAge, ipOwner } from '../src/rdap.js';
import { stubFetch } from './stub.js';

afterEach(() => vi.unstubAllGlobals());

const registrar = { roles: ['registrar'], vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'Example Registrar, Inc.']]] };

test('domain age comes from the registration event', async () => {
  stubFetch({ 'https://rdap.org/domain/paypa1-secure.com': { body: {
    events: [{ eventAction: 'registration', eventDate: '2026-10-01T12:00:00Z' }, { eventAction: 'expiration', eventDate: '2027-10-01T12:00:00Z' }],
    entities: [registrar],
  } } });
  const r = await domainAge('paypa1-secure.com', Date.parse('2026-10-12T12:00:00Z'));
  expect(r).toEqual({ domain: 'paypa1-secure.com', found: true, registered: '2026-10-01T12:00:00.000Z', ageDays: 11, expires: '2027-10-01T12:00:00Z', registrar: 'Example Registrar, Inc.' });
});

test('an unregistered domain is reported as not found', async () => {
  stubFetch({ 'https://rdap.org/domain/nothing-here.example': { status: 404 } });
  expect(await domainAge('nothing-here.example')).toEqual({ domain: 'nothing-here.example', found: false });
});

test('upstream failures throw instead of returning a guess', async () => {
  stubFetch({ 'https://rdap.org/domain/x.com': { status: 503 } });
  await expect(domainAge('x.com')).rejects.toThrow('RDAP returned 503');
});

test('oversized RDAP answers are refused', async () => {
  stubFetch({ 'https://rdap.org/domain/big.com': { body: { pad: 'x'.repeat(300 * 1024) } } });
  await expect(domainAge('big.com')).rejects.toThrow('too large');
});

test('IP owner, country, range, and registry', async () => {
  stubFetch({ 'https://rdap.org/ip/203.0.113.45': { finalUrl: 'https://rdap.apnic.net/ip/203.0.113.45', body: {
    name: 'CHEAPHOST-NET', country: 'AU', startAddress: '203.0.113.0', endAddress: '203.0.113.255',
    entities: [{ roles: ['registrant'], vcardArray: ['vcard', [['fn', {}, 'text', 'Cheap Host Pty Ltd']]] }],
  } } });
  expect(await ipOwner('203.0.113.45')).toEqual({ ip: '203.0.113.45', found: true, network: 'CHEAPHOST-NET', owner: 'Cheap Host Pty Ltd', country: 'AU', range: '203.0.113.0 - 203.0.113.255', rir: 'APNIC' });
});

test('every RDAP request identifies itself (rdap.org answers 403 without a User-Agent)', async () => {
  const calls = stubFetch({ 'https://rdap.org/domain/example.com': { body: { events: [] } } });
  await domainAge('example.com');
  expect(calls[0].ua).toMatch(/^EmailXRay\//);
});

test('IPv6 goes into the path unencoded (rdap.org rejects %3A)', async () => {
  const calls = stubFetch({ 'https://rdap.org/ip/2001:4860:4860::8888': { body: { name: 'GOOGLE-IPV6' } } });
  expect((await ipOwner('2001:4860:4860::8888')).network).toBe('GOOGLE-IPV6');
  expect(calls[0].url).toBe('https://rdap.org/ip/2001:4860:4860::8888');
});

test('a 404 whose empty body refuses to cancel still reads as not found', async () => {
  vi.stubGlobal('fetch', async () => {
    const res = new Response(new ReadableStream({ start(c){ c.close(); } }), { status: 404 });
    res.body.cancel = () => Promise.reject(new Error('Network connection lost.'));
    return res;
  });
  expect(await domainAge('nothing-here.example')).toEqual({ domain: 'nothing-here.example', found: false });
});
