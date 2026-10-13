/* Shortened-link expansion. Only known shortener hosts are ever requested, with HEAD and no body.
   The first address outside a shortener is reported but never visited, so the phishing page
   never sees a request from us and this can't be used to fetch arbitrary sites. */
import { SHORTENERS } from '../../src/data.js';
import { cleanUrl } from './validate.js';
import { UA } from './http.js';

const MAX_HOPS = 5;
export const isShortener = host => SHORTENERS.has(host.toLowerCase().replace(/^www\./, ''));

async function peek(url){
  const opts = { redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(5000) };
  let res = await fetch(url, { ...opts, method: 'HEAD' });
  // A few shorteners refuse HEAD. GET is still only to the shortener; the body is discarded unread.
  if (res.status === 405 || res.status === 501){ res = await fetch(url, { ...opts, method: 'GET' }); }
  await res.body?.cancel();
  return { status: res.status, location: res.headers.get('location') };
}

export async function expand(start){
  const hops = [];
  let current = start;
  for (let i = 0; i < MAX_HOPS; i++){
    let r;
    try { r = await peek(current.href); }
    catch (e){ return { start: start.href, hops, final: current.href, stopped: 'error' }; }
    hops.push({ url: current.href, status: r.status });
    if (r.status < 300 || r.status >= 400 || !r.location) return { start: start.href, hops, final: current.href, stopped: 'no-redirect' };
    let next;
    try { next = new URL(r.location, current); } catch { return { start: start.href, hops, final: r.location, stopped: 'bad-location' }; }
    const safe = cleanUrl(next.href);
    if (!safe || !isShortener(safe.hostname)) return { start: start.href, hops, final: next.href, stopped: 'left-shorteners' };
    current = safe;
  }
  return { start: start.href, hops, final: current.href, stopped: 'max-hops' };
}
