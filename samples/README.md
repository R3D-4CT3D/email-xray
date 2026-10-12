# Test fixtures

Every check has a fixture here, and `tests/` asserts what each one should produce.

| File | What it exercises |
|---|---|
| `paypal-lookalike.eml` | The "Try a sample phish" email: lookalike sender, freemail Reply-To, DMARC fail, decoy link, `.pdf.html` attachment |
| `legit-newsletter.eml` | False-positive guard: aligned SPF/DKIM/DMARC, matching links, windows-1252 quoted-printable |
| `sender-spoofing.eml` | Fake address in the display name, brand name on a non-brand domain, freemail Reply-To, bounce and Message-ID mismatches, mass mailer |
| `sender-lookalike.eml` | Lookalike sender domain (`arnazon`) with passing DMARC |
| `auth-failures.eml` | SPF, DKIM, and DMARC all failing |
| `route-anomalies.eml` | Long pause, backwards timestamps, HELO/rDNS mismatch, X-Originating-IP |
| `links-tricks.eml` | IP links, the `@` trick, `javascript:` and `data:` links, text/target mismatch, decoy subdomain, punycode, shortener, free host, abused TLD, deep subdomains, form action |
| `attachments-risky.eml` | Executable with a double extension, archive, harmless text file, RFC 2231 encoded filename |
| `language-pressure.eml` | Pressure phrases with no links or attachments |
| `msgreader-attach-sample.msg` | Outlook `.msg` with transport headers and an attachment |

## Rules

- Synthetic fixtures use reserved names and addresses only: `example.com`, `.example`, `.test`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`.
- Real phish go in with your own address replaced by `you@example.com`. Never commit another person's name, address, or message content.
- `.eml` files are stored byte for byte (see `.gitattributes`).

## Attribution

`msgreader-attach-sample.msg` is `test/Attach sample eml received.msg` from [HiraokaHyperTools/msgreader](https://github.com/HiraokaHyperTools/msgreader), licensed under the Apache License 2.0.
