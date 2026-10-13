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
  // Mailing lists point Reply-To at the list itself; that's expected, not a hijack.
  const listDom = ((hOne(headers,'list-post').match(/@([^>\s]+)/) || [])[1] || (hOne(headers,'list-id').match(/<[^>]*?\.([a-z0-9-]+\.[a-z0-9.-]+)>/i) || [])[1] || '').toLowerCase();
  if (replyTo && replyTo.domain && from && !sameOrg(replyTo.domain, from.domain) && !(listDom && sameOrg(replyTo.domain, listDom))){
    const free = FREEMAIL.has(registrable(replyTo.domain));
    add(free ? 'high' : 'medium', free ? 'Replies go to a free personal email account' : 'Replies go to a different domain', `Hitting reply sends your message to ${replyTo.addr}, not ${from.addr}.`);
  }
  if (retPath && retPath.domain && from && from.domain && !sameOrg(retPath.domain, from.domain))
    add('low','Bounce address is on another domain', `Return-Path is ${retPath.addr}. Mailing services do this legitimately, so it's a weak signal alone.`);
  const mid = (hOne(headers,'message-id').match(/@([^>\s]+)/) || [])[1];
  if (mid && from && from.domain && !sameOrg(mid.toLowerCase(), from.domain))
    add('info','Message ID came from a different domain', `${mid}. Usually normal when a company uses a mailing service.`);
  // Posing as the recipient's own mail provider or IT team: their address or domain in the subject or sender name,
  // from somewhere else. The body is left out because legitimate mail often says "sent to you@..." in its footer.
  const rcpt = parseAddr(hOne(headers,'delivered-to')) || parseAddr((decodeWords(hOne(headers,'to')) || '').split(',')[0]);
  const rDom = rcpt && rcpt.domain && registrable(rcpt.domain);
  if (rDom && rDom.includes('.') && !FREEMAIL.has(rDom) && from && from.domain && !sameOrg(from.domain, rDom)){
    const shown = (decodeWords(hOne(headers,'subject')) || '') + ' ' + (from.name || '');
    const org = rDom.split('.')[0];
    if (new RegExp('(^|[^a-z0-9.-])' + escRe(rDom) + '([^a-z0-9-]|$)', 'i').test(shown))
      add('high', `Uses your own domain, ${rDom}, to look like it came from your email provider or IT team`, `The real sender is ${from.addr}. Messages about your mailbox or password come from your own organization's servers, not an outside domain.`);
    // The name alone is weaker: "Acme Supplies" at acmesupplies.com writing to acme.com is a different, honest company.
    else if (org.length >= 4 && !from.domain.includes(org) && new RegExp('(^|[^a-z0-9])' + escRe(org) + '([^a-z0-9]|$)', 'i').test(shown))
      add('medium', `Uses your organization's name, "${org}", but comes from somewhere else`, `The real sender is ${from.addr}, not ${rDom}.`);
  }
  // Invisible characters wedged between letters ("Y<ZWNJ>our acc<ZWSP>ount") break up words so spam filters miss them.
  // Only between Latin letters: the zero-width non-joiner is a normal part of Persian and other scripts.
  const hidden = /[a-z][\u200b-\u200d\u2060\ufeff\u00ad\u034f]+[a-z]/i;
  const where = [hidden.test(decodeWords(hOne(headers,'subject')) || '') && 'subject', from && hidden.test(from.name) && 'sender name'].filter(Boolean);
  if (where.length) add('high', `Invisible characters are hidden inside words in the ${where.join(' and ')}`, 'They split words up so spam filters don\'t recognize them. Real companies have no reason to do this.');
  const mailer = hOne(headers,'x-mailer');
  if (/phpmailer|swiftmailer|python|curl|sendblaster|atomic mail|mass ?mail|leaf ?mailer/i.test(mailer))
    add('low','Sent with a mass-mailing script', `X-Mailer: ${mailer}. Real sites use these too, but phishing kits depend on them.`);
  return {findings, from, replyTo, retPath, fromLook};
}
