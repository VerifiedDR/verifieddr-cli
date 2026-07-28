---
name: seo-publish-pipeline
description: >-
  Run a gated SEO article pipeline before publishing: pick a keyword from a
  research-built backlog (vdr CLI), classify search intent, check the site for
  cannibalization, build a first-party evidence table, validate every product
  claim against a product facts file, draft to a fixed structure, run two
  anti-slop passes, score, and only then publish. Use when the user asks to
  write/publish an SEO article or blog post, run the SEO pipeline, work the
  keyword backlog, or build the backlog with vdr keyword research. Hard rule:
  never invent a keyword, a number, or a product feature to keep the pipeline
  moving.
---

# SEO Publish Pipeline

Ten gated steps. Each gate can stop the pipeline; stopping and reporting is
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
vdr sites:visibility <domain>                     # questions AI engines answer + brands named instead
vdr growth:tasks <domain>                         # generated plan: content + link tasks
```

Tracked keywords with a `boost` or `advanced` tier in their snapshot qualify
directly; only run `keywords:research` on a tracked keyword when its snapshot
is older than 30 days. Otherwise add only keywords with a winnable verdict or
an existing 4-30 ranking. Record keyword, source command, DR gap, date, status
(`pending|written|published`).

**Rejections expire.** Re-read every tracked snapshot on each research run,
including keywords a past run rejected. SERPs move: a term rejected at DR gap
+20 can sit at gap -9 six weeks later. Write rejections as
`rejected <date>, gap <n>` in the backlog, never as a permanent verdict, and
re-check them before assuming a topic is out of reach.

**Stale-claim sweep.** Every research run, grep already-published articles for
countable facts that drift (feature counts, prices, plan limits, quotas,
"seven workflows", "three platforms"). Any that no longer match `product.md`
goes into the backlog as a fix task before new writing starts.

## Steps 1-9: Writing run

1. **Pick keyword** - take the oldest `pending` backlog entry. Backlog empty?
   STOP, tell user to run a research run (Step 0). Never substitute a nearby
   topic. If the entry is stale (>30 days), re-verify:
   `vdr keywords:research "<keyword>" --domain <domain>`.

   *User-requested topic:* when the user asks for a specific subject, do not
   free-write it. Turn it into a keyword, run `keywords:tracked` first and
   `keywords:research` if untracked, then add it to the backlog with source
   `user request <date>`. If the SERP is out of reach (positive gap on an
   `ultra` tier, or a wall of DR 70+ pages), report the numbers, propose the
   nearest winnable variant, and let the user choose. Never publish against a
   keyword the data rejects just because it was requested.

2. **Classify intent** - one of: comparison, how-to, definition, buying guide,
   troubleshooting, list. Classify from the live top-10 titles in the research
   output, not from the keyword's wording. Write it down; the article must
   answer this intent, not restate the keyword.

3. **Cannibalization check** - list every existing page and post on the site
   that already targets this keyword or its intent (search the route manifest,
   the post registry, and the sitemap). Then decide, and record the decision:
   - Existing page owns the intent -> strengthen that page, no new article.
   - New article with a distinct intent -> state in one line how the two
     differ, and plan the internal link in both directions before drafting.
   Two pages answering the same question is a self-inflicted ranking problem.
   The gate fails when you cannot name the difference in one sentence.

4. **Evidence table** - before drafting, collect the first-party numbers the
   article will use and write them down as `claim | value | source command |
   date`. Prefer the product's own live data (`keywords:research` SERP DR,
   `sites:visibility` scores and competing brands, `sites:gsc-performance`
   queries) over anything recalled or estimated. Rules:
   - Every number in the draft must exist in this table. No exceptions.
   - Date-stamp each number in the copy ("live VerifiedDR data, July 2026").
   - No number available? Cut the sentence, don't soften it into "many".
   - Dogfood data (your own site's scores) is the strongest evidence you own
     and the hardest for a competitor to copy. Use it when it is honest,
     including when it is unflattering, and flag unflattering numbers to the
     user before publishing.

5. **Product validation setup** - read `product.md` in the project root. Every
   claim about the product in the draft must trace to the "exists" list.
   Anything on the "does not exist" list, or on neither list, may not be
   claimed. Never name internal data vendors or upstream APIs (DataForSEO,
   Ahrefs, RapidAPI, or any other provider) in published copy, even if
   `product.md` mentions them internally. Say "live backlink data", "real
   backlink evidence", or "third-party traffic estimates" instead. Prefer
   wording that survives a product change: "the platforms we track" ages
   better than "all three platforms".

6. **Draft** - follow [STRUCTURE.md](STRUCTURE.md) exactly and apply the
   evidence-led urgency rules in [VOICE.md](VOICE.md): keyword title,
   short answer up top, longer AI-engine answer block, clear sections, FAQ,
   internal links (from the site's real sitemap/pages only), product section,
   CTA. Mine FAQ questions from `sites:gsc-performance` queries and from the
   buying-intent questions in `sites:visibility`; those are the questions
   people and AI engines actually ask.

7. **Two anti-slop passes** - run both passes in
   [ANTI-SLOP.md](ANTI-SLOP.md) as separate, sequential edits (pass 1: obvious
   AI patterns; pass 2: subtle signals). Do not merge them into one pass.

8. **Score** - rubric in [SCORING.md](SCORING.md). Threshold: 85/100. Below
   threshold: back to step 6 with the failing dimensions as the revision brief.
   Max 3 revision loops, then STOP and report the score breakdown to the user.

9. **Publish** - only after a passing score. Work the checklist; a draft that
   renders but is not registered is not published:
   - register the post in the project's post/metadata registry and in its SEO
     route manifest (title, description, keywords, OG image, schema types)
   - hero or OG image (project's existing image tooling or generated OG route)
   - reciprocal internal links: link to the new post from at least two
     existing pages that touch the topic, not only outward from the new post
   - run the project's tests, typecheck, and build before deploying
   - deploy with the project's own commands (check its CLAUDE.md)
   - submit the URL for indexing (`vdr sites:submit-urls <domain> <url>`); new
     site: also request indexing in Search Console; established site: verify
     pickup later via `vdr sites:gsc-audit <domain>`
   - mark the backlog entry `published` with date, URL, score, intent, and the
     countable claims that will need re-checking later
   - notify user with keyword, intent, score, and live URL

## What this skill is not

Not a generic SEO audit (use `vdr` coach commands directly). Not a way to
publish faster; the gates exist to publish less, better.
