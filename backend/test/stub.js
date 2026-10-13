import { vi } from 'vitest';

// Replace global fetch with a table of URL -> response. Records every request so tests can assert what was contacted.
export function stubFetch(table){
  const calls = [];
  vi.stubGlobal('fetch', async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', redirect: opts.redirect, ua: opts.headers?.['user-agent'] });
    const hit = table[String(url)];
    if (!hit) throw new Error(`unexpected fetch to ${url}`);
    const r = typeof hit === 'function' ? hit(opts) : hit;
    const res = new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status || 200, headers: r.headers || {} });
    if (r.finalUrl) Object.defineProperty(res, 'url', { value: r.finalUrl });
    return res;
  });
  return calls;
}
