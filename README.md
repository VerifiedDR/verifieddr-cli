# VerifiedDR CLI

A tiny, dependency-free CLI for the [VerifiedDR](https://verifieddr.com) API.
Use it to understand why a domain's **TrueDR** is weak, find the next verified
partner to contact, and check whether the work is improving authority over time.
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

# Get a score, diagnosis, and next actions
vdr analyze verifieddr.com

# Get the best next partner/action
vdr next verifieddr.com

# Surface verified partners worth contacting
vdr opportunities verifieddr.com

# Render the backlink map in your terminal
vdr map verifieddr.com
```

Get a free key in your VerifiedDR dashboard. **Free** includes 10 calls/day,
**Pro** includes 1,000 calls/month, and **Agency** includes 10,000 calls/month.
Requires Node.js 18 or newer. If global installs are unavailable, run any
command through `npx verifieddr ...`.

Every command needs a key and is metered against your plan quota; remaining
quota and your tier are printed to stderr, and returned as
`X-API-Quota-Remaining` / `X-API-Tier` headers). Pass `--key vdr_...` instead of
the env var on any command.

## Commands

The coach commands are the default product surface:

```bash
vdr analyze example.com              # score, main issue, top 3 actions
vdr diagnose example.com             # why TrueDR is lower than DR
vdr actions example.com              # ranked by impact, effort, confidence
vdr opportunities example.com        # verified partners, directories, backlink ideas
vdr opportunities example.com --contact partner-slug  # send drafted mail to a listed partner
vdr opportunities example.com --contact partner-slug --dry-run  # preview contact payload
vdr audit backlinks example.com      # backlink risk review
vdr content-plan example.com         # authority-supporting page plan
vdr fix example.com --goal +10       # 30/60/90-day growth plan
vdr track example.com                # whether TrueDR is moving
vdr explain example.com              # client/founder-ready explanation
vdr boost example.com                # recommended authority campaign
vdr next example.com                 # best next partner/action
```

The coach loop is partner-first: `vdr next` prefers one concrete verified
partner action when that is the fastest useful authority move. `vdr
opportunities` shows potential partnership candidates, the suggested outreach
angle, and the exact command to approve before sending. Partner names are shown
on every plan; sending the contact request is the paid action. Partner matching
uses the lookup and opportunities APIs, so it can spend two quota calls when
partner candidates are requested.

Pro and Agency users can contact a listed partner without seeing the owner's
email address. Use `--dry-run` first when you want to confirm the custom subject
or message before sending:

```bash
vdr opportunities example.com --contact partner-slug --dry-run
vdr opportunities example.com --contact partner-slug --message "Custom outreach copy..."
```

The email is sent through VerifiedDR's partnership mail system, using the same
ownership, opt-out, quota, and confirmation flow as the dashboard UI.

The API commands follow a `resource:action` shape:

```bash
# Public discovery, works for ANY approved site
vdr authority:lookup stripe.com       # DR, TrueDR, trust score, evidence
vdr map stripe.com                    # terminal backlink map
vdr map stripe.com --json             # raw DR Map data
vdr discover:find --category ai --min-truedr 50 --traffic-validated --limit 10
vdr discover:find --opportunities-for example.com --limit 10
vdr badge:snippets stripe.com         # badge / embed snippets
vdr categories:list                   # valid category values

# Your own sites (owner-scoped)
vdr sites:list                        # list your sites + metrics
vdr sites:get example.com             # one site with DR/traffic trends
vdr sites:truedr example.com --detailed   # TrueDR + full signal breakdown
vdr sites:export example.com          # machine-readable export
vdr sites:disavow example.com         # Google disavow candidates for spam links
vdr sites:monitor --daily             # watch all your sites for changes
vdr sites:monitor example.com         # watch one site
vdr sites:submit https://example.com --title "Example" --category saas
vdr sites:verify example.com          # re-check the badge embed
```

> The pre-`0.2` verbs (`lookup`, `find`, `sites`, `monitor`, ...) still work as
> hidden aliases, so existing scripts keep running.

### What's public vs. private

- **Public fields, any site** (`authority:lookup`, `discover:find`,
  `map`, `badge:snippets`): DR, TrueDR, trust score, confidence, traffic
  validation, public backlink totals/map data, badge links. Never owner
  identity, billing state, or the per-signal trust breakdown. `vdr map` is
  cache-only: it never triggers a paid backlink fetch; if no cached map exists
  yet, try again after the site's DR Map has been opened or refreshed.
- **Owner-scoped** (`sites:*`): only your own claimed sites.
  `sites:truedr --detailed` returns the full signal breakdown for sites you own.
  `sites:disavow` prints a Google disavow-format candidate file from cached
  spam-link evidence; use `--min-spam`, `--include-lost`, `--limit`, or `--json`
  to tune/review it. It never submits anything to Google.

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

This repo ships an agent **skill** under [`skills/verifieddr-authority`](skills/verifieddr-authority/SKILL.md)
that teaches assistants when and how to call these commands. Install it straight
into your agent with:

```bash
npx skills add VerifiedDR/verifieddr-cli
```

After installing the skill, ask for one of these outcomes instead of memorizing
commands:

1. **Growth Loop:** find the TrueDR gap, check the detailed actions, disavow
   only when spam links are found, pick one partner move, and end with the
   command to approve.
2. **Partner Outreach:** find one verified partner, preview the outreach with
   `--dry-run`, then send only after approval.
3. **Progress Report:** check TrueDR and DR movement, review weak backlink
   evidence, choose one next action, and write a founder or client-ready update.
4. **Fix Weak Authority Signals:** inspect the owner-scoped signal breakdown,
   choose the relevant fix, and skip cleanup when spam is not the issue.
5. **Monitor Metrics:** set a recurring authority check for DR, TrueDR, traffic
   validation, backlink deltas, and trust alerts.

Example prompts:

```text
Run the VerifiedDR growth loop for example.com.
Analyze the TrueDR gap, then run `vdr sites:truedr example.com --detailed` to
check the owner-scoped recommendations. If spam links are found, generate
disavow candidates with `vdr sites:disavow example.com --min-spam 50` and list
the domains I need to approve before upload. If no spam links are found, skip
disavow and say so. Then choose the best partner opportunity, draft the outreach
angle, and end with the exact command I should approve next.
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

## License

MIT
