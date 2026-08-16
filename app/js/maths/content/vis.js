// Synced from powermath-trainer @ 85699c4 (tooling/content-neutral).
// Small SVG builders for the visual models Power Maths uses.
// All return self-contained SVG strings sized for a card ~320px wide.

const NS = 'xmlns="http://www.w3.org/2000/svg"';

export function barModel(whole, parts, { partLabels = null, wholeLabel = null } = {}) {
  const W = 320, H = 86, x0 = 8, bw = W - 16;
  const total = parts.reduce((a, b) => a + b, 0) || 1;
  let x = x0, cells = '';
  const colors = ['#7dd3fc', '#fca5a5', '#fcd34d', '#86efac', '#c4b5fd'];
  parts.forEach((p, i) => {
    const w = (p / total) * bw;
    cells += `<rect x="${x}" y="34" width="${w}" height="30" rx="4" fill="${colors[i % colors.length]}" stroke="#334155"/>`;
    const lbl = partLabels ? partLabels[i] : p;
    cells += `<text x="${x + w / 2}" y="54" text-anchor="middle" font-size="14" fill="#0f172a">${lbl}</text>`;
    x += w;
  });
  const top = wholeLabel ?? whole;
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">
    <rect x="${x0}" y="4" width="${bw}" height="24" rx="4" fill="#e2e8f0" stroke="#334155"/>
    <text x="${W / 2}" y="21" text-anchor="middle" font-size="14" fill="#0f172a">${top}</text>
    ${cells}</svg>`;
}

export function partWhole(whole, parts) {
  const W = 320, H = 150;
  const px = parts.length === 2 ? [90, 230] : [60, 160, 260];
  let circles = `<circle cx="160" cy="36" r="30" fill="#fcd34d" stroke="#334155"/>
    <text x="160" y="42" text-anchor="middle" font-size="16" font-weight="700">${whole}</text>`;
  parts.forEach((p, i) => {
    circles += `<line x1="160" y1="64" x2="${px[i]}" y2="94" stroke="#334155" stroke-width="2"/>
      <circle cx="${px[i]}" cy="118" r="26" fill="#7dd3fc" stroke="#334155"/>
      <text x="${px[i]}" y="124" text-anchor="middle" font-size="15">${p}</text>`;
  });
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">${circles}</svg>`;
}

// Place-value grid, e.g. pvGrid(34075) -> columns TTh Th H T O with digits.
export function pvGrid(n, { decimals = 0 } = {}) {
  const s = decimals ? n.toFixed(decimals) : String(n);
  const [ip, dp = ''] = s.split('.');
  const intNames = ['O', 'T', 'H', 'Th', 'TTh', 'HTh', 'M'];
  const cols = [];
  for (let i = 0; i < ip.length; i++) cols.push({ h: intNames[ip.length - 1 - i], d: ip[i] });
  const decNames = ['Tth', 'Hth', 'Thth'];
  for (let i = 0; i < dp.length; i++) cols.push({ h: decNames[i], d: dp[i], dec: true });
  const cw = Math.min(46, 300 / cols.length), W = cols.length * cw + 16, H = 78;
  let cells = '';
  cols.forEach((c, i) => {
    const x = 8 + i * cw;
    cells += `<rect x="${x}" y="6" width="${cw}" height="26" fill="${c.dec ? '#fde68a' : '#e0f2fe'}" stroke="#334155"/>
      <text x="${x + cw / 2}" y="24" text-anchor="middle" font-size="12" font-weight="700">${c.h}</text>
      <rect x="${x}" y="32" width="${cw}" height="34" fill="#fff" stroke="#334155"/>
      <text x="${x + cw / 2}" y="56" text-anchor="middle" font-size="18">${c.d}</text>`;
  });
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">${cells}</svg>`;
}

export function numberLine(min, max, marks = [], { step = null } = {}) {
  const W = 320, H = 70, x0 = 16, x1 = W - 16;
  const X = (v) => x0 + ((v - min) / (max - min)) * (x1 - x0);
  let ticks = '';
  const s = step ?? (max - min) / 4;
  for (let v = min; v <= max + 1e-9; v += s) {
    ticks += `<line x1="${X(v)}" y1="30" x2="${X(v)}" y2="42" stroke="#334155" stroke-width="1.5"/>
      <text x="${X(v)}" y="60" text-anchor="middle" font-size="11">${fmtShort(v)}</text>`;
  }
  let dots = '';
  for (const m of marks) {
    const v = typeof m === 'number' ? m : m.v;
    const label = typeof m === 'number' ? '' : (m.label ?? '');
    dots += `<circle cx="${X(v)}" cy="36" r="6" fill="#f87171" stroke="#7f1d1d"/>`;
    if (label) dots += `<text x="${X(v)}" y="18" text-anchor="middle" font-size="12" font-weight="700">${label}</text>`;
  }
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">
    <line x1="${x0}" y1="36" x2="${x1}" y2="36" stroke="#334155" stroke-width="2"/>${ticks}${dots}</svg>`;
}

export function fracBar(n, d, { color = '#86efac' } = {}) {
  const W = 320, H = 54, x0 = 8, bw = W - 16, cw = bw / d;
  let cells = '';
  for (let i = 0; i < d; i++) {
    cells += `<rect x="${x0 + i * cw}" y="10" width="${cw}" height="34" fill="${i < n ? color : '#f1f5f9'}" stroke="#334155"/>`;
  }
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">${cells}</svg>`;
}

export function fracCircle(n, d, { r = 44, color = '#7dd3fc' } = {}) {
  const cx = 55, cy = 50;
  let paths = '';
  for (let i = 0; i < d; i++) {
    const a0 = (i / d) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
    const large = 1 / d > 0.5 ? 1 : 0;
    paths += `<path d="M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z"
      fill="${i < n ? color : '#f1f5f9'}" stroke="#334155"/>`;
  }
  return `<svg ${NS} viewBox="0 0 110 100">${paths}</svg>`;
}

// Rectangle on a cm grid for area/perimeter work.
export function rectGrid(w, h, { unit = 'cm', showGrid = true } = {}) {
  const cell = Math.min(26, 220 / Math.max(w, h));
  const W = w * cell + 70, H = h * cell + 46;
  let grid = '';
  if (showGrid) {
    for (let i = 1; i < w; i++) grid += `<line x1="${8 + i * cell}" y1="8" x2="${8 + i * cell}" y2="${8 + h * cell}" stroke="#cbd5e1"/>`;
    for (let j = 1; j < h; j++) grid += `<line x1="8" y1="${8 + j * cell}" x2="${8 + w * cell}" y2="${8 + j * cell}" stroke="#cbd5e1"/>`;
  }
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">
    <rect x="8" y="8" width="${w * cell}" height="${h * cell}" fill="#bae6fd" stroke="#334155" stroke-width="2"/>${grid}
    <text x="${8 + (w * cell) / 2}" y="${H - 6}" text-anchor="middle" font-size="13">${w} ${unit}</text>
    <text x="${16 + w * cell}" y="${8 + (h * cell) / 2 + 4}" font-size="13">${h} ${unit}</text></svg>`;
}

// L-shape (rectilinear) with outer bounding a x b and a cut of c x d from one corner.
export function lShape(a, b, c, d) {
  const cell = Math.min(24, 200 / Math.max(a, b));
  const W = a * cell + 86, H = b * cell + 40;
  const pts = [
    [8, 8], [8 + a * cell, 8], [8 + a * cell, 8 + (b - d) * cell],
    [8 + (a - c) * cell, 8 + (b - d) * cell], [8 + (a - c) * cell, 8 + b * cell], [8, 8 + b * cell],
  ].map((p) => p.join(',')).join(' ');
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">
    <polygon points="${pts}" fill="#fcd34d" stroke="#334155" stroke-width="2"/>
    <text x="${8 + (a * cell) / 2}" y="${H - 20}" text-anchor="middle" font-size="12">${a} cm across the top</text>
    <text x="${14 + a * cell}" y="${8 + (b * cell) / 2}" font-size="12">${b} cm</text></svg>`;
}

export function angleDiagram(deg, { label = '?' } = {}) {
  const cx = 60, cy = 80, r = 52;
  const a = (-deg * Math.PI) / 180;
  const large = deg > 180 ? 1 : 0;
  const ex = cx + r * Math.cos(a), ey = cy + r * Math.sin(a);
  const ar = 24;
  const aex = cx + ar * Math.cos(a), aey = cy + ar * Math.sin(a);
  return `<svg ${NS} viewBox="0 0 160 100">
    <line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#334155" stroke-width="2.5"/>
    <line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="#334155" stroke-width="2.5"/>
    <path d="M${cx + ar},${cy} A${ar},${ar} 0 ${large} 0 ${aex},${aey}" fill="none" stroke="#f87171" stroke-width="2.5"/>
    <text x="${cx + 34}" y="${cy - 10 - (deg > 120 ? 14 : 0)}" font-size="13" fill="#b91c1c" font-weight="700">${label}</text></svg>`;
}

// First-quadrant coordinate grid with optional points, polygon, and mirror line.
export function coordGrid(size, points = [], { poly = false, vline = null } = {}) {
  const cell = 200 / size, W = 250, H = 240;
  let grid = '';
  for (let i = 0; i <= size; i++) {
    grid += `<line x1="${30 + i * cell}" y1="10" x2="${30 + i * cell}" y2="${10 + size * cell}" stroke="#cbd5e1"/>
      <line x1="30" y1="${10 + i * cell}" x2="${30 + size * cell}" y2="${10 + i * cell}" stroke="#cbd5e1"/>
      <text x="${30 + i * cell}" y="${size * cell + 26}" text-anchor="middle" font-size="10">${i}</text>
      <text x="20" y="${10 + (size - i) * cell + 3}" text-anchor="middle" font-size="10">${i}</text>`;
  }
  const X = (p) => 30 + p[0] * cell, Y = (p) => 10 + (size - p[1]) * cell;
  let marks = '';
  if (vline != null) {
    marks += `<line x1="${30 + vline * cell}" y1="10" x2="${30 + vline * cell}" y2="${10 + size * cell}"
      stroke="#dc2626" stroke-width="2" stroke-dasharray="6 4"/>`;
  }
  if (poly && points.length > 1) {
    marks += `<polygon points="${points.map((p) => `${X(p)},${Y(p)}`).join(' ')}" fill="#bae6fd88" stroke="#0369a1" stroke-width="2"/>`;
  }
  points.forEach((p, i) => {
    marks += `<circle cx="${X(p)}" cy="${Y(p)}" r="5" fill="#f87171" stroke="#7f1d1d"/>
      <text x="${X(p) + 9}" y="${Y(p) - 7}" font-size="11" font-weight="700">${p[2] ?? String.fromCharCode(65 + i)}</text>`;
  });
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">${grid}${marks}</svg>`;
}

// Simple bar chart for statistics questions.
export function barChart(labels, values, { unit = '' } = {}) {
  const W = 320, H = 180, x0 = 40, y0 = 140, bw = (W - x0 - 12) / labels.length;
  const max = Math.max(...values);
  const scale = niceScale(max);
  let bars = '', axis = '';
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) {
    const y = y0 - (v / scale.max) * 120;
    axis += `<line x1="${x0}" y1="${y}" x2="${W - 10}" y2="${y}" stroke="#e2e8f0"/>
      <text x="${x0 - 6}" y="${y + 4}" text-anchor="end" font-size="10">${v}</text>`;
  }
  values.forEach((v, i) => {
    const h = (v / scale.max) * 120;
    bars += `<rect x="${x0 + i * bw + 6}" y="${y0 - h}" width="${bw - 12}" height="${h}" fill="#7dd3fc" stroke="#334155"/>
      <text x="${x0 + i * bw + bw / 2}" y="${y0 + 16}" text-anchor="middle" font-size="11">${labels[i]}</text>`;
  });
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">${axis}${bars}
    <line x1="${x0}" y1="${y0}" x2="${W - 10}" y2="${y0}" stroke="#334155" stroke-width="2"/>
    <line x1="${x0}" y1="${y0}" x2="${x0}" y2="14" stroke="#334155" stroke-width="2"/>
    ${unit ? `<text x="10" y="10" font-size="10">${unit}</text>` : ''}</svg>`;
}

// Line graph for statistics questions: labels on x, values joined by a line.
export function lineGraph(labels, values, { unit = '' } = {}) {
  const W = 320, H = 180, x0 = 40, y0 = 140, span = W - x0 - 16;
  const max = Math.max(...values);
  const scale = niceScale(max);
  const X = (i) => x0 + (labels.length === 1 ? 0 : (i / (labels.length - 1)) * span);
  const Y = (v) => y0 - (v / scale.max) * 120;
  let axis = '';
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) {
    axis += `<line x1="${x0}" y1="${Y(v)}" x2="${W - 10}" y2="${Y(v)}" stroke="#e2e8f0"/>
      <text x="${x0 - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10">${v}</text>`;
  }
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v)}`).join(' ');
  let pts = '', xlab = '';
  values.forEach((v, i) => {
    pts += `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="#0369a1"/>`;
    xlab += `<text x="${X(i)}" y="${y0 + 16}" text-anchor="middle" font-size="10">${labels[i]}</text>`;
  });
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">${axis}
    <path d="${path}" fill="none" stroke="#0ea5e9" stroke-width="2.5"/>${pts}${xlab}
    <line x1="${x0}" y1="${y0}" x2="${W - 10}" y2="${y0}" stroke="#334155" stroke-width="2"/>
    <line x1="${x0}" y1="${y0}" x2="${x0}" y2="14" stroke="#334155" stroke-width="2"/>
    ${unit ? `<text x="8" y="10" font-size="10">${unit}</text>` : ''}</svg>`;
}

// Table for two-way table questions.
export function dataTable(headers, rows) {
  const cols = headers.length;
  const cw = Math.min(90, 300 / cols), rh = 26;
  const W = cols * cw + 16, H = (rows.length + 1) * rh + 12;
  let cells = '';
  headers.forEach((h, c) => {
    cells += cell(c, 0, h, true);
  });
  rows.forEach((r, ri) => r.forEach((v, c) => { cells += cell(c, ri + 1, v, c === 0); }));
  function cell(c, r, v, head) {
    return `<rect x="${8 + c * cw}" y="${6 + r * rh}" width="${cw}" height="${rh}" fill="${head ? '#e0f2fe' : '#fff'}" stroke="#334155"/>
      <text x="${8 + c * cw + cw / 2}" y="${6 + r * rh + 17}" text-anchor="middle" font-size="12" ${head ? 'font-weight="700"' : ''}>${v}</text>`;
  }
  return `<svg ${NS} viewBox="0 0 ${W} ${H}">${cells}</svg>`;
}

function niceScale(max) {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
  for (const s of steps) {
    if (max / s <= 6) return { step: s, max: Math.ceil(max / s) * s };
  }
  return { step: 1000, max: Math.ceil(max / 1000) * 1000 };
}

function fmtShort(v) {
  const r = Math.round(v * 100) / 100;
  if (Math.abs(r) >= 1000 && Number.isInteger(r)) return r.toLocaleString('en-GB');
  return String(r);
}
