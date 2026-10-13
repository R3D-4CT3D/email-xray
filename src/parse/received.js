/* Received headers and IP classification. */

export function ipKind(ip){
  if (!ip) return null;
  if (ip.includes(':')){
    const l = ip.toLowerCase();
    if (l === '::1') return 'loopback';
    if (/^(fc|fd|fe80)/.test(l)) return 'private';
    if (/^2001:db8/.test(l)) return 'documentation';
    return 'public';
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => isNaN(n) || n > 255)) return null;
  if (p[0] === 127) return 'loopback';
  if (p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 169 && p[1] === 254) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127)) return 'private';
  if ((p[0] === 192 && p[1] === 0 && p[2] === 2) || (p[0] === 198 && p[1] === 51 && p[2] === 100) || (p[0] === 203 && p[1] === 0 && p[2] === 113)) return 'documentation';
  return 'public';
}
export const KIND_LABEL = {private:'internal network', loopback:'same machine', documentation:'public (example range)', public:'public internet'};

export function parseReceived(v){
  const semi = v.lastIndexOf(';');
  const dateStr = semi >= 0 ? v.slice(semi+1).trim() : '';
  const main = semi >= 0 ? v.slice(0, semi) : v;
  const byIdx = main.search(/\bby\s/i);
  const fromPart = byIdx >= 0 ? main.slice(0, byIdx) : (/^\s*from\b/i.test(main) ? main : '');
  const from = (fromPart.match(/\bfrom\s+([^\s(;]+)/i) || [])[1] || null;
  const by = (main.match(/\bby\s+([^\s(;]+)/i) || [])[1] || null;
  const proto = (main.match(/\bwith\s+([A-Za-z0-9-]+)/i) || [])[1] || null;
  let ip = null;
  const m1 = fromPart.match(/\[(?:IPv6:)?([0-9a-fA-F:.]+)\]/);
  if (m1) ip = m1[1];
  else { const m2 = fromPart.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/); if (m2) ip = m2[1]; }
  const rdns = (fromPart.match(/\(\s*([a-z0-9-]+(?:\.[a-z0-9-]+)+)[\s\[)]/i) || [])[1] || null;
  let date = null;
  if (dateStr){ const d = new Date(dateStr.replace(/\s*\([^)]*\)\s*$/,'')); if (!isNaN(d)) date = d; }
  return {from, by, proto, ip, kind: ipKind(ip), rdns: rdns && rdns !== from ? rdns : null, date};
}
