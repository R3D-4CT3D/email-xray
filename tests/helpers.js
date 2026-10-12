import fs from 'node:fs';
import path from 'node:path';
import { analyze } from '../src/analyze.js';

// Tests run from the repo root. (jsdom replaces the global URL, so file URLs don't work with fs here.)
const fixturePath = name => path.resolve('samples', name);
export const fixture = name => fs.readFileSync(fixturePath(name), 'utf8');
export const fixtureBytes = name => new Uint8Array(fs.readFileSync(fixturePath(name)));
export const scan = name => analyze(fixture(name));
// [severity, title] pairs for one area, in the order the check raised them.
export const found = (r, area) => r.F.filter(f => f.area === area).map(f => [f.sev, f.title]);
