import { test, expect } from 'vitest';
import { scan } from './helpers.js';

const flagsFor = (r, href) => r.links.find(l => l.href === href).flags.map(f => f[1]);

test('every link trick in the fixture is caught', () => {
  const r = scan('links-tricks.eml');
  expect(flagsFor(r, 'http://203.0.113.5/login')).toEqual(['Goes straight to an IP address instead of a named website', 'Not encrypted (http instead of https)']);
  expect(flagsFor(r, 'https://www.examplebank.com@evil.example.net/')[0]).toMatch(/"@" trick.*evil\.example\.net/);
  expect(flagsFor(r, 'javascript:alert(1)')).toEqual(['Runs code when clicked']);
  expect(flagsFor(r, 'data:text/html;base64,PGgxPkhpPC9oMT4=')[0]).toMatch(/embedded in the email/);
  expect(flagsFor(r, 'https://evil.example.net/path')).toEqual(['The text says www.examplebank.com, but the link goes to evil.example.net']);
  expect(flagsFor(r, 'https://www.paypal.com.secure-login.example/')[0]).toMatch(/Pretends to be PayPal: puts "paypal" in front as a decoy/);
  expect(flagsFor(r, 'https://xn--exmple-cua.com/')[0]).toMatch(/encoded international characters/);
  expect(flagsFor(r, 'https://bit.ly/abc123')[0]).toMatch(/link shortener/);
  expect(flagsFor(r, 'https://invoice-viewer.web.app/')[0]).toMatch(/free site-builder/);
  expect(flagsFor(r, 'https://portal.rewards-claim.top/')[0]).toMatch(/Ends in \.top/);
  expect(flagsFor(r, 'https://a.b.c.d.example.org/')).toEqual(['Unusually long chain of subdomains']);
});

test('form actions are collected, mailto links are not', () => {
  const r = scan('links-tricks.eml');
  expect(r.links.find(l => l.href === 'https://collect.example.net/submit')).toMatchObject({shown:'Form submits to', form:true, password:false});
  expect(r.links.some(l => l.href.startsWith('mailto:'))).toBe(false);
});

test('links are sorted riskiest first', () => {
  const sev = {high:0, medium:1, low:2};
  const first = scan('links-tricks.eml').links.map(l => l.flags[0] ? sev[l.flags[0][0]] : 9);
  expect(first).toEqual([...first].sort((a, b) => a - b));
});

test('matching link text on a legitimate email is clean', () => {
  expect(scan('legit-newsletter.eml').links.every(l => l.flags.length === 0)).toBe(true);
});

test('forms in the body are flagged, and a password field makes it high risk', () => {
  const r = scan('form-harvest.eml');
  const login = r.links.find(l => l.href === 'https://collect.mailbox-quota.example/save');
  expect(login).toMatchObject({form:true, password:true});
  expect(login.flags[0]).toEqual(['high', 'A sign-in form built into the email. Whatever you type, including your password, goes to collect.mailbox-quota.example']);
  const survey = r.links.find(l => l.href === 'https://survey.it-helpdesk.example/rate');
  expect(survey.flags).toEqual([['medium', 'A form built into the email sends whatever you type to survey.it-helpdesk.example']]);
});

test('a sign-in button to a site that isn\'t the sender\'s is flagged', () => {
  const l = scan('mailbox-impersonation.eml').links.find(x => x.host === 'storage-check.example');
  expect(l.flags).toEqual([['medium', '"Keep my mailbox" leads to storage-check.example, which isn\'t the sender\'s site']]);
});

test('ordinary link text and the sender\'s own buttons are not flagged', () => {
  for (const f of ['legit-newsletter.eml', 'mailing-list.eml']) expect(scan(f).links.flatMap(l => l.flags).filter(x => /isn't the sender's site/.test(x[1]))).toEqual([]);
});
