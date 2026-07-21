---
name: seo-publish-pipeline
description: >-
  Run a gated SEO article pipeline before publishing: pick a keyword from a
  research-built backlog (vdr CLI), classify search intent, validate every
  product claim against a product facts file, draft to a fixed structure, run
  two anti-slop passes, score, and only then publish. Use when the user asks to
  write/publish an SEO article or blog post, run the SEO pipeline, work the
  keyword backlog, or build the backlog with vdr keyword research. Hard rule:
  never invent a keyword or a product feature to keep the pipeline moving.
---

# SEO Publish Pipeline

Seven gated steps. Each gate can stop the pipeline; stopping and reporting is
success, publishing slop is failure. Never skip a gate to keep publishing.

Requires per project (stop and ask user to create if missing):
- `content/keyword-backlog.md` - keyword queue, built by research runs only
- `product.md` (project root) - features that exist AND features that do NOT

`vdr` CLI needs `VERIFIEDDR_API_KEY` (paid plan for keyword commands). Every
call spends quota; batch research runs, don't call per-sentence.

## Step 0: Backlog research run (separate from writing)

Only this step may add keywords to the backlog. Start with the keywords the
site already tracks; their stored snapshots (DR gap, tier, volume, position)
are free and often make a fresh `keywords:research` call unnecessary:

```bash
vdr keywords:tracked <domain>                     # FIRST: tracked keywords + stored snapshots (free)
vdr keywords:suggest <domain>                     # winnable: already ranks 4-30
vdr keywords:research "<keyword>" --domain <domain>  # DR top-10 demands + gap + verdict
vdr sites:gsc-performance <domain> --range 28d    # real queries/pages/CTR
vdr content-plan <domain>                         # authority-supporting page ideas
```

Tracked keywords with a `boost` or `advanced` tier in their snapshot qualify
directly; only run `keywords:research` on a tracked keyword when its snapshot
is older than 30 days. Otherwise add only keywords with a winnable verdict or
an existing 4-30 ranking. Record keyword, source command, DR gap, date, status
(`pending|written|published`).

## Steps 1-7: Writing run

1. **Pick keyword** - take the oldest `pending` backlog entry. Backlog empty?
   STOP, tell user to run a research run (Step 0). Never substitute a nearby
   topic. If the entry is stale (>30 days), re-verify:
   `vdr keywords:research "<keyword>" --domain <domain>`.

2. **Classify intent** - one of: comparison, how-to, definition, buying guide,
   troubleshooting, list. Write it down; the article must answer this intent,
   not restate the keyword.

3. **Product validation setup** - read `product.md` in the project root. Every claim
   about the product in the draft must trace to the "exists" list. Anything on
   the "does not exist" list, or on neither list, may not be claimed.
   Never name internal data vendors or upstream APIs (DataForSEO, Ahrefs,
   RapidAPI, or any other provider) in published copy, even if `product.md`
   mentions them internally. Say "live backlink data", "real backlink
   evidence", or "third-party traffic estimates" instead.

4. **Draft** - follow [STRUCTURE.md](STRUCTURE.md) exactly and apply the
   evidence-led urgency rules in [VOICE.md](VOICE.md): keyword title,
   short answer up top, longer AI-engine answer block, clear sections, FAQ,
   internal links (from the site's real sitemap/pages only), product section,
   CTA.

5. **Two anti-slop passes** - run both passes in
   [ANTI-SLOP.md](ANTI-SLOP.md) as separate, sequential edits (pass 1: obvious
   AI patterns; pass 2: subtle signals). Do not merge them into one pass.

6. **Score** - rubric in [SCORING.md](SCORING.md). Threshold: 85/100. Below
   threshold: back to step 4 with the failing dimensions as the revision brief.
   Max 3 revision loops, then STOP and report the score breakdown to the user.

7. **Publish** - only after a passing score:
   - generate hero image (project's existing image tooling)
   - build and deploy with the project's own commands (check its CLAUDE.md)
   - new site: remind user to request indexing in Search Console; established
     site: verify pickup later via `vdr sites:gsc-audit <domain>`
   - mark the backlog entry `published` with date and URL
   - notify user with keyword, intent, score, and live URL

## What this skill is not

Not a generic SEO audit (use `vdr` coach commands directly). Not a way to
publish faster; the gates exist to publish less, better.
