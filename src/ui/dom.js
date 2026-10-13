/* Tiny DOM helpers. el() only ever sets text and attributes, never HTML. */
import { SEV_LABEL } from '../data.js';

export const $ = s => document.querySelector(s);
export function el(tag, props, ...kids){
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(props||{})){
    if (v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const c of kids.flat()){
    if (c == null || c === false) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}
export const pill = (sev, text) => el('span', {class:'pill s-' + sev, text: text || SEV_LABEL[sev]});
export function block(title, sub, ...content){
  return el('section', {class:'block'}, el('h2', {text:title}), sub ? el('p', {class:'sub', text:sub}) : null, ...content);
}
