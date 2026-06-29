/* 27 Global Search — cross-platform web component.
   Mount: <global-search portal="crm"></global-search>
   Searches across ALL portals. Each portal publishes its searchable
   records to localStorage ('s27_index') via window.S27Search.publish(key, items).
   Results link straight to the target portal page with ?go=<screen>&id=<id>,
   so navigation is uniform whether the hit is in the current portal or another. */
(function () {
  if (window.customElements && customElements.get('global-search')) return;

  var INDEX = 's27_index';

  var PORTALS = {
    crm:  { label:'27CRM',       page:'/crm/',       accent:'#0F2EA3', icon:'building' },
    hr:   { label:'27HR',        page:'/hr/',        accent:'#4A6B0E', icon:'users' },
    fin:  { label:'27Finance',   page:'/finance/',   accent:'#0F6FB5', icon:'chart' },
    prod: { label:'27Productie', page:'/productie/',  accent:'#050A30', icon:'kanban' }
  };

  /* Built-in catalog of main destinations per portal, so search works
     even for portals not visited yet this session. */
  var CATALOG = {
    crm: [
      {label:'Dashboard', screen:'dashboard', type:'Pagina'},
      {label:'Bedrijven', screen:'bedrijven', type:'Pagina'},
      {label:'Contactpersonen', screen:'contacten', type:'Pagina'},
      {label:'Offertes', screen:'offertes', type:'Pagina'},
      {label:'Meetings', screen:'meetings', type:'Pagina'},
      {label:'Projectbriefings', screen:'briefings', type:'Pagina'},
      {label:'Bruidsparen', screen:'bruidsparen', type:'Pagina'},
      {label:'Instellingen', screen:'instellingen', type:'Pagina'}
    ],
    hr: [
      {label:'Dashboard', screen:'dashboard', type:'Pagina'},
      {label:'Vacatures', screen:'vacatures', type:'Pagina'},
      {label:'Kandidaten', screen:'kandidaten', type:'Pagina'},
      {label:'Mijn agenda', screen:'agenda', type:'Pagina'},
      {label:'Onboarding', screen:'onboarding', type:'Pagina'},
      {label:'Payroll', screen:'payroll', type:'Pagina'},
      {label:'Instellingen', screen:'instellingen', type:'Pagina'}
    ],
    fin: [
      {label:'Overzicht', screen:'overzicht', type:'Pagina'},
      {label:'Offertes', screen:'offertes', type:'Pagina'},
      {label:'Cijfers', screen:'cijfers', type:'Pagina'},
      {label:'Projectrendement', screen:'rendement', type:'Pagina'}
    ],
    prod: [
      {label:'Mijn werk', screen:'mijn-werk', type:'Pagina'},
      {label:'Berichten', screen:'berichten', type:'Pagina'},
      {label:'Mijn weekplanner', screen:'weekplanner', type:'Pagina'},
      {label:'Verlof', screen:'verlof', type:'Pagina'},
      {label:'Templates', screen:'templates', type:'Pagina'}
    ]
  };

  function loadIndex(){ try{ var r=localStorage.getItem(INDEX); if(r){ var d=JSON.parse(r); if(d&&typeof d==='object') return d; } }catch(e){} return {}; }
  function saveIndex(d){ try{ localStorage.setItem(INDEX, JSON.stringify(d)); }catch(e){} }

  /* Public API for portals to publish their live records. */
  window.S27Search = {
    PORTALS: PORTALS,
    publish: function(key, items){
      if(!PORTALS[key]) return;
      var idx = loadIndex();
      idx[key] = (items||[]).slice(0, 400);
      saveIndex(idx);
      window.dispatchEvent(new Event('s27-index-change'));
    }
  };

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function norm(s){ return String(s||'').toLowerCase(); }

  /* Quick filters surfaced when the panel opens. type matches the records'
     `type` field published by the portals. */
  var FILTERS = [
    {label:'Taak',       type:'Taak',       icon:'check'},
    {label:'Contact',    type:'Contact',    icon:'users'},
    {label:'Bedrijf',    type:'Bedrijf',    icon:'building'},
    {label:'Bruidspaar', type:'Bruidspaar', icon:'heart'},
    {label:'Offerte',    type:'Offerte',    icon:'page'}
  ];

  var IC = {
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.2-4.2"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    heart:'<path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z"/>',
    enter:'<path d="M9 10l-5 5 5 5"/><path d="M4 15h11a5 5 0 0 0 5-5V4"/>',
    building:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/>',
    users:'<path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.2"/><path d="M22 19v-2a4 4 0 0 0-3-3.8"/><path d="M16 3.2a4 4 0 0 1 0 7.6"/>',
    chart:'<path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/>',
    kanban:'<rect x="3" y="3" width="6" height="14" rx="1.5"/><rect x="15" y="3" width="6" height="9" rx="1.5"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    page:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'
  };
  function svg(name, size, color){ return '<svg viewBox="0 0 24 24" width="'+(size||18)+'" height="'+(size||18)+'" fill="none" stroke="'+(color||'currentColor')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(IC[name]||IC.page)+'</svg>'; }

  class GlobalSearch extends HTMLElement {
    connectedCallback(){
      if(this._init) return; this._init=true;
      this.portal = this.getAttribute('portal') || 'crm';
      this.q = '';
      this.typeFilter = '';
      this.open = false;
      this.activeIdx = 0;
      this.root = this.attachShadow({mode:'open'});
      this._onStore = (e)=>{ if(this.open) this.render(); };
      window.addEventListener('storage', this._onStore);
      window.addEventListener('s27-index-change', this._onStore);
      this._onKey = (e)=>{ if(e.key==='/' && !/input|textarea/i.test((document.activeElement||{}).tagName) && !this.open){ e.preventDefault(); this.openPanel(); } };
      window.addEventListener('keydown', this._onKey);
      this.render();
    }
    disconnectedCallback(){ window.removeEventListener('storage', this._onStore); window.removeEventListener('s27-index-change', this._onStore); window.removeEventListener('keydown', this._onKey); }

    openPanel(){ this.open=true; this.render(); var self=this; setTimeout(function(){ var i=self.root.getElementById('q'); if(i) i.focus(); },20); }
    closePanel(){ this.open=false; this.render(); }

    /* Build the merged result list across all portals. */
    results(){
      var idx = loadIndex();
      var q = norm(this.q).trim();
      var tf = this.typeFilter;
      var out = [];
      var order = [this.portal].concat(Object.keys(PORTALS).filter((k)=>k!==this.portal));
      order.forEach((key)=>{
        var live = idx[key] || [];
        var cat = CATALOG[key] || [];
        var pool = live.concat(cat);
        var seen = {};
        pool.forEach((it)=>{
          var label = it.label||''; var sub = it.sub||''; var type = it.type||'';
          if(tf && type!==tf) return;
          if(q){
            var hay = norm(label+' '+sub+' '+type+' '+(it.kw||''));
            if(hay.indexOf(q)<0) return;
          }
          var dedupe = key+'|'+label+'|'+(it.screen||'')+'|'+(it.id||'');
          if(seen[dedupe]) return; seen[dedupe]=1;
          out.push({portal:key, label:label, sub:sub, type:type, screen:it.screen||'', id:it.id||'', current:key===this.portal});
        });
      });
      // when no query and no filter, only show a compact set of destinations
      if(!q && !tf) return out.filter((r)=>r.type==='Pagina').slice(0,40);
      return out.slice(0,40);
    }

    hrefFor(r){
      var p = PORTALS[r.portal]; if(!p) return '#';
      if(r.portal==='prod' && r.screen && !r.id) return p.page + '#' + encodeURIComponent(r.screen);
      var u = p.page + '?go=' + encodeURIComponent(r.screen||'');
      if(r.id) u += '&id=' + encodeURIComponent(r.id);
      return u;
    }

    render(){
      var self=this;
      var css = ''
        + ':host{ all:initial; font-family:"Outfit",-apple-system,system-ui,sans-serif; display:block; flex:1 1 280px; min-width:120px; max-width:460px; }'
        + '*{ box-sizing:border-box; }'
        + '.pill{ display:flex; align-items:center; gap:9px; width:100%; height:40px; border:1px solid rgba(247,243,234,.16); border-radius:11px; background:rgba(247,243,234,.08); color:rgba(247,243,234,.62); cursor:text; padding:0 13px; font-size:13px; transition:background .15s,border-color .15s; }'
        + '.pill:hover{ background:rgba(247,243,234,.13); }'
        + '.pill .kbd{ margin-left:auto; font-size:11px; font-weight:600; color:rgba(247,243,234,.45); border:1px solid rgba(247,243,234,.2); border-radius:6px; padding:1px 6px; }'
        + '.backdrop{ position:fixed; inset:0; z-index:2147483000; background:rgba(5,10,48,.42); backdrop-filter:blur(2px); }'
        + '.panel{ position:fixed; top:74px; left:50%; transform:translateX(-50%); width:min(640px,94vw); max-height:74vh; z-index:2147483001; background:#FFFDF8; border:1px solid #EFEADD; border-radius:18px; box-shadow:0 32px 80px -20px rgba(5,10,48,.5); display:flex; flex-direction:column; overflow:hidden; animation:pop .18s cubic-bezier(.16,1,.3,1); }'
        + '@keyframes pop{ from{ transform:translateX(-50%) translateY(-8px); opacity:0; } to{ transform:translateX(-50%) translateY(0); opacity:1; } }'
        + '.qrow{ display:flex; align-items:center; gap:11px; padding:15px 18px; border-bottom:1px solid #EFEADD; }'
        + '.qrow input{ flex:1; border:none; outline:none; background:transparent; font-family:inherit; font-size:17px; color:#050A30; min-width:0; }'
        + '.qrow .clr{ width:30px; height:30px; border:none; background:#F2EDE1; border-radius:8px; cursor:pointer; display:grid; place-items:center; color:#5E5A4F; }'
        + '.chips{ display:flex; flex-wrap:wrap; gap:7px; padding:11px 16px; border-bottom:1px solid #EFEADD; }'
        + '.chip{ display:inline-flex; align-items:center; gap:6px; font-family:inherit; font-size:12.5px; font-weight:500; color:#5E5A4F; background:#F4F0E6; border:1px solid transparent; border-radius:99px; padding:6px 12px 6px 10px; cursor:pointer; transition:background .14s,color .14s,border-color .14s; }'
        + '.chip:hover{ background:#ECE6D8; }'
        + '.chip svg{ opacity:.75; }'
        + '.chip.on{ background:#050A30; color:#F7F3EA; }'
        + '.chip.on svg{ opacity:1; }'
        + '.list{ overflow-y:auto; padding:7px; }'
        + '.ghead{ display:flex; align-items:center; gap:7px; padding:11px 12px 5px; font-size:10.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#A39E8E; }'
        + '.ghead .dot{ width:7px; height:7px; border-radius:99px; flex:none; }'
        + '.ghead .here{ margin-left:6px; font-size:9.5px; letter-spacing:.06em; color:#4A6B0E; background:#EEF6D6; border-radius:99px; padding:1px 7px; }'
        + '.row{ display:flex; align-items:center; gap:12px; width:100%; text-decoration:none; border:none; background:transparent; border-radius:11px; padding:10px 11px; cursor:pointer; text-align:left; }'
        + '.row:hover, .row.on{ background:#F2EEE3; }'
        + '.ico{ width:34px; height:34px; border-radius:9px; display:grid; place-items:center; flex:none; color:#fff; }'
        + '.row .lbl{ flex:1; min-width:0; }'
        + '.row .t{ display:block; font-size:14px; font-weight:500; color:#050A30; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }'
        + '.row .s{ display:block; font-size:12px; color:#8E8979; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }'
        + '.row .ty{ font-size:11px; color:#A39E8E; flex:none; }'
        + '.row .go{ color:#C4BEAC; flex:none; }'
        + '.empty{ padding:34px 20px; text-align:center; color:#8E8979; font-size:13.5px; }'
        + '.foot{ display:flex; align-items:center; gap:8px; padding:9px 16px; border-top:1px solid #EFEADD; font-size:11.5px; color:#A39E8E; background:#FBF8F0; }'
        + '.foot .k{ font-weight:600; color:#5E5A4F; border:1px solid #E4DDCC; border-radius:5px; padding:0 5px; }';

      var html = '<style>'+css+'</style>';
      html += '<div class="pill" id="trig">'+svg('search',16,'rgba(247,243,234,.6)')+'<span>Zoek in alle portalen…</span><span class="kbd">/</span></div>';

      if(this.open){
        var res = this.results();
        html += '<div class="backdrop" id="bd"></div><div class="panel">';
        html += '<div class="qrow">'+svg('search',20,'#8E8979')+'<input id="q" placeholder="Zoek klanten, taken, vacatures, offertes, pagina\u2019s\u2026" value="'+esc(this.q)+'" autocomplete="off">'+(this.q?'<button class="clr" id="clr">'+svg('x',16)+'</button>':'')+'</div>';
        html += '<div class="chips">';
        FILTERS.forEach((f)=>{
          html += '<button class="chip'+(this.typeFilter===f.type?' on':'')+'" data-tf="'+esc(f.type)+'">'+svg(f.icon,14)+esc(f.label)+'</button>';
        });
        html += '</div>';
        html += '<div class="list" id="list">';
        if(!res.length){
          html += '<div class="empty">Geen resultaten voor \u201c'+esc(this.q)+'\u201d.</div>';
        } else {
          var lastP = null; var i=0;
          res.forEach((r)=>{
            if(r.portal!==lastP){
              var p = PORTALS[r.portal];
              html += '<div class="ghead"><span class="dot" style="background:'+p.accent+'"></span>'+esc(p.label)+(r.current?'<span class="here">Hier</span>':'')+'</div>';
              lastP = r.portal;
            }
            var p = PORTALS[r.portal];
            html += '<a class="row'+(i===self.activeIdx?' on':'')+'" data-i="'+i+'" href="'+esc(self.hrefFor(r))+'">'
              + '<span class="ico" style="background:'+p.accent+'">'+svg(r.type==='Pagina'?p.icon:'page',17,'#fff')+'</span>'
              + '<span class="lbl"><span class="t">'+esc(r.label)+'</span>'+(r.sub?'<span class="s">'+esc(r.sub)+'</span>':'')+'</span>'
              + '<span class="ty">'+esc(r.type)+'</span>'
              + '<span class="go">'+svg('arrow',16)+'</span></a>';
            i++;
          });
        }
        html += '</div>';
        html += '<div class="foot">'+svg('enter',14,'#A39E8E')+'<span>Enter om te openen</span><span style="margin-left:auto;">Esc om te sluiten</span></div>';
        html += '</div>';
      }

      this.root.innerHTML = html;
      this._wire(this.results());
    }

    _wire(res){
      var R=this.root, self=this;
      var trig=R.getElementById('trig'); if(trig) trig.onclick=function(){ self.openPanel(); };
      var bd=R.getElementById('bd'); if(bd) bd.onclick=function(){ self.closePanel(); };
      var clr=R.getElementById('clr'); if(clr) clr.onclick=function(){ self.q=''; self.activeIdx=0; self.render(); var i=R.getElementById('q'); if(i) i.focus(); };
      R.querySelectorAll('.chip').forEach(function(el){ el.onclick=function(){ var t=el.getAttribute('data-tf'); self.typeFilter = (self.typeFilter===t?'':t); self.activeIdx=0; self.render(); var i=R.getElementById('q'); if(i) i.focus(); }; });
      var q=R.getElementById('q');
      if(q){
        q.oninput=function(e){ self.q=e.target.value; self.activeIdx=0; self.render(); var i=R.getElementById('q'); if(i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length); } };
        q.onkeydown=function(e){
          if(e.key==='Escape'){ e.preventDefault(); self.closePanel(); return; }
          if(e.key==='ArrowDown'){ e.preventDefault(); self.activeIdx=Math.min(res.length-1, self.activeIdx+1); self.render(); return; }
          if(e.key==='ArrowUp'){ e.preventDefault(); self.activeIdx=Math.max(0, self.activeIdx-1); self.render(); return; }
          if(e.key==='Enter'){ var r=res[self.activeIdx]; if(r){ window.location.href=self.hrefFor(r); } }
        };
      }
      R.querySelectorAll('.row').forEach(function(el){ el.onmouseenter=function(){ self.activeIdx=parseInt(el.getAttribute('data-i'),10)||0; }; });
    }
  }
  customElements.define('global-search', GlobalSearch);
})();
