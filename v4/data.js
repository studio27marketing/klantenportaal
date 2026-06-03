/* =============================================================================
   Studio 27 Klantenportaal v4 — DATA-BRUG
   -----------------------------------------------------------------------------
   Haalt ECHTE data op via api() (zie api.js) en mapt ze naar de vormen die
   panels.js verwacht. Lazy-load per tab (zoals dashboard.js). Geen live data
   (= preview/demoMode) → getters geven null terug → panels.js valt terug op de
   meegeleverde mock. Laadvolgorde: api.js → data.js → assets-data.js → panels.js → portal.js
   ============================================================================= */
(function(){
  "use strict";
  // HTML-escape (data.js is self-contained; panels.js gebruikt escapeHtml uit portal.js)
  var esc = window.esc = window.esc || function(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var DATA = window.S27DATA = {};
  state.data = state.data || { dashboard:null, details:{}, chats:{}, meetings:null, bedrijf:null, team:null, huisstijl:null };

  /* ---- discipline-brug: ClickUp-id → {br-kleur, label, stamp, categorie} (de bijbel) ---- */
  var DISC_BRIDGE = {
    strategie:       { br:'blue',   label:'Strategie',            stamp:'icon-strategie.svg',        cat:'deliverable' },
    branding:        { br:'pink',   label:'Branding',             stamp:'icon-branding-heart.svg',   cat:'deliverable' },
    video_fotografie:{ br:'purple', label:'Video- en fotografie', stamp:'icon-video-fotografie.svg', cat:'deliverable' },
    webdesign:       { br:'green',  label:'Webdesign',            stamp:'icon-webdesign.svg',        cat:'deliverable' },
    seo:             { br:'green',  label:'SEO & GEO',            stamp:'icon-webdesign.svg',        cat:'doorlopend'  },
    ads:             { br:'orange', label:'Online adverteren',    stamp:'icon-adverteren.svg',       cat:'doorlopend'  },
    social:          { br:'yellow', label:'Social media',         stamp:'icon-socialmedia.svg',      cat:'doorlopend'  },
    opleiding:       { br:'indigo', label:'Opleidingen',          icon:'opleiding',                  cat:'opleiding'   },
    automation:      { br:'indigo', label:'Automations',          icon:'spark',                      cat:'deliverable' }
  };
  DATA.disc = function(id){ return DISC_BRIDGE[id] || { br:'blue', label:id||'Project', icon:'doc', cat:'deliverable' }; };

  /* ---- status-brug: genormaliseerde ClickUp-status → {key (mock-pill), label} ---- */
  function norm(s){ return String(s||'').toLowerCase().replace(/\s+/g,'_'); }
  var STATUS_MAP = {
    to_do:                {key:'todo', label:'Nog in te plannen'},
    in_progress:          {key:'prog', label:'In productie'},
    doorgestuurd:         {key:'wait', label:'Klaar voor feedback'},
    goedgekeurd:          {key:'done', label:'Goedgekeurd'},
    done:                 {key:'done', label:'Afgerond'},
    klaar_voor_facturatie:{key:'done', label:'Afgerond'},
    gefactureerd:         {key:'done', label:'Afgerond'},
    on_hold:              {key:'prog', label:'On hold'}
  };
  DATA.status = function(raw){ return STATUS_MAP[norm(raw)] || {key:'prog', label:raw||'Loopt'}; };
  var AFGEROND = ['goedgekeurd','done','klaar_voor_facturatie','gefactureerd'];
  // projectchat sluit zodra het team de taak niet meer opvolgt: Doorgestuurd of een afgeronde status
  DATA.isChatClosed = function(raw){ var n=norm(raw); return n==='doorgestuurd' || AFGEROND.indexOf(n)>=0; };
  function isAfgerond(raw){ return AFGEROND.indexOf(norm(raw)) >= 0; }

  /* ---- payload-helpers (gateway injecteert bedrijf_id server-side) ---- */
  function S(){ return state.session || {}; }
  function base(extra){ var s=S(); return Object.assign({ bedrijf_id:s.bedrijf_id, session_token:s.session_token }, extra||{}); }
  function live(){ return !state.demoMode && state.session; }
  DATA.klantNaam = function(){
    var b = state.data.bedrijf;
    if(b && b.contact && b.contact.voornaam) return b.contact.voornaam;
    return 'Sarah';
  };
  DATA.bedrijfsnaam = function(){
    // echte naam uit de provisioning-lijst (portalCompanies + activeBedrijf) — de v1-feed
    // geeft een placeholder "Klant" terug, die negeren we.
    var comps = state.portalCompanies||[], active = state.activeBedrijf;
    for(var i=0;i<comps.length;i++){ if(comps[i].id===active && comps[i].naam) return comps[i].naam; }
    if(comps.length===1 && comps[0].naam) return comps[0].naam;
    var d = state.data.dashboard;
    if(d && d.klant && d.klant.bedrijfsnaam && d.klant.bedrijfsnaam!=='Klant') return d.klant.bedrijfsnaam;
    return (S().bedrijfsnaam) || 'je bedrijf';
  };

  /* ---- deliverables_raw → [{label,url,type}] (regex-URLs, zoals dashboard.js) ---- */
  function parseDeliverablesRaw(raw){
    var out=[]; var m=String(raw||'').match(/https?:\/\/[^\s]+/g) || [];
    m.forEach(function(u,i){
      u = u.replace(/[).,;]+$/,'');
      var t='bestand';
      if(/youtu/.test(u)) t='video'; else if(/vimeo/.test(u)) t='video';
      else if(/picflow|drive\.google|\.jpg|\.png|\.jpeg/i.test(u)) t='img';
      else if(/figma|webflow/.test(u)) t='doc';
      out.push({ label:'Deliverable '+(i+1), url:u, type:t });
    });
    return out;
  }

  /* =========================================================================
     LOADERS (async) — vullen state.data, retourneren of het lukte
     ========================================================================= */
  DATA.loadDashboard = async function(){
    if(!live()) return false;
    var res = await api(ENDPOINTS.dashboard, base());
    if(res && res.ok && res.data && !res.data.error){ state.data.dashboard = res.data; return true; }
    return false;
  };
  DATA.loadDetail = async function(taskId){
    if(!live()) return null;
    var res = await api(ENDPOINTS.projectDetailV2, base({ task_id:taskId }));
    var d = (res && res.ok && res.data) ? res.data : null;
    if(d && d.ok !== false){ state.data.details[taskId] = d; }
    return state.data.details[taskId] || null;
  };
  // ruwe ClickUp-comment {auteur,tekst,datum,is_klant,attachments} -> display-shape voor chatHTML
  function mapChatComment(c){
    var t = String(c.tekst||c.text||c.comment_text||'');
    t = t.replace(/^\s*💬?\s*\[[^\]]*\]\s*/,'');   // "💬 [Klant: ...]"-prefix weg
    t = t.replace(/\\n/g,'\n').replace(/^\n+/,'').replace(/\s+$/,'');   // letterlijke \n -> newline
    var me = (c.is_klant===true || c.is_klant==='true');
    var naam = c.auteur||c.author||(me?'Jij':'Studio 27');
    var ms = parseInt(c.datum||c.date||0,10); var tm='';
    if(ms){ var d=new Date(ms); if(!isNaN(d.getTime())) tm=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
    var ini=(String(naam).split(/\s+/).map(function(x){return x?x[0]:'';}).join('').slice(0,2)||'S2').toUpperCase();
    return { av:ini, who:(me?'Jij':naam), color:'blue', tx:esc(t).replace(/\n/g,'<br>'), tm:tm, me:me, attachments:c.attachments||[] };
  }
  DATA.loadChat = async function(taskId){
    if(!live()) return [];
    var res = await api(ENDPOINTS.chatList, base({ task_id:taskId }));
    var raw = (res && res.ok && res.data && res.data.ok && res.data.comments) ? res.data.comments : [];
    state.data.chats[taskId] = raw.map(mapChatComment);
    return state.data.chats[taskId];
  };
  DATA.loadMeetings = async function(){
    if(!live()) return false;
    var res = await api(ENDPOINTS.meetingsList, base({ bedrijfsnaam:DATA.bedrijfsnaam() }));
    if(res && res.ok && res.data){ state.data.meetings = res.data; return true; }
    return false;
  };
  DATA.loadBedrijf = async function(){
    if(!live()) return false;
    var res = await api(ENDPOINTS.bedrijfContent, base());
    if(res && res.ok && res.data && res.data.ok !== false){ state.data.bedrijf = res.data; return true; }
    return false;
  };
  DATA.loadTeam = async function(){
    if(!live() || ENDPOINTS.bedrijfBeheer.indexOf('BEDRIJFBEHEER_HOOK') !== -1) return false;
    var res = await api(ENDPOINTS.bedrijfBeheer, base({ action:'get_team' }));
    if(res && res.ok && res.data && res.data.ok !== false){ state.data.team = res.data; return true; }
    return false;
  };
  DATA.loadHuisstijl = async function(){
    if(!live()) return false;
    try { await api(ENDPOINTS.driveEnsure, base()); } catch(e){}
    var res = await api(ENDPOINTS.huisstijlList, base());
    if(res && res.ok && res.data && res.data.files){ state.data.huisstijl = res.data.files; return true; }
    return false;
  };
  DATA.performanceUrl = async function(){
    if(!live()) return null;
    var token = window.S27Auth ? await window.S27Auth.token() : null;
    if(!token) return null;
    return GATEWAY_BASE + '/perfreport?token=' + encodeURIComponent(token);
  };

  /* =========================================================================
     GETTERS — live-gemapte data of null (→ panels.js valt terug op mock)
     ========================================================================= */
  function projList(){ var d=state.data.dashboard; return (d && d.actieve_projecten) ? d.actieve_projecten : null; }

  DATA.projects = function(){
    var raw = projList(); if(!raw) return null;
    return raw.map(function(p){
      var br = DATA.disc(p.discipline);
      var st = DATA.status(p.status);
      var deliv = st.key==='wait' || !!p.feedback_link;
      return { id:p.task_id, name:p.naam, br:br.br, disc:br.label, discId:p.discipline, status:st.key, deliv:deliv, _raw:p };
    });
  };

  // Cockpit "Voor jou te doen" — afgeleid uit de projectstatussen (zie dashboard.js collectCockpitActions)
  DATA.cockpit = function(){
    var raw = projList(); if(!raw) return null;
    var out=[];
    raw.forEach(function(p){
      var st = norm(p.status); var br = DATA.disc(p.discipline);
      if(st==='doorgestuurd' || p.feedback_link){
        out.push({ br:br.br, cat:br.label, title:'Review nodig', ctx:'Er staat iets klaar voor jou bij <b>'+esc(p.naam)+'</b>. Geef je akkoord of je feedback.',
          cta:'Bekijk', action:"openProject('"+esc(p.task_id)+"','projecten')", tag:'nu', urgent:true, icon:'st_feedback' });
      } else if(st==='to_do' && !p.opleverdatum && !p.shoot_gepland){
        out.push({ br:br.br, cat:br.label, title:'Moment inplannen', ctx:'<b>'+esc(p.naam)+'</b> wacht om ingepland te worden. Prik een moment dat jou past.',
          cta:'Plan in', action:"openProject('"+esc(p.task_id)+"','projecten')", tag:'binnenkort', urgent:false, icon:'st_plan' });
      }
    });
    return out;
  };

  DATA.running = function(){
    var raw = projList(); if(!raw) return null;
    return raw.filter(function(p){ return !isAfgerond(p.status); }).map(function(p){
      var br=DATA.disc(p.discipline), st=DATA.status(p.status);
      return { br:br.br, disc:br.label, name:p.naam, status:st.key, label:st.label, pct:Number(p.voortgang_pct)||0, id:p.task_id };
    });
  };
  DATA.done = function(){
    var d=state.data.dashboard; var raw=(d && d.historie_3mnd) ? d.historie_3mnd : null; if(!raw) return null;
    return raw.map(function(p){ var br=DATA.disc(p.discipline); return { br:br.br, name:p.naam, disc:br.label, when:p.opleverdatum||p.laatst_geupdatet||'' }; });
  };

  // Diensten-hub: actief als de tak projecten heeft (project-based disciplineState)
  DATA.discActive = function(discId){
    var raw = projList(); if(!raw) return false;
    return raw.some(function(p){ return p.discipline===discId; });
  };

  // Projectdetail → vorm voor buildModal
  DATA.detail = function(taskId){
    var d = state.data.details[taskId]; if(!d) return null;
    var p = (DATA.projects()||[]).find(function(x){return x.id===taskId;}) || {};
    var subs = (d.taken||[]).map(function(t){
      return { naam:t.naam, status:DATA.status(t.status).key, statusColor:t.status_color, datum:t.datum, link:t.link||t.url };
    });
    var delivs = (d.deliverables && d.deliverables.length) ? d.deliverables : parseDeliverablesRaw(d.deliverables_raw);
    return {
      id:taskId, name:d.naam||p.name||'Project', br:p.br||'blue', disc:p.disc||'',
      status:p.status||DATA.status(d.status||d.project_status).key,
      beschrijving:d.beschrijving||'', subtasks:subs, deliverables:delivs,
      feedbackStatus:d.feedback_status||'', hasContact:d.has_contact==='yes', hasBedrijf:d.has_bedrijf==='yes',
      timeEstimate:d.time_estimate||'', typeJob:d.type_job||'', _raw:d
    };
  };

  // Chat → bubble-vorm voor chatHTML
  function decodeMake(s){ return String(s||'').replace(/\\n/g,'\n').replace(/\\r/g,'').replace(/\\t/g,'\t').replace(/\\"/g,'"').replace(/\\\\/g,'\\'); }
  DATA.chat = function(taskId){
    var arr = state.data.chats[taskId]; if(!arr) return null;
    return arr.filter(function(c){ return !(String(c.tekst||c.text||'').indexOf('[INTERN]')===0); }).map(function(c){
      var tekst = decodeMake(c.tekst||c.text||c.comment_text||'');
      var me = c.is_klant===true || /^💬 \[Klant/.test(tekst);
      var who = me ? 'Jij' : (c.auteur||c.author||'Studio 27');
      tekst = tekst.replace(/^💬 \[Klant:[^\]]*\]\s*/,'');
      return { me:me, who:who, color:'blue', tx:esc(tekst), tm:DATA.relTime(c.datum||c.date), av:(who||'S').slice(0,2).toUpperCase() };
    });
  };

  DATA.meetings = function(){
    var m = state.data.meetings; if(!m) return null;
    // ENKEL meetings van deze klant: de scenario geeft alle S27-meetings terug,
    // we filteren op de bedrijfsnaam in de titel (zoals dashboard.js).
    var naam = String(DATA.bedrijfsnaam()||'').toUpperCase().trim();
    var raw = (m.meetings||[]).filter(function(x){
      if(!naam || naam==='JE BEDRIJF') return true;
      return String(x.titel||'').toUpperCase().indexOf(naam) >= 0;
    });
    var list = raw.map(function(x){
      var ms = parseInt(x.datum,10); var dt = ms>1e9 ? new Date(ms) : new Date(x.datum);
      return { id:x.meeting_id, titel:x.titel, dt:dt, status:x.status, link:x.link,
               type:/kickoff/i.test(x.titel||'')?'Kickoff':'Meeting' };
    });
    return { list:list, bookingUrl:m.booking_url||'' };
  };

  DATA.bedrijf = function(){ return state.data.bedrijf; };
  DATA.team = function(){ return state.data.team; };
  DATA.loadOffertes = async function(){
    if(!live()) return false;
    var res = await api(ENDPOINTS.bedrijfBeheer, base({ action:'get_offertes' }));
    if(res && res.ok && res.data && res.data.ok && res.data.offertes){
      state.data.offertes = (res.data.offertes||[]).map(function(o){
        var nm = o.naam || '';
        try{ nm = decodeURIComponent(nm); }catch(e){}   // naam komt encodeURL'd uit Make (JSON-veilig)
        var st = o.status || '';
        try{ st = decodeURIComponent(st); }catch(e){}
        return { id:o.id, naam:nm, link:o.link||'', budget:o.budget||'', vervaldatum:o.vervaldatum||'', status:st };
      });
      return true;
    }
    state.data.offertes = []; return false;   // leeg ("_raw":"Accepted") = geen offertes
  };
  DATA.offertes = function(){ return state.data.offertes; };

  /* ---- Metricool (geplande social posts) — geïsoleerd Make-scenario, directe call ---- */
  function _parseDatum(s){ if(!s) return null; var d=new Date(String(s).replace(' ','T')); return isNaN(d.getTime())?null:d; }
  DATA.loadMetricool = async function(){
    if(!live()){ state.data.metricool={linked:false,posts:[]}; return false; }
    var bid = state.activeBedrijf || '';
    if(!bid){ state.data.metricool={linked:false,posts:[]}; return false; }
    try{
      var r = await fetch(METRICOOL_DIRECT, { method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},   // CORS-safe: geen preflight
        body:'bedrijf_id='+encodeURIComponent(bid) });
      var t = await r.text(); var j=null; try{ j=JSON.parse(t); }catch(e){}
      if(!j || !j.ok){ state.data.metricool={linked:false,posts:[]}; return false; }
      if(!j.linked){ state.data.metricool={linked:false,posts:[]}; return true; }
      // v4: 1 rij per post; netwerken = komma-lijst "facebook,instagram,linkedin"
      var posts=(j.posts||[]).filter(function(p){return p&&p.id;}).map(function(p){
        var tk=''; try{ tk=decodeURIComponent(p.tekst||''); }catch(e){ tk=p.tekst||''; }
        var st=(p.status||'').toUpperCase();
        var nets=String(p.netwerken||'').split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
        return { id:p.id, datum:p.datum||'', dt:_parseDatum(p.datum), tekst:tk, media:p.media||'',
          draft:(p.draft===true||String(p.draft).toLowerCase()==='true'),
          netwerken: nets.map(function(n){ return {netwerk:n, status:st, detail:p.detail||'', url:p.url||''}; }) };
      });
      posts.sort(function(a,b){ return (a.dt?a.dt.getTime():9e15)-(b.dt?b.dt.getTime():9e15); });
      state.data.metricool={ linked:true, brandId:j.brandId||'', posts:posts };
      return true;
    }catch(e){ state.data.metricool={linked:false,posts:[]}; return false; }
  };
  DATA.metricool = function(){ return state.data.metricool; };

  DATA.huisstijl = function(){ return state.data.huisstijl; };

  /* ---- relatieve tijd ---- */
  DATA.relTime = function(v){
    if(!v) return '';
    var ms = /^\d+$/.test(String(v)) ? parseInt(v,10) : Date.parse(v);
    if(!ms || isNaN(ms)) return '';
    var diff = Date.now()-ms, min=Math.round(diff/60000);
    if(min<1) return 'nu'; if(min<60) return min+' min'; var h=Math.round(min/60);
    if(h<24) return h+' u'; var d=Math.round(h/24); if(d===1) return 'gisteren'; if(d<7) return d+' dagen';
    try { return new Date(ms).toLocaleDateString('nl-BE',{day:'numeric',month:'short'}); } catch(e){ return ''; }
  };
})();
