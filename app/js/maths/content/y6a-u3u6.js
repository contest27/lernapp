// Book 6A — Unit 3 (factors, multiples, primes; squares, cubes, order of
// operations) and Unit 6 (position and direction: coordinates in all four
// quadrants). Composed into y6a.js in book order; topic scope and lesson
// mapping are quality_reports/reference/y6-topic-spine.md and
// quality_reports/reference/y6-yearly-overview.md.

import { num, tf, mc, mcFrom, scenario, ri, pick, shuffle } from './gen.js';
import { coordGrid, rectGrid } from './vis.js';

const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];

// ---------------------------------------------------------------- helpers

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}
function factorsOf(n) {
  const fs = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) fs.push(i);
  return fs;
}
function smallestFactor(n) {
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return i;
  return n;
}
// Two coprime integers in [2, max], distinct — used to build clean HCF stories.
function coprimePair(r, max) {
  let p = ri(r, 2, max), q = ri(r, 2, max), guard = 0;
  while ((gcd(p, q) !== 1 || p === q) && guard++ < 50) { p = ri(r, 2, max); q = ri(r, 2, max); }
  return [p, q];
}
// count random numbers in [2, n-1] that do NOT divide n exactly.
function nonFactorDistractors(r, n, exclude, count) {
  const seen = new Set(exclude);
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const c = ri(r, 2, n - 1);
    if (n % c !== 0 && !seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

const PRIMES_TO_100 = [];
for (let i = 2; i <= 97; i++) if (isPrime(i)) PRIMES_TO_100.push(i);
const COMPOSITES_TO_99 = [];
for (let i = 4; i <= 99; i++) if (!isPrime(i)) COMPOSITES_TO_99.push(i);

// ---------------------------------------------------------------- Unit 3

export const topics6aU3 = [
  {
    id: 'u03-factors', unit: 3, book: '6A', strand: 'fourops', emoji: '🧱',
    title: 'Factors, multiples and primes', shortTitle: 'Factors & primes',
    explanation: {
      segments: [
        {
          text: 'A <b>factor</b> of a number divides into it exactly, with nothing left over. The factors of 12 are 1, 2, 3, 4, 6 and 12. When two numbers share a factor it is a <b>common factor</b> — the biggest one they share is the <b>highest common factor</b> (HCF).',
          alt: 'A factor is a number that fits exactly into another number, with no remainder. If two numbers share the same factor, it is common to both — and the largest shared factor is the highest common factor.',
        },
        {
          text: 'A <b>multiple</b> of a number is what you get by multiplying it by a whole number — the numbers in its times table. When two numbers share a multiple, it is a <b>common multiple</b> — the smallest one they share is the <b>lowest common multiple</b> (LCM).',
          alt: 'A multiple is any number in that number\'s times table. A number that appears in both times tables is a common multiple, and the smallest one is the lowest common multiple.',
        },
        {
          text: 'A <b>prime number</b> has exactly two factors: 1 and itself. 7 is prime because only 1 and 7 divide into it. 8 is NOT prime because 2 and 4 also fit. Careful — 1 has only ONE factor, so it does not count as prime.',
          alt: 'A prime number can only be divided exactly by 1 and by itself, nothing else. If any other number divides in exactly, it is not prime — and 1 is never called prime.',
        },
        {
          text: 'To test if a number is prime, try dividing it by 2, 3, 5 and 7. If none of them fit exactly, it is prime — this works for every number up to 100.',
          alt: 'To check for a prime, try the small numbers 2, 3, 5 and 7 as dividers. If none of them fit exactly, the number is prime.',
        },
      ],
    },
    example: {
      steps: [
        'Find the highest common factor of 18 and 24.',
        'Factors of 18: 1, 2, 3, 6, 9, 18.',
        'Factors of 24: 1, 2, 3, 4, 6, 8, 12, 24.',
        'Shared factors: 1, 2, 3, 6 — the highest is <b>6</b>.',
      ],
    },
    faqs: [
      { q: 'Is 1 a common factor of every pair of numbers?', a: '1 divides exactly into every whole number, so it is always a common factor — that is why it is never the interesting answer unless nothing bigger is shared.' },
      { q: "Why isn't 1 a prime number?", a: 'A prime number needs exactly two factors. 1 only has one factor (itself), so it does not qualify.' },
      { q: "What's the quickest way to find a common multiple?", a: 'List the times table of each number and look for the first value that appears in both lists — that is the lowest common multiple.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const n = ri(rng, 12, 60);
          const proper = factorsOf(n).filter((f) => f > 1 && f < n);
          if (proper.length === 0) return this.gen(rng, tier);
          const correct = pick(rng, proper);
          const distractors = nonFactorDistractors(rng, n, [correct], 3);
          return mcFrom(rng, `Which of these numbers is a <b>factor</b> of ${n}?`, correct, distractors, {
            tier, hint: `Which of these numbers divides exactly into ${n}?`,
            explain: `${n} ÷ ${correct} = ${n / correct} exactly, so ${correct} is a factor of ${n}.`,
          });
        }
        const n = ri(rng, 2, 100);
        return tf(`True or false: ${n} is a <b>prime</b> number.`, isPrime(n), {
          tier, hint: 'Try dividing by 2, 3, 5 and 7. Does anything fit exactly?',
          explain: isPrime(n) ? `Nothing but 1 and ${n} divides into ${n} exactly, so it is prime.` : `${n} ÷ ${smallestFactor(n)} = ${n / smallestFactor(n)} exactly, so ${n} is not prime.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const g = ri(rng, 2, 9);
          const [p, q] = coprimePair(rng, 8);
          const a = g * p, b = g * q;
          return num(`What is the highest common factor (HCF) of ${a} and ${b}?`, g, {
            tier, hint: `List the factors of ${a} and of ${b}, then find the biggest one they share.`,
            explain: `Factors of ${a}: ${factorsOf(a).join(', ')}. Factors of ${b}: ${factorsOf(b).join(', ')}. The highest common factor is ${g}.`,
          });
        }
        if (kind === 2) {
          const a = ri(rng, 2, 9);
          let b = ri(rng, 2, 9);
          if (a === b) b = a === 9 ? a - 1 : a + 1;
          const l = lcm(a, b);
          return num(`What is the lowest common multiple (LCM) of ${a} and ${b}?`, l, {
            tier, hint: `List multiples of ${a} and of ${b} until you find one they share.`,
            explain: `Multiples of ${a}: ${a}, ${2 * a}, ${3 * a}… Multiples of ${b}: ${b}, ${2 * b}, ${3 * b}… The smallest shared one is ${l}.`,
          });
        }
        // Neither number may divide the other: if a | b, EVERY multiple of b is
        // divisible by a and the distractor loops below could never terminate.
        const a = pick(rng, [3, 4, 5, 6]);
        const b = pick(rng, [4, 6, 8, 9].filter((x) => x !== a && x % a !== 0 && a % x !== 0));
        const correct = lcm(a, b);
        let da = a * 2;
        while (da % b === 0) da += a;
        let db = b * 2;
        while (db % a === 0) db += b;
        let dc = correct + 1;
        while ((dc % a === 0 && dc % b === 0) || dc === da || dc === db) dc += 1;
        return mcFrom(rng, `Which of these numbers is a <b>common multiple</b> of ${a} and ${b}?`, correct, [da, db, dc], {
          tier, hint: `List multiples of ${a} and of ${b} and look for one they share.`,
          explain: `${correct} is a multiple of both ${a} (${correct} ÷ ${a} = ${correct / a}) and ${b} (${correct} ÷ ${b} = ${correct / b}).`,
        });
      }
      const stories = [
        (r) => {
          const g = ri(r, 2, 9);
          const [p, q] = coprimePair(r, 8);
          const a = g * p, b = g * q;
          return num(`Two ribbons are ${a} cm and ${b} cm long. They are both cut into the longest possible equal pieces, with none left over. How long is each piece?`, g, {
            tier: 3, hint: 'Find the highest common factor of the two lengths.',
            explain: `The highest common factor of ${a} and ${b} is ${g}, so each piece is ${g} cm long.`,
          });
        },
        (r) => {
          const a = pick(r, [4, 5, 6, 8, 9, 10, 12]);
          const b = pick(r, [4, 5, 6, 8, 9, 10, 12].filter((x) => x !== a));
          const l = lcm(a, b);
          return num(`Bus A leaves the station every ${a} minutes. Bus B leaves every ${b} minutes. They both leave together at 9:00. After how many minutes will they next leave together?`, l, {
            tier: 3, hint: 'Find the lowest common multiple of the two gaps.',
            explain: `The lowest common multiple of ${a} and ${b} is ${l} minutes.`,
          });
        },
        (r) => {
          const n = pick(r, COMPOSITES_TO_99.filter((c) => c >= 12 && c <= 60));
          const proper = factorsOf(n).filter((f) => f > 1 && f < n);
          const rowsCorrect = pick(r, proper);
          const distractors = nonFactorDistractors(r, n, [rowsCorrect], 3);
          return mcFrom(r, `A gym class has ${n} children. They stand in equal rows with more than one child in each row. Which of these could be the number of children in each row?`, rowsCorrect, distractors, {
            tier: 3, hint: `Which of these numbers divides exactly into ${n}?`,
            explain: `${n} ÷ ${rowsCorrect} = ${n / rowsCorrect} exactly, so ${rowsCorrect} is a factor of ${n}.`,
          });
        },
        (r) => {
          const correct = pick(r, PRIMES_TO_100);
          const composites = shuffle(r, COMPOSITES_TO_99).slice(0, 3);
          const options = shuffle(r, [String(correct), ...composites.map(String)]);
          return mc('Which of these numbers is <b>prime</b>?', options, options.indexOf(String(correct)), {
            tier: 3, hint: 'A prime number has exactly two factors: 1 and itself.',
            explain: `${correct} is prime. ${composites.map((c) => `${c} = ${smallestFactor(c)} × ${c / smallestFactor(c)}`).join('; ')}.`,
          });
        },
      ];
      return scenario(rng, 'u03-factors-t3', stories);
    },
  },

  {
    id: 'u03-order-ops', unit: 3, book: '6A', strand: 'fourops', emoji: '🎯',
    title: 'Squares, cubes and order of operations', shortTitle: 'Order of operations',
    explanation: {
      segments: [
        {
          text: "A <b>square number</b> is a number multiplied by itself: 4² (say '4 squared') means 4 × 4 = 16. That many tiles arrange into an actual square shape.",
          alt: 'Squaring a number means multiplying it by itself. That many counters arrange into a square, with the number itself as the side length.',
          svg: rectGrid(4, 4, { unit: 'units' }),
        },
        {
          text: "A <b>cube number</b> is a number multiplied by itself three times: 4³ (say '4 cubed') means 4 × 4 × 4 = 64. That many small cubes fill a 4-by-4-by-4 cube shape.",
          alt: 'Cubing a number means multiplying it by itself, then by itself again. That many little cubes would fill a cube-shaped box with that side length.',
        },
        {
          text: 'When a calculation mixes operations, there is a strict order: multiplication and division always happen BEFORE addition and subtraction, whichever order they are written in. 5 + 2 × 6 means work out 2 × 6 first (=12), then 5 + 12 = 17 — NOT 7 × 6.',
          alt: 'Mixed calculations follow a fixed order: always do the times/divide parts first, then the add/subtract parts, even though addition might be written first.',
        },
        {
          text: '<b>Brackets</b> override the order — whatever is inside them is worked out FIRST. (5 + 2) × 6 = 7 × 6 = 42, very different from 5 + 2 × 6 = 17. Brackets let you choose your own order.',
          alt: 'Brackets mark a part of the calculation to work out first, before anything else — even before multiplication.',
        },
        {
          text: 'Once you know one fact, you can use it to work out related facts quickly. If 6 × 43 = 258, then 60 × 43 must be ten times bigger: 2,580. Spotting how numbers relate saves starting from scratch.',
          alt: 'A known fact is a shortcut to a new fact. If a number in the calculation is ten times bigger, the answer changes the same way.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 8 + 3 × 6, using the correct order of operations.',
        'Multiplication comes first: 3 × 6 = 18.',
        'Then add: 8 + 18 = <b>26</b>.',
      ],
    },
    faqs: [
      { q: 'Why does multiplication come before addition?', a: 'It is a rule everyone agrees on, so a calculation always means the same thing however it is written.' },
      { q: 'What do brackets actually do?', a: 'They mark out a part of the calculation to work out first, before anything else — even before multiplication.' },
      { q: 'Do I need to know every square and cube by heart?', a: 'They come up often enough that it helps, but you can always work them out by multiplying — there is no need to just memorise blindly.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const n = ri(rng, 2, 12);
          return num(`What is ${n}² (${n} squared)?`, n * n, {
            tier, hint: `${n}² means ${n} × ${n}.`,
            explain: `${n} × ${n} = ${n * n}.`,
          });
        }
        const n = ri(rng, 2, 6);
        return num(`What is ${n}³ (${n} cubed)?`, n ** 3, {
          tier, hint: `${n}³ means ${n} × ${n} × ${n}.`,
          explain: `${n} × ${n} × ${n} = ${n ** 3}.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const b = ri(rng, 2, 9), c = ri(rng, 2, 9);
          const op = pick(rng, ['+', '-']);
          const a = op === '+' ? ri(rng, 2, 30) : b * c + ri(rng, 1, 20);
          const val = op === '+' ? a + b * c : a - b * c;
          return num(`Work out ${a} ${op} ${b} × ${c}. Remember the order of operations.`, val, {
            tier, hint: 'Multiply first, then work out the rest.',
            explain: `${b} × ${c} = ${b * c}; ${a} ${op} ${b * c} = ${val}.`,
          });
        }
        if (kind === 2) {
          const c = ri(rng, 2, 9), q = ri(rng, 2, 9), b = c * q;
          const a = ri(rng, 2, 30);
          const val = a + q;
          return num(`Work out ${a} + ${b} ÷ ${c}. Remember the order of operations.`, val, {
            tier, hint: 'Divide first, then add.',
            explain: `${b} ÷ ${c} = ${q}; ${a} + ${q} = ${val}.`,
          });
        }
        const a = ri(rng, 2, 12), b = ri(rng, 2, 12), c = ri(rng, 2, 9);
        const val = (a + b) * c;
        return num(`Work out (${a} + ${b}) × ${c}.`, val, {
          tier, hint: 'Brackets first: work out what is inside, then multiply.',
          explain: `${a} + ${b} = ${a + b}; ${a + b} × ${c} = ${val}.`,
        });
      }
      const stories = [
        (r) => {
          const a = ri(r, 2, 9), b = ri(r, 2, 9), c = ri(r, 2, 9);
          const forms = [
            { text: `${a} + ${b} × ${c}`, val: a + b * c },
            { text: `(${a} + ${b}) × ${c}`, val: (a + b) * c },
            { text: `${a} × (${b} + ${c})`, val: a * (b + c) },
            { text: `${a} × ${b} + ${c}`, val: a * b + c },
          ];
          const counts = new Map();
          forms.forEach((f) => counts.set(f.val, (counts.get(f.val) || 0) + 1));
          const uniqueForms = forms.filter((f) => counts.get(f.val) === 1);
          if (uniqueForms.length === 0) return num('Work out 3 + 2 × 4.', 11, { tier: 3, explain: '2 × 4 = 8; 3 + 8 = 11.' });
          const chosen = pick(r, uniqueForms);
          const options = shuffle(r, forms.map((f) => f.text));
          return mc(`Which expression equals ${chosen.val}?`, options, options.indexOf(chosen.text), {
            tier: 3, hint: 'Work out each expression carefully, following the order of operations.',
            explain: `${forms.map((f) => `${f.text} = ${f.val}`).join('; ')}. Only ${chosen.text} equals ${chosen.val}.`,
          });
        },
        (r) => {
          const a = ri(r, 2, 9), b = ri(r, 12, 89);
          const known = a * b;
          const scale = pick(r, [10, 100]);
          const target = a * scale;
          return num(`If ${a} × ${b} = ${known}, what is ${target} × ${b}?`, known * scale, {
            tier: 3, hint: `${target} is ${a} × ${scale}, so multiply the known answer by ${scale} too.`,
            explain: `${a} × ${b} = ${known}; ${target} × ${b} = ${known} × ${scale} = ${known * scale}.`,
          });
        },
        (r) => {
          const name = pick(r, NAMES);
          const price = ri(r, 3, 9), qty = ri(r, 4, 12), fee = ri(r, 2, 15);
          return num(`${name} buys ${qty} notebooks at £${price} each, plus a £${fee} delivery fee. What is the total cost in pounds?`, price * qty + fee, {
            tier: 3, hint: 'Multiply first to find the cost of the notebooks, then add the fee.',
            explain: `${qty} × £${price} = £${price * qty}; + £${fee} = £${price * qty + fee}.`,
          });
        },
        (r) => {
          const base = pick(r, [10, 20, 30, 40, 50]);
          const b = ri(r, 4, 9);
          const offset = ri(r, 1, 4);
          const a = base - offset;
          return num(`Use a known fact to work this out: ${base} × ${b} = ${base * b}. What is ${a} × ${b}?`, a * b, {
            tier: 3, hint: `${a} is ${offset} less than ${base}, so take away ${offset} lots of ${b}.`,
            explain: `${base} × ${b} = ${base * b}; take away ${offset} × ${b} = ${offset * b}: ${base * b} − ${offset * b} = ${a * b}.`,
          });
        },
      ];
      return scenario(rng, 'u03-order-ops-t3', stories);
    },
  },
];

// ---------------------------------------------------------------- Unit 6

export const topics6aU6 = [
  {
    id: 'u06-position', unit: 6, book: '6A', strand: 'position', emoji: '🧭',
    title: 'Coordinates in all four quadrants', shortTitle: 'Coordinates',
    explanation: {
      segments: [
        {
          text: 'A <b>coordinate</b> pins down a point with two numbers in brackets: (x, y). The FIRST number is how far along (like going down a corridor), the SECOND is how far up (like climbing stairs). (3, 5) means 3 across, then 5 up.',
          alt: "A coordinate is an address made of two numbers: (along, up). Always read the first number as across and the second as up — x comes before y, and across comes before up.",
          svg: coordGrid(6, [[3, 5, 'P']]),
        },
        {
          text: 'Coordinates can also use <b>negative numbers</b>. The x-axis and y-axis together make FOUR quadrants. A point like (−2, 3) is 2 to the LEFT of the y-axis and 3 ABOVE the x-axis. Where the axes cross, (0, 0), is called the <b>origin</b>.',
          alt: 'Negative coordinates go left (for x) or down (for y) instead of right or up. The two axes cross at the origin, (0, 0), dividing the grid into four quadrants.',
        },
        {
          text: 'A <b>translation</b> slides a point across the grid without turning or flipping it. Moving right adds to the x-coordinate, moving left subtracts. Moving up adds to the y-coordinate, moving down subtracts. Translate (2, 1) by "3 right and 2 up" and you land on (5, 3).',
          alt: 'Translating means sliding, not turning. Right/left changes only the first number; up/down changes only the second number. Add for right or up, subtract for left or down.',
        },
        {
          text: 'A <b>reflection</b> flips a point over a mirror line. Reflecting in the x-axis flips the SIGN of the y-coordinate: (4, 3) becomes (4, −3). Reflecting in the y-axis flips the sign of the x-coordinate: (4, 3) becomes (−4, 3).',
          alt: 'Reflecting is like a mirror. Flipping in the x-axis changes only the up/down number\'s sign; flipping in the y-axis changes only the left/right number\'s sign — the other number always stays the same.',
        },
      ],
    },
    example: {
      steps: [
        'Point A is at (3, 5). Reflect it in the x-axis. What are the new coordinates?',
        'Reflecting in the x-axis flips the sign of the y-coordinate only.',
        '(3, 5) → <b>(3, −5)</b>.',
      ],
    },
    faqs: [
      { q: 'Which number comes first, along or up?', a: "Along (x) always comes first, then up (y) — remember it as 'along the corridor, up the stairs'." },
      { q: 'What is different about reflecting compared to translating?', a: 'Translating slides a shape to a new spot, facing the same way. Reflecting flips it over a mirror line, so it faces the opposite way.' },
      { q: 'How do I know which quadrant a point is in?', a: 'Check the signs: (+, +) top right, (−, +) top left, (−, −) bottom left, (+, −) bottom right.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const size = pick(rng, [6, 8, 10]);
        const x = ri(rng, 1, size - 1), y = ri(rng, 1, size - 1);
        const correct = `(${x}, ${y})`;
        const cands = new Set();
        const add = (a, b) => { if (a !== x || b !== y) cands.add(`(${a}, ${b})`); };
        add(y, x);
        add(Math.min(size, x + 1), y);
        add(x, Math.min(size, y + 1));
        add(Math.max(0, x - 1), y);
        add(x, Math.max(0, y - 1));
        return mcFrom(rng, 'What are the coordinates of the marked point?', correct, [...cands], {
          tier, svg: coordGrid(size, [[x, y, 'P']]),
          hint: 'Along first (x), then up (y).',
          explain: `The point is ${x} across and ${y} up: ${correct}.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const x = ri(rng, 1, 8) * pick(rng, [1, -1]);
          const y = ri(rng, 1, 8) * pick(rng, [1, -1]);
          const correct = `(${x}, ${y})`;
          const distractors = [`(${-x}, ${y})`, `(${x}, ${-y})`, `(${-x}, ${-y})`];
          return mcFrom(rng, `A point is ${Math.abs(x)} ${x < 0 ? 'left of' : 'right of'} the y-axis and ${Math.abs(y)} ${y < 0 ? 'below' : 'above'} the x-axis. What are its coordinates?`, correct, distractors, {
            tier, hint: 'Right/above are positive; left/below are negative.',
            explain: `x is ${x < 0 ? 'negative (left)' : 'positive (right)'}, y is ${y < 0 ? 'negative (below)' : 'positive (above)'}: ${correct}.`,
          });
        }
        const px = ri(rng, -6, 6), py = ri(rng, -6, 6);
        const dxAmt = ri(rng, 1, 6), dyAmt = ri(rng, 1, 6);
        const dxDir = pick(rng, ['right', 'left']);
        const dyDir = pick(rng, ['up', 'down']);
        const nx = px + (dxDir === 'right' ? dxAmt : -dxAmt);
        const ny = py + (dyDir === 'up' ? dyAmt : -dyAmt);
        const correct = `(${nx}, ${ny})`;
        const distractors = [
          `(${px - (dxDir === 'right' ? dxAmt : -dxAmt)}, ${ny})`,
          `(${nx}, ${py - (dyDir === 'up' ? dyAmt : -dyAmt)})`,
          `(${px}, ${py})`,
        ];
        return mcFrom(rng, `Point P is at (${px}, ${py}). Translate it ${dxAmt} ${dxDir} and ${dyAmt} ${dyDir}. What are the new coordinates?`, correct, distractors, {
          tier, hint: `${dxDir === 'right' ? 'Right' : 'Left'} changes the x-coordinate; ${dyDir === 'up' ? 'up' : 'down'} changes the y-coordinate.`,
          explain: `x: ${px} ${dxDir === 'right' ? '+' : '−'} ${dxAmt} = ${nx}; y: ${py} ${dyDir === 'up' ? '+' : '−'} ${dyAmt} = ${ny}. New point: ${correct}.`,
        });
      }
      const stories = [
        (r) => {
          const axis = pick(r, ['x-axis', 'y-axis']);
          const x = ri(r, 1, 8) * pick(r, [1, -1]);
          const y = ri(r, 1, 8) * pick(r, [1, -1]);
          const rx = axis === 'x-axis' ? x : -x;
          const ry = axis === 'x-axis' ? -y : y;
          const correct = `(${rx}, ${ry})`;
          const distractors = [`(${x}, ${y})`, `(${-x}, ${-y})`, `(${y}, ${x})`];
          return mcFrom(r, `Point Q is at (${x}, ${y}). What are its coordinates after a reflection in the ${axis}?`, correct, distractors, {
            tier: 3, hint: axis === 'x-axis' ? 'Reflecting in the x-axis flips the sign of the y-coordinate.' : 'Reflecting in the y-axis flips the sign of the x-coordinate.',
            explain: `Reflecting in the ${axis}: (${x}, ${y}) → ${correct}.`,
          });
        },
        (r) => {
          const x0 = ri(r, -4, 4), y0 = ri(r, -4, 4);
          const w = ri(r, 2, 7), h = ri(r, 2, 7);
          const corners = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
          const missingIdx = ri(r, 0, 3);
          const given = corners.filter((_, i) => i !== missingIdx).map((p) => `(${p[0]}, ${p[1]})`).join(', ');
          const correct = corners[missingIdx];
          const correctStr = `(${correct[0]}, ${correct[1]})`;
          const distractors = [
            `(${correct[0] + 1}, ${correct[1]})`,
            `(${correct[0]}, ${correct[1] + 1})`,
            `(${correct[1]}, ${correct[0]})`,
          ];
          return mcFrom(r, `Three corners of a rectangle are ${given}. What are the coordinates of the fourth corner?`, correctStr, distractors, {
            tier: 3, hint: 'Opposite sides of a rectangle line up: one corner shares its x, another shares its y.',
            explain: `The fourth corner completes the rectangle at ${correctStr}.`,
          });
        },
        (r) => {
          const name = pick(r, NAMES);
          const px = ri(r, -5, 5), py = ri(r, -5, 5);
          const dxAmt = ri(r, 1, 7), dyAmt = ri(r, 1, 7);
          const dxDir = pick(r, ['right', 'left']);
          const dyDir = pick(r, ['up', 'down']);
          const nx = px + (dxDir === 'right' ? dxAmt : -dxAmt);
          const ny = py + (dyDir === 'up' ? dyAmt : -dyAmt);
          const correct = `(${nx}, ${ny})`;
          const distractors = [
            `(${px - (dxDir === 'right' ? dxAmt : -dxAmt)}, ${py - (dyDir === 'up' ? dyAmt : -dyAmt)})`,
            `(${nx}, ${py})`,
            `(${px}, ${ny})`,
          ];
          return mcFrom(r, `${name} marks a point at (${px}, ${py}) on a map, then moves ${dxAmt} squares ${dxDir} and ${dyAmt} squares ${dyDir}. Where does ${name} end up?`, correct, distractors, {
            tier: 3, hint: 'Move the x-coordinate for right/left, the y-coordinate for up/down.',
            explain: `x: ${px} ${dxDir === 'right' ? '+' : '−'} ${dxAmt} = ${nx}; y: ${py} ${dyDir === 'up' ? '+' : '−'} ${dyAmt} = ${ny}.`,
          });
        },
        (r) => {
          let y = ri(r, -8, 8);
          if (y === 0) y = 3;
          const xs = shuffle(r, [1, -2, 3, -4, 2, -3, 4, -1]).slice(0, 3);
          const ys = [ri(r, -8, 8), ri(r, -8, 8), 0];
          const offPoints = xs.map((x, i) => [x, ys[i]]);
          const pts = shuffle(r, [[0, y], ...offPoints]);
          const options = pts.map((p) => `(${p[0]}, ${p[1]})`);
          const correctStr = `(0, ${y})`;
          return mc('Which of these points lies on the <b>y-axis</b>?', options, options.indexOf(correctStr), {
            tier: 3, hint: 'On the y-axis, the x-coordinate is always 0.',
            explain: `${correctStr} is the only point with x = 0, so it is the only one on the y-axis.`,
          });
        },
      ];
      return scenario(rng, 'u06-position-t3', stories);
    },
  },
];
