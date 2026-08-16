// Synced from powermath-trainer @ 85699c4. Fixes belong upstream first.
// Pure answer checking for every question kind.

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

// Numbers may be typed with spaces or thousands commas ("34,000", "34 000").
export function parseNumber(text) {
  if (text == null) return null;
  const t = String(text).trim().replace(/[,\s]/g, '').replace('−', '-');
  if (!/^-?\d*\.?\d+$/.test(t)) return null;
  return Number(t);
}

export function checkAnswer(q, input) {
  switch (q.kind) {
    case 'num': {
      const v = parseNumber(input);
      if (v === null) return { ok: false };
      const tol = q.tolerance ?? 0;
      return { ok: Math.abs(v - q.answer) <= tol };
    }
    case 'mc':
      return { ok: Number(input) === q.answerIndex };
    case 'tf':
      return { ok: Boolean(input) === q.answer };
    case 'frac': {
      const n = parseNumber(input?.n), d = parseNumber(input?.d);
      if (n === null || d === null || d === 0) return { ok: false };
      if (q.exact) return { ok: n === q.answer.n && d === q.answer.d };
      return { ok: n * q.answer.d === d * q.answer.n };
    }
    case 'order': {
      if (!Array.isArray(input) || input.length !== q.correctOrder.length) return { ok: false };
      return { ok: input.every((v, i) => String(v) === String(q.correctOrder[i])) };
    }
    default:
      return { ok: false };
  }
}

// Human-readable correct answer for feedback.
export function answerText(q) {
  switch (q.kind) {
    case 'num': return fmt(q.answer) + (q.unit ? ' ' + q.unit : '');
    case 'mc': return stripHtml(String(q.options[q.answerIndex]));
    case 'tf': return q.answer ? 'True' : 'False';
    case 'frac': return `${q.answer.n}/${q.answer.d}`;
    case 'order': return q.correctOrder.map(fmt).join(', ');
    default: return '';
  }
}

export function fmt(n) {
  if (typeof n !== 'number') return String(n);
  if (!Number.isInteger(n)) return String(n);
  return n.toLocaleString('en-GB');
}

function stripHtml(s) {
  return s.replace(/<[^>]*>/g, '');
}
