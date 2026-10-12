/* MIME parsing: header/body split, transfer encodings, encoded words, and the multipart walk. */
import { parseHeaders, hOne, param } from './headers.js';

export function splitHeadBody(raw){
  raw = raw.replace(/\r\n?/g,'\n').replace(/^\s*\n/,'');
  const i = raw.indexOf('\n\n');
  if (i < 0) return {head:raw, body:''};
  return {head:raw.slice(0,i), body:raw.slice(i+2)};
}
function splitPart(c){
  c = c.replace(/^[ \t]*\n/,'');
  if (c.startsWith('\n')) return {head:'', body:c.slice(1)};
  const i = c.indexOf('\n\n');
  if (i < 0) return {head:c, body:''};
  return {head:c.slice(0,i), body:c.slice(i+2)};
}
export function b64bytes(s){
  try{
    const bin = atob(s.replace(/[^A-Za-z0-9+/=]/g,''));
    const u = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
    return u;
  }catch(e){ return new Uint8Array(); }
}
export function qpBytes(s){
  s = s.replace(/=\n/g,'');
  const out = []; const enc = new TextEncoder();
  for (let i=0;i<s.length;i++){
    const c = s[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i+1,2))){ out.push(parseInt(s.substr(i+1,2),16)); i += 2; }
    else { const code = s.charCodeAt(i); if (code < 128) out.push(code); else out.push(...enc.encode(c)); }
  }
  return new Uint8Array(out);
}
export function decodeBytes(bytes, cs){
  try { return new TextDecoder((cs||'utf-8').toLowerCase()).decode(bytes); }
  catch(e){ return new TextDecoder('utf-8').decode(bytes); }
}
export function decodeWords(s){
  if (!s) return s;
  return s.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=(\s+(?==\?))?/g, (m,cs,enc,txt) => {
    const bytes = enc.toUpperCase() === 'B' ? b64bytes(txt) : qpBytes(txt.replace(/_/g,' '));
    return decodeBytes(bytes, cs);
  });
}
// Collects decoded text parts, HTML parts, and attachments into acc.
export function walkParts(headers, body, acc, depth){
  const ct = (hOne(headers,'content-type') || 'text/plain').trim();
  const type = ct.split(';')[0].trim().toLowerCase();
  const cte = (hOne(headers,'content-transfer-encoding') || '').trim().toLowerCase();
  const disp = hOne(headers,'content-disposition');
  const fname = decodeWords(param(disp,'filename') || param(ct,'name') || '');
  if (type.startsWith('multipart/') && depth < 8){
    const b = param(ct,'boundary');
    if (!b){ acc.text.push(body); return; }
    const chunks = body.split('--' + b);
    for (let i=1;i<chunks.length;i++){
      const c = chunks[i];
      if (c.startsWith('--')) break;
      const p = splitPart(c);
      walkParts(parseHeaders(p.head), p.body, acc, depth+1);
    }
    return;
  }
  if (fname || /^\s*attachment/i.test(disp) || type === 'message/rfc822'){
    const bytes = cte === 'base64' ? b64bytes(body) : cte === 'quoted-printable' ? qpBytes(body) : new TextEncoder().encode(body);
    acc.attachments.push({name: fname || (type === 'message/rfc822' ? 'Attached email' : 'Unnamed file'), type, size: bytes.length, bytes});
    return;
  }
  let text = body;
  if (cte === 'base64') text = decodeBytes(b64bytes(body), param(ct,'charset'));
  else if (cte === 'quoted-printable') text = decodeBytes(qpBytes(body), param(ct,'charset'));
  if (type === 'text/html') acc.html.push(text);
  else if (type.startsWith('text/') || !type) acc.text.push(text);
}
