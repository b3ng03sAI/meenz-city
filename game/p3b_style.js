// ===================== FIGUREN-STYLING: Stoffe, Frisuren, Accessoires, Statur =====================
// Körperformen als Rotationsprofile (Taille, Brust, Unterarme, Knie, Knöchel)
// Körperteile als „Loft“ aus abgerundeten Rechteck-Querschnitten (Superellipse): kantiger und menschlicher als Kugeln/Kapseln
function loftGeo(L,seg=16,pw=2.7){const pos=[],uv=[],ind=[];const y0=L[0][0],y1=L[L.length-1][0];
  for(let k=0;k<L.length;k++){const [y,rx,rz,cz=0,cx=0]=L[k];for(let i=0;i<=seg;i++){const a=i/seg*TAU;const c=Math.cos(a),s=Math.sin(a);const x=Math.sign(s)*Math.pow(Math.abs(s),2/pw)*rx+cx,z=Math.sign(c)*Math.pow(Math.abs(c),2/pw)*rz+cz;pos.push(x,y,z);uv.push(i/seg,(y-y0)/((y1-y0)||1));}}
  for(let k=0;k<L.length-1;k++)for(let i=0;i<seg;i++){const a=k*(seg+1)+i,b=a+seg+1;ind.push(a,b,a+1,a+1,b,b+1);}
  for(const [k,dir] of [[0,-1],[L.length-1,1]]){const ci=pos.length/3;pos.push(L[k][4]||0,L[k][0],L[k][3]||0);uv.push(0.5,k?1:0);for(let i=0;i<seg;i++){const a=k*(seg+1)+i;if(dir>0)ind.push(a,ci,a+1);else ind.push(a,a+1,ci);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return g;}
const BODY={
  torsoM:loftGeo([[-0.28,0.148,0.094],[-0.2,0.152,0.098],[-0.08,0.146,0.094],[0.04,0.16,0.1],[0.14,0.19,0.108,0.004],[0.21,0.205,0.104],[0.26,0.19,0.09],[0.29,0.12,0.07],[0.305,0.055,0.05]]),
  torsoF:loftGeo([[-0.28,0.168,0.104],[-0.2,0.162,0.1],[-0.07,0.128,0.086],[0.03,0.138,0.09],[0.1,0.152,0.112,0.012],[0.16,0.158,0.118,0.016],[0.21,0.162,0.096],[0.26,0.158,0.084],[0.29,0.1,0.064],[0.305,0.05,0.046]]),
  armM:loftGeo([[0.045,0.04,0.04],[0.0,0.058,0.054],[-0.12,0.055,0.05],[-0.27,0.046,0.044],[-0.31,0.049,0.046],[-0.44,0.043,0.037],[-0.56,0.034,0.026],[-0.6,0.03,0.022]],12),
  armF:loftGeo([[0.04,0.034,0.034],[0.0,0.048,0.046],[-0.12,0.045,0.043],[-0.27,0.038,0.037],[-0.31,0.04,0.039],[-0.44,0.035,0.031],[-0.56,0.028,0.022],[-0.6,0.025,0.019]],12),
  legM:loftGeo([[0.06,0.07,0.068],[0.0,0.094,0.088],[-0.16,0.085,0.082],[-0.38,0.062,0.06],[-0.46,0.058,0.058,-0.004],[-0.57,0.062,0.066,-0.012],[-0.76,0.043,0.044],[-0.88,0.037,0.04]],12),
  legF:loftGeo([[0.06,0.074,0.07],[0.0,0.092,0.086],[-0.16,0.08,0.076],[-0.38,0.055,0.054],[-0.46,0.052,0.052,-0.004],[-0.57,0.056,0.06,-0.012],[-0.76,0.037,0.038],[-0.88,0.032,0.035]],12),
  hand:loftGeo([[0.02,0.03,0.018],[-0.02,0.038,0.02],[-0.07,0.036,0.016],[-0.1,0.026,0.012]],8),
  jawM:new THREE.BoxGeometry(0.15,0.06,0.13),cane:new THREE.CylinderGeometry(0.012,0.012,0.9,6),caneTop:new THREE.TorusGeometry(0.04,0.012,6,10,Math.PI)};
BODY.pelvisM=loftGeo([[-0.13,0.12,0.08],[-0.06,0.158,0.098],[0.05,0.162,0.1],[0.15,0.152,0.095],[0.2,0.135,0.087]]);BODY.pelvisF=loftGeo([[-0.13,0.13,0.085],[-0.06,0.178,0.104],[0.05,0.18,0.105],[0.15,0.165,0.1],[0.2,0.14,0.09]]);
HGEO.pelvis=BODY.pelvisM;HGEO.torso=BODY.torsoM;HGEO.arm=BODY.armM;HGEO.leg=BODY.legM;HGEO.hand=BODY.hand;
const FACE_TEX=(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,256,128);
  const cx=64,ey=56;// Gesicht bei u=0.25
  const blob=(x,y,rx,ry,col)=>{const gr=g.createRadialGradient(x,y,0,x,y,Math.max(rx,ry));gr.addColorStop(0,col);gr.addColorStop(1,'rgba(255,255,255,0)');g.save();g.translate(x,y);g.scale(rx/Math.max(rx,ry),ry/Math.max(rx,ry));g.translate(-x,-y);g.fillStyle=gr;g.beginPath();g.arc(x,y,Math.max(rx,ry),0,6.28);g.fill();g.restore();};
  for(const s of [-1,1]){blob(cx+s*9,ey,9,6,'rgba(150,110,100,0.45)');blob(cx+s*12,ey+16,10,7,'rgba(230,120,110,0.25)');g.strokeStyle='rgba(70,45,35,0.75)';g.lineWidth=2.5;g.beginPath();g.moveTo(cx+s*4,ey-9);g.quadraticCurveTo(cx+s*9,ey-12,cx+s*15,ey-9);g.stroke();}
  blob(cx,ey+12,4,9,'rgba(160,110,100,0.35)');g.fillStyle='rgba(170,70,70,0.55)';g.beginPath();g.ellipse(cx,ey+25,7,2.6,0,0,6.28);g.fill();blob(cx,ey+34,10,5,'rgba(170,140,130,0.25)');
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const FACE_MAT=new Map();function faceMat(skin){if(!FACE_MAT.has(skin))FACE_MAT.set(skin,new THREE.MeshStandardMaterial({color:skin,map:FACE_TEX,roughness:0.72}));return FACE_MAT.get(skin);}
const EAR_G=new THREE.SphereGeometry(0.03,8,6).scale(0.5,1,0.8);
const CLOTH_TEX={};
function clothTex(kind){if(CLOTH_TEX[kind])return CLOTH_TEX[kind];const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');const R=mulberry32(kind.length*97+7);
  g.fillStyle='#ffffff';g.fillRect(0,0,256,256);
  // Grundgewebe
  for(let i=0;i<9000;i++){const v=200+Math.floor(R()*55);g.fillStyle=`rgba(${v},${v},${v},0.35)`;g.fillRect(R()*256,R()*256,1+R()*2,1);}
  const line=(x0,y0,x1,y1,w,col)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();};
  if(kind==='stripes'){for(let y=0;y<256;y+=22){g.fillStyle='rgba(40,40,60,0.55)';g.fillRect(0,y,256,9);}}
  else if(kind==='plaid'){for(let i=0;i<256;i+=32){g.fillStyle='rgba(30,30,30,0.28)';g.fillRect(i,0,12,256);g.fillRect(0,i,256,12);g.fillStyle='rgba(255,255,255,0.25)';g.fillRect(i+20,0,3,256);g.fillRect(0,i+20,256,3);}}
  else if(kind==='hoodie'){line(128,40,128,256,3,'rgba(60,60,60,0.5)');g.fillStyle='rgba(0,0,0,0.12)';g.fillRect(80,150,96,46);line(80,150,176,150,2,'rgba(0,0,0,0.3)');for(const x of [118,138]){line(x,40,x-2,95,2.5,'rgba(240,240,240,0.9)');}}
  else if(kind==='jacket'){line(128,30,128,256,4,'rgba(30,30,30,0.6)');for(let y=60;y<240;y+=40){g.fillStyle='rgba(40,40,40,0.7)';g.beginPath();g.arc(140,y,4,0,6.28);g.fill();}g.fillStyle='rgba(0,0,0,0.15)';g.fillRect(40,170,60,34);g.fillRect(156,170,60,34);line(100,30,128,90,5,'rgba(0,0,0,0.25)');line(156,30,128,90,5,'rgba(0,0,0,0.25)');}
  else if(kind==='shirt'){line(128,30,128,256,2,'rgba(0,0,0,0.25)');for(let y=50;y<240;y+=30){g.fillStyle='rgba(250,250,250,0.95)';g.beginPath();g.arc(128,y,3,0,6.28);g.fill();}g.fillStyle='rgba(255,255,255,0.6)';g.beginPath();g.moveTo(100,20);g.lineTo(128,60);g.lineTo(156,20);g.fill();}
  else if(kind==='print'){g.fillStyle='rgba(30,30,30,0.6)';g.font='bold 38px sans-serif';g.textAlign='center';g.fillText(mpick(['MEENZ','HELAU','05','WOI','1907']),128,140);}
  else if(kind==='denim'){g.fillStyle='#ffffff';for(let i=0;i<14000;i++){const v=170+Math.floor(R()*85);g.fillStyle=`rgba(${v},${v},${v},0.5)`;g.fillRect(R()*256,R()*256,1,3);}line(128,0,128,256,2,'rgba(200,160,60,0.8)');line(64,0,64,256,1.5,'rgba(200,160,60,0.6)');line(192,0,192,256,1.5,'rgba(200,160,60,0.6)');}
  // Falten
  for(let i=0;i<10;i++){const y=R()*256;g.strokeStyle='rgba(0,0,0,0.06)';g.lineWidth=6;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(80,y+R()*20-10,170,y+R()*20-10,256,y);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return CLOTH_TEX[kind]=t;}
const CLOTH_MAT=new Map();
function clothMat(col,kind,r=0.88){const k=col+'|'+kind;if(!CLOTH_MAT.has(k))CLOTH_MAT.set(k,new THREE.MeshStandardMaterial({color:col,map:clothTex(kind),roughness:r}));return CLOTH_MAT.get(k);}
const SG={shoulder:new THREE.SphereGeometry(0.078,10,8),shoe:new THREE.CapsuleGeometry(0.055,0.15,4,8).rotateX(Math.PI/2).scale(1.05,0.75,1),sole:new THREE.BoxGeometry(0.12,0.025,0.27),
  hairLong:new THREE.CapsuleGeometry(0.11,0.22,4,10).scale(1.05,1,0.55),bun:new THREE.SphereGeometry(0.065,10,8),pony:new THREE.CapsuleGeometry(0.035,0.2,4,6),curl:new THREE.SphereGeometry(0.05,8,6),
  beanie:new THREE.SphereGeometry(0.14,14,8,0,TAU,0,Math.PI*0.5),bobble:new THREE.SphereGeometry(0.035,8,6),capTop:new THREE.SphereGeometry(0.135,14,8,0,TAU,0,Math.PI*0.45),visor:new THREE.CylinderGeometry(0.11,0.11,0.015,14,1,false,-Math.PI*0.45,Math.PI*0.9),
  beard:new THREE.SphereGeometry(0.115,12,8,0,TAU,Math.PI*0.55,Math.PI*0.4),skirt:new THREE.CylinderGeometry(0.17,0.29,0.5,14,1,true),backpack:new THREE.CapsuleGeometry(0.12,0.16,4,8).scale(1.15,1,0.6),bag:new THREE.BoxGeometry(0.22,0.18,0.08),strap:new THREE.BoxGeometry(0.03,0.42,0.02),
  glass:new THREE.TorusGeometry(0.026,0.0045,6,14),bridge:new THREE.BoxGeometry(0.03,0.006,0.006)};
const HAIR_STYLES=['short','short','long','bun','pony','curly','bald','beanie','cap','long'];
function styleHuman(h,o){const R=Math.random;const hips=h.hips;const cop=o.cop,pl=o.pl;
  const sex=pl?'m':cop?(R()<0.3?'f':'m'):(R()<0.5?'f':'m');const ar=R();const age=pl||cop?'adult':ar<0.11?'kid':ar<0.19?'teen':ar<0.8?'adult':'senior';h.sex=sex;h.age=age;const fem=sex==='f';
  h.walkK=age==='senior'?0.62:age==='kid'?1.12:1;
  // Kleidungsstoffe
  const topKind=pl?'jacket':cop?'shirt':mpick(['tee','tee','hoodie','jacket','stripes','plaid','shirt','print']);const legKind=cop?'tee':([0x2f4766,0x1f2e45,0x3a3a40].includes(o.pants)||pl)?'denim':'tee';
  h.g.traverse(m=>{if(!m.geometry)return;const G=m.geometry;if(G===HGEO.torso||G===HGEO.arm)m.material=clothMat(o.shirt,topKind);else if(G===HGEO.pelvis||G===HGEO.leg)m.material=clothMat(o.pants,legKind,0.92);});
  if(fem){h.g.traverse(m=>{if(m.geometry===BODY.torsoM)m.geometry=BODY.torsoF;else if(m.geometry===BODY.armM)m.geometry=BODY.armF;else if(m.geometry===BODY.legM)m.geometry=BODY.legF;else if(m.geometry===BODY.pelvisM)m.geometry=BODY.pelvisF;});h.armL.position.x=0.232;h.armR.position.x=-0.232;h.legL.position.x=0.095;h.legR.position.x=-0.095;}
  // Gesicht & Ohren
  if(h.head){h.head.material=faceMat(o.skin);for(const sx of [-1,1]){const e=new THREE.Mesh(EAR_G,cmat(o.skin,0.6));e.position.set(sx*0.118,0.79,-0.005);hips.add(e);}}
  // Schultern
  for(const s of [-1,1]){const m=new THREE.Mesh(SG.shoulder,clothMat(o.shirt,topKind));m.position.set(s*(fem?0.212:0.245),0.6,0);m.scale.set(fem?0.6:0.72,fem?0.55:0.62,fem?0.62:0.72);m.castShadow=true;hips.add(m);}
  // Schuhe
  const shoeCol=cop?0x0d0d0d:mpick([0x1c1c1c,0x3a2a1a,0xf2f2f2,0x6b4a2a,0x1f3a5a,0xb02a2a]);for(const l of [h.legL,h.legR]){l.traverse(m=>{if(m.geometry===HGEO.shoe){m.geometry=SG.shoe;m.material=cmat(shoeCol,0.55);m.position.set(0,-0.88,0.05);}});
    if(!cop&&R()<0.6){const s=new THREE.Mesh(SG.sole,cmat(0xf4f4f0,0.7));s.position.set(0,-0.925,0.05);l.add(s);}}
  if(cop)return;
  // Statur
  let hgt,wid;if(pl){hgt=1;wid=1;}else if(age==='kid'){hgt=0.56+R()*0.16;wid=hgt*(0.95+R()*0.1);}else if(age==='teen'){hgt=0.85+R()*0.08;wid=0.84+R()*0.1;}else if(age==='senior'){hgt=(fem?0.89:0.93)+R()*0.07;wid=0.95+R()*0.22;}else{hgt=(fem?0.9:0.96)+R()*0.1;wid=(fem?0.88:0.94)+R()*0.22;}h.g.scale.set(wid,hgt,wid*0.98);h.bodyScale=hgt;h.baseScale=[wid,hgt,wid*0.98];
  // Frisur
  if(age==='senior'&&h.hairCol!==undefined){h.hairCol=mpick([0xbdbdbd,0xd9d9d6,0x8f8f8f,0xeeeeea,0xa8a29a]);}
  const pool=pl?['short']:age==='kid'?(fem?['pony','long','long','bun','curly']:['short','short','cap','curly']):fem?['long','long','bun','pony','curly','short','long','bun']:age==='senior'?['bald','bald','short','short','cap','beanie']:['short','short','short','bald','curly','beanie','cap','short'];
  const style=mpick(pool);const hc=h.hairCol||0x2b1e16;const hm=cmat(hc,0.9);const hairMesh=hips.children.find(m=>m.geometry===HGEO.hair);if(hairMesh&&age==='senior')hairMesh.material=hm;
  const addH=(geo,mat,x,y,z,sx=1,sy=1,sz=1,rx=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.x=rx;m.castShadow=true;hips.add(m);return m;};
  if(style==='bald'&&hairMesh)hairMesh.visible=false;
  if(style==='long')addH(SG.hairLong,hm,0,0.72,-0.07);
  if(style==='bun')addH(SG.bun,hm,0,0.93,-0.07);
  if(style==='pony')addH(SG.pony,hm,0,0.74,-0.14,1,1,1,0.35);
  if(style==='curly'){for(let i=0;i<9;i++){const a=i/9*TAU;addH(SG.curl,hm,Math.cos(a)*0.1,0.86+Math.sin(i*1.7)*0.03,Math.sin(a)*0.1-0.01);}}
  if(style==='beanie'){if(hairMesh)hairMesh.visible=false;const bc=mpick([0xb02a2a,0x2a4a8a,0x222222,0xe0a030,0x3f7a4a]);addH(SG.beanie,cmat(bc,0.95),0,0.82,-0.01,1,1.08,1);addH(SG.bobble,cmat(0xf2f2f2,0.95),0,0.97,-0.01);}
  if(style==='cap'){if(hairMesh)hairMesh.visible=false;const cc=mpick([0x1a1a1a,0xc8102e,0x2a4a8a,0xf2f2f2,0x3f6a3a]);addH(SG.capTop,cmat(cc,0.7),0,0.83,-0.01,1,0.95,1);const v=addH(SG.visor,cmat(cc,0.7),0,0.85,0.06);v.rotation.y=Math.PI;}
  // Bart
  if(!fem&&(age==='adult'||age==='senior')&&(style==='short'||style==='bald'||style==='cap'||style==='beanie')&&R()<(age==='senior'?0.45:0.3)){const b=addH(SG.beard,hm,0,0.79,0.012,0.98,1.05,1.02);}
  // Rock / Kleid
  if(fem&&R()<(age==='senior'?0.7:0.5)){const sc=mpick([0x2a2a3a,0x8a2a3a,0x3a5a8a,0xd8b070,0x6a3a6a,0x2f6b4a]);const sk=addH(SG.skirt,clothMat(sc,'skirt'),0,-0.2,0);sk.material.side=THREE.DoubleSide;
    for(const l of [h.legL,h.legR])l.traverse(m=>{if(m.geometry===BODY.legF||m.geometry===BODY.legM)m.material=age==='senior'?cmat(0x8a7a6a,0.8):cmat(o.skin,0.66);});hips.children.forEach(m=>{if(m.geometry===HGEO.pelvis)m.material=clothMat(sc,'tee');});}
  // Accessoires
  const r=age==='kid'?R()*0.15:R();if(r<0.15){const bp=addH(SG.backpack,cmat(mpick([0x2a2a2a,0x8a2a2a,0x2a5a8a,0x5a6a3a,0xd08a20]),0.8),0,0.36,-0.2);for(const s of [-1,1])addH(SG.strap,cmat(0x1a1a1a,0.8),s*0.1,0.42,0.13);}
  else if(r<0.28){const bag=new THREE.Mesh(SG.bag,cmat(mpick([0x6b3a1a,0x1a1a1a,0xc8a070,0x8a1a2a]),0.6));bag.position.set(0.04,-0.66,0.02);bag.castShadow=true;h.armL.add(bag);}
  if(age==='senior'&&R()<0.38){const cm=cmat(0x4a3220,0.6);const c=new THREE.Mesh(BODY.cane,cm);c.position.set(0,-1.05,0.05);c.castShadow=true;const t=new THREE.Mesh(BODY.caneTop,cm);t.position.set(0.04,-0.6,0.05);t.rotation.y=Math.PI/2;h.armR.add(c);h.armR.add(t);h.cane=c;}
  if(age==='kid'||age==='teen'){const k=age==='kid'?1.22:1.06;const N=0.66;for(const m of (Array.isArray(hips.children)?hips.children:[])){if(m===h.face){m.position.set(0,N*(1-k),0);m.scale.setScalar(k);continue;}if(m.position.y>0.64){m.position.y=N+(m.position.y-N)*k;m.position.x*=k;m.position.z*=k;m.scale.multiplyScalar(k);}}}
  if(age!=='kid'&&R()<(age==='senior'?0.45:0.14)){const gm=cmat(0x111111,0.3);for(const s of [-1,1]){const m=new THREE.Mesh(SG.glass,gm);m.position.set(s*0.043,0.808,0.131);hips.add(m);}const b=new THREE.Mesh(SG.bridge,gm);b.position.set(0,0.81,0.133);hips.add(b);}}
