# Session log — 2026-11-10 — B9: four-quadrant grid (Unit 6) and book 6B Unit 7 Decimals

**Goal.** Two pieces of content in the order the class needs them: a four-quadrant grid for
U6 L2–L4 (class there in about 3–4 weeks), then Unit 7 Decimals (around early January).
Brief from the B8 session; Units 8–12 only after Sebastian says so.

**Plan.** `quality_reports/plans/2026-11-10_u6-grid-u7-decimals.md`.

## Decisions

- 2026-11-10 — Grid range 5, drawn points within ±4: the tick labels sit beside the axes, so a
  point label is pushed away from the origin and never lands in that band. No "0" at the
  origin: next to the x-axis "−1" it read as "−10" in the first render.
- 2026-11-10 — Unit 7 split as in the spine: `u07-dec-place` L1–5, `u07-dec-ops` L6–9. The task
  type per lesson is inferred from its title (practice book not available, as in B8).
- 2026-11-10 — Every Unit 7 number question offers "." on the pad and every coordinate
  question offers "−": the pad otherwise tells him the answer is whole or positive.
- 2026-11-10 — Decimals are built as integer / 10^k; no float arithmetic on a decimal.

## Trail

- Read at 7f67cf5. Scaffold first (vis helpers `coordGrid4`, `pvChart`, `hundredSquare`; decimal
  helpers and stub topics in `y6b.js`; register, lesson ranges, ASSETS) so the warm-ups could go
  to a subagent against a fixed contract; gate red only on the two tests that pinned "no 6B".
- U6: L2 intro grid; L2 tier 1 read P / read one coordinate on the grid; tier 2 plot (which of
  A–D, the others are the swapped and sign slips) and read one of three points; L3 reflections
  with the mirror axis drawn, translations with P drawn, A→B with both drawn; L4 vertex, side
  and perimeter shapes on the grid. The U6 topic text got grids for negatives and reflections.
- Tests: grid collision (measured) over every grid the warm-ups build; the named point is drawn
  where the answer says and an answer is never drawn; no float noise across every Y6 generator
  and warm-up; every U7 number question offers "."; lesson/tracker tests moved deliberately
  (U7 covered, U8 first without content); PREREQ edge; precache list.
- The collision test first failed on two "−1" labels by the origin: getBBox's line-box height,
  not the glyphs. The test now measures glyph height; it also caught nothing else.
- Patch-script slip: an em dash in a heredoc decoded as cp1252, the patch refused (asserts).
- Preview server: another session held 8125; temporary launch entry `lernapp-b9` on 8127.
- Own review of the two U7 topics by dumping 8 questions per tier: arithmetic correct; fixed
  wording ("1 more squares", "1 ones", "£6.3", "1300 ÷ 4" without meaning) and a 3-dp price.
- Manual pass at 768×1024: check-in U6 L1 → Today "U6 · L2 Plotting coordinates" → intro with
  A and B on the four-quadrant grid → "coordinates of point P" on the grid, (3, −2) accepted →
  summary "Ready for tomorrow", 4/4 + 2/2. The tier-2 grid shapes rendered separately (one per
  shape) and checked by eye; spacing widened once (pad 18, 9.5-unit ticks).
- Subagent finished the nine U7 warm-ups (720 questions dumped and read by it; gate green).
  Reviewed here by dumping intro, alt, example and 4 questions per tier per lesson: arithmetic
  re-checked, distractors are real slips (remainder written as a decimal, forgotten exchange,
  one column only). Two context slips sent back and fixed ("a glass holds 3.7 litres", juice
  "into cups" at 2.5 litres a cup), plus two more of the same kind it found itself.
- Its three findings outside its file, fixed here: glossary entries `partition`, `counter`,
  `holder`; `pvChart` column names up to millions; money feedback as £2.70, not "2.7 pounds"
  (`answerHtml` in session.js, with a test). My own three money questions now use unit `pounds`.
- U7 L1 round in the app at 768×1024: check-in corrected to U6 L4 "not quite" → two U6 L4
  catch-ups (the second on the four-quadrant grid, D not drawn) → U7 L1 intro with the
  place-value chart → "." on the pad for a whole answer → hint on the "3.30" slip → summary
  "Ready for tomorrow", 5/6 + 2/2. Two consecutive questions there both used 3.3 × 100: chance
  (measured 9 in 1,000 consecutive pairs for L1); L3–L5 share a number in 8–19% of pairs because
  their tier-1 fraction pools are small. Left as it is.
- Gate flake found and fixed: "MODULE IMPORTS" in half the runs, also at 7f67cf5 (2 of 8). Cause:
  `serve.py`'s listen backlog of 5. `request_queue_size = 128` → 12 of 12 green.
- Build/cache: lernapp-v18.

## Next

- Units 8–12 (book 6B): ask Sebastian first.
- On the device: whether the grid reads well on the real iPad, and whether "." and "−" on the
  pad confuse him on questions where the answer has neither.
