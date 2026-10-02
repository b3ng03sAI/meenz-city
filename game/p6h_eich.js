// ===================== 46 Power-up: Eichhörnchen =====================
// Verwandlung wie Lama/Pferd/Maus: klein und flink, hohe Sprünge, klettert automatisch an Baumstämmen hoch, sitzt in
// der Krone, springt per Leertaste von Krone zu Krone oder hüpft durch Laufen wieder runter. Sammelt Nüsse in Parks
// (Zähler im HUD, ein paar Euro), Passanten sind verzückt oder erschrocken. Power-up-Pickups liegen in großen Parks und
// kommen zusätzlich über die normalen Zufalls-Power-ups.
const EICH={nuts:0,pickups:[],nutSpots:[],leaps:0,reacts:0,lastSay:'',
  DUR:60,JUMP:9.5,CLIMB_V:5,LEAP_R:14,NUT_EUR:5,NUT_R:1.1,NUT_MAX:48,NUT_VIEW:90,PICK_RESPAWN:120,NUT_RESPAWN:180,
  hud:null,nutBody:null,nutCap:null,nutT:0,reactT:0,shared:null,crownH:t=>eichCrownH(t),
  get climbing(){const m=P1.morph;return m&&m.kind==='squirrel'&&m.climb?m.climb:null;}};
const EICH_SUESS=['Ach wie süß!','Guck emol, e Eichhörnche!','Ei, is des putzisch!','Komm her, du Klaaner!','Hach, des Schwänzche!','Wart, ich hab doch noch e Nuss…'];
const EICH_IIH=['Iiih, e Ratt mit Puschel!','Des Viech guckt mich aa!','Hilfe, des springt!','Bleib mer weg mit dem Puschel!','Des hat bestimmt Flöh!'];

PU_TYPES.squirrel={n:'Eichhörnchen',icon:'🐿️',col:0xc0562a,dur:EICH.DUR,msg:'DU BIST EIN EICHHÖRNCHEN',sub:'Lauf an en Baum – hoch! · Leertaste: von Ast zu Ast',morph:true};
// scareT hoch: die allgemeine Erschreck-Routine in updatePowerups bleibt aus, die Reaktionen kommen aus updateEich
MORPH.squirrel={speed:1.55,camH:0.6,dist:3.2,scareT:1e9};
PU_SCREAM.squirrel=EICH_IIH;

// ---------- Modell (eigenes Design: rotbraunes Fell, Bauch hell, buschiger Schwanz, Ohren mit Pinseln) ----------
function eichShared(){if(!EICH.shared)EICH.shared={sph:new THREE.SphereGeometry(1,12,9),cone:new THREE.ConeGeometry(1,1,7),leg:new THREE.CylinderGeometry(0.028,0.022,1,6)};return EICH.shared;}
function eichModel(){const S=eichShared();const g=new THREE.Group();const body=new THREE.Group();g.add(body);
  const FUR=0xb5532a,DARK=0x8a3a1c,BELLY=0xf0dcc0,TAIL=0xa8481f;
  const blob=(c,sx,sy,sz,x,y,z,par=body)=>{const m=new THREE.Mesh(S.sph,cmat(c,0.9));m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.castShadow=true;par.add(m);return m;};
  blob(FUR,0.15,0.15,0.24,0,0.25,0);blob(BELLY,0.11,0.12,0.18,0,0.21,0.06);
  blob(FUR,0.12,0.115,0.13,0,0.37,0.22);blob(BELLY,0.065,0.06,0.07,0,0.33,0.31);blob(0x1a1210,0.022,0.02,0.02,0,0.345,0.375);
  for(const s of [-1,1]){blob(0x111111,0.024,0.026,0.02,s*0.065,0.4,0.31);blob(0xffffff,0.007,0.007,0.005,s*0.068,0.408,0.329);
    const ear=new THREE.Mesh(S.cone,cmat(FUR,0.9));ear.scale.set(0.035,0.09,0.03);ear.position.set(s*0.065,0.5,0.2);ear.rotation.z=-s*0.2;body.add(ear);
    const tuft=new THREE.Mesh(S.cone,cmat(DARK,0.95));tuft.scale.set(0.014,0.07,0.014);tuft.position.set(s*0.075,0.575,0.2);tuft.rotation.z=-s*0.3;body.add(tuft);}
  const legs=[];
  for(const [x,y,z,len,c] of [[-0.075,0.17,0.14,0.15,FUR],[0.075,0.17,0.14,0.15,FUR],[-0.1,0.2,-0.12,0.18,DARK],[0.1,0.2,-0.12,0.18,DARK]]){
    const p=new THREE.Group();p.position.set(x,y,z);body.add(p);const l=new THREE.Mesh(S.leg,cmat(c,0.9));l.scale.y=len;l.position.y=-len/2;p.add(l);
    blob(c,0.035,0.02,0.05,0,-len+0.01,0.02,p);legs.push(p);}
  blob(DARK,0.08,0.07,0.1,-0.1,0.2,-0.12);blob(DARK,0.08,0.07,0.1,0.1,0.2,-0.12);
  // Schwanz: Gelenkkette, wird nach oben dicker und rollt sich über den Rücken
  const tail=[];let par=new THREE.Group();par.position.set(0,0.24,-0.22);par.rotation.x=-0.5;body.add(par);
  const R=[0.07,0.1,0.125,0.14,0.13,0.1];
  for(let i=0;i<R.length;i++){const seg=new THREE.Group();if(i)seg.position.set(0,0.12,0);seg.rotation.x=i?0.35:-0.2;par.add(seg);
    blob(i===R.length-1?0xd8794a:TAIL,R[i]*1.1,R[i]*1.5,R[i]*1.05,0,0.07,0,seg);if(i>1)blob(i===R.length-1?0xd8794a:TAIL,R[i]*0.75,R[i]*1.2,R[i]*0.7,0,0.05,-R[i]*0.55,seg);tail.push(seg);par=seg;}
  g.userData.legs=legs;g.userData.tail=tail;g.userData.body=body;scene.add(g);return g;}
const _eichAnimal=animalModel;
animalModel=function(kind){return kind==='squirrel'?eichModel():_eichAnimal(kind);};

// ---------- Bäume ----------
function eichTreeKind(t){return t.kind??(Math.abs(Math.floor(t.x*3+t.z*7))%5===0?1:Math.abs(Math.floor(t.x+t.z))%3===0?2:0);}
// Sitzhöhe oben in der Krone (Kronenform aus crownGeo, Maßstab t.s)
function eichCrownH(t){return t.s*(eichTreeKind(t)===1?8.2:6.8);}
function eichTreesNear(x,z,r){const out=[];const n=Math.ceil(r/8);const cx=Math.floor(x/8),cz=Math.floor(z/8);
  for(let a=-n;a<=n;a++)for(let b=-n;b<=n;b++){const l=TREE_HASH.get((cx+a)+','+(cz+b));if(l)for(const t of l){const d=Math.hypot(t.x-x,t.z-z);if(d<r)out.push([t,d]);}}return out;}
function eichTreeAt(x,z,r){let best=null,bd=r;for(const [t,d] of eichTreesNear(x,z,r))if(d<bd){bd=d;best=t;}return best;}
function eichBase(t){return groundY(t.x,t.z);}

// ---------- Klettern / Springen ----------
function eichStartClimb(P,t){const h=P.h;P.morph.climb={tree:t,h:Math.max(0,h.y-eichBase(t)),phase:'up',ang:Math.atan2(h.x-t.x,h.z-t.z),holdT:0,leap:null};P.vy=0;}
function eichLeapTarget(P,c,I){const h=P.h;let dx=Math.sin(h.facing),dz=Math.cos(h.facing);
  if(Math.hypot(I.mx,I.mz)>0.1){const y=P.cam.yaw;dx=Math.sin(y)*I.mz-Math.cos(y)*I.mx;dz=Math.cos(y)*I.mz+Math.sin(y)*I.mx;const L=Math.hypot(dx,dz);dx/=L;dz/=L;}
  let best=null,bs=1e9,any=null,ad=1e9;
  for(const [t,d] of eichTreesNear(c.tree.x,c.tree.z,EICH.LEAP_R)){if(t===c.tree||d<1.5)continue;const dot=((t.x-c.tree.x)*dx+(t.z-c.tree.z)*dz)/d;
    if(dot>0.3){const s=d*(1.6-dot);if(s<bs){bs=s;best=t;}}if(d<ad){ad=d;any=t;}}
  return best||any;}
function eichDrop(P,c){const h=P.h,t=c.tree;for(let k=0;k<8;k++){const a=c.ang+k*0.8;const x=t.x+Math.sin(a)*1.4,z=t.z+Math.cos(a)*1.4;if(!blocked(x,z)){h.x=x;h.z=z;break;}}
  P.morph.climb=null;P.vy=2.5;P.ground=false;}
function eichClimbStep(P,I,dt){const h=P.h,m=P.morph,c=m.climb,t=c.tree;const base=eichBase(t),top=eichCrownH(t);h.vx=h.vz=0;P.vy=0;
  if(c.phase==='up'){c.h=Math.min(top,c.h+EICH.CLIMB_V*dt);const trunkTop=top*0.55;const r=c.h<trunkTop?0.42*t.s+0.14:(0.42*t.s+0.14)*(1-(c.h-trunkTop)/(top-trunkTop));
    h.x=t.x+Math.sin(c.ang)*r;h.z=t.z+Math.cos(c.ang)*r;h.y=base+c.h;h.facing=c.ang+Math.PI;if(c.h>=top){c.phase='sit';c.holdT=0;}}
  else if(c.phase==='leap'){const L=c.leap;L.t+=dt;const k=Math.min(1,L.t/L.dur);h.x=L.x0+(L.x1-L.x0)*k;h.z=L.z0+(L.z1-L.z0)*k;h.y=L.y0+(L.y1-L.y0)*k+Math.sin(k*Math.PI)*L.arc;
    if(k>=1){c.tree=L.to;c.h=eichCrownH(L.to);c.phase='sit';c.leap=null;c.holdT=0;EICH.leaps++;}}
  else{h.x=t.x;h.z=t.z;h.y=base+top;c.h=top;const mv=Math.hypot(I.mx,I.mz)>0.1;
    if(mv){const y=P.cam.yaw;const dx=Math.sin(y)*I.mz-Math.cos(y)*I.mx,dz=Math.cos(y)*I.mz+Math.sin(y)*I.mx;faceTo(h,dx,dz,dt,8);c.ang=Math.atan2(dx,dz);c.holdT+=dt;}else c.holdT=0;
    if(I.jumpP){const to=eichLeapTarget(P,c,I);if(to){const d=Math.hypot(to.x-t.x,to.z-t.z);c.leap={to,t:0,dur:0.35+d*0.045,arc:1.5+d*0.12,x0:h.x,z0:h.z,y0:h.y,x1:to.x,z1:to.z,y1:eichBase(to)+eichCrownH(to)};c.phase='leap';h.facing=Math.atan2(to.x-t.x,to.z-t.z);}
      else eichDrop(P,c);}
    else if(c.holdT>0.35)eichDrop(P,c);}
  h.sync();}
const _eichFoot=updatePlayerFoot;
updatePlayerFoot=function(P,I,dt){const m=P.morph;if(!m||m.kind!=='squirrel'){_eichFoot(P,I,dt);return;}
  if(m.climb){eichClimbStep(P,I,dt);return;}
  const h=P.h;if(P.vy<-13)P.vy=-13;// Eichhörnchen landen immer weich
  const wasGround=P.ground;_eichFoot(P,I,dt);
  if(wasGround&&I.jumpP&&P.vy>0&&P.vy<EICH.JUMP){h.y+=(EICH.JUMP-P.vy)*dt;P.vy=EICH.JUMP;}
  if(Math.hypot(I.mx,I.mz)>0.1&&!P.swim){const y=P.cam.yaw;let dx=Math.sin(y)*I.mz-Math.cos(y)*I.mx,dz=Math.cos(y)*I.mz+Math.sin(y)*I.mx;const L=Math.hypot(dx,dz);
    const t=eichTreeAt(h.x,h.z,1.3);if(t&&L>0){const tx=t.x-h.x,tz=t.z-h.z,d=Math.hypot(tx,tz)||1;if((tx*dx+tz*dz)/(d*L)>0.4)eichStartClimb(P,t);}}};
const _eichEnd=puEndMorph;
puEndMorph=function(P){const m=P.morph;if(m&&m.kind==='squirrel'&&P.h){const c=m.climb;if(c){eichDrop(P,c);const h=P.h;h.y=groundY(h.x,h.z);P.vy=0;P.ground=true;h.sync();}
  if(m.g.userData.body)m.g.userData.body.rotation.set(0,0,0);}
  _eichEnd(P);};

// ---------- Aufbau: Pickups in großen Parks, Nuss-Plätze ----------
function eichFreePoint(a,R,tries){const bb=a.bb||bboxOf(a.poly);for(let k=0;k<tries;k++){const x=lerp(bb[0],bb[2],R()),z=lerp(bb[1],bb[3],R());if(!pip(x,z,a.poly))continue;
    const i=idx(x,z);if(i<0||hgG(i)||(mfG(i)&6)||blocked(x,z))continue;return [x,z];}return null;}
function setupEich(){const R=mulberry32(4646);
  const parks=AREAS.filter(a=>a.kind==='park').map(a=>[a,Math.abs(polyArea(a.poly))]).filter(([,s])=>s>1500).sort((p,q)=>q[1]-p[1]);
  const T=PU_TYPES.squirrel;const S=eichShared();
  const ringG=new THREE.TorusGeometry(0.75,0.06,6,24),beamG=new THREE.CylinderGeometry(0.12,0.12,8,8,1,true);
  const ringM=new THREE.MeshBasicMaterial({color:T.col}),beamM=new THREE.MeshBasicMaterial({color:T.col,transparent:true,opacity:0.25,depthWrite:false}),spM=new THREE.SpriteMaterial({map:T.tex||(T.tex=puTex(T)),depthWrite:false});
  for(const [a] of parks){if(EICH.pickups.length>=8)break;const p=eichFreePoint(a,R,40);if(!p)continue;const [x,z]=p;
    const g=new THREE.Group();g.position.set(x,groundY(x,z),z);const sp=new THREE.Sprite(spM);sp.scale.set(1.3,1.3,1);sp.position.y=1.4;g.add(sp);
    const ring=new THREE.Mesh(ringG,ringM);ring.rotation.x=Math.PI/2;ring.position.y=0.08;g.add(ring);const beam=new THREE.Mesh(beamG,beamM);beam.position.y=4;g.add(beam);
    g.visible=false;scene.add(g);EICH.pickups.push({x,z,g,sp,park:a.name||'',taken:0,ph:R()*6});}
  for(const [a,s] of parks.slice(0,60)){const n=Math.min(8,2+Math.floor(s/6000));for(let k=0;k<n;k++){const p=eichFreePoint(a,R,20);if(p)EICH.nutSpots.push({x:p[0],z:p[1],y:groundY(p[0],p[1]),got:0,ph:R()*6});}}
  const body=new THREE.InstancedMesh(S.sph,cmat(0x9a6a3a,0.7),EICH.NUT_MAX),cap=new THREE.InstancedMesh(S.sph,cmat(0x5a3a1e,0.95),EICH.NUT_MAX);
  for(const im of [body,cap]){im.count=0;im.frustumCulled=false;im.castShadow=true;im.visible=false;scene.add(im);}
  EICH.nutBody=body;EICH.nutCap=cap;}

// ---------- Laufend ----------
const _eichM=new THREE.Matrix4(),_eichQ=new THREE.Quaternion(),_eichP=new THREE.Vector3(),_eichS=new THREE.Vector3(),_eichUp=new THREE.Vector3(0,1,0);
function eichCollectNut(P,n){n.got=simTime;EICH.nuts++;G.money+=EICH.NUT_EUR;chime([988,1319]);
  if(EICH.nuts%10===0)hint(`🌰 <b>${EICH.nuts} Nüsse!</b> De Winter kann komme.`,2.5,P);}
function eichDrawNuts(sq){const B=EICH.nutBody,C=EICH.nutCap;if(!B)return;let k=0;
  if(sq.length&&!INDOOR){for(const n of EICH.nutSpots){if(k>=EICH.NUT_MAX)break;if(n.got&&simTime-n.got<EICH.NUT_RESPAWN)continue;n.got=0;
      if(!sq.some(P=>Math.abs(P.h.x-n.x)<EICH.NUT_VIEW&&Math.abs(P.h.z-n.z)<EICH.NUT_VIEW))continue;
      const y=n.y+0.14+Math.sin(simTime*3+n.ph)*0.04;_eichQ.setFromAxisAngle(_eichUp,simTime*1.5+n.ph);
      _eichM.compose(_eichP.set(n.x,y,n.z),_eichQ,_eichS.set(0.09,0.11,0.09));B.setMatrixAt(k,_eichM);
      _eichM.compose(_eichP.set(n.x,y+0.08,n.z),_eichQ,_eichS.set(0.1,0.05,0.1));C.setMatrixAt(k,_eichM);k++;}}
  B.count=C.count=k;B.visible=C.visible=k>0;if(k){B.instanceMatrix.needsUpdate=true;C.instanceMatrix.needsUpdate=true;}}
function eichReact(h){let n=0;
  for(const o of HUMANS){if(n>=2)break;if(playerOfHuman(o)||!o.alive||o.inCar||o.kind!=='ped'||o.mission||o.keeper)continue;if(o.state!=='walk'&&o.state!=='markt'&&o.state!=='wait')continue;
    if(Math.abs(o.x-h.x)>9||Math.abs(o.z-h.z)>9||Math.hypot(o.x-h.x,o.z-h.z)>9||(o.eichT||0)>simTime)continue;o.eichT=simTime+8;n++;EICH.reacts++;
    if(Math.random()<0.6){EICH.lastSay=mpick(EICH_SUESS);say(o,EICH.lastSay,2.6);o.setExpr&&o.setExpr(mpick(['smile','laugh']));}
    else{EICH.lastSay=mpick(EICH_IIH);say(o,EICH.lastSay,2.4,'loud');o.setExpr&&o.setExpr(mpick(['surprised','disgust']));if(o.state!=='markt')pedFlee(o,h.x,h.z,4);}}}
function updateEich(dt){if(mode!=='play')return;
  const sq=PLAYERS.filter(P=>P.h&&P.morph&&P.morph.kind==='squirrel');
  // Power-up-Pickups in den Parks
  for(const it of EICH.pickups){if(it.taken&&simTime-it.taken<EICH.PICK_RESPAWN){it.g.visible=false;continue;}it.taken=0;
    let near=false;for(const P of PLAYERS){if(!P.h)continue;const [px,pz]=ppos(P);const d=Math.hypot(px-it.x,pz-it.z);if(d<250)near=true;
      if(d<(P.car?3:1.6)&&!P.h.room&&!(P.morph&&P.morph.kind==='squirrel')&&puActivate(P,'squirrel')){it.taken=simTime;near=false;break;}}
    it.g.visible=near&&!INDOOR;if(it.g.visible){it.ph+=dt;it.sp.position.y=1.4+Math.sin(it.ph*2.2)*0.18;it.g.rotation.y+=dt*1.5;}}
  // Eichhörnchen: Modell (Kletterhaltung, Schwanz), Nüsse, Reaktionen
  for(const P of sq){const m=P.morph,h=P.h,u=m.g.userData,c=m.climb;m.g.position.set(h.x,h.y,h.z);m.g.rotation.y=h.facing;
    m.dist=c?4.6:3.2;m.camH=c?0.9:0.6;
    const up=c&&c.phase==='up';u.body.rotation.x+=((up?-Math.PI/2:c&&c.phase==='leap'?-0.35:0)-u.body.rotation.x)*Math.min(1,dt*12);u.body.position.y=up?0.25:0;
    const sp=Math.hypot(h.vx||0,h.vz||0);m.eph=(m.eph||0)+dt*(3+sp*1.5+(up?12:0));
    if(up)u.legs.forEach((l,i)=>{l.rotation.x=Math.sin(m.eph+(i%2?Math.PI:0))*0.9;});
    u.tail.forEach((s,i)=>{s.rotation.x=(i?0.35:-0.2)+Math.sin(m.eph*0.6-i*0.7)*(sp>0.3||up?0.18:0.07);s.rotation.z=Math.sin(simTime*1.3-i*0.5)*0.08;});
    for(const n of EICH.nutSpots){if(n.got)continue;if(Math.abs(n.x-h.x)<EICH.NUT_R&&Math.abs(n.z-h.z)<EICH.NUT_R&&Math.abs(n.y-h.y)<1.5)eichCollectNut(P,n);}}
  EICH.reactT-=dt;if(EICH.reactT<=0){EICH.reactT=0.4;for(const P of sq)eichReact(P.h);}
  EICH.nutT-=dt;if(EICH.nutT<=0||!sq.length){EICH.nutT=0.05;eichDrawNuts(sq);}
  if(!EICH.hud){EICH.hud=document.createElement('div');EICH.hud.style.cssText="position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:6;pointer-events:none;background:rgba(12,16,20,.8);color:#fff;border:2px solid #c0562a;border-radius:14px;padding:3px 12px;font:700 15px 'Barlow Condensed',sans-serif";EICH.hud.hidden=true;document.body.appendChild(EICH.hud);}
  EICH.hud.hidden=!sq.length;if(sq.length){const txt=`🌰 ${EICH.nuts} ${EICH.nuts===1?'Nuss':'Nüsse'}${sq.some(P=>P.morph.climb)?' · Leertaste: nächster Baum · Laufen: runter':''}`;if(EICH.hud.textContent!==txt)EICH.hud.textContent=txt;}}
