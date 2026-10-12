/* Route checks: hop timing, the likely origin, and X-Originating-IP. */
import { hAll, hOne } from '../parse/headers.js';
import { parseReceived } from '../parse/received.js';
import { sameOrg } from './domains.js';
import { fmtDur } from '../format.js';

export function checkRoute(headers){
  const findings = [];
  const add = (sev, title, detail) => findings.push({area:'route', sev, title, detail});
  const hops = hAll(headers,'received').map(parseReceived).reverse();
  hops.forEach((h,i) => {
    if (i > 0 && h.date && hops[i-1].date){
      h.delay = h.date - hops[i-1].date;
      if (h.delay < -5*60*1000) add('medium',`Timestamps run backwards at hop ${i+1}`,'Could be a clock that\'s off, but faked Received lines are a classic way to plant a false trail.');
      else if (h.delay > 60*60*1000) add('low',`Long pause before hop ${i+1}`,`The email sat for ${fmtDur(h.delay)}. Sometimes queues, sometimes deliberate.`);
    }
  });
  const originIdx = hops.findIndex(h => h.kind === 'public' || h.kind === 'documentation');
  if (originIdx >= 0){
    const o = hops[originIdx];
    if (o.from && o.rdns && !sameOrg(o.from, o.rdns)) add('low','Sending server\'s name doesn\'t match its address',`It introduced itself as ${o.from}, but its address ${o.ip} belongs to ${o.rdns}.`);
  }
  const xoip = hOne(headers,'x-originating-ip').replace(/[\[\]]/g,'');
  if (xoip) add('info','Original sender\'s IP is listed', `X-Originating-IP: ${xoip}. Webmail services sometimes record the sender's own connection here.`);
  return {findings, hops, originIdx, xoip};
}
