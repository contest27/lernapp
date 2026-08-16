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

## Learnings

- (Inherited, still binding here: `Object.assign` on nested state drops new
  keys — hydrate merges shell and each slice one level deep. `Element.append(null)`
  renders "null". Dev server must send no-store. SW updates land on the SECOND
  real iOS launch.)
