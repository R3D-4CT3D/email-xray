/* Header lines, header parameters, and address fields. */

export function parseHeaders(head){
  const out = []; let cur = null;
  for (const line of head.split('\n')){
    if (/^[ \t]/.test(line) && cur){ cur.value += ' ' + line.trim(); continue; }
    const m = line.match(/^([!-9;-~]+):[ \t]?(.*)$/);
    if (m){ cur = {name:m[1], value:m[2].trim()}; out.push(cur); } else cur = null;
  }
  return out;
}
export const hAll = (hs,n) => hs.filter(h => h.name.toLowerCase() === n).map(h => h.value);
export const hOne = (hs,n) => hAll(hs,n)[0] || '';
// RFC 2231 extended value: charset'language'percent-encoded bytes. Unencoded continuation pieces pass through.
function decode2231(pieces){
  let cs = 'utf-8';
  const bytes = [];
  pieces.forEach(([val, enc], i) => {
    if (enc && i === 0){ const m = val.match(/^([^']*)'[^']*'(.*)$/); if (m){ cs = m[1] || cs; val = m[2]; } }
    for (let j=0;j<val.length;j++){
      if (enc && val[j] === '%' && /^[0-9A-Fa-f]{2}$/.test(val.substr(j+1,2))){ bytes.push(parseInt(val.substr(j+1,2),16)); j += 2; }
      else bytes.push(...new TextEncoder().encode(val[j]));
    }
  });
  try { return new TextDecoder(cs.toLowerCase()).decode(new Uint8Array(bytes)); }
  catch(e){ return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); }
}
export function param(v, key){
  v = v || '';
  const val = m => m[2] !== undefined ? m[2] : m[1];
  // key*0*=utf-8''Long%20na; key*1*=me.pdf  (continuations, in numeric order)
  const cont = [...v.matchAll(new RegExp(';\\s*' + key + '\\*(\\d+)(\\*?)\\s*=\\s*("([^"]*)"|[^;\\s]+)','gi'))];
  if (cont.length) return decode2231(cont.sort((a,b) => a[1] - b[1]).map(m => [val(m.slice(2)), !!m[2]]));
  // key*=utf-8''name.pdf  (preferred over a plain key= when both are present)
  const ext = v.match(new RegExp(';\\s*' + key + '\\*\\s*=\\s*("([^"]*)"|[^;\\s]+)','i'));
  if (ext) return decode2231([[val(ext), true]]);
  const m = v.match(new RegExp(';\\s*' + key + '\\s*=\\s*("([^"]*)"|[^;\\s]+)','i'));
  return m ? val(m) : null;
}
export function parseAddr(s){
  if (!s) return null;
  s = s.trim();
  let name = '', addr = s;
  const m = s.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (m){ name = m[1].replace(/^"|"$/g,'').trim(); addr = m[2].trim(); }
  else { const m2 = s.match(/([^\s<>"]+@[^\s<>"]+)/); if (m2) addr = m2[1]; }
  const domain = (addr.split('@')[1] || '').toLowerCase().replace(/[>\s]/g,'');
  return {name, addr, domain};
}
