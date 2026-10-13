/* Link checks: extraction from text and HTML, then per-link red flags. Links are never fetched. */
import { SHORTENERS, FREE_HOSTS, BAD_TLDS, SEV_ORDER } from '../data.js';
import { lookalike, sameOrg, registrable, knownBrand } from './domains.js';

function hostFromText(t){
  if (!t) return null;
  const m = t.match(/^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[\/:?#]|$)/i);
  return m ? m[1].toLowerCase() : null;
}
export function extractLinks(texts, htmls){
  const links = []; const seen = new Set();
  const add = (href, shown, extra) => {
    if (!href) return;
    href = href.trim();
    if (/^(mailto|tel|cid):/i.test(href) || href.startsWith('#')) return;
    if (/^www\./i.test(href)) href = 'http://' + href;
    if (!/^(https?:|data:|javascript:|\/\/)/i.test(href)) return;
    const key = href + '|' + shown;
    if (seen.has(key)) return; seen.add(key);
    links.push({href, shown, ...extra});
  };
  let htmlText = '';
  for (const h of htmls){
    const doc = new DOMParser().parseFromString(h, 'text/html');
    doc.querySelectorAll('a[href]').forEach(a => add(a.getAttribute('href'), (a.textContent||'').replace(/\s+/g,' ').trim()));
    doc.querySelectorAll('form[action]').forEach(f => add(f.getAttribute('action'), 'Form submits to',
      {form:true, password:[...f.querySelectorAll('input')].some(i => (i.getAttribute('type') || '').toLowerCase() === 'password')}));
    htmlText += ' ' + (doc.body ? doc.body.textContent : '');
  }
  const plainUrls = new Set(links.map(l => l.href));
  for (const t of texts) (t.match(/https?:\/\/[^\s<>"')\]]+/gi) || []).forEach(u => { if (!plainUrls.has(u)) add(u, ''); });
  return {links, htmlText};
}
export function analyzeLink(l){
  const flags = [];
  if (/^javascript:/i.test(l.href)) flags.push(['high','Runs code when clicked']);
  if (/^data:/i.test(l.href)) flags.push(['high','Opens content embedded in the email itself, a trick for hiding fake sign-in pages']);
  let url = null;
  try { url = new URL(l.href.startsWith('//') ? 'https:' + l.href : l.href); } catch(e){}
  // Real companies send you to their site to sign in. A form inside the email itself is a harvesting trick.
  const dest = url && url.hostname ? url.hostname : 'an unknown address';
  if (l.form) flags.push(l.password ? ['high',`A sign-in form built into the email. Whatever you type, including your password, goes to ${dest}`]
    : ['medium',`A form built into the email sends whatever you type to ${dest}`]);
  if (url && /^https?:$/.test(url.protocol)){
    const h = url.hostname.toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith('[')) flags.push(['high','Goes straight to an IP address instead of a named website']);
    if (url.username) flags.push(['high',`Uses the "@" trick. Browsers ignore "${decodeURIComponent(url.username)}" and go to ${h}`]);
    const shownHost = hostFromText(l.shown);
    if (shownHost && !sameOrg(shownHost, h)) flags.push(['high',`The text says ${shownHost}, but the link goes to ${h}`]);
    const la = lookalike(h); if (la) flags.push([la.sev, `Pretends to be ${la.brand}: ${la.why}`]);
    if (h.includes('xn--')) flags.push(['medium','Uses encoded international characters that can mimic normal letters']);
    if (SHORTENERS.has(h) || SHORTENERS.has(registrable(h))) flags.push(['medium','A link shortener hides the real destination. Expanding it needs a network lookup, so this version can\'t see past it']);
    if (FREE_HOSTS.some(f => h === f || h.endsWith('.' + f))) flags.push(['medium','Hosted on a free site-builder, a favorite for throwaway phishing pages']);
    const tld = h.split('.').pop();
    if (BAD_TLDS.has(tld)) flags.push(['medium',`Ends in .${tld}, a domain ending scammers use heavily`]);
    if (h.split('.').length >= 5) flags.push(['low','Unusually long chain of subdomains']);
    if (url.protocol === 'http:') flags.push(['low','Not encrypted (http instead of https)']);
  }
  flags.sort((a,b) => SEV_ORDER[a[0]] - SEV_ORDER[b[0]]);
  return {...l, host: url ? url.hostname : null, flags};
}
// Button text that asks for credentials or opens a "document". Real senders point these at their own site.
const CTA = /^\W*(log ?in|sign ?in|verify|validate|confirm (your )?(e-?mail|account|identity|password)|re-?activate|unlock|restore (access|account)|keep (my |your |the )?(password|mailbox|account|e-?mail|access)|(update|change|reset) (my |your )?(password|account|payment|details)|upgrade (my |your )?(mailbox|storage|account)|release (the )?(messages|e-?mails|mails)|(review|view|access|open|download) (the |your )?(document|file|pdf|invoice|contract|message|shared file)s?)\b.{0,40}$/i;
function ctaFlag(l, senderDomain){
  if (!senderDomain || !l.host || !CTA.test(l.shown || '')) return null;
  const h = l.host.toLowerCase();
  if (sameOrg(h, senderDomain) || knownBrand(h)) return null;
  return ['medium', `"${l.shown.trim()}" leads to ${h}, which isn't the sender's site`];
}
export function checkLinks(texts, htmls, senderDomain){
  const {links, htmlText} = extractLinks(texts, htmls);
  const analyzed = links.map(l => {
    const a = analyzeLink(l);
    const cta = ctaFlag(a, senderDomain);
    if (cta && !a.flags.some(f => f[0] === 'high')){ a.flags.push(cta); a.flags.sort((x,y) => SEV_ORDER[x[0]] - SEV_ORDER[y[0]]); }
    return a;
  }).sort((a,b) => (a.flags[0] ? SEV_ORDER[a.flags[0][0]] : 9) - (b.flags[0] ? SEV_ORDER[b.flags[0][0]] : 9));
  const findings = analyzed.flatMap(l => l.flags.map(([sev, t]) => ({area:'links', sev, title:t, hidden:true})));
  return {findings, links: analyzed, htmlText};
}
