// The Worker in front of the app.
//
// Everything it does is hold two API keys the browser must never see:
//   POST /api/chat → Anthropic Messages API   (secret ANTHROPIC_API_KEY)
//   POST /api/stt  → Gemini transcription     (secret GEMINI_API_KEY)
// Anything else is a static file and goes to the assets binding untouched.
//
// Why a Worker and not Pages Functions: the Cloudflare project for this app is
// a Worker with static assets, and the `functions/` directory is a Pages-only
// convention (see wrangler.jsonc). Same proxies, one file.
//
// Deliberately no body validation: the shape of a request stays the client's
// business (app/js/qa/tutor.js, app/js/english/qa/claude.js, and the speech
// module to come), so client and worker can change independently.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Keep in sync with the client that posts to /api/stt.
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

// Pass the upstream response straight through, body and all. Anthropic answers
// a streaming request with SSE; returning `upstream.body` keeps it a stream, so
// the tutor still types its answer out live instead of arriving in one lump.
function passThrough(upstream) {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
    },
  });
}

async function proxy(request, { url, headers, key, missing, unreachable }) {
  if (!key) return json({ error: { message: missing } }, 503);
  if (request.method !== 'POST') return json({ error: { message: 'POST only.' } }, 405);

  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: await request.text(),
    });
  } catch {
    return json({ error: { message: unreachable } }, 502);
  }
  return passThrough(upstream);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/chat') {
      return proxy(request, {
        url: ANTHROPIC_URL,
        headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': ANTHROPIC_VERSION },
        key: env.ANTHROPIC_API_KEY,
        missing: 'The tutor is not set up on the server (secret ANTHROPIC_API_KEY is missing).',
        unreachable: 'Anthropic is unreachable right now.',
      });
    }

    if (pathname === '/api/stt') {
      return proxy(request, {
        url: GEMINI_URL,
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY },
        key: env.GEMINI_API_KEY,
        missing: 'Speech is not set up on the server (secret GEMINI_API_KEY is missing).',
        unreachable: 'Gemini is unreachable right now.',
      });
    }

    // Not an API route. `run_worker_first` in wrangler.jsonc only routes /api/*
    // here, so in practice this is the safety net rather than the hot path.
    return env.ASSETS.fetch(request);
  },
};
