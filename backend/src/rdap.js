/* RDAP lookups: who registered a domain and when, and who owns an IP range. Free, no key.
   rdap.org redirects each query to the authoritative registry or regional internet registry. */
import { readJson, UpstreamError, UA } from './http.js';

const RDAP = 'https://rdap.org';
const DAY = 86400000;

// Drop a body we won't read. Cancelling an empty, already finished body can throw in workerd, so ignore that.
const discard = res => res.body?.cancel().catch(() => {});

async function rdap(path){
  const res = await fetch(`${RDAP}/${path}`, {
    headers: { accept: 'application/rdap+json, application/json', 'user-agent': UA },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404){ await discard(res); return { res, data: null }; }
  if (!res.ok){ await discard(res); throw new UpstreamError(`RDAP returned ${res.status}`); }
  return { res, data: await readJson(res) };
}

const eventDate = (data, action) => (data.events || []).find(e => e.eventAction === action)?.eventDate || null;
// vCard "fn" of the first entity with the given role, e.g. the registrar's or registrant's name.
function entityName(data, role){
  for (const e of data.entities || []){
    if (!(e.roles || []).includes(role)) continue;
    const fn = (e.vcardArray?.[1] || []).find(x => x[0] === 'fn');
    if (fn && fn[3]) return String(fn[3]);
  }
  return null;
}

export async function domainAge(domain, now = Date.now()){
  const { data } = await rdap(`domain/${domain}`)  // validated: letters, digits, dots, hyphens;
  if (!data) return { domain, found: false };
  const registered = eventDate(data, 'registration');
  const t = registered ? Date.parse(registered) : NaN;
  return {
    domain, found: true,
    registered: isNaN(t) ? null : new Date(t).toISOString(),
    ageDays: isNaN(t) ? null : Math.floor((now - t) / DAY),
    expires: eventDate(data, 'expiration'),
    registrar: entityName(data, 'registrar'),
  };
}

export async function ipOwner(ip){
  const { res, data } = await rdap(`ip/${ip}`)  // validated: rdap.org rejects an encoded IPv6 colon (%3A);
  if (!data) return { ip, found: false };
  const host = (() => { try { return new URL(res.url).hostname; } catch { return ''; } })();
  const rir = (host.match(/\b(arin|ripe|apnic|lacnic|afrinic)\b/) || [])[1] || null;
  return {
    ip, found: true,
    network: data.name || null,
    owner: entityName(data, 'registrant') || entityName(data, 'administrative') || null,
    country: data.country || null,
    range: data.startAddress && data.endAddress ? `${data.startAddress} - ${data.endAddress}` : null,
    rir: rir && rir.toUpperCase(),
  };
}
