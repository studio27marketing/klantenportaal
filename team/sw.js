/* Studio 27 Teamportaal service worker — network-first (nooit stale code serveren). */
var CACHE = 's27-team-v142';
var SHELL = ['/', '/index.html', '/wordmark.svg', '/icon.svg'];

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

// NETWORK-FIRST: haal altijd vers op (verse app.js/auth.js/index.html); cache enkel als
// offline-fallback. Zo kan een oude shell de login nooit blokkeren.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                        // API-POSTs nooit aanraken
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         // cross-origin (gateway) nooit cachen
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || (req.mode === 'navigate' ? caches.match('/index.html') : undefined); });
    })
  );
});
