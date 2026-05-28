/* ============================================================
   Studio 27 Klantendashboard — Loader v1.0.0
   ============================================================
   Single entry point voor het dashboard. Webflow-embed bevat
   ALLEEN dit script + een mount-div. Alles wordt vanaf GitHub
   (via jsDelivr CDN) opgehaald, zodat updates instant live
   gaan zodra het GitHub-bestand wijzigt (~30min cache @main).

   Webflow Embed code (3 regels, never touched):
     <div id="s27-portal-mount"></div>
     <script src="https://cdn.jsdelivr.net/gh/studio27marketing/klantenportaal@main/loader.js"></script>
   ============================================================ */
(function() {
  'use strict';

  var REPO   = 'studio27marketing/klantenportaal';
  var BRANCH = 'main';
  // raw.githubusercontent.com: direct GitHub, geen CDN cache (5min browser cache via Cache-Control header)
  var CDN    = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH;
  var MOUNT_ID = 's27-portal-mount';

  // Cache-bust: granulariteit 60s tijdens MVP (auto-fresh elke minuut) of explicit timestamp met ?nocache=1
  var CB = (location.search.indexOf('nocache=1') >= 0)
    ? ('?cb=' + Date.now())
    : ('?v=' + Math.floor(Date.now() / 60000));

  function loadCSS(href) {
    if (document.querySelector('link[data-s27-portal-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href + CB;
    link.setAttribute('data-s27-portal-css', '1');
    document.head.appendChild(link);
  }

  function loadScript(src) {
    if (document.querySelector('script[data-s27-portal-js]')) return;
    var s = document.createElement('script');
    s.src = src + CB;
    s.defer = true;
    s.setAttribute('data-s27-portal-js', '1');
    document.body.appendChild(s);
  }

  function showError(mount, msg) {
    mount.innerHTML = '<div style="font-family:system-ui,-apple-system,sans-serif;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;padding:24px;border-radius:12px;text-align:center;max-width:560px;margin:60px auto">' +
      '<strong style="display:block;margin-bottom:8px">Klantenportaal kon niet laden</strong>' +
      '<span style="font-size:13px;display:block;color:#7f1d1d">' + msg + '</span>' +
      '<span style="font-size:12px;display:block;color:#a16a6a;margin-top:12px">Probeer opnieuw of mail naar <a href="mailto:ilke@studio27.be" style="color:#991b1b">ilke@studio27.be</a></span>' +
      '</div>';
  }

  function init() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) {
      console.error('[Studio 27] Mount element #' + MOUNT_ID + ' niet gevonden op de pagina.');
      return;
    }

    // 1. CSS first (no FOUC)
    loadCSS(CDN + '/dashboard.css');

    // 2. Fetch HTML markup, inject, then load JS
    fetch(CDN + '/dashboard.html' + CB, { cache: 'no-cache' })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function(html) {
        mount.innerHTML = html;
        loadScript(CDN + '/dashboard.js');
      })
      .catch(function(err) {
        showError(mount, 'Kon dashboard-markup niet ophalen (' + err.message + ').');
        console.error('[Studio 27] Failed to load portal:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
