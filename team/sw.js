/* Studio 27 Teamportaal service worker — eigen cache-namespace (los van het klantportaal). */
var CACHE = 's27-team-v1';
var SHELL = ['/', '/index.html', '/app.css?v=1', '/app.js?v=1', '/auth.js?v=1', '/manifest.webmanifest?v=1', '/icon.svg'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data && e.data.type === 'FLUSH') { caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); }); } });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API-calls (andere origin) nooit cachen
  // navigatie = network-first (verse app), val terug op cache offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function () { return caches.match('/index.html'); }));
    return;
  }
  // ?v= assets = cache-first
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit; });
  }));
});
