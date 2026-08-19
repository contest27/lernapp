// Precaching service worker. Bump CACHE_VERSION on every deploy so clients
// pick up new content; old caches are cleared on activate.

const CACHE_VERSION = 'lernapp-v8';

// English (Wordforge) chapter narration MP3s live in their own long-lived
// cache that SURVIVES CACHE_VERSION bumps: they are addressed by chapter
// folder and never change under the same path. Do NOT add this to the
// activate delete list, and do NOT precache MP3s — a chapter's audio is
// several hundred KB and only the chapters he actually reaches are worth
// storing. Ported from Wordforge's own sw.js MEDIA_CACHE pattern.
const MEDIA_CACHE = 'lernapp-media-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/engine/rng.js',
  './js/engine/storage.js',
  './js/engine/mastery.js',
  './js/engine/scheduler.js',
  './js/engine/check.js',
  './js/engine/progress.js',
  './js/shell/storage.js',
  './js/shell/core.js',
  './js/shell/rhythm.js',
  './js/ui/home.js',
  './js/ui/parent.js',
  './js/ui/today.js',
  './js/ui/map.js',
  './js/ui/map-scene.js',
  './js/ui/svg.js',
  './js/ui/session.js',
  './js/ui/lesson.js',
  './js/ui/focus.js',
  './js/ui/components.js',
  './js/ui/chat.js',
  './js/ui/buddy.js',
  './js/ui/gloss.js',
  './js/ui/explain.js',
  './js/qa/tutor.js',
  './js/tts.js',
  './js/maths/content/gen.js',
  './js/maths/content/vis.js',
  './js/maths/content/glossary.js',
  './js/maths/content/index.js',
  './js/maths/content/y6a.js',
  './js/maths/content/y6a-u3u6.js',
  './js/maths/content/y6a-frac.js',
  './js/maths/content/diagnostic.js',
  './js/english/engine/level.js',
  './js/english/engine/story.js',
  './js/english/engine/vocab.js',
  './js/english/content/story-index.js',
  './js/english/qa/claude.js',
  './js/english/qa/genie.js',
  './js/english/qa/gloss.js',
  './js/english/qa/talk.js',
  './js/english/ui/home.js',
  './js/english/ui/read.js',
  './js/english/ui/talk.js',
  './js/english/ui/create.js',
  './js/english/ui/parent-section.js',
  './js/english/ui/speech.js',
  './js/english/ui/audio.js',
  './js/english/ui/world-scenes.js',
  './data/story/signal/signal-01.json',
  './data/story/signal/signal-02.json',
  './data/story/signal/signal-03.json',
  './data/story/signal/signal-04.json',
  './data/story/signal/signal-05.json',
  './data/story/signal/signal-06.json',
  './data/story/signal/signal-07.json',
  './data/story/signal/signal-08.json',
  './data/story/signal/signal-09.json',
  './data/story/signal/signal-10.json',
  './data/story/signal/signal-11.json',
  './data/story/signal/signal-12.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION && k !== MEDIA_CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// Fetch strategy mirrors the Y5 trainer's proven handler: navigations are
// network-first (so a deploy actually arrives), everything else cache-first
// with a background refresh into the versioned cache.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // API calls etc. go straight to the network

  if (e.request.mode === 'navigate') {
    const isShell = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (isShell && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match(isShell ? './index.html' : e.request)
          .then((hit) => hit || caches.match('./index.html'))),
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          // Never cache redirected or partial (206/Range) responses — the Cache
          // API rejects 206, and a redirect target must not shadow an app path.
          // MP3s (English chapter narration) go to the long-lived media cache
          // so they survive a CACHE_VERSION bump instead of being precached.
          const isRange = e.request.headers.has('range') || res.status === 206;
          if (res.ok && res.status === 200 && !res.redirected && !isRange) {
            const copy = res.clone();
            const target = url.pathname.endsWith('.mp3') ? MEDIA_CACHE : CACHE_VERSION;
            caches.open(target).then((c) => c.put(e.request, copy));
          }
          return res;
        }),
    ),
  );
});
