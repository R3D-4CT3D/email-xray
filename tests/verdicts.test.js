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
  ['form-harvest.eml', 30, 59],
  ['mailbox-impersonation.eml', 60, 100],
  ['legit-newsletter.eml', 0, 9],
  ['mailing-list.eml', 0, 9],
])('%s scores between %i and %i', (name, lo, hi) => {
  const s = scan(name).score;
  expect(s).toBeGreaterThanOrEqual(lo);
  expect(s).toBeLessThanOrEqual(hi);
});

// Known false negatives. test.fails passes while the miss exists; when scoring fixes one, it fails here: move it into the table above.
test.fails.each([
  ['language-pressure.eml', 30], // heavy pressure, no links or attachments (BEC style): 20
])('KNOWN MISS: %s should score at least %i', (name, lo) => {
  expect(scan(name).score).toBeGreaterThanOrEqual(lo);
});
