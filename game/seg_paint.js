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
function paintWorld(g,px,mapMode=false,view=null){
  const P={};for(const k in PATC)P[k]=g.createPattern(PATC[k],'repeat');
  const vis=bb=>!view||!(bb[2]<view[0]||bb[0]>view[2]||bb[3]<view[1]||bb[1]>view[3]);
  g.lineJoin='round';g.lineCap='round';
  g.fillStyle=P.base;g.fillRect(MINX,MINZ,WW,WH);
  for(const a of AREAS){if(!a.bb)a.bb=bboxOf(a.poly);if(!vis(a.bb))continue;const k=a.kind;
    g.fillStyle=k==='square'?P.plaza:k==='parking'?P.asph:(k==='rail'||k==='construction'||k==='playground')?P.gravel:k==='flowerbed'?'#5b4a36':P.grass;pathPoly(g,a.poly);g.fill();}
  for(const r of RAILS){if(!r.bb)r.bb=bboxOf(r.pts,4);if(!vis(r.bb)||r.tram)continue;g.strokeStyle=P.gravel;strokePts(g,r.pts,3.4);}
  const all=ROADS.filter(r=>!r.bridge);for(const r of all)if(!r.bb)r.bb=bboxOf(r.pts,r.w/2+r.sw+2);
  const order=['path','ped','street','main'];
  for(const t of order){const list=all.filter(r=>r.type===t&&vis(r.bb));
    g.strokeStyle=P.side;for(const r of list)if(r.sw>0)strokePts(g,r.pts,r.w+2*r.sw);
    g.strokeStyle='rgba(90,88,84,1)';for(const r of list)if(r.sw>0)strokePts(g,r.pts,r.w+0.6);
    for(const r of list){const k=r.surfK||roadSurf(r);g.strokeStyle=k==='cob'?P.cobble:k==='slab'?P.plaza:k==='gravel'?P.gravel:P.asph;strokePts(g,r.pts,r.w);}}
  for(const r of RAILS){if(!vis(r.bb))continue;g.strokeStyle=r.tram?'rgba(60,58,56,0.9)':'#6d6760';const lw=Math.max(0.15,1/px);for(const o of [-0.72,0.72])strokePts(g,offsetPts(r.pts,o),lw);}
  if(mapMode){g.strokeStyle='rgba(255,255,255,0.0)';}
}
function strokeRoad(g,r,w){strokePts(g,r.pts,w);}
const GROUND_TILES=[];
const GROUND={tiles:new Map(),far:null,TZ:512,t:0};
function groundTileMesh(tx,ty){const S=Q.tileRes,TZ=GROUND.TZ;
  const c=document.createElement('canvas');c.width=S;c.height=S;const g=c.getContext('2d');const sc=S/TZ,ox=MINX+tx*TZ,oz=MINZ+ty*TZ;
  g.setTransform(sc,0,0,sc,-ox*sc,-oz*sc);paintWorld(g,sc,false,[ox-10,oz-10,ox+TZ+10,oz+TZ+10]);
  {const ac=document.createElement('canvas');ac.width=S;ac.height=S;const ag=ac.getContext('2d');ag.setTransform(sc,0,0,sc,-ox*sc,-oz*sc);ag.fillStyle='#000';
    ag.strokeStyle='#000';ag.lineWidth=2.5;ag.lineJoin='round';for(const b of BUILDINGS){if(b.x<ox-90||b.x>ox+TZ+90||b.z<oz-90||b.z>oz+TZ+90||b.mh>3)continue;pathPoly(ag,b.poly);ag.fill();ag.stroke();}
    g.setTransform(1,0,0,1,0,0);g.globalAlpha=0.5;g.filter=`blur(${Math.max(2,3*sc)}px)`;g.drawImage(ac,0,0);g.filter='none';g.globalAlpha=1;ac.width=1;ac.height=1;}
  g.setTransform(1,0,0,1,0,0);for(let y=0;y<S;y+=256)for(let x=0;x<S;x+=256)g.drawImage(FINE,x,y);
  g.setTransform(sc,0,0,sc,-ox*sc,-oz*sc);g.globalCompositeOperation='destination-out';waterPath(g);g.fill('evenodd');g.globalCompositeOperation='source-over';
  const t=freeAfterUpload(texFromCanvas(c,false));t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(TZ,TZ).rotateX(-Math.PI/2),groundDetail(stdMat({map:t,roughness:0.95,alphaTest:0.5})));
  m.position.set(ox+TZ/2,0,oz+TZ/2);m.receiveShadow=true;scene.add(m);return m;}
// Bodenkacheln in Spielernähe nachladen, entfernte freigeben
function updateGround(px,pz,force=false,maxN=1,pts=null){pts=pts||[[px,pz]];GROUND.t-=1;if(GROUND.t>0&&!force)return;GROUND.t=10;const TZ=GROUND.TZ,R=750;const nx=Math.ceil(WW/TZ),ny=Math.ceil(WH/TZ);
  const want=[];for(let ty=0;ty<ny;ty++)for(let tx=0;tx<nx;tx++){const cx=MINX+(tx+0.5)*TZ,cz=MINZ+(ty+0.5)*TZ;let dd=1e9;for(const q of pts)dd=Math.min(dd,Math.hypot(cx-q[0],cz-q[1]));const d=Math.max(0,dd-TZ*0.7);want.push([d,tx,ty]);}
  want.sort((a,b)=>a[0]-b[0]);let n=0;
  for(const [d,tx,ty] of want){const k=tx+','+ty;const has=GROUND.tiles.get(k);
    if(d<R&&!has){if(n<maxN){GROUND.tiles.set(k,groundTileMesh(tx,ty));n++;}else GROUND.t=0;}
    else if(d>R+350&&has){scene.remove(has);has.geometry.dispose();has.material.map.dispose();has.material.dispose();GROUND.tiles.delete(k);}}}
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
