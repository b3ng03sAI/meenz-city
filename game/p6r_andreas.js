// ===================== Andreas, der Wutbürger =====================
// Rare random street event: a fictional, ordinary-looking man ("Andreas") turns up 20–40 m from the player, runs erratic
// zig-zags around them and keeps shouting that nothing may ever change. While ranting his head turns deep red (own
// cloned materials, nobody else is tinted), between rants it cools down. Hitting him makes him flee. No mission impact.
// Poses respect the posture guard (p3c_haltung.js): fists shaken at chest height, right arm never above −1.0 rad.
const ANDREAS={active:null,cooldown:300,count:0,rollT:0,last:null,lastEnd:'',watchers:[],
  ROLL_EVERY:45,CHANCE:0.05,COOLDOWN:600,MIN_PEDS:3,PED_R:45,
  SPAWN_MIN:20,SPAWN_MAX:40,SPEED:5.4,FLEE_SPEED:7,EVENT_MIN:25,EVENT_MAX:40,RANT_T:1.7,RUN_MIN:2.2,RUN_MAX:3.4,
  ORBIT_MIN:5,ORBIT_MAX:14,LEAVE_T:8,LEAVE_D:60,LOST_D:150,FLEE_T:7,
  MAIN:'HALT STOPP!! ALLES BLEIBT WIE ES IST!',
  VARIANTS:['Nix werd do verännert!','ALLES BLEIBT, WIE ES IS!','Des war schon immer so, unn des bleibt aach so!',
    'Do werd nix aagerührt, gell!','Uff kaan Fall werd do was neu gemacht!'],
  LEAVE:'Ihr werd\'s noch sehe! ALLES BLEIBT, WIE ES IS!',
  HIT:['Aua! Hilfe, der haut misch!','Des meld isch, des meld isch alles!'],
  WATCH:['Ei, de Andreas schon widder …','Was hot\'n der?','Bleib ruhisch, Andreas!','Jetzt reesch disch doch net so uff!'],
  force:(P)=>andreasSpawn(P||P1,true),canSpawn:(P)=>andreasCanSpawn(P||P1)};

const ANDREAS_RED=new THREE.Color(0xc4140c);

function andreasCanSpawn(P){if(mode!=='play')return 'mode';if(!P||!P.h||P.gameOver)return 'player';if(activeMission)return 'mission';
  if(INTRO.active)return 'intro';if(P.car)return 'car';if(INDOOR||P.h.room)return 'indoor';if(P.swim||swimHere(P.h.x,P.h.z,P.h.y))return 'swim';
  if(TALK)return 'talk';if(OMA.active)return 'oma';if(ANDREAS.active)return 'active';return '';}
function andreasPeopleAround(P,r){let n=0;for(const o of HUMANS){if(o.kind!=='ped'||!o.alive||o.inCar||playerOfHuman(o))continue;if(Math.hypot(o.x-P.h.x,o.z-P.h.z)<r)n++;}return n;}

// Adult man in a plain olive windbreaker and jeans (no prints, no logos). Head and other skin parts get cloned
// materials so only he can turn red; the face texture itself stays shared.
function andreasHuman(){let h=null;
  for(let k=0;k<60;k++){h=new Human('ped');if(h.sex==='m'&&h.age==='adult')break;if(k<59)h.remove();}
  h.npcName='Andreas';h.andreasLook=true;
  const jacket=clothMat(0x6b7355,'jacket'),jeans=clothMat(0x2f4766,'denim',0.92);
  h.g.traverse(m=>{const G=m.geometry;if(!G)return;
    if(G===HGEO.torso||G===HGEO.arm||G===SG.shoulder)m.material=jacket;else if(G===HGEO.pelvis||G===HGEO.leg)m.material=jeans;});
  const headMat=h.head.material.clone(),skinMat=h.head.material.clone();skinMat.map=null;
  h.head.material=headMat;
  if(Array.isArray(h.hips.children))for(const m of h.hips.children)if(m.geometry===HGEO.nose||m.geometry===HGEO.neck||m.geometry===EAR_G)m.material=skinMat;
  h.andreasMats=[headMat,skinMat];h.andreasSkin=headMat.color.clone();return h;}

function andreasHeatColor(h,heat){for(const m of h.andreasMats)m.color.copy(h.andreasSkin).lerp(ANDREAS_RED,heat);}

// Spot 20–40 m away with a free straight line to the player (he has no path finding): street nodes first, then random.
function andreasClearRun(ax,az,bx,bz){const L=Math.hypot(bx-ax,bz-az);for(let s=0.8;s<L;s+=0.8){const t=s/L;if(blocked(ax+(bx-ax)*t,az+(bz-az)*t))return false;}return true;}
function andreasSpawnSpot(P){const px=P.h.x,pz=P.h.z,ok=(x,z)=>!blocked(x,z)&&!swimHere(x,z,0)&&andreasClearRun(x,z,px,pz);
  const near=[];for(const n of NODES){const d=Math.hypot(n.x-px,n.z-pz);if(d>=ANDREAS.SPAWN_MIN&&d<=ANDREAS.SPAWN_MAX)near.push(n);}
  for(let k=0;k<12&&near.length;k++){const n=near.splice(Math.floor(Math.random()*near.length),1)[0];if(ok(n.x,n.z))return [n.x,n.z];}
  let fallback=null;
  for(let k=0;k<24;k++){const a=Math.random()*TAU,D=mr(ANDREAS.SPAWN_MIN+2,ANDREAS.SPAWN_MAX-4);
    const p=freeSpot(px+Math.sin(a)*D,pz+Math.cos(a)*D,0.4);const d=Math.hypot(p[0]-px,p[1]-pz);
    if(d<ANDREAS.SPAWN_MIN||d>ANDREAS.SPAWN_MAX||blocked(p[0],p[1])||swimHere(p[0],p[1],0))continue;
    if(andreasClearRun(p[0],p[1],px,pz))return p;if(!fallback)fallback=p;}
  return fallback;}

function andreasSpawn(P,forced=false){if(andreasCanSpawn(P))return null;
  const spot=andreasSpawnSpot(P);if(!spot)return null;const [x,z]=spot;
  const h=andreasHuman();h.x=x;h.z=z;h.y=groundY(x,z);h.state='andreas';h.mission=true;h.walkSpeed=0;h.facing=Math.atan2(P.h.x-x,P.h.z-z);
  h.setExpr('angry');h.sync();
  const A={h,P,phase:'run',t:0,dur:mr(ANDREAS.EVENT_MIN,ANDREAS.EVENT_MAX),heat:0,rantT:0,runT:0.6,shoutN:0,tgt:null,tgtT:0,stuckT:0,
    travel:0,minArmR:0,bothUp:false,lastShout:'',shouts:[],forced};
  andreasHeatColor(h,0);
  ANDREAS.active=A;ANDREAS.last=h;ANDREAS.lastEnd='';ANDREAS.cooldown=ANDREAS.COOLDOWN;ANDREAS.count++;
  hint('Wer brüllt dann do so rum …? Des is de <b>Andreas</b>.',4,P);return A;}

function andreasShout(A,text){A.lastShout=text;A.shouts.push(text);if(A.shouts.length>20)A.shouts.shift();say(A.h,text,2.8,'loud andreasRuf');}
// Main line every other rant, Mundart variants in between – starting with the main line.
function andreasNextLine(A){const n=A.shoutN++;return n%2===0?ANDREAS.MAIN:ANDREAS.VARIANTS[(n>>1)%ANDREAS.VARIANTS.length];}

// New zig-zag target: a point on a ring around the player, mostly on the far side so he crosses the square; only
// targets he can reach in a straight line, otherwise a free direction around himself.
function andreasPickTarget(A){const h=A.h,[px,pz]=ppos(A.P);const away=Math.atan2(h.x-px,h.z-pz);
  for(let k=0;k<10;k++){const a=away+Math.PI+mr(-1.4,1.4),r=mr(ANDREAS.ORBIT_MIN,ANDREAS.ORBIT_MAX);const x=px+Math.sin(a)*r,z=pz+Math.cos(a)*r;
    if(!blocked(x,z)&&andreasClearRun(h.x,h.z,x,z)){A.tgt=[x,z];A.tgtT=mr(1.5,3.2);return;}}
  for(let k=0;k<10;k++){const a=Math.random()*TAU,r=mr(4,10);const x=h.x+Math.sin(a)*r,z=h.z+Math.cos(a)*r;
    if(!blocked(x,z)&&andreasClearRun(h.x,h.z,x,z)){A.tgt=[x,z];A.tgtT=mr(1,2);return;}}
  A.tgt=[px,pz];A.tgtT=1;}

function andreasMove(A,dx,dz,sp,dt){const h=A.h;const a=Math.atan2(dx,dz)+Math.sin(A.t*3.1+A.shoutN)*0.75;
  const ox=h.x,oz=h.z;const mv=moveHuman(h,Math.sin(a),Math.cos(a),sp,dt);A.travel+=Math.hypot(h.x-ox,h.z-oz);
  faceTo(h,Math.sin(a),Math.cos(a),dt,9);return mv;}

// All arm poses go through here so the test can check what he asked for before the posture guard ever runs.
function andreasArms(A,lx,lz,rx,rz){const h=A.h;h.armL.rotation.set(lx,0,lz);h.armR.rotation.set(rx,0,rz);
  A.minArmR=Math.min(A.minArmR,rx);if(lx<-2.3&&rx<-2.3)A.bothUp=true;}
function andreasPoseRun(A,dt,mv){const h=A.h;h.animate(dt,mv);const s=Math.sin(h.phase);
  // left arm points ahead now and then, right arm pumps normally
  if(Math.sin(A.t*1.7)>0.35)andreasArms(A,-1.35+s*0.08,-0.1,s*0.6,-0.06);
  else andreasArms(A,-s*0.75,0.06,s*0.75,-0.06);}
function andreasPoseRant(A,dt){const h=A.h;h.animate(dt,0);const k=A.rantK=(A.rantK||0)+dt;
  // fists shaken in front of the body in turn; the right one stays at least 33° below horizontal
  andreasArms(A,-1.15+Math.sin(k*22)*0.12,-0.16,-0.87+Math.cos(k*22)*0.1,0.16);
  const st=Math.sin(k*11);h.legL.rotation.x=Math.max(0,st)*0.45;h.legR.rotation.x=Math.max(0,-st)*0.45;
  h.hips.position.y=0.92-Math.abs(st)*0.03;h.hips.rotation.z=Math.sin(k*31)*0.05;}

function andreasWatchers(A){let n=0;const h=A.h;
  for(const o of HUMANS){if(n>=4)break;if(o===h||o.kind!=='ped'||!o.alive||o.inCar||o.mission||o.keeper||o.state!=='walk')continue;
    if(Math.hypot(o.x-h.x,o.z-h.z)>16)continue;
    if(n%2===1){pedFlee(o,h.x,h.z,1.5);o.setExpr('surprised');n++;continue;}
    o.state='andreasGuck';o.andreasT=mr(3,5);o.setExpr('surprised');ANDREAS.watchers.push(o);
    if(n===0)say(o,ANDREAS.WATCH[(ANDREAS.count+A.shoutN)%ANDREAS.WATCH.length],2.6);n++;}}
function andreasReleaseWatcher(o){if(o.removed||!o.alive||o.state!=='andreasGuck')return;o.setExpr('neutral');
  const n=nearestNode(o.x,o.z,false);if(n>=0&&NODES[n].e.length){o.state='walk';pedEnterEdge(o,NODES[n].e[0],n);}else pedFlee(o,o.x,o.z,2);}
function andreasUpdateWatchers(dt){const A=ANDREAS.active;
  for(let i=ANDREAS.watchers.length-1;i>=0;i--){const o=ANDREAS.watchers[i];o.andreasT-=dt;
    if(o.removed||!o.alive||o.state!=='andreasGuck'||o.andreasT<=0){andreasReleaseWatcher(o);ANDREAS.watchers.splice(i,1);continue;}
    if(A&&!A.h.removed)faceTo(o,A.h.x-o.x,A.h.z-o.z,dt,5);o.animate(dt,0);o.sync();}}

function andreasFinish(end){const A=ANDREAS.active;if(!A)return;const h=A.h;ANDREAS.lastEnd=ANDREAS.lastEnd||end;
  if(!h.removed&&(h.state==='andreas'||end!=='killed'&&end!=='taken'))h.remove();
  else h.mission=false;
  if(h.removed){for(const m of h.andreasMats)m.dispose();}
  ANDREAS.active=null;}

function andreasStartLeave(A){A.phase='leave';A.t=0;andreasShout(A,ANDREAS.LEAVE);A.heat=Math.max(A.heat,0.8);}
function andreasStartFlee(A){A.phase='flee';A.t=0;const h=A.h;h.state='andreas';h.stand();h.hips.rotation.z=0;h.setExpr('surprised');A.heat=1;
  andreasShout(A,ANDREAS.HIT[ANDREAS.count%ANDREAS.HIT.length]);ANDREAS.lastEnd='hit';}

function updateAndreas(dt){ANDREAS.cooldown=Math.max(0,ANDREAS.cooldown-dt);andreasUpdateWatchers(dt);
  const A=ANDREAS.active;
  if(!A){if(mode!=='play'||ANDREAS.cooldown>0)return;if(window.__MANUAL&&ANDREAS.CHANCE<1)return;// test mode: never by itself
    ANDREAS.rollT+=dt;if(ANDREAS.rollT<ANDREAS.ROLL_EVERY)return;ANDREAS.rollT=0;
    if(andreasCanSpawn(P1)||andreasPeopleAround(P1,ANDREAS.PED_R)<ANDREAS.MIN_PEDS)return;if(Math.random()<ANDREAS.CHANCE)andreasSpawn(P1);return;}
  const h=A.h,P=A.P;A.t+=dt;
  if(h.removed){andreasFinish('gone');return;}
  if(!h.alive){andreasFinish('killed');return;}
  if(h.state==='knock'||h.state==='down'){A.phase='hit';A.heat=Math.max(0,A.heat-dt*0.3);andreasHeatColor(h,A.heat);return;}
  // back on his feet after a hit (or scared by gunfire): he runs off shouting
  if(h.state==='flee'){if(A.phase==='flee')h.state='andreas';else andreasStartFlee(A);}
  if(h.state!=='andreas'){andreasFinish('taken');return;}
  if(activeMission||INDOOR||P.h.room){andreasFinish(activeMission?'mission':'indoor');return;}
  const [px,pz]=ppos(P);const dx=px-h.x,dz=pz-h.z,d=Math.hypot(dx,dz);
  if(d>ANDREAS.LOST_D){andreasFinish('lost');return;}
  if(A.phase==='run'||A.phase==='rant'){A.dur-=dt;if(A.dur<=0&&A.phase==='run')andreasStartLeave(A);}
  if(A.phase==='run'){A.runT-=dt;A.tgtT-=dt;
    if(!A.tgt||A.tgtT<=0||Math.hypot(A.tgt[0]-h.x,A.tgt[1]-h.z)<2)andreasPickTarget(A);
    const mv=andreasMove(A,A.tgt[0]-h.x,A.tgt[1]-h.z,ANDREAS.SPEED,dt);
    A.stuckT=mv<ANDREAS.SPEED*0.4?A.stuckT+dt:0;if(A.stuckT>0.5){A.stuckT=0;andreasPickTarget(A);}
    andreasPoseRun(A,dt,mv);h.hips.rotation.z=0;A.heat=Math.max(0.12,A.heat-dt*0.3);
    if(A.runT<=0){A.phase='rant';A.rantT=ANDREAS.RANT_T;A.rantK=0;andreasShout(A,andreasNextLine(A));andreasWatchers(A);}}
  else if(A.phase==='rant'){A.rantT-=dt;faceTo(h,dx,dz,dt,6);andreasPoseRant(A,dt);A.heat=Math.min(1,A.heat+dt*1.6);
    if(A.rantT<=0){A.phase='run';A.runT=mr(ANDREAS.RUN_MIN,ANDREAS.RUN_MAX);h.hips.rotation.z=0;h.legL.rotation.x=h.legR.rotation.x=0;}}
  else if(A.phase==='leave'||A.phase==='flee'){const fast=A.phase==='flee';
    const mv=andreasMove(A,-dx,-dz,fast?ANDREAS.FLEE_SPEED:ANDREAS.SPEED,dt);andreasPoseRun(A,dt,mv);
    A.heat=fast?Math.max(0.7,A.heat-dt*0.1):Math.max(0.12,A.heat-dt*0.2);
    if(fast&&A.t>2.5&&A.t-dt<=2.5)andreasShout(A,ANDREAS.MAIN);
    if(A.t>(fast?ANDREAS.FLEE_T:ANDREAS.LEAVE_T)||d>ANDREAS.LEAVE_D){ANDREAS.lastEnd=ANDREAS.lastEnd||'left';andreasFinish('left');return;}}
  andreasHeatColor(h,A.heat);
  h.y=groundY(h.x,h.z,h.y);h.sync();}

// Bigger, angrier variant of the loud bubble.
function setupAndreas(){if(document.getElementById('andreasCss'))return;const s=document.createElement('style');s.id='andreasCss';
  s.textContent='.bubble.loud.andreasRuf{font-size:22px;max-width:330px;padding:9px 14px;border:3px solid #c4140c;text-transform:none}';document.head.appendChild(s);}
