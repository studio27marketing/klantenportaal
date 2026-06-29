/* =============================================================================
 * Studio 27 TEAMPORTAAL — rijke advertentie-detailweergave (1-op-1 geport uit
 * het klantenportaal v2/panels.js). De render-/grafiek-functies zijn VERBATIM
 * overgenomen; deze shim-header levert de afhankelijkheden (esc, state, S27DATA-
 * accessor, isRichView, adsActivePlatform) + no-op-stubs voor klantenportaal-only
 * onderdelen (notities, meeting-tab, client-grafieken, PDF). Geladen als globaal
 * script ná app.js; app.js roept window.S27TeamAdsRich.render(el, platform, data) aan.
 * Data komt van het team-endpoint teamAdsRich (wrapt metaAdsRich/googleAdsRich).
 * ============================================================================= */
(function(){
'use strict';
var state = window.__arState || (window.__arState = {});
var AR = window.__arCtx || (window.__arCtx = { platform:'meta', data:{ meta:null, google:null } });
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function ic(){ return ''; }
function isRichView(){ return true; }
function adsActivePlatform(){ return AR.platform==='google'?'google':'meta'; }
var S27DATA = { metaAdsRich:function(){ return AR.data.meta; }, googleAdsRich:function(){ return AR.data.google; } };
window.S27DATA = window.S27DATA || S27DATA;
if(!window.S27DATA.metaAdsRich) window.S27DATA.metaAdsRich = S27DATA.metaAdsRich;
if(!window.S27DATA.googleAdsRich) window.S27DATA.googleAdsRich = S27DATA.googleAdsRich;
function renderPanel(){} function syncUrl(){} function adsGoogleRetry(){}
function adsWsMeetingTab(){ return ''; } function adsNoteBtn(){ return ''; } function adsPeriodBar(){ return ''; }
function adsPlatformPicker(){ return ''; } function googleRichPdfFooter(){ return ''; } function adsWsRefreshGrid(){}
function adsRichAdVisual(){}
function adsClientBuildChart(){} function googleClientBuildChart(){} function adsClientMountChart(){}
function _adsApplyAccent(){ try{ document.documentElement.style.setProperty('--ads-accent', AR.platform==='google'?'#F66131':'#3083DC'); }catch(e){} }
function adsPeriod(){ return { from:'', to:'', compare:'previous' }; }
var _AR_REC_COL={red:'#DC2626',orange:'#E8A33A',blue:'#3083DC',green:'#12AC4E'};
function adsWsRecsRender(recs){
  if(!recs||!recs.length) return '<div class="card" style="padding:22px;text-align:center;color:var(--ink-3)">Geen aanbevelingen.</div>';
  return '<div class="ar-recs">'+recs.map(function(r){ var col=_AR_REC_COL[r[0]]||_AR_REC_COL.blue;
    return '<div class="ar-rec" style="--rc:'+col+'"><div class="ar-rec-t">'+esc(r[1])+'</div><div class="ar-rec-b">'+r[2]+'</div></div>'; }).join('')+'</div>';
}
function metaEur(n,cur){ var s=(Number(n)||0).toLocaleString('nl-BE',{minimumFractionDigits:2,maximumFractionDigits:2}); cur=cur||'EUR'; return cur==='EUR'?('€ '+s):(s+' '+cur); }
function adsRichTab(){ return state._adsTab||'samengevat'; }
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
  return camps.map(function(c){ return adsRichCampaign(c,cur); }).join('');
}
function adsRichMountTabCharts(){
  _adsApplyAccent();
  if(!isRichView()) return;
  if(adsActivePlatform()==='google') return googleRichMountTabCharts();
  var t=adsRichTab();
  if(t==='samengevat'){ adsRichLoadChart().then(function(ok){ if(ok&&window.Chart){ var m=(window.S27DATA&&S27DATA.metaAdsRich)?S27DATA.metaAdsRich():null; if(m&&m.linked) adsRichBuildAccountChart(m, m.currency||'EUR'); } }); }
  else if(t==='campagnes'){ adsRichMountCharts(); }
}
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
    { key:'convValue',   label:'Waarde',      color:'#F697CE', axis:'money', daily:'convValue',   kind:'line' },
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
function adsRichNotLinked(){ return '<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">Nog geen Meta-advertentieaccount gekoppeld</div><div style="color:var(--ink-3);max-width:470px;margin:0 auto;line-height:1.55">Koppel het Meta-advertentieaccount van deze klant (veld “Meta Ads ID” op de bedrijf-taak) om hier de uitgebreide rapportage te zien.</div></div>'; }
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
// metric-config: [invert (lager=beter), type], type 'pct' = ratio (% via arCmp), e/n/d = absoluut (vs vorig getal).
var AR_METRIC={spend:[true,'e'],cpc:[true,'e'],cpm:[true,'e'],cpl:[true,'e'],costPerConv:[true,'e'],frequency:[true,'d'],clicks:[false,'n'],linkClicks:[false,'n'],impressions:[false,'n'],reach:[false,'n'],leads:[false,'n'],results:[false,'n'],conversions:[false,'d'],convValue:[false,'e'],ctr:[false,'pct'],convRate:[false,'pct']};
// per-rij vergelijkings-delta: leest row.prev[key] (backend stuurt 'prev' per campagne/adset/ad/adgroep/keyword).
function arRowDelta(r,key,cur){
  if(!r||!r.prev||r.prev[key]==null) return '';
  var m=AR_METRIC[key]; if(!m) return '';
  var cv=(key==='linkClicks')?(r.linkClicks||r.clicks):r[key];
  var pvv=(key==='linkClicks')?(r.prev.linkClicks||r.prev.clicks):r.prev[key];
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
function adsRichObjLabel(o){ o=String(o||'').toUpperCase(); var map={OUTCOME_LEADS:'Leads',LEAD_GENERATION:'Leadgeneratie',OUTCOME_SALES:'Verkoop',CONVERSIONS:'Conversies',OUTCOME_TRAFFIC:'Verkeer',LINK_CLICKS:'Verkeer',OUTCOME_ENGAGEMENT:'Betrokkenheid',POST_ENGAGEMENT:'Betrokkenheid',OUTCOME_AWARENESS:'Naamsbekendheid',BRAND_AWARENESS:'Naamsbekendheid',REACH:'Bereik',VIDEO_VIEWS:'Videoweergaven',OUTCOME_APP_PROMOTION:'App-promotie'}; return o?(map[o]||_titleCase(o)):''; }
function adsRichCampaign(c,cur){
  var obj=c.objective?'<span class="ar-obj">'+esc(adsRichObjLabel(c.objective))+'</span>':'';
  var bud=c.budget?'<span class="ar-bud">'+arEur(c.budget,cur)+(c.budgetType==='daily'?' /dag':'')+'</span>':'';
  return '<div class="ar-camp" data-cid="'+esc(c.id)+'">'
    +'<div class="ar-camp-head"><span class="ar-camp-nm">'+esc(c.name||'Campagne')+'</span><div class="ar-camp-meta">'+adsRichStatus(c.status)+obj+bud+'</div></div>'
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
  var hasLeads=((Number(c.leads)||0)>0)||(c.prev&&(Number(c.prev.leads)||0)>0);
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
  (ads||[]).forEach(function(a){ var nm=a.name||'(naamloos)'; if(!map[nm]){ map[nm]={name:nm,count:0,spend:0,impressions:0,clicks:0,linkClicks:0,leads:0,status:a.status,_ctr:Number(a.ctr)||0,_cpc:Number(a.cpc)||0,_cpl:Number(a.cpl)||0}; order.push(nm); } var g=map[nm]; g.count++; g.spend+=a.spend||0; g.impressions+=a.impressions||0; g.clicks+=a.clicks||0; g.linkClicks+=a.linkClicks||0; g.leads+=a.leads||0; });
  return order.map(function(nm){ var g=map[nm];
    if(g.count>1){ g.ctr=g.impressions?(g.clicks/g.impressions*100):0; g.cpc=g.clicks?(g.spend/g.clicks):0; g.cpl=g.leads?(g.spend/g.leads):0; g.merged=true; }
    else { g.ctr=g._ctr; g.cpc=g._cpc; g.cpl=g._cpl; g.merged=false; }
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
function adsRichAdsetTable(c,cur){ var s=arSortState(c.id,'adsets'); var rows=(c.adsets||[]).slice().sort(function(a,b){return _arCmpVal(a,b,s);}); return _arTable('adsets',c.id,AR_ADSET_COLS,s,rows,cur,'Geen adsets met data in deze periode.'); }
function adsRichAdTable(c,cur){ var s=arSortState(c.id,'ads'); var rows=adsRichMergeAds(c.ads).sort(function(a,b){return _arCmpVal(a,b,s);}); rows.forEach(function(r){r._cid=c.id;}); return _arTable('ads',c.id,AR_AD_COLS,s,rows,cur,'Geen advertenties met data in deze periode.'); }
function adsRichSort(cid,which,key){ var s=arSortState(cid,which); if(s.key===key){ s.dir=-s.dir; } else { s.key=key; s.dir=(key==='name'||key==='status')?1:-1; } var c=_arFindCamp(cid); if(!c) return; var host=document.getElementById('art_'+which+'_'+cid); if(host){ host.outerHTML=(which==='adsets'?adsRichAdsetTable(c,_arCur()):adsRichAdTable(c,_arCur())); } }
/* ---- optimalisatie-aanbevelingen (data-gedreven heuristieken) ---- */
// Lijst-vorm (gedeeld door de schermweergave + de PDF-export): [severity, titel, body].
function adsRichOptimList(camps){
  var recs=[];
  (camps||[]).forEach(function(c){
    if(c.frequency>7) recs.push(['orange','Hoge frequentie bij “'+(c.name||'campagne')+'”','Frequentie '+arDec(c.frequency,1)+'×, dezelfde mensen zien je ad vaak. Overweeg nieuwe visuals of een breder publiek.']);
    if((c.adsets||[]).length>1){ var tot=c.adsets.reduce(function(a,x){return a+(x.spend||0);},0); var top=c.adsets.slice().sort(function(a,b){return b.spend-a.spend;})[0]; if(tot>0 && top && top.spend/tot>0.6) recs.push(['blue','Budget geconcentreerd in “'+(c.name||'campagne')+'”','Eén adset (“'+(top.name||'')+'”) neemt '+Math.round(top.spend/tot*100)+'% van het budget. Check of de andere adsets genoeg kans krijgen.']); }
    var ads=adsRichMergeAds(c.ads||[]); if(ads.length>3){ var totA=ads.reduce(function(a,x){return a+(x.spend||0);},0); var top3=ads.slice().sort(function(a,b){return b.spend-a.spend;}).slice(0,3).reduce(function(a,x){return a+(x.spend||0);},0); if(totA>0 && top3/totA>0.5) recs.push(['blue','Spend op enkele ads in “'+(c.name||'campagne')+'”','De top 3 advertenties nemen '+Math.round(top3/totA*100)+'% van het budget. Pauzeer zwakke ads of test nieuwe varianten.']); }
    if((c.leads||0)===0 && (c.linkClicks||c.clicks||0)>500) recs.push(['red','Klikken zonder leads bij “'+(c.name||'campagne')+'”',(c.linkClicks||c.clicks)+' klikken maar 0 leads. Controleer de landingspagina/het formulier of de conversie-tracking.']);
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
  adsRichLoadChart().then(function(ok){ if(!ok||!window.Chart) return; m.campaigns.forEach(function(c){ adsRichBuildChart(c, m.currency||'EUR'); }); });
}
// Per-campagne dag-grafiek (taak 3): zelfde klikbare selector-mechaniek als het overzicht, per campagne gesleuteld.
function adsRichBuildChart(c,cur){
  adsBuildSelChart({ canvasId:'arch_'+c.id, chartKey:c.id, rows:(c.daily||[]),
    metrics:adsSelMetrics('meta'), sel:adsCampSel('meta',c.id), cur:cur,
    has:function(k){ return (c.daily||[]).some(function(d){ return Number(k==='linkClicks'?(d.linkClicks||d.clicks):d[k])>0; }); } });
}
function googleRichNotLinked(){
  // Team-weergave: toon de ECHTE reden (uit de worker) zodat een teamlid meteen weet wat te doen
  // i.p.v. een eindeloze laadspinner. 'bad_id' = veld bevat geen 10-cijferig klant-id; 'account_error' =
  // id klopt qua vorm maar Google geeft geen toegang; 'no_token' = server-koppeling ontbreekt.
  var g=(window.S27DATA&&S27DATA.googleAdsRich&&S27DATA.googleAdsRich())||{};
  var r=g.reason||'', title, body;
  if(r==='bad_id'){
    title='Google Ads ID lijkt niet te kloppen';
    body='Het veld &ldquo;Google Ads ID&rdquo; op de bedrijf-taak bevat '+(g.account?('&ldquo;<b>'+esc(g.account)+'</b>&rdquo;'):'een waarde')+', maar een Google Ads klant-id bestaat uit <b>10 cijfers</b> (formaat 123-456-7890). Corrigeer het in ClickUp.';
  } else if(r==='account_error'){
    title='Google Ads-account niet bereikbaar';
    body='Het klant-id is ingevuld, maar Google geeft geen data terug. Controleer of het id klopt en of dit account onder het beheeraccount (MCC) van Studio&nbsp;27 hangt.'+(g.detail?'<br><span style="font-size:12px;color:var(--ink-4)">'+esc(g.detail)+'</span>':'');
  } else if(r==='no_token'){
    title='Google Ads-koppeling ontbreekt';
    body='De Google Ads API-koppeling (developer- of refresh-token) is niet ingesteld op de server.';
  } else {
    title='Nog geen Google Ads-account gekoppeld';
    body='Koppel het Google Ads-klant-id van deze klant (veld &ldquo;Google Ads ID&rdquo; op de bedrijf-taak) om hier de uitgebreide rapportage te zien.';
  }
  return '<div class="card" style="padding:30px 26px;text-align:center"><div style="font-family:var(--font-display);font-weight:800;font-size:17px;margin-bottom:6px">'+title+'</div><div style="color:var(--ink-3);max-width:480px;margin:0 auto;line-height:1.55">'+body+'</div></div>';
}
function _gCur(){ var g=(window.S27DATA&&S27DATA.googleAdsRich&&S27DATA.googleAdsRich()); return (g&&g.currency)||'EUR'; }
function _gFindCamp(cid){ var g=(window.S27DATA&&S27DATA.googleAdsRich&&S27DATA.googleAdsRich()); if(!g||!g.campaigns) return null; for(var i=0;i<g.campaigns.length;i++){ if(String(g.campaigns[i].id)===String(cid)) return g.campaigns[i]; } return null; }
function _gMatch(mt){ return ({EXACT:'Exact',PHRASE:'Zinsdeel',BROAD:'Breed',BROAD_MATCH_MODIFIER:'Breed+'})[String(mt||'').toUpperCase()]||(mt?_titleCase(mt):'-'); }
function googleAdsBodyRich(){ return adsRichChrome(googleRichSubnav())+'<div id="adsBody">'+googleRichTabBody()+'</div>'+googleRichPdfFooter(); }
function googleRichSubnav(){
  var t=adsRichTab();
  var tabs=[['samengevat','Samengevat','st_progress'],['campagnes','Campagnes','cal'],['gegevens','Zoektermen','st_approved'],['aanbevelingen','Aanbevelingen','msg']];   // 'Maandoverzicht' verwijderd; 'Zoekwoorden'->'Zoektermen'
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
    var d=p?(fmt?arCmpAbs(k[key],p[key],invert,fmt):arCmp(k[key],p[key],invert)):'';
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
      card('CTR',arPct(k.ctr),'ctr',false),
      card('CPC',arEur(k.cpc,cur),'cpc',true,fE),
      card('Leads',arDec(k.conversions,2),'conversions',false,fD),
      card('CPL',k.conversions?arEur(k.costPerConv,cur):'-','costPerConv',true,fE),
      card('Waarde',arEur(k.convValue,cur),'convValue',false,fE),
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
      card('CTR', arPct(k.ctr), 'ctr', false),
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
  // CANONIEKE Google-volgorde: Besteed → Vertoningen → CPM → Klikken → CTR → CPC → Leads → CPL → Waarde → Leadratio.
  var items=[['Besteed',arEur(c.spend,cur),'spend'],['Vertoningen',arNum(c.impressions),'impressions'],['CPM',arEur(c.cpm,cur),'cpm'],['Klikken',arNum(c.clicks),'clicks'],['CTR',arPct(c.ctr),'ctr'],['CPC',arEur(c.cpc,cur),'cpc'],['Leads',arDec(c.conversions,2),'conversions'],['CPL',c.conversions?arEur(c.costPerConv,cur):'-','costPerConv'],['Waarde',arEur(c.convValue,cur),'convValue'],['Leadratio',arPct(c.convRate),'convRate']];
  return adsCampKpiGrid('google',c,cur,items);
}
function googleRichCampaign(c,cur){
  var chan=c.channel?'<span class="ar-obj">'+esc(c.channel)+'</span>':'';
  var bud=c.budget?'<span class="ar-bud">'+arEur(c.budget,cur)+' /dag</span>':'';
  var is=(c.imprShare>0)?'<span class="ar-bud" title="Vertonings-aandeel zoeknetwerk">Vert.aandeel '+arPct(c.imprShare)+'</span>':'';
  return '<div class="ar-camp" data-cid="'+esc(c.id)+'">'
    +'<div class="ar-camp-head"><span class="ar-camp-nm">'+esc(c.name||'Campagne')+'</span><div class="ar-camp-meta">'+adsRichStatus(c.status)+chan+bud+is+'</div></div>'
    +googleRichCampKpis(c,cur)
    +(c.daily&&c.daily.length?'<div class="ar-chartwrap"><canvas id="garch_'+esc(c.id)+'"></canvas></div>':'')
    +googleRichAdGroupTable(c,cur)
    +'</div>';
}
function googleRichCampagnes(g,cur){
  var camps=(g.campaigns||[]);
  if(!camps.length) return '<div class="card" style="padding:24px;text-align:center;color:var(--ink-3)">Geen campagnes met activiteit in deze periode.</div>';
  return camps.map(function(c){ return googleRichCampaign(c,cur); }).join('');
}
// CANONIEKE Google-kolomvolgorde: Besteed → Vert. → CPM → Klikken → CTR → CPC → Leads → CPL → Waarde → Leadratio.
var G_AG_COLS=[['name','Advertentiegroep',0],['status','Status',0],['spend','Besteed',1],['impressions','Vert.',1],['cpm','CPM',1],['clicks','Klikken',1],['ctr','CTR',1],['cpc','CPC',1],['conversions','Leads',1],['costPerConv','CPL',1],['convValue','Waarde',1],['convRate','Leadratio',1]];
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
function googleRichOptimList(g){
  var recs=[]; var camps=(g.campaigns||[]);
  camps.forEach(function(c){
    if((c.conversions||0)===0 && (c.clicks||0)>300) recs.push(['red','Klikken zonder conversies bij &ldquo;'+esc(c.name||'campagne')+'&rdquo;',arNum(c.clicks)+' klikken maar 0 conversies. Controleer de landingspagina, het formulier of de conversie-tracking.']);
    if(c.imprShare>0 && c.imprShare<40 && (c.spend||0)>0) recs.push(['orange','Laag vertonings-aandeel bij &ldquo;'+esc(c.name||'campagne')+'&rdquo;','Vertonings-aandeel '+arPct(c.imprShare)+', je mist vertoningen. Een hoger budget of een betere kwaliteitsscore kan helpen.']);
    if(c.ctr>0 && c.ctr<2 && (c.impressions||0)>1000) recs.push(['blue','Lage CTR bij &ldquo;'+esc(c.name||'campagne')+'&rdquo;','CTR '+arPct(c.ctr)+', test scherpere advertentieteksten of relevantere zoekwoorden.']);
  });
  var noConvKw=(g.keywords||[]).filter(function(k){return (k.conversions||0)===0 && (k.spend||0)>0;}).sort(function(a,b){return b.spend-a.spend;})[0];
  if(noConvKw && noConvKw.spend>0) recs.push(['orange','Besteding op niet-converterend zoekwoord','&ldquo;'+esc(noConvKw.text||'')+'&rdquo; gaf '+arEur(noConvKw.spend,_gCur())+' uit zonder conversie. Overweeg het te pauzeren of als uitsluitings-zoekwoord toe te voegen.']);
  if(!recs.length) recs.push(['green','Geen knelpunten gevonden','De Google-campagnes draaien gezond binnen de gangbare richtlijnen voor deze periode.']);
  return recs;
}
function googleRichOptim(g,cur){
  return adsWsRecsRender(googleRichOptimList(g));
}
function googleRichMountTabCharts(){
  _adsApplyAccent();
  if(!isRichView()||adsActivePlatform()!=='google') return;
  var t=adsRichTab();
  var g=(window.S27DATA&&S27DATA.googleAdsRich)?S27DATA.googleAdsRich():null; if(!g||!g.linked) return;
  adsRichLoadChart().then(function(ok){ if(!ok||!window.Chart) return;
    if(t==='samengevat') googleRichBuildAccountChart(g,g.currency||'EUR');
    else if(t==='campagnes') (g.campaigns||[]).forEach(function(c){ googleRichBuildCampChart(c,g.currency||'EUR'); });
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

/* ---- team-wiring: subnav + publieke render-API ---- */
function arSubnav(platform){
  var t=(state._adsTab||'samengevat');
  var tabs=[['samengevat','Samengevat'],['campagnes','Campagnes']];
  if(platform==='google') tabs.push(['gegevens','Zoektermen']);
  tabs.push(['aanbevelingen','Aanbevelingen']);
  return '<div class="soc-subnav-row"><div class="soc-subnav" id="adsSubnav">'+tabs.map(function(x){
    return '<button class="soc-subtab'+(t===x[0]?' active':'')+'" data-atab="'+x[0]+'" onclick="adsRichSetTab(\''+x[0]+'\')">'+esc(x[1])+'</button>';
  }).join('')+'</div></div>';
}
window.S27TeamAdsRich = {
  render: function(containerEl, platform, data){
    if(!containerEl) return;
    AR.platform = (platform==='google'?'google':'meta');
    AR.data[AR.platform] = data;
    if(!state._adsTab) state._adsTab='samengevat';
    if(AR.platform!=='google' && state._adsTab==='gegevens') state._adsTab='samengevat';
    var body = AR.platform==='google' ? googleRichTabBody() : adsRichTabBody();
    containerEl.innerHTML = arSubnav(AR.platform)+'<div id="adsBody">'+body+'</div>';
    if(AR.platform==='google') googleRichMountTabCharts(); else adsRichMountTabCharts();
  },
  setTab: function(name){ state._adsTab=name; }
};
window.adsRichSetTab = adsRichSetTab;
window.adsChartToggle = adsChartToggle;
window.adsCampChartToggle = adsCampChartToggle;
window.adsRichSort = adsRichSort;
window.googleRichSort = googleRichSort;
window.gKwSetCamp = gKwSetCamp;
})();
