# Lernapp

One learning app for one child: **Year 6 maths** (Power Maths structure) and
**English** (Wordforge), under a single shell — one icon on the iPad, one
streak, one parent corner, one API key.

Successor to [powermath-trainer](https://github.com/contest27/powermath-trainer)
(Year 5, frozen after its final v16 release). The maths engine — mastery EWMA,
Leitner review scheduling, adaptive topic interleaving, answer checking — is
copied verbatim from there; Year 5 itself returns as a review curriculum via a
one-time backup import.

## Stack

No-build vanilla JS (ES modules, static hosting), Python for tooling, browser
test runner. No Node, no bundler, no dependencies.

## Develop

```bash
python3 tools/serve.py 8125
```

Then open `http://localhost:8125/` (app) and
`http://localhost:8125/tests/tests.html` (tests — must show 0 failed).

## Live

- **<https://lernapp-e3h.pages.dev>** — Cloudflare Pages. The one to install:
  `/api/chat` and `/api/stt` keep the API keys on the server, so nothing has
  to be typed on the device.
- <https://contest27.github.io/lernapp/> — the old GitHub Pages build, frozen
  (its deploy workflow was removed 2026-08-19). No server there, so the tutor
  falls back to a key entered in the parent corner (see `app/js/qa/endpoint.js`).

Installable as a PWA (iPad: Share → Add to Home Screen). An update lands on the
**second** real launch of an installed app. The two builds keep separate
progress — export a backup before switching.

## Status

**Since 2026-11-10 Year 6 follows the class.** At a check-in the child says
which Power Maths lesson the class did (the likely one is shown with a sample
question, so the task type can be recognised even when the title is forgotten).
The day's ten minutes then prepare the NEXT lesson: a short intro, four
questions of its type and two review questions. The parent corner shows every
check-in and whether the pages were finished. Lesson-precise warm-ups exist from
Unit 4 up to the last unit with content; the earlier lessons use their topic;
lessons after that unit are tracked, and their day is a review round. The
English module is hidden (switch in the parent corner).

Everything up to the last unit with content is practisable: its topics, guided
lessons with tap-a-word German glosses, spaced review (Year 5 topics included),
treasure map and parent corner. How far content reaches, and what is open, is
in `quality_reports/reference/y6-topic-spine.md` (curriculum spine) and
`CLAUDE.md` (phase plan).
