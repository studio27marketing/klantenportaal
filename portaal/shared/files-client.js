/* =============================================================================
 * files-client.js — gedeelde bestandsmodule-client voor de 27-suite (CRM + Productie).
 * -----------------------------------------------------------------------------
 * Framework-onafhankelijk: levert window.S27Files met de robuuste 2 GB multipart-
 * upload-engine plus alle backend-acties (links, lijst, hernoemen, prullenbak,
 * zichtbaarheid, magic link). Elke app rendert zijn eigen UI maar gebruikt deze
 * client voor alles wat met de gateway praat. Auth = Firebase-token van de suite.
 * Backend: gateway s27-portal-gateway-v2 (zie gateway-v2/files.mjs).
 * ============================================================================= */
(function () {
  'use strict';

  // ---- gateway-base + Firebase-token: robuust over de suite-apps heen ----
  function gwBase() {
    try { if (window.S27PORTAL && window.S27PORTAL.GATEWAY) return String(window.S27PORTAL.GATEWAY).replace(/\/+$/, ''); } catch (e) {}
    try { if (window.S27_GATEWAY) return String(window.S27_GATEWAY).replace(/\/+$/, ''); } catch (e) {}
    try { if (window.GATEWAY_BASE) return String(window.GATEWAY_BASE).replace(/\/+$/, ''); } catch (e) {}
    return '';
  }
  async function token() {
    try { if (window.S27TeamAuth && window.S27TeamAuth.token) return await window.S27TeamAuth.token(); } catch (e) {}
    try { if (window.S27Auth && window.S27Auth.token) return await window.S27Auth.token(); } catch (e) {}
    try { if (window.S27PORTAL && window.S27PORTAL.token) return await window.S27PORTAL.token(); } catch (e) {}
    return '';
  }
  function actAs() {
    try { if (window.S27PORTAL && window.S27PORTAL.actAsBedrijf) return String(window.S27PORTAL.actAsBedrijf); } catch (e) {}
    return '';
  }
  function absUrl(path) {
    const p = String(path || '');
    if (/^https?:\/\//i.test(p)) return p;
    return gwBase() + (p.charAt(0) === '/' ? p : '/' + p);
  }

  async function post(ep, body) {
    const tok = await token();
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok };
    const aa = actAs(); if (aa) h['X-Act-As-Bedrijf'] = aa;
    let r;
    try { r = await fetch(gwBase() + '/' + ep, { method: 'POST', headers: h, body: JSON.stringify(body || {}) }); }
    catch (e) { return { ok: false, error: 'network', message: 'Geen verbinding met de server.' }; }
    return r.json().catch(() => ({ ok: false, error: 'bad_json' }));
  }

  // ---- multipart-deel: ruwe binaire POST (eigen route, niet de JSON-router) ----
  async function uploadPart(key, uploadId, part, chunk) {
    const tok = await token();
    const url = gwBase() + '/filespart?key=' + encodeURIComponent(key) + '&uploadId=' + encodeURIComponent(uploadId) + '&part=' + part;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/octet-stream' },
      body: chunk,
    });
    return r.json().catch(() => ({ ok: false }));
  }

  // ---- één bestand uploaden: start -> delen (met retry) -> complete ----
  // meta: { bedrijf_id, entity_type, entity_id, entity_naam, project_id, project_naam, visibility }
  // onProgress(fractie 0..1, verzonden, totaal)
  async function upload(file, meta, onProgress) {
    const st = await post('filesStart', Object.assign({
      filename: file.name, content_type: file.type || '', size: file.size,
    }, meta || {}));
    if (!st || !st.ok) throw new Error((st && st.message) || 'Upload kon niet starten.');
    const key = st.key, uploadId = st.upload_id, fileId = st.file_id;
    const partSize = st.part_size || (20 * 1024 * 1024);
    const total = file.size;
    const parts = [];
    let sent = 0, partNo = 0;

    try {
      if (total === 0) {
        // leeg bestand: één leeg deel
        partNo = 1;
        const res = await uploadPart(key, uploadId, 1, new Blob([]));
        if (!res || !res.ok) throw new Error('Leeg bestand kon niet worden opgeslagen.');
        parts.push({ partNumber: 1, etag: res.etag });
      } else {
        for (let off = 0; off < total; off += partSize) {
          partNo++;
          const chunk = file.slice(off, Math.min(off + partSize, total));
          let res = null, attempt = 0;
          while (attempt < 3) {
            attempt++;
            try { res = await uploadPart(key, uploadId, partNo, chunk); if (res && res.ok) break; } catch (e) { res = null; }
          }
          if (!res || !res.ok) throw new Error('Deel ' + partNo + ' mislukte na meerdere pogingen.');
          parts.push({ partNumber: partNo, etag: res.etag });
          sent += chunk.size;
          if (onProgress) { try { onProgress(Math.min(1, sent / total), sent, total); } catch (e) {} }
        }
      }
    } catch (e) {
      try { await post('filesAbort', { file_id: fileId, key: key, upload_id: uploadId }); } catch (e2) {}
      throw e;
    }

    const done = await post('filesComplete', { file_id: fileId, key: key, upload_id: uploadId, parts: parts });
    if (!done || !done.ok) throw new Error((done && done.message) || 'Upload afronden mislukte.');
    return done.file;
  }

  // ---- thin wrappers rond de team-endpoints ----
  function list(scope) { return post('filesList', scope || {}); }            // {bedrijf_id} of {entity_type, entity_id}[, scope:'trash']
  function addLink(p) { return post('filesAddLink', p || {}); }
  function rename(id, naam) { return post('filesRename', { id: id, naam: naam }); }
  function trash(id) { return post('filesTrash', { id: id }); }
  function restore(id) { return post('filesRestore', { id: id }); }
  function del(id, force) { return post('filesDelete', { id: id, force: !!force }); }
  function setVisibility(id, vis) { return post('filesSetVisibility', { id: id, visibility: vis }); }
  function shareCreate(id, expiresAt) { return post('filesShareCreate', { id: id, expires_at: expiresAt || 0 }); }
  function shareRevoke(id) { return post('filesShareRevoke', { id: id }); }

  // ---- presentatie-helpers ----
  function fmtBytes(b) {
    b = Number(b) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
    return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
  function detectLinkKind(url) {
    const u = String(url || '').toLowerCase();
    if (/figma\.com/.test(u)) return 'figma';
    if (/webflow\.(io|com)/.test(u)) return 'webflow';
    if (/(drive|docs)\.google\.com/.test(u)) return 'drive';
    if (/vimeo\.com|youtube\.com|youtu\.be/.test(u)) return 'video';
    if (/dropbox\.com|wetransfer\.com/.test(u)) return 'transfer';
    return 'website';
  }
  // icoonnaam (lucide-stijl, aanwezig in beide apps)
  function fileIcon(file) {
    if (file && file.kind === 'link') {
      const k = file.link_kind || detectLinkKind(file.external_url);
      if (k === 'figma') return 'figma';
      if (k === 'drive' || k === 'transfer') return 'folder';
      if (k === 'video') return 'video';
      if (k === 'webflow') return 'globe';
      return 'link';
    }
    const ext = String((file && (file.ext || file.naam)) || '').toLowerCase().replace(/^.*\./, '');
    if (/^(png|jpg|jpeg|webp|gif|avif|svg|heic|tif|tiff|bmp)$/.test(ext)) return 'image';
    if (/^(mp4|mov|webm|m4v|avi|mkv)$/.test(ext)) return 'video';
    if (/^(mp3|wav|ogg|m4a|aac|flac)$/.test(ext)) return 'music';
    if (ext === 'pdf') return 'file-text';
    if (/^(zip|rar|7z)$/.test(ext)) return 'archive';
    if (/^(doc|docx)$/.test(ext)) return 'file-text';
    if (/^(xls|xlsx|csv)$/.test(ext)) return 'sheet';
    if (/^(ppt|pptx)$/.test(ext)) return 'presentation';
    return 'file';
  }
  // absolute, deelbare magic-link (publiek, zonder login)
  function shareUrl(file) { return (file && file.share_url) ? absUrl(file.share_url) : ''; }
  // absolute kijk/download-URL (in-portaal, getekend) of de externe link
  function viewUrl(file) { if (!file) return ''; return file.kind === 'link' ? String(file.external_url || '') : absUrl(file.view_url || ''); }
  function downloadUrl(file) { if (!file) return ''; return file.kind === 'link' ? String(file.external_url || '') : absUrl(file.download_url || ''); }

  window.S27Files = {
    list: list, addLink: addLink, upload: upload,
    rename: rename, trash: trash, restore: restore, del: del,
    setVisibility: setVisibility, shareCreate: shareCreate, shareRevoke: shareRevoke,
    post: post, gwBase: gwBase, token: token, absUrl: absUrl,
    fmtBytes: fmtBytes, detectLinkKind: detectLinkKind, fileIcon: fileIcon,
    shareUrl: shareUrl, viewUrl: viewUrl, downloadUrl: downloadUrl,
  };
})();
