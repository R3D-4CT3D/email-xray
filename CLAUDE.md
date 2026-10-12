# Email X-Ray: notes for Claude Code

## What this is
A client-side phishing email analyzer. Vanilla JS ES modules built with Vite (root is `src/`, output is `dist/`). The only runtime dependency is `@kenjiuno/msgreader` for `.msg` files, loaded through a dynamic `import()` so it stays in its own chunk. Roadmap is in `NEXT_STEPS.md`.

## Conventions
- No em dashes in any user-facing text or docs.
- Plain-English explanations in Standard mode. Analyst terms belong in Investigator mode.
- The browser must never fetch links or open attachments from an analyzed email.
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
- `src/parse/msgreader.js` must import `./buffer-shim.js` before msgreader, which expects Node's `Buffer` global.

## Testing
- `npm test` runs Vitest (jsdom environment) over `tests/`. Fixtures are in `samples/`, described in `samples/README.md`.
- Every check has a fixture and a test file. A new check needs both.
- `tests/verdicts.test.js` pins the score band of every fixture. Scoring or lookalike changes must keep it green, or update it deliberately.
- Known false positives are `test.fails` cases in `tests/domains.test.js`. When a fix makes one fail, move it to the passing list.
- `tests/page.test.js` automates the manual check: click "Try a sample phish", expect "Likely phishing" with the hop route, lookalike, and attachment findings.
- CI: `.github/workflows/test.yml` on every push and PR; `pages.yml` tests, builds, and deploys `dist/` from `main`.
