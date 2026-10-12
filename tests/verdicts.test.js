// End-to-end verdicts per fixture. This is the false-positive and false-negative guard for scoring changes.
import { test, expect } from 'vitest';
import { scan, found } from './helpers.js';

test('the sample phish: likely phishing, with route, lookalike, and attachment findings', () => {
  const r = scan('paypal-lookalike.eml');
  expect(r.score).toBe(100);
  expect(found(r, 'sender')[0]).toEqual(['high', 'Sender\'s domain imitates PayPal']);
  expect(found(r, 'route')).toHaveLength(1);
  expect(found(r, 'atts').length).toBeGreaterThan(0);
  expect(r.cues.length).toBeGreaterThan(0);
});

test.each([
  ['paypal-lookalike.eml', 60, 100],
  ['links-tricks.eml', 60, 100],
  ['attachments-risky.eml', 60, 100],
  ['sender-spoofing.eml', 60, 100],
  ['sender-lookalike.eml', 30, 59],
  ['auth-failures.eml', 30, 59],
  ['language-pressure.eml', 10, 29],
  ['route-anomalies.eml', 10, 29],
  ['legit-newsletter.eml', 0, 9],
])('%s scores between %i and %i', (name, lo, hi) => {
  const s = scan(name).score;
  expect(s).toBeGreaterThanOrEqual(lo);
  expect(s).toBeLessThanOrEqual(hi);
});
