import { test, expect } from 'vitest';
import { cleanDomain, cleanIp, cleanUrl } from '../src/validate.js';

test.each([
  ['Example.COM.', 'example.com'], ['paypa1-secure.com', 'paypa1-secure.com'], ['example.co.uk', 'example.co.uk'], ['xn--exmple-cua.com', 'xn--exmple-cua.com'],
  ['localhost', null], ['-bad.com', null], ['bad-.com', null], ['a..com', null], ['exa mple.com', null], ['example.c0m', null], ['../etc/passwd', null], ['', null],
])('cleanDomain(%j) is %j', (v, out) => expect(cleanDomain(v)).toBe(out));

test.each([
  ['8.8.8.8', '8.8.8.8'], ['203.0.113.45', '203.0.113.45'], ['2001:4860:4860::8888', '2001:4860:4860::8888'],
  ['10.0.0.1', null], ['192.168.1.1', null], ['172.16.5.5', null], ['127.0.0.1', null], ['100.64.0.1', null], ['169.254.1.1', null],
  ['0.0.0.0', null], ['224.0.0.1', null], ['::1', null], ['fd00::1', null], ['fe80::1', null], ['256.1.1.1', null], ['01.2.3.4', null], ['1.2.3', null], ['abc', null],
])('cleanIp(%j) is %j', (v, out) => expect(cleanIp(v)).toBe(out));

test.each([
  ['https://bit.ly/abc', true], ['http://t.co/x', true],
  ['javascript:alert(1)', false], ['ftp://bit.ly/x', false], ['https://user@bit.ly/x', false], ['https://bit.ly:8080/x', false], ['not a url', false],
])('cleanUrl(%j) accepted: %s', (v, ok) => expect(!!cleanUrl(v)).toBe(ok));
