---
name: verifieddr-authority
description: >-
  Use when working with VerifiedDR authority and trust data through the
  VerifiedDR CLI (`vdr`) or API: diagnosing why TrueDR is lower than DR,
  choosing the next authority action, generating growth plans, explaining
  authority gaps to clients/founders, looking up DR/TrueDR/trust evidence,
  discovering trusted sites by category or TrueDR for partner/sponsor/integration
  prospecting, grabbing badge or embed snippets, monitoring authority changes,
  traffic validation, backlink deltas, trust/spam alerts on sites you own,
  AI visibility (how often ChatGPT, Perplexity, and Google AI Mode mention a
  site you own, with cited pages worth outreach),
  Google disavow candidate files for spammy links, and keyword research: the DR
  a keyword's Google top 10 demands, your DR gap to it, and winnable keywords a
  domain already ranks 4-30 for; exporting VerifiedDR data for
  scripts, CI, dashboards, or SaaS integrations.
  Prefer this skill for requests mentioning VerifiedDR analyze, diagnose,
  actions, opportunities, next, lookup, find, monitor, export, snippets, TrueDR,
  trust score, traffic validation, disavow, spam links, AI visibility,
  AI mentions, LLM visibility, keyword research,
  keyword difficulty by DR, winnable keywords, or agent-friendly
  VerifiedDR workflows.
---

# VerifiedDR Authority

Use VerifiedDR as the authority and trust data layer through the public `vdr`
CLI (a thin HTTP client for `https://verifieddr.com/api/v1`). Keep work focused
on authority/trust data, including DR-based keyword research (what DR a
keyword's top 10 demands and which keywords are winnable). Do **not** turn
VerifiedDR into a generic SEO suite (no crawler audits, on-page analysis, or
site-audit workflows).

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

Every data command requires a `vdr_...` API key and spends one unit of the
owner's plan quota (`help` and `--version` are local exceptions). Free includes
10 calls/day, Pro includes 1,000 calls/month, and
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
action when that is the fastest useful authority move. `opportunities` surfaces
partnership candidates with full names on every plan, the outreach angle, and
the exact command to approve before sending. Contact a listed partner with
`vdr opportunities <domain> --contact <slug-or-domain>`, which sends mail
through VerifiedDR's partnership mail system without exposing the target
owner's email. Run `--dry-run` first: it validates the target and quota and
previews drafted subject/message copy (or your own `--subject`/`--message`).
Sending always requires explicit `--subject` and `--message`; approve the
previewed copy by passing it on the send command, which the dry-run output
prints ready to run. A contact call spends one quota unit. The plan only sets
the monthly partner-contact limit; when it is reached, surface the CLI/API
`upgradeUrl`.

Use API commands when the user needs raw data, scripting, or integrations:

```bash
vdr authority:lookup <domain>        # authority for ANY approved site
vdr map <domain>                     # backlink map (`authority:map` also works)
vdr map <domain> --json              # raw DR Map data
vdr discover:find --category ai --min-truedr 50 --traffic-validated --limit 10
vdr discover:find --opportunities-for example.com --limit 10
vdr badge:snippets <domain>          # badge / embed snippets
vdr categories:list                 # valid category filter values
vdr keywords:research "<keyword>" [--domain <yours>]  # DR the Google top 10 demands
vdr keywords:suggest <domain>        # winnable keywords a domain ranks 4-30 for
vdr keywords:tracked <domain>        # your saved keyword targets + stored snapshots (own sites, free)
vdr sites:list                       # list YOUR sites
vdr sites:get <domain>               # one of YOUR sites with stored trends
vdr sites:truedr <domain> [--detailed] # owner-only TrueDR signal breakdown
vdr sites:visibility <domain>        # owner-only AI Visibility snapshot (ChatGPT/Perplexity/Google AI Mode)
vdr sites:monitor [<domain>] [--daily]   # watch YOUR sites for changes
vdr sites:export <domain>            # machine-readable export of YOUR site
vdr sites:disavow <domain>           # Google disavow candidates for severe spam risk
vdr sites:gsc-performance <domain> [--range 28d] # owner-only GSC performance
vdr sites:gsc-audit <domain> [--run] # latest index audit; --run starts a fresh audit
vdr sites:bing-setup                # open Bing Webmaster Tools; no key/quota
vdr sites:submit <url> [--title ... --category ...] # add a site
vdr sites:verify <domain>             # re-check its badge embed
```

## Growth Loop Prompts

When the user asks for a workflow instead of a specific command, run the
appropriate CLI commands yourself and summarize the loop. Good user prompts this
skill should support:

```text
Run the VerifiedDR growth loop for example.com.
Analyze the TrueDR gap, then run `vdr sites:truedr example.com --detailed` to
check the owner-scoped recommendations. If the detailed actions show severe
spam-link risk, generate Google disavow candidates with `vdr sites:disavow
example.com --min-spam 50`, explain that the file is only a candidate list, and
list the domains I need to approve before any Search Console upload. If severe
spam risk is not a top issue, skip disavow and say so. Then choose the best
partner opportunity, draft the outreach angle, and end with the exact command I
should approve next.
```

```text
Act as my authority coach for example.com.
Use VerifiedDR to diagnose why TrueDR is lower than DR, rank the top fixes by
impact and effort, and make verified partner outreach the next action when it is
the fastest path.
```

```text
Review example.com every week with VerifiedDR.
Check whether TrueDR is improving, review the weakest public backlink evidence,
find the next partnership opportunity, and write a clear progress update.
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
  targets. Partner names are shown in full on every plan; the plan governs the
  monthly contact limit. Use
  `--contact <slug-or-domain> --dry-run` to validate the target, quota, and exact
  payload for approval, then remove `--dry-run` only after the user approves the
  listed target and copy. Sending requires both `--subject` and `--message`;
  it sends mail through VerifiedDR. If the CLI returns an
  `upgradeUrl`, include it in the next action.
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
- `keywords:research "<keyword>"` when the user asks whether a keyword is
  reachable, how hard a SERP is, or what DR it takes to rank. Returns the live
  Google top 10 (US) with each domain's DR, the median DR ("DR needed"), and
  the weakest ranking site ("entry point"). Add `--domain <theirs>` to get the
  user's DR, gap, and verdict (`boost` = clears the bar, `advanced` = gap of
  10 or less, `ultra` = bigger gap). Requires an Advanced or Ultra plan on the
  key's account; free keys get `402` with an `upgradeUrl` to surface.
- `keywords:suggest <domain>` to find winnable keywords: ones the domain
  already ranks 4-30 for, where a DR gap is the likeliest blocker to the top
  10. Works for any domain, so use it for competitor research too. Ordered by
  estimated traffic value; brand/entity-name queries are filtered out. Feed
  the best ones into `keywords:research` to see the exact DR gap per keyword.
  Same Advanced/Ultra plan gate as `keywords:research`.
  When the user wants to go from keyword research to an actual published
  article, hand off to the sibling `seo-publish-pipeline` skill (shipped in
  this repo under `skills/seo-publish-pipeline`) instead of drafting ad hoc.
- `badge:snippets` only for badge/share/embed snippets.
- `sites:list` to list the key owner's own sites with current metrics.
- `sites:monitor` to watch changes, summarize deltas, or check trust alerts.
  Owner-scoped: only the API key owner's own claimed sites.
- `sites:export` when output feeds another script, CI job, dashboard, or
  integration.
- `sites:gsc-performance <domain>` for owner-scoped Search Console performance.
  It returns totals and daily series for the selected range, the immediately
  preceding period totals, and top queries, pages, countries, and devices. Use
  `--range 28d`, `3m`, `6m`, `12m`, or `16m` (default `28d`).
- `sites:gsc-audit <domain>` to read the latest owner-scoped Google index audit.
  Add `--run` only when the user wants a fresh audit; it spends URL Inspection
  budget and the server enforces a 12-hour cooldown.
- `sites:bing-setup` to open Bing Webmaster Tools in the user's browser. This
  is only a local setup shortcut: it does not connect Bing to VerifiedDR,
  import data, require an API key, or spend quota.
- `sites:disavow <domain>` only when owner-scoped data shows severe spam-link
  risk and the owner wants a Google disavow-format candidate file. It is
  cache-only, owner-scoped, supports `--min-spam <n>` (default 50),
  `--include-lost`, `--limit <n>`, and `--json`, and never submits anything to
  Google. Tell users this is a manual Google Search Console candidate review,
  not a default growth tactic or a guaranteed ranking/TrueDR improvement.
- `sites:truedr <domain> --detailed` for the full per-signal trust breakdown,
  only available for sites the key owner owns.
- `sites:visibility <domain>` for the stored AI Visibility snapshot of a site
  the key owner owns: visibility score, each asked question with per-platform
  answers (ChatGPT, Perplexity, Google AI Mode) and whether the site was
  mentioned, cited pages worth outreach (with DR/TrueDR when indexed), and run
  history. Reads stored runs only and never triggers a vendor run; if no run
  exists yet, tell the user to start the first one from the site's AI
  Visibility tab in the dashboard.
- `sites:submit` / `sites:verify` to list a new site or re-check its badge embed.

The pre-`0.2` verbs (`lookup`, `find`, `sites`, `monitor`, ...) still work as
hidden aliases, but prefer the `resource:action` forms above.

## Public vs. owner-scoped

- **Public fields, any approved site:** `authority:lookup`, `map`,
  `discover:find`, `badge:snippets`. Never expose owner identity, billing state, or the
  per-signal trust breakdown. That data is not returned by these commands, so
  do not claim to have it.
- **Paid-plan gated, any keyword/domain:** `keywords:research`,
  `keywords:suggest`. Require an Advanced or Ultra plan on the key's account;
  free keys get `402` with `upgradeUrl`, `requiredPlan`, and `blockedFeature`.
- **Owner-scoped (key owner's own sites only):** `sites:list`, `sites:get`,
  `sites:truedr`, `sites:visibility`, `sites:export`, `sites:disavow`, `sites:monitor`,
  `sites:gsc-performance`, `sites:gsc-audit`, `sites:submit`, `sites:verify`.
  GSC commands also require a connected Search Console property and an eligible
  Search Console plan. If the user requests owner-scoped data for a domain they
  do not own, explain that it returns 404 by design.

## Safety

- Treat coach command output as guidance and API command output as JSON. Preserve
  important fields in summaries.
- If a command returns a `402`, the feature is locked or the plan quota is
  exhausted. Include any returned `upgradeUrl` in the answer. On Free, suggest
  upgrading to Pro/Agency or waiting for the reset when relevant; on Pro/Agency
  suggest waiting for the monthly reset or upgrading; do not retry in a loop.
  `401` means a missing or invalid key.
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
