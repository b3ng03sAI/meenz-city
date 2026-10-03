// ===================== MEENZER LEIHRAD (Fahrradverleih an ~35 Stationen in Mainz und Wiesbaden) =====================
// Stationen (Bügel + Säule mit Schild) stehen ab dem Boot, Räder gibt es nur in Spielernähe: unter rIn (250 m) legt eine
// Station 2–4 Räder in ihre Bügel, über rOut (400 m) verschwinden sie wieder. Abgestellte Räder sind KEINE Autos, sondern
// Instanzen EINES gemeinsamen InstancedMesh – sie zählen also weder gegen das Parkplatz-Budget noch kosten sie je Rad
// eigene Materialien/Texturen. Draw-Calls: 1 je sichtbarer Station (unter rShow) + 1 für alle Räder. Erst beim Ausleihen (E/AKTION oder F/EIN-AUS,
// 1 €) wird an derselben Stelle ein echtes CAR_TYPES.fahrrad erzeugt; damit gelten Fahrradführerschein, Stern und
// „Kek“-Polizist aus p5c_rad.js unverändert. Zurückgestellt an einer Station (Absteigen < 10 m) kommt es in den Bügel,
// liegengelassene Leihräder werden über rOut aufgeräumt.
// Zufall: nur eigener Strom (mulberry32), nie das globale Math.random – auch nicht im Car-Konstruktor.
const LEIH={stations:[],rented:[],rIn:250,rOut:400,rShow:320,reach:2.6,price:1,slots:4,
  COL:0xc8102e,cap:LOWMEM?32:48,inst:null,dirty:false,t:0,playT:0,rides:0,returns:0,cleaned:0,broke:0,
  hint:{shown:0,text:'',t:-1},mini:{draws:0,icons:0,hi:-1},big:{draws:0,icons:0,hi:-1},rng:null,api:null};
LEIH.rng=mulberry32(lazySeed('leihrad'));

// Wunschorte; die Station selbst sucht sich daneben einen freien Platz neben der Straße. OSM liefert in den Spieldaten
// keine amenity=bicycle_rental/bicycle_parking, daher eine eigene Liste (Bahnhöfe, Uni, Rheinufer, Stadtteilzentren).
const LEIH_SPOTS=[
  ['Gutenbergplatz',()=>POI.start],['Hauptbahnhof',()=>[POI.hbf[0]+30,POI.hbf[1]+25]],['Rheinufer am Rathaus',()=>POI.rathaus],
  ['Holzturm',()=>POI.holzturm],['Winterhafen',()=>POI.winterhafen],['Zollhafen',()=>POI.zollhafen],['Kurfürstliches Schloss',()=>POI.schloss],
  ['Christuskirche',()=>POI.christus],['Gartenfeldplatz',()=>[-1145,-800]],['Schillerplatz',()=>POI.fastnacht],['Kupferberg',()=>POI.kupferberg],
  ['Zitadelle',()=>POI.zitadelle],['Römisches Theater',()=>POI.rtheater],['St. Stephan',()=>POI.stephan],['Universität',()=>[-2430,760]],
  ['Uniklinik',()=>POI.klinik],['Volkspark',()=>[-644,1657]],['Weisenau',()=>[1874,2131]],['Bretzenheim',()=>[-2280,2050]],
  ['Gonsenheim',()=>[-4200,-726]],['Mombach',()=>[-3539,-2144]],['Hartenberg-Münchfeld',()=>[-2550,-473]],['Oberstadt',()=>[146,1075]],
  ['Kastel Brückenkopf',()=>POI.reduit],['Kostheim',()=>[2137,-711]],['Amöneburg',()=>[-1165,-3704]],['Biebricher Schloss',()=>[-2790,-4303]],
  ['Wiesbaden Hbf',()=>[-2175,-7951]],['Wiesbaden Innenstadt',()=>[-2239,-9205]],['Kurhaus',()=>[-1874,-9663]],['Westend',()=>[-3365,-9232]],
  ['Dichterviertel',()=>[-2559,-8172]],['Schierstein',()=>[-5585,-5099]],['Bierstadt',()=>[257,-9651]],['Erbenheim',()=>[1625,-6363]],
  ['Wiesbaden-Südost',()=>[-1175,-7406]],['Neustadt',()=>[-1000,-1215]],['Bleichenviertel',()=>[-636,-470]]];
const LEIH_MIN_GAP=180;

// ---------- Platzsuche (deterministisch, ohne Zufall) ----------
function leihLand(x,z){const i=idx(x,z);return i>=0&&!(mfG(i)&6)&&!blocked(x,z);}
// Blickrichtung zur nächsten Fahrbahn (MFLAG-Bit 2) innerhalb von 14 m, sonst null
function leihRoadDir(x,z){for(let r=2;r<=14;r+=2)for(let k=0;k<16;k++){const a=k/16*TAU,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;const i=idx(px,pz);if(i>=0&&(mfG(i)&2))return a;}return null;}
function leihFits(x,z,f){const tx=Math.cos(f),tz=-Math.sin(f),nx=Math.sin(f),nz=Math.cos(f);
  for(const a of [-2.4,-1.2,0,1.2,2.4])for(const b of [-0.8,0,0.8])if(!leihLand(x+tx*a+nx*b,z+tz*a+nz*b))return false;return true;}
function leihSpotNear(x,z,maxR){for(let r=0;r<=maxR;r+=2){const n=r?Math.max(8,Math.round(r*TAU/3)):1;
  for(let k=0;k<n;k++){const a=k/n*TAU,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;if(!leihLand(px,pz))continue;const f=leihRoadDir(px,pz);
    if(f===null||!leihFits(px,pz,f))continue;return [px,pz,f];}}return null;}
// Stationen berechnen (ohne Meshes): [{name,x,z,f}]
function leihPlace(){const out=[];const st=POI.start;
  for(const [name,fn] of LEIH_SPOTS){const p=fn();if(!p)continue;let s;
    if(name==='Gutenbergplatz'){s=leihSpotNear(st[0]+9,st[1]+4,14);if(s&&Math.hypot(s[0]-st[0],s[1]-st[1])>25)s=null;}
    else s=leihSpotNear(p[0],p[1],60);
    if(!s||out.some(o=>Math.hypot(o.x-s[0],o.z-s[1])<LEIH_MIN_GAP))continue;out.push({name,x:s[0],z:s[1],f:s[2]});}
  return out;}

// ---------- Geometrie (einmal, geteilt) ----------
function leihCol(hex){return {r:(hex>>16&255)/255,g:(hex>>8&255)/255,b:(hex&255)/255};}
function leihSlotX(k){return (k-(LEIH.slots-1)/2)*1.0;}
// fertige Geometrie (Rahmen/Anbauteile aus carGeo) an einen GB anhängen; col ersetzt die Vertex-Farben.
// Im three-stub gibt es keine echten Arrays: dann bleibt der Teil weg (der Stub zeichnet ohnehin nichts).
function leihAppend(gb,geo,col){const pa=geo&&geo.getAttribute&&geo.getAttribute('position');if(!pa||!ArrayBuffer.isView(pa.array))return;
  const na=geo.getAttribute('normal'),ca=geo.getAttribute('color'),n=pa.count,base=gb.p.length/3;
  for(let k=0;k<n;k++){gb.p.push(pa.array[k*3],pa.array[k*3+1],pa.array[k*3+2]);gb.n.push(na.array[k*3],na.array[k*3+1],na.array[k*3+2]);gb.u.push(0,0);
    if(col)gb.c.push(col.r,col.g,col.b);else gb.c.push(ca.array[k*3],ca.array[k*3+1],ca.array[k*3+2]);}
  if(geo.index)for(const v of geo.index.array)gb.i.push(v+base);else for(let k=0;k<n;k++)gb.i.push(base+k);}
// Schild-Textur: oben das Schild (v 0.3125…1), unten eine weiße Fläche, auf die die UVs der Station zeigen –
// so färben die Vertex-Farben Sockel, Bügel und Säule, und die ganze Station ist EIN Mesh mit EINEM Material.
const LEIH_SIGN_V0=80/256,LEIH_WHITE_UV=[0.5,0.12];
function leihGeos(){if(LEIH.geo)return LEIH.geo;const steel=leihCol(0x9aa0a6),red=leihCol(LEIH.COL),dark=leihCol(0x2b2d30),white=leihCol(0xf4f4f0);
  // Station: Sockel, Bügel je Platz (parallel zum Rad), Säule mit Kopf und Schild
  const s=new GB();s.box(0,0,0,LEIH.slots*1.0+0.6,0.06,1.5,0,dark,2);
  for(let k=0;k<LEIH.slots;k++){const x=leihSlotX(k)+0.34;s.beam([x,0,-0.4],[x,0.78,-0.4],0.05,0.05,steel);s.beam([x,0,0.4],[x,0.78,0.4],0.05,0.05,steel);s.beam([x,0.78,-0.43],[x,0.78,0.43],0.05,0.05,steel);}
  const px=LEIH.slots*0.5+0.55;s.box(px,0,-0.2,0.16,2.3,0.16,0,red,2);s.box(px,2.3,-0.2,0.24,0.08,0.24,0,white,2);s.box(px,0.9,-0.08,0.22,0.36,0.1,0,dark,2);
  for(let k=0;k<s.u.length;k+=2){s.u[k]=LEIH_WHITE_UV[0];s.u[k+1]=LEIH_WHITE_UV[1];}
  const sw=0.9,sh=0.62,sy=1.55,sz=-0.2,o=0.09,v0=LEIH_SIGN_V0;
  s.quad([px-sw/2,sy,sz+o],[px+sw/2,sy,sz+o],[px+sw/2,sy+sh,sz+o],[px-sw/2,sy+sh,sz+o],[0,v0],[1,v0],[1,1],[0,1]);
  s.quad([px+sw/2,sy,sz-o],[px-sw/2,sy,sz-o],[px-sw/2,sy+sh,sz-o],[px+sw/2,sy+sh,sz-o],[0,v0],[1,v0],[1,1],[0,1]);
  // abgestelltes Rad: Rahmen (rot) + Anbauteile aus carGeo('fahrrad'), Speichenräder in der Lage von p5c_rad
  const T=CAR_TYPES.fahrrad,wr=T.wr,hw=T.wb/2,R=wr-0.03,seg=QS.lowLOD?10:16,w=new GB();const tire=leihCol(0x151515),rim=leihCol(0xb9bec4);
  for(const wz of [-hw,hw]){for(let k=0;k<seg;k++){const a0=k/seg*TAU,a1=(k+1)/seg*TAU;w.beam([0,wr+Math.sin(a0)*R,wz+Math.cos(a0)*R],[0,wr+Math.sin(a1)*R,wz+Math.cos(a1)*R],0.05,0.06,tire);}
    for(let k=0;k<4;k++){const a=k/4*Math.PI;w.beam([0,wr-Math.sin(a)*(R-0.03),wz-Math.cos(a)*(R-0.03)],[0,wr+Math.sin(a)*(R-0.03),wz+Math.cos(a)*(R-0.03)],0.008,0.008,rim);}
    w.beam([-0.05,wr,wz],[0.05,wr,wz],0.06,0.06,rim);}
  const cg=carGeo('fahrrad');leihAppend(w,cg.body,red);leihAppend(w,cg.det,null);
  LEIH.geo={station:s.geo(),bike:w.geo()};if(LOWMEM){dropCPU(LEIH.geo.station);dropCPU(LEIH.geo.bike);}return LEIH.geo;}
function leihSignTex(){const t=canvasTex(256,256,(g,W)=>{const H=176;g.fillStyle='#fff';g.fillRect(0,0,W,256);g.fillStyle='#c8102e';g.fillRect(0,0,W,H);g.fillStyle='#fff';g.fillRect(6,6,W-12,4);g.fillRect(6,H-10,W-12,4);
  // Rad-Piktogramm
  g.strokeStyle='#fff';g.lineWidth=7;g.lineCap='round';g.lineJoin='round';const cy=62;
  g.beginPath();g.arc(88,cy,24,0,TAU);g.stroke();g.beginPath();g.arc(168,cy,24,0,TAU);g.stroke();
  g.beginPath();g.moveTo(88,cy);g.lineTo(112,cy-30);g.lineTo(150,cy-30);g.lineTo(168,cy);g.moveTo(112,cy-30);g.lineTo(128,cy);g.lineTo(88,cy);g.moveTo(128,cy);g.lineTo(150,cy-30);g.moveTo(104,cy-42);g.lineTo(122,cy-42);g.moveTo(150,cy-30);g.lineTo(146,cy-44);g.lineTo(160,cy-46);g.stroke();
  g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='800 30px "Bungee","Barlow Condensed",sans-serif';g.fillText('MEENZER',W/2,116);
  g.font='700 30px "Barlow Condensed","Arial Narrow",sans-serif';g.fillText('LEIHRAD · 1 €',W/2,148);},false);
  return freeAfterUpload(t);}
function leihMats(){if(LEIH.mats)return LEIH.mats;
  LEIH.mats={station:stdMat({map:leihSignTex(),vertexColors:true,roughness:0.55,metalness:0.25})};return LEIH.mats;}

// ---------- Aufbau ----------
// Die Objekte selbst (Mesh/Geometrie/Material/Textur) ziehen in three.js UUIDs aus Math.random: beim Boot über einen eigenen
// Strom, sonst verschiebt die Station Aussehen und Verteilung von Spieler, Passanten und Bürgermeisterin (Startplatz-Budget).
function setupLeih(){const r=Math.random;Math.random=mulberry32(lazySeed('leihrad-setup'));try{leihBuild();}finally{Math.random=r;}}
function leihBuild(){const G=leihGeos(),M=leihMats();
  const b=new THREE.InstancedMesh(G.bike,DET_MAT,LEIH.cap);b.count=0;b.frustumCulled=false;b.castShadow=false;b.receiveShadow=true;scene.add(b);
  LEIH.inst={bikes:b,m4:new THREE.Matrix4()};
  LEIH.stations=leihPlace().map((p,i)=>{const y=groundY(p.x,p.z);const m=new THREE.Mesh(G.station,M.station);
    m.position.set(p.x,y,p.z);m.rotation.y=p.f;m.castShadow=false;m.receiveShadow=true;m.visible=false;scene.add(m);
    const tx=Math.cos(p.f),tz=-Math.sin(p.f);
    const slots=[];for(let k=0;k<LEIH.slots;k++){const sx=p.x+tx*leihSlotX(k),sz=p.z+tz*leihSlotX(k);slots.push({x:sx,z:sz,h:p.f,y:groundY(sx,sz)});}
    return {i,name:p.name,x:p.x,z:p.z,f:p.f,y,meshes:[m],slots,bikes:[],active:false,shown:false,spawns:0,despawns:0};});}

// ---------- Räder erscheinen/verschwinden ----------
function leihInstCount(){let n=0;for(const s of LEIH.stations)n+=s.bikes.length;return n;}
function leihSpawn(s){if(s.active)return 0;s.active=true;s.spawns++;const R=LEIH.rng;const want=2+Math.floor(R()*3);
  const order=[...Array(LEIH.slots).keys()];for(let k=order.length-1;k>0;k--){const j=Math.floor(R()*(k+1));[order[k],order[j]]=[order[j],order[k]];}
  const room=LEIH.cap-leihInstCount();s.bikes=order.slice(0,Math.max(0,Math.min(want,room))).sort((a,b)=>a-b);LEIH.dirty=true;return s.bikes.length;}
function leihDespawn(s){if(!s.active)return;s.active=false;s.despawns++;s.bikes=[];LEIH.dirty=true;}
function leihSyncInst(){const I=LEIH.inst;if(!I)return;const m4=I.m4,B=I.bikes;let n=0;
  for(const s of LEIH.stations)for(const k of s.bikes){const p=s.slots[k];m4.makeRotationY(p.h);m4.setPosition(p.x,p.y,p.z);B.setMatrixAt(n,m4);n++;}
  B.count=n;B.instanceMatrix.needsUpdate=true;
  LEIH.dirty=false;}

// nächstes abgestelltes Rad in Reichweite des Spielers (zu Fuß): {s,k,d} oder null
function leihNear(P,r=LEIH.reach){if(!P||!P.h||P.car||P.h.inCar)return null;const h=P.h;let best=null;
  for(const s of LEIH.stations){if(!s.bikes.length||Math.abs(s.x-h.x)>12||Math.abs(s.z-h.z)>12)continue;
    for(const k of s.bikes){const p=s.slots[k];const d=Math.hypot(p.x-h.x,p.z-h.z);if(d<r&&(!best||d<best.d))best={s,k,d};}}
  return best;}
// nächste Station mit Rädern bzw. überhaupt (für Karte und Hinweis)
function leihNearestStation(x,z,withBikes=false){let best=null,bd=1e9;for(const s of LEIH.stations){if(withBikes&&!s.bikes.length)continue;const d=Math.hypot(s.x-x,s.z-z);if(d<bd){bd=d;best=s;}}return best?{s:best,d:bd}:null;}

// ---------- Ausleihen ----------
function leihRent(P,n){if(!n)return false;
  if(G.money<LEIH.price){LEIH.broke++;hint('Kaa Euro in de Dasch? E <b>Leihrad</b> koscht en Euro.',2.5,P);return true;}
  const {s,k}=n,p=s.slots[k];s.bikes=s.bikes.filter(b=>b!==k);LEIH.dirty=true;
  const r=Math.random;Math.random=LEIH.rng;let c;
  try{c=new Car('fahrrad',p.x,p.z,p.h,{ctrl:'none',color:LEIH.COL,plate:'MZ-LR '+(100+s.i)});}finally{Math.random=r;}
  c.ai={mode:'parked'};c.persist=true;c.leih={st:s.i};c.sync();
  G.money-=LEIH.price;LEIH.rides++;LEIH.rented.push(c);enterCar(P,c);
  hint(`<b>Meenzer Leihrad</b> · E Leihrad für en Euro – gude Fahrt!${G.fahrradSchein?'':'<br>Ohne <b>Fahrradführerschein</b> – pass uff!'}`,4,P);chime([660,880]);
  return true;}
function leihAction(P){if(!P||P.gameOver||P.morph)return false;const n=leihNear(P);return n?leihRent(P,n):false;}
// F/EIN-AUS: nur übernehmen, wenn kein echtes Fahrzeug näher in Reichweite ist
const _leihTryEnterExit=tryEnterExit;
tryEnterExit=function(P){if(P&&!P.car&&!P.gameOver&&!P.morph&&P.h&&!P.h.inCar){const n=leihNear(P);
    if(n){let carD=1e9;for(const c of CARS){if(c.dead||c.burn>0||isPlayerCar(c))continue;const d=Math.hypot(c.x-P.h.x,c.z-P.h.z);if(d<Math.max(3.2,c.T.L/2+1.3)&&d<carD)carD=d;}
      if(n.d<=carD){leihRent(P,n);return;}}}
  _leihTryEnterExit(P);};
// E/AKTION (wie S-Bahn/Gautsch in der Capture-Phase, damit kein Gespräch mit dem Nachbarn startet)
addEventListener('keydown',e=>{if(e.code!=='KeyE'||e.repeat||mode!=='play'||TALK||SHOP_UI.open)return;if(leihAction(P1))e.stopImmediatePropagation();},true);
// Zurückstellen: Absteigen nahe einer Station mit freiem Bügel
const _leihExitCar=exitCar;
exitCar=function(P,force){const c=P&&P.car;_leihExitCar(P,force);if(!c||!c.leih||P.car===c||c.removed)return;
  c.persist=true;// liegengelassen: räumt updateLeih ab rOut auf (nicht managePopulation), zählt nie als geparktes Auto
  const near=!c.dead&&LEIH.stations.find(s=>s.active&&s.bikes.length<LEIH.slots&&Math.hypot(s.x-c.x,s.z-c.z)<10);if(!near)return;
  const free=[...Array(LEIH.slots).keys()].find(k=>!near.bikes.includes(k));near.bikes.push(free);near.bikes.sort((a,b)=>a-b);LEIH.dirty=true;
  c.remove();LEIH.returns++;hint('<b>Leihrad</b> zurückgebracht – merci!',2,P);};

// ---------- Hauptschleife ----------
function updateLeih(dt){if(!LEIH.inst)return;LEIH.playT+=dt;LEIH.t-=dt;
  if(LEIH.t<=0||(typeof FRAMEB!=='undefined'&&FRAMEB.jump)){LEIH.t=0.25;
    for(const s of LEIH.stations){const d=minPlayerDist(s.x,s.z);
      if(!s.active&&d<LEIH.rIn)leihSpawn(s);else if(s.active&&d>LEIH.rOut)leihDespawn(s);
      const v=d<LEIH.rShow;if(v!==s.shown){s.shown=v;for(const m of s.meshes)m.visible=v;}}
    for(let i=LEIH.rented.length-1;i>=0;i--){const c=LEIH.rented[i];if(c.removed){LEIH.rented.splice(i,1);continue;}
      if(!isPlayerCar(c)&&minPlayerDist(c.x,c.z)>LEIH.rOut){c.remove();LEIH.rented.splice(i,1);LEIH.cleaned++;}}}
  if(LEIH.dirty)leihSyncInst();
  leihHintTick();}

// ---------- einmaliger Hinweis nach der Einleitung ----------
const LEIH_HINT='Do vorne steht e Leihrad – <b>E</b> drücke unn losfahre!';
function leihHintTick(){const H=LEIH.hint;if(H.shown||mode!=='play'||!P1||!P1.h||P1.car||P1.h.inCar||TALK||SHOP_UI.open)return;
  if(INTRO.active)return;if(INTRO.done?simTime<(INTRO.endT||0)+5.5:LEIH.playT<14)return;if(hintT>0)return;
  const n=leihNearestStation(P1.h.x,P1.h.z,true);if(!n||n.d>60)return;
  hint(LEIH_HINT,7);H.shown=1;H.t=simTime;H.text=$('hint').innerHTML;}

// ---------- Minimap + große Karte ----------
function leihIcon(g,x,y,r,hi){g.save();g.translate(x,y);
  if(hi){g.fillStyle='#ffd23f';g.beginPath();g.arc(0,0,r+3.5,0,TAU);g.fill();}
  g.fillStyle='#c8102e';g.strokeStyle='#111';g.lineWidth=1.2;g.beginPath();g.rect(-r,-r,r*2,r*2);g.fill();g.stroke();
  g.strokeStyle='#fff';g.lineWidth=Math.max(1,r*0.22);const w=r*0.42;
  g.beginPath();g.arc(-w,r*0.22,r*0.36,0,TAU);g.stroke();g.beginPath();g.arc(w,r*0.22,r*0.36,0,TAU);g.stroke();
  g.beginPath();g.moveTo(-w,r*0.22);g.lineTo(-w*0.2,-r*0.45);g.lineTo(w*0.7,-r*0.45);g.lineTo(w,r*0.22);g.stroke();g.restore();}
const _leihDrawMinimap=drawMinimap;
drawMinimap=function(P,canvas){_leihDrawMinimap(P,canvas);if(!P||!P.h||!LEIH.stations.length)return;
  const g=canvas.getContext('2d'),W=canvas.width,R=W/2;const [px,pz]=ppos(P);const spd=P.car?Math.abs(P.car.speed):0;const k=1/(1.3+Math.min(1.6,spd*0.05));
  const rot=P.cam.yaw+Math.PI,cr=Math.cos(rot),sr=Math.sin(rot);const foot=!P.car;const near=foot?leihNearestStation(px,pz):null;let icons=0,hi=-1;
  for(const s of LEIH.stations){const dx=(s.x-px)*k,dz=(s.z-pz)*k;if(Math.abs(dx)>R*1.5&&!(near&&near.s===s))continue;
    let sx=dx*cr-dz*sr,sy=dx*sr+dz*cr;const L=Math.hypot(sx,sy);const isHi=!!(near&&near.s===s);
    if(L>R-12){if(!isHi)continue;sx*=(R-12)/L;sy*=(R-12)/L;}if(L<7)continue;// Spielerpfeil bleibt frei
    leihIcon(g,R+sx,R+sy,isHi?6:4.5,isHi);icons++;if(isHi)hi=s.i;}
  LEIH.mini.draws++;LEIH.mini.icons=icons;LEIH.mini.hi=hi;};
const _leihDrawBigMap=drawBigMap;
drawBigMap=function(){_leihDrawBigMap();const c=$('mapc');if(!c||!LEIH.stations.length)return;const g=c.getContext('2d');const dpr=Math.min(2,window.devicePixelRatio||1);
  g.setTransform(dpr,0,0,dpr,0,0);const W=c.clientWidth,H=c.clientHeight,s=MAPV.s;const P=P1;const foot=P&&P.h&&!P.car;const near=foot?leihNearestStation(...ppos(P)):null;
  let icons=0,hi=-1;const r=clamp(s*9,3.5,7);
  for(const st of LEIH.stations){const x=W/2+(st.x-MAPV.cx)*s,y=H/2+(st.z-MAPV.cz)*s;if(x<-20||y<-20||x>W+20||y>H+20)continue;const isHi=!!(near&&near.s===st);
    leihIcon(g,x,y,isHi?r+1.5:r,isHi);icons++;
    if(isHi){hi=st.i;g.font='700 12px "Barlow Condensed",sans-serif';g.textAlign='center';g.lineWidth=3;g.strokeStyle='rgba(10,14,18,0.85)';g.strokeText('Leihrad',x,y+r+12);g.fillStyle='#fff';g.fillText('Leihrad',x,y+r+12);}}
  LEIH.big.draws++;LEIH.big.icons=icons;LEIH.big.hi=hi;};

// geschätzte zusätzliche Draw-Calls am Ort (sichtbare Stationsteile + belegte Rad-Instanzen)
function leihDrawCalls(x,z,r=LEIH.rShow){let n=0;for(const s of LEIH.stations)if(s.shown&&Math.hypot(s.x-x,s.z-z)<r)n+=s.meshes.length;
  if(LEIH.inst&&LEIH.inst.bikes.count>0)n++;return n;}
LEIH.api={place:leihPlace,spawn:leihSpawn,despawn:leihDespawn,near:leihNear,rent:leihRent,action:leihAction,nearest:leihNearestStation,drawCalls:leihDrawCalls,
  instCount:()=>LEIH.inst?LEIH.inst.bikes.count:0};
