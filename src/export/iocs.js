/* Indicator extraction, defanging, and CSV export. */
import { SHORTENERS } from '../data.js';
import { ipKind } from '../parse/received.js';
import { knownBrand, sameOrg } from '../checks/domains.js';

export function defang(type, v){
  if (type === 'url') return v.replace(/^http/i,'hxxp').replace(/^([a-z]+:\/\/)([^\/?#]+)/i, (m,sc,h) => sc + h.replace(/\./g,'[.]'));
  if (type === 'domain' || type === 'ipv4') return v.replace(/\./g,'[.]');
  if (type === 'email') return v.replace('@','[@]').replace(/\./g,'[.]');
  return v;
}
export function buildIOCs(r){
  const out = []; const seen = new Set();
  const add = (type, value, context) => {
    if (!value) return;
    const k = type + '|' + value.toLowerCase();
    if (seen.has(k)) return; seen.add(k);
    out.push({type, value, context});
  };
  r.hops.forEach((h,i) => {
    if (h.ip && (h.kind === 'public' || h.kind === 'documentation')) add(h.ip.includes(':') ? 'ipv6' : 'ipv4', h.ip, `Received hop ${i+1}${i === r.originIdx ? ', likely origin' : ''}`);
    if (i === r.originIdx && h.rdns && !knownBrand(h.rdns)) add('domain', h.rdns, 'Reverse DNS of origin IP');
  });
  if (r.xoip && ipKind(r.xoip) !== 'private') add(r.xoip.includes(':') ? 'ipv6' : 'ipv4', r.xoip, 'X-Originating-IP');
  if (r.from && r.from.addr.includes('@') && !knownBrand(r.from.domain)){ add('email', r.from.addr, 'From'); add('domain', r.from.domain, 'Sender domain'); }
  if (r.replyTo && r.replyTo.addr.includes('@') && !(r.from && sameOrg(r.replyTo.domain, r.from.domain) && knownBrand(r.from.domain))) add('email', r.replyTo.addr, 'Reply-To');
  if (r.retPath && r.retPath.addr.includes('@') && !knownBrand(r.retPath.domain)) add('email', r.retPath.addr.replace(/[<>]/g,''), 'Return-Path');
  r.links.forEach(l => {
    if (!/^(https?:)?\/\//i.test(l.href) && !/^https?:/i.test(l.href)) return;
    if (knownBrand(l.host) && !l.flags.length) return;
    add('url', l.href, l.shown === 'Form submits to' ? 'Form action' : 'Link in body');
    if (l.host && !knownBrand(l.host) && !SHORTENERS.has(l.host.toLowerCase())) add('domain', l.host.toLowerCase(), 'Link host');
  });
  r.atts.forEach(a => {
    add('filename', a.name, 'Attachment');
    if (a.sha256) add('sha256', a.sha256, `Attachment ${a.name}`);
    if (a.md5) add('md5', a.md5, `Attachment ${a.name}`);
  });
  return out;
}
// Values come from the email itself. A leading = + - @ (or tab/CR) would run as a formula in Excel or Sheets,
// so prefix a quote to keep it text (OWASP CSV injection guidance).
const csvCell = v => {
  v = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v;
};
export const iocCSV = r => ['type,value,defanged,context', ...r.iocs.map(i => [i.type, i.value, defang(i.type, i.value), i.context].map(csvCell).join(','))].join('\n');
