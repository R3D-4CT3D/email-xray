import { test, expect } from 'vitest';
import { isOle, msgToRaw } from '../src/parse/msg.js';
import MsgReader from '../src/parse/msgreader.js';
import { analyze } from '../src/analyze.js';
import { fixtureBytes } from './helpers.js';

test('detects OLE containers by magic bytes', () => {
  expect(isOle(fixtureBytes('msgreader-attach-sample.msg'))).toBe(true);
  expect(isOle(fixtureBytes('paypal-lookalike.eml'))).toBe(false);
});

test('a received .msg becomes raw RFC 822 with its transport headers', () => {
  const {raw, note} = msgToRaw(MsgReader, fixtureBytes('msgreader-attach-sample.msg'));
  expect(note).toBe('');
  const r = analyze(raw);
  expect(r.subject).toBe('Attach sample.eml');
  expect(r.from.addr).toBe('hmailuser@hmailserver.test');
  expect(r.hops.length).toBeGreaterThan(0);
  expect(r.bodyText).toBe('Sent from my Windows 10');
  expect(r.atts.map(a => a.name)).toEqual(['sample.eml (555 バイト).msg']);
  expect(r.atts[0].size).toBe(11264);
});
