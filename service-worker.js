// service-worker.js

const CACHE_NAME = "profile-driver-atm-v1";
const VERSION = "v1"; // Ubah versi ini jika ingin force update cache (misal: 'v2')

// Daftar asset yang wajib di-cache
// Termasuk file lokal + library eksternal + icon dari URL (agar icon muncul offline setelah pertama load)
const urlsToCache = [
  "/", // Root (index.html akan di-handle otomatis)
  "/index.html",
  "/manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  // Icon dari manifest.json Anda (ditambahkan agar di-cache & muncul offline)
  "https://play-lh.googleusercontent.com/aXqNEkv2gOWHmFdj-BfCKoBignxVAp72vUFIErD_sO_dhO2Vrei4qT57bs6rExFWnSU=w192-h192-rw",
  "https://play-lh.googleusercontent.com/aXqNEkv2gOWHmFdj-BfCKoBignxVAp72vUFIErD_sO_dhO2Vrei4qT57bs6rExFWnSU=w512-h512-rw"
];

// INSTALL: Cache semua asset saat pertama kali install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching assets");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Langsung aktifkan SW baru
  );
});

// ACTIVATE: Hapus cache lama jika versi berubah
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log("Service Worker: Menghapus cache lama", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim()) // Ambil kontrol semua tab segera
  );
});

// FETCH: Strategi Cache First, fallback ke network
self.addEventListener("fetch", (event) => {
  // Hanya cache request GET (abaikan POST atau chrome-extension)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Jika ada di cache → return cache
      if (cachedResponse) {
        return cachedResponse;
      }

      // Jika tidak ada → fetch dari network, lalu simpan ke cache
      return fetch(event.request)
        .then((networkResponse) => {
          // Simpan response yang valid ke cache
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback (opsional: bisa tambah halaman offline.html)
          return new Response("Offline mode – tidak ada koneksi internet", {
            status: 503,
            statusText: "Service Unavailable"
          });
        });
    })
  );
});
