const CACHE_NAME = "beko-cache-v2";
const urlsToCache = [
  "./index.html",
  "./index.css",
  "./index.js",
  "./bg.jpeg",
  "./manifest.json",
  "./LOGIN_FILES/login.html",
  "./LOGIN_FILES/login.css",
  "./LOGIN_FILES/login.js"
];

// Install: pre-cache the core app shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate: clean up old cache versions so stale files don't linger
// after you bump CACHE_NAME.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Fetch: network-first, falling back to cache, with cache updated on
// successful GET responses only.
//
// IMPORTANT: only GET requests are cacheable. The Cache API throws on
// cache.put() for POST/PUT/etc, and Firebase Auth/Firestore send POST
// requests constantly (sign-in, token refresh, Firestore writes/reads
// over its watch stream) — those must always pass straight through to
// the network, uncached.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return; // let the browser handle it normally, no caching involved
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache valid, basic (same-origin) responses.
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});