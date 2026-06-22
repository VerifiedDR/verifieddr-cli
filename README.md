# VerifiedDR CLI

A tiny, dependency-free CLI for the [VerifiedDR](https://verifieddr.com) API.
Use it to understand why a domain's **TrueDR** is weak, what to do next, and
whether the work is improving authority over time. The lower-level API commands
still return clean JSON for scripts, CI, dashboards, and AI agents.

It is a thin HTTP client: it talks only to `https://verifieddr.com/api/v1` with
your own API key. It never touches a database or any admin credential.

## Quickstart

```bash
# Install the skill
npx skills add thijssmudde/verifieddr-cli

# Install the CLI
npm install -g verifieddr

# Set your API key
export VERIFIEDDR_API_KEY=vdr_your_key

# Get a score, diagnosis, and next actions
vdr analyze verifieddr.com

# Get the single best next action
vdr next verifieddr.com
```

Get a free key in your VerifiedDR dashboard — **Free** includes 10 calls/day,
**Pro** includes 1,000 calls/month, and **Agency** includes 10,000 calls/month.
Requires Node.js ≥ 18. If global installs are unavailable, run any command
through `npx verifieddr …`.

Every command needs a key and is metered against your plan quota; remaining
quota and your tier are printed to stderr (and returned as
`X-API-Quota-Remaining` / `X-API-Tier` headers). Pass `--key vdr_…` instead of
the env var on any command.

## Commands

The coach commands are the default product surface:

```bash
vdr analyze example.com              # score, main issue, top 3 actions
vdr diagnose example.com             # why TrueDR is lower than DR
vdr actions example.com              # ranked by impact, effort, confidence
vdr opportunities example.com        # directories, partners, backlink ideas
vdr opportunities example.com --contact partner-slug  # send mail to a listed opportunity
vdr audit backlinks example.com      # backlink risk review
vdr content-plan example.com         # authority-supporting page plan
vdr fix example.com --goal +10       # 30/60/90-day growth plan
vdr track example.com                # whether TrueDR is moving
vdr explain example.com              # client/founder-ready explanation
vdr boost example.com                # recommended authority campaign
vdr next example.com                 # single best next action
```

`vdr opportunities` includes potential partnership candidates. Free users see
redacted candidate rows with authority metrics; Pro and Agency users see the
actual site names/domains. It uses the lookup and opportunities APIs, so it can
spend two quota calls when partner candidates are requested.

Pro and Agency users can contact a listed partner without seeing the owner's
email address:

```bash
vdr opportunities example.com --contact partner-slug
vdr opportunities example.com --contact partner-slug --message "Custom outreach copy..."
```

The email is sent through VerifiedDR's partnership mail system, using the same
ownership, opt-out, quota, and confirmation flow as the dashboard UI.

The API commands follow a `resource:action` shape:

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

Coach commands print plain-English guidance on stdout. API commands print JSON
on stdout with an `ok` boolean; quota and diagnostics go to stderr. Pipe API
commands into `jq`:

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
