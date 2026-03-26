const CACHE_NAME = "beko-cache-v1";
const urlsToCache = [
  "./index.html",
  "./login.html",
  "./login.css",
  "./login.js",
  "./cHome.html",
  "./cHome.css",
  "./cHome.js",
  "./bg.jpeg",
  "./manifest.json"
];

// Install: cache files
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => caches.match(event.request))
  );
});

// Fetch: serve cached first
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});