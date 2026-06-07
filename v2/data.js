/* =============================================================================
   Studio 27 Klantenportaal v4, DATA-BRUG
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
    // echte naam uit de provisioning-lijst (portalCompanies + activeBedrijf), de v1-feed
    // geeft een placeholder "Klant" terug, die negeren we.
    var comps = state.portalCompanies||[], active = state.activeBedrijf;
    for(var i=0;i<comps.length;i++){ if(comps[i].id===active && comps[i].naam) return comps[i].naam; }
    if(comps.length===1 && comps[0].naam) return comps[0].naam;
    var d = state.data.dashboard;
    if(d && d.klant && d.klant.bedrijfsnaam && d.klant.bedrijfsnaam!=='Klant') return d.klant.bedrijfsnaam;
    return (S().bedrijfsnaam) || 'je bedrijf';
  };

  /* ---- deliverables_raw → [{label,url,type}] (regex-URLs, zoals dashboard.js) ---- */
  function urlType(u){
    if(/youtu|vimeo/.test(u)) return 'video';
    if(/picflow|drive\.google|\.jpg|\.png|\.jpeg/i.test(u)) return 'img';
    if(/figma|webflow/.test(u)) return 'doc';
    return 'bestand';
  }
  function urlLabel(u){
    if(/vimeo/.test(u)) return 'Bekijk video (Vimeo)';
    if(/youtu/.test(u)) return 'Bekijk video (YouTube)';
    if(/webflow/.test(u)) return 'Bekijk website (Webflow)';
    if(/figma/.test(u)) return 'Bekijk ontwerp (Figma)';
    if(/drive\.google/.test(u)) return 'Open in Drive';
    return 'Open bestand';
  }
  function parseDeliverablesRaw(raw){
    var out=[]; var m=String(raw||'').match(/https?:\/\/[^\s]+/g) || [];
    m.forEach(function(u,i){
      u = u.replace(/[).,;]+$/,'');
      out.push({ label:urlLabel(u), url:u, type:urlType(u) });
    });
    return out;
  }
  // initialen uit een naam (gedeeld door sae-mapping)
  function _initials(naam){
    return (String(naam||'').split(/\s+/).map(function(x){return x?x[0]:'';}).join('').slice(0,2)||'S2').toUpperCase();
  }
  // sae-veld normaliseren: backend levert [{naam,initialen}] of [{naam}] of ["Naam"] of "Naam, Naam"
  function mapSae(raw){
    if(!raw) return [];
    var arr = Array.isArray(raw) ? raw : String(raw).split(/[,;]+/);
    return arr.map(function(s){
      if(s && typeof s==='object'){ var nm=s.naam||s.name||''; return { naam:nm, initialen:s.initialen||s.ini||_initials(nm) }; }
      var nm2=String(s||'').trim(); return nm2 ? { naam:nm2, initialen:_initials(nm2) } : null;
    }).filter(Boolean);
  }
  DATA.sae = mapSae;

  /* =========================================================================
     LOADERS (async), vullen state.data, retourneren of het lukte
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
     GETTERS, live-gemapte data of null (→ panels.js valt terug op mock)
     ========================================================================= */
  function projList(){ var d=state.data.dashboard; return (d && d.actieve_projecten) ? d.actieve_projecten : null; }

  // labels[] van een hoofdtaak (worker geeft discipline-keys) -> [{discId,br,label,stamp}],
  // gededupliceerd. Valt terug op de primaire discipline als labels ontbreekt (oude payload).
  function mapLabels(p){
    var keys = (p && p.labels && p.labels.length) ? p.labels : [p && p.discipline];
    var seen={}, out=[];
    keys.forEach(function(k){ if(!k||seen[k]) return; seen[k]=1; var b=DATA.disc(k); out.push({ discId:k, br:b.br, label:b.label, stamp:b.stamp }); });
    return out;
  }
  DATA.mapLabels = mapLabels;

  DATA.projects = function(){
    var raw = projList(); if(!raw) return null;
    return raw.map(function(p){
      var br = DATA.disc(p.discipline);
      var st = DATA.status(p.status);
      var deliv = st.key==='wait' || !!p.feedback_link;
      return { id:p.task_id, name:p.naam, br:br.br, disc:br.label, discId:p.discipline, labels:mapLabels(p), status:st.key, deliv:deliv, sae:mapSae(p.sae), _raw:p };
    });
  };

  // Cockpit "Voor jou te doen", afgeleid uit de projectstatussen (zie dashboard.js collectCockpitActions)
  DATA.cockpit = function(){
    var raw = projList(); if(!raw) return null;
    var out=[];
    raw.forEach(function(p){
      var br = DATA.disc(p.discipline);
      if(norm(p.status)==='doorgestuurd' || p.feedback_link){
        out.push({ br:br.br, cat:br.label, title:'Review nodig', ctx:'Er staat iets klaar voor jou bij <b>'+esc(p.naam)+'</b>. Geef je akkoord of je feedback.',
          cta:'Bekijk', action:"openProject('"+esc(p.task_id)+"','projecten')", urgent:true, icon:'st_feedback' });
      }
      // Plannbare taken (wij hebben 'Kan beginnen' aangevinkt, nog geen due date) -> 'nieuwe taak klaar'-melding.
      (p.plan_items||[]).forEach(function(it){
        var isShoot=it.type==='shoot';
        out.push({ br:br.br, cat:br.label, title:'Klaar om in te plannen',
          ctx:'Er staat een nieuwe taak voor je klaar bij <b>'+esc(p.naam)+'</b>'+(it.label?' ('+esc(it.label)+')':'')+'. Je kunt nu '+(isShoot?'je shoot':'een meeting')+' inplannen.',
          cta:(isShoot?'Plan shoot':'Plan moment'), action:"openProject('"+esc(p.task_id)+"','projecten')", urgent:true, icon:'st_plan' });
      });
    });
    return out;
  };

  DATA.running = function(){
    var raw = projList(); if(!raw) return null;
    return raw.filter(function(p){ return !isAfgerond(p.status); }).map(function(p){
      var br=DATA.disc(p.discipline), st=DATA.status(p.status);
      return { br:br.br, disc:br.label, labels:mapLabels(p), name:p.naam, status:st.key, label:st.label, pct:Number(p.voortgang_pct)||0, id:p.task_id, sae:mapSae(p.sae) };
    });
  };
  // Recent afgerond, uitsluitend dashboard.afgerond_60d (laatste 60 dagen, juiste statussen).
  // Geen mock-fallback: leeg of afwezig => null/[] zodat het blok zich verbergt.
  function _whenLabel(ms){
    var n = /^\d+$/.test(String(ms)) ? parseInt(ms,10) : Date.parse(ms);
    if(!n || isNaN(n)) return '';
    return DATA.relTime(n);
  }
  DATA.done = function(){
    var d=state.data.dashboard; if(!d) return null;
    var raw = d.afgerond_60d; if(!raw) return null;
    return raw.map(function(p){
      var br=DATA.disc(p.discipline);
      return { id:p.task_id, br:br.br, name:p.naam, disc:br.label, labels:mapLabels(p), when:_whenLabel(p.opleverdatum), heeftBestanden:(p.heeft_bestanden===true||p.heeft_bestanden==='true') };
    });
  };

  // Diensten-hub: actief als de tak projecten heeft (project-based disciplineState)
  DATA.discActive = function(discId){
    var raw = projList(); if(!raw) return false;
    // check op ALLE labels (niet enkel de primaire discipline), zodat een tak die enkel als
    // secundair label voorkomt (bv. webdesign naast branding) ook als actief telt. Anders
    // toont een lopend webdesign-project foutief 'niet actief / vraag offerte aan'.
    return raw.some(function(p){ var L=(p.labels&&p.labels.length)?p.labels:[p.discipline]; return L.indexOf(discId)>=0; });
  };

  // per-taak bestanden normaliseren: expliciet veld of geparset uit een ruwe URL-tekst
  function taakBestanden(t){
    if(t.bestanden && t.bestanden.length) return t.bestanden.map(function(f){ return { label:f.label||urlLabel(f.url||''), url:f.url||'', type:f.type||urlType(f.url||'') }; });
    var rawTxt = t.bestanden_raw || t.deliverables_raw || t.link || t.url || '';
    return parseDeliverablesRaw(rawTxt);
  }
  // Projectdetail → vorm voor buildModal
  DATA.detail = function(taskId){
    var d = state.data.details[taskId]; if(!d) return null;
    var p = (DATA.projects()||[]).find(function(x){return x.id===taskId;}) || {};
    var subs = (d.taken||[]).map(function(t){
      var best = taakBestanden(t);
      var heeft = (t.heeft_bestanden===true || t.heeft_bestanden==='true') || best.length>0;
      return { naam:t.naam, status:DATA.status(t.status).key, statusColor:t.status_color, datum:t.datum, link:t.link||t.url, heeftBestanden:heeft, bestanden:best };
    });
    var delivs = (d.deliverables && d.deliverables.length) ? d.deliverables.map(function(f){ return { label:f.label||urlLabel(f.url||''), url:f.url||'', type:f.type||urlType(f.url||'') }; }) : parseDeliverablesRaw(d.deliverables_raw);
    return {
      id:taskId, name:d.naam||p.name||'Project', br:p.br||'blue', disc:p.disc||'',
      labels:(p.labels&&p.labels.length)?p.labels:mapLabels(p._raw||{discipline:p.discId}),
      status:p.status||DATA.status(d.status||d.project_status).key,
      beschrijving:d.beschrijving||'', subtasks:subs, deliverables:delivs, sae:mapSae(d.sae||p.sae),
      proces:d.proces||null, plan:d.plan||null,
      feedbackStatus:d.feedback_status||'', hasContact:d.has_contact==='yes', hasBedrijf:d.has_bedrijf==='yes',
      timeEstimate:d.time_estimate||'', typeJob:d.type_job||'', _raw:d
    };
  };

  // Chat → bubble-vorm voor chatHTML.
  // loadChat() slaat al display-klare objecten op via mapChatComment ({av,who,color,tx,tm,me,attachments}).
  // DATA.chat() is daarom een PASSTHROUGH: niet opnieuw mappen (de rauwe ClickUp-velden bestaan hier
  // niet meer). [INTERN]-comments worden server-side al weggefilterd (handlers.mjs chatList); als zacht
  // vangnet houden we hier nog een filter op de display-tekst.
  DATA.chat = function(taskId){
    var arr = state.data.chats[taskId]; if(!arr) return null;
    return arr.filter(function(c){ return String(c.tx||'').indexOf('[INTERN]') !== 0; });
  };

  DATA.meetings = function(){
    var m = state.data.meetings; if(!m) return null;
    // meetingsList scope't al server-side op het Bedrijf-relatieveld (gezaghebbend, security-fix);
    // GEEN extra client-side titel-substringfilter meer (die verborg correcte meetings zonder de
    // bedrijfsnaam letterlijk in de titel). Ongeldige datums vallen weg; chronologisch gesorteerd.
    var list = (m.meetings||[]).map(function(x){
      var ms = parseInt(x.datum,10); var dt = ms>1e9 ? new Date(ms) : new Date(x.datum);
      return { id:x.meeting_id, titel:x.titel, dt:dt, status:x.status, link:x.link,
               type:/kickoff/i.test(x.titel||'')?'Kickoff':'Meeting' };
    }).filter(function(x){ return x.dt && !isNaN(x.dt.getTime()); });
    list.sort(function(a,b){ return a.dt.getTime()-b.dt.getTime(); });
    return { list:list, bookingUrl:m.booking_url||'' };
  };

  DATA.bedrijf = function(){ return state.data.bedrijf; };
  DATA.team = function(){ return state.data.team; };
  // Facturatiegegevens voor de Offertes-pagina (voor-ingevuld uit het contract).
  // ondernemingsnummer (034f4443), facturatie_email (9613b4aa), facturatie_opmerkingen (36d11828).
  // Bron: bedrijfContent (state.data.bedrijf) of get_offertes-payload (state.data.offertesMeta).
  DATA.facturatie = function(){
    var b = state.data.bedrijf || {};
    var o = state.data.offertesMeta || {};
    return {
      ondernemingsnummer: b.ondernemingsnummer || b.btw || o.ondernemingsnummer || '',
      facturatie_email:   b.facturatie_email || o.facturatie_email || '',
      facturatie_opmerkingen: (b.facturatie_opmerkingen!=null ? b.facturatie_opmerkingen : (o.facturatie_opmerkingen||''))
    };
  };
  DATA.loadOffertes = async function(){
    if(!live()) return false;
    var res = await api(ENDPOINTS.bedrijfBeheer, base({ action:'get_offertes' }));
    if(res && res.ok && res.data){
      // facturatiegegevens kunnen meekomen met get_offertes (voor de Offertes-pagina)
      var _f = res.data.facturatie || res.data;   // backend levert facturatie genest (res.data.facturatie); plat als fallback
      state.data.offertesMeta = {
        ondernemingsnummer: _f.ondernemingsnummer||'',
        facturatie_email: _f.facturatie_email||'',
        facturatie_opmerkingen: _f.facturatie_opmerkingen||''
      };
    }
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
    state.data.offertes = []; return false;   // geen offertes voor dit bedrijf
  };
  DATA.offertes = function(){ return state.data.offertes; };

  /* ---- Metricool (geplande social posts), via de gateway-endpoint (api()), bedrijf_id server-side ----
     Gateway-contract (handler 'metricool'): { ok, linked, posts:[{id,datum,tekst,media,
     netwerken:[{netwerk,status}]}] }. api() levert de {ok,status,data}-wrap; data = bovenstaand object.
     We blijven tolerant voor de oude vorm (netwerken als komma-string + 1 globale status per post). */
  function _parseDatum(s){ if(!s) return null; var d=new Date(String(s).replace(' ','T')); return isNaN(d.getTime())?null:d; }
  function _mcNetwerken(p){
    var raw = p.netwerken;
    // nieuwe vorm: array van {netwerk,status,(detail,url)}
    if(Array.isArray(raw)){
      return raw.map(function(nw){
        if(nw && typeof nw==='object'){
          return { netwerk:String(nw.netwerk||nw.network||'').trim().toLowerCase(),
                   status:String(nw.status||p.status||'').toUpperCase(),
                   detail:nw.detail||p.detail||'', url:nw.url||p.url||'' };
        }
        return { netwerk:String(nw||'').trim().toLowerCase(), status:String(p.status||'').toUpperCase(), detail:p.detail||'', url:p.url||'' };
      }).filter(function(n){ return n.netwerk; });
    }
    // oude vorm: komma-string "facebook,instagram,linkedin" + 1 globale status
    var st=(p.status||'').toUpperCase();
    return String(raw||'').split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean)
      .map(function(n){ return { netwerk:n, status:st, detail:p.detail||'', url:p.url||'' }; });
  }
  DATA.loadMetricool = async function(){
    if(!live()){ state.data.metricool={linked:false,posts:[]}; return false; }
    var bid = state.activeBedrijf || '';
    if(!bid){ state.data.metricool={linked:false,posts:[]}; return false; }
    try{
      var res = await api(ENDPOINTS.metricool, base({ bedrijf_id:bid }));
      var j = (res && res.ok && res.data) ? res.data : null;
      if(!j || !j.ok){ state.data.metricool={linked:false,posts:[]}; return false; }
      if(!j.linked){ state.data.metricool={linked:false,posts:[]}; return true; }
      var posts=(j.posts||[]).filter(function(p){return p&&p.id;}).map(function(p){
        var tk=''; try{ tk=decodeURIComponent(p.tekst||''); }catch(e){ tk=p.tekst||''; }
        return { id:p.id, uuid:p.uuid||'', datum:p.datum||'', dt:_parseDatum(p.datum), tekst:tk,
          media:p.media||'', media_all:(p.media_all||(p.media?[p.media]:[])),
          providers:(p.providers||[]), hashtags:(p.hashtags||[]),
          draft:(p.draft===true||String(p.draft).toLowerCase()==='true'),
          approved:(p.approved===true||String(p.approved).toLowerCase()==='true'),
          netwerken: _mcNetwerken(p) };
      });
      posts.sort(function(a,b){ return (a.dt?a.dt.getTime():9e15)-(b.dt?b.dt.getTime():9e15); });
      state.data.metricool={ linked:true, brandId:j.brandId||'', posts:posts };
      return true;
    }catch(e){ state.data.metricool={linked:false,posts:[]}; return false; }
  };
  DATA.metricool = function(){ return state.data.metricool; };
  /* ---- Metricool analytics (KPI-dashboard + trend), gateway-endpoint metricoolStats ----
     Contract: { ok, linked, totals:{followers,growth,reach,interactions,engagementRate},
     networks:[{network,label,followers,growth,reach,interactions}], trend:[{date,value}], trendLabel, period }. */
  DATA.loadMetricoolStats = async function(){
    if(!live()){ state.data.metricoolStats={linked:false}; return false; }
    var bid = state.activeBedrijf || '';
    if(!bid){ state.data.metricoolStats={linked:false}; return false; }
    try{
      var res = await api(ENDPOINTS.metricoolStats, base({ bedrijf_id:bid }));
      var j = (res && res.ok && res.data) ? res.data : null;
      if(!j || !j.ok || !j.linked){ state.data.metricoolStats={linked:false}; return true; }
      state.data.metricoolStats = j;
      return true;
    }catch(e){ state.data.metricoolStats={linked:false}; return false; }
  };
  DATA.metricoolStats = function(){ return state.data.metricoolStats; };
  // markeer een post lokaal als goedgekeurd (na een geslaagde metricoolApprove-call)
  DATA.markMetricoolApproved = function(postId){
    var mc = state.data.metricool; if(!mc || !mc.posts) return;
    mc.posts.forEach(function(p){ if(String(p.id)===String(postId)) p.approved=true; });
  };

  /* ---- Advertenties (Meta-insights, later Google), geïsoleerd Make-scenario, directe call ---- */
  DATA.loadAds = async function(){
    if(!live()){ state.data.ads={linked:false,campaigns:[]}; return false; }
    var bid = state.activeBedrijf || '';
    if(!bid){ state.data.ads={linked:false,campaigns:[]}; return false; }
    try{
      var r = await fetch(ADS_DIRECT, { method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},   // CORS-safe
        body:'bedrijf_id='+encodeURIComponent(bid) });
      var t = await r.text(); var j=null; try{ j=JSON.parse(t); }catch(e){}
      if(!j || !j.ok){ state.data.ads={linked:false,campaigns:[]}; return false; }
      if(!j.linked){ state.data.ads={linked:false,campaigns:[]}; return true; }
      var camps=(j.campaigns||[]).filter(function(c){return c&&c.naam!=='';}).map(function(c){
        var nm=''; try{ nm=decodeURIComponent(c.naam||''); }catch(e){ nm=c.naam||''; }
        return { naam:nm, platform:String(c.platform||'meta').toLowerCase(),
          impressies:parseInt(c.impressies,10)||0, klikken:parseInt(c.klikken,10)||0,
          budget:parseFloat(String(c.budget).replace(',','.'))||0,
          ctr:parseFloat(String(c.ctr).replace(',','.'))||0,
          bereik:parseInt(c.bereik,10)||0, objective:c.objective||'' };
      });
      camps.sort(function(a,b){ return b.budget-a.budget; });
      state.data.ads={ linked:true, campaigns:camps };
      return true;
    }catch(e){ state.data.ads={linked:false,campaigns:[]}; return false; }
  };
  DATA.ads = function(){ return state.data.ads; };

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
