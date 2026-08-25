// Cloudflare Pages Function: does this deployment hold the API keys?
//
// GET /api/health → { ok: true, anthropic: <bool>, gemini: <bool> }
//
// Booleans only — never the key, never its length, never a prefix. The client
// needs exactly one bit per service: may I offer this feature?
//
// Why it exists: the client used to decide that from the key typed into the
// device, which on this host is always empty because the key lives here. That
// switched off the tutor, both dictionaries and the answer grader on the only
// host where they work (app/js/qa/endpoint.js). This endpoint is also how the
// app tells "no server" (GitHub Pages 404) from "signed out" (an expired
// Cloudflare Access session answers with the login page).
//
// Answers on GET so the reply is cheap and the intent is plain; the service
// worker is told never to cache anything under /api/ (app/sw.js).

export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    ok: true,
    anthropic: !!context.env.ANTHROPIC_API_KEY,
    gemini: !!context.env.GEMINI_API_KEY,
  }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
