# Anti-Slop Passes

Two sequential edit passes. Run pass 1 to completion, then pass 2 on the
result. Rewrite offending sentences; never patch by deleting a word and
leaving the skeleton.

## Pass 1: obvious AI patterns

Remove or rewrite:

- **Hype words**: game-changer, revolutionary, seamless, cutting-edge,
  powerful, robust, unlock, supercharge, elevate, transform, effortless,
  next-level, in today's fast-paced world
- **Corporate verbs**: leverage, utilize, streamline, empower, harness,
  facilitate, optimize (when "improve" or the concrete action fits), delve
- **Fake hook questions**: "Ever wondered why...?", "What if I told you...?",
  rhetorical openers that delay the answer
- **Empty marketing phrases**: "in this article we will", "it's important to
  note", "at the end of the day", "the bottom line is", "look no further",
  "without further ado", any sentence that survives deletion with zero loss
- **Unsupported claims**: superlatives and statistics with no source. Either
  cite it, downgrade it ("many" -> the actual number, or cut), or delete it.
  Product claims: re-check against `product.md` in the project root.
- **Internal vendor names**: never expose upstream data providers or internal
  APIs (DataForSEO, Ahrefs, RapidAPI, or similar) in published copy. Replace
  with "live backlink data", "real backlink evidence", or "third-party
  traffic estimates".
- **Manufactured urgency**: fake deadlines, scarcity, countdown language,
  unspecified losses, and consequences the draft does not prove. Replace with
  a real cost of delay plus a concrete next action, or keep the wording calm.
- **Inflated transformation**: testimonials or before/after claims that add
  causation, certainty, scale, or savings absent from the documented source.
  Restore the source's exact meaning or remove the claim.

## Pass 2: subtle signals

- **Repetitive sentence openings**: no 3+ nearby sentences starting with the
  same word/pattern ("The...", "This...", gerunds). Vary or merge.
- **Missing contractions**: "it is", "you will", "do not" in body prose ->
  it's, you'll, don't. Keep formal only in quotes or where emphasis needs it.
- **Weak transitions**: moreover, furthermore, additionally, in conclusion,
  overall. Cut them; if the paragraph falls apart, the paragraph order is the
  problem.
- **Overly long paragraphs**: max ~4 sentences or ~80 words. Split at the
  natural turn.
- **Em dashes**: none, anywhere. Periods, commas, or parentheses instead.
- **Uniform sentence length**: read a section aloud; if every sentence lands
  the same beat, shorten one, extend another.
- **Triplet addiction**: "fast, reliable, and secure" listing three of
  everything. Two or four, or just the one that's true.
- **Hedging stacks**: "can potentially help to" -> "helps" (if true per
  product facts) or cut.
- **Pressure on repeat**: more than one urgency or contrast beat in a section.
  Keep the strongest evidence-led version; rewrite the rest as useful detail.

Exit check for both passes: read the intro and one random middle section
aloud. Anything you wouldn't say to a colleague gets rewritten. Then run the
urgency exit check in `VOICE.md`.
