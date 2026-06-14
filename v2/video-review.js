/* =============================================================================
   Studio 27 Klantenportaal — VIDEO-REVIEW module (frame-accurate feedback)
   -----------------------------------------------------------------------------
   Haakt ZONDER panels.js-wijzigingen in op de bestaande deliverable-rijen
   (.deliv-file): een klik op een Vimeo- of Google Drive-videolink opent de
   review-overlay i.p.v. een nieuw tabblad. Klant ziet de video in een compact
   venster (fullscreen optioneel), klikt op het beeld → pauze + genummerde pin
   + comment (+ bijlagen), en verzendt alles in één keer → worker bewaart de
   bundel en post een leesbare ClickUp-comment op dezelfde taak.

   Gateway-endpoints: videoReviewContext / videoReviewUpload / videoReviewSubmit
   (Firebase-authed; bedrijf-scope server-side). Streams via signed GET-routes.
   Afhankelijk van globals uit api.js/data.js: GATEWAY_BASE, state, esc,
   S27Auth, S27DATA. Vimeo Player SDK wordt pas geladen wanneer nodig.
   ============================================================================= */
(function () {
  'use strict';

  var VR_VIMEO_RE = /(?:player\.)?vimeo\.com\/(?:video\/|manage\/videos\/)?\d+/;
  var VR_DRIVE_RE = /drive\.google\.com\/(?:file\/d\/[-\w]{20,}|(?:open|uc)\?[^#]*\bid=[-\w]{20,})/;
  var EXT_ALLOW = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'ttf', 'otf', 'woff', 'woff2', 'zip'];
  var ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.ttf,.otf,.woff,.woff2,.zip';
  var MAX_BYTES = 15 * 1024 * 1024;
  var SHOW_WINDOW_SEC = 0.5;
  var TAP_SLOP_PX = 10;

  function isReviewable(url) {
    var s = String(url || '');
    return VR_VIMEO_RE.test(s) || VR_DRIVE_RE.test(s);
  }

  /* ---------------- gedeelde mini-helpers ---------------- */
  function fmtTime(sec) {
    var s = Math.max(0, Number(sec) || 0);
    var m = Math.floor(s / 60);
    return m + ':' + (s - m * 60).toFixed(1).padStart(4, '0');
  }
  function rid(p) { return p + '_' + Math.random().toString(36).slice(2, 10); }
  function toast(msg, ms) {
    var t = document.getElementById('vrToast');
    if (!t) { t = document.createElement('div'); t.id = 'vrToast'; t.className = 'vr-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
  }
  function vrHeaders(token) {
    var h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    if (window.state && state.adminMode && state.activeBedrijf) h['X-Act-As-Bedrijf'] = String(state.activeBedrijf);
    return h;
  }
  async function authedPost(key, payload) {
    try {
      var token = window.S27Auth ? await window.S27Auth.token() : null;
      if (!token) return { ok: false, status: 401 };
      var r = await fetch(GATEWAY_BASE + '/' + key, { method: 'POST', headers: vrHeaders(token), body: JSON.stringify(payload || {}) });
      var d = await r.json().catch(function () { return {}; });
      return { ok: r.ok, status: r.status, data: d };
    } catch (e) { return { ok: false, status: 0, data: {} }; }
  }
  // upload met voortgang: XHR (fetch heeft geen upload-progress)
  function uploadB64(payload, token, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', GATEWAY_BASE + '/videoReviewUpload');
      var h = vrHeaders(token);
      Object.keys(h).forEach(function (k) { xhr.setRequestHeader(k, h[k]); });
      xhr.upload.addEventListener('progress', function (e) {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      });
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
  function fileToB64(file) {
    return new Promise(function (resolve, reject) {
      var rd = new FileReader();
      rd.onload = function () { resolve(String(rd.result).replace(/^data:[^;]*;base64,/, '')); };
      rd.onerror = function () { reject(new Error('Bestand kon niet gelezen worden.')); };
      rd.readAsDataURL(file);
    });
  }
  function extOf(name) { return (String(name || '').split('.').pop() || '').toLowerCase(); }
  function fileIcon(name) {
    var e = extOf(name);
    if (['ttf', 'otf', 'woff', 'woff2'].indexOf(e) >= 0) return '🔤';
    if (e === 'zip') return '📦';
    return '📄';
  }
  function isImg(ct) { return /^image\//.test(String(ct || '')); }
  function gwUrl(rel) { return rel ? GATEWAY_BASE + rel : ''; }

  // Vimeo Player SDK on-demand laden (portaal laadt dit niet standaard)
  var _vimeoSdk = null;
  function ensureVimeoSdk() {
    if (window.Vimeo && window.Vimeo.Player) return Promise.resolve();
    if (_vimeoSdk) return _vimeoSdk;
    _vimeoSdk = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://player.vimeo.com/api/player.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { _vimeoSdk = null; reject(new Error('Vimeo-speler kon niet geladen worden.')); };
      document.head.appendChild(s);
    });
    return _vimeoSdk;
  }

  /* =============================================================================
     SPELER — dual-mode wrapper (vimeo iframe / drive <video>), zelfde API als POC
     ============================================================================= */
  function createPlayer() {
    var mode = 'vimeo', player = null, videoEl = null, containerEl = null;
    var videoW = 1920, videoH = 1080, duration = 0, lastTime = 0, paused = true;
    var timeL = [], stateL = [];
    var emitTime = function () { timeL.forEach(function (f) { f(lastTime, duration); }); };
    var emitState = function (p) { stateL.forEach(function (f) { f(p); }); };

    async function init(container, video, opts) {
      containerEl = container;
      mode = video.source === 'drive' ? 'drive' : 'vimeo';
      if (mode === 'drive') return initDrive(container, video, opts || {});
      await ensureVimeoSdk();
      return initVimeo(container, video);
    }
    async function initVimeo(container, video) {
      player = new Vimeo.Player(container, {
        url: video.url, responsive: true, byline: false, title: false, portrait: false,
        pip: false, dnt: true, controls: false, keyboard: false,
      });
      await player.ready();
      var wh = await Promise.all([player.getVideoWidth(), player.getVideoHeight(), player.getDuration()]);
      videoW = wh[0] || 1920; videoH = wh[1] || 1080; duration = wh[2] || 0;
      player.on('timeupdate', function (d) { lastTime = d.seconds; emitTime(); });
      player.on('seeked', function (d) { lastTime = d.seconds; emitTime(); });
      player.on('pause', function (d) { lastTime = d.seconds; paused = true; emitState(true); });
      player.on('play', function () { paused = false; emitState(false); });
      player.on('ended', function () { paused = true; emitState(true); });
      var title = null;
      try { title = await player.getVideoTitle(); } catch (e) { }
      return { videoW: videoW, videoH: videoH, duration: duration, title: title };
    }
    function initDrive(container, video, opts) {
      return new Promise(function (resolve, reject) {
        videoEl = document.createElement('video');
        videoEl.src = opts.srcUrl;
        videoEl.playsInline = true;
        videoEl.preload = 'metadata';
        videoEl.className = 'vr-video';
        container.appendChild(videoEl);
        videoEl.addEventListener('loadedmetadata', function () {
          videoW = videoEl.videoWidth || video.videoWidth || 1920;
          videoH = videoEl.videoHeight || video.videoHeight || 1080;
          duration = videoEl.duration || video.durationSec || 0;
          resolve({ videoW: videoW, videoH: videoH, duration: duration, title: video.title || null });
        }, { once: true });
        videoEl.addEventListener('error', function () { reject(new Error('drive_video_load')); }, { once: true });
        videoEl.addEventListener('timeupdate', function () { lastTime = videoEl.currentTime; emitTime(); });
        videoEl.addEventListener('seeked', function () { lastTime = videoEl.currentTime; emitTime(); });
        videoEl.addEventListener('pause', function () { lastTime = videoEl.currentTime; paused = true; emitState(true); });
        videoEl.addEventListener('play', function () { paused = false; emitState(false); });
        videoEl.addEventListener('ended', function () { paused = true; emitState(true); });
        if (videoEl.requestVideoFrameCallback) {
          var tick = function (_n, md) { lastTime = md.mediaTime; emitTime(); videoEl.requestVideoFrameCallback(tick); };
          videoEl.requestVideoFrameCallback(tick);
        }
      });
    }
    async function getTime() {
      lastTime = mode === 'drive' ? videoEl.currentTime : await player.getCurrentTime();
      return lastTime;
    }
    async function seekTo(sec) {
      var target = Math.max(0, Math.min(sec, duration || sec));
      if (mode === 'drive') {
        await new Promise(function (done) {
          videoEl.addEventListener('seeked', done, { once: true });
          videoEl.currentTime = target;
        });
        videoEl.pause();
        lastTime = videoEl.currentTime;
      } else {
        lastTime = await player.setCurrentTime(target);
        await player.pause();
      }
      emitTime();
      return lastTime;
    }
    function getVisibleRect() {
      var box = containerEl.getBoundingClientRect();
      if (!box.width || !box.height) return { x: 0, y: 0, w: 0, h: 0 };
      var va = videoW / videoH, ba = box.width / box.height, w, h, x, y;
      if (ba > va) { h = box.height; w = h * va; x = (box.width - w) / 2; y = 0; }
      else { w = box.width; h = w / va; x = 0; y = (box.height - h) / 2; }
      return { x: x, y: y, w: w, h: h };
    }
    return {
      init: init, getTime: getTime, seekTo: seekTo,
      pause: function () { return mode === 'drive' ? videoEl.pause() : player.pause(); },
      play: function () { return mode === 'drive' ? videoEl.play() : player.play(); },
      toggle: function () { return paused ? (mode === 'drive' ? videoEl.play() : player.play()) : (mode === 'drive' ? videoEl.pause() : player.pause()); },
      isPaused: function () { return paused; },
      onTime: function (f) { timeL.push(f); },
      onState: function (f) { stateL.push(f); },
      getVisibleRect: getVisibleRect,
      getDurationSec: function () { return duration; },
      getLastTime: function () { return lastTime; },
      destroy: function () {
        try { if (player) player.destroy(); } catch (e) { }
        try { if (videoEl) { videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load(); } } catch (e) { }
        player = null; videoEl = null; timeL = []; stateL = [];
      },
    };
  }

  /* =============================================================================
     REVIEW-OVERLAY — volledige flow in één afgesloten instantie
     ============================================================================= */
  var current = null; // actieve review-instantie (max 1)

  async function openReview(opts) {
    if (current) { try { current.close(); } catch (e) { } }
    var taskId = String(opts.taskId || '');
    var url = String(opts.url || '');
    var label = String(opts.label || 'Video');
    if (!taskId || !url) { window.open(url, '_blank', 'noopener'); return; }

    var P = createPlayer();
    var st = {
      taskId: taskId, video: null, annotations: [], reviewAttachments: [],
      pendingPin: null, editingId: null, composerAtts: [], uploadsBusy: 0,
      streamUrl: null, downloadUrl: null, draftKey: null, closed: false,
    };

    /* ---- skelet ---- */
    var root = document.createElement('div');
    root.className = 'vr-root';
    root.innerHTML =
      '<div class="vr-shell" role="dialog" aria-label="Video-feedback">' +
      '  <header class="vr-top">' +
      '    <div class="vr-title"><div><h2 id="vrTitle"></h2><span class="vr-sub" id="vrSub">Feedbackronde</span></div></div>' +
      '    <div class="vr-actions">' +
      '      <a id="vrDownload" class="vr-btn vr-ghost vr-hidden" download><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="vr-dl-txt">Download</span></a>' +
      '      <button id="vrApprove" class="vr-btn">✓ Video goedkeuren</button>' +
      '      <button id="vrSend" class="vr-btn vr-primary">Feedback verzenden <span id="vrCount" class="vr-countbadge vr-hidden">0</span></button>' +
      '      <button id="vrClose" class="vr-x" title="Sluiten" aria-label="Sluiten"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
      '    </div>' +
      '  </header>' +
      '  <div class="vr-loading" id="vrLoading"><div class="vr-spin"></div><p>Video wordt geladen…</p></div>' +
      '  <main class="vr-main vr-hidden" id="vrMain">' +
      '    <section class="vr-stagecol">' +
      '      <div class="vr-prevnote vr-hidden" id="vrPrev"></div>' +
      '      <div class="vr-stage" id="vrStage">' +
      '        <div class="vr-wrap" id="vrWrap"><div id="vrHost"></div><div id="vrPins"></div><div id="vrOverlay"></div>' +
      '          <button id="vrFs" class="vr-fsbtn" title="Volledig scherm"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '        </div>' +
      '        <div class="vr-ctrl">' +
      '          <button id="vrPlay" class="vr-playbtn" title="Afspelen / pauzeren">' +
      '            <svg id="vrIcoPlay" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>' +
      '            <svg id="vrIcoPause" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="vr-hidden"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>' +
      '          </button>' +
      '          <div id="vrBar"><div id="vrProg"></div></div>' +
      '          <span id="vrTime" class="vr-time">0:00.0</span>' +
      '        </div>' +
      '        <p class="vr-hint">📍 Klik of tik op de video om een feedbackpunt te plaatsen — de video pauzeert vanzelf.</p>' +
      '      </div>' +
      '    </section>' +
      '    <aside class="vr-panel">' +
      '      <div class="vr-panelhead"><h3>Feedbackpunten</h3><span id="vrAnnCount" class="vr-chip">0</span></div>' +
      '      <div id="vrList" class="vr-list"><p class="vr-empty" id="vrEmpty">Nog geen feedbackpunten.<br>Klik of tik gewoon <strong>op de video</strong>.</p></div>' +
      '      <div class="vr-atts">' +
      '        <h4>Bijlagen voor het team</h4>' +
      '        <label class="vr-drop"><input id="vrPanelFiles" type="file" accept="' + ACCEPT + '" multiple hidden><span>+ bestand (beeld, PDF, font, ZIP — max 15 MB)</span></label>' +
      '        <div id="vrPanelAtts" class="vr-attrow"></div>' +
      '      </div>' +
      '    </aside>' +
      '  </main>' +
      '</div>' +
      '<div id="vrCompScrim" class="vr-scrim vr-hidden"></div>' +
      '<div id="vrComposer" class="vr-composer vr-hidden">' +
      '  <div class="vr-comphead"><span class="vr-pindot" id="vrCompNum">1</span><span class="vr-timechip" id="vrCompTime">0:00.0</span></div>' +
      '  <textarea id="vrCompText" rows="3" placeholder="Wat wil je hier aangepast zien?"></textarea>' +
      '  <div id="vrCompAtts" class="vr-attrow"></div>' +
      '  <div class="vr-compfoot">' +
      '    <label class="vr-attach" title="Bijlage toevoegen"><input id="vrCompFile" type="file" accept="' + ACCEPT + '" multiple hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m21 12-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6L15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></label>' +
      '    <span class="vr-spacer"></span>' +
      '    <button id="vrCompCancel" class="vr-btn vr-ghost">Annuleren</button>' +
      '    <button id="vrCompSave" class="vr-btn vr-primary">Plaatsen</button>' +
      '  </div>' +
      '</div>' +
      '<div id="vrSendScrim" class="vr-scrim vr-hidden"></div>' +
      '<div id="vrSendModal" class="vr-modal vr-hidden">' +
      '  <div class="vr-sendhead"><span class="vr-sendic">🎬</span><div><b>Feedback doorsturen</b><span>We gaan er meteen mee aan de slag.</span></div></div>' +
      '  <div class="vr-sendsum" id="vrSendLine"></div>' +
      '  <label class="vr-field"><span>Algemene opmerking <em>(optioneel)</em></span><textarea id="vrSummary" rows="3" placeholder="Feedback die niet aan één punt hangt…"></textarea></label>' +
      '  <label class="vr-confirm"><input type="checkbox" id="vrSendVolledig"><span>Mijn feedback voor deze video is <b>volledig</b> — Studio 27 mag starten met de verwerking.</span></label>' +
      '  <p id="vrSendErr" class="vr-err vr-hidden"></p>' +
      '  <div class="vr-modalfoot"><button id="vrSendCancel" class="vr-btn vr-ghost">Terug</button><button id="vrSendGo" class="vr-btn vr-primary">Verzenden</button></div>' +
      '</div>';
    document.body.appendChild(root);
    document.body.classList.add('vr-open');
    var $ = function (id) { return root.querySelector('#' + id); };
    $('vrTitle').textContent = label;

    // sidebar is zichtbaar naast de review (desktop): een nav-klik sluit de review eerst,
    // anders navigeert het portaal onzichtbaar achter de overlay.
    var navClose = function (e) { if (!st.closed && e.target.closest('.sb-item')) close(); };
    document.addEventListener('click', navClose, true);
    var vrLift = function (on) { try { document.body.classList.toggle('vr-lift', !!on); } catch (e) { } };
    function close() {
      if (st.closed) return;
      st.closed = true;
      vrLift(false);
      try { document.removeEventListener('click', navClose, true); } catch (e) { }
      try { P.destroy(); } catch (e) { }
      try { document.body.classList.remove('vr-open'); } catch (e) { }
      try { root.remove(); } catch (e) { }
      current = null;
    }
    $('vrClose').addEventListener('click', function () {
      if (!st.locked && st.annotations.length && !confirm('Je hebt nog niet-verzonden feedback. Sluiten? (Je punten blijven lokaal bewaard.)')) return;
      if (!st.locked) saveDraft();
      close();
    });
    current = { close: close };

    /* ---- context ophalen ---- */
    var ctx = await authedPost('videoReviewContext', { task_id: taskId, url: url });
    var d = (ctx.data || {});
    if (st.closed) return;
    if (!ctx.ok || !d.ok) {
      close();
      if (d && d.error === 'drive_no_access') toast(d.message || 'Het portaal kan dit Drive-bestand niet lezen.', 5000);
      window.open((d && d.open_url) || url, '_blank', 'noopener');
      return;
    }
    st.video = d.video;
    st.streamUrl = gwUrl(d.stream_url);
    st.downloadUrl = gwUrl(d.download_url);
    st.draftKey = 'vr_draft_' + taskId + '_' + st.video.source + st.video.externalId;

    // FEEDBACK-LOCK (slice 3): na definitief doorsturen is deze versie read-only naslag.
    // Je punten blijven zichtbaar (pins + kaarten + bijlagen), maar niets is nog bewerkbaar.
    st.locked = d.is_read_only === true;
    if (st.locked) {
      root.classList.add('vr-locked');
      try { localStorage.removeItem(st.draftKey); } catch (e) { }
      var lb = d.last_bundle || null;
      st.annotations = lb && Array.isArray(lb.annotations) ? lb.annotations.map(function (a, i) {
        return {
          id: 'prev_' + i, sequenceNumber: a.sequenceNumber || (i + 1),
          timestampSec: Number(a.timestampSec) || 0, hasPin: !!a.hasPin,
          xPct: Number(a.xPct) || 0, yPct: Number(a.yPct) || 0,
          comment: String(a.comment || ''), locked: true,
          attachments: (a.attachments || []).map(function (x) { return { filename: String(x.filename || 'bijlage'), url: gwUrl(x.url), uploadStatus: 'stored' }; }),
        };
      }) : [];
      st.lockedSummary = lb && lb.summary ? String(lb.summary) : '';
    } else {
      loadDraft();
    }

    if (d.video.title) $('vrTitle').textContent = d.video.title;
    if (d.ronde) $('vrSub').textContent = 'Feedbackronde ' + d.ronde;
    if (d.is_approved) { $('vrSub').textContent = 'Goedgekeurd ✓'; }
    if (st.locked) {
      var prevL = $('vrPrev');
      prevL.innerHTML = (d.is_approved
        ? 'Deze video is goedgekeurd — mooi zo! Hieronder vind je alles als naslag terug.'
        : 'Je feedback op deze versie is definitief doorgestuurd' + (d.last_submitted_at ? ' op ' + new Date(d.last_submitted_at).toLocaleDateString('nl-BE') : '') + '. Hieronder zie je de punten als naslag.')
        + (st.lockedSummary ? '<br><span class="vr-locksum">Algemene opmerking: ' + st.lockedSummary.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>' : '');
      prevL.classList.remove('vr-hidden');
      prevL.classList.add('vr-lockbanner');
    } else if (d.last_submitted_at) {
      var prev = $('vrPrev');
      prev.textContent = '✓ Je verstuurde eerder feedback op deze video (' + new Date(d.last_submitted_at).toLocaleDateString('nl-BE') + '). Nieuwe punten worden een nieuwe ronde.';
      prev.classList.remove('vr-hidden');
    }
    if (st.video.source === 'drive' && st.downloadUrl) {
      var dl = $('vrDownload');
      dl.href = st.downloadUrl + '&name=' + encodeURIComponent((st.video.title || 'video.mp4'));
      dl.classList.remove('vr-hidden');
    }

    /* ---- speler ---- */
    var meta;
    try {
      meta = await P.init($('vrHost'), st.video, { srcUrl: st.streamUrl });
    } catch (e) {
      close();
      toast(st.video.source === 'drive'
        ? 'Deze video kan hier niet afgespeeld worden (tip: exporteer als MP4/H.264). We openen het origineel.'
        : 'De Vimeo-video kan niet geladen worden. We openen het origineel.', 5200);
      window.open(st.video.url || url, '_blank', 'noopener');
      return;
    }
    if (st.closed) return;
    if (!st.video.title && meta.title) $('vrTitle').textContent = meta.title;
    $('vrLoading').classList.add('vr-hidden');
    $('vrMain').classList.remove('vr-hidden');

    var durLabel = fmtTime(meta.duration || 0);
    $('vrTime').textContent = '0:00.0 / ' + durLabel;
    P.onTime(function (t) { $('vrTime').textContent = fmtTime(t) + ' / ' + durLabel; renderPins(); renderProgress(); });
    P.onState(function (isPaused) {
      $('vrIcoPlay').classList.toggle('vr-hidden', !isPaused);
      $('vrIcoPause').classList.toggle('vr-hidden', isPaused);
    });
    $('vrPlay').addEventListener('click', function () { P.toggle(); });

    /* ---- fullscreen (eigen element-fullscreen: pins blijven zichtbaar) ---- */
    $('vrFs').addEventListener('click', function () {
      var stage = $('vrStage');
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (req) {
        var pr = null;
        try { pr = req.call(stage); } catch (err) { pr = null; }
        if (pr && pr.catch) pr.catch(function () { stage.classList.toggle('vr-max'); vrLift(stage.classList.contains('vr-max')); });
      } else {
        stage.classList.toggle('vr-max'); // oudere iOS: maximaliseer binnen de viewport
        vrLift(stage.classList.contains('vr-max'));
      }
      setTimeout(layoutPins, 350);
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () { setTimeout(layoutPins, 120); });
    });

    /* ---- annotatie-kern ---- */
    var activeId = null;
    function layoutPins() {
      var r = P.getVisibleRect();
      var pins = $('vrPins');
      pins.style.left = r.x + 'px'; pins.style.top = r.y + 'px';
      pins.style.width = r.w + 'px'; pins.style.height = r.h + 'px';
    }
    new ResizeObserver(function () { layoutPins(); }).observe($('vrWrap'));

    function pinVisible(a) {
      if (!a.hasPin) return false;
      if (a.id === activeId) return true;
      return Math.abs(a.timestampSec - P.getLastTime()) <= SHOW_WINDOW_SEC;
    }
    function renderPins() {
      layoutPins();
      var lay = $('vrPins');
      lay.innerHTML = '';
      st.annotations.forEach(function (a) {
        if (!pinVisible(a)) return;
        var el = document.createElement('button');
        el.className = 'vr-pin' + (a.id === activeId ? ' vr-pulse' : '');
        el.style.left = a.xPct + '%'; el.style.top = a.yPct + '%';
        el.innerHTML = '<span>' + a.sequenceNumber + '</span>';
        el.addEventListener('click', function (e) { e.stopPropagation(); selectAnn(a.id); });
        lay.appendChild(el);
      });
      var tp = st.pendingPin;
      if (tp && tp.xPct != null) {
        var t = document.createElement('div');
        t.className = 'vr-pin vr-temp';
        t.style.left = tp.xPct + '%'; t.style.top = tp.yPct + '%';
        t.innerHTML = '<span>' + tp.sequenceNumber + '</span>';
        lay.appendChild(t);
      }
    }
    function renderProgress() {
      var dur = P.getDurationSec();
      if (dur) $('vrProg').style.width = ((P.getLastTime() / dur) * 100) + '%';
    }
    function renderMarkers() {
      var bar = $('vrBar');
      bar.querySelectorAll('.vr-marker').forEach(function (m) { m.remove(); });
      var dur = P.getDurationSec();
      if (!dur) return;
      var groups = [];
      st.annotations.slice().sort(function (a, b) { return a.timestampSec - b.timestampSec; }).forEach(function (a) {
        var pct = (a.timestampSec / dur) * 100;
        var g = groups[groups.length - 1];
        if (g && pct - g.pct <= 2) g.items.push(a);
        else groups.push({ pct: pct, items: [a] });
      });
      groups.forEach(function (g) {
        var el = document.createElement('button');
        el.className = 'vr-marker' + (g.items.length > 1 ? ' vr-cluster' : '');
        el.style.left = g.pct + '%';
        el.textContent = g.items.length > 1 ? String(g.items.length) : '';
        el.addEventListener('click', function (e) { e.stopPropagation(); selectAnn(g.items[0].id); });
        bar.appendChild(el);
      });
    }
    $('vrBar').addEventListener('click', function (e) {
      if (e.target !== $('vrBar') && e.target !== $('vrProg')) return;
      var box = $('vrBar').getBoundingClientRect();
      P.seekTo(Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * P.getDurationSec());
    });
    async function selectAnn(id) {
      var a = st.annotations.find(function (x) { return x.id === id; });
      if (!a) return;
      activeId = id;
      await P.seekTo(a.timestampSec);
      renderPins(); renderMarkers(); highlightCard(id);
      setTimeout(function () { if (activeId === id) { activeId = null; renderPins(); renderMarkers(); } }, 2400);
    }

    // klik/tik op de video = pauze + pin (tap-slop tegen scrollen)
    (function bindOverlay() {
      var ov = $('vrOverlay'), dx = 0, dy = 0, dt = 0;
      ov.addEventListener('pointerdown', function (e) { dx = e.clientX; dy = e.clientY; dt = Date.now(); });
      ov.addEventListener('pointerup', function (e) {
        if (Math.hypot(e.clientX - dx, e.clientY - dy) > TAP_SLOP_PX || Date.now() - dt > 600) return;
        var r = P.getVisibleRect();
        var box = $('vrWrap').getBoundingClientRect();
        var rx = e.clientX - box.left - r.x, ry = e.clientY - box.top - r.y;
        if (rx < 0 || ry < 0 || rx > r.w || ry > r.h) return;
        placePin({
          timestampSec: Math.round(P.getLastTime() * 1000) / 1000,
          xPct: Math.round((rx / r.w) * 1000) / 10,
          yPct: Math.round((ry / r.h) * 1000) / 10,
        });
      });
    })();

    function renumber() {
      st.annotations.slice().sort(function (a, b) { return a.timestampSec - b.timestampSec; })
        .forEach(function (a, i) { a.sequenceNumber = i + 1; });
    }
    function placePin(pin) {
      if (st.locked) { toast('Deze versie is al definitief doorgestuurd — feedback is vergrendeld als naslag.', 3800); return; }
      P.pause();
      var provisional = st.annotations.filter(function (a) { return a.timestampSec <= pin.timestampSec; }).length + 1;
      st.pendingPin = { timestampSec: pin.timestampSec, xPct: pin.xPct, yPct: pin.yPct, sequenceNumber: provisional };
      st.editingId = null;
      st.composerAtts = [];
      renderPins();
      openComposer('');
      P.getTime().then(function (t) {
        if (!st.pendingPin) return;
        st.pendingPin.timestampSec = Math.round(t * 1000) / 1000;
        $('vrCompTime').textContent = fmtTime(st.pendingPin.timestampSec);
      });
    }

    /* ---- composer ---- */
    function openComposer(preset) {
      $('vrCompNum').textContent = st.pendingPin.sequenceNumber;
      $('vrCompTime').textContent = fmtTime(st.pendingPin.timestampSec);
      $('vrCompText').value = preset || '';
      renderCompAtts();
      vrLift(true);
      $('vrCompScrim').classList.remove('vr-hidden');
      var c = $('vrComposer');
      c.classList.remove('vr-hidden');
      if (window.matchMedia('(min-width: 881px) and (pointer: fine)').matches) {
        var wrap = $('vrWrap').getBoundingClientRect();
        var r = P.getVisibleRect();
        var px = wrap.left + r.x + (st.pendingPin.xPct / 100) * r.w;
        var py = wrap.top + r.y + (st.pendingPin.yPct / 100) * r.h;
        var cw = 360, m = 14, left = px + 24;
        if (left + cw > window.innerWidth - m) left = px - cw - 24;
        c.style.left = Math.max(m, left) + 'px';
        c.style.top = Math.max(m, Math.min(py - 40, window.innerHeight - 300)) + 'px';
        c.style.bottom = 'auto'; c.style.transform = 'none';
      } else {
        c.style.left = ''; c.style.top = ''; c.style.bottom = ''; c.style.transform = '';
      }
      $('vrCompText').focus(); // synchroon binnen de tap-gesture (iOS-toetsenbord)
    }
    function closeComposer(cancelled) {
      vrLift(false);
      $('vrComposer').classList.add('vr-hidden');
      $('vrCompScrim').classList.add('vr-hidden');
      if (cancelled) { st.pendingPin = null; st.editingId = null; st.composerAtts = []; }
      renderPins();
    }
    $('vrCompCancel').addEventListener('click', function () { closeComposer(true); });
    $('vrCompScrim').addEventListener('mousedown', function () {
      if (!$('vrCompText').value.trim()) closeComposer(true); // mis-klik gooit geen tekst weg
    });
    $('vrCompSave').addEventListener('click', function () {
      var text = $('vrCompText').value.trim();
      if (!text) { toast('Schrijf eerst je opmerking.'); return; }
      if (st.uploadsBusy > 0) { toast('Even wachten tot de bijlage klaar is…'); return; }
      if (st.editingId) {
        var a = st.annotations.find(function (x) { return x.id === st.editingId; });
        if (a) {
          a.comment = text;
          a.attachments = st.composerAtts.filter(function (x) { return x.uploadStatus === 'stored'; });
        }
        st.editingId = null; st.pendingPin = null; st.composerAtts = [];
        closeComposer(false); saveDraft(); renderAll();
        toast('Feedbackpunt bijgewerkt ✓');
        return;
      }
      var p = st.pendingPin;
      st.annotations.push({
        id: rid('ann'), sequenceNumber: p.sequenceNumber, timestampSec: p.timestampSec,
        hasPin: true, xPct: p.xPct, yPct: p.yPct, comment: text,
        attachments: st.composerAtts.filter(function (x) { return x.uploadStatus === 'stored'; }),
        createdAt: new Date().toISOString(),
      });
      var ann = st.annotations[st.annotations.length - 1];
      renumber();
      st.pendingPin = null; st.composerAtts = [];
      closeComposer(false); saveDraft(); renderAll();
      toast('Feedbackpunt ' + ann.sequenceNumber + ' geplaatst ✓');
    });

    /* ---- uploads ---- */
    function attChip(att, onRemove) {
      var chip = document.createElement('span');
      chip.className = 'vr-attchip';
      var u = gwUrl(att.fileUrl);
      var thumb = isImg(att.contentType) && u ? '<img src="' + esc(u) + '" alt="">' : '<span class="vr-ico">' + fileIcon(att.filename) + '</span>';
      chip.innerHTML = thumb + '<a class="vr-nm" target="_blank" rel="noopener"></a>' + (onRemove ? '<button class="vr-xs" title="Verwijderen">×</button>' : '');
      var nm = chip.querySelector('.vr-nm');
      nm.textContent = att.filename;
      if (u) nm.href = u;
      if (onRemove) chip.querySelector('.vr-xs').addEventListener('click', onRemove);
      return chip;
    }
    function renderCompAtts() {
      var row = $('vrCompAtts');
      row.innerHTML = '';
      st.composerAtts.filter(function (a) { return a.uploadStatus === 'stored'; }).forEach(function (att) {
        row.appendChild(attChip(att, function () {
          st.composerAtts.splice(st.composerAtts.indexOf(att), 1);
          renderCompAtts();
        }));
      });
    }
    function renderReviewAtts() {
      var row = $('vrPanelAtts');
      row.innerHTML = '';
      st.reviewAttachments.filter(function (a) { return a.uploadStatus === 'stored'; }).forEach(function (att) {
        row.appendChild(attChip(att, function () {
          st.reviewAttachments.splice(st.reviewAttachments.indexOf(att), 1);
          renderReviewAtts(); saveDraft();
        }));
      });
    }
    async function addUpload(file, scope, rowEl, collection, rerender) {
      var e = extOf(file.name);
      if (EXT_ALLOW.indexOf(e) < 0) { toast('Dit bestandstype kan niet: beeld, PDF, font of ZIP.', 3600); return; }
      if (file.size > MAX_BYTES) { toast('"' + file.name + '" is groter dan 15 MB.', 3600); return; }
      var chip = document.createElement('span');
      chip.className = 'vr-attchip vr-uploading';
      chip.innerHTML = (isImg(file.type) ? '<img src="' + URL.createObjectURL(file) + '" alt="">' : '<span class="vr-ico">' + fileIcon(file.name) + '</span>') +
        '<span class="vr-nm"></span><span class="vr-prog"><i></i></span>';
      chip.querySelector('.vr-nm').textContent = file.name;
      rowEl.appendChild(chip);
      var entry = { uploadStatus: 'pending', filename: file.name };
      collection.push(entry);
      st.uploadsBusy++;
      try {
        var b64 = await fileToB64(file);
        var token = window.S27Auth ? await window.S27Auth.token() : null;
        if (!token) throw new Error('Niet ingelogd.');
        var meta = await uploadB64(
          { task_id: st.taskId, filename: file.name, file_data: b64, scope: scope },
          token,
          function (p) { var el = chip.querySelector('.vr-prog i'); if (el) el.style.height = p + '%'; }
        );
        Object.assign(entry, meta);
        saveDraft();
        rerender();
      } catch (err) {
        collection.splice(collection.indexOf(entry), 1);
        chip.remove();
        toast(err.message || 'Upload mislukt.', 3800);
      } finally { st.uploadsBusy--; }
    }
    $('vrCompFile').addEventListener('change', function (e) {
      Array.prototype.forEach.call(e.target.files, function (f) { addUpload(f, 'annotation', $('vrCompAtts'), st.composerAtts, renderCompAtts); });
      e.target.value = '';
    });
    $('vrPanelFiles').addEventListener('change', function (e) {
      Array.prototype.forEach.call(e.target.files, function (f) { addUpload(f, 'review', $('vrPanelAtts'), st.reviewAttachments, renderReviewAtts); });
      e.target.value = '';
    });

    /* ---- lijst ---- */
    function renderAll() {
      renderList(); renderReviewAtts(); renderPins(); renderMarkers();
      var n = st.annotations.length;
      $('vrAnnCount').textContent = n;
      $('vrCount').textContent = n;
      $('vrCount').classList.toggle('vr-hidden', n === 0);
      $('vrEmpty').classList.toggle('vr-hidden', n > 0);
    }
    function renderList() {
      var list = $('vrList');
      list.querySelectorAll('.vr-card').forEach(function (el) { el.remove(); });
      st.annotations.slice().sort(function (a, b) { return a.timestampSec - b.timestampSec; }).forEach(function (a) {
        var card = document.createElement('div');
        card.className = 'vr-card';
        card.dataset.id = a.id;
        card.innerHTML =
          '<div class="vr-cardtop"><span class="vr-pindot">' + a.sequenceNumber + '</span>' +
          '<span class="vr-timechip">▶ ' + fmtTime(a.timestampSec) + '</span>' +
          '<button class="vr-edit" title="Bewerken"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>' +
          '<button class="vr-del" title="Verwijderen">×</button></div>' +
          '<div class="vr-cardtxt"></div><div class="vr-attrow"></div>';
        card.querySelector('.vr-cardtxt').textContent = a.comment;
        var row = card.querySelector('.vr-attrow');
        (a.attachments || []).forEach(function (att) { row.appendChild(attChip(att, null)); });
        card.addEventListener('click', function (e) {
          if (e.target.closest('.vr-del') || e.target.closest('.vr-edit') || e.target.closest('.vr-attchip')) return;
          selectAnn(a.id);
        });
        card.querySelector('.vr-edit').addEventListener('click', function () {
          st.editingId = a.id;
          st.pendingPin = { timestampSec: a.timestampSec, xPct: a.xPct, yPct: a.yPct, sequenceNumber: a.sequenceNumber, hasPin: a.hasPin };
          st.composerAtts = (a.attachments || []).slice();
          openComposer(a.comment);
          P.seekTo(a.timestampSec).then(function () { renderPins(); });
        });
        card.querySelector('.vr-del').addEventListener('click', function () {
          st.annotations = st.annotations.filter(function (x) { return x.id !== a.id; });
          renumber(); saveDraft(); renderAll();
        });
        list.appendChild(card);
      });
    }
    function highlightCard(id) {
      root.querySelectorAll('.vr-card').forEach(function (el) { el.classList.toggle('vr-active', el.dataset.id === id); });
      var el = root.querySelector('.vr-card[data-id="' + id + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ---- draft ---- */
    function saveDraft() {
      try {
        localStorage.setItem(st.draftKey, JSON.stringify({ annotations: st.annotations, reviewAttachments: st.reviewAttachments }));
      } catch (e) { }
    }
    function loadDraft() {
      try {
        var dd = JSON.parse(localStorage.getItem(st.draftKey) || 'null');
        if (dd) {
          st.annotations = (dd.annotations || []).map(function (a) {
            a.attachments = (a.attachments || []).filter(function (x) { return x.uploadStatus === 'stored'; });
            return a;
          });
          st.reviewAttachments = (dd.reviewAttachments || []).filter(function (x) { return x.uploadStatus === 'stored'; });
        }
      } catch (e) { }
    }

    /* ---- verzenden ---- */
    $('vrApprove').addEventListener('click', async function () {
      if (st.locked) { toast('Deze video is al afgerond.', 2800); return; }
      if (st.annotations.length && !confirm('Je hebt nog niet-verzonden feedbackpunten staan. Toch goedkeuren? (Je punten worden dan niet verstuurd.)')) return;
      if (!confirm('Keur je deze video definitief goed? Daarna kan ze gedownload worden en sluiten we de feedbackronde af.')) return;
      var ab = $('vrApprove'); ab.disabled = true; ab.textContent = 'Goedkeuren…';
      var res = await authedPost('videoReviewApprove', {
        task_id: st.taskId,
        klant_naam: (window.S27DATA && S27DATA.bedrijfsnaam) ? S27DATA.bedrijfsnaam() : 'Klant',
        video: { source: st.video.source, externalId: st.video.externalId, title: st.video.title || '' },
      });
      if (res.ok && res.data && res.data.ok) {
        try { localStorage.removeItem(st.draftKey); } catch (e) { }
        close();
        toast(res.data.all_approved
          ? '🎉 Video goedgekeurd — bedankt! Je kan alles nu ook downloaden.'
          : '🎉 Video goedgekeurd! Zodra je de overige video\u2019s van dit onderdeel goedkeurt, komen de downloads vrij.', 4600);
        // detail verversen zodat de status/downloads meteen kloppen
        try {
          if (window.state && state.viewMode === 'project' && state.activeProject && typeof openProject === 'function') {
            delete (state.data.details || {})[state.activeProject];
            state._bustDetail = state.activeProject;
            openProject(state.activeProject, 'auto');
          }
        } catch (e) { }
      } else {
        ab.disabled = false; ab.textContent = '✓ Video goedkeuren';
        toast('Goedkeuren lukte net niet — probeer zo opnieuw.', 3600);
      }
    });
    $('vrSend').addEventListener('click', function () {
      if (st.locked) { toast('Je feedback is al definitief doorgestuurd.', 3200); return; }
      if (!st.annotations.length) { toast('Plaats eerst minstens één feedbackpunt.'); return; }
      var n = st.annotations.length;
      var attN = st.reviewAttachments.filter(function (x) { return x.uploadStatus === 'stored'; }).length
        + st.annotations.reduce(function (s, a) { return s + (a.attachments || []).length; }, 0);
      $('vrSendLine').innerHTML = '<span class="vr-sumchip">' + n + ' feedbackpunt' + (n === 1 ? '' : 'en') + '</span>'
        + (attN ? '<span class="vr-sumchip">' + attN + ' bijlage' + (attN === 1 ? '' : 'n') + '</span>' : '')
        + (st.video && st.video.title ? '<span class="vr-sumchip">' + String(st.video.title).replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 48) + '</span>' : '');
      var vk = $('vrSendVolledig'); if (vk) vk.checked = false;
      $('vrSendErr').classList.add('vr-hidden');
      vrLift(true);
      $('vrSendScrim').classList.remove('vr-hidden');
      $('vrSendModal').classList.remove('vr-hidden');
    });
    function closeSend() { vrLift(false); $('vrSendScrim').classList.add('vr-hidden'); $('vrSendModal').classList.add('vr-hidden'); }
    $('vrSendCancel').addEventListener('click', closeSend);
    $('vrSendScrim').addEventListener('mousedown', closeSend);
    $('vrSendGo').addEventListener('click', async function () {
      if (st.uploadsBusy > 0) {
        $('vrSendErr').textContent = 'Nog een upload bezig — even geduld.';
        $('vrSendErr').classList.remove('vr-hidden');
        return;
      }
      var vol = $('vrSendVolledig');
      if (vol && !vol.checked) {
        $('vrSendErr').textContent = 'Vink eerst aan dat je feedback volledig is — dan starten wij met de verwerking.';
        $('vrSendErr').classList.remove('vr-hidden');
        return;
      }
      var btn = $('vrSendGo');
      btn.disabled = true; btn.textContent = 'Verzenden…';
      var res = await authedPost('videoReviewSubmit', {
        task_id: st.taskId,
        klant_naam: (window.S27DATA && S27DATA.bedrijfsnaam) ? S27DATA.bedrijfsnaam() : 'Klant',
        video: st.video,
        summary: $('vrSummary').value.trim(),
        annotations: st.annotations,
        reviewAttachments: st.reviewAttachments.filter(function (a) { return a.uploadStatus === 'stored'; }),
      });
      btn.disabled = false; btn.textContent = 'Verzenden';
      var rd = res.data || {};
      if (!res.ok || !rd.ok) {
        $('vrSendErr').textContent = rd.message || 'Verzenden lukte niet — probeer het zo opnieuw.';
        $('vrSendErr').classList.remove('vr-hidden');
        return;
      }
      try { localStorage.removeItem(st.draftKey); } catch (e) { }
      closeSend();
      close();
      toast('🎉 Feedback verzonden — het team gaat ermee aan de slag!', 4200);
      if (opts.sourceEl && opts.sourceEl.isConnected && opts.sourceEl.tagName !== 'BUTTON' && !opts.sourceEl.parentElement.querySelector('.vr-sentpill')) {
        var pill = document.createElement('span');
        pill.className = 'vr-sentpill';
        pill.textContent = '✓ Feedback verzonden';
        opts.sourceEl.insertAdjacentElement('afterend', pill);
      }
      // bron-knop wordt 'Feedback gegeven' (klik = naslag-weergave via de lock)
      if (opts.sourceEl && opts.sourceEl.isConnected && opts.sourceEl.tagName === 'BUTTON') {
        opts.sourceEl.classList.remove('btn-branch'); opts.sourceEl.classList.add('btn-outline');
        opts.sourceEl.innerHTML = '✓ Feedback gegeven';
      }
    });

    renderAll();
  }

  /* ---- iOS-toetsenbord: composer/modal optillen via --vr-kb (visualViewport) ---- */
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var vrKb = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--vr-kb', kb + 'px');
    };
    vv.addEventListener('resize', vrKb);
    vv.addEventListener('scroll', vrKb);
  }

  /* =============================================================================
     INTEGRATIE — klik-delegatie op de bestaande deliverable-rijen (geen
     panels.js-wijziging): video-links openen de review i.p.v. een nieuw tabblad
     ============================================================================= */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var row = a.closest && a.closest('.deliv-file');
    if (!row) return;
    if (!isReviewable(a.href)) return;
    var taskId = (window.state && state.activeProject) ? String(state.activeProject) : '';
    if (!taskId) return; // buiten projectcontext: normaal gedrag
    e.preventDefault();
    openReview({
      url: a.href,
      label: row.getAttribute('data-label') || a.textContent.trim() || 'Video',
      taskId: taskId,
      sourceEl: a,
    });
  });

  window.S27VideoReview = { open: openReview, isReviewable: isReviewable };
})();
