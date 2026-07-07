/* Studio 27 Klantenportaal, service worker.
   Doel: installeerbaar (PWA) + offline app-shell + snelle herhaalbezoeken.
   Strategie:
   - HTML/navigatie: network-first (altijd de verste versie), val terug op cache bij offline.
   - Versie-gebonden statische assets (?v=N): cache-first, vul aan vanuit netwerk.
   - Alleen GET + same-origin. API (POST naar de worker) en Firebase/cross-origin gaan
     ongemoeid naar het netwerk, zodat auth en live data nooit door de SW worden geraakt.
   Cachenaam draagt de frontend-versie; bump dit bij een nieuwe release (samen met ?v=). */
var CACHE = 's27-portaal-v170';
// SHELL volgt automatisch de CACHE-versie (geen aparte bump-plek meer)
var V = (CACHE.split('-v')[1] || '0');
var SHELL = [
  '/', '/index.html', '/manifest.json',
  '/styles.css?v=' + V, '/glass.css?v=' + V, '/tweaks.css?v=' + V, '/video-review.css?v=' + V, '/feedback-core.css?v=' + V,
  '/api.js?v=' + V, '/data.js?v=' + V, '/assets-data.js?v=' + V, '/catalog-data.js?v=' + V,
  '/panels.js?v=' + V, '/portal.js?v=' + V, '/tweaks.js?v=' + V, '/video-review.js?v=' + V, '/feedback-core.js?v=' + V, '/auth.js',
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

  // Video/media + Range-requests rechtstreeks naar het netwerk: een <video> vraagt byte-ranges en
  // iOS/Safari eist daarop 206 Partial Content. Cache-first kan een volledige 200 teruggeven
  // waardoor afspelen breekt (de boot-splash laadde daardoor niet op de PWA).
  if (req.headers.has('range') || /\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) return;

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

/* ---- Web Push (pilot) ---------------------------------------------------------
   De worker stuurt een aes128gcm-payload {title, body, url, tag, icon}. We tonen
   de melding en openen/focussen bij klik het portaal op de meegegeven url. */
self.addEventListener('push', function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch (err) { try { data = { body: e.data && e.data.text ? e.data.text() : '' }; } catch (e2) { data = {}; } }
  var title = data.title || 'Studio 27 portaal';
  var options = {
    body: data.body || 'Er is een update in je portaal.',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 's27-portaal',
    renotify: true,
    data: { url: data.url || '/' }
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (('focus' in c)) {
          try { if ('navigate' in c && url) c.navigate(url); } catch (err) {}
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});


// Geforceerde versie-push: het portaal stuurt FLUSH bij een hogere serverversie -> alle
// caches weg, zodat de eerstvolgende load gegarandeerd vers van het netwerk komt.
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'FLUSH') {
    e.waitUntil(caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }));
  }
});
