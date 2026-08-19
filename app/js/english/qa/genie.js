// The literal genie: turns his English sentence into a scene descriptor.
//
// The whole pedagogical bet of this app lives here. An image model understands
// broken English perfectly well, so "make big robot cool explosion" would return
// something great and teach nothing. The genie instead renders EXACTLY what he
// wrote — no inference, no charity, no filling in of gaps. Vague English gets a
// vague world; precise English gets the scene that solves the quest. Failing is
// funny rather than shaming, which matters for a child who is behind and knows it.

import { callClaudeJSON, MODEL_GENIE, ClaudeError } from './claude.js';
import { normalise, tokenise } from '../engine/vocab.js';

// Single source of truth for the sprite vocabulary: the renderer draws from it,
// the validator checks against it, and the system prompt is generated from it —
// so adding a sprite cannot leave the prompt out of date.
export const BIOMES = ['forest', 'shore', 'cave', 'clearing', 'wreck'];
export const TIMES = ['dawn', 'day', 'dusk', 'night'];
export const WEATHER = ['clear', 'rain', 'snow', 'fog'];
export const ACTORS = ['robot', 'fox', 'goose', 'drone', 'deer', 'bear'];
export const ACTOR_STATES = ['standing', 'hiding', 'running', 'sitting', 'broken'];
export const PROPS = ['tree', 'rock', 'fire', 'bridge', 'antenna', 'crate', 'flower', 'nest'];
export const POSITIONS = ['left', 'centre', 'right'];
export const SIZES = ['small', 'medium', 'large'];
// Prepositions are the pedagogical heart: they are what EAL learners get wrong,
// and here they render literally and visibly.
export const RELATIONS = ['behind', 'in front of', 'under', 'on top of', 'next to', 'inside'];

export function emptyScene() {
  return { biome: 'clearing', time: 'day', weather: 'clear', actors: [], props: [], relations: [] };
}

export function systemPrompt(powerWords) {
  return [
    'You are the Wordforge genie. A 10-year-old boy (German first language, learning English)',
    'types an English sentence to change a scene in his game world. You turn it into a scene descriptor.',
    '',
    'THE ONE RULE: render EXACTLY what he wrote. Do not infer, do not embellish, do not be charitable.',
    'If he wrote "a robot and a tree", the scene has one robot and one tree — no forest, no sky drama,',
    'no mood. If he did not say where something is, it goes in the centre. If he did not say what it is',
    'doing, it is "standing". Vague English must produce a visibly bare scene. That is the whole point:',
    'he learns that precise words buy a richer world.',
    '',
    'Allowed values — use ONLY these, never invent new ones:',
    `  biome: ${BIOMES.join(' | ')}`,
    `  time: ${TIMES.join(' | ')}`,
    `  weather: ${WEATHER.join(' | ')}`,
    `  actors[].kind: ${ACTORS.join(' | ')}`,
    `  actors[].state: ${ACTOR_STATES.join(' | ')}`,
    `  props[].kind: ${PROPS.join(' | ')}`,
    `  pos: ${POSITIONS.join(' | ')}`,
    `  props[].size: ${SIZES.join(' | ')}`,
    `  relations[].rel: ${RELATIONS.join(' | ')}`,
    'If he asks for something outside this list, leave it out and mention it in the nudge.',
    'relations[].subject and .object must be the kind of an actor or prop that is actually in the scene.',
    '',
    `This chapter's power words: ${powerWords.join(', ')}.`,
    'usedPower lists the ones he used in a way that FITS THEIR MEANING. A word merely dropped in',
    '("the rusty is big") does not count. missing lists the rest.',
    '',
    'literal: true when his English was too thin to build a real scene — missing a verb, no detail,',
    'or so vague that the scene came out nearly empty. false when he gave you enough to work with.',
    '',
    'nudge: EXACTLY ONE short, warm sentence, in simple English, about ONE thing only. Never a list,',
    'never more than one correction, never scolding. Prefer showing the better phrasing over naming a',
    'grammar rule: "You said \'the robot go\' — try \'the robot went\'." If his sentence was good, use',
    'the nudge to praise one specific word choice instead. Never mention scores, levels or learning.',
    '',
    'reject: null almost always. Set it to a short reason string ONLY if the sentence is genuinely',
    'unsafe or inappropriate for a child. Silly, gross or violent-in-a-cartoon-way is FINE — he is ten',
    'and this is a game. Do not moralise.',
    '',
    'Reply with ONE JSON object and nothing else:',
    '{"scene":{"biome":...,"time":...,"weather":...,"actors":[{"kind":...,"pos":...,"state":...}],',
    '"props":[{"kind":...,"pos":...,"size":...}],"relations":[{"subject":...,"rel":...,"object":...}]},',
    '"usedPower":[],"missing":[],"literal":false,"nudge":"...","reject":null}',
  ].join('\n');
}

// Returns [] for a valid scene, otherwise readable problems. Runs on every genie
// reply before rendering: a hallucinated sprite name must degrade to a dropped
// element, never to a broken screen.
export function validateScene(scene) {
  const e = [];
  if (!scene || typeof scene !== 'object') return ['scene is not an object'];
  const inSet = (v, set, what) => { if (v != null && !set.includes(v)) e.push(`${what}: "${v}" is not allowed`); };

  inSet(scene.biome, BIOMES, 'biome');
  inSet(scene.time, TIMES, 'time');
  inSet(scene.weather, WEATHER, 'weather');

  for (const [i, a] of (scene.actors ?? []).entries()) {
    inSet(a?.kind, ACTORS, `actors[${i}].kind`);
    inSet(a?.pos, POSITIONS, `actors[${i}].pos`);
    inSet(a?.state, ACTOR_STATES, `actors[${i}].state`);
  }
  for (const [i, p] of (scene.props ?? []).entries()) {
    inSet(p?.kind, PROPS, `props[${i}].kind`);
    inSet(p?.pos, POSITIONS, `props[${i}].pos`);
    inSet(p?.size, SIZES, `props[${i}].size`);
  }
  const present = new Set([
    ...(scene.actors ?? []).map((a) => a?.kind),
    ...(scene.props ?? []).map((p) => p?.kind),
  ].filter(Boolean));
  for (const [i, r] of (scene.relations ?? []).entries()) {
    inSet(r?.rel, RELATIONS, `relations[${i}].rel`);
    if (r?.subject && !present.has(r.subject)) e.push(`relations[${i}]: subject "${r.subject}" is not in the scene`);
    if (r?.object && !present.has(r.object)) e.push(`relations[${i}]: object "${r.object}" is not in the scene`);
  }
  return e;
}

// Drop anything invalid rather than failing. A hallucinated sprite costs him one
// element of his scene; a thrown error would cost him the turn.
export function sanitiseScene(scene) {
  const s = { ...emptyScene(), ...(scene ?? {}) };
  const keep = (v, set, fallback) => (set.includes(v) ? v : fallback);
  s.biome = keep(s.biome, BIOMES, 'clearing');
  s.time = keep(s.time, TIMES, 'day');
  s.weather = keep(s.weather, WEATHER, 'clear');
  s.actors = (Array.isArray(s.actors) ? s.actors : [])
    .filter((a) => ACTORS.includes(a?.kind))
    .slice(0, 6)
    .map((a) => ({ kind: a.kind, pos: keep(a.pos, POSITIONS, 'centre'), state: keep(a.state, ACTOR_STATES, 'standing') }));
  s.props = (Array.isArray(s.props) ? s.props : [])
    .filter((p) => PROPS.includes(p?.kind))
    .slice(0, 8)
    .map((p) => ({ kind: p.kind, pos: keep(p.pos, POSITIONS, 'centre'), size: keep(p.size, SIZES, 'medium') }));
  const present = new Set([...s.actors.map((a) => a.kind), ...s.props.map((p) => p.kind)]);
  s.relations = (Array.isArray(s.relations) ? s.relations : [])
    .filter((r) => RELATIONS.includes(r?.rel) && present.has(r?.subject) && present.has(r?.object))
    .slice(0, 4)
    .map((r) => ({ subject: r.subject, rel: r.rel, object: r.object }));
  return s;
}

// Local check of power-word use, independent of the model's own usedPower. The
// model decides whether the use was MEANINGFUL; this decides whether the word is
// present at all, and the two are intersected — so a hallucinated "you used it!"
// cannot award credit for a word he never typed.
export function powerWordsPresent(prompt, powerWords) {
  const tokens = new Set(tokenise(prompt));
  return powerWords.filter((w) => {
    const n = normalise(w);
    return tokens.has(n) || [...tokens].some((t) => t.startsWith(n) && t.length - n.length <= 3);
  });
}

export async function judge({ prompt, chapter, apiKey }) {
  const power = chapter?.power ?? [];
  const raw = await callClaudeJSON({
    apiKey,
    model: MODEL_GENIE,
    maxTokens: 700,
    system: systemPrompt(power),
    messages: [{ role: 'user', content: String(prompt).slice(0, 500) }],
  });

  if (raw.reject) {
    return { scene: null, usedPower: [], missing: power, literal: false, nudge: null, reject: String(raw.reject) };
  }

  const present = powerWordsPresent(prompt, power);
  const claimed = Array.isArray(raw.usedPower) ? raw.usedPower.map(normalise) : [];
  const usedPower = present.filter((w) => claimed.includes(normalise(w)));

  return {
    scene: sanitiseScene(raw.scene),
    usedPower,
    missing: power.filter((w) => !usedPower.includes(w)),
    literal: !!raw.literal,
    nudge: typeof raw.nudge === 'string' ? raw.nudge.trim() : null,
    reject: null,
  };
}

export { ClaudeError };
