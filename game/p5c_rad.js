// ===================== FAHRRÄDER + FAHRRADFÜHRERSCHEIN =====================
// Fahrrad = CAR_TYPES.fahrrad (bike:true, pedal:true): Physik, Neigung und Kamera wie beim Motorrad,
// aber eigener Rahmen, Tretbewegung, kein Motor. Ohne G.fahrradSchein gibt's beim Radeln einen Stern,
// manchmal rennt ein Polizist hinterher. Den Schein gibt's in der Mission „Fahrradführerschein“.
const RAD={bikes:[],forceCop:false,copCD:0,cop:null,
  RIDE_T:3,REARM_T:15,COP_CHANCE:0.35,COP_CD:60,COP_SPEED:6.5,COP_GIVEUP:25,COP_FAR:80,
  SHOUT:'Ey du Kek, du hast kein Fahrradführerschein!'};

// --- Rahmen: dünne Rohre in Lackfarbe (body), Gabel/Lenker/Sattel/Kurbel dunkel (det) ---
const _radCarGeo=carGeo;
carGeo=function(id){const T=CAR_TYPES[id];if(!T||!T.pedal)return _radCarGeo(id);if(CAR_GEO.has(id))return CAR_GEO.get(id);
  const k={r:0.09,g:0.09,b:0.1},sil={r:0.62,g:0.64,b:0.66};const wr=T.wr,hw=T.wb/2;
  const rw=[0,wr,-hw],fw=[0,wr,hw],bb=[0,0.3,-0.04],st=[0,0.86,-0.24],ht=[0,0.9,0.36],hb=[0,0.64,0.42];
  const pt=new GB();for(const [a,b] of [[bb,st],[bb,hb],[[0,0.82,-0.22],ht],[hb,ht],[bb,rw],[[0,0.8,-0.23],rw]])pt.beam(a,b,0.045,0.045,WHITE);
  const body=pt.geo();body.deleteAttribute('color');
  const det=new GB(),head=new GB(),tail=new GB();
  for(const sx of [-1,1])det.beam([sx*0.05,0.66,0.42],[sx*0.05,wr,hw],0.03,0.03,sil);                       // Gabel
  det.beam(ht,[0,1.02,0.32],0.035,0.035,sil);det.beam([-0.27,1.04,0.3],[0.27,1.04,0.3],0.03,0.03,sil);       // Vorbau, Lenker
  for(const sx of [-1,1])gbox(det,sx*0.3,1.04,0.3,0.08,0.05,0.05,k);                                         // Griffe
  det.beam(st,[0,0.95,-0.27],0.03,0.03,sil);gbox(det,0,0.98,-0.25,0.16,0.06,0.28,k,0.06,0,0.03);              // Sattelstütze, Sattel
  for(const sx of [-1,1]){det.beam([sx*0.07,0.3,-0.04],[sx*0.09,0.3+0.17*sx,-0.04],0.025,0.025,sil);    // Kurbeln
    gbox(det,sx*0.13,0.3+0.17*sx,-0.04,0.09,0.025,0.06,k);}                                                 // Pedale
  gbox(det,0,0.62,-0.62,0.14,0.02,0.42,k);                                                                  // Schutzblech hinten
  gbox(head,0,0.86,0.47,0.07,0.06,0.04,{r:1,g:0.97,b:0.9});gbox(tail,0,0.66,-0.86,0.06,0.04,0.02,{r:1,g:0.06,b:0.04});
  const r={body,glass:new THREE.BoxGeometry(0.001,0.001,0.001),det:det.geo(),head:head.geo(),tail:tail.geo()};CAR_GEO.set(id,r);return r;};

// --- schmale Reifen: einmalig nach dem ersten sync (Konstruktor ruft sync auf) ---
const _radSync=Car.prototype.sync;
Car.prototype.sync=function(dt){_radSync.call(this,dt);if(this.T.pedal&&!this.radInit){this.radInit=true;for(const w of this.wheels){const ch=w.w.children;if(Array.isArray(ch))for(const m of ch)m.scale.x*=0.25;}}};

// --- Fahrer: sitzt auf dem Sattel, Beine folgen der Kurbel ---
const _radVehicleInput=vehicleInput;
vehicleInput=function(P,I){_radVehicleInput(P,I);const c=P.car;if(!c||!c.T.pedal||!P.h)return;const h=P.h;const fx=Math.sin(c.h),fz=Math.cos(c.h);
  h.x=c.x-fx*0.2;h.z=c.z-fz*0.2;h.y=c.y+0.2;const a=c.spin*0.45;
  h.legL.rotation.set(-1.05+Math.sin(a)*0.5,0,0.08);h.legR.rotation.set(-1.05-Math.sin(a)*0.5,0,-0.08);
  h.armL.rotation.set(-1.2,0,0.18-c.steer*0.15);h.armR.rotation.set(-1.2,0,-0.18-c.steer*0.15);h.hips.rotation.x=0.35;h.g.position.set(h.x,h.y,h.z);};

const _radEnterCar=enterCar;
enterCar=function(P,c){_radEnterCar(P,c);if(!c.T.pedal)return;P.radT=0;
  hint(G.fahrradSchein?'<b>Fahrrad</b> · Fahrradführerschein dabei 👍':'<b>Fahrrad</b> · ohne <b>Fahrradführerschein</b> – pass uff!',3,P);};

// --- Vergehen + Rad-Polizist ---
function radOffence(P){setWanted(Math.max(wanted,1));hint('Ohne <b>Fahrradführerschein</b> unterwegs! ★',2.5,P);
  if(RAD.forceCop||(RAD.copCD<=0&&!RAD.cop&&Math.random()<RAD.COP_CHANCE))radSpawnCop(P);}
function radSpawnCop(P){const c=P.car;const [px,pz]=ppos(P);const hd=c?c.h:P.h.facing;
  const [x,z]=freeSpot(px-Math.sin(hd)*25,pz-Math.cos(hd)*25,0.4);const h=spawnCop(x,z,null);h.radCop={t:0,shouts:0,shoutT:0.4};
  RAD.cop=h;RAD.copCD=RAD.COP_CD;return h;}
function radToPed(h){h.state='walk';const n=nearestNode(h.x,h.z,false);if(n>=0&&NODES[n].e.length)pedEnterEdge(h,NODES[n].e[0],n);else h.state='flee';}
function radCopGiveUp(c){c.radCop=null;if(RAD.cop===c)RAD.cop=null;c.aiming=false;say(c,'Pff … de nächste Kek kimmt bestimmt.',2.5);radToPed(c);}
const _radUpdateCop=updateCop;
updateCop=function(c,dt){const R=c.radCop;if(!R||c.state!=='cop'){_radUpdateCop(c,dt);return;}
  R.t+=dt;const P=nearestPlayer(c.x,c.z);const [px,pz]=ppos(P);const dx=px-c.x,dz=pz-c.z;const d=Math.hypot(dx,dz);
  if(R.t>RAD.COP_GIVEUP||d>RAD.COP_FAR||wanted===0){radCopGiveUp(c);return;}
  R.shoutT-=dt;if(R.shoutT<=0&&R.shouts<3){R.shouts++;R.shoutT=3;say(c,RAD.SHOUT,3.2,'loud');}
  let mv=0;if(d>1.1)mv=moveHuman(c,dx,dz,RAD.COP_SPEED,dt);faceTo(c,dx,dz,dt,10);c.aiming=false;if(c.gun)c.gun.visible=false;
  c.animate(dt,mv);c.y=groundY(c.x,c.z,c.y);c.sync();};

function updateRad(dt){RAD.copCD=Math.max(0,RAD.copCD-dt);if(RAD.cop&&(!RAD.cop.alive||RAD.cop.removed))RAD.cop=null;
  const exam=activeMission&&activeMission.id==='fahrradschein';
  for(const P of PLAYERS){const c=P.car;if(!c||!c.T.pedal||P.gameOver){P.radT=0;continue;}
    if(G.fahrradSchein||exam||Math.abs(c.speed)<2)continue;P.radT=(P.radT||0)+dt;
    if(P.radT>RAD.RIDE_T&&wanted===0){P.radT=-RAD.REARM_T;radOffence(P);}}}

// --- Prüfungsstrecke: Kette befahrbarer Straßenknoten ohne Wiederholung ---
function radRoute(x,z,len=520){let best=null;
  for(let tries=0;tries<12;tries++){let n=nearestNode(x,z,true);if(n<0)return null;const nodes=[n],seen=new Set([n]);let acc=0;
    for(let k=0;k<200&&acc<len;k++){const opts=NODES[n].e.filter(e=>EDGES[e].car&&!seen.has(edgeOther(e,n)));if(!opts.length)break;
      const e=opts[Math.floor(Math.random()*opts.length)];const o=edgeOther(e,n);acc+=EDGES[e].len;seen.add(o);nodes.push(o);n=o;}
    if(!best||acc>best.len)best={nodes,len:acc};if(acc>=len)break;}
  return best;}
function radCheckpoints(route,n=6){const out=[];let acc=0,next=1;const N=route.nodes;
  for(let i=1;i<N.length&&out.length<n;i++){const a=NODES[N[i-1]],b=NODES[N[i]];acc+=Math.hypot(b.x-a.x,b.z-a.z);if(acc>=route.len*next/n||i===N.length-1){out.push([b.x,b.z]);next++;}}
  return out;}
function radRing(p,q){const g=ringMesh();g.scale.setScalar(0.36);g.position.set(p[0],groundY(p[0],p[1])+3.3,p[1]);if(q)g.rotation.y=Math.atan2(q[0]-p[0],q[1]-p[1]);return g;}

// --- Prüferin (fiktiv) ---
const RAD_EXAM_LINES={start:'So, Schätzelsche! Sechs Ringe, zwei Minuude – un net umfahre, gell?',
  ring:['Gut so!','Weiter, weiter!','Des laaft ja wie geschmiert!','Net so schnell, du bist net bei de Tour de France!'],
  win:'Bestanne! Jetzt derfste ganz offiziell radle.',fail:'Ei Gude, des war nix. Nochemol!'};
function radExaminer(x,z){const h=new Human('ped');const [sx,sz]=freeSpot(x+3,z+2,0.4);h.x=sx;h.z=sz;h.y=groundY(sx,sz);h.mission=true;h.state='idle';h.walkSpeed=0;return h;}

const _radKnockHuman=knockHuman;
knockHuman=function(h,vx,vz,vy,dmg,byPlayer=true){const m=activeMission;
  if(byPlayer&&m&&m.id==='fahrradschein'&&m.stage===1&&h&&h.alive&&!playerOfHuman(h)&&h!==m.ex)m.hitPed=true;
  return _radKnockHuman(h,vx,vz,vy,dmg,byPlayer);};

function radMission(){const [sx,sz]=roadSpot(POI.rathaus[0]-60,POI.rathaus[1]+20);const start=freeSpot(sx+4,sz,0.5);
  return {id:'fahrradschein',tag:'R',free:true,title:'Fahrradführerschein',start,
    begin(m){const r=roadSpot(start[0],start[1]);m.car=spawnMissionCar('fahrrad',r,{color:0x2e7d32});m.stage=0;m.target=[m.car.x,m.car.z];
      m.rings=[];m.off=0;m.hitPed=false;m.lt=simTime;m.ex=radExaminer(start[0],start[1]);say(m.ex,RAD_EXAM_LINES.start,5,'loud');
      const route=radRoute(m.car.x,m.car.z);m.pts=route?radCheckpoints(route):[];
      missionText('Steig aufs <b>Prüfungsrad</b> und fahr durch alle <b>6 Ringe</b>. Nicht zu viel Schaden, niemanden umfahren, nicht absteigen!',7);},
    update(m){const P=mP(m);const c=m.car;const dt=Math.max(0,simTime-m.lt);m.lt=simTime;
      if(c.dead||c.removed||m.pts.length<2)return 'fail';
      if(m.stage===0){m.target=[c.x,c.z];if(P.car===c){m.stage=1;m.cp=0;m.timer=120;m.hp0=c.health;m.route=m.pts;m.target=m.pts[0];
        m.rings=m.pts.map((p,i)=>radRing(p,m.pts[i+1]||null));}return;}
      if(m.hitPed){say(m.ex,RAD_EXAM_LINES.fail,3,'loud');return 'fail';}
      if(c.health<m.hp0-35){hint('Zu viel Bruch am Prüfungsrad!',2,P);return 'fail';}
      if(P.car!==c){m.off+=dt;hint(`Zurück aufs <b>Prüfungsrad</b>! (${Math.max(0,Math.ceil(10-m.off))} s)`,1,P);if(m.off>10)return 'fail';}else m.off=0;
      m.rings.forEach((g,i)=>{g.visible=i>=m.cp;});
      if(Math.hypot(c.x-m.target[0],c.z-m.target[1])<6){m.cp++;chime([880]);if(m.cp>=m.pts.length){G.fahrradSchein=true;say(m.ex,RAD_EXAM_LINES.win,4,'loud');return 'win';}
        m.target=m.pts[m.cp];m.route=m.pts.slice(m.cp);missionText(`Ring ${m.cp}/${m.pts.length} · ${RAD_EXAM_LINES.ring[(m.cp-1)%RAD_EXAM_LINES.ring.length]}`,1.6);}},
    end(m){for(const g of m.rings||[])scene.remove(g);if(m.car)m.car.mission=false;if(m.ex&&!m.ex.removed){m.ex.mission=false;radToPed(m.ex);}},
    reward:50,win:'Fahrradführerschein bestanden! Kein Polizist ruft dir mehr „Kek“ hinterher.'};}

// --- Aufbau: geparkte Räder in Mainz und Wiesbaden, Mission + Startmarker ---
function setupRad(){
  const spots=[POI.hbf,POI.markt,POI.theater,POI.christus,POI.schloss,POI.rtheater,POI.stephan,POI.zitadelle,POI.rathaus,POI.kupferberg,
    wbPlace(/Biebrich/,null),wbPlace(/Mitte|Wiesbaden$/,null)].filter(Boolean);
  for(const [px,pz] of spots){const r=roadSpot(px+8,pz+6);const c=new Car('fahrrad',r[0],r[1],r[2]||0,{ctrl:'none'});if(c.collides()){const [x,z]=freeSpot(r[0],r[1],0.8);c.x=x;c.z=z;}
    c.ai={mode:'parked'};c.persist=true;c.sync();RAD.bikes.push(c);}
  const m=radMission();MISSIONS.push(m);const b=beacon();setBeacon(b,m.start[0],m.start[1]);b.userData.m=m;startBeacons.push(b);}
