/* Optional network checks through the Email X-Ray API (backend/). Off unless the analyst runs them.
   Only domains, the origin IP, and shortened links are sent; nothing else from the email leaves the browser. */
import { SHORTENERS, SEV_ORDER } from './data.js';
import { registrable, knownBrand } from './checks/domains.js';
import { analyzeLink } from './checks/links.js';
import { ipKind } from './parse/received.js';
import { scoreOf } from './analyze.js';

export const API_URL = (import.meta.env && import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const YOUNG_DAYS = 30;
const MAX_DOMAINS = 10, MAX_SHORT = 5;

// What would be sent, so the page can show it before anything leaves the browser.
export function networkTargets(r){
  const domains = new Map();
  const addDomain = (host, role) => {
    if (!host || ipKind(host.replace(/^\[|\]$/g, ''))) return;
    const d = registrable(host);
    if (!d.includes('.') || knownBrand(d) || SHORTENERS.has(d)) return;
    if (!domains.has(d)) domains.set(d, new Set());
    domains.get(d).add(role);
  };
  if (r.from && r.from.domain) addDomain(r.from.domain, 'sender');
  for (const l of r.links) if (l.host) addDomain(l.host, 'link');
  const origin = r.hops[r.originIdx];
  const ips = origin && origin.ip && origin.kind === 'public' ? [origin.ip] : [];
  const short = [...new Set(r.links.filter(l => l.host && SHORTENERS.has(l.host.toLowerCase().replace(/^www\./, ''))).map(l => l.href))];
  return {
    domains: [...domains].slice(0, MAX_DOMAINS).map(([domain, roles]) => ({domain, roles: [...roles]})),
    ips,
    shortLinks: short.slice(0, MAX_SHORT),
  };
}

async function get(path, fetchImpl){
  const res = await fetchImpl(API_URL + path, {headers: {accept: 'application/json'}});
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return {error: body.error || `The API answered ${res.status}.`};
  return body;
}

export async function runLookups(targets, fetchImpl = fetch){
  const settle = p => p.catch(() => ({error: 'Could not reach the API.'}));
  const [domains, ips, expanded] = await Promise.all([
    Promise.all(targets.domains.map(t => settle(get(`/domain/${encodeURIComponent(t.domain)}/age`, fetchImpl)).then(res => ({...t, ...res})))),
    Promise.all(targets.ips.map(ip => settle(get(`/ip/${encodeURIComponent(ip)}`, fetchImpl)))),
    Promise.all(targets.shortLinks.map(u => settle(get(`/url/expand?u=${encodeURIComponent(u)}`, fetchImpl)).then(res => ({short: u, ...res})))),
  ]);
  // Second round: how old is the site each shortened link really leads to?
  const known = new Set(targets.domains.map(t => t.domain));
  const extra = [...new Set(expanded.map(x => { try { return registrable(new URL(x.final).hostname); } catch { return null; } }))]
    .filter(d => d && d.includes('.') && !known.has(d) && !knownBrand(d) && !SHORTENERS.has(d) && !ipKind(d));
  const more = await Promise.all(extra.map(domain => settle(get(`/domain/${encodeURIComponent(domain)}/age`, fetchImpl)).then(res => ({domain, roles:['link'], ...res}))));
  return {domains: [...domains, ...more], ips, expanded};
}

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// Fold lookup results into the analysis: young-domain findings, and each shortened link's real destination
// checked like any other link. Recomputes the score. Safe to call once per analysis.
export function applyNetwork(r, net){
  r.network = net;
  for (const x of net.expanded){
    if (!x.final || x.final === x.short) continue;
    const l = analyzeLink({href: x.final, shown: `Behind ${x.short}`});
    l.expandedFrom = x.short;
    r.links.push(l);
    l.flags.forEach(([sev, t]) => r.F.push({area:'links', sev, title:t, hidden:true}));
  }
  for (const d of net.domains){
    if (!d.found || d.ageDays == null || d.ageDays >= YOUNG_DAYS) continue;
    const age = d.ageDays === 0 ? 'today' : `${plural(d.ageDays, 'day')} ago`;
    if (d.roles.includes('sender')) r.F.push({area:'sender', sev:'high', title:`Sender's domain was registered ${age}`, detail:`${d.domain} is brand new. Phishing domains are usually used within days of being registered.`});
    if (d.roles.includes('link')) for (const l of r.links) if (l.host && registrable(l.host) === d.domain){
      const flag = ['high', `The site was registered ${age}`];
      l.flags.push(flag); l.flags.sort((a,b) => SEV_ORDER[a[0]] - SEV_ORDER[b[0]]);
      r.F.push({area:'links', sev:flag[0], title:flag[1], hidden:true});
    }
  }
  r.links.sort((a,b) => (a.flags[0] ? SEV_ORDER[a.flags[0][0]] : 9) - (b.flags[0] ? SEV_ORDER[b.flags[0][0]] : 9));
  r.score = scoreOf(r.F, r.scoreInputs);
  return r;
}
