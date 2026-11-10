// Book 6B — Term 2. Unit 7: Decimals (phase B9) and Unit 8: Percentages (B10),
// both 2026-11-10. Follows the official Power Maths Y6 lesson list
// (quality_reports/reference/y6-yearly-overview.md); the topic split is
// quality_reports/reference/y6-topic-spine.md:
//   u07-dec-place — U7 L1–5: × and ÷ by 10, 100, 1,000 (and their multiples),
//                   decimals as fractions, fractions as decimals
//   u07-dec-ops   — U7 L6–9: multiplying and dividing decimals by whole numbers
//   u08-pct-of    — U8 L1–5: percentages of amounts, missing values
//   u08-pct-equiv — U8 L6–9: fractions, decimals and percentages; mixed problems
//
// DECIMAL ANSWERS ARE EXACT. Every decimal value is built as an integer divided
// by a power of ten — dv(345, 2) = 3.45 — never by float arithmetic on decimals
// (0.1 × 3 is 0.30000000000000004 in JavaScript). An integer over a power of
// ten is correctly rounded, so it is the very number parseNumber reads from
// the pad: the checker's exact comparison holds. Every decimal question goes
// through dnum(), which also offers the "." key on the pad — the pad otherwise
// hides it whenever the answer is a whole number, which gives the answer away
// in a unit where half the answers are whole and half are not.
//
// Percentages follow the same rule: pctOf() is an integer product over a power
// of ten, and pnum() is dnum() with the unit %.
//
// The helpers are exported for the lesson-precise warm-ups (y6b-lessons-u*.js).

import { num, tf, mcFrom, frac, order, fr, fmt, money, scenario, ri, pick, shuffle } from './gen.js';
import { pvChart, hundredSquare, barModel } from './vis.js';
import { gcd } from './y6a-frac.js';

// ------------------------------------------------------------------ helpers

// The decimal int / 10^places, exactly: dv(345, 2) = 3.45.
export const dv = (int, places) => int / 10 ** places;

// (int / 10^places) × 10^k, exactly, for k from −6 to 6: shift(345, 2, 1) = 34.5.
export function shift(int, places, k) {
  const p = places - k;
  return p >= 0 ? int / 10 ** p : int * 10 ** -p;
}

// How many decimal places a value has (as JavaScript prints it).
export function placesOf(v) {
  return (String(v).split('.')[1] ?? '').length;
}

// A decimal for display: thousands commas on the whole part, the decimal
// digits as they are. dec(1234.5) = '1,234.5', dec(0.07) = '0.07'.
export function dec(v) {
  const [ip, fp] = String(v).split('.');
  return Number(ip).toLocaleString('en-GB') + (fp ? '.' + fp : '');
}

// A decimal with exactly `places` digits after the point, for the place-value
// chart and for money-style answers: fixed(3.5, 2) = '3.50'.
export function fixed(v, places) {
  return v.toFixed(places);
}

// A number question whose pad always offers the decimal point.
export function dnum(prompt, answer, opts = {}) {
  const q = num(prompt, answer, { tolerance: 1e-9, ...opts });
  q.allowDecimal = true;
  return q;
}

export const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];

// ---- Unit 8: percentages (B10)

// p % of (int / 10^places), exactly: pctOf(24, 0, 15) = 3.6 (15 % of 24).
export const pctOf = (int, places, p) => dv(int * p, places + 2);

// A number question answered in per cent: the pad offers "." too (35.5 % is
// possible, and the key must not say "whole"), the screen says "Answer in %".
export function pnum(prompt, answer, opts = {}) {
  return dnum(prompt, answer, { unit: '%', ...opts });
}

// 45 -> [[25, 1], [10, 2]]: a percentage as pieces of 50/25/10/5/1 %.
function pieces(p) {
  const out = [];
  for (const x of [50, 25, 10, 5, 1]) {
    const c = Math.floor(p / x);
    if (c) { out.push([x, c]); p -= c * x; }
  }
  return out;
}

// A value given in thousandths, as a percentage: 375 -> '37.5%'.
const pctStr = (t) => `${dec(dv(t, 1))}%`;
// '3/20 = 15%', but a percentage stays as it is: '11%', not '11% = 11%'.
const asPct = (x) => (x.label === pctStr(x.t) ? x.label : `${x.label} = ${pctStr(x.t)}`);

// `count` numbers of different value in different forms (fraction, decimal,
// percentage) for comparing and ordering: [{ label, t }], t in thousandths.
function mixedValues(rng, count) {
  const base = shuffle(rng, ['frac', 'dec', 'pct']);
  const forms = count <= 3 ? base.slice(0, count) : [...base, pick(rng, base)];
  const used = new Set(), out = [];
  for (const f of forms) {
    for (let guard = 0; guard < 50; guard++) {
      let item;
      if (f === 'frac') {
        const nd = pick(rng, TERMINATING);
        item = { label: fr(...nd), t: thousandths(nd) };
      } else if (f === 'dec') {
        const t = 10 * ri(rng, 11, 95);
        item = { label: dec(dv(t, 3)), t };
      } else {
        const t = 10 * ri(rng, 5, 95);
        item = { label: `${t / 10}%`, t };
      }
      if (!used.has(item.t)) { used.add(item.t); out.push(item); break; }
    }
  }
  return out;
}

const POW = { 1: '10', 2: '100', 3: '1,000' };
const cols = (k) => (k === 1 ? 'one column' : k === 2 ? 'two columns' : 'three columns');
// '1 tenth', '3 tenths'.
const many = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Fractions with a terminating decimal, as [n, d] in simplest form; d divides 1,000.
const TERMINATING = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 20], [3, 20], [7, 20],
  [9, 20], [11, 20], [1, 25], [3, 25], [6, 25], [1, 8], [3, 8], [5, 8], [7, 8], [1, 50], [7, 50]];
// The same value in thousandths: 3/8 -> 375.
const thousandths = ([n, d]) => n * (1000 / d);

// A random integer with `digits` digits whose last digit is not 0, so the
// decimal built from it really has all its places.
function tail(rng, digits) {
  const n = ri(rng, 10 ** (digits - 1), 10 ** digits - 1);
  return n % 10 === 0 ? n + ri(rng, 1, 9) : n;
}

// The fraction a decimal names before simplifying: 0.35 -> 35/100.
function rawFraction(v) {
  const p = placesOf(v);
  return [Math.round(v * 10 ** p), 10 ** p];
}

// ------------------------------------------------------------------ topics

export const topics6b = [

  // ---------------------------------------------------------------- Unit 7a
  {
    id: 'u07-dec-place', unit: 7, book: '6B', strand: 'decimals', emoji: '🔟',
    title: 'Decimals: place value and fractions', shortTitle: 'Decimals and fractions',
    explanation: {
      segments: [
        {
          text: 'When you multiply by <b>10</b>, every digit moves one column to the LEFT on the <b>place value chart</b>. The decimal point stays where it is. 3.45 × 10 = 34.5. Multiplying by 100 moves the digits two columns, and by 1,000 three columns: 3.45 × 100 = 345.',
          alt: 'Times 10 makes every digit worth ten times more, so each digit moves one place to the left. 10 has one zero: one column. 100 has two zeros: two columns. 1,000 has three zeros: three columns.',
          svg: pvChart(['3.45', '34.5', '345'], { high: 2, tags: ['', '× 10', '× 100'] }),
        },
        {
          text: 'Dividing by 10, 100 or 1,000 moves the digits to the RIGHT. 45 ÷ 100 = 0.45. When the columns between the point and a digit are empty, a 0 is a <b>place holder</b>: 7 ÷ 100 = 0.07. To divide by a <b>multiple</b> of 10, like 40, divide by 10 and then by 4: 2,400 ÷ 40 = 240 ÷ 4 = 60.',
          alt: 'Divide by 10 and every digit becomes ten times smaller, so it moves one place to the right. 40 is 4 × 10, so dividing by 40 is the same as dividing by 10 and then by 4.',
          svg: pvChart(['45', '4.5', '0.45'], { tags: ['', '÷ 10', '÷ 100'] }),
        },
        {
          text: 'Every decimal is a fraction with 10, 100 or 1,000 at the bottom. One decimal place means <b>tenths</b>: 0.7 = ' + fr(7, 10) + '. Two places mean <b>hundredths</b>: 0.23 = ' + fr(23, 100) + '. Three places mean <b>thousandths</b>: 0.009 = ' + fr(9, 1000) + '. Then <b>simplify</b> if you can: 0.25 = ' + fr(25, 100) + ' = ' + fr(1, 4) + '.',
          alt: 'Read the decimal as a fraction: 0.23 is twenty-three hundredths, so write 23 over 100. The number of decimal places tells you the denominator. Then check whether the fraction simplifies.',
          svg: hundredSquare(23),
        },
        {
          text: 'To change a fraction into a decimal, find an <b>equivalent fraction</b> with 10, 100 or 1,000 at the bottom: ' + fr(3, 5) + ' = ' + fr(6, 10) + ' = 0.6 and ' + fr(7, 20) + ' = ' + fr(35, 100) + ' = 0.35. If that does not work, divide the numerator by the denominator with <b>short division</b>: ' + fr(3, 8) + ' = 3 ÷ 8 = 0.375.',
          alt: 'A fraction is a division: ' + fr(3, 8) + ' means 3 ÷ 8. You can make the denominator 10, 100 or 1,000, or you can just do the division.',
        },
      ],
    },
    example: {
      steps: [
        'Write ' + fr(7, 20) + ' as a decimal.',
        'Find an equivalent fraction with 100 at the bottom: 20 × 5 = 100.',
        'Multiply the numerator by 5 too: 7 × 5 = 35, so ' + fr(7, 20) + ' = ' + fr(35, 100) + '.',
        '35 hundredths = <b>0.35</b>.',
      ],
    },
    faqs: [
      { q: 'Does the decimal point move when I multiply by 10?', a: 'No. The digits move one column to the left and the point stays still. Some people say "the point moves" and get the same answer, but really the digits change their value.' },
      { q: 'Why can I not just add a 0 to multiply by 10?', a: 'That only works for whole numbers. 3.4 with a 0 on the end is 3.40, and that is still 3.4. Move the digits instead: 3.4 × 10 = 34.' },
      { q: 'Which fractions make tenths, hundredths or thousandths?', a: 'Look at the denominator. Halves and fifths can be made into tenths. Quarters, twentieths and twenty-fifths can be made into hundredths. Eighths need thousandths: ' + fr(1, 8) + ' = ' + fr(125, 1000) + ' = 0.125.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          const places = ri(rng, 1, 2), int = tail(rng, 2), k = ri(rng, 1, 2);
          const v = dv(int, places), ans = shift(int, places, k);
          return dnum(`Work out ${dec(v)} × ${POW[k]}`, ans, {
            tier, svg: pvChart([dec(v)], { high: 2 }),
            hint: `× ${POW[k]}: every digit moves ${cols(k)} to the left.`,
            explain: `The digits move ${cols(k)} to the left: ${dec(v)} × ${POW[k]} = ${dec(ans)}.` });
        }
        if (shape === 2) {
          const n = tail(rng, ri(rng, 1, 2)), k = ri(rng, 1, 2), ans = dv(n, k);
          return dnum(`Work out ${n} ÷ ${POW[k]}`, ans, {
            tier, hint: `÷ ${POW[k]}: every digit moves ${cols(k)} to the right.`,
            explain: `The digits move ${cols(k)} to the right: ${n} ÷ ${POW[k]} = ${dec(ans)}.${ans < 0.1 ? ' The 0 in the tenths column is a place holder.' : ''}` });
        }
        if (shape === 3) {
          const n = tail(rng, 2), ans = dv(n, 2);
          return dnum('The whole square is 1. What decimal is shaded?', ans, {
            tier, svg: hundredSquare(n),
            hint: 'A full column is one tenth (0.1). One small square is one hundredth (0.01).',
            explain: `${many(Math.floor(n / 10), 'full column')} and ${many(n % 10, 'more square')}: ${n} hundredths = ${dec(ans)}.` });
        }
        const tenths = rng() < 0.5, n = tenths ? ri(rng, 1, 9) : tail(rng, 2), d = tenths ? 10 : 100;
        const v = dv(n, tenths ? 1 : 2);
        if (rng() < 0.5) {
          return frac(`Write ${dec(v)} as a fraction.`, n, d, {
            tier, hint: 'Count the decimal places: one place means tenths, two places mean hundredths.',
            explain: `${tenths ? 'One decimal place: tenths' : 'Two decimal places: hundredths'}. ${dec(v)} = ${fr(n, d)}.` });
        }
        return dnum(`Write ${fr(n, d)} as a decimal.`, v, {
          tier, hint: tenths ? 'Tenths go in the first column after the point.' : 'Hundredths need two decimal places.',
          explain: `${fr(n, d)} is ${n} ${tenths ? 'tenths' : 'hundredths'}: ${dec(v)}.` });
      }

      if (tier === 2) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          // Missing multiplier: how many columns did the digits move?
          const places = ri(rng, 1, 3), int = tail(rng, places === 1 ? 2 : 3), k = ri(rng, 1, 3);
          const v = dv(int, places), prod = shift(int, places, k);
          return mcFrom(rng, `${dec(v)} × □ = ${dec(prod)}. What is the missing number?`, POW[k],
            ['10', '100', '1,000', '10,000'], {
              tier, hint: 'Find one digit in both numbers. How many columns did it move to the left?',
              explain: `The digits moved ${cols(k)} to the left, so the missing number is ${POW[k]}.` });
        }
        if (shape === 2) {
          const places = ri(rng, 2, 3), int = tail(rng, 3), k = ri(rng, 2, 3);
          const v = dv(int, places), ans = shift(int, places, k);
          return dnum(`Work out ${dec(v)} × ${POW[k]}`, ans, {
            tier, hint: `× ${POW[k]}: every digit moves ${cols(k)} to the left. Do not just add zeros.`,
            explain: `The digits move ${cols(k)} to the left: ${dec(v)} × ${POW[k]} = ${dec(ans)}.` });
        }
        if (shape === 3) {
          // ÷ a multiple of 10 or 100: split it into ÷ d and ÷ 10 or 100.
          const d = ri(rng, 2, 9), k = ri(rng, 1, 2), p = ri(rng, 0, 2), q = ri(rng, 2, 30);
          const m = d * 10 ** k, dividend = shift(q * d, p, k), ans = dv(q, p);
          return dnum(`Work out ${dec(dividend)} ÷ ${fmt(m)}`, ans, {
            tier, hint: `${fmt(m)} = ${d} × ${POW[k]}. Divide by ${d}, then by ${POW[k]}.`,
            explain: `${dec(dividend)} ÷ ${d} = ${dec(shift(q, p, k))}. Then ${dec(shift(q, p, k))} ÷ ${POW[k]} = ${dec(ans)}.` });
        }
        if (rng() < 0.5) {
          const [n, d] = pick(rng, TERMINATING), v = dv(thousandths([n, d]), 3), [rn, rd] = rawFraction(v);
          return frac(`Write ${dec(v)} as a fraction in its simplest form.`, n, d, {
            exact: true, tier, hint: 'Write it over 10, 100 or 1,000 first. Then simplify.',
            explain: `${dec(v)} = ${fr(rn, rd)}. Simplify: ${fr(rn, rd)} = ${fr(n, d)}.` });
        }
        const [n, d] = pick(rng, TERMINATING.filter(([, dd]) => 100 % dd === 0));
        const to10 = 10 % d === 0, base = to10 ? 10 : 100, v = dv(n * (base / d), to10 ? 1 : 2);
        return dnum(`Write ${fr(n, d)} as a decimal.`, v, {
          tier, hint: 'Find an equivalent fraction with 10 or 100 as the denominator.',
          explain: `${d} × ${base / d} = ${base}, so ${fr(n, d)} = ${fr(n * (base / d), base)} = ${dec(v)}.` });
      }

      const stories = [
        (r) => {
          const k = ri(r, 1, 2), count = 10 ** k, total = tail(r, 2), name = pick(r, NAMES);
          const ans = dv(total, k), [item, items] = k === 1 ? ['book', 'books'] : ['sticker', 'stickers'];
          return dnum(`${name} buys ${fmt(count)} ${items} for £${total}. Each ${item} costs the same. How much is one ${item}?`, ans, {
            tier: 3, unit: 'pounds', hint: `Divide £${total} by ${fmt(count)}: the digits move ${cols(k)} to the right.`,
            explain: `${total} ÷ ${fmt(count)} = ${dec(ans)}, so one ${item} costs ${money(ans)}.` });
        },
        (r) => {
          // Two fractions and two decimals, all different values.
          const fracs = shuffle(r, TERMINATING).slice(0, 2);
          const used = new Set(fracs.map(thousandths));
          const decs = [];
          while (decs.length < 2) {
            const t = ri(r, 21, 89) * 10 + (r() < 0.5 ? 0 : 5);
            if (!used.has(t)) { used.add(t); decs.push(t); }
          }
          const items = [...fracs.map((f) => [fr(...f), thousandths(f)]), ...decs.map((t) => [dec(dv(t, 3)), t])];
          const sorted = items.slice().sort((a, b) => a[1] - b[1]);
          return order('Put these numbers in order, <b>smallest first</b>.', r, sorted.map((x) => x[0]), {
            tier: 3, hint: 'Change the fractions into decimals first. Then compare the tenths, then the hundredths.',
            explain: `As decimals: ${sorted.map((x) => `${x[0]} = ${dec(dv(x[1], 3))}`).join(', ')}.` });
        },
        (r) => {
          const name = pick(r, NAMES), places = ri(r, 1, 2), n = places === 1 ? ri(r, 1, 9) : tail(r, 2);
          const truth = r() < 0.5, d = 10 ** places, shown = truth ? d : (places === 1 ? 100 : 10);
          return tf(`${name} says ${dec(dv(n, places))} = ${fr(n, shown)}. Is ${name} right?`, truth, {
            tier: 3, hint: 'One decimal place means tenths. Two decimal places mean hundredths.',
            explain: `${dec(dv(n, places))} has ${places === 1 ? 'one decimal place, so it is tenths' : 'two decimal places, so it is hundredths'}: ${fr(n, d)}.${truth ? '' : ` ${fr(n, shown)} is ${dec(n / shown)}.`}` });
        },
        (r) => {
          const places = ri(r, 1, 2), int = tail(r, 2), k = ri(r, 1, 3);
          const small = dv(int, places + 1), big = shift(int, places + 1, k);
          return dnum(`□ ÷ ${POW[k]} = ${dec(small)}. What is the missing number?`, big, {
            tier: 3, hint: `Undo the division: multiply ${dec(small)} by ${POW[k]}.`,
            explain: `${dec(small)} × ${POW[k]} = ${dec(big)}, and ${dec(big)} ÷ ${POW[k]} = ${dec(small)}.` });
        },
        (r) => {
          const d = ri(r, 2, 6), q = ri(r, 2, 19), pieces = d * 10, len = shift(q * d, 2, 1), ans = dv(q, 2);
          return dnum(`A ribbon is ${dec(len)} m long. It is cut into ${pieces} equal pieces. How long is each piece, in metres?`, ans, {
            tier: 3, unit: 'm', hint: `${pieces} = ${d} × 10. Divide by ${d}, then by 10.`,
            explain: `${dec(len)} ÷ ${d} = ${dec(shift(q, 2, 1))}. Then ÷ 10 = ${dec(ans)} m.` });
        },
      ];
      return scenario(rng, 'u07-dec-place-t3', stories);
    },
  },

  // ---------------------------------------------------------------- Unit 7b
  {
    id: 'u07-dec-ops', unit: 7, book: '6B', strand: 'decimals', emoji: '💰',
    title: 'Multiplying and dividing decimals', shortTitle: 'Decimals × and ÷',
    explanation: {
      segments: [
        {
          text: 'To multiply a decimal by a whole number, use a <b>known fact</b>. 3 × 4 = 12, so 0.3 × 4 = 12 tenths = 1.2. And 0.03 × 4 = 12 hundredths = 0.12.',
          alt: 'Do the times-table fact first. Then think about what you are counting: 12 tenths is 1 whole and 2 tenths, so it is 1.2.',
          svg: barModel(1.2, [3, 3, 3, 3], { partLabels: ['0.3', '0.3', '0.3', '0.3'], wholeLabel: '1.2' }),
        },
        {
          text: 'For bigger numbers use the <b>column method</b>. Line up the digits and multiply each column, starting on the right. When a column makes 10 or more, <b>exchange</b>. 3.46 × 4 = 13.84. The answer has the same number of decimal places as 3.46.',
          alt: 'The column method works just like with whole numbers. Keep the decimal points in a line. Check with an estimate: 3.46 × 4 is about 3 × 4 = 12, so 13.84 makes sense.',
        },
        {
          text: 'To divide a decimal by a whole number, share each column. 6.3 ÷ 3: 6 ones ÷ 3 = 2 ones and 3 tenths ÷ 3 = 1 tenth, so 6.3 ÷ 3 = 2.1. A known fact helps too: 63 ÷ 3 = 21, so 6.3 ÷ 3 = 2.1.',
          alt: 'Share out the ones, then the tenths, then the hundredths. Or divide without the point and put the digits back in the same columns.',
        },
        {
          text: 'With <b>short division</b>, exchange what is left over into the next column. 7.2 ÷ 4: 7 ones ÷ 4 = 1, remainder 3. Exchange the 3 ones for 30 tenths: 32 tenths ÷ 4 = 8 tenths. So 7.2 ÷ 4 = 1.8. If something is left at the end, write a 0 in the next column and keep going: 3.4 ÷ 4 = 0.85.',
          alt: 'A remainder is not the end. Change it into the next smaller column — ones into tenths, tenths into hundredths — and divide again.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 5.16 ÷ 3.',
        '5 ones ÷ 3 = 1, remainder 2. Exchange the 2 ones for 20 tenths: 20 + 1 = 21 tenths.',
        '21 tenths ÷ 3 = 7 tenths. Then 6 hundredths ÷ 3 = 2 hundredths.',
        'So 5.16 ÷ 3 = <b>1.72</b>.',
      ],
    },
    faqs: [
      { q: 'Where does the decimal point go in my answer?', a: 'In the column method, keep the points in a line. Then check with an estimate: 3.46 × 4 is about 3 × 4 = 12, so 13.84 makes sense and 138.4 does not.' },
      { q: 'What do I do with a remainder?', a: 'Exchange it into the next column to the right — ones into tenths, tenths into hundredths — and keep dividing. You may need to write a 0 after the last digit first.' },
      { q: 'Why is 0.3 × 4 not 0.12?', a: '0.3 is 3 tenths. 3 tenths × 4 = 12 tenths, and 12 tenths is 1.2. 0.12 is 12 hundredths, which is ten times too small.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          const a = ri(rng, 2, 9), b = ri(rng, 2, 9), ans = dv(a * b, 1);
          return dnum(`Work out 0.${a} × ${b}`, ans, {
            tier, hint: `Use the fact ${a} × ${b}. Then count tenths.`,
            explain: `${a} × ${b} = ${a * b}, so ${a} tenths × ${b} = ${a * b} tenths = ${dec(ans)}.` });
        }
        if (shape === 2) {
          const a = ri(rng, 1, 9), b = ri(rng, 2, 9), ans = dv(a * b, 2);
          return dnum(`Work out ${dec(dv(a, 2))} × ${b}`, ans, {
            tier, hint: `Use the fact ${a} × ${b}. Then count hundredths.`,
            explain: `${a} × ${b} = ${a * b}, so ${many(a, 'hundredth')} × ${b} = ${many(a * b, 'hundredth')} = ${dec(ans)}.` });
        }
        // Share each column, no exchange: 6.3 ÷ 3.
        const b = ri(rng, 2, 4), o = ri(rng, 1, Math.floor(9 / b)), t = ri(rng, 1, Math.floor(9 / b));
        const dividend = dv(o * b * 10 + t * b, 1), ans = dv(o * 10 + t, 1);
        return dnum(`Work out ${dec(dividend)} ÷ ${b}`, ans, {
          tier, hint: `Share the ones by ${b}, then the tenths by ${b}.`,
          explain: `${many(o * b, 'one')} ÷ ${b} = ${many(o, 'one')} and ${many(t * b, 'tenth')} ÷ ${b} = ${many(t, 'tenth')}. So the answer is ${dec(ans)}.` });
      }

      if (tier === 2) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          // Column method with exchanges: a 2-dp number × a one-digit number.
          const x = tail(rng, 3), b = ri(rng, 3, 9), ans = dv(x * b, 2);
          return dnum(`Work out ${dec(dv(x, 2))} × ${b}`, ans, {
            tier, hint: 'Use the column method. Start with the hundredths and exchange when a column makes 10 or more.',
            explain: `${x} × ${b} = ${fmt(x * b)}, and the answer keeps two decimal places: ${dec(dv(x, 2))} × ${b} = ${dec(ans)}.` });
        }
        if (shape === 2) {
          // Short division with an exchange: 5.16 ÷ 3 = 1.72.
          const b = ri(rng, 3, 9), q = ri(rng, 101, 399), ans = dv(q, 2), dividend = dv(q * b, 2);
          return dnum(`Work out ${dec(dividend)} ÷ ${b}`, ans, {
            tier, hint: 'Use short division. Exchange a remainder into the next column.',
            explain: `${fixed(dividend, 2)} is ${fmt(q * b)} hundredths. ${fmt(q * b)} ÷ ${b} = ${q}, so the answer is ${q} hundredths = ${dec(ans)}.` });
        }
        if (shape === 3) {
          // A 0 on the end keeps the division going: 3.4 ÷ 4 = 0.85.
          const b = pick(rng, [2, 4, 5, 6, 8]);
          let A = ri(rng, 11, 199);
          while ((A * b) % 10 !== 0 || A % 10 === 0) A += 1;
          const dividend = dv((A * b) / 10, 1), ans = dv(A, 2);
          return dnum(`Work out ${dec(dividend)} ÷ ${b}`, ans, {
            tier, hint: 'When there is a remainder in the tenths, write a 0 in the hundredths and keep dividing.',
            explain: `Write ${dec(dividend)} as ${fixed(dividend, 2)}. ${A * b} hundredths ÷ ${b} = ${A} hundredths, so the answer is ${dec(ans)}.` });
        }
        // Where does the point go? Misconceptions: point lost, too many places,
        // ones and tenths multiplied separately.
        const o = ri(rng, 1, 9), t = ri(rng, 1, 9), b = ri(rng, 3, 9), x = o * 10 + t;
        const right = dv(x * b, 1);
        const apart = `${o * b}.${t * b}`;
        return mcFrom(rng, `Which is the answer to ${o}.${t} × ${b}?`, dec(right), [fmt(x * b), dec(dv(x * b, 2)), apart, dec(dv(x * b + 10, 1))], {
          tier, hint: `Estimate first: ${o}.${t} × ${b} is about ${o} × ${b} = ${o * b}.`,
          explain: `${x} × ${b} = ${x * b}, so ${o}.${t} × ${b} = ${dec(right)}. That is close to the estimate ${o * b}.` });
      }

      const stories = [
        (r) => {
          const name = pick(r, NAMES), p = ri(r, 115, 495), n = ri(r, 3, 6), ans = dv(p * n, 2);
          return dnum(`A notebook costs ${money(dv(p, 2))}. ${name} buys ${n} notebooks. How much does ${name} pay?`, ans, {
            tier: 3, unit: 'pounds', hint: `Work out ${money(dv(p, 2))} × ${n}. You can think in pence: ${p}p × ${n}.`,
            explain: `${p}p × ${n} = ${p * n}p = ${money(ans)}.` });
        },
        (r) => {
          const name = pick(r, NAMES), n = ri(r, 3, 5), each = ri(r, 105, 299), ans = dv(each, 2);
          return dnum(`${name} shares ${money(dv(each * n, 2))} equally between ${n} friends. How much does each friend get?`, ans, {
            tier: 3, unit: 'pounds', hint: `Divide ${money(dv(each * n, 2))} by ${n} with short division.`,
            explain: `${each * n}p ÷ ${n} = ${each}p, so each friend gets ${money(ans)}.` });
        },
        (r) => {
          const ml = pick(r, [125, 175, 225, 250, 375, 450]), n = ri(r, 3, 8), ans = dv(ml * n, 2);
          return dnum(`A bottle holds ${dec(dv(ml, 2))} litres of juice. How many litres do ${n} bottles hold?`, ans, {
            tier: 3, unit: 'litres', hint: `Work out ${dec(dv(ml, 2))} × ${n}.`,
            explain: `${ml} × ${n} = ${fmt(ml * n)}, so ${dec(dv(ml, 2))} × ${n} = ${dec(ans)} litres.` });
        },
        (r) => {
          const name = pick(r, NAMES), x = tail(r, 3), b = ri(r, 3, 9), truth = r() < 0.5;
          const right = dv(x * b, 2), shown = truth ? right : dv(x * b, 1);
          return tf(`${name} says ${dec(dv(x, 2))} × ${b} = ${dec(shown)}. Is ${name} right?`, truth, {
            tier: 3, hint: `Estimate: ${dec(dv(x, 2))} is about ${Math.round(x / 100)}, so the answer is about ${Math.round(x / 100) * b}.`,
            explain: `${dec(dv(x, 2))} × ${b} = ${dec(right)}.${truth ? '' : ` ${dec(shown)} is ten times too big.`}` });
        },
        (r) => {
          const pieces = ri(r, 3, 6), each = ri(r, 12, 95), len = dv(each * pieces, 2), ans = dv(each, 2);
          return dnum(`A plank is ${dec(len)} m long. It is cut into ${pieces} equal pieces. How long is each piece, in metres?`, ans, {
            tier: 3, unit: 'm', hint: `Work out ${dec(len)} ÷ ${pieces} with short division.`,
            explain: `${dec(len)} m is ${each * pieces} hundredths of a metre. ${each * pieces} ÷ ${pieces} = ${each}, so each piece is ${dec(ans)} m.` });
        },
      ];
      return scenario(rng, 'u07-dec-ops-t3', stories);
    },
  },

  // ---------------------------------------------------------------- Unit 8a
  {
    id: 'u08-pct-of', unit: 8, book: '6B', strand: 'percentages', emoji: '🏷️',
    title: 'Percentages of amounts', shortTitle: 'Percentage of',
    explanation: {
      segments: [
        {
          text: '<b>Per cent</b> means out of 100, so the whole amount is 100%. 50% is a half, 25% is a quarter and 75% is three quarters. 50% of 60 = 60 ÷ 2 = 30. 25% of 60 = 60 ÷ 4 = 15, and 75% of 60 = 3 × 15 = 45.',
          alt: 'Think of the whole amount as 100%. Half of 100% is 50%, so 50% of an amount is half of it. A quarter of 100% is 25%, so 25% is a quarter of the amount.',
          svg: barModel(60, [15, 15, 15, 15], { partLabels: ['25%', '25%', '25%', '25%'], wholeLabel: '60 = 100%' }),
        },
        {
          text: '10% is one tenth, so divide by 10: 10% of 240 = 24. 1% is one hundredth, so divide by 100: 1% of 300 = 3. Then multiply: 30% is 3 lots of 10%, so 30% of 240 = 3 × 24 = 72.',
          alt: 'Cut the whole into 10 equal parts. One part is 10%. Find one part by dividing by 10, then take as many parts as you need.',
          svg: barModel(240, Array(10).fill(24), { partLabels: Array(10).fill('24'), wholeLabel: '240 = 100% · each part 10%' }),
        },
        {
          text: 'Build other percentages from the ones you know. 35% = 25% + 10%. 15% = 10% + 5%, and 5% is half of 10%. 12% = 10% + 1% + 1%. 60% = 50% + 10%. Find each piece, then add.',
          alt: 'Split a hard percentage into easy pieces like 50%, 25%, 10%, 5% and 1%. Work out each piece of the amount, then add the pieces together.',
        },
        {
          text: 'Sometimes you know a part and need the <b>whole</b>. If 10% of a number is 6, then 100% is 10 × 6 = 60. If 25% is 15, the whole is 4 × 15 = 60. To find what percentage 20 is of 80, write it as a fraction: ' + fr(20, 80) + ' = ' + fr(1, 4) + ' = 25%.',
          alt: 'Work backwards. How many times does the percentage you know fit into 100%? Multiply the part by that number to get the whole.',
        },
      ],
    },
    example: {
      steps: [
        'Find 35% of £60.',
        '10% of £60 is £60 ÷ 10 = £6.',
        '25% of £60 is £60 ÷ 4 = £15.',
        '35% = 25% + 10%, so 35% of £60 = £15 + £6 = <b>£21</b>.',
      ],
    },
    faqs: [
      { q: 'Is 10% always the same as dividing by 10?', a: 'Yes. 10% is one tenth, so 10% of any amount is the amount ÷ 10. In the same way, 1% is the amount ÷ 100.' },
      { q: 'How do I find 5%?', a: 'Find 10% first, then halve it. 5% of 80: 10% is 8, so 5% is 4.' },
      { q: 'Can the answer be a decimal?', a: 'Yes. 15% of £24 is £3.60. Work it out the same way: 10% is £2.40, 5% is £1.20, and together they make £3.60.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          const p = pick(rng, [50, 25, 75]), k = ri(rng, 2, 25), amount = 4 * k, ans = (amount * p) / 100;
          const [name, by] = { 50: ['a half', 2], 25: ['a quarter', 4], 75: ['three quarters', 4] }[p];
          return dnum(`What is ${p}% of ${amount}?`, ans, {
            tier, svg: barModel(amount, [k, k, k, k], { partLabels: ['25%', '25%', '25%', '25%'], wholeLabel: `${amount} = 100%` }),
            hint: `${p}% is ${name}.`,
            explain: p === 75
              ? `25% of ${amount} = ${amount} ÷ 4 = ${k}. 75% is 3 lots of 25%: 3 × ${k} = ${ans}.`
              : `${p}% is ${name}: ${amount} ÷ ${by} = ${ans}.` });
        }
        if (shape === 2) {
          const ten = rng() < 0.6, k = ten ? ri(rng, 2, 60) : ri(rng, 2, 9), amount = ten ? 10 * k : 100 * k;
          return dnum(`What is ${ten ? 10 : 1}% of ${fmt(amount)}?`, k, {
            tier, hint: ten ? '10% is one tenth: divide by 10.' : '1% is one hundredth: divide by 100.',
            explain: `${ten ? 10 : 1}% of ${fmt(amount)} = ${fmt(amount)} ÷ ${ten ? 10 : 100} = ${k}.` });
        }
        const p = pick(rng, [20, 30, 40, 60, 70, 80, 90]), k = ri(rng, 2, 20), amount = 10 * k, ans = (p / 10) * k;
        return dnum(`What is ${p}% of ${amount}?`, ans, {
          tier, hint: `Find 10% first. ${p}% is ${p / 10} lots of 10%.`,
          explain: `10% of ${amount} = ${k}. ${p}% = ${p / 10} × 10%, so ${p / 10} × ${k} = ${ans}.` });
      }

      if (tier === 2) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          // Build the percentage from 50/25/10/5/1 % pieces.
          const p = pick(rng, [15, 35, 45, 55, 65, 12, 21, 32]);
          const parts = pieces(p), needOne = parts.some(([x]) => x === 1);
          const amount = needOne ? 100 * ri(rng, 2, 9) : 20 * ri(rng, 2, 20), ans = (amount * p) / 100;
          const say = parts.map(([x, c]) => {
            const v = (amount * x) / 100;
            return c === 1 ? `${x}% of ${fmt(amount)} = ${fmt(v)}` : `${x}% of ${fmt(amount)} = ${fmt(v)}, and ${c} × ${fmt(v)} = ${fmt(c * v)}`;
          });
          const sums = parts.map(([x, c]) => fmt((c * amount * x) / 100));
          return dnum(`What is ${p}% of ${fmt(amount)}?`, ans, {
            tier, hint: `Split ${p}% into pieces you know: ${parts.map(([x, c]) => (c === 1 ? `${x}%` : `${c} × ${x}%`)).join(' + ')}.`,
            explain: `${say.join('. ')}. Add: ${sums.join(' + ')} = ${fmt(ans)}.` });
        }
        if (shape === 2) {
          // Money with pence: 15 % of £24 = £3.60.
          const p = pick(rng, [5, 15, 20, 25, 30, 35]), A = ri(rng, 12, 96);
          const a = Math.floor(p / 10), five = p % 10 === 5;
          const ten = dv(A * 10, 2), half = dv(A * 5, 2), ans = pctOf(A, 0, p);
          const sum = [a ? (a === 1 ? money(ten) : `${a} × ${money(ten)}`) : '', five ? money(half) : ''].filter(Boolean);
          const last = a > 1 || sum.length > 1 ? ` So ${p}% = ${sum.join(' + ')} = ${money(ans)}.` : '';
          return dnum(`What is ${p}% of £${A}?`, ans, {
            tier, unit: 'pounds', hint: 'Find 10% first (divide by 10). 5% is half of 10%.',
            explain: `10% of £${A} = ${money(ten)}.${five ? ` 5% is half of that: ${money(half)}.` : ''}${last}` });
        }
        if (shape === 3) {
          const p = pick(rng, [10, 20, 25, 50]), part = ri(rng, 2, 30), whole = (part * 100) / p;
          return dnum(`${p}% of a number is ${part}. What is the number?`, whole, {
            tier, hint: `How many lots of ${p}% make 100%?`,
            explain: `${p}% fits into 100% ${100 / p} times, so the number is ${100 / p} × ${part} = ${fmt(whole)}.` });
        }
        const [whole, p] = pick(rng, [[80, 25], [40, 10], [60, 50], [200, 30], [50, 20], [20, 75], [300, 5], [40, 75], [500, 40], [25, 60]]);
        const part = (whole * p) / 100;
        return pnum(`What percentage of ${whole} is ${part}?`, p, {
          tier, hint: `Write ${part} out of ${whole} as a fraction, then make the denominator 100.`,
          explain: `${fr(part, whole)} = ${fr(p, 100)}, so ${part} is ${p}% of ${whole}.` });
      }

      const stories = [
        (r) => {
          const price = 20 * ri(r, 2, 10), p = pick(r, [10, 20, 25, 50, 30]), off = (price * p) / 100;
          return dnum(`A coat costs £${price}. In a sale there is ${p}% off. What is the sale price?`, price - off, {
            tier: 3, unit: 'pounds', hint: `Find ${p}% of £${price} first. Then take it away.`,
            explain: `${p}% of £${price} = £${off}. £${price} − £${off} = £${price - off}.` });
        },
        (r) => {
          const [n, p] = pick(r, [[30, 40], [25, 20], [20, 35], [40, 75], [50, 30], [30, 70], [25, 60]]);
          const ans = (n * p) / 100;
          return dnum(`There are ${n} children in a class. ${p}% of them walk to school. How many children walk to school?`, ans, {
            tier: 3, hint: `Find 10% (or 5%) of ${n} first and build ${p}% from it.`,
            explain: `${p}% of ${n} = ${n} × ${p} ÷ 100 = ${ans}.` });
        },
        (r) => {
          const name = pick(r, NAMES), p = pick(r, [10, 20, 25, 50]), part = 5 * ri(r, 3, 20), whole = (part * 100) / p;
          return dnum(`${name} has read ${p}% of a book. That is ${part} pages. How many pages does the book have?`, whole, {
            tier: 3, hint: `${part} pages are ${p}%. How many lots of ${p}% make 100%?`,
            explain: `100% is ${100 / p} × ${p}%, so the book has ${100 / p} × ${part} = ${whole} pages.` });
        },
        (r) => {
          const a = [pick(r, [20, 30, 40, 60]), 10 * ri(r, 3, 12)], b = [pick(r, [25, 50, 75]), 4 * ri(r, 5, 30)];
          const va = (a[0] * a[1]) / 100, vb = (b[0] * b[1]) / 100;
          const la = `${a[0]}% of ${a[1]}`, lb = `${b[0]}% of ${b[1]}`, same = 'They are the same';
          const right = va === vb ? same : va > vb ? la : lb;
          return mcFrom(r, `Which is more: ${la} or ${lb}?`, right, [la, lb, same].filter((x) => x !== right), {
            tier: 3, hint: 'Work out both, then compare.',
            explain: `${la} = ${fmt(va)} and ${lb} = ${fmt(vb)}.${va === vb ? ' They are the same.' : ''}` });
        },
        (r) => {
          const tenths = ri(r, 12, 30), p = pick(r, [10, 20, 30, 40, 50]), ans = pctOf(tenths, 1, p);
          return dnum(`A bag holds ${dec(dv(tenths, 1))} kg of flour. A recipe uses ${p}% of it. How many kg is that?`, ans, {
            tier: 3, unit: 'kg', hint: `10% of ${dec(dv(tenths, 1))} kg is ${dec(dv(tenths, 2))} kg.`,
            explain: `10% = ${dec(dv(tenths, 2))} kg, so ${p}% = ${p / 10} × ${dec(dv(tenths, 2))} = ${dec(ans)} kg.` });
        },
      ];
      return scenario(rng, 'u08-pct-of-t3', stories);
    },
  },

  // ---------------------------------------------------------------- Unit 8b
  {
    id: 'u08-pct-equiv', unit: 8, book: '6B', strand: 'percentages', emoji: '🔁',
    title: 'Fractions, decimals and percentages', shortTitle: 'Fractions, decimals, %',
    explanation: {
      segments: [
        {
          text: 'A percentage is a number of hundredths. To change a fraction into a percentage, find an <b>equivalent fraction</b> with 100 at the bottom: ' + fr(3, 5) + ' = ' + fr(60, 100) + ' = 60% and ' + fr(7, 20) + ' = ' + fr(35, 100) + ' = 35%.',
          alt: 'Make the denominator 100. Whatever you multiply the bottom by, multiply the top by the same number. The new top number is the percentage.',
          svg: hundredSquare(35),
        },
        {
          text: 'Decimals and percentages: 0.35 is 35 hundredths, so 0.35 = 35%. To go from a decimal to a percentage, multiply by 100. To go back, divide by 100: 8% = 0.08 and 0.8 = 80%.',
          alt: 'Per cent means hundredths. 0.8 is 8 tenths, and 8 tenths are 80 hundredths, so 0.8 is 80%, not 8%.',
        },
        {
          text: 'To write a percentage as a fraction, put it over 100 and <b>simplify</b>: 45% = ' + fr(45, 100) + ' = ' + fr(9, 20) + ' and 4% = ' + fr(4, 100) + ' = ' + fr(1, 25) + '.',
          alt: 'Write the percentage on top of 100. Then divide the top and the bottom by the same number until you cannot simplify any more.',
        },
        {
          text: 'To compare or order fractions, decimals and percentages, change them all into the same form. Percentages are often easiest. Which is bigger, ' + fr(3, 5) + ' or 0.55? ' + fr(3, 5) + ' = 60% and 0.55 = 55%, so ' + fr(3, 5) + ' is bigger.',
          alt: 'You cannot compare numbers in different forms just by looking. Turn each one into a percentage first, then compare.',
        },
      ],
    },
    example: {
      steps: [
        'Put ' + fr(3, 5) + ', 0.55 and 62% in order, smallest first.',
        fr(3, 5) + ' = ' + fr(60, 100) + ' = 60%.',
        '0.55 = 55 hundredths = 55%.',
        'So the order is <b>0.55, ' + fr(3, 5) + ', 62%</b>.',
      ],
    },
    faqs: [
      { q: 'Is 0.4 the same as 4%?', a: 'No. 0.4 is 4 tenths, which is 40 hundredths, so 0.4 = 40%. 4% is 0.04.' },
      { q: 'What if the denominator does not go into 100?', a: 'Try simplifying first: ' + fr(12, 40) + ' = ' + fr(3, 10) + ' = 30%. Or divide: ' + fr(3, 8) + ' = 3 ÷ 8 = 0.375 = 37.5%.' },
      { q: 'Which form is best for comparing?', a: 'Usually percentages, because then every number is out of 100.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          const d = pick(rng, [2, 4, 5, 10, 20, 25, 50]), n = ri(rng, 1, d - 1), m = 100 / d, p = n * m;
          return pnum(`Write ${fr(n, d)} as a percentage.`, p, {
            tier, hint: 'Make the denominator 100.',
            explain: `${d} × ${m} = 100, so ${fr(n, d)} = ${fr(p, 100)} = ${p}%.` });
        }
        if (shape === 2) {
          const p = rng() < 0.3 ? 10 * ri(rng, 1, 9) : ri(rng, 1, 99);
          return pnum(`Write ${dec(dv(p, 2))} as a percentage.`, p, {
            tier, hint: 'Per cent means hundredths. How many hundredths is it?',
            explain: `${dec(dv(p, 2))} = ${p} hundredths = ${p}%.` });
        }
        const p = rng() < 0.3 ? ri(rng, 1, 9) : ri(rng, 11, 99);
        return dnum(`Write ${p}% as a decimal.`, dv(p, 2), {
          tier, hint: `${p}% is ${p} hundredths.`,
          explain: `${p}% = ${fr(p, 100)} = ${dec(dv(p, 2))}.` });
      }

      if (tier === 2) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          const p = pick(rng, [4, 5, 8, 12, 15, 24, 25, 35, 40, 45, 55, 60, 64, 75, 80, 85]), g = gcd(p, 100);
          return frac(`Write ${p}% as a fraction in its simplest form.`, p / g, 100 / g, {
            exact: true, tier, hint: `Write ${p} over 100, then simplify.`,
            explain: `${p}% = ${fr(p, 100)}. Divide the top and the bottom by ${g}: ${fr(p / g, 100 / g)}.` });
        }
        if (shape === 2) {
          // Simplify first, or "n out of m": 18 out of 24 = 3/4 = 75 %.
          const [n0, d0] = pick(rng, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10], [7, 20], [11, 20]]);
          const k = pick(rng, [2, 3, 4, 6]), n = n0 * k, d = d0 * k, p = (n0 * 100) / d0;
          if (rng() < 0.5) {
            const name = pick(rng, NAMES);
            return pnum(`A test has ${d} marks. ${name} scores ${n}. What percentage is that?`, p, {
              tier, hint: `Write ${n} out of ${d} as a fraction. Simplify it, then make the denominator 100.`,
              explain: `${fr(n, d)} = ${fr(n0, d0)} = ${fr(p, 100)} = ${p}%.` });
          }
          return pnum(`Write ${fr(n, d)} as a percentage.`, p, {
            tier, hint: 'Simplify the fraction first, then make the denominator 100.',
            explain: `${fr(n, d)} = ${fr(n0, d0)} = ${fr(p, 100)} = ${p}%.` });
        }
        const items = mixedValues(rng, shape === 3 ? 2 : 3);
        if (shape === 3) {
          const [a, b] = items, right = a.t > b.t ? a.label : b.label;
          return mcFrom(rng, `Which is greater: ${a.label} or ${b.label}?`, right, [a.label, b.label].filter((x) => x !== right), {
            tier, hint: 'Change both into percentages first.',
            explain: `${asPct(a)} and ${asPct(b)}, so ${right} is greater.` });
        }
        const sorted = items.slice().sort((x, y) => x.t - y.t);
        return order('Put these in order, <b>smallest first</b>.', rng, sorted.map((x) => x.label), {
          tier, hint: 'Change them all into percentages, then order them.',
          explain: `As percentages: ${sorted.map(asPct).join(', ')}.` });
      }

      const stories = [
        (r) => {
          const [n, d] = pick(r, [[3, 5], [1, 4], [3, 4], [2, 5], [7, 10], [7, 20], [9, 20], [12, 25]]), p = (n * 100) / d;
          const fruit = pick(r, ['apples', 'bananas', 'grapes', 'oranges']);
          return pnum(`In a survey, ${fr(n, d)} of the children chose ${fruit}. What percentage did NOT choose ${fruit}?`, 100 - p, {
            tier: 3, hint: `Change ${fr(n, d)} into a percentage first. The whole is 100%.`,
            explain: `${fr(n, d)} = ${p}%. 100% − ${p}% = ${100 - p}%.` });
        },
        (r) => {
          const name = pick(r, NAMES), t = ri(r, 1, 9), truth = r() < 0.5;
          const shown = truth ? 10 * t : t;
          return tf(`${name} says ${dec(dv(t, 1))} = ${shown}%. Is ${name} right?`, truth, {
            tier: 3, hint: `${dec(dv(t, 1))} is ${t} tenths. How many hundredths is that?`,
            explain: `${dec(dv(t, 1))} = ${t} tenths = ${10 * t} hundredths = ${10 * t}%.${truth ? '' : ` ${t}% would be ${dec(dv(t, 2))}.`}` });
        },
        (r) => {
          const items = mixedValues(r, 4), sorted = items.slice().sort((x, y) => y.t - x.t);
          return order('Put these in order, <b>largest first</b>.', r, sorted.map((x) => x.label), {
            tier: 3, hint: 'Change them all into percentages, then start with the biggest.',
            explain: `As percentages: ${sorted.map(asPct).join(', ')}.` });
        },
        (r) => {
          const a = pick(r, NAMES), b = pick(r, NAMES.filter((x) => x !== a));
          const [n, d] = pick(r, [[18, 25], [16, 20], [21, 25], [7, 10], [13, 20], [42, 50]]), pa = (n * 100) / d;
          const pb = pa + pick(r, [-10, -5, 5, 10, 0]);
          const same = 'They scored the same', right = pa === pb ? same : pa > pb ? a : b;
          return mcFrom(r, `${a} scored ${n} out of ${d} in a test. ${b} scored ${pb}%. Who did better?`, right, [a, b, same].filter((x) => x !== right), {
            tier: 3, hint: `Change ${n} out of ${d} into a percentage.`,
            explain: `${fr(n, d)} = ${fr(pa, 100)} = ${pa}%, and ${b} scored ${pb}%.${pa === pb ? ' The same.' : ''}` });
        },
        (r) => {
          const p = pick(r, [35, 45, 55, 65, 15, 85, 24, 76]), q = 100 - p, g = gcd(q, 100);
          return frac(`${p}% of the children in a class are girls. What fraction are boys? Give it in its simplest form.`, q / g, 100 / g, {
            exact: true, tier: 3, hint: 'Find the percentage of boys first. Then write it over 100 and simplify.',
            explain: `100% − ${p}% = ${q}%. ${q}% = ${fr(q, 100)} = ${fr(q / g, 100 / g)}.` });
        },
      ];
      return scenario(rng, 'u08-pct-equiv-t3', stories);
    },
  },
];
