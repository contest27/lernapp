// Cloudflare Pages Function: proxy for Gemini transcription (speech to text).
//
// POST /api/stt → forwards a generateContent body (inline WAV + prompt) to
// Gemini and returns the JSON unchanged.
//
// Why Gemini rather than the device's dictation: dictation silently corrects
// what it hears to the nearest plausible word. In the Facharzttrainer that
// turned medical terms into nonsense; here it would do something worse — quietly
// repair a child's mispronunciation, so the one thing worth hearing disappears.
// The client's prompt therefore asks for a VERBATIM transcript.
//
// The key lives here as a Pages secret (GEMINI_API_KEY), never in the browser.
//
// Ported from the Facharzttrainer (functions/api/stt.js). Keep MODEL in sync
// with the client that calls it.

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function onRequestPost(context) {
  const key = context.env.GEMINI_API_KEY;
  if (!key) {
    return json({ error: { message: 'Speech is not set up on the server (secret GEMINI_API_KEY is missing).' } }, 503);
  }

  const body = await context.request.text();
  let upstream;
  try {
    upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body,
    });
  } catch {
    return json({ error: { message: 'Gemini is unreachable right now.' } }, 502);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
    },
  });
}
