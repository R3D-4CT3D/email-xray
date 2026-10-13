/* Input checks. Every lookup takes a value from an analyzed email, so treat all of it as hostile. */

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

// A registrable domain name such as example.com or example.co.uk. Returns the normalized name or null.
export function cleanDomain(v){
  const d = String(v || '').trim().toLowerCase().replace(/\.$/, '');
  if (d.length > 253 || !d.includes('.')) return null;
  const labels = d.split('.');
  if (!labels.every(l => LABEL.test(l))) return null;
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(labels[labels.length - 1])) return null;
  return d;
}

// A public IPv4 or IPv6 address. Private, loopback, and reserved ranges are rejected: RDAP knows nothing useful about them.
export function cleanIp(v){
  const ip = String(v || '').trim().toLowerCase();
  const p = ip.split('.');
  if (p.length === 4 && p.every(o => /^\d{1,3}$/.test(o) && +o <= 255 && (o === '0' || !o.startsWith('0')))){
    const [a, b] = p.map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return null;
    if ((a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127)) return null;
    return ip;
  }
  if (ip.includes(':') && /^[0-9a-f:.]+$/.test(ip) && ip.length <= 45){
    try { new URL(`http://[${ip}]/`); } catch { return null; }
    if (ip === '::' || ip === '::1' || /^(fc|fd|fe[89ab])/.test(ip)) return null;
    return ip;
  }
  return null;
}

// An absolute http(s) URL with no credentials and the default port. Returns a URL object or null.
export function cleanUrl(v){
  let u;
  try { u = new URL(String(v || '')); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.port) return null;
  return u;
}
