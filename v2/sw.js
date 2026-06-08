/* Studio 27 Klantenportaal, service worker.
   Doel: installeerbaar (PWA) + offline app-shell + snelle herhaalbezoeken.
   Strategie:
   - HTML/navigatie: network-first (altijd de verste versie), val terug op cache bij offline.
   - Versie-gebonden statische assets (?v=N): cache-first, vul aan vanuit netwerk.
   - Alleen GET + same-origin. API (POST naar de worker) en Firebase/cross-origin gaan
     ongemoeid naar het netwerk, zodat auth en live data nooit door de SW worden geraakt.
   Cachenaam draagt de frontend-versie; bump dit bij een nieuwe release (samen met ?v=). */
var CACHE = 's27-portaal-v46';
var SHELL = [
  '/', '/index.html', '/manifest.json',
  '/styles.css?v=44', '/glass.css?v=44', '/tweaks.css?v=44',
  '/api.js?v=44', '/data.js?v=44', '/assets-data.js?v=44', '/catalog-data.js?v=44',
  '/panels.js?v=44', '/portal.js?v=44', '/tweaks.js?v=44', '/auth.js',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // allSettled: één ontbrekend bestand mag de install niet breken.
    return Promise.allSettled(SHELL.map(function (u) { return c.add(u); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                                  // API/POST -> netwerk
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;                   // worker/Firebase/CDN -> netwerk

  if (req.mode === 'navigate') {                                     // HTML: network-first
    e.respondWith(
      fetch(req).then(function (r) {
        var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put('/', cp); });
        return r;
      }).catch(function () {
        return caches.match('/').then(function (m) { return m || caches.match('/index.html'); });
      })
    );
    return;
  }

  // Statische assets: cache-first + netwerk-aanvulling.
  e.respondWith(
    caches.match(req).then(function (m) {
      return m || fetch(req).then(function (r) {
        if (r && r.status === 200) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
        return r;
      });
    })
  );
});
