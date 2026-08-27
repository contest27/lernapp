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
