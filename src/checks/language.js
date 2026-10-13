/* Language checks: pressure phrases. Scored lower than technical checks and capped. */
import { CUES } from '../data.js';

export function checkLanguage(allText){
  const cues = [];
  for (const [re, label] of CUES){ const m = allText.match(re); if (m) cues.push({label, match:m[0]}); }
  return {cues, points: Math.min(cues.length * 4, 20)};
}
