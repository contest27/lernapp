// Renderer for world scenes. Same shape as PowerMath's ui/watch-scenes.js:
// builds real DOM SVGs, imports only ui/svg.js, renders fine on a detached DOM
// (the tests rely on that), and marks elements with entry classes that CSS
// carries to their final state once .run lands on the root.
//
// The relations pass is the point of the whole module. "behind" really draws
// the subject further back and smaller; "under" really puts it lower. He said a
// preposition and the world obeyed it — that mapping is exactly what a
// diffusion model blurs, and exactly what an EAL learner gets wrong.

import { s, di } from '../../ui/svg.js'; // shared shell svg helpers, not an English-owned copy

const VIEW = '0 0 320 240';
const GROUND = 186;
const SLOT = { left: 72, centre: 160, right: 248 };
const SCALE = { small: 0.72, medium: 1, large: 1.42 };

const INK = '#0f172a';
const STROKE = '#334155';

const SKY = {
  dawn: ['#fed7aa', '#fef3c7'],
  day: ['#7dd3fc', '#e0f2fe'],
  dusk: ['#c4b5fd', '#fbcfe8'],
  night: ['#1e293b', '#334155'],
};
const GROUND_FILL = {
  forest: '#4d7c0f', shore: '#fde68a', cave: '#44403c',
  clearing: '#86efac', wreck: '#78716c',
};

// ---------------------------------------------------------------- sprites
// Every sprite draws inside a nominal 40 x 40 box whose baseline is y = 40,
// so placement only ever has to translate and scale.

function robot() {
  return s('g', {},
    s('rect', { x: 12, y: 14, width: 16, height: 18, rx: 3, fill: '#a8a29e', stroke: STROKE, 'stroke-width': 1.4 }),
    s('rect', { x: 14, y: 22, width: 12, height: 6, fill: '#c2410c', opacity: 0.55 }), // rust
    s('rect', { x: 14, y: 6, width: 12, height: 10, rx: 2, fill: '#d6d3d1', stroke: STROKE, 'stroke-width': 1.4 }),
    s('circle', { cx: 18, cy: 11, r: 1.7, fill: '#0ea5e9' }),
    s('circle', { cx: 23, cy: 11, r: 1.7, fill: '#0ea5e9' }),
    s('line', { x1: 20, y1: 6, x2: 20, y2: 2, stroke: STROKE, 'stroke-width': 1.2 }),
    s('circle', { cx: 20, cy: 1.6, r: 1.4, fill: '#ef4444' }),
    s('line', { x1: 12, y1: 20, x2: 7, y2: 26, stroke: STROKE, 'stroke-width': 2, 'stroke-linecap': 'round' }),
    s('line', { x1: 28, y1: 20, x2: 33, y2: 26, stroke: STROKE, 'stroke-width': 2, 'stroke-linecap': 'round' }),
    s('line', { x1: 17, y1: 32, x2: 17, y2: 40, stroke: STROKE, 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
    s('line', { x1: 23, y1: 32, x2: 23, y2: 40, stroke: STROKE, 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
}

function quadruped(body, ear, tail) {
  return s('g', {},
    s('ellipse', { cx: 20, cy: 26, rx: 12, ry: 7, fill: body, stroke: STROKE, 'stroke-width': 1.3 }),
    s('circle', { cx: 30, cy: 18, r: 6, fill: body, stroke: STROKE, 'stroke-width': 1.3 }),
    s('path', { d: `M28 13 L${ear} 6 L33 13 Z`, fill: body, stroke: STROKE, 'stroke-width': 1.1 }),
    s('circle', { cx: 32, cy: 17, r: 1.2, fill: INK }),
    s('path', { d: tail, fill: 'none', stroke: body, 'stroke-width': 3.4, 'stroke-linecap': 'round' }),
    ...[13, 19, 24, 29].map((x) =>
      s('line', { x1: x, y1: 31, x2: x, y2: 40, stroke: STROKE, 'stroke-width': 1.8, 'stroke-linecap': 'round' })));
}

const SPRITES = {
  robot,
  fox: () => quadruped('#fb923c', 26, 'M8 24 Q1 20 4 12'),
  deer: () => s('g', {},
    quadruped('#b45309', 26, 'M9 23 Q5 21 6 17'),
    s('path', { d: 'M27 11 L25 4 M27 11 L31 5 M31 5 L34 3', fill: 'none', stroke: '#78350f', 'stroke-width': 1.5, 'stroke-linecap': 'round' })),
  bear: () => s('g', {},
    s('ellipse', { cx: 20, cy: 26, rx: 14, ry: 9, fill: '#57534e', stroke: STROKE, 'stroke-width': 1.3 }),
    s('circle', { cx: 30, cy: 16, r: 7, fill: '#57534e', stroke: STROKE, 'stroke-width': 1.3 }),
    s('circle', { cx: 27, cy: 10, r: 2.4, fill: '#57534e', stroke: STROKE, 'stroke-width': 1 }),
    s('circle', { cx: 34, cy: 11, r: 2.4, fill: '#57534e', stroke: STROKE, 'stroke-width': 1 }),
    s('circle', { cx: 32, cy: 16, r: 1.3, fill: INK }),
    ...[12, 20, 28].map((x) => s('line', { x1: x, y1: 33, x2: x, y2: 40, stroke: STROKE, 'stroke-width': 2.4, 'stroke-linecap': 'round' }))),
  goose: () => s('g', {},
    s('ellipse', { cx: 18, cy: 28, rx: 11, ry: 7, fill: '#f8fafc', stroke: STROKE, 'stroke-width': 1.3 }),
    s('path', { d: 'M25 24 Q28 14 26 9', fill: 'none', stroke: '#f8fafc', 'stroke-width': 5, 'stroke-linecap': 'round' }),
    s('path', { d: 'M25 24 Q28 14 26 9', fill: 'none', stroke: STROKE, 'stroke-width': 1.1 }),
    s('circle', { cx: 26, cy: 8, r: 4, fill: '#f8fafc', stroke: STROKE, 'stroke-width': 1.2 }),
    s('path', { d: 'M30 8 L35 10 L30 11 Z', fill: '#f97316', stroke: STROKE, 'stroke-width': 0.8 }),
    s('circle', { cx: 27, cy: 7, r: 1, fill: INK }),
    s('line', { x1: 16, y1: 34, x2: 16, y2: 40, stroke: '#f97316', 'stroke-width': 1.8 }),
    s('line', { x1: 21, y1: 34, x2: 21, y2: 40, stroke: '#f97316', 'stroke-width': 1.8 })),
  drone: () => s('g', {},
    s('rect', { x: 13, y: 18, width: 14, height: 8, rx: 2.5, fill: '#334155', stroke: INK, 'stroke-width': 1.2 }),
    s('circle', { cx: 20, cy: 22, r: 2.2, fill: '#ef4444' }),
    ...[[8, 14], [32, 14]].map(([x, y]) => s('g', {},
      s('line', { x1: 20, y1: 21, x2: x, y2: y, stroke: '#334155', 'stroke-width': 1.6 }),
      s('ellipse', { cx: x, cy: y, rx: 7, ry: 1.6, fill: '#64748b', opacity: 0.85 }))),
    s('line', { x1: 16, y1: 26, x2: 15, y2: 30, stroke: '#334155', 'stroke-width': 1.4 }),
    s('line', { x1: 24, y1: 26, x2: 25, y2: 30, stroke: '#334155', 'stroke-width': 1.4 })),
  tree: () => s('g', {},
    s('rect', { x: 17, y: 26, width: 6, height: 14, fill: '#78350f', stroke: STROKE, 'stroke-width': 1 }),
    s('path', { d: 'M20 2 L31 17 L9 17 Z', fill: '#166534', stroke: STROKE, 'stroke-width': 1.1 }),
    s('path', { d: 'M20 11 L33 28 L7 28 Z', fill: '#15803d', stroke: STROKE, 'stroke-width': 1.1 })),
  rock: () => s('path', { d: 'M6 40 L11 24 L21 19 L32 26 L34 40 Z', fill: '#94a3b8', stroke: STROKE, 'stroke-width': 1.3 }),
  fire: () => s('g', {},
    s('path', { d: 'M20 40 Q8 32 14 20 Q16 26 20 24 Q24 14 26 8 Q34 22 30 32 Q28 38 20 40 Z', fill: '#f97316' }),
    s('path', { d: 'M20 40 Q14 34 18 26 Q20 30 22 27 Q26 32 24 36 Z', fill: '#fde047' })),
  bridge: () => s('g', {},
    s('rect', { x: 2, y: 26, width: 36, height: 5, fill: '#a16207', stroke: STROKE, 'stroke-width': 1 }),
    ...[6, 13, 20, 27, 34].map((x) => s('line', { x1: x, y1: 26, x2: x, y2: 31, stroke: STROKE, 'stroke-width': 0.9 })),
    s('line', { x1: 5, y1: 31, x2: 5, y2: 40, stroke: '#78350f', 'stroke-width': 2.4 }),
    s('line', { x1: 35, y1: 31, x2: 35, y2: 40, stroke: '#78350f', 'stroke-width': 2.4 })),
  antenna: () => s('g', {},
    s('line', { x1: 20, y1: 40, x2: 20, y2: 12, stroke: '#64748b', 'stroke-width': 2.4 }),
    s('path', { d: 'M12 14 Q20 2 28 14 Z', fill: '#cbd5e1', stroke: STROKE, 'stroke-width': 1.2 }),
    s('line', { x1: 12, y1: 34, x2: 28, y2: 34, stroke: '#64748b', 'stroke-width': 1.4 })),
  crate: () => s('g', {},
    s('rect', { x: 8, y: 22, width: 24, height: 18, fill: '#ca8a04', stroke: STROKE, 'stroke-width': 1.3 }),
    s('path', { d: 'M8 22 L32 40 M32 22 L8 40', stroke: STROKE, 'stroke-width': 1.1 })),
  flower: () => s('g', {},
    s('line', { x1: 20, y1: 40, x2: 20, y2: 24, stroke: '#15803d', 'stroke-width': 1.6 }),
    ...[0, 72, 144, 216, 288].map((a) => s('ellipse', {
      cx: 20, cy: 18, rx: 3, ry: 6, fill: '#f472b6', stroke: STROKE, 'stroke-width': 0.7,
      transform: `rotate(${a} 20 24)`,
    })),
    s('circle', { cx: 20, cy: 24, r: 2.6, fill: '#fde047' })),
  nest: () => s('g', {},
    s('path', { d: 'M6 40 Q6 26 20 26 Q34 26 34 40 Z', fill: '#a16207', stroke: STROKE, 'stroke-width': 1.2 }),
    s('ellipse', { cx: 15, cy: 30, rx: 4, ry: 3, fill: '#fef3c7', stroke: STROKE, 'stroke-width': 0.8 }),
    s('ellipse', { cx: 24, cy: 30, rx: 4, ry: 3, fill: '#fef3c7', stroke: STROKE, 'stroke-width': 0.8 })),
};

// state modifiers: how an actor's own posture changes its transform
const STATE_TX = {
  standing: {},
  sitting: { dy: 6, sy: 0.82 },
  running: { rot: -8, dx: 4 },
  hiding: { sy: 0.6, dy: 14, opacity: 0.9 },
  broken: { rot: 78, dy: 12 },
};

// ---------------------------------------------------------------- layout
// Every element becomes { key, kind, x, y, scale, z, state }. Relations then
// move the SUBJECT relative to the OBJECT, which is why they run after the
// base slots are assigned and why z is adjusted rather than the draw order
// being rewritten.

export function layout(scene) {
  const items = [];
  const spread = (list, isActor) => {
    const byPos = { left: [], centre: [], right: [] };
    for (const it of list) (byPos[it.pos] ?? byPos.centre).push(it);
    for (const [pos, group] of Object.entries(byPos)) {
      group.forEach((it, i) => {
        // Fan multiple items sharing a slot apart so nothing hides behind
        // something else purely by accident of ordering.
        const off = (i - (group.length - 1) / 2) * 34;
        items.push({
          key: `${it.kind}-${pos}-${i}`,
          kind: it.kind,
          x: SLOT[pos] + off,
          y: GROUND,
          scale: isActor ? 1 : SCALE[it.size] ?? 1,
          z: isActor ? 20 : 10,
          state: isActor ? it.state : null,
        });
      });
    }
  };
  spread(scene.props ?? [], false);
  spread(scene.actors ?? [], true);

  const find = (kind) => items.find((it) => it.kind === kind);
  for (const r of scene.relations ?? []) {
    const a = find(r.subject), b = find(r.object);
    if (!a || !b || a === b) continue;
    if (r.rel === 'behind') { a.x = b.x - 16; a.y = b.y - 16; a.scale *= 0.8; a.z = b.z - 5; }
    if (r.rel === 'in front of') { a.x = b.x + 12; a.y = b.y + 10; a.scale *= 1.12; a.z = b.z + 5; }
    if (r.rel === 'under') { a.x = b.x; a.y = b.y + 6; a.scale *= 0.85; a.z = b.z + 1; }
    if (r.rel === 'on top of') { a.x = b.x; a.y = b.y - 40 * b.scale; a.scale *= 0.8; a.z = b.z + 1; }
    // Place "next to" on whichever side has more room, so the subject does not
    // get pushed off the canvas by an object that is already near an edge.
    if (r.rel === 'next to') {
      a.x = b.x + (b.x > 160 ? -1 : 1) * 42 * b.scale;
      a.y = b.y;
      a.z = b.z;
    }
    if (r.rel === 'inside') { a.x = b.x; a.y = b.y - 6; a.scale *= 0.55; a.z = b.z + 1; }
  }

  // Nothing may hang off the edge. A half-visible sprite reads as a rendering
  // fault, and for a relation it actively defeats the point — he said "next to"
  // and must be able to SEE next to.
  for (const it of items) {
    const half = 20 * it.scale;
    it.x = Math.max(half + 4, Math.min(320 - half - 4, it.x));
  }
  return items.sort((p, q) => p.z - q.z);
}

// ---------------------------------------------------------------- render
function sky(scene) {
  const [top, bottom] = SKY[scene.time] ?? SKY.day;
  const id = 'sky-' + scene.time;
  return [
    s('defs', {}, s('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: '0%', 'stop-color': top }),
      s('stop', { offset: '100%', 'stop-color': bottom }))),
    s('rect', { x: 0, y: 0, width: 320, height: GROUND, fill: `url(#${id})` }),
  ];
}

function stars(scene) {
  if (scene.time !== 'night') return [];
  const pts = [[30, 26], [72, 44], [118, 20], [166, 52], [214, 30], [258, 60], [292, 38], [190, 14]];
  return pts.map(([cx, cy], i) => di(s('circle', { cx, cy, r: 1.4, fill: '#fef9c3', class: 'a-fade' }), i));
}

function ground(scene) {
  return s('rect', {
    x: 0, y: GROUND, width: 320, height: 240 - GROUND,
    fill: GROUND_FILL[scene.biome] ?? GROUND_FILL.clearing,
  });
}

// Biome furniture: the backdrop that makes a bare scene still read as a place.
function backdrop(scene) {
  const g = [];
  if (scene.biome === 'forest') {
    for (const [x, sc] of [[16, 0.8], [60, 0.6], [270, 0.75], [305, 0.55]]) {
      g.push(place(SPRITES.tree(), x, GROUND, sc, 0.45));
    }
  }
  if (scene.biome === 'shore') {
    g.push(s('path', { d: `M0 ${GROUND} Q80 ${GROUND - 12} 160 ${GROUND} T320 ${GROUND}`, fill: '#38bdf8', opacity: 0.5 }));
  }
  if (scene.biome === 'cave') {
    g.push(s('path', { d: 'M0 0 L0 90 Q60 40 110 74 Q170 20 220 70 Q280 34 320 86 L320 0 Z', fill: '#1c1917' }));
  }
  if (scene.biome === 'wreck') {
    g.push(s('path', { d: `M210 ${GROUND} L232 128 L292 138 L300 ${GROUND} Z`, fill: '#57534e', stroke: STROKE, 'stroke-width': 1.4, opacity: 0.9 }));
    g.push(s('circle', { cx: 258, cy: 152, r: 7, fill: '#0ea5e9', opacity: 0.6 }));
  }
  return g;
}

function weather(scene) {
  if (scene.weather === 'rain') {
    return Array.from({ length: 26 }, (_, i) => s('line', {
      x1: (i * 13) % 320, y1: (i * 29) % 170, x2: ((i * 13) % 320) - 4, y2: ((i * 29) % 170) + 12,
      stroke: '#bae6fd', 'stroke-width': 1.2, opacity: 0.75,
    }));
  }
  if (scene.weather === 'snow') {
    return Array.from({ length: 30 }, (_, i) => s('circle', {
      cx: (i * 23) % 320, cy: (i * 37) % 175, r: 1.8, fill: '#fff', opacity: 0.85,
    }));
  }
  if (scene.weather === 'fog') {
    return [80, 130, 165].map((y, i) => s('ellipse', {
      cx: 160 + (i % 2 ? 40 : -40), cy: y, rx: 200, ry: 16, fill: '#e2e8f0', opacity: 0.45,
    }));
  }
  return [];
}

// Sprites are authored in a 40x40 box with the baseline at y=40.
//
// TWO nested groups on purpose. The outer one carries the placement transform as
// an SVG attribute; the inner one carries the entry-animation class. They must
// never be the same element: a CSS `transform` beats an SVG presentation
// attribute, so animating the placed group would have every sprite settle at
// `transform: none` — collapsed into the top-left corner at scale 1. The test
// suite pins the separation structurally.
function place(node, x, y, scale, opacity = 1, rot = 0) {
  const inner = s('g', {}, node);
  return s('g', {
    transform: `translate(${x - 20 * scale} ${y - 40 * scale}) scale(${scale})`
      + (rot ? ` rotate(${rot} 20 40)` : ''),
    opacity: opacity === 1 ? null : opacity,
  }, inner);
}

function drawItem(it, i) {
  const build = SPRITES[it.kind];
  if (!build) return null;
  const st = STATE_TX[it.state] ?? {};
  const g = place(
    build(),
    it.x + (st.dx ?? 0),
    it.y + (st.dy ?? 0),
    it.scale * (st.sy ?? 1),
    st.opacity ?? 1,
    st.rot ?? 0,
  );
  const inner = g.firstChild;
  inner.classList.add('a-rise');
  di(inner, i);
  return g;
}

// The caption is the teaching signal made explicit: he said a preposition and
// the picture obeyed it. Kept to the game's voice — never a correction.
function caption(scene) {
  const rels = (scene.relations ?? []).map((r) => `${r.subject} ${r.rel} ${r.object}`);
  if (!rels.length) return [];
  return [s('text', {
    x: 160, y: 232, 'text-anchor': 'middle', 'font-size': 11, fill: '#f8fafc',
    'font-style': 'italic', class: 'a-fade',
  }, rels.join('  ·  '))];
}

export function renderScene(scene) {
  const root = s('svg', { viewBox: VIEW, class: 'scene', role: 'img' });
  root.append(...sky(scene), ...stars(scene), ground(scene), ...backdrop(scene));
  layout(scene).forEach((it, i) => { const n = drawItem(it, i); if (n) root.append(n); });
  root.append(...weather(scene), ...caption(scene));
  return root;
}

// Force a reflow, then let CSS carry every marked element to its final state.
export function mountScene(host, scene) {
  const svg = renderScene(scene);
  host.replaceChildren(svg);
  void svg.getBoundingClientRect();
  svg.classList.add('run');
  return svg;
}

export const SPRITE_KINDS = Object.keys(SPRITES);
