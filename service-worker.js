const CACHE_NAME = 'beko-compliance-os-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/login/login.html',
  '/verify/verify-email.html',
  '/onboarding/onboarding.html',
  '/dashboard/dashboard.html',
  '/templates/templates.html',
  '/education/education.html',
  '/tenders/tenders.html',
  '/aml/aml.html',
  '/notifications/notifications.html',
  '/consultation/consultation.html',
  '/compliance/compliance.html',
  '/profile/profile.html',
  '/admin/admin.html',
  '/assets/mobile-nav.css',
  '/assets/mobile-nav.js',
  '/supabase.js',
  '/bg.jpeg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always fetch Supabase API/storage live
  if (url.origin.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Same-origin pages/assets: cache first, then network
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            return response;
          })
          .catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

  // External CDN resources: network first, cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
