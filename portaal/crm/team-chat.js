/* 27 Team Chat — cross-platform web component.
   Mount: <team-chat me="Vincent Verleije"></team-chat>
   Shared across all portals via localStorage key 's27_chat'. */
(function () {
  if (window.customElements && customElements.get('team-chat')) return;

  var STORE = 's27_chat';
  var READ = 's27_chat_read';
  var ROSTER = ['Vincent Verleije','Arne Claes','Ilke Meeusen','Johanna Peeters','Klaas Govaerts','Guus Janssens','Bjorn Borgers','Ines De Cock','Anouk de Hoon','Griet Smans','Celien Bogaerts','Tom Vekemans','Sarah Daems'];

  function now(){ return Date.now(); }
  function uid(){ return 'r'+Math.random().toString(36).slice(2,9); }
  function ini(n){ var p=String(n).trim().split(/\s+/); return ((p[0]||'')[0]||'').toUpperCase()+((p[1]||'')[0]||'').toUpperCase(); }
  function pcolor(n){ var pal=['#0F2EA3','#2458EA','#28AFF9','#7FA830','#C99410','#B0432F','#6E8BF5','#4A6B0E']; var s=0; for(var i=0;i<n.length;i++)s+=n.charCodeAt(i); return pal[s%pal.length]; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function timeLabel(ts){ var d=new Date(ts), n=new Date(); var sameDay=d.toDateString()===n.toDateString();
    var hh=String(d.getHours()).padStart(2,'0'), mm=String(d.getMinutes()).padStart(2,'0');
    if(sameDay) return hh+':'+mm;
    var days=['zo','ma','di','wo','do','vr','za']; return days[d.getDay()]+' '+hh+':'+mm; }

  function seed(){
    var t0=now();
    return { rooms:[
      { id:'team', type:'group', name:'Team Studio 27', members:ROSTER.slice(), messages:[
        {from:'Vincent Verleije',text:'Goeiemorgen allemaal 👋 Druk weekje — hou de portalen up to date.',ts:t0-1000*60*180},
        {from:'Ilke Meeusen',text:'Wie kan morgen mee de Bolckmans-shoot voorbereiden?',ts:t0-1000*60*52},
        {from:'Guus Janssens',text:'Ik kan! Neem ik het materiaal mee.',ts:t0-1000*60*48}
      ]},
      { id:'web', type:'group', name:'Webdesign', members:['Anouk de Hoon','Griet Smans','Ilke Meeusen','Klaas Govaerts'], messages:[
        {from:'Anouk de Hoon',text:'Homepage-design v2 staat klaar voor review.',ts:t0-1000*60*120},
        {from:'Ilke Meeusen',text:'Top, ik zet het door naar de klant.',ts:t0-1000*60*90}
      ]},
      { id:'dm-ilke', type:'dm', name:'Ilke Meeusen', members:['Vincent Verleije','Ilke Meeusen'], messages:[
        {from:'Ilke Meeusen',text:'Heb je de offerte voor Vorsselmans al kunnen nakijken?',ts:t0-1000*60*25}
      ]}
    ]};
  }

  function load(){ try{ var r=localStorage.getItem(STORE); if(r){ var d=JSON.parse(r); if(d&&d.rooms) return d; } }catch(e){} var s=seed(); save(s); return s; }
  function save(d){ try{ localStorage.setItem(STORE, JSON.stringify(d)); }catch(e){} }
  function loadRead(){ try{ var r=localStorage.getItem(READ); if(r) return JSON.parse(r)||{}; }catch(e){} return {}; }
  function saveRead(m){ try{ localStorage.setItem(READ, JSON.stringify(m)); }catch(e){} }

  var ICON = {
    chat:'<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    send:'<path d="m21 4-9.5 9.5M21 4l-6.5 17-3.5-7.5L3.5 10 21 4z"/>',
    back:'<path d="M15 6l-6 6 6 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    users:'<path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.2"/><path d="M22 19v-2a4 4 0 0 0-3-3.8"/><path d="M16 3.2a4 4 0 0 1 0 7.6"/>',
    user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.2-4.2"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    clip:'<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
    trash:'<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>',
    archive:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    dots:'<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    task:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3.5h6v1M9 11h6M9 15h4"/>',
    plusc:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'
  };
  function svg(name, size, color){ return '<svg viewBox="0 0 24 24" width="'+(size||18)+'" height="'+(size||18)+'" fill="none" stroke="'+(color||'currentColor')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ICON[name]+'</svg>'; }

  class TeamChat extends HTMLElement {
    connectedCallback(){
      if(this._init) return; this._init=true;
      this.me = this.getAttribute('me') || 'Vincent Verleije';
      this.accent = this.getAttribute('accent') || '#2458EA';
      this.view = 'list';      // list | room | new
      this.activeRoom = null;
      this.newType = 'dm';
      this.newSel = [];
      this.newName = '';
      this.search = '';
      this.open = false;
      this.root = this.attachShadow({mode:'open'});
      this._onStore = (e)=>{ if(!e || e.key===STORE || e.key===READ || e.key===null) this.render(); };
      window.addEventListener('storage', this._onStore);
      window.addEventListener('s27-chat-change', this._onStore);
      this.render();
    }
    disconnectedCallback(){ window.removeEventListener('storage', this._onStore); window.removeEventListener('s27-chat-change', this._onStore); }

    data(){ return load(); }
    unreadFor(room){ var read=loadRead(); var last=read[room.id]||0; var c=0; room.messages.forEach(function(m){ if(m.ts>last && m.from!==this.me) c++; }.bind(this)); return c; }
    totalUnread(){ var d=this.data(); var t=0; d.rooms.forEach(function(r){ t+=this.unreadFor(r); }.bind(this)); return t; }
    markRead(room){ var read=loadRead(); var max=0; room.messages.forEach(function(m){ if(m.ts>max)max=m.ts; }); read[room.id]=Math.max(max, now()); saveRead(read); }

    openRoom(id){ var d=this.data(); var r=d.rooms.find(function(x){return x.id===id;}); if(!r)return; this.activeRoom=id; this.view='room'; this.markRead(r); this.render(); setTimeout(()=>this._scrollThread(),20); }
    send(text){ text=(text||'').trim(); if(!text||!this.activeRoom)return; var d=this.data(); var r=d.rooms.find(function(x){return x.id===this.activeRoom;}.bind(this)); if(!r)return; r.messages.push({from:this.me,text:text,ts:now()}); save(d); this.markRead(r); window.dispatchEvent(new Event('s27-chat-change')); this.render(); setTimeout(()=>this._scrollThread(),20); }
    attachFiles(fileList){ var arr=Array.prototype.slice.call(fileList||[]); if(!arr.length||!this.activeRoom)return; var d=this.data(); var r=d.rooms.find(function(x){return x.id===this.activeRoom;}.bind(this)); if(!r)return; var files=arr.map(function(f){return {n:f.name,size:f.size};}); r.messages.push({from:this.me,text:'',files:files,ts:now()}); save(d); this.markRead(r); window.dispatchEvent(new Event('s27-chat-change')); this.render(); setTimeout(()=>this._scrollThread(),20); }
    sendTask(task){ if(!task||!this.activeRoom)return; var d=this.data(); var r=d.rooms.find(function(x){return x.id===this.activeRoom;}.bind(this)); if(!r)return; r.messages.push({from:this.me,text:'',task:task,ts:now()}); save(d); this.markRead(r); this.taskPick=false; this.taskQuery=''; window.dispatchEvent(new Event('s27-chat-change')); this.render(); setTimeout(()=>this._scrollThread(),20); }
    archiveRoom(id){ var d=this.data(); var r=d.rooms.find(function(x){return x.id===id;}); if(r){ r.archived=!r.archived; save(d); window.dispatchEvent(new Event('s27-chat-change')); } this.menuRoom=null; this.render(); }
    deleteRoom(id){ var d=this.data(); d.rooms=d.rooms.filter(function(x){return x.id!==id;}); save(d); var read=loadRead(); delete read[id]; saveRead(read); window.dispatchEvent(new Event('s27-chat-change')); this.menuRoom=null; if(this.activeRoom===id){ this.activeRoom=null; this.view='list'; } this.render(); }
    renameRoom(id,name){ var d=this.data(); var r=d.rooms.find(function(x){return x.id===id;}); if(r){ r.name=name; save(d); window.dispatchEvent(new Event('s27-chat-change')); } }
    toggleMember(id,name){ var d=this.data(); var r=d.rooms.find(function(x){return x.id===id;}); if(!r)return; if(name===this.me)return; var i=r.members.indexOf(name); if(i>=0)r.members.splice(i,1); else r.members.push(name); save(d); window.dispatchEvent(new Event('s27-chat-change')); this.render(); }
    createRoom(){ var d=this.data(); var members, name, type=this.newType;
      if(type==='dm'){ if(!this.newSel.length)return; var other=this.newSel[0]; var exist=d.rooms.find(function(r){return r.type==='dm'&&r.members.indexOf(other)>=0;}); if(exist){ this.view='room'; this.activeRoom=exist.id; this.render(); return; } members=[this.me,other]; name=other; }
      else { if(!this.newSel.length)return; name=(this.newName||'').trim()||this.newSel.slice(0,3).map(function(n){return n.split(' ')[0];}).join(', '); members=[this.me].concat(this.newSel.filter(function(m){return m!==this.me;}.bind(this))); }
      var id=uid(); d.rooms.unshift({id:id,type:type,name:name,members:members,messages:[]}); save(d); window.dispatchEvent(new Event('s27-chat-change'));
      this.newSel=[]; this.newName=''; this.activeRoom=id; this.view='room'; this.render(); }

    toggle(){ this.open=!this.open; if(this.open){ this.view='list'; } this.render(); }

    /* Public: share a link/message into the team room in one go. */
    shareToTeam(text){ text=(text||'').trim(); if(!text) return; var d=this.data(); var r=d.rooms.find(function(x){return x.id==='team';})||d.rooms[0]; if(!r) return; r.messages.push({from:this.me,text:text,ts:now()}); save(d); window.dispatchEvent(new Event('s27-chat-change')); this.activeRoom=r.id; this.view='room'; this.open=true; if(this.markRead) this.markRead(r); this.render(); var self=this; setTimeout(function(){ if(self._scrollThread) self._scrollThread(); },60); }

    _scrollThread(){ var el=this.root.getElementById('thread'); if(el) el.scrollTop=el.scrollHeight; }

    roomSubtitle(r){ if(r.type==='dm'){ return 'Direct bericht'; } return r.members.length+' leden'; }
    lastMsg(r){ if(!r.messages.length) return ''; var m=r.messages[r.messages.length-1]; var who=m.from===this.me?'Jij':m.from.split(' ')[0]; var txt=m.text||(m.files&&m.files.length?('📎 '+(m.files.length>1?m.files.length+' bestanden':m.files[0].n)):''); return who+': '+txt; }
    fmtBytes(b){ if(b==null)return ''; if(b<1024)return b+' B'; if(b<1048576)return (b/1024).toFixed(0)+' KB'; return (b/1048576).toFixed(1)+' MB'; }

    render(){
      var me=this.me, acc=this.accent;
      var d=this.data();
      var total=this.totalUnread();
      var css = '\n        :host{ all:initial; font-family:"Outfit",-apple-system,system-ui,sans-serif; }\n        *{ box-sizing:border-box; }\n        .trigger{ position:relative; width:40px; height:40px; border:none; border-radius:11px; background:rgba(255,255,255,.08); color:#F7F3EA; cursor:pointer; display:grid; place-items:center; transition:background .15s; }\n        .trigger:hover{ background:rgba(255,255,255,.16); }\n        .badge{ position:absolute; top:-4px; right:-4px; min-width:17px; height:17px; padding:0 4px; border-radius:9px; background:#D1F24C; color:#050A30; font-size:10.5px; font-weight:700; display:grid; place-items:center; }\n        .backdrop{ position:fixed; inset:0; z-index:2147483000; background:rgba(5,10,48,.42); backdrop-filter:blur(2px); }\n        .panel{ position:fixed; top:0; right:0; bottom:0; width:min(420px,94vw); z-index:2147483001; background:#F7F3EA; display:flex; flex-direction:column; box-shadow:-16px 0 50px -12px rgba(5,10,48,.5); animation:slide .26s cubic-bezier(.16,1,.3,1); }\n        @keyframes slide{ from{ transform:translateX(30px); opacity:.4; } to{ transform:none; opacity:1; } }\n        .hd{ display:flex; align-items:center; gap:11px; padding:16px 18px; border-bottom:1px solid #E4DDCC; background:#FFFDF8; }\n        .hd h3{ margin:0; font-size:17px; font-weight:600; color:#050A30; flex:1; }\n        .ibtn{ width:34px; height:34px; border:1px solid #DFD9C8; border-radius:9px; background:#fff; cursor:pointer; display:grid; place-items:center; color:#5E5A4F; }\n        .ibtn:hover{ background:#F2EDE1; }\n        .body{ flex:1; overflow-y:auto; }\n        .srch{ padding:12px 16px; }\n        .srch input{ width:100%; font-family:inherit; font-size:13.5px; border:1px solid #DFD9C8; border-radius:11px; padding:9px 12px 9px 34px; background:#fff; color:#3D3A33; }\n        .srchw{ position:relative; }\n        .srchw .si{ position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#A39E8E; pointer-events:none; }\n        .room{ display:flex; align-items:center; gap:12px; padding:11px 16px; cursor:pointer; border:none; background:transparent; width:100%; text-align:left; }\n        .room:hover{ background:#F2EDE1; }\n        .av{ width:42px; height:42px; border-radius:50%; display:grid; place-items:center; color:#fff; font-size:14px; font-weight:700; flex:none; }\n        .av.grp{ background:#050A30; }\n        .rname{ font-size:14.5px; font-weight:600; color:#050A30; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n        .rlast{ font-size:12.5px; color:#8E8979; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }\n        .rmeta{ display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex:none; }\n        .rtime{ font-size:11px; color:#A39E8E; }\n        .rdot{ min-width:18px; height:18px; padding:0 5px; border-radius:9px; background:'+acc+'; color:#fff; font-size:11px; font-weight:700; display:grid; place-items:center; }\n        .thread{ flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; background:#F7F3EA; }\n        .msg{ max-width:80%; padding:9px 13px; border-radius:15px; font-size:13.5px; line-height:1.45; }\n        .msg.me{ align-self:flex-end; background:'+acc+'; color:#fff; border-bottom-right-radius:5px; }\n        .msg.them{ align-self:flex-start; background:#FFFDF8; color:#3D3A33; border:1px solid #EFEADD; border-bottom-left-radius:5px; }\n        .mfrom{ font-size:11px; font-weight:700; margin-bottom:3px; }\n        .mtime{ font-size:10px; opacity:.7; margin-top:4px; text-align:right; }\n        .composer{ display:flex; gap:9px; padding:12px 14px; border-top:1px solid #E4DDCC; background:#FFFDF8; }\n        .composer input{ flex:1; font-family:inherit; font-size:14px; border:1px solid #DFD9C8; border-radius:12px; padding:11px 14px; background:#fff; color:#3D3A33; }\n        .sendb{ width:44px; height:44px; border:none; border-radius:12px; background:'+acc+'; color:#fff; cursor:pointer; display:grid; place-items:center; flex:none; }\n        .seg{ display:flex; gap:6px; background:#EFEADD; border-radius:11px; padding:4px; margin:14px 16px 6px; }\n        .seg button{ flex:1; border:none; background:transparent; border-radius:8px; padding:8px; font-family:inherit; font-size:13px; font-weight:600; color:#8E8979; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:7px; }\n        .seg button.on{ background:#fff; color:#050A30; box-shadow:0 2px 8px -3px rgba(5,10,48,.18); }\n        .lbl{ font-size:11px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:#A39E8E; padding:12px 16px 7px; }\n        .gname{ margin:0 16px 6px; }\n        .gname input{ width:100%; font-family:inherit; font-size:14px; border:1px solid #DFD9C8; border-radius:11px; padding:10px 13px; background:#fff; color:#3D3A33; }\n        .pick{ display:flex; align-items:center; gap:11px; padding:9px 16px; cursor:pointer; }\n        .pick:hover{ background:#F2EDE1; }\n        .pname{ flex:1; font-size:14px; color:#050A30; }\n        .chk{ width:22px; height:22px; border-radius:6px; border:1.5px solid #CFC8B6; display:grid; place-items:center; flex:none; }\n        .chk.on{ background:'+acc+'; border-color:'+acc+'; }\n        .startb{ margin:14px 16px; width:calc(100% - 32px); border:none; border-radius:12px; background:#0F2EA3; color:#fff; font-family:inherit; font-size:14px; font-weight:600; padding:12px; cursor:pointer; }\n        .startb:disabled{ opacity:.4; cursor:default; }\n      ';

      var html = '<style>'+css+'</style>';
      html += '<button class="trigger" id="trig" title="Team chat" aria-label="Team chat">'+svg('chat',20)+(total?'<span class="badge">'+(total>9?'9+':total)+'</span>':'')+'</button>';

      if(this.open){
        html += '<div class="backdrop" id="bd"></div><div class="panel">';
        if(this.view==='list'){
          html += '<div class="hd"><h3>Team chat</h3><button class="ibtn" id="newbtn" title="Nieuwe chat">'+svg('plus',18)+'</button><button class="ibtn" id="close">'+svg('x',17)+'</button></div>';
          html += '<div class="srch"><div class="srchw"><span class="si">'+svg('search',15)+'</span><input id="srch" placeholder="Zoek gesprek of collega…" value="'+esc(this.search)+'"></div></div>';
          html += '<div class="body" id="roomlist">';
          var q=this.search.toLowerCase();
          var allRooms=d.rooms.filter(function(r){ return !q || r.name.toLowerCase().indexOf(q)>=0; });
          var rooms=allRooms.filter(function(r){return !r.archived;});
          var archived=allRooms.filter(function(r){return r.archived;});
          var renderRow=function(r){
            var un=this.unreadFor(r);
            var last=r.messages.length?r.messages[r.messages.length-1]:null;
            var avc = r.type==='dm'? pcolor(r.name) : '#050A30';
            var menuOpen=this.menuRoom===r.id;
            html += '<div class="roomwrap" style="position:relative;">'
              + '<button class="room" data-room="'+r.id+'">'
              + '<span class="av'+(r.type==='group'?' grp':'')+'" style="background:'+avc+'">'+(r.type==='group'?svg('users',19,'#fff'):esc(ini(r.name)))+'</span>'
              + '<div style="flex:1;min-width:0;"><div class="rname">'+esc(r.name)+'</div><div class="rlast">'+esc(this.lastMsg(r)||this.roomSubtitle(r))+'</div></div>'
              + '<div class="rmeta">'+(last?'<span class="rtime">'+timeLabel(last.ts)+'</span>':'')+(un?'<span class="rdot">'+un+'</span>':'')+'</div>'
              + '</button>'
              + '<button class="kebab" data-menu="'+r.id+'" title="Opties" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);width:28px;height:28px;border:none;background:transparent;border-radius:8px;cursor:pointer;display:grid;place-items:center;color:#A39E8E;">'+svg('dots',17)+'</button>'
              + (menuOpen?('<div class="rmenu" style="position:absolute;top:calc(50% + 16px);right:10px;z-index:5;background:#fff;border:1px solid #E4DDCC;border-radius:12px;box-shadow:0 16px 40px -12px rgba(5,10,48,.34);padding:5px;min-width:168px;">'
                + '<button data-arch="'+r.id+'" style="display:flex;align-items:center;gap:9px;width:100%;border:none;background:transparent;cursor:pointer;padding:9px 11px;border-radius:8px;font-family:inherit;font-size:13px;color:#3D3A33;text-align:left;">'+svg('archive',15,'#5E5A4F')+(r.archived?'Uit archief halen':'Archiveren')+'</button>'
                + '<button data-del="'+r.id+'" style="display:flex;align-items:center;gap:9px;width:100%;border:none;background:transparent;cursor:pointer;padding:9px 11px;border-radius:8px;font-family:inherit;font-size:13px;color:#B0432F;text-align:left;">'+svg('trash',15,'#B0432F')+'Verwijderen</button>'
                + '</div>'):'')
              + '</div>';
          }.bind(this);
          rooms.forEach(renderRow);
          if(archived.length){
            html += '<button class="archhead" data-archtoggle="1" style="display:flex;align-items:center;gap:8px;width:100%;border:none;background:transparent;cursor:pointer;padding:11px 18px 7px;font-family:inherit;font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#A39E8E;">'+svg('archive',14,'#A39E8E')+'Gearchiveerd ('+archived.length+')</button>';
            if(this.showArchived){ archived.forEach(renderRow); }
          }
          html += '</div>';
        } else if(this.view==='room'){
          var r=d.rooms.find(function(x){return x.id===this.activeRoom;}.bind(this));
          if(r){
            var avc = r.type==='dm'? pcolor(r.name) : '#050A30';
            html += '<div class="hd"><button class="ibtn" id="back">'+svg('back',18)+'</button>'
              + '<span class="av'+(r.type==='group'?' grp':'')+'" style="width:34px;height:34px;font-size:12px;background:'+avc+'">'+(r.type==='group'?svg('users',16,'#fff'):esc(ini(r.name)))+'</span>'
              + '<div style="flex:1;min-width:0;"><h3 style="font-size:15px;">'+esc(r.name)+'</h3><div class="rlast">'+esc(this.roomSubtitle(r))+'</div></div>'
              + (r.type==='group'?'<button class="ibtn" id="settings" title="Instellingen">'+svg('gear',17)+'</button>':'')
              + '<button class="ibtn" id="close">'+svg('x',17)+'</button></div>';
            html += '<div class="thread" id="thread">';
            var lastFrom=null;
            r.messages.forEach(function(m){
              var mine=m.from===me;
              var fileHtml='';
              if(m.files&&m.files.length){ fileHtml=m.files.map(function(f){ return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;padding:7px 9px;border-radius:9px;background:'+(mine?'rgba(255,255,255,.16)':'#F4F7FF')+';">'+svg('file',15,mine?'#fff':'#2458EA')+'<span style="font-size:12.5px;font-weight:600;color:'+(mine?'#fff':'#0F2EA3')+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(f.n)+'</span>'+(f.size!=null?'<span style="font-size:10.5px;color:'+(mine?'rgba(255,255,255,.7)':'#8E8979')+';flex:none;">'+self.fmtBytes(f.size)+'</span>':'')+'</div>'; }).join(''); }
              var taskHtml='';
              if(m.task){ var tk=m.task; taskHtml='<div style="margin-top:'+(m.text?'6px':'0')+';display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:11px;background:'+(mine?'rgba(255,255,255,.14)':'#fff')+';border:1px solid '+(mine?'rgba(255,255,255,.24)':'#E2E9FF')+';">'
                + '<div style="display:flex;align-items:center;gap:6px;font-size:9.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:'+(mine?'rgba(255,255,255,.8)':'#2458EA')+';">'+svg('task',12,mine?'rgba(255,255,255,.85)':'#2458EA')+'Taak</div>'
                + '<div style="font-size:13px;font-weight:600;line-height:1.3;color:'+(mine?'#fff':'#050A30')+';">'+esc(tk.title||'')+'</div>'
                + (tk.subtitle?'<div style="font-size:11.5px;color:'+(mine?'rgba(255,255,255,.82)':'#8E8979')+';">'+esc(tk.subtitle)+'</div>':'')
                + (tk.status?'<div style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;margin-top:2px;color:'+(mine?'rgba(255,255,255,.85)':'#5E5A4F')+';"><span style="width:6px;height:6px;border-radius:99px;background:'+(tk.color||(mine?'#D1F24C':'#2458EA'))+';"></span>'+esc(tk.status)+'</div>':'')
                + '</div>'; }
              html += '<div class="msg '+(mine?'me':'them')+'">'
                + (!mine && r.type==='group' && m.from!==lastFrom ? '<div class="mfrom" style="color:'+pcolor(m.from)+'">'+esc(m.from.split(' ')[0])+'</div>' : '')
                + (m.text?esc(m.text):'')
                + fileHtml
                + taskHtml
                + '<div class="mtime">'+timeLabel(m.ts)+'</div></div>';
              lastFrom=m.from;
            });
            html += '</div>';
            var taskBtn = this.taskProvider ? '<button class="sendb" id="tasksh" title="Deel een taak" style="background:#E0F1FD;color:#2458EA;">'+svg('task',18,'#2458EA')+'</button>' : '';
            if(this.taskPick && this.taskProvider){
              var tasks=(this.taskProvider()||[]); var tq=(this.taskQuery||'').toLowerCase();
              var filt=tasks.filter(function(t){ return !tq || ((t.title||'')+' '+(t.subtitle||'')).toLowerCase().indexOf(tq)>=0; });
              var rowsH = filt.length? filt.map(function(t){ return '<button data-task="'+esc(String(t.id))+'" style="display:flex;align-items:center;gap:11px;width:100%;border:none;background:transparent;cursor:pointer;padding:10px;border-radius:11px;text-align:left;font-family:inherit;" onmouseover="this.style.background=\'#F2EDE1\'" onmouseout="this.style.background=\'transparent\'">'
                + '<span style="width:30px;height:30px;border-radius:8px;background:#E0F1FD;display:grid;place-items:center;flex:none;">'+svg('task',16,'#2458EA')+'</span>'
                + '<span style="flex:1;min-width:0;"><span style="display:block;font-size:13px;font-weight:600;color:#050A30;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(t.title||'')+'</span><span style="display:block;font-size:11.5px;color:#8E8979;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc((t.subtitle||'')+(t.status?(' \u00b7 '+t.status):''))+'</span></span></button>'; }).join('') : '<div style="padding:24px 12px;text-align:center;color:#A39E8E;font-size:13px;">Geen taken gevonden.</div>';
              html += '<div id="taskback" style="position:absolute;inset:0;z-index:6;background:rgba(5,10,48,.18);"></div>'
                + '<div style="position:absolute;left:0;right:0;bottom:0;z-index:7;max-height:74%;background:#FFFDF8;border-top:1px solid #E4DDCC;border-radius:16px 16px 0 0;box-shadow:0 -14px 36px -14px rgba(5,10,48,.32);display:flex;flex-direction:column;animation:slide .2s cubic-bezier(.16,1,.3,1);">'
                + '<div style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #EFE8D8;"><strong style="font-size:14px;color:#050A30;flex:1;">Kies een taak om te delen</strong><button id="taskclose" class="ibtn">'+svg('x',16)+'</button></div>'
                + '<div style="padding:10px 14px 6px;"><div class="srchw"><span class="si">'+svg('search',15)+'</span><input id="tasksrch" placeholder="Zoek taak\u2026" value="'+esc(this.taskQuery||'')+'" style="width:100%;font-family:inherit;font-size:13.5px;border:1px solid #DFD9C8;border-radius:11px;padding:9px 12px 9px 34px;background:#fff;color:#3D3A33;"></div></div>'
                + '<div style="flex:1;overflow-y:auto;padding:4px 8px 10px;">'+rowsH+'</div>'
                + '</div>';
            }
            html += '<div class="composer"><label class="sendb" id="attach" title="Bestand sturen" style="background:#F2EDE1;color:#5E5A4F;cursor:pointer;">'+svg('clip',18,'#5E5A4F')+'<input id="attachinput" type="file" multiple style="display:none;"></label>'+taskBtn+'<input id="msg" placeholder="Bericht\u2026" autocomplete="off"><button class="sendb" id="sendb">'+svg('send',19)+'</button></div>';
          }
        } else if(this.view==='settings'){
          var r=d.rooms.find(function(x){return x.id===this.activeRoom;}.bind(this));
          if(r){
            html += '<div class="hd"><button class="ibtn" id="backroom">'+svg('back',18)+'</button><h3>Chat-instellingen</h3><button class="ibtn" id="close">'+svg('x',17)+'</button></div>';
            html += '<div class="body" style="padding:4px 0;">';
            html += '<div style="padding:14px 18px;"><div class="lbl" style="margin-bottom:7px;">Chatnaam</div><input id="rename" value="'+esc(r.name)+'" style="width:100%;font-family:inherit;font-size:14px;border:1px solid #DFD9C8;border-radius:11px;padding:10px 12px;background:#fff;color:#3D3A33;"></div>';
            html += '<div class="lbl" style="padding:0 18px 6px;display:flex;justify-content:space-between;align-items:center;">Leden ('+r.members.length+')</div>';
            r.members.forEach(function(n){
              html += '<div class="pick" style="cursor:default;"><span class="av" style="width:34px;height:34px;font-size:12px;background:'+pcolor(n)+'">'+esc(ini(n))+'</span><span class="pname">'+esc(n)+(n===self.me?' (jij)':'')+'</span>'+(n===self.me?'':'<button data-rm="'+esc(n)+'" title="Verwijderen" style="border:none;background:transparent;cursor:pointer;padding:6px;color:#B0432F;">'+svg('trash',15,'#B0432F')+'</button>')+'</div>';
            });
            var canAdd=ROSTER.filter(function(n){return r.members.indexOf(n)<0;});
            if(canAdd.length){
              html += '<div class="lbl" style="padding:14px 18px 6px;">Lid toevoegen</div>';
              canAdd.forEach(function(n){
                html += '<div class="pick" data-add="'+esc(n)+'"><span class="av" style="width:34px;height:34px;font-size:12px;background:'+pcolor(n)+'">'+esc(ini(n))+'</span><span class="pname">'+esc(n)+'</span><span class="chk">'+svg('plusc',17,'#2458EA')+'</span></div>';
              });
            }
            html += '</div>';
          }
        } else if(this.view==='new'){
          html += '<div class="hd"><button class="ibtn" id="back">'+svg('back',18)+'</button><h3>Nieuwe chat</h3><button class="ibtn" id="close">'+svg('x',17)+'</button></div>';
          html += '<div class="body">';
          html += '<div class="seg"><button class="'+(this.newType==='dm'?'on':'')+'" data-nt="dm">'+svg('user',15)+'1-op-1</button><button class="'+(this.newType==='group'?'on':'')+'" data-nt="group">'+svg('users',15)+'Groep</button></div>';
          if(this.newType==='group'){ html += '<div class="lbl">Groepsnaam</div><div class="gname"><input id="gname" placeholder="bv. Bolckmans project" value="'+esc(this.newName)+'"></div>'; }
          html += '<div class="lbl">'+(this.newType==='dm'?'Kies een collega':'Kies leden')+'</div>';
          ROSTER.filter(function(n){return n!==me;}).forEach(function(n){
            var on=this.newSel.indexOf(n)>=0;
            html += '<div class="pick" data-pick="'+esc(n)+'"><span class="av" style="width:34px;height:34px;font-size:12px;background:'+pcolor(n)+'">'+esc(ini(n))+'</span><span class="pname">'+esc(n)+'</span><span class="chk'+(on?' on':'')+'">'+(on?svg('check',15,'#fff'):'')+'</span></div>';
          }.bind(this));
          html += '</div>';
          var canStart = this.newSel.length>0;
          html += '<button class="startb" id="startb"'+(canStart?'':' disabled')+'>'+(this.newType==='dm'?'Start gesprek':'Groep aanmaken')+'</button>';
        }
        html += '</div>';
      }
      this.root.innerHTML = html;
      this._wire();
    }

    _wire(){
      var R=this.root, self=this;
      var trig=R.getElementById('trig'); if(trig) trig.onclick=function(){ self.toggle(); };
      var bd=R.getElementById('bd'); if(bd) bd.onclick=function(){ self.open=false; self.render(); };
      var close=R.getElementById('close'); if(close) close.onclick=function(){ self.open=false; self.render(); };
      var back=R.getElementById('back'); if(back) back.onclick=function(){ self.view='list'; self.menuRoom=null; self.render(); };
      var backroom=R.getElementById('backroom'); if(backroom) backroom.onclick=function(){ self.view='room'; self.render(); };
      var settings=R.getElementById('settings'); if(settings) settings.onclick=function(){ self.view='settings'; self.render(); };
      var newbtn=R.getElementById('newbtn'); if(newbtn) newbtn.onclick=function(){ self.view='new'; self.newSel=[]; self.newName=''; self.render(); };
      var srch=R.getElementById('srch'); if(srch) srch.oninput=function(e){ self.search=e.target.value; var list=R.getElementById('roomlist'); self.render(); var s2=R.getElementById('srch'); if(s2){ s2.focus(); s2.setSelectionRange(s2.value.length,s2.value.length);} };
      R.querySelectorAll('[data-room]').forEach(function(el){ el.onclick=function(){ self.openRoom(el.getAttribute('data-room')); }; });
      R.querySelectorAll('[data-menu]').forEach(function(el){ el.onclick=function(e){ e.stopPropagation(); var id=el.getAttribute('data-menu'); self.menuRoom=self.menuRoom===id?null:id; self.render(); }; });
      R.querySelectorAll('[data-arch]').forEach(function(el){ el.onclick=function(e){ e.stopPropagation(); self.archiveRoom(el.getAttribute('data-arch')); }; });
      R.querySelectorAll('[data-del]').forEach(function(el){ el.onclick=function(e){ e.stopPropagation(); self.deleteRoom(el.getAttribute('data-del')); }; });
      var archt=R.getElementById('archtoggle'); R.querySelectorAll('[data-archtoggle]').forEach(function(el){ el.onclick=function(){ self.showArchived=!self.showArchived; self.render(); }; });
      var msg=R.getElementById('msg'), sendb=R.getElementById('sendb');
      if(msg){ msg.focus(); msg.onkeydown=function(e){ if(e.key==='Enter'){ e.preventDefault(); self.send(msg.value); } }; }
      if(sendb) sendb.onclick=function(){ var m=R.getElementById('msg'); if(m) self.send(m.value); };
      var attachinput=R.getElementById('attachinput'); if(attachinput) attachinput.onchange=function(e){ self.attachFiles(e.target.files); e.target.value=''; };
      var tasksh=R.getElementById('tasksh'); if(tasksh) tasksh.onclick=function(){ self.taskPick=!self.taskPick; self.taskQuery=''; self.render(); };
      var taskback=R.getElementById('taskback'); if(taskback) taskback.onclick=function(){ self.taskPick=false; self.render(); };
      var taskclose=R.getElementById('taskclose'); if(taskclose) taskclose.onclick=function(){ self.taskPick=false; self.render(); };
      var tasksrch=R.getElementById('tasksrch'); if(tasksrch) tasksrch.oninput=function(e){ self.taskQuery=e.target.value; self.render(); var t2=R.getElementById('tasksrch'); if(t2){ t2.focus(); t2.setSelectionRange(t2.value.length,t2.value.length);} };
      R.querySelectorAll('[data-task]').forEach(function(el){ el.onclick=function(){ var id=el.getAttribute('data-task'); var list=(self.taskProvider&&self.taskProvider())||[]; var tk=list.find(function(x){return String(x.id)===String(id);}); if(tk) self.sendTask(tk); }; });
      var rename=R.getElementById('rename'); if(rename) rename.oninput=function(e){ self.renameRoom(self.activeRoom, e.target.value); };
      R.querySelectorAll('[data-rm]').forEach(function(el){ el.onclick=function(){ self.toggleMember(self.activeRoom, el.getAttribute('data-rm')); }; });
      R.querySelectorAll('[data-add]').forEach(function(el){ el.onclick=function(){ self.toggleMember(self.activeRoom, el.getAttribute('data-add')); }; });
      R.querySelectorAll('[data-nt]').forEach(function(el){ el.onclick=function(){ self.newType=el.getAttribute('data-nt'); self.newSel=[]; self.render(); }; });
      R.querySelectorAll('[data-pick]').forEach(function(el){ el.onclick=function(){ var n=el.getAttribute('data-pick'); if(self.newType==='dm'){ self.newSel=[n]; } else { var i=self.newSel.indexOf(n); if(i>=0) self.newSel.splice(i,1); else self.newSel.push(n); } self.render(); }; });
      var gname=R.getElementById('gname'); if(gname) gname.oninput=function(e){ self.newName=e.target.value; };
      var startb=R.getElementById('startb'); if(startb) startb.onclick=function(){ self.createRoom(); };
    }
  }
  customElements.define('team-chat', TeamChat);
})();
