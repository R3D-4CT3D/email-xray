/* Responses, CORS, and bounded body reads. */

// Sent on every upstream request. Workers fetch sends no User-Agent by default, and rdap.org answers 403 without one.
export const UA = 'EmailXRay/1.0 (+https://github.com/R3D-4CT3D/email-xray)';

export function corsHeaders(request, env){
  const origin = request.headers.get('origin');
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const h = { 'vary': 'Origin' };
  if (origin && allowed.includes(origin)){
    h['access-control-allow-origin'] = origin;
    h['access-control-allow-methods'] = 'GET, OPTIONS';
    h['access-control-max-age'] = '86400';
  }
  return h;
}

export function json(body, status = 200, extra = {}){
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff', ...extra },
  });
}

// Upstream JSON with a size cap, so a hostile or broken server can't make us buffer without limit.
export async function readJson(res, maxBytes = 256 * 1024){
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks = []; let size = 0;
  for (;;){
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes){ await reader.cancel(); throw new Error('upstream response too large'); }
    chunks.push(value);
  }
  const all = new Uint8Array(size); let off = 0;
  for (const c of chunks){ all.set(c, off); off += c.length; }
  return JSON.parse(new TextDecoder().decode(all));
}

export class UpstreamError extends Error {}
