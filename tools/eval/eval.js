// Run the analyzer over an mbox corpus and report what it catches. Corpora live in corpus/ (git-ignored);
// only aggregate numbers should leave this machine.
//   node tools/eval/eval.js [--label phish|ham] [--misses N] <mbox files or folders...>
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

globalThis.DOMParser = new JSDOM('').window.DOMParser;
const { analyze, verdictFor } = await import('../../src/analyze.js');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const label = opt('--label', 'phish'), showMisses = Number(opt('--misses', 15));
const files = args;
if (!files.length){ console.error('usage: node tools/eval/eval.js [--label phish|ham] [--misses N] <mbox...>'); process.exit(1); }

// mbox: messages start at "From " lines; mboxrd escapes body lines as ">From ".
// A folder holds one raw message per file (SpamAssassin corpus layout).
function* messages(file){
  if (fs.statSync(file).isDirectory()){
    for (const name of fs.readdirSync(file).sort()) if (!name.startsWith('.') && name !== 'cmds') yield fs.readFileSync(`${file}/${name}`, 'utf8');
    return;
  }
  const text = fs.readFileSync(file, 'utf8'); // as the app decodes .eml files
  for (const chunk of text.split(/^From [^\n]*\n/m)){
    if (!chunk.trim() || /^Subject: DON'T DELETE THIS MESSAGE/m.test(chunk.slice(0, 2000))) continue;
    yield chunk.replace(/^>(>*From )/gm, '$1');
  }
}
// Collapse finding titles into kinds, so "Name says "PayPal"" and "Name says "DHL"" count together.
const kind = t => t.replace(/^[^:]{1,120}\.[a-z0-9]{1,5}: /i, '').replace(/"[^"]*"/g, '"..."')
  .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, '<host>').replace(/\b\d+\b/g, 'N').replace(/\.([a-z0-9]{1,5})\b/gi, '.<ext>');

const tally = new Map(), cueTally = new Map(), bands = {}, misses = [];
let n = 0, errors = 0, withAuth = 0, withRoute = 0;
for (const f of files) for (const raw of messages(f)){
  n++;
  let r;
  try { r = analyze(raw); } catch { errors++; continue; }
  const v = verdictFor(r.score).title;
  bands[v] = (bands[v] || 0) + 1;
  if (r.auth.present) withAuth++;
  if (r.hops.length) withRoute++;
  for (const k of new Set(r.F.filter(x => x.sev !== 'info').map(x => `${x.sev} | ${kind(x.title)}`))) tally.set(k, (tally.get(k) || 0) + 1);
  for (const c of r.cues) cueTally.set(c.label, (cueTally.get(c.label) || 0) + 1);
  const missed = label === 'phish' ? r.score < 30 : r.score >= 30;
  if (missed) misses.push({score: r.score, subject: (r.subject || '').slice(0, 70), from: r.from ? r.from.domain : '', top: r.F.filter(x => x.sev !== 'info').slice(0, 3).map(x => kind(x.title))});
}

const ok = n - errors;
const pct = x => `${(100 * x / ok).toFixed(1)}%`;
console.log(`\n${ok} ${label} emails analyzed (${errors} unreadable) from ${files.length} file(s)`);
console.log(`with Authentication-Results: ${pct(withAuth)}   with Received route: ${pct(withRoute)}\n`);
console.log('Verdicts:');
for (const v of ['Likely phishing', 'Suspicious', 'A few oddities', 'No major red flags']) console.log(`  ${v.padEnd(20)} ${String(bands[v] || 0).padStart(5)}  ${pct(bands[v] || 0)}`);
const caught = (bands['Likely phishing'] || 0) + (bands['Suspicious'] || 0);
console.log(label === 'phish' ? `\nCaught (Suspicious or worse): ${pct(caught)}` : `\nFalse positives (Suspicious or worse): ${pct(caught)}`);
console.log('\nMost common findings (share of emails):');
for (const [k, c] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${pct(c).padStart(6)}  ${k}`);
console.log('\nPressure phrases (share of emails):');
for (const [k, c] of [...cueTally].sort((a, b) => b[1] - a[1])) console.log(`  ${pct(c).padStart(6)}  ${k}`);
if (showMisses && misses.length){
  console.log(`\n${label === 'phish' ? 'Missed' : 'Flagged'} (${misses.length}), lowest scores first. Local inspection only, don't commit:`);
  for (const m of misses.sort((a, b) => a.score - b.score).slice(0, showMisses)) console.log(`  ${String(m.score).padStart(3)}  ${m.from.padEnd(28).slice(0, 28)}  ${m.subject}  [${m.top.join('; ')}]`);
}
