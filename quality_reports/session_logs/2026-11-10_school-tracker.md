# Session log — 2026-11-10 — B8: Power Maths class tracker + tomorrow's warm-up

**Goal.** The class does about three practice-book pages a day, roughly one lesson. Severin
does not always finish them, and the books stay at school. The app should know which lesson
the class is on (he reports it at a check-in) and spend about ten minutes a day on the NEXT
lesson's task type, so that he recognises it in class. English is hidden from the app; its
code stays.

**Plan.** `quality_reports/plans/2026-11-10_school-tracker.md` (approved 2026-11-10).

## Decisions

- 2026-11-10 — The class is in Unit 4, so lesson-precise previews go to U4–U6 (24 lessons).
  U1–U3 fall back to topic level. (Sebastian.)
- 2026-11-10 — Daily round: an intro to the next lesson, 4 questions of its type [1,1,2,2],
  then 2 review questions. This replaces the 11-item daily for Y6. (Sebastian.)
- 2026-11-10 — When he reports a lesson as not finished, the round opens with 2 questions of
  that lesson's type, and the parent corner logs it. (Sebastian.)
- 2026-11-10 — Lesson granularity rests on the official lesson titles. The practice book itself
  is not available, so the task type per lesson is inferred from its title.

## Trail

- Plan approved; contractor mode.
- The gate gave no verdict: headless Edge exits 0 with an empty DOM for any page (HEAD
  too), while headless Chrome works. `run_tests.py` now tries every browser in turn.
- `content/lessons.js` (140 lessons, topic ranges from the spine) + stubs for the two preview
  files; `gcd/simplify/mixed` exported from `y6a-frac.js`. The U4 and U5+U6 previews went to
  two subagents against that contract, with the sweep test as their gate.
- `maths/school.js`: calendar, `checkinDue`, `applyCheckin` (one entry per day, a correction
  restores `before`), `markTaught`, `planPreview`, `buildPreviewSession`, `previewTopicView`.
- Screens: `ui/checkin.js` (pick / browse / finished, plus the Today card), the preview kind in
  `session.js` (intro after the catch-up via `introAt`, tags, a "Ready for tomorrow" summary),
  the parent tracker section, and English hidden (`shell.englishOn`, `homeName()`).
- Found by the new hydrate test: `hydrate()` never filled new SHELL keys (Object.assign
  aliasing). Fixed and logged in MEMORY.md.
- Manual pass at 768×1024 (agents still writing, so some previews fell back to topic level):
  first run → U4 L5 "not quite" → Today shows L6 with the catch-up → round 1/8 catch-up,
  2/8, intro "Tomorrow in class" (3 parts, fallback), 3/8 tagged Tomorrow → summary "Ready
  for tomorrow" 6/6 + 2/2, streak 1 → next day check-in predicts L6 → "all done" → L7, no
  catch-up → a same-day "change" shows "Today you said … / Before that …" → the parent
  tracker shows both check-ins → the English switch brings the hub back and hides it again.
- Two UX fixes from the pass: lesson rows open in place (`go()` scrolled a tapped row out
  of sight), and the same-day "change" predicts from the position before today.

- Both content agents finished (U4: 11 lessons; U5+U6: 13). Reviewed by dumping intro, alt,
  example and 3 questions per tier per lesson: arithmetic re-checked by hand (mixed-number
  exchanges, missing numbers, the tank and square-vertex questions), English plain, task type
  matching each title. U4 L3 draws its own fraction number line (`numberLine` labels ticks
  in decimals).
- Both agents reported the same defect outside their files: a wrong MC answer showed a
  stacked mixed number as "2 34", because `answerText` (engine, verbatim) strips HTML.
  Fixed in `session.js` (`answerHtml`: an MC answer is shown as its option), so the engine
  stays untouched.
- Gap left open: `coordGrid` draws the first quadrant only, so U6 L2–L4 questions with negative
  coordinates are text-only. U6 L2's core task, reading points on a four-quadrant grid, has no
  diagram yet.
- Gate: 106 passed, 0 failed (Chrome). In the app, the L7 round opens on its own intro (2 parts).
- Build/cache: lernapp-v17.

## Next

- A four-quadrant grid for vis.js and the U6 L2–L4 warm-ups (the class reaches U6 in about 3–4
  weeks).
- Book 6B content (Unit 7 Decimals onward), needed by early January.
- Try it on the device: the check-in wording, whether 6 questions fit ten minutes, whether he
  recognises lessons from the samples.
