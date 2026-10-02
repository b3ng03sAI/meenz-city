// ===================== WEITERE WAFFEN (wie bei GTA) =====================
Object.assign(WEAPONS,{
  messer:{name:'MESSER',melee:true,dmg:60,rate:0.32,range:1.8},
  saege:{name:'KETTENSÄGE',melee:true,auto:true,dmg:16,rate:0.08,range:2.3,saw:true},
  scharf:{name:'SCHARFSCHÜTZENGEWEHR',mag:5,dmg:160,rate:1.15,spread:0.0004,reload:2.6,vol:1,f:1700},
  minigun:{name:'MINIGUN',mag:200,dmg:17,rate:0.042,spread:0.032,auto:true,reload:3.5,vol:0.6,f:2900},
  rpg:{name:'RAKETENWERFER',mag:1,dmg:0,rate:1.0,reload:2.2,rocket:true,vol:0.3,f:600},
  flammen:{name:'FLAMMENWERFER',mag:150,dmg:0,rate:0.05,auto:true,reload:2.8,flame:true,vol:0,f:400},
});
WORDER.splice(WORDER.indexOf('bat')+1,0,'messer','saege');WORDER.splice(WORDER.indexOf('rifle')+1,0,'scharf','minigun','flammen','rpg');
{const M=(c,r=0.5,m=0.3)=>stdMat({color:c,roughness:r,metalness:m});const mg=(...gs)=>mergeGeometries(gs.map(g=>g.toNonIndexed()));
  WGEO.messer=mg(new THREE.BoxGeometry(0.02,0.04,0.24).translate(0,0,0.18),new THREE.BoxGeometry(0.035,0.05,0.12));WMAT.messer=M(0xc9ced4,0.25,0.9);
  WGEO.saege=mg(new THREE.BoxGeometry(0.16,0.2,0.32),new THREE.BoxGeometry(0.03,0.08,0.55).translate(0,-0.02,0.42),new THREE.BoxGeometry(0.04,0.1,0.06).translate(0,0.14,-0.05));WMAT.saege=M(0xe86a10,0.5,0.2);
  WGEO.scharf=mg(new THREE.BoxGeometry(0.05,0.1,1.0),new THREE.CylinderGeometry(0.03,0.03,0.3,8).rotateX(Math.PI/2).translate(0,0.09,0.05));WMAT.scharf=M(0x2b3326,0.45,0.4);
  WGEO.minigun=mg(...[0,1,2,3,4,5].map(k=>new THREE.CylinderGeometry(0.018,0.018,0.85,6).rotateX(Math.PI/2).translate(Math.cos(k)*0.045,Math.sin(k)*0.045,0.2)),new THREE.BoxGeometry(0.14,0.14,0.3).translate(0,0,-0.15));WMAT.minigun=M(0x33363a,0.35,0.8);
  WGEO.rpg=mg(new THREE.CylinderGeometry(0.06,0.06,1.1,10).rotateX(Math.PI/2),new THREE.ConeGeometry(0.07,0.2,10).rotateX(Math.PI/2).translate(0,0,0.62));WMAT.rpg=M(0x4d5a3a,0.6,0.2);
  WGEO.flammen=mg(new THREE.BoxGeometry(0.06,0.08,0.7),new THREE.CylinderGeometry(0.07,0.07,0.3,10).translate(0,-0.12,-0.05));WMAT.flammen=M(0xb3261e,0.4,0.3);
  WGEO.rakete=new THREE.ConeGeometry(0.07,0.5,8).rotateX(Math.PI/2);WMAT.rakete=M(0x556b2f,0.5,0.3);}
Object.assign(PICK_WEAPON,{messer:1,saege:1,scharf:15,minigun:400,rpg:5,flammen:300});
// Raketen
const ROCKETS=[];
function fireRocket(P){const h=P.h;P.camera.getWorldPosition(_o);P.camera.getWorldDirection(_dd);const sx=P.car?P.car.x:h.x,sz=P.car?P.car.z:h.z,sy=(P.car?P.car.y+1.8:h.y+1.6);
  // Ziel: Punkt, auf den die Kamera zeigt
  const r=castRay(_o,_dd,(P.car?6:2),260,h,P.car);const T=r.t===Infinity?240:r.t;const tx=_o.x+_dd.x*T,ty=_o.y+_dd.y*T,tz=_o.z+_dd.z*T;let dx=tx-sx,dy=ty-sy,dz=tz-sz;const L=Math.hypot(dx,dy,dz)||1;dx/=L;dy/=L;dz/=L;
  const m=new THREE.Mesh(WGEO.rakete,WMAT.rakete);m.position.set(sx+dx*0.9,sy+dy*0.9,sz+dz*0.9);m.lookAt(sx+dx*2,sy+dy*2,sz+dz*2);scene.add(m);
  ROCKETS.push({x:m.position.x,y:m.position.y,z:m.position.z,vx:dx*58,vy:dy*58,vz:dz*58,t:0,m,owner:P});noiseHit(0.8,0.5,500);noiseHit(0.5,1.0,1600);crime('shoot',sx,sz);}
function updateRockets(dt){for(let i=ROCKETS.length-1;i>=0;i--){const r=ROCKETS[i];r.t+=dt;const nx=r.x+r.vx*dt,ny=r.y+r.vy*dt,nz=r.z+r.vz*dt;let hit=r.t>4;
    const gy=groundY(nx,nz,ny)-(swimHere(nx,nz,ny)?5:0);const gh=gridH(nx,nz);if(ny<=gy||(gh>0&&gh!==255&&ny<gh&&!bridgeLocal(nx,nz)))hit=true;
    if(!hit)for(const c of CARS){if(r.owner&&r.owner.car===c)continue;if(Math.abs(c.x-nx)<c.T.L/2+0.5&&Math.abs(c.z-nz)<c.T.L/2+0.5&&ny>c.y-0.3&&ny<c.y+c.T.H+0.5){hit=true;break;}}
    if(!hit)for(const h of HUMANS){if(!h.alive||h.inCar||h===r.owner.h)continue;if(Math.abs(h.x-nx)<0.7&&Math.abs(h.z-nz)<0.7&&ny>h.y&&ny<h.y+2){hit=true;break;}}
    if(!hit&&UFO.on&&Math.hypot(UFO.x-nx,UFO.y-ny,UFO.z-nz)<9){hit=true;ufoHit(r.owner);}
    r.x=nx;r.y=ny;r.z=nz;r.m.position.set(nx,ny,nz);
    if(Math.random()<dt*60)spawnPart(nx,ny,nz,{color:0xbbbbbb,size:mr(0.5,0.9),vy:0.3,life:1.1,grow:1.4,alpha:0.5});spawnPart(nx,ny,nz,{color:0xffb040,size:0.5,vy:0,life:0.06,grow:0,add:true});
    if(hit){explodeAt(r.x,Math.max(r.y,gy),r.z,9,140,r.owner);scene.remove(r.m);ROCKETS.splice(i,1);}}}
// Flammenwerfer
function fireFlame(P,dt){const h=P.h;const fx=Math.sin(P.cam.yaw),fz=Math.cos(P.cam.yaw);h.facing=P.cam.yaw;h.aiming=true;P.aimT=0.6;const ox=h.x+fx*0.8,oz=h.z+fz*0.8,oy=h.y+1.2;
  for(let k=0;k<4;k++){const sp=mr(9,14);const a=mr(-0.12,0.12);const dx=Math.sin(P.cam.yaw+a),dz=Math.cos(P.cam.yaw+a);spawnPart(ox,oy,oz,{color:mpick([0xff6a10,0xffa030,0xffd060]),size:mr(0.4,0.8),vx:dx*sp,vy:mr(0,1.5),vz:dz*sp,life:mr(0.45,0.6),grow:2.2,add:true});}
  if(Math.random()<0.3)noiseHit(0.25,0.12,350);
  for(const o of HUMANS){if(o===h||!o.alive||o.inCar)continue;const dx=o.x-h.x,dz=o.z-h.z;const d=Math.hypot(dx,dz);if(d>7.5||d<0.1)continue;if((dx*fx+dz*fz)/d<0.85)continue;
    const pv=playerOfHuman(o);if(pv){if(G.split)damagePlayer(pv,4);continue;}o.health-=9;o.onFire=3;if(o.health<=0)knockHuman(o,fx*2,fz*2,1,1,true);else if(o.kind==='ped')pedFlee(o,h.x,h.z,8);else if(o.kind==='gang')o.hostile=true;else if(o.kind==='cop')crime('hitCop',o.x,o.z);}
  for(const c of CARS){if(c===P.car)continue;const dx=c.x-h.x,dz=c.z-h.z;const d=Math.hypot(dx,dz);if(d<8&&d>0.1&&(dx*fx+dz*fz)/d>0.8)c.damage(1.6,true);}
  P.flameAcc=(P.flameAcc||0)+1;if(P.flameAcc>22){P.flameAcc=0;const gx=h.x+fx*6,gz=h.z+fz*6;if(!swimHere(gx,gz)&&!blocked(gx,gz))startFire(gx,gz,groundY(gx,gz),P);}
  crime('shoot',h.x,h.z);}
// brennende Passanten
function updateBurning(dt){for(const o of HUMANS){if(!o.onFire)continue;o.onFire-=dt;if(!o.alive){o.onFire=0;continue;}if(Math.random()<dt*25)spawnPart(o.x+mr(-0.3,0.3),o.y+mr(0.5,1.7),o.z+mr(-0.3,0.3),{color:mpick([0xff6a10,0xffa030]),size:mr(0.4,0.7),vy:1.6,life:0.4,grow:0.8,add:true});o.health-=dt*12;if(o.health<=0)knockHuman(o,0,0,1,1,true);}}
// Kettensäge: Brummen
function sawSound(){const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(95+Math.random()*20,t);const g=ctx.createGain();g.gain.setValueAtTime(0.06,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.09);o.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+0.1);}
const _playerFire0=playerFire;
playerFire=function(P,I){const W=WEAPONS[P.weapon];if(P.swim){return;}
  if(W.rocket||W.flame){if(P.fireT>0||P.gameOver||P.reloadT>0)return;if(!(P.mag[P.weapon]>0)){reload(P);return;}if(P.car&&W.flame)return;
    P.mag[P.weapon]--;P.fireT=W.rate;if(W.rocket){if(!P.car){P.h.aiming=true;P.h.facing=P.cam.yaw;P.aimT=1.4;}fireRocket(P);if(!(P.mag[P.weapon]>0))reload(P);}else fireFlame(P,W.rate);return;}
  if(W.saw&&!P.car){if(P.fireT>0)return;sawSound();}
  _playerFire0(P,I);};
// Waffen auf der Karte verteilen + Cheat-Codes wie bei GTA
function setupNewWeapons(){const L=[['messer',[POI.markt[0]-25,POI.markt[1]+15]],['saege',[POI.zollhafen[0]-30,POI.zollhafen[1]-25]],['scharf',[POI.zitadelle[0]+30,POI.zitadelle[1]-30]],['minigun',[POI.reduit[0]+70,POI.reduit[1]+40]],['flammen',[POI.winterhafen[0]-40,POI.winterhafen[1]-30]]];
  if(POI.flugplatz)L.push(['rpg',[POI.flugplatz[0],POI.flugplatz[1]]]);for(const [k,p] of L)addPickup(k,p[0],p[1],{amount:PICK_WEAPON[k]});}
const CHEAT={buf:'',codes:{
  MEENZERWAFFE:P=>{for(const w of ['bat','messer','saege','pistol','smg','shotgun','rifle','scharf','minigun','flammen','rpg','molotov','grenade'])giveWeapon(P,w,WEAPONS[w].thrown?10:WEAPONS[w].melee?1:Math.max(60,(WEAPONS[w].mag||1)*4));P.armor=100;return 'Alle Waffen + Weste';},
  FLIEGEMAA:P=>{const [x,z]=ppos(P);const fx=Math.sin(P.cam.yaw),fz=Math.cos(P.cam.yaw);const c=new Car('flugzeug',x+fx*14,z+fz*14,P.cam.yaw,{ctrl:'none'});c.y=Math.max(c.y,groundY(c.x,c.z));c.air=false;c.ai={mode:'parked'};return 'Flugzeug gespawnt';},
  JETSKI:P=>{const [x,z]=ppos(P);const w=waterSpotNear(x,z,600);if(!w)return 'Kein Wasser in der Nähe';const c=new Car('jetski',w[0],w[1],w[2],{ctrl:'none'});c.ai={mode:'docked'};return 'Jetski liegt am Wasser bereit';},
  UFOKOMMT:P=>{ufoStart(true);return 'Schau mal nach oben…';},
  HELAU:P=>{P.h.health=100;P.armor=100;return 'Gesund wie e Meenzer Fleischworscht';}}};
addEventListener('keydown',e=>{if(mode!=='play'||e.repeat||!/^Key[A-Z]$/.test(e.code))return;CHEAT.buf=(CHEAT.buf+e.code.slice(3)).slice(-16);for(const k in CHEAT.codes)if(CHEAT.buf.endsWith(k)){CHEAT.buf='';const msg=CHEAT.codes[k](P1);showBig('CHEAT AKTIVIERT','win',2.5,msg);chime([523,784,1046]);}});
