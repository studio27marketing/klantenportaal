/* ============================================================
   Studio 27 Klantenportaal — Loader v2.0.0 (v4 liquid-glass)
   ============================================================
   Single entry point. Webflow-embed bevat ALLEEN dit script +
   een mount-div. Alles wordt vanaf GitHub (raw.githack CDN)
   opgehaald, zodat updates instant live gaan.

   Webflow Embed code (3 regels, never touched):
     <div id="s27-portal-mount"></div>
     <script src="https://cdn.jsdelivr.net/gh/studio27marketing/klantenportaal@main/loader.js"></script>

   v2.0.0: laadt het v4-portaal uit /v4/ (styles+glass+tweaks.css,
   shell.html → mount, dan api→data→assets-data→panels→portal→tweaks.js
   in volgorde). Het oude dashboard.* blijft in de repo voor revert.
   ============================================================ */
(function() {
  'use strict';

  var REPO   = 'studio27marketing/klantenportaal';
  var BRANCH = 'main';
  var CDN    = 'https://raw.githack.com/' + REPO + '/' + BRANCH + '/v4';
  var MOUNT_ID = 's27-portal-mount';

  // Cache-bust: 60s-granulariteit (auto-fresh elke minuut) of expliciet met ?nocache=1
  var CB = (location.search.indexOf('nocache=1') >= 0)
    ? ('?cb=' + Date.now())
    : ('?v=' + Math.floor(Date.now() / 60000));

  var CSS = ['styles.css', 'glass.css', 'tweaks.css'];
  var SCRIPTS = ['api.js', 'data.js', 'assets-data.js', 'panels.js', 'portal.js', 'tweaks.js'];
  var FONTS = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Nunito:wght@400;500;600;700;800&display=swap';

  function loadCSS() {
    if (document.querySelector('link[data-s27-portal-css]')) return;
    var f = document.createElement('link');
    f.rel = 'stylesheet'; f.href = FONTS; f.setAttribute('data-s27-portal-css', '1');
    document.head.appendChild(f);
    CSS.forEach(function(c) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = CDN + '/' + c + CB; l.setAttribute('data-s27-portal-css', '1');
      document.head.appendChild(l);
    });
  }

  // Scripts in VOLGORDE laden (async=false → ordered execution voor dynamisch ingevoegde scripts).
  // api.js krijgt data-s27-api zodat het auth.js relatief naast zichzelf resolvet.
  function loadScripts() {
    if (document.querySelector('script[data-s27-portal-js]')) return;
    SCRIPTS.forEach(function(name) {
      var s = document.createElement('script');
      s.src = CDN + '/' + name + CB;
      s.async = false;
      s.setAttribute('data-s27-portal-js', '1');
      if (name === 'api.js') s.setAttribute('data-s27-api', '1');
      s.onerror = function() {
        var m = document.getElementById(MOUNT_ID);
        if (m && !m.querySelector('#login')) showError(m, 'Kon de portaal-code niet laden (' + name + ').');
      };
      document.body.appendChild(s);
    });
  }

  function showError(mount, msg) {
    mount.innerHTML = '<div style="font-family:system-ui,-apple-system,sans-serif;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;padding:24px;border-radius:12px;text-align:center;max-width:560px;margin:60px auto">' +
      '<strong style="display:block;margin-bottom:8px">Klantenportaal kon niet laden</strong>' +
      '<span style="font-size:13px;display:block;color:#7f1d1d">' + msg + '</span>' +
      '<span style="font-size:12px;display:block;color:#a16a6a;margin-top:12px">Probeer opnieuw of mail naar <a href="mailto:ilke@studio27.be" style="color:#991b1b">ilke@studio27.be</a></span>' +
      '</div>';
  }

  function delay(ms) { return new Promise(function(res) { setTimeout(res, ms); }); }

  // Retry tegen raw.githack cold-cache hikjes (intermitterende 425/429/5xx).
  function fetchRetry(url, opts, tries) {
    return fetch(url, opts).then(function(r) {
      if (r.ok) return r;
      if (tries > 1 && (r.status === 425 || r.status === 429 || r.status >= 500)) {
        return delay(500).then(function() { return fetchRetry(url, opts, tries - 1); });
      }
      throw new Error('HTTP ' + r.status);
    }, function(networkErr) {
      if (tries > 1) return delay(500).then(function() { return fetchRetry(url, opts, tries - 1); });
      throw networkErr;
    });
  }

  function init() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) {
      console.error('[Studio 27] Mount element #' + MOUNT_ID + ' niet gevonden op de pagina.');
      return;
    }
    loadCSS();
    fetchRetry(CDN + '/shell.html' + CB, { cache: 'no-cache' }, 4)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        mount.innerHTML = html;
        loadScripts();
      })
      .catch(function(err) {
        showError(mount, 'Kon portaal-markup niet ophalen (' + err.message + ').');
        console.error('[Studio 27] Failed to load portal:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
