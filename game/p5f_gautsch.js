// ===================== 27 JOHANNISNACHT: GAUTSCHEN (Gutenbergplatz) =====================
// Abends (20:00–23:30) oder per Mission: Bütte, Bühne, Johannisfest-Stände und Publikum am Gutenberg-Denkmal.
// Minispiel: Druckerlehrlinge fliehen, E fängt einen, E an der Bütt tunkt ihn ein. Zeit um → Gautschbrief + Geld.
// Alle Figuren sind fiktiv; das Publikum jubelt mit Armen höchstens ~30° über der Waagerechten.
const GAUTSCH={on:false,forced:false,built:false,grp:null,tub:null,stage:null,stands:[],apprentices:[],crowd:[],vendors:[],meister:null,
  running:false,timer:0,dunked:0,score:0,total:0,result:null,round:0,carry:null,cool:0,linger:0,cheerT:0,briefT:0,hud:null,brief:null,
  T0:20*60,T1:23*60+30,ROUND_T:90,N:5,ARENA:24,CATCH_R:2.2,DUNK_R:3.6,FLEE_SPEED:4.3,PAY:40,ALL_BONUS:150,START_R:18,
  SPAWN_R:450,DESPAWN_R:650,COOL:60,LINGER:25};

const GAUTSCH_STANDS=[
  {name:'Spundekäs & Brezel',roof:0x2f5d3a,goods:0xb06a2a,cry:['Spundekäs, frisch gerührt!','Brezel, so groß wie en Lenkrad!']},
  {name:'Fleischworscht-Bud',roof:0x7a2630,goods:0xc4565a,cry:['Fleischworscht im Weck – de Johannis-Klassiker!','Mit Senf oder mit Liebe?']},
  {name:'Woi-Bar Johannisnacht',roof:0x2c3f6e,goods:0xf0d878,cry:['Riesling vom Rhoi, eiskalt!','En Schoppe für die frische Gesellen!']},
  {name:'Handkäs mit Musik',roof:0x8a6a1e,goods:0xe8d8a0,cry:['Handkäs mit Musik – die Musik kimmt später!','Zwiebeln extra, für die Mutige!']},
  {name:'Grumbeerepuffer',roof:0x1f5f63,goods:0xd9a441,cry:['Grumbeerepuffer mit Apfelmus!','Fettig, heiß un gut!']}];
const GAUTSCH_NAMES=['Kalle Bleisatz','Fritzi Fraktur','Ole Offset','Paulinche Punkt','Jupp Antiqua','Mia Majuskel'];
const GAUTSCH_LINES={
  meisterOpen:'Packt aa, Gesellen! Die Lehrlinge solle getauft wern – rein in die Bütt!',
  meisterDunk:['Der is getauft! Gut Druck!','Sauber! De Nächste!','So mache mir des in Meenz!'],
  meisterWin:'Gautschbrief is ausgestellt! Gut Druck, ihr Gesellen!',meisterFail:'Kein Einziger?! Ei, des war nix.',
  taunt:['Mich kriegste net!','Ich bin doch noch gar net fertig mit de Lehr!','Ich hab Wasser-Allergie!','Bitte net in die Bütt, die is so kalt!','Ätschebätsch!','Fang mich doch, du lahm Ent!'],
  caught:['NEIN! LASS MICH RUNNER!','Hilfe! Mama!','Ich zahl dir en Schoppe, wenn de mich loslässt!','Des is Entführung! … Oder Tradition?'],
  dunked:['BLUBB! … KALT!!','Pfff – ich bin getauft!','Jetzt bin ich Geselle! Glaub ich.','Mei Schürz is nass!'],
  cheer:['REIN MIT DEM!','GAUTSCH EN, GAUTSCH EN!','HOCH SOLL ER LEBE!','Jetzt isser en echter Drucker!','Des Wasser is kalt, gell?!','BRAVO, MEISTER!','Nass wie en Pudel!','Gut Druck!'],
  chase:['Fang en doch!','Der is schneller als du!','Hopp, hopp, hopp!','Links! Nee, rechts!','Hinne rum, hinne rum!','Uffbasse, der hippt!']};

const _gauG={sign:new THREE.PlaneGeometry(1,1),water:new THREE.CircleGeometry(1,20).rotateX(-Math.PI/2),
  hat:new THREE.ConeGeometry(0.17,0.2,4),apron:new THREE.BoxGeometry(0.34,0.62,0.03)};
const _gauM={wood:stdMat({vertexColors:true,roughness:0.8}),glow:new THREE.MeshBasicMaterial({vertexColors:true}),
  water:stdMat({color:0x3f86b0,roughness:0.08,metalness:0.1}),paper:cmat(0xf4f1e8,0.95),apron:cmat(0x9a8f7a,0.9)};
const _gauC=hex=>{const c=new THREE.Color(hex);return {r:c.r,g:c.g,b:c.b};};

// ---------- Aufstellung (einmalig in setupGautsch, ohne Meshes) ----------
function gautschFree(x,z,r){for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const i=idx(x+dx,z+dz);if(i<0||hgG(i)||(mfG(i)&6))return false;}return true;}
function gautschLayout(){const M=(OSM.pl&&OSM.pl.gutdenk)||[-172.2,-5.2];let tub=null;
  for(let r=0;r<30&&!tub;r++)for(let k=0;k<24&&!tub;k++){const a=k/24*TAU,x=M[0]+9+Math.sin(a)*r,z=M[1]+3+Math.cos(a)*r;if(gautschFree(x,z,4))tub=[x,z];}
  if(!tub)tub=freeSpot(M[0]+9,M[1]+3,3);
  const T=GAUTSCH.tub={x:tub[0],z:tub[1],r:1.3};
  for(let k=0;k<16&&!GAUTSCH.stage;k++){const a=k/16*TAU,x=T.x+Math.sin(a)*4.8,z=T.z+Math.cos(a)*4.8;if(gautschFree(x,z,2))GAUTSCH.stage={x,z,a:Math.atan2(T.x-x,T.z-z)};}
  if(!GAUTSCH.stage)GAUTSCH.stage={x:T.x+4.8,z:T.z,a:-Math.PI/2};
  const S=GAUTSCH.stage,cand=[];
  for(let z=-26;z<=26;z+=2)for(let x=-26;x<=26;x+=2){const d=Math.hypot(x,z);if(d>=11&&d<=26)cand.push([T.x+x,T.z+z,d]);}
  cand.sort((a,b)=>a[2]-b[2]);
  for(const [x,z] of cand){if(GAUTSCH.stands.length>=GAUTSCH_STANDS.length)break;if(!gautschFree(x,z,3))continue;
    if(GAUTSCH.stands.some(s=>Math.hypot(s.x-x,s.z-z)<7)||Math.hypot(x-S.x,z-S.z)<7)continue;
    GAUTSCH.stands.push(Object.assign({x,z,a:Math.atan2(T.x-x,T.z-z)},GAUTSCH_STANDS[GAUTSCH.stands.length]));}
  // Hindernisse, denen die Figuren ausweichen (die Bauten blockieren das Raster nicht, weil sie nur zum Fest stehen)
  GAUTSCH.obst=[{x:T.x,z:T.z,r:T.r+0.9},{x:S.x,z:S.z,r:2.7},...GAUTSCH.stands.map(s=>({x:s.x,z:s.z,r:2.3}))];}

// ---------- Bauten: alles in Weltkoordinaten zu wenigen Meshes zusammengefasst ----------
function gautschSignMat(text){const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');
  x.fillStyle='#24402a';x.fillRect(0,0,512,96);x.strokeStyle='#e8c66a';x.lineWidth=6;x.strokeRect(5,5,502,86);
  x.fillStyle='#f6e7b0';x.font='bold 44px Georgia,serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,50,480);
  const t=freeAfterUpload(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:0.8});}
function gautschSign(g,text,x,y,z,a,w,h){const m=new THREE.Mesh(_gauG.sign,gautschSignMat(text));m.scale.set(w,h,1);m.position.set(x,y,z);m.rotation.y=a;g.add(m);return m;}
function gautschBuild(){const g=GAUTSCH.grp=new THREE.Group();g.visible=false;scene.add(g);const wood=new GB(),glow=new GB();
  const L=(o,lx,lz)=>{const c=Math.cos(o.a),s=Math.sin(o.a);return [o.x+c*lx+s*lz,o.z-s*lx+c*lz];};
  const box=(gb,o,y0,lx,lz,w,h,d,col)=>{const [x,z]=L(o,lx,lz);gb.box(x,o.y+y0,z,w,h,d,o.a,col);};
  const dark=_gauC(0x5a3d24),light=_gauC(0xb08a5a),metal=_gauC(0x3a3a3a);
  for(const s of GAUTSCH.stands){const o={x:s.x,z:s.z,a:s.a,y:groundY(s.x,s.z)};const roof=_gauC(s.roof);
    box(wood,o,0,0,0.6,3.0,1.0,0.7,dark);box(wood,o,1.0,0,0.65,3.2,0.06,0.85,light);       // Theke
    box(wood,o,0,0,-0.9,3.0,2.3,0.1,dark);                                                  // Rückwand
    for(const px of [-1.5,1.5])for(const pz of [-0.9,0.95])box(wood,o,0,px,pz,0.1,2.45,0.1,light);
    const P3=(lx,y,lz)=>{const [x,z]=L(o,lx,lz);return [x,o.y+y,z];};
    wood.beam(P3(0,2.95,0.02),P3(0,2.32,1.32),3.5,0.06,roof);wood.beam(P3(0,2.95,0.02),P3(0,2.32,-1.3),3.5,0.06,roof); // Satteldach
    for(let i=0;i<5;i++)box(wood,o,1.03,-1.1+i*0.55,0.65,0.3,0.14,0.22,_gauC(s.goods));       // Ware auf der Theke
    wood.beam(P3(-1.7,2.22,1.3),P3(1.7,2.22,1.3),0.015,0.015,metal);                          // Lampionschnur
    for(let i=0;i<7;i++)box(glow,o,2.05,-1.5+i*0.5,1.3,0.14,0.16,0.14,_gauC([0xffd27a,0xff9a3c,0xff5a4a][i%3]));
    const [sx,sz]=L(o,0,1.06);gautschSign(g,s.name,sx,o.y+1.75,sz,o.a,2.8,0.5);}
  // Bütte: Dauben und zwei Eisenreifen, Wasser als Scheibe
  const T=GAUTSCH.tub,ty=groundY(T.x,T.z),N=18;
  for(let i=0;i<N;i++){const a=i/N*TAU,x=T.x+Math.sin(a)*T.r,z=T.z+Math.cos(a)*T.r;wood.box(x,ty,z,2*T.r*Math.sin(Math.PI/N)+0.02,1.0,0.09,a,i%2?dark:_gauC(0x6b4a2c));
    for(const hy of [0.18,0.78])wood.box(T.x+Math.sin(a)*(T.r+0.05),ty+hy,T.z+Math.cos(a)*(T.r+0.05),2*T.r*Math.sin(Math.PI/N)+0.03,0.06,0.03,a,metal);}
  const w=new THREE.Mesh(_gauG.water,_gauM.water);w.scale.setScalar(T.r-0.04);w.position.set(T.x,ty+0.82,T.z);g.add(w);GAUTSCH.water=w;
  // Bühne mit nassem Schwamm und Banner
  const S=GAUTSCH.stage,so={x:S.x,z:S.z,a:S.a,y:groundY(S.x,S.z)};S.y=so.y+0.6;
  box(wood,so,0,0,0,4.2,0.6,3.0,light);box(wood,so,0,0,1.75,1.2,0.3,0.5,dark);box(wood,so,0.6,1.2,0.6,0.8,0.22,0.6,_gauC(0xe6c84a));
  for(const px of [-1.9,1.9])box(wood,so,0.6,px,-1.3,0.12,2.9,0.12,dark);
  const [bx,bz]=L(so,0,-1.24);gautschSign(g,'JOHANNISNACHT · GAUTSCHEN',bx,so.y+3.05,bz,so.a,3.8,0.62);
  for(const [G2,mat] of [[wood,_gauM.wood],[glow,_gauM.glow]]){const m=new THREE.Mesh(G2.geo(),mat);m.castShadow=G2===wood;m.receiveShadow=true;g.add(staticMesh(m));}
  GAUTSCH.built=true;}

// ---------- Figuren ----------
function gautschHuman(x,z,face,role){const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.facing=face;h.state='gautsch';h.mission=true;
  h.ga={role,home:[x,z],face,act:'idle',actT:0,evT:mr(2,10),dodge:0,side:Math.random()<0.5?1:-1};h.sync();return h;}
function gautschSpot(cx,cz,r0,r1,minGap,list){for(let k=0;k<40;k++){const a=Math.random()*TAU,r=mr(r0,r1),x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r;
  if(blocked(x,z,0.5)||GAUTSCH.obst.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+0.4))continue;if(list.some(h=>Math.hypot(h.ga.home[0]-x,h.ga.home[1]-z)<minGap))continue;return [x,z];}return null;}
function gautschCrowdSize(){return LOWMEM||QUALITY==='mittel'||QUALITY==='niedrig'?7:12;}
function gautschSpawn(){if(!GAUTSCH.built)gautschBuild();const T=GAUTSCH.tub,S=GAUTSCH.stage;
  for(const s of GAUTSCH.stands){const fx=Math.sin(s.a),fz=Math.cos(s.a);const h=gautschHuman(s.x-fx*0.2,s.z-fz*0.2,s.a,'vendor');h.ga.stand=s;h.npcName=mpick(NPC_NAMES)+' vom Johannisfest';GAUTSCH.vendors.push(h);}
  for(let i=0;i<gautschCrowdSize();i++){const p=gautschSpot(T.x,T.z,4.2,7.5,1.1,GAUTSCH.crowd);if(!p)continue;const h=gautschHuman(p[0],p[1],Math.atan2(T.x-p[0],T.z-p[1]),'crowd');GAUTSCH.crowd.push(h);}
  const m=GAUTSCH.meister=gautschHuman(S.x,S.z,S.a,'meister');m.y=S.y;m.npcName='Gautschmeister Hannes Winkelhaken';
  const hat=new THREE.Mesh(_gauG.hat,_gauM.paper);hat.position.set(0,0.93,0);hat.rotation.y=Math.PI/4;m.hips.add(hat);m.sync();
  GAUTSCH.on=true;}
function gautschApprentice(i){const T=GAUTSCH.tub;const p=gautschSpot(T.x,T.z,6,12,2,GAUTSCH.apprentices)||freeSpot(T.x+7,T.z,0.5);
  const h=gautschHuman(p[0],p[1],Math.random()*TAU,'lehrling');h.ga.act='flee';h.npcName='Lehrling '+GAUTSCH_NAMES[i%GAUTSCH_NAMES.length];h.walkSpeed=1.3;
  const hat=new THREE.Mesh(_gauG.hat,_gauM.paper);hat.position.set(0,0.93,0);hat.rotation.y=Math.PI/4;h.hips.add(hat);
  const ap=new THREE.Mesh(_gauG.apron,_gauM.apron);ap.position.set(0,-0.08,0.13);h.hips.add(ap);GAUTSCH.apprentices.push(h);return h;}
function gautschAll(){return [...GAUTSCH.apprentices,...GAUTSCH.crowd,...GAUTSCH.vendors,...(GAUTSCH.meister?[GAUTSCH.meister]:[])];}
function gautschDespawn(){if(GAUTSCH.running)gautschFinish(true);GAUTSCH.carry=null;for(const h of gautschAll())if(!h.removed)h.remove();
  GAUTSCH.apprentices=[];GAUTSCH.crowd=[];GAUTSCH.vendors=[];GAUTSCH.meister=null;GAUTSCH.on=false;GAUTSCH.forced=false;GAUTSCH.linger=0;GAUTSCH.cool=0;if(GAUTSCH.grp)GAUTSCH.grp.visible=false;gautschHud();}

// ---------- Runde ----------
function gautschBeginRound(){if(GAUTSCH.running)return;for(const h of GAUTSCH.apprentices)if(!h.removed)h.remove();GAUTSCH.apprentices=[];
  for(let i=0;i<GAUTSCH.N;i++)gautschApprentice(i);
  Object.assign(GAUTSCH,{running:true,timer:GAUTSCH.ROUND_T,dunked:0,score:0,total:GAUTSCH.N,result:null,carry:null});GAUTSCH.round++;
  if(GAUTSCH.meister)say(GAUTSCH.meister,GAUTSCH_LINES.meisterOpen,4.5,'loud');
  showBig('GAUTSCHEN!','mission',3,'Fang die Lehrlinge (E) – ab in die Bütt!');chime([523,659,784]);}
function gautschStart(){GAUTSCH.forced=true;GAUTSCH.linger=0;if(!GAUTSCH.on)gautschSpawn();gautschBeginRound();return GAUTSCH.round;}
function gautschFinish(aborted=false){if(!GAUTSCH.running)return;if(GAUTSCH.carry)gautschRelease();
  const n=GAUTSCH.dunked,tot=GAUTSCH.total;if(!aborted&&n===tot&&tot>0)GAUTSCH.score+=GAUTSCH.ALL_BONUS;const money=aborted?0:GAUTSCH.score;
  Object.assign(GAUTSCH,{running:false,timer:0,cool:GAUTSCH.COOL});GAUTSCH.result={round:GAUTSCH.round,dunked:n,total:tot,money,brief:!aborted&&n>0,aborted};
  if(GAUTSCH.forced){GAUTSCH.forced=false;GAUTSCH.linger=GAUTSCH.LINGER;}
  if(aborted)return;G.money+=money;
  if(n>0){G.gautschBriefe=(G.gautschBriefe||0)+1;showBig('GAUTSCHBRIEF!','win',4,`${n}/${tot} Lehrlinge gegautscht · + €${money}`);chime([523,659,784,1046]);gautschBriefShow(n,tot,money);GAUTSCH.cheerT=4;
    if(GAUTSCH.meister)say(GAUTSCH.meister,GAUTSCH_LINES.meisterWin,4,'loud');}
  else{showBig('ZEIT UM','fail',3,'Kein Lehrling in de Bütt.');if(GAUTSCH.meister)say(GAUTSCH.meister,GAUTSCH_LINES.meisterFail,4,'loud');}
  for(const h of GAUTSCH.apprentices)if(h.alive&&h.ga.act==='flee'&&Math.random()<0.6)say(h,'Ätsch! Nächstes Jahr wieder!',3);}

// ---------- Fangen, Tragen, Eintunken ----------
function gautschCatchable(P){let best=null,bd=GAUTSCH.CATCH_R;
  for(const h of GAUTSCH.apprentices){if(!h.alive||h.removed||h.state!=='gautsch'||h.ga.act!=='flee')continue;const d=Math.hypot(h.x-P.h.x,h.z-P.h.z);if(d<bd){bd=d;best=h;}}return best;}
function gautschWantsE(P){if(!GAUTSCH.on||!P||!P.h||P.car||P.gameOver||P.h.room)return false;if(GAUTSCH.carry&&GAUTSCH.carry.P===P)return true;return GAUTSCH.running&&!GAUTSCH.carry&&!!gautschCatchable(P);}
function gautschCatch(P,h){h.ga.act='carried';GAUTSCH.carry={P,h};h.setExpr('surprised');say(h,mpick(GAUTSCH_LINES.caught),2.5,'loud');
  hint('Gepackt! <b>E</b> an de <b>Bütt</b>: Lehrling eintunke!',3,P);chime([660,880]);}
function gautschFreeArms(P){if(P&&P.h){P.h.armL.rotation.z=0;P.h.armR.rotation.z=0;}}
function gautschRelease(){const C=GAUTSCH.carry;GAUTSCH.carry=null;if(!C)return;gautschFreeArms(C.P);const h=C.h;h.g.rotation.z=0;h.g.rotation.x=0;
  if(h.removed)return;h.y=groundY(h.x,h.z);h.ga.act='flee';h.sync();}
function gautschThrow(P){const h=GAUTSCH.carry.h;GAUTSCH.carry=null;gautschFreeArms(P);h.ga.act='fly';h.ga.t=0;h.ga.from=[h.x,h.y,h.z];say(h,'NEEEEIN!',1.5,'loud');}
function gautschAction(P){if(!gautschWantsE(P))return false;const T=GAUTSCH.tub;
  if(GAUTSCH.carry){if(Math.hypot(P.h.x-T.x,P.h.z-T.z)<GAUTSCH.DUNK_R)gautschThrow(P);else hint('Näher an die <b>Bütt</b>, dann <b>E</b>!',2,P);return true;}
  const h=gautschCatchable(P);if(h)gautschCatch(P,h);return !!h;}
function gautschDunk(h){const T=GAUTSCH.tub,ty=groundY(T.x,T.z);h.ga.act='bath';h.ga.actT=1.6;h.g.rotation.z=0;h.g.rotation.x=0;
  for(let i=0;i<30;i++)spawnPart(T.x+mr(-0.5,0.5),ty+0.9,T.z+mr(-0.5,0.5),{color:mpick([0xbfe4ff,0x8cc8f0,0xffffff]),size:mr(0.12,0.3),vx:mr(-2.5,2.5),vy:mr(2,5),vz:mr(-2.5,2.5),life:0.8,grow:0.2});
  GAUTSCH.dunked++;GAUTSCH.score+=GAUTSCH.PAY+Math.round(GAUTSCH.timer/3);GAUTSCH.cheerT=2.8;
  say(h,mpick(GAUTSCH_LINES.dunked),2.6,'loud');h.setExpr('surprised');if(GAUTSCH.meister)say(GAUTSCH.meister,mpick(GAUTSCH_LINES.meisterDunk),2.6,'loud');
  for(const c of GAUTSCH.crowd)if(Math.random()<0.35)say(c,mpick(GAUTSCH_LINES.cheer),2.2,'loud');
  gautschSfx('splash');gautschSfx('cheer');hint(`Gegautscht! <b>${GAUTSCH.dunked}/${GAUTSCH.total}</b>`,2);}

// ---------- Verhalten ----------
// Einzelzuweisung statt rotation.set(), damit die Pose auch im three-Stub messbar ist
function gautschArm(a,x,z){a.rotation.x=x;a.rotation.y=0;a.rotation.z=z;}
// Jubeln: beide Arme gleichzeitig seitlich schwenken, Hand höchstens ~23° über der Waagerechten –
// nie senkrecht und nie ein einzelner Arm schräg nach vorn oben
function gautschCheerPose(h,t){const k=Math.sin(t*9+h.phase)*0.5+0.5,z=1.55+0.45*k;gautschArm(h.armL,-0.25,z);gautschArm(h.armR,-0.25,-z);
  h.hips.position.y=0.92+Math.abs(Math.sin(t*8+h.phase))*0.04;}
function gautschClapPose(h,t){const k=Math.sin(t*14+h.phase);gautschArm(h.armL,-1.25,-0.25-0.15*k);gautschArm(h.armR,-1.25,0.25+0.15*k);}
function gautschAvoid(x,z){let ax=0,az=0;for(const o of GAUTSCH.obst){const dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz)||0.01;if(d<o.r+1.2){const k=(o.r+1.2-d)/(o.r+1.2)*3;ax+=dx/d*k;az+=dz/d*k;}}return [ax,az];}
function gautschFlee(h,dt){const ga=h.ga,T=GAUTSCH.tub;const P=nearestPlayer(h.x,h.z);const [px,pz]=ppos(P);const dx=h.x-px,dz=h.z-pz,d=Math.hypot(dx,dz)||0.01;let mv=0;
  if(GAUTSCH.running&&d<9){let ax=dx/d,az=dz/d;const cx=h.x-T.x,cz=h.z-T.z,cd=Math.hypot(cx,cz)||0.01;const out=Math.max(0,(cd-(GAUTSCH.ARENA-6))/6);
    ax-=cx/cd*out*1.6;az-=cz/cd*out*1.6;const [ox,oz]=gautschAvoid(h.x,h.z);ax+=ox;az+=oz;
    const a=Math.atan2(ax,az)+ga.dodge;const fx=Math.sin(a),fz=Math.cos(a);
    if(blocked(h.x+fx*1.4,h.z+fz*1.4)){ga.dodge+=ga.side*dt*6;if(Math.abs(ga.dodge)>2.6){ga.side=-ga.side;ga.dodge=0;}}else ga.dodge*=Math.max(0,1-dt*1.5);
    mv=moveHuman(h,fx,fz,GAUTSCH.FLEE_SPEED,dt);if(!mv){ga.dodge+=ga.side*dt*8;if(Math.abs(ga.dodge)>3.1){ga.side=-ga.side;ga.dodge=0;}}faceTo(h,fx,fz,dt,10);/* festgeklemmt (Hindernis näher als die 1,4-m-Vorausschau) → Richtung durchdrehen */if(Math.random()<dt*0.3&&!h.bubble)say(h,mpick(GAUTSCH_LINES.taunt),2.2);}
  else{const hx=ga.home[0]-h.x,hz=ga.home[1]-h.z;if(Math.hypot(hx,hz)>1.5&&d>5){mv=moveHuman(h,hx,hz,1.4,dt);faceTo(h,hx,hz,dt,6);}else faceTo(h,-dx,-dz,dt,4);}
  h.animate(dt,mv);if(!mv&&GAUTSCH.running)gautschArm(h.armR,0,-1.2-Math.sin(simTime*7+h.phase)*0.3);else h.armR.rotation.z=0;// Lehrling winkt frech zur Seite
  h.y=groundY(h.x,h.z);h.sync();}
function gautschCarried(h,dt){const P=GAUTSCH.carry.P,ph=P.h;if(P.car||P.gameOver||ph.room||ph.state==='knock'){gautschRelease();return;}
  const f=ph.facing;h.facing=f;h.x=ph.x+Math.cos(f)*0.95;h.z=ph.z-Math.sin(f)*0.95;h.y=ph.y+1.62;h.animate(dt,0);
  const t=simTime*11+h.phase;h.legL.rotation.x=Math.sin(t)*0.5;h.legR.rotation.x=-Math.sin(t)*0.5;h.armL.rotation.x=-0.6+Math.cos(t)*0.4;h.armR.rotation.x=-0.6-Math.cos(t)*0.4;
  h.sync();h.g.rotation.z=Math.PI/2;
  gautschArm(ph.armL,-1.6,0.15);gautschArm(ph.armR,-1.6,-0.15);
  if(Math.random()<dt*0.5&&!h.bubble)say(h,mpick(GAUTSCH_LINES.caught),2);}
function gautschFly(h,dt){const ga=h.ga,T=GAUTSCH.tub,ty=groundY(T.x,T.z);ga.t+=dt;const k=Math.min(1,ga.t/0.6),[x0,y0,z0]=ga.from;
  h.x=x0+(T.x-x0)*k;h.z=z0+(T.z-z0)*k;h.y=y0+(ty-0.4-y0)*k+Math.sin(Math.PI*k)*1.4;h.sync();h.g.rotation.z=Math.PI/2*(1-k);h.g.rotation.x=k*TAU;
  if(k>=1)gautschDunk(h);}
function gautschBath(h,dt){const ga=h.ga,T=GAUTSCH.tub,ty=groundY(T.x,T.z);ga.actT-=dt;h.x=T.x;h.z=T.z;h.y=ty-0.4+Math.sin(simTime*6)*0.08;h.animate(dt,0);
  gautschArm(h.armL,-1.2+Math.sin(simTime*12)*0.4,0.3);gautschArm(h.armR,-1.2-Math.sin(simTime*12)*0.4,-0.3);h.sync();
  if(ga.actT<=0){const p=gautschSpot(T.x,T.z,2.8,4.2,0.9,GAUTSCH.apprentices.filter(o=>o.ga.act==='wet'))||[T.x+3,T.z];
    const dx=p[0]-T.x,dz=p[1]-T.z,L=Math.hypot(dx,dz)||1;h.x=T.x+dx/L*(T.r+0.6);h.z=T.z+dz/L*(T.r+0.6);ga.home=p;ga.act='wet';h.setExpr('laugh');h.y=groundY(h.x,h.z);h.sync();}}
function gautschWet(h,dt){const ga=h.ga,T=GAUTSCH.tub;const hx=ga.home[0]-h.x,hz=ga.home[1]-h.z;let mv=0;
  if(Math.hypot(hx,hz)>0.4){mv=moveHuman(h,hx,hz,1.2,dt);faceTo(h,hx,hz,dt,6);}else faceTo(h,T.x-h.x,T.z-h.z,dt,4);h.animate(dt,mv);
  if(GAUTSCH.cheerT>0&&!mv)gautschCheerPose(h,simTime);
  if(Math.random()<dt*3)spawnPart(h.x+mr(-0.2,0.2),h.y+mr(0.4,1.4),h.z+mr(-0.2,0.2),{color:0x9fd2f5,size:0.06,vy:-2,life:0.4});
  h.y=groundY(h.x,h.z);h.sync();}
function gautschSpectator(h,dt){const ga=h.ga,t=simTime;ga.evT-=dt;h.animate(dt,0);
  if(ga.role==='meister')h.y=GAUTSCH.stage.y;else h.y=groundY(h.x,h.z);
  if(ga.role!=='vendor')faceTo(h,GAUTSCH.tub.x-h.x,GAUTSCH.tub.z-h.z,dt,3);
  if(GAUTSCH.cheerT>0&&ga.role!=='vendor'){gautschCheerPose(h,t);h.setExpr('laugh');}
  else if(GAUTSCH.running&&ga.role==='crowd'&&Math.sin(t*0.7+h.phase)>0.3)gautschClapPose(h,t);
  else{h.hips.position.y=0.92;h.armL.rotation.z*=0.9;h.armR.rotation.z*=0.9;}
  if(ga.evT<=0){ga.evT=mr(8,18);if(minPlayerDist(h.x,h.z)<45&&!h.bubble){
    if(ga.role==='vendor')say(h,mpick(ga.stand.cry),3);else if(ga.role==='crowd'&&GAUTSCH.running)say(h,mpick(GAUTSCH_LINES.chase),2.4,'loud');}}
  h.sync();}
function gautschReclaim(h){// nach Rempler/Sturz: zurück ins Fest statt als normaler Passant weiterzulaufen
  if(h.alive&&(h.state==='flee'||h.state==='walk')){h.state='gautsch';h.g.rotation.x=0;h.g.rotation.z=0;if(h.ga.act==='carried'||h.ga.act==='fly')h.ga.act='flee';}}

// ---------- HUD, Gautschbrief, Ton ----------
function gautschHud(){let el=GAUTSCH.hud;if(!el){el=GAUTSCH.hud=document.createElement('div');el.id='gautschHud';
    el.style.cssText='position:fixed;top:64px;left:50%;transform:translateX(-50%);padding:6px 14px;border-radius:8px;background:rgba(20,30,22,0.78);color:#f6e7b0;font:bold 16px Georgia,serif;z-index:30;pointer-events:none;white-space:nowrap';
    el.hidden=true;document.body.appendChild(el);}
  if(!GAUTSCH.running){el.hidden=true;return;}const s=Math.max(0,Math.ceil(GAUTSCH.timer));
  el.textContent=`Gautschen · ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} · ${GAUTSCH.dunked}/${GAUTSCH.total} in de Bütt`;el.hidden=false;}
function gautschBriefShow(n,tot,money){let el=GAUTSCH.brief;if(!el){el=GAUTSCH.brief=document.createElement('div');el.id='gautschBrief';
    el.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);width:min(420px,86vw);padding:14px 18px;border:3px double #7a4a1a;border-radius:4px;background:#f3e6c4;color:#3a2410;font:15px Georgia,serif;text-align:center;z-index:31;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,0.45)';
    document.body.appendChild(el);}
  el.innerHTML=`<div style="font-size:22px;font-weight:bold;letter-spacing:2px">GAUTSCHBRIEF</div>`+
    `<div style="margin-top:6px">Kund un zu wisse sei: Am Johannistag zu Meenz wurde${n>1?'n':''} <b>${n} von ${tot}</b> Lehrling${n>1?'e':''} ordnungsgemäß in die Bütt getunkt un damit zum Gesellen gemacht.</div>`+
    `<div style="margin-top:6px">Gautschgeld: <b>€${money}</b> · Gut Druck!</div><div style="margin-top:6px;font-style:italic">gez. Hannes Winkelhaken, Gautschmeister</div>`;
  el.hidden=false;GAUTSCH.briefT=7;}
function gautschSfx(kind){const ctx=AUD.ctx;if(!ctx)return;const T=GAUTSCH.tub;const d=minPlayerDist(T.x,T.z);if(d>60)return;const vol=Math.max(0.05,1-d/60),t=ctx.currentTime;
  const s=ctx.createBufferSource();s.buffer=AUD.noise;const f=ctx.createBiquadFilter();const g=ctx.createGain();
  if(kind==='splash'){f.type='lowpass';f.frequency.setValueAtTime(2400,t);f.frequency.exponentialRampToValueAtTime(300,t+0.6);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.35*vol,t+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t+0.7);}
  else{f.type='bandpass';f.frequency.value=800;f.Q.value=0.7;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.22*vol,t+0.25);g.gain.exponentialRampToValueAtTime(0.0001,t+2.2);}
  s.connect(f);f.connect(g);g.connect(AUD.master);s.start(t);s.stop(t+2.3);}

// ---------- Einhängen: E-Taste, Gesprächskandidat, Passanten-Update ----------
const _gauTalkCandidate=talkCandidate;
talkCandidate=function(P){return gautschWantsE(P)?null:_gauTalkCandidate(P);};
const _gauUpdatePed=updatePed;
updatePed=function(p,dt){if(p.state!=='gautsch')_gauUpdatePed(p,dt);};
addEventListener('keydown',e=>{if(e.code!=='KeyE'||e.repeat||mode!=='play'||TALK||SHOP_UI.open)return;gautschAction(P1);},true);

// ---------- Mission + Startmarker ----------
function gautschMission(){const T=GAUTSCH.tub;const start=freeSpot(T.x-8,T.z-7,0.5);
  return {id:'gautschen',tag:'N',free:true,title:'Johannisnacht: Gautschen',start,
    begin(m){m.round=gautschStart();missionText('Fang die <b>Druckerlehrlinge</b> (<b>E</b>) un tunk se in die <b>Bütt</b> – bevor die Zeit abläuft!',7);},
    update(m){const R=GAUTSCH.result;if(R&&R.round===m.round)return R.dunked>0&&!R.aborted?'win':'fail';if(!GAUTSCH.on)return 'fail';
      const left=GAUTSCH.apprentices.filter(h=>h.alive&&!h.removed&&h.ga.act==='flee');m.marks=left.map(h=>[h.x,h.z]);
      m.target=GAUTSCH.carry?[T.x,T.z]:left.length?[left[0].x,left[0].z]:null;},
    end(m){m.marks=null;},reward:100,win:'Gautschbrief erhalte – die Lehrlinge sin jetzt Gesellen!'};}

function setupGautsch(){gautschLayout();const m=gautschMission();MISSIONS.push(m);const b=beacon();setBeacon(b,m.start[0],m.start[1]);b.userData.m=m;startBeacons.push(b);
  Object.assign(GAUTSCH,{start:gautschStart,stop:gautschDespawn,finish:gautschFinish,action:gautschAction,wantsE:gautschWantsE});}

// ---------- Steuerung ----------
function updateGautsch(dt){const m=gameMin,inWin=m>=GAUTSCH.T0&&m<GAUTSCH.T1;if(!GAUTSCH.tub)return;const T=GAUTSCH.tub,pd=minPlayerDist(T.x,T.z);
  GAUTSCH.cool=Math.max(0,GAUTSCH.cool-dt);GAUTSCH.linger=Math.max(0,GAUTSCH.linger-dt);GAUTSCH.cheerT=Math.max(0,GAUTSCH.cheerT-dt);
  if(GAUTSCH.briefT>0){GAUTSCH.briefT-=dt;if(GAUTSCH.briefT<=0&&GAUTSCH.brief)GAUTSCH.brief.hidden=true;}
  const want=inWin||GAUTSCH.forced||GAUTSCH.linger>0;
  if(!GAUTSCH.on&&inWin&&pd<GAUTSCH.SPAWN_R)gautschSpawn();
  if(GAUTSCH.on&&(pd>GAUTSCH.DESPAWN_R||!want&&!GAUTSCH.running))gautschDespawn();
  if(!GAUTSCH.on){gautschHud();return;}
  if(GAUTSCH.grp)GAUTSCH.grp.visible=!INDOOR;
  if(inWin&&!GAUTSCH.annNow&&pd<1500){GAUTSCH.annNow=true;hint('<b>Johannisnacht am Gutenbergplatz!</b> Gautschen, Spundekäs un Woi – bis halb zwölf.',5);}
  if(!inWin)GAUTSCH.annNow=false;
  if(!GAUTSCH.running&&GAUTSCH.cool<=0&&GAUTSCH.linger<=0&&P1.h&&!P1.car&&Math.hypot(P1.h.x-T.x,P1.h.z-T.z)<GAUTSCH.START_R)gautschBeginRound();
  if(GAUTSCH.running){GAUTSCH.timer-=dt;if(GAUTSCH.timer<=0||GAUTSCH.dunked>=GAUTSCH.total)gautschFinish();}
  for(const h of gautschAll()){if(h.removed||!h.alive)continue;gautschReclaim(h);if(h.state!=='gautsch')continue;const a=h.ga.act;
    if(h.ga.role!=='lehrling')gautschSpectator(h,dt);else if(a==='carried')gautschCarried(h,dt);else if(a==='fly')gautschFly(h,dt);
    else if(a==='bath')gautschBath(h,dt);else if(a==='wet')gautschWet(h,dt);else gautschFlee(h,dt);}
  if(GAUTSCH.carry&&(GAUTSCH.carry.h.removed||!GAUTSCH.carry.h.alive||GAUTSCH.carry.h.state!=='gautsch'))gautschRelease();
  for(const P of PLAYERS){if(TALK||!gautschWantsE(P)||GAUTSCH.carry&&GAUTSCH.carry.P===P)continue;P._gauT=(P._gauT||0)-dt;if(P._gauT<=0){P._gauT=0.8;hint('<b>E</b>: Lehrling packe!',1,P);}}
  gautschHud();}
