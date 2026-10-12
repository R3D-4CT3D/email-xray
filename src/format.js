/* Display formatting shared by the analysis, UI, and report. */

export function fmtDur(ms){
  const neg = ms < 0; ms = Math.abs(ms);
  const s = Math.round(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  const t = s < 60 ? `${s}s` : m < 60 ? `${m}m ${s%60}s` : `${h}h ${m%60}m`;
  return neg ? `-${t}` : t;
}
export const fmtTime = d => d.toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit'});
export const fmtSize = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`;
