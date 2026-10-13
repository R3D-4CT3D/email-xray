/* Entry point: wires the page controls to analyze, enrich, and render. */
import { analyze } from './analyze.js';
import { enrich } from './enrich.js';
import { isOle, msgToRaw, loadMsgReader } from './parse/msg.js';
import { $ } from './ui/dom.js';
import { render } from './ui/render.js';
import { MODE, setMode } from './ui/mode.js';
import './ui/runtime.js';
import SAMPLE from '../samples/paypal-lookalike.eml?raw';

setMode(MODE);

let loaded = null; // {raw, note} for the last opened file, so its note stays while that text is scanned
async function loadFile(f){
  const err = $('#err'); err.hidden = true;
  try {
    const buf = new Uint8Array(await f.arrayBuffer());
    let out;
    if (/\.msg$/i.test(f.name) || isOle(buf)){
      if (!isOle(buf)) throw new Error('msg');
      out = msgToRaw(await loadMsgReader(), buf);
    } else out = {raw: new TextDecoder('utf-8').decode(buf), note: ''};
    loaded = out; $('#raw').value = out.raw; run();
  } catch(e){
    console.error(e);
    err.textContent = /\.msg$/i.test(f.name) ? 'This .msg file couldn\'t be read. Try saving the email again from Outlook, or copy its raw source instead.' : 'This file couldn\'t be read.';
    err.hidden = false;
  }
}
async function run(){
  const raw = $('#raw').value;
  const err = $('#err'); err.hidden = true;
  const note = $('#note'); note.textContent = loaded && loaded.raw === raw ? loaded.note : ''; note.hidden = !note.textContent;
  if (!raw.trim()){ err.textContent = 'Paste the raw email first, headers included. See "How to get the raw source" below.'; err.hidden = false; return; }
  try { const r = analyze(raw); await enrich(r, raw); render(r); }
  catch(e){
    console.error(e);
    err.textContent = e.message === 'nohdr' ? 'No email headers found. Paste the full original source, starting with lines like "Received:" or "From:", not just the message text.' : 'This email couldn\'t be read. Check that the full raw source was pasted.';
    err.hidden = false; $('#results').hidden = true;
  }
}
$('#go').addEventListener('click', run);
$('#sample').addEventListener('click', () => { $('#raw').value = SAMPLE; run(); });
$('#file-btn').addEventListener('click', () => $('#file').click());
$('#file').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  loadFile(f);
  e.target.value = '';
});
// Drop anywhere on the page. Every drop is intercepted so the browser never opens a dropped file itself.
const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
let dragDepth = 0;
window.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
window.addEventListener('dragover', e => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
window.addEventListener('dragleave', e => { if (!hasFiles(e)) return; if (--dragDepth <= 0){ dragDepth = 0; document.body.classList.remove('dragging'); } });
window.addEventListener('drop', e => {
  if (!hasFiles(e) && e.target === $('#raw')) return; // plain text dragged into the box
  e.preventDefault(); dragDepth = 0; document.body.classList.remove('dragging');
  const f = e.dataTransfer && e.dataTransfer.files[0];
  if (f) loadFile(f);
});
