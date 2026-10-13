// The Network checks block, driven through the real page against a fake API.
import { test, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';

const until = check => vi.waitFor(check, {timeout: 10000, interval: 20});
const sent = [];
const API = {
  '/domain/paypa1-secure.com/age': {domain:'paypa1-secure.com', found:true, registered:'2026-10-09T00:00:00.000Z', ageDays:3, registrar:'Example Registrar'},
  '/domain/account-verify.top/age': {domain:'account-verify.top', found:true, registered:'2025-01-01T00:00:00.000Z', ageDays:650},
  '/url/expand?u=https%3A%2F%2Fbit.ly%2F3xPpL0g': {final:'https://secure-paypal-login.example/verify', stopped:'left-shorteners'},
  '/domain/secure-paypal-login.example/age': {domain:'secure-paypal-login.example', found:true, ageDays:1},
};

beforeAll(async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.test/');
  vi.stubGlobal('fetch', async url => {
    const path = String(url).replace('https://api.test', '');
    sent.push(path);
    return new Response(JSON.stringify(API[path] || {error:'nope'}), {status: API[path] ? 200 : 502});
  });
  const html = fs.readFileSync('src/index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  window.matchMedia = () => ({ matches: true });
  HTMLElement.prototype.scrollIntoView = () => {};
  await import('../src/main.js');
});

const section = title => [...document.querySelectorAll('#results section.block')].find(s => s.querySelector('h2').textContent.startsWith(title));

test('nothing is sent until the analyst asks, and the list of what will be sent is shown first', async () => {
  document.querySelector('#sample').click();
  await until(() => expect(section('Network checks')).toBeTruthy());
  expect(sent).toEqual([]);
  const items = [...section('Network checks').querySelectorAll('.sendlist li')].map(li => li.textContent);
  expect(items).toEqual(['paypa1-secure[.]com (sender domain)', 'account-verify[.]top (link domain)', 'hxxps://bit[.]ly/3xPpL0g (shortened link)']);
});

test('running the checks adds findings, follows the short link, and re-renders in place', async () => {
  const before = Number(document.querySelector('.v-score .num').textContent);
  section('Network checks').querySelector('button').click();
  await until(() => expect(section('Network checks').querySelector('table')).toBeTruthy());
  expect(sent.sort()).toEqual(Object.keys(API).sort());
  const net = section('Network checks');
  expect(net.textContent).toContain('3 days (new)');
  expect(net.textContent).toContain('hxxps://secure-paypal-login[.]example/verify');
  expect(net.querySelector('button').disabled).toBe(true);
  expect(document.querySelector('#results').textContent).toContain("Sender's domain was registered 3 days ago");
  expect(section('Links').textContent).toContain('Behind https://bit.ly/3xPpL0g');
  expect(Number(document.querySelector('.v-score .num').textContent)).toBeGreaterThanOrEqual(before);
});
