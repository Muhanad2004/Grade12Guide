/* Habiba's English Guide — service worker
 * Strategy:
 *   - Precache the app shell on install (cache-first afterwards).
 *   - data.json: network-first (so content edits show up), fall back to cache offline.
 *   - Cross-origin GET (Google Fonts, emoji CDN): runtime cache-first (stale-while-revalidate-ish),
 *     so the app works fully offline after the first visit.
 * BUMP CACHE_VERSION whenever you ship new app-shell files or new data.json.
 */
const CACHE_VERSION = "heg-v11";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// App-shell files (same-origin). Keep paths relative for GitHub Pages subfolders.
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.json",
  "./meet.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // data.json + meet.json -> network-first (fresh content), cache fallback offline.
  if (isSameOrigin && (url.pathname.endsWith("data.json") || url.pathname.endsWith("meet.json"))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Same-origin shell -> cache-first.
  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // Cross-origin (fonts, emoji CDN) -> runtime cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache successful/opaque responses.
        if (res && (res.status === 200 || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
