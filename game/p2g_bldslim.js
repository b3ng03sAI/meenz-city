// ===================== Gebäude-Datensätze schlank + Gebäude-Chunks in Scheiben (Paket 40.5, Phase C) =====================
// Vertrag: .claude/plans/2026-10-03-welle-10.md (Abschnitt „bauten“). BUILDINGS/OB behalten Länge, Reihenfolge und
// Identität; nur die Ringe (poly/holes, Getter in BldsRec, seg_bld.js) liegen nach dem Boot nicht mehr überall im Speicher:
// Je 320-m-Kachel (chunkKey-Raster) heiß < 1000 m um FRAMEB.pts → Ringe zwischengespeichert, kalt > 1300 m → verworfen.
// Kalt liefert der Getter bei jedem Zugriff frisch aus OSM.b dekodierte Arrays (µs je Gebäude).
const BLDS={on:false,inPkt:false,hotR:1000,coldR:1300,tiles:new Map(),t:0,pinD:0,pinned:[],hash0:0,order0:0,n0:0,
  stats:{decodes:0,fills:0,drops:0},
  city:{steps:0,ms:0,maxMs:0,maxHi:0,maxLo:0,slowest:'',built:{hi:0,lo:0},sync:{hi:0,lo:0},cancelled:0}};
function bldsTileId(x,z){return Math.floor((x-MINX)/CHUNK)*65536+Math.floor((z-MINZ)/CHUNK);}
function bldsHot(b){const T=BLDS.tiles.get(bldsTileId(b.x,b.z));return !!T&&T.hot;}
function bldsDecode(b){const r=OSM.b[b.src];BLDS.stats.decodes++;return [decRing(r[10]),r[11].map(decRing).filter(h=>h.length>=3)];}
// Getter-Pfad (Ring nicht im Cache): in heißer Kachel oder während eines Chunk-Baus (pin) merken, sonst nur zurückgeben
function bldsFetch(b,holes){const [P,H]=bldsDecode(b);
  if(BLDS.pinD>0||bldsHot(b)){b.rgP=P;b.rgH=H;if(BLDS.pinD>0)BLDS.pinned.push(b);}
  return holes?H:P;}
// Ein Chunk-Bauschritt liest poly/holes mehrfach je Gebäude → Ringe für die Dauer des Schritts festhalten
function bldsPinBegin(){BLDS.pinD++;}
function bldsPinEnd(){if(--BLDS.pinD>0)return;const L=BLDS.pinned;BLDS.pinned=[];for(const b of L)if(!bldsHot(b))b.rgP=b.rgH=null;}
// Prüfsumme über alle Ringe (Bitmuster der Koordinaten) – vor dem Umbau beim Boot und später über die Getter gleich
function bldsRingHash(){const f=new Float64Array(1),u=new Uint32Array(f.buffer);let h=0x811c9dc5;
  const mix=v=>{h=Math.imul(h^v,16777619);};const ring=R=>{mix(R.length);for(const p of R){f[0]=p[0];mix(u[0]);mix(u[1]);f[0]=p[1];mix(u[0]);mix(u[1]);}};
  for(const b of OB){ring(b.poly);const H=b.holes;mix(H.length);for(const r of H)ring(r);}
  return h>>>0;}
function bldsOrderHash(){let h=0x811c9dc5;for(const b of BUILDINGS){h=Math.imul(h^(b.gid|0),16777619);h=Math.imul(h^b.src,16777619);}return h>>>0;}
function bldsCached(){let n=0;for(const b of OB)if(b.rgP!==null)n++;return n;}
// Testhilfe: Gebäude im Umkreis r und wie viele davon Ringe im Cache haben
function bldsCachedNear(x,z,r){let n=0,c=0;for(const b of OB){if(Math.hypot(b.x-x,b.z-z)>r)continue;n++;if(b.rgP!==null)c++;}return {n,cached:c};}
function bldsNearPt(x,z){const P=FRAMEB.pts;if(P.length)return fbDist(x,z);
  let d=1e9;for(const Q of PLAYERS)if(Q.h){const p=ppos(Q);d=Math.min(d,Math.hypot(x-p[0],z-p[1]));}
  return d<1e9?d:Math.hypot(x-POI.start[0],z-POI.start[1]);}
// Boot-Ende (nach allen Feature-Setups, Planung, Raster, Übersicht, Fernboden): Ringe fern vom Start verwerfen
function setupBldSlim(){BLDS.hash0=bldsRingHash();BLDS.order0=bldsOrderHash();BLDS.n0=BUILDINGS.length;
  for(const b of OB){const id=bldsTileId(b.x,b.z);let T=BLDS.tiles.get(id);
    if(!T){const i=Math.floor(id/65536),j=id%65536;T={id,fill:'bld:ring:'+id,drop:'bld:drop:'+id,cx:MINX+(i+0.5)*CHUNK,cz:MINZ+(j+0.5)*CHUNK,list:[],hot:false};BLDS.tiles.set(id,T);}
    T.list.push(b);}
  for(const T of BLDS.tiles.values()){T.hot=bldsNearPt(T.cx,T.cz)<BLDS.hotR;if(!T.hot)for(const b of T.list)b.rgP=b.rgH=null;}
  BLDS.on=true;}
const BLDS_FILL_N=160;// Gebäude je Füll-Schritt
function bldsFillStep(T){let i=0;return ()=>{if(!T.hot)return true;const n=Math.min(T.list.length,i+BLDS_FILL_N);
  for(;i<n;i++){const b=T.list[i];if(b.rgP===null){const [P,H]=bldsDecode(b);b.rgP=P;b.rgH=H;}}
  if(i>=T.list.length){BLDS.stats.fills++;return true;}return false;};}
function bldsDropStep(T){return ()=>{if(T.hot)return true;for(const b of T.list)b.rgP=b.rgH=null;BLDS.stats.drops++;return true;};}
// Alle 0,25 s Soll-Zustand je Kachel; Füllen und Verwerfen als Pakete bld:ring:/bld:drop: (niedrige Priorität)
function updateBldSlim(dt){if(!BLDS.on||!FRAMEB.pts.length)return;BLDS.t-=dt;if(BLDS.t>0&&!FRAMEB.jump)return;BLDS.t=0.25;
  for(const T of BLDS.tiles.values()){const d=fbDist(T.cx,T.cz);
    if(!T.hot&&d<BLDS.hotR){T.hot=true;fbCancel(T.drop);fbJob(T.fill,bldsPacket.bind(null,bldsFillStep(T)),{x:T.cx,z:T.cz,bias:3000});}
    else if(T.hot&&d>BLDS.coldR){T.hot=false;fbCancel(T.fill);fbJob(T.drop,bldsPacket.bind(null,bldsDropStep(T)),{x:T.cx,z:T.cz,bias:3000});}}}
// Pakete ziehen nie aus dem globalen Math.random (Invariante 4): three.js-UUIDs neuer Meshes/Gruppen aus eigenem Strom
const BLDS_RNG=mulberry32(0xb1d5);
function bldsPacket(fn){const r=Math.random;BLDS.inPkt=true;Math.random=BLDS_RNG;try{return fn();}finally{Math.random=r;BLDS.inPkt=false;}}
function bldsCityTime(key,hi,ms){const C=BLDS.city;C.steps++;C.ms+=ms;if(hi)C.maxHi=Math.max(C.maxHi,ms);else C.maxLo=Math.max(C.maxLo,ms);if(ms>C.maxMs){C.maxMs=ms;C.slowest=key;}}
// Mess-/Testhilfe: Chunk einmal in Paket-Schritten und einmal synchron bauen (nicht in die Szene) → Zeiten und Gleichheit
function bldsProbe(key,hi){const c=CITY.chunks.get(key);if(!c)return null;const det=hi?QS.detail:-1,mats=cityMats();
  const sig=g=>g.children.map(m=>{const a=m.geometry.attributes;let s=0;for(const k of ['position','color','uv','normal'])for(let i=0;i<a[k].array.length;i+=7)s+=a[k].array[i];
    return Object.keys(mats).find(k=>mats[k]===m.material)+':'+a.position.count+':'+m.geometry.index.count+':'+s.toFixed(2);}).join('|');
  const A=cityBuilder(c,det);let steps=0,maxMs=0,total=0,done=false;
  while(!done){const t=performance.now();done=cityStep(A,hi?CITY_COST.hi:CITY_COST.lo,1);const d=performance.now()-t;steps++;total+=d;maxMs=Math.max(maxMs,d);}
  const t=performance.now(),S=cityBuilder(c,det);while(!cityStep(S,Infinity,Infinity)){}const syncMs=performance.now()-t;
  const r={n:c.list.length,steps,maxMs,total,syncMs,meshes:A.g.children.length,same:sig(A.g)===sig(S.g)};
  for(const g of [A.g,S.g])g.traverse(o=>{if(o.geometry)o.geometry.dispose();});return r;}
Object.assign(BLDS,{Rec:BldsRec,ringHash:bldsRingHash,orderHash:bldsOrderHash,cached:bldsCached,cachedNear:bldsCachedNear,tileId:bldsTileId,probe:bldsProbe});
