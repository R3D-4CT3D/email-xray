import { test, expect } from 'vitest';
import { checkLanguage } from '../src/checks/language.js';
import { scan } from './helpers.js';

test('pressure phrases are found and capped at 20 points', () => {
  const r = scan('language-pressure.eml');
  expect(r.cues.map(c => c.label)).toEqual(expect.arrayContaining([
    'Pressure to act fast', 'Short deadline', 'Threat to your account', 'Mentions gift cards',
    'Legal or penalty threat', 'Generic greeting instead of your name', 'Pushes you to click',
  ]));
  expect(r.cues.length).toBeGreaterThan(5);
  expect(r.score).toBe(20);
});

test('the subject line counts', () => {
  expect(scan('language-pressure.eml').cues.find(c => c.label === 'Pressure to act fast').match).toBe('URGENT');
});

test('ordinary wording has no cues', () => {
  expect(checkLanguage('Here are this month’s picks. Thanks for reading.')).toEqual({cues:[], points:0});
});

test('credential phishing about the recipient\'s mailbox is recognized', () => {
  expect(scan('mailbox-impersonation.eml').cues.map(c => c.label)).toEqual(expect.arrayContaining([
    'Says your password is expiring', 'Says your mailbox is full', 'Says your messages are being held',
  ]));
  expect(checkLanguage('Alice has shared a document with you. You have a new voicemail.').cues.map(c => c.label))
    .toEqual(['Says someone shared a file with you', 'Mentions a voicemail']);
});
