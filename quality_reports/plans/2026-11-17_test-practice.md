# Plan — Unit test practice (B11, 2026-11-17)

Status: APPROVED 2026-11-17.

## Context

Severin is at the end of Unit 4 (Fractions 1), and the class is writing a Unit 4 test this
week. So the app should offer test practice: a round covering the whole unit, not just the
next lesson's warm-up.

Decisions (Sebastian, 2026-11-17):
- The test covers **Unit 4 only**.
- The round uses the **normal practice mechanics**: a hint and a second try, and "Show the
  explanation again".
- A **test day is entered**, either by Severin or in the parent corner. Until that day the
  test practice is the main card on Today, and tomorrow's warm-up stays as a second button.
  After the test it disappears by itself.

## Design

### State — `shell/storage.js`
- `schoolState()` gains `test: null`, which becomes `{ unit, day, set }` once a test is
  entered. `hydrate` already merges `school` one level deep, so existing installs pick up the
  new key.

### Logic — `maths/school.js` (pure)
- `setTest(slice, unit, day, today)` and `clearTest(slice)` set and remove the test.
- `activeTest(slice, today)` returns the test while `today < day`. On the test day itself it
  stays active only until that day's check-in, so a morning practice still works.
- `testUnitDefault(slice)` is the unit of the last reported lesson, so Unit 4 now.
- `buildTestSession(slice, today, rng, unit, lessonIds = null)` builds a session of
  `kind: 'test'`:
  - **Full round:** one question per lesson of the unit, tier 2, from that lesson's own
    warm-up (`previewOf`), shuffled the way a test mixes them. Unit 4 gives 11 questions, the
    usual sitting length.
  - **Tricky ones:** when `lessonIds` is given, 2 questions per weak lesson (tiers 1 and 2).
  - Items are `part: 'practice'`, `tag: 'test'`, with a `lessonId`, so attempts feed topic
    mastery as usual. The session is BUILD-stamped and sits in the daily slot.
- `testResults(s)` gives the result per lesson (the first-try results the session already
  records). A lesson counts as "practise more" when its question was not right first time.
- `applyCheckin` gains an optional `note`. "📝 We had the test today" logs `note: 'test'`
  and clears the test.

### Screens
- **`ui/checkin.js`**:
  - A small "📝 Test coming up?" link on the Today card opens a new `testdate` screen. There
    he picks the unit (preset to the current one, the previous one as an alternative) and the
    day (the next five school days by weekday name). Saving goes back to Today.
  - While a test is active, the Today card leads with "📝 Unit 4 test on Thursday — 11
    questions, one from every lesson", and Start / Continue / Practise again run the test
    round. Below it sits a subtle "🔭 Tomorrow's warm-up" button and "change test day".
  - In the check-in on the test day, a "📝 We had the test today" button appears.
- **`ui/session.js`**:
  - `startOrResumeTest(unit, lessonIds)`.
  - Items get the tag "📝 Test practice · Unit 4". The lesson is not named during the round,
    as in a test; the summary names it.
  - `recordResult` also stores the `lessonId`.
  - The summary for `test` shows "Test practice done!", a list of the unit's lessons with ✓
    or "practise more", and a button "Practise the tricky ones (N) ▶" that starts the
    targeted round.
- **`ui/focus.js` `applySessionEnd`**: the history entry for `test` gets `unit` and `weak`
  (the lesson ids). No `completeTopic`, but streak and history as for every round.
- **Parent corner tracker**:
  - It shows the test that is set, with a button to remove it, and a "Set a test day" button.
  - Recent sessions label these rounds "Unit 4 test practice", with the weak lessons listed.
  - The check-in log shows "unit test" for `note: 'test'`.

### Housekeeping
- `sw.js`: `CACHE_VERSION` and `BUILD` go to `lernapp-v20`. No new files, because the
  `testdate` screen lives in `checkin.js`.
- `MEMORY.md` gets a decision entry, the session log `2026-11-17_test-practice.md` is
  written, and the CLAUDE.md phase plan gets B11.

## Verification
1. `python tools/run_tests.py` passes with 0 failed. New tests:
   - `activeTest` is active before the test day and on the test day before the check-in,
     and gone after;
   - a full Unit 4 round has 11 items, one per lesson, all `kind: 'test'`, and every item
     passes its own checker;
   - the tricky round has 2 items per weak lesson;
   - `testResults` is correct per lesson;
   - `applySessionEnd` records `unit` and `weak`;
   - the "had the test" check-in clears the test;
   - `hydrate` fills `test: null`.
2. Manual pass at 768×1024:
   - set the test day, then the Today card shows the test practice with the warm-up as the
     second button;
   - play the round, then the summary per lesson, then "tricky ones";
   - on the test day, the check-in offers "We had the test", and after that the card is
     gone;
   - the parent corner shows the test and can remove it.
3. `/commit`, then push (deploy) so it reaches the iPad before the test.
