/* ============================================================
   Studio 27 Klantenportaal, Tweaks
   Vanilla host-protocol panel. Three expressive controls that
   reshape the whole feel (not pixel-pushing).
   ============================================================ */
(function(){
  const DEFAULTS = { sfeer:'fris', materiaal:'glas', accent:'studio' };
  let T = load();

  /* ---- presets ---- */
  const SFEER = {
    fris:   { /* current cool glass canvas */
      grad:'linear-gradient(150deg,#FBF8F3 0%,#F3ECF6 52%,#E9F1FC 100%)',
      paper2:'#FAF7F2' },
    warm:   { grad:'linear-gradient(150deg,#FBF4EC 0%,#F7ECE4 55%,#FCEFE6 100%)',
      paper2:'#FBF4EC' },
    koel:   { grad:'linear-gradient(160deg,#F4F6FB 0%,#EEF1F8 55%,#F6F8FC 100%)',
      paper2:'#F4F6FB' },
    nacht:  { grad:'linear-gradient(155deg,#1b1620 0%,#221a2b 52%,#161a26 100%)',
      paper2:'#241a26', dark:true },
  };
  const MAT = {
    plat:  { fill:'rgba(255,255,255,.92)', fillS:'rgba(255,255,255,.97)', blur:'0px',  sh:'0 1px 2px rgba(60,40,80,.08)', shl:'0 4px 10px rgba(60,40,80,.10)', edge:'rgba(150,120,150,.18)' },
    glas:  { fill:'rgba(255,255,255,.60)', fillS:'rgba(255,255,255,.78)', blur:'16px', sh:'0 8px 24px rgba(60,40,80,.09)', shl:'0 18px 44px rgba(60,40,80,.16)', edge:'rgba(255,255,255,.85)' },
    vol:   { fill:'rgba(255,255,255,.38)', fillS:'rgba(255,255,255,.58)', blur:'30px', sh:'0 14px 40px rgba(60,40,80,.18)', shl:'0 28px 70px rgba(60,40,80,.26)', edge:'rgba(255,255,255,.95)' },
  };
  const ACCENT = {
    studio:  { c:'#3083DC', ink:'#1F5FA8', soft:'rgba(48,131,220,.12)', c2:'#9441DB', ink2:'#6B2BA8' },
    aubergine:{ c:'#7A3E8E', ink:'#5A2C6B', soft:'rgba(122,62,142,.14)', c2:'#C56FA8', ink2:'#9C4F82' },
    bos:     { c:'#1E9E6A', ink:'#147A50', soft:'rgba(30,158,106,.14)', c2:'#3083DC', ink2:'#1F5FA8' },
    inkt:    { c:'#2C3650', ink:'#1B2236', soft:'rgba(44,54,80,.12)', c2:'#5B6B8C', ink2:'#3E4A66' },
  };

  function apply(){
    const r = document.documentElement.style;
    const s = SFEER[T.sfeer]||SFEER.fris, m = MAT[T.materiaal]||MAT.glas, a = ACCENT[T.accent]||ACCENT.studio;
    // sfeer
    r.setProperty('--glass-grad', s.grad);
    r.setProperty('--s27-paper-2', s.paper2);
    document.documentElement.classList.toggle('tw-dark', !!s.dark);
    // materiaal
    r.setProperty('--glass-fill', m.fill);
    r.setProperty('--glass-fill-strong', m.fillS);
    r.setProperty('--glass-border', m.edge);
    r.setProperty('--glass-sh', m.sh);
    r.setProperty('--glass-sh-lg', m.shl);
    r.setProperty('--tw-blur', m.blur);
    // accent
    r.setProperty('--s27-blue', a.c);
    r.setProperty('--s27-blue-ink', a.ink);
    r.setProperty('--s27-blue-soft', a.soft);
    r.setProperty('--s27-purple', a.c2);
    r.setProperty('--s27-purple-ink', a.ink2);
    r.setProperty('--grad-bp', `linear-gradient(120deg,${a.c},${a.c2})`);
  }

  /* blur is applied through a class hook so we can retarget the few blurred panels */
  function injectBlurHook(){
    const st=document.createElement('style'); st.id='tw-blur-style';
    st.textContent=`.sidebar,.topbar,.login-card,.modal,.notif-panel,.bot-panel,.switch-menu{
      -webkit-backdrop-filter:saturate(150%) blur(var(--tw-blur,16px))!important;backdrop-filter:saturate(150%) blur(var(--tw-blur,16px))!important;}
      html.tw-dark{--ink:#F4EEF4;--ink-2:#D9CEDA;--ink-3:#AFA2B2;--ink-4:#8A7E8E;--s27-paper:#241a26;--s27-paper-3:#2E2233;--line:rgba(255,255,255,.12);}
      html.tw-dark body{color:var(--ink);}
      html.tw-dark .topbar-title,html.tw-dark .sb-item,html.tw-dark .crumb-section{color:var(--ink);}`;
    document.head.appendChild(st);
  }

  function load(){ try{ return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('s27_tweaks')||'{}')); }catch(e){ return Object.assign({},DEFAULTS); } }
  function save(){ localStorage.setItem('s27_tweaks', JSON.stringify(T)); }
  function set(k,v){ T[k]=v; save(); apply(); window.parent.postMessage({type:'__edit_mode_set_keys',edits:{[k]:v}},'*'); syncUI(); }

  /* ---- panel UI ---- */
  let panel;
  const SEG = (key,opts)=>`<div class="tw-seg" data-key="${key}">${opts.map(o=>`<button data-v="${o[0]}" class="${T[key]===o[0]?'on':''}" onclick="__tw('${key}','${o[0]}')">${o[1]}</button>`).join('')}</div>`;
  const SW = (key,opts)=>`<div class="tw-sw" data-key="${key}">${opts.map(o=>`<button data-v="${o[0]}" class="${T[key]===o[0]?'on':''}" title="${o[1]}" onclick="__tw('${key}','${o[0]}')"><span style="background:${o[2]}"></span>${o[1]}</button>`).join('')}</div>`;

  function build(){
    panel=document.createElement('div'); panel.id='tw-panel'; panel.style.display='none';
    panel.innerHTML=`
      <div class="tw-head"><span class="tw-grip"></span><b>Tweaks</b><span class="tw-sub">pas de sfeer aan</span><button class="tw-x" onclick="__twClose()">✕</button></div>
      <div class="tw-body">
        <div class="tw-row"><label>Sfeer</label>${SEG('sfeer',[['fris','Fris'],['warm','Warm'],['koel','Koel'],['nacht','Nacht']])}</div>
        <div class="tw-row"><label>Materiaal</label>${SEG('materiaal',[['plat','Vlak'],['glas','Glas'],['vol','Vol glas']])}</div>
        <div class="tw-row"><label>Accent</label>${SW('accent',[['studio','Studio',' #3083DC'],['aubergine','Aubergine','#7A3E8E'],['bos','Bos','#1E9E6A'],['inkt','Inkt','#2C3650']])}</div>
      </div>`;
    document.body.appendChild(panel);
    dragify();
  }
  function syncUI(){
    if(!panel)return;
    panel.querySelectorAll('.tw-seg,.tw-sw').forEach(g=>{
      const k=g.dataset.key;
      g.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.v===T[k]));
    });
  }
  window.__tw=(k,v)=>set(k,v);
  window.__twClose=()=>{ panel.style.display='none'; window.parent.postMessage({type:'__edit_mode_dismissed'},'*'); };

  function dragify(){
    const h=panel.querySelector('.tw-head'); let sx,sy,ox,oy,drag=false;
    h.addEventListener('mousedown',e=>{drag=true;sx=e.clientX;sy=e.clientY;const r=panel.getBoundingClientRect();ox=r.left;oy=r.top;panel.style.right='auto';panel.style.bottom='auto';panel.style.left=ox+'px';panel.style.top=oy+'px';e.preventDefault();});
    window.addEventListener('mousemove',e=>{if(!drag)return;panel.style.left=(ox+e.clientX-sx)+'px';panel.style.top=(oy+e.clientY-sy)+'px';});
    window.addEventListener('mouseup',()=>drag=false);
  }

  /* ---- host protocol ---- */
  window.addEventListener('message',e=>{
    const t=e&&e.data&&e.data.type;
    if(t==='__activate_edit_mode'){ if(!panel)build(); syncUI(); panel.style.display='block'; }
    else if(t==='__deactivate_edit_mode'){ if(panel)panel.style.display='none'; }
  });

  injectBlurHook();
  apply();
  window.parent.postMessage({type:'__edit_mode_available'},'*');
})();

/* ============================================================
   Inklapbare auto-hide sidebar (macOS-dock)
   - toggleDock(): klapt de zijbalk in/uit, content wordt fullscreen
   - bij ingeklapt: hover aan de linkerrand laat de zijbalk terugzweven
   - state bewaard in localStorage (per toestel)
   ============================================================ */
(function(){
  // RAIL-MODUS (item 18): de zijbalk is standaard ingeklapt tot een icoon-rail (~64px) en klapt
  // bij hover puur via CSS uit naar volle breedte als overlay (content schuift niet). De topbar-
  // knop wisselt tussen rail (icoontjes) en vastgepind (volle breedte). State per toestel.
  var KEY='s27_sb_rail';
  var body=document.body;
  function rail(){ return body.classList.contains('sb-rail'); }
  function setRail(on){
    body.classList.toggle('sb-rail', !!on);
    try{ localStorage.setItem(KEY, on?'1':'0'); }catch(_){}
  }
  // standaard rail AAN, tenzij de gebruiker hem eerder vastpinde (CSS negeert sb-rail op mobiel)
  try{ if(localStorage.getItem(KEY)==='0') body.classList.remove('sb-rail'); else body.classList.add('sb-rail'); }catch(_){ body.classList.add('sb-rail'); }
  window.toggleDock=function(){ setRail(!rail()); };
})();
