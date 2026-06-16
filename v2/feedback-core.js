/* =============================================================================
   Studio 27 Klantenportaal — FEEDBACK-CORE (gestandaardiseerd review-systeem)
   -----------------------------------------------------------------------------
   Eén gedeelde review-overlay + een register van type-specifieke viewers voor
   ÉLK deliverable-bestand (video, pdf, foto-map, pptx/office, audio, overig).
   Per link = één eigen overlay. De look & feel is 1:1 die van video-review.css /
   feedback-core.css (kruisje rechtsboven = roterende plus, glass-shell, S27-tokens).

   Publieke API:
     window.S27Review = {
       open(opts),               // open de review-overlay voor één link
       pickReviewer(url, meta),  // dispatcher: bepaal het type en open de juiste viewer
       registerReviewer(type, def),
       linkKeyOf(url),           // gedeeld contract met de worker (videoreview.mjs)
     }

   Worker-endpoints (alle POST, Firebase-gated, bedrijfId server-side):
     fileReviewContext {task_id,url}
        -> {ok, mediaType, stream_url, download_url, is_read_only, lr_state, can_download, last_bundle?}
     linkApprove   {task_id,url,klant_naam}                 -> {ok, all_approved, task_status}
     linkFeedback  {task_id,url,comment,annotations?,attachments?,klant_naam} -> {ok, fb_task_id, ronde}
     fileReviewUpload {task_id,filename,file_data}          -> {ok, url}

   mediaType: 'video'|'pdf'|'foto'|'pptx'|'office'|'audio'|'other'.

   Afhankelijk van globals (api.js/data.js/portal.js): GATEWAY_BASE, state, esc,
   S27Auth, S27DATA, en optioneel S27VideoReview (video-delegatie) +
   openFotoGalerij (bestaande fotogalerij). Géén build-stap; klassieke IIFE.
   ============================================================================= */
(function () {
  'use strict';

  /* ---------------- constanten ---------------- */
  var EXT_ALLOW = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'ttf', 'otf', 'woff', 'woff2', 'zip'];
  var ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.ttf,.otf,.woff,.woff2,.zip';
  var MAX_BYTES = 15 * 1024 * 1024;
  // Fase 2: type per opmerking (kleur-gecodeerd, filterbaar). Default = 'wijziging'.
  var ANN_TYPES = [
    { key: 'wijziging', label: 'Wijziging', color: '#9441DB' },
    { key: 'vraag', label: 'Vraag', color: '#3083DC' },
    { key: 'idee', label: 'Idee', color: '#12AC4E' },
  ];
  function annType(k) { for (var i = 0; i < ANN_TYPES.length; i++) if (ANN_TYPES[i].key === k) return ANN_TYPES[i]; return ANN_TYPES[0]; }
  // pdf.js legacy (mjs) build — ESM, draait zonder bundler in elke moderne browser
  var PDFJS_VER = '4.10.38';
  var PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VER + '/';
  var PDFJS_MJS = PDFJS_BASE + 'pdf.min.mjs';
  var PDFJS_WORKER = PDFJS_BASE + 'pdf.worker.min.mjs';

  /* ---------------- type-detectie (vimeo/drive uit videoreview.mjs-regels) ---- */
  var VIMEO_RE = /(?:player\.)?vimeo\.com\/(?:video\/|manage\/videos\/)?(\d+)/i;
  var DRIVE_FILE_RE = /drive\.google\.com\/(?:file\/d\/([-\w]{20,})|(?:open|uc)\?[^#]*\bid=([-\w]{20,}))/i;
  var DRIVE_FOLDER_RE = /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([-\w]{15,})/i;
  // Google-native docs (Docs/Sheets/Slides) staan op docs.google.com en dragen geen
  // extensie; we behandelen ze als een Drive-bestand met dat id (worker exporteert ze → PDF).
  var GDOC_RE = /docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([-\w]{20,})/i;

  function parseVimeoId(u) { var m = String(u || '').match(VIMEO_RE); return m ? m[1] : null; }
  function parseDriveFileId(u) { var m = String(u || '').match(DRIVE_FILE_RE); return m ? (m[1] || m[2]) : null; }
  function parseDriveFolderId(u) { var m = String(u || '').match(DRIVE_FOLDER_RE); return m ? m[1] : null; }
  function parseGoogleDocId(u) { var m = String(u || '').match(GDOC_RE); return m ? m[1] : null; }

  // fnv1a-32 → 8-cijferige hex (zelfde basis als de worker voor 'u'-keys)
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }

  // GEDEELD CONTRACT met videoreview.mjs/handlers.mjs:
  //   vimeo -> 'v'+id ; drive-bestand -> 'd'+id ; drive-map -> 'g'+id ;
  //   anders -> 'u'+fnv1a(url.toLowerCase().replace(/[?#].*$/,''))
  function linkKeyOf(url) {
    var u = String(url || '').trim();   // identiek aan de worker (str(url).trim()) — anders divergeren de 'u'-keys
    var v = parseVimeoId(u); if (v) return 'v' + v;
    var d = parseDriveFileId(u); if (d) return 'd' + d;
    var g = parseDriveFolderId(u); if (g) return 'g' + g;
    var gd = parseGoogleDocId(u); if (gd) return 'd' + gd;   // native Google-doc → 'd'+id (zelfde als Drive-bestand)
    return 'u' + fnv1a(u.toLowerCase().replace(/[?#].*$/, ''));
  }

  // ruwe mediaType-gok puur uit de URL (server bevestigt via fileReviewContext.mediaType)
  function guessType(url) {
    var u = String(url || '').toLowerCase();
    if (parseVimeoId(u) || /youtu/.test(u)) return 'video';
    if (parseDriveFolderId(u) || /picflow/.test(u)) return 'foto';
    if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(u)) return 'video';
    if (/\.pdf(\?|#|$)/.test(u)) return 'pdf';
    if (/\.(ppt|pptx|key)(\?|#|$)/.test(u)) return 'pptx';
    if (/\.(doc|docx|xls|xlsx|odt|ods|odp)(\?|#|$)/.test(u)) return 'office';
    if (/\.(mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/.test(u)) return 'audio';
    if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/.test(u)) return 'foto';
    if (/docs\.google\.com\/presentation/.test(u)) return 'pptx';
    if (/docs\.google\.com\/(document|spreadsheets)/.test(u)) return 'office';
    if (parseDriveFileId(u)) return 'other'; // los Drive-bestand: server beslist (kan video/pdf/… zijn)
    return 'other';
  }

  /* ---------------- mini-helpers (spiegel van video-review.js) ---------------- */
  function _esc(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function rid(p) { return p + '_' + Math.random().toString(36).slice(2, 10); }
  function extOf(name) { return (String(name || '').split('.').pop() || '').toLowerCase(); }
  function isImg(ct) { return /^image\//.test(String(ct || '')); }
  // GATEWAY_BASE is een top-level const in api.js (globaal lexicaal, NIET op window). Daarom
  // bare 'GATEWAY_BASE' gebruiken — net als video-review.js. window.GATEWAY_BASE was undefined,
  // waardoor alle calls naar een relatieve URL op de Pages-host gingen (405 → 'kon niet inladen').
  function gwUrl(rel) { return rel ? (/^https?:/.test(rel) ? rel : GATEWAY_BASE + rel) : ''; }
  function fmtClock(sec) { sec = Math.max(0, Math.round(sec || 0)); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  // projecttitel + tak-naam (fallback) via een door panels.js gepubliceerde helper, zodat de
  // overlay-kop nooit op de bestandsnaam/'Open in Drive' hoeft terug te vallen.
  function _projMeta(taskId) { try { return (typeof window.S27ProjectMeta === 'function') ? (window.S27ProjectMeta(taskId) || {}) : {}; } catch (e) { return {}; } }
  function projectTitleFor(taskId) { return _projMeta(taskId).title || ''; }
  function takLabelFor(taskId) { return _projMeta(taskId).tak || ''; }
  // OFFLINE DRAFT (item 5): lokale opslag van lopende feedback per taak+bestand+ronde, zodat
  // niets verloren gaat bij sluiten of verbindingsverlies. Gewist na indienen/goedkeuren/lock.
  function draftKey(taskId, url, ronde) { return 'fcDraft:' + taskId + ':' + linkKeyOf(url) + ':r' + (ronde || 1); }
  function shapeIcon(k) { return k === 'arrow' ? '➜' : (k === 'box' ? '▢' : (k === 'highlight' ? '🖍️' : '📍')); }
  function shapeLabelF(k) { return k === 'arrow' ? 'Pijl' : (k === 'box' ? 'Kader' : (k === 'highlight' ? 'Markering' : 'Markup')); }
  // Sleep een bestaande pin naar een nieuwe plek. el = het pin-DOM, a = de annotatie,
  // getBox levert de huidige bounding-rect van de container (pagina/afbeelding), api.updatePin
  // commit de nieuwe genormaliseerde positie. Onder de drempel = gewone klik (highlight).
  function makePinDraggable(el, a, api, getBox) {
    if (!a || !a.pin || a.locked || (api && api.locked)) return;
    var down = null, moved = false;
    el.addEventListener('pointerdown', function (ev) {
      if (ev.button != null && ev.button !== 0) return;
      down = { x: ev.clientX, y: ev.clientY }; moved = false;
      try { el.setPointerCapture(ev.pointerId); } catch (e) { }
      el.classList.add('fc-pin-drag'); ev.preventDefault(); ev.stopPropagation();
    });
    el.addEventListener('pointermove', function (ev) {
      if (!down) return;
      if (!moved && Math.abs(ev.clientX - down.x) + Math.abs(ev.clientY - down.y) < 4) return;
      moved = true;
      var box = getBox(); if (!box || !box.width || !box.height) return;
      var xN = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width));
      var yN = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height));
      el.style.left = (xN * 100) + '%'; el.style.top = (yN * 100) + '%';
      el._nx = xN; el._ny = yN;
    });
    function end(ev) {
      if (!down) return;
      try { el.releasePointerCapture(ev.pointerId); } catch (e) { }
      el.classList.remove('fc-pin-drag');
      if (moved && el._nx != null && api && api.updatePin) {
        var np = Object.assign({}, a.pin, { xNorm: Math.round(el._nx * 1000) / 1000, yNorm: Math.round(el._ny * 1000) / 1000 });
        api.updatePin(a.id, np);
      } else if (!moved && api && api.showComment) {
        api.showComment(a.id, ev.clientX, ev.clientY);   // klik (geen sleep) → toon de opmerking (item 9)
      }
      down = null; moved = false; el._nx = el._ny = null;
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  // Stuur de volledige stored-attachment-velden mee die de worker (cleanAtt) nodig heeft —
  // niet enkel {filename,url}, anders dropt de worker de bijlage (uploadStatus/key ontbreken).
  function cleanAttPayload(x) {
    return {
      attachmentId: x.attachmentId || '', filename: x.filename || 'bijlage',
      contentType: x.contentType || '', sizeBytes: x.sizeBytes || 0,
      key: x.key || '', uploadStatus: x.uploadStatus || 'stored',
      url: x.url || x.fileUrl || ''
    };
  }
  function fileIcon(name) {
    var e = extOf(name);
    if (['ttf', 'otf', 'woff', 'woff2'].indexOf(e) >= 0) return '🔤';
    if (e === 'zip') return '📦';
    if (e === 'pdf') return '📕';
    return '📄';
  }

  /* =============================================================================
     MARKUP-LAAG (Fase 3b): pijl/kader/markeerstift als SVG-overlay op een viewer.
     Coördinaten zijn genormaliseerd (0..1) en getekend met percentage-coördinaten
     + px-stroke (non-scaling) zodat ze niet vervormen bij responsive schalen. Elke
     markup-annotatie krijgt óók een afgeleide pin → kaartnummering blijft kloppen.
     ============================================================================= */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function r3(n) { return Math.round(n * 1000) / 1000; }
  function isMarkupTool(t) { return t === 'box'; }   // enkel Kader; pijl/markeerstift geschrapt (item 1). shapeNode/renderShapes blijven arrow/highlight tekenen voor oude bundels.
  function svgNode(name, attrs) { var e = document.createElementNS(SVGNS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function pct(n) { return (Math.max(0, Math.min(1, n)) * 100) + '%'; }
  // Eén SVG-overlay met pijlpunt-markers per type-kleur (+ draft-oranje).
  function makeMarkupLayer() {
    var svg = svgNode('svg', { 'class': 'fc-markup', width: '100%', height: '100%', preserveAspectRatio: 'none' });
    var defs = svgNode('defs', {});
    var heads = ANN_TYPES.map(function (t) { return { key: t.key, color: t.color }; }).concat([{ key: 'draft', color: '#F66131' }]);
    heads.forEach(function (h) {
      var m = svgNode('marker', { id: 'fcah-' + h.key, markerUnits: 'userSpaceOnUse', markerWidth: 13, markerHeight: 13, refX: 9.5, refY: 6, orient: 'auto' });
      m.appendChild(svgNode('path', { d: 'M0,1 L10,6 L0,11 Z', fill: h.color }));
      defs.appendChild(m);
    });
    svg.appendChild(defs);
    return svg;
  }
  function shapeNode(shape, color, markerKey) {
    if (shape.kind === 'arrow') {
      return svgNode('line', { x1: pct(shape.x1), y1: pct(shape.y1), x2: pct(shape.x2), y2: pct(shape.y2), stroke: color, 'stroke-width': 3, 'stroke-linecap': 'round', 'marker-end': 'url(#fcah-' + markerKey + ')' });
    }
    var x = Math.min(shape.x1, shape.x2), y = Math.min(shape.y1, shape.y2), w = Math.abs(shape.x2 - shape.x1), h = Math.abs(shape.y2 - shape.y1);
    if (shape.kind === 'highlight') {
      return svgNode('rect', { x: pct(x), y: pct(y), width: pct(w), height: pct(h), rx: 4, fill: color, 'fill-opacity': 0.22, stroke: color, 'stroke-opacity': 0.55, 'stroke-width': 1.5 });
    }
    return svgNode('rect', { x: pct(x), y: pct(y), width: pct(w), height: pct(h), rx: 4, fill: 'none', stroke: color, 'stroke-width': 2.5 });
  }
  function updateShapeNode(el, shape) {
    if (shape.kind === 'arrow') { el.setAttribute('x1', pct(shape.x1)); el.setAttribute('y1', pct(shape.y1)); el.setAttribute('x2', pct(shape.x2)); el.setAttribute('y2', pct(shape.y2)); return; }
    var x = Math.min(shape.x1, shape.x2), y = Math.min(shape.y1, shape.y2), w = Math.abs(shape.x2 - shape.x1), h = Math.abs(shape.y2 - shape.y1);
    el.setAttribute('x', pct(x)); el.setAttribute('y', pct(y)); el.setAttribute('width', pct(w)); el.setAttribute('height', pct(h));
  }
  function derivePin(shape) {
    var p = {};
    if (shape.page) p.page = shape.page;
    if (shape.kind === 'arrow') { p.xNorm = r3(shape.x2); p.yNorm = r3(shape.y2); }
    else { p.xNorm = r3(Math.min(shape.x1, shape.x2)); p.yNorm = r3(Math.min(shape.y1, shape.y2)); }
    return p;
  }
  // Teken alle vastgelegde shapes voor dit oppervlak (pageNum = null voor één afbeelding).
  // api (optioneel) → klik op een kader toont de opmerking read-only (item 9).
  function renderShapes(svgLayer, anns, pageNum, api) {
    if (!svgLayer) return;
    [].slice.call(svgLayer.querySelectorAll('.fc-shape')).forEach(function (n) { n.remove(); });
    (anns || []).forEach(function (a) {
      if (!a.shape) return;
      if (pageNum) { if ((a.shape.page || 1) !== pageNum) return; } else if (a.shape.page) { return; }
      var el = shapeNode(a.shape, annType(a.type).color, annType(a.type).key);
      el.setAttribute('class', 'fc-shape'); el.setAttribute('data-ann', a.id);
      if (api && api.showComment) {
        el.addEventListener('click', function (ev) {
          if (api.tool && api.tool() === 'box') return;  // tijdens tekenen niet de bubble openen
          ev.stopPropagation(); api.showComment(a.id, ev.clientX, ev.clientY);
        });
        el.addEventListener('mouseenter', function () { if (api.highlightCard) api.highlightCard(a.id, true); });
        el.addEventListener('mouseleave', function () { if (api.highlightCard) api.highlightCard(a.id, false); });
      }
      svgLayer.appendChild(el);
    });
  }
  // Vrij tekenen op een oppervlak: pointerdown→sleep→pointerup tekent een shape en
  // opent meteen de opmerking-pop-over (draft blijft staan tot opslaan/annuleren).
  function attachMarkup(surfaceEl, svgLayer, getBox, api, pageNum, draftHolder) {
    var cur = null;
    function down(ev) {
      var t = api.tool();
      if (api.locked || !isMarkupTool(t)) return;
      if (ev.target && ev.target.closest && ev.target.closest('.fc-pin')) return;
      if (ev.button != null && ev.button !== 0) return;
      var box = getBox(); if (!box.width || !box.height) return;
      var x = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width));
      var y = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height));
      cur = { kind: t, x1: x, y1: y, x2: x, y2: y };
      if (draftHolder.el) { try { draftHolder.el.remove(); } catch (e) { } }
      cur.el = shapeNode(cur, '#F66131', 'draft'); cur.el.setAttribute('class', 'fc-shape fc-shape-draft');
      svgLayer.appendChild(cur.el); draftHolder.el = cur.el;
      try { surfaceEl.setPointerCapture(ev.pointerId); } catch (e) { }
      ev.preventDefault(); ev.stopPropagation();
    }
    function move(ev) {
      if (!cur) return; var box = getBox(); if (!box.width) return;
      cur.x2 = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width));
      cur.y2 = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height));
      updateShapeNode(cur.el, cur);
    }
    function up(ev) {
      if (!cur) return; try { surfaceEl.releasePointerCapture(ev.pointerId); } catch (e) { }
      var c = cur; cur = null;
      if (Math.abs(c.x2 - c.x1) + Math.abs(c.y2 - c.y1) < 0.02) { if (draftHolder.el) { try { draftHolder.el.remove(); } catch (e) { } draftHolder.el = null; } return; }
      var shape = { kind: c.kind, x1: r3(c.x1), y1: r3(c.y1), x2: r3(c.x2), y2: r3(c.y2) };
      if (pageNum) shape.page = pageNum;
      api.commentAt(derivePin(shape), ev.clientX, ev.clientY, shape);
      // de pop-over (openInlinePopover→closeInlinePopover) wist de live-draft → teken hem
      // er meteen weer bij zodat de vorm zichtbaar blijft terwijl je de opmerking typt.
      var dEl = shapeNode(shape, '#F66131', 'draft'); dEl.setAttribute('class', 'fc-shape fc-shape-draft');
      svgLayer.appendChild(dEl); draftHolder.el = dEl;
    }
    surfaceEl.addEventListener('pointerdown', down);
    surfaceEl.addEventListener('pointermove', move);
    surfaceEl.addEventListener('pointerup', up);
    surfaceEl.addEventListener('pointercancel', up);
  }
  function klantNaam() {
    if (window.S27DATA && S27DATA.bedrijfsnaam) return S27DATA.bedrijfsnaam();
    return 'Klant';
  }
  function toast(msg, ms) {
    var t = document.getElementById('fcToast');
    if (!t) { t = document.createElement('div'); t.id = 'fcToast'; t.className = 'fc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
  }

  /* ---------------- gateway-calls (X-Act-As-Bedrijf zoals video-review.js) ---- */
  function fcHeaders(token) {
    var h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    if (window.state && state.adminMode && state.activeBedrijf) h['X-Act-As-Bedrijf'] = String(state.activeBedrijf);
    return h;
  }
  async function authedPost(key, payload) {
    try {
      var token = window.S27Auth ? await window.S27Auth.token() : null;
      if (!token) return { ok: false, status: 401, data: {} };
      var r = await fetch(GATEWAY_BASE + '/' + key, {
        method: 'POST', headers: fcHeaders(token), body: JSON.stringify(payload || {}),
      });
      var d = await r.json().catch(function () { return {}; });
      return { ok: r.ok, status: r.status, data: d };
    } catch (e) { return { ok: false, status: 0, data: {} }; }
  }
  function fileToB64(file) {
    return new Promise(function (resolve, reject) {
      var rd = new FileReader();
      rd.onload = function () { resolve(String(rd.result).replace(/^data:[^;]*;base64,/, '')); };
      rd.onerror = function () { reject(new Error('Bestand kon niet gelezen worden.')); };
      rd.readAsDataURL(file);
    });
  }
  function uploadB64(payload, token, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', GATEWAY_BASE + '/fileReviewUpload');
      var h = fcHeaders(token);
      Object.keys(h).forEach(function (k) { xhr.setRequestHeader(k, h[k]); });
      if (xhr.upload && onProgress) {
        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      xhr.addEventListener('load', function () {
        try {
          var d = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && d.ok) resolve(d);
          else reject(new Error(d.message || 'Upload mislukt, probeer opnieuw.'));
        } catch (e) { reject(new Error('Upload mislukt, probeer opnieuw.')); }
      });
      xhr.addEventListener('error', function () { reject(new Error('Netwerkfout bij upload.')); });
      xhr.send(JSON.stringify(payload));
    });
  }

  /* =============================================================================
     OVERLAY-SHELL — gedeeld skelet voor alle niet-video viewers
     -----------------------------------------------------------------------------
     Levert: titel, ALTIJD een download-knop, een viewer-podium (door de reviewer
     gevuld), een comment-composer, en de knoppen 'Goedkeuren' + 'Feedback geven'.
     De reviewer krijgt een 'host' (DOM-podium) + een 'api' om annotaties te voeden.
     ============================================================================= */
  var current = null; // max 1 actieve niet-video review

  function buildShell(ctx) {
    var root = document.createElement('div');
    root.className = 'fc-root';
    root.innerHTML =
      '<div class="fc-shell" role="dialog" aria-label="Bestandsfeedback">' +
      '  <header class="fc-top">' +
      '    <div class="fc-title"><div><h2 id="fcTitle"></h2><div class="fc-subline"><span class="fc-tak" id="fcTak"></span><span class="fc-sub" id="fcSub">Feedbackronde 1</span></div></div></div>' +
      '    <div class="fc-actions">' +
      '      <button id="fcPanelToggle" class="fc-btn fc-ghost fc-paneltoggle" title="Opmerkingen tonen/verbergen" aria-label="Opmerkingen tonen/verbergen"><span class="fc-pt-lbl">Bekijk comments</span><span class="fc-pt-n" id="fcPtN">0</span></button>' +
      '      <button id="fcFeedback" class="fc-btn fc-primary">Feedback indienen <span id="fcCount" class="fc-countbadge fc-hidden">0</span></button>' +
      '      <button id="fcApprove" class="fc-btn fc-approve">Goedkeuren</button>' +
      '      <a id="fcDownload" class="fc-btn fc-ghost fc-iconbtn" target="_blank" rel="noopener" aria-label="Download" title="Download"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
      '      <button id="fcClose" class="fc-x" title="Sluiten" aria-label="Sluiten"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
      '    </div>' +
      '  </header>' +
      '  <div class="fc-loading" id="fcLoading"><div class="fc-spin"></div><p>Bestand wordt geladen…</p></div>' +
      '  <main class="fc-main fc-hidden" id="fcMain">' +
      '    <section class="fc-stagecol">' +
      '      <div class="fc-prevnote fc-hidden" id="fcPrev"></div>' +
      '      <div class="fc-toolrow fc-hidden" id="fcToolrow">' +
      '        <div class="fc-modebar" id="fcModebar" role="tablist" aria-label="Gereedschap">' +
      '          <button class="fc-mode-opt fc-mode-active" id="fcModeComment" data-tool="comment" role="tab" title="Pin plaatsen"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.4 8.4 0 0 1-11.7 7.7L3 21l1.8-6.3A8.4 8.4 0 1 1 21 11.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span>Pin</span></button>' +
      '          <button class="fc-mode-opt" id="fcToolBox" data-tool="box" role="tab" title="Kader tekenen"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="2"/></svg><span>Kader</span></button>' +
      '          <span class="fc-mode-hint" id="fcModeHint"></span>' +
      '        </div>' +
      '        <div class="fc-zoombar fc-hidden" id="fcZoom">' +
      '          <button class="fc-zoom-btn" id="fcZoomOut" title="Uitzoomen" aria-label="Uitzoomen">−</button>' +
      '          <span class="fc-zoom-lvl" id="fcZoomLvl">100%</span>' +
      '          <button class="fc-zoom-btn" id="fcZoomIn" title="Inzoomen" aria-label="Inzoomen">+</button>' +
      '          <button class="fc-zoom-btn fc-zoom-fit" id="fcZoomReset" title="Passend" aria-label="Passend">Passend</button>' +
      '        </div>' +
      '      </div>' +
      '      <div class="fc-stage" id="fcStage"><div class="fc-viewer" id="fcViewer"></div></div>' +
      '    </section>' +
      '    <aside class="fc-panel" id="fcPanel">' +
      '      <div class="fc-panelhead"><h3>Opmerkingen</h3><span id="fcAnnCount" class="fc-chip">0</span><button class="fc-collapse" id="fcCollapse" title="Paneel in-/uitklappen" aria-label="Paneel in-/uitklappen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button></div>' +
      '      <div class="fc-filterbar fc-hidden" id="fcFilter"></div>' +
      '      <div id="fcList" class="fc-list"><p class="fc-empty" id="fcEmpty"></p></div>' +
      '      <div class="fc-composewrap">' +
      '        <div class="fc-compose-lbl">Algemene opmerking <em>(niet aan een plek gekoppeld)</em></div>' +
      '        <textarea id="fcCompose" rows="2" placeholder="Iets dat over het hele bestand gaat…"></textarea>' +
      '        <div id="fcComposeAtts" class="fc-attrow"></div>' +
      '        <div class="fc-composefoot">' +
      '          <label class="fc-attach" title="Bijlage toevoegen"><input id="fcComposeFile" type="file" accept="' + ACCEPT + '" multiple hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m21 12-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6L15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></label>' +
      '          <span class="fc-spacer"></span>' +
      '          <button id="fcComposeAdd" class="fc-btn fc-ghost fc-sm">Toevoegen</button>' +
      '        </div>' +
      '      </div>' +
      '    </aside>' +
      '  </main>' +
      '</div>' +
      '<div id="fcSendScrim" class="fc-scrim fc-hidden"></div>' +
      '<div id="fcSendModal" class="fc-modal fc-hidden">' +
      '  <div class="fc-sendhead"><span class="fc-sendic">📝</span><div><b>Feedback indienen</b><span>Controleer of je feedback volledig is — daarna kun je in deze ronde niets meer toevoegen.</span></div></div>' +
      '  <div class="fc-sendsum" id="fcSendLine"></div>' +
      '  <label class="fc-field"><span>Algemene opmerking <em>(optioneel)</em></span><textarea id="fcSummary" rows="3" placeholder="Feedback die niet aan één punt hangt…"></textarea></label>' +
      '  <label class="fc-confirm"><input type="checkbox" id="fcSendVolledig"><span>Mijn feedback is <b>volledig</b>. Ik begrijp dat ik in deze feedbackronde niets meer kan toevoegen en dat Studio 27 nu start met de verwerking.</span></label>' +
      '  <p id="fcSendErr" class="fc-err fc-hidden"></p>' +
      '  <div class="fc-modalfoot"><button id="fcSendCancel" class="fc-btn fc-ghost">Terug</button><button id="fcSendGo" class="fc-btn fc-primary">Feedback indienen</button></div>' +
      '</div>';
    document.body.appendChild(root);
    document.body.classList.add('fc-open');
    return root;
  }

  /* ---------------- de gedeelde overlay-controller ---------------- */
  async function open(opts) {
    opts = opts || {};
    if (current) { try { current.close(); } catch (e) { } }

    var taskId = String(opts.taskId || (window.state && state.activeProject) || '');
    var url = String(opts.url || '');
    var label = String(opts.label || 'Bestand');
    // projecttitel + tak voor de overlay-kop (nooit 'Open in Drive'); fallback uit window.state
    var projectTitle = String(opts.projectTitle || projectTitleFor(taskId) || label);
    var takLabel = String(opts.takLabel || takLabelFor(taskId) || '');
    if (!url) return;
    if (!taskId) { toast('Dit bestand kan alleen binnen een project geopend worden.', 3600); return; }

    var st = {
      taskId: taskId, url: url, annotations: [], reviewAttachments: [],
      composerAtts: [], uploadsBusy: 0, closed: false, locked: false,
      streamUrl: null, downloadUrl: null, mediaType: opts.mediaType || guessType(url),
      reviewer: null, mode: 'comment', tool: 'comment', _pop: null, filter: 'all', sort: 'new',
    };

    var root = buildShell(st);
    var $ = function (id) { return root.querySelector('#' + id); };
    $('fcTitle').textContent = projectTitle;
    if (takLabel) $('fcTak').textContent = takLabel; else $('fcTak').classList.add('fc-hidden');

    function vrLift(on) { try { document.body.classList.toggle('fc-lift', !!on); } catch (e) { } }

    // nav-klik in de sidebar sluit de review eerst (zoals video-review)
    var navClose = function (e) { if (!st.closed && e.target.closest && e.target.closest('.sb-item')) close(); };
    document.addEventListener('click', navClose, true);

    function close() {
      if (st.closed) return;
      try { if (st._saveDraft) st._saveDraft(); } catch (e) { }   // item 5: bewaar lopende feedback bij sluiten
      st.closed = true;
      vrLift(false);
      try { closeInlinePopover(); } catch (e) { }
      try { closeAnnBubble(); } catch (e) { }
      try { document.removeEventListener('click', navClose, true); } catch (e) { }
      try { if (st.reviewer && st.reviewer.destroy) st.reviewer.destroy(); } catch (e) { }
      try { document.body.classList.remove('fc-open'); } catch (e) { }
      try { root.remove(); } catch (e) { }
      current = null;
    }
    $('fcClose').addEventListener('click', function () {
      // niet-ingediende feedback wordt automatisch bewaard (item 5) → geen blokkerende vraag,
      // wel een korte geruststelling als er iets openstaat.
      if (!st.locked && (st.annotations.length || ($('fcCompose') && $('fcCompose').value.trim()))) {
        try { if (st._saveDraft) st._saveDraft(); } catch (e) { }
        toast('Je feedback is bewaard — je kunt later verder.', 2600);
      }
      close();
    });
    current = { close: close };

    /* ---- context ophalen ---- */
    var ctx = await authedPost('fileReviewContext', { task_id: taskId, url: url });
    var d = ctx.data || {};
    if (st.closed) return;
    if (!ctx.ok || !d.ok) {
      // NOOIT wegnavigeren naar Google Drive: blijf in het portaal met een nette kaart +
      // een handmatige 'open origineel'-knop (de klant kiest zelf of die het portaal verlaat).
      $('fcLoading').classList.add('fc-hidden');
      $('fcMain').classList.remove('fc-hidden');
      var vfb = $('fcViewer');
      if (vfb) vfb.innerHTML = '<div class="fc-foto"><div class="fc-foto-card"><div class="fc-foto-ic">📄</div><b>Voorvertoning niet beschikbaar</b><p>' +
        _esc((d && d.message) || 'We konden dit bestand niet in het portaal inladen. Probeer het zo opnieuw.') +
        '</p><button class="fc-btn fc-primary" id="fcRetry">Probeer opnieuw</button></div></div>';
      var rt = $('fcRetry'); if (rt) rt.addEventListener('click', function () { close(); open(opts); });
      var sub = $('fcSub'); if (sub) sub.textContent = 'Kon niet inladen';
      return;
    }
    // Server zegt dat dit (bv. een Drive-bestand zonder extensie) eigenlijk een video is →
    // geef door aan de frame-accurate video-review i.p.v. hier te renderen (geen Drive-redirect).
    if (d.mediaType === 'video' || d.route === 'videoReview') {
      close();
      if (window.S27VideoReview && typeof S27VideoReview.open === 'function') {
        S27VideoReview.open({ url: url, label: label, taskId: taskId, sourceEl: opts.sourceEl });
      } else { window.open((d && d.open_url) || url, '_blank', 'noopener'); }
      return;
    }
    if (d.mediaType) st.mediaType = d.mediaType;
    // Eén losse afbeelding (eigen stream, geen Drive-map/picflow-galerij) → inline pin-bare
    // foto-reviewer i.p.v. de galerij-launcher.
    if (st.mediaType === 'foto' && d.stream_url && !parseDriveFolderId(url) && !/picflow/.test(String(url))) st.mediaType = 'image';
    st.streamUrl = gwUrl(d.stream_url) || url;
    st.downloadUrl = gwUrl(d.download_url) || url;
    st.locked = d.is_read_only === true || d.lr_state === 'approved';

    // download-knop is ALTIJD aanwezig; respecteer can_download. Tooltip legt uit dat
    // downloaden pas kan na goedkeuring (item 7).
    var dl = $('fcDownload');
    if (d.can_download === false) {
      dl.removeAttribute('href');
      dl.classList.add('fc-disabled');
      dl.setAttribute('aria-disabled', 'true');
      dl.title = 'Download is enkel beschikbaar als je het bestand hebt goedgekeurd.';
    } else {
      dl.href = st.downloadUrl + (st.downloadUrl.indexOf('?') >= 0 ? '&' : '?') + 'name=' + encodeURIComponent(label);
      dl.title = 'Download dit goedgekeurde bestand';
    }

    // Feedbackronde altijd tonen (item 6); veilige fallback als de server geen ronde meegeeft.
    var ronde = Number(d.ronde) || (d.last_bundle ? 2 : 1);
    $('fcSub').textContent = 'Feedbackronde ' + ronde;
    if (st.locked) {
      $('fcSub').textContent = 'Feedbackronde ' + ronde + ' · ' + ((d.lr_state === 'approved') ? 'Goedgekeurd ✓' : 'Ingediend');
      root.classList.add('fc-locked');
      var prev = $('fcPrev');
      prev.classList.remove('fc-hidden');
      prev.classList.add('fc-lockbanner');
      prev.innerHTML = (d.lr_state === 'approved')
        ? 'Dit bestand is goedgekeurd — mooi zo! Hieronder vind je alles als naslag terug.'
        : 'Je feedback op dit bestand is definitief doorgestuurd. Hieronder zie je alles als naslag.';
      // bewaarde bundel terug tonen
      var lb = d.last_bundle || null;
      if (lb && Array.isArray(lb.annotations)) {
        st.annotations = lb.annotations.map(function (a, i) {
          return {
            id: 'prev_' + i, comment: String(a.comment || ''), type: a.type || 'wijziging', pin: a.pin || null, shape: a.shape || null, locked: true,
            replies: Array.isArray(a.replies) ? a.replies.map(function (r) { return { text: String(r.text || ''), createdAt: r.createdAt || null }; }) : [],
            attachments: (a.attachments || []).map(function (x) { return { filename: String(x.filename || 'bijlage'), url: gwUrl(x.url), uploadStatus: 'stored' }; }),
          };
        });
      }
      if (lb && lb.summary) { prev.innerHTML += '<br><span class="fc-locksum">Algemene opmerking: ' + _esc(lb.summary) + '</span>'; }
    }

    /* ---- OFFLINE DRAFT (item 5): herstel lopende feedback van deze ronde; bij een
           afgesloten (locked) ronde negeren + de wees-draft opruimen. ---- */
    st._draftKey = draftKey(taskId, url, ronde);
    if (st.locked) {
      try { localStorage.removeItem(st._draftKey); } catch (e) { }
    } else {
      try {
        var rawD = localStorage.getItem(st._draftKey);
        if (rawD) {
          var snap = JSON.parse(rawD);
          if (snap && (Date.now() - (snap.savedAt || 0)) > 30 * 24 * 3600 * 1000) { localStorage.removeItem(st._draftKey); snap = null; }
          if (snap && Array.isArray(snap.annotations)) {
            snap.annotations.forEach(function (a) {
              st.annotations.push({ id: a.id || rid('ann'), comment: a.comment || '', type: a.type || 'wijziging', pin: a.pin || null, shape: a.shape || null, replies: a.replies || [], attachments: a.attachments || [], createdAt: a.createdAt || new Date().toISOString() });
            });
            if (Array.isArray(snap.composerAtts)) st.composerAtts = snap.composerAtts.slice();
            st._restoreComposer = snap.composer || '';
            st._restoreSummary = snap.summary || '';
          }
        }
      } catch (e) { }
    }
    function draftSnapshot() {
      return {
        v: 1, savedAt: Date.now(),
        annotations: st.annotations.filter(function (a) { return !a.locked; }).map(function (a) {
          return { id: a.id, comment: a.comment, type: a.type || 'wijziging', pin: a.pin || null, shape: a.shape || null, replies: (a.replies || []).map(function (r) { return { text: r.text, createdAt: r.createdAt || null }; }), attachments: (a.attachments || []).filter(function (x) { return x.uploadStatus === 'stored'; }).map(cleanAttPayload) };
        }),
        composer: ($('fcCompose') ? $('fcCompose').value : ''),
        composerAtts: st.composerAtts.filter(function (x) { return x.uploadStatus === 'stored'; }).map(cleanAttPayload),
        summary: ($('fcSummary') ? $('fcSummary').value : ''),
      };
    }
    var _saveT = 0;
    function scheduleSave() { if (st.locked) return; clearTimeout(_saveT); _saveT = setTimeout(saveDraft, 600); }
    function saveDraft() {
      if (st.locked) return;
      try {
        var snap = draftSnapshot();
        if (!snap.annotations.length && !snap.composer.trim() && !snap.summary.trim() && !snap.composerAtts.length) { localStorage.removeItem(st._draftKey); return; }
        localStorage.setItem(st._draftKey, JSON.stringify(snap));
      } catch (e) { }
    }
    st._scheduleSave = scheduleSave; st._saveDraft = saveDraft;

    /* ---- INLINE POP-OVER-EDITOR (ruttl-stijl): typ je opmerking + bijlage exact op de
           klikplek; 'Plaats' commit de annotatie, 'Annuleren' gooit de draftpin weg. ---- */
    function closeInlinePopover() {
      if (!st._pop) return;
      try { document.removeEventListener('keydown', st._pop._esc); } catch (e) { }
      try { st._pop.remove(); } catch (e) { }
      st._pop = null;
      try { if (st.reviewer && st.reviewer.clearDraftPin) st.reviewer.clearDraftPin(); } catch (e) { }
      try { if (st.reviewer && st.reviewer.clearDraftShape) st.reviewer.clearDraftShape(); } catch (e) { }
    }
    function openInlinePopover(pin, cx, cy, existing, shape) {
      if (st.locked) { toast('Dit bestand is al doorgestuurd — feedback is vergrendeld.', 3600); return; }
      closeInlinePopover();
      try { closeAnnBubble(); } catch (e) { }
      var selType = (existing && existing.type) || 'wijziging';
      var typeChips = ANN_TYPES.map(function (t) {
        return '<button type="button" class="fc-typechip' + (t.key === selType ? ' on' : '') + '" data-t="' + t.key + '" style="--tc:' + t.color + '">' + t.label + '</button>';
      }).join('');
      var pop = document.createElement('div');
      pop.className = 'fc-pop';
      pop.innerHTML =
        '<div class="fc-pop-head"><span class="fc-pop-dot" style="background:' + annType(selType).color + '">' + (existing ? '✎' : (st.annotations.length + 1)) + '</span><b>' + (existing ? 'Opmerking bewerken' : 'Nieuwe opmerking') + '</b><button class="fc-pop-x" title="Annuleren" aria-label="Annuleren">×</button></div>' +
        '<div class="fc-typebar">' + typeChips + '</div>' +
        '<textarea class="fc-pop-ta" rows="3" placeholder="Wat wil je hier aangepast zien?"></textarea>' +
        '<div class="fc-pop-atts fc-attrow"></div>' +
        '<div class="fc-pop-foot">' +
        '  <label class="fc-attach fc-sm" title="Bijlage toevoegen"><input type="file" accept="' + ACCEPT + '" multiple hidden><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m21 12-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6L15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></label>' +
        '  <span class="fc-spacer"></span>' +
        '  <button class="fc-btn fc-ghost fc-sm fc-pop-cancel">Annuleren</button>' +
        '  <button class="fc-btn fc-primary fc-sm fc-pop-save">' + (existing ? 'Opslaan' : 'Plaats') + '</button>' +
        '</div>';
      document.body.appendChild(pop);
      st._pop = pop;
      var PW = 290, PH = pop.offsetHeight || 230;
      var x = Math.min(Math.max(10, (cx || window.innerWidth / 2) + 14), window.innerWidth - PW - 10);
      var y = Math.min(Math.max(70, (cy || window.innerHeight / 2) - 10), window.innerHeight - PH - 12);
      pop.style.left = x + 'px'; pop.style.top = y + 'px';
      var ta = pop.querySelector('.fc-pop-ta'); setTimeout(function () { try { ta.focus(); } catch (e) { } }, 30);
      var atts = [], attRow = pop.querySelector('.fc-pop-atts');
      function rerenderAtts() {
        attRow.innerHTML = '';
        atts.filter(function (a) { return a.uploadStatus === 'stored'; }).forEach(function (att) {
          attRow.appendChild(attChip(att, function () { atts.splice(atts.indexOf(att), 1); rerenderAtts(); }));
        });
      }
      // type-keuze
      pop.querySelectorAll('.fc-typechip').forEach(function (b) {
        b.addEventListener('click', function () {
          selType = b.getAttribute('data-t');
          pop.querySelectorAll('.fc-typechip').forEach(function (x) { x.classList.toggle('on', x === b); });
          var dot = pop.querySelector('.fc-pop-dot'); if (dot) dot.style.background = annType(selType).color;
        });
      });
      // bestaande waarden tonen (bewerken)
      if (existing) {
        ta.value = existing.comment || '';
        (existing.attachments || []).forEach(function (a) { atts.push(a); });
        rerenderAtts();
      }
      pop.querySelector('input[type=file]').addEventListener('change', function (e) {
        Array.prototype.forEach.call(e.target.files, function (f) { addUpload(f, attRow, atts, rerenderAtts); });
        e.target.value = '';
      });
      function cancel() { closeInlinePopover(); }
      pop.querySelector('.fc-pop-x').addEventListener('click', cancel);
      pop.querySelector('.fc-pop-cancel').addEventListener('click', cancel);
      pop.querySelector('.fc-pop-save').addEventListener('click', function () {
        var text = ta.value.trim();
        if (!text) { ta.focus(); toast('Schrijf eerst je opmerking.'); return; }
        if (st.uploadsBusy > 0) { toast('Even wachten tot de bijlage klaar is…'); return; }
        var stored = atts.filter(function (x) { return x.uploadStatus === 'stored'; });
        if (existing) {
          existing.comment = text; existing.type = selType; existing.attachments = stored;
        } else {
          st.annotations.push({ id: rid('ann'), comment: text, type: selType, pin: pin || null, shape: shape || null, attachments: stored, replies: [], createdAt: new Date().toISOString() });
        }
        st._pop = null; try { pop.remove(); } catch (e) { }
        try { if (st.reviewer && st.reviewer.clearDraftPin) st.reviewer.clearDraftPin(); } catch (e) { }
        try { if (st.reviewer && st.reviewer.clearDraftShape) st.reviewer.clearDraftShape(); } catch (e) { }
        renderAll();
        toast(existing ? 'Opmerking bijgewerkt ✓' : 'Opmerking geplaatst ✓');
      });
      pop._esc = function (e) { if (e.key === 'Escape') cancel(); };
      document.addEventListener('keydown', pop._esc);
    }

    /* ---- READ-ONLY COMMENT-BUBBLE (item 9): klik op een pin of kader → toon de opmerking
           direct ter plaatse, met sluitknop. ---- */
    function closeAnnBubble() {
      if (!st._bubble) return;
      try { document.removeEventListener('keydown', st._bubble._esc, true); } catch (e) { }
      try { document.removeEventListener('mousedown', st._bubble._out, true); } catch (e) { }
      try { st._bubble.remove(); } catch (e) { }
      st._bubble = null;
    }
    function showAnnBubble(annId, cx, cy) {
      closeAnnBubble(); closeInlinePopover();
      var a = st.annotations.filter(function (x) { return x.id === annId; })[0];
      if (!a) return;
      var t = annType(a.type);
      var idx = st.annotations.indexOf(a);
      var b = document.createElement('div');
      b.className = 'fc-bubble';
      b.innerHTML =
        '<div class="fc-bubble-head"><span class="fc-pop-dot" style="background:' + t.color + '">' + (idx + 1) + '</span>' +
        '<span class="fc-typetag" style="--tc:' + t.color + '">' + t.label + '</span>' +
        '<button class="fc-pop-x" title="Sluiten" aria-label="Sluiten">×</button></div>' +
        '<div class="fc-bubble-tx"></div><div class="fc-attrow fc-bubble-atts"></div><div class="fc-bubble-reps"></div>';
      b.querySelector('.fc-bubble-tx').textContent = a.comment || '';
      var ar = b.querySelector('.fc-bubble-atts');
      (a.attachments || []).forEach(function (att) { ar.appendChild(attChip(att, null)); });
      var rp = b.querySelector('.fc-bubble-reps');
      (a.replies || []).forEach(function (r) {
        var rEl = document.createElement('div'); rEl.className = 'fc-reply';
        rEl.innerHTML = '<span class="fc-reply-dot" style="background:' + t.color + '"></span><span class="fc-reply-tx"></span>';
        rEl.querySelector('.fc-reply-tx').textContent = r.text || '';
        rp.appendChild(rEl);
      });
      document.body.appendChild(b);
      st._bubble = b;
      var BW = 280, BH = b.offsetHeight || 160;
      var x = Math.min(Math.max(10, (cx || window.innerWidth / 2) + 14), window.innerWidth - BW - 10);
      var y = Math.min(Math.max(70, (cy || window.innerHeight / 2) - 10), window.innerHeight - BH - 12);
      b.style.left = x + 'px'; b.style.top = y + 'px';
      b.querySelector('.fc-pop-x').addEventListener('click', closeAnnBubble);
      b._esc = function (e) { if (e.key === 'Escape') closeAnnBubble(); };
      b._out = function (e) { if (st._bubble && !st._bubble.contains(e.target) && !(e.target.closest && e.target.closest('.fc-pin,.fc-shape'))) closeAnnBubble(); };
      document.addEventListener('keydown', b._esc, true);
      setTimeout(function () { document.addEventListener('mousedown', b._out, true); }, 0);
      if (st.reviewer && st.reviewer.highlightPin) try { st.reviewer.highlightPin(annId, true); } catch (e) { }
    }

    /* ---- viewer-api die de reviewer mag aanspreken ---- */
    var viewerApi = {
      host: $('fcViewer'),
      stream_url: st.streamUrl,
      download_url: st.downloadUrl,
      url: url,
      locked: st.locked,
      // huidige modus ('comment' = klik plaatst een opmerking, 'browse' = vrij bekijken)
      mode: function () { return st.mode; },
      // actief gereedschap: 'comment' | 'arrow' | 'box' | 'highlight' | 'browse'
      tool: function () { return st.tool || 'comment'; },
      // klik-to-comment: open de inline pop-over-editor exact op de klikplek; optionele markup-shape
      commentAt: function (pin, cx, cy, shape) {
        if (st.locked) { toast('Dit bestand is al doorgestuurd — feedback is vergrendeld.', 3600); return; }
        openInlinePopover(pin, cx, cy, null, shape);
      },
      // klik op een pin/kader → toon de opmerking read-only ter plaatse (item 9)
      showComment: function (annId, cx, cy) { showAnnBubble(annId, cx, cy); },
      closeComment: function () { try { closeAnnBubble(); } catch (e) { } },
      // back-compat: oude reviewers die enkel een pin doorgeven → pop-over centraal
      composeWithPin: function (pin) { openInlinePopover(pin, null, null); },
      addAnnotation: function (a) {
        if (st.locked) { toast('Dit bestand is al doorgestuurd — feedback is vergrendeld.', 3600); return; }
        st.annotations.push({ id: rid('ann'), comment: String(a && a.comment || ''), pin: (a && a.pin) || null, attachments: (a && a.attachments) || [], createdAt: new Date().toISOString() });
        renderAll();
      },
      // pin↔kaart-koppeling: viewer meldt hover op een pin → wij lichten de kaart op
      highlightCard: function (annId, on) {
        var c = $('fcList').querySelector('.fc-card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(annId) : annId) + '"]');
        if (c) { c.classList.toggle('fc-card-active', !!on); if (on) c.scrollIntoView({ block: 'nearest' }); }
      },
      getAnnotations: function () { return st.annotations.slice(); },
      // pin verslepen: commit een nieuwe genormaliseerde positie voor één annotatie
      updatePin: function (annId, pin) {
        if (st.locked) return;
        var a = st.annotations.filter(function (x) { return x.id === annId; })[0];
        if (!a) return;
        a.pin = pin;
        renderAll();
        toast('Pin verplaatst ✓', 1500);
      },
      toast: toast,
      esc: _esc,
      gwUrl: gwUrl,
    };

    /* ---- de juiste reviewer kiezen + initialiseren ---- */
    var def = REVIEWERS[st.mediaType] || REVIEWERS.other;
    st.reviewer = def;
    try {
      if (def.init) await def.init(viewerApi, d);
    } catch (e) {
      // viewer kapot → degradeer naar 'other' (download + tekst), niet hard falen
      try { viewerApi.host.innerHTML = ''; } catch (e2) { }
      st.mediaType = 'other'; st.reviewer = REVIEWERS.other;
      try { if (REVIEWERS.other.init) await REVIEWERS.other.init(viewerApi, d); } catch (e3) { }
    }
    if (st.closed) return;
    $('fcLoading').classList.add('fc-hidden');
    $('fcMain').classList.remove('fc-hidden');
    $('fcEmpty').innerHTML = def.emptyHint || 'Nog geen feedback. Typ hieronder je opmerking en klik <strong>Toevoegen aan lijst</strong>.';

    /* ---- gereedschap: enkel Pin + Kader (pin-viewers: pdf/image/office/pptx) ---- */
    if (def.pins && !st.locked) {
      $('fcToolrow').classList.remove('fc-hidden');
      var mb = $('fcModebar');
      var toolBtns = mb.querySelectorAll('.fc-mode-opt');
      var setTool = function (t) {
        st.tool = t; st.mode = t; // mode = back-compat-alias
        toolBtns.forEach(function (b) { b.classList.toggle('fc-mode-active', b.getAttribute('data-tool') === t); });
        try {
          viewerApi.host.classList.toggle('fc-commenting', t === 'comment');
          viewerApi.host.classList.toggle('fc-marking', t === 'box');
        } catch (e) { }
      };
      toolBtns.forEach(function (b) { b.addEventListener('click', function () { setTool(b.getAttribute('data-tool')); }); });
      setTool('comment');
      // zoom (item 13) — enkel voor viewers met setZoom (pdf/office/pptx)
      if (def.setZoom) {
        $('fcZoom').classList.remove('fc-hidden');
        st.zoom = 1;
        var applyZoom = function (z) {
          st.zoom = Math.max(0.5, Math.min(3, Math.round(z * 100) / 100));
          try { if (st.reviewer && st.reviewer.setZoom) st.reviewer.setZoom(st.zoom); } catch (e) { }
          var lv = $('fcZoomLvl'); if (lv) lv.textContent = Math.round(st.zoom * 100) + '%';
        };
        $('fcZoomIn').addEventListener('click', function () { applyZoom(st.zoom + 0.25); });
        $('fcZoomOut').addEventListener('click', function () { applyZoom(st.zoom - 0.25); });
        $('fcZoomReset').addEventListener('click', function () { applyZoom(1); });
      }
    }
    /* ---- comment-paneel tonen/verbergen — STANDAARD DICHT (item 8/14) ---- */
    var _collapsed = true;
    function setCollapsed(c) {
      _collapsed = c;
      $('fcPanel').classList.toggle('fc-panel-collapsed', c);
      document.body.classList.toggle('fc-panel-hidden', c);
      $('fcPanelToggle').classList.toggle('fc-pt-on', !c);   // 'verberg'-staat licht op
      var lbl = $('fcPanelToggle').querySelector('.fc-pt-lbl');
      if (lbl) lbl.textContent = c ? 'Bekijk comments' : 'Verberg comments';
    }
    $('fcCollapse').addEventListener('click', function () { setCollapsed(true); });
    $('fcPanelToggle').addEventListener('click', function () { setCollapsed(!_collapsed); });
    setCollapsed(true);

    /* ---- composer (lijst van losse feedbackpunten) ---- */
    function renderComposeAtts() {
      var row = $('fcComposeAtts'); row.innerHTML = '';
      st.composerAtts.filter(function (a) { return a.uploadStatus === 'stored'; }).forEach(function (att) {
        row.appendChild(attChip(att, function () {
          st.composerAtts.splice(st.composerAtts.indexOf(att), 1); renderComposeAtts();
        }));
      });
    }
    function attChip(att, onRemove) {
      var chip = document.createElement('span');
      chip.className = 'fc-attchip';
      var u = gwUrl(att.url || att.fileUrl);
      chip.innerHTML = (isImg(att.contentType) && u ? '<img src="' + _esc(u) + '" alt="">' : '<span class="fc-ico">' + fileIcon(att.filename) + '</span>') +
        '<a class="fc-nm" target="_blank" rel="noopener"></a>' + (onRemove ? '<button class="fc-xs" title="Verwijderen">×</button>' : '');
      var nm = chip.querySelector('.fc-nm');
      nm.textContent = att.filename;
      if (u) nm.href = u;
      if (onRemove) chip.querySelector('.fc-xs').addEventListener('click', onRemove);
      return chip;
    }
    async function addUpload(file, rowEl, collection, rerender) {
      var e = extOf(file.name);
      if (EXT_ALLOW.indexOf(e) < 0) { toast('Dit bestandstype kan niet: beeld, PDF, font of ZIP.', 3600); return; }
      if (file.size > MAX_BYTES) { toast('"' + file.name + '" is groter dan 15 MB.', 3600); return; }
      var chip = document.createElement('span');
      chip.className = 'fc-attchip fc-uploading';
      chip.innerHTML = (isImg(file.type) ? '<img src="' + URL.createObjectURL(file) + '" alt="">' : '<span class="fc-ico">' + fileIcon(file.name) + '</span>') +
        '<span class="fc-nm"></span><span class="fc-prog"><i></i></span>';
      chip.querySelector('.fc-nm').textContent = file.name;
      rowEl.appendChild(chip);
      var entry = { uploadStatus: 'pending', filename: file.name };
      collection.push(entry);
      st.uploadsBusy++;
      try {
        var b64 = await fileToB64(file);
        var token = window.S27Auth ? await window.S27Auth.token() : null;
        if (!token) throw new Error('Niet ingelogd.');
        var meta = await uploadB64({ task_id: st.taskId, filename: file.name, file_data: b64 }, token,
          function (p) { var el = chip.querySelector('.fc-prog i'); if (el) el.style.height = p + '%'; });
        Object.assign(entry, meta);
        rerender();
      } catch (err) {
        collection.splice(collection.indexOf(entry), 1); chip.remove();
        toast(err.message || 'Upload mislukt.', 3800);
      } finally { st.uploadsBusy--; }
    }
    $('fcComposeFile').addEventListener('change', function (e) {
      Array.prototype.forEach.call(e.target.files, function (f) { addUpload(f, $('fcComposeAtts'), st.composerAtts, renderComposeAtts); });
      e.target.value = '';
    });
    $('fcComposeAdd').addEventListener('click', function () {
      if (st.locked) { toast('Dit bestand is al doorgestuurd.', 2800); return; }
      var text = $('fcCompose').value.trim();
      if (!text) { toast('Schrijf eerst je opmerking.'); return; }
      if (st.uploadsBusy > 0) { toast('Even wachten tot de bijlage klaar is…'); return; }
      st.annotations.push({
        id: rid('ann'), comment: text, pin: st.pendingPin || null,
        attachments: st.composerAtts.filter(function (x) { return x.uploadStatus === 'stored'; }),
        createdAt: new Date().toISOString(),
      });
      st.pendingPin = null; st.composerAtts = [];
      $('fcCompose').value = '';
      renderComposeAtts(); renderAll();
      toast('Toegevoegd aan je feedbacklijst ✓');
    });

    /* ---- lijst renderen ---- */
    function renderFilterBar() {
      var fb = $('fcFilter'); if (!fb) return;
      var n = st.annotations.length;
      if (n < 2) { fb.classList.add('fc-hidden'); fb.innerHTML = ''; return; }
      fb.classList.remove('fc-hidden');
      var counts = {};
      st.annotations.forEach(function (a) { var k = a.type || 'wijziging'; counts[k] = (counts[k] || 0) + 1; });
      var chips = '<button class="fc-fbtn' + (st.filter === 'all' ? ' on' : '') + '" data-f="all">Alle <i>' + n + '</i></button>';
      chips += ANN_TYPES.map(function (t) {
        if (!counts[t.key]) return '';
        return '<button class="fc-fbtn' + (st.filter === t.key ? ' on' : '') + '" data-f="' + t.key + '" style="--tc:' + t.color + '">' + t.label + ' <i>' + counts[t.key] + '</i></button>';
      }).join('');
      var sortLbl = st.sort === 'new' ? 'Nieuwste' : (st.sort === 'old' ? 'Oudste' : 'Pagina');
      chips += '<span class="fc-spacer"></span><button class="fc-sortbtn" title="Sorteren">⇅ ' + sortLbl + '</button>';
      fb.innerHTML = chips;
      fb.querySelectorAll('.fc-fbtn').forEach(function (b) { b.addEventListener('click', function () { st.filter = b.getAttribute('data-f'); renderAll(); }); });
      var sb = fb.querySelector('.fc-sortbtn'); if (sb) sb.addEventListener('click', function () { st.sort = st.sort === 'new' ? 'old' : (st.sort === 'old' ? 'page' : 'new'); renderAll(); });
    }
    function renderAll() {
      var n = st.annotations.length;
      $('fcAnnCount').textContent = n;
      $('fcCount').textContent = n;
      $('fcCount').classList.toggle('fc-hidden', n === 0);
      $('fcEmpty').classList.toggle('fc-hidden', n > 0);
      var ptn = $('fcPtN'); if (ptn) ptn.textContent = n;
      renderFilterBar();
      var list = $('fcList');
      list.querySelectorAll('.fc-card, .fc-noresult').forEach(function (el) { el.remove(); });

      // KAART-volgorde = filter+sort; het PINNUMMER blijft de globale index zodat pin↔kaart matchen.
      var view = st.annotations.map(function (a, gi) { return { a: a, num: gi + 1 }; });
      if (st.filter !== 'all') view = view.filter(function (o) { return (o.a.type || 'wijziging') === st.filter; });
      if (st.sort === 'old') view = view.slice().reverse();
      else if (st.sort === 'page') view = view.slice().sort(function (x, y) { return (((x.a.pin && x.a.pin.page) || 999) - ((y.a.pin && y.a.pin.page) || 999)); });
      if (n > 0 && !view.length) { var nr = document.createElement('p'); nr.className = 'fc-noresult fc-empty'; nr.textContent = 'Geen opmerkingen van dit type.'; list.appendChild(nr); }

      view.forEach(function (o) {
        var a = o.a, num = o.num, t = annType(a.type);
        var card = document.createElement('div');
        card.className = 'fc-card' + (a.pin ? ' fc-card-pinned' : '');
        card.dataset.id = a.id;
        card.style.setProperty('--tc', t.color);
        card.innerHTML =
          '<div class="fc-cardtop"><span class="fc-pindot" style="background:' + t.color + '">' + num + '</span>' +
          '<span class="fc-typetag">' + t.label + '</span>' +
          (a.shape ? '<span class="fc-shapechip">' + shapeIcon(a.shape.kind) + ' ' + shapeLabelF(a.shape.kind) + '</span>' : (a.pin ? '<span class="fc-timechip">' + _esc(pinLabel(a.pin)) + '</span>' : '')) +
          (a.locked ? '' : '<button class="fc-edit-c" title="Bewerken" aria-label="Bewerken"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18 10l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button><button class="fc-del" title="Verwijderen">×</button>') +
          '</div>' +
          '<div class="fc-cardtxt"></div><div class="fc-attrow"></div>' +
          '<div class="fc-replies"></div>' +
          (a.locked ? '' : '<button class="fc-replybtn">+ reactie</button>');
        card.querySelector('.fc-cardtxt').textContent = a.comment;
        var arow = card.querySelector('.fc-attrow');
        (a.attachments || []).forEach(function (att) { arow.appendChild(attChip(att, null)); });
        var repWrap = card.querySelector('.fc-replies');
        (a.replies || []).forEach(function (r) {
          var rEl = document.createElement('div'); rEl.className = 'fc-reply';
          rEl.innerHTML = '<span class="fc-reply-dot"></span><span class="fc-reply-tx"></span>';
          rEl.querySelector('.fc-reply-tx').textContent = r.text || '';
          repWrap.appendChild(rEl);
        });
        if (a.pin) {
          card.addEventListener('click', function (e) {
            if (e.target.closest('.fc-del') || e.target.closest('.fc-edit-c') || e.target.closest('.fc-replybtn') || e.target.closest('.fc-attchip') || e.target.closest('.fc-reply-input')) return;
            if (st.reviewer && st.reviewer.goToPin) try { st.reviewer.goToPin(a.pin); } catch (er) { }
          });
          card.addEventListener('mouseenter', function () { if (st.reviewer && st.reviewer.highlightPin) try { st.reviewer.highlightPin(a.id, true); } catch (er) { } });
          card.addEventListener('mouseleave', function () { if (st.reviewer && st.reviewer.highlightPin) try { st.reviewer.highlightPin(a.id, false); } catch (er) { } });
        }
        var del = card.querySelector('.fc-del');
        if (del) del.addEventListener('click', function () { st.annotations = st.annotations.filter(function (x) { return x.id !== a.id; }); renderAll(); });
        var edit = card.querySelector('.fc-edit-c');
        if (edit) edit.addEventListener('click', function (e) { e.stopPropagation(); openInlinePopover(a.pin || null, null, null, a); });
        var rb = card.querySelector('.fc-replybtn');
        if (rb) rb.addEventListener('click', function (e) {
          e.stopPropagation();
          if (card.querySelector('.fc-reply-input')) { card.querySelector('.fc-reply-input input').focus(); return; }
          var box = document.createElement('div'); box.className = 'fc-reply-input';
          box.innerHTML = '<input type="text" placeholder="Reactie of verduidelijking…"><button class="fc-btn fc-primary fc-sm">Plaats</button>';
          repWrap.appendChild(box);
          var inp = box.querySelector('input'); inp.focus();
          function add() { var v = inp.value.trim(); if (!v) { inp.focus(); return; } a.replies = a.replies || []; a.replies.push({ text: v, createdAt: new Date().toISOString() }); renderAll(); }
          box.querySelector('button').addEventListener('click', add);
          inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') add(); });
        });
        list.appendChild(card);
      });
      if (st.reviewer && st.reviewer.onAnnotationsChanged) try { st.reviewer.onAnnotationsChanged(st.annotations); } catch (er) { }
      if (st._scheduleSave) st._scheduleSave();   // item 5: bewaar na elke mutatie
    }
    function pinLabel(pin) {
      if (!pin) return '';
      if (pin.timestampSec != null) return '🕑 ' + fmtClock(pin.timestampSec);
      if (pin.page != null) return 'p.' + pin.page;
      if (pin.xNorm != null) return '📍';
      return '';
    }

    /* ---- GOEDKEUREN ---- */
    $('fcApprove').addEventListener('click', async function () {
      if (st.locked) { toast('Dit bestand is al afgerond.', 2800); return; }
      if (st.annotations.length && !confirm('Je hebt nog niet-verzonden feedbackpunten. Toch goedkeuren? (Die punten worden dan niet verstuurd.)')) return;
      if (!confirm('Keur je dit bestand definitief goed? Daarna sluiten we de feedbackronde voor dit bestand af.')) return;
      var ab = $('fcApprove'); ab.disabled = true; ab.textContent = 'Goedkeuren…';
      var res = await authedPost('linkApprove', { task_id: st.taskId, url: st.url, klant_naam: klantNaam() });
      if (res.ok && res.data && res.data.ok) {
        try { localStorage.removeItem(st._draftKey); } catch (e) { }   // item 5: draft opruimen bij goedkeuren
        close();
        toast(res.data.all_approved
          ? '🎉 Goedgekeurd — bedankt! Alles van dit onderdeel is nu af.'
          : '🎉 Goedgekeurd! Keur je de overige bestanden van dit onderdeel ook goed, dan ronden we het af.', 4600);
        refreshDetail();
      } else {
        ab.disabled = false; ab.textContent = 'Goedkeuren';
        toast((res.data && res.data.message) || 'Goedkeuren lukte net niet — probeer zo opnieuw.', 3600);
      }
    });

    /* ---- FEEDBACK GEVEN (verzend-modal) ---- */
    $('fcFeedback').addEventListener('click', function () {
      if (st.locked) { toast('Je feedback is al definitief doorgestuurd.', 3200); return; }
      // los tekstveld dat nog niet in de lijst staat: meenemen als laatste punt
      var pending = $('fcCompose').value.trim();
      var n = st.annotations.length + (pending ? 1 : 0);
      if (!n) { toast('Plaats eerst minstens één feedbackpunt of typ je opmerking.'); return; }
      var attN = st.reviewAttachments.length + st.annotations.reduce(function (s, a) { return s + (a.attachments || []).length; }, 0) + st.composerAtts.length;
      $('fcSendLine').innerHTML = '<span class="fc-sumchip">' + n + ' feedbackpunt' + (n === 1 ? '' : 'en') + '</span>' +
        (attN ? '<span class="fc-sumchip">' + attN + ' bijlage' + (attN === 1 ? '' : 'n') + '</span>' : '');
      var vk = $('fcSendVolledig'); if (vk) vk.checked = false;
      $('fcSendErr').classList.add('fc-hidden');
      vrLift(true);
      $('fcSendScrim').classList.remove('fc-hidden');
      $('fcSendModal').classList.remove('fc-hidden');
    });
    function closeSend() { vrLift(false); $('fcSendScrim').classList.add('fc-hidden'); $('fcSendModal').classList.add('fc-hidden'); }
    $('fcSendCancel').addEventListener('click', closeSend);
    $('fcSendScrim').addEventListener('mousedown', closeSend);
    $('fcSendGo').addEventListener('click', async function () {
      if (st.uploadsBusy > 0) { showSendErr('Nog een upload bezig — even geduld.'); return; }
      var vol = $('fcSendVolledig');
      if (vol && !vol.checked) { showSendErr('Vink eerst aan dat je feedback volledig is — dan starten wij met de verwerking.'); return; }
      // los composer-veld als extra punt meenemen
      var pending = $('fcCompose').value.trim();
      if (pending) {
        st.annotations.push({ id: rid('ann'), comment: pending, pin: st.pendingPin || null, attachments: st.composerAtts.filter(function (x) { return x.uploadStatus === 'stored'; }) });
        st.pendingPin = null; st.composerAtts = []; $('fcCompose').value = '';
      }
      var btn = $('fcSendGo'); btn.disabled = true; btn.textContent = 'Indienen…';
      var res = await authedPost('linkFeedback', {
        task_id: st.taskId, url: st.url, klant_naam: klantNaam(),
        comment: $('fcSummary').value.trim(),
        annotations: st.annotations.map(function (a) {
          return {
            comment: a.comment, type: a.type || 'wijziging', pin: a.pin || null,
            replies: (a.replies || []).map(function (r) { return { text: r.text, createdAt: r.createdAt || null }; }),
            attachments: (a.attachments || []).map(cleanAttPayload)
          };
        }),
        attachments: st.reviewAttachments.filter(function (a) { return a.uploadStatus === 'stored'; }),
      });
      btn.disabled = false; btn.textContent = 'Feedback indienen';
      var rd = res.data || {};
      if (!res.ok || !rd.ok) { showSendErr(rd.message || 'Indienen lukte niet — probeer het zo opnieuw.'); return; }
      try { localStorage.removeItem(st._draftKey); } catch (e) { }   // ingediende ronde-draft opruimen (item 5)
      closeSend(); close();
      toast('🎉 Feedback ingediend — het team gaat ermee aan de slag!', 4200);
      markSentSource();
      refreshDetail();
    });
    function showSendErr(msg) { $('fcSendErr').textContent = msg; $('fcSendErr').classList.remove('fc-hidden'); }

    function markSentSource() {
      var el = opts.sourceEl;
      if (!el || !el.isConnected) return;
      if (el.tagName === 'BUTTON') {
        el.classList.remove('btn-branch'); el.classList.add('btn-outline');
        el.innerHTML = '✓ Feedback ingediend';
      } else if (el.parentElement && !el.parentElement.querySelector('.fc-sentpill')) {
        var pill = document.createElement('span');
        pill.className = 'fc-sentpill'; pill.textContent = '✓ Feedback ingediend';
        el.insertAdjacentElement('afterend', pill);
      }
    }
    function refreshDetail() {
      try {
        if (window.state && state.viewMode === 'project' && state.activeProject && typeof openProject === 'function') {
          delete (state.data.details || {})[state.activeProject];
          state._bustDetail = state.activeProject;
          openProject(state.activeProject, 'auto');
        }
      } catch (e) { }
    }

    // herstel tekstvelden uit de offline-draft (item 5) + bewaar bij verder typen
    if (st._restoreComposer && $('fcCompose')) $('fcCompose').value = st._restoreComposer;
    if (st._restoreSummary && $('fcSummary')) $('fcSummary').value = st._restoreSummary;
    if ($('fcCompose')) $('fcCompose').addEventListener('input', function () { if (st._scheduleSave) st._scheduleSave(); });
    if ($('fcSummary')) $('fcSummary').addEventListener('input', function () { if (st._scheduleSave) st._scheduleSave(); });
    if (!st.locked && st.annotations.length) toast('Je eerdere feedback is teruggezet.', 2600);

    renderComposeAtts();
    renderAll();
  }

  /* =============================================================================
     REVIEWER-REGISTER — per mediaType een viewer met {detect, init, renderAnchor}
     ============================================================================= */
  var REVIEWERS = {};
  function registerReviewer(type, def) { REVIEWERS[type] = Object.assign({ type: type }, def || {}); }

  /* ---- PDF-reviewer: pdf.js, lazy canvas-render, klik-to-comment met
         GENORMALISEERDE pin {page, xNorm, yNorm} ---- */
  var _pdfLib = null;
  function ensurePdfJs() {
    if (_pdfLib) return _pdfLib;
    _pdfLib = import(/* @vite-ignore */ PDFJS_MJS).then(function (mod) {
      var lib = mod.GlobalWorkerOptions ? mod : (mod.default || mod);
      try { lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; } catch (e) { }
      return lib;
    }).catch(function (err) { _pdfLib = null; throw err; });
    return _pdfLib;
  }
  var PDF_REVIEWER = {
    pins: true,
    emptyHint: 'Nog geen opmerkingen. Klik in het document op de plek waar je iets wil aanduiden — er opent een venstertje om je opmerking te typen en (optioneel) een bijlage toe te voegen.',
    init: async function (api, ctx) {
      var lib = await ensurePdfJs();
      var src = api.stream_url || api.url;
      var loadingTask = lib.getDocument({ url: src, withCredentials: false });
      var pdf = await loadingTask.promise;
      this._pdf = pdf; this._api = api; this._pages = []; this._draftShape = { el: null };
      var wrap = document.createElement('div');
      wrap.className = 'fc-pdf';
      api.host.appendChild(wrap);
      this._wrap = wrap;
      var self = this;

      // cursor-volgende ghost-pin: toont vóór de klik exact waar de opmerking landt.
      // rAF-lerp (easing naar de doelpositie) i.p.v. left/top per mousemove → smooth volgen,
      // geen 'schok' bij snelle muisbewegingen.
      var ghost = document.createElement('div');
      ghost.className = 'fc-ghostpin';
      ghost.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.4 8.4 0 0 1-11.7 7.7L3 21l1.8-6.3A8.4 8.4 0 1 1 21 11.5Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
      document.body.appendChild(ghost);
      this._ghost = ghost;
      var gst = { gx: 0, gy: 0, tx: 0, ty: 0, raf: 0 };
      this._gst = gst;
      function ghostTick() {
        gst.gx += (gst.tx - gst.gx) * 0.32;
        gst.gy += (gst.ty - gst.gy) * 0.32;
        ghost.style.transform = 'translate3d(' + (gst.gx - 13) + 'px,' + (gst.gy - 13) + 'px,0) rotate(-45deg)';
        gst.raf = ghost.classList.contains('show') ? requestAnimationFrame(ghostTick) : 0;
      }

      // één placeholder per pagina; render lazy via IntersectionObserver
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { self._renderPage(parseInt(en.target.dataset.page, 10)); io.unobserve(en.target); }
        });
      }, { root: wrap, rootMargin: '600px 0px' });
      this._io = io;

      for (var p = 1; p <= pdf.numPages; p++) {
        var ph = document.createElement('div');
        ph.className = 'fc-pdf-page';
        ph.dataset.page = p;
        ph.innerHTML = '<div class="fc-pdf-ph">Pagina ' + p + '…</div><div class="fc-pdf-pins"></div><div class="fc-pdf-draft"></div>';
        var mk = makeMarkupLayer(); ph.insertBefore(mk, ph.querySelector('.fc-pdf-pins'));
        // klik-to-comment (comment-tool) + vrij tekenen (markup-tools): pin/shape + pop-over
        (function (pageNum, pageEl, mkLayer) {
          pageEl.addEventListener('mousemove', function (ev) {
            if (api.locked || api.tool() !== 'comment' || ev.target.closest('.fc-pin')) { ghost.classList.remove('show'); return; }
            gst.tx = ev.clientX; gst.ty = ev.clientY;
            if (!ghost.classList.contains('show')) { gst.gx = ev.clientX; gst.gy = ev.clientY; ghost.classList.add('show'); }
            if (!gst.raf) gst.raf = requestAnimationFrame(ghostTick);
          });
          pageEl.addEventListener('mouseleave', function () { ghost.classList.remove('show'); });
          pageEl.addEventListener('click', function (ev) {
            if (api.locked || api.tool() !== 'comment' || ev.target.closest('.fc-pin')) return;
            var box = pageEl.getBoundingClientRect();
            if (!box.width || !box.height) return;
            var xNorm = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width));
            var yNorm = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height));
            var pin = { page: pageNum, xNorm: Math.round(xNorm * 1000) / 1000, yNorm: Math.round(yNorm * 1000) / 1000 };
            ghost.classList.remove('show');
            api.commentAt(pin, ev.clientX, ev.clientY);   // sluit vorige pop-over + wist oude drafts
            var dl = pageEl.querySelector('.fc-pdf-draft');   // NA commentAt: nieuwe draftpin tonen
            if (dl) dl.innerHTML = '<span class="fc-pin fc-pin-draft" style="left:' + (xNorm * 100) + '%;top:' + (yNorm * 100) + '%"><span>+</span></span>';
          });
          attachMarkup(pageEl, mkLayer, function () { return pageEl.getBoundingClientRect(); }, api, pageNum, self._draftShape);
        })(p, ph, mk);
        wrap.appendChild(ph);
        io.observe(ph);
        this._pages.push(ph);
      }
    },
    clearDraftPin: function () {
      if (this._pages) this._pages.forEach(function (ph) { var d = ph.querySelector('.fc-pdf-draft'); if (d) d.innerHTML = ''; });
    },
    clearDraftShape: function () { if (this._draftShape && this._draftShape.el) { try { this._draftShape.el.remove(); } catch (e) { } this._draftShape.el = null; } },
    highlightPin: function (annId, on) {
      if (!this._wrap) return;
      var sel = (window.CSS && CSS.escape) ? CSS.escape(String(annId)) : String(annId);
      var el = this._wrap.querySelector('.fc-pin[data-ann="' + sel + '"]');
      if (el) { el.classList.toggle('fc-pin-active', !!on); if (on) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    },
    _renderPage: async function (pageNum) {
      var ph = this._pages[pageNum - 1]; if (!ph || ph._rendered) return;
      ph._rendered = true;
      try {
        var page = await this._pdf.getPage(pageNum);
        var maxW = Math.min(this._wrap.clientWidth - 4, 900) || 760;
        var base = page.getViewport({ scale: 1 });
        var scale = maxW / base.width;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var vp = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.className = 'fc-pdf-canvas';
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        // natuurlijke CSS-maat onthouden zodat zoom (CSS-resample) een later-gerenderde pagina
        // op het juiste niveau zet zonder de pin-%-coördinaten te breken (item 13).
        canvas._cssW = vp.width; canvas._cssH = vp.height;
        var z = this._zoom || 1;
        canvas.style.width = (vp.width * z) + 'px';
        canvas.style.height = (vp.height * z) + 'px';
        var cctx = canvas.getContext('2d');
        cctx.scale(dpr, dpr);
        await page.render({ canvasContext: cctx, viewport: vp }).promise;
        var phNode = ph.querySelector('.fc-pdf-ph'); if (phNode) phNode.remove();
        ph.insertBefore(canvas, ph.firstChild);
        this._layoutPins(this._api.getAnnotations());
      } catch (e) {
        var pn = ph.querySelector('.fc-pdf-ph'); if (pn) pn.textContent = 'Pagina ' + pageNum + ' kon niet getoond worden.';
      }
    },
    _layoutPins: function (anns) {
      var api = this._api;
      this._pages.forEach(function (ph, idx) {
        renderShapes(ph.querySelector('.fc-markup'), anns, idx + 1, api);
        var layer = ph.querySelector('.fc-pdf-pins'); if (!layer) return;
        layer.innerHTML = '';
        (anns || []).forEach(function (a, i) {
          if (!a.pin || a.pin.page !== (idx + 1)) return;
          var el = document.createElement('button');
          el.className = 'fc-pin';
          el.setAttribute('data-ann', a.id);
          el.style.left = (a.pin.xNorm * 100) + '%';
          el.style.top = (a.pin.yNorm * 100) + '%';
          el.style.background = annType(a.type).color;
          el.innerHTML = '<span>' + (i + 1) + '</span>';
          el.title = String(a.comment || '').slice(0, 140);
          el.addEventListener('mouseenter', function () { if (api && api.highlightCard) api.highlightCard(a.id, true); });
          el.addEventListener('mouseleave', function () { if (api && api.highlightCard) api.highlightCard(a.id, false); });
          // klik = highlight, slepen = pin verplaatsen (gedeelde helper)
          if (!a.locked && api && !api.locked) { el.classList.add('fc-pin-movable'); makePinDraggable(el, a, api, function () { return ph.getBoundingClientRect(); }); }
          else el.addEventListener('click', function (ev) { ev.stopPropagation(); if (api && api.showComment) api.showComment(a.id, ev.clientX, ev.clientY); });
          layer.appendChild(el);
        });
      });
    },
    onAnnotationsChanged: function (anns) { if (this._layoutPins) this._layoutPins(anns); },
    // ZOOM (item 13): CSS-resample van de canvassen — de pagina-box groeit mee, dus de
    // bestaande overflow geeft scrollbars en de genormaliseerde pins/shapes blijven kloppen.
    setZoom: function (z) {
      this._zoom = z;
      // de max-width:100%-klem opheffen zodra je inzoomt, anders groeit de canvas niet
      // (en blijft horizontaal scrollen uit). flex-start zodat je naar de linkerrand kunt scrollen.
      if (this._wrap) this._wrap.classList.toggle('fc-zoomed', z > 1);
      if (!this._pages) return;
      this._pages.forEach(function (ph) {
        var c = ph.querySelector('.fc-pdf-canvas');
        if (c && c._cssW) { c.style.width = (c._cssW * z) + 'px'; c.style.height = (c._cssH * z) + 'px'; }
      });
    },
    goToPin: function (pin) {
      if (!pin || !this._pages) return;
      var ph = this._pages[(pin.page || 1) - 1];
      if (ph) ph.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    destroy: function () {
      try { if (this._io) this._io.disconnect(); } catch (e) { }
      try { if (this._pdf) this._pdf.destroy(); } catch (e) { }
      try { if (this._gst && this._gst.raf) cancelAnimationFrame(this._gst.raf); } catch (e) { }
      try { if (this._ghost) this._ghost.remove(); } catch (e) { }
      this._pages = []; this._pdf = null;
    },
  };
  registerReviewer('pdf', PDF_REVIEWER);

  /* ---- IMAGE-reviewer: één losse afbeelding inline, met pin-op-foto (klik = pin +
         pop-over), cursor-volgende ghost-pin en pin-verslepen. Zelfde pin-model als de
         PDF-reviewer maar zonder pagina (pin = {xNorm,yNorm}). ---- */
  var IMAGE_REVIEWER = {
    pins: true,
    emptyHint: 'Klik op de foto op de plek waar je iets wil aanduiden — er opent een venstertje om je opmerking te typen en (optioneel) een bijlage toe te voegen. Sleep een bestaande pin om hem te verplaatsen.',
    init: function (api, ctx) {
      var self = this; this._api = api; this._draftShape = { el: null };
      var wrap = document.createElement('div'); wrap.className = 'fc-imgwrap';
      var stage = document.createElement('div'); stage.className = 'fc-imgstage';
      var img = document.createElement('img'); img.className = 'fc-img'; img.alt = ''; img.decoding = 'async';
      var mk = makeMarkupLayer();
      var pins = document.createElement('div'); pins.className = 'fc-img-pins';
      var draft = document.createElement('div'); draft.className = 'fc-img-draft';
      stage.appendChild(img); stage.appendChild(mk); stage.appendChild(pins); stage.appendChild(draft);
      wrap.appendChild(stage); api.host.appendChild(wrap);
      this._wrap = wrap; this._stage = stage; this._img = img; this._markup = mk; this._pinsLayer = pins; this._draft = draft;
      attachMarkup(stage, mk, function () { return img.getBoundingClientRect(); }, api, null, this._draftShape);

      // cursor-volgende ghost-pin (rAF-lerp, zoals de PDF-reviewer)
      var ghost = document.createElement('div'); ghost.className = 'fc-ghostpin';
      ghost.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.4 8.4 0 0 1-11.7 7.7L3 21l1.8-6.3A8.4 8.4 0 1 1 21 11.5Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
      document.body.appendChild(ghost); this._ghost = ghost;
      var gst = { gx: 0, gy: 0, tx: 0, ty: 0, raf: 0 }; this._gst = gst;
      function ghostTick() {
        gst.gx += (gst.tx - gst.gx) * 0.32; gst.gy += (gst.ty - gst.gy) * 0.32;
        ghost.style.transform = 'translate3d(' + (gst.gx - 13) + 'px,' + (gst.gy - 13) + 'px,0) rotate(-45deg)';
        gst.raf = ghost.classList.contains('show') ? requestAnimationFrame(ghostTick) : 0;
      }

      img.addEventListener('load', function () { try { self._layoutPins(api.getAnnotations()); } catch (e) { } });
      img.addEventListener('error', function () {
        wrap.innerHTML = '<div class="fc-foto"><div class="fc-foto-card"><div class="fc-foto-ic">🖼️</div><b>Voorvertoning niet beschikbaar</b><p>Open de foto via de downloadknop bovenaan en geef hiernaast je feedback.</p></div></div>';
      });
      img.src = api.stream_url || api.url;

      stage.addEventListener('mousemove', function (ev) {
        if (api.locked || api.tool() !== 'comment' || ev.target.closest('.fc-pin')) { ghost.classList.remove('show'); return; }
        gst.tx = ev.clientX; gst.ty = ev.clientY;
        if (!ghost.classList.contains('show')) { gst.gx = ev.clientX; gst.gy = ev.clientY; ghost.classList.add('show'); }
        if (!gst.raf) gst.raf = requestAnimationFrame(ghostTick);
      });
      stage.addEventListener('mouseleave', function () { ghost.classList.remove('show'); });
      stage.addEventListener('click', function (ev) {
        if (api.locked || api.tool() !== 'comment' || ev.target.closest('.fc-pin')) return;
        var box = img.getBoundingClientRect(); if (!box.width || !box.height) return;
        var xN = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width));
        var yN = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height));
        var pin = { xNorm: Math.round(xN * 1000) / 1000, yNorm: Math.round(yN * 1000) / 1000 };
        ghost.classList.remove('show');
        api.commentAt(pin, ev.clientX, ev.clientY);
        draft.innerHTML = '<span class="fc-pin fc-pin-draft" style="left:' + (xN * 100) + '%;top:' + (yN * 100) + '%"><span>+</span></span>';
      });
    },
    clearDraftPin: function () { if (this._draft) this._draft.innerHTML = ''; },
    clearDraftShape: function () { if (this._draftShape && this._draftShape.el) { try { this._draftShape.el.remove(); } catch (e) { } this._draftShape.el = null; } },
    highlightPin: function (annId, on) {
      if (!this._wrap) return;
      var sel = (window.CSS && CSS.escape) ? CSS.escape(String(annId)) : String(annId);
      var el = this._wrap.querySelector('.fc-pin[data-ann="' + sel + '"]');
      if (el) { el.classList.toggle('fc-pin-active', !!on); if (on) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    },
    _layoutPins: function (anns) {
      var layer = this._pinsLayer, img = this._img, api = this._api; if (!layer) return;
      renderShapes(this._markup, anns, null, this._api);
      layer.innerHTML = '';
      (anns || []).forEach(function (a, i) {
        if (!a.pin || a.pin.xNorm == null || a.pin.page != null || a.pin.timestampSec != null) return; // enkel foto-pins
        var el = document.createElement('button');
        el.className = 'fc-pin';
        el.setAttribute('data-ann', a.id);
        el.style.left = (a.pin.xNorm * 100) + '%';
        el.style.top = (a.pin.yNorm * 100) + '%';
        el.style.background = annType(a.type).color;
        el.innerHTML = '<span>' + (i + 1) + '</span>';
        el.title = String(a.comment || '').slice(0, 140);
        el.addEventListener('mouseenter', function () { if (api && api.highlightCard) api.highlightCard(a.id, true); });
        el.addEventListener('mouseleave', function () { if (api && api.highlightCard) api.highlightCard(a.id, false); });
        if (!a.locked && api && !api.locked) { el.classList.add('fc-pin-movable'); makePinDraggable(el, a, api, function () { return img.getBoundingClientRect(); }); }
        else el.addEventListener('click', function (ev) { ev.stopPropagation(); if (api && api.showComment) api.showComment(a.id, ev.clientX, ev.clientY); });
        layer.appendChild(el);
      });
    },
    onAnnotationsChanged: function (anns) { if (this._layoutPins) this._layoutPins(anns); },
    goToPin: function () { if (this._wrap) this._wrap.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    destroy: function () {
      try { if (this._gst && this._gst.raf) cancelAnimationFrame(this._gst.raf); } catch (e) { }
      try { if (this._ghost) this._ghost.remove(); } catch (e) { }
      this._img = null; this._wrap = null;
    },
  };
  registerReviewer('image', IMAGE_REVIEWER);

  /* ---- AUDIO-reviewer: native <audio controls> + 1 globale feedback-textarea
         (de gedeelde composer in de shell vervult de globale-feedback-rol) ---- */
  registerReviewer('audio', {
    emptyHint: 'Beluister het fragment en klik op <strong>Opmerking op dit moment</strong> om je feedback aan de exacte tijd te koppelen — of schrijf hieronder een algemene opmerking.',
    init: function (api, ctx) {
      var box = document.createElement('div');
      box.className = 'fc-audio';
      box.innerHTML = '<div class="fc-audio-ic">🎧</div><audio controls preload="metadata" class="fc-audio-el"></audio>' +
        '<button type="button" class="fc-btn fc-primary fc-audio-mark">🕑 Opmerking op dit moment</button>' +
        '<p class="fc-audio-hint">De opmerking wordt aan de huidige afspeeltijd gekoppeld. Klik later op een opmerking om er meteen naartoe te springen.</p>';
      var el = box.querySelector('audio');
      el.src = api.stream_url || api.url;
      api.host.appendChild(box);
      this._el = el;
      var mark = box.querySelector('.fc-audio-mark');
      if (api.locked) { mark.style.display = 'none'; }
      mark.addEventListener('click', function () {
        if (api.locked) { api.toast('Dit bestand is al doorgestuurd — feedback is vergrendeld.', 3200); return; }
        var t = Math.max(0, el.currentTime || 0);
        var r = mark.getBoundingClientRect();
        api.commentAt({ timestampSec: Math.round(t * 1000) / 1000 }, r.left + r.width / 2, r.top);
      });
    },
    goToPin: function (pin) {
      if (!this._el || !pin || pin.timestampSec == null) return;
      try { this._el.currentTime = pin.timestampSec; this._el.play().catch(function () { }); } catch (e) { }
      try { this._el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { }
    },
    destroy: function () { try { if (this._el) { this._el.pause(); this._el.removeAttribute('src'); this._el.load(); } } catch (e) { } },
  });

  /* ---- FOTO-reviewer: dispatcht naar de bestaande galerij + biedt de gedeelde
         globale feedback/comment-sectie. (Helper die ónder een galerij past.) ---- */
  registerReviewer('foto', {
    emptyHint: 'Bekijk de foto’s en schrijf hieronder je algemene feedback (bv. een selectie, kleur, bijsnijden). Klik dan <strong>Toevoegen aan lijst</strong>.',
    init: function (api, ctx) {
      var box = document.createElement('div');
      box.className = 'fc-foto';
      box.innerHTML =
        '<div class="fc-foto-card">' +
        '  <div class="fc-foto-ic">🖼️</div>' +
        '  <b>Beeldmateriaal</b>' +
        '  <p>Open de volledige galerij om alle foto’s groot te bekijken, te selecteren en — als alles in orde is — in één keer goed te keuren.</p>' +
        '  <button class="fc-btn fc-primary fc-foto-open" type="button">Open de fotogalerij</button>' +
        '</div>';
      api.host.appendChild(box);
      var url = api.url, taskId = (window.state && state.activeProject) || '';
      box.querySelector('.fc-foto-open').addEventListener('click', function () {
        if (typeof window.openFotoGalerij === 'function') { window.openFotoGalerij(taskId, url); }
        else window.open(url, '_blank', 'noopener');
      });
    },
  });

  /* ---- PPTX / OFFICE-reviewer: de worker rendert het document/de presentatie naar
         PDF (native Google-doc → export, binair Office → convert) en levert dat als
         stream_url. We hergebruiken dus exact de pdf.js-viewer: 1 PDF-pagina = 1 slide
         / 1 documentpagina, mét dezelfde klik-to-comment. Valt het renderen weg (bv.
         een niet-converteerbaar .key-bestand), dan degradeert open() naar 'other'. ---- */
  // PPTX = single-slide PAGER (item 15): één dia tegelijk + liquid-glass ‹ › overlay onder de dia.
  // Hergebruikt de volledige PDF-mechaniek per dia (pins/kader/zoom); enkel de presentatie i.p.v.
  // de scroll-stack. 'office' (Word/Excel/lange docs) houdt de scroll-stack.
  var PPTX_REVIEWER = Object.assign({}, PDF_REVIEWER, {
    emptyHint: 'Blader met de pijlen door de presentatie en klik op een plek in een dia om er een opmerking aan te koppelen.',
    init: async function (api, ctx) {
      await PDF_REVIEWER.init.call(this, api, ctx);   // bouwt alle .fc-pdf-page + handlers
      var self = this;
      this._slide = 1;
      this._wrap.classList.add('fc-pager');
      try { if (this._io) this._io.disconnect(); } catch (e) { }   // pager stuurt zelf welke dia rendert
      this._pages.forEach(function (ph, i) { ph.classList.toggle('fc-slide-hidden', i !== 0); });
      var total = this._pages.length;
      var nav = document.createElement('div');
      nav.className = 'fc-pager-nav';
      nav.innerHTML = '<button class="fc-pager-btn fc-prev" aria-label="Vorige dia">‹</button>' +
        '<span class="fc-pager-lbl" id="fcSlideLbl">1 / ' + total + '</span>' +
        '<button class="fc-pager-btn fc-next" aria-label="Volgende dia">›</button>';
      api.host.appendChild(nav);
      this._nav = nav;
      nav.querySelector('.fc-prev').addEventListener('click', function () { self.showSlide(self._slide - 1); });
      nav.querySelector('.fc-next').addEventListener('click', function () { self.showSlide(self._slide + 1); });
      this._key = function (e) {
        if (e.target && /^(textarea|input)$/i.test(e.target.tagName)) return;
        if (api.host && api.host.closest && !document.body.contains(api.host)) return;
        if (e.key === 'ArrowRight') { self.showSlide(self._slide + 1); }
        else if (e.key === 'ArrowLeft') { self.showSlide(self._slide - 1); }
      };
      document.addEventListener('keydown', this._key);
      this.showSlide(1);
    },
    showSlide: function (n) {
      var total = this._pages.length; if (!total) return;
      try { if (this._api && this._api.closeComment) this._api.closeComment(); } catch (e) { }   // bubble van vorige dia sluiten
      n = Math.max(1, Math.min(total, n));
      this._slide = n;
      this._pages.forEach(function (ph, i) { ph.classList.toggle('fc-slide-hidden', (i + 1) !== n); });
      this._renderPage(n);
      if (n + 1 <= total) this._renderPage(n + 1);
      if (n - 1 >= 1) this._renderPage(n - 1);
      var lbl = this._nav && this._nav.querySelector('#fcSlideLbl'); if (lbl) lbl.textContent = n + ' / ' + total;
      if (this._nav) {
        this._nav.querySelector('.fc-prev').disabled = (n <= 1);
        this._nav.querySelector('.fc-next').disabled = (n >= total);
      }
      try { this._wrap.scrollTop = 0; } catch (e) { }
      this._layoutPins(this._api.getAnnotations());
    },
    goToPin: function (pin) { if (pin && pin.page) this.showSlide(pin.page); },
    destroy: function () {
      try { PDF_REVIEWER.destroy.call(this); } catch (e) { }
      try { if (this._nav) this._nav.remove(); } catch (e) { }
      try { document.removeEventListener('keydown', this._key); } catch (e) { }
    },
  });
  registerReviewer('pptx', PPTX_REVIEWER);
  registerReviewer('office', Object.assign({}, PDF_REVIEWER, {
    emptyHint: 'Bekijk het document en klik op een plek om er een opmerking aan te koppelen, of typ je opmerking hieronder. Klik dan <strong>Toevoegen aan lijst</strong>.',
  }));

  /* ---- OTHER / fallback-reviewer: nette download-kaart + globale feedback ---- */
  registerReviewer('other', {
    emptyHint: 'Bekijk het bestand (download bovenaan) en schrijf hieronder je feedback. Klik dan <strong>Toevoegen aan lijst</strong>.',
    init: function (api, ctx) {
      var box = document.createElement('div');
      box.className = 'fc-foto';
      box.innerHTML =
        '<div class="fc-foto-card">' +
        '  <div class="fc-foto-ic">📄</div>' +
        '  <b>Bestand klaar voor je feedback</b>' +
        '  <p>Dit bestandstype tonen we niet in het portaal. Open of download het via de knop bovenaan en geef je feedback hiernaast.</p>' +
        '  <a class="fc-btn fc-primary" href="' + _esc(api.download_url || api.url) + '" target="_blank" rel="noopener">Bestand openen</a>' +
        '</div>';
      api.host.appendChild(box);
    },
  });

  /* =============================================================================
     DISPATCHER — bepaal het type en open de juiste viewer
     -----------------------------------------------------------------------------
     Video delegeert naar de bestaande, geteste S27VideoReview-overlay (frame-
     accurate). Al de rest gaat door de gedeelde shell + reviewer hierboven.
     ============================================================================= */
  function pickReviewer(url, meta) {
    meta = meta || {};
    var taskId = String(meta.taskId || (window.state && state.activeProject) || '');
    var label = String(meta.label || 'Bestand');
    var type = meta.mediaType || guessType(url);

    // VIDEO → bestaande frame-accurate review (ongewijzigd)
    if (type === 'video' && window.S27VideoReview) {
      window.S27VideoReview.open({ url: url, label: label, taskId: taskId, sourceEl: meta.sourceEl });
      return;
    }
    open({ url: url, label: label, taskId: taskId, sourceEl: meta.sourceEl, mediaType: type });
  }

  /* =============================================================================
     INTEGRATIE — klik-delegatie op de bestaande deliverable-rijen
     -----------------------------------------------------------------------------
     Vangt klikken op deliverable-links binnen .deliv-file op (alle types), in
     projectcontext, en routeert ze naar pickReviewer i.p.v. een nieuw tabblad.
     S27VideoReview heeft een eigen, smallere delegatie (alleen video) — die
     blijft werken; wij vangen alleen NIET-video links af zodat er geen dubbele
     overlay opent.
     ============================================================================= */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var row = a.closest && a.closest('.deliv-file, .fbc-view');   // dekt ook de proces-feedbackkaart (.fbc-view)
    if (!row) return;
    var href = a.getAttribute('href') || '';
    if (!href || href === '#') return;
    // video's: laat S27VideoReview's eigen detectie+delegatie het doen (dekt ook Drive-video's
    // zonder zichtbare extensie die guessType als 'other' zou zien) -> geen dubbele overlay.
    if (window.S27VideoReview && typeof S27VideoReview.isReviewable === 'function' && S27VideoReview.isReviewable(href)) return;
    var type = guessType(href);
    if (type === 'video') return; // vangnet
    var taskId = (row.getAttribute('data-task')) || (window.state && state.activeProject) || '';
    if (!taskId) return; // buiten projectcontext: normaal gedrag
    e.preventDefault();
    pickReviewer(href, {
      taskId: String(taskId),
      label: row.getAttribute('data-label') || a.textContent.trim() || 'Bestand',
      mediaType: type,
      sourceEl: a,
    });
  });

  /* ---- iOS-toetsenbord: bottom-sheets optillen via --fc-kb (visualViewport) ---- */
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var fcKb = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--fc-kb', kb + 'px');
    };
    vv.addEventListener('resize', fcKb);
    vv.addEventListener('scroll', fcKb);
  }

  window.S27Review = {
    open: open,
    pickReviewer: pickReviewer,
    registerReviewer: registerReviewer,
    linkKeyOf: linkKeyOf,
    guessType: guessType,
  };
})();
