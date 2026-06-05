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
};
const ic = (n,w=20)=>`<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const logo27 = (w=28)=>`<svg class="logo27" viewBox="782 34 210 130" width="${w}" height="${Math.round(w*0.62)}" fill="currentColor" aria-hidden="true"><path d="M788.07,158.63v-24.58l42.88-39.66c2.71-2.6,4.71-4.86,6.02-6.78,1.3-1.92,2.17-3.64,2.63-5.17,.45-1.52,.68-2.97,.68-4.32,0-2.94-.96-5.22-2.88-6.86-1.92-1.64-4.8-2.46-8.64-2.46-3.5,0-6.84,.93-10,2.8-3.16,1.86-5.65,4.61-7.46,8.22l-30.17-15.08c4.29-8.13,10.73-14.74,19.32-19.83,8.59-5.09,19.26-7.63,32.03-7.63,9.38,0,17.68,1.53,24.91,4.58,7.23,3.05,12.88,7.35,16.95,12.88,4.07,5.54,6.1,12.09,6.1,19.66,0,3.84-.48,7.68-1.44,11.52-.96,3.84-2.91,7.88-5.85,12.12-2.94,4.24-7.29,8.96-13.05,14.15l-32.2,29.32-6.27-13.9h61.52v31.01h-95.08Z"/><path d="M908.23,158.63l44.74-104.4,10.68,16.78h-56.27l15.59-18.13v35.42h-33.05V40h101.52v24.58l-39.49,94.06h-43.72Z"/></svg>`;
const squig = ()=>'';
const scribble = ()=>'';
/* 4 uniforme projectstatus-iconen (overal in het portaal) */
const STATUS_ICON = {todo:'st_plan',prog:'st_progress',wait:'st_feedback',sent:'st_feedback',done:'st_approved'};

const hero = (br,eyebrow,h1html,noCrumb)=>{
  // Op de homepage geen broodkruimel (geen "Portaal"-knop die meespringt bij navigatie).
  if(noCrumb){
    return `<div class="hero br-${br}">
      <h1 class="hero-h1">${h1html}</h1>
    </div>`;
  }
  let path=String(eyebrow).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  if(!/^portaal/i.test(path)) path='Portaal · '+path;
  const parts=path.split('·').map(s=>s.trim()).filter(Boolean);
  const CT={'Portaal':'start','Mijn werk':'projecten','Plannen':'meetings','Mijn bedrijf':'huisstijl','Onze diensten':'diensten'};
  const crumb=parts.map((p,i)=>{
    if(i===parts.length-1)return `<span class="hc-cur">${p}</span>`;
    return CT[p]?`<button class="hc hc-link" onclick="goTab('${CT[p]}')">${p}</button>`:`<span class="hc">${p}</span>`;
  }).join('<span class="hc-sep">›</span>');
  return `<div class="hero br-${br}">
    <nav class="hero-crumb">${crumb}</nav>
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
  {id:'p1',name:'Bedrijfsfilm "Onder één dak"',br:'purple',disc:'Video- en fotografie',status:'wait',deliv:true},
  {id:'p2',name:'Nieuwe website & webshop',br:'green',disc:'Website en SEO',status:'prog',deliv:false},
  {id:'p3',name:'Productfotografie najaarscollectie',br:'purple',disc:'Video- en fotografie',status:'sent',deliv:true},
  {id:'p4',name:'Merkstrategie & positionering 2026',br:'blue',disc:'Strategie',status:'prog',deliv:false},
  {id:'p5',name:'Google Ads, leadcampagne Q2',br:'orange',disc:'Online adverteren',status:'prog',deliv:false},
  {id:'p6',name:'Social contentkalender mei',br:'yellow',disc:'Social media',status:'done',deliv:false},
  {id:'p7',name:'Recruitmentvideo "Kom bij ons team"',br:'purple',disc:'Video- en fotografie',status:'todo',deliv:false},
  {id:'p8',name:'TikTok-campagne lentepromo',br:'orange',disc:'Online adverteren',status:'done',deliv:false},
];
const STATUS_LABEL = {todo:['Nog in te plannen','pill-todo'],prog:['In productie','pill-prog'],wait:['Klaar voor feedback','pill-wait'],sent:['Klaar voor feedback','pill-wait'],done:['Goedgekeurd','pill-done']};
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
};
const DISC_ORDER = ['Strategie','Branding','Video- en fotografie','Webdesign','Website en SEO','SEO & GEO','Social media','Online adverteren','Opleidingen','Automations'];
const discMark = (disc,cls='disc-stamp')=>{const d=DISC[disc];return d&&d.stamp?`<img class="${cls}" src="${ASSET[d.stamp]||('assets/'+d.stamp)}" alt="">`:ic((d&&d.icon)||'doc',20);};
const spill = (st)=>{const m=STATUS_LABEL[st]||STATUS_LABEL.prog;return `<span class="pill ${m[1]}">${ic(STATUS_ICON[st]||'st_progress',13)}<span>${m[0]}</span></span>`;};

/* ===== live-data brug (S27DATA) met mock-fallback ===== */
function _live(){ return !!(window.S27DATA && typeof state!=='undefined' && !state.demoMode && state.session); }
function _projects(){ const p = window.S27DATA && S27DATA.projects(); return (p && p.length!==undefined) ? p : PROJECTS; }
function _greetNaam(){ return (window.S27DATA && S27DATA.klantNaam && S27DATA.klantNaam()) || 'Sarah'; }
function _bedrijf(){ return (window.S27DATA && S27DATA.bedrijfsnaam && S27DATA.bedrijfsnaam()) || 'TEST CLIENT BV'; }
/* SA&E-namen kort tonen (geen foto-iconen). Geeft "" terug als er geen toegewezen teamleden zijn. */
function saeNames(sae){
  if(!sae || !sae.length) return '';
  const names=sae.map(function(s){ return esc(s.naam||''); }).filter(Boolean);
  if(!names.length) return '';
  return `${ic('person',12)}<span>${names.join(', ')}</span>`;
}
// chat-header: toon met wie de klant chat (naam + initialen-avatar van de SA&E van de taak)
function saeChatWho(sae, closed){
  if(closed) return '<span class="dc-sub">afgerond</span>';
  if(sae && sae.length){
    const s=sae[0]; const extra=sae.length>1?(' +'+(sae.length-1)):'';
    return `<span class="dc-who"><span class="dc-av">${esc(s.initialen||'S2')}</span><span class="dc-sub">met ${esc(s.naam)}${extra}</span></span>`;
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
  {br:'purple',cat:'Video- en fotografie',title:'Review nodig',ctx:'De eerste montage van je bedrijfsfilm <b>"Onder één dak"</b> staat klaar. Geef je akkoord of je feedback.',cta:'Bekijk montage',action:"openProject('p1')",tag:'vandaag',urgent:true,icon:'st_feedback'},
  {br:'blue',cat:'Strategie',title:'Feedback gevraagd',ctx:'We willen je input op de <b>positionering</b> voor 2026 voor we verder bouwen.',cta:'Geef feedback',action:"openProject('p4')",tag:'deze week',urgent:false,icon:'st_feedback'},
  {br:'orange',cat:'Online adverteren',title:'Rapport inplannen',ctx:'Tijd om de <b>resultaten van je campagnes</b> samen te bekijken. Prik een moment dat jou past.',cta:'Plan in',action:"goTab('meetings')",tag:'mei',urgent:false,icon:'st_plan'}
];
const _RUN_MOCK = [{br:'green',disc:'Website en SEO',name:'Nieuwe website & webshop',pct:62,status:'prog',label:'In productie'},{br:'blue',disc:'Strategie',name:'Merkstrategie 2026',pct:40,status:'wait',label:'Klaar voor feedback'},{br:'orange',disc:'Online adverteren',name:'Leadcampagne Q2',pct:78,status:'prog',label:'Live'}];
const _DONE_MOCK = [{br:'yellow',name:'Contentkalender mei',disc:'Social media',when:'2 dagen geleden'},{br:'orange',name:'TikTok lentepromo',disc:'Online adverteren',when:'5 dagen geleden'},{br:'purple',name:'Sfeerreportage event',disc:'Video- en fotografie',when:'vorige week'}];
function _cockpitCard(a){
  return `<div class="action-card ${a.urgent?'urgent':''} br-${a.br}">
    <div class="ac-top"><div class="ac-ico">${ic(a.icon||'st_feedback',19)}</div><div class="ac-titles"><span class="ac-cat">${esc(a.cat)}</span><h4>${esc(a.title)}</h4></div></div>
    <p class="ac-ctx">${a.ctx}</p>
    <div class="ac-foot"><button class="btn btn-branch btn-sm br-${a.br}" onclick="${a.action}">${esc(a.cta)}</button></div>
  </div>`;
}
function _runRow(r){ const sae=saeNames(r.sae); return `<button class="run-row br-${r.br}" onclick="${r.id?`openProject('${esc(r.id)}','projecten')`:`goTab('projecten')`}"><div class="run-top"><span class="run-dot"></span><span class="run-disc">${esc(r.disc)}</span><span class="pill pill-${r.status}">${ic(STATUS_ICON[r.status]||'st_progress',12)}<span>${esc(r.label)}</span></span></div><b class="run-name">${esc(r.name)}</b>${sae?`<span class="sae-line">${sae}</span>`:''}<div class="run-prog"><div class="rp-bar"><i style="width:${r.pct||0}%"></i></div><span class="rp-pct">${r.pct||0}%</span></div></button>`; }
function _doneRow(d){
  const meta=[esc(d.disc), (d.when&&typeof d.when==='string')?esc(d.when):''].filter(Boolean).join(' · ');
  const sae=saeNames(d.sae);
  const inner=`<span class="check-circ">${ic('check',13)}</span><div class="done-main"><b>${esc(d.name)}</b><span class="done-meta">${meta}</span>${sae?`<span class="sae-line">${sae}</span>`:''}</div><span class="run-dot"></span>`;
  // klikbaar als de afgeronde taak een project-id heeft (opent het detail; bestanden zichtbaar indien aanwezig)
  if(d.id) return `<button class="done-row br-${d.br}" style="width:100%;text-align:left;border:none;cursor:pointer;background:none" onclick="openProject('${esc(d.id)}','projecten')">${inner}</button>`;
  return `<div class="done-row br-${d.br}">${inner}</div>`;
}
function panelStart(){
  const cock = window.S27DATA && S27DATA.cockpit();
  // live: echte data (geen mock-fallback voor "Recent afgerond"); demo: mock voor de showcase
  const liveStart = _live();
  const run  = (window.S27DATA && S27DATA.running()) || (liveStart?[]:_RUN_MOCK);
  const done = liveStart ? ((window.S27DATA && S27DATA.done()) || []) : _DONE_MOCK;
  const head = hero('blue', _bedrijf(), `Welkom terug, <span class="accent">${esc(_greetNaam())}</span>`, true);
  // Voor jou te doen
  let cockHtml;
  if(cock){
    cockHtml = cock.length
      ? `<div class="section-head"><h2>Voor jou te doen</h2><span class="count">${cock.length} ${cock.length===1?'item':'items'}</span></div><div class="cockpit-row">${cock.map(_cockpitCard).join('')}</div>`
      : `<div class="empty" style="margin-top:24px"><div class="em-ic">${ic('st_approved',64)}</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Alles is bij!</b><p style="margin:6px 0 0">Er staat momenteel niets op jou te wachten, wij werken ondertussen verder.</p></div>`;
  } else {
    cockHtml = `<div class="section-head"><h2>Voor jou te doen</h2><span class="count">${_COCKPIT_MOCK.length} items</span></div><div class="cockpit-row">${_COCKPIT_MOCK.map(_cockpitCard).join('')}</div>`;
  }
  // "Recent afgerond" (afgerond_60d) enkel tonen als er items zijn, geen mock-fallback, geen lege kolom
  const doneCol = done.length ? `
    <div class="ov-col">
      <div class="ov-head"><span class="pill pill-done"><span class="pdot"></span>Recent afgerond</span><span class="ov-n">${done.length}</span></div>
      <div class="done-list">${done.map(_doneRow).join('')}</div>
    </div>` : '';
  return head + cockHtml + `
  <div class="section-head"><h2>Jouw projecten</h2><button class="count linkish" onclick="goTab('projecten')">Naar Actieve projecten ${ic('arrow',13)}</button></div>
  <div class="proj-overview${doneCol?'':' one-col'}">
    <div class="ov-col">
      <div class="ov-head"><span class="pill pill-prog"><span class="pdot"></span>Loopt nu</span><span class="ov-n">${run.length}</span></div>
      <div class="run-list">${run.length?run.map(_runRow).join(''):'<div class="empty" style="padding:24px"><p>Geen lopende projecten.</p></div>'}</div>
    </div>${doneCol}
  </div>`;
}

// svc-kaart-key -> de bijhorende npDienst-optie (zodat het offerteformulier de dienst voorselecteert).
// Branding/SEO/Opleiding hebben (nog) geen prijsopties in NP_OPTIONS -> dan enkel naar Offertes navigeren.
const SVC_TO_NPDIENST = { strategie:'Strategie', video:'Video- en fotografie', website:'Website & SEO', seo:'Website & SEO', ads:'Online adverteren', social:'Social media' };
function goDienstOfferte(key){
  goTab('offertes');
  const dienst=SVC_TO_NPDIENST[key]; if(!dienst) return;
  setTimeout(function(){
    const sel=document.getElementById('npDienst'); if(!sel) return;
    for(var i=0;i<sel.options.length;i++){ if(sel.options[i].value===dienst || sel.options[i].text===dienst){ sel.selectedIndex=i; break; } }
    if(typeof npDienst==='function') npDienst();
    const card=document.querySelector('.npform'); if(card&&card.scrollIntoView) card.scrollIntoView({behavior:'smooth',block:'center'});
  },80);
}
function panelDiensten(){
  const act=SERVICES.filter(svcActive), inact=SERVICES.filter(s=>!svcActive(s));
  return hero('blue','Onze diensten', `Onze diensten <span class="accent">voor jou${squig()}</span>`)
  + (act.length?`<div class="section-head" style="margin-top:8px"><h2>Actief</h2><span class="count">${act.length} ${act.length===1?'dienst':'diensten'}</span></div><div class="svc-grid">${act.map(svcCard).join('')}</div>`:'')
  + (inact.length?`<div class="section-head" style="margin-top:36px"><h2>Niet actief</h2><span class="count">${inact.length}</span></div><p style="color:var(--ink-3);font-size:13.5px;margin:-6px 0 18px;max-width:60ch">Diensten die we nu (nog) niet voor je doen. Interesse? Vraag vrijblijvend een offerte aan, geen verplichtingen.</p><div class="svc-grid">${inact.map(svcCard).join('')}</div>`:'');
}

function berichtChatInner(p){
  return `<div style="padding:18px 22px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:11px">
    <span class="ber-dot" style="background:var(--c)"></span>
    <div style="min-width:0"><b style="font-family:var(--font-display);font-size:15px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</b><span class="fs" style="color:var(--ink-4)">${esc(p.disc||'')}</span></div>
    <button class="btn btn-ghost btn-sm br-${p.br}" style="margin-left:auto;flex:none" onclick="openProject('${esc(p.id)}','berichten')">Open project ${ic('arrow',14)}</button>
  </div><div style="padding:18px 22px">${chatHTML(p.id)}</div>`;
}
function panelBerichten(){
  const projs=_projects(); const first=projs[0];
  const rows = projs.map((p,idx)=>`
        <button class="proj-row br-${p.br} bericht-row" data-bid="${esc(p.id)}" style="border:none;border-radius:0;box-shadow:none;border-bottom:1px solid var(--line);${idx===0?'background:var(--paper-2)':''}" onclick="openBerichtChat('${esc(p.id)}',this)">
          <span class="ber-dot" style="background:var(--c)"></span>
          <span class="pr-main"><span class="ber-disc" style="color:var(--c-ink)">${esc(p.disc)}</span><span class="pr-name" style="font-size:14px">${esc(p.name)}</span></span>
          ${p.deliv?`<span class="badge" style="position:static;background:var(--c);color:#fff;border:none;min-width:20px;height:20px;font-size:11px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800">!</span>`:''}
        </button>`).join('');
  return hero('blue','Berichten', `Even <span class="accent">bijpraten${squig()}</span>?`)
  +`<p class="sdesc" style="margin:-4px 0 14px;max-width:60ch">Klik links een project aan en chat er meteen over, je blijft op deze pagina, enkel het gesprek wisselt. Je kan ook bestanden meesturen.</p>
  <div style="display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start" class="berichten-wrap">
    <div class="card" style="overflow:hidden">${rows||'<div class="empty" style="padding:30px"><p>Nog geen gesprekken.</p></div>'}</div>
    <div class="card br-${first?first.br:'blue'}" id="berichtChat" style="padding:0;overflow:hidden">
      ${first?berichtChatInner(first):'<div class="empty" style="padding:60px 20px"><div class="em-ic">'+ic('msg',64)+'</div><p>Selecteer links een project om het gesprek te openen.</p></div>'}
    </div>
  </div>`;
}

function projDienst(){
  // ENKEL open projecten (goedgekeurde/afgeronde niet), kolommen per tak, projectdetails eronder
  const projs=_projects().filter(p=>p.status!=='done'); const groups={};
  projs.forEach(p=>{ (groups[p.disc]=groups[p.disc]||[]).push(p); });
  const keys=Object.keys(groups).sort((a,b)=>{ const ia=DISC_ORDER.indexOf(a),ib=DISC_ORDER.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib); });
  const html=keys.map(disc=>{
    const items=groups[disc]; const d=DISC[disc]||{br:items[0].br||'blue'};
    return `<div class="dienst-col br-${d.br||items[0].br||'blue'}" data-disc="${esc(disc)}">
      <div class="dienst-head"><span class="dienst-ic">${discMark(disc)}</span><h3>${esc(disc)}</h3><span class="dienst-n">${items.length}</span></div>
      <div class="proj-list">${items.map(projCardCol).join('')}</div>
    </div>`;
  }).join('');
  return html ? `<div class="dienst-cols">${html}</div>` : `<div class="empty"><div class="em-ic">${ic('st_approved',64)}</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Geen actieve projecten</b><p style="margin:6px 0 0">Zodra we samen aan iets nieuws starten, verschijnt het hier.</p></div>`;
}
// projectkaart binnen een tak-kolom: naam, status, deliverable-badge, SA&E-namen (geen foto-iconen)
function projCardCol(p){
  const sae=saeNames(p.sae);
  return `<button class="projcol-card br-${p.br}" data-status="${p.status}" onclick="openProject('${esc(p.id)}','projecten')">
    <span class="pc-name">${esc(p.name)}</span>
    ${sae?`<span class="sae-line">${sae}</span>`:''}
    <span class="pc-foot">${spill(p.status)}${p.deliv?`<span class="pc-deliv">${ic('download',13)} klaar</span>`:''}</span>
  </button>`;
}
function panelProjecten(){
  const order=[]; _projects().filter(p=>p.status!=='done').forEach(p=>{ if(order.indexOf(p.disc)<0) order.push(p.disc); });
  order.sort((a,b)=>{ const ia=DISC_ORDER.indexOf(a),ib=DISC_ORDER.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib); });
  return hero('blue','Mijn werk · Actieve projecten',
    `Jouw <span class="accent">actieve${squig()}</span> projecten`)
  +`<div class="proj-filter">
      <label class="pf-select">${ic('strategie',16)}
        <select onchange="filterDienst(this.value)">
          <option value="all">Alle takken</option>
          ${order.map(disc=>`<option value="${disc}">${disc}</option>`).join('')}
        </select>
        <svg class="pf-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </label>
    </div>
    <div id="projViewBody">${projDienst()}</div>`;
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
function mcStyleOnce(){ return $id('mcStyle')?'':('<style id="mcStyle">'
  +'.soc-matrix{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:4px 0 16px}.soc-mcard{position:relative;text-align:left;background:var(--paper,#fff);border:1px solid var(--line);border-radius:16px;padding:16px 16px 14px 20px;cursor:pointer;overflow:hidden;transition:box-shadow .15s,transform .15s}.soc-mcard:hover{box-shadow:0 8px 22px rgba(60,40,80,.09);transform:translateY(-2px)}.soc-mcard.active{border-color:var(--c)}.soc-mbar{position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--c)}.soc-mnum{font-family:var(--font-display);font-weight:900;font-size:30px;line-height:1;color:var(--ink)}.soc-mlab{font-family:var(--font-body);font-weight:700;font-size:13px;color:var(--ink-3);margin-top:5px}@media(max-width:680px){.soc-matrix{grid-template-columns:1fr}}'
  +'.soc-fbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}.soc-fchip{font-family:var(--font-display);font-weight:700;font-size:12.5px;color:var(--ink-3);background:var(--paper-2,#FAF7F2);border:1px solid var(--line);padding:7px 13px;border-radius:999px;cursor:pointer;transition:all .15s}.soc-fchip:hover{border-color:var(--s27-yellow,#F2C14E)}.soc-fchip.active{background:var(--ink,#230F23);border-color:var(--ink);color:#fff}'
  +'.soc-nav{display:flex;gap:6px}.soc-nav button{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--paper,#fff);color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}.soc-nav button:first-child svg{transform:rotate(180deg)}.soc-nav button:hover{border-color:var(--s27-yellow,#F2C14E);color:var(--ink)}'
  +'.soc-cal{background:var(--paper,#fff);border:1px solid var(--line);border-radius:18px;padding:12px}.soc-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px}.soc-dow span{font-family:var(--font-display);font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);text-align:center;padding:4px 0}.soc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.soc-cell{min-height:92px;background:var(--paper-2,#FAF7F2);border:1px solid var(--paper-3,#F1EBE2);border-radius:11px;padding:6px;display:flex;flex-direction:column;gap:4px}.soc-cell.soc-empty{background:transparent;border:none}.soc-cell.soc-today{border-color:var(--s27-yellow,#F2C14E);box-shadow:inset 0 0 0 1px var(--s27-yellow,#F2C14E)}.soc-daynum{font-family:var(--font-display);font-weight:800;font-size:12px;color:var(--ink-4)}.soc-chip{display:flex;align-items:center;gap:5px;width:100%;text-align:left;font-family:var(--font-body);font-weight:700;font-size:11px;color:var(--ink-2);background:#fff;border:1px solid var(--line);border-left:3px solid var(--cc,#667684);border-radius:7px;padding:3px 6px;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;transition:box-shadow .12s}.soc-chip:hover{box-shadow:0 3px 9px rgba(60,40,80,.12)}.soc-cdot{width:7px;height:7px;border-radius:99px;flex:none}@media(max-width:680px){.soc-cell{min-height:64px}.soc-chip{font-size:10px}}'
  +'.soc-detail{max-width:760px}.soc-back{display:inline-flex;align-items:center;gap:7px;font-family:var(--font-display);font-weight:700;font-size:13.5px;color:var(--ink-3);background:none;border:none;cursor:pointer;padding:6px 0;margin-bottom:8px}.soc-back svg{transform:rotate(180deg)}.soc-back:hover{color:var(--ink)}.soc-dcard{background:var(--paper,#fff);border:1px solid var(--line);border-radius:18px;overflow:hidden}.soc-dimg{width:100%;max-height:420px;object-fit:cover;display:block;background:var(--paper-3)}.soc-dbody{padding:20px 22px 22px}.soc-dmeta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}.soc-dtxt{white-space:pre-wrap;font-family:var(--font-body);font-size:15px;line-height:1.6;color:var(--ink-2)}.soc-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:700;font-size:12.5px;border-radius:999px;padding:4px 12px}.soc-net{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px}.soc-dact{margin-top:20px;padding-top:18px;border-top:1px dashed var(--paper-3,#F1EBE2)}.soc-fbok{display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--s27-green-ink,#147A50);background:var(--s27-green-soft,rgba(18,172,78,.10));border-radius:12px;padding:13px 15px}.soc-fbta{width:100%;box-sizing:border-box;font-family:var(--font-body);font-size:14px;padding:11px 13px;border:1px solid var(--line);border-radius:11px;outline:none;resize:vertical;margin-top:6px}.soc-fbta:focus{border-color:var(--s27-yellow,#F2C14E)}'
  +'</style>'); }
function socialNetChips(p){ return (p.netwerken||[]).map(function(nw){ var n=mcNet(nw.netwerk),st=mcStatus(nw.status); return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:'+n[1]+';background:'+n[1]+'14;border-radius:999px;padding:2px 9px">'+esc(n[0])+'<span style="width:6px;height:6px;border-radius:99px;background:'+st[1]+'"></span></span>'; }).join(' '); }
// een post is "goed te keuren" zolang die nog niet gepubliceerd/mislukt is (concept of gepland)
function mcApprovable(p){
  var ss=(p.netwerken||[]).map(function(n){return String(n.status||'').toUpperCase();});
  if(ss.some(function(s){return s.indexOf('PUBLISH')>=0;})) return false;   // al live
  return true;
}
// goedkeur-/feedbackblok per post (klant keurt geplande content goed of geeft notitie)
function socialApproveBlock(p){
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
  if(p.approved || (state._mcApproved && state._mcApproved[p.id])) return 'goedgekeurd';
  return 'feedback';
}
var SOC_STATUS={feedback:['Wacht op je feedback','#C44514','rgba(246,97,49,.13)','orange'],goedgekeurd:['Goedgekeurd','#147A50','rgba(18,172,78,.13)','green'],gepubliceerd:['Gepubliceerd','#1F5FA8','rgba(48,131,220,.13)','blue']};
function socialStatusMeta(st){ return SOC_STATUS[st]||SOC_STATUS.feedback; }
function socialPostsAll(){ if(state.demoMode) return socialDemoPosts(); var mc=(window.S27DATA&&S27DATA.metricool())||null; return (mc&&mc.posts)||[]; }
function socialMonth(){ if(!state._socialMonth){ var n=new Date(); state._socialMonth={y:n.getFullYear(),m:n.getMonth()}; } return state._socialMonth; }
function socialFilter(){ return state._socialFilter||'alles'; }
function socialMonthNav(d){ var mo=socialMonth(); var dt=new Date(mo.y,mo.m+d,1); state._socialMonth={y:dt.getFullYear(),m:dt.getMonth()}; renderPanel('socials'); }
function socialSetFilter(f){ state._socialFilter=f; renderPanel('socials'); }
function socialOpenDetail(id){ state._socialDetail=String(id); renderPanel('socials'); if(window.scrollTo)window.scrollTo({top:0,behavior:'smooth'}); }
function socialCloseDetail(){ state._socialDetail=null; renderPanel('socials'); }
function socialMatrixbar(posts){
  var c={feedback:0,goedgekeurd:0,gepubliceerd:0}; posts.forEach(function(p){ c[socialStatus(p)]++; });
  var cards=[['feedback','Wacht op je feedback',c.feedback,'orange'],['goedgekeurd','Goedgekeurd',c.goedgekeurd,'green'],['gepubliceerd','Gepubliceerd',c.gepubliceerd,'blue']];
  return '<div class="soc-matrix">'+cards.map(function(k){ var active=socialFilter()===k[0];
    return '<button class="soc-mcard br-'+k[3]+(active?' active':'')+'" onclick="socialSetFilter(\''+(active?'alles':k[0])+'\')"><div class="soc-mbar"></div><div class="soc-mnum">'+k[2]+'</div><div class="soc-mlab">'+esc(k[1])+'</div></button>';
  }).join('')+'</div>';
}
function socialFilters(){
  var fs=[['alles','Alle'],['feedback','Wacht op je feedback'],['goedgekeurd','Goedgekeurd'],['gepubliceerd','Gepubliceerd']];
  return '<div class="soc-fbar">'+fs.map(function(f){ return '<button class="soc-fchip'+(socialFilter()===f[0]?' active':'')+'" onclick="socialSetFilter(\''+f[0]+'\')">'+esc(f[1])+'</button>'; }).join('')+'</div>';
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
  var legend='<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:12px;color:var(--ink-4)">'+['feedback','goedgekeurd','gepubliceerd'].map(function(s){var m=socialStatusMeta(s);return '<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:9px;height:9px;border-radius:99px;background:'+m[1]+'"></span>'+esc(m[0])+'</span>';}).join('')+'</div>';
  return '<div class="section-head" style="margin-top:6px"><h2 style="text-transform:capitalize">'+esc(label)+'</h2><div class="soc-nav"><button aria-label="Vorige maand" onclick="socialMonthNav(-1)">'+ic('arrow',16)+'</button><button aria-label="Volgende maand" onclick="socialMonthNav(1)">'+ic('arrow',16)+'</button></div></div>'
    +'<div class="soc-cal"><div class="soc-dow">'+dow.map(function(d){return '<span>'+d+'</span>';}).join('')+'</div><div class="soc-grid">'+cells+'</div></div>'+legend;
}
function socialDetailPage(id){
  var p=socialPostsAll().filter(function(x){return String(x.id)===String(id);})[0];
  if(!p){ socialCloseDetail(); return ''; }
  var st=socialStatus(p), m=socialStatusMeta(st);
  var dd=p.dt?p.dt.toLocaleDateString('nl-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'';
  var tt=p.dt?p.dt.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}):'';
  var nets=(p.netwerken||[]).map(function(nw){ var n=mcNet(nw.netwerk); return '<span class="soc-net" style="color:'+n[1]+';background:'+n[1]+'15">'+esc(n[0])+'</span>'; }).join('');
  var approved=(p.approved||(state._mcApproved&&state._mcApproved[p.id]));
  var actions;
  if(st==='gepubliceerd'){
    actions='<div class="fs" style="color:var(--ink-3);line-height:1.55">Deze post is gepubliceerd. Bekijk ’m op je kanalen, of laat ons iets weten via de projectchat.</div>';
  } else if(approved){
    actions='<div class="soc-fbok">'+ic('check',16)+' Goedgekeurd, bedankt! We plannen deze post zo verder in.</div>';
  } else {
    actions='<div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px"><button class="btn btn-branch br-green" onclick="socialApprove(\''+esc(p.id)+'\',this)">'+ic('check',16)+' Post goedkeuren</button></div>'
      +'<div id="socFbWrap"><label class="fs" style="font-weight:700;color:var(--ink-3)">Liever iets aanpassen? Beschrijf de gewenste wijziging (tekst of visual), wij passen het voor je aan.</label>'
      +'<textarea id="socFbTx" class="soc-fbta" rows="3" placeholder="bv. Kan de eerste zin pakkender? Of: vervang de foto door een teamfoto."></textarea>'
      +'<div style="margin-top:9px"><button class="btn btn-primary" onclick="socialFeedback(\''+esc(p.id)+'\',this)">'+ic('send',15)+' Aanpassing doorgeven</button></div></div>';
  }
  return '<div class="soc-detail"><button class="soc-back" onclick="socialCloseDetail()">'+ic('arrow',15)+' Terug naar de kalender</button>'
    +'<div class="soc-dcard">'
    +(p.media?'<img class="soc-dimg" src="'+esc(p.media)+'" alt="" loading="lazy">':'')
    +'<div class="soc-dbody">'
    +'<div class="soc-dmeta"><span class="soc-badge" style="color:'+m[1]+';background:'+m[2]+'">'+esc(m[0])+'</span>'+nets+'</div>'
    +(dd?'<div class="fs" style="color:var(--ink-4);margin-bottom:14px;display:flex;align-items:center;gap:6px">'+ic('cal',14)+' '+esc(dd)+(tt?' · '+tt:'')+'</div>':'')
    +'<div class="soc-dtxt">'+esc(p.tekst||'(geen tekst)')+'</div>'
    +'<div class="soc-dact">'+actions+'</div>'
    +'</div></div></div>';
}
function panelSocials(){
  const head = hero('yellow','Mijn werk · Socials',
    `Jouw <span class="accent">socials${squig()}</span>, strak gepland`,
    'Je goedgekeurde en geplande content over alle kanalen, in één kalender.',
    scribble('stralen-geel.png','top:-12px;right:8px;width:124px;transform:rotate(6deg)'));
  var mc = state.demoMode ? {linked:true,posts:socialDemoPosts()} : ((window.S27DATA&&S27DATA.metricool())||null);
  if(!mc) return head+'<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Je contentkalender wordt geladen…</p></div>';
  if(!mc.linked) return head+'<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">Nog geen Metricool-koppeling</div><div style="color:var(--ink-3);max-width:460px;margin:0 auto;line-height:1.55">Zodra je social-kanalen gekoppeld zijn, zie je hier je volledige contentkalender met geplande en gepubliceerde posts. Vraag gerust je contactpersoon bij Studio&nbsp;27.</div></div>';
  if(state._socialDetail) return mcStyleOnce()+head+socialDetailPage(state._socialDetail);
  var posts=mc.posts||[];
  if(!posts.length) return head+'<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">Nog geen posts</div><div style="color:var(--ink-3)">Zodra Studio&nbsp;27 content voor je inplant, verschijnt die hier in de kalender.</div></div>';
  var f=socialFilter(); var shown=f==='alles'?posts:posts.filter(function(p){return socialStatus(p)===f;});
  return mcStyleOnce()+head+socialMatrixbar(posts)+socialFilters()+socialCalendar(shown);
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
    mk(27,14,0,'linkedin','Praktijkcase: van idee tot resultaat. Lees hoe we deze samenwerking aanpakten.','PENDING',false)
  ];
}

/* ---- Advertenties (echte Meta/Google-data) ---- */
const ADS_PLAT={meta:['Meta','#1877f2'],facebook:['Facebook','#1877f2'],instagram:['Instagram','#d6336c'],google:['Google Ads','#1a73e8'],'google-ads':['Google Ads','#1a73e8'],tiktok:['TikTok','#111827'],linkedin:['LinkedIn','#0a66c2'],snapchat:['Snapchat','#f7b500']};
function adsPlat(p){ p=String(p||'').toLowerCase(); return ADS_PLAT[p]||[(p?p.charAt(0).toUpperCase()+p.slice(1):'Ads'),'#667684']; }
function adsObjective(o){ o=String(o||'').toUpperCase(); var m={OUTCOME_LEADS:'Leads',OUTCOME_SALES:'Verkoop',OUTCOME_TRAFFIC:'Verkeer',OUTCOME_AWARENESS:'Naamsbekendheid',OUTCOME_ENGAGEMENT:'Betrokkenheid',OUTCOME_APP_PROMOTION:'App-promotie',LINK_CLICKS:'Klikken',LEAD_GENERATION:'Leads',CONVERSIONS:'Conversies'}; return m[o]||(o?o.replace(/^OUTCOME_/,'').replace(/_/g,' ').toLowerCase():''); }
function adsNum(n){ return (Number(n)||0).toLocaleString('nl-BE'); }
function adsEur(n){ return '€ '+(Number(n)||0).toLocaleString('nl-BE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function setAdsPlatform(p){ state._adsPlatform=p; renderPanel('advertenties'); }
function campaignCard(c){
  var pl=adsPlat(c.platform);
  var metrics=[['Besteed',adsEur(c.budget)],['Vertoningen',adsNum(c.impressies)],['Klikken',adsNum(c.klikken)],['CTR',(Number(c.ctr)||0).toLocaleString('nl-BE',{maximumFractionDigits:2})+'%'],['Bereik',adsNum(c.bereik)]];
  return '<div class="card" style="padding:14px 16px;margin-bottom:10px">'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:11px"><span style="font-size:11px;font-weight:700;color:'+pl[1]+';background:'+pl[1]+'14;border-radius:999px;padding:2px 9px">'+esc(pl[0])+'</span><b style="font-family:var(--font-display);font-size:15px;flex:1;min-width:130px">'+esc(c.naam||'Campagne')+'</b>'+(c.objective?'<span class="fs" style="color:var(--ink-4)">'+esc(adsObjective(c.objective))+'</span>':'')+'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:10px">'+metrics.map(function(m){return '<div><div style="color:var(--ink-4);font-size:11px;font-weight:600">'+m[0]+'</div><div style="font-family:var(--font-display);font-weight:800;font-size:16px;color:var(--ink)">'+m[1]+'</div></div>';}).join('')+'</div>'
  +'</div>';
}
function panelAdvertenties(){
  const head = hero('orange','Mijn werk · Advertenties',
    `Jouw <span class="accent">campagnes${squig()}</span> die draaien`,
    'Een live overzicht van je advertenties over al je platformen.',
    scribble('krabbel-oranje.png','top:-4px;right:8px;width:120px;transform:rotate(-5deg)'));
  if(state.demoMode){
    return head+`<div class="kpi-grid">
      ${[['orange','Advertentie-uitgaven','€ 2.840'],['blue','Vertoningen','318K'],['green','Klikken','7.412'],['purple','Campagnes','3']].map(k=>`
        <div class="kpi br-${k[0]}"><div class="kbar"></div><div class="klab">${k[1]}</div><div class="knum">${k[2]}</div></div>`).join('')}
    </div>
    <div class="section-head"><h2>Campagnes</h2><span class="count">3</span></div>
    <div class="proj-list">
      ${[['Google Search · Leadgen Q2','blue','€ 1.450 besteed · 12.300 vertoningen · 890 klikken'],['Meta · Retargeting','blue','€ 820 besteed · 64.000 vertoningen · 410 klikken'],['TikTok · Lentepromo','purple','€ 570 besteed · 120.000 vertoningen · 1.300 klikken']].map(c=>`
        <div class="proj-row br-${c[1]}" style="cursor:default"><span class="pr-main"><span class="pr-name" style="font-size:15px">${c[0]}</span><span style="font-size:13px;color:var(--ink-3)">${c[2]}</span></span><span class="pill pill-prog"><span class="pdot"></span>Live</span></div>`).join('')}
    </div>`;
  }
  var ad=(window.S27DATA&&S27DATA.ads())||null;
  if(!ad) return head+'<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Je campagnes worden geladen…</p></div>';
  if(!ad.linked) return head+'<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">Nog geen advertentieaccount gekoppeld</div><div style="color:var(--ink-3);max-width:470px;margin:0 auto;line-height:1.55">Zodra je Meta- of Google Ads-account aan je portaal gekoppeld is, zie je hier al je campagnes met budget, vertoningen en klikken. Vraag gerust je contactpersoon bij Studio&nbsp;27.</div></div>';
  var camps=ad.campaigns||[];
  if(!camps.length) return head+'<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">Geen actieve campagnes</div><div style="color:var(--ink-3)">Er liepen de afgelopen 90 dagen geen campagnes met activiteit op je gekoppelde account.</div></div>';
  var plats=[]; camps.forEach(function(c){ if(plats.indexOf(c.platform)<0)plats.push(c.platform); });
  var sel=state._adsPlatform||'alle'; if(sel!=='alle' && plats.indexOf(sel)<0) sel='alle';
  var shown = sel==='alle'?camps:camps.filter(function(c){return c.platform===sel;});
  var totB=shown.reduce(function(a,c){return a+(c.budget||0);},0), totI=shown.reduce(function(a,c){return a+(c.impressies||0);},0), totK=shown.reduce(function(a,c){return a+(c.klikken||0);},0);
  var kpis='<div class="kpi-grid"><div class="kpi br-orange"><div class="kbar"></div><div class="klab">Advertentie-uitgaven</div><div class="knum">'+adsEur(totB)+'</div></div><div class="kpi br-blue"><div class="kbar"></div><div class="klab">Vertoningen</div><div class="knum">'+adsNum(totI)+'</div></div><div class="kpi br-green"><div class="kbar"></div><div class="klab">Klikken</div><div class="knum">'+adsNum(totK)+'</div></div><div class="kpi br-purple"><div class="kbar"></div><div class="klab">Campagnes</div><div class="knum">'+shown.length+'</div></div></div>';
  var filterBtns = (plats.length>1) ? ('<span style="display:inline-flex;gap:5px;flex-wrap:wrap"><button class="seg-btn'+(sel==='alle'?' active':'')+'" onclick="setAdsPlatform(\'alle\')">Alle platformen</button>'+plats.map(function(p){ return '<button class="seg-btn'+(sel===p?' active':'')+'" onclick="setAdsPlatform(\''+p+'\')">'+esc(adsPlat(p)[0])+'</button>'; }).join('')+'</span>') : '<span class="count">'+shown.length+'</span>';
  var groups = sel==='alle'?plats:[sel];
  var body = groups.map(function(p){
    var cs=camps.filter(function(c){return c.platform===p;}); if(!cs.length) return '';
    var pl=adsPlat(p);
    return '<div class="section-head" style="margin-top:18px"><h2 style="display:flex;align-items:center;gap:8px"><span style="width:11px;height:11px;border-radius:3px;background:'+pl[1]+'"></span>'+esc(pl[0])+'</h2><span class="count">'+cs.length+'</span></div>'+cs.map(campaignCard).join('');
  }).join('');
  return head+kpis
    +'<div class="section-head"><h2>Campagnes</h2>'+filterBtns+'</div>'
    +'<p class="sdesc" style="margin:-6px 0 8px;max-width:62ch">Cijfers van de afgelopen 90 dagen, rechtstreeks uit je advertentieaccount. Voor de gedetailleerde analyse: zie <b>Resultaten</b>.</p>'
    +body;
}

const ADS_ENGINE_URL='https://raw.githack.com/studio27marketing/klantenportaal/main/ads-report-engine.html';
function panelPerformance(){
  const head = hero('purple','Resultaten', `Jouw <span class="accent">resultaten${squig()}</span> in cijfers`);
  const url = _live() ? (state.perfUrl||null) : null;
  if(url){
    const src = ADS_ENGINE_URL+'?embed=1&data='+encodeURIComponent(url);
    return head
      +`<p class="sdesc" style="margin:-4px 0 16px;max-width:64ch">Je live advertentieresultaten over de afgelopen ~30 dagen, automatisch bijgewerkt vanuit je campagnes (Meta, Google, TikTok &amp; Snapchat).</p>
      <div class="card" style="padding:0;overflow:hidden;border-radius:var(--r-lg,20px)">
        <iframe id="perfFrame" src="${esc(src)}" title="Jouw advertentierapport" loading="lazy" style="width:100%;border:0;display:block;min-height:760px;background:transparent"></iframe>
      </div>
      <p class="fs" style="color:var(--ink-4);margin-top:12px">Zie je nog geen cijfers? Dan lopen je campagnes nog niet of verzamelen ze nog data, zodra er resultaten zijn, verschijnen ze hier vanzelf.</p>`;
  }
  return head + perfMockHTML();
}
function perfMockHTML(){
  const bars=[40,55,48,70,62,85,78,92];
  return `${_live()?'<div class="fb-banner" style="margin-bottom:18px"><div class="fb-ic">'+ic('info',20)+'</div><div class="fb-tx"><b>Voorbeeldweergave</b><p>Zodra je advertentiecampagnes data verzamelen, zie je hier je échte cijfers in dit overzicht.</p></div></div>':''}<div class="kpi-grid">
    <div class="kpi br-blue"><div class="kbar"></div><div class="klab">Totaal bereik</div><div class="knum">412K</div><span class="chip chip-up">${ic('up',12)} +14% t.o.v. vorige</span></div>
    <div class="kpi br-green"><div class="kbar"></div><div class="klab">Websiteklikken</div><div class="knum">9.840</div><span class="chip chip-up">${ic('up',12)} +9%</span></div>
    <div class="kpi br-orange"><div class="kbar"></div><div class="klab">Advertentiekost</div><div class="knum">€ 2.840</div><span class="chip chip-flat">${ic('flat',12)} stabiel</span></div>
    <div class="kpi br-purple"><div class="kbar"></div><div class="klab">Conversies</div><div class="knum">186</div><span class="chip chip-up">${ic('up',12)} +22%</span></div>
  </div>
  <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:18px;margin-top:24px" class="perf-charts">
    <div class="chart-card">
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px"><h3 style="font-size:16px">Bereik per maand</h3><span style="font-size:12px;color:var(--ink-4);font-weight:700;margin-left:auto">laatste 8 maanden</span></div>
      <svg viewBox="0 0 480 200" style="width:100%;height:auto;margin-top:10px">
        <polyline fill="none" stroke="#3083DC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${bars.map((b,i)=>`${20+i*64},${180-b*1.7}`).join(' ')}"/>
        ${bars.map((b,i)=>`<circle cx="${20+i*64}" cy="${180-b*1.7}" r="4.5" fill="#fff" stroke="#3083DC" stroke-width="3"/>`).join('')}
        <polygon fill="rgba(48,131,220,.10)" points="20,180 ${bars.map((b,i)=>`${20+i*64},${180-b*1.7}`).join(' ')} ${20+7*64},180"/>
      </svg>
    </div>
    <div class="chart-card">
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px"><h3 style="font-size:16px">Leads per platform</h3></div>
      <svg viewBox="0 0 320 200" style="width:100%;height:auto;margin-top:10px">
        ${[['Meta','#3083DC',58],['TikTok','#9441DB',88],['Snapchat','#F8C028',40],['Google','#F66131',72]].map((p,i)=>`
          <rect x="${30+i*72}" y="${180-p[2]*1.6}" width="44" height="${p[2]*1.6}" rx="8" fill="${p[1]}"/>
          <text x="${52+i*72}" y="196" text-anchor="middle" font-family="Montserrat" font-size="11" font-weight="700" fill="#6B5B6B">${p[0]}</text>`).join('')}
      </svg>
      <div class="legend"><span><i style="background:#3083DC"></i>Meta</span><span><i style="background:#9441DB"></i>TikTok</span><span><i style="background:#F8C028"></i>Snapchat</span><span><i style="background:#F66131"></i>Google</span></div>
    </div>
  </div>
  <div class="section-head"><h2>Periode-vergelijking</h2></div>
  <div style="display:flex;flex-direction:column;gap:10px">
    <div class="accordion"><button class="acc-head" onclick="toggleAcc(this)">Q1 2026 vs Q4 2025 <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="acc-body"><div style="padding:0 18px 18px;color:var(--ink-3);font-size:14px">Bereik +14%, conversies +22%, kost per lead daalde van € 24 naar € 19. Vooral je Google Search-campagne en de social reels deden het knap.</div></div></div>
    <div class="accordion"><button class="acc-head" onclick="toggleAcc(this)">Per kanaal uitgesplitst <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="acc-body"><div style="padding:0 18px 18px;color:var(--ink-3);font-size:14px">Meta levert het meeste volume, TikTok de laagste kost per lead. Google blijft je sterkste kanaal voor échte aanvragen.</div></div></div>
  </div>`;
}

function panelMeetings(){
  const mt=(window.S27DATA && S27DATA.meetings());
  const MAAND=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  let meetHtml; let upCount=0;
  if(mt){
    // 'up' = enkel toekomstige meetings met geldige datum, chronologisch; de count-badge gebruikt
    // exact deze lijst (up.length) zodat kop, lijst en zijbalk-badge consistent zijn.
    const up=mt.list.filter(m=>m.dt && !isNaN(m.dt.getTime()) && m.dt.getTime()>=Date.now()-86400000)
                    .sort((a,b)=>a.dt.getTime()-b.dt.getTime());
    upCount=up.length;
    meetHtml = up.length ? up.map(m=>{
      const d=m.dt; const uur=d?(('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)):'';
      return `<div class="meeting-row big"><div class="date-block"><div class="d">${d?d.getDate():'–'}</div><div class="m">${d?MAAND[d.getMonth()]:''}</div></div>
        <div class="mr-tx"><span class="mr-type">${esc(m.type)}</span><b>${esc(m.titel)}</b><div class="mr-meta">${ic('clock',14)} ${uur} · ${ic('pin',14)} ${m.link?'Google Meet':'Studio 27'}</div></div>
        <div class="avstack"><span class="av" style="background:var(--s27-blue)">S27</span></div></div>`;
    }).join('') : `<div class="empty" style="padding:30px"><p>Nog geen geplande meetings. Plan er hieronder vlot eentje in.</p></div>`;
  } else {
    meetHtml = `<div class="meeting-row big"><div class="date-block"><div class="d">14</div><div class="m">mei</div></div>
          <div class="mr-tx"><span class="mr-type">Algemene meeting</span><b>Maandelijkse rapportage</b><div class="mr-meta">${ic('clock',14)} 10:00 · ${ic('pin',14)} Google Meet</div></div>
          <div class="avstack"><span class="av" style="background:var(--s27-blue)">IM</span></div></div>
        <div class="meeting-row big"><div class="date-block"><div class="d">22</div><div class="m">mei</div></div>
          <div class="mr-tx"><span class="mr-type">${ic('video',13)} Nieuw project · video</span><b>Kick-off recruitmentvideo</b><div class="mr-meta">${ic('clock',14)} 14:00 · ${ic('pin',14)} Studio 27, Rijkevorsel</div></div>
          <div class="avstack"><span class="av" style="background:var(--s27-orange)">AG</span></div></div>`;
  }
  return hero('blue','Plannen · Meetings',
    `Jouw <span class="accent">agenda${squig()}</span> met Studio 27`)
  +`<div class="meet-wrap">
    <div class="meet-main">
      <div class="section-head" style="margin-top:0"><h2>Geplande meetings</h2><span class="count">${mt?upCount+' gepland':'2 gepland'}</span></div>
      <div class="meet-list">${meetHtml}</div>
    </div>
    <aside class="card meet-side meet-side-accent">
      <h3 class="ms-title">Plan een meeting</h3>
      <label class="ms-label">Wat wil je inplannen?</label>
      <div class="mtype-grid">
        <button class="mtype" data-mtype="nieuwproject" onclick="pickMtype(this,'Arne','orange','Nieuw project')"><span class="mt-tx"><b>Nieuw project</b></span></button>
        <button class="mtype" data-mtype="algemeen" onclick="pickMtype(this,'Ilke','blue','Algemene meeting')"><span class="mt-tx"><b>Algemene meeting</b></span></button>
        <button class="mtype" data-mtype="project" onclick="pickProjectMeeting(this)"><span class="mt-tx"><b>Projectmeeting</b></span></button>
      </div>
      <div id="meetAgenda" class="np-hidden">
        <div class="meet-who" id="meetWho"></div>
        <div id="meetSlots"></div>
      </div>
      <div id="projMeetPick" class="np-hidden"></div>
    </aside>
  </div>`;
}
// Projectmeeting: kies een project -> beschikbaarheid van de verantwoordelijke (assignee) via loadPlanSlots(task_id)
function pickProjectMeeting(el){
  if(el){ el.parentElement.querySelectorAll('.mtype').forEach(b=>b.classList.remove('sel')); el.classList.add('sel'); }
  const ag=$id('meetAgenda'); if(ag)ag.classList.add('np-hidden');
  const host=$id('projMeetPick'); if(!host) return;
  host.classList.remove('np-hidden');
  const projs=_projects().filter(p=>p.status!=='done');
  if(!projs.length){ host.innerHTML='<p class="fs" style="color:var(--ink-3);padding:8px 0">Je hebt momenteel geen lopende projecten om een meeting voor in te plannen.</p>'; return; }
  host.innerHTML='<label class="ms-label" style="margin-top:6px">Voor welk project?</label>'
    +'<div class="projmeet-list">'+projs.map(p=>{ const sae=saeNames(p.sae); return '<button class="projmeet-opt br-'+p.br+'" onclick="startProjectMeeting(\''+esc(p.id)+'\',this)"><span class="pm-dot"></span><span class="pm-tx"><b>'+esc(p.name)+'</b><span>'+esc(p.disc)+(sae?' · '+sae:'')+'</span></span>'+ic('arrow',15)+'</button>'; }).join('')+'</div>'
    +'<div id="s27-plan-host"></div>';
}
function startProjectMeeting(taskId, el){
  if(el){ el.parentElement.querySelectorAll('.projmeet-opt').forEach(b=>b.classList.remove('sel')); el.classList.add('sel'); }
  const host=$id('s27-plan-host'); if(!host) return;
  // loadPlanSlots schrijft in #s27-plan-<taskId>; maak die container aan en start de bestaande plan-picker
  host.innerHTML='<div id="s27-plan-'+esc(taskId)+'" style="margin-top:14px"></div>';
  if(typeof loadPlanSlots==='function') loadPlanSlots(taskId);
}

const NP_OPTIONS = {
  'Strategie':[['Merkstrategie','€ 1.800 – € 3.500'],['Communicatiestrategie','€ 1.200 – € 2.800'],['Employer branding','€ 2.000 – € 4.000']],
  'Video- en fotografie':[['Bedrijfsfilm (1–2 min)','€ 2.450 – € 3.200'],["Socialvideo's (pakket van 4)",'€ 1.200 – € 1.800'],['Fotoreportage','€ 750 – € 1.400']],
  'Website & SEO':[['Onepager','€ 1.500 – € 2.500'],['Bedrijfswebsite','€ 3.500 – € 7.000'],['Webshop','€ 6.000 – € 12.000'],['SEO-traject','€ 600 – € 1.200 / maand']],
  'Online adverteren':[['Google Ads-beheer','€ 500 – € 1.500 / maand'],['Meta Ads-beheer','€ 500 – € 1.500 / maand'],['Volledig advertentiebeheer','€ 1.200 – € 2.500 / maand']],
  'Social media':[['Contentbeheer (4 posts/week)','€ 800 – € 1.400 / maand'],['Volledig beheer + ads','€ 1.500 – € 2.800 / maand']],
};
function npDienst(){
  const d=document.getElementById('npDienst').value;
  const f2=document.getElementById('npField2'),typeSel=document.getElementById('npType');
  ['npField3','npPrice','npActions'].forEach(id=>document.getElementById(id).classList.add('np-hidden'));
  if(!d){f2.classList.add('np-hidden');npSetStep(1);return;}
  typeSel.innerHTML='<option value="">Kies…</option>'+(NP_OPTIONS[d]||[]).map(o=>`<option data-price="${o[1]}">${o[0]}</option>`).join('');
  f2.classList.remove('np-hidden');npSetStep(2);
}
function npType(){
  const sel=document.getElementById('npType');if(!sel.value){return;}
  document.getElementById('npPriceVal').textContent=sel.options[sel.selectedIndex].getAttribute('data-price')||'op maat';
  ['npField3','npPrice','npActions'].forEach(id=>document.getElementById(id).classList.remove('np-hidden'));
  npSetStep(3);
}
function npSetStep(n){document.querySelectorAll('#npSteps .np-step').forEach((s,i)=>s.classList.toggle('on',i<n));}
function offerteRequestForm(){
  const diensten=Object.keys(NP_OPTIONS);
  return `<div class="card npform">
    <div class="np-steps" id="npSteps"><span class="np-step on">1</span><span class="np-bar"></span><span class="np-step">2</span><span class="np-bar"></span><span class="np-step">3</span></div>
    <div class="field"><label>Welke dienst heb je in gedachten?</label>
      <select id="npDienst" onchange="npDienst()"><option value="">Kies een dienst…</option>${diensten.map(d=>`<option>${d}</option>`).join('')}</select></div>
    <div class="field np-hidden" id="npField2"><label>Wat heb je ongeveer nodig?</label>
      <select id="npType" onchange="npType()"><option value="">Kies…</option></select></div>
    <div class="field np-hidden" id="npField3"><label>Wanneer wil je graag starten?</label>
      <select id="npWhen"><option>Zo snel mogelijk</option><option>Binnen 1–3 maanden</option><option>Ik ben nog aan het oriënteren</option></select></div>
    <div class="richtprijs br-blue np-hidden" id="npPrice">
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="rp-lab">Richtprijs</span><span class="big" id="npPriceVal" style="color:var(--s27-blue-ink)">-</span></div>
      <div class="disclaimer">${ic('info',16)} Dit is een richtprijs, wij kijken ze persoonlijk na.</div>
    </div>
    <div class="np-actions np-hidden" id="npActions"><button class="btn btn-primary" onclick="submitNieuwProject(this)">Vraag offerte aan ${ic('arrow',16)}</button><button class="btn btn-outline" onclick="goTab('meetings')">Plan eerst een koffietje</button></div>
  </div>`;
}
// De losse 'Nieuw project'-aanvraagmodule is verwijderd en vervangen door de volledige
// Offertes-pagina (panelOffertes). Zijbalk en topbar wijzen nu naar 'offertes'.

function panelHuisstijl(){
  const sw=[['Blauw','#3083DC'],['Roze','#F697CE'],['Paars','#9441DB'],['Groen','#12AC4E'],['Oranje','#F66131']];
  const files=(window.S27DATA && S27DATA.huisstijl()); const team=(window.S27DATA && S27DATA.team());
  const fmtBytes=(n)=>{ n=parseInt(n,10)||0; if(!n)return ''; if(n<1024)return n+' B'; if(n<1048576)return Math.round(n/1024)+' KB'; return (n/1048576).toFixed(1)+' MB'; };
  const mimeIc=(m)=>{ m=String(m||''); if(m.indexOf('image')===0)return 'img'; if(m.indexOf('video')===0)return 'video'; return 'doc'; };
  const fileMeta=(f)=>{ const p=[]; const b=fmtBytes(f.size); if(b)p.push(b); if(f.modified){ const d=new Date(f.modified); if(!isNaN(d.getTime()))p.push(d.toLocaleDateString('nl-BE',{day:'numeric',month:'short',year:'numeric'})); } return p.join(' · '); };
  const fileCards = files ? (files.length ? files.map(f=>`<div class="filecard" style="min-width:240px"><div class="ft">${ic(mimeIc(f.mime),20)}</div><div style="flex:1;min-width:0"><div class="fn" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</div><div class="fs">${esc(fileMeta(f))}</div></div><a class="icon-btn" style="width:34px;height:34px" href="${esc(f.url||'#')}" target="_blank" rel="noopener">${ic('download',16)}</a></div>`).join('') : '<div class="fs" style="color:var(--ink-4)">Nog geen bestanden in je Huisstijl-map. Sleep hieronder een bestand om te beginnen.</div>')
    : `<div class="filecard" style="min-width:240px"><div class="ft">${ic('img',20)}</div><div style="flex:1"><div class="fn">logo-tc-fullcolor.svg</div><div class="fs">Vector · 24 KB</div></div><button class="icon-btn" style="width:34px;height:34px">${ic('download',16)}</button></div><div class="filecard" style="min-width:240px"><div class="ft">${ic('img',20)}</div><div style="flex:1"><div class="fn">logo-tc-wit.png</div><div class="fs">PNG · 180 KB</div></div><button class="icon-btn" style="width:34px;height:34px">${ic('download',16)}</button></div>`;
  return hero('pink','Mijn bedrijf · Huisstijl',
    `Jouw <span class="accent">merk${squig()}</span> &amp; bestanden`,
    'Alles wat we nodig hebben om consistent voor je te werken, netjes bij elkaar.',
    scribble('krabbel-roze.png','top:-4px;right:8px;width:120px;transform:rotate(-6deg)'))
  +`<div class="setsec">
    <h3>Huisstijl-bestanden</h3><p class="sdesc">Alle bestanden uit je gedeelde Huisstijl-map op Google Drive, logo's, fonts, templates. Altijd up-to-date.</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap">${fileCards}</div>
    <div class="dropzone" style="margin-top:14px" onclick="document.getElementById('hsFile').click()">${ic('upload',30)}<b>Sleep je bestand hierheen</b><div style="font-size:12.5px;margin-top:4px">of klik om te bladeren · SVG, PNG, AI, PDF</div></div>
    <input type="file" id="hsFile" style="display:none" onchange="uploadHuisstijl(this)">
  </div>
  <div class="setsec">
    <h3>Kleuren</h3><p class="sdesc">Je merkkleuren. Pas een hex aan als er iets wijzigt.</p>
    <div class="swatches">${sw.map(s=>`<div class="swatch-card"><div class="sw" style="background:${s[1]}"></div><div style="font-family:var(--font-display);font-weight:700;font-size:12px">${s[0]}</div><div class="hex">${s[1]}</div></div>`).join('')}</div>
  </div>
  <div class="setsec">
    <h3>Fonts</h3><p class="sdesc">De lettertypes die we voor je gebruiken.</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap">
      <div class="filecard" style="min-width:220px"><div class="ft" style="font-family:var(--font-display);font-weight:900;color:var(--ink)">Aa</div><div><div class="fn">Montserrat</div><div class="fs">Display · 700–900</div></div></div>
      <div class="filecard" style="min-width:220px"><div class="ft" style="font-family:var(--font-body);font-weight:800;color:var(--ink)">Aa</div><div><div class="fn">Nunito</div><div class="fs">Body · 400–700</div></div></div>
    </div>
  </div>`;
}

function panelFacturatie(){
  // Facturen zijn (nog) niet zichtbaar: geen boekhoudkoppeling. De facturatiegegevens
  // (ondernemingsnummer, facturatie-email, opmerkingen) staan voortaan bij Offertes.
  return hero('green','Mijn bedrijf · Facturatie',
    `Jouw <span class="accent">facturatie${squig()}</span>, helder geregeld`,
    'Transparant en zonder kleine lettertjes.',
    scribble('krabbel-groen.png','top:-4px;right:8px;width:120px;transform:rotate(-5deg)'))
  +`<div class="setsec">
    <h3>Facturatiegegevens staan bij je offertes</h3>
    <p class="sdesc">Je ondernemingsnummer, facturatie-e-mail en eventuele opmerkingen geef je voortaan door bij je offertes, zo verwerken Ilke en Arne alles meteen correct bij oplevering.</p>
    <button class="btn btn-branch br-green btn-sm" onclick="goTab('offertes')">${ic('arrow',15)} Naar je offertes en facturatiegegevens</button>
  </div>
  <div class="setsec">
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
function offerteAfgerond(st){ return /goedgekeur|approv|completed|done|afgerond|declin|geweiger|verlopen|expired|gefactureerd|gewonnen|verloren/i.test(String(st||'')); }
// Alleen tonen vanaf 'verzonden' (sent); concept/to do/draft EN archived blijven verborgen
function offerteVisible(st){ return !/draft|concept|to ?do|todo|backlog|aangevraagd|in afwachting|archived|gearchiveerd/i.test(String(st||'').trim()); }
// Volledige label-map (alle lijststatussen); fallback = lege/neutrale tekst i.p.v. de rauwe Engelse status.
function offerteStatusLabel(st){ var s=String(st||'').toLowerCase().trim(); var m={sent:'Verzonden',viewed:'Bekeken',completed:'Goedgekeurd',approved:'Goedgekeurd',declined:'Geweigerd',expired:'Verlopen',draft:'Concept',archived:'Gearchiveerd',waiting_approval:'In afwachting',paid:'Betaald'}; return m[s]||''; }
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
  return '<div class="section-head" style="margin-top:36px"><h2>Facturatiegegevens</h2></div>'
    +'<div class="setsec" style="margin-top:0">'
    +'<p class="sdesc" style="margin-top:0">Geef bij oplevering van het project de juiste facturatiegegevens op via deze weg. Zo verwerken Ilke en Arne alles meteen correct.</p>'
    +'<div class="set-grid">'
    +'<div class="field"><label>Ondernemingsnummer / BTW</label><input id="facBtw" value="'+esc(onum)+'" placeholder="BE 0xxx.xxx.xxx" style="'+fld+'"></div>'
    +'<div class="field"><label>Facturatie-e-mail</label><input id="facEmail" value="'+esc(email)+'" placeholder="boekhouding@…" style="'+fld+'"></div>'
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
const OFF_GROUP_ORDER=['Content & video','Social media','Fotografie','Branding & grafisch','Webdesign','Adverteren','Audio','Strategie','Opleidingen','Overig'];
// Studio 27-branding per offerte-tak: kleur (br-*) + icoon, zodat de klant de takken meteen herkent.
const OFF_GROUP_BRAND={'Content & video':{br:'purple',icon:'video'},'Social media':{br:'yellow',icon:'social'},'Fotografie':{br:'purple',icon:'video'},'Branding & grafisch':{br:'pink',icon:'branding'},'Webdesign':{br:'green',icon:'website'},'Adverteren':{br:'orange',icon:'ads'},'Audio':{br:'indigo',icon:'spark'},'Strategie':{br:'blue',icon:'strategie'},'Opleidingen':{br:'indigo',icon:'opleiding'},'Overig':{br:'indigo',icon:'doc'}};
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
function panelOffertes(){
  var live=_live(); var raw = live ? S27DATA.offertes() : OFFERTE_MOCK;
  var head = hero('purple','Plannen · Offertes', 'Jouw <span class="accent">offertes'+squig()+'</span> in één overzicht');
  if(raw===null||raw===undefined) return head+'<div class="empty" style="padding:60px"><div class="brand-spinner" style="margin:0 auto 12px"></div><p>Je offertes worden geladen…</p></div>';
  var offs = live ? raw.filter(function(o){return offerteVisible(o.status);}) : raw;  // verberg concept/draft
  // Kennismaking / koffiegesprek -> automatisch bij Arne (link naar de meetingpagina, vooraf op "Nieuw project" met Arne)
  var koffieCard = '<div class="card koffie-card br-orange" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:14px"><span class="koffie-ic">'+ic('msg',22)+'</span><div style="flex:1;min-width:200px"><b style="font-family:var(--font-display);font-size:15.5px;display:block">Liever eerst even kennismaken?</b><span class="fs" style="color:var(--ink-3)">Plan een vrijblijvend koffiegesprek met Arne, dan bekijken we samen wat je nodig hebt.</span></div><button class="btn btn-branch br-orange btn-sm" onclick="koffieMetArne()">'+ic('cal',15)+' Koffiegesprek met Arne</button></div>';
  // Nieuwe offerte aanvragen: (1) zelf samenstellen uit de catalogus, (2) snel een richtprijs via het
  // 3-staps-formuliertje, (3) liever eerst kennismaken. Facturatiegegevens onderaan.
  var quickForm = '<div class="section-head" style="margin-top:40px"><h2>Of vraag snel een richtprijs</h2></div><p class="sdesc" style="margin:-4px 0 14px;max-width:60ch">Weet je nog niet precies wat je nodig hebt? Vertel ons kort je richting, dan denken wij met je mee.</p>'+koffieCard+offerteRequestForm();
  var formSection = offerteSamensteller()+quickForm+facturatieBlock();
  if(!offs.length) return head+'<div class="empty" style="padding:40px 20px"><div class="em-ic">'+ic('doc',52)+'</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Nog geen offertes</b><p style="margin:6px 0 0">Hier verschijnen je verzonden offertes zodra we er één klaarzetten, of vraag er hieronder meteen één aan.</p></div>'+formSection;
  var lopend=offs.filter(function(o){return !offerteAfgerond(o.status);}), afge=offs.filter(function(o){return offerteAfgerond(o.status);});
  return head
    +'<p class="sdesc" style="margin:-4px 0 16px;max-width:60ch">Klik een offerte open om ze te bekijken of goed te keuren (PandaDoc). Een vraag? Stel ze per offerte, ze komt rechtstreeks bij je Studio 27-contact terecht.</p>'
    +(lopend.length?'<div class="section-head" style="margin-top:4px"><h2>Lopend</h2><span class="count">'+lopend.length+'</span></div><div style="display:flex;flex-direction:column;gap:10px">'+lopend.map(offerteRow).join('')+'</div>':'')
    +(afge.length?'<div class="section-head" style="margin-top:30px"><h2>Goedgekeurd &amp; eerdere</h2><span class="count">'+afge.length+'</span></div><div style="display:flex;flex-direction:column;gap:10px">'+afge.map(offerteRow).join('')+'</div>':'')
    +formSection;
}
function contactRow(c, isMe){
  const nm=((c.voornaam||'')+' '+(c.achternaam||'')).trim()||'Contactpersoon';
  const init=(nm.split(/\s+/).map(x=>x[0]).join('').slice(0,2)||'?').toUpperCase();
  const hasEmail=!!String(c.email||'').trim();
  const sub=[c.rol||c.email||'', c.gsm||'', (c.voorkeur&&c.voorkeur!=='Geen')?('meldingen: '+c.voorkeur):''].filter(Boolean).join(' · ');
  const meBadge=isMe?' <span style="font-size:10.5px;font-weight:700;color:#fff;background:var(--s27-indigo,#5B6B8C);border-radius:999px;padding:1px 8px;margin-left:6px">jij</span>':'';
  // zonder e-mail geen portaaltoegang -> eerlijke indicator (de panelkop belooft "iedereen hier kan inloggen")
  const noAccessBadge=(!hasEmail&&!isMe)?' <span style="font-size:10.5px;font-weight:700;color:var(--s27-orange-ink,#C44514);background:var(--s27-orange-soft,rgba(246,97,49,.12));border-radius:999px;padding:1px 8px;margin-left:6px">geen toegang</span>':'';
  const delBtn=isMe?'':`<button class="icon-btn" style="width:32px;height:32px;margin-left:6px" title="Ontkoppelen, toegang tot dit portaal vervalt" onclick="removeContact('${esc(c.id||'')}',this)">${ic('trash',15)}</button>`;
  return `<div class="contact-row" data-cid="${esc(c.id||'')}"><span class="cr-av" style="background:var(--s27-indigo,#5B6B8C)">${esc(init)}</span><div class="cr-tx"><b>${esc(nm)}${meBadge}${noAccessBadge}</b><span>${esc(sub)}</span></div><button class="btn btn-ghost btn-sm" onclick="editContact('${esc(c.id||'')}')">Wijzig</button>${delBtn}</div>`;
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
      <div class="field"><label>Meldingen via</label><select id="cfVoorkeur" style="${fld}">${['Geen','WhatsApp','E-mail','Beide'].map(o=>`<option ${o===(c.voorkeur||'Geen')?'selected':''}>${o}</option>`).join('')}</select></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-branch br-indigo btn-sm" onclick="saveContact('${esc(c.id||'')}',this)">${ic('check',15)} Opslaan</button><button class="btn btn-ghost btn-sm" onclick="closeContactForm()">Annuleer</button></div>
  </div>`;
}
function panelInstellingen(){
  const demo=!_live();
  const t=(window.S27DATA && S27DATA.team())||{};
  let contacts=(t.contactpersonen||[]).slice();
  const demoContacts=[{voornaam:'Sarah',achternaam:'Janssens',rol:'Marketing · hoofdcontact',gsm:'+32 478 12 34 56',email:'sarah@testclient.be',voorkeur:'WhatsApp',id:'demo1'},{voornaam:'Tom',achternaam:'De Cock',rol:'Zaakvoerder',email:'tom@testclient.be',id:'demo2'}];
  if(demo && !contacts.length) contacts=demoContacts.slice();
  // "Mij" herkennen op het ingelogde e-mailadres en bovenaan plaatsen
  const meEmail=((window.state&&state.session&&state.session.email)||'').toLowerCase().trim();
  let me=null;
  if(meEmail){ for(var i=0;i<contacts.length;i++){ if(String(contacts[i].email||'').toLowerCase().trim()===meEmail){ me=contacts[i]; break; } } }
  if(me){ contacts=[me].concat(contacts.filter(function(x){return x!==me;})); }
  const prof = demo ? (contacts[0]||{}) : (me||{}); const vk = prof.voorkeur||'Geen';  // enkel het ingelogde contact, geen terugval op een willekeurig contact
  const contactsHTML = contacts.length ? contacts.map(function(x){return contactRow(x, x===me);}).join('') : '<div class="fs" style="color:var(--ink-4)">Nog geen contactpersonen toegevoegd, voeg je eerste collega toe.</div>';
  return hero('indigo','Mijn bedrijf · Instellingen',
    `Jouw <span class="accent">voorkeuren${squig()}</span>`)
  +`<div class="set-cols">
    <div class="setsec">
      <h3>Mijn profiel &amp; notificaties</h3><p class="sdesc">Je eigen gegevens, wijzigingen synchroniseren meteen met je contactfiche bij Studio&nbsp;27.</p>
      <input type="hidden" id="npProfileId" value="${esc(prof.id||'')}">
      <div class="set-grid set-grid-1">
        <div class="field"><label>E-mail</label><input id="npEmail" value="${esc(prof.email||'')}" placeholder="naam@bedrijf.be" onchange="saveProfile()" ${prof.id?'':'disabled'}></div>
        <div class="field"><label>GSM / WhatsApp-nummer</label><input id="npGsm" value="${esc(prof.gsm||(demo?'+32 478 12 34 56':''))}" placeholder="+32 4xx xx xx xx" onchange="saveProfile()" ${prof.id?'':'disabled'}></div>
        <div class="field"><label>Meldingen via</label><select id="npVoorkeur" onchange="saveProfile()" ${prof.id?'':'disabled'}>${['Geen','WhatsApp','E-mail','Beide'].map(o=>`<option ${o===vk?'selected':''}>${o}</option>`).join('')}</select></div>
      </div>
      <div id="npSaved" class="fs" style="color:var(--s27-green-ink,#2e7d32);margin-top:8px;display:none">✓ Opgeslagen, gesynchroniseerd met ClickUp</div>
      ${(!demo&&!prof.id)?'<p class="fs" style="color:var(--ink-4);margin-top:8px">Je e-mail is nog niet aan een contactpersoon gekoppeld, voeg jezelf hiernaast toe om je voorkeuren te bewaren.</p>':''}
    </div>
    <div class="setsec">
      <h3>Contactpersonen van je bedrijf</h3><p class="sdesc">Iedereen die hier staat kan inloggen én collega's beheren. Verwijder je iemand, dan vervalt meteen z'n toegang.</p>
      <div class="contact-list contact-list-sm" id="bedrijfContactList">${contactsHTML}</div>
      <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="addContact()">${ic('upload',15)} Persoon toevoegen</button>
      <div id="contactFormHost"></div>
    </div>
  </div>
  <div class="setsec" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
    <div><b style="font-family:var(--font-display);font-size:15px">Uitloggen</b><div style="font-size:13px;color:var(--ink-3)">Log veilig uit op dit toestel.</div></div>
    <button class="btn btn-outline" onclick="logout()">${ic('logout',16)} Uitloggen</button>
  </div>`;
}

/* ---- shared chat markup ---- */
function chatHTML(taskId){
  const live = (taskId && window.S27DATA) ? S27DATA.chat(taskId) : null;
  const msgs = (live && live.length!==undefined) ? live.map(m=>[m.av,m.who,m.color||'blue',m.tx,m.tm,m.me]) : [
    ['IM','Ilke Meeusen','blue','Hey Sarah! De eerste montage van de bedrijfsfilm staat klaar. Benieuwd wat je ervan vindt.','09:12',false],
    ['','Jij','blue','Wauw, ziet er strak uit! Kan de intro net iets korter?','09:41',true],
    ['IM','Ilke Meeusen','blue','Zeker, dat passen we gratis aan. Tegen morgen heb je een nieuwe versie.','09:43',false],
  ];
  return `<div class="chat-list" id="chatList">
    ${msgs.length?msgs.map(m=>`<div class="msg ${m[5]?'me':''}">
      ${m[5]?'':`<span class="av" style="background:var(--s27-${m[2]})">${m[0]}</span>`}
      <div class="bubble"><div class="who">${m[1]}</div><div class="tx">${m[3]}</div><div class="tm">${m[4]}</div></div>
    </div>`).join(''):'<div class="empty" style="padding:30px 10px"><p>Nog geen berichten, stuur ons gerust iets!</p></div>'}
  </div>
  <div class="chat-input"><button type="button" class="chat-attach" title="Bestand toevoegen" onclick="document.getElementById('chatFile').click()" style="border:none;background:none;cursor:pointer;color:var(--ink-4);padding:0 4px 0 8px;display:flex;align-items:center;flex:none">${ic('upload',18)}</button><input type="file" id="chatFile" style="display:none" onchange="chatUpload(this,'${taskId||''}')"><input placeholder="Schrijf een bericht…" onkeydown="if(event.key==='Enter')sendChat(this)"><button class="chat-send" onclick="sendChat(this.previousElementSibling)">${ic('send',18)}</button></div>`;
}

/* =========================================================
   PROJECT DETAIL MODAL
   ========================================================= */
function scheduleBlock(p){
  if(!p || p.status!=='todo') return '';
  return `<div class="setsec" style="margin-top:18px"><h3 style="display:flex;align-items:center;gap:8px">${ic('st_plan',18)} Plan je moment</h3><p class="sdesc">Kies een tijdslot dat past in de agenda van je Studio 27-contact, wij sturen meteen een agenda-uitnodiging met Meet-link of locatie.</p><div id="s27-plan-${esc(p.id)}"><button class="btn btn-branch br-${p.br} btn-sm" onclick="loadPlanSlots('${esc(p.id)}')">Toon beschikbare momenten →</button></div></div>`;
}
const REVIEW_CHANNEL_OPTS = [['portaal','via het portaal'],['whatsapp','via WhatsApp'],['email','via e-mail'],['telefoon','telefonisch'],['meeting','in een meeting']].map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join('');
// label naar de juiste actie-knop voor een deliverable-link (Vimeo/Webflow/Drive)
function deliverOpenLabel(type){ return type==='video'?'Bekijk video':type==='img'?'Bekijk beeld':'Open link'; }
// één deliverable-rij met directe link + (optioneel) Feedback geven / Goedkeuren ernaast
function deliverFileRow(d, opts){
  opts=opts||{}; const t=d.type==='video'?'video':d.type==='img'?'img':'doc';
  const open = d.url ? `<a class="btn btn-branch br-${opts.br||'blue'} btn-sm" href="${esc(d.url)}" target="_blank" rel="noopener">${ic(t==='video'?'play':'arrow',14)} ${deliverOpenLabel(t)}</a>` : '';
  const actions = opts.done ? spill('done') : `${open}${opts.review!==false?`<button class="btn btn-outline btn-sm" onclick="fileFeedback(this)">Feedback geven</button><button class="btn btn-branch btn-sm br-green" onclick="fileApprove(this)">Goedkeuren</button>`:''}`;
  return `<div class="deliv-file" data-label="${esc(d.label||'Bestand')}">
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
  const files=(t.bestanden||[]).map(f=>{ const tp=f.type==='video'?'video':f.type==='img'?'img':'doc'; return `<div class="deliv-file" style="background:var(--paper-2,#FAF7F2)"><span class="df-ic">${ic(tp,18)}</span><div class="df-tx"><b>${esc(f.label||'Bestand')}</b><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:42ch;display:inline-block">${esc((f.url||'').replace(/^https?:\/\//,''))}</span></div><div class="df-act">${f.url?`<a class="btn btn-outline btn-sm" href="${esc(f.url)}" target="_blank" rel="noopener">${ic('arrow',14)} Bekijk</a>`:''}</div></div>`; }).join('');
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
function buildModal(id, from){
  const p=_projects().find(x=>x.id===id)||{id:id,name:'Project',disc:'',status:'prog',br:'blue'};
  const sl=STATUS_LABEL[p.status]||STATUS_LABEL.prog; const lab=sl[0], cls=sl[1];
  const det=(window.S27DATA && S27DATA.detail(id))||null;
  const isVideo=(p.disc||'').indexOf('Video')===0;
  const needsFeedback=p.status==='wait';
  const chatClosed = (p.status==='done') || !!(window.S27DATA && S27DATA.isChatClosed && p._raw && S27DATA.isChatClosed(p._raw.status));
  const backTo=(from==='berichten')?'berichten':'projecten';
  const backLabel=(backTo==='berichten')?'berichten':'projecten';
  let SUBTASKS = isVideo ? [
    {t:'Montage',st:'wait',files:[['Montage v1, volledige film','MP4 · 02:14','video'],['Korte teaser (15s)','MP4 · 00:15','video']]},
    {t:'Fotografie',st:'wait',files:[['Still, openingsshot','JPG · hoge resolutie','img'],['Still, teamportret','JPG · hoge resolutie','img']]},
    {t:'Audio &amp; muziek',st:'done',files:[['Soundtrack, gelicentieerd','MP3','doc']]},
  ] : [
    {t:'Strategiedeck',st:'wait',files:[['Strategiedeck v1.pdf','PDF · 24 pagina\'s','doc']]},
    {t:'Vooronderzoek',st:'done',files:[['Marktanalyse.pdf','PDF · 12 pagina\'s','doc']]},
  ];
  let approved = isVideo ? ['Concept &amp; scenario','Locatie &amp; opnameplanning','Audio &amp; muziekselectie'] : ['Marktonderzoek &amp; analyse','Positioneringsworkshop'];
  // delivList = de deliverables met directe link (overzicht); approvedTasks = goedgekeurde taken (klikbaar mits bestanden)
  let delivList = null;       // [{label,url,type}] of null (=demo)
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
      approvedTasks=det.subtasks.filter(s=>s.status==='done').map(s=>({naam:s.naam, heeftBestanden:!!s.heeftBestanden, bestanden:s.bestanden||[]}));
    }
  }
  const saeLine = det ? saeNames(det.sae) : saeNames(p.sae);

  // Deliverables-blok in het overzicht: directe link + Feedback geven / Goedkeuren ernaast.
  // Meerdere video's/links => alle rijen onder elkaar. Geen aparte tab nodig.
  let delivBlock='';
  if(delivList!==null){
    if(delivList.length){
      const done = p.status==='done';
      delivBlock = `<div class="deliv-inline"><div class="subtask-files">${delivList.map(d=>deliverFileRow(d,{br:p.br,done:done})).join('')}</div></div>`;
    }
  } else {
    // demo-fallback: toon de mock-deliverables van de eerste subtaak met link-knoppen
    const mockFiles=(SUBTASKS[0]&&SUBTASKS[0].files)||[];
    delivBlock = `<div class="deliv-inline"><div class="subtask-files">${mockFiles.map(f=>deliverFileRow({label:f[0],url:f[3]||'',type:f[2]},{br:p.br,done:p.status==='done'})).join('')}</div></div>`;
  }
  const showDeliv = needsFeedback || (delivList && delivList.length) || (delivList===null);

  const overview=`<div class="mpane active" data-mpane="overzicht">
    ${scheduleBlock(p)}
    ${showDeliv?`<h4 style="font-family:var(--font-display);font-size:15px;margin:0 0 4px">${(delivList&&delivList.length>1)||(delivList===null)?'Jouw deliverables':'Jouw deliverable'}</h4>
    <p class="sdesc" style="margin:0 0 10px">Bekijk wat we voor je klaarzetten en laat meteen weten of je akkoord gaat of feedback hebt. Opmerkingen passen we volledig gratis aan.</p>
    ${delivBlock}`:''}
    <h4 style="font-family:var(--font-display);font-size:15px;margin:${showDeliv?'22px':'0'} 0 8px">Tijdlijn</h4>
    <div class="timeline-mini">
      ${timelineSteps(p).map((t,i,a)=>`
        <div class="tl-step"><span class="tl-dot ${t[1]}">${t[1]==='done'?ic('check',10):''}</span><span class="tl-lab ${t[1]==='todo'?'muted':''}">${t[0]}</span>${i<a.length-1?'<span class="tl-line"></span>':''}</div>`).join('')}
    </div>
    <h4 style="font-family:var(--font-display);font-size:15px;margin:22px 0 10px">Goedgekeurde taken</h4>
    <div class="approved-list">
      ${approvedTasks ? (approvedTasks.length?approvedTasks.map(approvedTaskRow).join(''):'<div class="fs" style="color:var(--ink-4)">Nog niets goedgekeurd.</div>')
        : approved.map(t=>`<div class="approved-row"><span class="check-circ">${ic('check',13)}</span><span>${t}</span></div>`).join('')}
    </div>
  </div>`;

  const deliverables=`<div class="mpane" data-mpane="deliverables">
    <p class="deliv-intro">Hier staan al je bestanden. Keur per stuk goed of geef feedback, we noteren er ook bij via welke weg je het doorgaf, zodat niets verloren gaat.</p>
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

  const feedback=`<div class="mpane" data-mpane="feedback">
    <p style="color:var(--ink-3);font-size:14px;margin-top:0">Een algemene opmerking over dit project? Laat het hier weten. Opmerkingen passen we volledig gratis aan. Wil je per bestand reageren? Dat kan onder <b>Bestanden</b>.</p>
    <div class="field"><label>Jouw feedback</label><textarea id="genFbTx" rows="4" style="font-family:var(--font-body);font-size:14px;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r-sm);resize:vertical;outline:none" placeholder="bv. de intro mag iets korter…"></textarea></div>
    <div class="field" style="margin-top:12px"><label>Via welke weg geef je dit door?</label><select id="genFbChan" style="font-family:var(--font-body);font-size:14px;padding:11px 12px;border:1px solid var(--line);border-radius:var(--r-sm);background:#fff;outline:none">${REVIEW_CHANNEL_OPTS}</select></div>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-branch br-green" onclick="approveAll(this)">${ic('check',16)} Project goedkeuren</button><button class="btn btn-primary" onclick="submitGeneralFeedback(this)">Feedback versturen ${ic('arrow',16)}</button></div>
  </div>`;

  const d=DISC[p.disc]||{icon:'doc'};
  const fromCap=backLabel.charAt(0).toUpperCase()+backLabel.slice(1);
  return `<div class="detail br-${p.br}">
    <nav class="hero-crumb"><button class="hc hc-link" onclick="goTab('start')">Portaal</button><span class="hc-sep">›</span><button class="hc hc-link" onclick="goTab('${backTo}')">${fromCap}</button><span class="hc-sep">›</span><span class="hc-cur">${p.name}</span></nav>
    <button class="detail-back" onclick="goTab('${backTo}')"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg> Terug naar ${backLabel}</button>
    <div class="detail-head">
      <span class="detail-ic">${discMark(p.disc,'detail-stamp')}</span>
      <div class="detail-titles"><h1>${p.name}</h1><div class="detail-sub${saeLine?' sae-line':''}">${saeLine||esc(p.disc)}</div></div>
      ${spill(p.status)}
    </div>
    <div class="detail-grid">
      <div class="detail-main">
        <div class="modal-tabs detail-tabs">
          <button class="mtab active" onclick="switchModalTab('overzicht')">Overzicht</button>
          <button class="mtab" onclick="switchModalTab('deliverables')">Bestanden</button>
          <button class="mtab" onclick="switchModalTab('feedback')">Feedback</button>
          ${chatClosed?'':`<button class="mtab mtab-chat" onclick="switchModalTab('chat')">Chat</button>`}
        </div>
        <div class="detail-body">${overview}${deliverables}${feedback}</div>
      </div>
      <aside class="detail-chat">
        <div class="dc-head">${ic('msg',16)} Projectchat ${saeChatWho(det?det.sae:p.sae, chatClosed)}</div>
        <div class="dc-body" id="dcBody">${chatClosed?`<div class="empty" style="padding:22px 14px;text-align:center"><div class="em-ic">${ic('st_approved',40)}</div><b style="font-family:var(--font-display);font-size:14.5px;color:var(--ink-2)">Deze taak is doorgestuurd of afgerond</b><p style="margin:6px 0 0;font-size:13px;color:var(--ink-3)">Heb je nog een vraag? Stel ze gerust, we volgen het verder op.</p><button class="btn btn-branch br-blue btn-sm" style="margin-top:14px" onclick="dringendeVraag('${esc(p.id)}')">${ic('spark',15)} Stel je vraag</button></div>`:chatHTML(id)}</div>
        ${chatClosed?'':`<div style="padding:2px 12px 12px"><button class="btn btn-ghost btn-sm" style="width:100%;color:var(--s27-orange-ink)" onclick="dringendeVraag('${esc(p.id)}')">${ic('spark',14)} Dringende vraag aan Ilke</button></div>`}
      </aside>
    </div>
  </div>`;
}

/* =========================================================
   OVERLAYS (notif, chatbot, tour)
   ========================================================= */
function buildOverlays(){
  return `
  <!-- Login loader -->
  <div id="loader">
    <div class="loader-stage"><div class="loader-ring"></div><div class="loader-badge"><svg class="loader-27" viewBox="782 34 210 130" xmlns="http://www.w3.org/2000/svg"><path d="M788.07,158.63v-24.58l42.88-39.66c2.71-2.6,4.71-4.86,6.02-6.78,1.3-1.92,2.17-3.64,2.63-5.17,.45-1.52,.68-2.97,.68-4.32,0-2.94-.96-5.22-2.88-6.86-1.92-1.64-4.8-2.46-8.64-2.46-3.5,0-6.84,.93-10,2.8-3.16,1.86-5.65,4.61-7.46,8.22l-30.17-15.08c4.29-8.13,10.73-14.74,19.32-19.83,8.59-5.09,19.26-7.63,32.03-7.63,9.38,0,17.68,1.53,24.91,4.58,7.23,3.05,12.88,7.35,16.95,12.88,4.07,5.54,6.1,12.09,6.1,19.66,0,3.84-.48,7.68-1.44,11.52-.96,3.84-2.91,7.88-5.85,12.12-2.94,4.24-7.29,8.96-13.05,14.15l-32.2,29.32-6.27-13.9h61.52v31.01h-95.08Z"/><path d="M908.23,158.63l44.74-104.4,10.68,16.78h-56.27l15.59-18.13v35.42h-33.05V40h101.52v24.58l-39.49,94.06h-43.72Z"/></svg></div></div>
    <div class="loader-text">Je portaal wordt klaargezet…</div>
    <div class="loader-bar"><i></i></div>
  </div>

  <!-- Notification panel -->
  <div class="notif-panel" id="notifPanel">
    <div class="notif-head"><h3>Meldingen</h3><button class="mark" onclick="markAllSeen()">Alles gezien</button></div>
    <div class="notif-list">
      <div class="notif br-purple"><div class="nic">${ic('st_feedback',18)}</div><div class="ntx"><b>Nieuwe deliverable</b><p>Montage "Onder één dak" staat klaar voor review.</p><div class="ntm">10 min geleden</div></div><span class="unread"></span></div>
      <div class="notif br-blue"><div class="nic">${ic('st_feedback',18)}</div><div class="ntx"><b>Feedback gevraagd</b><p>We willen je input op de positionering 2026.</p><div class="ntm">2 u geleden</div></div><span class="unread"></span></div>
      <div class="notif br-orange"><div class="nic">${ic('st_plan',18)}</div><div class="ntx"><b>Plan dit in</b><p>Tijd voor je maandelijkse rapportage.</p><div class="ntm">gisteren</div></div><span class="unread"></span></div>
      <div class="notif seen br-green"><div class="nic">${ic('st_approved',18)}</div><div class="ntx"><b>Goedgekeurd</b><p>Contentkalender mei is bevestigd.</p><div class="ntm">2 dagen geleden</div></div></div>
    </div>
  </div>

  <!-- Chatbot -->
  <button class="bot-fab" id="botFab" onclick="toggleBot()" aria-label="Hulp van Studio 27">${logo27(30)}</button>
  <div class="bot-panel" id="botPanel">
    <div class="bot-head"><div class="ba">${logo27(24)}</div><div><h3>Vraag het aan Studio 27</h3><div class="st"><i></i> meestal binnen enkele minuten</div></div><button class="bclose" onclick="toggleBot()"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="bot-msgs" id="botMsgs"><div class="bmsg bot" id="botGreet">Hallo! Ik help je graag op weg. Waarmee kan ik je verder helpen?</div></div>
    <div class="bot-chips" id="botChips">
      <button class="bot-chip" onclick="botAsk(this)">Wanneer is mijn volgende meeting?</button>
      <button class="bot-chip" onclick="botAsk(this)">Status van mijn website?</button>
      <button class="bot-chip" onclick="botAsk(this)">Hoe geef ik feedback?</button>
    </div>
    <div class="bot-input"><input id="botInput" placeholder="Typ je vraag…" onkeydown="if(event.key==='Enter')botSend()"><button class="chat-send" onclick="botSend()">${ic('send',18)}</button></div>
  </div>

  <!-- Onboarding tour -->
  <div class="tour-scrim" id="tourScrim"></div>
  <div class="spotlight" id="spotlight"></div>
  <div class="tour-dialog" id="tourDialog">
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

/* ---- panel registry ---- */
const PANELS={
  start:panelStart, berichten:panelBerichten, projecten:panelProjecten, diensten:panelDiensten,
  socials:panelSocials, advertenties:panelAdvertenties, performance:panelPerformance,
  meetings:panelMeetings, nieuwproject:panelOffertes, offertes:panelOffertes,
  huisstijl:panelHuisstijl, facturatie:panelFacturatie, instellingen:panelInstellingen,
};
const TAB_BRANCH={start:'blue',berichten:'blue',projecten:'blue',diensten:'blue',socials:'yellow',advertenties:'orange',performance:'purple',meetings:'blue',nieuwproject:'blue',offertes:'purple',huisstijl:'pink',facturatie:'green',instellingen:'indigo'};
const TAB_GROUP={projecten:'werk',diensten:'werk',socials:'werk',advertenties:'werk',performance:'werk',meetings:'plannen',nieuwproject:'plannen',offertes:'plannen',huisstijl:'bedrijf',facturatie:'bedrijf',instellingen:'bedrijf'};
