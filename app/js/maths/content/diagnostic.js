// Day-1 warm-up check: 12 quick items across the four 6A strands.
// Results seed the per-topic mastery priors (engine/progress.js
// applyDiagnostic copies each strand's fraction-correct onto every topic of
// that strand), so every strand needs at least two items or its prior is
// noise. Grows with the books: 6B/6C strands get their items when their
// topics land.
//
// EVERY ITEM IS YEAR 5 REVISION, and must stay that way (2026-08-24). The
// check runs before he has been taught a single Year 6 lesson, so asking Year
// 6 material measures nothing but whether his class has got there yet. Three
// items were Year 6 and were replaced: seven-digit place value, BIDMAS
// (6A u03-order-ops) and reflection into the negative quadrants (6A
// u06-position). The strand a question belongs to is the Year 6 strand it
// seeds — the CONTENT is the Year 5 ground that strand builds on.
//
// It is also the second-best source of priors now. A device that imported a
// PowerMath-Trainer backup never sees this check at all: a year of Year 5
// scores beats twelve questions, and maths/y5-bridge.js uses them instead.

import { num, tf, mcFrom, fr, fmt, ri, pick } from './gen.js';
import { pvGrid, barModel, fracBar, coordGrid } from './vis.js';

export function diagnosticItems(rng) {
  const items = [];
  const add = (strand, q) => { q.strand = strand; items.push(q); };

  // --- place value (3)
  {
    // Six digits, not seven: numbers to 1,000,000 are Year 5 (u02-pv1m);
    // 10,000,000 is the first Year 6 lesson he has not had yet.
    const n = ri(rng, 120000, 890000);
    const s = String(n);
    let pos = ri(rng, 0, 3);
    while (s[pos] === '0') pos = (pos + 1) % 4;
    const digit = Number(s[pos]);
    const value = digit * 10 ** (5 - pos);
    add('place', num(`What is the value of the digit ${digit} in ${fmt(n)}?`, value, { tier: 1, svg: pvGrid(n) }));
  }
  {
    const n = ri(rng, 130000, 970000);
    add('place', num(`Round ${fmt(n)} to the nearest 10,000.`, Math.round(n / 10000) * 10000, { tier: 1 }));
  }
  {
    const start = -ri(rng, 2, 8), rise = ri(rng, 5, 14);
    add('place', num(`The temperature is ${start} °C and rises by ${rise} degrees. What is it now?`, start + rise, { tier: 1 }));
  }

  // --- four operations (4)
  {
    const a = ri(rng, 12000, 48000), b = ri(rng, 5000, 24000);
    add('fourops', num(`Work out ${fmt(a + b)} − ${fmt(b)}.`, a, { tier: 2 }));
  }
  {
    const a = ri(rng, 130, 480), b = ri(rng, 12, 24);
    add('fourops', num(`Work out ${fmt(a)} × ${b}.`, a * b, { tier: 2 }));
  }
  {
    const b = pick(rng, [12, 15, 18, 24]), q = ri(rng, 14, 60);
    add('fourops', num(`Work out ${fmt(q * b)} ÷ ${b}.`, q, { tier: 2 }));
  }
  {
    // Factors, not order of operations. BIDMAS is Year 6 (6A u03-order-ops)
    // and was the clearest case of asking for something not yet taught;
    // factors and factor pairs are Year 5 (u05-factors).
    const f = pick(rng, [3, 4, 6, 8]);
    const n = f * pick(rng, [4, 5, 6, 7]);
    const wrong = [f + 1, f - 1, f + 3].filter((x) => x > 1 && n % x !== 0);
    while (wrong.length < 3) {
      const cand = ri(rng, 2, 19);
      if (n % cand !== 0 && !wrong.includes(cand)) wrong.push(cand);
    }
    add('fourops', mcFrom(rng, `Which of these numbers is a factor of ${n}?`,
      String(f), wrong.slice(0, 3).map(String), { tier: 2 }));
  }

  // --- fractions (3)
  {
    const k = ri(rng, 2, 4);
    const base = pick(rng, [[1, 2], [2, 3], [3, 4], [2, 5]]);
    const [n, d] = base;
    add('fractions', mcFrom(rng, `Which fraction is ${fr(n * k, d * k)} in its simplest form?`,
      fr(n, d), [fr(n + 1, d + 1), fr(n, d + 1), fr(d, n)], { tier: 2, svg: fracBar(n * k, d * k) }));
  }
  {
    const d = pick(rng, [5, 8, 10]), n = ri(rng, 1, d - 1);
    const amount = d * ri(rng, 4, 12);
    add('fractions', num(`What is ${fr(n, d)} of ${amount}?`, (amount / d) * n, {
      tier: 2, svg: barModel(amount, Array(d).fill(amount / d)),
    }));
  }
  {
    const d = pick(rng, [6, 8, 10, 12]);
    const a = ri(rng, 1, d - 2), b = ri(rng, a + 1, d - 1);
    add('fractions', tf(`True or false: ${fr(a, d)} &gt; ${fr(b, d)}`, a > b, { tier: 1 }));
  }

  // --- position and direction (2)
  {
    const x = ri(rng, 1, 5), y = ri(rng, 1, 5);
    add('position', mcFrom(rng, 'What are the coordinates of the marked point?',
      `(${x}, ${y})`, [`(${y}, ${x})`, `(${x + 1}, ${y})`, `(${x}, ${y + 1})`], {
        tier: 1, svg: coordGrid(6, [[x, y, 'P']]),
      }));
  }
  {
    // Translation in the first quadrant, not reflection into the negative
    // ones. Four quadrants are Year 6 (6A u06-position); translating a point
    // right and up is Year 5 (u15-position).
    const x = ri(rng, 1, 5), y = ri(rng, 1, 5);
    const dx = ri(rng, 1, 4);
    // Different steps, or the swapped-deltas distractor would BE the answer and
    // mcFrom would drop it, leaving a three-option question.
    let dy = ri(rng, 1, 4);
    if (dy === dx) dy = dx === 4 ? 1 : dx + 1;
    add('position', mcFrom(rng, `Point A is at (${x}, ${y}). It moves ${dx} right and ${dy} up. Where does it land?`,
      `(${x + dx}, ${y + dy})`,
      // Swapped the two steps, forgot to go right, forgot to go up. All three
      // stay in the first quadrant: negative coordinates are Year 6.
      [`(${x + dy}, ${y + dx})`, `(${x}, ${y + dy})`, `(${x + dx}, ${y})`], { tier: 2 }));
  }

  return items;
}
