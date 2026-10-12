import { test, expect } from 'vitest';
import { lookalike, registrable, sameOrg } from '../src/checks/domains.js';

test('registrable domain handles two-part public suffixes', () => {
  expect(registrable('a.b.example.co.uk')).toBe('example.co.uk');
  expect(registrable('mail.news.example.com')).toBe('example.com');
  expect(sameOrg('news.examplestore.com', 'examplestore.com')).toBe(true);
});

test.each([
  ['paypa1-secure.com', 'PayPal'],            // digit swap
  ['arnazon-billing.com', 'Amazon'],          // rn for m
  ['micros0ft-support.com', 'Microsoft'],     // 0 for o inside a longer label
  ['paypall.com', 'PayPal'],                  // near-misspelling
  ['paypal.com.account-verify.top', 'PayPal'], // decoy subdomain
])('%s imitates %s', (host, brand) => {
  expect(lookalike(host)).toMatchObject({brand, sev:'high'});
});

test('the right name on the wrong ending is medium', () => {
  expect(lookalike('netflix.xyz')).toMatchObject({brand:'Netflix', sev:'medium'});
});

// Brand names inside longer labels, the way phishing domains are built.
test.each([
  ['paypal-secure-login.com', 'PayPal'], ['secure-paypal.com', 'PayPal'], ['paypalverify.com', 'PayPal'],
  ['paypal-resolution.net', 'PayPal'], ['netflixaccount-help.com', 'Netflix'], ['netflix-billing.info', 'Netflix'],
  ['appleid-verify.com', 'Apple'], ['apple-support-center.com', 'Apple'], ['icloud-unlock.net', 'Apple'],
  ['amazon-billing.co', 'Amazon'], ['amazonsecurity-alert.com', 'Amazon'], ['chase-online-secure.com', 'Chase'],
  ['chaseverify.com', 'Chase'], ['wellsfargo-alerts.com', 'Wells Fargo'], ['microsoft-account-team.com', 'Microsoft'],
  ['office365-login.com', 'Microsoft'], ['outlook-mail-update.com', 'Microsoft'], ['docusign-review.net', 'DocuSign'],
  ['dropbox-share-files.com', 'Dropbox'], ['coinbase-wallet-support.com', 'Coinbase'], ['metamask-recovery.io', 'MetaMask'],
  ['linkedin-security.com', 'LinkedIn'], ['usps-redelivery.com', 'USPS'], ['fedex-tracking-update.com', 'FedEx'],
  ['dhl-parcel-notice.com', 'DHL'], ['irs-refund-claim.com', 'IRS'], ['steamcommunity-gift.com', 'Steam'],
  ['g00gle-security.com', 'Google'], ['faceb00k-login.com', 'Facebook'], ['venmo-payment-verify.com', 'Venmo'],
])('%s is flagged as %s', (host, brand) => {
  expect(lookalike(host)).toMatchObject({brand, sev:'high'});
});

// Real brand domains, and ordinary words that happen to contain a brand name.
test.each([
  'paypal.com', 'www.paypal.com', 'mail.google.com', 'metamask.io', 'examplestore.com',
  'purchase-orders.com', 'officedepot.com', 'officemax.com', 'outlookindia.com', 'appleton.example',
  'spotifycharts.com', 'fedexpress.example', 'venmore.example', 'chasebank-careers.example', 'metacritic.com',
  'citizensbank.com', 'livestream.example', 'zoomcar.example', 'steamboat.example', 'pineapple.example',
  'applebees.com', 'snapple.com', 'grapple.example', 'metallica.com', 'paychase.example',
  'outlooktraveler.example', 'office-supplies.example', 'apple-orchard.example', 'theofficeshop.example',
  'liveworksheets.com', 'zoominfo.com', 'dropboxer.example', 'amazonas-river.example', 'adobeworks.example',
  'walmartimes.example', 'instagrammar.example', 'upstate.example',
])('%s is not flagged', host => expect(lookalike(host)).toBeNull());
