const CACHE_NAME = 'master-tombol-v1';
const DATA_CACHE = 'pwa-data';
const STATIC_FILES = [
  './',
  'index.html',
  'app.js',
  'manifest.json'
  // Tambahkan path ikon lokal jika Anda pakai file lokal
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME && key !== DATA_CACHE)
        .map(key => caches.delete(key))
    ))
  );
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Static assets → cache first
  if (STATIC_FILES.includes(url.pathname) || url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(networkResponse => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          return networkResponse;
        });
      })
    );
  }
  // API GAS → network first, fallback ke cache
  else if (url.href.startsWith(API_URL)) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(DATA_CACHE).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});
