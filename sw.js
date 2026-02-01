// ─── sw.js ───

const CACHE_NAME = "master-tombol-v2";
const DATA_CACHE = "pwa-data";

// Gunakan path absolut dari root — Vercel resolve pathname sebagai "/index.html" bukan "./"
const STATIC_FILES = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
  "/firebase-messaging.js"
];

// Icon stabil (sama yang di manifest.json)
const ICON_URL =
  "https://play-lh.googleusercontent.com/aXqNEkv2gOWHmFdj-BfCKoBignxVAp72vUFIErD_sO_dhO2Vrei4qT57bs6rExFWnSU=w192-h192-rw";

// URL utama app di Vercel
const APP_URL = "https://appsatm.vercel.app/";

// ═══════════════════════════════════════════════
// KONFIGURASI FIREBASE — Sama dengan di firebase-messaging.js
// ═══════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
// ═══════════════════════════════════════════════

// ─── Import Firebase Messaging SDK di Service Worker ───
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js"
);

// Init Firebase di scope Service Worker
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

// ─── Handle Background Messages ───
firebase.messaging().setBackgroundMessageHandler(function (payload) {
  console.log("[SW] Background message:", payload);

  const notificationTitle = payload.notification
    ? payload.notification.title
    : (payload.data && payload.data.title) || "Notifikasi Baru";

  const options = {
    body: payload.notification
      ? payload.notification.body
      : (payload.data && payload.data.body) || "",
    icon: ICON_URL,
    badge: ICON_URL,
    tag: "apps-atm-notif",
    requireInteraction: false,
    silent: false,
    data: { url: APP_URL }
  };

  return self.registration.showNotification(notificationTitle, options);
});

// ─── Cache & Fetch Strategy ───

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Static assets dari origin ini → cache first
  if (
    url.origin === self.location.origin &&
    STATIC_FILES.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches
                .open(CACHE_NAME)
                .then((cache) =>
                  cache.put(event.request, networkResponse.clone())
                );
            }
            return networkResponse;
          })
        );
      })
    );
  }
  // API Google Apps Script → network first, fallback ke cache
  else if (url.href.startsWith("https://script.google.com")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            caches
              .open(DATA_CACHE)
              .then((cache) =>
                cache.put(event.request, networkResponse.clone())
              );
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});

// ─── Handle Notifikasi Click → Buka / Focus App ───
self.addEventListener("notificationclick", (event) => {
  event.preventDefault();
  event.notification.close();

  // URL tujuan: dari data.url jika ada, fallback ke APP_URL
  const targetUrl =
    (event.notification.data && event.notification.data.url) || APP_URL;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Cari tab yang sudah buka di domain yang sama
        for (const client of clients) {
          if (
            client.url &&
            new URL(client.url).origin === new URL(targetUrl).origin
          ) {
            client.focus();
            // Kirim pesan ke client agar notifikasi ditambahkan di panel
            client.postMessage({
              type: "NOTIF_CLICK",
              title: event.notification.title,
              body: event.notification.body
            });
            return;
          }
        }
        // Tidak ada tab buka → buka baru ke full Vercel URL
        return self.clients.openWindow(targetUrl);
      })
  );
});
