/* STIX 2.1 bundle: one report plus an indicator per IOC. */

function uuid(){
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const n = Math.random()*16|0; return (c === 'x' ? n : (n & 3 | 8)).toString(16); });
}
export function stixBundle(r){
  const now = new Date().toISOString();
  const q = v => v.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const pat = {
    ipv4: v => `[ipv4-addr:value = '${q(v)}']`, ipv6: v => `[ipv6-addr:value = '${q(v)}']`,
    domain: v => `[domain-name:value = '${q(v)}']`, url: v => `[url:value = '${q(v)}']`,
    email: v => `[email-addr:value = '${q(v)}']`, sha256: v => `[file:hashes.'SHA-256' = '${v}']`,
    md5: v => `[file:hashes.MD5 = '${v}']`, filename: v => `[file:name = '${q(v)}']`
  };
  const kind = r.score >= 60 ? 'malicious-activity' : 'anomalous-activity';
  const inds = r.iocs.map(i => ({type:'indicator', spec_version:'2.1', id:'indicator--' + uuid(), created:now, modified:now,
    name:`${i.type}: ${i.value}`, description:i.context, indicator_types:[kind], pattern:pat[i.type](i.value), pattern_type:'stix', valid_from:now}));
  const report = {type:'report', spec_version:'2.1', id:'report--' + uuid(), created:now, modified:now, published:now,
    name:`${r.caseId}: ${r.subject || '(no subject)'}`, description:`Email X-Ray verdict: ${r.verdict} (${r.score}/100). ATT&CK: ${r.attack.map(t => t.id).join(', ') || 'none'}.`,
    report_types:['threat-report'], object_refs: inds.length ? inds.map(o => o.id) : ['indicator--' + uuid()]};
  return JSON.stringify({type:'bundle', id:'bundle--' + uuid(), objects:[report, ...inds]}, null, 2);
}
