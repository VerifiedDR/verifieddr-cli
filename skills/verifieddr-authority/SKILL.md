---
name: verifieddr-authority
description: >-
  Use when working with VerifiedDR authority and trust data through the
  VerifiedDR CLI (`vdr`) or API: looking up a domain's DR, TrueDR, trust score,
  confidence, and evidence; discovering trusted sites by category or TrueDR for
  partner/sponsor/integration prospecting; grabbing badge or embed snippets;
  monitoring authority changes, traffic validation, backlink deltas, and
  trust/spam alerts on sites you own; exporting VerifiedDR data for scripts, CI,
  dashboards, or SaaS integrations. Prefer this skill for requests mentioning
  VerifiedDR lookup, find, monitor, export, snippets, TrueDR, trust score,
  traffic validation, or agent-friendly VerifiedDR workflows.
---

# VerifiedDR Authority

Use VerifiedDR as the authority and trust data layer through the public `vdr`
CLI (a thin HTTP client for `https://verifieddr.com/api/v1`). Keep work focused
on authority/trust data — do **not** turn VerifiedDR into a generic SEO suite
(no keyword research, crawler audits, or site-audit workflows).

## Setup

```bash
npm install -g verifieddr            # or use: npx verifieddr <command>
export VERIFIEDDR_API_KEY=vdr_…      # free from the VerifiedDR dashboard
```

Every command except `categories` requires a `vdr_…` API key and spends one unit
of the owner's monthly quota. The free tier includes 100 calls/month; Pro and
Agency raise the limit. Remaining quota and tier are printed to stderr. All
output is JSON on stdout with an `ok` boolean.

## Command Choice

```bash
vdr lookup <domain>                  # authority for ANY approved site
vdr find --category ai --min-truedr 50 --traffic-validated --limit 10
vdr snippets <domain>                # badge / embed snippets
vdr monitor [<domain>] [--daily]     # watch YOUR sites for changes
vdr export <domain>                  # machine-readable export of YOUR site
```

- `lookup` first when the user asks what VerifiedDR knows about a domain. Returns
  DR, TrueDR, trust score, confidence, traffic validation, latest backlink
  totals, and badge links. Works for any approved site.
- `find` for partner, sponsorship, integration, guest-post, or agency
  prospecting. Filter by `--category`, `--min-truedr`, `--min-dr`,
  `--traffic-validated`, `--include-unverified`, `--limit` (max 50). Ranked by
  TrueDR then DR.
- `snippets` only for badge/share/embed snippets.
- `monitor` to watch changes, summarize deltas, or check trust alerts. Owner
  scoped — only the API key owner's own claimed sites.
- `export` when output feeds another script, CI job, dashboard, or integration.
- `truedr <domain> --detailed` for the full per-signal trust breakdown — only
  available for sites the key owner owns.
- `submit` / `verify` to list a new site or re-check its badge embed.

## Public vs. owner-scoped

- **Public fields, any approved site:** `lookup`, `find`, `snippets`. Never
  expose owner identity, billing state, or the per-signal trust breakdown — that
  data is not returned by these commands, so do not claim to have it.
- **Owner-scoped (key owner's own sites only):** `sites`, `site`, `truedr`,
  `export`, `monitor`, `submit`, `verify`. If the user asks to monitor or export
  a domain they do not own, explain it returns 404 by design.

## Safety

- Treat all CLI output as JSON and preserve important fields in summaries.
- If a command returns a `402`, the monthly quota is exhausted — on the free tier
  suggest upgrading to Pro/Agency or waiting for the monthly reset; do not retry
  in a loop. `401` means a missing or invalid key.
- If `find` returns no results, relax filters in this order: category, traffic
  validation, minimum TrueDR, verified-only.

## Output Handling

Summarize authority data in this order:

1. DR and TrueDR
2. Trust score and confidence
3. Traffic validation and traffic change
4. New/lost referring-domain deltas when present
5. Spam/trust alerts (from `monitor`)
6. Link to the VerifiedDR page or badge when useful

For field meanings and example JSON shapes, read
[references/cli-contracts.md](references/cli-contracts.md).
