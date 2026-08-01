# VerifiedDR CLI

A tiny, dependency-free CLI for the [VerifiedDR](https://verifieddr.com) API.
Use it to see how often ChatGPT, Perplexity, and Google AI Mode name your site,
change the questions they are asked, work a generated growth plan, understand
why a website's **TrueDR** is weak, and find the next verified partner to
contact.
The lower-level API commands still return clean JSON for scripts, CI,
dashboards, and AI agents.

It is a thin HTTP client: it talks only to `https://verifieddr.com/api/v1` with
your own API key. It never touches a database or any admin credential.

## Quickstart

```bash
# Install the skill
npx skills add VerifiedDR/verifieddr-cli

# Install the CLI
npm install -g verifieddr

# Set your API key
export VERIFIEDDR_API_KEY=vdr_your_key

# See what your plan allows and what is left of it
vdr account:usage

# See who AI answers name for your questions
vdr sites:visibility verifieddr.com

# Get a score, diagnosis, and next actions
vdr analyze verifieddr.com

# Surface verified partners worth contacting
vdr opportunities verifieddr.com
```

Your key is in your VerifiedDR dashboard, under **API**. The API needs a paid
plan: **Pro** includes 1,000 calls/month, **Max** 5,000, and **Ultra** 10,000.
A free key authenticates, but every call answers `402` with an upgrade link.
Requires Node.js 18 or newer. If global installs are unavailable, run any
command through `npx verifieddr ...`.

Every command needs a key and is metered against your plan quota; remaining
quota and your tier are printed to stderr, and returned as
`X-API-Quota-Remaining` / `X-API-Tier` headers). Pass `--key vdr_...` instead of
the env var on any command. When a feature or quota is locked, the CLI prints an
`upgradeUrl`; the default upgrade path is
`https://verifieddr.com/pricing?source=cli&feature=api`.

## MCP server

VerifiedDR is also a remote MCP (Model Context Protocol) server: the entire
API surface — visibility scans, growth tasks, keyword research, the
marketplace, publisher earnings, and your inbox — exposed as tools to Claude,
Cursor, and any other MCP client. Calls are metered against the same API
quota.

Streamable HTTP (no install needed):

```bash
claude mcp add --transport http verifieddr https://verifieddr.com/api/mcp \
  --header "Authorization: Bearer vdr_your_key"
```

Any client that speaks streamable HTTP connects to
`https://verifieddr.com/api/mcp` with the same `Authorization` header.

For stdio-only clients (Claude Desktop, older hosts), the CLI bridges to the
same remote server:

```json
{
  "mcpServers": {
    "verifieddr": {
      "command": "npx",
      "args": ["-y", "verifieddr", "mcp"],
      "env": { "VERIFIEDDR_API_KEY": "vdr_your_key" }
    }
  }
}
```

The server keeps two human-in-the-loop boundaries: checkout tools only return
a Stripe URL (a human pays), and joining the publisher network requires an
explicit `acceptTerms: true`.

## Commands

AI Visibility is the main surface: it is what the plan meters and what the
Visibility Score guarantee is written against.

```bash
vdr sites:visibility example.com      # score, per-question answers, rival brands, cited pages
vdr sites:visibility example.com --run    # ask the questions now (1 run per site per week)
vdr sites:visibility example.com --from <iso> --to <iso>   # diff two stored runs
vdr sites:visibility example.com --add-prompt "best crm for agencies"
vdr sites:visibility example.com --add-prompt "best crm" --location us
vdr sites:visibility example.com --import "question one" "question two"
vdr sites:visibility example.com --set-location <id> --location de
vdr sites:visibility example.com --remove-prompt <id>
vdr sites:visibility example.com --reset-prompts   # reseed from your keywords

# The generated growth plan behind the dashboard's Growth tab
vdr growth:tasks example.com          # ranked tasks: impact, why, next step, benchmarks
vdr growth:tasks example.com --run    # generate a fresh plan (finished tasks carry over)
vdr growth:tasks example.com --task <id> --status done

# Budget before you act, instead of discovering caps as a 402
vdr account:usage                     # plan, account-wide prompt budget, API quota
```

Buy links, sell links, and answer the people who write to you:

```bash
# Marketplace: buy
vdr marketplace:packages              # packages, priced for you, with the exact websites in each
vdr marketplace:sites --limit 20      # single-website listings, your niche first
vdr marketplace:cart --add-package <id>
vdr marketplace:cart --add-site <websiteId>
vdr marketplace:cart --checkout       # prints a Stripe URL; a human pays
vdr marketplace:orders                # orders + placement status
vdr marketplace:orders --brief <orderNo> --target-url https://you.com/page --anchor "best crm"
vdr marketplace:requests example.com --title "Review swap" --description "..." --budget 250

# Earn: your websites as publishers
vdr earn:sites                        # every website + what it earns per placement
vdr earn:sites example.com --join --accept-terms
vdr earn:sites example.com --status paused
vdr earn:assignments                  # work assigned to you
vdr earn:assignments --accept <placementId>
vdr earn:assignments --decline <placementId> --reason "off-topic"
vdr earn:assignments --live <placementId> --url https://example.com/the-post
vdr earn:earnings                     # pending, due, paid

# Inbox
vdr inbox:list                        # conversations + unread count
vdr inbox:thread <id>                 # read one
vdr inbox:thread <id> --reply "Happy to swap, here's my page"
```

Two deliberate limits. `--checkout` returns a Stripe Checkout URL and charges
nothing: an agent may assemble a cart, but a human enters the card. And
`--join` refuses to run without `--accept-terms`, because joining accepts the
publisher terms on the owner's behalf.

The coach commands turn that data into advice:

```bash
vdr analyze example.com              # score, main issue, top 3 actions
vdr diagnose example.com             # why TrueDR is lower than DR
vdr actions example.com              # ranked by impact, effort, confidence
vdr opportunities example.com        # verified partners, directories, backlink ideas
vdr opportunities example.com --contact partner-slug --dry-run  # preview drafted mail
vdr opportunities example.com --contact partner-slug --approve  # send the previewed draft
vdr audit backlinks example.com      # backlink risk review
vdr explain example.com              # client/founder-ready explanation
vdr next example.com                 # best next action, partner included
```

`analyze` and `next` read your AI Visibility score first when the domain is one
of your own sites, so the top action reflects what AI answers say, not only
backlinks. That costs one extra quota call, and the other coach commands do
not make it.

`fix`, `boost`, `content-plan`, and `track` were removed in 0.8.0: they
reprinted the same ranked action list under different headings, or reprinted
change fields `sites:monitor` reports with real deltas. Running one now names
its replacement.

The coach loop is partner-first: `vdr next` prefers one concrete verified
partner action when that is the fastest useful visibility move. `vdr
opportunities` shows potential partnership candidates, the suggested outreach
angle, and the exact command to approve before sending. Partner names are shown
in full on every plan; only the monthly contact limit is plan-governed. Partner
matching uses the lookup and opportunities APIs, so listing can spend two quota
calls; a `--contact` call spends one. `--dry-run` drafts outreach copy that
cites the matched angle, previews it, and stores it locally in
`~/.verifieddr/state.json`. Sending requires either `--approve` (send the
stored draft unchanged) or explicit `--subject` and `--message` for edited
copy. Sent contacts are logged locally, so candidate lists mark partners you
already reached out to and `vdr next` prefers a fresh one. Add `--json` to
`opportunities` or a contact call for machine-readable output.

Paid plans can contact a listed partner without seeing the owner's email
address; the plan sets the monthly contact limit (Pro 20, Max 50, Ultra
unlimited). Use `--dry-run` first to validate the target, quota, and message
before sending:

```bash
vdr opportunities example.com --contact partner-slug --dry-run
vdr opportunities example.com --contact partner-slug --approve
vdr opportunities example.com --contact partner-slug --message "Custom outreach copy..."
```

The email is sent through VerifiedDR's partnership mail system, using the same
ownership, opt-out, quota, and confirmation flow as the dashboard UI.
Free users receive an upgrade link before partner details or outreach can start:
`https://verifieddr.com/pricing?source=cli&feature=partnerships`.

The API commands follow a `resource:action` shape:

```bash
# Public discovery, works for ANY approved site
vdr authority:dr anything.com         # DR for ANY domain, tracked or not
vdr authority:lookup stripe.com       # DR, TrueDR, trust score, evidence
vdr map stripe.com                    # terminal backlink map
vdr map stripe.com --json             # raw DR Map data
vdr discover:find --category ai --min-truedr 50 --traffic-validated --limit 10
vdr discover:find --opportunities-for example.com --limit 10
vdr badge:snippets stripe.com         # badge / embed snippets
vdr categories:list                   # valid category values

# Keyword research (any paid plan)
vdr keywords:research "best crm for startups"                  # DR the top 10 demands
vdr keywords:research "best crm for startups" --domain example.com  # + your gap/verdict
vdr keywords:suggest example.com      # winnable keywords the domain ranks 4-30 for
vdr keywords:tracked example.com      # your saved keyword targets + stored snapshots
vdr keywords:tracked example.com --add "best crm for startups"  # track a new keyword
vdr keywords:tracked example.com --refresh <id>  # re-snapshot one saved keyword
vdr keywords:tracked example.com --remove <id>   # stop tracking a keyword

# Your own sites (owner-scoped)
vdr sites:list                        # list your sites + metrics
vdr sites:get example.com             # one site with DR/traffic trends
vdr sites:truedr example.com --detailed   # TrueDR + full signal breakdown
vdr sites:export example.com          # machine-readable export
vdr sites:monitor --daily             # watch all your sites for changes
vdr sites:monitor example.com         # watch one site
vdr sites:submit https://example.com --title "Example" --category saas
vdr sites:verify example.com          # re-check the badge embed
vdr sites:gsc-performance example.com # 28d GSC totals, daily series + top dimensions
vdr sites:gsc-performance example.com --range 3m # 28d, 3m, 6m, 12m, or 16m
vdr sites:gsc-audit example.com       # latest Google index audit (needs GSC connected)
vdr sites:gsc-audit example.com --run # run a fresh audit (12h cooldown)
vdr sites:bing-setup                   # open Bing Webmaster Tools (no key/quota)

# Ping search engines about new or updated URLs (IndexNow)
vdr sites:submit-urls --generate-key  # one-time: create a key, host <key>.txt on your domain
vdr sites:submit-urls https://example.com/blog/new-post https://example.com/pricing
```

`sites:submit-urls` runs entirely client-side against the shared IndexNow
endpoint (Bing, Yandex, Seznam, Naver) and spends no VerifiedDR quota. It
needs a one-time key file on your domain: run `--generate-key`, upload the
printed `<key>.txt` to your site root, and set `INDEXNOW_KEY`. Google has no
public request-indexing API for regular pages; for Google, keep your sitemap
`lastmod` fresh and verify pickup with `vdr sites:gsc-audit`.

> The pre-`0.2` verbs (`lookup`, `find`, `sites`, `monitor`, ...) still work as
> hidden aliases, so existing scripts keep running.

### What's public vs. private

- **Any domain at all** (`authority:dr`): Domain Rating relayed straight from
  Ahrefs, so you can score a prospect, competitor, or link target that nobody
  has submitted to VerifiedDR. DR only: TrueDR, trust, and traffic validation
  are VerifiedDR-computed and need a tracked site, so follow up with
  `authority:lookup` when the response says `listed: true`.
- **Public fields, any site** (`authority:lookup`, `discover:find`,
  `map`, `badge:snippets`): DR, TrueDR, trust score, confidence, traffic
  validation, public backlink totals/map data, badge links. Never owner
  identity, billing state, or the per-signal trust breakdown. `vdr map` is
  cache-only: it never triggers a paid backlink fetch; if no cached map exists
  yet, try again after the site's DR Map has been opened or refreshed.
- **Keyword research** (`keywords:research`, `keywords:suggest`): requires a
  paid plan on the key's account (free keys get a 402 with an upgrade link;
  every paid tier reaches it). `keywords:research` returns the live Google top 10 for a
  keyword with each domain's DR, the median ("DR needed") and the weakest
  ranking site ("entry point"); pass `--domain` to get your gap and verdict.
  `keywords:suggest` works for any domain and returns keywords it already
  ranks 4-30 for, where a DR gap is the likeliest blocker.
  `keywords:tracked` is the exception: it lists your saved keyword targets
  with their stored difficulty snapshots for one of your own sites. It reads
  stored data only (no live SERP fetch), so it costs no keyword budget. It also
  edits the list, same contract as the dashboard Keywords tab: `--add
  "<keyword>"` tracks a new keyword (a SERP-cache miss pays an upstream fetch
  and rides the stricter keyword limiter), `--refresh <id>` re-snapshots a
  saved one, and `--remove <id>` deletes it. Ids come from the plain
  `keywords:tracked` listing.
- **Owner-scoped** (`sites:*`): only your own claimed sites.
  `sites:truedr --detailed` returns the full signal breakdown for sites you own.
  `sites:visibility` returns the stored AI Visibility snapshot for a site you
  own: the visibility score, every asked question with each AI platform's
  answer and whether your site was mentioned, the rival brands named more often
  than you, cited pages worth outreach, and the run history. A plain read never
  spends a vendor run.
  It also edits the tracked questions, same contract as the dashboard editor:
  `--add-prompt "<question>"` tracks a new question (8-140 chars, must not
  name your own site), `--import` takes several at once, `--set-location <id>
  --location <code>` re-targets one at a country, `--remove-prompt <id>`
  deletes one, and `--reset-prompts` reseeds from your tracked keywords. Edits
  are free and never trigger a run; pinning a question to a country needs a
  paid plan. Prompt ids come from the snapshot's `prompts` list.
  `--run` is the one branch that reaches the models. It is the same call as the
  dashboard's Run button: paid plans only, one run per site per week, and a
  second call inside that window returns the stored run rather than spending
  twice. Paid plans also get a daily refresh without asking. `--from <iso> --to
  <iso>` diffs two stored runs (score move, brands gained and lost) and never
  spends.
- **Growth plan** (`growth:tasks`): the generated plan for a site you own, with
  each task's kind, impact, priority, status, and execution artifact, plus the
  benchmark sites it was built against. Reading is free insight: a free key
  gets the summary and one revealed action. `--run` generates a fresh plan on a
  paid plan, carrying over any task you already finished. `--task <id> --status
  <todo|in_progress|blocked|done>` closes one after you did the work.
- **Account** (`account:usage`): the plan key, the account-wide AI prompt
  budget (prompts are metered across all your websites; websites themselves are
  unlimited on every plan), the API quota, and the plan's entitlements.
- **Marketplace** (`marketplace:*`): the same inventory, ranking, and prices the
  Marketplace tab shows. Your plan discount is applied when the listing is
  priced, not at checkout, so the number you read is the number you pay.
  Packages and single listings share one cart, capped at 5 rows, and prices are
  re-derived server-side on every write. `--checkout` returns a Stripe URL and
  charges nothing. `marketplace:requests` is the "Ask" side: what one of your
  verified websites wants from others, and what you'll pay for it (`--budget`
  is in dollars).
- **Earn** (`earn:*`): your websites as publishers. A website must be verified
  to join, and joining lands in `pending` for human approval. `--status paused`
  stops new work without leaving. Assignments carry the target URL, anchor,
  brief, payout, and deadline; declining is free and expected when a placement
  does not fit. `--live` is what gets you paid, and the page is checked for the
  link before the placement is marked verified. Earnings are USD minor units:
  `pending` is accepted work not yet due, `due` is waiting on the next payout
  run, `paid` is settled.
- **Inbox** (`inbox:*`): partnership conversations, same threads as the
  dashboard, with the unread count the sidebar badge reads. A reply is mailed to
  a real person as you. Draft and send on the user's word rather than answering
  their inbox for them.

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

## 5 Actionable SEO Outcomes

This repo ships two agent **skills**:

- [`skills/verifieddr-visibility`](skills/verifieddr-visibility/SKILL.md) teaches
  assistants when and how to call these commands.
- [`skills/seo-publish-pipeline`](skills/seo-publish-pipeline/SKILL.md) is a
  gated agentic workflow for writing and publishing SEO articles: keyword
  backlog built from `vdr` keyword research, intent classification, product
  claim validation, fixed article structure, two anti-slop passes, and a
  scoring threshold before anything ships.

Install them straight into your agent with:

```bash
npx skills add VerifiedDR/verifieddr-cli
```

After installing the skills, ask for one of these outcomes instead of memorizing
commands:

1. **AI Visibility Loop:** read the score, find the questions where a rival is
   named and you are not, tune the tracked questions, re-run, and compare the
   two runs.
2. **Growth Loop:** generate the plan, work the highest-impact task, and close
   it from the CLI.
3. **Partner Outreach:** find one verified partner, preview the outreach with
   `--dry-run`, then send only after approval.
4. **Progress Report:** compare two AI Visibility runs, check TrueDR and DR
   movement, and write a founder or client-ready update.
5. **Fix Weak Trust Signals:** inspect the owner-scoped signal breakdown
   and choose the relevant fix.
6. **Monitor Metrics:** set a recurring check for DR, TrueDR, traffic
   validation, backlink deltas, and trust alerts.
7. **Publish an SEO Article:** run the gated publish pipeline: pick a keyword
   from the research-built backlog, validate every product claim, draft, run
   anti-slop passes, and publish only above the quality threshold.

Example prompts:

```text
Improve AI visibility for example.com.
Read the stored snapshot, list the questions where a competitor is cited and we
are not, propose replacement questions buyers actually ask, apply the ones I
approve, then run a fresh scan and tell me what moved.
```

```text
Run the VerifiedDR growth loop for example.com.
Generate a growth plan, tell me the single highest-impact task and why, then
mark it done once I confirm I have shipped it.
```

```text
Act as my visibility coach for example.com.
Use VerifiedDR to diagnose why TrueDR is lower than DR, rank the top fixes by
impact and effort, and make verified partner outreach the next action when it is
the fastest path.
```

```text
Review example.com every week with VerifiedDR.
Compare the last two AI Visibility runs, check whether TrueDR is improving,
find the next partnership opportunity, and write a clear progress update.
```

```text
Find one partner opportunity for example.com and draft the outreach.
Use VerifiedDR opportunities, run the contact command with --dry-run so I can
approve the exact subject/message, then send only after I approve the target and
copy.
```

```text
Run the SEO publish pipeline for example.com.
Build the keyword backlog from vdr keyword research if it is empty, take the
oldest pending keyword, and write the article through every gate: intent
classification, product claim validation, the fixed structure, both anti-slop
passes, and the quality score. Stop and report instead of publishing anything
below the threshold.
```

## License

MIT
