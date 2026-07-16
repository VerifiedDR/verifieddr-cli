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

Exit check for both passes: read the intro and one random middle section
aloud. Anything you wouldn't say to a colleague gets rewritten.
