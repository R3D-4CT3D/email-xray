/* Registrable domains and brand impersonation detection. */
import { BRANDS, FUZZY_SKIP, MULTI } from '../data.js';

export function registrable(h){
  h = (h||'').toLowerCase().replace(/\.$/,'').replace(/^\[|\]$/g,'');
  const p = h.split('.');
  if (p.length <= 2) return h;
  return MULTI.has(p.slice(-2).join('.')) ? p.slice(-3).join('.') : p.slice(-2).join('.');
}
const labelOf = h => registrable(h).split('.')[0];
export const sameOrg = (a,b) => !!a && !!b && registrable(a) === registrable(b);
function skel(s){
  return s.toLowerCase().replace(/rn/g,'m').replace(/vv/g,'w').replace(/cl/g,'d')
    .replace(/0/g,'o').replace(/[1!|i]/g,'l').replace(/3/g,'e').replace(/4/g,'a')
    .replace(/5/g,'s').replace(/7/g,'t').replace(/8/g,'b').replace(/9/g,'g').replace(/-/g,'');
}
function lev(a,b){
  const d = Array.from({length:a.length+1},(_,i)=>[i]);
  for (let j=1;j<=b.length;j++) d[0][j] = j;
  for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++)
    d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (a[i-1]===b[j-1]?0:1));
  return d[a.length][b.length];
}
export const isBrandDomain = (h, doms) => doms.some(d => h === d || h.endsWith('.' + d));
export const knownBrand = h => !!h && BRANDS.some(([,d]) => isBrandDomain(h.toLowerCase(), d));
export function lookalike(host){
  if (!host) return null;
  host = host.toLowerCase().replace(/\.$/,'');
  for (const [,doms] of BRANDS) if (isBrandDomain(host, doms)) return null;
  const reg = registrable(host), lab = labelOf(host), sk = skel(lab);
  const subLabels = host.split('.').slice(0, -reg.split('.').length);
  for (const [brand, doms] of BRANDS){
    for (const d of doms){
      const bl = d.split('.')[0];
      if (bl.length < 3) continue;
      if (lab === bl && bl.length >= 5) return {brand, sev:'medium', why:`uses the name "${bl}" with a different ending (${reg}) than ${brand}'s real site, ${d}`};
      if (lab !== bl && sk === skel(bl)) return {brand, sev:'high', why:`"${lab}" swaps in lookalike characters to pass as "${bl}"`};
      if (bl.length >= 5 && !FUZZY_SKIP.has(bl) && lab !== bl && lev(lab, bl) <= (bl.length >= 8 ? 2 : 1)) return {brand, sev:'high', why:`"${lab}" is a near-misspelling of "${bl}"`};
      if (bl.length >= 5 && lab !== bl && lab.includes(bl)) return {brand, sev:'high', why:`stuffs "${bl}" into an unrelated domain (${reg})`};
      if (bl.length >= 5 && sk.includes(skel(bl))) return {brand, sev:'high', why:`hides a disguised "${bl}" inside "${lab}" using lookalike characters`};
      if (bl.length >= 4 && subLabels.includes(bl)) return {brand, sev:'high', why:`puts "${bl}" in front as a decoy. The real owner is ${reg}`};
    }
  }
  return null;
}
