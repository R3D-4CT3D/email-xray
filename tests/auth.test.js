import { test, expect } from 'vitest';
import { scan, found } from './helpers.js';

test('SPF, DKIM, and DMARC failures', () => {
  const r = scan('auth-failures.eml');
  expect(r.auth).toMatchObject({spf:'fail', dkim:'fail', dmarc:'fail', hfrom:'examplebank.com'});
  expect(found(r, 'auth')).toEqual([['high','DMARC failed'], ['medium','SPF failed'], ['medium','DKIM signature broken']]);
});

test('DMARC pass on a lookalike domain is called out, not trusted', () => {
  const r = scan('sender-lookalike.eml');
  expect(found(r, 'auth')).toEqual([['info','DMARC passed, but only for the lookalike domain']]);
  expect(r.score).toBe(50); // no -10 DMARC credit for a lookalike
});

test('all-pass authentication earns the DMARC credit', () => {
  const r = scan('legit-newsletter.eml');
  expect(r.auth).toMatchObject({spf:'pass', dkim:'pass', dmarc:'pass', dkimD:['examplestore.com']});
  expect(found(r, 'auth')).toEqual([]);
});

test('missing results are an FYI, and Received-SPF is a fallback', () => {
  expect(found(scan('route-anomalies.eml'), 'auth')).toEqual([['info','No authentication results on this copy']]);
  expect(scan('paypal-lookalike.eml').rspfRaw).toMatch(/^softfail/);
});
