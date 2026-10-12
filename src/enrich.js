/* enrich(r, raw): hashes, case ID, verdict, IOCs, and ATT&CK mapping. Async because Web Crypto is. */
import { verdictFor } from './analyze.js';
import { md5, sha } from './export/hash.js';
import { buildIOCs } from './export/iocs.js';
import { mapAttack } from './export/attack.js';

export async function enrich(r, raw){
  const enc = new TextEncoder().encode(raw);
  r.rawSize = enc.length;
  r.rawSha256 = await sha('SHA-256', enc);
  for (const a of r.atts){
    if (!a.bytes) continue;
    a.sha256 = await sha('SHA-256', a.bytes);
    a.sha1 = await sha('SHA-1', a.bytes);
    a.md5 = md5(a.bytes);
  }
  r.scannedAt = new Date().toISOString().replace(/\.\d+Z$/,'Z');
  r.caseId = `EXR-${r.scannedAt.slice(0,10).replace(/-/g,'')}-${(r.rawSha256 || md5(enc)).slice(0,8).toUpperCase()}`;
  r.verdict = verdictFor(r.score).title;
  r.iocs = buildIOCs(r);
  r.attack = mapAttack(r);
}
