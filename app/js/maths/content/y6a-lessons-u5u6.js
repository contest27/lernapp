// Lesson-precise warm-ups for "tomorrow's lesson" (phase B8):
// Unit 5 — Fractions (2), lessons 1–9, and Unit 6 — Geometry: position and
// direction, lessons 1–4. Contract: previewOf() in lessons.js. Each entry has an
// intro (one idea, in the explanation-segment shape), a worked example, and
// gen(rng, tier) for tiers 1–2 of exactly that lesson's task type.
//
// Rules kept here (CLAUDE.md non-negotiables 4, 5, 8):
// - Every answer is computed from the drawn values, never typed separately.
// - Only the passed rng is used, and no scenario() decks: one seed, one prompt.
// - The fraction pad takes n/d only. A mixed number is an MC option built with
//   mixed(); a coordinate pair is an MC option, or one coordinate is asked via num().
// - First-quadrant questions draw on coordGrid(); questions with negative
//   coordinates draw on coordGrid4() (B9, 2026-11-10): range 5, every drawn
//   point within ±4, so the dots clear the tick labels beside the axes and the
//   point labels stay inside the picture. The answer is never drawn.
// - A coordinate typed on the pad offers the minus key whether or not the
//   answer is negative (cnum) — a pad without it says "positive".
// - Displayed negatives use the real minus sign (neg / pt below).

import { num, tf, mc, mcFrom, frac, fr, ri, pick, shuffle, distinctInts } from './gen.js';
import { fracBar, barModel, coordGrid, coordGrid4 } from './vis.js';
import { gcd, simplify, mixed } from './y6a-frac.js';

const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];
const SINGLE = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth' };
// Used in hints for denominators up to 9 ("Count the sevenths").
const PLURAL = {
  2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths', 7: 'sevenths',
  8: 'eighths', 9: 'ninths',
};
// Friendly fractions for the four-rules stories (u05-l07).
const POOL = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5],
  [1, 6], [5, 6], [1, 8], [3, 8], [5, 8], [7, 8]];

const neg = (v) => (v < 0 ? `−${-v}` : String(v));
const pt = (x, y) => `(${neg(x)}, ${neg(y)})`;
const sq = (k) => (k === 1 ? '1 square' : `${k} squares`);
const R = (n, d) => [fr(n, d), n, d];
// Chebyshev distance >= 2: two drawn points whose labels cannot meet.
const apart = (p, q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) >= 2;
const inGrid = (...vs) => vs.every((v) => v >= -4 && v <= 4);

// A coordinate question for the pad: the minus key is always offered.
function cnum(prompt, answer, opts) {
  const q = num(prompt, answer, opts);
  q.allowMinus = true;
  return q;
}

// Draw values with make() until ok() holds. make() only uses the rng it closes
// over, so this is deterministic. The fallback satisfies ok() by construction.
function draw(make, ok, fallback) {
  for (let i = 0; i < 60; i++) {
    const v = make();
    if (ok(v)) return v;
  }
  return fallback;
}

// MC over options with a rational value, each [label, n, d]. A distractor EQUAL
// IN VALUE to the answer (2/4 beside 1/2) or to another distractor is dropped,
// so exactly one option is right however it is written.
function mcRat(rng, prompt, correct, distractors, opts) {
  const same = (a, b) => a[1] * b[2] === b[1] * a[2];
  const keep = [];
  for (const x of distractors) {
    if (keep.length === 3) break;
    if (same(x, correct) || keep.some((k) => k[0] === x[0] || same(k, x))) continue;
    keep.push(x);
  }
  return mcFrom(rng, prompt, correct[0], keep.map((k) => k[0]), opts);
}

// p/d (more than 1, not a whole number) as a mixed number in simplest form.
function asMixed(p, d) {
  const [rn, rd] = simplify(p % d, d);
  return mixed(Math.floor(p / d), rn, rd);
}

// n/d ÷ w: which method, and the answer it gives.
function divWhy(n, d, w) {
  return n % w === 0
    ? `${n} divides by ${w}, so divide the numerator: ${n} ÷ ${w} = ${n / w}. The answer is ${fr(n / w, d)}.`
    : `${n} does not divide by ${w}, so multiply the denominator: ${d} × ${w} = ${d * w}. The answer is ${fr(n, d * w)}.`;
}

// The answer divWhy() arrives at, so the feedback and the explanation match.
const divAns = (n, d, w) => (n % w === 0 ? [n / w, d] : [n, d * w]);

// n/d ÷ w where the numerator does (div = true) or does not divide by w.
function divDraw(rng, div) {
  return draw(() => {
    const d = ri(rng, 3, 9), w = ri(rng, 2, 4);
    return { d, w, n: ri(rng, 1, d - 1) };
  }, (v) => gcd(v.n, v.d) === 1 && (v.n % v.w === 0) === div,
  div ? { d: 7, w: 3, n: 6 } : { d: 5, w: 2, n: 3 });
}

// The corners of an axis-aligned rectangle in order round the shape, starting at
// a random corner: [A, B, C, D]. D always sits next to A and next to C.
function rectCycle(rng, x0, y0, w, h) {
  const c = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
  const r = ri(rng, 0, 3);
  return [0, 1, 2, 3].map((i) => c[(r + i) % 4]);
}

function vertexWhy(A, C, D) {
  return A[0] === D[0]
    ? `D is straight above or below A, so it has the same x-coordinate as A: ${neg(A[0])}. D is level with C, so it has the same y-coordinate as C: ${neg(C[1])}. D is at ${pt(...D)}.`
    : `D is level with A, so it has the same y-coordinate as A: ${neg(A[1])}. D is straight above or below C, so it has the same x-coordinate as C: ${neg(C[0])}. D is at ${pt(...D)}.`;
}

export const lessonPreviewsU5U6 = {

  // ================================================================ Unit 5

  'u05-l01': {
    intro: {
      text: `To multiply a fraction by a <b>whole number</b>, multiply the <b>numerator</b> by the whole number. The <b>denominator</b> stays the same. 3 × ${fr(2, 5)} = ${fr(2, 5)} + ${fr(2, 5)} + ${fr(2, 5)} = ${fr(6, 5)}. That is an <b>improper fraction</b>; as a <b>mixed number</b> it is ${mixed(1, 1, 5)}.`,
      alt: `3 × ${fr(2, 5)} means three lots of ${fr(2, 5)}. Count the fifths: 2, 4, 6. That makes ${fr(6, 5)}. The pieces are still fifths, so only the top number changes.`,
      svg: fracBar(2, 5) + fracBar(2, 5) + fracBar(2, 5),
    },
    example: {
      steps: [
        `Work out 4 × ${fr(2, 3)}.`,
        `4 × ${fr(2, 3)} means 4 lots of ${fr(2, 3)}.`,
        `Multiply the numerator: 4 × 2 = 8. The denominator stays 3, so the answer is ${fr(8, 3)}.`,
        `${fr(3, 3)} makes 1 whole, so ${fr(8, 3)} is 2 wholes and ${fr(2, 3)} more.`,
        `So 4 × ${fr(2, 3)} = ${fr(8, 3)} = <b>${mixed(2, 2, 3)}</b>.`,
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          const d = pick(rng, [4, 5, 6, 7, 8, 9]), w = ri(rng, 2, d - 1);
          return frac(`Work out ${w} × ${fr(1, d)}.`, w, d, {
            tier,
            hint: `${w} × ${fr(1, d)} means ${w} lots of ${fr(1, d)}. Count the ${PLURAL[d]}.`,
            explain: `Multiply the numerator: 1 × ${w} = ${w}. The denominator stays ${d}. So ${w} × ${fr(1, d)} = ${fr(w, d)}.`,
          });
        }
        // Small enough that the answer stays a proper fraction.
        const { d, n, w } = draw(() => {
          const w = ri(rng, 2, 4), d = pick(rng, [7, 8, 9, 10]);
          return { d, w, n: ri(rng, 1, Math.floor((d - 1) / w)) };
        }, (v) => gcd(v.n, v.d) === 1, { d: 7, n: 2, w: 3 });
        if (shape === 2) {
          return frac(`Work out ${Array(w).fill(fr(n, d)).join(' + ')}.`, n * w, d, {
            tier,
            hint: `This is ${w} lots of ${fr(n, d)}, the same as ${w} × ${fr(n, d)}.`,
            explain: `${w} × ${fr(n, d)}: ${n} × ${w} = ${n * w}, and the denominator stays ${d}. The answer is ${fr(n * w, d)}.`,
          });
        }
        return num(`Find the missing number: ${w} × ${fr(n, d)} = ${fr('□', d)}`, n * w, {
          tier,
          hint: `The denominator stays ${d}. Multiply the numerator by ${w}.`,
          explain: `${n} × ${w} = ${n * w}, so ${w} × ${fr(n, d)} = ${fr(n * w, d)}.`,
        });
      }
      // Tier 2: the answer is more than 1 and not a whole number.
      const { d, n, w } = draw(() => {
        const d = pick(rng, [3, 4, 5, 6, 8]);
        return { d, n: ri(rng, 1, d - 1), w: ri(rng, 2, 5) };
      }, (v) => gcd(v.n, v.d) === 1 && v.n * v.w > v.d && (v.n * v.w) % v.d !== 0, { d: 5, n: 2, w: 3 });
      const p = n * w, whole = Math.floor(p / d), r = p % d;
      const [rn, rd] = simplify(r, d);
      const conv = `${p} ÷ ${d} = ${whole} remainder ${r}, so ${fr(p, d)} = ${mixed(whole, r, d)}${rd !== d ? ` = ${mixed(whole, rn, rd)}` : ''}.`;
      const shape = ri(rng, 1, 3);
      if (shape === 1) {
        return frac(`Work out ${w} × ${fr(n, d)}. Give the answer as an improper fraction.`, p, d, {
          tier,
          hint: `Multiply the numerator by ${w}. The denominator stays ${d}.`,
          explain: `${n} × ${w} = ${p}, so ${w} × ${fr(n, d)} = ${fr(p, d)}.`,
        });
      }
      if (shape === 2) {
        const val = (W, a, b) => [mixed(W, a, b), W * b + a, b];
        // Misconceptions: "w × n/d" read as the mixed number w n/d; one whole
        // too many or too few; the remainder counted from the wrong end.
        const ds = [val(w, n, d), val(whole + 1, rn, rd)];
        if (rd - rn !== rn) ds.push(val(whole, rd - rn, rd));
        if (whole > 1) ds.push(val(whole - 1, rn, rd));
        return mcRat(rng, `Work out ${w} × ${fr(n, d)}. Write the answer as a mixed number.`, val(whole, rn, rd), ds, {
          tier,
          hint: `Multiply the numerator first. Then see how many wholes (${fr(d, d)}) fit in.`,
          explain: `${w} × ${fr(n, d)} = ${fr(p, d)}. ${conv}`,
        });
      }
      const name = pick(rng, NAMES);
      const story = pick(rng, [
        `A glass holds ${fr(n, d)} of a litre of juice. ${name} fills ${w} glasses. How many litres of juice is that?`,
        `A cake needs ${fr(n, d)} of a cup of sugar. ${name} bakes ${w} cakes. How many cups of sugar is that?`,
      ]);
      return frac(`${story} (An improper fraction is fine.)`, p, d, {
        tier,
        hint: `${w} lots of ${fr(n, d)} is ${w} × ${fr(n, d)}. Multiply the numerator.`,
        explain: `${w} × ${fr(n, d)}: ${n} × ${w} = ${p}, so the answer is ${fr(p, d)}. ${conv}`,
      });
    },
  },

  'u05-l02': {
    intro: {
      text: `${fr(1, 2)} × ${fr(1, 3)} means <b>half of a third</b>. Split each third into 2 equal parts: now the whole has 6 equal parts, so ${fr(1, 2)} × ${fr(1, 3)} = ${fr(1, 6)}. To multiply two <b>unit fractions</b>, multiply the <b>denominators</b>. The numerator stays 1.`,
      alt: `"Of" means multiply. Half of a third is a small piece: cut every third into two, and there are 6 pieces in the whole. Each piece is ${fr(1, 6)}.`,
      svg: fracBar(1, 3) + fracBar(1, 6),
    },
    example: {
      steps: [
        `Work out ${fr(1, 4)} × ${fr(1, 3)}.`,
        `${fr(1, 4)} × ${fr(1, 3)} means ${fr(1, 4)} of ${fr(1, 3)}.`,
        'Split each third into 4 equal parts. Now the whole has 3 × 4 = 12 equal parts.',
        `So ${fr(1, 4)} × ${fr(1, 3)} = <b>${fr(1, 12)}</b>.`,
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        const a = ri(rng, 2, 4), b = ri(rng, 2, 5);
        if (shape === 1) {
          return frac(`Work out ${fr(1, a)} × ${fr(1, b)}.`, 1, a * b, {
            tier,
            hint: `Multiply the denominators: ${a} × ${b}. The numerator stays 1.`,
            explain: `${a} × ${b} = ${a * b}, so ${fr(1, a)} × ${fr(1, b)} = ${fr(1, a * b)}.`,
          });
        }
        if (shape === 2) {
          const lead = a === 2 ? 'half' : `a ${SINGLE[a]}`;
          return frac(`What is ${lead} of a ${SINGLE[b]}?`, 1, a * b, {
            tier, svg: fracBar(1, b),
            hint: `Split each ${SINGLE[b]} into ${a} equal parts. How many parts are in the whole now?`,
            explain: `${b} × ${a} = ${a * b} equal parts in the whole, so ${lead} of a ${SINGLE[b]} is ${fr(1, a * b)}.`,
          });
        }
        return num(`Find the missing number: ${fr(1, a)} × ${fr(1, b)} = ${fr(1, '□')}`, a * b, {
          tier,
          hint: `Multiply the denominators: ${a} × ${b}.`,
          explain: `${a} × ${b} = ${a * b}, so ${fr(1, a)} × ${fr(1, b)} = ${fr(1, a * b)}.`,
        });
      }
      const shape = ri(rng, 1, 3);
      const a = ri(rng, 2, 6);
      const b = draw(() => ri(rng, 2, 6), (v) => v !== a, a === 2 ? 3 : 2);
      if (shape === 1) {
        if (rng() < 0.5) {
          return num(`Find the missing number: ${fr(1, a)} × ${fr(1, '□')} = ${fr(1, a * b)}`, b, {
            tier,
            hint: `Multiply the denominators: ${a} × □ = ${a * b}.`,
            explain: `${a} × ${b} = ${a * b}, so the missing number is ${b}.`,
          });
        }
        return num(`Find the missing number: ${fr(1, '□')} × ${fr(1, b)} = ${fr(1, a * b)}`, a, {
          tier,
          hint: `Multiply the denominators: □ × ${b} = ${a * b}.`,
          explain: `${a} × ${b} = ${a * b}, so the missing number is ${a}.`,
        });
      }
      if (shape === 2) {
        const name = pick(rng, NAMES);
        const story = rng() < 0.5
          ? `${name} has ${fr(1, b)} of a pizza. ${name} eats ${fr(1, a)} of it. What fraction of the WHOLE pizza does ${name} eat?`
          : `${fr(1, b)} of a garden is a vegetable patch. ${fr(1, a)} of the vegetable patch is carrots. What fraction of the WHOLE garden is carrots?`;
        return frac(story, 1, a * b, {
          tier,
          hint: `${fr(1, a)} of ${fr(1, b)} means ${fr(1, a)} × ${fr(1, b)}.`,
          explain: `${fr(1, a)} × ${fr(1, b)}: ${a} × ${b} = ${a * b}, so it is ${fr(1, a * b)} of the whole.`,
        });
      }
      // Misconceptions: adding the denominators, adding the numerators, both,
      // or keeping the bigger denominator.
      return mcRat(rng, `Which is equal to ${fr(1, a)} × ${fr(1, b)}?`, R(1, a * b),
        [R(1, a + b), R(2, a * b), R(2, a + b), R(1, Math.max(a, b))], {
          tier,
          hint: 'Multiply the denominators. Do not add them.',
          explain: `${a} × ${b} = ${a * b}, so ${fr(1, a)} × ${fr(1, b)} = ${fr(1, a * b)}.`,
        });
    },
  },

  'u05-l03': {
    intro: {
      text: `To multiply two fractions, multiply the <b>numerators</b>, then multiply the <b>denominators</b>. ${fr(2, 3)} × ${fr(3, 4)}: 2 × 3 = 6 and 3 × 4 = 12, so the answer is ${fr(6, 12)}. Then write it in <b>simplest form</b>: ${fr(6, 12)} = ${fr(1, 2)}.`,
      alt: 'Top times top, bottom times bottom. Then make the fraction as simple as you can: divide the top and the bottom by the same number.',
      svg: fracBar(6, 12) + fracBar(1, 2),
    },
    example: {
      steps: [
        `Work out ${fr(3, 5)} × ${fr(2, 3)}.`,
        'Multiply the numerators: 3 × 2 = 6.',
        `Multiply the denominators: 5 × 3 = 15. That gives ${fr(6, 15)}.`,
        `Simplify: divide the top and the bottom by 3.`,
        `So ${fr(3, 5)} × ${fr(2, 3)} = ${fr(6, 15)} = <b>${fr(2, 5)}</b>.`,
      ],
    },
    gen(rng, tier) {
      const pair = (dMax, mustSimplify) => draw(() => {
        const d1 = ri(rng, 2, dMax), d2 = ri(rng, 2, dMax);
        return { d1, d2, n1: ri(rng, 1, d1 - 1), n2: ri(rng, 1, d2 - 1) };
      }, (v) => gcd(v.n1, v.d1) === 1 && gcd(v.n2, v.d2) === 1 && v.n1 * v.n2 > 1
        && (!mustSimplify || gcd(v.n1 * v.n2, v.d1 * v.d2) > 1), { n1: 2, d1: 3, n2: 3, d2: 4 });
      if (tier === 1) {
        const { n1, d1, n2, d2 } = pair(5, false);
        const N = n1 * n2, D = d1 * d2, calc = `${fr(n1, d1)} × ${fr(n2, d2)}`;
        const why = `${n1} × ${n2} = ${N} and ${d1} × ${d2} = ${D}, so ${calc} = ${fr(N, D)}.`;
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          return frac(`Work out ${calc}.`, N, D, {
            tier, hint: 'Multiply the numerators. Then multiply the denominators.', explain: why });
        }
        if (shape === 2) {
          return num(`Find the missing number: ${calc} = ${fr('□', D)}`, N, {
            tier, hint: `Multiply the numerators: ${n1} × ${n2}.`, explain: why });
        }
        return num(`Find the missing number: ${calc} = ${fr(N, '□')}`, D, {
          tier, hint: `Multiply the denominators: ${d1} × ${d2}.`, explain: why });
      }
      const { n1, d1, n2, d2 } = pair(6, true);
      const N = n1 * n2, D = d1 * d2, g = gcd(N, D), [sn, sd] = simplify(N, D);
      const calc = `${fr(n1, d1)} × ${fr(n2, d2)}`;
      const why = `${n1} × ${n2} = ${N} and ${d1} × ${d2} = ${D}: ${fr(N, D)}. Divide the top and the bottom by ${g}: ${fr(sn, sd)}.`;
      const shape = ri(rng, 1, 3);
      if (shape === 1) {
        return frac(`Work out ${calc}. Give the answer in its simplest form.`, sn, sd, {
          exact: true, tier,
          hint: 'Multiply the numerators and the denominators. Then simplify.', explain: why });
      }
      if (shape === 2) {
        const name = pick(rng, NAMES);
        const story = rng() < 0.5
          ? `${fr(n1, d1)} of a garden is grass. ${fr(n2, d2)} of the grass has daisies in it. What fraction of the WHOLE garden has daisies?`
          : `A bottle holds ${fr(n1, d1)} of a litre of water. ${name} drinks ${fr(n2, d2)} of the water in the bottle. How many litres does ${name} drink?`;
        return frac(story, N, D, {
          tier,
          hint: `${fr(n2, d2)} of ${fr(n1, d1)} means ${fr(n2, d2)} × ${fr(n1, d1)}.`,
          explain: why,
        });
      }
      // Misconceptions: adding tops and bottoms, adding the bottoms only,
      // cross-multiplying, adding the tops only.
      return mcRat(rng, `What is ${calc}?`, R(sn, sd),
        [R(n1 + n2, d1 + d2), R(N, d1 + d2), R(n1 * d2, d1 * n2), R(n1 + n2, D)], {
          tier, hint: 'Multiply top × top and bottom × bottom, then simplify.', explain: why });
    },
  },

  'u05-l04': {
    intro: {
      text: `If the <b>numerator</b> can be divided by the whole number, divide the numerator and keep the <b>denominator</b>. ${fr(6, 7)} ÷ 3: 6 sevenths shared into 3 equal groups is 2 sevenths in each group. So ${fr(6, 7)} ÷ 3 = ${fr(2, 7)}.`,
      alt: `Think of ${fr(6, 7)} as 6 pieces, and each piece is a seventh. Share the 6 pieces into 3 groups: each group gets 2 pieces, so ${fr(2, 7)}.`,
      svg: barModel(6, [2, 2, 2], { partLabels: ['2/7', '2/7', '2/7'], wholeLabel: '6/7' }),
    },
    example: {
      steps: [
        `Work out ${fr(8, 9)} ÷ 4.`,
        'Can the numerator 8 be divided by 4? Yes: 8 ÷ 4 = 2.',
        'The denominator stays 9: the pieces are still ninths.',
        `So ${fr(8, 9)} ÷ 4 = <b>${fr(2, 9)}</b>.`,
      ],
    },
    gen(rng, tier) {
      const { d, w, k } = tier === 1
        ? draw(() => {
          const w = ri(rng, 2, 4), d = ri(rng, Math.max(5, w + 1), 9);
          return { d, w, k: ri(rng, 1, Math.floor((d - 1) / w)) };
        }, (v) => gcd(v.k * v.w, v.d) === 1, { d: 7, w: 3, k: 2 })
        : draw(() => {
          const w = ri(rng, 2, 5), k = ri(rng, 1, w <= 3 ? 3 : 2);
          return { d: ri(rng, k * w + 1, 12), w, k };
        }, (v) => gcd(v.k * v.w, v.d) === 1 && v.k * v.w >= 4, { d: 11, w: 4, k: 2 });
      const n = k * w, calc = `${fr(n, d)} ÷ ${w}`;
      const why = `${n} ÷ ${w} = ${k}, and the denominator stays ${d}. So ${calc} = ${fr(k, d)}.`;
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        if (shape === 1) {
          return frac(`Work out ${calc}.`, k, d, {
            tier, hint: `Divide the numerator by ${w}. Keep the denominator.`, explain: why });
        }
        if (shape === 2) {
          return num(`Find the missing number: ${calc} = ${fr('□', d)}`, k, {
            tier, hint: `${n} ${PLURAL[d]} shared into ${w} equal groups. How many in each group?`, explain: why });
        }
        return frac(`${fr(n, d)} is shared into ${w} equal parts. How much is ONE part?`, k, d, {
          tier,
          svg: barModel(n, Array(w).fill(k), { partLabels: Array(w).fill('?'), wholeLabel: `${n}/${d}` }),
          hint: `${n} ${PLURAL[d]} in ${w} equal parts: ${n} ÷ ${w}.`,
          explain: why,
        });
      }
      if (shape === 1) {
        return frac(`Work out ${calc}.`, k, d, {
          tier, hint: `Can ${n} be divided by ${w}? Divide the numerator and keep the denominator.`, explain: why });
      }
      if (shape === 2) {
        return num(`Find the missing number: ${fr(n, d)} ÷ □ = ${fr(k, d)}`, w, {
          tier, hint: `The denominator did not change. ${n} ÷ □ = ${k}.`,
          explain: `${n} ÷ ${w} = ${k}, so the missing number is ${w}.` });
      }
      const name = pick(rng, NAMES);
      return frac(`${name} has ${fr(n, d)} of a litre of juice and pours it equally into ${w} glasses. How much juice is in each glass?`, k, d, {
        tier, hint: `Pouring equally into ${w} glasses means ÷ ${w}.`,
        explain: `${why} Each glass has ${fr(k, d)} of a litre.` });
    },
  },

  'u05-l05': {
    intro: {
      text: `Sometimes the <b>numerator</b> cannot be divided by the whole number. For ${fr(1, 3)} ÷ 2, make an <b>equivalent fraction</b> first: ${fr(1, 3)} = ${fr(2, 6)}, and ${fr(2, 6)} ÷ 2 = ${fr(1, 6)}. The quick way: multiply the <b>denominator</b> by the whole number. 3 × 2 = 6, so ${fr(1, 3)} ÷ 2 = ${fr(1, 6)}.`,
      alt: 'Cut each third into 2 equal pieces. Now the whole has 6 pieces, so each piece is a sixth. Dividing makes the pieces smaller, so the bottom number gets bigger.',
      svg: fracBar(1, 3) + fracBar(1, 6),
    },
    example: {
      steps: [
        `Work out ${fr(2, 3)} ÷ 4.`,
        `2 cannot be divided by 4, so make an equivalent fraction: ${fr(2, 3)} = ${fr(8, 12)}.`,
        `Now divide the numerator: 8 ÷ 4 = 2, so the answer is ${fr(2, 12)}. (Quick way: 3 × 4 = 12.)`,
        `Simplify: divide the top and the bottom by 2.`,
        `So ${fr(2, 3)} ÷ 4 = ${fr(2, 12)} = <b>${fr(1, 6)}</b>.`,
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        if (shape === 2) {
          const { d, w, n } = draw(() => {
            const d = ri(rng, 3, 6);
            return { d, w: ri(rng, 2, 4), n: ri(rng, 1, d - 1) };
          }, (v) => v.n % v.w !== 0 && gcd(v.n, v.d) === 1, { d: 3, w: 2, n: 1 });
          return num(`To work out ${fr(n, d)} ÷ ${w}, first make an equivalent fraction: ${fr(n, d)} = ${fr(n * w, '□')}. What is the missing number?`, d * w, {
            tier,
            hint: `The numerator was multiplied by ${w}. Do the same to the denominator.`,
            explain: `${d} × ${w} = ${d * w}, so ${fr(n, d)} = ${fr(n * w, d * w)}. Then ${n * w} ÷ ${w} = ${n}, so ${fr(n, d)} ÷ ${w} = ${fr(n, d * w)}.`,
          });
        }
        const d = ri(rng, 2, 5), w = ri(rng, 2, 4);
        const why = `${d} × ${w} = ${d * w}, so ${fr(1, d)} ÷ ${w} = ${fr(1, d * w)}.`;
        if (shape === 1) {
          return frac(`Work out ${fr(1, d)} ÷ ${w}.`, 1, d * w, {
            tier,
            hint: `Split each ${SINGLE[d]} into ${w} equal parts. Multiply the denominator by ${w}.`,
            explain: why,
          });
        }
        return num(`Find the missing number: ${fr(1, d)} ÷ ${w} = ${fr(1, '□')}`, d * w, {
          tier, svg: fracBar(1, d),
          hint: `Cut each piece into ${w} smaller pieces. How many pieces are in the whole now?`,
          explain: why,
        });
      }
      const shape = ri(rng, 1, 3);
      if (shape === 2) {
        // The numerator does not divide, but the answer still simplifies.
        const [n, w] = pick(rng, [[2, 4], [6, 4], [2, 6], [3, 6], [4, 6]]);
        const d = draw(() => ri(rng, n + 1, 7), (v) => gcd(n, v) === 1, 7);
        const D = d * w, g = gcd(n, D), [sn, sd] = simplify(n, D);
        return frac(`Work out ${fr(n, d)} ÷ ${w}. Give the answer in its simplest form.`, sn, sd, {
          exact: true, tier,
          hint: `${n} does not divide by ${w}, so multiply the denominator. Then simplify.`,
          explain: `${d} × ${w} = ${D}, so ${fr(n, d)} ÷ ${w} = ${fr(n, D)}. Divide the top and the bottom by ${g}: ${fr(sn, sd)}.`,
        });
      }
      const { d, n, w } = draw(() => {
        const d = ri(rng, 3, 7);
        return { d, n: ri(rng, 2, d - 1), w: ri(rng, 2, 4) };
      }, (v) => v.n % v.w !== 0 && gcd(v.n, v.d) === 1, { d: 5, n: 2, w: 3 });
      const why = `${n} does not divide by ${w}, so multiply the denominator: ${d} × ${w} = ${d * w}. The answer is ${fr(n, d * w)}.`;
      if (shape === 1) {
        return frac(`Work out ${fr(n, d)} ÷ ${w}.`, n, d * w, {
          tier, hint: `Can ${n} be divided by ${w}? If not, multiply the denominator by ${w}.`, explain: why });
      }
      return frac(`${fr(n, d)} of a pizza is left. ${w} friends share it equally. What fraction of the WHOLE pizza does each friend get?`, n, d * w, {
        tier, hint: `Sharing between ${w} means ÷ ${w}.`, explain: why });
    },
  },

  'u05-l06': {
    intro: {
      text: `Choose your method. If the <b>numerator</b> divides by the whole number, divide the numerator: ${fr(6, 7)} ÷ 2 = ${fr(3, 7)}. If it does not, multiply the <b>denominator</b>: ${fr(3, 5)} ÷ 2 = ${fr(3, 10)}. Dividing by a bigger number gives a smaller answer.`,
      alt: 'There are two ways to divide. Share the top number if you can, or make the pieces smaller by multiplying the bottom number. Sharing between more people means each person gets less.',
    },
    example: {
      steps: [
        `Which is bigger: ${fr(3, 5)} ÷ 3 or ${fr(3, 5)} ÷ 2?`,
        `${fr(3, 5)} ÷ 3: 3 divides by 3, so divide the numerator. The answer is ${fr(1, 5)}.`,
        `${fr(3, 5)} ÷ 2: 3 does not divide by 2, so multiply the denominator. The answer is ${fr(3, 10)}.`,
        `${fr(1, 5)} = ${fr(2, 10)}, and ${fr(3, 10)} is more than ${fr(2, 10)}.`,
        `So <b>${fr(3, 5)} ÷ 2</b> is bigger: sharing into fewer parts gives bigger parts.`,
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        const { d, w, n } = divDraw(rng, rng() < 0.5);
        const ans = divAns(n, d, w);
        if (shape === 1) {
          return frac(`Work out ${fr(n, d)} ÷ ${w}.`, ans[0], ans[1], {
            tier, hint: `Can ${n} be divided by ${w}? If yes, divide the numerator. If not, multiply the denominator.`,
            explain: divWhy(n, d, w) });
        }
        if (shape === 2) {
          // The wrong claims are BIGGER than n/d: multiplying the numerator, or
          // dividing the denominator instead of multiplying it.
          const truth = rng() < 0.5;
          const wrong = n % w !== 0 && d % w === 0 ? [n, d / w] : [n * w, d];
          const shown = truth ? ans : wrong;
          return tf(`True or false: ${fr(n, d)} ÷ ${w} = ${fr(shown[0], shown[1])}`, truth, {
            tier,
            hint: `Dividing makes the answer SMALLER than ${fr(n, d)}.`,
            explain: truth
              ? `True. ${divWhy(n, d, w)}`
              : `False. ${divWhy(n, d, w)} ${fr(shown[0], shown[1])} is bigger than ${fr(n, d)}, but dividing must make it smaller.`,
          });
        }
        return frac(`${fr(n, d)} of a cake is shared equally between ${w} children. What fraction of the WHOLE cake does each child get?`, ans[0], ans[1], {
          tier, hint: `Shared equally between ${w} means ÷ ${w}.`, explain: divWhy(n, d, w) });
      }
      if (shape === 1) {
        const d = ri(rng, 3, 9), n = draw(() => ri(rng, 1, d - 1), (v) => gcd(v, d) === 1, 1);
        const [a, b] = distinctInts(rng, 2, 2, 6), lo = Math.min(a, b);
        const e = (w) => `${fr(n, d)} ÷ ${w}`;
        return mcFrom(rng, 'Which gives the BIGGER answer?', e(lo), [e(a + b - lo), 'They are equal'], {
          tier,
          hint: 'The same amount shared between more people gives each one less.',
          explain: `${e(a)} = ${fr(n, d * a)} and ${e(b)} = ${fr(n, d * b)}. Dividing by the smaller number, ${lo}, gives the bigger answer.`,
        });
      }
      if (shape === 2) {
        const { d, w, k } = draw(() => {
          const w = ri(rng, 2, 4), k = ri(rng, 1, 3);
          return { w, k, d: ri(rng, k * w + 1, 13) };
        }, (v) => gcd(v.k * v.w, v.d) === 1, { d: 7, w: 2, k: 3 });
        return num(`Find the missing number: ${fr('□', d)} ÷ ${w} = ${fr(k, d)}`, k * w, {
          tier,
          hint: `Work backwards: the numerator was divided by ${w}, so multiply ${k} by ${w}.`,
          explain: `${k * w} ÷ ${w} = ${k}, so ${fr(k * w, d)} ÷ ${w} = ${fr(k, d)}.`,
        });
      }
      const { d, w, n } = divDraw(rng, rng() < 0.5);
      const ans = divAns(n, d, w), name = pick(rng, NAMES);
      return frac(`A ribbon is ${fr(n, d)} m long. ${name} cuts it into ${w} equal pieces. How long is each piece, in metres?`, ans[0], ans[1], {
        tier, hint: `${w} equal pieces means ÷ ${w}. Choose your method.`, explain: divWhy(n, d, w) });
    },
  },

  'u05-l07': {
    intro: {
      text: 'Look at the sign and choose the method. For + and −, make the <b>denominators</b> the same, then add or subtract the <b>numerators</b>. For ×, multiply the numerators and multiply the denominators. For ÷ by a <b>whole number</b>, divide the numerator or multiply the denominator.',
      alt: 'Every sign has its own method. Adding or taking away: get the same bottom numbers first. Times: top × top, bottom × bottom. Dividing by a whole number: divide the top, or make the bottom bigger. In a story, "of" means × and "shared equally" means ÷.',
    },
    example: {
      steps: [
        `Ava has ${fr(3, 4)} of a pizza. She eats ${fr(1, 4)} of the whole pizza. She shares the rest equally between 2 friends. What fraction of the whole pizza does each friend get?`,
        `Step 1, eating is taking away: ${fr(3, 4)} − ${fr(1, 4)} = ${fr(2, 4)}.`,
        `Step 2, sharing between 2 is dividing: ${fr(2, 4)} ÷ 2 = ${fr(1, 4)}.`,
        `So each friend gets <b>${fr(1, 4)}</b> of the pizza.`,
      ],
    },
    gen(rng, tier) {
      const name = pick(rng, NAMES);
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        if (shape === 1) {
          // Choose the calculation for a one-step story. A > B, and A − B must
          // not equal A × B (1/2 − 1/3 = 1/2 × 1/3), or two options would be right.
          const [A, B] = draw(() => [pick(rng, POOL), pick(rng, POOL)],
            ([p, q]) => p[0] * q[1] > q[0] * p[1] && p[0] * q[1] - q[0] * p[1] !== p[0] * q[0],
            [[3, 4], [1, 3]]);
          const [n1, d1] = A, [n2, d2] = B, fa = fr(n1, d1), fb = fr(n2, d2), w = ri(rng, 2, 4);
          const add = [`${fa} + ${fb}`, n1 * d2 + n2 * d1, d1 * d2];
          const sub = [`${fa} − ${fb}`, n1 * d2 - n2 * d1, d1 * d2];
          const mul = [`${fa} × ${fb}`, n1 * n2, d1 * d2];
          const story = ri(rng, 1, 4);
          if (story === 1) {
            return mcRat(rng, `${name} drinks ${fa} of a litre of water before lunch and ${fb} of a litre after lunch. Which calculation shows how much ${name} drinks altogether?`, add, [sub, mul], {
              tier, hint: '"Altogether" means put the amounts together.', explain: `Putting two amounts together is adding: ${add[0]}.` });
          }
          if (story === 2) {
            return mcRat(rng, `A jug holds ${fa} of a litre of juice. ${name} pours out ${fb} of a litre. Which calculation shows how much juice is left in the jug?`, sub,
              [add, mul, [`${fb} − ${fa}`, n2 * d1 - n1 * d2, d1 * d2]], {
              tier, hint: '"Left" means take away.', explain: `Pouring some out leaves less, so subtract: ${sub[0]}.` });
          }
          if (story === 3) {
            return mcRat(rng, `${name} has ${fa} of a chocolate bar and eats ${fb} of that piece. Which calculation shows what fraction of the WHOLE bar ${name} eats?`, mul, [add, sub], {
              tier, hint: '"Of" between two fractions means multiply.', explain: `${fb} of ${fa} means ${fb} × ${fa}, the same as ${mul[0]}.` });
          }
          const div = [`${fa} ÷ ${w}`, n1, d1 * w];
          return mcRat(rng, `${fa} of a pizza is shared equally between ${w} friends. Which calculation shows how much of the whole pizza each friend gets?`, div,
            [[`${fa} × ${w}`, n1 * w, d1], [`${fa} + ${w}`, n1 + w * d1, d1]], {
              tier, hint: '"Shared equally" means divide.', explain: `Sharing between ${w} friends is dividing by ${w}: ${div[0]}.` });
        }
        if (shape === 2) {
          // One calculation; the sign tells you the method.
          const op = ri(rng, 1, 4);
          if (op <= 2) {
            const { d, a, b } = draw(() => {
              const d = pick(rng, [5, 7, 8, 9, 10]), a = ri(rng, 2, d - 1);
              return { d, a, b: ri(rng, 1, a - 1) };
            }, (v) => gcd(v.a, v.d) === 1 && gcd(v.b, v.d) === 1 && (op === 2 || v.a + v.b < v.d), { d: 7, a: 4, b: 2 });
            const s = op === 1 ? a + b : a - b, sign = op === 1 ? '+' : '−';
            return frac(`Work out ${fr(a, d)} ${sign} ${fr(b, d)}.`, s, d, {
              tier, hint: `The denominators are the same. ${op === 1 ? 'Add' : 'Subtract'} the numerators.`,
              explain: `${a} ${sign} ${b} = ${s}, and the denominator stays ${d}: ${fr(s, d)}.` });
          }
          if (op === 3) {
            const [n1, d1] = pick(rng, POOL.slice(0, 9)), [n2, d2] = pick(rng, POOL.slice(0, 9));
            return frac(`Work out ${fr(n1, d1)} × ${fr(n2, d2)}.`, n1 * n2, d1 * d2, {
              tier, hint: 'Multiply the numerators. Then multiply the denominators.',
              explain: `${n1} × ${n2} = ${n1 * n2} and ${d1} × ${d2} = ${d1 * d2}: ${fr(n1 * n2, d1 * d2)}.` });
          }
          const { d, w, n } = divDraw(rng, rng() < 0.5);
          return frac(`Work out ${fr(n, d)} ÷ ${w}.`, ...divAns(n, d, w), {
            tier, hint: `Can ${n} be divided by ${w}? If not, multiply the denominator.`, explain: divWhy(n, d, w) });
        }
        // Which sign goes in the box? Only one of the four gives the answer shown.
        const d = ri(rng, 3, 8), n = draw(() => ri(rng, 1, d - 1), (v) => gcd(v, d) === 1, 1), w = ri(rng, 2, 4);
        const times = rng() < 0.5, target = times ? fr(n * w, d) : fr(n, d * w);
        return mc(`Which sign goes in the box? ${fr(n, d)} □ ${w} = ${target}`, ['+', '−', '×', '÷'], times ? 2 : 3, {
          tier,
          hint: `Is ${target} bigger or smaller than ${fr(n, d)}?`,
          explain: times
            ? `${fr(n, d)} × ${w} = ${target}: the numerator was multiplied by ${w}, so the sign is ×.`
            : `${fr(n, d)} ÷ ${w} = ${target}: the denominator was multiplied by ${w} and the pieces got smaller, so the sign is ÷.`,
        });
      }
      if (shape === 1) {
        // Take away, then share.
        const { d, n, m, w } = draw(() => {
          const d = ri(rng, 4, 9), n = ri(rng, 2, d - 1);
          return { d, n, m: ri(rng, 1, n - 1), w: ri(rng, 2, 4) };
        }, (v) => gcd(v.n, v.d) === 1 && gcd(v.m, v.d) === 1, { d: 8, n: 7, m: 3, w: 2 });
        const rest = n - m;
        return frac(`${name} has ${fr(n, d)} of a cake. ${name} eats ${fr(m, d)} of the whole cake, then shares the rest equally between ${w} friends. What fraction of the whole cake does each friend get?`, ...divAns(rest, d, w), {
          tier, hint: 'Two steps: first subtract, then divide by the number of friends.',
          explain: `${fr(n, d)} − ${fr(m, d)} = ${fr(rest, d)}. Then ${fr(rest, d)} ÷ ${w}: ${divWhy(rest, d, w)}` });
      }
      if (shape === 2) {
        // Multiply, then take away.
        const { d, n, w, m } = draw(() => {
          const d = ri(rng, 3, 8), n = ri(rng, 1, d - 1), w = ri(rng, 2, 4);
          return { d, n, w, m: ri(rng, 1, Math.min(d - 1, n * w - 1)) };
        }, (v) => gcd(v.n, v.d) === 1 && gcd(v.m, v.d) === 1 && (v.n * v.w - v.m) % v.d !== 0, { d: 4, n: 3, w: 2, m: 1 });
        const p = n * w, left = p - m;
        return frac(`A cup holds ${fr(n, d)} of a litre. ${name} pours ${w} cups of water into a jug, then uses ${fr(m, d)} of a litre for cooking. How many litres of water are left in the jug?${left > d ? ' (An improper fraction is fine.)' : ''}`, left, d, {
          tier, hint: `Two steps: first ${w} × ${fr(n, d)}, then take away ${fr(m, d)}.`,
          explain: `${w} × ${fr(n, d)} = ${fr(p, d)}. Then ${fr(p, d)} − ${fr(m, d)} = ${fr(left, d)}${left > d ? ` = ${asMixed(left, d)}` : ''} litres.` });
      }
      // Brackets first.
      const times = rng() < 0.5;
      const { d, a, b, w } = draw(() => {
        const d = ri(rng, 5, 10), a = ri(rng, 1, d - 2);
        return { d, a, b: ri(rng, 1, d - 1 - a), w: ri(rng, 2, 4) };
      }, (v) => gcd(v.a, v.d) === 1 && gcd(v.b, v.d) === 1 && (!times || ((v.a + v.b) * v.w) % v.d !== 0), { d: 7, a: 1, b: 2, w: 2 });
      const s = a + b;
      const [an, ad] = times ? [s * w, d] : divAns(s, d, w);
      return frac(`Work out (${fr(a, d)} + ${fr(b, d)}) ${times ? '×' : '÷'} ${w}.${times && s * w > d ? ' (An improper fraction is fine.)' : ''}`, an, ad, {
        tier, hint: 'Work out the brackets first.',
        explain: `Brackets first: ${fr(a, d)} + ${fr(b, d)} = ${fr(s, d)}. Then ${times ? `${fr(s, d)} × ${w} = ${fr(s * w, d)}.` : `${fr(s, d)} ÷ ${w}: ${divWhy(s, d, w)}`}` });
    },
  },

  'u05-l08': {
    intro: {
      text: `To find ${fr(3, 5)} of 40, first divide by the <b>denominator</b>: 40 ÷ 5 = 8, so ${fr(1, 5)} of 40 is 8. Then multiply by the <b>numerator</b>: 8 × 3 = 24. The <b>bar model</b> shows 40 split into 5 equal parts, and 3 of the parts make 24.`,
      alt: 'Divide by the bottom number to find one part. Then multiply by the top number to get the parts you need.',
      svg: barModel(40, [8, 8, 8, 8, 8]),
    },
    example: {
      steps: [
        `Find ${fr(3, 4)} of 32 kg.`,
        `Divide by the denominator: 32 ÷ 4 = 8. So ${fr(1, 4)} of 32 kg is 8 kg.`,
        'Multiply by the numerator: 8 × 3 = 24.',
        `So ${fr(3, 4)} of 32 kg = <b>24 kg</b>.`,
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        if (shape === 2) {
          const { d, n } = draw(() => {
            const d = pick(rng, [3, 4, 5]);
            return { d, n: ri(rng, 2, d - 1) };
          }, (v) => gcd(v.n, v.d) === 1, { d: 5, n: 2 });
          const m = ri(rng, 2, 6), A = d * m;
          return num(`What is ${fr(n, d)} of ${A}?`, n * m, {
            tier, svg: barModel(A, Array(d).fill(m), { partLabels: Array(d).fill('?') }),
            hint: `First find ${fr(1, d)}: ${A} ÷ ${d}. Then multiply by ${n}.`,
            explain: `${A} ÷ ${d} = ${m}, and ${m} × ${n} = ${n * m}.` });
        }
        const d = pick(rng, [2, 3, 4, 5, 6, 8]), m = ri(rng, 2, 10), A = d * m;
        if (shape === 1) {
          return num(`What is ${fr(1, d)} of ${A}?`, m, {
            tier, svg: barModel(A, Array(d).fill(m), { partLabels: Array(d).fill('?') }),
            hint: `Split ${A} into ${d} equal parts: divide by ${d}.`,
            explain: `${A} ÷ ${d} = ${m}.` });
        }
        return num(`There are ${A} children in a club. ${fr(1, d)} of them play chess. How many children play chess?`, m, {
          tier, hint: `${fr(1, d)} of ${A} means ${A} ÷ ${d}.`,
          explain: `${A} ÷ ${d} = ${m}, so ${m} children play chess.` });
      }
      const { d, n } = draw(() => {
        const d = pick(rng, [3, 4, 5, 6, 8, 10]);
        return { d, n: ri(rng, 2, d - 1) };
      }, (v) => gcd(v.n, v.d) === 1, { d: 5, n: 3 });
      const m = ri(rng, 3, 12), A = d * m, part = n * m, name = pick(rng, NAMES);
      const steps = `${A} ÷ ${d} = ${m}, and ${m} × ${n} = ${part}.`;
      if (shape === 1) {
        return num(`What is ${fr(n, d)} of ${A}?`, part, {
          tier, hint: `Divide by the denominator (${d}), then multiply by the numerator (${n}).`, explain: steps });
      }
      if (shape === 2) {
        if (rng() < 0.5) {
          return num(`A rope is ${A} m long. ${fr(n, d)} of the rope is painted red. How many metres are red?`, part, {
            unit: 'm', tier, hint: `Find ${fr(1, d)} of ${A} m first.`, explain: `${steps} So ${part} m are red.` });
        }
        return num(`A bag holds ${A} kg of rice. ${name} uses ${fr(n, d)} of the rice. How many kilograms does ${name} use?`, part, {
          unit: 'kg', tier, hint: `Find ${fr(1, d)} of ${A} kg first.`, explain: `${steps} So ${name} uses ${part} kg.` });
      }
      return num(`${name} has £${A} and spends ${fr(n, d)} of it. How many pounds does ${name} have LEFT?`, A - part, {
        tier, hint: `Find ${fr(n, d)} of £${A} first. Then take it away from £${A}.`,
        explain: `£${A} ÷ ${d} = £${m}, and £${m} × ${n} = £${part} spent. £${A} − £${part} = £${A - part} left.` });
    },
  },

  'u05-l09': {
    intro: {
      text: `Sometimes you know a part and need the <b>whole</b>. If ${fr(2, 5)} of a number is 12, then 2 parts are worth 12, so 1 part is 12 ÷ 2 = 6. The whole has 5 parts: 6 × 5 = 30.`,
      alt: 'Work backwards. Divide by the top number to find one part. Then multiply by the bottom number to find the whole.',
      svg: barModel(5, [2, 3], { partLabels: ['2/5 = 12', '3/5'], wholeLabel: '? (the whole)' }),
    },
    example: {
      steps: [
        `${fr(3, 4)} of a number is 18. What is the number?`,
        '3 parts are worth 18, so one part is 18 ÷ 3 = 6.',
        'The whole has 4 parts: 6 × 4 = 24.',
        'So the number is <b>24</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        if (shape === 2) {
          const { d, n } = draw(() => {
            const d = pick(rng, [3, 4, 5, 6]);
            return { d, n: ri(rng, 2, d - 1) };
          }, (v) => gcd(v.n, v.d) === 1, { d: 5, n: 2 });
          const m = ri(rng, 2, 10), x = n * m;
          return num(`${fr(n, d)} of a number is ${x}. What is ${fr(1, d)} of the number?`, m, {
            tier, svg: barModel(d, [n, d - n], { partLabels: [`${n}/${d} = ${x}`, `${d - n}/${d}`], wholeLabel: '?' }),
            hint: `${n} parts are worth ${x}. Divide by ${n} to find one part.`,
            explain: `${x} ÷ ${n} = ${m}, so ${fr(1, d)} of the number is ${m}.` });
        }
        const d = pick(rng, [2, 3, 4, 5, 6, 8]), x = ri(rng, 3, 12);
        if (shape === 1) {
          return num(`${fr(1, d)} of a number is ${x}. What is the number?`, x * d, {
            tier, svg: barModel(d, Array(d).fill(1), { partLabels: [String(x), ...Array(d - 1).fill('')], wholeLabel: '?' }),
            hint: `One part is ${x}. The whole has ${d} equal parts.`,
            explain: `${x} × ${d} = ${x * d}.` });
        }
        return num(`${fr(1, d)} of the children in a choir are boys. There are ${x} boys. How many children are in the choir?`, x * d, {
          tier, hint: `${x} is one part. The whole choir is ${d} parts.`,
          explain: `${x} × ${d} = ${x * d} children.` });
      }
      const { d, n } = draw(() => {
        const d = pick(rng, [3, 4, 5, 6, 8]);
        return { d, n: ri(rng, 2, d - 1) };
      }, (v) => gcd(v.n, v.d) === 1, { d: 5, n: 2 });
      const m = ri(rng, 2, 12), x = n * m, whole = d * m;
      const back = `${x} ÷ ${n} = ${m}, so one part is ${m}.`;
      if (shape === 1) {
        return num(`${fr(n, d)} of a number is ${x}. What is the number?`, whole, {
          tier, svg: barModel(d, [n, d - n], { partLabels: [`${n}/${d} = ${x}`, `${d - n}/${d}`], wholeLabel: '?' }),
          hint: `Divide by the numerator (${n}) to find one part, then multiply by the denominator (${d}).`,
          explain: `${back} The whole is ${m} × ${d} = ${whole}.` });
      }
      if (shape === 2) {
        const name = pick(rng, NAMES);
        return num(`${name} has read ${fr(n, d)} of a book. That is ${x} pages. How many pages are in the whole book?`, whole, {
          tier, hint: `${x} pages is ${n} parts. Find one part first.`,
          explain: `${back} The whole book is ${m} × ${d} = ${whole} pages.` });
      }
      const more = d - n === 1 ? '1 more part' : `${d - n} more parts`;
      return num(`A water tank is ${fr(n, d)} full. There are ${x} litres of water in it. How many MORE litres are needed to fill the tank?`, (d - n) * m, {
        unit: 'litres', tier, hint: `Find one part first. The tank still needs ${more}.`,
        explain: `${back} The tank needs ${more}: ${d - n} × ${m} = ${(d - n) * m} litres.` });
    },
  },

  // ================================================================ Unit 6

  'u06-l01': {
    intro: {
      text: '<b>Coordinates</b> tell you where a point is. In (4, 2) the first number is the <b>x-coordinate</b>: go 4 along the <b>x-axis</b>. The second number is the <b>y-coordinate</b>: then go 2 up. Start at the <b>origin</b>, (0, 0): along the corridor first, then up the stairs.',
      alt: 'The first number says how far across. The second number says how far up. Always go across first, then up.',
      svg: coordGrid(6, [[4, 2, 'A']]),
    },
    example: {
      steps: [
        'Point B is 3 squares across and 5 squares up from the origin. What are its coordinates?',
        'Across first: the x-coordinate is 3.',
        'Then up: the y-coordinate is 5.',
        'So B is at <b>(3, 5)</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        const { x, y } = draw(() => ({ x: ri(rng, 1, 7), y: ri(rng, 1, 7) }), (v) => shape === 1 || v.x !== v.y, { x: 3, y: 5 });
        const svg = coordGrid(8, [[x, y, 'P']]);
        if (shape === 1) {
          return mcFrom(rng, 'What are the coordinates of point P?', pt(x, y), [pt(y, x), pt(x + 1, y), pt(x, y + 1), pt(x - 1, y)], {
            tier, svg, hint: 'Along first (x), then up (y).',
            explain: `P is ${x} along and ${y} up, so it is at ${pt(x, y)}.` });
        }
        if (shape === 2) {
          return num('What is the x-coordinate of point P?', x, {
            tier, svg, hint: 'The x-coordinate is how far ALONG from the origin.',
            explain: `P is ${x} along and ${y} up. The x-coordinate is ${x}.` });
        }
        return num('What is the y-coordinate of point P?', y, {
          tier, svg, hint: 'The y-coordinate is how far UP from the origin.',
          explain: `P is ${x} along and ${y} up. The y-coordinate is ${y}.` });
      }
      if (shape === 3) {
        const k = ri(rng, 2, 9), onX = rng() < 0.5;
        return mcFrom(rng, onX
          ? `Point P is on the x-axis, ${k} squares to the right of the origin. What are its coordinates?`
          : `Point P is on the y-axis, ${k} squares up from the origin. What are its coordinates?`,
        onX ? pt(k, 0) : pt(0, k),
        onX ? [pt(0, k), pt(k, k), pt(1, k)] : [pt(k, 0), pt(k, k), pt(k, 1)], {
          tier,
          hint: onX ? 'On the x-axis you have not gone up at all.' : 'On the y-axis you have not gone along at all.',
          explain: onX ? `${k} along and 0 up: ${pt(k, 0)}.` : `0 along and ${k} up: ${pt(0, k)}.` });
      }
      // Every marked point is at least 2 squares from the others, so each
      // label (drawn up and to the right of its dot) sits by one dot only.
      const far = (p, q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) >= 2;
      const { x, y } = draw(() => ({ x: ri(rng, 1, 7), y: ri(rng, 1, 7) }), (v) => Math.abs(v.x - v.y) >= 2, { x: 2, y: 5 });
      const P = [x, y], labels = ['A', 'B', 'C', 'D'];
      const step = (v) => (v + 2 > 8 ? -2 : v - 2 < 0 ? 2 : pick(rng, [2, -2]));
      if (shape === 1) {
        // Plot: which marked point is at (x, y)? The others are x and y swapped,
        // and a miscount along or up.
        const pts = shuffle(rng, [P, [y, x], [x + step(x), y], [x, y + step(y)]]);
        const i = pts.indexOf(P);
        return mc(`Which point is at ${pt(x, y)}?`, labels, i, {
          tier, svg: coordGrid(8, pts.map((p, j) => [p[0], p[1], labels[j]])),
          hint: 'Go along the x-axis first, then up.',
          explain: `${labels[i]} is ${x} along and ${y} up, so it is at ${pt(x, y)}.` });
      }
      // Read one of three marked points.
      const pool = [];
      for (let i = 1; i <= 7; i++) for (let j = 1; j <= 7; j++) if (far([i, j], P)) pool.push([i, j]);
      const [o1, ...rest] = shuffle(rng, pool), o2 = rest.find((o) => far(o, o1));
      const pts = shuffle(rng, [P, o1, o2]), L = labels[pts.indexOf(P)];
      return mcFrom(rng, `What are the coordinates of point ${L}?`, pt(x, y), [pt(y, x), pt(...o1), pt(...o2), pt(x + 1, y)], {
        tier, svg: coordGrid(8, pts.map((p, j) => [p[0], p[1], labels[j]])),
        hint: `Find ${L}. Go along first, then up.`,
        explain: `${L} is ${x} along and ${y} up, so it is at ${pt(x, y)}.` });
    },
  },

  'u06-l02': {
    intro: {
      text: 'The <b>x-axis</b> and the <b>y-axis</b> also go past 0 into <b>negative numbers</b>. They cross at the <b>origin</b>, (0, 0), and cut the grid into four <b>quadrants</b>. A is at (−3, 2): 3 to the left, then 2 up. B is at (2, −4): 2 to the right, then 4 down.',
      alt: 'A negative x-coordinate means go left. A negative y-coordinate means go down. It is still across first, then up or down.',
      svg: coordGrid4(5, [[-3, 2, 'A'], [2, -4, 'B']]),
    },
    example: {
      steps: [
        'Point C is 4 squares to the left of the y-axis and 1 square below the x-axis. What are its coordinates?',
        'Left means the x-coordinate is negative: −4.',
        'Below means the y-coordinate is negative: −1.',
        'So C is at <b>(−4, −1)</b>.',
      ],
    },
    gen(rng, tier) {
      const Q = ['top right', 'top left', 'bottom left', 'bottom right'];
      const shape = ri(rng, 1, 4);
      const describe = (x, y) => `${sq(Math.abs(x))} to the ${x > 0 ? 'right' : 'left'} of the y-axis and ${sq(Math.abs(y))} ${y > 0 ? 'above' : 'below'} the x-axis`;
      const fromWords = (max) => {
        const x = ri(rng, 1, max) * pick(rng, [1, -1]), y = ri(rng, 1, max) * pick(rng, [1, -1]);
        return mcFrom(rng, `A point is ${describe(x, y)}. What are its coordinates?`, pt(x, y),
          [pt(-x, y), pt(x, -y), pt(-x, -y), pt(y, x)], {
            tier, hint: 'Right and above are positive. Left and below are negative.',
            explain: `x is ${x > 0 ? 'positive (right)' : 'negative (left)'} and y is ${y > 0 ? 'positive (above)' : 'negative (below)'}: ${pt(x, y)}.` });
      };
      // A point on the four-quadrant grid, off both axes and NOT in the top
      // right (that was lesson 1), x different from y so a swapped answer is wrong.
      const offQ1 = () => draw(() => [ri(rng, -4, 4), ri(rng, -4, 4)],
        ([x, y]) => x !== 0 && y !== 0 && (x < 0 || y < 0) && x !== y, [-3, 2]);
      const where = (x, y) => `${sq(Math.abs(x))} to the ${x > 0 ? 'right' : 'left'}, then ${sq(Math.abs(y))} ${y > 0 ? 'up' : 'down'}`;
      if (tier === 1) {
        if (shape === 1) {
          // The class task: read the coordinates of P off the grid.
          const [x, y] = offQ1();
          return mcFrom(rng, 'What are the coordinates of point P?', pt(x, y), [pt(y, x), pt(-x, y), pt(x, -y), pt(-x, -y)], {
            tier, svg: coordGrid4(5, [[x, y, 'P']]),
            hint: 'Start at the origin. Go along first: right is positive, left is negative. Then up is positive, down is negative.',
            explain: `From the origin, P is ${where(x, y)}. So P is at ${pt(x, y)}.` });
        }
        if (shape === 2) {
          const [x, y] = offQ1();
          const askX = rng() < 0.5, ans = askX ? x : y;
          return cnum(`What is the ${askX ? 'x' : 'y'}-coordinate of point P?`, ans, {
            tier, svg: coordGrid4(5, [[x, y, 'P']]),
            hint: askX ? 'How far right or left of the origin is P? Left is negative.' : 'How far up or down from the origin is P? Down is negative.',
            explain: `P is ${where(x, y)}, so it is at ${pt(x, y)}. The ${askX ? 'x' : 'y'}-coordinate is ${neg(ans)}.` });
        }
        if (shape === 3) {
          const x = ri(rng, 1, 6) * pick(rng, [1, -1]), y = ri(rng, 1, 6) * pick(rng, [1, -1]);
          const i = y > 0 ? (x > 0 ? 0 : 1) : (x < 0 ? 2 : 3);
          return mc(`Which quadrant is the point ${pt(x, y)} in?`, Q, i, {
            tier, hint: 'A negative x means left of the y-axis. A negative y means below the x-axis.',
            explain: `x = ${neg(x)}, so go ${x > 0 ? 'right' : 'left'}. y = ${neg(y)}, so go ${y > 0 ? 'up' : 'down'}. That is the ${Q[i]} quadrant.` });
        }
        if (rng() < 0.5) {
          const x = ri(rng, 1, 6) * pick(rng, [1, -1]), y = ri(rng, 1, 6) * pick(rng, [1, -1]);
          const askX = rng() < 0.5, ans = askX ? x : y;
          return cnum(`A point is ${describe(x, y)}. What is its ${askX ? 'x' : 'y'}-coordinate?`, ans, {
            tier, hint: askX ? 'Right is positive. Left is negative.' : 'Above is positive. Below is negative.',
            explain: `The ${askX ? 'x' : 'y'}-coordinate is ${neg(ans)}. The point is ${pt(x, y)}.` });
        }
        return fromWords(5);
      }
      if (shape === 1) {
        // Plot: which marked point is at (x, y)? The other three are the
        // classic slips — x and y swapped, the sign of x wrong, the sign of y wrong.
        const [x, y] = draw(() => [ri(rng, -4, 4), ri(rng, -4, 4)],
          ([a, b]) => a !== 0 && b !== 0 && (a < 0 || b < 0) && Math.abs(a - b) >= 2, [-3, 1]);
        const P = [x, y], labels = ['A', 'B', 'C', 'D'];
        const pts = shuffle(rng, [P, [y, x], [-x, y], [x, -y]]);
        const i = pts.indexOf(P);
        return mc(`Which point is at ${pt(x, y)}?`, labels, i, {
          tier, svg: coordGrid4(5, pts.map((p, j) => [p[0], p[1], labels[j]])),
          hint: 'Go along the x-axis first (left for negative), then up or down (down for negative).',
          explain: `${labels[i]} is ${where(x, y)} from the origin, so it is at ${pt(x, y)}.` });
      }
      if (shape === 2) {
        // Read one of three marked points, at least 2 squares apart.
        const P = offQ1(), labels = ['A', 'B', 'C'];
        const pool = [];
        for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) if (i && j && apart([i, j], P)) pool.push([i, j]);
        const [o1, ...rest] = shuffle(rng, pool), o2 = rest.find((o) => apart(o, o1));
        const pts = shuffle(rng, [P, o1, o2]), L = labels[pts.indexOf(P)];
        return mcFrom(rng, `What are the coordinates of point ${L}?`, pt(...P), [pt(P[1], P[0]), pt(...o1), pt(...o2), pt(-P[0], P[1])], {
          tier, svg: coordGrid4(5, pts.map((p, j) => [p[0], p[1], labels[j]])),
          hint: `Find ${L}. Go along first, then up or down. Left and down are negative.`,
          explain: `${L} is ${where(...P)} from the origin, so it is at ${pt(...P)}.` });
      }
      if (shape === 3) {
        if (rng() < 0.5) return fromWords(9);
        const m = () => ri(rng, 1, 8);
        const pts = [[m(), m()], [-m(), m()], [-m(), -m()], [m(), -m()]];   // in the order of Q
        const i = ri(rng, 0, 3);
        return mcFrom(rng, `Which point is in the ${Q[i]} quadrant?`, pt(...pts[i]), pts.filter((_, j) => j !== i).map((p) => pt(...p)), {
          tier,
          hint: `In the ${Q[i]} quadrant, x is ${i === 0 || i === 3 ? 'positive' : 'negative'} and y is ${i <= 1 ? 'positive' : 'negative'}.`,
          explain: `${pt(...pts[i])} has x ${pts[i][0] > 0 ? 'positive' : 'negative'} and y ${pts[i][1] > 0 ? 'positive' : 'negative'}, so it is in the ${Q[i]} quadrant.` });
      }
      const k = ri(rng, 1, 7) * pick(rng, [1, -1]), k2 = ri(rng, 1, 7) * pick(rng, [1, -1]), onX = rng() < 0.5;
      return mcFrom(rng, `Which of these points is on the ${onX ? 'x' : 'y'}-axis?`, onX ? pt(k, 0) : pt(0, k),
        onX ? [pt(0, k), pt(k, k2), pt(k2, k)] : [pt(k, 0), pt(k, k2), pt(k2, k)], {
          tier,
          hint: onX ? 'Every point on the x-axis has y-coordinate 0.' : 'Every point on the y-axis has x-coordinate 0.',
          explain: onX ? `${pt(k, 0)} has y = 0, so it is on the x-axis.` : `${pt(0, k)} has x = 0, so it is on the y-axis.` });
    },
  },

  'u06-l03': {
    intro: {
      text: 'To <b>translate</b> a point, slide it: right or left changes the <b>x-coordinate</b>, up or down changes the <b>y-coordinate</b>. A at (1, 1) moves 3 right and 2 up to A′ at (4, 3). To <b>reflect</b> a point in the <b>y-axis</b>, change the sign of x: (3, 2) → (−3, 2). To reflect it in the <b>x-axis</b>, change the sign of y: (3, 2) → (3, −2).',
      alt: 'Translate means slide: right and left change the first number, up and down change the second number. Reflect means flip in a mirror line: one number gets the opposite sign, and the other number stays the same.',
      svg: coordGrid(6, [[1, 1, 'A'], [4, 3, 'A′']]),
    },
    example: {
      steps: [
        'Translate the point (2, 5) 4 squares left and 3 squares down.',
        'Left changes x: 2 − 4 = −2.',
        'Down changes y: 5 − 3 = 2.',
        'So the new point is <b>(−2, 2)</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      const DIRS = { right: [1, 0], left: [-1, 0], up: [0, 1], down: [0, -1] };
      // A on the four-quadrant grid with the mirror axis drawn; the image is not.
      const reflect = (x, y) => {
        const inX = rng() < 0.5, [rx, ry] = inX ? [x, -y] : [-x, y];
        return mcFrom(rng, `Point A is at ${pt(x, y)}. Reflect it in the ${inX ? 'x' : 'y'}-axis. What are the new coordinates?`, pt(rx, ry),
          [inX ? pt(-x, y) : pt(x, -y), pt(-x, -y), pt(ry, rx), pt(x, y)], {
            tier, svg: coordGrid4(5, [[x, y, 'A']], { mirror: inX ? 'x' : 'y' }),
            hint: inX ? 'Reflecting in the x-axis changes the sign of the y-coordinate only.' : 'Reflecting in the y-axis changes the sign of the x-coordinate only.',
            explain: inX
              ? `In the x-axis, y = ${neg(y)} becomes ${neg(-y)}, and x stays ${neg(x)}: ${pt(rx, ry)}.`
              : `In the y-axis, x = ${neg(x)} becomes ${neg(-x)}, and y stays ${neg(y)}: ${pt(rx, ry)}.` });
      };
      if (tier === 1) {
        if (shape === 3) return reflect(ri(rng, 1, 4), ri(rng, 1, 4));
        // One move, staying on the first-quadrant grid.
        const x = ri(rng, 1, 7), y = ri(rng, 1, 7), dir = pick(rng, ['right', 'left', 'up', 'down']);
        const room = { right: 8 - x, left: x, up: 8 - y, down: y }[dir];
        const k = ri(rng, 1, Math.min(5, room)), [ux, uy] = DIRS[dir];
        const nx = x + ux * k, ny = y + uy * k, across = ux !== 0;
        const sign = ux + uy > 0 ? '+' : '−';
        const why = across
          ? `Moving ${dir} changes x: ${x} ${sign} ${k} = ${nx}. y stays ${y}. The new point is ${pt(nx, ny)}.`
          : `Moving ${dir} changes y: ${y} ${sign} ${k} = ${ny}. x stays ${x}. The new point is ${pt(nx, ny)}.`;
        if (shape === 1) {
          const otherAxis = across ? pt(x, y + ux * k) : pt(x + uy * k, y);
          return mcFrom(rng, `Point A is at ${pt(x, y)}. Translate it ${sq(k)} ${dir}. What are the new coordinates?`, pt(nx, ny),
            [otherAxis, pt(x - ux * k, y - uy * k), pt(ny, nx)], {
              tier, svg: coordGrid(8, [[x, y, 'A']]),
              hint: across ? 'Right and left change the x-coordinate (the first number).' : 'Up and down change the y-coordinate (the second number).',
              explain: why });
        }
        const askX = rng() < 0.5, ans = askX ? nx : ny, moved = askX === across;
        return num(`Point A is at ${pt(x, y)}. It is translated ${sq(k)} ${dir}. What is the new ${askX ? 'x' : 'y'}-coordinate?`, ans, {
          tier, svg: coordGrid(8, [[x, y, 'A']]),
          hint: across ? 'Right and left change only the x-coordinate.' : 'Up and down change only the y-coordinate.',
          explain: moved ? why : `Moving ${dir} does not change the ${askX ? 'x' : 'y'}-coordinate, so it stays ${ans}. The new point is ${pt(nx, ny)}.` });
      }
      if (shape === 1) {
        // P is drawn, its image is not; both stay on the grid and the move
        // crosses at least one axis.
        const { px, py, a, b, sx, sy } = draw(() => ({
          px: ri(rng, -4, 4), py: ri(rng, -4, 4), a: ri(rng, 1, 6), b: ri(rng, 1, 6),
          sx: pick(rng, [1, -1]), sy: pick(rng, [1, -1]),
        }), (v) => inGrid(v.px + v.sx * v.a, v.py + v.sy * v.b)
          && (Math.sign(v.px + v.sx * v.a) !== Math.sign(v.px) || Math.sign(v.py + v.sy * v.b) !== Math.sign(v.py)),
        { px: 2, py: 1, a: 4, b: 3, sx: -1, sy: 1 });
        const nx = px + sx * a, ny = py + sy * b;
        return mcFrom(rng, `Point P is at ${pt(px, py)}. Translate it ${sq(a)} ${sx > 0 ? 'right' : 'left'} and ${sq(b)} ${sy > 0 ? 'up' : 'down'}. What are the new coordinates?`, pt(nx, ny),
          [pt(px - sx * a, ny), pt(nx, py - sy * b), pt(px - sx * a, py - sy * b), pt(nx, py)], {
            tier, svg: coordGrid4(5, [[px, py, 'P']]),
            hint: 'Right and left change x. Up and down change y. You can count the squares on the grid.',
            explain: `x: ${neg(px)} ${sx > 0 ? '+' : '−'} ${a} = ${neg(nx)}. y: ${neg(py)} ${sy > 0 ? '+' : '−'} ${b} = ${neg(ny)}. The new point is ${pt(nx, ny)}.` });
      }
      if (shape === 2) return reflect(ri(rng, 1, 4) * pick(rng, [1, -1]), ri(rng, 1, 4) * pick(rng, [1, -1]));
      // Describe the translation from A to B, both drawn, at least 2 squares apart.
      const { ax, ay, dx, dy } = draw(() => ({
        ax: ri(rng, -4, 4), ay: ri(rng, -4, 4),
        dx: ri(rng, 1, 5) * pick(rng, [1, -1]), dy: ri(rng, 1, 5) * pick(rng, [1, -1]),
      }), (v) => inGrid(v.ax + v.dx, v.ay + v.dy) && Math.max(Math.abs(v.dx), Math.abs(v.dy)) >= 2,
      { ax: -3, ay: 2, dx: 5, dy: -4 });
      const bx = ax + dx, by = ay + dy;
      const desc = (h, v) => `${Math.abs(h)} ${h > 0 ? 'right' : 'left'}, ${Math.abs(v)} ${v > 0 ? 'up' : 'down'}`;
      const swapped = `${Math.abs(dy)} ${dx > 0 ? 'right' : 'left'}, ${Math.abs(dx)} ${dy > 0 ? 'up' : 'down'}`;
      return mcFrom(rng, `Point A ${pt(ax, ay)} is translated to point B ${pt(bx, by)}. Which describes the translation?`, desc(dx, dy),
        [desc(-dx, -dy), swapped, desc(-dx, dy), desc(dx, -dy)], {
          tier, svg: coordGrid4(5, [[ax, ay, 'A'], [bx, by, 'B']]),
          hint: 'Compare the x-coordinates for right or left, then the y-coordinates for up or down.',
          explain: `x goes from ${neg(ax)} to ${neg(bx)}: ${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}. y goes from ${neg(ay)} to ${neg(by)}: ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}.` });
    },
  },

  'u06-l04': {
    intro: {
      text: 'You can use coordinates to find a missing <b>vertex</b> of a shape. In a rectangle the sides go straight across or straight up, so <b>vertices</b> next to each other share an x-coordinate or a y-coordinate. Side AB goes from (1, 2) to (6, 2), so it is 6 − 1 = 5 squares long.',
      alt: 'Points on the same up-and-down line have the same first number. Points on the same across line have the same second number. Subtract to find how long a side is.',
      svg: coordGrid(7, [[1, 2, 'A'], [6, 2, 'B'], [6, 5, 'C'], [1, 5, 'D']], { poly: true }),
    },
    example: {
      steps: [
        'ABCD is a rectangle. A is at (1, 2), B is at (6, 2) and C is at (6, 5). Where is D?',
        'D is straight above A, so it has the same x-coordinate as A: 1.',
        'D is level with C, so it has the same y-coordinate as C: 5.',
        'So D is at <b>(1, 5)</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        const x0 = ri(rng, 1, 4), y0 = ri(rng, 1, 4), w = ri(rng, 2, 4), h = ri(rng, 2, 3);
        if (shape === 1) {
          const A = [x0, y0], B = [x0 + w, y0], C = [x0 + w, y0 + h], D = [x0, y0 + h];
          const svg = coordGrid(8, [[...A, 'A'], [...B, 'B'], [...C, 'C'], [...D, 'D']], { poly: true });
          if (rng() < 0.5) {
            return num(`ABCD is a rectangle. A is at ${pt(...A)} and B is at ${pt(...B)}. How many squares long is side AB?`, w, {
              tier, svg, hint: 'A and B have the same y-coordinate. Subtract the x-coordinates.',
              explain: `${B[0]} − ${A[0]} = ${w}, so side AB is ${w} squares long.` });
          }
          return num(`ABCD is a rectangle. B is at ${pt(...B)} and C is at ${pt(...C)}. How many squares long is side BC?`, h, {
            tier, svg, hint: 'B and C have the same x-coordinate. Subtract the y-coordinates.',
            explain: `${C[1]} − ${B[1]} = ${h}, so side BC is ${h} squares long.` });
        }
        const [A, B, C, D] = rectCycle(rng, x0, y0, w, h);
        const svg = coordGrid(8, [[...A, 'A'], [...B, 'B'], [...C, 'C']]);
        const given = `ABCD is a rectangle. A is at ${pt(...A)}, B is at ${pt(...B)} and C is at ${pt(...C)}.`;
        if (shape === 2) {
          return mcFrom(rng, `${given} Where is D?`, pt(...D), [pt(D[1], D[0]), pt(D[0] + 1, D[1]), pt(D[0], D[1] + 1), pt(D[0] - 1, D[1])], {
            tier, svg, hint: 'D lines up with A on one side and with C on the other side.', explain: vertexWhy(A, C, D) });
        }
        const askX = rng() < 0.5;
        return num(`${given} What is the ${askX ? 'x' : 'y'}-coordinate of D?`, askX ? D[0] : D[1], {
          tier, svg, hint: 'D lines up with A on one side and with C on the other side.', explain: vertexWhy(A, C, D) });
      }
      if (shape === 1) {
        // A, B and C are drawn, D is not.
        const square = rng() < 0.4;
        const x0 = ri(rng, -4, 1), w = ri(rng, 2, Math.min(6, 4 - x0));
        const h = square ? w : ri(rng, 2, 6);
        const y0 = ri(rng, -4, Math.min(1, 4 - h));
        const [A, B, C, D] = rectCycle(rng, x0, y0, w, h);
        return mcFrom(rng, `ABCD is a ${square ? 'square' : 'rectangle'}. A is at ${pt(...A)}, B is at ${pt(...B)} and C is at ${pt(...C)}. What are the coordinates of D?`, pt(...D),
          [pt(D[1], D[0]), pt(-D[0], D[1]), pt(D[0], -D[1]), pt(D[0] + 1, D[1]), pt(D[0], D[1] + 1), pt(D[0] - 1, D[1])], {
            tier, svg: coordGrid4(5, [[...A, 'A'], [...B, 'B'], [...C, 'C']]),
            hint: 'D lines up with A on one side and with C on the other side.', explain: vertexWhy(A, C, D) });
      }
      if (shape === 2) {
        // A side that crosses an axis: count to 0, then on from 0.
        const across = rng() < 0.5, c = ri(rng, -4, 4), lo = -ri(rng, 1, 4), hi = ri(rng, 1, 4);
        const A = across ? [lo, c] : [c, lo], B = across ? [hi, c] : [c, hi];
        return num(`AB is one side of a square. A is at ${pt(...A)} and B is at ${pt(...B)}. How many squares long is each side of the square?`, hi - lo, {
          tier, svg: coordGrid4(5, [[...A, 'A'], [...B, 'B']]),
          hint: across
            ? `A and B have the same y-coordinate. Count from ${neg(lo)} to 0, then from 0 to ${hi}.`
            : `A and B have the same x-coordinate. Count from ${neg(lo)} to 0, then from 0 to ${hi}.`,
          explain: `From ${neg(lo)} to 0 is ${-lo}. From 0 to ${hi} is ${hi}. ${-lo} + ${hi} = ${hi - lo}, so each side is ${hi - lo} squares long.` });
      }
      const x0 = ri(rng, -4, 2), y0 = ri(rng, -4, 2);
      const w = ri(rng, 2, Math.min(6, 4 - x0)), h = ri(rng, 2, Math.min(6, 4 - y0));
      const cs = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
      return num(`Rectangle ABCD has vertices A ${pt(...cs[0])}, B ${pt(...cs[1])}, C ${pt(...cs[2])} and D ${pt(...cs[3])}. Each unit on the axes is 1 cm. What is the perimeter of the rectangle?`, 2 * (w + h), {
        unit: 'cm', tier, svg: coordGrid4(5, cs.map((p, j) => [...p, 'ABCD'[j]]), { poly: true }),
        hint: 'Find the width (look at the x-coordinates) and the height (look at the y-coordinates) first.',
        explain: `Width: from ${neg(x0)} to ${neg(x0 + w)} is ${w} cm. Height: from ${neg(y0)} to ${neg(y0 + h)} is ${h} cm. Perimeter = ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} cm.` });
    },
  },
};
