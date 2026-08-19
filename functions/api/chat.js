// Cloudflare Pages Function: proxy for the Anthropic Messages API.
//
// POST /api/chat → forwards the body unchanged to Anthropic and returns the
// response unchanged (an SSE stream on success, JSON on error).
//
// The key lives here as a Pages secret (Settings → Environment variables →
// ANTHROPIC_API_KEY), never in the browser. That is the whole point of moving
// this app off GitHub Pages: a child's iPad should not hold an API key, and a
// parent should not have to type one.
//
// Deliberately without body validation: the shape of the request stays the
// client's business (app/js/qa/tutor.js and app/js/english/qa/claude.js), so
// client and function can change independently.
//
// Ported from the Facharzttrainer, which has run this pattern since 2026-07-31.

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function onRequestPost(context) {
  const key = context.env.ANTHROPIC_API_KEY;
  if (!key) {
    return json({ error: { message: 'The tutor is not set up on the server (secret ANTHROPIC_API_KEY is missing).' } }, 503);
  }

  const body = await context.request.text();
  let upstream;
  try {
    upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': API_VERSION,
      },
      body,
    });
  } catch {
    return json({ error: { message: 'Anthropic is unreachable right now.' } }, 502);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
    },
  });
}
