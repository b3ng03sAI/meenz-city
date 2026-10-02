// ===================== Lazy-Stadtteile (Welle 8) =====================
// Gemeinsamer Helfer: Ein Stadtteil baut seine Meshes/NPCs/Props erst, wenn ein Spieler näher als rIn (350 m) am
// Zentrum ist, und gibt alles jenseits von rOut (500 m) wieder frei (Hysterese). Beim Boot wird nichts gebaut.
// Vertrag: .claude/plans/2026-10-02-welle-8.md
//
//   const Z=lazyZone({name:'bretz',x,z,build(Z){…},dispose(Z){…}});
//   build(Z): Meshes in Z.group hängen; jede selbst erzeugte Geometrie/Material/Textur über lazyOwn(Z,obj) anmelden;
//             NPCs (Human) über lazyNpc(Z,h) anmelden.
//   dispose(Z) (optional): eigene Zustände zurücksetzen (Venue-Räume, Labels, Missionsreferenzen …).
//   Danach entfernt der Helfer Z.group aus der Szene, ruft dispose() auf allem Angemeldeten und entfernt die NPCs.
const LAZY={zones:[],rIn:350,rOut:500};
function lazyZone(o){
  const Z={name:o.name,x:o.x,z:o.z,rIn:o.rIn||LAZY.rIn,rOut:o.rOut||LAZY.rOut,built:false,group:null,owned:[],npcs:[],
    builds:0,disposes:0,o};
  LAZY.zones.push(Z);return Z;}
function lazyOwn(Z,x){if(x)Z.owned.push(x);return x;}
function lazyNpc(Z,h){if(h)Z.npcs.push(h);return h;}
function lazyBuild(Z){
  if(Z.built)return;
  Z.group=new THREE.Group();scene.add(Z.group);// kein .name setzen: im three-stub ist name schreibgeschützt
  Z.built=true;Z.builds++;
  Z.o.build(Z);}
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
function updateLazy(){
  for(const Z of LAZY.zones){
    const d=minPlayerDist(Z.x,Z.z);
    if(!Z.built&&d<Z.rIn)lazyBuild(Z);
    else if(Z.built&&d>Z.rOut)lazyDispose(Z);}}
