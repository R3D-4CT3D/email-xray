import { test, expect, afterEach, vi } from 'vitest';
import { expand } from '../src/expand.js';
import { stubFetch } from './stub.js';

afterEach(() => vi.unstubAllGlobals());
const redirect = to => ({ status: 301, headers: { location: to } });

test('follows shortener hops and stops before the real destination, without requesting it', async () => {
  const calls = stubFetch({
    'https://bit.ly/abc': redirect('https://tinyurl.com/xyz'),
    'https://tinyurl.com/xyz': redirect('https://paypal.com.account-verify.top/login'),
  });
  const r = await expand(new URL('https://bit.ly/abc'));
  expect(r).toEqual({ start: 'https://bit.ly/abc', final: 'https://paypal.com.account-verify.top/login', stopped: 'left-shorteners',
    hops: [{ url: 'https://bit.ly/abc', status: 301 }, { url: 'https://tinyurl.com/xyz', status: 301 }] });
  expect(calls.map(c => c.url)).toEqual(['https://bit.ly/abc', 'https://tinyurl.com/xyz']);
  expect(calls.every(c => c.method === 'HEAD' && c.redirect === 'manual')).toBe(true);
});

test('relative Location headers resolve against the shortener', async () => {
  stubFetch({ 'https://bit.ly/a': redirect('/b'), 'https://bit.ly/b': redirect('https://evil.example/') });
  expect((await expand(new URL('https://bit.ly/a'))).final).toBe('https://evil.example/');
});

test('falls back to GET when a shortener rejects HEAD', async () => {
  const calls = stubFetch({ 'https://t.co/x': opts => opts.method === 'HEAD' ? { status: 405 } : redirect('https://evil.example/') });
  expect((await expand(new URL('https://t.co/x'))).final).toBe('https://evil.example/');
  expect(calls.map(c => c.method)).toEqual(['HEAD', 'GET']);
});

test('a redirect to a credentialed or odd-port URL is reported, not followed', async () => {
  const calls = stubFetch({ 'https://bit.ly/a': redirect('https://bit.ly@evil.example:8443/') });
  const r = await expand(new URL('https://bit.ly/a'));
  expect(r.stopped).toBe('left-shorteners');
  expect(calls).toHaveLength(1);
});

test('redirect loops stop after five hops', async () => {
  stubFetch({ 'https://bit.ly/a': redirect('https://bit.ly/b'), 'https://bit.ly/b': redirect('https://bit.ly/a') });
  const r = await expand(new URL('https://bit.ly/a'));
  expect(r.stopped).toBe('max-hops');
  expect(r.hops).toHaveLength(5);
});

test('a dead short link reports where it stopped', async () => {
  stubFetch({ 'https://bit.ly/gone': { status: 404 } });
  expect(await expand(new URL('https://bit.ly/gone'))).toMatchObject({ final: 'https://bit.ly/gone', stopped: 'no-redirect' });
});
