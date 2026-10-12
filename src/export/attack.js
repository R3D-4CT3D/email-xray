/* MITRE ATT&CK mapping from findings, links, attachments, and language cues. */

export function mapAttack(r){
  const T = [];
  const add = (id, name, why) => { if (!T.some(t => t.id === id)) T.push({id, name, why}); };
  const hit = re => r.F.some(f => (f.sev === 'high' || f.sev === 'medium') && re.test(f.title));
  const badLinks = r.links.filter(l => l.flags.some(f => f[0] === 'high' || f[0] === 'medium'));
  const badAtts = r.atts.filter(a => a.flags.some(f => f[0] === 'high'));
  if (badAtts.length){
    add('T1566.001','Phishing: Spearphishing Attachment', `Risky attachment: ${badAtts.map(a => a.name).join(', ')}.`);
    add('T1204.002','User Execution: Malicious File','Depends on the recipient opening the attachment.');
  }
  if (badAtts.some(a => /\.(html?|shtml|xhtml|svg)$/i.test(a.name))) add('T1027.006','Obfuscated Files or Information: HTML Smuggling','HTML or SVG attachment renders content locally, sidestepping link scanners.');
  if (badAtts.some(a => a.flags.some(f => /Double extension/.test(f[1])))) add('T1036.007','Masquerading: Double File Extension','Filename hides its real type.');
  if (badLinks.length){
    add('T1566.002','Phishing: Spearphishing Link', `${badLinks.length} suspicious link${badLinks.length > 1 ? 's' : ''}.`);
    add('T1204.001','User Execution: Malicious Link','Depends on the recipient clicking.');
  }
  if (r.cues.some(c => /verify|sensitive/i.test(c.label)) && (badLinks.length || badAtts.length)) add('T1598.003','Phishing for Information: Spearphishing Link','Asks the recipient to verify account details, consistent with credential harvesting.');
  if (hit(/imitates|Name says|Pretends to be|fake address/i)) add('T1656','Impersonation','Poses as a trusted brand or sender.');
  if (r.auth.dmarc === 'fail' || hit(/fake address/i)) add('T1672','Email Spoofing','Sender identity is forged or fails DMARC alignment.');
  if (hit(/imitates|Pretends to be/i)) add('T1583.001','Acquire Infrastructure: Domains','Lookalike domain stood up to impersonate a brand.');
  if (r.F.some(f => /free site-builder/i.test(f.title))) add('T1583.006','Acquire Infrastructure: Web Services','Content hosted on a free web service.');
  if (hit(/free personal email/i)) add('T1585.002','Establish Accounts: Email Accounts','Freemail account set up to collect replies.');
  return T;
}
