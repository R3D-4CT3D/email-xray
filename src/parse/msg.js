/* Outlook .msg support. The parser (@kenjiuno/msgreader, ~570 KB) is its own chunk, loaded only when a .msg is opened. */

let msgReaderLoad = null;
export function loadMsgReader(){
  return msgReaderLoad || (msgReaderLoad = import('./msgreader.js').then(m => m.default, e => { msgReaderLoad = null; throw e; }));
}
function bytesB64(u8){
  let bin = '';
  for (let i=0;i<u8.length;i+=0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i+0x8000));
  return btoa(bin).replace(/(.{76})/g,'$1\n');
}
const utf8B64 = s => bytesB64(new TextEncoder().encode(s));
const encWord = s => /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + utf8B64(s).replace(/\n/g,'') + '?=';
export const isOle = u8 => u8.length > 8 && u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0;
// Turn an Outlook .msg back into raw RFC 822 text so analyze() can treat it like any .eml.
export function msgToRaw(MsgReader, buf){
  const rd = new MsgReader(buf);
  const d = rd.getFileData();
  if (d.error) throw new Error('msg');
  const head = [];
  if (d.headers){
    // Original transport headers: keep all of them except the MIME ones, which describe a body we rebuild below.
    let skip = false;
    for (const line of d.headers.replace(/\r\n?/g,'\n').split('\n')){
      if (!line.trim()){ if (head.length) break; continue; }
      if (/^[ \t]/.test(line)){ if (!skip) head.push(line); continue; }
      skip = /^(content-type|content-transfer-encoding|mime-version):/i.test(line);
      if (!skip) head.push(line);
    }
  } else {
    const addr = (name, email) => email ? (name && name !== email ? `${encWord(name)} <${email}>` : `<${email}>`) : '';
    const from = addr(d.senderName, d.senderSmtpAddress || d.senderEmail);
    const to = (d.recipients || []).filter(x => x.recipType !== 'cc' && x.recipType !== 'bcc')
      .map(x => addr(x.name, x.smtpAddress || x.email)).filter(Boolean).join(', ');
    if (from) head.push('From: ' + from);
    if (to) head.push('To: ' + to);
    if (d.subject) head.push('Subject: ' + encWord(d.subject));
    const date = d.clientSubmitTime || d.messageDeliveryTime || d.creationTime;
    if (date) head.push('Date: ' + date);
  }
  const B = '==xray-msg-' + Math.random().toString(36).slice(2) + '==';
  const parts = [];
  if (d.body) parts.push(['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', utf8B64(d.body)].join('\n'));
  for (const a of d.attachments || []){
    let x; try { x = rd.getAttachment(a); } catch(e){ continue; }
    if (!x || !x.content) continue;
    const name = encWord((x.fileName || a.fileName || a.name || 'attachment').replace(/["\r\n]/g,''));
    parts.push([`Content-Type: ${a.attachMimeTag || 'application/octet-stream'}; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`, 'Content-Transfer-Encoding: base64', '', bytesB64(x.content)].join('\n'));
  }
  head.push('MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${B}"`);
  const raw = head.join('\n') + '\n\n' + parts.map(p => `--${B}\n${p}`).join('\n') + `\n--${B}--\n`;
  return {raw, note: d.headers ? '' : 'This .msg file has no original internet headers. It is probably a draft or a sent item, so the route and authentication can\'t be checked. Open the copy that arrived in the inbox for a full scan.'};
}
