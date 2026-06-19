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
const SECTION_LABEL = { start:'Home', berichten:'Berichten', strategie:'Strategie', branding:'Branding', video:'Video- en fotografie', socials:'Socials', advertenties:'Adverteren', webprestaties:'Website', 'alle-projecten':'Alle projecten', meetings:'Meetings', nieuwproject:'Nieuw project', offertes:'Offertes', facturatie:'Facturatie', instellingen:'Instellingen' };

function qsp(){ return new URLSearchParams(location.search); }
function $id(x){ return document.getElementById(x); }

/* =============================================================================
   DEEP-LINK ROUTER v2 — élke toestand krijgt een unieke, deelbare hash-URL.

   Schema (hash-based, zodat refresh/OAuth/PWA-SW nooit breken; het bedrijf zit in
   ELKE link zodat een collega of klant-met-toegang 'm 1-op-1 opent):

     #/b/<bedrijf>/home
     #/b/<bedrijf>/socials/statistieken?periode=30d&vgl=previous
     #/b/<bedrijf>/socials/planner?maand=2026-06&filter=feedback
     #/b/<bedrijf>/socials/post/<postId>
     #/b/<bedrijf>/adverteren/<meta|google>/<overzicht|campagnes|zoektermen|aanbevelingen|meeting>?periode=30d
     #/b/<bedrijf>/adverteren/<meta|google>/campagne/<cid>?periode=30d
     #/b/<bedrijf>/website/<projecten|statistieken>?periode=30d
     #/b/<bedrijf>/projecten | /meetings | /offertes | /facturatie | /instellingen | /huisstijl | /contact
     #/b/<bedrijf>/project/<taakId>[/chat | /onderdeel/<subId> | /review/<key>?ronde=N | /galerij[/<idx>] | /inplannen/<subId>]
     #/b/<bedrijf>/offerte-aanvraag/<tak> | /offertes/wizard/<tak>?stap=N
     #/b/<bedrijf>/meeting/plannen?mode=&project=&host=

   Een route is één plat object {bedrijf, as, view, tab, project, sub, ...}. parseRoute()
   leest 'm uit de URL (nieuw schema + alle oude links), currentRoute() bouwt 'm uit de
   live state, buildHash() serialiseert, applyRouteObj() navigeert ernaartoe.
   ============================================================================= */

// tab-key (intern) <-> URL-slug (leesbaar)
const TAB_SLUG = { start:'home', 'alle-projecten':'projecten', advertenties:'adverteren', webprestaties:'website' };
const SLUG_TAB = {}; Object.keys(TAB_SLUG).forEach(function(k){ SLUG_TAB[TAB_SLUG[k]] = k; });
function tabToSlug(t){ return TAB_SLUG[t] || t; }
function slugToTab(s){ return SLUG_TAB[s] || s; }
// socials sub-tab: mode-onafhankelijke slug (planner | statistieken | inzichten) <-> intern _socTab
const SOC_SLUG = { planner:'planner', rapport:'statistieken', analyse:'statistieken', aanbevelingen:'inzichten', inzichten:'inzichten' };
function socTabToSlug(t){ return SOC_SLUG[t] || 'planner'; }
function socSlugToTab(s){ var rich=(typeof isRichView==='function'&&isRichView()); if(s==='statistieken') return rich?'rapport':'analyse'; if(s==='inzichten') return rich?'aanbevelingen':'inzichten'; return 'planner'; }
// ads sub-tab: leesbare slug <-> intern _adsTab
const ADS_SLUG = { samengevat:'overzicht', campagnes:'campagnes', gegevens:'zoektermen', aanbevelingen:'aanbevelingen', meeting:'meeting' };
const ADS_SLUG_REV = {}; Object.keys(ADS_SLUG).forEach(function(k){ ADS_SLUG_REV[ADS_SLUG[k]] = k; });
function adsTabToSlug(t){ return ADS_SLUG[t] || 'overzicht'; }
function adsSlugToTab(s){ return ADS_SLUG_REV[s] || 'samengevat'; }
// website sub-tab + periode-enum
function webTabToSlug(t){ return t==='stats' ? 'statistieken' : 'projecten'; }
function webSlugToTab(s){ return s==='statistieken' ? 'stats' : 'projecten'; }
function webPerToParam(p){ return ({today:'today',last_7d:'7d',last_30d:'30d',last_90d:'90d'})[p||'last_30d'] || '30d'; }
function webParamToPer(s){ return ({today:'today','7d':'last_7d','30d':'last_30d','90d':'last_90d'})[s] || 'last_30d'; }

// periode {preset,from,to} -> één URL-token; custom = 'YYYY-MM-DD_YYYY-MM-DD'
function perToParam(pp){ if(!pp) return ''; if(pp.preset && pp.preset!=='custom') return pp.preset; var f=String(pp.from||'').slice(0,10), t=String(pp.to||'').slice(0,10); return (f&&t)?(f+'_'+t):''; }
function paramToPer(s){ s=String(s||''); if(!s) return null; if(s.indexOf('_')>0){ var p=s.split('_'); return {preset:'custom',from:p[0],to:p[1]}; } return {preset:s}; }
// rolling presets opnieuw uitrekenen tot een {preset,compare,from,to}-venster bij apply
function _expandSocPeriod(s,vgl){ var p=paramToPer(s); if(!p) return null; if(p.preset==='custom') return {preset:'custom',compare:vgl||'none',from:(p.from+'T00:00:00'),to:(p.to+'T23:59:59')}; var w=(typeof socialPeriodWindow==='function')?socialPeriodWindow(p.preset):null; return {preset:p.preset,compare:vgl||'none',from:(w?w.from:''),to:(w?w.to:'')}; }
function _expandAdsPeriod(s,vgl){ var p=paramToPer(s); if(!p) return null; if(p.preset==='custom') return {preset:'custom',compare:vgl||'none',from:p.from,to:p.to}; var w=(typeof adsPeriodWindow==='function')?adsPeriodWindow(p.preset):null; return {preset:p.preset,compare:vgl||'none',from:(w?w.from:''),to:(w?w.to:'')}; }

// ---- URL -> route -------------------------------------------------------------
function parseRoute(){
  const q = qsp();
  // 1) nieuw hash-schema
  const r = _parseHash(location.hash);
  if(r) return r;
  // 2) oude query-links (?p ?c ?n ?go ?tab ?klant) — blijven werken
  if(q.get('p')) return { view:'project', project:q.get('p'), sub:(q.get('tab')==='chat'?'chat':''), bedrijf:q.get('klant')||'' };
  if(q.get('c')) return { view:'project', project:q.get('c'), sub:'chat', bedrijf:q.get('klant')||'' };
  if(q.get('go')){ var t=q.get('go'); if(t==='projecten') t='start'; return { view:'tab', tab:t, bedrijf:q.get('klant')||'' }; }
  if(q.get('n')) return { view:'tab', tab:'start', notif:true, bedrijf:q.get('klant')||'' };
  if(q.get('klant')) return { view:'tab', tab:'start', bedrijf:q.get('klant') };
  return null;
}
function _parseHash(hash){
  var raw = String(hash||'').replace(/^#\/?/, '');
  if(!raw) return null;
  var parts = raw.split('?'); var seg = parts[0].split('/').filter(Boolean).map(decodeURIComponent);
  if(!seg.length) return null;
  var hq = new URLSearchParams(parts[1]||'');
  var r = {};
  if(seg[0]==='b' && seg[1]){ r.bedrijf = seg[1]; seg = seg.slice(2); }
  if(hq.get('as')==='klant') r.as='klant';
  if(!seg.length){ r.view='tab'; r.tab='start'; return r; }
  var head = seg[0];
  // ---- LEGACY hash-vormen (#/project/<id>, #/chat/<id>, #/<tab>) ----
  if(head==='chat' && seg[1] && !r.bedrijf){ r.view='project'; r.project=seg[1]; r.sub='chat'; return r; }
  // ---- nieuw schema ----
  if(head==='project' && seg[1]){
    r.view='project'; r.project=seg[1]; r.sub=seg[2] || (hq.get('tab')==='chat'?'chat':'');   // legacy #/project/<id>?tab=chat
    if(r.sub==='onderdeel') r.onderdeel=seg[3]||'';
    else if(r.sub==='review'){ r.review=seg[3]||''; r.ronde=hq.get('ronde')||''; }
    else if(r.sub==='galerij'){ r.galIdx=seg[3]||''; }
    else if(r.sub==='inplannen'){ r.shoot=seg[3]||''; }
    return r;
  }
  if(head==='socials'){ r.view='tab'; r.tab='socials'; r.soc={};
    if(seg[1]==='post'){ r.soc.post=seg[2]||''; }
    else if(seg[1]) r.soc.tab=seg[1];
    r.soc.per=hq.get('periode')||''; r.soc.vgl=hq.get('vgl')||''; r.soc.maand=hq.get('maand')||''; r.soc.filter=hq.get('filter')||''; r.soc.inz=hq.get('inz')||'';
    return r; }
  if(head==='adverteren'){ r.view='tab'; r.tab='advertenties'; r.ads={ platform:(seg[1]||'meta') };
    if(seg[2]==='campagne'){ r.ads.campagne=seg[3]||''; }
    else if(seg[2]) r.ads.tab=seg[2];
    r.ads.per=hq.get('periode')||''; r.ads.vgl=hq.get('vgl')||'';
    return r; }
  if(head==='website'){ r.view='tab'; r.tab='webprestaties'; r.web={ tab:seg[1]||'', per:hq.get('periode')||'' }; return r; }
  if(head==='meeting' && seg[1]==='plannen'){ r.view='meetingplan'; r.meeting={ mode:hq.get('mode')||'algemeen', project:hq.get('project')||'', host:hq.get('host')||'' }; return r; }
  if(head==='offerte-aanvraag'){ r.view='offerte-aanvraag'; r.offerteTak=seg[1]||'website'; return r; }
  if(head==='offertes' && seg[1]==='wizard'){ r.view='offerte-wizard'; r.offerteTak=seg[2]||'strategie'; r.offerteStap=hq.get('stap')||''; return r; }
  if(head==='contact'){ r.view='contact'; return r; }
  // gewone tab via slug (home/projecten/meetings/strategie/...)
  r.view='tab'; r.tab=slugToTab(head); if(r.tab==='projecten') r.tab='start';
  return r;
}

// ---- live state -> route ------------------------------------------------------
function currentRoute(){
  var r = { bedrijf: state.activeBedrijf || '' };
  if(state.adminMode && state._adminClientView) r.as='klant';
  var vm = state.viewMode;
  if(vm==='project' && state.activeProject){
    r.view='project'; r.project=state.activeProject;
    if(state._mtab==='chat') r.sub='chat';
  } else if(vm==='galerij' && state._gal){
    r.view='project'; r.project=state._galFrom || state._gal.taskId || ''; r.sub='galerij'; if(state._gal.idx>0) r.galIdx=String(state._gal.idx);
  } else if(vm==='shootplan'){
    r.view='project'; r.project=state._shootFrom || ''; r.sub='inplannen'; r.shoot=state._shootTid || '';
  } else if(vm==='contact'){
    r.view='contact';
  } else {
    r.view='tab'; r.tab=currentTab || 'start';
    if(currentTab==='socials'){
      r.soc={};
      if(state._socialDetail){ r.soc.post=String(state._socialDetail); }
      else { r.soc.tab=socTabToSlug(typeof socialTab==='function'?socialTab():(state._socTab||'planner'));
        if(r.soc.tab==='statistieken'){ r.soc.per=perToParam(state._socPeriod); if(state._socPeriod&&state._socPeriod.compare&&state._socPeriod.compare!=='none') r.soc.vgl=state._socPeriod.compare; }
        else if(r.soc.tab==='planner'){ if(state._socialMonth) r.soc.maand=state._socialMonth.y+'-'+('0'+(state._socialMonth.m+1)).slice(-2); if(state._socialFilter&&state._socialFilter!=='alles') r.soc.filter=state._socialFilter; }
        else if(r.soc.tab==='inzichten'){ if(state._socInzTab&&state._socInzTab!=='momenten') r.soc.inz=state._socInzTab; }
      }
    } else if(currentTab==='advertenties'){
      r.ads={ platform:(state._adsPlatform||'meta'), tab:adsTabToSlug(state._adsTab||'samengevat') };
      if(state._metaCampOpen) r.ads.campagne=String(state._metaCampOpen);
      r.ads.per=perToParam(state._adsPeriod); if(state._adsPeriod&&state._adsPeriod.compare&&state._adsPeriod.compare!=='none') r.ads.vgl=state._adsPeriod.compare;
    } else if(currentTab==='webprestaties'){
      r.web={ tab:webTabToSlug(typeof webTakTab==='function'?webTakTab():(state._webTakTab||'projecten')), per:webPerToParam(state._webPeriod) };
    }
  }
  return r;
}

// ---- route -> hash-string -----------------------------------------------------
function buildHash(r){
  if(!r) return '#/';
  var segs = [];
  if(r.bedrijf){ segs.push('b', r.bedrijf); }
  var q = [];
  var addq = function(k,v){ if(v) q.push(k+'='+encodeURIComponent(v)); };
  if(r.as==='klant') addq('as','klant');
  if(r.view==='project' && r.project){
    segs.push('project', r.project);
    if(r.sub==='chat') segs.push('chat');
    else if(r.sub==='onderdeel'){ segs.push('onderdeel'); if(r.onderdeel) segs.push(r.onderdeel); }
    else if(r.sub==='review'){ segs.push('review'); if(r.review) segs.push(r.review); addq('ronde', r.ronde); }
    else if(r.sub==='galerij'){ segs.push('galerij'); if(r.galIdx) segs.push(String(r.galIdx)); }
    else if(r.sub==='inplannen'){ segs.push('inplannen'); if(r.shoot) segs.push(r.shoot); }
  } else if(r.view==='contact'){ segs.push('contact');
  } else if(r.view==='meetingplan'){ segs.push('meeting','plannen'); var m=r.meeting||{}; if(m.mode&&m.mode!=='algemeen') addq('mode',m.mode); addq('project',m.project); addq('host',m.host);
  } else if(r.view==='offerte-aanvraag'){ segs.push('offerte-aanvraag', r.offerteTak||'website');
  } else if(r.view==='offerte-wizard'){ segs.push('offertes','wizard', r.offerteTak||'strategie'); addq('stap', r.offerteStap);
  } else { // tab
    var tab=r.tab||'start';
    if(tab==='socials'){ var s=r.soc||{};
      if(s.post){ segs.push('socials','post', s.post); }
      else { segs.push('socials', s.tab||'planner'); addq('periode',s.per); addq('vgl',s.vgl); addq('maand',s.maand); addq('filter',s.filter); addq('inz',s.inz); }
    } else if(tab==='advertenties'){ var a=r.ads||{}; segs.push('adverteren', a.platform||'meta');
      if(a.campagne){ segs.push('campagne', a.campagne); } else { segs.push(a.tab||'overzicht'); }
      addq('periode',a.per); addq('vgl',a.vgl);
    } else if(tab==='webprestaties'){ var w=r.web||{}; segs.push('website', w.tab||'projecten'); addq('periode', (w.per&&w.per!=='30d')?w.per:'');
    } else { segs.push(tabToSlug(tab)); }
  }
  return '#/' + segs.map(encodeURIComponent).join('/') + (q.length?('?'+q.join('&')):'');
}

// alleen boot-vlaggen (?demo / ?auth) in de query houden; al de rest leeft in de hash
function _keepQuery(){ var keep=[]; var q=qsp(); ['demo','auth'].forEach(function(k){ var v=q.get(k); if(v!=null) keep.push(k+'='+encodeURIComponent(v)); }); return keep.length?('?'+keep.join('&')):''; }

// URL bijwerken bij navigatie (deelbare links), zonder reload. push=true duwt een echte
// history-entry zodat de browser-terugknop binnen de SPA terugkeert i.p.v. het portaal te verlaten.
function syncUrl(push){
  if(state.demoMode || state._routingSilent) return;
  try{
    var r = currentRoute();
    var url = location.pathname + _keepQuery() + buildHash(r);
    if(push) history.pushState(r, '', url); else history.replaceState(r, '', url);
  }catch(e){}
}
// Browser-terugknop: het history.state-object IS de volledige route → reproduceer 'm.
function onPopState(ev){
  if(state.demoMode) return;
  var st = (ev && ev.state) || parseRoute();
  applyRouteObj(st, { fromPop:true }).catch(function(){ try{ goTab('start'); }catch(_e){} });
}

async function applyRoute(){
  var r = state.route; state.route = null;
  // Magic-link/login-redirect: als de URL geen route meer draagt (e-maillogin wiste 'm), haal de
  // bewaarde bestemming uit localStorage (gezet in init vóór login). Eenmalig + 15 min geldig.
  try{
    var raw = localStorage.getItem('s27_pending_route');
    if(raw){ localStorage.removeItem('s27_pending_route');
      if(!r){ var p = JSON.parse(raw); if(p && p.hash && (Date.now()-(p.t||0)) < 15*60*1000) r = _parseHash(p.hash); }
    }
  }catch(e){}
  return applyRouteObj(r, {});
}

// Centrale navigator: brengt het portaal naar exact de toestand die de route beschrijft.
// silent=true onderdrukt tussentijdse syncUrl-schrijfacties; bij boot canonicaliseren we
// achteraf met één replace, bij popstate staat de URL al goed (geen extra schrijf).
async function applyRouteObj(r, opts){
  opts = opts || {};
  if(!r){ goTab('start'); return; }
  state._routingSilent = true;
  try{
    // staff-clientview meeschalen zodat de gedeelde weergave 1-op-1 klopt
    if(r.as==='klant' && state.adminMode && !state._adminClientView){ state._adminClientView=true; try{ updateAdminViewToggle(); applyTakVisibility(); }catch(e){} }
    if(r.view==='project' && r.project){
      await openProject(r.project, 'auto', true);
      if(r.sub==='chat') switchModalTab('chat');
      else if(r.sub==='onderdeel' && r.onderdeel) _routeOpenOnderdeel(r.onderdeel);
      else if(r.sub==='review' && r.review) _routeOpenReview(r.project, r.review, r.ronde);
      else if(r.sub==='galerij') _routeOpenGalerij(r.project, r.galIdx);
      else if(r.sub==='inplannen' && r.shoot){ try{ openShootOverlay(r.shoot); }catch(e){} }
    } else if(r.view==='contact'){
      try{ if(typeof goContact==='function') goContact(); else goTab('start'); }catch(e){ goTab('start'); }
    } else if(r.view==='meetingplan'){
      await goTab('meetings'); try{ openMeetingPlanner((r.meeting&&r.meeting.mode)||'algemeen'); if(r.meeting&&r.meeting.project&&typeof mpPickProject==='function') mpPickProject(r.meeting.project); }catch(e){}
    } else if(r.view==='offerte-aanvraag'){
      try{ openOfferteAanvraag(r.offerteTak||'website'); }catch(e){ goTab('start'); }
    } else if(r.view==='offerte-wizard'){
      try{ openOfferteWizard(r.offerteTak||'strategie'); }catch(e){ goTab('start'); }
    } else {
      var tab = r.tab || 'start'; if(tab==='projecten') tab='start';
      if(!PANELS[tab]) tab='start';
      // sub-state vóór goTab zetten zodat data-load + render meteen het juiste venster/tab pakken
      if(tab==='socials') _routeApplySoc(r.soc);
      else if(tab==='advertenties') _routeApplyAds(r.ads);
      else if(tab==='webprestaties') _routeApplyWeb(r.web);
      await goTab(tab);
      if(tab==='advertenties' && r.ads && r.ads.campagne) _routeScrollCampaign(r.ads.campagne);
      if(r.notif){ var np=$id('notifPanel'); if(np) setTimeout(function(){ np.classList.add('show'); }, 350); }
    }
  } catch(e){ try{ goTab('start'); }catch(_e){} }
  state._routingSilent = false;
  if(!opts.fromPop) syncUrl(false);   // boot: URL canonicaliseren (replace); popstate: URL staat al goed
}

// --- sub-state appliers (zetten state vóór de render; geen eigen syncUrl) -------
function _routeApplySoc(s){ if(!s) return;
  if(s.post){ state._socTab='planner'; state._socialDetail=String(s.post); return; }
  if(s.tab) state._socTab=socSlugToTab(s.tab); state._socialDetail=null;
  if(s.inz) state._socInzTab=s.inz;
  if(s.filter) state._socialFilter=s.filter;
  if(s.maand){ var p=String(s.maand).split('-'); if(p.length===2) state._socialMonth={ y:+p[0], m:(+p[1]-1) }; }
  if(s.per){ var pp=_expandSocPeriod(s.per, s.vgl); if(pp) state._socPeriod=pp; }
}
function _routeApplyAds(a){ if(!a) return;
  state._adsPlatform = (a.platform==='google')?'google':'meta';
  if(a.tab) state._adsTab = adsSlugToTab(a.tab);
  if(a.per){ var pp=_expandAdsPeriod(a.per, a.vgl); if(pp) state._adsPeriod=pp; }
}
function _routeApplyWeb(w){ if(!w) return; if(w.tab) state._webTakTab=webSlugToTab(w.tab); if(w.per) state._webPeriod=webParamToPer(w.per); }

// --- in-project deep-opens (best-effort; falen mag de navigatie nooit breken) --
function _routeOpenOnderdeel(subId){ try{ var row=document.querySelector('[data-task="'+(window.CSS&&CSS.escape?CSS.escape(subId):subId)+'"]'); if(!row) return; var acc=row.closest('.acc')||row; var btn=acc.querySelector?acc.querySelector('.acc-head, .acc-btn, button'):null; if(btn && acc.querySelector && !acc.querySelector('.acc-body.open')) btn.click(); row.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){} }
function _routeScrollCampaign(cid){ try{ setTimeout(function(){ var el=document.getElementById('arch_'+cid)||document.getElementById('garch_'+cid)||document.querySelector('[data-cid="'+cid+'"]'); if(el){ if(typeof toggleMetaCampaign==='function' && document.getElementById('metaCampExp_'+cid)) toggleMetaCampaign(cid); el.scrollIntoView({behavior:'smooth',block:'center'}); } }, 500); }catch(e){} }
function _routeOpenReview(taskId, linkKey, ronde){ try{ setTimeout(function(){ if(!window.S27Review||typeof S27Review.linkKeyOf!=='function') return; var rows=document.querySelectorAll('.deliv-file a[href]'); for(var i=0;i<rows.length;i++){ var url=rows[i].getAttribute('href')||''; if(url && url!=='#' && S27Review.linkKeyOf(url)===linkKey){ var fileRow=rows[i].closest('.deliv-file'); var btn=fileRow?fileRow.querySelector('.rv-fb,[onclick*="fileFeedback"],[onclick*="fileApprove"]'):null; if(btn){ btn.click(); } else if(typeof fileFeedback==='function' && fileRow){ var fb=fileRow.querySelector('button'); if(fb) fileFeedback(fb); } return; } } }, 600); }catch(e){} }
function _routeOpenGalerij(project, idx){ try{ setTimeout(function(){ var trg=document.querySelector('[onclick*="openFotoGalerij"]'); if(trg){ trg.click(); if(idx>0 && state._gal){ state._gal.idx=+idx; } } }, 500); }catch(e){} }

/* =============================================================================
   BOOT
   ============================================================================= */
function init(){
  $id('overlays').innerHTML = buildOverlays();
  state.route = parseRoute();
  // Magic-link/login-overleving: een uitgelogde bezoeker die een deep-link opent, verliest de
  // bestemming tijdens de e-maillogin (continue-url = pathname, Firebase wist de URL). Daarom
  // bewaren we de bedoelde hash hier (vóór login) in localStorage; applyRoute herstelt 'm na login
  // (zelfde browser/toestel; 15 min geldig, eenmalig). Google-SSO behoudt de hash sowieso.
  try{ if(qsp().get('demo')!=='1' && location.hash && location.hash.replace(/^#\/?/,'').length>1){ localStorage.setItem('s27_pending_route', JSON.stringify({ t:Date.now(), hash:location.hash })); } }catch(e){}
  window.addEventListener('popstate', onPopState);   // browser-terugknop -> in-SPA navigatie (geen portaal-exit)
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
  // v2 signed_out (Firebase): e-maillink (standaard, werkt met ELK mailadres incl. Outlook) + Google als alternatief
  loginCard(
    '<div class="llab" hidden></div>'+
    '<div class="field"><label>E-mailadres</label><input id="lgEmail" type="email" placeholder="jij@bedrijf.be" autocomplete="email" onkeydown="if(event.key===\'Enter\'){event.preventDefault();var b=document.getElementById(\'lgEmailBtn\');if(b)b.click();}"></div>'+
    '<button class="btn btn-primary btn-block" style="min-height:50px;font-size:15px;margin-top:4px" id="lgEmailBtn">Stuur me een inloglink '+ARROW_SVG+'</button>'+
    '<div class="divider-or">of met je Google-account</div>'+
    '<button class="oauth-btn" id="lgGoogle">'+GOOGLE_SVG+' Inloggen met Google</button>'+
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
    if(s.phase && s.phase!=='ready'){ try{ hideLoader(); }catch(e){} }   // niet (meer) ingelogd → boot-video weg, login tonen
    if(s.phase==='signed_out'){ _enrollStarted=false; renderLogin('v2'); loginErr(s.error||''); }
    else if(s.phase==='email_sent'){ renderLoginEmailSent(); }
    else if(s.phase==='mfa_challenge'){ renderLoginMfa(); loginErr(s.error||''); }
    else if(s.phase==='needs_enrollment'){
      renderLoginEnroll(); loginErr(s.error||'');
      if(!_enrollStarted){ _enrollStarted=true; try { const r=await window.S27Auth.enrollBegin(); renderLoginEnroll(r.secret, r.qrUrl); } catch(e){ _enrollStarted=false; loginErr(e.message); } }
    } else if(s.phase==='ready'){
      const u=s.user||{};
      const staff = !!s.staff || /@studio27\.be$/.test(String(u.email||'').trim().toLowerCase());
      state.session = { bedrijf_id:(staff?'admin':'via-gateway'), bedrijfsnaam:'', session_token:'firebase', uid:u.uid, email:u.email, displayName:u.displayName||'' };
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
  // generation-teller: elke boot/bedrijf-switch verhoogt 'm; in-flight prefetches van een vorige
  // generatie breken af (geen oude-bedrijf-data in de nieuwe sessie) + dedupe-cache leegmaken
  state._bootGen=(state._bootGen||0)+1;
  try{ if(window.S27DATA && S27DATA.resetInflight) S27DATA.resetInflight(); }catch(e){}
  // INSTANT terugschakelen: als dit bedrijf al eerder geladen werd, toon meteen de gecachte
  // snapshot (geen blind moment) en ververs stil op de achtergrond. state.activeBedrijf is bij
  // een switch al het NIEUWE bedrijf (switchCompany zette het via provisionFetch).
  var cached = (skipLink && state.activeBedrijf && state._dataByBedrijf) ? state._dataByBedrijf[state.activeBedrijf] : null;
  if(cached && cached.dashboard){
    state.data = cached; state.perfUrl = null; state._webTakTab = null;
    try { await applyRoute(); afterEnter(); renderCompanySwitcher(); updateNavBadges(); } catch(e){}
    hideLoader();
    try {
      await Promise.all([ S27DATA.loadDashboard(), S27DATA.loadBedrijf().catch(function(){ return false; }) ]);
      applyTakVisibility();   // verse koppelingen na de stille refresh kunnen de tab-zichtbaarheid wijzigen (review v86)
      if(typeof renderPanel==='function' && currentTab && state.viewMode==='tab') renderPanel(currentTab);
      updateNavBadges();
    } catch(e){}
    return;
  }
  // CRUCIAAL bij bedrijf-switch: wis alle gecachete data van het vorige bedrijf, anders blijven team/meetings/huisstijl/offertes/metricool/ads/facturatie hangen
  state.data = { dashboard:null, details:{}, chats:{}, meetings:null, bedrijf:null, team:null, huisstijl:null, offertes:null, metricool:null, metricoolStats:null, metricoolPostStats:null, ads:null };
  state._webTakTab = null;   // Website-sub-tab niet laten overhangen naar een ander bedrijf (review v86)
  state.perfUrl = null;
  try {
    loaderStep(14,'Inloggen gecontroleerd…');
    // skipLink (bedrijf-switch): switchCompany koppelde + ververste de claim al -> niet opnieuw provisionen.
    // SNELPAD terugkerende klant: klopt de bedrijf_id-claim in het huidige token al (en is er geen
    // afwijkende bedrijfskeuze), dan hoeft de provision-roundtrip (1,5-2,5s) NIET in het kritieke pad —
    // hij draait op de achtergrond (switcher/badges verversen daarna stil). Bij een verouderde claim
    // vangt de bestaande JIT-provision-retry in apiV2 het dashboard-403 alsnog op.
    if(!skipLink){
      var _cb=''; try { _cb=await tokenClaimBedrijf(); } catch(e){}
      var _sel=lastSelectedBedrijf();
      if(_cb && (!_sel || _sel===_cb)){
        // achtergrond-provision MET de boot-claim als selectie (lege localStorage kan dan nooit
        // naar een ander default-bedrijf flippen). Mismatch-guard: blijkt de claim verouderd
        // (ander bedrijf of geen toegang meer), dan volledige herlaad i.p.v. een gemengde sessie.
        var _gen=state._bootGen;
        loadCompaniesAndLink(_cb).then(function(d){
          if(_gen!==state._bootGen) return;   // intussen geswitcht/herboot -> niets doen
          if(d && d.ok && String(d.bedrijf_id||'')===String(_cb)){
            try{ renderCompanySwitcher(); updateNavBadges(); }catch(e){}
          } else {
            // claim verouderd of ingetrokken: verse claim staat al (token(true) in loadCompaniesAndLink)
            // -> volledige herlaad op het juiste bedrijf
            try{ if(d && d.bedrijf_id) state.activeBedrijf=String(d.bedrijf_id); state._provisionTried=false; loadAndEnter(true); }catch(e){}
          }
        }).catch(function(){});
      } else {
        loaderStep(22,'Je account koppelen…');
        try { await loadCompaniesAndLink(); } catch(e){}
      }
    }
    loaderStep(38,'Je projecten ophalen…');
    // dashboard + bedrijf zijn onafhankelijk -> parallel (scheelt 1 seriële round-trip vóór de render).
    // loadBedrijf (enkel voor de voornaam in de begroeting) mag de boot nooit breken: eigen catch.
    await Promise.all([
      S27DATA.loadDashboard(),
      S27DATA.loadBedrijf().catch(function(){ return false; })
    ]);
    loaderStep(78,'Bijna klaar…');
    await applyRoute();
    afterEnter();
    renderCompanySwitcher();
    updateNavBadges();   // bel-/zijbalk-badges meteen op het nieuwe bedrijf zetten (ook na deep-link/switch)
    const np=$id('notifPanel'); if(np && np.classList.contains('show')) renderNotifs();
    setTimeout(prefetchAdjacent, 800);   // na de eerste render: aangrenzende tabs alvast warm (tab-switch = 0ms)
  } finally { hideLoader(); }   // loader blijft staan tot alles gerenderd is -> geen template-flits
}
/* ---- Prefetch van aangrenzende tabs ná de eerste render (Cluster L) ----
   Sequentieel met korte pauzes (rate-limit-vriendelijk; reads zijn 60s KV-gecached in de worker),
   via S27DATA.once zodat een gelijktijdige tab-klik dezelfde promise deelt i.p.v. dubbel te laden. */
async function prefetchAdjacent(){
  if(state.demoMode || !state.session || state.viewMode==='login') return;
  var gen=state._bootGen;   // bij bedrijf-switch/herboot meteen stoppen (geen oude-bedrijf-data)
  var steps=[];
  if(!state.data.metricool) steps.push(['metricool', function(){ return S27DATA.loadMetricool(); }]);
  if(!state.data.meetings)  steps.push(['meetings',  function(){ return S27DATA.loadMeetings(); }]);
  if(!state.data.team)      steps.push(['team',      function(){ return S27DATA.loadTeam(); }]);
  if(!state.data.offertes)  steps.push(['offertes',  function(){ return S27DATA.loadOffertes(); }]);
  for(var i=0;i<steps.length;i++){
    if(gen!==state._bootGen) return;
    try { await S27DATA.once(steps[i][0], steps[i][1]); } catch(e){}
    if(gen!==state._bootGen) return;
    await new Promise(function(r){ setTimeout(r, 350); });   // spreiding: nooit een burst
  }
  // meetings (en co) zijn nu geladen -> badges hertekenen zodat de ECHTE Meetings-telling verschijnt
  // (of verborgen blijft bij 0). gen-guard: een trage prefetch van een vorig bedrijf mag niet overschrijven.
  if(gen===state._bootGen){ try{ updateNavBadges(); }catch(e){} }
}
function afterEnter(){
  applyTakVisibility();
  initSbGlass();
  // Portaalfeedback (bug-knop): zichtbaar voor IEDEREEN met een echte sessie — klanten mogen ook
  // bugs/feedback melden (zie in de clientview). Enkel in de demo blijft de knop verborgen.
  if(!state.demoMode){ var _bb=$id('bugBtn'); if(_bb) _bb.style.display=''; }
  // ADMIN: geen klant-onboardingtour; toon i.p.v. de naam-begroeting een "team"-context.
  if(state.adminMode){ document.body.classList.add('admin-mode'); updateAdminViewToggle(); }
  else if(!localStorage.getItem('s27_tour_completed')){ setTimeout(openTour,500); }
}
// Klant/Team-weergave-toggle (enkel staff): wissel tussen de uitgebreide teamweergave en de
// simpele klantweergave om mee te kijken. Acting-as blijft actief; enkel de WEERGAVE verandert.
function toggleClientView(){
  if(!state.adminMode) return;
  state._adminClientView=!state._adminClientView;
  updateAdminViewToggle();
  // ALTIJD verse data bij het wisselen team<->klant: de twee weergaven cachen los (metaAds vs
  // metaAdsRich, metricoolStats vs metricoolStatsRich) en kunnen op een ander periode-venster staan.
  // Wis de periode-afhankelijke ads/social-cache zodat de doelweergave opnieuw ophaalt bij de
  // ACTUELE periode (anders zie je foutieve bestedingen/cijfers van een vorig venster).
  if(state.data){ state.data.metaAds=null; state.data.metaAdsRich=null; state.data.googleAds=null; state.data.googleAdsRich=null; state.data.metricoolStats=null; state.data.metricoolStatsRich=null; state.data.metricoolPostStats=null; }
  // team<->client wisselt het periodevenster (team = t/m vandaag, client = t/m gisteren) -> herbereken
  if(state._adsPeriod && typeof adsPeriodWindow==='function'){ var _w=adsPeriodWindow(state._adsPeriod.preset); if(_w){ state._adsPeriod.from=_w.from; state._adsPeriod.to=_w.to; } }
  // ZIJBALK-/CHROME-gating meteen aanpassen aan de nieuwe weergave (bv. Offertes-tab verdwijnt in ClientView).
  // goTab() hertekent enkel het PANEEL; de sidebar-nav + topbar-chrome moeten apart herzet worden.
  if(typeof applyTakVisibility==='function') applyTakVisibility();
  // In ClientView nooit op een TEAM-ONLY tab blijven staan (bv. Offertes) -> val terug op Home zoals een klant ziet.
  var _tab=currentTab;
  if(state._adminClientView && ADMIN_ONLY_TABS.indexOf(_tab)>=0) _tab='start';
  if(typeof _tab==='string' && _tab) goTab(_tab);   // (huidige of veilige) tab in de juiste weergave herladen
}
// tabs die ENKEL in de teamweergave bestaan (niet zichtbaar/relevant voor een klant)
var ADMIN_ONLY_TABS=['offertes'];
function updateAdminViewToggle(){
  var b=$id('adminViewToggle'); if(!b) return;
  var client=!!(state.adminMode && state._adminClientView);
  document.body.classList.toggle('client-preview', client);
  var lab=b.querySelector('.vmode-lab'); if(lab) lab.textContent=client?'ClientView':'TeamView';
  b.setAttribute('aria-pressed', client?'true':'false');
  b.setAttribute('title', client?'Je bekijkt het portaal als klant (ClientView) — klik om terug naar TeamView':'Je bekijkt de teamweergave (TeamView) — klik om als klant mee te kijken (ClientView)');
}

/* =============================================================================
   ADMIN-MODUS (@studio27.be teamleden): bedrijvenkiezer met zoek over ÁLLE klanten.
   Flow: login (Google SSO) -> enterAdminMode (laadt alle bedrijven) -> bedrijvenkiezer ->
   keuze -> normaal portaal in adminMode, waarbij elke gateway-call X-Act-As-Bedrijf meestuurt
   (server-side scoping naar het gekozen bedrijf). De mini-switcher wordt vervangen door deze
   zoek-overlay (openAdminPicker) zodat een admin tussen ALLE klanten kan springen.
   ============================================================================= */
async function enterAdminMode(){
  // (bug-knop wordt nu in afterEnter voor iedereen getoond — klanten incl.)
  // DEEP-LINK vanuit het teamportaal (?klant=<bedrijfId>): spring meteen naar die klant
  // i.p.v. de bedrijvenkiezer te tonen. Zo verifieert een teamlid in 1 klik hoe de klant
  // z'n portaal ziet. Enkel staff bereikt enterAdminMode, dus geen klant-impact.
  // bedrijf uit een gedeelde hash-link (#/b/<id>/...) of de oude ?klant=-sprong: meteen die klant openen
  var _jumpKlant=''; try{ _jumpKlant=qsp().get('klant') || (state.route && state.route.bedrijf) || '';
    // ook na een e-maillogin (URL gewist): peil het bedrijf uit de bewaarde deep-link (applyRoute consumeert 'm verder)
    if(!_jumpKlant){ var _pr=localStorage.getItem('s27_pending_route'); if(_pr){ var _pp=JSON.parse(_pr); if(_pp&&_pp.hash&&(Date.now()-(_pp.t||0))<15*60*1000){ var _rr=_parseHash(_pp.hash); if(_rr&&_rr.bedrijf) _jumpKlant=_rr.bedrijf; } } }
  }catch(e){}
  if(_jumpKlant && /^[A-Za-z0-9_-]{1,64}$/.test(_jumpKlant)){
    try{ history.replaceState(null,'',location.pathname); }catch(e){}
    if(!state.adminCompanies || !state.adminCompanies.length){ try{ state.adminCompanies = await S27DATA.loadAdminCompanies(); }catch(e){ state.adminCompanies=[]; } }
    if(typeof adminEnterCompany==='function'){ adminEnterCompany(_jumpKlant); return; }
  }
  // INSTANT: bedrijvenlijst uit de lokale cache (10 min) -> kiezer staat er meteen,
  // de verse lijst wordt stil op de achtergrond opgehaald (zoekquery blijft staan).
  var cached=null;
  try{
    var raw=localStorage.getItem('s27_admin_companies');
    if(raw){ var p=JSON.parse(raw); if(p && Array.isArray(p.list) && p.list.length && (Date.now()-(p._t||0)) < 10*60*1000) cached=p.list; }
  }catch(e){}
  var bewaar=function(list){ try{ localStorage.setItem('s27_admin_companies', JSON.stringify({_t:Date.now(), list:list})); }catch(e){} };
  if(cached){
    state.adminCompanies=cached;
    openAdminPicker(); hideLoader();   // kiezer staat er meteen → boot-video uitfaden
    S27DATA.loadAdminCompanies().then(function(list){
      if(!Array.isArray(list)||!list.length) return;
      state.adminCompanies=list; bewaar(list);
      var el=$id('adminPicker');
      if(el && el.classList.contains('show')){
        var q=((($id('apickSearch')||{}).value)||'');
        el.innerHTML=adminPickerHTML();
        var s=$id('apickSearch'); if(s && q){ s.value=q; filterAdminPicker(); }
      }
    }).catch(function(){});
    return;
  }
  playLoader(); loaderStep(18,'Teamtoegang gecontroleerd…');
  var list=[];
  try { loaderStep(40,'Klantenlijst ophalen…'); list = await S27DATA.loadAdminCompanies(); } catch(e){ list=[]; }
  state.adminCompanies = Array.isArray(list)?list:[];
  if(state.adminCompanies.length) bewaar(state.adminCompanies);
  loaderStep(92,'Bijna klaar…');
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
  state._adminClientView=false;   // elke klant opent standaard in de teamweergave
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
// Video-loader (de "27"-morph in index.html). playLoader toont 'm, loaderStep stuurt de
// VIDEOPOSITIE op basis van de laadvoortgang (pct), hideLoader speelt 'm uit + fadet weg.
function playLoader(){ state._loaderAt=Date.now(); try{ if(window.__vidLoader) window.__vidLoader.show(); }catch(e){} }
function loaderStep(pct,label){ try{ if(window.__vidLoader) window.__vidLoader.step(pct); }catch(e){} }   // pct (0-100) => videopositie; label genegeerd (geen tekst meer)
function hideLoader(){ try{ if(window.__vidLoader) window.__vidLoader.finish(); }catch(e){} }
function onSessionExpired(msg){
  stopChatPoll();
  const b=document.createElement('div');
  b.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:14px 22px;border-radius:12px;font:700 14px/1.4 var(--font-display);z-index:99999;box-shadow:var(--sh-md)';
  b.textContent=msg||'Je sessie is verlopen, log opnieuw in.'; document.body.appendChild(b);
  setTimeout(()=>{ try{b.remove();}catch(e){} state.session=null; state.viewMode='login'; showLogin(); if(AUTH_V2) initRealAuth(); }, 1700);
}
function logout(){ stopChatPoll(); try{ if(window.S27Auth) window.S27Auth.logout(); }catch(e){} state.session=null; state.data={dashboard:null,details:{},chats:{},meetings:null,bedrijf:null,team:null,huisstijl:null};
  // ADMIN-staat volledig opruimen zodat een volgende (klant-)login niet in adminMode blijft hangen.
  state.adminMode=false; state._adminClientView=false; state.activeBedrijf=''; state.adminCompanies=null; state._adminActiveName=''; state._commsMode=false; try{ if(typeof closeClientChat==='function') closeClientChat(); }catch(e){} hideAdminPicker(); document.body.classList.remove('admin-mode'); document.body.classList.remove('client-preview');
  showLogin(); if(AUTH_V2 && !state.demoMode) initRealAuth(); else renderLogin(state.demoMode?'demo':'v1'); }

/* =============================================================================
   ROUTING, lazy-load per tab, dan renderen
   ============================================================================= */
async function ensureTabData(name){
  if(state.demoMode) return;
  if(['start','strategie','branding','video','berichten','socials','advertenties','webprestaties','alle-projecten'].indexOf(name)>=0){ if(!state.data.dashboard) await S27DATA.loadDashboard(); }
  // gedeelde keys via S27DATA.once -> een tab-klik tijdens de prefetch deelt dezelfde promise
  if(name==='meetings' && !state.data.meetings) await S27DATA.once('meetings', function(){ return S27DATA.loadMeetings(); });
  if(name==='huisstijl' && !state.data.huisstijl) await S27DATA.loadHuisstijl();
  // facturatie/instellingen: onafhankelijke loads parallel (was serieel: -300 à -800ms)
  if(name==='facturatie'||name==='instellingen'){
    var _fi=[];
    if(!state.data.bedrijf) _fi.push(S27DATA.loadBedrijf());
    if(!state.data.team) _fi.push(S27DATA.once('team', function(){ return S27DATA.loadTeam(); }));
    if(name==='instellingen' && !state.data.huisstijl) _fi.push(S27DATA.loadHuisstijl());
    if(_fi.length){ try{ await Promise.all(_fi); }catch(e){} }
  }
  // (Resultaten-tab verwijderd — advertentiedata staat real-time op de Advertenties-tab)
  if(name==='offertes'){ var _t=[]; if(!state.data.offertes) _t.push(S27DATA.once('offertes', function(){ return S27DATA.loadOffertes(); })); if(!state.data.bedrijf) _t.push(S27DATA.loadBedrijf()); if(_t.length){ try{ await Promise.all(_t); }catch(e){} } }
  if(name==='socials'){ var _s=[]; if(!state.data.metricool) _s.push(S27DATA.once('metricool', function(){ return S27DATA.loadMetricool(); }));
    if(isRichView()){ if(!state.data.metricoolStatsRich){ var _sp=(typeof socialPeriod==='function')?socialPeriod():null; _s.push(S27DATA.loadMetricoolStatsRich(_sp?{from:_sp.from,to:_sp.to,compare:_sp.compare}:undefined)); } }
    else { if(!state.data.metricoolStats){ var _spc=(typeof socialPeriod==='function')?socialPeriod():null; _s.push(S27DATA.loadMetricoolStats(_spc?{from:_spc.from,to:_spc.to,compare:_spc.compare}:undefined)); } if(!state.data.metricoolPostStats) _s.push(S27DATA.loadMetricoolPostStats()); }
    if(_s.length){ try{ await Promise.all(_s); }catch(e){} } }
  if(name==='advertenties'){
    if(isRichView()){ if(!state.data.metaAdsRich){ try{ var pp=(typeof adsPeriod==='function')?adsPeriod():null; await S27DATA.loadMetaAdsRich(pp?{from:pp.from,to:pp.to,compare:pp.compare}:undefined); }catch(e){} } }
    else if(!state.data.metaAds){ try{ var _ap=(typeof adsPeriod==='function')?adsPeriod():null; await S27DATA.loadMetaAds(_ap?{from:_ap.from,to:_ap.to,compare:_ap.compare}:undefined); }catch(e){} }
  }
  if(name==='webprestaties'){ var _wp=[]; if(!state.data.webTraffic) _wp.push(S27DATA.loadWebTraffic({period:(state._webPeriod||'last_30d')})); if(!state.data.webSearch) _wp.push(S27DATA.loadWebSearch({period:(state._webPeriod||'last_30d')})); if(_wp.length){ try{ await Promise.all(_wp); }catch(e){} } }
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
  currentTab=name; state.viewMode='tab'; state.activeProject=null; state._metaCampaign=null; state._chatStaged=[];
  setActiveNav(name);
  if(!state.demoMode && needsLoad(name)) renderLoading(name);
  await ensureTabData(name);
  // ITEM 17: GEEN auto-landing meer op één project — de klant komt ALTIJD eerst op de
  // projectenlijst en klikt zelf door naar de detail (uniform over alle takken).
  renderPanel(name);
  if(name==='advertenties' && typeof adsChatMount==='function') adsChatMount();   // ads-chat koppelen aan de huidige-maand-advertentietaak
  if(name==='socials' && typeof socialChatMount==='function') socialChatMount();   // social-chat koppelen aan de sociale-media-taak
  if(name==='advertenties' && isRichView() && typeof adsRichMountTabCharts==='function') adsRichMountTabCharts();   // team-weergave: tab-grafieken mounten
  if(name==='webprestaties' && typeof webMountCharts==='function') webMountCharts();   // Webprestaties-grafieken mounten
  if(name==='socials' && isRichView() && socialTab && socialTab()==='rapport' && typeof socialRichMountCharts==='function') socialRichMountCharts();   // team-weergave: social-rapport-grafieken mounten
  updateNavBadges();

  closeSidebar(); syncUrl();
}
// Zijbalk-badges dynamisch maken (shell.html heeft hardcoded mock-getallen).
// In demo laten we de mock staan; in live tonen we echte tellingen / verbergen we wat we niet betrouwbaar weten.
function updateNavBadges(){
  try{
    updateBellBadge();   // bel-badge werkt óók in demo (meldingen zijn daar nu wisbaar)
    if(state.demoMode) return;
    var setB=function(tab,n){ var b=document.querySelector('.sb-item[data-tab="'+tab+'"] .sb-badge'); if(!b)return; if(n>0){ b.textContent=n; b.style.display=''; } else { b.style.display='none'; } };
    var projs=(window.S27DATA&&S27DATA.projects())||null;
    if(projs && typeof TAK_TABS!=='undefined'){
      Object.keys(TAK_TABS).forEach(function(key){
        setB(key, _takProjects(TAK_TABS[key].discIds).filter(function(p){return p.status!=='done';}).length);
      });
      setB('webprestaties', _takProjects(TAK_WEBSITE.discIds).filter(function(p){return p.status!=='done';}).length);
    }
    var mt=(window.S27DATA&&S27DATA.meetings());
    // Meetings-teller: ENKEL bij echte aankomende/recente afspraken (zelfde telling als panelMeetings upCount).
    // Geen data geladen -> badge verbergen (setB(.,0)=display:none), nooit de hardgecodeerde index.html-waarde laten staan.
    if(mt){ setB('meetings', (mt.list||[]).filter(function(m){return m.dt&&m.dt.getTime()>=Date.now()-86400000;}).length); }
    else { setB('meetings', 0); }
    // berichten + topbar-bel: geen betrouwbare ongelezen-telling -> mock-badge verbergen
    var bb=document.querySelector('.sb-item[data-tab="berichten"] .sb-badge'); if(bb) bb.style.display='none';
    var topBer=document.querySelector('.icon-btn[data-topnav="berichten"] .badge'); if(topBer) topBer.style.display='none';
  }catch(e){}
}
function needsLoad(name){
  if(state.data.dashboard && ['start','strategie','branding','video','berichten'].indexOf(name)>=0) return false;
  if(name==='socials') return !state.data.metricool;   // wacht op Metricool-data
  if(name==='advertenties') return isRichView() ? !state.data.metaAdsRich : !state.data.metaAds;  // wacht op Meta-ads-data
  if(name==='webprestaties') return !state.data.webTraffic && !state.data.webSearch;  // wacht op GA4/GSC-data
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
  // Offertes-tab ENKEL in teamview — nooit voor klanten of in de ClientView-preview. Boven de vroege return zodat
  // hij ook in demo/pre-load verborgen blijft (de querySelector werkt los van dashboard-data).
  const off=document.querySelector('.sb-item[data-tab="offertes"]');
  if(off) off.style.display = (typeof isRichView==='function' && isRichView()) ? '' : 'none';
  if(state.demoMode || !state.data.dashboard) return;
  const d=state.data.dashboard;
  const pf=document.querySelector('.sb-item[data-tab="performance"]');
  if(pf) pf.style.display = (d && d.modules && d.modules.performance===false) ? 'none' : '';
  // (Vincent 2026-06-13, herzien): Socials/Adverteren/Website-tabs blijven ALTIJD zichtbaar.
  // Zonder gekoppelde data tonen de panels zelf een nette "geen connectie"-melding (zie statNotLinked).
}

/* =============================================================================
   PROJECTDETAIL, lazy detail + chat, dan buildModal
   ============================================================================= */
async function openProject(id, from, noPush){
  // 'auto' (of onbekend) -> terug-tak afleiden uit de tak van het project (Dakstructuur Q)
  let f=(from && from!=='auto' && typeof PANELS!=='undefined' && PANELS[from])?from:'';
  stopChatPoll();
  state.viewMode='project'; state.activeProject=id; state._mtab=(state._openChatTab?'chat':'overzicht'); state._openChatTab=false; state._chatStaged=[];
  if(!state.demoMode){ renderLoading(f||'start'); await Promise.all([ S27DATA.loadDetail(id), S27DATA.loadChat(id) ]); }
  const p=(S27DATA.projects()||(typeof PROJECTS!=='undefined'?PROJECTS:[])).find(x=>x.id===id);
  if(!f) f=(typeof takOfProject==='function')?takOfProject(p):'start';
  state._backTab=f;
  document.querySelectorAll('.sb-item').forEach(t=>t.classList.remove('active'));
  const item=document.querySelector('.sb-item[data-tab="'+f+'"]'); if(item) item.classList.add('active');
  const page=$id('page');
  page.innerHTML='<div class="panel active br-'+(p?p.br:'blue')+'" data-screen-label="projectdetail">'+buildModal(id,f)+'</div>';
  window.scrollTo({top:0,behavior:'auto'});
  const tt=$id('topbarTitle'); if(tt&&p) tt.textContent=p.name;
  closeSidebar(); syncUrl(!noPush);   // push een history-entry zodat browser-terug binnen de SPA terugkeert
  if($id('chatList')) startChatPoll(id);   // projectchat staat in de DOM (tenzij afgerond) -> auto-refresh
}
// per-tak 'sla auto-landing over'-vlag (terug uit een content-detail = de lijst tonen, niet opnieuw inzoomen)
function markSkipAutoLand(tak){ if(!tak) return; state._skipAutoLand=state._skipAutoLand||{}; state._skipAutoLand[tak]=true; }
function closeModal(){ if(typeof _isContentTak==='function'&&_isContentTak(state._backTab||'')) markSkipAutoLand(state._backTab); goTab(state._backTab||'start'); }

/* =============================================================================
   ECHTE HANDLERS
   ============================================================================= */
async function sendChat(input){
  if(!input) input=document.querySelector('.chat-input .chat-textin');
  const tx=((input&&input.value)||'').trim();
  const staged=(state._chatStaged||[]).slice();   // tekst + alle gestagede bestanden samen versturen (Cluster M)
  if(!tx && !staged.length) return;
  const list=_chatListEl(); if(!list) return;
  // optimistische bubble: tekst + thumbnails/documenten samen in één bericht
  const me=document.createElement('div'); me.className='msg me';
  let inner='<div class="bubble"><div class="who">Jij</div>';
  if(tx) inner+='<div class="tx">'+escapeHtml(tx)+'</div>';
  if(staged.length) inner+='<div class="bub-atts">'+staged.map(function(f){ return /^image\//.test(f.type)?'<img class="bub-att" src="'+f.dataUrl+'" alt="">':'<span class="bub-doc">'+ic('doc',13)+' '+escapeHtml(f.name)+'</span>'; }).join('')+'</div>';
  inner+='<div class="tm">nu</div></div>';
  me.innerHTML=inner; list.appendChild(me);
  // composer leegmaken (tekst + staging-tray + melding)
  if(input) input.value=''; state._chatStaged=[]; if(typeof _renderChatTray==='function') _renderChatTray();
  var _sm=document.getElementById('chatStageMsg'); if(_sm) _sm.textContent='';
  list.scrollTop=list.scrollHeight;
  if(state.demoMode || !state.activeProject){
    setTimeout(()=>{ const r=document.createElement('div'); r.className='msg flash'; r.innerHTML='<span class="av" style="background:var(--s27-blue)">IM</span><div class="bubble"><div class="who">Ilke Meeusen</div><div class="tx">Top, ik neem het mee!</div><div class="tm">nu</div></div>'; const l2=_chatListEl(); if(l2){ l2.appendChild(r); l2.scrollTop=l2.scrollHeight; setTimeout(()=>r.classList.remove('flash'),700); } },1100);
    return;
  }
  const tid=state.activeProject;
  const S=state.session||{};
  try {
    // 1) tekst eerst (zodat het bericht leesbaar boven de bijlagen staat)
    if(tx){
      if(state._commsMode){ await api(ENDPOINTS.commsChatPost, { bedrijf_id:S.bedrijf_id, session_token:S.session_token, klant_naam:S27DATA.bedrijfsnaam(), comment_text:tx }); }
      else { await api(ENDPOINTS.chatPost, { task_id:tid, bedrijf_id:S.bedrijf_id, session_token:S.session_token, klant_naam:S27DATA.bedrijfsnaam(), comment_text:tx }); }
    }
    // 2) daarna elk gestaged bestand
    for(let i=0;i<staged.length;i++){
      const f=staged[i]; const b64=String(f.dataUrl||'').split(',')[1]||''; if(!b64) continue;
      if(state._commsMode){ await api(ENDPOINTS.commsChatAttachment, { bedrijf_id:S.bedrijf_id, session_token:S.session_token, klant_naam:S27DATA.bedrijfsnaam(), filename:f.name, file_data:b64 }); }
      else { await api(ENDPOINTS.chatAttachment, { task_id:tid, bedrijf_id:S.bedrijf_id, session_token:S.session_token, klant_naam:S27DATA.bedrijfsnaam(), filename:f.name, file_data:b64 }); }
    }
  }
  catch(e){}
  // cache verversen + chat herrenderen zodat de ECHTE ClickUp-berichten in de cache zitten
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
  const oldList=_chatListEl();
  const atBottom = oldList ? (oldList.scrollHeight-oldList.scrollTop-oldList.clientHeight < 60) : true;
  const prevTop = oldList ? oldList.scrollTop : 0;
  // een lopend concept in het tekstvak niet wegklikken bij een poll-herrender
  const oldInp=document.querySelector('.chat-input .chat-textin'); const draft=oldInp?oldInp.value:'';
  const p=(window.S27DATA&&(S27DATA.projects()||[]).find(function(x){return x.id===id;}))||null;
  const dcBody=$id('dcBody');
  const adsBody=$id('adsChatBody');
  const socBody=$id('socChatBody');
  if(state._commsMode){
    // comms-drawer EERST (anders zou de achtergrond-chat-host gekaapt worden door een dubbele #chatList)
    const ccBody=$id('clientChatBody');
    if(ccBody) ccBody.innerHTML='<div class="cc-with">'+saeChatWho(S27DATA.commsTeam())+'</div>'+chatHTML(id);
    else return;
  } else if(dcBody){
    // projectdetail-chat: enkel de chat-body verversen (laat de tabs/overzicht ongemoeid)
    const closed=!!(window.S27DATA && S27DATA.isChatClosed && p && p._raw && S27DATA.isChatClosed(p._raw.status));
    dcBody.innerHTML=chatHTML(id, closed);   // afgerond -> read-only historie (blijft zichtbaar + ververst mee)
  } else if(adsBody){
    adsBody.innerHTML=chatHTML(id);          // ads-chat: enkel de chat-body verversen bij een poll-update
  } else if(socBody){
    socBody.innerHTML=chatHTML(id);          // social-chat: idem, enkel de chat-body verversen
  } else { return; }
  if(draft){ const newInp=document.querySelector('.chat-input .chat-textin'); if(newInp) newInp.value=draft; }
  const newList=_chatListEl(); if(!newList) return;
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
  if(state.activeProject!==taskId || (!_chatListEl())){ stopChatPoll(); return; }
  pc.busy=true;
  try { await S27DATA.loadChat(taskId); } catch(e){ pc.busy=false; return; }
  pc.busy=false;
  if(!state._chatPoll || state._chatPoll.id!==taskId) return;   // tussentijds gestopt/gewisseld
  const sig=chatSig(taskId);
  if(sig!==pc.sig){ pc.sig=sig; if(state.activeProject===taskId) rerenderActiveChat(false); }
}
/* ---- Bestandsupload in de chat (overal waar chatHTML staat) ---- */
async function chatUpload(input, taskId){
  const f=input.files&&input.files[0]; if(!f) return; input.value='';
  const tid=taskId||state.activeProject; const list=_chatListEl(); let bubble=null;
  if(list){ bubble=document.createElement('div'); bubble.className='msg me'; bubble.innerHTML='<div class="bubble"><div class="who">Jij</div><div class="tx">'+ic('doc',14)+' '+escapeHtml(f.name)+' <span style="opacity:.6">- uploaden…</span></div><div class="tm">nu</div></div>'; list.appendChild(bubble); list.scrollTop=list.scrollHeight; }
  const done=(txt)=>{ if(bubble){ var t=bubble.querySelector('.tx'); if(t)t.innerHTML=ic('doc',14)+' '+escapeHtml(f.name)+txt; } };
  if(state.demoMode){ done(' ✓'); return; }
  const rd=new FileReader();
  rd.onload=async function(){ const b64=String(rd.result).split(',')[1]||'';
    try{ if(state._commsMode){ await api(ENDPOINTS.commsChatAttachment, { bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), filename:f.name, file_data:b64 }); } else { await api(ENDPOINTS.chatAttachment, { task_id:tid, bedrijf_id:state.session.bedrijf_id, session_token:state.session.session_token, klant_naam:S27DATA.bedrijfsnaam(), filename:f.name, file_data:b64 }); } done(' ✓');
      await refreshChatCache(tid);   // echte attachment-comment uit ClickUp in de cache (geen duplicaat met de optimistische bubble)
    }
    catch(e){ done(' <span style="color:var(--s27-orange-ink)">- mislukt</span>'); }
  };
  rd.readAsDataURL(f);
}
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
/* ---- Altijd-open klantchat (topbar-drawer; server resolvet de communicatietaak, geen task_id van de client) ---- */
// Chat-lijst-lookup gescoped op de drawer wanneer de comms-chat open is (vermijdt de dubbele #chatList-collisie met een achtergrond-chat).
function _chatListEl(){ return state._commsMode ? document.querySelector('#clientChatBody #chatList') : document.getElementById('chatList'); }
function clientChatEl(){
  var el=$id('clientChat');
  if(!el){ el=document.createElement('div'); el.id='clientChat'; el.className='cc-overlay';
    el.addEventListener('mousedown',function(e){ el._downScrim=(e.target===el); });
    el.addEventListener('click',function(e){ if(e.target===el && el._downScrim) closeClientChat(); });
    document.body.appendChild(el); }
  return el;
}
function ccEsc(e){ if(e.key==='Escape') closeClientChat(); }
async function openClientChat(){
  stopChatPoll();
  state._prevActiveProject = state.activeProject;   // bewaren -> bij sluiten herstellen (comms kaapt activeProject niet permanent)
  var el=clientChatEl(); el.classList.add('show'); document.body.classList.add('mp-lock');
  document.addEventListener('keydown',ccEsc);
  var closeX='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  el.innerHTML='<div class="cc-modal" onclick="event.stopPropagation()"><div class="cc-head"><div class="cc-htitle">Chat met je team</div><button class="cc-close" onclick="closeClientChat()" aria-label="Sluiten">'+closeX+'</button></div><div class="cc-body" id="clientChatBody"><div class="empty" style="padding:50px"><div class="brand-spinner" style="margin:0 auto"></div></div></div></div>';
  state._commsMode=true;
  var d=null; try{ d=await S27DATA.loadCommsChat(); }catch(e){}
  var tid=(d&&d.task_id)||S27DATA.commsTaskId();
  var body=$id('clientChatBody'); if(!body) return;
  if(!tid){ body.innerHTML='<div class="empty" style="padding:40px 16px"><p>Chat is even niet beschikbaar. Probeer het zo opnieuw.</p></div>'; return; }
  state.activeProject=tid;
  body.innerHTML='<div class="cc-with">'+saeChatWho(S27DATA.commsTeam())+'</div>'+chatHTML(tid);
  var l=_chatListEl(); if(l) l.scrollTop=l.scrollHeight;
  startChatPoll(tid);
}
function closeClientChat(){
  stopChatPoll();
  var el=$id('clientChat'); if(el){ el.classList.remove('show'); el.innerHTML=''; }
  document.removeEventListener('keydown',ccEsc);
  document.body.classList.remove('mp-lock');
  state._commsMode=false;
  state.activeProject = state._prevActiveProject || null;   // achtergrond-chat-context herstellen (geen verdwaalde berichten)
  state._prevActiveProject = null;
  if(state.activeProject && document.getElementById('chatList')) startChatPoll(state.activeProject);  // achtergrond-chat terug laten pollen indien nog zichtbaar
}
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
// demo-antwoorden: ook de DYNAMISCHE chips krijgen een zinnig antwoord (prefix-match)
function botDemoAnswer(q){
  if(BOT_ANSWERS[q]) return BOT_ANSWERS[q];
  if(/^Wat staat er voor mij klaar/i.test(q)) return 'Op je <b>Home</b> zie je alles wat op jou wacht: feedback geven, iets inplannen of een bericht beantwoorden. Klik een kaart aan en je springt er meteen naartoe.';
  if(/^Wat is de status van /i.test(q)) return 'Open dit project onder <b>Projecten</b> — daar zie je live de status, de planning en de laatste deliverables. Vragen? Stel ze in de projectchat.';
  return 'Goeie vraag! Ik verbind je even door met <b>Ilke</b>, je vaste contact, zij antwoordt je zo.';
}
function botAsk(btn){ pushBot(btn.textContent,'user'); const q=btn.textContent; const c=$id('botChips'); if(c)c.style.display='none'; botReply(q); }
function botSend(){ const inp=$id('botInput'); const tx=(inp.value||'').trim(); if(!tx) return; pushBot(tx,'user'); inp.value=''; botReply(tx); }
function pushBot(text,who){ const m=$id('botMsgs'); const d=document.createElement('div'); d.className='bmsg '+who; d.innerHTML = who==='user'?escapeHtml(text):text; m.appendChild(d); m.scrollTop=m.scrollHeight; }
async function botReply(q){
  const m=$id('botMsgs'); const t=document.createElement('div'); t.className='typing'; t.innerHTML='<i></i><i></i><i></i><span class="typing-tx">Onze assistent denkt na…</span>'; m.appendChild(t); m.scrollTop=m.scrollHeight;
  if(state.demoMode){ setTimeout(()=>{ t.remove(); pushBot(botDemoAnswer(q),'bot'); },1100); return; }
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
// context voor de AI: projecten + aanstaande meetings + openstaande actiepunten (zo kan de
// bestaande antwoord-flow ook de dynamische chip-vragen aan)
function botContext(){
  const ps=S27DATA.projects()||[];
  var out=ps.map(p=>'- '+p.name+' ('+p.disc+', '+p.status+(p.pct?(', '+p.pct+'% klaar'):'')+')').join('\n')||'(geen projecten)';
  try{
    var mt=(window.S27DATA&&S27DATA.meetings&&S27DATA.meetings())||null;
    var up=((mt&&mt.list)||[]).filter(function(m){return m.dt&&m.dt.getTime()>=Date.now();}).slice(0,3);
    if(up.length) out+='\n\nAanstaande meetings:\n'+up.map(function(m){return '- '+(m.titel||m.title||'meeting')+' op '+m.dt.toLocaleDateString('nl-BE',{weekday:'long',day:'numeric',month:'long'});}).join('\n');
    var cock=(typeof _notifItems==='function'?_notifItems():[]);
    if(cock.length) out+='\n\nOpenstaande actiepunten voor de klant:\n'+cock.slice(0,4).map(function(a){return '- '+a.title+' ('+(a.cat||'')+')';}).join('\n');
  }catch(e){}
  return out;
}
/* ---- Dynamische chatbot-chips (Cluster G): voorgestelde vragen op basis van context ---- */
function botDynChips(){
  var chips=[];
  try{
    var ps=(window.S27DATA&&S27DATA.projects&&S27DATA.projects())||(typeof PROJECTS!=='undefined'?PROJECTS:[]);
    var actief=(ps||[]).filter(function(p){return p.status!=='done';});
    // 1) openstaand actiepunt -> meest relevante vraag eerst
    var cock=(typeof _notifItems==='function'?_notifItems():[]);
    if(cock.length) chips.push('Wat staat er voor mij klaar?');
    // 2) status van het recentste actieve project (concreet, herkenbaar)
    if(actief.length) chips.push('Wat is de status van '+String(actief[0].name||'').replace(/"/g,'')+'?');
    // 3) meetings (vaste vraag — heeft ook een demo-antwoord)
    chips.push('Wanneer is mijn volgende meeting?');
    // 4) feedback-uitleg (vaste vraag — heeft ook een demo-antwoord)
    chips.push('Hoe geef ik feedback?');
  }catch(e){}
  if(!chips.length) chips=Object.keys(BOT_ANSWERS);
  return chips.slice(0,4);
}
function renderBotChips(){
  var c=$id('botChips'); if(!c) return;
  c.style.display='';   // chips komen terug bij her-openen, ook na een eerder gesprek
  c.innerHTML=botDynChips().map(function(q){ return '<button class="bot-chip" onclick="botAsk(this)">'+escapeHtml(q)+'</button>'; }).join('');
}

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
function _sbLock(on){ document.body.classList.toggle('sb-open',on); document.documentElement.classList.toggle('sb-open',on); }
// Pushmeldingen aanzetten op dít toestel (Instellingen-knop; vervangt de oude zwevende box)
async function enablePushHere(btn){
  var msg=$id('pushHereMsg');
  if(!(window.S27Push && S27Push.enable)){ if(msg) msg.textContent='Pushmeldingen zijn hier niet beschikbaar.'; return; }
  btn.disabled=true; var orig=btn.innerHTML; btn.innerHTML='Bezig…';
  var r=null; try{ r=await S27Push.enable(); }catch(e){ r={ok:false,msg:'Er ging iets mis.'}; }
  btn.disabled=false; btn.innerHTML=orig;
  if(msg){ msg.textContent=(r&&r.msg)||''; msg.style.color=(r&&r.ok)?'var(--s27-green-ink,#147A50)':'var(--s27-orange-ink,#C44514)'; }
}
function toggleSidebar(){ const sb=$id('sidebar'); const open=sb.classList.toggle('open'); $id('sbScrim').classList.toggle('show',open); _sbLock(open); }
function closeSidebar(){ $id('sidebar').classList.remove('open'); $id('sbScrim').classList.remove('show'); _sbLock(false); }
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
  // expliciete nid (bv. plan-items: meerdere kaarten op hetzelfde project) wint van de action-afleiding
  if(a && a.nid) return String(a.nid).replace(/[^A-Za-z0-9:_-]+/g,'_');
  var m=String(a&&a.action||'').match(/openProject\('([^']+)'/);
  var tid=m?m[1]:String(a&&a.title||'');
  var raw=tid+'::'+String(a&&a.cat||'')+'::'+String(a&&a.title||'');
  // sanitize -> identieke key in HTML-attr (escapeHtml), JS-string (onclick) én localStorage;
  // anders mismatcht 'SEO & GEO' (& -> &amp;) en daalt de bel-badge niet bij die melding.
  return raw.replace(/[^A-Za-z0-9:_-]+/g,'_');
}
// demo: in-memory seen (refresh reset de demo); live: localStorage (persistent, per bedrijf)
function _readSeen(){ if(state.demoMode) return state._demoSeen||{}; try{ return JSON.parse(localStorage.getItem(_seenKey())||'{}')||{}; }catch(e){ return {}; } }
function _writeSeen(o){ if(state.demoMode){ state._demoSeen=o||{}; return; } try{ localStorage.setItem(_seenKey(), JSON.stringify(o||{})); }catch(e){} }
// één bron voor meldingen in beide modes (demo = dezelfde mock als Home's "Voor jou te doen")
function _notifItems(){ if(state.demoMode) return (typeof _COCKPIT_MOCK!=='undefined')?_COCKPIT_MOCK:[]; return (window.S27DATA&&S27DATA.cockpit())||[]; }
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
  var cock=_notifItems();
  var seen=pruneSeen(cock.map(notifId));
  return cock.filter(function(a){ return !seen[notifId(a)]; }).length;
}
// bel-badge apart bijwerken (werkt ook in demo, los van de andere nav-badges)
function updateBellBadge(){
  try{
    var bell=document.querySelector('#bellBtn .badge'); if(!bell) return;
    var n=unseenCount();
    if(n>0){ bell.textContent=n; bell.style.display=''; } else bell.style.display='none';
  }catch(e){}
}

// echte meldingen uit de cockpit (Voor jou te doen), klikbaar -> juiste bestemming.
// Weggeklikte/geziene meldingen VERDWIJNEN (niet meer gedimd onderaan); per item een ×-knop.
function renderNotifs(){
  const list=document.querySelector('#notifPanel .notif-list'); if(!list) return;
  const cock=_notifItems();
  pruneSeen(cock.map(notifId));
  const open=cock.filter(function(a){ return !isSeen(a); });
  if(!open.length){ list.innerHTML='<div class="empty" style="padding:30px 16px;text-align:center"><div class="em-ic">'+ic('st_approved',40)+'</div><b style="font-family:var(--font-display);font-size:14px;color:var(--ink-2)">Alles is bij!</b><p style="margin:6px 0 0;font-size:13px;color:var(--ink-3)">Geen openstaande acties, wij werken ondertussen verder.</p></div>'; return; }
  list.innerHTML=open.map(function(a){
    var nid=escapeHtml(notifId(a));
    return '<button class="notif br-'+a.br+'" data-nid="'+nid+'" style="width:100%;text-align:left;border:none;border-bottom:1px solid var(--line);background:none;cursor:pointer;display:flex;gap:12px;align-items:flex-start;padding:14px 16px" onclick="notifGo(\''+nid+'\');'+a.action+'"><div class="nic">'+ic(a.icon||'st_feedback',18)+'</div><div class="ntx"><b>'+escapeHtml(a.title)+'</b><p>'+(a.ctx||'')+'</p><div class="ntm">'+escapeHtml(a.tag||'')+'</div></div>'+(a.urgent?'<span class="unread"></span>':'')+'<span class="nclose" role="button" aria-label="Melding wissen" onclick="event.stopPropagation();notifDismiss(\''+nid+'\')">&times;</span></button>';
  }).join('');
}
// klik op één melding -> actie uitvoeren ÉN melding verdwijnt (seen = weggeklikt)
function notifGo(nid){
  const np=$id('notifPanel'); if(np)np.classList.remove('show');
  if(nid){
    var s=_readSeen(); s[nid]=Date.now(); _writeSeen(s);
    var el=document.querySelector('#notifPanel .notif[data-nid="'+nid+'"]'); if(el) el.remove();
    updateBellBadge();
  }
}
// ×-knop: melding wissen zonder de actie uit te voeren (paneel blijft open)
function notifDismiss(nid){
  if(!nid) return;
  var s=_readSeen(); s[nid]=Date.now(); _writeSeen(s);
  var el=document.querySelector('#notifPanel .notif[data-nid="'+nid+'"]'); if(el) el.remove();
  if(!document.querySelector('#notifPanel .notif')) renderNotifs();   // lege lijst -> "Alles is bij!"
  updateBellBadge();
}
function markAllSeen(){
  var cock=_notifItems(); var s=_readSeen();
  cock.forEach(function(a){ s[notifId(a)]=Date.now(); }); _writeSeen(s);
  renderNotifs(); updateBellBadge();
}
document.addEventListener('click',e=>{ if(!e.target.closest('.client-switch-wrap')){ const m=$id('switchMenu'); if(m)m.style.display='none'; const sw=$id('clientSwitch'); if(sw)sw.classList.remove('open'); } if(!e.target.closest('#notifPanel')&&!e.target.closest('#bellBtn')){ const np=$id('notifPanel'); if(np)np.classList.remove('show'); } });
// dienst-label -> tak-pagina (Dakstructuur Q)
function goDienst(disc){
  const M={'Strategie':'strategie','Branding':'branding','Video- en fotografie':'video','Webdesign':'webprestaties','Website en SEO':'webprestaties','SEO & GEO':'webprestaties','Social media':'socials','Online adverteren':'advertenties','Support':'webprestaties'};
  goTab(M[disc]||'start');
}
// Kennismaking / koffiegesprek -> meetingpagina, automatisch bij Arne (kies een vrij moment in zijn agenda)
function koffieMetArne(){ if(typeof openMeetingPlanner==='function'){ openMeetingPlanner('nieuw'); } else { goTab('meetings'); } }
function switchModalTab(name){
  // projectdetail-subnav (dakstructuur slice 2): 'overzicht' (incl. bestanden-accordions als
  // sub-blok) of 'chat' (schermvullend). Knoppen dragen data-mt, panes data-mpane.
  state._mtab=(name==='chat')?'chat':'overzicht'; name=state._mtab;
  const c=document.querySelector('.detail'); if(!c)return;
  c.querySelectorAll('.detail-subnav button').forEach(b=>b.classList.toggle('active', b.getAttribute('data-mt')===name));
  c.querySelectorAll('.detail-body .mpane').forEach(p=>p.classList.remove('active'));
  if(name==='overzicht'){
    const ov=c.querySelector('.mpane[data-mpane="overzicht"]'); if(ov)ov.classList.add('active');
    const sub=c.querySelector('.mpane.mpane-sub'); if(sub)sub.classList.add('active');
  } else {
    const ch=c.querySelector('.mpane[data-mpane="chat"]'); if(ch)ch.classList.add('active');
    const list=c.querySelector('#dcBody .chat-list'); if(list) list.scrollTop=list.scrollHeight;
    const inp=c.querySelector('#dcBody .chat-textin'); if(inp) inp.focus();
  }
  syncUrl();
}
// Berichten-inbox of elders: open een project rechtstreeks op de Chat-tab (schermvullend gesprek)
function openProjectChat(id){
  state._openChatTab=true;
  openProject(id, (currentTab==='berichten')?'berichten':'auto');
}
function toggleAcc(btn){ btn.classList.toggle('open'); btn.nextElementSibling.classList.toggle('open'); }
/* ---- Per-bestand review (goedkeuren / feedback + via welke weg) ---- */
const REVIEW_CHANNELS=[['portaal','via het portaal'],['whatsapp','via WhatsApp'],['email','via e-mail'],['telefoon','telefonisch'],['meeting','in een meeting']];
function _chanSelect(){ return '<select class="rv-chan" style="font-family:var(--font-body);font-size:13px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;outline:none">'+REVIEW_CHANNELS.map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join('')+'</select>'; }
// De review-knoppen openen voortaan de gestandaardiseerde review-overlay (S27Review: preview +
// comments + goedkeuren/feedback over alle bestandstypes, worker-based i.p.v. Make). Valt terug op
// de oude inline-flow in demo of als S27Review nog niet geladen is. Video -> S27VideoReview.
function fileApprove(btn){ if(!_openFileReview(btn)) _fileReviewUI(btn,'approve'); }
function fileFeedback(btn){ if(!_openFileReview(btn)) _fileReviewUI(btn,'feedback'); }
function _openFileReview(btn){
  try{
    if(state.demoMode) return false;                       // demo: oude inline-flow (geen worker-calls)
    var row=btn.closest && btn.closest('.deliv-file'); if(!row) return false;
    var a=row.querySelector('a[href]'); var url=a?(a.getAttribute('href')||''):'';
    if(!url || url==='#') return false;
    var taskId=row.getAttribute('data-task')||state.activeProject||'';
    var label=row.getAttribute('data-label')||'Bestand';
    if(window.S27VideoReview && typeof S27VideoReview.isReviewable==='function' && S27VideoReview.isReviewable(url)){
      S27VideoReview.open({ taskId:String(taskId), url:String(url), label:String(label), sourceEl:btn }); return true;
    }
    if(window.S27Review && typeof S27Review.pickReviewer==='function'){
      S27Review.pickReviewer(url, { taskId:String(taskId), label:String(label), sourceEl:btn }); return true;
    }
  }catch(e){}
  return false;
}
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
  const reviewTask=row.getAttribute('data-task')||state.activeProject;   // subtaak-id (branding/strategie onderdelen) of hoofdtaak (review v85 #3)
  const sel=panel.querySelector('.rv-chan'); const kanaal=sel?sel.value:'portaal';
  const txEl=panel.querySelector('.rv-tx'); const tx=txEl?txEl.value:'';
  const chan=REVIEW_CHANNELS.find(function(c){return c[0]===kanaal;}); const chanLabel=chan?chan[1]:'';
  const act=row.querySelector('.df-act'); panel.remove();
  if(act){ act.style.display=''; act.innerHTML='<span class="pill pill-'+(choice==='goedgekeurd'?'done':'wait')+'"><span class="pdot"></span>'+(choice==='goedgekeurd'?'Goedgekeurd':'Feedback verstuurd')+'</span><span class="rv-via" style="font-size:12px;color:var(--ink-4);margin-left:8px">'+escapeHtml(chanLabel)+'</span>'; }
  if(state.demoMode || !state.activeProject) return;
  try { await api(ENDPOINTS.feedbackV2, { task_id:reviewTask, bedrijf_id:(state.session||{}).bedrijf_id, session_token:(state.session||{}).session_token, klant_naam:S27DATA.bedrijfsnaam(), deliverables:[{label:label,choice:choice,opmerking:tx,kanaal:kanaal,kanaal_label:chanLabel}], algemene_opmerking:'' }); } catch(e){}
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
      voornaam:base.voornaam||'', achternaam:base.achternaam||'', email:(g('npEmail')||base.email||''), gsm:(g('npGsm')||base.gsm||''), kanalen:readKanalen('npKanalen') });
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
    kanalen: readKanalen('cfKanalen')
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
/* ---- Website-supportticket (Cluster K2): overlay-formulier -> worker ticketCreate + ticketAttach ----
   Meerdere bijlagen: stagen in state._wtFiles (chips-tray, zelfde CSS als de chat-composer), pas bij
   "Versturen" gaat alles weg — eerst het ticket (tekst), daarna sequentieel per bestand één attach-call.
   Hergebruikt de meeting-planner-overlay-CSS (mp-overlay/mp-modal/mp-scroll). */
var _wtFileSeq=0;
function wtEl(){ var el=$id('webTicket'); if(!el){ el=document.createElement('div'); el.id='webTicket'; el.className='mp-overlay'; el.addEventListener('mousedown',function(e){ el._downScrim=(e.target===el); }); el.addEventListener('click',function(e){ if(e.target===el && el._downScrim) closeWebTicket(); }); document.body.appendChild(el); } return el; }
function wtEsc(e){ if(e.key==='Escape') closeWebTicket(); }
function closeWebTicket(){ var el=$id('webTicket'); if(el){ el.classList.remove('show'); el.innerHTML=''; } document.removeEventListener('keydown',wtEsc); document.body.classList.remove('mp-lock'); state._wtFiles=[]; state._wtStep=null; }
function openWebTicket(){ state._wtFiles=[]; var el=wtEl(); el.classList.add('show'); document.body.classList.add('mp-lock'); document.addEventListener('keydown',wtEsc); wtRender(); var s=$id('wtSubj'); if(s)s.focus(); }
function _wtChipsHTML(){
  var st=(state._wtFiles||[]); if(!st.length) return '';
  return st.map(function(f){
    var th=/^image\//.test(f.type)?'<img src="'+f.dataUrl+'" alt="">':ic('doc',15);
    return '<span class="chat-chip" data-fid="'+f.id+'"><span class="chat-chip-th">'+th+'</span><span class="chat-chip-nm">'+escapeHtml(f.name)+'</span><button type="button" class="chat-chip-x" title="Verwijderen" onclick="wtUnstage(\''+f.id+'\')">'+ic('close',12)+'</button></span>';
  }).join('');
}
function _wtRenderTray(){ var t=$id('wtTray'); if(t) t.innerHTML=_wtChipsHTML(); }
var _wtPending=0;   // FileReader-race: submit wacht tot alle gekozen bestanden ingelezen zijn
function wtStageFiles(input){
  var files=(input&&input.files)?[].slice.call(input.files):[]; if(input) input.value='';
  if(!files.length) return;
  state._wtFiles=state._wtFiles||[];
  var m=$id('wtMsg'); var over=0; var teveel=0; var WT_MAX=10;
  files.forEach(function(f){
    if((state._wtFiles.length+_wtPending)>=WT_MAX){ teveel++; return; }
    if(f.size>22*1024*1024){ over++; return; }
    _wtPending++;
    var rd=new FileReader();
    rd.onload=function(){ _wtPending--; state._wtFiles.push({ id:'wt'+(++_wtFileSeq), name:f.name, type:f.type||'', size:f.size, dataUrl:String(rd.result||'') }); _wtRenderTray(); };
    rd.onerror=function(){ _wtPending--; var mm=$id('wtMsg'); if(mm) mm.innerHTML='<span style="color:var(--s27-orange-ink,#C44514)">'+escapeHtml(f.name)+' kon niet gelezen worden.</span>'; };
    rd.readAsDataURL(f);
  });
  var melding=[];
  if(over) melding.push(over+' bestand(en) overgeslagen: te groot (max 22 MB).');
  if(teveel) melding.push('Maximaal '+WT_MAX+' bijlagen per ticket.');
  if(m) m.innerHTML = melding.length ? '<span style="color:var(--s27-orange-ink,#C44514)">'+melding.join(' ')+'</span>' : '';
}
function wtUnstage(id){ state._wtFiles=(state._wtFiles||[]).filter(function(f){return f.id!==id;}); _wtRenderTray(); }
function wtRender(){
  var el=$id('webTicket'); if(!el) return;
  // WS-2 sales-reflex: eerst de juiste rail kiezen — defect = gratis support, iets
  // nieuws/prijs = offerte-flow (geen gratis support voor saleswerk).
  if(state._wtStep!=='form'){
    el.innerHTML='<div class="mp-modal" onclick="event.stopPropagation()">'
      +'<div class="mp-head"><span class="mp-back-sp"></span><div class="mp-head-c"><span class="mp-head-eyebrow">Website-support</span><b>Waarmee kunnen we je helpen?</b></div><button class="mp-close" onclick="closeWebTicket()" aria-label="Sluiten">'+ic('plus',22)+'</button></div>'
      +'<div class="mp-scroll"><div class="wt-keuze">'
        +'<button class="contact-card br-green" onclick="state._wtStep=\'form\';wtRender()"><span class="cc-ic">'+ic('st_feedback',24)+'</span><b>Er is iets stuk of werkt niet</b><span>Een fout, kapotte pagina of formulier dat niet doet wat het moet — wij fixen het.</span><span class="cc-go">Meld het probleem '+ic('arrow',14)+'</span></button>'
        +'<button class="contact-card br-blue" onclick="closeWebTicket();setTimeout(function(){openOfferteWizard(\'website\');},150)"><span class="cc-ic">'+ic('plus',24)+'</span><b>Ik wil iets nieuws of een prijs</b><span>Een extra pagina, uitbreiding of vernieuwing? Dan stellen we graag een offerte op.</span><span class="cc-go">Naar de aanvraag '+ic('arrow',14)+'</span></button>'
      +'</div></div></div>';
    return;
  }
  el.innerHTML='<div class="mp-modal" onclick="event.stopPropagation()">'
    +'<div class="mp-head"><span class="mp-back-sp"></span><div class="mp-head-c"><span class="mp-head-eyebrow">Website-support</span><b>Ticket aanvragen</b></div><button class="mp-close" onclick="closeWebTicket()" aria-label="Sluiten">'+ic('plus',22)+'</button></div>'
    +'<div class="mp-scroll">'
      +'<p class="mp-intro">Beschrijf kort wat er aan de hand is. Ons webteam pakt je vraag op, je volgt het ticket onder <b>Projecten</b> en je krijgt een melding zodra de status verandert.</p>'
      +'<label style="display:block;font:700 12px var(--font-display);color:var(--ink-3);margin:0 0 6px">Onderwerp</label>'
      +'<input id="wtSubj" type="text" maxlength="120" placeholder="Bv. Contactformulier werkt niet" style="width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid var(--line);border-radius:12px;font:600 14px Nunito,sans-serif;margin-bottom:14px">'
      +'<label style="display:block;font:700 12px var(--font-display);color:var(--ink-3);margin:0 0 6px">Omschrijving</label>'
      +'<textarea id="wtBody" rows="6" placeholder="Wat zie je, op welke pagina, en wat verwacht je?" style="width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid var(--line);border-radius:12px;font:600 14px Nunito,sans-serif;resize:vertical;margin-bottom:12px"></textarea>'
      +'<div class="chat-tray" id="wtTray" style="margin-bottom:8px">'+_wtChipsHTML()+'</div>'
      +'<label class="btn btn-outline btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">'+ic('upload',14)+' Bijlagen toevoegen (meerdere mogelijk)<input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" style="display:none" onchange="wtStageFiles(this)"></label>'
      +'<div id="wtMsg" style="min-height:18px;margin:10px 0 0;font:600 13px Nunito,sans-serif"></div>'
      +'<div style="padding:16px 0 22px"><button class="btn btn-branch br-green" id="wtSend" onclick="submitWebTicket(this)">'+ic('send',16)+' Ticket versturen</button></div>'
    +'</div></div>';
}
async function submitWebTicket(btn){
  var subj=((($id('wtSubj')||{}).value)||'').trim();
  var bodyTx=((($id('wtBody')||{}).value)||'').trim();
  var m=$id('wtMsg');
  if(!subj){ var si=$id('wtSubj'); if(si){ si.style.borderColor='var(--s27-orange)'; si.focus(); } if(m) m.innerHTML='<span style="color:var(--ink-3)">Geef even een onderwerp mee.</span>'; return; }
  if(btn){ btn.disabled=true; btn.innerHTML='Versturen…'; }
  // FileReader-race: net-gekozen bestanden kunnen nog aan het inlezen zijn — even wachten (max ~8s)
  for(var w=0; w<80 && _wtPending>0; w++){ if(m&&w===4) m.innerHTML='<span style="color:var(--ink-3)">Bestanden voorbereiden…</span>'; await new Promise(function(r){ setTimeout(r,100); }); }
  var files=(state._wtFiles||[]).slice();
  if(state.demoMode || !state.session){ if(btn) btn.innerHTML=ic('check',15)+' Verstuurd (demo)'; if(m) m.innerHTML='<span style="color:var(--s27-green-ink,#147A50)">Je ticket staat genoteerd'+(files.length?' met '+files.length+' bijlage(n)':'')+' (voorbeeldweergave).</span>'; setTimeout(closeWebTicket,1600); return; }
  var fail=function(){ if(btn){ btn.disabled=false; btn.innerHTML=ic('send',16)+' Ticket versturen'; } if(m) m.innerHTML='<span style="color:var(--s27-orange-ink,#C44514)">Versturen lukte niet. Probeer opnieuw of stuur ons een bericht via de chat.</span>'; };
  try{
    // 1) ticket aanmaken (tekst); bedrijfsnaam + contactpersoon resolvet de worker server-side
    var r=await api(ENDPOINTS.ticketCreate, { onderwerp:subj, omschrijving:bodyTx });
    var d=(r&&r.data)?r.data:(r&&r.ok!==undefined?r:null);
    if(!(d&&d.ok&&d.ticket_id)){ fail(); return; }
    // 2) bijlagen sequentieel (1 bestand per call, fail-soft per bestand) met voortgang
    var mislukt=0;
    for(var i=0;i<files.length;i++){
      if(m) m.innerHTML='<span style="color:var(--ink-3)">Bijlage '+(i+1)+'/'+files.length+' uploaden…</span>';
      var f=files[i]; var b64=String(f.dataUrl||'').split(',')[1]||''; if(!b64){ mislukt++; continue; }
      try{
        var ar=await api(ENDPOINTS.ticketAttach, { ticket_id:d.ticket_id, filename:f.name, file_data:b64 });
        var ad=(ar&&ar.data)?ar.data:(ar&&ar.ok!==undefined?ar:null);
        if(!(ad&&ad.ok)) mislukt++;
      }catch(e){ mislukt++; }
    }
    state._wtFiles=[];
    if(m) m.innerHTML='<span style="color:var(--s27-green-ink,#147A50)">'+ic('check',14)+' Je ticket staat genoteerd'+(files.length?(' ('+(files.length-mislukt)+'/'+files.length+' bijlagen meegestuurd)'):'')+'. Je volgt het onder Projecten en krijgt een melding bij elke update.</span>'
      +(mislukt?'<br><span style="color:var(--s27-orange-ink,#C44514)">'+mislukt+' bijlage(n) konden niet mee — stuur ze gerust na via de chat van het ticket.</span>':'');
    if(btn) btn.innerHTML=ic('check',15)+' Verstuurd ✓';
    setTimeout(closeWebTicket, mislukt?3500:2000);
  }catch(e){ fail(); }
}
/* ---- Nieuwe social post aanmaken (Cluster R) — enkel met 'Socials-bewerkbaar'-recht ----
   mp-overlay met datum/tijd, kanalen, caption, visual-upload en live mockup-preview.
   Submit -> worker metricoolCreate: de post wordt als CONCEPT ingepland (team finaliseert). */
function scEl(){ var el=$id('socCreate'); if(!el){ el=document.createElement('div'); el.id='socCreate'; el.className='mp-overlay'; el.addEventListener('mousedown',function(e){ el._downScrim=(e.target===el); }); el.addEventListener('click',function(e){ if(e.target===el && el._downScrim) closeSocialCreate(); }); document.body.appendChild(el); } return el; }
function scEsc(e){ if(e.key==='Escape') closeSocialCreate(); }
function closeSocialCreate(){ var el=$id('socCreate'); if(el){ el.classList.remove('show'); el.innerHTML=''; } document.removeEventListener('keydown',scEsc); document.body.classList.remove('mp-lock'); state._sc=null; }
function openSocialCreate(){
  var d=new Date(Date.now()+2*86400000);   // voorstel: overmorgen 10:00
  var p2=function(n){return (n<10?'0':'')+n;};
  state._sc={ nets:['instagram'], media:[], text:'', date:d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()), time:'10:00', busy:false };
  var el=scEl(); el.classList.add('show'); document.body.classList.add('mp-lock');
  document.addEventListener('keydown',scEsc);
  scRender();
}
function scMockHTML(){
  var s=state._sc||{};
  var net=(s.nets&&s.nets[0])||'instagram';
  return socialPhoneMock({ brand:(typeof _socAccountName==='function'?_socAccountName(net):''), caption:s.text||'', net:net, format:'feed', mediaArr:(s.media||[]) });
}
function scRender(){
  var el=$id('socCreate'); if(!el||!state._sc) return;
  var s=state._sc;
  var CHAN=['facebook','instagram','linkedin','tiktok','youtube','gbp'];
  var chans=CHAN.map(function(net){
    var on=s.nets.indexOf(net)>=0;
    var n=mcNet(net);
    return '<button type="button" class="soc-chic'+(on?' on':'')+'" style="--cn:'+n[1]+'" data-net="'+net+'" title="'+escapeHtml(n[0])+'" onclick="scToggleNet(\''+net+'\')">'+mcNetIcon(net)+'</button>';
  }).join('');
  el.innerHTML='<div class="mp-modal ow-modal" onclick="event.stopPropagation()">'
    +'<div class="mp-head"><span class="mp-back-sp"></span><div class="mp-head-c"><span class="mp-head-eyebrow">Socials</span><b>Nieuwe post</b></div><button class="mp-close" onclick="closeSocialCreate()" aria-label="Sluiten">'+ic('plus',22)+'</button></div>'
    +'<div class="mp-scroll"><div class="sc-grid">'
      +'<div class="sc-pv" id="scPv">'+scMockHTML()+'</div>'
      +'<div class="sc-form">'
        +'<p class="mp-intro" style="margin-top:0">Stel je post samen — wij plannen ’m in als <b>concept</b> en finaliseren de publicatie voor je.</p>'
        +'<label class="soc-elab">Kanalen</label><div class="soc-chics">'+chans+'</div>'
        +'<label class="soc-elab">Wanneer</label>'
        +'<div style="display:flex;gap:9px;flex-wrap:wrap"><input type="date" id="scDate" value="'+escapeHtml(s.date)+'" onchange="state._sc.date=this.value" style="padding:10px 12px;border:1px solid var(--line);border-radius:11px;font:600 14px Nunito,sans-serif"><input type="time" id="scTime" value="'+escapeHtml(s.time)+'" onchange="state._sc.time=this.value" style="padding:10px 12px;border:1px solid var(--line);border-radius:11px;font:600 14px Nunito,sans-serif"></div>'
        +'<label class="soc-elab">Tekst &amp; hashtags</label><textarea id="scCap" class="soc-cap" rows="7" oninput="state._sc.text=this.value;scSyncMock()" placeholder="Schrijf je caption…">'+escapeHtml(s.text||'')+'</textarea>'
        +'<label class="soc-elab">Visual</label>'
        +'<div class="soc-visrow"><button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById(\'scFile\').click()">'+ic('upload',15)+' Upload foto/video</button><input type="file" id="scFile" accept="image/*,video/*" style="display:none" onchange="scUpload(this)"></div>'
        +'<div id="scUpMsg" class="fs" style="margin-top:7px;min-height:16px">'+(s.media.length?('📎 '+s.media.length+' visual(s) toegevoegd'):'')+'</div>'
        +'<div id="scMsg" style="min-height:18px;margin-top:6px;font:600 13px Nunito,sans-serif"></div>'
      +'</div>'
    +'</div></div>'
    +'<div class="mp-foot"><button class="btn btn-branch br-yellow mp-confirm" id="scSend" onclick="scSubmit(this)">'+ic('send',16)+' Inplannen als concept</button></div></div>';
}
function scToggleNet(net){ var s=state._sc; if(!s) return; var i=s.nets.indexOf(net); if(i>=0){ if(s.nets.length>1) s.nets.splice(i,1); } else s.nets.push(net); scRender(); }
function scSyncMock(){ var pv=$id('scPv'); if(pv) pv.innerHTML=scMockHTML(); }
async function scUpload(input){
  var f=input&&input.files&&input.files[0]; if(!f) return; input.value='';
  var m=$id('scUpMsg');
  if(f.size>22*1024*1024){ if(m) m.innerHTML='<span style="color:var(--s27-orange-ink,#C44514)">Bestand te groot (max 22 MB).</span>'; return; }
  if(m) m.innerHTML='Uploaden…';
  if(state.demoMode || !state.session){ state._sc.media.push(URL.createObjectURL(f)); scSyncMock(); if(m) m.textContent='📎 '+state._sc.media.length+' visual(s) toegevoegd (demo)'; return; }
  try{
    var b64=await _fileToBase64(f);
    var r=await api(ENDPOINTS.metricoolMediaUpload, { filename:f.name, content_type:f.type, file_data:String(b64).split(',')[1]||'' });
    var d=(r&&r.ok&&r.data)?r.data:null;
    if(d&&d.ok&&d.url){ state._sc.media.push(d.url); scSyncMock(); if(m) m.textContent='📎 '+state._sc.media.length+' visual(s) toegevoegd'; }
    else { if(m) m.innerHTML='<span style="color:var(--s27-orange-ink,#C44514)">Upload lukte niet'+((d&&d.message)?(': '+escapeHtml(d.message)):'')+'.</span>'; }
  }catch(e){ if(m) m.innerHTML='<span style="color:var(--s27-orange-ink,#C44514)">Upload lukte niet.</span>'; }
}
async function scSubmit(btn){
  var s=state._sc; if(!s||s.busy) return;
  var m=$id('scMsg');
  if(!String(s.text||'').trim() && !s.media.length){ if(m) m.innerHTML='<span style="color:var(--ink-3)">Schrijf een tekst of voeg een visual toe.</span>'; return; }
  if(!s.date||!s.time){ if(m) m.innerHTML='<span style="color:var(--ink-3)">Kies een datum en tijd.</span>'; return; }
  if(btn){ btn.disabled=true; btn.innerHTML='Inplannen…'; }
  if(state.demoMode || !state.session){ if(m) m.innerHTML='<span style="color:var(--s27-green-ink,#147A50)">'+ic('check',14)+' Ingepland als concept (voorbeeldweergave).</span>'; if(btn) btn.innerHTML=ic('check',15)+' Ingepland ✓'; setTimeout(closeSocialCreate,1500); return; }
  s.busy=true;
  try{
    var r=await api(ENDPOINTS.metricoolCreate, { text:s.text||'', providers:s.nets, media:s.media, date:s.date+'T'+s.time+':00' });
    var d=(r&&r.data)?r.data:null;
    if(d&&d.ok){
      if(m) m.innerHTML='<span style="color:var(--s27-green-ink,#147A50)">'+ic('check',14)+' Je post staat als concept in de planning. Wij finaliseren de publicatie.</span>';
      if(btn) btn.innerHTML=ic('check',15)+' Ingepland ✓';
      try{ state.data.metricool=null; await S27DATA.loadMetricool(); var box=document.getElementById('socialBody'); if(box&&typeof socialBodyHTML==='function') box.innerHTML=socialBodyHTML(); }catch(e){}
      setTimeout(closeSocialCreate,1800);
    } else {
      s.busy=false;
      if(btn){ btn.disabled=false; btn.innerHTML=ic('send',16)+' Inplannen als concept'; }
      if(m) m.innerHTML='<span style="color:var(--s27-orange-ink,#C44514)">'+escapeHtml((d&&d.message)||'Inplannen lukte niet. Probeer opnieuw.')+'</span>';
    }
  }catch(e){
    s.busy=false;
    if(btn){ btn.disabled=false; btn.innerHTML=ic('send',16)+' Inplannen als concept'; }
    if(m) m.innerHTML='<span style="color:var(--s27-orange-ink,#C44514)">Inplannen lukte niet. Probeer opnieuw.</span>';
  }
}
/* ---- Meeting per tak / per project (Dakstructuur Q): juiste teamlid komt uit p.sae via mpHostStep ---- */
function openMeetingPlannerForTak(takKey){
  openMeetingPlanner('project');
  try{
    var T=(typeof TAK_TABS!=='undefined'&&TAK_TABS[takKey])||(takKey==='webprestaties'?TAK_WEBSITE:null);
    if(!T||!state.mp) return;
    var ids=T.discIds;
    var projs=(mpActiveProjects()||[]).filter(function(p){ var ls=(p.labels&&p.labels.length)?p.labels:[{discId:p.discId}]; return ls.some(function(l){ return ids.indexOf(l.discId)>=0; }); });
    if(projs.length===1 && typeof mpPickProject==='function'){ mpPickProject(projs[0].id); }
  }catch(e){}
}
function openMeetingPlannerForProject(id){ openMeetingPlanner('project'); try{ if(typeof mpPickProject==='function') mpPickProject(id); }catch(e){} }
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
  const durMs=60*60000; const slots=computeFreeFromBusy(busy,durMs);
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
  return '<p class="fs" style="margin:0 0 10px;color:var(--ink-3)">Live uit de agenda van <b>'+escapeHtml(state.meetCtx.who)+'</b> · ± 1 uur. Blader per week tot een maand vooruit:</p>'
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
/* =============================================================================
   MEETING-PLANNER — schermvullende plan-tunnel (Algemene meeting / Projectmeeting /
   Nieuw project). Vervangt de oude smalle zijbalk-picker. Eén overlay op <body>
   (zoals metaLightbox), ESC + scrim-klik sluiten. Flow:
     algemeen → Ilke · project → kies project → kies Ilke of projectlead · nieuw → Arne
   → schermvullende 14-daagse beschikbaarheid + tips → echte boeking via
   ENDPOINTS.meetingBook (Google-agenda + invite). Valt vóór de worker-deploy terug op
   directMessage; demoMode toont een mock-bevestiging.
   ============================================================================= */
const MP_HOSTS = {
  ilke: { email:'ilke@studio27.be', naam:'Ilke', rol:'Accountmanager', color:'blue' },
  arne: { email:'arne@studio27.be', naam:'Arne', rol:'Zaakvoerder',    color:'orange' },
};
const MP_DOW = ['ma','di','wo','do','vr','za','zo'];
const MP_MA  = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const MP_DAYS_FULL = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];

function mpEl(){
  var el=$id('meetPlanner');
  if(!el){ el=document.createElement('div'); el.id='meetPlanner'; el.className='mp-overlay';
    // Sluit enkel als de pointer ZOWEL begon ALS eindigde op de scrim zelf (niet op de
    // modal-inhoud). Een klik op een knop die de overlay opnieuw rendert detacht zijn node
    // mid-event; deze mousedown-guard voorkomt dat zo'n klik per ongeluk de overlay sluit.
    el.addEventListener('mousedown',function(e){ el._downScrim=(e.target===el); });
    el.addEventListener('click',function(e){ if(e.target===el && el._downScrim) closeMeetingPlanner(); });
    document.body.appendChild(el); }
  return el;
}
function mpEsc(e){ if(e.key==='Escape') closeMeetingPlanner(); }
function closeMeetingPlanner(){
  var el=$id('meetPlanner'); if(el){ el.classList.remove('show'); el.innerHTML=''; }
  document.removeEventListener('keydown',mpEsc);
  document.body.classList.remove('mp-lock');
  var wasMeetings = (typeof currentTab!=='undefined' && currentTab==='meetings');
  state.mp=null;
  // na een boeking: meetinglijst verversen zodat een nieuwe afspraak straks verschijnt.
  if(wasMeetings){ try{ if(!state.demoMode) state.data.meetings=null; goTab('meetings'); }catch(e){} }
}
function openMeetingPlanner(mode){
  state.mp={ mode:(mode==='project'||mode==='nieuw')?mode:'algemeen', step:'', project:null,
             hostKey:'', host:null, online:true, note:'', dur:60*60000,
             slots:null, byDay:null, weekStart:0, selDay:null, selSlot:null, _err:'', booking:false };
  var s=state.mp;
  if(s.mode==='project'){ s.step='project'; }
  else if(s.mode==='nieuw'){ s.hostKey='arne'; s.host=Object.assign({},MP_HOSTS.arne); s.step='cal'; }
  else { s.hostKey='ilke'; s.host=Object.assign({},MP_HOSTS.ilke); s.step='cal'; }
  var el=mpEl(); el.classList.add('show'); document.body.classList.add('mp-lock');
  document.addEventListener('keydown',mpEsc);
  mpRender();
  if(s.step==='cal') mpLoadAvail();
}
function mpRender(){
  var el=$id('meetPlanner'); if(!el||!state.mp) return;
  var s=state.mp, body;
  if(s.step==='project') body=mpProjectStep();
  else if(s.step==='host') body=mpHostStep();
  else if(s.step==='cal') body=mpCalStep();
  else if(s.step==='done') body=(s._doneHTML||'');
  el.innerHTML='<div class="mp-modal" onclick="event.stopPropagation()">'+mpHeader()+'<div class="mp-scroll">'+body+'</div></div>';
}
function mpHeader(){
  var s=state.mp;
  var titles={ project:'Over welk project?', host:'Met wie wil je samenzitten?', cal:'Kies een moment', done:'Gepland' };
  var canBack=(s.step==='host')||(s.step==='cal'&&s.mode==='project');
  var back=canBack?'<button class="mp-back" onclick="mpBack()">'+ic('arrow',16)+'</button>':'<span class="mp-back-sp"></span>';
  return '<div class="mp-head">'+back
    +'<div class="mp-head-c"><span class="mp-head-eyebrow">Plan een meeting</span><b>'+escapeHtml(titles[s.step]||'Plan een meeting')+'</b></div>'
    +'<button class="mp-close" onclick="closeMeetingPlanner()" aria-label="Sluiten">'+ic('plus',22)+'</button></div>';
}
function mpBack(){ var s=state.mp; if(!s)return;
  if(s.step==='cal'&&s.mode==='project'){ s.step='host'; mpRender(); }
  else if(s.step==='host'){ s.step='project'; mpRender(); }
}
/* ---- stap: projectkeuze (actieve + recent afgeronde projecten, ≤60 dagen) ---- */
function mpActiveProjects(){
  var out=[];
  try{
    (_nonAdProjects()||[]).filter(function(p){ return p.status!=='done'; }).forEach(function(p){
      out.push({ id:p.id, name:p.name, br:p.br||'blue', disc:p.disc||'', sae:p.sae||[], done:false }); });
    var done=(window.S27DATA&&S27DATA.done&&S27DATA.done())||[];
    done.forEach(function(p){ if(!out.some(function(x){return x.id===p.id;}))
      out.push({ id:p.id, name:p.name, br:p.br||'blue', disc:p.disc||'', sae:[], done:true }); });
  }catch(e){}
  return out;
}
function mpProjectStep(){
  var projs=mpActiveProjects();
  if(!projs.length) return '<div class="mp-empty">'+ic('cal',40)
    +'<b>Geen lopende projecten</b><p>Je hebt momenteel geen actief project om over samen te zitten. Wil je iets nieuws opstarten?</p>'
    +'<button class="btn btn-branch br-orange btn-sm" onclick="openMeetingPlanner(\'nieuw\')">Plan een gesprek over een nieuw project '+ic('arrow',15)+'</button></div>';
  return '<p class="mp-intro">Kies het project waarover je wil samenzitten — je projecten van de afgelopen 60 dagen.</p>'
    +'<div class="mp-projlist">'+projs.map(function(p){
      var sae=(typeof saeNames==='function')?saeNames(p.sae):'';
      return '<button class="mp-proj br-'+p.br+'" onclick="mpPickProject(\''+escapeHtml(p.id)+'\')">'
        +'<span class="mp-proj-dot"></span><span class="mp-proj-tx"><b>'+escapeHtml(p.name)+'</b>'
        +'<span>'+escapeHtml(p.disc)+(p.done?' · afgerond':'')+(sae?' · '+sae:'')+'</span></span>'+ic('arrow',16)+'</button>';
    }).join('')+'</div>';
}
function mpPickProject(id){
  var s=state.mp; if(!s)return;
  s.project=mpActiveProjects().find(function(x){return x.id===id;})||{ id:id, name:'Project', sae:[] };
  s.step='host'; mpRender();
}
/* ---- stap: hostkeuze (Ilke vs het teamlid dat het project droeg) ---- */
function mpLeadName(p){ if(!p)return ''; var sae=p.sae||[]; var n=sae.map(function(x){return x.naam;}).filter(Boolean); return n.join(' & '); }
function mpHostStep(){
  var s=state.mp; var lead=mpLeadName(s.project);
  return '<p class="mp-intro">Met wie wil je <b>'+escapeHtml(s.project?s.project.name:'dit project')+'</b> overlopen?</p>'
    +'<div class="mp-hosts">'
    +mpHostCard('ilke','Ilke','Accountmanager','Overzicht, planning & samenwerking','blue')
    +mpHostCard('lead',(lead||'Je projectteam'),'Wie eraan werkte','Inhoudelijk de diepte in','purple')
    +'</div>';
}
function mpHostCard(key,naam,rol,tag,color){
  return '<button class="mp-host br-'+color+'" onclick="mpPickHost(\''+key+'\')">'
    +'<span class="mp-host-av" style="background:var(--s27-'+color+')">'+escapeHtml(String(naam||'?').charAt(0).toUpperCase())+'</span>'
    +'<span class="mp-host-tx"><b>'+escapeHtml(naam)+'</b><span class="mp-host-rol">'+escapeHtml(rol)+'</span>'
    +'<span class="mp-host-tag">'+escapeHtml(tag)+'</span></span>'+ic('arrow',16)+'</button>';
}
function mpPickHost(key){
  var s=state.mp; if(!s)return;
  if(key==='ilke'){ s.hostKey='ilke'; s.host=Object.assign({},MP_HOSTS.ilke); }
  else { s.hostKey='lead'; s.host={ email:'', naam:(mpLeadName(s.project)||'je projectteam'), rol:'Projectlead', color:'purple' }; }
  s.step='cal'; mpRender(); mpLoadAvail();
}
/* ---- stap: beschikbaarheid laden ---- */
function mpDemoBusy(){ var n=Date.now(); return [
  {start:n+3*864e5+3*36e5,end:n+3*864e5+5*36e5},
  {start:n+4*864e5+6*36e5,end:n+4*864e5+75*36e5/10},
  {start:n+8*864e5+2*36e5,end:n+8*864e5+9*36e5} ]; }
async function mpLoadAvail(){
  var s=state.mp; if(!s)return;
  s.slots=null; s._err=''; s.selDay=null; s.selSlot=null; mpRender();   // null = laad-toestand
  var durMs=60*60000;
  try{
    if(s.hostKey==='lead' && s.project){
      if(state.demoMode){ s.slots=computeFreeFromBusy(mpDemoBusy(),durMs); }
      else {
        var van=Date.now(), tot=Date.now()+21*86400000;
        var res=await api(ENDPOINTS.beschikbaarheid,{ task_id:s.project.id, van:String(van), tot:String(tot) });
        var d=(res&&res.ok&&res.data&&res.data.ok)?res.data:null;
        if(d&&d.no_member){ s._err='no_member'; mpRender(); return; }
        if(!d){ s._err='load'; mpRender(); return; }
        durMs=planDurMs(d.taak_est);
        if(d.assignee_naam) s.host.naam=d.assignee_naam;
        s.host.email=String(d.assignee_emails||d.assignee_email||'').split(',').map(function(x){return x.trim();}).filter(Boolean)[0]||'';
        s.slots=computeFreeSlots(d.blokken,durMs);
      }
    } else {
      if(state.demoMode){ s.slots=computeFreeFromBusy(mpDemoBusy(),durMs); }
      else {
        var r2=await api(ENDPOINTS.meetingAvailability,{});
        if(!(r2&&r2.data&&r2.data.ok)){ s._err='load'; mpRender(); return; }
        var cal=((r2.data.calendars)||{})[s.host.email]||{};
        var busy=(cal.busy||[]).map(function(b){return {start:new Date(b.start).getTime(),end:new Date(b.end).getTime()};})
                               .filter(function(b){return b.end>b.start;});
        s.slots=computeFreeFromBusy(busy,durMs);
      }
    }
  }catch(e){ s._err='load'; mpRender(); return; }
  s.dur=durMs;
  // beperk tot het betrouwbare beschikbaarheidsvenster (~19 dagen) zodat we nooit
  // vals-vrije dagen buiten de free/busy-horizon tonen.
  s.slots=(s.slots||[]).filter(function(ms){ return ms<=Date.now()+19*86400000; });
  if(s.slots.length){
    var byDay={}; s.slots.forEach(function(ms){ var k=_dayKey(ms); (byDay[k]=byDay[k]||[]).push(ms); });
    s.byDay=byDay; s.weekStart=_monday(s.slots[0]);
  } else { s.byDay={}; }
  mpRender();
}
/* ---- stap: kalender + tijdsloten + tips + bevestig ---- */
function mpCalStep(){
  var s=state.mp;
  var color=(s.host&&s.host.color)||'blue';
  var hostNaam=(s.host&&s.host.naam)||'Studio 27';
  var rol=(s.host&&s.host.rol)||'';
  var ctxLine = s.mode==='nieuw' ? 'Kennismaking over een nieuw project'
    : (s.mode==='project'&&s.project ? ('Over '+escapeHtml(s.project.name)) : 'Bijpraten over de samenwerking');
  var banner='<div class="mp-hostbar br-'+color+'"><span class="mp-host-av" style="background:var(--s27-'+color+')">'
    +escapeHtml(String(hostNaam||'?').charAt(0).toUpperCase())+'</span><span class="mp-host-tx"><b>'+escapeHtml(hostNaam)+'</b>'
    +'<span class="mp-host-rol">'+escapeHtml(rol)+(rol?' · ':'')+ctxLine+'</span></span></div>';
  var toggle='<div class="mp-toggle">'
    +'<button type="button" class="mp-tg'+(s.online?' on':'')+'" onclick="mpSetOnline(true)">'+ic('video',15)+' Online (Meet)</button>'
    +'<button type="button" class="mp-tg'+(!s.online?' on':'')+'" onclick="mpSetOnline(false)">'+ic('pin',15)+' Bij Studio 27</button></div>';
  var note = s.mode==='nieuw'
    ? '<div class="mp-note"><label class="mp-lbl">Waar gaat het over? <span>(optioneel)</span></label><textarea id="mpNote" rows="2" placeholder="Vertel kort wat je idee of vraag is…" oninput="if(state.mp)state.mp.note=this.value">'+escapeHtml(s.note||'')+'</textarea></div>'
    : '';
  var avail='<div id="mpAvailMount" class="mp-availwrap">'+mpAvailHTML()+'</div>';
  var tips=mpTipsHTML();
  var foot='<div class="mp-foot"><button type="button" class="btn btn-branch br-'+color+' mp-confirm" id="mpConfirm" '
    +(s.selSlot?'':'disabled')+' onclick="mpBook()">'+(s.selSlot?('Bevestig '+escapeHtml(mpSlotLabel(s.selSlot))):'Kies eerst een moment')+'</button></div>';
  return banner+toggle+note+avail+tips+foot;
}
function mpAvailHTML(){
  var s=state.mp;
  if(s._err==='no_member') return '<div class="mp-notebox">Voor dit project is nog geen vaste contactpersoon toegewezen. Kies hierboven <b>Terug → Ilke</b>, of stuur ons een berichtje — dan koppelen we je meteen aan de juiste persoon.</div>';
  if(s._err) return '<div class="mp-notebox">De agenda kon even niet geladen worden. Probeer het zo opnieuw of stuur ons gerust een berichtje.</div>';
  if(s.slots===null) return '<div class="mp-loading"><div class="brand-spinner"></div><span>Vrije momenten ophalen…</span></div>';
  if(!s.slots.length) return '<div class="mp-notebox">Geen vrije momenten in de komende twee weken. Stuur ons gerust een berichtje, dan zoeken we samen iets dat past.</div>';
  return mpCalGrid()+'<div id="mpSlots" class="mp-slots">'+mpSlotsHTML(s.selDay)+'</div>';
}
function mpCalGrid(){
  var s=state.mp, ws=s.weekStart;
  var firstMon=_monday(s.slots[0]), lastMon=_monday(s.slots[s.slots.length-1]);
  var canPrev=ws>firstMon, canNext=lastMon>=ws+14*864e5;
  var lab=new Date(ws).getDate()+' '+MP_MA[new Date(ws).getMonth()]+' – '+new Date(ws+13*864e5).getDate()+' '+MP_MA[new Date(ws+13*864e5).getMonth()];
  var head=''; for(var i=0;i<7;i++) head+='<span class="mp-cal-dow">'+MP_DOW[i]+'</span>';
  var cells=''; var todK=_dayKey(Date.now());
  for(var dd=0; dd<14; dd++){
    var dms=ws+dd*864e5, k=_dayKey(dms), arr=s.byDay[k]||[], has=arr.length>0, dt=new Date(dms);
    var cls='mp-cal-day'+(has?' free':' off')+(s.selDay===k?' sel':'')+(k===todK?' today':'');
    cells+='<button type="button" class="'+cls+'" '+(has?('onclick="mpPickDay(\''+k+'\')"'):'disabled')+'>'
      +'<span class="mp-cal-dnum">'+dt.getDate()+'</span><span class="mp-cal-mon">'+MP_MA[dt.getMonth()]+'</span>'
      +(has?('<span class="mp-cal-cnt">'+arr.length+' vrij</span>'):'<span class="mp-cal-cnt mp-cal-cnt-off">—</span>')+'</button>';
  }
  return '<div class="mp-cal"><div class="mp-cal-nav">'
    +'<button type="button" class="mp-cal-arrow" '+(canPrev?'':'disabled')+' onclick="mpCalNav(-1)">‹</button>'
    +'<b>'+lab+'</b>'
    +'<button type="button" class="mp-cal-arrow" '+(canNext?'':'disabled')+' onclick="mpCalNav(1)">›</button></div>'
    +'<div class="mp-cal-head">'+head+'</div><div class="mp-cal-grid">'+cells+'</div></div>';
}
function mpSlotsHTML(k){
  var s=state.mp;
  if(!k) return '<div class="mp-slots-hint">'+ic('clock',15)+' Kies hierboven een dag om de vrije momenten te zien.</div>';
  var arr=s.byDay[k]||[]; if(!arr.length) return '<div class="mp-slots-hint">Geen vrije momenten op deze dag.</div>';
  var dt=new Date(arr[0]); var lab=MP_DAYS_FULL[dt.getDay()]+' '+dt.getDate()+' '+MP_MA[dt.getMonth()];
  return '<div class="mp-slots-lab">Vrije momenten op <b>'+lab+'</b> · ± '+Math.round((s.dur||1800000)/60000)+' min</div>'
    +'<div class="mp-slotgrid">'+arr.map(function(ms){ return '<button type="button" class="mp-slot'+(s.selSlot===ms?' sel':'')+'" data-ms="'+ms+'" onclick="mpPickSlot('+ms+')">'+mpTime(ms)+'</button>'; }).join('')+'</div>';
}
function mpPickDay(k){ var s=state.mp; if(!s)return; s.selDay=k; s.selSlot=null;
  var m=$id('mpAvailMount'); if(m)m.innerHTML=mpAvailHTML(); mpUpdateConfirm(); }
function mpPickSlot(ms){ var s=state.mp; if(!s)return; s.selSlot=ms;
  var box=$id('mpSlots'); if(box)box.querySelectorAll('.mp-slot').forEach(function(b){ b.classList.toggle('sel',Number(b.dataset.ms)===ms); });
  mpUpdateConfirm(); }
function mpCalNav(dir){ var s=state.mp; if(!s||!s.slots||!s.slots.length)return;
  var firstMon=_monday(s.slots[0]); s.weekStart+=dir*14*864e5; if(s.weekStart<firstMon)s.weekStart=firstMon;
  s.selDay=null; s.selSlot=null; var m=$id('mpAvailMount'); if(m)m.innerHTML=mpAvailHTML(); mpUpdateConfirm(); }
function mpSetOnline(v){ var s=state.mp; if(!s)return; s.online=!!v;
  var tg=document.querySelectorAll('#meetPlanner .mp-tg'); if(tg&&tg.length>=2){ tg[0].classList.toggle('on',!!v); tg[1].classList.toggle('on',!v); } }
function mpUpdateConfirm(){ var s=state.mp; var cf=$id('mpConfirm'); if(!cf||!s)return;
  cf.disabled=!s.selSlot; cf.textContent=s.selSlot?('Bevestig '+mpSlotLabel(s.selSlot)):'Kies eerst een moment'; }
function mpTime(ms){ return new Date(ms).toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}); }
function mpSlotLabel(ms){ return new Date(ms).toLocaleString('nl-BE',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
function mpSlotLabelLong(ms){ return new Date(ms).toLocaleString('nl-BE',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}); }
/* ---- tips-strook (à la socials-inzichten) ---- */
function mpTipsHTML(){
  var s=state.mp; var tips=[];
  tips.push(['spark','Online of bij ons?','Kies hierboven een gesprek via Google Meet of een koffie bij ons op kantoor in Rijkevorsel.']);
  if(s.byDay){ var best=null,bestN=-1; Object.keys(s.byDay).forEach(function(k){ var n=s.byDay[k].length; if(n>bestN){bestN=n;best=k;} });
    if(best&&bestN>0){ var dl=MP_DAYS_FULL[new Date(best).getDay()]; tips.push(['clock','Veel ruimte op '+dl,'Op '+dl+' staat de agenda het ruimst — handig als je flexibel bent.']); } }
  tips.push(['info','Kort en krachtig','Reken op ± '+Math.round((s.dur||1800000)/60000)+' minuten. Genoeg om bij te praten of een project te overlopen.']);
  return '<div class="mp-tips"><div class="mp-tips-h">'+ic('spark',15)+' Handig om te weten</div><div class="mp-tips-grid">'
    +tips.map(function(t){ return '<div class="mp-tip"><span class="mp-tip-ic">'+ic(t[0],16)+'</span><div class="mp-tip-tx"><b>'+escapeHtml(t[1])+'</b><span>'+escapeHtml(t[2])+'</span></div></div>'; }).join('')
    +'</div></div>';
}
/* ---- boeking ---- */
function mpClientInfo(){
  var cc=(state.data&&state.data.bedrijf&&state.data.bedrijf.contact)||{};
  var naam=((cc.voornaam||'')+' '+(cc.achternaam||'')).trim();
  var bedrijf=(window.S27DATA&&S27DATA.bedrijfsnaam&&S27DATA.bedrijfsnaam())||'';
  if(!naam) naam=bedrijf;
  var email=cc.email||(state.session&&state.session.email)||'';
  return { naam:naam, email:email, bedrijf:bedrijf };
}
async function mpBook(){
  var s=state.mp; if(!s||!s.selSlot||s.booking) return; s.booking=true;
  var cf=$id('mpConfirm'); if(cf){ cf.disabled=true; cf.textContent='Inplannen…'; }
  var start=s.selSlot, eind=s.selSlot+(s.dur||60*60000);
  var iso=function(ms){ return new Date(ms).toISOString(); };
  var ci=mpClientInfo(); var whenLabel=mpSlotLabelLong(start);
  var hostNaam=(s.host&&s.host.naam)||'Studio 27';
  var titel, beschrijving;
  if(s.mode==='nieuw'){ titel='Nieuw project · '+(ci.bedrijf||'kennismaking'); beschrijving='Kennismaking / nieuw project via het portaal.'+(s.note?(' Onderwerp: '+s.note):''); }
  else if(s.mode==='project'){ titel='Overleg '+((s.project&&s.project.name)||'project')+' · met '+hostNaam; beschrijving='Projectoverleg via het portaal'+(s.project?(' over '+s.project.name):'')+'.'; }
  else { titel='Algemene meeting · '+(ci.bedrijf||''); beschrijving='Algemene meeting (bijpraten over de samenwerking) via het portaal.'; }
  if(state.demoMode){ mpDone(start,'',false); return; }
  var payload={ host_email:(s.host&&s.host.email)||'', host_naam:hostNaam, start:iso(start), eind:iso(eind), start_ms:String(start),
    online:!!s.online, titel:titel, beschrijving:beschrijving, locatie:s.online?'':'Studio 27, Merksplassesteenweg 97 bus 16, 2310 Rijkevorsel',
    client_email:ci.email, client_naam:ci.naam, when_label:whenLabel };
  if(s.mode==='project'&&s.project){ payload.project_task_id=s.project.id; payload.project_naam=s.project.name; }
  if(s.mode==='nieuw') payload.intake=true;
  try{
    var res=await api(ENDPOINTS.meetingBook,payload);
    if(res&&res.ok&&res.data&&res.data.ok){ mpDone(start,res.data.meet_link||'',false); return; }
    // worker nog niet gedeployed (onbekend endpoint) → val terug op een aanvraag-bericht.
    var notDeployed = !res || res.status===404 || res.status===0 || (res.data&&(res.data.error==='unknown_endpoint'||res.data._raw!=null));
    if(notDeployed){ try{ await mpFallbackRequest(s,whenLabel,ci); }catch(e){} mpDone(start,'',true); return; }
    throw new Error('book_failed');
  }catch(e){
    s.booking=false; var cf2=$id('mpConfirm'); if(cf2){ cf2.disabled=false; cf2.textContent='Opnieuw proberen'; }
    var mnt=$id('mpAvailMount'); if(mnt){ var w=document.createElement('div'); w.className='mp-notebox mp-notebox-err'; w.textContent='Het inplannen lukte niet. Probeer het zo opnieuw of stuur ons een berichtje.'; mnt.insertBefore(w,mnt.firstChild); }
  }
}
async function mpFallbackRequest(s,whenLabel,ci){
  var who=(s.host&&s.host.naam)||'Studio 27';
  var type = s.mode==='nieuw' ? 'Nieuw project'
    : (s.mode==='project' ? ('Projectoverleg'+((s.project&&s.project.name)?(' · '+s.project.name):'')) : 'Algemene meeting');
  return api(ENDPOINTS.directMessage,{ klant_naam:(ci&&ci.bedrijf)||'', onderwerp:type+'-aanvraag via portaal',
    bericht:'Graag een '+type+' met '+who+' op '+whenLabel+(s.online?' (online via Meet)':' (bij Studio 27)')+(s.note?('. Onderwerp: '+s.note):'')+'.' });
}
function mpDone(start,meetLink,viaRequest){
  var s=state.mp; if(!s)return; s.step='done';
  var color=(s.host&&s.host.color)||'blue';
  var who=(s.host&&s.host.naam)||'Studio 27';
  var when=mpSlotLabelLong(start);
  var sub = viaRequest ? 'We bevestigen je afspraak zo snel mogelijk per mail.'
    : (s.online ? 'Top — je krijgt een agenda-uitnodiging met een Google Meet-link.' : 'Top — je krijgt een agenda-uitnodiging. Tot bij ons in Rijkevorsel!');
  s._doneHTML='<div class="mp-done"><div class="mp-done-ic br-'+color+'">'+ic('st_approved',60)+'</div>'
    +'<b class="mp-done-h">'+(viaRequest?'Aanvraag verstuurd!':'Meeting ingepland!')+'</b>'
    +'<p class="mp-done-when">'+escapeHtml(when)+'<br><span>met '+escapeHtml(who)+'</span></p>'
    +'<p class="mp-done-sub">'+escapeHtml(sub)+'</p>'
    +(meetLink?('<a class="btn btn-branch br-'+color+' btn-sm" href="'+escapeHtml(meetLink)+'" target="_blank" rel="noopener">'+ic('video',15)+' Open Meet-link</a>'):'')
    +'<button class="btn btn-ghost btn-sm" onclick="closeMeetingPlanner()">Sluiten</button></div>';
  mpRender();
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
  state._mcApproved=state._mcApproved||{}; state._mcApproved[id]=true;
  if(window.S27DATA&&S27DATA.markMetricoolApproved) S27DATA.markMetricoolApproved(id);
  // Optimistisch: het actie-blok meteen herrenderen (knop -> 'Goedgekeurd') i.p.v. wachten op de worker.
  // Vroeger bleef de knop op 'Bezig…' hangen bij een trage/falende call — dat is hiermee weg.
  var box=document.getElementById('socEditActsForm');
  if(box){ box.innerHTML=socialEditorActions(id); }
  else if(btn){ btn.disabled=true; btn.innerHTML=ic('check',15)+' Goedgekeurd'; }
  if(!state.demoMode){ api(ENDPOINTS.metricoolApprove, { post_id:id }).catch(function(){}); }  // fire-and-forget
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
function socialToggleChan(btn){ if(!btn) return; btn.classList.toggle('on'); var net=String(btn.getAttribute('data-net')||'').toLowerCase(); if(btn.classList.contains('on')) state._socPreviewNet=net; if(typeof socialSyncMock==='function') socialSyncMock(); }
function _fileToBase64(f){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ res(String(r.result||'')); }; r.onerror=function(){ rej(new Error('read')); }; r.readAsDataURL(f); }); }
// klant uploadt een foto/video -> worker host ze -> publieke URL invullen + preview verversen
async function socialUploadMedia(input){
  var msg=$id('socUpMsg'); var f=input&&input.files&&input.files[0]; if(!f) return;
  if(f.size>22*1024*1024){ if(msg) msg.innerHTML='<span class="soc-saveerr">Dit bestand is te groot voor directe upload (max 22 MB). Plak hieronder een link (bv. WeTransfer of Google Drive), of gebruik een kleinere/gecomprimeerde versie.</span>'; input.value=''; return; }
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
  try { await api(ENDPOINTS.inplannen,{task_id:taskId,list_id:ctx.list_id,start:iso(start),eind:iso(eind),start_ms:String(start),online:!!ctx.online,titel:(ctx.shoot?'Shoot, ':'Afspraak, ')+(p.name||'Studio 27'),beschrijving:'Ingepland via je Studio 27-portaal met '+(ctx.assignee||'het team')+'.',locatie:ctx.online?'':'Studio 27, Merksplassesteenweg 97 bus 16, 2310 Rijkevorsel',attendees:attendees,assignee_naam:ctx.assignee,client_email:cc.email||'',client_naam:clientNaam,bedrijf_id:state.session.bedrijf_id,session_token:state.session.session_token}); done(); }
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
  // ENGINE V2: de server levert een kant-en-klare dagvrij-map (shoots + meetings +
  // goedgekeurde payroll + Google-agenda, na pool-claims). Oude shape blijft als
  // fallback voor de cache-overgang (oude worker-respons of gecachte data).
  const av=ctx.availability||{};
  let free;
  if(av.dagvrij&&typeof av.dagvrij==='object'){ const v=av.dagvrij[ds]; free=(v==null?SHOOT_HOSTS.length:Number(v)); }
  else free=shootFreeHosts(ctx,ds).length;
  if(free>=ctx.aantalCreators)return free===SHOOT_HOSTS.length?'free':'partial';
  return 'full';
}
function shootSlotList(ctx){const dur=shootEffDur(ctx),out=[];for(let h=8;h+dur<=18;h+=0.5){const hh=Math.floor(h),mm=(h%1)*60;out.push(String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'));}return out;}
function shootFormatDate(ds){const d=new Date(ds);return d.getDate()+' '+SHOOT_MONTHS[d.getMonth()]+' '+d.getFullYear();}
function shootStepBar(active){return '<div class="shoot-steps">'+['Wanneer','Details'].map((s,i)=>{const cls=(i+1===active)?'active':((i+1<active)?'done':'');return '<span class="shoot-step '+cls+'"><b>'+(i+1)+'</b> '+s+'</span>';}).join('')+'</div>';}

/* ---- Versie-bewaking (Y): gegarandeerd iedereen op de nieuwste versie ---- */
// Eigen versie zelf-detecterend uit de portal.js-script-tag (?v=N) — geen extra bump-plek.
var APP_VERSION = (function(){
  try{
    var s=document.querySelector('script[src*="portal.js?v="]');
    var m=s&&s.src.match(/[?&]v=(\d+)/);
    return m?Number(m[1]):0;
  }catch(e){ return 0; }
})();
// Check bij boot, bij terugkeer naar de app (PWA!) en elke 5 minuten. Hoger servernummer =
// caches leeg + harde herlaad. Loop-guard: max één poging per gepushte versie per sessie
// (anders zou een te vroege push — vóór de Pages-deploy — eindeloos herladen).
async function checkPortalVersion(){
  if(!APP_VERSION) return;
  var now=Date.now();
  if(state._verLastCheck && (now-state._verLastCheck)<45000) return;   // throttle
  state._verLastCheck=now;
  var target=0;
  // ZELF-VERVERSEND: lees de LIVE index.html (network-first via de SW) en neem de hoogste ?v=N.
  // Zo ververst ELKE Pages-deploy automatisch alle clients — zonder de handmatige 'Push'-knop.
  try{
    var ir=await fetch('/index.html?ts='+now,{cache:'no-store'});
    if(ir&&ir.ok){ var html=await ir.text(); var hi=0,m,re=/[?&]v=(\d+)/g; while((m=re.exec(html))){ var n=Number(m[1])||0; if(n>hi)hi=n; } if(hi>target)target=hi; }
  }catch(e){}
  // Expliciete team-push (KV) blijft als extra forceer-kanaal werken.
  try{
    var r=await fetch(GATEWAY_BASE+'/portalversion',{cache:'no-store'});
    var d=await r.json(); var pv=Number(d&&d.v)||0; if(pv>target)target=pv;
  }catch(e){}
  if(target>APP_VERSION) forcePortalUpdate(target);
}
async function forcePortalUpdate(target){
  // dubbele loop-guard: sessionStorage + in-memory (private-mode/PWA kan storage weigeren)
  window._verTried=window._verTried||{};
  if(window._verTried[target]) return;
  window._verTried[target]=1;
  var k='s27_verupd_'+target;
  try{ if(sessionStorage.getItem(k)) return; sessionStorage.setItem(k,'1'); }catch(e){}
  try{ if(navigator.serviceWorker&&navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({type:'FLUSH'}); }catch(e){}
  try{ var keys=await caches.keys(); await Promise.all(keys.map(function(x){return caches.delete(x);})); }catch(e){}
  try{ var reg=await navigator.serviceWorker.getRegistration(); if(reg) await reg.update(); }catch(e){}
  // gedeelde guard met de SW-controllerchange-reload (index.html) -> nooit dubbel herladen
  if(window.__s27reload) window.__s27reload(); else setTimeout(function(){ location.reload(); }, 350);
}
function startVersionWatch(){
  setTimeout(checkPortalVersion, 4000);                                 // na de boot, niet blokkerend
  setInterval(checkPortalVersion, 300000);                              // elke 5 minuten
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible') checkPortalVersion(); });
}
startVersionWatch();
// Team-knop (Instellingen): duw de versie van DEZE client als minimum naar iedereen.
async function pushPortalVersion(btn){
  if(!APP_VERSION){ alert('Versienummer niet detecteerbaar.'); return; }
  if(!confirm('Versie '+APP_VERSION+' nu hard doorduwen naar alle klanten en teamleden? Iedereen herlaadt automatisch (open formulieren kunnen daarbij verloren gaan).')) return;
  btn.disabled=true; btn.textContent='Pushen\u2026';
  var res; try{ res=await api(ENDPOINTS.portalVersionPush,{version:APP_VERSION}); }catch(e){ res=null; }
  var d=(res&&res.data)||{};
  btn.disabled=false; btn.innerHTML=ic('send',14)+' Push versie '+APP_VERSION+' naar iedereen';
  alert(d.message||((res&&res.ok)?'Versie gepusht.':'Pushen lukte niet \u2014 probeer zo opnieuw.'));
}

/* ---- 🐞 Portaal-feedback (WS-3b, team-only): schermvullende pagina ---- */
// Melder-dropdown = LIVE ClickUp-workspace-leden via het teamLeden-endpoint (Vincent 12-06:
// exact wie in ClickUp assignee kan zijn; wie er niet in zit — zoals Celien nu — staat er
// dus ook niet tussen). Fallback-snapshot wordt enkel gebruikt tot/tenzij de fetch er (niet) is.
var BUG_TEAM_FALLBACK=['Anouk de Hoon','Arne Goetschalckx','Bjorn Borgers','Danique Bosch','Eline Meyvis','Eva Goetschalckx','Griet Beyens','Guus Van den Heuvel','Ilke Meeusen','Ines Permentiers','Johanna Augustyns','Klaas Vanhove','Lara Hooyberghs','Viktor Hendrickx','Vincent Verleije','Ward Frijters','Wout Goos'];
function _bugTeamNamen(){ return (state._bugTeam&&state._bugTeam.length)?state._bugTeam.map(function(l){return String(l.naam||'');}):BUG_TEAM_FALLBACK.slice(); }
function _bugWieDefault(){
  var em=String((state.session&&state.session.email)||'').toLowerCase();
  var leden=state._bugTeam||[];
  for(var i=0;i<leden.length;i++){ if(leden[i].email&&leden[i].email===em) return String(leden[i].naam||''); }
  // fallback: voornaam uit het e-mailadres (ClickUp-mail kan afwijken van de portaal-login)
  var vn=em.split('@')[0].split('.')[0];
  if(vn){ var namen=_bugTeamNamen(); for(var j=0;j<namen.length;j++){ if(namen[j].toLowerCase().indexOf(vn)===0) return namen[j]; } }
  return '';
}
function _bugWieOptions(){
  var sel=state._bugWie||'';
  return '<option value="" disabled'+(sel?'':' selected')+'>Kies je naam…</option>'+_bugTeamNamen().map(function(n){
    return '<option value="'+escapeHtml(n)+'"'+(sel===n?' selected':'')+'>'+escapeHtml(n)+'</option>';
  }).join('');
}
async function loadBugTeam(){
  if(state._bugTeam&&state._bugTeam.length) return;
  var res; try{ res=await api(ENDPOINTS.teamLeden,{}); }catch(e){ res=null; }
  var leden=(res&&res.data&&res.data.ok&&Array.isArray(res.data.leden))?res.data.leden:[];
  if(!leden.length) return; // fetch faalt -> fallback-snapshot blijft bruikbaar
  state._bugTeam=leden;
  var sel=$id('bugWie');
  if(sel){ if(!state._bugWie) state._bugWie=_bugWieDefault(); sel.innerHTML=_bugWieOptions(); }
}
// Naam van de ingelogde klant voor een melding (Firebase displayName, anders de naam v\u00f3\u00f3r de @).
function _bugClientName(){ var s=state.session||{}; return String(s.displayName||'').trim() || String(s.email||'').split('@')[0] || ''; }
function _bugBedrijfNaam(){ try{ return (window.S27DATA&&S27DATA.bedrijfsnaam&&S27DATA.bedrijfsnaam())||state._adminActiveName||(state.session&&state.session.bedrijfsnaam)||''; }catch(e){ return ''; } }
function openBugReport(){
  state._bugFrom={mode:state.viewMode, tab:currentTab, project:state.activeProject};
  state.viewMode='bugreport'; state._bugFile=null;
  var team = (typeof isRichView==='function' && isRichView());   // teamweergave (staff, niet de clientview)
  var wieBlok;
  if(team){
    // team: melder kiezen uit de live ClickUp-ledenlijst (dropdown)
    state._bugWie=_bugWieDefault(); loadBugTeam();
    wieBlok='<label class="ms-label">Wie meldt dit?</label>'
      +'<select id="bugWie" class="bug-wie-select" onchange="bugPickWie(this.value)">'+_bugWieOptions()+'</select>';
  } else {
    // klant: identiteit automatisch (geen team-dropdown) \u2014 getoond zodat duidelijk is wie het indient
    var wie=_bugClientName(), bn=_bugBedrijfNaam();
    wieBlok='<div style="display:flex;align-items:center;gap:8px;color:var(--ink-3);background:var(--paper-3,#F1EBE2);border-radius:10px;padding:10px 13px;margin-bottom:14px;font-size:13.5px">'+ic('person',16)+'<span>Je meldt dit als <b style="color:var(--ink-2)">'+escapeHtml(wie||(state.session&&state.session.email)||'jou')+'</b>'+(bn?(' \u00b7 '+escapeHtml(bn)):'')+'</span></div>';
  }
  var page=$id('page'); if(!page) return;
  var tt=$id('topbarTitle'); if(tt) tt.textContent='Portaal-feedback';
  page.innerHTML='<div class="panel active br-blue" data-screen-label="bugreport"><div class="contactpage">'
    +'<div class="gal-toprow"><button class="gal-close" onclick="closeBugReport()" aria-label="Terug">'+ic('plus',22)+'</button></div>'
    +'<h1 style="display:flex;align-items:center;gap:10px">'+ic('bug',24)+' Portaal-feedback</h1>'
    +'<p class="sdesc" style="margin:4px 0 20px">'+(team
        ? 'Bug gezien of een idee voor het portaal? Zet het hier en het komt rechtstreeks in de bugs-lijst terecht.'
        : 'Werkt er iets niet zoals verwacht, of heb je een idee voor het portaal? Laat het ons hier weten, we pakken het op.')+'</p>'
    +'<div class="card contact-form" style="max-width:680px">'
      + wieBlok
      +'<label class="ms-label">Titel</label>'
      +'<input type="text" id="bugTitel" class="shoot-zoek" style="margin:4px 0 14px" maxlength="140" placeholder="Korte omschrijving van wat je zag">'
      +'<label class="ms-label">Wat zie je / wat verwacht je?</label>'
      +'<textarea id="bugBody" class="mp-note" rows="12" placeholder="Op welk scherm, wat ging er mis, wat had je verwacht\u2026"></textarea>'
      +'<div style="margin-top:12px"><label class="btn btn-outline btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">'+ic('upload',14)+' Schermafbeelding toevoegen<input type="file" accept="image/*" style="display:none" onchange="bugPickFile(this)"></label><span id="bugFileChip" class="fs" style="margin-left:10px;color:var(--ink-3)"></span></div>'
      +'<div class="shoot-msg" id="bugMsg"></div>'
      +'<div style="margin-top:18px"><button class="btn btn-primary" onclick="bugVerstuur(this)">'+ic('send',15)+' Versturen</button></div>'
    +'</div>'
  +'</div></div>';
  window.scrollTo({top:0,behavior:'auto'});
  var t=$id('bugTitel'); if(t) t.focus();
}
function bugPickWie(n){ state._bugWie=String(n||''); }
function bugPickFile(inp){
  state._bugFile=(inp.files&&inp.files[0])||null;
  var c=$id('bugFileChip'); if(c) c.textContent=state._bugFile?('\u2713 '+state._bugFile.name):'';
}
function closeBugReport(){
  var f=state._bugFrom||{}; state._bugFile=null;
  if(f.mode==='project'&&f.project) openProject(f.project,'auto');
  else goTab(f.tab||'start');
}
async function bugVerstuur(btn){
  var titel=($id('bugTitel')||{}).value||'', body=($id('bugBody')||{}).value||'';
  var msg=$id('bugMsg');
  if(!String(titel).trim()&&!String(body).trim()){ if(msg){msg.textContent='Beschrijf eerst even wat je zag of welk idee je hebt.';msg.style.display='block';} return; }
  var team = (typeof isRichView==='function' && isRichView());
  var melder;
  if(team){
    var selEl=$id('bugWie'); if(selEl&&selEl.value) state._bugWie=selEl.value;
    if(!state._bugWie){ if(msg){msg.textContent='Selecteer even wie dit meldt.';msg.style.display='block';} return; }
    melder=state._bugWie;
  } else {
    melder=_bugClientName();   // klant: identiteit automatisch (e-mail wordt server-side toegevoegd)
  }
  state._bugWie=melder;
  btn.disabled=true; btn.innerHTML='Versturen\u2026';
  var payload={titel:String(titel).trim(),omschrijving:String(body).trim(),melder_naam:melder,bedrijfsnaam:_bugBedrijfNaam(),context:location.href+' \u00b7 '+(state.activeBedrijf||'')};
  if(state._bugFile&&state._bugFile.size<=22*1024*1024){
    try{
      var b64=await new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){res(String(r.result).split(',')[1]||'');}; r.onerror=rej; r.readAsDataURL(state._bugFile); });
      payload.filename=state._bugFile.name; payload.file_data=b64;
    }catch(e){}
  }
  var res; try{ res=await api(ENDPOINTS.bugReport,payload); }catch(e){ res=null; }
  if(res&&res.ok&&res.data&&res.data.ok){
    var page=$id('page');
    var _vn=String(state._bugWie||'').trim().split(' ')[0];
    if(page) page.innerHTML='<div class="panel active br-blue"><div class="contactpage"><div class="empty" style="padding:60px"><div class="em-ic">'+ic('st_approved',52)+'</div><b style="font-family:var(--font-display);font-size:17px;color:var(--ink-2)">Bedankt'+(_vn?(', '+escapeHtml(_vn)):'')+'!</b><p style="margin:6px 0 18px">Je melding is doorgegeven. We bekijken ze zo snel mogelijk.</p><button class="btn btn-primary" onclick="closeBugReport()">Terug</button> <button class="btn btn-outline" onclick="openBugReport()">Nog een melding</button></div></div></div>';
  }
  else { btn.disabled=false; btn.innerHTML=ic('send',15)+' Opnieuw proberen'; if(msg){msg.textContent='Versturen lukte niet \u2014 probeer zo opnieuw.';msg.style.display='block';} }
}

/* ---- Facturatie-notitie voor Celien (WS-7, team-only) ---- */
async function factNoteLaad(){
  var el=$id('factNote'); if(!el) return;
  var res; try{ res=await api(ENDPOINTS.facturatieNotitie,{actie:'get'}); }catch(e){ res=null; }
  if(res&&res.data&&res.data.ok!==false){ el.value=res.data.notitie||''; el.placeholder='Bv. factuur splitsen over 2 vennootschappen\u2026'; }
}
async function factNoteSave(btn){
  var el=$id('factNote'); if(!el) return;
  btn.disabled=true; btn.textContent='Opslaan\u2026';
  var res; try{ res=await api(ENDPOINTS.facturatieNotitie,{actie:'set',notitie:el.value||''}); }catch(e){ res=null; }
  btn.disabled=false; btn.innerHTML=ic('check',14)+' Opslaan';
  var ok=res&&res.data&&res.data.ok;
  btn.insertAdjacentHTML('afterend','<i class="fact-ok" style="margin-left:8px;font-size:12.5px;color:'+(ok?'var(--s27-green)':'var(--s27-orange)')+'">'+(ok?'Opgeslagen \u2713':'Mislukt \u2014 probeer opnieuw')+'</i>');
  setTimeout(function(){ var i=document.querySelector('.fact-ok'); if(i)i.remove(); },2600);
}

/* ---- Support-opvolglijst (WS-1): status + chat per vraag, op één plek ---- */
var SUPPORT_LABELS={todo:['Ontvangen','pill-todo'],prog:['In behandeling','pill-prog'],wait:['Wacht op jou','pill-wait'],sent:['Wacht op jou','pill-wait'],done:['Opgelost','pill-done']};
function goSupport(){
  state.viewMode='support';
  var page=$id('page'); if(!page) return;
  var tt=$id('topbarTitle'); if(tt) tt.textContent='Support';
  var alle=((window.S27DATA&&S27DATA.projects&&S27DATA.projects())||[]).filter(function(p){return p.discId==='support';});
  if(state.demoMode&&!alle.length&&typeof PROJECTS!=='undefined') alle=PROJECTS.filter(function(p){return p.discId==='support';});
  var open=alle.filter(function(p){return p.status!=='done';}), dicht=alle.filter(function(p){return p.status==='done';});
  var rij=function(p){
    var sl=SUPPORT_LABELS[p.status]||SUPPORT_LABELS.prog;
    var lc=p.lastChat&&p.lastChat.tekst?('<span class="sup-snippet">'+esc(p.lastChat.tekst)+'</span>'):'';
    var cid=String(p.id||'').replace(/[^A-Za-z0-9_-]/g,'');
    return '<div class="card sup-row br-indigo"><span class="sup-dot '+sl[1]+'"></span>'
      +'<span class="sup-main"><b>'+esc(p.name)+'</b><span class="pill '+sl[1]+'" style="position:static">'+sl[0]+'</span>'+lc+'</span>'
      +'<button class="btn btn-branch br-indigo btn-sm" onclick="openProjectChat(\''+cid+'\')">'+ic('msg',14)+' Open chat</button></div>';
  };
  page.innerHTML='<div class="panel active br-indigo" data-screen-label="support"><div class="contactpage">'
    +'<div class="gal-toprow"><button class="gal-close" onclick="goContact()" aria-label="Terug naar Contact">'+ic('plus',22)+'</button></div>'
    +'<h1>Je supportvragen</h1>'
    +'<p class="sdesc" style="margin:4px 0 18px">Volg hier de status van je vragen en chat rechtstreeks met het team.</p>'
    +(open.length?('<div class="section-head"><h2>Lopend</h2><span class="count">'+open.length+'</span></div><div class="sup-lijst">'+open.map(rij).join('')+'</div>'):'')
    +(dicht.length?('<div class="section-head" style="margin-top:24px"><h2>Opgelost</h2><span class="count">'+dicht.length+'</span></div><div class="sup-lijst">'+dicht.map(rij).join('')+'</div>'):'')
    +((!open.length&&!dicht.length)?'<div class="empty" style="padding:40px"><div class="em-ic">'+ic('st_approved',52)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Geen openstaande vragen</b><p style="margin:6px 0 16px">Loop je ergens tegenaan? Maak gerust een ticket aan.</p><button class="btn btn-branch br-green" onclick="openWebTicket()">'+ic('doc',15)+' Nieuw ticket</button></div>':'')
  +'</div></div>';
  window.scrollTo({top:0,behavior:'auto'});
  closeSidebar();
}

/* ---- Contact (W): één blauwe knop, drie ingangen ---- */
function goContact(){
  state.viewMode='contact';
  var page=$id('page'); if(!page) return;
  var tt=$id('topbarTitle'); if(tt) tt.textContent='Contact';
  page.innerHTML='<div class="panel active br-blue" data-screen-label="contact"><div class="contactpage">'
    +'<h1>Waarmee kunnen we je helpen?</h1>'
    +'<p class="sdesc" style="margin:4px 0 22px">Kies hieronder — dan komt je vraag meteen bij de juiste persoon terecht.</p>'
    +'<div class="contact-grid">'
      +'<button class="contact-card br-blue" onclick="openOfferteWizard()"><span class="cc-ic">'+ic('plus',24)+'</span><b>Nieuw project</b><span>Stel zelf je project samen — wij werken de offerte persoonlijk uit.</span><span class="cc-go">Start een aanvraag '+ic('arrow',14)+'</span></button>'
      +'<button class="contact-card br-pink" onclick="contactVraagForm()"><span class="cc-ic">'+ic('msg',24)+'</span><b>Algemene vraag</b><span>Vragen over je samenwerking, facturatie of iets anders? Ilke helpt je verder.</span><span class="cc-go">Stel je vraag '+ic('arrow',14)+'</span></button>'
      +'<button class="contact-card br-green" onclick="openWebTicket()"><span class="cc-ic">'+ic('doc',24)+'</span><b>Website support</b><span>Een bug, aanpassing of vraag over je site? Maak een ticket met bijlagen.</span><span class="cc-go">Ticket aanmaken '+ic('arrow',14)+'</span></button>'
    +'</div>'
    +'<button class="sup-link" onclick="goSupport()">'+ic('msg',14)+' Lopende supportvragen bekijken '+ic('arrow',13)+'</button>'
    +'<div id="contactVraagHost"></div>'
  +'</div></div>';
  window.scrollTo({top:0,behavior:'auto'});
  closeSidebar(); syncUrl();
}
function contactVraagForm(){
  var host=$id('contactVraagHost'); if(!host) return;
  host.innerHTML='<div class="card contact-form">'
    +'<h2 style="font-family:var(--font-display);font-size:17px;margin:0 0 4px">Je vraag voor Ilke</h2>'
    +'<p class="sdesc" style="margin:0 0 14px">We bezorgen ze rechtstreeks — antwoord komt op het e-mailadres waarmee je bent ingelogd.</p>'
    +'<label class="ms-label">Onderwerp</label>'
    +'<input type="text" id="cvOnderwerp" class="shoot-zoek" style="margin:4px 0 12px" maxlength="140" placeholder="Waar gaat het over?">'
    +'<label class="ms-label">Je vraag</label>'
    +'<textarea id="cvBericht" class="mp-note" rows="5" placeholder="Vertel het ons\u2026"></textarea>'
    +'<div class="shoot-msg" id="cvMsg"></div>'
    +'<div style="margin-top:14px"><button class="btn btn-primary" id="cvVerstuur" onclick="contactVraagVerstuur(this)">'+ic('send',15)+' Verstuur naar Ilke</button></div>'
  +'</div>';
  host.scrollIntoView({behavior:'smooth',block:'start'});
  var s=$id('cvOnderwerp'); if(s) s.focus();
}
async function contactVraagVerstuur(btn){
  var ond=($id('cvOnderwerp')||{}).value||'', ber=($id('cvBericht')||{}).value||'';
  var msg=$id('cvMsg');
  if(!String(ber).trim()){ if(msg){msg.textContent='Schrijf eerst even je vraag.';msg.style.display='block';} return; }
  if(state.demoMode){ var h=$id('contactVraagHost'); if(h) h.innerHTML='<div class="card contact-form" style="text-align:center"><div class="em-ic">'+ic('st_approved',46)+'</div><b style="font-family:var(--font-display)">Dit is de voorbeeldweergave</b><p class="sdesc">In je echte portaal komt je vraag rechtstreeks bij Ilke terecht.</p></div>'; return; }
  btn.disabled=true; btn.innerHTML='Versturen\u2026';
  var res; try{ res=await api(ENDPOINTS.contactVraag,{onderwerp:String(ond).trim(),bericht:String(ber).trim(),klant_naam:(window.S27DATA&&S27DATA.bedrijfsnaam)?S27DATA.bedrijfsnaam():''}); }catch(e){ res=null; }
  var d=(res&&res.data)||null;
  if(d&&d.ok){
    var h2=$id('contactVraagHost');
    if(h2) h2.innerHTML='<div class="card contact-form" style="text-align:center"><div class="em-ic">'+ic('st_approved',46)+'</div><b style="font-family:var(--font-display);font-size:16px">Verstuurd!</b><p class="sdesc" style="margin:6px 0 0">'+escapeHtml(d.message||'Ilke neemt je vraag snel op.')+'</p></div>';
  } else {
    btn.disabled=false; btn.innerHTML=ic('send',15)+' Opnieuw proberen';
    if(msg){msg.textContent='Versturen lukte net niet \u2014 probeer zo opnieuw.';msg.style.display='block';}
  }
}

/* ---- Fotogalerij (V): Drive-map als gepersonaliseerde galerijpagina ---- */
async function openFotoGalerij(taskId, url){
  if(state.demoMode){
    alert('In je echte portaal opent hier de fotogalerij: alle foto\u2019s uit de gedeelde map, mooi gepresenteerd met download- en goedkeuren-knoppen.');
    return;
  }
  state._galFrom=state.activeProject||null;
  state.viewMode='galerij';
  try{ var _gp=(window.S27DATA&&(S27DATA.projects()||[]).find(function(x){return x.id===state._galFrom;})); var _gt=$id('topbarTitle'); if(_gt&&_gp) _gt.textContent=_gp.name; }catch(e){}
  var page=$id('page'); if(!page) return;
  page.innerHTML='<div class="panel active br-purple"><div class="empty" style="padding:70px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Je foto\u2019s worden klaargezet\u2026</p></div></div>';
  var res; try{ res=await api(ENDPOINTS.fotoList,{task_id:taskId,url:url}); }catch(e){ res=null; }
  if(state.viewMode!=='galerij') return;   // gebruiker is intussen weggenavigeerd
  var d=(res&&res.data)?res.data:null;
  if(!d||!d.ok||!(d.fotos||[]).length){
    page.innerHTML='<div class="panel active br-purple"><div class="gal-toprow"><button class="gal-close" onclick="closeFotoGalerij()" aria-label="Terug naar het project">'+ic('plus',22)+'</button></div><div class="empty" style="padding:40px 60px"><div class="em-ic">'+ic('img',56)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">De foto\u2019s kunnen nu niet geladen worden</b><p style="margin:6px 0 14px">'+escapeHtml((d&&d.message)||'Probeer het zo opnieuw.')+'</p><button class="btn btn-branch br-purple" onclick="closeFotoGalerij()">Terug naar je project</button></div></div>';
    return;
  }
  var _gw=function(u){ return (u&&u.charAt(0)==='/')?(GATEWAY_BASE+u):(u||''); };
  d.fotos.forEach(function(f){ f.full=_gw(f.full); f.dl=_gw(f.dl); });
  state._gal={taskId:taskId,fotos:d.fotos,naam:d.taak_naam||'Fotoshoot',zip:_gw(d.zip_url||''),folder:d.folder_url||'',goedgekeurd:!!d.goedgekeurd,idx:0,zoom:false};
  page.innerHTML='<div class="panel active br-purple">'+galerijHTML()+'</div>';
  window.scrollTo({top:0,behavior:'auto'});
  syncUrl(true);
}
function closeFotoGalerij(){
  var pid=state._galFrom||state.activeProject;
  if(pid) openProject(pid,'auto'); else goTab('video');
}
function galerijHTML(){
  var g=state._gal; if(!g) return '';
  var hero=g.fotos[0]||{};
  return '<div class="gal">'
    +'<div class="gal-toprow">'
      +(g.goedgekeurd?'<span class="gal-okpill">'+ic('check',14)+' Goedgekeurd</span>':'<button class="btn gal-approve" onclick="galApprove(this)">'+ic('check',15)+' Foto\u2019s goedkeuren</button>')
      +(g.zip?'<a class="btn gal-dlall" href="'+escapeHtml(g.zip)+'" target="_blank" rel="noopener">'+ic('download',15)+' Alles downloaden</a>':(g.folder?'<a class="btn gal-dlall" href="'+escapeHtml(g.folder)+'" target="_blank" rel="noopener">'+ic('download',15)+' Alles downloaden</a>':''))
      +'<button class="gal-close" onclick="closeFotoGalerij()" aria-label="Terug naar het project">'+ic('plus',22)+'</button></div>'
    +'<div class="gal-hero" style="background-image:url(\''+String(hero.thumb||hero.full||'').replace(/['"()\s\\]/g,'')+'\')"><div class="gal-hero-scrim"></div>'
      +'<div class="gal-hero-tx"><h1>'+escapeHtml(g.naam)+'</h1><span>'+g.fotos.length+' foto\u2019s</span></div>'
    +'</div>'
    +'<div class="gal-grid">'+g.fotos.map(function(f,i){
      return '<button class="gal-it" onclick="galLight('+i+')"><img src="'+escapeHtml(f.thumb||f.full)+'" alt="'+escapeHtml(f.naam||'')+'" loading="lazy"></button>';
    }).join('')+'</div>'
  +'</div>';
}
function galPreload(rond){
  var g=state._gal; if(!g) return;
  [rond+1,rond+2,rond+3,rond-1].forEach(function(j){
    var f=g.fotos[j];
    if(f&&!f._pre){ f._pre=1; var im=new Image(); im.src=f.web||f.full; }
  });
}
function galLight(i){
  var g=state._gal; if(!g) return;
  g.idx=Math.max(0,Math.min(g.fotos.length-1,i)); g.zoom=false;
  var ov=document.getElementById('galLb');
  if(!ov){ ov=document.createElement('div'); ov.id='galLb'; document.body.appendChild(ov);
    ov.addEventListener('click',function(e){ if(e.target===ov) galLbClose(); });
    document.addEventListener('keydown',function(e){ if(!document.getElementById('galLb')||!document.getElementById('galLb').classList.contains('show')||!state._gal)return; if(e.key==='Escape')galLbClose(); if(e.key==='ArrowRight')galLight(state._gal.idx+1); if(e.key==='ArrowLeft')galLight(state._gal.idx-1); });
  }
  var f=g.fotos[g.idx];
  ov.innerHTML='<button class="gal-lb-x" onclick="galLbClose()">'+ic('plus',24)+'</button>'
    +(g.idx>0?'<button class="gal-lb-nav gal-lb-prev" onclick="galLight('+(g.idx-1)+')">\u2039</button>':'')
    +(g.idx<g.fotos.length-1?'<button class="gal-lb-nav gal-lb-next" onclick="galLight('+(g.idx+1)+')">\u203a</button>':'')
    +'<div class="gal-lb-stage'+(g.zoom?' zoom':'')+'" onclick="galZoom(event)"><img src="'+escapeHtml(f.web||f.full||f.thumb)+'" alt=""></div>'
    +'<div class="gal-lb-bar"><span class="gal-lb-naam">'+escapeHtml(f.naam||'')+'</span><span class="gal-lb-tel">'+(g.idx+1)+' / '+g.fotos.length+'</span>'
    +'<a class="btn btn-sm gal-lb-dl" href="'+escapeHtml(f.dl||f.full)+'">'+ic('download',14)+' Download</a></div>';
  ov.classList.add('show'); document.body.classList.add('mp-lock');
  galPreload(g.idx);
}
function galZoom(e){
  var g=state._gal; if(!g) return; g.zoom=!g.zoom;
  var st=e.currentTarget; st.classList.toggle('zoom',g.zoom);
}
function galLbClose(){ var ov=document.getElementById('galLb'); if(ov)ov.classList.remove('show'); document.body.classList.remove('mp-lock'); }
async function galApprove(btn){
  var g=state._gal; if(!g) return;
  if(!confirm('Keur je deze fotoreeks definitief goed? Dan ronden wij dit onderdeel af.')) return;
  btn.disabled=true; btn.innerHTML='Goedkeuren\u2026';
  var res; try{ res=await api(ENDPOINTS.fotoApprove,{task_id:g.taskId,klant_naam:(window.S27DATA&&S27DATA.bedrijfsnaam)?S27DATA.bedrijfsnaam():''}); }catch(e){ res=null; }
  if(res&&res.ok&&res.data&&res.data.ok){ g.goedgekeurd=true; if(state.viewMode==='galerij'&&state._gal===g){ var page=$id('page'); if(page)page.innerHTML='<div class="panel active br-purple">'+galerijHTML()+'</div>'; } }
  else { btn.disabled=false; btn.innerHTML=ic('check',15)+' Foto\u2019s goedkeuren'; alert('Goedkeuren lukte net niet \u2014 probeer zo opnieuw.'); }
}

// Shoot-inplanner als PAGINA in het portaal (V, Vincent 2026-06-11): sidebar + topbar blijven
// zichtbaar zodat de klant weet voor welk project hij plant; kruisje rechtsboven = terug.
function openShootOverlay(tid){
  var safe=String(tid).replace(/[^A-Za-z0-9_-]/g,'');
  state._shootFrom=state.activeProject||null;
  state._shootTid=String(tid);
  state.viewMode='shootplan';
  var page=$id('page'); if(!page) return;
  var pNaam=''; try{ var pp=(window.S27DATA&&(S27DATA.projects()||[]).find(function(x){return x.id===state._shootFrom;})); pNaam=pp?pp.name:''; }catch(e){}
  if(pNaam){ var _st=$id('topbarTitle'); if(_st) _st.textContent=pNaam; }
  page.innerHTML='<div class="panel active br-purple" data-screen-label="shoot-inplannen"><div class="shootpage">'
    +'<button class="shootpage-close" onclick="closeShootOverlay()" aria-label="Terug naar het project">'+ic('plus',22)+'</button>'
    +'<div class="shootpage-head"><span class="mp-head-eyebrow">Shoot inplannen'+(pNaam?' · '+escapeHtml(pNaam):'')+'</span><h1>Kies een moment dat jou past</h1></div>'
    +'<div id="s27-plan-'+safe+'"></div></div></div>';
  window.scrollTo({top:0,behavior:'auto'});
  openShootWizard(tid);
  syncUrl(true);
}
async function closeShootOverlay(){
  // terug naar het projectdetail met vers shoot-overzicht (zonet geboekt = meteen 'ingepland')
  var pid=state._shootFrom||state.activeProject;
  if(pid){ try{ delete (state.data.details||{})[pid]; }catch(e){} state._bustDetail=pid; openProject(pid,'auto'); }
  else goTab('video');
}
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
  state.shoot[tid]={taskId:tid,timeHours:Number(d.timeHours)||0,aantalCreators:Number(d.aantalCreators)||1,availability:d.availability||{shoots:[],shoots_27m:[],vakantie:[],hosts:SHOOT_HOSTS},viewMonth:now.getMonth(),viewYear:now.getFullYear(),selectedDate:null,selectedTime:null,coords:null,formatted:'',locatieVast:String(d.locatie_vast||''),prefill:{voornaam:cc.voornaam||'',email:cc.email||(state.session&&state.session.email)||''}};
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
    +'<p class="shoot-intro">Paarse dagen = team volledig vrij · gele = nog plek. Boekingen tot een jaar vooruit, ten vroegste over 3 werkdagen. Je plant in: <b>'+escapeHtml(shootTeamLabel(ctx))+'</b>.</p>'
    +'<div class="shoot-cols">'
      +'<div class="shoot-col-l"><div id="shoot-cal-'+tid+'">'+shootCalHTML(tid)+'</div></div>'
      +'<div class="shoot-col-r"><div id="shoot-slots-'+tid+'">'+(ctx.selectedDate?shootSlotsHTML(tid):'<div class="shoot-slotcard shoot-slot-hint"><span class="fs" style="color:var(--ink-4)">Kies links een dag — dan zie je hier meteen de mogelijke starturen.</span></div>')+'</div>'
      +'<div class="shoot-actions"><button class="btn btn-branch br-purple" id="shoot-next-'+tid+'" '+((ctx.selectedDate&&ctx.selectedTime)?'':'disabled')+' onclick="shootGoDetails(\''+tid+'\')">Verder →</button></div>'
    +'</div></div>';
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
  if(s && window.innerWidth<880) s.scrollIntoView({behavior:'smooth',block:'start'});
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
      +(ctx.locatieVast
        ? '<div class="shoot-locvast">'+ic('check',14)+'<span>'+escapeHtml(ctx.locatieVast)+'</span><em>Door Studio 27 vastgelegd — wijzigen kan via het team.</em></div>'
        : '<div class="shoot-acwrap" id="shoot-acwrap-'+tid+'"><input type="text" class="shoot-zoek" id="shoot-zoek-'+tid+'" placeholder="Zoek je adres (begin te typen)…" autocomplete="off" oninput="shootSuggest(\''+tid+'\',this.value)"><div class="shoot-sugg" id="shoot-sugg-'+tid+'"></div></div>'
        +'<div class="shoot-row-loc"><input type="text" id="shoot-straat-'+tid+'" placeholder="Straat + nummer" autocomplete="off" oninput="shootClearCoords(\''+tid+'\')"><input type="text" id="shoot-postcode-'+tid+'" placeholder="Postcode" maxlength="4" autocomplete="off" oninput="shootClearCoords(\''+tid+'\')"><input type="text" id="shoot-gemeente-'+tid+'" placeholder="Gemeente" autocomplete="off" oninput="shootClearCoords(\''+tid+'\')"></div>')
      +'<div class="shoot-row"><div class="shoot-field"><label>Contactpersoon op locatie (indien anders dan jij)</label><input type="text" id="shoot-cnaam-'+tid+'" placeholder="Naam"></div><div class="shoot-field"><label>GSM contactpersoon</label><input type="text" id="shoot-cgsm-'+tid+'" placeholder="04XX XX XX XX"></div></div>'
      +'<div class="shoot-field"><label>Extra info of briefing (optioneel)</label><textarea id="shoot-extra-'+tid+'" placeholder="Bijzonderheden, parkeer-info, briefing, eventuele extra locaties…"></textarea></div>'
      +'<div class="shoot-msg" id="shoot-msg-'+tid+'"></div>'
    +'</div>'
    +'<div class="shoot-actions"><button class="btn btn-ghost btn-sm" onclick="shootBack(\''+tid+'\')">← Terug</button><button class="btn btn-branch br-blue btn-sm" id="shoot-book-'+tid+'" onclick="shootSubmitBooking(\''+tid+'\')">Shoot inplannen</button></div>'
    +'</div>';
}
function shootBack(tid){ shootDrawCal(tid); }
/* Adres-suggesties in eigen huisstijl: debounce -> worker (shootPlaces, key server-side) -> dropdown.
   Selectie vult straat/postcode/gemeente + coördinaten in. Manueel verder typen blijft altijd kunnen. */
function shootSuggest(tid, q){
  clearTimeout(state._shootSugT);
  var host=$id('shoot-sugg-'+tid); if(!host) return;
  q=String(q||'').trim();
  if(q.length<3){ host.innerHTML=''; return; }
  state._shootSugT=setTimeout(async function(){
    var res; try{ res=await api(ENDPOINTS.shootPlaces,{q:q}); }catch(e){ res=null; }
    var list=(res&&res.data&&res.data.suggesties)||[];
    var cur=$id('shoot-zoek-'+tid); if(!cur||cur.value.trim()!==q) return;   // verouderde respons
    host.innerHTML=list.map(function(s){
      var pid=String(s.place_id||'').replace(/[^A-Za-z0-9_-]/g,'');
      return '<button type="button" class="shoot-sugg-it" onclick="shootPickSuggest(\''+tid+'\',\''+pid+'\')">'+escapeHtml(s.tekst||'')+'</button>';
    }).join('');
  },260);
}
async function shootPickSuggest(tid, placeId){
  var host=$id('shoot-sugg-'+tid); if(host) host.innerHTML='<div class="shoot-sugg-it" style="cursor:default;color:var(--ink-4)">Adres ophalen…</div>';
  var res; try{ res=await api(ENDPOINTS.shootPlaces,{place_id:placeId}); }catch(e){ res=null; }
  var a=(res&&res.data&&res.data.adres)||null;
  if(host) host.innerHTML='';
  if(!a) return;
  var ctx=(state.shoot||{})[tid]||{};
  var set=function(id,v){ var el=$id(id); if(el) el.value=v||''; };
  set('shoot-straat-'+tid,a.straat); set('shoot-postcode-'+tid,a.postcode); set('shoot-gemeente-'+tid,a.gemeente);
  var zk=$id('shoot-zoek-'+tid); if(zk) zk.value=a.formatted||'';
  if(a.lat!=null&&a.lng!=null){ ctx.coords={lat:a.lat,lng:a.lng}; ctx.formatted=a.formatted||''; }
}
function shootToast(tid,msg){const el=$id('shoot-msg-'+tid); if(el){el.textContent=msg;el.style.display='block';} else { alert(msg); }}
async function shootSubmitBooking(tid){
  const ctx=(state.shoot||{})[tid]; if(!ctx)return;
  const val=id=>{const el=$id(id);return el?el.value.trim():'';};
  const locVast=!!ctx.locatieVast;
  const voornaam=val('shoot-voornaam-'+tid),email=val('shoot-email-'+tid),straat=val('shoot-straat-'+tid),postcode=val('shoot-postcode-'+tid),gemeente=val('shoot-gemeente-'+tid);
  if(!voornaam||!email){ shootToast(tid,'Vul minstens je voornaam en e-mailadres in.'); return; }
  if(!locVast && (!straat||!postcode||!gemeente)){ shootToast(tid,'Kies je startlocatie via de adres-zoeker (of vul straat, postcode en gemeente in).'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ shootToast(tid,'Vul een geldig e-mailadres in.'); return; }
  if(!locVast && !/^[1-9][0-9]{3}$/.test(postcode)){ shootToast(tid,'Postcode moet 4 cijfers zijn (bv. 2310).'); return; }
  if(ctx._booking)return; ctx._booking=true;
  const btn=$id('shoot-book-'+tid); if(btn){btn.disabled=true;btn.textContent='Even versturen…';}
  const locatieFormatted=locVast?ctx.locatieVast:(straat+', '+postcode+' '+gemeente+', België');
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
  return '<div class="empty" style="padding:24px"><div class="em-ic">'+ic('st_approved',56)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">'+t+'</b><p style="margin:6px 0 14px">'+escapeHtml(p)+'</p><button class="btn btn-branch br-purple" onclick="closeShootOverlay()">Terug naar je project</button></div>';
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

function toggleBot(){ const p=$id('botPanel'),f=$id('botFab'); const open=p.classList.toggle('show'); f.style.display=open?'none':'flex'; if(open){ const g=$id('botGreet'); if(g){ var nm=(typeof _greetNaam==='function'?_greetNaam():'')||''; g.innerHTML='Hallo '+escapeHtml(nm||'daar')+'! Ik help je graag op weg. Waarmee kan ik je verder helpen?'; } if(typeof renderBotChips==='function') renderBotChips(); const inp=p.querySelector('.bot-input input'); if(inp)setTimeout(()=>inp.focus(),50); } }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if($id('tourScrim')&&$id('tourScrim').classList.contains('show'))endTour(false); else if(state.viewMode==='project'){ if(typeof _isContentTak==='function'&&_isContentTak(state._backTab||'')) markSkipAutoLand(state._backTab); goTab(state._backTab||'start'); } } });

/* ---------- Onboarding-rondleiding (auto 1x + altijd via het ?-icoon) ----------
   Volledige begeleide tour: elke stap licht een ECHT element uit (spotlight-ring +
   gedimde rest), met een tekstkaart ernaast. Stappen zonder zichtbaar doel (bv. een
   tak die deze klant niet heeft) worden automatisch overgeslagen. Welkom + slot zijn
   gecentreerde kaarten. Tijdens de tour staat de zijbalk volledig uitgeklapt (overlay,
   body.tour-on) zodat de labels leesbaar zijn. */
const TOUR_ALL=[
  {ic:'spark',       t:'Welkom in je portaal',          b:'We tonen je in een halve minuut waar je alles vindt. Je kan deze uitleg later altijd opnieuw bekijken via het vraagteken bovenaan.', targets:null},
  {ic:'home',        t:'Je startscherm',                b:'Dit is je vertrekpunt. Alles wat op jou wacht staat hier bovenaan klaar: reviews, feedback, geplande shoots en meetings.', targets:['.sb-item[data-tab="start"]']},
  {ic:'doc',         t:'Je projecten per discipline',   b:'Elke dienst heeft een eigen plek in de menubalk. Klik op een tak zoals Video & fotografie, Branding of Strategie om je projecten, bestanden en feedbackrondes te bekijken en goed te keuren.', targets:['.sb-item[data-tab="video"]','.sb-item[data-tab="branding"]','.sb-item[data-tab="strategie"]']},
  {ic:'st_progress', t:'Volg je resultaten',            b:'Bij Socials, Adverteren en Website volg je je cijfers in real time. Je kiest zelf de periode, en van elke pagina kan je de link doorsturen naar een collega.', targets:['.sb-item[data-tab="socials"]','.sb-item[data-tab="advertenties"]','.sb-item[data-tab="webprestaties"]']},
  {ic:'msg',         t:'Chatten met je team',           b:'Bij Berichten staan al je gesprekken met het Studio 27-team, gebundeld per project. Je kan ook gewoon antwoorden vanuit het project zelf.', targets:['.sb-item[data-tab="berichten"]']},
  {ic:'cal',         t:'Een meeting inplannen',         b:'Wil je samen iets bespreken? Bij Meetings kies je zelf een vrij moment dat jou past. Helemaal vrijblijvend.', targets:['.sb-item[data-tab="meetings"]']},
  {ic:'gear',        t:'Je instellingen',               b:'Bij Instellingen beheer je je gegevens en je meldingen. Je kiest zelf of je updates via e-mail, WhatsApp of een pushbericht wil ontvangen.', targets:['.sb-item[data-tab="instellingen"]']},
  {ic:'bell',        t:'Je meldingen',                  b:'Het belletje verzamelt updates over je projecten, reviews en berichten. Een gekleurd bolletje betekent dat er iets nieuws is.', targets:['#bellBtn']},
  {ic:'msg',         t:'Contact opnemen',               b:'Een vraag, een nieuw project of hulp bij je website? Via de Contact-knop kom je meteen bij de juiste persoon terecht.', targets:['#topNewBtn']},
  {ic:'bug',         t:'Feedback en bugs melden',       b:'Loopt er iets mis of heb je een idee voor het portaal? Meld het met dit knopje. Het komt rechtstreeks bij ons team terecht.', targets:['#bugBtn']},
  {ic:'help',        t:'Deze rondleiding herhalen',     b:'Even kwijt hoe iets werkt? Met dit vraagteken start je deze uitleg op elk moment opnieuw.', targets:['.topbar .icon-btn[aria-label="Rondleiding"]']},
  {ic:'st_approved', t:'Je bent helemaal klaar',        b:'Je kent nu de weg. Veel plezier in je portaal, en als je iets nodig hebt staan we voor je klaar.', targets:null},
];
let tourIdx=0, tourSteps=[], _tourLifted=null, _tourRaf=0;
function tourEnsureStyles(){
  if($id('s27-tour-styles')) return;
  var st=document.createElement('style'); st.id='s27-tour-styles';
  st.textContent=
    // kaart: GPU-positie via transform (vloeiend), fade-in via opacity
    '.tour-dialog{left:0;top:0;opacity:0;transition:transform .36s cubic-bezier(.22,1,.36,1),opacity .24s ease;will-change:transform;}'+
    '.tour-dialog.show{opacity:1;}'+
    '.tour-dialog.tour-wide{width:calc(100vw - 24px)!important;}'+
    '.tour-ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--s27-blue,#3083DC);color:#fff;margin-bottom:13px;box-shadow:0 7px 18px rgba(48,131,220,.34);}'+
    '.tour-ic svg{width:21px;height:21px;}'+
    // spotlight-ring: zacht in/uit-faden + rustige adem-puls, vloeiend mee-bewegen
    '.spotlight{display:block!important;background:transparent!important;pointer-events:none;opacity:0;visibility:hidden;border-radius:12px;box-shadow:0 0 0 3px var(--s27-blue,#3083DC),0 0 0 6px rgba(48,131,220,.30);transition:left .36s cubic-bezier(.22,1,.36,1),top .36s cubic-bezier(.22,1,.36,1),width .36s cubic-bezier(.22,1,.36,1),height .36s cubic-bezier(.22,1,.36,1),opacity .22s ease;}'+
    '.spotlight.show{opacity:1;visibility:visible;animation:s27ring 2s ease-in-out infinite;}'+
    '@keyframes s27ring{0%,100%{box-shadow:0 0 0 3px var(--s27-blue,#3083DC),0 0 0 6px rgba(48,131,220,.30);}50%{box-shadow:0 0 0 3px var(--s27-blue,#3083DC),0 0 0 12px rgba(48,131,220,.07);}}'+
    // eerste plaatsing zonder slide-vanuit-hoek (enkel opacity), daarna wel animeren
    'body.tour-snap .tour-dialog{transition:opacity .24s ease!important;}'+
    'body.tour-snap .spotlight{transition:opacity .22s ease!important;}'+
    // toegankelijkheid: respecteer "minder beweging"
    '@media(prefers-reduced-motion:reduce){.tour-dialog{transition:opacity .2s ease!important;}.spotlight{transition:opacity .2s ease!important;}.spotlight.show{animation:none!important;}}'+
    '@media(min-width:981px){'+
      'body.tour-on.sb-rail .sidebar{transition:none!important;width:var(--sb-full)!important;box-shadow:0 22px 70px rgba(35,15,35,.22)!important;}'+
      'body.tour-on.sb-rail .sidebar .sb-label{display:block!important;}'+
      'body.tour-on.sb-rail .sidebar .sb-client-tx{display:flex!important;}'+
      'body.tour-on.sb-rail .sidebar .sb-client .chev{display:block!important;}'+
      'body.tour-on.sb-rail .sidebar .sb-wordmark{display:block!important;}'+
      'body.tour-on.sb-rail .sidebar .sb-glabel{visibility:visible!important;}'+
      'body.tour-on.sb-rail .sidebar .sb-item{justify-content:flex-start!important;gap:12px!important;padding:9px 12px!important;}'+
      'body.tour-on.sb-rail .sidebar .sb-item .sb-badge{display:flex!important;}'+
      'body.tour-on.sb-rail .sidebar .sb-client{justify-content:flex-start!important;}'+
    '}';
  document.head.appendChild(st);
}
function _tourVisible(el){ try{ if(!el) return false; if(el.offsetParent===null && getComputedStyle(el).position!=='fixed') return false; var r=el.getBoundingClientRect(); return r.width>2 && r.height>2; }catch(e){ return false; } }
function _tourEl(s){ if(!s||!s.targets) return null; for(var i=0;i<s.targets.length;i++){ var el=document.querySelector(s.targets[i]); if(_tourVisible(el)) return el; } return null; }
// het uitgelichte element (of z'n container) boven de scrim tillen zodat het helder blijft
function _tourLift(el){
  if(_tourLifted){ try{ _tourLifted.style.zIndex=_tourLifted.__z0||''; _tourLifted.style.position=_tourLifted.__p0||''; }catch(e){} _tourLifted=null; }
  if(!el) return;
  var cont = (el.closest && (el.closest('#sidebar') || el.closest('.sidebar') || el.closest('.topbar'))) || el;
  cont.__z0=cont.style.zIndex; cont.__p0=cont.style.position;
  try{ if(getComputedStyle(cont).position==='static') cont.style.position='relative'; }catch(e){}
  cont.style.zIndex='151';   // boven de scrim (150), onder de spotlight-ring (155) en kaart (160)
  _tourLifted=cont;
}
function openTour(){
  tourEnsureStyles();
  goTab('start');
  document.body.classList.add('tour-on');                                   // zijbalk uitgeklapt (overlay, instant)
  document.body.classList.add('tour-snap');                                 // eerste plaatsing zonder slide
  tourSteps = TOUR_ALL.filter(function(s){ return !s.targets || _tourEl(s); });   // enkel stappen met een zichtbaar doel
  tourIdx=0;
  $id('tourScrim').classList.add('show'); $id('tourDialog').classList.add('show');
  window.addEventListener('scroll', _tourReposition, true);
  window.addEventListener('resize', _tourReposition);
  renderTour();
  // de transform meteen vastleggen (forceer layout) zodat de eerste paint al gecentreerd is,
  // niet vanuit de hoek. tour-snap houdt de slide kort uit; daarna schuiven volgende stappen vloeiend.
  try{ void $id('tourDialog').offsetWidth; }catch(e){}
  setTimeout(function(){ document.body.classList.remove('tour-snap'); }, 90);
}
function renderTour(){
  var s=tourSteps[tourIdx]; if(!s){ endTour(true); return; }
  var el=_tourEl(s);
  if(window.innerWidth<=980){ var sb=$id('sidebar'); var isSb=!!(el && /sb-item|sidebar/.test((s.targets&&s.targets[0])||'')); if(sb){ if(isSb) sb.classList.add('open'); else sb.classList.remove('open'); } }
  $id('tourIc').innerHTML = s.ic ? ic(s.ic,21) : '';
  $id('tourStep').textContent='Stap '+(tourIdx+1)+' van '+tourSteps.length;
  $id('tourTitle').textContent=s.t; $id('tourBody').textContent=s.b;
  $id('tourDots').innerHTML=tourSteps.map(function(_,i){ return '<i class="'+(i===tourIdx?'on':'')+'"></i>'; }).join('');
  $id('tourPrev').style.visibility=tourIdx===0?'hidden':'visible';
  $id('tourNext').textContent=tourIdx===tourSteps.length-1?'Aan de slag!':'Volgende';
  // synchroon plaatsen (getBoundingClientRect forceert de layout, dus een net-geopende drawer
  // telt al mee) — geen rAF-afhankelijkheid zodat het ook in een achtergrond-tab correct staat
  _tourPlace(el);
}
// alleen positioneren (geen content-rebuild) — wordt ook gebruikt bij scroll/resize
function _tourPlace(el){
  var sp=$id('spotlight'), dg=$id('tourDialog'); if(!sp||!dg) return;
  _tourLift(el);
  var vw=window.innerWidth, vh=window.innerHeight, mobile=vw<=980;
  dg.classList.toggle('tour-wide', mobile);
  var dw=dg.offsetWidth||360, dh=dg.offsetHeight||230, gap=14, x, y;
  if(!el){                                                       // welkom/slot → gecentreerd
    sp.classList.remove('show');
    x=Math.round((vw-dw)/2); y=Math.round((vh-dh)/2);
    dg.style.transform='translate('+x+'px,'+y+'px)'; return;
  }
  try{ var pre=el.getBoundingClientRect(); if(pre.top<72 || pre.bottom>vh-12){ el.scrollIntoView({block:'center',behavior:'auto'}); } }catch(e){}
  var r=el.getBoundingClientRect(), pad=7;
  sp.classList.add('show');
  sp.style.left=(r.left-pad)+'px'; sp.style.top=(r.top-pad)+'px'; sp.style.width=(r.width+pad*2)+'px'; sp.style.height=(r.height+pad*2)+'px';
  if(mobile){ x=12; y=vh-dh-14; dg.style.transform='translate('+x+'px,'+y+'px)'; return; }   // bottom-sheet
  if(r.left < vw*0.22){                                          // zijbalk → kaart rechts ernaast
    x=r.right+gap; if(x+dw>vw-12) x=Math.max(12, r.left-dw-gap); y=Math.max(12, r.top-4);
  } else if(r.top < 140){                                        // topbar → kaart eronder, rechts uitgelijnd
    y=r.bottom+gap; x=Math.min(r.right-dw, vw-dw-12); if(x<12) x=12;
  } else { y=r.bottom+gap; x=r.left; }
  if(y+dh>vh-12) y=Math.max(12, vh-dh-12);
  if(x+dw>vw-12) x=vw-dw-12;
  if(x<12) x=12;
  dg.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)';
}
function tourNav(dir){ tourIdx+=dir; if(tourIdx>=tourSteps.length){ endTour(true); return; } if(tourIdx<0) tourIdx=0; renderTour(); }
function endTour(remember){
  ['tourScrim','spotlight','tourDialog'].forEach(function(id){ var e=$id(id); if(e) e.classList.remove('show'); });
  var dg=$id('tourDialog'); if(dg){ dg.classList.remove('tour-wide'); dg.style.transform=''; }
  _tourLift(null);
  window.removeEventListener('scroll', _tourReposition, true);
  window.removeEventListener('resize', _tourReposition);
  document.body.classList.remove('tour-on','tour-snap');
  if(window.innerWidth<=980) closeSidebar();
  if(remember){ try{ localStorage.setItem('s27_tour_completed', new Date().toISOString()); }catch(e){} }
}
// scroll/resize: enkel herpositioneren (geen content-rebuild), rAF-gethrottled = vloeiend
function _tourReposition(){
  if(_tourRaf) return;
  _tourRaf=requestAnimationFrame(function(){
    _tourRaf=0;
    var dg=$id('tourDialog'); if(!dg || !dg.classList.contains('show')) return;
    var s=tourSteps[tourIdx]; _tourPlace(s?_tourEl(s):null);
  });
}
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
