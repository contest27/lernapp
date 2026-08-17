// Treasure-map builder for the map screen: one tall hand-drawn SVG with every
// topic as a station on a winding dashed route, themed regions per strand run,
// fog over the future, and the treasure at the end.
//
// Ported from powermath-trainer @ 85699c4. Two changes: the tint table covers
// the Y6 strands, and the Watch signposts are gone (Lernapp ships no episodes).
//
// PURE by design: no core.js, no store, no go() — interactions arrive as
// callbacks, state is a read-only snapshot. Tests render it detached.

import { s } from './svg.js';
import { bandOf } from '../engine/mastery.js';

// Geometry (viewBox units). Everything below derives from these.
export const GEO = {
  W: 320,   // viewBox width (house convention, scales to card width)
  TOP: 44,  // cartouche band above the first region
  HDR: 40,  // region header (signpost) height
  STEP: 58, // vertical slot per station
  FIN: 150, // finale block (X, chest, flag)
};

// Meander table: x = 160 + OFF[i % 6]; never dead-centre, range 90..230.
const OFF = [-70, -25, 45, 70, 25, -45];

const PAPER = '#f7edd8';
const PAPER_EDGE = '#d9c39a';
const WATER = '#bfdbf7';
const WOOD = '#cfa878';
const WOOD_DARK = '#7c5a38';
const WOOD_INK = '#3f2d1d';
const LABEL_INK = '#4a3120';
const ROUTE = '#8b5e3c';
const ROUTE_DONE = '#6f4a2a';
const ACCENT = '#0369a1';

// One tint per Y6 strand (content/index.js STRANDS). Neighbouring regions must
// not share a colour, or two islands read as one.
export const TINTS = {
  place: '#ead9ae', fourops: '#ddd0c0', fractions: '#c9ddb8', position: '#cde4e0',
  decimals: '#d8d3e8', percentages: '#e6d3c8', algebra: '#d5dcee', measure: '#d9e6c3',
  ratio: '#e3dcc0', shapes: '#cfe3d4', problem: '#e0d6e8', stats: '#cfdff0',
};

const BAND_CLASS = { struggling: 'band-red', developing: 'band-amber', secure: 'band-green' };

// Contiguous strand runs along the (already ordered) topic list.
export function deriveRegions(topics) {
  const regions = [];
  for (const t of topics) {
    const last = regions[regions.length - 1];
    if (last && last.strand === t.strand) last.count += 1;
    else regions.push({ strand: t.strand, start: regions.length ? last.start + last.count : 0, count: 1 });
  }
  return regions;
}

export function regionTop(regions, r) {
  let y = GEO.TOP;
  for (let k = 0; k < r; k++) y += GEO.HDR + regions[k].count * GEO.STEP;
  return y;
}

function mapHeight(regions, topicCount) {
  return GEO.TOP + regions.length * GEO.HDR + topicCount * GEO.STEP + GEO.FIN;
}

function stationXY(regions, i) {
  let r = 0;
  while (i >= regions[r].start + regions[r].count) r++;
  const j = i - regions[r].start;
  return {
    x: 160 + OFF[i % 6],
    y: regionTop(regions, r) + GEO.HDR + (j + 0.5) * GEO.STEP,
    region: r,
  };
}

function txt(x, y, str, { size = 12, fill = LABEL_INK, weight = null, anchor = 'middle', cls = null, opacity = null } = {}) {
  return s('text', {
    x, y, 'text-anchor': anchor, 'font-size': size, fill,
    'font-weight': weight, class: cls, opacity,
  }, str);
}

// Cubic route with vertical tangents at every point (reads as a sea course).
function routeD(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    const dy = (b.y - a.y) * 0.45;
    d += ` C ${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`;
  }
  return d;
}

// Decorative land blob for a region band (rounded mass + two coves).
function landBlob(top, height, strand, ri) {
  const g = s('g', { class: 'tmap-land' });
  const tint = TINTS[strand] ?? '#e7dcc2';
  g.append(
    s('rect', { x: 22, y: top + 4, width: 276, height: height - 8, rx: 22, fill: tint, opacity: 0.38 }),
    s('ellipse', {
      cx: ri % 2 ? 36 : 284, cy: top + height * 0.35, rx: 26, ry: Math.min(30, height * 0.22),
      fill: tint, opacity: 0.38,
    }),
    s('ellipse', {
      cx: ri % 2 ? 282 : 38, cy: top + height * 0.72, rx: 22, ry: Math.min(24, height * 0.18),
      fill: tint, opacity: 0.3,
    }),
  );
  return g;
}

function signpost(regions, r, strands) {
  const top = regionTop(regions, r);
  const meta = strands[regions[r].strand] ?? { icon: '', title: regions[r].strand };
  return s('g', { class: 'tmap-sign' },
    s('rect', { x: 106, y: top + 32, width: 4, height: 8, fill: WOOD_DARK }),
    s('rect', { x: 210, y: top + 32, width: 4, height: 8, fill: WOOD_DARK }),
    s('rect', { x: 65, y: top + 6, width: 190, height: 26, rx: 6, fill: WOOD, stroke: WOOD_DARK, 'stroke-width': 2 }),
    txt(160, top + 23, `${meta.icon} ${meta.title}`, { size: 12, weight: 700, fill: WOOD_INK }),
    txt(34, top + 24, meta.icon, { size: 15, opacity: 0.5 }),
    txt(286, top + 24, meta.icon, { size: 15, opacity: 0.5 }),
  );
}

function wireButton(g, handler) {
  if (!handler) return;
  g.addEventListener('click', handler);
  g.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
  });
}

// nextTopicId: what the scheduler would actually hand out next. Since the
// journey interleaves strands for variety, that is not always the first
// uncompleted topic in book order — a topic the rotation stepped over is drawn
// as 'open' (startable, just not today's ⛵). Defaults to book order so callers
// that do not care (and the map tests) see the original behaviour.
export function buildTreasureMap({
  topics, strands, state, nextTopicId, onStation = null,
}) {
  const regions = deriveRegions(topics);
  const H = mapHeight(regions, topics.length);
  const nextId = nextTopicId === undefined
    ? (topics.find((t) => !state.completed.includes(t.id))?.id ?? null)
    : nextTopicId;
  const currentIdx = nextId ? topics.findIndex((t) => t.id === nextId) : -1;
  const allDone = currentIdx === -1;
  const doneCount = topics.filter((t) => state.completed.includes(t.id)).length;
  const xSpot = { x: 160, y: H - GEO.FIN + 52 };

  const svg = s('svg', {
    viewBox: `0 0 ${GEO.W} ${H}`,
    class: 'tmap',
    'aria-label': `My maths map: ${topics.length} topics`,
  });

  // ---- parchment, water, frame, cartouche
  svg.append(
    s('rect', { x: 0, y: 0, width: GEO.W, height: H, fill: PAPER }),
    s('rect', { x: 0, y: 0, width: 16, height: H, fill: WATER, opacity: 0.75 }),
    s('rect', { x: 304, y: 0, width: 16, height: H, fill: WATER, opacity: 0.75 }),
    s('rect', { x: 3, y: 3, width: GEO.W - 6, height: H - 6, rx: 8, fill: 'none', stroke: PAPER_EDGE, 'stroke-width': 2 }),
    s('rect', { x: 8, y: 8, width: GEO.W - 16, height: H - 16, rx: 6, fill: 'none', stroke: PAPER_EDGE, 'stroke-width': 1, opacity: 0.6 }),
    txt(150, 28, '⚓ Set sail!', { size: 13, weight: 800, fill: WOOD_DARK }),
    txt(296, 30, '🧭', { size: 15 }),
  );
  // little waves along the water edges
  for (let wy = 90; wy < H - 60; wy += 260) {
    for (const wx of [8, 296]) {
      svg.append(s('path', {
        d: `M ${wx} ${wy} q 4 -4 8 0 q 4 4 8 0`,
        fill: 'none', stroke: '#8fb8ea', 'stroke-width': 1.5, opacity: 0.7,
      }));
    }
  }

  // ---- region grounds (blobs only — signposts come AFTER the route so the
  // planks sit on top of the path instead of being crossed out by it)
  regions.forEach((run, r) => {
    const top = regionTop(regions, r);
    const height = GEO.HDR + run.count * GEO.STEP;
    svg.append(landBlob(top, height, run.strand, r));
  });

  // ---- route (underlay, dashed course, walked overlay)
  const points = topics.map((t, i) => stationXY(regions, i));
  const fullD = routeD([...points, xSpot]);
  svg.append(
    s('path', { d: fullD, fill: 'none', stroke: PAPER_EDGE, 'stroke-width': 10, opacity: 0.5, 'stroke-linecap': 'round', class: 'tmap-route-under' }),
    s('path', { d: fullD, fill: 'none', stroke: ROUTE, 'stroke-width': 5, opacity: 0.85, 'stroke-linecap': 'round', 'stroke-dasharray': '7 8', class: 'tmap-route' }),
  );
  const walkedPts = allDone ? [...points, xSpot] : points.slice(0, currentIdx + 1);
  if (walkedPts.length > 1) {
    svg.append(s('path', {
      d: routeD(walkedPts), fill: 'none', stroke: ROUTE_DONE, 'stroke-width': 5,
      'stroke-linecap': 'round', 'stroke-dasharray': '2 7', class: 'tmap-route-done',
    }));
  }

  // ---- signposts above the route
  regions.forEach((run, r) => svg.append(signpost(regions, r, strands)));

  // ---- stations
  let currentEl = null;
  topics.forEach((t, i) => {
    const { x, y } = points[i];
    const done = state.completed.includes(t.id);
    const status = done ? 'done'
      : i === currentIdx ? 'current'
      : (currentIdx !== -1 && i < currentIdx) ? 'open' // stepped over for variety, not locked
      : 'locked';
    const nStars = state.stars[t.id] ?? 0;
    const score = state.mastery[t.id]?.score;
    const band = done ? (score != null ? BAND_CLASS[bandOf(score)] : 'band-none') : '';
    const aria = status === 'done'
      ? `${t.shortTitle} — done, ${nStars} star${nStars === 1 ? '' : 's'}`
      : status === 'current' ? `${t.shortTitle} — your next adventure`
      : status === 'open' ? `${t.shortTitle} — ready when you are`
      : `${t.shortTitle} — locked`;

    const g = s('g', {
      class: `tmap-station ${status}${band ? ' ' + band : ''}`,
      'data-topic': t.id, role: 'button', tabindex: 0, 'aria-label': aria,
    });
    g.append(s('circle', { cx: x, cy: y, r: 17, class: 'tmap-hit' }));
    if (status === 'current') {
      g.append(s('circle', { cx: x, cy: y, r: 22, fill: 'none', stroke: ACCENT, 'stroke-width': 2, class: 'tmap-pulse' }));
    }
    const r = status === 'done' ? 15 : status === 'current' ? 18 : 13;
    const fill = status === 'done' ? '#f6c453' : status === 'current' ? '#fdf6e3' : '#efe3c8';
    g.append(s('circle', {
      cx: x, cy: y, r, fill, 'stroke-width': 3,
      class: 'tmap-node' + (status === 'current' ? ' tmap-current-pop' : ''),
    }));
    if (status === 'current') {
      g.append(txt(x, y + 6, '⛵', { size: 16, cls: 'tmap-marker' }));
    } else {
      g.append(txt(x, y + (status === 'done' ? 5 : 4), t.emoji, {
        size: status === 'done' ? 14 : 12, opacity: status === 'locked' ? 0.4 : null,
      }));
    }

    // Label block on the side away from the meander.
    const anchor = x < 160 ? 'start' : 'end';
    const lx = x < 160 ? x + 26 : x - 26;
    g.append(txt(lx, y + 4, t.shortTitle, { size: 11, weight: 700, anchor, cls: 'tmap-label' }));
    if (status === 'done') {
      const line = s('text', { x: lx, y: y + 16, 'text-anchor': anchor, 'font-size': 9, class: 'tmap-stars' });
      line.append(s('tspan', { fill: '#b45309' }, '★'.repeat(nStars)));
      line.append(s('tspan', { fill: '#d6c5a1' }, '☆'.repeat(Math.max(0, 3 - nStars))));
      g.append(line);
    }

    wireButton(g, onStation ? () => onStation(t, status) : null);
    if (status === 'current') currentEl = g;
    svg.append(g);

  });

  // ---- fog over everything after the current region (treasure stays visible)
  if (!allDone) {
    const curRegion = points[currentIdx].region;
    if (curRegion < regions.length - 1) {
      const fogTop = regionTop(regions, curRegion + 1);
      const fogH = (H - GEO.FIN) - fogTop;
      const fog = s('g', { class: 'tmap-fog', 'pointer-events': 'none', 'data-after-region': String(curRegion + 1) });
      let scallop = `M 16 ${fogTop}`;
      for (let sx = 16; sx < 304; sx += 36) scallop += ` q 18 -10 36 0`;
      fog.append(
        s('rect', { x: 16, y: fogTop, width: 288, height: fogH, fill: PAPER, opacity: 0.55 }),
        s('path', { d: scallop, fill: 'none', stroke: PAPER, 'stroke-width': 8, opacity: 0.55 }),
      );
      svg.append(fog);
    }
  }

  // ---- finale: X marks the spot, chest, goal flag
  const fy = H - GEO.FIN;
  const chest = s('g', { class: 'tmap-chest' + (allDone ? ' open' : '') },
    s('rect', { x: 138, y: fy + 78, width: 44, height: 28, rx: 4, fill: '#8a5a2b', stroke: WOOD_INK, 'stroke-width': 2 }),
    s('rect', { x: 156, y: fy + 78, width: 8, height: 28, fill: '#f6c453', stroke: WOOD_INK, 'stroke-width': 1 }),
    s('path', { d: `M 138 ${fy + 78} q 22 -16 44 0 Z`, fill: '#a06a33', stroke: WOOD_INK, 'stroke-width': 2, class: 'lid-closed' }),
    s('path', { d: `M 138 ${fy + 78} q 22 -30 44 -14 l -4 6 q -18 -12 -36 12 Z`, fill: '#a06a33', stroke: WOOD_INK, 'stroke-width': 2, class: 'lid-open' }),
    txt(160, fy + 70, '🪙✨', { size: 14, cls: 'chest-sparkle' }),
    s('circle', { cx: 160, cy: fy + 90, r: 3.5, fill: '#3f2d1d', class: 'chest-lock' }),
  );
  // Pirate ship at anchor in the treasure cove (decorative, gently bobbing).
  const sy = fy + 92;
  const ship = s('g', { class: 'tmap-ship' },
    s('ellipse', { cx: 82, cy: sy + 16, rx: 36, ry: 7, fill: WATER, opacity: 0.75 }),
    s('path', { d: `M 50 ${sy + 18} q 5 -4 10 0 q 5 4 10 0`, fill: 'none', stroke: '#8fb8ea', 'stroke-width': 1.5, opacity: 0.8 }),
    s('path', { d: `M 96 ${sy + 20} q 5 -4 10 0`, fill: 'none', stroke: '#8fb8ea', 'stroke-width': 1.5, opacity: 0.8 }),
    s('path', {
      d: `M 58 ${sy} L 63 ${sy + 13} Q 82 ${sy + 19} 101 ${sy + 13} L 106 ${sy} Q 82 ${sy + 5} 58 ${sy} Z`,
      fill: '#8a5a2b', stroke: WOOD_INK, 'stroke-width': 2,
    }),
    s('circle', { cx: 70, cy: sy + 7, r: 1.8, fill: WOOD_INK, opacity: 0.7 }),
    s('circle', { cx: 82, cy: sy + 8, r: 1.8, fill: WOOD_INK, opacity: 0.7 }),
    s('circle', { cx: 94, cy: sy + 7, r: 1.8, fill: WOOD_INK, opacity: 0.7 }),
    s('line', { x1: 82, y1: sy, x2: 82, y2: sy - 40, stroke: WOOD_DARK, 'stroke-width': 2.5 }),
    s('path', { d: `M 84 ${sy - 36} q 18 9 0 24 Z`, fill: '#fdf6e3', stroke: WOOD_DARK, 'stroke-width': 1.5 }),
    s('path', { d: `M 80 ${sy - 32} q -13 8 0 18 Z`, fill: '#fdf6e3', stroke: WOOD_DARK, 'stroke-width': 1.5 }),
    txt(90, sy - 38, '🏴‍☠️', { size: 11 }),
  );

  const finale = s('g', { class: 'tmap-finale' },
    ship,
    s('g', { class: 'tmap-x' },
      s('line', { x1: xSpot.x - 13, y1: xSpot.y - 13, x2: xSpot.x + 13, y2: xSpot.y + 13, stroke: '#b3402e', 'stroke-width': 6, 'stroke-linecap': 'round' }),
      s('line', { x1: xSpot.x - 13, y1: xSpot.y + 13, x2: xSpot.x + 13, y2: xSpot.y - 13, stroke: '#b3402e', 'stroke-width': 6, 'stroke-linecap': 'round' }),
    ),
    chest,
    s('line', { x1: 218, y1: fy + 25, x2: 218, y2: fy + 65, stroke: WOOD_DARK, 'stroke-width': 2.5 }),
    s('path', { d: `M 218 ${fy + 25} h 34 l -8 8 l 8 8 h -34 Z`, fill: '#e05d51', stroke: WOOD_INK, 'stroke-width': 1.5 }),
    txt(234, fy + 37, `${topics.length}/${topics.length}`, { size: 10, weight: 800, fill: '#fff' }),
    txt(160, fy + 128, allDone ? 'Treasure found! 🎉' : 'The treasure awaits…', { size: 12, weight: 700, fill: WOOD_DARK }),
  );
  svg.append(finale);

  return { svg, currentEl, finaleEl: finale, allDone, doneCount };
}
