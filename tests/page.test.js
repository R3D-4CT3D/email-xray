// The CLAUDE.md smoke test, automated: load the page, click "Try a sample phish", read the verdict.
import { test, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import { fixtureBytes } from './helpers.js';

// Wait for what the page shows, not a fixed delay: the .msg chunk can take a while to load on a cold CI runner.
const until = check => vi.waitFor(check, {timeout: 10000, interval: 20});

beforeAll(async () => {
  const html = fs.readFileSync('src/index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  window.matchMedia = () => ({ matches: true });
  HTMLElement.prototype.scrollIntoView = () => {};
  await import('../src/main.js');
});

test('sample phish renders as likely phishing with route, lookalike, and attachment', async () => {
  document.querySelector('#sample').click();
  const out = document.querySelector('#results');
  await until(() => expect(out.hidden).toBe(false));
  expect(out.querySelector('.verdict h2').textContent).toBe('Likely phishing');
  expect(out.querySelectorAll('.route .hop')).toHaveLength(4); // 3 hops plus the inbox
  expect(out.textContent).toContain('Sender\'s domain imitates PayPal');
  expect(out.textContent).toContain('Invoice_88231.pdf.html');
});

test('investigator toggle switches the body class', () => {
  document.querySelector('.modebar [data-mode="inv"]').click();
  expect(document.body.classList.contains('inv')).toBe(true);
  document.querySelector('.modebar [data-mode="standard"]').click();
  expect(document.body.classList.contains('inv')).toBe(false);
});

test('empty input shows the paste hint', async () => {
  document.querySelector('#raw').value = '';
  document.querySelector('#go').click();
  await until(() => expect(document.querySelector('#err').hidden).toBe(false));
});

test('a .msg file opened through the picker is converted and scanned', async () => {
  // jsdom's File has no arrayBuffer(), so hand loadFile a file-like object, as browsers provide.
  const bytes = fixtureBytes('msgreader-attach-sample.msg');
  const file = { name: 'mail.msg', arrayBuffer: async () => bytes.buffer };
  const input = document.querySelector('#file');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  await until(() => expect(document.querySelector('#results').textContent).toContain('Attach sample.eml'));
  expect(document.querySelector('#err').hidden).toBe(true);
  expect(document.querySelector('#raw').value).toMatch(/^Received: from H270/m);
});
