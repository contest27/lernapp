// Copied from powermath-trainer @ aa8bd0b (content/c5b.js) on 2026-09-07 — Year 5
// REVIEW material for the Year 6 hub (phase B4). Not on the map, never a 'new'
// topic: these are what the review block draws from. Only the engine import
// path differs (content lives one level deeper here).
// Book 5B — Term 2: multiplication & division (2), fractions (1)-(3),
// decimals and percentages. Follows the official Power Maths Y5 lesson list.

import { num, mc, mcFrom, tf, frac, order, fr, nearMisses, fmt, ri, pick, shuffle, scenario } from './gen.js';
import { fracBar, fracCircle, barModel, pvGrid } from './vis.js';
import { gcd } from '../../engine/check.js';

const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];

function makeNum(rng, digits) {
  let s = String(ri(rng, 1, 9));
  for (let i = 1; i < digits; i++) s += String(ri(rng, 0, 9));
  return Number(s);
}

function mixed(w, n, d) {
  return `${w} ${fr(n, d)}`;
}

export const topics5b = [

  // ---------------------------------------------------------------- Unit 7a
  {
    id: 'u07-written-mult', unit: 7, book: '5B', strand: 'multdiv', emoji: '✖️',
    title: 'Written multiplication', shortTitle: 'Written ×',
    explanation: {
      segments: [
        {
          text: 'To multiply a big number by a 1-digit number, use the <b>column method</b>: multiply each digit in turn, starting from the ones, and exchange just like in addition.',
          alt: 'Column multiplication takes one digit at a time. Ones first, then tens, then hundreds. Whenever a column\'s answer reaches 10 or more, carry the extra into the next column.',
        },
        {
          text: 'Example: 234 × 3. Ones: 4 × 3 = 12 → write 2, carry 1. Tens: 3 × 3 = 9, plus the 1 = 10 → write 0, carry 1. Hundreds: 2 × 3 = 6, plus 1 = 7. Answer: 702.',
          alt: 'Watch the carries — they are the most common slip. Multiply the digit, THEN add any carry waiting from the previous column, then write and carry again if needed.',
        },
        {
          text: 'Multiplying by round numbers uses known facts: for × 20, do × 2 then × 10. So 43 × 20 = 86 × 10 = 860. This is the springboard for long multiplication.',
          alt: 'Times 20 is just times 2 with a ×10 shift after it. Break friendly numbers apart, use the fact you know, then put the tens back.',
        },
        {
          text: 'Estimate before you calculate! 4,215 × 4 is roughly 4,000 × 4 = 16,000, so the exact answer should land close to that.',
          alt: 'A quick rounding estimate is your safety net: it predicts the size of the answer, so a slipped digit or missed carry cannot sneak past you.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 1,326 × 4.',
        'Ones: 6 × 4 = 24 → write 4, carry 2.',
        'Tens: 2 × 4 = 8, + 2 = 10 → write 0, carry 1.',
        'Hundreds: 3 × 4 = 12, + 1 = 13 → write 3, carry 1.',
        'Thousands: 1 × 4 = 4, + 1 = 5. Answer: <b>5,304</b>.',
      ],
    },
    faqs: [
      { q: 'Do I add the carry before or after multiplying?', a: 'Always AFTER multiplying: first multiply the digit, then add the waiting carry. For 26 × 7 in the tens: 2 × 7 = 14, then + 4 (the carry) = 18. Mixing the order gives a wrong answer.' },
      { q: 'Why start from the ones?', a: 'Same reason as column addition — carries flow to the left. Starting at the ones means each carry lands in a column you have not visited yet.' },
      { q: 'What if a column multiplies to 0?', a: 'Write the 0! It holds the place open. In 208 × 4, the tens give 0 × 4 = 0 — the answer 832 needs that middle step to stay lined up.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const a = ri(rng, 112, 989), b = ri(rng, 3, 6);
        return num(`Work out ${fmt(a)} × ${b}. Use columns.`, a * b, {
          tier, hint: 'Ones first — remember to add each carry AFTER multiplying.',
          explain: `Multiply each digit of ${fmt(a)} by ${b}, carrying between columns.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const a = makeNum(rng, 4), b = ri(rng, 3, 8);
          return num(`Work out ${fmt(a)} × ${b}.`, a * b, {
            tier, hint: `Estimate first: about ${fmt(Math.round(a / 1000) * 1000)} × ${b}.`,
            explain: `Column by column with carries: ${fmt(a)} × ${b} = ${fmt(a * b)}.`,
          });
        }
        const a = ri(rng, 21, 89), b = pick(rng, [20, 30, 40, 50]);
        return num(`Use a known fact: ${a} × ${b}`, a * b, {
          tier, hint: `× ${b} means × ${b / 10}, then × 10.`,
          explain: `${a} × ${b / 10} = ${a * (b / 10)}, then × 10 = ${fmt(a * b)}.`,
        });
      }
      return scenario(rng, 'u07-written-mult:t3', [
        (rng) => {
          const a = ri(rng, 1150, 2450), b = ri(rng, 4, 8);
          return num(`A stadium has ${b} stands. Each stand seats ${fmt(a)} people. How many seats are there altogether?`, a * b, {
            tier, hint: `${b} equal groups — multiply.`,
            explain: `${fmt(a)} × ${b} = ${fmt(a * b)} seats. (${pick(rng, NAMES)} counted them all!)`,
          });
        },
        (rng) => {
          const a = ri(rng, 1050, 1950), b = ri(rng, 4, 8), mins = pick(rng, [40, 45, 50]);
          return num(`A ferry makes ${b} crossings a day and carries ${fmt(a)} passengers each time. A crossing takes ${mins} minutes. How many passengers travel in a day?`, a * b, {
            tier, hint: 'Careful — one number in this story is not needed at all.',
            explain: `Only the crossings count: ${fmt(a)} × ${b} = ${fmt(a * b)} passengers. The ${mins} minutes was extra information.`,
          });
        },
        (rng) => {
          const a = ri(rng, 1150, 2450), b = ri(rng, 4, 8);
          return num(`A print shop runs off ${fmt(a)} copies of a ${b}-page flyer. How many pages does it print?`, a * b, {
            tier, hint: `Every copy has ${b} pages.`,
            explain: `${fmt(a)} copies × ${b} pages = ${fmt(a * b)} pages.`,
          });
        },
        (rng) => {
          const b = ri(rng, 4, 8), a = ri(rng, 2050, 4950);
          return num(`A library has ${b} floors, with ${fmt(a)} books on each floor. How many books does the library hold?`, a * b, {
            tier, hint: 'Equal groups again — which two numbers multiply?',
            explain: `${fmt(a)} × ${b} = ${fmt(a * b)} books.`,
          });
        },
        (rng) => {
          const b = ri(rng, 3, 7), a = ri(rng, 1150, 2450);
          return num(`Each of the ${b} shelves in a warehouse holds ${fmt(a)} tins. How many tins are stored altogether?`, a * b, {
            tier, hint: 'The number of shelves comes FIRST in this story — read carefully.',
            explain: `${b} shelves × ${fmt(a)} tins = ${fmt(a * b)} tins.`,
          });
        },
        (rng) => {
          const b = ri(rng, 4, 8), a = ri(rng, 115, 245);
          const e = ri(rng, 85, Math.min(320, a * b - 120));
          return num(`A cinema has ${b} screens with ${a} seats each. Tonight ${e} seats are empty. How many people are watching a film?`, a * b - e, {
            tier, hint: 'Two steps: first find ALL the seats, then take away the empty ones.',
            explain: `${a} × ${b} = ${fmt(a * b)} seats; ${fmt(a * b)} − ${e} = ${fmt(a * b - e)} people.`,
          });
        },
        (rng) => {
          const a = ri(rng, 1150, 2450), b = ri(rng, 3, 6);
          return num(`A bottling plant fills ${fmt(a)} bottles every hour and packs them into crates of 24. How many bottles does it fill in ${b} hours?`, a * b, {
            tier, hint: 'Read the QUESTION again — is the crate size needed?',
            explain: `Bottles per hour × hours: ${fmt(a)} × ${b} = ${fmt(a * b)}. The crates of 24 were not needed.`,
          });
        },
        (rng) => {
          const a = ri(rng, 1150, 2450);
          return num(`A bakery sells ${fmt(a)} bread rolls every day. How many rolls does it sell in a week?`, a * 7, {
            tier, hint: 'The second number is hiding in a WORD, not a digit.',
            explain: `A week is 7 days: ${fmt(a)} × 7 = ${fmt(a * 7)} rolls.`,
          });
        },
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 7b
  {
    id: 'u07-long-mult', unit: 7, book: '5B', strand: 'multdiv', emoji: '🏗️',
    title: 'Long multiplication', shortTitle: 'Long ×',
    explanation: {
      segments: [
        {
          text: '<b>Long multiplication</b> multiplies by a 2-digit number in two layers: first by the ones, then by the tens, then ADD the two rows together.',
          alt: 'A 2-digit multiplier is two jobs in one: 23 × 14 means 23 × 4 AND 23 × 10. Do each job on its own row, then add the rows.',
        },
        {
          text: 'Example: 23 × 14. Row 1: 23 × 4 = 92. Row 2: 23 × 10 = 230. Add: 92 + 230 = 322.',
          alt: 'The second row is the tens row — many people write a 0 at its end first, because multiplying by tens shifts everything one column left. Then 23 × 1 fills in the rest: 230.',
        },
        {
          text: 'The <b>grid method</b> shows why it works: split both numbers by place value and multiply every part by every part. 23 × 14 = (20×10) + (20×4) + (3×10) + (3×4) = 200 + 80 + 30 + 12 = 322.',
          alt: 'Imagine a rectangle 23 long and 14 wide, cut into four smaller blocks: 20×10, 20×4, 3×10 and 3×4. The total area is the answer — the column method just organises these same four pieces.',
        },
        {
          text: 'For bigger numbers, nothing changes — there are just more digits per row. 1,234 × 26: one row for × 6, one row for × 20, then add. Estimate first: about 1,200 × 25 = 30,000.',
          alt: 'Long multiplication scales up calmly: however long the top number is, you still make one row per digit of the bottom number and add the rows at the end.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 34 × 26.',
        'Row 1 (× 6): 34 × 6 = 204.',
        'Row 2 (× 20): 34 × 2 = 68, shift → 680.',
        'Add the rows: 204 + 680 = <b>884</b>.',
      ],
    },
    faqs: [
      { q: 'Why do we put a zero on the second row?', a: 'The second row multiplies by TENS, and multiplying by ten shifts digits one column left. Writing the 0 first makes the shift automatic — without it, the row would be ten times too small.' },
      { q: 'Grid method or column method — which should I use?', a: 'They are the same maths in different clothes. The grid shows you WHY it works; columns are faster once you are confident. School expects columns by the end of Year 5, but checking with the grid is smart.' },
      { q: 'How do I keep all the carries tidy?', a: 'Write small carry digits above the column they belong to, and cross each one out as you use it. Most long multiplication slips are carries that got used twice or forgotten.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const a = ri(rng, 21, 49), b = ri(rng, 11, 19);
        return num(`Work out ${a} × ${b}.`, a * b, {
          tier, hint: `Two rows: ${a} × ${b % 10}, then ${a} × 10. Add them.`,
          explain: `${a} × ${b % 10} = ${a * (b % 10)} and ${a} × 10 = ${a * 10}; together ${a * b}.`,
        });
      }
      if (tier === 2) {
        const a = ri(rng, 24, 89), b = ri(rng, 21, 49);
        return num(`Work out ${a} × ${b}. Use long multiplication.`, a * b, {
          tier, hint: `Row for × ${b % 10}, row for × ${Math.floor(b / 10) * 10} (put the 0 first!), then add.`,
          explain: `${a} × ${b % 10} = ${a * (b % 10)}; ${a} × ${Math.floor(b / 10) * 10} = ${a * Math.floor(b / 10) * 10}; sum ${fmt(a * b)}.`,
        });
      }
      return scenario(rng, 'u07-long-mult:t3', [
        (rng) => {
          const a = ri(rng, 123, 489), b = ri(rng, 21, 39);
          return num(`Work out ${fmt(a)} × ${b}.`, a * b, {
            tier, hint: 'Same two-row plan — just a longer top number.',
            explain: `${fmt(a)} × ${b % 10} = ${fmt(a * (b % 10))}; ${fmt(a)} × ${Math.floor(b / 10) * 10} = ${fmt(a * Math.floor(b / 10) * 10)}; total ${fmt(a * b)}.`,
          });
        },
        (rng) => {
          const rows = ri(rng, 22, 38), seats = ri(rng, 24, 46);
          return num(`A hall has ${rows} rows with ${seats} chairs in each row. How many chairs are there?`, rows * seats, {
            tier, hint: 'Equal rows — long multiplication.',
            explain: `${rows} × ${seats} = ${fmt(rows * seats)} chairs.`,
          });
        },
        (rng) => {
          const n = ri(rng, 22, 34), kids = ri(rng, 32, 48);
          return num(`${n} coaches take children to a theme park. Each coach carries ${kids} children. How many children go on the trip?`, n * kids, {
            tier, hint: `${n} equal coach-loads.`,
            explain: `${n} × ${kids} = ${fmt(n * kids)} children.`,
          });
        },
        (rng) => {
          const trays = ri(rng, 24, 46), plants = ri(rng, 22, 38);
          return num(`A garden centre has ${trays} trays of seedlings. Each tray holds ${plants} plants. How many seedlings is that?`, trays * plants, {
            tier, hint: 'Trays of equal size — multiply.',
            explain: `${trays} × ${plants} = ${fmt(trays * plants)} seedlings.`,
          });
        },
        (rng) => {
          const crates = ri(rng, 24, 42), boxes = ri(rng, 24, 46), lorries = ri(rng, 2, 4);
          return num(`An egg farm packs ${boxes} egg boxes into each crate. One morning it fills ${crates} crates, and ${lorries} lorries drive them away. How many egg boxes were packed?`, crates * boxes, {
            tier, hint: 'One of the three numbers has nothing to do with the question.',
            explain: `${crates} crates × ${boxes} boxes = ${fmt(crates * boxes)}. The ${lorries} lorries were extra information.`,
          });
        },
        (rng) => {
          const c = ri(rng, 32, 48);
          return num(`A café serves ${c} customers every day in February. February has 28 days. How many customers is that altogether?`, c * 28, {
            tier, hint: 'Which two numbers belong together here?',
            explain: `${c} × 28 = ${fmt(c * 28)} customers.`,
          });
        },
        (rng) => {
          const rows = ri(rng, 22, 36), seats = ri(rng, 24, 42), extra = ri(rng, 25, 65);
          return num(`For the school play, ${rows} rows of ${seats} chairs are set out, plus ${extra} extra chairs at the back. How many chairs are there in total?`, rows * seats + extra, {
            tier, hint: 'Multiply the rows first, THEN deal with the extras.',
            explain: `${rows} × ${seats} = ${fmt(rows * seats)}; + ${extra} = ${fmt(rows * seats + extra)} chairs.`,
          });
        },
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 7c
  {
    id: 'u07-division', unit: 7, book: '5B', strand: 'multdiv', emoji: '➗',
    title: 'Short division and remainders', shortTitle: 'Division & remainders',
    explanation: {
      segments: [
        {
          text: '<b>Short division</b> (the "bus stop" method) shares a big number digit by digit, starting from the LEFT. Divide, write the answer on top, and pass any leftover to the next digit.',
          alt: 'Picture a bus stop shelter over the number. Work left to right: how many times does the divisor fit into the first digit? Write it on the roof, carry the leftover to the next digit as tens.',
        },
        {
          text: 'Example: 852 ÷ 4. 8 ÷ 4 = 2. 5 ÷ 4 = 1 remainder 1 → the 1 slides over, making 12. 12 ÷ 4 = 3. Answer: 213.',
          alt: 'Each leftover is not lost — it teams up with the next digit. The 1 left from the fives column turns the 2 into 12. That sliding leftover is the whole trick of short division.',
        },
        {
          text: 'Sometimes there is a leftover at the very end: a <b>remainder</b>. 75 ÷ 6 = 12 remainder 3, because 6 × 12 = 72 and 3 is left over.',
          alt: 'A remainder is what refuses to share fairly. Check it is smaller than the divisor — if the remainder were 6 or more, another whole group would still fit.',
        },
        {
          text: 'In word problems, THINK about the remainder. 75 children, minibuses seat 6: 12 full buses and 3 children left — so you NEED 13 buses. But 75 eggs in boxes of 6 FILLS only 12 boxes. Same division, different answers!',
          alt: 'The story decides what to do with the remainder. Sometimes you round up (everyone needs a seat), sometimes you ignore it (only full boxes count). Always reread the question.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 3,456 ÷ 6.',
        '3 ÷ 6 does not go → slide: 34 ÷ 6 = 5 r 4.',
        '45 ÷ 6 = 7 r 3.',
        '36 ÷ 6 = 6. Answer: <b>576</b>.',
      ],
    },
    faqs: [
      { q: 'Why does division start from the LEFT when everything else starts from the right?', a: 'Because sharing starts with the biggest pieces. You hand out the thousands first, and whatever cannot be shared breaks down into the next size. Leftovers flow rightwards, so that is the direction we go.' },
      { q: 'How do I check a division answer?', a: 'Multiply back! If 3,456 ÷ 6 = 576, then 576 × 6 should be 3,456. With a remainder: quotient × divisor + remainder should rebuild the original number.' },
      { q: 'Can the remainder be bigger than the divisor?', a: 'Never. If it were, another whole group would still fit and your quotient is one too small. Remainder must always be from 0 up to one less than the divisor.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const d = ri(rng, 3, 6), q = ri(rng, 12, 32);
        return num(`Work out ${d * q} ÷ ${d}.`, q, {
          tier, hint: 'Use the bus stop method, left to right.',
          explain: `${d} × ${q} = ${d * q}, so ${d * q} ÷ ${d} = ${q}.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const d = ri(rng, 3, 8), q = ri(rng, 112, 240);
          return num(`Work out ${fmt(d * q)} ÷ ${d}.`, q, {
            tier, hint: 'Slide each leftover onto the next digit.',
            explain: `Check by multiplying back: ${q} × ${d} = ${fmt(d * q)}.`,
          });
        }
        const d = ri(rng, 4, 9), q = ri(rng, 13, 40);
        const r = ri(rng, 1, d - 1);
        return num(`What is the REMAINDER when ${d * q + r} ÷ ${d}?`, r, {
          tier, hint: `Find the biggest multiple of ${d} that fits.`,
          explain: `${d} × ${q} = ${d * q}, and ${d * q + r} − ${d * q} = ${r} left over.`,
        });
      }
      // Story division: what the remainder MEANS depends on the story —
      // round up, round down, report the remainder, or share it out.
      const deal = (rng) => {
        const d = pick(rng, [4, 6, 8]), q = ri(rng, 12, 24), r = ri(rng, 1, d - 1);
        return { d, q, r, total: d * q + r };
      };
      return scenario(rng, 'u07-division:t3', [
        (rng) => {
          const d = ri(rng, 4, 8), q = ri(rng, 320, 980);
          return num(`Work out ${fmt(d * q)} ÷ ${d}.`, q, {
            tier, hint: 'Bus stop method — keep the columns tidy.',
            explain: `${q} × ${d} = ${fmt(d * q)} confirms it.`,
          });
        },
        (rng) => {
          const { d, q, r, total } = deal(rng);
          return num(`${total} children go on a trip. Each minibus seats ${d}. How many minibuses are NEEDED?`, q + 1, {
            tier, hint: 'Everyone needs a seat — what about the leftover children?',
            explain: `${total} ÷ ${d} = ${q} r ${r}. The ${r} leftover children still need a bus: ${q + 1} buses.`,
          });
        },
        (rng) => {
          const { d, q, r, total } = deal(rng);
          return num(`${total} scouts go camping. Each tent sleeps ${d} scouts. How many tents must they take?`, q + 1, {
            tier, hint: 'Nobody sleeps outside! Think about the leftover scouts.',
            explain: `${total} ÷ ${d} = ${q} r ${r}. The ${r} scouts left over need one more tent: ${q + 1} tents.`,
          });
        },
        (rng) => {
          const { d, q, r, total } = deal(rng);
          return num(`A lift carries ${d} people at a time. ${total} people are queuing. How many trips must the lift make?`, q + 1, {
            tier, hint: 'The last few people still need a ride.',
            explain: `${total} ÷ ${d} = ${q} r ${r}. One extra trip for the last ${r}: ${q + 1} trips.`,
          });
        },
        (rng) => {
          const { d, q, r, total } = deal(rng);
          return num(`${total} eggs are packed into boxes of ${d}. How many FULL boxes are packed?`, q, {
            tier, hint: 'Only complete boxes count here.',
            explain: `${total} ÷ ${d} = ${q} r ${r}. The ${r} spare eggs do not fill a box, so ${q} full boxes.`,
          });
        },
        (rng) => {
          const { d, q, r, total } = deal(rng);
          return num(`A ribbon is ${total} cm long. ${pick(rng, NAMES)} cuts it into pieces of ${d} cm. How many WHOLE pieces is that?`, q, {
            tier, hint: 'A short leftover snippet is not a whole piece.',
            explain: `${total} ÷ ${d} = ${q} r ${r}. The last ${r} cm is too short, so ${q} whole pieces.`,
          });
        },
        (rng) => {
          const { d, q, r, total } = deal(rng);
          return num(`${total} children sign up for a tournament. Each team must have exactly ${d} players. How many complete teams can be made?`, q, {
            tier, hint: 'A team with missing players cannot play.',
            explain: `${total} ÷ ${d} = ${q} r ${r}. The ${r} children left over are not enough for a team: ${q} teams.`,
          });
        },
        (rng) => {
          const { d, q, r, total } = deal(rng);
          return num(`The PE teacher shares ${total} balls equally between ${d} classes. How many balls are LEFT OVER?`, r, {
            tier, hint: 'This time the question wants the remainder itself.',
            explain: `${total} ÷ ${d} = ${q} r ${r} — each class gets ${q} balls and ${r} are left over.`,
          });
        },
        (rng) => {
          const { d, q, r, total } = deal(rng);
          return num(`${d} friends share ${total} marbles as fairly as possible. How many marbles does EACH friend get?`, q, {
            tier, hint: 'Share them out — the answer is what each person receives.',
            explain: `${total} ÷ ${d} = ${q} r ${r}: each friend gets ${q} marbles (${r} stay in the bag).`,
          });
        },
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 8a
  {
    id: 'u08-equivalent', unit: 8, book: '5B', strand: 'fractions', emoji: '🍕',
    title: 'Equivalent fractions', shortTitle: 'Equivalent fractions',
    explanation: {
      segments: [
        {
          text: 'Two fractions are <b>equivalent</b> when they describe the same amount. Half a pizza and two quarters of a pizza is the same amount of pizza: ' + fr(1, 2) + ' = ' + fr(2, 4) + '.',
          alt: 'Cut a chocolate bar in half, or cut it into four pieces and take two — you get exactly the same chocolate. Different cuts, same amount: that is what equivalent means.',
          svg: fracBar(1, 2) + fracBar(2, 4),
        },
        {
          text: 'To make an equivalent fraction, multiply the top AND bottom by the same number. ' + fr(2, 3) + ' × 2 top and bottom → ' + fr(4, 6) + '. The pieces get smaller but you take more of them.',
          alt: 'Whatever you do to the bottom, do to the top. Doubling the bottom cuts every piece in half, so you need double the pieces on top to keep the same amount.',
        },
        {
          text: 'It works backwards too: DIVIDE top and bottom by the same number to <b>simplify</b>. ' + fr(12, 18) + ' ÷ 6 top and bottom → ' + fr(2, 3) + '. That is the simplest form.',
          alt: 'Simplifying shrinks the numbers without changing the amount. Find a number that divides into top and bottom — best of all their biggest common factor — and divide both.',
        },
        {
          text: 'To check whether two fractions match, make their denominators the same, then compare tops. Is ' + fr(3, 4) + ' = ' + fr(9, 12) + '? Multiply ' + fr(3, 4) + ' by 3: ' + fr(9, 12) + '. Yes!',
          alt: 'Same-denominator is the fair test: once both fractions use the same size pieces, just compare how many pieces each takes.',
        },
      ],
    },
    example: {
      steps: [
        'Fill in the missing number: ' + fr(3, 5) + ' = ' + fr('□', 20) + '.',
        'The bottom went from 5 to 20 — that is × 4.',
        'Do the same to the top: 3 × 4 = 12.',
        'So ' + fr(3, 5) + ' = <b>' + fr(12, 20) + '</b>.',
      ],
    },
    faqs: [
      { q: 'Why must I multiply top AND bottom?', a: 'Multiplying top and bottom by the same number is really multiplying by 1 (like 4/4), and multiplying by 1 changes nothing. Multiply only the top and you have genuinely made the fraction bigger — a different fraction!' },
      { q: 'What does "simplest form" mean?', a: 'The equivalent fraction with the smallest possible whole numbers. 12/18 simplifies to 2/3, and nothing divides into both 2 and 3, so 2/3 is fully simplified.' },
      { q: 'Are there endless equivalent fractions?', a: 'Yes — infinitely many! 1/2 = 2/4 = 3/6 = 50/100 = 500/1000… They all sit at exactly the same spot on the number line.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const d = pick(rng, [2, 3, 4, 5]), n = ri(rng, 1, d - 1), k = pick(rng, [2, 3, 4]);
        return num(`Find the missing number: ${fr(n, d)} = ${fr('□', d * k)}`, n * k, {
          tier, svg: fracBar(n, d),
          hint: `The bottom was multiplied by ${k} — do the same to the top.`,
          explain: `${d} × ${k} = ${d * k}, so the top is ${n} × ${k} = ${n * k}.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const pairs = [[2, 3], [3, 4], [1, 2], [2, 5], [3, 5], [1, 3]];
          const [n, d] = pick(rng, pairs);
          const k = pick(rng, [2, 3, 4]);
          const wrongs = [fr(n + 1, d * k), fr(n * k, d * k + 1), fr(n * k + 1, d * k)];
          const options = shuffle(rng, [fr(n * k, d * k), ...wrongs]);
          return mc(`Which fraction is equivalent to ${fr(n, d)}?`, options, options.indexOf(fr(n * k, d * k)), {
            tier, hint: 'Top and bottom must be multiplied by the SAME number.',
            explain: `${fr(n, d)} × ${k} top and bottom gives ${fr(n * k, d * k)}.`,
          });
        }
        const d = pick(rng, [3, 4, 5]), n = ri(rng, 1, d - 1), k = pick(rng, [2, 3, 4]);
        return num(`Find the missing number: ${fr(n, d)} = ${fr(n * k, '□')}`, d * k, {
          tier, hint: `The top was multiplied by ${k}.`,
          explain: `${n} × ${k} = ${n * k}, so the bottom is ${d} × ${k} = ${d * k}.`,
        });
      }
      if (rng() < 0.5) {
        const base = pick(rng, [[1, 2], [2, 3], [3, 4], [1, 3], [2, 5]]);
        const k = pick(rng, [3, 4, 6]);
        return frac(`Write ${fr(base[0] * k, base[1] * k)} in its SIMPLEST form.`, base[0], base[1], {
          exact: true, tier,
          hint: `What divides into both ${base[0] * k} and ${base[1] * k}?`,
          explain: `Divide top and bottom by ${k}: ${fr(base[0], base[1])}.`,
        });
      }
      const [n, d] = pick(rng, [[3, 4], [2, 3], [1, 2], [3, 5]]);
      const k = pick(rng, [3, 4, 5]);
      const truth = rng() < 0.5;
      const top = truth ? n * k : n * k + 1;
      return tf(`True or false: ${fr(n, d)} and ${fr(top, d * k)} are equivalent.`, truth, {
        tier, hint: 'Check: were top and bottom multiplied by the same number?',
        explain: truth
          ? `Both were multiplied by ${k}, so yes — same amount.`
          : `The bottom was × ${k} but the top is ${top}, not ${n * k}. Not equivalent.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 8b
  {
    id: 'u08-mixed', unit: 8, book: '5B', strand: 'fractions', emoji: '🧁',
    title: 'Improper fractions and mixed numbers', shortTitle: 'Mixed numbers',
    explanation: {
      segments: [
        {
          text: 'A fraction can be MORE than one whole! ' + fr(7, 4) + ' means seven quarters. Top bigger than bottom = an <b>improper fraction</b>.',
          alt: 'Seven quarter-slices of pizza is more pizza than one whole pizza. When the top number outgrows the bottom, the fraction is worth more than 1 — we call it improper, but it is perfectly fine maths.',
          svg: fracCircle(4, 4) + fracCircle(3, 4),
        },
        {
          text: 'A <b>mixed number</b> writes the same amount as wholes + a bit: ' + fr(7, 4) + ' = ' + mixed(1, 3, 4) + ' (one whole pizza and three quarters).',
          alt: 'Mixed numbers are the everyday way to say it: "one and three-quarter pizzas". The improper fraction and the mixed number are two outfits for the same amount.',
        },
        {
          text: 'Improper → mixed: divide! 7 ÷ 4 = 1 remainder 3, so ' + fr(7, 4) + ' = ' + mixed(1, 3, 4) + '. The quotient is the wholes; the remainder stays as the fraction top.',
          alt: 'Ask: how many complete wholes hide inside? Each whole needs 4 quarters. 7 quarters make 1 whole with 3 quarters left — that leftover becomes the fraction part.',
        },
        {
          text: 'Mixed → improper: multiply and add. ' + mixed(2, 1, 3) + ': each whole is 3 thirds, so 2 wholes = 6 thirds, plus 1 = ' + fr(7, 3) + '.',
          alt: 'Break the wholes into pieces: multiply the whole number by the denominator, then add the top. The denominator never changes — the piece size stays the same.',
        },
        {
          text: 'To compare fractions with related bottoms, convert to the same denominator first: ' + fr(1, 2) + ' vs ' + fr(5, 8) + ' → ' + fr(4, 8) + ' vs ' + fr(5, 8) + '. Now the tops decide: ' + fr(5, 8) + ' is bigger.',
          alt: 'Same-size pieces make comparing fair. Once both fractions are in eighths, whoever has more eighths wins.',
        },
      ],
    },
    example: {
      steps: [
        'Write ' + fr(11, 4) + ' as a mixed number.',
        'Divide: 11 ÷ 4 = 2 remainder 3.',
        '2 is the wholes, 3 is the leftover quarters.',
        'So ' + fr(11, 4) + ' = <b>' + mixed(2, 3, 4) + '</b>.',
      ],
    },
    faqs: [
      { q: 'Is an improper fraction wrong?', a: 'Not at all — "improper" is just an old-fashioned name for top-heavy. In calculations, improper fractions are often EASIER to work with than mixed numbers. Both forms are correct.' },
      { q: 'Why does the denominator never change when converting?', a: 'The denominator is the SIZE of the pieces (quarters, thirds…). Converting only repackages the same pieces into wholes-and-leftovers. Repackaging does not change what size the pieces are.' },
      { q: 'How do I see 5/5 quickly?', a: 'When top equals bottom, you have exactly one whole: 5 fifths = 1. And 10/5 = 2 wholes. Multiples of the denominator are whole numbers in disguise.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const d = pick(rng, [3, 4, 5]), w = ri(rng, 1, 2), r = ri(rng, 1, d - 1);
        const top = w * d + r;
        if (rng() < 0.5) {
          const correct = mixed(w, r, d);
          const cands = [mixed(w + 1, r, d), mixed(w, r === d - 1 ? r - 1 : r + 1, d), mixed(r, w, d), mixed(w + 2, r, d)];
          const pool = [correct];
          for (const c of cands) if (!pool.includes(c) && pool.length < 4) pool.push(c);
          const options = shuffle(rng, pool);
          return mc(`Write ${fr(top, d)} as a mixed number.`, options, options.indexOf(correct), {
            tier, svg: fracCircle(Math.min(top, d), d) + (top > d ? fracCircle(top - d, d) : ''),
            hint: `How many groups of ${d} fit into ${top}?`,
            explain: `${top} ÷ ${d} = ${w} r ${r}, so ${w} whole${w > 1 ? 's' : ''} and ${fr(r, d)}.`,
          });
        }
        return num(`How many WHOLES are in ${fr(top, d)}?`, w, {
          tier, hint: `Each whole is ${d} ${d === 3 ? 'thirds' : d === 4 ? 'quarters' : 'fifths'}.`,
          explain: `${top} ÷ ${d} = ${w} remainder ${r}: ${w} whole${w > 1 ? 's' : ''}.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const d = pick(rng, [3, 4, 5, 6]), w = ri(rng, 1, 3), r = ri(rng, 1, d - 1);
          return frac(`Write ${mixed(w, r, d)} as an improper fraction.`, w * d + r, d, {
            exact: true, tier,
            hint: `Each whole is ${d} pieces: multiply, then add ${r}.`,
            explain: `${w} × ${d} = ${w * d}, plus ${r} = ${w * d + r}. Answer ${fr(w * d + r, d)}.`,
          });
        }
        const d = pick(rng, [4, 6, 8, 10]);
        const n1 = ri(rng, 1, d - 2), n2 = n1 + 1;
        const truth = rng() < 0.5;
        return tf(`True or false: ${fr(truth ? n2 : n1, d)} &gt; ${fr(truth ? n1 : n2, d)}`, truth, {
          tier, hint: 'Same denominator — compare the tops.',
          explain: `With equal pieces, more pieces means bigger: ${fr(n2, d)} &gt; ${fr(n1, d)}.`,
        });
      }
      const sets = [
        [[1, 2], [5, 8], [3, 4]],
        [[1, 6], [1, 3], [1, 2], [2, 3]],
        [[3, 10], [2, 5], [1, 2], [7, 10]],
        [[1, 4], [3, 8], [1, 2], [5, 8]],
        [[2, 6], [1, 2], [2, 3]],
      ];
      const set = pick(rng, sets);
      const orderedHtml = set.map(([n, d]) => fr(n, d));
      return order('Order these fractions, <b>smallest first</b>.', rng, orderedHtml, {
        tier, hint: 'Convert them to the same denominator first.',
        explain: 'Rewrite each with a shared denominator, then order by the tops.',
      });
    },
  },

  // ---------------------------------------------------------------- Unit 9a
  {
    id: 'u09-addsub-frac', unit: 9, book: '5B', strand: 'fractions', emoji: '🧮',
    title: 'Adding and subtracting fractions', shortTitle: 'Add/sub fractions',
    explanation: {
      segments: [
        {
          text: 'Adding fractions with the SAME denominator is easy: the pieces match, so just add the tops. ' + fr(2, 7) + ' + ' + fr(3, 7) + ' = ' + fr(5, 7) + '. The bottom stays put!',
          alt: 'Two sevenths plus three sevenths is five sevenths — like 2 apples + 3 apples = 5 apples. The denominator is the type of piece, and the type does not change when you add.',
          svg: fracBar(2, 7) + fracBar(3, 7, { color: '#fca5a5' }),
        },
        {
          text: 'NEVER add the bottoms! ' + fr(1, 4) + ' + ' + fr(1, 4) + ' is ' + fr(2, 4) + ' (a half), not ' + fr(2, 8) + '. Adding bottoms would say a quarter plus a quarter makes LESS than a quarter — nonsense!',
          alt: 'The classic trap: adding denominators. Check with a picture — two quarter-slices clearly make half a pizza, not a quarter of a pizza. Tops add; bottoms describe.',
        },
        {
          text: 'Different denominators? Make them match first. For ' + fr(1, 4) + ' + ' + fr(3, 8) + ', turn quarters into eighths: ' + fr(1, 4) + ' = ' + fr(2, 8) + '. Then ' + fr(2, 8) + ' + ' + fr(3, 8) + ' = ' + fr(5, 8) + '.',
          alt: 'You cannot add quarters to eighths directly — different sized pieces! Convert one fraction so both use the same pieces, then add the tops as usual.',
        },
        {
          text: 'Subtraction works exactly the same way: match the denominators, then subtract the tops. ' + fr(5, 6) + ' − ' + fr(1, 3) + ' = ' + fr(5, 6) + ' − ' + fr(2, 6) + ' = ' + fr(3, 6) + ' = ' + fr(1, 2) + '.',
          alt: 'Same rule for taking away: same-size pieces first, then subtract the counts. Simplify the answer at the end if you can — 3/6 looks nicer as 1/2.',
        },
      ],
    },
    example: {
      steps: [
        'Work out ' + fr(2, 3) + ' + ' + fr(1, 6) + '.',
        'Sixths and thirds — convert: ' + fr(2, 3) + ' = ' + fr(4, 6) + '.',
        'Now add the tops: ' + fr(4, 6) + ' + ' + fr(1, 6) + ' = ' + fr(5, 6) + '.',
        'Answer: <b>' + fr(5, 6) + '</b>.',
      ],
    },
    faqs: [
      { q: 'Why do the denominators have to match?', a: 'Because you can only count things of the same kind. 2 apples + 3 bananas is not 5 apples. Once both fractions use the same size pieces, the tops count the same kind of thing — then adding makes sense.' },
      { q: 'Which fraction should I convert?', a: 'Convert the one with the SMALLER denominator to match the bigger one, if the bigger is a multiple (quarters → eighths). In Year 5, one denominator is always a multiple of the other — handy!' },
      { q: 'Do I have to simplify my answer?', a: 'A correct unsimplified answer is still correct, but simplest form is polite maths — it is easier to read. If top and bottom share a factor, divide it out: 4/8 → 1/2.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const d = pick(rng, [5, 6, 7, 8, 9]);
        const a = ri(rng, 1, d - 2), b = ri(rng, 1, d - a - 1);
        if (rng() < 0.5) {
          return frac(`Work out ${fr(a, d)} + ${fr(b, d)}`, a + b, d, {
            tier, svg: fracBar(a, d),
            hint: 'Same pieces — add the tops, keep the bottom.',
            explain: `${a} + ${b} = ${a + b}, so the answer is ${fr(a + b, d)}.`,
          });
        }
        const big = a + b;
        return frac(`Work out ${fr(big, d)} − ${fr(a, d)}`, b, d, {
          tier, hint: 'Same pieces — subtract the tops.',
          explain: `${big} − ${a} = ${b}: the answer is ${fr(b, d)}.`,
        });
      }
      if (tier === 2) {
        const pairs = [[2, 4], [2, 6], [3, 6], [2, 8], [4, 8], [3, 9], [2, 10], [5, 10], [3, 12], [4, 12]];
        const [d1, d2] = pick(rng, pairs);
        const k = d2 / d1;
        const a = ri(rng, 1, d1 - 1);
        if (a * k + 1 >= d2) return this.gen(rng, tier);
        const b = ri(rng, 1, d2 - a * k - 1);
        return frac(`Work out ${fr(a, d1)} + ${fr(b, d2)}`, a * k + b, d2, {
          tier, hint: `Turn ${d1}ths into ${d2}ths first: ${fr(a, d1)} = ${fr(a * k, d2)}.`,
          explain: `${fr(a * k, d2)} + ${fr(b, d2)} = ${fr(a * k + b, d2)}.`,
        });
      }
      const pairs = [[3, 6], [2, 4], [2, 8], [3, 9], [5, 10], [4, 8], [6, 12]];
      const [d1, d2] = pick(rng, pairs);
      const k = d2 / d1;
      // Shared number pickers keeping every story inside one whole.
      const subNums = (rng) => {
        const a = ri(rng, 1, d1 - 1);
        const bMax = a * k - 1;
        return bMax < 1 ? null : { a, b: ri(rng, 1, bMax) };
      };
      const addNums = (rng) => {
        const a = ri(rng, 1, Math.floor((d2 - 2) / k));
        return { a, b: ri(rng, 1, d2 - a * k - 1) };
      };
      const two = (rng) => {
        const name = pick(rng, NAMES);
        return [name, pick(rng, NAMES.filter((n) => n !== name))];
      };
      const q = scenario(rng, 'u09-addsub-frac:t3', [
        (rng) => {
          const n = subNums(rng);
          if (!n) return null;
          return frac(`Work out ${fr(n.a, d1)} − ${fr(n.b, d2)}`, n.a * k - n.b, d2, {
            tier, hint: `Convert first: ${fr(n.a, d1)} = ${fr(n.a * k, d2)}.`,
            explain: `${fr(n.a * k, d2)} − ${fr(n.b, d2)} = ${fr(n.a * k - n.b, d2)}.`,
          });
        },
        (rng) => {
          const [name, name2] = two(rng);
          const { a, b } = addNums(rng);
          return frac(`${name} eats ${fr(a, d1)} of a pizza and ${name2} eats ${fr(b, d2)}. What fraction of the pizza is eaten?`, a * k + b, d2, {
            tier, hint: 'Match the denominators, then add.',
            explain: `${fr(a, d1)} = ${fr(a * k, d2)}; together ${fr(a * k + b, d2)}.`,
          });
        },
        (rng) => {
          const { a, b } = addNums(rng);
          return frac(`A jug is ${fr(a, d1)} full. ${pick(rng, NAMES)} pours in another ${fr(b, d2)} of a jug. What fraction of the jug is full now?`, a * k + b, d2, {
            tier, hint: `Same-size pieces first: ${fr(a, d1)} = ${fr(a * k, d2)}.`,
            explain: `${fr(a * k, d2)} + ${fr(b, d2)} = ${fr(a * k + b, d2)} of the jug.`,
          });
        },
        (rng) => {
          const { a, b } = addNums(rng);
          return frac(`${pick(rng, NAMES)} paints ${fr(a, d1)} of a fence before lunch and ${fr(b, d2)} after lunch. What fraction of the fence is painted?`, a * k + b, d2, {
            tier, hint: 'Convert to the same denominator, then add the two parts.',
            explain: `${fr(a, d1)} = ${fr(a * k, d2)}; ${fr(a * k, d2)} + ${fr(b, d2)} = ${fr(a * k + b, d2)}.`,
          });
        },
        (rng) => {
          const n = subNums(rng);
          if (!n) return null;
          return frac(`A bag of flour is ${fr(n.a, d1)} full. ${pick(rng, NAMES)} uses ${fr(n.b, d2)} of the bag for a cake. What fraction of the bag is left?`, n.a * k - n.b, d2, {
            tier, hint: 'This story takes away — convert, then subtract.',
            explain: `${fr(n.a, d1)} = ${fr(n.a * k, d2)}; minus ${fr(n.b, d2)} leaves ${fr(n.a * k - n.b, d2)}.`,
          });
        },
        (rng) => {
          const n = subNums(rng);
          if (!n) return null;
          const [name, name2] = two(rng);
          return frac(`${name} has read ${fr(n.a, d1)} of a book. ${name2} has read ${fr(n.b, d2)} of the same book. How much MORE of the book has ${name} read?`, n.a * k - n.b, d2, {
            tier, hint: '"How much more" asks for the DIFFERENCE between the two fractions.',
            explain: `${fr(n.a, d1)} = ${fr(n.a * k, d2)}; ${fr(n.a * k, d2)} − ${fr(n.b, d2)} = ${fr(n.a * k - n.b, d2)}.`,
          });
        },
      ]);
      return q ?? this.gen(rng, tier);
    },
  },

  // ---------------------------------------------------------------- Unit 9b
  {
    id: 'u09-mixed-addsub', unit: 9, book: '5B', strand: 'fractions', emoji: '🎂',
    title: 'Fractions past one whole', shortTitle: 'Mixed add/sub',
    explanation: {
      segments: [
        {
          text: 'Sometimes an addition bursts past one whole: ' + fr(3, 4) + ' + ' + fr(2, 4) + ' = ' + fr(5, 4) + ' = ' + mixed(1, 1, 4) + '. Add as normal, then convert if the answer is improper.',
          alt: 'Three quarters plus two quarters is five quarters — more than a whole pizza! Add the tops first, then repackage: five quarters is one whole and one quarter.',
          svg: fracCircle(4, 4) + fracCircle(1, 4),
        },
        {
          text: 'Adding mixed numbers: deal with wholes and fractions separately. ' + mixed(2, 1, 4) + ' + ' + mixed(1, 2, 4) + ': wholes 2+1=3, fractions ' + fr(1, 4) + '+' + fr(2, 4) + '=' + fr(3, 4) + '. Answer ' + mixed(3, 3, 4) + '.',
          alt: 'Mixed numbers split neatly: add the whole numbers, add the fraction parts, then stick them back together. If the fraction part overflows past 1, pass the extra whole across.',
        },
        {
          text: 'Subtracting when the fraction is too small: exchange a whole! For ' + mixed(2, 1, 4) + ' − ' + fr(3, 4) + ': break one whole into quarters → ' + mixed(1, 5, 4) + ' − ' + fr(3, 4) + ' = ' + mixed(1, 2, 4) + ' = ' + mixed(1, 1, 2) + '.',
          alt: 'Just like column subtraction, you can exchange: one whole becomes four quarters. Then the fraction part is big enough to subtract from.',
        },
        {
          text: 'In word problems, the same bar models work — the bars just hold fractions now. Draw the whole, mark the parts, decide: add or subtract?',
          alt: 'Do not let fractions scare the story: model it exactly as before. Whole missing? Add the parts. Part missing? Subtract from the whole.',
        },
      ],
    },
    example: {
      steps: [
        'A bottle holds ' + mixed(1, 1, 2) + ' litres of juice. ' + fr(3, 4) + ' litre is poured out. How much is left?',
        'Convert: ' + mixed(1, 1, 2) + ' = ' + fr(6, 4) + ' (quarters match the ' + fr(3, 4) + ').',
        fr(6, 4) + ' − ' + fr(3, 4) + ' = ' + fr(3, 4) + '.',
        'Answer: <b>' + fr(3, 4) + ' litre</b> left.',
      ],
    },
    faqs: [
      { q: 'My fraction answer is improper — is that wrong?', a: 'Not wrong at all! 5/4 and 1¼ are the same number. Questions sometimes ask for one form or the other, so read what is wanted — and know how to convert between them.' },
      { q: 'When do I "exchange a whole"?', a: 'When subtracting and your fraction part is too small — like 2¼ − ¾, where ¼ cannot give up ¾. Break one whole into quarters: 2¼ becomes 1 and 5/4, and now the subtraction works.' },
      { q: 'Can I just convert everything to improper fractions?', a: 'Yes! Converting both numbers to improper fractions always works and many people find it safer. 2¼ − ¾ = 9/4 − 3/4 = 6/4 = 1½. Choose the method you trust.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const d = pick(rng, [4, 5, 6]);
        const a = ri(rng, 2, d - 1), b = d - a + ri(rng, 1, 2);
        if (a + b <= d) return this.gen(rng, tier);
        return frac(`Work out ${fr(a, d)} + ${fr(b, d)}. (An improper answer like ${fr(d + 1, d)} is fine!)`, a + b, d, {
          tier, hint: 'Add the tops — the answer is allowed to pass 1.',
          explain: `${a} + ${b} = ${a + b}: that is ${fr(a + b, d)}, or ${mixed(1, a + b - d, d)}.`,
        });
      }
      if (tier === 2) {
        const d = pick(rng, [3, 4, 5]);
        if (rng() < 0.5) {
          const w1 = ri(rng, 1, 2), w2 = ri(rng, 1, 2);
          const n1 = ri(rng, 1, d - 1), n2 = ri(rng, 1, d - n1) - 0;
          if (n1 + n2 >= d) return this.gen(rng, tier);
          const correct = mixed(w1 + w2, n1 + n2, d);
          const cands = [mixed(w1 + w2 + 1, n1 + n2, d), mixed(w1 + w2, n1 + n2 === d - 1 ? n1 + n2 - 1 : n1 + n2 + 1, d), mixed(Math.max(1, w1 + w2 - 1), n1 + n2, d)];
          const pool = [correct];
          for (const c of cands) if (!pool.includes(c) && pool.length < 4) pool.push(c);
          const options = shuffle(rng, pool);
          return mc(`Work out ${mixed(w1, n1, d)} + ${mixed(w2, n2, d)}`, options, options.indexOf(correct), {
            tier, hint: 'Wholes with wholes, fractions with fractions.',
            explain: `${w1} + ${w2} = ${w1 + w2} and ${fr(n1, d)} + ${fr(n2, d)} = ${fr(n1 + n2, d)}.`,
          });
        }
        const w = ri(rng, 1, 2), nTop = ri(rng, 1, d - 1);
        const sub = ri(rng, nTop + 1, d - 1);
        return frac(`Work out ${mixed(w, nTop, d)} − ${fr(sub, d)}`, w * d + nTop - sub, d, {
          tier, hint: `Exchange a whole: ${mixed(w, nTop, d)} = ${fr(w * d + nTop, d)}.`,
          explain: `${fr(w * d + nTop, d)} − ${fr(sub, d)} = ${fr(w * d + nTop - sub, d)}.`,
        });
      }
      const d = pick(rng, [4, 6, 8]);
      const half = d / 2;
      const pieces = d === 4 ? 'quarters' : d === 6 ? 'sixths' : 'eighths';
      return scenario(rng, 'u09-mixed-addsub:t3', [
        (rng) => {
          const b = ri(rng, half + 1, d - 1);
          return frac(`${pick(rng, NAMES)} has ${mixed(1, half, d)} m of ribbon and uses ${fr(b, d)} m for a bow. How much ribbon is left? (Answer as a fraction of a metre.)`, d + half - b, d, {
            tier, hint: `Turn ${mixed(1, half, d)} into ${pieces} first.`,
            explain: `${mixed(1, half, d)} = ${fr(d + half, d)}; minus ${fr(b, d)} leaves ${fr(d + half - b, d)} m.`,
          });
        },
        (rng) => {
          const a = ri(rng, half, d - 1), b = ri(rng, half + 1, d - 1);
          return frac(`A recipe uses ${fr(a, d)} of a bag of flour for bread and ${fr(b, d)} of a bag for buns. How much flour is used in total? (Improper fractions welcome.)`, a + b, d, {
            tier, hint: 'Add the tops — the total may pass one whole bag.',
            explain: `${a} + ${b} = ${a + b}: ${fr(a + b, d)} bags, which is ${mixed(1, a + b - d, d)}.`,
          });
        },
        (rng) => {
          const n = ri(rng, 1, d - 2), b = ri(rng, n + 1, d - 1);
          return frac(`A tin holds ${mixed(1, n, d)} litres of paint. ${pick(rng, NAMES)} uses ${fr(b, d)} litre on a bookshelf. How much paint is left? (Answer as a fraction of a litre.)`, d + n - b, d, {
            tier, hint: `${fr(n, d)} is too small to give up ${fr(b, d)} — exchange the whole into ${pieces}.`,
            explain: `${mixed(1, n, d)} = ${fr(d + n, d)}; ${fr(d + n, d)} − ${fr(b, d)} = ${fr(d + n - b, d)} litre.`,
          });
        },
        (rng) => {
          const a = ri(rng, half, d - 1), b = ri(rng, half + 1, d - 1);
          return frac(`A puppy eats ${fr(a, d)} of a tin of food in the morning and ${fr(b, d)} in the evening. How much of a tin does it eat each day? (Improper fractions welcome.)`, a + b, d, {
            tier, hint: 'Same-size pieces — just add the tops, past one whole if needed.',
            explain: `${a} + ${b} = ${a + b}: ${fr(a + b, d)} tins, which is ${mixed(1, a + b - d, d)}.`,
          });
        },
        (rng) => {
          const n = ri(rng, 1, d - 2), b = ri(rng, n + 1, d - 1);
          return frac(`A plank is ${mixed(2, n, d)} m long. ${pick(rng, NAMES)} saws off ${fr(b, d)} m. How long is the plank now? (Improper fractions welcome.)`, 2 * d + n - b, d, {
            tier, hint: `Exchange one whole metre into ${pieces} before subtracting.`,
            explain: `${mixed(2, n, d)} = ${fr(2 * d + n, d)}; ${fr(2 * d + n, d)} − ${fr(b, d)} = ${fr(2 * d + n - b, d)} m.`,
          });
        },
        (rng) => {
          const n = ri(rng, 1, d - 1), b = ri(rng, 1, d - 1);
          return frac(`Two parcels weigh ${mixed(1, n, d)} kg and ${fr(b, d)} kg. How much do they weigh together? (Improper fractions welcome.)`, d + n + b, d, {
            tier, hint: `Write ${mixed(1, n, d)} as ${pieces} first, then add the tops.`,
            explain: `${mixed(1, n, d)} = ${fr(d + n, d)}; plus ${fr(b, d)} makes ${fr(d + n + b, d)} kg.`,
          });
        },
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 10a
  {
    id: 'u10-mult-frac', unit: 10, book: '5B', strand: 'fractions', emoji: '🍰',
    title: 'Multiplying fractions by whole numbers', shortTitle: 'Multiply fractions',
    explanation: {
      segments: [
        {
          text: 'Multiplying a fraction by a whole number is repeated addition: ' + fr(2, 5) + ' × 3 means ' + fr(2, 5) + ' + ' + fr(2, 5) + ' + ' + fr(2, 5) + ' = ' + fr(6, 5) + '.',
          alt: 'Three servings of two-fifths each: count the fifths! 2 + 2 + 2 = 6 fifths altogether. Multiplying by a whole number just adds the same fraction again and again.',
          svg: fracBar(2, 5) + fracBar(2, 5, { color: '#fcd34d' }) + fracBar(2, 5, { color: '#fca5a5' }),
        },
        {
          text: 'The shortcut: multiply the TOP by the whole number and leave the bottom alone. ' + fr(2, 5) + ' × 3 = ' + fr(6, 5) + '. The piece size (fifths) never changes — you just have more pieces.',
          alt: 'Only the count changes, never the size. Top × whole number, bottom stays. Then convert if the answer is improper: 6/5 = 1 and 1/5.',
        },
        {
          text: 'Mixed numbers: multiply the wholes and the fraction separately. ' + mixed(1, 1, 4) + ' × 3: wholes 1 × 3 = 3, fraction ' + fr(1, 4) + ' × 3 = ' + fr(3, 4) + '. Answer ' + mixed(3, 3, 4) + '.',
          alt: 'Split the mixed number into its whole part and fraction part, multiply each by the whole number, then recombine. If the fraction part overflows, pass the extra wholes across.',
        },
        {
          text: 'Watch for overflow: ' + mixed(1, 2, 3) + ' × 2: wholes 2, fraction ' + fr(4, 3) + ' = ' + mixed(1, 1, 3) + '. Total: 2 + ' + mixed(1, 1, 3) + ' = ' + mixed(3, 1, 3) + '.',
          alt: 'When the fraction part of your answer is improper, it is hiding extra wholes. Unpack them and add them to the whole-number part.',
        },
      ],
    },
    example: {
      steps: [
        'Each glass holds ' + fr(3, 8) + ' litre of smoothie. How much do 4 glasses hold?',
        'Multiply the top: 3 × 4 = 12. Bottom stays 8.',
        fr(12, 8) + ' = ' + mixed(1, 4, 8) + ' = ' + mixed(1, 1, 2) + '.',
        'Answer: <b>' + mixed(1, 1, 2) + ' litres</b>.',
      ],
    },
    faqs: [
      { q: 'Why does the bottom not change?', a: 'The bottom describes the SIZE of each piece — fifths stay fifths no matter how many you collect. Multiplying by 3 gives you three times as many pieces, not bigger pieces.' },
      { q: 'Can the answer be smaller than the whole number?', a: 'Yes! 1/4 × 3 = 3/4, which is less than 3. Multiplying by a fraction of 1 takes only part of each — three quarter-slices is less than three whole pizzas.' },
      { q: 'Is fraction × whole the same as whole × fraction?', a: 'Exactly the same, just like 3 × 4 = 4 × 3. "Three lots of two-fifths" equals "two-fifths of three". Both give 6/5.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const d = pick(rng, [3, 4, 5, 6]), k = ri(rng, 2, d - 1);
        return frac(`Work out ${fr(1, d)} × ${k}`, k, d, {
          tier, svg: fracBar(1, d),
          hint: `${k} lots of one piece — how many pieces?`,
          explain: `1 × ${k} = ${k} on top; the bottom stays ${d}: ${fr(k, d)}.`,
        });
      }
      if (tier === 2) {
        const d = pick(rng, [3, 4, 5, 8]), n = ri(rng, 2, d - 1), k = ri(rng, 2, 4);
        return frac(`Work out ${fr(n, d)} × ${k}. (Improper answers welcome.)`, n * k, d, {
          tier, hint: 'Multiply the top only.',
          explain: `${n} × ${k} = ${n * k}: the answer is ${fr(n * k, d)}${n * k > d ? ` = ${mixed(Math.floor(n * k / d), n * k % d || d, d)}` : ''}.`,
        });
      }
      if (rng() < 0.5) {
        const d = pick(rng, [3, 4]), w = 1, n = ri(rng, 1, d - 1), k = ri(rng, 2, 3);
        const topTotal = (w * d + n) * k;
        const wholes = Math.floor(topTotal / d), rem = topTotal % d;
        const correct = rem === 0 ? String(wholes) : mixed(wholes, rem, d);
        const cands = [
          rem === 0 ? String(wholes + 1) : mixed(wholes + 1, rem, d),
          mixed(Math.max(1, wholes - 1), rem === 0 ? 1 : rem, d),
          mixed(wholes, rem === 0 ? 2 : (rem + 1 >= d ? rem - 1 : rem + 1), d),
        ];
        const pool = [correct];
        for (const c of cands) if (!pool.includes(c) && pool.length < 4) pool.push(c);
        const opts = shuffle(rng, pool);
        return mc(`Work out ${mixed(w, n, d)} × ${k}`, opts, opts.indexOf(correct), {
          tier, hint: 'Convert to an improper fraction first, or multiply wholes and fraction separately.',
          explain: `${mixed(w, n, d)} = ${fr(w * d + n, d)}; × ${k} = ${fr(topTotal, d)} = ${correct}.`,
        });
      }
      const d = pick(rng, [5, 8]), n = ri(rng, 2, d - 1), k = ri(rng, 3, 5);
      return scenario(rng, 'u10-mult-frac:t3', [
        (rng) => frac(`One lap of a park is ${fr(n, d)} km. ${pick(rng, NAMES)} runs ${k} laps. How far is that? (Answer as a fraction of a km.)`, n * k, d, {
          tier, hint: `${k} equal laps: multiply the fraction by ${k}.`,
          explain: `${fr(n, d)} × ${k} = ${fr(n * k, d)} km.`,
        }),
        (rng) => frac(`Each mug holds ${fr(n, d)} litre of hot chocolate. ${k} mugs are filled. How much hot chocolate is that? (Answer as a fraction of a litre.)`, n * k, d, {
          tier, hint: 'Same fraction, again and again — multiply the top only.',
          explain: `${fr(n, d)} × ${k} = ${fr(n * k, d)} litres.`,
        }),
        (rng) => frac(`One batch of biscuits uses ${fr(n, d)} of a block of butter. ${pick(rng, NAMES)} bakes ${k} batches. How much butter is used? (Answer as a fraction of a block.)`, n * k, d, {
          tier, hint: `${k} batches, each needing ${fr(n, d)} of a block.`,
          explain: `${fr(n, d)} × ${k} = ${fr(n * k, d)} blocks of butter.`,
        }),
        (rng) => frac(`Each flower bed needs ${fr(n, d)} of a bag of compost. How much compost do ${k} beds need? (Answer as a fraction of a bag.)`, n * k, d, {
          tier, hint: 'Repeated addition in disguise — multiply.',
          explain: `${fr(n, d)} + … (${k} times) = ${fr(n * k, d)} bags.`,
        }),
        (rng) => frac(`${pick(rng, NAMES)} walks ${fr(n, d)} km to school. How far is that over ${k} mornings? (Answer as a fraction of a km.)`, n * k, d, {
          tier, hint: 'The same walk every morning — multiply the fraction.',
          explain: `${fr(n, d)} × ${k} = ${fr(n * k, d)} km.`,
        }),
        (rng) => frac(`${pick(rng, NAMES)} cuts ${fr(n, d)} m from each of ${k} rolls of ribbon. Each roll is 5 m long. How much ribbon is cut off altogether? (Answer as a fraction of a metre.)`, n * k, d, {
          tier, hint: 'Watch out — one number in the story plays no part in the answer.',
          explain: `${fr(n, d)} × ${k} = ${fr(n * k, d)} m. The 5 m roll length was extra information.`,
        }),
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 10b
  {
    id: 'u10-frac-amounts', unit: 10, book: '5B', strand: 'fractions', emoji: '💰',
    title: 'Fractions of amounts', shortTitle: 'Fractions of amounts',
    explanation: {
      segments: [
        {
          text: 'To find a fraction OF an amount, the bottom tells you what to divide by. ' + fr(1, 4) + ' of 20: divide 20 into 4 equal groups → 20 ÷ 4 = 5.',
          alt: 'One quarter of 20 sweets: share the sweets into 4 equal piles and take one pile. Each pile has 5. Dividing by the denominator IS finding one piece.',
          svg: barModel(20, [5, 5, 5, 5]),
        },
        {
          text: 'For fractions like ' + fr(3, 4) + ', two steps: DIVIDE by the bottom, then MULTIPLY by the top. ' + fr(3, 4) + ' of 20: one quarter is 5, so three quarters is 5 × 3 = 15.',
          alt: 'First find one piece (divide by the bottom), then take as many pieces as the top asks for (multiply). Divide by the bottom, times by the top — that little rhyme does it all.',
        },
        {
          text: 'The bar model makes it visible: the whole bar is 20, cut into 4 equal parts of 5. Shade 3 parts: 15.',
          alt: 'Draw the whole amount as one bar, slice it into as many equal parts as the denominator, write the value in each slice, and count the slices you need.',
        },
        {
          text: 'Working BACKWARDS: if ' + fr(1, 4) + ' of a number is 6, the whole is 6 × 4 = 24. If ' + fr(2, 5) + ' of a class is 12, one fifth is 6, so the class is 6 × 5 = 30.',
          alt: 'Reverse problems give you a piece and ask for the whole. Find what ONE piece is worth first, then multiply up to the full bar.',
        },
      ],
    },
    example: {
      steps: [
        'Find ' + fr(3, 8) + ' of 240.',
        'Divide by the bottom: 240 ÷ 8 = 30.',
        'Multiply by the top: 30 × 3 = 90.',
        'So ' + fr(3, 8) + ' of 240 = <b>90</b>.',
      ],
    },
    faqs: [
      { q: 'Why divide first and not multiply first?', a: 'Both orders give the same answer, but divide-first keeps the numbers small and friendly. 3/4 of 20: divide first gives 5 × 3 = 15; multiply first gives 60 ÷ 4 = 15. Same result — smaller numbers on the first path.' },
      { q: '"Of" means times — is that true?', a: 'Yes: 3/4 OF 20 is the same as 3/4 × 20. That is why fraction-of-amount and fraction-times-whole-number questions are secretly the same skill.' },
      { q: 'How do the backwards ones work?', a: 'Draw the bar! If 2/5 of the class is 12, shade 2 of the 5 slices and label them 12. Two slices worth 12 means one slice is 6, so five slices — the whole class — is 30.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const d = pick(rng, [2, 3, 4, 5, 10]);
        const unitVal = ri(rng, 3, 12);
        const n = d * unitVal;
        return num(`Find ${fr(1, d)} of ${n}.`, unitVal, {
          tier, hint: `Divide ${n} into ${d} equal groups.`,
          explain: `${n} ÷ ${d} = ${unitVal}.`,
        });
      }
      if (tier === 2) {
        const d = pick(rng, [3, 4, 5, 8, 10]);
        const top = ri(rng, 2, d - 1);
        const unitVal = ri(rng, 4, 12);
        const n = d * unitVal;
        return num(`Find ${fr(top, d)} of ${n}.`, unitVal * top, {
          tier, svg: barModel(n, Array(d).fill(unitVal)),
          hint: `Divide by ${d} first, then multiply by ${top}.`,
          explain: `${n} ÷ ${d} = ${unitVal}, then × ${top} = ${unitVal * top}.`,
        });
      }
      // Three story shapes: whole from one part, whole from several parts,
      // and "how many are left" — the wording decides the plan.
      const partWhole = (rng) => {
        const d = pick(rng, [4, 5, 8]), top = ri(rng, 2, 3);
        const unitVal = ri(rng, 4, 9);
        return { d, top, unitVal, part: top * unitVal, whole: d * unitVal };
      };
      const leftOver = (rng) => {
        const d = pick(rng, [4, 5, 10]), top = ri(rng, 2, d - 1);
        const unitVal = ri(rng, 6, 12);
        return { d, top, unitVal, total: d * unitVal, taken: top * unitVal };
      };
      return scenario(rng, 'u10-frac-amounts:t3', [
        (rng) => {
          const d = pick(rng, [3, 4, 5, 8]), piece = ri(rng, 5, 15);
          return num(`${fr(1, d)} of a number is ${piece}. What is the number?`, piece * d, {
            tier, hint: `One piece is ${piece} — how many pieces make the whole?`,
            explain: `${piece} × ${d} = ${piece * d}.`,
          });
        },
        (rng) => {
          const d = pick(rng, [3, 4, 5]), piece = ri(rng, 5, 15);
          return num(`${pick(rng, NAMES)} spends ${fr(1, d)} of some savings on a game. The game costs £${piece}. How much was saved altogether, in pounds?`, piece * d, {
            tier, hint: `£${piece} is just ONE of ${d} equal parts.`,
            explain: `£${piece} × ${d} = £${piece * d}.`,
          });
        },
        (rng) => {
          const s = partWhole(rng);
          return num(`${fr(s.top, s.d)} of the children in a club are girls. There are ${s.part} girls. How many children are in the club?`, s.whole, {
            tier, hint: `${s.top} slices are worth ${s.part} — find one slice first.`,
            explain: `One part = ${s.part} ÷ ${s.top} = ${s.unitVal}; the whole club = ${s.unitVal} × ${s.d} = ${s.whole}.`,
          });
        },
        (rng) => {
          const s = partWhole(rng);
          return num(`${fr(s.top, s.d)} of the tickets for a show have been sold — that is ${s.part} tickets. How many tickets are there altogether?`, s.whole, {
            tier, hint: `${s.part} tickets make ${s.top} parts. What is one part worth?`,
            explain: `One part = ${s.part} ÷ ${s.top} = ${s.unitVal}; all ${s.d} parts = ${s.unitVal} × ${s.d} = ${s.whole} tickets.`,
          });
        },
        (rng) => {
          const s = partWhole(rng);
          return num(`${pick(rng, NAMES)} has read ${fr(s.top, s.d)} of a book — ${s.part} pages so far. How many pages does the whole book have?`, s.whole, {
            tier, hint: 'Work back from the part to one slice, then up to the whole.',
            explain: `${s.part} ÷ ${s.top} = ${s.unitVal} pages per part; × ${s.d} = ${s.whole} pages.`,
          });
        },
        (rng) => {
          const s = leftOver(rng);
          return num(`A shop has ${s.total} apples and sells ${fr(s.top, s.d)} of them. How many apples are LEFT?`, s.total - s.taken, {
            tier, hint: 'Find the fraction sold first, then subtract from the total.',
            explain: `Sold: ${s.total} ÷ ${s.d} × ${s.top} = ${s.taken}. Left: ${s.total} − ${s.taken} = ${s.total - s.taken}.`,
          });
        },
        (rng) => {
          const s = leftOver(rng);
          return num(`${pick(rng, NAMES)} has ${s.total} stickers and gives ${fr(s.top, s.d)} of them away. How many stickers are KEPT?`, s.total - s.taken, {
            tier, hint: 'The question asks about what remains, not what is given away.',
            explain: `Given away: ${s.total} ÷ ${s.d} × ${s.top} = ${s.taken}. Kept: ${s.total} − ${s.taken} = ${s.total - s.taken}.`,
          });
        },
        (rng) => {
          const s = leftOver(rng);
          return num(`A water tank holds ${s.total} litres. ${fr(s.top, s.d)} of the water is used. How many litres are LEFT in the tank?`, s.total - s.taken, {
            tier, hint: `Used first (÷ ${s.d}, × ${s.top}), then take it away from ${s.total}.`,
            explain: `Used: ${s.total} ÷ ${s.d} × ${s.top} = ${s.taken}. Left: ${s.total} − ${s.taken} = ${s.total - s.taken} litres.`,
          });
        },
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 11a
  {
    id: 'u11-decimals-frac', unit: 11, book: '5B', strand: 'decimals', emoji: '🔟',
    title: 'Decimals as fractions', shortTitle: 'Decimals ↔ fractions',
    explanation: {
      segments: [
        {
          text: 'Decimals are fractions in disguise! The columns keep going PAST the ones: tenths, hundredths, thousandths. 0.7 means ' + fr(7, 10) + ' — seven tenths.',
          alt: 'After the decimal point, each column is ten times smaller: tenths, then hundredths, then thousandths. The digit 7 in 0.7 counts tenths, so 0.7 and seven-tenths are the same number.',
          svg: pvGrid(3.75, { decimals: 2 }),
        },
        {
          text: 'Two decimal places = hundredths. 0.43 is ' + fr(43, 100) + '. And 0.43 splits as 4 tenths + 3 hundredths — the place value grid shows it.',
          alt: 'Read 0.43 as "43 hundredths". The first decimal digit counts tenths (worth ten hundredths each), the second counts single hundredths: 40 + 3 = 43 hundredths.',
        },
        {
          text: 'Three decimal places = <b>thousandths</b>. 0.007 is ' + fr(7, 1000) + '. A thousandth is tiny: cut one whole into 1,000 equal slivers.',
          alt: 'Thousandths are what you get slicing a hundredth into ten. 0.375 means 3 tenths, 7 hundredths and 5 thousandths — or simply 375 thousandths.',
        },
        {
          text: 'Converting is just reading the last column: 0.3 = ' + fr(3, 10) + ', 0.27 = ' + fr(27, 100) + ', 0.125 = ' + fr(125, 1000) + '. And backwards: ' + fr(9, 100) + ' = 0.09 — mind the zero holding the tenths!',
          alt: 'Count the decimal places: one place → tenths, two → hundredths, three → thousandths. Going the other way, make sure each digit lands in its proper column, using zeros as place holders.',
        },
      ],
    },
    example: {
      steps: [
        'Write ' + fr(9, 100) + ' as a decimal.',
        'Hundredths need TWO decimal places.',
        '9 hundredths is 0 tenths and 9 hundredths.',
        'Answer: <b>0.09</b> (not 0.9 — that would be 9 tenths, ten times too big!).',
      ],
    },
    faqs: [
      { q: 'Why is 0.5 the same as a half?', a: '0.5 means 5 tenths, and 5/10 simplifies to 1/2. Cut a cake into ten slices and take five — you have half the cake.' },
      { q: 'Is 0.10 the same as 0.1?', a: 'Yes — 10 hundredths equals 1 tenth, like 10p equals one 10p coin. The extra zero adds no value; 0.1, 0.10 and 0.100 all sit at the same spot on the number line.' },
      { q: 'How should I say 0.43 out loud?', a: 'Say "zero point four three", naming each digit — not "point forty-three". Digit-by-digit reading keeps the place value clear and avoids mixing it up with 0.403.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const n = ri(rng, 1, 9);
        if (rng() < 0.5) {
          return num(`Write ${fr(n, 10)} as a decimal.`, n / 10, {
            tier, allowDecimal: true, hint: 'Tenths live in the first decimal place.',
            explain: `${n} tenths = 0.${n}`,
          });
        }
        return frac(`Write 0.${n} as a fraction.`, n, 10, {
          tier, hint: 'One decimal place means tenths.',
          explain: `0.${n} is ${n} tenths: ${fr(n, 10)}.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const n = ri(rng, 11, 99);
          return frac(`Write 0.${String(n).padStart(2, '0')} as a fraction.`, n, 100, {
            tier, hint: 'Two decimal places means hundredths.',
            explain: `0.${String(n).padStart(2, '0')} is ${n} hundredths: ${fr(n, 100)}.`,
          });
        }
        if (kind === 2) {
          const n = ri(rng, 1, 9);
          return num(`Write ${fr(n, 100)} as a decimal.`, n / 100, {
            tier, allowDecimal: true, hint: 'Hundredths need two decimal places — use a zero if needed.',
            explain: `${n} hundredths = 0.0${n}. The zero holds the tenths place.`,
          });
        }
        const digits = [ri(rng, 1, 9), ri(rng, 0, 9), ri(rng, 1, 9)];
        const val = `0.${digits.join('')}`;
        const posName = ['tenths', 'hundredths', 'thousandths'];
        const p = ri(rng, 0, 2);
        return num(`In the number ${val}, which digit is in the <b>${posName[p]}</b> place?`, digits[p], {
          tier, hint: 'Count the decimal places: tenths, hundredths, thousandths.',
          explain: `${val}: ${digits[0]} tenths, ${digits[1]} hundredths, ${digits[2]} thousandths.`,
        });
      }
      const kind = ri(rng, 1, 2);
      if (kind === 1) {
        const n = ri(rng, 1, 9);
        const correct = '0.00' + n;
        return mcFrom(rng, `Which decimal equals ${fr(n, 1000)}?`, correct, ['0.' + n, '0.0' + n, String(n) + '.000'], {
          tier, hint: 'Thousandths need three decimal places.',
          explain: `${n} thousandths = ${correct}.`,
        });
      }
      const whole = ri(rng, 1, 9) * 10 + ri(rng, 1, 9);
      return num(`How many hundredths make 0.${whole}?`, whole, {
        tier, hint: 'Read the number as hundredths.',
        explain: `0.${whole} = ${fr(whole, 100)} — that is ${whole} hundredths.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 11b
  {
    id: 'u11-compare-dec', unit: 11, book: '5B', strand: 'decimals', emoji: '⚖️',
    title: 'Comparing and rounding decimals', shortTitle: 'Compare & round decimals',
    explanation: {
      segments: [
        {
          text: 'To compare decimals, line up the decimal points and compare column by column: tenths first, then hundredths. 0.72 vs 0.68: seven tenths beats six tenths, so 0.72 is bigger.',
          alt: 'Compare decimals the same way as whole numbers — left to right — but starting at the tenths. The first column where they differ decides the winner.',
        },
        {
          text: 'Beware the length trap! 0.6 is BIGGER than 0.475. Longer does not mean larger: 0.6 is 600 thousandths, but 0.475 is only 475.',
          alt: 'More digits does not mean more value. Give both numbers the same number of decimal places: 0.6 = 0.600. Now 600 against 475 is easy — 0.6 wins.',
        },
        {
          text: 'Rounding decimals to the nearest whole number: look at the tenths. 4.62 → the tenths digit is 6, so round UP to 5. 4.38 → tenths is 3, round DOWN to 4.',
          alt: 'Which whole number is it closest to? 4.62 sits between 4 and 5, and the 6 tenths push it past halfway — closer to 5.',
        },
        {
          text: 'Rounding to ONE decimal place: the hundredths digit decides. 4.67 → hundredths is 7, so 4.67 rounds to 4.7. 3.42 → 3.4.',
          alt: 'Same rounding rule, one column along. Keep one digit after the point and let the next digit decide up or down: 5 or more rounds up.',
        },
      ],
    },
    example: {
      steps: [
        'Order 0.7, 0.65 and 0.72, smallest first.',
        'Give them all two decimal places: 0.70, 0.65, 0.72.',
        'Compare as hundredths: 65, 70, 72.',
        'Order: <b>0.65, 0.7, 0.72</b>.',
      ],
    },
    faqs: [
      { q: 'Why is 0.6 bigger than 0.475? The 475 looks huge!', a: 'Because tenths beat hundredths and thousandths. 0.6 has SIX tenths; 0.475 has only four tenths. Adding zeros makes it fair: 0.600 vs 0.475 — now compare 600 and 475.' },
      { q: 'What does 2.5 round to?', a: 'A 5 always rounds up, so 2.5 rounds to 3. Same rule as whole numbers — exactly-halfway goes up.' },
      { q: 'When would I round to one decimal place in real life?', a: 'Everywhere! Your height might be 1.43 m ≈ 1.4 m, a race time 12.87 seconds ≈ 12.9 seconds. One decimal place keeps numbers friendly but still fairly accurate.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const a = ri(rng, 1, 9), b = ri(rng, 1, 9);
        if (a === b) return this.gen(rng, tier);
        const x = Number(`0.${a}${ri(rng, 0, 9)}`), y = Number(`0.${b}${ri(rng, 0, 9)}`);
        const bigger = rng() < 0.5;
        return tf(`True or false: ${x} ${bigger ? '&gt;' : '&lt;'} ${y}`, bigger ? x > y : x < y, {
          tier, hint: 'Compare the tenths first.',
          explain: `${Math.max(x, y)} has more tenths, so it is the larger number.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 2);
        if (kind === 1) {
          const w = ri(rng, 2, 9);
          const t = ri(rng, 1, 9), hRaw = ri(rng, 1, 9);
          const val = Number(`${w}.${t}${hRaw}`);
          return num(`Round ${val} to the nearest WHOLE number.`, t >= 5 ? w + 1 : w, {
            tier, hint: 'The tenths digit decides: 5 or more rounds up.',
            explain: `${val} has ${t} tenths, so it rounds to ${t >= 5 ? w + 1 : w}.`,
          });
        }
        const t = ri(rng, 1, 8);
        const vals = shuffle(rng, [`0.${t}`, `0.${t}${ri(rng, 1, 9)}`, `0.${t - 1 || 1}${ri(rng, 1, 9)}`, `0.${Math.min(9, t + 1)}`]);
        const uniq = [...new Set(vals)];
        if (uniq.length < 4) return this.gen(rng, tier);
        const sorted = uniq.slice().sort((a, b) => Number(a) - Number(b));
        return order('Order these decimals, <b>smallest first</b>.', rng, sorted, {
          tier, hint: 'Give every number the same number of decimal places first.',
          explain: 'Pad with zeros (0.6 → 0.60), then compare like whole numbers.',
        });
      }
      const kind = ri(rng, 1, 2);
      if (kind === 1) {
        const w = ri(rng, 1, 9), t = ri(rng, 0, 9), hDig = ri(rng, 1, 9);
        const val = Number(`${w}.${t}${hDig}`);
        const roundedTenths = Math.round(val * 10) / 10;
        return num(`Round ${val} to ONE decimal place.`, roundedTenths, {
          tier, allowDecimal: true,
          hint: 'The hundredths digit decides.',
          explain: `The hundredths digit is ${hDig}, so ${val} → ${roundedTenths}.`,
        });
      }
      const start = ri(rng, 2, 20) / 10;
      const step = pick(rng, [0.2, 0.25, 0.5]);
      const terms = [start, start + step, start + 2 * step];
      const ans = Math.round((start + 3 * step) * 100) / 100;
      return num(`Continue the sequence: ${terms.map((v) => Math.round(v * 100) / 100).join(', ')}, …`, ans, {
        tier, allowDecimal: true,
        hint: 'Find the step between neighbours.',
        explain: `The step is ${step}: ${Math.round((start + 2 * step) * 100) / 100} + ${step} = ${ans}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 11c
  {
    id: 'u11-percent', unit: 11, book: '5B', strand: 'decimals', emoji: '💯',
    title: 'Percentages', shortTitle: 'Percentages',
    explanation: {
      segments: [
        {
          text: '<b>Per cent</b> means "out of every hundred". 45% is 45 out of 100 — the fraction ' + fr(45, 100) + ' and the decimal 0.45. Three costumes, one amount!',
          alt: 'The % sign is a shortcut for hundredths. Picture a 100-square grid: 45% means 45 squares shaded. Fraction, decimal and percentage are three ways to describe the same shading.',
        },
        {
          text: 'Percent ↔ decimal is a two-place shift: 62% = 0.62, and 0.07 = 7%. Percent ↔ fraction: put it over 100, then simplify if you can: 40% = ' + fr(40, 100) + ' = ' + fr(2, 5) + '.',
          alt: 'To turn a percentage into a decimal, slide the digits two places smaller. To make a fraction, just write it over 100 — simplifying is a bonus.',
        },
        {
          text: 'Learn the famous family by heart: 50% = ' + fr(1, 2) + ' = 0.5. 25% = ' + fr(1, 4) + ' = 0.25. 75% = ' + fr(3, 4) + ' = 0.75. 10% = ' + fr(1, 10) + ' = 0.1. 20% = ' + fr(1, 5) + ' = 0.2.',
          alt: 'A few conversions appear everywhere: half is 50%, a quarter 25%, three quarters 75%, a tenth 10%, a fifth 20%. Knowing these by heart makes most percentage questions instant.',
        },
        {
          text: 'The whole is always 100%. If 30% of a class walk to school, then 100 − 30 = 70% do not. Percentages of one whole always total 100.',
          alt: 'Percentages slice up one whole hundred. Whatever is not in one group is in the other — the parts must add to 100%.',
        },
      ],
    },
    example: {
      steps: [
        'Write ' + fr(3, 5) + ' as a percentage.',
        'Make the bottom 100: × 20 top and bottom.',
        fr(3, 5) + ' = ' + fr(60, 100) + '.',
        'Out of 100 → <b>60%</b>.',
      ],
    },
    faqs: [
      { q: 'Why is 1/2 equal to 50%?', a: 'Because 1/2 = 50/100 — multiply top and bottom by 50. Percent just asks "how many out of 100?", and half of 100 is 50.' },
      { q: 'Can a percentage be bigger than 100%?', a: 'Yes — 150% means one and a half times the whole. Prices and scores can grow past the original 100%. But the slices of one single whole always add to exactly 100%.' },
      { q: 'What is 0.3 as a percentage — 3% or 30%?', a: '30%! 0.3 is three TENTHS = 30 hundredths. The 3% trap comes from forgetting the two-place shift: 0.03 is 3%, but 0.3 is 30%.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const p = ri(rng, 5, 95);
        if (rng() < 0.5) {
          return num(`${p} squares of a 100-square grid are shaded. What PERCENTAGE is shaded?`, p, {
            tier, hint: 'Per cent means out of 100.',
            explain: `${p} out of 100 = ${p}%.`,
          });
        }
        return frac(`Write ${p}% as a fraction.`, p, 100, {
          tier, hint: 'Per cent means out of every hundred.',
          explain: `${p}% = ${fr(p, 100)}${gcd(p, 100) > 1 ? ` = ${fr(p / gcd(p, 100), 100 / gcd(p, 100))}` : ''}.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 2);
        if (kind === 1) {
          const p = ri(rng, 5, 95);
          return num(`Write ${p}% as a decimal.`, p / 100, {
            tier, allowDecimal: true, hint: 'Shift two places: 45% → 0.45.',
            explain: `${p}% = ${p}/100 = ${p / 100}.`,
          });
        }
        const p = ri(rng, 1, 9) * 10;
        return num(`Write ${(p / 100).toFixed(1)} as a percentage.`, p, {
          tier, hint: 'Shift two places the other way.',
          explain: `${(p / 100).toFixed(1)} = ${p} hundredths = ${p}%.`,
        });
      }
      const kind = ri(rng, 1, 3);
      const family = [[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 5, 20], [2, 5, 40], [3, 5, 60], [4, 5, 80], [1, 10, 10], [7, 10, 70], [9, 10, 90]];
      if (kind === 1) {
        const [n, d, p] = pick(rng, family);
        return mcFrom(rng, `Which percentage equals ${fr(n, d)}?`, `${p}%`, [`${p + 10}%`, `${Math.max(5, p - 10)}%`, `${Math.min(95, p + 25)}%`], {
          tier, hint: 'Make the denominator 100.',
          explain: `${fr(n, d)} = ${fr(p, 100)} = ${p}%.`,
        });
      }
      if (kind === 2) {
        const p = pick(rng, [20, 25, 30, 35, 40, 45, 60, 65, 70, 75]);
        const opts = {
          tier, hint: 'The whole is always 100%.',
          explain: `100% − ${p}% = ${100 - p}%.`,
        };
        return scenario(rng, 'u11-percent:t3-complement', [
          (rng) => num(`In a survey, ${p}% of children chose football. What percentage did NOT choose football?`, 100 - p, opts),
          (rng) => num(`${p}% of the children in a school walk to school. What percentage travel some other way?`, 100 - p, opts),
          (rng) => num(`A tablet's battery is at ${p}%. What percentage of the battery has been used?`, 100 - p, opts),
          (rng) => num(`In a car park, ${p}% of the cars are electric. What percentage are NOT electric?`, 100 - p, opts),
        ]);
      }
      const [n, d, p] = pick(rng, family);
      return num(`Write ${fr(n, d)} as a percentage. (Just the number.)`, p, {
        tier, hint: `Scale the fraction so the bottom becomes 100.`,
        explain: `${fr(n, d)} = ${fr(p, 100)} = ${p}%.`,
      });
    },
  },
];
