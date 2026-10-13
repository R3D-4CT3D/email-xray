import { test, expect } from 'vitest';
import { networkTargets, runLookups, applyNetwork } from '../src/network.js';
import { buildIOCs } from '../src/export/iocs.js';
import { scan } from './helpers.js';

// A fake API: path -> JSON body. Records what the page sent.
function fakeApi(table){
  const sent = [];
  const impl = async path => {
    sent.push(path);
    const body = table[path];
    return body ? new Response(JSON.stringify(body), {status: 200}) : new Response(JSON.stringify({error: 'nope'}), {status: 502});
  };
  return {impl, sent};
}

test('only domains, the public origin IP, and shortened links are sent, and never brand domains', () => {
  const t = networkTargets(scan('paypal-lookalike.eml'));
  expect(t.domains).toEqual([{domain:'paypa1-secure.com', roles:['sender']}, {domain:'account-verify.top', roles:['link']}]);
  expect(t.ips).toEqual([]); // the fixture's origin is in a documentation range
  expect(t.shortLinks).toEqual(['https://bit.ly/3xPpL0g']);
  expect(networkTargets(scan('legit-newsletter.eml')).domains.map(d => d.domain)).toEqual(['examplestore.com']);
});

test('a public origin IP is included', () => {
  const r = scan('paypal-lookalike.eml');
  r.hops[r.originIdx] = {...r.hops[r.originIdx], ip:'8.8.8.8', kind:'public'};
  expect(networkTargets(r).ips).toEqual(['8.8.8.8']);
});

test('young domains become high findings, and a shortened link is followed to its real destination', async () => {
  const r = scan('paypal-lookalike.eml');
  const before = r.F.length;
  const {impl, sent} = fakeApi({
    '/domain/paypa1-secure.com/age': {domain:'paypa1-secure.com', found:true, ageDays:3},
    '/domain/account-verify.top/age': {domain:'account-verify.top', found:true, ageDays:400},
    '/url/expand?u=https%3A%2F%2Fbit.ly%2F3xPpL0g': {final:'https://secure-paypal-login.example/verify', stopped:'left-shorteners'},
    '/domain/secure-paypal-login.example/age': {domain:'secure-paypal-login.example', found:true, ageDays:0},
  });
  const net = await runLookups(networkTargets(r), impl);
  expect(sent).toContain('/domain/secure-paypal-login.example/age'); // second round for the expanded destination
  applyNetwork(r, net);

  expect(r.F.find(f => f.area === 'sender' && /registered/.test(f.title)).title).toBe("Sender's domain was registered 3 days ago");
  const behind = r.links.find(l => l.expandedFrom === 'https://bit.ly/3xPpL0g');
  expect(behind.href).toBe('https://secure-paypal-login.example/verify');
  expect(behind.flags.map(f => f[1])).toEqual(expect.arrayContaining(['The site was registered today', expect.stringMatching(/^Pretends to be PayPal/)]));
  expect(r.links.some(l => l.host === 'paypal.com.account-verify.top' && l.flags.some(f => /registered/.test(f[1])))).toBe(false); // 400 days old
  expect(r.F.length).toBeGreaterThan(before);
  expect(buildIOCs(r).map(i => i.value)).toContain('https://secure-paypal-login.example/verify');
});

test('a young domain adds a high finding wherever it appears', async () => {
  const r = scan('form-harvest.eml');
  const before = r.score;
  const {impl} = fakeApi({'/domain/it-helpdesk.example/age': {domain:'it-helpdesk.example', found:true, ageDays:5}});
  applyNetwork(r, await runLookups(networkTargets(r), impl));
  // it-helpdesk.example sends the email and hosts one of its forms: one sender finding, one link finding.
  expect(r.score).toBe(before + 50);
});

test('API errors are reported per lookup and change nothing', async () => {
  const r = scan('paypal-lookalike.eml');
  const score = r.score, n = r.F.length;
  const net = await runLookups(networkTargets(r), fakeApi({}).impl);
  expect(net.domains.every(d => d.error)).toBe(true);
  applyNetwork(r, net);
  expect(r.score).toBe(score);
  expect(r.F.length).toBe(n);
});
