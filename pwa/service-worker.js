/**
 * service-worker.js (PWA backup copy)
 *
 * This is a backup copy of the root-level service-worker.js.
 * The active service worker is registered from index.js and lives
 * at the project root. Keep this in sync if you update the root copy.
 */

const CACHE_NAME = "beko-cache-v3";
const urlsToCache = [
  "../index.html",
  "../index.css",
  "../index.js",
  "../bg.jpeg",
  "../manifest.json",
  "../login/login.html",
  "../login/login.css",
  "../login/login.js",
  "../verify/verify-email.html",
  "../verify/verify-email.css",
  "../verify/verify-email.js",
  "../onboarding/onboarding.html",
  "../onboarding/onboarding.css",
  "../onboarding/onboarding.js",
  "../dashboard/dashboard.html",
  "../dashboard/dashboard.css",
  "../dashboard/dashboard.js",
  "../shared/auth-router.js",
  "../shared/toast.js",
  "../shared/loading.js",
  "../shared/validators.js",
];

// Install: pre-cache the core app shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate: clean up old cache versions.
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

// Fetch: network-first, falling back to cache (GET only).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
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
