// ===================== BEGEHBARE ORTE: DOM, CHRISTUSKIRCHE, MALAKOFF-PASSAGE (+ Rahmen für Hbf) =====================
const VEN_X0=ROOM_X0+1100,VEN_Z=ROOM_Z-420;
const VENUES=[];const VMATS={};
function vm(key){if(VMATS[key])return VMATS[key];const D={stone:{r:0.85},sand:{r:0.8},wood:{r:0.65},dark:{r:0.9},gold:{r:0.28,m:0.85},metal:{r:0.35,m:0.75},floor:{r:0.55},cloth:{r:0.95},glass:{r:0.08,m:0.1}}[key]||{r:0.8};
  return VMATS[key]=key==='glow'?new THREE.MeshBasicMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:D.r,metalness:D.m||0});}
const C3=h=>new THREE.Color(h);
function rayDoor(fx,fz,tx,tz,step=0.5){const L=Math.hypot(tx-fx,tz-fz);let px=fx,pz=fz;for(let t=0;t<=L;t+=step){const x=fx+(tx-fx)*t/L,z=fz+(tz-fz)*t/L;const i=idx(x,z);if(i>=0&&hgG(i)>0&&hgG(i)<255)return [px,pz,Math.atan2(fx-tx,fz-tz)];px=x;pz=z;}return [fx,fz,Math.atan2(fx-tx,fz-tz)];}
function makeVenueRoom(def,i){const {W,D,H}=def;const ox=VEN_X0+i*240,oy=ROOM_Y,oz=VEN_Z;const grp=new THREE.Group();grp.position.set(ox,oy,oz);grp.visible=false;scene.add(grp);
  const boxes=[];const gbs={};const G=k=>gbs[k]||(gbs[k]=new GB());
  const B={box:(k,x,y,z,w,h,d,col,rot=0)=>G(k).box(x,y,z,w,h,d,rot,typeof col==='number'?C3(col):col,2,true),solid:(x,z,w,d)=>boxes.push([x-w/2,z-d/2,x+w/2,z+d/2]),
    sbox:(k,x,y,z,w,h,d,col,rot=0)=>{G(k).box(x,y,z,w,h,d,rot,typeof col==='number'?C3(col):col,2,true);boxes.push([x-w/2,z-d/2,x+w/2,z+d/2]);},
    mesh:(m)=>{grp.add(m);return m;},
    plane:(tex,x,y,z,w,h,ry=0,basic=true)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),basic?new THREE.MeshBasicMaterial({map:tex,transparent:true}):new THREE.MeshStandardMaterial({map:tex,roughness:0.7}));m.position.set(x,y,z);m.rotation.y=ry;grp.add(m);return m;}};
  const r={venue:def,name:def.name,W,D,H,ox,oy,oz,grp,boxes,lightPts:def.lights||[],keeper:{g:{visible:false},alive:false,x:-1e9,z:-1e9,state:'none'},people:[],
    shop:{name:def.name,x:def.door[0],z:def.door[1],doorX:def.door[0],doorZ:def.door[1],nx:Math.sin(def.door[2]),nz:Math.cos(def.door[2]),face:def.door[2],cat:-1},
    hemiI:def.hemiI??0.45,exp:def.exp??0.95,lampI:def.lampI??30,lampD:def.lampD??26,
    blocked(x,z){const lx=x-ox,lz=z-oz;if(lx<-W/2+0.3||lx>W/2-0.3||lz<-D/2+0.3||lz>D/2-0.3)return true;for(const b of boxes)if(lx>b[0]&&lx<b[2]&&lz>b[1]&&lz<b[3])return true;return false;}};
  // Boden, Wände, Decke
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,D).rotateX(-Math.PI/2),def.floorMat||stdMat({color:0x999088,roughness:0.6}));fl.receiveShadow=true;if(def.floorMat&&def.floorMat.map)scale_uv(fl.geometry,W/4,D/4);grp.add(fl);
  const wc=C3(def.wall||0xd8cfc0);for(const [x,z,w,d] of [[0,-D/2,W,0.4],[0,D/2,W,0.4],[-W/2,0,0.4,D],[W/2,0,0.4,D]])G('stone').box(x,0,z,w,H,d,0,wc,3,false);
  if(!def.noCeil)G('stone').box(0,H,0,W,0.3,D,0,C3(def.ceil||0xe8e0d0),3,true);
  def.build(r,B);
  for(const k in gbs){if(gbs[k].empty)continue;const m=new THREE.Mesh(gbs[k].geo(),vm(k));m.castShadow=k!=='glow';m.receiveShadow=true;grp.add(m);}
  return r;}
let VEN_PLACED=false;
function venueNear(x,z,rad=2.2){if(!VEN_PLACED){VEN_PLACED=true;placeVenueDoors();}for(const v of VENUES){if(!v.door)continue;if(Math.hypot(v.door[0]-x,v.door[1]-z)<rad)return v;}return null;}
function venueRoom(v){if(!v.room)v.room=makeVenueRoom(v,VENUES.indexOf(v));return v.room;}
function enterVenue(P,v,spawn){if(G.split){hint('Im Split-Screen sind Innenräume geschlossen.',2,P);return;}if(P.car)return;const r=venueRoom(v);r.grp.visible=true;const h=P.h;h.room=r;INDOOR=r;
  const sp=spawn||v.spawn;h.x=r.ox+sp[0];h.z=r.oz+sp[1];h.y=r.oy;h.facing=sp[2];P.vy=0;P.cam.yaw=sp[2];P.cam.pitch=0.25;P.cam.init=false;r.insideT=0;
  for(const o of r.people)if(!o.removed)o.remove();r.people=[];if(v.npcs)v.npcs(r);showBig(v.name.toUpperCase(),'mission',2.2,v.sub||'');chime([523,659]);if(v.onEnter)v.onEnter(r,P);}
function exitVenue(P,to){const h=P.h;const r=h.room;if(!r||!r.venue)return;const v=r.venue;h.room=null;r.grp.visible=false;INDOOR=null;for(const o of r.people)if(!o.removed)o.remove();r.people=[];venueMusic(null);
  const d=to||v.door;const fx=Math.sin(d[2]),fz=Math.cos(d[2]);h.x=d[0]+(to?0:fx*1.2);h.z=d[1]+(to?0:fz*1.2);h.y=groundY(h.x,h.z,(to&&to[3])||undefined);if(to&&to[3])h.y=to[3];h.facing=d[2];P.cam.yaw=d[2];P.cam.init=false;P.vy=0;lampAssignT=0;envDirty=true;if(v.onExit)v.onExit(r,P);}
function vPerson(r,lx,lz,face,o={}){const h=new Human('ped');h.x=r.ox+lx;h.z=r.oz+lz;h.y=r.oy;h.facing=face;h.state='venue';h.room=r;h.walkSpeed=o.speed||mr(0.9,1.3);h.vrole=o.role||'walk';h.vwp=null;h.vT=mr(2,8);h.vlines=o.lines||null;
  if(o.pose==='sit'){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;}if(o.pose==='pray'){h.hips.position.y=0.5;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;h.armL.rotation.x=-1.2;h.armR.rotation.x=-1.2;h.armL.rotation.z=-0.45;h.armR.rotation.z=0.45;h.setExpr('sad');}
  if(o.suitcase){const s=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.6,0.22),cmat(mpick([0x1d3557,0x8d0801,0x222222,0x6a994e]),0.5));s.position.set(0.12,-0.95,0.15);h.armR.add(s);}
  h.vpose=o.pose;h.sync();r.people.push(h);return h;}
function updateVenuePeople(r,dt,P){const v=r.venue;const ph=P.h;
  for(const h of r.people){if(h.removed||!h.alive){continue;}if(h.state==='talk')continue;if(h.state!=='venue'){if(h.state==='walk'||h.state==='flee'){h.state='venue';h.vrole='walk';}else continue;}
    if(h.vpose){if(h.fx&&h.face.visible)h.updateFace();h.y=r.oy;h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}
    else if(h.vrole==='walk'||h.vrole==='rush'){if(!h.vwp||Math.hypot(h.vwp[0]-h.x,h.vwp[1]-h.z)<0.8||h.vT<=0){const w=v.wp?mpick(v.wp):[mr(-r.W/2+2,r.W/2-2),mr(-r.D/2+2,r.D/2-2)];h.vwp=[r.ox+w[0],r.oz+w[1]];h.vT=mr(8,20);}
      h.vT-=dt;const dx=h.vwp[0]-h.x,dz=h.vwp[1]-h.z;const sp=h.vrole==='rush'?3.6:h.walkSpeed;const mv=moveHuman(h,dx,dz,sp,dt);if(mv<0.05)h.vT-=dt*3;faceTo(h,dx,dz,dt,6);h.animate(dt,sp);h.y=r.oy;h.sync();}
    else{h.animate(dt,0);if(h.vrole==='stand'&&ph)faceTo(h,ph.x-h.x,ph.z-h.z,dt,1.5);h.y=r.oy;h.sync();}
    if(h.vlines){h.vlT=(h.vlT??mr(3,12))-dt;if(h.vlT<=0){h.vlT=mr(9,20);if(Math.hypot(ph.x-h.x,ph.z-h.z)<16&&!h.bubble)say(h,mpick(h.vlines),3.4,h.vrole==='rush'?'loud':'quiet');}}}}
function updateVenue(P,r,dt){const v=r.venue;r.insideT+=dt;const h=P.h;const lx=h.x-r.ox,lz=h.z-r.oz;
  // Ausgänge
  for(const e of v.exits||[]){if(Math.abs(lx-e.x)<e.w&&Math.abs(lz-e.z)<e.d&&r.insideT>1.0){const mv=Math.hypot(h.vx||0,h.vz||0)>0.2;if(!mv)continue;if(e.to==='door'){exitVenue(P);return;}if(typeof e.to==='function'){e.to(P,r);return;}}}
  if(h.y>r.oy+r.H-2.2){h.y=r.oy+r.H-2.2;if(P.vy>0)P.vy=0;}
  updateVenuePeople(r,dt,P);if(r.mshops){r.shopHintT=(r.shopHintT||0)-dt;const s=r.mshops.find(s=>Math.hypot(s.doorX-h.x,s.doorZ-h.z)<1.9);if(s&&r.shopHintT<=0){r.shopHintT=0.8;hint(`<b>F</b>: <b>${s.name}</b> betreten`,1,P);}r.nearShop=s||null;}if(v.update)v.update(r,dt,P);
  // Hinweise
  r.hintT=(r.hintT||0)-dt;if(r.hintT<=0&&v.hints){r.hintT=0.7;for(const k of v.hints){if(Math.hypot(lx-k.x,lz-k.z)<k.r){hint(k.t,0.9,P);break;}}}}
// ---------- Kirchenorgel / Musik ----------
const VMUS={node:null,timer:null,kind:null};
function venueMusic(kind){const ctx=AUD.ctx;if(VMUS.kind===kind)return;VMUS.kind=kind;if(VMUS.timer){clearInterval(VMUS.timer);VMUS.timer=null;}if(VMUS.node){const g=VMUS.node;g.gain.setTargetAtTime(0,ctx.currentTime,0.8);setTimeout(()=>g.disconnect(),3000);VMUS.node=null;}
  if(!kind||!ctx)return;const g=VMUS.node=ctx.createGain();g.gain.value=0;g.gain.setTargetAtTime(kind==='mall'?0.05:0.07,ctx.currentTime,1.5);
  const dl=ctx.createDelay(1.5);dl.delayTime.value=kind==='mall'?0.25:0.55;const fb=ctx.createGain();fb.gain.value=kind==='mall'?0.25:0.55;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=kind==='mall'?2400:1800;
  g.connect(lp);lp.connect(AUD.master);lp.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(AUD.master);
  const prog=kind==='dom'?[[50,57,62,65],[46,53,58,62],[53,57,60,65],[48,55,60,64],[50,57,62,65],[45,52,57,61]]:kind==='christus'?[[48,55,60,64],[53,57,60,65],[55,59,62,67],[48,55,60,64],[57,60,64,69],[55,59,62,67]]:[[60,64,67,71],[57,60,64,67],[62,65,69,72],[55,59,62,67]];
  let step=0;const dur=kind==='mall'?2.2:4.2;const mt=n=>440*Math.pow(2,(n-69)/12);
  const play=()=>{if(!VMUS.node||VMUS.node!==g)return;const t=ctx.currentTime+0.05;const ch=prog[step%prog.length];step++;
    for(const n of ch){for(const [mul,type,vol] of kind==='mall'?[[1,'triangle',0.5],[2,'sine',0.15]]:[[1,'square',0.12],[0.5,'sine',0.5],[2,'sine',0.18],[1,'sine',0.35]]){const o=ctx.createOscillator();o.type=type;o.frequency.value=mt(n)*mul;const e=ctx.createGain();e.gain.setValueAtTime(0.0001,t);
      if(kind==='mall'){e.gain.exponentialRampToValueAtTime(vol*0.25,t+0.02);e.gain.exponentialRampToValueAtTime(0.0001,t+dur*0.9);}else{e.gain.linearRampToValueAtTime(vol*0.18,t+0.6);e.gain.setValueAtTime(vol*0.18,t+dur-0.3);e.gain.linearRampToValueAtTime(0.0001,t+dur+0.4);}
      o.connect(e);e.connect(g);o.start(t);o.stop(t+dur+0.5);}}
    if(kind==='mall'){const mel=[72,74,76,79,76,74,72,71];for(let k=0;k<4;k++){const o=ctx.createOscillator();o.type='sine';o.frequency.value=mt(mpick(mel));const e=ctx.createGain();const tt=t+k*dur/4;e.gain.setValueAtTime(0.0001,tt);e.gain.exponentialRampToValueAtTime(0.06,tt+0.01);e.gain.exponentialRampToValueAtTime(0.0001,tt+0.5);o.connect(e);e.connect(g);o.start(tt);o.stop(tt+0.6);}}};
  play();VMUS.timer=setInterval(play,dur*1000);}
// ---------- Texturen ----------
function glassTex(seed,pal){return canvasTex(128,256,g=>{const R=mulberry32(seed);g.fillStyle='#1a1410';g.fillRect(0,0,128,256);for(let y=0;y<256;y+=16)for(let x=0;x<128;x+=16){g.fillStyle=pal[Math.floor(R()*pal.length)];g.fillRect(x+1,y+1,14,14);}
  g.strokeStyle='#111';g.lineWidth=3;g.beginPath();g.arc(64,64,40,0,6.28);g.stroke();g.fillStyle='rgba(255,230,150,0.55)';g.beginPath();g.arc(64,64,22,0,6.28);g.fill();g.fillStyle='#1a1410';g.fillRect(0,0,128,4);g.beginPath();g.moveTo(0,0);g.lineTo(0,40);g.quadraticCurveTo(0,0,64,0);g.fill();g.beginPath();g.moveTo(128,0);g.lineTo(128,40);g.quadraticCurveTo(128,0,64,0);g.fill();},false);}
const stoneTileTex=canvasTex(512,512,g=>{g.fillStyle='#8a7f74';g.fillRect(0,0,512,512);const R=mulberry32(11);for(let y=0;y<512;y+=64)for(let x=0;x<512;x+=64){const v=R()*24-12;g.fillStyle=(x/64+y/64)%2?`rgb(${150+v},${132+v},${120+v})`:`rgb(${118+v},${96+v},${88+v})`;g.fillRect(x+1,y+1,62,62);}noiseFill(g,512,512,0.05,6000);});
const marbleTex=canvasTex(512,512,g=>{g.fillStyle='#e9e4da';g.fillRect(0,0,512,512);const R=mulberry32(21);for(let y=0;y<512;y+=128)for(let x=0;x<512;x+=128){g.fillStyle=(x/128+y/128)%2?'#ddd5c8':'#efe9df';g.fillRect(x,y,128,128);}g.strokeStyle='rgba(120,110,100,0.25)';for(let i=0;i<40;i++){g.beginPath();g.moveTo(R()*512,R()*512);g.bezierCurveTo(R()*512,R()*512,R()*512,R()*512,R()*512,R()*512);g.stroke();}});
const mallTex=canvasTex(256,256,g=>{g.fillStyle='#d8d4cc';g.fillRect(0,0,256,256);g.fillStyle='#c4beb2';for(let i=0;i<=256;i+=128){g.fillRect(i-1,0,2,256);g.fillRect(0,i-1,256,2);}noiseFill(g,256,256,0.03,2000);});
// Kirchenbänke
function pews(B,x0,x1,z0,z1,step,face=0){for(let z=z0;z<=z1;z+=step){B.sbox('wood',(x0+x1)/2,0,z,Math.abs(x1-x0),0.45,0.45,0x5a3a22);B.box('wood',(x0+x1)/2,0.45,z+0.25*(face?-1:1),Math.abs(x1-x0),0.5,0.08,0x5a3a22);}}
// ===================== HOHER DOM ST. MARTIN =====================
VENUES.push({id:'dom',name:'Hoher Dom St. Martin',sub:'Romanische Kathedrale · seit 975',W:30,D:84,H:24,wall:0xa65a4a,ceil:0xd9c7b0,hemiI:0.5,exp:1.0,lampI:45,lampD:34,
  lights:[[0,10,-30],[0,10,-10],[0,10,10],[0,10,30],[-10,6,0],[10,6,0],[0,8,-38],[0,8,38]],
  wp:[[0,-30],[0,-10],[0,10],[0,25],[-11,-25],[-11,0],[-11,25],[11,-25],[11,0],[11,25],[0,-36],[0,36]],
  spawn:[13,8,-Math.PI/2],exits:[{x:14.4,z:8,w:0.8,d:1.6,to:'door'}],
  hints:[{x:0,z:-37,r:4,t:'Der Ostchor mit dem Hochaltar.'},{x:0,z:38,r:4,t:'Westchor mit der großen Orgel.'},{x:-13,z:-10,r:3,t:'Grabdenkmäler der Mainzer Erzbischöfe.'}],
  build(r,B){r.grp.children[0].material=stdMat({map:stoneTileTex,roughness:0.6});const W=30,D=84,H=24;
    // Pfeiler & Arkaden
    for(let z=-31;z<=31;z+=7){for(const s of [-1,1]){B.sbox('sand',s*7.2,0,z,1.8,11,1.8,0xb06a56);B.box('sand',s*7.2,11,z,2.2,0.6,2.2,0xc98a74);B.box('sand',s*7.2,11.6,z+3.5,1.2,1.2,5.2,0xa65a4a);}}
    for(const s of [-1,1]){B.box('sand',s*7.2,12.8,0,1.2,H-12.8,66,0xb87b66);for(let z=-28;z<=28;z+=7)B.box('glow',s*(7.2-0.62*s),15.5,z,0.05,3.6,1.6,0xffe7b0);}
    // Seitenschiff-Decken
    for(const s of [-1,1])B.box('stone',s*11.2,12,0,7.6,0.3,70,0xd9c7b0);
    for(let z=-31;z<=31;z+=7)B.box('sand',0,H-1.2,z,14,0.6,0.7,0xc98a74);
    // Kirchenbänke im Mittelschiff
    pews(B,-6,-1.2,-24,22,1.3);pews(B,1.2,6,-24,22,1.3);
    // Ostchor erhöht + Altar
    B.box('sand',0,0,-37.5,14,0.3,8,0xb06a56);B.sbox('stone',0,0.3,-37,3.2,1.1,1.4,0xe8e0d0);B.box('gold',0,1.4,-37,3.3,0.06,1.5,0xd4af37);
    for(const s of [-1,1]){B.box('gold',s*1.2,1.46,-37,0.06,0.5,0.06,0xd4af37);B.box('glow',s*1.2,1.98,-37,0.05,0.09,0.05,0xffd27a);}
    B.box('gold',0,5,-41.4,0.25,5,0.15,0xd4af37);B.box('gold',0,8.4,-41.4,2.6,0.25,0.15,0xd4af37);// Kreuz
    for(let k=-2;k<=2;k++)B.box('glow',k*2.6,5,-41.75,1.5,6,0.05,0xffd9a0);
    // Westchor: Orgel
    for(let k=0;k<24;k++){const x=-6+k*0.52,hh=3+Math.abs(Math.sin(k*0.55))*5;B.box('metal',x,6,40.9,0.34,hh,0.34,0xc9ccd2);}B.box('wood',0,4,41.2,13,2.2,1,0x4a2f1a);B.box('gold',0,6,41.6,13,0.2,0.4,0xd4af37);
    // Grabdenkmäler an den Seitenwänden
    for(let z=-26;z<=26;z+=13)for(const s of [-1,1]){B.sbox('stone',s*14.3,0,z,0.9,3.2,2.4,0xcfc4b4);B.box('sand',s*14.3,3.2,z,1.0,1.4,2.6,0xb87b66);B.box('dark',s*13.9,1.2,z,0.05,1.6,1.2,0x6e5e50);}
    // bunte Fenster in den Seitenwänden
    const tex=glassTex(7,['#7a1020','#1d3a8a','#c9a227','#2f6b3a','#5a1a6b','#b5651d']);for(let z=-28;z<=28;z+=9.3)for(const s of [-1,1])B.plane(tex,s*14.75,7,z,2,4.4,s>0?-Math.PI/2:Math.PI/2);
    // Kerzenständer
    for(const z of [-20,20]){B.sbox('metal',-12,0,z,1.2,0.9,0.6,0x333333);for(let k=0;k<8;k++)B.box('glow',-12.5+k*0.14,0.9,z,0.04,0.12,0.04,0xfff0b0);}
    // Kanzel
    B.sbox('wood',-6.2,0,-16,1.6,2.6,1.6,0x6b4426);B.box('gold',-6.2,2.6,-16,1.8,0.12,1.8,0xd4af37);
    // Eingangs-Tür (Marktportal) an der Nordwand
    B.box('wood',14.6,0,8,0.3,4.2,2.6,0x3a2512);B.box('glow',14.4,4.3,8,0.05,0.6,2.6,0xfff4d8);},
  npcs(r){vPerson(r,0,-36,0,{role:'stand',lines:['Willkommen im Hohen Dom zu Mainz.','Bitte keine Jetpacks im Gotteshaus.','Der Dom ist über tausend Jahre alt. Älter als dein Auto.','Psst. Hier wird geflüstert. Auch von dir.']});
    for(let k=0;k<4;k++)vPerson(r,mpick([-4,-2.5,2.5,4]),-20+k*9,Math.PI,{pose:'pray'});
    const T=['Wow. Romanisch.','Wo is des Klo?','Schatz, mach ein Foto von mir vor dem Pfeiler!','Die Fenster sind schön. Die Bänke unbequem.','Wie viele Stufen hat der Turm?','Ich hab mich verlaufen. Im Dom.'];
    for(let k=0;k<6;k++)vPerson(r,mr(-10,10),mr(-30,30),mr(0,6),{lines:T});
    vPerson(r,12,4,-Math.PI/2,{role:'stand',lines:['Bitte nicht rennen!','Fotografieren ohne Blitz, bitte.','Bitte die Mütze abnehmen.','Ich seh alles. Ich bin de Domschweizer.']});},
  onEnter(){venueMusic('dom');},
  update(r,dt,P){const h=P.h;if(P.jet&&P.jet.on&&!(r.jetWarn>0)){r.jetWarn=6;const g=r.people.find(o=>o.vrole==='stand'&&o.alive);if(g)say(g,'NICHT IM DOM!!',2.5,'loud');}if(r.jetWarn>0)r.jetWarn-=dt;
    if(P.inp&&P.inp.sprint&&Math.hypot(h.vx||0,h.vz||0)>4&&!(r.runWarn>0)){r.runWarn=8;const g=r.people[r.people.length-1];if(g&&g.alive)say(g,'Bitte nicht rennen!',2.2,'loud');}if(r.runWarn>0)r.runWarn-=dt;}});
// ===================== CHRISTUSKIRCHE =====================
VENUES.push({id:'christus',name:'Christuskirche',sub:'Evangelische Hauptkirche · Kaiserstraße',W:42,D:42,H:30,wall:0xe6dcc6,ceil:0xf0e8d6,noCeil:true,hemiI:0.6,exp:1.0,lampI:40,lampD:34,
  lights:[[0,18,0],[0,8,-14],[0,8,14],[-14,8,0],[14,8,0],[0,5,0]],
  wp:[[0,0],[0,-12],[0,12],[-12,0],[12,0],[-6,-6],[6,6],[6,-6],[-6,6]],
  spawn:[0,18.5,Math.PI],exits:[{x:0,z:20.4,w:1.6,d:0.8,to:'door'}],
  hints:[{x:0,z:-16,r:4,t:'Der Altarraum unter dem goldenen Mosaik.'},{x:0,z:0,r:3,t:'Schau nach oben: die große Kuppel.'}],
  build(r,B){r.grp.children[0].material=stdMat({map:marbleTex,roughness:0.35});const W=42,D=42;
    // Kreuzform: Ecken ausfüllen
    for(const sx of [-1,1])for(const sz of [-1,1])B.sbox('stone',sx*15.5,0,sz*15.5,11,20,11,0xe6dcc6);
    // Decke der Arme + Tonnengewölbe-Andeutung
    for(const [x,z,w,d] of [[0,-15.5,20,11],[0,15.5,20,11],[-15.5,0,11,20],[15.5,0,11,20]])B.box('stone',x,20,z,w,0.4,d,0xf0e8d6);
    // Vierungspfeiler
    for(const sx of [-1,1])for(const sz of [-1,1]){B.sbox('stone',sx*9.6,0,sz*9.6,1.8,20,1.8,0xd8ccb0);B.box('gold',sx*9.6,19.4,sz*9.6,2,0.4,2,0xd4af37);}
    // Kuppel (von innen)
    const dome=new THREE.Mesh(new THREE.SphereGeometry(10.5,32,16,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xf3ead8,roughness:0.6,side:THREE.BackSide}));dome.position.set(0,20,0);dome.scale.y=0.9;r.grp.add(dome);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(10.4,0.25,8,48),new THREE.MeshStandardMaterial({color:0xd4af37,roughness:0.3,metalness:0.8}));ring.rotation.x=Math.PI/2;ring.position.y=20.2;r.grp.add(ring);
    for(let k=0;k<16;k++){const a=k/16*Math.PI*2;B.box('glow',Math.cos(a)*10.1,21.2,Math.sin(a)*10.1,0.6,1.8,0.6,0xfff1c9);}
    B.box('glow',0,29.2,0,2.2,0.1,2.2,0xfff8e0);// Laterne
    // Altar & Apsis-Mosaik
    B.box('stone',0,0,-17.5,14,0.35,6,0xd8ccb0);B.sbox('stone',0,0.35,-17.5,3.6,1.1,1.4,0xf4efe6);B.box('gold',0,1.45,-17.5,3.7,0.06,1.5,0xd4af37);
    const mos=canvasTex(512,256,g=>{const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#c9a227');gr.addColorStop(1,'#8a6a12');g.fillStyle=gr;g.fillRect(0,0,512,256);for(let i=0;i<2500;i++){g.fillStyle=`rgba(255,${200+Math.random()*55},${80+Math.random()*80},${Math.random()*0.35})`;g.fillRect(Math.random()*512,Math.random()*256,4,4);}g.fillStyle='#f5ecd2';g.beginPath();g.arc(256,110,42,0,6.28);g.fill();g.fillStyle='#7a1a1a';g.fillRect(236,150,40,80);g.strokeStyle='#5a3e0a';g.lineWidth=6;g.beginPath();g.arc(256,110,58,0,6.28);g.stroke();},false);
    B.plane(mos,0,9,-20.7,12,8,0);
    // Orgel gegenüber
    for(let k=0;k<20;k++){const x=-5+k*0.52,hh=3+Math.abs(Math.cos(k*0.6))*4.5;B.box('metal',x,5.5,20.3,0.34,hh,0.34,0xd2d4da);}B.box('wood',0,3.6,20.5,11,2,0.8,0x6b4426);B.box('gold',0,5.5,20.8,11,0.2,0.4,0xd4af37);
    // Bänke in drei Armen Richtung Altar
    pews(B,-8,-1.2,-8,8,1.35);pews(B,1.2,8,-8,8,1.35);
    for(const s of [-1,1])for(let x=11;x<=19;x+=1.4)B.sbox('wood',s*x,0,0,0.45,0.45,8,0x5a3a22);
    // Kronleuchter
    for(const [x,z] of [[0,-15],[0,15],[-15,0],[15,0]]){const g=new THREE.Mesh(new THREE.TorusGeometry(1.4,0.06,6,24),new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.8,roughness:0.3}));g.rotation.x=Math.PI/2;g.position.set(x,12,z);r.grp.add(g);for(let k=0;k<10;k++){const a=k/10*6.28;B.box('glow',x+Math.cos(a)*1.4,12.05,z+Math.sin(a)*1.4,0.08,0.18,0.08,0xfff1c9);}B.box('metal',x,12,z,0.03,8,0.03,0x555555);}
    // Fenster
    const tex=glassTex(13,['#e8d9a0','#c9a227','#9bb7d4','#e6e1d3','#a33b3b']);for(const [x,z,ry] of [[-20.75,-4,Math.PI/2],[-20.75,4,Math.PI/2],[20.75,-4,-Math.PI/2],[20.75,4,-Math.PI/2]])B.plane(tex,x,9,z,2.4,6,ry);
    B.box('wood',0,0,20.7,2.6,4.4,0.3,0x3a2512);},
  npcs(r){vPerson(r,0,-16.5,0,{role:'stand',lines:['Herzlich willkommen in der Christuskirche.','Heute Abend ist Orgelkonzert. Bach. Lange.','Die Kuppel ist 80 Meter hoch. Fast.']});
    for(let k=0;k<4;k++)vPerson(r,mpick([-5,-3,3,5]),-6+k*3.5,Math.PI,{pose:'pray'});
    const T=['Diese Kuppel! Wie in Rom!','Is des hier die Kirche aus’m Fernsehen?','Ich hab hier geheiratet. Der Rest is Geschichte.','Hallo? … Hallo? … Echo!'];for(let k=0;k<5;k++)vPerson(r,mr(-8,8),mr(-8,8),mr(0,6),{lines:T});},
  onEnter(){venueMusic('christus');}});
// ===================== MALAKOFF-PASSAGE =====================
const MALA_SHOPS=[['REWE',1,'Supermarkt'],['dm',5,'Drogerie'],['Malakoff Apotheke',9,'Apotheke'],['Bäckerei Dietz',0,'Bäckerei'],['Sofra II',10,'Restaurant'],['Café am Rhein',3,'Café'],['Friseur Schnittstelle',6,'Friseur'],['Kiosk am Malakoff',2,'Kiosk']];
VENUES.push({id:'malakoff',name:'Malakoff-Passage',sub:'Einkaufspassage am Rhein',W:16,D:64,H:9,wall:0xe0ddd6,ceil:0xf2f2f2,hemiI:0.75,exp:1.0,lampI:28,lampD:26,
  lights:[[0,7,-24],[0,7,-8],[0,7,8],[0,7,24]],wp:[[0,-28],[0,-14],[0,0],[0,14],[0,28],[-3,-20],[3,20],[-3,6],[3,-6]],
  spawn:[0,29.5,Math.PI],exits:[{x:0,z:31.4,w:2.2,d:0.8,to:'door'}],
  build(r,B){r.grp.children[0].material=stdMat({map:mallTex,roughness:0.4});
    // Glasdach
    for(let z=-30;z<=30;z+=4)B.box('metal',0,8.6,z,16,0.2,0.2,0x9aa3ab);B.box('glow',0,8.7,0,6,0.05,62,0xeaf6ff);
    // Ladenfronten links/rechts
    r.mshops=[];MALA_SHOPS.forEach(([nm,cat,typ],k)=>{const s=k%2?1:-1,z=-24+Math.floor(k/2)*14;const x=s*7.6;B.box('dark',x,0,z,0.6,3.6,10,0x3a3f45);B.box('glow',x-s*0.31,0.4,z,0.02,2.8,8.6,mpick([0xfdf6e3,0xe8f4ff,0xfff1e0]));
      const t=textTex(nm,{w:512,h:96,bg:'#20262c',fg:'#ffd23f'});B.plane(t,x-s*0.33,4.3,z,6,1.1,s>0?-Math.PI/2:Math.PI/2);
      const sh={name:nm,cat,x:r.ox+x-s*1.2,z:r.oz+z,doorX:r.ox+x-s*1.0,doorZ:r.oz+z,nx:-s,nz:0,face:s>0?-Math.PI/2:Math.PI/2,inVenue:'malakoff'};r.mshops.push(sh);B.solid(x,z,1.2,10);});
    // Pflanzkübel, Bänke, Rolltreppe
    for(let z=-21;z<=21;z+=14){B.sbox('stone',0,0,z,1.4,0.6,1.4,0x8a8f96);const tr=new THREE.Mesh(new THREE.SphereGeometry(0.9,10,8),cmat(0x3f7a2a,0.9));tr.position.set(0,1.5,z);r.grp.add(tr);B.sbox('wood',2.2,0,z+3,0.6,0.45,2,0x8a5a30);}
    B.sbox('metal',-4.5,0,26,1.6,1.1,6,0x8c949c);B.box('metal',-4.5,1.1,26,1.2,4,6,0xb0b8c0,0);
    B.box('wood',0,0,31.7,4.4,3.2,0.2,0x2a6f97);},
  hints:[{x:0,z:0,r:3,t:'Geh an eine Ladentür und drück <b>F</b>.'}],
  npcs(r){const T=['Haben die bei dm wieder des Shampoo?','Ich hab mei Auto in de Tiefgarage verlore. Schon wieder.','Mir sin nur zum Gucken hier.','Der Bäcker hat die besten Weck vom Rheinufer.','Kind! Komm zurück! KEVIN!'];for(let k=0;k<9;k++)vPerson(r,mr(-3,3),mr(-28,28),mr(0,6),{lines:T});
    vPerson(r,2.2,3.5,-Math.PI/2,{pose:'sit',lines:['Ich wart auf mei Frau. Seit 1997.','Ich sitz hier nur. Des is mei Hobby.']});},
  onEnter(){venueMusic('mall');},
});
// ---------- Türen in der Welt finden ----------
function placeVenueDoors(){const pl=k=>(OSM.pl&&OSM.pl[k])||null;
  for(const v of VENUES){if(v.door)continue;
    if(v.id==='dom'){const H=pl('heunen')||[-28,-82];const c=pl('dom')||[-10,-8];v.door=rayDoor(H[0],H[1]+6,c[0]+12,c[1]);}
    else if(v.id==='christus'){const c=pl('christus')||[-535,-950];const L=OSM.lm&&OSM.lm.christus;let best=null;
      for(let k=0;k<24;k++){const a=k/24*Math.PI*2;const d=rayDoor(c[0]+Math.sin(a)*45,c[1]+Math.cos(a)*45,c[0],c[1]);const dist=Math.hypot(d[0]-c[0],d[1]-c[1]);const toHbf=Math.hypot(d[0]+1000,d[1]+230);if(!best||toHbf<best[1])best=[d,toHbf];}v.door=best[0];}
    else if(v.id==='hbf'){v.door=rayDoor(-990,-292,-1070,-296);}
    else if(v.id==='malakoff'){v.door=rayDoor(471,418,474,370);}}
  for(const v of VENUES)if(v.door&&!v.labeled){v.labeled=true;if(v.id!=='hbf')label(v.name+' (begehbar)',v.door[0],v.door[1],'small');}}
