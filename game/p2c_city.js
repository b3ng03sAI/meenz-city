// ===================== GEBÄUDE (detailliert, in Kacheln für Culling) =====================
const BUILDINGS=[];const CHUNK=320;const CHUNKS=new Map();const BUS_STOPS=[];let CHUNK_TARGET=CHUNKS;let DET=QS.detail;
function chunkKey(x,z){return Math.floor((x-MINX)/CHUNK)+','+Math.floor((z-MINZ)/CHUNK);}
function chunkOf(x,z){const k=chunkKey(x,z);let c=CHUNK_TARGET.get(k);if(!c){c={};CHUNK_TARGET.set(k,c);}return c;}
function cg(ch,k){return ch[k]||(ch[k]=new GB());}
function shade(c,f){return {r:c.r*f,g:c.g*f,b:c.b*f};}
const SIDE_N=[[0,-1],[1,0],[0,1],[-1,0]];
function ledge(G,P,A,B,n,y0,y1,p,col,uvs=3){const dx=B[0]-A[0],dz=B[1]-A[1],L=Math.hypot(dx,dz)||1,ux=dx/L,uz=dz/L;
  const Ai=[A[0]-ux*p,A[1]-uz*p],Bi=[B[0]+ux*p,B[1]+uz*p],Ao=[Ai[0]+n[0]*p,Ai[1]+n[1]*p],Bo=[Bi[0]+n[0]*p,Bi[1]+n[1]*p];const L2=L+2*p,mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;
  G.quadOut(P(Ao[0],y0,Ao[1]),P(Bo[0],y0,Bo[1]),P(Bo[0],y1,Bo[1]),P(Ao[0],y1,Ao[1]),[0,0],[L2/uvs,0],[L2/uvs,(y1-y0)/uvs],[0,(y1-y0)/uvs],col,P(mx-n[0]*3,(y0+y1)/2,mz-n[1]*3));
  G.quadOut(P(Ai[0],y0,Ai[1]),P(Bi[0],y0,Bi[1]),P(Bo[0],y0,Bo[1]),P(Ao[0],y0,Ao[1]),[0,0],[L2/uvs,0],[L2/uvs,p/uvs],[0,p/uvs],shade(col,0.75),P(mx,y0+3,mz));
  G.quadOut(P(Ai[0],y1,Ai[1]),P(Bi[0],y1,Bi[1]),P(Bo[0],y1,Bo[1]),P(Ao[0],y1,Ao[1]),[0,0],[L2/uvs,0],[L2/uvs,p/uvs],[0,p/uvs],col,P(mx,y1-3,mz));}
function dormer(G,RF,P,b,lx,side,top,rh,tint,rt){
  const hd=b.d/2,dw=1.7,dh=1.45,dd=2.6;const lz0=side*hd*0.45,yr=top+rh*0.55,y0=yr-0.25,y1=yr+dh,lzb=lz0-side*dd;const ref=P(lx,(y0+y1)/2,(lz0+lzb)/2);
  G.quadOut(P(lx-dw/2,y0,lz0),P(lx+dw/2,y0,lz0),P(lx+dw/2,y1,lz0),P(lx-dw/2,y1,lz0),[b.u0+0.06,b.v0+0.05],[b.u0+0.19,b.v0+0.05],[b.u0+0.19,b.v0+0.21],[b.u0+0.06,b.v0+0.21],tint,ref);
  for(const sx of [-1,1])G.quadOut(P(lx+sx*dw/2,y0,lz0),P(lx+sx*dw/2,y0,lzb),P(lx+sx*dw/2,y1,lzb),P(lx+sx*dw/2,y1,lz0),[0.005,0.885],[0.02,0.885],[0.02,0.9],[0.005,0.9],tint,ref);
  const yr2=y1+0.8,o=0.22,zf=lz0+side*o;
  for(const sx of [-1,1])RF.quadOut(P(lx+sx*(dw/2+o),y1-0.12,zf),P(lx+sx*(dw/2+o),y1-0.12,lzb),P(lx,yr2,lzb),P(lx,yr2,zf),[0,0],[dd/2.5,0],[dd/2.5,0.45],[0,0.45],rt,P(lx,y1-3,(zf+lzb)/2));
  G.triOut(P(lx-dw/2,y1,lz0),P(lx+dw/2,y1,lz0),P(lx,yr2,lz0),[0.005,0.885],[0.02,0.885],[0.012,0.9],tint,ref);}
function addBuildingGeo(b){
  const ch=chunkOf(b.x,b.z);const R=mulberry32(b.seed||Math.floor(b.x*7+b.z*13));
  const c=Math.cos(b.rot),s=Math.sin(b.rot);const ex=[c,-s],ez=[s,c];const P=(lx,y,lz)=>[b.x+ex[0]*lx+ez[0]*lz,y,b.z+ex[1]*lx+ez[1]*lz];
  const hw=b.w/2,hd=b.d/2,gf=b.gf,top=gf+b.floors*b.fh;const ref=P(0,top/2,0);
  const tint=new THREE.Color(b.tint),rt=new THREE.Color(b.roofTint),gt=tint.clone().lerp(WHITE_C,0.3);
  const G=cg(ch,b.style),SH=cg(ch,'shop'),TR=cg(ch,'trim');const us=b.us??0;const kind=b.roofKind||'tile';
  const cs=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]];
  for(let i=0;i<4;i++){const A=cs[i],B=cs[(i+1)%4];const len=Math.hypot(B[0]-A[0],B[1]-A[1]);const nb=Math.max(1,Math.round(len/3.4));
    const nW=[ex[0]*SIDE_N[i][0]+ez[0]*SIDE_N[i][1],ex[1]*SIDE_N[i][0]+ez[1]*SIDE_N[i][1]];const mA=P(A[0],0,A[1]),mB=P(B[0],0,B[1]);
    const shopHere=b.shopFront===undefined?true:(b.shopFront&&faceStreet((mA[0]+mB[0])/2,(mA[2]+mB[2])/2,nW[0],nW[1]));const yb=shopHere?gf:0;
    if(shopHere)SH.quadOut4(P(A[0],0,A[1]),P(B[0],0,B[1]),P(B[0],gf,B[1]),P(A[0],gf,A[1]),[us,0],[us+nb/8,0],[us+nb/8,1],[us,1],[shade(gt,0.7),shade(gt,0.7),gt,gt],ref);
    const fv=(top-yb)/b.fh/4;G.quadOut4(P(A[0],yb,A[1]),P(B[0],yb,B[1]),P(B[0],top,B[1]),P(A[0],top,A[1]),[b.u0,b.v0],[b.u0+nb/4,b.v0],[b.u0+nb/4,b.v0+fv],[b.u0,b.v0+fv],[shade(tint,yb?0.88:0.8),shade(tint,yb?0.88:0.8),tint,tint],ref);
    if(DET>=1){const n=SIDE_N[i];if(b.roof!=='flat')ledge(TR,P,A,B,n,top-0.42,top,0.3,shade(tint,0.98));ledge(TR,P,A,B,n,gf-0.04,gf+0.2,0.12,shade(tint,0.9));ledge(TR,P,A,B,n,0,0.42,0.05,shade(tint,0.5));}}
  if(b.roof==='gable'){const rh=hd*b.pitch,o=0.4,RF=cg(ch,kind),rref=P(0,top-1,0);const ye=top-o*b.pitch;const sl=Math.hypot(hd+o,rh+o*b.pitch)/2.5,ul=(b.w+2*o)/2.5;
    RF.quadOut(P(-hw-o,ye,-hd-o),P(hw+o,ye,-hd-o),P(hw+o,top+rh,0),P(-hw-o,top+rh,0),[0,0],[ul,0],[ul,sl],[0,sl],rt,rref);
    RF.quadOut(P(hw+o,ye,hd+o),P(-hw-o,ye,hd+o),P(-hw-o,top+rh,0),P(hw+o,top+rh,0),[0,0],[ul,0],[ul,sl],[0,sl],rt,rref);
    if(DET>=1){for(const sd of [-1,1])TR.quadOut(P(-hw-o,ye,sd*(hd+o)),P(hw+o,ye,sd*(hd+o)),P(hw+o,top,sd*hd),P(-hw-o,top,sd*hd),[0,0],[1,0],[1,0.1],[0,0.1],shade(tint,0.45),P(0,top+20,0));}
    const nb=Math.max(1,Math.round(b.d/3.4))/4,fv=b.floors/4,gv=rh/b.fh/4;
    for(const sx of [-hw,hw])G.triOut(P(sx,top,-hd),P(sx,top,hd),P(sx,top+rh,0),[b.u0,b.v0+fv],[b.u0+nb,b.v0+fv],[b.u0+nb/2,b.v0+fv+gv],tint,P(0,top,0));
    if(DET>=1){RF.beam(P(-hw-o,top+rh+0.06,0),P(hw+o,top+rh+0.06,0),0.3,0.22,shade(rt,0.8));
      const nc=b.w>11?2:1;const BR=cg(ch,'brick');for(let k=0;k<nc;k++){const cx=(R()-0.5)*b.w*0.6,cz=(R()-0.5)*hd*0.5;const yb=top+rh*(1-Math.abs(cz)/hd)-1,yt=top+rh+0.5+R()*0.9;const q=P(cx,0,cz);
        BR.box(q[0],yb,q[2],0.62,yt-yb,0.62,b.rot,WHITE,1.2);TR.box(q[0],yt,q[2],0.78,0.12,0.78,b.rot,shade(tint,0.75),1);}}
    if(DET>=2&&b.style!=='modern'&&b.pitch>=0.9&&b.w>=7&&hd>=4.5){const n=Math.max(1,Math.floor((b.w-2)/4.2));for(const side of [-1,1]){if(R()<0.35)continue;for(let k=0;k<n;k++){const lx=-hw+(k+0.5)*(b.w/n);dormer(G,cg(ch,kind),P,b,lx,side,top,rh,tint,rt);}}}
  }else{const F=cg(ch,'flat');F.quadOut(P(-hw,top,-hd),P(hw,top,-hd),P(hw,top,hd),P(-hw,top,hd),[0,0],[b.w/3,0],[b.w/3,b.d/3],[0,b.d/3],shade(rt,1),P(0,top-5,0));
    if(DET>=1){for(let i=0;i<4;i++)ledge(TR,P,cs[i],cs[(i+1)%4],SIDE_N[i],top-0.1,top+0.75,0.18,shade(tint,0.85));
      const n=1+Math.floor(R()*3);for(let k=0;k<n;k++){const q=P((R()-0.5)*b.w*0.6,0,(R()-0.5)*b.d*0.6);TR.box(q[0],top,q[2],1.2+R()*2.5,0.9+R()*1.6,1.2+R()*2,b.rot,{r:0.72,g:0.73,b:0.74},1.5);}}}
}
function buildCityMeshes(){
  const mats={plaster:MAT.plaster,fachwerk:MAT.fachwerk,sandstone:MAT.sandstone,modern:MAT.modern,shop:MAT.shop,trim:MAT.trim,tile:MAT.tile,slate:MAT.slate,flat:MAT.flat,brick:MAT.brick,rom:MAT.rom,copper:MAT.copper};
  for(const ch of CHUNKS.values())for(const k in ch){if(ch[k].empty)continue;const m=new THREE.Mesh(ch[k].geo(),mats[k]);m.castShadow=true;m.receiveShadow=true;scene.add(m);}
}

// ===================== BODENFLÄCHEN, STRASSEN =====================
function shapeMesh(poly,y,mat,uvS,holes,cast=false){const sh=new THREE.Shape(poly.map(p=>new THREE.Vector2(p[0],-p[1])));if(holes)for(const h of holes)sh.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],-p[1]))));
  const g=new THREE.ShapeGeometry(sh,6);g.rotateX(-Math.PI/2);const pos=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/uvS,-pos.getZ(i)/uvS);g.translate(0,y,0);g.computeBoundingSphere();
  const m=new THREE.Mesh(g,mat);m.receiveShadow=true;m.castShadow=cast;scene.add(m);return m;}
function fillGB(G,outer,holes,y,uvS,col=WHITE){const faces=triangulate(outer,holes||[]);const all=[...outer,...(holes||[]).flat()];
  for(const f of faces){const a=all[f[0]],b=all[f[1]],c=all[f[2]];if(!a||!b||!c)continue;G.triOut([a[0],y,a[1]],[b[0],y,b[1]],[c[0],y,c[1]],[a[0]/uvS,-a[1]/uvS],[b[0]/uvS,-b[1]/uvS],[c[0]/uvS,-c[1]/uvS],col,[a[0],y-5,a[1]]);}}
function stripGB(G,pts,o1,o2,y,uvS,c1=WHITE,c2=WHITE){const A=offsetPts(pts,o1),B=offsetPts(pts,o2);
  for(let i=0;i<pts.length-1;i++){const a0=[A[i][0],y,A[i][1]],a1=[A[i+1][0],y,A[i+1][1]],b0=[B[i][0],y,B[i][1]],b1=[B[i+1][0],y,B[i+1][1]];const uv=p=>[p[0]/uvS,-p[2]/uvS];
    G.quadOut4(a0,b0,b1,a1,uv(a0),uv(b0),uv(b1),uv(a1),[c1,c2,c2,c1],[(a0[0]+b1[0])/2,y-5,(a0[2]+b1[2])/2]);}}
// runde Abschlüsse/Kreuzungsflächen: Kreisscheibe
function discGB(G,x,z,r,y,uvS,n=14){for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU;const p0=[x+Math.cos(a0)*r,y,z+Math.sin(a0)*r],p1=[x+Math.cos(a1)*r,y,z+Math.sin(a1)*r];G.triOut([x,y,z],p0,p1,[x/uvS,-z/uvS],[p0[0]/uvS,-p0[2]/uvS],[p1[0]/uvS,-p1[2]/uvS],WHITE,[x,y-5,z]);}}
function curbBand(G,A,d,r,t0,t1,lFace,lBack,h,y0=0.04){const P=(t,l,y)=>[A[0]+d[0]*t+r[0]*l,y,A[1]+d[1]*t+r[1]*l];const tm=(t0+t1)/2;
  G.quadOut(P(t0,lFace,y0),P(t1,lFace,y0),P(t1,lFace,h),P(t0,lFace,h),[t0/1.5,0],[t1/1.5,0],[t1/1.5,0.1],[t0/1.5,0.1],WHITE,P(tm,lBack+(lBack-lFace)*2,h/2));
  G.quadOut(P(t0,lFace,h),P(t1,lFace,h),P(t1,lBack,h),P(t0,lBack,h),[t0/1.5,0],[t1/1.5,0],[t1/1.5,0.15],[t0/1.5,0.15],WHITE,P(tm,(lFace+lBack)/2,h-2));}
function paintQuad(G,A,d,r,ta,tb,la,lb,y=0.078){const P=(t,l)=>[A[0]+d[0]*t+r[0]*l,y,A[1]+d[1]*t+r[1]*l];G.quadOut(P(ta,la),P(tb,la),P(tb,lb),P(ta,lb),[0,0],[1,0],[1,1],[0,1],WHITE,[A[0]+d[0]*(ta+tb)/2,y-3,A[1]+d[1]*(ta+tb)/2]);}
const MANHOLES=[];
function roadSurf(r){if(r.type==='path')return r.surf===0?'asp':r.surf===3||r.cls===7&&r.surf<0&&r.name===''&&r.w<2.6&&inPark(r.pts[0])?'gravel':r.surf===1?'cob':'slab';
  if(r.type==='ped')return r.surf===0?'asp':r.surf===2||r.surf===4?'slab':r.surf===3?'gravel':'cob';
  return r.surf===1?'cob':r.surf===2?'slab':r.surf===3?'gravel':'asp';}
let PARK_GRID=null;
function inPark(p){if(!PARK_GRID)return false;const i=idx(p[0],p[1]);return i>=0&&(mfG(i)&1)===1;}
const STATIC_LOD={list:[],t:0,R:1700};
function staticMesh(m){if(!LOWMEM)return m;dropCPU(m.geometry);const c=m.geometry.boundingSphere;STATIC_LOD.list.push({m,x:c.center.x,z:c.center.z,r:c.radius});return m;}
function staticInst(m){if(!LOWMEM)return m;const c=m.boundingSphere;STATIC_LOD.list.push({m,x:c.center.x,z:c.center.z,r:c.radius});return m;}
function updateStaticLOD(px,pz,force){STATIC_LOD.t-=1;if(STATIC_LOD.t>0&&!force)return;STATIC_LOD.t=20;const R=STATIC_LOD.R;for(const e of STATIC_LOD.list){const d=Math.hypot(e.x-px,e.z-pz)-e.r;e.m.visible=d<R;}}
function buildRoads(){
  const AO={r:0.6,g:0.6,b:0.62};const RC=new Map();
  const gbs=(x,z)=>{const k=chunkKey(x,z);let o=RC.get(k);if(!o){o={sw:new GB(),asp:new GB(),cob:new GB(),slab:new GB(),gravel:new GB(),curb:new GB(),paint:new GB()};RC.set(k,o);}return o;};
  const yOf={main:0.062,street:0.06,ped:0.055,path:0.05};
  for(const r of ROADS){if(r.bridge)continue;r.surfK=roadSurf(r);const y=yOf[r.type]||0.06;const G=gbs(...r.pts[r.pts.length>>1]);const sw=G.sw;
    if(r.sw>0){stripGB(sw,r.pts,r.w/2-0.4,r.w/2+r.sw,0.04,3,WHITE,AO);stripGB(sw,r.pts,-(r.w/2-0.4),-(r.w/2+r.sw),0.04,3,WHITE,AO);}
    const uv=r.surfK==='asp'?6:r.surfK==='slab'?4:r.surfK==='gravel'?3:2;stripGB(G[r.surfK],r.pts,r.w/2,-r.w/2,y,uv);
    // Endkappen gegen Lücken in Kurven/Kreuzungen
    for(const p of [r.pts[0],r.pts[r.pts.length-1]])discGB(G[r.surfK],p[0],p[1],r.w/2,y-0.002,uv,r.type==='path'?8:14);
    if(r.sw>0)for(const p of [r.pts[0],r.pts[r.pts.length-1]])discGB(sw,p[0],p[1],r.w/2+r.sw,0.038,3,14);}
  // Gelenke innerhalb einer Straße (Knicke) mit Scheiben schließen
  for(const r of ROADS){if(r.bridge||r.type==='path')continue;const G=gbs(...r.pts[r.pts.length>>1]);for(let k=1;k<r.pts.length-1;k++){const a=r.pts[k-1],b=r.pts[k],c=r.pts[k+1];const d1=[b[0]-a[0],b[1]-a[1]],d2=[c[0]-b[0],c[1]-b[1]];const cs=(d1[0]*d2[0]+d1[1]*d2[1])/((Math.hypot(...d1)*Math.hypot(...d2))||1);if(cs<0.97)discGB(G[r.surfK],b[0],b[1],r.w/2,(yOf[r.type]||0.06)-0.002,6,12);}}
  const isCarE=E=>E.road.type==='main'||E.road.type==='street';
  const nodeTrim=n=>{const N=NODES[n];const es=N.e.filter(e=>EDGES[e].road.type!=='path');if(es.length<3)return 0;let m=0;for(const e of es){const r=EDGES[e].road;m=Math.max(m,r.w/2+r.sw);}return m+0.3;};
  const trims=new Float32Array(NODES.length);for(let n=0;n<NODES.length;n++)trims[n]=nodeTrim(n);
  for(let e=0;e<EDGES.length;e++){const E=EDGES[e];if(E.dead)continue;const r=E.road;if(r.bridge||!isCarE(E))continue;const A=NODES[E.a],B=NODES[E.b];const d=[(B.x-A.x)/E.len,(B.z-A.z)/E.len],rt=[-d[1],d[0]];const a=[A.x,A.z];
    const t0=trims[E.a],t1=E.len-trims[E.b];if(t1-t0<0.3)continue;const Q=gbs(A.x,A.z),curb=Q.curb,paint=Q.paint;
    if(r.sw>0)for(const s of [-1,1])curbBand(curb,a,d,rt,t0,t1,s*r.w/2,s*(r.w/2+0.28),0.16);
    if(r.type!=='main'||r.surfK!=='asp')continue;
    const m0=t0+(t0>0?1.5:0),m1=t1-(trims[E.b]>0?1.5:0);if(m1-m0<1)continue;
    for(const s of [-1,1])paintQuad(paint,a,d,rt,m0,m1,s*(r.w/2-0.45)-0.075,s*(r.w/2-0.45)+0.075);
    if(r.w>=5.5){const ph=(E.a*7)%9;for(let t=m0+ph%3;t+3<m1;t+=9)paintQuad(paint,a,d,rt,t,t+3,-0.065,0.065);}
    if(E.len>30&&Math.random()<0.5){const t=mr(t0+4,t1-4);const o=(r.lane||r.w/4)*(Math.random()<0.5?1:-1);MANHOLES.push([a[0]+d[0]*t+rt[0]*o,a[1]+d[1]*t+rt[1]*o]);}}
  // Zebrastreifen an echten Überwegen (OSM highway=crossing)
  ZEBRAS.length=0;
  for(let i=0;i<OSM.crossings.length;i+=2){const x=OSM.crossings[i]/10,z=OSM.crossings[i+1]/10;const n=nearestNode(x,z,false);if(n<0)continue;const N=NODES[n];if(Math.hypot(N.x-x,N.z-z)>1.5)continue;
    const es=N.e.filter(e=>EDGES[e].road.type==='main'||EDGES[e].road.type==='street');if(!es.length)continue;const E=EDGES[es[0]];if(E.road.surfK!=='asp')continue;const o=NODES[edgeOther(es[0],n)];const d=[(o.x-N.x)/E.len,(o.z-N.z)/E.len],rt=[-d[1],d[0]];const paint=gbs(N.x,N.z).paint;
    for(let l=-E.road.w/2+0.6;l<E.road.w/2-0.5;l+=1.0)paintQuad(paint,[N.x,N.z],d,rt,-1.6,1.6,l,l+0.5,0.079);ZEBRAS.push({x:N.x,z:N.z});}
  const add=(G,mat,cast=false)=>{if(G.empty)return;const m=new THREE.Mesh(G.geo(),mat);m.receiveShadow=true;m.castShadow=cast;scene.add(staticMesh(m));};
  for(const o of RC.values()){add(o.sw,MAT.sidewalk);add(o.asp,MAT.asphalt);add(o.cob,MAT.cobble);add(o.slab,MAT.plaza);add(o.gravel,MAT.gravel);add(o.curb,MAT.curb,true);add(o.paint,MAT.paint);}
  const mhTex=canvasTex(64,64,g=>{g.fillStyle='#3a3836';g.beginPath();g.arc(32,32,31,0,TAU);g.fill();g.strokeStyle='#1e1d1c';g.lineWidth=3;for(let i=-28;i<30;i+=7){g.beginPath();g.moveTo(i,4);g.lineTo(i+20,60);g.stroke();}g.strokeStyle='#55524e';g.lineWidth=4;g.beginPath();g.arc(32,32,29,0,TAU);g.stroke();},false);
  const mh=new THREE.InstancedMesh(new THREE.CircleGeometry(0.4,16).rotateX(-Math.PI/2),stdMat({map:mhTex,transparent:true,alphaTest:0.3,roughness:0.5,metalness:0.6,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5}),Math.max(1,MANHOLES.length));
  const mm=new THREE.Matrix4();MANHOLES.forEach((p,i)=>{mm.makeTranslation(p[0],0.079,p[1]);mh.setMatrixAt(i,mm);});mh.count=MANHOLES.length;mh.receiveShadow=true;scene.add(mh);
}
const ZEBRAS=[];
function buildGroundMeshes(){
  const GC=new Map();const gq=(x,z)=>{const k=chunkKey(x,z);let o=GC.get(k);if(!o){o={grass:new GB(),plaza:new GB(),park:new GB(),grav:new GB(),soil:new GB()};GC.set(k,o);}return o;};
  for(const a of AREAS){const k=a.kind;const bb=a.bb||(a.bb=bboxOf(a.poly));const {grass,plaza,park,grav,soil}=gq((bb[0]+bb[2])/2,(bb[1]+bb[3])/2);
    if(k==='square')fillGB(plaza,a.poly,null,0.032,4);
    else if(k==='parking')fillGB(park,a.poly,null,0.022,6);
    else if(k==='rail'||k==='construction')fillGB(grav,a.poly,null,0.02,3);
    else if(k==='flowerbed')fillGB(soil,a.poly,null,0.03,2,{r:0.75,g:0.62,b:0.5});
    else if(k==='playground')fillGB(grav,a.poly,null,0.028,3,{r:1.15,g:1.05,b:0.85});
    else fillGB(grass,a.poly,null,k==='pitch'?0.028:0.026,3,k==='forest'?{r:0.8,g:0.85,b:0.75}:k==='pitch'?{r:0.95,g:1.08,b:0.9}:WHITE);}
  const add=(G,mat)=>{if(G.empty)return;const m=new THREE.Mesh(G.geo(),mat);m.receiveShadow=true;scene.add(staticMesh(m));};
  for(const o of GC.values()){add(o.grass,MAT.grass);add(o.plaza,MAT.plaza);add(o.park,MAT.asphalt);add(o.grav,MAT.gravel);add(o.soil,MAT.leafBed||MAT.grass);}
  // Gleise
  const RCH=new Map();const rq=(x,z)=>{const k=chunkKey(x,z);let o=RCH.get(k);if(!o){o={bed:new GB(),sl:new GB(),rails:new GB()};RCH.set(k,o);}return o;};
  for(const r of RAILS){if(r.bridge)continue;const {bed,sl,rails}=rq(...r.pts[r.pts.length>>1]);if(!r.tram){stripGB(bed,r.pts,1.7,-1.7,0.035,2);}
    const pts=r.pts;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.1)continue;const d=[(b[0]-a[0])/L,(b[1]-a[1])/L],n=[-d[1],d[0]];
      for(const o of [-0.72,0.72])rails.beam([a[0]+n[0]*o,r.tram?0.07:0.17,a[1]+n[1]*o],[b[0]+n[0]*o,r.tram?0.07:0.17,b[1]+n[1]*o],0.07,r.tram?0.02:0.14);
      if(!r.tram&&QS.detail>=1)for(let t=0.3;t<L;t+=0.65){const c=[a[0]+d[0]*t,a[1]+d[1]*t];sl.quadOut([c[0]-n[0]*1.3-d[0]*0.12,0.06,c[1]-n[1]*1.3-d[1]*0.12],[c[0]+n[0]*1.3-d[0]*0.12,0.06,c[1]+n[1]*1.3-d[1]*0.12],[c[0]+n[0]*1.3+d[0]*0.12,0.06,c[1]+n[1]*1.3+d[1]*0.12],[c[0]-n[0]*1.3+d[0]*0.12,0.06,c[1]-n[1]*1.3+d[1]*0.12],[0,0],[1,0],[1,0.1],[0,0.1],{r:0.55,g:0.5,b:0.45},[c[0],-5,c[1]]);}}}
  const slM=stdMat({vertexColors:true,roughness:0.95}),raM=stdMat({color:0x8a8580,metalness:0.85,roughness:0.3});
  for(const o of RCH.values()){add(o.bed,MAT.gravel);add(o.sl,slM);add(o.rails,raM);}
}

// ===================== RHEIN, UMLAND =====================
let WATER_MAT=null;const WATER_OFF={a:{value:new THREE.Vector2()},b:{value:new THREE.Vector2()}};
const WATER_LEVEL=-5;
function buildRiver(){
  const g=new GB(),cap=new GB();
  // Kaimauern entlang der echten Uferlinie (nur im Stadtgebiet)
  for(const ring of WATER_ALL){for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];
    if(a[0]<MINX+1||a[0]>MAXX-1||a[1]<MINZ+1||a[1]>MAXZ-1||b[0]<MINX+1||b[0]>MAXX-1||b[1]<MINZ+1||b[1]>MAXZ-1)continue;
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.05)continue;let nx=(b[1]-a[1])/L,nz=-(b[0]-a[0])/L;const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
    if(!inRiver(mx+nx*1.5,mz+nz*1.5)){nx=-nx;nz=-nz;}// n zeigt jetzt ins Wasser
    const ref=[mx-nx*4,-4,mz-nz*4];
    g.quadOut([a[0],0.02,a[1]],[b[0],0.02,b[1]],[b[0],-9,b[1]],[a[0],-9,a[1]],[0,0],[L/4,0],[L/4,9/4],[0,9/4],WHITE,ref);
    const la=[a[0]-nx*1.6,a[1]-nz*1.6],lb=[b[0]-nx*1.6,b[1]-nz*1.6];
    cap.quadOut([a[0],0.07,a[1]],[b[0],0.07,b[1]],[lb[0],0.07,lb[1]],[la[0],0.07,la[1]],[0,0],[L/2,0],[L/2,0.8],[0,0.8],WHITE,[mx,-5,mz]);}}
  const wm=new THREE.Mesh(g.geo(),M.lightStone);wm.receiveShadow=true;scene.add(wm);const cm=new THREE.Mesh(cap.geo(),MAT.curb);cm.receiveShadow=true;scene.add(cm);
  T.water.repeat.set(1,1);
  WATER_MAT=new THREE.MeshStandardMaterial({color:0x1b3a44,roughness:0.06,metalness:0.0,normalMap:T.water,normalScale:new THREE.Vector2(0.32,0.32),envMapIntensity:1.15});
  WATER_MAT.onBeforeCompile=sh=>{sh.uniforms.wOffA=WATER_OFF.a;sh.uniforms.wOffB=WATER_OFF.b;
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec2 wOffA; uniform vec2 wOffB;').replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
      'vec3 mapN = normalize( (texture2D( normalMap, vNormalMapUv + wOffA ).xyz * 2.0 - 1.0) + (texture2D( normalMap, vNormalMapUv * 2.3 + wOffB ).xyz * 2.0 - 1.0) * 0.6 );');};
  WATER_MAT.customProgramCacheKey=()=>'water';
  for(const o of WATER_O){const holes=WATER_I.filter(h=>pip(h[0][0],h[0][1],o));shapeMesh(o,WATER_LEVEL,WATER_MAT,30,holes);}
  // Brunnen und Teiche
  const rim=new GB();
  for(const p of PONDS){const a=Math.abs(polyArea(p.poly));const y=p.fountain?0.55:0.12;shapeMesh(p.poly,y,M.water,4);
    if(p.fountain||a<400){const n=p.poly.length;for(let i=0;i<n;i++){const A=p.poly[i],B=p.poly[(i+1)%n];rim.beam([A[0],0.3,A[1]],[B[0],0.3,B[1]],0.45,0.6);}}
    rasterPoly(HG,[p.poly],1);}
  if(!rim.empty){const m=new THREE.Mesh(rim.geo(),M.lightStone);m.castShadow=true;m.receiveShadow=true;scene.add(m);}
  // Umland mit Weinbergen und Feldern (Rheinhessen / Rheingau)
  const fieldTex=canvasTex(1024,1024,g=>{const R=mulberry32(60);g.fillStyle='#5f7040';g.fillRect(0,0,1024,1024);
    for(let i=0;i<220;i++){const x=R()*1024,y=R()*1024,w=40+R()*140,h=30+R()*120;const t=R();g.fillStyle=t<0.3?'#6f7d44':t<0.5?'#8a8a52':t<0.65?'#a59a62':t<0.8?'#556b36':'#7a6a48';g.save();g.translate(x,y);g.rotate(R()*0.6-0.3);g.fillRect(-w/2,-h/2,w,h);
      if(t>0.8||t<0.15){g.strokeStyle='rgba(40,50,25,0.5)';g.lineWidth=1.5;for(let k=-w/2;k<w/2;k+=5){g.beginPath();g.moveTo(k,-h/2);g.lineTo(k,h/2);g.stroke();}}g.restore();}
    noiseFill(g,1024,1024,0.06,20000);});
  const fmat=stdMat({map:fieldTex,roughness:1});
  fmat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vWXZ;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vWXZ;').replace('void main() {',`void main() {\nif(vWXZ.x>${(MINX+1).toFixed(1)}&&vWXZ.x<${(MAXX-1).toFixed(1)}&&vWXZ.y>${(MINZ+1).toFixed(1)}&&vWXZ.y<${(MAXZ-1).toFixed(1)})discard;`);};
  fmat.customProgramCacheKey=()=>'field';
  {const E=MAP_R+7000,x0=MAP_CX-E,x1=MAP_CX+E,z0=MAP_CZ-E,z1=MAP_CZ+E;shapeMesh([[x0,z0],[x1,z0],[x1,z1],[x0,z1]],-0.25,fmat,900,WATER_O.filter(r=>{const b=polyBBox(r);return b[0]>x0&&b[2]<x1&&b[1]>z0&&b[3]<z1;}));}
  for(const h of WATER_I){if(Math.abs(polyArea(h))>3000)shapeMesh(h,-0.25,fmat,900);}
  buildHills();buildFarCity();
}
function buildHills(){const NA=220,NR=16,R0=MAP_R+500,R1=MAP_R+6500;const pos=[],col=[],idxs=[];
  for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const a=i/NA*TAU,r=R0+(R1-R0)*Math.pow(j/NR,1.2);const x=MAP_CX+Math.cos(a)*r,z=MAP_CZ+Math.sin(a)*r;
    const north=Math.max(0,-Math.sin(a));const nz=(Math.sin(a*7+1.3)*0.5+Math.sin(a*13+0.4)*0.3+Math.sin(a*29+2)*0.2+Math.sin(r*0.002+a*3)*0.3)*0.5+0.5;
    let h=(50+260*Math.pow(north,1.6))*(0.45+0.8*nz)*smoothstep(R0,R0+2600,r);if(inRiver(x,z))h=-6;
    pos.push(x,h,z);const c=new THREE.Color().setHSL(0.22+nz*0.06,0.28,0.2+nz*0.1+north*0.05);col.push(c.r,c.g,c.b);}
  for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const a=j*(NA+1)+i,b=a+1,c=a+NA+1,d=c+1;idxs.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idxs);g.computeVertexNormals();
  const m=new THREE.Mesh(g,stdMat({vertexColors:true,roughness:1,side:THREE.DoubleSide}));m.receiveShadow=false;scene.add(m);}
function buildFarCity(){const N=QS.detail>=1?4200:2000;const R=mulberry32(70);const box=new THREE.BoxGeometry(1,1,1).translate(0,0.5,0);
  const im=new THREE.InstancedMesh(box,pbrMat(T.plaster,{}),N);const roofs=new THREE.InstancedMesh(new THREE.ConeGeometry(0.75,1,4).rotateY(Math.PI/4).translate(0,0.5,0),pbrMat(T.tile,{color:0xb05a3e}),N);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),c=new THREE.Color();let k=0;
  for(let t=0;t<N*8&&k<N;t++){const a=R()*TAU,r=MAP_R*0.55+Math.pow(R(),1.6)*3200;const x=MAP_CX+Math.cos(a)*r,z=MAP_CZ+Math.sin(a)*r;if(x>MINX-40&&x<MAXX+40&&z>MINZ-40&&z<MAXZ+40)continue;if(inRiver(x,z))continue;
    const w=8+R()*16,d=8+R()*14,h=6+R()*(r<2000?20:12);q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.round(R()*4)*Math.PI/2+0.3);p.set(x,0,z);s.set(w,h,d);m.compose(p,q,s);im.setMatrixAt(k,m);
    p.set(x,h,z);s.set(w*1.05,Math.min(w,d)*0.45,d*1.05);m.compose(p,q,s);roofs.setMatrixAt(k,m);c.setHSL(0.08+R()*0.06,0.2,0.62+R()*0.2);im.setColorAt(k,c);k++;}
  im.count=k;roofs.count=k;im.castShadow=false;scene.add(im);scene.add(roofs);}

// ===================== BRÜCKE =====================
const LAMPS=[];
function buildBridge(){
  const deck=new GB(),side=new GB(),rail=new GB(),steel=new GB(),walk=new GB(),paint=new GB(),curbG=new GB();const W=11,N=100;
  const P=(t,l,y)=>[BR_A[0]+BR_U[0]*t+BR_N[0]*l,y,BR_A[1]+BR_U[1]*t+BR_N[1]*l];
  for(let i=0;i<N;i++){const t0=i/N*BR_L,t1=(i+1)/N*BR_L,y0=deckY(t0)+0.06,y1=deckY(t1)+0.06;const uv=p=>[p[0]/6,-p[2]/6];
    const q=[P(t0,-7.2,y0),P(t0,7.2,y0),P(t1,7.2,y1),P(t1,-7.2,y1)];deck.quadOut(...q,uv(q[0]),uv(q[1]),uv(q[2]),uv(q[3]),WHITE,P((t0+t1)/2,0,y0-10));
    for(const s of [-1,1]){const w=[P(t0,s*7.2,y0+0.15),P(t0,s*W,y0+0.15),P(t1,s*W,y1+0.15),P(t1,s*7.2,y1+0.15)];const u3=p=>[p[0]/3,-p[2]/3];walk.quadOut(...w,u3(w[0]),u3(w[1]),u3(w[2]),u3(w[3]),WHITE,P((t0+t1)/2,s*9,y0-5));
      curbG.quadOut(P(t0,s*7.2,y0),P(t1,s*7.2,y1),P(t1,s*7.2,y1+0.15),P(t0,s*7.2,y0+0.15),[0,0],[1,0],[1,0.1],[0,0.1],WHITE,P((t0+t1)/2,s*9,y0));
      side.quadOut(P(t0,s*W,y0+0.15),P(t1,s*W,y1+0.15),P(t1,s*W,y1-1.6),P(t0,s*W,y0-1.6),[0,0],[1,0],[1,1],[0,1],WHITE,P((t0+t1)/2,0,y0));
      if(t0>40&&t1<BR_L-40)rail.quad(P(t0,s*(W-0.15),y0+0.15),P(t1,s*(W-0.15),y1+0.15),P(t1,s*(W-0.15),y1+1.3),P(t0,s*(W-0.15),y0+1.3),[t0/2,0],[t1/2,0],[t1/2,1],[t0/2,1]);
      const pa=[BR_A[0],BR_A[1]],dd=BR_U,rr2=BR_N;paintQuad(paint,pa,dd,rr2,t0,t1,s*6.7-0.07,s*6.7+0.07,(y0+y1)/2+0.012);}
    if(i%3===0){paintQuad(paint,[BR_A[0],BR_A[1]],BR_U,BR_N,t0,t0+3,-0.07,0.07,y0+0.012);}
    side.quadOut(P(t0,-W,y0-1.6),P(t0,W,y0-1.6),P(t1,W,y1-1.6),P(t1,-W,y1-1.6),[0,0],[1,0],[1,1],[0,1],WHITE,P((t0+t1)/2,0,y0+5));
    if(i%9===4)for(const s of [-1,1])LAMPS.push({x:P(t0,s*10.4,0)[0],z:P(t0,s*10.4,0)[2],y:y0+0.15,face:Math.atan2(-BR_N[0]*s,-BR_N[1]*s)});}
  const railTex=canvasTex(64,32,g=>{g.clearRect(0,0,64,32);g.fillStyle='#4c5755';g.fillRect(0,0,64,4);g.fillRect(0,26,64,3);for(let x=0;x<64;x+=8)g.fillRect(x,0,2.5,32);});
  const add=(G,mat,cast)=>{const m=new THREE.Mesh(G.geo(),mat);m.receiveShadow=true;m.castShadow=!!cast;scene.add(m);};
  add(deck,MAT.asphalt,true);add(walk,MAT.sidewalk);add(curbG,MAT.curb);add(side,M.steel,true);add(paint,MAT.paint);
  scene.add(new THREE.Mesh(rail.geo(),stdMat({map:railTex,alphaTest:0.5,side:THREE.DoubleSide,metalness:0.5,roughness:0.45})));
  const rot=Math.atan2(-BR_U[1],BR_U[0]);const piers=PIERS.map(p=>p.t);
  for(const p of PIERS){const q=P(p.t,p.l,0);lbox(q[0],q[2],Math.max(6,p.len),Math.max(14,p.wid),deckY(p.t)-1.6+9,M.redPlain,{y:-9,rot,solid:false,reserve:false,tw:4,th:4});}
  for(let k=0;k<piers.length-1;k++){const ta=piers[k]+4,tb=piers[k+1]-4;const tm=(ta+tb)/2;const crown=deckY(tm)-1.8;const NS=20;
    for(const l of [-8,-3,3,8]){let prev=null;for(let i=0;i<=NS;i++){const s=i/NS;const t=lerp(ta,tb,s);const y=-3+(crown+3)*4*s*(1-s);const p=P(t,l,y);if(prev)steel.beam(prev,p,1,1.4);prev=p;if(i>0&&i<NS&&i%2===0)steel.beam(p,P(t,l,deckY(t)-1.6),0.35,0.35);}}
    for(let i=1;i<NS;i+=4){const s=i/NS;const t=lerp(ta,tb,s);const y=-3+(crown+3)*4*s*(1-s);steel.beam(P(t,-8,y),P(t,8,y),0.4,0.4);}}
  // Rampenstützen über Land
  for(let t=20;t<BR_L-20;t+=24){const q=P(t,0,0);if(inRiver(q[0],q[2]))continue;const dy=deckY(t);if(dy<2.5)continue;for(const l of [-7,7]){const a=P(t,l,0);lbox(a[0],a[2],1.4,1.4,dy-1.6,M.lightStone,{rot,reserve:false,solid:true});}}
  add(steel,M.steel,true);
  label('Theodor-Heuss-Brücke',BR_A[0]+BR_U[0]*BR_L/2,BR_A[1]+BR_U[1]*BR_L/2);}


// Weitere Brücken (Balkenbrücken aus Beton/Stahl, z. B. Schiersteiner Brücke)
function buildGirderBridges(){for(const br of BRIDGES){if(br.kind==='arch')continue;
  const deck=new GB(),side=new GB(),walk=new GB(),paint=new GB();const W=br.hw,N=Math.max(20,Math.ceil(br.L/8));
  const P=(t,l,y)=>[br.A[0]+br.U[0]*t+br.N[0]*l,y,br.A[1]+br.U[1]*t+br.N[1]*l];
  for(let i=0;i<N;i++){const t0=i/N*br.L,t1=(i+1)/N*br.L,y0=deckY(t0,br)+0.06,y1=deckY(t1,br)+0.06;const uv=p=>[p[0]/6,-p[2]/6];
    const q=[P(t0,-(W-2),y0),P(t0,W-2,y0),P(t1,W-2,y1),P(t1,-(W-2),y1)];deck.quadOut(...q,uv(q[0]),uv(q[1]),uv(q[2]),uv(q[3]),WHITE,P((t0+t1)/2,0,y0-10));
    for(const s of [-1,1]){const w=[P(t0,s*(W-2),y0+0.15),P(t0,s*W,y0+0.15),P(t1,s*W,y1+0.15),P(t1,s*(W-2),y1+0.15)];const u3=p=>[p[0]/3,-p[2]/3];walk.quadOut(...w,u3(w[0]),u3(w[1]),u3(w[2]),u3(w[3]),WHITE,P((t0+t1)/2,s*W,y0-5));
      side.quadOut(P(t0,s*W,y0+1.1),P(t1,s*W,y1+1.1),P(t1,s*W,y1-2.4),P(t0,s*W,y0-2.4),[t0/4,0],[t1/4,0],[t1/4,0.9],[t0/4,0.9],WHITE,P((t0+t1)/2,0,y0));
      paintQuad(paint,br.A,br.U,br.N,t0,t1,s*(W-2.4)-0.07,s*(W-2.4)+0.07,(y0+y1)/2+0.012);}
    side.quadOut(P(t0,-W,y0-2.4),P(t0,W,y0-2.4),P(t1,W,y1-2.4),P(t1,-W,y1-2.4),[0,0],[1,0],[1,1],[0,1],WHITE,P((t0+t1)/2,0,y0+5));
    if(i%3===0)paintQuad(paint,br.A,br.U,br.N,t0,t0+3,-0.07,0.07,y0+0.012);
    if(i%6===3)for(const s of [-1,1])LAMPS.push({x:P(t0,s*(W-0.6),0)[0],z:P(t0,s*(W-0.6),0)[2],y:y0+0.15,face:Math.atan2(-br.N[0]*s,-br.N[1]*s)});}
  const add=(G,mat,cast)=>{if(G.empty)return;const m=new THREE.Mesh(G.geo(),mat);m.receiveShadow=true;m.castShadow=!!cast;scene.add(m);};
  add(deck,MAT.asphalt,true);add(walk,MAT.sidewalk);add(side,M.lightStone,true);add(paint,MAT.paint);
  const rot=Math.atan2(-br.U[1],br.U[0]);
  for(const p of br.piers){const q=P(p.t,p.l,0);const h=deckY(p.t,br)-2.4+9;for(const s of [-1,1]){const r=P(p.t,p.l+s*Math.max(2.5,p.wid/2-3),0);lbox(r[0],r[2],Math.max(3,Math.min(8,p.len)),3,h,M.lightStone,{y:-9,rot,solid:false,reserve:false,tw:4,th:4});}}
  for(let t=25;t<br.L-25;t+=30){const q=P(t,0,0);if(inRiver(q[0],q[2]))continue;const dy=deckY(t,br);if(dy<3)continue;for(const l of [-W*0.55,W*0.55]){const a=P(t,l,0);lbox(a[0],a[2],1.6,1.6,dy-2.4,M.lightStone,{rot,reserve:false,solid:true});}}
  label(br.name,br.A[0]+br.U[0]*br.L/2,br.A[1]+br.U[1]*br.L/2);}}

// ===================== BÄUME (Wind) =====================
function crownGeo(kind,detail){const R=mulberry32(kind*31+7);const pos=[],nor=[],uv=[],col=[];
  const blobs=kind===1?[[0,0,0,1.5],[0,1.6,0,1.35],[0,3.0,0,1.1],[0,4.1,0,0.8]]:kind===2?[[0,0,0,2.2],[1.6,0.2,0.6,1.7],[-1.5,0.1,-0.5,1.8],[0.5,0.9,-1.4,1.6],[-0.6,1.0,1.4,1.6],[0,1.6,0,1.5]]:[[0,0,0,2.0],[1.2,0.5,0.4,1.5],[-1.1,0.4,-0.6,1.6],[0.3,1.4,-0.3,1.5],[-0.2,0.6,1.2,1.4]];
  const nb=detail>=2?blobs.length:Math.min(blobs.length,3);
  for(let bi=0;bi<nb;bi++){const [bx,by,bz,br]=blobs[bi];const g=new THREE.IcosahedronGeometry(1,detail>=1?1:0);const p=g.attributes.position;const ph=R()*10;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const l=Math.hypot(x,y,z);const dx=x/l,dy=y/l,dz=z/l;
      const nz=Math.sin(dx*5+ph)*Math.sin(dy*6+ph*0.7)*Math.sin(dz*5.5+ph*1.3);const r=br*(1+0.18*nz);
      pos.push(bx+dx*r,by+dy*r*0.9,bz+dz*r);nor.push(dx,dy,dz);uv.push(Math.atan2(dz,dx)/TAU*3+bi*0.37,dy*1.5+0.5);
      const ao=clamp(0.55+0.45*(dy*0.5+0.5)+0.1*bi/nb,0.4,1);col.push(ao,ao,ao);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.translate(0,kind===1?4.2:4.6,0);g.computeBoundingSphere();return g;}
function trunkGeo(kind){const g=new GB();g.beam([0,0,0],[0,kind===1?5:4.6,0],0.34,0.34,WHITE);g.beam([0,2.8,0],[0.9,4.6,0.2],0.16,0.16);g.beam([0,3.2,0],[-0.8,4.8,-0.3],0.15,0.15);const geo=g.geo();return geo;}
function buildTrees(){const det=QS.detail;const crowns=[0,1,2].map(k=>crownGeo(k,det)),trunks=[0,1,2].map(k=>trunkGeo(k));
  const groups=new Map();for(const t of TREES){const kind=t.kind??(Math.abs(Math.floor(t.x*3+t.z*7))%5===0?1:Math.abs(Math.floor(t.x+t.z))%3===0?2:0);const key=chunkKey(t.x,t.z)+'|'+kind;if(!groups.has(key))groups.set(key,{kind,list:[]});groups.get(key).list.push(t);}
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),c=new THREE.Color(),up=new THREE.Vector3(0,1,0);
  for(const g of groups.values()){const n=g.list.length;const cm=new THREE.InstancedMesh(crowns[g.kind],MAT.leaf,n),tm=new THREE.InstancedMesh(trunks[g.kind],MAT.bark,n);
    g.list.forEach((t,i)=>{const sc=t.s*mr(0.85,1.15);q.setFromAxisAngle(up,mr(0,TAU));p.set(t.x,0,t.z);s.set(sc,sc*mr(0.9,1.15),sc);m.compose(p,q,s);cm.setMatrixAt(i,m);tm.setMatrixAt(i,m);
      c.setHSL(mr(0.2,0.3),mr(0.35,0.6),mr(0.45,0.62));cm.setColorAt(i,c);});
    cm.castShadow=tm.castShadow=true;cm.receiveShadow=tm.receiveShadow=true;cm.computeBoundingSphere();tm.computeBoundingSphere();scene.add(staticInst(cm));scene.add(staticInst(tm));}}

// ===================== STRASSENMÖBEL =====================
const TRAFFIC_LIGHTS=[];let TL_MESH=null;let TL_NODES=new Set();
function instGeo(geo,mat,list,cast=true){if(!list.length)return null;const im=new THREE.InstancedMesh(geo,mat,list.length);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  list.forEach((o,i)=>{q.setFromAxisAngle(up,o.face||0);p.set(o.x,o.y||0,o.z);s.setScalar(o.s||1);m.compose(p,q,s);im.setMatrixAt(i,m);});im.castShadow=cast;im.receiveShadow=true;im.computeBoundingSphere();scene.add(im);return im;}
const lampMat=nightMat(stdMat({color:0xfff2dc,emissive:0xffd59a,emissiveIntensity:0,roughness:0.3}),6);
function buildProps(){
  // Laternen
  const pole=new GB();pole.beam([0,0,0],[0,6.2,0],0.14,0.14);pole.beam([0,6.0,0],[0,6.25,1.1],0.08,0.08);pole.box(0,0,0,0.3,0.5,0.3,0,WHITE,1);pole.box(0,6.0,1.1,0.5,0.12,0.7,0,WHITE,1);
  const head=new THREE.BoxGeometry(0.42,0.06,0.6).translate(0,5.97,1.1);
  instGeo(pole.geo(),stdMat({color:0x2f3438,metalness:0.6,roughness:0.45}),LAMPS);instGeo(head,lampMat,LAMPS,false);
  const R=mulberry32(90);
  const free=(x,z)=>{const i=idx(x,z);return i>=0&&!hgG(i)&&!(mfG(i)&4);};
  const benches=[],bins=[],bollards=[],pillars=[],stops=[];
  const faceRoad=(x,z)=>{const n=nearestNode(x,z,false);if(n<0)return R()*TAU;const N=NODES[n];return Math.atan2(N.x-x,N.z-z);};
  // Bänke, Mülleimer, Haltestellen: echte Standorte
  for(let i=0;i<OSM.benches.length;i+=2){const x=OSM.benches[i]/10,z=OSM.benches[i+1]/10;if(free(x,z))benches.push({x,z,face:faceRoad(x,z)+Math.PI});}
  for(let i=0;i<OSM.bins.length;i+=2){const x=OSM.bins[i]/10,z=OSM.bins[i+1]/10;if(free(x,z))bins.push({x,z});}
  for(let i=0;i<OSM.stops.length;i+=3){let x=OSM.stops[i]/10,z=OSM.stops[i+1]/10;const nm=ONAME(OSM.stops[i+2]);const n=nearestNode(x,z,true);if(n<0)continue;const N=NODES[n];
    // auf den Gehweg rücken
    let e=N.e.find(e=>EDGES[e].car);if(e===undefined)continue;const E=EDGES[e];const o=NODES[edgeOther(e,n)];const d=[(o.x-N.x)/E.len,(o.z-N.z)/E.len];const rt=[-d[1],d[0]];const side=((x-N.x)*rt[0]+(z-N.z)*rt[1])>=0?1:-1;
    const off=E.road.w/2+Math.max(1.2,E.road.sw*0.6);const t=clamp((x-N.x)*d[0]+(z-N.z)*d[1],-E.len,E.len);x=N.x+d[0]*t+rt[0]*off*side;z=N.z+d[1]*t+rt[1]*off*side;
    if(!free(x,z))continue;if(stops.some(s=>Math.hypot(s.x-x,s.z-z)<8))continue;stops.push({x,z,face:Math.atan2(-rt[0]*side,-rt[1]*side),name:nm});}
  // Poller an den Enden der Fußgängerzonen
  for(const r of ROADS){if(r.type!=='ped')continue;for(const [p,q] of [[r.pts[0],r.pts[1]],[r.pts[r.pts.length-1],r.pts[r.pts.length-2]]]){const L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L<3)continue;const d=[(q[0]-p[0])/L,(q[1]-p[1])/L],n=[-d[1],d[0]];
    const ni=nearestNode(p[0],p[1],false);if(ni<0||!NODES[ni].e.some(e=>EDGES[e].car))continue;
    for(let l=-r.w/2+1;l<=r.w/2-1;l+=2.3){const x=p[0]+d[0]*2+n[0]*l,z=p[1]+d[1]*2+n[1]*l;if(free(x,z))bollards.push({x,z});}}}
  // Litfaßsäulen am Gehweg
  const mains=EDGES.filter(E=>!E.dead&&E.road.type==='main'&&!E.road.bridge&&E.len>20);
  for(let k=0;k<400&&pillars.length<60;k++){const E=mains[Math.floor(R()*mains.length)];if(!E)break;const A=NODES[E.a],B=NODES[E.b];const d=[(B.x-A.x)/E.len,(B.z-A.z)/E.len],n=[-d[1],d[0]];const s=R()<0.5?1:-1;const t=E.len*(0.3+R()*0.4);const o=E.road.w/2+E.road.sw-0.9;
    const x=A.x+d[0]*t+n[0]*o*s,z=A.z+d[1]*t+n[1]*o*s;if(!free(x,z)||E.road.sw<2)continue;pillars.push({x,z,face:R()*TAU});}
  const benchG=new GB();for(const y of [0.45,0.48])benchG.box(0,y,-0.15+(y-0.45)*8,1.8,0.04,0.12,0,WHITE,1);for(const zz of [-0.2,0,0.2])benchG.box(0,0.45,zz,1.8,0.04,0.12,0,WHITE,1);benchG.box(0,0.55,-0.27,1.8,0.12,0.04,0,WHITE,1);benchG.box(0,0.72,-0.29,1.8,0.12,0.04,0,WHITE,1);
  for(const x of [-0.75,0.75])benchG.box(x,0,0,0.08,0.45,0.5,0,{r:0.15,g:0.15,b:0.16},1);
  instGeo(benchG.geo(),stdMat({vertexColors:true,color:0x8a5a36,roughness:0.7}),benches);
  instGeo(new THREE.CylinderGeometry(0.28,0.25,0.9,12).translate(0,0.45,0),stdMat({color:0x2b4a35,roughness:0.5,metalness:0.3}),bins);
  instGeo(new THREE.CylinderGeometry(0.09,0.11,0.95,8).translate(0,0.475,0),stdMat({color:0x2a2c2f,roughness:0.5,metalness:0.4}),bollards);
  const pg=scaleUV(new THREE.CylinderGeometry(0.65,0.65,2.8,20,1,true).translate(0,1.6,0),2,1);
  instGeo(pg,stdMat({map:T.poster,roughness:0.75}),pillars);instGeo(new THREE.CylinderGeometry(0.75,0.72,0.25,20).translate(0,3.1,0),stdMat({color:0x2d4a3a,roughness:0.5}),pillars);
  instGeo(new THREE.SphereGeometry(0.5,16,6,0,TAU,0,Math.PI/2).translate(0,3.2,0),stdMat({color:0x2d4a3a,roughness:0.5}),pillars);instGeo(new THREE.CylinderGeometry(0.7,0.7,0.2,20).translate(0,0.1,0),stdMat({color:0x2d4a3a}),pillars);
  // Bushaltestellen
  const fr=new GB(),gl=new GB();const hTex=canvasTex(64,64,g=>{g.fillStyle='#f2c500';g.beginPath();g.arc(32,32,30,0,TAU);g.fill();g.strokeStyle='#1d7a3a';g.lineWidth=4;g.stroke();g.fillStyle='#1d7a3a';g.font='800 40px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('H',32,34);},false);
  BUS_STOPS.push(...stops);
  for(const s of stops){const c=Math.cos(s.face),sn=Math.sin(s.face);const P=(lx,lz)=>[s.x+c*lx+sn*lz,s.z-sn*lx+c*lz];
    for(const [lx,lz] of [[-2,-0.6],[2,-0.6],[-2,0.6],[2,0.6]]){const q=P(lx,lz);fr.box(q[0],0,q[1],0.08,2.5,0.08,s.face,WHITE,1);}const q0=P(0,0);fr.box(q0[0],2.5,q0[1],4.4,0.1,1.6,s.face,WHITE,1);
    const a=P(-2,-0.6),b=P(2,-0.6);gl.quadOut([a[0],0.15,a[1]],[b[0],0.15,b[1]],[b[0],2.45,b[1]],[a[0],2.45,a[1]],[0,0],[1,0],[1,1],[0,1],WHITE,[q0[0],1,q0[1]]);
    const e=P(-2,-0.6),f=P(-2,0.6);gl.quadOut([e[0],0.15,e[1]],[f[0],0.15,f[1]],[f[0],2.45,f[1]],[e[0],2.45,e[1]],[0,0],[1,0],[1,1],[0,1],WHITE,[q0[0],1,q0[1]]);
    const sp=P(2.6,0.4);fr.box(sp[0],0,sp[1],0.07,2.6,0.07,s.face,WHITE,1);const sign=new THREE.Mesh(new THREE.CircleGeometry(0.32,24),stdMat({map:hTex,side:THREE.DoubleSide}));sign.position.set(sp[0],2.85,sp[1]);sign.rotation.y=s.face;scene.add(sign);
    SOLIDS.push({k:'obb',x:q0[0],z:q0[1],w:4.4,d:1.6,rot:s.face,h:2.6});rasterOBB(HG,q0[0],q0[1],4.4,1.4,s.face,3);}
  if(!fr.empty){const m=new THREE.Mesh(fr.geo(),stdMat({color:0x3a3f44,metalness:0.6,roughness:0.4}));m.castShadow=true;scene.add(m);const g2=new THREE.Mesh(gl.geo(),new THREE.MeshPhysicalMaterial({color:0xcfe3ea,roughness:0.05,transmission:0,transparent:true,opacity:0.28,side:THREE.DoubleSide,depthWrite:false}));scene.add(g2);}
  for(const p of pillars)rasterCirc(HG,p.x,p.z,0.65,3);for(const b of bollards)rasterCirc(HG,b.x,b.z,0.15,1);
  // Ampeln
  const tl=[];const sigNodes=new Set();
  for(let i=0;i<OSM.signals.length;i+=2){const x=OSM.signals[i]/10,z=OSM.signals[i+1]/10;const n=nearestNode(x,z,true);if(n>=0&&Math.hypot(NODES[n].x-x,NODES[n].z-z)<3)sigNodes.add(n);}
  for(const n of sigNodes){const N=NODES[n];const es=N.e.filter(e=>EDGES[e].car);let trim=0;for(const e of es){const r=EDGES[e].road;trim=Math.max(trim,r.w/2+r.sw*0.4);}if(es.length<3)trim=3;
    es.forEach((e,k)=>{const E=EDGES[e];if(E.ow&&E.b!==n)return;const o=NODES[edgeOther(e,n)];const d=[(o.x-N.x)/E.len,(o.z-N.z)/E.len];const rt=[-d[1],d[0]];const l=-(E.road.w/2+0.9);
      const x=N.x+d[0]*(trim+0.6)+rt[0]*l,z=N.z+d[1]*(trim+0.6)+rt[1]*l;if(!free(x,z))return;tl.push({x,z,face:Math.atan2(d[0],d[1]),node:n,grp:Math.abs(d[0])>Math.abs(d[1])?1:0});});}
  TL_NODES=sigNodes;
  const tp=new GB();tp.beam([0,0,0],[0,3.4,0],0.12,0.12);tp.box(0,2.3,0.12,0.34,1.05,0.26,0,WHITE,1);
  instGeo(tp.geo(),stdMat({color:0x2a2d30,metalness:0.4,roughness:0.5}),tl);
  const bulbG=new THREE.CircleGeometry(0.1,12);const bulbs=[];for(let k=0;k<3;k++){const g=bulbG.clone().translate(0,3.12-k*0.32,0.26);const im=instGeo(g,new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:true}),tl,false);bulbs.push(im);}
  if(bulbs[0]){for(const im of bulbs){im.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(tl.length*3),3);}TL_MESH={bulbs,list:tl};updateTrafficLights(0);}
  for(const t of tl)rasterCirc(HG,t.x,t.z,0.15,3);
}
function updateTrafficLights(time){if(!TL_MESH)return;const cyc=24;const {bulbs,list}=TL_MESH;const cols=[[3,0.15,0.1],[3,1.6,0.1],[0.2,3,0.6]];
  list.forEach((t,i)=>{const ph=((time+t.node*3.7)%cyc)/cyc;const a=t.grp?(ph+0.5)%1:ph;const state=a<0.42?2:a<0.5?1:0;for(let k=0;k<3;k++){const on=(k===0&&state===0)||(k===1&&state===1)||(k===2&&state===2);const c=cols[k];const f=on?1:0.07;bulbs[k].instanceColor.setXYZ(i,c[0]*f,c[1]*f,c[2]*f);}});
  for(const b of bulbs)b.instanceColor.needsUpdate=true;}
