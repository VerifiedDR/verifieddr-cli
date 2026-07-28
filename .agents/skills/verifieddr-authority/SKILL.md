---
name: verifieddr-authority
description: >-
  Use when working with VerifiedDR visibility and trust data through the
  VerifiedDR CLI (`vdr`) or API: diagnosing why TrueDR is lower than DR,
  choosing the next visibility action, generating growth plans, explaining
  TrueDR gaps to clients/founders, looking up DR/TrueDR/trust evidence,
  discovering trusted sites by category or TrueDR for partner/sponsor/integration
  prospecting, grabbing badge or embed snippets, monitoring DR, TrueDR, and
  trust changes, traffic validation, backlink deltas, trust/spam alerts on sites you own,
  AI visibility (how often ChatGPT, Perplexity, and Google AI Mode mention a
  site you own, with cited pages worth outreach): reading the score, editing and
  re-targeting the tracked questions, running a fresh scan, and comparing two
  runs; working the generated growth task plan; checking plan limits, the
  account-wide AI prompt budget, and API quota;
  buying backlink packages or single placements in the marketplace (browsing
  inventory, cart, orders, briefs) and posting what a website wants from
  others; earning as a publisher (joining the network, accepting or declining
  assigned placements, submitting live URLs, checking payouts);
  reading and replying to partnership conversations in the inbox;
  backlink-risk review, and keyword research: the DR
  a keyword's Google top 10 demands, your DR gap to it, and winnable keywords a
  domain already ranks 4-30 for; exporting VerifiedDR data for
  scripts, CI, dashboards, or SaaS integrations.
  Prefer this skill for requests mentioning VerifiedDR analyze, diagnose,
  actions, opportunities, next, lookup, find, monitor, export, snippets, TrueDR,
  trust score, traffic validation, spam links, AI visibility,
  AI mentions, LLM visibility, AI visibility questions or prompts, running an AI
  visibility scan, growth tasks, plan limits or prompt budget, keyword research,
  keyword difficulty by DR, winnable keywords, buying or selling backlinks,
  backlink packages, marketplace cart or orders, placement briefs, publisher
  assignments or earnings, partnership inbox or replies, or agent-friendly
  VerifiedDR workflows.
---

# VerifiedDR Visibility

Use VerifiedDR as the visibility and trust data layer through the public `vdr`
CLI (a thin HTTP client for `https://verifieddr.com/api/v1`). Keep work focused
on visibility/trust data, including DR-based keyword research (what DR a
keyword's top 10 demands and which keywords are winnable), and on the
marketplace, publisher, and inbox surfaces that act on it. Do **not** turn
VerifiedDR into a generic SEO suite (no crawler audits, on-page analysis, or
site-audit workflows).

Everything the CLI reaches, the dashboard reaches the same way: both call one
server implementation per feature, so a price, a limit, or a status you report
from `vdr` is what the user sees when they open the tab.

## Quickstart

```bash
# Install the skill
npx skills add VerifiedDR/verifieddr-cli

# Install the CLI
npm install -g verifieddr

# Set your API key
export VERIFIEDDR_API_KEY=vdr_your_key

# Check what the plan allows and what is left
vdr account:usage

# See how often AI answers name the site
vdr sites:visibility verifieddr.com

# Get a score, diagnosis, and next actions
vdr analyze verifieddr.com

# Surface verified partners worth contacting
vdr opportunities verifieddr.com
```

Every data command requires a `vdr_...` API key and spends one unit of the
owner's plan quota (`help` and `--version` are local exceptions). The API is
paid-only: Pro includes 1,000 calls/month, Max 5,000, and Ultra 10,000. A free
key authenticates but every call answers `402` with an upgrade link, so on a
free account surface the upgrade instead of retrying. Remaining quota and tier
are printed to stderr. Coach commands print plain-English guidance; API commands
print JSON on stdout with an `ok` boolean. If global installs are unavailable,
run commands through `npx verifieddr <command>`.

Check `vdr account:usage` before a session that will add questions or run
scans: the AI search prompt budget is account-wide (Pro 25, Max 75, Ultra 200,
across all websites; websites themselves are unlimited), so a per-site read
cannot tell you whether the next `--add-prompt` fits.

## Command Choice

AI visibility is the product's primary metric: it is what the plan meters and
what the Visibility Score guarantee is written against. When the user owns the
site, start there rather than with backlink advice.

```bash
vdr sites:visibility <domain>         # score, per-question answers, rival brands, cited pages
vdr sites:visibility <domain> --run   # ask the questions now (spends a run)
vdr sites:visibility <domain> --from <iso> --to <iso>  # diff two stored runs
vdr growth:tasks <domain>             # the generated task plan
vdr account:usage                     # plan, prompt budget, API quota
```

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
vdr explain <domain>                  # client/founder-ready explanation
vdr next <domain>                     # best next action, partner included
```

`analyze` and `next` read the owner-scoped AI Visibility snapshot first and
rank a visibility action above link work when the score is weak or unmeasured.
That costs one extra quota call, and only the key owner's own sites have one.

`fix`, `boost`, `content-plan`, and `track` were removed in CLI 0.8.0: they
printed templates rather than data. Use `growth:tasks --run` for a plan and
`sites:monitor` for movement, and never tell a user to run the removed verbs.

The coach loop is partner-first: `next` prefers one concrete verified partner
action when that is the fastest useful visibility move. `opportunities` surfaces
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
vdr authority:lookup <domain>        # DR, TrueDR, trust data for ANY approved site
vdr map <domain>                     # backlink map (`authority:map` also works)
vdr map <domain> --json              # raw DR Map data
vdr discover:find --category ai --min-truedr 50 --traffic-validated --limit 10
vdr discover:find --opportunities-for example.com --limit 10
vdr badge:snippets <domain>          # badge / embed snippets
vdr categories:list                 # valid category filter values
vdr keywords:research "<keyword>" [--domain <yours>]  # DR the Google top 10 demands
vdr keywords:suggest <domain>        # winnable keywords a domain ranks 4-30 for
vdr keywords:tracked <domain>        # your saved keyword targets + stored snapshots (own sites)
vdr keywords:tracked <domain> --add "<keyword>"   # track a new keyword
vdr keywords:tracked <domain> --refresh <id>      # re-snapshot one saved keyword
vdr keywords:tracked <domain> --remove <id>       # stop tracking a keyword
vdr sites:list                       # list YOUR sites
vdr sites:get <domain>               # one of YOUR sites with stored trends
vdr sites:truedr <domain> [--detailed] # owner-only TrueDR signal breakdown
vdr sites:visibility <domain>        # owner-only AI Visibility snapshot (ChatGPT/Perplexity/Google AI Mode)
vdr sites:visibility <domain> --run  # ask the tracked questions now (paid, 1/site/week)
vdr sites:visibility <domain> --from <iso> --to <iso>    # diff two stored runs
vdr sites:visibility <domain> --add-prompt "<question>" [--location <code>]
vdr sites:visibility <domain> --import "<q1>" "<q2>" [--location <code>]
vdr sites:visibility <domain> --set-location <id> --location <code>
vdr sites:visibility <domain> --remove-prompt <id>       # stop tracking a question
vdr sites:visibility <domain> --reset-prompts            # reseed questions from keywords
vdr growth:tasks <domain>            # owner-only generated growth plan
vdr growth:tasks <domain> --run      # generate a fresh plan (paid)
vdr growth:tasks <domain> --task <id> --status <todo|in_progress|blocked|done>
vdr account:usage                    # plan, account-wide prompt budget, API quota
vdr marketplace:packages             # backlink packages, priced for the caller
vdr marketplace:sites [--limit n]    # single-website listings
vdr marketplace:cart [--add-package <id>|--add-site <id>|--remove <i>|--checkout]
vdr marketplace:orders [--brief <orderNo> --target-url <url> ...]
vdr marketplace:requests <domain> [--title <t> --description <d> --budget 250|--remove <id>]
vdr earn:sites [<domain> --join --accept-terms|--status <active|paused|removed>]
vdr earn:assignments [--accept <id>|--decline <id> [--reason]|--live <id> --url <page>]
vdr earn:earnings                    # pending, due, paid (USD minor units)
vdr inbox:list [--limit n] [--offset n]
vdr inbox:thread <id> [--reply "<text>"] [--read]
vdr sites:monitor [<domain>] [--daily]   # watch YOUR sites for changes
vdr sites:export <domain>            # machine-readable export of YOUR site
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
Improve AI visibility for example.com.
Read the stored snapshot, list the questions where a competitor is cited and we
are not, propose replacement questions buyers actually ask, apply the ones I
approve, then run a fresh scan and tell me what moved.
```

Run `vdr sites:visibility` first, name the rival brands and the weak questions
from real data, and get approval before `--add-prompt`, `--remove-prompt`, or
`--run`. Question edits are cheap and reversible; a run is neither.

```text
Run the VerifiedDR growth loop for example.com.
Generate a growth plan with `vdr growth:tasks example.com --run`, tell me the
single highest-impact task and why, and mark it done only once I confirm I
shipped it.
```

```text
Run the VerifiedDR trust loop for example.com.
Analyze the TrueDR gap, then run `vdr sites:truedr example.com --detailed` to
check the owner-scoped recommendations and weakest backlink evidence. Then
choose the best partner opportunity, draft the outreach angle, and end with the
exact command I should approve next.
```

```text
Act as my visibility coach for example.com.
Use VerifiedDR to diagnose why TrueDR is lower than DR, rank the top fixes by
impact and effort, and make verified partner outreach the next action when it is
the fastest path.
```

```text
Review example.com every week with VerifiedDR.
Compare the last two AI Visibility runs with --from/--to, check whether TrueDR
is improving, find the next partnership opportunity, and write a clear progress
update.
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
  site's DR Map or wait for the next backlink refresh; do not present it as a
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
  10 or less, `ultra` = bigger gap; these are difficulty labels, not plan
  names). Requires a paid plan on the key's account, any tier; free keys get
  `402` with an `upgradeUrl` to surface.
- `keywords:suggest <domain>` to find winnable keywords: ones the domain
  already ranks 4-30 for, where a DR gap is the likeliest blocker to the top
  10. Works for any domain, so use it for competitor research too. Ordered by
  estimated traffic value; brand/entity-name queries are filtered out. Feed
  the best ones into `keywords:research` to see the exact DR gap per keyword.
  Same paid-plan gate as `keywords:research`.
- `keywords:tracked <domain>` to list the key owner's saved keyword targets
  with stored snapshots (reads stored data only, no SERP fetch), and to edit
  the list:
  `--add "<keyword>"` tracks a new keyword (a SERP-cache miss pays an
  upstream fetch and rides the stricter keyword limiter), `--refresh <id>`
  re-snapshots a saved one, `--remove <id>` deletes it. Ids come from the
  plain listing. Same contract as the dashboard Keywords tab, so agent edits
  and UI edits stay in sync.
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
- `sites:truedr <domain> --detailed` for the full per-signal trust breakdown,
  only available for sites the key owner owns.
- `sites:visibility <domain>` for the stored AI Visibility snapshot of a site
  the key owner owns: visibility score, each asked question with per-platform
  answers (ChatGPT, Perplexity, Google AI Mode) and whether the site was
  mentioned, the rival brands named more often, cited pages worth outreach
  (with DR/TrueDR when indexed), and run history. A plain read never spends a
  vendor run.
  Edit the tracked questions in place: `--add-prompt "<question>"` (8-140
  chars, must not name the user's own site), `--import "<q1>" "<q2>"` for
  several at once, `--remove-prompt <id>` (ids from the snapshot's `prompts`
  list), and `--reset-prompts` to reseed from tracked keywords. Editing is free
  on every plan and never spends a run. When a user wants their questions
  steered toward a different positioning (for example "ai visibility tool"
  instead of auto-seeded keywords), remove the off-target prompts and add
  on-target ones instead of resetting.
  Questions are asked globally unless pinned: `--location <code>` on an add or
  import, and `--set-location <id> --location <code>` to re-target an existing
  one. Pinning needs a paid plan. Ask which market the user sells to before
  adding questions for a non-global business; a US-default answer set is the
  wrong measurement for a Dutch or German company.
- `sites:visibility <domain> --run` when the user wants a reading now: the same
  call as the dashboard's Run button. Paid plans only, one run per site per
  week, and it takes minutes because it buys an answer per question per
  platform. A second call inside the window returns the stored run instead of
  spending twice. Paid plans also get a daily refresh with no action needed, so
  do not run on a schedule of your own. After editing questions, tell the user
  the next refresh will pick them up, and only offer `--run` if they want the
  answer immediately.
- `sites:visibility <domain> --from <iso> --to <iso>` to answer "did we move?".
  The timestamps are `at` values from the snapshot's history. It diffs the
  score, the brands gained and lost, and the questions that flipped. Stored
  data only, so it never spends a run. Prefer this over eyeballing two
  snapshots.
- `growth:tasks <domain>` for the generated plan behind the dashboard's Growth
  tab: ranked tasks with kind, impact, priority, status, and an execution
  artifact (why it matters, the next step, the success metric), plus the
  benchmark sites it was built against. Reading is free insight; a free key
  gets the summary and one revealed action with the rest counted but withheld.
  `--run` generates a fresh plan on a paid plan and carries over any task the
  user already finished. `--task <id> --status done` closes one after the work
  is actually shipped: never mark a task done on the user's behalf without
  confirmation.
- `account:usage` before a session that will add questions or run scans. It
  returns the plan key, the account-wide AI prompt budget (Pro 25, Max 75,
  Ultra 200 across all websites), the API quota, and the plan entitlements. Use
  it to tell a user in advance that ten new questions will not fit, instead of
  hitting a 402 halfway through.
- `marketplace:packages` / `marketplace:sites` when the user wants to buy
  links. Both are already priced for this buyer: the plan discount is applied
  to the listing, not at checkout, so quote the number you are given. Packages
  name the exact websites they place on; use `marketplace:sites` when the user
  wants one specific website instead of a set.
- `marketplace:cart` to assemble an order, then hand over. `--add-package` takes
  a package `id`, `--add-site` takes a listing's `websiteId`, `--remove` takes
  the row's index. A cart holds 5 rows. `--checkout` returns a Stripe Checkout
  URL and charges nothing: give the user the link and stop. Never describe a
  checkout as done; you cannot know that it was paid.
- `marketplace:orders` after a purchase. A paid order does nothing until it is
  briefed, so an unbriefed order is the thing to chase: `--brief <orderNo>`
  with `--target-url` (repeat it per page), `--anchor`, `--about`, and
  `--talking-points`. Draft the brief from the user's own pages and confirm the
  target URLs before sending.
- `marketplace:requests <domain>` for the "Ask" side: what a verified website of
  the user's wants from other websites. `--budget` is in dollars and 0 means
  open to discuss. Posting is public and speaks for the user's brand, so get
  the copy approved.
- `earn:sites` when the user wants to sell placements. Joining requires
  `--accept-terms`, which is the owner accepting the publisher terms: ask
  explicitly, never pass it because it was the only way to make the command
  work. A website must be verified, and joining lands in `pending` for human
  approval. `--status paused` is the way to stop new work without leaving.
- `earn:assignments` to work the queue. Each row carries the target URL, anchor,
  brief, payout, and deadline. Declining is free and expected when a placement
  does not fit the website: recommend a decline rather than a bad link.
  `--live <id> --url <page>` is what gets the publisher paid, and the page is
  checked for the link, so only submit a URL where the link is actually
  published.
- `earn:earnings` for pending, due, and paid totals in USD minor units. Payouts
  are manual and run against a minimum balance, so a non-zero `due` is normal
  for a while: do not report it as a missed payment.
- `inbox:list` / `inbox:thread` for partnership conversations. These are
  messages between two real people, and a reply is mailed as the user. Summarize
  what is waiting, draft a reply, and send only on the user's word. Never
  answer someone's inbox autonomously, and never accept or commit to a deal in
  a reply on the user's behalf.
- `sites:submit` / `sites:verify` to list a new site or re-check its badge embed.

The pre-`0.2` verbs (`lookup`, `find`, `sites`, `monitor`, ...) still work as
hidden aliases, but prefer the `resource:action` forms above.

## Public vs. owner-scoped

- **Public fields, any approved site:** `authority:lookup`, `map`,
  `discover:find`, `badge:snippets`. Never expose owner identity, billing state, or the
  per-signal trust breakdown. That data is not returned by these commands, so
  do not claim to have it.
- **Paid-plan gated, any keyword/domain:** `keywords:research`,
  `keywords:suggest`. Require a paid plan on the key's account, any tier; free
  keys get `402` with `upgradeUrl`, `requiredPlan`, and `blockedFeature`. The
  ladder meters volume, not features: every paid tier reaches every command,
  and differs in prompts, tracked keywords, partner contacts, and API calls.
- **Owner-scoped (key owner's own sites only):** `sites:list`, `sites:get`,
	`sites:truedr`, `sites:visibility`, `growth:tasks`, `sites:export`,
  `sites:monitor`, `sites:gsc-performance`, `sites:gsc-audit`, `sites:submit`,
  `sites:verify`, `marketplace:cart`, `marketplace:orders`,
  `marketplace:requests`, `earn:sites`, `earn:assignments`, `earn:earnings`,
  `inbox:list`, `inbox:thread`.
- **Spends the user's money or speaks as them:** `marketplace:cart --checkout`
  (returns a payment link, never charges), `marketplace:requests` (public
  post), `earn:sites --join` (accepts publisher terms), `inbox:thread --reply`
  (mails a real person). Each needs the user's explicit go-ahead on the exact
  content or amount, not a general "yes, handle the marketplace".
  GSC commands also require a connected Search Console property and an eligible
  Search Console plan. If the user requests owner-scoped data for a domain they
  do not own, explain that it returns 404 by design.

## Safety

- Treat coach command output as guidance and API command output as JSON. Preserve
  important fields in summaries.
- If a command returns a `402`, the feature is locked or a budget is
  exhausted. Include any returned `upgradeUrl` in the answer. On a free
  account the API itself is locked, so every call 402s: say so once and stop
  rather than trying other commands. On a paid plan, `402` means that plan's
  quota or prompt budget is spent, so suggest waiting for the reset, removing a
  tracked question, or upgrading. Never retry in a loop. `401` means a missing
  or invalid key.
- `--run` on `sites:visibility` and `growth:tasks` spends real money at the
  model vendors. Run it when the user asked for fresh data, not to refresh
  something you could read from the stored snapshot.
- If `discover:find` returns no results, relax filters in this order: category,
  traffic validation, minimum TrueDR, verified-only.

## Output Handling

For advisory requests, summarize in this order:

1. Current TrueDR / DR / gap
2. Main reason TrueDR is weak
3. Top action(s)
4. Heuristic TrueDR impact
5. Exact command to run next

For raw lookup data, summarize in this order:

1. DR and TrueDR
2. Trust score and confidence
3. Traffic validation and traffic change
4. New/lost referring-domain deltas when present
5. Spam/trust alerts (from `sites:monitor`)
6. Link to the VerifiedDR page or badge when useful

For field meanings and example JSON shapes, read
[references/cli-contracts.md](references/cli-contracts.md).
