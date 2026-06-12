/* =============================================================================
 * Studio 27 - SHOOT-LAB (read-only glass-box)  -  /shoot-lab
 * -----------------------------------------------------------------------------
 * Visuele validatie-schil op de PRODUCTIE-engine shootEngineDayMap (handlers.mjs,
 * sectie "SHOOT-ENGINE V2"). Sinds de productie-omschakeling (2026-06-12) rekent
 * dit lab met exact dezelfde kern als shootContext/shootSubmit/public-endpoint —
 * wat hier staat, is per definitie wat het klantenportaal toont. Drift onmogelijk.
 *
 * Lab-extra's t.o.v. productie:
 *   - per-dag drawer met de blokken per cameraman (bron + uur + suspect-vlag);
 *   - oud-vs-nieuw-vergelijking (free_old = enkel shoots-startdag + payroll);
 *   - toggles: horizon, niet-goedgekeurde aanvragen TOCH blokkeren (productie
 *     doet dat NIET - Vincent-regel), ClickUp-syncs in agenda tellen (productie
 *     negeert ze), als vergelijkingsmateriaal;
 *   - gcal-status per host (events-modus / vangnet / fout).
 * Schrijft niets weg. Lockable via env.SHOOTLAB_KEY (?k=...), anders open.
 * ============================================================================= */

import { shootEngineDayMap, _shootEngineTest } from './handlers.mjs';

const str = (v) => (v == null ? '' : String(v));

// pure productie-helpers doorgeven aan de node-test-harness.
export const _labTest = _shootEngineTest;

/* ---- route-handler: /shoot-lab (HTML) + /shoot-lab/api (JSON) ------------ */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Vary': 'Origin' };
const jsonRes = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });

export async function handleShootLab(request, env, ctx) {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
  if (request.method !== 'GET') return jsonRes({ ok: false, error: 'method_not_allowed' }, 405);

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/+|\/+$/g, '');

  if (env && env.SHOOTLAB_KEY) {
    if (str(url.searchParams.get('k')) !== str(env.SHOOTLAB_KEY)) {
      if (path === 'shoot-lab/api') return jsonRes({ ok: false, error: 'forbidden' }, 403);
      return new Response('<!doctype html><meta charset=utf-8><body style="font-family:system-ui;padding:40px">🔒 Shoot-lab is vergrendeld. Voeg <code>?k=…</code> toe aan de URL.</body>', { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS } });
    }
  }

  if (path === 'shoot-lab/api') {
    if (!env || !env.CLICKUP_TOKEN) return jsonRes({ ok: false, error: 'gateway_misconfigured' }, 500);
    try {
      const map = await shootEngineDayMap(env, {
        horizonDays: Number(url.searchParams.get('horizon')) || 60,
        // PRODUCTIE-DEFAULTS: aanvragen blokkeren NIET, syncs genegeerd. De toggles
        // bestaan enkel om het verschil te demonstreren.
        includeAanvraag: str(url.searchParams.get('aanvraag')) === '1',
        syncFilter: str(url.searchParams.get('sync')) !== '0',
        detail: true,
      });
      return jsonRes({
        ok: true,
        generated: Date.now(),
        horizon_days: map.days.length,
        include_aanvraag: map.include_aanvraag,
        sync_filter: map.sync_filter,
        total_hosts: map.total,
        hosts: map.hosts.map((h) => ({ naam: h.name, gcal: h.gcal })),
        gcal_active: map.gcal_active,
        gcal_global_error: map.gcal_global,
        days: map.days.map((d) => ({
          date: d.date,
          weekend: d.weekend,
          free_raw: d.free_raw,
          claims: d.claims,
          claim_total: d.claim_total,
          free_new: d.free,
          free_old: d.free_old,
          hosts: (d.hosts || []).map((h) => ({ naam: h.naam, vrij: h.vrij, blocks: h.blocks })),
        })),
      }, 200);
    } catch (e) {
      return jsonRes({ ok: false, error: 'lab_error', detail: str(e && e.message) }, 200);
    }
  }

  const keyQS = (env && env.SHOOTLAB_KEY) ? ('?k=' + encodeURIComponent(url.searchParams.get('k') || '')) : '';
  return new Response(LAB_HTML.replace('__KEYQS__', keyQS), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
}

/* ---- de glass-box testpagina (standalone, vanilla; GEEN backticks/${} in het
 * embedded script — dit hele document is één JS-template-string) ----------- */
const LAB_HTML = `<!doctype html>
<html lang="nl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Shoot-lab · beschikbaarheid testen</title>
<style>
  :root{
    --ink:#15131f; --ink-2:#4a4660; --ink-3:#8b86a3; --line:#e7e3f0; --bg:#f6f4fb; --card:#fff;
    --accent:#6d28d9; --accent-soft:#efe9fc;
    --free:#16a34a; --free-bg:#e9f9ef; --some:#d97706; --some-bg:#fdf3e3; --none:#dc2626; --none-bg:#fdeaea;
    --shoot:#6d28d9; --meeting:#2563eb; --payroll:#0d9488; --agenda:#db2777; --claim:#b45309;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased}
  header{background:var(--card);border-bottom:1px solid var(--line);padding:18px 22px;position:sticky;top:0;z-index:5}
  h1{margin:0;font-size:19px;font-weight:700;letter-spacing:-.01em}
  .sub{margin:3px 0 0;font-size:13px;color:var(--ink-3)}
  .wrap{max-width:1180px;margin:0 auto;padding:20px 22px 80px}
  .controls{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin-bottom:12px}
  .ctl{display:flex;flex-direction:column;gap:5px}
  .ctl label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3)}
  .seg{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden}
  .seg button{border:0;background:var(--card);padding:7px 13px;font-size:13px;font-weight:600;color:var(--ink-2);cursor:pointer}
  .seg button.on{background:var(--accent);color:#fff}
  .chk{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2);cursor:pointer;user-select:none}
  .chk input{width:16px;height:16px;accent-color:var(--accent)}
  .legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin-left:auto;font-size:12px;color:var(--ink-2)}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .dot{width:11px;height:11px;border-radius:3px;display:inline-block}
  .gstat{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;font-size:12px}
  .gstat span{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:4px 12px;color:var(--ink-2)}
  .gstat b.ok{color:var(--free)} .gstat b.err{color:var(--none)}
  .month{margin:0 0 6px;font-size:14px;font-weight:700;color:var(--ink-2);padding-top:10px}
  .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}
  .dow{font-size:11px;font-weight:700;color:var(--ink-3);text-align:center;text-transform:uppercase;letter-spacing:.04em;padding:2px 0}
  .cell{background:var(--card);border:1px solid var(--line);border-radius:10px;min-height:66px;padding:7px 8px;cursor:pointer;position:relative;transition:transform .06s,box-shadow .12s}
  .cell:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(40,20,80,.08)}
  .cell.empty{background:transparent;border:0;cursor:default}
  .cell.weekend{background:#faf9fe}
  .cell .d{font-size:13px;font-weight:700}
  .cell .cnt{position:absolute;right:7px;top:6px;font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px}
  .cell .bar{position:absolute;left:8px;right:8px;bottom:7px;height:5px;border-radius:3px;background:var(--line);overflow:hidden}
  .cell .bar i{display:block;height:100%}
  .cell .tags{position:absolute;left:8px;bottom:15px;display:flex;gap:4px;font-size:10px;font-weight:700}
  .cell .delta{color:var(--accent)}
  .cell .clm{color:var(--claim)}
  .f-free .cnt{background:var(--free-bg);color:var(--free)} .f-free .bar i{background:var(--free)}
  .f-some .cnt{background:var(--some-bg);color:var(--some)} .f-some .bar i{background:var(--some)}
  .f-none .cnt{background:var(--none-bg);color:var(--none)} .f-none .bar i{background:var(--none)}
  .state{padding:40px;text-align:center;color:var(--ink-3);font-size:14px}
  .scrim{position:fixed;inset:0;background:rgba(20,12,40,.34);opacity:0;pointer-events:none;transition:opacity .15s;z-index:20}
  .scrim.on{opacity:1;pointer-events:auto}
  .drawer{position:fixed;top:0;right:0;height:100%;width:430px;max-width:92vw;background:var(--card);box-shadow:-12px 0 40px rgba(30,16,60,.18);transform:translateX(100%);transition:transform .2s;z-index:21;display:flex;flex-direction:column}
  .drawer.on{transform:none}
  .drawer h2{margin:0;font-size:16px;font-weight:700}
  .dhead{padding:18px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
  .dhead .x{border:0;background:var(--bg);width:30px;height:30px;border-radius:8px;font-size:17px;cursor:pointer;color:var(--ink-2);flex:none}
  .dbody{padding:8px 20px 30px;overflow:auto}
  .host{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:12px}
  .host .top{display:flex;align-items:center;gap:9px}
  .host .nm{font-weight:700;font-size:14px}
  .pill{font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;margin-left:auto}
  .pill.free{background:var(--free-bg);color:var(--free)} .pill.busy{background:var(--none-bg);color:var(--none)}
  .blk{display:flex;align-items:center;gap:9px;margin-top:9px;font-size:13px;color:var(--ink-2)}
  .badge{font-size:10px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#fff;padding:2px 7px;border-radius:6px;flex:none}
  .b-shoot{background:var(--shoot)} .b-meeting{background:var(--meeting)} .b-payroll{background:var(--payroll)} .b-agenda{background:var(--agenda)} .b-claim{background:var(--claim)}
  .blk .tm{font-variant-numeric:tabular-nums;color:var(--ink-3);flex:none}
  .blk .lb{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .claimbox{border:1px dashed var(--claim);background:#fffaf2;border-radius:12px;padding:12px 14px;margin-top:12px}
  .claimbox .ti{font-weight:700;font-size:13px;color:var(--claim)}
  .foot{font-size:12px;color:var(--ink-3);margin-top:18px;line-height:1.5}
  .prodnote{background:var(--accent-soft);border:1px solid #ded2f7;color:#4c1d95;border-radius:12px;padding:10px 14px;font-size:12.5px;margin:0 0 14px}
  @media(max-width:680px){ .cell{min-height:58px} .legend{width:100%;margin:6px 0 0} }
</style></head>
<body>
<header>
  <h1>🎥 Shoot-lab — beschikbaarheid testen</h1>
  <p class="sub">Glass-box op de <b>productie-engine</b> van het klantenportaal: shoots + meetings + payroll + Google-agenda per cameraman. Read-only.</p>
</header>
<div class="wrap">
  <div class="prodnote">✅ Dit lab rekent met exact dezelfde engine als het klantenportaal. Productie-regels: niet-goedgekeurde verlofaanvragen blokkeren <b>niet</b>, ClickUp-syncs (🔄) in agenda&#39;s worden genegeerd. De toggles hieronder bestaan enkel om het verschil te tonen.</div>
  <div class="controls">
    <div class="ctl"><label>Horizon</label>
      <div class="seg" id="seg-h">
        <button data-h="30">30 dagen</button><button data-h="60" class="on">60 dagen</button><button data-h="90">90 dagen</button>
      </div>
    </div>
    <div class="ctl"><label>Vergelijk: aanvragen</label>
      <label class="chk"><input type="checkbox" id="aanvraag"> niet-goedgekeurde TOCH blokkeren</label>
    </div>
    <div class="ctl"><label>Vergelijk: agenda-syncs</label>
      <label class="chk"><input type="checkbox" id="syncf" checked> ClickUp-syncs (🔄) negeren</label>
    </div>
    <div class="ctl"><label>Vergelijk: engine</label>
      <label class="chk"><input type="checkbox" id="oud"> toon oude engine (enkel shoots+payroll)</label>
    </div>
    <div class="legend">
      <span><i class="dot" style="background:var(--free)"></i> ruim vrij</span>
      <span><i class="dot" style="background:var(--some)"></i> deels bezet</span>
      <span><i class="dot" style="background:var(--none)"></i> volzet</span>
      <span><i class="dot" style="background:var(--shoot)"></i> shoot</span>
      <span><i class="dot" style="background:var(--meeting)"></i> meeting</span>
      <span><i class="dot" style="background:var(--payroll)"></i> payroll</span>
      <span><i class="dot" style="background:var(--agenda)"></i> agenda</span>
      <span><i class="dot" style="background:var(--claim)"></i> pool-claim</span>
    </div>
  </div>
  <div class="gstat" id="gstat"></div>
  <div id="cal" class="state">Beschikbaarheid laden…</div>
  <p class="foot" id="meta"></p>
</div>

<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-hidden="true">
  <div class="dhead"><div><h2 id="d-title">—</h2><div class="sub" id="d-sub"></div></div><button class="x" id="d-x">✕</button></div>
  <div class="dbody" id="d-body"></div>
</aside>

<script>
var KEYQS = "__KEYQS__";
var DOW = ['ma','di','wo','do','vr','za','zo'];
var MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
var STATE = { horizon:60, aanvraag:false, syncf:true, oud:false, data:null };

function classFor(free,total){ if(free>=Math.ceil(total*0.66)) return 'f-free'; if(free===0) return 'f-none'; return 'f-some'; }
function fmtDateLong(ymd){ var d=new Date(ymd+'T12:00:00Z'); return DOW[(d.getUTCDay()+6)%7]+' '+d.getUTCDate()+' '+MONTHS[d.getUTCMonth()]; }
function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

function load(){
  var cal=document.getElementById('cal');
  cal.className='state'; cal.textContent='Beschikbaarheid laden…';
  var sep = KEYQS ? '&' : '?';
  var u = '/shoot-lab/api'+KEYQS+sep+'horizon='+STATE.horizon+'&aanvraag='+(STATE.aanvraag?'1':'0')+'&sync='+(STATE.syncf?'1':'0');
  fetch(u).then(function(r){return r.json();}).then(function(d){
    if(!d || !d.ok){ cal.textContent='Fout: '+((d&&d.detail)||(d&&d.error)||'onbekend'); return; }
    STATE.data=d; render();
  }).catch(function(){ cal.textContent='Kon data niet laden.'; });
}

function render(){
  var d=STATE.data, total=d.total_hosts;
  var cal=document.getElementById('cal'); cal.className=''; cal.innerHTML='';

  var gs=document.getElementById('gstat'); gs.innerHTML='';
  for(var gi=0; gi<d.hosts.length; gi++){
    var h=d.hosts[gi]; var ok=(String(h.gcal).indexOf('ok')===0);
    gs.innerHTML+='<span>'+escapeHtml(h.naam)+' · agenda: <b class="'+(ok?'ok':'err')+'">'+(ok?('✓ '+escapeHtml(h.gcal)):('⚠ '+escapeHtml(h.gcal)))+'</b></span>';
  }
  if(d.gcal_global_error) gs.innerHTML+='<span>⚠ <b class="err">'+escapeHtml(d.gcal_global_error)+'</b></span>';

  document.getElementById('meta').innerHTML =
    'Gegenereerd: '+new Date(d.generated).toLocaleString('nl-BE')+' · cameraploeg: '+d.hosts.map(function(h){return h.naam;}).join(', ')+
    ' · horizon '+d.horizon_days+' dagen · cijfer per dag = boekbare plekken ná aftrek van pool-claims · aanvragen blokkeren: '+(d.include_aanvraag?'JA (vergelijkmodus)':'nee (productie)')+'.';

  var byMonth={};
  for(var i=0;i<d.days.length;i++){ var day=d.days[i]; var k=day.date.slice(0,7); (byMonth[k]=byMonth[k]||[]).push(day); }

  for(var mk in byMonth){
    var parts=mk.split('-');
    var title=document.createElement('div'); title.className='month'; title.textContent=MONTHS[+parts[1]-1]+' '+parts[0]; cal.appendChild(title);
    var dows=document.createElement('div'); dows.className='grid';
    for(var di=0;di<7;di++){var e=document.createElement('div');e.className='dow';e.textContent=DOW[di];dows.appendChild(e);} cal.appendChild(dows);
    var grid=document.createElement('div'); grid.className='grid'; grid.style.marginTop='4px';
    var first=byMonth[mk][0]; var lead=(new Date(first.date+'T12:00:00Z').getUTCDay()+6)%7;
    for(var li=0;li<lead;li++){var em=document.createElement('div');em.className='cell empty';grid.appendChild(em);}
    for(var ci=0;ci<byMonth[mk].length;ci++){
      (function(day){
        var free = STATE.oud ? day.free_old : day.free_new;
        var cell=document.createElement('div');
        cell.className='cell '+classFor(free,total)+(day.weekend?' weekend':'');
        var dd=new Date(day.date+'T12:00:00Z').getUTCDate();
        var inner='<div class="d">'+dd+'</div><div class="cnt">'+free+'/'+total+'</div>';
        var tags='';
        if(!STATE.oud){
          var delta = day.free_old - day.free_new;
          if(delta>0) tags+='<span class="delta" title="hosts die de oude engine vals als vrij toonde">−'+delta+'</span>';
          if(day.claim_total>0) tags+='<span class="clm" title="pool-plekken geclaimd door nog niet toegewezen shoots">⛺'+day.claim_total+'</span>';
        }
        if(tags) inner+='<div class="tags">'+tags+'</div>';
        inner+='<div class="bar"><i style="width:'+Math.round(free/total*100)+'%"></i></div>';
        cell.innerHTML=inner;
        cell.onclick=function(){openDay(day);};
        grid.appendChild(cell);
      })(byMonth[mk][ci]);
    }
    cal.appendChild(grid);
  }
}

function openDay(day){
  document.getElementById('d-title').textContent=fmtDateLong(day.date);
  var subtxt=(STATE.oud?day.free_old:day.free_new)+' van '+STATE.data.total_hosts+' plekken vrij';
  if(!STATE.oud && day.claim_total>0) subtxt+=' ('+day.free_raw+' hosts vrij − '+day.claim_total+' pool-claim'+(day.claim_total>1?'s':'')+')';
  if(day.weekend) subtxt+=' · weekend';
  document.getElementById('d-sub').textContent=subtxt;
  var body=document.getElementById('d-body'); body.innerHTML='';

  if(day.claims && day.claims.length){
    var cb=document.createElement('div'); cb.className='claimbox';
    var ch='<div class="ti">⛺ Nog niet (volledig) toegewezen shoots — claimen '+day.claim_total+' pool-plek'+(day.claim_total>1?'ken':'')+'</div>';
    for(var qi=0;qi<day.claims.length;qi++){
      var c=day.claims[qi];
      ch+='<div class="blk"><span class="badge b-claim">claim '+c.claim+'</span><span class="lb">'+(c.suspect?'⚠️ ':'')+escapeHtml(c.label)+'</span><span class="tm">'+c.toegewezen+'/'+c.nodig+' bemand</span></div>';
    }
    cb.innerHTML=ch; body.appendChild(cb);
  }

  for(var hi=0;hi<day.hosts.length;hi++){
    var h=day.hosts[hi];
    var card=document.createElement('div'); card.className='host';
    var html='<div class="top"><span class="nm">'+escapeHtml(h.naam)+'</span>'+
      (h.vrij?'<span class="pill free">vrij</span>':'<span class="pill busy">bezet</span>')+'</div>';
    if(!h.blocks.length){ html+='<div class="blk" style="color:var(--free)">— volledige dag vrij —</div>'; }
    else for(var bi=0;bi<h.blocks.length;bi++){
      var b=h.blocks[bi];
      var tm = b.allDay ? 'hele dag' : ((b.van||'')+(b.tot?('–'+b.tot):''));
      html+='<div class="blk"><span class="badge b-'+b.bron+'">'+b.bron+'</span><span class="tm">'+tm+'</span><span class="lb">'+(b.suspect?'⚠️ ':'')+escapeHtml(b.label)+'</span></div>';
    }
    card.innerHTML=html; body.appendChild(card);
  }
  var f=document.createElement('p'); f.className='foot';
  f.innerHTML='“vrij” = geen enkel blok dat de werkdag (08–18u) raakt. Een shoot of payroll telt als <b>volledige dag</b> (cameradag); meerdaagse shoots/afwezigheid blokken elke dag. Niet-goedgekeurde verlofaanvragen blokkeren in productie niet. Agenda-items tonen hun echte uur, zonder titel (privacy); ClickUp-syncs (🔄) worden genegeerd. ⚠️ = vermoedelijk fout getagd als Shoot (montage/placeholder) — beslissing Vincent. Edits/montage met correct TYPE JOB worden bewust genegeerd.';
  body.appendChild(f);
  document.getElementById('scrim').classList.add('on');
  document.getElementById('drawer').classList.add('on');
}
function closeDrawer(){ document.getElementById('scrim').classList.remove('on'); document.getElementById('drawer').classList.remove('on'); }

document.getElementById('seg-h').addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b)return;
  var ks=e.currentTarget.children; for(var i=0;i<ks.length;i++) ks[i].classList.remove('on'); b.classList.add('on'); STATE.horizon=+b.getAttribute('data-h'); load(); });
document.getElementById('aanvraag').addEventListener('change',function(e){ STATE.aanvraag=e.target.checked; load(); });
document.getElementById('syncf').addEventListener('change',function(e){ STATE.syncf=e.target.checked; load(); });
document.getElementById('oud').addEventListener('change',function(e){ STATE.oud=e.target.checked; render(); });
document.getElementById('d-x').addEventListener('click',closeDrawer);
document.getElementById('scrim').addEventListener('click',closeDrawer);
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDrawer(); });
load();
</script>
</body></html>`;
