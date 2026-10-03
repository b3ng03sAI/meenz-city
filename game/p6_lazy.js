// ===================== Lazy-Stadtteile (Welle 8, Bau in Scheiben seit Welle 10) =====================
// Gemeinsamer Helfer: Ein Stadtteil baut seine Meshes/NPCs/Props erst, wenn ein Spieler in die Nähe kommt, und gibt alles
// jenseits von rOut (500 m) wieder frei (Hysterese). Beim Boot wird nichts gebaut.
// Verträge: .claude/plans/2026-10-02-welle-8.md, .claude/plans/2026-10-03-welle-10.md (ruckler)
//
//   const Z=lazyZone({name:'bretz',x,z,build(Z){…},dispose(Z){…}});
//   build(Z): Meshes in Z.group hängen; jede selbst erzeugte Geometrie/Material/Textur über lazyOwn(Z,obj) anmelden;
//             NPCs (Human) über lazyNpc(Z,h) anmelden. Darf eine Generator-Funktion sein (function*, yield zwischen
//             Teilen): dann läuft je Bild-Paket ein Teil. Eine normale Funktion ist ein einziger Schritt.
//   dispose(Z) (optional): eigene Zustände zurücksetzen (Venue-Räume, Labels, Missionsreferenzen …).
//   Danach entfernt der Helfer Z.group aus der Szene, ruft dispose() auf allem Angemeldeten und entfernt die NPCs.
//
// Bau in Scheiben: Ab rPre (450 m) läuft der Bau als Paket `lz:<name>` durch das gemeinsame Bild-Budget (FRAMEB,
// p2b_frame.js): Gruppe anlegen + build-Schritte, danach Vorwärmen (ruckWarmZone, p6s_ruck.js), zuletzt kommt die Gruppe
// in die Szene und Z.built wird true. Unterschreitet ein Spieler rIn (350 m) vor dem Ende – oder nach einem Sprung
// (Teleport/Schnellreise) –, wird der Rest sofort synchron gebaut. lazyBuild(Z) baut immer synchron fertig.
// Zufall: jeder Bauschritt zieht aus einem eigenen Strom je Zone (mulberry32, aus dem Namen geseedet, bei jedem Bau neu),
// nie aus dem globalen Math.random – auch die UUID der Gruppe nicht.
const LAZY={zones:[],rIn:350,rOut:500,rPre:450,bias:-200,stats:{jobs:0,steps:0,sync:0,maxStepMs:0,maxStepZone:''}};
function lazySeed(name){let h=2166136261;for(let i=0;i<name.length;i++){h^=name.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function lazyZone(o){
  const rIn=o.rIn||LAZY.rIn;
  const Z={name:o.name,x:o.x,z:o.z,rIn,rOut:o.rOut||LAZY.rOut,rPre:o.rPre||rIn+LAZY.rPre-LAZY.rIn,built:false,group:null,owned:[],npcs:[],
    builds:0,disposes:0,o,building:false,lzKey:'lz:'+o.name,lzIt:null,lzRng:null,lzWarm:false,lzSync:false,lzSteps:0,lzMs:0,lzStepMax:0};
  Z.lzStep=()=>lazyStep(Z);
  LAZY.zones.push(Z);return Z;}
function lazyOwn(Z,x){if(x)Z.owned.push(x);return x;}
function lazyNpc(Z,h){if(h)Z.npcs.push(h);return h;}
// Bau anmelden (ohne zu bauen): erster Schritt im nächsten fbPump
function lazyStart(Z){
  if(Z.built||Z.building)return;
  Z.building=true;Z.lzIt=null;Z.lzWarm=false;Z.lzSync=false;Z.lzSteps=0;Z.lzMs=0;Z.lzStepMax=0;Z.lzRng=mulberry32(lazySeed(Z.name));
  LAZY.stats.jobs++;fbJob(Z.lzKey,Z.lzStep,{x:Z.x,z:Z.z,bias:LAZY.bias});}
// Ein Paketschritt im Zonen-Zufallsstrom. Während des Schritts gilt Z.built=true wie früher während build() (Bau-Code,
// der eigene Kollisionen über blocked() abfragt, sieht sie also); zwischen den Schritten ist die Zone für alle anderen
// noch nicht gebaut.
function lazyStep(Z){const r=Math.random,t=performance.now();Math.random=Z.lzRng;Z.built=true;let done=false;
  try{done=lazyStepIn(Z);return done;}
  catch(e){Z.building=false;Z.lzIt=null;throw e;}
  finally{Math.random=r;if(!done)Z.built=false;const d=performance.now()-t;Z.lzSteps++;Z.lzMs+=d;LAZY.stats.steps++;
    if(d>Z.lzStepMax)Z.lzStepMax=d;if(d>LAZY.stats.maxStepMs){LAZY.stats.maxStepMs=d;LAZY.stats.maxStepZone=Z.name;}}}
function lazyStepIn(Z){
  if(!Z.group){
    Z.group=new THREE.Group();// kein .name setzen: im three-stub ist name schreibgeschützt
    hgcNoteZoneBuild(Z);
    const it=Z.o.build(Z);
    if(!(it&&typeof it.next==='function'))return lazyWarmOrDone(Z,true);
    Z.lzIt=it;}
  if(Z.lzIt){if(!Z.lzIt.next().done)return false;Z.lzIt=null;return lazyWarmOrDone(Z,true);}
  return lazyWarmOrDone(Z,false);}
// Nach dem letzten Bauschritt: Vorwärmen in eigenen Schritten (nicht im synchronen Fall, nicht ohne echtes Rendern),
// dann in die Szene
function lazyWarmOrDone(Z,fresh){
  if(!Z.lzSync&&!Z.lzWarm&&ruckWarmOn()){if(fresh)return false;if(!ruckWarmZone(Z))return false;}
  Z.lzWarm=true;Z.ruckWarm=null;Z.building=false;Z.lzRng=null;
  scene.add(Z.group);Z.builds++;
  return true;}
// Synchron fertig bauen (Rest der Scheiben in diesem Bild)
function lazyFinish(Z){
  if(Z.built)return;
  if(!Z.building)lazyStart(Z);
  Z.lzSync=true;LAZY.stats.sync++;
  if(!fbFlush(J=>J.key===Z.lzKey)&&!Z.built){// Paket fehlt in der Schlange (z. B. nach fbCancel): direkt weiterbauen
    let k=0;while(!Z.built&&++k<100000)lazyStep(Z);}}
function lazyBuild(Z){lazyFinish(Z);}
LAZY.api={start:Z=>lazyStart(Z),build:Z=>lazyBuild(Z),dispose:Z=>lazyDispose(Z),step:Z=>Z.lzStep()};// Testzugriff (__MEENZ.LAZY.api)
function lazyDispose(Z){
  if(!Z.built)return;
  if(Z.o.dispose)Z.o.dispose(Z);
  for(const h of Z.npcs)if(h&&!h.removed&&h.remove)h.remove();
  Z.npcs=[];
  if(Z.group){scene.remove(Z.group);
    Z.group.traverse(m=>{if(m.isInstancedMesh&&m.dispose)m.dispose();});
    Z.group=null;}
  for(const x of Z.owned)if(x&&x.dispose)x.dispose();
  Z.owned=[];
  Z.built=false;Z.disposes++;}
// Draw-Calls grob: sichtbare Meshes/Linien/Punkte im Stadtteil (Material-Arrays zählen je Material).
function lazyDrawCalls(Z){
  if(!Z.group)return 0;let n=0;
  Z.group.traverse(m=>{if(!(m.isMesh||m.isLine||m.isPoints||m.isSprite))return;
    let v=true;for(let p=m;p;p=p.parent)if(p.visible===false){v=false;break;}
    if(v)n+=Array.isArray(m.material)?m.material.length:1;});
  return n;}
// Nach updatePlayer, vor fbPump: Bau anmelden (< rPre), notfalls synchron fertig (< rIn), freigeben (> rOut).
// Eine Zone im Bau wird nicht abgebrochen: sie läuft zu Ende und wird danach normal freigegeben.
function updateLazy(){
  for(const Z of LAZY.zones){
    const d=minPlayerDist(Z.x,Z.z);
    if(Z.built){if(d>Z.rOut)lazyDispose(Z);}
    else if(d<Z.rIn)lazyFinish(Z);
    else if(d<Z.rPre&&!Z.building)lazyStart(Z);}}
