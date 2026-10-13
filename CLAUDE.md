# Email X-Ray: notes for Claude Code

## What this is
A client-side phishing email analyzer. Vanilla JS ES modules built with Vite (root is `src/`, output is `dist/`). The only runtime dependency is `@kenjiuno/msgreader` for `.msg` files, loaded through a dynamic `import()` so it stays in its own chunk. Roadmap is in `NEXT_STEPS.md`.

## Conventions
- No em dashes in any user-facing text or docs.
- Plain-English explanations in Standard mode. Analyst terms belong in Investigator mode.
- The browser must never fetch links or open attachments from an analyzed email. Network lookups go through `backend/` only when the analyst runs them, and the backend only requests shortener hosts and RDAP.
- Indicators are always defanged in exports and reports.
- Every new check needs a test fixture in `samples/` and a test in `tests/`.

## Key modules
- `src/analyze.js` `analyze(raw)`: parses headers and MIME, runs every check, returns findings and score. `verdictFor(score)` lives here too.
- `src/checks/*.js`: one module per check (`sender`, `auth`, `route`, `links`, `attachments`, `language`). Each returns `{findings, ...data}`; `analyze` concatenates findings in that order.
- `src/checks/domains.js` `lookalike(host)`: brand impersonation detection, plus `registrable`, `sameOrg`, `knownBrand`.
- `src/enrich.js` `enrich(r, raw)`: hashes, case ID, IOCs, ATT&CK mapping (async).
- `src/export/`: `buildIOCs`, `defang`, `iocCSV`, `mapAttack`, `stixBundle`, `reportMD`, `md5`/`sha`.
- `src/ui/render.js` `render(r)`: builds the results UI. `src/ui/investigator.js` has the Investigator-only blocks.
- `src/ui/runtime.js` `saveFile(name, data, btn)`: claude.ai save dialog when available, otherwise a Blob download.
- `src/main.js` `loadFile(f)`: file picker and drag-and-drop entry point. `src/parse/msg.js` `msgToRaw` converts `.msg` to raw RFC 822 text before `analyze`.
- `npm run build:artifact` (Vite `--mode artifact`) inlines everything into `dist-artifact/index.html` for the claude.ai artifact, which serves one page. License notices go in a trailing HTML comment there.
- `src/network.js`: `networkTargets(r)` (what would be sent), `runLookups`, `applyNetwork(r, net)` (adds findings and expanded links, then re-scores with `scoreOf`). API URL comes from `VITE_API_URL` at build time.
- `backend/`: the Cloudflare Worker (RDAP domain age and IP owner, shortener expansion). Own package and tests; `cd backend && npm test`. Wrangler needs Node 22.
- `src/parse/msgreader.js` must import `./buffer-shim.js` before msgreader, which expects Node's `Buffer` global.

## Testing
- `npm test` runs Vitest (jsdom environment) over `tests/`. Fixtures are in `samples/`, described in `samples/README.md`.
- Every check has a fixture and a test file. A new check needs both.
- Before and after any change to checks or scoring, run `npm run eval` (setup in `tools/eval/README.md`) and record both numbers. Corpora live in `corpus/`, which is git-ignored and must never be committed.
- `tests/verdicts.test.js` pins the score band of every fixture, plus known false negatives as `test.fails`. Scoring or lookalike changes must keep it green, or update it deliberately.
- `tests/domains.test.js` holds a phish list and a benign list for `lookalike`. Add every new false positive or miss there. A known but unfixed one goes in as `test.fails`, so the fix flips it.
- `tests/page.test.js` automates the manual check: click "Try a sample phish", expect "Likely phishing" with the hop route, lookalike, and attachment findings.
- CI: `.github/workflows/test.yml` on every push and PR; `pages.yml` tests, builds, and deploys `dist/` from `main`.
