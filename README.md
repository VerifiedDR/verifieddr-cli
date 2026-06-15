# VerifiedDR CLI

A tiny, dependency-free CLI for the [VerifiedDR](https://verifieddr.com) API.
Look up a domain's **DR**, **TrueDR**, trust score and confidence, discover
trusted sites, grab badge snippets, and monitor authority changes — all as clean
JSON, ideal for scripts, CI, dashboards, and AI agents.

It is a thin HTTP client: it talks only to `https://verifieddr.com/api/v1` with
your own API key. It never touches a database or any admin credential.

## Install

```bash
npm install -g verifieddr
# or run without installing:
npx verifieddr lookup vercel.com
```

Requires Node.js ≥ 18.

## Authenticate

Every command except `categories` needs an API key. Create one free in your
VerifiedDR dashboard — the **free tier includes 100 calls/month**; **Pro** and
**Agency** raise the limit. Calls are metered against your monthly quota;
remaining quota and your tier are printed to stderr (and returned as
`X-API-Quota-Remaining` / `X-API-Tier` headers).

```bash
export VERIFIEDDR_API_KEY=vdr_xxxxxxxxxxxxxxxxxxxx
# or pass --key vdr_… on any command
```

## Usage

```bash
# Public discovery — works for ANY approved site
vdr lookup stripe.com                 # DR, TrueDR, trust score, evidence
vdr find --category ai --min-truedr 50 --traffic-validated --limit 10
vdr snippets stripe.com               # badge / embed snippets
vdr categories                        # valid category values (no key needed)

# Your own sites (owner-scoped)
vdr sites                             # list your sites + metrics
vdr site example.com                  # one site with DR/traffic trends
vdr truedr example.com --detailed     # TrueDR + full signal breakdown
vdr export example.com                # machine-readable export
vdr monitor --daily                   # watch all your sites for changes
vdr monitor example.com               # watch one site
vdr submit https://example.com --title "Example" --category saas
vdr verify example.com                # re-check the badge embed
```

### What's public vs. private

- **Public fields, any site** (`lookup`, `find`, `snippets`): DR, TrueDR, trust
  score, confidence, traffic validation, public backlink totals, badge links.
  Never owner identity, billing state, or the per-signal trust breakdown.
- **Owner-scoped** (`sites`, `site`, `truedr`, `export`, `monitor`, `submit`,
  `verify`): only your own claimed sites. `truedr --detailed` returns the full
  signal breakdown for sites you own.

## Output

Everything is JSON on stdout with an `ok` boolean; quota and diagnostics go to
stderr. Pipe into `jq`:

```bash
vdr lookup stripe.com | jq '.lookup.authority'
```

## Exit codes

| code | meaning |
| ---- | ------- |
| 0 | success |
| 2 | bad usage / missing argument |
| 3 | missing API key |
| 4 | network error |
| 5 | quota exhausted (HTTP 402) |
| 6 | other API error |

## Using it with AI agents

This repo ships an agent **skill** under [`skills/verifieddr-authority`](skills/verifieddr-authority/SKILL.md)
that teaches assistants when and how to call these commands. Point your agent
framework at that folder.

## License

MIT
