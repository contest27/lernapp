// Where an Anthropic request actually goes.
//
// Two hosts, one client. On Cloudflare Pages the app posts to its own
// `/api/chat`, a Pages Function that attaches the key server-side (Facharzt-
// trainer's pattern, decided for this app 2026-08-16): nothing to type on the
// iPad, no key in localStorage, no key in a backup. On GitHub Pages there are
// no Functions, so the call falls back to the browser-direct path with the key
// the parent typed in.
//
// The probe is what makes the migration a non-event: the same build works on
// both hosts, so the app can move without a window where the tutor is dead.
//
// TRANSITIONAL. Once the app lives only on Cloudflare, delete `directPost`,
// the `apiKey` arguments, and the key field in the parent corner — and this
// file shrinks to one fetch.

const DIRECT_URL = 'https://api.anthropic.com/v1/messages';
const PROXY_URL = './api/chat';
const HEALTH_URL = './api/health';
const API_VERSION = '2023-06-01';

// Cached across calls: the answer cannot change within a page load, and the
// probe would otherwise cost a round trip on every single question.
let proxyAvailable = null;

// What the server says it holds, from ./api/health. null until the probe
// answers; every reader treats that as "available" (see aiReady).
let server = null;

export function resetProxyProbe() { proxyAvailable = null; server = null; }

// A Pages Function answers with JSON or an SSE stream. GitHub Pages answers a
// POST to a missing path with its 404 HTML page, and some static hosts answer
// 405. Either means "no proxy here".
function looksLikeProxy(res) {
  if (res.status === 404 || res.status === 405) return false;
  const type = res.headers.get('content-type') || '';
  return type.includes('json') || type.includes('event-stream');
}

async function proxyPost(body, signal) {
  return fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    signal,
  });
}

function directPost(body, apiKey, signal) {
  return fetch(DIRECT_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body,
    signal,
  });
}

// Post one Messages-API request and hand back the raw Response, so each caller
// keeps its own streaming and error handling.
//
// Throws only for transport-level failure (no connection, DNS, a content
// blocker) — exactly what a bare fetch throws, so callers' existing catch
// blocks keep working unchanged.
export async function postMessages(body, { apiKey = '', signal = null } = {}) {
  if (proxyAvailable !== false) {
    const res = await proxyPost(body, signal);
    if (looksLikeProxy(res)) {
      proxyAvailable = true;
      return res;
    }
    // Not a proxy after all: remember, and fall through to the direct call.
    proxyAvailable = false;
    if (!apiKey) return res; // no key to fall back on — let the caller report it
  }
  if (!apiKey) {
    // Same shape a missing-key failure had before the proxy existed.
    return new Response(JSON.stringify({ error: { message: 'No API key on this device and no server proxy.' } }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  return directPost(body, apiKey, signal);
}

// True when this build is talking to a server proxy — the parent corner uses it
// to explain whether a key is needed at all.
export function usingProxy() { return proxyAvailable === true; }

// ------------------------------------------------------------------ health
//
// Whether the AI features may be offered at all used to be answered with "is
// there a key on this device?" — which on the Cloudflare build is always no,
// because the key lives on the server. That single wrong question switched off
// the tutor, both dictionaries, the forge and the answer grader on the one
// host where they actually work. ./api/health answers the right one.

// Classify the health answer. Pure and exported for the tests: the three
// no-server cases are told apart because they need three different sentences
// in the parent corner.
export function readHealth({ ok, status, contentType = '', redirected = false, body = null }) {
  if (!ok || !contentType.includes('json')) {
    // Both no-server cases answer with HTML, so the HTML alone decides nothing.
    // GitHub Pages answers a missing path with its 404 page: the path is not
    // there. An expired Cloudflare Access session answers 200 (or a redirect)
    // with the login page: the path IS there and the app is simply signed out —
    // the watch-item from the Pages migration, where the keys are fine and the
    // only fix is signing in again in Safari.
    const signedOut = redirected || status === 302 || (ok && contentType.includes('html'));
    return { anthropic: false, gemini: false, reason: signedOut ? 'signed-out' : 'no-server' };
  }
  return { anthropic: !!body?.anthropic, gemini: !!body?.gemini, reason: 'ok' };
}

// One GET, once per page load. Never throws — a dead network is just another
// answer.
export async function probeServer() {
  if (server) return server;
  try {
    const res = await fetch(HEALTH_URL, { headers: { accept: 'application/json' } });
    let body = null;
    try { body = await res.json(); } catch { /* not JSON — readHealth decides */ }
    server = readHealth({
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      redirected: res.redirected,
      body,
    });
  } catch {
    server = { anthropic: false, gemini: false, reason: 'offline' };
  }

  // Feed the per-call probe: a confirmed server key means postMessages can skip
  // its own round trip, and a confirmed static host means it must not try. An
  // expired session or a dead network says nothing about the host, so the
  // per-call probe keeps its own counsel there.
  if (server.anthropic) proxyAvailable = true;
  else if (server.reason === 'no-server') proxyAvailable = false;

  return server;
}

// The probe's verdict, or null while it is still out.
export function serverStatus() { return server; }

// May the app offer an AI feature? A key typed on this device always counts;
// otherwise the server decides. An unfinished probe counts as YES on purpose:
// it resolves in milliseconds, and the failure mode we want is an honest error
// message, never a feature that quietly is not there.
export function aiReady(apiKey = '') {
  if (apiKey) return true;
  return server ? server.anthropic : true;
}

// Same question for Gemini speech-to-text (functions/api/stt.js). There is no
// device-key fallback here: the Gemini key was never a client-side option.
export function sttReady() {
  return server ? server.gemini : true;
}
