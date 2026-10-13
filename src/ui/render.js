/* render(r): builds the results page from an analyzed, enriched email. */
import { SEV_ORDER } from '../data.js';
import { KIND_LABEL } from '../parse/received.js';
import { verdictFor } from '../analyze.js';
import { fmtDur, fmtTime, fmtSize } from '../format.js';
import { $, el, pill, block } from './dom.js';
import { MODE, setMode } from './mode.js';
import { invBlocks } from './investigator.js';

function findList(r, area){
  const items = r.F.filter(f => f.area === area && !f.hidden).sort((a,b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]);
  if (!items.length) return null;
  return el('ul', {class:'finds'}, items.map(f => el('li', {},
    el('div', {class:'ft'}, pill(f.sev), el('span', {text:f.title})),
    f.detail ? el('p', {class:'fd', text:f.detail}) : null)));
}
const AUTH_TEXT = {
  spf: {q:'Is this server allowed to send for the domain?', pass:'Yes. The delivering server is on the approved list for {d}. Note this checks the hidden envelope sender, not the From line you see.', fail:'No. The delivering server is not authorized to send for {d}.', softfail:'Probably not. The domain owner flags this server as unlikely to be legitimate.', neutral:'The domain doesn\'t say either way.', none:'The domain publishes no SPF policy.', temperror:'Check failed temporarily on the receiving side.', permerror:'The domain\'s SPF record is broken.'},
  dkim:{q:'Was it signed, and arrived unchanged?', pass:'Yes. Signed by {d}, and the contents weren\'t altered in transit.', fail:'The signature didn\'t verify. It may have been altered or forged.', none:'Not signed at all.', neutral:'Signature present but couldn\'t be evaluated.', temperror:'Check failed temporarily.', permerror:'The signature is malformed.', policy:'Signed, but the receiving server rejected the signing policy.'},
  dmarc:{q:'Does the From address you see match those checks?', pass:'Yes. The visible sender, {d}, lines up with a passing check. That\'s the strongest sign the From line is real.', fail:'No. The visible From domain, {d}, didn\'t line up with any passing check. It may be spoofed.', none:'The From domain, {d}, publishes no DMARC policy, so there\'s nothing to enforce.', bestguesspass:'No DMARC policy, but the checks would have passed.', temperror:'Check failed temporarily.', permerror:'The domain\'s DMARC record is broken.'}
};
function authRow(key, label, result, d){
  const t = AUTH_TEXT[key];
  const sev = !result ? 'info' : result === 'pass' ? 'ok' : (result === 'fail' ? 'high' : (result === 'softfail' || result === 'none') ? 'medium' : 'low');
  const expl = !result ? 'Not reported in these headers.' : (t[result] || `Result: ${result}.`).replace('{d}', d || 'the domain');
  return el('div', {class:'auth-row'},
    el('div', {class:'auth-name'}, label, el('span', {class:'auth-q', text:t.q})),
    el('div', {}, pill(sev, result ? result.toUpperCase() : 'Not found'), el('p', {text:expl})));
}
export function render(r, {scroll = true} = {}){
  const out = $('#results'); out.replaceChildren(); out.hidden = false;
  const mb = el('div', {class:'modebar', role:'group', 'aria-label':'View'});
  [['standard','Standard'],['inv','Investigator']].forEach(([m,l]) => {
    const b = el('button', {'data-mode':m, 'aria-pressed':String(MODE === m), text:l});
    b.addEventListener('click', () => setMode(m)); mb.append(b);
  });
  out.append(mb);
  out.append(el('div', {class:'casebar inv-only'},
    el('span', {text:'Case'}), el('span', {text:r.caseId}),
    el('span', {text:'Scanned'}), el('span', {text:r.scannedAt}),
    el('span', {text:'SHA-256'}), el('span', {text:r.rawSha256 || 'unavailable'}),
    el('span', {text:'Size'}), el('span', {text:`${r.rawSize} bytes, ${r.headers.length} headers, ${r.hops.length} hops`}),
    el('span', {text:'Verdict'}), el('span', {text:`${r.verdict} (${r.score}/100)`})));

  const v = verdictFor(r.score);
  const top = r.F.filter(f => f.sev === 'high' || f.sev === 'medium').sort((a,b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]);
  const seen = new Set(); const reasons = top.filter(f => !seen.has(f.title) && seen.add(f.title)).slice(0,5);
  out.append(el('section', {class:'verdict v-' + v.key},
    el('div', {class:'v-top'}, el('h2', {text:v.title}),
      el('div', {class:'v-score'}, el('span', {class:'num', text:String(r.score)}), el('span', {class:'of', text:'/ 100 risk'}))),
    el('div', {class:'meter', role:'img', 'aria-label':`Risk score ${r.score} out of 100`}, el('span', {style:`width:${Math.max(r.score,2)}%`})),
    el('p', {class:'v-sum', text:v.sum}),
    reasons.length ? el('ul', {class:'reasons'}, reasons.map(f => el('li', {}, pill(f.sev), el('span', {text:f.title})))) : null
  ));

  invBlocks(r, () => render(r, {scroll:false})).forEach(b => out.append(b));

  out.append(block('The email', null, el('dl', {class:'kv'},
    el('dt', {text:'Subject'}), el('dd', {text:r.subject || '(none)'}),
    el('dt', {text:'From'}), el('dd', {text:r.from ? (r.from.name ? `${r.from.name} <${r.from.addr}>` : r.from.addr) : '(none)'}),
    el('dt', {text:'To'}), el('dd', {text:r.to || '(none)'}),
    el('dt', {text:'Sent'}), el('dd', {text:r.date || '(none)'}))));

  // route
  const route = el('ol', {class:'route'});
  r.hops.forEach((h,i) => {
    const chips = el('div', {class:'chips'});
    if (h.ip) chips.append(el('span', {class:'chip', text:`${h.ip} · ${KIND_LABEL[h.kind] || 'unknown'}`}));
    if (h.rdns) chips.append(el('span', {class:'chip', text:`actually ${h.rdns}`}));
    if (h.proto){ const enc = /S$|TLS/i.test(h.proto); chips.append(el('span', {class:'chip' + (enc ? '' : ' warn'), text:`${h.proto} · ${enc ? 'encrypted' : 'not encrypted'}`})); }
    if (h.date) chips.append(el('span', {class:'chip', text:fmtTime(h.date)}));
    route.append(el('li', {class:'hop' + (i === r.originIdx ? ' origin' : ''), style:`animation-delay:${.15 + i*.12}s`},
      el('span', {class:'node', text:String(i+1)}),
      h.delay != null ? el('div', {class:'delay' + (h.delay < -300000 ? ' bad' : ''), text: h.delay < 0 ? `${fmtDur(h.delay)}, earlier than the previous hop` : `+${fmtDur(h.delay)} later`}) : null,
      el('div', {class:'h-title', text: h.from || (i === 0 ? 'Written here' : 'Internal handoff')}),
      el('div', {class:'h-by', text: h.by ? `handed to ${h.by}` : ''}),
      chips));
  });
  route.append(el('li', {class:'hop inbox', style:`animation-delay:${.15 + r.hops.length*.12}s`},
    el('span', {class:'node', text:''}), el('div', {class:'h-title', text:'Your inbox'}), el('div', {class:'h-by', text:r.to || ''})));
  out.append(block('The route', r.hops.length ? 'Each mail server stamps the email as it passes through. Read top to bottom, from where it was written to where it landed.' : 'No Received headers found. Paste the full original source to see the route.',
    r.hops.length ? route : null, findList(r,'route'), r.hops.length ? hopTable(r) : null));

  // sender
  const kv = el('dl', {class:'kv'});
  const addKV = (k, v) => { if (v) kv.append(el('dt', {text:k}), el('dd', {text:v})); };
  if (r.from){ addKV('Display name', r.from.name || '(none)'); addKV('Real address', r.from.addr); }
  if (r.replyTo) addKV('Replies go to', r.replyTo.addr);
  if (r.retPath) addKV('Bounces go to', r.retPath.addr);
  out.append(block('Who sent it', 'The name in your inbox is just text. These are the addresses underneath.', kv,
    findList(r,'sender') || el('p', {class:'clean', text:'The sender details are consistent.'})));

  // auth
  const a = r.auth;
  out.append(block('Authentication', a.server ? `Checks recorded by ${a.server} when it received the email.` : 'The three checks mail servers use to catch forged senders.',
    el('div', {class:'auth'},
      authRow('spf','SPF', a.spf, a.mailfrom ? a.mailfrom.replace(/^.*@/,'') : null),
      authRow('dkim','DKIM', a.dkim, a.dkimD.join(', ') || null),
      authRow('dmarc','DMARC', a.dmarc, a.hfrom || (r.from && r.from.domain))),
    findList(r,'auth'),
    el('div', {class:'inv-only'}, el('pre', {text:[
      r.arRaw ? 'Authentication-Results: ' + r.arRaw : 'Authentication-Results: (not present)',
      r.rspfRaw ? 'Received-SPF: ' + r.rspfRaw : null,
      ...r.dkimSigs.map(k => `DKIM-Signature: d=${k.d} s=${k.s}  (key at ${k.s}._domainkey.${k.d})`)
    ].filter(Boolean).join('\n\n')}))));

  // links
  const linkWrap = el('div', {});
  r.links.forEach(l => {
    const showDiff = l.shown && l.shown !== l.href;
    linkWrap.append(el('div', {class:'link'},
      showDiff ? el('div', {class:'row'}, el('span', {text:'Shows'}), el('span', {class:'mono', text:l.shown})) : null,
      el('div', {class:'row'}, el('span', {text:'Goes to'}), el('span', {class:'mono', text:l.href.length > 300 ? l.href.slice(0,300) + '…' : l.href})),
      l.flags.length ? el('ul', {}, l.flags.map(([sev,t]) => el('li', {}, pill(sev), el('span', {text:t})))) : el('div', {class:'clean', text:'Nothing unusual spotted.'})));
  });
  out.append(block(`Links (${r.links.length})`, r.links.length ? 'What each link says versus where it actually takes you. Riskiest first.' : 'No links found in the message.', linkWrap));

  // attachments
  if (r.atts.length){
    out.append(block(`Attachments (${r.atts.length})`, 'Listed only. Nothing is opened.',
      el('div', {}, r.atts.map(at => el('div', {class:'link'},
        el('div', {class:'row'}, el('span', {text:'File'}), el('span', {class:'mono', text:at.name})),
        el('div', {class:'row'}, el('span', {text:'Type'}), el('span', {text:`${at.type} · ${fmtSize(at.size)}`})),
        at.sha256 ? el('div', {class:'hashes inv-only'}, el('b', {text:'SHA-256 '}), at.sha256, el('br'), el('b', {text:'SHA-1 '}), at.sha1 || 'n/a', el('br'), el('b', {text:'MD5 '}), at.md5) : null,
        at.flags.length ? el('ul', {}, at.flags.map(([sev,t]) => el('li', {}, pill(sev), el('span', {text:t})))) : el('div', {class:'clean', text:'Common file type.'}))))));
  }

  // language
  out.append(block('Pressure tactics', r.cues.length ? 'Phrases phishing emails lean on to rush you. Real companies use some of these too, so they count for less than the technical checks.' : 'No common pressure phrases found.',
    r.cues.length ? el('ul', {class:'cues'}, r.cues.map(c => el('li', {}, el('strong', {text:c.label}), ' ', el('q', {text:c.match})))) : null));

  // raw
  const pre = el('pre', {});
  r.headers.forEach(h => pre.append(el('span', {class:'hname', text:h.name + ':'}), ' ' + h.value + '\n'));
  out.append(block('Under the hood', null,
    r.bodyText ? el('details', {class:'raw'}, el('summary', {text:'Message text'}), el('pre', {text:r.bodyText})) : null,
    el('details', {class:'raw'}, el('summary', {text:`All headers (${r.headers.length})`}), pre)));

  if (scroll) out.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
}
function hopTable(r){
  const utc = d => d ? d.toISOString().slice(11,19) : '-';
  return el('div', {class:'tbl inv-only'}, el('table', {},
    el('thead', {}, el('tr', {}, ['#','From (HELO)','IP','rDNS','By','Proto','UTC','Delta'].map(h => el('th', {text:h})))),
    el('tbody', {}, r.hops.map((h,i) => el('tr', {},
      el('td', {text: String(i+1) + (i === r.originIdx ? '*' : '')}), el('td', {class:'wrap', text:h.from || '-'}),
      el('td', {text:h.ip || '-'}), el('td', {class:'wrap', text:h.rdns || '-'}), el('td', {class:'wrap', text:h.by || '-'}),
      el('td', {text:h.proto || '-'}), el('td', {text:utc(h.date)}), el('td', {text:h.delay != null ? fmtDur(h.delay) : '-'}))))));
}
