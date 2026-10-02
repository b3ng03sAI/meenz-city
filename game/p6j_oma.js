// ===================== 48 Ablecke-Oma =====================
// Rare random event: a fictional granny appears behind the player, chases them screaming in Mundart and wants to lick
// them. If she catches them she licks (no damage), spins faster and faster and lifts off into the sky. If the player
// escapes she gives up and walks away. Never during missions, indoors, in vehicles or while swimming.
// Poses respect the global posture guard (p3c_haltung.js): arms forward at most ~33° below horizontal, or sideways.
const OMA={active:null,cooldown:240,count:0,rollT:0,last:null,lastEnd:'',watchers:[],slobberT:0,
  ROLL_EVERY:60,CHANCE:0.04,COOLDOWN:540,MIN_PEDS:3,PED_R:45,
  SPAWN_D:25,SPEED:4.9,REACH:1.0,ESCAPE_D:60,ESCAPE_T:10,MAX_T:40,LICK_T:1.8,SPIN_T:1.4,GONE_Y:80,LEAVE_T:6,
  SHOUTS:['Bub, komm her, isch will disch abschlecke!','Bleib stehe, Schätzelsche!','Ei, net so schnell, mei Hasi!',
    'Nur emol abschlecke, des tut net weh!','Komm zur Oma, Zuckerschnudesche!','Isch krieh disch, isch krieh disch!'],
  LICK:['Schlabb-schlabb-schlabb!','Mmmh, schmeckt nach Meenz!'],
  SPIN:'Juhuuu, isch flieeeg!',
  GIVEUP:['Pff … mei Knie. Dann halt net, du Lauser!','Na warte, beim nächste Mol krieh isch disch!'],
  WATCH:['Hahaha, guck dir des aa!','Des muss isch filme!','Lauf, Bub, lauf!','Ei, die Oma Hilde is widder unnerwegs!','Des glaabt mer kaaner!'],
  force:(P)=>omaSpawn(P||P1,true),canSpawn:(P)=>omaCanSpawn(P||P1)};

let OMA_MATS=null;
const OMA_GEO={tongue:new THREE.BoxGeometry(0.046,0.014,0.075),panel:new THREE.BoxGeometry(0.075,0.46,0.025),
  spark:new THREE.OctahedronGeometry(0.07,0),handle:new THREE.TorusGeometry(0.07,0.009,6,12,Math.PI),phone:new THREE.BoxGeometry(0.07,0.13,0.012)};
function omaMats(){if(OMA_MATS)return OMA_MATS;
  const floral=freeAfterUpload(canvasTex(128,128,(g,w,h)=>{g.fillStyle='#3d5a8c';g.fillRect(0,0,w,h);
    const R=mulberry32(48);const flower=(x,y,r,col)=>{g.fillStyle=col;for(let i=0;i<5;i++){const a=i/5*TAU;g.beginPath();g.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,r*0.7,0,TAU);g.fill();}
      g.fillStyle='#ffe066';g.beginPath();g.arc(x,y,r*0.55,0,TAU);g.fill();};
    for(let i=0;i<14;i++)flower(R()*w,R()*h,4+R()*4,['#f4a6c0','#ffffff','#e85d75','#ffd1dc'][i%4]);
    g.fillStyle='#6fae6a';for(let i=0;i<18;i++){g.beginPath();g.ellipse(R()*w,R()*h,4,1.8,R()*3,0,TAU);g.fill();}}));
  floral.repeat.set(2,2);
  const dress=new THREE.MeshStandardMaterial({color:0xffffff,map:floral,roughness:0.85});
  const skirt=new THREE.MeshStandardMaterial({color:0xffffff,map:floral,roughness:0.85,side:THREE.DoubleSide});
  return OMA_MATS={dress,skirt,cardigan:cmat(0xb5654f,0.95),hair:cmat(0xd6d6d2,0.9),tights:cmat(0xc7a58c,0.75),
    bag:cmat(0x7a1f2b,0.55),glass:cmat(0x1a1a1a,0.3),tongue:cmat(0xff6f91,0.45),phone:cmat(0x111111,0.3)};}

// Random styling first (senior woman), then a fixed, recognisable outfit on top.
function omaHuman(){let h=null;
  for(let k=0;k<60;k++){h=new Human('ped');if(h.sex==='f'&&h.age==='senior')break;if(k<59)h.remove();}
  omaDress(h);return h;}
function omaDress(h){const M=omaMats(),hips=h.hips;h.omaLook=true;
  const drop=new Set([SG.hairLong,SG.pony,SG.curl,SG.beanie,SG.bobble,SG.capTop,SG.visor,SG.beard,SG.backpack,SG.strap,SG.skirt,SG.bun,SG.glass,SG.bridge,SG.bag,BODY.cane,BODY.caneTop]);
  for(const par of [hips,h.armL,h.armR]){const ch=par.children;if(!Array.isArray(ch))continue;
    for(const m of ch.slice())if(m.geometry&&drop.has(m.geometry))par.remove(m);}
  h.cane=null;
  const add=(geo,mat,par,x,y,z,s=[1,1,1],rx=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(s[0],s[1],s[2]);m.rotation.x=rx;m.castShadow=true;par.add(m);return m;};
  if(Array.isArray(hips.children))for(const m of hips.children){const G=m.geometry;
    if(G===HGEO.hair){m.visible=true;m.material=M.hair;}
    else if(G===HGEO.torso||G===BODY.torsoF||G===BODY.torsoM||G===HGEO.pelvis||G===BODY.pelvisF||G===BODY.pelvisM)m.material=M.dress;
    else if(G===SG.shoulder)m.material=M.cardigan;}
  for(const a of [h.armL,h.armR])a.traverse(m=>{if(m.geometry===HGEO.arm||m.geometry===BODY.armF||m.geometry===BODY.armM)m.material=M.cardigan;});
  for(const l of [h.legL,h.legR])l.traverse(m=>{if(m.geometry===HGEO.leg||m.geometry===BODY.legF||m.geometry===BODY.legM)m.material=M.tights;});
  add(SG.bun,M.hair,hips,0,0.94,-0.075,[1.15,1.05,1.15]);
  add(SG.skirt,M.skirt,hips,0,-0.24,0,[1.05,1.25,1.05]);
  for(const s of [-1,1])add(OMA_GEO.panel,M.cardigan,hips,s*0.115,0.4,0.105,[1,1,1],-0.05);
  for(const s of [-1,1])add(SG.glass,M.glass,hips,s*0.043,0.808,0.131);add(SG.bridge,M.glass,hips,0,0.81,0.133);
  add(SG.bag,M.bag,h.armL,0.05,-0.62,0.02,[1.1,1.15,1.2]);const hd=add(OMA_GEO.handle,M.bag,h.armL,0.05,-0.53,0.02);hd.rotation.y=Math.PI/2;
  h.omaTongue=add(OMA_GEO.tongue,M.tongue,hips,0,0.728,0.15,[1,1,1],0.35);h.omaTongue.visible=false;}

function omaCanSpawn(P){if(mode!=='play')return 'mode';if(!P||!P.h||P.gameOver)return 'player';if(activeMission)return 'mission';
  if(P.car)return 'car';if(INDOOR||P.h.room)return 'indoor';if(P.swim||swimHere(P.h.x,P.h.z,P.h.y))return 'swim';
  if(TALK)return 'talk';if(OMA.active)return 'active';return '';}
function omaPeopleAround(P,r){let n=0;for(const o of HUMANS){if(o.kind!=='ped'||!o.alive||o.inCar||playerOfHuman(o))continue;if(Math.hypot(o.x-P.h.x,o.z-P.h.z)<r)n++;}return n;}

// Behind the camera, preferring a spot with a free straight run to the player (she has no path finding).
function omaClearRun(ax,az,bx,bz){const L=Math.hypot(bx-ax,bz-az);for(let s=1;s<L;s+=1){const t=s/L;if(blocked(ax+(bx-ax)*t,az+(bz-az)*t))return false;}return true;}
function omaSpawnSpot(P){const hd=P.cam?P.cam.yaw:P.h.facing;let first=null;
  for(const da of [0,0.35,-0.35,0.7,-0.7,1.0,-1.0])for(const D of [OMA.SPAWN_D,OMA.SPAWN_D*0.75]){const a=hd+da;
    const p=freeSpot(P.h.x-Math.sin(a)*D,P.h.z-Math.cos(a)*D,0.4);if(!first)first=p;
    const d=Math.hypot(p[0]-P.h.x,p[1]-P.h.z);if(d>15&&omaClearRun(p[0],p[1],P.h.x,P.h.z))return p;}
  return first;}
function omaSpawn(P,forced=false){if(omaCanSpawn(P))return null;
  const [x,z]=omaSpawnSpot(P);
  const h=omaHuman();h.x=x;h.z=z;h.y=groundY(x,z);h.state='oma';h.mission=true;h.facing=Math.atan2(P.h.x-x,P.h.z-z);h.walkSpeed=0;
  h.omaTongue.visible=true;h.setExpr('laugh');h.sync();
  OMA.active={h,P,phase:'chase',t:0,farT:0,shoutT:0.2,shoutN:0,spin:0,alt:0,base:h.y,forced};OMA.last=h;OMA.lastEnd='';
  OMA.cooldown=OMA.COOLDOWN;OMA.count++;
  hint('Ei, was kimmt dann do für e <b>Oma</b> aagerannt …? <b>Renn!</b> (Shift)',4,P);omaWatchers(h,P);return OMA.active;}

// Procedural scream: sawtooth with vibrato through a formant band-pass; silently skipped without audio.
function omaScream(x,z){const ctx=AUD.ctx;if(!ctx||!AUD.master)return;const v=0.2*distVol(x,z,90);if(v<0.01)return;try{const t=ctx.currentTime;
  const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(620,t);o.frequency.linearRampToValueAtTime(1050,t+0.25);o.frequency.linearRampToValueAtTime(760,t+0.9);
  const lfo=ctx.createOscillator();lfo.frequency.value=9;const lg=ctx.createGain();lg.gain.value=45;lfo.connect(lg);lg.connect(o.frequency);
  const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1300;f.Q.value=2.2;const g=ctx.createGain();
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.05);g.gain.setValueAtTime(v,t+0.7);g.gain.exponentialRampToValueAtTime(0.0001,t+0.95);
  o.connect(f);f.connect(g);g.connect(AUD.master);o.start(t);lfo.start(t);o.stop(t+1);lfo.stop(t+1);}catch(e){}}
function omaWhoosh(){const ctx=AUD.ctx;if(!ctx||!AUD.master)return;try{const t=ctx.currentTime;const o=ctx.createOscillator();o.type='sine';
  o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(1800,t+2.4);const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.12,t+0.3);g.gain.exponentialRampToValueAtTime(0.0001,t+2.6);o.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+2.7);}catch(e){}}

// Bystanders stop, laugh and film (phone held low, arm well below shoulder height).
function omaWatchers(h,P){let n=0;for(const o of HUMANS){if(n>=4)break;if(o===h||o.kind!=='ped'||!o.alive||o.inCar||o.mission||o.keeper||o.state!=='walk')continue;
  if(Math.hypot(o.x-P.h.x,o.z-P.h.z)>28)continue;o.state='omaGuck';o.omaT=8+n;o.omaFilm=n%2===0;o.setExpr('laugh');
  if(o.omaFilm&&!o.omaPhone){o.omaPhone=new THREE.Mesh(OMA_GEO.phone,omaMats().phone);o.omaPhone.position.set(0,-0.62,0.06);o.armR.add(o.omaPhone);}
  say(o,OMA.WATCH[(OMA.count+n)%OMA.WATCH.length],3.5);OMA.watchers.push(o);n++;}}
function omaReleaseWatcher(o){if(o.omaPhone){o.armR.remove(o.omaPhone);o.omaPhone=null;}o.hips.rotation.x=0;if(o.removed||!o.alive||o.state!=='omaGuck')return;o.setExpr('neutral');
  const n=nearestNode(o.x,o.z,false);if(n>=0&&NODES[n].e.length){o.state='walk';pedEnterEdge(o,NODES[n].e[0],n);}else pedFlee(o,o.x,o.z,2);}
function omaUpdateWatchers(dt){const A=OMA.active;
  for(let i=OMA.watchers.length-1;i>=0;i--){const o=OMA.watchers[i];o.omaT-=dt;
    if(o.removed||!o.alive||o.state!=='omaGuck'||o.omaT<=0){omaReleaseWatcher(o);OMA.watchers.splice(i,1);continue;}
    if(A&&A.h&&!A.h.removed)faceTo(o,A.h.x-o.x,A.h.z-o.z,dt,5);o.animate(dt,0);
    if(o.omaFilm){o.armR.rotation.set(-0.85,0,0.35);o.armL.rotation.set(-0.7,0,-0.3);}
    else{const s=Math.sin(simTime*9+i)*0.12;o.hips.rotation.x=0.12+s;o.armL.rotation.set(-0.35,0,-0.35);o.armR.rotation.set(-0.35,0,0.35);}
    o.sync();}}

function omaSlobberEl(){let el=document.getElementById('omaSlobber');if(el)return el;el=document.createElement('div');el.id='omaSlobber';
  el.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:6;opacity:0;transition:opacity .25s;'+
    'background:radial-gradient(ellipse at 50% 55%,rgba(255,170,200,0) 35%,rgba(255,140,180,.45) 75%,rgba(240,110,160,.7) 100%),'+
    'radial-gradient(circle at 30% 25%,rgba(255,255,255,.35) 0 3%,transparent 4%),radial-gradient(circle at 72% 38%,rgba(255,255,255,.3) 0 2.5%,transparent 3.5%),'+
    'radial-gradient(circle at 58% 78%,rgba(255,255,255,.3) 0 3%,transparent 4%)';
  document.body.appendChild(el);return el;}
function omaSlobber(on){const el=omaSlobberEl();el.style.opacity=on?'1':'0';}

// Leaving: the event is over for the player, she just strolls off and is removed after a few seconds.
function omaGiveUp(A){A.phase='gone';A.t=0;const h=A.h;h.omaTongue.visible=false;h.setExpr('sad');say(h,OMA.GIVEUP[OMA.count%OMA.GIVEUP.length],3.5,'loud');OMA.lastEnd='escaped';}
function omaFinish(){const A=OMA.active;if(!A)return;if(A.h&&!A.h.removed)A.h.remove();OMA.active=null;}
function omaAbort(reason){const A=OMA.active;if(!A)return;const h=A.h;OMA.lastEnd=reason;
  if(h&&!h.removed&&h.alive&&reason!=='gone'){if(h.state==='oma')h.remove();else{h.mission=false;h.omaTongue.visible=false;}}
  OMA.active=null;omaSlobber(false);}

// Straight at the target; when blocked, keep sliding along the obstacle on one side for a moment.
function omaMove(A,dx,dz,sp,dt){const h=A.h;A.detT=Math.max(0,(A.detT||0)-dt);const base=Math.atan2(dx,dz);
  const tryA=a=>moveHuman(h,Math.sin(a),Math.cos(a),sp,dt);
  if(A.detT<=0){const mv=tryA(base);if(mv>sp*0.6)return mv;A.side=A.side||1;}
  for(const k of [0.6,1.1,1.6,2.1]){const a=base+k*A.side;if(blocked(h.x+Math.sin(a)*0.9,h.z+Math.cos(a)*0.9))continue;const mv=tryA(a);if(mv>sp*0.5){A.detT=0.6;return mv;}}
  A.side=-(A.side||1);return 0;}
function omaPoseRun(h,dt,mv){h.animate(dt,mv);const s=Math.sin(h.phase);
  // reaching forward, both arms at most ~33° below horizontal (posture guard limit −1.0 rad)
  h.armL.rotation.set(-0.86+s*0.1,0,-0.22);h.armR.rotation.set(-0.86-s*0.1,0,0.22);}

// Twirling sparkles as small glowing meshes from a pool (independent of the shared sprite particles).
const OMA_SPARKS=[];let OMA_SPARK_MATS=null;
function omaSpark(h){if(!OMA_SPARK_MATS)OMA_SPARK_MATS=[0xffe680,0xff9fd0,0xffffff,0xa0e8ff].map(c=>new THREE.MeshBasicMaterial({color:c}));
  let s=OMA_SPARKS.find(s=>s.life<=0);if(!s){if(OMA_SPARKS.length>=40)return;s={m:new THREE.Mesh(OMA_GEO.spark,OMA_SPARK_MATS[0]),life:0};scene.add(s.m);OMA_SPARKS.push(s);}
  s.m.material=mpick(OMA_SPARK_MATS);s.cx=h.x;s.cz=h.z;s.y=h.y+mr(0,1.6);s.a=Math.random()*TAU;s.r=mr(0.5,1.1);s.w=mr(5,9);s.vy=mr(-1.5,0.5);s.life=s.max=mr(0.8,1.4);s.m.visible=true;}
function omaUpdateSparks(dt){for(const s of OMA_SPARKS){if(s.life<=0)continue;s.life-=dt;if(s.life<=0){s.m.visible=false;continue;}
  s.a+=s.w*dt;s.r+=dt*0.8;s.y+=s.vy*dt;s.m.position.set(s.cx+Math.cos(s.a)*s.r,s.y,s.cz+Math.sin(s.a)*s.r);s.m.rotation.y+=dt*8;s.m.scale.setScalar(Math.max(0.05,s.life/s.max));}}

function updateOma(dt){OMA.cooldown=Math.max(0,OMA.cooldown-dt);omaUpdateWatchers(dt);omaUpdateSparks(dt);
  if(OMA.slobberT>0){OMA.slobberT-=dt;if(OMA.slobberT<=0)omaSlobber(false);}
  const A=OMA.active;
  if(!A){if(mode!=='play'||OMA.cooldown>0)return;if(window.__MANUAL&&OMA.CHANCE<1)return;/* Testmodus: keine zufällige Oma in fremden Tests (test_oma setzt CHANCE=1) */OMA.rollT+=dt;if(OMA.rollT<OMA.ROLL_EVERY)return;OMA.rollT=0;
    if(omaCanSpawn(P1)||omaPeopleAround(P1,OMA.PED_R)<OMA.MIN_PEDS)return;if(Math.random()<OMA.CHANCE)omaSpawn(P1);return;}
  const h=A.h,P=A.P;A.t+=dt;
  if(h.removed){omaAbort('gone');return;}
  if(h.state!=='oma'){omaAbort('knocked');return;}
  if(A.phase==='chase'||A.phase==='lick'){if(activeMission){omaAbort('mission');return;}if(INDOOR||P.h.room){omaAbort('indoor');return;}}
  const [px,pz]=ppos(P);const dx=px-h.x,dz=pz-h.z;const d=Math.hypot(dx,dz);
  if(A.phase==='chase'){
    A.farT=d>OMA.ESCAPE_D?A.farT+dt:0;
    if(A.farT>OMA.ESCAPE_T||A.t>OMA.MAX_T){omaGiveUp(A);}
    else if(d<OMA.REACH&&!P.car&&!P.swim){A.phase='lick';A.t=0;h.setExpr('smile');say(h,OMA.LICK[OMA.count%OMA.LICK.length],2.5,'loud');
      omaSlobber(true);OMA.slobberT=OMA.LICK_T+1.5;hint('Iiiih – <b>abgeschleckt!</b> Alles schlabbrig …',3,P);}
    else{A.shoutT-=dt;if(A.shoutT<=0){A.shoutT=3.2;say(h,OMA.SHOUTS[A.shoutN++%OMA.SHOUTS.length],3,'loud');omaScream(h.x,h.z);}
      const mv=d>0.8?omaMove(A,dx,dz,OMA.SPEED,dt):0;faceTo(h,dx,dz,dt,10);omaPoseRun(h,dt,mv);
      h.omaTongue.scale.z=1+Math.sin(simTime*14)*0.25;}}
  if(A.phase==='lick'){faceTo(h,dx,dz,dt,12);if(d>0.85)moveHuman(h,dx,dz,2,dt);h.animate(dt,0);
    const b=Math.sin(A.t*16);h.hips.rotation.x=0.28+b*0.1;h.omaTongue.scale.z=1.3+b*0.4;
    h.armL.rotation.set(-0.9,0,-0.45);h.armR.rotation.set(-0.9,0,0.45);
    if(A.t>OMA.LICK_T){A.phase='spin';A.t=0;A.spin=2;A.base=h.y;h.hips.rotation.x=0;h.setExpr('laugh');say(h,OMA.SPIN,3,'loud');omaWhoosh();}}
  if(A.phase==='spin'){A.spin+=dt*(10+A.spin*1.2);h.facing+=A.spin*dt;h.animate(dt,0);
    // arms spread sideways like a spinning top – never raised
    h.armL.rotation.set(-0.2,0,1.1);h.armR.rotation.set(-0.2,0,-1.1);h.legL.rotation.x=0.15;h.legR.rotation.x=-0.15;
    if(A.t>OMA.SPIN_T){const tt=A.t-OMA.SPIN_T;A.alt+=dt*(2+tt*9);}
    h.y=A.base+A.alt;
    if(Math.random()<Math.min(1,dt*40))omaSpark(h);
    if(A.alt>OMA.GONE_Y){OMA.lastEnd='flown';omaFinish();return;}}
  if(A.phase==='gone'){const mv=moveHuman(h,-dx,-dz,1.6,dt);faceTo(h,-dx,-dz,dt,5);h.animate(dt,mv);if(A.t>OMA.LEAVE_T){omaFinish();return;}}
  if(A.phase!=='spin')h.y=groundY(h.x,h.z,h.y);
  h.sync();}

function setupOma(){omaSlobberEl();}
