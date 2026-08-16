// The hub's persistent state: ONE versioned localStorage key with a namespace
// per module, so maths and English can evolve without treading on each other.
//
// Layout:
//   shell    — what is shared: the child's name, the API key, the voice, and
//              the ONE streak ("a learning day", whichever module it was)
//   maths    — per-curriculum engine states (y6 now; y5 arrives via backup
//              import as pure review material)
//   english  — the Wordforge port (empty until phase B5)
//
// Each curriculum slice IS an engine state: the synced engine files
// (scheduler/progress/mastery) run on it unchanged. Two shared fields are
// aliased into the slice on every load (see hydrate) instead of being stored
// per-module — see the notes there.

import { dayKey } from '../engine/storage.js';

export { dayKey, addDays, daysBetween } from '../engine/storage.js';

const KEY = 'lernapp.state.v1';
const ATTEMPT_CAP = 4000;
const QA_CAP = 200;
const HISTORY_CAP = 400;
const GLOSS_CAP = 500;
const CHAT_CAP = 100;

// One curriculum's engine state — the same shape the Y5 trainer stored at top
// level, minus everything that moved into the shell.
export function curriculumState() {
  return {
    settings: { targetDate: null },  // pacing is per-curriculum (see engine/scheduler pacing())
    mastery: {},       // topicId -> { score, attempts, correct, lastSeen, due, box }
    stars: {},         // topicId -> 1..3
    completed: [],     // topicIds in completion order
    diagnosticDone: false,
    history: [],       // { day, kind, topicId, total, correct, minutes }
    attempts: [],      // { d, t, tier, ok }
    qaLog: [],         // { day, topicId, q, a, source }
    chats: [],         // buddy conversations { day, view, topicId, assisted, messages }
    glossCache: {},    // normalised English word -> German gloss from the tutor
    activeSession: null,
    focusSession: null,
    streak: null,      // ALIAS of shell.streak, restored by hydrate — never its own object
  };
}

export function defaultState() {
  const s = {
    version: 1,
    shell: {
      name: '',
      apiKey: '',
      voiceURI: null,
      rate: 0.95,
      streak: { count: 0, lastDay: null },
      lastExport: null,
    },
    maths: {
      active: 'y6',
      y6: curriculumState(),
    },
    english: null,
  };
  return hydrate(s);
}

export function curricula(state) {
  return Object.keys(state.maths).filter((k) => k !== 'active');
}

export function activeCurriculum(state) {
  return state.maths[state.maths.active];
}

// Restore the invariants a JSON round-trip cannot express:
//
// 1. Missing fields added after first release are filled in (top-level via
//    Object.assign; shell and each curriculum slice one level deep — the Y5
//    trainer's [LEARN:web]: a stored nested object wins wholesale and silently
//    drops new keys).
// 2. `slice.streak` is re-pointed at the SHELL streak. The engine's
//    finishSession updates state.streak in place, and the product decision is
//    one shared streak ("did he learn today?"), so every slice aliases the same
//    object. Serialising duplicates it into each slice; the copies are
//    identical (same object all runtime), and the shell's copy is the one that
//    wins here.
export function hydrate(s) {
  const base = {
    version: 1,
    shell: { name: '', apiKey: '', voiceURI: null, rate: 0.95, streak: { count: 0, lastDay: null }, lastExport: null },
    maths: { active: 'y6' },
    english: null,
  };
  const merged = Object.assign(base, s);
  merged.shell = Object.assign(base.shell, s.shell ?? {});
  merged.shell.streak = Object.assign({ count: 0, lastDay: null }, merged.shell.streak ?? {});
  if (!merged.maths || typeof merged.maths !== 'object') merged.maths = { active: 'y6' };
  if (!merged.maths.active) merged.maths.active = 'y6';
  const names = Object.keys(merged.maths).filter((k) => k !== 'active');
  if (!names.length) { merged.maths.y6 = curriculumState(); names.push('y6'); }
  for (const name of names) {
    const cur = Object.assign(curriculumState(), merged.maths[name]);
    cur.settings = Object.assign({ targetDate: null }, merged.maths[name]?.settings ?? {});
    cur.streak = merged.shell.streak; // the alias — one streak for the whole app
    merged.maths[name] = cur;
  }
  if (!names.includes(merged.maths.active)) merged.maths.active = names[0];
  return merged;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s || s.version !== 1) return defaultState();
    return hydrate(s);
  } catch {
    return defaultState();
  }
}

// Ring-buffer caps per curriculum, so years of state stay small.
export function capState(state) {
  for (const name of curricula(state)) {
    const c = state.maths[name];
    if (c.attempts.length > ATTEMPT_CAP) c.attempts = c.attempts.slice(-ATTEMPT_CAP);
    if (c.qaLog.length > QA_CAP) c.qaLog = c.qaLog.slice(-QA_CAP);
    if (c.history.length > HISTORY_CAP) c.history = c.history.slice(-HISTORY_CAP);
    if (c.chats.length > CHAT_CAP) c.chats = c.chats.slice(-CHAT_CAP);
    const words = Object.keys(c.glossCache ?? {});
    if (words.length > GLOSS_CAP) {
      for (const w of words.slice(0, words.length - GLOSS_CAP)) delete c.glossCache[w];
    }
  }
  return state;
}

export function save(state) {
  capState(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('save failed', e);
  }
}

export function exportJSON(state) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.shell.apiKey = ''; // backups must never contain the API key
  return JSON.stringify({ app: 'lernapp', exported: new Date().toISOString(), state: copy }, null, 1);
}

// Returns the imported state or throws with a readable message.
export function parseImport(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('Not a valid backup file (not JSON).'); }
  if (!obj || obj.app !== 'lernapp' || !obj.state || obj.state.version !== 1) {
    throw new Error('Not a Lernapp backup.');
  }
  return hydrate(obj.state);
}

// One-time import of a PowerMath-Trainer (Y5) backup: its whole engine state
// becomes the `y5` curriculum, whose completed topics the review scheduler then
// makes due exactly like Y6 ones (handoff §6, way 1). The Y5 shape had the
// shared fields at top level, so they are lifted into the shell only where the
// shell is still empty — an import must never wipe a name typed on this device.
export function importY5Backup(state, text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('Not a valid backup file (not JSON).'); }
  if (!obj || obj.app !== 'powermath-trainer' || !obj.state || obj.state.version !== 1) {
    throw new Error('Not a PowerMath Trainer backup.');
  }
  const y5 = obj.state;
  const cur = Object.assign(curriculumState(), {
    mastery: y5.mastery ?? {},
    stars: y5.stars ?? {},
    completed: y5.completed ?? [],
    diagnosticDone: y5.diagnosticDone ?? false,
    history: y5.history ?? [],
    attempts: y5.attempts ?? [],
    qaLog: y5.qaLog ?? [],
    glossCache: y5.glossCache ?? {},
  });
  cur.settings.targetDate = null; // the summer deadline does not come along
  cur.streak = state.shell.streak;
  state.maths.y5 = cur;
  if (!state.shell.name && y5.settings?.name) state.shell.name = y5.settings.name;
  if (state.shell.voiceURI == null && y5.settings?.voiceURI) state.shell.voiceURI = y5.settings.voiceURI;
  return state;
}

export function wipe() {
  localStorage.removeItem(KEY);
}
