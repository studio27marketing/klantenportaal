/* ============================================================
   Studio 27, Klantenportaal · panel + overlay markup
   ============================================================ */

/* ---- reusable line icons (stroke 1.8, round) ---- */
const I = {
  strategie:'<path d="M12 3l2.2 5.5L20 9.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.8-1z"/>',
  branding:'<path d="M12 3l2.5 2.5L18 4l-.5 3.5L21 9l-2.5 2.5L21 14l-3.5.5L18 18l-3.5-.5L12 21l-2.5-3.5L6 18l.5-3.5L3 14l2.5-2.5L3 9l3.5-.5L6 4l3.5 1.5z"/>',
  video:'<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="m15.5 10 6-3v10l-6-3z"/>',
  website:'<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M2.5 8h19M8 21h8M12 17v4"/>',
  ads:'<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  social:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  seo:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  opleiding:'<path d="M22 10 12 5 2 10l10 5 10-5zM6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
  st_progress:'<path d="M3 12h3.2l2-6 3.8 13 2.4-7H21"/>',
  st_feedback:'<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9.5h8M8 13h5"/>',
  st_approved:'<circle cx="12" cy="12" r="9"/><path d="M8.4 12.4l2.4 2.4 4.7-5"/>',
  st_plan:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M12 13v3.4M10.3 14.7h3.4"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  msg:'<path d="M21 11.5a8.4 8.4 0 0 1-12.5 7.3L3 21l2.2-5.5A8.4 8.4 0 1 1 21 11.5z"/>',
  cal:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  doc:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6"/>',
  download:'<path d="M12 3v12M7 11l5 4 5-4M5 21h14"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  trash:'<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/>',
  upload:'<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
  play:'<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m5 19 5-5 4 4 3-3 3 3"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  up:'<path d="M7 14l5-5 5 5"/>',
  down:'<path d="M7 10l5 5 5-5"/>',
  flat:'<path d="M5 12h14"/>',
  spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h0"/>',
  send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin:'<path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  person:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  cart:'<circle cx="9" cy="21" r="1.6"/><circle cx="18" cy="21" r="1.6"/><path d="M2 3h3l2.6 13.4a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.3L23 7H6"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  bug:'<path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  gear:'<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
};
const ic = (n,w=20)=>`<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const logo27 = (w=28)=>`<svg class="logo27" viewBox="782 34 210 130" width="${w}" height="${Math.round(w*0.62)}" fill="currentColor" aria-hidden="true"><path d="M788.07,158.63v-24.58l42.88-39.66c2.71-2.6,4.71-4.86,6.02-6.78,1.3-1.92,2.17-3.64,2.63-5.17,.45-1.52,.68-2.97,.68-4.32,0-2.94-.96-5.22-2.88-6.86-1.92-1.64-4.8-2.46-8.64-2.46-3.5,0-6.84,.93-10,2.8-3.16,1.86-5.65,4.61-7.46,8.22l-30.17-15.08c4.29-8.13,10.73-14.74,19.32-19.83,8.59-5.09,19.26-7.63,32.03-7.63,9.38,0,17.68,1.53,24.91,4.58,7.23,3.05,12.88,7.35,16.95,12.88,4.07,5.54,6.1,12.09,6.1,19.66,0,3.84-.48,7.68-1.44,11.52-.96,3.84-2.91,7.88-5.85,12.12-2.94,4.24-7.29,8.96-13.05,14.15l-32.2,29.32-6.27-13.9h61.52v31.01h-95.08Z"/><path d="M908.23,158.63l44.74-104.4,10.68,16.78h-56.27l15.59-18.13v35.42h-33.05V40h101.52v24.58l-39.49,94.06h-43.72Z"/></svg>`;
const squig = ()=>'';
const scribble = ()=>'';
/* 4 uniforme projectstatus-iconen (overal in het portaal) */
const STATUS_ICON = {todo:'st_plan',prog:'st_progress',wait:'st_feedback',sent:'st_feedback',done:'st_approved'};

const hero = (br,eyebrow,h1html,noCrumb)=>{
  // Breadcrumbs verwijderd (op vraag): ze gaven geen meerwaarde en maakten de look-and-feel
  // complexer. De header toont enkel nog de titel. eyebrow/noCrumb blijven voor compat.
  return `<div class="hero br-${br}">
    <h1 class="hero-h1">${h1html}</h1>
  </div>`;
};

/* ---- service definitions (the "bible") ---- */
const SERVICES = [
  {key:'strategie',br:'blue',name:'Strategie',stamp:'icon-strategie.svg',active:true,status:'<b>1 lopend</b> · merkstrategie 2026'},
  {key:'video',br:'purple',name:'Video- en fotografie',stamp:'icon-video-fotografie.svg',active:true,status:'<b>2 lopend</b> · 1 wacht op jou'},
  {key:'website',br:'green',name:'Webdesign',stamp:'icon-webdesign.svg',active:true,status:'<b>1 lopend</b> · in ontwikkeling'},
  {key:'ads',br:'orange',name:'Online adverteren',stamp:'icon-adverteren.svg',active:true,status:'<b>live</b> · 3 campagnes draaien'},
  {key:'social',br:'yellow',name:'Social media',stamp:'icon-socialmedia.svg',active:true,status:'<b>beheer actief</b> · 12 posts gepland'},
  {key:'branding',br:'pink',name:'Branding',stamp:'icon-branding-heart.svg',active:false,tease:'Sterke merken beginnen bij branding, ontdek wat een frisse huisstijl voor je kan betekenen.'},
  {key:'seo',br:'green',name:'SEO &amp; GEO',stamp:'icon-webdesign.svg',active:false,tease:'Word je wel gevonden in Google én in AI-antwoorden? We kijken het graag eens na.'},
  {key:'opleiding',br:'indigo',name:'Opleidingen',icon:'opleiding',active:false,tease:'Liever zelf aan de slag? Onze opleidingen maken je team marketing-sterk.'},
];

/* ---- project data ---- */
const PROJECTS = [
  {id:'p1',name:'Bedrijfsfilm "Onder één dak"',br:'purple',disc:'Video- en fotografie',discId:'video_fotografie',status:'wait',deliv:true},
  {id:'p2',name:'Nieuwe website & webshop',br:'green',disc:'Website en SEO',discId:'webdesign',status:'prog',deliv:false},
  {id:'p3',name:'Productfotografie najaarscollectie',br:'purple',disc:'Video- en fotografie',discId:'video_fotografie',status:'sent',deliv:true},
  {id:'p4',name:'Merkstrategie & positionering 2026',br:'blue',disc:'Strategie',discId:'strategie',status:'prog',deliv:false},
  {id:'p5',name:'Google Ads, leadcampagne Q2',br:'orange',disc:'Online adverteren',discId:'ads',status:'prog',deliv:false},
  {id:'p6',name:'Social contentkalender mei',br:'yellow',disc:'Social media',discId:'social',status:'done',deliv:false},
  {id:'p7',name:'Recruitmentvideo "Kom bij ons team"',br:'purple',disc:'Video- en fotografie',discId:'video_fotografie',status:'todo',deliv:false},
  {id:'p8',name:'TikTok-campagne lentepromo',br:'orange',disc:'Online adverteren',discId:'ads',status:'done',deliv:false},
  {id:'p9',name:'🛠️ Contactformulier werkt niet',br:'indigo',disc:'Support',discId:'support',status:'prog',deliv:false},
  {id:'p10',name:'Huisstijl-refresh 2026',br:'pink',disc:'Branding',discId:'branding',status:'prog',deliv:false},
];
const STATUS_LABEL = {todo:['Nog in te plannen','pill-todo'],prog:['In productie','pill-prog'],wait:['Klaar voor feedback','pill-wait'],sent:['Klaar voor feedback','pill-wait'],done:['Goedgekeurd','pill-done']};
// Uniforme subtaak-sublabels (item 17): te starten (to do/startklaar) / wordt aan gewerkt (in progress) /
// vraagt verduidelijking (on hold) / klaar voor feedback (feedback klant) / afgewerkt (done+facturatie+gefactureerd).
// Leest bij voorkeur de RUWE backend-status (s.statusRaw); valt terug op de platgeslagen key.
function ondSublabel(s){
  var raw=String((s&&s.statusRaw)||'').toLowerCase().replace(/\s+/g,'_');
  if(/on_?hold|verduidelijk/.test(raw)) return ['Vraagt verduidelijking','ond-chip-hold'];
  if(/feedback_?klant|doorgestuur|klaar_voor_feedback/.test(raw) || s&&(s.status==='wait'||s.status==='sent')) return ['Klaar voor feedback','ond-chip-wait'];
  if(/goedgekeur|^done$|facturat|gefactureerd|afgerond/.test(raw) || s&&s.status==='done') return ['Afgewerkt','ond-chip-ok'];
  if(/in_?progress|in_productie|bezig/.test(raw) || s&&s.status==='prog') return ['Wordt aan gewerkt','ond-chip-prog'];
  return ['Te starten','ond-chip-todo'];
}
function ondChip(s){ var l=ondSublabel(s); return '<span class="ond-chip '+l[1]+'">'+esc(l[0])+'</span>'; }
const DISC = {
  'Video- en fotografie':{icon:'video',br:'purple',stamp:'icon-video-fotografie.svg'},
  'Website en SEO':{icon:'website',br:'green',stamp:'icon-webdesign.svg'},
  'Webdesign':{icon:'website',br:'green',stamp:'icon-webdesign.svg'},
  'SEO & GEO':{icon:'seo',br:'green',stamp:'icon-webdesign.svg'},
  'Strategie':{icon:'strategie',br:'blue',stamp:'icon-strategie.svg'},
  'Online adverteren':{icon:'ads',br:'orange',stamp:'icon-adverteren.svg'},
  'Social media':{icon:'social',br:'yellow',stamp:'icon-socialmedia.svg'},
  'Branding':{icon:'branding',br:'pink',stamp:'icon-branding-heart.svg'},
  'Opleidingen':{icon:'opleiding',br:'indigo'},
  'Automations':{icon:'spark',br:'indigo'},
  'Support':{icon:'msg',br:'indigo'},
};
const DISC_ORDER = ['Strategie','Branding','Video- en fotografie','Webdesign','Website en SEO','SEO & GEO','Social media','Online adverteren','Opleidingen','Automations','Support'];
const discMark = (disc,cls='disc-stamp')=>{const d=DISC[disc];return d&&d.stamp?`<img class="${cls}" src="${ASSET[d.stamp]||('assets/'+d.stamp)}" alt="">`:ic((d&&d.icon)||'doc',20);};
const spill = (st)=>{const m=STATUS_LABEL[st]||STATUS_LABEL.prog;return `<span class="pill ${m[1]}">${ic(STATUS_ICON[st]||'st_progress',13)}<span>${m[0]}</span></span>`;};

/* ===== live-data brug (S27DATA) met mock-fallback ===== */
function _live(){ return !!(window.S27DATA && typeof state!=='undefined' && !state.demoMode && state.session); }
function _projects(){ const p = window.S27DATA && S27DATA.projects(); if(p && p.length!==undefined) return p; return state.demoMode ? PROJECTS : []; }   // LIVE: nooit terugvallen op voorbeeld-projecten
// advertentie-taak = primaire discipline 'ads' OF uitsluitend ads-labels. Die leven ENKEL op de Ads-pagina.
function _isAdProject(p){ if(!p) return false; if(p.discId==='ads') return true; var ls=p.labels||[]; return ls.length>0 && ls.every(function(l){return l.discId==='ads';}); }
function _adProject(){ return _projects().filter(_isAdProject)[0] || null; }   // huidige-maand ads-taak (worker filtert al op due deze maand)
// De Projecten-pagina toont ENKEL de echte 'deliverable'-trajecten: video/fotografie, webdesign en branding.
// Doorlopende diensten (social, ads, seo) + losse disciplines (strategie, opleiding, automation) hebben hun
// eigen pagina/flow en horen niet in het projectenoverzicht. (Cluster F, Vincent: "enkel video/branding/webdesign".)
var PROJ_DISC_WHITELIST = ['video_fotografie','webdesign','branding','support'];   // support = opvolgbare website-tickets
function _isProjectDisc(p){ if(!p) return false; var ls=(p.labels&&p.labels.length)?p.labels:[{discId:p.discId}]; return ls.some(function(l){ return PROJ_DISC_WHITELIST.indexOf(l.discId)>=0; }); }
function _nonAdProjects(){ return _projects().filter(function(p){ return !_isAdProject(p); }); }   // alle niet-ads-projecten (meeting-planner e.d.), blacklist
function _overviewProjects(){ return _projects().filter(_isProjectDisc); }   // (legacy; tak-pagina's gebruiken _takProjects)
/* ---- Dakstructuur (Q): tak-registry, elke tak = eigen zijbalk-pagina ---- */
const TAK_TABS = {
  strategie: { discIds:['strategie'],        label:'Strategie',            br:'blue',   stamp:'icon-strategie.svg' },
  branding:  { discIds:['branding'],         label:'Branding',             br:'pink',   stamp:'icon-branding-heart.svg' },
  video:     { discIds:['video_fotografie'], label:'Video- en fotografie', br:'purple', stamp:'icon-video-fotografie.svg' },
};
const TAK_WEBSITE = { discIds:['webdesign','support'], label:'Website', br:'green', stamp:'icon-webdesign.svg' };   // sub-sectie van de Website-tab
// CONTENT-takken (Vincent 2026-06-13): video, branding en strategie delen exact dezelfde
// werkwijze + look&feel, pure projectenlijst (geen contactkaart, geen 'plan een meeting',
// geen apart archief), auto-landing bij 1 project, en in de detail de onderdelen-per-subtaak
// met geintegreerde bestand-feedback. Eén bron van waarheid zodat de drie takken niet uiteenlopen.
var CONTENT_TAK_KEYS=['video','branding','strategie'];
function _isContentTak(key){ return CONTENT_TAK_KEYS.indexOf(key)>=0; }
function _takProjects(discIds){
  return _projects().filter(function(p){
    var ls=(p.labels&&p.labels.length)?p.labels:[{discId:p.discId}];
    return ls.some(function(l){ return discIds.indexOf(l.discId)>=0; });
  });
}
// Website-tak: een project hoort thuis op precies ÉÉN tak (takOfProject geeft content-takken voorrang op
// Website). Toon op Website daarom enkel projecten waarvan de THUIS-tak 'webprestaties' is, zodat een primair
// video-/branding-project met een los webdesign-sublabel niet (met zijn shoot-'in te plannen'-acties) naar de
// Website-tak lekt. (Bug 86ca93hzg) De projecten blijven sowieso vindbaar onder 'Alle projecten'.
function _webProjects(){ return _takProjects(TAK_WEBSITE.discIds).filter(function(p){ return takOfProject(p)==='webprestaties'; }); }
// terug-tak van een project (voor openProject('auto') + detail-terugknop)
function takOfProject(p){
  if(!p) return 'start';
  var ls=(p.labels&&p.labels.length)?p.labels:[{discId:p.discId}];
  for(var key in TAK_TABS){ if(ls.some(function(l){ return TAK_TABS[key].discIds.indexOf(l.discId)>=0; })) return key; }
  if(ls.some(function(l){ return TAK_WEBSITE.discIds.indexOf(l.discId)>=0; })) return 'webprestaties';
  // defensieve fallback: leid de tak rechtstreeks af uit discId (labels leeg/mismatch mag NOOIT
  // naar 'berichten' vallen, anders springt de terugknop naar het verkeerde scherm, review v85)
  for(var k2 in TAK_TABS){ if(TAK_TABS[k2].discIds.indexOf(p.discId)>=0) return k2; }
  if(TAK_TABS[p.discId]) return p.discId;
  if(TAK_WEBSITE.discIds.indexOf(p.discId)>=0) return 'webprestaties';
  return 'berichten';
}
// label van een tak-key (voor de review-overlay-kop, item 11)
function takLabelOf(key){
  if(TAK_TABS[key]) return TAK_TABS[key].label;
  if(key==='webprestaties'||key==='website') return TAK_WEBSITE.label;
  var M={social:'Social media',adverteren:'Adverteren',berichten:'Projecten'};
  return M[key]||'';
}
// projecttitel + tak voor een taak (root of subtaak), door feedback-core gebruikt zodat de
// review-overlay altijd de PROJECTNAAM + TAK toont i.p.v. de bestandsnaam/'Open in Drive' (item 11).
window.S27ProjectMeta = function(taskId){
  try{
    var list=_projects()||[];
    var p=list.find(function(x){ return x.id===taskId; });
    if(!p && window.state && state.activeProject) p=list.find(function(x){ return x.id===state.activeProject; });
    if(!p) return {};
    return { title: p.name||'', tak: takLabelOf(takOfProject(p)) };
  }catch(e){ return {}; }
};
// JS-string-veilige escape voor inline onclick-args (esc() zet ' om naar &#39; dat in een
// dubbel-quoted attribuut weer ' wordt en de JS-string breekt; \x27 heeft geen HTML-betekenis).
function jsEsc(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,'\\x27').replace(/"/g,'\\x22').replace(/</g,'\\x3c'); }
function _isSocialProject(p){ if(!p) return false; if(p.discId==='social') return true; var ls=p.labels||[]; return ls.length>0 && ls.every(function(l){return l.discId==='social';}); }
function _socProject(){ return _projects().filter(_isSocialProject)[0] || null; }   // sociale-media-taak (zelfde maand-logica als de ads-taak)
function _greetNaam(){ var n=(window.S27DATA && S27DATA.klantNaam && S27DATA.klantNaam())||''; if(n && n!=='daar') return n; return _live()?'daar':'Sarah'; }
function _bedrijf(){ return (window.S27DATA && S27DATA.bedrijfsnaam && S27DATA.bedrijfsnaam()) || 'TEST CLIENT BV'; }
/* SA&E-namen kort tonen (geen foto-iconen). Geeft "" terug als er geen toegewezen teamleden zijn. */
function voornaam(n){ return String(n||'').trim().split(/\s+/)[0]||''; }
function saeNames(sae){
  if(!sae || !sae.length) return '';
  const names=sae.map(function(s){ return esc(voornaam(s.naam)); }).filter(Boolean);
  if(!names.length) return '';
  return `${ic('person',12)}<span>${names.join(', ')}</span>`;
}
// chat-header: toon met wie de klant chat (naam + initialen-avatar van de SA&E van de taak)
function saeChatWho(sae, closed){
  if(closed) return '<span class="dc-sub">afgerond</span>';
  if(sae && sae.length){
    const s=sae[0]; const extra=sae.length>1?(' +'+(sae.length-1)):'';
    return `<span class="dc-who"><span class="dc-av">${esc(s.initialen||'S2')}</span><span class="dc-sub">met ${esc(voornaam(s.naam))}${extra}</span></span>`;
  }
  return '<span class="dc-sub">met je team</span>';
}

/* =========================================================
   PANEL BUILDERS
   ========================================================= */
function svcStamp(s){
  return s.stamp ? `<img class="stamp" src="${ASSET[s.stamp]||('assets/'+s.stamp)}" alt="">` : `<span class="stamp-ic">${ic(s.icon,28)}</span>`;
}
const SVC_DISC = { strategie:'strategie', video:'video_fotografie', website:'webdesign', ads:'ads', social:'social', branding:'branding', seo:'seo', opleiding:'opleiding' };
function svcActive(s){ return _live() ? S27DATA.discActive(SVC_DISC[s.key]) : s.active; }
function svcAction(s){
  const discMap={strategie:'Strategie',video:'Video- en fotografie',website:'Webdesign',seo:'SEO & GEO',branding:'Branding'};
  return discMap[s.key] ? `goDienst('${discMap[s.key]}')` : `goTab('${s.key==='ads'?'advertenties':'socials'}')`;
}
function svcCard(s){
  if(svcActive(s)){
    return `<div class="svc-card br-${s.br}">
      <div class="svc-head"><div class="svc-ic">${svcStamp(s)}</div><h3>${s.name}</h3></div>
      <div class="svc-status">${s.status||'Actief voor jou'}</div>
      <div class="svc-foot"><button class="btn btn-branch btn-sm ${s.br==='yellow'?'on-yellow':''}" onclick="${svcAction(s)}">Bekijk ${ic('arrow',15)}</button></div>
    </div>`;
  }
  // 'locked' (niet 'svc-inactief'): ALLE dimming-styling (dashed border, slot-icoon, stamp-opacity)
  // staat onder .svc-card.locked in styles.css. Zo komt de upsell-/FOMO-hiërarchie correct terug.
  return `<div class="svc-card locked br-${s.br}">
    <div class="lock">${ic('lock',15)}</div>
    <div class="svc-head"><div class="svc-ic">${svcStamp(s)}</div><h3>${s.name}</h3></div>
    <p class="tease">${s.tease||'Interesse in deze dienst? Vraag vrijblijvend een offerte, we kijken graag wat we voor je kunnen doen.'}</p>
    <div class="svc-foot"><button class="btn btn-branch btn-sm ${s.br==='yellow'?'on-yellow':''}" onclick="goDienstOfferte('${s.key}')">Vraag offerte aan ${ic('arrow',15)}</button></div>
  </div>`;
}
function buildSvcCards(){ return SERVICES.map(svcCard).join(''); }
const _COCKPIT_MOCK = [
  { br:'indigo', cat:'Support', nid:'sup-open', title:'1 open supportvraag', ctx:'Volg de status of chat rechtstreeks met het team.', cta:'Bekijk je vragen', action:"goSupport()", urgent:false, icon:'msg' },
  {br:'purple',cat:'Video- en fotografie',title:'Review nodig',ctx:'De eerste montage van je bedrijfsfilm <b>"Onder één dak"</b> staat klaar. Geef je akkoord of je feedback.',cta:'Bekijk montage',action:"openProject('p1')",tag:'vandaag',urgent:true,icon:'st_feedback'},
  {br:'blue',cat:'Strategie',title:'Feedback gevraagd',ctx:'We willen je input op de <b>positionering</b> voor 2026 voor we verder bouwen.',cta:'Geef feedback',action:"openProject('p4')",tag:'deze week',urgent:false,icon:'st_feedback'},
  {br:'orange',cat:'Online adverteren',title:'Rapport inplannen',ctx:'Tijd om de <b>resultaten van je campagnes</b> samen te bekijken. Prik een moment dat jou past.',cta:'Plan in',action:"goTab('meetings')",tag:'mei',urgent:false,icon:'st_plan'},
  {br:'yellow',cat:'Social media',title:'Feedback gevraagd',ctx:'Je <b>contentkalender</b> staat klaar ter goedkeuring. Bekijk de geplande posts en geef je akkoord.',cta:'Bekijk posts',action:"goTab('socials')",tag:'deze week',urgent:false,icon:'st_feedback'},
  {br:'purple',cat:'Video- en fotografie',title:'Klaar om in te plannen',ctx:'Je <b>productshoot</b> is klaar om ingepland te worden. Prik een datum die jou past.',cta:'Plan shoot',action:"openProject('p3')",tag:'binnenkort',urgent:true,icon:'st_plan'},
  {br:'green',cat:'Webdesign',title:'Bericht wacht op jou',ctx:'We hebben een vraag in de chat van je <b>nieuwe website</b>. Laat iets weten zodat we verder kunnen.',cta:'Open chat',action:"openProjectChat('p2')",urgent:false,icon:'msg'},
  {br:'pink',cat:'Branding',title:'Nieuw bericht van je team',ctx:'Je team schreef iets in de chat van <b>Branding-traject</b>: “We hebben het moodboard net bijgewerkt, geef gerust je eerste indruk.”',cta:'Lees bericht',action:"openProjectChat('p4')",urgent:false,icon:'msg'}
];
function _cockpitCard(a){
  return `<div class="action-card ${a.urgent?'urgent':''} br-${a.br}">
    <div class="ac-top"><div class="ac-ico">${ic(a.icon||'st_feedback',19)}</div><div class="ac-titles"><span class="ac-cat">${esc(a.cat)}</span><h4>${esc(a.title)}</h4></div></div>
    <p class="ac-ctx">${a.ctx}</p>
    <div class="ac-foot"><button class="btn btn-branch btn-sm br-${a.br}" onclick="${a.action}">${esc(a.cta)}</button></div>
  </div>`;
}
function _runRow(r){ const sae=saeNames(r.sae); const discBit=(r.labels&&r.labels.length)?discChips(r.labels):`<span class="run-disc">${esc(r.disc)}</span>`; return `<button class="run-row br-${r.br}" onclick="${r.id?`openProject('${esc(r.id)}','auto')`:`goTab('start')`}"><div class="run-top">${discBit}<span class="pill pill-${r.status}">${ic(STATUS_ICON[r.status]||'st_progress',12)}<span>${esc(r.label)}</span></span></div><b class="run-name">${esc(r.name)}</b>${sae?`<span class="sae-line">${sae}</span>`:''}<div class="run-prog"><div class="rp-bar"><i style="width:${r.pct||0}%"></i></div><span class="rp-pct">${r.pct||0}%</span></div></button>`; }
function _doneRow(d){
  const meta=[esc(d.disc), (d.when&&typeof d.when==='string')?esc(d.when):''].filter(Boolean).join(' · ');
  const sae=saeNames(d.sae);
  const inner=`<span class="check-circ">${ic('check',13)}</span><div class="done-main"><b>${esc(d.name)}</b><span class="done-meta">${meta}</span>${sae?`<span class="sae-line">${sae}</span>`:''}</div><span class="run-dot"></span>`;
  // klikbaar als de afgeronde taak een project-id heeft (opent het detail; bestanden zichtbaar indien aanwezig)
  if(d.id) return `<button class="done-row br-${d.br}" style="width:100%;text-align:left;border:none;cursor:pointer;background:none" onclick="openProject('${esc(d.id)}','auto')">${inner}</button>`;
  return `<div class="done-row br-${d.br}">${inner}</div>`;
}
function panelStart(){
  const cock = window.S27DATA && S27DATA.cockpit();
  const head = hero('blue', _bedrijf(), `Welkom terug, <span class="accent">${esc(_greetNaam())}</span>`, true);
  // Home toont enkel "Voor jou te doen", het volledige projectenoverzicht leeft op de Projecten-pagina.
  let cockHtml;
  if(cock){
    cockHtml = cock.length
      ? `<div class="section-head"><h2>Voor jou te doen</h2><span class="count">${cock.length} ${cock.length===1?'item':'items'}</span></div><div class="cockpit-row">${cock.map(_cockpitCard).join('')}</div>`
      : `<div class="empty" style="margin-top:24px"><div class="em-ic">${ic('st_approved',64)}</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Alles is bij!</b><p style="margin:6px 0 0">Er staat momenteel niets op jou te wachten, wij werken ondertussen verder.</p></div>`;
  } else if(state.demoMode){
    cockHtml = `<div class="section-head"><h2>Voor jou te doen</h2><span class="count">${_COCKPIT_MOCK.length} items</span></div><div class="cockpit-row">${_COCKPIT_MOCK.map(_cockpitCard).join('')}</div>`;
  } else {
    // LIVE zonder geladen cockpit -> laad-indicator, NOOIT de voorbeeld-actiekaarten.
    cockHtml = `<div class="section-head"><h2>Voor jou te doen</h2></div><div class="empty" style="padding:40px 18px"><div class="brand-spinner" style="margin:0 auto"></div><p style="text-align:center;margin-top:10px">Je overzicht wordt geladen…</p></div>`;
  }
  return head + cockHtml;
}

// svc-kaart-key -> de offerte-samensteller-GROEP die we openen bij 'Vraag offerte aan'.
// Strategie én Ads gaan bewust naar 'Adverteren' (daar bemachtigen we de aanvraag).
// dienst-tegels openen de offerte-wizard met de juiste tak voorgeselecteerd (stap 2)
const SVC_TO_TAK = { strategie:'strategie', ads:'ads', video:'video', website:'website', seo:'website', branding:'branding', social:'social', opleiding:'strategie' };
function goDienstOfferte(key){ openOfferteWizard(SVC_TO_TAK[key]||''); }
// Berichten = iOS-stijl inbox: één rij per projectchat (avatar, naam, laatste bericht, tijd,
// ongelezen-dot) -> klik opent de schermvullende chat van dat project (detail-Chat-tab).
const BERICHT_MOCK_LAST={
  p1:{tekst:'De eerste montage staat klaar, kijk je even mee?', uren:2,  wacht:true},
  p2:{tekst:'De nieuwe homepage staat op staging, link volgt straks.', uren:7, wacht:true},
  p3:{tekst:'Top, dan plannen we de nabewerking deze week in.', uren:30, wacht:false},
  p4:{tekst:'Bedankt voor jullie input tijdens de sessie!', uren:78, wacht:false},
  p6:{tekst:'De contentkalender voor mei is goedgekeurd ✔', uren:120, wacht:false},
  p9:{tekst:'We kijken vandaag nog naar het formulier.', uren:4, wacht:true},
  p10:{tekst:'Eerste schetsen van de huisstijl-refresh komen eraan.', uren:26, wacht:false}
};
function _inboxWhen(ts){
  if(!ts) return '';
  var d=new Date(Number(ts)); if(isNaN(d.getTime())) return '';
  var nu=new Date(); var diff=nu-d;
  if(d.toDateString()===nu.toDateString()) return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
  if(diff<6*86400000) return ['zo','ma','di','wo','do','vr','za'][d.getDay()];
  return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);
}
function _inboxRow(p){
  var lc=p.lastChat||null;
  if(!lc && state.demoMode && BERICHT_MOCK_LAST[p.id]){ var m=BERICHT_MOCK_LAST[p.id]; lc={tekst:m.tekst, ts:Date.now()-m.uren*3600000, wacht:m.wacht}; }
  var snippet=lc&&lc.tekst?lc.tekst:'Open de chat en stel je vraag over dit project.';
  var when=lc?_inboxWhen(lc.ts):'';
  var wacht=lc?!!lc.wacht:false;
  // Team-weergave (staff): toon of de klant het nieuwste TEAM-bericht al las.
  var readTag='';
  if(typeof isRichView==='function' && isRichView() && lc && lc.van_klant===false){
    readTag = lc.read_by_client
      ? '<span class="ios-read" style="font-size:11px;color:var(--s27-green-ink,#147A50);margin-left:8px;white-space:nowrap;flex:none">'+ic('check',11)+' gelezen</span>'
      : '<span class="ios-read" style="font-size:11px;color:var(--ink-4);margin-left:8px;white-space:nowrap;flex:none">nog niet gelezen</span>';
  }
  return '<button class="ios-row br-'+p.br+'" onclick="openProjectChat(\''+esc(p.id)+'\')">'
    +'<span class="ios-dot'+(wacht?' on':'')+'"></span>'
    +'<span class="ios-av" style="background:var(--s27-'+p.br+')">'+discMark(p.disc,'ios-av-ic')+'</span>'
    +'<span class="ios-main"><span class="ios-top"><b>'+esc(p.name)+'</b><span class="ios-when">'+esc(when)+'</span></span>'
    +'<span class="ios-snippet'+(wacht?' unread':'')+'" style="display:flex;align-items:center">'+'<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(snippet)+'</span>'+readTag+'</span></span>'
    +'<svg class="ios-chev" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>';
}
function panelBerichten(){
  // GOLF 4 (11-07): vaste, vindbare ingang voor de bedrijfsbrede teamchat
  // (openClientChat) bovenaan de Berichten-tab - los van een project.
  var teamChatCard='<div class="card" style="display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap;padding:14px 16px;margin-bottom:12px">'
    +'<div style="min-width:0"><b style="font-family:var(--font-display);font-size:15px">Chat met je team</b>'
    +'<div style="font-size:12.5px;color:var(--ink-3);margin-top:2px">Algemene vraag, los van een project? Het hele Studio 27-team leest mee.</div></div>'
    +'<button class="btn btn-primary btn-sm" onclick="openClientChat()" style="flex:none">'+ic('msg',15)+' Open de chat</button></div>';
  // alle projecten (ook social/ads/support), elke projectchat blijft hier bereikbaar
  var projs=_projects().slice();
  projs.forEach(function(p){ if(!p.lastChat && state.demoMode && BERICHT_MOCK_LAST[p.id]){ var m=BERICHT_MOCK_LAST[p.id]; p._sortTs=Date.now()-m.uren*3600000; } else { p._sortTs=(p.lastChat&&p.lastChat.ts)||0; } });
  projs.sort(function(a,b){ return (b._sortTs-a._sortTs)||String(a.name).localeCompare(String(b.name)); });
  if(!projs.length) return teamChatCard+'<div class="empty" style="padding:50px 20px"><div class="em-ic">'+ic('msg',64)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Nog geen projectgesprekken</b><p style="margin:6px 0 0">Zodra er een project loopt, chat je hier rechtstreeks met het team. Algemene vragen kunnen altijd via de teamchat hierboven.</p></div>';
  return teamChatCard+'<div class="card ios-inbox">'+projs.map(_inboxRow).join('')+'</div>';
}

// Discipline-chips: kleine label(s) die aangeven waar een hoofdtaak over gaat. Eén hoofdtaak
// kan meerdere disciplines bevatten (bv. branding + webdesign) -> meerdere chips naast elkaar.
function discChips(labels){
  if(!labels||!labels.length) return '';
  return `<span class="disc-chips">`+labels.map(function(l){
    return `<span class="disc-chip br-${l.br||'blue'}">${discMark(l.label,'disc-chip-ic')}<span>${esc(l.label)}</span></span>`;
  }).join('')+`</span>`;
}
// Projecten worden geclusterd per ACTIEPUNT (wat er van de klant verwacht wordt), elk cluster
// in een grid van ≥2 kolommen. Eén hoofdtaak verschijnt ÉÉN keer met haar discipline-label(s).
const PROJ_CLUSTERS = [
  {key:'feedback', statuses:['wait','sent'], title:'Klaar voor jouw feedback', sub:'Hier wachten we op je akkoord of input om verder te kunnen.', br:'orange'},
  {key:'plannen',  statuses:['todo'],        title:'Nog in te plannen of op te starten', sub:'Klaar om samen te beginnen, prik een moment of laat iets weten.', br:'blue'},
  {key:'bezig',    statuses:['prog'],        title:'Wij werken eraan', sub:'Loopt bij ons, je hoeft nu even niets te doen.', br:'green'}
];
function projCluster(cl, grp, num, fromTab){
  if(!grp.length) return '';
  return `<section class="projcluster" data-cluster="${cl.key}">
    <div class="projcluster-head br-${cl.br}"><span class="pc-num">${num||''}</span>
      <div class="pc-htx"><h3>${esc(cl.title)}</h3><p>${esc(cl.sub)}</p></div>
      <span class="pc-count">${grp.length}</span></div>
    <div class="projflat-grid">${grp.map(function(p){return projCardFlat(p, fromTab);}).join('')}</div>
  </section>`;
}
function projDienst(list, fromTab, incDone){
  const all=(list||_overviewProjects()).filter(p=>incDone?true:(p.status!=='done'));
  if(!all.length) return `<div class="empty"><div class="em-ic">${ic('st_approved',64)}</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Geen actieve projecten</b><p style="margin:6px 0 0">Zodra we samen aan iets nieuws starten, verschijnt het hier.</p></div>`;
  const sortFn=(a,b)=>{ const ia=DISC_ORDER.indexOf(a.disc),ib=DISC_ORDER.indexOf(b.disc); return ((ia<0?99:ia)-(ib<0?99:ib))||String(a.name).localeCompare(String(b.name)); };
  let html='', _n=0;
  const clusters=incDone?PROJ_CLUSTERS.concat([{key:'goedgekeurd', statuses:['done'], title:'Goedgekeurd', sub:'Afgerond en goedgekeurd, verdwijnt hier na facturatie.', br:'green'}]):PROJ_CLUSTERS;
  clusters.forEach(cl=>{ var grp=all.filter(p=>cl.statuses.indexOf(p.status)>=0).sort(sortFn); if(grp.length){ _n++; html+=projCluster(cl, grp, _n, fromTab); } });
  // statussen die in geen enkel cluster vallen: verzamelcluster zodat nooit een project verdwijnt
  const rest=all.filter(p=>!PROJ_CLUSTERS.some(cl=>cl.statuses.indexOf(p.status)>=0)).sort(sortFn);
  if(rest.length){ _n++; html+=projCluster({key:'overig', statuses:[], title:'Overige projecten', sub:'Lopende trajecten bij Studio 27.', br:'blue'}, rest, _n, fromTab); }
  return `<div class="projclusters">${html}</div>`;
}
// video-tak projectrij: naam + voornaam hoofdverantwoordelijke + oranje to-do-teller + Open-knop
function videoProjRij(p, takKey){
  var n=(p.actiesTodo!=null&&p.actiesTodo>0)?p.actiesTodo:projActieTeller(p);
  var wie=(p.sae&&p.sae[0]&&p.sae[0].naam)?String(p.sae[0].naam).split(/\s+/)[0]:'';
  var st=STATUS_LABEL[p.status]||STATUS_LABEL.prog;
  var cid=String(p.id||'').replace(/[^A-Za-z0-9_-]/g,'');
  return '<button class="vrij-row card br-'+p.br+'" onclick="openProject(\''+cid+'\',\''+(takKey||'video')+'\')">'
    +(n?'<span class="vrij-todo" title="'+n+' actie'+(n===1?'':'s')+' voor jou">'+n+'</span>':'')
    +'<span class="vrij-main"><b>'+esc(p.name)+'</b>'
    +'<span class="vrij-sub">'+(wie?ic('user',12)+' '+esc(wie)+' · ':'')+esc(st[0])+'</span></span>'
    +'<span class="btn btn-branch br-'+p.br+' btn-sm vrij-open">Open project '+ic('arrow',14)+'</span></button>';
}
// actieteller per project: feedback die wacht + in te plannen shoots/meetings + chat-wacht.
function projActieTeller(p){
  var n=0;
  if(p.status==='wait'||p.status==='sent') n++;                       // klaar voor jouw feedback
  n+=((p.planItems&&p.planItems.length)||0);                          // shoots/meetings in te plannen
  if(p.lastChat&&p.lastChat.wacht) n++;                               // bericht wacht op antwoord
  return n;
}
// platte hoofdtaak-kaart: naam + discipline-chip(s), status, deliverable-badge, SA&E-namen.
function projCardFlat(p, fromTab){
  const sae=saeNames(p.sae);
  let discs=(p.labels&&p.labels.length)?p.labels:[{discId:p.discId,br:p.br,label:p.disc}];
  // binnen een tak-pagina is het tak-label dubbelop (staat al op de tab) -> enkel afwijkende labels tonen
  const takDef=(typeof TAK_TABS!=='undefined'&&TAK_TABS[fromTab])||((fromTab==='webprestaties'&&typeof TAK_WEBSITE!=='undefined')?TAK_WEBSITE:null);
  if(takDef) discs=discs.filter(function(l){ return takDef.discIds.indexOf(l.discId)<0; });
  const dataDiscs=discs.map(function(l){return l.label;}).join('|');
  const cid=String(p.id||'').replace(/[^A-Za-z0-9_-]/g,'');
  const acties=projActieTeller(p);
  return `<button class="projflat-card br-${p.br}" data-discs="${esc(dataDiscs)}" data-status="${p.status}" onclick="openProject('${cid}','${esc(fromTab||'auto')}')">
    ${acties?`<span class="pf-notif" title="${acties} actie${acties===1?'':'s'} voor jou">${acties}</span>`:''}
    <span class="pf-main">
      <span class="pf-name pf-name--calm">${esc(p.name)}</span>
      ${discChips(discs)}
    </span>
    <span class="pf-foot">${spill(p.status)}${sae?`<span class="sae-line">${sae}</span>`:''}${p.deliv?`<span class="pc-deliv">${ic('download',13)} klaar</span>`:''}</span>
  </button>`;
}
/* ---- Tak-pagina (Q): lopende projecten + hoofdcontact + archief, per tak ---- */
function _takHoofdcontact(actief){
  // meest voorkomende assignee over de actieve takprojecten = hoofdcontactpersoon
  var tel={}; var beste=null;
  actief.forEach(function(p){ (p.sae||[]).forEach(function(s){ var k=s.naam||''; if(!k) return; tel[k]=(tel[k]||0)+1; if(!beste||tel[k]>tel[beste.naam||'']) beste=s; }); });
  return beste;   // {naam, initialen} of null -> accountmanager-fallback
}
function takContactCard(key, T, actief){
  var hc=_takHoofdcontact(actief);
  var naam=voornaam(hc?hc.naam:'Ilke')||'Ilke';
  var ini=hc?(hc.initialen||'?'):'IM';
  var rol=hc?'Werkt aan jouw '+T.label.toLowerCase()+'-projecten':'Jouw accountmanager';
  return '<div class="takcontact card br-'+T.br+'"><span class="dc-av" style="background:var(--s27-'+T.br+')">'+esc(ini)+'</span>'
    +'<div class="takcontact-tx"><b>'+esc(naam)+'</b><span>'+esc(rol)+'</span></div>'
    +((typeof isRichView==='function'&&isRichView())?'<button class="btn btn-branch br-'+T.br+' btn-sm" onclick="openMeetingPlannerForTak(\''+key+'\')">'+ic('cal',15)+' Plan een meeting</button>':'')+'</div>';
}
function takArchiefSectie(key, T){
  if(state.demoMode){
    return '<section class="takarch" id="takArch-'+key+'"><div class="section-head" style="margin-top:26px"><h2>Archief</h2></div>'
      +'<p class="sdesc">Hier vind je je recent afgeronde '+esc(T.label.toLowerCase())+'-projecten terug, tot 30 dagen na facturatie.</p></section>';
  }
  var done=(window.S27DATA&&S27DATA.done&&S27DATA.done())||[];
  var rows=done.filter(function(d){ var ls=(d.labels&&d.labels.length)?d.labels:[{discId:''}]; return ls.some(function(l){ return T.discIds.indexOf(l.discId)>=0; }); });
  var inner=rows.length?rows.map(function(d){ return _doneRow(d); }).join(''):'<p class="sdesc">Geen recent afgeronde projecten. Afgeronde projecten blijven hier zichtbaar tot 30 dagen na facturatie.</p>';
  return '<section class="takarch" id="takArch-'+key+'"><div class="section-head" style="margin-top:26px"><h2>Archief</h2><span class="count">'+rows.length+'</span></div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'+inner+'</div></section>';
}
function panelTak(key){
  const T=TAK_TABS[key]; if(!T) return '';
  const all=_takProjects(T.discIds);
  const isContent=_isContentTak(key);      // content-takken (video/branding/strategie): pure lijst, geen contactkaart/archief
  const zicht=isContent?all:all.filter(p=>p.status!=='done');
  const leeg='<div class="empty"><div class="em-ic">'+(T.stamp?'<img src="assets/'+T.stamp+'" width="56" height="56" alt="">':ic('doc',56))+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Nog geen '+esc(T.label.toLowerCase())+'-projecten</b><p style="margin:6px 0 14px">Zin om hier samen iets op te starten?</p><button class="btn btn-branch br-'+T.br+'" onclick="openOfferteWizard(\''+(key==='video'?'video':key)+'\')">'+ic('plus',15)+' Start een aanvraag</button></div>';
  if(isContent){
    // Afgewerkte (gefactureerde) projecten blijven vindbaar via het archief — ook op de content-takken zelf,
    // niet enkel onder 'Alle projecten'/Website. (Bug 86ca95yxj) takArchiefSectie heeft een eigen lege-staat.
    var arch=takArchiefSectie(key, T);
    if(!zicht.length){
      // geen lopende projecten: toon de uitnodiging, en hang het archief eronder ALS er afgeronde projecten zijn
      var hasArch=!state.demoMode && ((window.S27DATA&&S27DATA.done&&S27DATA.done())||[]).some(function(d){ var ls=(d.labels&&d.labels.length)?d.labels:[{discId:''}]; return ls.some(function(l){ return T.discIds.indexOf(l.discId)>=0; }); });
      return leeg+(hasArch?arch:'');
    }
    // vlakke, chronologische lijst (Vincent 2026-06-11): geen actiepunt-clusters, gewoon
    // alle lopende projecten onder elkaar in volgorde van aanmaak.
    var rows=zicht.slice().sort(function(a,b){ return (a.dateCreated||0)-(b.dateCreated||0); })
      .map(function(p){ return videoProjRij(p, key); }).join('');
    return '<div class="vrij-lijst">'+rows+'</div>'+arch;
  }
  const lopend=zicht.length ? projDienst(all, key) : leeg;
  return takContactCard(key, T, zicht)+lopend+takArchiefSectie(key, T);
}
/* ---- 'Alle projecten' (dwarsdoorsnede: alle takken, lopend + afgerond) ---- */
function panelAlleProjecten(){
  var act=_projects().filter(function(p){ return p && _isProjectDisc(p) && !_isAdProject(p); });
  var done=(window.S27DATA&&S27DATA.done&&S27DATA.done())||[];
  var seen={}; act.forEach(function(p){ seen[p.id]=1; });
  var afg=done.filter(function(p){ return p && !seen[p.id] && _isProjectDisc(p) && !_isAdProject(p); });
  var lopend=act.filter(function(p){ return p.status!=='done'; });
  var afgerond=act.filter(function(p){ return p.status==='done'; }).concat(afg);
  if(!lopend.length && !afgerond.length){
    return '<div class="empty"><div class="em-ic">'+ic('doc',56)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Nog geen projecten</b><p style="margin:6px 0 0">Zodra we voor je aan de slag gaan, verschijnen je projecten hier.</p></div>';
  }
  var byDate=function(a,b){ return (b.dateCreated||0)-(a.dateCreated||0); };
  var sec=function(titel,arr,mt){ return arr.length?('<section><div class="section-head"'+(mt?' style="margin-top:24px"':'')+'><h2>'+titel+'</h2><span class="count">'+arr.length+'</span></div><div style="display:flex;flex-direction:column;gap:8px">'+arr.slice().sort(byDate).map(function(p){ return projCardFlat(p,'alle-projecten'); }).join('')+'</div></section>'):''; };
  return sec('Lopend',lopend,false)+sec('Afgerond',afgerond,lopend.length>0);
}

/* ---- Socials (Metricool), netwerk/status-helpers + render ---- */
const MC_NET={linkedin:['LinkedIn','#0a66c2'],facebook:['Facebook','#1877f2'],instagram:['Instagram','#d6336c'],tiktok:['TikTok','#111827'],twitter:['X','#111827'],x:['X','#111827'],youtube:['YouTube','#ff0000'],gbp:['Google','#1a73e8'],google:['Google','#1a73e8'],bluesky:['Bluesky','#1185fe'],pinterest:['Pinterest','#bd081c'],threads:['Threads','#111827']};
function mcNet(n){ n=(n||'').toLowerCase(); return MC_NET[n]||[(n?n.charAt(0).toUpperCase()+n.slice(1):'Post'),'#667684']; }
function mcStatus(s){ s=(s||'').toUpperCase();
  if(s.indexOf('PUBLISH')>=0) return ['Gepubliceerd','#15803d','#dcfce7'];
  if(/ERROR|FAIL|REJECT/.test(s)) return ['Fout','#b91c1c','#fee2e2'];
  if(s.indexOf('DRAFT')>=0) return ['Concept','#92740b','#fef3c7'];
  if(/PEND|SCHEDUL/.test(s)) return ['Gepland','#1e5f9e','#dbeafe'];
  return [s?(s.charAt(0)+s.slice(1).toLowerCase()):'Gepland','#475569','#e2e8f0']; }
function mcOverall(p){ var ss=(p.netwerken||[]).map(function(n){return n.status||'';});
  if(ss.some(function(s){return /ERROR|FAIL|REJECT/i.test(s);})) return mcStatus('ERROR');
  if(ss.some(function(s){return /PEND|SCHEDUL/i.test(s);})) return mcStatus('PENDING');
  if(ss.some(function(s){return /PUBLISH/i.test(s);})) return mcStatus('PUBLISHED');
  return mcStatus(ss[0]||''); }
function mcStyleOnce(){ if(typeof document==='undefined'||!document.head||document.getElementById('mcStyleHead')) return ''; var __s=document.createElement('style'); __s.id='mcStyleHead'; __s.textContent=(''
  +'.soc-matrix{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:4px 0 16px}.soc-mcard{position:relative;text-align:left;background:var(--paper,#fff);border:1px solid var(--line);border-radius:16px;padding:16px 16px 14px 20px;cursor:pointer;overflow:hidden;transition:box-shadow .15s,transform .15s}.soc-mcard:hover{box-shadow:0 8px 22px rgba(60,40,80,.09);transform:translateY(-2px)}.soc-mcard.active{border-color:var(--c)}.soc-mbar{position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--c)}.soc-mnum{font-family:var(--font-display);font-weight:900;font-size:30px;line-height:1;color:var(--ink)}.soc-mlab{font-family:var(--font-body);font-weight:700;font-size:13px;color:var(--ink-3);margin-top:5px}@media(max-width:680px){.soc-matrix{grid-template-columns:1fr}}'
  +'.soc-fbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}.soc-fchip{font-family:var(--font-display);font-weight:700;font-size:12.5px;color:var(--ink-3);background:var(--paper-2,#FAF7F2);border:1px solid var(--line);padding:7px 13px;border-radius:999px;cursor:pointer;transition:all .15s}.soc-fchip:hover{border-color:var(--s27-yellow,#F2C14E)}.soc-fchip.active{background:var(--ink,#230F23);border-color:var(--ink);color:#fff}'
  +'.soc-nav{display:flex;gap:6px}.soc-nav button{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--paper,#fff);color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}.soc-nav button:first-child svg{transform:rotate(180deg)}.soc-nav button:hover{border-color:var(--s27-yellow,#F2C14E);color:var(--ink)}'
  +'.soc-cal{background:var(--paper,#fff);border:1px solid var(--line);border-radius:18px;padding:12px}.soc-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px}.soc-dow span{font-family:var(--font-display);font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);text-align:center;padding:4px 0}.soc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.soc-cell{min-height:92px;background:var(--paper-2,#FAF7F2);border:1px solid var(--paper-3,#F1EBE2);border-radius:11px;padding:6px;display:flex;flex-direction:column;gap:4px}.soc-cell.soc-empty{background:transparent;border:none}.soc-cell.soc-today{border-color:var(--s27-yellow,#F2C14E);box-shadow:inset 0 0 0 1px var(--s27-yellow,#F2C14E)}.soc-daynum{font-family:var(--font-display);font-weight:800;font-size:12px;color:var(--ink-4)}.soc-chip{display:flex;align-items:center;gap:5px;width:100%;text-align:left;font-family:var(--font-body);font-weight:700;font-size:11px;color:var(--ink-2);background:#fff;border:1px solid var(--line);border-left:3px solid var(--cc,#667684);border-radius:7px;padding:3px 6px;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;transition:box-shadow .12s}.soc-chip:hover{box-shadow:0 3px 9px rgba(60,40,80,.12)}.soc-cdot{width:7px;height:7px;border-radius:99px;flex:none}@media(max-width:680px){.soc-cell{min-height:64px}.soc-chip{font-size:10px}}'
  +'.soc-nodate{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:12px}.soc-nodate-lab{font-family:var(--font-display);font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-right:3px}.soc-nodate .soc-chip{width:auto;max-width:360px}'
  +'.soc-detail{max-width:760px}.soc-back{display:inline-flex;align-items:center;gap:7px;font-family:var(--font-display);font-weight:700;font-size:13.5px;color:var(--ink-3);background:none;border:none;cursor:pointer;padding:6px 0;margin-bottom:8px}.soc-back svg{transform:rotate(180deg)}.soc-back:hover{color:var(--ink)}.soc-dcard{background:var(--paper,#fff);border:1px solid var(--line);border-radius:18px;overflow:hidden;display:flex;align-items:stretch}.soc-dmedia{flex:0 0 300px;max-width:300px;background:var(--paper-3);display:flex;align-items:center;justify-content:center;padding:16px}.soc-dmedia .soc-dimg{width:100%;max-height:360px;border-radius:13px}.soc-dimg{width:100%;object-fit:cover;display:block;background:var(--paper-3)}.soc-dbody{flex:1;min-width:0;padding:20px 22px 22px}@media(max-width:620px){.soc-dcard{flex-direction:column}.soc-dmedia{flex:none;max-width:none;width:100%}}.soc-dmeta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}.soc-dtxt{white-space:pre-wrap;font-family:var(--font-body);font-size:15px;line-height:1.6;color:var(--ink-2)}.soc-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:700;font-size:12.5px;border-radius:999px;padding:4px 12px}.soc-net{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px}.soc-dact{margin-top:20px;padding-top:18px;border-top:1px dashed var(--paper-3,#F1EBE2)}.soc-fbok{display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--s27-green-ink,#147A50);background:var(--s27-green-soft,rgba(18,172,78,.10));border-radius:12px;padding:13px 15px}.soc-fbta{width:100%;box-sizing:border-box;font-family:var(--font-body);font-size:14px;padding:11px 13px;border:1px solid var(--line);border-radius:11px;outline:none;resize:vertical;margin-top:6px}.soc-fbta:focus{border-color:var(--s27-yellow,#F2C14E)}'
  ); document.head.appendChild(__s); return ''; }
function socialNetChips(p){ return (p.netwerken||[]).map(function(nw){ var n=mcNet(nw.netwerk),st=mcStatus(nw.status); return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:'+n[1]+';background:'+n[1]+'14;border-radius:999px;padding:2px 9px">'+esc(n[0])+'<span style="width:6px;height:6px;border-radius:99px;background:'+st[1]+'"></span></span>'; }).join(' '); }
// een post is "goed te keuren" zolang die nog niet gepubliceerd/mislukt is (concept of gepland)
function mcApprovable(p){
  if(p.draft) return false;   // concepten zijn nog niet af, dus ook nog niet goed te keuren
  var ss=(p.netwerken||[]).map(function(n){return String(n.status||'').toUpperCase();});
  if(ss.some(function(s){return s.indexOf('PUBLISH')>=0;})) return false;   // al live
  return true;
}
// goedkeur-/feedbackblok per post (klant keurt geplande content goed of geeft notitie)
function socialApproveBlock(p){
  if(p.draft) return '';   // concepten: geen goedkeur-/feedbackblok (bug 86ca83gp0)
  if(state._mcApproved && state._mcApproved[p.id]) p.approved=true;   // lokaal onthouden over rerenders
  if(p.approved){
    return '<div class="mc-approved" id="mca-'+esc(p.id)+'">'+ic('check',16)+'<span>Goedgekeurd, bedankt! We plannen deze post zo verder in.</span></div>';
  }
  if(!mcApprovable(p)) return '';   // gepubliceerde posts: niets goed te keuren
  return '<div class="mc-actions" id="mca-'+esc(p.id)+'" onclick="event.stopPropagation()">'
    +'<div class="mc-actrow">'
      +'<button class="btn btn-branch br-green btn-sm" onclick="metricoolApprove(\''+esc(p.id)+'\',this)">'+ic('check',15)+' Goedkeuren</button>'
      +'<button class="btn btn-outline btn-sm" onclick="toggleSocialFeedback(\''+esc(p.id)+'\')">'+ic('msg',15)+' Feedback</button>'
    +'</div>'
    +'<div class="mc-fb" id="mcfb-'+esc(p.id)+'" style="display:none">'
      +'<textarea id="mcfbtx-'+esc(p.id)+'" rows="3" placeholder="Je opmerking of aanpassing bij deze post…"></textarea>'
      +'<div class="mc-fbact"><button class="btn btn-primary btn-sm" onclick="metricoolFeedback(\''+esc(p.id)+'\',this)">'+ic('send',14)+' Versturen</button><button class="btn btn-ghost btn-sm" onclick="toggleSocialFeedback(\''+esc(p.id)+'\')">Annuleer</button></div>'
    +'</div>'
  +'</div>';
}
function socialPostRow(p){
  var st=mcOverall(p), dt=p.dt;
  var dd = dt? dt.toLocaleDateString('nl-BE',{weekday:'short',day:'numeric',month:'short'}) : (p.datum||'-');
  var tt = dt? dt.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}) : '';
  var first=((p.tekst||'').split('\n')[0]||'').slice(0,100);
  var thumb = p.media? '<img src="'+esc(p.media)+'" alt="" style="width:54px;height:54px;border-radius:10px;object-fit:cover;flex:0 0 auto" loading="lazy">' : '<div style="width:54px;height:54px;border-radius:10px;background:var(--paper-3);flex:0 0 auto"></div>';
  return '<div class="card mc-post" id="mcp-'+esc(p.id)+'" onclick="toggleSocialPost(\''+esc(p.id)+'\')" style="padding:13px 15px;margin-bottom:9px;display:block">'
   +'<div style="display:flex;gap:13px;align-items:center">'+thumb
     +'<div style="flex:1;min-width:0">'
       +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px"><span style="font-weight:800;font-size:12.5px;color:var(--ink-3)">'+esc(dd)+(tt?' · '+tt:'')+'</span><span style="font-size:11px;font-weight:700;color:'+st[1]+';background:'+st[2]+';border-radius:999px;padding:1px 9px">'+st[0]+'</span>'+((p.approved||(state._mcApproved&&state._mcApproved[p.id]))?'<span style="font-size:11px;font-weight:700;color:#15803d;background:#dcfce7;border-radius:999px;padding:1px 9px">'+ic('check',12)+' Goedgekeurd</span>':'')+'</div>'
       +'<div style="font-size:14px;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(first||'(geen tekst)')+'</div>'
       +'<div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap">'+socialNetChips(p)+'</div>'
     +'</div><span style="color:var(--ink-4);flex:0 0 auto">'+ic('arrow',16)+'</span></div>'
   +'<div class="mc-body">'
     +(p.media?'<img src="'+esc(p.media)+'" alt="" style="max-width:260px;width:100%;border-radius:12px;margin-bottom:12px" loading="lazy">':'')
     +'<div class="mc-txt">'+esc(p.tekst||'')+'</div>'
     +'<div style="margin-top:12px;display:flex;gap:7px;flex-wrap:wrap">'+(p.netwerken||[]).map(function(nw){ var n=mcNet(nw.netwerk),s=mcStatus(nw.status); return '<span style="font-size:11.5px;font-weight:700;color:'+n[1]+';background:'+n[1]+'12;border-radius:999px;padding:3px 10px">'+esc(n[0])+' · <span style="color:'+s[1]+'">'+s[0]+'</span>'+(nw.url?' · <a href="'+esc(nw.url)+'" target="_blank" rel="noopener" style="color:'+n[1]+'" onclick="event.stopPropagation()">bekijk</a>':'')+'</span>'; }).join('')+'</div>'
     +socialApproveBlock(p)
   +'</div></div>';
}
function toggleSocialPost(id){ var el=$id('mcp-'+id); if(el) el.classList.toggle('open'); }
function toggleSocialFeedback(id){ var b=$id('mcfb-'+id); if(b){ var open=b.style.display!=='none'; b.style.display=open?'none':'block'; if(!open){ var t=$id('mcfbtx-'+id); if(t&&t.focus) t.focus(); } } }
/* ---- Social-status voor de klant: gepubliceerd / goedgekeurd / wacht op je feedback ---- */
function socialStatus(p){
  var ss=(p.netwerken||[]).map(function(n){return String(n.status||'').toUpperCase();});
  if(ss.length && ss.some(function(s){return s.indexOf('PUBLISH')>=0;})) return 'gepubliceerd';
  if(p.draft) return 'concept';   // Metricool-draft: nog in voorbereiding, read-only (bug 86ca83gp0)
  if(p.approved || (state._mcApproved && state._mcApproved[p.id])) return 'goedgekeurd';
  return 'feedback';
}
var SOC_STATUS={concept:['In voorbereiding','#92740B','rgba(248,192,40,.18)','yellow'],feedback:['Wacht op je feedback','#C44514','rgba(246,97,49,.13)','orange'],goedgekeurd:['Goedgekeurd','#147A50','rgba(18,172,78,.13)','green'],gepubliceerd:['Gepubliceerd','#1F5FA8','rgba(48,131,220,.13)','blue']};
function socialStatusMeta(st){ return SOC_STATUS[st]||SOC_STATUS.feedback; }
function socialPostsAll(){ if(state.demoMode) return socialDemoPosts(); var mc=(window.S27DATA&&S27DATA.metricool())||null; return (mc&&mc.posts)||[]; }
function socialMonth(){ if(!state._socialMonth){ var n=new Date(); state._socialMonth={y:n.getFullYear(),m:n.getMonth()}; } return state._socialMonth; }
function socialFilter(){ return state._socialFilter||'alles'; }
// Maand-/filter-navigatie verspringt NIET meer: enkel de deelcontainer wordt ververst (geen
// full-panel renderPanel + scroll-to-top). Maand-nav raakt enkel de grid, filter de hele body.
function socialShownPosts(){ var posts=socialPostsAll(); var f=socialFilter(); return f==='alles'?posts:posts.filter(function(p){return socialStatus(p)===f;}); }
/* ===== Sub-navigatie binnen Socials: Analyse / Planner / Inzichten ===== */
// Team-medewerker (adminMode) ziet de UITGEBREIDE rapportage, TENZIJ hij bewust de klantweergave
// nabootst (_adminClientView). adminMode blijft de identiteit/acting-as; isRichView() bepaalt enkel
// welke WEERGAVE getoond wordt. Een gewone klant is nooit adminMode → altijd de simpele weergave.
function isRichView(){ return !!(state.adminMode && !state._adminClientView); }
function socialTab(){ return state._socTab||(isRichView()?'rapport':'planner'); }
function socialInzTab(){ return state._socInzTab||'momenten'; }
function socialSubnav(){
  var active=state._socialDetail?'planner':socialTab();
  var tabs=isRichView()
    ? [['rapport','Samenvatting','st_progress'],['planner','Planner','cal'],['aanbevelingen','Aanbevelingen','st_approved']]
    : [['analyse','Analyse','st_progress'],['planner','Planner','cal'],['inzichten','Inzichten','st_approved']];
  var nav='<div class="soc-subnav" id="socialSubnav">'+tabs.map(function(t){
    return '<button class="soc-subtab'+(active===t[0]?' active':'')+'" data-stab="'+t[0]+'" onclick="socialSetTab(\''+t[0]+'\')">'+ic(t[2],17)+'<span>'+esc(t[1])+'</span></button>';
  }).join('')+'</div>';
  // In de post-editor staan de actieknoppen nu RECHTSONDER in het formulier (#socEditActsForm), niet meer op de sub-nav-balk.
  return nav;
}
function socialSetTab(name){
  state._socTab=name; state._socialDetail=null;
  var box=document.getElementById('socialBody');
  if(box){ box.innerHTML=socialBodyHTML();
    var nav=document.getElementById('socialSubnav'); if(nav){ [].slice.call(nav.children).forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-stab')===name); }); }
    if(isRichView() && name==='rapport' && typeof socialRichMountCharts==='function') socialRichMountCharts();
    if(window.scrollTo) window.scrollTo({top:0,behavior:'smooth'});
  } else { renderPanel('socials'); }
  if(typeof syncUrl==='function') syncUrl();
}
function socialSetInzTab(name){
  state._socInzTab=name;
  var box=document.getElementById('socialInzBody');
  if(box){ box.innerHTML=socialInzBody();
    var nav=document.getElementById('socialInzNav'); if(nav){ [].slice.call(nav.children).forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-itab')===name); }); }
  } else { var b2=document.getElementById('socialBody'); if(b2){ b2.innerHTML=socialBodyHTML(); } }
  if(typeof syncUrl==='function') syncUrl();
}
// dispatcher: het actieve sub-tabblad (of de post-editor) binnen #socialBody.
function socialBodyHTML(){
  if(state._socialDetail) return socialDetailPage(state._socialDetail);
  var t=socialTab();
  if(isRichView() && t==='rapport') return socialRichReport();          // team-weergave: samenvatting
  if(isRichView() && t==='aanbevelingen') return socialRichAanbevelingen();   // team-weergave: aanbevelingen
  if(t==='analyse') return socialAnalyseHTML();
  if(t==='inzichten') return socialInzichtenHTML();
  return socialPlannerHTML();
}
function socialAnalyseHTML(){ return socialPeriodBar()+'<div id="socialStats">'+socialStatsHTML()+'</div>'; }
function _socIsoLocal(d){ var p=function(n){return (n<10?'0':'')+n;}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); }
function socialPeriodWindow(preset){
  var now=new Date(), from;
  if(preset==='today') from=new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0);
  else if(preset==='7d') from=new Date(now.getTime()-7*86400000);
  else if(preset==='30d') from=new Date(now.getTime()-30*86400000);
  else if(preset==='90d') from=new Date(now.getTime()-90*86400000);
  else if(preset==='year') from=new Date(now.getFullYear(),0,1,0,0,0);
  else return null;
  return { from:_socIsoLocal(from), to:_socIsoLocal(now) };
}
function socialPeriod(){ if(!state._socPeriod){ var w=socialPeriodWindow('90d'); state._socPeriod={preset:'90d',compare:'none',from:w.from,to:w.to}; } return state._socPeriod; }
function socialPeriodBar(){
  var pp=socialPeriod();
  var presets=[['today','Vandaag'],['7d','7 dagen'],['30d','30 dagen'],['90d','90 dagen'],['year','Dit jaar'],['custom','Aangepast']];
  var comps=[['none','Geen vergelijking'],['previous','Vorige periode'],['month','Vorige maand'],['year','Vorig jaar']];
  var chips=presets.map(function(o){ return '<button class="soc-perchip'+(pp.preset===o[0]?' active':'')+'" onclick="socialSetPeriod(\''+o[0]+'\')">'+esc(o[1])+'</button>'; }).join('');
  var custom = pp.preset==='custom' ? '<div class="soc-percustom"><input type="date" id="socFrom" value="'+esc((pp.from||'').slice(0,10))+'" onchange="socialCustomPeriod()"><span>tot</span><input type="date" id="socTo" value="'+esc((pp.to||'').slice(0,10))+'" onchange="socialCustomPeriod()"></div>' : '';
  var comp='<div class="soc-percompare">'+'<select onchange="socialSetCompare(this.value)" aria-label="Vergelijken met">'+comps.map(function(o){return '<option value="'+o[0]+'"'+(pp.compare===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select></div>';
  return '<div class="soc-period"><div class="soc-perchips">'+chips+'</div>'+custom+comp+'</div>';
}
function socialReloadStats(){
  var box=document.getElementById('socialStats'); if(box) box.innerHTML='<div class="soc-kpi-skel">Cijfers laden…</div>';
  var pp=socialPeriod();
  if(isRichView()){
    var _aanbev=(socialTab()==='aanbevelingen');
    if(state.demoMode || !(window.S27DATA&&S27DATA.loadMetricoolStatsRich)){ if(box) box.innerHTML=(_aanbev?socialRichAanbevInner():socialRichInner()); return; }
    S27DATA.loadMetricoolStatsRich({from:pp.from,to:pp.to,compare:pp.compare}).then(function(){ var b=document.getElementById('socialStats'); if(b){ if(_aanbev){ b.innerHTML=socialRichAanbevInner(); } else { b.innerHTML=socialRichInner(); socialRichMountCharts(); } } }).catch(function(){ var b=document.getElementById('socialStats'); if(b) b.innerHTML=(_aanbev?socialRichAanbevInner():socialRichInner()); });
    return;
  }
  if(state.demoMode || !(window.S27DATA&&S27DATA.loadMetricoolStats)){ if(box) box.innerHTML=socialStatsHTML(); return; }
  S27DATA.loadMetricoolStats({from:pp.from,to:pp.to,compare:pp.compare}).then(function(){ var b=document.getElementById('socialStats'); if(b) b.innerHTML=socialStatsHTML(); }).catch(function(){ var b=document.getElementById('socialStats'); if(b) b.innerHTML=socialStatsHTML(); });
}
function _socRerenderPeriodBar(){ var bar=document.querySelector('#socialBody .soc-period'); if(bar) bar.outerHTML=socialPeriodBar(); }
function socialSetPeriod(preset){
  var pp=socialPeriod(); pp.preset=preset;
  if(preset!=='custom'){ var w=socialPeriodWindow(preset); if(w){ pp.from=w.from; pp.to=w.to; } }
  _socRerenderPeriodBar();
  if(preset!=='custom') socialReloadStats();
  if(typeof syncUrl==='function') syncUrl();
}
function socialCustomPeriod(){
  var f=document.getElementById('socFrom'), t=document.getElementById('socTo'); if(!f||!t||!f.value||!t.value) return;
  var pp=socialPeriod(); pp.from=f.value+'T00:00:00'; pp.to=t.value+'T23:59:59'; socialReloadStats();
  if(typeof syncUrl==='function') syncUrl();
}
function socialSetCompare(mode){ var pp=socialPeriod(); pp.compare=mode; socialReloadStats(); if(typeof syncUrl==='function') syncUrl(); }
function socialPlannerHTML(){
  var nieuw=socialsEditable()?'<div class="soc-newpost-row"><button class="btn btn-branch br-yellow btn-sm" onclick="openSocialCreate()">'+ic('plus',15)+' Nieuwe post</button></div>':'';
  return nieuw+socialFilters()+'<div id="socialCalContainer">'+socialCalendar(socialShownPosts())+'</div>';
}
function socialInzichtenHTML(){
  var it=socialInzTab();
  var tabs=[['momenten','Beste momenten'],['topscore','Topscore'],['hashtags','Hashtags']];
  var nav='<div class="soc-inznav" id="socialInzNav">'+tabs.map(function(t){ return '<button class="soc-inztab'+(it===t[0]?' active':'')+'" data-itab="'+t[0]+'" onclick="socialSetInzTab(\''+t[0]+'\')">'+esc(t[1])+'</button>'; }).join('')+'</div>';
  return nav+'<div id="socialInzBody">'+socialInzBody()+'</div>';
}
function socialInzBody(){
  var it=socialInzTab();
  if(it==='topscore') return '<div id="socialPosts">'+socialPostStatsHTML()+'</div>'+socialFormatsHTML();
  if(it==='hashtags') return socialHashtagsHTML();
  return socialMomentenHTML();
}
function socialInsightsData(){
  if(state.demoMode) return socialInsightsDemo();
  // ADMIN: de inzichten (momenten/formats/hashtags/posts) komen uit de gebundelde rijke rapportage.
  if(isRichView()){ var r=(window.S27DATA&&S27DATA.metricoolStatsRich)?S27DATA.metricoolStatsRich():null; if(r&&r.linked) return { linked:true, posts:r.posts||[], summary:r.postSummary||null, networks:r.postNetworks||[], formats:r.formats||[], hashtags:r.hashtags||[], bestTimes:r.bestTimes||[] }; if(r&&!r.linked) return { linked:false }; return null; }
  return (window.S27DATA&&S27DATA.metricoolPostStats)?S27DATA.metricoolPostStats():null;
}

/* =============================================================================
   ADMIN, uitgebreide social-rapportage (team-weergave). Enkel in state.adminMode.
   Data via metricoolStatsRich (is_staff-gated): account-KPI's + per-netwerk breakdown
   met dag-series + vergelijking + post-insights (top-posts, beste momenten, formats,
   hashtags). Hergebruikt de bestaande inzicht-renderers via socialInsightsData().
   ============================================================================= */
function socialRichReport(){ return socialPeriodBar()+'<div id="socialStats">'+socialRichInner()+'</div>'; }
function socialRichAanbevelingen(){ return socialPeriodBar()+'<div id="socialStats">'+socialRichAanbevInner()+'</div>'; }
// Data-gedreven social-aanbevelingen uit de eigen posthistoriek/KPI's.
function socialRichAanbevList(s){
  var recs=[];
  var bt=(s.bestTimes||[])[0]; if(bt) recs.push(['blue','Beste moment om te posten','Op '+String(bt.day||'').toLowerCase()+' ('+String(bt.part||'').toLowerCase()+') haal je gemiddeld '+(Number(bt.avgEngagementRate)||0)+'% engagement. Plan hier meer content.']);
  var fm=(s.formats||[])[0]; if(fm) recs.push(['green','Sterkste format','“'+fm.format+'” presteert het best ('+(Number(fm.avgEngagementRate)||0)+'% engagement, '+socialFmt(fm.avgReach)+' gem. bereik). Zet hier meer op in.']);
  var ht=(s.hashtags||[])[0]; if(ht) recs.push(['blue','Topscorende hashtag','Posts met '+ht.tag+' halen gemiddeld '+(Number(ht.avgEngagementRate)||0)+'% engagement. Gebruik deze vaker waar relevant.']);
  var nets=(s.networks||[]).filter(function(n){return n.reach;}); if(nets.length){ var topN=nets.slice().sort(function(a,b){return (b.engagementRate||0)-(a.engagementRate||0);})[0]; if(topN&&topN.engagementRate) recs.push(['blue','Sterkste netwerk',(topN.label||topN.network)+' heeft de hoogste engagement ('+(Number(topN.engagementRate)||0)+'%). Overweeg hier extra in te investeren.']); }
  var posts=(s.postSummary&&s.postSummary.posts)||0, days=(s.period&&s.period.days)||0;
  if(posts && days){ var perWeek=Math.round((posts/days)*7*10)/10; if(perWeek<3) recs.push(['orange','Postfrequentie','Je plaatste '+posts+' posts ('+perWeek+'/week). Meer consistentie (richtlijn 3-5/week) vergroot doorgaans je bereik.']); }
  if(s.prevTotals){ var cur=Number((s.totals||{}).engagementRate)||0, prev=Number(s.prevTotals.engagementRate)||0; if(prev){ var d=Math.round((cur-prev)/prev*1000)/10; if(d<=-10) recs.push(['orange','Dalende engagement','Je engagement daalde '+Math.abs(d)+'% t.o.v. '+(s.compareLabel||'de vorige periode')+'. Test nieuwe formats of posttijden.']); else if(d>=10) recs.push(['green','Stijgende engagement','Je engagement steeg '+d+'% t.o.v. '+(s.compareLabel||'de vorige periode')+'. Wat je doet werkt, houd deze lijn aan.']); } }
  if(!recs.length) recs.push(['green','Nog te weinig data','Er zijn nog te weinig posts in deze periode om concrete aanbevelingen te doen.']);
  return recs;
}
function socialRichAanbevInner(){
  var s=(window.S27DATA&&S27DATA.metricoolStatsRich)?S27DATA.metricoolStatsRich():null;
  if(s===undefined||s===null) return '<div class="soc-kpi-skel">De aanbevelingen worden opgehaald…</div>';
  if(!s.linked) return '<div class="card" style="padding:26px;text-align:center;color:var(--ink-3)">Nog geen Metricool-koppeling voor deze klant.</div>';
  var recs=socialRichAanbevList(s);
  var recHTML='<div class="ar-recs" style="margin-top:6px">'+recs.map(function(r){ return '<div class="ar-rec ar-rec-'+r[0]+'"><div class="ar-rec-t">'+esc(r[1])+'</div><div class="ar-rec-b">'+esc(r[2])+'</div></div>'; }).join('')+'</div>';
  return '<div class="section-head"><h2>Aanbevelingen</h2><span class="count">'+recs.length+'</span></div>'+recHTML
    +'<div class="section-head" style="margin-top:22px"><h2>Wat werkt het best</h2></div>'+socialMomentenHTML()+socialFormatsHTML()+socialHashtagsHTML();
}
function socialRichInner(){
  var s=(window.S27DATA&&S27DATA.metricoolStatsRich)?S27DATA.metricoolStatsRich():null;
  if(s===undefined||s===null) return '<div class="soc-kpi-skel">De uitgebreide rapportage wordt opgehaald…</div>';
  if(!s.linked) return '<div class="card" style="padding:26px;text-align:center;color:var(--ink-3)">Nog geen Metricool-koppeling voor deze klant. Koppel de brand (veld “Metricool ID” op de bedrijf-taak).</div>';
  return socialRichKpis(s)+socialRichCharts(s)+socialRichNetCards(s)+socialRichPostsBlock(s);
}
function socialRichKpis(s){
  var t=s.totals||{}, p=s.prevTotals||null, cl=s.compareLabel||'';
  function card(lab,val,key){ var d=p?arCmp(t[key],p[key],false):''; return '<div class="arkpi"><div class="arkpi-l">'+lab+'</div><div class="arkpi-v">'+val+'</div>'+(d?'<div class="arkpi-d">'+d+'</div>':'')+'</div>'; }
  var cards=[card('Volgers',socialFmt(t.followers),'followers'),card('Bereik',socialFmt(t.reach),'reach'),card('Interacties',socialFmt(t.interactions),'interactions'),card('Engagement',(Number(t.engagementRate)||0)+'%','engagementRate')].join('');
  var note=(p&&cl)?'<div class="arkpi-note">Vergeleken met '+esc(cl)+'</div>':'';
  var g=Number(t.growth)||0; var gchip=g?'<div class="sr-growth '+(g>0?'up':'down')+'">'+(g>0?'▲ +':'▼ ')+socialFmt(Math.abs(g))+' volgers in deze periode</div>':'';
  return '<div class="ar-summary"><div class="ar-kpigrid">'+cards+'</div>'+note+gchip+'</div>';
}
function _srHasOverview(s){ var d={}; (s.networks||[]).forEach(function(n){ ((n.series&&n.series.reach)||[]).forEach(function(x){d[x.date]=1;}); ((n.series&&n.series.interactions)||[]).forEach(function(x){d[x.date]=1;}); }); return Object.keys(d).length>=2; }
function _srHasFollowers(s){ return (s.networks||[]).some(function(n){ return n.series&&n.series.followers&&n.series.followers.length>1; }); }
function socialRichCharts(s){
  var ov=_srHasOverview(s), fo=_srHasFollowers(s);
  return '<div class="sr-charts">'
    +'<div class="sr-chartcard"><div class="sr-chtitle">Bereik &amp; interacties per dag</div>'+(ov?'<div class="ar-chartwrap"><canvas id="srOverviewChart"></canvas></div>':'<div class="sr-chempty">Nog te weinig dagen met data om een grafiek te tonen in deze periode.</div>')+'</div>'
    +'<div class="sr-chartcard"><div class="sr-chtitle">Volgersgroei per netwerk</div>'+(fo?'<div class="ar-chartwrap"><canvas id="srFollowersChart"></canvas></div>':'<div class="sr-chempty">Nog te weinig datapunten voor een volgersgrafiek in deze periode.</div>')+'</div>'
    +'</div>';
}
function socialRichNetCards(s){
  var nets=(s.networks||[]).filter(function(n){return n.followers||n.reach||n.interactions;});
  if(!nets.length) return '';
  var cards=nets.map(function(n){
    var col=(mcNet(n.network)||[])[1]||'var(--s27-blue,#3083DC)'; var p=n.prev||null;
    function row(lab,val,key){ var d=p?arCmp(n[key],p[key],false):''; return '<div class="sr-nrow"><i>'+lab+'</i><b>'+val+'</b>'+(d?' '+d:'')+'</div>'; }
    return '<div class="sr-netcard"><div class="sr-nethead"><span class="sr-netdot" style="background:'+col+'"></span><span class="sr-netnm">'+esc(n.label||n.network)+'</span>'+(n.growth?'<span class="sr-netg '+(n.growth>0?'up':'down')+'">'+(n.growth>0?'+':'')+socialFmt(n.growth)+'</span>':'')+'</div>'
      +row('Volgers',socialFmt(n.followers),'followers')+row('Bereik',socialFmt(n.reach),'reach')+row('Interacties',socialFmt(n.interactions),'interactions')+row('Engagement',(Number(n.engagementRate)||0)+'%','engagementRate')+'</div>';
  }).join('');
  return '<div class="section-head" style="margin-top:20px"><h2>Per netwerk</h2><span class="count">'+nets.length+'</span></div><div class="sr-netgrid">'+cards+'</div>';
}
/* top-posts (sorteerbaar) */
var SR_POST_SORT={key:'reach',dir:-1};
function socialPostTypeLabel(p){ var t=String(p&&p.type||'').toUpperCase(); var net=String(p&&p.network||'').toLowerCase(); if(net==='youtube'||net==='tiktok')return 'Reel/video'; if(/REEL/.test(t))return 'Reel/video'; if(/VIDEO/.test(t))return 'Video'; if(/CAROUSEL|ALBUM/.test(t))return 'Carrousel'; if(/IMAGE|PHOTO/.test(t))return 'Foto'; if(/STATUS|TEXT|SHARE|LINK/.test(t))return 'Tekst'; return (p&&p.type)?_titleCase(p.type):'Post'; }
function _srShort(ymd){ var m=String(ymd||'').match(/(\d{4})-(\d{2})-(\d{2})/); return m?(m[3]+'/'+m[2]):(ymd||''); }
function _srDate(iso){ var m=String(iso||'').match(/(\d{4})-(\d{2})-(\d{2})/); return m?(m[3]+'/'+m[2]+'/'+m[1].slice(2)):''; }
function socialRichPostsBlock(s){
  var posts=(s.posts||[]); if(!posts.length) return '';
  return '<div class="section-head" style="margin-top:20px"><h2>Best presterende posts</h2><span class="count">'+posts.length+'</span></div><div id="srPosts">'+socialRichPostsTable(posts)+'</div>';
}
function socialRichPostsTable(posts){
  var s=SR_POST_SORT;
  var rows=posts.slice().sort(function(a,b){ var k=s.key,c; if(k==='network'){c=String(a.label||'').localeCompare(String(b.label||''),'nl');} else if(k==='format'){c=socialPostTypeLabel(a).localeCompare(socialPostTypeLabel(b),'nl');} else if(k==='date'){c=(Date.parse(a.date)||0)-(Date.parse(b.date)||0);} else {c=(Number(a[k])||0)-(Number(b[k])||0);} return c*s.dir; });
  var cols=[['network','Netwerk',0],['date','Datum',0],['format','Type',0],['reach','Bereik',1],['interactions','Interacties',1],['engagementRate','Engagement',1]];
  var tpl=cols.map(function(c,i){return i===0?'minmax(120px,1.4fr)':(c[2]?'minmax(82px,1fr)':'minmax(76px,.9fr)');}).join(' ');
  var head=cols.map(function(c){ var on=s.key===c[0]; var arr=on?(s.dir<0?' ▼':' ▲'):''; return '<button class="ar-th'+(c[2]?' num':'')+(on?' on':'')+'" onclick="socialRichSortPosts(\''+c[0]+'\')">'+esc(c[1])+arr+'</button>'; }).join('');
  var body=rows.map(function(p){
    var lnk=p.url?('<a href="'+esc(p.url)+'" target="_blank" rel="noopener" class="sr-plink">'+esc(_srTrim(p.text||p.label||p.network))+'</a>'):esc(_srTrim(p.text||p.label||p.network));
    return '<div class="ar-trow" style="grid-template-columns:'+tpl+'">'
      +'<span class="ar-td"><span class="sr-pnet" style="background:'+((mcNet(p.network)||[])[1]||'#888')+'"></span><span class="ar-nm">'+lnk+'</span></span>'
      +'<span class="ar-td">'+esc(_srDate(p.date))+'</span>'
      +'<span class="ar-td">'+esc(socialPostTypeLabel(p))+'</span>'
      +'<span class="ar-td num">'+socialFmt(p.reach)+'</span>'
      +'<span class="ar-td num">'+socialFmt(p.interactions)+'</span>'
      +'<span class="ar-td num">'+(Number(p.engagementRate)||0)+'%</span></div>';
  }).join('');
  return '<div class="ar-table"><div class="ar-tscroll"><div class="ar-thead" style="grid-template-columns:'+tpl+'">'+head+'</div>'+body+'</div></div>';
}
function _srTrim(t){ t=String(t||'').replace(/\s+/g,' ').trim(); return t.length>54?t.slice(0,54)+'…':(t||'Post'); }
function socialRichSortPosts(key){ var s=SR_POST_SORT; if(s.key===key){s.dir=-s.dir;}else{s.key=key;s.dir=(key==='network'||key==='format')?1:-1;} var host=document.getElementById('srPosts'); var d=(window.S27DATA&&S27DATA.metricoolStatsRich)?S27DATA.metricoolStatsRich():null; if(host&&d) host.innerHTML=socialRichPostsTable(d.posts||[]); }
/* Chart.js, overzicht (bereik+interacties) + volgersgroei per netwerk */
function _srChartOpts(single){
  var x={ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',maxRotation:0,autoSkip:true,maxTicksLimit:12},grid:{display:false}};
  var sc = single
    ? { y:{beginAtZero:false,ticks:{font:{family:'Montserrat',size:10},color:'#9E919E'},grid:{color:'rgba(231,223,211,.55)'}}, x:x }
    : { y:{position:'left',beginAtZero:true,ticks:{font:{family:'Montserrat',size:10},color:'#9E919E'},grid:{color:'rgba(231,223,211,.55)'}}, y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false},ticks:{font:{family:'Montserrat',size:10},color:'#9E919E'}}, x:x };
  return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{font:{family:'Montserrat',size:11,weight:'600'},color:'#6B5B6B',boxWidth:12,padding:14,usePointStyle:true}}},scales:sc};
}
function socialRichMountCharts(){
  if(!isRichView()) return;
  var s=(window.S27DATA&&S27DATA.metricoolStatsRich)?S27DATA.metricoolStatsRich():null; if(!s||!s.linked) return;
  adsRichLoadChart().then(function(ok){ if(!ok||!window.Chart) return; socialRichBuildOverview(s); socialRichBuildFollowers(s); });
}
function socialRichBuildOverview(s){
  var cv=document.getElementById('srOverviewChart'); if(!cv||!window.Chart) return;
  state._arCharts=state._arCharts||{}; try{ if(state._arCharts.srOverview){ state._arCharts.srOverview.destroy(); delete state._arCharts.srOverview; } }catch(e){}
  var rMap={}, iMap={}, dates={};
  (s.networks||[]).forEach(function(n){ ((n.series&&n.series.reach)||[]).forEach(function(x){ rMap[x.date]=(rMap[x.date]||0)+(Number(x.value)||0); dates[x.date]=1; }); ((n.series&&n.series.interactions)||[]).forEach(function(x){ iMap[x.date]=(iMap[x.date]||0)+(Number(x.value)||0); dates[x.date]=1; }); });
  var labels=Object.keys(dates).sort(); if(labels.length<2) return;
  var reach=labels.map(function(d){return rMap[d]||0;}), inter=labels.map(function(d){return iMap[d]||0;});
  try{ state._arCharts.srOverview=new window.Chart(cv.getContext('2d'),{ data:{labels:labels.map(_srShort),datasets:[
    {type:'bar',label:'Bereik',data:reach,backgroundColor:'rgba(48,131,220,.5)',borderColor:'rgba(48,131,220,.9)',borderWidth:1,borderRadius:4,yAxisID:'y',order:3},
    {type:'line',label:'Interacties',data:inter,borderColor:'#9441DB',backgroundColor:'#9441DB',borderWidth:2,tension:.32,pointRadius:0,yAxisID:'y1',order:1}
  ]}, options:_srChartOpts(false) }); }catch(e){}
}
function socialRichBuildFollowers(s){
  var cv=document.getElementById('srFollowersChart'); if(!cv||!window.Chart) return;
  state._arCharts=state._arCharts||{}; try{ if(state._arCharts.srFollowers){ state._arCharts.srFollowers.destroy(); delete state._arCharts.srFollowers; } }catch(e){}
  var nets=(s.networks||[]).filter(function(n){return n.series&&n.series.followers&&n.series.followers.length>1;});
  if(!nets.length) return;
  var dset={}; nets.forEach(function(n){ n.series.followers.forEach(function(x){dset[x.date]=1;}); });
  var labels=Object.keys(dset).sort();
  var ds=nets.map(function(n){ var col=(mcNet(n.network)||[])[1]||'#3083DC'; var map={}; n.series.followers.forEach(function(x){map[x.date]=Number(x.value)||0;}); return {type:'line',label:n.label||n.network,data:labels.map(function(d){return map[d]!=null?map[d]:null;}),borderColor:col,backgroundColor:col,borderWidth:2,tension:.3,pointRadius:0,spanGaps:true}; });
  try{ state._arCharts.srFollowers=new window.Chart(cv.getContext('2d'),{ data:{labels:labels.map(_srShort),datasets:ds}, options:_srChartOpts(true) }); }catch(e){}
}
function socialMomentenHTML(){
  var s=socialInsightsData(); if(!s){ return '<div class="soc-kpi-skel">Inzichten laden…</div>'; } if(!s.linked) return '<div class="soc-iempty">Nog geen Metricool-koppeling.</div>';
  var bt=s.bestTimes||[]; var maxBt=Math.max.apply(null,bt.map(function(t){return t.avgEngagementRate;}).concat([0]));
  var rows=bt.length?bt.map(function(t){ return '<div class="soc-irow"><div class="soc-ilab"><b>'+esc(t.day)+'</b><span>'+esc(t.part)+' · '+socialFmt(t.count)+' posts · '+socialFmt(t.avgReach)+' bereik</span></div>'+socialInsightsBar(t.avgEngagementRate,maxBt)+'<span class="soc-ival">'+(Number(t.avgEngagementRate)||0)+'%</span></div>'; }).join(''):'<div class="soc-iempty">Nog te weinig posts om een patroon te zien.</div>';
  return '<div class="soc-stats soc-insights"><div class="soc-phead"><h3>Beste momenten</h3><span class="soc-isub">wanneer jouw posts het best presteerden · engagement = interacties / bereik</span></div><div class="soc-icard soc-icard-wide">'+rows+'</div></div>';
}
function socialFormatsHTML(){
  var s=socialInsightsData(); if(!s||!s.linked) return '';
  var fm=s.formats||[]; if(!fm.length) return ''; var maxFm=Math.max.apply(null,fm.map(function(f){return f.avgEngagementRate;}).concat([0]));
  var rows=fm.map(function(f){ return '<div class="soc-irow"><div class="soc-ilab"><b>'+esc(f.format)+'</b><span>'+socialFmt(f.count)+' posts · '+socialFmt(f.avgReach)+' bereik</span></div>'+socialInsightsBar(f.avgEngagementRate,maxFm)+'<span class="soc-ival">'+(Number(f.avgEngagementRate)||0)+'%</span></div>'; }).join('');
  return '<div class="soc-stats soc-insights" style="margin-top:14px"><div class="soc-phead"><h3>Sterkste formats</h3><span class="soc-isub">welk type content het best scoort</span></div><div class="soc-icard soc-icard-wide">'+rows+'</div></div>';
}
function socialHashtagsHTML(){
  var s=socialInsightsData(); if(!s){ return '<div class="soc-kpi-skel">Inzichten laden…</div>'; } if(!s.linked) return '<div class="soc-iempty">Nog geen Metricool-koppeling.</div>';
  var ht=s.hashtags||[];
  var tags=ht.length?('<div class="soc-tags">'+ht.map(function(h){ return '<span class="soc-tag" title="'+socialFmt(h.avgReach)+' gem. bereik · '+socialFmt(h.count)+' posts">'+esc(h.tag)+'<b>'+(Number(h.avgEngagementRate)||0)+'%</b></span>'; }).join('')+'</div>'):'<div class="soc-iempty">Voeg hashtags toe aan je posts om hier inzicht te krijgen.</div>';
  return '<div class="soc-stats soc-insights"><div class="soc-phead"><h3>Topscorende hashtags</h3><span class="soc-isub">welke hashtags jou het meeste engagement opleveren</span></div><div class="soc-icard soc-icard-wide">'+tags+'</div></div>';
}
function socialMonthNav(d){ var mo=socialMonth(); var dt=new Date(mo.y,mo.m+d,1); state._socialMonth={y:dt.getFullYear(),m:dt.getMonth()}; var box=document.getElementById('socialCalContainer'); if(box){ box.innerHTML=socialCalendar(socialShownPosts()); } else { renderPanel('socials'); } if(typeof syncUrl==='function') syncUrl(); }
function socialSetFilter(f){ state._socialFilter=f; var box=document.getElementById('socialBody'); if(box){ box.innerHTML=socialBodyHTML(); } else { renderPanel('socials'); } if(typeof syncUrl==='function') syncUrl(); }
function socialOpenDetail(id){ state._socTab='planner'; state._socialDetail=String(id); renderPanel('socials'); if(window.scrollTo)window.scrollTo({top:0,behavior:'smooth'}); if(typeof syncUrl==='function') syncUrl(true); }
function socialCloseDetail(){ state._socialDetail=null; state._socTab='planner'; renderPanel('socials'); if(typeof socialChatMount==='function') socialChatMount(); }
/* ---- KPI-dashboard + trend (fase 1 metriek-look-and-feel), data via metricoolStats ---- */
function socialFmt(n){ return (Number(n)||0).toLocaleString('nl-BE'); }
function socialStatsHTML(){
  if(state.demoMode) return socialStatsBlock(socialStatsDemo());
  var s=(window.S27DATA&&S27DATA.metricoolStats)?S27DATA.metricoolStats():null;
  if(!s) return '<div class="soc-kpi-skel">Cijfers laden…</div>';
  if(!s.linked) return '';                       // geen Metricool-koppeling -> sectie verbergen
  return socialStatsBlock(s);
}
function socialStatsBlock(s){
  var t=s.totals||{}; var dys=(s.period&&s.period.days)||90; var pv=s.prevTotals||null; var clab=s.compareLabel||'';
  function grow(g){ g=Number(g)||0; var cls=g>0?'up':(g<0?'down':'flat'); return '<span class="soc-kpi-delta '+cls+'">'+(g>0?'+':'')+socialFmt(g)+'</span>'; }
  // delta vs vergelijkingsperiode (procentueel); valt terug op de standaard-subtitel als er geen vergelijking is.
  function cmp(cur,prev,fallback){
    if(pv==null) return '<span class="soc-kpi-sub">'+fallback+'</span>';
    cur=Number(cur)||0; prev=Number(prev)||0;
    var d; if(!prev){ d= cur>0?'<span class="soc-kpi-delta up">nieuw</span>':'<span class="soc-kpi-delta flat">-</span>'; }
    else { var pct=Math.round(((cur-prev)/prev)*1000)/10; var cls=pct>0?'up':(pct<0?'down':'flat'); d='<span class="soc-kpi-delta '+cls+'">'+(pct>0?'+':'')+pct+'%</span>'; }
    return d+' <span class="soc-kpi-sub">vs '+esc(clab)+'</span>';
  }
  var kpis=[
    ['Volgers', socialFmt(t.followers), pv?cmp(t.followers,pv.followers,''):grow(t.growth)],
    ['Bereik', socialFmt(t.reach), cmp(t.reach,pv&&pv.reach,'laatste '+dys+' dagen')],
    ['Engagement', (Number(t.engagementRate)||0)+'%', cmp(t.engagementRate,pv&&pv.engagementRate,'interacties / bereik')],
    ['Interacties', socialFmt(t.interactions), cmp(t.interactions,pv&&pv.interactions,'laatste '+dys+' dagen')]
  ];
  var cards='<div class="soc-kpis">'+kpis.map(function(k){ return '<div class="soc-kpi"><div class="soc-kpi-lab">'+esc(k[0])+'</div><div class="soc-kpi-num">'+k[1]+'</div><div class="soc-kpi-foot">'+k[2]+'</div></div>'; }).join('')+'</div>';
  var chart=socialTrendSVG(s.trend||[], s.trendLabel||'Trend');
  var nets=(s.networks||[]).filter(function(n){ return n.followers||n.reach||n.interactions; });
  var netRow=nets.length?('<div class="soc-knets">'+nets.map(function(n){ var col=((typeof mcNet==='function'&&mcNet(n.network))||[])[1]||'var(--s27-blue,#3083DC)';
    return '<div class="soc-knet"><span class="soc-knet-dot" style="background:'+col+'"></span><b>'+esc(n.label||n.network)+'</b><span class="soc-knet-v">'+socialFmt(n.followers)+' volgers</span>'+(n.growth?('<span class="soc-knet-g '+(n.growth>0?'up':'down')+'">'+(n.growth>0?'+':'')+socialFmt(n.growth)+'</span>'):'')+'</div>';
  }).join('')+'</div>'):'';
  return '<div class="soc-stats">'+cards+chart+netRow+'</div>';
}
function socialTrendSVG(trend, label){
  var pts=(trend||[]).map(function(p){ return Number(p.value)||0; });
  if(pts.length<2) return '';
  var W=600,H=120,pad=6,n=pts.length;
  var min=Math.min.apply(null,pts),max=Math.max.apply(null,pts); if(max===min){ max=min+1; }
  var X=function(i){ return pad+(i*(W-2*pad)/(n-1)); }, Y=function(v){ return H-pad-((v-min)*(H-2*pad)/(max-min)); };
  var line='',area='M'+X(0).toFixed(1)+','+(H-pad);
  pts.forEach(function(v,i){ var px=X(i).toFixed(1),py=Y(v).toFixed(1); line+=(i?'L':'M')+px+','+py+' '; area+='L'+px+','+py+' '; });
  area+='L'+X(n-1).toFixed(1)+','+(H-pad)+'Z';
  var up=pts[n-1]>=pts[0]; var col=up?'var(--s27-green,#12AC4E)':'var(--s27-orange-ink,#C44514)';
  return '<div class="soc-trend"><div class="soc-trend-head"><span>'+esc(label)+'</span><span class="soc-trend-range">'+socialFmt(pts[0])+' → '+socialFmt(pts[n-1])+'</span></div>'
    +'<svg class="soc-trend-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'
    +'<defs><linearGradient id="soc-tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+col+'" stop-opacity="0.18"/><stop offset="100%" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'
    +'<path d="'+area+'" fill="url(#soc-tg)"/>'
    +'<path d="'+line.trim()+'" fill="none" stroke="'+col+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'
    +'</svg></div>';
}
function socialStatsDemo(){
  var tr=[],v=4970; for(var i=0;i<90;i++){ v+=((i*7)%5)-1; tr.push({date:'',value:v}); }
  return { linked:true, period:{days:90}, trendLabel:'Instagram volgers', trend:tr,
    totals:{followers:8940,growth:382,reach:62300,interactions:3620,engagementRate:5.8},
    networks:[{network:'instagram',label:'Instagram',followers:5210,growth:240,reach:41200,interactions:2300},
      {network:'facebook',label:'Facebook',followers:2730,growth:90,reach:21100,interactions:980},
      {network:'linkedin',label:'LinkedIn',followers:1000,growth:52,reach:0,interactions:340}] };
}
/* ---- Postprestaties (fase 2), data via metricoolPostStats ---- */
function socialPostSort(){ return state._socPostSort||'reach'; }
function socialSetPostSort(s){ state._socPostSort=s; var box=document.getElementById('socialPosts'); if(box){ box.innerHTML=socialPostStatsHTML(); } }
function socialPostStatsHTML(){
  if(state.demoMode) return socialPostStatsBlock(socialPostStatsDemo());
  var s=(window.S27DATA&&S27DATA.metricoolPostStats)?S27DATA.metricoolPostStats():null;
  if(!s) return '<div class="soc-kpi-skel">Postprestaties laden…</div>';
  if(!s.linked || !(s.posts&&s.posts.length)) return '';   // geen koppeling/posts -> sectie verbergen
  return socialPostStatsBlock(s);
}
function socialPostDate(iso){ var d=new Date(String(iso||'').replace(' ','T')); if(isNaN(d.getTime()))return ''; return d.toLocaleDateString('nl-BE',{day:'numeric',month:'short',year:'numeric'}); }
function socialPostStatsBlock(s){
  var sum=s.summary||{}; var sort=socialPostSort();
  var posts=(s.posts||[]).slice();
  if(sort==='eng') posts.sort(function(a,b){ return (b.engagementRate-a.engagementRate)||(b.reach-a.reach); });
  else if(sort==='date') posts.sort(function(a,b){ return (Date.parse(b.date)||0)-(Date.parse(a.date)||0); });
  else posts.sort(function(a,b){ return (b.reach-a.reach)||(b.interactions-a.interactions); });
  var kpis=[
    ['Posts', socialFmt(sum.posts), '<span class="soc-kpi-sub">laatste '+((s.period&&s.period.days)||90)+' dagen</span>'],
    ['Gem. bereik', socialFmt(sum.avgReach), '<span class="soc-kpi-sub">per post</span>'],
    ['Gem. interacties', socialFmt(sum.avgInteractions), '<span class="soc-kpi-sub">per post</span>'],
    ['Gem. engagement', (Number(sum.avgEngagementRate)||0)+'%', '<span class="soc-kpi-sub">interacties / bereik</span>']
  ];
  var cards='<div class="soc-kpis">'+kpis.map(function(k){ return '<div class="soc-kpi"><div class="soc-kpi-lab">'+esc(k[0])+'</div><div class="soc-kpi-num">'+k[1]+'</div><div class="soc-kpi-foot">'+k[2]+'</div></div>'; }).join('')+'</div>';
  var sorts=[['reach','Beste bereik'],['eng','Beste engagement'],['date','Recentste']];
  var sortbar='<div class="soc-psort">'+sorts.map(function(o){ return '<button class="soc-pschip'+(sort===o[0]?' active':'')+'" onclick="socialSetPostSort(\''+o[0]+'\')">'+esc(o[1])+'</button>'; }).join('')+'</div>';
  var best=posts[0]&&posts[0].id;
  var rows=posts.map(function(p){
    var col=((typeof mcNet==='function'&&mcNet(p.network))||[])[1]||'var(--s27-blue,#3083DC)';
    var thumb=p.image?'<img src="'+esc(p.image)+'" alt="" loading="lazy">':'<span class="soc-pph">'+esc((p.label||'?').charAt(0))+'</span>';
    var first=((p.text||'').split('\n')[0]||'').slice(0,90)||'(geen tekst)';
    var open=p.url?(' href="'+esc(p.url)+'" target="_blank" rel="noopener"'):'';
    var tag=p.id===best&&sort==='reach'?'<span class="soc-pbest">'+ic('st_approved',12)+' Topper</span>':'';
    return '<a class="soc-pcard"'+open+'><span class="soc-pthumb">'+thumb+'</span>'
      +'<span class="soc-pbody"><span class="soc-pmeta"><span class="soc-pnet" style="color:'+col+';background:'+col+'14">'+esc(p.label||p.network)+'</span><span class="soc-pdate">'+esc(socialPostDate(p.date))+'</span>'+tag+'</span>'
      +'<span class="soc-ptext">'+esc(first)+'</span>'
      +'<span class="soc-pstats"><span class="soc-pstat"><b>'+socialFmt(p.reach)+'</b><i>bereik</i></span><span class="soc-pstat"><b>'+socialFmt(p.interactions)+'</b><i>interacties</i></span><span class="soc-pstat"><b>'+(Number(p.engagementRate)||0)+'%</b><i>engagement</i></span>'+(p.views?'<span class="soc-pstat"><b>'+socialFmt(p.views)+'</b><i>weergaven</i></span>':'')+'</span></span>'
      +(p.url?'<span class="soc-parrow">'+ic('arrow',16)+'</span>':'')+'</a>';
  }).join('');
  var nets=(s.networks||[]);
  var netRow=nets.length?('<div class="soc-knets">'+nets.map(function(n){ var col=((typeof mcNet==='function'&&mcNet(n.network))||[])[1]||'var(--s27-blue,#3083DC)';
    return '<div class="soc-knet"><span class="soc-knet-dot" style="background:'+col+'"></span><b>'+esc(n.label||n.network)+'</b><span class="soc-knet-v">'+socialFmt(n.posts)+' posts · '+socialFmt(n.reach)+' bereik</span><span class="soc-knet-g '+(n.engagementRate>=3?'up':'down')+'">'+(Number(n.engagementRate)||0)+'%</span></div>';
  }).join('')+'</div>'):'';
  return '<div class="soc-stats soc-poststats"><div class="soc-phead"><h3>Postprestaties</h3>'+sortbar+'</div>'+cards+netRow+'<div class="soc-plist">'+rows+'</div></div>';
}
function socialPostStatsDemo(){
  var mk=function(net,label,d,reach,inter,er,views,txt,img){ return {id:net+d,network:net,label:label,date:'2026-0'+d,text:txt,image:img,url:'#',type:'',reach:reach,interactions:inter,likes:Math.round(inter*0.7),comments:2,shares:1,views:views,engagement:er,engagementRate:er}; };
  return { linked:true, period:{days:90},
    summary:{posts:18,reach:62300,interactions:3620,avgReach:3461,avgInteractions:201,avgEngagementRate:5.8,bestPostId:'instagram5'},
    networks:[{network:'instagram',label:'Instagram',posts:9,reach:41200,interactions:2300,engagementRate:5.6},{network:'facebook',label:'Facebook',posts:6,reach:21100,interactions:980,engagementRate:4.6},{network:'linkedin',label:'LinkedIn',posts:3,reach:8900,interactions:340,engagementRate:3.8}],
    posts:[ mk('instagram','Instagram','5-21',5210,420,8.1,0,'Achter de schermen bij onze nieuwste shoot 🎬',''),
      mk('facebook','Facebook','5-18',4870,210,4.3,0,'Een kijkje in ons atelier deze week',''),
      mk('instagram','Instagram','5-12',3980,360,9.0,12400,'Reel: van concept tot oplevering in 30s',''),
      mk('linkedin','LinkedIn','5-08',3450,150,4.3,0,'Waarom merkconsistentie het verschil maakt',''),
      mk('facebook','Facebook','5-02',2980,120,4.0,0,'Klant in de kijker: een sterke samenwerking','') ] };
}
/* ---- "Wat werkt het best" (fase 3): beste momenten + formats + hashtags ---- */
function socialInsightsHTML(){
  var s=state.demoMode?socialInsightsDemo():((window.S27DATA&&S27DATA.metricoolPostStats)?S27DATA.metricoolPostStats():null);
  if(!s){ return ''; }                                    // (skel toont het postprestatie-blok al)
  if(!s.linked) return '';
  var bt=s.bestTimes||[], fm=s.formats||[], ht=s.hashtags||[];
  if(!bt.length && !fm.length && !ht.length) return '';
  return socialInsightsBlock(bt,fm,ht);
}
function socialInsightsBar(val,max){ var w=max>0?Math.max(6,Math.round((val/max)*100)):0; return '<span class="soc-ibar"><i style="width:'+w+'%"></i></span>'; }
function socialInsightsBlock(bt,fm,ht){
  var maxBt=Math.max.apply(null,bt.map(function(t){return t.avgEngagementRate;}).concat([0]));
  var maxFm=Math.max.apply(null,fm.map(function(f){return f.avgEngagementRate;}).concat([0]));
  var moments=bt.length?bt.map(function(t){
    return '<div class="soc-irow"><div class="soc-ilab"><b>'+esc(t.day)+'</b><span>'+esc(t.part)+' · '+socialFmt(t.count)+' posts</span></div>'+socialInsightsBar(t.avgEngagementRate,maxBt)+'<span class="soc-ival">'+(Number(t.avgEngagementRate)||0)+'%</span></div>';
  }).join(''):'<div class="soc-iempty">Nog te weinig posts om een patroon te zien.</div>';
  var formats=fm.length?fm.map(function(f){
    return '<div class="soc-irow"><div class="soc-ilab"><b>'+esc(f.format)+'</b><span>'+socialFmt(f.count)+' posts · '+socialFmt(f.avgReach)+' bereik</span></div>'+socialInsightsBar(f.avgEngagementRate,maxFm)+'<span class="soc-ival">'+(Number(f.avgEngagementRate)||0)+'%</span></div>';
  }).join(''):'<div class="soc-iempty">Nog geen formatdata.</div>';
  var tags=ht.length?('<div class="soc-tags">'+ht.map(function(h){
    return '<span class="soc-tag" title="'+socialFmt(h.avgReach)+' gem. bereik · '+socialFmt(h.count)+' posts">'+esc(h.tag)+'<b>'+(Number(h.avgEngagementRate)||0)+'%</b></span>';
  }).join('')+'</div>'):'<div class="soc-iempty">Voeg hashtags toe aan je posts om hier inzicht te krijgen.</div>';
  return '<div class="soc-stats soc-insights">'
    +'<div class="soc-phead"><h3>Wat werkt het best</h3><span class="soc-isub">afgeleid uit je eigen posts · engagement = interacties / bereik</span></div>'
    +'<div class="soc-igrid">'
      +'<div class="soc-icard"><div class="soc-ihead">'+ic('cal',16)+' Beste momenten</div>'+moments+'</div>'
      +'<div class="soc-icard"><div class="soc-ihead">'+ic('st_approved',16)+' Sterkste formats</div>'+formats+'</div>'
      +'<div class="soc-icard"><div class="soc-ihead soc-ihead-tags"><span>#</span> Topscorende hashtags</div>'+tags+'</div>'
    +'</div></div>';
}
function socialInsightsDemo(){
  return { linked:true,
    bestTimes:[{day:'Donderdag',part:'Ochtend',count:5,avgReach:4200,avgInteractions:240,avgEngagementRate:7.1},{day:'Dinsdag',part:'Avond',count:4,avgReach:3800,avgInteractions:190,avgEngagementRate:6.2},{day:'Zaterdag',part:'Ochtend',count:3,avgReach:3100,avgInteractions:150,avgEngagementRate:5.4},{day:'Maandag',part:'Middag',count:3,avgReach:2600,avgInteractions:110,avgEngagementRate:4.2}],
    formats:[{format:'Reel / video',count:6,avgReach:5200,avgInteractions:360,avgEngagementRate:6.9},{format:'Carrousel',count:8,avgReach:3600,avgInteractions:210,avgEngagementRate:5.8},{format:'Foto',count:9,avgReach:2400,avgInteractions:96,avgEngagementRate:4.0}],
    hashtags:[{tag:'#studio27',count:12,avgReach:3800,avgEngagementRate:6.4},{tag:'#contentcreatie',count:6,avgReach:3200,avgEngagementRate:5.9},{tag:'#marketing',count:8,avgReach:2900,avgEngagementRate:5.1},{tag:'#webdesign',count:4,avgReach:2600,avgEngagementRate:4.7},{tag:'#branding',count:5,avgReach:2400,avgEngagementRate:4.3}] };
}
function socialMatrixbar(posts){
  var c={concept:0,feedback:0,goedgekeurd:0,gepubliceerd:0}; posts.forEach(function(p){ c[socialStatus(p)]++; });
  var cards=[['feedback','Wacht op je feedback',c.feedback,'orange'],['goedgekeurd','Goedgekeurd',c.goedgekeurd,'green'],['gepubliceerd','Gepubliceerd',c.gepubliceerd,'blue']];
  return '<div class="soc-matrix">'+cards.map(function(k){ var active=socialFilter()===k[0];
    return '<button class="soc-mcard br-'+k[3]+(active?' active':'')+'" onclick="socialSetFilter(\''+(active?'alles':k[0])+'\')"><div class="soc-mbar"></div><div class="soc-mnum">'+k[2]+'</div><div class="soc-mlab">'+esc(k[1])+'</div></button>';
  }).join('')+'</div>';
}
function socialFilters(){
  var posts=socialPostsAll();
  var c={concept:0,feedback:0,goedgekeurd:0,gepubliceerd:0}; posts.forEach(function(p){ var s=socialStatus(p); if(c[s]!=null) c[s]++; });
  var fs=[['alles','Alle',posts.length],['feedback','Wacht op je feedback',c.feedback],['goedgekeurd','Goedgekeurd',c.goedgekeurd],['gepubliceerd','Gepubliceerd',c.gepubliceerd]];
  if(c.concept) fs.splice(1,0,['concept','In voorbereiding',c.concept]);   // enkel tonen als er concepten zijn
  return '<div class="soc-fbar">'+fs.map(function(f){ return '<button class="soc-fchip'+(socialFilter()===f[0]?' active':'')+'" onclick="socialSetFilter(\''+f[0]+'\')"><b style="opacity:.8">'+f[2]+'</b> '+esc(f[1])+'</button>'; }).join('')+'</div>';
}
function socialCalendar(posts){
  var mo=socialMonth(); var first=new Date(mo.y,mo.m,1);
  var startDow=(first.getDay()+6)%7; var dim=new Date(mo.y,mo.m+1,0).getDate();
  var label=first.toLocaleDateString('nl-BE',{month:'long',year:'numeric'});
  var now=new Date(); var isCur=(now.getFullYear()===mo.y&&now.getMonth()===mo.m);
  var byDay={}; posts.forEach(function(p){ if(p.dt&&p.dt.getFullYear()===mo.y&&p.dt.getMonth()===mo.m){ var d=p.dt.getDate(); (byDay[d]=byDay[d]||[]).push(p); } });
  var dow=['ma','di','wo','do','vr','za','zo']; var cells='';
  for(var i=0;i<startDow;i++) cells+='<div class="soc-cell soc-empty"></div>';
  for(var day=1;day<=dim;day++){
    var dps=(byDay[day]||[]).sort(function(a,b){return a.dt-b.dt;});
    var today=isCur&&now.getDate()===day;
    cells+='<div class="soc-cell'+(today?' soc-today':'')+'"><div class="soc-daynum">'+day+'</div>'+dps.map(function(p){
      var m=socialStatusMeta(socialStatus(p)); var nc=mcNet(((p.netwerken||[])[0]||{}).netwerk);
      var tm=p.dt.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'});
      return '<button class="soc-chip" style="--cc:'+nc[1]+'" onclick="socialOpenDetail(\''+esc(p.id)+'\')" title="'+esc((p.tekst||'').replace(/\s+/g,' ').slice(0,90))+'"><span class="soc-cdot" style="background:'+m[1]+'"></span>'+tm+'</button>';
    }).join('')+'</div>';
  }
  // posts zonder datum (bv. concepten die het team nog moet inplannen) passen niet in het
  // dag-raster maar moeten WEL zichtbaar zijn, anders kloppen de filtertellers niet (review v82)
  var zonder=posts.filter(function(p){return !p.dt;});
  var zonderHtml=zonder.length?('<div class="soc-nodate"><span class="soc-nodate-lab">Nog in te plannen</span>'+zonder.map(function(p){
    var m=socialStatusMeta(socialStatus(p)); var nc=mcNet(((p.netwerken||[])[0]||{}).netwerk);
    var snip=esc((p.tekst||'(nog geen tekst)').replace(/\s+/g,' ').slice(0,46));
    return '<button class="soc-chip" style="--cc:'+nc[1]+'" onclick="socialOpenDetail(\''+esc(p.id)+'\')"><span class="soc-cdot" style="background:'+m[1]+'"></span>'+snip+'</button>';
  }).join('')+'</div>'):'';
  var legend='<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:12px;color:var(--ink-4)">'+(posts.some(function(p){return socialStatus(p)==='concept';})?['concept','feedback','goedgekeurd','gepubliceerd']:['feedback','goedgekeurd','gepubliceerd']).map(function(s){var m=socialStatusMeta(s);return '<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:9px;height:9px;border-radius:99px;background:'+m[1]+'"></span>'+esc(m[0])+'</span>';}).join('')+'</div>';
  // Mobiele agenda: hetzelfde maandoverzicht maar als chronologische lijst (alleen dagen mét posts).
  // Het dichte 7-koloms-raster is onleesbaar op een telefoon; CSS wisselt grid<->agenda per schermbreedte.
  var daysWith=Object.keys(byDay).map(Number).sort(function(a,b){return a-b;});
  var agenda='<div class="soc-agenda">'+(daysWith.length? daysWith.map(function(day){
      var dps=(byDay[day]||[]).sort(function(a,b){return a.dt-b.dt;});
      var dd=new Date(mo.y,mo.m,day), wd=dd.toLocaleDateString('nl-BE',{weekday:'long'});
      var today=isCur&&now.getDate()===day;
      return '<div class="soc-agday'+(today?' soc-agtoday':'')+'"><div class="soc-agdate"><span class="soc-agnum">'+day+'</span><span class="soc-agwd">'+esc(wd)+'</span></div><div class="soc-aglist">'+dps.map(function(p){
        var m=socialStatusMeta(socialStatus(p)), nc=mcNet(((p.netwerken||[])[0]||{}).netwerk);
        var tm=p.dt.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'});
        var snip=esc((p.tekst||'(geen tekst)').replace(/\s+/g,' ').slice(0,64));
        return '<button class="soc-agitem" style="--cc:'+nc[1]+'" onclick="socialOpenDetail(\''+esc(p.id)+'\')"><span class="soc-cdot" style="background:'+m[1]+'"></span><span class="soc-agtime">'+tm+'</span><span class="soc-agtxt">'+snip+'</span></button>';
      }).join('')+'</div></div>';
    }).join('') : '<div class="empty" style="padding:26px;text-align:center;color:var(--ink-4)">Geen posts gepland in '+esc(label)+'.</div>')+'</div>';
  return '<div class="section-head" style="margin-top:6px"><h2 style="text-transform:capitalize">'+esc(label)+'</h2><div class="soc-nav"><button aria-label="Vorige maand" onclick="socialMonthNav(-1)">'+ic('arrow',16)+'</button><button aria-label="Volgende maand" onclick="socialMonthNav(1)">'+ic('arrow',16)+'</button></div></div>'
    +'<div class="soc-cal"><div class="soc-dow">'+dow.map(function(d){return '<span>'+d+'</span>';}).join('')+'</div><div class="soc-grid">'+cells+'</div></div>'+agenda+zonderHtml+legend;
}
/* platform-merkglyphs (currentColor) voor de kanaalkiezer + gsm-mockup */
function mcNetIcon(net){
  net=(net||'').toLowerCase();
  var P={
    instagram:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.3"/><circle cx="17.4" cy="6.6" r="1.4" fill="currentColor" stroke="none"/></svg>',
    facebook:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>',
    linkedin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.73v20.54C0 23.22.8 24 1.77 24h20.45C23.2 24 24 23.22 24 22.27V1.73C24 .78 23.2 0 22.22 0z"/></svg>',
    tiktok:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.2v12.86a2.6 2.6 0 0 1-2.6 2.5 2.6 2.6 0 1 1 .7-5.1V7.4a5.84 5.84 0 1 0 5.1 5.79V8.9a7.5 7.5 0 0 0 4.3 1.35V7.05a4.28 4.28 0 0 1-2.95-1.23z"/></svg>',
    youtube:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.4.52A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.13c1.9.52 9.4.52 9.4.52s7.5 0 9.4-.52a3 3 0 0 0 2.1-2.13A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8zM9.6 15.6V8.4l6.27 3.6z"/></svg>',
    gbp:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.2v3.92h5.45a4.7 4.7 0 0 1-2.04 3.07v2.55h3.3C20.64 18 22 15.4 22 12.27c0-.73-.07-1.43-.2-2.1H12z"/><path d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.3-2.55c-.9.6-2.05.96-3.32.96-2.55 0-4.7-1.72-5.48-4.03H3.1v2.6A10 10 0 0 0 12 22z"/><path d="M6.52 13.95a6 6 0 0 1 0-3.84v-2.6H3.1a10 10 0 0 0 0 9.04z"/><path d="M12 6.07c1.47 0 2.8.5 3.84 1.5l2.88-2.88A10 10 0 0 0 3.1 7.5l3.42 2.6C7.3 7.8 9.45 6.07 12 6.07z"/></svg>',
    twitter:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2h3.3l-7.2 8.26L23 22h-6.6l-5.18-6.77L5.3 22H2l7.7-8.8L1.3 2H8l4.68 6.19zM17.04 20h1.83L7.04 3.9H5.08z"/></svg>',
    pinterest:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.64 19.31c-.05-.81-.1-2.06.02-2.95l1.2-5.1s-.31-.62-.31-1.52c0-1.42.83-2.48 1.85-2.48.88 0 1.3.66 1.3 1.44 0 .88-.56 2.2-.85 3.42-.24 1.02.51 1.85 1.51 1.85 1.81 0 3.2-1.9 3.2-4.66 0-2.43-1.75-4.13-4.25-4.13a4.4 4.4 0 0 0-4.6 4.41c0 .87.34 1.81.76 2.32a.3.3 0 0 1 .07.29l-.28 1.15c-.04.19-.15.23-.34.14-1.26-.59-2.04-2.42-2.04-3.9 0-3.18 2.31-6.1 6.66-6.1 3.5 0 6.21 2.49 6.21 5.82 0 3.47-2.18 6.27-5.22 6.27-1.02 0-1.98-.53-2.31-1.16l-.63 2.4c-.23.87-.84 1.97-1.26 2.64A10 10 0 1 0 12 2z"/></svg>',
    bluesky:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.3 4.2C8.7 6 11.3 9.6 12 11.6c.7-2 3.3-5.6 5.7-7.4 1.7-1.3 4.3-2.3 4.3.7 0 .6-.34 5-.54 5.7-.7 2.5-3.2 3.14-5.44 2.76 3.9.66 4.9 2.86 2.76 5.06-4.07 4.17-5.84-1.05-6.3-2.39-.08-.24-.12-.36-.12-.26 0-.1-.04.02-.12.26-.46 1.34-2.23 6.56-6.3 2.39-2.14-2.2-1.14-4.4 2.76-5.06-2.24.38-4.74-.26-5.44-2.76C2.84 10.6 2.5 6.2 2.5 5.6c0-3 2.6-2 4.3-.7z"/></svg>',
    threads:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.9 11.2c-.1-.05-.2-.1-.3-.14-.18-3.2-1.94-5.04-4.9-5.06h-.04c-1.77 0-3.25.76-4.16 2.13l1.63 1.12c.68-1.03 1.74-1.25 2.53-1.25h.03c.98 0 1.72.29 2.2.85.35.4.58.97.7 1.68-.88-.15-1.83-.18-2.84-.1-2.85.16-4.68 1.82-4.56 4.13.06 1.17.64 2.18 1.64 2.83.84.55 1.93.82 3.06.76 1.5-.08 2.67-.65 3.49-1.69.62-.79.94-1.79 1.07-2.96.55.33.95.76 1.18 1.28.39.88.41 2.33-.77 3.5-1.03 1.03-2.27 1.47-4.15 1.49h-.02c-2.08-.02-3.66-.69-4.69-2-.96-1.23-1.46-3-1.48-5.27.02-2.27.52-4.04 1.48-5.27 1.03-1.31 2.6-1.99 4.69-2h.02c2.1.01 3.69.69 4.74 2.02.51.65.9 1.48 1.16 2.45l1.83-.49c-.31-1.2-.8-2.24-1.47-3.08C16.36 4.13 14.29 3.23 11.6 3.21h-.03c-2.69.02-4.73.92-6.07 2.68-1.19 1.56-1.81 3.74-1.83 6.48v.02c.02 2.74.64 4.92 1.83 6.48 1.34 1.76 3.38 2.66 6.07 2.68h.03c2.39-.02 4.08-.65 5.47-2.04 1.82-1.81 1.77-4.08 1.17-5.47-.43-1-1.25-1.81-2.37-2.36z"/></svg>'
  };
  return P[net]||P[net==='x'?'twitter':'']||'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>';
}
function socialChanIcon(net,on){ var n=mcNet(net); return '<button type="button" class="soc-chic'+(on?' on':'')+'" data-net="'+net+'" onclick="socialToggleChan(this)" style="--cn:'+n[1]+'" title="'+esc(n[0])+'" aria-label="'+esc(n[0])+'">'+mcNetIcon(net)+'</button>'; }
// gsm-mockup met Instagram-look (live preview van visual + caption)
function _isVidUrl(u){ return /\.(mp4|mov|webm|m4v|m3u8)(\?|$)/i.test(String(u||'')); }
// Accountnaam voor de mockup-header: échte social-handle uit Metricool indien beschikbaar, anders de bedrijfsnaam (NOOIT het e-mailadres).
function _socAccountName(net){
  var mc=(window.S27DATA&&S27DATA.metricool&&S27DATA.metricool())||null;
  net=String(net||'').toLowerCase();
  if(mc){
    if(mc.accounts && net && mc.accounts[net] && mc.accounts[net].name) return mc.accounts[net].name;
    if(mc.accounts){ for(var k in mc.accounts){ if(mc.accounts[k] && mc.accounts[k].name) return mc.accounts[k].name; } }
    if(mc.brandName) return mc.brandName;
  }
  var b=_bedrijf();
  return /@/.test(b) ? '' : b;   // nooit een e-mailadres in de mockup tonen
}
// Formaat afleiden: reel/verticaal (9:16) vs feed (1:1), bepaalt de beeldverhouding van de mockup, zodat een reel niet wordt afgeknipt.
/* Schrijfrecht 'Socials-bewerkbaar' (Cluster R): team + demo altijd; klanten enkel met het
   recht op de bedrijf-taak (worker gate't dezelfde regel server-side, dit is enkel UI). */
function socialsEditable(){
  if(state.demoMode) return true;
  // In ClientView (staff bekijkt als klant) spiegelen we exact wat de klant ziet: enkel het
  // module-recht, niet het automatische staff-recht. isRichView() = teamweergave -> altijd bewerkbaar.
  if(typeof isRichView==='function' && isRichView()) return true;
  var d=state.data&&state.data.dashboard;
  return !!(d&&d.modules&&d.modules.socials_bewerkbaar===true);
}
/* Mockup volgt de ECHTE aspect-ratio van de media (geen uitrekken/croppen meer):
   zodra metadata laadt, neemt de mediawrap de ratio van de actieve slide aan. */
function socialMockMetaRatio(el){
  try{
    var w=el.videoWidth||el.naturalWidth, h=el.videoHeight||el.naturalHeight;
    if(!w||!h) return;
    var slide=el.closest('.soc-ph-slide'); if(slide) slide.setAttribute('data-ratio', w+' / '+h);
    var host=el.closest('.soc-ph-mediawrap');
    if(host && slide && slide.classList.contains('on')) host.style.aspectRatio=w+' / '+h;
  }catch(e){}
}
function socialInferFormat(p,net,isVid,nMedia,captionOverride){
  net=String(net||'').toLowerCase();
  if(net==='tiktok'||net==='youtube') return 'reel';
  if(isVid) return 'reel';
  var cap=String(captionOverride!=null?captionOverride:((p&&p.tekst)||'')).toLowerCase();
  if(/\breel\b|\bstory\b|\bverticaal\b|\bverticale\b/.test(cap)) return 'reel';
  return 'feed';
}
// gsm-mockup: netwerk-bewust (avatar + accent + accountnaam), formaat-bewust (reel 9:16 / feed 1:1), carrousel met dots + swipe.
function socialPhoneMock(opts){
  opts=opts||{};
  var brand=opts.brand||'';
  var caption=opts.caption||'';
  var net=String(opts.net||'instagram').toLowerCase();
  var fmt=opts.format||'feed';
  var arr=(opts.mediaArr&&opts.mediaArr.length)?opts.mediaArr:(opts.media?[opts.media]:[]);
  var accent=(typeof mcNet==='function'?(mcNet(net)[1]||'#C13584'):'#C13584');
  var ratio=(fmt==='reel')?'9 / 16':'1 / 1';
  var heart='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  var comment='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>';
  var share='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  var book='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  var avStyle=(net==='instagram')?'':' style="background:'+accent+'"';
  var slides=arr.length
    ? arr.map(function(u,i){ var v=_isVidUrl(u); return '<div class="soc-ph-slide'+(i===0?' on':'')+'" data-i="'+i+'">'+(v?'<video src="'+esc(u)+'" controls playsinline preload="metadata" onloadedmetadata="socialMockMetaRatio(this)"></video>':'<img src="'+esc(u)+'" alt="" onload="socialMockMetaRatio(this)">')+'</div>'; }).join('')
    : '<div class="soc-ph-empty">'+ic('img',30)+'<span>Nog geen visual</span></div>';
  var dots=(arr.length>1)?'<div class="soc-ph-dots">'+arr.map(function(u,i){ return '<button type="button" class="soc-ph-dot'+(i===0?' on':'')+'" data-i="'+i+'" onclick="socialMockSlide('+i+')" aria-label="Naar slide '+(i+1)+'"></button>'; }).join('')+'</div>':'';
  var counter=(arr.length>1)?'<span class="soc-ph-count" id="socPhCount">1/'+arr.length+'</span>':'';
  return '<div class="soc-phone soc-net-'+esc(net)+' soc-fmt-'+esc(fmt)+'"><div class="soc-phone-scr">'
    +'<div class="soc-ph-top"><span class="soc-ph-av"'+avStyle+'>'+mcNetIcon(net)+'</span><span class="soc-ph-user">'+esc(brand)+'</span>'+counter+'<span class="soc-ph-more">···</span></div>'
    +'<div class="soc-ph-mediawrap" id="socPhMedia" data-i="0" style="aspect-ratio:'+ratio+'" ontouchstart="socialSwipeStart(event)" ontouchend="socialSwipeEnd(event)">'+slides+dots+'</div>'
    +'<div class="soc-ph-bar"><span>'+heart+'</span><span>'+comment+'</span><span>'+share+'</span><span class="soc-ph-bk">'+book+'</span></div>'
    +'<div class="soc-ph-cap"><b>'+esc(brand)+'</b> <span id="socPhCap">'+esc(caption||'')+'</span></div>'
    +'</div></div>';
}
function socialMockSlide(i){
  var host=document.getElementById('socPhMedia'); if(!host) return;
  var slides=host.querySelectorAll('.soc-ph-slide'); if(!slides.length) return;
  i=((i%slides.length)+slides.length)%slides.length;
  [].forEach.call(slides,function(s,j){ s.classList.toggle('on',j===i); if(j!==i){ var vd=s.querySelector('video'); if(vd){ try{vd.pause();}catch(e){} } } });
  [].forEach.call(host.querySelectorAll('.soc-ph-dot'),function(d,j){ d.classList.toggle('on',j===i); });
  var c=document.getElementById('socPhCount'); if(c) c.textContent=(i+1)+'/'+slides.length;
  host.setAttribute('data-i',i);
  var r=slides[i].getAttribute('data-ratio'); if(r) host.style.aspectRatio=r;   // mockup volgt de actieve slide
}
var _socSwipeX=null;
function socialSwipeStart(e){ _socSwipeX=(e&&e.touches&&e.touches[0])?e.touches[0].clientX:null; }
function socialSwipeEnd(e){ if(_socSwipeX==null) return; var host=document.getElementById('socPhMedia'); var x=(e&&e.changedTouches&&e.changedTouches[0])?e.changedTouches[0].clientX:null; var dx=(x==null)?0:(x-_socSwipeX); _socSwipeX=null; if(!host) return; if(host.querySelectorAll('.soc-ph-slide').length<2) return; var cur=Number(host.getAttribute('data-i')||0); if(dx<-30) socialMockSlide(cur+1); else if(dx>30) socialMockSlide(cur-1); }
// Herbouw de mockup uit de huidige editor-state (kanalen, media, caption), netwerk- en formaat-bewust.
function socialSyncMock(){
  var col=document.getElementById('socPv'); if(!col) return;
  var prevIdx=0; var oldHost=document.getElementById('socPhMedia'); if(oldHost) prevIdx=Number(oldHost.getAttribute('data-i')||0);
  var p=(state._socialDetail!=null)?socialPostsAll().filter(function(x){return String(x.id)===String(state._socialDetail);})[0]:null;
  var ons=[].slice.call(document.querySelectorAll('.soc-chics:not(.soc-chics-ro) .soc-chic.on')).map(function(b){return String(b.getAttribute('data-net')||'').toLowerCase();});
  var net=(state._socPreviewNet && ons.indexOf(state._socPreviewNet)>=0)?state._socPreviewNet:(ons[0]||state._socPreviewNet||'instagram');
  state._socPreviewNet=net;
  var mi=document.getElementById('socMedia'); var url=mi?String(mi.value||'').trim():'';
  var arr=url?[url]:((p&&p.media_all&&p.media_all.length)?p.media_all:((p&&p.media)?[p.media]:[]));
  var isVid=(arr.length===1)?_isVidUrl(arr[0]):false;
  var capEl=document.getElementById('socCap'); var caption=capEl?capEl.value:((p&&p.tekst)||'');
  var fmt=socialInferFormat(p,net,isVid,arr.length,caption);
  col.innerHTML=socialPhoneMock({brand:_socAccountName(net),caption:caption,net:net,format:fmt,mediaArr:arr});
  if(prevIdx>0){ var nh=document.getElementById('socPhMedia'); if(nh && nh.querySelectorAll('.soc-ph-slide').length>prevIdx) socialMockSlide(prevIdx); }
}
function socialPreviewSync(){ var c=document.getElementById('socCap'), t=document.getElementById('socPhCap'); if(t) t.textContent=c?c.value:''; }
function socialPreviewMedia(){ socialSyncMock(); }
function socialDetailPage(id){
  var p=socialPostsAll().filter(function(x){return String(x.id)===String(id);})[0];
  if(!p){ socialCloseDetail(); return ''; }
  if(state._socPreviewFor!==String(id)){ state._socPreviewNet=null; state._socPreviewFor=String(id); }
  var st=socialStatus(p);
  var dd=p.dt?p.dt.toLocaleDateString('nl-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'';
  var tt=p.dt?p.dt.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}):'';
  var published=(st==='gepubliceerd');
  var mediaArr=(p.media_all&&p.media_all.length)?p.media_all:((p.media)?[p.media]:[]);
  var onNets=[]; (p.providers||[]).forEach(function(pr){ var n=String(pr.network||'').toLowerCase(); if(n&&onNets.indexOf(n)<0) onNets.push(n); });
  (p.netwerken||[]).forEach(function(nw){ var n=String(nw.netwerk||'').toLowerCase(); if(n&&onNets.indexOf(n)<0) onNets.push(n); });
  var activeNet=(state._socPreviewNet && onNets.indexOf(state._socPreviewNet)>=0)?state._socPreviewNet:(onNets[0]||'instagram');
  state._socPreviewNet=activeNet;
  var initVid=(mediaArr.length===1)?_isVidUrl(mediaArr[0]):false;
  var fmt=socialInferFormat(p,activeNet,initVid,mediaArr.length);
  var back='<button class="soc-close" type="button" aria-label="Sluiten" title="Terug naar de kalender" onclick="socialCloseDetail()">'+ic('plus',22)+'</button>';
  var phone=socialPhoneMock({brand:_socAccountName(activeNet),caption:p.tekst||'',net:activeNet,format:fmt,mediaArr:mediaArr});
  var datebadge=(dd?'<span class="soc-emeta-date">'+ic('cal',13)+' '+esc(dd)+(tt?' · '+tt:'')+'</span>':'');
  if(published){
    var nets=(p.netwerken||[]).map(function(nw){ var n=mcNet(nw.netwerk); return '<span class="soc-chic on" style="--cn:'+n[1]+'" title="'+esc(n[0])+'">'+mcNetIcon(nw.netwerk)+'</span>'; }).join('');
    return '<div class="soc-editor">'+back
      +'<div class="soc-egrid"><div class="soc-ecol-pv" id="socPv">'+phone+'</div><div class="soc-ecol-form">'
        +'<div class="soc-emeta">'+datebadge+'</div>'
        +'<label class="soc-elab">Kanalen</label><div class="soc-chics soc-chics-ro">'+(nets||'<span class="fs" style="color:var(--ink-4)">-</span>')+'</div>'
        +'<label class="soc-elab">Tekst &amp; hashtags</label><div class="soc-dtxt-box">'+esc(p.tekst||'(geen tekst)')+'</div>'
        +'<div class="soc-roinfo">'+ic('check',15)+' Deze post is gepubliceerd, dus niet meer aanpasbaar. Een vraag erover? Laat het ons weten via de projectchat.</div>'
      +'</div></div></div>';
  }
  // CONCEPT (Metricool-draft, bug 86ca83gp0): altijd read-only, ook voor klanten mét
  // bewerkrecht en voor het team via het portaal (drafts finaliseert het team in Metricool).
  // De klant ziet zo wél dat er een post aankomt waarvoor soms nog input/beeld nodig is.
  if(p.draft){
    var dm=socialStatusMeta('concept');
    var dnets=(onNets.map(function(nw){ var n=mcNet(nw); return '<span class="soc-chic on" style="--cn:'+n[1]+'" title="'+esc(n[0])+'">'+mcNetIcon(nw)+'</span>'; }).join('')||'<span class="fs" style="color:var(--ink-4)">-</span>');
    return '<div class="soc-editor">'+back
      +'<div class="soc-egrid"><div class="soc-ecol-pv" id="socPv">'+phone+'</div><div class="soc-ecol-form">'
        +'<div class="soc-emeta">'+datebadge+'<span class="soc-badge" style="color:'+dm[1]+';background:'+dm[2]+'">'+esc(dm[0])+'</span></div>'
        +'<label class="soc-elab">Kanalen</label><div class="soc-chics soc-chics-ro">'+dnets+'</div>'
        +'<label class="soc-elab">Tekst &amp; hashtags</label><div class="soc-dtxt-box">'+esc(p.tekst||'(nog geen tekst)')+'</div>'
        +'<div class="soc-roinfo">'+ic('st_progress',15)+' Deze post is nog in voorbereiding bij ons team. Soms wachten we hiervoor nog op beeldmateriaal of input van jou. Je kan alvast meekijken; aanpassen of goedkeuren kan zodra de post klaarstaat. Iets aanleveren of een vraag? Stuur het via de chat onderaan de plannerpagina.</div>'
      +'</div></div></div>';
  }
  // EDITOR (geplande post): kanalen aan/uit (icoontjes wisselen de preview), caption groot, visual.
  // Zonder 'Socials-bewerkbaar'-recht: alles read-only (feedback + goedkeuren blijven wél).
  var editable=socialsEditable();
  var CHAN=['facebook','instagram','linkedin','tiktok','youtube','gbp'];
  var on={}; onNets.forEach(function(n){ on[n]=true; });
  var chans=editable
    ? CHAN.map(function(net){ return socialChanIcon(net,!!on[net]); }).join('')
    : (onNets.map(function(nw){ var n=mcNet(nw); return '<span class="soc-chic on" style="--cn:'+n[1]+'" title="'+esc(n[0])+'">'+mcNetIcon(nw)+'</span>'; }).join('')||'<span class="fs" style="color:var(--ink-4)">-</span>');
  return '<div class="soc-editor">'+back
    +'<div class="soc-egrid"><div class="soc-ecol-pv" id="socPv">'+phone+'</div><div class="soc-ecol-form">'
      +'<div class="soc-emeta">'+datebadge+'</div>'
      +'<label class="soc-elab">Kanalen</label><div class="soc-chics'+(editable?'':' soc-chics-ro')+'">'+chans+'</div>'
      +'<label class="soc-elab">Tekst &amp; hashtags</label>'+(editable
        ? '<textarea id="socCap" class="soc-cap" rows="12" oninput="socialPreviewSync()" placeholder="Schrijf je caption… hashtags typ je gewoon mee (#voorbeeld)">'+esc(p.tekst||'')+'</textarea>'
        : '<div class="soc-dtxt-box">'+esc(p.tekst||'(geen tekst)')+'</div>')
      +(editable
        ? '<label class="soc-elab">Visual</label>'
          +'<div class="soc-visrow"><button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById(\'socFile\').click()">'+ic('upload',15)+' Upload foto/video</button><input type="file" id="socFile" accept="image/*,video/*" style="display:none" onchange="socialUploadMedia(this)"><span class="soc-upor">of</span><input id="socMedia" class="soc-hashin" style="flex:1;min-width:150px;box-sizing:border-box" placeholder="plak een URL" oninput="socialPreviewMedia()"></div>'
          +'<div id="socUpMsg" class="fs" style="margin-top:7px"></div>'
          +'<p class="fs" style="color:var(--ink-4);margin:6px 0 0">Laat leeg om de huidige visual te behouden. Een geüploade foto/video gebruiken we automatisch.</p>'
        : '')
      +'<div id="socFbWrap" class="soc-fbwrap" style="display:none;margin-top:14px"><label class="soc-elab">Wat wil je aangepast zien?</label><textarea id="socFbTx" class="soc-cap" rows="3" placeholder="Beschrijf kort je feedback voor dit bericht…"></textarea><button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="socialFeedback(\''+esc(p.id)+'\',this)">'+ic('check',15)+' Verstuur feedback</button></div>'
      +'<div id="socSaveMsg" style="margin-top:12px"></div>'
      +'<div class="soc-eactions" id="socEditActsForm">'+socialEditorActions(p.id)+'</div>'
    +'</div></div></div>';
}
// Actieknoppen van de post-editor (renderen nu RECHTSONDER in het formulier, niet meer op de sub-nav-balk). Hergebruikt de bestaande save/approve/feedback-flows.
function socialEditorActions(id){
  var p=socialPostsAll().filter(function(x){return String(x.id)===String(id);})[0];
  if(!p) return '';
  var st=socialStatus(p), m=socialStatusMeta(st);
  var statusbadge='<span class="soc-badge" style="color:'+m[1]+';background:'+m[2]+'">'+esc(m[0])+'</span>';
  if(st==='gepubliceerd') return statusbadge;
  if(st==='concept') return statusbadge;   // drafts: enkel het label, geen acties (bug 86ca83gp0)
  var approved=(p.approved||(state._mcApproved&&state._mcApproved[p.id]));
  var waitBtn='<button class="btn btn-outline btn-sm" onclick="socialToggleFeedback()">Wacht op feedback</button>';
  var saveBtn=socialsEditable()?'<button class="btn btn-primary btn-sm" onclick="socialSavePost(\''+esc(p.id)+'\',this)">'+ic('check',16)+' Opslaan</button>':'';
  var apprBtn=approved?'<span class="soc-fbok" style="margin:0;padding:8px 13px">'+ic('check',15)+' Goedgekeurd</span>':'<button class="btn btn-branch br-green btn-sm" onclick="socialApprove(\''+esc(p.id)+'\',this)">'+ic('check',16)+' Goedkeuren</button>';
  return (approved?'':statusbadge)+waitBtn+saveBtn+apprBtn;
}
function socialToggleFeedback(){ var w=document.getElementById('socFbWrap'); if(!w) return; var hidden=(w.style.display==='none'||!w.style.display); w.style.display=hidden?'block':'none'; if(hidden){ var t=document.getElementById('socFbTx'); if(t) t.focus(); } }
function panelSocials(){
  const head = '';   // hero/titel "Jouw socials strak gepland" verwijderd (overbodig, altijd de klant zelf)
  var mc = state.demoMode ? {linked:true,posts:socialDemoPosts()} : ((window.S27DATA&&S27DATA.metricool())||null);
  if(!mc) return head+'<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Je socials worden geladen…</p></div>';
  if(!mc.linked) return head+statNotLinked('socials');
  // Sub-nav (Analyse/Planner/Inzichten) + het actieve tabblad (of de post-editor) in #socialBody,
  // met onderaan de contextuele social-chat (buiten #socialBody zodat sub-tab-wissels 'm niet herrenderen).
  return mcStyleOnce()+head+socialSubnav()+'<div id="socialBody">'+socialBodyHTML()+'</div>'+socialChatSection();
}
/* Social-chat: contextuele chat over de sociale-media-taak, spiegelt de ads-chat ("Chat over je advertenties").
   Niet zichtbaar in de post-editor (net zoals de ads-campagnedetail geen chat toont). */
function socialChatSection(){
  if(state._socialDetail) return '';
  var so=_socProject(); if(!so) return '';
  return '<div class="ads-chat"><div class="section-head" style="margin-top:24px"><h2 style="display:flex;align-items:center;gap:8px">'+ic('msg',18)+' Chat over je socials</h2></div>'
    +'<p class="sdesc" style="margin:-2px 0 12px;max-width:64ch">Stel je vraag over <b>'+esc(so.name||'je socialmediaproject')+'</b> of stuur ons foto’s, video’s of ideeën voor je posts. Je bericht komt rechtstreeks bij je Studio 27-team terecht.</p>'
    +'<div class="card ads-chatcard"><div id="socChatBody">'+chatHTML(so.id)+'</div></div></div>';
}
function socialChatMount(){
  var so=_socProject();
  if(!so || state._socialDetail || !document.getElementById('chatList')) return;   // geen social-taak of geen chat in beeld (bv. post-editor)
  state.activeProject=so.id;
  if(window.S27DATA && S27DATA.loadChat && !((state.data.chats||{})[so.id])){
    S27DATA.loadChat(so.id).then(function(){ var h=document.getElementById('socChatBody'); if(h && state.activeProject===so.id) h.innerHTML=chatHTML(so.id); }).catch(function(){});
  }
  if(typeof startChatPoll==='function') startChatPoll(so.id);
}
// Voorbeeldposts (alleen demo): in de huidige maand verspreid, met verschillende statussen.
function socialDemoPosts(){
  var n=new Date(), y=n.getFullYear(), mo=n.getMonth();
  function mk(day,h,mi,net,tekst,status,approved){ return {id:'d'+day+'-'+net,dt:new Date(y,mo,day,h,mi),datum:'',tekst:tekst,media:'',approved:!!approved,netwerken:[{netwerk:net,status:status||'PENDING'}]}; }
  return [
    mk(3,9,30,'instagram','Reel: achter de schermen bij onze nieuwste shoot.\n\nBenieuwd hoe we jouw merk in beeld brengen? Hou deze pagina in de gaten!','PENDING',false),
    mk(8,10,0,'facebook','Carrousel: 5 tips voor meer zichtbaarheid online. Swipe mee en ontdek wat voor jou werkt.','PENDING',true),
    mk(12,8,15,'linkedin','We verwelkomen een nieuw gezicht in de studio. Maak kennis met ons uitgebreide team!','PUBLISHED',false),
    mk(16,17,0,'instagram','Klant in de kijker: zo hielpen we hen online groeien op een half jaar tijd.','PENDING',false),
    mk(19,11,30,'tiktok','Trend-video lentepromo. Doe je mee met de actie van deze maand?','PENDING',false),
    mk(24,9,0,'facebook','Maandelijkse update: dit hebben we de afgelopen weken voor je klaargezet.','PUBLISHED',false),
    mk(27,14,0,'linkedin','Praktijkcase: van idee tot resultaat. Lees hoe we deze samenwerking aanpakten.','PENDING',false),
    (function(){ var d=mk(21,10,0,'instagram','Zomercampagne: teaser-reel. We wachten nog op het beeldmateriaal van de laatste shoot, daarna plannen we deze post definitief in.','DRAFT',false); d.draft=true; return d; })()
  ];
}

/* ---- Advertenties (echte Meta/Google-data) ---- */
// item 7: blauw = Meta (huisstijl-blauw, matcht de grafiek), oranje = Google Ads (matcht de adverteren-tak).
const ADS_PLAT={meta:['Meta','#3083DC'],facebook:['Facebook','#3083DC'],instagram:['Instagram','#d6336c'],google:['Google Ads','#F66131'],'google-ads':['Google Ads','#F66131'],tiktok:['TikTok','#111827'],linkedin:['LinkedIn','#0a66c2'],snapchat:['Snapchat','#f7b500']};
function adsPlatAccent(){ return adsActivePlatform()==='google' ? '#F66131' : '#3083DC'; }
function _adsApplyAccent(){ var p=document.querySelector('.panel[data-screen-label="advertenties"]'); if(p) p.style.setProperty('--ads-accent', adsPlatAccent()); }
function adsPlat(p){ p=String(p||'').toLowerCase(); return ADS_PLAT[p]||[(p?p.charAt(0).toUpperCase()+p.slice(1):'Ads'),'#667684']; }
function adsObjective(o){ o=String(o||'').toUpperCase(); var m={OUTCOME_LEADS:'Leads',OUTCOME_SALES:'Verkoop',OUTCOME_TRAFFIC:'Verkeer',OUTCOME_AWARENESS:'Naamsbekendheid',OUTCOME_ENGAGEMENT:'Betrokkenheid',OUTCOME_APP_PROMOTION:'App-promotie',LINK_CLICKS:'Klikken',LEAD_GENERATION:'Leads',CONVERSIONS:'Conversies'}; return m[o]||(o?o.replace(/^OUTCOME_/,'').replace(/_/g,' ').toLowerCase():''); }
function adsNum(n){ return (Number(n)||0).toLocaleString('nl-BE'); }
function adsEur(n){ return '€ '+(Number(n)||0).toLocaleString('nl-BE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function setAdsPlatform(p){ state._adsPlatform=p; state._adsPlatMenuOpen=false; if(state._adsTab==='maand') state._adsTab='samengevat';   // 'Maandoverzicht' bestaat niet meer
  if(p==='meta' && state._adsTab==='gegevens') state._adsTab='samengevat';   // 'Uitgebreide gegevens' bestaat niet meer voor Meta (Google houdt 'gegevens' = Zoektermen)
  // Meeting-materiaal is gedeeld per bedrijf (KV adsws:<bedrijf>, platform-loos). Bij platformwissel de
  // workspace herladen zodat Meta en Google ALTIJD exact dezelfde bijlagen/links/notities tonen (geen stale render).
  if(isRichView() && adsRichTab()==='meeting' && window.S27DATA && S27DATA.loadAdsWorkspace){ try{ adsWsState().loaded=false; }catch(e){} }
  if(p==='google') adsGoogleResetLoad(); renderPanel('advertenties'); _adsApplyAccent(); if(isRichView()){ if(adsActivePlatform()==='google') googleRichMountTabCharts(); else adsRichMountTabCharts(); } else adsClientMountChart(); if(typeof syncUrl==='function') syncUrl(); }
// Reset de Google-laadstaat: backoff-timestamps + retry-tellers + een stale FAILURE/error-respons wissen, zodat de
// eerstvolgende render gegarandeerd een verse load probeert (na switch naar Google of de 'Opnieuw proberen'-knop).
// GOEDE data (linked:true met campagnes) blijft staan -> geen onnodige herlaad.
function adsGoogleResetLoad(){
  state._gadsRichAt=0; state._gadsAt=0; state._gadsRichTries=0; state._gadsTries=0;
  ['googleAdsRich','googleAds'].forEach(function(k){ try{ var d=state.data&&state.data[k]; if(d && (d.linked===false || (d.error && !(d.campaigns&&d.campaigns.length)))) state.data[k]=null; }catch(e){} });
}
function adsGoogleRetry(){ adsGoogleResetLoad(); renderPanel('advertenties'); }
function campaignCard(c){
  var pl=adsPlat(c.platform);
  var metrics=[['Besteed',adsEur(c.budget)],['Vertoningen',adsNum(c.impressies)],['Klikken',adsNum(c.klikken)],['CTR',(Number(c.ctr)||0).toLocaleString('nl-BE',{maximumFractionDigits:2})+'%'],['Bereik',adsNum(c.bereik)]];
  return '<div class="card" style="padding:14px 16px;margin-bottom:10px">'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:11px"><span style="font-size:11px;font-weight:700;color:'+pl[1]+';background:'+pl[1]+'14;border-radius:999px;padding:2px 9px">'+esc(pl[0])+'</span><b style="font-family:var(--font-display);font-size:15px;flex:1;min-width:130px">'+esc(c.naam||'Campagne')+'</b>'+(c.objective?'<span class="fs" style="color:var(--ink-4)">'+esc(adsObjective(c.objective))+'</span>':'')+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:10px">'+metrics.map(function(m){return '<div><div style="color:var(--ink-4);font-size:11px;font-weight:600">'+m[0]+'</div><div style="font-family:var(--font-display);font-weight:800;font-size:16px;color:var(--ink)">'+m[1]+'</div></div>';}).join('')+'</div>'
  +'</div>';
}
function panelAdvertenties(){
  const head = '';   // hero/titel "Jouw campagnes die draaien" verwijderd (overbodig, altijd de klant zelf)
  if(state.demoMode){
    return head+`<div class="kpi-grid">
      ${[['orange','Advertentie-uitgaven','€ 2.840'],['blue','Vertoningen','318K'],['green','Klikken','7.412'],['purple','Campagnes','3']].map(k=>`
        <div class="kpi br-${k[0]}"><div class="kbar"></div><div class="klab">${k[1]}</div><div class="knum">${k[2]}</div></div>`).join('')}
    </div>
    <div class="section-head"><h2>Campagnes</h2><span class="count">3</span></div>
    <div class="proj-list">
      ${[['Google Search · Leadgen Q2','blue','€ 1.450 besteed · 12.300 vertoningen · 890 klikken'],['Meta · Retargeting','blue','€ 820 besteed · 64.000 vertoningen · 410 klikken'],['TikTok · Lentepromo','purple','€ 570 besteed · 120.000 vertoningen · 1.300 klikken']].map(c=>`
        <div class="proj-row br-${c[1]}" style="cursor:default"><span class="pr-main"><span class="pr-name" style="font-size:15px">${c[0]}</span><span style="font-size:13px;color:var(--ink-3)">${c[2]}</span></span><span class="pill pill-prog"><span class="pdot"></span>Live</span></div>`).join('')}
    </div>`+adsChatSection();   // demo: ook de contextuele ads-chat tonen (consistent met de social-chat)
  }
  return head+metaAdsBody();
}

/* ---- Meta, live advertenties & creatives (real-time via metaAds, geen Make) ---- */
function metaEnsureStyles(){
  if(document.getElementById('metaCreStyles')) return;
  var s=document.createElement('style'); s.id='metaCreStyles';
  s.textContent=`.live-dot{width:9px;height:9px;border-radius:50%;background:#12AC4E;box-shadow:0 0 0 0 rgba(18,172,78,.5);animation:s27Live 1.8s infinite}
@keyframes s27Live{0%{box-shadow:0 0 0 0 rgba(18,172,78,.45)}70%{box-shadow:0 0 0 8px rgba(18,172,78,0)}100%{box-shadow:0 0 0 0 rgba(18,172,78,0)}}
.meta-cre-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:14px;margin-top:4px}
.meta-cre-card{background:var(--paper,#fff);border:1px solid var(--line,#E7DFD3);border-radius:16px;overflow:hidden;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
.meta-cre-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(35,15,35,.13)}
.meta-cre-t{font-family:var(--font-display);font-weight:700;font-size:13px;padding:10px 12px 0;line-height:1.3}
.meta-cre-m{display:flex;gap:13px;flex-wrap:wrap;padding:8px 12px 12px}
.meta-cre-m .metric{display:flex;flex-direction:column;line-height:1.2}
.meta-cre-m .metric b{font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--ink)}
.meta-cre-m .metric i{font-style:normal;font-size:10px;color:var(--ink-4);font-weight:600;margin-top:1px}
.meta-fmt{position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;color:#fff;border-radius:999px;padding:3px 9px;letter-spacing:.02em;box-shadow:0 2px 6px rgba(0,0,0,.22)}
.meta-fmt.br-purple{background:#9441DB}.meta-fmt.br-blue{background:#3083DC}.meta-fmt.br-green{background:#12AC4E}
.meta-lb{position:fixed;inset:0;z-index:9999;background:rgba(20,8,20,.78);display:none;align-items:center;justify-content:center;padding:24px;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.meta-lb-box{max-width:680px;width:100%;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.42)}
.meta-lb-stage{position:relative;background:#000;display:flex;align-items:center;justify-content:center;min-height:280px}
.meta-lb-col{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%}
.meta-lb-box img.meta-lb-media{width:100%;max-height:74vh;object-fit:contain;display:block;background:#000}
.meta-lb-box video.meta-lb-vid{width:100%;max-height:74vh;display:block;background:#000;outline:none}
.meta-lb-cap{padding:13px 16px;font-family:var(--font-display);font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:12px}
.meta-lb-load{display:flex;flex-direction:column;align-items:center;gap:12px;color:#fff;padding:48px 16px}
.meta-lb-load .brand-spinner{width:40px;height:40px}
.meta-lb-load span{font-family:var(--font-display);font-weight:700;font-size:13px;opacity:.92}
.meta-lb-permalink{display:inline-flex;align-items:center;gap:6px;color:#fff;background:#3083DC;border-radius:999px;padding:8px 16px;font-weight:700;font-size:13px;text-decoration:none;margin:22px auto}
/* laad-gating: spinner blijft OVER het beeld tot het echt geladen is (geen zwart kader), + nette fout-fallback */
.meta-lb-stage .meta-lb-load.spin,.meta-car-slide .meta-lb-load.spin{position:absolute;inset:0;justify-content:center;padding:0;z-index:2}
.meta-lb-stage:not(.is-loading) .meta-lb-load.spin,.meta-car-slide:not(.is-loading) .meta-lb-load.spin{display:none}
.meta-lb-stage.is-loading img.meta-lb-media,.meta-car-slide.is-loading img{opacity:0}
.meta-lb-box img.meta-lb-media,.meta-car-slide img{transition:opacity .22s ease}
.meta-lb-err{position:absolute;inset:0;justify-content:center;padding:0;z-index:3;background:#000}
/* Carrousel met klik-doorklik (pijlen + dots), per kaart in correcte verhouding */
.meta-car{position:relative;background:#000;overflow:hidden}
.meta-car-track{display:flex;transition:transform .32s cubic-bezier(.4,0,.2,1);touch-action:pan-y}
.meta-car-slide{flex:0 0 100%;position:relative;display:flex;align-items:center;justify-content:center;min-height:280px}
.meta-car-slide img{width:100%;max-height:72vh;object-fit:contain;display:block;background:#000}
.meta-car-slide video{width:100%;max-height:72vh;display:block;background:#000;outline:none}
.meta-car-t{position:absolute;left:0;right:0;bottom:0;padding:14px;color:#fff;font-size:13px;font-weight:600;background:linear-gradient(transparent,rgba(0,0,0,.72));pointer-events:none}
.meta-car-n{position:absolute;top:10px;right:12px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:800;border-radius:999px;padding:3px 10px;z-index:3}
.meta-car-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:42px;height:42px;border-radius:50%;border:none;background:rgba(0,0,0,.5);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s ease}
.meta-car-nav:hover{background:rgba(0,0,0,.78)}
.meta-car-nav[disabled]{opacity:.32;cursor:default}
.meta-car-nav.prev{left:12px}.meta-car-nav.next{right:12px}
.meta-car-dots{position:absolute;left:0;right:0;bottom:8px;display:flex;gap:7px;justify-content:center;z-index:3}
.meta-car-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.42);border:none;padding:0;cursor:pointer;transition:background .15s ease,transform .15s ease}
.meta-car-dot.on{background:#fff;transform:scale(1.25)}
@media(max-width:560px){.meta-cre-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}.meta-car-nav{width:36px;height:36px}}`;
  document.head.appendChild(s);
}
function metaPeriodLabel(p){ return ({today:'Vandaag',last_7d:'7 dagen',last_30d:'30 dagen'})[p]||p; }
// Taak 5: gebruik een NIET-AFBREKENDE spatie ( ) tussen € en het bedrag zodat de waarde op één regel blijft
// (KPI-grids, per-campagne-KPI's én tabelcellen) en € nooit los op een vorige regel komt.
function metaEur(n,cur){ var s=(Number(n)||0).toLocaleString('nl-BE',{minimumFractionDigits:2,maximumFractionDigits:2}); cur=cur||'EUR'; return cur==='EUR'?('€ '+s):(s+' '+cur); }
function metaKpiCard(br,lab,val){ return '<div class="kpi br-'+br+'"><div class="kbar"></div><div class="klab">'+lab+'</div><div class="knum">'+val+'</div></div>'; }
function adsKpiDelta(cur,prev,invert){ if(prev==null) return ''; cur=Number(cur)||0; prev=Number(prev)||0; if(!prev){ return cur>0?'<span class="kdelta up">nieuw</span>':''; } var pct=Math.round(((cur-prev)/prev)*1000)/10; var better=invert?pct<0:pct>0; var flat=Math.abs(pct)<0.05; var cls=flat?'flat':(better?'up':'down'); return '<span class="kdelta '+cls+'"'+(flat?' title="gelijk gebleven"':'')+'>'+(flat?'gelijk gebleven':((pct>0?'+':'')+pct+'%'))+'</span>'; }
function adsKpiCard(br,lab,val,d){ return '<div class="kpi br-'+br+'"><div class="kbar"></div><div class="klab">'+lab+'</div><div class="knum">'+val+'</div>'+(d?'<div class="kdrow">'+d+'</div>':'')+'</div>'; }
function metaFmt(f){ return ({video:['Video','purple'],carousel:['Carrousel','blue'],image:['Foto','green']})[f]||['Foto','green']; }
/* ---- Ads periode-selector (custom range) + rolling vergelijking (spiegelt socials) ---- */
function _adsYmd(d){ var p=function(n){return (n<10?'0':'')+n;}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function adsPeriodWindow(preset){
  var now=new Date();
  if(preset==='today'){ var t=_adsYmd(now); return { from:t, to:t }; }   // bewuste 'vandaag'-keuze blijft vandaag
  // Afgelopen-N-dagen (punt Arne): de LOPENDE dag nooit meetellen — die is nog onvolledig en vertekent
  // het beeld. Venster eindigt dus op GISTEREN, net zoals Meta/Google/TikTok zelf rapporteren. Geldt voor
  // zowel de client- als de teamweergave.
  var endMs=now.getTime()-86400000;
  var end=new Date(endMs), from;
  if(preset==='7d') from=new Date(endMs-6*86400000);
  else if(preset==='30d') from=new Date(endMs-29*86400000);
  else if(preset==='90d') from=new Date(endMs-89*86400000);
  else return null;
  return { from:_adsYmd(from), to:_adsYmd(end) };
}
function adsPeriod(){ if(!state._adsPeriod){ var def=isRichView()?'30d':'7d'; var w=adsPeriodWindow(def); state._adsPeriod={preset:def,compare:'none',from:w.from,to:w.to}; } return state._adsPeriod; }
function _adsRefreshIc(){ return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>'; }
// item 4: één uitklapbare "Periode"-knop i.p.v. 5 losse tijdblokken; presets + custom + vergelijking
// zitten in de popover. De buitenste class blijft .soc-period (sticky-regels + _adsRerenderPeriodBar).
function adsPeriodBar(){
  _adsInstallMenuCloser();
  var pp=adsPeriod();
  var open=!!state._adsPerOpen;
  var presets=[['today','Vandaag'],['7d','7 dagen'],['30d','30 dagen'],['90d','90 dagen'],['custom','Aangepast']];
  var comps=[['none','Geen vergelijking'],['previous','Vorige periode'],['month','Vorige maand'],['year','Vorig jaar']];
  var chips=presets.map(function(o){ return '<button class="soc-perchip'+(pp.preset===o[0]?' active':'')+'" onclick="adsSetPeriod(\''+o[0]+'\')">'+esc(o[1])+'</button>'; }).join('');
  var custom = pp.preset==='custom' ? adsCalBlock() : '';
  var comp=comps.map(function(o){ return '<button class="soc-perchip'+(pp.compare===o[0]?' active':'')+'" onclick="adsSetCompare(\''+o[0]+'\')">'+esc(o[1])+'</button>'; }).join('');
  return '<div class="soc-period ads-perwrap">'
    +'<button class="ads-perbtn'+(open?' open':'')+'" onclick="adsPeriodToggle()" aria-expanded="'+(open?'true':'false')+'">'+ic('cal',15)+'<span class="ads-perbtn-tx">'+esc(_adsPeriodSummary(pp))+'</span>'+_adsChevDown()+'</button>'
    +'<div class="ads-perpop'+(open?' open':'')+'" id="adsPerPop">'
      +'<div class="ads-perpop-sec"><div class="ads-perpop-lab">Periode</div><div class="soc-perchips">'+chips+'</div>'+custom+'</div>'
      +'<div class="ads-perpop-sec"><div class="ads-perpop-lab">Vergelijken met</div><div class="soc-perchips ads-perpop-cmp">'+comp+'</div></div>'
      +'<div class="ads-perpop-foot"><button class="seg-btn" onclick="adsReload()" title="Verversen">'+_adsRefreshIc()+' Verversen</button><button class="btn btn-primary btn-sm" onclick="adsPeriodToggle()">Klaar</button></div>'
    +'</div></div>';
}
function _adsChevDown(){ return '<svg class="ads-perchev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; }
function _adsPeriodLabel(preset){ return ({today:'Vandaag','7d':'Laatste 7 dagen','30d':'Laatste 30 dagen','90d':'Laatste 90 dagen',custom:'Aangepaste periode'})[preset]||preset; }
function _adsCompareLabel(c){ return ({none:'',previous:'vorige periode',month:'vorige maand',year:'vorig jaar'})[c]||''; }
function _adsDateShort(s){ var p=String(s||'').split('-'); return p.length===3?(p[2]+'/'+p[1]):s; }
function _adsPeriodSummary(pp){
  var base=(pp.preset==='custom' && pp.from && pp.to) ? (_adsDateShort(pp.from)+' - '+_adsDateShort(pp.to)) : _adsPeriodLabel(pp.preset);
  var cl=_adsCompareLabel(pp.compare);
  return base+(cl?' · vs '+cl:'');
}
// item 1: eigen huisstijl-kalender (range-selectie) i.p.v. de native datumkiezer-popup.
function _adsDateNice(ymd){ var p=String(ymd||'').split('-'); if(p.length<3) return ymd||''; var mn=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']; return (+p[2])+' '+mn[(+p[1])-1]+' '+p[0]; }
function adsCalBlock(){
  var pp=adsPeriod();
  var sel='<div class="ads-cal-sel"><span class="'+(pp.from?'on':'')+'">'+(pp.from?_adsDateNice(pp.from):'startdatum')+'</span><span class="ads-cal-arrow">→</span><span class="'+(pp.to?'on':'')+'">'+(pp.to?_adsDateNice(pp.to):'einddatum')+'</span></div>';
  return '<div class="ads-cal-block">'+sel+adsCalHtml()+'</div>';
}
function _adsCalState(){ if(!state._adsCal){ var pp=adsPeriod(); var base=(pp.to||pp.from||_adsYmd(new Date())); state._adsCal={ym:String(base).slice(0,7)}; } return state._adsCal; }
function adsCalNav(d){ var c=_adsCalState(); var p=c.ym.split('-'); var dt=new Date(+p[0],(+p[1]-1)+d,1); c.ym=_adsYmd(dt).slice(0,7); var el=document.getElementById('adsCalWrap'); if(el) el.outerHTML=adsCalHtml(); }
function _adsCalMax(){ return _adsYmd(new Date()); }   // geen toekomst: advertentiedata bestaat enkel t/m vandaag
function adsCalPick(ymd){
  if(ymd>_adsCalMax()) return;                          // toekomstige dag → negeren (geen lege/scheve data)
  var pp=adsPeriod(); pp.preset='custom';
  if(!pp.from || (pp.from && pp.to)){ pp.from=ymd; pp.to=''; }          // nieuwe selectie starten
  else if(ymd < pp.from){ pp.to=pp.from; pp.from=ymd; }                  // omgekeerd → wisselen
  else { pp.to=ymd; }
  var blk=document.querySelector('.ads-cal-block'); if(blk) blk.outerHTML=adsCalBlock();
  var b=document.querySelector('.ads-perwrap .ads-perbtn-tx'); if(b) b.textContent=_adsPeriodSummary(pp);
  if(pp.from && pp.to) adsReload();
}
function adsCalHtml(){
  var c=_adsCalState(); var pp=adsPeriod();
  var p=c.ym.split('-'); var y=+p[0], m=+p[1];
  var startDow=(new Date(y,m-1,1).getDay()+6)%7;                          // maandag = 0
  var dim=new Date(y,m,0).getDate();
  var mn=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  var today=_adsYmd(new Date());
  var maxYmd=_adsCalMax();
  var atMaxMonth=(c.ym>=maxYmd.slice(0,7));   // huidige maand bereikt → '›' uitschakelen
  var head='<div class="ads-cal-head"><button type="button" class="ads-cal-nav" onclick="adsCalNav(-1)" aria-label="Vorige maand">‹</button><span>'+mn[m-1]+' '+y+'</span><button type="button" class="ads-cal-nav"'+(atMaxMonth?' disabled':'')+' onclick="adsCalNav(1)" aria-label="Volgende maand">›</button></div>';
  var dows=['M','D','W','D','V','Z','Z'].map(function(x){return '<span class="ads-cal-dow">'+x+'</span>';}).join('');
  var cells=''; var i;
  for(i=0;i<startDow;i++) cells+='<span class="ads-cal-day empty"></span>';
  for(var d=1;d<=dim;d++){
    var ymd=y+'-'+(m<10?'0':'')+m+'-'+(d<10?'0':'')+d;
    var cls='ads-cal-day';
    var future=ymd>maxYmd;
    if(future){ cells+='<span class="ads-cal-day disabled">'+d+'</span>'; continue; }   // toekomst: niet kiesbaar
    if(ymd===pp.from) cls+=' sel start';
    if(ymd===pp.to) cls+=' sel end';
    if(pp.from && pp.to && ymd>pp.from && ymd<pp.to) cls+=' inrange';
    if(ymd===today) cls+=' today';
    cells+='<button type="button" class="'+cls+'" onclick="adsCalPick(\''+ymd+'\')">'+d+'</button>';
  }
  return '<div class="ads-cal" id="adsCalWrap">'+head+'<div class="ads-cal-grid">'+dows+cells+'</div></div>';
}
function adsPeriodToggle(){
  state._adsPerOpen=!state._adsPerOpen;
  var pop=document.getElementById('adsPerPop'); if(pop) pop.classList.toggle('open',state._adsPerOpen);
  var wrap=pop?pop.parentNode:null; var btn=wrap?wrap.querySelector('.ads-perbtn'):null;
  if(btn){ btn.classList.toggle('open',state._adsPerOpen); btn.setAttribute('aria-expanded',state._adsPerOpen?'true':'false'); }
}
// gedeelde "klik buiten" sluiter voor de periode-popover + platform-dropdown (één keer geïnstalleerd)
function _adsInstallMenuCloser(){
  if(state._adsMenuCloser) return; state._adsMenuCloser=true;
  document.addEventListener('click',function(e){
    if(state._adsPerOpen){ var w=document.querySelector('.ads-perwrap'); if(w && !w.contains(e.target)){ state._adsPerOpen=false; var pop=document.getElementById('adsPerPop'); if(pop) pop.classList.remove('open'); var b=w.querySelector('.ads-perbtn'); if(b){ b.classList.remove('open'); b.setAttribute('aria-expanded','false'); } } }
    if(state._adsPlatMenuOpen){ var pw=document.querySelector('.ads-platpick'); if(pw && !pw.contains(e.target)){ state._adsPlatMenuOpen=false; var m=document.getElementById('adsPlatMenu'); if(m) m.classList.remove('open'); pw.classList.remove('open'); } }
  },true);
}
function _adsRerenderPeriodBar(){ var bar=document.querySelector('.panel[data-screen-label="advertenties"] .soc-period'); if(bar) bar.outerHTML=adsPeriodBar(); }
function adsReload(){
  var box=document.getElementById('adsBody'); if(box) box.innerHTML='<div class="empty" style="padding:50px"><div class="brand-spinner" style="margin:0 auto 10px"></div><p>'+(isRichView()?'De uitgebreide rapportage wordt opgehaald…':'Advertentiedata wordt opgehaald…')+'</p></div>';
  var pp=adsPeriod();
  if(isRichView()){
    if(adsActivePlatform()==='google'){
      if(state.demoMode || !(window.S27DATA&&S27DATA.loadGoogleAdsRich)){ if(box) box.innerHTML=googleRichTabBody(); return; }
      S27DATA.loadGoogleAdsRich({from:pp.from,to:pp.to,compare:pp.compare}).then(function(){ var b=document.getElementById('adsBody'); if(b){ b.innerHTML=googleRichTabBody(); googleRichMountTabCharts(); } }).catch(function(){ var b=document.getElementById('adsBody'); if(b) b.innerHTML=googleRichTabBody(); });
      return;
    }
    if(state.demoMode || !(window.S27DATA&&S27DATA.loadMetaAdsRich)){ if(box) box.innerHTML=adsRichTabBody(); return; }
    S27DATA.loadMetaAdsRich({from:pp.from,to:pp.to,compare:pp.compare}).then(function(){ var b=document.getElementById('adsBody'); if(b){ b.innerHTML=adsRichTabBody(); adsRichMountTabCharts(); } }).catch(function(){ var b=document.getElementById('adsBody'); if(b) b.innerHTML=adsRichTabBody(); });
    return;
  }
  if(adsActivePlatform()==='google'){
    if(state.demoMode || !(window.S27DATA&&S27DATA.loadGoogleAds)){ var bg=document.getElementById('adsBody'); if(bg){ bg.innerHTML=googleOverviewInner(); adsClientMountChart(); } return; }
    S27DATA.loadGoogleAds({from:pp.from,to:pp.to,compare:pp.compare}).then(function(){ var b=document.getElementById('adsBody'); if(b){ b.innerHTML=googleOverviewInner(); adsClientMountChart(); } }).catch(function(){ var b=document.getElementById('adsBody'); if(b){ b.innerHTML=googleOverviewInner(); adsClientMountChart(); } });
    return;
  }
  if(state.demoMode || !(window.S27DATA&&S27DATA.loadMetaAds)){ var b0=document.getElementById('adsBody'); if(b0){ b0.innerHTML=adsOverviewInner(); adsClientMountChart(); } return; }
  S27DATA.loadMetaAds({from:pp.from,to:pp.to,compare:pp.compare}).then(function(){ var b=document.getElementById('adsBody'); if(b){ b.innerHTML=adsOverviewInner(); adsClientMountChart(); } }).catch(function(){ var b=document.getElementById('adsBody'); if(b){ b.innerHTML=adsOverviewInner(); adsClientMountChart(); } });
}
function adsSetPeriod(preset){ var pp=adsPeriod(); pp.preset=preset; if(preset!=='custom'){ var w=adsPeriodWindow(preset); if(w){ pp.from=w.from; pp.to=w.to; } } else { state._adsCal=null; } _adsRerenderPeriodBar(); if(preset!=='custom') adsReload(); if(typeof syncUrl==='function') syncUrl(); }
function adsCustomPeriod(){ var f=document.getElementById('adsFrom'),t=document.getElementById('adsTo'); if(!f||!t||!f.value||!t.value) return; var pp=adsPeriod(); pp.from=f.value; pp.to=t.value; _adsRerenderPeriodBar(); adsReload(); }
function adsSetCompare(mode){ var pp=adsPeriod(); pp.compare=mode; _adsRerenderPeriodBar(); adsReload(); if(typeof syncUrl==='function') syncUrl(); }
function refreshMetaAds(){ adsReload(); }
function metaCreativeCard(a,i,cur){
  var fm=metaFmt(a.format); var cm=a.creativeMedia||{};
  // lichte preview-bron eerst (cr.thumbnail_url / url_128) i.p.v. een full-res still -> grid laadt snel
  var thumb=a.thumb||cm.thumb||(a.format==='video'?(a.poster||a.image):(cm.image||a.image))||'';
  var img = thumb
    ? '<img src="'+esc(thumb)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="196" height="142" style="width:100%;height:142px;object-fit:cover;display:block;background:#f1ebe2">'
    : '<div style="width:100%;height:142px;display:flex;align-items:center;justify-content:center;background:#f1ebe2;color:var(--ink-4);font-size:12px;font-weight:600">geen voorbeeld</div>';
  var badge='<span class="meta-fmt br-'+fm[1]+'">'+(a.format==='video'?ic('play',11):'')+esc(fm[0])+'</span>';
  var mtr='<div class="meta-cre-m"><span class="metric"><b>'+metaEur(a.spend,cur)+'</b><i>besteed</i></span><span class="metric"><b>'+adsNum(a.impressions)+'</b><i>vertoningen</i></span><span class="metric"><b>'+(Number(a.ctr)||0).toLocaleString('nl-BE',{maximumFractionDigits:2})+'%</b><i>CTR</i></span></div>';
  return '<div class="meta-cre-card" onclick="openMetaCreative('+i+')" onmouseenter="metaPreloadCreative('+i+')"><div style="position:relative">'+img+badge+'</div><div class="meta-cre-t">'+esc(a.name||'Advertentie')+'</div>'+mtr+'</div>';
}
function metaCampaignCard(c,cur){
  var obj=adsObjective(c.objective);
  var ms=[['Besteed',metaEur(c.spend,cur),'spend'],['Vertoningen',adsNum(c.impressions),'impressions'],['Klikken',adsNum(c.linkClicks||c.clicks),'linkClicks'],['CPC',metaEur(c.cpc,cur),'cpc'],['CTR',(Number(c.ctr)||0).toLocaleString('nl-BE',{maximumFractionDigits:2})+'%','ctr'],['Resultaten',adsNum(c.results),'results']];
  var chev='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--ink-4);flex:none"><path d="M9 6l6 6-6 6"/></svg>';
  // item 9: klik klapt de advertenties/visuals INLINE open onder de kaart (geen aparte pagina meer).
  return '<div class="card meta-camp-card" onclick="toggleMetaCampaign(\''+esc(c.id)+'\')" style="padding:14px 16px;margin-bottom:10px;cursor:pointer"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:11px"><span class="pill pill-prog"><span class="pdot"></span>Live</span><b style="font-family:var(--font-display);font-size:15px;flex:1;min-width:130px">'+esc(c.name||'Campagne')+'</b>'+(obj?'<span class="fs" style="color:var(--ink-4)">'+esc(obj)+'</span>':'')+chev+'</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:10px">'+ms.map(function(m){var d=arRowDelta(c,m[2],cur);return '<div><div style="color:var(--ink-4);font-size:11px;font-weight:600">'+m[0]+'</div><div style="font-family:var(--font-display);font-weight:800;font-size:16px;color:var(--ink)">'+m[1]+'</div>'+(d?'<div class="ar-ckd">'+d+'</div>':'')+'</div>';}).join('')+'</div></div><div class="meta-camp-exp" id="metaCampExp_'+esc(c.id)+'" style="display:none"></div>';
}
// item 9: inline campagne-expand (vervangt de paginavervanging van openMetaCampaign).
function toggleMetaCampaign(id){
  id=String(id); var exp=document.getElementById('metaCampExp_'+id); if(!exp) return;
  var card=exp.previousElementSibling;
  if(exp.getAttribute('data-open')==='1'){ exp.style.display='none'; exp.innerHTML=''; exp.removeAttribute('data-open'); if(card) card.classList.remove('open'); state._metaCampOpen=''; if(typeof syncUrl==='function') syncUrl(); return; }
  // slechts één campagne tegelijk open (state._metaAdsView is globaal en wordt door de open expand gebruikt)
  var open=document.querySelectorAll('.meta-camp-exp[data-open="1"]');
  for(var k=0;k<open.length;k++){ open[k].style.display='none'; open[k].innerHTML=''; open[k].removeAttribute('data-open'); var pc=open[k].previousElementSibling; if(pc) pc.classList.remove('open'); }
  if(card) card.classList.add('open'); exp.style.display='block'; exp.setAttribute('data-open','1');
  _metaCampExpRender(id);
  state._metaCampOpen=id; if(typeof syncUrl==='function') syncUrl(true);
}
function _metaCampExpRender(id){
  var exp=document.getElementById('metaCampExp_'+id); if(!exp||exp.getAttribute('data-open')!=='1') return;
  var cur=((window.S27DATA&&S27DATA.metaAds&&S27DATA.metaAds())||{}).currency||'EUR';
  var loaded=(window.S27DATA&&S27DATA.campaignAds)?S27DATA.campaignAds(id):undefined;
  if(loaded===undefined){
    exp.innerHTML='<div class="empty" style="padding:30px"><div class="brand-spinner" style="margin:0 auto 10px"></div><p>De advertenties en visuals worden opgehaald…</p></div>';
    if(window.S27DATA&&S27DATA.loadCampaignAds){ S27DATA.loadCampaignAds(id).then(function(){ _metaCampExpRender(id); }).catch(function(){ var e2=document.getElementById('metaCampExp_'+id); if(e2) e2.innerHTML='<div class="card" style="padding:18px;text-align:center;color:var(--ink-3)">De advertenties konden niet geladen worden.</div>'; }); }
    return;
  }
  var ads=loaded.slice().sort(function(a,b){return (b.spend||0)-(a.spend||0);});
  state._metaAdsView=ads;   // globaal, daarom max. 1 expand open
  exp.innerHTML='<div class="meta-camp-exp-in"><div class="section-head" style="margin-top:8px"><h2>Advertenties &amp; visuals</h2><span class="count">'+ads.length+'</span></div>'+(ads.length?('<div class="ads-adtable"><div class="ads-adhead"><span>Advertentie</span><span>Besteed</span><span>Klikken</span><span>CTR</span><span>CPC</span><span></span></div>'+ads.map(function(a,i){return metaAdRow(a,i,cur);}).join('')+'</div>'):'<div class="card" style="padding:18px;text-align:center;color:var(--ink-3)">Geen actieve advertenties in deze campagne.</div>')+'</div>';
}
/* ---- Multi-series toggle-trend: besteding/klikken/vertoningen per dag, aan/uit te klikken ---- */
var ADS_TREND_META={ spend:['Besteding','#F66131'], clicks:['Klikken','#12AC4E'], impressions:['Vertoningen','#3083DC'] };
function adsTrendOn(){ if(!state._adsTrendOn) state._adsTrendOn={spend:true,clicks:true,impressions:false}; return state._adsTrendOn; }
function adsToggleTrend(metric){ var on=adsTrendOn(); on[metric]=!on[metric]; var box=document.getElementById('adsTrendBox'); if(box) box.outerHTML=adsTrendBlock(); }
function adsTrendSVG(tr, on){
  var W=720,H=170,padL=6,padR=6,padT=12,padB=8,n=tr.length;
  var X=function(i){ return padL+(i*(W-padL-padR)/(n-1)); };
  var series=['spend','clicks','impressions'].filter(function(k){return on[k];});
  if(!series.length) return '<div class="ads-tempty">Selecteer minstens één reeks om de evolutie te zien.</div>';
  var paths=series.map(function(k){
    var vals=tr.map(function(d){return Number(d[k])||0;});
    var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals); if(mx===mn) mx=mn+1;
    var Y=function(v){ return H-padB-((v-mn)*(H-padT-padB)/(mx-mn)); };
    var line=''; vals.forEach(function(v,i){ line+=(i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1)+' '; });
    return '<path d="'+line.trim()+'" fill="none" stroke="'+ADS_TREND_META[k][1]+'" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
  }).join('');
  var lab=function(ymd){ var p=String(ymd).split('-'); return p.length===3?(p[2]+'/'+p[1]):ymd; };
  return '<svg class="ads-tsvg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg><div class="ads-txlab"><span>'+esc(lab(tr[0].date))+'</span><span>'+esc(lab(tr[n-1].date))+'</span></div>';
}
function adsTrendBlock(){
  var m=(window.S27DATA&&S27DATA.metaAds&&S27DATA.metaAds())||{}; var tr=m.trend||[]; var cur=m.currency||'EUR'; var on=adsTrendOn();
  var chips=['spend','clicks','impressions'].map(function(x){ var mm=ADS_TREND_META[x]; var tot=tr.reduce(function(a,d){return a+(Number(d[x])||0);},0); var tl=x==='spend'?metaEur(tot,cur):adsNum(tot); return '<button class="ads-tchip'+(on[x]?' on':'')+'" onclick="adsToggleTrend(\''+x+'\')" style="--tc:'+mm[1]+'"><span class="ads-tdot"></span>'+esc(mm[0])+' <b>'+tl+'</b></button>'; }).join('');
  var svg=(tr.length<2)?'<div class="ads-tempty">Nog te weinig data voor een trend in deze periode.</div>':adsTrendSVG(tr,on);
  return '<div class="card ads-trend" id="adsTrendBox" style="padding:15px 18px 12px"><div class="ads-thead"><h3>Evolutie per dag</h3><div class="ads-tchips">'+chips+'</div></div>'+svg+'</div>';
}
// Client-view ads-chrome: ÉÉN doorlopende menubalk (zoals team), links de Meta/Google-switcher, rechts periode + chat.
// Vervangt de oude losse 'Live overzicht'-kop + zwevende switcher + aparte periodebalk (die over elkaar vielen).
function adsClientChrome(){
  return '<div class="ads-stickytop"><div class="soc-subnav-row">'+adsPlatformPicker()
    +'<div class="soc-subnav-act">'+adsPeriodBar()+adsClientChatBtn()+'</div></div></div>';
}
function adsClientChatBtn(){
  var ad=_adProject(); if(!ad) return '';   // enkel een chat-knop als er een advertentietaak van deze maand is
  return '<button class="soc-subnav-act-btn" onclick="adsClientChatOpen()" title="Chat over je advertenties. Je bericht komt als opmerking op je advertentietaak.">'+ic('msg',16)+'<span>Chat</span></button>';
}
function adsClientChatOpen(){ var el=document.querySelector('.ads-chat'); if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); setTimeout(function(){ var ta=el.querySelector('textarea,[contenteditable],.chat-input'); try{ ta&&ta.focus(); }catch(e){} },380); } }
function metaAdsBody(){
  if(isRichView()) return metaAdsBodyRich();   // team-weergave: uitgebreide Meta-rapportage
  metaEnsureStyles();
  var chrome=adsClientChrome();
  // Google-tak: eigen beknopte real-time weergave (zelfde menubalk, geen creatives). Meta-flow blijft ongewijzigd.
  if(adsActivePlatform()==='google'){ return chrome+googleAdsBody()+adsChatSection(); }
  var m=(window.S27DATA&&S27DATA.metaAds&&S27DATA.metaAds())||null;
  if(m===null){ return chrome+'<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Je advertenties worden real-time opgehaald…</p></div>'; }
  if(!m.linked){ return chrome+statNotLinked('ads'); }
  state._metaCampaign=null;   // item 9: campagnes openen nu INLINE (toggleMetaCampaign), geen paginavervanging meer
  return chrome+'<div id="adsBody">'+adsOverviewInner()+'</div>'+adsChatSection();
}
// Ads-chat: enkel zichtbaar als er een advertentietaak van de HUIDIGE MAAND bestaat (worker filtert
// ad-taken al op due-date deze maand). Berichten/uploads gaan als comments naar die taak.
function adsChatSection(){
  var ad=_adProject(); if(!ad) return '';
  return '<div class="ads-chat"><div class="section-head" style="margin-top:24px"><h2 style="display:flex;align-items:center;gap:8px">'+ic('msg',18)+' Chat over je advertenties</h2></div>'
    +'<p class="sdesc" style="margin:-2px 0 12px;max-width:64ch">Stel je vraag over <b>'+esc(ad.name||'je advertentieproject')+'</b> of upload foto’s/video’s die we kunnen gebruiken voor je advertenties. Je bericht komt rechtstreeks bij je Studio 27-team terecht.</p>'
    +'<div class="card ads-chatcard"><div id="adsChatBody">'+chatHTML(ad.id)+'</div></div></div>';
}
function adsChatMount(){
  var ad=_adProject();
  if(!ad || !document.getElementById('chatList')) return;   // geen ads-taak of geen chat in beeld (bv. campagne-detail)
  state.activeProject=ad.id;
  if(window.S27DATA && S27DATA.loadChat && !((state.data.chats||{})[ad.id])){
    S27DATA.loadChat(ad.id).then(function(){ var h=document.getElementById('adsChatBody'); if(h && state.activeProject===ad.id) h.innerHTML=chatHTML(ad.id); }).catch(function(){});
  }
  if(typeof startChatPoll==='function') startChatPoll(ad.id);
}
function renderAds(){ renderPanel('advertenties'); if(typeof adsChatMount==='function') adsChatMount(); if(isRichView()) adsRichMountTabCharts(); else adsClientMountChart(); }
// Deferred mount: de inner-HTML wordt synchroon via renderPanel() in de DOM gezet; de canvas bestaat dus
// pas na deze tick. Eén keer per render plannen (idempotent, adsBuildSelChart vernietigt de oude chart).
function _adsDeferClientMount(){ if(isRichView()) return; var fn=function(){ adsClientMountChart(); }; if(window.requestAnimationFrame) requestAnimationFrame(fn); else setTimeout(fn,0); }
// #17: client-overzicht-grafiek monteren (zelfde Chart.js dag-grafiek als de team-Samengevat).
function adsClientMountChart(){
  _adsApplyAccent();
  if(isRichView()) return;
  var goog=adsActivePlatform()==='google';
  var canvasId=goog?'garch_account':'arch_account';
  if(!document.getElementById(canvasId)) return;
  adsRichLoadChart().then(function(ok){ if(!ok||!window.Chart) return;
    if(goog){ var g=(window.S27DATA&&S27DATA.googleAds)?S27DATA.googleAds():null; if(g) googleClientBuildChart(g,g.currency||'EUR'); }
    else { var m=(window.S27DATA&&S27DATA.metaAds)?S27DATA.metaAds():null; if(m) adsClientBuildChart(m,m.currency||'EUR'); }
  });
}

/* =============================================================================
   ADMIN, uitgebreide Meta-rapportage (team-weergave). Enkel zichtbaar voor
   @studio27.be-medewerkers (state.adminMode). Data via de gateway (metaAdsRich,
   is_staff-gated). Gebaseerd op Arne's MASTERPROMPT: 8+ KPI's met vergelijking,
   per-campagne dag-evolutie (Chart.js), sorteerbare adset- + ad-tabellen
   (gelijke-naam-merge ★), status-pills en optimalisatie-aanbevelingen.
   ============================================================================= */
function metaAdsBodyRich(){
  metaEnsureStyles();
  var body=(adsActivePlatform()==='google')?googleAdsBodyRich():(adsRichChrome(adsRichSubnav())+'<div id="adsBody">'+adsRichTabBody()+'</div>'+adsRichPdfFooter());
  return body+adsNotepadMount();
}
// menubalk (tabs + rechts de periode-knop & notities) bovenaan + platform-keuze-rij er net onder; samen gepind onder de topbar.
function adsRichChrome(subnavHtml){ return '<div class="ads-stickytop">'+subnavHtml+adsControlsRow()+'</div>'; }
// rij onder de menubalk: enkel de Meta/Google-schakelaar (met wat padding). De periode-knop staat nu rechtsboven in de menubalk.
function adsControlsRow(){ return '<div class="ads-ctrlrow">'+adsPlatformPicker()+'</div>'; }
/* ---- ads-menubalk (team-weergave): Samengevat / Campagnes / Uitgebreide gegevens / Aanbevelingen ---- */
function adsRichTab(){ return state._adsTab||'samengevat'; }
function adsRichSubnav(){
  var t=adsRichTab();
  var tabs=[['samengevat','Samengevat','st_progress'],['campagnes','Campagnes','cal'],['aanbevelingen','Aanbevelingen','msg']];   // 'Uitgebreide gegevens' verwijderd (Vincent), niet meer beschikbaar voor Meta
  if(isRichView()) tabs.push(['meeting','Meeting','img']);
  var tabsHtml=tabs.map(function(x){ return '<button class="soc-subtab'+(t===x[0]?' active':'')+'" data-atab="'+x[0]+'" onclick="adsRichSetTab(\''+x[0]+'\')">'+ic(x[2],17)+'<span>'+esc(x[1])+'</span></button>'; }).join('');
  // rechts op de menubalk-rij: notitie-knop + periode-keuze (rechtsboven). Platform-keuze staat in de rij eronder.
  return '<div class="soc-subnav-row"><div class="soc-subnav" id="adsSubnav">'+tabsHtml+'</div><div class="soc-subnav-act">'+adsNoteBtn()+adsPeriodBar()+'</div></div>';
}
// item 6: notitie-toggle als knop in de menubalk (i.p.v. de zwevende FAB rechtsonder)
function adsNoteBtn(){ if(!isRichView()) return ''; var n=adsNoteState(); return '<button id="adsNoteBtn" class="soc-subnav-act-btn'+(n.open?' on':'')+'" onclick="adsNotepadToggle()" title="Meeting-kladblok">'+ic('msg',16)+'<span>Notities</span></button>'; }
function adsRichSetTab(name){
  state._adsTab=name;
  var goog=isRichView()&&adsActivePlatform()==='google';
  var box=document.getElementById('adsBody');
  if(box){ box.innerHTML=goog?googleRichTabBody():adsRichTabBody();
    var nav=document.getElementById('adsSubnav'); if(nav){ [].slice.call(nav.children).forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-atab')===name); }); }
    if(goog) googleRichMountTabCharts(); else adsRichMountTabCharts();
    if(window.scrollTo) window.scrollTo({top:0,behavior:'smooth'});
  } else { renderPanel('advertenties'); }
  if(typeof syncUrl==='function') syncUrl();
}
function adsRichTabBody(){
  var m=(window.S27DATA&&S27DATA.metaAdsRich&&S27DATA.metaAdsRich());
  if(m===undefined||m===null) return '<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>De uitgebreide rapportage wordt opgehaald…</p></div>';
  if(!m.linked) return adsRichNotLinked();
  if(m.error && !(m.campaigns&&m.campaigns.length) && !(m.kpis&&m.kpis.spend)) return '<div class="card" style="padding:26px;text-align:center;color:var(--ink-3)">De Meta-data kon even niet opgehaald worden. Klik op verversen om opnieuw te proberen.</div>';
  var cur=m.currency||'EUR', t=adsRichTab();
  if(t==='meeting') return adsWsMeetingTab();
  if(t==='campagnes') return adsRichCampagnesTab(m,cur);
  if(t==='aanbevelingen') return adsRichOptim(m.campaigns||[],cur);
  return adsRichSamengevatTab(m,cur);
}
function adsRichSamengevatTab(m,cur){
  var camps=(m.campaigns||[]);
  var hasDaily=camps.some(function(c){return (c.daily||[]).length>1;});
  return adsRichKpiGrid(m.kpis||{}, m.prevKpis||null, cur, m.compareLabel)
    +'<div class="ar-camp" style="margin-top:14px"><div class="ar-camp-head"><span class="ar-camp-nm">Account-overzicht per dag</span></div>'
    +(hasDaily?'<div class="ar-chartwrap"><canvas id="arch_account"></canvas></div>':'<div class="sr-chempty">Nog te weinig dagen met data om een grafiek te tonen in deze periode.</div>')+'</div>';
}
function adsRichCampagnesTab(m,cur){
  var camps=(m.campaigns||[]);
  if(!camps.length) return '<div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Geen campagnes met activiteit in deze periode.</div>';
  // snel-vergelijken: alles in 1 klik dicht/open klappen (enkel de kern-KPI's per campagne)
  var bar=(camps.length>1)?'<div class="ar-camp-bar"><button type="button" class="ar-camp-allbtn" onclick="adsCampSetAll(true)">Alles dichtklappen</button><button type="button" class="ar-camp-allbtn" onclick="adsCampSetAll(false)">Alles openklappen</button></div>':'';
  return bar+camps.map(function(c){ return adsRichCampaign(c,cur); }).join('');
}
/* Uitgebreide gegevens: alle ads over alle campagnes, eigen filterregels + drill naar de visual. */
var ADS_FILTER_METRICS=[['linkClicks','Klikken'],['spend','Besteed (€)'],['impressions','Vertoningen'],['ctr','CTR (%)'],['cpc','CPC (€)'],['leads','Leads']];
var ADS_GEG_SORT={key:'linkClicks',dir:-1};
function adsFilters(){ if(!state._adsFilters) state._adsFilters=[]; return state._adsFilters; }
function adsRichGegevensTab(m,cur){
  var all=[];
  (m.campaigns||[]).forEach(function(c){ adsRichMergeAds(c.ads||[]).forEach(function(a){ var x=Object.assign({},a); x.campaign=c.name||''; x.campaignId=c.id; all.push(x); }); });
  state._adsGegevensAll=all;
  return '<div class="card ads-card" style="padding:14px 16px"><div id="adsGegWrap">'+adsGegInner()+'</div></div>';
}
function adsGegInner(){ return adsGegevensControls()+'<div id="adsGegBody">'+adsGegevensTable()+'</div>'; }
function adsGegevensControls(){
  var fs=adsFilters();
  var plus='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var rules=fs.map(function(f,i){ return '<div class="ads-frule">'
    +'<select aria-label="Statistiek" onchange="adsFilterSet('+i+',\'metric\',this.value)">'+ADS_FILTER_METRICS.map(function(mm){return '<option value="'+mm[0]+'"'+(f.metric===mm[0]?' selected':'')+'>'+esc(mm[1])+'</option>';}).join('')+'</select>'
    +'<select aria-label="Operator" onchange="adsFilterSet('+i+',\'op\',this.value)">'+['>','>=','=','<=','<'].map(function(o){return '<option'+(f.op===o?' selected':'')+'>'+o+'</option>';}).join('')+'</select>'
    +'<input type="number" inputmode="decimal" value="'+esc(String(f.value))+'" oninput="adsFilterSet('+i+',\'value\',this.value)" placeholder="waarde">'
    +'<button class="ads-frm" onclick="adsFilterRemove('+i+')" title="Regel verwijderen" aria-label="Regel verwijderen">✕</button></div>'; }).join('');
  return '<div class="ads-filters"><div class="ads-frules">'+rules+'</div><div class="ads-factions"><button class="ads-faddbtn" onclick="adsFilterAdd()">'+plus+' Filterregel</button>'+(fs.length?'<button class="ads-fclear" onclick="adsFilterClear()">Wissen</button>':'')+'</div></div>';
}
function adsFilterAdd(){ adsFilters().push({metric:'linkClicks',op:'>',value:50}); _adsGegRefresh(true); }
function adsFilterRemove(i){ adsFilters().splice(i,1); _adsGegRefresh(true); }
function adsFilterClear(){ state._adsFilters=[]; _adsGegRefresh(true); }
function adsFilterSet(i,k,v){ var f=adsFilters()[i]; if(!f) return; f[k]=(k==='value')?(parseFloat(v)||0):v; _adsGegRefresh(false); }
function _adsGegRefresh(structure){
  if(structure){ var w=document.getElementById('adsGegWrap'); if(w) w.innerHTML=adsGegInner(); }
  else { var b=document.getElementById('adsGegBody'); if(b) b.innerHTML=adsGegevensTable(); }
  var cnt=document.getElementById('adsGegCount'); if(cnt) cnt.textContent=_adsGegFiltered().length;
}
function _adsGegFiltered(){
  var all=state._adsGegevensAll||[], fs=adsFilters();
  return all.filter(function(a){ return fs.every(function(f){ var v=Number(a[f.metric])||0, t=Number(f.value)||0; switch(f.op){case '>':return v>t;case '>=':return v>=t;case '=':return v===t;case '<=':return v<=t;case '<':return v<t;default:return true;} }); });
}
function adsGegSort(key){ if(ADS_GEG_SORT.key===key){ ADS_GEG_SORT.dir=-ADS_GEG_SORT.dir; } else { ADS_GEG_SORT.key=key; ADS_GEG_SORT.dir=(key==='name'||key==='campaign')?1:-1; } _adsGegRefresh(false); }
function adsGegevensTable(){
  var cur=_arCur();
  var rows=_adsGegFiltered().slice().sort(function(a,b){ var k=ADS_GEG_SORT.key,c; if(k==='name'||k==='campaign'){ c=String(a[k]||'').localeCompare(String(b[k]||''),'nl'); } else { c=(Number(a[k])||0)-(Number(b[k])||0); } return c*ADS_GEG_SORT.dir; });
  state._adsGegRows=rows;
  if(!rows.length) return '<div class="ar-empty" style="border:1px solid var(--line);border-radius:14px;margin-top:4px">Geen advertenties die aan de filters voldoen.</div>';
  // Taak 9: geen oog-icoon meer, de advertentienaam zelf opent de visual (adsGegVisual), net als elders.
  var cols=[['name','Advertentie',0],['campaign','Campagne',0],['spend','Besteed',1],['impressions','Vert.',1],['linkClicks','Klikken',1],['ctr','CTR',1],['cpc','CPC',1],['leads','Leads',1]];
  var tpl=cols.map(function(c,i){ return i===0?'minmax(150px,1.5fr)':(c[0]==='campaign'?'minmax(110px,1.1fr)':(c[2]?'minmax(70px,1fr)':'minmax(80px,1fr)')); }).join(' ');
  var head=cols.map(function(c){ var on=ADS_GEG_SORT.key===c[0]; var arr=on?(ADS_GEG_SORT.dir<0?' ▼':' ▲'):''; return '<button class="ar-th'+(c[2]?' num':'')+(on?' on':'')+'" onclick="adsGegSort(\''+c[0]+'\')">'+esc(c[1])+arr+'</button>'; }).join('');
  var body=rows.map(function(a,i){
    var nm='<span class="ar-nm" title="'+esc(a.name||'')+'">'+esc(a.name||'-')+'</span>'+(a.merged?' <span class="ar-star">★'+a.count+'</span>':'');
    var nmCell=a.campaignId?'<button class="ar-namebtn" type="button" onclick="adsGegVisual('+i+')" title="Bekijk de visual van deze advertentie">'+nm+'</button>':nm;
    return '<div class="ar-trow" style="grid-template-columns:'+tpl+'">'
    +'<span class="ar-td">'+nmCell+'</span>'
    +'<span class="ar-td" title="'+esc(a.campaign||'')+'">'+esc(a.campaign||'')+'</span>'
    +'<span class="ar-td num">'+metaEur(a.spend,cur)+'</span>'
    +'<span class="ar-td num">'+arNum(a.impressions)+'</span>'
    +'<span class="ar-td num">'+arNum(a.linkClicks||a.clicks)+'</span>'
    +'<span class="ar-td num">'+arPct(a.ctr)+'</span>'
    +'<span class="ar-td num">'+metaEur(a.cpc,cur)+'</span>'
    +'<span class="ar-td num">'+(a.leads?arNum(a.leads):'-')+'</span></div>'; }).join('');
  return '<div class="ar-table"><div class="ar-tscroll"><div class="ar-thead" style="grid-template-columns:'+tpl+'">'+head+'</div>'+body+'</div></div>';
}
// item 8c: robuuste naam-match (genormaliseerd + substring), want de team-tabel kan samengevoegde/PAUSED-namen
// tonen die niet exact in campaignAds zitten. Fallback naar idx 0 enkel als er precies één advertentie is.
function _adsMatchAdIdx(ads,name){
  var nn=function(s){ return String(s||'').trim().toLowerCase(); };
  var t=nn(name); if(!t) return ads.length===1?0:-1;
  var j; for(j=0;j<ads.length;j++){ if(nn(ads[j].name)===t) return j; }        // exact (genormaliseerd)
  for(j=0;j<ads.length;j++){ var an=nn(ads[j].name); if(an && (an.indexOf(t)>=0||t.indexOf(an)>=0)) return j; }  // substring
  return ads.length===1?0:-1;
}
function adsGegVisual(i){
  var a=(state._adsGegRows||[])[i]; if(!a||!a.campaignId) return;
  // openMetaCreative(i) indexeert state._metaAdsView -> die array zetten + de juiste index doorgeven.
  function show(){
    var ads=((window.S27DATA&&S27DATA.campaignAds)?S27DATA.campaignAds(a.campaignId):[])||[];
    var idx=_adsMatchAdIdx(ads,a.name);
    if(idx<0 || typeof openMetaCreative!=='function'){ alert('Geen visual gevonden voor deze advertentie.'); return; }
    state._metaAdsView=ads; openMetaCreative(idx);
  }
  var have=(window.S27DATA&&S27DATA.campaignAds)?S27DATA.campaignAds(a.campaignId):null;
  if(have){ show(); return; }
  if(window.S27DATA&&S27DATA.loadCampaignAds){ S27DATA.loadCampaignAds(a.campaignId).then(show).catch(function(){ alert('De visual kon niet geladen worden.'); }); }
}
// Klik op een advertentienaam in de Campagnes-tab -> open de visual/video (zelfde lightbox als de gegevenstabel, géén oog-icoon).
function adsRichAdVisual(cid,encName){
  var name=''; try{ name=decodeURIComponent(encName||''); }catch(e){ name=encName||''; }
  function show(){ var ads=((window.S27DATA&&S27DATA.campaignAds)?S27DATA.campaignAds(cid):[])||[]; var idx=_adsMatchAdIdx(ads,name); if(idx<0 || typeof openMetaCreative!=='function'){ alert('Geen visual gevonden voor deze advertentie.'); return; } state._metaAdsView=ads; openMetaCreative(idx); }
  var have=(window.S27DATA&&S27DATA.campaignAds)?S27DATA.campaignAds(cid):null;
  if(have){ show(); return; }
  if(window.S27DATA&&S27DATA.loadCampaignAds){ S27DATA.loadCampaignAds(cid).then(show).catch(function(){ alert('De visual kon niet geladen worden.'); }); }
}
/* PDF subtiel onderaan (team kiest zelf wanneer) */
function adsRichPdfFooter(){ return '<div class="ads-pdffoot"><button class="ads-pdflink" onclick="exportAdsPdf()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg> Exporteer dit rapport als PDF</button></div>'; }
/* === Meeting-kladblok (#21, staff): zwevend notitieblok, auto-save naar adsWorkspace.notes per bedrijf === */
function adsNoteStyles(){ if(document.getElementById('adsNoteStyles'))return; var s=document.createElement('style'); s.id='adsNoteStyles'; s.textContent='.ads-note{position:fixed;right:22px;top:74px;z-index:8001;width:340px;max-width:calc(100vw - 32px);max-height:calc(100vh - 100px);background:rgba(255,255,255,.93);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--glass-border,#E7DFD3);border-radius:16px;box-shadow:0 18px 48px rgba(60,40,80,.28);display:none;flex-direction:column;overflow:hidden}.ads-note.open{display:flex}.ads-note-head{display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--line,#E7DFD3);font-family:var(--font-display)}.ads-note-head b{font-size:13.5px;display:flex;align-items:center;gap:6px;flex:1}.ads-note-stat{font-size:11px;color:var(--ink-4);font-weight:600}.ads-note-x{border:0;background:transparent;font-size:15px;color:var(--ink-4);cursor:pointer;padding:2px 4px}.ads-note-ta{border:0;outline:0;resize:vertical;min-height:200px;max-height:50vh;padding:12px 14px;font:inherit;font-size:13.5px;line-height:1.5;color:var(--ink);background:transparent}'; document.head.appendChild(s); }
function adsNoteState(){ if(!state._adsNote) state._adsNote={open:false,loaded:false,text:''}; return state._adsNote; }
function adsNotepadMount(){
  if(!isRichView()) return '';
  adsNoteStyles();
  var n=adsNoteState();
  if(!n.loaded && !state.demoMode && window.S27DATA && S27DATA.loadAdsWorkspace){ n.loaded=true; S27DATA.loadAdsWorkspace().then(function(ws){ n.text=(ws&&ws.notes)||''; var ta=document.getElementById('adsNoteTa'); if(ta && document.activeElement!==ta) ta.value=n.text; }); }
  // FAB verwijderd (item 6): de toggle staat nu in de menubalk (adsNoteBtn). Enkel het paneel komt in de DOM.
  return '<div class="ads-note'+(n.open?' open':'')+'" id="adsNotePanel"><div class="ads-note-head"><b>'+ic('msg',16)+' Meeting-kladblok</b><span class="ads-note-stat" id="adsNoteStat"></span><button class="ads-note-x" onclick="adsNotepadToggle()" aria-label="Sluiten">✕</button></div><textarea id="adsNoteTa" class="ads-note-ta" placeholder="Notities voor deze meeting… (slaat automatisch op)" oninput="adsNoteInput()">'+esc(n.text||'')+'</textarea></div>';
}
function adsNotepadToggle(){ var n=adsNoteState(); n.open=!n.open; var p=document.getElementById('adsNotePanel'); if(p) p.classList.toggle('open',n.open); var b=document.getElementById('adsNoteBtn'); if(b) b.classList.toggle('on',n.open); if(n.open){ var ta=document.getElementById('adsNoteTa'); if(ta){ ta.value=n.text||''; ta.focus(); } } }
function adsNoteInput(){ var ta=document.getElementById('adsNoteTa'); if(!ta) return; adsNoteState().text=ta.value; var st=document.getElementById('adsNoteStat'); if(st) st.textContent='bewaren…'; clearTimeout(state._adsNoteTmr); state._adsNoteTmr=setTimeout(adsNoteSave,900); }
function adsNoteSave(){ if(!(window.S27DATA&&S27DATA.saveAdsWorkspace)) return; S27DATA.saveAdsWorkspace({notes:adsNoteState().text}).then(function(ok){ var st=document.getElementById('adsNoteStat'); if(st){ st.textContent=ok?'opgeslagen ✓':'opslaan mislukt'; if(ok) setTimeout(function(){ var s2=document.getElementById('adsNoteStat'); if(s2&&s2.textContent==='opgeslagen ✓') s2.textContent=''; },1600); } }); }
/* ---- Agendapunten ter voorbereiding van de meeting (bug Arne): persistent tekstveld in het
   meeting-materiaal, auto-save met debounce via het bestaande ads-werkblad (KV-veld 'agenda'). ---- */
function adsAgendaState(){ if(!state._adsAgenda) state._adsAgenda={loaded:false,text:''}; return state._adsAgenda; }
function adsAgendaInput(){ var ta=document.getElementById('adsAgendaTa'); if(!ta) return; adsAgendaState().text=ta.value; var st=document.getElementById('adsAgendaStat'); if(st) st.textContent='bewaren…'; clearTimeout(state._adsAgendaTmr); state._adsAgendaTmr=setTimeout(adsAgendaSave,900); }
function adsAgendaSave(){ if(!(window.S27DATA&&S27DATA.saveAdsWorkspace)) return; S27DATA.saveAdsWorkspace({agenda:adsAgendaState().text}).then(function(ok){ var st=document.getElementById('adsAgendaStat'); if(st){ st.textContent=ok?'opgeslagen ✓':'opslaan mislukt'; if(ok) setTimeout(function(){ var s2=document.getElementById('adsAgendaStat'); if(s2&&s2.textContent==='opgeslagen ✓') s2.textContent=''; },1600); } }); }
/* per-tab charts: Samengevat = account-overzicht; Campagnes = per-campagne dag-evolutie */
function adsRichMountTabCharts(){
  _adsApplyAccent();
  if(!isRichView()) return;
  if(adsActivePlatform()==='google') return googleRichMountTabCharts();
  var t=adsRichTab();
  if(t==='samengevat'){ adsRichLoadChart().then(function(ok){ if(ok&&window.Chart){ var m=(window.S27DATA&&S27DATA.metaAdsRich)?S27DATA.metaAdsRich():null; if(m&&m.linked) adsRichBuildAccountChart(m, m.currency||'EUR'); } }); }
  else if(t==='campagnes'){ adsRichMountCharts(); }
}
/* =============================================================================
   #15/#17, KLIKBARE KPI'S → AAN/UIT-toggle van reeksen in de dag-grafiek.
   Eén gegeneraliseerde Chart.js-bouwer die per platform de geselecteerde reeksen
   uit de dagdata plot. De selectie leeft per platform in state en overleeft een
   re-render binnen de sessie. Hergebruikt door zowel de team- (Samengevat) als de
   client-weergave (overzicht), zodat beide identiek aanvoelen.
   ============================================================================= */
// Plotbare reeksen per platform (key MOET matchen met de KPI-kaart-key zodat een klik op de kaart de juiste reeks schakelt).
// axis-GROEP per metric: 'money' (€), 'count' (#), 'ratio' (% / verhouding). Bepaalt links/rechts-as (taak 2).
// Volgorde = CANONIEKE METRIEK-VOLGORDE, wordt overal in dit document gespiegeld.
// item 4: grafiek-paletten uit de Studio 27-huisstijl, per platform getint. Meta = koel/blauw-geleid,
// Google = warm/oranje-geleid; de dominante 'spend'-balk draagt telkens de platformkleur (blauw/oranje).
// Alle tinten komen uit de huisstijl: blauw #3083DC, donkerblauw #1F5FA8, paars #9441DB, groen #12AC4E,
// teal #0EA5A5, goud #F8C028, oranje #F66131, roze #F697CE, ink #230F23, grijs #6B5B6B.
var ADS_SEL_METRICS = {
  meta: [
    { key:'spend',       label:'Besteed bedrag', color:'#3083DC', axis:'money', daily:'spend',       kind:'bar'  },
    { key:'impressions', label:'Vertoningen',    color:'#1F5FA8', axis:'count', daily:'impressions', kind:'line' },
    { key:'reach',       label:'Bereik',         color:'#0EA5A5', axis:'count', daily:'reach',       kind:'line' },
    { key:'cpm',         label:'CPM',            color:'#9441DB', axis:'money', daily:'cpm',         kind:'line' },
    { key:'linkClicks',  label:'Klikken',        color:'#230F23', axis:'count', daily:'linkClicks',  kind:'line' },
    { key:'ctr',         label:'CTR',            color:'#F8C028', axis:'ratio', daily:'ctr',         kind:'line' },
    { key:'cpc',         label:'CPC',            color:'#6B5B6B', axis:'money', daily:'cpc',         kind:'line' },
    { key:'leads',       label:'Leads',          color:'#12AC4E', axis:'count', daily:'leads',       kind:'line' },
    { key:'cpl',         label:'CPL',            color:'#F697CE', axis:'money', daily:'cpl',         kind:'line' },
    { key:'frequency',   label:'Frequentie',     color:'#9A8B9A', axis:'ratio', daily:'frequency',   kind:'line' }
  ],
  google: [
    { key:'spend',       label:'Besteed',     color:'#F66131', axis:'money', daily:'spend',       kind:'bar'  },
    { key:'impressions', label:'Vertoningen', color:'#F8C028', axis:'count', daily:'impressions', kind:'line' },
    { key:'cpm',         label:'CPM',         color:'#9441DB', axis:'money', daily:'cpm',         kind:'line' },
    { key:'clicks',      label:'Klikken',     color:'#230F23', axis:'count', daily:'clicks',      kind:'line' },
    { key:'ctr',         label:'CTR',         color:'#0EA5A5', axis:'ratio', daily:'ctr',         kind:'line' },
    { key:'cpc',         label:'CPC',         color:'#6B5B6B', axis:'money', daily:'cpc',         kind:'line' },
    { key:'conversions', label:'Leads',  color:'#12AC4E', axis:'count', daily:'conversions', kind:'line' },
    { key:'costPerConv', label:'CPL',  color:'#3083DC', axis:'money', daily:'costPerConv', kind:'line' },
    { key:'convRate',    label:'Leadratio',  color:'#1F5FA8', axis:'ratio', daily:'convRate',    kind:'line' }
  ]
};
// axis-groep van een metric (voor links/rechts-as-toewijzing).
function _adsAxisGroup(m){ return (m&&m.axis)||'count'; }
function adsSelMetrics(plat){ return ADS_SEL_METRICS[plat==='google'?'google':'meta']; }
function adsSelMetricKeys(plat){ return adsSelMetrics(plat).map(function(d){return d.key;}); }
// Per-platform selectie (key->bool). Default: besteding + klikken aan; rest uit. Eén keer geïnitialiseerd, overleeft re-render.
function adsChartSel(plat){
  var g=(plat==='google');
  var slot=g?'_gAdsChartSel':'_adsChartSel';
  if(!state[slot]){ var d={}; adsSelMetrics(plat).forEach(function(m){ d[m.key]=(m.key==='spend'||m.key==='linkClicks'||m.key==='clicks'); }); state[slot]=d; }
  return state[slot];
}
// Toggle één reeks; als niets meer aanstaat valt de geklikte terug naar aan (chart nooit leeg).
function adsChartToggle(plat,key){
  var sel=adsChartSel(plat); sel[key]=!sel[key];
  var keys=adsSelMetricKeys(plat); var any=keys.some(function(k){return sel[k];});
  if(!any) sel[key]=true;
  adsChartSelReflect(plat); adsChartRebuild(plat);
}
// 'active'-classe op alle KPI-kaarten met deze metric-key synchroniseren (team + client view).
function adsChartSelReflect(plat){
  var sel=adsChartSel(plat);
  [].slice.call(document.querySelectorAll('[data-arkpi-metric][data-arkpi-plat="'+plat+'"][data-arkpi-scope="account"]')).forEach(function(el){
    el.classList.toggle('on', !!sel[el.getAttribute('data-arkpi-metric')]);
  });
}
/* ---- Per-CAMPAGNE selectie (taak 3): zelfde mechaniek als de overzichtsgrafiek, maar per campagne gesleuteld.
   De selectie leeft in state._adsCampSel[plat][cid] (key->bool) en overleeft re-render binnen de sessie. ---- */
function adsCampSel(plat,cid){
  state._adsCampSel=state._adsCampSel||{}; var pk=(plat==='google'?'google':'meta');
  state._adsCampSel[pk]=state._adsCampSel[pk]||{};
  if(!state._adsCampSel[pk][cid]){ var d={}; adsSelMetrics(plat).forEach(function(m){ d[m.key]=(m.key==='spend'||m.key==='linkClicks'||m.key==='clicks'); }); state._adsCampSel[pk][cid]=d; }
  return state._adsCampSel[pk][cid];
}
function adsCampChartToggle(plat,cid,key){
  var sel=adsCampSel(plat,cid); sel[key]=!sel[key];
  var keys=adsSelMetricKeys(plat); var any=keys.some(function(k){return sel[k];});
  if(!any) sel[key]=true;
  // reflecteer 'on'-classe op enkel deze campagne's KPI-kaarten.
  [].slice.call(document.querySelectorAll('[data-arkpi-scope="camp:'+cid+'"][data-arkpi-plat="'+plat+'"]')).forEach(function(el){ el.classList.toggle('on', !!sel[el.getAttribute('data-arkpi-metric')]); });
  // herbouw enkel deze campagne-grafiek.
  if(plat==='google'){ var g=_gFindCamp(cid); if(g) googleRichBuildCampChart(g,_gCur()); }
  else { var c=_arFindCamp(cid); if(c) adsRichBuildChart(c,_arCur()); }
}
// Dag-reeksen samenstellen uit de campagnes hun daily[] (team) of een account-trend[] (client).
// rows = [{date, <metric-velden>}]. Geeft {labels, series:{key:[...]}} terug voor de geselecteerde metrics.
// Afgeleide (ratio/gemiddelde) metrics mogen NIET over campagnes opgeteld worden; ze worden per dag
// herberekend uit de gesommeerde basismetrics. Overige metrics worden gesommeerd.
var _ADS_DERIVED={
  cpm:function(b){ return b.impressions?(b.spend/b.impressions*1000):0; },
  cpc:function(b){ return b.linkClicks?(b.spend/b.linkClicks):(b.clicks?(b.spend/b.clicks):0); },
  ctr:function(b){ return b.impressions?((b.linkClicks||b.clicks)/b.impressions*100):0; },
  cpl:function(b){ return b.leads?(b.spend/b.leads):0; },
  frequency:function(b){ return b.reach?(b.impressions/b.reach):0; },
  costPerConv:function(b){ return b.conversions?(b.spend/b.conversions):0; },
  convRate:function(b){ return b.clicks?(b.conversions/b.clicks*100):0; }
};
function _adsAggregateDaily(rows, metrics){
  var dates={};
  // Basisvelden die we per dag sommeren om afgeleiden te kunnen herrekenen.
  var base={}; ['spend','impressions','reach','clicks','linkClicks','leads','conversions','convValue'].forEach(function(f){ base[f]={}; });
  var maps={}; metrics.forEach(function(m){ if(!_ADS_DERIVED[m.key]) maps[m.key]={}; });
  (rows||[]).forEach(function(d){ if(!d||!d.date) return; dates[d.date]=1;
    Object.keys(base).forEach(function(f){ var v=Number(d[f])||0; if(f==='linkClicks'&&d.linkClicks==null) v=Number(d.clicks)||0; base[f][d.date]=(base[f][d.date]||0)+v; });
    metrics.forEach(function(m){ if(_ADS_DERIVED[m.key]) return; var f=m.daily; var v=Number(d[f])||0; if(m.key==='linkClicks'&&d.linkClicks==null) v=Number(d.clicks)||0; maps[m.key][d.date]=(maps[m.key][d.date]||0)+v; });
  });
  var labels=Object.keys(dates).sort();
  function baseAt(dt){ var o={}; Object.keys(base).forEach(function(f){ o[f]=base[f][dt]||0; }); return o; }
  var series={};
  metrics.forEach(function(m){ series[m.key]=labels.map(function(dt){
    var v=_ADS_DERIVED[m.key]?_ADS_DERIVED[m.key](baseAt(dt)):(maps[m.key][dt]||0);
    return (m.axis==='money'||m.axis==='ratio')?Math.round(v*100)/100:v;
  }); });
  return { labels:labels, series:series };
}
function _adsRowsFromCampaigns(camps){
  var out=[]; (camps||[]).forEach(function(c){ (c.daily||[]).forEach(function(d){ out.push(d); }); }); return out;
}
// Gegeneraliseerde, herbouwbare chart: plot enkel de geselecteerde reeksen.
function adsBuildSelChart(opts){
  var cv=document.getElementById(opts.canvasId); if(!cv||!window.Chart) return;
  state._arCharts=state._arCharts||{};
  var ck=opts.chartKey;
  try{ if(state._arCharts[ck]){ state._arCharts[ck].destroy(); delete state._arCharts[ck]; } }catch(e){}
  var metrics=opts.metrics, sel=opts.sel, cur=opts.cur||'EUR';
  // Afgeleide metrics (cpm/cpc/ctr/cpl/frequency/costPerConv/convRate) worden in _adsAggregateDaily
  // herrekend uit de gesommeerde basisvelden; ze hebben GEEN eigen dag-kolom, dus de has()-poort
  // (die op een ruwe dag-kolom test) mag ze niet droppen. Basis-metrics blijven wél has()-gepoort.
  function _chartOK(k){ return _ADS_DERIVED[k]?true:(opts.has?opts.has(k):true); }
  var active=metrics.filter(function(m){ return sel[m.key] && _chartOK(m.key); });
  if(!active.length) active=metrics.filter(function(m){ return _chartOK(m.key); }).slice(0,1);
  if(!active.length) return;
  var agg=_adsAggregateDaily(opts.rows, active);
  if(agg.labels.length<2) return;
  // Taak 2: bepaal de aanwezige axis-groepen onder de geselecteerde metrics. Dominante (meeste reeksen) groep
  // = linkeras (y); een tweede groep -> rechteras (y1). y1 verschijnt ENKEL als er ≥2 groepen actief zijn.
  var grpCount={}; active.forEach(function(m){ var g=_adsAxisGroup(m); grpCount[g]=(grpCount[g]||0)+1; });
  var groups=Object.keys(grpCount);
  // dominante groep = meeste reeksen; gelijkspel -> volgorde money>count>ratio voor stabiliteit.
  var pref={money:3,count:2,ratio:1};
  var leftGroup=groups.slice().sort(function(a,b){ return (grpCount[b]-grpCount[a])||((pref[b]||0)-(pref[a]||0)); })[0];
  var dual=groups.length>1;
  function fmtFor(g){ return g==='money'?function(v){return metaEur(v,cur);}:(g==='ratio'?function(v){return (Math.round((Number(v)||0)*100)/100).toLocaleString('nl-BE');}:function(v){return (Number(v)||0).toLocaleString('nl-BE');}); }
  function tickFor(g){ return g==='money'?function(v){return '€'+v;}:(g==='ratio'?function(v){return v;}:function(v){return (Number(v)||0).toLocaleString('nl-BE');}); }
  var order=0;
  var ds=active.map(function(m){ order++;
    var g=_adsAxisGroup(m); var ax=(dual && g!==leftGroup)?'y1':'y';
    if(m.kind==='bar') return {type:'bar',label:m.label,data:agg.series[m.key],backgroundColor:_hexA(m.color,.5),borderColor:_hexA(m.color,.92),borderWidth:1,borderRadius:4,yAxisID:ax,order:90-order,_grp:g};
    return {type:'line',label:m.label,data:agg.series[m.key],borderColor:m.color,backgroundColor:m.color,borderWidth:2,tension:.32,pointRadius:0,yAxisID:ax,order:90-order,_grp:g};
  });
  // assen-config: linkeras altijd; rechteras enkel bij dual.
  var rightGroup=null; if(dual){ for(var gi=0;gi<groups.length;gi++){ if(groups[gi]!==leftGroup){ rightGroup=groups[gi]; break; } } }
  var scales={ x:{ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',maxRotation:0,autoSkip:true,maxTicksLimit:12},grid:{display:false}},
    y:{position:'left',beginAtZero:true,ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',callback:tickFor(leftGroup)},grid:{color:'rgba(231,223,211,.55)'}} };
  if(dual){ scales.y1={position:'right',beginAtZero:true,grid:{drawOnChartArea:false},ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',precision:(rightGroup==='count'?0:undefined),callback:tickFor(rightGroup)}}; }
  try{ state._arCharts[ck]=new window.Chart(cv.getContext('2d'),{ data:{labels:agg.labels.map(_arDayLabel),datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{font:{family:'Montserrat',size:11,weight:'600'},color:'#6B5B6B',boxWidth:12,padding:14,usePointStyle:true}},tooltip:{callbacks:{label:function(x){ var g=(x.dataset&&x.dataset._grp)||'count'; return ' '+x.dataset.label+': '+fmtFor(g)(x.parsed.y); }}}},
      scales:scales } }); }catch(e){}
}
// '#3083DC' + alpha -> 'rgba(48,131,220,a)'
function _hexA(hex,a){ var h=String(hex||'').replace('#',''); if(h.length===3) h=h.replace(/(.)/g,'$1$1'); var n=parseInt(h,16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
// Account-grafiek herbouwen voor het ACTIEVE platform/de actieve weergave (na een KPI-klik).
function adsChartRebuild(plat){
  if(plat==='google'){
    if(isRichView()){ var g=(window.S27DATA&&S27DATA.googleAdsRich)?S27DATA.googleAdsRich():null; if(g&&g.linked) googleRichBuildAccountChart(g,g.currency||'EUR'); }
    else { var gc=(window.S27DATA&&S27DATA.googleAds)?S27DATA.googleAds():null; if(gc) googleClientBuildChart(gc,gc.currency||'EUR'); }
  } else {
    if(isRichView()){ var m=(window.S27DATA&&S27DATA.metaAdsRich)?S27DATA.metaAdsRich():null; if(m&&m.linked) adsRichBuildAccountChart(m,m.currency||'EUR'); }
    else { var mc=(window.S27DATA&&S27DATA.metaAds)?S27DATA.metaAds():null; if(mc) adsClientBuildChart(mc,mc.currency||'EUR'); }
  }
}
// CSS-injector voor klikbare KPI-kaarten + maandgrafiek-controls (guarded).
function adsChartStyles(){ if(document.getElementById('adsChartStyles'))return; var s=document.createElement('style'); s.id='adsChartStyles'; s.textContent=
  '.arkpi.arkpi-clk{cursor:pointer;position:relative;transition:border-color .15s,box-shadow .15s,transform .12s;}'
 +'.arkpi.arkpi-clk:hover{border-color:var(--ads-accent,#3083DC);box-shadow:0 4px 14px rgba(48,131,220,.16);}'
 +'.arkpi.arkpi-clk::after{content:"";position:absolute;left:13px;right:13px;bottom:8px;height:3px;border-radius:3px;background:var(--arkpi-dot,#3083DC);opacity:0;transition:opacity .15s;}'
 +'.arkpi.arkpi-clk.on{border-color:var(--arkpi-dot,#3083DC);}'
 +'.arkpi.arkpi-clk.on::after{opacity:.9;}'
 +'.arkpi.arkpi-clk .arkpi-l{display:flex;align-items:center;gap:6px;}'
 +'.arkpi-tg{width:9px;height:9px;border-radius:50%;flex:none;border:1.5px solid var(--arkpi-dot,#3083DC);background:transparent;transition:background .15s;}'
 +'.arkpi.arkpi-clk.on .arkpi-tg{background:var(--arkpi-dot,#3083DC);}'
 /* per-campagne klikbare KPI-cellen (taak 3), zelfde toggle-gevoel als de overzichts-KPI's */
 +'.ar-ck.ar-ck-clk{cursor:pointer;position:relative;transition:border-color .15s,box-shadow .15s;}'
 +'.ar-ck.ar-ck-clk:hover{border-color:var(--ck-dot,#3083DC);box-shadow:0 3px 10px rgba(48,131,220,.14);}'
 +'.ar-ck.ar-ck-clk.on{border-color:var(--ck-dot,#3083DC);box-shadow:inset 0 0 0 1px var(--ck-dot,#3083DC);}'
 +'.ar-ck.ar-ck-clk i{display:flex;align-items:center;gap:5px;}'
 +'.ar-cktg{width:8px;height:8px;border-radius:50%;flex:none;border:1.5px solid var(--ck-dot,#3083DC);background:transparent;transition:background .15s;}'
 +'.ar-ck.ar-ck-clk.on .ar-cktg{background:var(--ck-dot,#3083DC);}'
 +'.ads-mhint{font-size:12px;color:var(--ink-4);font-weight:600;margin:-2px 0 12px;}'
 +'.ads-mctl{display:flex;flex-direction:column;gap:12px;margin:4px 0 14px;}'
 +'.ads-mctl-row{display:flex;flex-direction:column;gap:6px;}'
 +'.ads-mctl-lab{font-family:var(--font-display);font-weight:700;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-4);}'
 +'.ads-mchips{display:flex;flex-wrap:wrap;gap:7px;}'
 +'.ads-mchip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line,#E7DFD3);background:var(--paper,#fff);font:inherit;font-weight:700;font-size:12.5px;color:var(--ink-3);padding:6px 12px;border-radius:999px;cursor:pointer;transition:all .15s;}'
 +'.ads-mchip:hover{color:var(--ink);border-color:var(--ink-4);}'
 +'.ads-mchip.on{color:var(--ink);background:var(--paper-2,#faf7f2);border-color:var(--mc,#3083DC);box-shadow:inset 0 0 0 1px var(--mc,#3083DC);}'
 +'.ads-mchip .ads-mdot{width:9px;height:9px;border-radius:50%;flex:none;background:var(--mc,#3083DC);opacity:.35;transition:opacity .15s;}'
 +'.ads-mchip.on .ads-mdot{opacity:1;}'
 +'.ads-mwrap{position:relative;height:340px;background:var(--paper,#fff);border:1px solid var(--line,#E7DFD3);border-radius:var(--r-lg,18px);box-shadow:var(--sh-sm);padding:16px 16px 12px;}'
 +'.ads-mwrap canvas{max-height:300px;}';
  document.head.appendChild(s); }
function adsRichBuildAccountChart(m,cur){
  adsBuildSelChart({ canvasId:'arch_account', chartKey:'account', rows:_adsRowsFromCampaigns(m.campaigns||[]),
    metrics:adsSelMetrics('meta'), sel:adsChartSel('meta'), cur:cur,
    has:function(k){ return (m.campaigns||[]).some(function(c){ return (c.daily||[]).some(function(d){ return Number(k==='linkClicks'?(d.linkClicks||d.clicks):d[k])>0; }); }); } });
}

/* =============================================================================
   PDF-EXPORT (team-rapporten), opent een gebrand, A4-geoptimaliseerd print-venster
   in Studio 27-huisstijl met de reeds gerenderde Chart.js-grafieken als afbeeldingen.
   window.print() → "Opslaan als PDF". Geen externe library. Enkel adminMode.
   ============================================================================= */
function _pdfBtn(fn){ return '<button class="ar-pdfbtn" onclick="'+fn+'()" title="Download dit rapport als PDF"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg><span>PDF-rapport</span></button>'; }
function _pdfToday(){ try{ return new Date().toLocaleDateString('nl-BE',{day:'2-digit',month:'long',year:'numeric'}); }catch(e){ return ''; } }
function _pdfPeriodFromUI(which){ try{ var pp=which==='ads'?adsPeriod():socialPeriod(); return _srDate(pp.from)+' - '+_srDate(pp.to); }catch(e){ return ''; } }
function _pdfDelta(cur,prev,invert){ if(prev==null) return ''; cur=Number(cur)||0; prev=Number(prev)||0; if(!prev) return cur>0?'<div class="d up">nieuw</div>':''; var pct=Math.round(((cur-prev)/Math.abs(prev))*1000)/10; if(pct===0) return '<div class="d" style="color:#9E919E">0%</div>'; var better=invert?pct<0:pct>0; return '<div class="d '+(better?'up':'down')+'">'+(pct>0?'+':'')+pct+'%</div>'; }
function _pdfChartImg(canvasId){ var c=document.getElementById(canvasId); if(!c||!c.toDataURL) return ''; try{ return c.toDataURL('image/png',1.0); }catch(e){ return ''; } }
function _pdfOpen(html){ var w=window.open('','_blank'); if(!w){ alert('Sta pop-ups toe om het PDF-rapport te openen, en probeer opnieuw.'); return; } w.document.open(); w.document.write(html); w.document.close(); }
function s27PdfShell(docTitle,headTitle,headSub,bodyHTML){
  var css='@page{size:A4;margin:13mm 11mm;}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
    +'body{font-family:Montserrat,system-ui,Arial,sans-serif;color:#230F23;margin:0;font-size:11px;line-height:1.45;}'
    +'.pdf-band{background:linear-gradient(120deg,#3083DC,#9441DB);color:#fff;padding:20px 24px;border-radius:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end;}'
    +'.pdf-brand{font-weight:800;font-size:12px;letter-spacing:.2em;opacity:.92;}.pdf-h1{font-weight:800;font-size:22px;letter-spacing:-.02em;margin:6px 0 0;}.pdf-sub{font-size:12px;opacity:.93;margin-top:3px;}.pdf-meta{text-align:right;font-size:11px;opacity:.93;}'
    +'h2.pdf-sec{font-size:13.5px;font-weight:800;margin:18px 0 7px;border-bottom:2px solid #E7DFD3;padding-bottom:5px;}'
    +'.pdf-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;}.pdf-kpi{border:1px solid #E7DFD3;border-radius:9px;padding:8px 10px;}'
    +'.pdf-kpi .l{font-size:8px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#9E919E;}.pdf-kpi .v{font-size:15px;font-weight:800;margin-top:2px;}.pdf-kpi .d{font-size:9px;font-weight:800;margin-top:1px;}'
    +'.up{color:#0E7A39;}.down{color:#B4540B;}'
    +'table{width:100%;border-collapse:collapse;margin-top:6px;}th,td{text-align:left;padding:4px 7px;border-bottom:1px solid #EFEAE1;font-size:9.5px;}th{background:#FAF7F2;font-weight:800;font-size:8px;text-transform:uppercase;letter-spacing:.03em;color:#6B5B6B;}td.num,th.num{text-align:right;}'
    +'.pdf-chart{border:1px solid #E7DFD3;border-radius:10px;padding:9px;margin-top:9px;page-break-inside:avoid;}.pdf-chart img{width:100%;display:block;}'
    +'.pdf-rec{border-left:4px solid #E08A1E;background:#FBFAF8;border-radius:8px;padding:8px 12px;margin-top:7px;page-break-inside:avoid;}.pdf-rec.blue{border-left-color:#3083DC;}.pdf-rec.red{border-left-color:#DC2626;}.pdf-rec.green{border-left-color:#12AC4E;}.pdf-rec b{display:block;font-size:11px;}.pdf-rec span{color:#6B5B6B;}'
    +'.pdf-camp{border:1px solid #E7DFD3;border-radius:12px;padding:12px 14px;margin-top:11px;page-break-inside:avoid;}.pdf-pill{display:inline-block;font-size:8px;font-weight:800;padding:2px 8px;border-radius:999px;background:#EEF1F4;color:#1F5FA8;}'
    +'.pdf-foot{margin-top:20px;border-top:1px solid #E7DFD3;padding-top:8px;font-size:9px;color:#9E919E;text-align:center;}'
    +'.pdf-actions{text-align:center;margin:18px 0;}.pdf-actions button{font:700 14px Montserrat,sans-serif;background:#3083DC;color:#fff;border:none;border-radius:10px;padding:11px 22px;cursor:pointer;}@media print{.pdf-actions{display:none;}}';
  return '<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>'+esc(docTitle)+'</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">'
    +'<style>'+css+'</style></head><body>'
    +'<div class="pdf-band"><div><div class="pdf-brand">STUDIO 27</div><div class="pdf-h1">'+esc(headTitle)+'</div><div class="pdf-sub">'+esc(headSub)+'</div></div><div class="pdf-meta">'+esc(_pdfToday())+'</div></div>'
    +bodyHTML
    +'<div class="pdf-foot">Gegenereerd via het Studio 27 klantenportaal · portaal.studio27.be</div>'
    +'<div class="pdf-actions"><button onclick="window.print()">Opslaan als PDF</button></div>'
    +'<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){try{window.print();}catch(e){}},450);});</scr'+'ipt>'
    +'</body></html>';
}
/* ---- ads-PDF ---- */
function _pdfAdTable(c,cur){
  var ads=adsRichMergeAds(c.ads||[]).slice().sort(function(a,b){return b.spend-a.spend;});
  var extra=ads.length>10?ads.length-10:0; ads=ads.slice(0,10);
  if(!ads.length) return '';
  var rows=ads.map(function(a){ return '<tr><td>'+esc(a.name||'-')+(a.merged?' ★'+a.count:'')+'</td><td class="num">'+metaEur(a.spend,cur)+'</td><td class="num">'+arNum(a.impressions)+'</td><td class="num">'+arNum(a.linkClicks||a.clicks)+'</td><td class="num">'+arPct(a.ctr)+'</td><td class="num">'+(a.leads?arNum(a.leads):'-')+'</td></tr>'; }).join('');
  return '<table><thead><tr><th>Advertentie</th><th class="num">Besteed</th><th class="num">Vert.</th><th class="num">Klikken</th><th class="num">CTR</th><th class="num">Leads</th></tr></thead><tbody>'+rows+'</tbody></table>'+(extra?'<div style="font-size:9px;color:#9E919E;margin-top:3px">+ '+extra+' andere advertenties</div>':'');
}
function exportAdsPdf(){
  var m=(window.S27DATA&&S27DATA.metaAdsRich&&S27DATA.metaAdsRich()); if(!m||!m.linked){ alert('Er is nog geen rapportdata om te exporteren. Laad eerst de rapportage.'); return; }
  var cur=m.currency||'EUR', k=m.kpis||{}, p=m.prevKpis||null;
  var company=(state._adminActiveName||(window.S27DATA&&S27DATA.bedrijfsnaam&&S27DATA.bedrijfsnaam())||'Klant');
  function kc(lab,val,key,inv){ return '<div class="pdf-kpi"><div class="l">'+lab+'</div><div class="v">'+val+'</div>'+(p?_pdfDelta(k[key],p[key],inv):'')+'</div>'; }
  var kpis='<div class="pdf-kpis">'+[kc('Besteed',metaEur(k.spend,cur),'spend',true),kc('Leads',arNum(k.leads),'leads',false),kc('CPL',k.leads?metaEur(k.cpl,cur):'-','cpl',true),kc('Klikken',arNum(k.linkClicks||k.clicks),'linkClicks',false),kc('Vertoningen',arNum(k.impressions),'impressions',false),kc('Bereik',arNum(k.reach),'reach',false),kc('CPM',metaEur(k.cpm,cur),'cpm',true),kc('CTR',arPct(k.ctr),'ctr',false),kc('CPC',metaEur(k.cpc,cur),'cpc',true),kc('Frequentie',arDec(k.frequency,2),'frequency',true)].join('')+'</div>';
  var camps=(m.campaigns||[]).map(function(c){
    var img=_pdfChartImg('arch_'+c.id); var chart=img?'<div class="pdf-chart"><img src="'+img+'"></div>':'';
    return '<div class="pdf-camp"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:12.5px">'+esc(c.name||'Campagne')+'</b>'+(c.objective?'<span class="pdf-pill">'+esc(adsRichObjLabel(c.objective))+'</span>':'')+'</div>'
      +'<div style="font-size:9.5px;color:#6B5B6B;margin:3px 0 5px">'+metaEur(c.spend,cur)+' besteed · '+arNum(c.leads)+' leads'+(c.leads?(' · '+metaEur(c.cpl,cur)+' CPL'):'')+' · '+arNum(c.linkClicks||c.clicks)+' klikken · CTR '+arPct(c.ctr)+' · CPM '+metaEur(c.cpm,cur)+'</div>'+chart+_pdfAdTable(c,cur)+'</div>';
  }).join('');
  var recs=adsRichOptimList(m.campaigns||[]).map(function(r){ return '<div class="pdf-rec '+(r[0]==='orange'?'':r[0])+'"><b>'+esc(r[1])+'</b><span>'+esc(r[2])+'</span></div>'; }).join('');
  var body='<h2 class="pdf-sec">Samenvatting'+(m.compareLabel?' · vs '+esc(m.compareLabel):'')+'</h2>'+kpis
    +'<h2 class="pdf-sec">Campagnes ('+(m.campaigns||[]).length+')</h2>'+(camps||'<p style="font-size:10px;color:#6B5B6B">Geen campagnes met activiteit in deze periode.</p>')
    +'<h2 class="pdf-sec">Optimalisatie-aanbevelingen</h2>'+recs;
  _pdfOpen(s27PdfShell('Advertentierapport, '+company,'Advertentierapport',company+' · '+_pdfPeriodFromUI('ads'),body));
}
/* ---- social-PDF ---- */
function _pdfSocNetTable(s){
  var nets=(s.networks||[]).filter(function(n){return n.followers||n.reach||n.interactions;});
  if(!nets.length) return '';
  var rows=nets.map(function(n){ return '<tr><td>'+esc(n.label||n.network)+'</td><td class="num">'+socialFmt(n.followers)+'</td><td class="num">'+(n.growth>0?'+':'')+socialFmt(n.growth)+'</td><td class="num">'+socialFmt(n.reach)+'</td><td class="num">'+socialFmt(n.interactions)+'</td><td class="num">'+(Number(n.engagementRate)||0)+'%</td></tr>'; }).join('');
  return '<table><thead><tr><th>Netwerk</th><th class="num">Volgers</th><th class="num">Groei</th><th class="num">Bereik</th><th class="num">Interacties</th><th class="num">Engag.</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function _pdfSocPostsTable(posts){
  var top=(posts||[]).slice().sort(function(a,b){return (b.reach||0)-(a.reach||0);}).slice(0,20);
  if(!top.length) return '';
  var rows=top.map(function(p){ return '<tr><td>'+esc(p.label||p.network)+'</td><td>'+esc(_srDate(p.date))+'</td><td>'+esc(socialPostTypeLabel(p))+'</td><td class="num">'+socialFmt(p.reach)+'</td><td class="num">'+socialFmt(p.interactions)+'</td><td class="num">'+(Number(p.engagementRate)||0)+'%</td></tr>'; }).join('');
  return '<table><thead><tr><th>Netwerk</th><th>Datum</th><th>Type</th><th class="num">Bereik</th><th class="num">Interacties</th><th class="num">Engag.</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function _pdfSocInsightTables(s){
  var out='';
  var bt=s.bestTimes||[]; if(bt.length){ out+='<h2 class="pdf-sec">Beste momenten</h2><table><thead><tr><th>Dag</th><th>Dagdeel</th><th class="num">Posts</th><th class="num">Gem. bereik</th><th class="num">Engag.</th></tr></thead><tbody>'+bt.map(function(t){return '<tr><td>'+esc(t.day)+'</td><td>'+esc(t.part)+'</td><td class="num">'+socialFmt(t.count)+'</td><td class="num">'+socialFmt(t.avgReach)+'</td><td class="num">'+(Number(t.avgEngagementRate)||0)+'%</td></tr>';}).join('')+'</tbody></table>'; }
  var fm=s.formats||[]; if(fm.length){ out+='<h2 class="pdf-sec">Sterkste formats</h2><table><thead><tr><th>Format</th><th class="num">Posts</th><th class="num">Gem. bereik</th><th class="num">Engag.</th></tr></thead><tbody>'+fm.map(function(f){return '<tr><td>'+esc(f.format)+'</td><td class="num">'+socialFmt(f.count)+'</td><td class="num">'+socialFmt(f.avgReach)+'</td><td class="num">'+(Number(f.avgEngagementRate)||0)+'%</td></tr>';}).join('')+'</tbody></table>'; }
  var ht=s.hashtags||[]; if(ht.length){ out+='<h2 class="pdf-sec">Topscorende hashtags</h2><table><thead><tr><th>Hashtag</th><th class="num">Posts</th><th class="num">Gem. bereik</th><th class="num">Engag.</th></tr></thead><tbody>'+ht.map(function(h){return '<tr><td>'+esc(h.tag)+'</td><td class="num">'+socialFmt(h.count)+'</td><td class="num">'+socialFmt(h.avgReach)+'</td><td class="num">'+(Number(h.avgEngagementRate)||0)+'%</td></tr>';}).join('')+'</tbody></table>'; }
  return out;
}
function exportSocialPdf(){
  var s=(window.S27DATA&&S27DATA.metricoolStatsRich&&S27DATA.metricoolStatsRich()); if(!s||!s.linked){ alert('Er is nog geen rapportdata om te exporteren. Laad eerst de rapportage.'); return; }
  var t=s.totals||{}, p=s.prevTotals||null;
  var company=(state._adminActiveName||(window.S27DATA&&S27DATA.bedrijfsnaam&&S27DATA.bedrijfsnaam())||'Klant');
  function kc(lab,val,key){ return '<div class="pdf-kpi"><div class="l">'+lab+'</div><div class="v">'+val+'</div>'+(p?_pdfDelta(t[key],p[key],false):'')+'</div>'; }
  var kpis='<div class="pdf-kpis" style="grid-template-columns:repeat(4,1fr)">'+[kc('Volgers',socialFmt(t.followers),'followers'),kc('Bereik',socialFmt(t.reach),'reach'),kc('Interacties',socialFmt(t.interactions),'interactions'),kc('Engagement',(Number(t.engagementRate)||0)+'%','engagementRate')].join('')+'</div>';
  var ov=_pdfChartImg('srOverviewChart'), fo=_pdfChartImg('srFollowersChart');
  var charts=(ov?'<div class="pdf-chart"><div style="font-weight:800;font-size:10px;margin-bottom:4px">Bereik &amp; interacties per dag</div><img src="'+ov+'"></div>':'')+(fo?'<div class="pdf-chart"><div style="font-weight:800;font-size:10px;margin-bottom:4px">Volgersgroei per netwerk</div><img src="'+fo+'"></div>':'');
  var body='<h2 class="pdf-sec">Samenvatting'+(s.compareLabel?' · vs '+esc(s.compareLabel):'')+'</h2>'+kpis+charts
    +'<h2 class="pdf-sec">Per netwerk</h2>'+(_pdfSocNetTable(s)||'<p style="font-size:10px;color:#6B5B6B">Geen netwerkdata.</p>')
    +'<h2 class="pdf-sec">Best presterende posts</h2>'+(_pdfSocPostsTable(s.posts)||'<p style="font-size:10px;color:#6B5B6B">Geen posts in deze periode.</p>')
    +_pdfSocInsightTables(s);
  _pdfOpen(s27PdfShell('Social media rapport, '+company,'Social media rapport',company+' · '+_pdfPeriodFromUI('social'),body));
}
function adsRichNotLinked(){ return '<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">Nog geen Meta-advertentieaccount gekoppeld</div><div style="color:var(--ink-3);max-width:470px;margin:0 auto;line-height:1.55">Koppel het Meta-advertentieaccount van deze klant (veld “Meta Ads ID” op de bedrijf-taak) om hier de uitgebreide rapportage te zien.</div></div>'; }
function adsRichInner(){
  var m=(window.S27DATA&&S27DATA.metaAdsRich&&S27DATA.metaAdsRich());
  if(m===undefined||m===null){ return '<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>De uitgebreide rapportage wordt opgehaald…</p></div>'; }
  if(!m.linked){ return adsRichNotLinked(); }
  var cur=m.currency||'EUR';
  if(m.error && !(m.campaigns&&m.campaigns.length) && !(m.kpis&&m.kpis.spend)){ return '<div class="card" style="padding:26px;text-align:center;color:var(--ink-3)">De Meta-data kon even niet opgehaald worden. Klik op verversen om opnieuw te proberen.</div>'; }
  var camps=(m.campaigns||[]);
  var campHTML = camps.length ? camps.map(function(c){ return adsRichCampaign(c,cur); }).join('') : '<div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Geen campagnes met activiteit in deze periode.</div>';
  return adsRichKpiGrid(m.kpis||{}, m.prevKpis||null, cur, m.compareLabel)
    +'<div class="section-head" style="margin-top:22px"><h2>Campagnes</h2><span class="count">'+camps.length+'</span></div>'+campHTML
    +adsRichOptim(camps,cur);
}
/* ---- formatters ---- */
function arNum(n){ return (Number(n)||0).toLocaleString('nl-BE'); }
function arEur(n,cur){ return metaEur(n,cur); }
function arPct(n){ return (Number(n)||0).toLocaleString('nl-BE',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'; }
function arDec(n,d){ d=d||2; var f=Math.pow(10,d); return (Math.round((Number(n)||0)*f)/f).toLocaleString('nl-BE',{minimumFractionDigits:d,maximumFractionDigits:d}); }
// vergelijkings-chip: groen=beter, oranje=slechter, grijs=gelijk. invert=lager-is-beter (CPM/CPC/CPL/freq).
function arCmp(cur,prev,invert){
  if(prev==null) return '';
  cur=Number(cur)||0; prev=Number(prev)||0;
  if(!prev){ return cur>0?'<span class="arcmp good">nieuw</span>':''; }
  var pct=Math.round(((cur-prev)/Math.abs(prev))*1000)/10;
  if(Math.abs(pct) < 0.05) return '<span class="arcmp flat" title="gelijk gebleven">gelijk gebleven</span>';
  var better = invert ? pct<0 : pct>0;
  return '<span class="arcmp '+(better?'good':'bad')+'">'+(pct>0?'▲ +':'▼ ')+pct+'%</span>';
}
// absolute-vergelijking: kleur via richting (pct+invert), toont een RICHTINGPIJL (▲/▼) + het ABSOLUTE
// vorige-periode-getal (taak 4, nooit een kale "vs" zonder pijl). Voor CPC/kliks/besteding/frequentie enz.;
// ratio's (CTR/conv.ratio) blijven % via arCmp.
function arCmpAbs(cur,prev,invert,fmt){
  if(prev==null) return '';
  cur=Number(cur)||0; prev=Number(prev)||0;
  if(!prev) return cur>0?'<span class="arcmp good">nieuw</span>':'';
  var diff=cur-prev;
  var prevTxt=(fmt?fmt(prev):prev);
  if(Math.abs(diff) < 0.005*Math.max(1,Math.abs(prev))) return '<span class="arcmp flat" title="gelijk gebleven">gelijk gebleven</span>';
  var cls=((invert?diff<0:diff>0)?'good':'bad');
  var arrow=diff>0?'▲':'▼';
  return '<span class="arcmp '+cls+'">'+arrow+' '+prevTxt+'</span>';
}
// NEUTRALE vergelijking (punt Arne): geen groen/rood-oordeel, gewoon lichtgrijs met de VORIGE waarde +
// richtingpijl. Voor besteding (een stijging is niet per se slecht, kan strategisch zijn) en voor de
// leadratio (een percentage-van-percentage-verschil leest verwarrend; toon liever de vorige ratio).
function arCmpNeutral(cur,prev,fmt){
  if(prev==null) return '';
  cur=Number(cur)||0; prev=Number(prev)||0;
  if(!prev) return '';
  var diff=cur-prev;
  if(Math.abs(diff) < 0.005*Math.max(1,Math.abs(prev))) return '<span class="arcmp" style="color:#9E919E" title="gelijk gebleven t.o.v. de vorige periode">vorige: '+fmt(prev)+'</span>';
  return '<span class="arcmp" style="color:#9E919E" title="vorige periode">'+(diff>0?'▲':'▼')+' '+fmt(prev)+'</span>';
}
var ADS_NEUTRAL_CMP={spend:1,convRate:1};   // metrics zonder goed/slecht-oordeel -> arCmpNeutral
// metric-config: [invert (lager=beter), type], type 'pct' = ratio (% via arCmp), e/n/d = absoluut (vs vorig getal).
var AR_METRIC={spend:[true,'e'],cpc:[true,'e'],cpm:[true,'e'],cpl:[true,'e'],costPerConv:[true,'e'],frequency:[true,'d'],clicks:[false,'n'],linkClicks:[false,'n'],impressions:[false,'n'],reach:[false,'n'],leads:[false,'n'],results:[false,'n'],conversions:[false,'d'],convValue:[false,'e'],ctr:[false,'pct'],convRate:[false,'pct']};
// per-rij vergelijkings-delta: leest row.prev[key] (backend stuurt 'prev' per campagne/adset/ad/adgroep/keyword).
function arRowDelta(r,key,cur){
  if(!r||!r.prev||r.prev[key]==null) return '';
  var m=AR_METRIC[key]; if(!m) return '';
  var cv=(key==='linkClicks')?(r.linkClicks||r.clicks):r[key];
  var pvv=(key==='linkClicks')?(r.prev.linkClicks||r.prev.clicks):r.prev[key];
  if(ADS_NEUTRAL_CMP[key]) return arCmpNeutral(cv,pvv,(m[1]==='e'?function(v){return arEur(v,cur);}:(m[1]==='pct'?function(v){return arPct(v);}:function(v){return arNum(v);})));
  // Punt Johanna (KPI-vergelijking CTR): een %-verschil van een % leest verwarrend ("+50%" bij
  // 2%->3%). Toon bij CTR daarom de VORIGE ratio met richtingpijl + kleur (zoals de andere KPI's).
  if(key==='ctr') return arCmpAbs(cv,pvv,m[0],function(v){return arPct(v);});
  if(m[1]==='pct') return arCmp(cv,pvv,m[0]);
  var fmt=m[1]==='e'?function(v){return arEur(v,cur);}:(m[1]==='d'?function(v){return arDec(v,2);}:function(v){return arNum(v);});
  return arCmpAbs(cv,pvv,m[0],fmt);
}
function adsRichKpiGrid(k,p,cur,cmpLabel){ return adsKpiGridGeneric('meta',k,p,cur,cmpLabel); }
/* ---- per campagne ---- */
function _titleCase(s){ return String(s).toLowerCase().replace(/_/g,' ').replace(/^\w/,function(c){return c.toUpperCase();}); }
// Taak 6: status als KLEINE GEKLEURDE STIP (geen tekst-pill meer), spaart horizontale ruimte in de tabellen.
// groen=actief, licht-oranje=gepauzeerd, grijs=gearchiveerd/verwijderd, rood=afgekeurd, blauw=review/bezig.
var _AR_STATUS_DOT={green:'#12AC4E',orange:'#E8A33A',grey:'#B8AEA0',red:'#DC2626',blue:'#3083DC'};
function adsRichStatus(st){ st=String(st||'').toUpperCase(); var map={ACTIVE:['Actief','green'],PAUSED:['Gepauzeerd','orange'],CAMPAIGN_PAUSED:['Gepauzeerd','orange'],ADSET_PAUSED:['Gepauzeerd','orange'],ARCHIVED:['Gearchiveerd','grey'],DELETED:['Verwijderd','grey'],DISAPPROVED:['Afgekeurd','red'],PENDING_REVIEW:['In review','blue'],IN_PROCESS:['Bezig','blue'],WITH_ISSUES:['Aandacht','orange'],ENABLED:['Actief','green'],REMOVED:['Verwijderd','grey']}; var m=map[st]||[st?_titleCase(st):'-','grey']; var col=_AR_STATUS_DOT[m[1]]||_AR_STATUS_DOT.grey; return '<span class="ar-stdot" title="'+esc(m[0])+'" aria-label="'+esc(m[0])+'" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+col+';box-shadow:0 0 0 2px rgba(255,255,255,.6)"></span>'; }
// Bug Arne (bolletje activiteit): het bolletje moet BESTEDING tonen, niet enkel de aan/uit-status
// in Meta/Google. Een campagne die "aan" staat maar de laatste dagen geen geld meer uitgeeft
// (backend: spendRecent over de laatste ~3 dagen, los van de gekozen periode) krijgt een grijs
// bolletje. spendRecent ontbreekt (oudere backend/clientview)? Dan gewoon de status-kleur.
function adsRichStatusLive(c){
  var st=String(c&&c.status||'').toUpperCase();
  var active=(st==='ACTIVE'||st==='ENABLED');
  if(active && c && c.spendRecent===false){
    return '<span class="ar-stdot" title="Actief, maar besteedt momenteel niets" aria-label="Actief, geen recente besteding" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+_AR_STATUS_DOT.grey+';box-shadow:0 0 0 2px rgba(255,255,255,.6)"></span>';
  }
  return adsRichStatus(c&&c.status);
}
function adsRichObjLabel(o){ o=String(o||'').toUpperCase(); var map={OUTCOME_LEADS:'Leads',LEAD_GENERATION:'Leadgeneratie',OUTCOME_SALES:'Verkoop',CONVERSIONS:'Conversies',OUTCOME_TRAFFIC:'Verkeer',LINK_CLICKS:'Verkeer',OUTCOME_ENGAGEMENT:'Betrokkenheid',POST_ENGAGEMENT:'Betrokkenheid',OUTCOME_AWARENESS:'Naamsbekendheid',BRAND_AWARENESS:'Naamsbekendheid',REACH:'Bereik',VIDEO_VIEWS:'Videoweergaven',OUTCOME_APP_PROMOTION:'App-promotie'}; return o?(map[o]||_titleCase(o)):''; }
// Bug Arne: leads + CPL hebben enkel zin bij lead-campagnes (OUTCOME_LEADS / LEAD_GENERATION).
// Bij verkeer/awareness e.d. meet Meta geen leads door -> altijd 0, ziet er brak uit -> verbergen.
function adsIsLeadCampaign(c){ var o=String(c&&c.objective||'').toUpperCase(); return o==='OUTCOME_LEADS'||o==='LEAD_GENERATION'; }
// Verwijder de Leads/CPL-kolommen uit een kolomset wanneer de campagne geen lead-campagne is.
function _adsColsForCampaign(cols,c){ return adsIsLeadCampaign(c)?cols:cols.filter(function(col){ return col[0]!=='leads'&&col[0]!=='cpl'; }); }
/* ---- Per-campagne dichtklappen (team-view, bug Arne): toon enkel de kern-KPI-strip en verberg
   de grafiek + adset/ad-tabellen, zodat campagnes compact onder elkaar te vergelijken zijn.
   De keuze wordt per bedrijf onthouden in localStorage (blijft dus na herladen). ---- */
function _adsCampColKey(){ return 'adsCampCollapsed_'+(state.activeBedrijf||(state.session&&state.session.bedrijf_id)||'x'); }
function adsCampColSet(){ if(!state._adsCampCol){ try{ state._adsCampCol=JSON.parse(localStorage.getItem(_adsCampColKey())||'{}')||{}; }catch(e){ state._adsCampCol={}; } } return state._adsCampCol; }
function adsCampCollapsed(cid){ return !!adsCampColSet()[cid]; }
function _adsCampColPersist(){ try{ localStorage.setItem(_adsCampColKey(), JSON.stringify(adsCampColSet())); }catch(e){} }
function _adsCampApply(card, col){
  if(!card) return;
  card.classList.toggle('ar-camp-collapsed', !!col);
  var ch=card.querySelector('.ar-camp-chev'); if(ch){ ch.classList.toggle('open', !col); ch.setAttribute('aria-expanded', col?'false':'true'); }
  if(!col){ try{ var c=_arFindCamp(card.getAttribute('data-cid')); if(c) adsRichBuildChart(c, _arCur()); }catch(e){} }   // openklappen -> grafiek (her)opbouwen
}
function adsCampToggle(cid){
  var s=adsCampColSet(); s[cid]=!s[cid]; _adsCampColPersist();
  var sel='.ar-camp[data-cid="'+(window.CSS&&CSS.escape?CSS.escape(String(cid)):String(cid))+'"]';
  _adsCampApply(document.querySelector(sel), !!s[cid]);
}
function adsCampSetAll(collapse){
  var s=adsCampColSet();
  [].forEach.call(document.querySelectorAll('.ar-camp[data-cid]'), function(card){ var cid=card.getAttribute('data-cid'); s[cid]=!!collapse; _adsCampApply(card, !!collapse); });
  _adsCampColPersist();
}
function adsRichCampaign(c,cur){
  var obj=c.objective?'<span class="ar-obj">'+esc(adsRichObjLabel(c.objective))+'</span>':'';
  var bud=c.budget?'<span class="ar-bud">'+arEur(c.budget,cur)+(c.budgetType==='daily'?' /dag':'')+'</span>':'';
  var col=adsCampCollapsed(c.id);
  var chev='<button class="ar-camp-chev'+(col?'':' open')+'" onclick="adsCampToggle(\''+esc(c.id)+'\')" aria-expanded="'+(col?'false':'true')+'" title="Dichtklappen of uitklappen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>';
  return '<div class="ar-camp'+(col?' ar-camp-collapsed':'')+'" data-cid="'+esc(c.id)+'">'
    +'<div class="ar-camp-head"><span class="ar-camp-headl">'+chev+'<span class="ar-camp-nm">'+esc(c.name||'Campagne')+'</span></span><div class="ar-camp-meta">'+adsRichStatusLive(c)+obj+bud+'</div></div>'
    +adsRichCampKpis(c,cur)
    +(c.daily&&c.daily.length?'<div class="ar-chartwrap"><canvas id="arch_'+esc(c.id)+'"></canvas></div>':'')
    +adsRichAdsetTable(c,cur)
    +adsRichAdTable(c,cur)
    +'</div>';
}
// Klikbare per-campagne KPI-cellen (taak 3): elke cel die overeenkomt met een plotbare reeks (ADS_SEL_METRICS)
// schakelt die reeks in/uit de campagne-grafiek. 'items' = [label, waarde, key] in CANONIEKE volgorde.
function adsCampKpiGrid(plat,c,cur,items){
  adsChartStyles();
  var selMap={}; adsSelMetrics(plat).forEach(function(m){ selMap[m.key]=m; });
  var sel=adsCampSel(plat,c.id);
  var cid=c.id;
  return '<div class="ar-campkpis">'+items.map(function(it){
    var d=arRowDelta(c,it[2],cur);
    var sm=selMap[it[2]];
    if(sm){
      var on=!!sel[it[2]];
      return '<div class="ar-ck ar-ck-clk'+(on?' on':'')+'" data-arkpi-metric="'+esc(it[2])+'" data-arkpi-plat="'+plat+'" data-arkpi-scope="camp:'+esc(cid)+'" style="--ck-dot:'+sm.color+'" role="button" tabindex="0" title="Toon/verberg in de grafiek" onclick="adsCampChartToggle(\''+plat+'\',\''+esc(cid)+'\',\''+esc(it[2])+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();adsCampChartToggle(\''+plat+'\',\''+esc(cid)+'\',\''+esc(it[2])+'\');}">'
        +'<i><span class="ar-cktg"></span>'+it[0]+'</i><b>'+it[1]+'</b>'+(d?'<span class="ar-ckd">'+d+'</span>':'')+'</div>';
    }
    return '<div class="ar-ck"><i>'+it[0]+'</i><b>'+it[1]+'</b>'+(d?'<span class="ar-ckd">'+d+'</span>':'')+'</div>';
  }).join('')+'</div>';
}
function adsRichCampKpis(c,cur){
  var hasLeads=adsIsLeadCampaign(c);   // Bug Arne: enkel bij lead-campagnes; nooit lege 0-leads bij verkeer/awareness
  // CANONIEKE volgorde: Besteed → Vertoningen → Bereik → CPM → Klikken → CTR → CPC → Leads → CPL → Frequentie.
  var items=[['Besteed',arEur(c.spend,cur),'spend'],['Vertoningen',arNum(c.impressions),'impressions'],['Bereik',arNum(c.reach),'reach'],['CPM',arEur(c.cpm,cur),'cpm'],['Klikken',arNum(c.linkClicks||c.clicks),'linkClicks'],['CTR',arPct(c.ctr),'ctr'],['CPC',arEur(c.cpc,cur),'cpc']];
  if(hasLeads){ items.push(['Leads',arNum(c.leads),'leads']); items.push(['CPL',c.leads?arEur(c.cpl,cur):'-','cpl']); }
  items.push(['Frequentie',arDec(c.frequency,2),'frequency']);
  return adsCampKpiGrid('meta',c,cur,items);
}
/* ---- sorteerbare tabellen (adsets + ads met gelijke-naam-merge) ---- */
// CANONIEKE Meta-kolomvolgorde: Besteed → Vert. → Bereik → CPM → Klikken → CTR → CPC → Leads → CPL → Freq.
var AR_ADSET_COLS=[['name','Adset',0],['status','Status',0],['spend','Besteed',1],['impressions','Vert.',1],['reach','Bereik',1],['cpm','CPM',1],['linkClicks','Klikken',1],['ctr','CTR',1],['cpc','CPC',1],['leads','Leads',1],['cpl','CPL',1],['frequency','Freq.',1]];
var AR_AD_COLS=[['name','Advertentie',0],['status','Status',0],['spend','Besteed',1],['impressions','Vert.',1],['reach','Bereik',1],['cpm','CPM',1],['linkClicks','Klikken',1],['ctr','CTR',1],['cpc','CPC',1],['leads','Leads',1],['cpl','CPL',1]];
function arSortState(cid,which){ state._arSort=state._arSort||{}; state._arSort[cid]=state._arSort[cid]||{}; if(!state._arSort[cid][which]) state._arSort[cid][which]={key:'spend',dir:-1}; return state._arSort[cid][which]; }
function _arCmpVal(a,b,s){ var k=s.key, c; if(k==='name'||k==='status'){ c=String(a[k]||'').localeCompare(String(b[k]||''),'nl'); } else { c=(Number(a[k])||0)-(Number(b[k])||0); } return c*s.dir; }
function _arFindCamp(cid){ var m=(window.S27DATA&&S27DATA.metaAdsRich&&S27DATA.metaAdsRich()); if(!m||!m.campaigns) return null; for(var i=0;i<m.campaigns.length;i++){ if(String(m.campaigns[i].id)===String(cid)) return m.campaigns[i]; } return null; }
function _arCur(){ var m=(window.S27DATA&&S27DATA.metaAdsRich&&S27DATA.metaAdsRich()); return (m&&m.currency)||'EUR'; }
// advertenties met dezelfde naam samenvoegen (★). LOSSE ads (count=1) behouden de exacte
// Graph-ratio's (ctr/cpc/cpl) zodat ze matchen met Ads Manager + de adset-tabel; enkel bij een
// ECHTE merge (count>1) herberekenen we uit de gesommeerde metrics (Graph levert geen aggregaat).
function adsRichMergeAds(ads){
  var map={}, order=[];
  (ads||[]).forEach(function(a){ var nm=a.name||'(naamloos)'; if(!map[nm]){ map[nm]={name:nm,count:0,spend:0,impressions:0,reach:0,clicks:0,linkClicks:0,leads:0,status:a.status,_ctr:Number(a.ctr)||0,_cpc:Number(a.cpc)||0,_cpl:Number(a.cpl)||0,_cpm:Number(a.cpm)||0}; order.push(nm); } var g=map[nm]; g.count++; g.spend+=a.spend||0; g.impressions+=a.impressions||0; g.reach+=Number(a.reach)||0; g.clicks+=a.clicks||0; g.linkClicks+=a.linkClicks||0; g.leads+=a.leads||0; });
  return order.map(function(nm){ var g=map[nm];
    // Bug Johanna: reach/cpm werden niet meegenomen -> 0 per advertentie. Nu: reach optellen (zoals vertoningen),
    // cpm herberekenen uit spend/vertoningen (bij 1 ad == de Graph-waarde, bij merge een correct aggregaat).
    if(g.count>1){ g.ctr=g.impressions?(g.clicks/g.impressions*100):0; g.cpc=g.clicks?(g.spend/g.clicks):0; g.cpl=g.leads?(g.spend/g.leads):0; g.cpm=g.impressions?(g.spend/g.impressions*1000):0; g.merged=true; }
    else { g.ctr=g._ctr; g.cpc=g._cpc; g.cpl=g._cpl; g.cpm=g._cpm; g.merged=false; }
    return g;
  });
}
function _arGridCols(cols){ return cols.map(function(col,i){ return i===0?'minmax(190px,2.2fr)':(col[0]==='status'?'46px':(col[2]?'minmax(72px,1fr)':'minmax(96px,1fr)')); }).join(' '); }
function _arCell(key,r,cur){
  switch(key){
    case 'name': var _nm='<span class="ar-nm" title="'+esc(r.name||'')+'">'+esc(r.name||'-')+'</span>'+(r.merged?' <span class="ar-star" title="'+r.count+' advertenties met dezelfde naam, samengeteld">★'+r.count+'</span>':''); return r._cid?'<button class="ar-namebtn" type="button" onclick="adsRichAdVisual(\''+esc(r._cid)+'\',\''+encodeURIComponent(r.name||'')+'\')" title="Bekijk de visual van deze advertentie">'+_nm+'</button>':_nm;
    case 'status': return adsRichStatus(r.status);
    case 'text': return '<span class="ar-nm" title="'+esc(r.text||'')+'">'+esc(r.text||'-')+'</span>';
    case 'matchType': return esc(_gMatch(r.matchType));
    case 'campaign': return '<span class="ar-nm" title="'+esc(r.campaign||'')+'">'+esc(r.campaign||'')+'</span>';
  }
  var v;
  switch(key){
    case 'spend': v=arEur(r.spend,cur); break;
    case 'impressions': v=arNum(r.impressions); break;
    case 'reach': v=arNum(r.reach); break;
    case 'clicks': v=arNum(r.clicks); break;
    case 'linkClicks': v=arNum(r.linkClicks||r.clicks); break;
    case 'ctr': v=arPct(r.ctr); break;
    case 'cpc': v=arEur(r.cpc,cur); break;
    case 'cpm': v=arEur(r.cpm,cur); break;
    case 'leads': v=arNum(r.leads); break;
    case 'cpl': v=r.leads?arEur(r.cpl,cur):'-'; break;
    case 'frequency': v=arDec(r.frequency,2); break;
    case 'conversions': v=arDec(r.conversions,2); break;
    case 'costPerConv': v=r.conversions?arEur(r.costPerConv,cur):'-'; break;
    case 'convValue': v=arEur(r.convValue,cur); break;
    case 'convRate': v=arPct(r.convRate); break;
    default: return '';
  }
  var d=arRowDelta(r,key,cur);
  return v+(d?'<span class="ar-tdd">'+d+'</span>':'');
}
function _arTable(which,cid,cols,s,rows,cur,emptyMsg){
  var tpl=_arGridCols(cols);
  var head=cols.map(function(col){ var on=s.key===col[0]; var arr=on?(s.dir<0?' ▼':' ▲'):''; return '<button class="ar-th'+(col[2]?' num':'')+(on?' on':'')+'" onclick="adsRichSort(\''+esc(cid)+'\',\''+which+'\',\''+col[0]+'\')">'+esc(col[1])+arr+'</button>'; }).join('');
  var body=rows.length? rows.map(function(r){ return '<div class="ar-trow" style="grid-template-columns:'+tpl+'">'+cols.map(function(col){ return '<span class="ar-td'+(col[2]?' num':'')+'">'+_arCell(col[0],r,cur)+'</span>'; }).join('')+'</div>'; }).join('') : '<div class="ar-empty">'+esc(emptyMsg)+'</div>';
  var title=which==='adsets'?'Adsets':'Advertenties';
  return '<div class="ar-table" id="art_'+which+'_'+esc(cid)+'"><div class="ar-tabtitle">'+title+' <span class="count">'+rows.length+'</span></div><div class="ar-tscroll"><div class="ar-thead" style="grid-template-columns:'+tpl+'">'+head+'</div>'+body+'</div></div>';
}
function adsRichAdsetTable(c,cur){ var s=arSortState(c.id,'adsets'); var rows=(c.adsets||[]).slice().sort(function(a,b){return _arCmpVal(a,b,s);}); return _arTable('adsets',c.id,_adsColsForCampaign(AR_ADSET_COLS,c),s,rows,cur,'Geen adsets met data in deze periode.'); }
function adsRichAdTable(c,cur){ var s=arSortState(c.id,'ads'); var rows=adsRichMergeAds(c.ads).sort(function(a,b){return _arCmpVal(a,b,s);}); rows.forEach(function(r){r._cid=c.id;}); return _arTable('ads',c.id,_adsColsForCampaign(AR_AD_COLS,c),s,rows,cur,'Geen advertenties met data in deze periode.'); }
function adsRichSort(cid,which,key){ var s=arSortState(cid,which); if(s.key===key){ s.dir=-s.dir; } else { s.key=key; s.dir=(key==='name'||key==='status')?1:-1; } var c=_arFindCamp(cid); if(!c) return; var host=document.getElementById('art_'+which+'_'+cid); if(host){ host.outerHTML=(which==='adsets'?adsRichAdsetTable(c,_arCur()):adsRichAdTable(c,_arCur())); } }
/* ---- optimalisatie-aanbevelingen (data-gedreven heuristieken) ---- */
// Lijst-vorm (gedeeld door de schermweergave + de PDF-export): [severity, titel, body].
function adsRichOptimList(camps){
  var recs=[];
  (camps||[]).forEach(function(c){
    if(c.frequency>7) recs.push(['orange','Hoge frequentie bij “'+(c.name||'campagne')+'”','Frequentie '+arDec(c.frequency,1)+'×, dezelfde mensen zien je ad vaak. Overweeg nieuwe visuals of een breder publiek.']);
    if((c.adsets||[]).length>1){ var tot=c.adsets.reduce(function(a,x){return a+(x.spend||0);},0); var top=c.adsets.slice().sort(function(a,b){return b.spend-a.spend;})[0]; if(tot>0 && top && top.spend/tot>0.6) recs.push(['blue','Budget geconcentreerd in “'+(c.name||'campagne')+'”','Eén adset (“'+(top.name||'')+'”) neemt '+Math.round(top.spend/tot*100)+'% van het budget. Check of de andere adsets genoeg kans krijgen.']); }
    var ads=adsRichMergeAds(c.ads||[]); if(ads.length>3){ var totA=ads.reduce(function(a,x){return a+(x.spend||0);},0); var top3=ads.slice().sort(function(a,b){return b.spend-a.spend;}).slice(0,3).reduce(function(a,x){return a+(x.spend||0);},0); if(totA>0 && top3/totA>0.5) recs.push(['blue','Spend op enkele ads in “'+(c.name||'campagne')+'”','De top 3 advertenties nemen '+Math.round(top3/totA*100)+'% van het budget. Pauzeer zwakke ads of test nieuwe varianten.']); }
    if((c.leads||0)===0 && (c.linkClicks||c.clicks||0)>500) recs.push(['red','Klikken zonder leads bij “'+(c.name||'campagne')+'”',(c.linkClicks||c.clicks)+' klikken maar 0 leads. Controleer de landingspagina/het formulier of het meten van je leads.']);
  });
  if(!recs.length) recs.push(['green','Geen knelpunten gevonden','De campagnes draaien gezond binnen de gangbare richtlijnen voor deze periode.']);
  return recs;
}
function adsRichOptim(camps,cur){
  return adsWsRecsRender(adsRichOptimList(camps));
}
/* ---- Chart.js (lazy via CDN), per-campagne dag-evolutie ---- */
function adsRichLoadChart(){ return new Promise(function(res){ if(window.Chart) return res(true); var ex=document.getElementById('s27-chartjs'); if(ex){ ex.addEventListener('load',function(){res(!!window.Chart);}); ex.addEventListener('error',function(){res(false);}); return; } var el=document.createElement('script'); el.id='s27-chartjs'; el.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js'; el.onload=function(){res(!!window.Chart);}; el.onerror=function(){res(false);}; document.head.appendChild(el); }); }
function _arDayLabel(ymd){ var m=String(ymd||'').match(/(\d{4})-(\d{2})-(\d{2})/); return m?(m[3]+'/'+m[2]):(ymd||''); }
function adsRichMountCharts(){
  if(!isRichView()) return;
  var m=(window.S27DATA&&S27DATA.metaAdsRich&&S27DATA.metaAdsRich()); if(!m||!m.linked||!m.campaigns) return;
  adsRichLoadChart().then(function(ok){ if(!ok||!window.Chart) return; m.campaigns.forEach(function(c){ if(!adsCampCollapsed(c.id)) adsRichBuildChart(c, m.currency||'EUR'); }); });
}
// Per-campagne dag-grafiek (taak 3): zelfde klikbare selector-mechaniek als het overzicht, per campagne gesleuteld.
function adsRichBuildChart(c,cur){
  adsBuildSelChart({ canvasId:'arch_'+c.id, chartKey:c.id, rows:(c.daily||[]),
    metrics:adsSelMetrics('meta'), sel:adsCampSel('meta',c.id), cur:cur,
    has:function(k){ return (c.daily||[]).some(function(d){ return Number(k==='linkClicks'?(d.linkClicks||d.clicks):d[k])>0; }); } });
}
// Dag-rijen voor de CLIENT-grafiek: account-trend[] (date,spend,clicks,impressions) of, indien aanwezig,
// per-campagne daily[] (rijkere bron). Hergebruikt de team-grafiekbouwer zodat client = team-look.
function _adsClientRows(m){
  var camps=(m.campaigns||[]);
  var hasDaily=camps.some(function(c){return (c.daily||[]).length;});
  return hasDaily ? _adsRowsFromCampaigns(camps) : (m.trend||[]);
}
function adsClientBuildChart(m,cur){
  var camps=(m.campaigns||[]); var hasDaily=camps.some(function(c){return (c.daily||[]).length;});
  adsBuildSelChart({ canvasId:'arch_account', chartKey:'account', rows:_adsClientRows(m),
    metrics:adsSelMetrics('meta'), sel:adsChartSel('meta'), cur:cur,
    has:function(key){
      var f=(key==='linkClicks')?['linkClicks','clicks']:[key];
      if(hasDaily) return camps.some(function(c){ return (c.daily||[]).some(function(d){ return f.some(function(ff){return Number(d[ff])>0;}); }); });
      return (m.trend||[]).some(function(d){ return f.some(function(ff){return Number(d[ff])>0;}); });
    } });
}
function adsOverviewInner(){
  var m=(window.S27DATA&&S27DATA.metaAds&&S27DATA.metaAds())||{}; var cur=m.currency||'EUR';
  if(m.error){ return '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3)">De real-time Meta-data is even niet beschikbaar. Probeer straks opnieuw.</div>'; }
  var k=m.kpis||{}, pv=m.prevKpis||null, clab=m.compareLabel||'';
  var resd = pv?('<div class="ads-reschip-d">'+adsKpiDelta(k.results,pv.results)+'<span>vs '+esc(clab)+'</span></div>'):'';
  var resChip='<div class="ads-reschip"><div class="ads-reschip-ic">'+ic('st_approved',20)+'</div><div class="ads-reschip-tx"><div class="ads-reschip-lab">Resultaten in deze periode</div><div class="ads-reschip-num">'+adsNum(k.results)+'</div></div>'+resd+'</div>';
  // #17: identiek aan de team-weergave, zelfde klikbare KPI-kaarten + dezelfde Chart.js dag-grafiek.
  var grid=adsRichKpiGrid(k, pv, cur, clab);
  var rows=_adsClientRows(m);
  var chart='<div class="ar-camp" style="margin-top:14px"><div class="ar-camp-head"><span class="ar-camp-nm">Overzicht per dag</span></div>'
    +(rows.length>1?'<div class="ar-chartwrap"><canvas id="arch_account"></canvas></div>':'<div class="sr-chempty">Nog te weinig dagen met data om een grafiek te tonen in deze periode.</div>')+'</div>';
  var camps=(m.campaigns||[]).slice().sort(function(a,b){return (b.spend||0)-(a.spend||0);});
  var campSec='<div class="section-head"><h2>Actieve campagnes</h2><span class="count">'+camps.length+'</span></div>'+(camps.length?camps.map(function(c){return metaCampaignCard(c,cur);}).join(''):'<div class="card" style="padding:22px;text-align:center;color:var(--ink-3)">Geen campagnes met besteding in deze periode.</div>');
  _adsDeferClientMount();
  return '<div class="ads-ovw">'+resChip+grid+chart+'<div class="ads-camps">'+campSec+'</div></div>';
}

/* =============================================================================
   GOOGLE ADS, client-weergave (beknopt, real-time). Meta/Google-schakelaar op de
   bestaande platform-scaffolding (setAdsPlatform / state._adsPlatform / ADS_PLAT).
   Hergebruikt dezelfde periodebalk (adsPeriodBar/adsReload) + KPI-/trend-helpers als
   Meta. Geen creatives (Google Ads kent geen vergelijkbaar visueel postmodel).
   ============================================================================= */
function adsActivePlatform(){ return state._adsPlatform==='google'?'google':'meta'; }
function adsPlatStyles(){ if(document.getElementById('adsPlatStyles'))return; var s=document.createElement('style'); s.id='adsPlatStyles'; s.textContent='.ads-platsw{display:inline-flex;gap:5px;background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.42));-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);border:1px solid var(--glass-border,rgba(255,255,255,.6));border-radius:999px;padding:5px;margin:2px 0 16px;box-shadow:var(--glass-sh,0 8px 24px rgba(60,40,80,.09)),inset 0 1px 0 rgba(255,255,255,.7)}.ads-plat{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;font:inherit;font-weight:700;font-size:13px;color:var(--ink-3);padding:8px 16px;border-radius:999px;cursor:pointer;transition:all .18s var(--ease-out,ease)}.ads-plat:hover{color:var(--ink)}.ads-plat.active{background:linear-gradient(180deg,#fff,#f7f3ec);color:var(--ink);box-shadow:0 2px 8px rgba(35,15,35,.13),inset 0 1px 0 #fff}.ads-platdot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.5)}.ads-ovw{display:flex;flex-direction:column;gap:16px}.ads-ovw>.ads-reschip{margin:0}.ads-camps .section-head{margin-top:0}.ar-ckd{display:block;font-size:10px;line-height:1.15;margin-top:1px}.ar-td.num{flex-direction:column;align-items:flex-end;gap:1px}.ar-tdd{display:block;font-size:9.5px;line-height:1.1}.ar-namebtn{border:0;background:transparent;padding:0;font:inherit;color:inherit;text-align:left;cursor:pointer;border-bottom:1px dashed var(--line,#E7DFD3)}.ar-namebtn:hover{color:var(--s27-blue-ink,#1F5FA8);border-bottom-color:currentColor}'; document.head.appendChild(s); }
// item 5: platform-keuze als compacte dropdown-knop (i.p.v. pill-rij). In team-view zit hij in de
// subnav-balk (adsRichSubnav/googleRichSubnav); in klant-view bovenaan naast de periode-knop.
function adsPlatformPicker(){
  adsPlatStyles(); _adsInstallMenuCloser();
  var p=adsActivePlatform(); var open=!!state._adsPlatMenuOpen; var curp=adsPlat(p==='google'?'google':'meta');
  function opt(id){ var pl=adsPlat(id==='google'?'google':'meta'); return '<button class="ads-platpick-opt'+(p===id?' active':'')+'" onclick="setAdsPlatform(\''+id+'\')"><span class="ads-platdot" style="background:'+pl[1]+'"></span>'+esc(pl[0])+'</button>'; }
  return '<div class="ads-platpick'+(open?' open':'')+'">'
    +'<button class="ads-platpick-btn" onclick="adsPlatPickToggle()" aria-expanded="'+(open?'true':'false')+'" title="Wissel van platform"><span class="ads-platdot" style="background:'+curp[1]+'"></span><span class="ads-platpick-nm">'+esc(curp[0])+'</span>'+_adsChevDown()+'</button>'
    +'<div class="ads-platpick-menu'+(open?' open':'')+'" id="adsPlatMenu"><div class="ads-platpick-hd">Platform</div>'+opt('meta')+opt('google')+'</div>'
  +'</div>';
}
function adsPlatPickToggle(){ state._adsPlatMenuOpen=!state._adsPlatMenuOpen; var m=document.getElementById('adsPlatMenu'); if(!m) return; var w=m.parentNode; m.classList.toggle('open',state._adsPlatMenuOpen); if(w){ w.classList.toggle('open',state._adsPlatMenuOpen); var b=w.querySelector('.ads-platpick-btn'); if(b) b.setAttribute('aria-expanded',state._adsPlatMenuOpen?'true':'false'); } }
// back-compat alias (oude call-sites)
function adsPlatformSwitch(){ return adsPlatformPicker(); }
function googleAdsBody(){
  var g=(window.S27DATA&&S27DATA.googleAds&&S27DATA.googleAds())||null;
  if(g===null){
    var tries=state._gadsTries||0;
    if(!state.demoMode && window.S27DATA && S27DATA.loadGoogleAds && tries<4){
      var _now=Date.now();
      if(!state._gadsAt || _now-state._gadsAt>2500){
        state._gadsAt=_now; var pp=adsPeriod();
        S27DATA.loadGoogleAds({from:pp.from,to:pp.to,compare:pp.compare}).then(function(loaded){
          if(!(adsActivePlatform()==='google' && document.querySelector('.panel[data-screen-label="advertenties"]'))) return;
          if(loaded){ state._gadsTries=0; renderPanel('advertenties'); }
          else { state._gadsTries=(state._gadsTries||0)+1; setTimeout(function(){ if(adsActivePlatform()==='google' && document.querySelector('.panel[data-screen-label="advertenties"]')) renderPanel('advertenties'); }, 2600); }
        }).catch(function(){ state._gadsTries=(state._gadsTries||0)+1; });
      }
      return '<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Je Google Ads-campagnes worden real-time opgehaald…</p></div>';
    }
    return '<div class="card" style="padding:26px;text-align:center;color:var(--ink-3)">Je Google Ads-campagnes konden even niet geladen worden.<br><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="adsGoogleRetry()">'+ic('arrow',14)+' Opnieuw proberen</button></div>';
  }
  if(!g.linked){ return '<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">Nog geen Google Ads-account gekoppeld</div><div style="color:var(--ink-3);max-width:470px;margin:0 auto;line-height:1.55">Zodra je Google Ads-account aan je portaal gekoppeld is, zie je hier real-time je campagnes en cijfers. Vraag gerust je contactpersoon bij Studio&nbsp;27.</div></div>'; }
  return '<div id="adsBody">'+googleOverviewInner()+'</div>';   // periode zit nu in de client-menubalk (adsClientChrome)
}
function googleClientBuildChart(g,cur){
  var camps=(g.campaigns||[]); var hasDaily=camps.some(function(c){return (c.daily||[]).length;});
  var rows=hasDaily?_adsRowsFromCampaigns(camps):(g.trend||[]);
  adsBuildSelChart({ canvasId:'garch_account', chartKey:'gaccount', rows:rows,
    metrics:adsSelMetrics('google'), sel:adsChartSel('google'), cur:cur,
    has:function(key){
      if(hasDaily) return camps.some(function(c){ return (c.daily||[]).some(function(d){ return Number(d[key])>0; }); });
      return (g.trend||[]).some(function(d){ return Number(d[key])>0; });
    } });
}
function googleOverviewInner(){
  var g=(window.S27DATA&&S27DATA.googleAds&&S27DATA.googleAds())||{}; var cur=g.currency||'EUR';
  if(g.error){ return '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3)">De real-time Google Ads-data is even niet beschikbaar. Probeer straks opnieuw.</div>'; }
  var k=g.kpis||{}, pv=g.prevKpis||null, clab=g.compareLabel||'';
  // Taak 12: de losse "Conversies in deze periode"-blok is verwijderd; conversies blijft als gewone
  // klikbare parameter in de KPI-rij (googleRichKpiGrid) hieronder.
  var grid=googleRichKpiGrid(k, pv, cur, clab);
  var camps0=(g.campaigns||[]); var hasDaily=camps0.some(function(c){return (c.daily||[]).length;});
  var rows=hasDaily?_adsRowsFromCampaigns(camps0):(g.trend||[]);
  var chart='<div class="ar-camp" style="margin-top:14px"><div class="ar-camp-head"><span class="ar-camp-nm">Overzicht per dag</span></div>'
    +(rows.length>1?'<div class="ar-chartwrap"><canvas id="garch_account"></canvas></div>':'<div class="sr-chempty">Nog te weinig dagen met data om een grafiek te tonen in deze periode.</div>')+'</div>';
  var camps=camps0.slice().sort(function(a,b){return (b.spend||0)-(a.spend||0);});
  var campSec='<div class="section-head"><h2>Actieve campagnes</h2><span class="count">'+camps.length+'</span></div>'+(camps.length?camps.map(function(c){return googleCampaignCard(c,cur);}).join(''):'<div class="card" style="padding:22px;text-align:center;color:var(--ink-3)">Geen campagnes met besteding in deze periode.</div>');
  _adsDeferClientMount();
  return '<div class="ads-ovw">'+grid+chart+'<div class="ads-camps">'+campSec+'</div></div>';
}
function googleCampaignCard(c,cur){
  var ms=[['Besteed',metaEur(c.spend,cur),'spend'],['Vertoningen',adsNum(c.impressions),'impressions'],['Klikken',adsNum(c.clicks),'clicks'],['CPC',metaEur(c.cpc,cur),'cpc'],['CTR',(Number(c.ctr)||0).toLocaleString('nl-BE',{maximumFractionDigits:2})+'%','ctr'],['Leads',adsNum(c.results),'results']];
  var chan=c.objective?'<span class="fs" style="color:var(--ink-4)">'+esc(c.objective)+'</span>':'';
  return '<div class="card" style="padding:14px 16px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:11px"><span class="pill pill-prog"><span class="pdot"></span>Live</span><b style="font-family:var(--font-display);font-size:15px;flex:1;min-width:130px">'+esc(c.name||'Campagne')+'</b>'+chan+'</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:10px">'+ms.map(function(m){var d=arRowDelta(c,m[2],cur);return '<div><div style="color:var(--ink-4);font-size:11px;font-weight:600">'+m[0]+'</div><div style="font-family:var(--font-display);font-weight:800;font-size:16px;color:var(--ink)">'+m[1]+'</div>'+(d?'<div class="ar-ckd">'+d+'</div>':'')+'</div>';}).join('')+'</div></div>';
}
function gadsTrendOn(){ if(!state._gadsTrendOn) state._gadsTrendOn={spend:true,clicks:true,impressions:false}; return state._gadsTrendOn; }
function gadsToggleTrend(metric){ var on=gadsTrendOn(); on[metric]=!on[metric]; var box=document.getElementById('gadsTrendBox'); if(box) box.outerHTML=googleTrendBlock(); }
function googleTrendBlock(){
  var g=(window.S27DATA&&S27DATA.googleAds&&S27DATA.googleAds())||{}; var tr=g.trend||[]; var cur=g.currency||'EUR'; var on=gadsTrendOn();
  var chips=['spend','clicks','impressions'].map(function(x){ var mm=ADS_TREND_META[x]; var tot=tr.reduce(function(a,d){return a+(Number(d[x])||0);},0); var tl=x==='spend'?metaEur(tot,cur):adsNum(tot); return '<button class="ads-tchip'+(on[x]?' on':'')+'" onclick="gadsToggleTrend(\''+x+'\')" style="--tc:'+mm[1]+'"><span class="ads-tdot"></span>'+esc(mm[0])+' <b>'+tl+'</b></button>'; }).join('');
  var svg=(tr.length<2)?'<div class="ads-tempty">Nog te weinig data voor een trend in deze periode.</div>':adsTrendSVG(tr,on);
  return '<div class="card ads-trend" id="gadsTrendBox" style="padding:15px 18px 12px"><div class="ads-thead"><h3>Evolutie per dag</h3><div class="ads-tchips">'+chips+'</div></div>'+svg+'</div>';
}
/* =============================================================================
   GOOGLE ADS, TEAM-WEERGAVE (uitgebreide rapportage, staff). Spiegelt de Meta-rich-
   view (zelfde ar- en arkpi-CSS + Chart.js + subnav-tabs), maar met Google-metrics:
   conversies/waarde/CPA/conv.ratio + vertonings-aandeel + adgroep-breakdown + zoekwoorden.
   Data via S27DATA.googleAdsRich() (worker googleAdsRich, is_staff-gated, acting-as).
   ============================================================================= */
function googleRichNotLinked(){
  // Team-weergave: toon de ECHTE reden (uit de worker) zodat een teamlid meteen weet wat te doen
  // i.p.v. een eindeloze laadspinner. 'bad_id' = veld bevat geen 10-cijferig klant-id; 'account_error' =
  // id klopt qua vorm maar Google geeft geen toegang; 'no_token' = server-koppeling ontbreekt.
  var g=(window.S27DATA&&S27DATA.googleAdsRich&&S27DATA.googleAdsRich())||{};
  var r=g.reason||'', title, body;
  if(r==='bad_id'){
    title='Google Ads ID lijkt niet te kloppen';
    body='Het veld &ldquo;Google Ads ID&rdquo; van dit bedrijf bevat '+(g.account?('&ldquo;<b>'+esc(g.account)+'</b>&rdquo;'):'een waarde')+', maar een Google Ads klant-id bestaat uit <b>10 cijfers</b> (formaat 123-456-7890). Corrigeer het bij de bedrijfsgegevens.';
  } else if(r==='account_error'){
    title='Google Ads-account niet bereikbaar';
    body='Het klant-id is ingevuld, maar Google geeft geen data terug. Controleer of het id klopt en of dit account onder het beheeraccount (MCC) van Studio&nbsp;27 hangt.'+(g.detail?'<br><span style="font-size:12px;color:var(--ink-4)">'+esc(g.detail)+'</span>':'');
  } else if(r==='no_token'){
    title='Google Ads-koppeling ontbreekt';
    body='De Google Ads API-koppeling (developer- of refresh-token) is niet ingesteld op de server.';
  } else {
    title='Nog geen Google Ads-account gekoppeld';
    body='Koppel het Google Ads-klant-id van deze klant (veld &ldquo;Google Ads ID&rdquo; bij de bedrijfsgegevens) om hier de uitgebreide rapportage te zien.';
  }
  return '<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">'+title+'</div><div style="color:var(--ink-3);max-width:480px;margin:0 auto;line-height:1.55">'+body+'</div></div>';
}
function _gCur(){ var g=(window.S27DATA&&S27DATA.googleAdsRich&&S27DATA.googleAdsRich()); return (g&&g.currency)||'EUR'; }
function _gFindCamp(cid){ var g=(window.S27DATA&&S27DATA.googleAdsRich&&S27DATA.googleAdsRich()); if(!g||!g.campaigns) return null; for(var i=0;i<g.campaigns.length;i++){ if(String(g.campaigns[i].id)===String(cid)) return g.campaigns[i]; } return null; }
function _gMatch(mt){ return ({EXACT:'Exact',PHRASE:'Zinsdeel',BROAD:'Breed',BROAD_MATCH_MODIFIER:'Breed+'})[String(mt||'').toUpperCase()]||(mt?_titleCase(mt):'-'); }
function googleAdsBodyRich(){ return adsRichChrome(googleRichSubnav())+'<div id="adsBody">'+googleRichTabBody()+'</div>'+googleRichPdfFooter(); }
function googleRichSubnav(){
  var t=adsRichTab();
  var tabs=[['samengevat','Samengevat','st_progress'],['campagnes','Campagnes','cal'],['conversies','Leads','st_approved'],['evolutie','Evolutie','st_progress'],['gegevens','Zoektermen','st_approved'],['aanbevelingen','Aanbevelingen','msg']];   // 'Zoekwoorden'->'Zoektermen'; 'Leads'-tab (intern key 'conversies') = Bug Arne; 'Evolutie' = maand-op-maand leads per type (wens Arne)
  if(isRichView()) tabs.push(['meeting','Meeting','img']);
  var tabsHtml=tabs.map(function(x){ return '<button class="soc-subtab'+(t===x[0]?' active':'')+'" data-atab="'+x[0]+'" onclick="adsRichSetTab(\''+x[0]+'\')">'+ic(x[2],17)+'<span>'+esc(x[1])+'</span></button>'; }).join('');
  return '<div class="soc-subnav-row"><div class="soc-subnav" id="adsSubnav">'+tabsHtml+'</div><div class="soc-subnav-act">'+adsNoteBtn()+adsPeriodBar()+'</div></div>';
}
function googleRichTabBody(){
  if(adsRichTab()==='meeting') return adsWsMeetingTab();
  var g=(window.S27DATA&&S27DATA.googleAdsRich&&S27DATA.googleAdsRich());
  if(g===undefined||g===null){
    var tries=state._gadsRichTries||0;
    if(!state.demoMode && window.S27DATA && S27DATA.loadGoogleAdsRich && tries<4){
      var _now=Date.now();
      // timestamp-backoff i.p.v. een boolean die kan blijven hangen; transiente fout -> data=null -> hier opnieuw proberen
      if(!state._gadsRichAt || _now-state._gadsRichAt>2500){
        state._gadsRichAt=_now; var pp=adsPeriod();
        S27DATA.loadGoogleAdsRich({from:pp.from,to:pp.to,compare:pp.compare}).then(function(loaded){
          if(!(isRichView()&&adsActivePlatform()==='google'&&document.querySelector('.panel[data-screen-label="advertenties"]'))) return;
          var b=document.getElementById('adsBody'); if(!b) return;
          if(loaded){ state._gadsRichTries=0; b.innerHTML=googleRichTabBody(); googleRichMountTabCharts(); }
          else { state._gadsRichTries=(state._gadsRichTries||0)+1; setTimeout(function(){ if(isRichView()&&adsActivePlatform()==='google'){ var bb=document.getElementById('adsBody'); if(bb){ bb.innerHTML=googleRichTabBody(); googleRichMountTabCharts(); } } }, 2600); }
        }).catch(function(){ state._gadsRichTries=(state._gadsRichTries||0)+1; });
      }
      return '<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>De uitgebreide Google-rapportage wordt opgehaald…</p></div>';
    }
    return '<div class="card" style="padding:26px;text-align:center;color:var(--ink-3)">De Google-data kon even niet opgehaald worden.<br><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="adsGoogleRetry()">'+ic('arrow',14)+' Opnieuw proberen</button></div>';
  }
  if(!g.linked) return googleRichNotLinked();
  if(g.error && !(g.campaigns&&g.campaigns.length) && !(g.kpis&&g.kpis.spend)) return '<div class="card" style="padding:26px;text-align:center;color:var(--ink-3)">De Google-data kon even niet opgehaald worden. Klik op verversen om opnieuw te proberen.</div>';
  var cur=g.currency||'EUR', t=adsRichTab();
  if(t==='campagnes') return googleRichCampagnes(g,cur);
  if(t==='conversies') return googleRichConversies(g,cur);
  if(t==='evolutie') return googleRichEvolutie();
  if(t==='gegevens') return googleRichKeywords(g,cur);
  if(t==='aanbevelingen') return googleRichOptim(g,cur);
  return googleRichSamengevat(g,cur);
}
function googleRichKpiGrid(k,p,cur,cmpLabel){ return adsKpiGridGeneric('google',k,p,cur,cmpLabel); }
/* Gedeelde KPI-grid-bouwer (team + client view). KPI-kaarten die overeenkomen met een plotbare dag-reeks
   (zie ADS_SEL_METRICS) zijn klikbaar en schakelen die reeks in/uit de dag-grafiek (#15/#17). De ratio-/
   aggregaatkaarten (CPC/CPM/CTR/CPL/bereik/freq) blijven gewoon informatief. */
function adsKpiGridGeneric(plat,k,p,cur,cmpLabel){
  adsChartStyles();
  var g=(plat==='google');
  var fE=function(v){return arEur(v,cur);}, fN=function(v){return arNum(v);}, fD=function(v){return arDec(v,2);};
  var selMap={}; adsSelMetrics(plat).forEach(function(m){ selMap[m.key]=m; });
  var sel=adsChartSel(plat);
  function card(lab,val,key,invert,fmt){
    var d='';
    if(p){
      if(ADS_NEUTRAL_CMP[key]) d=arCmpNeutral(k[key],p[key], fmt||(key==='convRate'?function(v){return arPct(v);}:function(v){return arNum(v);}));
      else d=fmt?arCmpAbs(k[key],p[key],invert,fmt):arCmp(k[key],p[key],invert);
    }
    var sm=selMap[key];
    if(sm){
      var on=!!sel[key];
      return '<div class="arkpi arkpi-clk'+(on?' on':'')+'" data-arkpi-metric="'+esc(key)+'" data-arkpi-plat="'+plat+'" data-arkpi-scope="account" style="--arkpi-dot:'+sm.color+'" role="button" tabindex="0" title="Toon/verberg deze reeks in de grafiek" onclick="adsChartToggle(\''+plat+'\',\''+esc(key)+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();adsChartToggle(\''+plat+'\',\''+esc(key)+'\');}">'
        +'<div class="arkpi-l"><span class="arkpi-tg"></span>'+lab+'</div><div class="arkpi-v">'+val+'</div>'+(d?'<div class="arkpi-d">'+d+'</div>':'')+'</div>';
    }
    return '<div class="arkpi"><div class="arkpi-l">'+lab+'</div><div class="arkpi-v">'+val+'</div>'+(d?'<div class="arkpi-d">'+d+'</div>':'')+'</div>';
  }
  // CANONIEKE METRIEK-VOLGORDE (taak 1+7), elke metric is nu klikbaar (zit in ADS_SEL_METRICS).
  var cards;
  if(g){
    cards=[
      card('Besteed',arEur(k.spend,cur),'spend',true,fE),
      card('Vertoningen',arNum(k.impressions),'impressions',false,fN),
      card('CPM',arEur(k.cpm,cur),'cpm',true,fE),
      card('Klikken',arNum(k.clicks),'clicks',false,fN),
      card('CTR',arPct(k.ctr),'ctr',false,function(v){return arPct(v);}),   // punt Johanna: vorige CTR i.p.v. %-van-%
      card('CPC',arEur(k.cpc,cur),'cpc',true,fE),
      card('Leads',arDec(k.conversions,2),'conversions',false,fD),
      card('CPL',k.conversions?arEur(k.costPerConv,cur):'-','costPerConv',true,fE),
      card('Leadratio',arPct(k.convRate),'convRate',false)
    ];
  } else {
    var hasLeads=((Number(k.leads)||0)>0)||(p&&(Number(p.leads)||0)>0);
    cards=[
      card('Besteed bedrag', arEur(k.spend,cur), 'spend', true, fE),
      card('Vertoningen', arNum(k.impressions), 'impressions', false, fN),
      card('Bereik', arNum(k.reach), 'reach', false, fN),
      card('CPM', arEur(k.cpm,cur), 'cpm', true, fE),
      card('Klikken', arNum(k.linkClicks||k.clicks), 'linkClicks', false, fN),
      card('CTR', arPct(k.ctr), 'ctr', false, function(v){return arPct(v);}),   // punt Johanna: vorige CTR i.p.v. %-van-%
      card('CPC', arEur(k.cpc,cur), 'cpc', true, fE)
    ];
    if(hasLeads){ cards.push(card('Leads', arNum(k.leads), 'leads', false, fN)); cards.push(card('Cost per lead', k.leads?arEur(k.cpl,cur):'-', 'cpl', true, fE)); }
    cards.push(card('Frequentie', arDec(k.frequency,2), 'frequency', true, fD));
  }
  var note=(p && cmpLabel)?'<div class="arkpi-note">Vergeleken met '+esc(cmpLabel)+'</div>':'';
  return '<div class="ar-summary"><div class="ar-kpigrid">'+cards.join('')+'</div>'+note+'</div>';
}
function googleRichSamengevat(g,cur){
  var camps=(g.campaigns||[]);
  var hasDaily=camps.some(function(c){return (c.daily||[]).length>1;});
  return googleRichKpiGrid(g.kpis||{},g.prevKpis||null,cur,g.compareLabel)
    +'<div class="ar-camp" style="margin-top:14px"><div class="ar-camp-head"><span class="ar-camp-nm">Account-overzicht per dag</span></div>'
    +(hasDaily?'<div class="ar-chartwrap"><canvas id="garch_account"></canvas></div>':'<div class="sr-chempty">Nog te weinig dagen met data om een grafiek te tonen in deze periode.</div>')+'</div>';
}
function googleRichCampKpis(c,cur){
  // CANONIEKE Google-volgorde: Besteed → Vertoningen → CPM → Klikken → CTR → CPC → Leads → CPL → Leadratio.
  var items=[['Besteed',arEur(c.spend,cur),'spend'],['Vertoningen',arNum(c.impressions),'impressions'],['CPM',arEur(c.cpm,cur),'cpm'],['Klikken',arNum(c.clicks),'clicks'],['CTR',arPct(c.ctr),'ctr'],['CPC',arEur(c.cpc,cur),'cpc'],['Leads',arDec(c.conversions,2),'conversions'],['CPL',c.conversions?arEur(c.costPerConv,cur):'-','costPerConv'],['Leadratio',arPct(c.convRate),'convRate']];
  return adsCampKpiGrid('google',c,cur,items);
}
function googleRichCampaign(c,cur){
  var chan=c.channel?'<span class="ar-obj">'+esc(c.channel)+'</span>':'';
  var bud=c.budget?'<span class="ar-bud">'+arEur(c.budget,cur)+' /dag</span>':'';
  var is=(c.imprShare>0)?'<span class="ar-bud" title="Vertonings-aandeel zoeknetwerk">Vert.aandeel '+arPct(c.imprShare)+'</span>':'';
  return '<div class="ar-camp" data-cid="'+esc(c.id)+'">'
    +'<div class="ar-camp-head"><span class="ar-camp-nm">'+esc(c.name||'Campagne')+'</span><div class="ar-camp-meta">'+adsRichStatusLive(c)+chan+bud+is+'</div></div>'
    +googleRichCampKpis(c,cur)
    +(c.daily&&c.daily.length?'<div class="ar-chartwrap"><canvas id="garch_'+esc(c.id)+'"></canvas></div>':'')
    +googleRichCampConv(c,cur)
    +googleRichAdGroupTable(c,cur)
    +'</div>';
}
function googleRichCampagnes(g,cur){
  var camps=(g.campaigns||[]);
  if(!camps.length) return '<div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Geen campagnes met activiteit in deze periode.</div>';
  return camps.map(function(c){ return googleRichCampaign(c,cur); }).join('');
}
// CANONIEKE Google-kolomvolgorde: Besteed → Vert. → CPM → Klikken → CTR → CPC → Leads → CPL → Waarde → Leadratio.
var G_AG_COLS=[['name','Advertentiegroep',0],['status','Status',0],['spend','Besteed',1],['impressions','Vert.',1],['cpm','CPM',1],['clicks','Klikken',1],['ctr','CTR',1],['cpc','CPC',1],['conversions','Leads',1],['costPerConv','CPL',1],['convRate','Leadratio',1]];
var G_KW_COLS=[['text','Zoekterm',0],['matchType','Type',0],['campaign','Campagne',0],['spend','Besteed',1],['impressions','Vert.',1],['clicks','Klikken',1],['ctr','CTR',1],['cpc','CPC',1],['conversions','Leads',1]];   // zoektermen (search_term_view); CPM/CPL/Leadratio weggelaten (niet beschikbaar per zoekterm)
function _gTable(which,cid,cols,s,rows,cur,emptyMsg,title){
  var tpl=_arGridCols(cols);
  var head=cols.map(function(col){ var on=s.key===col[0]; var arr=on?(s.dir<0?' ▼':' ▲'):''; return '<button class="ar-th'+(col[2]?' num':'')+(on?' on':'')+'" onclick="googleRichSort(\''+esc(cid)+'\',\''+which+'\',\''+col[0]+'\')">'+esc(col[1])+arr+'</button>'; }).join('');
  var body=rows.length? rows.map(function(r){ return '<div class="ar-trow" style="grid-template-columns:'+tpl+'">'+cols.map(function(col){ return '<span class="ar-td'+(col[2]?' num':'')+'">'+_arCell(col[0],r,cur)+'</span>'; }).join('')+'</div>'; }).join('') : '<div class="ar-empty">'+esc(emptyMsg)+'</div>';
  return '<div class="ar-table" id="gart_'+which+'_'+esc(cid)+'"><div class="ar-tabtitle">'+esc(title)+' <span class="count">'+rows.length+'</span></div><div class="ar-tscroll"><div class="ar-thead" style="grid-template-columns:'+tpl+'">'+head+'</div>'+body+'</div></div>';
}
function googleRichAdGroupTable(c,cur){ var ags=(c.adGroups||[]); if(!ags.length) return ''; var s=arSortState('g_'+c.id,'ag'); var rows=ags.slice().sort(function(a,b){return _arCmpVal(a,b,s);}); return _gTable('ag',c.id,G_AG_COLS,s,rows,cur,'Geen advertentiegroepen met data.','Advertentiegroepen'); }
function _gKwSort(){ if(!state._gKwSort) state._gKwSort={key:'spend',dir:-1}; return state._gKwSort; }
function _gKwCampFilter(){ return state._gKwCamp||''; }
function googleRichKwInner(){ var f=_gKwCampFilter(); var rows=(state._gKw||[]).filter(function(k){ return !f || (k.campaign||'')===f; }); var s=_gKwSort(); rows.sort(function(a,b){return _arCmpVal(a,b,s);}); return _gTable('kw','all',G_KW_COLS,s,rows,_gCur(),(f?'Geen zoektermen voor deze campagne in deze periode.':'Geen zoektermen met vertoningen in deze periode.'),'Zoektermen'); }
// item 2: filter zoekwoorden op campagne; herrendert enkel de tabel (geen volledige paneel-rebuild)
function gKwSetCamp(v){ state._gKwCamp=v||''; var w=document.getElementById('gart_kw_all'); if(w) w.outerHTML=googleRichKwInner(); }
function googleRichKeywords(g,cur){
  state._gKw=(g.keywords||[]);
  if(!state._gKw.length){ state._gKwCamp=''; return '<div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Geen zoekterm-data in deze periode (enkel zoekcampagnes leveren zoektermen).</div>'; }
  var camps=[],seen={}; state._gKw.forEach(function(k){ var n=k.campaign||''; if(n&&!seen[n]){ seen[n]=1; camps.push(n); } }); camps.sort();
  if(state._gKwCamp && camps.indexOf(state._gKwCamp)<0) state._gKwCamp='';   // stale filter (ander bedrijf/periode) opruimen
  var filterUi = camps.length>1
    ? '<div class="ads-kwfilter"><span class="ads-kwfilter-lab">Campagne</span><select onchange="gKwSetCamp(this.value)" aria-label="Filter op campagne"><option value="">Alle campagnes</option>'+camps.map(function(n){ return '<option value="'+esc(n)+'"'+(_gKwCampFilter()===n?' selected':'')+'>'+esc(n)+'</option>'; }).join('')+'</select></div>'
    : '';
  return '<div class="card ads-card" style="padding:14px 16px">'+filterUi+'<div id="gKwWrap">'+googleRichKwInner()+'</div></div>';
}
function googleRichSort(cid,which,key){
  if(which==='kw'){ var sk=_gKwSort(); if(sk.key===key){ sk.dir=-sk.dir; } else { sk.key=key; sk.dir=(key==='text'||key==='matchType'||key==='campaign')?1:-1; } var w=document.getElementById('gart_kw_all'); if(w) w.outerHTML=googleRichKwInner(); return; }
  var ss=arSortState('g_'+cid,which); if(ss.key===key){ ss.dir=-ss.dir; } else { ss.key=key; ss.dir=(key==='name'||key==='status')?1:-1; }
  var c=_gFindCamp(cid); var host=document.getElementById('gart_'+which+'_'+cid); if(c&&host) host.outerHTML=googleRichAdGroupTable(c,_gCur());
}
/* ---- Conversies per type (Bug Arne, Google Ads) ----
   Data: g.conversionTypes (account-breed) + c.conversionTypes per campagne, elk [{name,category,count,value}].
   CPL per type = besteding van de scope / aantal van dat type (kost is niet per conversie-actie toewijsbaar). */
var G_CONV_SORT={key:'count',dir:-1};
function _gConvSortRows(rows){ var s=G_CONV_SORT; return rows.slice().sort(function(a,b){ var c; if(s.key==='name'){ c=String(a.name||'').localeCompare(String(b.name||''),'nl'); } else { c=(Number(a[s.key])||0)-(Number(b[s.key])||0); } return c*s.dir; }); }
function gConvSort(key){ var s=G_CONV_SORT; if(s.key===key){ s.dir=-s.dir; } else { s.key=key; s.dir=(key==='name')?1:-1; } var w=document.getElementById('gConvWrap'); if(w) w.innerHTML=googleRichConvInner(); }
function _gConvCampFilter(){ return state._gConvCamp||''; }
function gConvSetCamp(v){ state._gConvCamp=v||''; var w=document.getElementById('gConvWrap'); if(w) w.innerHTML=googleRichConvInner(); }
function _gConvCatFilter(){ return state._gConvCat||''; }
function gConvSetCat(v){ state._gConvCat=v||''; var w=document.getElementById('gConvWrap'); if(w) w.innerHTML=googleRichConvInner(); }
function _gConvTable(rows,spend,cur){
  var tpl='minmax(200px,2.6fr) minmax(90px,1fr) minmax(100px,1fr)';
  var cols=[['name','Type lead',0],['count','Aantal',1],['cpl','CPL',1]];
  var head=cols.map(function(col){ var on=G_CONV_SORT.key===col[0]; var arr=on?(G_CONV_SORT.dir<0?' ▼':' ▲'):''; return '<button class="ar-th'+(col[2]?' num':'')+(on?' on':'')+'" onclick="gConvSort(\''+col[0]+'\')">'+esc(col[1])+arr+'</button>'; }).join('');
  var body=rows.map(function(r){ return '<div class="ar-trow" style="grid-template-columns:'+tpl+'">'
    +'<span class="ar-td"><span class="ar-nm" title="'+esc(r.name||'')+'">'+esc(r.name||'-')+'</span></span>'
    +'<span class="ar-td num">'+arDec(r.count,2)+'</span>'
    +'<span class="ar-td num">'+(r.count?arEur(r.cpl,cur):'-')+'</span></div>'; }).join('');
  var totCount=rows.reduce(function(a,r){return a+(Number(r.count)||0);},0);
  var totCpl=totCount>0?spend/totCount:0;
  var totRow='<div class="ar-trow" style="grid-template-columns:'+tpl+';font-weight:800;border-top:2px solid var(--line)">'
    +'<span class="ar-td">Totaal</span><span class="ar-td num">'+arDec(totCount,2)+'</span><span class="ar-td num">'+(totCount?arEur(totCpl,cur):'-')+'</span></div>';
  return '<div class="ar-table"><div class="ar-tabtitle">Leads <span class="count">'+rows.length+'</span></div><div class="ar-tscroll"><div class="ar-thead" style="grid-template-columns:'+tpl+'">'+head+'</div>'+(rows.length?body+totRow:'<div class="ar-empty">Geen leads voor deze selectie.</div>')+'</div></div>';
}
function googleRichConvInner(){
  var g=state._gConvG||{}, cur=g.currency||'EUR';
  var campF=_gConvCampFilter(), catF=_gConvCatFilter();
  var rows, spend;
  if(campF){ var c=null; (g.campaigns||[]).forEach(function(x){ if(String(x.id)===String(campF)) c=x; }); rows=((c&&c.conversionTypes)||[]).slice(); spend=(c&&Number(c.spend))||0; }
  else { rows=(g.conversionTypes||[]).slice(); spend=(g.kpis&&Number(g.kpis.spend))||0; }
  if(catF){ var q=String(catF).toLowerCase(); rows=rows.filter(function(r){ return (r.name||'').toLowerCase().indexOf(q)>=0; }); }   // punt 8: vrije zoek (bevat) i.p.v. exacte keuze
  rows=rows.map(function(r){ var cnt=Number(r.count)||0; return {name:r.name,category:r.category,count:cnt,cpl:(cnt>0?spend/cnt:0)}; });
  rows=_gConvSortRows(rows);
  return _gConvTable(rows,spend,cur);
}
function googleRichConversies(g,cur){
  state._gConvG=g;
  var types=(g.conversionTypes||[]);
  if(!types.length){ state._gConvCamp=''; state._gConvCat=''; return '<div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Geen leaddata in deze periode. Zodra er leads gemeten worden in dit Google Ads-account, verschijnen ze hier uitgesplitst per type.</div>'; }
  var camps=(g.campaigns||[]).filter(function(c){ return ((c.conversionTypes)||[]).length; });
  if(state._gConvCamp && !camps.some(function(c){return String(c.id)===String(state._gConvCamp);})) state._gConvCamp='';
  var campSel = camps.length>1
    ? '<div class="ads-kwfilter"><span class="ads-kwfilter-lab">Campagne</span><select onchange="gConvSetCamp(this.value)" aria-label="Filter op campagne"><option value="">Alle campagnes</option>'+camps.map(function(c){ return '<option value="'+esc(c.id)+'"'+(_gConvCampFilter()===String(c.id)?' selected':'')+'>'+esc(c.name||'Campagne')+'</option>'; }).join('')+'</select></div>'
    : '';
  // punt 8: vrij typen i.p.v. een vaste keuze -> typ "offerte" en alle leadtypes met dat woord verschijnen.
  var typeSearch = '<div class="ads-kwfilter"><span class="ads-kwfilter-lab">Type lead</span><input type="text" class="shoot-zoek" style="min-width:180px" value="'+esc(_gConvCatFilter())+'" oninput="gConvSetCat(this.value)" placeholder="Zoek, bv. offerte" aria-label="Zoek op type lead"></div>';
  return '<div class="card ads-card" style="padding:14px 16px"><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">'+campSel+typeSearch+'</div><div id="gConvWrap">'+googleRichConvInner()+'</div></div>';
}
// Per-campagne conversie-uitsplitsing (openklikbaar vak), getoond binnen googleRichCampaign.
function gConvCampToggle(cid){ var el=document.getElementById('gconvc_'+cid); var bt=document.getElementById('gconvb_'+cid); if(!el) return; var open=(el.style.display==='none'); el.style.display=open?'':'none'; if(bt) bt.setAttribute('aria-expanded',open?'true':'false'); }
function _gLeadEnc(s){ return encodeURIComponent(String(s||'')).replace(/'/g,'%27'); }
function googleRichCampConv(c,cur){
  var types=(c.conversionTypes||[]); if(!types.length) return '';
  var spend=Number(c.spend)||0;
  var hasDaily=!!(c.leadDaily&&typeof c.leadDaily==='object'&&Object.keys(c.leadDaily).length);
  var rows=types.map(function(t){ var cnt=Number(t.count)||0; return {name:t.name,count:cnt,cpl:(cnt>0?spend/cnt:0)}; }).sort(function(a,b){ return b.count-a.count; });
  var tpl='minmax(150px,2fr) minmax(70px,1fr) minmax(90px,1fr)';
  var head='<div class="ar-thead" style="grid-template-columns:'+tpl+'"><span class="ar-th">Type lead</span><span class="ar-th num">Aantal</span><span class="ar-th num">CPL</span></div>';
  var body=rows.map(function(r){
    var enc=_gLeadEnc(r.name);
    var clickable=hasDaily && ((c.leadDaily[r.name]||[]).length>0);
    var attrs=clickable?(' role="button" tabindex="0" style="cursor:pointer" title="Toon de dagelijkse evolutie van dit leadtype" onclick="gLeadChart(\''+esc(c.id)+'\',\''+enc+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();gLeadChart(\''+esc(c.id)+'\',\''+enc+'\');}"'):'';
    return '<div class="ar-trow gconv-row" data-lt="'+enc+'" style="grid-template-columns:'+tpl+'"'+attrs+'><span class="ar-td"><span class="ar-nm" title="'+esc(r.name||'')+'">'+(clickable?ic('st_progress',12)+' ':'')+esc(r.name||'-')+'</span></span><span class="ar-td num">'+arDec(r.count,2)+'</span><span class="ar-td num">'+(r.count?arEur(r.cpl,cur):'-')+'</span></div>';
  }).join('');
  var hint=hasDaily?'<div style="font-size:11px;color:var(--ink-3);margin-top:6px">Klik op een leadtype voor de dagelijkse evolutie.</div>':'';
  var chart=hasDaily?'<div id="gleadchart_'+esc(c.id)+'" class="ar-chartwrap" style="display:none;margin-top:6px"><canvas id="gleadcv_'+esc(c.id)+'"></canvas></div>':'';
  return '<div class="ar-table" style="margin-top:8px"><button class="ar-tabtitle" id="gconvb_'+esc(c.id)+'" onclick="gConvCampToggle(\''+esc(c.id)+'\')" aria-expanded="false" style="display:flex;align-items:center;gap:6px;background:none;border:0;cursor:pointer;width:100%;text-align:left">'+ic('st_approved',14)+'Leads per type <span class="count">'+rows.length+'</span></button><div id="gconvc_'+esc(c.id)+'" style="display:none"><div class="ar-tscroll">'+head+body+'</div>'+hint+chart+'</div></div>';
}
// Punt Arne: klik een leadtype -> dag-grafiek met enkel die leads en wanneer ze binnenkwamen.
// Eigen, op-zichzelf-staande lijn-grafiek per type (geen ingreep in de gedeelde metric-grafiek).
function _gLeadRowHL(cid,type){ var box=document.getElementById('gconvc_'+cid); if(!box) return; var enc=_gLeadEnc(type); [].forEach.call(box.querySelectorAll('.gconv-row'),function(r){ r.style.background=(type&&r.getAttribute('data-lt')===enc)?'rgba(31,95,168,.08)':''; }); }
function gLeadChart(cid,typeEnc){
  var type=''; try{ type=decodeURIComponent(typeEnc||''); }catch(e){ type=String(typeEnc||''); }
  var c=_gFindCamp(cid); if(!c||!c.leadDaily) return;
  var series=(c.leadDaily[type]||[]).slice().sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); });
  var wrap=document.getElementById('gleadchart_'+cid); if(!wrap) return;
  state._gLeadActive=state._gLeadActive||{}; state._gLeadCharts=state._gLeadCharts||{};
  if(state._gLeadActive[cid]===type){   // zelfde type opnieuw -> verbergen
    wrap.style.display='none'; state._gLeadActive[cid]=''; _gLeadRowHL(cid,'');
    if(state._gLeadCharts[cid]){ try{state._gLeadCharts[cid].destroy();}catch(e){} state._gLeadCharts[cid]=null; }
    return;
  }
  state._gLeadActive[cid]=type; _gLeadRowHL(cid,type); wrap.style.display='';
  adsRichLoadChart().then(function(ok){
    if(!ok||!window.Chart) return;
    var cv=document.getElementById('gleadcv_'+cid); if(!cv) return;
    if(state._gLeadCharts[cid]){ try{state._gLeadCharts[cid].destroy();}catch(e){} }
    var labels=series.map(function(d){ var p=String(d.date).split('-'); return p.length===3?(p[2]+'/'+p[1]):d.date; });
    var data=series.map(function(d){ return Number(d.count)||0; });
    state._gLeadCharts[cid]=new Chart(cv.getContext('2d'),{type:'line',
      data:{labels:labels,datasets:[{label:type,data:data,borderColor:'#1F5FA8',backgroundColor:'rgba(31,95,168,.12)',borderWidth:2,fill:true,tension:.3,pointRadius:2,pointHoverRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,labels:{boxWidth:12}},tooltip:{callbacks:{label:function(it){ return type+': '+(Math.round((it.parsed.y||0)*100)/100); }}}},scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{ticks:{maxRotation:0,autoSkip:true}}}}});
  });
}
function googleRichOptimList(g){
  var recs=[]; var camps=(g.campaigns||[]);
  camps.forEach(function(c){
    if((c.conversions||0)===0 && (c.clicks||0)>300) recs.push(['red','Klikken zonder leads bij &ldquo;'+esc(c.name||'campagne')+'&rdquo;',arNum(c.clicks)+' klikken maar 0 leads. Controleer de landingspagina, het formulier of het meten van je leads.']);
    if(c.imprShare>0 && c.imprShare<40 && (c.spend||0)>0) recs.push(['orange','Laag vertonings-aandeel bij &ldquo;'+esc(c.name||'campagne')+'&rdquo;','Vertonings-aandeel '+arPct(c.imprShare)+', je mist vertoningen. Een hoger budget of een betere kwaliteitsscore kan helpen.']);
    if(c.ctr>0 && c.ctr<2 && (c.impressions||0)>1000) recs.push(['blue','Lage CTR bij &ldquo;'+esc(c.name||'campagne')+'&rdquo;','CTR '+arPct(c.ctr)+', test scherpere advertentieteksten of relevantere zoekwoorden.']);
  });
  var noConvKw=(g.keywords||[]).filter(function(k){return (k.conversions||0)===0 && (k.spend||0)>0;}).sort(function(a,b){return b.spend-a.spend;})[0];
  if(noConvKw && noConvKw.spend>0) recs.push(['orange','Besteding op zoekwoord zonder leads','&ldquo;'+esc(noConvKw.text||'')+'&rdquo; gaf '+arEur(noConvKw.spend,_gCur())+' uit zonder leads. Overweeg het te pauzeren of als uitsluitings-zoekwoord toe te voegen.']);
  if(!recs.length) recs.push(['green','Geen knelpunten gevonden','De Google-campagnes draaien gezond binnen de gangbare richtlijnen voor deze periode.']);
  return recs;
}
function googleRichOptim(g,cur){
  return adsWsRecsRender(googleRichOptimList(g));
}
/* ---- Evolutie per maand (wens Arne, taak 86cahn1nf): blokjes per maand met bovenaan de maandnaam
   + besteed bedrag, daaronder alle leadtypes met aantal en CPL, onderaan het totaal. Horizontaal
   scrollbaar (~3 blokjes in beeld), met per blokje de jaar-op-jaar-vergelijking (zelfde maand vorig
   jaar) en daaronder een trendgrafiek waarin je leadtypes en het totaal kan aan-/uitklikken.
   Data: googleAdsEvolutie (vast 24-maandsvenster t/m gisteren, optioneel per campagne). ---- */
function gEvoStyles(){
  if(document.getElementById('gEvoStyles')) return;
  var s=document.createElement('style'); s.id='gEvoStyles'; s.textContent=''
    +'.gevo-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}'
    +'.gevo-scroll{display:flex;gap:12px;overflow-x:auto;padding:2px 2px 10px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}'
    +'.gevo-card{flex:0 0 min(300px,80vw);scroll-snap-align:start;background:var(--paper,#fff);border:1px solid var(--line,#E7DFD3);border-radius:var(--r-md,14px);box-shadow:var(--sh-sm,0 1px 2px rgba(35,15,35,.05));padding:14px 15px;display:flex;flex-direction:column}'
    +'.gevo-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;border-bottom:1px solid var(--line,#E7DFD3);padding-bottom:9px;margin-bottom:9px}'
    +'.gevo-head b{font-family:var(--font-display);font-weight:800;font-size:14.5px;text-transform:capitalize}'
    +'.gevo-head span{font-weight:800;font-size:13.5px;color:var(--s27-blue-ink,#1F5FA8);white-space:nowrap}'
    +'.gevo-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;font-size:12.5px;padding:3px 0;color:var(--ink-2)}'
    +'.gevo-row .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    +'.gevo-row .n,.gevo-row .c{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink-3)}'
    +'.gevo-row .n{font-weight:700;color:var(--ink)}'
    +'.gevo-tot{display:grid;grid-template-columns:1fr auto auto;gap:8px;font-size:12.5px;font-weight:800;border-top:2px solid var(--line,#E7DFD3);margin-top:auto;padding-top:8px}'
    +'.gevo-ly{font-size:11.5px;color:var(--ink-4);margin-top:7px;line-height:1.45}'
    +'.gevo-empty{font-size:12.5px;color:var(--ink-4);padding:6px 0 10px}';
  document.head.appendChild(s);
}
function _gEvoN(){ return state._gEvoN||12; }
function _gEvoCampF(){ return state._gEvoCamp||''; }
function _gEvoRerender(){ var b=document.getElementById('adsBody'); if(b&&adsRichTab()==='evolutie'){ b.innerHTML=googleRichTabBody(); googleRichMountTabCharts(); } }
function gEvoSetN(n){ state._gEvoN=(+n===6||+n===24)?+n:12; _gEvoRerender(); }
function gEvoSetCamp(v){ state._gEvoCamp=String(v||''); state._gEvoAt=0; _gEvoRerender(); }
var _GEVO_MN=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
function _gEvoMaand(ym,kort){ var p=String(ym||'').split('-'); if(p.length<2) return ym||''; var nm=_GEVO_MN[(+p[1])-1]||''; return kort?(nm.slice(0,3)+' ’'+String(p[0]).slice(2)):(nm+' '+p[0]); }
function _gEvoLyYm(ym){ var p=String(ym||'').split('-'); return p.length<2?'':((+p[0]-1)+'-'+p[1]); }
function googleRichEvolutie(){
  gEvoStyles();
  var camp=_gEvoCampF();
  var d=(window.S27DATA&&S27DATA.googleAdsEvolutie)?S27DATA.googleAdsEvolutie(camp):null;
  // Stale campagnefilter self-healen (mirror van de conversies-/zoektermen-tab): de campagnelijst in de
  // respons is ALTIJD volledig (backend geeft ze los van de filter). Staat de gekozen campagne er niet
  // in (ander bedrijf na een act-as-wissel, of een verdwenen campagne), val dan terug op 'Alle campagnes'
  // i.p.v. vast te zitten op een lege selectie zonder dropdown.
  if(camp && d && d.linked && Array.isArray(d.campaigns) && !d.campaigns.some(function(c){return String(c.id)===String(camp);})){
    state._gEvoCamp=''; camp=''; state._gEvoAt=0;
    d=(window.S27DATA&&S27DATA.googleAdsEvolutie)?S27DATA.googleAdsEvolutie(''):null;
  }
  if(d===undefined||d===null){
    if(!state.demoMode && window.S27DATA && S27DATA.loadGoogleAdsEvolutie){
      var _now=Date.now();
      if(!state._gEvoAt || _now-state._gEvoAt>2500){
        state._gEvoAt=_now;
        S27DATA.loadGoogleAdsEvolutie({campaign_id:camp}).then(function(){ _gEvoRerender(); });
      }
      return '<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>De maand-evolutie wordt opgehaald… (24 maanden, dit kan even duren)</p></div>';
    }
    return '<div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Geen evolutiedata beschikbaar.</div>';
  }
  if(!d.linked) return googleRichNotLinked();
  var cur=d.currency||'EUR';
  var all=(d.months||[]);                       // chronologisch oplopend
  if(!all.length) return '<div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Nog geen data in dit account voor de laatste 24 maanden.</div>';
  var byYm={}; all.forEach(function(m){ byYm[m.ym]=m; });
  var shown=all.slice(-_gEvoN()).reverse();     // nieuwste maand links
  var camps=(d.campaigns||[]);
  var campSel=camps.length>1
    ? '<div class="ads-kwfilter"><span class="ads-kwfilter-lab">Campagne</span><select onchange="gEvoSetCamp(this.value)" aria-label="Filter op campagne"><option value="">Alle campagnes</option>'+camps.map(function(c){ return '<option value="'+esc(c.id)+'"'+(camp===String(c.id)?' selected':'')+'>'+esc(c.name||'Campagne')+'</option>'; }).join('')+'</select></div>'
    : '';
  var nSel='<div class="ads-kwfilter"><span class="ads-kwfilter-lab">Periode</span><select onchange="gEvoSetN(this.value)" aria-label="Aantal maanden">'+[6,12,24].map(function(n){ return '<option value="'+n+'"'+(_gEvoN()===n?' selected':'')+'>Laatste '+n+' maanden</option>'; }).join('')+'</select></div>';
  var cards=shown.map(function(m){
    var rows=(m.types||[]).map(function(t){ return '<div class="gevo-row"><span class="nm" title="'+esc(t.name)+'">'+esc(t.name)+'</span><span class="n">'+arDec(t.count,2)+'</span><span class="c">'+(t.count?arEur(t.cpl,cur):'-')+'</span></div>'; }).join('')
      || '<div class="gevo-empty">Geen leads in deze maand.</div>';
    var ly=byYm[_gEvoLyYm(m.ym)];
    var lyHtml=ly?'<div class="gevo-ly">'+esc(_gEvoMaand(ly.ym))+': '+arDec(ly.conversions,2)+' leads · CPL '+(ly.conversions?arEur(ly.cpl,cur):'-')+' · besteed '+arEur(ly.spend,cur)+'</div>':'';
    return '<div class="gevo-card"><div class="gevo-head"><b>'+esc(_gEvoMaand(m.ym))+'</b><span>'+arEur(m.spend,cur)+'</span></div>'
      +rows
      +'<div class="gevo-tot"><span>Totaal</span><span>'+arDec(m.conversions,2)+'</span><span>'+(m.conversions?arEur(m.cpl,cur):'-')+'</span></div>'
      +lyHtml+'</div>';
  }).join('');
  var hint='<div style="font-size:11.5px;color:var(--ink-3);margin:4px 2px 10px">Kolommen: leadtype · aantal · CPL. Swipe of scroll horizontaal voor oudere maanden. Klik in de grafieklegende om leadtypes aan of uit te zetten.</div>';
  return '<div class="card ads-card" style="padding:14px 16px"><div class="gevo-filters">'+campSel+nSel+'</div>'
    +'<div class="gevo-scroll">'+cards+'</div>'+hint
    +'<div class="ar-chartwrap" style="height:280px"><canvas id="gEvoChart"></canvas></div></div>';
}
var _GEVO_COLORS=['#1F5FA8','#12AC4E','#9441DB','#E8A33A','#DC2626','#0FA3A3','#B85C9E','#6B7280'];
function gEvoBuildChart(){
  var d=(window.S27DATA&&S27DATA.googleAdsEvolutie)?S27DATA.googleAdsEvolutie(_gEvoCampF()):null;
  if(!d||!d.linked) return;
  var cv=document.getElementById('gEvoChart'); if(!cv||!window.Chart) return;
  var all=(d.months||[]);
  var shown=all.slice(-_gEvoN());               // grafiek chronologisch oplopend
  var labels=shown.map(function(m){ return _gEvoMaand(m.ym,true); });
  // top-leadtypes over het getoonde venster (max 7 reeksen naast het totaal, anders wordt het soep)
  var agg={}; shown.forEach(function(m){ (m.types||[]).forEach(function(t){ agg[t.name]=(agg[t.name]||0)+(Number(t.count)||0); }); });
  var top=Object.keys(agg).sort(function(a,b){ return agg[b]-agg[a]; }).slice(0,7);
  var ds=[{label:'Totaal leads',data:shown.map(function(m){ return Math.round((Number(m.conversions)||0)*100)/100; }),borderColor:'#230F23',backgroundColor:'#230F23',borderWidth:2.4,tension:.3,pointRadius:2,pointHoverRadius:4}];
  top.forEach(function(nm,i){
    ds.push({label:nm,data:shown.map(function(m){ var t=(m.types||[]).filter(function(x){return x.name===nm;})[0]; return t?Math.round((Number(t.count)||0)*100)/100:0; }),borderColor:_GEVO_COLORS[i%_GEVO_COLORS.length],backgroundColor:_GEVO_COLORS[i%_GEVO_COLORS.length],borderWidth:1.8,tension:.3,pointRadius:1.5,pointHoverRadius:4,hidden:top.length>3});
  });
  try{ if(state._gEvoChart){ state._gEvoChart.destroy(); } }catch(e){}
  state._gEvoChart=new Chart(cv.getContext('2d'),{type:'line',
    data:{labels:labels,datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:true,labels:{boxWidth:12,font:{family:'Montserrat',size:11}}}},
      scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{ticks:{maxRotation:0,autoSkip:true}}}}});
}

/* =============================================================================
   MEETING-WERKBLAD UI (#19 bewerkbare gegroepeerde aanbevelingen + #20 uploads).
   Staff-only (isRichView). Persistentie per bedrijf via adsWorkspace (KV-gateway):
   recs = [{id,cat,title,body}], uploads = [{type,name,url}].
   ============================================================================= */
function adsWsStyles(){ if(document.getElementById('adsWsStyles'))return; var s=document.createElement('style'); s.id='adsWsStyles'; s.textContent=''
  +'.ws-recs{display:flex;flex-direction:column;gap:16px}'
  +'.ws-grp{background:var(--paper,#fff);border:1px solid var(--line,#E7DFD3);border-radius:var(--r-md,14px);box-shadow:var(--sh-sm,0 1px 2px rgba(35,15,35,.05));padding:14px 16px}'
  +'.ws-grp-head{display:flex;align-items:center;gap:9px;margin-bottom:10px}'
  +'.ws-grp-ic{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;background:linear-gradient(180deg,#fff,#f6f2ec);border:1px solid var(--line,#E7DFD3);color:var(--s27-blue-ink,#1F5FA8);flex:none}'
  +'.ws-grp-ttl{font-family:var(--font-display);font-weight:800;font-size:14.5px;color:var(--ink);flex:1}'
  +'.ws-grp-n{font-size:11px;font-weight:700;color:var(--ink-4);background:rgba(35,15,35,.05);border-radius:999px;padding:2px 9px}'
  +'.ws-rec{position:relative;border:1px solid var(--line,#E7DFD3);border-left:4px solid var(--ink-4,#9E919E);border-radius:11px;padding:11px 40px 11px 13px;margin-top:9px;background:rgba(255,255,255,.55)}'
  +'.ws-rec:first-of-type{margin-top:0}'
  +'.ws-rec-t{font-family:var(--font-display);font-weight:800;font-size:13.5px;color:var(--ink);line-height:1.35;outline:0;border-radius:5px;min-height:18px}'
  +'.ws-rec-b{font-size:13px;line-height:1.55;color:var(--ink-3);margin-top:3px;outline:0;border-radius:5px;min-height:17px;white-space:pre-wrap;word-break:break-word}'
  +'.ws-rec-t:empty:before,.ws-rec-b:empty:before{content:attr(data-ph);color:var(--ink-4,#9E919E);font-weight:500}'
  +'.ws-rec-t[contenteditable]:focus,.ws-rec-b[contenteditable]:focus{box-shadow:0 0 0 2px rgba(48,131,220,.18);background:#fff}'
  +'.ws-rec-x{position:absolute;top:8px;right:8px;width:26px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--ink-4,#9E919E);cursor:pointer;display:flex;align-items:center;justify-content:center}'
  +'.ws-rec-x:hover{background:rgba(220,38,38,.1);color:#DC2626}'
  +'.ws-grp-add{margin-top:10px;display:inline-flex;align-items:center;gap:6px;border:1px dashed var(--line,#E7DFD3);background:transparent;color:var(--ink-3);font:inherit;font-weight:700;font-size:12.5px;padding:7px 13px;border-radius:9px;cursor:pointer}'
  +'.ws-grp-add:hover{border-color:var(--s27-blue,#3083DC);color:var(--s27-blue-ink,#1F5FA8)}'
  +'.ws-save{font-size:11.5px;font-weight:700;color:#12AC4E;min-height:16px;display:inline-flex;align-items:center;gap:5px;opacity:0;transition:opacity .2s}'
  +'.ws-save.on{opacity:1}'
  +'.ws-mt{display:flex;flex-direction:column;gap:18px}'
  +'.ws-add{background:var(--paper,#fff);border:1px solid var(--line,#E7DFD3);border-radius:var(--r-md,14px);box-shadow:var(--sh-sm,0 1px 2px rgba(35,15,35,.05));padding:14px 16px}'
  +'.ws-add-h{font-family:var(--font-display);font-weight:800;font-size:13.5px;color:var(--ink);display:flex;align-items:center;gap:7px;margin-bottom:9px}'
  +'.ws-addrow{display:flex;gap:8px;flex-wrap:wrap}'
  +'.ws-addrow input[type=text]{flex:1;min-width:180px;border:1px solid var(--line,#E7DFD3);border-radius:9px;padding:9px 12px;font:inherit;font-size:13px;color:var(--ink);background:#fff;outline:0}'
  +'.ws-addrow input[type=text]:focus{box-shadow:0 0 0 2px rgba(48,131,220,.18)}'
  +'.ws-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line,#E7DFD3);background:linear-gradient(180deg,#fff,#f7f3ec);color:var(--ink);font:inherit;font-weight:700;font-size:12.5px;padding:9px 14px;border-radius:9px;cursor:pointer;white-space:nowrap}'
  +'.ws-btn:hover{filter:brightness(1.04)}'
  +'.ws-btn[disabled]{opacity:.55;cursor:default}'
  +'.ws-file{position:relative;overflow:hidden;display:inline-flex}'
  +'.ws-file input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}'
  +'.ws-upmsg{font-size:12px;color:var(--ink-4);margin-top:8px;min-height:15px}'
  +'.ws-upmsg .ok{color:#12AC4E}.ws-upmsg .err{color:#DC2626}'
  +'.ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:4px}'
  +'.ws-tile{position:relative;border:1px solid var(--line,#E7DFD3);border-radius:12px;overflow:hidden;background:var(--paper,#fff);box-shadow:var(--sh-sm,0 1px 2px rgba(35,15,35,.05))}'
  +'.ws-tile-img{display:block;width:100%;height:120px;object-fit:cover;cursor:pointer;background:#f6f2ec}'
  +'.ws-tile-cap{font-size:11px;color:var(--ink-3);padding:7px 9px;line-height:1.3;word-break:break-word}'
  +'.ws-chip{display:flex;align-items:center;gap:8px;padding:11px 12px;cursor:pointer;text-decoration:none;color:var(--ink)}'
  +'.ws-chip:hover{background:rgba(48,131,220,.06)}'
  +'.ws-chip-ic{flex:none;color:var(--s27-blue-ink,#1F5FA8)}'
  +'.ws-chip-tx{font-size:12.5px;font-weight:600;line-height:1.3;word-break:break-all;flex:1}'
  +'.ws-tile-x{position:absolute;top:6px;right:6px;width:24px;height:24px;border:0;border-radius:7px;background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(35,15,35,.16)}'
  +'.ws-tile-x:hover{color:#DC2626}'
  +'.ws-empty{border:1px dashed var(--line,#E7DFD3);border-radius:12px;padding:22px;text-align:center;color:var(--ink-4);font-size:13px}'
  +'.ws-grp-empty{font-size:12.5px;color:var(--ink-4);padding:2px 2px 4px}'
  +'.ws-cat-mat{margin-top:13px;padding-top:12px;border-top:1px dashed var(--line,#E7DFD3)}'
  +'.ws-cat-mat-h{font-family:var(--font-display);font-weight:800;font-size:12px;color:var(--ink-3);display:flex;align-items:center;gap:6px;margin-bottom:9px}'
  +'.ws-cat-mat-h svg{flex:none}'
  +'.ws-catgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px;margin-bottom:10px}'
  +'.ws-catgrid .ws-tile-img{height:96px}'
  +'.ws-cat-add input[type=text]{min-width:150px}';
  document.head.appendChild(s);
}
// Aanbevelingen worden per SCOPE getagd (Vincent): één uniforme lijst waarin elke aanbeveling
// gekoppeld is aan Meta Ads, Google Ads of iets algemeens (website e.d.). Bij het toevoegen kies
// je de scope. (Het 'cat'-veld op een rec bevat nu de scope, backward-compatibel met de opslag.)
// 4e element = [tint-achtergrond, ink-kleur]: Meta=blauw, Google=oranje, Algemeen=leisteen. NOOIT rood.
var ADS_WS_CATS=[
  ['meta','Meta Ads','st_progress',['rgba(48,131,220,.12)','#1F5FA8']],
  ['google','Google Ads','st_progress',['rgba(224,138,30,.14)','#B4540B']],
  ['algemeen','Algemeen','doc',['rgba(100,116,139,.13)','#475569']]
];
var ADS_WS_SCOPES={meta:1,google:1,algemeen:1};   // geldige scopes; onbekende/oude categorieën vallen terug op 'algemeen'
function adsWsGuessCat(title,body){
  var s=((title||'')+' '+(body||'')).toLowerCase();
  if(/landingspag|formulier|landing|website|pagina|tracking|conversie-track|conversie track/.test(s)) return 'landingspagina';
  if(/budget|besteding|biedt|bieden|kost|cpc|cpm|uitgegeven|uitgaven|geld|gaf .* uit/.test(s)) return 'budget';
  if(/frequen|publiek|doelgroep|audience|breder publiek|targeting|vertonings-aandeel|vertonings aandeel|bereik/.test(s)) return 'doelgroep';
  if(/visual|advertentie|ad |ads|creatief|creative|tekst|ctr|varianten|pauzeer|nieuwe ad/.test(s)) return 'content';
  return 'overig';
}
/* HTML-entiteiten uit de Google-seed naar leesbare tekst (recs worden als platte tekst bewerkt). */
function adsWsDecode(h){ if(h==null) return ''; var s=String(h); if(s.indexOf('&')<0) return s; var d=document.createElement('textarea'); d.innerHTML=s; return d.value; }
function adsWsRid(){ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
/* Werk-state is per bedrijf: bij een bedrijf-switch (state.activeBedrijf wijzigt) starten we schoon,
   zodat we nooit de recs/uploads van het vorige bedrijf tonen. */
function adsWsState(){ var bid=state.activeBedrijf||''; if(!state._adsWs || state._adsWs.bid!==bid) state._adsWs={bid:bid,loaded:false,seeded:false,recs:null}; return state._adsWs; }
/* Seed de bewerkbare recs uit de auto-lijst ([kleur,titel,body]) -> objecten met geraden categorie. */
function adsWsSeedFrom(autoList){
  return (autoList||[]).filter(function(r){ return r&&r[0]!=='green'; }).map(function(r){
    var ttl=adsWsDecode(r[1]), bdy=adsWsDecode(r[2]);
    return { id:adsWsRid(), cat:adsWsGuessCat(ttl,bdy), title:ttl, body:bdy };
  });
}
/* Gedeelde renderer voor Meta + Google. seedList = auto-gegenereerde [kleur,titel,body]-lijst. */
function adsWsRecsRender(seedList){
  adsWsStyles();
  var ws=adsWsState();
  // Eénmalig laden + her-renderen wanneer de KV-data binnen is (zoals het kladblok). Als we (nog) geen
  // bewaarde recs hadden bij de eerste render maar ze komen later binnen, her-seeden we zolang de gebruiker
  // nog niets bewerkte (ws.dirty), zodat opgeslagen aanbevelingen niet door de auto-seed overschreven worden.
  if(!ws.loaded && !state.demoMode && window.S27DATA && S27DATA.loadAdsWorkspace){
    ws.loaded=true;
    S27DATA.loadAdsWorkspace().then(function(w){
      if(adsRichTab()!=='aanbevelingen') return;
      if(!ws.seededFromSaved && !ws.dirty && w && Array.isArray(w.recs) && w.recs.length){ ws.seeded=false; }
      var box=document.getElementById('adsBody'); if(!box) return;
      box.innerHTML=(isRichView()&&adsActivePlatform()==='google')?googleRichTabBody():adsRichTabBody();
    });
  }
  if(!ws.seeded){
    var saved=(window.S27DATA&&S27DATA.adsWorkspace&&S27DATA.adsWorkspace())||state.data.adsWorkspace||null;
    if(saved && Array.isArray(saved.recs) && saved.recs.length){
      ws.recs=saved.recs.map(function(r){ return { id:r.id||adsWsRid(), cat:(ADS_WS_SCOPES[r.cat]?r.cat:'algemeen'), title:r.title||'', body:r.body||'' }; });   // oude categorie-recs -> 'Algemeen'
      ws.seededFromSaved=true;
    } else {
      // Vincent: GEEN automatische standaard-aanbevelingen meer, de tab start LEEG (Meta én Google),
      // het team voegt enkel manueel toe. (seedList wordt genegeerd; de auto-generatoren blijven enkel
      // voor de PDF-export bestaan.)
      ws.recs=[];
      ws.seededFromSaved=false;
    }
    ws.seeded=true;
  }
  var recs=ws.recs||[];
  // Alle 3 categorieën ALTIJD tonen, zodat elke categorie ook zonder aanbeveling een
  // eigen materiaal-zone (uploads voor de klant) heeft.
  var groups=ADS_WS_CATS.map(function(c){
    var items=recs.filter(function(r){ return (ADS_WS_SCOPES[r.cat]?r.cat:'algemeen')===c[0]; });
    var cards=items.map(function(r){
      return '<div class="ws-rec" data-rid="'+esc(r.id)+'">'
        +'<button class="ws-rec-x" onclick="adsWsRecDel(\''+esc(r.id)+'\')" title="Verwijderen" aria-label="Verwijderen">'+ic('trash',15)+'</button>'
        +'<div class="ws-rec-t" contenteditable="true" data-ph="Titel…" oninput="adsWsRecEdit(\''+esc(r.id)+'\',\'title\',this)">'+esc(r.title||'')+'</div>'
        +'<div class="ws-rec-b" contenteditable="true" data-ph="Beschrijving…" oninput="adsWsRecEdit(\''+esc(r.id)+'\',\'body\',this)">'+esc(r.body||'')+'</div>'
        +'</div>';
    }).join('');
    var ac=c[3]||['rgba(100,116,139,.13)','#475569']; // [tint-achtergrond, ink-kleur] per categorie
    return '<div class="ws-grp">'
      +'<div class="ws-grp-head"><span class="ws-grp-ic" style="background:'+ac[0]+';border-color:'+ac[0]+';color:'+ac[1]+'">'+ic(c[2],17)+'</span><span class="ws-grp-ttl">'+esc(c[1])+'</span><span class="ws-grp-n">'+items.length+'</span></div>'
      +(cards||'<div class="ws-grp-empty">Nog geen aanbevelingen in deze categorie.</div>')
      +'<button class="ws-grp-add" onclick="adsWsRecAdd(\''+c[0]+'\')">'+ic('plus',14)+' Aanbeveling toevoegen</button>'
      +adsWsCatMaterial(c[0])
      +'</div>';
  });
  return '<span class="ws-save" id="adsWsSave" style="display:block;text-align:right;min-height:1px;margin-top:2px"></span>'
    +'<span id="adsWsCount" style="display:none">'+recs.length+'</span>'
    +'<div class="ws-recs" id="adsWsRecs">'+groups.join('')+'</div>';
}
/* Materiaal-zone per categorie: uploads (visuals/foto's/pdf's) + links die we aan de klant
   willen tonen. Bestaande uploads zonder categorie vallen onder 'Algemeen'. */
function adsWsUploadsByCat(cat){ return adsWsUploads().filter(function(u){ return (ADS_WS_SCOPES[u.cat]?u.cat:'algemeen')===cat; }); }
function adsWsTileHtml(u){
  var del='<button class="ws-tile-x" onclick="adsWsCatUploadDel(\''+esc(u.id||'')+'\')" title="Verwijderen" aria-label="Verwijderen">'+ic('trash',13)+'</button>';
  if(u.type==='image'){
    return '<div class="ws-tile">'+del
      +'<a href="'+esc(u.url||'#')+'" target="_blank" rel="noopener"><img class="ws-tile-img" src="'+esc(u.url||'')+'" alt="'+esc(u.name||'')+'" loading="lazy"></a>'
      +(u.name?'<div class="ws-tile-cap">'+esc(u.name)+'</div>':'')+'</div>';
  }
  var icn=(u.type==='link')?adsWsLinkIcon():ic('doc',16);
  return '<div class="ws-tile">'+del
    +'<a class="ws-chip" href="'+esc(u.url||'#')+'" target="_blank" rel="noopener"><span class="ws-chip-ic">'+icn+'</span><span class="ws-chip-tx">'+esc(u.name||u.url||'Link')+'</span></a></div>';
}
function adsWsCatMaterial(cat){
  var ups=adsWsUploadsByCat(cat);
  var grid=ups.length?('<div class="ws-catgrid">'+ups.map(adsWsTileHtml).join('')+'</div>'):'';
  return '<div class="ws-cat-mat">'
    +'<div class="ws-cat-mat-h">'+ic('img',14)+' Materiaal voor de klant'+(ups.length?(' <span class="ws-grp-n">'+ups.length+'</span>'):'')+'</div>'
    +grid
    +'<div class="ws-addrow ws-cat-add">'
      +'<span class="ws-btn ws-file">'+ic('upload',13)+' Bestand<input type="file" onchange="adsWsCatFileUpload(this,\''+cat+'\')" accept="image/*,application/pdf,video/*"></span>'
      +'<input type="text" id="wsCatLink_'+cat+'" placeholder="of plak een link (Drive, WeTransfer…)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();adsWsCatLinkAdd(\''+cat+'\');}">'
      +'<button class="ws-btn" onclick="adsWsCatLinkAdd(\''+cat+'\')">'+ic('plus',13)+' Link</button>'
    +'</div>'
    +'<div class="ws-upmsg" id="wsCatMsg_'+cat+'"></div>'
  +'</div>';
}
function adsWsCatLinkAdd(cat){
  var inp=document.getElementById('wsCatLink_'+cat); if(!inp) return;
  var v=String(inp.value||'').trim(); if(!v) return;
  var url=/^https?:\/\//i.test(v)?v:('https://'+v);
  inp.value='';
  if(window.S27DATA&&S27DATA.adsUploadAdd) S27DATA.adsUploadAdd({type:'link',name:v,url:url,cat:cat}).then(function(list){ if(list) adsWsRerenderRecs(); });
}
function adsWsCatFileUpload(input,cat){
  var msg=document.getElementById('wsCatMsg_'+cat);
  var f=input&&input.files&&input.files[0]; if(!f) return;
  if(f.size>22*1024*1024){ if(msg) msg.innerHTML='<span class="err">Dit bestand is te groot (max 22 MB). Plak liever een link (bv. WeTransfer of Drive).</span>'; input.value=''; return; }
  if(msg) msg.innerHTML='<span style="display:inline-flex;align-items:center;gap:6px">'+ic('upload',13)+' Uploaden…</span>';
  var isImg=/^image\//i.test(f.type||'');
  var rdr=new FileReader();
  rdr.onerror=function(){ if(msg) msg.innerHTML='<span class="err">Lezen mislukt. Probeer opnieuw.</span>'; input.value=''; };
  rdr.onload=function(){
    var dataUrl=String(rdr.result||'');
    var b64=dataUrl.indexOf(',')>=0?dataUrl.slice(dataUrl.indexOf(',')+1):dataUrl;
    if(state.demoMode || typeof api!=='function' || !ENDPOINTS.metricoolMediaUpload){ if(msg) msg.innerHTML='<span class="err">Upload is enkel beschikbaar in de live-omgeving.</span>'; input.value=''; return; }
    api(ENDPOINTS.metricoolMediaUpload, { filename:f.name, content_type:f.type, file_data:b64 }).then(function(r){
      var d=(r&&r.ok&&r.data)?r.data:(r&&r.ok!==undefined?r:null);
      if(d&&d.ok&&d.url){
        if(window.S27DATA&&S27DATA.adsUploadAdd){ S27DATA.adsUploadAdd({type:isImg?'image':'file',name:f.name,url:d.url,cat:cat}).then(function(list){ if(list){ if(msg) msg.innerHTML='<span class="ok">'+ic('check',13)+' Toegevoegd.</span>'; adsWsRerenderRecs(); } else if(msg){ msg.innerHTML='<span class="err">Opslaan mislukte.</span>'; } }); }
      } else { var det=(d&&d.message)?(' '+esc(String(d.message))):''; if(msg) msg.innerHTML='<span class="err">Upload lukte niet.'+det+'</span>'; }
    }).catch(function(){ if(msg) msg.innerHTML='<span class="err">Upload lukte niet. Probeer opnieuw.</span>'; });
    input.value='';
  };
  rdr.readAsDataURL(f);
}
function adsWsCatUploadDel(id){
  if(!id) return;
  var ups=adsWsUploads().filter(function(u){ return u.id!==id; });
  if(window.S27DATA&&S27DATA.saveAdsWorkspace){ S27DATA.saveAdsWorkspace({uploads:ups}).then(function(){ if(state.data.adsWorkspace) state.data.adsWorkspace.uploads=ups; adsWsRerenderRecs(); }); }
  else { if(state.data.adsWorkspace) state.data.adsWorkspace.uploads=ups; adsWsRerenderRecs(); }
}
function adsWsRerenderRecs(){
  var box=document.getElementById('adsBody'); if(!box) return;
  // Volledige tab opnieuw opbouwen via de gedeelde optim-renderer (kiest zelf platform).
  if(adsRichTab()!=='aanbevelingen'){ return; }
  if(isRichView()&&adsActivePlatform()==='google'){ var g=(window.S27DATA&&S27DATA.googleAdsRich)?S27DATA.googleAdsRich():null; box.innerHTML=googleRichOptim(g||{},''); }
  else { var m=(window.S27DATA&&S27DATA.metaAdsRich)?S27DATA.metaAdsRich():null; box.innerHTML=adsRichOptim((m&&m.campaigns)||[],''); }
}
function adsWsRecEdit(id,field,el){
  var ws=adsWsState(); var r=(ws.recs||[]).filter(function(x){return x.id===id;})[0]; if(!r) return;
  ws.dirty=true; r[field]=(el&&el.textContent)||''; adsWsSaveRecsDebounced();
}
function adsWsRecAdd(cat){
  var ws=adsWsState(); if(!ws.recs) ws.recs=[]; ws.dirty=true;
  ws.recs.push({ id:adsWsRid(), cat:(ADS_WS_SCOPES[cat]?cat:'algemeen'), title:'', body:'' });
  var cnt=document.getElementById('adsWsCount'); if(cnt) cnt.textContent=ws.recs.length;
  adsWsRerenderRecs(); adsWsSaveRecsDebounced();
  // Focus de nieuwe (laatste) titel binnen de gekozen categorie.
  setTimeout(function(){ var nodes=document.querySelectorAll('.ws-rec[data-rid] .ws-rec-t'); if(nodes.length){ var last=nodes[nodes.length-1]; try{ last.focus(); }catch(e){} } },30);
}
function adsWsRecDel(id){
  var ws=adsWsState(); ws.dirty=true; ws.recs=(ws.recs||[]).filter(function(x){return x.id!==id;});
  var cnt=document.getElementById('adsWsCount'); if(cnt) cnt.textContent=ws.recs.length;
  adsWsRerenderRecs(); adsWsSaveRecsDebounced();
}
function adsWsSaveRecsDebounced(){ clearTimeout(state._adsWsTmr); state._adsWsTmr=setTimeout(adsWsSaveRecs,700); }
function adsWsSaveRecs(){
  if(!(window.S27DATA&&S27DATA.saveAdsWorkspace)) return;
  var recs=adsWsState().recs||[];
  S27DATA.saveAdsWorkspace({recs:recs}).then(function(ok){ adsWsFlashSave(ok); });
}
function adsWsFlashSave(ok){
  var el=document.getElementById('adsWsSave'); if(!el) return;
  el.innerHTML=ok?(ic('check',13)+' opgeslagen'):'opslaan mislukt';
  el.style.color=ok?'#12AC4E':'#DC2626'; el.classList.add('on');
  clearTimeout(state._adsWsSaveHide); state._adsWsSaveHide=setTimeout(function(){ var e2=document.getElementById('adsWsSave'); if(e2) e2.classList.remove('on'); },1600);
}

/* ---- #20 Meeting-uploads: links + afbeeldingen/bestanden per bedrijf ---- */
function adsWsLinkIcon(){ return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'; }
function adsWsUploads(){ var ws=(window.S27DATA&&S27DATA.adsWorkspace&&S27DATA.adsWorkspace())||state.data.adsWorkspace||null; return (ws&&Array.isArray(ws.uploads))?ws.uploads:[]; }
function adsWsMeetingTab(){
  adsWsStyles();
  var ws=adsWsState();
  if(!ws.loaded && !state.demoMode && window.S27DATA && S27DATA.loadAdsWorkspace){
    ws.loaded=true;
    S27DATA.loadAdsWorkspace().then(function(){ if(adsRichTab()!=='meeting') return; var box=document.getElementById('adsBody'); if(box) box.innerHTML=adsWsMeetingTab(); });
  }
  var plus=ic('plus',14);
  var _ag=adsAgendaState(); if(!_ag.loaded && state.data && state.data.adsWorkspace){ _ag.text=state.data.adsWorkspace.agenda||''; _ag.loaded=true; }
  var agendaIco='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>';
  return '<div class="section-head" style="margin-top:2px"><h2>Meeting-materiaal</h2><span class="count" id="adsWsUpCount">'+adsWsUploads().length+'</span></div>'
    +'<p class="sdesc" style="margin:-2px 0 12px;max-width:70ch">Verzamel hier alles voor de meeting met deze klant: schermafbeeldingen, visuals, bestanden en handige links. Alles wordt per bedrijf bewaard.</p>'
    +'<div class="ws-mt">'
      +'<div class="ws-add"><div class="ws-add-h">'+agendaIco+' Agendapunten</div>'
        +'<textarea id="adsAgendaTa" class="ws-agenda-ta" placeholder="Bespreekpunten ter voorbereiding van de meeting, zodat je zeker niets vergeet…" oninput="adsAgendaInput()">'+esc(_ag.text)+'</textarea>'
        +'<div class="ws-agenda-stat" id="adsAgendaStat"></div></div>'
      +'<div class="ws-add"><div class="ws-add-h">'+adsWsLinkIcon()+' Link toevoegen</div>'
        +'<div class="ws-addrow"><input type="text" id="adsWsLinkUrl" placeholder="https://… (bv. een rapport, ad-preview of Drive-map)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();adsWsLinkAdd();}">'
        +'<button class="ws-btn" onclick="adsWsLinkAdd()">'+plus+' Link toevoegen</button></div></div>'
      +'<div class="ws-add"><div class="ws-add-h">'+ic('upload',16)+' Afbeelding of bestand uploaden</div>'
        +'<div class="ws-addrow"><span class="ws-btn ws-file">'+ic('img',14)+' Bestand kiezen<input type="file" id="adsWsFile" onchange="adsWsFileUpload(this)" accept="image/*,application/pdf,video/*"></span></div>'
        +'<div class="ws-upmsg" id="adsWsUpMsg"></div></div>'
      +'<div id="adsWsGridWrap">'+adsWsUploadsGrid()+'</div>'
    +'</div>';
}
function adsWsUploadsGrid(){
  var ups=adsWsUploads();
  if(!ups.length) return '<div class="ws-empty">Nog geen materiaal toegevoegd. Voeg een link toe of upload een visual.</div>';
  var tiles=ups.map(function(u,i){
    if(u.type==='image'){
      return '<div class="ws-tile"><button class="ws-tile-x" onclick="adsWsUploadDel('+i+')" title="Verwijderen" aria-label="Verwijderen">'+ic('trash',13)+'</button>'
        +'<a href="'+esc(u.url||'#')+'" target="_blank" rel="noopener"><img class="ws-tile-img" src="'+esc(u.url||'')+'" alt="'+esc(u.name||'')+'" loading="lazy"></a>'
        +(u.name?'<div class="ws-tile-cap">'+esc(u.name)+'</div>':'')+'</div>';
    }
    var icn=(u.type==='link')?adsWsLinkIcon():ic('doc',16);
    return '<div class="ws-tile"><button class="ws-tile-x" onclick="adsWsUploadDel('+i+')" title="Verwijderen" aria-label="Verwijderen">'+ic('trash',13)+'</button>'
      +'<a class="ws-chip" href="'+esc(u.url||'#')+'" target="_blank" rel="noopener"><span class="ws-chip-ic">'+icn+'</span><span class="ws-chip-tx">'+esc(u.name||u.url||'Link')+'</span></a></div>';
  }).join('');
  return '<div class="ws-grid">'+tiles+'</div>';
}
function adsWsRefreshGrid(){ var w=document.getElementById('adsWsGridWrap'); if(w) w.innerHTML=adsWsUploadsGrid(); var c=document.getElementById('adsWsUpCount'); if(c) c.textContent=adsWsUploads().length; }
function adsWsLinkAdd(){
  var inp=document.getElementById('adsWsLinkUrl'); if(!inp) return;
  var v=String(inp.value||'').trim(); if(!v) return;
  var url=/^https?:\/\//i.test(v)?v:('https://'+v);
  if(!(window.S27DATA&&S27DATA.adsUploadAdd)){ inp.value=''; return; }
  inp.value='';
  S27DATA.adsUploadAdd({type:'link',name:v,url:url}).then(function(list){ if(list) adsWsRefreshGrid(); });
}
function adsWsFileUpload(input){
  var msg=document.getElementById('adsWsUpMsg');
  var f=input&&input.files&&input.files[0]; if(!f) return;
  if(f.size>22*1024*1024){ if(msg) msg.innerHTML='<span class="err">Dit bestand is te groot (max 22 MB). Plak liever een link (bv. WeTransfer of Drive).</span>'; input.value=''; return; }
  if(msg) msg.innerHTML='<span style="display:inline-flex;align-items:center;gap:6px">'+ic('upload',13)+' Uploaden…</span>';
  var isImg=/^image\//i.test(f.type||'');
  var rdr=new FileReader();
  rdr.onerror=function(){ if(msg) msg.innerHTML='<span class="err">Lezen mislukt. Probeer opnieuw.</span>'; input.value=''; };
  rdr.onload=function(){
    var dataUrl=String(rdr.result||'');
    var b64=dataUrl.indexOf(',')>=0?dataUrl.slice(dataUrl.indexOf(',')+1):dataUrl; // strip 'data:...;base64,'
    if(state.demoMode || typeof api!=='function' || !ENDPOINTS.metricoolMediaUpload){ if(msg) msg.innerHTML='<span class="err">Upload is enkel beschikbaar in de live-omgeving.</span>'; input.value=''; return; }
    api(ENDPOINTS.metricoolMediaUpload, { filename:f.name, content_type:f.type, file_data:b64 }).then(function(r){
      var d=(r&&r.ok&&r.data)?r.data:(r&&r.ok!==undefined?r:null);
      if(d&&d.ok&&d.url){
        if(window.S27DATA&&S27DATA.adsUploadAdd){ S27DATA.adsUploadAdd({type:isImg?'image':'file',name:f.name,url:d.url}).then(function(list){ if(list){ adsWsRefreshGrid(); if(msg) msg.innerHTML='<span class="ok">'+ic('check',13)+' Toegevoegd.</span>'; } else if(msg){ msg.innerHTML='<span class="err">Opslaan mislukte.</span>'; } }); }
      } else { var det=(d&&d.message)?(' '+esc(String(d.message))):''; if(msg) msg.innerHTML='<span class="err">Upload lukte niet.'+det+'</span>'; }
    }).catch(function(){ if(msg) msg.innerHTML='<span class="err">Upload lukte niet. Probeer opnieuw.</span>'; });
    input.value='';
  };
  rdr.readAsDataURL(f);
}
function adsWsUploadDel(idx){
  var ups=adsWsUploads().slice();
  if(idx<0||idx>=ups.length) return;
  ups.splice(idx,1);
  if(window.S27DATA&&S27DATA.saveAdsWorkspace){ S27DATA.saveAdsWorkspace({uploads:ups}).then(function(){ adsWsRefreshGrid(); }); }
  else { adsWsRefreshGrid(); }
}
function googleRichMountTabCharts(){
  _adsApplyAccent();
  if(!isRichView()||adsActivePlatform()!=='google') return;
  var t=adsRichTab();
  var g=(window.S27DATA&&S27DATA.googleAdsRich)?S27DATA.googleAdsRich():null; if(!g||!g.linked) return;
  adsRichLoadChart().then(function(ok){ if(!ok||!window.Chart) return;
    if(t==='samengevat') googleRichBuildAccountChart(g,g.currency||'EUR');
    else if(t==='campagnes') (g.campaigns||[]).forEach(function(c){ googleRichBuildCampChart(c,g.currency||'EUR'); });
    else if(t==='evolutie') gEvoBuildChart();
  });
}
function _gChartDs(spend,clicks,conv){
  var ds=[{type:'bar',label:'Besteed',data:spend,backgroundColor:'rgba(194,142,14,.55)',borderColor:'rgba(194,142,14,.95)',borderWidth:1,borderRadius:4,yAxisID:'y',order:3},
          {type:'line',label:'Klikken',data:clicks,borderColor:'#230F23',backgroundColor:'#230F23',borderWidth:2,tension:.32,pointRadius:0,yAxisID:'y1',order:2}];
  if(conv.some(function(v){return v>0;})) ds.push({type:'line',label:'Leads',data:conv,borderColor:'#12AC4E',backgroundColor:'#12AC4E',borderWidth:2,tension:.32,pointRadius:0,yAxisID:'y1',order:1});
  return ds;
}
function _gChartOpts(cur){
  return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{labels:{font:{family:'Montserrat',size:11,weight:'600'},color:'#6B5B6B',boxWidth:12,padding:14,usePointStyle:true}},tooltip:{callbacks:{label:function(x){ if(x.dataset.label==='Besteed') return ' Besteed: '+metaEur(x.parsed.y,cur); return ' '+x.dataset.label+': '+(Number(x.parsed.y)||0).toLocaleString('nl-BE'); }}}},
    scales:{ y:{position:'left',beginAtZero:true,ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',callback:function(v){return '€'+v;}},grid:{color:'rgba(231,223,211,.55)'}}, y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false},ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',precision:0}}, x:{ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',maxRotation:0,autoSkip:true,maxTicksLimit:12},grid:{display:false}} } };
}
function googleRichBuildAccountChart(g,cur){
  adsBuildSelChart({ canvasId:'garch_account', chartKey:'gaccount', rows:_adsRowsFromCampaigns(g.campaigns||[]),
    metrics:adsSelMetrics('google'), sel:adsChartSel('google'), cur:cur,
    has:function(k){ return (g.campaigns||[]).some(function(c){ return (c.daily||[]).some(function(d){ return Number(d[k])>0; }); }); } });
}
// Per-campagne Google-grafiek (taak 3): zelfde klikbare selector als het overzicht, per campagne gesleuteld.
function googleRichBuildCampChart(c,cur){
  adsBuildSelChart({ canvasId:'garch_'+c.id, chartKey:'g'+c.id, rows:(c.daily||[]),
    metrics:adsSelMetrics('google'), sel:adsCampSel('google',c.id), cur:cur,
    has:function(k){ return (c.daily||[]).some(function(d){ return Number(d[k])>0; }); } });
}
/* =============================================================================
   #23, GOOGLE MAANDOVERZICHT (team). Eén grote, dynamische Chart.js-grafiek over
   12 maanden. Toggle-chips bepalen welke CAMPAGNES meetellen en welke METRICS
   geplot worden (Besteding · Conversies · Conv.waarde · Klikken). De selectie blijft
   bewaard over renders heen (state + localStorage). Data via DATA.loadGoogleMonthly().
   ============================================================================= */
var G_MONTH_METRICS=[
  { key:'spend',       label:'Besteding',   color:'#C28E0E', axis:'eur'   },
  { key:'conversions', label:'Leads',  color:'#12AC4E', axis:'count' },
  { key:'clicks',      label:'Klikken',     color:'#230F23', axis:'count' }
];
function gMonthSel(){
  if(!state._gMonthSel){
    var def={ metrics:{spend:true,conversions:true,convValue:false,clicks:false}, camps:null };
    try{ var raw=localStorage.getItem('s27_gmonth_sel'); if(raw){ var p=JSON.parse(raw); if(p&&p.metrics){ def.metrics=Object.assign(def.metrics,p.metrics); if(p.camps) def.camps=p.camps; } } }catch(e){}
    state._gMonthSel=def;
  }
  return state._gMonthSel;
}
function _gMonthSave(){ try{ localStorage.setItem('s27_gmonth_sel', JSON.stringify(state._gMonthSel||{})); }catch(e){} }
// Campagne-selectie initialiseren tegen de geladen campagnelijst: nieuwe campagnes default AAN, keuze bewaard.
function _gMonthEnsureCamps(camps){
  var sel=gMonthSel(); if(!sel.camps) sel.camps={};
  (camps||[]).forEach(function(c){ var id=String(c.id); if(typeof sel.camps[id]==='undefined') sel.camps[id]=true; });
  return sel;
}
function _gMonthLabel(ym){ var m=String(ym||'').match(/(\d{4})-(\d{2})/); if(!m) return ym||''; var mn=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']; return (mn[parseInt(m[2],10)-1]||m[2])+' '+m[1].slice(2); }
function googleMonthlyTab(){
  adsChartStyles();
  var gm=(window.S27DATA&&S27DATA.googleMonthly&&S27DATA.googleMonthly());
  if(gm===undefined||gm===null){
    if(!state._gMonthLoading && !state.demoMode && window.S27DATA && S27DATA.loadGoogleMonthly){
      state._gMonthLoading=true;
      S27DATA.loadGoogleMonthly().then(function(){ state._gMonthLoading=false; if(isRichView()&&adsActivePlatform()==='google'&&adsRichTab()==='maand'){ var b=document.getElementById('adsBody'); if(b){ b.innerHTML=googleMonthlyTab(); googleMonthlyMount(); } } }).catch(function(){ state._gMonthLoading=false; var b=document.getElementById('adsBody'); if(b) b.innerHTML=googleMonthlyTab(); });
    }
    return '<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Het maandoverzicht wordt opgehaald…</p></div>';
  }
  if(!gm.linked) return googleRichNotLinked();
  var months=(gm.months||[]);
  if(!months.length) return '<div class="section-head" style="margin-top:2px"><h2>Maandoverzicht</h2></div><div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Nog geen maanddata beschikbaar voor dit account.</div>';
  var camps=(gm.campaigns||[]); _gMonthEnsureCamps(camps);
  var sel=gMonthSel();
  var metricChips=G_MONTH_METRICS.map(function(m){ return '<button class="ads-mchip'+(sel.metrics[m.key]?' on':'')+'" style="--mc:'+m.color+'" onclick="gMonthToggleMetric(\''+m.key+'\')"><span class="ads-mdot"></span>'+esc(m.label)+'</button>'; }).join('');
  var campChips=camps.length?camps.map(function(c){ var id=String(c.id); return '<button class="ads-mchip'+(sel.camps[id]?' on':'')+'" style="--mc:#3083DC" onclick="gMonthToggleCamp(\''+esc(id)+'\')"><span class="ads-mdot"></span>'+esc(c.name||'Campagne')+'</button>'; }).join(''):'<span class="ads-mhint" style="margin:0">Geen campagne-uitsplitsing beschikbaar, de grafiek toont het accounttotaal.</span>';
  return '<div class="section-head" style="margin-top:2px"><h2>Maandoverzicht</h2><span class="count">'+months.length+' mnd</span></div>'
    +'<p class="ads-mhint">Kies welke campagnes meetellen en welke statistieken je in de grafiek wil zien. Je keuze blijft bewaard.</p>'
    +'<div class="ads-mctl">'
      +'<div class="ads-mctl-row"><span class="ads-mctl-lab">Statistieken</span><div class="ads-mchips">'+metricChips+'</div></div>'
      +(camps.length?'<div class="ads-mctl-row"><span class="ads-mctl-lab">Campagnes</span><div class="ads-mchips">'+campChips+'</div></div>':'')
    +'</div>'
    +'<div class="ads-mwrap"><canvas id="gmonth_chart"></canvas></div>';
}
function gMonthToggleMetric(key){ var sel=gMonthSel(); sel.metrics[key]=!sel.metrics[key]; if(!G_MONTH_METRICS.some(function(m){return sel.metrics[m.key];})) sel.metrics[key]=true; _gMonthSave(); _gMonthRefresh(); }
function gMonthToggleCamp(id){ var sel=gMonthSel(); id=String(id); sel.camps[id]=!sel.camps[id]; _gMonthSave(); _gMonthRefresh(); }
function _gMonthRefresh(){ var b=document.getElementById('adsBody'); if(b && isRichView() && adsActivePlatform()==='google' && adsRichTab()==='maand'){ b.innerHTML=googleMonthlyTab(); googleMonthlyMount(); } }
function googleMonthlyMount(){
  if(!(isRichView()&&adsActivePlatform()==='google'&&adsRichTab()==='maand')) return;
  adsRichLoadChart().then(function(ok){ if(!ok||!window.Chart) return; var gm=(window.S27DATA&&S27DATA.googleMonthly)?S27DATA.googleMonthly():null; if(gm&&gm.linked) googleMonthlyBuildChart(gm); });
}
function googleMonthlyBuildChart(gm){
  var cv=document.getElementById('gmonth_chart'); if(!cv||!window.Chart) return;
  state._arCharts=state._arCharts||{}; try{ if(state._arCharts.gmonth){ state._arCharts.gmonth.destroy(); delete state._arCharts.gmonth; } }catch(e){}
  var cur=gm.currency||'EUR', months=(gm.months||[]); if(!months.length) return;
  var camps=(gm.campaigns||[]); var sel=_gMonthEnsureCamps(camps);
  var allCamps=!camps.length; // geen campagne-uitsplitsing -> accounttotaal gebruiken
  function valFor(mo,key){
    if(allCamps || !mo.campaigns || !mo.campaigns.length) return Number(mo[key])||0;
    var sum=0; mo.campaigns.forEach(function(mc){ if(sel.camps[String(mc.id)]) sum+=Number(mc[key])||0; }); return sum;
  }
  var labels=months.map(function(mo){return _gMonthLabel(mo.month);});
  var order=0;
  var ds=G_MONTH_METRICS.filter(function(m){return sel.metrics[m.key];}).map(function(m){ order++;
    var data=months.map(function(mo){ var v=valFor(mo,m.key); return m.axis==='eur'?Math.round(v*100)/100:v; });
    if(m.key==='spend') return {type:'bar',label:m.label,data:data,backgroundColor:_hexA(m.color,.55),borderColor:_hexA(m.color,.95),borderWidth:1,borderRadius:5,yAxisID:'y',order:90-order,_eur:true};
    return {type:'line',label:m.label,data:data,borderColor:m.color,backgroundColor:m.color,borderWidth:2.4,tension:.3,pointRadius:3,pointHoverRadius:5,yAxisID:m.axis==='eur'?'y':'y1',order:90-order,_eur:m.axis==='eur'};
  });
  if(!ds.length) return;
  try{ state._arCharts.gmonth=new window.Chart(cv.getContext('2d'),{ data:{labels:labels,datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{font:{family:'Montserrat',size:11,weight:'600'},color:'#6B5B6B',boxWidth:12,padding:14,usePointStyle:true}},tooltip:{callbacks:{label:function(x){ var eur=x.dataset&&x.dataset._eur; return ' '+x.dataset.label+': '+(eur?metaEur(x.parsed.y,cur):(Number(x.parsed.y)||0).toLocaleString('nl-BE')); }}}},
      scales:{ y:{position:'left',beginAtZero:true,ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',callback:function(v){return '€'+v;}},grid:{color:'rgba(231,223,211,.55)'}}, y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false},ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',precision:0}}, x:{ticks:{font:{family:'Montserrat',size:10},color:'#9E919E',maxRotation:0,autoSkip:true,maxTicksLimit:12},grid:{display:false}} } } }); }catch(e){}
}
/* ---- Google team-PDF (gebrand A4 print-venster, hergebruikt s27PdfShell) ---- */
function googleRichPdfFooter(){ return '<div class="ads-pdffoot"><button class="ads-pdflink" onclick="googleAdsPdf()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg> Exporteer dit Google-rapport als PDF</button></div>'; }
// Grafieken offscreen renderen (animatie uit) zodat ze ALTIJD in de PDF staan, los van de actieve tab.
function _gPdfCharts(g,cur){
  var imgs={}; if(!window.Chart) return imgs;
  var host; try{ host=document.createElement('div'); host.style.cssText='position:fixed;left:-99999px;top:0;width:760px;background:#fff;z-index:-1'; document.body.appendChild(host); }catch(e){ return imgs; }
  function mk(id,datasets,labels){ try{ var wrap=document.createElement('div'); wrap.style.cssText='width:720px;height:240px;background:#fff'; var cv=document.createElement('canvas'); cv.width=720; cv.height=240; wrap.appendChild(cv); host.appendChild(wrap); var o=_gChartOpts(cur); o.animation=false; o.responsive=false; o.maintainAspectRatio=false; var ch=new window.Chart(cv.getContext('2d'),{data:{labels:labels,datasets:datasets},options:o}); imgs[id]=cv.toDataURL('image/png',1.0); ch.destroy(); }catch(e){} }
  try{
    var sMap={},cMap={},vMap={},dates={}; (g.campaigns||[]).forEach(function(c){ (c.daily||[]).forEach(function(d){ sMap[d.date]=(sMap[d.date]||0)+(d.spend||0); cMap[d.date]=(cMap[d.date]||0)+(d.clicks||0); vMap[d.date]=(vMap[d.date]||0)+(d.conversions||0); dates[d.date]=1; }); });
    var lb=Object.keys(dates).sort();
    if(lb.length>=2) mk('account',_gChartDs(lb.map(function(d){return Math.round((sMap[d]||0)*100)/100;}),lb.map(function(d){return cMap[d]||0;}),lb.map(function(d){return Math.round((vMap[d]||0)*100)/100;})),lb.map(_arDayLabel));
    (g.campaigns||[]).forEach(function(c){ var d=(c.daily||[]); if(d.length<2) return; mk('c'+c.id,_gChartDs(d.map(function(x){return Math.round((x.spend||0)*100)/100;}),d.map(function(x){return x.clicks||0;}),d.map(function(x){return Math.round((x.conversions||0)*100)/100;})),d.map(function(x){return _arDayLabel(x.date);})); });
  }catch(e){}
  try{ document.body.removeChild(host); }catch(e){}
  return imgs;
}
function _gPdfAgTable(c,cur){
  var ags=(c.adGroups||[]).slice(0,8); if(!ags.length) return '';
  var rows=ags.map(function(a){ return '<tr><td>'+esc(a.name||'-')+'</td><td class="num">'+metaEur(a.spend,cur)+'</td><td class="num">'+arNum(a.clicks)+'</td><td class="num">'+arPct(a.ctr)+'</td><td class="num">'+arDec(a.conversions,2)+'</td></tr>'; }).join('');
  return '<table><thead><tr><th>Advertentiegroep</th><th class="num">Besteed</th><th class="num">Klikken</th><th class="num">CTR</th><th class="num">Leads</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function _gPdfKwTable(kws,cur){
  var top=(kws||[]).slice(0,15); if(!top.length) return '';
  var rows=top.map(function(w){ return '<tr><td>'+esc(w.text||'-')+'</td><td>'+esc(w.campaign||'')+'</td><td class="num">'+metaEur(w.spend,cur)+'</td><td class="num">'+arNum(w.clicks)+'</td><td class="num">'+arPct(w.ctr)+'</td><td class="num">'+arDec(w.conversions,2)+'</td></tr>'; }).join('');
  return '<table><thead><tr><th>Zoekwoord</th><th>Campagne</th><th class="num">Besteed</th><th class="num">Klikken</th><th class="num">CTR</th><th class="num">Leads</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function googleAdsPdf(){
  var g=(window.S27DATA&&S27DATA.googleAdsRich&&S27DATA.googleAdsRich()); if(!g||!g.linked){ alert('Er is nog geen Google-rapportdata om te exporteren. Open eerst de Google-rapportage in de TeamView.'); return; }
  var cur=g.currency||'EUR', k=g.kpis||{}, p=g.prevKpis||null;
  var company=(state._adminActiveName||(window.S27DATA&&S27DATA.bedrijfsnaam&&S27DATA.bedrijfsnaam())||'Klant');
  var imgs=_gPdfCharts(g,cur);
  function kc(lab,val,key,inv){ return '<div class="pdf-kpi"><div class="l">'+lab+'</div><div class="v">'+val+'</div>'+(p?_pdfDelta(k[key],p[key],inv):'')+'</div>'; }
  var kpis='<div class="pdf-kpis">'+[kc('Besteed',metaEur(k.spend,cur),'spend',true),kc('Leads',arDec(k.conversions,2),'conversions',false),kc('CPL',k.conversions?metaEur(k.costPerConv,cur):'-','costPerConv',true),kc('Leadratio',arPct(k.convRate),'convRate',false),kc('Klikken',arNum(k.clicks),'clicks',false),kc('Vertoningen',arNum(k.impressions),'impressions',false),kc('CTR',arPct(k.ctr),'ctr',false),kc('CPC',metaEur(k.cpc,cur),'cpc',true),kc('CPM',metaEur(k.cpm,cur),'cpm',true)].join('')+'</div>';
  var accImg=imgs.account?'<div class="pdf-chart"><div style="font-weight:800;font-size:10px;margin-bottom:4px">Account-overzicht per dag (besteding · klikken · leads)</div><img src="'+imgs.account+'"></div>':'';
  var camps=(g.campaigns||[]).map(function(c){
    var img=imgs['c'+c.id]?'<div class="pdf-chart"><img src="'+imgs['c'+c.id]+'"></div>':'';
    return '<div class="pdf-camp"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:12.5px">'+esc(c.name||'Campagne')+'</b>'+(c.channel?'<span class="pdf-pill">'+esc(c.channel)+'</span>':'')+'</div>'
      +'<div style="font-size:9.5px;color:#6B5B6B;margin:3px 0 5px">'+metaEur(c.spend,cur)+' besteed · '+arDec(c.conversions,2)+' leads'+(c.conversions?(' · '+metaEur(c.costPerConv,cur)+' CPL'):'')+' · '+arNum(c.clicks)+' klikken · CTR '+arPct(c.ctr)+' · CPC '+metaEur(c.cpc,cur)+(c.imprShare>0?(' · vert.aandeel '+arPct(c.imprShare)):'')+'</div>'+img+_gPdfAgTable(c,cur)+'</div>';
  }).join('');
  var kwTable=_gPdfKwTable(g.keywords||[],cur);
  var recs=googleRichOptimList(g).map(function(r){ return '<div class="pdf-rec '+(r[0]==='orange'?'':r[0])+'"><b>'+r[1]+'</b><span>'+r[2]+'</span></div>'; }).join('');
  var body='<h2 class="pdf-sec">Samenvatting'+(g.compareLabel?' · vs '+esc(g.compareLabel):'')+'</h2>'+kpis+accImg
    +'<h2 class="pdf-sec">Campagnes ('+(g.campaigns||[]).length+')</h2>'+(camps||'<p style="font-size:10px;color:#6B5B6B">Geen campagnes met activiteit in deze periode.</p>')
    +(kwTable?'<h2 class="pdf-sec">Top-zoekwoorden</h2>'+kwTable:'')
    +'<h2 class="pdf-sec">Optimalisatie-aanbevelingen</h2>'+recs;
  _pdfOpen(s27PdfShell('Google Ads-rapport, '+company,'Google Ads-rapport',company+' · '+_pdfPeriodFromUI('ads'),body));
}
// item 9: openMetaCampaign/closeMetaCampaign/metaCampaignDetail (paginavervanging) verwijderd -
// campagnes openen nu inline via toggleMetaCampaign().
function _adsChev(){ return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; }
// Bug Johanna: advertenties die niet (meer) live staan duidelijk markeren i.p.v. ze als actief te tonen.
function metaAdInactive(st){ st=String(st||'').toUpperCase(); return !!st&&st!=='ACTIVE'; }
function metaAdStatusBadge(st){ if(!metaAdInactive(st)) return ''; var lbl=({PAUSED:'Gepauzeerd',ADSET_PAUSED:'Gepauzeerd',CAMPAIGN_PAUSED:'Gepauzeerd',ARCHIVED:'Gearchiveerd',DELETED:'Verwijderd',DISAPPROVED:'Afgekeurd',PENDING_REVIEW:'In review',WITH_ISSUES:'Aandacht'})[String(st).toUpperCase()]||'Inactief'; return '<span class="ads-adfmt" style="background:#EFEAE2;color:#8A7E70" title="Deze advertentie staat niet live">'+esc(lbl)+'</span>'; }
function metaAdRow(a,i,cur){
  var fm=metaFmt(a.format); var cm=a.creativeMedia||{};
  var thumb=a.thumb||cm.thumb||(a.format==='video'?(a.poster||a.image):(cm.image||a.image))||'';
  var th = thumb?'<img class="ads-adth" src="'+esc(thumb)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onmouseenter="metaPreloadCreative('+i+')" onclick="event.stopPropagation();openMetaCreative('+i+')">':'<span class="ads-adth ads-adth-none">'+ic('img',16)+'</span>';
  return '<div class="ads-adrow" onclick="adsToggleAdRow('+i+')">'
    +'<div class="ads-adcell ads-adname">'+th+'<div class="ads-adnm"><b>'+esc(a.name||'Advertentie')+'</b><span class="ads-adfmt br-'+fm[1]+'">'+(a.format==='video'?ic('play',10):'')+esc(fm[0])+'</span>'+metaAdStatusBadge(a.status)+'</div></div>'
    +'<div class="ads-adcell"><span class="ads-adm-lab">Besteed</span><b>'+metaEur(a.spend,cur)+'</b></div>'
    +'<div class="ads-adcell"><span class="ads-adm-lab">Klikken</span><b>'+adsNum(a.linkClicks||a.clicks)+'</b></div>'
    +'<div class="ads-adcell"><span class="ads-adm-lab">CTR</span><b>'+(Number(a.ctr)||0).toLocaleString('nl-BE',{maximumFractionDigits:2})+'%</b></div>'
    +'<div class="ads-adcell"><span class="ads-adm-lab">CPC</span><b>'+metaEur(a.cpc,cur)+'</b></div>'
    +'<span class="ads-adchev">'+_adsChev()+'</span></div>'
    +'<div class="ads-adexp" id="adsAdExp'+i+'" style="display:none"></div>';
}
function adsToggleAdRow(i){
  var exp=document.getElementById('adsAdExp'+i); if(!exp) return; var row=exp.previousElementSibling;
  if(exp.style.display!=='none'){ exp.style.display='none'; exp.innerHTML=''; if(row) row.classList.remove('open'); return; }
  var a=(state._metaAdsView||[])[i]; if(!a) return;
  var cur=((window.S27DATA&&S27DATA.metaAds&&S27DATA.metaAds())||{}).currency||'EUR';
  var media;
  if(a.format==='video' && a.videoSrc){ media='<video class="ads-adexp-el" src="'+esc(a.videoSrc)+'" controls preload="none" poster="'+esc(a.poster||a.image||a.thumb||'')+'"></video>'; }
  else { var vis=(a.format==='video'?(a.poster||a.image||a.thumb):(a.image||a.thumb)); media=vis?'<img class="ads-adexp-el" src="'+esc(vis)+'" alt="" referrerpolicy="no-referrer" onclick="openMetaCreative('+i+')">':'<div class="ads-adexp-el ads-adexp-none">geen voorbeeld</div>'; }
  var stats=[['Besteed',metaEur(a.spend,cur)],['Vertoningen',adsNum(a.impressions)],['Klikken',adsNum(a.linkClicks||a.clicks)],['CTR',(Number(a.ctr)||0).toLocaleString('nl-BE',{maximumFractionDigits:2})+'%'],['CPC',metaEur(a.cpc,cur)]];
  exp.innerHTML='<div class="ads-adexp-in"><div class="ads-adexp-media">'+media+'<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="openMetaCreative('+i+')">'+ic('arrow',13)+' Vergroot visual</button></div><div class="ads-adexp-stats">'+stats.map(function(s){return '<div><div class="ads-adexp-lab">'+esc(s[0])+'</div><div class="ads-adexp-num">'+s[1]+'</div></div>';}).join('')+'</div></div>';
  exp.style.display='block'; if(row) row.classList.add('open');
}
var _metaLbCar=null; // carrousel-state {idx,n} voor toetsenbord-/pijl-navigatie
function metaCloseLightbox(){ var o=document.getElementById('metaLightbox'); if(o){ o.style.display='none'; o.innerHTML=''; } _metaLbCar=null; document.removeEventListener('keydown',_metaLbKey); }
function _metaLbKey(e){
  if(e.key==='Escape'){ metaCloseLightbox(); return; }
  if(_metaLbCar){ if(e.key==='ArrowLeft') metaCarGo(-1); else if(e.key==='ArrowRight') metaCarGo(1); }
}
// Bouwt de media-inhoud (full-res foto in juiste verhouding / afspeelbare video /
// klik-doorklik carrousel). Gebruikt de genormaliseerde creativeMedia indien aanwezig,
// met terugval op de losse velden zodat oude data ook blijft werken.
function _metaLbMedia(a){
  var cm=a.creativeMedia||{};
  var type=cm.type||a.format||'image';
  if(type==='video'){
    var vsrc=cm.video||a.videoSrc||''; var poster=cm.poster||cm.image||cm.thumb||a.poster||a.image||a.thumb||'';   // SCHERPE still als poster = directe, heldere eerste indruk
    var plink=cm.permalink||a.videoPermalink||'';
    // De fbcdn-source is kort geldig, dus toon ALTIJD ook de permalink-fallback zodat de klant bij een verlopen video kan doorklikken.
    var flink=plink?'<a class="meta-lb-permalink" href="'+esc(plink)+'" target="_blank" rel="noopener">'+ic('play',14)+' Bekijk op Facebook</a>':'';
    // SNELHEID (Vincent): de pop-up opent meteen met de scherpe still; de (zware, full-res) video wordt NIET vooraf
    // gedownload (preload="none", geen autoplay). Voor "welke visuals staan live?" volstaat de still, afspelen
    // laadt de video pas op de play-knop. Meta levert geen lichtere video-resolutie, dus dit is de snelste weg.
    // kolom-wrapper zodat de permalink-fallback ONDER de video/poster komt (niet ernaast in de flex-row van .meta-lb-stage)
    if(vsrc) return '<div class="meta-lb-stage"><div class="meta-lb-col"><video class="meta-lb-vid" controls playsinline preload="none" poster="'+esc(poster)+'" src="'+esc(vsrc)+'" data-fb="'+esc(plink)+'" onerror="metaMediaErr(this)"></video>'+flink+'</div></div>';
    if(plink) return '<div class="meta-lb-stage"><div class="meta-lb-col">'+(poster?'<img class="meta-lb-media" src="'+esc(poster)+'" alt="" referrerpolicy="no-referrer" data-fb="'+esc(plink)+'" onerror="metaMediaErr(this)">':'')+flink+'</div></div>';
    var pf=poster||a.image||a.thumb||'';
    return pf?_lbImgStage(pf,plink):'<div class="meta-lb-stage"><div class="meta-lb-load"><span>Video niet beschikbaar</span></div></div>';
  }
  var cards=(cm.cards&&cm.cards.length)?cm.cards:(a.cards||[]);
  if(type==='carousel' && cards.length>1){
    _metaLbCar={idx:0,n:cards.length};
    // lazy: enkel de actieve kaart krijgt direct een src; de rest data-src (gehydrateerd bij navigeren) zodat
    // we nooit alle full-res fbcdn-beelden tegelijk laden. Spinner-gate + onerror-fallback per kaart.
    var slides=cards.map(function(c,j){
      var act=(j===0); var fb=esc(c.permalink||'');
      // lichte thumb (url_128) eerst = snelle preview; full-res wordt erna geruisloos ingeladen via _lbUpgrade
      var prev=esc(c.thumb||c.image||''); var dataFull=(c.thumb&&c.image&&c.thumb!==c.image)?(' data-full="'+esc(c.image)+'"'):'';
      var inner = c.video
        ? '<video '+(act?'src="'+esc(c.video)+'"':'data-src="'+esc(c.video)+'"')+' controls playsinline preload="none" poster="'+esc(c.thumb||c.image||'')+'" data-fb="'+fb+'" onerror="metaMediaErr(this)"></video>'
        : _lbSpin()+'<img '+(act?'src="'+prev+'"'+dataFull:'data-src="'+prev+'"'+dataFull+' loading="lazy"')+' alt="" referrerpolicy="no-referrer" data-fb="'+fb+'" onload="_lbImgLoaded(this);_lbUpgrade(this)" onerror="metaMediaErr(this)">';
      return '<div class="meta-car-slide'+(c.video?'':' is-loading')+'">'+inner+(c.title?'<div class="meta-car-t">'+esc(c.title)+'</div>':'')+'</div>';
    }).join('');
    var dots=cards.map(function(c,j){ return '<button class="meta-car-dot'+(j===0?' on':'')+'" onclick="metaCarTo('+j+')" aria-label="Kaart '+(j+1)+'"></button>'; }).join('');
    return '<div class="meta-car" id="metaCar" ontouchstart="metaCarTouchStart(event)" ontouchend="metaCarTouchEnd(event)">'
      +'<span class="meta-car-n"><span id="metaCarPos">1</span> / '+cards.length+'</span>'
      +'<div class="meta-car-track" id="metaCarTrack" style="transform:translateX(0)">'+slides+'</div>'
      +'<button class="meta-car-nav prev" id="metaCarPrev" disabled onclick="metaCarGo(-1)" aria-label="Vorige">'+_metaChevL()+'</button>'
      +'<button class="meta-car-nav next" id="metaCarNext"'+(cards.length<2?' disabled':'')+' onclick="metaCarGo(1)" aria-label="Volgende">'+_metaChevR()+'</button>'
      +'<div class="meta-car-dots">'+dots+'</div></div>';
  }
  // single image (ook een carrousel met exact 1 bruikbare kaart = gewone foto/video, geen overbodige nav-chrome)
  if(type==='carousel' && cards.length===1){
    var c0=cards[0];
    if(c0.video) return _metaLbMedia({creativeMedia:{type:'video',video:c0.video,thumb:c0.thumb||'',poster:c0.image||'',permalink:c0.permalink||''}});
    if(!c0.image) return '<div class="meta-lb-stage"><div class="meta-lb-load"><span>Geen voorbeeld beschikbaar</span></div></div>';
    return _lbImgStage(c0.image, c0.permalink||'', c0.thumb||'');
  }
  var src=cm.image||a.image||a.poster||a.thumb||'';
  if(!src) return '<div class="meta-lb-stage"><div class="meta-lb-load"><span>Geen voorbeeld beschikbaar</span></div></div>';
  return _lbImgStage(src,'',cm.thumb||a.thumb||'');
}
// spinner-overlay (blijft tot het beeld geladen is) + onload/onerror-helpers voor de lightbox-media
function _lbSpin(){ return '<div class="meta-lb-load spin"><div class="brand-spinner"></div></div>'; }
function _lbImgLoaded(el){ try{ var s=(el.closest&&(el.closest('.meta-car-slide')||el.closest('.meta-lb-stage'))); if(s) s.classList.remove('is-loading'); }catch(e){} }
function _lbImgStage(src,plink,thumb){
  thumb=(thumb&&thumb!==src)?thumb:'';
  var initial=thumb||src; var dataFull=thumb?(' data-full="'+esc(src)+'"'):'';
  return '<div class="meta-lb-stage is-loading">'+_lbSpin()+'<img class="meta-lb-media" src="'+esc(initial)+'"'+dataFull+' alt="" referrerpolicy="no-referrer" data-fb="'+esc(plink||'')+'" onload="_lbImgLoaded(this);_lbUpgrade(this)" onerror="metaMediaErr(this)"></div>';
}
// blur-up: zodra de lichte thumb getoond is, laad de full-res in de achtergrond en swap geruisloos
function _lbUpgrade(el){ try{ var full=el.getAttribute&&el.getAttribute('data-full'); if(!full||full===el.getAttribute('src')) return; var hi=new Image(); hi.referrerPolicy='no-referrer'; hi.onload=function(){ try{ el.src=full; el.removeAttribute('data-full'); }catch(e){} }; hi.onerror=function(){ try{ el.removeAttribute('data-full'); }catch(e){} }; hi.src=full; }catch(e){} }
// fbcdn-URL's verlopen snel -> nette fout-fallback i.p.v. een kapot/garbled kader, met permalink-doorklik indien beschikbaar
function metaMediaErr(el){
  if(!el || el.__err) return; el.__err=1;
  var plink=(el.getAttribute && el.getAttribute('data-fb'))||'';
  var host=(el.closest && (el.closest('.meta-car-slide')||el.closest('.meta-lb-col')||el.closest('.meta-lb-stage')))||el.parentNode;
  try{ el.style.display='none'; }catch(e){}
  if(host){
    if(host.classList) host.classList.remove('is-loading');
    if(!host.querySelector('.meta-lb-err')){
      host.insertAdjacentHTML('beforeend','<div class="meta-lb-load meta-lb-err"><span>Voorbeeld niet meer beschikbaar</span>'+(plink?'<a class="meta-lb-permalink" style="margin-top:14px" href="'+esc(plink)+'" target="_blank" rel="noopener">Bekijk op Facebook</a>':'')+'</div>');
    }
  }
}
function _metaChevL(){ return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'; }
function _metaChevR(){ return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'; }
function metaCarTo(j){
  if(!_metaLbCar) return; j=Math.max(0,Math.min(_metaLbCar.n-1,j)); _metaLbCar.idx=j;
  var tr=document.getElementById('metaCarTrack'); if(tr) tr.style.transform='translateX(-'+(j*100)+'%)';
  // lazy-hydrateer de actieve kaart + directe buren (data-src -> src), nooit alle full-res beelden tegelijk
  if(tr){ var sl=tr.children; [j-1,j,j+1].forEach(function(kk){ if(kk<0||kk>=sl.length) return; var el=sl[kk].querySelector('[data-src]'); if(el){ el.src=el.getAttribute('data-src'); el.removeAttribute('data-src'); } }); }
  var pos=document.getElementById('metaCarPos'); if(pos) pos.textContent=(j+1);
  var prev=document.getElementById('metaCarPrev'); if(prev) prev.disabled=(j<=0);
  var next=document.getElementById('metaCarNext'); if(next) next.disabled=(j>=_metaLbCar.n-1);
  var dots=document.querySelectorAll('#metaCar .meta-car-dot'); for(var k=0;k<dots.length;k++) dots[k].classList.toggle('on',k===j);
  // pauzeer video's op niet-actieve kaarten
  var vids=document.querySelectorAll('#metaCarTrack video'); for(var v=0;v<vids.length;v++){ try{ vids[v].pause(); }catch(e){} }
}
function metaCarGo(d){ if(_metaLbCar) metaCarTo(_metaLbCar.idx+d); }
// item 8a: swipe op de carrousel (naast de pijl-knoppen + pijltjestoetsen)
var _metaCarX=null, _metaCarY=null;
function metaCarTouchStart(e){ var t=(e&&e.touches&&e.touches[0])||null; _metaCarX=t?t.clientX:null; _metaCarY=t?t.clientY:null; }
function metaCarTouchEnd(e){ if(_metaCarX==null||!_metaLbCar){ _metaCarX=null; _metaCarY=null; return; } var t=(e&&e.changedTouches&&e.changedTouches[0])||null; var dx=t?(t.clientX-_metaCarX):0; var dy=(t&&_metaCarY!=null)?(t.clientY-_metaCarY):0; _metaCarX=null; _metaCarY=null; if(Math.abs(dx)<=Math.abs(dy)) return; if(dx<-30) metaCarGo(1); else if(dx>30) metaCarGo(-1); }
function openMetaCreative(i){
  var a=(state._metaAdsView||[])[i]; if(!a) return;
  _metaLbCar=null; // reset carrousel-state: pijltjes mogen nooit op een vorige carrousel inwerken
  metaEnsureStyles();
  // 1) Open de lightbox-shell ONMIDDELLIJK met een spinner, directe klik-feedback.
  var ov=document.getElementById('metaLightbox');
  if(!ov){ ov=document.createElement('div'); ov.id='metaLightbox'; ov.className='meta-lb'; ov.addEventListener('click',metaCloseLightbox); document.body.appendChild(ov); }
  ov.innerHTML='<div class="meta-lb-box" onclick="event.stopPropagation()"><div class="meta-lb-stage"><div class="meta-lb-load"><div class="brand-spinner"></div><span>Voorbeeld laden…</span></div></div><div class="meta-lb-cap"><span>'+esc(a.name||'Advertentie')+'</span><button class="btn btn-ghost btn-sm" onclick="metaCloseLightbox()">Sluiten</button></div></div>';
  ov.style.display='flex';
  document.addEventListener('keydown',_metaLbKey);
  // 2) Vul de echte media in (volgende frame, zodat de spinner zeker geverfd is).
  requestAnimationFrame(function(){
    var cur=document.getElementById('metaLightbox'); if(!cur || cur.style.display==='none') return;
    var note=((a.creativeMedia&&a.creativeMedia.type==='video')||a.format==='video') && !((a.creativeMedia&&a.creativeMedia.video)||a.videoSrc||(a.creativeMedia&&a.creativeMedia.permalink)||a.videoPermalink)?', video niet beschikbaar':'';
    cur.innerHTML='<div class="meta-lb-box" onclick="event.stopPropagation()">'+_metaLbMedia(a)+'<div class="meta-lb-cap"><span>'+esc(a.name||'Advertentie')+note+'</span><button class="btn btn-ghost btn-sm" onclick="metaCloseLightbox()">Sluiten</button></div></div>';
    if(_metaLbCar) metaCarTo(0);   // pre-hydrateer kaart 1 (+buur 2) zodat eerste bladeren vlot is
  });
}
// preload bij hover: trek de full-res image/poster van deze ad alvast in cache zodat de lightbox bijna instant opent.
// NIET de .mp4 (te zwaar), enkel de poster/foto. Eénmalig per ad (a.__pl).
function metaPreloadCreative(i){
  try{
    var a=(state._metaAdsView||[])[i]; if(!a||a.__pl) return; a.__pl=1;
    var cm=a.creativeMedia||{}; var urls=[];
    if(cm.type==='carousel'){ var c0=(cm.cards&&cm.cards[0])||null; if(c0) urls.push(c0.image||c0.thumb); }
    else if(cm.type==='video'){ urls.push(cm.poster||cm.thumb||a.poster); }
    else { urls.push(cm.image||a.image); }
    urls.filter(Boolean).forEach(function(u){ var im=new Image(); im.referrerPolicy='no-referrer'; im.src=u; });
  }catch(e){}
}

// (Resultaten-tab verwijderd, alle advertentiedata staat nu real-time op de Advertenties-tab via metaAds.)

// Meetings-tab: geen hero (op vraag verwijderd, gaf te veel ruimteverlies). Frisse
// overzicht-kaarten + "nog in te plannen"-signaal + de plan-tunnel (3 ingangen) die de
// schermvullende planner-overlay opent (openMeetingPlanner in portal.js).
function panelMeetings(){
  const mt=(window.S27DATA && S27DATA.meetings());
  const MAAND=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  const meetCard=(m,forceType)=>{
    const d=m.dt; const uur=d?(('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)):'';
    const online=!!m.link;
    const typeLabel = forceType || (m.type==='Kickoff' ? 'Kick-off'
      : (/kick-?off/i.test(m.titel||'') ? 'Kick-off'
      : (/(project|overleg)/i.test(m.titel||'') ? 'Projectmeeting' : 'Algemene meeting')));
    const actie = online
      ? `<a class="mcard-cta btn btn-branch br-blue btn-sm" href="${esc(m.link)}" target="_blank" rel="noopener">Deelnemen</a>`
      : `<button class="mcard-cta btn btn-outline btn-sm" onclick="meetRoute()">Route ${ic('pin',14)}</button>`;
    return `<div class="mcard">
      <div class="mcard-date ${online?'br-blue':'br-orange'}"><span class="d">${d?d.getDate():'-'}</span><span class="mo">${d?MAAND[d.getMonth()]:''}</span></div>
      <div class="mcard-main">
        <span class="mcard-type">${online?ic('video',13):ic('cal',13)} ${esc(typeLabel)}</span>
        <b class="mcard-ttl">${esc(m.titel||'Meeting')}</b>
        <div class="mcard-meta">${ic('clock',13)} ${uur} · ${ic('pin',13)} ${online?'Google Meet':'Studio 27, Rijkevorsel'}</div>
      </div>
      <div class="mcard-act">${actie}</div>
    </div>`;
  };
  let upCount=0, listHtml='';
  if(mt){
    // 'up' = enkel toekomstige meetings met geldige datum, chronologisch (consistent met de zijbalk-badge).
    const up=mt.list.filter(m=>m.dt && !isNaN(m.dt.getTime()) && m.dt.getTime()>=Date.now()-86400000)
                    .sort((a,b)=>a.dt.getTime()-b.dt.getTime());
    upCount=up.length;
    listHtml = up.length ? up.map(m=>meetCard(m)).join('')
      : `<div class="mcard-empty"><div class="mcard-empty-ic">${ic('cal',32)}</div><b>Geen meetings gepland</b><p>Je hebt momenteel geen afspraken staan met Studio 27. Plan er hiernaast vlot eentje in, helemaal wanneer het jou past.</p></div>`;
  } else if(state.demoMode){
    // demo: twee mock-afspraken in de nabije toekomst (zodat het overzicht leeft).
    const d1=new Date(Date.now()+6*86400000); d1.setHours(10,0,0,0);
    const d2=new Date(Date.now()+13*86400000); d2.setHours(14,0,0,0);
    upCount=2;
    listHtml = meetCard({dt:d1,titel:'Maandelijkse rapportage',link:'https://meet.google.com/'})
             + meetCard({dt:d2,titel:'Kick-off recruitmentvideo',link:''},'Kick-off');
  } else {
    // LIVE zonder geladen meetings -> eerlijke lege-staat, NOOIT verzonnen afspraken.
    upCount=0;
    listHtml = `<div class="mcard-empty"><div class="mcard-empty-ic">${ic('cal',32)}</div><b>Geen meetings gepland</b><p>Je hebt momenteel geen afspraken staan met Studio 27. Plan er hiernaast vlot eentje in, helemaal wanneer het jou past.</p></div>`;
  }
  // "Nog in te plannen": projecten met een wachtende meeting-plan-taak (cockpit plan_items, type meeting).
  const todo=_meetingsTodo();
  const todoHtml = todo.length ? `<div class="mtodo">
      <div class="mtodo-h">${ic('st_plan',16)} Nog in te plannen</div>
      <div class="mtodo-list">${todo.map(t=>`<button class="mtodo-row br-${t.br}" onclick="${t.action}"><span class="mtodo-dot"></span><span class="mtodo-tx"><b>${esc(t.cat)}</b><span>Voor dit project kun je een meeting inplannen.</span></span>${ic('arrow',15)}</button>`).join('')}</div>
    </div>` : '';
  return `<div class="meet2">
    <div class="meet2-grid">
      <section class="meet2-main">
        <div class="section-head" style="margin-top:0"><h2>Geplande meetings</h2><span class="count">${upCount} gepland</span></div>
        <div class="mcard-list">${listHtml}</div>
        ${todoHtml}
      </section>
      <aside class="card meet2-plan">
        <h3 class="meet2-plan-h">Plan een meeting</h3>
        <p class="meet2-plan-sub">Kies wat je wil bespreken, je prikt zelf een vrij moment.</p>
        <button class="planopt" onclick="openMeetingPlanner('algemeen')"><span class="planopt-ic br-blue">${ic('msg',20)}</span><span class="planopt-tx"><b>Algemene meeting</b><span>Bijpraten over de samenwerking</span></span>${ic('arrow',16)}</button>
        ${isRichView()?`<button class="planopt" onclick="openMeetingPlanner('project')"><span class="planopt-ic br-purple">${ic('video',20)}</span><span class="planopt-tx"><b>Projectmeeting</b><span>Over een lopend project</span></span>${ic('arrow',16)}</button>`:''}
        <button class="planopt" onclick="openMeetingPlanner('nieuw')"><span class="planopt-ic br-orange">${ic('spark',20)}</span><span class="planopt-tx"><b>Nieuw project</b><span>Iets nieuws opstarten</span></span>${ic('arrow',16)}</button>
      </aside>
    </div>
  </div>`;
}
// "Nog in te plannen"-signaal: meeting-plan-items uit de cockpit (afgeleid uit p.plan_items,
// type meeting → cta 'Plan moment'). Leeg in demo (geen live dashboard) → blok verbergt zich.
function _meetingsTodo(){
  try{ var cp=(window.S27DATA&&S27DATA.cockpit&&S27DATA.cockpit())||null; if(!cp)return [];
    return cp.filter(function(c){ return c.title==='Klaar om in te plannen' && c.cta==='Plan moment'; }); }
  catch(e){ return []; }
}
function meetRoute(){ window.open('https://www.google.com/maps/search/?api=1&query=Studio+27+Merksplassesteenweg+97+2310+Rijkevorsel','_blank','noopener'); }

// De losse 'Nieuw project'-aanvraagmodule (offerteRequestForm/submitNieuwProject, het
// laatste pad naar de Make-hook newProjectIntake) is in golf 1 (11-07) verwijderd en
// vervangen door de volledige Offertes-pagina (panelOffertes). Zijbalk en topbar
// wijzen naar 'offertes'.

function huisstijlSecties(){
  /* GOLF 6: de hardcoded Studio 27-kleuren en -fonts zijn verwijderd. Er bestaat
     (nog) geen D1/bedrijfContent-bron voor merkkleuren of fonts per klant, dus we
     tonen ALLEEN echte data: de bestanden uit de gedeelde Huisstijl-map op Drive.
     Komt er ooit brandingdata in D1, dan kan hier een echte merksectie bij. */
  const files=(window.S27DATA && S27DATA.huisstijl());
  const fmtBytes=(n)=>{ n=parseInt(n,10)||0; if(!n)return ''; if(n<1024)return n+' B'; if(n<1048576)return Math.round(n/1024)+' KB'; return (n/1048576).toFixed(1)+' MB'; };
  const mimeIc=(m)=>{ m=String(m||''); if(m.indexOf('image')===0)return 'img'; if(m.indexOf('video')===0)return 'video'; return 'doc'; };
  const fileMeta=(f)=>{ const p=[]; const b=fmtBytes(f.size); if(b)p.push(b); if(f.modified){ const d=new Date(f.modified); if(!isNaN(d.getTime()))p.push(d.toLocaleDateString('nl-BE',{day:'numeric',month:'short',year:'numeric'})); } return p.join(' · '); };
  const fileCards = files ? (files.length ? files.map(f=>`<div class="filecard" style="min-width:240px"><div class="ft">${ic(mimeIc(f.mime),20)}</div><div style="flex:1;min-width:0"><div class="fn" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</div><div class="fs">${esc(fileMeta(f))}</div></div><a class="icon-btn" style="width:34px;height:34px" href="${esc(f.url||'#')}" target="_blank" rel="noopener" title="Downloaden">${ic('download',16)}</a><button class="icon-btn" style="width:34px;height:34px" title="Verwijderen" aria-label="Verwijderen" onclick="deleteHuisstijl('${esc(f.id||'')}',this)">${ic('trash',15)}</button></div>`).join('') : '<div class="fs" style="color:var(--ink-4)">Nog geen bestanden in je Huisstijl-map. Sleep hieronder een bestand om te beginnen.</div>')
    : `<div class="filecard" style="min-width:240px"><div class="ft">${ic('img',20)}</div><div style="flex:1"><div class="fn">logo-tc-fullcolor.svg</div><div class="fs">Vector · 24 KB</div></div><button class="icon-btn" style="width:34px;height:34px">${ic('download',16)}</button></div><div class="filecard" style="min-width:240px"><div class="ft">${ic('img',20)}</div><div style="flex:1"><div class="fn">logo-tc-wit.png</div><div class="fs">PNG · 180 KB</div></div><button class="icon-btn" style="width:34px;height:34px">${ic('download',16)}</button></div>`;
  return `<div class="setsec">
    <h3>Huisstijl-bestanden</h3><p class="sdesc">Alle bestanden uit je gedeelde Huisstijl-map op Google Drive, logo's, fonts, templates. Altijd up-to-date.</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap">${fileCards}</div>
    <div class="dropzone" style="margin-top:14px" onclick="document.getElementById('hsFile').click()">${ic('upload',30)}<b>Sleep je bestand hierheen</b><div style="font-size:12.5px;margin-top:4px">of klik om te bladeren · SVG, PNG, AI, PDF</div></div>
    <div id="hsMsg" class="fs" style="margin-top:10px;min-height:18px"></div>
    <input type="file" id="hsFile" style="display:none" onchange="uploadHuisstijl(this)">
  </div>`;
}
function panelHuisstijl(){
  return hero('pink','Mijn bedrijf · Huisstijl',
    `Jouw <span class="accent">merk${squig()}</span> &amp; bestanden`,
    'Alles wat we nodig hebben om consistent voor je te werken, netjes bij elkaar.',
    scribble('krabbel-roze.png','top:-4px;right:8px;width:120px;transform:rotate(-6deg)'))
  + huisstijlSecties();
}

function panelFacturatie(){
  // Facturatiegegevens (ondernemingsnummer, facturatie-email, opmerkingen) staan terug op DEZE tab.
  return facturatieBlock()
  +`<div class="setsec">
    <h3>Facturen</h3>
    <div class="empty" style="padding:34px 20px"><div class="em-ic">${ic('doc',52)}</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Binnenkort hier</b><p style="margin:6px 0 0">Zodra je facturen automatisch gekoppeld zijn, vind je ze hier overzichtelijk terug. Een factuur nodig? Je Studio 27-contact bezorgt ze je vlot.</p></div>
  </div>`;
}

/* ===== OFFERTES ===== */
const OFFERTE_MOCK=[
  {id:'om1',naam:'Bedrijfsfilm "Onder één dak"',status:'Verstuurd',link:'#',budget:'2950',vervaldatum:''},
  {id:'om2',naam:'Merkstrategie 2026',status:'Bekeken',link:'#',budget:'3400',vervaldatum:''},
  {id:'om3',naam:'Website & SEO-traject',status:'Goedgekeurd',link:'#',budget:'6800',vervaldatum:''}
];
function offerteAfgerond(st){ return /goedgekeur|approv|completed|done|afgerond|declin|geweiger|afgewezen|verlopen|expired|gefactureerd|gewonnen|verloren/i.test(String(st||'')); }
// Alleen tonen vanaf 'verzonden' (sent); concept/to do/draft EN archived blijven verborgen
function offerteVisible(st){ return !/draft|concept|to ?do|todo|backlog|aangevraagd|in afwachting|archived|gearchiveerd/i.test(String(st||'').trim()); }
// Volledige label-map: de gateway stuurt rauwe status-keys (sent/viewed/completed/declined);
// de NL-vormen blijven erin als vangnet voor oudere responses. Fallback = lege badge.
function offerteStatusLabel(st){ var s=String(st||'').toLowerCase().trim(); var m={sent:'Verzonden',viewed:'Bekeken',completed:'Goedgekeurd',approved:'Goedgekeurd',declined:'Geweigerd',expired:'Verlopen',draft:'Concept',archived:'Gearchiveerd',waiting_approval:'In afwachting',paid:'Betaald',verzonden:'Verzonden',bekeken:'Bekeken',goedgekeurd:'Goedgekeurd',afgewezen:'Geweigerd',geweigerd:'Geweigerd',verlopen:'Verlopen',concept:'Concept'}; return m[s]||''; }
function offerteRow(o){
  var budget=o.budget?('€ '+(Number(String(o.budget).replace(',','.'))||0).toLocaleString('nl-BE')):'';
  var verval=''; if(o.vervaldatum){ var d=new Date(parseInt(o.vervaldatum,10)||o.vervaldatum); if(!isNaN(d.getTime()))verval='vervalt '+d.toLocaleDateString('nl-BE',{day:'numeric',month:'short',year:'numeric'}); }
  var meta=[o.status?esc(offerteStatusLabel(o.status)):'', budget, verval].filter(Boolean).join(' · ');
  return '<div class="filecard" style="flex-wrap:wrap"><div class="ft">'+ic('doc',20)+'</div>'
    +'<div style="flex:1;min-width:170px"><div class="fn">'+esc(o.naam||'Offerte')+'</div><div class="fs">'+meta+'</div></div>'
    +(o.link&&o.link!=='#'?'<a class="btn btn-branch br-purple btn-sm" href="'+esc(o.link)+'" target="_blank" rel="noopener">Open offerte '+ic('arrow',14)+'</a>':(o.link==='#'?'<button class="btn btn-branch br-purple btn-sm">Open offerte '+ic('arrow',14)+'</button>':''))
    +'<button class="btn btn-outline btn-sm" onclick="offerteVraag(\''+esc(o.id)+'\',this)">Vraag stellen</button></div>';
}
// Facturatiegegevens-detail op de Offertes-pagina (verhuisd van Facturatie).
// Ondernemingsnummer + facturatie-email staan voor-ingevuld (uit het contract);
// facturatie-opmerkingen schrijft rechtstreeks weg naar het bedrijf-taakveld (facturatieSave).
function facturatieBlock(){
  var demo=!_live();
  var f=(window.S27DATA && S27DATA.facturatie && S27DATA.facturatie())||{};
  var onum=f.ondernemingsnummer||(demo?'BE 0123.456.789':'');
  var email=f.facturatie_email||(demo?'boekhouding@testclient.be':'');
  var opm=f.facturatie_opmerkingen||'';
  var fld='font-family:var(--font-body);font-size:14px;padding:11px 13px;border:1px solid var(--line);border-radius:var(--r-sm);outline:none;background:#fff';
  return '<div class="section-head" style="margin-top:8px"><h2>Standaard facturatiegegevens</h2></div>'
    +'<div class="setsec" style="margin-top:0">'
    +'<div class="set-grid">'
    +'<div class="field"><label>Ondernemingsnummer / BTW</label><input id="facBtw" value="'+esc(onum)+'" placeholder="BE 0xxx.xxx.xxx" style="'+fld+'"></div>'
    +'<div class="field"><label>Facturatie-e-mail</label><input id="facEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="'+esc(email)+'" placeholder="boekhouding@…" style="'+fld+'"></div>'
    +'<div class="field" style="grid-column:1/-1"><label>Facturatie-opmerkingen</label><textarea id="facOpm" rows="2" style="'+fld+';resize:vertical" placeholder="bv. PO-nummer of wijziging ondernemingsnummer">'+esc(opm)+'</textarea></div>'
    +'</div>'
    +'<div style="margin-top:14px"><button class="btn btn-branch br-green btn-sm" onclick="saveBedrijfGegevens(this)">'+ic('check',15)+' Facturatiegegevens opslaan</button></div>'
    +'</div>';
}

/* =============================================================================
   OFFERTE-SAMENSTELLER, klant stelt zelf een offerte samen uit de catalogus
   -----------------------------------------------------------------------------
   Bron: window.S27_CATALOG (catalog-data.js, offline). Winkelmand leeft in
   state._offerteCart (sku -> aantal). Live deelrender via renderOfferteBuilder()
   in de #offBuilder-container (geen volledige panel-rerender -> scroll blijft).
   Verzenden: offerteSubmit() in portal.js -> api(ENDPOINTS.offerteGenereren,...).
   ============================================================================= */
function offCatalog(){ return (typeof window!=='undefined' && window.S27_CATALOG && window.S27_CATALOG.length) ? window.S27_CATALOG : []; }
function offEur(n){ return '€ '+(Number(n)||0).toLocaleString('nl-BE',{minimumFractionDigits:0,maximumFractionDigits:2}); }
function offCart(){ if(!state._offerteCart) state._offerteCart={}; return state._offerteCart; }
function offBySku(sku){ var c=offCatalog(); for(var i=0;i<c.length;i++){ if(String(c[i].sku)===String(sku)) return c[i]; } return null; }
// vaste tabvolgorde (meest gevraagde groepen vooraan); alleen groepen die echt bestaan worden getoond
const OFF_GROUP_ORDER=['Strategie','Branding','Video & fotografie','SEO & GEO','Social media','Adverteren'];
// Studio 27-branding per offerte-tak: kleur (br-*) + icoon, zodat de klant de takken meteen herkent.
const OFF_GROUP_BRAND={'Strategie':{br:'blue',icon:'strategie'},'Branding':{br:'pink',icon:'branding'},'Video & fotografie':{br:'purple',icon:'video'},'SEO & GEO':{br:'green',icon:'website'},'Social media':{br:'yellow',icon:'social'},'Adverteren':{br:'orange',icon:'ads'}};
function offGroupBrand(g){ return OFF_GROUP_BRAND[g]||{br:'purple',icon:'doc'}; }
function offGroups(){
  var seen={}, cat=offCatalog(); cat.forEach(function(p){ seen[p.group]=1; });
  var ordered=OFF_GROUP_ORDER.filter(function(g){ return seen[g]; });
  Object.keys(seen).forEach(function(g){ if(ordered.indexOf(g)<0) ordered.push(g); });   // onbekende groepen achteraan
  return ordered;
}
function offCartCount(){ var c=offCart(),n=0; Object.keys(c).forEach(function(k){ n+=c[k]||0; }); return n; }
function offCartTotal(){ var c=offCart(),t=0; Object.keys(c).forEach(function(sku){ var p=offBySku(sku); if(p) t+=(Number(p.price)||0)*(c[sku]||0); }); return t; }
// platte tekst uit desc_html (eerste zin), voor een korte regel onder de productnaam
function offDescShort(html){
  var t=String(html||'').replace(/<li>/gi,' · ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
  t=t.replace(/^ · /,''); return t.length>120 ? t.slice(0,118)+'…' : t;
}
// 1 productregel met aantal-stepper (compact). showGroup toont de subgroep-tag (bij zoeken/populair).
function offProductRow(p, showGroup){
  var c=offCart(), qty=c[p.sku]||0;
  var sub=(showGroup? (p.group+(p.sub?(' · '+p.sub):'')) : (p.sub||''));
  var priceTxt = (Number(p.price)>0) ? offEur(p.price) : 'op maat';
  var stepper = qty>0
    ? '<div class="off-step"><button class="off-stepbtn" aria-label="Minder" onclick="offQty(\''+esc(p.sku)+'\',-1)">'+ic('minus',15)+'</button><span class="off-qty" id="offq-'+esc(p.sku)+'">'+qty+'</span><button class="off-stepbtn" aria-label="Meer" onclick="offQty(\''+esc(p.sku)+'\',1)">'+ic('plus',15)+'</button></div>'
    : '<button class="btn btn-branch br-purple btn-sm off-addbtn" onclick="offAdd(\''+esc(p.sku)+'\')">'+ic('plus',14)+' Toevoegen</button>';
  return '<div class="off-prow'+(qty>0?' in-cart':'')+'" data-sku="'+esc(p.sku)+'" data-name="'+esc((p.name||'').toLowerCase())+'" data-group="'+esc(p.group)+'">'
    +'<div class="off-pinfo"><div class="off-pname">'+esc(p.name)+'</div>'
    +(sub?'<div class="off-psub">'+esc(sub)+'</div>':'')
    +(offDescShort(p.desc_html)?'<div class="off-pdesc">'+esc(offDescShort(p.desc_html))+'</div>':'')
    +'</div>'
    +'<div class="off-pright"><div class="off-pprice">'+priceTxt+'</div>'+stepper+'</div>'
  +'</div>';
}
// winkelmand-zijkant (lopend totaal + verzendknop)
function offCartPanel(){
  var c=offCart(), skus=Object.keys(c).filter(function(k){return c[k]>0;}), total=offCartTotal();
  var rows = skus.length ? skus.map(function(sku){
    var p=offBySku(sku); if(!p) return '';
    var line=(Number(p.price)||0)*(c[sku]||0);
    return '<div class="off-citem"><div class="off-citx"><div class="off-ciname">'+esc(p.name)+'</div><div class="off-ciqty">'+c[sku]+' × '+( (Number(p.price)>0)?offEur(p.price):'op maat')+'</div></div>'
      +'<div class="off-cilinewrap"><span class="off-ciline">'+( (Number(p.price)>0)?offEur(line):'op maat')+'</span><button class="off-cirm" aria-label="Verwijder" onclick="offRemove(\''+esc(sku)+'\')">'+ic('trash',14)+'</button></div></div>';
  }).join('') : '<div class="off-cempty">'+ic('cart',26)+'<p>Je winkelmand is nog leeg. Voeg producten toe om je offerte samen te stellen.</p></div>';
  var hasOpMaat = skus.some(function(sku){ var p=offBySku(sku); return p && !(Number(p.price)>0); });
  return '<aside class="off-cart card" id="offCart">'
    +'<div class="off-carthead">'+ic('cart',18)+'<b>Jouw selectie</b><span class="off-cartn" id="offCartN">'+offCartCount()+'</span></div>'
    +'<div class="off-citems" id="offCartItems">'+rows+'</div>'
    +'<div class="off-carttotal"><span>Totaal</span><b id="offCartTotal">'+offEur(total)+'</b></div>'
    +(hasOpMaat?'<div class="off-cartnote">Items "op maat" prijzen we persoonlijk in je offerte.</div>':'')
    +'<div class="field" style="margin-top:12px"><label for="offOpm">Opmerking (optioneel)</label><textarea id="offOpm" rows="2" placeholder="Context, timing of een specifieke wens…" style="font-family:var(--font-body);font-size:13.5px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--r-sm);outline:none;background:#fff;resize:vertical">'+esc(state._offerteOpm||'')+'</textarea></div>'
    +'<button class="btn btn-primary btn-block off-submit" id="offSubmitBtn" onclick="offerteSubmit(this)"'+(skus.length?'':' disabled')+'>'+ic('send',16)+' Offerte aanvragen</button>'
    +'<p class="off-cartdisc">'+ic('info',14)+' Je krijgt meteen een richtprijs, wij kijken alles persoonlijk na voor je definitieve offerte.</p>'
    +'<div class="off-result" id="offResult" style="display:none"></div>'
  +'</aside>';
}
// de eigenlijke samensteller (populair + tabs + zoek + productlijst + winkelmand)
function offBuilderInner(){
  var groups=offGroups();
  var active=state._offerteGroup; if(groups.indexOf(active)<0) active=groups[0]||'';
  state._offerteGroup=active;
  var q=String(state._offerteSearch||'').trim().toLowerCase();
  var cat=offCatalog();
  // 'Meest gevraagd'-strip verwijderd (op vraag); de klant kiest direct via de gebrande tak-tabs.
  var popHTML = '';
  var tabs='<div class="off-tabs" id="offTabs" role="tablist">'+groups.map(function(g){
    var n=cat.filter(function(p){return p.group===g;}).length;
    var b=offGroupBrand(g);
    return '<button class="off-tab br-'+b.br+(g===active?' active':'')+'" role="tab" onclick="offSetGroup(\''+esc(g)+'\')"><span class="off-tabic">'+ic(b.icon,15)+'</span>'+esc(g)+'<span class="off-tabn">'+n+'</span></button>';
  }).join('')+'</div>';
  var search='<div class="off-search"><span class="off-searchic">'+ic('search',16)+'</span><input id="offSearch" type="search" placeholder="Zoek een product of dienst…" value="'+esc(state._offerteSearch||'')+'" oninput="offSearch(this.value)"></div>';
  // productlijst: bij zoeken over de hele catalogus, anders enkel de actieve groep
  var list, shown;
  if(q){
    shown=cat.filter(function(p){ return (p.name||'').toLowerCase().indexOf(q)>=0 || (p.sub||'').toLowerCase().indexOf(q)>=0 || (p.group||'').toLowerCase().indexOf(q)>=0; });
    list = shown.length ? shown.map(function(p){return offProductRow(p,true);}).join('') : '<div class="off-noresult">Geen producten gevonden voor "'+esc(state._offerteSearch||'')+'". Probeer een andere zoekterm of kies een categorie.</div>';
  } else {
    shown=cat.filter(function(p){return p.group===active;});
    // binnen de groep groeperen op subgroep voor nette tussenkopjes
    var bySub={}; shown.forEach(function(p){ var k=p.sub||'Algemeen'; (bySub[k]=bySub[k]||[]).push(p); });
    list=Object.keys(bySub).map(function(k){
      return (Object.keys(bySub).length>1?'<div class="off-subhead">'+esc(k)+'</div>':'')+bySub[k].map(function(p){return offProductRow(p,false);}).join('');
    }).join('');
  }
  var listWrap='<div class="off-list" id="offList">'+list+'</div>';
  return '<div class="off-grid">'
    +'<div class="off-main">'+search+popHTML+tabs+listWrap+'</div>'
    +offCartPanel()
  +'</div>';
}
function offBuilderStyleOnce(){ return $id('offStyle')?'':('<style id="offStyle">'
  +'.off-section-intro{margin:-2px 0 14px;max-width:64ch}'
  +'.off-grid{display:grid;grid-template-columns:1fr 340px;gap:18px;align-items:start}'
  +'@media(max-width:900px){.off-grid{grid-template-columns:1fr}}'
  +'.off-search{position:relative;margin-bottom:14px}'
  +'.off-search input{width:100%;box-sizing:border-box;font-family:var(--font-body);font-size:14.5px;padding:12px 14px 12px 42px;border:1px solid var(--line);border-radius:999px;outline:none;background:#fff}'
  +'.off-search input:focus{border-color:var(--s27-purple);box-shadow:0 0 0 3px rgba(148,65,219,.12)}'
  +'.off-searchic{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--ink-4);pointer-events:none}'
  +'.off-popular{margin-bottom:16px}'
  +'.off-poplab{display:flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:800;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--s27-purple-ink);margin-bottom:8px}'
  +'.off-poprow{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}'
  +'.off-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}'
  +'.off-tab{display:inline-flex;align-items:center;gap:7px;font-family:var(--font-display);font-weight:700;font-size:13px;color:var(--ink-3);background:var(--paper-2,#FAF7F2);border:1px solid var(--line);padding:8px 13px;border-radius:999px;cursor:pointer;transition:background .18s,color .18s,border-color .18s}'
  +'.off-tabic{display:inline-flex;align-items:center;color:var(--c,var(--s27-purple))}'
  +'.off-tab:hover{border-color:var(--c,var(--s27-purple))}'
  +'.off-tab.active{background:var(--c-soft,rgba(148,65,219,.12));border-color:var(--c,var(--s27-purple));color:var(--c-ink,var(--s27-purple-ink))}'
  +'.off-tab.active .off-tabic{color:var(--c-ink,var(--s27-purple-ink))}'
  +'.off-tabn{font-size:11px;font-weight:800;background:rgba(0,0,0,.08);border-radius:999px;padding:0 7px;min-width:18px;text-align:center}'
  +'.off-tab.active .off-tabn{background:color-mix(in oklab,var(--c) 22%,transparent);color:var(--c-ink)}'
  +'.off-subhead{font-family:var(--font-display);font-weight:800;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-4);margin:14px 0 7px}'
  +'.off-list{display:flex;flex-direction:column;gap:8px}'
  +'.off-prow{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px;transition:border-color .15s,box-shadow .15s}'
  +'.off-prow.in-cart{border-color:var(--s27-purple);box-shadow:0 2px 10px rgba(148,65,219,.10)}'
  +'.off-pinfo{flex:1;min-width:0}'
  +'.off-pname{font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--ink);line-height:1.25}'
  +'.off-psub{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-4);margin-top:2px}'
  +'.off-pdesc{font-size:12.5px;color:var(--ink-3);margin-top:4px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
  +'.off-pright{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex:0 0 auto}'
  +'.off-pprice{font-family:var(--font-display);font-weight:800;font-size:14.5px;color:var(--s27-purple-ink);white-space:nowrap}'
  +'.off-step{display:inline-flex;align-items:center;gap:2px;background:var(--paper-2,#FAF7F2);border:1px solid var(--line);border-radius:999px;padding:2px}'
  +'.off-stepbtn{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--line);color:var(--s27-purple-ink);cursor:pointer;transition:background .15s}'
  +'.off-stepbtn:hover{background:var(--s27-purple);color:#fff;border-color:var(--s27-purple)}'
  +'.off-qty{min-width:26px;text-align:center;font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--ink)}'
  +'.off-noresult,.off-cempty p{color:var(--ink-3);font-size:13.5px;line-height:1.5}'
  +'.off-noresult{padding:22px;text-align:center;background:var(--paper-2,#FAF7F2);border:1px dashed var(--line);border-radius:14px}'
  +'.off-cart{position:sticky;top:14px;padding:16px 16px 18px;display:flex;flex-direction:column}'
  +'.off-carthead{display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink);padding-bottom:12px;border-bottom:1px solid var(--line)}'
  +'.off-cartn{margin-left:auto;font-size:12px;font-weight:800;color:#fff;background:var(--s27-purple);border-radius:999px;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;padding:0 7px}'
  +'.off-citems{display:flex;flex-direction:column;gap:10px;margin:12px 0;max-height:300px;overflow:auto}'
  +'.off-citem{display:flex;gap:10px;align-items:flex-start}'
  +'.off-citx{flex:1;min-width:0}'
  +'.off-ciname{font-family:var(--font-display);font-weight:700;font-size:13px;line-height:1.3}'
  +'.off-ciqty{font-size:11.5px;color:var(--ink-4);margin-top:1px}'
  +'.off-cilinewrap{display:flex;align-items:center;gap:6px;flex:0 0 auto}'
  +'.off-ciline{font-family:var(--font-display);font-weight:800;font-size:13px;color:var(--ink);white-space:nowrap}'
  +'.off-cirm{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--ink-4);background:transparent;border:none;cursor:pointer;transition:background .15s,color .15s}'
  +'.off-cirm:hover{background:var(--s27-orange-soft,rgba(246,97,49,.12));color:var(--s27-orange-ink,#C44514)}'
  +'.off-cempty{text-align:center;padding:24px 8px;color:var(--ink-4)}'
  +'.off-cempty p{margin:8px 0 0}'
  +'.off-carttotal{display:flex;align-items:baseline;justify-content:space-between;padding-top:12px;border-top:1px solid var(--line);font-family:var(--font-display)}'
  +'.off-carttotal span{font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-4)}'
  +'.off-carttotal b{font-weight:900;font-size:22px;color:var(--ink)}'
  +'.off-cartnote{font-size:11.5px;color:var(--ink-4);margin-top:6px;line-height:1.4}'
  +'.off-cartdisc{display:flex;gap:6px;font-size:11.5px;color:var(--ink-4);margin:10px 0 0;line-height:1.45}'
  +'.off-cartdisc svg{flex:0 0 auto;margin-top:1px}'
  +'.off-result{margin-top:12px;padding:14px;border-radius:12px;background:var(--s27-green-soft,rgba(18,172,78,.10));border:1px solid rgba(18,172,78,.28);font-size:13.5px;line-height:1.5;color:var(--ink-2)}'
  +'.off-result.err{background:var(--s27-orange-soft,rgba(246,97,49,.10));border-color:rgba(246,97,49,.30)}'
  +'.off-result a{color:var(--s27-purple-ink);font-weight:800}'
  // --- offerte-wizard multi-tak (bug 86ca93tzk) ---
  +'.ow-takhead{display:flex;align-items:center;gap:9px;font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink,#3A2A3A);margin:22px 0 10px;padding-bottom:7px;border-bottom:2px solid var(--c-soft,var(--paper-3,#EFE8DD))}'
  +'.ow-takhead:first-child{margin-top:2px}'
  +'.ow-takhead-dot{display:inline-block;width:11px;height:11px;border-radius:50%;flex:0 0 auto}'
  +'.ow-addmore{display:inline-flex;align-items:center;gap:8px;margin-top:14px;font-family:var(--font-display);font-weight:700;font-size:13.5px;color:var(--s27-purple-ink,#6A28A8);background:var(--s27-purple-soft,rgba(148,65,219,.10));border:1px dashed var(--s27-purple,#9441DB);border-radius:999px;padding:10px 16px;cursor:pointer;transition:background .15s}'
  +'.ow-addmore:hover{background:color-mix(in oklab,var(--s27-purple,#9441DB) 18%,transparent)}'
  +'.ow-cartback{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 16px;padding:11px 14px;background:var(--s27-purple-soft,rgba(148,65,219,.10));border:1px solid color-mix(in oklab,var(--s27-purple,#9441DB) 28%,transparent);border-radius:12px;font-size:13px;color:var(--ink-2,#3A2A3A);line-height:1.4}'
  +'.ow-cartback svg:first-child{color:var(--s27-purple-ink,#6A28A8);flex:0 0 auto}'
  +'.ow-cartback span{flex:1;min-width:160px}'
  +'.ow-cartback .btn{flex:0 0 auto;margin-left:auto}'
  +'</style>'); }
// volledige samensteller-sectie (kop + container die we live herrenderen)
function offerteSamensteller(){
  if(!offCatalog().length) return '';   // geen catalogus geladen -> sectie weglaten
  return offBuilderStyleOnce()
    +'<div class="section-head" style="margin-top:40px"><h2>Stel zelf je offerte samen</h2></div>'
    +'<p class="sdesc off-section-intro">Blader door onze diensten, voeg toe wat je nodig hebt en zie meteen je richtprijs. Klaar? Vraag je offerte met één klik aan, wij werken ze persoonlijk voor je uit.</p>'
    +'<div id="offBuilder">'+offBuilderInner()+'</div>';
}
/* ---- live deelrenders van de samensteller (geen volledige panel-rerender) ---- */
function renderOfferteBuilder(){ var box=$id('offBuilder'); if(box) box.innerHTML=offBuilderInner(); }
// alleen de winkelmand-zijkant verversen (na qty-wijziging vanuit de productlijst)
function refreshOfferteCart(){
  var cart=$id('offCart'); if(cart && cart.parentNode){ var tmp=document.createElement('div'); tmp.innerHTML=offCartPanel(); var fresh=tmp.firstChild; cart.parentNode.replaceChild(fresh,cart); }
}
// 1 productregel verversen (stepper/cart-knop) zonder de hele lijst te herbouwen
function refreshOfferteRow(sku){
  var p=offBySku(sku); if(!p) return;
  document.querySelectorAll('.off-prow[data-sku="'+(window.CSS&&CSS.escape?CSS.escape(sku):sku)+'"]').forEach(function(row){
    var showGroup = row.closest('.off-poprow') || $id('offSearch') && String((($id('offSearch')||{}).value)||'').trim().length>0;
    var tmp=document.createElement('div'); tmp.innerHTML=offProductRow(p, !!showGroup); var fresh=tmp.firstChild;
    if(row.parentNode) row.parentNode.replaceChild(fresh,row);
  });
}
function offSetGroup(g){ state._offerteGroup=g; state._offerteSearch=''; renderOfferteBuilder(); }
function offSearch(v){
  state._offerteSearch=v;
  // debounce-licht: direct herrenderen van enkel de lijst+populair (de zijkant blijft)
  if(state._offSearchT) clearTimeout(state._offSearchT);
  state._offSearchT=setTimeout(function(){ renderOfferteBuilder(); var s=$id('offSearch'); if(s){ try{ s.focus(); var L=s.value.length; s.setSelectionRange(L,L); }catch(e){} } }, 120);
}
function offAdd(sku){ var c=offCart(); c[sku]=(c[sku]||0)+1; refreshOfferteRow(sku); refreshOfferteCart(); }
function offQty(sku,delta){ var c=offCart(); var n=(c[sku]||0)+delta; if(n<=0){ delete c[sku]; } else { c[sku]=n; } refreshOfferteRow(sku); refreshOfferteCart(); }
function offRemove(sku){ var c=offCart(); delete c[sku]; refreshOfferteRow(sku); refreshOfferteCart(); }
/* Offertes-pagina: sub-nav "Mijn offertes" (overzicht lopende/eerdere) + "Nieuwe aanvraag"
   (offerte-samensteller). Overzicht is de default; de bouwer zit nu achter de tweede tab i.p.v.
   altijd onderaan de lijst. De topbar-knop "Offerteaanvragen" springt rechtstreeks naar 'nieuw'. */
function offerteTab(){ return state._offTab||'overzicht'; }
function offerteSubnav(){
  var t=offerteTab();
  var icDoc='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>';
  var icPlus='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
  var tabs=[['overzicht','Mijn offertes',icDoc],['nieuw','Nieuwe aanvraag',icPlus]];
  return '<div class="soc-subnav" id="offSubnav">'+tabs.map(function(x){ return '<button class="soc-subtab'+(t===x[0]?' active':'')+'" data-otab="'+x[0]+'" onclick="offerteSetTab(\''+x[0]+'\')">'+x[2]+'<span>'+esc(x[1])+'</span></button>'; }).join('')+'</div>';
}
function offerteSetTab(name){
  state._offTab=name;
  var box=document.getElementById('offBody');
  if(box){ box.innerHTML=offerteBodyHTML();
    var nav=document.getElementById('offSubnav'); if(nav){ [].slice.call(nav.children).forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-otab')===name); }); }
    if(window.scrollTo) window.scrollTo({top:0,behavior:'smooth'});
  } else { renderPanel('offertes'); }
}
function goOfferteNieuw(){ openOfferteWizard(); }   // topbar "Nieuw project" -> de wizard (stap 1: tak kiezen)
function goOffertes(){ state._offTab='overzicht'; if(typeof goTab==='function') goTab('offertes'); }   // zijbalk: altijd met het overzicht openen

/* =============================================================================
   OFFERTE-WIZARD (Cluster H): schermvullende 4-staps overlay (mp-overlay-patroon).
   Stap 1 tak -> stap 2 producten (catalogus) -> stap 3 context -> stap 4 bevestigen.
   Hergebruikt offCart/offBySku/offEur + de off-prow-stijlen; output = ENDPOINTS.offerteGenereren
   (eigen ondertekensysteem: de gateway herrekent prijzen server-side tegen de
   D1-prijslijst en geeft bij 'verzenden' een hub.studio27.be/offerte/<token>-link terug).
   ============================================================================= */
// Volgorde + aanbod 1:1 met het gecureerde catalog-data.js (Strategie → Branding → Video & fotografie
// → SEO & GEO → Social media → Adverteren). Elke tak = exact één catalogus-groep.
const OW_TAKKEN=[
  {key:'strategie',label:'Strategie',br:'blue',stamp:'icon-strategie.svg',groups:['Strategie'],sub:'Strategiesessie'},
  {key:'branding',label:'Branding',br:'pink',stamp:'icon-branding-heart.svg',groups:['Branding'],sub:'Logo & stylesheet'},
  {key:'video',label:'Video & fotografie',br:'purple',stamp:'icon-video-fotografie.svg',groups:['Video & fotografie'],sub:'Shoots, montage & foto'},
  {key:'website',label:'SEO & GEO',br:'green',stamp:'icon-webdesign.svg',groups:['SEO & GEO'],sub:'Vindbaarheid (Google + AI)'},
  {key:'social',label:'Social media',br:'yellow',stamp:'icon-socialmedia.svg',groups:['Social media'],sub:'Beheer & content'},
  {key:'ads',label:'Online adverteren',br:'orange',stamp:'icon-adverteren.svg',groups:['Adverteren'],sub:'Meta & Google'},
];
function owTak(){ var k=state.ow&&state.ow.takKey; for(var i=0;i<OW_TAKKEN.length;i++){ if(OW_TAKKEN[i].key===k) return OW_TAKKEN[i]; } return null; }
function owEl(){
  var el=$id('offWizard');
  if(!el){ el=document.createElement('div'); el.id='offWizard'; el.className='mp-overlay';
    el.addEventListener('mousedown',function(e){ el._downScrim=(e.target===el); });
    el.addEventListener('click',function(e){ if(e.target===el && el._downScrim) closeOfferteWizard(); });
    document.body.appendChild(el); }
  return el;
}
function owEsc(e){ if(e.key==='Escape') closeOfferteWizard(); }
function openOfferteWizard(takKey){
  // Klanten (clientview) doen GEEN budget/product-aanvraag meer: zij beschrijven in vrije tekst wat
  // ze nodig hebben + kiezen diensten (Vincent). Het team behoudt de volledige budget-wizard.
  if(typeof isRichView==='function' && !isRichView()) return openOfferteAanvraag(takKey);
  state.ow={ step:(takKey?2:1), takKey:(takKey||''), filter:(takKey||'alles'), search:'', note:(state._offerteOpm||''), contact:'verzenden', submitting:false, _doneHTML:'' };
  // off-stijlen in <head> injecteren: de overlay leeft buiten #page, waar offStyle normaal landt
  var s=offBuilderStyleOnce();
  if(s){ var t=document.createElement('template'); t.innerHTML=s; document.head.appendChild(t.content.firstChild); }
  var el=owEl(); el.classList.add('show'); document.body.classList.add('mp-lock');
  document.addEventListener('keydown',owEsc);
  owRender();
}
function closeOfferteWizard(){
  var el=$id('offWizard'); if(el){ el.classList.remove('show'); el.innerHTML=''; }
  document.removeEventListener('keydown',owEsc);
  document.body.classList.remove('mp-lock');
  if(state.ow && state.ow.note!=null) state._offerteOpm=state.ow.note;   // notitie net zo persistent als de mand
  state.ow=null;   // selectie (state._offerteCart) blijft bewust bewaard, heropenen = verder waar je was
}

/* =============================================================================
   OFFERTE-AANVRAAG (KLANT/CLIENTVIEW), vrije tekst + diensten i.p.v. de budget-wizard.
   Korte omschrijving (verplicht) = de taaktitel; bericht (verplicht) = de taakomschrijving;
   diensten (≥1) bepalen welke offerte-blokken meekomen. Submit -> ENDPOINTS.offerteAanvraag.
   ============================================================================= */
var DIENSTEN_AANVRAAG=[
  ['strategie','Strategie'],['branding','Branding'],['video','Video & fotografie'],
  ['website','Website (webdesign)'],['seo','SEO'],['ads','Online adverteren'],['social','Social media']
];
// tak-pagina waarvan je komt -> dienst voorselecteren
var TAK_TO_DIENST={ strategie:'strategie', branding:'branding', video:'video', webprestaties:'website', website:'website', socials:'social', social:'social', advertenties:'ads', ads:'ads', seo:'seo' };
function offAanvraagState(){ if(!state._offAanvraag) state._offAanvraag={ korte:'', bericht:'', diensten:{}, busy:false, doneHTML:'' }; return state._offAanvraag; }
function offAanvraagStyleOnce(){
  if($id('ofa-styles')) return;
  var st=document.createElement('style'); st.id='ofa-styles'; st.textContent=''
    +'#offAanvraag{position:fixed;inset:0;z-index:8000;display:none;align-items:flex-start;justify-content:center;overflow-y:auto;background:rgba(35,15,35,.42);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);padding:max(24px,5vh) 16px}'
    +'#offAanvraag.show{display:flex}'
    +'.ofa-card{position:relative;width:100%;max-width:560px;background:var(--paper,#fff);border-radius:20px;box-shadow:0 24px 70px rgba(35,15,35,.30);padding:30px 28px 24px;margin:auto}'
    +'.ofa-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border:0;border-radius:10px;background:var(--paper-3,#F1EBE2);color:var(--ink-3);display:flex;align-items:center;justify-content:center;cursor:pointer;transform:rotate(45deg)}'
    +'.ofa-x:hover{color:var(--ink)}'
    +'.ofa-h{font-family:var(--font-display);font-weight:800;font-size:21px;color:var(--ink);margin:0 0 6px}'
    +'.ofa-sub{color:var(--ink-3);font-size:13.5px;line-height:1.5;margin:0 0 18px;max-width:46ch}'
    +'.ofa-lab{display:block;font-family:var(--font-display);font-weight:700;font-size:13px;color:var(--ink-2);margin:14px 0 6px}'
    +'.ofa-lab em{font-style:normal;font-weight:600;color:var(--ink-4);font-size:12px}'
    +'.ofa-in,.ofa-ta{width:100%;border:1.5px solid var(--line,#E7DFD3);border-radius:12px;padding:11px 13px;font:600 14px Nunito,sans-serif;color:var(--ink);background:var(--paper-2,#FAF7F2);box-sizing:border-box}'
    +'.ofa-in:focus,.ofa-ta:focus{outline:none;border-color:var(--s27-blue,#3083DC);background:#fff}'
    +'.ofa-ta{resize:vertical;min-height:96px;line-height:1.5}'
    +'.ofa-chips{display:flex;flex-wrap:wrap;gap:8px}'
    +'.ofa-chip{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--line,#E7DFD3);background:var(--paper-2,#FAF7F2);color:var(--ink-2);font:700 13px Montserrat,sans-serif;padding:8px 13px;border-radius:999px;cursor:pointer;transition:all .15s}'
    +'.ofa-chip:hover{border-color:var(--s27-blue,#3083DC)}'
    +'.ofa-chip.on{background:var(--s27-blue,#3083DC);border-color:var(--s27-blue,#3083DC);color:#fff}'
    +'.ofa-err{color:#C0392B;font-size:13px;font-weight:600;margin:12px 0 0}'
    +'.ofa-foot{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}'
    +'.ofa-done{text-align:center}.ofa-done-ic{width:64px;height:64px;border-radius:50%;background:var(--s27-green-soft,rgba(18,172,78,.12));color:#12AC4E;display:flex;align-items:center;justify-content:center;margin:6px auto 14px}';
  document.head.appendChild(st);
}
function openOfferteAanvraag(takKey){
  var s=offAanvraagState();
  var d=TAK_TO_DIENST[takKey||'']; if(d) s.diensten[d]=true;
  offAanvraagStyleOnce();
  var el=$id('offAanvraag');
  if(!el){ el=document.createElement('div'); el.id='offAanvraag'; document.body.appendChild(el); el.addEventListener('click',function(e){ if(e.target===el) closeOffAanvraag(); }); }
  el.classList.add('show'); document.body.classList.add('mp-lock');
  document.addEventListener('keydown',offAanvraagEsc);
  offAanvraagRender();
}
function offAanvraagEsc(e){ if(e.key==='Escape') closeOffAanvraag(); }
function closeOffAanvraag(){ var el=$id('offAanvraag'); if(el){ el.classList.remove('show'); el.innerHTML=''; } document.removeEventListener('keydown',offAanvraagEsc); document.body.classList.remove('mp-lock'); }
function offAanvraagSyncInputs(){ var s=offAanvraagState(); var k=$id('ofaKorte'), b=$id('ofaBericht'); if(k) s.korte=k.value; if(b) s.bericht=b.value; }
function offAanvraagToggleDienst(k){ offAanvraagSyncInputs(); var s=offAanvraagState(); s.diensten[k]=!s.diensten[k]; offAanvraagRender(); }
function offAanvraagRender(){
  var el=$id('offAanvraag'); if(!el) return; var s=offAanvraagState();
  if(s.doneHTML){ el.innerHTML=s.doneHTML; return; }
  var chips=DIENSTEN_AANVRAAG.map(function(d){ var on=!!s.diensten[d[0]]; return '<button type="button" class="ofa-chip'+(on?' on':'')+'" onclick="offAanvraagToggleDienst(\''+d[0]+'\')">'+ic(on?'check':'plus',14)+'<span>'+esc(d[1])+'</span></button>'; }).join('');
  el.innerHTML='<div class="ofa-card" role="dialog" aria-modal="true">'
    +'<button class="ofa-x" onclick="closeOffAanvraag()" aria-label="Sluiten">'+ic('plus',22)+'</button>'
    +'<h2 class="ofa-h">Wat heb je nodig?</h2>'
    +'<p class="ofa-sub">Beschrijf kort je vraag, dan stellen wij persoonlijk een offerte op maat voor je op. Kies één of meerdere diensten.</p>'
    +'<label class="ofa-lab">Korte omschrijving <em>(verplicht)</em></label>'
    +'<input id="ofaKorte" class="ofa-in" type="text" maxlength="120" placeholder="Bv. nieuwe website + SEO" value="'+esc(s.korte)+'">'
    +'<label class="ofa-lab">Welke diensten? <em>(minstens één)</em></label>'
    +'<div class="ofa-chips">'+chips+'</div>'
    +'<label class="ofa-lab">Vertel ons meer <em>(verplicht)</em></label>'
    +'<textarea id="ofaBericht" class="ofa-ta" rows="5" placeholder="Waar ben je naar op zoek? Wat wil je bereiken, tegen wanneer, en heb je al voorbeelden of voorkeuren?">'+esc(s.bericht)+'</textarea>'
    +'<p id="ofaErr" class="ofa-err" style="display:none"></p>'
    +'<div class="ofa-foot"><button class="btn btn-ghost" onclick="closeOffAanvraag()">Annuleren</button>'
    +'<button class="btn btn-primary" id="ofaSend" onclick="offAanvraagSubmit()"'+(s.busy?' disabled':'')+'>'+(s.busy?'Versturen…':(ic('send',16)+' Aanvraag versturen'))+'</button></div></div>';
}
function offAanvraagSubmit(){
  offAanvraagSyncInputs(); var s=offAanvraagState();
  s.korte=String(s.korte||'').trim(); s.bericht=String(s.bericht||'').trim();
  var diensten=Object.keys(s.diensten).filter(function(k){return s.diensten[k];});
  var err=$id('ofaErr'); function showErr(m){ if(err){ err.textContent=m; err.style.display='block'; } }
  if(!s.korte) return showErr('Geef een korte omschrijving van je aanvraag.');
  if(!diensten.length) return showErr('Kies minstens één dienst.');
  if(!s.bericht) return showErr('Vertel ons kort wat je nodig hebt.');
  if(state.demoMode){
    s.doneHTML='<div class="ofa-card ofa-done" role="dialog"><div class="ofa-done-ic">'+ic('check',40)+'</div><h2 class="ofa-h">Aanvraag verzonden</h2><p class="ofa-sub" style="margin:0 auto 18px">In je echte portaal sturen we je aanvraag meteen door naar Studio&nbsp;27. Dit is de voorbeeldweergave.</p><button class="btn btn-primary" onclick="closeOffAanvraag();state._offAanvraag=null">Sluiten</button></div>';
    offAanvraagRender(); return;
  }
  s.busy=true; offAanvraagRender();
  api(ENDPOINTS.offerteAanvraag, { korte:s.korte, bericht:s.bericht, diensten:diensten }).then(function(res){
    s.busy=false;
    if(res && res.ok){
      s.doneHTML='<div class="ofa-card ofa-done" role="dialog"><div class="ofa-done-ic">'+ic('check',40)+'</div><h2 class="ofa-h">Aanvraag verzonden</h2><p class="ofa-sub" style="margin:0 auto 18px">'+esc(res.message||'We stellen je offerte op en bezorgen ze je binnenkort.')+'</p><button class="btn btn-primary" onclick="closeOffAanvraag();state._offAanvraag=null">Sluiten</button></div>';
      offAanvraagRender();
    } else { offAanvraagRender(); showErr((res&&res.message)||'Er ging iets mis. Probeer het later opnieuw.'); }
  }).catch(function(){ s.busy=false; offAanvraagRender(); showErr('Er ging iets mis. Probeer het later opnieuw.'); });
}
function owHeader(){
  var s=state.ow||{}; var tak=owTak(); var br=(tak&&tak.br)||'blue';
  var titles={1:'Waar gaat je project over?',2:'Wat heb je nodig?',3:'Vertel ons iets meer',4:'Klopt alles?',done:'Aanvraag verstuurd'};
  var back=(s.step!=='done'&&Number(s.step)>1)?'<button class="mp-back" onclick="owBack()" aria-label="Terug">'+ic('arrow',18)+'</button>':'<span class="mp-back-sp"></span>';
  var dots=(s.step==='done')?'':'<div class="ow-steps">'+[1,2,3,4].map(function(n){ return '<span class="ow-dot'+(n<=Number(s.step)?' on':'')+'" style="--owc:var(--s27-'+br+')"></span>'; }).join('')+'</div>';
  return '<div class="mp-head">'+back+'<div class="mp-head-c"><span class="mp-head-eyebrow">Nieuw project</span><b>'+esc(titles[s.step]||'')+'</b>'+dots+'</div><button class="mp-close" onclick="closeOfferteWizard()" aria-label="Sluiten">'+ic('plus',22)+'</button></div>';
}
function owBack(){ var s=state.ow; if(!s) return; if(s.step==='done') return; s.step=Math.max(1,Number(s.step)-1); owRender(); }
function owNext(){ var s=state.ow; if(!s) return; s.step=Number(s.step)+1; owRender(); }
function owPickTak(k){ if(!state.ow) return; state.ow.takKey=k; state.ow.filter=k; state.ow.step=2; owRender(); }
// "Nog een dienst toevoegen": terug naar het tak-overzicht zonder de mand te wissen
function owAddMore(){ if(!state.ow) return; state.ow.step=1; owRender(); }
// vanuit het tak-overzicht meteen door naar stap 2 over ALLE takken (mand blijft)
function owPickFilterAlles(){ if(!state.ow) return; state.ow.filter='alles'; state.ow.step=2; owRender(); }
// tak-filter in stap 2 wisselen (cart blijft, alleen de zichtbare productlijst verandert)
function owSetFilter(k){
  if(!state.ow) return; state.ow.filter=k; if(k!=='alles') state.ow.takKey=k;
  var l=$id('owList'); if(l) l.innerHTML=owListHTML();
  document.querySelectorAll('#offWizard .off-tabs .off-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-of')===k); });
}
function owStep1(){
  // mand kan al gevuld zijn (terug via "Nog een dienst toevoegen") -> toon het lopend aantal + snelle weg terug
  var n=offCartCount();
  var cartHint = n ? ('<div class="ow-cartback">'+ic('cart',16)+'<span><b>'+n+' product'+(n===1?'':'en')+'</b> in je selectie ('+offEur(offCartTotal())+'), kies nog een tak of bekijk je samenstelling.</span><button type="button" class="btn btn-outline btn-sm" onclick="owPickFilterAlles()">Verder met je selectie '+ic('arrow',15)+'</button></div>') : '';
  return '<p class="mp-intro">Kies de tak waarin je iets wil opstarten. Je kan gerust meerdere takken combineren, alles komt in dezelfde aanvraag.</p>'
    +cartHint
    +'<div class="ow-takgrid">'+OW_TAKKEN.map(function(t){
      return '<button class="ow-tak br-'+t.br+'" onclick="owPickTak(\''+t.key+'\')"><span class="mp-host-av ow-stamp"><img src="assets/'+t.stamp+'" width="24" height="24" alt=""></span><span class="mp-host-tx"><b>'+esc(t.label)+'</b><span class="mp-host-tag">'+esc(t.sub)+'</span></span>'+ic('arrow',16)+'</button>';
    }).join('')+'</div>';
}
function owProductRow(p, showGroup){
  var c=offCart(), qty=c[p.sku]||0;
  var sku=String(p.sku||'').replace(/[^A-Za-z0-9_-]/g,'');   // whitelist vóór inline-onclick (quote-breakout-proof)
  var sub=(showGroup? (p.group+(p.sub?(' · '+p.sub):'')) : (p.sub||''));
  var priceTxt=(Number(p.price)>0)?offEur(p.price):'op maat';
  // verplicht item: geen knop/stepper maar een vaste 'Verplicht'/'Inbegrepen'-badge (kan niet manueel weg)
  var stepper;
  if(p.mand){
    var tk=owTakForGroup(p.group); var tlabel=(tk&&tk.label)||'deze tak';
    stepper='<div class="off-mand'+(qty>0?' on':'')+'" title="Verplicht, automatisch inbegrepen zodra je iets uit '+esc(tlabel)+' kiest">'+ic(qty>0?'check':'lock',13)+'<span>'+(qty>0?'Inbegrepen':'Verplicht')+'</span></div>';
  } else {
    stepper=qty>0
      ? '<div class="off-step"><button class="off-stepbtn" aria-label="Minder" onclick="owQty(\''+sku+'\',-1)">'+ic('minus',15)+'</button><span class="off-qty">'+qty+'</span><button class="off-stepbtn" aria-label="Meer" onclick="owQty(\''+sku+'\',1)">'+ic('plus',15)+'</button></div>'
      : '<button class="btn btn-branch br-purple btn-sm off-addbtn" onclick="owAdd(\''+sku+'\')">'+ic('plus',14)+' Toevoegen</button>';
  }
  return '<div class="off-prow'+(qty>0?' in-cart':'')+(p.mand?' off-prow--mand':'')+'" data-sku="'+esc(p.sku)+'">'
    +'<div class="off-pinfo"><div class="off-pname">'+esc(p.name)+(p.mand?' <span class="off-mandtag">verplicht</span>':'')+'</div>'
    +(sub?'<div class="off-psub">'+esc(sub)+'</div>':'')
    +(offDescShort(p.desc_html)?'<div class="off-pdesc">'+esc(offDescShort(p.desc_html))+'</div>':'')
    +'</div><div class="off-pright"><div class="off-pprice">'+priceTxt+'</div>'+stepper+'</div></div>';
}
// één tak-blok: groep-tussenkoppen + subgroep-koppen + productrijen
function owTakBlock(tak, withTakHead){
  var cat=offCatalog(); var groups=(tak&&tak.groups)||[];
  var body=groups.map(function(g){
    var items=cat.filter(function(p){return p.group===g;});
    if(!items.length) return '';
    var bySub={}; items.forEach(function(p){ var k=p.sub||'Algemeen'; (bySub[k]=bySub[k]||[]).push(p); });
    var inner=Object.keys(bySub).map(function(k){
      return (Object.keys(bySub).length>1?'<div class="off-subhead">'+esc(k)+'</div>':'')+bySub[k].map(function(p){return owProductRow(p,false);}).join('');
    }).join('');
    return (groups.length>1?'<div class="ow-grouphead">'+esc(g)+'</div>':'')+inner;
  }).join('');
  if(!body) return '';
  var head = withTakHead ? ('<div class="ow-takhead br-'+tak.br+'"><span class="ow-takhead-dot" style="background:var(--s27-'+tak.br+')"></span>'+esc(tak.label)+'</div>') : '';
  return head+body;
}
function owListHTML(){
  var s=state.ow||{}; var cat=offCatalog();
  owReconcileMandatory();   // verplichte items in sync met de gekozen takken
  var q=String(s.search||'').trim().toLowerCase();
  if(q){
    var hits=cat.filter(function(p){ return (p.name||'').toLowerCase().indexOf(q)>=0 || (p.sub||'').toLowerCase().indexOf(q)>=0 || (p.group||'').toLowerCase().indexOf(q)>=0; });
    return hits.length ? hits.map(function(p){return owProductRow(p,true);}).join('') : '<div class="off-noresult">Geen producten gevonden voor "'+esc(s.search)+'". Probeer een andere zoekterm.</div>';
  }
  var filter=s.filter||s.takKey||'alles';
  if(filter==='alles'){
    // alle takken na elkaar, elk onder een eigen tak-kop -> de klant bladert vrij en bouwt met DEZELFDE mand
    return OW_TAKKEN.map(function(t){ return owTakBlock(t, true); }).join('');
  }
  var tak=owTak();
  return owTakBlock(tak, false);
}
// tak-/groep-filterbalk bovenaan stap 2 (zoals de off-tabs in offBuilderInner): "Alles" + één pill per tak.
// Wisselen verandert enkel de zichtbare lijst, de mand (state._offerteCart) blijft over alle takken heen gedeeld.
function owFilterBar(){
  var s=state.ow||{}; var active=s.filter||s.takKey||'alles'; var cat=offCatalog();
  var allTab='<button class="off-tab'+(active==='alles'?' active':'')+'" role="tab" data-of="alles" onclick="owSetFilter(\'alles\')"><span class="off-tabic">'+ic('cart',15)+'</span>Alles<span class="off-tabn">'+offCartCount()+'</span></button>';
  var takTabs=OW_TAKKEN.map(function(t){
    var n=cat.filter(function(p){return (t.groups||[]).indexOf(p.group)>=0;}).length;
    return '<button class="off-tab br-'+t.br+(active===t.key?' active':'')+'" role="tab" data-of="'+t.key+'" onclick="owSetFilter(\''+t.key+'\')"><span class="off-tabic">'+ic(OFF_GROUP_BRAND[(t.groups||[])[0]]?OFF_GROUP_BRAND[(t.groups||[])[0]].icon:'doc',15)+'</span>'+esc(t.label)+'<span class="off-tabn">'+n+'</span></button>';
  }).join('');
  return '<div class="off-tabs" id="owFilters" role="tablist">'+allTab+takTabs+'</div>';
}
function owStep2(){
  var s=state.ow||{};
  return '<div class="off-search"><span class="off-searchic">'+ic('search',16)+'</span><input id="owSearch" type="search" placeholder="Zoek een product of dienst…" value="'+esc(s.search||'')+'" oninput="owSearchInput(this.value)"></div>'
    +owFilterBar()
    +'<div id="owList" class="off-list">'+owListHTML()+'</div>'
    +'<button type="button" class="ow-addmore" onclick="owAddMore()">'+ic('plus',16)+' Nog een dienst toevoegen</button>';
}
function owSearchInput(v){
  if(!state.ow) return; state.ow.search=v;
  clearTimeout(state._owSearchT);
  state._owSearchT=setTimeout(function(){ var l=$id('owList'); if(l) l.innerHTML=owListHTML(); },120);
}
function owRefreshFoot(){ var f=$id('owFoot'); if(f) f.innerHTML=owFootInner(); }
// "Alles"-filtertab toont het lopende mand-aantal -> mee verversen bij elke wijziging
function owRefreshAllesBadge(){ var t=document.querySelector('#owFilters .off-tab[data-of="alles"] .off-tabn'); if(t) t.textContent=offCartCount(); }
// verplichte items (mand) staan present zodra de mand ≥1 NIET-verplicht item van dezelfde tak/groep
// bevat, en verdwijnen weer zodra het laatste echte item van die tak weg is. Idempotent.
function owReconcileMandatory(){
  var cat=offCatalog(), c=offCart(); var real={};
  Object.keys(c).forEach(function(s){ if(c[s]>0){ var p=offBySku(s); if(p && !p.mand) real[p.group]=true; } });
  cat.forEach(function(p){ if(!p.mand) return; if(real[p.group]){ if(!(c[p.sku]>0)) c[p.sku]=1; } else if(c[p.sku]){ delete c[p.sku]; } });
}
function owAfterCart(){ owReconcileMandatory(); var l=$id('owList'); if(l) l.innerHTML=owListHTML(); owRefreshFoot(); owRefreshAllesBadge(); }
function owAdd(sku){ var p=offBySku(sku); if(!p||p.mand) return; var c=offCart(); c[sku]=(c[sku]||0)+1; owAfterCart(); }
function owQty(sku,d){ var p=offBySku(sku); if(!p||p.mand) return; var c=offCart(); var n=(c[sku]||0)+d; if(n<=0) delete c[sku]; else c[sku]=n; owAfterCart(); }
const OW_CONTACT={
  verzenden:'Stuur me de offerte direct',
  akkoord:'Zet in planning, ik ga akkoord',
  meeting:'Plan eerst een meeting',
  bellen:'Bel me even op'
};
const OW_CONTACT_SUB={
  verzenden:'Je krijgt je offerte meteen te zien en kan ze direct ondertekenen.',
  akkoord:'Wij bevestigen je samenstelling en zetten het project in de planning.',
  meeting:'Je plant meteen een moment met Arne, onze projectadviseur.',
  bellen:'Arne belt je zo snel mogelijk op om alles door te nemen.'
};
function owSetContact(k){ if(!state.ow) return; state.ow.contact=k; document.querySelectorAll('#offWizard .ow-contact .mp-tg').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-k')===k); }); }
function owStep3(){
  var s=state.ow||{};
  return '<p class="mp-intro">Vertel kort wat je voor ogen hebt, zo kunnen we je offerte meteen juist uitwerken.</p>'
    +'<label class="mp-lbl">Context (optioneel)</label>'
    +'<textarea id="owNote" class="mp-note" rows="4" placeholder="Context, timing, doel…" oninput="state.ow.note=this.value">'+esc(s.note||'')+'</textarea>'
    +'<label class="mp-lbl" style="margin-top:14px">Hoe gaan we verder?</label>'
    +'<div class="ow-contact ow-contact--stack">'+Object.keys(OW_CONTACT).map(function(k){
      return '<button type="button" class="mp-tg ow-cact'+(s.contact===k?' on':'')+'" data-k="'+k+'" onclick="owSetContact(\''+k+'\')"><b>'+esc(OW_CONTACT[k])+'</b><span>'+esc(OW_CONTACT_SUB[k]||'')+'</span></button>';
    }).join('')+'</div>';
}
// welke tak hoort bij een catalogus-groep (eerste match in OW_TAKKEN.groups); null => Overig
function owTakForGroup(group){
  for(var i=0;i<OW_TAKKEN.length;i++){ if((OW_TAKKEN[i].groups||[]).indexOf(group)>=0) return OW_TAKKEN[i]; }
  return null;
}
function owStep4(){
  var s=state.ow||{}; owReconcileMandatory(); var c=offCart();
  var skus=Object.keys(c).filter(function(k){return c[k]>0;});
  // de mand groeperen PER tak: één tussenkop per tak, daaronder de gekozen producten
  var byTak={}, order=[];
  skus.forEach(function(sku){
    var p=offBySku(sku); if(!p) return;
    var tak=owTakForGroup(p.group);
    var key=tak?tak.key:'_overig';
    if(!byTak[key]){ byTak[key]={tak:tak, items:[]}; order.push(key); }
    byTak[key].items.push({sku:sku, p:p, qty:c[sku]||0});
  });
  var groupedRows=order.map(function(key){
    var blk=byTak[key]; var tak=blk.tak;
    var head='<div class="ow-sumrow ow-sumtak"><span>'+(tak?('<i class="ow-takdot" style="background:var(--s27-'+tak.br+')"></i>'+esc(tak.label)):'<i class="ow-takdot" style="background:var(--ink-4,#9E919E)"></i>Overig')+'</span></div>';
    var rows=blk.items.map(function(it){
      var line=(Number(it.p.price)||0)*it.qty;
      return '<div class="ow-sumrow"><span>'+it.qty+'× '+esc(it.p.name)+'</span><b>'+((Number(it.p.price)>0)?offEur(line):'op maat')+'</b></div>';
    }).join('');
    return head+rows;
  }).join('');
  var hasOpMaat=skus.some(function(sku){ var p=offBySku(sku); return p && !(Number(p.price)>0); });
  var multiTak=order.length>1;
  return '<div class="ow-sum card">'
    +groupedRows
    +'<div class="ow-sumrow ow-sumtotal"><span>Totaal (richtprijs)</span><b>'+offEur(offCartTotal())+'</b></div>'
    +(hasOpMaat?'<div class="off-cartnote">Items "op maat" prijzen we persoonlijk in je offerte.</div>':'')
    +(multiTak?'<div class="off-cartnote">'+ic('info',13)+' Je combineert '+order.length+' diensten in één aanvraag, wij bundelen ze in je offerte.</div>':'')
    +(String(s.note||'').trim()?'<div class="ow-sumnote"><b>Jouw context:</b> '+esc(s.note)+'</div>':'')
    +'<div class="ow-sumnote"><b>Vervolg:</b> '+esc(OW_CONTACT[s.contact]||OW_CONTACT.verzenden)+'</div>'
  +'</div>'
  +'<button type="button" class="ow-addmore" onclick="owAddMore()">'+ic('plus',16)+' Nog een dienst toevoegen</button>'
  +'<p class="off-cartdisc" style="margin-top:12px">'+ic('info',14)+' Je krijgt een richtprijs, wij kijken alles persoonlijk na voor je definitieve offerte.</p>';
}
function owFootInner(){
  var s=state.ow||{}; var tak=owTak(); var br=(tak&&tak.br)||'blue';
  if(s.step===1||s.step==='done') return '';
  if(s.step===2){
    var n=offCartCount();
    return '<button class="btn btn-branch br-'+br+' mp-confirm"'+(n?'':' disabled')+' onclick="owNext()">Verder · '+n+' product'+(n===1?'':'en')+' · '+offEur(offCartTotal())+'</button>';
  }
  if(s.step===3) return '<button class="btn btn-branch br-'+br+' mp-confirm" onclick="owNext()">Naar bevestiging</button>';
  if(s.step===4){
    var lbl={verzenden:'Verstuur en toon mijn offerte', akkoord:'Bevestig en zet in planning', meeting:'Verstuur en plan een meeting', bellen:'Verstuur, bel me op'}[s.contact]||'Verstuur aanvraag';
    return '<button class="btn btn-branch br-'+br+' mp-confirm" id="owSubmitBtn" onclick="owSubmit(this)">'+ic('send',16)+' '+lbl+'</button>';
  }
  return '';
}
function owRender(){
  var el=$id('offWizard'); if(!el||!state.ow) return;
  var s=state.ow; var body='';
  if(s.step==='done') body=s._doneHTML;
  else if(s.step===1) body=owStep1();
  else if(s.step===2) body=owStep2();
  else if(s.step===3) body=owStep3();
  else body=owStep4();
  el.innerHTML='<div class="mp-modal ow-modal" onclick="event.stopPropagation()">'+owHeader()
    +'<div class="mp-scroll" id="owScroll">'+body+'</div>'
    +'<div class="mp-foot" id="owFoot">'+owFootInner()+'</div></div>';
  if(s.step===2){ var inp=$id('owSearch'); if(inp && s.search) inp.focus(); }
}
function owDone(msg, extra){
  var s=state.ow; if(!s) return;
  var tak=owTak(); var br=(tak&&tak.br)||'blue';
  var link=(extra&&extra.offerte_link)||'';
  s.step='done';
  var titels={verzenden:link?'Je offerte staat klaar!':'Aanvraag verstuurd!', akkoord:'In de planning gezet!', meeting:'Aanvraag verstuurd!', bellen:'We bellen je op!'};
  var acts='';
  if(s.contact==='verzenden' && link){
    acts='<a class="btn btn-branch br-'+br+'" href="'+esc(link)+'" target="_blank" rel="noopener" onclick="setTimeout(function(){closeOfferteWizard();goOffertes();},150)">'+ic('doc',16)+' Bekijk &amp; onderteken je offerte</a>'
      +'<button class="btn btn-outline" onclick="closeOfferteWizard();goOffertes()">Naar mijn offertes</button>';
  } else if(s.contact==='meeting'){
    acts='<button class="btn btn-branch br-'+br+'" onclick="closeOfferteWizard();openMeetingPlanner(\'nieuw\')">'+ic('cal',16)+' Plan je meeting met Arne</button>'
      +'<button class="btn btn-outline" onclick="closeOfferteWizard();goOffertes()">Bekijk mijn offertes</button>';
  } else {
    acts='<button class="btn btn-branch br-'+br+'" onclick="closeOfferteWizard();goOffertes()">Bekijk mijn offertes</button>';
  }
  s._doneHTML='<div class="mp-done"><div class="mp-done-ic br-'+br+'">'+ic('st_approved',60)+'</div>'
    +'<b class="mp-done-title">'+esc(titels[s.contact]||'Aanvraag verstuurd!')+'</b>'
    +'<p class="mp-done-sub">'+esc(msg||'We hebben je aanvraag goed ontvangen.')+'</p>'
    +acts
    +'<button class="btn btn-ghost" onclick="closeOfferteWizard()">Sluiten</button></div>';
  owRender();
}
async function owSubmit(btn){
  var s=state.ow; if(!s||s.submitting) return;
  var c=offCart(); var skus=Object.keys(c).filter(function(k){return c[k]>0;});
  if(!skus.length){ owBack(); return; }
  var items=skus.map(function(sku){ var p=offBySku(sku)||{}; return { sku:sku, naam:String(p.name||sku), groep:String(p.group||''), prijs:Number(p.price)||0, aantal:c[sku]||1 }; });
  // alle betrokken takken verzamelen (mand kan nu meerdere takken combineren)
  var takSet=[]; skus.forEach(function(sku){ var p=offBySku(sku); if(!p) return; var t=owTakForGroup(p.group); var lbl=t?t.label:'Overig'; if(takSet.indexOf(lbl)<0) takSet.push(lbl); });
  var takLine=takSet.length?takSet.join(', '):'-';
  var note=String(s.note||'').trim();
  var actie=OW_CONTACT[s.contact]?s.contact:'verzenden';
  var opmerking=(note?note+'\n\n':'')+'- Aangevraagd via de offerte-wizard -\nTak'+(takSet.length>1?'ken':'')+': '+takLine+'\nGekozen vervolg: '+(OW_CONTACT[actie]||'');
  if(state.demoMode || !state.session){ state._offerteCart={}; state._offerteOpm=''; owDone('Dit is de voorbeeldweergave, in je echte portaal versturen we deze aanvraag meteen.'); return; }
  s.submitting=true;
  if(btn){ btn.disabled=true; btn.innerHTML=(actie==='verzenden')?'Je offerte wordt klaargezet…':'Versturen…'; }
  try{
    var r=await api(ENDPOINTS.offerteGenereren, { items:items, opmerking:opmerking, actie:actie });
    var d=(r&&r.data)?r.data:null;
    if(r&&r.ok&&d&&d.ok!==false&&(d.offerte_task_url||d.offerte_task_id||d.pandadoc_id)){
      state._offerteCart={}; state._offerteOpm=''; state.data.offertes=null;
      s.submitting=false;
      // terugbelverzoek: gerichte ping bij Arne (interne melding + WhatsApp indien geconfigureerd), fire-and-forget
      if(actie==='bellen'){
        try{ api(ENDPOINTS.directMessage, { ontvanger:'arne', type:'terugbel', onderwerp:'Offerte-aanvraag via het portaal', bericht:'De klant vraagt om even op te bellen over de zonet samengestelde offerte ('+items.length+' producten).' }); }catch(_e){}
      }
      owDone(d.message, d);
      return;
    }
    throw new Error('offerte_failed');
  }catch(e){
    s.submitting=false;
    if(btn){ btn.disabled=false; btn.innerHTML=ic('send',16)+' Opnieuw proberen'; }
    var sc=$id('owScroll'); if(sc && !sc.querySelector('.mp-notebox-err')){ var w=document.createElement('div'); w.className='mp-notebox mp-notebox-err'; w.textContent='Versturen lukte niet. Probeer het zo opnieuw, of stuur ons een bericht via de chat.'; sc.insertBefore(w, sc.firstChild); }
  }
}
function offerteOverzichtHTML(){
  var live=_live(); var raw = live ? S27DATA.offertes() : OFFERTE_MOCK;
  if(raw===null||raw===undefined) return '<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Je offertes worden geladen…</p></div>';
  var offs = live ? raw.filter(function(o){return offerteVisible(o.status);}) : raw;  // verberg concept/draft
  if(!offs.length) return '<div class="empty" style="padding:44px 20px;text-align:center"><div class="em-ic">'+ic('doc',52)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Nog geen offertes</b><p style="margin:6px 0 16px;color:var(--ink-3)">Hier verschijnen je offertes zodra we er één klaarzetten.</p><button class="btn btn-primary btn-sm" onclick="openOfferteWizard()">Nieuwe offerte aanvragen</button></div>';
  var lopend=offs.filter(function(o){return !offerteAfgerond(o.status);}), afge=offs.filter(function(o){return offerteAfgerond(o.status);});
  return '<p class="sdesc" style="margin:-2px 0 16px;max-width:60ch">Klik een offerte open om ze te bekijken of te ondertekenen. Een vraag? Stel ze per offerte, ze komt rechtstreeks bij je Studio 27-contact terecht.</p>'
    +(lopend.length?'<div class="section-head" style="margin-top:4px"><h2>Lopend</h2><span class="count">'+lopend.length+'</span></div><div style="display:flex;flex-direction:column;gap:10px">'+lopend.map(offerteRow).join('')+'</div>':'')
    +(afge.length?'<div class="section-head" style="margin-top:30px"><h2>Goedgekeurd &amp; eerdere</h2><span class="count">'+afge.length+'</span></div><div style="display:flex;flex-direction:column;gap:10px">'+afge.map(offerteRow).join('')+'</div>':'')
    +((lopend.length||afge.length)?'<div style="margin-top:24px;text-align:center"><button class="btn btn-outline btn-sm" onclick="openOfferteWizard()">'+ic('doc',15)+' Nieuwe offerte aanvragen</button></div>':'');
}
function offerteBodyHTML(){
  // 'nieuw'-tab is een slanke CTA naar de wizard (de inline-samensteller is vervangen door de overlay)
  if(offerteTab()==='nieuw') return '<div class="card" style="padding:30px 26px;text-align:center;max-width:560px;margin:8px auto"><div style="font-family:var(--font-display);font-weight:800;font-size:18px;margin-bottom:6px">Nieuwe offerte aanvragen</div><p class="sdesc" style="margin:0 auto 16px;max-width:46ch">Kies je tak, stel je producten samen en verstuur, wij werken je offerte persoonlijk uit.</p><button class="btn btn-primary" onclick="openOfferteWizard()">'+ic('doc',16)+' Start je aanvraag</button></div>';
  return offerteOverzichtHTML();
}
function panelOffertes(){ return offerteSubnav()+'<div id="offBody">'+offerteBodyHTML()+'</div>'; }
/* ---- Notificatie-kanalen (Cluster I): multi-select pill-picker i.p.v. dropdown ---- */
const KANAAL_OPTS=[['whatsapp','WhatsApp'],['email','E-mail'],['push','Push']];
const KANAAL_LABEL={whatsapp:'WhatsApp',email:'E-mail',push:'Push'};
function legacyVoorkeurNaarKanalen(v){ if(v==='WhatsApp')return['whatsapp']; if(v==='E-mail')return['email']; if(v==='Beide')return['whatsapp','email']; return []; }
function kanaalPicker(idPrefix, kanalen, onToggleFn){
  const set=Array.isArray(kanalen)?kanalen.slice():[];
  return '<div class="kanaal-pick" id="'+idPrefix+'" data-kanalen="'+esc(set.join(','))+'">'+KANAAL_OPTS.map(function(o){
    const on=set.indexOf(o[0])!==-1;
    return '<button type="button" class="kanaal-pill'+(on?' on':'')+'" data-k="'+o[0]+'" aria-pressed="'+(on?'true':'false')+'" onclick="toggleKanaal(this'+(onToggleFn?",'"+onToggleFn+"'":'')+')">'+esc(o[1])+'</button>';
  }).join('')+'</div>';
}
function toggleKanaal(btn, cb){
  const wrap=btn.closest('.kanaal-pick'); if(!wrap) return;
  const k=btn.getAttribute('data-k');
  let set=(wrap.getAttribute('data-kanalen')||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
  const i=set.indexOf(k); if(i===-1) set.push(k); else set.splice(i,1);
  wrap.setAttribute('data-kanalen', set.join(','));
  const on=set.indexOf(k)!==-1; btn.classList.toggle('on',on); btn.setAttribute('aria-pressed',on?'true':'false');
  // callback-whitelist: enkel bekende, veilige saves (geen arbitraire window[...]-aanroep)
  if(cb==='saveProfile' && typeof window.saveProfile==='function') window.saveProfile();
}
function readKanalen(idPrefix){ const w=document.getElementById(idPrefix); if(!w) return []; return (w.getAttribute('data-kanalen')||'').split(',').map(function(s){return s.trim();}).filter(Boolean); }
function _kanaalSub(c){
  const ks=(Array.isArray(c.kanalen)&&c.kanalen.length)?c.kanalen:legacyVoorkeurNaarKanalen(c.voorkeur);
  return ks.map(function(k){return KANAAL_LABEL[k]||k;}).join(', ');
}
function contactRow(c, isMe){
  const nm=((c.voornaam||'')+' '+(c.achternaam||'')).trim()||'Contactpersoon';
  const init=(nm.split(/\s+/).map(x=>x[0]).join('').slice(0,2)||'?').toUpperCase();
  const hasEmail=!!String(c.email||'').trim();
  // id whitelist-sanitizen vóór interpolatie in inline-onclick (esc() beschermt daar niet tegen quote-breakout)
  const cid=String(c.id||'').replace(/[^A-Za-z0-9_-]/g,'');
  const _kl=_kanaalSub(c);
  const sub=[c.rol||c.email||'', c.gsm||'', _kl?('meldingen: '+_kl):''].filter(Boolean).join(' · ');
  const meBadge=isMe?' <span style="font-size:10.5px;font-weight:700;color:#fff;background:var(--s27-indigo,#5B6B8C);border-radius:999px;padding:1px 8px;margin-left:6px">jij</span>':'';
  // zonder e-mail geen portaaltoegang -> eerlijke indicator (de panelkop belooft "iedereen hier kan inloggen")
  const noAccessBadge=(!hasEmail&&!isMe)?' <span style="font-size:10.5px;font-weight:700;color:var(--s27-orange-ink,#C44514);background:var(--s27-orange-soft,rgba(246,97,49,.12));border-radius:999px;padding:1px 8px;margin-left:6px">geen toegang</span>':'';
  const delBtn=isMe?'':`<button class="icon-btn" style="width:32px;height:32px;margin-left:6px" title="Ontkoppelen, toegang tot dit portaal vervalt" onclick="removeContact('${cid}',this)">${ic('trash',15)}</button>`;
  return `<div class="contact-row" data-cid="${cid}"><span class="cr-av" style="background:var(--s27-indigo,#5B6B8C)">${esc(init)}</span><div class="cr-tx"><b>${esc(nm)}${meBadge}${noAccessBadge}</b><span>${esc(sub)}</span></div><button class="btn btn-ghost btn-sm" onclick="editContact('${cid}')">Wijzig</button>${delBtn}</div>`;
}
function contactFormHTML(c){
  c=c||{}; const fld='font-family:var(--font-body);font-size:14px;padding:11px 13px;border:1px solid var(--line);border-radius:var(--r-sm);outline:none;background:#fff';
  return `<div class="setsec" id="contactForm" style="background:var(--paper-2,#FAF7F2);border:1px solid var(--line);margin-top:12px">
    <h3>${c.id?'Contactpersoon wijzigen':'Nieuwe contactpersoon'}</h3>
    <div class="set-grid">
      <div class="field"><label>Voornaam</label><input id="cfVoor" value="${esc(c.voornaam||'')}" style="${fld}"></div>
      <div class="field"><label>Achternaam</label><input id="cfAchter" value="${esc(c.achternaam||'')}" style="${fld}"></div>
      <div class="field"><label>E-mail</label><input id="cfEmail" value="${esc(c.email||'')}" placeholder="naam@bedrijf.be" style="${fld}"></div>
      <div class="field"><label>GSM / WhatsApp</label><input id="cfGsm" value="${esc(c.gsm||'')}" placeholder="+32 4xx xx xx xx" style="${fld}"></div>
      <div class="field" style="grid-column:1/-1"><label>Notificatie-kanalen</label>${kanaalPicker('cfKanalen', (Array.isArray(c.kanalen)&&c.kanalen.length)?c.kanalen:legacyVoorkeurNaarKanalen(c.voorkeur))}<div class="fs" style="color:var(--ink-4);margin-top:6px">Kies via welke kanalen deze persoon meldingen krijgt. Meerdere mogelijk.</div></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-branch br-indigo btn-sm" onclick="saveContact('${String(c.id||'').replace(/[^A-Za-z0-9_-]/g,'')}',this)">${ic('check',15)} Opslaan</button><button class="btn btn-ghost btn-sm" onclick="closeContactForm()">Annuleer</button></div>
  </div>`;
}
function panelInstellingen(){
  const demo=!_live();
  // team-beheer (alleen Studio 27): nieuwe portaal-versie hard doorduwen naar alle clients
  const beheer=(typeof isRichView==='function' && isRichView())
    ? '<section class="card" style="padding:18px 20px;margin-bottom:18px;border-left:4px solid var(--s27-blue)">'
      +'<h2 style="font-family:var(--font-display);font-size:15px;margin:0 0 4px">Team \u00b7 versiebeheer</h2>'
      +'<p class="sdesc" style="margin:0 0 12px">Duwt de versie van dit scherm als minimum naar \u00e1lle klanten en teamleden \u2014 ook ge\u00efnstalleerde apps herladen automatisch (binnen \u00b15 minuten of meteen bij openen).</p>'
      +'<button class="btn btn-primary btn-sm" onclick="pushPortalVersion(this)">'+ic('send',14)+' Push versie '+(window.APP_VERSION||'?')+' naar iedereen</button>'
      +'<div style="border-top:1px dashed var(--line);margin:16px 0 12px"></div>'
      +'<h2 style="font-family:var(--font-display);font-size:15px;margin:0 0 4px">Team \u00b7 facturatie-notitie</h2>'
      +'<p class="sdesc" style="margin:0 0 10px">Interne notitie voor Celien over dit bedrijf \u2014 nooit zichtbaar voor de klant.</p>'
      +'<textarea id="factNote" class="mp-note" rows="3" placeholder="Laden\u2026" onfocus="if(!this._l){this._l=1;}"></textarea>'
      +'<div style="margin-top:8px"><button class="btn btn-outline btn-sm" onclick="factNoteSave(this)">'+ic('check',14)+' Opslaan</button></div>'
      +(setTimeout(function(){ if(typeof factNoteLaad==='function') factNoteLaad(); },150),'')
      +'</section>'
    : '';
  const t=(window.S27DATA && S27DATA.team())||{};
  let contacts=(t.contactpersonen||[]).slice();
  const demoContacts=[{voornaam:'Sarah',achternaam:'Janssens',rol:'Marketing · hoofdcontact',gsm:'+32 478 12 34 56',email:'sarah@testclient.be',voorkeur:'WhatsApp',kanalen:['whatsapp','push'],id:'demo1'},{voornaam:'Tom',achternaam:'De Cock',rol:'Zaakvoerder',email:'tom@testclient.be',kanalen:['email'],id:'demo2'}];
  if(demo && !contacts.length) contacts=demoContacts.slice();
  // "Mij" herkennen op het ingelogde e-mailadres en bovenaan plaatsen
  const meEmail=((window.state&&state.session&&state.session.email)||'').toLowerCase().trim();
  let me=null;
  if(meEmail){ for(var i=0;i<contacts.length;i++){ if(String(contacts[i].email||'').toLowerCase().trim()===meEmail){ me=contacts[i]; break; } } }
  if(me){ contacts=[me].concat(contacts.filter(function(x){return x!==me;})); }
  const prof = demo ? (contacts[0]||{}) : (me||{}); const vk = prof.voorkeur||'Geen';  // enkel het ingelogde contact, geen terugval op een willekeurig contact
  const contactsHTML = contacts.length ? contacts.map(function(x){return contactRow(x, x===me);}).join('') : '<div class="fs" style="color:var(--ink-4)">Nog geen contactpersonen toegevoegd, voeg je eerste collega toe.</div>';
  return beheer+`<div class="setsec">
      <h3>Mijn profiel &amp; notificaties</h3><p class="sdesc">Je eigen gegevens, wijzigingen synchroniseren meteen met je contactfiche bij Studio&nbsp;27.</p>
      <input type="hidden" id="npProfileId" value="${esc(prof.id||'')}">
      <div class="set-grid">
        <div class="field"><label>E-mail</label><input id="npEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="${esc(prof.email||'')}" placeholder="naam@bedrijf.be" onchange="saveProfile()" ${prof.id?'':'disabled'}></div>
        <div class="field"><label>GSM / WhatsApp-nummer</label><input id="npGsm" type="tel" inputmode="tel" autocomplete="tel" value="${esc(prof.gsm||(demo?'+32 478 12 34 56':''))}" placeholder="+32 4xx xx xx xx" onchange="saveProfile()" ${prof.id?'':'disabled'}></div>
        <div class="field" style="grid-column:1/-1"><label>Notificatie-kanalen</label>${kanaalPicker('npKanalen', (Array.isArray(prof.kanalen)&&prof.kanalen.length)?prof.kanalen:legacyVoorkeurNaarKanalen(vk), prof.id?'saveProfile':null)}${prof.id?'':'<div class="fs" style="color:var(--ink-4);margin-top:6px">Koppel eerst je e-mail om kanalen te bewaren.</div>'}</div>
      </div>
      ${demo?'':`<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--paper-3,#F1EBE2)"><button class="btn btn-outline btn-sm" onclick="enablePushHere(this)">${ic('phone',15)} Pushmeldingen op dit toestel aanzetten</button><span id="pushHereMsg" class="fs" style="margin-left:10px;color:var(--ink-4)"></span><div class="fs" style="color:var(--ink-4);margin-top:6px">Krijg meldingen rechtstreeks op dit toestel, ook als de app dicht staat. Werkt op je telefoon zodra je het portaal aan je beginscherm toevoegt.</div></div>`}
      <div id="npSaved" class="fs" style="color:var(--s27-green-ink,#2e7d32);margin-top:8px;display:none">✓ Opgeslagen, je gegevens zijn bijgewerkt</div>
      ${(!demo&&!prof.id)?'<p class="fs" style="color:var(--ink-4);margin-top:8px">Je e-mail is nog niet aan een contactpersoon gekoppeld, voeg jezelf hieronder toe om je voorkeuren te bewaren.</p>':''}
    </div>
    <div class="setsec">
      <h3>Contactpersonen van je bedrijf</h3><p class="sdesc">Iedereen die hier staat kan inloggen én collega's beheren. Verwijder je iemand, dan vervalt meteen z'n toegang.</p>
      <div class="contact-list contact-list-sm" id="bedrijfContactList">${contactsHTML}</div>
      <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="addContact()">${ic('upload',15)} Persoon toevoegen</button>
      <div id="contactFormHost"></div>
    </div>
    <div class="setsec" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div><b style="font-family:var(--font-display);font-size:15px">Huisstijl-bestanden</b><div style="font-size:13px;color:var(--ink-3)">Logo's, fonts en templates uit je gedeelde Huisstijl-map, bekijken, uploaden en verwijderen.</div></div>
      <button class="btn btn-outline" onclick="goTab('huisstijl')">${ic('img',16)} Open Huisstijl</button>
    </div>
  <div class="setsec" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:18px">
    <div><b style="font-family:var(--font-display);font-size:15px">Uitloggen</b><div style="font-size:13px;color:var(--ink-3)">Log veilig uit op dit toestel.</div></div>
    <button class="btn btn-outline" onclick="logout()">${ic('logout',16)} Uitloggen</button>
  </div>`;
}

/* ---- shared chat markup ---- */
function chatHTML(taskId, readOnly){
  const live = (taskId && window.S27DATA) ? S27DATA.chat(taskId) : null;
  const msgs = (live && live.length!==undefined) ? live.map(m=>[m.av,m.who,m.color||'blue',m.tx,m.tm,m.me]) : [
    ['IM','Ilke Meeusen','blue','Hey Sarah! De eerste montage van de bedrijfsfilm staat klaar. Benieuwd wat je ervan vindt.','09:12',false],
    ['','Jij','blue','Wauw, ziet er strak uit! Kan de intro net iets korter?','09:41',true],
    ['IM','Ilke Meeusen','blue','Zeker, dat passen we gratis aan. Tegen morgen heb je een nieuwe versie.','09:43',false],
  ];
  // Read-receipt: enkel in de teamweergave (staff). Toont onder het nieuwste TEAM-bericht of de klant
  // de chat al las (m.me=true = klantbericht; nieuwste !me = teambericht, dan is de receipt relevant).
  let receiptHTML='';
  try{
    if(typeof isRichView==='function' && isRichView() && live && live.length){
      const last=live[live.length-1];
      if(last && !last.me){
        const rc=(window.S27DATA && S27DATA.chatReceipt) ? S27DATA.chatReceipt(taskId) : null;
        const read=rc?!!rc.read_by_client:false;
        const when=(rc&&rc.client_read_at)?(' · '+_inboxWhen(rc.client_read_at)):'';
        receiptHTML = read
          ? '<div class="chat-receipt" style="font-size:11.5px;color:var(--s27-green-ink,#147A50);padding:3px 8px 2px 0;display:flex;align-items:center;gap:4px;justify-content:flex-end">'+ic('check',13)+' Gelezen door klant'+esc(when)+'</div>'
          : '<div class="chat-receipt" style="font-size:11.5px;color:var(--ink-4);padding:3px 8px 2px 0;text-align:right">Nog niet gelezen door klant</div>';
      }
    }
  }catch(e){}
  const listHTML = `<div class="chat-list" id="chatList">
    ${msgs.length?msgs.map(m=>`<div class="msg ${m[5]?'me':''}">
      ${m[5]?'':`<span class="av" style="background:var(--s27-${m[2]})">${m[0]}</span>`}
      <div class="bubble"><div class="who">${m[1]==='Jij'?'Jij':esc(voornaam(m[1]))}</div><div class="tx">${m[3]}</div><div class="tm">${m[4]}</div></div>
    </div>`).join(''):`<div class="empty" style="padding:30px 10px"><p>${readOnly?'Geen chatgeschiedenis voor dit project.':'Nog geen berichten, stuur ons gerust iets!'}</p></div>`}
    ${receiptHTML}
  </div>`;
  if(readOnly) return listHTML+`<div class="chat-readonly">${ic('check',14)} Dit project is afgerond. De chatgeschiedenis blijft hier zichtbaar.</div>`;
  return listHTML+`<div class="chat-compose">`
    +`<div class="chat-tray" id="chatTray">${_chatChipsHTML()}</div>`
    +`<div class="chat-stagemsg" id="chatStageMsg"></div>`
    +`<div class="chat-input"><button type="button" class="chat-attach" title="Bestand(en) toevoegen" onclick="document.getElementById('chatFile').click()" style="border:none;background:none;cursor:pointer;color:var(--ink-4);padding:0 4px 0 8px;display:flex;align-items:center;flex:none">${ic('upload',18)}</button><input type="file" id="chatFile" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" style="display:none" onchange="chatStage(this)"><input class="chat-textin" placeholder="Schrijf een bericht…" onkeydown="if(event.key==='Enter')sendChat(this)"><button class="chat-send" onclick="sendChat(this.closest('.chat-input').querySelector('.chat-textin'))">${ic('send',18)}</button></div>`
    +`</div>`;
}
/* Chat-composer (portaal-breed): meerdere bestanden stagen + tekst typen, en pas bij 'Versturen' gaat
   het geheel samen weg. Staging leeft in state._chatStaged en overleeft poll-herrenders (chatHTML rendert
   de tray opnieuw). sendChat (portal.js) verzendt tekst + alle staged bestanden in één klik. */
var _chatStageSeq=0;
function _chatChipsHTML(){
  var st=(state._chatStaged||[]); if(!st.length) return '';
  return st.map(function(f){
    var th = /^image\//.test(f.type) ? '<img src="'+f.dataUrl+'" alt="">' : ic('doc',15);
    return '<span class="chat-chip" data-fid="'+f.id+'"><span class="chat-chip-th">'+th+'</span><span class="chat-chip-nm">'+esc(f.name)+'</span><button type="button" class="chat-chip-x" title="Verwijderen" onclick="chatUnstage(\''+f.id+'\')">'+ic('close',12)+'</button></span>';
  }).join('');
}
function _renderChatTray(){ var t=document.getElementById('chatTray'); if(t) t.innerHTML=_chatChipsHTML(); }
function chatStage(input){
  var files=(input&&input.files)?[].slice.call(input.files):[]; if(input) input.value='';
  if(!files.length) return;
  state._chatStaged=state._chatStaged||[];
  var msg=document.getElementById('chatStageMsg'); var over=0;
  files.forEach(function(f){
    if(f.size>22*1024*1024){ over++; return; }
    var rd=new FileReader();
    rd.onload=function(){ state._chatStaged.push({ id:'st'+(++_chatStageSeq), name:f.name, type:f.type||'', size:f.size, dataUrl:String(rd.result||'') }); _renderChatTray(); };
    rd.readAsDataURL(f);
  });
  if(msg) msg.textContent = over ? (over+' bestand(en) overgeslagen: te groot (max 22 MB). Plak liever een link in je bericht.') : '';
}
function chatUnstage(id){ state._chatStaged=(state._chatStaged||[]).filter(function(f){return f.id!==id;}); _renderChatTray(); var m=document.getElementById('chatStageMsg'); if(m) m.textContent=''; }

/* =========================================================
   PROJECT DETAIL MODAL
   ========================================================= */
// Plan-module: verschijnt ENKEL in twee scenario's (bepaald door de worker: det.plan):
//  - 'meeting' : het woord 'meeting' staat in de (sub)taak -> gewone plan-moment-widget.
//  - 'shoot'   : er is een nog-te-plannen shoot -> shootkalender-widget (altijd op locatie).
// In alle andere gevallen (mode 'none' of geen plan-data) verdwijnt de module volledig.
// Plan-module: één kaart per plannbaar item (det.plan.items, bepaald door de worker via
// projectstatus 'in progress' + due_date). Meerdere shoots/meetings tegelijk mogelijk. Geen items -> niets.
function scheduleBlock(det, p){
  const br = (p&&p.br)||'blue';
  if(!det){
    // demo/geen detail geladen: oude regel (1 plan-moment bij een to-do-project) voor de showcase.
    if(!p || p.status!=='todo') return '';
    return planCardHTML('meeting', p.id, '', br);
  }
  const items = (det.plan && det.plan.items) || [];
  if(!items.length) return '';
  return items.map(function(it){ return planCardHTML(it.type, it.task_id, it.label||'', br); }).join('');
}
function planCardHTML(type, tid, label, br){
  br = br||'blue';
  const sub = label ? `<p class="sdesc" style="margin:-2px 0 10px;font-weight:700;color:var(--ink-2)">${esc(label)}</p>` : '';
  if(type==='shoot'){
    return `<div class="setsec" style="margin-top:18px"><h3 style="display:flex;align-items:center;gap:8px">${ic('st_plan',18)} Plan je shoot</h3>${sub}<p class="sdesc">Kies een dag uit onze shootkalender en vul de locatie in. Een shoot vindt altijd plaats op locatie of bij Studio 27, samen met je cameraploeg.</p><div id="s27-plan-${esc(tid)}"><button class="btn btn-branch br-${br} btn-sm" onclick="openShootWizard('${esc(tid)}')">Toon beschikbare shootdagen →</button></div></div>`;
  }
  return `<div class="setsec" style="margin-top:18px"><h3 style="display:flex;align-items:center;gap:8px">${ic('st_plan',18)} Plan je moment</h3>${sub}<p class="sdesc">Kies een tijdslot dat past in de agenda van je Studio 27-contact, wij sturen meteen een agenda-uitnodiging met Meet-link of locatie.</p><div id="s27-plan-${esc(tid)}"><button class="btn btn-branch br-${br} btn-sm" onclick="loadPlanSlots('${esc(tid)}')">Toon beschikbare momenten →</button></div></div>`;
}
const REVIEW_CHANNEL_OPTS = [['portaal','via het portaal'],['whatsapp','via WhatsApp'],['email','via e-mail'],['telefoon','telefonisch'],['meeting','in een meeting']].map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join('');
// label naar de juiste actie-knop voor een deliverable-link (Vimeo/Webflow/Drive)
function deliverOpenLabel(type){ return type==='video'?'Bekijk video':type==='img'?'Bekijk beeld':'Open link'; }
// één deliverable-rij met directe link + (optioneel) Feedback geven / Goedkeuren ernaast
function deliverFileRow(d, opts){
  opts=opts||{}; const t=d.type==='video'?'video':d.type==='img'?'img':'doc';
  const open = d.url ? `<a class="btn btn-branch br-${opts.br||'blue'} btn-sm" href="${esc(d.url)}" target="_blank" rel="noopener">${ic(t==='video'?'play':'arrow',14)} ${deliverOpenLabel(t)}</a>` : '';
  const actions = opts.done ? `${spill('done')}${d.url?`<button class="btn btn-outline btn-sm" onclick="fileDownload(this)">${ic('download',14)} Bekijk &amp; download</button>`:''}` : `${open}${opts.review!==false?`<button class="btn btn-outline btn-sm" onclick="fileFeedback(this)">Feedback indienen</button><button class="btn btn-branch btn-sm br-green" onclick="fileApprove(this)">Goedkeuren</button>`:''}`;
  return `<div class="deliv-file" data-label="${esc(d.label||'Bestand')}" data-url="${esc(d.url||'')}"${opts.taskId?` data-task="${esc(opts.taskId)}"`:''}>
    <span class="df-ic">${ic(t,18)}</span>
    <div class="df-tx"><b>${esc(d.label||'Bestand')}</b>${d.url?`<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:42ch;display:inline-block">${esc((d.url||'').replace(/^https?:\/\//,''))}</span>`:''}</div>
    <div class="df-act">${actions}</div>
  </div>`;
}
// goedgekeurde taak: klikbaar als ze bestanden had -> toont die bestanden (read-only)
let _aTaskSeq=0;
function approvedTaskRow(t){
  const has = t.heeftBestanden && (t.bestanden||[]).length;
  if(!has){
    return `<div class="approved-row"><span class="check-circ">${ic('check',13)}</span><span>${esc(t.naam)}</span></div>`;
  }
  const fid='atask-'+(++_aTaskSeq);
  const files=(t.bestanden||[]).map(f=>{ const tp=f.type==='video'?'video':f.type==='img'?'img':'doc'; return `<div class="deliv-file" data-label="${esc(f.label||'Bestand')}" data-url="${esc(f.url||'')}"${t.id?` data-task="${esc(t.id)}"`:''} style="background:var(--paper-2,#FAF7F2)"><span class="df-ic">${ic(tp,18)}</span><div class="df-tx"><b>${esc(f.label||'Bestand')}</b><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:42ch;display:inline-block">${esc((f.url||'').replace(/^https?:\/\//,''))}</span></div><div class="df-act">${f.url?`<button class="btn btn-outline btn-sm" onclick="fileDownload(this)">${ic('download',14)} Bekijk &amp; download</button>`:''}</div></div>`; }).join('');
  return `<div class="approved-row approved-clickable" role="button" tabindex="0" onclick="toggleApprovedFiles('${fid}',this)"><span class="check-circ">${ic('check',13)}</span><span>${esc(t.naam)}</span><span class="ar-files-hint">${ic('download',13)} ${(t.bestanden||[]).length} bestand${(t.bestanden||[]).length===1?'':'en'}</span><svg class="chev" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></div><div class="approved-files" id="${fid}" style="display:none"><div class="subtask-files">${files}</div></div>`;
}
function toggleApprovedFiles(fid, el){ const box=document.getElementById(fid); if(!box)return; const open=box.style.display==='none'; box.style.display=open?'':'none'; if(el)el.classList.toggle('open',open); }
// Data-gedreven projecttijdlijn: 4 fasen afgeleid uit de projectstatus (todo/prog/wait/done).
// Enkel bereikte fasen krijgen 'done', de huidige fase is 'wait' (actief), latere fasen 'todo'.
// Het middelste fase-label past zich aan op de discipline (montage voor video, contentplan voor social, enz.).
function _midPhaseLabel(disc){
  var d=String(disc||'');
  if(/video|fotograf/i.test(d)) return 'Productie &amp; montage';
  if(/social/i.test(d)) return 'Contentproductie';
  if(/strateg/i.test(d)) return 'Uitwerking strategie';
  if(/web|seo/i.test(d)) return 'Ontwerp &amp; bouw';
  if(/adverteren|ads/i.test(d)) return 'Opzet campagnes';
  if(/branding/i.test(d)) return 'Creatie';
  if(/opleiding/i.test(d)) return 'Voorbereiding';
  return 'In productie';
}
function timelineSteps(p){
  var st=(p&&p.status)||'prog';
  // fase-index die de status heeft BEREIKT: todo=0 (kick-off bezig), prog=1 (productie bezig),
  // wait=2 (review bezig), done=4 (alles af)
  var reached = (st==='done') ? 4 : (st==='wait') ? 2 : (st==='prog') ? 1 : 0;
  var labels=['Briefing &amp; kick-off', _midPhaseLabel(p&&p.disc), 'Jouw review', 'Oplevering'];
  return labels.map(function(lab,i){
    var state = (i<reached) ? 'done' : (i===reached ? 'wait' : 'todo');
    return [lab, state];
  });
}
// vriendelijk label voor een opgeleverd-linkje (picflow-slugs e.d. worden 'Bekijk oplevering')
function procesLinkLabel(l){
  if(!l) return 'Bekijk';
  if(l.type==='video') return 'Bekijk video';
  if(l.type==='img') return "Bekijk foto's";
  if(l.type==='folder') return 'Projectmap';
  if(l.label && /\s/.test(l.label) && l.label.length<=28) return l.label;
  return 'Bekijk oplevering';
}
// Proces-overzicht bovenaan de detail: direct zichtbaar wat opgeleverd is (+linkjes), of je
// feedback moet geven, of er een meeting moet komen en welke acties er zijn. Bron = det.proces
// (worker, diepe subtaak-boom). Bij demo/lege proces -> '' (de oude blokken nemen het over).
// Vimeo-embed (player) uit een vimeo-URL; ondersteunt unlisted (hash). '' als geen vimeo-link.
function vimeoEmbed(url){
  var m=String(url||'').match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-z]+))?/i);
  if(!m) return '';
  var src='https://player.vimeo.com/video/'+m[1]+(m[2]?('?h='+m[2]):'');
  return '<iframe src="'+src+'" loading="lazy" frameborder="0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;display:block"></iframe>';
}
// In-portal feedback-kaart voor één wacht-op-feedback-stap: bekijk de oplevering (link met
// projectnaam, evt. Vimeo-speler in het portaal) + direct goedkeuren of feedback geven (feedbackV2).
function feedbackCard(s){
  var embed=(s.links||[]).map(function(l){ return l.type==='video'?vimeoEmbed(l.url):''; }).filter(Boolean)[0]||'';
  var views=(s.links||[]).map(function(l){
    var typ = l.type==='video'?'Bekijk op Vimeo' : l.type==='img'?"Bekijk de foto's" : l.type==='folder'?'Open de projectmap' : 'Bekijk de oplevering';
    return '<a class="fbc-view" data-task="'+esc(s.task_id)+'" data-label="'+esc(s.naam)+'" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+ic(l.type==='video'?'play':l.type==='img'?'img':'doc',15)+'<span>'+esc(typ+' · '+s.naam)+'</span>'+ic('arrow',13)+'</a>';
  }).join('');
  if(!views) views='<div class="fbc-nm">'+esc(s.naam)+'</div>';
  var tid=esc(s.task_id);
  return '<div class="fbc">'
    +(embed?'<div class="fbc-embed">'+embed+'</div>':'')
    +'<div class="fbc-views">'+views+'</div>'
    +'<div class="fbc-act" id="fbcact-'+tid+'">'
      +'<button class="btn btn-branch br-green btn-sm" onclick="procesApprove(\''+tid+'\')">'+ic('check',15)+' Goedkeuren</button>'
      +'<button class="btn btn-outline btn-sm" onclick="procesFeedbackToggle(\''+tid+'\')">'+ic('msg',15)+' Feedback indienen</button>'
    +'</div>'
    +'<div class="fbc-fb" id="fbcfb-'+tid+'" style="display:none">'
      +'<textarea id="fbctx-'+tid+'" rows="3" placeholder="Wat mag er anders? Opmerkingen passen we volledig gratis aan."></textarea>'
      +'<div class="fbc-fbact"><button class="btn btn-primary btn-sm" onclick="procesFeedback(\''+tid+'\')">'+ic('send',14)+' Versturen</button><button class="btn btn-ghost btn-sm" onclick="procesFeedbackToggle(\''+tid+'\')">Annuleer</button></div>'
    +'</div>'
  +'</div>';
}
function procesBlock(det,p,opts){
  const pr = det && det.proces;
  if(!pr || !pr.aantal_stappen) return '';
  // noPlan (branding/strategie): de plan-aankondiging onderdrukken want scheduleBlock toont daar
  // geen plan-kaarten -> anders 'je kunt nu inplannen' zonder widget eronder (review v85 #5).
  const plan = (opts&&opts.noPlan) ? [] : ((det && det.plan && det.plan.items) || []);
  const fb = pr.wacht_feedback || [];
  let h='<div class="proces-panel">';
  // 0) 'Nieuwe taak klaar'-melding (de plan-kaarten staan er net onder via scheduleBlock)
  if(plan.length){
    var hasShoot=plan.some(function(x){return x.type==='shoot';}), hasMeet=plan.some(function(x){return x.type!=='shoot';});
    var wat = (hasShoot&&hasMeet)?'je shoots of meetings' : hasShoot?(plan.length>1?'je shoots':'je shoot') : (plan.length>1?'je meetings':'een meeting');
    h+='<div class="proces-newtask">'+ic('st_plan',16)+'<span>Er staat een nieuwe taak voor je klaar. Je kunt nu '+wat+' inplannen, hieronder.</span></div>';
  }
  // 1) Klaar voor jouw feedback (IN-PORTAL: bekijken + direct goedkeuren of feedback geven)
  if(fb.length){
    h+='<div class="proces-h proces-h-do">'+ic('st_feedback',15)+'<span>Klaar voor jouw feedback</span></div>';
    h+=fb.map(feedbackCard).join('');
  }
  // 2) Wat is opgeleverd (+ linkjes)
  if(pr.opgeleverd && pr.opgeleverd.length){
    h+='<div class="proces-h">'+ic('st_approved',15)+'<span>Wat is opgeleverd</span></div><div class="proces-list">';
    h+=pr.opgeleverd.map(function(s){
      var links=(s.links||[]).map(function(l){ return '<a class="proces-link" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+ic('download',13)+'<span>'+esc(procesLinkLabel(l))+'</span></a>'; }).join('');
      return '<div class="proces-step"><span class="proces-dot done">'+ic('check',11)+'</span><span class="proces-step-nm">'+esc(s.naam)+'</span>'+(links?'<span class="proces-links">'+links+'</span>':'')+'</div>';
    }).join('');
    h+='</div>';
  }
  // (3+4) 'Nog N stap in productie' + 'Alles loopt op schema, je hoeft niets te doen' weggehaald
  // (Vincent 16-06): te veel ruis in de projectweergave; de opgeleverd/feedback-blokken volstaan.
  // 5) Meeting al gepland?
  if(pr.meeting && pr.meeting.gepland){
    h+='<div class="proces-loopt">'+ic('cal',14)+'<span>Er staat al een meeting gepland voor dit project.</span></div>';
  }
  h+='</div>';
  return h;
}
/* ---- Video-onderdelen (V): subtaken per TYPE JOB (stabiele sleutel: preproductie/shoot/edit/fbEdit) ---- */
function _ondMs(v){ var n=Number(v); return Number.isFinite(n)&&n>0?n:0; }
function _ondDatum(ms){ var d=new Date(_ondMs(ms)); return _ondMs(ms)?d.toLocaleDateString('nl-BE',{weekday:'short',day:'numeric',month:'short'}):''; }
function _ondUur(ms){ var d=new Date(_ondMs(ms)); return _ondMs(ms)?(('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)):''; }
function ondToggleInfo(btn){ var r=btn.closest('.ond-row'); if(r) r.classList.toggle('open'); }
function openVideoFeedback(subId, url, label, btn){
  if(window.S27VideoReview){ S27VideoReview.open({ taskId:String(subId), url:String(url), label:String(label||'Video'), sourceEl:btn }); }
  else window.open(url,'_blank','noopener');
}
function _ondShootRij(s, br){
  var gepland=_ondMs(s.startDate)||_ondMs(s.datum);
  if(gepland){
    var startMs=_ondMs(s.startDate)||_ondMs(s.datum);
    return '<div class="ond-row ond-shoot card br-'+br+'">'
      +'<button class="ond-head" onclick="ondToggleInfo(this)">'+ic('cal',16)
      +'<span class="ond-naam">'+esc(s.naam)+'</span>'
      +'<span class="ond-chip ond-chip-ok">'+esc(_ondDatum(startMs))+' · '+esc(_ondUur(startMs))+'</span>'
      +'<svg class="chev" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>'
      +'<div class="ond-info"><div class="ond-kv"><b>Startdatum</b><span>'+esc(_ondDatum(startMs))+'</span></div>'
      +'<div class="ond-kv"><b>Startuur</b><span>'+esc(_ondUur(startMs))+' (aankomst op locatie)</span></div>'
      +(s.locatie?'<div class="ond-kv"><b>Startlocatie</b><span>'+esc(s.locatie)+'</span></div>':'')
      +'<p class="ond-locknote">'+ic('info',13)+' Deze shoot staat vast ingepland. Wijzigen kan enkel via het team, stuur ons gerust een berichtje in de chat.</p></div></div>';
  }
  return '<div class="ond-row ond-shoot card br-'+br+'"><div class="ond-head">'+ic('cal',16)
    +'<span class="ond-naam">'+esc(s.naam)+'</span>'
    +'<span class="ond-chip ond-chip-todo">Nog in te plannen</span>'
    +'<button class="btn btn-branch br-'+br+' btn-sm" onclick="openShootOverlay(\''+esc(s.id)+'\')">'+ic('cal',14)+' Plan deze shoot</button></div></div>';
}
function _ondEditRij(s, br){
  var isNab=/nabewerk/i.test(s.naam||'');
  var alle=s.bestanden||[];
  var fotoMaps=alle.filter(function(f){ return /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(f.url||''); });
  var files=alle.filter(function(f){ return fotoMaps.indexOf(f)<0; });
  var gegeven=(s.fbRondes&&s.fbRondes.length)?true:false;
  // uniforme sublabel (item 17) altijd zichtbaar; daarnaast max 1 actieknop afhankelijk van de status.
  var inner=ondChip(s);
  if(s.status==='wait'||s.status==='sent'){
    if(files.length===1){
      inner+=gegeven
        ? '<button class="btn btn-outline btn-sm" onclick="openVideoFeedback(\''+esc(s.id)+'\',\''+esc(files[0].url)+'\',\''+esc(files[0].label||s.naam)+'\',this)">'+ic('check',13)+' Feedback ingediend</button>'
        : '<button class="btn btn-branch br-'+br+' btn-sm" onclick="openVideoFeedback(\''+esc(s.id)+'\',\''+esc(files[0].url)+'\',\''+esc(files[0].label||s.naam)+'\',this)">'+ic('st_feedback',14)+' Feedback indienen</button>';
    } else if(files.length>1){
      inner+='<button class="btn btn-branch br-'+br+' btn-sm" onclick="ondToggleInfo(this)">'+ic('doc',14)+' Alle bestanden bekijken ('+files.length+')</button>';
    }
  }
  var lijst='';
  if(files.length>1 && (s.status==='wait'||s.status==='sent')){
    lijst='<div class="ond-info"><div class="ond-files">'+files.map(function(f){
      return '<div class="ond-file"><span class="df-ic">'+ic(f.type==='video'?'video':f.type==='img'?'img':'doc',16)+'</span>'
        +'<span class="ond-file-nm">'+esc(f.label||'Video')+'</span>'
        +'<button class="btn btn-outline btn-sm" onclick="openVideoFeedback(\''+esc(s.id)+'\',\''+esc(f.url)+'\',\''+esc(f.label||'Video')+'\',this)">Bekijk &amp; geef feedback</button></div>';
    }).join('')+'</div></div>';
  }
  // download-links pas ná goedkeuring (Vincent: content downloaden mag pas na akkoord)
  var dls='';
  if(s.status==='done' && files.length){
    dls='<div class="ond-info open-static"><div class="ond-files">'+files.map(function(f){
      // Bug 86ca92rhm: open de review-overlay (gesigneerde download, werkt ook zonder Drive-toegang) i.p.v. de rauwe Drive-link
      return '<div class="deliv-file ond-file" role="button" tabindex="0" style="cursor:pointer" data-label="'+esc(f.label||'Bestand')+'" data-url="'+esc(f.url||'')+'" data-task="'+esc(s.id)+'" onclick="fileDownload(this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();fileDownload(this);}"><span class="df-ic">'+ic(f.type==='video'?'video':f.type==='img'?'img':'doc',16)+'</span><span class="ond-file-nm">'+esc(f.label||'Bestand')+'</span>'+ic('download',14)+'</div>';
    }).join('')+'</div></div>';
  }
  // gedeelde Drive-fotomap(pen): altijd bekijkbaar als galerij in het portaal
  var fotoBtns='';
  if(fotoMaps.length){
    fotoBtns='<div class="ond-info open-static"><div class="ond-files">'+fotoMaps.map(function(f){
      return '<div class="ond-file"><span class="df-ic">'+ic('img',16)+'</span><span class="ond-file-nm">'+esc((f.label&&f.label!=='Open in Drive')?f.label:'Beeldmateriaal')+'</span>'
        +'<button class="btn btn-branch br-'+br+' btn-sm" onclick="openFotoGalerij(\''+esc(s.id)+'\',\''+esc(f.url)+'\')">'+ic('img',14)+' Bekijk de foto\u2019s</button></div>';
    }).join('')+'</div></div>';
  }
  return '<div class="ond-row ond-edit card br-'+br+'"><div class="ond-head">'+ic(isNab?'img':'video',16)
    +'<span class="ond-naam">'+esc(s.naam)+'</span>'+inner+'</div>'+lijst+dls+fotoBtns+'</div>';
}
// Stabiele TYPE JOB-sleutel van een subtaak: gebruik de door de worker meegestuurde
// type_job_key (immuun voor herordenen van de opties). Valt terug op de TAAKNAAM
// zolang de worker de sleutel nog niet meestuurt (transitie) of als ze ontbreekt, NOOIT meer
// op de orderindex (die verschuift bij het toevoegen/verwijderen van een dropdown-optie).
function _tjKey(s){
  if(s && s.typeJobKey) return s.typeJobKey;
  var n=String((s&&s.naam)||'').toLowerCase();
  if(/montage|monteren|\bedit\b|nabewerk/.test(n)) return 'edit';   // nabewerking valt ook onder 'edit' (subset via naamregex hieronder)
  if(/\bshoot\b|draaidag|opname|fotoshoot|filmdag/.test(n)) return 'shoot';
  if(/pre-?productie|draaiboek|storyboard|script/.test(n)) return 'preproductie';
  if(/^fb\b|feedbackronde|revisieronde/.test(n)) return 'fbEdit';
  return '';
}
function onderdelenBlok(det, p){
  var subs=(det&&det.subtasks)||[];
  var typed=subs.filter(function(s){ return (s.typeJobKey!=null && s.typeJobKey!=='') || (s.typeJob!=null && s.typeJob!==''); });
  if(!typed.length) return null;   // geen TYPE JOB-data -> klassieke detailweergave
  var br=p.br||'purple';
  var pre=typed.filter(function(s){ return _tjKey(s)==='preproductie' && (s.bestanden||[]).length>0; });
  var shoots=typed.filter(function(s){ return _tjKey(s)==='shoot'; });
  var edits=typed.filter(function(s){ return _tjKey(s)==='edit' && !/nabewerk/i.test(s.naam||''); });
  var nab=typed.filter(function(s){ return _tjKey(s)==='edit' && /nabewerk/i.test(s.naam||''); });
  var fb=typed.filter(function(s){ return _tjKey(s)==='fbEdit'; });
  var h='';
  function kop(t,n){ return '<div class="section-head ond-kop"><h2>'+esc(t)+'</h2>'+(n?'<span class="count">'+n+'</span>':'')+'</div>'; }
  if(pre.length){
    h+=kop('Pre-productie',pre.length);
    h+=pre.map(function(s){
      return '<div class="ond-row card br-'+br+'"><div class="ond-head">'+ic('doc',16)+'<span class="ond-naam">'+esc(s.naam)+'</span></div>'
        +'<div class="ond-info open-static"><div class="subtask-files">'+(s.bestanden||[]).map(function(f){
          return deliverFileRow(f,{br:br,done:s.status==='done'});
        }).join('')+'</div></div></div>';
    }).join('');
  }
  if(shoots.length){ h+=kop(shoots.length===1?'Shoot':'Shoots',shoots.length)+shoots.map(function(s){ return _ondShootRij(s,br); }).join(''); }
  if(edits.length){
    h+=kop('Montage',edits.length)+edits.map(function(s){ return _ondEditRij(s,br); }).join('');
    // Feedbackrondes horen BIJ de montage (Vincent: 'onder het juiste onderdeel, niet apart') -
    // WhatsApp-stijl in/uitklapbaar blok direct onder de montage-rijen.
    if(fb.length) h+=_fbRondesBlock(fb,br);
  }
  if(nab.length){ h+=kop('Nabewerking',nab.length)+nab.map(function(s){ return _ondEditRij(s,br); }).join(''); }
  // Fallback: feedbackrondes zonder montage om onder te nesten -> toch tonen (eigen kop).
  if(fb.length && !edits.length){ h+=kop('Feedbackrondes',fb.length)+_fbRondesBlock(fb,br); }
  return h||null;
}
// Naam van een feedbackronde opschonen: 'FB - Montage' -> 'Montage'. Nooit verzinnen, enkel prefix strippen.
function _fbRondeNaam(n){ return String(n||'').replace(/^\s*fb\s*[-–]\s*/i,'').trim()||'Feedback'; }
// WhatsApp-stijl feedbackronde-blok: in/uitklapbaar, chronologisch genummerd (Ronde 1 = oudste),
// zodat de klant ziet om de hoeveelste ronde het gaat én alles kan terugkijken. Data 1:1 uit de gateway.
function _fbRondesBlock(fb, br){
  var sorted=fb.slice().sort(function(a,b){ return (_ondMs(a.dateCreated)||_ondMs(a.startDate)||0)-(_ondMs(b.dateCreated)||_ondMs(b.startDate)||0); });
  var rows=sorted.map(function(s,i){
    var done=s.status==='done';
    return '<div class="fbr-ronde'+(done?' is-done':'')+'">'
      +'<span class="fbr-num">'+(i+1)+'</span>'
      +'<div class="fbr-tx"><b>Ronde '+(i+1)+'</b><span>'+esc(_fbRondeNaam(s.naam))+'</span></div>'
      +'<span class="ond-chip '+(done?'ond-chip-ok':'ond-chip-prog')+'">'+(done?'Verwerkt':'Ontvangen')+'</span></div>';
  }).join('');
  return '<div class="ond-row fbr-wrap card br-'+br+'">'
    +'<button class="ond-head fbr-head" onclick="ondToggleInfo(this)">'+ic('st_feedback',15)
    +'<span class="ond-naam">Feedbackrondes</span>'
    +'<span class="ond-chip ond-chip-prog">'+sorted.length+'</span>'
    +'<svg class="chev" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>'
    +'<div class="ond-info"><div class="fbr-list">'+rows+'</div></div></div>';
}
// demo-onderdelen voor het voorbeeldportaal (video-project zonder live data)
function demoVideoDet(){
  var nu=Date.now();
  return { subtasks:[
    { id:'d-pre', naam:'Preproductie, draaiboek', status:'done', typeJobKey:'preproductie', heeftBestanden:true, bestanden:[{label:'Draaiboek v2.pdf', url:'#', type:'doc'}] },
    { id:'d-sh1', naam:'Shoot 1, kantoor & team', status:'prog', typeJobKey:'shoot', startDate:String(nu+5*86400000), datum:String(nu+5*86400000+4*3600000), locatie:'Industrieweg 27, 2320 Hoogstraten', heeftBestanden:false, bestanden:[] },
    { id:'d-sh2', naam:'Shoot 2, klantcases on-site', status:'todo', typeJobKey:'shoot', startDate:'', datum:'', locatie:'', heeftBestanden:false, bestanden:[] },
    { id:'d-ed1', naam:'Montage bedrijfsfilm', status:'wait', typeJobKey:'edit', heeftBestanden:true, bestanden:[{label:'Montage v1, bedrijfsfilm', url:'https://vimeo.com/76979871', type:'video'}] },
    { id:'d-nab', naam:'Nabewerking foto\u2019s', status:'prog', typeJobKey:'edit', heeftBestanden:true, bestanden:[{label:'Fotoshoot najaarscollectie', url:'https://drive.google.com/drive/folders/demo-fotomap', type:'img'}] }
  ] };
}
/* ---- Generieke onderdelen (branding/strategie): subtaak-status + in-portal bestand-feedback ----
   Zelfde look&feel als de video-onderdelen, maar zonder shoots: elke subtaak = een rij met
   status-chip; staat er een bestand klaar, dan integreren we de feedbackmodule rechtstreeks in
   het portaal (video = frame-accurate review, foto-Drivemap = galerij, doc/beeld = inline
   goedkeuren/feedback). Na goedkeuring verschijnen de downloadlinks. */
function _ondTaakIcoon(files, fotoMaps){
  if(fotoMaps.length) return 'img';
  if(files.some(function(f){return f.type==='video';})) return 'video';
  if(files.some(function(f){return f.type==='img';})) return 'img';
  return 'doc';
}
function _ondVideoFileRow(s, f, br){
  return '<div class="deliv-file" data-label="'+esc(f.label||'Video')+'"><span class="df-ic">'+ic('video',18)+'</span>'
    +'<div class="df-tx"><b>'+esc(f.label||'Video')+'</b></div>'
    +'<div class="df-act"><button class="btn btn-branch br-'+br+' btn-sm" onclick="openVideoFeedback(\''+jsEsc(s.id)+'\',\''+jsEsc(f.url)+'\',\''+jsEsc(f.label||'Video')+'\',this)">'+ic('play',14)+' Bekijk &amp; geef feedback</button></div></div>';
}
// opent een bestand in de juiste reviewer (video → frame-accurate S27VideoReview, rest → dispatcher).
function ondOpenFile(btn, taskId, url, label){
  try{
    if(window.S27VideoReview && typeof S27VideoReview.isReviewable==='function' && S27VideoReview.isReviewable(String(url))){
      S27VideoReview.open({ taskId:String(taskId), url:String(url), label:String(label||'Video'), sourceEl:btn }); return;
    }
    if(window.S27Review && S27Review.pickReviewer){ S27Review.pickReviewer(String(url), {taskId:String(taskId), label:String(label||'Bestand'), sourceEl:btn}); return; }
  }catch(e){}
  window.open(url,'_blank','noopener');
}
// één bestand-regel in de 'Alle bestanden bekijken'-dropdown: naam + 'Bekijk & geef feedback'.
function _ondFileFeedbackRow(s, f, br){
  return '<div class="ond-file"><span class="df-ic">'+ic(f.type==='video'?'play':f.type==='img'?'img':'doc',16)+'</span>'
    +'<span class="ond-file-nm">'+esc(f.label||'Bestand')+'</span>'
    +'<button class="btn btn-branch br-'+br+' btn-sm" onclick="ondOpenFile(this,\''+jsEsc(s.id)+'\',\''+jsEsc(f.url)+'\',\''+jsEsc(f.label||'Bestand')+'\')">'+ic('st_feedback',14)+' Bekijk &amp; geef feedback</button></div>';
}
function _ondTaakRij(s, br){
  var alle=s.bestanden||[];
  var fotoMaps=alle.filter(function(f){ return /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(f.url||''); });
  var files=alle.filter(function(f){ return fotoMaps.indexOf(f)<0; });
  var chip=ondChip(s);   // uniforme sublabel (item 17)
  // max 1 actieknop (item 7): 'Alle bestanden bekijken' → klap een dropdown open met per bestand
  // een 'Bekijk & geef feedback'-knop. Toon dit voor ELKE niet-afgewerkte status met bestanden
  // (anders verdwijnen opgeleverde bestanden van een in-productie-project). Geel/beige proces-
  // banner valt weg (zie onderdelenBlokAlg).
  var showFb=(s.status!=='done' && files.length>0);
  var act='';
  if(showFb){
    act='<button class="btn btn-branch br-'+br+' btn-sm ond-actbtn" onclick="ondToggleInfo(this)">'+ic('doc',14)+' Alle bestanden bekijken ('+files.length+')</button>';
  }
  var head='<div class="ond-head">'+ic(_ondTaakIcoon(files,fotoMaps),16)+'<span class="ond-naam">'+esc(s.naam)+'</span>'+chip+act+'</div>';
  var body='';
  if(showFb){
    body+='<div class="ond-info"><div class="ond-files">'+files.map(function(f){ return _ondFileFeedbackRow(s,f,br); }).join('')+'</div></div>';
  } else if(s.status==='done' && files.length){
    // na goedkeuring: downloadlinks (blijven direct zichtbaar)
    body+='<div class="ond-info open-static"><div class="subtask-files">'+files.map(function(f){
      return deliverFileRow(f,{br:br,done:true,taskId:s.id});
    }).join('')+'</div></div>';
  }
  // gedeelde Drive-fotomap(pen): altijd als galerij bekijkbaar in het portaal
  if(fotoMaps.length){
    body+='<div class="ond-info open-static"><div class="ond-files">'+fotoMaps.map(function(f){
      return '<div class="ond-file"><span class="df-ic">'+ic('img',16)+'</span><span class="ond-file-nm">'+esc((f.label&&f.label!=='Open in Drive')?f.label:'Beeldmateriaal')+'</span>'
        +'<button class="btn btn-branch br-'+br+' btn-sm" onclick="openFotoGalerij(\''+esc(s.id)+'\',\''+esc(f.url)+'\')">'+ic('img',14)+' Bekijk de foto’s</button></div>';
    }).join('')+'</div></div>';
  }
  return '<div class="ond-row ond-edit card br-'+br+'">'+head+body+'</div>';
}
function onderdelenBlokAlg(det, p){
  var subs=(det&&det.subtasks)||[];
  var br=p.br||'blue';
  // pure projectmanagement-subtaken zonder oplevering zijn intern proceswerk -> niet tonen
  var rows=subs.filter(function(s){
    var hasF=(s.bestanden||[]).length>0;
    var isPM = s.typeJobKey ? (s.typeJobKey==='projectmanagement') : (Number(s.typeJob)===0);
    if(isPM && !hasF) return false;
    return true;
  });
  // FALLBACK (item 7): geen opleverbare subtaken maar wél deliverables op de hoofdtaak →
  // toon één 'project'-regel met status + 'Alle bestanden bekijken'-dropdown, zodat de
  // geel/beige proces-banner nooit verschijnt en alle takken dezelfde look krijgen.
  if(!rows.length){
    var rootDelivs=(det&&det.deliverables)||[];
    if(!rootDelivs.length) return null;
    var synth={ id:(p.id||(det&&det.id)||''), naam:(p.name||det&&det.name||'Opgeleverde bestanden'),
      status:(p.status||(det&&det.status)||'wait'), statusRaw:(p.statusRaw||(det&&det.statusRaw)||''),
      bestanden:rootDelivs };
    return '<div class="section-head ond-kop"><h2>Onderdelen</h2></div>'
      +'<p class="sdesc" style="margin:-2px 0 12px">Hier zie je de status van je project. Zodra er iets klaarstaat, bekijk je het en geef je je akkoord of feedback &mdash; rechtstreeks hier.</p>'
      +_ondTaakRij(synth,br);
  }
  var h='<div class="section-head ond-kop"><h2>Onderdelen</h2><span class="count">'+rows.length+'</span></div>';
  h+='<p class="sdesc" style="margin:-2px 0 12px">Hier zie je de status van elk onderdeel. Zodra er iets klaarstaat, bekijk je het en geef je je akkoord of feedback &mdash; rechtstreeks hier.</p>';
  h+=rows.map(function(s){ return _ondTaakRij(s,br); }).join('');
  return h;
}
// demo-onderdelen voor branding/strategie (voorbeeldportaal, geen live data)
function demoAlgDet(disc){
  if(disc==='branding') return { subtasks:[
    { id:'db-1', naam:'Merkonderzoek & moodboard', status:'done', typeJobKey:'branding', heeftBestanden:true, bestanden:[{label:'Moodboard.pdf', url:'#', type:'doc'}] },
    { id:'db-2', naam:'Logo-ontwerp', status:'wait', typeJobKey:'branding', heeftBestanden:true, bestanden:[{label:'Logo-voorstel v1.pdf', url:'#', type:'doc'}] },
    { id:'db-3', naam:'Huisstijlgids', status:'prog', typeJobKey:'branding', heeftBestanden:false, bestanden:[] }
  ] };
  return { subtasks:[
    { id:'ds-1', naam:'Marktonderzoek & analyse', status:'done', typeJobKey:'strategie', heeftBestanden:true, bestanden:[{label:'Marktanalyse.pdf', url:'#', type:'doc'}] },
    { id:'ds-2', naam:'Positioneringsworkshop', status:'done', typeJobKey:'strategie', heeftBestanden:false, bestanden:[] },
    { id:'ds-3', naam:'Strategiedeck', status:'wait', typeJobKey:'strategie', heeftBestanden:true, bestanden:[{label:'Strategiedeck v1.pdf', url:'#', type:'doc'}] }
  ] };
}
function buildModal(id, from){
  const p=_projects().find(x=>x.id===id)||{id:id,name:'Project',disc:'',status:'prog',br:'blue'};
  const sl=STATUS_LABEL[p.status]||STATUS_LABEL.prog; const lab=sl[0], cls=sl[1];
  const det=(window.S27DATA && S27DATA.detail(id))||null;
  const isVideo=(p.disc||'').indexOf('Video')===0;
  const needsFeedback=p.status==='wait';
  const chatClosed = (p.status==='done') || !!(window.S27DATA && S27DATA.isChatClosed && p._raw && S27DATA.isChatClosed(p._raw.status));
  const backTo=(typeof PANELS!=='undefined'&&PANELS[from])?from:((typeof takOfProject==='function')?takOfProject(p):'start');
  const backLabel=(backTo==='berichten')?'berichten'
    :(typeof TAK_TABS!=='undefined'&&TAK_TABS[backTo])?TAK_TABS[backTo].label
    :(backTo==='webprestaties')?'Website':'overzicht';
  // KRITIEK (Vincent/PFL): in LIVE NOOIT verzonnen onderdelen/taken. Deze mock-arrays zijn
  // UITSLUITEND de showcase voor het demo-portaal (?demo=1). In live starten ze leeg en worden
  // ze enkel gevuld met echte backend-data (det.deliverables/det.subtasks) hieronder.
  let SUBTASKS = !state.demoMode ? [] : isVideo ? [
    {t:'Montage',st:'wait',files:[['Montage v1, volledige film','MP4 · 02:14','video'],['Korte teaser (15s)','MP4 · 00:15','video']]},
    {t:'Fotografie',st:'wait',files:[['Still, openingsshot','JPG · hoge resolutie','img'],['Still, teamportret','JPG · hoge resolutie','img']]},
    {t:'Audio &amp; muziek',st:'done',files:[['Soundtrack, gelicentieerd','MP3','doc']]},
  ] : [
    {t:'Strategiedeck',st:'wait',files:[['Strategiedeck v1.pdf','PDF · 24 pagina\'s','doc']]},
    {t:'Vooronderzoek',st:'done',files:[['Marktanalyse.pdf','PDF · 12 pagina\'s','doc']]},
  ];
  let approved = !state.demoMode ? [] : isVideo ? ['Concept &amp; scenario','Locatie &amp; opnameplanning','Audio &amp; muziekselectie'] : ['Marktonderzoek &amp; analyse','Positioneringsworkshop'];
  // delivList = de deliverables met directe link (overzicht); approvedTasks = goedgekeurde taken (klikbaar mits bestanden)
  let delivList = state.demoMode ? null : [];   // null=demo (toont mock-deliverables); in LIVE start leeg -> nooit verzonnen deliverables
  let approvedTasks = null;   // [{naam, heeftBestanden, bestanden:[...]}]
  if(det){
    if(det.deliverables && det.deliverables.length){
      delivList = det.deliverables;
      SUBTASKS=[{t:'Bestanden',st:p.status==='done'?'done':'wait',files:det.deliverables.map(d=>[esc(d.label),esc((d.url||'').replace(/^https?:\/\//,'').slice(0,44)),d.type==='video'?'video':d.type==='img'?'img':'doc',esc(d.url||'')])}];
    } else if(det.subtasks && det.subtasks.length){
      SUBTASKS=det.subtasks.map(s=>({t:esc(s.naam),st:s.status==='done'?'done':'wait',files:[]}));
    } else { delivList = []; }
    if(det.subtasks && det.subtasks.length){
      approved=det.subtasks.filter(s=>s.status==='done').map(s=>esc(s.naam));
      approvedTasks=det.subtasks.filter(s=>s.status==='done').map(s=>({id:s.id, naam:s.naam, heeftBestanden:!!s.heeftBestanden, bestanden:s.bestanden||[]}));
    }
  }

  // Deliverables-blok in het overzicht: directe link + Feedback geven / Goedkeuren ernaast.
  // Meerdere video's/links => alle rijen onder elkaar. Geen aparte tab nodig.
  let delivBlock='';
  if(delivList!==null){
    if(delivList.length){
      const done = p.status==='done';
      delivBlock = `<div class="deliv-inline"><div class="subtask-files">${delivList.map(d=>deliverFileRow(d,{br:p.br,done:done,taskId:id})).join('')}</div></div>`;
    }
  } else {
    // demo-fallback: toon de mock-deliverables van de eerste subtaak met link-knoppen
    const mockFiles=(SUBTASKS[0]&&SUBTASKS[0].files)||[];
    delivBlock = `<div class="deliv-inline"><div class="subtask-files">${mockFiles.map(f=>deliverFileRow({label:f[0],url:f[3]||'',type:f[2]},{br:p.br,done:p.status==='done'})).join('')}</div></div>`;
  }
  const showDeliv = needsFeedback || (delivList && delivList.length) || (delivList===null);

  // Video-projecten: onderdelen per TYPE JOB (pre-productie/shoots/montage/nabewerking) i.p.v.
  // het generieke proces-overzicht. Valt automatisch terug zodra er geen TYPE JOB-data is.
  let detOnd = det;
  if(!detOnd && state.demoMode && p.discId==='video_fotografie') detOnd = demoVideoDet();
  if(!detOnd && state.demoMode && (p.discId==='branding'||p.discId==='strategie')) detOnd = demoAlgDet(p.discId);
  // Alle niet-video-takken delen exact de content-onderdelen-look (1:1 met branding/strategie):
  // geen aparte 'generieke' detailweergave meer met icoon-header + meeting-blok (Vincent 2026-06-14).
  // onderdelenBlokAlg geeft null terug zonder opleverbare subtaken -> dan valt 'ie veilig terug op
  // de (kop- en meetingloze) proces/deliverables-weergave hieronder.
  const OND = (p.discId==='video_fotografie') ? onderdelenBlok(detOnd, p)
            : onderdelenBlokAlg(detOnd, p);
  const hasProces = !!(det && det.proces && det.proces.aantal_stappen);
  // EERLIJKE LEGE-STAAT (Vincent/PFL): een LIVE-project zonder onderdelen, proces, deliverables,
  // feedback of goedgekeurde taken toont een nette lege boodschap i.p.v. een halflege/mock-sectie.
  // Nooit in demo (daar hoort de showcase) en nooit als er ECHTE data is.
  const _leegLive = !state.demoMode && !OND && !hasProces && !(delivList && delivList.length)
                    && !needsFeedback && !(approvedTasks && approvedTasks.length);
  // content-takken branding/strategie: nooit shoot/meeting-planning tonen (Vincent: 'geen meetings
  // aanvragen'). Als OND null is (project zonder subtaken) valt de generieke overview terug, maar
  // dan zonder scheduleBlock en zonder de plan-aankondiging in procesBlock (review v85 #5).
  const overview = OND ? `<div class="mpane active" data-mpane="overzicht"><div class="ond-wrap">${OND}</div></div>`
   : _leegLive ? `<div class="mpane active" data-mpane="overzicht"><div class="empty" style="padding:44px 18px;text-align:center"><div class="em-ic">${ic('st_approved',56)}</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Nog niets klaar voor jou</b><p style="margin:6px 0 0">Voor dit project staan nog geen onderdelen of bestanden klaar. Zodra er iets is, verschijnt het hier en laten we het je weten.</p></div></div>`
   : `<div class="mpane active" data-mpane="overzicht">
    ${procesBlock(det,p,{noPlan:true})}
    ${showDeliv?`<h4 style="font-family:var(--font-display);font-size:15px;margin:0 0 4px">${(delivList&&delivList.length>1)||(delivList===null)?'Jouw deliverables':'Jouw deliverable'}</h4>
    <p class="sdesc" style="margin:0 0 10px">Bekijk wat we voor je klaarzetten en laat meteen weten of je akkoord gaat of feedback hebt. Opmerkingen passen we volledig gratis aan.</p>
    ${delivBlock}`:''}
    ${hasProces?'':`<h4 style="font-family:var(--font-display);font-size:15px;margin:${showDeliv?'22px':'0'} 0 10px">Goedgekeurde taken</h4>
    <div class="approved-list">
      ${approvedTasks ? (approvedTasks.length?approvedTasks.map(approvedTaskRow).join(''):'<div class="fs" style="color:var(--ink-4)">Nog niets goedgekeurd.</div>')
        : approved.map(t=>`<div class="approved-row"><span class="check-circ">${ic('check',13)}</span><span>${t}</span></div>`).join('')}
    </div>`}
  </div>`;

  const deliverables=`<div class="mpane" data-mpane="deliverables">
    <h4 style="font-family:var(--font-display);font-size:15px;margin:18px 0 4px">Bestanden per onderdeel</h4>
    <p class="deliv-intro">Keur per stuk goed of geef feedback, we noteren er ook bij via welke weg je het doorgaf, zodat niets verloren gaat.</p>
    ${SUBTASKS.map((s,i)=>`
      <div class="accordion subtask">
        <button class="acc-head subtask-head ${i===0?'open':''}" onclick="toggleAcc(this)">
          <span class="subtask-ic ${s.st==='done'?'is-done':'is-wait'}">${ic(s.st==='done'?'st_approved':'st_feedback',16)}</span>
          <span class="subtask-t">${s.t}</span>
          <span class="subtask-meta">${s.st==='done'?'Goedgekeurd':s.files.length+' bestand'+(s.files.length===1?'':'en')}</span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="acc-body ${i===0?'open':''}"><div class="subtask-files">
          ${s.files.map(f=>`<div class="deliv-file" data-label="${f[0]}">
            <span class="df-ic">${ic(f[2]==='video'?'video':f[2]==='img'?'img':'doc',18)}</span>
            <div class="df-tx"><b>${f[0]}</b><span>${f[1]}</span></div>
            <div class="df-act">${s.st==='done'?spill('done'):`${f[3]?`<a class="btn btn-outline btn-sm" href="${f[3]}" target="_blank" rel="noopener">${ic('download',14)}</a>`:''}<button class="btn btn-outline btn-sm" onclick="fileFeedback(this)">Feedback</button><button class="btn btn-branch btn-sm br-green" onclick="fileApprove(this)">Goedkeuren</button>`}</div>
          </div>`).join('')}
        </div></div>
      </div>`).join('')}
  </div>`;

  // De algemene 'Feedback'-tab is verwijderd: feedback gebeurt per subtaak. De chat is een
  // eigen schermvullende sub-tab (zoals de socials-subnav) i.p.v. een smalle zijkolom.
  const d=DISC[p.disc]||{icon:'doc'};
  const fromCap=backLabel.charAt(0).toUpperCase()+backLabel.slice(1);
  // Bestanden-accordions enkel tonen als ze iets unieks toevoegen (subtaken-pad);
  // bij directe deliverables dekt het overzicht-blok alles al.
  const toonAccordions = !OND && !(delivList && delivList.length) && SUBTASKS.length;
  const startTab=(state._mtab==='chat')?'chat':'overzicht';
  const overviewPane=overview.replace('class="mpane active"', startTab==='overzicht'?'class="mpane active"':'class="mpane"');
  const chatWacht=!chatClosed && p.lastChat && p.lastChat.wacht;
  const chatPane=`<div class="mpane detail-chatpane${startTab==='chat'?' active':''}" data-mpane="chat">
      <div class="dc-head">${ic('msg',16)} Projectchat ${saeChatWho(det?det.sae:p.sae, chatClosed)}</div>
      <div class="dc-body" id="dcBody">${chatClosed?chatHTML(id,true):chatHTML(id)}</div>
      <div style="padding:8px 0 0"><button class="btn btn-ghost btn-sm" style="color:var(--s27-orange-ink)" onclick="dringendeVraag('${esc(p.id)}')">${ic('spark',14)} ${chatClosed?'Nog een vraag over dit project?':'Dringende vraag aan Ilke'}</button></div>
    </div>`;
  // Geen aparte detail-head meer: de projecttitel staat al in de topbar en content-details tonen
  // sowieso geen icoon/dubbele titel/status-kop. Zo ligt élk projectdetail 1:1 in lijn (Vincent 2026-06-14).
  return `<div class="detail detail--wide br-${p.br}">
    <div class="soc-subnav detail-subnav">
      <button class="soc-subtab${startTab==='overzicht'?' active':''}" data-mt="overzicht" onclick="switchModalTab('overzicht')">${ic('doc',15)} Overzicht</button>
      <button class="soc-subtab${startTab==='chat'?' active':''}" data-mt="chat" onclick="switchModalTab('chat')">${ic('msg',15)} Chat${chatWacht?'<span class="snav-dot"></span>':''}</button>
      <span class="detail-subnav-sep"></span>
      <button class="detail-close detail-close--innav" title="Terug naar ${backLabel}" aria-label="Terug naar ${backLabel}" onclick="${(typeof _isContentTak==='function'&&(_isContentTak(backTo)||backTo==='webprestaties'))?`markSkipAutoLand('${backTo}');`:''}goTab('${backTo}')">${ic('plus',22)}</button>
    </div>
    <div class="detail-body">${overviewPane}${toonAccordions?deliverables.replace('class="mpane"','class="mpane mpane-sub'+(startTab==='overzicht'?' active':'')+'"'):''}${chatPane}</div>
  </div>`;
}

/* =========================================================
   OVERLAYS (notif, chatbot, tour)
   ========================================================= */
function buildOverlays(){
  return `
  <!-- (de loader staat nu statisch als video-loader in index.html, #loader/#vidload) -->

  <!-- Notification panel -->
  <div class="notif-panel" id="notifPanel">
    <div class="notif-head"><h3>Meldingen</h3><button class="mark" onclick="markAllSeen()">Alles wissen</button></div>
    <div class="notif-list"></div>
  </div>

  <!-- Chatbot -->
  <button class="bot-fab" id="botFab" onclick="toggleBot()" aria-label="Hulp van Studio 27">${logo27(30)}</button>
  <div class="bot-panel" id="botPanel">
    <div class="bot-head"><div class="ba">${logo27(24)}</div><div><h3>Vraag het aan Studio 27</h3><div class="st"><i></i> direct antwoord op je vragen</div></div><button class="bclose" onclick="toggleBot()"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="bot-msgs" id="botMsgs"><div class="bmsg bot" id="botGreet">Hallo! Ik help je graag op weg. Waarmee kan ik je verder helpen?</div></div>
    <div class="bot-chips" id="botChips"><!-- dynamisch gevuld door renderBotChips() bij elke open -->
    </div>
    <div class="bot-input"><input id="botInput" placeholder="Typ je vraag…" onkeydown="if(event.key==='Enter')botSend()"><button class="chat-send" onclick="botSend()">${ic('send',18)}</button></div>
  </div>

  <!-- Onboarding tour -->
  <div class="tour-scrim" id="tourScrim"></div>
  <div class="spotlight" id="spotlight"></div>
  <div class="tour-dialog" id="tourDialog">
    <div class="tour-ic" id="tourIc"></div>
    <div class="tstep" id="tourStep">Stap 1 van 4</div>
    <h3 id="tourTitle"></h3>
    <p id="tourBody"></p>
    <div class="tour-foot">
      <div class="tour-dots" id="tourDots"></div>
      <div class="tour-nav">
        <button class="btn btn-outline btn-sm" id="tourPrev" onclick="tourNav(-1)">Vorige</button>
        <button class="btn btn-primary btn-sm" id="tourNext" onclick="tourNav(1)">Volgende</button>
      </div>
    </div>
    <button class="tour-skip" onclick="endTour(true)">De rondleiding niet meer tonen</button>
  </div>`;
}

/* =============================================================================
   WEBPRESTATIES (GA4 + Search Console), team-weergave v1, data via de gateway.
   ============================================================================= */
function webEnsureStyles(){
  if(document.getElementById('wp-styles')) return;
  var ink='#230F23', mut='#9E919E';
  var css=''
    +'.wp-grid{display:grid;gap:14px}'
    +'.wp-kpis{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}'
    +'.wp-kpi{background:#fff;border:1px solid rgba(231,223,211,.7);border-radius:16px;padding:16px 18px}'
    +'.wp-kpi .l{font:600 11px Montserrat,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:'+mut+'}'
    +'.wp-kpi .v{font:800 26px Montserrat,sans-serif;color:'+ink+';margin-top:4px;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    +'.wp-kpi .s{font:600 12px Nunito,sans-serif;color:'+mut+';margin-top:3px}'
    +'.wp-row{display:grid;grid-template-columns:1fr 1.4fr;gap:14px}'
    +'@media(max-width:820px){.wp-row{grid-template-columns:1fr}}'
    +'.wp-card{background:#fff;border:1px solid rgba(231,223,211,.7);border-radius:16px;padding:18px}'
    +'.wp-card h3{font:700 14px Montserrat,sans-serif;color:'+ink+';margin:0 0 12px}'
    +'.wp-ch{display:flex;align-items:center;gap:9px;margin:8px 0;font:600 12.5px Nunito,sans-serif}'
    +'.wp-ch .bar{height:9px;border-radius:6px;background:#3083DC;flex:0 0 auto;min-width:6px}'
    +'.wp-ch .nm{flex:1;color:#4a3f4a}'
    +'.wp-ch .n{font-weight:800;color:'+ink+'}'
    +'.wp-tbl{width:100%;border-collapse:collapse;font:600 12.5px Nunito,sans-serif}'
    +'.wp-tbl th{text-align:left;font:700 10.5px Montserrat,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:'+mut+';padding:6px 8px;border-bottom:1px solid rgba(231,223,211,.8)}'
    +'.wp-tbl td{padding:7px 8px;border-bottom:1px solid rgba(231,223,211,.5);color:'+ink+'}'
    +'.wp-tbl td.r,.wp-tbl th.r{text-align:right;white-space:nowrap}'
    +'.wp-per{display:inline-flex;gap:5px;margin:0;padding:5px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.74),rgba(255,255,255,.40));-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);border:1px solid rgba(255,255,255,.6);box-shadow:0 8px 24px rgba(60,40,80,.10),inset 0 1px 0 rgba(255,255,255,.75)}'
    +'.wp-perrow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 16px;position:sticky;top:60px;z-index:8}'
    +'.wp-perrow .wp-support{margin-left:auto;flex:none}'
    +'.wp-per button{font:700 12px Montserrat,sans-serif;border:0;background:transparent;color:#6B5B6B;border-radius:999px;padding:7px 15px;cursor:pointer;transition:color .18s,background .18s}'
    +'.wp-per button:hover{color:'+ink+'}'
    +'.wp-per button.on{background:linear-gradient(180deg,#fff,#f7f3ec);color:'+ink+';box-shadow:0 2px 8px rgba(35,15,35,.13),inset 0 1px 0 #fff}'
    +'.wp-canwrap{position:relative;height:240px}'
    +'.wp-li{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid rgba(231,223,211,.5);font:600 12.5px Nunito,sans-serif;color:'+ink+'}'
    +'.wp-li .u{color:#4a3f4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    +'.wp-li .n{font-weight:800;flex:0 0 auto}';
  var st=document.createElement('style'); st.id='wp-styles'; st.textContent=css; document.head.appendChild(st);
}
function _wpDay(ymd){ var m=String(ymd||'').match(/(\d{4})-?(\d{2})-?(\d{2})/); return m?(m[3]+'/'+m[2]):String(ymd||''); }
function _wpNum(n){ return (Number(n)||0).toLocaleString('nl-BE'); }
function webPeriod(){ return state._webPeriod || 'last_30d'; }
// Periode-pills (Vandaag/7/30/90 dagen), nu in de menubalk (zoals Adverteren), niet meer in een aparte rij.
function webPeriodPills(){
  var p=webPeriod();
  var b=function(k,l){ return '<button class="'+(p===k?'on':'')+'" onclick="webSetPeriod(\''+k+'\')">'+l+'</button>'; };
  return '<div class="wp-per">'+b('today','Vandaag')+b('last_7d','7 dagen')+b('last_30d','30 dagen')+b('last_90d','90 dagen')+'</div>';
}
async function webSetPeriod(p){
  state._webPeriod=p;
  var host=document.getElementById('wpBody'); if(host) host.innerHTML='<div class="empty" style="padding:50px"><div class="brand-spinner" style="margin:0 auto"></div></div>';
  try{ if(window.S27DATA){ await Promise.all([S27DATA.loadWebTraffic({period:p}), S27DATA.loadWebSearch({period:p})]); } }catch(e){}
  if(typeof renderPanel==='function') renderPanel('webprestaties');
  webMountCharts();
  if(typeof syncUrl==='function') syncUrl();
}
function webMountCharts(){
  var t=(window.S27DATA&&S27DATA.webTraffic&&S27DATA.webTraffic())||null;
  if(!t||!t.linked) return;
  adsRichLoadChart().then(function(ok){ if(!ok||!window.Chart) return;
    var sp=t.split||{}; var spTot=(sp.paid||0)+(sp.organic||0)+(sp.direct||0)+(sp.overig||0);
    if(spTot>0 && document.getElementById('wp_split')) webBuildSplitChart(sp);   // geen lege doughnut tekenen
    webBuildTrendChart(t.trend||[]); });
}
function webBuildSplitChart(split){
  var cv=document.getElementById('wp_split'); if(!cv||!window.Chart) return;
  state._wpCharts=state._wpCharts||{};
  try{ if(state._wpCharts.split){ state._wpCharts.split.destroy(); } }catch(e){}
  var data=[split.paid||0, split.organic||0, split.direct||0, split.overig||0];
  state._wpCharts.split=new window.Chart(cv.getContext('2d'),{ type:'doughnut',
    data:{ labels:['Betaald','Organisch','Direct','Overig'], datasets:[{ data:data, backgroundColor:['#9441DB','#2ecd6f','#3083DC','#E7DFD3'], borderWidth:0 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'62%',
      plugins:{ legend:{ position:'bottom', labels:{ font:{family:'Montserrat',size:11,weight:'600'}, color:'#6B5B6B', boxWidth:12, padding:12, usePointStyle:true } } } } });
}
function webBuildTrendChart(trend){
  var cv=document.getElementById('wp_trend'); if(!cv||!window.Chart) return;
  state._wpCharts=state._wpCharts||{};
  try{ if(state._wpCharts.trend){ state._wpCharts.trend.destroy(); } }catch(e){}
  var d=trend||[]; var labels=d.map(function(x){return _wpDay(x.date);}); var ses=d.map(function(x){return x.sessions||0;});
  state._wpCharts.trend=new window.Chart(cv.getContext('2d'),{ type:'line',
    data:{ labels:labels, datasets:[{ label:'Sessies', data:ses, borderColor:'#3083DC', backgroundColor:'rgba(48,131,220,.12)', borderWidth:2, fill:true, tension:.32, pointRadius:0 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{ y:{ beginAtZero:true, ticks:{ font:{family:'Montserrat',size:10}, color:'#9E919E', precision:0 }, grid:{ color:'rgba(231,223,211,.55)' } },
        x:{ ticks:{ font:{family:'Montserrat',size:10}, color:'#9E919E', maxRotation:0, autoSkip:true, maxTicksLimit:10 }, grid:{ display:false } } } } });
}
// Nette, uniforme "geen connectie"-melding (Vincent 2026-06-13, herzien): de tabs/knoppen blijven
// altijd staan; staat er geen koppeling, dan tonen we DIT i.p.v. lege/kapotte statistieken.
function statNotLinked(kind){
  var M={
    web:    ['Nog geen connectie met je websitestatistieken', 'Zodra we je Google Analytics &amp; Search Console koppelen, zie je hier je bezoekers, verkeersbronnen en zoektermen.'],
    socials:['Nog geen connectie met je socials',             'Zodra je social-kanalen aan het portaal gekoppeld zijn, zie je hier je planning, analyse en inzichten.'],
    ads:    ['Nog geen connectie met je advertenties',         'Zodra je advertentieaccount (Meta of Google) gekoppeld is, zie je hier real-time je campagnes en cijfers.']
  }; var m=M[kind]||M.web;
  return '<div class="card" style="padding:30px 26px;text-align:center">'
    +'<div style="width:46px;height:46px;border-radius:50%;background:var(--paper-3,#F1EBE2);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:var(--ink-4)">'+ic('st_progress',22)+'</div>'
    +'<div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">'+m[0]+'</div>'
    +'<div style="color:var(--ink-3);max-width:460px;margin:0 auto;line-height:1.55">'+m[1]+' Vraag gerust je contactpersoon bij Studio&nbsp;27.</div></div>';
}
function webTakTab(){
  if(state._webTakTab) return state._webTakTab;
  return _webProjects().some(function(p){return p.status!=='done';}) ? 'projecten' : 'stats';
}
function webSetTakTab(t){ state._webTakTab=t; renderPanel('webprestaties'); if(typeof syncUrl==='function') syncUrl(); }
function webTakSubnav(){
  var t=webTakTab();
  var mk=function(key,label,icn){ return '<button class="soc-subtab'+(t===key?' active':'')+'" onclick="webSetTakTab(\''+key+'\')">'+ic(icn,17)+'<span>'+label+'</span></button>'; };
  // op de Statistieken-tab staan de periode-pills + Support rechts in de menubalk (uniform met Adverteren)
  var act=(t==='stats')
    ? '<div class="soc-subnav-act">'+webPeriodPills()+'<button class="soc-subnav-act-btn" onclick="openWebTicket()" title="Vraag of probleem met je website?">'+ic('msg',16)+'<span>Support</span></button></div>'
    : '';
  return '<div class="soc-subnav-row"><div class="soc-subnav" id="webTakNav">'+mk('projecten','Projecten','doc')+mk('stats','Statistieken','st_progress')+'</div>'+act+'</div>';
}
function panelWebprestaties(){
  webEnsureStyles();
  // sub-sectie 'Projecten' (webdesign + support-tickets) boven de statistieken (Dakstructuur Q)
  if(webTakTab()==='projecten'){
    var T=TAK_WEBSITE;
    var all=_webProjects();
    var actief=all.filter(function(p){return p.status!=='done';});
    // 1:1 met video & fotografie: vlakke chronologische lijst van lopende projecten (geen
    // clusters/contactkaart/plan-meeting/archief). Bij precies 1 lopend project landt goTab
    // meteen op het detail (zie portal.js).
    var lopend=actief.length?('<div class="vrij-lijst">'+actief.slice().sort(function(a,b){return (a.dateCreated||0)-(b.dateCreated||0);}).map(function(p){return videoProjRij(p,'webprestaties');}).join('')+'</div>')
      :'<div class="empty"><div class="em-ic"><img src="assets/icon-webdesign.svg" width="56" height="56" alt=""></div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Geen lopende website-projecten</b><p style="margin:6px 0 14px">Een nieuwe site of aanpassing nodig?</p><button class="btn btn-branch br-green" onclick="openOfferteWizard(\'website\')">'+ic('plus',15)+' Start een aanvraag</button></div>';
    return webTakSubnav()+webEditorCard()+lopend;
  }
  var head=webTakSubnav();
  var t=(window.S27DATA&&S27DATA.webTraffic&&S27DATA.webTraffic())||null;
  var s=(window.S27DATA&&S27DATA.webSearch&&S27DATA.webSearch())||null;
  if(t===null && s===null){
    // demo heeft geen webdata: meteen doorvallen naar de niet-gekoppeld-staat (geen eeuwige spinner)
    if(state.demoMode) return head+statNotLinked('web')+webSupportCard();
    return head+'<div class="empty" style="padding:70px 20px"><div class="brand-spinner" style="margin:0 auto 14px"></div><div style="font-family:var(--font-display);font-weight:700;color:#9E919E">Webdata laden…</div></div>';
  }
  if(!(t&&t.linked) && !(s&&s.linked)){
    // GOLF 6: alleen 'Nog geen connectie' als er ECHT geen GA4/GSC-config in D1 staat
    // (server antwoordde ok maar linked:false). Een transiente fout (error:true uit
    // data.js) krijgt een eerlijke probeer-opnieuw-melding i.p.v. de koppel-belofte.
    var isErr=(t&&t.error)||(s&&s.error);
    if(isErr){
      return head+'<div class="card" style="padding:30px 26px;text-align:center">'
        +'<div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">Je statistieken konden even niet geladen worden</div>'
        +'<div style="color:var(--ink-3);max-width:460px;margin:0 auto 14px;line-height:1.55">Dit ligt aan ons, niet aan jou. Probeer het zo opnieuw.</div>'
        +'<button class="btn btn-outline btn-sm" onclick="state.data.webTraffic=null;state.data.webSearch=null;goTab(\'webprestaties\')">Opnieuw proberen</button></div>'
        +webSupportCard();
    }
    return head+statNotLinked('web')+webSupportCard();
  }
  return head+'<div id="wpBody">'+webBody(t,s)+'</div>';
}
function webBody(t,s){
  t=t||{}; s=s||{};
  var tot=t.totals||{}, split=t.split||{};
  var totalSes=((split.paid||0)+(split.organic||0)+(split.direct||0)+(split.overig||0))||tot.sessions||0;
  var paidPct=totalSes>0?Math.round((split.paid||0)/totalSes*100):0;
  var st=s.totals||{}; var topQ=(s.queries&&s.queries[0])?s.queries[0].query:'-';
  var kpis='<div class="wp-grid wp-kpis" style="margin-bottom:14px">'
    +'<div class="wp-kpi"><div class="l">Sessies</div><div class="v">'+_wpNum(tot.sessions||totalSes)+'</div><div class="s">'+_wpNum(tot.users||0)+' gebruikers</div></div>'
    +'<div class="wp-kpi"><div class="l">Betaald verkeer</div><div class="v">'+paidPct+'%</div><div class="s">'+_wpNum(split.paid||0)+' sessies via ads</div></div>'
    +'<div class="wp-kpi"><div class="l">Organische clicks</div><div class="v">'+_wpNum(st.clicks||0)+'</div><div class="s">'+_wpNum(st.impressions||0)+' vertoningen in Google</div></div>'
    +'<div class="wp-kpi"><div class="l">Top zoekterm</div><div class="v" style="font-size:17px">'+esc(topQ)+'</div><div class="s">gem. positie '+((st.position||0).toFixed(1))+'</div></div>'
    +'</div>';
  // 'Verkeer per bron'-kaart ENKEL tonen als er effectief verkeersbron-data is (anders een lege/rare doughnut bij bv. ABW)
  var splitTot=(split.paid||0)+(split.organic||0)+(split.direct||0)+(split.overig||0);
  var splitCard=splitTot>0?'<div class="wp-card"><h3>Verkeer per bron</h3><div class="wp-canwrap"><canvas id="wp_split"></canvas></div></div>':'';
  var trendCard='<div class="wp-card"><h3>Sessies per dag</h3><div class="wp-canwrap"><canvas id="wp_trend"></canvas></div></div>';
  var charts=splitTot>0
    ? '<div class="wp-row" style="margin-bottom:14px">'+splitCard+trendCard+'</div>'
    : '<div style="margin-bottom:14px">'+trendCard+'</div>';
  var chans=(t.channels||[]).slice(0,8);
  var maxc=chans.reduce(function(a,c){return Math.max(a,c.sessions||0);},1);
  var chList=chans.map(function(c){ var w=Math.round((c.sessions||0)/maxc*120); return '<div class="wp-ch"><span class="bar" style="width:'+Math.max(w,6)+'px"></span><span class="nm">'+esc(c.channel)+'</span><span class="n">'+_wpNum(c.sessions)+'</span></div>'; }).join('');
  var lps=(t.landingPages||[]).slice(0,6).map(function(p){ return '<div class="wp-li"><span class="u">'+esc(p.page)+'</span><span class="n">'+_wpNum(p.sessions)+'</span></div>'; }).join('');
  var row2='<div class="wp-row" style="margin-bottom:14px">'
    +'<div class="wp-card"><h3>Kanalen</h3>'+(chList||'<div style="color:#9E919E">Geen data</div>')+'</div>'
    +'<div class="wp-card"><h3>Top landingspagina\'s</h3>'+(lps||'<div style="color:#9E919E">Geen data</div>')+'</div>'
    +'</div>';
  var qs=(s.queries||[]).slice(0,12);
  var qrows=qs.map(function(q){ return '<tr><td>'+esc(q.query)+'</td><td class="r">'+_wpNum(q.clicks)+'</td><td class="r">'+_wpNum(q.impressions)+'</td><td class="r">'+((q.ctr||0)*100).toFixed(1)+'%</td><td class="r">'+(q.position||0).toFixed(1)+'</td></tr>'; }).join('');
  var qtbl='<div class="wp-card"><h3>Zoektermen (Google Search Console)</h3>'
    +(qrows?('<table class="wp-tbl"><thead><tr><th>Zoekterm</th><th class="r">Clicks</th><th class="r">Vert.</th><th class="r">CTR</th><th class="r">Positie</th></tr></thead><tbody>'+qrows+'</tbody></table>'):'<div style="color:#9E919E">Geen zoekdata in deze periode</div>')
    +'</div>';
  return kpis+charts+row2+qtbl;   // periode-pills + Support staan nu in de menubalk (webTakSubnav)
}
/* Website-support (Cluster K): ticket-ingang onderaan de Website-tab, ook zichtbaar zonder GA4/GSC-koppeling. */
function webSupportCard(){
  return '<div class="wp-card" style="margin-top:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">'
    +'<div style="flex:1;min-width:200px"><h3 style="margin:0 0 4px">Hulp nodig met je website?</h3>'
    +'<div style="color:#6B5B6B;font:600 13px Nunito,sans-serif;line-height:1.5">Een bug, een aanpassing of een vraag over je site? Stuur ons een ticket, we pakken het op en je krijgt een melding zodra de status verandert.</div></div>'
    +'<button class="btn btn-branch br-green btn-sm" onclick="openWebTicket()">'+ic('msg',16)+' Ticket aanvragen</button></div>';
}
/* Instructievideo's over zelf je website aanpassen, Studio 27-brede set (tool-uitleg, GEEN klantdata).
   LEEG tot Vincent echte Vimeo/YouTube-URLs aanlevert; een lege lijst rendert niets (geen dode links). */
const WEB_INSTRUCTIE_VIDEOS = [
  // { titel:'Tekst aanpassen op een pagina', duur:'2:14', url:'https://...' },
];
/* Website-editor-blok: knop naar de site-editor van de klant (bedrijf-veld 'Website editor link',
   doorgegeven door de worker als dashboard.website_editor_link) + de gecentraliseerde instructievideo's.
   De knop verschijnt ENKEL als de klant een editor-link heeft (nooit een dode knop); het hele blok
   verdwijnt als er geen link én geen video's zijn. */
function webEditorCard(){
  var d=(state.data&&state.data.dashboard)||null;
  var link=(d&&d.website_editor_link)?String(d.website_editor_link).trim():'';
  var vids=(typeof WEB_INSTRUCTIE_VIDEOS!=='undefined'&&WEB_INSTRUCTIE_VIDEOS.length)?WEB_INSTRUCTIE_VIDEOS:[];
  if(!link && !vids.length) return '';
  var btn=link?'<a class="btn btn-branch br-green btn-sm" href="'+esc(link)+'" target="_blank" rel="noopener">'+ic('website',16)+' Open je website-editor</a>':'';
  var vlist=vids.length?('<div style="margin-top:'+(btn?'14px':'2px')+';display:flex;flex-direction:column">'+vids.map(function(v){
    return '<a href="'+esc(v.url||'#')+'" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:9px 2px;border-top:1px solid rgba(231,223,211,.6);color:var(--ink-2);font:600 13px Nunito,sans-serif;text-decoration:none">'+ic('play',15)+'<span style="flex:1">'+esc(v.titel||'Instructievideo')+'</span>'+(v.duur?'<span style="color:#9E919E">'+esc(v.duur)+'</span>':'')+ic('arrow',14)+'</a>';
  }).join('')+'</div>'):'';
  return '<div class="wp-card" style="margin-bottom:14px"><h3 style="margin:0 0 4px">Je website beheren</h3>'
    +'<div style="color:#6B5B6B;font:600 13px Nunito,sans-serif;line-height:1.5;margin-bottom:'+((btn||vlist)?'12px':'0')+'">Pas zelf snel iets aan op je site, of bekijk hoe het werkt.</div>'
    +btn+vlist+'</div>';
}

/* ---- panel registry ---- */
/* ============================================================================
   AI-VRAGEN (team-only monitoring) — observeer wat klanten aan de assistent vroegen.
   Enkel zichtbaar voor staff (sb-admin + admin-mode). Leest botLogList (staff-gated),
   gescoped op het acting-as-bedrijf. Puur observatie/analyse, geen reactie van hieruit.
   ============================================================================ */
var _AIV_INTENT_LABELS={taken:'Taken',meeting:'Meetings',feedback:'Feedback',facturatie:'Facturatie',socials:'Socials',adverteren:'Adverteren',website:'Website',status:'Status',contact:'Contact',groet:'Begroeting',dank:'Bedankt',overig:'Overig / off-topic'};
function panelAiVragen(){
  return '<div class="section-head"><h2>AI-vragen</h2></div>'
    +'<p class="fs" style="color:var(--ink-3);margin:-4px 0 16px;max-width:640px">Wat deze klant aan de AI-assistent vroeg. Puur ter observatie en analyse: welke info missen klanten, wat zijn de veelgestelde vragen. Je reageert hier niet, dit is enkel voor het team.</p>'
    +'<div id="aivBody"><div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Vragen worden opgehaald…</p></div></div>';
}
async function aiVragenMount(){
  var box=document.getElementById('aivBody'); if(!box) return;
  if(state.demoMode){ box.innerHTML=_aivRender(_aivDemoVragen(), {meeting:1,feedback:1,website:1,overig:1,taken:1}, 5); return; }
  try{
    var res=await api(ENDPOINTS.botLogList, { bedrijf_id: state.activeBedrijf || ((state.session&&state.session.bedrijf_id)||'') });
    var d=(res&&res.data)||res||{};
    if(!d || d.ok!==true){ box.innerHTML='<div class="empty" style="padding:50px"><p>Deze monitoring is enkel voor het team beschikbaar.</p></div>'; return; }
    box.innerHTML=_aivRender(d.vragen||[], d.intents||{}, d.totaal||0);
  }catch(e){ box.innerHTML='<div class="empty" style="padding:50px"><p>De vragen konden even niet opgehaald worden. Probeer het zo opnieuw.</p></div>'; }
}
function _aivRender(vragen, intents, totaal){
  if(!vragen || !vragen.length) return '<div class="empty" style="padding:54px 16px;text-align:center"><div class="em-ic">'+ic('msg',40)+'</div><b style="font-family:var(--font-display);font-size:15px;color:var(--ink-2)">Nog geen vragen</b><p style="color:var(--ink-3);margin-top:5px">Zodra deze klant iets aan de assistent vraagt, verschijnt het hier.</p></div>';
  var order=Object.keys(intents||{}).sort(function(a,b){return intents[b]-intents[a];});
  var chips=order.map(function(k){ return '<span class="aiv-chip"><b>'+intents[k]+'</b> '+esc(_AIV_INTENT_LABELS[k]||k)+'</span>'; }).join('');
  var rows=vragen.map(function(v){
    var when=v.ts? new Date(v.ts).toLocaleString('nl-BE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
    return '<div class="aiv-row"><div class="aiv-q">'+esc(v.vraag||'')+'</div><div class="aiv-meta"><span class="aiv-tag">'+esc(_AIV_INTENT_LABELS[v.intent]||v.intent||'overig')+'</span><span class="aiv-when">'+esc(when)+'</span></div></div>';
  }).join('');
  return '<div class="aiv-stats"><span class="aiv-tot">'+totaal+' '+(totaal===1?'vraag gesteld':'vragen gesteld')+'</span>'+(chips?('<div class="aiv-chips">'+chips+'</div>'):'')+'</div><div class="aiv-list">'+rows+'</div>';
}
function _aivDemoVragen(){ var n=Date.now(); return [
  {vraag:'Wanneer is mijn volgende meeting?',intent:'meeting',ts:n-3600e3},
  {vraag:'Hoe geef ik feedback op de montage?',intent:'feedback',ts:n-7200e3},
  {vraag:'Wat is de status van mijn website?',intent:'website',ts:n-86400e3},
  {vraag:'Kunnen jullie ook een logo maken?',intent:'overig',ts:n-90000e3},
  {vraag:'Wat staat er voor mij klaar?',intent:'taken',ts:n-180000e3}
]; }
const PANELS={
  start:panelStart, berichten:panelBerichten,
  strategie:function(){return panelTak('strategie');}, branding:function(){return panelTak('branding');}, video:function(){return panelTak('video');},
  socials:panelSocials, advertenties:panelAdvertenties, webprestaties:panelWebprestaties, 'alle-projecten':panelAlleProjecten,
  meetings:panelMeetings, nieuwproject:panelOffertes, offertes:panelOffertes,
  huisstijl:panelHuisstijl, facturatie:panelFacturatie, instellingen:panelInstellingen, aivragen:panelAiVragen,
};
const TAB_BRANCH={start:'blue',berichten:'blue',strategie:'blue',branding:'pink',video:'purple',socials:'yellow',advertenties:'orange',webprestaties:'green','alle-projecten':'blue',meetings:'blue',nieuwproject:'blue',offertes:'purple',huisstijl:'pink',facturatie:'green',instellingen:'indigo',aivragen:'indigo'};
const TAB_GROUP={projecten:'werk',socials:'werk',advertenties:'werk',webprestaties:'werk','alle-projecten':'werk',meetings:'plannen',nieuwproject:'plannen',offertes:'plannen',huisstijl:'bedrijf',facturatie:'bedrijf',instellingen:'bedrijf'};
