# VerifiedDR CLI

A tiny, dependency-free CLI for the [VerifiedDR](https://verifieddr.com) API.
Look up a domain's **DR**, **TrueDR**, trust score and confidence, discover
trusted sites, grab badge snippets, and monitor authority changes — all as clean
JSON, ideal for scripts, CI, dashboards, and AI agents.

It is a thin HTTP client: it talks only to `https://verifieddr.com/api/v1` with
your own API key. It never touches a database or any admin credential.

## Quickstart

```bash
# Install the skill
npx skills add thijssmudde/verifieddr-cli

# Set your API key
export VERIFIEDDR_API_KEY=vdr_your_key

# List your sites
vdr sites:list

# Look up any domain's authority
vdr authority:lookup stripe.com
```

Get a free key in your VerifiedDR dashboard — the **free tier includes 100
calls/month**; **Pro** and **Agency** raise the limit. Install the CLI with
`npm install -g verifieddr`, or run any command through `npx verifieddr …`.
Requires Node.js ≥ 18.

Every command needs a key and is metered against your monthly quota;
remaining quota and your tier are printed to stderr (and returned as
`X-API-Quota-Remaining` / `X-API-Tier` headers). Pass `--key vdr_…` instead of
the env var on any command.

## Commands

Commands follow a `resource:action` shape.

```bash
# Public discovery — works for ANY approved site
vdr authority:lookup stripe.com       # DR, TrueDR, trust score, evidence
vdr discover:find --category ai --min-truedr 50 --traffic-validated --limit 10
vdr badge:snippets stripe.com         # badge / embed snippets
vdr categories:list                   # valid category values

# Your own sites (owner-scoped)
vdr sites:list                        # list your sites + metrics
vdr sites:get example.com             # one site with DR/traffic trends
vdr sites:truedr example.com --detailed   # TrueDR + full signal breakdown
vdr sites:export example.com          # machine-readable export
vdr sites:monitor --daily             # watch all your sites for changes
vdr sites:monitor example.com         # watch one site
vdr sites:submit https://example.com --title "Example" --category saas
vdr sites:verify example.com          # re-check the badge embed
```

> The pre-`0.2` verbs (`lookup`, `find`, `sites`, `monitor`, …) still work as
> hidden aliases, so existing scripts keep running.

### What's public vs. private

- **Public fields, any site** (`authority:lookup`, `discover:find`,
  `badge:snippets`): DR, TrueDR, trust score, confidence, traffic validation,
  public backlink totals, badge links. Never owner identity, billing state, or
  the per-signal trust breakdown.
- **Owner-scoped** (`sites:*`): only your own claimed sites.
  `sites:truedr --detailed` returns the full signal breakdown for sites you own.

## Output

Everything is JSON on stdout with an `ok` boolean; quota and diagnostics go to
stderr. Pipe into `jq`:

```bash
vdr authority:lookup stripe.com | jq '.lookup.authority'
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
that teaches assistants when and how to call these commands. Install it straight
into your agent with:

```bash
npx skills add thijssmudde/verifieddr-cli
```

## License

MIT
