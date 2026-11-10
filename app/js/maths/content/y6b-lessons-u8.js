// Lesson-precise warm-ups for Unit 8 — Percentages (book 6B), lessons 1–9 (phase B10).
// Contract: previewOf() in lessons.js. Each entry has an intro (one idea, in the
// explanation-segment shape), a worked example, and gen(rng, tier) for tiers 1–2
// of exactly that lesson's task type. The practice book is not available, so
// each lesson's task type is inferred from its title in the Pearson overview.
//
// Rules kept here (CLAUDE.md non-negotiables 4, 5, 8; the header of y6b.js):
//  - Every amount is an integer and every percentage of it is built with
//    pctOf() (an integer over 100), never by float arithmetic on decimals.
//    Sale prices and "the rest" are dv(N × (100 − p), 2). Every answer is
//    computed from the drawn values; amounts are drawn so that the answer is
//    exact with at most 2 decimal places.
//  - Every number question goes through dnum() — pnum() when the answer is a
//    percentage — so the pad always offers "." (whole-number answers included).
//    Money answers carry unit 'pounds'.
//  - Displayed amounts go through dec(), gbp() (£24, £3.60) or pc() (35%).
//    Multiple-choice values are shown with one of these canonical formatters,
//    so two options equal in value are equal as strings and mcFrom drops one.
//    Fraction options go through mcRat, which drops value-equal fractions.
//  - Distractors are misconceptions: 35% read as 3% + 5%, 30% read as ÷ 3,
//    1% used for 10%, divided instead of multiplied when finding the whole,
//    did only step 1 of a sale price, took p pounds off instead of p%, read
//    3/5 as 35%, 0.4 as 4% and 0.04 as 40%, 0.5 thought smaller than 45%.
//  - Only the passed rng is used, and no scenario() decks: one seed, one prompt.
//    q.tier is set on every question kind.
//  - No pronouns for the named children: NAMES mixes girls and boys.

import { tf, mc, mcFrom, frac, order, fr, ri, pick, shuffle, money } from './gen.js';
import { hundredSquare, barModel, fracBar } from './vis.js';
import { gcd, simplify } from './y6a-frac.js';
import { dv, placesOf, dec, dnum, pctOf, pnum, NAMES } from './y6b.js';

// ------------------------------------------------------------------ helpers

const pc = (p) => `${dec(p)}%`;                                   // 35 → '35%'
const gbp = (v) => (Number.isInteger(v) ? `£${dec(v)}` : money(v)); // 24 → '£24', 3.6 → '£3.60'
const withUnit = (u) => (v) => `${dec(v)} ${u}`;
const rep = (n, s) => Array(n).fill(s);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const plural = (n, one, many) => (n === 1 ? one : many);
const SIGNS = ['&lt;', '&gt;', '='];

// Draw values with make() until ok() holds. make() only uses the rng it closes
// over, so this is deterministic. The fallback satisfies ok() by construction.
function draw(make, ok, fallback) {
  for (let i = 0; i < 60; i++) {
    const v = make();
    if (ok(v)) return v;
  }
  return fallback;
}

// An integer in [lo, hi] that does not end in 0.
function noZero(rng, lo, hi) {
  return draw(() => ri(rng, lo, hi), (v) => v % 10 !== 0, lo % 10 ? lo : lo + 1);
}

// A numerator in [1, d − 1] with no common factor with d.
function coprime(rng, d) {
  const ok = [];
  for (let n = 1; n < d; n++) if (gcd(n, d) === 1) ok.push(n);
  return pick(rng, ok);
}

// Two different names.
function two(rng) {
  const a = pick(rng, NAMES);
  return [a, pick(rng, NAMES.filter((x) => x !== a))];
}

// MC over numbers, each shown with `show` (dec, gbp or pc). show is canonical, so
// two options equal in value collide as strings and mcFrom drops one. Values that
// are not positive, or have more decimal places than `places`, are not offered.
function mcVal(rng, prompt, answer, distractors, show, opts, places = 3) {
  const ds = distractors.filter((v) => Number.isFinite(v) && v > 0 && v !== answer && placesOf(v) <= places);
  return mcFrom(rng, prompt, show(answer), ds.map(show), opts);
}

// A fraction option [label, n, d].
const R = (n, d) => [fr(n, dec(d)), n, d];

// MC over fractions, each [label, n, d]. A distractor EQUAL IN VALUE to the answer
// or to an earlier distractor is dropped, so exactly one option is right.
function mcRat(rng, prompt, correct, distractors, opts) {
  const same = (a, b) => a[1] * b[2] === b[1] * a[2];
  const keep = [];
  for (const x of distractors) {
    if (keep.length === 3) break;
    if (!(x[2] > 0) || same(x, correct) || keep.some((k) => k[0] === x[0] || same(k, x))) continue;
    keep.push(x);
  }
  return mcFrom(rng, prompt, correct[0], keep.map((k) => k[0]), opts);
}

// A bar model: the whole on top, equal parts below with their labels. SVG text
// takes no HTML, so labels are plain ('25%', '12', '?').
function bar(top, labels) {
  return barModel(labels.length, labels.map(() => 1), { partLabels: labels, wholeLabel: top });
}
const quarterBar = (p, top) => bar(top, p === 50 ? rep(2, '50%') : rep(4, '25%'));
const tenBar = (top) => bar(top, rep(10, '10%'));

// ---- finding a percentage of an amount (lessons 1–4, 9)

// Percentages built from 50%, 25%, 10%, 5% and 1% (lesson 3), biggest part first.
const COMBOS = {
  5: [5], 15: [10, 5], 35: [25, 10], 60: [50, 10], 55: [50, 5], 11: [10, 1], 12: [10, 1, 1],
  26: [25, 1], 45: [25, 10, 10], 65: [50, 10, 5], 85: [50, 25, 10], 51: [50, 1], 21: [10, 10, 1],
  30: [25, 5], 40: [25, 10, 5], 70: [50, 10, 10], 80: [50, 25, 5],
};
const comboStr = (parts) => parts.map(pc).join(' + ');
// N must be a multiple of this for every part of p% of N to be a whole number.
const stepFor = (p) => (COMBOS[p].includes(1) ? 100 : 20);
// Wrong combinations offered in "Which of these makes p%?" — their sums are checked.
const ALTS = [[50, 10], [25, 10], [10, 5], [50, 5], [25, 5], [10, 1], [25, 1], [50, 1], [10, 10], [50, 25],
  [25, 10, 10], [10, 5, 1], [50, 10, 5], [25, 10, 5], [10, 10, 1], [10, 1, 1], [50, 25, 10], [50, 10, 10],
  [25, 5, 1], [50, 5, 1], [25, 25, 10]];

// One part of p% of N: "25% of 80 = 80 ÷ 4 = 20."
function partLine(q, N, show, has10) {
  const W = show(N), v = show(pctOf(N, 0, q));
  if (q === 50) return `50% of ${W} = ${W} ÷ 2 = ${v}.`;
  if (q === 25) return `25% of ${W} = ${W} ÷ 4 = ${v}.`;
  if (q === 10) return `10% of ${W} = ${W} ÷ 10 = ${v}.`;
  if (q === 1) return `1% of ${W} = ${W} ÷ 100 = ${v}.`;
  const t = show(pctOf(N, 0, 10));
  return has10 ? `5% is half of 10%: ${t} ÷ 2 = ${v}.`
    : `10% of ${W} = ${W} ÷ 10 = ${t}, and 5% is half of that: ${t} ÷ 2 = ${v}.`;
}

// p% of N built from its parts (COMBOS), every part worked out, then added.
function buildWhy(p, N, show = dec) {
  const parts = COMBOS[p];
  if (!parts) return `${p}% of ${show(N)} = ${show(N)} × ${p} ÷ 100 = ${show(pctOf(N, 0, p))}.`;
  const has10 = parts.includes(10), seen = new Set(), lines = [];
  for (const q of parts) {
    if (seen.has(q)) continue;
    seen.add(q);
    lines.push(partLine(q, N, show, has10));
  }
  if (parts.length === 1) return lines.join(' ');
  const adds = parts.map((q) => show(pctOf(N, 0, q))).join(' + ');
  return `${p}% = ${comboStr(parts)}. ${lines.join(' ')} So ${p}% of ${show(N)} = ${adds} = ${show(pctOf(N, 0, p))}.`;
}

// How to find p% of N (an integer amount), in the classroom's steps.
function pctWhy(p, N, show = dec) {
  const v = (q) => show(pctOf(N, 0, q)), W = show(N);
  if (p === 50) return `50% is half: ${W} ÷ 2 = ${v(50)}.`;
  if (p === 25) return `25% is a quarter: ${W} ÷ 4 = ${v(25)}.`;
  if (p === 75) return `25% is a quarter: ${W} ÷ 4 = ${v(25)}. 75% is 3 lots of 25%: ${v(25)} × 3 = ${v(75)}.`;
  if (p === 10) return `10% is one tenth: ${W} ÷ 10 = ${v(10)}.`;
  if (p === 1) return `1% is one hundredth: ${W} ÷ 100 = ${v(1)}.`;
  if (p % 10 === 0 && p < 100) return `10% is one tenth: ${W} ÷ 10 = ${v(10)}. ${p}% is ${p / 10} lots of 10%: ${v(10)} × ${p / 10} = ${v(p)}.`;
  if (p < 10 && p !== 5) return `1% is one hundredth: ${W} ÷ 100 = ${v(1)}. ${p}% is ${p} lots of 1%: ${v(1)} × ${p} = ${v(p)}.`;
  return buildWhy(p, N, show);
}

// 50%, 25% and 75% as a half, a quarter and three quarters (lesson 1).
function quarterWhy(p, N, show = dec) {
  const W = show(N), q = show(pctOf(N, 0, 25));
  if (p === 50) return `50% = ${fr(1, 2)}, so find half: ${W} ÷ 2 = ${show(pctOf(N, 0, 50))}.`;
  if (p === 25) return `25% = ${fr(1, 4)}, so divide by 4: ${W} ÷ 4 = ${q}.`;
  return `75% = ${fr(3, 4)}. First find 25%: ${W} ÷ 4 = ${q}. 75% is 3 lots of 25%: ${q} × 3 = ${show(pctOf(N, 0, 75))}.`;
}
const QUARTER_HINT = {
  50: '50% is half. Divide by 2.',
  25: '25% is a quarter. Divide by 4.',
  75: '75% is three quarters. Find 25% first, then multiply by 3.',
};

// ---- finding the whole (lesson 5)

// p% of W = A with W in [lo, hi]: p% is j lots of g% (g = gcd(p, 100)), and
// 100% is `unit` lots of g%. W = unit × m, A = j × m: both whole numbers.
function wholeDraw(rng, p, lo, hi) {
  const g = gcd(p, 100), unit = 100 / g, j = p / g;
  const m = ri(rng, Math.max(1, Math.ceil(lo / unit)), Math.max(1, Math.floor(hi / unit)));
  return { p, g, unit, j, m, W: unit * m, A: j * m };
}

function wholeWhy({ p, g, unit, j, m, W, A }, show = dec) {
  if (j === 1) {
    return `${unit} lots of ${p}% make 100% (${p} × ${unit} = 100). So the whole is ${show(A)} × ${unit} = ${show(W)}. Check: ${p}% of ${show(W)} = ${show(W)} ÷ ${unit} = ${show(A)}.`;
  }
  return `${p}% is ${j} lots of ${g}%. So ${g}% is ${show(A)} ÷ ${j} = ${show(m)}. ${unit} lots of ${g}% make 100%: ${show(m)} × ${unit} = ${show(W)}.`;
}

const wholeHint = ({ p, g, unit, j, A }) => (j === 1
  ? `How many lots of ${p}% make 100%? Multiply ${dec(A)} by that number.`
  : `Find ${g}% first: ${dec(A)} ÷ ${j}. Then find 100%: ${unit} lots of ${g}%.`);

// A out of W as a percentage: simplify, then make the denominator 100.
function outOfWhy(A, W, p) {
  const [sn, sd] = simplify(A, W);
  let s = `${A} out of ${W} is ${fr(A, W)}.`;
  if (sd !== W) s += ` Simplify: ${fr(A, W)} = ${fr(sn, sd)}.`;
  if (sd !== 100) s += ` ${sd} × ${100 / sd} = 100, so ${fr(sn, sd)} = ${fr(p, 100)}.`;
  return `${s} That is ${p}%.`;
}

// ---- fractions, decimals and percentages (lessons 6–8)

// n/d with d a factor of 100, as a percentage.
function fpWhy(n, d) {
  const p = (n * 100) / d;
  if (d === 100) return `${fr(n, 100)} = ${p}%.`;
  return `${d} × ${100 / d} = 100, so multiply the numerator by ${100 / d} too: ${n} × ${100 / d} = ${p}. ${fr(n, d)} = ${fr(p, 100)} = ${p}%.`;
}

// 3/5 read as 35%: the digits of n and d side by side (null when that is 100 or more).
const concat = (n, d) => {
  const v = Number(`${n}${d}`);
  return v < 100 ? v : null;
};

// Fractions whose denominator is a factor of 100.
const FR_T1 = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]];
const FDP_FR = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10],
  [3, 20], [7, 20], [9, 20], [11, 20], [13, 20], [17, 20], [3, 25], [6, 25], [9, 25], [12, 25], [16, 25]];

// Items for comparing and ordering: { s: what the child sees, v: the value in
// per cent, why: the value written as a percentage }.
const pctItem = (v) => ({ s: `${v}%`, v, why: `${v}%` });
const decItem = (v) => ({ s: dec(dv(v, 2)), v, why: `${dec(dv(v, 2))} = ${v}%` });
const frItem = (n, d) => {
  const v = (100 * n) / d;
  return { s: fr(n, d), v, why: `${fr(n, d)} = ${fr(v, 100)} = ${v}%` };
};

// One fraction and other forms close to it, all different values in 1–99%.
// A decimal is a tenths decimal half the time (0.6 beside 0.55 and 58%).
function mixSet(rng, forms) {
  const [n, d] = pick(rng, FDP_FR), base = (100 * n) / d;
  const used = new Set([base]);
  const items = [];
  for (const f of forms) {
    if (f === 'f') { items.push(frItem(n, d)); continue; }
    let v = draw(() => (f === 'd' && rng() < 0.5
      ? 10 * Math.round(base / 10) + pick(rng, [-10, 0, 10])
      : base + pick(rng, [-1, 1]) * ri(rng, 1, 12)),
    (x) => x >= 1 && x <= 99 && !used.has(x), null);
    for (let k = 1; v === null; k++) {
      if (base + k <= 99 && !used.has(base + k)) v = base + k;
      else if (base - k >= 1 && !used.has(base - k)) v = base - k;
    }
    used.add(v);
    items.push(f === 'd' ? decItem(v) : pctItem(v));
  }
  return items;
}

// "Which is greater: A or B?" with "They are equal" as the third option.
function compareQ(rng, A, B, tier) {
  const right = A.v === B.v ? 'They are equal' : A.v > B.v ? A.s : B.s;
  const big = A.v > B.v ? A : B, small = A.v > B.v ? B : A;
  const verdict = A.v === B.v ? 'They are the same amount.' : `${big.v}% is more than ${small.v}%, so ${big.s} is greater.`;
  return mcFrom(rng, `Which is greater: ${A.s} or ${B.s}?`, right,
    [A.s, B.s, 'They are equal'].filter((o) => o !== right), {
      tier, hint: 'Write both as percentages first. Then compare.',
      explain: `As percentages: ${A.why} and ${B.why}. ${verdict}`,
    });
}

// ------------------------------------------------------------------ stories

// Things on sale: [name, lowest price, highest price] in whole pounds.
const SALE_ITEMS = [['coat', 30, 90], ['pair of trainers', 30, 80], ['video game', 20, 60],
  ['school bag', 15, 40], ['bike', 100, 250]];
const OFFER_ITEMS = [['football', 15, 40], ['board game', 20, 40], ['pair of trainers', 40, 80], ['scooter', 50, 100]];

// ------------------------------------------------------------------ the lessons

export const lessonPreviewsU8 = {

  'u08-l01': {
    intro: {
      text: `<b>50%</b> means 50 out of 100. That is <b>half</b>, so to find 50% of an amount, divide by 2. <b>25%</b> is a <b>quarter</b>: divide by 4. <b>75%</b> is three quarters: find 25%, then multiply by 3. 25% of 60 = 60 ÷ 4 = 15, so 75% of 60 = 15 × 3 = 45.`,
      alt: 'Draw a bar model. The whole bar is the amount, and it is 100%. Cut it into 4 equal parts: each part is 25%. Two parts are 50% and three parts are 75%. Find one part first: divide by 4.',
      svg: bar('100% = 60', rep(4, '25% = 15')),
    },
    example: {
      steps: [
        'Find 75% of 48.',
        '75% is three quarters, so find a quarter first: 25% of 48 = 48 ÷ 4 = 12.',
        '75% is 3 lots of 25%: 12 × 3 = 36.',
        'So 75% of 48 = <b>36</b>.',
      ],
    },
    gen(rng, tier) {
      const name = pick(rng, NAMES);
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        const p = shape === 1 ? 50 : shape === 2 ? 25 : pick(rng, [50, 25]);
        const d = p === 50 ? 2 : 4;
        if (shape <= 2) {
          const N = d * ri(rng, p === 50 ? 5 : 3, 25);
          return dnum(`What is ${p}% of ${N}?`, pctOf(N, 0, p), {
            tier, svg: quarterBar(p, String(N)), hint: QUARTER_HINT[p], explain: quarterWhy(p, N),
          });
        }
        if (shape === 3) {
          // Divided by the percentage, multiplied, took the percentage away, the wrong fraction.
          const N = d * ri(rng, 3, 25), right = N / d;
          const cands = [[`${N} ÷ ${p}`, N / p], [`${N} × ${d}`, N * d], [`${N} − ${p}`, N - p],
            [`${N} ÷ ${d === 2 ? 4 : 2}`, N / (d === 2 ? 4 : 2)]];
          return mcFrom(rng, `Which calculation finds ${p}% of ${N}?`, `${N} ÷ ${d}`,
            cands.filter(([, v]) => v !== right).map(([s]) => s), {
              tier, hint: `${p}% is ${p === 50 ? 'half' : 'a quarter'}.`,
              explain: `${p}% = ${fr(1, d)}, so divide by ${d}: ${N} ÷ ${d} = ${right}.`,
            });
        }
        const N = p === 50 ? 2 * ri(rng, 5, 30) : 4 * ri(rng, 3, 15), A = pctOf(N, 0, p);
        const story = ri(rng, 1, 3);
        const q = story === 1 ? `A box holds ${N} pencils. ${p}% of them are red. How many pencils are red?`
          : story === 2 ? `There are ${N} children in a club. ${p}% of them are girls. How many girls are there?`
            : `${name} has ${N} stickers. ${name} gives ${p}% of them to a friend. How many stickers does ${name} give away?`;
        return dnum(q, A, { tier, hint: QUARTER_HINT[p], explain: quarterWhy(p, N) });
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        const N = 4 * ri(rng, 5, 60);
        return dnum(`What is 75% of ${N}?`, pctOf(N, 0, 75), {
          tier, svg: quarterBar(75, String(N)), hint: QUARTER_HINT[75], explain: quarterWhy(75, N),
        });
      }
      if (shape === 2) {
        const p = pick(rng, [50, 25]);
        const N = p === 50 ? 2 * ri(rng, 51, 450) : 4 * ri(rng, 26, 225);
        return dnum(`What is ${p}% of ${dec(N)}?`, pctOf(N, 0, p), {
          tier, hint: QUARTER_HINT[p], explain: quarterWhy(p, N),
        });
      }
      if (shape === 3) {
        // Only found 25%; found 50%; took away 75 or 25.
        const N = 4 * ri(rng, 6, 50), q = pctOf(N, 0, 25);
        return mcVal(rng, `What is 75% of ${N}?`, pctOf(N, 0, 75), [q, pctOf(N, 0, 50), N - 75, N - 25], dec, {
          tier, hint: 'Find 25% first. Then multiply by 3.', explain: quarterWhy(75, N),
        });
      }
      const p = pick(rng, [25, 75, 50]), story = ri(rng, 1, 4);
      if (story === 1) {
        const N = 4 * ri(rng, 25, 80);
        return dnum(`A book has ${N} pages. ${name} has read ${p}% of it. How many pages has ${name} read?`, pctOf(N, 0, p), {
          tier, hint: QUARTER_HINT[p], explain: quarterWhy(p, N),
        });
      }
      if (story === 2) {
        const N = 4 * ri(rng, 10, 50);
        return dnum(`A farmer has ${N} sheep. ${p}% of them are in the top field. How many sheep are in the top field?`, pctOf(N, 0, p), {
          tier, hint: QUARTER_HINT[p], explain: quarterWhy(p, N),
        });
      }
      if (story === 3) {
        const N = 4 * ri(rng, 30, 75);
        return dnum(`${N} people watch the school play. ${p}% of them are parents. How many parents watch the play?`, pctOf(N, 0, p), {
          tier, hint: QUARTER_HINT[p], explain: quarterWhy(p, N),
        });
      }
      const N = 4 * ri(rng, 30, 75);
      return dnum(`A bike costs ${gbp(N)}. ${name} has saved ${p}% of the price. How much has ${name} saved?`, pctOf(N, 0, p), {
        tier, unit: 'pounds', hint: QUARTER_HINT[p], explain: quarterWhy(p, N, gbp),
      });
    },
  },

  'u08-l02': {
    intro: {
      text: '<b>10%</b> is one tenth, so to find 10% of an amount, <b>divide by 10</b>. <b>1%</b> is one hundredth: <b>divide by 100</b>. Then build other percentages from them. 30% is 3 lots of 10%: 10% of 250 = 25, so 30% of 250 = 25 × 3 = 75. 7% is 7 lots of 1%: 1% of 400 = 4, so 7% of 400 = 4 × 7 = 28.',
      alt: 'Draw a bar for the whole amount and cut it into 10 equal parts. Each part is 10%. Three parts are 30%. If you cut each 10% part into 10 smaller parts, each small part is 1%. So 7% is 7 small parts.',
      svg: bar('100% = 250', rep(10, '10%')),
    },
    example: {
      steps: [
        'Find 40% of 360.',
        '10% of 360 = 360 ÷ 10 = 36.',
        '40% is 4 lots of 10%: 36 × 4 = 144.',
        'So 40% of 360 = <b>144</b>.',
      ],
    },
    gen(rng, tier) {
      const tenWhy = (N, k, show = dec) => {
        const u = pctOf(N, 0, 10), a = pctOf(N, 0, 10 * k);
        const s = `10% is one tenth: ${show(N)} ÷ 10 = ${show(u)}.`;
        return k === 1 ? s : `${s} ${10 * k}% is ${k} lots of 10%: ${show(u)} × ${k} = ${show(a)}.`;
      };
      const oneWhy = (N, k, show = dec) => {
        const u = pctOf(N, 0, 1), a = pctOf(N, 0, k);
        const s = `1% is one hundredth: ${show(N)} ÷ 100 = ${show(u)}.`;
        return k === 1 ? s : `${s} ${k}% is ${k} lots of 1%: ${show(u)} × ${k} = ${show(a)}.`;
      };
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          const N = 10 * ri(rng, 2, 90);
          return dnum(`What is 10% of ${dec(N)}?`, pctOf(N, 0, 10), {
            tier, svg: tenBar(dec(N)), hint: '10% is one tenth. Divide by 10.', explain: tenWhy(N, 1),
          });
        }
        if (shape === 2) {
          const N = 100 * ri(rng, 2, 20);
          return dnum(`What is 1% of ${dec(N)}?`, pctOf(N, 0, 1), {
            tier, hint: '1% is one hundredth. Divide by 100.', explain: oneWhy(N, 1),
          });
        }
        if (shape === 3) {
          // The wrong divisor, multiplied, took the percentage away.
          const base = pick(rng, [10, 1]), N = base === 10 ? 10 * ri(rng, 3, 90) : 100 * ri(rng, 2, 9);
          const div = base === 10 ? 10 : 100, W = dec(N);
          const ds = base === 10 ? [`${W} ÷ 100`, `${W} × 10`, `${W} − 10`] : [`${W} ÷ 10`, `${W} × 100`, `${W} − 1`];
          return mcFrom(rng, `Which calculation finds ${base}% of ${W}?`, `${W} ÷ ${div}`, ds, {
            tier, hint: base === 10 ? '10% is one tenth.' : '1% is one hundredth.',
            explain: base === 10 ? tenWhy(N, 1) : oneWhy(N, 1),
          });
        }
        const base = pick(rng, [10, 1]), k = ri(rng, 2, 9);
        const N = base === 10 ? 10 * ri(rng, 2, 30) : 100 * ri(rng, 2, 9);
        const u = pctOf(N, 0, base), a = pctOf(N, 0, base * k);
        return dnum(`${base}% of ${dec(N)} is ${dec(u)}. Use this to find ${base * k}% of ${dec(N)}.`, a, {
          tier, hint: `${base * k}% is ${k} lots of ${base}%.`,
          explain: `${base * k}% is ${k} lots of ${base}%: ${dec(u)} × ${k} = ${dec(a)}.`,
        });
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        const k = ri(rng, 2, 9), N = 10 * ri(rng, 11, 99);
        return dnum(`What is ${10 * k}% of ${dec(N)}?`, pctOf(N, 0, 10 * k), {
          tier, svg: tenBar(dec(N)), hint: `Find 10% first: divide by 10. Then multiply by ${k}.`, explain: tenWhy(N, k),
        });
      }
      if (shape === 2) {
        const k = ri(rng, 2, 9), N = 100 * ri(rng, 2, 30);
        return dnum(`What is ${k}% of ${dec(N)}?`, pctOf(N, 0, k), {
          tier, hint: `Find 1% first: divide by 100. Then multiply by ${k}.`, explain: oneWhy(N, k),
        });
      }
      if (shape === 3) {
        // Only 10%; 30% read as ÷ 3; 1% used instead of 10%; took the percentage away.
        const k = pick(rng, [2, 3, 4, 6, 7, 8, 9]), N = 10 * ri(rng, 11, 99);
        return mcVal(rng, `What is ${10 * k}% of ${dec(N)}?`, pctOf(N, 0, 10 * k),
          [pctOf(N, 0, 10), N / k, pctOf(N, 0, k), N - 10 * k], dec, {
            tier, hint: `${10 * k}% is ${k} lots of 10%.`, explain: tenWhy(N, k),
          });
      }
      if (rng() < 0.5) {
        const k = ri(rng, 1, 4), N = noZero(rng, 11, 99);
        return dnum(`Work out ${10 * k}% of ${gbp(N)}.`, pctOf(N, 0, 10 * k), {
          tier, unit: 'pounds', hint: k === 1 ? 'Divide by 10.' : `Find 10% first: divide by 10. Then multiply by ${k}.`,
          explain: tenWhy(N, k, gbp),
        });
      }
      const k = ri(rng, 1, 3), N = draw(() => 10 * ri(rng, 11, 99), (v) => v % 100 !== 0, 470);
      return dnum(`What is ${k}% of ${dec(N)}?`, pctOf(N, 0, k), {
        tier, hint: k === 1 ? 'Divide by 100.' : `Find 1% first: divide by 100. Then multiply by ${k}.`,
        explain: oneWhy(N, k),
      });
    },
  },

  'u08-l03': {
    intro: {
      text: 'You can build a percentage from ones you know. <b>5%</b> is half of 10%. 15% = 10% + 5%. 35% = 25% + 10%. 60% = 50% + 10%. 12% = 10% + 1% + 1%. Find each part, then add the parts. 35% of 80: 25% = 20 and 10% = 8, so 35% = 20 + 8 = 28.',
      alt: 'Remember the quick ones: 50% (÷ 2), 25% (÷ 4), 10% (÷ 10), 5% (half of 10%) and 1% (÷ 100). Split the percentage into these parts. Find each part of the amount, and add them up.',
      svg: barModel(100, [25, 10, 65], { partLabels: ['25%', '10%', ''], wholeLabel: '100% = 80' }),
    },
    example: {
      steps: [
        'Find 15% of 60.',
        '15% = 10% + 5%. 10% of 60 = 60 ÷ 10 = 6.',
        '5% is half of 10%: 6 ÷ 2 = 3.',
        '15% of 60 = 6 + 3 = <b>9</b>.',
      ],
    },
    gen(rng, tier) {
      // A multiple of 20, or of 100 when 1% is a part: [lo, hi] counts of 20 or of 100.
      const amount = (p, by20, by100) => {
        const [lo, hi] = stepFor(p) === 100 ? by100 : by20;
        return stepFor(p) * ri(rng, lo, hi);
      };
      // Which combination makes p%: 35% read as 3% + 5%, and near sums.
      const whichMakes = (p) => {
        const t = Math.floor(p / 10), o = p % 10, cands = [];
        if (t && o) cands.push(`${t}% + ${o}%`);
        for (const alt of shuffle(rng, ALTS)) {
          if (sum(alt) !== p && Math.abs(sum(alt) - p) <= 25) cands.push(comboStr(alt));
        }
        cands.push(comboStr([p >= 50 ? 25 : 50, 5]));  // a sum far off, so there is always a distractor
        return mcFrom(rng, `Which of these makes ${p}%?`, comboStr(COMBOS[p]), cands, {
          tier, hint: `Add the numbers in each answer. Which one makes ${p}?`,
          explain: `${COMBOS[p].join(' + ')} = ${p}, so ${comboStr(COMBOS[p])} makes ${p}%.${t && o ? ` ${t}% + ${o}% is only ${t + o}%.` : ''}`,
        });
      };
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          const p = pick(rng, [5, 15, 35, 60, 55, 11]), N = amount(p, [1, 10], [1, 5]);
          return dnum(`What is ${p}% of ${dec(N)}?`, pctOf(N, 0, p), {
            tier, hint: p === 5 ? 'Find 10% first. Then halve it.' : `Split ${p}% into ${comboStr(COMBOS[p])}. Find each part and add.`,
            explain: buildWhy(p, N),
          });
        }
        if (shape === 2) return whichMakes(pick(rng, [15, 35, 60, 55, 11, 12]));
        const p = pick(rng, [5, 15, 60, 35, 11]), N = amount(p, [1, 10], [1, 5]);
        const facts = p === 5 ? [10] : [...new Set(COMBOS[p])];
        const said = facts.map((q) => `${q}% of ${dec(N)} is ${dec(pctOf(N, 0, q))}.`).join(' ');
        const A = pctOf(N, 0, p);
        return dnum(`${said} What is ${p}% of ${dec(N)}?`, A, {
          tier, hint: p === 5 ? '5% is half of 10%.' : `${p}% = ${comboStr(COMBOS[p])}.`,
          explain: p === 5 ? `5% is half of 10%: ${dec(pctOf(N, 0, 10))} ÷ 2 = ${dec(A)}.`
            : `${p}% = ${comboStr(COMBOS[p])}, so add: ${COMBOS[p].map((q) => dec(pctOf(N, 0, q))).join(' + ')} = ${dec(A)}.`,
        });
      }
      const T2 = [12, 45, 65, 85, 26, 51, 21, 15, 35, 40, 70, 80];
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        const p = pick(rng, T2), N = amount(p, [3, 40], [2, 9]);
        return dnum(`What is ${p}% of ${dec(N)}?`, pctOf(N, 0, p), {
          tier, hint: `Split ${p}% into parts you can find: 50%, 25%, 10%, 5% or 1%.`, explain: buildWhy(p, N),
        });
      }
      if (shape === 2) return whichMakes(pick(rng, T2));
      if (shape === 3) {
        const p = pick(rng, T2), N = amount(p, [5, 30], [2, 6]), story = ri(rng, 1, 3);
        const q = story === 1 ? `A school has ${dec(N)} pupils. ${p}% of them walk to school. How many pupils walk to school?`
          : story === 2 ? `A cinema has ${dec(N)} seats. ${p}% of the seats are empty. How many seats are empty?`
            : `${dec(N)} people run in a race. ${p}% of them are children. How many children run in the race?`;
        return dnum(q, pctOf(N, 0, p), {
          tier, hint: `Split ${p}% into parts you can find: 50%, 25%, 10%, 5% or 1%.`, explain: buildWhy(p, N),
        });
      }
      // 35% read as 3% + 5%, or a part left out.
      const p = pick(rng, T2), N = amount(p, [3, 40], [2, 9]), right = pctOf(N, 0, p);
      const t = Math.floor(p / 10), o = p % 10, wrongP = t && o ? t + o : COMBOS[p][0];
      const truth = rng() < 0.5, shown = truth ? right : pctOf(N, 0, wrongP);
      return tf(`True or false: ${p}% of ${dec(N)} = ${dec(shown)}`, truth, {
        tier, hint: `Split ${p}% into parts. Find each part and add.`,
        explain: truth ? `True. ${buildWhy(p, N)}` : `False. ${buildWhy(p, N)} ${dec(shown)} is only ${wrongP}% of ${dec(N)}.`,
      });
    },
  },

  'u08-l04': {
    intro: {
      text: 'We use percentages for money, weights, distances and people. The method is the same. 15% of £24: 10% = £2.40 and 5% = £1.20, so 15% = £3.60. In a <b>sale</b>, the <b>discount</b> is taken off the price. A £40 coat has 20% off: 20% of £40 = £8, so the <b>sale price</b> is £40 − £8 = £32.',
      alt: 'A sale price takes two steps. Step 1: find the percentage of the price. That is the money you save. Step 2: take it away from the price. Another way: 20% off means you still pay 80% of the price.',
      svg: barModel(100, [20, 80], { partLabels: ['20% off', '80%: you pay'], wholeLabel: '100% = £40' }),
    },
    example: {
      steps: [
        'Work out 15% of £18.',
        '10% of £18 = £18 ÷ 10 = £1.80.',
        '5% is half of 10%: £1.80 ÷ 2 = £0.90.',
        '15% = 10% + 5%: £1.80 + £0.90 = <b>£2.70</b>.',
      ],
    },
    gen(rng, tier) {
      const name = pick(rng, NAMES);
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          const p = pick(rng, [10, 50, 25]);
          const N = p === 10 ? noZero(rng, 11, 99) : p === 50 ? 2 * ri(rng, 5, 24) + 1 : draw(() => ri(rng, 5, 40), (v) => v % 4 !== 0, 6);
          return dnum(`What is ${p}% of ${gbp(N)}?`, pctOf(N, 0, p), {
            tier, unit: 'pounds', hint: p === 10 ? '10% is one tenth. Divide by 10.' : QUARTER_HINT[p], explain: pctWhy(p, N, gbp),
          });
        }
        if (shape === 2) {
          const story = ri(rng, 1, 3);
          if (story === 1) {
            const N = noZero(rng, 11, 49), km = withUnit('km');
            return dnum(`A path is ${N} km long. ${name} has walked 10% of it. How far has ${name} walked?`, pctOf(N, 0, 10), {
              tier, unit: 'km', hint: '10% is one tenth. Divide by 10.', explain: pctWhy(10, N, km),
            });
          }
          if (story === 2) {
            const N = pick(rng, [1, 2, 3, 5]), p = pick(rng, [25, 50]), kg = withUnit('kg');
            return dnum(`A bag of flour weighs ${N} kg. A baker uses ${p}% of the flour. How much flour does the baker use?`, pctOf(N, 0, p), {
              tier, unit: 'kg', hint: QUARTER_HINT[p], explain: pctWhy(p, N, kg),
            });
          }
          // Never exactly 1 litre as the answer: the feedback would read "1 litres".
          const p = pick(rng, [10, 25, 50]), N = pick(rng, p === 50 ? [1, 3] : [1, 2, 3]);
          const l = (v) => `${dec(v)} ${plural(v, 'litre', 'litres')}`;
          return dnum(`A jug holds ${l(N)} of juice. ${name} pours out ${p}% of it. How much juice does ${name} pour out?`, pctOf(N, 0, p), {
            tier, unit: 'litres', hint: p === 10 ? '10% is one tenth. Divide by 10.' : QUARTER_HINT[p], explain: pctWhy(p, N, l),
          });
        }
        if (shape === 3) {
          const p = pick(rng, [10, 25, 50]), N = 20 * ri(rng, 5, 25);
          return dnum(`${N} people watch a football match. ${p}% of them are children. How many children are there?`, pctOf(N, 0, p), {
            tier, hint: p === 10 ? '10% is one tenth. Divide by 10.' : QUARTER_HINT[p], explain: pctWhy(p, N),
          });
        }
        // 1% instead of 10%; took £10 away; multiplied by 10.
        const N = noZero(rng, 11, 99);
        return mcVal(rng, `What is 10% of ${gbp(N)}?`, pctOf(N, 0, 10), [pctOf(N, 0, 1), N - 10, 10 * N], gbp, {
          tier, hint: '10% is one tenth. Divide by 10.', explain: pctWhy(10, N, gbp),
        }, 2);
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        const p = pick(rng, [5, 15, 20, 30, 35, 45, 12]);
        const N = draw(() => ri(rng, 12, 96), (v) => (v * p) % 100 !== 0, 18);
        if (p >= 15 && rng() < 0.5) {
          const M = draw(() => ri(rng, 30, 96), (v) => (v * p) % 100 !== 0, 36);
          return dnum(`${name} has saved ${gbp(M)}. ${name} spends ${p}% of the money on a present. How much does the present cost?`, pctOf(M, 0, p), {
            tier, unit: 'pounds', hint: `Find ${p}% of ${gbp(M)}. Split ${p}% into parts you can find.`, explain: pctWhy(p, M, gbp),
          });
        }
        return dnum(`Work out ${p}% of ${gbp(N)}.`, pctOf(N, 0, p), {
          tier, unit: 'pounds', hint: `Split ${p}% into parts you can find: 10%, 5% or 1%.`, explain: pctWhy(p, N, gbp),
        });
      }
      if (shape <= 3) {
        const [item, lo, hi] = pick(rng, SALE_ITEMS), p = pick(rng, [10, 20, 25, 30, 50, 15]), N = ri(rng, lo, hi);
        const d = pctOf(N, 0, p), s = dv(N * (100 - p), 2);
        const prompt = `A ${item} costs ${gbp(N)}. In a sale there is ${p}% off. What is the sale price?`;
        const explain = `Step 1: find the discount. ${pctWhy(p, N, gbp)} Step 2: take it off the price: ${gbp(N)} − ${gbp(d)} = ${gbp(s)}. The sale price is ${gbp(s)}.`;
        const hint = `First find ${p}% of ${gbp(N)}. Then take it away from ${gbp(N)}.`;
        if (shape === 2) return dnum(prompt, s, { tier, unit: 'pounds', hint, explain });
        // Did only step 1; took £p off; added the discount on; took 10% off (1% for 10% off).
        const tenOff = dv(N * (100 - (p === 10 ? 1 : 10)), 2);
        return mcVal(rng, prompt, s, [d, N - p, dv(N * (100 + p), 2), tenOff], gbp, { tier, hint, explain }, 2);
      }
      const p = pick(rng, [5, 15, 20, 30, 35, 45, 60]), story = ri(rng, 1, 3);
      if (story === 1) {
        const N = ri(rng, 4, 20);
        return dnum(`${name} is going on a ${N} km walk. ${name} has walked ${p}% of it so far. How far has ${name} walked?`, pctOf(N, 0, p), {
          tier, unit: 'km', hint: `Find ${p}% of ${N} km.`, explain: pctWhy(p, N, withUnit('km')),
        });
      }
      if (story === 2) {
        const N = ri(rng, 2, 9);
        return dnum(`A bag of rice weighs ${N} kg. ${p}% of the rice is used for a party. How much rice is used?`, pctOf(N, 0, p), {
          tier, unit: 'kg', hint: `Find ${p}% of ${N} kg.`, explain: pctWhy(p, N, withUnit('kg')),
        });
      }
      const N = ri(rng, 40, 250);
      return dnum(`A tank holds ${N} litres of rain water. ${p}% of the water is used in the garden. How many litres are used?`, pctOf(N, 0, p), {
        tier, unit: 'litres', hint: `Find ${p}% of ${N} litres.`, explain: pctWhy(p, N, withUnit('litres')),
      });
    },
  },

  'u08-l05': {
    intro: {
      text: 'Sometimes you know a part and need the <b>whole</b>. If 25% of a number is 15, the whole is 4 lots of 25%, so it is 15 × 4 = 60. If 10% is 6, the whole is 6 × 10 = 60. You can also find the <b>percentage</b>: 20 out of 80 is a quarter, so 20 is 25% of 80. Draw a <b>bar model</b>: the whole bar is 100%.',
      alt: `Ask: how many of this part make 100%? 10% fits into 100% ten times, 20% five times, 25% four times and 50% two times. Multiply the part by that number. To find a percentage, write the part over the whole: 20 out of 80 = ${fr(20, 80)} = ${fr(1, 4)} = 25%.`,
      svg: bar('100% = ?', ['25% = 15', '25%', '25%', '25%']),
    },
    example: {
      steps: [
        '20% of a number is 9. What is the number?',
        '5 lots of 20% make 100%, because 20 × 5 = 100.',
        'So the number is 9 × 5 = 45.',
        'Check: 20% of 45 = 45 ÷ 5 = 9. The number is <b>45</b>.',
      ],
    },
    gen(rng, tier) {
      const name = pick(rng, NAMES);
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape <= 2) {
          const p = shape === 1 ? 10 : pick(rng, [50, 25]), k = 100 / p, A = shape === 1 ? ri(rng, 2, 30) : ri(rng, 3, 25);
          const w = { p, g: p, unit: k, j: 1, m: A, W: A * k, A };
          return dnum(`Find the missing number: ${p}% of □ = ${A}`, w.W, {
            tier, svg: bar('100% = ?', [String(A), ...rep(k - 1, '')]), hint: wholeHint(w), explain: wholeWhy(w),
          });
        }
        if (shape === 3) {
          const p = pick(rng, [50, 25, 10, 75]);
          const W = p === 10 ? 10 * ri(rng, 2, 10) : p === 50 ? 2 * ri(rng, 5, 30) : 4 * ri(rng, 3, 15), A = pctOf(W, 0, p);
          return pnum(`Find the missing number: □% of ${W} = ${A}`, p, {
            tier, hint: `What fraction of ${W} is ${A}? Then change the fraction into a percentage.`, explain: outOfWhy(A, W, p),
          });
        }
        // Divided instead of multiplied; multiplied by the percentage; added it.
        const p = pick(rng, [10, 50, 25]), k = 100 / p, A = ri(rng, 3, 20);
        const w = { p, g: p, unit: k, j: 1, m: A, W: A * k, A };
        return mcVal(rng, `${p}% of a number is ${A}. What is the number?`, w.W, [A / k, A * p, A + p, A * (k === 10 ? 100 : 10)], dec, {
          tier, hint: wholeHint(w), explain: wholeWhy(w),
        });
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        const p = pick(rng, [20, 5, 30, 40, 75, 60, 25]), w = wholeDraw(rng, p, 20, p === 5 ? 300 : 400);
        const svg = w.j === 1 && w.unit <= 10 ? bar('100% = ?', [String(w.A), ...rep(w.unit - 1, '')]) : '';
        return dnum(`Find the missing number: ${p}% of □ = ${w.A}`, w.W, {
          tier, svg, hint: wholeHint(w), explain: wholeWhy(w),
        });
      }
      if (shape === 2) {
        const W = pick(rng, [20, 25, 40, 50, 60, 80, 200, 300, 400, 500]), step = 100 / gcd(W, 100);
        const p = step * ri(rng, 1, Math.floor(99 / step)), A = pctOf(W, 0, p);
        return pnum(`Find the missing number: □% of ${W} = ${A}`, p, {
          tier, hint: `Write ${A} out of ${W} as a fraction. Then make the denominator 100.`, explain: outOfWhy(A, W, p),
        });
      }
      if (shape === 3) {
        // Divided instead of multiplied; multiplied by the percentage; found the other part (80%); added.
        const p = pick(rng, [20, 25, 5]), k = 100 / p, A = ri(rng, 3, 18);
        const w = { p, g: p, unit: k, j: 1, m: A, W: A * k, A };
        return mcVal(rng, `${p}% of a number is ${A}. What is the number?`, w.W, [A / k, A * p, A * (k - 1), A + 100 - p], dec, {
          tier, hint: wholeHint(w), explain: wholeWhy(w),
        });
      }
      const story = ri(rng, 1, 3);
      if (story === 1) {
        const p = pick(rng, [10, 20, 25, 50]), w = wholeDraw(rng, p, 10, 150);
        return dnum(`${name} spent ${gbp(w.A)}. That is ${p}% of ${name}'s money. How much money did ${name} have at the start?`, w.W, {
          tier, unit: 'pounds', hint: wholeHint(w), explain: wholeWhy(w, gbp),
        });
      }
      if (story === 2) {
        const p = pick(rng, [10, 20, 25, 50]), w = wholeDraw(rng, p, 20, 200);
        return dnum(`A fish tank is ${p}% full. There are ${w.A} litres of water in it. How many litres does the tank hold when it is full?`, w.W, {
          tier, unit: 'litres', hint: wholeHint(w), explain: wholeWhy(w),
        });
      }
      const p = pick(rng, [10, 20, 25, 40, 75]), w = wholeDraw(rng, p, 80, 400);
      return dnum(`${name} has read ${w.A} pages of a book. That is ${p}% of the book. How many pages does the book have?`, w.W, {
        tier, hint: wholeHint(w), explain: wholeWhy(w),
      });
    },
  },

  'u08-l06': {
    intro: {
      text: `Per cent means <b>out of 100</b>. To write a fraction as a percentage, find an <b>equivalent fraction</b> with a denominator of 100. For ${fr(3, 5)}: 5 × 20 = 100, so multiply the numerator by 20 too. ${fr(3, 5)} = ${fr(60, 100)} = 60%. In the same way, ${fr(7, 20)} = ${fr(35, 100)} = 35%.`,
      alt: `Ask: what do I multiply the denominator by to make 100? Do the same to the numerator. The new numerator is the percentage. If the denominator does not go into 100, simplify the fraction first: ${fr(12, 40)} = ${fr(3, 10)} = ${fr(30, 100)} = 30%.`,
      svg: hundredSquare(60),
    },
    example: {
      steps: [
        `Write ${fr(9, 25)} as a percentage.`,
        '25 × 4 = 100, so multiply the numerator and the denominator by 4.',
        `${fr(9, 25)} = ${fr(36, 100)}.`,
        `So ${fr(9, 25)} = <b>36%</b>.`,
      ],
    },
    gen(rng, tier) {
      const name = pick(rng, NAMES);
      const t1Frac = () => {
        const d = pick(rng, [2, 4, 5, 10, 20, 25, 50]);
        return [coprime(rng, d), d];
      };
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape === 3) {
          const n = ri(rng, 3, 97), c = Math.floor(n / 10), s = n % 10;
          const seen = [c ? `${c} full ${plural(c, 'column', 'columns')} (${10 * c} squares)` : '', s ? `${s} more ${plural(s, 'square', 'squares')}` : '']
            .filter(Boolean).join(' and ');
          return pnum('What percentage of the hundred square is shaded?', n, {
            tier, svg: hundredSquare(n), hint: 'Count the shaded squares. Each full column is 10. There are 100 squares.',
            explain: `${seen}: ${n} out of 100 squares are shaded. ${fr(n, 100)} = ${n}%.`,
          });
        }
        const [n, d] = t1Frac(), p = (n * 100) / d;
        const hint = `Make the denominator 100. What do you multiply ${d} by to make 100?`;
        if (shape === 1) {
          return pnum(`Write ${fr(n, d)} as a percentage.`, p, { tier, svg: d <= 10 ? fracBar(n, d) : '', hint, explain: fpWhy(n, d) });
        }
        if (shape === 2) {
          return dnum(`Find the missing number: ${fr(n, d)} = ${fr('□', 100)}`, p, { tier, hint, explain: fpWhy(n, d) });
        }
        // 3/5 read as 35%; the numerator as the percentage; the rest of 100; the denominator.
        return mcVal(rng, `Which percentage is equal to ${fr(n, d)}?`, p, [concat(n, d), n, 100 - p, d], pc, {
          tier, hint, explain: fpWhy(n, d),
        });
      }
      // A fraction to simplify first: 12/40 = 3/10 (a/b × k/k, b × k not a factor of 100),
      // or one over 200 or 500 that divides down to hundredths.
      const simpler = () => {
        if (rng() < 0.7) {
          const { b, k } = draw(() => ({ b: pick(rng, [2, 4, 5, 10, 20, 25]), k: ri(rng, 3, 9) }),
            (v) => 100 % (v.b * v.k) !== 0 && v.b * v.k <= 80, { b: 10, k: 4 });
          const a = coprime(rng, b);
          return { n: a * k, d: b * k, a, b, k, p: (a * 100) / b };
        }
        const d = pick(rng, [200, 500]), p = ri(rng, 1, 99), k = d / 100;
        return { n: p * k, d, a: p, b: 100, k, p };
      };
      const simplerWhy = ({ n, d, a, b, k }) => (b === 100
        ? `Divide the top and the bottom by ${k}: ${fr(n, d)} = ${fr(a, 100)} = ${a}%.`
        : `First simplify. Divide the top and the bottom by ${k}: ${fr(n, d)} = ${fr(a, b)}. Then ${fpWhy(a, b)}`);
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        const f = simpler();
        return pnum(`Write ${fr(f.n, f.d)} as a percentage.`, f.p, {
          tier, hint: f.b === 100 ? `Divide the top and the bottom by ${f.k} to make the denominator 100.` : `${f.d} does not go into 100. Simplify ${fr(f.n, f.d)} first.`,
          explain: simplerWhy(f),
        });
      }
      if (shape === 2) {
        const story = ri(rng, 1, 4);
        const m = story === 2 ? pick(rng, [20, 25]) : story === 4 ? pick(rng, [10, 20, 25]) : pick(rng, [10, 20, 25, 40, 50]);
        const lo = story === 1 ? Math.ceil(m / 2) : 2;
        const n = draw(() => ri(rng, lo, m - 2), (v) => (100 * v) % m === 0, m === 40 ? 30 : m - 2);
        const p = (100 * n) / m;
        const q = story === 1 ? `${name} got ${n} out of ${m} marks in a spelling test. What percentage did ${name} get?`
          : story === 2 ? `In a class of ${m} children, ${n} have a pet. What percentage of the class have a pet?`
            : story === 3 ? `A bag has ${m} sweets. ${n} of them are red. What percentage of the sweets are red?`
              : `${name} takes ${m} shots at goal and scores ${n} times. What percentage of the shots go in?`;
        const [sn, sd] = simplify(n, m);
        const why = 100 % m === 0 ? `${n} out of ${m} is ${fr(n, m)}. ${fpWhy(n, m)}`
          : `${n} out of ${m} is ${fr(n, m)}. Simplify first: ${fr(n, m)} = ${fr(sn, sd)}. ${fpWhy(sn, sd)}`;
        return pnum(q, p, { tier, hint: `Write ${n} out of ${m} as a fraction. Then make the denominator 100.`, explain: why });
      }
      if (shape === 3) {
        // The old numerator; the simplified numerator (3/10 → 3%); 3/10 read as 310 or 31; the rest of 100.
        let f = simpler();
        if (f.b === 100) f = { n: 12, d: 40, a: 3, b: 10, k: 4, p: 30 };
        return mcVal(rng, `Which percentage is equal to ${fr(f.n, f.d)}?`, f.p, [f.n, f.a, concat(f.a, f.b), 100 - f.p], pc, {
          tier, hint: 'Simplify first. Then make the denominator 100.', explain: simplerWhy(f),
        });
      }
      // 3/5 = 35%? 7/20 = 7%?
      const [n, d] = t1Frac(), p = (n * 100) / d, c = concat(n, d);
      const truth = rng() < 0.5, shown = truth ? p : c !== null && c !== p ? c : n;
      return tf(`True or false: ${fr(n, d)} = ${shown}%`, truth, {
        tier, hint: 'Make the denominator 100 first.',
        explain: `${truth ? 'True' : 'False'}. ${fpWhy(n, d)}`,
      });
    },
  },

  'u08-l07': {
    intro: {
      text: `Fractions, decimals and percentages can show the same amount: 35% = ${fr(35, 100)} = 0.35. To change a <b>decimal</b> to a <b>percentage</b>, multiply by 100: 0.35 = 35% and 0.8 = 80%. To change a percentage to a decimal, divide by 100: 4% = 0.04. To change a percentage to a fraction, write it over 100 and simplify: 45% = ${fr(45, 100)} = ${fr(9, 20)}.`,
      alt: 'Per cent means hundredths. 0.35 is 35 hundredths, so it is 35%. 0.8 is 8 tenths. That is 80 hundredths, so 0.8 is 80%, not 8%. 4% is 4 hundredths, so it is 0.04, not 0.4.',
      svg: hundredSquare(35),
    },
    example: {
      steps: [
        'Write 0.6 as a percentage and as a fraction in its simplest form.',
        '0.6 is 6 tenths = 60 hundredths, so 0.6 = 60%.',
        `60% = ${fr(60, 100)}. Divide the top and the bottom by 20: ${fr(3, 5)}.`,
        `So 0.6 = <b>60%</b> = <b>${fr(3, 5)}</b>.`,
      ],
    },
    gen(rng, tier) {
      // 0.8 → '8 tenths = 80 hundredths'; 0.04 → '4 hundredths'; 0.35 → '35 hundredths'.
      const asHundredths = (p) => (p % 10 === 0
        ? `${p / 10} ${plural(p / 10, 'tenth', 'tenths')} = ${p} hundredths`
        : `${p} ${plural(p, 'hundredth', 'hundredths')}`);
      const simplestWhy = (p) => {
        const g = gcd(p, 100), [sn, sd] = simplify(p, 100);
        return g === 1 ? `${p}% = ${fr(p, 100)}.` : `${p}% = ${fr(p, 100)}. Divide the top and the bottom by ${g}: ${fr(sn, sd)}.`;
      };
      if (tier === 1) {
        const shape = ri(rng, 1, 4), p = noZero(rng, 11, 99), x = dv(p, 2);
        if (shape === 1) {
          return pnum(`Write ${dec(x)} as a percentage.`, p, {
            tier, hint: 'Per cent means hundredths. How many hundredths is it?',
            explain: `${dec(x)} is ${p} hundredths. Per cent means out of 100, so ${dec(x)} = ${p}%.`,
          });
        }
        if (shape === 2) {
          return dnum(`Write ${p}% as a decimal.`, x, {
            tier, hint: 'Per cent means out of 100. Write it as hundredths.',
            explain: `${p}% = ${fr(p, 100)} = ${p} hundredths = ${dec(x)}.`,
          });
        }
        if (shape === 3) {
          const q = ri(rng, 3, 97);
          return frac(`Write ${q}% as a fraction.`, q, 100, {
            tier, hint: 'Per cent means out of 100.',
            explain: gcd(q, 100) === 1 ? `${q}% means ${q} out of 100: ${fr(q, 100)}.`
              : `${q}% means ${q} out of 100: ${fr(q, 100)}. In its simplest form that is ${fr(...simplify(q, 100))}.`,
          });
        }
        // 35% as 3.5, 0.035 or 35.
        return mcVal(rng, `Which decimal is equal to ${p}%?`, x, [dv(p, 1), dv(p, 3), p], dec, {
          tier, hint: 'Per cent means hundredths.', explain: `${p}% = ${p} hundredths = ${dec(x)}.`,
        });
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        // 0.8 read as 8% or 800%, 0.04 as 40%; the decimal kept as it is (0.8%).
        const p = pick(rng, [10 * ri(rng, 1, 9), ri(rng, 1, 9), noZero(rng, 11, 99)]), x = dv(p, 2);
        return mcVal(rng, `Which percentage is equal to ${dec(x)}?`, p, [dv(p, 1), 10 * p, x], pc, {
          tier, hint: 'Multiply the decimal by 100. Per cent means hundredths.',
          explain: `${dec(x)} is ${asHundredths(p)}. Per cent means hundredths, so ${dec(x)} = ${p}%.`,
        });
      }
      if (shape === 2) {
        const p = rng() < 0.5 ? ri(rng, 1, 9) : 10 * ri(rng, 1, 9), x = dv(p, 2);
        return dnum(`Write ${p}% as a decimal.`, x, {
          tier, hint: 'Divide by 100: the digits move 2 columns to the right.',
          explain: p < 10 ? `${p}% = ${fr(p, 100)} = ${p} ${plural(p, 'hundredth', 'hundredths')} = ${dec(x)}. The 0 in the tenths column is a place holder.`
            : `${p}% = ${fr(p, 100)} = ${p / 10} ${plural(p / 10, 'tenth', 'tenths')} = ${dec(x)}.`,
        });
      }
      const p = draw(() => ri(rng, 2, 98), (v) => gcd(v, 100) > 1, 45), [sn, sd] = simplify(p, 100);
      if (shape === 3) {
        return frac(`Write ${p}% as a fraction in its simplest form.`, sn, sd, {
          exact: true, tier, hint: `Write ${p}% over 100. Then divide the top and the bottom by the same number.`,
          explain: simplestWhy(p),
        });
      }
      if (rng() < 0.5) {
        // 45% as 45/10; 45 read as 4/5 (when that is a proper fraction); one zero too many; over 1,000.
        const t = Math.floor(p / 10), o = p % 10;
        const ds = [R(p, 10), R(sn, sd * 10), R(p, 1000)];
        if (t && t < o) ds.splice(1, 0, R(t, o));
        return mcRat(rng, `Which fraction is equal to ${p}%?`, R(sn, sd), ds, {
          tier, hint: `Write ${p}% over 100, then simplify.`, explain: simplestWhy(p),
        });
      }
      // 0.4 = 4%? 0.04 = 40%?
      const k = ri(rng, 1, 9), tenths = rng() < 0.5, x = tenths ? dv(k, 1) : dv(k, 2), real = tenths ? 10 * k : k;
      const shown = rng() < 0.5 ? k : 10 * k, truth = shown === real;
      return tf(`True or false: ${dec(x)} = ${shown}%`, truth, {
        tier, hint: 'Count the hundredths. Per cent means hundredths.',
        explain: `${truth ? 'True' : 'False'}. ${dec(x)} is ${asHundredths(real)}, so ${dec(x)} = ${real}%.`,
      });
    },
  },

  'u08-l08': {
    intro: {
      text: `To compare fractions, decimals and percentages, change them all into the <b>same form</b>. Percentages are often easiest. ${fr(3, 5)} = 60%, 0.55 = 55%, and 62% stays 62%. So the order from smallest to greatest is 0.55, ${fr(3, 5)}, 62%.`,
      alt: `Write every number as hundredths, then compare: ${fr(3, 5)} = ${fr(60, 100)}, 0.55 = ${fr(55, 100)} and 62% = ${fr(62, 100)}. Now compare 60, 55 and 62. Be careful with tenths: 0.6 is 60%, so it is more than 0.55.`,
    },
    example: {
      steps: [
        'Which is greater: 0.4 or 38%?',
        'Change 0.4 into a percentage: 0.4 = 4 tenths = 40 hundredths = 40%.',
        '40% is more than 38%.',
        'So <b>0.4</b> is greater.',
      ],
    },
    gen(rng, tier) {
      const swap = (a, b) => (rng() < 0.5 ? [a, b] : [b, a]);
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          // 0.4 against 38% or 45%: the tenths decimal looks smaller than it is.
          const t = ri(rng, 2, 8), p = rng() < 0.15 ? 10 * t : 10 * t + pick(rng, [-8, -6, -5, -3, -2, 2, 3, 5, 7]);
          return compareQ(rng, ...swap(decItem(10 * t), pctItem(p)), tier);
        }
        if (shape === 2) {
          const [n, d] = pick(rng, FR_T1), v = (100 * n) / d;
          let p = rng() < 0.15 ? v : v + pick(rng, [-10, -5, -3, -2, 2, 3, 5, 10]);
          if (p < 1 || p > 99) p = v + (v > 50 ? -5 : 5);
          return compareQ(rng, ...swap(frItem(n, d), pctItem(p)), tier);
        }
        if (shape === 3) {
          // Is 0.5 greater than 45%? (5 is less than 45, but 0.5 is 50%.)
          const t = ri(rng, 2, 8), p = rng() < 0.5 ? 10 * (t - 1) + ri(rng, 1, 9) : 10 * t + ri(rng, 1, 9);
          const rel = pick(rng, ['greater than', 'less than']), x = dec(dv(t, 1));
          const truth = rel === 'greater than' ? 10 * t > p : 10 * t < p;
          return tf(`True or false: ${x} is ${rel} ${p}%`, truth, {
            tier, hint: `Change ${x} into a percentage first.`,
            explain: `${x} = ${t} tenths = ${10 * t} hundredths = ${10 * t}%. ${10 * t}% is ${10 * t > p ? 'more' : 'less'} than ${p}%, so it is ${truth ? 'true' : 'false'}.`,
          });
        }
        const [n, d] = pick(rng, FR_T1), v = (100 * n) / d;
        let x = rng() < 0.2 ? v : v + pick(rng, [-5, -3, -2, -1, 1, 2, 3, 5]);
        if (x < 1 || x > 99) x = v - 1;
        const [A, B] = swap(decItem(x), frItem(n, d));
        const idx = A.v < B.v ? 0 : A.v > B.v ? 1 : 2;
        return mc(`Which sign goes in the box? ${A.s} □ ${B.s}`, SIGNS, idx, {
          tier, hint: 'Write both as percentages first.',
          explain: `As percentages: ${A.why} and ${B.why}. So ${A.s} ${SIGNS[idx]} ${B.s}.`,
        });
      }
      const shape = ri(rng, 1, 4);
      if (shape <= 2) {
        const items = mixSet(rng, shape === 1 ? ['f', 'd', 'p'] : ['f', 'd', 'p', pick(rng, ['d', 'p'])]);
        const big = shape === 2 && rng() < 0.5;
        const sorted = items.slice().sort((a, b) => (big ? b.v - a.v : a.v - b.v));
        return order(`Put these in order, <b>${big ? 'greatest' : 'smallest'} first</b>.`, rng, sorted.map((i) => i.s), {
          tier, hint: 'Change them all into percentages first. Then compare.',
          explain: `As percentages: ${sorted.map((i) => i.why).join(', ')}. So the order is ${sorted.map((i) => i.s).join(', ')}.`,
        });
      }
      if (shape === 3) {
        const items = mixSet(rng, ['f', 'd', 'p', pick(rng, ['d', 'p'])]), big = rng() < 0.5;
        const best = items.reduce((a, b) => ((big ? b.v > a.v : b.v < a.v) ? b : a));
        return mcFrom(rng, `Which is the ${big ? 'greatest' : 'smallest'}?`, best.s, items.filter((i) => i !== best).map((i) => i.s), {
          tier, hint: 'Change them all into percentages first.',
          explain: `As percentages: ${items.map((i) => i.why).join(', ')}. The ${big ? 'greatest' : 'smallest'} is ${best.s}.`,
        });
      }
      const [n, d] = pick(rng, FDP_FR), v = (100 * n) / d;
      let x = v + pick(rng, [-1, 1]) * ri(rng, 1, 6);
      if (x < 1 || x > 99) x = v - 3;
      const F = frItem(n, d), D = decItem(x), truth = v > x;
      return tf(`True or false: ${F.s} is greater than ${D.s}`, truth, {
        tier, hint: 'Write both as percentages first.',
        explain: `${truth ? 'True' : 'False'}. As percentages: ${F.why} and ${D.why}. ${Math.max(v, x)}% is more than ${Math.min(v, x)}%.`,
      });
    },
  },

  'u08-l09': {
    intro: {
      text: 'Many percentage problems have <b>two steps</b>. Read the question and plan: what do I find first? 35% of 60 children have school dinners. How many do not? Step 1: 35% of 60 = 21. Step 2: 60 − 21 = 39. Or: 100% − 35% = 65% do not, and 65% of 60 = 39.',
      alt: 'Draw a bar model. The whole bar is 100%. Mark the part you know. The rest of the bar is 100% minus that part. To compare two offers, work out each one, then compare the answers.',
      svg: barModel(100, [35, 65], { partLabels: ['35%', '65%: ?'], wholeLabel: '100% = 60 children' }),
    },
    example: {
      steps: [
        'Shop A sells a game for £40 with 25% off. Shop B sells it for £35 with 10% off. Which shop is cheaper?',
        'Shop A: 25% of £40 = £10, so the price is £40 − £10 = £30.',
        'Shop B: 10% of £35 = £3.50, so the price is £35 − £3.50 = £31.50.',
        '£30 is less than £31.50, so <b>Shop A</b> is cheaper.',
      ],
    },
    gen(rng, tier) {
      const name = pick(rng, NAMES);
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          const p = 5 * ri(rng, 1, 19), story = ri(rng, 1, 3);
          const q = story === 1 ? `${p}% of the children in a class walk to school. What percentage do not walk to school?`
            : story === 2 ? `In a survey, ${p}% of the children chose football. What percentage did not choose football?`
              : `${p}% of a garden is grass. What percentage of the garden is not grass?`;
          return pnum(q, 100 - p, {
            tier, hint: 'The whole is 100%.', explain: `The whole is 100%. 100% − ${p}% = ${100 - p}%.`,
          });
        }
        if (shape === 2) {
          // A fraction and a percentage of the same amount.
          const [n, d] = pick(rng, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [1, 10]]), p = pick(rng, [10, 20, 25, 40, 50, 75]);
          const N = 20 * ri(rng, 1, 5), F = (N / d) * n, P = pctOf(N, 0, p);
          const a = `${fr(n, d)} of ${N}`, b = `${p}% of ${N}`;
          const right = F === P ? 'They are the same' : F > P ? a : b;
          const fWhy = `${fr(n, d)} of ${N} = ${N} ÷ ${d}${n > 1 ? ` × ${n}` : ''} = ${F}.`;
          return mcFrom(rng, `Which is more: ${a} or ${b}?`, right, [a, b, 'They are the same'].filter((o) => o !== right), {
            tier, hint: 'Work out both. Then compare.',
            explain: `${fWhy} ${pctWhy(p, N)} ${F === P ? `Both are ${F}, so they are the same.` : `${Math.max(F, P)} is more than ${Math.min(F, P)}, so ${right} is more.`}`,
          });
        }
        if (shape === 3) {
          const p = pick(rng, [10, 20, 25, 30, 50]), N = 20 * ri(rng, 1, 5), A = pctOf(N, 0, p);
          return dnum(`There are ${N} cars in a car park. ${p}% of them are red. That is ${A} cars. How many cars are not red?`, N - A, {
            tier, hint: `Take the red cars away from all ${N} cars.`, explain: `${N} − ${A} = ${N - A} cars are not red.`,
          });
        }
        const [a, b] = two(rng), p1 = 5 * ri(rng, 2, 9), p2 = 5 * ri(rng, 2, Math.min(9, 19 - p1 / 5));
        return pnum(`${a} eats ${p1}% of a pizza. ${b} eats ${p2}% of it. What percentage of the pizza is left?`, 100 - p1 - p2, {
          tier, hint: 'The whole pizza is 100%. Add what they eat, then take it away from 100%.',
          explain: `${p1}% + ${p2}% = ${p1 + p2}% is eaten. 100% − ${p1 + p2}% = ${100 - p1 - p2}% is left.`,
        });
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        const p = pick(rng, [15, 35, 45, 65, 85, 20, 30, 40, 60, 70, 80, 25, 75]), N = 20 * ri(rng, 5, 30);
        const A = pctOf(N, 0, p), rest = N - A, story = ri(rng, 1, 3);
        const [q, what] = story === 1
          ? [`A school has ${N} pupils. ${p}% of them have school dinners. How many pupils do not have school dinners?`, 'pupils do not have school dinners']
          : story === 2
            ? [`${N} people go to a concert. ${p}% of them are children. How many adults are there?`, 'are adults']
            : [`A farmer plants ${N} trees. ${p}% of them are apple trees. How many trees are not apple trees?`, 'trees are not apple trees'];
        return dnum(q, rest, {
          tier, hint: `Find ${p}% of ${N}. Then take it away from ${N}.`,
          explain: `${pctWhy(p, N)} Then ${N} − ${A} = ${rest}, so ${rest} ${what}. Or: 100% − ${p}% = ${100 - p}%, and ${100 - p}% of ${N} = ${rest}.`,
        });
      }
      if (shape === 2) {
        // Two offers for the same thing, prices a few pounds apart: the dearer shop has
        // the bigger discount, so a glance does not settle it.
        const [item, lo, hi] = pick(rng, OFFER_ITEMS), P = [10, 20, 25, 30, 50];
        const { a, b, p, q } = draw(() => {
          const a = ri(rng, lo, hi);
          return { a, b: a + pick(rng, [-1, 1]) * ri(rng, 2, 10), p: pick(rng, P), q: pick(rng, P) };
        }, (v) => v.b >= lo && v.b <= hi && ((v.a > v.b && v.p > v.q) || (v.a < v.b && v.p < v.q)), { a: lo + 5, b: lo, p: 25, q: 10 });
        const SA = dv(a * (100 - p), 2), SB = dv(b * (100 - q), 2), da = pctOf(a, 0, p), db = pctOf(b, 0, q);
        const right = a * (100 - p) === b * (100 - q) ? 'They cost the same' : a * (100 - p) < b * (100 - q) ? 'Shop A' : 'Shop B';
        const verdict = right === 'They cost the same' ? `Both cost ${gbp(SA)}.`
          : `${gbp(Math.min(SA, SB))} is less than ${gbp(Math.max(SA, SB))}, so ${right} is cheaper.`;
        return mcFrom(rng, `A ${item} costs ${gbp(a)} in Shop A and ${gbp(b)} in Shop B. Shop A has ${p}% off. Shop B has ${q}% off. Which shop is cheaper?`,
          right, ['Shop A', 'Shop B', 'They cost the same'].filter((o) => o !== right), {
            tier, hint: 'Work out the sale price in each shop. Then compare.',
            explain: `Shop A: ${pctWhy(p, a, gbp)} ${gbp(a)} − ${gbp(da)} = ${gbp(SA)}. Shop B: ${pctWhy(q, b, gbp)} ${gbp(b)} − ${gbp(db)} = ${gbp(SB)}. ${verdict}`,
          });
      }
      if (shape === 3) {
        // A fraction and a percentage of the same amount, then the rest.
        const v = draw(() => {
          const [n, d] = pick(rng, [[1, 4], [1, 5], [1, 2], [1, 10], [2, 5], [3, 10]]), p = pick(rng, [10, 20, 25, 30, 40]);
          return { n, d, p, L: lcm(d, 100 / gcd(p, 100)) };
        }, (x) => x.n / x.d + x.p / 100 < 0.9, { n: 1, d: 4, p: 30, L: 20 });
        // Pupils: a multiple of 20 as well, so every step (10%, 5%, a quarter) is whole pupils.
        const school = rng() < 0.5, L = school ? lcm(v.L, 20) : v.L;
        const N = school ? L * ri(rng, Math.ceil(100 / L), Math.floor(600 / L)) : L * ri(rng, Math.ceil(20 / L), Math.floor(100 / L));
        const F = (N / v.d) * v.n, P = pctOf(N, 0, v.p), left = N - F - P;
        const show = school ? dec : gbp;
        const fWhy = `${fr(v.n, v.d)} of ${show(N)} = ${show(N)} ÷ ${v.d}${v.n > 1 ? ` × ${v.n}` : ''} = ${show(F)}.`;
        if (school) {
          return dnum(`A school has ${N} pupils. ${fr(v.n, v.d)} of them walk to school and ${v.p}% come by car. The rest come by bus. How many pupils come by bus?`, left, {
            tier, hint: `Find ${fr(v.n, v.d)} of ${N} and ${v.p}% of ${N}. Then find what is left.`,
            explain: `${fWhy} ${pctWhy(v.p, N)} ${F} + ${P} = ${F + P} pupils walk or come by car. ${N} − ${F + P} = ${left} pupils come by bus.`,
          });
        }
        return dnum(`${name} gets ${gbp(N)} for a birthday. ${name} spends ${fr(v.n, v.d)} of it on a book and ${v.p}% of it on a game. How much money is left?`, left, {
          tier, unit: 'pounds', hint: `Find ${fr(v.n, v.d)} of ${gbp(N)} and ${v.p}% of ${gbp(N)}. Then find what is left.`,
          explain: `${fWhy} ${pctWhy(v.p, N, gbp)} ${name} spends ${gbp(F)} + ${gbp(P)} = ${gbp(F + P)}. ${gbp(N)} − ${gbp(F + P)} = ${gbp(left)} is left.`,
        });
      }
      const p = pick(rng, [10, 20, 25, 30, 40, 60, 75, 15, 35]), bike = rng() < 0.5;
      const N = bike ? ri(rng, 80, 250) : ri(rng, 12, 40), P = pctOf(N, 0, p), rest = dv(N * (100 - p), 2);
      const q = bike ? `A bike costs ${gbp(N)}. ${name} has saved ${p}% of the price. How much more does ${name} need to save?`
        : `A school trip costs ${gbp(N)} for each child. The school pays ${p}% of the cost. Parents pay the rest. How much do parents pay for each child?`;
      return dnum(q, rest, {
        tier, unit: 'pounds', hint: `Find ${p}% of ${gbp(N)}. Then take it away from ${gbp(N)}.`,
        explain: `${pctWhy(p, N, gbp)} ${gbp(N)} − ${gbp(P)} = ${gbp(rest)}. Or: 100% − ${p}% = ${100 - p}%, so find ${100 - p}% of ${gbp(N)}.`,
      });
    },
  },
};
