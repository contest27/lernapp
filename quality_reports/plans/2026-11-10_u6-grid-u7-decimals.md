# Plan — four-quadrant grid (Unit 6) and Book 6B Unit 7 Decimals

**Status:** COMPLETED 2026-11-10 (brief from the B8 session; "plan first, then implement").
Outcome and deviations: `quality_reports/session_logs/2026-11-10_u6-grid-u7-decimals.md`.
**Read at:** 7f67cf5

## Why, in the order the class needs it

The class was in Unit 4 on 2026-11-10 and does about one lesson per school day: Unit 6 in about
3–4 weeks, Unit 7 (Decimals, book 6B) around early January.

1. `coordGrid` (vis.js) draws the first quadrant only, so every U6 warm-up with negative
   coordinates is text only — including u06-l02, whose core class task is reading and plotting
   points in all four quadrants.
2. Unit 7 lessons carry `topicId: null`; until content exists the tracker gives a review round.

## Part 1 — four-quadrant grid

- **`coordGrid4(range, points, { poly, mirror })`** in vis.js: axes −range..range through the
  origin, light grid, every integer labelled (real minus sign, white halo so grid lines do not
  cross digits), a single "0" at the origin, `x` / `y` at the axis ends. Points as dots with a
  label pushed AWAY from the origin, so labels never sit in the tick-label band beside the axes.
  `mirror: 'x' | 'y'` draws that axis as a red dashed mirror line (reflections). Each point is a
  `<g data-x data-y data-label>` so tests can check the picture against the answer. viewBox
  260 × 260, same scale as `coordGrid`, readable at iPad width.
- **u06-l02** intro gets the grid (the two points its text names). Tier 1: read P from the grid
  (MC, distractors swapped / one sign wrong / both signs wrong), read one coordinate of P (num),
  quadrant of a point (text), point from words. Tier 2: plot — which of A–D is at (x, y) (the
  others are the classic slips: swapped, x sign, y sign), read one of three marked points, the
  word/quadrant/axis shapes. Points drawn within ±(range − 1).
- **u06-l03**: the four-quadrant reflection shapes show A on the grid with the mirror axis; the
  tier-2 translation shows P (not the answer); "describe the translation" shows A and B. Draws are
  constrained so start and end stay on a ±5 grid.
- **u06-l04**: the four-quadrant vertex, side-length and perimeter shapes show their points
  (and the rectangle for the perimeter); draws constrained to ±5.
- **u06-position** topic: the negative-coordinates and reflection explanation segments get a
  four-quadrant picture.

## Part 2 — Book 6B, Unit 7 Decimals

- **Topics** in a new `content/y6b.js` (`topics6b`, house style of y6a-frac.js: explanation
  segments with `alt`, example, faqs, `gen` tiers 1–3 with scenario() decks at tier 3):
  - `u07-dec-place` (strand `decimals`) — U7 L1–5: × 10/100/1,000, ÷ 10/100/1,000 and their
    multiples, decimals as fractions, fractions as decimals.
  - `u07-dec-ops` (strand `decimals`) — U7 L6–9: multiplying and dividing decimals by whole numbers.
- **Decimal answers are exact.** Every decimal value is built as integer / 10^k (correctly
  rounded, identical to what parseNumber reads), never by float arithmetic on decimals. Every
  decimal `num` sets `allowDecimal` (the pad otherwise hides "." whenever the answer is whole,
  which gives the answer away) and a 1e-9 tolerance as a guard. Helpers exported from y6b.js
  for the warm-ups.
- **vis.js**: `pvChart(rows, { high, low })` — numbers aligned on the decimal point in fixed
  columns (the ×/÷ 10 picture), and `hundredSquare(n)` (hundredths).
- **Register**: `content/index.js` appends `topics6b` (decimals run directly after position, so
  strands stay contiguous); PREREQ `u07-dec-place ← u01-pv10m` goes live. `UNIT_TABLE` row 7 gets
  `[['u07-dec-place', 1, 5], ['u07-dec-ops', 6, 9]]`; titles unchanged (already verbatim).
- **Warm-ups**: `content/y6b-lessons-u7.js` with all 9 U7 lessons, merged into
  `LESSON_PREVIEWS`. Task type per lesson inferred from its title (the practice book is not
  available — same rule as B8). Delegated to one subagent against the contract, with the sweep
  test as its gate; reviewed here by dumping intro, example and questions per tier.

## Tests (deliberate updates)

- "6B/6C wait for content" → U7 maps to its two topics, U8–U15 still `null`,
  `previewOf('u08-l01')` null.
- "units 4-6 lesson-precise" → units 4–7.
- Tracker "next lesson without content" moves from u06-l04 → u07-l01 to u07-l09 → u08-l01.
- New: four-quadrant grid — tick labels, point labels and dots never overlap (measured with
  getBBox over every grid the U6 warm-ups build), and the point the question names is drawn at
  the coordinates of the answer.
- New: no float noise anywhere (prompt, options, explanation) across all topics and warm-ups;
  every U7 `num` offers the decimal key and has at most 3 decimal places.
- sw precache test names the two new modules; PREREQ edge present.

## Delivery

- sw.js ASSETS + `CACHE_VERSION`/`BUILD` → `lernapp-v18` together.
- Docs: topic spine (6B U7 final, PREREQ live), CLAUDE.md phase plan (B9), MEMORY.md decision +
  learnings, session log `2026-11-10_u6-grid-u7-decimals.md`.
- Gate `python tools/run_tests.py` 0 failed; manual pass at 768×1024 of a U6 L2 round and a U7
  round; `/commit`, not pushed.
- Units 8–12: ask Sebastian before starting.
