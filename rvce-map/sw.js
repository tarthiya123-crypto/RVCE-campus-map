// RVCE Campus Navigator - Service Worker v1.0
const CACHE_NAME = "rvce-nav-v1";
const STATIC_ASSETS = [
  "/index.html",
  "/css/style.css",
  "/js/campus-data.js",
  "/js/algorithms.js",
  "/js/gamified-map.js",
  "/js/vector-map.js",
  "/js/app.js",
  "/data/paths.json",
  "/data/buildings.json",
  "/data/lake_layer.json",
  "/manifest.json"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(err => console.warn("SW cache partial:", err)))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Network-first for GeoJSON data; cache-first for static assets
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/data/")) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
  }
});
