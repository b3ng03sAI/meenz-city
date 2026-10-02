// ===================== 33 HUBSCHRAUBER FLIEGEN =====================
// Steuerbarer Hubschrauber (CAR_TYPES.hubschrauber): einer auf dem Vorfeld am Flugplatz Großer Sand, einer auf dem
// Dach-Landeplatz an der Unimedizin. Schwebeflug: Leertaste steigen, Shift/Strg sinken, W/S vor/zurück, A/D drehen.
// Landen geht auf jedem Boden und Flachdach (groundY/ELEV), harte Aufschläge beschädigen ihn.
// Bei 4+ Sternen landet der Polizeihubschrauber (heli aus p4b_combat.js) ab und zu – einsteigen = klauen = 5 Sterne.
CAR_TYPES.hubschrauber={name:'Hubschrauber',L:8.6,W:2.2,H:2.9,hubi:true,max:44,acc:8,grip:6,mass:1.3,wb:2.4,wr:0.3,cab:[0,0],color:0xb3121b};

const HUBI={list:[],sites:[],cop:null,copCD:25,frame:0,hud:null,hintShown:false,
  CLIMB:10,SINK:9,HARD_VY:6,HARD_HS:15,COP_WAIT:25,COP_CD:90,
  get active(){const c=P1&&P1.car;return c&&c.T.hubi?c:null;},
  get alt(){const c=this.active;return c?c.alt||0:0;},
  get rotor(){const c=this.active;return c?c.rotor||0:0;},
  get copHeli(){return heli;},
  copLand:P=>hubiCopLand(P||P1),
  spawnAt:(x,z,h,o)=>hubiSpawn(x,z,h,o)};

// --- Rumpf (Lackfarbe), Kufen/Mast/Triebwerk (det), Kanzel (glass) ---
const _hubiCarGeo=carGeo;
carGeo=function(id){const T=CAR_TYPES[id];if(!T||!T.hubi)return _hubiCarGeo(id);if(CAR_GEO.has(id))return CAR_GEO.get(id);
  const P=[];const lat=new THREE.LatheGeometry([[0.02,-1.7],[0.55,-1.45],[0.92,-0.7],[1.04,0.3],[0.96,1.25],[0.7,1.95],[0.3,2.35],[0.02,2.45]].map(p=>new THREE.Vector2(p[0],p[1])),16);
  lat.rotateX(Math.PI/2);lat.scale(1,1.08,1);lat.translate(0,1.42,0);P.push(lat.toNonIndexed());
  P.push(new THREE.CylinderGeometry(0.34,0.13,4.3,10).rotateX(Math.PI/2).translate(0,1.72,-3.45).toNonIndexed());   // Heckausleger
  P.push(new THREE.BoxGeometry(0.1,1.35,0.85).translate(0,2.2,-5.45).toNonIndexed());                                // Seitenleitwerk
  P.push(new THREE.BoxGeometry(1.7,0.07,0.5).translate(0,1.72,-4.7).toNonIndexed());                                  // Höhenleitwerk
  P.push(new THREE.BoxGeometry(0.95,0.42,1.9).translate(0,2.5,-0.35).toNonIndexed());                                 // Triebwerksverkleidung
  for(const g of P){if(g.attributes.uv===undefined)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(g.index)g.setIndex(null);}
  const body=mergeGeometries(P.map(g=>{const n=new THREE.BufferGeometry();n.setAttribute('position',g.attributes.position);n.setAttribute('normal',g.attributes.normal);n.setAttribute('uv',g.attributes.uv);return n;}));body.computeVertexNormals();
  const k={r:0.1,g:0.1,b:0.11},sil={r:0.62,g:0.64,b:0.67};const det=new GB(),head=new GB(),tail=new GB();
  for(const s of [-1,1]){det.beam([s*1.0,0.06,-1.45],[s*1.0,0.06,1.55],0.09,0.07,sil);det.beam([s*1.0,0.06,1.55],[s*1.0,0.32,1.95],0.09,0.07,sil);   // Kufen
    for(const z of [-0.75,0.85])det.beam([s*1.0,0.06,z],[s*0.55,0.62,z],0.07,0.06,k);}                                                          // Streben
  det.beam([0,2.7,0.1],[0,3.0,0.1],0.2,0.2,k);gbox(det,0,2.28,-1.4,0.6,0.3,0.5,k);                                                               // Mast, Auspuff
  const lightW={r:1,g:0.97,b:0.9},red={r:1,g:0.06,b:0.04};gbox(head,0,0.55,2.0,0.16,0.1,0.1,lightW);gbox(tail,0,2.92,-5.5,0.08,0.1,0.12,red);
  const glass=new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*0.62).rotateX(Math.PI/2).scale(0.9,0.72,1.0).translate(0,1.62,1.0);
  const r={body,glass,det:det.geo(),head:head.geo(),tail:tail.geo()};CAR_GEO.set(id,r);return r;};

// --- Rotoren + Beschriftung: geteilte Geometrien/Materialien, beim ersten sync angehängt ---
let HUBI_PARTS=null;
function hubiPartsGeo(){if(HUBI_PARTS)return HUBI_PARTS;const bladeM=cmat(0x1a1a1c,0.5);
  HUBI_PARTS={blade:new THREE.BoxGeometry(0.3,0.05,9.4),hub:new THREE.CylinderGeometry(0.28,0.28,0.22,10),tblade:new THREE.BoxGeometry(0.05,1.35,0.14),
    disc:new THREE.CircleGeometry(4.7,32).rotateX(-Math.PI/2),tdisc:new THREE.CircleGeometry(0.68,16).rotateY(Math.PI/2),decal:new THREE.PlaneGeometry(1.5,0.3),
    bladeM,hubM:cmat(0x55595e,0.4),discM:new THREE.MeshBasicMaterial({color:0x777777,transparent:true,opacity:0.2,depthWrite:false,side:THREE.DoubleSide}),
    copM:stdMat({map:polizeiTex,roughness:0.5}),resM:null};return HUBI_PARTS;}
function hubiAttach(c){const Q=hubiPartsGeo();const main=new THREE.Group();main.position.set(0,3.02,0.1);
  const b1=new THREE.Mesh(Q.blade,Q.bladeM),b2=new THREE.Mesh(Q.blade,Q.bladeM);b2.rotation.y=Math.PI/2;b1.castShadow=b2.castShadow=true;
  const disc=new THREE.Mesh(Q.disc,Q.discM);main.add(b1);main.add(b2);main.add(new THREE.Mesh(Q.hub,Q.hubM));main.add(disc);c.g.add(main);
  const tr=new THREE.Group();tr.position.set(0.14,2.25,-5.5);const tb=new THREE.Mesh(Q.tblade,Q.bladeM);const td=new THREE.Mesh(Q.tdisc,Q.discM);tr.add(tb);tr.add(td);c.g.add(tr);
  c.hubiParts={main,tr,disc,td};
  // Räder, Nummernschilder und Bodenschatten des Auto-Grundgerüsts ausblenden (Kufen statt Räder)
  for(const w of c.wheels)w.pv.visible=false;
  const ch=c.g.children;if(Array.isArray(ch))for(const m of ch){if(m.geometry===BLOB_G)c.hubiBlob=m;else if(m.material&&m.material.map===c.plateTex)m.visible=false;}
}
function hubiDecals(c){const Q=hubiPartsGeo();let mat=null;if(c.hubiCop)mat=Q.copM;
  else if(c.hubiRescue){if(!Q.resM)Q.resM=stdMat({map:freeAfterUpload(textTex('LUFTRETTUNG',{w:256,h:48,bg:'#f2f2f0',fg:'#c62828',font:'800 40px "Barlow Condensed", Arial Narrow, sans-serif'})),roughness:0.5});mat=Q.resM;}
  if(mat)for(const s of [-1,1]){const p=new THREE.Mesh(Q.decal,mat);p.position.set(s*1.04,1.3,0.25);p.rotation.y=s*Math.PI/2;c.g.add(p);}}

// --- Schwebeflug-Physik ---
function hubiKeys(c){const P=PLAYERS.find(Q=>Q.car===c);const up=!!c.inp.hand||(P&&P.id===0&&!!keys.KeyO);
  const down=!!(P&&P.id===0&&(keys.ShiftLeft||keys.ControlLeft||keys.KeyV));return [up&&!down,down&&!up];}
Car.prototype.hubiStep=function(dt,inp){const T=this.T;if(this.air===undefined){this.air=false;this.alt=0;this.pitch=0;this.roll=0;this.rotor=this.rotor||0;}
  if(!(this.vy===this.vy)||this.vy===undefined)this.vy=0;if(!(this.y===this.y))this.y=groundY(this.x,this.z);
  const piloted=this.ctrl==='player',alive=!this.dead&&!(this.burn>0);const [up,down]=piloted&&alive?hubiKeys(this):[false,false];
  const spin=alive&&(piloted||this.air)?1:0;this.rotor+=(spin-this.rotor)*Math.min(1,dt*(spin?1.3:0.35));
  const lift=clamp((this.rotor-0.6)/0.3,0,1);
  const thr=piloted&&alive?inp.throttle||0:0,brk=piloted&&alive?inp.brake||0:0;
  this.steer+=((piloted?inp.steer||0:0)-this.steer)*Math.min(1,dt*4);
  if(!this.air){this.vx=this.vz=this.speed=0;this.vy=0;this.pitch+=(0-this.pitch)*Math.min(1,dt*4);this.roll+=(0-this.roll)*Math.min(1,dt*4);
    this.y=groundY(this.x,this.z,this.y);this.alt=0;
    if(up&&lift>=1){this.air=true;this.vy=1;}
    return;}
  // in der Luft: Kollektiv → Sollsteigrate, begrenzte Vertikalbeschleunigung (nach unten höchstens g)
  const gy=groundY(this.x,this.z,this.y);const alt=this.y-gy;let tvy;
  if(!alive)tvy=-60;else if(!piloted)tvy=-4.5;                                  // verlassen: Autorotation, sinkt langsam
  else if(up)tvy=HUBI.CLIMB;else if(down)tvy=Math.max(-HUBI.SINK,-1.2-alt*0.9);   // Sinken mit Abfang-Hilfe kurz überm Boden
  else tvy=0;
  const ay=alive?clamp((tvy-this.vy)*3*lift-9.81*(1-lift),-9.81,7):-9.81;this.vy+=ay*dt;
  // Längs: Nase runter = vor; Quer: Seitendrift klingt ab; Gieren mit A/D
  const fx=Math.sin(this.h),fz=Math.cos(this.h),rx=-fz,rz=fx;let vF=this.vx*fx+this.vz*fz,vL=this.vx*rx+this.vz*rz;
  const tvF=thr*T.max-brk*12;const acc=(thr||brk)?T.acc:3.5;vF+=clamp(tvF-vF,-acc*dt,acc*dt)*lift;vL*=Math.exp(-1.5*dt);
  this.h+=this.steer*1.25*lift*dt;
  this.pitch+=((-thr*0.22+brk*0.14)-this.pitch)*Math.min(1,dt*3);this.roll+=(-this.steer*0.22*Math.min(1,Math.abs(vF)/10+0.3)-this.roll)*Math.min(1,dt*3);
  const nfx=Math.sin(this.h),nfz=Math.cos(this.h);this.vx=nfx*vF-nfz*vL;this.vz=nfz*vF+nfx*vL;this.speed=vF;
  if(this.x<MINX+40)this.vx=Math.max(this.vx,4);if(this.x>MAXX-40)this.vx=Math.min(this.vx,-4);if(this.z<MINZ+40)this.vz=Math.max(this.vz,4);if(this.z>MAXZ-40)this.vz=Math.min(this.vz,-4);
  this.move(dt);                                                                 // Wände: Abprall + Schaden (Car.move)
  this.y=Math.min(420,this.y+this.vy*dt);if(this.y>=420)this.vy=Math.min(this.vy,0);
  const g2=groundY(this.x,this.z,this.y+Math.max(0,-this.vy*dt)+0.05);this.alt=Math.max(0,this.y-g2);
  if(this.y<=g2)this.hubiTouch(g2);};
Car.prototype.hubiTouch=function(g2){const piloted=this.ctrl==='player';const hs=Math.hypot(this.vx,this.vz),vy=this.vy;
  const i=idx(this.x,this.z);const wat=i>=0&&(mfG(i)&4)&&!bridgeLocal(this.x,this.z)&&g2<0.5;
  const hard=vy<-HUBI.HARD_VY||hs>HUBI.HARD_HS||Math.abs(this.roll)>0.5||wat;
  this.y=g2;this.air=false;this.vy=0;this.alt=0;this.vx=this.vz=this.speed=0;this.pitch=0;this.roll=0;
  if(hard&&!this.dead){const dmg=wat?300:25+Math.max(0,-vy-HUBI.HARD_VY)*12+Math.max(0,hs-HUBI.HARD_HS)*5;this.damage(dmg);onCrash(this,Math.min(30,8+dmg*0.15));
    if(piloted)hint(wat?'Notwasserung im Rhein!':'Bruchlandung!',2.5);}
  else if(piloted&&!this.dead){hint(g2>3?'Auf dem Dach gelandet! 🚁':'Sauber gelandet! 🚁',2);chime([660,880]);}};
Car.prototype.hubiSync=function(dt){if(!this.hubiParts)hubiAttach(this);if(this.pitch===undefined){this.pitch=0;this.roll=0;}
  this.g.position.set(this.x,this.y,this.z);this.g.rotation.set(-(this.pitch||0),this.h,this.roll||0);
  const r=this.rotor||0;this.rotorA=(this.rotorA||0)+r*30*dt;const Q=this.hubiParts;Q.main.rotation.y=this.rotorA;Q.tr.rotation.x=this.rotorA*1.7;
  Q.disc.visible=Q.td.visible=r>0.45;if(this.hubiBlob)this.hubiBlob.visible=!this.air;
  this.tailMat.emissiveIntensity=this.dead?0:(Math.floor(simTime*1.5)%2?3:0.4);
  if(this.dead&&Math.random()<dt*10)spawnPart(this.x,this.y+1.8,this.z,{color:0x222222,size:mr(1.5,3),vy:2,life:2,grow:2,alpha:0.6});};
const _hubiPhysics=Car.prototype.physics;
Car.prototype.physics=function(dt){if(this.T.hubi)this.hubiF=HUBI.frame;return _hubiPhysics.call(this,dt);};
const _hubiPhysStep=Car.prototype.physStep;
Car.prototype.physStep=function(dt){if(!this.T.hubi)return _hubiPhysStep.call(this,dt);this.hubiStep(dt,this.inp);};
const _hubiSync=Car.prototype.sync;
Car.prototype.sync=function(dt=0){if(!this.T.hubi)return _hubiSync.call(this,dt);this.hubiSync(dt);};

// --- Ein-/Aussteigen, Kamera ---
const _hubiEnterCar=enterCar;
enterCar=function(P,c){_hubiEnterCar(P,c);if(!c.T.hubi)return;
  if(!HUBI.hintShown){HUBI.hintShown=true;hint('<b>Hubschrauber</b> · <b>Leertaste</b> steigen · <b>Shift</b> sinken · <b>W/S</b> vor/zurück · <b>A/D</b> drehen · <b>F</b> aussteigen',8,P);}
  if(c.hubiCop&&!c.hubiStolen){c.hubiStolen=true;if(HUBI.cop&&HUBI.cop.car===c){HUBI.cop=null;HUBI.copCD=HUBI.COP_CD;heli.on=false;heli.g.visible=false;}
    setWanted(5);hint('Polizeihubschrauber geklaut! ★★★★★',3,P);}};
const _hubiExitCar=exitCar;
exitCar=function(P,force=false){const c=P.car;if(!c||!c.T.hubi||!(c.alt>4))return _hubiExitCar(P,force);
  const h=P.h;h.x=c.x-Math.cos(c.h)*2.5;h.z=c.z+Math.sin(c.h)*2.5;h.y=c.y-0.5;P.vy=0;P.ground=false;P.airT=1;h.facing=c.h;h.inCar=false;h.g.visible=true;h.stand();h.g.rotation.set(0,c.h,0);
  c.driver=null;c.ctrl='none';c.ai={mode:'none'};c.inp={throttle:0,brake:0,steer:0,hand:false};P.car=null;h.sync();updateWeaponModel(P);hint('Abgesprungen! <b>Leertaste halten</b> für den Jetpack.',3,P);};
const _hubiUpdateCamera=updateCamera;
updateCamera=function(P,dt){const c=P.car;if(!c||!c.T.hubi)return _hubiUpdateCamera(P,dt);const cam=P.cam,z0=cam.zoom;cam.zoom=(z0||1)*1.25;
  if(!(simTime-cam.lastLook<1.3)&&Math.abs(c.speed)<=2){cam.yaw+=angDiff(cam.yaw,c.h)*Math.min(1,dt*1.2);cam.pitch+=((c.air?0.34:0.22)-cam.pitch)*Math.min(1,dt*1.2);}
  _hubiUpdateCamera(P,dt);cam.zoom=z0;};

// --- Landeplätze: Vorfeld am Flugplatz, Flachdach an der Unimedizin ---
let HUBI_PAD_TEX=null;
function hubiPadMesh(x,y,z){if(!HUBI_PAD_TEX)HUBI_PAD_TEX=freeAfterUpload(canvasTex(256,256,g=>{g.fillStyle='#3a3d42';g.fillRect(0,0,256,256);g.strokeStyle='#f2c500';g.lineWidth=14;g.beginPath();g.arc(128,128,108,0,TAU);g.stroke();
    g.fillStyle='#f4f4f0';g.fillRect(80,62,24,132);g.fillRect(152,62,24,132);g.fillRect(80,116,96,24);},false));
  const geo=new THREE.CircleGeometry(6.5,32).rotateX(-Math.PI/2).translate(x,y+0.05,z);
  const m=new THREE.Mesh(geo,stdMat({map:HUBI_PAD_TEX,roughness:0.9,polygonOffset:true,polygonOffsetFactor:-2}));m.receiveShadow=true;scene.add(m);staticMesh(m);return m;}
function hubiKlinikRoof(){const [kx,kz]=POI.klinik;let best=null,bd=1e9;
  for(const b of BUILDINGS){const d=Math.hypot(b.x-kx,b.z-kz);if(d>260||d>=bd||(b.roof>=1&&b.roof<=5)||b.roof===7)continue;const v=gridH(b.x,b.z);if(v<8||v>40)continue;
    let ok=true;for(let a=-7;a<=7&&ok;a++)for(let c=-7;c<=7;c++)if(gridH(b.x+a,b.z+c)!==v){ok=false;break;}if(ok){best=[b.x,b.z,v,b];bd=d;}}
  if(best)return best;const [x,z]=freeSpot(kx+30,kz,5);return [x,z,groundY(x,z)];}
function hubiSpawn(x,z,h,o={}){const c=new Car('hubschrauber',x,z,h,{ctrl:'none',color:o.color,plate:o.plate||'D-HMZ'+'ABCDEFGH'[HUBI.list.length%8]});
  c.hubiCop=!!o.cop;c.hubiRescue=!!o.rescue;hubiDecals(c);
  c.y=o.y??groundY(x,z);c.air=false;c.alt=0;c.pitch=0;c.roll=0;c.vy=0;c.rotor=o.rotor||0;c.ai={mode:'parked'};c.persist=true;c.sync(0);HUBI.list.push(c);return c;}
function setupHubi(){flugBuild();
  const [fx,fz]=flugP(-150,FLUG.side*55);const kr=hubiKlinikRoof();
  HUBI.sites=[{name:'Flugplatz Großer Sand',x:fx,z:fz,y:groundY(fx,fz),h:FLUG.h+Math.PI,color:0xb3121b},
    {name:'Unimedizin (Dach)',x:kr[0],z:kr[1],y:kr[2],h:0,color:0xf2f2f0,rescue:true}];
  for(const S of HUBI.sites){hubiPadMesh(S.x,S.y,S.z);S.car=hubiSpawn(S.x,S.z,S.h,{y:S.y,color:S.color,rescue:S.rescue});}
  HUBI.padB=kr[3]||null;label('Hubschrauber-Landeplatz',kr[0],kr[1],'small');}

// --- Polizeihubschrauber landet (nur bei 4+ Sternen) und kann geklaut werden ---
function hubiOpenSpot(x,z,r0,r1){for(const parkOnly of [true,false])for(let r=r0;r<=r1;r+=6)for(let a=0;a<TAU;a+=0.4){const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;let ok=true;
  for(let u=-6;u<=6&&ok;u+=2)for(let v=-6;v<=6;v+=2){const qx=px+u,qz=pz+v;const i=idx(qx,qz);if(i<0||blocked(qx,qz)||(mfG(i)&4)||(parkOnly&&(mfG(i)&2))){ok=false;break;}}
  if(ok&&!CARS.some(c=>Math.hypot(c.x-px,c.z-pz)<9))return [px,pz];}return null;}
function hubiCopLand(P){if(HUBI.cop||!heli.g)return false;const [px,pz]=ppos(P);const s=hubiOpenSpot(px,pz,18,72);if(!s){HUBI.copCD=10;return false;}
  if(!heli.on){heli.on=true;heli.x=s[0]+60;heli.z=s[1]+60;heli.y=60;}HUBI.cop={phase:'down',x:s[0],z:s[1],gy:groundY(s[0],s[1]),t:0,car:null};return true;}
function hubiCopStep(dt){const E=HUBI.cop;E.t+=dt;heli.light.intensity=0;heli.cone.visible=false;heli.rotor.rotation.y+=dt*30;
  if(E.phase==='down'){heli.g.visible=true;const k=Math.min(1,dt*0.9);const dx=E.x-heli.x,dz=E.z-heli.z;const d=Math.hypot(dx,dz);
    if(d>0.5)heli.g.rotation.y=Math.atan2(dx,dz);heli.x+=dx*k;heli.z+=dz*k;if(d<14)heli.y=Math.max(E.gy+1.2,heli.y-7*dt);heli.g.rotation.z=0;heli.g.position.set(heli.x,heli.y,heli.z);
    if((d<1&&heli.y<=E.gy+1.25)||E.t>30){const c=hubiSpawn(E.x,E.z,heli.g.rotation.y,{y:E.gy,color:0x1d3f7a,cop:true,plate:'POLIZEI',rotor:1});E.car=c;heli.g.visible=false;E.phase='ground';E.t=0;
      const fx=Math.sin(c.h),fz=Math.cos(c.h);for(const s of [-1,1]){const [x,z]=freeSpot(E.x+fz*s*3.5,E.z-fx*s*3.5,0.4);spawnCop(x,z,null);}
      for(const Q of PLAYERS)if(Math.hypot(ppos(Q)[0]-E.x,ppos(Q)[1]-E.z)<150)hint('De <b>Polizeihubschrauber</b> is gelandet – klau en dir!',3,Q);}}
  else if(E.phase==='ground'){const c=E.car;if(!c||c.removed||c.dead){HUBI.cop=null;HUBI.copCD=HUBI.COP_CD;heli.on=false;heli.g.visible=false;return;}
    if(E.t>HUBI.COP_WAIT&&!isPlayerCar(c)){heli.x=c.x;heli.z=c.z;heli.y=c.y+1.2;heli.g.rotation.y=c.h;c.remove();HUBI.list=HUBI.list.filter(q=>q!==c);E.car=null;E.phase='up';heli.g.visible=true;}}
  else{heli.y+=8*dt;heli.g.position.set(heli.x,heli.y,heli.z);if(heli.y>48){HUBI.cop=null;HUBI.copCD=HUBI.COP_CD;}}}
// Landeplatz-Dach frei halten: keine Dachszenen/-aufbauten aus p4m_roofs.js
const _hubiRoofCandidates=roofCandidates;
roofCandidates=function(){const L=_hubiRoofCandidates();const i=HUBI.padB?L.indexOf(HUBI.padB):-1;if(i>=0)L.splice(i,1);return L;};
const _hubiUpdateHeli=updateHeli;
updateHeli=function(dt){if(HUBI.cop){hubiCopStep(dt);return;}_hubiUpdateHeli(dt);};

// --- Pro Frame: verlassene Hubschrauber in der Luft weitersimulieren, Rotor auslaufen lassen, Nachschub, HUD ---
function updateHubi(dt){const waiting=HUBI.cop&&HUBI.cop.car;
  for(const c of HUBI.list){if(c.removed)continue;
    if(c.ctrl==='none'&&c.air&&c.hubiF!==HUBI.frame)c.physics(dt);                           // Hauptschleife überspringt stehende Fahrzeuge
    else if(!c.air&&!isPlayerCar(c)&&c!==waiting)c.rotor=Math.max(0,(c.rotor||0)-dt*0.35);
    c.persist=!c.dead&&!c.burn;}
  HUBI.list=HUBI.list.filter(c=>!c.removed);HUBI.frame++;
  if(!heli.on)HUBI.copCD=Math.max(HUBI.copCD,25);HUBI.copCD-=dt;
  if(!HUBI.cop&&heli.on&&wanted>=4&&HUBI.copCD<=0){const P=nearestPlayer(heli.x,heli.z);if(P&&!P.car&&!P.gameOver)hubiCopLand(P);else HUBI.copCD=5;}
  HUBI.respawnT=(HUBI.respawnT||0)-dt;if(HUBI.respawnT<=0){HUBI.respawnT=20;
    for(const S of HUBI.sites){const c=S.car;if(c&&!c.removed&&(!c.dead||isPlayerCar(c)))continue;if(minPlayerDist(S.x,S.z)<250)continue;
      if(c&&!c.removed&&!isPlayerCar(c))c.remove();S.car=hubiSpawn(S.x,S.z,S.h,{y:S.y,color:S.color,rescue:S.rescue});}}
  if(!HUBI.hud){const d=document.createElement('div');d.id='hubihud';d.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);padding:6px 14px;border-radius:10px;background:rgba(8,14,24,.62);color:#e8f2ff;font:600 15px "Barlow Condensed",sans-serif;letter-spacing:.04em;pointer-events:none;z-index:30;display:none;white-space:nowrap';document.body.appendChild(d);HUBI.hud=d;}
  const c=HUBI.active;if(!c){HUBI.hud.style.display='none';return;}
  const sink=c.air&&c.vy<-4.5&&c.alt<20;const rot=Math.round((c.rotor||0)*100);
  HUBI.hud.style.display='block';HUBI.hud.innerHTML=`🚁 ${Math.round(Math.hypot(c.vx,c.vz)*3.6)} km/h · Höhe ${Math.round(c.alt||0)} m · ${c.vy>=0?'+':''}${(c.vy||0).toFixed(1)} m/s${rot<100?` · Rotor ${rot}%`:''}${c.air?'':' · am Boden'}${sink?' · <span style="color:#ff6a5a">SINKRATE!</span>':''}`;}
