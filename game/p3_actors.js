// ===================== KOLLISION / BODEN =====================
function gridH(x,z){const i=idx(x,z);return i<0?255:hgG(i);}
function underBridge(b,y){return y!==undefined&&y<deckY(b.t,b.br)-2.5;}
const STEP_MAP=new Map();const STEP_BB=[1e9,1e9,-1e9,-1e9];
const STEP_FNS=[];
function stepAt(x,z){if(x<STEP_BB[0]||x>STEP_BB[2]||z<STEP_BB[1]||z>STEP_BB[3])return undefined;for(const F of STEP_FNS){if(x>F.bb[0]&&x<F.bb[2]&&z>F.bb[1]&&z<F.bb[3]){const h=F.f(x,z);if(h!==undefined)return h;}}return STEP_MAP.get(idx(x,z));}
function stepSet(x,z,h){const i=idx(x,z);if(i<0)return;const o=STEP_MAP.get(i);STEP_MAP.set(i,o===undefined?h:Math.max(o,h));STEP_BB[0]=Math.min(STEP_BB[0],x-1);STEP_BB[1]=Math.min(STEP_BB[1],z-1);STEP_BB[2]=Math.max(STEP_BB[2],x+1);STEP_BB[3]=Math.max(STEP_BB[3],z+1);}
const ELEV=new Map();
function elevSetI(i,b,t){if(i<0)return;const e=ELEV.get(i);if(e){if(t>e.t)e.t=t;if(b<e.b)e.b=b;}else ELEV.set(i,{b,t});}
function elevPoly(rings,b,t){let z0=1e9,z1=-1e9;for(const r of rings)for(const p of r){if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1];}
  for(let iz=Math.floor(z0);iz<=Math.ceil(z1);iz++){const zc=iz+0.5;const xs=[];for(const r of rings)for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[j],c=r[i];if((a[1]>zc)!==(c[1]>zc))xs.push(a[0]+(zc-a[1])/(c[1]-a[1])*(c[0]-a[0]));}
    xs.sort((a,c)=>a-c);for(let k=0;k+1<xs.length;k+=2)for(let ix=Math.ceil(xs[k]-0.5);ix<=Math.floor(xs[k+1]-0.5);ix++)elevSetI(idx(ix+0.5,zc),b,t);}}
function elevOBB(x,z,w,d,rot,b,t){const c=Math.cos(rot),s=Math.sin(rot);const r=Math.hypot(w,d)/2+1;for(let iz=Math.floor(z-r);iz<=Math.ceil(z+r);iz++)for(let ix=Math.floor(x-r);ix<=Math.ceil(x+r);ix++){const dx=ix+0.5-x,dz=iz+0.5-z;const lx=dx*c-dz*s,lz=dx*s+dz*c;if(Math.abs(lx)<=w/2&&Math.abs(lz)<=d/2)elevSetI(idx(ix+0.5,iz+0.5),b,t);}}
function elevCirc(x,z,r,b,t,prof){for(let iz=Math.floor(z-r);iz<=Math.ceil(z+r);iz++)for(let ix=Math.floor(x-r);ix<=Math.ceil(x+r);ix++){const dx=ix+0.5-x,dz=iz+0.5-z;const d=Math.hypot(dx,dz);if(d<=r)elevSetI(idx(ix+0.5,iz+0.5),b,prof?b+(t-b)*prof(d/r):t);}}
function blocked(x,z,y){if(y!==undefined&&ELEV.size){const e=ELEV.get(idx(x,z));if(e&&y>e.b-1.7&&y<e.t-0.4)return true;}return blocked0(x,z,y);}
function blocked0(x,z,y){{const s=stepAt(x,z);if(s!==undefined)return y!==undefined&&y<s-0.45;}const b=bridgeLocal(x,z);if(b&&!underBridge(b,y)){const al=Math.abs(b.l);if(al<b.br.hw-1.8)return false;if(b.t>40&&b.t<b.br.L-40)return true;}const i=idx(x,z);if(i<0)return true;const v=hgG(i);if(v===0)return false;if(y!==undefined&&(v===255?y>0.8:y>=v-0.4))return false;return true;}
function blockedBoat(x,z){const i=idx(x,z);if(i<0)return true;if(!(mfG(i)&4))return true;
  if(x>MINX&&(mfG(idx(x+1.5,z))&4)===0&&(mfG(idx(x-1.5,z))&4)===0)return true;
  for(const br of BRIDGES){const bb=br.bb;if(x<bb[0]-30||x>bb[2]+30||z<bb[1]-30||z>bb[3]+30)continue;const dx=x-br.A[0],dz=z-br.A[1];const t=dx*br.U[0]+dz*br.U[1],l=dx*br.N[0]+dz*br.N[1];for(const p of br.piers){if(Math.abs(t-p.t)<p.len/2+1.2&&Math.abs(l-p.l)<p.wid/2+1.2)return true;}}
  for(const s of SHIPS){const dx=x-s.g.position.x,dz=z-s.g.position.z;const c=Math.cos(s.g.rotation.y),sn=Math.sin(s.g.rotation.y);const lx=dx*c-dz*sn,lz=dx*sn+dz*c;if(Math.abs(lx)<6&&Math.abs(lz)<52)return true;}
  return false;}
function groundY(x,z,y){const g=groundY0(x,z,y);if(y!==undefined&&ELEV.size&&g!==ROOM_Y){const e=ELEV.get(idx(x,z));if(e&&y>=e.t-0.6&&e.t>g)return e.t;}return g;}
function groundY0(x,z,y){if(x>ROOM_X0-150&&z<ROOM_Z+150)return ROOM_Y;{const s=stepAt(x,z);if(s!==undefined&&!(y!==undefined&&y<s-2.5))return s;}const b=bridgeLocal(x,z);if(b){const d=deckY(b.t,b.br);if(!(y!==undefined&&y<d-2.5))return d;}if(y!==undefined&&y>0.5){const i=idx(x,z);if(i>=0){const v=hgG(i);if(v>0&&v<255&&y>=v-0.6)return v;}}return 0;}
function los(ax,ay,az,bx,by,bz){const d=Math.hypot(bx-ax,bz-az);const n=Math.ceil(d/1.5);for(let i=1;i<n;i++){const t=i/n;const x=ax+(bx-ax)*t,z=az+(bz-az)*t,y=ay+(by-ay)*t;const h=gridH(x,z);if(h!==255&&h>y&&!bridgeLocal(x,z))return false;}return true;}
function freeSpot(x,z,r=0.6){for(let rad=0;rad<40;rad+=1.5){for(let a=0;a<TAU;a+=0.5){const px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;if(!blocked(px,pz)&&!blocked(px+r,pz)&&!blocked(px-r,pz)&&!blocked(px,pz+r)&&!blocked(px,pz-r))return [px,pz];}}return [x,z];}

// ===================== MENSCHEN =====================
const blobTex=canvasTex(64,64,g=>{const gr=g.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(0,0,0,0.75)');gr.addColorStop(0.6,'rgba(0,0,0,0.35)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);},false);
const BLOB_MAT=new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6});
const BLOB_G=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const HGEO={torso:new THREE.CapsuleGeometry(0.19,0.32,4,12).scale(1.18,1,0.68),pelvis:new THREE.CapsuleGeometry(0.16,0.1,4,10).scale(1.15,1,0.75),
  head:new THREE.SphereGeometry(0.125,16,12).scale(0.95,1.12,1.02),hair:new THREE.SphereGeometry(0.135,14,8,0,TAU,0,Math.PI*0.55).scale(0.97,1.05,1.05),
  neck:new THREE.CylinderGeometry(0.05,0.06,0.1,8),arm:new THREE.CapsuleGeometry(0.062,0.44,4,8).translate(0,-0.27,0),hand:new THREE.SphereGeometry(0.055,8,6),
  leg:new THREE.CapsuleGeometry(0.083,0.72,4,8).translate(0,-0.44,0),shoe:new THREE.BoxGeometry(0.12,0.08,0.27),cap:new THREE.CylinderGeometry(0.14,0.14,0.08,14),visor:new THREE.BoxGeometry(0.2,0.02,0.1),
  gun:new THREE.BoxGeometry(0.05,0.12,0.26),nose:new THREE.BoxGeometry(0.03,0.05,0.04)};
const mcache=new Map();function cmat(c,r=0.8){const k=c+'_'+r;if(!mcache.has(k))mcache.set(k,stdMat({color:c,roughness:r}));return mcache.get(k);}
const SKIN=[0xf1c9a5,0xe0ac80,0xc68a5e,0x8d5a3b,0x5c3a26,0xf5d6c0];
const HAIR=[0x2b1e16,0x4a3222,0x8a6a3a,0xc9a36a,0x1a1a1a,0x9a9a9a,0xb5542c];
const SHIRT=[0xb33a3a,0x3a5fb3,0x3f8f5a,0xe0c040,0xf2f2f2,0x333333,0x7a4f9a,0xd9783a,0x5aa6c8,0x8a8a8a,0xc0587a,0x2f6b6b,0x9a7b4f,0x24324a,0x6a6f55];
const PANTS=[0x2f4766,0x222222,0x5a4a3a,0x6b6b6b,0x1f2e45,0x8a7a5a,0x3a3a40];
const HUMANS=[];
// Gesichtsteile (geteilt)
const FACE={eyeG:new THREE.SphereGeometry(0.017,10,8).scale(1,1,0.55),pupilG:new THREE.SphereGeometry(0.0085,8,6),browG:new THREE.BoxGeometry(0.036,0.0075,0.008),mouthG:new THREE.BoxGeometry(0.04,0.0085,0.01),cornerG:new THREE.BoxGeometry(0.019,0.0075,0.01),
  white:stdMat({color:0xf4f1ea,roughness:0.3}),pupil:stdMat({color:0x1a120c,roughness:0.2}),lip:stdMat({color:0x6a2a26,roughness:0.6})};
const FACE_EXPR={
  neutral:{eyeW:1,eyeH:1,browY:0,browRot:0,browAsym:0,open:0,mouthW:1,corner:0,cornerAsym:0},
  smile:{eyeW:1,eyeH:0.85,browY:0.003,browRot:0,browAsym:0,open:0.12,mouthW:1.1,corner:0.55,cornerAsym:0},
  laugh:{eyeW:1.05,eyeH:0.45,browY:0.006,browRot:-0.1,browAsym:0,open:1,mouthW:1.25,corner:0.7,cornerAsym:0},
  surprised:{eyeW:1.25,eyeH:1.35,browY:0.014,browRot:0,browAsym:0,open:0.9,mouthW:0.6,corner:0,cornerAsym:0},
  angry:{eyeW:1,eyeH:0.7,browY:-0.006,browRot:-0.4,browAsym:0,open:0.1,mouthW:1.1,corner:-0.35,cornerAsym:0},
  sad:{eyeW:0.95,eyeH:0.8,browY:0.004,browRot:0.38,browAsym:0,open:0,mouthW:0.9,corner:-0.55,cornerAsym:0},
  cringe:{eyeW:1,eyeH:0.55,browY:0.002,browRot:0.15,browAsym:0.009,open:0.15,mouthW:1.15,corner:0.05,cornerAsym:0.45},
  disgust:{eyeW:0.9,eyeH:0.6,browY:-0.003,browRot:-0.2,browAsym:-0.006,open:0.25,mouthW:1.1,corner:-0.3,cornerAsym:0.25},
  smug:{eyeW:1,eyeH:0.7,browY:0.004,browRot:0,browAsym:0.008,open:0,mouthW:1,corner:0.25,cornerAsym:-0.35},
};
class Human{
  constructor(kind='ped'){
    this.kind=kind;const cop=kind==='cop',pl=kind==='player';
    const skin=mpick(SKIN),shirt=cop?0x24395c:pl?0xb3202a:mpick(SHIRT),pants=cop?0x1b2738:pl?0x2f4766:mpick(PANTS);
    const g=this.g=new THREE.Group();g.rotation.order='YXZ';const hips=this.hips=new THREE.Group();hips.position.y=0.92;g.add(hips);
    const add=(geo,c,p,par=hips,r=0.8)=>{const m=new THREE.Mesh(geo,cmat(c,r));m.position.set(p[0],p[1],p[2]);m.castShadow=true;par.add(m);return m;};
    add(HGEO.torso,shirt,[0,0.36,0],hips,cop?0.6:0.85);add(HGEO.pelvis,pants,[0,0.04,0]);add(HGEO.neck,skin,[0,0.66,0]);this.head=add(HGEO.head,skin,[0,0.79,0.005],hips,0.6);add(HGEO.nose,skin,[0,0.78,0.125],hips,0.6);
    if(cop){add(HGEO.cap,0x16243b,[0,0.9,0]);add(HGEO.visor,0x101010,[0,0.875,0.12],hips,0.4);add(new THREE.BoxGeometry(0.38,0.06,0.2),0xd7d0b0,[0,0.42,0.05]);}
    else{this.hairCol=pl?0x2b1e16:mpick(HAIR);add(HGEO.hair,this.hairCol,[0,0.8,-0.012],hips,0.9);}
    this.buildFace(hips,cop?0x2b1e16:(this.hairCol||0x2b1e16));
    const limb=(geo,c,p,r=0.8)=>{const pv=new THREE.Group();pv.position.set(p[0],p[1],p[2]);hips.add(pv);const m=new THREE.Mesh(geo,cmat(c,r));m.castShadow=true;pv.add(m);return pv;};
    this.armL=limb(HGEO.arm,shirt,[0.27,0.6,0]);this.armR=limb(HGEO.arm,shirt,[-0.27,0.6,0]);
    for(const a of [this.armL,this.armR])add(HGEO.hand,skin,[0,-0.6,0],a,0.6);
    this.legL=limb(HGEO.leg,pants,[0.1,0.02,0]);this.legR=limb(HGEO.leg,pants,[-0.1,0.02,0]);
    for(const l of [this.legL,this.legR])add(HGEO.shoe,cop?0x0d0d0d:0x1c1c1c,[0,-0.9,0.04],l,0.5);
    if(cop||pl){this.gun=new THREE.Mesh(HGEO.gun,cmat(0x111111,0.35));this.gun.position.set(0,-0.6,0.12);this.armR.add(this.gun);this.gun.visible=cop;}
    const blob=new THREE.Mesh(BLOB_G,BLOB_MAT);blob.scale.set(0.9,1,0.9);blob.position.y=0.03;blob.renderOrder=1;g.add(blob);this.blob=blob;
    this.x=0;this.z=0;this.y=0;this.vy=0;this.facing=0;this.vx=0;this.vz=0;this.phase=Math.random()*10;
    this.health=cop?100:pl?100:50;this.state='walk';this.alive=true;this.timer=0;this.aiming=false;this.speedNow=0;
    styleHuman(this,{skin,shirt,pants,cop,pl});
    scene.add(g);HUMANS.push(this);
  }
  sync(){this.g.position.set(this.x,this.y,this.z);this.g.rotation.y=this.facing;if(this.face&&this.face.visible)this.updateFace();}
  // ---------- Mimik ----------
  buildFace(hips,browCol){const f=new THREE.Group();f.position.set(0,0,0);hips.add(f);this.face=f;
    const eyes=[],brows=[],pupils=[];for(const s of [-1,1]){const eg=new THREE.Group();eg.position.set(s*0.043,0.808,0.112);f.add(eg);const w=new THREE.Mesh(FACE.eyeG,FACE.white);eg.add(w);const p=new THREE.Mesh(FACE.pupilG,FACE.pupil);p.position.z=0.012;eg.add(p);eyes.push(eg);pupils.push(p);
      const b=new THREE.Mesh(FACE.browG,cmat(browCol,0.9));b.position.set(s*0.043,0.842,0.122);f.add(b);brows.push(b);}
    const mouth=new THREE.Group();mouth.position.set(0,0.744,0.124);f.add(mouth);const mc=new THREE.Mesh(FACE.mouthG,FACE.lip);mouth.add(mc);
    const corners=[-1,1].map(s=>{const g=new THREE.Group();g.position.x=s*0.02;mouth.add(g);const m=new THREE.Mesh(FACE.cornerG,FACE.lip);m.position.x=s*0.009;g.add(m);return g;});
    this.fx={eyes,brows,pupils,mouth,mc,corners,cur:{...FACE_EXPR.neutral},tgt:FACE_EXPR.neutral,blink:Math.random()*4,talk:0,t:0};}
  setExpr(name){if(!this.fx)return;this.fx.tgt=FACE_EXPR[name]||FACE_EXPR.neutral;this.fx.exprName=name;}
  updateFace(){const F=this.fx;if(!F)return;const now=performance.now()/1000;const dt=Math.min(0.1,now-(F.t||now));F.t=now;const k=Math.min(1,dt*10);
    for(const key in F.cur)F.cur[key]+=((F.tgt[key]??0)-F.cur[key])*k;const c=F.cur;
    F.blink-=dt;let bl=1;if(F.blink<0){bl=Math.max(0.08,Math.abs(F.blink+0.07)/0.07);if(F.blink<-0.14)F.blink=2+Math.random()*4;}
    for(let i=0;i<2;i++){const s=i?1:-1;F.eyes[i].scale.set(c.eyeW,Math.max(0.08,c.eyeH*bl),1);F.brows[i].position.y=0.842+c.browY+(i?c.browAsym:0);F.brows[i].rotation.z=-s*c.browRot;}
    let open=c.open;if(F.talk>0){open=Math.max(open,0.35+0.45*Math.abs(Math.sin(now*17)));}
    F.mc.scale.set(c.mouthW,1+open*4.5,1);F.corners[0].rotation.z=-(c.corner+c.cornerAsym);F.corners[1].rotation.z=c.corner-c.cornerAsym;
    F.corners[0].position.y=F.corners[1].position.y=0;}
  animate(dt,speed){this.speedNow=speed;
    if(speed>0.15){this.phase+=dt*(2.2+speed*1.4);const a=Math.min(0.95,0.3+speed*0.11);const s=Math.sin(this.phase)*a;this.legL.rotation.x=s;this.legR.rotation.x=-s;this.armL.rotation.x=-s*0.8;this.armR.rotation.x=s*0.8;this.hips.position.y=0.92+Math.abs(Math.cos(this.phase))*0.05*Math.min(1,speed/3);this.hips.rotation.y=Math.sin(this.phase)*0.08;}
    else{for(const l of [this.legL,this.legR,this.armL,this.armR])l.rotation.x*=Math.max(0,1-dt*10);this.hips.position.y=0.92;this.hips.rotation.y=0;}
    this.armL.rotation.z=0.06;this.armR.rotation.z=-0.06;
    if(this.aiming){this.armR.rotation.x=-Math.PI/2;this.armL.rotation.x=-1.2;this.armL.rotation.z=-0.5;}
  }
  lie(){this.g.rotation.x=-Math.PI/2;this.y=groundY(this.x,this.z)+0.14;this.hips.position.y=0.92;for(const l of [this.legL,this.legR])l.rotation.x=0;this.armL.rotation.x=-2.6;this.armR.rotation.x=-2.8;this.blob.visible=false;}
  stand(){this.g.rotation.x=0;this.g.rotation.z=0;this.blob.visible=true;}
  remove(){scene.remove(this.g);const i=HUMANS.indexOf(this);if(i>=0)HUMANS.splice(i,1);this.removed=true;}
}

// ===================== FAHRZEUGE =====================
const CAR_TYPES={
  kompakt:{name:'Kompaktwagen',L:3.95,W:1.76,H:1.46,belt:0.9,hood:0.85,ws:0.72,rear:'hatch',rr:0.3,max:44,acc:8.5,grip:8,mass:1.15,wb:2.5,wr:0.31,cab:[1.95,-0.25]},
  limo:{name:'Limousine',L:4.85,W:1.85,H:1.45,belt:0.88,hood:1.2,ws:0.82,rear:'sedan',trunk:0.95,rw:0.7,max:56,acc:10,grip:8,mass:1.5,wb:2.85,wr:0.33,cab:[2.3,-0.2]},
  kombi:{name:'Kombi',L:4.75,W:1.83,H:1.5,belt:0.9,hood:1.05,ws:0.8,rear:'wagon',rr:0.22,max:52,acc:9.5,grip:8,mass:1.55,wb:2.8,wr:0.33,cab:[2.85,-0.45]},
  sport:{name:'Sportwagen',L:4.45,W:1.92,H:1.2,belt:0.78,hood:1.55,ws:0.85,rear:'coupe',roofL:0.7,max:72,acc:15,grip:9,mass:1.4,wb:2.6,wr:0.34,cab:[1.75,-0.35]},
  transporter:{name:'Transporter',L:5.3,W:2.0,H:2.35,van:true,max:36,acc:6.5,grip:6.5,mass:2.2,wb:3.4,wr:0.36,cab:[1.5,1.5]},
  taxi:{name:'Taxi',base:'limo',color:0xebe4c8,taxi:true},
  polizei:{name:'Funkstreifenwagen',base:'kombi',color:0xeef1f3,police:true,max:60,acc:13},
  motorrad:{name:'Motorrad',L:2.15,W:0.8,H:1.2,bike:true,max:66,acc:15,grip:9.5,mass:0.45,wb:1.45,wr:0.32,cab:[0,0]},
  boot:{name:'Motorboot',L:6.2,W:2.3,H:1.5,boat:true,max:27,acc:7.5,grip:1.4,mass:1.6,wb:3.2,wr:0,cab:[0,0]},
  kleinwagen:{name:'Kleinwagen',L:3.55,W:1.66,H:1.5,belt:0.92,hood:0.7,ws:0.75,rear:'hatch',rr:0.2,max:40,acc:8,grip:7.8,mass:0.95,wb:2.35,wr:0.29,cab:[1.7,-0.1]},
  suv:{name:'SUV',L:4.7,W:1.95,H:1.78,belt:1.12,hood:1.1,ws:0.78,rear:'wagon',rr:0.18,max:54,acc:10,grip:8,mass:2.1,wb:2.85,wr:0.38,cab:[2.9,-0.4]},
  pickup:{name:'Pick-up',L:5.3,W:1.95,H:1.82,belt:1.1,hood:1.25,ws:0.7,rear:'pickup',cabL:1.9,max:50,acc:9,grip:7.5,mass:2.2,wb:3.2,wr:0.39,cab:[2,0.2]},
  cabrio:{name:'Cabrio',L:4.3,W:1.85,H:1.28,belt:0.86,hood:1.35,ws:0.55,rear:'cabrio',max:66,acc:13,grip:8.8,mass:1.35,wb:2.55,wr:0.33,cab:[1.5,-0.5],color:0xb3121b},
  oldtimer:{name:'Oldtimer',L:4.4,W:1.75,H:1.5,belt:0.92,hood:1.3,ws:0.62,rear:'sedan',trunk:0.95,rw:0.55,max:38,acc:6,grip:6.8,mass:1.3,wb:2.6,wr:0.36,cab:[2.1,-0.15],chrome:true},
  eiswagen:{name:'Eiswagen',base:'transporter',color:0xf6c6d8,ice:true,max:30},
  gokart:{name:'Gokart',L:2.0,W:1.3,H:0.8,kart:true,max:31,acc:16,grip:10.5,mass:0.25,wb:1.25,wr:0.15,cab:[0,0]},
  jetski:{name:'Jetski',L:3.1,W:1.15,H:1.1,boat:true,jetski:true,max:34,acc:13,grip:2,mass:0.4,wb:1.6,wr:0,cab:[0,0]},
  flugzeug:{name:'Sportflugzeug',L:8.2,W:2.2,H:2.7,plane:true,max:62,acc:9,grip:6,mass:1.0,wb:2.4,wr:0.3,cab:[0,0],color:0xf2f2f0},
  bus:{name:'Linienbus',L:12,W:2.55,H:3.1,bus:true,color:0xc8102e,max:22,acc:3.5,grip:6,mass:6,wb:6,wr:0.5,cab:[10,0]},
};
for(const k in CAR_TYPES){const T=CAR_TYPES[k];if(T.base){const B=CAR_TYPES[T.base];for(const p in B)if(T[p]===undefined)T[p]=B[p];}}
const CAR_COLORS=[0xc9ccd0,0x1c1d20,0xf2f2f0,0x24365a,0x8a1d22,0x5b6168,0x2f4b3a,0x9aa0a6,0x3b5f8a,0xd8c9a4,0x6a1f3a,0x7f8c8d,0xe0e3e6,0x2a2c30,0x1f3d6b,0xa8a29a];
const GLASS={r:0.02,g:0.03,b:0.04},TRIM=new THREE.Color(0x1d1f21),CHROME=new THREE.Color(0x9aa0a6);
function gbox(gb,cx,cy,cz,sx,sy,sz,col,tf=0,tb=0,tw=0){const x0=cx-sx/2,x1=cx+sx/2,y0=cy-sy/2,y1=cy+sy/2,z0=cz-sz/2,z1=cz+sz/2;const xt0=x0+tw,xt1=x1-tw,zt0=z0+tb,zt1=z1-tf;
  const B=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],T=[[xt0,y1,zt0],[xt1,y1,zt0],[xt1,y1,zt1],[xt0,y1,zt1]];const ref=[cx,cy,cz];const u=[[0,0],[1,0],[1,1],[0,1]];
  gb.quadOut(B[0],B[1],B[2],B[3],u[0],u[1],u[2],u[3],col,ref);gb.quadOut(T[0],T[1],T[2],T[3],u[0],u[1],u[2],u[3],col,ref);
  for(let i=0;i<4;i++){const j=(i+1)%4;gb.quadOut(B[i],B[j],T[j],T[i],u[0],u[1],u[2],u[3],col,ref);}}
function extrudeSide(pts,W,bev,arches){const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);
  if(arches){const [c,hf,wb,wr]=arches;const R=wr+0.07;s.lineTo(-wb/2-R,c);s.absarc(-wb/2,wr,R,Math.PI,0,true);s.lineTo(wb/2-R,c);s.absarc(wb/2,wr,R,Math.PI,0,true);}
  s.closePath();const depth=Math.max(0.01,W-2*bev);const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bev>0,bevelThickness:bev,bevelSize:bev*0.85,bevelSegments:3,curveSegments:10,steps:1});
  g.rotateY(-Math.PI/2);g.translate(depth/2,0,0);g.computeVertexNormals();return g;}
const CAR_GEO=new Map();
function carGeo(id){if(CAR_GEO.has(id))return CAR_GEO.get(id);const T=CAR_TYPES[id];const c=0.28,L=T.L,W=T.W,H=T.H,hf=L/2;const det=new GB(),head=new GB(),tail=new GB();let body,glass;
  const lightW={r:1,g:0.97,b:0.9},red={r:1,g:0.06,b:0.04},orange={r:1,g:0.5,b:0.05};
  if(T.bike){const fr=new GB();const k={r:0.08,g:0.08,b:0.09};
    fr.beam([0,0.36,0.72],[0,0.95,0.42],0.07,0.07,k);fr.beam([0,0.36,-0.72],[0,0.62,-0.1],0.08,0.08,k);fr.beam([0,0.62,-0.1],[0,0.95,0.42],0.09,0.09,k);
    fr.beam([0.12,1.12,0.5],[-0.12,1.12,0.5],0.04,0.04,CHROME);fr.beam([0.33,1.12,0.5],[-0.33,1.12,0.5],0.035,0.035,k);fr.beam([0,0.95,0.42],[0,1.12,0.5],0.06,0.06,k);
    gbox(fr,0,0.62,0.05,0.26,0.24,0.5,k);for(const sx of [-1,1])fr.beam([sx*0.12,0.45,-0.2],[sx*0.12,0.4,-0.9],0.05,0.05,CHROME);
    gbox(fr,0,0.86,-0.32,0.26,0.1,0.62,{r:0.05,g:0.05,b:0.05},0.05,0.05,0.03);
    det.p.push(...fr.p);const off=det.p.length/3-fr.p.length/3;det.n.push(...fr.n);det.u.push(...fr.u);det.c.push(...fr.c);det.i.push(...fr.i.map(i=>i+off));
    const tank=new GB();gbox(tank,0,0.94,0.12,0.34,0.24,0.5,WHITE,0.12,0.12,0.06);gbox(tank,0,0.92,0.55,0.34,0.22,0.12,WHITE,0.05,0,0.04);gbox(tank,0,0.8,-0.75,0.22,0.08,0.4,WHITE,0.1,0);
    body=tank.geo();body.deleteAttribute('color');glass=new THREE.BoxGeometry(0.28,0.16,0.02).rotateX(-0.5).translate(0,1.12,0.62);
    gbox(head,0,0.98,0.62,0.18,0.14,0.06,lightW);gbox(tail,0,0.86,-1.02,0.16,0.06,0.04,red);}
  else if(T.kart){const k={r:0.07,g:0.07,b:0.08};const fr=new GB();gbox(fr,0,0.16,0,0.95,0.06,1.7,k);
    const bd=new GB();gbox(bd,0,0.3,0.72,1.05,0.2,0.42,WHITE,0.12,0,0.12);gbox(bd,0,0.28,0.05,0.6,0.16,0.9,WHITE,0,0,0.05);for(const s2 of [-1,1])gbox(bd,s2*0.55,0.25,0,0.22,0.16,0.75,WHITE,0.05,0.05,0.04);gbox(bd,0,0.32,-0.88,1.25,0.14,0.18,WHITE);
    body=bd.geo();body.deleteAttribute('color');
    gbox(det,0,0.42,-0.25,0.42,0.38,0.1,k);gbox(det,0,0.27,-0.12,0.42,0.06,0.32,k);det.beam([0,0.3,0.45],[0,0.55,0.18],0.04,0.04,k);gbox(det,0,0.58,0.15,0.3,0.04,0.04,k);gbox(det,0,0.3,-0.75,0.5,0.22,0.22,{r:0.25,g:0.25,b:0.27});
    for(const s2 of [-1,1])det.beam([s2*0.2,0.25,-0.9],[s2*0.2,0.2,-1.05],0.06,0.06,CHROME);
    glass=new THREE.BoxGeometry(0.01,0.01,0.01);gbox(head,0,0.32,0.95,0.3,0.08,0.03,lightW);gbox(tail,0,0.36,-0.98,0.4,0.05,0.03,red);}
  else if(T.jetski){const s=new THREE.Shape();s.moveTo(-0.5,-1.5);s.lineTo(0.5,-1.5);s.lineTo(0.58,0.2);s.quadraticCurveTo(0.45,1.2,0,1.6);s.quadraticCurveTo(-0.45,1.2,-0.58,0.2);s.closePath();
    body=new THREE.ExtrudeGeometry(s,{depth:0.5,bevelEnabled:true,bevelThickness:0.1,bevelSize:0.1,bevelSegments:3,curveSegments:10});body.rotateX(Math.PI/2);body.translate(0,0.75,0);body.computeVertexNormals();
    const k={r:0.08,g:0.08,b:0.09};gbox(det,0,0.88,-0.45,0.42,0.22,1.2,k,0.1,0.1,0.05);gbox(det,0,0.95,0.45,0.5,0.3,0.45,{r:0.9,g:0.9,b:0.92},0.1,0,0.08);
    det.beam([0,1.05,0.55],[0,1.28,0.42],0.07,0.07,k);det.beam([0.38,1.3,0.4],[-0.38,1.3,0.4],0.05,0.05,k);gbox(det,0,0.3,-1.55,0.3,0.25,0.12,k);
    glass=new THREE.BoxGeometry(0.36,0.14,0.02).rotateX(-0.6).translate(0,1.12,0.7);gbox(head,0,0.95,1.3,0.16,0.06,0.06,lightW);gbox(tail,0,0.9,-1.58,0.14,0.06,0.04,red);}
  else if(T.plane){const P=[];const lat=new THREE.LatheGeometry([[0.01,-4.3],[0.25,-4.1],[0.42,-2.6],[0.62,-0.6],[0.7,0.6],[0.66,1.6],[0.5,2.3],[0.22,2.6],[0.01,2.65]].map(p=>new THREE.Vector2(p[0],p[1])),14);lat.rotateX(Math.PI/2);lat.scale(1,1.25,1);lat.translate(0,1.55,0);P.push(lat.toNonIndexed());
    const wing=new THREE.BoxGeometry(10.6,0.13,1.45);wing.translate(0,2.42,0.35);P.push(wing.toNonIndexed());const hs=new THREE.BoxGeometry(3.4,0.08,0.85);hs.translate(0,1.75,-3.85);P.push(hs.toNonIndexed());
    const vs=new THREE.BoxGeometry(0.08,1.3,1.0);vs.translate(0,2.35,-3.85);vs.rotateX(0);P.push(vs.toNonIndexed());const cowl=new THREE.CylinderGeometry(0.5,0.62,0.6,14).rotateX(Math.PI/2).translate(0,1.5,2.35);P.push(cowl.toNonIndexed());
    for(const g of P){if(g.attributes.uv===undefined)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(g.index)g.setIndex(null);}
    body=mergeGeometries(P.map(g=>{const n=new THREE.BufferGeometry();n.setAttribute('position',g.attributes.position);n.setAttribute('normal',g.attributes.normal);n.setAttribute('uv',g.attributes.uv);return n;}));body.computeVertexNormals();
    const k={r:0.12,g:0.13,b:0.15},str={r:0.75,g:0.08,b:0.08};
    gbox(det,0,2.43,0.35,10.62,0.02,0.5,str);gbox(det,0,1.55,0,1.42,0.12,7.2,str);
    for(const s2 of [-1,1]){det.beam([s2*0.62,1.05,0.2],[s2*2.6,2.38,0.4],0.07,0.05,{r:0.8,g:0.8,b:0.82});det.beam([s2*0.45,0.95,0.6],[s2*1.15,0.32,0.6],0.08,0.05,k);}
    det.beam([0,1.05,1.9],[0,0.32,1.95],0.07,0.07,k);
    for(const [x,z] of [[1.2,0.6],[-1.2,0.6],[0,1.95]]){const tg=new THREE.CylinderGeometry(0.3,0.3,0.16,12).rotateZ(Math.PI/2).translate(x,0.3,z).toNonIndexed();const n=tg.attributes.position.count;const p0=det.p.length/3;
      for(let i=0;i<n;i++){det.p.push(tg.attributes.position.getX(i),tg.attributes.position.getY(i),tg.attributes.position.getZ(i));det.n.push(tg.attributes.normal.getX(i),tg.attributes.normal.getY(i),tg.attributes.normal.getZ(i));det.u.push(0,0);det.c.push(0.05,0.05,0.05);det.i.push(p0+i);}}
    gbox(det,0,1.5,2.68,0.18,0.18,0.12,{r:0.6,g:0.6,b:0.62});
    const gl=new GB();gbox(gl,0,2.05,1.05,1.32,0.55,0.08,GLASS,0,0,0.1);for(const s2 of [-1,1])gbox(gl,s2*0.69,1.95,0.35,0.04,0.5,1.3,GLASS);glass=gl.geo();
    gbox(head,5.25,2.42,0.3,0.1,0.08,0.2,{r:0.1,g:1,b:0.2});gbox(head,0,1.4,2.7,0.12,0.1,0.04,lightW);gbox(tail,-5.25,2.42,0.3,0.1,0.08,0.2,red);gbox(tail,0,3.0,-4.3,0.06,0.1,0.1,red);}
  else if(T.boat){const s=new THREE.Shape();s.moveTo(-1.1,-3.0);s.lineTo(1.1,-3.0);s.lineTo(1.15,0.8);s.quadraticCurveTo(1.0,2.4,0,3.15);s.quadraticCurveTo(-1.0,2.4,-1.15,0.8);s.closePath();
    body=new THREE.ExtrudeGeometry(s,{depth:1.0,bevelEnabled:true,bevelThickness:0.08,bevelSize:0.08,bevelSegments:2,curveSegments:10});body.rotateX(Math.PI/2);body.translate(0,1.0,0);body.computeVertexNormals();
    const deck=new GB();const wood={r:0.55,g:0.38,b:0.22};gbox(deck,0,1.02,-0.3,1.9,0.04,4.6,wood);gbox(deck,0,1.2,-1.4,1.7,0.35,0.9,{r:0.85,g:0.85,b:0.82});gbox(deck,0,1.2,0.2,1.2,0.4,0.6,{r:0.85,g:0.85,b:0.82});
    gbox(deck,0,0.9,-3.2,0.4,1.0,0.35,{r:0.12,g:0.12,b:0.13});gbox(deck,0,1.5,-3.2,0.45,0.35,0.5,{r:0.15,g:0.15,b:0.16});gbox(deck,0.35,1.25,0.95,0.06,0.3,0.06,CHROME);
    det.p.push(...deck.p);det.n.push(...deck.n);det.u.push(...deck.u);det.c.push(...deck.c);det.i.push(...deck.i);
    const gl=new THREE.BoxGeometry(1.6,0.45,0.04).rotateX(-0.45).translate(0,1.3,0.9);glass=gl;
    gbox(head,0.5,1.0,2.4,0.12,0.08,0.06,lightW);gbox(head,-0.5,1.0,2.4,0.12,0.08,0.06,{r:0.1,g:1,b:0.2});gbox(tail,0,1.4,-3.0,0.1,0.1,0.06,red);}
  else if(T.bus){body=extrudeSide([[hf-0.05,c],[hf,c+0.15],[hf,H-0.2],[hf-0.2,H],[-hf+0.2,H],[-hf,H-0.2],[-hf,c+0.15],[-hf+0.05,c]],W,0.08,[c,hf,T.wb,T.wr]);
    const gl=new GB();gbox(gl,0,1.95,-0.4,W+0.03,1.15,L-2.6,GLASS);gbox(gl,0,1.75,hf+0.005,W-0.25,1.75,0.04,GLASS);gbox(gl,0,2.0,-hf-0.005,W-0.5,0.9,0.04,GLASS);glass=gl.geo();
    gbox(det,0,c+0.15,0,W+0.02,0.3,L+0.04,TRIM);gbox(det,0,H-0.12,hf-0.02,W*0.85,0.28,0.06,{r:0.01,g:0.01,b:0.01});
    gbox(head,W*0.36,0.75,hf+0.02,0.3,0.16,0.04,lightW);gbox(head,-W*0.36,0.75,hf+0.02,0.3,0.16,0.04,lightW);gbox(tail,W*0.38,0.95,-hf-0.02,0.2,0.4,0.04,red);gbox(tail,-W*0.38,0.95,-hf-0.02,0.2,0.4,0.04,red);}
  else if(T.van){body=extrudeSide([[hf-0.1,c],[hf,c+0.25],[hf,0.98],[hf-0.12,1.12],[hf-0.42,1.22],[hf-1.05,H],[-hf+0.08,H],[-hf,H-0.08],[-hf,c+0.2],[-hf+0.1,c]],W,0.07,[c,hf,T.wb,T.wr]);
    const s=new THREE.Shape();s.moveTo(hf-0.4,1.24);s.lineTo(hf-1.04,H-0.07);s.lineTo(hf-1.95,H-0.07);s.lineTo(hf-1.95,1.24);s.closePath();
    glass=new THREE.ExtrudeGeometry(s,{depth:W+0.016,bevelEnabled:false});glass.rotateY(-Math.PI/2);glass.translate((W+0.016)/2,0,0);
    gbox(det,0,c+0.18,hf+0.03,W*0.98,0.3,0.12,TRIM);gbox(det,0,c+0.18,-hf-0.03,W*0.98,0.3,0.12,TRIM);gbox(det,0,0.82,hf+0.02,W*0.5,0.22,0.03,TRIM);
    for(const s2 of [-1,1])gbox(det,s2*(W/2+0.09),1.5,hf-1.05,0.16,0.18,0.1,TRIM);
    gbox(head,W*0.35,0.88,hf+0.015,0.34,0.16,0.04,lightW);gbox(head,-W*0.35,0.88,hf+0.015,0.34,0.16,0.04,lightW);gbox(tail,W*0.43,1.1,-hf-0.015,0.12,0.4,0.04,red);gbox(tail,-W*0.43,1.1,-hf-0.015,0.12,0.4,0.04,red);}
  else{const belt=T.belt,W0=[hf-T.hood,belt+0.06],W1=[hf-T.hood-T.ws,H];let rear;
    if(T.rear==='sedan'){const rb=-hf+T.trunk;rear=[[rb+T.rw,H-0.02],[rb,belt+0.08],[-hf+0.1,belt+0.02],[-hf,belt-0.12]];}
    else if(T.rear==='pickup'){const cr=W1[0]-T.cabL;rear=[[cr+0.08,H-0.02],[cr,belt+0.12],[cr-0.04,belt+0.1],[-hf+0.05,belt+0.1],[-hf,belt-0.05]];}
    else if(T.rear==='cabrio'){rear=[[W1[0]-0.06,H-0.02],[W1[0]-0.16,belt+0.14],[-hf+0.5,belt+0.1],[-hf+0.05,belt+0.02],[-hf,belt-0.12]];}
    else if(T.rear==='coupe'){rear=[[W1[0]-T.roofL,H-0.02],[-hf+0.3,belt+0.1],[-hf+0.05,belt],[-hf,belt-0.12]];}
    else rear=[[-hf+T.rr+0.06,H-0.02],[-hf+0.07,belt+0.16],[-hf,belt-0.04]];
    const pts=[[hf-0.14,c],[hf,c+0.2],[hf,belt-0.14],[hf-0.06,belt-0.04],[hf-0.3,belt+0.01],W0,W1,...rear,[-hf,c+0.2],[-hf+0.14,c]];
    body=extrudeSide(pts,W,0.07,[c,hf,T.wb,T.wr]);
    const rt=rear[0],rbase=rear[1];const s=new THREE.Shape();s.moveTo(W0[0]+0.03,belt+0.05);s.lineTo(W1[0]+0.018,H-0.06);s.lineTo(rt[0]-0.015,H-0.065);s.lineTo(rbase[0]-0.03,belt+0.06);s.closePath();
    glass=new THREE.ExtrudeGeometry(s,{depth:W-0.02,bevelEnabled:true,bevelThickness:0.02,bevelSize:0.012,bevelSegments:1,curveSegments:4});glass.rotateY(-Math.PI/2);glass.translate((W-0.02)/2,0,0);glass.computeVertexNormals();
    const mid=(W1[0]+rt[0])/2;gbox(det,0,(belt+H)/2,mid,W+0.03,H-belt-0.08,0.09,{r:0.02,g:0.02,b:0.025});
    gbox(det,0,c+0.17,hf+0.02,W*0.98,0.26,0.16,TRIM,0.04,0.0);gbox(det,0,c+0.17,-hf-0.02,W*0.98,0.26,0.16,TRIM,0,0.04);
    gbox(det,0,belt-0.25,hf+0.015,W*0.42,0.13,0.04,{r:0.04,g:0.04,b:0.045});gbox(det,0,belt-0.25,hf+0.025,W*0.42,0.02,0.02,CHROME);
    for(const s2 of [-1,1]){gbox(det,s2*(W/2+0.002),c+0.14,0,0.02,0.12,T.wb-0.9,TRIM);gbox(det,s2*(W/2+0.08),belt+0.12,W0[0]-0.12,0.14,0.1,0.18,TRIM);}
    gbox(head,W*0.33,belt-0.1,hf-0.02,0.4,0.12,0.12,lightW,0.05,0);gbox(head,-W*0.33,belt-0.1,hf-0.02,0.4,0.12,0.12,lightW,0.05,0);
    gbox(tail,W*0.36,belt-0.06,-hf+0.02,0.36,0.12,0.1,red,0,0.04);gbox(tail,-W*0.36,belt-0.06,-hf+0.02,0.36,0.12,0.1,red,0,0.04);
    gbox(head,W*0.47,belt-0.12,hf-0.15,0.06,0.06,0.14,orange);gbox(head,-W*0.47,belt-0.12,hf-0.15,0.06,0.06,0.14,orange);
    if(T.police)for(const s2 of [-1,1])gbox(det,s2*(W/2+0.004),c+(belt-c)*0.5,0,0.012,0.2,L*0.86,{r:0.02,g:0.13,b:0.5});
    if(T.rear==='cabrio'){const dk={r:0.05,g:0.05,b:0.06},lea={r:0.42,g:0.24,b:0.14};gbox(det,0,belt+0.12,W1[0]-1.05,W-0.3,0.04,1.7,dk);for(const s2 of [-1,1]){gbox(det,s2*0.42,belt+0.3,W1[0]-1.25,0.5,0.4,0.18,lea);gbox(det,s2*0.42,belt+0.6,W1[0]-1.32,0.26,0.2,0.1,lea);}gbox(det,-0.42,belt+0.42,W1[0]-0.45,0.36,0.04,0.36,dk);}
    if(T.rear==='pickup'){const cr=W1[0]-T.cabL;const dk={r:0.07,g:0.07,b:0.08};gbox(det,0,belt+0.13,(cr-hf)/2,W-0.25,0.04,cr+hf-0.1,dk);gbox(det,0,belt+0.22,-hf+0.02,W-0.1,0.2,0.06,dk);for(const s2 of [-1,1])gbox(det,s2*(W/2-0.06),belt+0.2,(cr-hf)/2,0.1,0.18,cr+hf-0.1,dk);
      gbox(det,0,belt+0.45,cr-0.12,W-0.3,0.35,0.05,{r:0.5,g:0.5,b:0.52});}
    if(T.chrome){for(const s2 of [-1,1])gbox(det,0,c+0.2,s2*(hf+0.05),W*1.0,0.12,0.1,CHROME);for(const s2 of [-1,1])gbox(det,s2*(W/2+0.02),c+0.33,0,0.06,0.06,T.wb-0.5,CHROME);gbox(det,0,belt-0.2,hf+0.03,W*0.5,0.3,0.03,CHROME);}}
  const r={body,glass,det:det.geo(),head:head.geo(),tail:tail.geo()};CAR_GEO.set(id,r);return r;}
const DET_MAT=stdMat({vertexColors:true,roughness:0.35,metalness:0.6});
const GLASS_MAT=new THREE.MeshPhysicalMaterial({color:0x0a0e12,roughness:0.03,metalness:0.1,clearcoat:1,clearcoatRoughness:0.02});
const HEAD_MAT=new THREE.MeshStandardMaterial({vertexColors:true,emissive:0xfff3dd,emissiveIntensity:0.3,roughness:0.1,metalness:0.2});
const TIRE_G=new THREE.CylinderGeometry(1,1,0.24,22).rotateZ(Math.PI/2);
const TIRE_M=stdMat({color:0x151515,roughness:0.85});
const RIM_G=(()=>{const gs=[new THREE.CylinderGeometry(0.66,0.66,0.06,20).rotateZ(Math.PI/2).translate(0.1,0,0).toNonIndexed()];for(let k=0;k<5;k++){const b=new THREE.BoxGeometry(0.06,0.6,0.14).translate(0.13,0.28,0);b.rotateX(k/5*TAU);gs.push(b.toNonIndexed());}
  gs.push(new THREE.CylinderGeometry(0.16,0.16,0.08,12).rotateZ(Math.PI/2).translate(0.14,0,0).toNonIndexed());return mergeGeometries(gs);})();
const RIM_M=stdMat({color:0xb9bec4,metalness:0.9,roughness:0.25});
const SIREN_ON=new THREE.MeshBasicMaterial({color:new THREE.Color(0.3,1.2,6)}),SIREN_OFF=stdMat({color:0x1a2a55,roughness:0.2,metalness:0.3});
const polizeiTex=textTex('POLIZEI',{w:256,h:48,bg:'#eef1f3',fg:'#13398a',font:'800 40px "Barlow Condensed", Arial Narrow, sans-serif'});
const taxiTex=textTex('TAXI',{w:128,h:48,bg:'#f2c500',fg:'#111',font:'800 40px "Barlow Condensed", Arial Narrow, sans-serif'});
const LETTERS='ABCDEFGHJKLMNPRSTUVWXZ';
function plateText(region){return region+'-'+LETTERS[Math.random()*LETTERS.length|0]+(Math.random()<0.6?LETTERS[Math.random()*LETTERS.length|0]:'')+' '+(1+Math.random()*9998|0);}
function plateTex(txt){return canvasTex(256,56,g=>{g.fillStyle='#f4f4f0';g.fillRect(0,0,256,56);g.fillStyle='#003399';g.fillRect(0,0,26,56);g.fillStyle='#fc0';g.beginPath();g.arc(13,16,5,0,TAU);g.fill();g.fillStyle='#fff';g.font='700 14px Arial';g.textAlign='center';g.fillText('D',13,46);g.strokeStyle='#111';g.lineWidth=3;g.strokeRect(1.5,1.5,253,53);g.fillStyle='#111';g.font='700 36px "Barlow Condensed", Arial Narrow, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,142,30);},false);}
const CARS=[];
class Car{
  constructor(id,x,z,h,o={}){
    const T=this.T=CAR_TYPES[id];this.id=id;const geo=carGeo(id);
    this.color=o.color??T.color??mpick(CAR_COLORS);
    this.g=new THREE.Group();this.g.rotation.order='YXZ';
    this.bodyMat=new THREE.MeshPhysicalMaterial({color:this.color,roughness:0.34,metalness:0.55,clearcoat:1,clearcoatRoughness:0.05});
    this.tailMat=new THREE.MeshStandardMaterial({vertexColors:true,emissive:0xff1a10,emissiveIntensity:0.4,roughness:0.15});
    const add=(g,m,cast=true)=>{const me=new THREE.Mesh(g,m);me.castShadow=cast;me.receiveShadow=true;this.g.add(me);return me;};
    this.bodyMesh=add(geo.body,this.bodyMat);add(geo.glass,GLASS_MAT);add(geo.det,DET_MAT);add(geo.head,HEAD_MAT,false);add(geo.tail,this.tailMat,false);
    this.wheels=[];const wr=T.wr;
    for(const [sx,sz] of (T.boat||T.plane?[]:T.bike?[[1,1],[1,-1]]:[[1,1],[-1,1],[1,-1],[-1,-1]])){const pv=new THREE.Group();pv.position.set(T.bike?0:sx*(T.W/2-0.16),wr,sz*T.wb/2);const w=new THREE.Group();const tire=new THREE.Mesh(TIRE_G,TIRE_M);tire.scale.set(1,wr,wr);tire.castShadow=true;
      const rim=new THREE.Mesh(RIM_G,RIM_M);rim.scale.set(sx,wr,wr);w.add(tire);w.add(rim);pv.add(w);this.g.add(pv);this.wheels.push({pv,w,front:sz>0});}
    const blob=new THREE.Mesh(BLOB_G,BLOB_MAT);blob.scale.set(T.W*1.5,1,T.L*1.25);blob.position.y=0.04;blob.renderOrder=1;if(!T.boat&&!T.plane)this.g.add(blob);
    this.plateText=o.plate||plateText(o.region||'MZ');this.plateTex=plateTex(this.plateText);const pm=stdMat({map:this.plateTex,roughness:0.5});
    for(const s of (T.boat||T.plane?[]:T.bike?[-1]:[1,-1])){const p=new THREE.Mesh(new THREE.PlaneGeometry(T.bike?0.3:0.52,T.bike?0.16:0.12),pm);p.position.set(0,T.bike?0.62:0.5,s*(T.L/2+0.1));p.rotation.y=s>0?0:Math.PI;this.g.add(p);}
    if(T.police){this.sirens=[];for(const s of [-1,1]){const m=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.14,0.26),SIREN_OFF);m.position.set(s*0.26,T.H+0.06,T.cab[1]-0.3);this.g.add(m);this.sirens.push(m);}
      for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.28),stdMat({map:polizeiTex}));p.position.set(s*(T.W/2+0.015),0.62,0.1);p.rotation.y=s*Math.PI/2;this.g.add(p);}}
    if(T.ice){const cone=new THREE.Group();const w=new THREE.Mesh(new THREE.ConeGeometry(0.35,1.0,14),stdMat({color:0xd9a35b,roughness:0.8}));w.rotation.x=Math.PI;w.position.y=0.5;cone.add(w);for(const [cl,y] of [[0xf7e7c8,1.1],[0xe86b9a,1.45]]){const b=new THREE.Mesh(new THREE.SphereGeometry(0.36,14,10),stdMat({color:cl,roughness:0.6}));b.position.y=y;cone.add(b);}cone.position.set(0,T.H,-0.3);this.g.add(cone);
      for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.5),stdMat({map:textTex('Eis vom Meenzer Gelatiere',{w:512,h:96,bg:'#f6c6d8',fg:'#8a1d4a',font:'800 40px "Barlow Condensed",sans-serif'})}));p.position.set(s*(T.W/2+0.015),1.7,-0.6);p.rotation.y=s*Math.PI/2;this.g.add(p);}}
    if(T.taxi){const m=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.2,0.16),stdMat({color:0xf2c500}));m.position.set(0,T.H+0.08,T.cab[1]-0.3);this.g.add(m);for(const s of [1,-1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(0.48,0.18),stdMat({map:taxiTex}));p.position.set(0,T.H+0.08,T.cab[1]-0.3+s*0.085);p.rotation.y=s>0?0:Math.PI;this.g.add(p);}}
    this.x=x;this.z=z;this.h=h;this.yawRate=0;this.y=T.boat?-5.75:groundY(x,z);this.vx=0;this.vz=0;this.speed=0;this.steer=0;this.health=100;this.burn=0;this.dead=false;this.spin=0;
    this.ctrl=o.ctrl||'none';this.ai={};this.driver=null;this.cops=[];this.sirenOn=false;this.inp={throttle:0,brake:0,steer:0,hand:false};
    const hl=T.L/2-0.05,hw=T.W/2-0.02;this.samples=[[hw,hl],[-hw,hl],[hw,-hl],[-hw,-hl],[hw,0],[-hw,0],[0,hl]];if(T.L>6)this.samples.push([hw,hl/2],[-hw,hl/2],[hw,-hl/2],[-hw,-hl/2]);
    scene.add(this.g);CARS.push(this);this.sync();
  }
  get name(){return this.T.name;}
  collides(){const fx=Math.sin(this.h),fz=Math.cos(this.h),rx=-fz,rz=fx;let sx=0,sz=0,n=0;const bf=this.T.boat?blockedBoat:blocked;
    for(const [a,b] of this.samples){const px=this.x+fx*b+rx*a,pz=this.z+fz*b+rz*a;if(bf(px,pz,this.y)){sx+=px-this.x;sz+=pz-this.z;n++;}}return n?[sx,sz]:null;}
  damage(d,byPlayer=false){if(this.dead)return;this.health-=d;if(this.health<=0&&!this.burn){this.burn=4.5;}}
  physics(dt){const steps=dt>0.02?3:2;for(let i=0;i<steps;i++)this.physStep(dt/steps);this.afterPhysics(dt);}
  physStep(dt){
    const T=this.T;let inp=this.inp;if(this.dead||this.burn>0)inp={throttle:0,brake:0.5,steer:0,hand:true};
    if(T.boat){this.boatStep(dt,inp);return;}
    if(T.plane){this.planeStep(dt,inp);return;}
    const m=T.mass*1000,g=9.81,L=T.wb,a=L*0.5,b=L*0.5,hcg=T.bike?0.6:(T.H>2?0.9:0.5);const mu=(T.grip/8)*(1-0.3*(WEATHER?WEATHER.wet:0));
    let fx=Math.sin(this.h),fz=Math.cos(this.h),rx=-fz,rz=fx;
    let vF=this.vx*fx+this.vz*fz,vL=this.vx*rx+this.vz*rz;const sp=Math.hypot(vF,vL);
    const thr=inp.throttle||0,brk=inp.brake||0;
    const ts=inp.steer||0;this.steer+=(ts-this.steer)*Math.min(1,dt*(Math.abs(ts)>Math.abs(this.steer)?5:9));
    const maxS=(T.bike?0.5:0.6)/(1+Math.max(0,vF)*0.035);const delta=this.steer*maxS;
    // Antrieb: Kraftbegrenzt bei niedrigem Tempo, leistungsbegrenzt darüber
    const Pmax=T.acc*m*9,Fmax=T.acc*m*1.15;const kDrag=Pmax/Math.pow(T.max,3);
    let Fx=0;const health=this.health<30?0.6:1;
    if(thr>0){if(vF>-0.5){Fx+=Math.min(Fmax,Pmax/Math.max(1,Math.abs(vF)))*thr*health;}else Fx+=Fmax*1.4*thr;}
    if(brk>0){if(vF>0.5)Fx-=m*g*mu*0.95*brk;else if(vF>-T.max*0.25&&thr===0)Fx-=Fmax*0.55*brk;else if(vF<-0.5)Fx+=m*g*mu*0.9*brk*0;}
    Fx-=kDrag*vF*Math.abs(vF)+m*0.015*g*Math.sign(vF)*Math.min(1,Math.abs(vF));
    // Gewichtsverlagerung
    const ax=this.axPrev||0;const Nf=Math.max(0.15*m*g,m*g*b/L-m*ax*hcg/L),Nr=Math.max(0.15*m*g,m*g*a/L+m*ax*hcg/L);
    const tire=al=>Math.sin(1.55*Math.atan(9*al));
    let Ff=0,Fr=0;
    if(sp>1.5){const vLf=vL-this.yawRate*a,vLr=vL+this.yawRate*b;const av=Math.max(Math.abs(vF),1.5);
      const af=Math.atan2(vLf,av)+delta*Math.sign(vF||1),ar=Math.atan2(vLr,av);
      Ff=-mu*Nf*tire(af);Fr=-mu*Nr*tire(ar)*(inp.hand?0.38:1);
      // Traktionskreis hinten: Gas/Bremse reduziert Seitenhaftung
      const used=Math.min(0.95,Math.abs(Fx)/(mu*Nr+1));Fr*=Math.sqrt(1-used*used);
      if(inp.hand&&vF>0)Fx-=m*g*mu*0.35;
      const I=m*a*b*1.1;const torque=-(a*Ff*Math.cos(delta)-b*Fr);this.yawRate+=torque/I*dt;
      this.yawRate*=Math.exp(-0.6*dt);}
    else{const target=vF/L*Math.tan(delta);this.yawRate+=(target-this.yawRate)*Math.min(1,dt*10);vL*=Math.exp(-8*dt);Ff=0;Fr=0;}
    const Fy=Ff*Math.cos(delta)+Fr;
    const axl=Fx/m,ayl=Fy/m;this.axPrev=lerp(this.axPrev||0,axl,0.3);this.ayVis=lerp(this.ayVis||0,ayl,0.2);
    if(sp<1.5){const vF2=vF+axl*dt;this.h+=this.yawRate*dt;fx=Math.sin(this.h);fz=Math.cos(this.h);rx=-fz;rz=fx;this.vx=fx*vF2;this.vz=fz*vF2;}
    else{this.vx+=(fx*axl+rx*ayl)*dt;this.vz+=(fz*axl+rz*ayl)*dt;this.h+=this.yawRate*dt;fx=Math.sin(this.h);fz=Math.cos(this.h);rx=-fz;rz=fx;}
    vF=this.vx*fx+this.vz*fz;vL=this.vx*rx+this.vz*rz;this.speed=vF;this.lateral=vL;
    this.slip=Math.abs(vL)>2.5&&sp>6?Math.abs(vL):0;
    this.move(dt);}
  boatStep(dt,inp){const T=this.T;let fx=Math.sin(this.h),fz=Math.cos(this.h),rx=-fz,rz=fx;let vF=this.vx*fx+this.vz*fz,vL=this.vx*rx+this.vz*rz;
    const thr=inp.throttle||0,brk=inp.brake||0;this.steer+=((inp.steer||0)-this.steer)*Math.min(1,dt*4);
    if(thr>0&&vF<T.max)vF+=T.acc*thr*dt*(1-Math.max(0,vF)/T.max*0.8);if(brk>0)vF-=T.acc*0.7*brk*dt;vF-=vF*Math.abs(vF)*0.006*dt+vF*0.25*dt;vF=Math.max(vF,-6);
    vL*=Math.exp(-(inp.hand?0.6:1.6)*dt);this.yawRate=lerp(this.yawRate,this.steer*(0.15+Math.abs(vF)*0.055)*Math.sign(vF||1)*(Math.abs(vF)>0.3?1:0.4),Math.min(1,dt*3));
    this.h+=this.yawRate*dt;fx=Math.sin(this.h);fz=Math.cos(this.h);rx=-fz;rz=fx;this.vx=fx*vF+rx*vL;this.vz=fz*vF+rz*vL;this.speed=vF;this.move(dt);}
  move(dt){const ox=this.x,oz=this.z;this.x+=this.vx*dt;this.z+=this.vz*dt;
    let hit=this.collides();
    if(hit){this.x=ox;this.z=oz;let nx=-hit[0],nz=-hit[1];const L=Math.hypot(nx,nz)||1;nx/=L;nz/=L;const vn=this.vx*nx+this.vz*nz;
      if(vn<0){this.vx-=1.28*vn*nx;this.vz-=1.28*vn*nz;const imp=-vn;this.yawRate*=0.5;if(imp>3.5){this.damage(imp*(this.ctrl==='player'?1.1:1.6));this.deform(-nx,-nz,imp);onCrash(this,imp);}}
      this.x+=this.vx*dt;this.z+=this.vz*dt;if(this.collides()){this.x=ox;this.z=oz;this.vx*=0.3;this.vz*=0.3;}
      if(this.collides()){this.x+=nx*0.15;this.z+=nz*0.15;}}}
  afterPhysics(dt){const T=this.T;const fx=Math.sin(this.h),fz=Math.cos(this.h);
    if(this.burn>0){this.burn-=dt;if(Math.random()<dt*30)spawnPart(this.x+mr(-0.8,0.8),this.y+1.2,this.z+mr(-1,1),{color:mpick([0xff7a1a,0xffb02e,0xff4a10]),size:mr(1,2),vy:2.5,life:0.6,grow:1.5,add:true});if(this.burn<=0)explode(this);}
    else if(this.health<35&&!this.dead&&Math.random()<dt*(this.health<15?14:6))spawnPart(this.x+fx*T.L*0.42,this.y+T.H*0.6,this.z+fz*T.L*0.42,{color:this.health<15?0x2a2a2a:0x999999,size:0.8,vy:1.6,life:1.6,grow:1.8,alpha:0.55});
    if(this.slip&&!T.boat&&Math.random()<dt*this.slip*1.2){const rxx=-fz,rzz=fx;for(const s of [-1,1])spawnPart(this.x-fx*T.wb/2+rxx*s*T.W*0.4,this.y+0.2,this.z-fz*T.wb/2+rzz*s*T.W*0.4,{color:0xcfcfcf,size:mr(0.6,1.2),vy:0.5,life:1.4,grow:1.6,alpha:0.35});
      if(isPlayerCar(this))skidSound(this.slip);}}
  deform(nx,nz,imp){if(this.T.boat||!this.bodyMesh)return;if(!this.ownGeo){this.bodyMesh.geometry=this.bodyMesh.geometry.clone();this.ownGeo=true;}
    const g=this.bodyMesh.geometry,p=g.attributes.position;const c=Math.cos(this.h),s=Math.sin(this.h);const lx=nx*c-nz*s,lz=nx*s+nz*c;
    const px=lx*this.T.W*0.5,pz=lz*this.T.L*0.5,py=0.7;const R=0.9+imp*0.04,k=Math.min(0.22,imp*0.012);
    for(let i=0;i<p.count;i++){const dx=p.getX(i)-px,dy=p.getY(i)-py,dz=p.getZ(i)-pz;const d=Math.hypot(dx,dy*0.7,dz);if(d<R){const f=(1-d/R)*k;p.setX(i,p.getX(i)-lx*f+Math.sin(i*12.9)*f*0.15);p.setZ(i,p.getZ(i)-lz*f);p.setY(i,p.getY(i)-f*0.2);}}
    p.needsUpdate=true;g.computeVertexNormals();}
  sync(dt=0){const fx=Math.sin(this.h),fz=Math.cos(this.h);
    if(this.T.plane){this.planeSync(dt);return;}
    if(this.T.boat){this.bob=(this.bob||Math.random()*9)+dt;const sp=Math.abs(this.speed);const js=this.T.jetski;this.y=(js?-5.42+Math.min(0.15,sp*0.006):-5.75)+Math.sin(this.bob*(js?2.6:1.7))*(js?0.04:0.06);this.g.position.set(this.x,this.y,this.z);this.g.rotation.set(-Math.min(js?0.16:0.13,sp*0.006)+Math.sin(this.bob*1.3)*0.015,this.h,Math.sin(this.bob*1.1)*0.025-this.steer*Math.min(0.15,sp*0.008));
      if(sp>3&&Math.random()<dt*sp*(js?3:1.5))spawnPart(this.x-fx*(js?1.7:3)+mr(-0.5,0.5),this.y+(js?0.6:0.9),this.z-fz*(js?1.7:3)+mr(-0.5,0.5),{color:0xeef4f6,size:mr(0.8,1.6),vy:0.4,life:1.6,grow:1.4,alpha:0.5});}
    else{const hl=this.T.L*0.4;const yf=groundY(this.x+fx*hl,this.z+fz*hl,this.y),yb=groundY(this.x-fx*hl,this.z-fz*hl,this.y);this.y=(yf+yb)/2;
    this.lean=lerp(this.lean||0,this.T.bike?clamp(-this.steer*Math.abs(this.speed)*0.035,-0.6,0.6):0,Math.min(1,dt*6));
    const pitchV=clamp((this.axPrev||0)*0.006,-0.05,0.05),rollV=this.T.bike?0:clamp(-(this.ayVis||0)*0.007,-0.06,0.06);
    this.g.position.set(this.x,this.y,this.z);this.g.rotation.set(-Math.atan2(yf-yb,hl*2)+pitchV,this.h,this.lean+rollV);}
    const brk=(this.inp.brake>0.1&&this.speed>0.3)||this.speed<-0.3;this.tailMat.emissiveIntensity=this.dead?0:(brk?4:(nightF>0.3?1.4:0.35));
    this.spin+=this.speed*dt/this.T.wr;for(const w of this.wheels){w.w.rotation.x=this.spin;w.pv.rotation.y=w.front?this.steer*0.5:0;}
    if(this.sirens){const on=this.sirenOn&&!this.dead;const ph=(performance.now()/180|0)%2;this.sirens[0].material=on&&ph?SIREN_ON:SIREN_OFF;this.sirens[1].material=on&&!ph?SIREN_ON:SIREN_OFF;}}
  remove(){scene.remove(this.g);this.plateTex.dispose();this.bodyMat.dispose();this.tailMat.dispose();const i=CARS.indexOf(this);if(i>=0)CARS.splice(i,1);this.removed=true;}
}
function resolveCars(){
  for(let i=0;i<CARS.length;i++){const A=CARS[i];for(let j=i+1;j<CARS.length;j++){const B=CARS[j];const R=(A.T.L+B.T.L)/2+0.5;if(Math.abs(A.x-B.x)>R||Math.abs(A.z-B.z)>R||Math.abs(A.y-B.y)>2.5)continue;
    const ca=carCircles(A),cb=carCircles(B);let done=false;
    for(const a of ca){if(done)break;for(const b of cb){const dx=a[0]-b[0],dz=a[1]-b[1];const d=Math.hypot(dx,dz);const rs=a[2]+b[2];if(d<rs&&d>1e-4){const nx=dx/d,nz=dz/d,o=rs-d;const ma=A.T.mass*(A.ctrl==='none'?2:1),mb=B.T.mass*(B.ctrl==='none'?2:1);
      A.x+=nx*o*mb/(ma+mb);A.z+=nz*o*mb/(ma+mb);B.x-=nx*o*ma/(ma+mb);B.z-=nz*o*ma/(ma+mb);
      const vrel=(A.vx-B.vx)*nx+(A.vz-B.vz)*nz;if(vrel<0){const J=-(1.25)*vrel/(1/ma+1/mb);A.vx+=J/ma*nx;A.vz+=J/ma*nz;B.vx-=J/mb*nx;B.vz-=J/mb*nz;
        const imp=-vrel;if(imp>3){A.damage(imp*1.3);B.damage(imp*1.3);onCarHit(A,B,imp);}}
      done=true;break;}}}}}}
function carCircles(C){const fx=Math.sin(C.h),fz=Math.cos(C.h);const r=C.T.W*0.55;const n=C.T.L>6?5:3;const out=[];for(let k=0;k<n;k++){const o=(k/(n-1)-0.5)*(C.T.L-r*1.6);out.push([C.x+fx*o,C.z+fz*o,r]);}return out;}

// ===================== PARTIKEL, LEUCHTSPUREN =====================
const puffTex=canvasTex(64,64,g=>{const gr=g.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.5,'rgba(255,255,255,0.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);},false);
const PARTS=[],PPOOL=[];
function spawnPart(x,y,z,o){if(PARTS.length>260)return;let s=PPOOL.pop();if(!s){s=new THREE.Sprite(new THREE.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false}));scene.add(s);}
  s.visible=true;s.material.color.setHex(o.color??0xffffff);s.material.blending=o.add?THREE.AdditiveBlending:THREE.NormalBlending;const a=o.alpha??0.85;s.material.opacity=a;s.position.set(x,y,z);s.scale.setScalar(o.size??1);
  PARTS.push({s,vx:o.vx??mr(-0.5,0.5),vy:o.vy??1,vz:o.vz??mr(-0.5,0.5),life:o.life??1,max:o.life??1,grow:o.grow??0.5,a});}
function updateParts(dt){for(let i=PARTS.length-1;i>=0;i--){const p=PARTS[i];p.life-=dt;if(p.life<=0){p.s.visible=false;PPOOL.push(p.s);PARTS.splice(i,1);continue;}
  p.s.position.x+=p.vx*dt;p.s.position.y+=p.vy*dt;p.s.position.z+=p.vz*dt;const sc=p.s.scale.x+p.grow*dt;p.s.scale.set(sc,sc,sc);p.s.material.opacity=p.a*(p.life/p.max);}}
const TRACERS=[];
const tracerMat=new THREE.LineBasicMaterial({color:0xffe6a0,transparent:true,opacity:0.9});
function tracer(ax,ay,az,bx,by,bz){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax,ay,az),new THREE.Vector3(bx,by,bz)]);const l=new THREE.Line(g,tracerMat);scene.add(l);TRACERS.push({l,t:0.06});}
function updateTracers(dt){for(let i=TRACERS.length-1;i>=0;i--){const t=TRACERS[i];t.t-=dt;if(t.t<=0){scene.remove(t.l);t.l.geometry.dispose();TRACERS.splice(i,1);}}}
const flashLight=new THREE.PointLight(0xffb060,0,12,2);scene.add(flashLight);let flashT=0;

// ===================== VERKEHRS-KI =====================
const ROAD_SPEED={main:13.9,street:8.4,ped:4,path:3};
function laneAt(e,from,t,off){const E=EDGES[e];const A=NODES[from],B=NODES[edgeOther(e,from)];const dx=(B.x-A.x)/E.len,dz=(B.z-A.z)/E.len;const o=off===undefined?E.road.lane:off;return [A.x+dx*t-dz*o,A.z+dz*t+dx*o];}
function edgeDir(e,from){const E=EDGES[e];const A=NODES[from],B=NODES[edgeOther(e,from)];return [(B.x-A.x)/E.len,(B.z-A.z)/E.len];}
function chooseNext(e,from,carOnly){const to=edgeOther(e,from);const d0=edgeDir(e,from);let opts=NODES[to].e.filter(x=>x!==e&&(!carOnly||(EDGES[x].car&&edgeAllowed(x,to))));
  if(!opts.length)return {e,from:to};let tot=0;const ws=opts.map(x=>{const d=edgeDir(x,to);const dot=d0[0]*d[0]+d0[1]*d[1];const w=dot>0.7?3:dot>-0.3?1.2:0.3;tot+=w;return w;});
  let r=Math.random()*tot;for(let i=0;i<opts.length;i++){r-=ws[i];if(r<=0)return {e:opts[i],from:to};}return {e:opts[0],from:to};}
function aiEnterEdge(car,e,from){const ai=car.ai;ai.e=e;ai.from=from;const L=EDGES[e].len;const m=Math.min(7,L*0.3);ai.wps=[laneAt(e,from,m),laneAt(e,from,L-m)];ai.next=chooseNext(e,from,true);
  const d0=edgeDir(e,from),d1=edgeDir(ai.next.e,ai.next.from);ai.turn=1-(d0[0]*d1[0]+d0[1]*d1[1]);ai.limit=ROAD_SPEED[EDGES[e].road.type]*(EDGES[e].road.ring?0.7:1)*(car.T.bus?0.8:1);}
function aiInitTraffic(car){const n=nearestNode(car.x,car.z,true);if(n<0){car.ai.mode='idle';return;}const N=NODES[n];const opts=N.e.filter(x=>EDGES[x].car&&edgeAllowed(x,n));if(!opts.length){car.ai.mode='idle';return;}
  let best=opts[0],bd=-2;const fx=Math.sin(car.h),fz=Math.cos(car.h);for(const e of opts){const d=edgeDir(e,n);const dot=d[0]*fx+d[1]*fz;if(dot>bd){bd=dot;best=e;}}car.ai.mode='traffic';aiEnterEdge(car,best,n);car.ai.wps.unshift([N.x,N.z]);}
function obstacleAhead(car,look){const fx=Math.sin(car.h),fz=Math.cos(car.h),rx=-fz,rz=fx;let near=1e9;
  for(const o of CARS){if(o===car)continue;const dx=o.x-car.x,dz=o.z-car.z;if(Math.abs(dx)>look+6||Math.abs(dz)>look+6)continue;const al=dx*fx+dz*fz;const la=Math.abs(dx*rx+dz*rz);if(al>0&&al<look+o.T.L/2&&la<1.2+o.T.W/2){near=Math.min(near,al-o.T.L/2-car.T.L/2);}}
  for(const h of HUMANS){if(!h.alive||h.inCar)continue;const dx=h.x-car.x,dz=h.z-car.z;if(Math.abs(dx)>look+4||Math.abs(dz)>look+4)continue;const al=dx*fx+dz*fz;const la=Math.abs(dx*rx+dz*rz);if(al>0&&al<look&&la<car.T.W/2+0.6)near=Math.min(near,al-car.T.L/2);}
  return near;}
function steerTo(car,tx,tz){const th=Math.atan2(tx-car.x,tz-car.z);return clamp(angDiff(car.h,th)*2.2,-1,1);}
function speedCtl(car,desired){const v=car.speed;const inp=car.inp;inp.throttle=0;inp.brake=0;if(desired<0.4){inp.brake=v>0.2?1:0;return;}if(v<desired-0.6)inp.throttle=clamp((desired-v)/4,0.35,1);else if(v>desired+0.8)inp.brake=clamp((v-desired)/5,0.2,1);}
function aiTraffic(car,dt){const ai=car.ai;if(!ai.wps){aiInitTraffic(car);if(ai.mode!=='traffic')return;}
  if(ai.rev>0){ai.rev-=dt;car.inp.throttle=0;car.inp.brake=1;car.inp.steer=-ai.revSteer;if(car.speed>0.5)car.inp.brake=1;return;}
  let wp=ai.wps[0];if(Math.hypot(wp[0]-car.x,wp[1]-car.z)<4.5){ai.wps.shift();if(!ai.wps.length){aiEnterEdge(car,ai.next.e,ai.next.from);}wp=ai.wps[0];}
  car.inp.steer=steerTo(car,wp[0],wp[1]);car.inp.hand=false;
  let desired=ai.limit;const last=ai.wps.length===1;const dwp=Math.hypot(wp[0]-car.x,wp[1]-car.z);
  if(last&&dwp<24)desired=Math.min(desired,lerp(ai.limit,4.5,clamp(ai.turn*1.1,0,1)));
  const angErr=Math.abs(angDiff(car.h,Math.atan2(wp[0]-car.x,wp[1]-car.z)));desired*=clamp(1-angErr*0.55,0.25,1);
  if(!(ai.ghost>0)){const near=obstacleAhead(car,7+Math.max(0,car.speed)*1.3);if(near<1e8){desired=Math.min(desired,Math.max(0,(near-2.5)*0.9));}}
  else ai.ghost-=dt;
  if(car.speed<0.4&&desired<0.5){ai.wait=(ai.wait||0)+dt;if(ai.wait>7){ai.ghost=2.5;ai.wait=0;}}else ai.wait=0;
  speedCtl(car,desired);
  if(car.inp.throttle>0.3&&Math.abs(car.speed)<0.4){ai.stuck=(ai.stuck||0)+dt;if(ai.stuck>2.5){ai.rev=1.4;ai.revSteer=car.inp.steer||1;ai.stuck=0;}}else ai.stuck=0;
  if(ai.bump>0){ai.bump-=dt;car.inp.throttle=0;car.inp.brake=0.3;}}

// ---------- Kürzeste Wege (Polizei) ----------
function dijkstra(s,t){if(s<0||t<0)return [];const N=NODES.length;const dist=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1);dist[s]=0;const heap=[[0,s]];
  const push=(it)=>{heap.push(it);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const top=heap[0];const last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=i*2+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return top;};
  let it=0;while(heap.length&&it++<20000){const [d,n]=pop();if(n===t)break;if(d>dist[n])continue;for(const e of NODES[n].e){const E=EDGES[e];if(E.dead)continue;const o=edgeOther(e,n);const nd=d+E.len*(E.road.type==='ped'?1.5:1);if(nd<dist[o]){dist[o]=nd;prev[o]=n;push([nd,o]);}}}
  const path=[];let c=t;while(c>=0&&path.length<4000){path.push(c);if(c===s)break;c=prev[c];}return path.reverse();}

// ===================== FUSSGÄNGER-KI =====================
function pedOffset(p,e){const r=EDGES[e].road;if(r.type==='ped'||r.type==='path')return r.type==='path'?(p.side*Math.min(0.5,r.w/4)):(p.pedOff??0);if(r.bridge)return p.side*8.2;return p.side*(r.w/2+r.sw*0.55);}
function pedEnterEdge(p,e,from){p.e=e;p.from=from;const L=EDGES[e].len;p.wps=[laneAt(e,from,Math.min(3,L/3),pedOffset(p,e)),laneAt(e,from,L-Math.min(3,L/3),pedOffset(p,e))];}
function pedNext(p){const to=edgeOther(p.e,p.from);const opts=NODES[to].e.filter(x=>x!==p.e);const e=opts.length?mpick(opts):p.e;if(Math.random()<0.15)p.side*=-1;if(EDGES[e].road.type==='ped')p.pedOff=mr(-EDGES[e].road.w/2+1,EDGES[e].road.w/2-1);pedEnterEdge(p,e,to);}
function moveHuman(h,dx,dz,speed,dt){const L=Math.hypot(dx,dz);if(L<1e-4)return 0;const vx=dx/L*speed,vz=dz/L*speed;const nx=h.x+vx*dt,nz=h.z+vz*dt;const r=0.32;
  const bl=h.room?h.room.blocked:(h.swimmer?swimBlocked:blocked),y=h.y;const ok=(x,z)=>!bl(x+r,z,y)&&!bl(x-r,z,y)&&!bl(x,z+r,y)&&!bl(x,z-r,y);
  let moved=0;if(ok(nx,nz)){h.x=nx;h.z=nz;moved=speed;}else if(ok(nx,h.z)){h.x=nx;moved=Math.abs(vx);}else if(ok(h.x,nz)){h.z=nz;moved=Math.abs(vz);}
  return moved;}
function faceTo(h,dx,dz,dt,rate=10){const t=Math.atan2(dx,dz);h.facing+=angDiff(h.facing,t)*Math.min(1,dt*rate);}
function pedFlee(p,fx,fz,t=8){if(!p.alive||p.kind==='cop')return;p.state='flee';p.fleeT=t*mr(0.8,1.3);p.threat=[fx,fz];p.fleeAng=Math.atan2(p.x-fx,p.z-fz);}
function updatePed(p,dt){
  if(p.state==='walk'){if(!p.wps)return;let wp=p.wps[0];if(Math.hypot(wp[0]-p.x,wp[1]-p.z)<1.2){p.wps.shift();if(!p.wps.length)pedNext(p);wp=p.wps[0];}
    const dx=wp[0]-p.x,dz=wp[1]-p.z;const mv=moveHuman(p,dx,dz,p.walkSpeed,dt);faceTo(p,dx,dz,dt,6);p.animate(dt,mv);
    if(mv<0.05){p.blockT=(p.blockT||0)+dt;if(p.blockT>2){p.blockT=0;pedNext(p);}}else p.blockT=0;}
  else if(p.state==='flee'){p.fleeT-=dt;let a=p.fleeAng;const sp=4.6;const fx=Math.sin(a),fz=Math.cos(a);
    if(blocked(p.x+fx*1.5,p.z+fz*1.5)){p.fleeAng+=(Math.random()<0.5?1:-1)*mr(0.6,1.4);}
    const mv=moveHuman(p,fx,fz,sp,dt);faceTo(p,fx,fz,dt,8);p.animate(dt,mv);
    if(p.fleeT<=0){const n=nearestNode(p.x,p.z,false);if(n>=0&&NODES[n].e.length){p.state='walk';pedEnterEdge(p,mpick(NODES[n].e),n);p.wps.unshift([NODES[n].x,NODES[n].z]);}}}
  else if(p.state==='knock'||p.state==='dying'){p.vy-=18*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.g.rotation.x-=dt*6;const gy=groundY(p.x,p.z);if(blocked(p.x,p.z)){p.x-=p.vx*dt;p.z-=p.vz*dt;p.vx*=-0.3;p.vz*=-0.3;}
    if(p.y<=gy+0.14&&p.vy<0){p.y=gy;p.vx=p.vz=0;p.lie();if(p.health<=0){p.state='dead';p.timer=40;}else{p.state='down';p.timer=2.2;}}}
  else if(p.state==='down'){p.timer-=dt;if(p.timer<=0){p.stand();p.y=groundY(p.x,p.z);if(p.kind==='cop')p.state='cop';else pedFlee(p,p.x+mr(-1,1),p.z+mr(-1,1),6);}}
  else if(p.state==='dead'){p.timer-=dt;}
  if(p.state!=='knock'&&p.state!=='dying'&&p.state!=='dead'&&p.state!=='down')p.y=groundY(p.x,p.z,p.y);
  p.sync();}
function knockHuman(h,vx,vz,vy,dmg,byPlayer=true){if(!h.alive||h.state==='dead')return;h.health-=dmg;h.vx=vx;h.vz=vz;h.vy=vy;h.state='knock';h.aiming=false;
  if(h.health<=0){h.alive=false;onHumanKilled(h,byPlayer);}}
