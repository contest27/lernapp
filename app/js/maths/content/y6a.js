// Book 6A — Term 1: place value to 10,000,000, four operations, fractions,
// position and direction.
// Topic structure and vocabulary follow the official Power Maths Y6 lesson
// list (quality_reports/reference/y6-yearly-overview.md); the topic split is
// quality_reports/reference/y6-topic-spine.md.
//
// Units 1–2 live in this file; units 3+6 in y6a-u3u6.js, units 4–5 in
// y6a-frac.js. Composed here so the book array keeps unit order (and with it
// strand contiguity).

import { num, tf, order, mcFrom, fmt, ri, pick, distinctInts, scenario, unambiguousDigitPositions } from './gen.js';
import { pvGrid, numberLine, barModel } from './vis.js';
import { topics6aU3, topics6aU6 } from './y6a-u3u6.js';
import { topics6aFrac } from './y6a-frac.js';

const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];

// Build an integer with `digits` digits, never starting with 0.
function makeNum(rng, digits) {
  let s = String(ri(rng, 1, 9));
  for (let i = 1; i < digits; i++) s += String(ri(rng, 0, 9));
  return Number(s);
}

const PLACE_NAMES = ['millions', 'hundred-thousands', 'ten-thousands', 'thousands', 'hundreds', 'tens', 'ones'];

const topics6aU1U2 = [

  // ---------------------------------------------------------------- Unit 1
  {
    id: 'u01-pv10m', unit: 1, book: '6A', strand: 'place', emoji: '🔢',
    title: 'Place value within 10,000,000', shortTitle: 'Numbers to 10 million',
    explanation: {
      segments: [
        {
          text: 'This year numbers grow all the way to <b>10,000,000</b> — ten million! The columns you know keep going: after hundred-thousands comes the millions column. Each column is worth ten times the one to its right.',
          alt: 'Numbers up to ten million work exactly like smaller ones. Every step to the left makes a digit worth ten times more — and the new column this year is the millions.',
          svg: pvGrid(3452801),
        },
        {
          text: 'To read a long number, use the commas: they cut it into blocks of three. 4,382,506 reads "four million, three hundred and eighty-two thousand, five hundred and six".',
          alt: 'The commas are your reading helpers. Say the block before the first comma with "million", the next block with "thousand", then the rest.',
        },
        {
          text: 'To compare big numbers, start from the LEFT. 6,240,000 beats 5,990,000 because six millions beat five millions — even though the 9s look bigger. If the front digits match, move one column right and compare again.',
          alt: 'Comparing is a race that starts on the left. The first column where the digits differ decides the winner. Only when digits are equal do you look further right.',
        },
        {
          text: 'A number line to 10,000,000 works like any other — you just have to work out what one step is worth. If the line goes from 3,000,000 to 4,000,000 with ten steps, each step is 100,000.',
          alt: 'On a number line, first find the value of one small jump: take the distance between the ends and share it between the steps.',
          svg: numberLine(3000000, 4000000, [{ v: 3600000, label: '?' }], { step: 100000 }),
        },
      ],
    },
    example: {
      steps: [
        'What is the value of the digit 7 in 2,748,301?',
        'Find its column: the 7 sits in the hundred-thousands.',
        'So it is worth 7 × 100,000 = <b>700,000</b>.',
      ],
    },
    faqs: [
      { q: 'How many zeros does a million have?', a: 'Six! 1,000,000 is a thousand thousands. Ten million has seven zeros.' },
      { q: 'Why do we start comparing from the left?', a: 'Because the left column is worth the most. One extra million beats any number of extra thousands, so the biggest column decides first.' },
      { q: 'What does the 0 in 4,058,000 do?', a: 'It is a place holder in the hundred-thousands. Without it the other digits would slide over and the number would collapse into 458,000 — totally different!' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const n = makeNum(rng, 7);
          // Only a digit that occurs ONCE can be named by its face value —
          // "the digit 5 in 5,565,391" would have three answers. Zeros are
          // excluded by the same helper (a place holder is worth nothing to
          // ask about), which is what the old `digit === 0` retry did.
          const spots = unambiguousDigitPositions(String(n));
          if (!spots.length) return this.gen(rng, tier);
          const pos = pick(rng, spots);
          const digit = Number(String(n)[pos]);
          const value = digit * 10 ** (6 - pos);
          return num(`What is the <b>value</b> of the digit ${digit} in ${fmt(n)}?`, value, {
            tier, svg: pvGrid(n),
            hint: 'Which column is that digit standing in?',
            explain: `The ${digit} is in the ${PLACE_NAMES[pos]} column, so it is worth ${fmt(value)}.`,
          });
        }
        const m = ri(rng, 1, 9), th = ri(rng, 10, 999), o = ri(rng, 1, 999);
        const n = m * 1000000 + th * 1000 + o;
        return num(`Write as one number: ${m} million + ${fmt(th)} thousand + ${o}`, n, {
          tier, hint: 'Millions have six zeros, thousands have three. Drop each part into its columns.',
          explain: `${fmt(m * 1000000)} + ${fmt(th * 1000)} + ${o} = ${fmt(n)}.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const a = makeNum(rng, 7);
          let b = a;
          while (b === a) b = makeNum(rng, 7);
          const bigger = rng() < 0.5;
          return tf(`True or false: ${fmt(a)} ${bigger ? '&gt;' : '&lt;'} ${fmt(b)}`, bigger ? a > b : a < b, {
            tier, hint: 'Compare from the left, column by column.',
            explain: `The first different column decides: ${fmt(Math.max(a, b))} is the bigger number.`,
          });
        }
        if (kind === 2) {
          const base = ri(rng, 1, 8) * 1000000;
          const markVal = base + ri(rng, 1, 9) * 100000;
          return num('What number is the mark showing?', markVal, {
            tier, svg: numberLine(base, base + 1000000, [markVal], { step: 100000 }),
            hint: 'The line covers one million in ten steps — what is one step worth?',
            explain: `Each step is 100,000, so the mark shows ${fmt(markVal)}.`,
          });
        }
        const n = makeNum(rng, 7);
        const step = pick(rng, [1000, 10000, 100000, 1000000]);
        const more = rng() < 0.5;
        const ans = more ? n + step : n - step;
        if (ans < 0 || ans > 9999999) return this.gen(rng, tier);
        return num(`What is ${fmt(step)} ${more ? 'more' : 'less'} than ${fmt(n)}?`, ans, {
          tier, hint: 'Only one column changes — unless a digit crosses a 9 or a 0!',
          explain: `${fmt(n)} → ${fmt(ans)}.`,
        });
      }
      // Not stories, but still dealt from a deck so consecutive tier-3 draws
      // never show the same task shape twice in a row.
      const tasks = [
        (r) => {
          const lead = ri(r, 2, 8);
          const nums = distinctInts(r, 4, lead * 1000000, lead * 1000000 + 999999).map(fmt);
          const sorted = nums.slice().sort((a, b) => Number(a.replace(/,/g, '')) - Number(b.replace(/,/g, '')));
          return order('Put these numbers in order, <b>smallest first</b>.', r, sorted, {
            tier: 3, hint: 'They all start with the same millions — compare the next column along.',
            explain: 'When the front digits match, the next column to the right decides.',
          });
        },
        (r) => {
          // Partition riddle: the parts are named out of column order.
          const m = ri(r, 1, 9), tth = ri(r, 1, 9), h = ri(r, 1, 9);
          const n = m * 1000000 + tth * 10000 + h * 100;
          return num(`A number has ${h} hundreds, ${m} millions, ${tth} ten-thousands and nothing else. What is the number?`, n, {
            tier: 3, hint: 'Put each part into its own column — and fill every empty column with 0.',
            explain: `${fmt(m * 1000000)} + ${fmt(tth * 10000)} + ${h * 100} = ${fmt(n)}. The zeros hold the empty columns open.`,
          });
        },
      ];
      return scenario(rng, 'u01-pv10m-t3', tasks);
    },
  },

  {
    id: 'u01-round-neg', unit: 1, book: '6A', strand: 'place', emoji: '🌡️',
    title: 'Rounding and negative numbers', shortTitle: 'Round & negatives',
    explanation: {
      segments: [
        {
          text: 'Rounding works the same however big the number: find the two neighbours, then look at the digit ONE column to the right of where you are rounding. 5 or more rounds up, less than 5 rounds down. 3,472,690 to the nearest million → the hundred-thousands digit is 4 → round DOWN to 3,000,000.',
          alt: 'To round, ask: which neat number am I closest to? Look at the digit just right of the rounding place. Small digit (0–4): stay down. Big digit (5–9): jump up.',
        },
        {
          text: 'This year you can round to ANY place — nearest 10 up to nearest 1,000,000. The same number gives different roundings: 3,472,690 is 3,470,000 to the nearest ten-thousand but 3,500,000 to the nearest hundred-thousand.',
          alt: 'One number, many roundings! It depends which place you round to. Always check the question: nearest thousand? Nearest million?',
        },
        {
          text: 'Numbers below zero are <b>negative</b>. On a number line they sit to the LEFT of 0: −1, −2, −3… The further left, the smaller: −6 is smaller than −2, even though 6 looks bigger.',
          alt: 'Negative numbers are the "below zero" numbers, like winter temperatures. Careful: with a minus sign, the bigger-looking number is actually smaller. −6 °C is colder than −2 °C.',
          svg: numberLine(-8, 4, [{ v: -6, label: '−6' }, { v: -2, label: '−2' }], { step: 1 }),
        },
        {
          text: 'To count from a negative number to a positive one, cross zero in two hops. From −4 to 7: first 4 steps up to 0, then 7 more — 11 steps altogether.',
          alt: 'Crossing zero? Split the journey! Count up to 0 first, then carry on. The two parts added together give the whole distance.',
        },
      ],
    },
    example: {
      steps: [
        'The temperature was −5 °C at night and 8 °C at lunch. How many degrees did it rise?',
        'From −5 up to 0 is 5 degrees.',
        'From 0 up to 8 is 8 degrees.',
        '5 + 8 = <b>13 degrees</b>.',
      ],
    },
    faqs: [
      { q: 'Is −6 bigger or smaller than −2?', a: 'Smaller! On the number line −6 is further left than −2. Think of temperatures: −6 °C is colder.' },
      { q: 'What if the digit is exactly 5?', a: 'A 5 always rounds up — that is the rule everyone agrees on, so everyone gets the same answer.' },
      { q: 'Where do I meet negative numbers in real life?', a: 'Cold temperatures, floors below the ground in a lift, and depths below sea level all use negative numbers.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const n = makeNum(rng, 5);
          const r = pick(rng, [10, 100, 1000]);
          return num(`Round ${fmt(n)} to the nearest ${fmt(r)}.`, Math.round(n / r) * r, {
            tier, hint: `Which two multiples of ${fmt(r)} is it between? Which is closer?`,
            explain: `Look one column right of the ${fmt(r)}s: 5 or more rounds up, less than 5 rounds down.`,
          });
        }
        const a = -ri(rng, 1, 9);
        let b = a;
        while (b === a) b = -ri(rng, 1, 9);
        return mcFrom(rng, 'Which temperature is <b>colder</b>?', `${Math.min(a, b)} °C`, [`${Math.max(a, b)} °C`], {
          tier, svg: numberLine(-10, 2, [Math.min(a, b), Math.max(a, b)], { step: 1 }),
          hint: 'Colder means further LEFT on the number line — further below zero.',
          explain: `${Math.min(a, b)} °C is further below zero, so it is colder.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const n = makeNum(rng, 7);
          const r = pick(rng, [10000, 100000, 1000000]);
          return num(`Round ${fmt(n)} to the nearest ${fmt(r)}.`, Math.round(n / r) * r, {
            tier, hint: 'Same rule as small numbers: check the digit one column to the right.',
            explain: `${fmt(n)} rounds to ${fmt(Math.round(n / r) * r)}.`,
          });
        }
        const from = -ri(rng, 2, 9);
        const to = ri(rng, 2, 9);
        return num(`Count the steps from ${from} to ${to} on a number line.`, to - from, {
          tier, svg: numberLine(-10, 10, [{ v: from, label: String(from) }, { v: to, label: String(to) }], { step: 1 }),
          hint: 'Cross zero in two hops: first up to 0, then the rest.',
          explain: `${-from} steps up to 0, then ${to} more: ${-from} + ${to} = ${to - from}.`,
        });
      }
      const stories = [
        (r) => {
          const start = -ri(r, 3, 9), rise = ri(r, 8, 18);
          return num(`At dawn it was ${start} °C. By lunch the temperature had risen by ${rise} degrees. What was it at lunch?`, start + rise, {
            tier: 3, hint: 'Start below zero and climb: cross 0 on the way.',
            explain: `${start} + ${rise} = ${start + rise} °C.`,
          });
        },
        (r) => {
          const day = ri(r, 2, 8), drop = ri(r, 5, 14);
          return num(`It was ${day} °C in the afternoon. Overnight the temperature fell by ${drop} degrees. What was it overnight? (Use − for below zero.)`, day - drop, {
            tier: 3, hint: 'Falling past zero lands you in the negative numbers.',
            explain: `${day} − ${drop} = ${day - drop} °C.`,
          });
        },
        (r) => {
          const floor = ri(r, 2, 3), down = floor + ri(r, 1, 3);
          return num(`${pick(r, NAMES)} gets in the lift on floor ${floor} and goes down ${down} floors to the car park. Which floor is that? (Use − for below ground.)`, floor - down, {
            tier: 3, hint: 'The ground floor is 0 — going below it means negative floors.',
            explain: `${floor} − ${down} = ${floor - down}. Floor ${floor - down} is below ground.`,
          });
        },
        (r) => {
          // Which numbers round to X? — reasoning about rounding boundaries.
          const target = ri(r, 3, 9) * 10000;
          const yes = target - ri(r, 1, 4999);
          const no = target + 5000 + ri(r, 0, 4000);
          return mcFrom(r, `Which number rounds to ${fmt(target)} to the nearest 10,000?`, yes, [no, target + 5000, yes - 10000], {
            tier: 3, hint: `Everything from ${fmt(target - 5000)} up to ${fmt(target + 4999)} rounds to ${fmt(target)}.`,
            explain: `${fmt(yes)} is within 5,000 of ${fmt(target)}, so it rounds there.`,
          });
        },
        (r) => {
          const a = -ri(r, 2, 8), b = ri(r, 3, 9);
          return num(`A fish swims at ${a} m (below the surface). A bird flies at ${b} m. How many metres apart are they?`, b - a, {
            tier: 3, hint: 'Distance across zero = both parts added together.',
            explain: `${-a} m up to the surface, then ${b} m more: ${-a} + ${b} = ${b - a} m.`,
          });
        },
      ];
      return scenario(rng, 'u01-round-neg-t3', stories);
    },
  },

  // ---------------------------------------------------------------- Unit 2
  {
    id: 'u02-addsub', unit: 2, book: '6A', strand: 'fourops', emoji: '➕',
    title: 'Written addition and subtraction', shortTitle: 'Column + and −',
    explanation: {
      segments: [
        {
          text: 'The column method carries you through ANY addition or subtraction, however big the numbers. Line up the columns — ones under ones, tens under tens — and work from the right. If a column makes 10 or more, <b>exchange</b>: write the ones, carry the ten into the next column.',
          alt: 'Column method rules: line the numbers up neatly, start at the ones, and when a column overflows past 9, one group of ten moves house into the next column.',
        },
        {
          text: 'Subtracting works the same way, but exchange runs in reverse: if a column does not have enough, borrow one from the column to its left — one hundred becomes ten tens.',
          alt: 'In subtraction, when the top digit is too small, you break up one of the next column: one hundred turns into ten tens, so the column has enough to take away.',
        },
        {
          text: 'Real problems often need TWO steps and you must choose the operations yourself. Read carefully: words like "how many more" point to subtraction, "altogether" points to addition — and sometimes a number in the story is not needed at all.',
          alt: 'Story problems are detective work: first decide which calculations are needed (there may be two!), then do them. Watch out — some stories mention numbers only to distract you.',
          svg: barModel(4250, [1780, 2470], { partLabels: ['1,780', '?'], wholeLabel: '4,250' }),
        },
        {
          text: 'Always <b>estimate</b> first: round the numbers, add or subtract the rounded ones in your head, and check your exact answer is close. 4,187 + 2,915 is roughly 4,000 + 3,000 = 7,000 — so an answer near 7,102 makes sense, and 4,102 would not.',
          alt: 'An estimate is your safety net. Round the numbers, do the easy sum in your head, and compare. If your exact answer is far away from the estimate, something went wrong.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 5,204 − 2,867.',
        'Ones: 4 − 7 will not go — exchange a ten: 14 − 7 = 7.',
        'Tens: the 0 has no tens, so exchange a hundred: 10 tens, minus the 1 we lent = 9. Then 9 − 6 = 3.',
        'Hundreds: 2 became 1 — exchange a thousand: 11 − 8 = 3. Thousands: 4 − 2 = 2.',
        'Answer: <b>2,337</b>. Check by adding back: 2,337 + 2,867 = 5,204. ✓',
      ],
    },
    faqs: [
      { q: 'Why do we start from the ones, not the left?', a: 'Because an exchange moves LEFT. If you started on the left, a carry from the ones could change columns you had already written.' },
      { q: 'How do I know if a story needs adding or subtracting?', a: '"Altogether", "total", "in all" usually mean add. "How many more", "how many left", "difference" usually mean subtract. Draw a bar model if you are unsure.' },
      { q: 'Do I really need to estimate?', a: 'It takes ten seconds and catches the big mistakes — a missed exchange usually makes the answer wrong by about a thousand, and your estimate spots that instantly.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const a = makeNum(rng, ri(rng, 4, 5));
        const b = makeNum(rng, 4);
        if (rng() < 0.5) {
          return num(`Work out ${fmt(a)} + ${fmt(b)}. Use the column method.`, a + b, {
            tier, hint: 'Line up the ones under the ones. Exchange when a column passes 9.',
            explain: `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`,
          });
        }
        const big = Math.max(a, b * 2), small = Math.min(a, b);
        return num(`Work out ${fmt(big)} − ${fmt(small)}. Use the column method.`, big - small, {
          tier, hint: 'If a column has not enough, exchange one from the next column left.',
          explain: `${fmt(big)} − ${fmt(small)} = ${fmt(big - small)}.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const a = makeNum(rng, 4), c = a + makeNum(rng, 4);
          return num(`Find the missing number: ${fmt(a)} + ? = ${fmt(c)}`, c - a, {
            tier, hint: 'The inverse undoes it: take the part away from the whole.',
            explain: `? = ${fmt(c)} − ${fmt(a)} = ${fmt(c - a)}.`,
          });
        }
        if (kind === 2) {
          const a = makeNum(rng, 5), b = makeNum(rng, 5);
          const est = Math.round(a / 1000) * 1000 + Math.round(b / 1000) * 1000;
          return mcFrom(rng, `Estimate ${fmt(a)} + ${fmt(b)} by rounding each number to the nearest thousand.`, est, [est + 1000, est - 1000, est + 2000], {
            tier, hint: 'Round both numbers to the nearest thousand first, then add the easy way.',
            explain: `${fmt(Math.round(a / 1000) * 1000)} + ${fmt(Math.round(b / 1000) * 1000)} = ${fmt(est)}.`,
          });
        }
        const whole = makeNum(rng, 4) + 2000;
        const part = ri(rng, 500, whole - 500);
        return num('What is the missing part in the bar model?', whole - part, {
          tier, svg: barModel(whole, [part, whole - part], { partLabels: [fmt(part), '?'], wholeLabel: fmt(whole) }),
          hint: 'Whole − known part = missing part.',
          explain: `${fmt(whole)} − ${fmt(part)} = ${fmt(whole - part)}.`,
        });
      }
      const stories = [
        (r) => {
          const sat = makeNum(r, 4) + 10000, sun = makeNum(r, 4) + 8000;
          return num(`A museum had ${fmt(sat)} visitors on Saturday and ${fmt(sun)} on Sunday. How many more came on Saturday?`, sat - sun, {
            tier: 3, hint: '"How many more" asks for the difference.',
            explain: `${fmt(sat)} − ${fmt(sun)} = ${fmt(sat - sun)}.`,
          });
        },
        (r) => {
          const goal = ri(r, 6, 9) * 1000, first = ri(r, 1500, 3500), second = ri(r, 1500, 3000);
          return num(`A school wants to collect ${fmt(goal)} books. They collect ${fmt(first)} in week one and ${fmt(second)} in week two. How many books are still needed?`, goal - first - second, {
            tier: 3, hint: 'Two steps: add what they have, then take it from the goal.',
            explain: `${fmt(first)} + ${fmt(second)} = ${fmt(first + second)}; ${fmt(goal)} − ${fmt(first + second)} = ${fmt(goal - first - second)}.`,
          });
        },
        (r) => {
          const name = pick(r, NAMES);
          const need = ri(r, 4200, 5800), has = ri(r, 900, 1800), earned = ri(r, 800, 1600);
          return num(`${name} needs ${fmt(need)} points for the gold badge. ${name} already has ${fmt(has)} points and wins another ${fmt(earned)} this week. How many points are still missing?`, need - has - earned, {
            tier: 3, hint: 'Two steps: add the points together, then take them from the target.',
            explain: `${fmt(has)} + ${fmt(earned)} = ${fmt(has + earned)}; ${fmt(need)} − ${fmt(has + earned)} = ${fmt(need - has - earned)}.`,
          });
        },
        (r) => {
          const a = makeNum(r, 4) + 3000, b = ri(r, 800, 2000), c = ri(r, 600, 1500), dist = ri(r, 40, 90);
          return num(`A train sets off with ${fmt(a)} passengers. At the first stop ${fmt(b)} get off and ${fmt(c)} get on. (The journey takes ${dist} minutes.) How many passengers are on the train now?`, a - b + c, {
            tier: 3, hint: 'Careful: one number in the story is not needed at all.',
            explain: `${fmt(a)} − ${fmt(b)} + ${fmt(c)} = ${fmt(a - b + c)}. The ${dist} minutes were a distraction!`,
          });
        },
        (r) => {
          const total = ri(r, 7, 9) * 1000 + ri(r, 100, 900);
          const partA = ri(r, 2000, 4000);
          const partB = ri(r, 1000, 2500);
          return num(`Three lorries carry ${fmt(total)} kg between them. The first carries ${fmt(partA)} kg, the second ${fmt(partB)} kg. How much does the third carry?`, total - partA - partB, {
            tier: 3, hint: 'The three parts together make the whole.',
            explain: `${fmt(total)} − ${fmt(partA)} − ${fmt(partB)} = ${fmt(total - partA - partB)} kg.`,
          });
        },
      ];
      return scenario(rng, 'u02-addsub-t3', stories);
    },
  },

  {
    id: 'u02-multiply', unit: 2, book: '6A', strand: 'fourops', emoji: '✖️',
    title: 'Multiplying up to 4 digits', shortTitle: 'Long multiplication',
    explanation: {
      segments: [
        {
          text: 'To multiply a big number by a 1-digit number, use the column method: multiply each digit from the right, and <b>exchange</b> when a column passes 9 — just like addition carries.',
          alt: 'Column multiplication goes digit by digit, starting at the ones. When a column result is 10 or more, the tens of it carry into the next column.',
        },
        {
          text: 'For a 2-digit multiplier, use <b>long multiplication</b>: multiply by the ones digit first, then by the tens digit on a new row — and because it is TENS you are multiplying by, that second row gets a 0 at the end. Add the two rows.',
          alt: 'Long multiplication is two easy multiplications plus one addition. Row 1: times the ones. Row 2: times the tens (write a 0 first!). Then add the rows.',
        },
        {
          text: 'Estimate before you multiply: 2,314 × 28 is roughly 2,000 × 30 = 60,000. If your exact answer is nowhere near, a row or a zero went missing.',
          alt: 'Round both numbers to something friendly and multiply in your head. The real answer must land close to that estimate.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 1,326 × 24.',
        'Row 1 — times the ones: 1,326 × 4 = 5,304.',
        'Row 2 — times the tens: 1,326 × 20 = 26,520 (the 0 first, then 1,326 × 2).',
        'Add the rows: 5,304 + 26,520 = <b>31,824</b>.',
      ],
    },
    faqs: [
      { q: 'Why does the second row need a 0?', a: 'Because you are multiplying by TENS. 1,326 × 2 tens is 1,326 × 2 × 10 — the ×10 is the 0 you write first.' },
      { q: 'Which digit do I multiply by first?', a: 'The ones digit of the bottom number. Then the tens digit on a new row. Working right to left keeps the exchanges tidy.' },
      { q: 'What if I forget an exchange?', a: 'Your estimate catches it! A missed exchange makes the answer wrong by hundreds or thousands — compare with your rounded estimate and you will spot it.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const a = makeNum(rng, ri(rng, 3, 4));
        const b = ri(rng, 3, 9);
        return num(`Work out ${fmt(a)} × ${b}.`, a * b, {
          tier, hint: 'Column method: multiply each digit from the right, exchange past 9.',
          explain: `${fmt(a)} × ${b} = ${fmt(a * b)}.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.6) {
          const a = ri(rng, 120, 999);
          const b = ri(rng, 12, 39);
          return num(`Work out ${fmt(a)} × ${b} with long multiplication.`, a * b, {
            tier, hint: `Two rows: ${fmt(a)} × ${b % 10}, then ${fmt(a)} × ${Math.floor(b / 10)}0. Add them.`,
            explain: `${fmt(a)} × ${b % 10} = ${fmt(a * (b % 10))}; ${fmt(a)} × ${Math.floor(b / 10) * 10} = ${fmt(a * Math.floor(b / 10) * 10)}; together ${fmt(a * b)}.`,
          });
        }
        const a = ri(rng, 1100, 4900), b = ri(rng, 18, 32);
        const est = Math.round(a / 1000) * 1000 * Math.round(b / 10) * 10;
        return mcFrom(rng, `Estimate ${fmt(a)} × ${b} by rounding both numbers.`, est, [est + 10000, Math.max(1000, est - 10000), est * 10], {
          tier, hint: `Round ${fmt(a)} to the nearest thousand and ${b} to the nearest ten.`,
          explain: `${fmt(Math.round(a / 1000) * 1000)} × ${Math.round(b / 10) * 10} = ${fmt(est)}.`,
        });
      }
      const stories = [
        (r) => {
          const rows = ri(r, 24, 48), seats = ri(r, 18, 36), blocks = ri(r, 2, 4);
          return num(`A theatre has ${blocks} blocks of seats. Each block has ${rows} rows with ${seats} seats. How many seats are there altogether?`, blocks * rows * seats, {
            tier: 3, hint: 'Seats in one block first, then times the number of blocks.',
            explain: `${rows} × ${seats} = ${fmt(rows * seats)} per block; × ${blocks} = ${fmt(blocks * rows * seats)}.`,
          });
        },
        (r) => {
          const perDay = ri(r, 1200, 2400);
          return num(`A bakery makes ${fmt(perDay)} rolls every day. How many rolls does it make in a fortnight?`, perDay * 14, {
            tier: 3, hint: 'How many days is a fortnight? The number hides in the word.',
            explain: `A fortnight is 14 days: ${fmt(perDay)} × 14 = ${fmt(perDay * 14)}.`,
          });
        },
        (r) => {
          const name = pick(r, NAMES);
          const laps = ri(r, 12, 18), metres = ri(r, 250, 420), extra = ri(r, 40, 90);
          return num(`${name} swims ${laps} lengths of ${metres} m — and then one extra length of ${extra} m to cool down. How many metres altogether?`, laps * metres + extra, {
            tier: 3, hint: 'Multiply first, then add the cool-down length.',
            explain: `${laps} × ${metres} = ${fmt(laps * metres)}; + ${extra} = ${fmt(laps * metres + extra)} m.`,
          });
        },
        (r) => {
          const box = ri(r, 36, 96), crates = ri(r, 15, 28), broken = ri(r, 10, 40);
          return num(`A shop orders ${crates} crates with ${box} apples in each. ${broken} apples arrive bruised and are thrown away. How many good apples are left?`, box * crates - broken, {
            tier: 3, hint: 'Total apples first, then take away the bruised ones.',
            explain: `${crates} × ${box} = ${fmt(box * crates)}; − ${broken} = ${fmt(box * crates - broken)}.`,
          });
        },
      ];
      return scenario(rng, 'u02-multiply-t3', stories);
    },
  },

  {
    id: 'u02-divide', unit: 2, book: '6A', strand: 'fourops', emoji: '➗',
    title: 'Dividing by a 2-digit number', shortTitle: 'Long division',
    explanation: {
      segments: [
        {
          text: 'Short division ("the bus stop") works digit by digit from the left: divide, write the answer on top, carry any remainder into the next digit. 852 ÷ 6: 8÷6 is 1 remainder 2, carry the 2 → 25÷6 is 4 remainder 1 → 12÷6 is 2. Answer 142.',
          alt: 'In the bus stop method the number sits inside and the divider outside. Work left to right; whatever does not divide moves along to join the next digit.',
        },
        {
          text: 'For a 2-digit divisor, a list of <b>multiples</b> is your best friend. Dividing by 24? Jot down 24, 48, 72, 96, 120… then each step of the division is just "which multiple fits?".',
          alt: 'Before dividing by a 2-digit number, write its times table down the margin — the first five or six multiples. Then the division becomes looking things up in your own list.',
        },
        {
          text: 'Sometimes division leaves a <b>remainder</b> — the bit that does not fit. 130 ÷ 24 = 5 remainder 10. What the remainder MEANS depends on the story: sometimes you round up (buses needed), sometimes down (full boxes), sometimes the remainder itself is the answer (left-over stickers).',
          alt: 'A remainder is what is left when sharing stops working evenly. The story tells you what to do with it: another bus for the last people? Only count full boxes? Or is the left-over bit exactly what was asked?',
        },
      ],
    },
    example: {
      steps: [
        '312 children go on a trip. Each coach seats 24. How many coaches are needed?',
        'Multiples of 24: 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312…',
        '312 ÷ 24 = <b>13</b> exactly — 13 coaches.',
        'If it had been 320 children: 320 ÷ 24 = 13 r 8 → the 8 children still need a seat → round UP to 14 coaches.',
      ],
    },
    faqs: [
      { q: 'What do I do with a remainder?', a: 'Ask the story! People still needing a bus → round up. Only full boxes count → round down. "How many are left over?" → the remainder itself is the answer.' },
      { q: 'Division by 24 is hard — any trick?', a: 'Write the multiples of 24 first: 24, 48, 72, 96, 120… Then every step is just finding the biggest multiple that fits.' },
      { q: 'How can I check a division?', a: 'Multiply back! If 312 ÷ 24 = 13, then 13 × 24 must be 312. Add the remainder if there was one.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const b = ri(rng, 3, 9);
        const q = ri(rng, 120, 990);
        return num(`Work out ${fmt(q * b)} ÷ ${b}.`, q, {
          tier, hint: 'Bus stop method: divide digit by digit from the left, carry remainders along.',
          explain: `${fmt(q * b)} ÷ ${b} = ${fmt(q)}. Check: ${fmt(q)} × ${b} = ${fmt(q * b)}.`,
        });
      }
      if (tier === 2) {
        const b = pick(rng, [12, 15, 16, 18, 21, 24, 25, 32, 36, 45]);
        if (rng() < 0.6) {
          const q = ri(rng, 24, 220);
          return num(`Work out ${fmt(q * b)} ÷ ${b}.`, q, {
            tier, hint: `List the multiples of ${b} first: ${b}, ${b * 2}, ${b * 3}, ${b * 4}…`,
            explain: `${fmt(q * b)} ÷ ${b} = ${fmt(q)}. Check by multiplying back.`,
          });
        }
        const q = ri(rng, 15, 80), rem = ri(rng, 1, b - 1);
        return num(`What is the <b>remainder</b> of ${fmt(q * b + rem)} ÷ ${b}?`, rem, {
          tier, hint: `Find the biggest multiple of ${b} that fits, then see what is left.`,
          explain: `${b} × ${q} = ${fmt(q * b)}; ${fmt(q * b + rem)} − ${fmt(q * b)} = ${rem} left over.`,
        });
      }
      // The four remainder readings, rotated so he must READ, not pattern-match.
      const stories = [
        (r) => {
          const seat = pick(r, [24, 32, 36, 48]), q = ri(r, 8, 15), rem = ri(r, 1, seat - 1);
          const kids = seat * q + rem;
          return num(`${fmt(kids)} children go to a concert by coach. Each coach seats ${seat}. How many coaches are needed?`, q + 1, {
            tier: 3, hint: 'Everyone must travel — what about the children in the remainder?',
            explain: `${fmt(kids)} ÷ ${seat} = ${q} r ${rem}. The last ${rem} children still need a coach: ${q + 1}.`,
          });
        },
        (r) => {
          const box = pick(r, [15, 18, 25, 30]), q = ri(r, 9, 20), rem = ri(r, 1, box - 1);
          const eggs = box * q + rem;
          return num(`A farm packs ${fmt(eggs)} eggs into boxes of ${box}. Only FULL boxes go to the shop. How many boxes is that?`, q, {
            tier: 3, hint: 'A part-filled box does not count here.',
            explain: `${fmt(eggs)} ÷ ${box} = ${q} r ${rem}. Only the ${q} full boxes are sold.`,
          });
        },
        (r) => {
          const per = pick(r, [12, 16, 21, 28]), q = ri(r, 10, 25), rem = ri(r, 1, per - 1);
          const stickers = per * q + rem;
          return num(`${pick(r, NAMES)} shares ${fmt(stickers)} stickers equally between ${per} friends. How many stickers are LEFT OVER?`, rem, {
            tier: 3, hint: 'This time the question asks for the remainder itself.',
            explain: `${fmt(stickers)} ÷ ${per} = ${q} r ${rem} — so ${rem} stickers are left over.`,
          });
        },
        (r) => {
          const per = pick(r, [14, 22, 26, 35]), q = ri(r, 12, 30);
          const sweets = per * q;
          return num(`A jar of ${fmt(sweets)} marbles is shared equally between ${per} children. How many does each child get?`, q, {
            tier: 3, hint: 'This one shares out exactly — no remainder to worry about.',
            explain: `${fmt(sweets)} ÷ ${per} = ${q} each. Check: ${q} × ${per} = ${fmt(sweets)}.`,
          });
        },
        (r) => {
          const len = pick(r, [15, 18, 24]), q = ri(r, 8, 20), rem = ri(r, 1, len - 1);
          const ribbon = len * q + rem;
          return num(`A ribbon of ${fmt(ribbon)} cm is cut into ${len} cm pieces. How many WHOLE pieces can be cut?`, q, {
            tier: 3, hint: 'A shorter end piece is not a whole piece.',
            explain: `${fmt(ribbon)} ÷ ${len} = ${q} r ${rem}: ${q} whole pieces and ${rem} cm left.`,
          });
        },
      ];
      return scenario(rng, 'u02-divide-t3', stories);
    },
  },
];

export const topics6a = [...topics6aU1U2, ...topics6aU3, ...topics6aFrac, ...topics6aU6];
