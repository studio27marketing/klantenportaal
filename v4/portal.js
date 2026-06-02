/* ============================================================
   Studio 27 — Klantenportaal · app logic
   ============================================================ */
let currentTab='start';

/* ---------- Login ---------- */
function doLogin(){
  const login=document.getElementById('login');
  login.style.transition='opacity .35s var(--ease-out)';
  login.style.opacity='0';
  setTimeout(()=>{
    login.classList.add('hide');
    const loader=document.getElementById('loader');
    loader.style.opacity='1';
    loader.classList.add('show');
    // build the dashboard underneath while the loader plays
    document.getElementById('app').classList.add('show');
    window.scrollTo(0,0);
    setTimeout(()=>{
      loader.style.opacity='0';
      setTimeout(()=>{
        loader.classList.remove('show');
        if(!localStorage.getItem('s27_tour_done')){ setTimeout(openTour,400); }
      },460);
    },1950);
  },360);
}
function logout(){
  document.getElementById('app').classList.remove('show');
  const login=document.getElementById('login');
  login.classList.remove('hide');
  login.style.opacity='1';
}

/* ---------- Tabs / panels ---------- */
const SECTION_LABEL={start:'Start',berichten:'Berichten',projecten:'Projecten',socials:'Socials',advertenties:'Advertenties',performance:'Resultaten',diensten:'Onze diensten',meetings:'Meetings',nieuwproject:'Nieuw project',huisstijl:'Huisstijl & bestanden',facturatie:'Facturatie',instellingen:'Instellingen'};
function renderPanel(name){
  const page=document.getElementById('page');
  page.innerHTML=`<div class="panel active br-${TAB_BRANCH[name]||'blue'}" data-screen-label="${name}">${PANELS[name]()}</div>`;
  window.scrollTo({top:0,behavior:'auto'});
}
function goTab(name){
  if(!PANELS[name])return;
  currentTab=name;
  renderPanel(name);
  // sidebar active state
  document.querySelectorAll('.sb-item').forEach(t=>t.classList.remove('active'));
  const item=document.querySelector(`.sb-item[data-tab="${name}"]`);
  if(item)item.classList.add('active');
  // breadcrumb
  const crumb=document.getElementById('crumbSection');
  if(crumb)crumb.textContent=SECTION_LABEL[name]||name;
  const tt=document.getElementById('topbarTitle');
  if(tt)tt.textContent=SECTION_LABEL[name]||name;
  document.querySelectorAll('.topbar [data-topnav]').forEach(t=>t.classList.toggle('topnav-on',t.dataset.topnav===name));
  closeSidebar();
}
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const open=sb.classList.toggle('open');
  document.getElementById('sbScrim').classList.toggle('show',open);
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sbScrim').classList.remove('show');
}

/* ---------- Topbar dropdowns ---------- */
function toggleSwitch(e){
  e.stopPropagation();
  const m=document.getElementById('switchMenu');
  const sw=document.getElementById('clientSwitch');
  const open=m.style.display==='block';
  m.style.display=open?'none':'block';
  sw.classList.toggle('open',!open);
}
function toggleNotif(e){
  e.stopPropagation();
  document.getElementById('notifPanel').classList.toggle('show');
}
function markAllSeen(){
  document.querySelectorAll('#notifPanel .notif').forEach(n=>{n.classList.add('seen');const u=n.querySelector('.unread');if(u)u.remove();});
  const badge=document.querySelector('#bellBtn .badge'); if(badge)badge.style.display='none';
}

document.addEventListener('click',(e)=>{
  if(!e.target.closest('.client-switch-wrap')){document.getElementById('switchMenu').style.display='none';document.getElementById('clientSwitch').classList.remove('open');}
  if(!e.target.closest('#notifPanel')&&!e.target.closest('#bellBtn'))document.getElementById('notifPanel').classList.remove('show');
});

/* ---------- Projects filter ---------- */
function filterProjects(status,btn){
  document.querySelectorAll('#filterbar .fpill').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#projList .proj-row').forEach(r=>{
    r.style.display=(status==='all'||r.dataset.status===status)?'flex':'none';
  });
}

/* ---------- Project detail (standalone page + breadcrumb) ---------- */
function openProject(id, from){
  const p=(typeof PROJECTS!=='undefined')?PROJECTS.find(x=>x.id===id):null;
  const page=document.getElementById('page');
  const f=(from==='berichten')?'berichten':'projecten';
  page.innerHTML=`<div class="panel active br-${p?p.br:'blue'}" data-screen-label="projectdetail">${buildModal(id,f)}</div>`;
  window.scrollTo({top:0,behavior:'auto'});
  document.querySelectorAll('.sb-item').forEach(t=>t.classList.remove('active'));
  const item=document.querySelector(`.sb-item[data-tab="${f}"]`); if(item)item.classList.add('active');
  const crumb=document.getElementById('crumbSection');
  const lab=(f==='berichten')?'Berichten':'Projecten';
  if(crumb&&p)crumb.innerHTML=`<a class="crumb-link" onclick="goTab('${f}')">${lab}</a><span class="crumb-mid">/</span>${p.name}`;
  const tt=document.getElementById('topbarTitle');
  if(tt&&p)tt.textContent=p.name;
  closeSidebar();
}
function setProjView(v,btn){
  document.querySelectorAll('#projView .seg-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('projViewBody').innerHTML = (v==='kanban')?projKanban():projDienst();
}
function closeModal(){ goTab('projecten'); }
function switchModalTab(name){
  const c=document.querySelector('.detail')||document.querySelector('.modal'); if(!c)return;
  c.querySelectorAll('.detail-tabs .mtab').forEach(t=>t.classList.remove('active'));
  if(name==='chat'){
    c.classList.add('show-chat');
    const ct=c.querySelector('.mtab-chat'); if(ct)ct.classList.add('active');
    const inp=c.querySelector('.detail-chat input'); if(inp)inp.focus();
    return;
  }
  c.classList.remove('show-chat');
  const map={overzicht:0,deliverables:1,feedback:2};
  c.querySelectorAll('.detail-main .mpane').forEach(p=>p.classList.remove('active'));
  const tabs=[...c.querySelectorAll('.detail-tabs .mtab:not(.mtab-chat)')];
  if(tabs[map[name]])tabs[map[name]].classList.add('active');
  const pane=c.querySelector(`.mpane[data-mpane="${name}"]`); if(pane)pane.classList.add('active');
}
function approveItem(btn){
  btn.outerHTML=`<span class="pill pill-done"><span class="pdot"></span>Goedgekeurd</span>`;
}
function approveAll(btn){
  const banner=document.querySelector('.fb-banner');
  if(banner){banner.style.animation='none';banner.innerHTML=`<div class="fb-ic" style="background:var(--s27-green)">${ic('check',20)}</div><div class="fb-tx"><b>Bedankt — goedgekeurd!</b><p>We zetten meteen de volgende stap. Je hoort van ons.</p></div>`;banner.style.background='var(--s27-green-soft)';banner.style.borderColor='color-mix(in oklab,var(--s27-green) 40%,transparent)';}
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();if(document.getElementById('tourScrim').classList.contains('show'))endTour(false);}});

/* ---------- Chat ---------- */
function sendChat(input){
  const tx=input.value.trim(); if(!tx)return;
  const list=document.getElementById('chatList'); if(!list)return;
  const me=document.createElement('div'); me.className='msg me';
  me.innerHTML=`<div class="bubble"><div class="who">Jij</div><div class="tx">${escapeHtml(tx)}</div><div class="tm">nu</div><div class="react"><button>👍</button><button>❤️</button><button>🎉</button></div></div>`;
  list.appendChild(me); input.value='';
  list.scrollTop=list.scrollHeight;
  setTimeout(()=>{
    const reply=document.createElement('div'); reply.className='msg flash';
    reply.innerHTML=`<span class="av" style="background:var(--s27-blue)">IM</span><div class="bubble"><div class="who">Ilke Meeusen</div><div class="tx">Top, ik neem het mee!</div><div class="tm">nu</div><div class="react"><button>👍</button><button>❤️</button></div></div>`;
    list.appendChild(reply); list.scrollTop=list.scrollHeight;
    setTimeout(()=>reply.classList.remove('flash'),700);
  },1100);
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ---------- Accordions / scheduling / options ---------- */
function toggleAcc(btn){btn.classList.toggle('open');btn.nextElementSibling.classList.toggle('open');}
function selectDay(el){el.parentElement.querySelectorAll('.calday').forEach(d=>d.classList.remove('sel'));el.classList.add('sel');}
function selectSlot(el){if(el.disabled)return;el.parentElement.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel'));el.classList.add('sel');}
function selectQopt(el){el.parentElement.querySelectorAll('.qopt').forEach(q=>q.classList.remove('sel'));el.classList.add('sel');}
function selectOpt(el){el.parentElement.querySelectorAll('.optcard').forEach(o=>o.classList.remove('sel'));el.classList.add('sel');}
function selMtype(el){el.parentElement.querySelectorAll('.mtype').forEach(b=>b.classList.remove('sel'));el.classList.add('sel');}
function pickMtype(el,who,color,type){
  el.parentElement.querySelectorAll('.mtype').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  const ag=document.getElementById('meetAgenda'); if(ag)ag.classList.remove('np-hidden');
  const w=document.getElementById('meetWho');
  if(w)w.innerHTML=`<span class="mw-av" style="background:var(--s27-${color})">${who[0]}</span><span class="mw-tx">${type}<b>met ${who}</b></span>`;
  const c=document.getElementById('meetConfirm'); if(c)c.textContent='Bevestig afspraak met '+who;
}
function filterDienst(disc,btn){
  document.querySelectorAll('.proj-filter .fchip').forEach(c=>c.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const body=document.getElementById('projViewBody'); if(!body)return;
  body.querySelectorAll('.dienst-group').forEach(g=>{g.style.display=(disc==='all'||g.dataset.disc===disc)?'':'none';});
}
function goDienst(disc){
  goTab('projecten');
  const chip=document.querySelector(`.proj-filter .fchip[data-disc="${disc}"]`);
  filterDienst(disc,chip);
}

/* ---------- Chatbot ---------- */
function toggleBot(){
  const p=document.getElementById('botPanel'),f=document.getElementById('botFab');
  const open=p.classList.toggle('show');
  f.style.display=open?'none':'flex';
}
const BOT_ANSWERS={
  'Wanneer is mijn volgende meeting?':'Je volgende meeting is de <b>maandelijkse rapportage op wo 14 mei om 10:00</b> via Google Meet, samen met Ilke en Arne. Wil je dat ik ze verzet?',
  'Status van mijn website?':'Je <b>nieuwe website &amp; webshop</b> staat op <b>62%</b> — momenteel in productie. De staging-link verwacht je tegen eind volgende week.',
  'Hoe geef ik feedback?':'Open een project, ga naar het tabblad <b>Feedback</b> of <b>Deliverables</b>, en klik op "Feedback geven". Per video of foto kan je apart goedkeuren of opmerkingen achterlaten. Alles passen we gratis aan!',
};
function botAsk(btn){ pushBot(btn.textContent,'user'); const q=btn.textContent; document.getElementById('botChips').style.display='none'; botReply(q); }
function botSend(){
  const inp=document.getElementById('botInput'); const tx=inp.value.trim(); if(!tx)return;
  pushBot(tx,'user'); inp.value=''; botReply(tx);
}
function pushBot(text,who){
  const m=document.getElementById('botMsgs');
  const d=document.createElement('div'); d.className='bmsg '+who; d.innerHTML=who==='user'?escapeHtml(text):text;
  m.appendChild(d); m.scrollTop=m.scrollHeight;
}
function botReply(q){  const m=document.getElementById('botMsgs');
  const typing=document.createElement('div'); typing.className='typing'; typing.innerHTML='<i></i><i></i><i></i>';
  m.appendChild(typing); m.scrollTop=m.scrollHeight;
  setTimeout(()=>{
    typing.remove();
    const ans=BOT_ANSWERS[q]||'Goeie vraag! Ik verbind je even door met <b>Ilke</b>, je accountmanager — zij antwoordt je zo persoonlijk.';
    pushBot(ans,'bot');
    if(!BOT_ANSWERS[q]){setTimeout(()=>pushBot('💬 <i>Ilke is toegevoegd aan dit gesprek.</i>','bot'),700);}
  },1200);
}

/* ---------- Onboarding tour ---------- */
const TOUR=[
  {t:'Jouw startscherm',b:'Hier vind je altijd wat er voor jóu klaarstaat — reviews, feedback en meetings. Begin hier elke dag.',target:'.sb-item[data-tab="start"]'},
  {t:'Al je werk, gebundeld',b:'In de zijbalk staat alles altijd zichtbaar: je projecten, socials, advertenties, resultaten én onze diensten. Eén klik, geen zoeken.',target:'.sb-item[data-tab="projecten"]'},
  {t:'Altijd in contact',b:'Vragen? Onze slimme assistent helpt je meteen op weg en schakelt zo nodig door naar een echt mens.',target:'#botFab'},
  {t:'Plan vlot een moment',b:'Een meeting nodig? Prik zelf een vrij tijdslot. Wij staan klaar — vrijblijvend.',target:'.sb-item[data-tab="meetings"]'},
];
let tourIdx=0;
function openTour(){ tourIdx=0; goTab('start'); document.getElementById('spotlight').classList.add('show'); document.getElementById('tourDialog').classList.add('show'); renderTour(); }
function renderTour(){
  const s=TOUR[tourIdx];
  // on mobile, open the drawer when the step points at a sidebar item
  if(window.innerWidth<=980){
    const sb=document.getElementById('sidebar');
    if(s.target.indexOf('.sb-item')===0) sb.classList.add('open'); else sb.classList.remove('open');
  }
  document.getElementById('tourStep').textContent=`Stap ${tourIdx+1} van ${TOUR.length}`;
  document.getElementById('tourTitle').textContent=s.t;
  document.getElementById('tourBody').textContent=s.b;
  document.getElementById('tourDots').innerHTML=TOUR.map((_,i)=>`<i class="${i===tourIdx?'on':''}"></i>`).join('');
  document.getElementById('tourPrev').style.visibility=tourIdx===0?'hidden':'visible';
  document.getElementById('tourNext').textContent=tourIdx===TOUR.length-1?'Aan de slag!':'Volgende';
  // position spotlight + dialog
  const el=document.querySelector(s.target);
  const sp=document.getElementById('spotlight'), dg=document.getElementById('tourDialog');
  if(el){
    const r=el.getBoundingClientRect();
    const pad=8;
    sp.style.left=(r.left-pad)+'px'; sp.style.top=(r.top-pad)+'px';
    sp.style.width=(r.width+pad*2)+'px'; sp.style.height=(r.height+pad*2)+'px';
    // dialog placement: prefer below, else above, else beside
    let top=r.bottom+16; if(top+220>window.innerHeight)top=Math.max(16,r.top-236);
    let left=Math.min(Math.max(16,r.left),window.innerWidth-396);
    if(window.innerWidth<=980 && s.target.indexOf('.sb-item')===0){ left=Math.min(280,window.innerWidth-360); top=Math.min(r.top,window.innerHeight-240); }
    dg.style.top=top+'px'; dg.style.left=left+'px';
  }
}
function tourNav(dir){ tourIdx+=dir; if(tourIdx>=TOUR.length){endTour(true);return;} if(tourIdx<0)tourIdx=0; renderTour(); }
function endTour(remember){
  document.getElementById('tourScrim').classList.remove('show');
  document.getElementById('spotlight').classList.remove('show');
  document.getElementById('tourDialog').classList.remove('show');
  if(window.innerWidth<=980)closeSidebar();
  if(remember)localStorage.setItem('s27_tour_done','1');
}
window.addEventListener('resize',()=>{if(document.getElementById('tourDialog').classList.contains('show'))renderTour();});

/* ---------- Init (after all declarations) ---------- */
function initSbGlass(){
  const nav=document.querySelector('.sb-nav'); if(!nav)return;
  let g=nav.querySelector('.sb-glass');
  if(!g){g=document.createElement('div');g.className='sb-glass';g.style.position='absolute';nav.prepend(g);}
  const move=(el)=>{ if(!el){g.style.opacity='0';return;} g.style.opacity='1'; g.style.top=el.offsetTop+'px'; g.style.height=el.offsetHeight+'px'; };
  const toActive=()=>move(nav.querySelector('.sb-item.active'));
  nav.querySelectorAll('.sb-item').forEach(it=>{
    it.addEventListener('mouseenter',()=>move(it));
    it.addEventListener('click',()=>setTimeout(toActive,40));
  });
  nav.addEventListener('mouseleave',toActive);
  toActive();
}
document.getElementById('overlays').innerHTML = buildOverlays();
goTab('start');
initSbGlass();
