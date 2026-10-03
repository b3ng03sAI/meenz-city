// ===================== Welt in Abschnitten laden (Paket 40.5) =====================
// Straßen, Gehwege, Bordsteine/Markierungen, Plätze/Grün, Gleise und Bäume entstehen je 320-m-Kachel (chunkKey) nur in
// Spielernähe und werden fern wieder freigegeben. Alle Weltdaten (ROADS, AREAS, TREES, HG, …) bleiben global und
// unverändert; nur die Meshes sind regional. Darunter liegt immer der gemalte Boden (GROUND), also keine Löcher.
// Arbeit läuft als Pakete 'st:<kachel>:<ebene>' (bauen) und 'st:free' (freigeben) durch FRAMEB (p2b_frame.js).
// Plan: .claude/plans/2026-10-03-welt-streaming.md · Vertrag: .claude/plans/2026-10-03-welle-10.md
const STREAM_LAYERS=['road','sw','curb','ground','rails','trees'];
const STREAM={tiles:new Map(),list:[],ready:false,
  // Bauen < build, Freigeben > free (Abstand Kachelrand ↔ Spieler-/Vorausschau-Kapsel), Sprung-Kern < core
  R:LOWMEM?{build:1700,free:2000}:{build:3200,free:3500},core:450,coreMs:250,relQ:new Set(),half:CHUNK*Math.SQRT1_2,
  // Desktop: Bäume bleiben überall stehen (Fernsicht aus dem Flugzeug wie bisher, Speicher ist dort nicht knapp)
  pin:new Set(LOWMEM?[]:['trees']),
  t:0,loading:false,hintT:0,live:new Set(),treeLift:new Map(),treeGeo:null,trims:null,railMat:null,
  stats:{builds:0,layerBuilds:0,disposes:0,cpuGeoBytes:0,cores:0,coreMs:0,coreMax:0},
  st:{maxMs:0,slowest:'',slowestMs:0,steps:0},
  get timing(){const F=FRAMEB.timing;return {last:F.last,max:F.max,p95:fbP95(),slowest:F.slowest,slowestMs:F.slowestMs,syncLast:F.syncLast,syncMax:F.syncMax,
    stMax:this.st.maxMs,stSlowest:this.st.slowest,coreMs:this.stats.coreMs,coreMax:this.stats.coreMax};}};
function streamTileAt(x,z){const k=chunkKey(x,z);let T=STREAM.tiles.get(k);
  if(!T){const i=Math.floor((x-MINX)/CHUNK),j=Math.floor((z-MINZ)/CHUNK);
    T={key:k,i,j,cx:MINX+(i+0.5)*CHUNK,cz:MINZ+(j+0.5)*CHUNK,roads:[],edges:[],zebras:[],areas:[],rails:[],trees:[],need:[],layers:new Map(),hash:{},want:false,freeing:false};
    STREAM.tiles.set(k,T);}
  return T;}
// Eigener Zufall je Kachel und Ebene – Neubauten ziehen nie aus dem globalen Math.random (auch nicht für three.js-UUIDs)
function streamSeed(layer,i,j){return (Math.imul(i+7919,73856093)^Math.imul(j+104729,19349663)^Math.imul(STREAM_LAYERS.indexOf(layer)+1,83492791))>>>0;}
function streamWithRng(seed,fn){const r=Math.random;Math.random=mulberry32(seed);try{return fn();}finally{Math.random=r;}}
function streamGeoBytes(G){const n=G.p.length/3;return (n*11+G.i.length*(n>65535?1:0.5))*4;}
// CPU-Kopie nach dem GPU-Upload freigeben und mitzählen (STREAM.stats.cpuGeoBytes = noch im RAM liegende Kachel-Geometrie)
function streamDrop(geo,L,bytes){const rec={b:bytes,up:false};L.recs.push(rec);STREAM.stats.cpuGeoBytes+=bytes;
  const f=function(){this.array=new this.array.constructor(0);if(!rec.up){rec.up=true;STREAM.stats.cpuGeoBytes-=rec.b;}};
  for(const k in geo.attributes)geo.attributes[k].onUpload(f);if(geo.index)geo.index.onUpload(f);}
function streamAdd(L,m,inst){scene.add(m);if(LOWMEM){if(inst)staticInst(m);else staticMesh(m);}L.meshes.push(m);STREAM.live.add(m);}
// Eine Ebene einer Kachel bauen (ein Arbeitspaket)
function streamBuildLayer(T,layer){if(T.layers.has(layer))return;const S=STREAM,seed=streamSeed(layer,T.i,T.j);
  const L={meshes:[],recs:[],trees:null,inst:layer==='trees'};
  streamWithRng(seed^0x5bd1e995,()=>{
    if(layer==='trees'){const r=streamTreeMeshes(T,mulberry32(seed));L.trees=[];
      let n=0;for(const [m,list] of r.out){streamAdd(L,m,true);if(list){L.trees.push([m,list]);n=list.length;}
        const b=n*(list?19:16)*4;L.recs.push({b,up:false});S.stats.cpuGeoBytes+=b;}// Instanz-Matrizen/-Farben bleiben im RAM
      T.hash.trees={n:r.n,h:r.h,m:L.meshes.length};}
    else{const parts=layer==='ground'?streamGroundGB(T):layer==='rails'?streamRailGB(T):streamRoadGB(T,layer);let v=0,sum=0,ni=0;
      for(const [G,mat,cast] of parts){if(G.empty)continue;const P=G.p;v+=P.length/3;ni+=G.i.length;for(let k=0;k<P.length;k++)sum+=P[k];
        const bytes=streamGeoBytes(G);const m=new THREE.Mesh(G.geo(),mat);m.receiveShadow=true;m.castShadow=!!cast;streamAdd(L,m,false);streamDrop(m.geometry,L,bytes);}
      T.hash[layer]={v,i:ni,s:sum,m:L.meshes.length};}});
  T.layers.set(layer,L);S.stats.layerBuilds++;if(T.layers.size===T.need.length)S.stats.builds++;}
function streamStep(T,layer){const t=performance.now();streamBuildLayer(T,layer);const d=performance.now()-t,S=STREAM.st;S.steps++;
  if(d>S.maxMs)S.maxMs=d;if(d>S.slowestMs){S.slowestMs=d;S.slowest=T.key+':'+layer;}return true;}
// Vom Spieler angehobene Bäume (p6c_oberst setzt teils nur die Instanz) beim Freigeben merken, damit ein Neubau gleich aussieht
function streamKeepLift(L){for(const [m,list] of L.trees){const a=m.instanceMatrix&&m.instanceMatrix.array;if(!a||typeof a[13]!=='number')continue;
  list.forEach((t,i)=>{const y=a[i*16+13];if(Math.abs(y-(t.y??0))>1e-3)STREAM.treeLift.set(t,y);});}}
// Nie hochgeladene Arrays freigegebener Meshes leeren: Listen, die ein Mesh noch kurz halten (Sicht-Culling in p6o_mobilux
// baut seine Liste nur alle 30 Bilder neu), sollen keine Geometrie mehr festhalten.
const STREAM_EMPTY=new Float32Array(0);
function streamEmpty(m,inst){const a=inst?[m.instanceMatrix,m.instanceColor]:Object.values(m.geometry.attributes||{}).concat(m.geometry.index||[]);
  for(const x of a)if(x&&x.array&&x.array.length)x.array=x.array instanceof Float32Array?STREAM_EMPTY:new x.array.constructor(0);}
function streamFreeTile(T,all){const S=STREAM,gone=new Set();
  for(const [l,L] of T.layers){if(!all&&S.pin.has(l))continue;if(L.trees)streamKeepLift(L);
    for(const m of L.meshes){scene.remove(m);gone.add(m);S.live.delete(m);if(L.inst)m.dispose();else m.geometry.dispose();streamEmpty(m,L.inst);}
    for(const r of L.recs)if(!r.up){r.up=true;S.stats.cpuGeoBytes-=r.b;}T.layers.delete(l);}
  if(LOWMEM)streamUnstatic(gone);S.stats.disposes++;}
// Freigaben: ein gemeinsames Paket 'st:free', eine Kachel je Schritt (also höchstens eine je Bild). Vorn in der Schlange,
// sonst verhungert es hinter dauernd nachrückenden Bau-Paketen (Flug, schnelle Fahrt) und der Speicher wächst.
function streamFreeJob(){const S=STREAM;for(const T of S.relQ){S.relQ.delete(T);T.freeing=false;streamFreeTile(T);break;}return S.relQ.size===0;}
function streamFreeable(T){for(const l of T.layers.keys())if(!STREAM.pin.has(l))return true;return false;}
function streamKey(T,layer){return 'st:'+T.key+':'+layer;}
function streamWant(T){if(T.freeing){STREAM.relQ.delete(T);T.freeing=false;}
  if(T.want)return;T.want=true;for(const l of T.need)if(!T.layers.has(l))fbJob(streamKey(T,l),()=>streamStep(T,l),{x:T.cx,z:T.cz,bias:0});}
function streamRelease(T){if(T.want){T.want=false;for(const l of T.need)fbCancel(streamKey(T,l));}
  if(streamFreeable(T)&&!T.freeing){T.freeing=true;STREAM.relQ.add(T);fbJob('st:free',streamFreeJob,{prio:-1});}}
// Abstand Kachelrand ↔ nächste Kapsel Spieler → Vorausschau (pts wie FRAMEB.pts)
function streamDist(T,pts){let best=1e9;for(const p of pts){const dx=p.ax-p.x,dz=p.az-p.z,L2=dx*dx+dz*dz;let t=L2>0?((T.cx-p.x)*dx+(T.cz-p.z)*dz)/L2:0;t=t<0?0:t>1?1:t;
    const d=Math.hypot(T.cx-p.x-dx*t,T.cz-p.z-dz*t);if(d<best)best=d;}
  return Math.max(0,best-STREAM.half);}
// Soll-Menge: nah → Ebenen als Pakete anmelden, fern → Freigabe-Paket (Hysterese build/free)
function streamPlan(pts){const S=STREAM,{build,free}=S.R;let loading=false;
  for(const T of S.list){const d=streamDist(T,pts);
    if(d<build)streamWant(T);else if(d>free&&(T.want||streamFreeable(T)))streamRelease(T);
    if(d<S.core&&T.layers.size<T.need.length)loading=true;}
  if(!loading)S.loading=false;}// den Lade-Hinweis setzt nur streamCore (nach einem Sprung), hier geht er nur wieder aus
// Sprung-Kern (Teleport, Schnellreise, Laden): Kacheln < core sofort fertig, nächste zuerst, höchstens coreMs (Tests: immer ganz)
function streamCore(pts){const S=STREAM,t0=performance.now(),near=[];
  for(const T of S.list){const d=streamDist(T,pts);if(d<S.core&&T.layers.size<T.need.length)near.push([d,T]);}
  near.sort((a,b)=>a[0]-b[0]);let open=false;
  for(const [,T] of near){if(!window.__MANUAL&&performance.now()-t0>S.coreMs){open=true;break;}
    streamWant(T);const pre='st:'+T.key+':';fbFlush(J=>J.key.startsWith(pre));}
  const d=performance.now()-t0;S.stats.cores++;S.stats.coreMs=d;if(d>S.stats.coreMax)S.stats.coreMax=d;S.loading=open;}
function streamPts(x,z){return [{x,z,ax:x,az:z}];}
// Schnellreise (Bildschirm ist schwarz): neues Ziel sofort planen und den Kern bauen
function streamJump(x,z){if(!STREAM.ready)return;const p=streamPts(x,z);streamPlan(p);streamCore(p);}
function setupStream(){const S=STREAM;S.list=[...S.tiles.values()];
  for(const T of S.list){T.need=STREAM_LAYERS.filter(l=>l==='road'?T.roads.length:l==='sw'?T.roads.some(r=>r.sw>0):l==='curb'?T.edges.length||T.zebras.length:
    l==='ground'?T.areas.length:l==='rails'?T.rails.length:T.trees.length);}
  S.list=S.list.filter(T=>T.need.length);
  // Boot: alles im Bau-Radius um den Start synchron (wie früher der globale Bau), der Rest erst im Spiel
  const p=streamPts(POI.start[0],POI.start[1]);
  for(const T of S.list){if(streamDist(T,p)<S.R.build){T.want=true;for(const l of T.need)streamBuildLayer(T,l);}
    else for(const l of T.need)if(S.pin.has(l))streamBuildLayer(T,l);}
  updateStaticLOD(POI.start[0],POI.start[1],true);S.ready=true;}
function updateStream(dt){const S=STREAM;if(!S.ready)return;
  if(FRAMEB.jump){S.t=0.25;streamPlan(FRAMEB.pts);streamCore(FRAMEB.pts);}
  else if((S.t-=dt)<=0){S.t=0.25;streamPlan(FRAMEB.pts);}
  if(S.loading&&(S.hintT-=dt)<=0){S.hintT=0.5;hint('Die Gegend lädt …',0.7);}}
// ---- Prüf-/Messzugriff (Tests, mob9) ----
function streamState(T){if(T.freeing)return 'freeing';const need=T.need.filter(l=>!STREAM.pin.has(l));if(!need.length||T.layers.size>=T.need.length)return 'built';
  const n=need.filter(l=>T.layers.has(l)).length;if(!n)return T.want?'queued':'cold';return 'partial';}
// meshes: alle Meshes der Kachel, streamed: ohne festgehaltene Ebenen (pin)
function streamInfo(T){let meshes=0,inScene=0,streamed=0;for(const [l,L] of T.layers)for(const m of L.meshes){meshes++;if(!STREAM.pin.has(l))streamed++;if(STREAM.live.has(m))inScene++;}
  return {key:T.key,cx:T.cx,cz:T.cz,state:streamState(T),need:T.need.slice(),built:[...T.layers.keys()],meshes,streamed,inScene,hash:JSON.stringify(T.hash)};}
Object.assign(STREAM,{
  at(x,z){const T=STREAM.tiles.get(chunkKey(x,z));return T&&T.need.length?streamInfo(T):null;},
  near(x,z,r){const p=streamPts(x,z);return STREAM.list.filter(T=>streamDist(T,p)<r).map(T=>({...streamInfo(T),d:streamDist(T,p),dp:streamDist(T,FRAMEB.pts)}));},// dp: Abstand zur Spieler-/Vorausschau-Kapsel
  counts(){const c={cold:0,queued:0,partial:0,built:0,freeing:0};for(const T of STREAM.list)c[streamState(T)]++;return c;},
  pending(){let n=0;for(const k of FRAMEB.jobs.keys())if(k.startsWith('st:'))n++;return n;},
  rebuild(x,z){const T=STREAM.tiles.get(chunkKey(x,z));if(!T||!T.need.length)return null;for(const l of T.need)fbCancel(streamKey(T,l));if(T.freeing){STREAM.relQ.delete(T);T.freeing=false;}streamFreeTile(T,true);T.want=true;for(const l of T.need)streamBuildLayer(T,l);return streamInfo(T);}});
