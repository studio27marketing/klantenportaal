/* ============================================================
   Studio 27 — Klantenportaal · panel + overlay markup
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
};
const ic = (n,w=20)=>`<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const logo27 = (w=28)=>`<svg class="logo27" viewBox="782 34 210 130" width="${w}" height="${Math.round(w*0.62)}" fill="currentColor" aria-hidden="true"><path d="M788.07,158.63v-24.58l42.88-39.66c2.71-2.6,4.71-4.86,6.02-6.78,1.3-1.92,2.17-3.64,2.63-5.17,.45-1.52,.68-2.97,.68-4.32,0-2.94-.96-5.22-2.88-6.86-1.92-1.64-4.8-2.46-8.64-2.46-3.5,0-6.84,.93-10,2.8-3.16,1.86-5.65,4.61-7.46,8.22l-30.17-15.08c4.29-8.13,10.73-14.74,19.32-19.83,8.59-5.09,19.26-7.63,32.03-7.63,9.38,0,17.68,1.53,24.91,4.58,7.23,3.05,12.88,7.35,16.95,12.88,4.07,5.54,6.1,12.09,6.1,19.66,0,3.84-.48,7.68-1.44,11.52-.96,3.84-2.91,7.88-5.85,12.12-2.94,4.24-7.29,8.96-13.05,14.15l-32.2,29.32-6.27-13.9h61.52v31.01h-95.08Z"/><path d="M908.23,158.63l44.74-104.4,10.68,16.78h-56.27l15.59-18.13v35.42h-33.05V40h101.52v24.58l-39.49,94.06h-43.72Z"/></svg>`;
const squig = ()=>'';
const scribble = ()=>'';
/* 4 uniforme projectstatus-iconen (overal in het portaal) */
const STATUS_ICON = {todo:'st_plan',prog:'st_progress',wait:'st_feedback',sent:'st_feedback',done:'st_approved'};

const hero = (br,eyebrow,h1html)=>{
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
  {key:'branding',br:'pink',name:'Branding',stamp:'icon-branding-heart.svg',active:false,tease:'Sterke merken beginnen bij branding — ontdek wat een frisse huisstijl voor je kan betekenen.'},
  {key:'seo',br:'green',name:'SEO &amp; GEO',stamp:'icon-webdesign.svg',active:false,tease:'Word je wel gevonden in Google én in AI-antwoorden? We kijken het graag eens na.'},
  {key:'opleiding',br:'indigo',name:'Opleidingen',icon:'opleiding',active:false,tease:'Liever zelf aan de slag? Onze opleidingen maken je team marketing-sterk.'},
];

/* ---- project data ---- */
const PROJECTS = [
  {id:'p1',name:'Bedrijfsfilm "Onder één dak"',br:'purple',disc:'Video- en fotografie',status:'wait',deliv:true},
  {id:'p2',name:'Nieuwe website & webshop',br:'green',disc:'Website en SEO',status:'prog',deliv:false},
  {id:'p3',name:'Productfotografie najaarscollectie',br:'purple',disc:'Video- en fotografie',status:'sent',deliv:true},
  {id:'p4',name:'Merkstrategie & positionering 2026',br:'blue',disc:'Strategie',status:'prog',deliv:false},
  {id:'p5',name:'Google Ads — leadcampagne Q2',br:'orange',disc:'Online adverteren',status:'prog',deliv:false},
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
  return `<div class="svc-card svc-inactief br-${s.br}">
    <div class="svc-head"><div class="svc-ic">${svcStamp(s)}</div><h3>${s.name}</h3></div>
    <p class="tease">${s.tease||'Interesse in deze dienst? Vraag vrijblijvend een offerte — we kijken graag wat we voor je kunnen doen.'}</p>
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
    <div class="ac-foot"><button class="btn btn-branch btn-sm br-${a.br}" onclick="${a.action}">${esc(a.cta)}</button><span class="tag-mini">${esc(a.tag)}</span></div>
  </div>`;
}
function _runRow(r){ return `<button class="run-row br-${r.br}" onclick="${r.id?`openProject('${esc(r.id)}','projecten')`:`goTab('projecten')`}"><div class="run-top"><span class="run-dot"></span><span class="run-disc">${esc(r.disc)}</span><span class="pill pill-${r.status}">${ic(STATUS_ICON[r.status]||'st_progress',12)}<span>${esc(r.label)}</span></span></div><b class="run-name">${esc(r.name)}</b><div class="run-prog"><div class="rp-bar"><i style="width:${r.pct||0}%"></i></div><span class="rp-pct">${r.pct||0}%</span></div></button>`; }
function _doneRow(d){ return `<div class="done-row br-${d.br}"><span class="check-circ">${ic('check',13)}</span><div class="done-main"><b>${esc(d.name)}</b><span class="done-meta">${esc(d.disc)}${d.when?(' · '+esc(typeof d.when==='string'?d.when:'')):''}</span></div><span class="run-dot"></span></div>`; }
function panelStart(){
  const cock = window.S27DATA && S27DATA.cockpit();
  const run  = (window.S27DATA && S27DATA.running()) || _RUN_MOCK;
  const done = (window.S27DATA && S27DATA.done())   || _DONE_MOCK;
  const head = hero('blue', _bedrijf(), `Welkom terug, <span class="accent">${esc(_greetNaam())}</span>`);
  // Voor jou te doen
  let cockHtml;
  if(cock){
    cockHtml = cock.length
      ? `<div class="section-head"><h2>Voor jou te doen</h2><span class="count">${cock.length} ${cock.length===1?'item':'items'}</span></div><div class="cockpit-row">${cock.map(_cockpitCard).join('')}</div>`
      : `<div class="empty" style="margin-top:24px"><div class="em-ic">${ic('st_approved',64)}</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Alles is bij!</b><p style="margin:6px 0 0">Er staat momenteel niets op jou te wachten — wij werken ondertussen verder.</p></div>`;
  } else {
    cockHtml = `<div class="section-head"><h2>Voor jou te doen</h2><span class="count">${_COCKPIT_MOCK.length} items</span></div><div class="cockpit-row">${_COCKPIT_MOCK.map(_cockpitCard).join('')}</div>`;
  }
  return head + cockHtml + `
  <div class="section-head"><h2>Jouw projecten</h2><button class="count linkish" onclick="goTab('projecten')">Alle projecten ${ic('arrow',13)}</button></div>
  <div class="proj-overview">
    <div class="ov-col">
      <div class="ov-head"><span class="pill pill-prog"><span class="pdot"></span>Loopt nu</span><span class="ov-n">${run.length}</span></div>
      <div class="run-list">${run.length?run.map(_runRow).join(''):'<div class="empty" style="padding:24px"><p>Geen lopende projecten.</p></div>'}</div>
    </div>
    <div class="ov-col">
      <div class="ov-head"><span class="pill pill-done"><span class="pdot"></span>Recent afgerond</span><span class="ov-n">${done.length}</span></div>
      <div class="done-list">${done.length?done.map(_doneRow).join(''):'<div class="empty" style="padding:24px"><p>Nog niets afgerond.</p></div>'}</div>
    </div>
  </div>`;
}

function goDienstOfferte(key){ goTab('nieuwproject'); }
function panelDiensten(){
  const act=SERVICES.filter(svcActive), inact=SERVICES.filter(s=>!svcActive(s));
  return hero('blue','Onze diensten', `Onze diensten <span class="accent">voor jou${squig()}</span>`)
  + (act.length?`<div class="section-head" style="margin-top:8px"><h2>Actief</h2><span class="count">${act.length} ${act.length===1?'dienst':'diensten'}</span></div><div class="svc-grid">${act.map(svcCard).join('')}</div>`:'')
  + (inact.length?`<div class="section-head" style="margin-top:36px"><h2>Niet actief</h2><span class="count">${inact.length}</span></div><p style="color:var(--ink-3);font-size:13.5px;margin:-6px 0 18px;max-width:60ch">Diensten die we nu (nog) niet voor je doen. Interesse? Vraag vrijblijvend een offerte aan — geen verplichtingen.</p><div class="svc-grid">${inact.map(svcCard).join('')}</div>`:'');
}

function panelBerichten(){
  const projs=_projects(); const first=projs[0];
  const rows = projs.map((p,idx)=>`
        <button class="proj-row br-${p.br}" style="border:none;border-radius:0;box-shadow:none;border-bottom:1px solid var(--line);${idx===0?'background:var(--paper-2)':''}" onclick="openProject('${esc(p.id)}','berichten');switchModalTab('chat')">
          <span class="ber-dot" style="background:var(--c)"></span>
          <span class="pr-main"><span class="ber-disc" style="color:var(--c-ink)">${esc(p.disc)}</span><span class="pr-name" style="font-size:14px">${esc(p.name)}</span></span>
          ${p.deliv?`<span class="badge" style="position:static;background:var(--c);color:#fff;border:none;min-width:20px;height:20px;font-size:11px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800">!</span>`:''}
        </button>`).join('');
  return hero('blue','Berichten', `Even <span class="accent">bijpraten${squig()}</span>?`)
  +`<div style="display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start" class="berichten-wrap">
    <div class="card" style="overflow:hidden">${rows||'<div class="empty" style="padding:30px"><p>Nog geen gesprekken.</p></div>'}</div>
    <div class="card br-${first?first.br:'blue'}" style="padding:0;overflow:hidden">
      ${first?`<div style="padding:18px 22px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:11px">
        <div style="width:8px;height:8px;border-radius:3px;background:var(--c)"></div>
        <b style="font-family:var(--font-display);font-size:15px">${esc(first.name)}</b>
        <button class="btn btn-ghost btn-sm br-${first.br}" style="margin-left:auto" onclick="openProject('${esc(first.id)}','berichten');switchModalTab('chat')">Open project ${ic('arrow',14)}</button>
      </div><div style="padding:22px">${chatHTML(first.id)}</div>`:'<div class="empty" style="padding:60px 20px"><div class="em-ic">'+ic('msg',64)+'</div><p>Selecteer links een project om het gesprek te openen.</p></div>'}
    </div>
  </div>`;
}

function projRow(p){
  return `<button class="proj-row br-${p.br}" data-status="${p.status}" onclick="openProject('${p.id}','projecten')">
    <span class="pr-main"><span class="pr-name">${p.name}</span></span>
    ${p.deliv?`<span class="deliv">${ic('download',14)} deliverable klaar</span>`:''}
    ${spill(p.status)}
    <span class="arrow">${ic('arrow',18)}</span>
  </button>`;
}
function projCard(p){
  return `<button class="kan-card br-${p.br}" onclick="openProject('${p.id}','projecten')">
    <div class="kan-top"><span class="pr-ic">${discMark(p.disc)}</span><span class="kan-disc">${p.disc}</span></div>
    <b class="kan-name">${p.name}</b>
    ${p.deliv?`<span class="kan-deliv">${ic('download',13)} deliverable klaar</span>`:''}
  </button>`;
}
function projKanban(){
  const cols=[['todo','In te plannen',['todo']],['prog','In productie',['prog']],['wait','Feedback gevraagd',['wait','sent']],['done','Goedgekeurd',['done']]];
  return `<div class="kanban">${cols.map(c=>{
    const items=_projects().filter(p=>c[2].indexOf(p.status)>=0);
    return `<div class="kan-col">
      <div class="kan-head"><span class="pill pill-${c[0]}">${ic(STATUS_ICON[c[2][0]],13)}<span>${c[1]}</span></span><span class="kan-n">${items.length}</span></div>
      <div class="kan-list">${items.map(projCard).join('')||'<div class="kan-empty">Niets hier — alles bij</div>'}</div>
    </div>`;
  }).join('')}</div>`;
}
function projDienst(){
  const projs=_projects(); const groups={};
  projs.forEach(p=>{ (groups[p.disc]=groups[p.disc]||[]).push(p); });
  const keys=Object.keys(groups).sort((a,b)=>{ const ia=DISC_ORDER.indexOf(a),ib=DISC_ORDER.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib); });
  const html=keys.map(disc=>{
    const items=groups[disc]; const d=DISC[disc]||{br:items[0].br||'blue'};
    return `<div class="dienst-group br-${d.br||items[0].br||'blue'}" data-disc="${esc(disc)}">
      <div class="dienst-head"><span class="dienst-ic">${discMark(disc)}</span><h3>${esc(disc)}</h3><span class="dienst-n">${items.length} ${items.length===1?'project':'projecten'}</span></div>
      <div class="proj-list">${items.map(projRow).join('')}</div>
    </div>`;
  }).join('');
  return html || `<div class="empty"><div class="em-ic">${ic('st_approved',64)}</div><b style="font-family:var(--font-display);font-size:16px;color:var(--ink-2)">Nog geen projecten</b><p style="margin:6px 0 0">Zodra we samen starten, verschijnen je projecten hier.</p></div>`;
}
function panelProjecten(){
  const order=[]; _projects().forEach(p=>{ if(order.indexOf(p.disc)<0) order.push(p.disc); });
  order.sort((a,b)=>{ const ia=DISC_ORDER.indexOf(a),ib=DISC_ORDER.indexOf(b); return (ia<0?99:ia)-(ib<0?99:ib); });
  return hero('blue','Mijn werk · Projecten',
    `Alles wat we <span class="accent">samen${squig()}</span> maken`)
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

function panelSocials(){
  const posts=[['ig','Instagram','yellow','Reel · "Achter de schermen"','Gepland · 14 mei 10:00','sent'],
    ['fb','Facebook','blue','Carrousel · Nieuwe collectie','Gepland · 16 mei 09:00','prog'],
    ['li','LinkedIn','blue','Vacature · "Kom bij ons team"','Gepubliceerd · 8 mei','done'],
    ['tt','TikTok','purple','Trend-video · lentepromo','Concept klaar','wait']];
  return hero('yellow','Mijn werk · Socials',
    `Jouw <span class="accent">socials${squig()}</span>, strak gepland`,
    'De contentkalender van deze maand. Keur posts goed of geef feedback per item.',
    scribble('stralen-geel.png','top:-12px;right:8px;width:124px;transform:rotate(6deg)'))
  +`<div class="mini-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:8px">
    ${[['Volgers','8.940','up','+4,2%'],['Bereik deze maand','62.300','up','+11%'],['Engagement','5,8%','up','+0,9pt'],['Posts gepland','12','flat','=']].map(k=>`
      <div class="kpi br-yellow"><div class="kbar"></div><div class="klab">${k[0]}</div><div class="knum">${k[1]}</div><span class="chip chip-${k[2]==='up'?'up':k[2]==='down'?'down':'flat'}">${ic(k[2],12)} ${k[3]}</span></div>`).join('')}
  </div>
  <div class="section-head"><h2>Contentkalender · mei</h2><span class="count">4 van 12 getoond</span></div>
  <div class="proj-list">
    ${posts.map(p=>{const[lab,cls]=STATUS_LABEL[p[5]];return`
      <div class="proj-row br-${p[2]}" style="cursor:default">
        <span class="bar"></span>
        <span class="pr-main"><span class="pr-disc">${p[1]}</span><span class="pr-name" style="font-size:15px">${p[3]}</span><span style="font-size:12.5px;color:var(--ink-4)">${p[4]}</span></span>
        ${spill(p[5])}
        ${p[5]==='wait'||p[5]==='sent'?'<button class="btn btn-branch btn-sm br-green">Goedkeuren</button><button class="btn btn-outline btn-sm">Feedback</button>':''}
      </div>`}).join('')}
  </div>`;
}

function panelAdvertenties(){
  return hero('orange','Mijn werk · Advertenties',
    `Jouw <span class="accent">campagnes${squig()}</span> die draaien`,
    'Een live overzicht van je advertenties over alle platformen.',
    scribble('krabbel-oranje.png','top:-4px;right:8px;width:120px;transform:rotate(-5deg)'))
  +`<div class="kpi-grid">
    ${[['orange','Advertentie-uitgaven','€ 2.840','up','binnen budget'],['blue','Vertoningen','318K','up','+18%'],['green','Klikken','7.412','up','+12%'],['purple','Leads','143','up','+27%']].map(k=>`
      <div class="kpi br-${k[0]}"><div class="kbar"></div><div class="klab">${k[1]}</div><div class="knum">${k[2]}</div><span class="chip chip-up">${ic('up',12)} ${k[4]}</span></div>`).join('')}
  </div>
  <div class="section-head"><h2>Actieve campagnes</h2><span class="count">3 live</span></div>
  <div class="proj-list">
    ${[['Google Search · Leadgen Q2','blue','€ 1.450 besteed · 89 leads',78],['Meta · Retargeting','blue','€ 820 besteed · 41 leads',64],['TikTok · Lentepromo','purple','€ 570 besteed · 13 leads',92]].map(c=>`
      <div class="proj-row br-${c[1]}" style="cursor:default">
        <span class="bar"></span>
        <span class="pr-main"><span class="pr-name" style="font-size:15px">${c[0]}</span><span style="font-size:13px;color:var(--ink-3)">${c[2]}</span></span>
        <div style="width:160px"><div class="prog" style="height:8px;border-radius:999px;background:var(--paper-3);overflow:hidden"><i style="display:block;height:100%;width:${c[3]}%;background:var(--c);border-radius:999px"></i></div></div>
        <span class="pill pill-prog"><span class="pdot"></span>Live</span>
      </div>`).join('')}
  </div>`;
}

const ADS_ENGINE_URL='https://raw.githack.com/studio27marketing/klantenportaal/main/ads-report-engine.html';
function panelPerformance(){
  const head = hero('purple','Performance', `Jouw <span class="accent">resultaten${squig()}</span> in cijfers`);
  const url = _live() ? (state.perfUrl||null) : null;
  if(url){
    const src = ADS_ENGINE_URL+'?embed=1&data='+encodeURIComponent(url);
    return head
      +`<p class="sdesc" style="margin:-4px 0 16px;max-width:64ch">Je live advertentieresultaten over de afgelopen ~30 dagen — automatisch bijgewerkt vanuit je campagnes (Meta, Google, TikTok &amp; Snapchat).</p>
      <div class="card" style="padding:0;overflow:hidden;border-radius:var(--r-lg,20px)">
        <iframe id="perfFrame" src="${esc(src)}" title="Jouw advertentierapport" loading="lazy" style="width:100%;border:0;display:block;min-height:760px;background:transparent"></iframe>
      </div>
      <p class="fs" style="color:var(--ink-4);margin-top:12px">Zie je nog geen cijfers? Dan lopen je campagnes nog niet of verzamelen ze nog data — zodra er resultaten zijn, verschijnen ze hier vanzelf.</p>`;
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
  let meetHtml;
  if(mt){
    const up=mt.list.filter(m=>m.dt && m.dt.getTime()>=Date.now()-86400000);
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
      <div class="section-head" style="margin-top:0"><h2>Geplande meetings</h2><span class="count">${mt?mt.list.length+' gepland':'2 gepland'}</span></div>
      <div class="meet-list">${meetHtml}</div>
    </div>
    <aside class="card meet-side">
      <h3 class="ms-title">Plan een meeting</h3>
      <label class="ms-label">Wat wil je inplannen?</label>
      <div class="mtype-grid">
        <button class="mtype" onclick="pickMtype(this,'Arne','orange','Nieuw project')"><span class="mt-tx"><b>Nieuw project</b></span></button>
        <button class="mtype" onclick="pickMtype(this,'Ilke','blue','Algemene meeting')"><span class="mt-tx"><b>Algemene meeting</b></span></button>
      </div>
      <div id="meetAgenda" class="np-hidden">
        <div class="meet-who" id="meetWho"></div>
        <div id="meetSlots"></div>
      </div>
    </aside>
  </div>`;
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
function panelNieuwProject(){
  const diensten=Object.keys(NP_OPTIONS);
  return hero('blue','Plannen · Offerte aanvragen',
    `Zin in iets <span class="accent">nieuws${squig()}</span>?`)
  +`<div class="card npform">
    <div class="np-steps" id="npSteps"><span class="np-step on">1</span><span class="np-bar"></span><span class="np-step">2</span><span class="np-bar"></span><span class="np-step">3</span></div>
    <div class="field"><label>Welke dienst heb je in gedachten?</label>
      <select id="npDienst" onchange="npDienst()"><option value="">Kies een dienst…</option>${diensten.map(d=>`<option>${d}</option>`).join('')}</select></div>
    <div class="field np-hidden" id="npField2"><label>Wat heb je ongeveer nodig?</label>
      <select id="npType" onchange="npType()"><option value="">Kies…</option></select></div>
    <div class="field np-hidden" id="npField3"><label>Wanneer wil je graag starten?</label>
      <select id="npWhen"><option>Zo snel mogelijk</option><option>Binnen 1–3 maanden</option><option>Ik ben nog aan het oriënteren</option></select></div>
    <div class="richtprijs br-blue np-hidden" id="npPrice">
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><span class="rp-lab">Richtprijs</span><span class="big" id="npPriceVal" style="color:var(--s27-blue-ink)">—</span></div>
      <div class="disclaimer">${ic('info',16)} Dit is een richtprijs — wij kijken ze persoonlijk na.</div>
    </div>
    <div class="np-actions np-hidden" id="npActions"><button class="btn btn-primary" onclick="submitNieuwProject(this)">Vraag offerte aan ${ic('arrow',16)}</button><button class="btn btn-outline" onclick="goTab('meetings')">Plan eerst een koffietje</button></div>
  </div>`;
}

function panelHuisstijl(){
  const sw=[['Blauw','#3083DC'],['Roze','#F697CE'],['Paars','#9441DB'],['Groen','#12AC4E'],['Oranje','#F66131']];
  const files=(window.S27DATA && S27DATA.huisstijl()); const team=(window.S27DATA && S27DATA.team());
  const fmtBytes=(n)=>{ n=parseInt(n,10)||0; if(!n)return ''; if(n<1024)return n+' B'; if(n<1048576)return Math.round(n/1024)+' KB'; return (n/1048576).toFixed(1)+' MB'; };
  const mimeIc=(m)=>{ m=String(m||''); if(m.indexOf('image')===0)return 'img'; if(m.indexOf('video')===0)return 'video'; return 'doc'; };
  const fileMeta=(f)=>{ const p=[]; const b=fmtBytes(f.size); if(b)p.push(b); if(f.modified){ const d=new Date(f.modified); if(!isNaN(d.getTime()))p.push(d.toLocaleDateString('nl-BE',{day:'numeric',month:'short',year:'numeric'})); } return p.join(' · '); };
  const fileCards = files ? (files.length ? files.map(f=>`<div class="filecard" style="min-width:240px"><div class="ft">${ic(mimeIc(f.mime),20)}</div><div style="flex:1;min-width:0"><div class="fn" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</div><div class="fs">${esc(fileMeta(f))}</div></div><a class="icon-btn" style="width:34px;height:34px" href="${esc(f.url||'#')}" target="_blank" rel="noopener">${ic('download',16)}</a></div>`).join('') : '<div class="fs" style="color:var(--ink-4)">Nog geen bestanden in je Huisstijl-map. Sleep hieronder een bestand om te beginnen.</div>')
    : `<div class="filecard" style="min-width:240px"><div class="ft">${ic('img',20)}</div><div style="flex:1"><div class="fn">logo-tc-fullcolor.svg</div><div class="fs">Vector · 24 KB</div></div><button class="icon-btn" style="width:34px;height:34px">${ic('download',16)}</button></div><div class="filecard" style="min-width:240px"><div class="ft">${ic('img',20)}</div><div style="flex:1"><div class="fn">logo-tc-wit.png</div><div class="fs">PNG · 180 KB</div></div><button class="icon-btn" style="width:34px;height:34px">${ic('download',16)}</button></div>`;
  const teamCards = (team && team.contactpersonen) ? (team.contactpersonen.length ? team.contactpersonen.map(c=>{const nm=((c.voornaam||'')+' '+(c.achternaam||'')).trim()||'Contact';return `<div class="filecard"><div class="ft" style="border-radius:50%;background:var(--s27-blue);color:#fff;font-family:var(--font-display);font-weight:800">${esc(nm.split(' ').map(x=>x[0]).join('').slice(0,2))}</div><div style="flex:1"><div class="fn">${esc(nm)}</div><div class="fs">${esc(c.rol||c.email||'')}</div></div><button class="btn btn-ghost btn-sm">Wijzig</button></div>`;}).join('') : '<div class="fs" style="color:var(--ink-4)">Nog geen contactpersonen.</div>')
    : [['Sarah Janssens','Marketing · hoofdcontact','blue'],['Tom De Cock','Zaakvoerder','green']].map(t=>`<div class="filecard"><div class="ft" style="border-radius:50%;background:var(--s27-${t[2]});color:#fff;font-family:var(--font-display);font-weight:800">${t[0].split(' ').map(x=>x[0]).join('')}</div><div style="flex:1"><div class="fn">${t[0]}</div><div class="fs">${t[1]}</div></div><button class="btn btn-ghost btn-sm">Wijzig</button></div>`).join('');
  return hero('pink','Mijn bedrijf · Huisstijl',
    `Jouw <span class="accent">merk${squig()}</span> &amp; bestanden`,
    'Alles wat we nodig hebben om consistent voor je te werken, netjes bij elkaar.',
    scribble('krabbel-roze.png','top:-4px;right:8px;width:120px;transform:rotate(-6deg)'))
  +`<div class="setsec">
    <h3>Huisstijl-bestanden</h3><p class="sdesc">Alle bestanden uit je gedeelde Huisstijl-map op Google Drive — logo's, fonts, templates. Altijd up-to-date.</p>
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
  </div>
  <div class="setsec">
    <h3>Team &amp; contactpersonen</h3><p class="sdesc">Je contactpersonen beheer je voortaan centraal bij <b>Instellingen</b> — daar voeg je collega's toe (mét portaaltoegang), wijzig je gegevens of verwijder je iemand.</p>
    <button class="btn btn-outline btn-sm" onclick="goTab('instellingen')">${ic('arrow',15)} Naar Instellingen</button>
  </div>`;
}

function panelFacturatie(){
  const b=(window.S27DATA && S27DATA.bedrijf())||{};
  const demo=!_live();
  return hero('green','Mijn bedrijf · Facturatie',
    `Jouw <span class="accent">facturen${squig()}</span> op een rij`,
    'Transparant en zonder kleine lettertjes — je weet exact waarvoor je betaalt.',
    scribble('krabbel-groen.png','top:-4px;right:8px;width:120px;transform:rotate(-5deg)'))
  +`<div class="setsec">
    <h3>Facturatiegegevens</h3>
    <p class="sdesc">Deze gegevens lopen rechtstreeks gelijk met onze administratie. Pas je iets aan, dan verwerken Ilke en Arne het meteen.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px">
      <div class="field"><label>Ondernemingsnummer / BTW</label><input id="facBtw" value="${esc(b.btw||(demo?'BE 0123.456.789':''))}" placeholder="BE 0xxx.xxx.xxx"></div>
      <div class="field"><label>Facturatie-e-mail</label><input id="facEmail" value="${esc(b.facturatie_email||(demo?'boekhouding@testclient.be':''))}" placeholder="boekhouding@…"></div>
      <div class="field" style="grid-column:1/-1"><label>Facturatie-opmerkingen</label><textarea id="facOpm" rows="2" style="font-family:var(--font-body);font-size:14px;padding:11px 13px;border:1px solid var(--line);border-radius:var(--r-sm);resize:vertical;outline:none" placeholder="bv. PO-nummer op elke factuur, kwartaalfacturatie…">${esc(b.facturatie_opmerkingen||(demo?'Graag steeds ons PO-nummer op de factuur.':''))}</textarea></div>
    </div>
    <div style="margin-top:14px"><button class="btn btn-branch br-green btn-sm" onclick="saveBedrijfGegevens(this)">${ic('check',15)} Gegevens opslaan</button></div>
  </div>
  <div class="setsec">
    <h3>Facturen</h3><p class="sdesc">Algemeen overzicht — filter optioneel per project.</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${[['F-2026-041','Maandelijkse marketing · mei','€ 1.850','done'],['F-2026-038','Bedrijfsfilm · 1e schijf','€ 1.225','done'],['F-2026-045','Advertentiebudget Q2','€ 900','wait']].map(f=>{const[lab,cls]=STATUS_LABEL[f[3]==='wait'?'wait':'done'];return`
      <div class="filecard"><div class="ft">${ic('doc',20)}</div><div style="flex:1;min-width:0"><div class="fn">${f[0]}</div><div class="fs">${f[1]}</div></div><b style="font-family:var(--font-display);display:inline-block;min-width:84px;text-align:right;margin-right:14px">${f[2]}</b><span class="pill ${cls}" style="min-width:104px;justify-content:center"><span class="pdot"></span>${f[3]==='wait'?'Openstaand':'Betaald'}</span><button class="icon-btn" style="width:34px;height:34px;margin-left:8px">${ic('download',16)}</button></div>`}).join('')}
    </div>
  </div>`;
}

function contactRow(c){
  const nm=((c.voornaam||'')+' '+(c.achternaam||'')).trim()||'Contactpersoon';
  const init=(nm.split(/\s+/).map(x=>x[0]).join('').slice(0,2)||'?').toUpperCase();
  const sub=[c.rol||c.email||'', c.gsm||'', (c.voorkeur&&c.voorkeur!=='Geen')?('meldingen: '+c.voorkeur):''].filter(Boolean).join(' · ');
  return `<div class="contact-row" data-cid="${esc(c.id||'')}"><span class="cr-av" style="background:var(--s27-indigo,#5B5BD6)">${esc(init)}</span><div class="cr-tx"><b>${esc(nm)}</b><span>${esc(sub)}</span></div><button class="btn btn-ghost btn-sm" onclick="editContact('${esc(c.id||'')}')">Wijzig</button><button class="icon-btn" style="width:32px;height:32px;margin-left:6px" title="Verwijderen" onclick="removeContact('${esc(c.id||'')}',this)">${ic('trash',15)}</button></div>`;
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
  const t=(window.S27DATA && S27DATA.team())||{}; const c=(t.contactpersonen&&t.contactpersonen[0])||{}; const vk=c.voorkeur||'Geen'; const demo=!_live();
  const contacts=(t.contactpersonen||[]);
  const demoContacts=[{voornaam:'Sarah',achternaam:'Janssens',rol:'Marketing · hoofdcontact',gsm:'+32 478 12 34 56',voorkeur:'WhatsApp',id:'demo1'},{voornaam:'Tom',achternaam:'De Cock',rol:'Zaakvoerder',email:'tom@testclient.be',id:'demo2'}];
  const contactsHTML = contacts.length ? contacts.map(contactRow).join('') : (demo ? demoContacts.map(contactRow).join('') : '<div class="fs" style="color:var(--ink-4)">Nog geen contactpersonen toegevoegd — voeg je eerste collega toe.</div>');
  return hero('indigo','Mijn bedrijf · Instellingen',
    `Jouw <span class="accent">voorkeuren${squig()}</span>`)
  +`<div class="setsec">
    <h3>Notificatievoorkeuren</h3><p class="sdesc">Hoe en wanneer we je op de hoogte houden.</p>
    <div class="set-grid">
      <div class="field"><label>Meldingen via</label><select onchange="saveNotifPref(this)">${['Geen','WhatsApp','E-mail','Beide'].map(o=>`<option ${o===vk?'selected':''}>${o}</option>`).join('')}</select></div>
      <div class="field"><label>GSM / WhatsApp-nummer</label><input value="${esc(c.gsm||(demo?'+32 478 12 34 56':''))}" placeholder="+32 4xx xx xx xx"></div>
    </div>
  </div>
  <div class="setsec">
    <h3>Contactpersonen van je bedrijf</h3><p class="sdesc">Iedereen die hier staat kan inloggen én collega's toevoegen of verwijderen. Voeg gerust je hele team toe.</p>
    <div class="contact-list" id="bedrijfContactList">${contactsHTML}</div>
    <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="addContact()">${ic('upload',15)} Persoon toevoegen</button>
    <div id="contactFormHost"></div>
  </div>
  <div class="setsec">
    <h3>Jouw contactpersonen bij Studio 27</h3><p class="sdesc">Drie vaste gezichten — altijd bereikbaar.</p>
    <div class="contact-list">
      ${[['Ilke Meeusen','Accountmanager','blue'],['Arne Goetschalckx','Vertegenwoordiger','orange'],['Vincent Verleije','Zaakvoerder','purple']].map(c=>`
      <div class="contact-row"><span class="cr-av" style="background:var(--s27-${c[2]})">${c[0].split(' ').map(x=>x[0]).join('')}</span><div class="cr-tx"><b>${c[0]}</b><span>${c[1]}</span></div><button class="btn btn-ghost btn-sm br-${c[2]}">${ic('msg',15)} Bericht</button></div>`).join('')}
    </div>
  </div>
  <div class="accordion" style="margin-top:8px"><button class="acc-head" onclick="toggleAcc(this)">Geavanceerd <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="acc-body"><div style="padding:0 18px 18px;color:var(--ink-3);font-size:14px;display:flex;flex-direction:column;gap:12px"><label class="remember"><input type="checkbox" checked> Wekelijkse samenvatting per mail</label><label class="remember"><input type="checkbox"> Toon mij bèta-functies van het portaal</label><button class="btn btn-ghost btn-sm" style="color:var(--s27-orange-ink);align-self:flex-start">Account-data exporteren</button></div></div></div>
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
      <div class="bubble"><div class="who">${m[1]}</div><div class="tx">${m[3]}</div><div class="tm">${m[4]}</div>
        <div class="react"><button>👍</button><button>❤️</button><button>🎉</button><button>🙌</button></div></div>
    </div>`).join(''):'<div class="empty" style="padding:30px 10px"><p>Nog geen berichten — stuur ons gerust iets!</p></div>'}
  </div>
  <div class="chat-input"><input placeholder="Schrijf een bericht…" onkeydown="if(event.key==='Enter')sendChat(this)"><button class="chat-send" onclick="sendChat(this.previousElementSibling)">${ic('send',18)}</button></div>`;
}

/* =========================================================
   PROJECT DETAIL MODAL
   ========================================================= */
function scheduleBlock(p){
  if(!p || p.status!=='todo') return '';
  return `<div class="setsec" style="margin-top:18px"><h3 style="display:flex;align-items:center;gap:8px">${ic('st_plan',18)} Plan je moment</h3><p class="sdesc">Kies een tijdslot dat past in de agenda van je Studio 27-contact — wij sturen meteen een agenda-uitnodiging met Meet-link of locatie.</p><div id="s27-plan-${esc(p.id)}"><button class="btn btn-branch br-${p.br} btn-sm" onclick="loadPlanSlots('${esc(p.id)}')">Toon beschikbare momenten →</button></div></div>`;
}
const REVIEW_CHANNEL_OPTS = [['portaal','via het portaal'],['whatsapp','via WhatsApp'],['email','via e-mail'],['telefoon','telefonisch'],['meeting','in een meeting']].map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join('');
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
    {t:'Montage',st:'wait',files:[['Montage v1 — volledige film','MP4 · 02:14','video'],['Korte teaser (15s)','MP4 · 00:15','video']]},
    {t:'Fotografie',st:'wait',files:[['Still — openingsshot','JPG · hoge resolutie','img'],['Still — teamportret','JPG · hoge resolutie','img']]},
    {t:'Audio &amp; muziek',st:'done',files:[['Soundtrack — gelicentieerd','MP3','doc']]},
  ] : [
    {t:'Strategiedeck',st:'wait',files:[['Strategiedeck v1.pdf','PDF · 24 pagina\'s','doc']]},
    {t:'Vooronderzoek',st:'done',files:[['Marktanalyse.pdf','PDF · 12 pagina\'s','doc']]},
  ];
  let approved = isVideo ? ['Concept &amp; scenario','Locatie &amp; opnameplanning','Audio &amp; muziekselectie'] : ['Marktonderzoek &amp; analyse','Positioneringsworkshop'];
  if(det){
    if(det.deliverables && det.deliverables.length){
      SUBTASKS=[{t:'Bestanden',st:p.status==='done'?'done':'wait',files:det.deliverables.map(d=>[esc(d.label),esc((d.url||'').replace(/^https?:\/\//,'').slice(0,44)),d.type==='video'?'video':d.type==='img'?'img':'doc',esc(d.url||'')])}];
    } else if(det.subtasks && det.subtasks.length){
      SUBTASKS=det.subtasks.map(s=>({t:esc(s.naam),st:s.status==='done'?'done':'wait',files:[]}));
    }
    if(det.subtasks && det.subtasks.length){ approved=det.subtasks.filter(s=>s.status==='done').map(s=>esc(s.naam)); }
  }

  const overview=`<div class="mpane active" data-mpane="overzicht">
    ${needsFeedback?`<div class="fb-banner"><div class="fb-ic">${ic('spark',20)}</div><div class="fb-tx"><b>We wachten op jouw akkoord</b><p>Bekijk de deliverable en laat ons weten of we groen licht hebben.</p></div><div class="fb-act"><button class="btn btn-branch btn-sm br-green" onclick="approveAll(this)">Goedkeuren</button><button class="btn btn-outline btn-sm" onclick="switchModalTab('deliverables')">Bekijk bestanden</button></div></div>`:''}
    ${scheduleBlock(p)}
    <h4 style="font-family:var(--font-display);font-size:15px;margin:0 0 8px">Tijdlijn</h4>
    <div style="display:flex;flex-direction:column;gap:0">
      ${[['Briefing & kick-off','done'],['Concept & scenario','done'],['Productie / montage','done'],['Jouw review','wait'],['Oplevering','todo']].map((t,i,a)=>`
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="display:flex;flex-direction:column;align-items:center"><span style="width:18px;height:18px;border-radius:50%;flex:none;background:${t[1]==='done'?'var(--s27-green)':t[1]==='wait'?'var(--s27-orange)':'var(--paper-3)'};display:flex;align-items:center;justify-content:center;color:#fff">${t[1]==='done'?ic('check',11):''}</span>${i<a.length-1?'<span style="width:2px;height:26px;background:var(--line)"></span>':''}</div>
          <div style="padding-bottom:14px"><b style="font-family:var(--font-display);font-size:14px;color:${t[1]==='todo'?'var(--ink-4)':'var(--ink)'}">${t[0]}</b></div>
        </div>`).join('')}
    </div>
    <h4 style="font-family:var(--font-display);font-size:15px;margin:24px 0 10px">Goedgekeurde taken</h4>
    <div class="approved-list">
      ${approved.map(t=>`<div class="approved-row"><span class="check-circ">${ic('check',13)}</span><span>${t}</span></div>`).join('')}
    </div>
  </div>`;

  const deliverables=`<div class="mpane" data-mpane="deliverables">
    <p class="deliv-intro">Hier staan al je bestanden. Keur per stuk goed of geef feedback — we noteren er ook bij via welke weg je het doorgaf, zodat niets verloren gaat.</p>
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
      <div class="detail-titles"><h1>${p.name}</h1><div class="detail-sub">${p.disc}</div></div>
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
        <div class="dc-head">${ic('msg',16)} Projectchat <span class="dc-sub">${chatClosed?'afgerond':'met je team'}</span></div>
        <div class="dc-body" id="dcBody">${chatClosed?`<div class="empty" style="padding:22px 14px;text-align:center"><div class="em-ic">${ic('st_approved',40)}</div><b style="font-family:var(--font-display);font-size:14.5px;color:var(--ink-2)">Dit project is afgerond</b><p style="margin:6px 0 0;font-size:13px;color:var(--ink-3)">De projectchat is gesloten — het team kijkt hier niet meer mee. Een dringende vraag? Stuur ze rechtstreeks naar Ilke.</p><button class="btn btn-branch br-blue btn-sm" style="margin-top:14px" onclick="dringendeVraag('${esc(p.id)}')">${ic('spark',15)} Dringende vraag aan Ilke</button></div>`:chatHTML(id)}</div>
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
  meetings:panelMeetings, nieuwproject:panelNieuwProject,
  huisstijl:panelHuisstijl, facturatie:panelFacturatie, instellingen:panelInstellingen,
};
const TAB_BRANCH={start:'blue',berichten:'blue',projecten:'blue',diensten:'blue',socials:'yellow',advertenties:'orange',performance:'purple',meetings:'blue',nieuwproject:'blue',huisstijl:'pink',facturatie:'green',instellingen:'indigo'};
const TAB_GROUP={projecten:'werk',diensten:'werk',socials:'werk',advertenties:'werk',performance:'werk',meetings:'plannen',nieuwproject:'plannen',huisstijl:'bedrijf',facturatie:'bedrijf',instellingen:'bedrijf'};
