# Plan — Power Maths class tracker + "tomorrow's lesson" warm-up (2026-11-10)

Status: APPROVED 2026-11-10.

## Context

The class does about three practice-book pages a day, which is roughly one Power Maths
lesson a day. Severin does not always finish them, and the books stay at school. So the app
should know which lesson the class is on and spend about ten minutes a day getting him ready
for the next one: when the task type turns up in class the next day, he has already seen it.

Today the app chooses its own pace (one new topic every 6 days, English and maths on
alternating days, plus a "we have not had this in class yet" button that pushes a topic back).
That is a rough guess at the class position. The new version asks Severin where the class is.

English stays in the code but no longer appears in the app.

Decisions (Sebastian, 2026-11-10):
- The class is in **Unit 4** (Fractions 1). So lesson-precise previews go to **U4, U5 and U6**
  (24 lessons). Lessons in U1–U3 fall back to their topic generator.
- Daily round: **a short intro to the next lesson, 4 questions of exactly that type (easy to
  medium), then 2 review questions**. This replaces the old 11-item daily for Year 6.
- When he says he did **not finish** the pages, the round **starts with 2 questions of that
  lesson's type**, and the parent corner shows it.

## Design

### 1. Lesson register — `app/js/maths/content/lessons.js` (new)
- All 140 lessons, in book order, transcribed from the canonical
  `quality_reports/reference/y6-yearly-overview.md`: `{ id: 'u04-l07', book, unit, n, title,
  topicId }`. Unit titles are included. The titles are not renamed (non-negotiable 5).
- The `topicId` for the 6A lessons comes from the lesson ranges in `y6-topic-spine.md`
  (for example `u04-addsub-frac` = U4 L6–11). The 6B/6C lessons get `topicId: null` until their
  content exists.
- Helpers: `lessonById`, `lessonIndex`, `nextLesson`, `units()`, `lessonsOfUnit`, and
  `previewOf(id)`, which returns `{ gen, segments, example }`. If a lesson has its own preview,
  that is used. Otherwise it falls back to the topic: `topic.gen` at tiers 1–2 and the first
  explanation segments. Lessons without content return `null`.

### 2. Lesson previews U4–U6 — `app/js/maths/content/y6a-lessons.js` (new)
- 24 entries `{ intro: { text, alt, svg? }, gen(rng, tier) }`, tiers 1–2 only (this is a
  warm-up, not a test). Each one is written for the task type in the lesson title, e.g.
  U4 L6 "denominators where one is a multiple of the other", L7 "find a common denominator",
  L8/L9 mixed numbers, U5 L4/L5 "÷ whole: divide the numerator / make an equivalent fraction
  first".
- The answers are computed (non-negotiable 4). Mixed-number answers use MC or split the
  question, because the fraction pad cannot take mixed numbers (see the design note in
  `y6a-frac.js`). `gcd`/`simplify` are exported from `y6a-frac.js` instead of duplicated.
  `gen.js` stays verbatim.
- The task types are inferred from the official lesson titles. I have no access to the
  practice book itself. The check-in log will show where the guess and the class differ.
- This is independent content work against a fixed interface, so it can go to subagents
  (U4 / U5+U6) while I build the framework. I review every file before it is committed.

### 3. State — `shell/storage.js`
- `curriculumState().school = { pos: null, lastCheckin: null, log: [] }`. `log` holds
  `{ day, lesson|null, finished|null }` and is ring-capped. `hydrate` merges `school` one level
  deep, the same way it handles `settings` (the inherited `[LEARN]` about Object.assign dropping
  nested keys).
- `shell.englishOn: false`. Existing installs get `false` through `hydrate`, so English
  disappears without touching the English state.

### 4. Logic — `app/js/maths/school.js` (new, pure, tested)
- `checkinDue(slice, today)`: on a weekday it is due when there has been no check-in today; at
  the weekend it is due when there has been none since Friday.
- `predictedLesson(slice)` = the lesson after `pos`.
- `applyCheckin(slice, today, { lesson | null, finished })` sets `pos`, writes the log, and calls
  `markTaught` for every Y6 topic whose last lesson the class has now passed. That topic goes
  into `completed` (the review pool), gets a mastery entry if it has none, and is scheduled
  with `scheduleAfterSession`. Stars stay as they are: only practice in the app earns them.
  Jumping ahead (a missed check-in) and stepping back (a correction) both work.
- `planPreview(slice, today, rng)` builds the round from catch-up (2 × [1, 2], only when the
  last reported lesson was not finished), preview (4 × [1, 1, 2, 2]) and review (2, from
  `dueReviewTopics`, otherwise from the weakest completed topics, at `reviewTier`). If the
  next lesson has no content yet (6B), the round becomes a plain review day.
- `buildPreviewSession(...)` lives in `ui/focus.js` style, as pure logic. The session has
  `kind: 'preview'` and `lessonId`. `introAt` is the number of catch-up items, so the intro
  comes after the catch-up and before tomorrow's questions. The session is stamped with
  `BUILD`, so the existing stale-session guard applies to it too.

### 5. Screens
- **New `ui/checkin.js`** (screen `checkin`, English UI):
  1. "What did you do in Power Maths today?" (at the weekend: "…in your last lesson?"). The
     **predicted lesson** is shown as a large card with a **sample question rendered from its
     generator** ("It looked like this"), so a title he has forgotten can be recognised by the
     task type. Buttons: "✅ Yes, that one", "⏸ No new lesson today", and "🔎 Something else",
     which opens a browser by unit with a sample per lesson.
  2. "Did you finish those pages?" with "✅ All done" and "⏳ Not quite".
  3. A toast "Tomorrow: L8 Adding fractions", then back to Today.
  - On first use (no position known) the screen goes straight to "Which unit is your class
    on?", then the lessons.
- **`ui/today.js`** (when Y6 is the active curriculum) shows, in order: the check-in card if a
  check-in is due; otherwise "Tomorrow in class: U4 · L8 Adding fractions — 10-minute warm-up"
  with Start, Continue, or Practise again; and a small "Last lesson: … (change)" link. The
  English-day card, the cadence card and the "not had this yet" button are no longer shown
  there. The old path stays for any other curriculum.
- **`ui/session.js`**: `explainView` takes a lesson view (title "Tomorrow in class", the intro,
  the topic's FAQs) for `kind: 'preview'`. `next()` switches to the intro at `introAt`.
  Catch-up items get the tag "📒 Today's pages". `applySessionEnd` (in `focus.js`) handles
  `preview` with no `completeTopic`, plus the review reschedule, streak and history.
- **Parent corner**: a new "Power Maths class tracker" section shows the current position, the
  next lesson, the last 10 check-ins (✓ / ⏳ / —) and a button to correct the position. It
  replaces the Pace/deferral section for Y6. It also gets an "English module: hidden / shown"
  toggle.
- **English hidden**: the hub skips to Today when `englishOn` is false, the "Home" tab is
  dropped from the bottom nav, and the English parent section is shown only when English is on.
  Nothing under `app/js/english/` changes.

### 6. Housekeeping
- `sw.js`: the new files go into `ASSETS`, and `CACHE_VERSION` and `BUILD` are bumped together.
- Docs: `CLAUDE.md` gets the phase plan and a new B8, `MEMORY.md` gets a decision entry,
  `README.md` gets a status paragraph, and `y6-topic-spine.md` gets a note on the lesson
  register. A session log goes in `quality_reports/session_logs/`.

## Verification

1. `python tools/run_tests.py` reports 0 failed. New tests:
   - the register has 140 lessons, per-unit counts equal to the overview, unique ids, and a
     valid `topicId` for every 6A lesson;
   - every U4–U6 preview generator × tiers 1–2 × 40 seeds produces a valid question that its
     own checker accepts, with the same prompt for the same seed;
   - `checkinDue` behaves correctly on weekdays and at the weekend; `applyCheckin` handles
     jumping ahead, stepping back and "no lesson", and marks topics as taught;
   - `planPreview` puts the catch-up in only when a lesson was unfinished, makes totals of
     6 or 8, and falls back to a review day for 6B;
   - `hydrate` fills `school` and `englishOn` on an old state; the existing tests stay green.
2. A manual pass at 768×1024 in the browser preview:
   - first run, then check-in, then the warm-up: the intro, 4 questions, 2 review questions
     and the summary;
   - the next day with "Not quite": the catch-up comes first, then the intro;
   - the parent corner shows the log; correcting the position works;
   - the English toggle works.
3. Commit through `/commit` (the gate runs the test page).

## Not in this round (follow-ups)
- **Book 6B content** (Unit 7 Decimals onward). At about one lesson a day the class reaches it
  in early January. Until then a 6B lesson gives a review day with a note. This should be its
  own session, building on the lesson register from this round.
- Lesson-precise previews for U1–U3: not needed, because the class is past them; they fall
  back to topic level.
