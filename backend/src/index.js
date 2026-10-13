/* Email X-Ray API: network lookups the browser shouldn't make itself.
   Logs record only the route, status, and timing, never the domain, IP, or URL looked up. */
import { corsHeaders, json, UpstreamError } from './http.js';
import { cleanDomain, cleanIp, cleanUrl } from './validate.js';
import { domainAge, ipOwner } from './rdap.js';
import { expand, isShortener } from './expand.js';

const HOUR = 3600;
const ROUTES = [
  { name: 'domain-age', re: /^\/domain\/([^/]+)\/age$/, ttl: 24 * HOUR, run: async (m) => {
    const d = cleanDomain(decodeURIComponent(m[1]));
    return d ? domainAge(d) : bad('Send a registrable domain name, such as example.com.');
  } },
  { name: 'ip-owner', re: /^\/ip\/([^/]+)$/, ttl: 24 * HOUR, run: async (m) => {
    const ip = cleanIp(decodeURIComponent(m[1]));
    return ip ? ipOwner(ip) : bad('Send a public IPv4 or IPv6 address.');
  } },
  { name: 'url-expand', re: /^\/url\/expand$/, ttl: HOUR, run: async (m, url) => {
    const u = cleanUrl(url.searchParams.get('u'));
    if (!u) return bad('Send an http or https link as ?u=, without a username or port.');
    if (!isShortener(u.hostname)) return bad('Only links on known shortener services are expanded.');
    return expand(u);
  } },
  { name: 'health', re: /^\/health$/, ttl: 0, run: async () => ({ ok: true }) },
];

class BadRequest extends Error {}
const bad = msg => { throw new BadRequest(msg); };

async function handle(request, env, ctx){
  const url = new URL(request.url);
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return { route: 'preflight', res: new Response(null, { status: 204, headers: cors }) };
  if (request.method !== 'GET') return { route: 'method', res: json({ error: 'Only GET is supported.' }, 405, { ...cors, allow: 'GET, OPTIONS' }) };

  const route = ROUTES.find(r => r.re.test(url.pathname));
  if (!route) return { route: 'not-found', res: json({ error: 'Unknown endpoint.' }, 404, cors) };

  // Keyed by client IP: the API is anonymous, so there is no better identifier. Limits are per Cloudflare location.
  if (env.RATE_LIMITER && route.name !== 'health'){
    const { success } = await env.RATE_LIMITER.limit({ key: `ip:${request.headers.get('cf-connecting-ip') || 'unknown'}` });
    if (!success) return { route: route.name, res: json({ error: 'Too many lookups. Wait a minute and try again.' }, 429, { ...cors, 'retry-after': '60' }) };
  }

  // Cache successful lookups by path and query, without the Origin-dependent CORS headers.
  const cache = route.ttl && globalThis.caches ? caches.default : null;
  const key = new Request(url.origin + url.pathname + url.search);
  if (cache){
    const hit = await cache.match(key);
    if (hit){
      const res = new Response(hit.body, hit);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return { route: route.name, res, cached: true };
    }
  }
  try {
    const body = await route.run(url.pathname.match(route.re), url);
    if (cache) ctx.waitUntil(cache.put(key, json(body, 200, { 'cache-control': `public, max-age=${route.ttl}` })));
    return { route: route.name, res: json(body, 200, { ...cors, 'cache-control': route.ttl ? `public, max-age=${route.ttl}` : 'no-store' }) };
  } catch (e){
    if (e instanceof BadRequest) return { route: route.name, res: json({ error: e.message }, 400, cors) };
    const upstream = e instanceof UpstreamError || e?.name === 'TimeoutError';
    return { route: route.name, error: e?.message || String(e), res: json({ error: upstream ? 'The lookup service did not answer. Try again later.' : 'Lookup failed.' }, upstream ? 502 : 500, cors) };
  }
}

export default {
  async fetch(request, env, ctx){
    const t0 = Date.now();
    let out;
    try { out = await handle(request, env, ctx); }
    catch (e){ out = { route: 'unhandled', error: e?.message || String(e), res: json({ error: 'Lookup failed.' }, 500) }; }
    const log = { message: 'request', route: out.route, status: out.res.status, ms: Date.now() - t0, cached: !!out.cached };
    if (out.error){ log.error = out.error; console.error(JSON.stringify(log)); } else console.log(JSON.stringify(log));
    return out.res;
  },
};
