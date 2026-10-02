// ===================== 47 Rausspringen aus fahrenden Fahrzeugen =====================
// GTA-style bail-out: F above 7 m/s no longer refuses ("Zu schnell zum Aussteigen!") for road vehicles. The player
// is thrown out of the driver's door, log-rolls along the ground (arms tucked), lies briefly and gets up; damage
// grows with speed. The vehicle keeps rolling driverless until rolling resistance stops it or it crashes, then it is
// an ordinary parked car. Boats, jetskis, karts, pedal bikes, planes and helicopters keep their own exit logic.
const SPRUNG={
  last:null,          // {speed, damage, car} of the most recent bail-out
  rolling:null,       // active roll of a player: {P, phase:'roll'|'lie', t, dur, vx, vz, face, spin}
  cars:[],            // driverless vehicles still coasting: {c, t, drift, steer}
  MIN_SPEED:7,        // above this F means bail-out (old refusal threshold)
  SAFE_SPEED:10,      // no damage at or below
  CAR_DECEL:1.3,      // extra rolling resistance (m/s²) for a coasting car without driver
  BIKE_DECEL:3.2,     // a riderless motorbike tips over and scrapes along faster
  LIE_T:0.6,          // seconds lying after the roll before getting up
  // tucked roll pose (x,y,z per limb); arms stay well below the HALTUNG limit even if the body were upright
  POSE:{armL:[-0.8,0,-0.55],armR:[-0.8,0,0.55],legL:[-0.9,0,0],legR:[-0.7,0,0]},
};
// 0 up to 10 m/s, ~16 at 20 m/s, ~45 at 30 m/s, ~83 at 40 m/s; capped so only very high speed kills from full health
function sprungDamage(sp){if(sp<=SPRUNG.SAFE_SPEED)return 0;return Math.min(120,45*Math.pow((sp-SPRUNG.SAFE_SPEED)/20,1.5));}
function sprungEligible(c){const T=c.T;return Math.abs(c.speed)>SPRUNG.MIN_SPEED&&!T.pedal&&!T.jetski&&!T.kart&&!T.boat&&!T.plane&&!T.hubi;}

const _sprungExitCar=exitCar;
exitCar=function(P,force=false){const c=P.car;if(!c||force||!sprungEligible(c))return _sprungExitCar(P,force);
  if(SPRUNG.rolling)sprungEndRoll(SPRUNG.rolling);// split screen: one roll at a time
  const vx=c.vx,vz=c.vz,sp=Math.abs(c.speed);
  // the original exit handles door placement and seat cleanup; speed 0 keeps its old motorbike knock+damage out
  c.speed=0;_sprungExitCar(P,true);c.speed=sp;c.vx=vx;c.vz=vz;
  const drift=(Math.random()<0.5?-1:1)*mr(0.03,0.1);
  c.ai={mode:'none'};
  const e={c,t:0,drift,steer:drift};c.sprungCoast=e;SPRUNG.cars=SPRUNG.cars.filter(o=>o.c!==c);SPRUNG.cars.push(e);
  const h=P.h;let sx=h.x-c.x,sz=h.z-c.z;const sl=Math.hypot(sx,sz)||1;sx/=sl;sz/=sl;
  const rvx=vx*0.5+sx*2.6,rvz=vz*0.5+sz*2.6;
  SPRUNG.rolling={P,phase:'roll',t:0,dur:clamp(0.55+sp*0.03,0.75,1.9),vx:rvx,vz:rvz,face:Math.atan2(rvx,rvz),spin:0};
  h.state='walk';h.vx=h.vz=0;P.vy=0;P.ground=true;P.airT=0;
  const dmg=sprungDamage(sp);SPRUNG.last={speed:sp,damage:dmg,car:c};
  P.cam.shake=Math.max(P.cam.shake||0,Math.min(0.7,0.15+sp*0.012));
  if(dmg>0)damagePlayer(P,dmg);
  if(P.gameOver){sprungDie(SPRUNG.rolling);return;}
  hint(dmg>25?'Rausgehippt – <b>des hot weh gedo!</b>':dmg>0?'Abgerollt! Aua, mei Knie.':'Elegant abgerollt!',2,P);
  sprungPose(SPRUNG.rolling);};

// Lying across the direction of travel, spinning about the body's long axis: with order YXZ the Z quarter-turn lays
// the figure sideways, so the X rotation turns it around its own length (a log roll).
function sprungPose(R){const h=R.P.h,f=R.face;h.facing=f;h.g.rotation.order='YXZ';h.g.rotation.set(R.spin,f,Math.PI/2);
  h.g.position.set(h.x+Math.cos(f)*0.9,h.y+0.2,h.z-Math.sin(f)*0.9);
  for(const k in SPRUNG.POSE)h[k].rotation.set(...SPRUNG.POSE[k]);
  if(h.hips)h.hips.rotation.x=0;if(h.blob)h.blob.visible=false;}

function sprungEndRoll(R){const h=R.P.h;SPRUNG.rolling=null;h.stand();h.g.rotation.order='XYZ';
  for(const l of [h.legL,h.legR,h.armL,h.armR])l.rotation.set(0,0,0);h.y=playerGroundY(R.P,h.x,h.z,h.y+0.3);h.state='walk';h.vx=h.vz=0;h.sync();}

// killed by the fall (or mid-roll): plain lying pose, and no roll left over to resume after the respawn
function sprungDie(R){const h=R.P.h;SPRUNG.rolling=null;h.g.rotation.order='XYZ';h.g.rotation.set(0,h.facing,0);h.lie();h.sync();}

function sprungRollStep(R,I,dt){const P=R.P,h=P.h;
  if(P.car){sprungEndRoll(R);return false;}
  if(I.jump&&P.jet&&P.jet.fuel>0.05){sprungEndRoll(R);return false;}// let the jetpack take over
  R.t+=dt;
  if(R.phase==='roll'){let sp=Math.hypot(R.vx,R.vz);const nsp=Math.max(0,sp*Math.exp(-1.6*dt)-2.5*dt);
    if(sp>1e-3){R.vx*=nsp/sp;R.vz*=nsp/sp;}sp=nsp;
    const nx=h.x+R.vx*dt,nz=h.z+R.vz*dt;
    if(blocked(nx,nz,h.y)){R.vx*=-0.25;R.vz*=-0.25;P.cam.shake=Math.max(P.cam.shake||0,0.25);}else{h.x=nx;h.z=nz;}
    if(swimHere(h.x,h.z,h.y)){sprungEndRoll(R);return false;}
    h.y=groundY(h.x,h.z,h.y);R.spin+=Math.min(13,sp/0.22)*dt;
    if(R.t>=R.dur||sp<0.4){R.phase='lie';R.t=0;}}
  else{const tgt=Math.round(R.spin/Math.PI)*Math.PI;R.spin+=(tgt-R.spin)*Math.min(1,dt*8);
    if(R.t>=SPRUNG.LIE_T){sprungEndRoll(R);return false;}}
  sprungPose(R);return true;}

const _sprungFoot=updatePlayerFoot;
updatePlayerFoot=function(P,I,dt){const R=SPRUNG.rolling;if(R&&R.P===P&&sprungRollStep(R,I,dt))return;_sprungFoot(P,I,dt);};

// the main loop brakes every driverless non-traffic car before physics; a coasting car must not brake
const _sprungPhysics=Car.prototype.physics;
Car.prototype.physics=function(dt){const e=this.sprungCoast;if(e&&this.ctrl==='none'){const i=this.inp;i.throttle=0;i.brake=0;i.steer=e.steer;i.hand=false;}
  return _sprungPhysics.call(this,dt);};

function setupSprung(){SPRUNG.last=null;SPRUNG.rolling=null;for(const e of SPRUNG.cars)e.c.sprungCoast=null;SPRUNG.cars=[];}

function updateSprung(dt){
  const R=SPRUNG.rolling;if(R&&(R.P.gameOver||!R.P.h.alive))sprungDie(R);
  for(let i=SPRUNG.cars.length-1;i>=0;i--){const e=SPRUNG.cars[i],c=e.c;
    if(c.removed||c.dead||c.ctrl!=='none'||c.driver){c.sprungCoast=null;SPRUNG.cars.splice(i,1);continue;}
    e.t+=dt;const sp=Math.hypot(c.vx,c.vz);
    if(sp<0.3){c.vx=c.vz=0;c.speed=0;c.inp={throttle:0,brake:1,steer:0,hand:false};c.ai={mode:'parked'};c.sprungCoast=null;SPRUNG.cars.splice(i,1);continue;}
    const k=Math.max(0,sp-(c.T.bike?SPRUNG.BIKE_DECEL:SPRUNG.CAR_DECEL)*dt)/sp;c.vx*=k;c.vz*=k;
    e.steer=e.drift*(0.6+0.4*Math.sin(e.t*0.9));}}
