function patCanvas(n,draw){const c=document.createElement('canvas');c.width=n;c.height=n;const g=c.getContext('2d');draw(g,n);return c;}
function noisePat(n,base,amp){return patCanvas(n,(g)=>{const id=g.createImageData(n,n);const [r,gg,b]=base;for(let i=0;i<n*n;i++){const v=(Math.random()-0.5)*amp;id.data[i*4]=r+v;id.data[i*4+1]=gg+v;id.data[i*4+2]=b+v;id.data[i*4+3]=255;}g.putImageData(id,0,0);});}
const PATC={
  base:noisePat(16,[134,129,120],14), grass:noisePat(16,[88,118,58],22), asph:noisePat(16,[56,57,61],8),
  cobble:patCanvas(8,g=>{for(let y=0;y<8;y++)for(let x=0;x<8;x++){const v=118+Math.random()*22|0;g.fillStyle=`rgb(${v},${v-8},${v-16})`;g.fillRect(x,y,1,1);}}),
  plaza:patCanvas(4,g=>{g.fillStyle='#a9a092';g.fillRect(0,0,4,4);g.fillStyle='#958c7e';g.fillRect(0,0,4,0.5);g.fillRect(0,0,0.5,4);}),
  side:patCanvas(2,g=>{g.fillStyle='#9a968e';g.fillRect(0,0,2,2);g.fillStyle='#8a867e';g.fillRect(0,0,2,0.25);g.fillRect(0,0,0.25,2);}),
  prom:noisePat(16,[181,170,148],16), gravel:noisePat(16,[110,101,92],26),
};
const FINE=(()=>{const n=256;const c=document.createElement('canvas');c.width=n;c.height=n;const g=c.getContext('2d');const id=g.createImageData(n,n);for(let i=0;i<n*n;i++){const v=Math.random()<0.5?0:255;id.data[i*4]=v;id.data[i*4+1]=v;id.data[i*4+2]=v;id.data[i*4+3]=Math.random()*18;}g.putImageData(id,0,0);return c;})();
// Weltfeste Bodendetails (Körnung + Flecken), blendet mit der Entfernung aus
const GROUND_DETAIL=(()=>{const n=512;const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');const id=g.createImageData(n,n);const R=mulberry32(4242);
  const oct=(w)=>{const s=w,grid=[];for(let i=0;i<=s;i++){grid.push([]);for(let j=0;j<=s;j++)grid[i].push(R());}for(let j=0;j<=s;j++)grid[s][j]=grid[0][j];for(let i=0;i<=s;i++)grid[i][s]=grid[i][0];
    return (x,y)=>{const fx=x/n*s,fy=y/n*s,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;const a=grid[ix][iy],b=grid[ix+1][iy],c2=grid[ix][iy+1],d=grid[ix+1][iy+1];const sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);return (a*(1-sx)+b*sx)*(1-sy)+(c2*(1-sx)+d*sx)*sy;};};
  const o1=oct(64),o2=oct(128),o3=oct(16),o4=oct(8);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4;const grain=o1(x,y)*0.35+o2(x,y)*0.35+R()*0.3;const blot=o3(x,y)*0.6+o4(x,y)*0.4;id.data[i]=grain*255;id.data[i+1]=blot*255;
    // Pflaster: 4x4-m-Kachel, Steine 0,5 x 1 m im Läuferverband
    const u=x/n*4,v=y/n*8;const row=Math.floor(v);const uu=u+(row%2)*0.5;const fu=uu-Math.floor(uu),fv=v-row;const joint=Math.min(fu,1-fu)*2<0.06||Math.min(fv,1-fv)<0.05;const stone=0.86+((Math.floor(uu)*7+row*13)%5)*0.035;id.data[i+2]=(joint?0.5:stone)*255;id.data[i+3]=255;}
  g.putImageData(id,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;t.anisotropy=4;return t;})();
function groundDetail(mat){mat.onBeforeCompile=(sh)=>{sh.uniforms.gDetail={value:GROUND_DETAIL};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vGWXZ;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGWXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vGWXZ;uniform sampler2D gDetail;').replace('#include <map_fragment>','#include <map_fragment>\n{float gd=length(vGWXZ-cameraPosition.xz);float near=1.0-smoothstep(30.0,220.0,gd);vec4 d1=texture2D(gDetail,vGWXZ*0.35);vec4 d2=texture2D(gDetail,vGWXZ*0.021);vec4 d3=texture2D(gDetail,vGWXZ*0.25);float g1=mix(1.0,0.82+d1.r*0.34,near);float g2=0.86+d2.g*0.24;float gsat=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))-min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));float g3=mix(1.0,d3.b*1.08,near*0.85*(1.0-smoothstep(0.05,0.14,gsat)));diffuseColor.rgb*=g1*g2*g3;}');};
  mat.customProgramCacheKey=()=>'gdetail';return mat;}
function bboxOf(pts,m=0){let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const p of pts){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1];}return [x0-m,z0-m,x1+m,z1+m];}
// part: 1 = Grund, Flächen, Gleisbett; 2 = Straßen, Schienen; ohne = alles (Bodenkacheln malen in zwei Paketschritten)
function paintWorld(g,px,mapMode=false,view=null,part=0){
  const P={};for(const k in PATC)P[k]=g.createPattern(PATC[k],'repeat');
  const vis=bb=>!view||!(bb[2]<view[0]||bb[0]>view[2]||bb[3]<view[1]||bb[1]>view[3]);
  g.lineJoin='round';g.lineCap='round';
  if(part!==2){
  g.fillStyle=P.base;g.fillRect(MINX,MINZ,WW,WH);
  for(const a of AREAS){if(!a.bb)a.bb=bboxOf(a.poly);if(!vis(a.bb))continue;const k=a.kind;
    g.fillStyle=k==='square'?P.plaza:k==='parking'?P.asph:(k==='rail'||k==='construction'||k==='playground')?P.gravel:k==='flowerbed'?'#5b4a36':P.grass;pathPoly(g,a.poly);g.fill();}
  for(const r of RAILS){if(!r.bb)r.bb=bboxOf(r.pts,4);if(!vis(r.bb)||r.tram)continue;g.strokeStyle=P.gravel;strokePts(g,r.pts,3.4);}
  if(part===1)return;}
  const all=[];for(const r of ROADS){if(r.bridge)continue;if(!r.bb)r.bb=bboxOf(r.pts,r.w/2+r.sw+2);if(vis(r.bb))all.push(r);}
  const order=['path','ped','street','main'];
  for(const t of order){const list=all.filter(r=>r.type===t);
    g.strokeStyle=P.side;for(const r of list)if(r.sw>0)strokePts(g,r.pts,r.w+2*r.sw);
    g.strokeStyle='rgba(90,88,84,1)';for(const r of list)if(r.sw>0)strokePts(g,r.pts,r.w+0.6);
    for(const r of list){const k=r.surfK||roadSurf(r);g.strokeStyle=k==='cob'?P.cobble:k==='slab'?P.plaza:k==='gravel'?P.gravel:P.asph;strokePts(g,r.pts,r.w);}}
  for(const r of RAILS){if(!vis(r.bb))continue;g.strokeStyle=r.tram?'rgba(60,58,56,0.9)':'#6d6760';const lw=Math.max(0.15,1/px);for(const o of [-0.72,0.72])strokePts(g,offsetPts(r.pts,o),lw);}
  if(mapMode){g.strokeStyle='rgba(255,255,255,0.0)';}
}
function strokeRoad(g,r,w){strokePts(g,r.pts,w);}
// Nahboden in 512-m-Kacheln (gemalte Canvas-Textur). Seit Welle 10 als Paket `gr:<tx>,<ty>` durch das Bild-Budget
// (FRAMEB): Flächen, Straßen, Gebäude-Schatten, Weichzeichner/Feinstruktur/Wasser und Textur-Upload je ein Schritt
// (5 Schritte); die Kachel kommt erst mit
// hochgeladener Textur in die Szene. force (Boot, Schnellreise) baut die Kacheln in Reichweite sofort.
const GROUND={tiles:new Map(),far:null,TZ:512,t:0,R:750,stats:{builds:0,disposes:0,cancels:0,steps:0}};
// Canvas-Befehle werden aufgezeichnet und erst beim Lesen gerastert: 1 Pixel lesen erzwingt das Rastern im eigenen
// Schritt, sonst landet alles im Weichzeichner-Schritt (WebKit: bis 16 ms statt 4–6 ms je Schritt)
function grFlush(g){g.getImageData(0,0,1,1);}
// Bodenkachel-Canvas auf der CPU: Malen kostet im eigenen Schritt, kein Rückleseweg von der GPU
const GR_CPU={willReadFrequently:true},GR_AO_N=250,GR_JUMP_R=200;
function groundTileJob(tx,ty,k){const S=Q.tileRes,TZ=GROUND.TZ,sc=S/TZ,ox=MINX+tx*TZ,oz=MINZ+ty*TZ;let c=null,g=null,ac=null,ag=null,bl=null,bi=0,ph=0;
  const world=gg=>gg.setTransform(sc,0,0,sc,-ox*sc,-oz*sc);
  const step=()=>{GROUND.stats.steps++;
    const view=[ox-10,oz-10,ox+TZ+10,oz+TZ+10];
    if(ph===0){c=document.createElement('canvas');c.width=S;c.height=S;g=c.getContext('2d',GR_CPU);world(g);paintWorld(g,sc,false,view,1);grFlush(g);ph=1;return false;}
    if(ph===1){world(g);paintWorld(g,sc,false,view,2);grFlush(g);ph=2;return false;}
    if(ph===2){// Gebäude-Schatten: höchstens GR_AO_N Gebäude je Schritt (dichte Innenstädte: mehrere Schritte)
      if(!ac){ac=document.createElement('canvas');ac.width=S;ac.height=S;ag=ac.getContext('2d',GR_CPU);world(ag);ag.fillStyle='#000';ag.strokeStyle='#000';ag.lineWidth=2.5;ag.lineJoin='round';
        bl=[];bi=0;for(const b of BUILDINGS){if(b.x<ox-90||b.x>ox+TZ+90||b.z<oz-90||b.z>oz+TZ+90||b.mh>3)continue;bl.push(b);}}
      for(const e=Math.min(bl.length,bi+GR_AO_N);bi<e;bi++){pathPoly(ag,bl[bi].poly);ag.fill();ag.stroke();}
      grFlush(ag);if(bi<bl.length)return false;bl=ag=null;ph=3;return false;}
    if(ph===3){g.setTransform(1,0,0,1,0,0);g.globalAlpha=0.5;g.filter=`blur(${Math.max(2,3*sc)}px)`;g.drawImage(ac,0,0);g.filter='none';g.globalAlpha=1;ac.width=1;ac.height=1;ac=null;
      g.setTransform(1,0,0,1,0,0);for(let y=0;y<S;y+=256)for(let x=0;x<S;x+=256)g.drawImage(FINE,x,y);
      world(g);g.globalCompositeOperation='destination-out';waterPath(g);g.fill('evenodd');g.globalCompositeOperation='source-over';grFlush(g);ph=4;return false;}
    const t=freeAfterUpload(texFromCanvas(c,false));t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;c=g=null;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(TZ,TZ).rotateX(-Math.PI/2),groundDetail(stdMat({map:t,roughness:0.95,alphaTest:0.5})));
    m.position.set(ox+TZ/2,0,oz+TZ/2);m.receiveShadow=true;
    if(!window.__NORENDER&&renderer.initTexture)renderer.initTexture(t);// Upload in diesem Schritt statt im ersten Bild danach
    scene.add(m);GROUND.tiles.set(k,m);GROUND.stats.builds++;return true;};
  step.drop=()=>{if(c){c.width=1;c.height=1;}if(ac){ac.width=1;ac.height=1;}c=g=ac=ag=bl=null;};
  return step;}
// Bodenkacheln in Spielernähe als Pakete anmelden, entfernte freigeben (alle 10 Aufrufe; force: sofort, synchron)
function updateGround(px,pz,force=false,maxN=1,pts=null){pts=pts||[[px,pz]];GROUND.t-=1;if(GROUND.t>0&&!force)return;GROUND.t=10;
  const TZ=GROUND.TZ,R=GROUND.R,nx=Math.ceil(WW/TZ),ny=Math.ceil(WH/TZ);
  const dOf=(tx,ty)=>{const cx=MINX+(tx+0.5)*TZ,cz=MINZ+(ty+0.5)*TZ;let dd=1e9;for(const q of pts)dd=Math.min(dd,Math.hypot(cx-q[0],cz-q[1]));return Math.max(0,dd-TZ*0.7);};
  for(const q of pts){const t0x=Math.max(0,Math.floor((q[0]-R-TZ-MINX)/TZ)),t1x=Math.min(nx-1,Math.floor((q[0]+R+TZ-MINX)/TZ));
    const t0y=Math.max(0,Math.floor((q[1]-R-TZ-MINZ)/TZ)),t1y=Math.min(ny-1,Math.floor((q[1]+R+TZ-MINZ)/TZ));
    for(let ty=t0y;ty<=t1y;ty++)for(let tx=t0x;tx<=t1x;tx++){const k=tx+','+ty;if(GROUND.tiles.has(k)||dOf(tx,ty)>=R)continue;const key='gr:'+k;
      if(!fbHas(key)){const J=fbJob(key,groundTileJob(tx,ty,k),{x:MINX+(tx+0.5)*TZ,z:MINZ+(ty+0.5)*TZ,bias:0});J.gr=[tx,ty];}}}
  // force: beim Laden alles in Reichweite, im Spiel (Schnellreise) nur die Kacheln < GR_JUMP_R um den Zielpunkt – der Rest
  // kommt über das Budget nach (bis dahin zeigt der grobe Fernboden), sonst hängt das erste Bild nach dem Sprung ~150 ms
  if(force){const near=(tx,ty)=>{const x0=MINX+tx*TZ,z0=MINZ+ty*TZ;
      for(const q of pts)if(Math.hypot(Math.max(x0-q[0],0,q[0]-x0-TZ),Math.max(z0-q[1],0,q[1]-z0-TZ))<GR_JUMP_R)return true;return false;};
    fbFlush(J=>J.gr!==undefined&&dOf(J.gr[0],J.gr[1])<R&&(mode==='loading'||near(J.gr[0],J.gr[1])));}
  for(const J of FRAMEB.jobs.values())if(J.gr&&dOf(J.gr[0],J.gr[1])>R+350){J.step.drop();fbCancel(J.key);GROUND.stats.cancels++;}
  for(const [k,has] of GROUND.tiles){const i=k.indexOf(',');if(dOf(+k.slice(0,i),+k.slice(i+1))<=R+350)continue;
    scene.remove(has);has.geometry.dispose();has.material.map.dispose();has.material.dispose();GROUND.tiles.delete(k);GROUND.stats.disposes++;}}
async function buildGround(progress){
  // Grobe Bodenfläche für die ganze Karte (Fernsicht)
  const sc=LOWMEM?Math.min(0.25,2048/Math.max(WW,WH)):0.25;const c=document.createElement('canvas');c.width=Math.ceil(WW*sc);c.height=Math.ceil(WH*sc);const g=c.getContext('2d');
  g.setTransform(sc,0,0,sc,-MINX*sc,-MINZ*sc);paintWorld(g,sc,true);
  g.fillStyle='rgba(40,40,44,0.55)';for(const b of BUILDINGS){if(b.mh>3)continue;pathPoly(g,b.poly);g.fill();}
  g.globalCompositeOperation='destination-out';waterPath(g);g.fill('evenodd');g.globalCompositeOperation='source-over';
  const t=texFromCanvas(c,false);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  const far=new THREE.Mesh(new THREE.PlaneGeometry(WW,WH).rotateX(-Math.PI/2),groundDetail(stdMat({map:t,roughness:0.97,alphaTest:0.5})));freeAfterUpload(t);far.position.set(MINX+WW/2,-0.03,MINZ+WH/2);far.receiveShadow=true;scene.add(far);GROUND.far=far;
  progress&&progress(0.3);await nextFrame();
  updateGround(POI.start[0],POI.start[1],true,99);progress&&progress(1);
}
let OVERVIEW=null;const OV_SC=Math.min(0.35,(QS.lowLOD?1400:LOWMEM?1800:3000)/Math.max(WW,WH));
function buildOverview(){
  const sc=OV_SC;const c=document.createElement('canvas');c.width=Math.ceil(WW*sc);c.height=Math.ceil(WH*sc);const g=c.getContext('2d');
  g.setTransform(sc,0,0,sc,-MINX*sc,-MINZ*sc);paintWorld(g,sc,true);
  g.fillStyle='#3d6f86';waterPath(g);g.fill('evenodd');
  g.strokeStyle='#ccd6dc';g.lineCap='butt';for(const br of BRIDGES)strokePts(g,[br.A,br.B],br.hw*1.7);
  g.fillStyle='#55575d';for(const b of BUILDINGS){if(b.mh>3)continue;g.fillStyle=b.typ===2?'#7b4636':b.H>20?'#4a4c52':'#5a5c61';pathPoly(g,b.poly);g.fill();}
  g.fillStyle='#7b4636';for(const s of SOLIDS){if(s.k==='obb'){pathPoly(g,obbPoly(s.x,s.z,s.w,s.d,s.rot));g.fill();}else if(s.k==='circ'){g.beginPath();g.arc(s.x,s.z,s.r,0,TAU);g.fill();}}
  OVERVIEW=c;
}

// ===================== RHEINUFER, WASSER, BRÜCKE =====================
