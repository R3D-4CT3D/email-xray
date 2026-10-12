/* Authentication checks: SPF, DKIM, and DMARC as recorded by the receiving server. */
import { hAll, hOne } from '../parse/headers.js';

export function checkAuth(headers, fromLook){
  const findings = [];
  const add = (sev, title, detail) => findings.push({area:'auth', sev, title, detail});
  const arAll = hAll(headers,'authentication-results');
  const ar = arAll[0] || '';
  const grab = k => { const re = new RegExp('(?:^|[;\\s])' + k + '\\s*=\\s*([a-z]+)','ig'); const r = []; let m; while ((m = re.exec(ar))) r.push(m[1].toLowerCase()); return r; };
  const dkimAll = grab('dkim');
  const auth = {
    present: !!ar,
    server: ar.split(';')[0].trim(),
    spf: grab('spf')[0] || null,
    dkim: dkimAll.includes('pass') ? 'pass' : (dkimAll[0] || null),
    dmarc: grab('dmarc')[0] || null,
    mailfrom: (ar.match(/smtp\.mailfrom=([^\s;]+)/i) || [])[1] || null,
    hfrom: (ar.match(/header\.from=([^\s;]+)/i) || [])[1] || null,
    dkimD: [...new Set([...ar.matchAll(/header\.(?:d|i)=@?([^\s;]+)/gi)].map(m => m[1].replace(/^.*@/,'')))],
  };
  if (!auth.spf){ const rs = hOne(headers,'received-spf'); if (rs) auth.spf = rs.split(/\s/)[0].toLowerCase(); }
  if (!auth.dkimD.length) auth.dkimD = hAll(headers,'dkim-signature').map(v => (v.match(/\bd=([^;\s]+)/) || [])[1]).filter(Boolean);
  if (!auth.present && !hOne(headers,'received-spf')) add('info','No authentication results on this copy','Your mail provider didn\'t stamp SPF, DKIM, or DMARC results, or the headers were trimmed when copying.');
  if (auth.dmarc === 'fail') add('high','DMARC failed','The From address couldn\'t be verified. The domain you see may be spoofed.');
  if (auth.dmarc === 'pass' && fromLook) add('info','DMARC passed, but only for the lookalike domain','Authentication proves the email came from that domain. It says nothing about whether the domain is honest.');
  if (auth.spf === 'fail') add('medium','SPF failed','The server that delivered this isn\'t authorized to send for that domain.');
  if (auth.spf === 'softfail') add('low','SPF soft fail','The domain owner says this server probably shouldn\'t be sending its mail.');
  if (auth.dkim === 'fail') add('medium','DKIM signature broken','The signature didn\'t verify. The message may have been altered or forged.');
  if ((auth.dkim === 'none' || (auth.present && !auth.dkim)) && auth.dmarc !== 'pass') add('low','Not digitally signed','Most real companies sign their email with DKIM.');
  return {findings, auth, arRaw: ar};
}
