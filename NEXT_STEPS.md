# Email X-Ray roadmap

Work top to bottom. Each phase ends in something you can demo.

## Phase 0: Set up the repo (30 minutes)

1. Create a GitHub repo named `email-xray` and push this folder.
2. Turn on GitHub Pages (Settings, Pages, deploy from `main`, folder `/src`) so the tool has a public URL outside claude.ai.
3. Add screenshots of Standard and Investigator mode to `docs/` and link them in the README.
4. Pin the repo on your GitHub profile.

## Phase 1: Make it standalone (1 evening)

The current file was built for the claude.ai artifact runtime. Make it work anywhere.

1. Replace `CAP.dl.save(...)` with a standard Blob download (`URL.createObjectURL` plus a temporary `<a download>`), so CSV, STIX, and report exports work on GitHub Pages.
2. Hide the AI second read when `window.claude` is missing (already handled), and add a note that it moves to the backend in Phase 4.
3. Add a drag-and-drop zone for `.eml` files.
4. Add `.msg` (Outlook) support with a small library such as `@kenjiuno/msgreader`.

## Phase 2: Split the code and add tests (1 weekend)

1. Move to a Vite project: `src/parse/` (MIME, headers, Received), `src/checks/` (sender, auth, links, attachments, language), `src/export/` (IOC, STIX, report), `src/ui/`.
2. Add Vitest. Write one test per check using `.eml` fixtures in `samples/`.
3. Build a fixture corpus: 10 real phish from your spam folder (scrub your own address), 10 legitimate emails (bank, Amazon, newsletters) to catch false positives. Never commit real people's personal data.
4. Track false positives and tune lookalike detection and scoring weights against the corpus.
5. Add GitHub Actions to run tests on every push.

## Phase 3: Backend for network lookups (1 to 2 weekends)

A small server that holds API keys and does lookups the browser shouldn't. Good fits: a Cloudflare Worker (free tier) or a Node/Express app.

| Endpoint | Purpose | Source |
|---|---|---|
| `GET /ip/:ip` | Geolocation, ASN, hosting provider | ipinfo.io or MaxMind GeoLite2 |
| `GET /ip/:ip/reputation` | Abuse reports | AbuseIPDB |
| `GET /domain/:d/age` | Registration date | RDAP (free, no key) |
| `GET /url/expand?u=` | Follow shortener redirects with HEAD requests only, no page rendering | Your server |
| `GET /url/reputation?u=` | Known-bad URL check | VirusTotal, URLhaus, Google Safe Browsing |
| `GET /hash/:sha256` | Attachment reputation | VirusTotal, MalwareBazaar |
| `POST /dkim/verify` | Real DKIM verification against DNS | `mailauth` npm package |

Rules for the backend:
- Keys live in environment variables, never in the frontend.
- Never log email bodies. Log only request type and timing.
- Rate limit per IP.
- The browser never contacts phishing infrastructure directly.

Then in the frontend:
1. Add a "Run network checks" toggle in Investigator mode, off by default, with a note explaining what gets sent.
2. Draw the route on a map with Leaflet and OpenStreetMap tiles. This is the big "wow" moment.
3. Add domain age to the sender and link findings. Under 30 days is high risk.
4. Show reputation hits next to each IOC.

## Phase 4: AI analysis through the backend (1 evening)

Move the AI second read to a backend route that calls the Claude API with your key, so it works on GitHub Pages. Keep the prompt that treats the email as untrusted data.

## Phase 5: Analyst workflow (stretch)

- Bulk mode: drop in a folder of `.eml` files, get a sortable triage table.
- Campaign clustering: group emails sharing infrastructure, kits, or templates.
- Export to MISP or TheHive.
- A Gmail or Outlook add-in with a "Scan this email" button.

## Portfolio tips

- Write a short case study in `docs/case-study.md`: one real phish, what the tool found, how it maps to ATT&CK.
- Record a 60-second screen capture of the sample scan and the Investigator view.
- In interviews, lead with the investigator angle: header analysis, IOC extraction, and STIX export are what cyber investigators do after a report comes in.
