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
const API_VERSION = '2023-06-01';

// Cached across calls: the answer cannot change within a page load, and the
// probe would otherwise cost a round trip on every single question.
let proxyAvailable = null;

export function resetProxyProbe() { proxyAvailable = null; }

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
