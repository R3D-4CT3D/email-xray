/* Standard vs Investigator view, remembered per browser. */

export let MODE = 'standard';
try { MODE = localStorage.getItem('xray-mode') || 'standard'; } catch(e){}
export function setMode(m){
  MODE = m;
  document.body.classList.toggle('inv', m === 'inv');
  document.querySelectorAll('.modebar button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  try { localStorage.setItem('xray-mode', m); } catch(e){}
}
