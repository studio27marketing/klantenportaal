/* 27 AI-assistent — gedeelde, context-bewuste assistent voor alle portalen.
   Per collega een persoonlijke assistent (eigen geheugen + chat-sessies via de gateway),
   met modelkeuze. De portal zet de context via window.S27AI.setContext({title,text}) en de
   actieknoppen genereren tekst via window.S27AI.generate(instructie, context) -> Promise<tekst>.
   Mount: <ai-assistant portal="hr"></ai-assistant> in de helmet van elk portaal. */
(function () {
  if (window.customElements && customElements.get('ai-assistant')) return;
  function gw() { return (window.S27PORTAL && window.S27PORTAL.GATEWAY) || ''; }
  function tok() { return (window.S27TeamAuth && window.S27TeamAuth.token) ? window.S27TeamAuth.token() : Promise.resolve(null); }
  function api(path, body) { return tok().then(function (t) { if (!t) return null; return fetch(gw() + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body || {}) }).then(function (r) { return r.json(); }).catch(function () { return null; }); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var FALLBACK = [{ id: 'gemini-2.5-flash', naam: 'Gemini 2.5 Flash' }, { id: 'claude-haiku-4-5-20251001', naam: 'Claude Haiku 4.5' }, { id: 'claude-sonnet-4-6', naam: 'Claude Sonnet 4.6' }];
  var IC = {
    spark: '<path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4z"/><path d="M5 16l.7 2 .3.7-2 .7L4 22l-.7-2.6L1 18.7l2-.7z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>', send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    hist: '<path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>', chev: '<path d="m6 9 6 6 6-6"/>',
  };
  function svg(n, sz) { return '<svg viewBox="0 0 24 24" width="' + (sz || 18) + '" height="' + (sz || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (IC[n] || '') + '</svg>'; }

  class AIAssistant extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = true;
      this.portal = this.getAttribute('portal') || (window.S27AI && window.S27AI.portal) || 'werkplek';
      this.open = false; this.view = 'chat'; this.modelOpen = false;
      this.model = ''; this.sessionId = ''; this.messages = []; this.sessions = []; this.models = FALLBACK; this.memory = ''; this.naam = ''; this.busy = false; this.ctx = null;
      this.root = this.attachShadow({ mode: 'open' });
      var self = this;
      window.S27AI = window.S27AI || {};
      window.S27AI.portal = this.portal;
      window.S27AI.open = function () { self.openPanel(); };
      window.S27AI.close = function () { self.open = false; self.render(); };
      window.S27AI.toggle = function () { self.open ? (self.open = false, self.render()) : self.openPanel(); };
      window.S27AI.setContext = function (c) { self.ctx = c || null; if (self.open) self.render(); };
      window.S27AI.generate = function (instr, c) { return self.generate(instr, c); };
      this.render();
    }
    openPanel() { this.open = true; this.render(); if (!this._loaded) { this._loaded = true; this.loadSessions(); } var self = this; setTimeout(function () { var i = self.root.getElementById('inp'); if (i) i.focus(); }, 40); }
    loadSessions() { var self = this; api('/teamAssistantSessions', { portal: this.portal }).then(function (d) { if (!d || !d.ok) return; self.sessions = d.sessions || []; self.models = (d.models && d.models.length) ? d.models : FALLBACK; self.memory = d.memory || ''; self.naam = (d.me && d.me.naam) || ''; if (!self.model) self.model = d.globaal_model || (self.models[0] || {}).id || ''; self.render(); }); }
    newChat() { this.sessionId = ''; this.messages = []; this.view = 'chat'; this.render(); var i = this.root.getElementById('inp'); if (i) i.focus(); }
    loadSession(sid) { var self = this; this.view = 'chat'; api('/teamAssistantSession', { session_id: sid }).then(function (d) { if (!d || !d.ok || !d.session) return; self.sessionId = sid; self.messages = (d.session.messages || []).map(function (m) { return { role: m.role, text: m.text }; }); if (d.session.model) self.model = d.session.model; self.render(); self.scrollMsgs(); }); }
    ctxText() { var c = this.ctx; if (!c) return ''; if (typeof c === 'string') return c; return (c.title ? '[' + c.title + ']\n' : '') + (c.text || ''); }
    send() {
      var self = this; var inp = this.root.getElementById('inp'); var msg = inp ? inp.value.trim() : ''; if (!msg || this.busy) return; if (inp) inp.value = '';
      this.messages.push({ role: 'user', text: msg }); this.busy = true; this.render(); this.scrollMsgs();
      api('/teamAssistantChat', { portal: this.portal, message: msg, model: this.model, session_id: this.sessionId, context: this.ctxText() }).then(function (d) {
        self.busy = false;
        if (!d || !d.ok) { self.messages.push({ role: 'assistant', text: (d && d.message) || 'Er ging iets mis met de assistent.' }); }
        else { self.sessionId = d.session_id; self.messages.push({ role: 'assistant', text: d.reply }); if (!self.sessions.filter(function (x) { return x.id === d.session_id; }).length) self.sessions.unshift({ id: d.session_id, title: d.title, portal: self.portal }); }
        self.render(); self.scrollMsgs();
      });
    }
    generate(instr, c) { return api('/teamAssistantGen', { portal: this.portal, instruction: instr, model: this.model || '', context: c || this.ctxText() }).then(function (d) { return (d && d.ok) ? d.text : ''; }); }
    scrollMsgs() { var self = this; setTimeout(function () { var l = self.root.getElementById('msgs'); if (l) l.scrollTop = l.scrollHeight; }, 25); }

    render() {
      var css = ':host{all:initial;font-family:"Outfit",-apple-system,system-ui,sans-serif;}'
        + '*{box-sizing:border-box;}'
        + '.fab{position:fixed;right:22px;bottom:22px;z-index:2147482000;width:54px;height:54px;border-radius:16px;border:none;cursor:pointer;background:#050A30;color:#D1F24C;display:grid;place-items:center;box-shadow:0 14px 34px -10px rgba(5,10,48,.5);}'
        + '.fab:hover{transform:translateY(-2px);}'
        + '.back{position:fixed;inset:0;z-index:2147483200;background:rgba(5,10,48,.34);backdrop-filter:blur(2px);}'
        + '.panel{position:fixed;right:0;top:0;bottom:0;width:min(440px,96vw);z-index:2147483201;background:#FFFDF8;border-left:1px solid #EFEADD;display:flex;flex-direction:column;box-shadow:-20px 0 60px -20px rgba(5,10,48,.4);animation:sl .22s cubic-bezier(.16,1,.3,1);}'
        + '@keyframes sl{from{transform:translateX(30px);opacity:.4;}to{transform:translateX(0);opacity:1;}}'
        + '.hd{display:flex;align-items:center;gap:10px;padding:15px 16px;border-bottom:1px solid #EFEADD;background:#050A30;color:#F7F3EA;}'
        + '.hd .t{flex:1;min-width:0;}.hd .t b{font-size:14.5px;font-weight:600;display:block;}.hd .t span{font-size:11.5px;color:rgba(247,243,234,.6);}'
        + '.ico{width:32px;height:32px;border-radius:9px;background:#D1F24C;color:#050A30;display:grid;place-items:center;flex:none;}'
        + '.hb{width:32px;height:32px;border-radius:9px;border:1px solid rgba(247,243,234,.18);background:rgba(247,243,234,.08);color:#F7F3EA;cursor:pointer;display:grid;place-items:center;}'
        + '.bar{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #EFEADD;background:#FBF8F0;}'
        + '.mbtn{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:12px;font-weight:600;color:#0F2EA3;background:#ECF0FF;border:1px solid #C7D3F2;border-radius:9px;padding:6px 10px;cursor:pointer;}'
        + '.lbtn{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:12px;font-weight:600;color:#5E5A4F;background:#fff;border:1px solid #E4DDCC;border-radius:9px;padding:6px 10px;cursor:pointer;}'
        + '.mmenu{position:absolute;top:42px;left:12px;z-index:5;background:#FFFDF8;border:1px solid #EFEADD;border-radius:12px;box-shadow:0 20px 50px -16px rgba(5,10,48,.34);padding:6px;width:230px;max-height:320px;overflow:auto;}'
        + '.mrow{display:flex;align-items:center;gap:8px;width:100%;border:none;background:transparent;border-radius:8px;padding:8px 9px;cursor:pointer;font-family:inherit;font-size:13px;color:#26241F;text-align:left;}'
        + '.mrow:hover{background:#F2EEE3;}.mrow.on{background:#ECF0FF;color:#0F2EA3;font-weight:600;}'
        + '.body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:11px;}'
        + '.b-in{align-self:flex-start;max-width:88%;background:#fff;border:1px solid #EFEADD;border-radius:4px 14px 14px 14px;padding:11px 13px;font-size:13.5px;line-height:1.55;color:#26241F;white-space:pre-wrap;}'
        + '.b-out{align-self:flex-end;max-width:88%;background:#050A30;color:#F7F3EA;border-radius:14px 14px 4px 14px;padding:11px 13px;font-size:13.5px;line-height:1.55;white-space:pre-wrap;}'
        + '.empty{margin:auto;text-align:center;color:#A39E8E;font-size:13px;padding:20px;}'
        + '.srow{display:flex;align-items:center;gap:10px;width:100%;border:1px solid #EFEADD;background:#fff;border-radius:11px;padding:11px 12px;cursor:pointer;text-align:left;font-family:inherit;margin-bottom:8px;}'
        + '.srow:hover{border-color:#C7D3F2;background:#FCFAF4;}.srow .st{flex:1;min-width:0;font-size:13.5px;font-weight:500;color:#050A30;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
        + '.foot{padding:12px;border-top:1px solid #EFEADD;background:#FBF8F0;}'
        + '.inwrap{display:flex;gap:8px;align-items:flex-end;background:#fff;border:1px solid #DFD9C8;border-radius:13px;padding:7px 7px 7px 12px;}'
        + 'textarea{flex:1;border:none;outline:none;resize:none;font-family:inherit;font-size:13.5px;color:#050A30;max-height:120px;background:transparent;padding:5px 0;}'
        + '.sbtn{width:38px;height:38px;border-radius:10px;border:none;background:#D1F24C;color:#050A30;cursor:pointer;display:grid;place-items:center;flex:none;}'
        + '.sbtn:disabled{opacity:.5;cursor:default;}'
        + '.typing{align-self:flex-start;color:#8E8979;font-size:12.5px;padding:4px 4px;}'
        + '.ctxchip{display:flex;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid #EFEADD;background:#F4FBDB;font-size:12px;color:#4A6B0E;}'
        + '.ctxchip .cd{width:7px;height:7px;border-radius:99px;background:#84A300;flex:none;}'
        + '.ctxchip .cl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;}'
        + '.ctxchip button{border:none;background:transparent;color:#4A6B0E;cursor:pointer;display:grid;place-items:center;padding:2px;}';

      var html = '<style>' + css + '</style>';
      if (!this.open) { html += '<button class="fab" id="fab" title="AI-assistent">' + svg('spark', 24) + '</button>'; this.root.innerHTML = html; this._wire(); return; }

      var modelNaam = (this.models.filter(function (m) { return m.id === this.model; }.bind(this))[0] || {}).naam || 'Model';
      html += '<div class="back" id="bd"></div><div class="panel">';
      html += '<div class="hd"><span class="ico">' + svg('spark', 18) + '</span><span class="t"><b>AI-assistent</b><span>' + esc(this.naam || 'persoonlijk') + ' · ' + esc(this.portal) + '</span></span>'
        + '<button class="hb" id="new" title="Nieuwe chat">' + svg('plus', 17) + '</button>'
        + '<button class="hb" id="hist" title="Eerdere gesprekken">' + svg('hist', 17) + '</button>'
        + '<button class="hb" id="close" title="Sluiten">' + svg('x', 17) + '</button></div>';
      // model bar
      html += '<div class="bar" style="position:relative;"><button class="mbtn" id="mbtn">' + svg('spark', 13) + esc(modelNaam) + svg('chev', 13) + '</button>';
      if (this.modelOpen) { html += '<div class="mmenu">' + this.models.map(function (m) { return '<button class="mrow ' + (m.id === this.model ? 'on' : '') + '" data-m="' + esc(m.id) + '">' + esc(m.naam) + (m.provider ? ' <span style="color:#A39E8E;font-size:11px;">· ' + esc(m.provider) + '</span>' : '') + '</button>'; }.bind(this)).join('') + '</div>'; }
      html += '</div>';
      if (this.ctx && this.view === 'chat') { var ct = this.ctxText(); var first = (ct.split('\n')[0] || 'Huidig scherm'); html += '<div class="ctxchip" title="' + esc(ct) + '"><span class="cd"></span><span class="cl">Context: ' + esc(first.slice(0, 48)) + '</span><button id="ctxx" title="Context wissen">' + svg('x', 12) + '</button></div>'; }

      if (this.view === 'sessions') {
        html += '<div class="body" id="msgs">';
        if (!this.sessions.length) html += '<div class="empty">Nog geen gesprekken. Begin een nieuwe chat.</div>';
        else html += this.sessions.map(function (s) { return '<button class="srow" data-s="' + esc(s.id) + '"><span class="ico" style="background:#ECF0FF;color:#0F2EA3;">' + svg('hist', 15) + '</span><span class="st">' + esc(s.title || 'Gesprek') + '</span></button>'; }).join('');
        html += '</div>';
      } else {
        html += '<div class="body" id="msgs">';
        if (!this.messages.length) html += '<div class="empty">Hallo' + (this.naam ? ' ' + esc(this.naam.split(' ')[0]) : '') + '. Ik ken de context van het scherm waar je naar kijkt. Vraag maar raak, of laat me een mail of tekst schrijven.</div>';
        html += this.messages.map(function (m) { return '<div class="' + (m.role === 'assistant' ? 'b-in' : 'b-out') + '">' + esc(m.text) + '</div>'; }).join('');
        if (this.busy) html += '<div class="typing">Assistent denkt na…</div>';
        html += '</div>';
        html += '<div class="foot"><div class="inwrap"><textarea id="inp" rows="1" placeholder="Schrijf een bericht…"></textarea><button class="sbtn" id="snd"' + (this.busy ? ' disabled' : '') + '>' + svg('send', 17) + '</button></div></div>';
      }
      html += '</div>';
      this.root.innerHTML = html; this._wire();
      if (this.view === 'chat') this.scrollMsgs();
    }

    _wire() {
      var R = this.root, self = this;
      var fab = R.getElementById('fab'); if (fab) fab.onclick = function () { self.openPanel(); };
      var bd = R.getElementById('bd'); if (bd) bd.onclick = function () { self.open = false; self.render(); };
      var cl = R.getElementById('close'); if (cl) cl.onclick = function () { self.open = false; self.render(); };
      var nw = R.getElementById('new'); if (nw) nw.onclick = function () { self.newChat(); };
      var hs = R.getElementById('hist'); if (hs) hs.onclick = function () { self.view = (self.view === 'sessions' ? 'chat' : 'sessions'); self.render(); };
      var mb = R.getElementById('mbtn'); if (mb) mb.onclick = function () { self.modelOpen = !self.modelOpen; self.render(); };
      R.querySelectorAll('.mrow').forEach(function (el) { el.onclick = function () { self.model = el.getAttribute('data-m'); self.modelOpen = false; self.render(); }; });
      R.querySelectorAll('.srow').forEach(function (el) { el.onclick = function () { self.loadSession(el.getAttribute('data-s')); }; });
      var cx = R.getElementById('ctxx'); if (cx) cx.onclick = function () { self.ctx = null; self.render(); };
      var snd = R.getElementById('snd'); if (snd) snd.onclick = function () { self.send(); };
      var inp = R.getElementById('inp');
      if (inp) {
        inp.oninput = function () { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; };
        inp.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self.send(); } };
      }
    }
  }
  customElements.define('ai-assistant', AIAssistant);

  // Auto-mount: portaal afgeleid uit de URL (/crm/ -> crm). Geen template-aanpassing nodig.
  function mount() {
    try {
      if (typeof document === 'undefined' || document.querySelector('ai-assistant')) return;
      if (window.top !== window.self) return;   // nooit in een iframe mounten (voorkomt de dubbele assistent)
      try { if (new URLSearchParams(location.search).get('embed')) return; } catch (e) { /* */ }   // niet in embed-modus
      var seg = String(location.pathname || '').split('/').filter(Boolean)[0] || 'werkplek';
      var el = document.createElement('ai-assistant');
      el.setAttribute('portal', (window.S27AI && window.S27AI.portal) || seg);
      (document.body || document.documentElement).appendChild(el);
    } catch (e) { /* */ }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
    setTimeout(mount, 1500);
  }
})();
