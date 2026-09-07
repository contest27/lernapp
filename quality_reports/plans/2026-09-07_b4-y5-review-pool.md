# Plan — B4: Year 5 topics join the review pool

**Date:** 2026-09-07 · **Status:** APPROVED 2026-09-07 · **Identity:** Builder
**On approval:** copy this file to `quality_reports/plans/2026-09-07_b4-y5-review-pool.md`, open the session log.

## Context

Reported from the sofa: sessions are almost all column addition/subtraction, endless repetition, hardly anything new. Diagnosis (this session): the review pool is only *completed Year 6 topics*. Two weeks into the year that is three topics, one new topic arrives every six days by design, and a review-only day always fills 11 items round-robin over at most three due topics — so a day with one due topic is 11 questions of that topic. The Y5 import currently only seeds priors; the Y5 topic modules were never ported (phase B4, open since 2026-08-16, handoff §6 way 1).

Decision (user, 2026-09-07): **all 32 Y5 topics** become review material in the Y6 slice, and **review-only days spread over up to 5 topics** (3/2/2/2/2) instead of 3 (4/4/3). Days with a new topic keep 7 + 4 over ≤ 3 review topics.

## Design

**Content.** Copy the three Y5 topic modules verbatim from `Powermath Trainer/app/js/content/c5{a,b,c}.js` (Y5 repo HEAD `aa8bd0b`) to `app/js/maths/content/y5{a,b,c}.js`. Only changes: header line naming the source commit, and `'../engine/check.js'` → `'../../engine/check.js'` (y5b). `gen.js`/`vis.js` here are supersets of the Y5 ones (checked by diff), so `./gen.js`/`./vis.js` imports stay. Topic ids stay as they are (`u01-pv100k` … `u17-volume`) — they are the keys in the imported y5 slice; a test pins that no Y6 id collides with a Y5 id (6B/6C will add `u08…u15` ids later).

**Register.** New `app/js/maths/content/y5.js`: `y5Topics`, `y5TopicOrder`, `Y5_STRANDS`, and the Y5→Y6 strand map (`Y5_TO_Y6_STRAND`, moved here from `y5-bridge.js` so bridge and index both import it without a cycle). `index.js` keeps `topics`/`topicOrder` **Y6-only** (map, pacing, progress counts, journey tests depend on that) and extends `topicById` to fall back to Y5 topics and `journeyMeta.strandOf` to map a Y5 topic to its Y6 strand (addsub/multdiv → fourops, geometry → shapes, …) so the variety rule in `pickReviewTopics` works across both years. Also export `completedY6(slice)` (count of completed ids that are Y6 topics) for the two progress displays.

**Seeding** (`app/js/maths/y5-bridge.js`, new `seedReviewPoolFromY5(state, today)`): one-time, guarded by `y6.y5ReviewSeeded`; independent of `seedY6FromY5` (must run on a slice that already has practice). Requires the y5 slice (no import → no Y5 review; parent corner says so). For every Y5 topic: mastery = Y5 score if the y5 slice has one, else 50; `due = today` so the whole pool is available at once and Leitner spreads it from there; stars copied when present. The ids are **prepended** to `y6.completed` so `nextNewTopic`'s two-topic lookback still sees the child's real Y6 history. Delete the hand-copied `Y5_TOPIC_STRAND` table (its comment already says B4 replaces it) — `strandMeans` reads strands from `y5Topics`. Called from `app.js` right after `seedY6FromY5` and from the parent-corner import handler.

**Scheduler** (`app/js/engine/scheduler.js`, already DIVERGED): `MAX_REVIEW_TOPICS = 3` stays for daily; new `MAX_REVIEW_TOPICS_ONLY = 5` used by `planSession` for `pickReviewTopics` and the keep-sharp fallback when there is no new topic. Header divergence note extended.

**UI.** `home.js:36` and `parent.js:70` count Y6 progress via `completedY6`. Parent topic table gets a second block "Year 5 review" (same row builder, level + next review). Import paragraph and toast no longer promise "a later update". Session review tag `🔁 shortTitle` and the explanation sheet work unchanged (same topic shape).

**Deploy plumbing.** `sw.js`: four new files in `ASSETS`, `CACHE_VERSION` → `lernapp-v16`; `build.js` `BUILD` → `lernapp-v16` (test enforces equality).

## Steps

1. Copy content: `y5a.js`, `y5b.js`, `y5c.js` (+ header, import fix). Grep the Y5 place-value generators for the "value of the digit" pattern fixed in Y6 on 2026-08-25; if present, apply `unambiguousDigitPositions` from `gen.js` the same way.
2. `content/y5.js` register; `content/index.js` (`topicById`, `strandOf`, `completedY6`, `y5Topics` export).
3. `y5-bridge.js`: `seedReviewPoolFromY5`, `strandMeans` on `y5Topics`, remove `Y5_TOPIC_STRAND`; wire into `app.js` and `parent.js` import handler.
4. `scheduler.js`: `MAX_REVIEW_TOPICS_ONLY`, use in `planSession`.
5. `home.js`, `parent.js` (counts, Y5 table, import text).
6. `sw.js` + `build.js` bump.
7. Tests (`app/tests/main.js`): sweep/determinism/rotation loops over `[...topics, ...y5Topics]`; new: no id collision; `topicById`/`strandOf` resolve Y5; seeding (32 entries, due today, Y6 count unchanged, idempotent, no-op without y5 slice, prepends); review-only plan spreads over 5 topics and draws Y5 ids; `ASSETS` contains the new files.
8. Docs: `CLAUDE.md` phase line (B4 ✓), `MEMORY.md` `[LEARN]`, session log, plan copy to `quality_reports/plans/`.
9. Commit on `main`, then push (Cloudflare Pages deploy — the fix has to reach the iPad).

## Verification

- `python3 tools/serve.py 8125` → `http://localhost:8125/app/tests/tests.html` shows **0 failed** (sweep now covers 45 topics).
- Manual at 768×1024 in the browser preview: generate a synthetic Y5 backup (Python, scratchpad; `app: 'powermath-trainer'`, all 32 ids with scores) → import in the parent corner → Today card on a review day → start session: `🔁` tags show Y5 topics (up to 5 distinct), answers check, explanation sheet opens for a Y5 item; map still 13 stations; home shows `n/13`; parent corner shows the Y5 block.
- After push: `lernapp-e3h.pages.dev` serves `lernapp-v16` (network tab), tests page green on the deployed URL.

## Out of scope

Y5 topics on the map or as "new" topics; Y5 diagnostic; a Y5 vocabulary glossary pass (`glossary.js` already carries the Y5 words); a smarter review-breadth rule than the 3/5 constants.
