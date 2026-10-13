/* Host integration: claude.ai runtime capabilities when present, browser fallbacks otherwise. */
import { el } from './dom.js';

export const CAP = {dl:null, sample:null};
if (window.claude && typeof window.claude.use === 'function'){
  window.claude.use('downloads').then(d => { CAP.dl = d; }).catch(() => {});
  window.claude.use('sample').then(sm => { CAP.sample = sm; if (sm) document.body.classList.add('has-ai'); }).catch(() => {});
}
export function flash(btn, txt){
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.textContent = txt;
  clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = btn.dataset.label; }, 1800);
}
export async function copyText(t, btn){
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; }
  catch(e){
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('style','position:fixed;top:0;left:0;opacity:0');
    document.body.append(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch(_){}
    ta.remove();
  }
  flash(btn, ok ? 'Copied' : 'Copy blocked here');
}
const MIME = {csv:'text/csv', json:'application/json', md:'text/markdown'};
function blobDownload(name, data){
  const url = URL.createObjectURL(new Blob([data], {type:(MIME[name.split('.').pop()] || 'text/plain') + ';charset=utf-8'}));
  const a = el('a', {href:url, download:name, hidden:''});
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function saveFile(name, data, btn){
  // Inside claude.ai the sandbox blocks <a download>, so use the runtime's save dialog there.
  if (!CAP.dl){
    try { blobDownload(name, data); flash(btn, 'Downloaded'); } catch(e){ flash(btn, 'Couldn\'t save'); }
    return;
  }
  try { const res = await CAP.dl.save({filename:name, data}); if (res && res.status === 'saved') flash(btn, 'Saved'); }
  catch(e){
    const c = e && e.code;
    if (c === 'declined') return;
    flash(btn, c === 'rate_limited' ? 'Try again in a moment' : 'Couldn\'t save');
  }
}
