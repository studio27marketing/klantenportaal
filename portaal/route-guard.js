/* Studio 27 Teamportaal route-guard.
   Blocks live department routes when Firebase auth is not ready. */
import { S27TeamAuth } from './auth.js?v=2';

(function () {
  var env = '';
  try { env = String(location.pathname || '').split('/').filter(Boolean)[0] || ''; } catch (e) { env = ''; }
  if (!/^(crm|finance|hr|productie)$/.test(env)) return;

  var local = false;
  var sp = null;
  try {
    sp = new URLSearchParams(location.search || '');
    local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname);
  } catch (e) { sp = null; }

  var embed = sp && sp.get('embed');
  var preview = local && sp && (sp.get('preview') === '1' || sp.get('demo') === '1');
  if (preview || embed) {
    try { window.__S27_AUTH_GATE && window.__S27_AUTH_GATE.release && window.__S27_AUTH_GATE.release(); } catch (e) {}
    return;
  }

  var done = false;
  function nextPath() { return '/' + env + '/' + (location.search || '') + (location.hash || ''); }
  function toLogin() {
    if (done) return;
    done = true;
    try { location.replace('/?next=' + encodeURIComponent(nextPath())); }
    catch (e) { location.href = '/'; }
  }

  var timer = setTimeout(toLogin, 8500);
  try {
    S27TeamAuth.subscribe(function (st) {
      if (!st) return;
      if (st.phase === 'ready') {
        done = true;
        clearTimeout(timer);
        try { window.__S27_AUTH_GATE && window.__S27_AUTH_GATE.release && window.__S27_AUTH_GATE.release(); } catch (e) {}
      } else if (st.phase === 'signed_out' || st.phase === 'no_access') {
        clearTimeout(timer);
        toLogin();
      }
    });
    S27TeamAuth.init({ gatewayBase: (window.S27PORTAL && window.S27PORTAL.GATEWAY) || '' });
  } catch (e) {
    clearTimeout(timer);
    toLogin();
  }
})();
