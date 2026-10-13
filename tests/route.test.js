import { test, expect } from 'vitest';
import { scan, found } from './helpers.js';

test('hops are ordered origin first, with the first public hop as origin', () => {
  const r = scan('route-anomalies.eml');
  expect(r.hops.map(h => h.kind)).toEqual(['private', 'documentation', 'documentation', 'documentation']);
  expect(r.originIdx).toBe(1);
  expect(r.hops[1]).toMatchObject({from:'mail.trusted-sender.example', rdns:'host-7.dialup.isp.example', ip:'203.0.113.7'});
});

test('long pauses, backwards clocks, HELO/rDNS mismatch, and X-Originating-IP', () => {
  const r = scan('route-anomalies.eml');
  expect(found(r, 'route')).toEqual([
    ['low', 'Long pause before hop 2'],
    ['medium', 'Timestamps run backwards at hop 3'],
    ['low', 'Sending server\'s name doesn\'t match its address'],
    ['info', 'Original sender\'s IP is listed'],
  ]);
  expect(r.xoip).toBe('203.0.113.99');
});

test('the sample phish route marks the lookalike server as origin', () => {
  const r = scan('paypal-lookalike.eml');
  expect(r.hops).toHaveLength(3);
  expect(r.hops[r.originIdx]).toMatchObject({from:'mail.paypa1-secure.com', ip:'203.0.113.45'});
});
