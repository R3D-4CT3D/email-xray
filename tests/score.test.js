import { test, expect } from 'vitest';
import { scoreOf } from '../src/analyze.js';

const f = (sev, title) => ({sev, title});
const none = {cuePoints: 0, dmarcCredit: false};

test('a repeated finding counts once', () => {
  expect(scoreOf([f('medium', 'X'), f('medium', 'X'), f('medium', 'X')], none)).toBe(12);
});

test('weak findings add at most 9 points together, so alone they never change the verdict', () => {
  expect(scoreOf(['a', 'b', 'c', 'd', 'e', 'f'].map(t => f('low', t)), none)).toBe(9);
  expect(scoreOf([f('high', 'H'), f('low', 'a'), f('low', 'b'), f('low', 'c')], none)).toBe(34);
});

test('pressure points add, DMARC credit subtracts, and the score stays within 0 to 100', () => {
  expect(scoreOf([f('high', 'H')], {cuePoints: 8, dmarcCredit: true})).toBe(23);
  expect(scoreOf([], {cuePoints: 0, dmarcCredit: true})).toBe(0);
  expect(scoreOf(['a','b','c','d','e'].map(t => f('high', t)), none)).toBe(100);
});
