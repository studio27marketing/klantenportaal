/* 27 Mijn Agenda — cross-portal personal planner web component.
   Mount: <agenda-panel me="Vincent Verleije" accent="#2458EA"></agenda-panel>
   Renders a header calendar button + a modal with dag/week/maand views.
   Personal events are shared across all portals via localStorage 's27_agenda'. */
(function () {
  if (window.customElements && customElements.get('agenda-panel')) return;

  var STORE = 's27_agenda';
  // App "today" is di 23 juni 2026.
  var TODAY = '2026-06-23';

  var TYPES = {
    meeting:  { label:'Meeting',   bg:'#E2E9FF', fg:'#0F2EA3', dot:'#2458EA' },
    klant:    { label:'Klant',     bg:'#E0F1FD', fg:'#0B5C8A', dot:'#28AFF9' },
    focus:    { label:'Focuswerk', bg:'#EAF3D6', fg:'#4A6B0E', dot:'#7FA830' },
    deadline: { label:'Deadline',  bg:'#FBE4DE', fg:'#9A3322', dot:'#B0432F' },
    intern:   { label:'Intern',    bg:'#FBEFD2', fg:'#8A5E08', dot:'#C99410' },
    verlof:   { label:'Verlof',    bg:'#ECEAFB', fg:'#4B3F9E', dot:'#6E8BF5' }
  };

  function pad(n){ return String(n).padStart(2,'0'); }
  function ds(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parse(s){ var p=s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  function addDays(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function mins(t){ var p=t.split(':'); return (+p[0])*60+(+p[1]); }
  function uid(){ return 'e'+Math.random().toString(36).slice(2,9); }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  var DOW = ['ma','di','wo','do','vr','za','zo'];
  var DOWL = ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'];
  var MON = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  var MONS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

  // Monday of the week containing d
  function monday(d){ var x=new Date(d); var w=(x.getDay()+6)%7; x.setDate(x.getDate()-w); x.setHours(0,0,0,0); return x; }

  function seed(){
    var T = TODAY;                       // di 23 jun
    var mo = ds(addDays(parse(T),-1));   // ma 22
    var we = ds(addDays(parse(T), 1));   // wo 24
    var th = ds(addDays(parse(T), 2));   // do 25
    var fr = ds(addDays(parse(T), 3));   // vr 26
    var nmo = ds(addDays(parse(T), 6));  // ma 29
    var ntu = ds(addDays(parse(T), 7));  // di 30
    return { events:[
      { id:uid(), date:mo, start:'09:00', end:'09:30', title:'Weekstart — team standup', type:'intern', where:'Studio · grote tafel' },
      { id:uid(), date:mo, start:'10:00', end:'12:00', title:'Bolckmans homepage — design', type:'focus', where:'Diepe focus' },
      { id:uid(), date:mo, start:'14:00', end:'15:00', title:'Vorsselmans Solar — kick-off', type:'klant', where:'Google Meet' },

      { id:uid(), date:T, start:'09:30', end:'10:15', title:'Bolckmans — feedback review', type:'klant', where:'Google Meet' },
      { id:uid(), date:T, start:'11:00', end:'12:30', title:'Homepage feedback verwerken', type:'focus', where:'Diepe focus' },
      { id:uid(), date:T, start:'13:30', end:'14:00', title:'Lunch & learn — GEO/SEO', type:'intern', where:'Keuken' },
      { id:uid(), date:T, start:'15:00', end:'16:00', title:'GT Foam huisstijl — sync', type:'meeting', where:'Studio · vergaderhoek' },
      { id:uid(), date:T, start:'17:00', end:'17:00', title:'Deadline: Bolckmans homepage', type:'deadline', where:'Oplevering' },

      { id:uid(), date:we, start:'09:00', end:'10:30', title:'Flor Vastgoed logo — concepten', type:'focus', where:'Diepe focus' },
      { id:uid(), date:we, start:'11:00', end:'11:45', title:'Klant: Heylen Warehouses', type:'klant', where:'Op locatie' },
      { id:uid(), date:we, start:'14:30', end:'15:30', title:'Maandelijkse retainer-review', type:'meeting', where:'Google Meet' },

      { id:uid(), date:th, start:'10:00', end:'13:00', title:'Bolckmans shoot — voorbereiding', type:'intern', where:'Studio' },
      { id:uid(), date:th, start:'14:00', end:'15:00', title:'1-op-1 met Vincent', type:'meeting', where:'Studio · klein' },

      { id:uid(), date:fr, start:'09:30', end:'12:00', title:'Vorsselmans Solar — nieuwe site', type:'focus', where:'Diepe focus' },
      { id:uid(), date:fr, start:'15:00', end:'15:00', title:'Deadline: Flor Vastgoed logo', type:'deadline', where:'Oplevering' },

      { id:uid(), date:nmo, start:'09:00', end:'09:30', title:'Weekstart — team standup', type:'intern', where:'Studio · grote tafel' },
      { id:uid(), date:nmo, start:'13:00', end:'17:30', title:'Verlof (halve dag)', type:'verlof', where:'' },
      { id:uid(), date:ntu, start:'10:00', end:'11:00', title:'Nieuwe klant — intake', type:'klant', where:'Google Meet' }
    ]};
  }

  function load(){ try{ var r=localStorage.getItem(STORE); if(r){ var d=JSON.parse(r); if(d&&d.events) return d; } }catch(e){} var s=seed(); save(s); return s; }
  function save(d){ try{ localStorage.setItem(STORE, JSON.stringify(d)); }catch(e){} }

  var ICON = {
    cal:'<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    chev:'<path d="M9 6l6 6-6 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    pin:'<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    today:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 1.5"/>'
  };
  function svg(name, size, color){ return '<svg viewBox="0 0 24 24" width="'+(size||18)+'" height="'+(size||18)+'" fill="none" stroke="'+(color||'currentColor')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ICON[name]+'</svg>'; }

  class AgendaPanel extends HTMLElement {
    connectedCallback(){
      if(this._init) return; this._init=true;
      this.me = this.getAttribute('me') || 'Vincent Verleije';
      this.accent = this.getAttribute('accent') || '#2458EA';
      this.inline = this.hasAttribute('inline');
      this.open = false;
      this.view = 'week';                 // dag | week | maand
      this.cursor = parse(TODAY);         // reference date
      this.root = this.attachShadow({mode:'open'});
      this._onStore = (e)=>{ if(!e || e.key===STORE || e.key===null) this.render(); };
      window.addEventListener('storage', this._onStore);
      window.addEventListener('s27-agenda-change', this._onStore);
      this.render();
    }
    disconnectedCallback(){ window.removeEventListener('storage', this._onStore); window.removeEventListener('s27-agenda-change', this._onStore); }

    data(){ return load(); }
    eventsOn(dateStr){ return this.data().events.filter(function(e){return e.date===dateStr;}).sort(function(a,b){return mins(a.start)-mins(b.start);}); }

    toggle(){ this.open=!this.open; if(this.open){ this.cursor=parse(TODAY); } this.render(); }
    setView(v){ this.view=v; this.render(); }
    goToday(){ this.cursor=parse(TODAY); this.render(); }
    step(dir){
      if(this.view==='dag') this.cursor=addDays(this.cursor, dir);
      else if(this.view==='week') this.cursor=addDays(this.cursor, dir*7);
      else { var c=new Date(this.cursor); c.setMonth(c.getMonth()+dir); this.cursor=c; }
      this.render();
    }
    openDay(dateStr){ this.cursor=parse(dateStr); this.view='dag'; this.render(); }

    rangeLabel(){
      if(this.view==='dag'){ var d=this.cursor; return DOWL[(d.getDay()+6)%7]+' '+d.getDate()+' '+MON[d.getMonth()]; }
      if(this.view==='week'){ var m=monday(this.cursor); var f=addDays(m,4);
        var a=m.getDate()+(m.getMonth()!==f.getMonth()?' '+MONS[m.getMonth()]:''); var b=f.getDate()+' '+MONS[f.getMonth()]+' '+f.getFullYear();
        return a+' – '+b; }
      return MON[this.cursor.getMonth()].charAt(0).toUpperCase()+MON[this.cursor.getMonth()].slice(1)+' '+this.cursor.getFullYear();
    }

    // ---------- view builders ----------
    dayTimeline(dateStr, big){
      var H0=8, H1=19, PXH=big?52:40;
      var evs=this.eventsOn(dateStr).filter(function(e){return e.type!=='deadline' || e.start!==e.end;});
      var deadlines=this.eventsOn(dateStr).filter(function(e){return e.type==='deadline' && e.start===e.end;});
      var html='<div style="display:flex;gap:0;">';
      // hour gutter
      html+='<div style="flex:none;width:'+(big?54:46)+'px;">';
      for(var hh=H0; hh<=H1; hh++){ html+='<div style="height:'+PXH+'px;text-align:right;padding-right:9px;font-size:11px;color:#A39E8E;font-family:\'JetBrains Mono\',monospace;transform:translateY(-7px);">'+pad(hh)+':00</div>'; }
      html+='</div>';
      // track
      html+='<div style="flex:1;position:relative;border-left:1px solid #EFE9DB;min-height:'+((H1-H0+1)*PXH)+'px;">';
      for(var hl=H0; hl<=H1; hl++){ html+='<div style="position:absolute;left:0;right:0;top:'+((hl-H0)*PXH)+'px;border-top:1px solid #F2EDE1;"></div>'; }
      // now line (only on today)
      if(dateStr===TODAY){ var nowM=10*60+10; var topN=((nowM-H0*60)/60)*PXH; if(topN>0){ html+='<div style="position:absolute;left:0;right:0;top:'+topN+'px;height:0;border-top:2px solid #B0432F;z-index:4;"><span style="position:absolute;left:0;top:-4px;width:8px;height:8px;border-radius:99px;background:#B0432F;"></span></div>'; } }
      evs.forEach(function(e){
        var top=((mins(e.start)-H0*60)/60)*PXH; var hgt=Math.max(((mins(e.end)-mins(e.start))/60)*PXH-3, 22);
        var ty=TYPES[e.type]||TYPES.meeting;
        html+='<div title="'+esc(e.title)+'" style="position:absolute;left:7px;right:9px;top:'+top+'px;height:'+hgt+'px;background:'+ty.bg+';border-left:3px solid '+ty.dot+';border-radius:9px;padding:'+(hgt<34?'3px 9px':'6px 10px')+';overflow:hidden;cursor:default;">'
          +'<div style="font-size:'+(big?13:12)+'px;font-weight:600;color:'+ty.fg+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(e.title)+'</div>'
          +(hgt>=42?'<div style="font-size:11px;color:'+ty.fg+';opacity:.78;margin-top:2px;">'+e.start+'–'+e.end+(e.where?' · '+esc(e.where):'')+'</div>':'')
          +'</div>';
      });
      html+='</div></div>';
      if(deadlines.length){
        html+='<div style="margin-top:12px;display:flex;flex-direction:column;gap:7px;">';
        deadlines.forEach(function(e){ var ty=TYPES.deadline; html+='<div style="display:flex;align-items:center;gap:9px;background:'+ty.bg+';border:1px solid '+ty.dot+'33;border-radius:11px;padding:9px 12px;"><span style="width:8px;height:8px;border-radius:99px;background:'+ty.dot+';flex:none;"></span><span style="font-size:13px;font-weight:600;color:'+ty.fg+';">'+esc(e.title)+'</span><span style="margin-left:auto;font-size:12px;color:'+ty.fg+';font-family:\'JetBrains Mono\',monospace;">'+e.start+'</span></div>'; });
        html+='</div>';
      }
      return html;
    }

    weekGrid(){
      var H0=8, H1=19, PXH=42; var m=monday(this.cursor);
      var days=[]; for(var i=0;i<5;i++) days.push(addDays(m,i));
      var self=this;
      var html='<div style="display:grid;grid-template-columns:46px repeat(5,1fr);border:1px solid #EAE4D5;border-radius:14px;overflow:hidden;background:#fff;">';
      // header row
      html+='<div style="background:#FBF9F3;border-bottom:1px solid #EAE4D5;"></div>';
      days.forEach(function(d){ var isT=ds(d)===TODAY;
        html+='<button data-day="'+ds(d)+'" style="border:none;border-left:1px solid #F2EDE1;border-bottom:1px solid #EAE4D5;background:'+(isT?'#E2E9FF':'#FBF9F3')+';cursor:pointer;padding:9px 6px;text-align:center;font-family:inherit;">'
          +'<div style="font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:'+(isT?'#0F2EA3':'#A39E8E')+';">'+DOW[(d.getDay()+6)%7]+'</div>'
          +'<div style="font-size:17px;font-weight:600;color:'+(isT?'#0F2EA3':'#3D3A33')+';margin-top:1px;">'+d.getDate()+'</div></button>';
      });
      // body row: gutter + 5 day columns in one tall grid cell each
      html+='<div style="position:relative;">';
      for(var hh=H0; hh<=H1; hh++){ html+='<div style="height:'+PXH+'px;text-align:right;padding-right:7px;font-size:10px;color:#B5AF9E;font-family:\'JetBrains Mono\',monospace;transform:translateY(-6px);">'+pad(hh)+'</div>'; }
      html+='</div>';
      days.forEach(function(d){
        var ds_=ds(d); var evs=self.eventsOn(ds_).filter(function(e){return !(e.type==='deadline'&&e.start===e.end);});
        var dls=self.eventsOn(ds_).filter(function(e){return e.type==='deadline'&&e.start===e.end;});
        html+='<div data-day="'+ds_+'" style="position:relative;border-left:1px solid #F2EDE1;min-height:'+((H1-H0+1)*PXH)+'px;cursor:pointer;">';
        for(var hl=H0; hl<=H1; hl++){ html+='<div style="position:absolute;left:0;right:0;top:'+((hl-H0)*PXH)+'px;border-top:1px solid #F5F1E7;"></div>'; }
        if(ds_===TODAY){ var topN=(((10*60+10)-H0*60)/60)*PXH; html+='<div style="position:absolute;left:0;right:0;top:'+topN+'px;border-top:2px solid #B0432F;z-index:4;"></div>'; }
        evs.forEach(function(e){ var top=((mins(e.start)-H0*60)/60)*PXH; var hgt=Math.max(((mins(e.end)-mins(e.start))/60)*PXH-2,18); var ty=TYPES[e.type]||TYPES.meeting;
          html+='<div title="'+esc(e.title)+' · '+e.start+'–'+e.end+'" style="position:absolute;left:3px;right:3px;top:'+top+'px;height:'+hgt+'px;background:'+ty.bg+';border-left:2.5px solid '+ty.dot+';border-radius:6px;padding:'+(hgt<26?'2px 5px':'4px 6px')+';overflow:hidden;">'
            +'<div style="font-size:10.5px;font-weight:600;color:'+ty.fg+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">'+esc(e.title)+'</div>'
            +(hgt>=34?'<div style="font-size:9.5px;color:'+ty.fg+';opacity:.75;">'+e.start+'</div>':'')+'</div>';
        });
        dls.forEach(function(e){ var top=((mins(e.start)-H0*60)/60)*PXH; var ty=TYPES.deadline;
          html+='<div title="Deadline: '+esc(e.title)+' · '+e.start+'" style="position:absolute;left:3px;right:3px;top:'+(top-4)+'px;display:flex;align-items:center;gap:4px;background:'+ty.bg+';border-radius:6px;padding:2px 5px;z-index:3;"><span style="width:6px;height:6px;border-radius:99px;background:'+ty.dot+';flex:none;"></span><span style="font-size:9.5px;font-weight:600;color:'+ty.fg+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(e.title)+'</span></div>';
        });
        html+='</div>';
      });
      html+='</div>';
      return html;
    }

    monthGrid(){
      var first=new Date(this.cursor.getFullYear(), this.cursor.getMonth(), 1);
      var start=monday(first); var self=this; var mth=this.cursor.getMonth();
      var html='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#EAE4D5;border:1px solid #EAE4D5;border-radius:14px;overflow:hidden;">';
      DOW.forEach(function(d){ html+='<div style="background:#FBF9F3;padding:8px 6px;text-align:center;font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#A39E8E;">'+d+'</div>'; });
      for(var i=0;i<42;i++){ var d=addDays(start,i); var ds_=ds(d); var inMonth=d.getMonth()===mth; var isT=ds_===TODAY;
        var evs=self.eventsOn(ds_);
        var cell='<button data-day="'+ds_+'" style="border:none;background:'+(inMonth?'#fff':'#FAF7F0')+';min-height:96px;padding:6px 7px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:3px;font-family:inherit;align-items:stretch;">';
        cell+='<div style="display:flex;justify-content:flex-end;"><span style="width:23px;height:23px;border-radius:99px;display:grid;place-items:center;font-size:12.5px;font-weight:'+(isT?700:500)+';color:'+(isT?'#fff':(inMonth?'#3D3A33':'#C4BFAF'))+';background:'+(isT?'#2458EA':'transparent')+';">'+d.getDate()+'</span></div>';
        evs.slice(0,3).forEach(function(e){ var ty=TYPES[e.type]||TYPES.meeting;
          cell+='<div style="display:flex;align-items:center;gap:5px;background:'+ty.bg+';border-radius:5px;padding:2px 5px;"><span style="width:5px;height:5px;border-radius:99px;background:'+ty.dot+';flex:none;"></span><span style="font-size:10px;font-weight:500;color:'+ty.fg+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(e.type==='deadline'&&e.start===e.end?'':e.start+' ')+esc(e.title)+'</span></div>';
        });
        if(evs.length>3){ cell+='<span style="font-size:10px;color:#8E8979;padding-left:3px;">+'+(evs.length-3)+' meer</span>'; }
        cell+='</button>';
        html+=cell;
      }
      html+='</div>';
      return html;
    }

    legend(){
      var html='<div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;">';
      Object.keys(TYPES).forEach(function(k){ var t=TYPES[k]; html+='<span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:#5E5A4F;"><span style="width:9px;height:9px;border-radius:99px;background:'+t.dot+';"></span>'+t.label+'</span>'; });
      html+='</div>';
      return html;
    }

    bodyHtml(){
      if(this.view==='dag'){
        var ds_=ds(this.cursor); var evs=this.eventsOn(ds_);
        var head='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><div style="font-size:13px;color:#8E8979;">'+(evs.length?evs.length+' item'+(evs.length>1?'s':'')+' gepland':'Niets gepland — vrije dag')+'</div></div>';
        return head+this.dayTimeline(ds_, true);
      }
      if(this.view==='week') return this.weekGrid();
      return this.monthGrid();
    }

    toolbarHtml(){
      return '<div class="toolbar">'
        +'<div class="seg">'
          +'<button data-view="dag" class="'+(this.view==='dag'?'on':'')+'">Dag</button>'
          +'<button data-view="week" class="'+(this.view==='week'?'on':'')+'">Week</button>'
          +'<button data-view="maand" class="'+(this.view==='maand'?'on':'')+'">Maand</button>'
        +'</div>'
        +'<div class="nav"><button id="prev">'+svg('chev',16)+'<\/button><button id="next">'+svg('chev',16)+'</button></div>'
        +'<div class="rangelbl">'+esc(this.rangeLabel())+'</div>'
        +'<button class="todaybtn" id="today">'+svg('today',15,'#5E5A4F')+'Vandaag</button>'
        +'</div>';
    }

    baseCss(){
      return '*{ box-sizing:border-box; }'
        +'.trigger{ position:relative; width:40px; height:40px; border:1px solid rgba(247,243,234,.12); border-radius:11px; background:rgba(247,243,234,.08); color:#F7F3EA; cursor:pointer; display:grid; place-items:center; transition:background .15s; flex:none; }'
        +'.trigger:hover{ background:rgba(247,243,234,.18); }'
        +'.calnum{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding-top:5px; font-size:9px; font-weight:700; line-height:1; color:#F7F3EA; font-variant-numeric:tabular-nums; }'
        +'.tdot{ position:absolute; top:7px; right:8px; width:7px; height:7px; border-radius:99px; background:#D1F24C; border:1.5px solid #050A30; }'
        +'.backdrop{ position:fixed; inset:0; z-index:2147483000; background:rgba(5,10,48,.45); backdrop-filter:blur(2px); display:grid; place-items:center; padding:24px; }'
        +'.modal{ width:min(1000px,96vw); max-height:92vh; background:#F7F3EA; border-radius:20px; box-shadow:0 30px 90px -20px rgba(5,10,48,.6); display:flex; flex-direction:column; overflow:hidden; animation:pop .24s cubic-bezier(.16,1,.3,1); }'
        +'@keyframes pop{ from{ transform:translateY(14px) scale(.985); opacity:.4; } to{ transform:none; opacity:1; } }'
        +'.hd{ display:flex; align-items:center; gap:14px; padding:16px 20px; background:#050A30; color:#F7F3EA; flex:none; }'
        +'.hd h3{ margin:0; font-size:17px; font-weight:600; letter-spacing:-.01em; }'
        +'.hd .sub{ font-size:12px; color:rgba(247,243,234,.6); margin-top:1px; }'
        +'.iconbtn{ width:34px; height:34px; border:1px solid rgba(247,243,234,.16); border-radius:9px; background:rgba(247,243,234,.06); color:#F7F3EA; cursor:pointer; display:grid; place-items:center; }'
        +'.iconbtn:hover{ background:rgba(247,243,234,.16); }'
        +'.toolbar{ display:flex; align-items:center; gap:12px; padding:13px 20px; background:#FFFDF8; border-bottom:1px solid #EAE4D5; flex:none; flex-wrap:wrap; }'
        +'.seg{ display:inline-flex; gap:3px; background:#EFEADD; border-radius:999px; padding:3px; }'
        +'.seg button{ border:none; cursor:pointer; border-radius:999px; padding:6px 15px; font-family:inherit; font-size:12.5px; color:#5E5A4F; background:transparent; }'
        +'.seg button.on{ background:#fff; color:#0F2EA3; font-weight:600; box-shadow:0 1px 5px -2px rgba(5,10,48,.25); }'
        +'.nav{ display:inline-flex; align-items:center; gap:4px; }'
        +'.nav button{ width:32px; height:32px; border:1px solid #DFD9C8; border-radius:9px; background:#fff; cursor:pointer; display:grid; place-items:center; color:#5E5A4F; }'
        +'.nav button:hover{ background:#F2EDE1; }'
        +'.rangelbl{ font-size:15px; font-weight:600; color:#050A30; min-width:150px; }'
        +'.todaybtn{ display:inline-flex; align-items:center; gap:6px; border:1px solid #DFD9C8; border-radius:9px; background:#fff; cursor:pointer; padding:7px 12px; font-family:inherit; font-size:12.5px; font-weight:500; color:#3D3A33; }'
        +'.todaybtn:hover{ background:#F2EDE1; }'
        +'.body{ flex:1; overflow-y:auto; padding:18px 20px; }'
        +'.foot{ display:flex; align-items:center; gap:14px; padding:11px 20px; background:#FFFDF8; border-top:1px solid #EAE4D5; flex:none; }';
    }

    render(){
      if(this.inline){ this.renderInline(); return; }
      var css = ':host{ all:initial; font-family:"Outfit",-apple-system,system-ui,sans-serif; }'+this.baseCss();

      var todayCount=this.eventsOn(TODAY).length;
      var todayNum=parseInt(TODAY.slice(8),10);

      var html='<style>'+css+'</style>';
      html+='<button class="trigger" id="trig" title="Mijn agenda" aria-label="Mijn agenda">'+svg('cal',20)+'<span class="calnum">'+todayNum+'</span>'+(todayCount?'<span class="tdot"></span>':'')+'</button>';

      if(this.open){
        html+='<div class="backdrop" id="bd"><div class="modal" id="modal">';
        html+='<div class="hd"><span style="width:38px;height:38px;border-radius:11px;background:rgba(40,175,249,.16);display:grid;place-items:center;flex:none;">'+svg('cal',20,'#28AFF9')+'</span>'
          +'<div style="flex:1;min-width:0;"><h3>Mijn agenda</h3><div class="sub">'+esc(this.me)+' · persoonlijke planning</div></div>'
          +'<button class="iconbtn" id="close">'+svg('x',17)+'</button></div>';
        html+=this.toolbarHtml();
        html+='<div class="body" id="abody">'+this.bodyHtml()+'</div>';
        html+='<div class="foot">'+this.legend()+'</div>';
        html+='</div></div>';
      }

      this.root.innerHTML=html;
      this._wire();
    }

    renderInline(){
      var css = ':host{ all:initial; font-family:"Outfit",-apple-system,system-ui,sans-serif; }'
        +':host([inline]){ display:block; width:100%; }'
        +this.baseCss()
        +'.icard{ background:#FFFDF8; border:1px solid #EAE4D5; border-radius:20px; overflow:hidden; box-shadow:0 4px 28px -12px rgba(5,10,48,.10); }'
        +'.ihd{ display:flex; align-items:center; gap:13px; padding:17px 20px; background:#050A30; color:#F7F3EA; }'
        +'.ihd h3{ margin:0; font-size:18px; font-weight:600; letter-spacing:-.01em; }'
        +'.ihd .sub{ font-size:12.5px; color:rgba(247,243,234,.6); margin-top:1px; }'
        +'.ibody{ padding:20px; }'
        +'.ifoot{ display:flex; align-items:center; gap:14px; padding:13px 20px; background:#FFFDF8; border-top:1px solid #EAE4D5; }';

      var html='<style>'+css+'</style>';
      html+='<div class="icard">';
      html+='<div class="ihd"><span style="width:38px;height:38px;border-radius:11px;background:rgba(40,175,249,.16);display:grid;place-items:center;flex:none;">'+svg('cal',20,'#28AFF9')+'</span>'
        +'<div style="flex:1;min-width:0;"><h3>Mijn agenda</h3><div class="sub">'+esc(this.me)+' · persoonlijke planning</div></div></div>';
      html+=this.toolbarHtml();
      html+='<div class="ibody">'+this.bodyHtml()+'</div>';
      html+='<div class="ifoot">'+this.legend()+'</div>';
      html+='</div>';

      this.root.innerHTML=html;
      this._wire();
    }

    _wire(){
      var self=this; var R=this.root;
      var by=function(id){return R.getElementById(id);};
      var trig=by('trig'); if(trig) trig.onclick=function(){ if(typeof self.onNav==='function'){ self.onNav(); return; } self.toggle(); };
      if(!this.open && !this.inline) return;
      var close=by('close'); if(close) close.onclick=function(){ self.toggle(); };
      var bd=by('bd'); if(bd) bd.onclick=function(e){ if(e.target===bd) self.toggle(); };
      var modal=by('modal'); if(modal) modal.onclick=function(e){ e.stopPropagation(); };
      var prev=by('prev'); if(prev) prev.onclick=function(){ self.step(-1); };
      var next=by('next'); if(next) next.onclick=function(){ self.step(1); };
      var today=by('today'); if(today) today.onclick=function(){ self.goToday(); };
      // flip the prev chevron
      if(prev){ var s=prev.querySelector('svg'); if(s) s.style.transform='scaleX(-1)'; }
      R.querySelectorAll('[data-view]').forEach(function(b){ b.onclick=function(){ self.setView(b.getAttribute('data-view')==='maand'?'maand':b.getAttribute('data-view')); }; });
      R.querySelectorAll('[data-day]').forEach(function(b){ b.onclick=function(){ self.openDay(b.getAttribute('data-day')); }; });
      // esc to close (modal only)
      if(!this.inline && !this._esc){ this._esc=function(e){ if(e.key==='Escape'&&self.open){ self.toggle(); } }; window.addEventListener('keydown', this._esc); }
    }
  }
  customElements.define('agenda-panel', AgendaPanel);
})();
