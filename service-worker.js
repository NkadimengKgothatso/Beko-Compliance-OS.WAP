const CACHE_NAME = "bekoos-cache-v1";
const urlsToCache = [
  "./fPage.html",
  "./login.html",
  "./login.css",
  "./logo-192.png",
  "./logo-512.png",
  "./login.js"
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
});

// Fetch event - serve cached content when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});