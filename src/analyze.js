/* analyze(raw): parse the email, run every check, and score it. Pure apart from DOMParser for HTML bodies. */
import { SEV_PTS } from './data.js';
import { parseHeaders, hAll, hOne } from './parse/headers.js';
import { splitHeadBody, walkParts, decodeWords } from './parse/mime.js';
import { checkSender } from './checks/sender.js';
import { checkAuth } from './checks/auth.js';
import { checkRoute } from './checks/route.js';
import { checkLinks } from './checks/links.js';
import { checkAttachments } from './checks/attachments.js';
import { checkLanguage } from './checks/language.js';

export function analyze(raw){
  const {head, body} = splitHeadBody(raw);
  const headers = parseHeaders(head);
  if (!headers.some(h => /^(from|received|subject|date|return-path)$/i.test(h.name))) throw new Error('nohdr');
  const acc = {text:[], html:[], attachments:[]};
  walkParts(headers, body, acc, 0);

  const sender = checkSender(headers);
  const {from, fromLook} = sender;
  const auth = checkAuth(headers, fromLook);
  const route = checkRoute(headers);
  const links = checkLinks(acc.text, acc.html);
  const atts = checkAttachments(acc.attachments);
  const F = [...sender.findings, ...auth.findings, ...route.findings, ...links.findings, ...atts.findings];

  const allText = (acc.text.join('\n') + '\n' + links.htmlText + '\n' + decodeWords(hOne(headers,'subject'))).replace(/\s+/g,' ');
  const language = checkLanguage(allText);

  const scoreInputs = {cuePoints: language.points, dmarcCredit: auth.auth.dmarc === 'pass' && !fromLook};
  const score = scoreOf(F, scoreInputs);

  return {
    headers, F, scoreInputs, fromLook, from, replyTo: sender.replyTo, retPath: sender.retPath, auth: auth.auth,
    hops: route.hops, originIdx: route.originIdx, links: links.links, atts: atts.atts, cues: language.cues, score, xoip: route.xoip,
    arRaw: auth.arRaw, rspfRaw: hOne(headers,'received-spf'),
    dkimSigs: hAll(headers,'dkim-signature').map(v => ({d:(v.match(/\bd=([^;\s]+)/)||[])[1]||'?', s:(v.match(/\bs=([^;\s]+)/)||[])[1]||'?'})),
    subject: decodeWords(hOne(headers,'subject')), to: decodeWords(hOne(headers,'to')), date: hOne(headers,'date'),
    bodyText: (acc.text.join('\n\n').trim() || links.htmlText.trim()).slice(0, 8000)
  };
}

// Findings by severity, plus capped pressure-language points, minus 10 when DMARC passes for a non-lookalike sender.
export function scoreOf(F, {cuePoints, dmarcCredit}){
  const s = F.reduce((t,f) => t + SEV_PTS[f.sev], 0) + cuePoints - (dmarcCredit ? 10 : 0);
  return Math.max(0, Math.min(100, s));
}

export function verdictFor(s){
  if (s >= 60) return {key:'high', title:'Likely phishing', sum:'Several strong warning signs. Don\'t click, reply, or open attachments. Report it to your email provider or IT team.'};
  if (s >= 30) return {key:'med', title:'Suspicious', sum:'Some real red flags. If it asks you to do anything, check with the sender through a channel you already trust.'};
  if (s >= 10) return {key:'low', title:'A few oddities', sum:'Nothing conclusive, but give the items below a second look before acting on it.'};
  return {key:'ok', title:'No major red flags', sum:'This scan found nothing alarming. That\'s not a guarantee, so stay skeptical of unexpected requests.'};
}
