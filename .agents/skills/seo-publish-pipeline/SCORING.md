# Quality Score

Score after the anti-slop passes, out of 100. Threshold: 85. Score honestly;
a generous score here just publishes slop with paperwork.

| Dimension | Weight | 0 points | Full points |
|---|---|---|---|
| Sounds human | 25 | AI patterns, manufactured urgency, or uniform rhythm remain | Reads aloud like a person; varied rhythm; urgency is sparse and evidence-led; no pattern hits |
| Product truth | 30 | Any claim not on the "exists" list, or contradicting "does not exist" | Every product claim traces to `product.md` in the project root |
| Evidence | 10 | A number in the copy is missing from the step-4 evidence table, undated, or recalled rather than measured | Every number traces to a source command and date; at least one first-party datapoint a competitor cannot copy |
| Intent match | 15 | Answers a different question than the classified intent | Short answer + body fully serve the step-2 intent |
| Structure | 10 | Missing required STRUCTURE.md sections, broken internal links | All 8 elements present; internal links verified live; reciprocal inbound links planned |
| Title & meta | 10 | Keyword missing or stuffed; meta vague | Keyword front-loaded; meta concrete, numbers-first |

Scoring procedure:

1. Score each dimension independently, note the evidence (quote the failing
   sentence or the passing proof).
2. Automatic fail overrides, regardless of total:
   - any false product claim -> back to step 6
   - any number not in the step-4 evidence table -> back to step 6
   - any dead internal link -> fix, then rescore
   - any em dash in body copy -> back to pass 2
   - any invented scarcity, deadline, loss, or consequence -> back to step 6
   - any invented, composite, or materially strengthened testimonial -> back to step 6
   - no recorded answer to the step-3 cannibalization question -> back to step 3
3. Total < 85: return to step 6 with the failing dimensions and quoted
   evidence as the revision brief. Do not re-draft passing sections.
4. Three failed loops: STOP. Report the breakdown and quoted evidence to the
   user; the keyword stays `pending`.
