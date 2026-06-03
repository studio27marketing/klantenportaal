/* =============================================================================
   Studio 27 Klantenportaal v4 — app-logica (ECHTE wiring)
   -----------------------------------------------------------------------------
   - Login: Firebase (Google + magic-link + TOTP-2FA) via window.S27Auth,
     gespiegeld op de werkende dashboard.js-flow. ?demo=1 = mock-preview.
   - Routing: lazy-load per tab + DEEP-LINK router (?p=&tab= | ?c= | ?n= | ?go=).
   - Handlers: chat→chatPost, slot→inplannen, feedback→feedbackV2, bot→aiStatusBot.
   ============================================================================= */
"use strict";

let currentTab = 'start';
const SECTION_LABEL = { start:'Start', berichten:'Berichten', projecten:'Projecten', socials:'Socials', advertenties:'Advertenties', performance:'Resultaten', diensten:'Onze diensten', meetings:'Meetings', nieuwproject:'Offerte aanvragen', huisstijl:'Huisstijl & bestanden', facturatie:'Facturatie', instellingen:'Instellingen' };

function qsp(){ return new URLSearchParams(location.search); }
function $id(x){ return document.getElementById(x); }

/* =============================================================================
   DEEP-LINK ROUTER — bestemming uit de URL → na auth ernaartoe navigeren
   ============================================================================= */
function parseRoute(){
  const q = qsp();
  const r = { project:q.get('p'), chat:q.get('c'), notif:q.get('n'), tab:q.get('go'), mtab:q.get('tab') };
  if(r.project || r.chat || r.notif || r.tab) return r;
  // hash-variant: #/project/<id>?tab=feedback  of  #/meetings
  const h = location.hash.replace(/^#\/?/, '');
  if(h){
    const parts = h.split('?'); const path = parts[0]; const seg = path.split('/');
    const hq = new URLSearchParams(parts[1]||'');
    if(seg[0]==='project' && seg[1]) return { project:seg[1], mtab:hq.get('tab') };
    if(seg[0]==='chat' && seg[1]) return { chat:seg[1] };
    if(seg[0]) return { tab:seg[0] };
  }
  return null;
}
// URL bijwerken bij navigatie (deelbare links), zonder reload
function syncUrl(){
  if(state.demoMode) return;
  let url = location.pathname;
  if(state.viewMode==='project' && state.activeProject){
    url += '?p=' + encodeURIComponent(state.activeProject) + (state._mtab && state._mtab!=='overzicht' ? '&tab='+state._mtab : '');
  } else if(currentTab && currentTab!=='start'){
    url += '?go=' + encodeURIComponent(currentTab);
  }
  try { history.replaceState(null, '', url); } catch(e){}
}
async function applyRoute(){
  const r = state.route; state.route = null;
  if(!r){ goTab('start'); return; }
  if(r.project){ await openProject(r.project, 'projecten'); if(r.mtab) switchModalTab(r.mtab); return; }
  if(r.chat){ await openProject(r.chat, 'berichten'); switchModalTab('chat'); return; }
  if(r.tab && PANELS[r.tab]){ goTab(r.tab); return; }
  if(r.notif){ goTab('start'); setTimeout(()=>{ const np=$id('notifPanel'); if(np) np.classList.add('show'); }, 400); return; }
  goTab('start');
}

/* =============================================================================
   BOOT
   ============================================================================= */
function init(){
  $id('overlays').innerHTML = buildOverlays();
  state.route = parseRoute();
  S27.onSessionExpired = onSessionExpired;
  S27.reloadDashboard = function(){ loadAndEnter(); };
  const q = qsp();
  if(q.get('demo')==='1'){ state.demoMode = true; renderLogin('demo'); }
  else if(!AUTH_V2){ renderLogin('v1'); }
  else { initRealAuth(); }
}

/* =============================================================================
   LOGIN — rendert in de v4 login-card per fase (Firebase) of demo/v1
   ============================================================================= */
let _wordmark = '';
function captureWordmark(){
  if(_wordmark) return _wordmark;
  const w = document.querySelector('#login .lwordmark');
  _wordmark = w ? w.outerHTML : '';
  return _wordmark;
}
function loginCard(inner){
  const card = document.querySelector('#login .login-card');
  if(card) card.innerHTML = '<div class="login-welkom">Welkom bij</div>' + captureWordmark() + inner;
}
function loginErr(msg){ const e=document.querySelector('.login-card .llab'); if(e){ e.hidden=!msg; e.textContent=msg||''; e.style.color='var(--s27-orange-ink)'; } }

const GOOGLE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
const ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function renderLogin(mode){
  captureWordmark();
  if(mode==='demo' || mode==='v1'){
    loginCard(
      '<div class="llab" hidden></div>'+
      '<button class="oauth-btn" id="lgGoogle">'+GOOGLE_SVG+' Inloggen met Google</button>'+
      '<div class="divider-or">of met je toegangscode</div>'+
      '<div class="field"><label>Bedrijfsnaam</label><input id="lgNaam" type="text" value="'+(mode==='demo'?'TEST CLIENT BV':'')+'" autocomplete="organization"></div>'+
      '<div class="field"><label>Toegangscode</label><input id="lgCode" type="password" value="'+(mode==='demo'?'27270000':'')+'" autocomplete="off"></div>'+
      '<button class="btn btn-primary btn-block" style="min-height:50px;font-size:15px;margin-top:4px" id="lgSubmit">Inloggen '+ARROW_SVG+'</button>'+
      '<div class="login-foot"><label class="remember"><input type="checkbox" id="lgRemember" checked> Onthoud dit toestel</label><a href="#">Code kwijt?</a></div>'
    );
    $id('lgGoogle').onclick = function(){ if(mode==='demo'){ enterDemo(); } else { initRealAuth(); } };
    $id('lgSubmit').onclick = function(){ mode==='demo' ? enterDemo() : doLoginCode(); };
    return;
  }
  // v2 signed_out (Firebase): Google + magic-link e-mail
  loginCard(
    '<div class="llab" hidden></div>'+
    '<button class="oauth-btn" id="lgGoogle">'+GOOGLE_SVG+' Inloggen met Google</button>'+
    '<div class="divider-or">of met je e-mailadres</div>'+
    '<div class="field"><label>E-mailadres</label><input id="lgEmail" type="email" placeholder="jij@bedrijf.be" autocomplete="email"></div>'+
    '<button class="btn btn-primary btn-block" style="min-height:50px;font-size:15px;margin-top:4px" id="lgEmailBtn">Stuur me een inloglink '+ARROW_SVG+'</button>'+
    '<div class="login-foot"><label class="remember"><input type="checkbox" id="lgRemember" checked> Onthoud dit toestel</label></div>'
  );
  $id('lgGoogle').onclick = function(){ loginErr(''); if(window.S27Auth) window.S27Auth.google(); };
  $id('lgEmailBtn').onclick = function(){ const e=($id('lgEmail').value||'').trim(); if(!e){ loginErr('Vul je e-mailadres in.'); return; } loginErr(''); if(window.S27Auth) window.S27Auth.emailLink(e).catch(x=>loginErr(x.message)); };
}
function renderLoginEmailSent(){ loginCard('<div class="login-welkom" style="margin-top:8px">Check je mailbox 📬</div><p class="lead" style="text-align:center;color:var(--ink-3);font-size:14px;margin:10px 0 0">We stuurden je een inloglink. Klik erop om verder te gaan — je mag dit tabblad sluiten.</p>'); }
function renderLoginMfa(){
  loginCard('<div class="llab" hidden></div><h1 style="font-size:22px;margin-top:6px">Verificatiecode</h1><p class="lead">Vul de 6-cijferige code uit je authenticator-app in.</p><div class="field"><label>Code</label><input id="lgMfa" inputmode="numeric" maxlength="6" placeholder="123456"></div><button class="btn btn-primary btn-block" style="min-height:48px;margin-top:6px" id="lgMfaBtn">Bevestig '+ARROW_SVG+'</button>');
  $id('lgMfaBtn').onclick = function(){ loginErr(''); if(window.S27Auth) window.S27Auth.mfaVerify(($id('lgMfa').value||'').trim()).catch(x=>loginErr(x.message)); };
}
function renderLoginEnroll(secret, qrUrl){
  loginCard('<div class="llab" hidden></div><h1 style="font-size:20px;margin-top:6px">Beveilig je account</h1><p class="lead">Scan met je authenticator-app (Google Authenticator, 1Password…) en vul de code in.</p><div id="lgQr" style="display:flex;justify-content:center;margin:8px 0"></div><div style="text-align:center;font:700 12px/1.4 var(--font-display);color:var(--ink-3);word-break:break-all;margin-bottom:10px">'+(secret?('Sleutel: '+esc(secret)):'')+'</div><div class="field"><label>Code uit de app</label><input id="lgEnroll" inputmode="numeric" maxlength="6" placeholder="123456"></div><button class="btn btn-primary btn-block" style="min-height:48px;margin-top:6px" id="lgEnrollBtn">Activeer 2FA '+ARROW_SVG+'</button>');
  const qrEl=$id('lgQr'); if(qrEl && window.QRCode && qrUrl){ try{ new window.QRCode(qrEl,{text:qrUrl,width:150,height:150}); }catch(e){} }
  $id('lgEnrollBtn').onclick = function(){ loginErr(''); if(window.S27Auth) window.S27Auth.enrollVerify(($id('lgEnroll').value||'').trim()).catch(x=>loginErr(x.message)); };
}

let _enrollStarted = false;
async function initRealAuth(){
  renderLogin('v2');
  loadScriptOnce('https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js','s27-qr').catch(()=>{});
  try { await import(AUTH_JS_URL); } catch(e){ loginErr('Kon de loginmodule niet laden. Ververs de pagina.'); return; }
  if(!window.S27Auth){ loginErr('Loginmodule niet beschikbaar.'); return; }
  window.S27Auth.subscribe(async function(s){
    if(s.phase==='signed_out'){ _enrollStarted=false; renderLogin('v2'); loginErr(s.error||''); }
    else if(s.phase==='email_sent'){ renderLoginEmailSent(); }
    else if(s.phase==='mfa_challenge'){ renderLoginMfa(); loginErr(s.error||''); }
    else if(s.phase==='needs_enrollment'){
      renderLoginEnroll(); loginErr(s.error||'');
      if(!_enrollStarted){ _enrollStarted=true; try { const r=await window.S27Auth.enrollBegin(); renderLoginEnroll(r.secret, r.qrUrl); } catch(e){ _enrollStarted=false; loginErr(e.message); } }
    } else if(s.phase==='ready'){
      const u=s.user||{};
      state.session = { bedrijf_id:'via-gateway', bedrijfsnaam:(u.email||'Klant'), session_token:'firebase', uid:u.uid, email:u.email };
      state.demoMode = false; loginErr('');
      await loadAndEnter();
    }
  });
  window.S27Auth.init({ gatewayBase: GATEWAY_BASE }).catch(e=>loginErr('Init faalde: '+e.message));
}
function loadScriptOnce(src,id){ return new Promise((res,rej)=>{ if($id(id)) return res(); const s=document.createElement('script'); s.id=id; s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }

// v1 legacy code-login (alleen ?auth=v1)
async function doLoginCode(){
  const naam=($id('lgNaam').value||'').trim(), code=($id('lgCode').value||'').trim();
  if(!naam||!code){ loginErr('Vul bedrijfsnaam en toegangscode in.'); return; }
  loginErr('');
  const res = await api(ENDPOINTS.login, { bedrijf_naam:naam, token:code });
  if(res && res.ok && res.data && res.data.ok){
    state.session = { bedrijf_id:res.data.bedrijf_id, bedrijfsnaam:res.data.bedrijfsnaam, session_token:res.data.session_token };
    state.demoMode=false; await loadAndEnter();
  } else { loginErr((res&&res.data&&res.data.message)||'Inloggen mislukt — controleer je gegevens.'); }
}

function enterDemo(){
  state.demoMode = true;
  state.session = { bedrijf_id:'demo', bedrijfsnaam:'TEST CLIENT BV', session_token:'demo' };
  playLoader(); showApp(); applyRoute(); afterEnter();
}
async function loadAndEnter(){
  playLoader(); showApp();
  state._sessionExpiredHandled=false;
  try {
    try { await loadCompaniesAndLink(); } catch(e){}
    await S27DATA.loadDashboard();
    try { await S27DATA.loadBedrijf(); } catch(e){}   // voor de begroeting (voornaam)
    await applyRoute();
    afterEnter();
    renderCompanySwitcher();
  } finally { hideLoader(); }   // loader blijft staan tot alles gerenderd is -> geen template-flits
}
function afterEnter(){
  applyTakVisibility();
  initSbGlass();
  if(!localStorage.getItem('s27_tour_completed')){ setTimeout(openTour,500); }
}

/* ---- app/login tonen + loader ---- */
function showApp(){ $id('app').classList.add('show'); const l=$id('login'); l.classList.add('hide'); l.style.opacity=''; window.scrollTo(0,0); }
function showLogin(){ $id('app').classList.remove('show'); const l=$id('login'); l.classList.remove('hide'); l.style.opacity='1'; }
function playLoader(){ const loader=$id('loader'); if(!loader) return; state._loaderAt=Date.now(); loader.style.opacity='1'; loader.classList.add('show'); }
// Loader pas verbergen wanneer de inhoud écht klaar is (geen mock-flits meer). Min. 900ms tegen geflikker.
function hideLoader(){ const loader=$id('loader'); if(!loader) return; const wait=Math.max(0, 900-(Date.now()-(state._loaderAt||0))); setTimeout(()=>{ loader.style.opacity='0'; setTimeout(()=>{ try{loader.classList.remove('show');}catch(e){} },460); }, wait); }
function onSessionExpired(msg){
  const b=document.createElement('div');
  b.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:14px 22px;border-radius:12px;font:700 14px/1.4 var(--font-display);z-index:99999;box-shadow:var(--sh-md)';
  b.textContent=msg||'Je sessie is verlopen — log opnieuw in.'; document.body.appendChild(b);
  setTimeout(()=>{ try{b.remove();}catch(e){} state.session=null; state.viewMode='login'; showLogin(); if(AUTH_V2) initRealAuth(); }, 1700);
}
function logout(){ try{ if(window.S27Auth) window.S27Auth.logout(); }catch(e){} state.session=null; state.data={dashboard:null,details:{},chats:{},meetings:null,bedrijf:null,team:null,huisstijl:null}; showLogin(); if(AUTH_V2 && !state.demoMode) initRealAuth(); else renderLogin(state.demoMode?'demo':'v1'); }

/* =============================================================================
   ROUTING — lazy-load per tab, dan renderen
   ============================================================================= */
async function ensureTabData(name){
  if(state.demoMode) return;
  if(['start','projecten','diensten','berichten','socials','advertenties'].indexOf(name)>=0){ if(!state.data.dashboard) await S27DATA.loadDashboard(); }
  if(name==='meetings' && !state.data.meetings) await S27DATA.loadMeetings();
  if(name==='huisstijl' && !state.data.huisstijl) await S27DATA.loadHuisstijl();
  if((name==='facturatie'||name==='instellingen') && !state.data.bedrijf){ await S27DATA.loadBedrijf(); await S27DATA.loadTeam(); }
  if(name==='performance'){ try{ state.perfUrl=(await S27DATA.performanceUrl())||null; }catch(e){ state.perfUrl=null; } }
}
function renderPanel(name){
  const page=$id('page');
  page.innerHTML = '<div class="panel active br-'+(TAB_BRANCH[name]||'blue')+'" data-screen-label="'+name+'">'+PANELS[name]()+'</div>';
  window.scrollTo({top:0,behavior:'auto'});
}
function renderLoading(name){
  const page=$id('page');
  page.innerHTML = '<div class="panel active br-'+(TAB_BRANCH[name]||'blue')+'"><div class="empty" style="padding:80px 20px"><div class="brand-spinner" style="margin:0 auto 16px"></div><div style="font-family:var(--font-display);font-weight:700;color:var(--ink-3)">Even laden…</div></div></div>';
}
async function goTab(name){
  if(!PANELS[name]) return;
  currentTab=name; state.viewMode='tab'; state.activeProject=null;
  setActiveNav(name);
  if(!state.demoMode && needsLoad(name)) renderLoading(name);
  await ensureTabData(name);
  renderPanel(name);
  updateNavBadges();
  if(name==='berichten' && !state.demoMode){ var _fp=(window.S27DATA&&(S27DATA.projects()||[])[0]); if(_fp) openBerichtChat(_fp.id); }
  closeSidebar(); syncUrl();
}
// Zijbalk-badges dynamisch maken (shell.html heeft hardcoded mock-getallen).
// In demo laten we de mock staan; in live tonen we echte tellingen / verbergen we wat we niet betrouwbaar weten.
function updateNavBadges(){
  try{
    if(state.demoMode) return;
    var setB=function(tab,n){ var b=document.querySelector('.sb-item[data-tab="'+tab+'"] .sb-badge'); if(!b)return; if(n>0){ b.textContent=n; b.style.display=''; } else { b.style.display='none'; } };
    var projs=(window.S27DATA&&S27DATA.projects())||null;
    if(projs){ setB('projecten', projs.filter(function(p){return p.status!=='done';}).length); }
    var mt=(window.S27DATA&&S27DATA.meetings());
    if(mt){ setB('meetings', (mt.list||[]).filter(function(m){return m.dt&&m.dt.getTime()>=Date.now()-86400000;}).length); }
    // berichten + topbar-bel: geen betrouwbare ongelezen-telling -> mock-badge verbergen
    var bb=document.querySelector('.sb-item[data-tab="berichten"] .sb-badge'); if(bb) bb.style.display='none';
    var topBer=document.querySelector('.icon-btn[data-topnav="berichten"] .badge'); if(topBer) topBer.style.display='none';
    var bell=document.querySelector('#bellBtn .badge'); if(bell){ var n=((window.S27DATA&&S27DATA.cockpit())||[]).length; if(n>0){ bell.textContent=n; bell.style.display=''; } else bell.style.display='none'; }
  }catch(e){}
}
function needsLoad(name){
  if(state.data.dashboard && ['start','projecten','diensten','berichten','socials','advertenties'].indexOf(name)>=0) return false;
  if(name==='meetings' && state.data.meetings) return false;
  if(name==='huisstijl' && state.data.huisstijl) return false;
  if((name==='facturatie'||name==='instellingen') && state.data.bedrijf) return false;
  if(['nieuwproject','performance'].indexOf(name)>=0) return false;
  return true;
}
function setActiveNav(name){
  document.querySelectorAll('.sb-item').forEach(t=>t.classList.remove('active'));
  const item=document.querySelector('.sb-item[data-tab="'+name+'"]'); if(item) item.classList.add('active');
  const tt=$id('topbarTitle'); if(tt) tt.textContent=SECTION_LABEL[name]||name;
  document.querySelectorAll('.topbar [data-topnav]').forEach(t=>t.classList.toggle('topnav-on',t.dataset.topnav===name));
}
// lege takken (geen projecten) verbergen in de zijbalk — data-gedreven
function applyTakVisibility(){
  if(state.demoMode || !state.data.dashboard) return;
  const map={ socials:'social', advertenties:'ads' };
  Object.keys(map).forEach(tab=>{
    const item=document.querySelector('.sb-item[data-tab="'+tab+'"]');
    if(item) item.style.display = S27DATA.discActive(map[tab]) ? '' : 'none';
  });
  const d=state.data.dashboard;
  if(d && d.modules && d.modules.performance===false){ const pf=document.querySelector('.sb-item[data-tab="performance"]'); if(pf) pf.style.display='none'; }
}

/* =============================================================================
   PROJECTDETAIL — lazy detail + chat, dan buildModal
   ============================================================================= */
async function openProject(id, from){
  const f=(from==='berichten')?'berichten':'projecten';
  state.viewMode='project'; state.activeProject=id; state._mtab='overzicht';
  document.querySelectorAll('.sb-item').forEach(t=>t.classList.remove('active'));
  const item=document.querySelector('.sb-item[data-tab="'+f+'"]'); if(item) item.classList.add('active');
  if(!state.demoMode){ renderLoading(f); await Promise.all([ S27DATA.loadDetail(id), S27DATA.loadChat(id) ]); }
  const p=(S27DATA.projects()||(typeof PROJECTS!=='undefined'?PROJECTS:[])).find(x=>x.id===id);
  const page=$id('page');
  page.innerHTML='<div class="panel active br-'+(p?p.br:'blue')+'" data-screen-label="projectdetail">'+buildModal(id,f)+'</div>';
  window.scrollTo({top:0,behavior:'auto'});
  const tt=$id('topbarTitle'); if(tt&&p) tt.textContent=p.name;
  closeSidebar(); syncUrl();
}
function closeModal(){ goTab('projecten'); }

/* =============================================================================
   ECHTE HANDLERS
   ============================================================================= */
async function sendChat(input){
  const tx=(input.value||'').trim(); if(!tx) return;
  const list=$id('chatList'); if(!list) return;
  const me=document.createElement('div'); me.className='msg me';
  me.innerHTML='<div class="bubble"><div class="who">Jij</div><div class="tx">'+escapeHtml(tx)+'</div><div class="tm">nu</div></div>';
  list.appendChild(me); input.value=''; list.scrollTop=list.scrollHeight;
  if(state.demoMode || !state.activeProject){
    setTimeout(()=>{ const r=document.createElement('div'); r.className='msg flash'; r.innerHTML='<span class="av" style="background:var(--s27-blue)">IM</span><div class="bubble"><div class="who">Ilke Meeusen</div><div class="tx">Top, ik neem het mee!</div><div class="tm">nu</div></div>'; list.appendChild(r); list.scrollTop=list.scrollHeight; setTimeout(()=>r.classList.remove('flash'),700); },1100);
    return;
  }
  await api(ENDPOINTS.chatPost, { task_id:state.activeProject, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), comment_text:tx });
}
/* ---- Berichten: klik op een gesprek -> enkel de chatmodule wisselt (geen navigatie) ---- */
async function openBerichtChat(id, el){
  document.querySelectorAll('.bericht-row').forEach(function(r){ r.style.background=''; });
  var row = el || document.querySelector('.bericht-row[data-bid="'+id+'"]'); if(row)row.style.background='var(--paper-2)';
  const p=(window.S27DATA&&(S27DATA.projects()||[]).find(function(x){return x.id===id;}))||null; if(!p)return;
  state.activeProject=id;
  const host=$id('berichtChat'); if(!host)return;
  host.className='card br-'+(p.br||'blue');
  if(!state.demoMode && !((state.data.chats||{})[id])){ host.innerHTML='<div class="empty" style="padding:50px"><div class="brand-spinner" style="margin:0 auto"></div></div>'; try{ await S27DATA.loadChat(id); }catch(e){} }
  host.innerHTML=berichtChatInner(p);
}
/* ---- Bestandsupload in de chat (overal waar chatHTML staat) ---- */
async function chatUpload(input, taskId){
  const f=input.files&&input.files[0]; if(!f) return; input.value='';
  const tid=taskId||state.activeProject; const list=$id('chatList'); let bubble=null;
  if(list){ bubble=document.createElement('div'); bubble.className='msg me'; bubble.innerHTML='<div class="bubble"><div class="who">Jij</div><div class="tx">'+ic('doc',14)+' '+escapeHtml(f.name)+' <span style="opacity:.6">— uploaden…</span></div><div class="tm">nu</div></div>'; list.appendChild(bubble); list.scrollTop=list.scrollHeight; }
  const done=(txt)=>{ if(bubble){ var t=bubble.querySelector('.tx'); if(t)t.innerHTML=ic('doc',14)+' '+escapeHtml(f.name)+txt; } };
  if(state.demoMode){ done(' ✓'); return; }
  const rd=new FileReader();
  rd.onload=async function(){ const b64=String(rd.result).split(',')[1]||'';
    try{ await api(ENDPOINTS.chatAttachment, { task_id:tid, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), filename:f.name, file_data:b64 }); done(' ✓'); }
    catch(e){ done(' <span style="color:var(--s27-orange-ink)">— mislukt</span>'); }
  };
  rd.readAsDataURL(f);
}
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
/* ---- Dringende vraag aan Ilke (accountmanagement) — werkt ook als de projectchat gesloten is ---- */
function _projNaam(id){ var p=(window.S27DATA&&(S27DATA.projects()||[]).find(function(x){return x.id===id;}))||null; return p?p.name:'dit project'; }
function dringendeVraag(id){
  const host=document.getElementById('dcBody'); if(!host) return;
  const naam=_projNaam(id);
  host.innerHTML='<div style="padding:16px"><b style="font-family:var(--font-display);font-size:15px">Dringende vraag aan Ilke</b><p class="fs" style="color:var(--ink-3);margin:6px 0 12px">Over <b>'+escapeHtml(naam)+'</b> — Ilke pikt dit persoonlijk op (accountmanagement).</p><textarea id="dvTx" rows="4" style="width:100%;box-sizing:border-box;font-family:var(--font-body);font-size:13.5px;padding:10px;border:1px solid var(--line);border-radius:8px;outline:none;resize:vertical" placeholder="Wat is er aan de hand?"></textarea><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary btn-sm" onclick="sendDringend(this,\''+escapeHtml(id)+'\')">Versturen '+ic('send',15)+'</button><button class="btn btn-ghost btn-sm" onclick="openProject(\''+escapeHtml(id)+'\')">Annuleer</button></div></div>';
  var t=$id('dvTx'); if(t)t.focus();
}
async function sendDringend(btn, id){
  const tx=(($id('dvTx')||{}).value||'').trim(); if(!tx){ var e=$id('dvTx'); if(e){ e.style.borderColor='var(--s27-orange)'; e.focus(); } return; }
  const naam=_projNaam(id); const host=document.getElementById('dcBody');
  if(host) host.innerHTML='<div class="empty" style="padding:26px 16px;text-align:center"><div class="em-ic">'+ic('st_approved',44)+'</div><b style="font-family:var(--font-display);font-size:15px;color:var(--ink-2)">Verzonden naar Ilke ✓</b><p style="margin:6px 0 0;font-size:13px;color:var(--ink-3)">Ze neemt zo snel mogelijk contact met je op.</p></div>';
  if(state.demoMode) return;
  try{ await api(ENDPOINTS.directMessage, { bedrijf_id:(state.session||{}).bedrijf_id, session_token:(state.session||{}).session_token, klant_naam:S27DATA.bedrijfsnaam(), onderwerp:'Dringende vraag — '+naam, bericht:'[DRINGEND · via projectpagina] '+tx, project:naam }); }catch(e){}
}

const BOT_ANSWERS={'Wanneer is mijn volgende meeting?':'Je vindt al je geplande meetings onder <b>Meetings</b> in de zijbalk. Wil je er een verzetten? Laat het hier weten.','Status van mijn website?':'Open je webdesign-project onder <b>Projecten</b> — daar zie je live de status en de laatste deliverables.','Hoe geef ik feedback?':'Open een project en ga naar het tabblad <b>Bestanden</b>. Per bestand kan je apart goedkeuren of feedback geven (met de weg waarlangs je het doorgaf) — alles passen we gratis aan!'};
function botAsk(btn){ pushBot(btn.textContent,'user'); const q=btn.textContent; const c=$id('botChips'); if(c)c.style.display='none'; botReply(q); }
function botSend(){ const inp=$id('botInput'); const tx=(inp.value||'').trim(); if(!tx) return; pushBot(tx,'user'); inp.value=''; botReply(tx); }
function pushBot(text,who){ const m=$id('botMsgs'); const d=document.createElement('div'); d.className='bmsg '+who; d.innerHTML = who==='user'?escapeHtml(text):text; m.appendChild(d); m.scrollTop=m.scrollHeight; }
async function botReply(q){
  const m=$id('botMsgs'); const t=document.createElement('div'); t.className='typing'; t.innerHTML='<i></i><i></i><i></i>'; m.appendChild(t); m.scrollTop=m.scrollHeight;
  if(state.demoMode){ setTimeout(()=>{ t.remove(); pushBot(BOT_ANSWERS[q]||'Goeie vraag! Ik verbind je even door met <b>Ilke</b>, je vaste contact — zij antwoordt je zo.','bot'); },1100); return; }
  try {
    const res = await api(ENDPOINTS.aiStatusBot, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), vraag:q, projecten_context:botContext() });
    t.remove(); pushBot((res&&res.data&&res.data.answer)?res.data.answer.replace(/^ESCALATE:[^\n]*\n?/,''):'Ik verbind je even door met je vaste contact — die antwoordt je zo.','bot');
  } catch(e){ t.remove(); pushBot('Ik verbind je even door met je vaste contact — die antwoordt je zo.','bot'); }
}
function botContext(){ const ps=S27DATA.projects()||[]; return ps.map(p=>'- '+p.name+' ('+p.disc+', '+p.status+')').join('\n')||'(geen projecten)'; }

/* ---- bedrijf-switcher in de topbar (>1 bedrijf) ---- */
function renderCompanySwitcher(){
  const wrap=$id('switchMenu'); const nm=document.querySelector('.sb-client .nm');
  if(nm) nm.textContent = S27DATA.bedrijfsnaam();
  const comps = state.portalCompanies||[];
  if(wrap){
    if(comps.length<2){ wrap.innerHTML=''; const sw=$id('clientSwitch'); if(sw) sw.style.pointerEvents='none'; return; }
    wrap.innerHTML = comps.map(c=>'<button onclick="switchCompany(\''+esc(c.id)+'\')"><span class="av" style="background:var(--s27-blue)">'+esc((c.naam||'?').slice(0,2).toUpperCase())+'</span><span class="nm">'+esc(c.naam)+'</span></button>').join('');
  }
}

/* =============================================================================
   UI-HELPERS (visueel; uit het ontwerp)
   ============================================================================= */
function toggleSidebar(){ const sb=$id('sidebar'); const open=sb.classList.toggle('open'); $id('sbScrim').classList.toggle('show',open); }
function closeSidebar(){ $id('sidebar').classList.remove('open'); $id('sbScrim').classList.remove('show'); }
function toggleSwitch(e){ e.stopPropagation(); const m=$id('switchMenu'); const sw=$id('clientSwitch'); const open=m.style.display==='block'; m.style.display=open?'none':'block'; sw.classList.toggle('open',!open); }
function toggleNotif(e){ e.stopPropagation(); const np=$id('notifPanel'); if(!np)return; if(!np.classList.contains('show'))renderNotifs(); np.classList.toggle('show'); }
// echte meldingen uit de cockpit (Voor jou te doen) — klikbaar -> juiste bestemming
function renderNotifs(){
  if(state.demoMode) return;
  const list=document.querySelector('#notifPanel .notif-list'); if(!list) return;
  const cock=(window.S27DATA&&S27DATA.cockpit())||[];
  if(!cock.length){ list.innerHTML='<div class="empty" style="padding:30px 16px;text-align:center"><div class="em-ic">'+ic('st_approved',40)+'</div><b style="font-family:var(--font-display);font-size:14px;color:var(--ink-2)">Alles is bij!</b><p style="margin:6px 0 0;font-size:13px;color:var(--ink-3)">Geen openstaande acties — wij werken ondertussen verder.</p></div>'; return; }
  list.innerHTML=cock.map(function(a){
    return '<button class="notif br-'+a.br+'" style="width:100%;text-align:left;border:none;border-bottom:1px solid var(--line);background:none;cursor:pointer;display:flex;gap:12px;align-items:flex-start;padding:14px 16px" onclick="notifGo();'+a.action+'"><div class="nic">'+ic(a.icon||'st_feedback',18)+'</div><div class="ntx"><b>'+escapeHtml(a.title)+'</b><p>'+(a.ctx||'')+'</p><div class="ntm">'+escapeHtml(a.tag||'')+'</div></div>'+(a.urgent?'<span class="unread"></span>':'')+'</button>';
  }).join('');
}
function notifGo(){ const np=$id('notifPanel'); if(np)np.classList.remove('show'); }
function markAllSeen(){ document.querySelectorAll('#notifPanel .notif').forEach(n=>{ n.classList.add('seen'); const u=n.querySelector('.unread'); if(u)u.remove(); }); const b=document.querySelector('#bellBtn .badge'); if(b)b.style.display='none'; }
document.addEventListener('click',e=>{ if(!e.target.closest('.client-switch-wrap')){ const m=$id('switchMenu'); if(m)m.style.display='none'; const sw=$id('clientSwitch'); if(sw)sw.classList.remove('open'); } if(!e.target.closest('#notifPanel')&&!e.target.closest('#bellBtn')){ const np=$id('notifPanel'); if(np)np.classList.remove('show'); } });
function filterProjects(status,btn){ document.querySelectorAll('#filterbar .fpill').forEach(p=>p.classList.remove('active')); if(btn)btn.classList.add('active'); document.querySelectorAll('#projList .proj-row').forEach(r=>{ r.style.display=(status==='all'||r.dataset.status===status)?'flex':'none'; }); }
function filterDienst(disc,btn){ document.querySelectorAll('.proj-filter .fchip').forEach(c=>c.classList.remove('active')); if(btn)btn.classList.add('active'); const body=$id('projViewBody'); if(!body)return; body.querySelectorAll('.dienst-group').forEach(g=>{ g.style.display=(disc==='all'||g.dataset.disc===disc)?'':'none'; }); }
function goDienst(disc){ goTab('projecten'); setTimeout(()=>{ const sel=document.querySelector('.proj-filter select'); if(sel){ sel.value=disc; filterDienst(disc); } },60); }
function setProjView(v,btn){ document.querySelectorAll('#projView .seg-btn').forEach(b=>b.classList.remove('active')); if(btn)btn.classList.add('active'); const b=$id('projViewBody'); if(b) b.innerHTML=(v==='kanban')?projKanban():projDienst(); }
function switchModalTab(name){
  state._mtab=name;
  const c=document.querySelector('.detail'); if(!c)return;
  if(name==='chat'){ c.classList.add('show-chat'); const ct=c.querySelector('.mtab-chat'); if(ct){ c.querySelectorAll('.detail-tabs .mtab').forEach(t=>t.classList.remove('active')); ct.classList.add('active'); } const inp=c.querySelector('.detail-chat input'); if(inp)inp.focus(); syncUrl(); return; }
  c.classList.remove('show-chat');
  const map={overzicht:0,deliverables:1,feedback:2};
  c.querySelectorAll('.detail-tabs .mtab').forEach(t=>t.classList.remove('active'));
  const tabs=[].slice.call(c.querySelectorAll('.detail-tabs .mtab:not(.mtab-chat)')); if(tabs[map[name]])tabs[map[name]].classList.add('active');
  c.querySelectorAll('.detail-body .mpane').forEach(p=>p.classList.remove('active'));
  const pane=c.querySelector('.mpane[data-mpane="'+name+'"]'); if(pane)pane.classList.add('active');
  syncUrl();
}
function toggleAcc(btn){ btn.classList.toggle('open'); btn.nextElementSibling.classList.toggle('open'); }
function selectDay(el){ el.parentElement.querySelectorAll('.calday').forEach(d=>d.classList.remove('sel')); el.classList.add('sel'); }
function selectSlot(el){ if(el.disabled)return; el.parentElement.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel')); el.classList.add('sel'); }
function selectQopt(el){ el.parentElement.querySelectorAll('.qopt').forEach(q=>q.classList.remove('sel')); el.classList.add('sel'); }
function selectOpt(el){ el.parentElement.querySelectorAll('.optcard').forEach(o=>o.classList.remove('sel')); el.classList.add('sel'); }
/* ---- Per-bestand review (goedkeuren / feedback + via welke weg) ---- */
const REVIEW_CHANNELS=[['portaal','via het portaal'],['whatsapp','via WhatsApp'],['email','via e-mail'],['telefoon','telefonisch'],['meeting','in een meeting']];
function _chanSelect(){ return '<select class="rv-chan" style="font-family:var(--font-body);font-size:13px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;outline:none">'+REVIEW_CHANNELS.map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join('')+'</select>'; }
function fileApprove(btn){ _fileReviewUI(btn,'approve'); }
function fileFeedback(btn){ _fileReviewUI(btn,'feedback'); }
function _fileReviewUI(btn,mode){
  const row=btn.closest('.deliv-file'); if(!row||row.querySelector('.rv-panel'))return;
  const act=row.querySelector('.df-act'); if(act)act.style.display='none';
  const panel=document.createElement('div'); panel.className='rv-panel';
  panel.setAttribute('style','margin-top:10px;padding:12px;background:var(--paper-2,#FAF7F2);border:1px solid var(--line);border-radius:10px;display:flex;flex-direction:column;gap:9px;width:100%');
  const rowStyle='display:flex;align-items:center;gap:8px;flex-wrap:wrap';
  const lblStyle='font-family:var(--font-display);font-weight:700;font-size:12px;color:var(--ink-3)';
  if(mode==='feedback'){
    panel.innerHTML='<textarea class="rv-tx" rows="3" placeholder="Wat mag er anders? Opmerkingen passen we volledig gratis aan." style="font-family:var(--font-body);font-size:13.5px;padding:10px;border:1px solid var(--line);border-radius:8px;resize:vertical;outline:none;width:100%;box-sizing:border-box"></textarea>'+
      '<div style="'+rowStyle+'"><label style="'+lblStyle+'">Doorgegeven</label>'+_chanSelect()+
      '<button class="btn btn-primary btn-sm" onclick="submitFileReview(this,\'feedback\')">Versturen</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="cancelFileReview(this)">Annuleer</button></div>';
  } else {
    panel.innerHTML='<div style="'+rowStyle+'"><label style="'+lblStyle+'">Goedkeuren</label>'+_chanSelect()+
      '<button class="btn btn-branch btn-sm br-green" onclick="submitFileReview(this,\'goedgekeurd\')">Bevestigen</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="cancelFileReview(this)">Annuleer</button></div>';
  }
  row.appendChild(panel);
  const tx=panel.querySelector('.rv-tx'); if(tx)tx.focus();
}
function cancelFileReview(btn){ const row=btn.closest('.deliv-file'); if(!row)return; const p=row.querySelector('.rv-panel'); if(p)p.remove(); const act=row.querySelector('.df-act'); if(act)act.style.display=''; }
async function submitFileReview(btn,choice){
  const row=btn.closest('.deliv-file'); const panel=btn.closest('.rv-panel'); if(!row||!panel)return;
  const label=row.getAttribute('data-label')||'';
  const sel=panel.querySelector('.rv-chan'); const kanaal=sel?sel.value:'portaal';
  const txEl=panel.querySelector('.rv-tx'); const tx=txEl?txEl.value:'';
  const chan=REVIEW_CHANNELS.find(function(c){return c[0]===kanaal;}); const chanLabel=chan?chan[1]:'';
  const act=row.querySelector('.df-act'); panel.remove();
  if(act){ act.style.display=''; act.innerHTML='<span class="pill pill-'+(choice==='goedgekeurd'?'done':'wait')+'"><span class="pdot"></span>'+(choice==='goedgekeurd'?'Goedgekeurd':'Feedback verstuurd')+'</span><span class="rv-via" style="font-size:12px;color:var(--ink-4);margin-left:8px">'+escapeHtml(chanLabel)+'</span>'; }
  if(state.demoMode || !state.activeProject) return;
  try { await api(ENDPOINTS.feedbackV2, { task_id:state.activeProject, bedrijf_id:(state.session||{}).bedrijf_id, session_token:(state.session||{}).session_token, klant_naam:S27DATA.bedrijfsnaam(), deliverables:[{label:label,choice:choice,opmerking:tx,kanaal:kanaal,kanaal_label:chanLabel}], algemene_opmerking:'' }); } catch(e){}
}
function approveAll(btn){ const banner=document.querySelector('.fb-banner'); if(banner){ banner.style.animation='none'; banner.innerHTML='<div class="fb-ic" style="background:var(--s27-green)">'+ic('check',20)+'</div><div class="fb-tx"><b>Bedankt — goedgekeurd!</b><p>We zetten meteen de volgende stap.</p></div>'; banner.style.background='var(--s27-green-soft)'; } submitFeedbackReal('goedgekeurd'); }
async function submitFeedbackReal(choice){
  if(state.demoMode || !state.activeProject) return;
  try { await api(ENDPOINTS.feedbackV2, { task_id:state.activeProject, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), deliverables:[{label:'Project',choice:choice,kanaal:'portaal'}], algemene_opmerking:'' }); } catch(e){}
}
async function submitGeneralFeedback(btn){
  const tx=document.getElementById('genFbTx'), sel=document.getElementById('genFbChan');
  const msg=tx?tx.value.trim():''; const kanaal=sel?sel.value:'portaal';
  if(!msg){ if(tx){ tx.style.borderColor='var(--s27-orange)'; tx.focus(); } return; }
  const chan=(REVIEW_CHANNELS.find(function(c){return c[0]===kanaal;})||[])[1]||'';
  const wrap=btn.closest('.mpane');
  if(wrap) wrap.innerHTML='<div class="empty" style="padding:32px"><div class="em-ic">'+ic('st_approved',56)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Bedankt voor je feedback!</b><p style="margin:6px 0 0">We gaan er meteen mee aan de slag.</p></div>';
  if(state.demoMode || !state.activeProject) return;
  try { await api(ENDPOINTS.feedbackV2, { task_id:state.activeProject, bedrijf_id:(state.session||{}).bedrijf_id, session_token:(state.session||{}).session_token, klant_naam:S27DATA.bedrijfsnaam(), deliverables:[], algemene_opmerking:msg, kanaal:kanaal, kanaal_label:chan }); } catch(e){}
}
// facturatiegegevens opslaan — ALLE velden via facturatieSave (schrijft naar exact de
// ClickUp-velden die content-get terugleest → volledige round-trip-sync, geen lege overschrijf)
async function saveBedrijfGegevens(btn){
  if(state.demoMode){ if(btn) btn.innerHTML='Opgeslagen ✓'; return; }
  if(btn){ btn.disabled=true; btn.textContent='Opslaan…'; }
  try {
    await api(ENDPOINTS.facturatieSave, {
      bedrijf_id:state.session.bedrijf_id,
      session_token:state.session.session_token,
      klant_naam:S27DATA.bedrijfsnaam(),
      ondernemingsnummer:(($id('facBtw')||{}).value||''),
      facturatie_email:(($id('facEmail')||{}).value||''),
      facturatie_opmerkingen:(($id('facOpm')||{}).value||'')
    });
    // lokale state bijwerken zodat een re-render dezelfde waarden toont (sync ook client-side)
    if(state.data && state.data.bedrijf){
      state.data.bedrijf.btw=(($id('facBtw')||{}).value||'');
      state.data.bedrijf.facturatie_email=(($id('facEmail')||{}).value||'');
      state.data.bedrijf.facturatie_opmerkingen=(($id('facOpm')||{}).value||'');
    }
    if(btn){ btn.disabled=false; btn.innerHTML='Opgeslagen ✓'; }
  } catch(e){ if(btn){ btn.disabled=false; btn.textContent='Opnieuw proberen'; } }
}
// notificatievoorkeur opslaan (update_contact)
async function saveNotifPref(sel){
  if(state.demoMode) return;
  const t=(window.S27DATA && S27DATA.team()); const c=(t&&t.contactpersonen&&t.contactpersonen[0])||{};
  try { await api(ENDPOINTS.bedrijfBeheer, { action:'update_contact', contact_id:c.id||'', bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, voornaam:c.voornaam||'', achternaam:c.achternaam||'', email:c.email||'', gsm:c.gsm||'', rol:c.rol||'', voorkeur:sel.value }); } catch(e){}
}
/* ---- Contactpersonen-beheer (iedere contactpersoon mag toevoegen/wijzigen/verwijderen) ---- */
function _contactById(id){ const t=window.S27DATA&&S27DATA.team(); const a=(t&&t.contactpersonen)||[]; for(var i=0;i<a.length;i++){ if(String(a[i].id)===String(id)) return a[i]; } return null; }
function addContact(){ const host=$id('contactFormHost'); if(!host)return; host.innerHTML=contactFormHTML(null); const f=host.querySelector('input'); if(f)f.focus(); host.scrollIntoView&&host.scrollIntoView({behavior:'smooth',block:'nearest'}); }
function editContact(id){ const host=$id('contactFormHost'); if(!host)return; host.innerHTML=contactFormHTML(_contactById(id)||{id:id}); const f=host.querySelector('input'); if(f)f.focus(); }
function closeContactForm(){ const host=$id('contactFormHost'); if(host) host.innerHTML=''; }
async function saveContact(id, btn){
  const g=(x)=>(($id(x)||{}).value||'').trim();
  const payload={ voornaam:g('cfVoor'), achternaam:g('cfAchter'), email:g('cfEmail'), gsm:g('cfGsm'), voorkeur:g('cfVoorkeur')||'Geen' };
  if(!payload.voornaam && !payload.email){ const e=$id('cfVoor'); if(e){ e.style.borderColor='var(--s27-orange)'; e.focus(); } return; }
  if(btn){ btn.disabled=true; btn.textContent='Opslaan…'; }
  if(state.demoMode){ closeContactForm(); return; }
  try {
    var body=Object.assign({ bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token }, payload);
    if(id){ body.action='update_contact'; body.contact_id=id; } else { body.action='save_contact'; }
    await api(ENDPOINTS.bedrijfBeheer, body);
    state.data.team=null; try{ await S27DATA.loadTeam(); }catch(e){} renderPanel('instellingen');
  } catch(e){ if(btn){ btn.disabled=false; btn.textContent='Opnieuw proberen'; } }
}
async function removeContact(id, btn){
  const c=_contactById(id); const nm=c?(((c.voornaam||'')+' '+(c.achternaam||'')).trim()||'deze persoon'):'deze persoon';
  if(typeof confirm==='function' && !confirm('Wil je '+nm+' verwijderen uit het bedrijfsdashboard? Deze persoon verliest dan toegang tot het portaal.')) return;
  const row=btn&&btn.closest&&btn.closest('.contact-row'); if(row){ row.style.opacity='.5'; row.style.pointerEvents='none'; }
  if(state.demoMode){ if(row)row.remove(); return; }
  try { await api(ENDPOINTS.bedrijfBeheer, { action:'delete_contact', contact_id:id, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token }); state.data.team=null; try{ await S27DATA.loadTeam(); }catch(e){} renderPanel('instellingen'); } catch(e){ if(row){ row.style.opacity=''; row.style.pointerEvents=''; } }
}
const MEET_HOSTS={ 'Arne':{email:'arne@studio27.be'}, 'Ilke':{email:'ilke@studio27.be'} };
function pickMtype(el,who,color,type){
  el.parentElement.querySelectorAll('.mtype').forEach(b=>b.classList.remove('sel')); el.classList.add('sel');
  const ag=$id('meetAgenda'); if(ag)ag.classList.remove('np-hidden');
  const w=$id('meetWho'); if(w)w.innerHTML='<span class="mw-av" style="background:var(--s27-'+color+')">'+who[0]+'</span><span class="mw-tx">'+type+'<b>met '+who+'</b></span>';
  loadMeetSlots(who,color,type);
}
// Dynamische beschikbaarheid van Arne/Ilke (live Google Calendar free/busy via meeting-availability-gcal)
async function loadMeetSlots(who,color,type){
  const box=$id('meetSlots'); if(box)box.innerHTML='<p class="fs" style="color:var(--ink-4);padding:8px 0">Beschikbare momenten ophalen…</p>';
  const email=(MEET_HOSTS[who]||{}).email||'';
  let busy=[];
  if(!state.demoMode){
    try{ const res=await api(ENDPOINTS.meetingAvailability,{ session_token:state.session.session_token, bedrijf_id:state.session.bedrijf_id });
      const cals=(res&&res.data&&res.data.calendars)||{}; const cal=cals[email]||{};
      busy=(cal.busy||[]).map(b=>({start:new Date(b.start).getTime(), end:new Date(b.end).getTime()})).filter(b=>b.end>b.start);
    }catch(e){}
  } else {
    busy=[{start:Date.now()+3*86400000+3*3600000, end:Date.now()+3*86400000+5*3600000},{start:Date.now()+4*86400000+6*3600000, end:Date.now()+4*86400000+8*3600000}];
  }
  const durMs=30*60000; const slots=computeFreeFromBusy(busy,durMs);
  state.meetCtx={who:who,color:color||'blue',type:type,email:email,online:true,sel:null,dur:durMs,byDay:{}};
  if(box)box.innerHTML=renderMeetPicker(slots);
}
function computeFreeFromBusy(busy,durMs){
  const out=[]; const lead=Date.now()+48*3600000;
  for(let d=0; d<31 && out.length<300; d++){
    const day=new Date(lead+d*86400000); const dow=day.getDay(); if(dow===0||dow===6) continue;
    for(let h=9; h<17; h++){ for(let m=0;m<60;m+=30){
      const s=new Date(day.getFullYear(),day.getMonth(),day.getDate(),h,m,0,0); const st=s.getTime(); const en=st+durMs;
      if(st<lead) continue; if(en>new Date(day.getFullYear(),day.getMonth(),day.getDate(),17,0,0,0).getTime()) continue;
      if(busy.some(b=>st<b.end && en>b.start)) continue;
      out.push(st);
    }}
  }
  return out;
}
/* ---- week-kalender helpers (gedeeld door meeting- en per-taak-picker) ---- */
function _dayKey(ms){ const d=new Date(ms); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function _monday(ms){ const d=new Date(ms); d.setHours(0,0,0,0); const off=(d.getDay()+6)%7; return d.getTime()-off*86400000; }
const _MA=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'], _DOW=['ma','di','wo','do','vr','za','zo'];
function weekStrip(ctx, dayPickFn){
  const ws=ctx.weekStart;
  const firstMon=_monday(ctx.slots[0]), lastMon=_monday(ctx.slots[ctx.slots.length-1]);
  const canPrev=ws>firstMon, canNext=ws<lastMon;
  const lab=new Date(ws).getDate()+' '+_MA[new Date(ws).getMonth()]+' – '+new Date(ws+6*864e5).getDate()+' '+_MA[new Date(ws+6*864e5).getMonth()];
  let selDay=ctx.selDay, strip='';
  for(let i=0;i<7;i++){ const dms=ws+i*864e5, k=_dayKey(dms), has=(ctx.byDay[k]||[]).length>0; if(has&&!selDay)selDay=k; const d=new Date(dms);
    strip+='<button class="calday'+(k===selDay?' sel':'')+'" '+(has?'':'disabled')+' style="'+(has?'':'opacity:.3;cursor:default')+'" data-k="'+k+'" '+(has?'onclick="'+dayPickFn+'(this)"':'')+'><div class="dow">'+_DOW[i]+'</div><div class="dnum">'+d.getDate()+'</div></button>';
  }
  ctx.selDay=selDay;
  return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><button class="icon-btn" style="width:34px;height:34px;font-size:22px;font-weight:700;line-height:1" '+(canPrev?'':'disabled')+' onclick="'+ctx.navFn+'(-1)">‹</button><b style="font-family:var(--font-display);font-size:13.5px">'+lab+'</b><button class="icon-btn" style="width:34px;height:34px;font-size:22px;font-weight:700;line-height:1" '+(canNext?'':'disabled')+' onclick="'+ctx.navFn+'(1)">›</button></div><div class="calstrip">'+strip+'</div>';
}
function renderMeetPicker(slots){
  if(!slots.length) return '<p class="fs" style="color:var(--ink-3);padding:6px 0">Geen vrije momenten in de komende maand — stuur ons gerust een berichtje, dan zoeken we samen iets.</p>';
  const byDay={}; slots.forEach(st=>{ (byDay[_dayKey(st)]=byDay[_dayKey(st)]||[]).push(st); });
  state.meetCtx.byDay=byDay; state.meetCtx.slots=slots; state.meetCtx.weekStart=_monday(slots[0]); state.meetCtx.selDay=null; state.meetCtx.navFn='meetWeekNav';
  return '<p class="fs" style="margin:0 0 10px;color:var(--ink-3)">Live uit de agenda van <b>'+escapeHtml(state.meetCtx.who)+'</b> · ± 30 min. Blader per week tot een maand vooruit:</p>'
    +'<div id="meetWeek">'+meetWeekHTML()+'</div>'
    +'<button class="btn btn-branch br-'+state.meetCtx.color+' btn-block" id="meetConfirm" style="margin-top:16px" onclick="confirmMeeting(this)" disabled>Bevestig afspraak met '+escapeHtml(state.meetCtx.who)+'</button>';
}
function meetWeekHTML(){
  const c=state.meetCtx;
  return weekStrip(c,'meetDayPick')+'<label class="ms-label">Tijdslot <span style="font-weight:600;color:var(--ink-4)">(9–17u)</span></label><div class="slotgrid" id="meetSlotGrid">'+(c.selDay?meetSlotButtons(c.byDay[c.selDay]):'<span class="fs" style="color:var(--ink-4)">Geen vrije momenten deze week — blader verder ›</span>')+'</div>';
}
function meetWeekNav(dir){ const c=state.meetCtx; if(!c)return; c.weekStart+=dir*7*864e5; c.selDay=null; c.sel=null; const box=$id('meetWeek'); if(box)box.innerHTML=meetWeekHTML(); const cf=$id('meetConfirm'); if(cf)cf.disabled=true; }
function meetDayPick(el){ const c=state.meetCtx, k=el.dataset.k; c.selDay=k; el.parentElement.querySelectorAll('.calday').forEach(d=>d.classList.remove('sel')); el.classList.add('sel'); const g=$id('meetSlotGrid'); if(g)g.innerHTML=meetSlotButtons(c.byDay[k]); c.sel=null; const cf=$id('meetConfirm'); if(cf)cf.disabled=true; }
function meetSlotButtons(arr){ return (arr||[]).map(st=>{ const d=new Date(st); const t=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); return '<button class="slot" data-meetslot="'+st+'" onclick="selMeetSlot(this)">'+t+'</button>'; }).join(''); }
function selMeetSlot(el){ const box=$id('meetSlots'); if(box)box.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel')); el.classList.add('sel'); if(state.meetCtx)state.meetCtx.sel=Number(el.dataset.meetslot); const c=$id('meetConfirm'); if(c)c.disabled=false; }
async function confirmMeeting(btn){
  const ctx=state.meetCtx||{}; const who=ctx.who||'Studio 27';
  if(!ctx.sel){ return; }
  const dt=new Date(ctx.sel); const wanneer=dt.toLocaleString('nl-BE',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  if(state.demoMode){ if(btn) btn.innerHTML='Aanvraag verstuurd ✓'; return; }
  if(btn){ btn.disabled=true; btn.textContent='Versturen…'; }
  try { await api(ENDPOINTS.directMessage, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), onderwerp:(ctx.type||'Meeting')+'-aanvraag via portaal', bericht:'Graag een '+(ctx.type||'meeting')+' met '+who+' op '+wanneer+' — gekozen uit de live beschikbaarheid in het portaal.' });
    if(btn){ btn.disabled=false; btn.innerHTML='Aanvraag verstuurd ✓ — we bevestigen snel'; }
  } catch(e){ if(btn){ btn.disabled=false; btn.textContent='Opnieuw proberen'; } }
}
async function submitNieuwProject(btn){
  const dienst=(($id('npDienst')||{}).value)||''; const typeSel=$id('npType'); const typeTxt=(typeSel&&typeSel.value)?typeSel.options[typeSel.selectedIndex].text:''; const when=(($id('npWhen')||{}).value)||'';
  if(!dienst) return;
  if(state.demoMode){ if(btn) btn.innerHTML='Aanvraag verstuurd ✓'; return; }
  if(btn){ btn.disabled=true; btn.textContent='Versturen…'; }
  try { await api(ENDPOINTS.newProjectIntake, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), project_type:dienst+(typeTxt?(' — '+typeTxt):''), gewenste_opleverdatum:when, omschrijving:'Aanvraag via portaal: '+dienst+(typeTxt?(' / '+typeTxt):'')+' / start: '+when, intentie:'offerte_meeting' });
    if(btn){ btn.disabled=false; btn.innerHTML='Aanvraag verstuurd ✓'; }
  } catch(e){ if(btn){ btn.disabled=false; btn.textContent='Opnieuw proberen'; } }
}
async function uploadHuisstijl(input){
  const f=input.files&&input.files[0]; if(!f) return;
  if(state.demoMode){ return; }
  const rd=new FileReader();
  rd.onload=async function(){ const b64=String(rd.result).split(',')[1]||'';
    try{ await api(ENDPOINTS.huisstijlUpload, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, filename:f.name, file_data:b64 }); state.data.huisstijl=null; goTab('huisstijl'); }catch(e){}
  };
  rd.readAsDataURL(f);
}
/* ===== Agenda-slotpicker — echte beschikbaarheid + inplannen (scope-guarded) ===== */
const PLAN_DUR_MS=90*60000, PLAN_DUR_MAX=6*3600000;
function planDurMs(e){ e=Number(e)||0; return (e>0&&e<=PLAN_DUR_MAX)?e:PLAN_DUR_MS; }
function fmtDur(ms){ const m=Math.round((Number(ms)||0)/60000),h=Math.floor(m/60),r=m%60; return h?(h+'u'+(r?String(r).padStart(2,'0'):'')):(r+'min'); }
function computeFreeSlots(blokken,durMs){
  const busy=[]; (blokken||[]).forEach(b=>{ const s=Number(b.start)||0,d=Number(b.due)||0,e=Number(b.est)||0; let bs=0,be=0;
    if(b.afwezig){bs=s;be=d>s?d:(s+(e||86400000));} else if(e>0){bs=s;be=s+e;} else if(d>s){bs=s;be=d;} if(bs&&be>bs)busy.push([bs,be]); });
  const slots=[]; const now=Date.now(); const day0=new Date(); day0.setHours(0,0,0,0);
  for(let day=1;day<=31&&slots.length<150;day++){ const dt=new Date(day0.getTime()+day*86400000); const dw=dt.getDay(); if(dw===0||dw===6)continue;
    for(let m=480;m+durMs/60000<=1020;m+=30){ const ss=new Date(dt); ss.setHours(0,m,0,0); const t0=ss.getTime(),t1=t0+durMs;
      if(t0<now+2*3600000)continue; if(busy.some(iv=>t0<iv[1]&&t1>iv[0]))continue; slots.push(t0); } }
  return slots;
}
async function loadPlanSlots(taskId){
  const box=$id('s27-plan-'+taskId); if(!box) return;
  box.innerHTML='<div class="empty" style="padding:20px"><div class="brand-spinner" style="margin:0 auto 10px"></div>Beschikbare momenten ophalen…</div>';
  let data=null;
  if(!state.demoMode){ const van=Date.now(),tot=Date.now()+22*86400000;
    const res=await api(ENDPOINTS.beschikbaarheid,{task_id:taskId,van:String(van),tot:String(tot),bedrijf_id:state.session.bedrijf_id,session_token:state.session.session_token});
    data=(res&&res.ok&&res.data&&res.data.ok)?res.data:null;
  } else { data={assignee_naam:'Guus Van den Heuvel',assignee_emails:'guus@studio27.be',list_id:'demo',taak_est:0,blokken:[{start:Date.now()+2*86400000,due:0,est:7200000,afwezig:false}]}; }
  if(!data){ box.innerHTML='<p class="fs" style="color:var(--ink-3)">Beschikbaarheid kon niet geladen worden. <a href="#" onclick="goTab(\'meetings\');return false">Plan via Meetings →</a></p>'; return; }
  const durMs=planDurMs(data.taak_est); const slots=computeFreeSlots(data.blokken,durMs);
  const aEmails=String(data.assignee_emails||data.assignee_email||'').split(',').map(s=>s.trim()).filter(Boolean);
  state.planCtx=state.planCtx||{};
  state.planCtx[taskId]={assignee:data.assignee_naam||'je Studio 27-contact',assignee_emails:aEmails,list_id:data.list_id||'',online:true,sel:null,dur:durMs};
  box.innerHTML=renderPlanPicker(taskId,slots);
}
function renderPlanPicker(taskId,slots){
  const ctx=(state.planCtx||{})[taskId]||{};
  if(!slots.length) return '<p class="fs" style="color:var(--ink-3)">Geen vrije momenten in de komende maand. <a href="#" onclick="goTab(\'meetings\');return false">Plan via Meetings →</a></p>';
  const byDay={}; slots.forEach(ms=>{ (byDay[_dayKey(ms)]=byDay[_dayKey(ms)]||[]).push(ms); });
  ctx.byDay=byDay; ctx.slots=slots; ctx.weekStart=_monday(slots[0]); ctx.selDay=null; ctx.navFn='planWeekNav'; ctx.taskId=taskId; state.planActive=taskId;
  return '<p class="fs" style="margin:0 0 12px;color:var(--ink-3)">Met <b>'+escapeHtml(ctx.assignee||'')+'</b> · duur ± '+escapeHtml(fmtDur(ctx.dur||PLAN_DUR_MS))+'. Blader per week tot een maand vooruit:</p>'+
    '<div style="display:flex;gap:16px;margin-bottom:12px"><label class="remember"><input type="radio" name="pm" value="online" checked onchange="planMode(\''+escapeHtml(taskId)+'\',true)"> Online (Google Meet)</label><label class="remember"><input type="radio" name="pm" value="fysiek" onchange="planMode(\''+escapeHtml(taskId)+'\',false)"> Fysiek bij Studio 27</label></div>'+
    '<div id="planWeekBox">'+planWeekHTML()+'</div>'+
    '<button class="btn btn-branch br-blue btn-block" id="plan-book" onclick="bookPlanSlot(\''+escapeHtml(taskId)+'\')" disabled style="margin-top:12px">Bevestig afspraak</button>';
}
function planWeekHTML(){ const c=(state.planCtx||{})[state.planActive]; if(!c)return ''; return weekStrip(c,'planDayPick')+'<label class="ms-label">Tijdslot</label><div class="slotgrid" id="planSlotGrid">'+(c.selDay?planSlotButtons(c.byDay[c.selDay]):'<span class="fs" style="color:var(--ink-4)">Geen vrije momenten deze week — blader verder ›</span>')+'</div>'; }
function planSlotButtons(arr){ return (arr||[]).map(ms=>{ const t=new Date(ms).toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}); return '<button class="slot" data-plan-slot="'+ms+'" onclick="pickPlanSlot(this)">'+t+'</button>'; }).join(''); }
function planWeekNav(dir){ const c=(state.planCtx||{})[state.planActive]; if(!c)return; c.weekStart+=dir*7*864e5; c.selDay=null; c.sel=null; const box=$id('planWeekBox'); if(box)box.innerHTML=planWeekHTML(); const b=$id('plan-book'); if(b)b.disabled=true; }
function planDayPick(el){ const c=(state.planCtx||{})[state.planActive]; const k=el.dataset.k; c.selDay=k; el.parentElement.querySelectorAll('.calday').forEach(d=>d.classList.remove('sel')); el.classList.add('sel'); const g=$id('planSlotGrid'); if(g)g.innerHTML=planSlotButtons(c.byDay[k]); c.sel=null; const b=$id('plan-book'); if(b)b.disabled=true; }
function pickPlanSlot(el){ const c=(state.planCtx||{})[state.planActive]; if(c)c.sel=Number(el.dataset.planSlot); const box=$id('planSlotGrid'); if(box)box.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel')); el.classList.add('sel'); const b=$id('plan-book'); if(b)b.disabled=false; }
function planMode(tid,online){ if(state.planCtx&&state.planCtx[tid])state.planCtx[tid].online=online; }
async function bookPlanSlot(taskId){
  const ctx=(state.planCtx||{})[taskId]; if(!ctx||!ctx.sel)return;
  const btn=$id('plan-book-'+taskId); if(btn){btn.disabled=true;btn.textContent='Inplannen…';}
  const start=ctx.sel,eind=ctx.sel+(ctx.dur||PLAN_DUR_MS); const iso=ms=>new Date(ms).toISOString();
  const p=(S27DATA.projects()||[]).find(x=>x.id===taskId)||{name:'Afspraak'};
  const cc=(state.data.bedrijf&&state.data.bedrijf.contact)||{};
  const clientNaam=((cc.voornaam||'')+' '+(cc.achternaam||'')).trim()||S27DATA.bedrijfsnaam();
  const attendees=[{email:cc.email||state.session.email||'',displayName:clientNaam}].concat((ctx.assignee_emails||[]).map(e=>({email:e}))).filter(a=>a.email);
  const box=$id('s27-plan-'+taskId);
  const done=()=>{ if(box)box.innerHTML='<div class="empty" style="padding:24px"><div class="em-ic">'+ic('st_approved',56)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Afspraak ingepland!</b><p style="margin:6px 0 0">'+escapeHtml(new Date(start).toLocaleString('nl-BE',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))+' met '+escapeHtml(ctx.assignee||'Studio 27')+'.</p><p class="fs" style="color:var(--ink-4)">Je krijgt zo een agenda-uitnodiging'+(ctx.online?' met een Google Meet-link':' (fysiek bij Studio 27)')+'.</p></div>'; };
  if(state.demoMode){ done(); return; }
  try { await api(ENDPOINTS.inplannen,{task_id:taskId,list_id:ctx.list_id,start:iso(start),eind:iso(eind),start_ms:String(start),online:!!ctx.online,titel:'Afspraak — '+(p.name||'Studio 27'),beschrijving:'Ingepland via je Studio 27-portaal met '+(ctx.assignee||'het team')+'.',locatie:ctx.online?'':'Studio 27, Sint-Lenaartsesteenweg, Rijkevorsel',attendees:attendees,assignee_naam:ctx.assignee,client_email:cc.email||'',client_naam:clientNaam,bedrijf_id:state.session.bedrijf_id,session_token:state.session.session_token}); done(); }
  catch(e){ if(btn){btn.disabled=false;btn.textContent='Bevestig afspraak';} }
}
function toggleBot(){ const p=$id('botPanel'),f=$id('botFab'); const open=p.classList.toggle('show'); f.style.display=open?'none':'flex'; if(open){ const g=$id('botGreet'); if(g){ var nm=(typeof _greetNaam==='function'?_greetNaam():'')||''; g.innerHTML='Hallo '+escapeHtml(nm||'daar')+'! Ik help je graag op weg. Waarmee kan ik je verder helpen?'; } const inp=p.querySelector('.bot-input input'); if(inp)setTimeout(()=>inp.focus(),50); } }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if($id('tourScrim')&&$id('tourScrim').classList.contains('show'))endTour(false); else if(state.viewMode==='project')goTab('projecten'); } });

/* ---------- Onboarding tour (1x + opt-out) ---------- */
const TOUR=[
  {t:'Jouw startscherm',b:'Hier vind je altijd wat er voor jóu klaarstaat — reviews, feedback en meetings. Begin hier elke dag.',target:'.sb-item[data-tab="start"]'},
  {t:'Al je werk, gebundeld',b:'In de zijbalk staat alles altijd zichtbaar: je projecten, socials, advertenties, resultaten én onze diensten.',target:'.sb-item[data-tab="projecten"]'},
  {t:'Altijd in contact',b:'Vragen? Onze slimme assistent helpt je meteen op weg en schakelt zo nodig door naar een echt mens.',target:'#botFab'},
  {t:'Plan vlot een moment',b:'Een meeting nodig? Prik zelf een vrij tijdslot. Wij staan klaar — vrijblijvend.',target:'.sb-item[data-tab="meetings"]'},
];
let tourIdx=0;
function openTour(){ tourIdx=0; goTab('start'); $id('tourScrim').classList.add('show'); $id('spotlight').classList.add('show'); $id('tourDialog').classList.add('show'); renderTour(); }
function renderTour(){
  const s=TOUR[tourIdx];
  if(window.innerWidth<=980){ const sb=$id('sidebar'); if(s.target.indexOf('.sb-item')===0)sb.classList.add('open'); else sb.classList.remove('open'); }
  $id('tourStep').textContent='Stap '+(tourIdx+1)+' van '+TOUR.length;
  $id('tourTitle').textContent=s.t; $id('tourBody').textContent=s.b;
  $id('tourDots').innerHTML=TOUR.map((_,i)=>'<i class="'+(i===tourIdx?'on':'')+'"></i>').join('');
  $id('tourPrev').style.visibility=tourIdx===0?'hidden':'visible';
  $id('tourNext').textContent=tourIdx===TOUR.length-1?'Aan de slag!':'Volgende';
  const el=document.querySelector(s.target); const sp=$id('spotlight'), dg=$id('tourDialog');
  if(el){ const r=el.getBoundingClientRect(); const pad=8; sp.style.left=(r.left-pad)+'px'; sp.style.top=(r.top-pad)+'px'; sp.style.width=(r.width+pad*2)+'px'; sp.style.height=(r.height+pad*2)+'px';
    let top=r.bottom+16; if(top+220>window.innerHeight)top=Math.max(16,r.top-236); let left=Math.min(Math.max(16,r.left),window.innerWidth-396);
    if(window.innerWidth<=980 && s.target.indexOf('.sb-item')===0){ left=Math.min(280,window.innerWidth-360); top=Math.min(r.top,window.innerHeight-240); }
    dg.style.top=top+'px'; dg.style.left=left+'px'; }
}
function tourNav(dir){ tourIdx+=dir; if(tourIdx>=TOUR.length){endTour(true);return;} if(tourIdx<0)tourIdx=0; renderTour(); }
function endTour(remember){ $id('tourScrim').classList.remove('show'); $id('spotlight').classList.remove('show'); $id('tourDialog').classList.remove('show'); if(window.innerWidth<=980)closeSidebar(); if(remember)localStorage.setItem('s27_tour_completed',new Date().toISOString()); }
window.addEventListener('resize',()=>{ if($id('tourDialog')&&$id('tourDialog').classList.contains('show'))renderTour(); });
// Advertentierapport-iframe (Arne's engine) auto-resize op postMessage
window.addEventListener('message',function(e){ try{ if(e&&e.data&&e.data.type==='s27-ads-report-height'){ var f=$id('perfFrame'); if(f&&e.data.height){ f.style.minHeight='0'; f.style.height=(parseInt(e.data.height,10)+24)+'px'; } } }catch(_){} });

function initSbGlass(){
  const nav=document.querySelector('.sb-nav'); if(!nav)return;
  let g=nav.querySelector('.sb-glass'); if(!g){ g=document.createElement('div'); g.className='sb-glass'; g.style.position='absolute'; nav.prepend(g); }
  const move=el=>{ if(!el){g.style.opacity='0';return;} g.style.opacity='1'; g.style.top=el.offsetTop+'px'; g.style.height=el.offsetHeight+'px'; };
  const toActive=()=>move(nav.querySelector('.sb-item.active'));
  nav.querySelectorAll('.sb-item').forEach(it=>{ it.addEventListener('mouseenter',()=>move(it)); it.addEventListener('click',()=>setTimeout(toActive,40)); });
  nav.addEventListener('mouseleave',toActive); toActive();
}

/* ---------- start ---------- */
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
