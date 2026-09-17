const CACHE_NAME = 'beko-compliance-os-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.js',
  '/login/login.html',
  '/login/login.css',
  '/login/login.js',
  '/verify/verify-email.html',
  '/verify/verify-email.css',
  '/verify/verify-email.js',
  '/onboarding/onboarding.html',
  '/onboarding/onboarding.css',
  '/onboarding/onboarding.js',
  '/dashboard/dashboard.html',
  '/dashboard/dashboard.css',
  '/dashboard/dashboard.js',
  '/templates/templates.html',
  '/templates/templates.css',
  '/templates/templates.js',
  '/education/education.html',
  '/education/education.css',
  '/education/education.js',
  '/tenders/tenders.html',
  '/tenders/tenders.css',
  '/tenders/tenders.js',
  '/aml/aml.html',
  '/aml/aml.css',
  '/aml/aml.js',
  '/notifications/notifications.html',
  '/notifications/notifications.css',
  '/notifications/notifications.js',
  '/consultation/consultation.html',
  '/consultation/consultation.css',
  '/consultation/consultation.js',
  '/compliance/compliance.html',
  '/compliance/compliance.css',
  '/compliance/compliance.js',
  '/profile/profile.html',
  '/profile/profile.css',
  '/profile/profile.js',
  '/admin/admin.html',
  '/admin/admin.css',
  '/admin/admin.js',
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
