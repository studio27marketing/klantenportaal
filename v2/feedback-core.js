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
  function fileIcon(name) {
    var e = extOf(name);
    if (['ttf', 'otf', 'woff', 'woff2'].indexOf(e) >= 0) return '🔤';
    if (e === 'zip') return '📦';
    if (e === 'pdf') return '📕';
    return '📄';
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
      '    <div class="fc-title"><div><h2 id="fcTitle"></h2><span class="fc-sub" id="fcSub">Feedbackronde</span></div></div>' +
      '    <div class="fc-actions">' +
      '      <a id="fcDownload" class="fc-btn fc-ghost" target="_blank" rel="noopener"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="fc-dl-txt">Download</span></a>' +
      '      <button id="fcApprove" class="fc-btn fc-approve">✓ Goedkeuren</button>' +
      '      <button id="fcFeedback" class="fc-btn fc-primary">Feedback geven <span id="fcCount" class="fc-countbadge fc-hidden">0</span></button>' +
      '      <button id="fcClose" class="fc-x" title="Sluiten" aria-label="Sluiten"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
      '    </div>' +
      '  </header>' +
      '  <div class="fc-loading" id="fcLoading"><div class="fc-spin"></div><p>Bestand wordt geladen…</p></div>' +
      '  <main class="fc-main fc-hidden" id="fcMain">' +
      '    <section class="fc-stagecol">' +
      '      <div class="fc-prevnote fc-hidden" id="fcPrev"></div>' +
      '      <div class="fc-stage" id="fcStage"><div class="fc-viewer" id="fcViewer"></div></div>' +
      '    </section>' +
      '    <aside class="fc-panel">' +
      '      <div class="fc-panelhead"><h3>Feedback</h3><span id="fcAnnCount" class="fc-chip">0</span></div>' +
      '      <div id="fcList" class="fc-list"><p class="fc-empty" id="fcEmpty"></p></div>' +
      '      <div class="fc-composewrap">' +
      '        <textarea id="fcCompose" rows="3" placeholder="Schrijf hier je opmerking of vraag…"></textarea>' +
      '        <div id="fcComposeAtts" class="fc-attrow"></div>' +
      '        <div class="fc-composefoot">' +
      '          <label class="fc-attach" title="Bijlage toevoegen"><input id="fcComposeFile" type="file" accept="' + ACCEPT + '" multiple hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m21 12-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6L15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></label>' +
      '          <span class="fc-spacer"></span>' +
      '          <button id="fcComposeAdd" class="fc-btn fc-ghost fc-sm">Toevoegen aan lijst</button>' +
      '        </div>' +
      '      </div>' +
      '    </aside>' +
      '  </main>' +
      '</div>' +
      '<div id="fcSendScrim" class="fc-scrim fc-hidden"></div>' +
      '<div id="fcSendModal" class="fc-modal fc-hidden">' +
      '  <div class="fc-sendhead"><span class="fc-sendic">📝</span><div><b>Feedback doorsturen</b><span>We gaan er meteen mee aan de slag.</span></div></div>' +
      '  <div class="fc-sendsum" id="fcSendLine"></div>' +
      '  <label class="fc-field"><span>Algemene opmerking <em>(optioneel)</em></span><textarea id="fcSummary" rows="3" placeholder="Feedback die niet aan één punt hangt…"></textarea></label>' +
      '  <label class="fc-confirm"><input type="checkbox" id="fcSendVolledig"><span>Mijn feedback voor dit bestand is <b>volledig</b> — Studio 27 mag starten met de verwerking.</span></label>' +
      '  <p id="fcSendErr" class="fc-err fc-hidden"></p>' +
      '  <div class="fc-modalfoot"><button id="fcSendCancel" class="fc-btn fc-ghost">Terug</button><button id="fcSendGo" class="fc-btn fc-primary">Verzenden</button></div>' +
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
    if (!url) return;
    if (!taskId) { toast('Dit bestand kan alleen binnen een project geopend worden.', 3600); return; }

    var st = {
      taskId: taskId, url: url, annotations: [], reviewAttachments: [],
      composerAtts: [], uploadsBusy: 0, closed: false, locked: false,
      streamUrl: null, downloadUrl: null, mediaType: opts.mediaType || guessType(url),
      reviewer: null,
    };

    var root = buildShell(st);
    var $ = function (id) { return root.querySelector('#' + id); };
    $('fcTitle').textContent = label;

    function vrLift(on) { try { document.body.classList.toggle('fc-lift', !!on); } catch (e) { } }

    // nav-klik in de sidebar sluit de review eerst (zoals video-review)
    var navClose = function (e) { if (!st.closed && e.target.closest && e.target.closest('.sb-item')) close(); };
    document.addEventListener('click', navClose, true);

    function close() {
      if (st.closed) return;
      st.closed = true;
      vrLift(false);
      try { document.removeEventListener('click', navClose, true); } catch (e) { }
      try { if (st.reviewer && st.reviewer.destroy) st.reviewer.destroy(); } catch (e) { }
      try { document.body.classList.remove('fc-open'); } catch (e) { }
      try { root.remove(); } catch (e) { }
      current = null;
    }
    $('fcClose').addEventListener('click', function () {
      if (!st.locked && (st.annotations.length || $('fcCompose').value.trim()) &&
        !confirm('Je hebt nog niet-verzonden feedback. Sluiten?')) return;
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
        _esc((d && d.message) || 'We konden dit bestand niet in het portaal inladen. Probeer het zo opnieuw of open het origineel.') +
        '</p><a class="fc-btn fc-primary" href="' + _esc((d && d.open_url) || url) + '" target="_blank" rel="noopener">Open origineel</a></div></div>';
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
    st.streamUrl = gwUrl(d.stream_url) || url;
    st.downloadUrl = gwUrl(d.download_url) || url;
    st.locked = d.is_read_only === true || d.lr_state === 'approved';

    // download-knop is ALTIJD aanwezig; respecteer can_download (false → origineel openen)
    var dl = $('fcDownload');
    if (d.can_download === false) {
      dl.removeAttribute('href');
      dl.classList.add('fc-disabled');
      dl.title = 'Beschikbaar na goedkeuring';
    } else {
      dl.href = st.downloadUrl + (st.downloadUrl.indexOf('?') >= 0 ? '&' : '?') + 'name=' + encodeURIComponent(label);
    }

    // Native Google-doc/sheet/slides: knop om het in Google te openen/bewerken. Google
    // dwingt de rechten zelf af (owner/gedeeld → bewerken, anders alleen-lezen), dus dit
    // is meteen "bewerken als de klant edit-rechten heeft" zonder extra permissie-laag.
    if (d.edit_url) {
      var ed = document.createElement('a');
      ed.className = 'fc-btn fc-ghost fc-edit';
      ed.target = '_blank'; ed.rel = 'noopener';
      ed.href = d.edit_url;
      ed.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20h16M5 19v-3.6L15.4 5l3.6 3.6L8.6 19H5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Bewerk in Google</span>';
      dl.parentNode.insertBefore(ed, dl);
    }

    if (d.ronde) $('fcSub').textContent = 'Feedbackronde ' + d.ronde;
    if (st.locked) {
      $('fcSub').textContent = (d.lr_state === 'approved') ? 'Goedgekeurd ✓' : 'Feedback doorgestuurd';
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
            id: 'prev_' + i, comment: String(a.comment || ''), pin: a.pin || null, locked: true,
            attachments: (a.attachments || []).map(function (x) { return { filename: String(x.filename || 'bijlage'), url: gwUrl(x.url), uploadStatus: 'stored' }; }),
          };
        });
      }
      if (lb && lb.summary) { prev.innerHTML += '<br><span class="fc-locksum">Algemene opmerking: ' + _esc(lb.summary) + '</span>'; }
    }

    /* ---- viewer-api die de reviewer mag aanspreken ---- */
    var viewerApi = {
      host: $('fcViewer'),
      stream_url: st.streamUrl,
      download_url: st.downloadUrl,
      url: url,
      locked: st.locked,
      // pin/punt toevoegen vanuit de viewer (bv. klik-to-comment in pdf)
      addAnnotation: function (a) {
        if (st.locked) { toast('Dit bestand is al doorgestuurd — feedback is vergrendeld.', 3600); return; }
        st.annotations.push({ id: rid('ann'), comment: String(a && a.comment || ''), pin: (a && a.pin) || null, attachments: (a && a.attachments) || [], createdAt: new Date().toISOString() });
        renderAll();
        toast('Feedbackpunt toegevoegd ✓');
      },
      // prefill de composer met een pin uit de viewer (klik-to-comment flow)
      composeWithPin: function (pin) {
        if (st.locked) { toast('Dit bestand is al doorgestuurd — feedback is vergrendeld.', 3600); return; }
        st.pendingPin = pin || null;
        var c = $('fcCompose'); c.focus();
        if (pin) toast('Schrijf je opmerking — we koppelen ze aan deze plek.', 2400);
      },
      getAnnotations: function () { return st.annotations.slice(); },
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
    function renderAll() {
      var n = st.annotations.length;
      $('fcAnnCount').textContent = n;
      $('fcCount').textContent = n;
      $('fcCount').classList.toggle('fc-hidden', n === 0);
      $('fcEmpty').classList.toggle('fc-hidden', n > 0);
      var list = $('fcList');
      list.querySelectorAll('.fc-card').forEach(function (el) { el.remove(); });
      st.annotations.forEach(function (a, i) {
        var card = document.createElement('div');
        card.className = 'fc-card';
        card.dataset.id = a.id;
        card.innerHTML =
          '<div class="fc-cardtop"><span class="fc-pindot">' + (i + 1) + '</span>' +
          (a.pin ? '<span class="fc-timechip">' + _esc(pinLabel(a.pin)) + '</span>' : '') +
          (a.locked ? '' : '<button class="fc-del" title="Verwijderen">×</button>') + '</div>' +
          '<div class="fc-cardtxt"></div><div class="fc-attrow"></div>';
        card.querySelector('.fc-cardtxt').textContent = a.comment;
        var row = card.querySelector('.fc-attrow');
        (a.attachments || []).forEach(function (att) { row.appendChild(attChip(att, null)); });
        if (a.pin) card.addEventListener('click', function (e) {
          if (e.target.closest('.fc-del') || e.target.closest('.fc-attchip')) return;
          if (st.reviewer && st.reviewer.goToPin) try { st.reviewer.goToPin(a.pin); } catch (er) { }
        });
        var del = card.querySelector('.fc-del');
        if (del) del.addEventListener('click', function () {
          st.annotations = st.annotations.filter(function (x) { return x.id !== a.id; });
          renderAll();
          if (st.reviewer && st.reviewer.onAnnotationsChanged) try { st.reviewer.onAnnotationsChanged(st.annotations); } catch (er) { }
        });
        list.appendChild(card);
      });
      if (st.reviewer && st.reviewer.onAnnotationsChanged) try { st.reviewer.onAnnotationsChanged(st.annotations); } catch (er) { }
    }
    function pinLabel(pin) {
      if (!pin) return '';
      if (pin.page != null) return 'p.' + pin.page;
      return '📍';
    }

    /* ---- GOEDKEUREN ---- */
    $('fcApprove').addEventListener('click', async function () {
      if (st.locked) { toast('Dit bestand is al afgerond.', 2800); return; }
      if (st.annotations.length && !confirm('Je hebt nog niet-verzonden feedbackpunten. Toch goedkeuren? (Die punten worden dan niet verstuurd.)')) return;
      if (!confirm('Keur je dit bestand definitief goed? Daarna sluiten we de feedbackronde voor dit bestand af.')) return;
      var ab = $('fcApprove'); ab.disabled = true; ab.textContent = 'Goedkeuren…';
      var res = await authedPost('linkApprove', { task_id: st.taskId, url: st.url, klant_naam: klantNaam() });
      if (res.ok && res.data && res.data.ok) {
        close();
        toast(res.data.all_approved
          ? '🎉 Goedgekeurd — bedankt! Alles van dit onderdeel is nu af.'
          : '🎉 Goedgekeurd! Keur je de overige bestanden van dit onderdeel ook goed, dan ronden we het af.', 4600);
        refreshDetail();
      } else {
        ab.disabled = false; ab.textContent = '✓ Goedkeuren';
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
      var btn = $('fcSendGo'); btn.disabled = true; btn.textContent = 'Verzenden…';
      var res = await authedPost('linkFeedback', {
        task_id: st.taskId, url: st.url, klant_naam: klantNaam(),
        comment: $('fcSummary').value.trim(),
        annotations: st.annotations.map(function (a) {
          return { comment: a.comment, pin: a.pin || null, attachments: (a.attachments || []).map(function (x) { return { filename: x.filename, url: x.url || x.fileUrl }; }) };
        }),
        attachments: st.reviewAttachments.filter(function (a) { return a.uploadStatus === 'stored'; }),
      });
      btn.disabled = false; btn.textContent = 'Verzenden';
      var rd = res.data || {};
      if (!res.ok || !rd.ok) { showSendErr(rd.message || 'Verzenden lukte niet — probeer het zo opnieuw.'); return; }
      closeSend(); close();
      toast('🎉 Feedback verzonden — het team gaat ermee aan de slag!', 4200);
      markSentSource();
      refreshDetail();
    });
    function showSendErr(msg) { $('fcSendErr').textContent = msg; $('fcSendErr').classList.remove('fc-hidden'); }

    function markSentSource() {
      var el = opts.sourceEl;
      if (!el || !el.isConnected) return;
      if (el.tagName === 'BUTTON') {
        el.classList.remove('btn-branch'); el.classList.add('btn-outline');
        el.innerHTML = '✓ Feedback gegeven';
      } else if (el.parentElement && !el.parentElement.querySelector('.fc-sentpill')) {
        var pill = document.createElement('span');
        pill.className = 'fc-sentpill'; pill.textContent = '✓ Feedback verzonden';
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
    emptyHint: 'Nog geen feedback. Klik op een plek in het document om er een opmerking aan te koppelen, of typ je opmerking hieronder.',
    init: async function (api, ctx) {
      var lib = await ensurePdfJs();
      var src = api.stream_url || api.url;
      var loadingTask = lib.getDocument({ url: src, withCredentials: false });
      var pdf = await loadingTask.promise;
      this._pdf = pdf; this._api = api; this._pages = [];
      var wrap = document.createElement('div');
      wrap.className = 'fc-pdf';
      api.host.appendChild(wrap);
      this._wrap = wrap;
      var self = this;

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
        ph.innerHTML = '<div class="fc-pdf-ph">Pagina ' + p + '…</div><div class="fc-pdf-pins"></div>';
        // klik-to-comment: normaliseer naar [0..1] binnen de pagina
        (function (pageNum) {
          ph.addEventListener('click', function (ev) {
            if (api.locked || ev.target.closest('.fc-pin')) return;
            var box = ph.getBoundingClientRect();
            if (!box.width || !box.height) return;
            var xNorm = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width));
            var yNorm = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height));
            api.composeWithPin({ page: pageNum, xNorm: Math.round(xNorm * 1000) / 1000, yNorm: Math.round(yNorm * 1000) / 1000 });
            self._layoutPins(api.getAnnotations());
          });
        })(p);
        wrap.appendChild(ph);
        io.observe(ph);
        this._pages.push(ph);
      }
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
        canvas.style.width = vp.width + 'px';
        canvas.style.height = vp.height + 'px';
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
      var self = this;
      this._pages.forEach(function (ph, idx) {
        var layer = ph.querySelector('.fc-pdf-pins'); if (!layer) return;
        layer.innerHTML = '';
        (anns || []).forEach(function (a, i) {
          if (!a.pin || a.pin.page !== (idx + 1)) return;
          var el = document.createElement('button');
          el.className = 'fc-pin';
          el.style.left = (a.pin.xNorm * 100) + '%';
          el.style.top = (a.pin.yNorm * 100) + '%';
          el.innerHTML = '<span>' + (i + 1) + '</span>';
          el.addEventListener('click', function (ev) { ev.stopPropagation(); });
          layer.appendChild(el);
        });
      });
    },
    onAnnotationsChanged: function (anns) { if (this._layoutPins) this._layoutPins(anns); },
    goToPin: function (pin) {
      if (!pin || !this._pages) return;
      var ph = this._pages[(pin.page || 1) - 1];
      if (ph) ph.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    destroy: function () {
      try { if (this._io) this._io.disconnect(); } catch (e) { }
      try { if (this._pdf) this._pdf.destroy(); } catch (e) { }
      this._pages = []; this._pdf = null;
    },
  };
  registerReviewer('pdf', PDF_REVIEWER);

  /* ---- AUDIO-reviewer: native <audio controls> + 1 globale feedback-textarea
         (de gedeelde composer in de shell vervult de globale-feedback-rol) ---- */
  registerReviewer('audio', {
    emptyHint: 'Beluister het fragment en schrijf je opmerking hieronder. Klik dan <strong>Toevoegen aan lijst</strong>.',
    init: function (api, ctx) {
      var box = document.createElement('div');
      box.className = 'fc-audio';
      box.innerHTML = '<div class="fc-audio-ic">🎧</div><audio controls preload="metadata" class="fc-audio-el"></audio>' +
        '<p class="fc-audio-hint">Eén feedbackveld voor het hele fragment — schrijf gerust meerdere punten onder elkaar.</p>';
      var el = box.querySelector('audio');
      el.src = api.stream_url || api.url;
      api.host.appendChild(box);
      this._el = el;
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
  registerReviewer('pptx', Object.assign({}, PDF_REVIEWER, {
    emptyHint: 'Blader door de slides en klik op een plek in een slide om er een opmerking aan te koppelen (of typ je opmerking en verwijs naar het slidenummer). Klik dan <strong>Toevoegen aan lijst</strong>.',
  }));
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
