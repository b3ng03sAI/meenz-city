// ===================== FLUGPLATZ GROSSER SAND + SPORTFLUGZEUG =====================
// Auf dem Großen Sand (Gonsenheim/Mombach) lag früher der Mainzer Flugplatz – hier entsteht eine Graspiste mit Asphaltbahn.
const FLUG={C:[-3600,-125],h:Math.PI/2,LEN:620,W:28,built:false,planes:[],hud:null,hintShown:false};
function flugU(){return [Math.sin(FLUG.h),Math.cos(FLUG.h)];}
function flugP(s,w){const [ux,uz]=flugU();return [FLUG.C[0]+ux*s-uz*w,FLUG.C[1]+uz*s+ux*w];}
function flugOnRunway(x,z,m=0){const [ux,uz]=flugU();const dx=x-FLUG.C[0],dz=z-FLUG.C[1];const s=dx*ux+dz*uz,w=-dx*uz+dz*ux;return Math.abs(s)<FLUG.LEN/2+m&&Math.abs(w)<FLUG.W/2+m;}
function flugFree(s,w,r){for(let a=-r;a<=r;a+=2)for(let b=-r;b<=r;b+=2){const [x,z]=flugP(s+a,w+b);if(gridH(x,z)!==0)return false;}return true;}
function flugBuild(){if(FLUG.built)return;FLUG.built=true;const [ux,uz]=flugU();const rot=FLUG.h;
  // Piste
  const gb=new GB();const asph={r:0.24,g:0.245,b:0.26},wh={r:0.92,g:0.92,b:0.9},ye={r:0.95,g:0.75,b:0.1};
  const bx=(s,w,ls,ws,y,c)=>{const [x,z]=flugP(s,w);gb.box(x,y,z,ws,0.012,ls,rot,c,4);};
  bx(0,0,FLUG.LEN,FLUG.W,0.02,asph);
  for(let s=-FLUG.LEN/2+40;s<FLUG.LEN/2-40;s+=30)bx(s,0,15,0.6,0.035,wh);
  for(const e of [-1,1]){for(let k=-5;k<=5;k++)if(k)bx(e*(FLUG.LEN/2-14),k*2.2,20,1.1,0.035,wh);bx(0,e*(FLUG.W/2-0.6),FLUG.LEN,0.45,0.035,wh);bx(e*(FLUG.LEN/2-60),0,4,FLUG.W-4,0.035,wh);}
  // Rollweg + Vorfeld (Nordseite, falls frei, sonst Süd)
  const side=flugFree(-150,-50,14)?-1:1;FLUG.side=side;
  bx(-150,side*30,12,40,0.018,asph);bx(-150,side*55,70,34,0.018,asph);for(let s=-180;s<=-120;s+=20)bx(s,side*55,0.5,30,0.03,ye);
  const run=new THREE.Mesh(gb.geo(),stdMat({vertexColors:true,roughness:0.9}));run.receiveShadow=true;scene.add(run);
  // Hangar (offene Seite zum Vorfeld) mit Tonnendach
  const [hx,hz]=flugP(-150,side*82);const hang=new THREE.Group();hang.position.set(hx,0,hz);hang.rotation.y=rot+(side<0?0:Math.PI);
  const wallM=stdMat({color:0x9aa3aa,roughness:0.6,metalness:0.4});const roofG=new THREE.CylinderGeometry(9,9,26,24,1,true,-Math.PI/2,Math.PI);roofG.rotateZ(Math.PI/2);roofG.rotateY(Math.PI/2);
  const roof=new THREE.Mesh(roofG,stdMat({color:0x7f8a92,roughness:0.5,metalness:0.6,side:THREE.DoubleSide}));roof.scale.set(1,0.75,1);roof.position.y=4.2;roof.rotation.y=Math.PI/2;hang.add(roof);
  for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(0.4,4.2,26),wallM);w.position.set(s*9,2.1,0);hang.add(w);}
  const back=new THREE.Mesh(new THREE.BoxGeometry(18,4.2,0.4),wallM);back.position.set(0,2.1,-13);hang.add(back);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(10,1.4),stdMat({map:textTex('FLUGPLATZ GROSSER SAND',{w:1024,h:140,bg:'#123a6b',fg:'#ffffff',font:'800 96px "Barlow Condensed",sans-serif'})}));sign.position.set(0,7.6,12.6);hang.add(sign);
  hang.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(hang);
  {const c=Math.cos(hang.rotation.y),s=Math.sin(hang.rotation.y);const W2=(lx,lz)=>[hx+lx*c+lz*s,hz-lx*s+lz*c];
    for(const sx of [-1,1]){const [x,z]=W2(sx*9,0);rasterOBB(HG,x,z,0.8,26,hang.rotation.y,8);}const [x,z]=W2(0,-13);rasterOBB(HG,x,z,18,0.8,hang.rotation.y,8);}
  // Tower mit Glaskanzel
  const [tx,tz]=flugP(-90,side*70);const tw=new THREE.Group();tw.position.set(tx,0,tz);
  const tb=new THREE.Mesh(new THREE.BoxGeometry(4,9,4),stdMat({color:0xe8e2d6,roughness:0.8}));tb.position.y=4.5;tw.add(tb);
  const tg=new THREE.Mesh(new THREE.CylinderGeometry(3.2,2.8,2.2,8),new THREE.MeshPhysicalMaterial({color:0x223844,roughness:0.05,metalness:0.2,clearcoat:1}));tg.position.y=10.1;tw.add(tg);
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.6,0.3,8),stdMat({color:0x444a50}));tr.position.y=11.35;tw.add(tr);const bc=new THREE.Mesh(new THREE.SphereGeometry(0.35,10,8),new THREE.MeshBasicMaterial({color:0xff3020}));bc.position.y=11.8;tw.add(bc);FLUG.beacon=bc;
  tw.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(tw);rasterOBB(HG,tx,tz,4,4,0,11);
  // Windsack
  const [wx,wz]=flugP(60,side*(FLUG.W/2+14));const ws=new THREE.Group();ws.position.set(wx,0,wz);const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,6,8),cmat(0xdddddd,0.4));pole.position.y=3;ws.add(pole);
  const sock=new THREE.Group();sock.position.y=5.8;const sg=new THREE.CylinderGeometry(0.45,0.2,2.6,12,4,true);sg.rotateX(Math.PI/2);sg.translate(0,0,1.3);
  const sockM=new THREE.Mesh(sg,new THREE.MeshStandardMaterial({color:0xff6a10,roughness:0.7,side:THREE.DoubleSide}));sock.add(sockM);ws.add(sock);scene.add(ws);FLUG.sock=sock;
  // Rand-Lichter
  const lg=new THREE.InstancedMesh(new THREE.SphereGeometry(0.18,6,4),new THREE.MeshBasicMaterial({color:0xfff2b0}),Math.ceil(FLUG.LEN/30)*2+2);let n=0;const mm=new THREE.Matrix4();
  for(let s=-FLUG.LEN/2;s<=FLUG.LEN/2;s+=30)for(const e of [-1,1]){const [x,z]=flugP(s,e*(FLUG.W/2+1.5));mm.makeTranslation(x,0.25,z);lg.setMatrixAt(n++,mm);}lg.count=n;scene.add(lg);FLUG.lights=lg;
  label('Flugplatz Großer Sand',FLUG.C[0],FLUG.C[1],'small');
  POI.flugplatz=flugP(-150,side*45);
  // Flugzeuge auf dem Vorfeld
  flugSpawnPlanes();}
function flugSpawnPlanes(){FLUG.planes=FLUG.planes.filter(c=>!c.removed);const side=FLUG.side;const spots=[[-170,side*55],[-130,side*55]];
  spots.forEach((p,i)=>{const [x,z]=flugP(...p);if(CARS.some(c=>Math.hypot(c.x-x,c.z-z)<9))return;const c=new Car('flugzeug',x,z,FLUG.h+Math.PI,{ctrl:'none',color:i?0xf4c430:0xf2f2f0,plate:i?'D-EMNZ':'D-EMZK'});c.ai={mode:'parked'};c.persist=true;FLUG.planes.push(c);});}
// Propeller wird beim ersten Sync angehängt
function planeProp(c){const g=new THREE.Group();const hub=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.45,12).rotateX(Math.PI/2),cmat(0xcc2222,0.4));g.add(hub);
  const bl=new THREE.Mesh(new THREE.BoxGeometry(0.16,1.9,0.05),cmat(0x1d1d1d,0.5));g.add(bl);const disc=new THREE.Mesh(new THREE.CircleGeometry(0.98,24),new THREE.MeshBasicMaterial({color:0x888888,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));g.add(disc);g.userData={bl,disc};
  g.position.set(0,1.5,2.82);c.g.add(g);c.prop=g;
  const reg=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.38),stdMat({map:textTex(c.plateText,{w:256,h:56,bg:'rgba(0,0,0,0)',fg:'#123a6b',font:'800 48px "Barlow Condensed",sans-serif'}),transparent:true}));
  for(const s of [-1,1]){const r=reg.clone();r.position.set(s*0.6,1.75,-1.9);r.rotation.y=s*Math.PI/2;c.g.add(r);}}
Car.prototype.planeStep=function(dt,inp){const T=this.T;if(this.pitch===undefined){this.pitch=0;this.roll=0;this.air=false;this.alt=0;}if(!(this.vy===this.vy)||this.vy===undefined)this.vy=0;if(!(this.y===this.y))this.y=groundY(this.x,this.z);
  const gy=groundY(this.x,this.z);const piloted=this.ctrl==='player';const dive=piloted&&(keys.ShiftLeft||keys.ControlLeft);
  let v=this.speed;const thr=inp.throttle||0,brk=inp.brake||0;this.steer+=((inp.steer||0)-this.steer)*Math.min(1,dt*(this.air?3:5));
  if(!this.air){
    v+=(thr*T.acc*1.15-0.012*v-0.00045*v*v)*dt;if(brk>0){if(v>0.3)v-=9*brk*dt;else if(v>-2&&thr===0)v-=1.5*brk*dt;}if(!piloted&&Math.abs(v)<0.4)v=0;v=Math.max(v,-2.5);
    this.h+=this.steer*0.55*Math.min(1,Math.abs(v)/5)*Math.sign(v||1)/(1+Math.max(0,v)*0.04)*dt;
    const rot=v>27&&(inp.hand||v>36);this.pitch+=((rot?0.2:0)-this.pitch)*Math.min(1,dt*2.2);this.roll+=(0-this.roll)*Math.min(1,dt*4);
    this.y=gy;this.vy=0;if(v>28&&this.pitch>0.12){this.air=true;this.vy=2;if(piloted)hint('Abgehoben! <b>Leertaste</b> hochziehen · <b>Shift</b>/<b>S</b> Nase runter · <b>A/D</b> Kurven',4);}
    const fx=Math.sin(this.h),fz=Math.cos(this.h);this.vx=fx*v;this.vz=fz*v;this.speed=v;this.move(dt);this.y=groundY(this.x,this.z);
    const i=idx(this.x,this.z);if(i>=0&&(mfG(i)&4)&&!bridgeLocal(this.x,this.z)&&!this.dead){this.damage(200);}
    this.alt=0;return;}
  // in der Luft
  const power=piloted||this.autopilot?0.5+0.5*thr:0;const pin=(inp.hand?1:0)-(dive?1:0)-(brk>0&&!inp.hand?brk:0);
  const tRoll=-this.steer*0.75;this.roll+=(tRoll-this.roll)*Math.min(1,dt*2.4);
  this.pitch+=pin*0.75*dt;if(!pin)this.pitch+=(0.025-this.pitch)*Math.min(1,dt*0.7);
  if(v<24)this.pitch-=(24-v)*0.035*dt;this.pitch=clamp(this.pitch,-0.75,0.65);
  const k=T.acc/(T.max*T.max);v+=(power*T.acc-9.81*Math.sin(this.pitch)-k*v*v*(1+Math.abs(this.roll)*0.25))*dt;v=Math.max(v,6);
  const L=clamp((v-17)/15,0,1);const tv=v*Math.sin(this.pitch);this.vy+=(tv-this.vy)*Math.min(1,dt*3*L)-9.81*(1-L)*dt;
  this.yawRate=9.81*Math.tan(-this.roll)/Math.max(v,14)*1.35;this.h+=this.yawRate*dt;
  const vh=v*Math.cos(this.pitch);const fx=Math.sin(this.h),fz=Math.cos(this.h);this.vx=fx*vh;this.vz=fz*vh;
  const nx=this.x+this.vx*dt,nz=this.z+this.vz*dt,ny=Math.min(460,this.y+this.vy*dt);if(this.y>=460)this.vy=Math.min(this.vy,0);
  // Kartenrand: sanft zurücklenken
  if(nx<MINX+60||nx>MAXX-60||nz<MINZ+60||nz>MAXZ-60){const th=Math.atan2(MAP_CX-this.x,MAP_CZ-this.z);this.h+=angDiff(this.h,th)*Math.min(1,dt*1.5);if(piloted&&!this.edgeT){hint('Grenze des Luftraums – wir drehen um!',2.5);this.edgeT=4;}}
  if(this.edgeT)this.edgeT=Math.max(0,this.edgeT-dt);
  // Gebäude?
  const gh=gridH(nx,nz);const hitB=(gh>0&&gh!==255&&ny<gh-0.3)||(ELEV.size&&(()=>{const e=ELEV.get(idx(nx,nz));return e&&ny<e.t-0.3&&ny>e.b;})());
  if(hitB&&!this.dead){this.vx*=-0.1;this.vz*=-0.1;this.damage(250);onCrash(this,30);this.air=false;this.speed=0;this.y=Math.max(groundY(this.x,this.z),Math.min(this.y,gh));return;}
  this.x=Math.max(MINX+5,Math.min(MAXX-5,nx));this.z=Math.max(MINZ+5,Math.min(MAXZ-5,nz));this.y=ny;this.speed=v;
  const g2=groundY(this.x,this.z);this.alt=this.y-g2;
  if(this.y<=g2){const wat=(()=>{const i=idx(this.x,this.z);return i>=0&&(mfG(i)&4)&&!bridgeLocal(this.x,this.z);})();
    const hard=this.vy<-6.5||Math.abs(this.roll)>0.45||this.pitch<-0.28||wat;this.y=g2;this.air=false;this.vy=0;
    if(hard&&!this.dead){this.damage(wat?300:150+Math.abs(v)*2);onCrash(this,25);if(wat){this.speed=0;}if(piloted)hint(wat?'Notwasserung im Rhein!':'Bruchlandung!',2.5);}
    else{this.pitch=0.06;this.roll=0;if(piloted){hint(flugOnRunway(this.x,this.z,10)?'Saubere Landung! 🛬':'Außenlandung – aber heil!',2.5);chime([660,880]);}}}};
Car.prototype.planeSync=function(dt){if(!this.prop)planeProp(this);if(this.pitch===undefined){this.pitch=0;this.roll=0;}
  this.g.position.set(this.x,this.y,this.z);this.g.rotation.set(-this.pitch,this.h,this.roll);
  const run=this.ctrl==='player'||this.air;const rpm=run?(14+(this.inp.throttle||0)*30+Math.abs(this.speed)*0.4):0;this.propSpin=(this.propSpin||0)+rpm*dt;this.prop.rotation.z=this.propSpin;
  const fast=rpm>16;this.prop.userData.bl.visible=!fast;this.prop.userData.disc.material.opacity=fast?0.22:0;
  this.tailMat.emissiveIntensity=this.dead?0:(Math.floor(simTime*1.5)%2?3:0.4);
  if(this.dead&&Math.random()<dt*10)spawnPart(this.x,this.y+1.5,this.z,{color:0x222222,size:mr(1.5,3),vy:2,life:2,grow:2,alpha:0.6});};
// Steuerung/Anzeige im Flugzeug
function updateFlug(dt){if(!FLUG.built)return;const P=P1;
  if(FLUG.sock){const w=(WEATHER&&WEATHER.wind)||0.5;FLUG.sock.rotation.y=Math.sin(simTime*0.3)*0.4+0.8;FLUG.sock.rotation.x=0.9-Math.min(0.8,w*0.6)+Math.sin(simTime*3)*0.04;}
  if(FLUG.beacon)FLUG.beacon.visible=Math.floor(simTime*1.2)%2===0;
  if(!FLUG.hud){const d=document.createElement('div');d.id='flughud';d.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);padding:6px 14px;border-radius:10px;background:rgba(8,14,24,.62);color:#e8f2ff;font:600 15px "Barlow Condensed",sans-serif;letter-spacing:.04em;pointer-events:none;z-index:30;display:none;white-space:nowrap';document.body.appendChild(d);FLUG.hud=d;}
  const c=P&&P.car;if(c&&c.T.plane){FLUG.hud.style.display='block';const kmh=Math.round(Math.abs(c.speed)*3.6);const alt=Math.round(c.alt||0);const stall=c.air&&c.speed<24;
    FLUG.hud.innerHTML=`✈ ${kmh} km/h · Höhe ${alt} m${c.air?'':' · am Boden'}${stall?' · <span style="color:#ff6a5a">ÜBERZIEHWARNUNG</span>':''}`;
    if(!FLUG.hintShown){FLUG.hintShown=true;hint('<b>W</b> Gas · <b>S</b> Bremse · ab ~110 km/h <b>Leertaste</b> zum Abheben · In der Luft: <b>A/D</b> Kurven, <b>Leertaste</b> hoch, <b>Shift</b> runter · <b>F</b> Fallschirmsprung (Jetpack!)',9);}
    if(stall&&Math.floor(simTime*4)%2===0)chime([1400]);}
  else FLUG.hud.style.display='none';
  // Flugzeuge nachfüllen, wenn keins mehr am Platz steht
  FLUG.respawnT=(FLUG.respawnT||0)-dt;if(FLUG.respawnT<=0){FLUG.respawnT=20;const [px,pz]=ppos(P);if(Math.hypot(px-FLUG.C[0],pz-FLUG.C[1])>250){for(const c of FLUG.planes)if(c.dead&&!c.removed&&!isPlayerCar(c))c.remove();flugSpawnPlanes();}}}
