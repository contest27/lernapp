// Day-1 warm-up check: 12 quick items across the four 6A strands.
// Results seed the per-topic mastery priors (engine/progress.js
// applyDiagnostic copies each strand's fraction-correct onto every topic of
// that strand), so every strand needs at least two items or its prior is
// noise. Grows with the books: 6B/6C strands get their items when their
// topics land.

import { num, tf, mcFrom, fr, fmt, ri, pick } from './gen.js';
import { pvGrid, barModel, fracBar, coordGrid } from './vis.js';

export function diagnosticItems(rng) {
  const items = [];
  const add = (strand, q) => { q.strand = strand; items.push(q); };

  // --- place value (3)
  {
    const n = ri(rng, 1200000, 8900000);
    const s = String(n);
    let pos = ri(rng, 0, 3);
    while (s[pos] === '0') pos = (pos + 1) % 4;
    const digit = Number(s[pos]);
    const value = digit * 10 ** (6 - pos);
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
    const a = ri(rng, 3, 9), b = ri(rng, 2, 9), c = ri(rng, 2, 9);
    add('fourops', num(`Work out ${a} + ${b} × ${c}.`, a + b * c, { tier: 2 }));
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
    const x = ri(rng, 1, 8), y = ri(rng, 1, 8);
    add('position', mcFrom(rng, `Point A is at (${x}, ${y}). Reflect it in the x-axis. Where does it land?`,
      `(${x}, ${-y})`, [`(${-x}, ${y})`, `(${-x}, ${-y})`, `(${y}, ${x})`], { tier: 2 }));
  }

  return items;
}
