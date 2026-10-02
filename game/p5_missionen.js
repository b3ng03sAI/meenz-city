// ===================== NEUE MISSIONEN (frei verfügbar) =====================
function ringMesh(){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.TorusGeometry(9,0.7,10,40),new THREE.MeshBasicMaterial({color:0xffd23f,transparent:true,opacity:0.85}));g.add(t);
  const glow=new THREE.Mesh(new THREE.TorusGeometry(9,1.6,8,40),new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:0.18,blending:THREE.AdditiveBlending,depthWrite:false}));g.add(glow);g.userData.t=t;scene.add(g);return g;}
function buoyMesh(x,z){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.8,1.6,12),stdMat({color:0xff5a1a,roughness:0.5}));b.position.y=0.5;g.add(b);
  const s=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.62,0.3,12),stdMat({color:0xffffff}));s.position.y=0.8;g.add(s);const f=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,6),new THREE.MeshBasicMaterial({color:0xffee66}));f.position.y=1.6;g.add(f);
  g.position.set(x,WATER_LEVEL-0.3,z);scene.add(g);return g;}
function wbPlace(re,fb){const p=PLACES.find(p=>re.test(p.name));return p?[p.x,p.z]:fb;}
function extraMissions(){flugBuild();const L0=MISSIONS.length;
  const apron=POI.flugplatz;const [ux,uz]=flugU();
  // E: Erstflug
  const ringPts=[[...flugP(FLUG.LEN/2+250,0),40],[POI.rathaus?POI.rathaus[0]-200:-400,POI.rathaus?POI.rathaus[1]-150:-300,70],[POI.dom[0],POI.dom[1],95],[POI.zitadelle[0],POI.zitadelle[1],80],[POI.christus[0],POI.christus[1],75],[...flugP(-FLUG.LEN/2-500,0),60],[...flugP(-FLUG.LEN/2-200,0),28]];
  MISSIONS.push({id:'erstflug',tag:'E',free:true,title:'Erstflug am Großen Sand',start:landSpotNear(apron[0],apron[1]+(FLUG.side||-1)*-8,20)||apron,
    begin(m){m.car=spawnMissionCar('flugzeug',[...flugP(-110,FLUG.side*55),FLUG.h+Math.PI]);m.stage=0;m.target=[m.car.x,m.car.z];m.rings=[];
      missionText('Willkommen am alten Meenzer Flugplatz! Steig in die <b>Cessna-Kopie</b> und flieg durch alle <b>goldenen Ringe</b> – über Rhein, Dom und Zitadelle. Danach sauber auf der Piste landen.',9);},
    update(m){const P=mP(m);const c=m.car;if(c.dead||c.removed)return 'fail';
      if(m.stage===0){m.target=[c.x,c.z];if(P.car===c){m.stage=1;m.cp=0;m.timer=420;m.route=ringPts.map(p=>[p[0],p[1]]);this.ring(m);}return;}
      if(m.stage===1){if(P.car!==c&&!(c.air))hint('Zurück ins <b>Flugzeug</b>!',1,P);const R=ringPts[m.cp];m.target=[R[0],R[1]];m.ringG.rotation.y+=0;
        if(Math.hypot(c.x-R[0],c.y-R[2],c.z-R[1])<11){chime([880,1100]);m.cp++;if(m.cp>=ringPts.length){scene.remove(m.ringG);m.ringG=null;m.stage=2;m.target=[FLUG.C[0],FLUG.C[1]];m.route=null;missionText('Alle Ringe! Jetzt <b>landen</b> und auf der Piste anhalten.',5);return;}m.route=ringPts.slice(m.cp).map(p=>[p[0],p[1]]);this.ring(m);missionText(`Ring ${m.cp}/${ringPts.length}`,2);}return;}
      if(m.stage===2){if(!c.air&&flugOnRunway(c.x,c.z,4)&&Math.abs(c.speed)<2&&P.car===c)return 'win';}},
    ring(m){if(!m.ringG)m.ringG=ringMesh();const R=ringPts[m.cp];const N=ringPts[Math.min(m.cp+1,ringPts.length-1)];const prev=m.cp?ringPts[m.cp-1]:[m.car.x,m.car.z];m.ringG.position.set(R[0],R[2],R[1]);m.ringG.rotation.set(0,Math.atan2(R[0]-prev[0],R[1]-prev[1]),0);},
    end(m){if(m.ringG)scene.remove(m.ringG);if(m.car){m.car.mission=false;}},reward:2500,win:'Butterweich gelandet! Der Tower klatscht.'});
  // L: Luftbilder
  const shots=[['Dom',POI.dom],['Christuskirche',POI.christus],['Zitadelle',POI.zitadelle],['Wiesbadener Innenstadt',wbPlace(/Wiesbaden-Innenstadt|Wiesbaden-Mitte/,[-1900,-9300])],['Kasteler Reduit',POI.reduit]];
  MISSIONS.push({id:'luftbild',tag:'L',free:true,title:'Luftbilder für die Lokalzeitung',start:landSpotNear(apron[0]+12,apron[1],20)||apron,
    begin(m){m.car=spawnMissionCar('flugzeug',[...flugP(-170,FLUG.side*55),FLUG.h+Math.PI],{color:0xf4c430});m.stage=0;m.target=[m.car.x,m.car.z];m.got=new Set();
      missionText('Die Lokalzeitung braucht <b>Luftbilder</b>: Dom, Christuskirche, Zitadelle, Wiesbaden und das Reduit. Flieg <b>tief</b> (unter 200 m) darüber – die Kamera knipst automatisch.',9);},
    update(m){const P=mP(m);const c=m.car;if(c.dead||c.removed)return 'fail';if(m.stage===0){m.target=[c.x,c.z];if(P.car===c){m.stage=1;m.timer=480;}return;}
      const left=shots.filter(s=>!m.got.has(s[0]));m.marks=left.map(s=>s[1]);let best=left[0];for(const s of left)if(Math.hypot(s[1][0]-c.x,s[1][1]-c.z)<Math.hypot(best[1][0]-c.x,best[1][1]-c.z))best=s;m.target=best[1];
      for(const s of left){if(c.air&&c.alt<200&&Math.hypot(s[1][0]-c.x,s[1][1]-c.z)<140){m.got.add(s[0]);chime([1200,1500]);const fl=$('flash');if(fl){fl.hidden=false;setTimeout(()=>fl.hidden=true,120);}hint(`📸 Klick! <b>${s[0]}</b> im Kasten (${m.got.size}/${shots.length})`,3,P);}}
      if(m.got.size>=shots.length)return 'win';},
    end(m){m.marks=null;if(m.car)m.car.mission=false;},reward:2000,win:'Titelseite! „Meenz von oben“ – Fotos: Du.'});
  // Q: Jetski-Rallye
  const RL=RHINE_CUM[RHINE_CUM.length-1];const sIn=[];for(let s=0;s<RL;s+=10){const p=rhineAt(s);if(p.x>MINX+80&&p.x<MAXX-80&&p.z>MINZ+80&&p.z<MAXZ-80)sIn.push(s);}
  const wh=waterSpotNear(POI.winterhafen[0]+30,POI.winterhafen[1]+30)||waterSpotNear(POI.winterhafen[0],POI.winterhafen[1]);
  let s0=0;{let bd=1e9;for(const s of sIn){const p=rhineAt(s);const d=Math.hypot(p.x-POI.winterhafen[0],p.z-POI.winterhafen[1]);if(d<bd){bd=d;s0=s;}}}
  const jcp=[];for(let i=0;i<12;i++){const s=Math.max(sIn[0]||0,s0-120-i*170);const p=rhineAt(s);const o=(i%2?1:-1)*45;let x=p.x-p.dz*o,z=p.z+p.dx*o;if(!waterSpotNear(x,z,5)){x=p.x;z=p.z;}jcp.push([x,z]);}
  if(wh)MISSIONS.push({id:'jetski',tag:'Q',free:true,title:'Jetski-Rallye',start:landSpotNear(wh[0],wh[1],40)||freeSpot(POI.winterhafen[0],POI.winterhafen[1]),
    begin(m){m.car=spawnMissionCar('jetski',wh,{boat:true,color:0xffd400});m.stage=0;m.target=[m.car.x,m.car.z];m.buoys=[];missionText('Schnapp dir den <b>Jetski</b> und jag rheinabwärts durch alle <b>12 Bojen</b>. Die Uhr läuft ab dem Start!',7);},
    update(m){const P=mP(m);const c=m.car;if(c.dead||c.removed)return 'fail';if(m.stage===0){m.target=[c.x,c.z];if(P.car===c){m.stage=1;m.cp=0;m.timer=170;m.route=jcp;m.buoys=jcp.map(p=>buoyMesh(p[0],p[1]));m.target=jcp[0];}return;}
      if(P.car!==c){hint('Zurück auf den <b>Jetski</b>!',1,P);}
      m.buoys.forEach((b,i)=>{b.position.y=WATER_LEVEL-0.3+Math.sin(simTime*2+i)*0.08;b.visible=i>=m.cp;});
      if(Math.hypot(c.x-m.target[0],c.z-m.target[1])<14){m.cp++;chime([880]);if(m.cp>=jcp.length)return 'win';m.target=jcp[m.cp];m.route=jcp.slice(m.cp);missionText(`Boje ${m.cp}/${jcp.length}`,1.5);}},
    end(m){for(const b of m.buoys||[])scene.remove(b);if(m.car)m.car.mission=false;},reward:1500,win:'Rekord auf dem Rhein! Die Enten sind beeindruckt.'});
  // I: Eiszeit
  const iceSpots=[POI.markt,POI.schloss,POI.christus,POI.rtheater,POI.zitadelle].filter(Boolean).map(p=>roadSpot(p[0],p[1]).slice(0,2));
  MISSIONS.push({id:'eis',tag:'I',free:true,title:'Eiszeit in Meenz',start:roadSpot(POI.rathaus[0]-40,POI.rathaus[1]-40).slice(0,2),
    begin(m){m.car=spawnMissionCar('eiswagen',roadSpot(m.start[0]+6,m.start[1]+6));m.stage=0;m.n=0;m.target=[m.car.x,m.car.z];m.kids=[];missionText('Der Gelatiere hat Rücken. Fahr den <b>Eiswagen</b> zu vier Plätzen, halte an und verkauf Eis!',7);},
    update(m){const P=mP(m);const c=m.car;if(c.dead||c.removed)return 'fail';
      if(m.stage===0){m.target=[c.x,c.z];if(P.car===c){m.stage=1;m.timer=360;m.target=iceSpots[0];m.route=iceSpots;}return;}
      if(P.car!==c&&m.stage!==2){hint('Zurück in den <b>Eiswagen</b>!',1,P);return;}
      if(m.stage===1&&Math.hypot(c.x-m.target[0],c.z-m.target[1])<12&&Math.abs(c.speed)<1){m.stage=2;m.sell=7;chime([784,988,1175,988,784,659]);missionText('🍦 Eis-Bimmel! Die Kundschaft kommt…',3);
        for(let i=0;i<4;i++){const a=Math.random()*TAU;const [x,z]=freeSpot(c.x+Math.cos(a)*14,c.z+Math.sin(a)*14,0.4);const k=new Human('ped');k.x=x;k.z=z;k.y=groundY(x,z);k.state='wait';k.mission=true;k.sync();m.kids.push(k);}}
      if(m.stage===2){m.sell-=1/60;for(const k of m.kids){if(!k.alive)continue;const dx=c.x-k.x,dz=c.z-k.z;const d=Math.hypot(dx,dz);if(d>3.5){const mv=moveHuman(k,dx,dz,2.2,1/60);faceTo(k,dx,dz,1/60);k.animate(1/60,mv);k.sync();}else if(!k.paid){k.paid=true;G.money+=35;say(k,mpick(['Eimol Spundekäs-Eis, bitte!','Zwei Kugeln Woi-Sorbet!','Hast du auch Fleischworscht-Eis?','Schoki mit Streusel!']),2.5);}}
        if(m.sell<=0){for(const k of m.kids){k.mission=false;k.state='walk';}m.kids=[];m.n++;if(m.n>=4)return 'win';m.stage=1;m.target=iceSpots[m.n];m.route=iceSpots.slice(m.n);missionText(`Stand ${m.n}/4 verkauft – weiter!`,3);}}},
    end(m){for(const k of m.kids||[]){k.mission=false;k.state='walk';}if(m.car){m.car.mission=false;m.car.persist=false;}},reward:1200,win:'Ganz Meenz hat Hirnfrost. Gut gemacht!'});
  // O: Oldtimer-Überführung nach Wiesbaden
  const kurhaus=wbPlace(/Wiesbaden-Innenstadt|Wiesbaden-Mitte/,[-1896,-9641]);const kh=roadSpot(-1896,-9641);
  MISSIONS.push({id:'oldtimer',tag:'O',free:true,title:'Oldtimer-Überführung',start:roadSpot(POI.kupferberg[0]+20,POI.kupferberg[1]).slice(0,2),
    begin(m){m.car=spawnMissionCar('oldtimer',roadSpot(m.start[0]+6,m.start[1]),{color:0x2a5a4a,plate:'MZ-H 1958'});m.stage=0;m.target=[m.car.x,m.car.z];missionText('Ein Sammler in Wiesbaden hat diesen <b>Oldtimer</b> gekauft. Bring ihn zum <b>Kurhaus</b> – mit höchstens ein paar Kratzern!',8);},
    update(m){const P=mP(m);const c=m.car;if(c.dead||c.removed||c.health<55)return 'fail';if(m.stage===0){m.target=[c.x,c.z];if(P.car===c){m.stage=1;m.timer=420;m.target=kh.slice(0,2);}return;}
      if(P.car!==c)hint('Zurück in den <b>Oldtimer</b>!',1,P);else if(Math.floor(simTime)%7===0&&c.health<80)hint(`Zustand: <b>${Math.round(c.health)}%</b> – vorsichtig!`,1,P);
      if(Math.hypot(c.x-m.target[0],c.z-m.target[1])<14&&Math.abs(c.speed)<2&&P.car===c)return 'win';},
    end(m){if(m.car){m.car.mission=false;m.car.persist=false;}},reward:1800,win:'Der Sammler ist glücklich. „Gell, die Meenzer könne Auto fahrn!“'});
  // A: Unheimliche Begegnung
  MISSIONS.push({id:'ufojagd',tag:'A',free:true,title:'Unheimliche Begegnung',start:freeSpot(POI.zitadelle[0]+20,POI.zitadelle[1]+20,0.5),
    begin(m){ufoStart(true);UFO.mission=true;m.n=0;m.timer=300;missionText('Über Meenz kreist ein <b>UFO</b>! Komm ihm mit dem <b>Jetpack</b> oder Flugzeug auf <b>40 m</b> nahe und mach drei Beweisfotos.',8);},
    update(m){const P=mP(m);if(!UFO.on)return 'fail';m.target=[UFO.x,UFO.z];const [px,pz]=ppos(P);const py=P.car?P.car.y:P.h.y;
      if(UFO.phase==='schweben'&&Math.hypot(UFO.x-px,UFO.y-py,UFO.z-pz)<40){m.n++;chime([1200,1500]);const fl=$('flash');if(fl){fl.hidden=false;setTimeout(()=>fl.hidden=true,120);}hint(`📸 Beweisfoto ${m.n}/3!`,2,P);if(m.n>=3){UFO.phase='flucht';UFO.t=0;return 'win';}ufoRelocate();}},
    end(m){UFO.mission=false;},reward:3000,win:'Die Fotos gehen um die Welt. „Meenz – wo selbst Aliens Fastnacht feiern.“'});
  for(let i=L0;i<MISSIONS.length;i++){const m=MISSIONS[i];const b=beacon();setBeacon(b,m.start[0],m.start[1]);b.userData.m=m;startBeacons.push(b);}}
function ufoRelocate(){const [px,pz]=ppos(P1);const a=Math.random()*TAU;UFO.tx=px+Math.cos(a)*260;UFO.tz=pz+Math.sin(a)*260;UFO.phase='anflug';UFO.t=0;}
