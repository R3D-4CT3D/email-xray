/* Attachment checks by file name. Attachments are listed and hashed, never opened. */
import { RISKY_EXT, ARCHIVE_EXT } from '../data.js';

export function checkAttachments(attachments){
  const findings = [];
  const atts = attachments.map(a => {
    const flags = [];
    const parts = a.name.toLowerCase().split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    if (RISKY_EXT[ext]) flags.push(['high', RISKY_EXT[ext]]);
    if (parts.length > 1 && /^(pdf|docx?|xlsx?|pptx?|jpe?g|png|txt|csv)$/.test(parts[parts.length-1]) && ext) flags.push(['high',`Double extension. It looks like a .${parts[parts.length-1]} but is really a .${ext}`]);
    if (ARCHIVE_EXT.has(ext)) flags.push(['low','Compressed archive. These can hide other files from scanners']);
    flags.forEach(([sev,t]) => findings.push({area:'atts', sev, title:`${a.name}: ${t}`, hidden:true}));
    return {...a, flags};
  });
  return {findings, atts};
}
