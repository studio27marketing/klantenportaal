/* =============================================================================
   Studio 27 Klantenportaal v4, app-logica (ECHTE wiring)
   -----------------------------------------------------------------------------
   - Login: Firebase (Google + magic-link + TOTP-2FA) via window.S27Auth,
     gespiegeld op de werkende dashboard.js-flow. ?demo=1 = mock-preview.
   - Routing: lazy-load per tab + DEEP-LINK router (?p=&tab= | ?c= | ?n= | ?go=).
   - Handlers: chat→chatPost, slot→inplannen, feedback→feedbackV2, bot→aiStatusBot.
   ============================================================================= */
"use strict";

let currentTab = 'start';
const SECTION_LABEL = { start:'Home', berichten:'Berichten', projecten:'Actieve projecten', socials:'Socials', advertenties:'Advertenties', meetings:'Meetings', nieuwproject:'Offerte aanvragen', offertes:'Offertes', facturatie:'Facturatie', instellingen:'Instellingen' };

function qsp(){ return new URLSearchParams(location.search); }
function $id(x){ return document.getElementById(x); }

/* =============================================================================
   DEEP-LINK ROUTER, bestemming uit de URL → na auth ernaartoe navigeren
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
  // skipLink=true bij een bedrijf-switch: switchCompany heeft al geprovisioned + de claim ververst,
  // dus loadAndEnter hoeft NIET opnieuw te koppelen (vermijdt dubbele Make-provision + token-refresh).
  S27.reloadDashboard = function(skipLink){ loadAndEnter(!!skipLink); };
  S27.onSwitchFailed = onSwitchFailed;
  S27.closeSwitchMenu = closeSwitchMenu;
  S27.stopChatPoll = function(){ stopChatPoll(); };
  // Bedrijf-switch: meteen de '27'-loader tonen + sidebar-naam optimistisch updaten (geen blind moment).
  S27.showSwitching = function(id){
    try {
      var comps = state.portalCompanies||[], nm='';
      for(var i=0;i<comps.length;i++){ if(comps[i].id===id){ nm=comps[i].naam||''; break; } }
      var el=document.querySelector('.sb-client .nm'); if(el && nm) el.textContent=nm;
    } catch(e){}
    showApp(); playLoader();
  };
  // snapshot van het VORIGE bedrijf bewaren (met het oude id) voor instant terugschakelen
  S27.stashData = function(prevId){ if(prevId && state.data && state.data.dashboard){ state._dataByBedrijf = state._dataByBedrijf||{}; state._dataByBedrijf[prevId] = state.data; } };
  const q = qsp();
  if(q.get('demo')==='1'){ state.demoMode = true; renderLogin('demo'); }
  else if(!AUTH_V2){ renderLogin('v1'); }
  else { initRealAuth(); }
}

/* =============================================================================
   LOGIN, rendert in de v4 login-card per fase (Firebase) of demo/v1
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
function renderLoginEmailSent(){ loginCard('<div class="login-welkom" style="margin-top:8px">Check je mailbox 📬</div><p class="lead" style="text-align:center;color:var(--ink-3);font-size:14px;margin:10px 0 0">We stuurden je een inloglink. Klik erop om verder te gaan, je mag dit tabblad sluiten.</p>'); }
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
      const staff = !!s.staff || /@studio27\.be$/.test(String(u.email||'').trim().toLowerCase());
      state.session = { bedrijf_id:(staff?'admin':'via-gateway'), bedrijfsnaam:(u.email||'Klant'), session_token:'firebase', uid:u.uid, email:u.email, displayName:u.displayName||'' };
      state.demoMode = false; loginErr('');
      if(staff){ state.adminMode = true; await enterAdminMode(); }
      else { state.adminMode = false; await loadAndEnter(); }
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
  } else { loginErr((res&&res.data&&res.data.message)||'Inloggen mislukt, controleer je gegevens.'); }
}

function enterDemo(){
  state.demoMode = true;
  state.session = { bedrijf_id:'demo', bedrijfsnaam:'TEST CLIENT BV', session_token:'demo' };
  playLoader(); showApp(); applyRoute(); afterEnter(); hideLoader();   // anders blijft de '27'-loader oneindig hangen
}
async function loadAndEnter(skipLink){
  playLoader(); showApp();
  state._sessionExpiredHandled=false;
  // INSTANT terugschakelen: als dit bedrijf al eerder geladen werd, toon meteen de gecachte
  // snapshot (geen blind moment) en ververs stil op de achtergrond. state.activeBedrijf is bij
  // een switch al het NIEUWE bedrijf (switchCompany zette het via provisionFetch).
  var cached = (skipLink && state.activeBedrijf && state._dataByBedrijf) ? state._dataByBedrijf[state.activeBedrijf] : null;
  if(cached && cached.dashboard){
    state.data = cached; state.perfUrl = null;
    try { await applyRoute(); afterEnter(); renderCompanySwitcher(); updateNavBadges(); } catch(e){}
    hideLoader();
    try {
      await Promise.all([ S27DATA.loadDashboard(), S27DATA.loadBedrijf().catch(function(){ return false; }) ]);
      if(typeof renderPanel==='function' && currentTab && state.viewMode==='tab') renderPanel(currentTab);
      updateNavBadges();
    } catch(e){}
    return;
  }
  // CRUCIAAL bij bedrijf-switch: wis alle gecachete data van het vorige bedrijf, anders blijven team/meetings/huisstijl/offertes/metricool/ads/facturatie hangen
  state.data = { dashboard:null, details:{}, chats:{}, meetings:null, bedrijf:null, team:null, huisstijl:null, offertes:null, metricool:null, metricoolStats:null, metricoolPostStats:null, ads:null };
  state.perfUrl = null;
  try {
    // skipLink (bedrijf-switch): switchCompany koppelde + ververste de claim al -> niet opnieuw provisionen
    if(!skipLink){ try { await loadCompaniesAndLink(); } catch(e){} }
    // dashboard + bedrijf zijn onafhankelijk -> parallel (scheelt 1 seriële round-trip vóór de render).
    // loadBedrijf (enkel voor de voornaam in de begroeting) mag de boot nooit breken: eigen catch.
    await Promise.all([
      S27DATA.loadDashboard(),
      S27DATA.loadBedrijf().catch(function(){ return false; })
    ]);
    await applyRoute();
    afterEnter();
    renderCompanySwitcher();
    updateNavBadges();   // bel-/zijbalk-badges meteen op het nieuwe bedrijf zetten (ook na deep-link/switch)
    const np=$id('notifPanel'); if(np && np.classList.contains('show')) renderNotifs();
  } finally { hideLoader(); }   // loader blijft staan tot alles gerenderd is -> geen template-flits
}
function afterEnter(){
  applyTakVisibility();
  initSbGlass();
  // ADMIN: geen klant-onboardingtour; toon i.p.v. de naam-begroeting een "team"-context.
  if(state.adminMode){ document.body.classList.add('admin-mode'); }
  else if(!localStorage.getItem('s27_tour_completed')){ setTimeout(openTour,500); }
}

/* =============================================================================
   ADMIN-MODUS (@studio27.be teamleden): bedrijvenkiezer met zoek over ÁLLE klanten.
   Flow: login (Google SSO) -> enterAdminMode (laadt alle bedrijven) -> bedrijvenkiezer ->
   keuze -> normaal portaal in adminMode, waarbij elke gateway-call X-Act-As-Bedrijf meestuurt
   (server-side scoping naar het gekozen bedrijf). De mini-switcher wordt vervangen door deze
   zoek-overlay (openAdminPicker) zodat een admin tussen ALLE klanten kan springen.
   ============================================================================= */
async function enterAdminMode(){
  playLoader();
  var list=[];
  try { list = await S27DATA.loadAdminCompanies(); } catch(e){ list=[]; }
  state.adminCompanies = Array.isArray(list)?list:[];
  hideLoader();
  if(!state.adminCompanies.length){
    renderLogin('v2'); loginErr('Kon de bedrijvenlijst niet laden. Ververs de pagina of meld je opnieuw aan.');
    return;
  }
  openAdminPicker();
}
function adminPickerEl(){
  var el=$id('adminPicker');
  if(!el){ el=document.createElement('div'); el.id='adminPicker'; el.className='admin-picker'; document.body.appendChild(el); }
  return el;
}
function adminPickerHTML(){
  var u=(state.session&&state.session.email)||'';
  var naam=(state.session&&state.session.displayName)||'';
  var voor = naam ? naam.split(' ')[0] : ((u.split('@')[0]||'collega'));
  var last=''; try{ last=localStorage.getItem('s27_admin_bedrijf')||''; }catch(e){}
  var lastC = last ? (state.adminCompanies||[]).find(function(c){return c.id===last;}) : null;
  var rows=(state.adminCompanies||[]).map(function(c){
    var ini=String(c.naam||'?').replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()||'?';
    var key=String(c.naam||'').toLowerCase();
    return '<button class="apick-row" data-s="'+esc(key)+'" onclick="adminEnterCompany(\''+esc(c.id)+'\')">'+
           '<span class="apick-av">'+esc(ini)+'</span><span class="apick-nm">'+esc(c.naam)+'</span>'+
           '<svg class="apick-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>';
  }).join('');
  return ''+
   '<div class="apick-box">'+
     '<div class="apick-head"><div class="apick-brand"><span class="apick-dot"></span>STUDIO 27 · TEAM</div>'+
       '<button class="apick-logout" onclick="logout()">Uitloggen</button></div>'+
     '<h1 class="apick-title">Welkom, '+esc(voor)+'</h1>'+
     '<p class="apick-sub">Kies het klantportaal waarin je wilt werken. Je krijgt de uitgebreide team-weergave van die klant.</p>'+
     (lastC ? '<button class="apick-resume" onclick="adminEnterCompany(\''+esc(lastC.id)+'\')"><span>Verder met</span> <strong>'+esc(lastC.naam)+'</strong></button>' : '')+
     '<div class="apick-searchwrap"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'+
       '<input id="apickSearch" type="text" autocomplete="off" spellcheck="false" placeholder="Zoek een klant ('+(state.adminCompanies||[]).length+')…" oninput="filterAdminPicker()"></div>'+
     '<div class="apick-list" id="apickList">'+rows+'</div>'+
     '<div class="apick-empty" id="apickEmpty" style="display:none">Geen klant gevonden.</div>'+
   '</div>';
}
function openAdminPicker(){
  if(!state.adminCompanies || !state.adminCompanies.length){ enterAdminMode(); return; }
  var el=adminPickerEl();
  el.innerHTML=adminPickerHTML();
  el.classList.add('show');
  document.body.classList.add('admin-picking');
  setTimeout(function(){ var s=$id('apickSearch'); if(s) s.focus(); }, 60);
}
function hideAdminPicker(){
  var el=$id('adminPicker'); if(el) el.classList.remove('show');
  document.body.classList.remove('admin-picking');
}
function filterAdminPicker(){
  var q=((($id('apickSearch')||{}).value)||'').trim().toLowerCase();
  var rows=document.querySelectorAll('#apickList .apick-row'); var shown=0;
  rows.forEach(function(r){ var hit=!q || (r.getAttribute('data-s')||'').indexOf(q)>=0; r.style.display=hit?'':'none'; if(hit) shown++; });
  var em=$id('apickEmpty'); if(em) em.style.display=shown?'none':'block';
}
async function adminEnterCompany(id){
  id=String(id||''); if(!id) return;
  if(id===state.activeBedrijf){ hideAdminPicker(); return; }   // al actief bedrijf
  if(state.activeBedrijf && typeof S27.stashData==='function'){ try{ S27.stashData(state.activeBedrijf); }catch(e){} }
  if(typeof S27.stopChatPoll==='function') S27.stopChatPoll();
  var c=(state.adminCompanies||[]).find(function(x){return x.id===id;});
  state.activeBedrijf=id;
  state._adminActiveName=(c&&c.naam)||'';
  try{ localStorage.setItem('s27_admin_bedrijf', id); }catch(e){}
  state._provisionTried=true;        // admin: nooit de klant-provisionflow proberen
  state.portalCompanies=[];          // admin gebruikt de zoek-overlay i.p.v. de mini-switcher
  hideAdminPicker();
  await loadAndEnter(true);          // skipLink: geen provision; X-Act-As-Bedrijf doet de scoping
}

/* ---- app/login tonen + loader ---- */
function showApp(){ $id('app').classList.add('show'); const l=$id('login'); l.classList.add('hide'); l.style.opacity=''; window.scrollTo(0,0); }
function showLogin(){ $id('app').classList.remove('show'); const l=$id('login'); l.classList.remove('hide'); l.style.opacity='1'; }
function playLoader(){ const loader=$id('loader'); if(!loader) return; state._loaderAt=Date.now(); loader.style.opacity='1'; loader.classList.add('show'); }
// Loader pas verbergen wanneer de inhoud écht klaar is (geen mock-flits meer). Min. 900ms tegen geflikker.
function hideLoader(){ const loader=$id('loader'); if(!loader) return; const wait=Math.max(0, 900-(Date.now()-(state._loaderAt||0))); setTimeout(()=>{ loader.style.opacity='0'; setTimeout(()=>{ try{loader.classList.remove('show');}catch(e){} },460); }, wait); }
function onSessionExpired(msg){
  stopChatPoll();
  const b=document.createElement('div');
  b.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:14px 22px;border-radius:12px;font:700 14px/1.4 var(--font-display);z-index:99999;box-shadow:var(--sh-md)';
  b.textContent=msg||'Je sessie is verlopen, log opnieuw in.'; document.body.appendChild(b);
  setTimeout(()=>{ try{b.remove();}catch(e){} state.session=null; state.viewMode='login'; showLogin(); if(AUTH_V2) initRealAuth(); }, 1700);
}
function logout(){ stopChatPoll(); try{ if(window.S27Auth) window.S27Auth.logout(); }catch(e){} state.session=null; state.data={dashboard:null,details:{},chats:{},meetings:null,bedrijf:null,team:null,huisstijl:null};
  // ADMIN-staat volledig opruimen zodat een volgende (klant-)login niet in adminMode blijft hangen.
  state.adminMode=false; state.activeBedrijf=''; state.adminCompanies=null; state._adminActiveName=''; hideAdminPicker(); document.body.classList.remove('admin-mode');
  showLogin(); if(AUTH_V2 && !state.demoMode) initRealAuth(); else renderLogin(state.demoMode?'demo':'v1'); }

/* =============================================================================
   ROUTING, lazy-load per tab, dan renderen
   ============================================================================= */
async function ensureTabData(name){
  if(state.demoMode) return;
  if(['start','projecten','berichten','socials','advertenties'].indexOf(name)>=0){ if(!state.data.dashboard) await S27DATA.loadDashboard(); }
  if(name==='meetings' && !state.data.meetings) await S27DATA.loadMeetings();
  if(name==='huisstijl' && !state.data.huisstijl) await S27DATA.loadHuisstijl();
  if(name==='facturatie'||name==='instellingen'){ if(!state.data.bedrijf) await S27DATA.loadBedrijf(); if(!state.data.team) await S27DATA.loadTeam(); }
  if(name==='instellingen' && !state.data.huisstijl) await S27DATA.loadHuisstijl();
  // (Resultaten-tab verwijderd — advertentiedata staat real-time op de Advertenties-tab)
  if(name==='offertes'){ var _t=[]; if(!state.data.offertes) _t.push(S27DATA.loadOffertes()); if(!state.data.bedrijf) _t.push(S27DATA.loadBedrijf()); if(_t.length){ try{ await Promise.all(_t); }catch(e){} } }
  if(name==='socials'){ var _s=[]; if(!state.data.metricool) _s.push(S27DATA.loadMetricool()); if(!state.data.metricoolStats) _s.push(S27DATA.loadMetricoolStats()); if(!state.data.metricoolPostStats) _s.push(S27DATA.loadMetricoolPostStats()); if(_s.length){ try{ await Promise.all(_s); }catch(e){} } }
  if(name==='advertenties'){
    if(state.adminMode){ if(!state.data.metaAdsRich){ try{ var pp=(typeof adsPeriod==='function')?adsPeriod():null; await S27DATA.loadMetaAdsRich(pp?{from:pp.from,to:pp.to,compare:pp.compare}:undefined); }catch(e){} } }
    else if(!state.data.metaAds){ try{ await S27DATA.loadMetaAds(); }catch(e){} }
  }
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
  stopChatPoll();   // tab-wissel/modal-sluiten -> chat-poller stoppen (berichten herstart 'm hieronder)
  currentTab=name; state.viewMode='tab'; state.activeProject=null; state._metaCampaign=null;
  setActiveNav(name);
  if(!state.demoMode && needsLoad(name)) renderLoading(name);
  await ensureTabData(name);
  renderPanel(name);
  if(name==='advertenties' && typeof adsChatMount==='function') adsChatMount();   // ads-chat koppelen aan de huidige-maand-advertentietaak
  if(name==='advertenties' && state.adminMode && typeof adsRichMountCharts==='function') adsRichMountCharts();   // team-weergave: dag-evolutiegrafieken mounten
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
    var bell=document.querySelector('#bellBtn .badge'); if(bell){ var n=unseenCount(); if(n>0){ bell.textContent=n; bell.style.display=''; } else bell.style.display='none'; }
  }catch(e){}
}
function needsLoad(name){
  if(state.data.dashboard && ['start','projecten','berichten'].indexOf(name)>=0) return false;
  if(name==='socials') return !state.data.metricool;   // wacht op Metricool-data
  if(name==='advertenties') return state.adminMode ? !state.data.metaAdsRich : !state.data.metaAds;  // wacht op Meta-ads-data
  if(name==='meetings' && state.data.meetings) return false;
  if(name==='huisstijl' && state.data.huisstijl) return false;
  if(name==='facturatie' && state.data.bedrijf && state.data.team) return false;
  if(name==='instellingen' && state.data.bedrijf && state.data.team && state.data.huisstijl) return false;
  if(name==='offertes' && state.data.offertes && state.data.bedrijf) return false;
  if(name==='nieuwproject') return false;
  return true;
}
function setActiveNav(name){
  document.querySelectorAll('.sb-item').forEach(t=>t.classList.remove('active'));
  const item=document.querySelector('.sb-item[data-tab="'+name+'"]'); if(item) item.classList.add('active');
  // Op de homepage tonen we geen titel in de topbar (geen "Start"-tekst die meespringt bij navigatie).
  const tt=$id('topbarTitle'); if(tt) tt.textContent=(name==='start')?'':(SECTION_LABEL[name]||name);
  document.querySelectorAll('.topbar [data-topnav]').forEach(t=>t.classList.toggle('topnav-on',t.dataset.topnav===name));
}
// Resultaten/performance-tab tonen of verbergen op basis van de module-vlag van dit bedrijf.
// Symmetrisch: bij een switch van bedrijf-A (performance uit) -> B (aan) komt de tab terug zonder reload.
// (Socials + advertenties blijven altijd zichtbaar: hun koppeling staat los van projecten; de panels
//  tonen zelf een "nog niet gekoppeld"-staat.)
function applyTakVisibility(){
  if(state.demoMode || !state.data.dashboard) return;
  const d=state.data.dashboard;
  const pf=document.querySelector('.sb-item[data-tab="performance"]');
  if(pf) pf.style.display = (d && d.modules && d.modules.performance===false) ? 'none' : '';
}

/* =============================================================================
   PROJECTDETAIL, lazy detail + chat, dan buildModal
   ============================================================================= */
async function openProject(id, from){
  const f=(from==='berichten')?'berichten':'projecten';
  stopChatPoll();
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
  if($id('chatList')) startChatPoll(id);   // projectchat staat in de DOM (tenzij afgerond) -> auto-refresh
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
  const tid=state.activeProject;
  try { await api(ENDPOINTS.chatPost, { task_id:tid, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), comment_text:tx }); }
  catch(e){}
  // cache verversen + chat herrenderen zodat het ECHTE ClickUp-bericht in de cache zit
  // (geen duplicaat met de optimistische bubble bij terug-schakelen tussen chats)
  await refreshChatCache(tid);
}
/* ---- Chat-cache verversen voor één taak + de open chat herrenderen ---- */
async function refreshChatCache(taskId){
  if(state.demoMode || !taskId) return;
  try { state.data.chats[taskId]=null; await S27DATA.loadChat(taskId); } catch(e){}
  if(state.activeProject===taskId) rerenderActiveChat(true);
}
/* ---- De op-dit-moment-zichtbare chat opnieuw renderen (Berichten-host of projectdetail).
       stickBottom=true -> altijd naar onder scrollen (na eigen bericht); anders scrollpositie
       behouden tenzij de gebruiker al (bijna) onderaan stond. ---- */
function rerenderActiveChat(stickBottom){
  const id=state.activeProject; if(!id) return;
  const oldList=$id('chatList');
  const atBottom = oldList ? (oldList.scrollHeight-oldList.scrollTop-oldList.clientHeight < 60) : true;
  const prevTop = oldList ? oldList.scrollTop : 0;
  // een lopend concept in het tekstvak niet wegklikken bij een poll-herrender
  const oldInp=document.querySelector('.chat-input input'); const draft=oldInp?oldInp.value:'';
  const p=(window.S27DATA&&(S27DATA.projects()||[]).find(function(x){return x.id===id;}))||null;
  const berHost=$id('berichtChat');
  const dcBody=$id('dcBody');
  const adsBody=$id('adsChatBody');
  if(berHost && p && !dcBody){
    berHost.innerHTML=berichtChatInner(p);
  } else if(dcBody){
    // projectdetail-chat: enkel de chat-body verversen (laat de tabs/overzicht ongemoeid)
    const closed=!!(window.S27DATA && S27DATA.isChatClosed && p && p._raw && S27DATA.isChatClosed(p._raw.status));
    dcBody.innerHTML=chatHTML(id, closed);   // afgerond -> read-only historie (blijft zichtbaar + ververst mee)
  } else if(adsBody){
    adsBody.innerHTML=chatHTML(id);          // ads-chat: enkel de chat-body verversen bij een poll-update
  } else { return; }
  if(draft){ const newInp=document.querySelector('.chat-input input'); if(newInp) newInp.value=draft; }
  const newList=$id('chatList'); if(!newList) return;
  if(stickBottom || atBottom) newList.scrollTop=newList.scrollHeight;
  else newList.scrollTop=prevTop;
}

/* =============================================================================
   CHAT AUTO-REFRESH, poll de open chat (~9s) en herrender enkel bij nieuwe comments.
   Stopt bij tab-wissel, chat-wissel, modal-sluiten en logout.
   ============================================================================= */
const CHAT_POLL_MS = 9000;
// handtekening van de gecachete chat: aantal + laatste comment (tijd + begin-tekst) -> flicker-vrij vergelijken
function chatSig(taskId){
  const arr=(state.data.chats||{})[taskId]; if(!Array.isArray(arr)) return '';
  const last=arr[arr.length-1]||{};
  return arr.length+'|'+(last.tm||'')+'|'+String(last.tx||'').slice(0,40);
}
function startChatPoll(taskId){
  stopChatPoll();
  if(state.demoMode || !taskId) return;
  state._chatPoll={ id:taskId, sig:chatSig(taskId), busy:false };
  state._chatPollTimer=setInterval(function(){ pollChatOnce(taskId); }, CHAT_POLL_MS);
}
function stopChatPoll(){
  if(state._chatPollTimer){ clearInterval(state._chatPollTimer); state._chatPollTimer=null; }
  state._chatPoll=null;
}
async function pollChatOnce(taskId){
  const pc=state._chatPoll;
  if(!pc || pc.id!==taskId || pc.busy) return;
  // chat niet meer open (andere tab/project) -> poller opruimen
  if(state.activeProject!==taskId || (!$id('chatList'))){ stopChatPoll(); return; }
  pc.busy=true;
  try { await S27DATA.loadChat(taskId); } catch(e){ pc.busy=false; return; }
  pc.busy=false;
  if(!state._chatPoll || state._chatPoll.id!==taskId) return;   // tussentijds gestopt/gewisseld
  const sig=chatSig(taskId);
  if(sig!==pc.sig){ pc.sig=sig; if(state.activeProject===taskId) rerenderActiveChat(false); }
}
/* ---- Berichten: klik op een gesprek -> enkel de chatmodule wisselt (geen navigatie) ---- */
async function openBerichtChat(id, el){
  document.querySelectorAll('.bericht-row').forEach(function(r){ r.style.background=''; });
  var row = el || document.querySelector('.bericht-row[data-bid="'+id+'"]'); if(row)row.style.background='var(--paper-2)';
  const p=(window.S27DATA&&(S27DATA.projects()||[]).find(function(x){return x.id===id;}))||null; if(!p)return;
  stopChatPoll();              // chat-wissel -> oude poller stoppen
  state.activeProject=id;
  const host=$id('berichtChat'); if(!host)return;
  host.className='card br-'+(p.br||'blue');
  // ALTIJD verse data ophalen bij openen (niet blind de cache vertrouwen) -> verzonden berichten
  // en antwoorden van het team staan meteen in de historie bij terug-schakelen tussen chats.
  if(!state.demoMode){
    if(!((state.data.chats||{})[id])) host.innerHTML='<div class="empty" style="padding:50px"><div class="brand-spinner" style="margin:0 auto"></div></div>';
    try{ state.data.chats[id]=null; await S27DATA.loadChat(id); }catch(e){}
    if(state.activeProject!==id) return;   // tussentijds van chat gewisseld
  }
  host.innerHTML=berichtChatInner(p);
  const list=$id('chatList'); if(list) list.scrollTop=list.scrollHeight;
  startChatPoll(id);
}
/* ---- Bestandsupload in de chat (overal waar chatHTML staat) ---- */
async function chatUpload(input, taskId){
  const f=input.files&&input.files[0]; if(!f) return; input.value='';
  const tid=taskId||state.activeProject; const list=$id('chatList'); let bubble=null;
  if(list){ bubble=document.createElement('div'); bubble.className='msg me'; bubble.innerHTML='<div class="bubble"><div class="who">Jij</div><div class="tx">'+ic('doc',14)+' '+escapeHtml(f.name)+' <span style="opacity:.6">- uploaden…</span></div><div class="tm">nu</div></div>'; list.appendChild(bubble); list.scrollTop=list.scrollHeight; }
  const done=(txt)=>{ if(bubble){ var t=bubble.querySelector('.tx'); if(t)t.innerHTML=ic('doc',14)+' '+escapeHtml(f.name)+txt; } };
  if(state.demoMode){ done(' ✓'); return; }
  const rd=new FileReader();
  rd.onload=async function(){ const b64=String(rd.result).split(',')[1]||'';
    try{ await api(ENDPOINTS.chatAttachment, { task_id:tid, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), filename:f.name, file_data:b64 }); done(' ✓');
      await refreshChatCache(tid);   // echte attachment-comment uit ClickUp in de cache (geen duplicaat met de optimistische bubble)
    }
    catch(e){ done(' <span style="color:var(--s27-orange-ink)">- mislukt</span>'); }
  };
  rd.readAsDataURL(f);
}
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
/* ---- Dringende vraag aan Ilke (accountmanagement), werkt ook als de projectchat gesloten is ---- */
function _projNaam(id){ var p=(window.S27DATA&&(S27DATA.projects()||[]).find(function(x){return x.id===id;}))||null; return p?p.name:'dit project'; }
function dringendeVraag(id){
  const host=document.getElementById('dcBody'); if(!host) return;
  const naam=_projNaam(id);
  host.innerHTML='<div style="padding:16px"><b style="font-family:var(--font-display);font-size:15px">Dringende vraag aan Ilke</b><p class="fs" style="color:var(--ink-3);margin:6px 0 12px">Over <b>'+escapeHtml(naam)+'</b>, Ilke pikt dit persoonlijk op (accountmanagement).</p><textarea id="dvTx" rows="4" style="width:100%;box-sizing:border-box;font-family:var(--font-body);font-size:13.5px;padding:10px;border:1px solid var(--line);border-radius:8px;outline:none;resize:vertical" placeholder="Wat is er aan de hand?"></textarea><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary btn-sm" onclick="sendDringend(this,\''+escapeHtml(id)+'\')">Versturen '+ic('send',15)+'</button><button class="btn btn-ghost btn-sm" onclick="openProject(\''+escapeHtml(id)+'\')">Annuleer</button></div></div>';
  var t=$id('dvTx'); if(t)t.focus();
}
async function sendDringend(btn, id){
  const tx=(($id('dvTx')||{}).value||'').trim(); if(!tx){ var e=$id('dvTx'); if(e){ e.style.borderColor='var(--s27-orange)'; e.focus(); } return; }
  const naam=_projNaam(id); const host=document.getElementById('dcBody');
  if(host) host.innerHTML='<div class="empty" style="padding:26px 16px;text-align:center"><div class="em-ic">'+ic('st_approved',44)+'</div><b style="font-family:var(--font-display);font-size:15px;color:var(--ink-2)">Verzonden naar Ilke ✓</b><p style="margin:6px 0 0;font-size:13px;color:var(--ink-3)">Ze neemt zo snel mogelijk contact met je op.</p></div>';
  if(state.demoMode) return;
  try{ await api(ENDPOINTS.directMessage, { bedrijf_id:(state.session||{}).bedrijf_id, session_token:(state.session||{}).session_token, klant_naam:S27DATA.bedrijfsnaam(), onderwerp:'Dringende vraag, '+naam, bericht:'[DRINGEND · via projectpagina] '+tx, project:naam }); }catch(e){}
}

const BOT_ANSWERS={'Wanneer is mijn volgende meeting?':'Je vindt al je geplande meetings onder <b>Meetings</b> in de zijbalk. Wil je er een verzetten? Laat het hier weten.','Status van mijn website?':'Open je webdesign-project onder <b>Projecten</b>, daar zie je live de status en de laatste deliverables.','Hoe geef ik feedback?':'Open een project en ga naar het tabblad <b>Bestanden</b>. Per bestand kan je apart goedkeuren of feedback geven (met de weg waarlangs je het doorgaf), alles passen we gratis aan!'};
function botAsk(btn){ pushBot(btn.textContent,'user'); const q=btn.textContent; const c=$id('botChips'); if(c)c.style.display='none'; botReply(q); }
function botSend(){ const inp=$id('botInput'); const tx=(inp.value||'').trim(); if(!tx) return; pushBot(tx,'user'); inp.value=''; botReply(tx); }
function pushBot(text,who){ const m=$id('botMsgs'); const d=document.createElement('div'); d.className='bmsg '+who; d.innerHTML = who==='user'?escapeHtml(text):text; m.appendChild(d); m.scrollTop=m.scrollHeight; }
async function botReply(q){
  const m=$id('botMsgs'); const t=document.createElement('div'); t.className='typing'; t.innerHTML='<i></i><i></i><i></i><span class="typing-tx">Onze assistent denkt na…</span>'; m.appendChild(t); m.scrollTop=m.scrollHeight;
  if(state.demoMode){ setTimeout(()=>{ t.remove(); pushBot(BOT_ANSWERS[q]||'Goeie vraag! Ik verbind je even door met <b>Ilke</b>, je vaste contact, zij antwoordt je zo.','bot'); },1100); return; }
  try {
    const res = await api(ENDPOINTS.aiStatusBot, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), vraag:q, projecten_context:botContext() });
    t.remove(); pushBot(botFormatAnswer(res&&res.data&&res.data.answer),'bot');
  } catch(e){ t.remove(); pushBot('Ik verbind je even door met je vaste contact, die antwoordt je zo.','bot'); }
}
// AI-antwoord opmaken: eerst letterlijke \n -> echte regeleindes (de AI levert soms een
// letterlijke \n), DAN de interne ESCALATE-stuurregel weghalen (alles vóór de eerste regel-
// einde), en veilig als HTML tonen. Leeg of enkel-escalate -> nette doorverwijzing i.p.v. niets.
function botFormatAnswer(raw){
  var s=String(raw==null?'':raw).replace(/\\r/g,'').replace(/\\n/g,'\n');
  if(!s.trim()) return 'Ik verbind je even door met je vaste contact, die antwoordt je zo.';
  if(/^\s*ESCALATE\s*:/i.test(s)){
    var nl=s.indexOf('\n');
    s=(nl>=0?s.slice(nl+1):'').trim() || 'Ik laat je vaste contactpersoon dit persoonlijk opvolgen, je hoort snel van hen.';
  }
  return escapeHtml(s).replace(/\n/g,'<br>');
}
function botContext(){ const ps=S27DATA.projects()||[]; return ps.map(p=>'- '+p.name+' ('+p.disc+', '+p.status+(p.pct?(', '+p.pct+'% klaar'):'')+')').join('\n')||'(geen projecten)'; }

/* ---- bedrijf-switcher in de topbar (>1 bedrijf) ---- */
function renderCompanySwitcher(){
  const wrap=$id('switchMenu'); const nm=document.querySelector('.sb-client .nm');
  // ADMIN: toon de gekozen klantnaam + maak de client-knop een poort naar de zoek-overlay (alle klanten).
  if(state.adminMode){
    if(nm) nm.textContent = state._adminActiveName || S27DATA.bedrijfsnaam() || 'Kies klant';
    const sw=$id('clientSwitch');
    if(sw){ sw.style.pointerEvents=''; sw.classList.add('has-switch'); sw.classList.add('admin-switch'); }
    if(wrap) wrap.innerHTML='';   // geen mini-dropdown; toggleSwitch opent de admin-zoekoverlay
    return;
  }
  if(nm) nm.textContent = S27DATA.bedrijfsnaam();
  const comps = state.portalCompanies||[];
  const sw=$id('clientSwitch');
  if(wrap){
    if(comps.length<2){ wrap.innerHTML=''; if(sw){ sw.style.pointerEvents='none'; sw.classList.remove('has-switch'); } return; }
    if(sw){ sw.style.pointerEvents=''; sw.classList.add('has-switch'); }   // ≥2 bedrijven -> switcher klikbaar (én reset van een eerdere 1-bedrijf-staat)
    var active=state.activeBedrijf;
    wrap.innerHTML = comps.map(function(c){
      var on=(c.id===active);
      var check=on?'<svg class="sw-check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>':'';
      return '<button class="'+(on?'active':'')+'"'+(on?' aria-current="true"':'')+' onclick="switchCompany(\''+esc(c.id)+'\')"><span class="av" style="background:var(--s27-blue)">'+esc((c.naam||'?').slice(0,2).toUpperCase())+'</span><span class="nm">'+esc(c.naam)+'</span>'+check+'</button>';
    }).join('');
  }
}

/* =============================================================================
   UI-HELPERS (visueel; uit het ontwerp)
   ============================================================================= */
function toggleSidebar(){ const sb=$id('sidebar'); const open=sb.classList.toggle('open'); $id('sbScrim').classList.toggle('show',open); }
function closeSidebar(){ $id('sidebar').classList.remove('open'); $id('sbScrim').classList.remove('show'); }
function toggleSwitch(e){ e.stopPropagation(); if(state.adminMode){ openAdminPicker(); return; } const m=$id('switchMenu'); const sw=$id('clientSwitch'); const open=m.style.display==='block'; m.style.display=open?'none':'block'; sw.classList.toggle('open',!open); }
function closeSwitchMenu(){ const m=$id('switchMenu'); if(m)m.style.display='none'; const sw=$id('clientSwitch'); if(sw)sw.classList.remove('open'); }
// nette melding wanneer een bedrijf-switch faalt (zelfde stijl als onSessionExpired, maar zonder uitloggen)
function onSwitchFailed(msg){
  hideLoader();   // de switch-loader stond al aan (showSwitching); bij faal komt loadAndEnter niet -> zelf verbergen
  const b=document.createElement('div');
  b.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:14px 22px;border-radius:12px;font:700 14px/1.4 var(--font-display);z-index:99999;box-shadow:var(--sh-md)';
  b.textContent=msg||'Wisselen van bedrijf lukte niet. Probeer het zo opnieuw.'; document.body.appendChild(b);
  setTimeout(()=>{ try{b.remove();}catch(e){} }, 2600);
}
function toggleNotif(e){ e.stopPropagation(); const np=$id('notifPanel'); if(!np)return; if(!np.classList.contains('show'))renderNotifs(); np.classList.toggle('show'); }

/* =============================================================================
   MELDINGEN-SEEN-STATE, persistent (localStorage), per bedrijf gescoped.
   - bel-badge = aantal ONGEZIENE acties (zie updateNavBadges)
   - klik op een melding markeert díe als gezien; klik "Alles gezien" markeert alles
   - stabiele key per actie (taak-id uit action + categorie) zodat 'gezien' gezien blijft
   - verdwijnt de onderliggende actie, dan ruimen we de key op (pruneSeen)
   ============================================================================= */
function _bedrijfScope(){ return state.activeBedrijf || (state.session&&state.session.bedrijf_id) || 'x'; }
function _seenKey(){ return 's27_notif_seen_'+_bedrijfScope(); }
// stabiele identiteit van een cockpit-actie: taak-id (uit action) + categorie + titel-type
function notifId(a){
  var m=String(a&&a.action||'').match(/openProject\('([^']+)'/);
  var tid=m?m[1]:String(a&&a.title||'');
  var raw=tid+'::'+String(a&&a.cat||'')+'::'+String(a&&a.title||'');
  // sanitize -> identieke key in HTML-attr (escapeHtml), JS-string (onclick) én localStorage;
  // anders mismatcht 'SEO & GEO' (& -> &amp;) en daalt de bel-badge niet bij die melding.
  return raw.replace(/[^A-Za-z0-9:_-]+/g,'_');
}
function _readSeen(){ try{ return JSON.parse(localStorage.getItem(_seenKey())||'{}')||{}; }catch(e){ return {}; } }
function _writeSeen(o){ try{ localStorage.setItem(_seenKey(), JSON.stringify(o||{})); }catch(e){} }
// houd enkel keys die nog overeenkomen met een bestaande actie (pragmatisch: gezien=gezien, anders opruimen)
function pruneSeen(ids){
  var seen=_readSeen(), live={}, changed=false;
  (ids||[]).forEach(function(id){ if(seen[id]) live[id]=seen[id]; });
  for(var k in seen){ if(seen.hasOwnProperty(k) && !live[k]) changed=true; }
  if(changed || Object.keys(live).length!==Object.keys(seen).length) _writeSeen(live);
  return live;
}
function isSeen(a){ return !!_readSeen()[notifId(a)]; }
function markSeen(a){ var s=_readSeen(); s[notifId(a)]=Date.now(); _writeSeen(s); }
// aantal ongeziene acties (voor de bel-badge), met opruiming van verdwenen acties
function unseenCount(){
  if(state.demoMode) return 0;
  var cock=(window.S27DATA&&S27DATA.cockpit())||[];
  var seen=pruneSeen(cock.map(notifId));
  return cock.filter(function(a){ return !seen[notifId(a)]; }).length;
}

// echte meldingen uit de cockpit (Voor jou te doen), klikbaar -> juiste bestemming
function renderNotifs(){
  if(state.demoMode) return;
  const list=document.querySelector('#notifPanel .notif-list'); if(!list) return;
  const cock=(window.S27DATA&&S27DATA.cockpit())||[];
  pruneSeen(cock.map(notifId));
  if(!cock.length){ list.innerHTML='<div class="empty" style="padding:30px 16px;text-align:center"><div class="em-ic">'+ic('st_approved',40)+'</div><b style="font-family:var(--font-display);font-size:14px;color:var(--ink-2)">Alles is bij!</b><p style="margin:6px 0 0;font-size:13px;color:var(--ink-3)">Geen openstaande acties, wij werken ondertussen verder.</p></div>'; return; }
  // ongeziene bovenaan, geziene (gedimd) onderaan
  const sorted=cock.slice().sort(function(a,b){ return (isSeen(a)?1:0)-(isSeen(b)?1:0); });
  list.innerHTML=sorted.map(function(a){
    var seen=isSeen(a); var nid=escapeHtml(notifId(a));
    return '<button class="notif br-'+a.br+(seen?' seen':'')+'" data-nid="'+nid+'" style="width:100%;text-align:left;border:none;border-bottom:1px solid var(--line);background:none;cursor:pointer;display:flex;gap:12px;align-items:flex-start;padding:14px 16px'+(seen?';opacity:.55':'')+'" onclick="notifGo(\''+nid+'\');'+a.action+'"><div class="nic">'+ic(a.icon||'st_feedback',18)+'</div><div class="ntx"><b>'+escapeHtml(a.title)+'</b><p>'+(a.ctx||'')+'</p><div class="ntm">'+escapeHtml(a.tag||'')+'</div></div>'+((a.urgent&&!seen)?'<span class="unread"></span>':'')+'</button>';
  }).join('');
}
// klik op één melding -> markeer díe als gezien + werk de badge meteen bij
function notifGo(nid){
  const np=$id('notifPanel'); if(np)np.classList.remove('show');
  if(nid){ var s=_readSeen(); s[nid]=Date.now(); _writeSeen(s); updateNavBadges(); }
}
function markAllSeen(){
  if(!state.demoMode){
    var cock=(window.S27DATA&&S27DATA.cockpit())||[]; var s=_readSeen();
    cock.forEach(function(a){ s[notifId(a)]=Date.now(); }); _writeSeen(s);
  }
  document.querySelectorAll('#notifPanel .notif').forEach(n=>{ n.classList.add('seen'); n.style.opacity='.55'; const u=n.querySelector('.unread'); if(u)u.remove(); });
  const b=document.querySelector('#bellBtn .badge'); if(b)b.style.display='none';
}
document.addEventListener('click',e=>{ if(!e.target.closest('.client-switch-wrap')){ const m=$id('switchMenu'); if(m)m.style.display='none'; const sw=$id('clientSwitch'); if(sw)sw.classList.remove('open'); } if(!e.target.closest('#notifPanel')&&!e.target.closest('#bellBtn')){ const np=$id('notifPanel'); if(np)np.classList.remove('show'); } });
function filterDienst(disc,btn){ document.querySelectorAll('.proj-filter .fchip').forEach(c=>c.classList.remove('active')); if(btn)btn.classList.add('active'); const body=$id('projViewBody'); if(!body)return; body.querySelectorAll('.projflat-card').forEach(c=>{ const ds=(c.dataset.discs||'').split('|'); c.style.display=(disc==='all'||ds.indexOf(disc)>=0)?'':'none'; }); body.querySelectorAll('.projcluster').forEach(sec=>{ const vis=[].slice.call(sec.querySelectorAll('.projflat-card')).some(c=>c.style.display!=='none'); sec.style.display=vis?'':'none'; }); }
function goDienst(disc){ goTab('projecten'); setTimeout(()=>{ const sel=document.querySelector('.proj-filter select'); if(sel){ sel.value=disc; filterDienst(disc); } },60); }
// Kennismaking / koffiegesprek -> meetingpagina, automatisch bij Arne (kies een vrij moment in zijn agenda)
function koffieMetArne(){ goTab('meetings'); setTimeout(()=>{ const btn=document.querySelector('.meet-side .mtype[data-mtype="nieuwproject"]')||document.querySelector('.meet-side .mtype'); if(btn) pickMtype(btn,'Arne','orange','Kennismaking / koffiegesprek'); const ag=$id('meetAgenda'); if(ag&&ag.scrollIntoView) ag.scrollIntoView({behavior:'smooth',block:'nearest'}); },120); }
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
function approveAll(btn){ const banner=document.querySelector('.fb-banner'); if(banner){ banner.style.animation='none'; banner.innerHTML='<div class="fb-ic" style="background:var(--s27-green)">'+ic('check',20)+'</div><div class="fb-tx"><b>Bedankt, goedgekeurd!</b><p>We zetten meteen de volgende stap.</p></div>'; banner.style.background='var(--s27-green-soft)'; } submitFeedbackReal('goedgekeurd'); }
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
/* --- In-portal feedback per SUBTAAK (vanuit het proces-overzicht), via feedbackV2 ---
   task_id = de subtaak zelf (niet de hoofdtaak), zodat goedkeuren/feedback op de juiste
   oplevering landt. Optimistische UI: knoppen -> bevestiging, daarna best-effort POST. */
function procesFeedbackToggle(taskId){
  var b=document.getElementById('fbcfb-'+taskId); if(!b) return;
  var open=b.style.display==='none'; b.style.display=open?'':'none';
  if(open){ var t=document.getElementById('fbctx-'+taskId); if(t) t.focus(); }
}
async function procesApprove(taskId){
  var act=document.getElementById('fbcact-'+taskId), fb=document.getElementById('fbcfb-'+taskId);
  if(fb) fb.style.display='none';
  if(act) act.innerHTML='<span class="pill pill-done"><span class="pdot"></span>Goedgekeurd, bedankt!</span>';
  if(state.demoMode || !state.session) return;
  try { await api(ENDPOINTS.feedbackV2, { task_id:taskId, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), deliverables:[{label:'Oplevering',choice:'goedgekeurd',kanaal:'portaal',kanaal_label:'via het portaal'}], algemene_opmerking:'' }); } catch(e){}
}
async function procesFeedback(taskId){
  var t=document.getElementById('fbctx-'+taskId); var msg=t?String(t.value||'').trim():'';
  if(!msg){ if(t){ t.style.borderColor='var(--s27-orange)'; t.focus(); } return; }
  var act=document.getElementById('fbcact-'+taskId), fb=document.getElementById('fbcfb-'+taskId);
  if(fb) fb.style.display='none';
  if(act) act.innerHTML='<span class="pill pill-wait"><span class="pdot"></span>Feedback verstuurd, bedankt!</span>';
  if(state.demoMode || !state.session) return;
  try { await api(ENDPOINTS.feedbackV2, { task_id:taskId, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), deliverables:[{label:'Oplevering',choice:'feedback',opmerking:msg,kanaal:'portaal',kanaal_label:'via het portaal'}], algemene_opmerking:'' }); } catch(e){}
}
// facturatiegegevens opslaan, ALLE velden via facturatieSave (schrijft naar exact de
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
// Eigen profiel + notificatievoorkeur realtime opslaan -> update_contact -> ClickUp-contactfiche.
// Schrijft UITSLUITEND naar de eigen (ingelogde) contactfiche, npProfileId is per definitie
// de "me"-contactpersoon (zie panelInstellingen). De e-mail van het eigen account sturen we
// hier mee als contact-email; dit raakt nooit een ander contact (dat loopt via saveContact).
async function saveProfile(){
  if(state.demoMode) return;
  const id=(($id('npProfileId')||{}).value||'').trim(); if(!id) return;
  const base=_contactById(id)||{};
  const g=(x)=>(($id(x)||{}).value||'').trim();
  try {
    await api(ENDPOINTS.bedrijfBeheer, { action:'update_contact', contact_id:id, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token,
      voornaam:base.voornaam||'', achternaam:base.achternaam||'', email:(g('npEmail')||base.email||''), gsm:(g('npGsm')||base.gsm||''), voorkeur:g('npVoorkeur')||base.voorkeur||'Geen' });
    const s=$id('npSaved'); if(s){ s.style.display=''; setTimeout(function(){ var x=$id('npSaved'); if(x)x.style.display='none'; }, 2200); }
    state.data.team=null; try{ await S27DATA.loadTeam(); }catch(e){}
  } catch(e){}
}
/* ---- Contactpersonen-beheer (iedere contactpersoon mag toevoegen/wijzigen/verwijderen) ---- */
function _contactById(id){ const t=window.S27DATA&&S27DATA.team(); const a=(t&&t.contactpersonen)||[]; for(var i=0;i<a.length;i++){ if(String(a[i].id)===String(id)) return a[i]; } return null; }
function addContact(){ const host=$id('contactFormHost'); if(!host)return; host.innerHTML=contactFormHTML(null); const f=host.querySelector('input'); if(f)f.focus(); host.scrollIntoView&&host.scrollIntoView({behavior:'smooth',block:'nearest'}); }
function editContact(id){ const host=$id('contactFormHost'); if(!host)return; host.innerHTML=contactFormHTML(_contactById(id)||{id:id}); const f=host.querySelector('input'); if(f)f.focus(); }
function closeContactForm(){ const host=$id('contactFormHost'); if(host) host.innerHTML=''; }
async function saveContact(id, btn){
  const g=(x)=>(($id(x)||{}).value||'').trim();
  // Bij wijzigen: anker op het ECHTE contactrecord van dit id. Zo reizen contact_id en e-mail
  // altijd samen mee en kan het bewerken van contact A nooit het e-mailadres van een ander
  // contact (bv. de ingelogde gebruiker) wegschrijven; lege velden blanken bestaande data niet.
  const ref = id ? (_contactById(id)||{}) : {};
  const payload={
    voornaam: g('cfVoor') || ref.voornaam || '',
    achternaam: g('cfAchter') || ref.achternaam || '',
    email: g('cfEmail') || ref.email || '',
    gsm: g('cfGsm') || ref.gsm || '',
    voorkeur: g('cfVoorkeur') || ref.voorkeur || 'Geen'
  };
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
  try { await api(ENDPOINTS.bedrijfBeheer, { action:'delete_contact', contact_id:id, email:(c&&c.email)||'', bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token }); state.data.team=null; try{ await S27DATA.loadTeam(); }catch(e){} renderPanel('instellingen'); } catch(e){ if(row){ row.style.opacity=''; row.style.pointerEvents=''; } }
}
const MEET_HOSTS={ 'Arne':{email:'arne@studio27.be'}, 'Ilke':{email:'ilke@studio27.be'} };
/* ---- Offerte: vraag stellen -> komt als comment op de offerte-taak (naar de assignee) ---- */
function offerteVraag(id, btn){
  const row=btn&&btn.closest('.filecard'); if(!row||row.querySelector('.off-q'))return;
  const q=document.createElement('div'); q.className='off-q'; q.style.cssText='flex-basis:100%;width:100%;margin-top:10px;display:flex;flex-direction:column;gap:8px';
  q.innerHTML='<textarea class="off-qtx" rows="3" placeholder="Je vraag over deze offerte…" style="width:100%;box-sizing:border-box;font-family:var(--font-body);font-size:13.5px;padding:10px;border:1px solid var(--line);border-radius:8px;outline:none;resize:vertical"></textarea><div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="sendOfferteVraag(this,\''+escapeHtml(id)+'\')">Versturen '+ic('send',14)+'</button><button class="btn btn-ghost btn-sm" onclick="this.closest(\'.off-q\').remove()">Annuleer</button></div>';
  row.appendChild(q); var t=q.querySelector('textarea'); if(t)t.focus();
}
async function sendOfferteVraag(btn, id){
  const q=btn&&btn.closest('.off-q'); if(!q)return; const tx=((q.querySelector('.off-qtx')||{}).value||'').trim();
  if(!tx){ var e=q.querySelector('textarea'); if(e){ e.style.borderColor='var(--s27-orange)'; e.focus(); } return; }
  q.innerHTML='<div class="fs" style="color:var(--s27-green-ink,#147A50);padding:4px 0">✓ Je vraag is verstuurd naar je Studio 27-contact, je hoort snel iets.</div>';
  if(state.demoMode) return;
  try{ await api(ENDPOINTS.chatPost, { task_id:id, bedrijf_id:(state.session||{}).bedrijf_id, session_token:(state.session||{}).session_token, klant_naam:S27DATA.bedrijfsnaam(), comment_text:'[VRAAG OVER OFFERTE · via portaal] '+tx }); }catch(e){}
}
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
      // bij ok:false klopt de free/busy niet -> geen vals-volledig slotrooster tonen
      if(!(res&&res.data&&res.data.ok)){ if(box)box.innerHTML='<p class="fs" style="color:var(--ink-3);padding:6px 0">De agenda van '+escapeHtml(who)+' kon even niet geladen worden. Stuur ons gerust een berichtje, dan prikken we samen een moment.</p>'; return; }
      const cals=(res.data.calendars)||{}; const cal=cals[email]||{};
      busy=(cal.busy||[]).map(b=>({start:new Date(b.start).getTime(), end:new Date(b.end).getTime()})).filter(b=>b.end>b.start);
    }catch(e){ if(box)box.innerHTML='<p class="fs" style="color:var(--ink-3);padding:6px 0">De agenda kon even niet geladen worden. Stuur ons gerust een berichtje, dan prikken we samen een moment.</p>'; return; }
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
    for(let h=8; h<17; h++){ for(let m=0;m<60;m+=30){   // 08:00-raster, gelijk aan de projectmeeting-picker + backend
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
  if(!slots.length) return '<p class="fs" style="color:var(--ink-3);padding:6px 0">Geen vrije momenten in de komende maand, stuur ons gerust een berichtje, dan zoeken we samen iets.</p>';
  const byDay={}; slots.forEach(st=>{ (byDay[_dayKey(st)]=byDay[_dayKey(st)]||[]).push(st); });
  state.meetCtx.byDay=byDay; state.meetCtx.slots=slots; state.meetCtx.weekStart=_monday(slots[0]); state.meetCtx.selDay=null; state.meetCtx.navFn='meetWeekNav';
  return '<p class="fs" style="margin:0 0 10px;color:var(--ink-3)">Live uit de agenda van <b>'+escapeHtml(state.meetCtx.who)+'</b> · ± 30 min. Blader per week tot een maand vooruit:</p>'
    +'<div id="meetWeek">'+meetWeekHTML()+'</div>'
    +'<button class="btn btn-branch br-'+state.meetCtx.color+' btn-block" id="meetConfirm" style="margin-top:16px" onclick="confirmMeeting(this)" disabled>Bevestig afspraak met '+escapeHtml(state.meetCtx.who)+'</button>';
}
function meetWeekHTML(){
  const c=state.meetCtx;
  return weekStrip(c,'meetDayPick')+'<label class="ms-label">Tijdslot <span style="font-weight:600;color:var(--ink-4)">(8–17u)</span></label><div class="slotgrid" id="meetSlotGrid">'+(c.selDay?meetSlotButtons(c.byDay[c.selDay]):'<span class="fs" style="color:var(--ink-4)">Geen vrije momenten deze week, blader verder ›</span>')+'</div>';
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
  try { await api(ENDPOINTS.directMessage, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), onderwerp:(ctx.type||'Meeting')+'-aanvraag via portaal', bericht:'Graag een '+(ctx.type||'meeting')+' met '+who+' op '+wanneer+', gekozen uit de live beschikbaarheid in het portaal.' });
    if(btn){ btn.disabled=false; btn.innerHTML='Aanvraag verstuurd ✓, we bevestigen snel'; }
  } catch(e){ if(btn){ btn.disabled=false; btn.textContent='Opnieuw proberen'; } }
}
async function submitNieuwProject(btn){
  const dienst=(($id('npDienst')||{}).value)||''; const typeSel=$id('npType'); const typeTxt=(typeSel&&typeSel.value)?typeSel.options[typeSel.selectedIndex].text:''; const when=(($id('npWhen')||{}).value)||'';
  if(!dienst) return;
  if(state.demoMode){ if(btn) btn.innerHTML='Aanvraag verstuurd ✓'; return; }
  if(btn){ btn.disabled=true; btn.textContent='Versturen…'; }
  try { await api(ENDPOINTS.newProjectIntake, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), project_type:dienst+(typeTxt?(', '+typeTxt):''), gewenste_opleverdatum:when, omschrijving:'Aanvraag via portaal: '+dienst+(typeTxt?(' / '+typeTxt):'')+' / start: '+when, intentie:'offerte_meeting' });
    if(btn){ btn.disabled=false; btn.innerHTML='Aanvraag verstuurd ✓'; }
  } catch(e){ if(btn){ btn.disabled=false; btn.textContent='Opnieuw proberen'; } }
}
/* ---- Offerte-samensteller: winkelmand -> gateway (PandaDoc via Make) ----
   Contract: api(ENDPOINTS.offerteGenereren, { items:[{sku,naam,prijs,aantal}], opmerking })
   -> { ok, offerte_task_id, offerte_task_url, pandadoc_id, message }. */
function offerteResultBox(){ return $id('offResult'); }
function showOfferteResult(html, isErr){
  const box=offerteResultBox(); if(!box) return;
  box.className='off-result'+(isErr?' err':''); box.style.display='block'; box.innerHTML=html;
  if(box.scrollIntoView) try{ box.scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(e){}
}
async function offerteSubmit(btn){
  const cart=(state._offerteCart)||{};
  const skus=Object.keys(cart).filter(s=>cart[s]>0);
  if(!skus.length){ showOfferteResult('Je winkelmand is nog leeg. Voeg eerst een product toe.', true); return; }
  // items in het FE->BE-contract: [{sku, naam, prijs, aantal}]
  const items=skus.map(function(sku){ const p=offBySku(sku)||{}; return { sku:sku, naam:p.name||'', groep:p.group||'', prijs:Number(p.price)||0, aantal:cart[sku] }; });
  const opm=(($id('offOpm')||{}).value||'').trim();
  state._offerteOpm=opm;   // bewaren zodat een rerender de tekst behoudt
  if(state.demoMode){
    showOfferteResult('<b>Bedankt!</b> In je echte portaal sturen we deze selectie ('+items.length+' '+(items.length===1?'product':'producten')+') meteen door en krijg je hier de link naar je offerte. Dit is de voorbeeldweergave.', false);
    if(btn){ btn.disabled=false; btn.innerHTML=ic('send',16)+' Offerte aanvragen'; }
    return;
  }
  if(btn){ btn.disabled=true; btn.innerHTML='Offerte aanmaken…'; }
  showOfferteResult('<span class="brand-spinner" style="width:18px;height:18px;display:inline-block;vertical-align:-3px;margin-right:8px"></span>We stellen je offerte samen, even geduld…', false);
  try{
    const res=await api(ENDPOINTS.offerteGenereren, { items:items, opmerking:opm });
    const d=(res&&res.data)||{};
    if(res&&res.ok&&d&&d.ok!==false&&(d.offerte_task_url||d.offerte_task_id||d.pandadoc_id)){
      const url=d.offerte_task_url||'';
      const link=url?(' <a href="'+escapeHtml(url)+'" target="_blank" rel="noopener">Bekijk je offerte '+ic('arrow',13)+'</a>'):'';
      const msg=d.message?escapeHtml(d.message):'Je offerte is aangemaakt en staat klaar.';
      const okHtml=ic('check',16)+' <b>Gelukt!</b> '+msg+link+'<div style="margin-top:6px;font-size:12px;color:var(--ink-4)">We kijken alles nog persoonlijk na voor je definitieve offerte.</div>';
      // winkelmand legen na succes; offertes-cache stale maken zodat de lijst hierboven later bijwerkt
      state._offerteCart={}; state._offerteOpm=''; state.data.offertes=null;
      renderOfferteBuilder();        // herrender met lege mand (#offResult wordt opnieuw opgebouwd)
      showOfferteResult(okHtml, false);   // resultaat terugzetten na de rerender
    } else {
      const m=(d&&d.message)?escapeHtml(d.message):'Er liep iets mis bij het aanmaken van je offerte. Probeer het zo opnieuw, of stuur ons gerust een berichtje.';
      showOfferteResult(m, true);
      if(btn){ btn.disabled=false; btn.innerHTML=ic('send',16)+' Offerte aanvragen'; }
    }
  }catch(e){
    showOfferteResult('Er liep iets mis bij het aanmaken van je offerte. Probeer het zo opnieuw, of stuur ons gerust een berichtje.', true);
    if(btn){ btn.disabled=false; btn.innerHTML=ic('send',16)+' Offerte aanvragen'; }
  }
}
/* ---- Metricool: post goedkeuren + feedback geven vanuit het portaal ----
   Goedkeuren: api(ENDPOINTS.metricoolApprove, { post_id }). Lukt de backend het (nog) niet,
   dan tonen we een nette "binnenkort"-staat. Feedback gaat via directMessage (chatkanaal). */
function _mcMarkApprovedLocal(id){ state._mcApproved=state._mcApproved||{}; state._mcApproved[id]=true; if(window.S27DATA&&S27DATA.markMetricoolApproved) S27DATA.markMetricoolApproved(id); }
function _mcReplaceActions(id, html){ var box=$id('mca-'+id); if(box) box.outerHTML=html; }
async function metricoolApprove(id, btn){
  if(btn){ btn.disabled=true; btn.innerHTML='Bezig…'; }
  if(state.demoMode){ _mcMarkApprovedLocal(id); _mcReplaceActions(id, '<div class="mc-approved" id="mca-'+escapeHtml(id)+'">'+ic('check',16)+'<span>Goedgekeurd, bedankt! (voorbeeldweergave)</span></div>'); return; }
  try{
    const res=await api(ENDPOINTS.metricoolApprove, { post_id:id });
    const d=(res&&res.data)||{};
    if(res&&res.ok&&d&&d.ok!==false){
      _mcMarkApprovedLocal(id);
      _mcReplaceActions(id, '<div class="mc-approved" id="mca-'+escapeHtml(id)+'">'+ic('check',16)+'<span>Goedgekeurd, bedankt! We plannen deze post zo verder in.</span></div>');
    } else {
      // backend kan de goedkeuring (nog) niet verwerken -> nette "binnenkort"-staat
      _mcReplaceActions(id, '<div class="mc-actions" id="mca-'+escapeHtml(id)+'" onclick="event.stopPropagation()"><div class="fs" style="color:var(--ink-3);line-height:1.5">Goedkeuren via het portaal kan hier binnenkort. Geef je akkoord voorlopig even via je Studio 27-contact, of laat hieronder een berichtje na.</div><div class="mc-actrow" style="margin-top:8px"><button class="btn btn-outline btn-sm" onclick="toggleSocialFeedback(\''+escapeHtml(id)+'\')">'+ic('msg',15)+' Bericht achterlaten</button></div><div class="mc-fb" id="mcfb-'+escapeHtml(id)+'" style="display:none"><textarea id="mcfbtx-'+escapeHtml(id)+'" rows="3" placeholder="Je opmerking bij deze post…"></textarea><div class="mc-fbact"><button class="btn btn-primary btn-sm" onclick="metricoolFeedback(\''+escapeHtml(id)+'\',this)">'+ic('send',14)+' Versturen</button></div></div></div>');
    }
  }catch(e){
    if(btn){ btn.disabled=false; btn.innerHTML=ic('check',15)+' Goedkeuren'; }
  }
}
async function metricoolFeedback(id, btn){
  const t=$id('mcfbtx-'+id); const tx=((t&&t.value)||'').trim();
  if(!tx){ if(t){ t.style.borderColor='var(--s27-orange)'; t.focus(); } return; }
  const box=$id('mcfb-'+id);
  if(box) box.innerHTML='<div class="fs" style="color:var(--s27-green-ink,#147A50);padding:4px 0">'+ic('check',14)+' Je feedback is verstuurd naar je Studio 27-contact, dankjewel!</div>';
  if(state.demoMode) return;
  try{
    await api(ENDPOINTS.directMessage, { bedrijf_id:(state.session||{}).bedrijf_id, session_token:(state.session||{}).session_token, klant_naam:S27DATA.bedrijfsnaam(), onderwerp:'Feedback social post (via portaal)', bericht:'Feedback op geplande post '+id+': '+tx });
  }catch(e){}
}
/* ---- Social-kalender: goedkeuren + aanpassing doorgeven (nieuwe detail-UI) ---- */
async function socialApprove(id, btn){
  if(btn){ btn.disabled=true; btn.textContent='Bezig…'; }
  state._mcApproved=state._mcApproved||{}; state._mcApproved[id]=true;
  if(window.S27DATA&&S27DATA.markMetricoolApproved) S27DATA.markMetricoolApproved(id);
  if(!state.demoMode){ try{ await api(ENDPOINTS.metricoolApprove, { post_id:id }); }catch(e){} }
  if(typeof renderPanel==='function') renderPanel('socials');
}
async function socialFeedback(id, btn){
  const t=$id('socFbTx'); const tx=((t&&t.value)||'').trim();
  if(!tx){ if(t){ t.style.borderColor='var(--s27-orange)'; t.focus(); } return; }
  if(btn){ btn.disabled=true; btn.textContent='Versturen…'; }
  if(!state.demoMode){ try{ await api(ENDPOINTS.metricoolFeedback, { post_id:id, feedback:tx }); }catch(e){} }
  const box=$id('socFbWrap');
  if(box) box.innerHTML='<div class="soc-fbok">'+ic('check',16)+' Je opmerking is doorgestuurd naar je Studio 27-contact. We passen het aan en je ziet de update hier verschijnen.</div>';
}
/* --- In-portal post-editor: kanalen toggelen, hashtag toevoegen, en DIRECT opslaan in Metricool --- */
function socialToggleChan(btn){ if(btn) btn.classList.toggle('on'); }
function _fileToBase64(f){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ res(String(r.result||'')); }; r.onerror=function(){ rej(new Error('read')); }; r.readAsDataURL(f); }); }
// klant uploadt een foto/video -> worker host ze -> publieke URL invullen + preview verversen
async function socialUploadMedia(input){
  var msg=$id('socUpMsg'); var f=input&&input.files&&input.files[0]; if(!f) return;
  if(f.size>22*1024*1024){ if(msg) msg.innerHTML='<span class="soc-saveerr">Bestand te groot (max 22 MB). Plak voor grote video\'s een URL.</span>'; input.value=''; return; }
  if(msg) msg.innerHTML='<span style="color:var(--ink-4);display:inline-flex;align-items:center;gap:6px">'+ic('upload',13)+' Uploaden…</span>';
  try{
    var b64=await _fileToBase64(f);
    if(state.demoMode || !state.session){ var mi0=$id('socMedia'); if(mi0){ mi0.value=URL.createObjectURL(f); } socialPreviewMedia(); if(msg) msg.innerHTML='<span class="soc-saveok">'+ic('check',13)+' Klaar (demo)</span>'; input.value=''; return; }
    var r=await api(ENDPOINTS.metricoolMediaUpload, { filename:f.name, content_type:f.type, file_data:b64 });
    var d=(r&&r.ok&&r.data)?r.data:(r&&r.ok!==undefined?r:null);
    if(d&&d.ok&&d.url){ var mi=$id('socMedia'); if(mi){ mi.value=d.url; } socialPreviewMedia(); if(msg) msg.innerHTML='<span class="soc-saveok">'+ic('check',13)+' Visual geüpload. Klik op Opslaan om te bevestigen.</span>'; }
    else { var det=(d&&d.message)?(' '+escapeHtml(String(d.message))):''; if(msg) msg.innerHTML='<span class="soc-saveerr">Upload lukte niet.'+det+'</span>'; }
  }catch(e){ if(msg) msg.innerHTML='<span class="soc-saveerr">Upload lukte niet. Probeer het opnieuw.</span>'; }
  input.value='';
}
function socialAddHash(){
  var inp=$id('socHash'), cap=$id('socCap'); if(!inp||!cap) return;
  var h=String(inp.value||'').trim().replace(/^#+/,''); if(!h) return;
  cap.value=(String(cap.value||'').replace(/\s+$/,'')+' #'+h).replace(/^\s+/,'')+' '; inp.value=''; cap.focus();
}
async function socialSavePost(id, btn){
  var cap=$id('socCap'), media=$id('socMedia'), msg=$id('socSaveMsg');
  var chans=[].slice.call(document.querySelectorAll('.soc-chic.on')).map(function(b){return b.getAttribute('data-net');});
  if(!chans.length){ if(msg) msg.innerHTML='<div class="soc-saveerr">Kies minstens één kanaal.</div>'; return; }
  if(btn){ btn.disabled=true; btn.dataset.orig=btn.innerHTML; btn.textContent='Opslaan…'; }
  var payload={ post_id:id, text:(cap?cap.value:''), providers:chans };
  var mv=media?String(media.value||'').trim():''; if(mv) payload.media=[mv];
  var resetBtn=function(){ if(btn){ btn.disabled=false; btn.innerHTML=btn.dataset.orig||(ic('check',16)+' Wijzigingen opslaan'); } };
  if(state.demoMode || !state.session){ if(msg) msg.innerHTML='<div class="soc-saveok">'+ic('check',15)+' Opgeslagen (demo).</div>'; resetBtn(); return; }
  try{
    var r=await api(ENDPOINTS.metricoolUpdate, payload);
    var d=(r&&r.ok&&r.data)?r.data:(r&&r.ok!==undefined?r:null);
    if(d&&d.ok){
      if(msg) msg.innerHTML='<div class="soc-saveok">'+ic('check',15)+' Je wijziging staat in Metricool. We verwerken ze verder.</div>';
      try{ state.data.metricool=null; await S27DATA.loadMetricool(); }catch(e){}
      state._socialDetail=null; setTimeout(function(){ renderPanel('socials'); }, 700);
    } else {
      var det=(d&&d.detail)?(': '+escapeHtml(String(d.detail))):'';
      if(msg) msg.innerHTML='<div class="soc-saveerr">Opslaan lukte niet'+det+'. Probeer opnieuw of laat het ons weten via de chat.</div>';
      resetBtn();
    }
  }catch(e){ if(msg) msg.innerHTML='<div class="soc-saveerr">Opslaan lukte niet. Probeer het later opnieuw.</div>'; resetBtn(); }
}
async function uploadHuisstijl(input){
  const f=input.files&&input.files[0]; if(!f) return;
  if(state.demoMode){ return; }
  const rd=new FileReader();
  rd.onload=async function(){ const b64=String(rd.result).split(',')[1]||'';
    try{ await api(ENDPOINTS.huisstijlUpload, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, filename:f.name, file_data:b64 }); state.data.huisstijl=null; goTab('instellingen'); }catch(e){}
  };
  rd.readAsDataURL(f);
}
/* ===== Agenda-slotpicker, echte beschikbaarheid + inplannen (scope-guarded) ===== */
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
async function loadPlanSlots(taskId, isShoot){
  const box=$id('s27-plan-'+taskId); if(!box) return;
  box.innerHTML='<div class="empty" style="padding:20px"><div class="brand-spinner" style="margin:0 auto 10px"></div>Beschikbare momenten ophalen…</div>';
  let data=null;
  if(!state.demoMode){ const van=Date.now(),tot=Date.now()+31*86400000;   // horizon = de volledige maand die de picker toont (busy-data dekt nu alle slots)
    const res=await api(ENDPOINTS.beschikbaarheid,{task_id:taskId,van:String(van),tot:String(tot),bedrijf_id:state.session.bedrijf_id,session_token:state.session.session_token});
    data=(res&&res.ok&&res.data&&res.data.ok)?res.data:null;
  } else { data={assignee_naam:'Guus Van den Heuvel',assignee_emails:'guus@studio27.be',list_id:'demo',taak_est:0,blokken:[{start:Date.now()+2*86400000,due:0,est:7200000,afwezig:false}]}; }
  if(!data){ box.innerHTML='<p class="fs" style="color:var(--ink-3)">Beschikbaarheid kon niet geladen worden. <a href="#" onclick="goTab(\'meetings\');return false">Plan via Meetings →</a></p>'; return; }
  // Backend stuurt no_member:true wanneer er nog geen teamlid aan dit project hangt -> eerlijke melding
  // i.p.v. "geen vrije momenten" (dat zou suggereren dat het team onbereikbaar is).
  if(data.no_member){ box.innerHTML='<p class="fs" style="color:var(--ink-3)">Voor dit project is nog geen vaste contactpersoon toegewezen. <a href="#" onclick="goTab(\'meetings\');return false">Plan via Meetings →</a>, dan koppelen we je meteen aan de juiste persoon.</p>'; return; }
  const durMs=planDurMs(data.taak_est); const slots=computeFreeSlots(data.blokken,durMs);
  const aEmails=String(data.assignee_emails||data.assignee_email||'').split(',').map(s=>s.trim()).filter(Boolean);
  state.planCtx=state.planCtx||{};
  state.planCtx[taskId]={assignee:data.assignee_naam||'je Studio 27-contact',assignee_emails:aEmails,list_id:data.list_id||'',online:false,sel:null,dur:durMs,pool:!!data.pool,vrijCount:Number(data.vrij_count)||0,shoot:!!isShoot};
  box.innerHTML=renderPlanPicker(taskId,slots);
}
function renderPlanPicker(taskId,slots){
  const ctx=(state.planCtx||{})[taskId]||{};
  if(!slots.length) return '<p class="fs" style="color:var(--ink-3)">Geen vrije momenten in de komende maand. <a href="#" onclick="goTab(\'meetings\');return false">Plan via Meetings →</a></p>';
  const byDay={}; slots.forEach(ms=>{ (byDay[_dayKey(ms)]=byDay[_dayKey(ms)]||[]).push(ms); });
  ctx.byDay=byDay; ctx.slots=slots; ctx.weekStart=_monday(slots[0]); ctx.selDay=null; ctx.navFn='planWeekNav'; ctx.taskId=taskId; state.planActive=taskId;
  // pool-shoot: toon subtiel hoeveel content creators beschikbaar zijn (>=1 = boekbaar; wij wijzen er één toe).
  const poolBadge=(ctx.pool&&ctx.vrijCount>0)?' <span class="fs" style="color:var(--ink-4)">· '+ctx.vrijCount+' content creator'+(ctx.vrijCount===1?'':'s')+' beschikbaar</span>':'';
  // shoot-modus (shoot-vlag uit de detail of pool uit de backend): altijd op locatie, geen online-optie.
  const isShoot=!!(ctx.shoot||ctx.pool);
  if(isShoot && state.planCtx && state.planCtx[taskId]) state.planCtx[taskId].online=false;
  const intro=isShoot
    ? '<p class="fs" style="margin:0 0 12px;color:var(--ink-3)">Kies een shootdag · duur ± '+escapeHtml(fmtDur(ctx.dur||PLAN_DUR_MS))+poolBadge+'. Blader per week tot een maand vooruit:</p>'
    : '<p class="fs" style="margin:0 0 12px;color:var(--ink-3)">Met <b>'+escapeHtml(ctx.assignee||'')+'</b> · duur ± '+escapeHtml(fmtDur(ctx.dur||PLAN_DUR_MS))+poolBadge+'. Blader per week tot een maand vooruit:</p>';
  const modeRow=isShoot
    ? '<div class="plan-locnote">'+ic('pin',15)+' Op locatie of bij Studio 27</div>'
    : '<div style="display:flex;gap:16px;margin-bottom:12px"><label class="remember"><input type="radio" name="pm" value="fysiek" checked onchange="planMode(\''+escapeHtml(taskId)+'\',false)"> Fysiek bij Studio 27</label><label class="remember"><input type="radio" name="pm" value="online" onchange="planMode(\''+escapeHtml(taskId)+'\',true)"> Online (Google Meet)</label></div>';
  return intro+modeRow+
    '<div id="planWeekBox">'+planWeekHTML()+'</div>'+
    '<button class="btn btn-branch br-blue btn-block" id="plan-book" onclick="bookPlanSlot(\''+escapeHtml(taskId)+'\')" disabled style="margin-top:12px">'+(isShoot?'Bevestig shoot':'Bevestig afspraak')+'</button>';
}
function planWeekHTML(){ const c=(state.planCtx||{})[state.planActive]; if(!c)return ''; return weekStrip(c,'planDayPick')+'<label class="ms-label">Tijdslot</label><div class="slotgrid" id="planSlotGrid">'+(c.selDay?planSlotButtons(c.byDay[c.selDay]):'<span class="fs" style="color:var(--ink-4)">Geen vrije momenten deze week, blader verder ›</span>')+'</div>'; }
function planSlotButtons(arr){ return (arr||[]).map(ms=>{ const t=new Date(ms).toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}); return '<button class="slot" data-plan-slot="'+ms+'" onclick="pickPlanSlot(this)">'+t+'</button>'; }).join(''); }
function planWeekNav(dir){ const c=(state.planCtx||{})[state.planActive]; if(!c)return; c.weekStart+=dir*7*864e5; c.selDay=null; c.sel=null; const box=$id('planWeekBox'); if(box)box.innerHTML=planWeekHTML(); const b=$id('plan-book'); if(b)b.disabled=true; }
function planDayPick(el){ const c=(state.planCtx||{})[state.planActive]; const k=el.dataset.k; c.selDay=k; el.parentElement.querySelectorAll('.calday').forEach(d=>d.classList.remove('sel')); el.classList.add('sel'); const g=$id('planSlotGrid'); if(g)g.innerHTML=planSlotButtons(c.byDay[k]); c.sel=null; const b=$id('plan-book'); if(b)b.disabled=true; }
function pickPlanSlot(el){ const c=(state.planCtx||{})[state.planActive]; if(c)c.sel=Number(el.dataset.planSlot); const box=$id('planSlotGrid'); if(box)box.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel')); el.classList.add('sel'); const b=$id('plan-book'); if(b)b.disabled=false; }
function planMode(tid,online){ if(state.planCtx&&state.planCtx[tid])state.planCtx[tid].online=online; }
async function bookPlanSlot(taskId){
  const ctx=(state.planCtx||{})[taskId]; if(!ctx||!ctx.sel)return;
  if(ctx._booking) return; ctx._booking=true;   // dubbel-submit-guard: voorkomt 2 agenda-events bij snelle dubbelklik
  const btn=$id('plan-book'); if(btn){btn.disabled=true;btn.textContent='Inplannen…';}
  const start=ctx.sel,eind=ctx.sel+(ctx.dur||PLAN_DUR_MS); const iso=ms=>new Date(ms).toISOString();
  const p=(S27DATA.projects()||[]).find(x=>x.id===taskId)||{name:'Afspraak'};
  const cc=(state.data.bedrijf&&state.data.bedrijf.contact)||{};
  const clientNaam=((cc.voornaam||'')+' '+(cc.achternaam||'')).trim()||S27DATA.bedrijfsnaam();
  const attendees=[{email:cc.email||state.session.email||'',displayName:clientNaam}].concat((ctx.assignee_emails||[]).map(e=>({email:e}))).filter(a=>a.email);
  const box=$id('s27-plan-'+taskId);
  const done=()=>{ if(box)box.innerHTML='<div class="empty" style="padding:24px"><div class="em-ic">'+ic('st_approved',56)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">'+(ctx.shoot?'Shoot ingepland!':'Afspraak ingepland!')+'</b><p style="margin:6px 0 0">'+escapeHtml(new Date(start).toLocaleString('nl-BE',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))+' met '+escapeHtml(ctx.assignee||'Studio 27')+'.</p><p class="fs" style="color:var(--ink-4)">Je krijgt zo een agenda-uitnodiging'+(ctx.shoot?' (op locatie of bij Studio 27)':ctx.online?' met een Google Meet-link':' (fysiek bij Studio 27)')+'.</p></div>'; };
  if(state.demoMode){ done(); return; }
  try { await api(ENDPOINTS.inplannen,{task_id:taskId,list_id:ctx.list_id,start:iso(start),eind:iso(eind),start_ms:String(start),online:!!ctx.online,titel:(ctx.shoot?'Shoot, ':'Afspraak, ')+(p.name||'Studio 27'),beschrijving:'Ingepland via je Studio 27-portaal met '+(ctx.assignee||'het team')+'.',locatie:ctx.online?'':'Studio 27, Sint-Lenaartsesteenweg, Rijkevorsel',attendees:attendees,assignee_naam:ctx.assignee,client_email:cc.email||'',client_naam:clientNaam,bedrijf_id:state.session.bedrijf_id,session_token:state.session.session_token}); done(); }
  catch(e){ ctx._booking=false; if(btn){btn.disabled=false;btn.textContent='Bevestig afspraak';} }
}

/* ===== Shoot-inplannen wizard (1:1 port van studio27.be/shoot-inplannen, VOLLEDIG zonder Make) =====
   Stap 1: shootkalender (BE-feestdagen, werkdagen, host-beschikbaarheid: paars=vrij, geel=plek, oranje=volzet)
   + tijdslots (effectieve duur = ceil((timeHours/creators)*2)/2, 08-18u). Stap 2: detailform met optionele
   Google-Places-autocomplete. Submit -> ENDPOINTS.shootSubmit (description + custom fields op de taak). */
const SHOOT_HOSTS=[{id:36583476,name:'Bjorn'},{id:36583478,name:'Guus'},{id:82624365,name:'Viktor'},{id:54339680,name:'Ines'}];
const SHOOT_DOW=['Ma','Di','Wo','Do','Vr','Za','Zo'];
const SHOOT_MONTHS=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const SHOOT_MIN_WORKDAYS=3, SHOOT_WINDOW_DAYS=365;
// Publieke Google-Maps-JS-key (zelfde als studio27.be/shoot-inplannen; browser-key, bedoeld om publiek te zijn).
const SHOOT_PLACES_KEY='AIzaSyA-JNWrIbPwZFppYwBen645-t50A4Ocplo';
// Belgische feestdagen (Gauss-paasalgoritme, 7 vast + 3 variabel) - automatisch correct per jaar.
const SHOOT_HOLIDAYS=(function(){
  const easter=y=>{const a=y%19,b=y/100|0,c=y%100,d=b/4|0,e=b%4,f=(b+8)/25|0,g=(b-f+1)/3|0,h=(19*a+b-d-g+15)%30,i=c/4|0,k=c%4,L=(32+2*e+2*i-h-k)%7,m=(a+11*h+22*L)/451|0;return new Date(y,((h+L-7*m+114)/31|0)-1,((h+L-7*m+114)%31)+1);};
  const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const addD=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r;};
  const set=new Set(); const y0=new Date().getFullYear();
  for(let y=y0;y<=y0+2;y++){const e=easter(y);[y+'-01-01',y+'-05-01',y+'-07-21',y+'-08-15',y+'-11-01',y+'-11-11',y+'-12-25',ymd(addD(e,1)),ymd(addD(e,39)),ymd(addD(e,50))].forEach(s=>set.add(s));}
  return set;
})();
function shootYmd(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
function shootIsWeekend(date){const d=date.getDay();return d===0||d===6;}
function shootAddWorkingDays(date,n){const d=new Date(date);d.setHours(0,0,0,0);let a=0;while(a<n){d.setDate(d.getDate()+1);const w=d.getDay();if(w!==0&&w!==6)a++;}return d;}
function shootMinDate(){return shootAddWorkingDays(new Date(),SHOOT_MIN_WORKDAYS);}
function shootEffDur(ctx){const tot=ctx.timeHours||4,cr=ctx.aantalCreators||1;return Math.ceil((tot/cr)*2)/2;}
function shootDuurLabel(ctx){return shootEffDur(ctx)+' uur inclusief reistijd';}
function shootTeamLabel(ctx){const team=ctx.aantalCreators===1?'Cameraman':('Camerateam van '+ctx.aantalCreators+' creators');return team+', '+shootDuurLabel(ctx);}
function shootBusyHostIds(ctx,ds){const busy=new Set(),av=ctx.availability||{};
  (av.shoots||[]).forEach(s=>{if(s.dateStart===ds)(s.assignees||[]).forEach(a=>busy.add(Number(a)));});
  (av.shoots_27m||[]).forEach(s=>{if(s.dateStart===ds)(s.assignees||[]).forEach(a=>busy.add(Number(a)));});
  (av.vakantie||[]).forEach(v=>{if(v.dateStart&&ds>=v.dateStart&&ds<=(v.dateEnd||v.dateStart))(v.assignees||[]).forEach(a=>busy.add(Number(a)));});
  return busy;}
function shootFreeHosts(ctx,ds){const b=shootBusyHostIds(ctx,ds);return SHOOT_HOSTS.filter(h=>!b.has(Number(h.id)));}
function shootDayState(ctx,date){
  const today=new Date();today.setHours(0,0,0,0);
  const minD=shootMinDate(); const maxD=new Date(today);maxD.setDate(today.getDate()+SHOOT_WINDOW_DAYS);
  if(date<today||date<minD||date>maxD)return 'past';
  if(shootIsWeekend(date))return 'past';
  const ds=shootYmd(date);
  if(SHOOT_HOLIDAYS.has(ds))return 'full';
  const free=shootFreeHosts(ctx,ds).length;
  if(free>=ctx.aantalCreators)return free===SHOOT_HOSTS.length?'free':'partial';
  return 'full';
}
function shootSlotList(ctx){const dur=shootEffDur(ctx),out=[];for(let h=8;h+dur<=18;h+=0.5){const hh=Math.floor(h),mm=(h%1)*60;out.push(String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'));}return out;}
function shootFormatDate(ds){const d=new Date(ds);return d.getDate()+' '+SHOOT_MONTHS[d.getMonth()]+' '+d.getFullYear();}
function shootStepBar(active){return '<div class="shoot-steps">'+['Wanneer','Details'].map((s,i)=>{const cls=(i+1===active)?'active':((i+1<active)?'done':'');return '<span class="shoot-step '+cls+'"><b>'+(i+1)+'</b> '+s+'</span>';}).join('')+'</div>';}

async function openShootWizard(tid){
  const box=$id('s27-plan-'+tid); if(!box)return;
  if(state.demoMode){ box.innerHTML='<p class="fs" style="color:var(--ink-3)">In de demo is het inplannen van een shoot uitgeschakeld. In het echte portaal kies je hier een shootdag en vul je de locatie in.</p>'; return; }
  box.innerHTML='<div class="empty" style="padding:20px"><div class="brand-spinner" style="margin:0 auto 10px"></div>Shoot-planning ophalen…</div>';
  let res; try{ res=await api(ENDPOINTS.shootContext,{task_id:tid}); }catch(e){ res=null; }
  // status-bodies komen ook bij HTTP 403 (forbidden) terug -> lees op .status i.p.v. res.ok.
  const d=(res&&res.data&&res.data.status)?res.data:null;
  if(!d){ box.innerHTML='<p class="fs" style="color:var(--ink-3)">We krijgen geen verbinding met onze planning. Probeer het zo eens opnieuw of mail <a href="mailto:content@studio27.be">content@studio27.be</a>.</p>'; return; }
  if(d.status==='already_scheduled'){ box.innerHTML=shootScheduledHTML(d); return; }
  if(d.status!=='ok'){ box.innerHTML=shootInvalidHTML(d.status); return; }
  const cc=(state.data.bedrijf&&state.data.bedrijf.contact)||{};
  const now=new Date();
  state.shoot=state.shoot||{};
  state.shoot[tid]={taskId:tid,timeHours:Number(d.timeHours)||0,aantalCreators:Number(d.aantalCreators)||1,availability:d.availability||{shoots:[],shoots_27m:[],vakantie:[],hosts:SHOOT_HOSTS},viewMonth:now.getMonth(),viewYear:now.getFullYear(),selectedDate:null,selectedTime:null,coords:null,formatted:'',prefill:{voornaam:cc.voornaam||'',email:cc.email||(state.session&&state.session.email)||''}};
  shootDrawCal(tid);
}
function shootInvalidHTML(reason){
  let msg;
  if(reason==='wrong_type')msg='Deze taak is geen shoot, die kan dus niet via dit formulier worden ingepland.';
  else if(reason==='incomplete_metadata')msg='De shoot-info is bij ons nog niet volledig ingevuld. We bezorgen je zo snel mogelijk een correcte planning.';
  else if(reason==='forbidden')msg='Je hebt geen toegang tot deze taak.';
  else msg='Deze shoot kan momenteel niet ingepland worden. Neem even contact op met Studio 27.';
  return '<div class="shoot-note">'+escapeHtml(msg)+' Mail gerust naar <a href="mailto:content@studio27.be">content@studio27.be</a>.</div>';
}
function shootScheduledHTML(info){
  const datum=info.datum?shootFormatDate(info.datum):''; const rows=[];
  if(datum)rows.push('<div><b>Datum</b> '+escapeHtml(datum)+'</div>');
  if(info.startTime)rows.push('<div><b>Startuur</b> '+escapeHtml(info.startTime)+'</div>');
  if(info.endTime)rows.push('<div><b>Einduur</b> '+escapeHtml(info.endTime)+'</div>');
  if(info.locatie)rows.push('<div><b>Locatie</b> '+escapeHtml(info.locatie)+'</div>');
  const reis=(info.startTime||info.endTime)?'<div class="shoot-reis">↪ De uren zijn inclusief onze reistijd. Het startuur is wanneer we op locatie beginnen.</div>':'';
  return '<div class="shoot-note"><b style="font-family:var(--font-display);font-size:14px;color:var(--ink)">Deze shoot staat al ingepland</b><div class="shoot-summary" style="margin-top:10px">'+rows.join('')+reis+'</div><p class="fs" style="margin-top:10px;color:var(--ink-3)">Wijzigen of annuleren? Mail <a href="mailto:content@studio27.be">content@studio27.be</a>.</p></div>';
}
function shootCalHTML(tid){
  const ctx=(state.shoot||{})[tid]; if(!ctx)return '';
  const m=ctx.viewMonth,y=ctx.viewYear;
  const first=new Date(y,m,1); const startOffset=(first.getDay()+6)%7; const lastDay=new Date(y,m+1,0).getDate();
  const today=new Date();today.setHours(0,0,0,0); const maxD=new Date(today);maxD.setDate(today.getDate()+SHOOT_WINDOW_DAYS);
  let cells=''; SHOOT_DOW.forEach(d=>cells+='<div class="shoot-dow">'+d+'</div>');
  for(let i=0;i<startOffset;i++)cells+='<div class="shoot-day empty"></div>';
  for(let d=1;d<=lastDay;d++){const date=new Date(y,m,d);const st=shootDayState(ctx,date);const ds=shootYmd(date);const sel=(ctx.selectedDate===ds)?' sel':'';const click=(st==='free'||st==='partial');
    cells+='<div class="shoot-day '+st+sel+'" '+(click?('role="button" onclick="shootPickDay(\''+tid+'\',\''+ds+'\')"'):'')+'>'+d+'</div>';}
  const isCur=(y===today.getFullYear()&&m===today.getMonth()); const monthEnd=new Date(y,m+1,0); const isMax=(monthEnd>=maxD);
  return '<div class="shoot-cal">'
    +'<div class="shoot-cal-head"><button class="shoot-nav" '+(isCur?'disabled':'')+' onclick="shootNavMonth(\''+tid+'\',-1)">‹</button>'
    +'<div class="shoot-cal-month">'+SHOOT_MONTHS[m]+' '+y+'</div>'
    +'<button class="shoot-nav" '+(isMax?'disabled':'')+' onclick="shootNavMonth(\''+tid+'\',1)">›</button></div>'
    +'<div class="shoot-grid">'+cells+'</div>'
    +'<div class="shoot-legend"><span><i class="sl-free"></i> Volledig vrij</span><span><i class="sl-part"></i> Nog plek</span><span><i class="sl-full"></i> Volzet</span></div>'
    +'</div>';
}
function shootSlotsHTML(tid){
  const ctx=(state.shoot||{})[tid]; if(!ctx||!ctx.selectedDate)return '';
  const slots=shootSlotList(ctx);
  if(!slots.length)return '<div class="shoot-slotcard"><span class="fs" style="color:var(--ink-4)">Voor de duur van deze shoot is er geen passend startuur binnen een werkdag. Mail content@studio27.be.</span></div>';
  return '<div class="shoot-slotcard"><label class="ms-label">Welk startuur past?</label><div class="shoot-slots">'
    +slots.map(s=>'<button class="shoot-slot'+(ctx.selectedTime===s?' sel':'')+'" data-time="'+s+'" onclick="shootPickSlot(\''+tid+'\',\''+s+'\')">'+s+'</button>').join('')+'</div></div>';
}
function shootDrawCal(tid){
  const box=$id('s27-plan-'+tid); const ctx=(state.shoot||{})[tid]; if(!box||!ctx)return;
  box.innerHTML='<div class="shoot-wiz">'+shootStepBar(1)
    +'<p class="shoot-intro">Paarse dagen = team volledig vrij · gele = nog plek. Boekingen tot een jaar vooruit, ten vroegste over 3 werkdagen.<br>Je plant in: <b>'+escapeHtml(shootTeamLabel(ctx))+'</b>.</p>'
    +'<div id="shoot-cal-'+tid+'">'+shootCalHTML(tid)+'</div>'
    +'<div id="shoot-slots-'+tid+'">'+(ctx.selectedDate?shootSlotsHTML(tid):'')+'</div>'
    +'<div class="shoot-actions"><button class="btn btn-branch br-blue btn-sm" id="shoot-next-'+tid+'" '+((ctx.selectedDate&&ctx.selectedTime)?'':'disabled')+' onclick="shootGoDetails(\''+tid+'\')">Verder →</button></div>'
    +'</div>';
}
function shootNavMonth(tid,dir){
  const ctx=(state.shoot||{})[tid]; if(!ctx)return;
  if(dir<0){if(ctx.viewMonth===0){ctx.viewMonth=11;ctx.viewYear--;}else ctx.viewMonth--;}
  else{if(ctx.viewMonth===11){ctx.viewMonth=0;ctx.viewYear++;}else ctx.viewMonth++;}
  const el=$id('shoot-cal-'+tid); if(el)el.innerHTML=shootCalHTML(tid);   // enkel de kalender hertekenen -> scherm verspringt niet
}
function shootPickDay(tid,ds){
  const ctx=(state.shoot||{})[tid]; if(!ctx)return;
  ctx.selectedDate=ds; ctx.selectedTime=null;
  const c=$id('shoot-cal-'+tid); if(c)c.innerHTML=shootCalHTML(tid);
  const s=$id('shoot-slots-'+tid); if(s)s.innerHTML=shootSlotsHTML(tid);
  const n=$id('shoot-next-'+tid); if(n)n.disabled=true;
}
function shootPickSlot(tid,s){
  const ctx=(state.shoot||{})[tid]; if(!ctx)return;
  ctx.selectedTime=s;
  const box=$id('shoot-slots-'+tid); if(box)box.querySelectorAll('.shoot-slot').forEach(b=>b.classList.toggle('sel',b.dataset.time===s));
  const n=$id('shoot-next-'+tid); if(n)n.disabled=!(ctx.selectedDate&&ctx.selectedTime);
}
function shootClearCoords(tid){const ctx=(state.shoot||{})[tid]; if(ctx){ctx.coords=null;ctx.formatted='';}}
function shootGoDetails(tid){
  const box=$id('s27-plan-'+tid); const ctx=(state.shoot||{})[tid]; if(!box||!ctx)return;
  if(!ctx.selectedDate||!ctx.selectedTime)return;
  const pf=ctx.prefill||{};
  box.innerHTML='<div class="shoot-wiz">'+shootStepBar(2)
    +'<div class="shoot-summary"><div><b>Datum</b> '+escapeHtml(shootFormatDate(ctx.selectedDate))+'</div><div><b>Startuur</b> '+escapeHtml(ctx.selectedTime)+'</div><div><b>Duur</b> '+escapeHtml(shootDuurLabel(ctx))+'</div><div><b>Creators</b> '+ctx.aantalCreators+'</div><div class="shoot-reis">↪ De duur is inclusief onze reistijd vanuit Studio 27. Het uur dat je kiest is wanneer we op locatie beginnen shooten.</div></div>'
    +'<div class="shoot-form">'
      +'<div class="shoot-row"><div class="shoot-field"><label>Voornaam *</label><input type="text" id="shoot-voornaam-'+tid+'" value="'+escapeHtml(pf.voornaam||'')+'" placeholder="Jouw voornaam"></div><div class="shoot-field"><label>E-mailadres *</label><input type="email" id="shoot-email-'+tid+'" value="'+escapeHtml(pf.email||'')+'" placeholder="jij@merk.be"></div></div>'
      +'<label class="ms-label" style="margin-top:14px">Startlocatie van de shoot *</label>'
      +'<div class="shoot-acwrap" id="shoot-acwrap-'+tid+'"></div>'
      +'<div class="shoot-row-loc"><input type="text" id="shoot-straat-'+tid+'" placeholder="Straat + nummer" autocomplete="off" oninput="shootClearCoords(\''+tid+'\')"><input type="text" id="shoot-postcode-'+tid+'" placeholder="Postcode" maxlength="4" autocomplete="off" oninput="shootClearCoords(\''+tid+'\')"><input type="text" id="shoot-gemeente-'+tid+'" placeholder="Gemeente" autocomplete="off" oninput="shootClearCoords(\''+tid+'\')"></div>'
      +'<div class="shoot-row"><div class="shoot-field"><label>Contactpersoon op locatie (indien anders dan jij)</label><input type="text" id="shoot-cnaam-'+tid+'" placeholder="Naam"></div><div class="shoot-field"><label>GSM contactpersoon</label><input type="text" id="shoot-cgsm-'+tid+'" placeholder="04XX XX XX XX"></div></div>'
      +'<div class="shoot-field"><label>Extra info of briefing (optioneel)</label><textarea id="shoot-extra-'+tid+'" placeholder="Bijzonderheden, parkeer-info, briefing, eventuele extra locaties…"></textarea></div>'
      +'<div class="shoot-msg" id="shoot-msg-'+tid+'"></div>'
    +'</div>'
    +'<div class="shoot-actions"><button class="btn btn-ghost btn-sm" onclick="shootBack(\''+tid+'\')">← Terug</button><button class="btn btn-branch br-blue btn-sm" id="shoot-book-'+tid+'" onclick="shootSubmitBooking(\''+tid+'\')">Shoot inplannen</button></div>'
    +'</div>';
  shootInitAutocomplete(tid);
}
function shootBack(tid){ shootDrawCal(tid); }
function shootToast(tid,msg){const el=$id('shoot-msg-'+tid); if(el){el.textContent=msg;el.style.display='block';} else { alert(msg); }}
async function shootSubmitBooking(tid){
  const ctx=(state.shoot||{})[tid]; if(!ctx)return;
  const val=id=>{const el=$id(id);return el?el.value.trim():'';};
  const voornaam=val('shoot-voornaam-'+tid),email=val('shoot-email-'+tid),straat=val('shoot-straat-'+tid),postcode=val('shoot-postcode-'+tid),gemeente=val('shoot-gemeente-'+tid);
  if(!voornaam||!email||!straat||!postcode||!gemeente){ shootToast(tid,'Vul minstens je voornaam, e-mail en de startlocatie (straat, postcode, gemeente) in.'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ shootToast(tid,'Vul een geldig e-mailadres in.'); return; }
  if(!/^[1-9][0-9]{3}$/.test(postcode)){ shootToast(tid,'Postcode moet 4 cijfers zijn (bv. 2310).'); return; }
  if(ctx._booking)return; ctx._booking=true;
  const btn=$id('shoot-book-'+tid); if(btn){btn.disabled=true;btn.textContent='Even versturen…';}
  const locatieFormatted=straat+', '+postcode+' '+gemeente+', België';
  const payload={task_id:tid,datum:ctx.selectedDate,datumLeesbaar:shootFormatDate(ctx.selectedDate),startuur:ctx.selectedTime,duur:shootDuurLabel(ctx),timeHours:ctx.timeHours,aantalPersonen:ctx.aantalCreators,klantVoornaam:voornaam,klantEmail:email,locatie:locatieFormatted,locatieStraat:straat,locatiePostcode:postcode,locatieGemeente:gemeente,contactNaam:val('shoot-cnaam-'+tid),contactGsm:val('shoot-cgsm-'+tid),extraInfo:val('shoot-extra-'+tid)};
  if(ctx.coords){ payload.lat=ctx.coords.lat; payload.lng=ctx.coords.lng; if(ctx.formatted)payload.locatie=ctx.formatted; }
  let res; try{ res=await api(ENDPOINTS.shootSubmit,payload); }catch(e){ res=null; }
  const data=res&&res.ok&&res.data?res.data:null;
  if(data&&(data.ok||data.already_booked)){ const box=$id('s27-plan-'+tid); if(box)box.innerHTML=shootSuccessHTML(!!data.already_booked); }
  else { ctx._booking=false; if(btn){btn.disabled=false;btn.textContent='Shoot inplannen';} shootToast(tid,'Er ging iets mis bij het inplannen. Probeer opnieuw of mail content@studio27.be.'); }
}
function shootSuccessHTML(already){
  const t=already?'Deze shoot was net al ingepland':'Jullie shoot staat in de planning!';
  const p=already?'Geen zorgen, er is niets dubbel geboekt.':'We kijken alles even na en bevestigen ze snel per mail. Tot binnenkort, wij staan al klaar met de camera’s.';
  return '<div class="empty" style="padding:24px"><div class="em-ic">'+ic('st_approved',56)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">'+t+'</b><p style="margin:6px 0 0">'+escapeHtml(p)+'</p></div>';
}
/* Google Places (NEW API) lazy-loader + adres-autocomplete. Optioneel: faalt het laden,
   dan blijven de manuele velden (straat/postcode/gemeente) werken en geocodet de worker server-side. */
let _shootPlaces=null,_shootPlacesLoading=null;
function shootLoadPlaces(){
  if(_shootPlaces)return Promise.resolve(_shootPlaces);
  if(_shootPlacesLoading)return _shootPlacesLoading;
  _shootPlacesLoading=new Promise((resolve,reject)=>{
    try{
      (g=>{var h,a,k,p="Google Maps",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await(a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src="https://maps."+c+"apis.com/maps/api/js?"+e;d[q]=f;a.onerror=()=>h=n(Error(p));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?0:d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n));})({key:SHOOT_PLACES_KEY,v:"weekly"});
      google.maps.importLibrary("places").then(pl=>{_shootPlaces=pl;resolve(pl);}).catch(reject);
    }catch(e){ reject(e); }
  });
  return _shootPlacesLoading;
}
async function shootInitAutocomplete(tid){
  try{
    const places=await shootLoadPlaces();
    const wrap=$id('shoot-acwrap-'+tid);
    if(!wrap||!places||!places.PlaceAutocompleteElement)return;
    wrap.innerHTML='';
    const el=new places.PlaceAutocompleteElement({includedRegionCodes:['be','nl','lu','fr','de'],types:['address']});
    el.setAttribute('placeholder','Zoek je adres (begin te typen)…'); el.className='shoot-ac';
    wrap.appendChild(el);
    el.addEventListener('gmp-select',async(ev)=>{
      try{
        const place=ev.placePrediction.toPlace();
        await place.fetchFields({fields:['addressComponents','formattedAddress','location']});
        let route='',num='',pc='',gem='';
        (place.addressComponents||[]).forEach(c=>{const t=c.types||[];if(t.includes('route'))route=c.longText||'';if(t.includes('street_number'))num=c.longText||'';if(t.includes('postal_code'))pc=c.longText||'';if(t.includes('locality')||t.includes('postal_town'))gem=c.longText||'';});
        const full=num?(route+' '+num):route;
        const ctx=(state.shoot||{})[tid];
        if(ctx){ try{ ctx.coords={lat:place.location.lat(),lng:place.location.lng()}; ctx.formatted=place.formattedAddress||''; }catch(_){} }
        if(full&&$id('shoot-straat-'+tid))$id('shoot-straat-'+tid).value=full;
        if(pc&&$id('shoot-postcode-'+tid))$id('shoot-postcode-'+tid).value=pc;
        if(gem&&$id('shoot-gemeente-'+tid))$id('shoot-gemeente-'+tid).value=gem;
      }catch(_){}
    });
  }catch(e){ /* autocomplete optioneel */ }
}

function toggleBot(){ const p=$id('botPanel'),f=$id('botFab'); const open=p.classList.toggle('show'); f.style.display=open?'none':'flex'; if(open){ const g=$id('botGreet'); if(g){ var nm=(typeof _greetNaam==='function'?_greetNaam():'')||''; g.innerHTML='Hallo '+escapeHtml(nm||'daar')+'! Ik help je graag op weg. Waarmee kan ik je verder helpen?'; } const inp=p.querySelector('.bot-input input'); if(inp)setTimeout(()=>inp.focus(),50); } }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if($id('tourScrim')&&$id('tourScrim').classList.contains('show'))endTour(false); else if(state.viewMode==='project')goTab('projecten'); } });

/* ---------- Onboarding tour (1x + opt-out) ---------- */
const TOUR=[
  {t:'Jouw startscherm',b:'Hier vind je altijd wat er voor jóu klaarstaat, reviews, feedback en meetings. Begin hier elke dag.',target:'.sb-item[data-tab="start"]'},
  {t:'Al je werk, gebundeld',b:'In de zijbalk staat alles altijd zichtbaar: je projecten, socials én advertenties.',target:'.sb-item[data-tab="projecten"]'},
  {t:'Altijd in contact',b:'Vragen? Onze slimme assistent helpt je meteen op weg en schakelt zo nodig door naar een echt mens.',target:'#botFab'},
  {t:'Plan vlot een moment',b:'Een meeting nodig? Prik zelf een vrij tijdslot. Wij staan klaar, vrijblijvend.',target:'.sb-item[data-tab="meetings"]'},
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
