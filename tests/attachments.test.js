import { test, expect } from 'vitest';
import { scan } from './helpers.js';

const flagsFor = (r, name) => r.atts.find(a => a.name === name).flags;

test('executables, double extensions, and archives are flagged; plain text is not', () => {
  const r = scan('attachments-risky.eml');
  expect(flagsFor(r, 'Invoice_2026.pdf.exe')).toEqual([
    ['high', 'Runs a program'],
    ['high', 'Double extension. It looks like a .pdf but is really a .exe'],
  ]);
  expect(flagsFor(r, 'records.zip')).toEqual([['low', 'Compressed archive. These can hide other files from scanners']]);
  expect(flagsFor(r, 'notes.txt')).toEqual([]);
});

test('base64 attachments decode to their real size', () => {
  const r = scan('attachments-risky.eml');
  expect(r.atts.find(a => a.name === 'Invoice_2026.pdf.exe')).toMatchObject({type:'application/octet-stream', size:12});
});

test('RFC 2231 filename* parameters are decoded', () => {
  const names = scan('attachments-risky.eml').atts.map(a => a.name);
  expect(names).toContain('scan.html');
  expect(names.some(n => n.includes("''"))).toBe(false);
});
