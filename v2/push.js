/* =============================================================================
 * Studio 27 Klantenportaal - Web Push (frontend, v2)
 * -----------------------------------------------------------------------------
 * GOLF 4 (11-07): push staat OPEN voor alle klantaccounts (de pilot-gate op
 * vincent@studio27.be is weg; de worker aanvaardt elk geverifieerd
 * portaalaccount met een bedrijf-claim). Aanzetten gebeurt via de knop in
 * Instellingen -> Meldingen (S27Push.enable); dit script vernieuwt op de
 * achtergrond enkel de KV-TTL van bestaande inschrijvingen.
 *
 * Geen afhankelijkheid van panels.js/portal.js/styles.css (alles inline) zodat
 * dit parallel naast andere chats kan leven.
 * ============================================================================= */
(function () {
  'use strict';

  // Publieke VAPID-sleutel (NIET geheim; matcht de private JWK in de worker-secret).
  var VAPID_PUBLIC_KEY = 'BFEuNof6_jFVqWlo-I_p6YMvDd4R__4l4iADckDfVju9ozzaQZZt4f9j_jWJnTNnTFKtjQxy-zPDufwzMIcYSBM';

  var GATEWAY_BASE = (function () {
    try { var h = location.hostname || ''; if (/\.workers\.dev$/.test(h)) return location.origin; } catch (e) {}
    return 'https://s27-portal-gateway-v2.studio27marketing.workers.dev';
  })();

  var started = false; // control al gerenderd?
  var box = null, statusEl = null, btnRow = null, hintEl = null;

  /* ---- helpers ---- */
  function urlB64ToU8(s) {
    var pad = '='.repeat((4 - (s.length % 4)) % 4);
    var b = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b); var u = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) u[i] = raw.charCodeAt(i);
    return u;
  }
  function emailFromToken(t) {
    try {
      var p = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (p.length % 4) p += '=';
      var o = JSON.parse(atob(p));
      return String(o.email || '').trim().toLowerCase();
    } catch (e) { return ''; }
  }
  function supported() {
    return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
  }
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  async function pushApi(path, payload) {
    var token = (window.S27Auth && window.S27Auth.token) ? await window.S27Auth.token() : null;
    if (!token) throw new Error('not_logged_in');
    var res = await fetch(GATEWAY_BASE + '/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload || {})
    });
    var data = {}; try { data = await res.json(); } catch (e) {}
    return { status: res.status, data: data };
  }

  /* ---- UI ---- */
  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; }
  function btn(label, primary, onClick) {
    var b = el('button',
      'border:0;border-radius:10px;padding:8px 12px;font:600 13px/1.2 system-ui,-apple-system,sans-serif;cursor:pointer;' +
      (primary
        ? 'background:#3083DC;color:#fff;'
        : 'background:rgba(0,0,0,.06);color:#1c2733;'));
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }
  function ensureBox() {
    if (box) return;
    box = el('div',
      'position:fixed;right:16px;bottom:16px;z-index:2147483000;max-width:300px;' +
      'background:rgba(255,255,255,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:14px 14px 12px;' +
      'box-shadow:0 10px 30px rgba(20,40,80,.18);font:400 13px/1.45 system-ui,-apple-system,sans-serif;color:#1c2733;');
    var head = el('div', 'display:flex;align-items:center;gap:8px;margin-bottom:6px;');
    head.appendChild(el('span', 'font-size:18px;', '🔔'));
    head.appendChild(el('strong', 'font-size:14px;', 'Pushmeldingen'));
    var pill = el('span', 'margin-left:auto;font:600 10px/1 system-ui;letter-spacing:.04em;text-transform:uppercase;color:#3083DC;background:rgba(48,131,220,.12);padding:4px 7px;border-radius:999px;', 'PILOT');
    head.appendChild(pill);
    var close = el('button', 'margin-left:6px;border:0;background:transparent;cursor:pointer;font-size:16px;line-height:1;color:#8a97a3;', '×');
    close.title = 'Verbergen';
    close.addEventListener('click', function () { try { sessionStorage.setItem('s27push_hidden', '1'); } catch (e) {} box.remove(); box = null; });
    head.appendChild(close);
    box.appendChild(head);

    statusEl = el('div', 'margin:2px 0 10px;color:#46535f;');
    box.appendChild(statusEl);
    btnRow = el('div', 'display:flex;gap:8px;flex-wrap:wrap;');
    box.appendChild(btnRow);
    hintEl = el('div', 'margin-top:9px;font-size:11.5px;color:#8a97a3;');
    box.appendChild(hintEl);
    document.body.appendChild(box);
  }
  function setStatus(txt) { ensureBox(); statusEl.textContent = txt; }
  function setHint(txt) { ensureBox(); hintEl.textContent = txt || ''; }
  function setButtons(list) {
    ensureBox(); btnRow.innerHTML = '';
    list.forEach(function (b) { btnRow.appendChild(b); });
  }

  function renderState(state) {
    ensureBox();
    if (state === 'on') {
      setStatus('Meldingen staan AAN op dit toestel.');
      setHint('Je krijgt voortaan een melding bij wijzigingen — ook als de app dicht is.');
      setButtons([
        btn('Uitzetten', false, doDisable)
      ]);
    } else if (state === 'denied') {
      setStatus('Meldingen zijn geblokkeerd in je browser/toestel.');
      setHint(isIos()
        ? 'Ga naar Instellingen → Meldingen → Studio 27 en sta meldingen toe.'
        : 'Sta meldingen toe via het slotje/instellingen-icoon naast de adresbalk en herlaad.');
      setButtons([]);
    } else { // off
      setStatus('Krijg meldingen rechtstreeks op dit toestel (i.p.v. mail/WhatsApp).');
      setHint('');
      setButtons([btn('Meldingen aanzetten', true, doEnable)]);
    }
  }
  function renderUnsupported() {
    ensureBox();
    if (isIos() && !isStandalone()) {
      setStatus('Voeg de app eerst toe aan je beginscherm.');
      setHint('Deel-icoon (vierkant met pijltje) → "Zet op beginscherm". Open daarna de app vanaf je beginscherm en zet meldingen aan.');
    } else {
      setStatus('Dit toestel/deze browser ondersteunt geen pushmeldingen.');
      setHint('');
    }
    setButtons([]);
  }

  /* ---- acties ---- */
  // UI-vrij (Vincent 2026-06-13): geeft {ok,msg} terug; de aanroeper (Instellingen) toont de status.
  async function doEnable() {
    try {
      if (!supported()) return { ok: false, msg: 'Dit toestel/deze browser ondersteunt geen pushmeldingen.' };
      if (Notification.permission === 'denied') return { ok: false, msg: 'Meldingen staan geblokkeerd. Sta ze toe via de browser- of toestelinstellingen en probeer opnieuw.' };
      var perm = await Notification.requestPermission();
      if (perm !== 'granted') return { ok: false, msg: 'Geen toestemming gegeven.' };
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (sub) { var key = sub.options && sub.options.applicationServerKey; if (!key) { try { await sub.unsubscribe(); } catch (e) {} sub = null; } }
      if (!sub) {
        try {
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToU8(VAPID_PUBLIC_KEY) });
        } catch (e) {
          var old = await reg.pushManager.getSubscription();
          if (old) { try { await old.unsubscribe(); } catch (e2) {} }
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToU8(VAPID_PUBLIC_KEY) });
        }
      }
      var r = await pushApi('push/subscribe', { subscription: sub.toJSON(), ua: navigator.userAgent });
      if (r.status === 200 && r.data && r.data.ok) return { ok: true, msg: 'Pushmeldingen staan aan op dit toestel.' };
      return { ok: false, msg: (r.data && r.data.message) || 'Inschrijven mislukte. Probeer opnieuw.' };
    } catch (e) { return { ok: false, msg: 'Er ging iets mis: ' + (e && e.message ? e.message : e) }; }
  }
  async function doDisable() {
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (sub) { var ep = sub.endpoint; try { await sub.unsubscribe(); } catch (e) {} try { await pushApi('push/unsubscribe', { endpoint: ep }); } catch (e) {} }
      return { ok: true, msg: 'Pushmeldingen staan uit op dit toestel.' };
    } catch (e) { return { ok: false, msg: 'Uitzetten mislukte: ' + (e && e.message ? e.message : e) }; }
  }

  /* ---- init (Vincent 2026-06-13: GEEN zwevende melding meer) ----
   * De "Pushmeldingen"-box is verwijderd. Push blijft stil werken: als er al een
   * inschrijving is, verversen we enkel de KV-TTL op de achtergrond (geen UI). Voor
   * (her)inschrijven op een nieuw toestel is er een knop in Instellingen → Meldingen
   * (S27Push.enable, open voor alle klantaccounts). Geen automatische prompt of banner. */
  async function initBackgroundRenew() {
    if (started) return; started = true;
    if (!supported()) return;
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') {
        try { await pushApi('push/subscribe', { subscription: sub.toJSON(), ua: navigator.userAgent }); } catch (e) {}
      }
    } catch (e) { /* stil */ }
  }
  // manuele controle voor Instellingen (geen auto-UI): aanzetten/uitzetten op aanvraag
  window.S27Push = { enable: function(){ return doEnable(); }, disable: function(){ return doDisable(); }, supported: supported };

  // Wacht (zonder S27Auth.subscribe te kapen) op een token; lees de e-mail; gate op Vincent.
  function waitForUser() {
    var tries = 0;
    var timer = setInterval(async function () {
      tries++;
      if (tries > 80) { clearInterval(timer); return; } // ~2 min
      if (!(window.S27Auth && window.S27Auth.token)) return;
      var token = null;
      try { token = await window.S27Auth.token(); } catch (e) { token = null; }
      if (!token) return;
      clearInterval(timer);
      // GOLF 4: TTL-verversing voor ELK ingelogd account met een bestaande
      // inschrijving (geen prompt of UI; aanzetten blijft via Instellingen).
      initBackgroundRenew();
    }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForUser);
  else waitForUser();
})();
