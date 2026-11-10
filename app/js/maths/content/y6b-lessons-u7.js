// Lesson-precise warm-ups for Unit 7 — Decimals (book 6B), lessons 1–9 (phase B9).
// Contract: previewOf() in lessons.js. Each entry has an intro (one idea, in the
// explanation-segment shape), a worked example, and gen(rng, tier) for tiers 1–2
// of exactly that lesson's task type. The practice book is not available, so
// each lesson's task type is inferred from its title in the Pearson overview.
//
// Rules kept here (CLAUDE.md non-negotiables 4, 5, 8; the header of y6b.js):
//  - Every decimal is built from integers with dv() / shift(), never by float
//    arithmetic on decimals, and every answer is computed from the drawn values.
//    Divisions are drawn answer-first: 7.2 ÷ 4 is q = 18 (1.8), dividend dv(18 × 4, 1).
//  - Every number question goes through dnum(), so the pad always offers "."
//    (whole-number answers included). Answers have at most 3 decimal places.
//  - Every displayed decimal goes through dec() (money() for pounds, fixed() where
//    the zeros on the end are the point). pvChart rows take String(v): a
//    thousands comma would land in a column of its own.
//  - Multiple-choice decimals are canonical dec() strings, so two options equal
//    in value are equal as strings and mcFrom drops one. Fraction options go
//    through mcRat, which drops value-equal fractions (25/100 beside 1/4).
//  - Distractors are misconceptions: "put a 0 on the end", moved the digits the
//    wrong number of columns or the wrong way, did only one of two steps, read
//    3/5 as 0.35, wrote the remainder as the decimal, forgot an exchange.
//  - Only the passed rng is used, and no scenario() decks: one seed, one prompt.
//    q.tier is set on every question kind.
//  - No recurring decimals: every fraction turned into a decimal has a
//    denominator that divides 1,000.

import { tf, mcFrom, frac, fr, ri, pick, money } from './gen.js';
import { pvChart, hundredSquare, fracBar, barModel } from './vis.js';
import { gcd, simplify, mixed } from './y6a-frac.js';
import { dv, shift, placesOf, dec, fixed, dnum, NAMES } from './y6b.js';

// ------------------------------------------------------------------ helpers

const P10 = (k) => 10 ** k;                 // 10, 100, 1000 as exact integers
const PLACES = {
  4: 'ten thousands', 3: 'thousands', 2: 'hundreds', 1: 'tens', 0: 'ones',
  '-1': 'tenths', '-2': 'hundredths', '-3': 'thousandths', '-4': 'ten-thousandths',
};
const PLACE1 = {
  4: 'ten thousand', 3: 'thousand', 2: 'hundred', 1: 'ten', 0: 'one',
  '-1': 'tenth', '-2': 'hundredth', '-3': 'thousandth', '-4': 'ten-thousandth',
};
// "1 tenth", "12 tenths": the place name for a count of that place.
const pl = (place, count) => (count === 1 ? PLACE1[place] : PLACES[place]);
const cols = (k) => (k === 1 ? '1 column' : `${k} columns`);
const den = (d) => dec(d);                  // 1000 → '1,000' in a fraction
// Place of the leading digit of int / 10^places: (345, 2) → 0 ones; (7, 2) → −2 hundredths.
const lead = (int, places) => String(int).length - 1 - places;
const R = (n, d) => [fr(n, den(d)), n, d];

// Draw values with make() until ok() holds. make() only uses the rng it closes
// over, so this is deterministic. The fallback satisfies ok() by construction.
function draw(make, ok, fallback) {
  for (let i = 0; i < 60; i++) {
    const v = make();
    if (ok(v)) return v;
  }
  return fallback;
}

// An integer in [lo, hi] that does not end in 0, so int / 10^p shows all p places.
function noZero(rng, lo, hi) {
  return draw(() => ri(rng, lo, hi), (v) => v % 10 !== 0, lo % 10 ? lo : lo + 1);
}

// int / 10^places with the zeros on the end taken off: (340, 2) → [34, 1], i.e. 3.4.
function strip(int, places) {
  while (places > 0 && int % 10 === 0) { int /= 10; places -= 1; }
  return [int, places];
}

// MC over decimals. Options are dec() strings, so value-equal options collide as
// strings and mcFrom drops them; non-positive values and values with more than
// 4 decimal places are not offered.
function mcDec(rng, prompt, answer, distractors, opts) {
  const ds = distractors.filter((v) => Number.isFinite(v) && v > 0 && placesOf(v) <= 4);
  return mcFrom(rng, prompt, dec(answer), ds.map(dec), opts);
}

// MC over fractions, each [label, n, d]. A distractor EQUAL IN VALUE to the answer
// or to an earlier distractor is dropped, so exactly one option is right.
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

// ---- × and ÷ by 10, 100, 1,000 (lessons 1–2)

// The place value chart for x → y: x in the top row, an empty row for the
// answer tagged with the operation. Empty when the chart's columns (thousands
// to thousandths) cannot hold both numbers.
function moveChart(x, y, tag) {
  const [xi, xf = ''] = String(x).split('.');
  const [yi, yf = ''] = String(y).split('.');
  const high = Math.max(xi.length, yi.length) - 1, low = Math.max(xf.length, yf.length);
  if (high > 3 || low > 3) return '';
  return pvChart([String(x), ''], { high: Math.max(1, high), low: Math.max(1, low), tags: ['', tag] });
}

// "The 3 moves from the ones to the hundreds." for the leading digit of int / 10^places.
function moveText(int, places, k) {
  const a = lead(int, places), b = a + k;
  return PLACES[a] && PLACES[b] ? `The ${String(int)[0]} moves from the ${PLACES[a]} to the ${PLACES[b]}. ` : '';
}

function timesWhy(t, p, k) {
  const x = dv(t, p), y = shift(t, p, k), gap = k - p, M = dec(P10(k));
  const holder = Number.isInteger(y) && gap > 0
    ? `Write 0 as a place holder in the empty column${gap > 1 ? 's' : ''} before the point. ` : '';
  return `× ${M}: every digit moves ${cols(k)} to the left. ${moveText(t, p, k)}${holder}So ${dec(x)} × ${M} = ${dec(y)}.`;
}

function divTenWhy(t, p, k) {
  const x = dv(t, p), y = shift(t, p, -k), b = lead(t, p) - k, M = dec(P10(k));
  const holder = b < -1 ? 'Write 0 as a place holder in the ones and in each empty column after the point. '
    : b < 0 ? 'Write 0 as a place holder in the ones column. ' : '';
  return `÷ ${M}: every digit moves ${cols(k)} to the right. ${moveText(t, p, -k)}${holder}So ${dec(x)} ÷ ${M} = ${dec(y)}.`;
}

// D ÷ (m × 10^k) with an exact one-digit step, drawn answer-first: Q = qi / 10^qp,
// E = Q × m (after ÷ 10^k), D = E × 10^k.
function multDraw(rng, whole) {
  return draw(() => {
    const m = ri(rng, 2, 9), k = pick(rng, [1, 1, 2, 2, 3]);
    return whole
      ? { m, k, qp: 0, qi: rng() < 0.6 ? ri(rng, 2, 12) : 10 * ri(rng, 2, 9) }
      : { m, k, qp: ri(rng, 1, 2), qi: ri(rng, 1, 25) };
  }, (v) => (v.qp === 0 || v.qi % 10 !== 0) && shift(v.qi * v.m, v.qp, v.k) < 100000,
  whole ? { m: 4, k: 1, qp: 0, qi: 60 } : { m: 2, k: 1, qp: 2, qi: 24 });
}

function multVals({ m, k, qi, qp }) {
  return {
    S: P10(k), M: m * P10(k),
    D: shift(qi * m, qp, k), E: dv(qi * m, qp), Q: dv(qi, qp),
  };
}

function multWhy(v) {
  const { m, k, qi, qp } = v, { S, M, D, E, Q } = multVals(v);
  const count = qp ? ` (${qi * m} ${pl(-qp, qi * m)} ÷ ${m} = ${qi} ${pl(-qp, qi)})` : '';
  return `${dec(M)} = ${dec(S)} × ${m}. First ${dec(D)} ÷ ${dec(S)} = ${dec(E)}: the digits move ${cols(k)} to the right. Then ${dec(E)} ÷ ${m} = ${dec(Q)}${count}. So ${dec(D)} ÷ ${dec(M)} = ${dec(Q)}.`;
}

// ---- fractions and decimals (lessons 3–5)

// d divides 10, 100 or 1,000: the smallest such power 10^P and the factor f = 10^P / d.
function pow10For(d) {
  for (let P = 1; P <= 3; P++) if (P10(P) % d === 0) return { P, f: P10(P) / d };
  return { P: 3, f: 1000 / d };  // not reached: callers only draw divisors of 1,000
}

const fracDec = (n, d) => {
  const { P, f } = pow10For(d);
  return dv(n * f, P);
};

function equivWhy(n, d) {
  const { P, f } = pow10For(d), T = P10(P), x = dv(n * f, P);
  if (f === 1) return `${fr(n, d)} is ${n} ${pl(-P, n)}, so ${fr(n, d)} = ${dec(x)}.`;
  return `${d} × ${f} = ${dec(T)}, so multiply the numerator by ${f} too: ${n} × ${f} = ${n * f}. ${fr(n, d)} = ${fr(n * f, den(T))} = ${dec(x)}.`;
}

// 3/5 read as 0.35: the digits of n and d written after the point.
function concat(n, d) {
  const s = `${n}${d}`;
  return s.length <= 4 ? dv(Number(s), s.length) : NaN;
}

// "Which is greater: n/d or x?" with x a tenths or hundredths decimal just below
// or above n/d (0.375 against 0.4 or 0.38), or now and then n/d itself (then
// "They are equal" is right).
function compareFrac(rng, n, d, tier, why) {
  const F = fracDec(n, d), { P, f } = pow10For(d), F3 = n * f * P10(3 - P);   // n/d in thousandths
  const g = pick(rng, [100, 10]), gp = g === 100 ? 1 : 2;                      // step of x in thousandths
  let c = pick(rng, [1, 2, 2, 3, 3]), X = Math.floor(F3 / g);
  if (c === 2 && X * g === F3) X -= 1;
  if (c === 3) X += 1;
  if (c === 2 && X < 1) { c = 3; X = Math.floor(F3 / g) + 1; }
  const x = c === 1 ? F : dv(X, gp), X3 = c === 1 ? F3 : X * g;
  const opts = [fr(n, d), dec(x), 'They are equal'];
  const right = X3 === F3 ? 2 : X3 > F3 ? 1 : 0;
  const rel = X3 === F3 ? 'equal to' : X3 > F3 ? 'less than' : 'more than';
  return mcFrom(rng, `Which is greater: ${fr(n, d)} or ${dec(x)}?`, opts[right], opts.filter((_, i) => i !== right), {
    tier,
    hint: `Write ${fr(n, d)} as a decimal first. Then compare the digits column by column.`,
    explain: `${why} ${dec(F)} is ${rel} ${dec(x)}, so the answer is: ${opts[right]}.`,
  });
}

// ---- × and ÷ of decimals (lessons 6–9)

// Short division of Dint / 10^Dp by b, carried on to Qp decimal places (Qp ≥ Dp;
// the division comes out exactly there). Column by column, every exchange said.
function shortDivWhy(Dint, Dp, b, Qp) {
  const s = String(Dint * P10(Qp - Dp)).padStart(Qp + 1, '0');
  const D = dv(Dint, Dp);
  const out = Qp > Dp ? [`Write ${dec(D)} as ${fixed(D, Qp)}.`] : [];
  let r = 0;
  for (let i = 0; i < s.length; i++) {
    const place = s.length - 1 - i - Qp;
    const cur = r * 10 + Number(s[i]), q = Math.floor(cur / b);
    r = cur % b;
    let step = `${cur} ${pl(place, cur)} ÷ ${b} = ${q}`;
    if (r) step += ` r ${r}: exchange ${r} ${pl(place, r)} for ${r * 10} ${pl(place - 1, r * 10)}`;
    out.push(step + '.');
  }
  return out.join(' ');
}

// Does short division of the digits of n by b exchange anywhere before the last digit?
function hasExchange(n, b) {
  const s = String(n);
  let r = 0;
  for (let i = 0; i < s.length - 1; i++) {
    r = (r * 10 + Number(s[i])) % b;
    if (r) return true;
  }
  return false;
}

// The column method for (int / 10^places) × m, from the right, every exchange said.
function colMulWhy(int, places, m) {
  const ds = String(int).split('').map(Number).reverse();
  const out = [];
  let carry = 0;
  ds.forEach((dg, i) => {
    const place = i - places, prod = dg * m + carry;
    let step = `${dg} ${pl(place, dg)} × ${m} = ${dg * m} ${pl(place, dg * m)}`;
    if (carry) step += `, plus ${carry} = ${prod}`;
    if (i === ds.length - 1) {
      step += `: write ${prod}`;
    } else {
      step += `: write ${prod % 10}`;
      if (prod >= 10) step += ` and exchange ${Math.floor(prod / 10)} ${pl(place + 1, Math.floor(prod / 10))}`;
    }
    out.push(step + '.');
    carry = Math.floor(prod / 10);
  });
  return out.join(' ');
}

// The column method with the exchanges forgotten: every column writes the last
// digit of its own product, the last column all of it. 3.46 × 4 → 12.64.
function noExchange(int, m) {
  const ds = String(int).split('').map(Number).reverse();
  return ds.reduce((s, dg, i) => s + (i === ds.length - 1 ? dg * m : (dg * m) % 10) * P10(i), 0);
}

// 0.a × b by the known fact (int < 10), or w.t × b by partitioning.
function timesTenthsWhy(int, b) {
  const x = dv(int, 1), y = dv(int * b, 1);
  if (int < 10) {
    return `${int} × ${b} = ${int * b}, so ${int} tenths × ${b} = ${int * b} tenths. ${int * b} tenths = ${dec(y)}.`;
  }
  const w = Math.floor(int / 10), t = int % 10, T = dv(t * b, 1);
  return `Partition ${dec(x)} into ${w} and ${dec(dv(t, 1))}. ${w} × ${b} = ${w * b}. ${dec(dv(t, 1))} × ${b} = ${dec(T)} (${t} × ${b} = ${t * b} tenths). Then ${w * b} + ${dec(T)} = ${dec(y)}.`;
}

// Share a no-exchange decimal column by column: digits [ones, tenths, hundredths…] of the answer.
function shareWhy(qDigits, b) {
  const steps = qDigits.map((q, i) => `${q * b} ${pl(-i, q * b)} ÷ ${b} = ${q} ${pl(-i, q)}`);
  return `Share each column into ${b} equal groups. ${steps.join('. ')}.`;
}

// Things that can cost anything from £1 to £10 (the lesson 7 prices).
const ITEMS = [['notebook', 'notebooks'], ['comic', 'comics'], ['book', 'books'], ['lunch box', 'lunch boxes'], ['paint set', 'paint sets']];

// ------------------------------------------------------------------ the lessons

export const lessonPreviewsU7 = {

  'u07-l01': {
    intro: {
      text: 'When you multiply by <b>10</b>, every digit moves <b>1 column to the left</b> in the <b>place value chart</b>. × 100 moves the digits 2 columns and × 1,000 moves them 3 columns. The decimal point does not move. 3.45 × 100 = 345.',
      alt: 'Multiplying by 10 makes every digit worth ten times more, so each digit moves one place to the left. Count the zeros: 100 has two zeros, so the digits move two places. If a column before the point is empty, write 0 as a <b>place holder</b>: 3.4 × 100 = 340.',
      svg: pvChart(['3.45', '345'], { high: 2, low: 2, tags: ['', '× 100'] }),
    },
    example: {
      steps: [
        'Work out 0.705 × 100.',
        '100 has two zeros, so every digit moves 2 columns to the left.',
        'The 7 moves from the tenths to the tens. The 0 moves to the ones and the 5 moves to the tenths.',
        'So 0.705 × 100 = <b>70.5</b>.',
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        const p = ri(rng, 1, 2), t = noZero(rng, 11, 99), k = ri(rng, 1, 2);
        const x = dv(t, p), y = shift(t, p, k), M = dec(P10(k)), why = timesWhy(t, p, k);
        if (shape === 1) {
          return dnum(`Work out ${dec(x)} × ${M}.`, y, {
            tier, svg: moveChart(x, y, `× ${M}`),
            hint: `× ${M}: every digit moves ${cols(k)} to the left. The point stays.`,
            explain: why,
          });
        }
        if (shape === 2) {
          return dnum(`Find the missing number: ${dec(x)} × □ = ${dec(y)}`, P10(k), {
            tier, svg: pvChart([String(x), String(y)], { tags: ['', '× □'] }),
            hint: 'How many columns did the digits move to the left? 1 column is × 10, 2 columns is × 100.',
            explain: `The digits moved ${cols(k)} to the left, so the missing number is ${M}. ${why}`,
          });
        }
        // The "put a 0 on the end" misconception: 3.4 × 10 = 3.40.
        const truth = rng() < 0.5;
        const shown = truth ? dec(y) : String(x) + '0'.repeat(k);
        return tf(`True or false: ${dec(x)} × ${M} = ${shown}`, truth, {
          tier,
          hint: `× ${M} moves every digit ${cols(k)} to the left. Where does the ${String(t)[0]} end up?`,
          explain: truth
            ? `True. ${why}`
            : `False. ${shown} is the same number as ${dec(x)}: a 0 on the end of a decimal does not change it. ${why}`,
        });
      }
      const { t, p, k } = draw(() => {
        const size = ri(rng, 1, 3), p = ri(rng, 1, 3), k = ri(rng, 1, 3);
        return { p, k, t: size === 1 ? ri(rng, 1, 9) : size === 2 ? ri(rng, 11, 99) : ri(rng, 101, 999) };
      }, (v) => v.t % 10 !== 0 && (v.k >= 2 || (v.p === 3 && v.t >= 101)), { t: 345, p: 3, k: 2 });
      const x = dv(t, p), y = shift(t, p, k), M = dec(P10(k)), why = timesWhy(t, p, k);
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        return dnum(`Work out ${dec(x)} × ${M}.`, y, {
          tier, svg: moveChart(x, y, `× ${M}`),
          hint: `× ${M}: every digit moves ${cols(k)} to the left. Fill empty columns before the point with 0.`,
          explain: why,
        });
      }
      if (shape === 2) {
        return dnum(`Find the missing number: □ × ${M} = ${dec(y)}`, x, {
          tier,
          hint: `Work backwards: ÷ ${M} moves every digit ${cols(k)} to the right.`,
          explain: `${dec(y)} ÷ ${M} = ${dec(x)}: every digit moves ${cols(k)} to the right. Check: ${dec(x)} × ${M} = ${dec(y)}.`,
        });
      }
      if (shape === 3) {
        // One column too few, one too many, the wrong way.
        return mcDec(rng, `What is ${dec(x)} × ${M}?`, y, [shift(t, p, k - 1), shift(t, p, k + 1), shift(t, p, -k)], {
          tier,
          hint: `Count the zeros in ${M}. That is how many columns the digits move to the left.`,
          explain: why,
        });
      }
      return dnum(`Find the missing number: ${dec(x)} × □ = ${dec(y)}`, P10(k), {
        tier,
        hint: 'How many columns did the digits move to the left? 1 column is × 10, 2 columns × 100, 3 columns × 1,000.',
        explain: `The digits moved ${cols(k)} to the left, so the missing number is ${M}. ${why}`,
      });
    },
  },

  'u07-l02': {
    intro: {
      text: 'To divide by <b>10</b>, move every digit <b>1 column to the right</b>. ÷ 100 moves the digits 2 columns and ÷ 1,000 moves them 3 columns. Empty columns need a 0 as a <b>place holder</b>: 7 ÷ 100 = 0.07. To divide by a <b>multiple</b> of 10, such as 40, split it up: ÷ 10, then ÷ 4.',
      alt: 'Dividing by 10 makes every digit ten times smaller, so it moves one place to the right. 40 is 10 × 4, so dividing by 40 is the same as dividing by 10 and then dividing by 4: 2,400 ÷ 10 = 240, and 240 ÷ 4 = 60.',
      svg: pvChart(['7', '0.07'], { high: 1, low: 2, tags: ['', '÷ 100'] }),
    },
    example: {
      steps: [
        'Work out 4.8 ÷ 20.',
        '20 = 10 × 2, so divide by 10 and then by 2.',
        '4.8 ÷ 10 = 0.48: every digit moves 1 column to the right.',
        '0.48 ÷ 2 = 0.24: 48 hundredths ÷ 2 = 24 hundredths.',
        'So 4.8 ÷ 20 = <b>0.24</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, tier === 1 ? 3 : 4);
      if (tier === 1) {
        if (shape === 2) {
          // Zeros as place holders: 7 ÷ 100, 45 ÷ 1,000.
          const t = pick(rng, [ri(rng, 2, 9), noZero(rng, 11, 99)]), k = ri(rng, 2, 3);
          return mcDec(rng, `What is ${dec(t)} ÷ ${dec(P10(k))}?`, shift(t, 0, -k),
            [shift(t, 0, -(k - 1)), shift(t, 0, -(k + 1)), shift(t, 0, k)], {
              tier,
              hint: `Move every digit ${cols(k)} to the right. Fill the empty columns with 0.`,
              explain: divTenWhy(t, 0, k),
            });
        }
        const { t, p, k } = draw(() => {
          const p = ri(rng, 0, 1);
          return { p, k: ri(rng, 1, 3 - p), t: p === 0 ? ri(rng, 1, 999) : ri(rng, 11, 99) };
        }, (v) => v.t % 10 !== 0, { t: 7, p: 0, k: 2 });
        const x = dv(t, p), y = shift(t, p, -k), M = dec(P10(k));
        if (shape === 1) {
          return dnum(`Work out ${dec(x)} ÷ ${M}.`, y, {
            tier, svg: moveChart(x, y, `÷ ${M}`),
            hint: `÷ ${M}: every digit moves ${cols(k)} to the right. The point stays.`,
            explain: divTenWhy(t, p, k),
          });
        }
        return dnum(`Find the missing number: ${dec(x)} ÷ □ = ${dec(y)}`, P10(k), {
          tier, svg: pvChart([String(x), String(y)], { tags: ['', '÷ □'] }),
          hint: 'How many columns did the digits move to the right? 1 column is ÷ 10, 2 columns ÷ 100, 3 columns ÷ 1,000.',
          explain: `The digits moved ${cols(k)} to the right, so the missing number is ${M}. ${divTenWhy(t, p, k)}`,
        });
      }
      const v = multDraw(rng, shape === 1 || (shape === 3 && rng() < 0.5));
      const { S, M, D, E, Q } = multVals(v), why = multWhy(v);
      const hint = `${dec(M)} = ${dec(S)} × ${v.m}. Divide by ${dec(S)} first, then by ${v.m}.`;
      if (shape <= 2) return dnum(`Work out ${dec(D)} ÷ ${dec(M)}.`, Q, { tier, hint, explain: why });
      if (shape === 3) {
        // Did only ÷ 10^k, did only ÷ m, one column out either way.
        return mcDec(rng, `What is ${dec(D)} ÷ ${dec(M)}?`, Q,
          [E, shift(v.qi, v.qp, v.k), shift(v.qi, v.qp, -1), shift(v.qi, v.qp, 1)], {
            tier, hint: `Two steps: ÷ ${dec(S)} and ÷ ${v.m}. Do both.`, explain: why,
          });
      }
      if (rng() < 0.5) {
        return dnum(`${dec(D)} kg of rice is shared equally into ${dec(M)} bags. How much rice is in each bag?`, Q, {
          tier, unit: 'kg', hint, explain: `${why} Each bag has ${dec(Q)} kg.`,
        });
      }
      return dnum(`${dec(D)} litres of juice is poured equally into ${dec(M)} bottles. How much juice is in each bottle?`, Q, {
        tier, unit: 'litres', hint, explain: `${why} Each bottle has ${dec(Q)} litres.`,
      });
    },
  },

  'u07-l03': {
    intro: {
      text: `The digits after the decimal point are <b>tenths</b>, <b>hundredths</b> and <b>thousandths</b>. 0.7 is 7 tenths = ${fr(7, 10)}. 0.23 is 23 hundredths = ${fr(23, 100)}. 0.009 is 9 thousandths = ${fr(9, '1,000')}. In the hundred square, 23 of the 100 small squares are shaded: 0.23 = ${fr(23, 100)}.`,
      alt: `Count the digits after the point. One digit means tenths, so the denominator is 10. Two digits mean hundredths (100). Three digits mean thousandths (1,000). Then simplify the fraction if you can: 0.5 = ${fr(5, 10)} = ${fr(1, 2)}.`,
      svg: hundredSquare(23),
    },
    example: {
      steps: [
        'Write 0.35 as a fraction in its simplest form.',
        `0.35 has two digits after the point, so it is 35 hundredths: ${fr(35, 100)}.`,
        `35 and 100 can both be divided by 5: ${fr(35, 100)} = ${fr(7, 20)}.`,
        `So 0.35 = <b>${fr(7, 20)}</b>.`,
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape <= 2) {
          const n = ri(rng, 1, 99), x = dv(n, 2), c = Math.floor(n / 10), s = n % 10;
          const parts = [c ? `${c} full column${c > 1 ? 's' : ''} (${pl(-1, c)})` : '', s ? `${s} more square${s > 1 ? 's' : ''} (${pl(-2, s)})` : '']
            .filter(Boolean).join(' and ');
          const seen = `${parts}: ${n} of the 100 small squares are shaded.`;
          if (shape === 1) {
            return dnum('What decimal is shaded? The whole square is 1.', x, {
              tier, svg: hundredSquare(n),
              hint: 'Each column is 1 tenth (0.1). Each small square is 1 hundredth (0.01).',
              explain: `${seen} ${n} ${pl(-2, n)} = ${fr(n, 100)} = ${dec(x)}.`,
            });
          }
          return frac('What fraction of the hundred square is shaded?', n, 100, {
            tier, svg: hundredSquare(n),
            hint: 'Count the shaded squares. Each column has 10. There are 100 squares altogether.',
            explain: `${seen} So ${fr(n, 100)} is shaded. As a decimal that is ${dec(x)}.`,
          });
        }
        const p = ri(rng, 1, 2), t = p === 1 ? ri(rng, 1, 9) : noZero(rng, 1, 99);
        const x = dv(t, p), T = P10(p);
        const why = `${dec(x)} has ${p === 1 ? 'one digit' : 'two digits'} after the point, so it is ${t} ${pl(-p, t)}: ${dec(x)} = ${fr(t, T)}.`;
        if (shape === 3) {
          return frac(`Write ${dec(x)} as a fraction.`, t, T, {
            tier, hint: `${p === 1 ? 'One digit' : 'Two digits'} after the point means ${PLACES[-p]}.`, explain: why,
          });
        }
        // Wrong denominator (one place out either way), and 0.7 read as 1/7.
        const wrong = p === 1 ? [R(t, 100), R(t, 1000)] : [R(t, 10), R(t, 1000)];
        if (t > 1 && t <= 12) wrong.push(R(1, t));
        return mcRat(rng, `Which fraction is equal to ${dec(x)}?`, R(t, T), wrong, {
          tier, hint: 'Count the digits after the point: tenths, hundredths or thousandths?', explain: why,
        });
      }
      const shape = ri(rng, 1, 4);
      if (shape <= 2) {
        // Decimals with a tidy simplest form: halves, quarters, fifths, twentieths,
        // twenty-fifths and eighths.
        const p = pick(rng, [1, 2, 2, 3]);
        const t = p === 1 ? pick(rng, [2, 4, 5, 6, 8])
          : p === 2 ? draw(() => ri(rng, 1, 99), (v) => v % 10 !== 0 && (v % 4 === 0 || v % 5 === 0), 25)
            : pick(rng, [125, 375, 625, 875]);
        const T = P10(p), x = dv(t, p), g = gcd(t, T), [sn, sd] = simplify(t, T);
        const why = `${dec(x)} = ${fr(t, den(T))}. Divide the top and the bottom by ${g}: ${fr(sn, sd)}.`;
        if (shape === 1) {
          return frac(`Write ${dec(x)} as a fraction in its simplest form.`, sn, sd, {
            exact: true, tier,
            hint: `First write it over ${den(T)}. Then divide the top and the bottom by the same number.`,
            explain: why,
          });
        }
        // 0.4 read as 1/4, 0.25 read as 2/5, and the wrong denominator.
        const wrongDen = p === 1 ? [100, 1000] : p === 2 ? [10, 1000] : [100, 10];
        const ds = t < 100 ? [R(1, t)] : [];
        if (p === 2 && t >= 10) ds.push(R(Math.floor(t / 10), t % 10));
        ds.push(R(t, wrongDen[0]), R(t, wrongDen[1]));
        return mcRat(rng, `Which is ${dec(x)} as a fraction in its simplest form?`, R(sn, sd), ds, {
          tier, hint: `Write ${dec(x)} over ${den(T)} first, then simplify.`, explain: why,
        });
      }
      const p = ri(rng, 2, 3);
      const size = ri(rng, 1, p);
      const t = size === 1 ? ri(rng, 1, 9) : size === 2 ? noZero(rng, 11, 99) : noZero(rng, 101, 999);
      const x = dv(t, p), T = P10(p);
      const why = `${dec(x)} has ${p === 2 ? 'two' : 'three'} digits after the point, so it is ${t} ${pl(-p, t)}: ${dec(x)} = ${fr(t, den(T))}.`;
      if (shape === 3) {
        // Hundredths or thousandths with the denominator one place out.
        const truth = rng() < 0.5;
        const shownD = truth ? T : p === 2 ? pick(rng, [10, 1000]) : 100;
        return tf(`True or false: ${dec(x)} = ${fr(t, den(shownD))}`, truth, {
          tier, hint: 'Count the digits after the point. The last digit tells you the denominator.',
          explain: `${truth ? 'True' : 'False'}. ${why}`,
        });
      }
      if (rng() < 0.5) {
        return frac(`Write ${dec(x)} as a fraction.`, t, T, {
          tier, hint: `${p === 2 ? 'Two' : 'Three'} digits after the point means ${PLACES[-p]}.`, explain: why,
        });
      }
      return dnum(`Find the missing number: ${dec(x)} = ${fr('□', den(T))}`, t, {
        tier, hint: `How many ${PLACES[-p]} is ${dec(x)}?`, explain: why,
      });
    },
  },

  'u07-l04': {
    intro: {
      text: `To write a fraction as a decimal, find an <b>equivalent fraction</b> with a denominator of 10, 100 or 1,000. ${fr(3, 5)} = ${fr(6, 10)} = 0.6. ${fr(7, 20)} = ${fr(35, 100)} = 0.35. Whatever you multiply the denominator by, multiply the numerator by the same number.`,
      alt: `Ask: what times the denominator makes 10, 100 or 1,000? For ${fr(7, 20)}: 20 × 5 = 100, so multiply the top by 5 too: 7 × 5 = 35. 35 hundredths is 0.35.`,
      svg: hundredSquare(35),
    },
    example: {
      steps: [
        `Write ${fr(9, 25)} as a decimal.`,
        `25 × 4 = 100, so multiply the numerator and the denominator by 4: ${fr(9, 25)} = ${fr(36, 100)}.`,
        '36 hundredths = 0.36.',
        `So ${fr(9, 25)} = <b>0.36</b>.`,
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, tier === 1 ? 3 : 4);
      const d = tier === 1
        ? pick(rng, shape === 2 ? [2, 5, 20, 50] : [2, 5, 10, 20, 50])
        : pick(rng, [4, 20, 25, 50, 200, 250, 500]);
      const n = draw(() => ri(rng, 1, d >= 200 ? 9 : d - 1), (v) => gcd(v, d) === 1, 1);
      const { P, f } = pow10For(d), T = P10(P), x = fracDec(n, d), why = equivWhy(n, d);
      if (shape === 1) {
        return dnum(`Write ${fr(n, d)} as a decimal.`, x, {
          tier,
          hint: d === 10 ? `${fr(n, d)} is ${n} tenths.` : `Make an equivalent fraction with a denominator of ${dec(T)}.`,
          explain: why,
        });
      }
      if (shape === 2) {
        return dnum(`Find the missing number: ${fr(n, d)} = ${fr('□', den(T))}`, n * f, {
          tier,
          hint: `What do you multiply ${d} by to make ${dec(T)}? Multiply the numerator by the same number.`,
          explain: why,
        });
      }
      if (shape === 3) {
        // 3/5 read as 0.35; the numerator alone as tenths or hundredths.
        const ds = [concat(n, d), dv(n, P)];
        if (n < 10) ds.push(dv(n, 1));
        if (n < 100) ds.push(dv(n, 2));
        return mcDec(rng, `Which decimal is equal to ${fr(n, d)}?`, x, ds, {
          tier, hint: `Make the denominator ${dec(T)} first.`, explain: why,
        });
      }
      return compareFrac(rng, n, d, tier, why);
    },
  },

  'u07-l05': {
    intro: {
      text: `A fraction is a division: ${fr(3, 8)} means 3 ÷ 8. Some denominators, like 8, are hard to turn into 10 or 100, so use <b>short division</b>. 8 does not go into 3, so write 3 as 3.000 and keep dividing. ${fr(3, 8)} = 3 ÷ 8 = 0.375.`,
      alt: `The fraction line means "divided by". ${fr(3, 8)} is 3 shared into 8 equal parts, which is less than 1. Put zeros after the decimal point (3 = 3.000) and divide: 30 tenths ÷ 8 = 3 r 6, 60 hundredths ÷ 8 = 7 r 4, 40 thousandths ÷ 8 = 5.`,
      svg: fracBar(3, 8),
    },
    example: {
      steps: [
        `Write ${fr(3, 8)} as a decimal.`,
        `${fr(3, 8)} means 3 ÷ 8. Write 3 as 3.000.`,
        '3 ones ÷ 8 = 0 r 3: exchange 3 ones for 30 tenths. 30 tenths ÷ 8 = 3 r 6: exchange 6 tenths for 60 hundredths.',
        '60 hundredths ÷ 8 = 7 r 4: exchange 4 hundredths for 40 thousandths. 40 thousandths ÷ 8 = 5.',
        `So ${fr(3, 8)} = <b>0.375</b>.`,
      ],
    },
    gen(rng, tier) {
      const coprime = (d, lo, hi) => draw(() => ri(rng, lo, hi), (v) => gcd(v, d) === 1, 1);
      const divWhy = (N, d) => `${fr(N, d)} = ${N} ÷ ${d}. ${shortDivWhy(N, 0, d, pow10For(d).P)} So ${fr(N, d)} = ${dec(fracDec(N, d))}.`;
      const shape = ri(rng, 1, tier === 1 ? 3 : 4);
      if (tier === 1) {
        if (shape === 1) {
          const d = pick(rng, [2, 4, 5]), n = coprime(d, 1, d - 1);
          return dnum(`Write ${fr(n, d)} as a decimal.`, fracDec(n, d), {
            tier,
            hint: `${fr(n, d)} means ${n} ÷ ${d}. Write ${n} as ${fixed(n, pow10For(d).P)} and divide.`,
            explain: divWhy(n, d),
          });
        }
        if (shape === 2) {
          const d = pick(rng, [2, 4, 5, 8]), n = coprime(d, 1, d - 1);
          return mcFrom(rng, `Which calculation turns ${fr(n, d)} into a decimal?`, `${n} ÷ ${d}`,
            [`${d} ÷ ${n}`, `${n} × ${d}`, `${d} − ${n}`], {
              tier,
              hint: 'The fraction line means "divided by": numerator ÷ denominator.',
              explain: `${fr(n, d)} means ${n} ÷ ${d} = ${dec(fracDec(n, d))}.`,
            });
        }
        const d = pick(rng, [4, 5, 8]), n = coprime(d, 2, d - 1), u = fracDec(1, d), x = fracDec(n, d);
        return dnum(`${fr(1, d)} = ${dec(u)}. Use this to write ${fr(n, d)} as a decimal.`, x, {
          tier,
          hint: `${fr(n, d)} is ${n} lots of ${fr(1, d)}.`,
          explain: `${fr(n, d)} = ${n} × ${fr(1, d)}, so it is ${n} × ${dec(u)} = ${dec(x)}.`,
        });
      }
      if (shape === 1) {
        const n = pick(rng, [1, 3, 5, 7]);
        return dnum(`Write ${fr(n, 8)} as a decimal. Use short division.`, fracDec(n, 8), {
          tier, hint: `${fr(n, 8)} means ${n} ÷ 8. Write ${n} as ${n}.000 and divide.`, explain: divWhy(n, 8),
        });
      }
      if (shape === 2) {
        const d = pick(rng, [2, 4, 5, 8]), N = coprime(d, d + 1, 3 * d - 1);
        return dnum(`Write ${fr(N, d)} as a decimal.`, fracDec(N, d), {
          tier, hint: `${fr(N, d)} means ${N} ÷ ${d}. The answer is more than 1.`, explain: divWhy(N, d),
        });
      }
      if (shape === 3) {
        const d = pick(rng, [2, 4, 5, 8]), n = coprime(d, 1, d - 1), w = ri(rng, 1, 5);
        const { P, f } = pow10For(d), part = fracDec(n, d), x = dv(w * P10(P) + n * f, P);
        return dnum(`Write ${mixed(w, n, d)} as a decimal.`, x, {
          tier,
          hint: `The whole number stays. Turn ${fr(n, d)} into a decimal: ${n} ÷ ${d}.`,
          explain: `${fr(n, d)} = ${n} ÷ ${d} = ${dec(part)}. So ${mixed(w, n, d)} = ${w} + ${dec(part)} = ${dec(x)}.`,
        });
      }
      const d = pick(rng, [8, 8, 4, 5]), n = coprime(d, 1, d - 1);
      return compareFrac(rng, n, d, tier, `${fr(n, d)} = ${n} ÷ ${d} = ${dec(fracDec(n, d))}.`);
    },
  },

  'u07-l06': {
    intro: {
      text: 'Use a <b>known fact</b>. 3 × 4 = 12, so 3 tenths × 4 = 12 tenths, and 12 tenths = 1.2. So 0.3 × 4 = 1.2. In the same way, 7 × 6 = 42, so 0.07 × 6 = 42 hundredths = 0.42. For 1.4 × 3, <b>partition</b> 1.4 into 1 and 0.4: 1 × 3 = 3, 0.4 × 3 = 1.2, and 3 + 1.2 = 4.2.',
      alt: 'Count in tenths like counting sweets. 0.3 is 3 tenths. Four lots of 3 tenths is 12 tenths. 10 tenths make 1 whole, so 12 tenths is 1 whole and 2 tenths: 1.2.',
    },
    example: {
      steps: [
        'Work out 0.07 × 6.',
        'The known fact is 7 × 6 = 42.',
        '0.07 is 7 hundredths, so 0.07 × 6 = 42 hundredths.',
        '42 hundredths = <b>0.42</b>.',
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        const p = shape === 1 ? 1 : shape === 2 ? 2 : ri(rng, 1, 2);
        const a = ri(rng, 2, 9), b = ri(rng, 2, 9), x = dv(a, p), y = dv(a * b, p), U = PLACES[-p];
        const why = `${a} × ${b} = ${a * b}, so ${a} ${U} × ${b} = ${a * b} ${U}. ${a * b} ${U} = ${dec(y)}.`;
        if (shape <= 2) {
          return dnum(`Work out ${dec(x)} × ${b}.`, y, {
            tier, hint: `Use the known fact ${a} × ${b}. Then count the ${U}.`, explain: why,
          });
        }
        if (shape === 3) {
          // Counted the wrong place, dropped the point, added instead of multiplied.
          return mcDec(rng, `What is ${dec(x)} × ${b}?`, y, [dv(a * b, p === 1 ? 2 : 1), a * b, dv(a + b, p)], {
            tier, hint: `${dec(x)} is ${a} ${U}. How many ${U} is that ${b} times?`, explain: why,
          });
        }
        return dnum(`Find the missing number: ${dec(x)} × ${b} = □ ${U}`, a * b, {
          tier, hint: `${dec(x)} is ${a} ${U}.`, explain: why,
        });
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1) {
        const w = ri(rng, 1, 4), t = ri(rng, 1, 9), b = ri(rng, 3, 9), int = 10 * w + t;
        return dnum(`Work out ${dec(dv(int, 1))} × ${b}.`, dv(int * b, 1), {
          tier, hint: `Partition ${dec(dv(int, 1))} into ${w} and ${dec(dv(t, 1))}. Multiply each part by ${b}.`,
          explain: timesTenthsWhy(int, b),
        });
      }
      if (shape === 2) {
        const p = ri(rng, 1, 2), a = ri(rng, 2, 9), b = ri(rng, 3, 9), y = dv(a * b, p), U = PLACES[-p];
        return dnum(`Find the missing number: □ × ${b} = ${dec(y)}`, dv(a, p), {
          tier,
          hint: `Think of ${dec(y)} as ${a * b} ${U}. What × ${b} makes ${a * b}?`,
          explain: `${a} × ${b} = ${a * b}, so ${a} ${U} × ${b} = ${a * b} ${U} = ${dec(y)}. The missing number is ${dec(dv(a, p))}.`,
        });
      }
      if (shape === 3) {
        const int = rng() < 0.5 ? ri(rng, 2, 9) : 10 * ri(rng, 1, 3) + ri(rng, 1, 9), b = ri(rng, 3, 9);
        const x = dec(dv(int, 1)), y = dv(int * b, 1), name = pick(rng, NAMES), story = ri(rng, 1, 3);
        const hint = `${b} lots of ${x} is ${x} × ${b}.`;
        if (story === 1) {
          const [one, many] = int < 20 ? ['jug', 'jugs'] : ['bucket', 'buckets'];
          return dnum(`A ${one} holds ${x} litres of water. How much water do ${b} ${many} hold?`, y, {
            tier, unit: 'litres', hint, explain: timesTenthsWhy(int, b),
          });
        }
        if (story === 2) {
          return dnum(`A bag of apples weighs ${x} kg. How much do ${b} bags weigh?`, y, {
            tier, unit: 'kg', hint, explain: timesTenthsWhy(int, b),
          });
        }
        return dnum(`${name} runs ${x} km every day. How far does ${name} run in ${b} days?`, y, {
          tier, unit: 'km', hint, explain: timesTenthsWhy(int, b),
        });
      }
      // Hundredths counted as tenths: 0.06 × 5 = 3?
      const a = ri(rng, 2, 9), b = ri(rng, 2, 9), truth = rng() < 0.5;
      const right = dv(a * b, 2), shown = truth ? right : dv(a * b, 1);
      return tf(`True or false: ${dec(dv(a, 2))} × ${b} = ${dec(shown)}`, truth, {
        tier, hint: `${dec(dv(a, 2))} is ${a} hundredths. Use the known fact ${a} × ${b}.`,
        explain: `${truth ? 'True' : 'False'}. ${a} × ${b} = ${a * b}, so ${a} hundredths × ${b} = ${a * b} hundredths = ${dec(right)}.`,
      });
    },
  },

  'u07-l07': {
    intro: {
      text: 'For 3.46 × 4, use the <b>column method</b>. Keep the decimal point in line and multiply from the right. 6 hundredths × 4 = 24 hundredths: write 4 and <b>exchange</b> 2 tenths. 4 tenths × 4 = 16 tenths, plus 2 = 18: write 8 and exchange 1 one. 3 ones × 4 = 12, plus 1 = 13. So 3.46 × 4 = 13.84.',
      alt: 'It is like 346 × 4 = 1,384, but every digit is in a column 100 times smaller, so the answer is 1,384 hundredths = 13.84. Check with an estimate: 3.46 is close to 3.5, and 3.5 × 4 = 14.',
    },
    example: {
      steps: [
        'Work out 2.35 × 3.',
        '5 hundredths × 3 = 15 hundredths: write 5 and exchange 1 tenth.',
        '3 tenths × 3 = 9 tenths, plus 1 = 10: write 0 and exchange 1 one.',
        '2 ones × 3 = 6 ones, plus 1 = 7: write 7.',
        'So 2.35 × 3 = <b>7.05</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, tier === 1 ? 3 : 4);
      const name = pick(rng, NAMES);
      if (tier === 1) {
        if (shape === 2) {
          const pence = 100 * ri(rng, 1, 3) + 5 * ri(rng, 1, 19), m = ri(rng, 2, 3);
          const [one, many] = pick(rng, ITEMS), x = dv(pence, 2), y = dv(pence * m, 2);
          return dnum(`A ${one} costs ${money(x)}. ${name} buys ${m} ${many}. How much does ${name} pay?`, y, {
            tier, unit: 'pounds',
            hint: `${money(x)} × ${m}. Use the column method and keep the point in line.`,
            explain: `${money(x)} × ${m}: ${colMulWhy(pence, 2, m)} So ${name} pays ${money(y)}.`,
          });
        }
        const { o, t, m } = draw(() => ({ o: ri(rng, 1, 4), t: ri(rng, 1, 9), m: ri(rng, 2, 5) }),
          (v) => v.t * v.m >= 10, { o: 2, t: 6, m: 3 });
        const int = 10 * o + t, x = dv(int, 1), y = dv(int * m, 1);
        const why = `${colMulWhy(int, 1, m)} So ${dec(x)} × ${m} = ${dec(y)}.`;
        if (shape === 1) {
          return dnum(`Work out ${dec(x)} × ${m}.`, y, {
            tier, hint: 'Use the column method. Start with the tenths, and exchange 10 tenths for 1 one.', explain: why,
          });
        }
        // Forgot to add the exchanged one; wrote the whole tenths product; point in the wrong place.
        return mcDec(rng, `What is ${dec(x)} × ${m}?`, y,
          [dv(o * m * 10 + (t * m) % 10, 1), dv(o * m * 100 + t * m, 2), dv(int * m, 2)], {
            tier, hint: 'Use the column method. Remember to add the exchanged ones.', explain: why,
          });
      }
      const { int, m } = draw(() => ({ int: 100 * ri(rng, 1, 9) + ri(rng, 1, 99), m: ri(rng, 3, 9) }),
        (v) => v.int % 10 !== 0 && (v.int % 10) * v.m >= 10, { int: 346, m: 4 });
      const x = dv(int, 2), y = dv(int * m, 2), est = Math.floor((int + 50) / 100);
      const check = `Check: ${dec(x)} is close to ${est}, and ${est} × ${m} = ${est * m}.`;
      const work = colMulWhy(int, 2, m);
      if (shape === 1) {
        return dnum(`Work out ${dec(x)} × ${m}.`, y, {
          tier, hint: 'Use the column method. Start with the hundredths and exchange when a column makes 10 or more.',
          explain: `${work} So ${dec(x)} × ${m} = ${dec(y)}. ${check}`,
        });
      }
      if (shape === 2) {
        const [one, many] = pick(rng, ITEMS);
        return dnum(`A ${one} costs ${money(x)}. ${name} buys ${m} ${many}. How much does ${name} pay?`, y, {
          tier, unit: 'pounds', hint: `Work out ${dec(x)} × ${m} with the column method.`,
          explain: `${money(x)} × ${m}: ${work} So ${name} pays ${money(y)}. ${check}`,
        });
      }
      if (shape === 3) {
        const story = ri(rng, 1, 3);
        const [q, unit] = story === 1
          ? [`A sack of flour weighs ${dec(x)} kg. How much do ${m} sacks weigh?`, 'kg']
          : story === 2
            ? [`A roll of ribbon is ${dec(x)} m long. How much ribbon is on ${m} rolls?`, 'm']
            : [`A bucket holds ${dec(x)} litres of water. How much water do ${m} buckets hold?`, 'litres'];
        return dnum(q, y, {
          tier, unit, hint: `Work out ${dec(x)} × ${m} with the column method.`,
          explain: `${work} So the answer is ${dec(y)} ${unit}. ${check}`,
        });
      }
      // Exchanges forgotten; the point one place out either way.
      return mcDec(rng, `What is ${dec(x)} × ${m}?`, y, [dv(noExchange(int, m), 2), dv(int * m, 1), dv(int * m, 3)], {
        tier, hint: 'Use the column method. Keep the decimal point in line and add every exchange.',
        explain: `${work} So ${dec(x)} × ${m} = ${dec(y)}. ${check}`,
      });
    },
  },

  'u07-l08': {
    intro: {
      text: 'Use a <b>known fact</b>: 8 ÷ 2 = 4, so 8 tenths ÷ 2 = 4 tenths, and 0.8 ÷ 2 = 0.4. For 6.3 ÷ 3, share each column: 6 ones ÷ 3 = 2 ones, and 3 tenths ÷ 3 = 1 tenth. So 6.3 ÷ 3 = 2.1.',
      alt: 'Think of place value counters. 6.3 is 6 ones counters and 3 tenths counters. Share them into 3 equal groups: each group gets 2 ones and 1 tenth, which is 2.1.',
      svg: barModel(3, [1, 1, 1], { partLabels: ['2.1', '2.1', '2.1'], wholeLabel: '6.3' }),
    },
    example: {
      steps: [
        'Work out 0.12 ÷ 4.',
        '0.12 is 12 hundredths.',
        'The known fact is 12 ÷ 4 = 3, so 12 hundredths ÷ 4 = 3 hundredths.',
        'So 0.12 ÷ 4 = <b>0.03</b>.',
      ],
    },
    gen(rng, tier) {
      // Each digit of the answer times b stays a single digit: no exchange.
      const share = (n) => {
        const b = ri(rng, 2, 4), top = Math.floor(9 / b);
        const qs = [ri(rng, 1, top), ...Array.from({ length: n - 1 }, (_, i) => ri(rng, i === n - 2 ? 1 : 0, top))];
        const qInt = qs.reduce((s, q) => s * 10 + q, 0);
        return { b, qs, qInt, Q: dv(qInt, n - 1), D: dv(qInt * b, n - 1) };
      };
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          const b = ri(rng, 2, 9), q = ri(rng, 1, Math.floor(9 / b)), a = q * b;
          return dnum(`Work out ${dec(dv(a, 1))} ÷ ${b}.`, dv(q, 1), {
            tier, hint: `${dec(dv(a, 1))} is ${a} tenths. Use the known fact ${a} ÷ ${b}.`,
            explain: `${a} ÷ ${b} = ${q}, so ${a} tenths ÷ ${b} = ${q} ${pl(-1, q)} = ${dec(dv(q, 1))}.`,
          });
        }
        const { b, qs, qInt, Q, D } = share(2);
        const why = `${shareWhy(qs, b)} So ${dec(D)} ÷ ${b} = ${dec(Q)}.`;
        if (shape === 2) {
          return dnum(`Work out ${dec(D)} ÷ ${b}.`, Q, {
            tier, svg: barModel(b, Array(b).fill(1), { partLabels: Array(b).fill('?'), wholeLabel: dec(D) }),
            hint: `Share the ones into ${b} groups, then share the tenths.`, explain: why,
          });
        }
        // Divided only the ones; the point one place out; the point dropped.
        return mcDec(rng, `What is ${dec(D)} ÷ ${b}?`, Q, [dv(10 * qs[0] + qs[1] * b, 1), dv(qInt, 2), qInt], {
          tier, hint: 'Share every column, the tenths as well as the ones.', explain: why,
        });
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1 || shape === 4) {
        const p = shape === 4 ? 2 : ri(rng, 1, 2);
        const { b, q } = draw(() => ({ b: ri(rng, 3, 9), q: ri(rng, 1, 9) }), (v) => p === 2 || v.q * v.b >= 10, { b: 4, q: 3 });
        const a = q * b, x = dv(a, p), y = dv(q, p), U = PLACES[-p];
        const why = `${a} ÷ ${b} = ${q} is a known fact. ${dec(x)} is ${a} ${U}, so ${dec(x)} ÷ ${b} = ${q} ${pl(-p, q)} = ${dec(y)}.`;
        if (shape === 1) {
          return dnum(`Work out ${dec(x)} ÷ ${b}.`, y, {
            tier, hint: `How many ${U} is ${dec(x)}? Use the known fact ${a} ÷ ${b}.`, explain: why,
          });
        }
        // Counted tenths instead of hundredths, dropped the point, one place too far.
        return mcDec(rng, `What is ${dec(x)} ÷ ${b}?`, y, [dv(q, 1), q, dv(q, 3)], {
          tier, hint: `${dec(x)} is ${a} hundredths.`, explain: why,
        });
      }
      const { b, qs, Q, D } = share(3);
      const why = `${shareWhy(qs, b)} So ${dec(D)} ÷ ${b} = ${dec(Q)}.`;
      if (shape === 2) {
        return dnum(`Work out ${dec(D)} ÷ ${b}.`, Q, {
          tier, hint: `Share each column into ${b} equal groups: ones, tenths, then hundredths.`, explain: why,
        });
      }
      const name = pick(rng, NAMES);
      if (rng() < 0.5) {
        return dnum(`A ribbon is ${dec(D)} m long. ${name} cuts it into ${b} equal pieces. How long is each piece?`, Q, {
          tier, unit: 'm', hint: `${b} equal pieces means ÷ ${b}.`, explain: why,
        });
      }
      return dnum(`${name} shares ${money(D)} equally between ${b} friends. How much does each friend get?`, Q, {
        tier, unit: 'pounds', hint: `Shared equally between ${b} means ÷ ${b}.`,
        explain: `${why} Each friend gets ${money(Q)}.`,
      });
    },
  },

  'u07-l09': {
    intro: {
      text: 'Use <b>short division</b>. Divide each column, starting on the left. If a column does not share equally, <b>exchange</b> the remainder into the next column. 7.2 ÷ 4: 7 ones ÷ 4 = 1 r 3. Exchange 3 ones for 30 tenths: 32 tenths ÷ 4 = 8. So 7.2 ÷ 4 = 1.8. If there is still a remainder at the end, put a 0 on the end of the number and keep going.',
      alt: 'Short division works the same with decimals. Keep the decimal point in the answer above the point in the number. A remainder is not the end: 3.4 is the same as 3.40, so you can carry on into the hundredths.',
      svg: barModel(4, [1, 1, 1, 1], { partLabels: ['?', '?', '?', '?'], wholeLabel: '7.2' }),
    },
    example: {
      steps: [
        'Work out 3.4 ÷ 4.',
        'Write 3.4 as 3.40, so there is a column to carry on into.',
        '3 ones ÷ 4 = 0 r 3: exchange 3 ones for 30 tenths. 34 tenths ÷ 4 = 8 r 2: exchange 2 tenths for 20 hundredths.',
        '20 hundredths ÷ 4 = 5.',
        'So 3.4 ÷ 4 = <b>0.85</b>.',
      ],
    },
    gen(rng, tier) {
      const name = pick(rng, NAMES);
      if (tier === 1) {
        // One exchange, ones and tenths: 7.2 ÷ 4 = 1.8.
        const { qi, b } = draw(() => ({ qi: ri(rng, 11, 29), b: ri(rng, 2, 5) }),
          (v) => v.qi % 10 !== 0 && v.qi * v.b < 100 && (v.qi * v.b) % 10 !== 0 && Math.floor(v.qi * v.b / 10) % v.b !== 0,
          { qi: 18, b: 4 });
        const n = qi * b, D = dv(n, 1), Q = dv(qi, 1);
        const why = `${shortDivWhy(n, 1, b, 1)} So ${dec(D)} ÷ ${b} = ${dec(Q)}.`;
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          return dnum(`Work out ${dec(D)} ÷ ${b}.`, Q, {
            tier, hint: `Use short division. ${Math.floor(n / 10)} ones ÷ ${b} leaves a remainder: exchange it for tenths.`, explain: why,
          });
        }
        if (shape === 2) {
          return dnum(`A rope is ${dec(D)} m long. ${name} cuts it into ${b} equal pieces. How long is each piece?`, Q, {
            tier, unit: 'm', hint: `${b} equal pieces means ÷ ${b}. Use short division.`, explain: why,
          });
        }
        // The remainder written as the decimal (1 r 3 → 1.3); the exchange left out; the point one place out.
        const o = Math.floor(n / 10), t = n % 10;
        return mcDec(rng, `What is ${dec(D)} ÷ ${b}?`, Q,
          [dv(10 * Math.floor(o / b) + (o % b), 1), dv(10 * Math.floor(o / b) + Math.floor(t / b), 1), dv(qi, 2)], {
            tier, hint: 'A remainder is not part of the answer. Exchange it into the next column.', explain: why,
          });
      }
      const shape = ri(rng, 1, 4);
      if (shape === 1 || shape === 3) {
        const money2 = shape === 3;
        // Dividends under 10 (under £20 for money), so the first column already shares.
        const { qi, b } = draw(() => {
          const b = ri(rng, money2 ? 2 : 3, money2 ? 6 : 9);
          return { b, qi: ri(rng, 101, Math.floor((money2 ? 1999 : 999) / b)) };
        }, (v) => (money2 || v.qi % 10 !== 0) && (v.qi * v.b) % 10 !== 0 && hasExchange(v.qi * v.b, v.b),
        { qi: 172, b: 3 });
        const n = qi * b, D = dv(n, 2), Q = dv(qi, 2), work = shortDivWhy(n, 2, b, 2);
        if (!money2) {
          return dnum(`Work out ${dec(D)} ÷ ${b}.`, Q, {
            tier, hint: 'Use short division. Exchange each remainder into the next column.',
            explain: `${work} So ${dec(D)} ÷ ${b} = ${dec(Q)}.`,
          });
        }
        return dnum(`${name} shares ${money(D)} equally between ${b} friends. How much does each friend get?`, Q, {
          tier, unit: 'pounds', hint: `Work out ${dec(D)} ÷ ${b} with short division.`,
          explain: `${dec(D)} ÷ ${b}: ${work} Each friend gets ${money(Q)}.`,
        });
      }
      // Put a 0 on the end to keep going: 3.4 ÷ 4 = 0.85, 9 ÷ 4 = 2.25, 7 ÷ 8 = 0.875.
      // The answer has one place more than the dividend: q ends in 5 for b = 2, 4, 8,
      // and is even for b = 5. Dividends under 10.
      const { b, qp, qi } = draw(() => {
        const b = pick(rng, [2, 4, 5, 8]), qp = b === 8 && rng() < 0.5 ? 3 : 2;
        const cap = Math.floor((10 * P10(qp) - 1) / b);
        const qi = b === 5 ? 2 * ri(rng, 6, Math.floor(cap / 2))
          : 10 * ri(rng, qp === 3 ? 10 : 1, Math.floor((cap - 5) / 10)) + 5;
        return { b, qp, qi };
      }, (v) => v.qi % 10 !== 0 && (v.qi * v.b) % 10 === 0 && v.qi * v.b < 10 * P10(v.qp), { b: 4, qp: 2, qi: 85 });
      const [Dint, Dp] = strip(qi * b, qp), D = dv(Dint, Dp), Q = dv(qi, qp);
      const why = `${shortDivWhy(Dint, Dp, b, qp)} So ${dec(D)} ÷ ${b} = ${dec(Q)}.`;
      if (shape === 2) {
        return dnum(`Work out ${dec(D)} ÷ ${b}.`, Q, {
          tier, hint: 'Use short division. When you run out of digits and there is a remainder, put a 0 on the end and keep going.',
          explain: why,
        });
      }
      // Stopped at the remainder; wrote the remainder on as a digit; the point one place out.
      const T = Math.floor(Dint / b), r = Dint % b;
      return mcDec(rng, `What is ${dec(D)} ÷ ${b}?`, Q, [dv(T, Dp), dv(T * 10 + r, Dp + 1), dv(qi, qp - 1)], {
        tier, hint: 'Do not stop at a remainder: put a 0 on the end and keep dividing.', explain: why,
      });
    },
  },
};
