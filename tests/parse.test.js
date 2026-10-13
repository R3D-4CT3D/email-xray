import { describe, test, expect } from 'vitest';
import { splitHeadBody, decodeWords, walkParts, qpBytes, decodeBytes } from '../src/parse/mime.js';
import { parseHeaders, param, parseAddr } from '../src/parse/headers.js';
import { parseReceived, ipKind } from '../src/parse/received.js';
import { analyze } from '../src/analyze.js';
import { fixture, scan } from './helpers.js';

describe('MIME parsing', () => {
  test('CRLF and LF line endings parse the same', () => {
    const lf = fixture('paypal-lookalike.eml');
    const a = analyze(lf), b = analyze(lf.replace(/\n/g, '\r\n'));
    expect(b.score).toBe(a.score);
    expect(b.F).toEqual(a.F);
  });
  test('folded headers are unfolded', () => {
    const hs = parseHeaders('Subject: one\n two\nFrom: a@b.example');
    expect(hs).toEqual([{name:'Subject', value:'one two'}, {name:'From', value:'a@b.example'}]);
  });
  test('encoded words decode in base64 and Q forms', () => {
    expect(decodeWords('=?UTF-8?B?QWN0aW9uIHJlcXVpcmVk?=')).toBe('Action required');
    expect(decodeWords('=?UTF-8?Q?security=40paypal=2Ecom?=')).toBe('security@paypal.com');
    expect(decodeWords('=?UTF-8?Q?a_b?= =?UTF-8?Q?c?=')).toBe('a bc');
  });
  test('quoted-printable honors the declared charset', () => {
    expect(decodeBytes(qpBytes('month=92s'), 'windows-1252')).toBe('month’s');
    expect(scan('legit-newsletter.eml').bodyText).toContain('this month’s picks');
  });
  test('header parameters, quoted and bare', () => {
    expect(param('multipart/mixed; boundary="==outer=="', 'boundary')).toBe('==outer==');
    expect(param('text/plain; charset=UTF-8', 'charset')).toBe('UTF-8');
    expect(param('text/plain', 'charset')).toBeNull();
  });
  test('RFC 2231 extended parameters and continuations', () => {
    expect(param("attachment; filename*=UTF-8''scan%20report.html", 'filename')).toBe('scan report.html');
    expect(param("attachment; filename=\"fallback.txt\"; filename*=UTF-8''real.exe", 'filename')).toBe('real.exe');
    expect(param("attachment; filename*0*=UTF-8''%E8%AB%8B%E6%B1%82; filename*1=\"_2026.pdf.exe\"", 'filename')).toBe('\u8acb\u6c42_2026.pdf.exe');
    expect(param("attachment; filename*=iso-8859-1'en'r%E9sum%E9.pdf", 'filename')).toBe('r\u00e9sum\u00e9.pdf');
  });
  test('nested multipart separates text, HTML, and attachments', () => {
    const {head, body} = splitHeadBody(fixture('paypal-lookalike.eml'));
    const acc = {text:[], html:[], attachments:[]};
    walkParts(parseHeaders(head), body, acc, 0);
    expect(acc.text).toHaveLength(1);
    expect(acc.html).toHaveLength(1);
    expect(acc.attachments.map(a => a.name)).toEqual(['Invoice_88231.pdf.html']);
  });
  test('rejects pasted text with no headers', () => {
    expect(() => analyze('Hi, just the message body.')).toThrow('nohdr');
  });
});

describe('addresses', () => {
  test('display name and address split', () => {
    expect(parseAddr('"PayPal Service" <service@paypa1-secure.com>')).toEqual({name:'PayPal Service', addr:'service@paypa1-secure.com', domain:'paypa1-secure.com'});
    expect(parseAddr('bare@example.com')).toEqual({name:'', addr:'bare@example.com', domain:'example.com'});
  });
});

describe('Received headers', () => {
  test('pulls HELO, rDNS, IP, receiver, protocol, and time', () => {
    const h = parseReceived('from mail.paypa1-secure.com (vps-45.cheaphost.example [203.0.113.45]) by mx.google.com with ESMTPS id a9si1123 for <you@example.com>; Tue, 6 Oct 2026 07:42:18 -0700 (PDT)');
    expect(h).toMatchObject({from:'mail.paypa1-secure.com', rdns:'vps-45.cheaphost.example', ip:'203.0.113.45', by:'mx.google.com', proto:'ESMTPS', kind:'documentation'});
    expect(h.date.toISOString()).toBe('2026-10-06T14:42:18.000Z');
  });
  test('IPv6 literal', () => {
    expect(parseReceived('from x ([IPv6:2001:db8::5]) by y; Tue, 6 Oct 2026 07:42:18 +0000').ip).toBe('2001:db8::5');
  });
  test.each([
    ['10.1.2.3','private'], ['172.20.0.1','private'], ['192.168.1.1','private'], ['100.64.0.1','private'],
    ['127.0.0.1','loopback'], ['::1','loopback'], ['fd00::1','private'],
    ['203.0.113.9','documentation'], ['2001:db8::1','documentation'], ['8.8.8.8','public'], ['999.1.1.1', null],
  ])('ipKind(%s) is %s', (ip, kind) => expect(ipKind(ip)).toBe(kind));
});
