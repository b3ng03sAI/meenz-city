// ===================== SPIELER: ZU FUSS, FAHRZEUGE =====================
function doorPos(c,side){const lx=Math.cos(c.h),lz=-Math.sin(c.h);const o=c.T.W/2+0.7;return [c.x+lx*o*side,c.z+lz*o*side];}
function landSpotNear(x,z,maxR=12){for(let r=1;r<=maxR;r+=1)for(let a=0;a<TAU;a+=0.35){const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;const i=idx(px,pz);if(i>=0&&!(mfG(i)&4)&&!blocked(px,pz)&&!blocked(px+0.4,pz)&&!blocked(px-0.4,pz)&&!blocked(px,pz+0.4)&&!blocked(px,pz-0.4))return [px,pz];}return null;}
function tryEnterExit(P){if(P.gameOver)return;if(P.car){exitCar(P);return;}if(P.morph){hint('Tiere können nicht Auto fahren!',1.5,P);return;}const h=P.h;let best=null,bd=1e9;
  for(const c of CARS){if(c.dead||c.burn>0||isPlayerCar(c))continue;const d=Math.hypot(c.x-h.x,c.z-h.z);const reach=c.T.boat?Math.max(5.5,c.T.L/2+2.5):Math.max(3.2,c.T.L/2+1.3);if(c.T.boat&&h.y-c.y>6)continue;if(d<reach&&d<bd){bd=d;best=c;}}
  if(best)enterCar(P,best);}
function enterCar(P,c){const h=P.h;
  if(c.driver==='npc'){const [dx,dz]=doorPos(c,1);const d=new Human('ped');d.x=dx;d.z=dz;d.y=groundY(dx,dz);d.side=1;d.walkSpeed=1.4;pedFlee(d,c.x,c.z,10);crime('carjack',c.x,c.z);}
  if(c.copsIn>0){for(let i=0;i<c.copsIn;i++){const [dx,dz]=doorPos(c,i?-1:1);spawnCop(dx,dz,c);}c.copsIn=0;crime('carjackCop',c.x,c.z);}
  c.driver=h;c.ctrl='player';c.ai={mode:'player'};c.sirenOn=false;c.persist=false;P.car=c;h.inCar=true;h.aiming=false;h.g.visible=!!(c.T.bike||c.T.jetski||c.T.kart);P.swim=false;
  hint(`<b>${c.T.name}</b>${c.T.boat||c.T.pedal?'':' · '+c.plateText}`,3);
  if(activeMission&&activeMission.onEnter)activeMission.onEnter(c,P);
  if(c.T.police&&!(activeMission&&activeMission.id==='blau'))crime('stealCop',c.x,c.z);}
function exitCar(P,force=false){const c=P.car;if(!c)return;const airborne=c.T.plane&&c.alt>6;if(!force&&Math.abs(c.speed)>7&&!c.T.bike&&!c.T.jetski&&!c.T.kart&&!airborne){hint('Zu schnell zum Aussteigen!',1.5);return;}const h=P.h;let x,z;
  if(airborne){h.x=c.x-Math.cos(c.h)*2.5;h.z=c.z+Math.sin(c.h)*2.5;h.y=c.y-0.5;P.vy=0;P.ground=false;P.airT=1;h.facing=c.h;h.inCar=false;h.g.visible=true;h.stand();h.g.rotation.set(0,c.h,0);c.driver=null;c.ctrl='none';c.ai={mode:'none'};c.inp={throttle:0,brake:0,steer:0,hand:false};P.car=null;h.sync();updateWeaponModel(P);hint('Abgesprungen! <b>Leertaste halten</b> für den Jetpack.',3,P);return;}
  let toWater=false;if(c.T.boat){const s=landSpotNear(c.x,c.z,c.T.jetski?6:14);if(!s){const lx=Math.cos(c.h),lz=-Math.sin(c.h);x=c.x+lx*(c.T.W/2+1.2);z=c.z+lz*(c.T.W/2+1.2);toWater=true;}else [x,z]=s;}
  else{[x,z]=doorPos(c,1);if(blocked(x,z))[x,z]=doorPos(c,-1);if(blocked(x,z))[x,z]=freeSpot(c.x,c.z,0.4);}
  h.x=x;h.z=z;h.y=toWater?SWIM_Y:groundY(x,z);if(toWater){P.swim=true;splash(x,z,1);}h.facing=c.h;h.inCar=false;h.g.visible=true;h.stand();for(const l of [h.legL,h.legR,h.armL,h.armR])l.rotation.set(0,0,0);if(h.hips)h.hips.rotation.x=0;h.g.rotation.z=0;
  if(c.T.bike&&!c.T.pedal&&Math.abs(c.speed)>7){knockHuman(h,c.vx*0.6,c.vz*0.6,3,0,false);damagePlayer(P,Math.abs(c.speed)*1.5);h.state='walk';}
  c.driver=null;c.ctrl='none';c.ai={mode:c.T.boat?'docked':'none'};c.inp={throttle:0,brake:c.T.boat?0:1,steer:0,hand:false};P.car=null;h.sync();updateWeaponModel(P);}
function vehicleInput(P,I){const c=P.car;const i=c.inp;i.throttle=I.throttle;i.brake=I.brake;i.steer=clamp(I.steer,-1,1);i.hand=I.hand;
  if(c.T.kart&&P.h){const h=P.h;const fx=Math.sin(c.h),fz=Math.cos(c.h);h.x=c.x-fx*0.2;h.z=c.z-fz*0.2;h.y=c.y-0.38;h.facing=c.h;h.g.rotation.order='YXZ';h.g.rotation.set(c.g.rotation.x,c.h,c.g.rotation.z);
    h.legL.rotation.set(-1.45,0,0.12);h.legR.rotation.set(-1.45,0,-0.12);h.armL.rotation.set(-1.0,0,0.3-c.steer*0.3);h.armR.rotation.set(-1.0,0,-0.3-c.steer*0.3);h.hips.rotation.x=0.15;h.g.position.set(h.x,h.y,h.z);}
  if((c.T.bike||c.T.jetski)&&P.h){const h=P.h;const fx=Math.sin(c.h),fz=Math.cos(c.h);const js=c.T.jetski;h.x=c.x-fx*(js?0.45:0.25);h.z=c.z-fz*(js?0.45:0.25);h.y=c.y+(js?0.32:0.18);h.facing=c.h;h.g.rotation.order='YXZ';h.g.rotation.set(js?c.g.rotation.x:0,c.h,js?c.g.rotation.z:(c.lean||0));
    h.legL.rotation.set(-1.25,0,0.25);h.legR.rotation.set(-1.25,0,-0.25);h.armL.rotation.set(-1.1,0,0.15);h.armR.rotation.set(-1.1,0,-0.15);h.hips.rotation.x=0.25;h.g.position.set(h.x,h.y,h.z);}}
// Fahrphysik (Feinschliff): Gewichtsverlagerung, Reifenhaftung abhängig vom Schlupf, Untersteuern, Karosserieneigung
function updatePlayerFoot(P,I,dt){const h=P.h;h.swimmer=true;const y=P.cam.yaw;const fx=Math.sin(y),fz=Math.cos(y),rx=-Math.cos(y),rz=Math.sin(y);let dx=fx*I.mz+rx*I.mx,dz=fz*I.mz+rz*I.mx;const L=Math.hypot(dx,dz);
  if(P.aimT>0)P.aimT-=dt;const W=WEAPONS[P.weapon];h.aiming=!W.melee&&!W.thrown&&(I.aim||P.aimT>0);
  const sprint=I.sprint&&!h.aiming;const flying=P.jet&&P.jet.on;const sp=L>0.1?(flying?(sprint?17:10):sprint?(P.shoesOn?24:6.8):3.4)*Math.min(1,L)*(P.pu&&P.pu.speed>0?(sprint?2.8:1.6):1)*(P.morph?P.morph.speed:1)*(P.swim&&!flying?0.55:1):0;let mv=0;
  if(L>0.1){dx/=L;dz/=L;if(sp>10){mv=0;for(let k=0;k<4;k++)mv+=moveHuman(h,dx,dz,sp,dt/4)/4;}else mv=moveHuman(h,dx,dz,sp,dt);if(!h.aiming)faceTo(h,dx,dz,dt,12);h.vx=dx*mv;h.vz=dz*mv;}else{h.vx=h.vz=0;}
  if(h.aiming)h.facing+=angDiff(h.facing,P.cam.yaw)*Math.min(1,dt*20);
  if(I.jumpP&&P.ground){P.vy=(P.pu&&P.pu.jump>0)?17:P.shoesOn?9.5:5.4;P.ground=false;P.airT=0;}
  P.airT=(P.airT||0)+dt;const jetting=jetUpdate(P,I,dt);
  P.vy-=16*dt;h.y+=P.vy*dt;const gy=playerGroundY(P,h.x,h.z,h.y+0.3);if(h.y<=gy){h.y=gy;if(P.vy<-14&&!swimHere(h.x,h.z,h.y)&&!jetting&&!(P.jet&&P.jet.fuel>0.05)&&!(P.pu&&(P.pu.jump>0||P.pu.god>0))){damagePlayer(P,(-P.vy-14)*4);}P.vy=0;P.ground=true;}else if(h.y>gy+0.3)P.ground=false;
  if(P.ground)jetLand(P,dt);
  h.animate(dt,P.ground?Math.min(mv,9):0);if(!P.ground){h.legL.rotation.x=0.5;h.legR.rotation.x=-0.3;}
  if(P.fireT>0.25&&W.melee){h.armR.rotation.x=-0.85;h.armR.rotation.z=0.4;}
  for(const o of HUMANS){if(o===h||o.inCar||!o.alive)continue;const ddx=o.x-h.x,ddz=o.z-h.z;const d=Math.hypot(ddx,ddz);if(d<0.6&&d>0.01){const p=(0.6-d)/2;o.x+=ddx/d*p;o.z+=ddz/d*p;}}
  if(h.state==='knock'){updatePed(h,dt);if(h.state==='down'||h.state==='dead'){h.state='walk';h.stand();}}
  h.sync();swimPose(P,dt);}
function updatePlayer(P,dt){if(!P.h)return;const I=readInput(P);P.inp=I;drunkInput(P,I,dt);
  if(P.fireT>0)P.fireT-=dt;if(P.reloadT>0){P.reloadT-=dt;if(P.reloadT<=0){const w=P.reloadW,W=WEAPONS[w];const n=Math.min(W.mag-(P.mag[w]||0),P.ammo[w]||0);P.mag[w]=(P.mag[w]||0)+n;P.ammo[w]-=n;}}
  if(P.hurtT>0)P.hurtT-=dt;
  // Kamera-Eingabe
  if(I.lookX||I.lookY){const fk=P.camera.fov/60;P.cam.yaw-=I.lookX*0.0026*fk;P.cam.pitch=clamp(P.cam.pitch+I.lookY*0.002*fk,-0.35,1.25);P.cam.lastLook=simTime;}
  if(P.gameOver){if(!P.car)P.h.sync();return;}
  if(P.talk)return;
  if(I.enterP){if(!(!P.car&&shopInteract(P)))tryEnterExit(P);}
  if(I.weaponP)cycleWeapon(P,1);if(I.weaponPrevP)cycleWeapon(P,-1);if(I.reloadP)reload(P);
  const W=WEAPONS[P.weapon];if(P.morph){if(I.fireP&&P.morph.kind==='llama')llamaSpit(P);}else if(I.fire&&!SHOP_UI.open&&(W.auto||I.fireP||W.melee&&I.fireP))playerFire(P,I);
  if(P.car)vehicleInput(P,I);else updatePlayerFoot(P,I,dt);}

// ===================== KAMERA (pro Spieler) =====================
const _ct=new THREE.Vector3(),_cp=new THREE.Vector3();
function updateCamera(P,dt){if(talkCamera(P,dt))return;const cam=P.cam,camera=P.camera;let tx,ty,tz,dist;const z=cam.zoom||1;
  if(P.car){const c=P.car;tx=c.x;ty=c.y+1.6+(c.T.H>2?1:0)+(c.T.boat?0.8:0)+(c.T.plane?1.2:0);tz=c.z;dist=(c.T.kart?4.6:c.T.bike||c.T.jetski?5.6:c.T.plane?15:7.5+c.T.L*0.45)*z+Math.min(4,Math.abs(c.speed)*0.07);
    if(simTime-cam.lastLook>1.3&&Math.abs(c.speed)>2){const th=c.h+(c.speed<-1?Math.PI:0);cam.yaw+=angDiff(cam.yaw,th)*Math.min(1,dt*2.2);cam.pitch+=(0.2-cam.pitch)*Math.min(1,dt*1.5);}}
  else{const h=P.h;tx=h.x;ty=h.y+(P.morph?P.morph.camH:1.55);tz=h.z;dist=(P.morph?P.morph.dist:(h.aiming?3.1:5.2))*z;if(h.room)dist=Math.min(dist,h.aiming?2.4:3.4);if(h.aiming){tx+=-Math.cos(cam.yaw)*0.75;tz+=Math.sin(cam.yaw)*0.75;}
    if(P.id===1&&simTime-cam.lastLook>1.5&&Math.hypot(h.vx,h.vz)>0.5)cam.yaw+=angDiff(cam.yaw,h.facing)*Math.min(1,dt*1.5);}
  if(P.gameOver){dist*=1.6;cam.yaw+=dt*0.25;}
  const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);let ex=tx-Math.sin(cam.yaw)*cp*dist,ey=ty+sp*dist,ez=tz-Math.cos(cam.yaw)*cp*dist;
  const n=Math.ceil(dist/0.35);let f=1;for(let i=1;i<=n;i++){const t=i/n;const x=lerp(tx,ex,t),y=lerp(ty,ey,t),zz=lerp(tz,ez,t);const gh=gridH(x,zz);if(gh!==255&&gh>y-0.4&&!bridgeLocal(x,zz)){f=Math.max(0.12,(i-1.5)/n);break;}}
  ex=lerp(tx,ex,f);ey=lerp(ty,ey,f);ez=lerp(tz,ez,f);
  if(P.h&&P.h.room&&!P.car){const r=P.h.room;ex=clamp(ex,r.ox-r.W/2+0.3,r.ox+r.W/2-0.3);ez=clamp(ez,r.oz-r.D/2+0.3,r.oz+r.D/2-0.3);ey=clamp(ey,r.oy+0.5,r.oy+(r.venue&&r.venue.ceilAt?r.venue.ceilAt(ex-r.ox,ez-r.oz):r.H)-0.25);}const gy=groundY(ex,ez)-((mfG(idx(ex,ez))&4)&&!bridgeLocal(ex,ez)?5:0);ey=Math.max(ey,gy+0.4);
  _cp.set(ex,ey,ez);if(cam.init)camera.position.lerp(_cp,1-Math.exp(-dt*(P.car?14:22)));else{camera.position.copy(_cp);cam.init=true;}
  if(cam.shake>0){cam.shake-=dt;camera.position.x+=mr(-1,1)*cam.shake*0.4;camera.position.y+=mr(-1,1)*cam.shake*0.4;}
  _ct.set(tx,ty,tz);camera.lookAt(_ct);if(P.drunk>0){camera.rotateZ(Math.sin(simTime*1.05)*0.13*P.drunk+Math.sin(simTime*2.3)*0.03*P.drunk);camera.rotateX(Math.sin(simTime*0.7)*0.025*P.drunk);}
  const snipe=!P.car&&P.weapon==='scharf'&&P.h&&P.h.aiming;const fovT=snipe?14:60+(P.tripK?Math.sin(simTime*0.9)*10*P.tripK:0)+(P.car?Math.min(14,Math.abs(P.car.speed)*0.25):(P.h?Math.min(16,Math.max(0,Math.hypot(P.h.vx||0,P.h.vz||0)-7)*0.9):0));camera.fov+=(fovT-camera.fov)*Math.min(1,dt*(snipe?10:3));camera.updateProjectionMatrix();}
