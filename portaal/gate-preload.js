/* Early visual gate for live department routes. */
(function () {
  var env = '';
  var active = false;
  try {
    env = String(location.pathname || '').split('/').filter(Boolean)[0] || '';
    var sp = new URLSearchParams(location.search || '');
    var local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname);
    var preview = local && (sp.get('preview') === '1' || sp.get('demo') === '1');
    active = /^(crm|finance|hr|productie)$/.test(env) && !preview && !sp.get('embed');
  } catch (e) { active = false; }
  function release() {
    try { document.documentElement.removeAttribute('data-s27-auth-gate'); } catch (e) {}
    try {
      var style = document.getElementById('s27-auth-gate-style');
      if (style && style.parentNode) style.parentNode.removeChild(style);
    } catch (e) {}
  }
  window.__S27_AUTH_GATE = { active: active, env: env, release: release };
  if (!active) return;
  try {
    document.documentElement.setAttribute('data-s27-auth-gate', 'pending');
    var s = document.createElement('style');
    s.id = 's27-auth-gate-style';
    s.textContent = 'html[data-s27-auth-gate="pending"] body{visibility:hidden!important;}';
    document.head.appendChild(s);
  } catch (e) {}
})();
