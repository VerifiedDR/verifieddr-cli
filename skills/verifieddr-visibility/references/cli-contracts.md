# VerifiedDR CLI / API Contracts

Base URL: `https://verifieddr.com/api/v1`. Auth: `Authorization: Bearer vdr_...`.
The CLI mirrors these endpoints one-to-one. JSON examples are abbreviated.

## Coach commands (plain text)

Coach commands call `authority:lookup` under the hood, then turn the public
lookup data into advice. They print plain text, not JSON.

```bash
vdr analyze example.com
vdr diagnose example.com
vdr actions example.com
vdr opportunities example.com
vdr opportunities example.com --contact partner-slug
vdr opportunities example.com --contact partner-slug --dry-run
vdr map example.com
vdr audit backlinks example.com
vdr explain example.com
vdr next example.com
```

`fix`, `boost`, `content-plan`, and `track` were removed in 0.8.0; running one
returns an error naming its replacement (`growth:tasks --run`, `sites:monitor`).

`analyze` prints current TrueDR/DR/gap, the main issue, top actions, heuristic
TrueDR impact, and the exact command to run next. `next` is the shortest
recommendation surface: one action, why it matters, heuristic impact, and the
command to execute. It prefers one concrete verified partner action when
VerifiedDR can surface a reasonable match.

`opportunities` also calls the server-side opportunities mode to list potential
partnership candidates, outreach angles, and contact commands. Partner names
are shown in full on every plan; only the monthly contact limit is
plan-governed. Listing can spend two quota calls: one lookup and one
opportunities request.

`opportunities --contact <slug-or-domain>` sends mail to the listed candidate
through VerifiedDR's partnership mail system, using the same source ownership
check, target opt-out handling, contact quota, request logging, and sender
confirmation as the dashboard UI. It spends one quota call and skips the
lookup. `--dry-run` validates the target and quota and previews the outreach
copy; when `--subject`/`--message` are omitted, the CLI drafts them for the
preview. Sending requires explicit `--subject` and `--message` (outreach is
human-approved; the server rejects sends without them). Free users receive `402` with `upgradeUrl`,
`requiredPlan`, and `blockedFeature`; agents should show that URL as the next
step.

## authority:dr (public, ANY domain, no submission needed)

```bash
vdr authority:dr anything.com
# GET /api/v1/dr/anything.com
```

```json
{
  "ok": true,
  "dr": {
    "domain": "anything.com",
    "dr": 62,
    "source": "verifieddr",
    "listed": false,
    "slug": null
  }
}
```

Domain Rating for any domain, so it does not have to be on VerifiedDR and
nobody has to have submitted it. Use this to score a
prospect, competitor, sponsor, or link target before it is tracked; never tell
a user to submit a site just to read its DR.

DR only. TrueDR, trust score, confidence, and traffic validation are
VerifiedDR-computed and need a tracked site, so when `listed` is `true`, follow
up with `authority:lookup` for the full picture. Subdomains and URLs resolve to
the registrable domain (`blog.example.com/post` returns `example.com`). An
invalid or blacklisted domain returns `400`; an upstream miss returns `503`.
Results are cached per domain, but every call still spends one API quota unit.

## authority:lookup (public, any approved site)

```bash
vdr authority:lookup stripe.com
# GET /api/v1/lookup/stripe.com
```

```json
{
  "ok": true,
  "lookup": {
    "domain": "stripe.com",
    "slug": "stripe-com",
    "authority": {
      "dr": 92,
      "trueDr": 88,
      "trustScore": 71,
      "confidence": "high",
      "confidenceScore": 0.9,
      "trafficValidated": true
    },
    "changes": { "drWeeklyChange": 0, "trueDrWeeklyChange": 1, "trafficChange": 12000 },
    "evidence": {
      "traffic": 4200000,
      "globalRank": 1200,
      "referringDomains": 51000,
      "backlinks": 9100000,
      "topBacklinks": [
        { "sourceDomain": "example.edu", "dr": 82, "url": "https://example.edu/post", "anchor": "Stripe", "follow": true }
      ],
      "bottomBacklinks": [
        { "sourceDomain": "weak.example", "dr": 2, "url": "https://weak.example/link", "anchor": "Stripe", "follow": false }
      ],
      "gainedDomains": 320,
      "lostDomains": 110,
      "reportCreatedAt": "2026-06-01T00:00:00.000Z"
    },
    "verified": true,
    "links": { "page": "https://verifieddr.com/website/stripe-com", "badge": "https://verifieddr.com/badge/stripe-com.svg" }
  }
}
```

- `authority.dr`: third-party Domain Rating.
- `authority.trueDr`: VerifiedDR's independent, trust-adjusted score.
- `authority.trustScore` / `confidence`: backlink trust score (0 to 100) and how
  much data backs it (`high` / `medium` / `low`).
- `authority.trafficValidated`: whether real traffic evidence supports the link
  profile.
- The per-signal trust **breakdown** is intentionally NOT returned here. It is
  available only via `truedr --detailed` for sites you own.

## map / authority:map (public, any approved site)

```bash
vdr map stripe.com
vdr map stripe.com --limit 40
vdr map stripe.com --json
# GET /api/v1/map/stripe.com
```

Default output is a terminal backlink map, sorted by importance and capped by
`--limit` (default 24, max 60). `--json` prints `{ ok: true, map }`, with
terminal-safe referring-domain fields:

```json
{
  "ok": true,
  "map": {
    "site": { "domain": "stripe.com", "dr": 92, "title": "Stripe", "verified": true },
    "domains": [
      { "domain": "example.edu", "dr": 82, "backlinks": 2, "linkType": "dofollow", "status": "live", "importance": 88, "spamScore": 0 }
    ],
    "totalDomains": 51000
  }
}
```

The endpoint is cache-only and never triggers a paid backlink fetch. If the site
has no cached backlink rows yet, it returns `503` with a message asking the user
to open the site's DR Map or wait for the next backlink refresh.

## discover:find (public discovery)

```bash
vdr discover:find --category ai --min-truedr 50 --traffic-validated --limit 10
# GET /api/v1/find?category=ai&minTrueDr=50&trafficValidated=true&limit=10

vdr discover:find --opportunities-for example.com --limit 10
# GET /api/v1/find?opportunitiesFor=example.com&limit=10
```

Returns `{ find: { filters, sites: [ <lookup payload>, ... ] } }`, ranked by
TrueDR then DR. Filters: `--category <slug>`, `--min-truedr <n>`, `--min-dr <n>`,
`--traffic-validated`, `--include-unverified`, `--limit <n>` (max 50). Use for
partner / sponsor / trusted-site discovery; for keyword work use
`keywords:research` / `keywords:suggest` instead.
With `--opportunities-for`, the endpoint returns `{ opportunities: { domain,
redacted: false, filters, candidates } }` using the site-specific TrueDR Connect
match ranking.

## keywords:research (any paid plan)

```bash
vdr keywords:research "best crm for startups"
# GET /api/v1/keywords?keyword=best+crm+for+startups

vdr keywords:research "best crm for startups" --domain example.com
# GET /api/v1/keywords?keyword=best+crm+for+startups&domain=example.com
```

```json
{
  "ok": true,
  "report": {
    "keyword": "best crm for startups",
    "fetchedAt": "2026-07-01T00:00:00.000Z",
    "cached": true,
    "results": [
      { "position": 1, "domain": "strong.example", "url": "https://strong.example/post", "title": "Best CRM…", "dr": 78, "trackedSlug": null }
    ],
    "medianDr": 64,
    "minDr": 48,
    "user": { "domain": "example.com", "dr": 41, "gap": 23, "tier": "ultra" }
  }
}
```

- `results`: live Google top 10 (US, English), one row per organic result with
  the domain's DR (0 to 100; `null` when unresolved).
- `medianDr`: the realistic "DR needed" target; `minDr`: the weakest ranking
  domain, the entry point that proves the SERP is reachable below the median.
- `user` (only with `domain`): the caller's DR, gap to the median, and verdict
  tier: `boost` (clears the bar), `advanced` (gap of 10 or less), `ultra`
  (bigger gap).
- Free keys get `402` with `upgradeUrl`, `requiredPlan`, `blockedFeature:
  "keyword_research"`. Uncached keywords are rate-limited harder than cached
  ones because each miss pays a live SERP fetch.

## keywords:suggest (any paid plan)

```bash
vdr keywords:suggest example.com
# GET /api/v1/keywords/suggestions/example.com
```

```json
{
  "ok": true,
  "domain": "example.com",
  "suggestions": [
    { "keyword": "crm for solo founders", "position": 12, "searchVolume": 720 }
  ]
}
```

Winnable keywords the domain already ranks 4-30 for, ordered by estimated
traffic value, with one-word heads and brand/entity-name queries filtered out.
Works for any domain (competitor research included). Served from a 30-day
cache; an empty array means the domain has no qualifying rankings. Same plan
gate and error shape as `keywords:research`.

## keywords:tracked (owner-scoped, free)

```bash
vdr keywords:tracked example.com
# GET /api/v1/sites/example.com/keywords
```

```json
{
  "ok": true,
  "website": { "slug": "example-com", "url": "https://example.com" },
  "keywords": [
    {
      "keyword": "crm for solo founders",
      "lastCheckedAt": "2026-07-08T09:00:00.000Z",
      "snapshot": {
        "medianDr": 54, "minDr": 38, "userDr": 41, "gap": 13, "tier": "advanced",
        "searchVolume": 720, "cpc": 4.1, "userPosition": 12, "prevPosition": 15
      },
      "impressions": 1840, "gscPosition": 11
    }
  ],
  "limit": 25,
  "quota": { "used": 1, "limit": 3 }
}
```

The saved keyword targets from the dashboard Keywords tab for one of the
key owner's sites, with the stored difficulty snapshot per keyword and, when
the site has a connected Search Console property, 28-day impressions and
position. A pure read of stored data on every plan: it never triggers a live
SERP fetch, so there is no plan gate. `quota` reports the free plan's monthly
check allowance; paid plans get `"limit": null`. Use this before
`keywords:research` to avoid re-paying for keywords that already have a fresh
snapshot.

Each keyword row also carries an `id`. The same command edits the list, same
contract as the dashboard Keywords tab:

```bash
vdr keywords:tracked example.com --add "crm for solo founders"
# POST /api/v1/sites/example.com/keywords  { "keyword": "..." }
# -> { "ok": true, "target": { ... } }  (201)

vdr keywords:tracked example.com --refresh tgt_123
# POST /api/v1/sites/example.com/keywords  { "action": "refresh", "id": "tgt_123" }
# -> { "ok": true, "target": { ... } }

vdr keywords:tracked example.com --remove tgt_123
# DELETE /api/v1/sites/example.com/keywords?id=tgt_123
# -> { "ok": true }
```

An add or refresh that misses the SERP cache pays an upstream fetch and rides
the stricter keyword limiter; cached keywords ride the generous api tier.
Duplicates return `409`, the per-site limit returns `400`, an exhausted free
allowance returns `402` with an `upgradeUrl`, and `503` means live ranking
data is temporarily unavailable (retry in a minute, do not loop).

## sites:visibility (owner-scoped)

```bash
vdr sites:visibility example.com
# GET /api/v1/sites/example.com/ai-visibility
```

Returns `status` (`ready` or `pending`), the stored `snapshot` (visibility
`score`, `totalAnswers`/`mentionedAnswers`, `byPlatform` for ChatGPT,
Perplexity, and Google AI Mode, per-question `answers` with `brands`,
`citedPages`, and `citedDomains`, aggregate `brands`, `sources`, and
`topPages`), `pageOutreach` (cited pages worth outreach, with `dr`/`trueDr`
when the domain is indexed), `prompts` (each `{ id, prompt, source }`),
`history`, `delta`, and `nextRefreshAt`. A plain read serves stored runs only,
so it never spends. `pending` means no run stored yet: offer `--run`.

`--run` is the only branch that reaches the models:

```bash
vdr sites:visibility example.com --run
# POST /api/v1/sites/example.com/ai-visibility  { "action": "run" }
# -> { "ok": true, "status": "ready", snapshot, prompts, history, ... }
```

Paid plans only (`402` on free), one run per site per week: a call inside that
window returns the stored run rather than spending twice, and `nextRefreshAt`
says when the window opens. It asks every tracked question on every platform,
so it takes minutes; the CLI waits up to 5 minutes for it. Paid plans also get
an automatic daily refresh, so a run is for "I want it now", not for keeping
data fresh.

Compare two stored runs instead of eyeballing snapshots:

```bash
vdr sites:visibility example.com --from 2026-07-01T09:00:00.000Z --to 2026-07-22T09:00:00.000Z
# GET /api/v1/sites/example.com/ai-visibility?from=…&to=…
# -> { "ok": true, "delta": { scoreDelta, brandsEntered, brandsLeft, ... } }
```

Both timestamps are required and must be `at` values from the snapshot's
`history` (an unknown timestamp returns `404`, and the same run twice `400`).
Stored data only, so it never spends a run.

The same command edits the tracked questions, same contract as the dashboard
editor. Edits are free on every plan and never trigger a run; the next refresh
asks the new questions:

```bash
vdr sites:visibility example.com --add-prompt "best ai visibility tools"
# POST /api/v1/sites/example.com/ai-visibility  { "prompt": "..." }
# -> { "ok": true, "prompts": [ ... ] }

vdr sites:visibility example.com --add-prompt "beste seo tool" --location nl
# POST … { "prompt": "...", "location": "nl" }

vdr sites:visibility example.com --import "question one" "question two"
# POST … { "action": "import", "prompts": ["question one", "question two"] }
# -> { "ok": true, "prompts": [ ... ] }  (bad lines skipped, budget filled exactly)

vdr sites:visibility example.com --set-location prm_123 --location us
# POST … { "action": "set_prompt_location", "promptId": "prm_123", "location": "us" }

vdr sites:visibility example.com --remove-prompt prm_123
# DELETE /api/v1/sites/example.com/ai-visibility?promptId=prm_123
# -> { "ok": true, "prompts": [ ... ] }

vdr sites:visibility example.com --reset-prompts
# POST /api/v1/sites/example.com/ai-visibility  { "action": "reset" }
# -> { "ok": true, "prompts": [ ... ] }  (reseeded from tracked keywords)
```

Questions must be 8-140 characters. Naming the owner's own site is allowed:
branded questions measure whether assistants know the site when asked
directly, while neutral ones measure unprompted visibility. Duplicates
return `400`, and an unknown `location` does too. Questions are asked globally
unless pinned to a country, and pinning needs a paid plan. The prompt budget is
account-wide, not per site: over it, writes return `402` naming the limit and
what is in use, so check `vdr account:usage` before a bulk import.

## growth:tasks (owner-scoped)

```bash
vdr growth:tasks example.com
# GET /api/v1/sites/example.com/growth
```

`{ ok, status, website, locked, summary, run, tasks, teaserTask,
lockedTaskCount, competitors, approvedCompetitors, history }`. `summary` holds
`dr`, `trueDr`, `gap`, `traffic`, `confidence`, `mainIssue`, and `nextAction`.
Each task has `id`, `kind`, `priority`, `status`, `title`, `description`,
`impact`, `source`, and an `artifact` with the narrative and execution fields.
Reading is free insight: on a free key `locked` is true, `tasks` is empty, and
`teaserTask` plus `lockedTaskCount` describe the withheld plan.

```bash
vdr growth:tasks example.com --run
# POST /api/v1/sites/example.com/growth  { "action": "run" }

vdr growth:tasks example.com --task tsk_123 --status done
# POST /api/v1/sites/example.com/growth  { "action": "task", "id": "…", "status": "done" }
# -> { "ok": true, "task": { ... } }
```

`--run` is paid-only and recomputes trust, the map, benchmark link gaps, and
the task list, so it is slow; tasks the user already moved out of `todo` keep
their status. Valid statuses are `todo`, `in_progress`, `blocked`, and `done`;
anything else returns `400` naming them. Never mark a task `done` without the
user confirming the work shipped.

## account:usage

```bash
vdr account:usage
# GET /api/v1/account/usage
```

`{ ok, plan, api: { tier, callsUsed, callsLimit, callsRemaining }, prompts: {
used, limit, remaining }, entitlements, upgradeUrl }`. `plan` is `null` on the
free tier, otherwise `starter` (sold as Pro), `max`, or `ultra`. `prompts` is
the account-wide AI search prompt budget across every website; `entitlements`
also reports `keywordsPerWebsite`, `partnerRequests`, `dailyRefresh`,
`visibilityGuarantee`, and `apiCalls`. Read this before a bulk question import
or a session of runs.

## marketplace:* (owner-scoped)

```bash
vdr marketplace:packages
# GET /api/v1/marketplace/packages
# -> { ok, inventory: { websites, minTrueDr, maxTrueDr, medianTrueDr,
#      totalTraffic, bundles }, packages: [ ... ] }

vdr marketplace:sites --limit 20
# GET /api/v1/marketplace/sites?limit=20
# -> { ok, total, sites: [ { websiteId, slug, url, host, title, label,
#      category, trueDr, dr, traffic, priceAmount, buyerPriceAmount,
#      proDiscountBps, placement, formats, relevant } ] }
```

Both are priced for the caller: the plan's marketplace discount is applied to
`buyerPriceAmount` at read time, so the listing already quotes what this buyer
pays. Rows are ranked with the buyer's own niches first, and their own websites
are never listed to them. `limit` is clamped to 1-100 rather than rejected.

```bash
vdr marketplace:cart                       # GET  /api/v1/marketplace/cart
vdr marketplace:cart --add-package <id>    # POST { action: "add_package", packageId }
vdr marketplace:cart --add-site <websiteId># POST { action: "add_site", websiteId }
vdr marketplace:cart --remove <index>      # POST { action: "remove", index }
vdr marketplace:cart --checkout            # POST { action: "checkout" }
# -> { ok, checkoutUrl }
```

A cart holds 5 rows and refuses a second row on the same website. Prices are
re-derived server-side on every write, never trusted from the caller.
`--checkout` returns a Stripe Checkout URL and charges nothing: hand the link
to the user. An empty or unfillable cart returns `409`.

```bash
vdr marketplace:orders
# GET /api/v1/marketplace/orders -> { ok, orders: [ ... ] }

vdr marketplace:orders --brief ORD-7 --target-url https://you.com/a \
  --target-url https://you.com/b --anchor "best crm" --about "..." \
  --talking-points "..."
# POST { action: "brief", orderNo, brief: { targetUrls, anchorPrefs,
#        companyDescription, talkingPoints } }
# -> { ok, briefed: <count> }
```

The brief is collected after payment by design, and publishers are only briefed
once it lands, so an unbriefed paid order is stalled work. `--target-url`
repeats, one per page.

```bash
vdr marketplace:requests example.com
# GET /api/v1/marketplace/requests?websiteSlug=example.com

vdr marketplace:requests example.com --title "Review swap" \
  --description "..." --budget 250
# POST { websiteSlug, title, description, budgetAmount: 25000 }

vdr marketplace:requests example.com --remove <id>
# DELETE /api/v1/marketplace/requests?websiteSlug=…&id=…
```

`--budget` is dollars on the CLI and `budgetAmount` is USD minor units on the
wire; 0 means open to discuss. Posting needs a verified website (`409`
otherwise), and the per-website request cap returns `400`. Passing `--id` edits
an existing request instead of adding one.

## earn:* (owner-scoped)

```bash
vdr earn:sites
# GET /api/v1/earn/sites -> { ok, sites: [ { websiteId, websiteSlug,
#      websiteUrl, websiteTitle, trueDr, dr, traffic, categories, verified,
#      eligible, blockers, status?, payoutAmount, publisherShareBps,
#      proBonusBps, linkTypes, turnaroundDays, maxPlacementsPerMonth,
#      acceptedTermsAt?, approved } ] }

Every owned website is listed, in or out of the network: `status` is absent
until it has been enrolled, `eligible` says whether it clears the TrueDR and
traffic floors, and `blockers` says what is in the way when it does not.

vdr earn:sites example.com --join --accept-terms \
  --formats guest_post,niche_edit,homepage --turnaround 7 --max-placements 4
# POST { action: "join", websiteSlug, acceptTerms: true, linkTypes,
#        turnaroundDays, maxPlacementsPerMonth }

vdr earn:sites example.com --status paused
# POST { action: "status", websiteSlug, status }
```

Valid formats are `guest_post`, `niche_edit`, and `homepage`; unknown ones are
dropped rather than failing the call. `acceptTerms` must be explicitly true and
the CLI refuses to send it without `--accept-terms`. Joining requires a verified
website (`409`) and lands in `pending` until a human approves it. Statuses are
`active`, `paused`, and `removed`; reactivating a `pending` or `removed`
website returns `409`.

```bash
vdr earn:assignments
# GET /api/v1/earn/assignments -> { ok, assignments: [ { placementId, status,
#      websiteUrl, websiteTitle, targetUrl, anchorText, companyDescription,
#      talkingPoints, payoutAmount, liveUrl, assignedAt, respondBy,
#      payoutDueAt?, paidOutAt?, guaranteeUntil? } ] }

`respondBy` is the accept deadline, after which the placement is reassigned:
that is the timestamp to sort an assignment queue by.

vdr earn:assignments --accept <placementId>
vdr earn:assignments --decline <placementId> --reason "off-topic"
vdr earn:assignments --live <placementId> --url https://example.com/post
# POST { action: "accept" | "decline" | "live", placementId, reason?, liveUrl? }

vdr earn:earnings
# GET /api/v1/earn/earnings
# -> { ok, currency, pendingAmount, dueAmount, paidAmount, payoutThresholdAmount }
```

Amounts are USD minor units. `live` verifies the page actually contains the
link before the placement counts, so submitting a page without it fails.

## inbox:* (owner-scoped)

```bash
vdr inbox:list --limit 25 --offset 0
# GET /api/v1/inbox?limit=25&offset=0
# -> { ok, threads: [ ... ], total, unreadCount, nextOffset }

`total` and `unreadCount` count every visible thread, not just this page, and
`nextOffset` is null when the list is exhausted.

vdr inbox:thread <requestId>
# GET /api/v1/inbox/<requestId> -> { ok, thread: { messages, website, deal, ... } }

vdr inbox:thread <requestId> --reply "Happy to swap"
# POST /api/v1/inbox/<requestId> { body }  -> { ok, sent: true, thread }

vdr inbox:thread <requestId> --read
# POST /api/v1/inbox/<requestId> { action: "read" }
```

`limit` is capped at 100. A reply is mailed to the other side as the key owner,
exactly as a reply typed in the dashboard is: draft it, and send on the user's
word.

## badge:snippets (public)

```bash
vdr badge:snippets stripe.com
# GET /api/v1/snippets/stripe.com
```

Returns page/badge/OG links plus ready-to-paste `html`, `htmlDark`, `htmlTrueDr`,
`markdown`, and `shareText`, and the available badge `styles`.

## sites:monitor (owner-scoped)

```bash
vdr sites:monitor --daily            # all your sites
vdr sites:monitor example.com        # one of your sites
# GET /api/v1/monitor?daily=true[&domain=example.com]
```

`{ monitor: { cadence, sites: [...] } }`. Each site has `authority`, `changes`,
`backlinks` (incl. `newReferringDomains` / `lostReferringDomains`),
`trafficValidation`, `alerts` (spam/trust), and a `summary` string.

## sites:export (owner-scoped)

```bash
vdr sites:export example.com
# GET /api/v1/export/example.com
```

`{ export: { site, authority, snippets } }`. `site` is the compact metric row,
`authority` is the full public lookup payload, `snippets` are the badge embeds.

## sites:* (owner-scoped)

```bash
vdr sites:list                          # GET /api/v1/sites
vdr sites:get example.com               # GET /api/v1/sites/example.com
vdr sites:truedr example.com --detailed # GET /api/v1/sites/example.com/truedr?detailed=true
vdr sites:submit https://example.com --title "Example" --category saas   # POST /api/v1/sites
vdr sites:verify example.com            # POST /api/v1/verify
vdr sites:gsc-performance example.com --range 28d # GET /api/v1/sites/example.com/gsc-performance?range=28d
vdr sites:gsc-audit example.com         # GET /api/v1/sites/example.com/gsc-audit
vdr sites:gsc-audit example.com --run   # POST /api/v1/sites/example.com/gsc-audit
```

`sites:truedr --detailed` includes the full per-signal `breakdown` for owned
sites. The pre-`0.2` verbs (`sites`, `site`, `truedr`, ...) still work as aliases.

## sites:gsc-performance (owner-scoped)

Returns `{ range, performance }`, where `performance` contains the connection
summary, daily `series`, aggregate `totals`, immediately preceding
`previousTotals`, and a `snapshot` of top `queries`, `pages`, `countries`, and
`devices`. Each metric row includes clicks, impressions, CTR, and average
position. Ranges are `28d`, `3m`, `6m`, `12m`, and `16m`; invalid ranges return
`400`. A connected Search Console property and eligible plan are required.

## sites:gsc-audit (owner-scoped)

GET returns the latest stored index audit. `--run` uses POST to start a fresh
audit, spends a budgeted URL Inspection sample, and is subject to the server's
12-hour cooldown. The audit covers sitemap health, pages with impressions, and
sampled indexed/not-indexed states; it is distinct from performance reporting.

## Errors

- `401` missing/invalid key; `402` the API is paid-only and the key's account
  is free, or the plan's quota is spent (Pro = 1,000 calls/month, Max = 5,000,
  Ultra = 10,000); `404` unknown site (or not owned, for owner-scoped
  commands).
- Headers `X-API-Quota-Limit` / `X-API-Quota-Remaining` / `X-API-Tier` are
  printed to stderr by the CLI.
