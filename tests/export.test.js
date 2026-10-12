import { describe, test, expect } from 'vitest';
import { enrich } from '../src/enrich.js';
import { md5 } from '../src/export/hash.js';
import { defang, iocCSV } from '../src/export/iocs.js';
import { stixBundle } from '../src/export/stix.js';
import { reportMD } from '../src/export/report.js';
import { analyze } from '../src/analyze.js';
import { fixture } from './helpers.js';

const scanFull = async name => { const raw = fixture(name); const r = analyze(raw); await enrich(r, raw); return r; };

test('md5 matches RFC 1321 test vectors', () => {
  const b = s => new TextEncoder().encode(s);
  expect(md5(b(''))).toBe('d41d8cd98f00b204e9800998ecf8427e');
  expect(md5(b('abc'))).toBe('900150983cd24fb0d6963f7d28e17f72');
  expect(md5(b('a'.repeat(1000)))).toBe('cabe45dcc9ae5b66ba86600cca6b8ba8');
});

test.each([
  ['url', 'http://paypal.com.account-verify.top/login', 'hxxp://paypal[.]com[.]account-verify[.]top/login'],
  ['domain', 'paypa1-secure.com', 'paypa1-secure[.]com'],
  ['ipv4', '203.0.113.45', '203[.]0[.]113[.]45'],
  ['email', 'a.b@evil.example', 'a[.]b[@]evil[.]example'],
  ['sha256', 'abc', 'abc'],
])('defang %s', (type, v, out) => expect(defang(type, v)).toBe(out));

describe('sample phish case', async () => {
  const r = await scanFull('paypal-lookalike.eml');

  test('case ID, verdict, and hashes', () => {
    expect(r.caseId).toMatch(/^EXR-\d{8}-[0-9A-F]{8}$/);
    expect(r.verdict).toBe('Likely phishing');
    expect(r.atts[0].md5).toMatch(/^[0-9a-f]{32}$/);
  });

  test('IOCs include origin IP, sender, Reply-To, link host, and attachment', () => {
    const v = r.iocs.map(i => `${i.type}:${i.value}`);
    expect(v).toEqual(expect.arrayContaining([
      'ipv4:203.0.113.45', 'domain:paypa1-secure.com', 'email:resolution.center.help@gmail.com',
      'domain:paypal.com.account-verify.top', 'filename:Invoice_88231.pdf.html',
    ]));
    expect(v.some(x => x.includes('10.0.0.12'))).toBe(false); // private hops are left out
  });

  test('ATT&CK mapping covers attachment, link, impersonation, and spoofing', () => {
    expect(r.attack.map(t => t.id)).toEqual(expect.arrayContaining(['T1566.001', 'T1566.002', 'T1656', 'T1672', 'T1585.002']));
  });

  test('report and CSV never contain a live indicator', () => {
    const report = reportMD(r);
    const csvDefanged = iocCSV(r).split('\n').slice(1).map(l => l.split(',')[2]).join('\n');
    for (const i of r.iocs.filter(i => ['url', 'domain', 'email', 'ipv4'].includes(i.type))){
      expect(report).not.toContain(i.value);
      expect(csvDefanged).not.toContain(i.value);
    }
  });

  test('STIX bundle is valid JSON with one indicator per IOC', () => {
    const b = JSON.parse(stixBundle(r));
    expect(b.type).toBe('bundle');
    const inds = b.objects.filter(o => o.type === 'indicator');
    expect(inds).toHaveLength(r.iocs.length);
    expect(inds.every(o => o.pattern.startsWith('[') && o.indicator_types[0] === 'malicious-activity')).toBe(true);
  });
});
