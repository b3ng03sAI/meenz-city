// ===================== 32 DER GROSSE COUP IM GUTENBERG-MUSEUM =====================
// Fictional heist chain: recruit crew -> steal escape car -> buy gear -> pick a plan -> break in and flee across a
// Rhine bridge to the hideout in Kastel. The loot is a made-up replica ("Druckstock der 42 Zeilen"), never the real Bible.
// Stage: 0 not started, 1 crew, 2 escape car, 3 gear, 4 plan, 5 finale, 6 done.
const COUP={stage:0,crew:[],car:null,gear:[],plan:null,alarm:false,done:false,loot:false,
  menuOpen:false,newsT:0,venue:null,contact:null,garage:null,hideout:null,
  VIEW_R:8,VIEW_A:0.55,REWARD:25000,QUIET_T:150,LOUD_T:90,NEWS_T:25};

const COUP_CREW=[
  {id:'edwin',name:'Elektro-Edwin',job:'Alarmanlagen',at:'hbf',
    lines:['Ei gude! E Alarmanlach? Die schalt ich ab wie annern Leut es Licht.','Ich bin dabei – awwer nur, wenn’s hinnerher Spundekäs gibt.']},
  {id:'fritzi',name:'Fassaden-Fritzi',job:'Kletterei',at:'zitadelle',
    lines:['Ich kletter dir jed Fassad enuff, aach in Schlappe.','Gebongt! Mei Seil is schon gepackt.']},
  {id:'schorsch',name:'Schorsch Bleifuß',job:'Fluchtfahrer',at:'kupferberg',
    lines:['Vom Dom bis Kastel in zwaa Minudde. Rückwärts.','Bin dabei. Awwer ich such mer de Radiosender aus!']}];
const COUP_GEAR=[{id:'stoersender',n:'Störsender (für Alarmanlagen)',p:1500,cat:11},
  {id:'glasschneider',n:'Diamant-Glasschneider',p:600,cat:13},
  {id:'sturmhaube',n:'Sturmhauben im Viererpack',p:300,cat:2}];
const COUP_PLANS={leise:'Leise: an de Wachleut vorbeischleiche – Sichtkegel meide, sonst geht de Alarm los. Die Uhr läuft bis zum Schichtwechsel.',
  laut:'Laut: Tür uff, Alarm an, die Wachleut wehre sich. Schnell rein, schnell raus – mit vier Sterne im Nacke.'};

function coupSetStage(n){COUP.stage=Math.max(COUP.stage,n);}
function coupFastCar(c){const T=c&&c.T;return !!T&&!T.bike&&!T.boat&&!T.plane&&!T.police&&!T.bus&&!T.kart&&T.max>=60;}
function coupHeist(){const m=activeMission;return m&&m.id==='coup_finale'?m:null;}
function coupInMuseum(P){const r=P.h&&P.h.room;return !!(r&&r.venue&&r.venue.id==='gutenberg');}

// ---------- shared materials/geometries (built once, shared by every guard) ----------
const COUP_RES={};
function coupRes(){if(COUP_RES.cone)return COUP_RES;
  COUP_RES.cone=new THREE.CircleGeometry(COUP.VIEW_R,18,Math.PI/2-COUP.VIEW_A,2*COUP.VIEW_A).rotateX(Math.PI/2);
  const cm=c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.2,depthWrite:false,side:THREE.DoubleSide});
  COUP_RES.coneCalm=cm(0xfff1a0);COUP_RES.coneAlarm=cm(0xff3030);
  COUP_RES.uniform=stdMat({color:0x2b2f36,roughness:0.7});COUP_RES.cap=stdMat({color:0x1a1c20,roughness:0.6});
  COUP_RES.torch=new THREE.CylinderGeometry(0.035,0.045,0.22,8).rotateX(Math.PI/2);COUP_RES.glass=new THREE.MeshStandardMaterial({color:0xd6ecff,transparent:true,opacity:0.22,roughness:0.05,metalness:0.1,depthWrite:false});
  return COUP_RES;}

// ===================== MUSEUM INTERIOR (venue) =====================
function coupPoster(lines,bg,fg){const t=canvasTex(256,384,g=>{g.fillStyle=bg;g.fillRect(0,0,256,384);g.strokeStyle=fg;g.lineWidth=6;g.strokeRect(10,10,236,364);
  g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';lines.forEach(([s,f,y])=>{g.font=f;g.fillText(s,128,y);});},false);return freeAfterUpload(t);}
// Line-of-sight blockers (local x0,z0,x1,z1): walls, pillars, the press - low glass cases do not block the view
function coupWall(r,B,k,x,z,w,h,d,col){B.sbox(k,x,0,z,w,h,d,col);r.coupWalls.push([x-w/2,z-d/2,x+w/2,z+d/2]);}
VENUES.push({id:'gutenberg',name:'Gutenberg-Museum',sub:'Weltmuseum der Druckkunst · Liebfrauenplatz',W:26,D:34,H:7,wall:0xe9e2d4,noCeil:true,hemiI:0.5,exp:0.95,lampI:26,lampD:20,
  lights:[[0,6,-2],[-8,6,-10],[8,6,-10],[-8,6,4],[8,6,4],[0,6,13]],
  spawn:[0,14.6,Math.PI],exits:[{x:0,z:16.4,w:1.6,d:0.8,to:'door'}],
  wp:[[-9,-12],[-9,0],[9,-12],[9,0],[0,6],[-4,-5],[4,-5],[0,13]],
  hints:[{x:0,z:13,r:2.5,t:'Weltmuseum der Druckkunst – de <b>Druckstock der 42 Zeilen</b> (Nachbildung) steht in de Mitte vom Saal.'}],
  build(r,B){const R=coupRes();r.coupWalls=[];r.grp.children[0].material=stdMat({color:0x7a5534,roughness:0.65});
    // the shared ceiling box has no downward face - a plane facing the floor instead
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(26,34).rotateX(Math.PI/2),stdMat({color:0xf1ece2,roughness:0.9}));ceil.position.y=7;r.grp.add(ceil);
    for(const z of [-12,-4,4,12])B.box('wood',0,6.75,z,26,0.25,0.4,0x8a6a48);
    // foyer partition with a side opening (x 8..13) - the foyer cannot be seen from the hall
    coupWall(r,B,'stone',-2.5,10,21,7,0.4,0xe9e2d4);B.box('dark',-2.5,6.6,10,21,0.4,0.5,0x3a2a1c);
    B.sbox('wood',-9,0,14.6,4,1.1,1,0x5a3a22);B.box('dark',-9,1.1,14.6,4.1,0.06,1.1,0x222222);   // ticket desk
    // pillars
    for(const x of [-5,5])for(const z of [-8,3])coupWall(r,B,'stone',x,z,0.9,7,0.9,0xd8cfbf);
    // printing press replica at the north wall
    coupWall(r,B,'wood',0,-15.6,3.4,0.6,1.6,0x4a2f1a);for(const x of [-1.4,1.4])B.box('wood',x,0.6,-15.6,0.3,3.2,0.3,0x4a2f1a);
    B.box('wood',0,3.8,-15.6,3.4,0.4,0.5,0x4a2f1a);B.box('metal',0,1.6,-15.6,0.2,2.2,0.2,0x8a8f96);B.box('metal',0,1.4,-15.6,1.6,0.12,1.0,0x5a5f66);
    // wall cases with open books
    const caseGlass=new THREE.BoxGeometry(1.1,0.7,2.4);
    for(const s of [-1,1])for(const z of [-12,-6,0,6]){B.sbox('dark',s*11.8,0,z,1.1,0.95,2.4,0x2a2a2e);B.box('cloth',s*11.8,0.95,z,0.9,0.05,2.1,0x6e1a22);
      B.box('floor',s*11.8,1.0,z,0.7,0.05,1.0,0xf3ead2);const gl=new THREE.Mesh(caseGlass,R.glass);gl.position.set(s*11.8,1.32,z);r.grp.add(gl);}
    // posters
    const P1=coupPoster([['DRUCKKUNST','700 44px Georgia,serif',70],['seit 1450','italic 30px Georgia,serif',120],['Bleisatz','600 34px Georgia,serif',220],['Lettern','600 34px Georgia,serif',270],['Druckerpress','600 34px Georgia,serif',320]],'#efe4cc','#3a2412');
    const P2=coupPoster([['DE','700 40px Georgia,serif',80],['DRUCKSTOCK','700 40px Georgia,serif',130],['DER 42 ZEILEN','700 32px Georgia,serif',180],['– Nachbildung –','italic 26px Georgia,serif',240],['Bitte nix anfasse!','600 26px Georgia,serif',320]],'#2a1c14','#e8c46a');
    for(const [tex,x,z,ry] of [[P1,-12.75,-9,Math.PI/2],[P2,12.75,-9,-Math.PI/2],[P1,12.75,3,-Math.PI/2],[P2,-12.75,3,Math.PI/2]])B.plane(tex,x,3.4,z,1.8,2.7,ry,false);
    // the treasure: pedestal, rope barrier, glass hood, plate (own mesh so it can vanish)
    B.sbox('dark',0,0,-2,1.6,1.0,1.6,0x2a2a2e);B.box('gold',0,1.0,-2,1.66,0.04,1.66,0xb8862b);
    for(const [x,z] of [[-1.8,-3.8],[1.8,-3.8],[-1.8,-0.2],[1.8,-0.2]]){B.box('gold',x,0,z,0.14,0.95,0.14,0xd4af37);}
    for(const [x,z,w,d] of [[0,-3.8,3.6,0.05],[0,-0.2,3.6,0.05],[-1.8,-2,0.05,3.6],[1.8,-2,0.05,3.6]])B.box('cloth',x,0.82,z,w,0.07,d,0x9b1b1b);
    const hood=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.8,1.3),R.glass);hood.position.set(0,1.42,-2);r.grp.add(hood);
    const plate=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.07,0.55),stdMat({color:0xc9962e,roughness:0.3,metalness:0.85}));plate.position.set(0,1.1,-2);plate.rotation.x=-0.35;r.grp.add(plate);r.coupPlate=plate;
    B.box('glow',0,6.8,-2,1.2,0.05,1.2,0xfff4d8);},
  npcs(r){r.coupGuards=[];const P=r.coupPlate;if(P)P.visible=!COUP.done&&!COUP.loot;
    if(coupHeist()){coupSpawnGuards(r);return;}
    vPerson(r,2.6,-2,-Math.PI/2,{role:'stand',lines:['Gucke ja, aaafasse naa!','Des is nur e Nachbildung. Awwer e teuer!','Bitte net an die Scheib klopfe.']});
    const T=['Guck emol, die Buchstabe sin all rückwärts!','Do hot de Gutenberg die Druckerpress erfunne. Un ich krieh mein Drucker dehaam net zum Laafe.','Is des de Druckstock? Der glänzt jo wie e Fastnachtsorde.','Wo geht’s dann do zum Museumsshop?'];
    for(let k=0;k<6;k++)vPerson(r,mr(-8,8),mr(-13,7),mr(0,6),{lines:T});},
  onEnter(r,P){if(r.coupPlate)r.coupPlate.visible=!COUP.done&&!COUP.loot;const m=coupHeist();if(m)coupEnterHeist(m,r);},
  interact(P,r){const h=P.h;if(Math.hypot(h.x-r.ox,h.z-(r.oz-2))>2.4)return;const m=coupHeist();
    if(!m||COUP.loot){const g=r.people.find(o=>o.alive&&!o.removed&&o.vrole==='stand');if(g)say(g,'Finger weg vom Glas, gell!',2.5,'loud');else hint('Die Vitrine is zu.',1.5,P);return;}
    COUP.loot=true;if(r.coupPlate)r.coupPlate.visible=false;
    const quietCut=COUP.gear.includes('glasschneider')&&!COUP.alarm;
    if(!quietCut)coupAlarm(m,'Glas klirrt!');chime(quietCut?[1320,1568]:[300,240]);
    showBig('DRUCKSTOCK GESCHNAPPT','win',2.5,quietCut?'Glasschneider – ganz leis':'Mit Karacho');
    missionText('Raus hier! Zum <b>Ausgang</b> – de Fluchtwagen wartet.',5);},
  update(r,dt,P){coupUpdateGuards(r,dt,P);}});

// ---------- guards (generic security staff, fictional) ----------
function coupGuard(r,lx,lz,face,route,sweep){const R=coupRes();const g=vPerson(r,lx,lz,face,{role:'guard',pose:'guard',speed:1.3});g.vlines=null;
  const torso=g.hips.children[0];if(torso&&torso.isMesh)torso.material=R.uniform;for(const a of [g.armL,g.armR]){const c=a.children[0];if(c&&c.isMesh)c.material=R.uniform;}
  g.hips.traverse(o=>{if(o.isMesh&&o.geometry===HGEO.hair)o.visible=false;});const cap=new THREE.Mesh(HGEO.cap,R.cap);cap.position.set(0,0.9,0);g.hips.add(cap);
  const torch=new THREE.Mesh(COUP_RES.torch,R.uniform);torch.position.set(0,-0.62,0.12);g.armR.add(torch);
  g.gun=new THREE.Mesh(HGEO.gun,cmat(0x111111,0.35));g.gun.position.set(0,-0.6,0.12);g.gun.visible=false;g.armL.add(g.gun);
  const cone=new THREE.Mesh(R.cone,R.coneCalm);cone.position.y=0.06;g.g.add(cone);g.coupCone=cone;
  g.coupRoute=route||null;g.coupWp=0;g.coupPause=0;g.coupSweep=sweep||null;g.coupBase=face;g.coupShootT=mr(0.8,1.5);g.health=80;r.coupGuards.push(g);return g;}
function coupSpawnGuards(r){
  coupGuard(r,0,-9.5,0,null,{amp:1.05,per:9});                                   // sweeps the pedestal
  coupGuard(r,-9,-14,0,[[-9,-14],[-9,6]]);                                          // west aisle
  coupGuard(r,9,6,Math.PI,[[9,6],[9,-14],[3,-13],[9,-14]]);}                         // east aisle + press
function coupLos(r,x0,z0,x1,z1){const L=Math.hypot(x1-x0,z1-z0);const n=Math.ceil(L/0.35);
  for(let i=1;i<n;i++){const t=i/n;const lx=x0+(x1-x0)*t-r.ox,lz=z0+(z1-z0)*t-r.oz;for(const b of r.coupWalls)if(lx>b[0]&&lx<b[2]&&lz>b[1]&&lz<b[3])return false;}return true;}
function coupSees(r,g,h){const dx=h.x-g.x,dz=h.z-g.z;const d=Math.hypot(dx,dz);if(d>COUP.VIEW_R)return false;if(d<1.1)return true;
  if(Math.abs(angDiff(g.facing,Math.atan2(dx,dz)))>COUP.VIEW_A)return false;return coupLos(r,g.x,g.z,h.x,h.z);}
function coupUpdateGuards(r,dt,P){const G2=r.coupGuards;if(!G2||!G2.length)return;const m=coupHeist();const h=P.h;const active=!!(m&&m.phase==='inside');
  for(const g of G2){if(g.removed||!g.alive||g.state!=='venue'){if(g.coupCone)g.coupCone.visible=false;continue;}
    let mv=0;
    if(active&&COUP.alarm){const dx=h.x-g.x,dz=h.z-g.z;const d=Math.hypot(dx,dz);g.gun.visible=true;faceTo(g,dx,dz,dt,8);
      if(d>5)mv=moveHuman(g,dx,dz,3.2,dt);g.coupShootT-=dt;
      if(g.coupShootT<=0){g.coupShootT=mr(1.0,1.8);if(d<22&&coupLos(r,g.x,g.z,h.x,h.z))npcShoot(g,P,d);}}
    else if(g.coupSweep){const S=g.coupSweep;g.facing=g.coupBase+Math.sin(simTime*TAU/S.per)*S.amp;}
    else if(g.coupRoute){if(g.coupPause>0){g.coupPause-=dt;}else{const w=g.coupRoute[g.coupWp];const dx=r.ox+w[0]-g.x,dz=r.oz+w[1]-g.z;
      if(Math.hypot(dx,dz)<0.4){g.coupWp=(g.coupWp+1)%g.coupRoute.length;g.coupPause=1.6;}else{mv=moveHuman(g,dx,dz,g.walkSpeed,dt);faceTo(g,dx,dz,dt,5);}}}
    g.animate(dt,mv);g.y=r.oy;g.sync();
    g.coupCone.visible=active;g.coupCone.material=COUP.alarm?COUP_RES.coneAlarm:COUP_RES.coneCalm;
    if(active&&!COUP.alarm&&coupSees(r,g,h)){say(g,'Halt! Stehe bleiwe!',2.5,'loud');coupAlarm(m,'Ihr seid gesehe worde!');}}
  if(active&&!COUP.loot&&Math.hypot(h.x-r.ox,h.z-(r.oz-2))<2.4){r.coupHintT=(r.coupHintT||0)-dt;if(r.coupHintT<=0){r.coupHintT=0.8;hint('<b>F</b>: Druckstock schnappe',1,P);}}}
function coupAlarm(m,why){if(COUP.alarm)return;COUP.alarm=true;setWanted(Math.max(wanted,4));showBig('ALARM!','fail',2.5,why||'');chime([880,660,880,660,880]);
  if(m&&m.timer!=null)m.timer=Math.min(m.timer,COUP.LOUD_T);}
function coupEnterHeist(m,r){if(m.phase!=='approach')return;m.phase='inside';m.target=null;
  if(COUP.plan==='laut'){m.timer=COUP.LOUD_T;coupAlarm(m,'Tür uffgebroche – jetzt awwer flott!');missionText('<b>Laut</b>: Die Wachleut wehre sich! Schnapp de <b>Druckstock</b> in de Saalmitte (<b>F</b>) un dann raus.',6);}
  else{m.timer=COUP.QUIET_T;missionText('<b>Leise</b>: Bleib aus de <b>Sichtkegeln</b> der Wachleut! De Druckstock steht in de Saalmitte (<b>F</b>). Bis zum Schichtwechsel bleibt net viel Zeit.',7);}}

// ===================== MISSION CHAIN =====================
function coupCrewNpc(c){const p=POI[c.at]||POI.dom;const [x,z]=freeSpot(p[0]+6,p[1]+6,0.5);const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.mission=true;h.state='idle';h.walkSpeed=0;h.coupCrew=c;h.sync();return h;}
function coupReleaseNpc(h){if(!h||h.removed)return;h.mission=false;if(h.alive)radToPed(h);}
function coupMissions(){
  const contact=COUP.contact,garage=COUP.garage,hideout=COUP.hideout;
  // I: crew
  MISSIONS.push({id:'coup_crew',tag:'G',free:true,title:'De große Coup I: Die Crew',start:contact,
    begin(m){coupSetStage(1);m.npcs=COUP_CREW.filter(c=>!COUP.crew.includes(c.id)).map(coupCrewNpc);
      missionText('De <b>Professer</b> flüstert: „Im Gutenberg-Museum steht e Druckstock, der is e Vermöge wert. Awwer allaa schaffste des net.“ Heuer <b>drei Spezialiste</b> an – Hauptbahnhof, Zitadelle, Kupferberg.',9);},
    update(m){const P=mP(m);const [px,pz]=ppos(P);const left=m.npcs.filter(h=>!h.coupDone);
      for(const h of left){if(!h.alive||h.removed)return 'fail';faceTo(h,px-h.x,pz-h.z,1/60,4);h.sync();
        if(!P.car&&Math.hypot(px-h.x,pz-h.z)<3){h.coupDone=true;const c=h.coupCrew;COUP.crew.push(c.id);say(h,c.lines[0]+' '+c.lines[1],5,'loud');chime([660,880]);
          missionText(`<b>${c.name}</b> (${c.job}) is dabei! Crew: ${COUP.crew.length}/3`,4);}}
      const rest=m.npcs.filter(h=>!h.coupDone);m.marks=rest.map(h=>[h.x,h.z]);
      if(rest.length){let b=rest[0];for(const h of rest)if(Math.hypot(h.x-px,h.z-pz)<Math.hypot(b.x-px,b.z-pz))b=h;m.target=[b.x,b.z];}
      if(COUP.crew.length>=3){coupSetStage(2);return 'win';}},
    end(m){for(const h of m.npcs||[]){if(h.coupDone)coupReleaseNpc(h);else if(!h.removed)h.remove();}},
    reward:300,win:'Die Crew steht. De Professer is zufriede.'});
  // II: escape car
  MISSIONS.push({id:'coup_car',tag:'G',free:true,coupNeed:'coup_crew',title:'De große Coup II: De Fluchtwage',start:contact,
    begin(m){coupSetStage(2);const p=roadSpot(POI.rathaus[0]-40,POI.rathaus[1]-50);m.car=spawnMissionCar('sport',p,{color:0x1c1d20});m.car.persist=true;m.stage=0;m.target=[m.car.x,m.car.z];
      missionText('Schorsch braucht e <b>schnelles Auto</b>. Am Rathaus steht e Sportwage – klau ihn (oder e annern schnelle Kiste) un stell ihn in die markierte <b>Garage</b> an de Rheinstraß.',8);},
    onEnter(c){const m=activeMission;if(!coupFastCar(c))return;if(m.stage===0){m.stage=1;m.target=garage;if(c===m.car){setWanted(Math.max(wanted,1));hint('Die Alarmanlach heult! ★',2.5);}
      missionText('Ab in die <b>Garage</b> – sauber parke!',5);}},
    update(m){const P=mP(m);const c=P.car;if(m.stage===0){if(m.car.dead||m.car.removed)return 'fail';m.target=[m.car.x,m.car.z];return;}
      if(!coupFastCar(c)){m.target=m.car.dead||m.car.removed?garage:[m.car.x,m.car.z];hint('Du brauchst e <b>schnelles Auto</b>!',1,P);return;}m.target=garage;
      if(Math.hypot(c.x-garage[0],c.z-garage[1])<7&&Math.abs(c.speed)<3){COUP.car=c.id;coupSetStage(3);return 'win';}},
    end(m){if(m.car){m.car.mission=false;m.car.persist=false;}},
    reward:800,win:'De Fluchtwage steht in de Garage. Schorsch poliert schon die Felge.'});
  // III: gear
  MISSIONS.push({id:'coup_gear',tag:'G',free:true,coupNeed:'coup_car',title:'De große Coup III: Ausrüstung',start:contact,
    begin(m){coupSetStage(3);missionText('Kauf die <b>Ausrüstung</b> in de Läde: Störsender (Elektronik), Glasschneider (Laden), Sturmhaube (Mode). Die Sache steht im Ladenmenü.',8);},
    update(m){const P=mP(m);const [px,pz]=ppos(P);const miss=COUP_GEAR.filter(g=>!COUP.gear.includes(g.id));if(!miss.length){coupSetStage(4);return 'win';}
      m.scanT=(m.scanT||0)-1;if(m.scanT<=0){m.scanT=60;m.marks=miss.map(g=>{let b=null,bd=1e18;for(const s of SHOPS){if(s.cat!==g.cat||s.inVenue)continue;const d=(s.x-px)**2+(s.z-pz)**2;if(d<bd){bd=d;b=s;}}return b?[b.x,b.z]:null;}).filter(Boolean);
        m.target=m.marks.length?m.marks.reduce((a,b)=>Math.hypot(a[0]-px,a[1]-pz)<Math.hypot(b[0]-px,b[1]-pz)?a:b):null;}},
    reward:500,win:'Alles beisamme. Jetzt fehlt nur noch de Plan.'});
  // IV: plan
  MISSIONS.push({id:'coup_plan',tag:'G',free:true,coupNeed:'coup_gear',title:'De große Coup IV: De Plan',start:hideout,
    begin(m){coupSetStage(4);COUP.plan=null;coupOpenMenu();missionText('Im <b>Versteck</b> in Kastel liegt de Plan vom Museum uff em Tisch. <b>1</b>: leise · <b>2</b>: laut',8);},
    update(m){const P=mP(m);const [px,pz]=ppos(P);if(COUP.plan){coupSetStage(5);return 'win';}if(Math.hypot(px-hideout[0],pz-hideout[1])>12)return 'fail';},
    end(m){coupCloseMenu();},reward:250,win:'De Plan steht. Heut Nacht geht’s los!'});
  // V: finale
  MISSIONS.push({id:'coup_finale',tag:'G',free:true,coupNeed:'coup_plan',title:'De große Coup: Finale',start:garage,
    begin(m){coupSetStage(5);COUP.alarm=false;COUP.loot=false;m.phase='approach';m.crossed=false;m.t0=simTime;m.maxStar=0;
      m.car=spawnMissionCar(COUP.car||'sport',[garage[0]+3,garage[1],garage[2]||0],{color:0x1c1d20});m.target=COUP.venue.door.slice(0,2);
      gameMin=22*60+45;envDirty=true;
      missionText(`Mitternacht in Meenz. Fahr zum <b>Gutenberg-Museum</b> am Liebfrauenplatz un geh rein (<b>F</b>). Plan: <b>${COUP.plan==='laut'?'laut':'leise'}</b>.`,8);},
    update(m){const P=mP(m);m.maxStar=Math.max(m.maxStar,wanted);const inside=coupInMuseum(P);
      if(m.phase==='approach'){m.target=COUP.venue.door.slice(0,2);return;}
      if(m.phase==='inside'){if(inside)return;if(!COUP.loot){m.phase='approach';return;}
        m.phase='escape';m.timer=null;setWanted(Math.max(wanted,COUP.alarm?5:4));m.target=hideout;m.marks=BRIDGES.slice(0,2).map(b=>[b.A[0]+b.U[0]*b.L/2,b.A[1]+b.U[1]*b.L/2]);
        missionText('De Diebstahl fliegt uff! Üwwer e <b>Rheinbrück</b> ins <b>Versteck</b> nach Kastel!',6);return;}
      const [px,pz]=ppos(P);if(!m.crossed&&bridgeLocal(px,pz)){m.crossed=true;m.marks=null;hint('Üwwer die Brück – weiter so!',2,P);}
      if(m.crossed&&Math.hypot(px-hideout[0],pz-hideout[1])<9){coupFinish(m);return 'win';}},
    end(m){if(m.car){m.car.mission=false;m.car.persist=false;}if(!COUP.done){COUP.loot=false;COUP.alarm=false;}},
    reward:COUP.REWARD,win:'De Druckstock is im Versteck. Die Crew feiert bis in die Puppe!'});
  for(const m of MISSIONS.filter(m=>m.id.startsWith('coup_'))){const b=beacon();setBeacon(b,m.start[0],m.start[1]);b.userData.m=m;startBeacons.push(b);}}
function coupFinish(m){COUP.done=true;COUP.stage=6;clearWanted();
  coupNews({plan:COUP.plan||'leise',alarm:COUP.alarm,secs:Math.round(simTime-m.t0),stars:m.maxStar,crew:COUP_CREW.map(c=>c.name)});}

// a coup mission only appears once the previous one is done
const _coupAvailable=availableMissions;
availableMissions=function(){return _coupAvailable().filter(m=>!m.coupNeed||G.done[m.coupNeed]);};

// gear is sold in ordinary shops while stage 3 is open
const _coupShopItems=shopItems;
shopItems=function(shop){const L=_coupShopItems(shop);if(COUP.stage!==3)return L;
  for(const g of COUP_GEAR)if(g.cat===shop.cat&&!COUP.gear.includes(g.id))L.push({n:g.n,p:g.p,f:()=>{if(!COUP.gear.includes(g.id))COUP.gear.push(g.id);return `${g.n} – fürs Ding. (${COUP.gear.length}/${COUP_GEAR.length})`;}});
  return L;};

// ===================== UI: planning menu + newspaper =====================
function coupEl(id,css){let el=document.getElementById(id);if(el)return el;el=document.createElement('div');el.id=id;el.hidden=true;el.style.cssText=css;document.body.appendChild(el);return el;}
function coupOpenMenu(){const el=coupEl('coupplan','position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;width:min(560px,92vw);background:rgba(18,20,24,0.94);color:#f2ead8;border:2px solid #c9962e;border-radius:10px;padding:18px 20px;font:16px "Barlow Condensed",Arial Narrow,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.6)');
  el.innerHTML=`<div style="font:800 26px Bungee,'Barlow Condensed',sans-serif;color:#e8c46a;margin-bottom:6px">De Plan</div><div style="opacity:.85;margin-bottom:12px">Crew: ${COUP_CREW.map(c=>c.name).join(' · ')}</div>`+
    ['leise','laut'].map((k,i)=>`<button data-plan="${k}" style="display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;background:#2a2d33;color:#fff;border:1px solid #555;border-radius:6px;font:inherit;cursor:pointer"><kbd style="background:#c9962e;color:#111;border-radius:3px;padding:0 6px;margin-right:8px">${i+1}</kbd>${COUP_PLANS[k]}</button>`).join('');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>coupChoosePlan(b.dataset.plan)));
  el.hidden=false;COUP.menuOpen=true;if(document.pointerLockElement)document.exitPointerLock();}
function coupCloseMenu(){COUP.menuOpen=false;const el=document.getElementById('coupplan');if(el)el.hidden=true;}
function coupChoosePlan(k){if(!COUP.menuOpen||!COUP_PLANS[k])return;COUP.plan=k;coupCloseMenu();chime([523,784]);hint(`Plan: <b>${k}</b>. Fluchtwage in de Garage, dann Finale!`,3);}
COUP.choosePlan=coupChoosePlan;
addEventListener('keydown',e=>{if(!COUP.menuOpen||mode!=='play')return;if(e.code==='Digit1'||e.code==='Digit2'){coupChoosePlan(e.code==='Digit1'?'leise':'laut');e.stopImmediatePropagation();e.preventDefault();}},true);
function coupNews(st){const el=coupEl('coupnews','position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-1.5deg);z-index:60;width:min(640px,94vw);max-height:92vh;overflow:auto;background:#f4ecd8;color:#1d1a16;padding:18px 24px 14px;font:15px Georgia,"Times New Roman",serif;box-shadow:0 14px 50px rgba(0,0,0,0.7);border:1px solid #b9ab8c;cursor:pointer');
  const mm=Math.floor(st.secs/60),ss=String(st.secs%60).padStart(2,'0');const loud=st.plan==='laut'||st.alarm;
  el.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:11px;border-bottom:1px solid #1d1a16;padding-bottom:3px"><span>Unabhängig seit 1462</span><span>Preis: 1 Weck</span></div>
<div style="font:900 40px/1.1 Georgia,serif;text-align:center;letter-spacing:1px;margin:6px 0 2px">DE MEENZER BLÄTTCHE</div>
<div style="border-top:3px double #1d1a16;border-bottom:1px solid #1d1a16;font-size:11px;text-align:center;padding:2px 0;margin-bottom:10px">Sonderausgabe · Altstadt · Kastel · Wissbaade</div>
<div style="font:900 36px/1.05 Georgia,serif;text-transform:uppercase">Druckstock futsch!</div>
<div style="font:italic 18px/1.25 Georgia,serif;margin:6px 0 10px">Dreiste Bande räumt Gutenberg-Museum aus – Polizei: „Die warn fort wie de letzte Schoppe uff de Fassenacht“</div>
<div style="column-count:2;column-gap:18px;text-align:justify;font-size:14px;line-height:1.35">${loud?
  'Mit Karacho un Sirenegeheul hot e unbekannte Bande in de Nacht de <b>Druckstock der 42 Zeilen</b> (e Nachbildung, awwer e teuer!) aus em Weltmuseum am Liebfrauenplatz geholt. Die Wachleut hawwe sich gewehrt – genützt hot’s nix.':
  'Kaa Alarm, kaa Spure, kaa Krümel vom Fleischworschtweck: Ganz leis hot e unbekannte Bande in de Nacht de <b>Druckstock der 42 Zeilen</b> (e Nachbildung, awwer e teuer!) aus em Weltmuseum am Liebfrauenplatz entführt. Die Wachleut ham nix gemerkt.'}
 Zeuge berichte von eme schwarze Fluchtwage, der mit Vollgas üwwer die Rheinbrück Richtung Kastel gebrettert is. „So schnell war do noch kaaner unnerwegs, net emol de Bus“, sacht e Anwohner. Die Fahndung läuft. De Druckstock bleibt verschwunne.</div>
<div style="margin-top:10px;border:1px solid #1d1a16;padding:6px 8px;font:13px/1.5 'Barlow Condensed',Arial Narrow,sans-serif;display:grid;grid-template-columns:1fr 1fr;gap:0 14px">
<span>Plan: <b>${st.plan}</b></span><span>Alarm: <b>${st.alarm?'ja':'naa'}</b></span><span>Dauer: <b>${mm}:${ss} min</b></span><span>Fahndung: <b>${'★'.repeat(st.stars)||'–'}</b></span>
<span>Beute: <b>€${COUP.REWARD.toLocaleString('de-DE')}</b></span><span>Crew: <b>${st.crew.join(', ')}</b></span></div>
<div style="font-size:10px;margin-top:8px;opacity:.7">Alle Personen un Ereignisse sin frei erfunne. Klick zum Weiterspiele.</div>`;
  el.onclick=()=>{el.hidden=true;COUP.newsT=0;};el.hidden=false;COUP.newsT=COUP.NEWS_T;}

// ===================== SAVE GAME =====================
function coupState(){return {stage:COUP.stage,crew:[...COUP.crew],car:COUP.car,gear:[...COUP.gear],plan:COUP.plan,done:COUP.done};}
function coupLoad(c){c=c||{};COUP.stage=clamp(Math.floor(+c.stage||0),0,6);COUP.crew=(c.crew||[]).filter(id=>COUP_CREW.some(k=>k.id===id));
  COUP.car=CAR_TYPES[c.car]?c.car:null;COUP.gear=(c.gear||[]).filter(id=>COUP_GEAR.some(k=>k.id===id));COUP.plan=COUP_PLANS[c.plan]?c.plan:null;COUP.done=!!c.done;COUP.alarm=false;COUP.loot=false;coupCloseMenu();}
const _coupSnapshot=snapshot;
snapshot=function(){const s=_coupSnapshot();s.coup=coupState();return s;};
const _coupApplySave=applySave;
applySave=function(d){const ok=_coupApplySave(d);if(ok)coupLoad(d.coup);return ok;};

// ===================== SETUP / UPDATE =====================
function setupCoup(){const v=VENUES.find(v=>v.id==='gutenberg');COUP.venue=v;
  // Haus zum Römischen Kaiser, Liebfrauenplatz 5 - door on the plaza side
  v.door=rayDoor(110,-104,114,-79);v.labeled=true;LANDMARK_LABELS.push({name:'Gutenberg-Museum (begehbar)',x:v.door[0],z:v.door[1],cat:'small'});
  COUP.contact=freeSpot(96,-104,0.5);
  COUP.garage=roadSpot((PL.fischtor||[342,-122])[0]-20,(PL.fischtor||[342,-122])[1]+10);
  COUP.hideout=roadSpot(POI.reduit[0]+40,POI.reduit[1]-120).slice(0,2);
  coupMissions();}
// p4e_main hides every non-player human while INDOOR is set; museum staff and guards have to stay visible
const _coupRenderFrame=renderFrame;
renderFrame=function(){const r=INDOOR;if(r&&r.venue&&r.venue.id==='gutenberg')for(const o of r.people)if(!o.removed)o.g.visible=true;_coupRenderFrame();};
function updateCoup(dt){if(COUP.newsT>0){COUP.newsT-=dt;const b=$('big');if(b.classList.contains('show'))b.className='big';
    if(COUP.newsT<=0){const el=document.getElementById('coupnews');if(el)el.hidden=true;}}
  if(COUP.menuOpen&&!(activeMission&&activeMission.id==='coup_plan'))coupCloseMenu();}
