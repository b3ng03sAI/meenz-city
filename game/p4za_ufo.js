// ===================== UFO (taucht ab und zu am Himmel auf) =====================
const UFO={on:false,t:0,next:240+Math.random()*300,g:null,x:0,y:140,z:0,tx:0,tz:0,phase:'',victim:null,hits:0,forced:false,osc:null};
function ufoModel(){const g=new THREE.Group();const metal=new THREE.MeshStandardMaterial({color:0xb8c2cc,metalness:0.95,roughness:0.18});
  const disc=new THREE.Mesh(new THREE.SphereGeometry(7,32,12).scale(1,0.22,1),metal);g.add(disc);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(2.6,24,12,0,TAU,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0x7fe6c8,roughness:0.05,metalness:0.1,transmission:0.4,transparent:true,opacity:0.7,emissive:0x1b6650,emissiveIntensity:0.6}));dome.position.y=1.1;g.add(dome);
  const alien=new THREE.Group();const skin=stdMat({color:0x6fcf5a,roughness:0.6});const head=new THREE.Mesh(new THREE.SphereGeometry(0.55,14,10).scale(1,1.25,1),skin);head.position.y=1.9;alien.add(head);
  for(const s of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8).scale(1.3,0.8,0.6),new THREE.MeshBasicMaterial({color:0x050505}));e.position.set(s*0.22,2.0,0.44);alien.add(e);}g.add(alien);g.userData.alien=alien;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(6.3,0.35,8,40),new THREE.MeshBasicMaterial({color:0x60ffe0}));ring.rotation.x=Math.PI/2;ring.position.y=-0.6;g.add(ring);
  const lights=[];for(let i=0;i<12;i++){const a=i/12*TAU;const l=new THREE.Mesh(new THREE.SphereGeometry(0.32,8,6),new THREE.MeshBasicMaterial({color:0xffffff}));l.position.set(Math.cos(a)*6.9,-0.2,Math.sin(a)*6.9);g.add(l);lights.push(l);}g.userData.lights=lights;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(2.2,7,1,24,1,true).translate(0,-0.5,0),new THREE.MeshBasicMaterial({color:0x8affe6,transparent:true,opacity:0.22,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));beam.visible=false;g.add(beam);g.userData.beam=beam;
  const pl=new THREE.PointLight(0x80ffe0,0,90,1.5);pl.position.y=-3;g.add(pl);g.userData.pl=pl;g.visible=false;scene.add(g);return g;}
function ufoSound(on){const ctx=AUD.ctx;if(!ctx)return;if(on&&!UFO.osc){const o=ctx.createOscillator();o.type='sine';o.frequency.value=420;const lfo=ctx.createOscillator();lfo.frequency.value=5.5;const lg=ctx.createGain();lg.gain.value=60;lfo.connect(lg);lg.connect(o.frequency);
    const g=ctx.createGain();g.gain.value=0;o.connect(g);g.connect(AUD.master);o.start();lfo.start();UFO.osc={o,lfo,g};}
  if(!on&&UFO.osc){const s=UFO.osc;s.g.gain.setTargetAtTime(0,ctx.currentTime,0.3);setTimeout(()=>{try{s.o.stop();s.lfo.stop();}catch(e){}},1500);UFO.osc=null;}}
const UFO_LINES=['Ei guck emol, e UFO!','Die Marsmännsche wolle bestimmt Fleischworscht!','Schatz, hol die Kamera!','Isch hab nix getrunke, isch schwör!','Des sinn bestimmt die Wiesbadener!','Helau, ihr Außerirdische!','Die suche bestimmt en Parkplatz.'];
function ufoStart(forced=false){if(!UFO.g)UFO.g=ufoModel();const P=P1;if(!P.h)return;const [px,pz]=ppos(P);const a=Math.random()*TAU;UFO.x=px+Math.cos(a)*700;UFO.z=pz+Math.sin(a)*700;UFO.y=260;UFO.on=true;UFO.t=0;UFO.phase='anflug';UFO.forced=forced;UFO.hits=0;UFO.victim=null;
  UFO.tx=px+mr(-80,80);UFO.tz=pz+mr(-80,80);UFO.g.visible=true;ufoSound(true);if(!forced)hint('Was ist das für ein Licht am Himmel…? 🛸',4);}
function ufoEnd(){UFO.on=false;if(UFO.g){UFO.g.visible=false;UFO.g.userData.beam.visible=false;UFO.g.userData.pl.intensity=0;}ufoSound(false);if(UFO.victim){scene.remove(UFO.victim.g);}UFO.victim=null;UFO.next=300+Math.random()*420;}
function ufoHit(P){UFO.hits++;for(let i=0;i<20;i++)spawnPart(UFO.x+mr(-4,4),UFO.y,UFO.z+mr(-4,4),{color:0x80ffe0,size:mr(1,2),vy:mr(-2,2),vx:mr(-4,4),vz:mr(-4,4),life:0.8,grow:1,add:true});
  if(UFO.hits>=2&&UFO.phase!=='flucht'){UFO.phase='flucht';UFO.t=0;G.money+=5000;showBig('UFO VERTRIEBEN','win',3.5,'+ €5000 · Die kommen so schnell net widder!');const [x,z]=[UFO.x,UFO.z];const [fx,fz]=freeSpot(x,z,0.5);addPickup('money',fx,fz,{amount:2500,temp:true});}
  else if(P)hint('Treffer! Das UFO wackelt…',2,P);}
function updateUfo(dt){if(mode!=='play')return;if(!UFO.on){if(INDOOR)return;UFO.next-=dt;if(UFO.next<=0)ufoStart();return;}
  const g=UFO.g;UFO.t+=dt;const [px,pz]=ppos(P1);const L=g.userData.lights;L.forEach((l,i)=>l.material.color.setHSL(((simTime*0.6+i/12)%1),1,0.6));g.rotation.y+=dt*1.6;g.userData.pl.intensity=nightF>0.3?3:1.2;
  if(UFO.osc){const d=Math.hypot(UFO.x-px,UFO.z-pz);UFO.osc.g.gain.value=0.05*Math.max(0,1-d/600);}
  const beam=g.userData.beam;
  if(UFO.phase==='anflug'){const dx=UFO.tx-UFO.x,dz=UFO.tz-UFO.z;const d=Math.hypot(dx,dz);UFO.x+=dx/d*Math.min(d,60*dt);UFO.z+=dz/d*Math.min(d,60*dt);UFO.y+=(70-UFO.y)*dt*0.4;if(d<5){UFO.phase='schweben';UFO.t=0;
      for(const h of HUMANS){if(h.kind==='ped'&&h.alive&&!h.inCar&&Math.hypot(h.x-px,h.z-pz)<60&&Math.random()<0.4){say(h,mpick(UFO_LINES),3.5);pedFlee(h,UFO.x,UFO.z,12);}}}}
  else if(UFO.phase==='schweben'){UFO.x+=Math.sin(UFO.t*0.7)*dt*8;UFO.z+=Math.cos(UFO.t*0.5)*dt*8;UFO.y=70+Math.sin(UFO.t*1.3)*3;
    if(UFO.t>6&&!UFO.victim&&!UFO.mission){// Opfer suchen: geparktes Auto oder Passant
      let best=null,bd=60;for(const c of CARS){if(c.ai.mode!=='parked'||c.mission||c.persist||isPlayerCar(c))continue;const d=Math.hypot(c.x-UFO.x,c.z-UFO.z);if(d<bd){bd=d;best=c;}}
      if(!best)for(const h of HUMANS){if(h.kind!=='ped'||!h.alive||h.inCar||h.mission||h.state==='markt')continue;const d=Math.hypot(h.x-UFO.x,h.z-UFO.z);if(d<bd){bd=d;best=h;}}
      if(best){const isCar=!!best.T;const vg=best.g;const vy=best.y||groundY(best.x,best.z);best.remove();scene.add(vg);vg.visible=true;UFO.victim={g:vg,x:best.x,z:best.z,y:vy,car:isCar};UFO.phase='beam';UFO.t=0;}else if(UFO.t>20){UFO.phase='flucht';UFO.t=0;}}}
  else if(UFO.phase==='beam'){const v=UFO.victim;UFO.x+=(v.x-UFO.x)*dt*1.5;UFO.z+=(v.z-UFO.z)*dt*1.5;const gy=groundY(v.x,v.z);
    if(UFO.t>1.5){v.y=Math.min(UFO.y-2,v.y+dt*(3+UFO.t*1.5));v.g.position.set(v.x,v.y,v.z);v.g.rotation.y+=dt*2.5;v.g.rotation.z=Math.sin(UFO.t*2)*0.3;}
    beam.visible=true;beam.scale.set(1,Math.max(1,UFO.y-gy),1);beam.material.opacity=0.18+Math.sin(simTime*12)*0.05;
    if(v.y>=UFO.y-2.5){scene.remove(v.g);UFO.victim=null;beam.visible=false;UFO.phase='flucht';UFO.t=0;if(Math.hypot(UFO.x-px,UFO.z-pz)<220)hint(v.car?'Das UFO hat ein <b>Auto</b> geklaut! Und du dachtest, du bist hier der Autodieb…':'Das UFO hat einen <b>Passanten</b> mitgenommen. Grüße an Alpha Centauri!',4);}}
  else if(UFO.phase==='flucht'){beam.visible=false;UFO.y+=dt*(30+UFO.t*40);UFO.x+=dt*UFO.t*30;if(UFO.t>6)ufoEnd();}
  g.position.set(UFO.x,UFO.y,UFO.z);g.userData.alien.rotation.y=-g.rotation.y+Math.atan2(px-UFO.x,pz-UFO.z);}
// Treffer mit normalen Schusswaffen (Strahl gegen UFO-Kugel prüfen)
const _pfUfo=playerFire;playerFire=function(P,I){const before=(P.mag&&P.mag[P.weapon])||0;_pfUfo(P,I);const W=WEAPONS[P.weapon];
  if(UFO.on&&!W.melee&&!W.thrown&&!W.rocket&&!W.flame&&((P.mag[P.weapon]||0)<before)){P.camera.getWorldPosition(_o);P.camera.getWorldDirection(_dd);if(raySphere(_o,_dd,[UFO.x,UFO.y,UFO.z],7)<600){UFO.shotDmg=(UFO.shotDmg||0)+W.dmg;if(UFO.shotDmg>600){UFO.shotDmg=0;ufoHit(P);}}}};
