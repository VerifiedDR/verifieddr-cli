# VerifiedDR CLI / API Contracts

Base URL: `https://verifieddr.com/api/v1`. Auth: `Authorization: Bearer vdr_…`.
The CLI mirrors these endpoints one-to-one. JSON examples are abbreviated.

## Coach commands (plain text)

Coach commands call `authority:lookup` under the hood, then turn the public
authority data into advice. They print plain text, not JSON.

```bash
vdr analyze example.com
vdr diagnose example.com
vdr actions example.com
vdr opportunities example.com
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
command to execute.

`opportunities` also calls the server-side opportunities mode to list potential
partnership candidates. Free-tier responses redact actual site names/domains and
show only candidate metrics; Pro and Agency responses may show the actual
candidate names/domains. This can spend two quota calls: one lookup and one
opportunities request.

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
- `authority.trustScore` / `confidence`: backlink trust score (0–100) and how
  much data backs it (`high` / `medium` / `low`).
- `authority.trafficValidated`: whether real traffic evidence supports the link
  profile.
- The per-signal trust **breakdown** is intentionally NOT returned here. It is
  available only via `truedr --detailed` for sites you own.

## discover:find (public discovery)

```bash
vdr discover:find --category ai --min-truedr 50 --traffic-validated --limit 10
# GET /api/v1/find?category=ai&minTrueDr=50&trafficValidated=true&limit=10
```

Returns `{ find: { filters, sites: [ <lookup payload>, … ] } }`, ranked by
TrueDR then DR. Filters: `--category <slug>`, `--min-truedr <n>`, `--min-dr <n>`,
`--traffic-validated`, `--include-unverified`, `--limit <n>` (max 50). Use for
partner / sponsor / trusted-site discovery — not keyword or backlink analysis.

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

`{ export: { site, authority, snippets } }` — `site` is the compact metric row,
`authority` is the full public lookup payload, `snippets` are the badge embeds.

## sites:* (owner-scoped)

```bash
vdr sites:list                          # GET /api/v1/sites
vdr sites:get example.com               # GET /api/v1/sites/example.com
vdr sites:truedr example.com --detailed # GET /api/v1/sites/example.com/truedr?detailed=true
vdr sites:submit https://example.com --title "Example" --category saas   # POST /api/v1/sites
vdr sites:verify example.com            # POST /api/v1/verify
```

`sites:truedr --detailed` includes the full per-signal `breakdown` for owned
sites. The pre-`0.2` verbs (`sites`, `site`, `truedr`, …) still work as aliases.

## Errors

- `401` missing/invalid key · `402` quota exhausted (Free = 10 calls/day, Pro =
  1,000 calls/month, Agency = 10,000 calls/month) · `404` unknown site (or not
  owned, for owner-scoped commands).
- Headers `X-API-Quota-Limit` / `X-API-Quota-Remaining` / `X-API-Tier` are
  printed to stderr by the CLI.
