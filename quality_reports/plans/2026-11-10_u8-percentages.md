# Plan — book 6B Unit 8 Percentages (B10)

**Status:** COMPLETED 2026-11-10 (approved by Sebastian: "Yes, start Unit 8"). Outcome: `quality_reports/session_logs/2026-11-10_u8-percentages.md`.
**Read at:** 6b00de3. Same shape as B9 (`2026-11-10_u6-grid-u7-decimals.md`).

## Why now

Unit 8 follows about two school weeks after Unit 7 (early January), so it is needed by about
mid-January. Until it has content, its nine lesson days are review rounds.

## Lessons (titles verbatim) and the task type inferred from each title

The practice book is not available (B8 rule): the task type comes from the title and the Year 6
curriculum. Year 5 (`u11-percent`) already taught "per cent = out of 100" and the 50/25/10/20 %
family, so Year 6 builds on it.

| L | Title | Task type |
|---|---|---|
| 1 | Percentage of (1) | 50 %, 25 %, 75 % of an amount = ½, ¼, ¾ of it |
| 2 | Percentage of (2) | 10 % (÷ 10) and 1 % (÷ 100), then multiples: 30 %, 7 % |
| 3 | Percentage of (3) | building percentages from 50/10/5/1 %: 35 % = 25 % + 10 %, 15 %, 12 % |
| 4 | Percentage of (4) | percentages of amounts in context, money and measures, answers may be decimals |
| 5 | Finding missing values | the whole from a part (20 % of □ = 15), or the percentage (□ % of 80 = 20) |
| 6 | Converting fractions to percentages | equivalent fraction over 100: 3/5 = 60 %, 7/20 = 35 % |
| 7 | Equivalent fractions, decimals and percentages (1) | converting between all three |
| 8 | Equivalent fractions, decimals and percentages (2) | comparing and ordering a mix of them |
| 9 | Mixed problem solving | multi-step problems across the unit |

## Topics (finalises the spine's provisional 6B percentages pair)

- `u08-pct-of` (strand `percentages`) — L1–5: percentages of amounts and missing values.
- `u08-pct-equiv` (strand `percentages`) — L6–9: fractions, decimals and percentages, mixed problems.
  The spine listed them the other way round; lesson order decides, and the test pins that walking
  the lessons visits the topics in book order.
- PREREQS: the spine's reserved `u08-pct-equiv ← u04-simplify` goes live; new
  `u08-pct-of ← u05-frac-amount` (a percentage of an amount is a fraction of an amount, and
  pct-of is now the strand's first topic). Logged in the spine.

## Work

- `content/y6b.js`: the two topics in house style (explanation with `alt`, example, faqs, tiers
  1–3, scenario decks at tier 3). Every number answer through `dnum` (no "." giveaway); answers
  built from integers (a percentage of an amount = amount × p / 100 with an exact result).
  A small `pnum` for answers typed in per cent (unit `%`).
- `content/lessons.js`: Unit 8 ranges `[['u08-pct-of', 1, 5], ['u08-pct-equiv', 6, 9]]`, merge
  `lessonPreviewsU8`.
- `content/y6b-lessons-u8.js`: nine lesson-precise warm-ups — delegated to one subagent against
  the contract, gate as its check, reviewed here by dumping every lesson.
- `ui/session.js`: a per-cent answer shows as "35%" in the feedback (like £ in B9).
- Tests: units covered 6A–U8, U9 first without content; tracker target u08-l09 → u09-l01;
  lesson-precise units 4–8; Unit 8 lesson → topic mapping; decimal key for U7–U8; PREREQ edges;
  precache list; per-cent feedback.
- sw.js ASSETS + `CACHE_VERSION`/`BUILD` → `lernapp-v19`. Docs: spine, CLAUDE.md, README,
  MEMORY.md, session log `2026-11-10_u8-percentages.md`.
- Gate 0 failed; manual pass of a U8 round at 768×1024; `/commit`, not pushed. Units 9–12: ask.
