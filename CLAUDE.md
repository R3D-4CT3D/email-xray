# Email X-Ray: notes for Claude Code

## What this is
A client-side phishing email analyzer. The whole app is `src/index.html` (vanilla JS, no runtime dependencies). The one exception is `src/vendor/msgreader.min.js`, a vendored bundle lazy-loaded only for `.msg` files; rebuild it with `tools/msgreader/` (`npm ci && npm run build`), never edit it by hand. Roadmap is in `NEXT_STEPS.md`.

## Conventions
- No em dashes in any user-facing text or docs.
- Plain-English explanations in Standard mode. Analyst terms belong in Investigator mode.
- The browser must never fetch links or open attachments from an analyzed email.
- Indicators are always defanged in exports and reports.
- Every new check needs a test fixture in `samples/` once tests exist (Phase 2).

## Key functions in src/index.html
- `analyze(raw)`: parses headers and MIME, runs all checks, returns findings and score
- `enrich(r, raw)`: hashes, case ID, IOCs, ATT&CK mapping (async)
- `render(r)`: builds the results UI
- `lookalike(host)`: brand impersonation detection
- `buildIOCs`, `mapAttack`, `stixBundle`, `reportMD`: Investigator exports
- `saveFile(name, data, btn)`: claude.ai save dialog when available, otherwise a Blob download
- `loadFile(f)` / `msgToRaw`: file picker and drag-and-drop entry point; converts `.msg` to raw RFC 822 text before `analyze`

## Testing
Open `src/index.html`, click "Try a sample phish", and check that the verdict is "Likely phishing" with the hop route, lookalike, and attachment findings present.
