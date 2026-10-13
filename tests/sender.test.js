import { test, expect } from 'vitest';
import { scan, found } from './helpers.js';
import { analyze } from '../src/analyze.js';

test('display-name spoofing, brand name, freemail Reply-To, bounce, Message-ID, mailer', () => {
  const r = scan('sender-spoofing.eml');
  expect(r.from).toMatchObject({name:'security@paypal.com', addr:'alerts@notify-center.example'});
  expect(found(r, 'sender')).toEqual([
    ['high', 'The display name shows a fake address'],
    ['medium', 'Name says "PayPal", but the address isn\'t PayPal\'s'],
    ['high', 'Replies go to a free personal email account'],
    ['low', 'Bounce address is on another domain'],
    ['info', 'Message ID came from a different domain'],
    ['low', 'Sent with a mass-mailing script'],
  ]);
});

test('lookalike sender domain makes the brand-name finding high', () => {
  const r = scan('sender-lookalike.eml');
  expect(found(r, 'sender')).toEqual([
    ['high', 'Sender\'s domain imitates Amazon'],
    ['high', 'Name says "Amazon", but the address isn\'t Amazon\'s'],
  ]);
});

test('a consistent legitimate sender raises nothing', () => {
  expect(found(scan('legit-newsletter.eml'), 'sender')).toEqual([]);
});

test('impersonating the recipient\'s own mail provider, with hidden characters in the subject', () => {
  const r = scan('mailbox-impersonation.eml');
  expect(found(r, 'sender')).toEqual([
    ['high', 'Uses your own domain, northwind.example, to look like it came from your email provider or IT team'],
    ['high', 'Invisible characters are hidden inside words in the subject'],
  ]);
});

const mini = (from, subject, to = 'staff@acme.example') => `From: ${from}\nTo: ${to}\nSubject: ${subject}\n\nHello`;

test('the organization\'s name alone is medium, unless the sender\'s own domain carries it', () => {
  expect(found(analyze(mini('"Acme HR" <hr@payroll-portal.example>', 'Salary review')), 'sender'))
    .toEqual([['medium', 'Uses your organization\'s name, "acme", but comes from somewhere else']]);
  expect(found(analyze(mini('"Acme Supplies" <orders@acmesupplies.example>', 'Your Acme order')), 'sender')).toEqual([]);
});

test('the recipient\'s domain check stays quiet for freemail recipients and same-org senders', () => {
  expect(found(analyze(mini('IT <it@acme.example>', 'acme.example password policy')), 'sender')).toEqual([]);
  expect(found(analyze(mini('X <x@other.example>', 'gmail.com storage', 'me@gmail.com')), 'sender')).toEqual([]);
});

test('zero-width characters in Persian are not mistaken for hiding', () => {
  expect(found(analyze(mini('A <a@b.example>', 'می‌خواهم')), 'sender')).toEqual([]);
});

test('a mailing list\'s Reply-To is not a hijack', () => {
  expect(found(scan('mailing-list.eml'), 'sender').map(f => f[1])).not.toContain('Replies go to a different domain');
});
