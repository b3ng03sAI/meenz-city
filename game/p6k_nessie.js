// ===================== 49 NESSIE IM RHEIN =====================
// Beim Schwimmen im Rhein taucht ab und zu Nessie auf und will 2,50 Mark schnorren (Y = zahlen, X = ablehnen).
// Ablehnen oder zu lange zögern → sie zieht den Spieler unter Wasser (normaler „Erledigt“-Pfad).
// Zahlen → einmalige „Nessies Schunkel-Granate“ (Wurfwaffe 'nessgran'): wo sie landet, schunkeln alle im Umkreis
// 20 s eingehakt zu Fastnachtsmusik, Autos halten an, die Fahndung ist vergessen.
const NESSIE={active:null,cooldown:0,granate:false,schunkel:null,
  force:false,CHANCE_MIN:0.04,COOLDOWN:300,ASK_T:12,RADIUS:30,DUR:20,PRICE:2.5,
  proj:null,stats:{met:0,paid:0,refused:0,thrown:0},checkT:1,rng:0x4e655373};
// Fester Zufall nur für den Auftauch-Wurf, damit Schwimmen in anderen Tests die globale Zufallsfolge nicht verschiebt
function nessieRng(){let s=NESSIE.rng|0;s^=s<<13;s^=s>>>17;s^=s<<5;NESSIE.rng=s>>>0;return NESSIE.rng/4294967296;}

// --- Schottenkaro (eigene Farben) für Schal und Granate ---
const NESSIE_TARTAN=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  if(x){x.fillStyle='#a3212b';x.fillRect(0,0,64,64);x.globalAlpha=0.55;x.fillStyle='#1f4a2e';
    for(const o of [6,38]){x.fillRect(o,0,14,64);x.fillRect(0,o,64,14);}x.fillStyle='#1b2a52';for(const o of [26,58]){x.fillRect(o,0,4,64);x.fillRect(0,o,64,4);}
    x.globalAlpha=0.9;x.fillStyle='#f2c641';for(const o of [13,45]){x.fillRect(o,0,1.5,64);x.fillRect(0,o,64,1.5);}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;if(LOWMEM)freeAfterUpload(t);return t;})();

// --- Das Gadget als Wurfwaffe ---
WEAPONS.nessgran={name:'🦕 SCHUNKEL-GRANATE',thrown:true,rate:0.9};
WORDER.push('nessgran');
WGEO.nessgran=new THREE.SphereGeometry(0.085,12,8);
WMAT.nessgran=stdMat({map:NESSIE_TARTAN,roughness:0.9});
const _nessieThrow=throwProjectile;
throwProjectile=function(kind,x,y,z,vx,vy,vz,owner){if(kind!=='nessgran')return _nessieThrow(kind,x,y,z,vx,vy,vz,owner);
  const m=new THREE.Mesh(WGEO.nessgran,WMAT.nessgran);m.position.set(x,y,z);m.castShadow=true;scene.add(m);
  NESSIE.proj={x,y,z,vx,vy,vz,m,t:0,owner};NESSIE.stats.thrown++;
  if(owner){owner.owned.nessgran=false;owner.ammo.nessgran=0;}// Einmal-Gadget: weg, sobald es fliegt
  chime([392,523,659]);};
function nessieProjUpdate(dt){const p=NESSIE.proj;if(!p)return;p.t+=dt;p.vy-=9.8*dt;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt,nz=p.z+p.vz*dt;
  const gy=groundY(nx,nz)-(waterCell(nx,nz)&&!bridgeLocal(nx,nz)?5:0);const gh=gridH(nx,nz);const wall=gh!==255&&gh>0&&ny<gh&&!bridgeLocal(nx,nz);
  let hitCar=false;for(const c of CARS){if(p.t>0.15&&!(p.owner&&p.owner.car===c)&&Math.abs(c.x-nx)<2.5&&Math.abs(c.z-nz)<2.5&&ny<c.y+c.T.H){hitCar=true;break;}}
  if(ny<=gy+0.05||wall||hitCar||p.t>6){scene.remove(p.m);NESSIE.proj=null;const lx=wall?p.x:nx,lz=wall?p.z:nz;
    for(let k=0;k<18;k++)spawnPart(lx,Math.max(gy,p.y)+0.4,lz,{color:[0xa3212b,0x1f4a2e,0xf2c641][k%3],size:0.25,vx:mr(-3,3),vy:mr(2,5),vz:mr(-3,3),life:0.9,grow:0,alpha:0.9});
    nessieSchunkel(lx,lz);return;}
  p.x=nx;p.y=ny;p.z=nz;p.m.position.set(nx,ny,nz);p.m.rotation.x+=dt*7;p.m.rotation.z+=dt*4;}

// --- Schunkeln ---
const NESSIE_OKSTATES=new Set(['walk','flee','cop','copReturn','gang','shout','approach','brawl']);
function nessieRows(list,cx,cz){const left=list.slice(),rows=[];
  while(left.length){const a=left.shift();const near=left.map(o=>[o,Math.hypot(o.x-a.x,o.z-a.z)]).filter(e=>e[1]<12).sort((p,q)=>p[1]-q[1]).slice(0,5).map(e=>e[0]);
    for(const o of near)left.splice(left.indexOf(o),1);const row=[a,...near];
    if(row.length===1&&rows.length){let best=null,bd=1e9;for(const r of rows){if(r.length>=7)continue;const d=Math.hypot(r[0].x-a.x,r[0].z-a.z);if(d<bd){bd=d;best=r;}}if(best){best.push(a);continue;}}
    rows.push(row);}
  for(const row of rows){const mx=row.reduce((s,h)=>s+h.x,0)/row.length,mz=row.reduce((s,h)=>s+h.z,0)/row.length;
    const face=Math.hypot(cx-mx,cz-mz)>2?Math.atan2(cx-mx,cz-mz):Math.atan2(P1.h.x-mx,P1.h.z-mz);
    const rx=Math.cos(face),rz=-Math.sin(face);// lokale +x-Achse (Seite des linken Arms)
    row.sort((p,q)=>((p.x-mx)*rx+(p.z-mz)*rz)-((q.x-mx)*rx+(q.z-mz)*rz));
    row.forEach((h,k)=>{const o=(k-(row.length-1)/2)*0.62;let tx=mx+rx*o,tz=mz+rz*o;if(blocked(tx,tz)){tx=h.x;tz=h.z;}
      h.nessieS={prev:h.state,tx,tz,face,rx,rz,hasL:k<row.length-1,hasR:k>0,walkT:0};});}
  return rows.length;}
function nessieStopCars(K){for(const c of CARS){if(c.removed||c.dead||c.nessieStop||isPlayerCar(c)||c.T.boat)continue;if(c.ai.mode!=='traffic'&&c.ai.mode!=='police')continue;
    if(Math.hypot(c.x-K.x,c.z-K.z)>NESSIE.RADIUS)continue;c.nessieStop=true;K.cars.push(c);}}
// Angehaltene Autos bremsen nur bis zum Stand (Dauerbremse würde rückwärts fahren), Modus bleibt erhalten
const _nessieTraffic=aiTraffic;
aiTraffic=function(car,dt){if(car.nessieStop){speedCtl(car,0);car.inp.steer=0;return;}_nessieTraffic(car,dt);};
const _nessiePolice=aiPolice;
aiPolice=function(car,dt){if(car.nessieStop){speedCtl(car,0);car.inp.steer=0;return;}_nessiePolice(car,dt);};
function nessieSchunkel(x,z){if(NESSIE.schunkel)nessieSchunkelEnd();
  const people=[];for(const h of HUMANS){if(!h.alive||h.inCar||h.removed||h.keeper||h.mission||h.room||playerOfHuman(h))continue;
    if(!NESSIE_OKSTATES.has(h.state)||Math.hypot(h.x-x,h.z-z)>NESSIE.RADIUS)continue;people.push(h);}
  people.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
  const K=NESSIE.schunkel={t:NESSIE.DUR,el:0,x,z,people,cars:[],rows:nessieRows(people,x,z),carT:0.5,mus:null};
  for(const h of people){h.state='nessieS';h.aiming=false;h.vx=h.vz=0;if(h.setExpr)h.setExpr('laugh');}
  nessieStopCars(K);
  const had=wanted>0;clearWanted(had?'Die Polizei schunkelt mit – Fahndung? Welche Fahndung? HELAU!':'');
  showBig('SCHUNKEL-ALARM!','win',3,`${people.length} Leut schunkele eingehakt · Helau!`);
  K.mus=nessieMusic();}
function nessieSway(h,dt){const S=h.nessieS,K=NESSIE.schunkel;
  const dx=S.tx-h.x,dz=S.tz-h.z,d=Math.hypot(dx,dz);
  if(d>0.15&&S.walkT<4){S.walkT+=dt;const mv=moveHuman(h,dx,dz,Math.min(2.4,d*3+0.4),dt);faceTo(h,dx,dz,dt,8);h.animate(dt,mv);h.g.rotation.z=0;}
  else{faceTo(h,Math.sin(S.face),Math.cos(S.face),dt,6);h.speedNow=0;
    const s=Math.sin(K.el*Math.PI*2/2.5);// ein Schunkler pro zwei Walzertakte
    h.legL.rotation.x=h.legR.rotation.x=0;h.legL.rotation.z=0.05;h.legR.rotation.z=-0.05;
    // eingehakt: Arme auf Ellbogenhöhe seitlich zum Nachbarn, nie nach oben
    h.armL.rotation.set(-0.18,0,S.hasL?0.62:0.1);h.armR.rotation.set(-0.18,0,S.hasR?-0.62:-0.1);
    h.hips.position.y=0.92-Math.abs(s)*0.035;h.hips.rotation.y=0;}
  h.y=groundY(h.x,h.z,h.y);h.sync();
  if(d<=0.15||S.walkT>=4){const s=Math.sin(K.el*Math.PI*2/2.5);h.g.rotation.z=s*0.14;h.g.position.x+=S.rx*s*0.12;h.g.position.z+=S.rz*s*0.12;}}
function nessieRelease(h){const S=h.nessieS;h.nessieS=null;if(h.removed)return;h.g.rotation.z=0;h.hips.position.y=0.92;h.legL.rotation.z=h.legR.rotation.z=0;if(h.setExpr)h.setExpr('neutral');
  if(h.state!=='nessieS')return;
  if(h.kind==='cop'&&(S.prev==='cop'||S.prev==='copReturn'))h.state=wanted>0?'cop':'copReturn';
  else if(h.kind==='gang'&&S.prev==='gang')h.state='gang';
  else{h.state='walk';if(!h.wps){const n=nearestNode(h.x,h.z,false);if(n>=0&&NODES[n].e.length)pedEnterEdge(h,mpick(NODES[n].e),n);}}}
function nessieSchunkelEnd(){const K=NESSIE.schunkel;if(!K)return;NESSIE.schunkel=null;for(const h of K.people)if(h.nessieS)nessieRelease(h);
  for(const c of K.cars)c.nessieStop=false;if(K.mus)nessieMusicStop(K.mus);}
function nessieSchunkelUpdate(dt){const K=NESSIE.schunkel;if(!K)return;K.t-=dt;K.el+=dt;
  K.carT-=dt;if(K.carT<=0){K.carT=0.5;nessieStopCars(K);}
  if(K.mus&&AUD.ctx){const [px,pz]=ppos(P1);K.mus.bus.gain.value=0.5*clamp(1-Math.hypot(px-K.x,pz-K.z)/140,0,1);}
  if(K.t<=0){nessieSchunkelEnd();hint('Des Schunkele is vorbei. Die Leut gucke e bissi verlege.',3);}}
const _nessiePed=updatePed;
updatePed=function(p,dt){if(p.nessieS){if(p.state==='nessieS'&&NESSIE.schunkel){nessieSway(p,dt);return;}nessieRelease(p);}_nessiePed(p,dt);};

// --- Fastnachtsmusik: eigener Schunkelwalzer in F-Dur (3/4), 16 Takte = 20 s ---
const NESSIE_SONG={bpm:144,chords:'FFCCCCFFFFBBFCFF',
  mel:[[69,2],[72,1],[72,3],[70,2],[67,1],[64,2],[67,1],[70,1],[69,1],[67,1],[72,2],[70,1],[69,1],[67,1],[69,1],[65,3],
       [69,1],[69,1],[72,1],[77,2],[72,1],[74,2],[70,1],[74,2],[77,1],[72,2],[69,1],[67,2],[64,1],[65,1],[69,1],[72,1],[77,3]],
  bass:{F:41,C:48,B:46},chord:{F:[53,57,60],C:[52,55,58],B:[53,58,62]}};
function nessieMusic(){const ctx=AUD.ctx;if(!ctx||!AUD.master)return null;const bus=ctx.createGain();bus.gain.value=0.5;bus.connect(AUD.master);
  const S=NESSIE_SONG,b=60/S.bpm,t0=ctx.currentTime+0.12,hz=m=>440*Math.pow(2,(m-69)/12);
  const note=(type,m,t,dur,vol,cut)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=hz(m);const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    if(cut){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;o.connect(f);f.connect(g);}else o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+0.05);};
  for(let i=0;i<S.chords.length;i++){const c=S.chords[i],t=t0+i*3*b;note('triangle',S.bass[c],t,b*0.9,0.32);for(const k of [1,2])for(const m of S.chord[c])note('square',m,t+k*b,b*0.45,0.035,1500);}
  let t=t0;for(const [m,n] of S.mel){note('sawtooth',m,t,n*b*0.92,0.07,2200);note('sawtooth',m+0.08,t,n*b*0.92,0.05,2200);t+=n*b;}// zwei leicht verstimmte Zungen ≈ Akkordeon
  return {bus};}
function nessieMusicStop(mu){try{const t=AUD.ctx.currentTime;mu.bus.gain.cancelScheduledValues(t);mu.bus.gain.setValueAtTime(mu.bus.gain.value,t);mu.bus.gain.linearRampToValueAtTime(0,t+0.4);setTimeout(()=>mu.bus.disconnect(),600);}catch(e){}}
function nessieVoice(kind){const ctx=AUD.ctx;if(!ctx||!AUD.master)return;const t=ctx.currentTime;const o=ctx.createOscillator();const g=ctx.createGain();const f=ctx.createBiquadFilter();f.type='lowpass';
  if(kind==='roar'){o.type='sawtooth';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(38,t+1.6);f.frequency.value=600;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.5,t+0.1);g.gain.exponentialRampToValueAtTime(0.0001,t+1.7);}
  else{o.type='triangle';o.frequency.setValueAtTime(180,t);o.frequency.linearRampToValueAtTime(150,t+0.25);o.frequency.linearRampToValueAtTime(260,t+0.6);f.frequency.value=900;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.3,t+0.05);g.gain.exponentialRampToValueAtTime(0.0001,t+0.7);}
  o.connect(f);f.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+1.8);}

// --- Nessie selbst ---
const NESSIE_LINES={
  rise:'Och aye! Gude, du Schwimmer! Wee Moment, Laddie …',
  ask:'Häsch mol zwei Mark fuffzisch? Fer en Haggis-Weck, gell?',
  pay:'Zwei Mark fuffzisch … och, früher hot mer dodefür en ganze Schoppe kriet! Inflation, aye. Do – mei Schunkel-Granat. Nur eemol, gell!',
  broke:'Pleite?! Och, du arm Würstche. Dann schwimm halt weiter, Laddie.',
  refuse:'NAE?! Fer zwei Mark fuffzisch?! Dann kumm emol mit nunner, Freundsche!',
  timeout:'Zu lang überlegt, Laddie … Schweige is aach e Antwort. Ab nunner!',
  escape:'Feigling! Ich krieg dich, wenn de widder im Rhoi baadst!',
  euro:'Euro? Nae, nae – Mark, Laddie! Ich bin älder als de Euro.'};
function nessieInRhine(x,z){if(!waterCell(x,z))return false;let best=1e18;for(let i=0;i<RHINE_LINE.length-1;i++){const a=RHINE_LINE[i],b=RHINE_LINE[i+1];if(Math.abs(a[0]-x)>900&&Math.abs(b[0]-x)>900)continue;const d=segDist(x,z,a[0],a[1],b[0],b[1]).d;if(d<best)best=d;}return best<320;}
// Mitte des Rheins nahe (x,z) – für Tests und Debugging
function nessieRhineSpot(x,z){let best=null,bd=1e18;for(let i=0;i<RHINE_LINE.length-1;i++){const a=RHINE_LINE[i],b=RHINE_LINE[i+1];const r=segDist(x,z,a[0],a[1],b[0],b[1]);if(r.d<bd){bd=r.d;best=[r.x,r.z];}}return best;}
// Körper steht schräg zum Spieler (Höcker sichtbar), Hals und Kopf drehen sich zu ihm
const NESSIE_TURN=1.1;
function nessieWaterOK(x,z,ax,az){if(!swimHere(x,z)||shipAt(x,z)||bridgeHasPier(x,z))return false;const rot=Math.atan2(ax-x,az-z)+NESSIE_TURN,bx=-Math.sin(rot),bz=-Math.cos(rot);
  for(const [al,la] of [[0,2.2],[0,-2.2],[3,0],[6,0],[9.5,0],[4,2],[4,-2]]){const px=x+bx*al-bz*la,pz=z+bz*al+bx*la;if(!waterCell(px,pz)||shipAt(px,pz))return false;}return true;}
function nessieSpot(P){const h=P.h,yaw=P.cam.yaw;for(const da of [0,0.45,-0.45,0.9,-0.9,1.5,-1.5,2.2,-2.2,Math.PI])for(const D of [12,15,9]){const a=yaw+da,x=h.x+Math.sin(a)*D,z=h.z+Math.cos(a)*D;if(nessieWaterOK(x,z,h.x,h.z))return [x,z];}return null;}
function nessieBuild(){if(NESSIE.model)return NESSIE.model;const g=new THREE.Group();
  const skin=stdMat({color:0x5e7d66,roughness:0.65}),belly=stdMat({color:0x9db48c,roughness:0.75}),white=stdMat({color:0xffffff,roughness:0.3}),black=stdMat({color:0x111111,roughness:0.3}),
    pink=stdMat({color:0xe48a8a,roughness:0.8}),tart=stdMat({map:NESSIE_TARTAN,roughness:0.95});
  const ball=new THREE.SphereGeometry(1,18,12);
  const add=(par,geo,mat,p,s,r)=>{const m=new THREE.Mesh(geo,mat);m.position.set(p[0],p[1],p[2]);if(s)m.scale.set(s[0],s[1],s[2]);if(r)m.rotation.set(r[0],r[1],r[2]);m.castShadow=true;par.add(m);return m;};
  add(g,ball,skin,[0,-0.35,-1.2],[1.7,1.1,2.6]);add(g,ball,belly,[0,-0.55,-0.6],[1.3,0.7,1.6]);
  add(g,ball,skin,[0,-0.25,-4.3],[1.2,1.15,1.6]);add(g,ball,skin,[0,-0.3,-6.7],[1.0,0.95,1.3]);add(g,ball,skin,[0,-0.15,-8.6],[0.55,0.5,1.2]);add(g,ball,skin,[0,0.25,-9.7],[0.35,0.35,0.35]);
  for(const s of [-1,1])add(g,ball,skin,[s*1.65,-0.2,-0.5],[0.95,0.13,0.5],[0,s*0.5,s*0.25]);
  // Hals: Kugelkette entlang einer Bezierkurve, oben dünner
  const neck=new THREE.Group();g.add(neck);const P0=[0,0.2,0.3],P1=[0,3.1,-0.7],P2=[0,5.2,1.1];const bz=t=>P0.map((v,i)=>(1-t)*(1-t)*v+2*(1-t)*t*P1[i]+t*t*P2[i]);
  for(let i=0;i<=16;i++){const t=i/16,r=0.68-0.3*t;add(neck,ball,skin,bz(t),[r,r*1.3,r]);}
  // Schal (Schottenkaro) unten am Hals + flatterndes Ende
  const sp=bz(0.3);add(neck,new THREE.TorusGeometry(0.62,0.22,8,18),tart,sp,null,[Math.PI/2+0.15,0,0]);
  const tail=new THREE.Group();tail.position.set(0.35,sp[1]-0.05,sp[2]+0.55);neck.add(tail);add(tail,new THREE.BoxGeometry(0.4,1.2,0.1),tart,[0,-0.6,0]);
  // Kopf: rundlich, große schielende Kulleraugen, Grinsen mit einem Hasenzahn
  const head=new THREE.Group();head.position.set(0,5.55,1.15);neck.add(head);
  add(head,ball,skin,[0,0,0],[0.62,0.52,0.72]);add(head,ball,skin,[0,-0.14,0.55],[0.5,0.36,0.56]);
  for(const s of [-1,1]){add(head,ball,white,[s*0.26,0.3,0.42],[0.21,0.23,0.19]);add(head,ball,black,[s*0.21,0.28,0.6],[0.09,0.1,0.06]);
    add(head,ball,black,[s*0.14,-0.04,1.06],[0.05,0.04,0.03]);add(head,ball,pink,[s*0.38,-0.12,0.66],[0.11,0.08,0.06]);
    add(head,new THREE.CylinderGeometry(0.05,0.07,0.32,8),skin,[s*0.22,0.55,-0.12],null,[-0.2,0,s*0.25]);add(head,ball,belly,[s*0.26,0.72,-0.16],[0.09,0.09,0.09]);}
  add(head,new THREE.TorusGeometry(0.24,0.035,6,14,Math.PI),black,[0,-0.2,0.98],null,[0.25,0,Math.PI]);
  add(head,new THREE.BoxGeometry(0.09,0.11,0.04),white,[0.06,-0.47,0.97]);
  // Wellenringe
  const ringG=new THREE.RingGeometry(0.88,1,40);const rings=[0,1,2].map(()=>{const m=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0xe8f4f6,transparent:true,opacity:0,depthWrite:false}));m.rotation.x=-Math.PI/2;return m;});
  NESSIE.model={g,neck,head,tail,rings};return NESSIE.model;}
function nessieUI(){if(NESSIE.ui)return NESSIE.ui;const css=document.createElement('style');
  css.textContent=`#nessie{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(640px,calc(100vw - 32px));background:rgba(10,14,12,.9);
border-left:5px solid #3f9a5a;padding:12px 16px;box-sizing:border-box;z-index:6;color:#fff;display:flex;flex-direction:column;gap:8px;pointer-events:auto}
#nessie .who{font-weight:800;font-size:15px;letter-spacing:.14em;color:#7fd29a}#nessie .line{font-size:20px;font-weight:600;line-height:1.3}
#nessie .opts{display:flex;gap:8px;flex-wrap:wrap}#nessie .opts[hidden]{display:none}#nessie button{flex:1;min-width:160px;min-height:44px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:17px;font-weight:700;padding:8px 10px;cursor:pointer}
#nessie button:hover{background:rgba(127,210,154,.22)}#nessie kbd{margin-right:8px}#nessie .bar{height:4px;background:#3f9a5a;transform-origin:left;transition:none}`;
  document.head.appendChild(css);const el=document.createElement('div');el.id='nessie';el.hidden=true;
  el.innerHTML='<div class="who">🦕 NESSIE</div><div class="line"></div><div class="opts" hidden><button class="pay"><kbd>Y</kbd>2,50 Mark gewwe</button><button class="no"><kbd>X</kbd>Nix gibt’s!</button></div><div class="bar"></div>';
  document.body.appendChild(el);el.querySelector('.pay').addEventListener('click',()=>nessieAnswer(true));el.querySelector('.no').addEventListener('click',()=>nessieAnswer(false));
  NESSIE.ui={el,line:el.querySelector('.line'),opts:el.querySelector('.opts'),bar:el.querySelector('.bar')};return NESSIE.ui;}
function nessieSay(key){const A=NESSIE.active;if(!A)return;A.line=NESSIE_LINES[key];const u=nessieUI();u.el.hidden=false;u.line.textContent=A.line;}
function nessieStart(P=P1){if(NESSIE.active||!P.h||P.car||P.gameOver)return false;const s=nessieSpot(P);if(!s)return false;
  const M=nessieBuild();const [x,z]=s;scene.add(M.g);for(const r of M.rings)scene.add(r);M.g.visible=true;
  NESSIE.active={phase:'rise',t:0,x,z,y:WATER_LEVEL-7,P,ringT:0,line:'',pullX:0,pullZ:0};NESSIE.force=false;NESSIE.stats.met++;
  splash(x,z,2);splash(x+1.5,z-1,1.5);nessieSay('rise');showBig('NESSIE?!','mission',2.5,'Des Monster vom Loch Ness – im Rhoi?!');nessieVoice('hm');nessieSync(0);return true;}
function nessieAnswer(pay){const A=NESSIE.active;if(!A||A.phase!=='ask')return false;const P=A.P;nessieUI().opts.hidden=true;
  if(!pay){NESSIE.stats.refused++;A.phase='wrath';A.t=0;nessieSay('refuse');nessieVoice('roar');return true;}
  if(G.money<NESSIE.PRICE){A.phase='pay';A.t=0;nessieSay('broke');return true;}
  G.money=Math.round((G.money-NESSIE.PRICE)*100)/100;NESSIE.stats.paid++;
  if(P.owned.nessgran)P.ammo.nessgran=1;else giveWeapon(P,'nessgran',1);
  A.phase='pay';A.t=0;nessieSay('pay');chime([523,659,784]);hint('🦕 <b>Nessies Schunkel-Granate</b> im Inventar – auswählen und werfen. Wirkt nur eemol!',6,P);return true;}
function nessieEnd(){const M=NESSIE.model;if(M){scene.remove(M.g);for(const r of M.rings)scene.remove(r);}if(NESSIE.ui)NESSIE.ui.el.hidden=true;
  NESSIE.active=null;NESSIE.cooldown=NESSIE.COOLDOWN;}
function nessieSync(dt){const A=NESSIE.active,M=NESSIE.model;if(!A||!M)return;const P=A.P;const [px,pz]=ppos(P);const tt=simTime;
  M.g.position.set(A.x,A.y+Math.sin(tt*1.3)*0.15,A.z);M.g.rotation.y=Math.atan2(px-A.x,pz-A.z)+NESSIE_TURN;M.neck.rotation.y=-NESSIE_TURN*0.6;M.head.rotation.y=-NESSIE_TURN*0.4;
  M.neck.rotation.z=Math.sin(tt*0.9)*0.05;M.neck.rotation.x=(A.phase==='wrath'?-0.15:0)+Math.sin(tt*0.7)*0.03;
  M.head.rotation.z=A.phase==='ask'?Math.sin(tt*2.2)*0.18:A.phase==='wrath'?Math.sin(tt*14)*0.12:Math.sin(tt*1.1)*0.06;M.tail.rotation.x=0.25+Math.sin(tt*3)*0.2;
  A.ringT-=dt;if(A.ringT<=0){A.ringT=0.8;const r=M.rings.find(q=>!(q.userData.k>0));if(r){r.userData.k=1;}}
  for(const r of M.rings){const k=r.userData.k||0;if(k>0){r.userData.k=k-dt*0.5;const s=2.5+(1-r.userData.k)*9;r.scale.set(s,s,s);r.position.set(A.x,WATER_LEVEL+0.06,A.z-0.5);r.material.opacity=0.5*Math.max(0,r.userData.k);}else r.material.opacity=0;}}
function nessieActiveUpdate(dt){const A=NESSIE.active;if(!A)return;const P=A.P,h=P.h;A.t+=dt;const u=nessieUI();
  if(A.phase==='rise'){A.y=WATER_LEVEL-7+7*Math.min(1,A.t/2.2)**0.6-0.3;if(Math.random()<dt*20)spawnPart(A.x+mr(-1.5,1.5),WATER_LEVEL+0.2,A.z+mr(-1.5,1.5),{color:0xeaf4f8,size:mr(0.5,1.1),vy:mr(1.5,3.5),life:0.8,grow:0.8,alpha:0.6});
    if(A.t>=2.2){A.phase='ask';A.t=0;A.y=WATER_LEVEL-0.3;nessieSay('ask');u.opts.hidden=false;nessieVoice('hm');}}
  else if(A.phase==='ask'){u.bar.style.transform=`scaleX(${Math.max(0,1-A.t/NESSIE.ASK_T)})`;
    if(A.t>=5&&!A.euro){A.euro=true;u.line.textContent=NESSIE_LINES.ask+' '+NESSIE_LINES.euro;}
    if(P.gameOver||!P.swim||Math.hypot(h.x-A.x,h.z-A.z)>45){u.opts.hidden=true;A.phase='dive';A.t=0;if(!P.gameOver)nessieSay('escape');}
    else if(A.t>=NESSIE.ASK_T){NESSIE.stats.refused++;u.opts.hidden=true;A.phase='wrath';A.t=0;nessieSay('timeout');nessieVoice('roar');}}
  else if(A.phase==='pay'){if(A.t>=3.5){A.phase='dive';A.t=0;}}
  else if(A.phase==='wrath'){A.y=WATER_LEVEL-0.3+Math.min(1,A.t/0.6)*1.6;if(A.t>=1.5){A.phase='pull';A.t=0;A.pullX=h.x;A.pullZ=h.z;splash(A.x,A.z,2);}}
  else if(A.phase==='pull'){const k=Math.min(1,A.t/2);// Nessie schnappt zu und taucht mit dem Spieler ab
    A.x+=(A.pullX-A.x)*Math.min(1,dt*2.5);A.z+=(A.pullZ-A.z)*Math.min(1,dt*2.5);A.y=WATER_LEVEL+1.3-k*6;
    if(!P.gameOver){h.x=A.pullX;h.z=A.pullZ;h.vx=h.vz=0;P.vy=0;h.g.position.y=SWIM_Y-k*3;}
    if(Math.random()<dt*30)spawnPart(A.pullX+mr(-0.8,0.8),WATER_LEVEL+0.1,A.pullZ+mr(-0.8,0.8),{color:0xdff0f4,size:mr(0.3,0.7),vy:mr(0.5,2),life:0.7,grow:0.5,alpha:0.7});
    if(A.t>=2){if(!P.gameOver)wasted(P);A.phase='dive';A.t=0;}}
  else if(A.phase==='dive'){A.y-=dt*3.2;if(A.t>=2.2){nessieEnd();return;}}
  nessieSync(dt);}
function nessieAbort(){if(NESSIE.active)nessieEnd();if(NESSIE.proj){scene.remove(NESSIE.proj.m);NESSIE.proj=null;}nessieSchunkelEnd();}
// Y/X nur solange die Frage offen ist; auch die beschriftete Taste (QWERTZ: Y liegt auf KeyZ) zählt und schaltet dann nicht das Wetter um
addEventListener('keydown',e=>{const A=NESSIE.active;if(!A||A.phase!=='ask'||mode!=='play'||e.repeat)return;const k=(e.key||'').toLowerCase();
  const pay=e.code==='KeyY'||k==='y',no=e.code==='KeyX'||k==='x';if(!pay&&!no)return;e.stopPropagation();e.preventDefault();nessieAnswer(pay);},true);

function setupNessie(){nessieUI();NESSIE.start=nessieStart;NESSIE.answer=nessieAnswer;NESSIE.abort=nessieAbort;NESSIE.inRhine=nessieInRhine;NESSIE.rhineSpot=nessieRhineSpot;NESSIE.throwAt=nessieSchunkel;}
function updateNessie(dt){if(mode!=='play')return;NESSIE.cooldown=Math.max(0,NESSIE.cooldown-dt);
  nessieProjUpdate(dt);nessieSchunkelUpdate(dt);nessieActiveUpdate(dt);
  const P=P1;if(P.weapon==='nessgran'&&!(P.ammo.nessgran>0))selectWeapon(P,'fist');
  NESSIE.granate=!!(P.owned.nessgran&&P.ammo.nessgran>0);
  if(NESSIE.active||NESSIE.cooldown>0||!P.swim||P.car||P.gameOver||TALK||activeMission)return;
  NESSIE.checkT-=dt;if(!NESSIE.force&&NESSIE.checkT>0)return;NESSIE.checkT=1;
  if(!nessieInRhine(P.h.x,P.h.z))return;
  if(NESSIE.force||nessieRng()<NESSIE.CHANCE_MIN/60)nessieStart(P);}
const _nessieSnapshot=snapshot;
snapshot=function(){const d=_nessieSnapshot();d.nessie={granate:!!(P1.owned.nessgran&&P1.ammo.nessgran>0)};return d;};
const _nessieApplySave=applySave;
applySave=function(d){nessieAbort();const r=_nessieApplySave(d);if(r&&d){const has=!!(d.nessie&&d.nessie.granate);P1.owned.nessgran=has;P1.ammo.nessgran=has?1:0;
  if(!has&&P1.weapon==='nessgran')selectWeapon(P1,'fist');NESSIE.granate=has;}return r;};
