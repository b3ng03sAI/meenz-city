// ===================== WAFFEN =====================
const WEAPONS={
  fist:{name:'FAUST',melee:true,dmg:22,rate:0.45,range:1.9},
  bat:{name:'BASEBALLSCHLÄGER',melee:true,dmg:48,rate:0.65,range:2.4},
  pistol:{name:'PISTOLE',mag:12,dmg:38,rate:0.22,spread:0.006,reload:1.2,vol:0.7,f:2600},
  smg:{name:'MASCHINENPISTOLE',mag:30,dmg:22,rate:0.075,spread:0.028,auto:true,reload:1.6,vol:0.5,f:3200},
  shotgun:{name:'SCHROTFLINTE',mag:6,dmg:20,pellets:9,rate:0.9,spread:0.085,reload:2.3,vol:1,f:1400},
  rifle:{name:'STURMGEWEHR',mag:30,dmg:36,rate:0.11,spread:0.012,auto:true,reload:1.9,vol:0.8,f:2000},
  molotov:{name:'MOLOTOWCOCKTAIL',thrown:true,rate:0.9},
  grenade:{name:'GRANATE',thrown:true,rate:0.9},
};
const WORDER=['fist','bat','pistol','smg','shotgun','rifle','molotov','grenade'];
function weaponList(P){return WORDER.filter(w=>P.owned[w]&&(w==='fist'||w==='bat'||(P.ammo[w]||0)+(P.mag[w]||0)>0));}
function giveWeapon(P,w,amount){const W=WEAPONS[w];const first=!P.owned[w];P.owned[w]=true;if(W.thrown){P.ammo[w]=(P.ammo[w]||0)+amount;}else if(!W.melee){P.ammo[w]=(P.ammo[w]||0)+amount;if(!P.mag[w]){const n=Math.min(W.mag,P.ammo[w]);P.mag[w]=n;P.ammo[w]-=n;}}
  if(first)selectWeapon(P,w);return first;}
function selectWeapon(P,w){P.weapon=w;updateWeaponModel(P);}
function cycleWeapon(P,dir=1){const l=weaponList(P);if(l.length<2)return;let i=l.indexOf(P.weapon);i=(i+dir+l.length)%l.length;selectWeapon(P,l[i]);}
const WGEO={pistol:new THREE.BoxGeometry(0.05,0.12,0.26),smg:new THREE.BoxGeometry(0.06,0.14,0.42),shotgun:new THREE.BoxGeometry(0.06,0.1,0.8),rifle:new THREE.BoxGeometry(0.06,0.14,0.75),bat:new THREE.CylinderGeometry(0.035,0.02,0.85,8).rotateX(Math.PI/2),molotov:new THREE.CylinderGeometry(0.04,0.045,0.24,8).rotateX(Math.PI/2),grenade:new THREE.SphereGeometry(0.06,8,6)};
const WMAT={pistol:cmat(0x111111,0.35),smg:cmat(0x1a1a1a,0.35),shotgun:cmat(0x3a2a1c,0.5),rifle:cmat(0x22261f,0.4),bat:cmat(0x9a7448,0.6),molotov:new THREE.MeshStandardMaterial({color:0x4a7a3a,roughness:0.1,metalness:0.1,transparent:true,opacity:0.8}),grenade:cmat(0x3a4a2a,0.5)};
function updateWeaponModel(P){const h=P.h;if(!h)return;if(h.wModel){h.armR.remove(h.wModel);h.wModel=null;}if(h.gun)h.gun.visible=false;const w=P.weapon;if(w==='fist')return;const m=new THREE.Mesh(WGEO[w],WMAT[w]);m.castShadow=true;
  m.position.set(0,-0.6,w==='bat'?0.35:(WGEO[w].parameters&&WGEO[w].parameters.depth?WGEO[w].parameters.depth/2:0.12));h.armR.add(m);h.wModel=m;}
function reload(P){const w=P.weapon,W=WEAPONS[w];if(W.melee||W.thrown||P.reloadT>0||P.mag[w]>=W.mag||!(P.ammo[w]>0))return;P.reloadT=W.reload;P.reloadW=w;}
function raySphere(o,d,c,r){const ox=o.x-c[0],oy=o.y-c[1],oz=o.z-c[2];const b=ox*d.x+oy*d.y+oz*d.z;const cc=ox*ox+oy*oy+oz*oz-r*r;const disc=b*b-cc;if(disc<0)return Infinity;const t=-b-Math.sqrt(disc);return t>0?t:Infinity;}
const _o=new THREE.Vector3(),_d=new THREE.Vector3(),_gp=new THREE.Vector3(),_dd=new THREE.Vector3();
// Treffer entlang eines Strahls bestimmen (Menschen, Fahrzeuge, Häuser, Boden)
function castRay(o,d,tMin,tMax,ignoreH,ignoreCar){let best=Infinity,hit=null,kind=null,head=false;
  for(const h of HUMANS){if(h===ignoreH||h.inCar||h.state==='dead'||!h.g.visible&&h.state!=='walk')continue;if(Math.abs(h.x-o.x)>tMax||Math.abs(h.z-o.z)>tMax)continue;
    const tb=raySphere(o,d,[h.x,h.y+1.15,h.z],0.42),th=raySphere(o,d,[h.x,h.y+1.68,h.z],0.2);const t=Math.min(tb,th);if(t>tMin&&t<best){best=t;hit=h;kind='h';head=th<tb;}}
  for(const c of CARS){if(c===ignoreCar)continue;if(Math.abs(c.x-o.x)>tMax||Math.abs(c.z-o.z)>tMax)continue;for(const cc of carCircles(c)){const t=raySphere(o,d,[cc[0],c.y+c.T.H*0.5,cc[1]],cc[2]);if(t>tMin&&t<best){best=t;hit=c;kind='c';}}}
  for(let t=tMin;t<Math.min(best,tMax);t+=0.5){const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;const gh=gridH(x,z);if(y<groundY(x,z)-((mfG(idx(x,z))&4)&&!bridgeLocal(x,z)?5:0)||(gh!==255&&gh>0&&y<gh&&!bridgeLocal(x,z))){best=t;hit=null;kind='w';break;}}
  return {t:best,hit,kind,head};}
function playerFire(P,I){const h=P.h,W=WEAPONS[P.weapon];if(P.fireT>0||P.gameOver)return;
  if(W.melee){if(P.car)return;P.fireT=W.rate;h.armR.rotation.x=-1.8;const fx=Math.sin(h.facing),fz=Math.cos(h.facing);let best=null,bd=W.range;
    for(const o of HUMANS){if(o===h||!o.alive||o.inCar)continue;const dx=o.x-h.x,dz=o.z-h.z;const d=Math.hypot(dx,dz);if(d<bd&&(dx*fx+dz*fz)/Math.max(d,0.01)>0.4){bd=d;best=o;}}
    noiseHit(0.25,0.06,500);if(best){noiseHit(0.5,0.1,700);knockHuman(best,fx*(P.weapon==='bat'?6:3),fz*(P.weapon==='bat'?6:3),2.4,W.dmg,true);if(best.kind==='cop')crime('hitCop',best.x,best.z);else if(best.alive&&best.kind==='ped')pedFlee(best,h.x,h.z);if(best.kind==='gang')best.hostile=true;}return;}
  if(W.thrown){if((P.ammo[P.weapon]||0)<=0)return;P.fireT=W.rate;P.ammo[P.weapon]--;P.camera.getWorldDirection(_d);const sx=P.car?P.car.x:h.x,sz=P.car?P.car.z:h.z,sy=(P.car?P.car.y+1.6:h.y+1.7);
    const sp=P.car?14:16;throwProjectile(P.weapon,sx+_d.x*0.8,sy,sz+_d.z*0.8,_d.x*sp+(P.car?P.car.vx:0),_d.y*sp+5.5,_d.z*sp+(P.car?P.car.vz:0),P);h.armR.rotation.x=-2.6;
    if(!(P.ammo[P.weapon]>0))cycleWeapon(P,1);return;}
  if(P.reloadT>0)return;if(!(P.mag[P.weapon]>0)){reload(P);return;}
  if(P.car&&!(P.weapon==='pistol'||P.weapon==='smg'))return;
  P.mag[P.weapon]--;P.fireT=W.rate;P.aimT=1.4;if(!P.car){h.aiming=true;h.facing=P.cam.yaw;}
  P.camera.getWorldPosition(_o);P.camera.getWorldDirection(_dd);
  const anchor=P.car?new THREE.Vector3(P.car.x,P.car.y+1.4,P.car.z):new THREE.Vector3(h.x,h.y+1.5,h.z);const tMin=_o.distanceTo(anchor)+(P.car?1.5:0.3);
  if(!P.car&&h.wModel)h.wModel.getWorldPosition(_gp);else _gp.copy(anchor);
  for(let k=0;k<(W.pellets||1);k++){_d.copy(_dd);const sp=W.spread*(I&&I.aim?0.6:1)*(P.car?1.8:1);_d.x+=mr(-sp,sp);_d.y+=mr(-sp,sp);_d.z+=mr(-sp,sp);_d.normalize();
    const r=castRay(_o,_d,tMin,180,h,P.car);const best=r.t===Infinity?120:r.t;const hx=_o.x+_d.x*best,hy=_o.y+_d.y*best,hz=_o.z+_d.z*best;
    if(k<3)tracer(_gp.x,_gp.y,_gp.z,hx,hy,hz);
    if(r.kind==='h'){const o=r.hit;const dmg=r.head?Math.max(100,W.dmg):W.dmg;const pv=playerOfHuman(o);if(pv){if(G.split)damagePlayer(pv,dmg*0.5);continue;}
      if(o.health-dmg<=0)knockHuman(o,_d.x*2.5,_d.z*2.5,1.2,dmg,true);else{o.health-=dmg;if(o.kind==='cop')crime('hitCop',o.x,o.z);else if(o.kind==='gang')o.hostile=true;else pedFlee(o,h.x,h.z);}
      for(let j=0;j<3;j++)spawnPart(hx,hy,hz,{color:0x6a1010,size:0.18,vy:mr(0,1),vx:mr(-1,1),vz:mr(-1,1),life:0.35,grow:0.2,alpha:0.7});}
    else if(r.kind==='c'){r.hit.damage(W.dmg*0.28,true);spawnPart(hx,hy,hz,{color:0xffe08a,size:0.3,vy:0.5,life:0.12,grow:0,add:true});if(r.hit.T.police)crime('copcar',r.hit.x,r.hit.z);else if(r.hit.ai.mode==='traffic'){r.hit.ai.ghost=6;r.hit.ai.limit*=1.5;}}
    else if(r.kind==='w')spawnPart(hx,hy,hz,{color:0xbbbbbb,size:0.4,vy:0.6,life:0.4,grow:0.6,alpha:0.6});}
  flashLight.position.copy(_gp);flashLight.intensity=8;flashT=0.05;sfxShot(h.x,h.z,W.vol,W.f);
  spawnPart(_gp.x,_gp.y,_gp.z,{color:0xffd27a,size:0.35,vy:0,life:0.05,grow:0,add:true});
  for(const o of HUMANS){if(o.kind==='ped'&&o.alive&&o.state==='walk'&&Math.abs(o.x-h.x)<45&&Math.abs(o.z-h.z)<45)pedFlee(o,h.x,h.z);}
  crime('shoot',h.x,h.z);}

// ---------- Wurfgeschosse, Feuer, Explosionen ----------
const PROJ=[],FIRES=[];
const FIRE_LIGHTS=[0,1,2].map(()=>{const l=new THREE.PointLight(0xff7a2a,0,22,1.6);scene.add(l);return l;});
function throwProjectile(kind,x,y,z,vx,vy,vz,owner){const m=new THREE.Mesh(WGEO[kind],WMAT[kind]);m.position.set(x,y,z);m.castShadow=true;scene.add(m);PROJ.push({kind,x,y,z,vx,vy,vz,m,t:0,owner,fuse:kind==='grenade'?2.4:99});}
function updateProjectiles(dt){for(let i=PROJ.length-1;i>=0;i--){const p=PROJ[i];p.t+=dt;p.vy-=9.8*dt;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt,nz=p.z+p.vz*dt;
    const gy=groundY(nx,nz)-((mfG(idx(nx,nz))&4)&&!bridgeLocal(nx,nz)?5:0);const gh=gridH(nx,nz);const wall=gh!==255&&gh>0&&ny<gh&&!bridgeLocal(nx,nz);
    let hitCar=null;for(const c of CARS){if(Math.abs(c.x-nx)<2.5&&Math.abs(c.z-nz)<2.5&&ny<c.y+c.T.H&&!(p.owner&&p.owner.car===c)&&p.t>0.15){hitCar=c;break;}}
    let impact=ny<=gy+0.05||wall||hitCar;
    if(p.kind==='grenade'){if(impact){if(wall){p.vx*=-0.4;p.vz*=-0.4;}else{p.vy=Math.abs(p.vy)*0.35;p.vx*=0.6;p.vz*=0.6;}impact=false;}else{p.x=nx;p.y=ny;p.z=nz;}
      if(p.t>p.fuse){explodeAt(p.x,Math.max(p.y,gy),p.z,8,110,p.owner);scene.remove(p.m);PROJ.splice(i,1);continue;}}
    else if(impact){const fy=wall?Math.max(gy,p.y):gy;if(fy<-2){noiseHit(0.3*distVol(nx,nz),0.3,900);}else{startFire(p.x,p.z,fy,p.owner);if(hitCar){hitCar.damage(30,true);}noiseHit(0.5*distVol(nx,nz),0.3,1800);for(let k=0;k<10;k++)spawnPart(p.x,fy+0.4,p.z,{color:0xd0f0ff,size:0.12,vx:mr(-3,3),vy:mr(1,3),vz:mr(-3,3),life:0.4,grow:0,add:true});}
      scene.remove(p.m);PROJ.splice(i,1);continue;}
    else{p.x=nx;p.y=ny;p.z=nz;}
    p.m.position.set(p.x,p.y,p.z);p.m.rotation.x+=dt*8;p.m.rotation.z+=dt*5;
    if(p.kind==='molotov'&&Math.random()<dt*25)spawnPart(p.x,p.y+0.15,p.z,{color:0xffa040,size:0.3,vy:0.3,life:0.25,grow:0.5,add:true});}}
function startFire(x,z,y,owner){FIRES.push({x,z,y,r:3.6,t:8,owner});crime('arson',x,z);}
function updateFires(dt){for(let i=FIRES.length-1;i>=0;i--){const f=FIRES[i];f.t-=dt;if(f.t<=0){FIRES.splice(i,1);continue;}const k=Math.min(1,f.t/2);
    for(let n=0;n<Math.ceil(dt*60*k);n++){const a=Math.random()*TAU,r=Math.sqrt(Math.random())*f.r;spawnPart(f.x+Math.cos(a)*r,f.y+0.2,f.z+Math.sin(a)*r,{color:mpick([0xff6a10,0xffa030,0xffd060]),size:mr(0.6,1.4),vy:mr(1.5,3),vx:mr(-0.3,0.3),vz:mr(-0.3,0.3),life:mr(0.35,0.7),grow:0.8,add:true});}
    if(Math.random()<dt*6)spawnPart(f.x+mr(-1,1),f.y+2,f.z+mr(-1,1),{color:0x222222,size:mr(1.2,2.2),vy:2.2,life:2.2,grow:1.6,alpha:0.45});
    for(const h of HUMANS){if(h.inCar||!h.alive)continue;if(Math.hypot(h.x-f.x,h.z-f.z)<f.r){const pv=playerOfHuman(h);if(pv)damagePlayer(pv,dt*14);else{h.health-=dt*30;if(h.health<=0)knockHuman(h,0,0,1,1,true);else if(h.kind==='ped')pedFlee(h,f.x,f.z,6);}}}
    for(const c of CARS){if(Math.hypot(c.x-f.x,c.z-f.z)<f.r+1&&!c.T.boat)c.damage(dt*16,true);}}
  FIRE_LIGHTS.forEach((l,i)=>{const f=FIRES[i];if(f){l.position.set(f.x,f.y+1.5,f.z);l.intensity=(12+Math.sin(simTime*20+i)*4)*Math.min(1,f.t/2);}else l.intensity=0;});}
function explodeAt(x,y,z,R,dmg,owner){for(let i=0;i<40;i++)spawnPart(x+mr(-1.5,1.5),y+mr(0.3,2),z+mr(-1.5,1.5),{color:mpick([0xff7a1a,0xffb02e,0xffdf80]),size:mr(2,4),vy:mr(2,7),vx:mr(-4,4),vz:mr(-4,4),life:mr(0.4,0.9),grow:3,add:true});
  for(let i=0;i<20;i++)spawnPart(x+mr(-1,1),y+2,z+mr(-1,1),{color:0x222222,size:mr(2,3),vy:mr(2,5),life:mr(1.5,3),grow:2.5,alpha:0.7});
  flashLight.position.set(x,y+3,z);flashLight.intensity=80;flashLight.distance=45;flashT=0.35;sfxBoom(x,z);for(const P of PLAYERS){const [px,pz]=ppos(P);const d=Math.hypot(px-x,pz-z);if(d<60)P.cam.shake=Math.max(P.cam.shake,0.8*(1-d/60));}
  for(const h of HUMANS){if(h.inCar||!h.alive)continue;const d=Math.hypot(h.x-x,h.z-z);if(d<R){const pv=playerOfHuman(h);if(pv)damagePlayer(pv,dmg*(1-d/R));else knockHuman(h,(h.x-x)/Math.max(d,0.1)*9,(h.z-z)/Math.max(d,0.1)*9,6,dmg*(1-d/R)+20,!!owner);}}
  for(const c of CARS){if(c.dead)continue;const d=Math.hypot(c.x-x,c.z-z);if(d<R){c.damage(dmg*(1-d/R),true);c.vx+=(c.x-x)/Math.max(d,0.5)*6;c.vz+=(c.z-z)/Math.max(d,0.5)*6;}}
  if(owner)crime('explosion',x,z);}
function explode(car){car.dead=true;car.burn=0;car.bodyMat.color.setHex(0x161616);car.bodyMat.metalness=0;car.bodyMat.roughness=1;if(car.bodyMat.clearcoat!==undefined)car.bodyMat.clearcoat=0;car.sirenOn=false;
  explodeAt(car.x,car.y+0.5,car.z,7,100,null);G.stats.cars++;
  for(const P of PLAYERS)if(P.car===car)damagePlayer(P,200);
  if(car.copsIn>0)crime('killCop',car.x,car.z);if(car.T.boat){car.vx*=0.2;car.vz*=0.2;}}

// ===================== GANGS (Missionsgegner) =====================
function spawnGang(x,z,weapon='pistol',boss=false){const g=new Human('ped');g.kind='gang';g.state='gang';g.x=x;g.z=z;g.y=groundY(x,z);g.health=boss?220:80;g.weaponG=weapon;g.shootT=mr(0.5,1.5);g.hostile=false;g.boss=boss;g.alive=true;g.home=[x,z];
  g.hips.children[0].material=cmat(boss?0x1a1a1a:0x2a2a2a,0.5);if(!g.gun){g.gun=new THREE.Mesh(WGEO[weapon]||WGEO.pistol,WMAT[weapon]||WMAT.pistol);g.gun.position.set(0,-0.6,0.15);g.armR.add(g.gun);}
  const band=new THREE.Mesh(new THREE.TorusGeometry(0.13,0.025,6,16),cmat(0xb3202a,0.6));band.rotation.x=Math.PI/2;band.position.set(0,0.86,0);g.hips.add(band);g.facing=Math.random()*TAU;g.sync();return g;}
function updateGang(g,dt){if(g.state!=='gang'){updatePed(g,dt);return;}
  const P=nearestPlayer(g.x,g.z);const [px,pz]=ppos(P);const dx=px-g.x,dz=pz-g.z;const d=Math.hypot(dx,dz);
  if(!g.hostile&&(d<28||g.alert))g.hostile=true;
  let mv=0;if(g.hostile){g.aiming=d<45;if(d>14){mv=moveHuman(g,dx,dz,4.2,dt);}faceTo(g,dx,dz,dt,10);g.shootT-=dt;
      if(g.shootT<=0&&d<45){g.shootT=mr(0.7,1.5)*(g.weaponG==='smg'?0.5:1);if(los(g.x,1.5,g.z,px,1.4,pz))npcShoot(g,P,d);}}
  else{g.aiming=false;const hx=g.home[0]-g.x,hz=g.home[1]-g.z;if(Math.hypot(hx,hz)>3)mv=moveHuman(g,hx,hz,1.2,dt);}
  g.animate(dt,mv);g.y=groundY(g.x,g.z,g.y);g.sync();}
function npcShoot(n,P,d){const gp=n.gun||n.wModel;if(gp)gp.getWorldPosition(_gp);else _gp.set(n.x,n.y+1.4,n.z);const [px,pz]=ppos(P);const py=P.car?P.car.y+1:P.h.y+1.2;
  const ch=clamp(0.55-d/70,0.12,0.5)*(P.car?0.7:1)*(P.h.speedNow>3?0.7:1);const hitp=Math.random()<ch;const ox=hitp?0:mr(-2,2),oz=hitp?0:mr(-2,2);
  tracer(_gp.x,_gp.y,_gp.z,px+ox,py+mr(-0.3,0.5),pz+oz);sfxShot(n.x,n.z);if(hitp){if(P.car){P.car.damage(4);damagePlayer(P,2.5);}else damagePlayer(P,n.boss?9:7);}}

// ===================== SCHADEN, TOD, FESTNAHME =====================
function damagePlayer(P,d){if(P.gameOver||mode!=='play')return;if(P.pu&&P.pu.god>0)return;if(P.armor>0){const a=Math.min(P.armor,d*0.7);P.armor-=a;d-=a;}P.h.health-=d;P.hurtT=0.4;if(P.h.health<=0){P.h.health=0;wasted(P);}}
function wasted(P){if(P.gameOver)return;P.gameOver='wasted';P.gameOverT=5;if(!G.split)timeScale=0.35;const fee=Math.min(G.money,100+Math.floor(G.money*0.1));G.money-=fee;
  if(P.car){P.car.ctrl='none';P.car.inp={throttle:0,brake:1,steer:0};}else P.h.lie();
  if(P.id===0){showBig('ERLEDIGT','dead',5,`Universitätsmedizin · Behandlung €${fee}`);document.body.classList.add('desat');}else hint('Spieler 2: ERLEDIGT',4);}
function busted(P){if(P.gameOver)return;P.gameOver='busted';P.gameOverT=5;if(!G.split)timeScale=0.35;const fee=Math.min(G.money,100+Math.floor(G.money*0.1));G.money-=fee;
  if(P.car){P.car.ctrl='none';P.car.inp={throttle:0,brake:1,steer:0};}
  if(P.id===0){showBig('VERHAFTET','busted',5,`Polizeiinspektion · Kaution €${fee} · Waffen eingezogen`);document.body.classList.add('desat');}else hint('Spieler 2: VERHAFTET',4);}
function respawnPlayer(P,x,z,yaw){if(P.h&&P.h.room){const r=P.h.room;r.grp.visible=false;r.keeper.g.visible=false;P.h.room=null;INDOOR=null;closeShopMenu();}const [fx,fz]=freeSpot(x+(P.id?3:0),z,0.5);if(P.car){const c=P.car;c.vx=c.vz=0;c.speed=0;exitCar(P,true);}const h=P.h;h.x=fx;h.z=fz;h.y=groundY(fx,fz);h.health=100;h.alive=true;h.state='walk';h.stand();h.g.visible=true;h.inCar=false;
  P.cam.yaw=yaw;P.cam.init=false;P.vy=0;}
function updateGameOver(P,dt){if(!P.gameOver)return;P.gameOverT-=dt/Math.max(timeScale,0.01);
  if(P.gameOverT<=0){const k=P.gameOver;P.gameOver=null;timeScale=1;if(P.id===0)document.body.classList.remove('desat');
    if(k==='wasted')respawnPlayer(P,POI.klinik[0],POI.klinik[1],Math.PI);else{for(const w of WORDER)if(w!=='fist'){P.owned[w]=false;P.ammo[w]=0;P.mag[w]=0;}selectWeapon(P,'fist');respawnPlayer(P,POI.polizei[0],POI.polizei[1],0);}
    if(PLAYERS.every(Q=>!Q.gameOver)){clearWanted();if(activeMission)endMission('fail');for(let i=CARS.length-1;i>=0;i--){const c=CARS[i];if(c.T.police&&!c.mission)c.remove();}for(let i=HUMANS.length-1;i>=0;i--)if(HUMANS[i].kind==='cop')HUMANS[i].remove();managePopulation(0,true);}}}

// ===================== FAHNDUNG / POLIZEI =====================
function copNear(x,z,r){for(const h of HUMANS)if(h.kind==='cop'&&h.alive&&!h.inCar&&Math.abs(h.x-x)<r&&Math.abs(h.z-z)<r)return true;for(const c of CARS)if(c.T.police&&c.copsIn>0&&Math.abs(c.x-x)<r&&Math.abs(c.z-z)<r)return true;return false;}
const CRIME_PTS={kill:30,killCop:90,carjack:20,carjackCop:60,shoot:5,hitCop:30,copcar:10,stealCop:90,arson:25,explosion:40,robbery:60};
function crime(type,x,z){const always=type==='kill'||type==='killCop'||type==='stealCop'||type==='explosion'||type==='robbery';if(!always&&wanted===0&&!copNear(x,z,75))return;heat+=CRIME_PTS[type]||5;
  if(type==='kill'||type==='killCop')G.stats.kills++;
  const lvl=heat>=540?5:heat>=360?4:heat>=210?3:heat>=90?2:heat>=25?1:0;if(lvl>wanted){wanted=lvl;$('wanted').classList.remove('pulse');void $('wanted').offsetWidth;$('wanted').classList.add('pulse');}seenT=0;playerSeen=true;}
function setWanted(l){wanted=l;heat=[0,25,90,210,360,540][l];seenT=0;playerSeen=true;}
function clearWanted(msg){wanted=0;heat=0;seenT=0;for(const P of PLAYERS)P.bustT=0;if(msg)hint(msg,3);}
function spawnCop(x,z,car){const c=new Human('cop');c.x=x;c.z=z;c.y=groundY(x,z);c.state='cop';c.homeCar=car;c.shootT=mr(0.8,1.6);c.side=1;c.walkSpeed=1.4;return c;}
function spawnPolice(){const P=PLAYERS[Math.floor(Math.random()*PLAYERS.length)];const [px,pz]=ppos(P);const fx=Math.sin(P.cam.yaw),fz=Math.cos(P.cam.yaw);
  for(let k=0;k<120;k++){const e=(Math.random()*EDGES.length)|0;const E=EDGES[e];if(!E.car||E.road.bridge)continue;const A=NODES[E.a],B=NODES[E.b];const mx=(A.x+B.x)/2,mz=(A.z+B.z)/2;const d=Math.hypot(mx-px,mz-pz);if(d<110||d>230)continue;
    if(((mx-px)*fx+(mz-pz)*fz)/d>0.5&&k<80)continue;const from=Math.random()<0.5?E.a:E.b;const [x,z]=laneAt(e,from,E.len/2);if(blocked(x,z))continue;const dd=edgeDir(e,from);
    const c=new Car('polizei',x,z,Math.atan2(dd[0],dd[1]),{ctrl:'ai',plate:'MZ-P '+(1000+Math.random()*8999|0)});c.copsIn=2;c.ai={mode:'police',repath:0,path:[],pi:0};c.sirenOn=true;return c;}return null;}
function aiPolice(car,dt){const ai=car.ai;const P=nearestPlayer(car.x,car.z);const [px,pz]=ppos(P);const [pvx,pvz]=pvel(P);const d=Math.hypot(px-car.x,pz-car.z);car.sirenOn=true;
  const pSpeed=P.car?Math.abs(P.car.speed):0;
  if(P.car&&P.car.T.boat){speedCtl(car,0);return;}
  if(Math.abs(car.speed)<0.8&&d>60){ai.idleT=(ai.idleT||0)+dt;if(ai.idleT>12){car.remove();return;}}else ai.idleT=0;
  if(car.copsIn>0&&d<20&&(!P.car||pSpeed<4)){speedCtl(car,0);car.inp.steer=0;if(Math.abs(car.speed)<1){for(let i=0;i<car.copsIn;i++){const [x,z]=doorPos(car,i?-1:1);spawnCop(x,z,car);}car.copsIn=0;ai.mode='police_parked';}return;}
  if(car.copsIn===0){ai.mode='police_parked';return;}
  ai.losT=(ai.losT||0)-dt;if(ai.losT<=0){ai.losT=0.4;ai.los=d<90&&los(car.x,1.5,car.z,px,1.5,pz);}
  let tx=px+pvx*0.6,tz=pz+pvz*0.6;
  if(!(ai.los||d<30)){ai.repath-=dt;if(ai.repath<=0||!ai.path.length){ai.repath=1.6;ai.path=dijkstra(nearestNode(car.x,car.z,false),nearestNode(px,pz,false));ai.pi=0;}
    while(ai.pi<ai.path.length){const N=NODES[ai.path[ai.pi]];if(Math.hypot(N.x-car.x,N.z-car.z)<9)ai.pi++;else break;}if(ai.pi<ai.path.length){const N=NODES[ai.path[ai.pi]];tx=N.x;tz=N.z;}}
  if(ai.rev>0){ai.rev-=dt;car.inp.throttle=0;car.inp.brake=1;car.inp.steer=-ai.revSteer;return;}
  let st=steerTo(car,tx,tz);const look=5+Math.max(0,car.speed)*0.45;const fx=Math.sin(car.h),fz=Math.cos(car.h);
  if(blocked(car.x+fx*look,car.z+fz*look)){const l=blocked(car.x+Math.sin(car.h+0.6)*look,car.z+Math.cos(car.h+0.6)*look),r=blocked(car.x+Math.sin(car.h-0.6)*look,car.z+Math.cos(car.h-0.6)*look);if(!l&&r)st=1;else if(!r&&l)st=-1;else if(!l&&!r)st=st>=0?1:-1;}
  car.inp.steer=st;const ang=Math.abs(angDiff(car.h,Math.atan2(tx-car.x,tz-car.z)));let desired=(wanted>=3?30:24)*clamp(1-ang*0.6,0.25,1);if(!P.car||pSpeed<4)desired=Math.min(desired,Math.max(0,d-13)*0.9+1.5);else if(d<25)desired=Math.max(desired,pSpeed+4);
  speedCtl(car,desired);car.inp.hand=ang>1.2&&car.speed>12;
  if(car.inp.throttle>0.3&&Math.abs(car.speed)<0.6){ai.stuck=(ai.stuck||0)+dt;if(ai.stuck>1.8){ai.rev=1.3;ai.revSteer=st||1;ai.stuck=0;}}else ai.stuck=0;}
function updateCop(c,dt){
  if(c.state!=='cop'&&c.state!=='copReturn'){updatePed(c,dt);return;}
  const P=nearestPlayer(c.x,c.z);const [px,pz]=ppos(P);const dx=px-c.x,dz=pz-c.z;const d=Math.hypot(dx,dz);
  if(wanted===0)c.state='copReturn';
  if(c.state==='copReturn'||(P.car&&d>50&&c.homeCar&&!c.homeCar.dead&&!c.homeCar.removed)){c.aiming=false;const car=c.homeCar;
    if(!car||car.dead||car.removed||isPlayerCar(car)){if(wanted===0){c.state='walk';const n=nearestNode(c.x,c.z,false);if(n>=0&&NODES[n].e.length)pedEnterEdge(c,NODES[n].e[0],n);else c.state='flee';}else c.state='cop';c.sync();return;}
    const ex=car.x-c.x,ez=car.z-c.z;const de=Math.hypot(ex,ez);if(de<2.8){c.remove();car.copsIn=(car.copsIn||0)+1;if(wanted>0)car.ai={mode:'police',repath:0,path:[],pi:0};else{car.sirenOn=false;car.driver='npc';car.ai={mode:'traffic'};aiInitTraffic(car);}return;}
    const mv=moveHuman(c,ex,ez,4.4,dt);faceTo(c,ex,ez,dt,8);c.animate(dt,mv);c.y=groundY(c.x,c.z,c.y);c.sync();return;}
  c.aiming=wanted>=2&&d<38;let mv=0;
  if(!c.aiming){if(d>1.1)mv=moveHuman(c,dx,dz,5.2,dt);faceTo(c,dx,dz,dt,10);}
  else{if(d>16)mv=moveHuman(c,dx,dz,4.6,dt);faceTo(c,dx,dz,dt,10);c.shootT-=dt;if(c.shootT<=0){c.shootT=mr(0.9,1.7);if(los(c.x,1.5,c.z,px,1.4,pz))npcShoot(c,P,d);}}
  if(c.gun)c.gun.visible=true;c.animate(dt,mv);c.y=groundY(c.x,c.z,c.y);c.sync();}
const heli={on:false,x:0,z:0,y:60,g:null,rotor:null,cone:null};
function buildHeli(){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(1.2,2.6,6,12).rotateX(Math.PI/2),new THREE.MeshPhysicalMaterial({color:0x1d3f7a,roughness:0.35,metalness:0.4,clearcoat:1}));g.add(body);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(1.1,16,10,0,TAU,0,Math.PI/2).rotateX(Math.PI/2),GLASS_MAT);nose.position.set(0,0.1,1.6);g.add(nose);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.35,6,8).rotateX(Math.PI/2),stdMat({color:0xeef1f3}));tail.position.set(0,0.4,-4.8);g.add(tail);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.5,0.9),stdMat({color:0x1d3f7a}));fin.position.set(0,1.0,-7.6);g.add(fin);
  const rotor=new THREE.Mesh(new THREE.BoxGeometry(11,0.06,0.35),M.dark);rotor.position.y=1.5;g.add(rotor);const r2=rotor.clone();r2.rotation.y=Math.PI/2;rotor.add(r2);
  for(const s of [-1,1]){const sk=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,3.6),M.dark);sk.position.set(s*1.0,-1.5,0);g.add(sk);}
  const cone=new THREE.Mesh(new THREE.ConeGeometry(9,60,20,1,true).translate(0,-30,0),new THREE.MeshBasicMaterial({color:0xfff6d0,transparent:true,opacity:0.08,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  cone.position.y=-1;g.add(cone);g.traverse(o=>{if(o.isMesh&&o!==cone)o.castShadow=true;});g.visible=false;scene.add(g);heli.g=g;heli.rotor=rotor;heli.cone=cone;
  heli.light=new THREE.SpotLight(0xfff4d8,0,160,0.18,0.5,1);scene.add(heli.light);scene.add(heli.light.target);}
function updateHeli(dt){const want=wanted>=4&&PLAYERS.some(P=>!P.gameOver);const [px,pz]=ppos(nearestPlayer(heli.x,heli.z));
  if(want&&!heli.on){heli.on=true;heli.x=px+mr(-300,300);heli.z=pz+mr(-300,300);heli.y=80;heli.g.visible=true;}
  if(!heli.on){heli.light.intensity=0;return;}const tx=want?px+Math.sin(simTime*0.3)*20:px+600,tz=want?pz+Math.cos(simTime*0.3)*20:pz+600;
  heli.x+=(tx-heli.x)*Math.min(1,dt*0.6);heli.z+=(tz-heli.z)*Math.min(1,dt*0.6);heli.y+=((want?48:110)-heli.y)*dt*0.5;
  heli.g.position.set(heli.x,heli.y,heli.z);heli.g.rotation.y=Math.atan2(px-heli.x,pz-heli.z);heli.g.rotation.z=Math.sin(simTime)*0.05;heli.rotor.rotation.y+=dt*30;
  heli.cone.lookAt(px,0,pz);heli.cone.rotateX(-Math.PI/2);heli.cone.scale.set(1,Math.hypot(px-heli.x,heli.y,pz-heli.z)/60,1);heli.cone.visible=nightF>0.2;
  heli.light.position.set(heli.x,heli.y-1,heli.z);heli.light.target.position.set(px,0,pz);heli.light.intensity=want?nightF*4000:0;
  if(!want&&Math.hypot(px-heli.x,pz-heli.z)>500){heli.on=false;heli.g.visible=false;}}
function updatePolice(dt){
  if(wanted>0&&PLAYERS.some(P=>!P.gameOver)){seeCheckT-=dt;if(seeCheckT<=0){seeCheckT=0.35;let seen=false;
      for(const P of PLAYERS){const [px,pz]=ppos(P);if(heli.on&&Math.hypot(heli.x-px,heli.z-pz)<160)seen=true;
        if(!seen)for(const h of HUMANS){if(h.kind==='cop'&&h.alive&&!h.inCar&&Math.abs(h.x-px)<70&&Math.abs(h.z-pz)<70&&los(h.x,1.6,h.z,px,1.4,pz)){seen=true;break;}}
        if(!seen)for(const c of CARS){if(c.T.police&&c.copsIn>0&&!c.dead&&Math.abs(c.x-px)<95&&Math.abs(c.z-pz)<95&&los(c.x,1.5,c.z,px,1.4,pz)){seen=true;break;}}}
      playerSeen=seen;}
    if(playerSeen)seenT=0;else{seenT+=dt;if(seenT>8+wanted*4.5){clearWanted('Die Polizei hat die Spur verloren.');chime([660,550,440]);}}
    policeSpawnT-=dt;const want=[0,1,2,3,4,6][wanted]+(G.split?1:0);const active=CARS.filter(c=>c.T.police&&(c.ai.mode==='police'||c.ai.mode==='police_parked')&&!c.dead).length;
    if(active<want&&policeSpawnT<=0){policeSpawnT=wanted>=3?2:4;if(!spawnPolice())policeSpawnT=0.25;}
    for(const P of PLAYERS){if(P.gameOver)continue;const [px,pz]=ppos(P);let close=false;for(const h of HUMANS){if(h.kind==='cop'&&h.alive&&h.state==='cop'&&Math.hypot(h.x-px,h.z-pz)<(P.car?3:1.5)){close=true;break;}}
      const slow=P.car?Math.abs(P.car.speed)<1.5:(wanted<=2||Math.hypot(P.h.vx,P.h.vz)<0.5);if(close&&slow){P.bustT+=dt;if(P.bustT>(P.car?1.8:1.3))busted(P);}else P.bustT=Math.max(0,P.bustT-dt);}}
  else{for(const c of CARS)if(c.T.police&&c.ai.mode==='police'){c.sirenOn=false;c.ai={mode:'traffic'};c.driver='npc';aiInitTraffic(c);}}
  updateHeli(dt);}
