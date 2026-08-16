# Y6 topic spine (B1) — from the Pearson yearly overview

**Basis:** `y6-yearly-overview.md` (15 units, 140 lessons). Granularity like Y5:
one topic ≈ 3–6 lessons. Strand keys are chosen so equal strands stay
**contiguous inside each book array** (map regions derive from runs).
Pearson's two geometry strands get two keys (`position`, `shapes`) so they form
two clean islands instead of one torn one.

## Strand keys

`place` · `fourops` · `fractions` · `position` (6A) — `decimals` ·
`percentages` · `algebra` · `measure` · `ratio` (6B) — `shapes` · `problem` ·
`stats` (6C)

## Book 6A — 13 topics (final, implemented in B2)

| id | strand | unit | scope (lessons) |
|---|---|---|---|
| u01-pv10m | place | 1 | numbers to 10,000,000: value, compose, compare, number line (L1–5) |
| u01-round-neg | place | 1 | rounding any number; negative numbers in context (L6–7) |
| u02-addsub | fourops | 2 | written +/− up to 5 digits, multi-step problems (L1–2) |
| u02-multiply | fourops | 2 | 4-digit × 1-digit and × 2-digit, long multiplication (L3–4) |
| u02-divide | fourops | 2 | up to 4-digit ÷ 2-digit, short/long division, remainder readings (L5–10) |
| u03-factors | fourops | 3 | common factors, common multiples, primes to 100 (L1–3) |
| u03-order-ops | fourops | 3 | squares & cubes, order of operations, brackets, mental strategies (L4–9) |
| u04-simplify | fractions | 4 | simplifying, equivalent fractions, fractions on a number line (L1–3) |
| u04-compare | fractions | 4 | comparing and ordering fractions (L4–5) |
| u04-addsub-frac | fractions | 4 | add & subtract fractions incl. mixed numbers + problems (L6–11) |
| u05-mult-div-frac | fractions | 5 | fraction × whole, fraction × fraction, fraction ÷ whole (L1–7) |
| u05-frac-amount | fractions | 5 | fractions of amounts + problem solving (L8–9) |
| u06-position | position | 6 | all four quadrants, translations, reflections (L1–4) |

## Book 6B — ~12 topics (provisional, finalised in its own phase)

u07-dec-place, u07-dec-ops (decimals) · u08-pct-equiv, u08-pct-of
(percentages) · u09-alg-rules, u09-alg-solve, u09-alg-pairs (algebra) ·
u10-imperial (measure) · u11-area-perim, u11-area-tri, u11-volume (measure) ·
u12-ratio, u12-scale (ratio)

## Book 6C — ~6 topics (provisional)

u13-angles, u13-circles-nets, u13-shapes-reason (shapes) · u14-solve-1,
u14-solve-2 (problem) · u15-graphs, u15-averages (stats)

Total ≈ 31–32 topics — same order of magnitude as Y5's 32.

## PREREQS (cross-strand edges)

Live now (6A): `u05-frac-amount ← u02-divide` (fraction of an amount = divide,
then multiply).

Reserved for later books (add when the target topic lands):
`u07-dec-place ← u01-pv10m` · `u08-pct-equiv ← u04-simplify` ·
`u12-ratio ← u05-frac-amount` · `u15-averages ← u02-divide`.

Inside a strand the book order holds automatically (scheduler invariant).
