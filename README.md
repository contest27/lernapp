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

<https://contest27.github.io/lernapp/> — installable as a PWA (iPad: Share →
Add to Home Screen). An update lands on the **second** real launch of an
installed app.

## Status

Book 6A is complete and practisable: 13 topics, diagnostic, guided lessons
with tap-a-word German glosses, practice ramp, spaced review, treasure map,
parent corner. Books 6B/6C and the English module are the work in progress;
see `quality_reports/reference/y6-topic-spine.md` for the curriculum spine and
`CLAUDE.md` for the phase plan.
