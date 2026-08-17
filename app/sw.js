// Precaching service worker. Bump CACHE_VERSION on every deploy so clients
// pick up new content; old caches are cleared on activate.

const CACHE_VERSION = 'lernapp-v7';

// If Watch-style media ever moves in, it gets its own deploy-surviving cache —
// see the Y5 trainer's MEDIA_CACHE pattern. Not needed yet.

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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
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
          if (res.ok && res.status === 200 && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        }),
    ),
  );
});
