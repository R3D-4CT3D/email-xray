import { test, expect } from 'vitest';
import { lookalike, registrable, sameOrg } from '../src/checks/domains.js';

test('registrable domain handles two-part public suffixes', () => {
  expect(registrable('a.b.example.co.uk')).toBe('example.co.uk');
  expect(registrable('mail.news.example.com')).toBe('example.com');
  expect(sameOrg('news.examplestore.com', 'examplestore.com')).toBe(true);
});

test.each([
  ['paypa1-secure.com', 'PayPal', 'high'],          // digit swap
  ['arnazon-billing.com', 'Amazon', 'high'],        // rn for m
  ['micros0ft-support.com', 'Microsoft', 'high'],   // 0 for o, stuffed into a longer label
  ['paypall.com', 'PayPal', 'high'],                // near-misspelling
  ['paypal.com.account-verify.top', 'PayPal', 'high'], // decoy subdomain
  ['netflix.xyz', 'Netflix', 'medium'],             // right name, wrong ending
])('%s imitates %s', (host, brand, sev) => {
  expect(lookalike(host)).toMatchObject({brand, sev});
});

test.each(['paypal.com', 'www.paypal.com', 'mail.google.com', 'examplestore.com', 'livestream.example', 'metacritic.com'])(
  '%s is not flagged', host => expect(lookalike(host)).toBeNull());

// Known false positives from the substring rule ("stuffs X into an unrelated domain").
// test.fails passes while the bug exists. When tuning fixes one, it fails here: move it to the list above.
test.fails.each(['purchase-orders.com', 'officedepot.com', 'outlookindia.com', 'appleton.example'])(
  'KNOWN FALSE POSITIVE: %s is flagged', host => expect(lookalike(host)).toBeNull());
