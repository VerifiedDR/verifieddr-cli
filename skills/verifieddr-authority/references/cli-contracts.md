# VerifiedDR CLI / API Contracts

Base URL: `https://verifieddr.com/api/v1`. Auth: `Authorization: Bearer vdr_...`.
The CLI mirrors these endpoints one-to-one. JSON examples are abbreviated.

## Coach commands (plain text)

Coach commands call `authority:lookup` under the hood, then turn the public
authority data into advice. They print plain text, not JSON.

```bash
vdr analyze example.com
vdr diagnose example.com
vdr actions example.com
vdr opportunities example.com
vdr opportunities example.com --contact partner-slug
vdr opportunities example.com --contact partner-slug --dry-run
vdr map example.com
vdr audit backlinks example.com
vdr content-plan example.com
vdr fix example.com --goal +10
vdr track example.com
vdr explain example.com
vdr boost example.com
vdr next example.com
```

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
- `authority.trueDr`: VerifiedDR's independent, trust-adjusted authority.
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
to open the site's DR Map or wait for the next authority refresh.

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

## keywords:research (Advanced/Ultra plans)

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

## keywords:suggest (Advanced/Ultra plans)

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
SERP fetch, so there is no plan gate (refreshing snapshots stays a dashboard
Pro/Ultra action). `quota` reports the free plan's monthly check allowance;
paid plans get `"limit": null`. Use this before `keywords:research` to avoid
re-paying for keywords that already have a fresh snapshot.

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

## sites:disavow (owner-scoped)

```bash
vdr sites:disavow example.com
vdr sites:disavow example.com --min-spam 60 --include-lost --limit 50
vdr sites:disavow example.com --json
# GET /api/v1/disavow/example.com?minSpam=60&includeLost=true&limit=50
```

Default output is a Google disavow-format candidate text file with `domain:`
directives for severe spam-link risk found in cached evidence. `--json` prints
`{ disavow: { domain, generatedAt, minSpamScore, totalCandidates, candidates,
file, note } }`. The endpoint is owner-scoped and cache-only: it never triggers a paid backlink
fetch, never writes metrics, and never submits anything to Google. Users must
review the generated file manually before uploading it to Google Search Console.

## sites:* (owner-scoped)

```bash
vdr sites:list                          # GET /api/v1/sites
vdr sites:get example.com               # GET /api/v1/sites/example.com
vdr sites:truedr example.com --detailed # GET /api/v1/sites/example.com/truedr?detailed=true
vdr sites:disavow example.com           # GET /api/v1/disavow/example.com
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

- `401` missing/invalid key; `402` quota exhausted (Free = 10 calls/day, Pro =
  1,000 calls/month, Agency = 10,000 calls/month); `404` unknown site (or not
  owned, for owner-scoped commands).
- Headers `X-API-Quota-Limit` / `X-API-Quota-Remaining` / `X-API-Tier` are
  printed to stderr by the CLI.
