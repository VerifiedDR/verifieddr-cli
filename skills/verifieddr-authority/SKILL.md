---
name: verifieddr-authority
description: >-
  Use when working with VerifiedDR authority and trust data through the
  VerifiedDR CLI (`vdr`) or API: diagnosing why TrueDR is lower than DR,
  choosing the next authority action, generating growth plans, explaining
  authority gaps to clients/founders, looking up DR/TrueDR/trust evidence,
  discovering trusted sites by category or TrueDR for partner/sponsor/integration
  prospecting, grabbing badge or embed snippets, monitoring authority changes,
  traffic validation, backlink deltas, trust/spam alerts on sites you own, and
  Google disavow candidate files for spammy links; exporting VerifiedDR data for
  scripts, CI, dashboards, or SaaS integrations.
  Prefer this skill for requests mentioning VerifiedDR analyze, diagnose,
  actions, opportunities, next, lookup, find, monitor, export, snippets, TrueDR,
  trust score, traffic validation, disavow, spam links, or agent-friendly
  VerifiedDR workflows.
---

# VerifiedDR Authority

Use VerifiedDR as the authority and trust data layer through the public `vdr`
CLI (a thin HTTP client for `https://verifieddr.com/api/v1`). Keep work focused
on authority/trust data — do **not** turn VerifiedDR into a generic SEO suite
(no keyword research, crawler audits, or site-audit workflows).

## Quickstart

```bash
# Install the skill
npx skills add VerifiedDR/verifieddr-cli

# Install the CLI
npm install -g verifieddr

# Set your API key
export VERIFIEDDR_API_KEY=vdr_your_key

# Get a score, diagnosis, and next actions
vdr analyze verifieddr.com

# Get the best next partner/action
vdr next verifieddr.com

# Surface verified partners worth contacting
vdr opportunities verifieddr.com

# Render the backlink map in the terminal
vdr map verifieddr.com
```

Every command requires a `vdr_…` API key and spends one unit of the owner's
plan quota. Free includes 10 calls/day, Pro includes 1,000 calls/month, and
Agency includes 10,000 calls/month. Remaining quota and tier are printed to
stderr. Coach commands print plain-English guidance; API commands print JSON on
stdout with an `ok` boolean. If global installs are unavailable, run commands
through `npx verifieddr <command>`.

## Command Choice

Prefer coach commands when the user wants advice, prioritization, or a client
explanation:

```bash
vdr analyze <domain>                  # score, main issue, top 3 actions
vdr diagnose <domain>                 # why TrueDR is lower than DR
vdr actions <domain>                  # ranked by impact/effort/confidence
vdr opportunities <domain>            # verified partners, directories, backlink ideas
vdr opportunities <domain> --contact <slug> # send drafted mail to a listed partner
vdr opportunities <domain> --contact <slug> --dry-run # preview contact payload
vdr audit backlinks <domain>          # backlink risk review
vdr content-plan <domain>             # authority-supporting page plan
vdr fix <domain> --goal +10           # 30/60/90-day growth plan
vdr track <domain>                    # whether TrueDR is moving
vdr explain <domain>                  # client/founder-ready explanation
vdr boost <domain>                    # recommended authority campaign
vdr next <domain>                     # best next partner/action
```

The coach loop is partner-first: `next` prefers one concrete verified partner
action when that is the fastest useful authority move. `opportunities` can
surface potential partnership candidates, the outreach angle, and the exact
command to approve before sending. Partner names are shown on every plan;
sending the contact request is the paid action. Pro and Agency users can contact
a listed partner with `vdr opportunities <domain> --contact <slug-or-domain>`,
which sends drafted mail through VerifiedDR's partnership mail system without
exposing the target owner's email. Add `--subject`, `--message`, and `--dry-run`
to preview the exact payload before sending. Partner candidates require an
additional opportunities lookup, so this command can spend two quota calls.

Use API commands when the user needs raw data, scripting, or integrations:

```bash
vdr authority:lookup <domain>        # authority for ANY approved site
vdr map <domain>                     # terminal backlink map for any approved site
vdr map <domain> --json              # raw DR Map data
vdr discover:find --category ai --min-truedr 50 --traffic-validated --limit 10
vdr discover:find --opportunities-for example.com --limit 10
vdr badge:snippets <domain>          # badge / embed snippets
vdr sites:list                       # list YOUR sites
vdr sites:monitor [<domain>] [--daily]   # watch YOUR sites for changes
vdr sites:export <domain>            # machine-readable export of YOUR site
vdr sites:disavow <domain>           # Google disavow candidates for spam links
```

## Growth Loop Prompts

When the user asks for a workflow instead of a specific command, run the
appropriate CLI commands yourself and summarize the loop. Good user prompts this
skill should support:

```text
Run the VerifiedDR growth loop for example.com.
Start by analyzing the current TrueDR gap, then run `vdr sites:truedr
example.com --detailed` to inspect owner-scoped recommendations. Only if spam
links or spamRatio are a top action, generate disavow candidates with `vdr
sites:disavow example.com --min-spam 50`, summarize exactly which domains need
manual approval before upload, then choose the highest-leverage partner
opportunity, draft the outreach angle, and end with the exact command I should
approve next. If no spam links are found, skip disavow and say so.
```

```text
Act as my authority coach for example.com.
Use VerifiedDR to diagnose why TrueDR is lower than DR, rank the top fixes by
impact and effort, and make verified partner outreach the default next action
when it is the fastest path.
```

```text
Review example.com every week with VerifiedDR.
Check whether TrueDR is improving, audit the weakest public backlink evidence,
find the next partnership opportunity, and write a founder-ready progress update.
```

```text
Find one partner opportunity for example.com and draft the outreach.
Use VerifiedDR opportunities, run the contact command with --dry-run so I can
approve the exact subject/message, then send only after I approve the target and
copy.
```

- `analyze` first when the user asks what to do about a domain. It returns the
  current score, main issue, top actions, heuristic impact, and exact next
  command.
- `next` when the user wants the fastest useful answer: one action, why it
  matters, heuristic impact, and the command to run. Expect partner outreach to
  be the default when VerifiedDR can surface a reasonable match.
- `diagnose` / `explain` when the user needs a reason TrueDR is lower than DR,
  especially in plain English for a client, founder, or stakeholder.
- `actions` / `fix` / `boost` when the user asks for prioritization or a growth
  plan.
- `opportunities` when the user needs directories, backlink ideas, or partner
  targets. Partner names are shown on every plan; contacting them is the paid
  action. Use `--contact <slug-or-domain> --dry-run` to show the exact payload
  for approval, then remove `--dry-run` only after the user approves the listed
  target and copy. Custom outreach must be passed with `--subject` and/or
  `--message`; it sends mail through VerifiedDR.
- `authority:lookup` when the user asks what VerifiedDR knows about a domain or
  needs JSON. Returns DR, TrueDR, trust score, confidence, traffic validation,
  latest backlink totals, and badge links. Works for any approved site.
- `map` when the user wants to inspect a site's backlink map in the terminal.
  It works for any approved site, supports `--limit <n>` and `--json`, and uses
  cached backlink rows only. If no cached map exists, tell the user to open the
  site's DR Map or wait for the next authority refresh; do not present it as a
  fresh crawler.
- `discover:find` for partner, sponsorship, integration, guest-post, or agency
  prospecting. Filter by `--category`, `--min-truedr`, `--min-dr`,
  `--traffic-validated`, `--include-unverified`, `--limit` (max 50). Add
  `--opportunities-for <domain>` when the user needs site-specific partner
  matches. Ranked by TrueDR then DR for broad discovery.
- `badge:snippets` only for badge/share/embed snippets.
- `sites:list` to list the key owner's own sites with current metrics.
- `sites:monitor` to watch changes, summarize deltas, or check trust alerts.
  Owner scoped — only the API key owner's own claimed sites.
- `sites:export` when output feeds another script, CI job, dashboard, or
  integration.
- `sites:disavow <domain>` when the owner wants a Google disavow-format
  candidate file for spammy referring domains. It is cache-only, owner-scoped,
  supports `--min-spam <n>` (default 50), `--include-lost`, `--limit <n>`, and
  `--json`, and never submits anything to Google. Tell users to review the file
  manually before uploading it in Google Search Console.
- `sites:truedr <domain> --detailed` for the full per-signal trust breakdown —
  only available for sites the key owner owns.
- `sites:submit` / `sites:verify` to list a new site or re-check its badge embed.

The pre-`0.2` verbs (`lookup`, `find`, `sites`, `monitor`, …) still work as
hidden aliases, but prefer the `resource:action` forms above.

## Public vs. owner-scoped

- **Public fields, any approved site:** `authority:lookup`, `discover:find`,
  `badge:snippets`. Never expose owner identity, billing state, or the
  per-signal trust breakdown — that data is not returned by these commands, so
  do not claim to have it.
- **Owner-scoped (key owner's own sites only):** `sites:list`, `sites:get`,
  `sites:truedr`, `sites:export`, `sites:disavow`, `sites:monitor`,
  `sites:submit`, `sites:verify`. If the user asks to monitor, export, or
  disavow a domain they do not
  own, explain it returns 404 by design.

## Safety

- Treat coach command output as guidance and API command output as JSON. Preserve
  important fields in summaries.
- If a command returns a `402`, the plan quota is exhausted — on Free suggest
  upgrading to Pro/Agency or waiting for the daily reset; on Pro/Agency suggest
  waiting for the monthly reset or upgrading; do not retry in a loop. `401`
  means a missing or invalid key.
- If `discover:find` returns no results, relax filters in this order: category,
  traffic validation, minimum TrueDR, verified-only.

## Output Handling

For advisory requests, summarize in this order:

1. Current TrueDR / DR / gap
2. Main reason TrueDR is weak
3. Top action(s)
4. Heuristic TrueDR impact
5. Exact command to run next

For raw authority data, summarize in this order:

1. DR and TrueDR
2. Trust score and confidence
3. Traffic validation and traffic change
4. New/lost referring-domain deltas when present
5. Spam/trust alerts (from `sites:monitor`)
6. Link to the VerifiedDR page or badge when useful

For field meanings and example JSON shapes, read
[references/cli-contracts.md](references/cli-contracts.md).
