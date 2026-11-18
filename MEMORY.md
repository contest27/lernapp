# MEMORY.md — Lernapp

Project-scope memory. Cross-project lessons go to `~/.claude/MEMORY.md`.

## Decisions

- **2026-08-16 — Hub architecture.** One repo/PWA with a shell
  (`shell/storage.js`: namespaces `shell` / `maths.<curriculum>` / `english`)
  instead of a separate Y6 repo (the Y5 handoff's §2 recommendation) — decided
  by Sebastian when Wordforge was still undeployed and could move in for free.
  Each curriculum slice IS an engine state; the verbatim Y5 engine runs on it
  unchanged. The one shared streak lives in `shell.streak` and is ALIASED into
  every slice by `hydrate()` after each load/parse — JSON duplicates it
  harmlessly, the shell copy wins on rehydration.
- **2026-08-16 — Engine is a verbatim copy of powermath-trainer @ 85699c4.**
  `engine/storage.js` still contains the Y5 `defaultState`/`load`/`save`
  (unused here — the shell has its own); kept verbatim anyway so diffs against
  upstream stay clean. Date helpers and `capState` patterns are what we
  actually use from it.
- **2026-08-16 — Y5 refresher = backup import** (`importY5Backup`): the whole
  Y5 engine state becomes `maths.y5`; `dueReviewTopics()` makes its topics due
  with zero new logic (handoff §6 way 1). The Y5 streak and targetDate are
  deliberately NOT imported (one shell streak; the summer deadline is over).
  Requires the Y5 topic modules as review material — arrives with B4.
- **2026-08-16 — Icons emerald, not sky-blue.** Both apps sit on the same iPad
  home screen during the handover; the child must tell them apart at a glance.
- **2026-08-25 — Y5 mastery replaces the Y6 warm-up check.** `maths/y5-bridge.js`
  maps Y5 topic → Y5 strand → Y6 strand and seeds every Y6 prior with
  `clamp(50 + 0.6·(y5mean − 50), 30, 85)` from the COMPLETED Y5 topics only —
  reading all mastery entries would feed Y5's own diagnostic guesses back in as
  if they were evidence. Guarded by evidence on the y6 slice rather than by a
  flag, so it is idempotent and runs on every launch (the import on the device
  had already happened). The check survives for a device with no import, but
  every item is now Y5 revision: it runs before any Y6 lesson, so Y6 questions
  measure nothing but whether his class has got there.
- **2026-08-25 — AI availability is a SERVER question, not a device-key one.**
  `functions/api/health.js` (booleans only) plus `aiReady()`/`sttReady()` in
  `qa/endpoint.js` replace six `!!shell.apiKey` gates that switched the tutor,
  both dictionaries, the forge and the answer grader off on the only host where
  they work. An unanswered probe counts as available on purpose. Both no-server
  cases answer HTML, so 404 = no server and 200/redirect = signed out (expired
  Cloudflare Access session) — that distinction is what lets the parent corner
  say "sign in again in Safari".
- **2026-08-25 — Speech goes through Gemini, not Apple.** `english/ui/stt.js`
  (ported from Facharzttrainer) records, converts to 16 kHz mono WAV and asks
  `/api/stt` for a VERBATIM transcript; device dictation is only the fallback,
  because it silently corrects his English — the one thing worth hearing. A
  refused microphone no longer disables speech permanently; only the parent
  corner switch does.

- **2026-08-27 — A deployed content fix cannot reach a session that already
  exists.** `buildSession()` generates every question up front and stores it
  FINISHED — prompt text and rendered SVG — in `slice.activeSession`, i.e. in
  localStorage; `startOrResume()` picks it up again all day. Two faulty
  questions therefore survived the fix, the deploy and two full restarts. Every
  session now carries the `BUILD` stamp from `shell/build.js`, and `app.js`
  discards a session from an older build at launch. `BUILD` and `CACHE_VERSION`
  in `sw.js` must be the same string — the test compares them against each
  other, so bumping one without the other fails the suite.

- **2026-09-07 — B4: the Year 5 topics are review material now.** Reported
  from the device: sessions were almost all column +/−. The review pool held
  only completed Y6 topics (three after two weeks) while a new topic arrives
  every six days, and a review-only day filled 11 items over ≤ 3 due topics.
  `content/y5{a,b,c}.js` are verbatim copies of the Y5 trainer's modules
  (@ aa8bd0b); `content/y5.js` is their register and owns the Y5→Y6 strand
  map. `seedReviewPoolFromY5` (y5-bridge) puts all 32 into `completed` +
  `mastery` of the y6 slice once, due today; review-only days now spread over
  5 topics (`MAX_REVIEW_TOPICS_ONLY`). `topics`/`topicOrder` stay Y6-only.
  - **[LEARN:state] `slice.completed` is no longer "journey progress".** It
    carries the 32 Y5 review ids too, so every count must go through
    `completedY6(slice)` (content/index.js). The Today card read the raw
    length and showed "35/13" — caught in the manual pass, not by the tests,
    which had no display assertion for it.
  - **[LEARN:tests] The tier-3 rotation test is a scenario()-deck test.** Most
    Y5 tier 3s are procedural templates with no deck, where two identical
    shells in a row are a coin flip; the test stays Y6-only on purpose.

- **2026-11-10 — B8: Year 6 follows the class, lesson by lesson.** The class
  does about three practice-book pages a day (roughly one Power Maths lesson),
  the books stay at school, and Severin does not always finish. So the app asks
  at a check-in which lesson the class did, and the day's round prepares the
  NEXT one: intro, 4 questions of its type [1,1,2,2], 2 review; 2 questions of
  the last lesson first when he reported it unfinished (Sebastian's choices).
  `content/lessons.js` is the 140-lesson register (titles verbatim from the
  overview, `topicId` from the spine ranges; 6B/6C `null` until content);
  `maths/school.js` holds the logic; previews are lesson-precise for U4–U6
  (`y6a-lessons-*.js`), topic-level fallback elsewhere. A topic joins the review
  pool when the class passes its LAST lesson (`markTaught`, no stars). For Y6
  the tracker replaces the 6-day cadence, the English/maths alternation and the
  "not had this in class yet" button (all still there for other curricula).
  One log entry per day: a same-day check-in is a correction and restores the
  position stored in the entry it replaces (`before`).
  English is dormant: `shell.englishOn = false` hides the hub, the Home tab and
  the English parent section; `homeName()` (shell/core.js) picks the launch screen.
  - **[LEARN:state] `hydrate()` never filled new SHELL keys on an existing
    install.** `Object.assign(base, s)` replaced `base.shell` with the stored
    shell before the shell merge ran, so the "defaults" it merged into were the
    stored object itself. Harmless until the first shell key added after
    release (`englishOn`); caught by the hydrate test. Shell defaults are their
    own object now.
  - **[LEARN:tooling] Headless Edge can stop dumping without failing** — exit 0,
    empty DOM, no stderr, for any page (2026-11-10). `run_tests.py` now tries
    every Edge/Chrome in turn when a dump comes back empty; Chrome works here.
  - **[LEARN:ui] `go()` scrolls to the top**, so a list that re-renders on tap
    loses the row he just tapped. The check-in's lesson rows open in place.

- **2026-11-10 — B9: four-quadrant grid for Unit 6, book 6B Unit 7 Decimals.**
  In the order the class needs them. `coordGrid4` (vis.js) draws axes through
  the origin; U6 L2's class task (read and plot in four quadrants) and the
  negative-coordinate shapes of L3/L4 now have a picture, and the answer is
  never drawn. Unit 7 = `u07-dec-place` (L1–5) + `u07-dec-ops` (L6–9) in
  `content/y6b.js`, warm-ups for all nine lessons in `y6b-lessons-u7.js`
  (task type per lesson inferred from its title, as in B8). PREREQ
  `u07-dec-place ← u01-pv10m` is live. Units 8–12 wait for Sebastian's go.
  - **[LEARN:content] A decimal answer is an integer over a power of ten.**
    `dv(int, places)` and `shift()` in y6b.js; never float arithmetic on a
    decimal (`0.3 * 4` = 1.2000000000000002, and the checker compares with
    zero tolerance). A test sweeps every Y6 generator and warm-up for float
    noise in anything the child reads.
  - **[LEARN:ui] The pad gives answers away.** session.js shows "." only for a
    non-integer answer and "−" only for a negative one, so a pad without them
    says "whole" or "positive". `dnum()` (y6b.js) sets `allowDecimal` on every
    Unit 7 number question, `cnum()` sets `allowMinus` on coordinate questions.
    `num()` in gen.js drops unknown options, so the flag is set on the question
    after it is built.
  - **[LEARN:tests] SVG `getBBox()` height is the font's line box, not the
    glyphs** (1.33 em in Segoe UI): two "−1" tick labels by the origin
    "overlapped" with three units of white between them. The grid collision
    test takes widths from getBBox and heights from the baseline (0.75 em up),
    and runs in the app's font stack and in monospace.
  - **[LEARN:tooling] A second preview server needs its own port in its
    argument.** `serve.py` takes the port from argv, so when another session
    holds 8125, preview_start's reassigned port never reaches it (on Windows
    both processes bound 8125 and the pane loaded nothing). A temporary
    launch entry on 8127 with `autoPort: false` worked. The patch-script ASCII
    rule below bit again: an em dash in a heredoc was read as cp1252 and the
    match failed (harmless, the patch asserts before writing).
  - **[LEARN:tooling] The gate was flaky: `serve.py`'s listen backlog was 5.**
    The test page imports about sixty modules at once; with the backlog full,
    Windows refuses connections and the page reports "Failed to fetch
    dynamically imported module" (0 passed, 1 failed). Measured: 2 of 8 runs
    at 7f67cf5, 5 of 10 with Unit 7's two extra modules, 0 of 12 after
    `request_queue_size = 128`. A "MODULE IMPORTS" failure that the browser
    console cannot reproduce is this, not a syntax error.

- **2026-11-10 — B10: book 6B Unit 8 Percentages** (Sebastian: "Yes, start
  Unit 8"; Units 9–12 still wait for his go). `u08-pct-of` (L1–5) and
  `u08-pct-equiv` (L6–9) in `y6b.js`, warm-ups in `y6b-lessons-u8.js`. The
  spine had the pair the other way round; lesson order decides. PREREQS
  `u08-pct-equiv ← u04-simplify` (reserved) and the new
  `u08-pct-of ← u05-frac-amount`. Per-cent answers go through `pnum()`
  (unit `%`) and read "35%" in the feedback; amounts through `pctOf()`, which
  stays exact for the same reason as `dv()`.

- **2026-11-17 — B11: unit test practice.** The class writes a test at the
  end of a unit (first one: Unit 4, the week of 17 Nov). Severin (Today card,
  "📝 Test coming up?") or a parent enters the unit and the day
  (`school.test = { unit, day, set }`). Until then the Today card leads with a
  round of one question per lesson of the unit at tier 2, shuffled (Unit 4:
  eleven), and tomorrow's warm-up becomes a second button. On the test day the
  practice comes before the check-in, which then offers "We had the Unit N test
  today" (`note: 'test'`, clears the test). Sebastian's choices: Unit 4 only,
  the NORMAL practice mechanics (hint, second try), a test day that is
  entered. The summary lists every lesson as ✓ or "practise more" and offers
  the tricky ones (2 per lesson, tiers 1–2); the history entry carries `unit`
  and `weak`, which the parent corner prints.
  - **2026-11-18 — the test-week card is a choice, not a default.** Sebastian:
    it must not slide him into the test. Two equal buttons ("Practise for
    the Unit N test" / "Get ready for tomorrow"), nothing starts until he
    taps one. Both rounds share the daily slot, so the one he leaves
    half-done is parked in `slice.parkedSession` and resumes later
    (`takeRound` in ui/session.js); before this, switching rebuilt it.
  - **[LEARN:content] A mixed number must not wrap.** "= □" and its fraction
    broke across two lines at iPad width. `mixed()` (y6a-frac.js) now wraps
    whole and fraction in `<span class="mixed">` (CSS nowrap); the text inside
    is unchanged, so option comparisons and stripped answers are too.

## Learnings

- (Inherited, still binding here: `Object.assign` on nested state drops new
  keys — hydrate merges shell and each slice one level deep. `Element.append(null)`
  renders "null". Dev server must send no-store. SW updates land on the SECOND
  real iOS launch.)
- **[LEARN:tooling] `node --check` cannot be trusted here** — it exited 0 on a
  file with a plain syntax error (an unescaped `'` inside a string). The
  reliable check for a changed module is a dynamic `import()` of it in the
  browser (tests page or preview console); that is what actually caught it.
- **[LEARN:tooling] Never let a patch script write in place.**
  `pathlib.write_text` truncates the file first and then fails on an encoding
  error: one lone-surrogate emoji emptied `talk.js` completely (`git checkout`
  recovered it). Write to `.tmp`, then `os.replace`, and keep patch scripts
  ASCII — `—`-style escapes rather than literal characters.
