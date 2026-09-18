const CACHE_NAME = 'beko-compliance-os-v7';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.js',
  '/login/login.html',
  '/login/login.css',
  '/login/login.js',
  '/signup/signup.html',
  '/signup/signup.css',
  '/signup/signup.js',
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
  '/documents/documents.html',
  '/documents/documents.css',
  '/documents/documents.js',
  '/shared/compliance-docs.js',
  '/shared/obligations.js',
  '/profile/profile.html',
  '/profile/profile.css',
  '/profile/profile.js',
  '/admin/admin.html',
  '/admin/admin.css',
  '/admin/admin.js',
  '/assets/mobile-nav.css',
  '/assets/mobile-nav.js',
  '/terms/terms.html',
  '/terms/terms.css',
  '/privacy/privacy.html',
  '/privacy/privacy.css',
  '/supabase.js',
  '/beko-logo.png',
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
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Always fetch Supabase API/storage live
  if (url.origin.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Same-origin pages/assets: network first so users always get the latest
  // HTML/CSS/JS, with the cache kept as an offline fallback.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('/index.html');
          return Response.error();
        })
    );
    return;
  }

  // External CDN resources: network first, cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
