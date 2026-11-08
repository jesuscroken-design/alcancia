"use strict";
const CACHE = "alcancia-v1";
const CORE = [
  "./", "./index.html", "./styles.css", "./app.js", "./gsap.min.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;            // nada de terceros
  e.respondWith(
    caches.match(e.request).then(hit => hit ||
      fetch(e.request).then(cp => {
        const cl = cp.clone();
        caches.open(CACHE).then(c => c.put(e.request, cl)).catch(() => {});
        return cp;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
