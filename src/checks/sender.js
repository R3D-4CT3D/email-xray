/* Sender checks: lookalike domains, display-name tricks, Reply-To, Return-Path, Message-ID, mailer. */
import { BRANDS, FREEMAIL } from '../data.js';
import { hOne, parseAddr } from '../parse/headers.js';
import { decodeWords } from '../parse/mime.js';
import { lookalike, sameOrg, isBrandDomain, registrable } from './domains.js';

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

export function checkSender(headers){
  const findings = [];
  const add = (sev, title, detail) => findings.push({area:'sender', sev, title, detail});
  const from = parseAddr(decodeWords(hOne(headers,'from')));
  const replyTo = parseAddr(decodeWords(hOne(headers,'reply-to')));
  const retPath = parseAddr(hOne(headers,'return-path'));
  let fromLook = null;
  if (from && from.domain){
    fromLook = lookalike(from.domain);
    if (fromLook) add(fromLook.sev, `Sender's domain imitates ${fromLook.brand}`, `${from.domain} ${fromLook.why}.`);
    if (from.domain.includes('xn--')) add('medium','Sender domain uses encoded international characters','Letters from other alphabets can look identical to normal ones.');
    const nameEmail = (from.name.match(/[^\s<>"@()]+@([^\s<>"()]+)/) || [])[0];
    if (nameEmail && !sameOrg(nameEmail.split('@')[1], from.domain)) add('high','The display name shows a fake address', `The name reads "${nameEmail}", but the real sender is ${from.addr}.`);
    for (const [brand, doms] of BRANDS){
      if (new RegExp('(^|[^a-z])' + escRe(brand) + '([^a-z]|$)','i').test(from.name) && !isBrandDomain(from.domain, doms)){
        const strong = FREEMAIL.has(registrable(from.domain)) || fromLook;
        add(strong ? 'high' : 'medium', `Name says "${brand}", but the address isn't ${brand}'s`, `The real sender is ${from.addr}. ${brand} sends from ${doms[0]}.`);
        break;
      }
    }
  }
  if (replyTo && replyTo.domain && from && !sameOrg(replyTo.domain, from.domain)){
    const free = FREEMAIL.has(registrable(replyTo.domain));
    add(free ? 'high' : 'medium', free ? 'Replies go to a free personal email account' : 'Replies go to a different domain', `Hitting reply sends your message to ${replyTo.addr}, not ${from.addr}.`);
  }
  if (retPath && retPath.domain && from && from.domain && !sameOrg(retPath.domain, from.domain))
    add('low','Bounce address is on another domain', `Return-Path is ${retPath.addr}. Mailing services do this legitimately, so it's a weak signal alone.`);
  const mid = (hOne(headers,'message-id').match(/@([^>\s]+)/) || [])[1];
  if (mid && from && from.domain && !sameOrg(mid.toLowerCase(), from.domain))
    add('info','Message ID came from a different domain', `${mid}. Usually normal when a company uses a mailing service.`);
  const mailer = hOne(headers,'x-mailer');
  if (/phpmailer|swiftmailer|python|curl|sendblaster|atomic mail|mass ?mail|leaf ?mailer/i.test(mailer))
    add('low','Sent with a mass-mailing script', `X-Mailer: ${mailer}. Real sites use these too, but phishing kits depend on them.`);
  return {findings, from, replyTo, retPath, fromLook};
}
