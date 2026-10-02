// ===================== 31 Revierkämpfe Meenz gegen Wissbaade =====================
// Stadtteile werden zu Revieren zweier fiktiver Banden: die „Rheinufer-Rabauke" (Mainz, rot-weiß, Spieler-Bande)
// und das „Kochbrunne-Kommando" (Wiesbaden, blau-gelb). AKK (Amöneburg, Kastel, Kostheim) startet umkämpft.
// Im fremden Revier KILLS Kommando-Leute umlegen → Revierkampf (Wellen + Zeitlimit) → Sieg dreht das Revier.
// Das Kommando greift ab und zu eigene Reviere an. Eigene Reviere zahlen regelmäßig Einnahmen.
const REVIER={zones:[],gangs:{},war:null,income:0,
  members:[],grid:null,gw:0,gh:0,overlay:null,dirty:true,flash:false,cur:0,
  attackT:0,incomeT:0,spawnT:0,zoneT:0,hudT:0,last:null,paid:0,draws:0,miniDraws:0,mapDraws:0,
  akk:{i:0,count:0,last:'',lastT:-99,lastZone:0,reply:null,replyT:0},
  CELL:LOWMEM?96:64,KILLS:3,WAVES:LOWMEM?[2,3,3]:[3,4,5],WAR_T:150,WAR_FAR:400,PAUSE:2.5,REWARD:500,DEFEND_REWARD:250,
  INCOME_T:60,PER_ZONE:5,ATTACK_MIN:240,ATTACK_MAX:420,ATTACK_RANGE:500,AMBIENT:LOWMEM?3:6,SPAWN_T:1.5};

const REVIER_AKK=/Amöneburg|Kastel|Kostheim/;
// Running Gag: wem gehört AKK? Meenzerisch (mz) gegen Hessisch (wi), Paare abwechselnd eröffnet
const REVIER_AKK_LINES={
  mz:['AKK is Meenz, Punkt! Steht doch uff em Ortsschild: Mainz-Kastel!','Mir hole uns AKK zurück – spätestens an Fassenacht. Helau!',
    'Die Postleitzahl is Wissbaade, awwer es Herz schlägt rot-weiß!','Kostheim is unser Vorgaade uff de annern Rheinseit, gell?'],
  wi:['Ei Gude! Des is Wissbaade seit 1945, des wisse sogar die Ente im Rhoi.','Do kannste Helau rufe, bis de heiser bist – Hesse bleibt Hesse.',
    'Mainz-Kastel? Des „Mainz" is nur Deko, mei Gudster.','Amöneburg? Do wisse nedd emol die Amöneburger, wem se gehörn.']};
const REVIER_GREET=['Ei gude, Rabauke!','Alles im Griff bei uns, Chef.','Hier is rot-weiß, do traut sich kaaner her.','Bleib wachsam, des Kommando schnüffelt rum.'];

function revierZoneAt(x,z){if(!REVIER.grid)return null;const C=REVIER.CELL;const i=Math.floor((x-MINX)/C),j=Math.floor((z-MINZ)/C);
  if(i<0||j<0||i>=REVIER.gw||j>=REVIER.gh)return null;return REVIER.zones[REVIER.grid[j*REVIER.gw+i]-1]||null;}
function revierZone(id){return REVIER.zones[id-1]||null;}
function revierOwnedCount(){let n=0;for(const z of REVIER.zones)if(z.owner==='mz')n++;return n;}
function revierDefaultOwner(z){return z.akk?null:z.side==='MZ'?'mz':'wi';}

// Nur Stadtgebiet: Mainzer Kern oder nahe an einem Stadtteil-Mittelpunkt, kein Wasser
function revierInCity(x,z){if(x>-1300&&x<1300&&z>-1550&&z<1050)return true;for(const p of PLACES)if(Math.abs(p.x-x)<1400&&Math.abs(p.z-z)<1400&&Math.hypot(p.x-x,p.z-z)<1400)return true;return false;}
function revierBuild(){const C=REVIER.CELL,gw=Math.ceil(WW/C),gh=Math.ceil(WH/C);const tmp=new Int16Array(gw*gh).fill(-1);const names=[],byName=new Map(),count=[];
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){const x=MINX+(i+0.5)*C,z=MINZ+(j+0.5)*C;const k=idx(x,z);if(k<0||(mfG(k)&4)||!revierInCity(x,z))continue;
    const n=districtAt(x,z);let ni=byName.get(n);if(ni===undefined){ni=names.length;byName.set(n,ni);names.push(n);count.push(0);}tmp[j*gw+i]=ni;count[ni]++;}
  const idOf=names.map(()=>0);const zones=[];
  names.forEach((n,ni)=>{if(count[ni]<6||zones.length>=250)return;zones.push({id:zones.length+1,name:n,owner:null,contested:false,side:'MZ',akk:REVIER_AKK.test(n),cells:[],cx:0,cz:0,kills:0});idOf[ni]=zones.length;});
  const grid=new Uint8Array(gw*gh);
  for(let c=0;c<tmp.length;c++){if(tmp[c]<0)continue;const id=idOf[tmp[c]];if(!id)continue;grid[c]=id;const Z=zones[id-1];Z.cells.push(c);Z.cx+=MINX+(c%gw+0.5)*C;Z.cz+=MINZ+(Math.floor(c/gw)+0.5)*C;}
  for(const Z of zones){Z.cx/=Z.cells.length;Z.cz/=Z.cells.length;Z.side=rhineSide(Z.cx,Z.cz)>0?'WI':'MZ';Z.owner=revierDefaultOwner(Z);Z.contested=Z.owner===null;}
  REVIER.grid=grid;REVIER.gw=gw;REVIER.gh=gh;REVIER.zones=zones;}

// Begehbarer Punkt im Revier, möglichst nah an (nx,nz)
function revierSpot(zone,nx,nz){const C=REVIER.CELL,gw=REVIER.gw;let best=zone.cells[0],bd=1e18;
  for(const c of zone.cells){const x=MINX+(c%gw+0.5)*C,z=MINZ+(Math.floor(c/gw)+0.5)*C;const d=(x-nx)**2+(z-nz)**2;if(d<bd){bd=d;best=c;}}
  return freeSpot(MINX+(best%gw+0.5)*C,MINZ+(Math.floor(best/gw)+0.5)*C,0.5);}

// --- Kartenüberlagerung: ein Pixel je Zelle, Randzellen kräftiger, umkämpfte Zonen gestreift ---
const REVIER_RGB={mz:[214,32,46],wi:[47,99,200]};
function revierRender(){if(!REVIER.grid)return;const {gw,gh,grid}=REVIER;let c=REVIER.overlay;
  if(!c){c=document.createElement('canvas');c.width=gw;c.height=gh;REVIER.overlay=c;}
  const g=c.getContext('2d');const img=g.createImageData(gw,gh);const D=img.data;const war=REVIER.war?REVIER.war.zone:0;
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){const k=j*gw+i;const id=grid[k];if(!id)continue;const Z=REVIER.zones[id-1];
    const edge=i===0||j===0||i===gw-1||j===gh-1||grid[k-1]!==id||grid[k+1]!==id||grid[k-gw]!==id||grid[k+gw]!==id;
    const rgb=Z.owner?REVIER_RGB[Z.owner]:REVIER_RGB[((i+j)>>1)%2?'mz':'wi'];let a=edge?150:88;if(id===war)a=REVIER.flash?190:40;
    const o=k*4;D[o]=rgb[0];D[o+1]=rgb[1];D[o+2]=rgb[2];D[o+3]=a;}
  g.putImageData(img,0,0);REVIER.dirty=false;}

// Die Overlay-Zellen sollen unter Blips und Beschriftungen liegen: deshalb direkt nach dem Zeichnen von OVERVIEW
// einhängen, statt die gemeinsamen Zeichenfunktionen zu ändern (Kontext-eigene drawImage-Eigenschaft).
function revierHookCtx(ctx){if(!ctx||ctx.revierHooked)return;ctx.revierHooked=true;const base=ctx.drawImage;
  ctx.drawImage=function(img,...a){base.apply(this,[img,...a]);if(img!==OVERVIEW||!REVIER.overlay||(a.length!==2&&a.length!==4))return;
    const f=a.length===4?a[2]/WW:OV_SC,C=REVIER.CELL;const sm=this.imageSmoothingEnabled;this.imageSmoothingEnabled=false;
    base.call(this,REVIER.overlay,a[0],a[1],REVIER.gw*C*f,REVIER.gh*C*f);this.imageSmoothingEnabled=sm;REVIER.draws++;};}

const _revierDrawMinimap=drawMinimap;
drawMinimap=function(P,canvas){if(REVIER.dirty)revierRender();revierHookCtx(canvas.getContext('2d'));_revierDrawMinimap(P,canvas);REVIER.miniDraws++;};
const _revierDrawBigMap=drawBigMap;
drawBigMap=function(){const c=$('mapc');if(REVIER.dirty)revierRender();revierHookCtx(c.getContext('2d'));_revierDrawBigMap();revierLegend(c);revierHud();REVIER.mapDraws++;};
function revierLegend(c){const g=c.getContext('2d');const dpr=Math.min(2,window.devicePixelRatio||1);g.setTransform(dpr,0,0,dpr,0,0);
  const n={mz:0,wi:0,x:0};for(const z of REVIER.zones)n[z.owner||'x']++;const rows=[['mz',REVIER.gangs.mz,n.mz],['wi',REVIER.gangs.wi,n.wi],['x',{name:'Umkämpft (AKK)'},n.x]];
  const W_=REVIER.war,warTxt=W_?`Revierkampf: ${W_.name} · Welle ${W_.wave}/${W_.waves} · ${Math.ceil(W_.timer)} s`:'';
  const w=Math.max(Math.max(...rows.map(r=>r[1].name.length+5))*7.6+60,warTxt.length*6.6+20),h=36+rows.length*22+(W_?22:0);
  // rechts oben: links liegt die Schnellreise-Liste über der Karte
  const x0=c.clientWidth-w-12,y0=12;g.fillStyle='rgba(10,14,18,0.8)';g.fillRect(x0,y0,w,h);g.textAlign='left';g.textBaseline='middle';
  g.font='800 15px "Bungee","Barlow Condensed",sans-serif';g.fillStyle='#fff';g.fillText('REVIERE',x0+10,y0+18);
  rows.forEach(([k,G_,cnt],i)=>{const y=y0+40+i*22;if(k==='x'){g.fillStyle=REVIER.gangs.mz.css;g.fillRect(x0+10,y-7,7,14);g.fillStyle=REVIER.gangs.wi.css;g.fillRect(x0+17,y-7,7,14);}
    else{g.fillStyle=G_.css;g.fillRect(x0+10,y-7,14,14);}g.font='600 14px "Barlow Condensed",sans-serif';g.fillStyle='#fff';g.fillText(G_.name+(k==='mz'?' (du)':''),x0+32,y);
    g.textAlign='right';g.fillText(String(cnt),x0+w-10,y);g.textAlign='left';});
  if(W_){g.fillStyle='#ffd23f';g.font='700 14px "Barlow Condensed",sans-serif';g.fillText(warTxt,x0+10,y0+40+rows.length*22);}}

const _revierBlipList=blipList;
blipList=function(forP){const out=_revierBlipList(forP);const W_=REVIER.war;if(W_&&W_.anchor)out.push({x:W_.anchor[0],z:W_.anchor[1],c:REVIER.gangs.wi.css,r:7,ring:true,edge:true});return out;};

// --- Bandenmitglieder: Kleidung der Bande (geteilte Materialien), Mütze + Gürtel in Akzentfarbe ---
function revierDress(h,G_){const M=G_.mat;const shirt=new Set([HGEO.torso,HGEO.arm,BODY.torsoF,BODY.armF,SG.shoulder]),pants=new Set([HGEO.pelvis,HGEO.leg,BODY.pelvisF,BODY.legF]);
  const hide=new Set([HGEO.hair,SG.hairLong,SG.bun,SG.pony,SG.curl,SG.beanie,SG.bobble,SG.capTop,SG.visor,SG.skirt,SG.backpack,SG.strap,SG.bag]);
  h.g.traverse(m=>{if(!m.geometry)return;if(shirt.has(m.geometry))m.material=M.shirt;else if(pants.has(m.geometry))m.material=M.pants;else if(hide.has(m.geometry))m.visible=false;});
  const cap=new THREE.Mesh(SG.capTop,M.accent);cap.material=M.accent;cap.position.set(0,0.83,-0.01);cap.scale.set(1,0.95,1);h.hips.add(cap);
  const vis=new THREE.Mesh(SG.visor,M.accent);vis.material=M.accent;vis.position.set(0,0.85,0.06);vis.rotation.y=Math.PI;h.hips.add(vis);
  const band=new THREE.Mesh(REVIER.bandGeo,M.accent);band.material=M.accent;band.rotation.x=Math.PI/2;band.position.set(0,0.86,0);h.hips.add(band);
  h.revCap=cap;h.revShirt=M.shirt;}
function revierSpawn(gid,x,z,war=false){let h=null;
  for(let t=0;t<6;t++){h=new Human('ped');if(h.age==='adult')break;if(t<5)h.remove();}
  h.kind='gang';h.state='gang';h.x=x;h.z=z;h.y=groundY(x,z);h.health=war?90:80;h.weaponG=war&&Math.random()<0.35?'smg':'pistol';h.shootT=mr(0.8,1.8);
  h.hostile=war;h.alert=war;h.boss=false;h.alive=true;h.home=[x,z];h.revGang=gid;h.revWar=war;h.mission=war;
  h.gun=new THREE.Mesh(WGEO[h.weaponG],WMAT[h.weaponG]);h.gun.position.set(0,-0.6,0.15);h.armR.add(h.gun);
  revierDress(h,REVIER.gangs[gid]);h.facing=Math.random()*TAU;h.sync();REVIER.members.push(h);return h;}

// Rabauke helfen im Kampf gegen das Kommando und begrüßen den Spieler; sie greifen den Spieler nie an
function revierFriendly(g,dt){let tgt=null,bd=32;
  for(const o of REVIER.members){if(o.revGang==='mz'||!o.alive||o.removed||(!o.hostile&&!o.revWar))continue;const d=Math.hypot(o.x-g.x,o.z-g.z);if(d<bd){bd=d;tgt=o;}}
  let mv=0;
  if(tgt){const dx=tgt.x-g.x,dz=tgt.z-g.z;g.aiming=true;if(bd>16)mv=moveHuman(g,dx,dz,3.6,dt);faceTo(g,dx,dz,dt,10);g.shootT-=dt;
    if(g.shootT<=0){g.shootT=mr(0.9,1.8);if(los(g.x,1.5,g.z,tgt.x,1.4,tgt.z)){tracer(g.x,g.y+1.4,g.z,tgt.x+mr(-0.4,0.4),tgt.y+1.2,tgt.z+mr(-0.4,0.4));sfxShot(g.x,g.z);
      if(Math.random()<0.4){tgt.hostile=true;if(tgt.health<=12)knockHuman(tgt,dx/bd*2,dz/bd*2,1.2,12,false);else tgt.health-=12;}}}}
  else{g.aiming=false;const hx=g.home[0]-g.x,hz=g.home[1]-g.z;if(Math.hypot(hx,hz)>3)mv=moveHuman(g,hx,hz,1.2,dt);
    const [px,pz]=ppos(P1);const d=Math.hypot(px-g.x,pz-g.z);if(d<12)faceTo(g,px-g.x,pz-g.z,dt,4);
    if(d<6&&!P1.car&&simTime>(g.revGreetT||0)){g.revGreetT=simTime+40;say(g,mpick(REVIER_GREET),2.8);}}
  g.animate(dt,mv);g.y=groundY(g.x,g.z,g.y);g.sync();}
const _revierUpdateGang=updateGang;
updateGang=function(g,dt){if(!g.revGang||g.state!=='gang'){_revierUpdateGang(g,dt);return;}
  if(g.alive&&g.health<=0){knockHuman(g,0,0,1,0,false);return;}
  if(g.revGang==='mz'){revierFriendly(g,dt);return;}
  if(g.revWar)g.hostile=true;_revierUpdateGang(g,dt);};

// Bandenkrieg ist kein Fall für die Polizei: kein Stern für umgelegte Kommando-Leute, Geld fällt trotzdem
const _revierOnHumanKilled=onHumanKilled;
onHumanKilled=function(h,byPlayer){if(!h.revGang||h.revGang==='mz'||!byPlayer){_revierOnHumanKilled(h,byPlayer);return;}
  _revierOnHumanKilled(h,false);if(Math.random()<0.7)addPickup('money',h.x+mr(-0.5,0.5),h.z+mr(-0.5,0.5),{raw:true,temp:true,amount:20+(Math.random()*120|0)});
  for(const o of HUMANS)if(o.revGang&&o.revGang!=='mz'&&o.alive&&Math.hypot(o.x-h.x,o.z-h.z)<60)o.hostile=true;};

function revierOnDeath(m){if(m.revWar||m.revGang==='mz'||REVIER.war||activeMission)return;const z=revierZoneAt(m.x,m.z);if(!z||z.owner==='mz')return;
  z.kills++;if(z.kills>=REVIER.KILLS)revierStartWar(z,'attack');else hint(`<b>${z.kills}/${REVIER.KILLS}</b> vom ${REVIER.gangs.wi.name} umgelegt – noch ${REVIER.KILLS-z.kills}, dann geht de Revierkampf los.`,3);}

// --- Revierkampf ---
function revierStartWar(zone,kind='attack'){if(!zone||REVIER.war)return null;const [px,pz]=ppos(P1);const inZone=revierZoneAt(px,pz)===zone;
  const anchor=inZone?[px,pz]:revierSpot(zone,px,pz);
  REVIER.war={zone:zone.id,name:zone.name,kind,wave:0,waves:REVIER.WAVES.length,timer:REVIER.WAR_T,pause:1.5,attackers:[],anchor,far:0};
  REVIER.dirty=true;REVIER.flash=true;
  if(kind==='attack')showBig('REVIERKAMPF','',3,`${zone.name} · ${REVIER.WAVES.length} Welle vom ${REVIER.gangs.wi.name}`);
  else showBig('REVIER IN GEFAHR','dead',3.5,`Des ${REVIER.gangs.wi.name} greift ${zone.name} an – verteidig dei Revier!`);
  chime([392,330,392]);revierHud();return REVIER.war;}
function revierSpawnWave(W_){const n=REVIER.WAVES[W_.wave];W_.wave++;const [px,pz]=ppos(P1);const z=revierZone(W_.zone);
  const c=revierZoneAt(px,pz)===z?[px,pz]:W_.anchor;W_.attackers=[];
  for(let i=0;i<n;i++){const a=Math.random()*TAU,d=mr(28,48);const [x,zz]=freeSpot(c[0]+Math.cos(a)*d,c[1]+Math.sin(a)*d,0.5);W_.attackers.push(revierSpawn('wi',x,zz,true));}
  hint(`Welle <b>${W_.wave}/${W_.waves}</b>: ${n} vom ${REVIER.gangs.wi.name} kumme!`,2.5);}
function revierEndWar(won,silent=false){const W_=REVIER.war;if(!W_)return;REVIER.war=null;const z=revierZone(W_.zone);
  for(const a of W_.attackers){a.mission=false;a.revWar=false;}z.kills=0;
  if(!silent){
    if(won){z.owner='mz';z.contested=false;const r=W_.kind==='attack'?REVIER.REWARD:REVIER.DEFEND_REWARD;G.money+=r;chime([523,659,784,1047]);
      showBig(W_.kind==='attack'?'REVIER EROBERT':'REVIER GEHALTE','win',3.5,`${z.name} gehört de ${REVIER.gangs.mz.name} · + €${r}`);
      for(const m of REVIER.members)if(m.revGang==='mz'&&m.alive&&Math.hypot(m.x-W_.anchor[0],m.z-W_.anchor[1])<80){say(m,mpick(['Revier is unser!','Des war’s, Kommando – ab hääm!','Rot-weiß bis in die Knoche!']),3);break;}}
    else{if(W_.kind==='defend'){z.owner='wi';z.contested=false;}
      showBig(W_.kind==='attack'?'REVIERKAMPF VERLORE':'REVIER VERLORE','dead',3.5,W_.kind==='attack'?`Des ${REVIER.gangs.wi.name} hält ${z.name}.`:`${z.name} is jetzt Wissbaadener Gebiet.`);}}
  REVIER.last={zone:z.id,kind:W_.kind,won};REVIER.income=revierOwnedCount()*REVIER.PER_ZONE;REVIER.dirty=true;revierHud();}
function revierUpdateWar(dt){const W_=REVIER.war;W_.timer-=dt;
  if(P1.gameOver){revierEndWar(false);return;}
  if(W_.timer<=0){revierEndWar(false);return;}
  const [px,pz]=ppos(P1);W_.far=Math.hypot(px-W_.anchor[0],pz-W_.anchor[1])>REVIER.WAR_FAR&&W_.kind==='attack'?W_.far+dt:0;
  if(W_.far>10){hint('Abgehaue? Dann is de Revierkampf verlore.',2.5);revierEndWar(false);return;}
  if(W_.attackers.some(a=>a.alive&&!a.removed))return;
  if(W_.wave>=W_.waves){revierEndWar(true);return;}
  W_.pause-=dt;if(W_.pause<=0){W_.pause=REVIER.PAUSE;revierSpawnWave(W_);}}

// Das Kommando greift ein eigenes Revier in Spielernähe an
function revierTryAttack(){if(REVIER.war||activeMission||!P1.h||P1.h.room||P1.gameOver)return null;const [px,pz]=ppos(P1);
  let zone=revierZoneAt(px,pz);if(!zone||zone.owner!=='mz'){zone=null;let bd=REVIER.ATTACK_RANGE**2;const C=REVIER.CELL,gw=REVIER.gw;
    for(const z of REVIER.zones){if(z.owner!=='mz')continue;for(const c of z.cells){const d=(MINX+(c%gw+0.5)*C-px)**2+(MINZ+(Math.floor(c/gw)+0.5)*C-pz)**2;if(d<bd){bd=d;zone=z;}}}}
  return zone?revierStartWar(zone,'defend'):null;}

// --- Umgebung: Bandenmitglieder im aktuellen Umfeld, Farbe nach Revierbesitzer ---
function revierAmbient(){const [px,pz]=ppos(P1);let n=0;for(const m of REVIER.members)if(m.alive&&!m.removed&&!m.revWar&&Math.hypot(m.x-px,m.z-pz)<220)n++;
  if(n>=REVIER.AMBIENT||HUMANS.length>Q.peds+25)return;const a=Math.random()*TAU,d=mr(45,110);const x=px+Math.cos(a)*d,z=pz+Math.sin(a)*d;
  const zone=revierZoneAt(x,z);if(!zone)return;const k=idx(x,z);if(k<0||(mfG(k)&4))return;const gid=zone.owner||(Math.random()<0.5?'mz':'wi');
  const [sx,sz]=freeSpot(x,z,0.5);if(revierZoneAt(sx,sz)!==zone)return;
  for(let i=0;i<Math.min(3,REVIER.AMBIENT-n);i++){const [fx,fz]=i?freeSpot(sx+mr(-2.5,2.5),sz+mr(-2.5,2.5),0.4):[sx,sz];revierSpawn(gid,fx,fz);}}

// --- AKK: wer hier wohnt, streitet sich, wem er gehört ---
function revierSpeaker(side,x,z){let best=null,bd=35;
  for(const h of HUMANS){if(!h.alive||h.inCar||h.removed||h.kind==='cop'||playerOfHuman(h)||h.room)continue;const d=Math.hypot(h.x-x,h.z-z);const w=d-(h.revGang===side?15:0);if(w<bd){bd=w;best=h;}}return best;}
function revierAkkLine(side,k){const t=REVIER_AKK_LINES[side][k%REVIER_AKK_LINES[side].length];const A=REVIER.akk;A.last=t;A.count++;A.lastT=simTime;
  const [px,pz]=ppos(P1);const h=revierSpeaker(side,px,pz);if(h)say(h,t,4);hint(`<b>${side==='mz'?'Meenzer':'Wissbaadener'}:</b> „${t}"`,4);}
function revierAkk(zone){const A=REVIER.akk;if(A.lastZone===zone.id&&simTime-A.lastT<30)return;A.lastZone=zone.id;
  const first=A.i%2?'wi':'mz',k=A.i;A.i++;revierAkkLine(first,k);A.reply={side:first==='mz'?'wi':'mz',k};A.replyT=4.2;}

function revierOnZoneChange(z){if(!z||REVIER.war)return;if(z.akk){revierAkk(z);return;}
  if(z.owner!=='mz')hint(`Revier vom <b style="color:${REVIER.gangs.wi.css}">${REVIER.gangs.wi.name}</b> · Leg ${REVIER.KILLS} von dene um, dann geht de Revierkampf los.`,4);}

// --- HUD: Revierkampf-Anzeige oben ---
function revierHud(){const el=REVIER.hud;if(!el)return;const W_=REVIER.war;if(!W_||mode!=='play'){el.hidden=true;return;}el.hidden=false;
  const t=Math.max(0,Math.ceil(W_.timer));const left=W_.attackers.filter(a=>a.alive&&!a.removed).length;
  el.innerHTML=`<b>${W_.kind==='attack'?'REVIERKAMPF':'VERTEIDIGUNG'}</b> · ${W_.name} · Welle ${W_.wave}/${W_.waves}${left?` · noch ${left}`:''} · ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;}

// --- Spielstand ---
const _revierSnapshot=snapshot;
snapshot=function(){const d=_revierSnapshot();const own={};for(const z of REVIER.zones)own[z.name]=z.owner;d.revier={own};return d;};
const _revierApplySave=applySave;
applySave=function(d){if(REVIER.war)revierEndWar(false,true);const r=_revierApplySave(d);if(!r)return r;const own=d.revier&&d.revier.own||{};
  for(const z of REVIER.zones){z.owner=Object.prototype.hasOwnProperty.call(own,z.name)&&(own[z.name]===null||REVIER.gangs[own[z.name]])?own[z.name]:revierDefaultOwner(z);z.contested=z.owner===null;z.kills=0;}
  REVIER.income=revierOwnedCount()*REVIER.PER_ZONE;REVIER.dirty=true;return r;};

function setupRevier(){
  REVIER.gangs.mz={id:'mz',name:'Rheinufer-Rabauke',css:'#d6202e',shirt:0xc8102e,pants:0x2a2a30,accent:0xf4f4f0,top:'stripes'};
  REVIER.gangs.wi={id:'wi',name:'Kochbrunne-Kommando',css:'#2f63c8',shirt:0x1f4fa8,pants:0x1e2430,accent:0xf2c230,top:'jacket'};
  for(const G_ of Object.values(REVIER.gangs))G_.mat={shirt:clothMat(G_.shirt,G_.top),pants:clothMat(G_.pants,'denim',0.92),accent:cmat(G_.accent,0.7)};
  REVIER.bandGeo=new THREE.TorusGeometry(0.13,0.025,6,16);
  const t0=performance.now();revierBuild();REVIER.buildMs=performance.now()-t0;revierRender();REVIER.income=revierOwnedCount()*REVIER.PER_ZONE;REVIER.incomeT=REVIER.INCOME_T;REVIER.attackT=mr(REVIER.ATTACK_MIN,REVIER.ATTACK_MAX);
  const el=document.createElement('div');el.id='revier-hud';el.hidden=true;
  el.style.cssText='position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:30;padding:6px 14px;border-radius:6px;background:rgba(10,14,18,0.78);color:#fff;font:600 16px "Barlow Condensed",sans-serif;letter-spacing:.3px;border-left:4px solid #d6202e;pointer-events:none;white-space:nowrap';
  document.body.appendChild(el);REVIER.hud=el;
  Object.assign(REVIER,{zoneAt:revierZoneAt,zone:revierZone,spot:revierSpot,spawn:revierSpawn,startWar:(id,kind)=>revierStartWar(revierZone(id),kind),endWar:revierEndWar,tryAttack:revierTryAttack,render:revierRender});}

function updateRevier(dt){if(!REVIER.grid||!P1||!P1.h)return;
  for(let i=REVIER.members.length-1;i>=0;i--){const m=REVIER.members[i];if(m.removed){REVIER.members.splice(i,1);continue;}if(!m.alive&&!m.revDead){m.revDead=true;revierOnDeath(m);}}
  if(REVIER.war)revierUpdateWar(dt);
  REVIER.incomeT-=dt;if(REVIER.incomeT<=0){REVIER.incomeT=REVIER.INCOME_T;const n=revierOwnedCount();const amt=n*REVIER.PER_ZONE;REVIER.income=amt;
    if(amt>0){G.money+=amt;REVIER.paid+=amt;hint(`Revier-Einnahmen: <b>+ €${amt}</b> aus ${n} Gebiete`,2.5);}}
  REVIER.attackT-=dt;if(REVIER.attackT<=0){REVIER.attackT=mr(REVIER.ATTACK_MIN,REVIER.ATTACK_MAX);revierTryAttack();}
  const A=REVIER.akk;if(A.reply){A.replyT-=dt;if(A.replyT<=0){const r=A.reply;A.reply=null;revierAkkLine(r.side,r.k);}}
  REVIER.zoneT-=dt;if(REVIER.zoneT<=0){REVIER.zoneT=0.5;if(!P1.h.room){const [px,pz]=ppos(P1);const z=revierZoneAt(px,pz);const id=z?z.id:0;if(id!==REVIER.cur){REVIER.cur=id;revierOnZoneChange(z);}}}
  REVIER.spawnT-=dt;if(REVIER.spawnT<=0){REVIER.spawnT=REVIER.SPAWN_T;if(!REVIER.war&&!P1.h.room&&!activeMission)revierAmbient();}
  REVIER.hudT-=dt;if(REVIER.hudT<=0){REVIER.hudT=0.25;if(REVIER.war){const f=((simTime*2)|0)%2===0;if(f!==REVIER.flash){REVIER.flash=f;REVIER.dirty=true;}}revierHud();}}
