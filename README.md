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

## Status

**B0 scaffold** — shell, hub, parent corner, engine + tests green with a single
placeholder topic. The Y6 content (15 units, ~140 lessons → ~30 topics) is the
work in progress; see `quality_reports/reference/y6-yearly-overview.md` for the
curriculum spine and `CLAUDE.md` for the phase plan.
