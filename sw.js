// Service worker: permite instalar SERVICRUZ como app y abrirla sin conexión.
const CACHE = "servicruz-v1";
const SHELL = ["./", "index.html", "panel.html", "assets/css/styles.css", "assets/js/config.js",
  "assets/js/common.js", "assets/js/app.js", "assets/js/panel.js", "data/demo.json",
  "manifest.webmanifest", "assets/icons/icon-192.png", "assets/icons/icon-512.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Primero la red (para ver siempre lo último); si no hay conexión, la copia guardada.
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
