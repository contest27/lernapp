# Session log — 2026-11-10 — B10: book 6B Unit 8 Percentages

**Goal.** Unit 8 content before the class gets there (about two school weeks after Unit 7,
i.e. around mid-January). Started on Sebastian's "Yes, start Unit 8" after B9 asked before
Units 8–12. Units 9–12 still wait for his go.

**Plan.** `quality_reports/plans/2026-11-10_u8-percentages.md`.

## Decisions

- 2026-11-10 — Topics `u08-pct-of` (L1–5) and `u08-pct-equiv` (L6–9). The provisional spine had
  them the other way round; the lesson order decides.
- 2026-11-10 — PREREQS: the reserved `u08-pct-equiv ← u04-simplify` goes live, and
  `u08-pct-of ← u05-frac-amount` is new (pct-of is now the strand's first topic).
- 2026-11-10 — Task type per lesson inferred from its title (plan table), building on what
  Year 5 `u11-percent` already taught.
- 2026-11-10 — Per-cent answers read "35%" in the feedback, money "£2.70" (B9), via `answerHtml`.

## Trail

- Read at 6b00de3. Scaffold: `pctOf`, `pnum` and stub topics in `y6b.js`, Unit 8 ranges, stub
  warm-up file, precache entry, build lernapp-v19, tests moved deliberately (U9 first without
  content, tracker target u08-l09 → u09-l01, units 4–8 lesson-precise, decimal key for U7–U8,
  both PREREQ edges, "35%" feedback). Gate red only on the stub's tier-3 rotation and the
  pending warm-ups.
- Warm-ups to one subagent against the contract (brief: lesson table from the plan).
- Full topics written; own review by dumping 8 questions per tier: arithmetic correct
  (e.g. 25% of £89 = 2 × £8.90 + £4.45 = £22.25; 30% of 2.9 kg = 0.87 kg). Polished
  explanations that said "11% = 11%".
- Subagent finished the nine warm-ups (7,200 questions dumped and checked by it; it fixed a
  "32.5 pupils" explanation, two-option sale MCs, unrealistic price gaps, a 9/6 distractor and
  a "1 litres" answer). Reviewed here by dumping intro, alt, example and 4 questions per tier per
  lesson: all arithmetic re-checked (e.g. 70% of 560 = 280 + 56 + 56 = 392; 360 − 162 = 198
  adults; Shop B £28 against Shop A £30), distractors are real slips (took £25 off for 25 % off,
  6% + 5% for 65 %, divided instead of multiplied). Its note on the `y6b.js` header fixed here.
- Manual pass at 768×1024: check-in corrected to U7 L9 → Today "U8 · L1 · Percentage of (1)",
  "Book 6B · Unit 7" → intro with the 25 % bar model → four warm-up questions ("." on the pad),
  a deliberate wrong MC answer gives "Find 25% first. Then multiply by 3." → summary "Ready for
  tomorrow", 3/4 + 2/2. The pane's capture was magnified (device pixel ratio 1.5), so this pass
  was read through the page text and element references; the bar model was seen in part.
- Build/cache: lernapp-v19.

## Next

- Units 9–12: ask Sebastian.
- On the device: the per-cent wording, and whether "Answer in %" next to the pad is clear.
- Engine feedback would print "1 litres" for an answer of 1 with a plural unit (`answerText`,
  verbatim from Y5); the content avoids it, a generic fix would belong in `answerHtml`.
