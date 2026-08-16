// Synced from powermath-trainer @ 85699c4. Fixes belong upstream first.
// All persistent state lives in one versioned localStorage key.
// Size stays small (~200 KB over a summer): attempts and logs are capped ring buffers.

const KEY = 'pmtrainer.state.v1';
const ATTEMPT_CAP = 4000;
const QA_CAP = 200;
const HISTORY_CAP = 400;
export const CHAT_CAP = 100;
export const GLOSS_CAP = 500;

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dayKey(dt);
}

export function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da)) / 86400000);
}

export function defaultState() {
  return {
    version: 1,
    // targetDate: finish the 32-topic journey by this day (drives catch-up
    // pacing); parent-editable, clear to switch pacing off.
    settings: { name: '', voiceURI: null, rate: 0.95, apiKey: '', targetDate: '2026-08-16' },
    streak: { count: 0, lastDay: null },
    mastery: {},      // topicId -> { score, attempts, correct, lastSeen, due, box }
    stars: {},        // topicId -> 1..3
    completed: [],    // topicIds in completion order
    diagnosticDone: false,
    history: [],      // { day, kind, topicId, total, correct, minutes }
    attempts: [],     // { d, t, tier, ok }
    qaLog: [],        // { day, topicId, q, a, source }
    chats: [],        // buddy conversations { day, view, topicId, assisted, messages:[{role,content}] }
    glossCache: {},   // normalised English word -> German gloss fetched from the tutor

    watched: {},      // episodeId -> { completedAt, lastStep } (Watch episodes)
    lastExport: null,
    activeSession: null, // serialized daily lesson so a closed tab resumes
    focusSession: null,  // map-launched focused practice (bonus; cleared at boot)
  };
}

// Fill any fields added after first release. Top-level assign alone would drop
// NEW settings keys for existing states (the stored settings object wins), so
// settings merges one level deep. Exported for tests.
export function hydrate(s) {
  const base = defaultState();
  const merged = Object.assign(base, s);
  merged.settings = Object.assign(defaultState().settings, s.settings ?? {});
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

// Trim the ring-buffered fields so one summer's state stays small. Extracted
// so it is unit-testable without touching localStorage.
export function capState(state) {
  if (state.attempts.length > ATTEMPT_CAP) state.attempts = state.attempts.slice(-ATTEMPT_CAP);
  if (state.qaLog.length > QA_CAP) state.qaLog = state.qaLog.slice(-QA_CAP);
  if (state.history.length > HISTORY_CAP) state.history = state.history.slice(-HISTORY_CAP);
  if (state.chats.length > CHAT_CAP) state.chats = state.chats.slice(-CHAT_CAP);
  // Object key order is insertion order for string keys, so dropping the first
  // entries drops the words looked up longest ago.
  const words = Object.keys(state.glossCache ?? {});
  if (words.length > GLOSS_CAP) {
    for (const w of words.slice(0, words.length - GLOSS_CAP)) delete state.glossCache[w];
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
  copy.settings.apiKey = ''; // backups must never contain the API key
  return JSON.stringify({ app: 'powermath-trainer', exported: new Date().toISOString(), state: copy }, null, 1);
}

// Returns the imported state or throws with a readable message.
export function parseImport(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('Not a valid backup file (not JSON).'); }
  if (!obj || obj.app !== 'powermath-trainer' || !obj.state || obj.state.version !== 1) {
    throw new Error('Not a PowerMath Trainer backup.');
  }
  return hydrate(obj.state);
}

export function wipe() {
  localStorage.removeItem(KEY);
}
