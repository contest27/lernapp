# CLAUDE.md — Lernapp

**Identity: Builder** (see user-scope CLAUDE.md). Side project: the learning
hub for the author's son — successor to the PowerMath Trainer (Y5).
iPad-first PWA, GitHub Pages. One shell, two modules:

- **Maths** — curriculum-driven (Power Maths Year 6 now; Year 5 as a refresher
  pool via one-time backup import). Engine copied verbatim from the Y5 trainer.
- **English** — the Wordforge app, ported under the shell (phase B5).

## Stack decision (do not silently change)

**No-build vanilla JavaScript** — plain ES modules served statically. This
machine has no Node.js; there is no bundler, no `package.json`. Python 3.14
(+ Pillow) covers tooling. Do not introduce a build step or npm dependencies
without an explicit decision logged in MEMORY.md.

## Commands

| Task | Command |
|---|---|
| Serve locally | `python3 tools/serve.py 8125` (no-cache; SW skipped on localhost) |
| Tests | open `http://localhost:8125/tests/tests.html` — must show 0 failed |
| Icons | `python3 tools/make_icons.py` |
| Deploy | push to `main`; Cloudflare Pages serves `app/` + `functions/api/` → <https://lernapp-e3h.pages.dev> (GitHub Pages workflow removed 2026-08-19; the old build at contest27.github.io/lernapp is frozen) |

## Non-negotiables

1. **Bump `CACHE_VERSION` in `app/sw.js` on every deploy** that changes app
   files — installed PWAs serve stale assets until the SW version changes.
2. **New app files must be added to `ASSETS` in `app/sw.js`** or they will not
   be available offline.
3. **The Anthropic API key never enters the repo.** Typed by the parent on the
   device, stored in `shell.apiKey`, stripped by `exportJSON()` — and stripped
   again on Y5 import (`importY5Backup`).
4. **Content**: every generated question's answer is computed, never hardcoded
   from a separate path. After touching `app/js/maths/content/`, re-run the
   test page — the generator sweep validates every topic × tier.
5. **Curriculum fidelity**: topic structure follows the official Power Maths Y6
   yearly overview (15 units, books 6A/6B/6C —
   `quality_reports/reference/y6-yearly-overview.md`). Method vocabulary
   (exchange, bar model, column method) matches the classroom. Do not rename
   topics or invent units.
6. **Engine sync discipline**: `app/js/engine/` is copied verbatim from
   powermath-trainer (header comment names the commit). Engine fixes go to the
   Y5 repo FIRST, then get re-copied here — never fork silently.
7. **One streak.** `shell.streak` is the only streak; every curriculum slice's
   `streak` field is an alias restored by `hydrate()`. Never give a module its
   own streak object.
8. **German stays word-level.** The Y5 decision of 2026-08-16 carries over:
   no whole-lesson or whole-question German, only tapped-word glosses and the
   re-openable ENGLISH explanation.

## Canonical sources

- Curriculum grounding: `quality_reports/reference/y6-yearly-overview.md`
  (extracted 2026-08-16 from Pearson's PM-year-6-overview.pdf; re-extract with
  `pdftotext -layout` if ever in doubt).
- App code: `app/` is the single source of truth and the deployed artifact.
- Y5 handoff (content contract, silent constraints):
  `Powermath Trainer/quality_reports/handoffs/2026-08-10_y6-trainer-handoff.md`.

## Verification bar ("done" for changes)

Tests page green + a manual pass of the touched screen at 768×1024 in the
browser preview + `git commit`. For engine/scheduler changes, also re-run the
E2E driver flow (diagnostic → daily → review → parent corner) once session UI
exists.

## Phase plan (2026-08-16)

B0 scaffold ✓ → B1 Y6 spine ✓ → B2 content 6A ✓ (6B/6C open) → B3 diagnostic ✓
→ practice UI ✓ → map ✓ → parent corner ✓ → B5 Wordforge ✓ → B6 deploy ✓
(Cloudflare Pages 2026-08-19) →
open: 6B/6C, B4 Y5 topic modules, Gemini speech module.
Plan of record: `~/.claude/plans/inherited-crafting-lantern.md`.
