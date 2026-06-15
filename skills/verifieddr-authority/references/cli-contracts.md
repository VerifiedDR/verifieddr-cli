# VerifiedDR CLI / API Contracts

Base URL: `https://verifieddr.com/api/v1`. Auth: `Authorization: Bearer vdr_…`.
The CLI mirrors these endpoints one-to-one. JSON examples are abbreviated.

## lookup (public, any approved site)

```bash
vdr lookup stripe.com
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

## find (public discovery)

```bash
vdr find --category ai --min-truedr 50 --traffic-validated --limit 10
# GET /api/v1/find?category=ai&minTrueDr=50&trafficValidated=true&limit=10
```

Returns `{ find: { filters, sites: [ <lookup payload>, … ] } }`, ranked by
TrueDR then DR. Filters: `--category <slug>`, `--min-truedr <n>`, `--min-dr <n>`,
`--traffic-validated`, `--include-unverified`, `--limit <n>` (max 50). Use for
partner / sponsor / trusted-site discovery — not keyword or backlink analysis.

## snippets (public)

```bash
vdr snippets stripe.com
# GET /api/v1/snippets/stripe.com
```

Returns page/badge/OG links plus ready-to-paste `html`, `htmlDark`, `htmlTrueDr`,
`markdown`, and `shareText`, and the available badge `styles`.

## monitor (owner-scoped)

```bash
vdr monitor --daily            # all your sites
vdr monitor example.com        # one of your sites
# GET /api/v1/monitor?daily=true[&domain=example.com]
```

`{ monitor: { cadence, sites: [...] } }`. Each site has `authority`, `changes`,
`backlinks` (incl. `newReferringDomains` / `lostReferringDomains`),
`trafficValidation`, `alerts` (spam/trust), and a `summary` string.

## export (owner-scoped)

```bash
vdr export example.com
# GET /api/v1/export/example.com
```

`{ export: { site, authority, snippets } }` — `site` is the compact metric row,
`authority` is the full public lookup payload, `snippets` are the badge embeds.

## sites / site / truedr / submit / verify (owner-scoped)

```bash
vdr sites                              # GET /api/v1/sites
vdr site example.com                   # GET /api/v1/sites/example.com
vdr truedr example.com --detailed      # GET /api/v1/sites/example.com/truedr?detailed=true
vdr submit https://example.com --title "Example" --category saas   # POST /api/v1/sites
vdr verify example.com                 # POST /api/v1/verify
```

`truedr --detailed` includes the full per-signal `breakdown` for owned sites.

## Errors

- `401` missing/invalid key · `402` monthly quota exhausted (free tier = 100
  calls/month) · `404` unknown site (or not owned, for owner-scoped commands).
- Headers `X-API-Quota-Limit` / `X-API-Quota-Remaining` / `X-API-Tier` are
  printed to stderr by the CLI.
