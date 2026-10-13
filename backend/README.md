# Email X-Ray API

A Cloudflare Worker that does the network lookups the browser shouldn't make itself. No API keys needed yet.

| Endpoint | Returns | Source |
|---|---|---|
| `GET /domain/:domain/age` | Registration date, age in days, expiry, registrar | RDAP via rdap.org |
| `GET /ip/:ip` | Network name, owner, country, address range, regional registry | RDAP via rdap.org |
| `GET /url/expand?u=` | The redirect chain behind a shortened link | HEAD requests to the shortener only |
| `GET /health` | `{ "ok": true }` | |

## Rules it follows

- Only links on known shortener services (the `SHORTENERS` list in `src/data.js`) are requested. The first address outside a shortener is reported, never visited.
- Every input is validated first. Private, loopback, and reserved IPs are rejected.
- Upstream answers are size-capped and time out.
- Logs record the route, status, and timing. They never record the domain, IP, or link that was looked up.
- 60 lookups per minute per client IP, per Cloudflare location. Results are cached for a day (an hour for links).
- CORS allows only the GitHub Pages site and the Vite dev server (`ALLOWED_ORIGINS` in `wrangler.jsonc`).

## Develop

Wrangler needs Node 22 or newer.

```bash
npm install
npm test          # runs on Node 18 too
npm run dev       # http://localhost:8787
```

## Deploy (one-time setup)

1. Create a free Cloudflare account.
2. In the Cloudflare dashboard, create an API token from the **Edit Cloudflare Workers** template.
3. In the GitHub repo, go to Settings, then Secrets and variables, then Actions, and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (shown on the Workers overview page).
4. Run the **Deploy API Worker** workflow, or push a change under `backend/` to `main`.

The Worker is then live at `https://email-xray-api.<your-subdomain>.workers.dev`.
