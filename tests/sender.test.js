import { test, expect } from 'vitest';
import { scan, found } from './helpers.js';

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
