# Session log — 2026-09-07 — B4: Year 5 topics join the review pool

**Goal.** Reported from the device: sessions are almost all column +/−, very repetitive, little new. Root cause: the review pool holds only completed Y6 topics (three after two weeks), a new topic arrives every six days by design, and a review-only day fills 11 items over ≤ 3 due topics. Fix: port the Y5 topic modules as review material (phase B4, handoff §6 way 1) and widen review-only days to 5 topics.

**Plan.** `quality_reports/plans/2026-09-07_b4-y5-review-pool.md` (approved 2026-09-07).

## Decisions

- 2026-09-07 — All 32 Y5 topics enter the pool (Y5 score or neutral 50), not only the ones completed in the Y5 app. (User.)
- 2026-09-07 — Review-only days spread 11 items over up to 5 topics (3/2/2/2/2); daily keeps 7 + 4 over ≤ 3. (User.)
- 2026-09-07 — Y5 ids keep their original names (keys of the imported y5 slice); a test pins no collision with Y6 ids.
- 2026-09-07 — Y5 ids are PREPENDED to `y6.completed` so the strand-variety lookback keeps seeing the child's real Y6 history.

## Trail

- Plan approved; contractor mode. Y5 modules copied verbatim from powermath-trainer @ aa8bd0b (c5a/b/c → y5a/b/c, only the engine import path changed). Same ambiguous-digit fault as Y6 had (2026-08-25) found in Y5 u01/u02 tier 1 → fixed with `unambiguousDigitPositions`.
- `content/y5.js` register + `Y5_TO_Y6_STRAND` moved there; `index.js` resolves Y5 by id and maps Y5 strands to Y6 strand keys for the variety rule. `topics`/`topicOrder` stay Y6-only.
- `seedReviewPoolFromY5` (y5-bridge): one-time, needs the y5 slice, tolerates existing Y6 practice, prepends 32 ids to `completed`, due today. Wired into app.js launch + parent import.
- Scheduler: `MAX_REVIEW_TOPICS_ONLY = 5` for review-only days (3/2/2/2/2); daily unchanged.
- Found during the manual pass: the Today card read `completed.length` → "35/13". Fixed with `completedY6()` (also home.js, parent.js).
- Test change: the tier-3 rotation test stays Y6-only — most Y5 tier 3s are procedural templates without a scenario() deck (u02-pv1m: "N more/less" flips a coin), so a repeat there is not a regression.
- Tests: 94 passed, 0 failed (sweep now 45 topics × 3 tiers × 40 seeds). Manual at 768×1024: seeded state on launch (35 completed, Y6 ids last), Today card 3/13, review session 11 items over 5 topics (all Y5, weakest first), answer accepted, explanation sheet for a Y5 topic opens, parent corner shows the "Year 5 review" table (32 rows), map still 13 stations.
- Build/cache: lernapp-v16.
