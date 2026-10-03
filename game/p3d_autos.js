// ===================== AUTOS: runde, prozedurale Karosserien für Straßenautos (eigener Code) =====================
// Seitenlinie (Haube, A-Säule, Dach, Heck) als Kurven je Typ, Querschnitt mit Tumblehome und gerundeten Kanten,
// ausgeschnittene Radläufe, Glashaus als eigene dunkle Glasfläche. Geometrie je Typ einmal erzeugt und von allen Autos
// geteilt, zwei LOD-Stufen (nah ~4k, fern ~0,5k Dreiecke). Je Auto drei Draw-Calls: Lack, Glas, Anbauteile – Räder,
// Leuchten, Kennzeichen und Zierteile liegen in einem Mesh (Farbe/Rauheit/Leuchten als Vertex-Attribute,
// Räder drehen und lenken im Vertex-Shader). Busse, Zweiräder, Boote, Flugzeuge behalten ihre bisherige Geometrie.
const AUTOS_PTS0=['bc','bo','bk','ls','wd','us','sr','st','gb','gm','gt','rc','rh','tc'];
const AUTOS_PTS1=['bc','bk','wd','sr','gb','rc','tc'];
const AUTOS_UV0=[0.5,0.078];// weißer Streifen unten in der Kennzeichen-Textur
function autosLin(h){const f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return [f(h>>16&255),f(h>>8&255),f(h&255)];}
let autosStId=0;
function autosSt(hex,r,m,g=0,w=0){return {c:autosLin(hex),r,m,g,w,id:++autosStId};}
const AUTOS_ST={under:autosSt(0x1a1b1d,0.95,0),sill:autosSt(0x26272a,0.7,0),seal:autosSt(0x0e0f10,0.4,0.2),pillar:autosSt(0x08090a,0.15,0.4),
  glass1:autosSt(0x15191e,0.12,0.6),lamp:autosSt(0x0c0d0f,0.2,0.5),lens:autosSt(0xdfe5ee,0.06,0.4,1),drl:autosSt(0xffffff,0.1,0,1),
  amber:autosSt(0xff9a1a,0.2,0,5),tail:autosSt(0xc0141a,0.15,0.1,2),tailDk:autosSt(0x500a0d,0.2,0.1,2),
  grille:autosSt(0x101113,0.5,0.3),slat:autosSt(0x34373c,0.3,0.7),plate:autosSt(0xffffff,0.5,0),mirror:autosSt(0x121315,0.3,0.3),
  handle:autosSt(0x1d1e20,0.3,0.6),line:autosSt(0x050505,0.85,0),chrome:autosSt(0xd0d4d8,0.12,1),
  tire:autosSt(0x181818,0.92,0),rim:autosSt(0xb8bdc3,0.28,0.9),dish:autosSt(0x1e2023,0.5,0.4),hub:autosSt(0xa4a9af,0.3,0.9),
  blue:autosSt(0x1d3f9a,0.35,0.1),sirL:autosSt(0x2a5cff,0.15,0.1,3),sirR:autosSt(0x2a5cff,0.15,0.1,4),bar:autosSt(0x15161a,0.4,0.3),
  taxi:autosSt(0xf2c500,0.4,0,5),dk:autosSt(0x0d0d0f,0.7,0),leather:autosSt(0x6b3d24,0.6,0),wheel1:autosSt(0x202124,0.8,0.2)};
function autosIs(T){return !!T&&!T.bike&&!T.kart&&!T.boat&&!T.plane&&!T.bus&&!T.hubi&&(!!T.van||!!T.rear);}

// ---------- Profil je Typ ----------
function autosProfile(T){const hf=T.L/2,van=!!T.van;
  const P={T,hf,hw:T.W/2,W:T.W,H:T.H,wr:T.wr,wb:T.wb,van,c:Math.max(0.24,T.wr*0.84),R:T.wr+(van?0.06:0.075),crown:van?0.025:0.035,flare:van?0.006:0.014,
    round:!!T.chrome,headF:[0.68,0.92],tailF:[0.62,0.9],headIn:[0.5,0.58],tailIn:[0.56,0.6],grille:[0.48,0.66,0.3,0.36],plateF:0.3,plateR:0.42,wrap:0.22,sill:!T.chrome};
  if(van){const big=T.L>7;P.belt=T.H*0.49;P.yN=P.belt-0.22;P.zW0=hf-(big?0.25:0.45);P.zW1=P.zW0-(big?0.3:0.62);P.zRt=-hf+0.05;P.zRb=-hf+0.01;
    P.sideTo=hf-(big?2.1:1.95);P.backGlass=false;P.tumble=0.07;P.Rf=0.35;P.cf=0.07;P.Rr=0.2;P.cr=0.04;P.Rn=0.12;P.Rt=0.06;P.rise=0;P.tailDrop=0.03;P.tl=0.1;
    P.headF=[0.62,0.86];P.headIn=[0.6,0.64];P.tailF=[0.25,0.75];P.tailIn=[0.8,0.8];P.grille=[0.45,0.66,0.45,0.42];P.plateF=0.28;P.plateR=0.18;P.wrap=0.1;P.sill=false;
    const dF=P.wb/2-P.R-0.04;P.doorZ=[dF,P.sideTo,P.sideTo-1.15];P.handleZ=[P.sideTo+0.2,P.sideTo-0.95];P.bands=[];}
  else{const r=T.rear;P.belt=T.belt;P.yN=T.belt-0.17-(r==='coupe'?0.03:0);P.zW0=hf-T.hood;P.zW1=P.zW0-T.ws;
    if(r==='sedan'){const rb=-hf+T.trunk;P.zRt=rb+T.rw;P.zRb=rb;}
    else if(r==='coupe'){P.zRt=P.zW1-T.roofL;P.zRb=-hf+0.35;}
    else if(r==='cabrio'){P.zRt=P.zW1-0.05;P.zRb=P.zW1-0.12;}
    else if(r==='pickup'){const cr=P.zW1-T.cabL;P.zRt=cr+0.1;P.zRb=cr;}
    else{P.zRt=-hf+T.rr+0.07;P.zRb=-hf+0.05;}
    P.backGlass=r!=='cabrio';
    P.sideTo=r==='sedan'?P.zRt+0.16:r==='coupe'?P.zRt-Math.max(0.2,(P.zRt-P.zRb)*0.35):r==='cabrio'?P.zW1-0.02:r==='pickup'?P.zRt+0.14:P.zRt+0.1;
    P.tumble=r==='coupe'?0.2:0.16;P.Rf=0.6;P.cf=T.chrome?0.1:0.15;P.Rr=0.45;P.cr=0.11;P.Rn=0.16;P.Rt=0.14;P.rise=0.04;P.tailDrop=(r==='sedan'||r==='coupe')?0.12:0.1;P.tl=0.3;
    if(T.chrome)P.flare=0.03;
    const dF=Math.min(P.zW0-0.08,P.wb/2-P.R-0.05);P.bands=[];
    if(r==='coupe'||r==='cabrio'){const dR=dF-1.25;P.doorZ=[dF,dR];P.handleZ=[dR+0.2];if(r==='coupe'&&dR>P.sideTo+0.1)P.bands.push([dR-0.03,dR+0.03]);}
    else{const dR=-P.wb/2+P.R*0.35,zB=dF-0.53*(dF-dR);P.doorZ=[dF,zB,dR];P.handleZ=[zB+0.18,dR+0.2];P.bands.push([zB-0.05,zB+0.05]);
      if(r==='wagon'){const zC=dR-0.05;if(zC>P.sideTo+0.25)P.bands.push([zC-0.05,zC+0.05]);}}}
  return P;}
function autosDeck(P,z){const hf=P.hf,yB=P.belt+0.03;let y;
  if(z>=P.zW0){const t=Math.min(1,Math.max(0,(hf-z)/(hf-P.zW0)));y=P.yN+(yB-P.yN)*Math.pow(Math.sin(t*Math.PI/2),0.7);}
  else y=yB+P.rise*(P.zW0-z)/(P.zW0+hf);
  if(z<-hf+P.tl){const s=Math.min(1,((-hf+P.tl)-z)/P.tl);y-=P.tailDrop*s*s;}
  return y;}
function autosRoof(P,z){if(z>=P.zW0)return 0;const yT=P.H-P.crown-0.02;
  if(z>=P.zW1){const u=(P.zW0-z)/(P.zW0-P.zW1),y0=autosDeck(P,P.zW0);return y0+(yT-y0)*(0.55*u+0.45*(1-(1-u)*(1-u)));}
  if(z>=P.zRt){const q=(z-(P.zW1+P.zRt)/2)/Math.max(0.01,(P.zW1-P.zRt)/2);return yT+0.02*(1-q*q);}
  if(z>=P.zRb){const v=(z-P.zRb)/Math.max(0.01,P.zRt-P.zRb),y0=autosDeck(P,P.zRb);return y0+(yT-y0)*(0.5*v+0.5*(1-(1-v)*(1-v)));}
  return 0;}
function autosArchY(P,z){let ya=0;for(const zc of [P.wb/2,-P.wb/2]){const dz=z-zc;if(Math.abs(dz)<P.R)ya=Math.max(ya,P.wr+0.03+Math.sqrt(P.R*P.R-dz*dz));}return ya;}
function autosHalfW(P,z){let w=P.hw;const hf=P.hf;
  if(z>hf-P.Rf){const t=Math.min(1,(z-(hf-P.Rf))/P.Rf);w-=P.cf*(1-Math.sqrt(1-t*t));}
  if(z<-hf+P.Rr){const t=Math.min(1,((-hf+P.Rr)-z)/P.Rr);w-=P.cr*(1-Math.sqrt(1-t*t));}
  for(const zc of [P.wb/2,-P.wb/2]){const d=Math.abs(z-zc)/(P.R+0.3);if(d<1)w+=P.flare*(1+Math.cos(d*Math.PI))/2;}
  return w;}
// Halber Querschnitt (rechte Seite, x≥0) an Station z, Punkte von Unterboden-Mitte bis Dach-Mitte
function autosRing(P,z){const hf=P.hf;z=Math.max(-hf,Math.min(hf,z));
  const yd=autosDeck(P,z),yr=Math.max(yd,autosRoof(P,z)),gh=yr-yd,W2=autosHalfW(P,z);
  const ya=autosArchY(P,z),yb=Math.min(Math.max(P.c,ya),yd-0.1),fb=ya>0?Math.max(0,ya+0.1-yd):0,yl=yd-yb;
  const k=Math.min(1,gh/0.25),tb=P.tumble*Math.max(k,0.25),gw=W2-0.11,gt=gw-tb,cr=P.crown,g0=yd+0.005;
  const R={bc:[0,yb],bo:[W2-0.16,yb],bk:[W2-0.03,yb+Math.min(0.05,0.2*yl)],ls:[W2-0.006,yb+0.36*yl],wd:[W2,yb+0.62*yl+fb*0.3],us:[W2-0.012,yb+0.86*yl+fb*0.7],
    sr:[W2-0.04,yd-0.015+fb],st:[W2-0.085,yd+fb*0.9],gb:[gw,g0+fb*0.4],gm:[gw-tb*0.5,g0+0.5*gh],gt:[gw-tb*0.92,g0+0.88*gh],rc:[gt-0.06*k-0.02,Math.max(g0+0.003,yr-0.004)],
    rh:[gt*0.5,yr+cr*0.75],tc:[0,yr+cr]};
  // Bug/Heck: Querschnitt zur Spitze hin verkleinern → runde Kanten zur Front-/Heckfläche
  let kk=0;if(z>hf-P.Rn){const s=Math.min(1,(z-(hf-P.Rn))/P.Rn);kk=1-Math.sqrt(1-s*s);}else if(z<-hf+P.Rt){const s=Math.min(1,((-hf+P.Rt)-z)/P.Rt);kk=1-Math.sqrt(1-s*s);}
  const yc=(yb+yd)/2,sx=1-0.09*kk/W2,sy=1-0.06*kk/Math.max(0.1,yl/2);
  if(kk>0)for(const n in R){R[n][0]*=sx;R[n][1]=yc+(R[n][1]-yc)*sy;}
  R.yb=yc+(yb-yc)*sy;R.yd=yc+(yd-yc)*sy;R.W2=W2*sx;R.gh=gh;return R;}
function autosZone(P,z){return z>P.zW0?'hood':z>P.zW1?'ws':z>P.zRt?'roof':z>P.zRb?'back':'deck';}
function autosStations(P,lod){const hf=P.hf,hard=[],soft=[];
  const nT=lod?1:4;for(let k=0;k<=nT;k++){const s=Math.sin(k/nT*Math.PI/2);hard.push(hf-P.Rn+P.Rn*s,-hf+P.Rt-P.Rt*s);}
  const nA=lod?2:8;for(const zc of [P.wb/2,-P.wb/2])for(let k=0;k<=nA;k++)hard.push(zc+P.R*Math.cos(k/nA*Math.PI));
  hard.push(P.zW0,P.zW1,P.zRt,P.zRb,P.sideTo);
  if(!lod){for(const b of P.bands)hard.push(b[0],b[1]);soft.push(P.zW1+0.07,P.zW1+0.16,P.zW0-0.06,P.zRt-0.07,P.zRt+0.12,hf-P.Rn-0.12,hf-P.Rn-0.3,P.zRb+0.08);}
  const step=lod?0.9:0.2;for(let z=hf-P.Rn;z>-hf+P.Rt;z-=step)soft.push(z);
  const H=[...new Set(hard.filter(z=>z>=-hf&&z<=hf))].sort((a,b)=>b-a).filter((z,i,a)=>i===0||a[i-1]-z>0.004);
  const md=lod?0.3:0.07;const out=H.slice();
  for(const z of soft.filter(z=>z>-hf&&z<hf).sort((a,b)=>b-a))if(out.every(q=>Math.abs(q-z)>md))out.push(z);
  return out.sort((a,b)=>b-a);}

// ---------- Puffer ----------
class AutosBuf{constructor(full){this.full=full;this.p=[];this.n=[];this.c=[];this.m=[];this.t=[];this.i=[];this.vm=new Map();}
  v(p,n,s,uv){this.p.push(p[0],p[1],p[2]);this.n.push(n[0],n[1],n[2]);if(this.full){this.c.push(s.c[0],s.c[1],s.c[2]);this.m.push(s.r,s.m,s.g,s.w);const q=uv||AUTOS_UV0;this.t.push(q[0],q[1]);}return this.p.length/3-1;}
  // Wicklung richtet sich nach den Vertex-Normalen; Dreiecke ohne Fläche entfallen
  tri(a,b,c){const P=this.p,N=this.n,A=[P[a*3],P[a*3+1],P[a*3+2]],f=cross3(sub3([P[b*3],P[b*3+1],P[b*3+2]],A),sub3([P[c*3],P[c*3+1],P[c*3+2]],A));
    if(Math.hypot(f[0],f[1],f[2])<1e-9)return;const d=f[0]*(N[a*3]+N[b*3]+N[c*3])+f[1]*(N[a*3+1]+N[b*3+1]+N[c*3+1])+f[2]*(N[a*3+2]+N[b*3+2]+N[c*3+2]);
    if(d<0)this.i.push(a,c,b);else this.i.push(a,b,c);}
  quad(a,b,c,d){this.tri(a,b,c);this.tri(a,c,d);}
  get tris(){return this.i.length/3;}
  geo(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.p),3));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(this.n),3));
    if(this.full){g.setAttribute('color',new THREE.BufferAttribute(Uint8Array.from(this.c,x=>Math.max(0,Math.min(255,Math.round(x*255)))),3,true));
      g.setAttribute('aM',new THREE.BufferAttribute(Uint8Array.from(this.m,(x,i)=>i%4<2?Math.round(x*255):x),4,true));
      g.setAttribute('uv',new THREE.BufferAttribute(Uint16Array.from(this.t,x=>Math.round(Math.max(0,Math.min(1,x))*65535)),2,true));}
    const nv=this.p.length/3;g.setIndex(new THREE.BufferAttribute(nv>65535?new Uint32Array(this.i):new Uint16Array(this.i),1));g.computeBoundingSphere();
    this.p=this.n=this.c=this.m=this.t=this.i=null;this.vm=null;return g;}}

// ---------- Karosserie-Loft ----------
function autosSegStyle(P,nm,zone,z,gh,lod){const S=AUTOS_ST,gr=gh>0.04;
  switch(nm){
    case 'bc':case 'bo':return S.under;
    case 'bk':return !lod&&P.sill&&z<P.wb/2-P.R&&z>-P.wb/2+P.R?S.sill:'paint';
    case 'st':return gr?S.seal:'paint';
    case 'gb':case 'gm':{if(!gr)return 'paint';if(P.bands.some(b=>z>b[0]&&z<b[1]))return lod?S.glass1:S.pillar;if(z<=P.zW0&&z>=P.sideTo)return lod?S.glass1:'glass';return 'paint';}
    case 'rc':case 'rh':return gh>0.02&&(zone==='ws'||(zone==='back'&&P.backGlass))?(lod?S.glass1:'glass'):'paint';
    default:return 'paint';}}
function autosLoft(P,lod,paint,glass,trim){const names=lod?AUTOS_PTS1:AUTOS_PTS0,n=names.length,K=2*n-2;const zs=autosStations(P,lod),S=zs.length;
  const G=[],RS=[];for(const z of zs){const R=autosRing(P,z);RS.push(R);const row=[];for(let j=0;j<n;j++){const q=R[names[j]];row.push([q[0],q[1],z]);}for(let j=n-2;j>=1;j--){const q=R[names[j]];row.push([-q[0],q[1],z]);}G.push(row);}
  const N=[];for(let i=0;i<S;i++){const row=[];for(let k=0;k<K;k++){const ti=sub3(G[Math.min(S-1,i+1)][k],G[Math.max(0,i-1)][k]),tk=sub3(G[i][(k+1)%K],G[i][(k-1+K)%K]);const c=cross3(tk,ti),l=Math.hypot(c[0],c[1],c[2]);row.push(l>1e-10?[c[0]/l,c[1]/l,c[2]/l]:[0,1,0]);}N.push(row);}
  const kw=names.indexOf('wd'),im=S>>1;if(N[im][kw][0]<0)for(const row of N)for(const v of row){v[0]=-v[0];v[1]=-v[1];v[2]=-v[2];}
  const vid=(B,i,k,s)=>{const key=(s&&B.full?s.id:0)*1e7+i*4096+k;let id=B.vm.get(key);if(id===undefined){id=B.v(G[i][k],N[i][k],s||AUTOS_ST.under);B.vm.set(key,id);}return id;};
  for(let i=0;i<S-1;i++){const zm=(zs[i]+zs[i+1])/2,gh=(RS[i].gh+RS[i+1].gh)/2,zone=autosZone(P,zm);
    for(let k=0;k<K;k++){const nm=k<n-1?names[k]:names[K-k-1];const st=autosSegStyle(P,nm,zone,zm,gh,lod);
      const B=st==='paint'?paint:st==='glass'?glass:trim,s=typeof st==='string'?null:st;const k1=(k+1)%K;
      B.quad(vid(B,i,k,s),vid(B,i+1,k,s),vid(B,i+1,k1,s),vid(B,i,k1,s));}}
  // Front- und Heckfläche schließen
  for(const [i,sz] of [[0,1],[S-1,-1]]){const row=G[i];let cy=0;for(const q of row)cy+=q[1];cy/=K;const nn=[0,0,sz];const c0=paint.v([0,cy,row[0][2]],nn);const ids=row.map(q=>paint.v(q,nn));for(let k=0;k<K;k++)paint.tri(c0,ids[k],ids[(k+1)%K]);}}

// ---------- Anbauteile ----------
function autosSide(P,z,y){const R=autosRing(P,z);const ch=['bk','ls','wd','us','sr','st'];let prev=R.bk;if(y<=prev[1])return prev[0];
  for(let j=1;j<ch.length;j++){const q=R[ch[j]];if(y<=q[1]){const t=(y-prev[1])/Math.max(1e-6,q[1]-prev[1]);return prev[0]+(q[0]-prev[0])*t;}prev=q;}return prev[0];}
function autosSideN(P,z,y){const e=0.01,fy=(autosSide(P,z,y+e)-autosSide(P,z,y-e))/(2*e),fz=(autosSide(P,z+e,y)-autosSide(P,z-e,y))/(2*e),l=Math.hypot(1,fy,fz);return [1/l,-fy/l,-fz/l];}
// Fläche, die der Karosserieseite folgt (beidseitig); y0/y1 als Funktion von z, uvf(a,b,sx) optional
function autosPatch(P,B,z0,z1,nz,y0,y1,ny,off,s,uvf){for(const sx of [1,-1]){const ids=[];
  for(let a=0;a<=nz;a++){const z=z0+(z1-z0)*a/nz,ya=y0(z),yb=y1(z);for(let b=0;b<=ny;b++){const y=ya+(yb-ya)*b/ny,n=autosSideN(P,z,y),x=autosSide(P,z,y);
    ids.push(B.v([sx*(x+n[0]*off),y+n[1]*off,z+n[2]*off],[sx*n[0],n[1],n[2]],s,uvf?uvf(a/nz,b/ny,sx):null));}}
  for(let a=0;a<nz;a++)for(let b=0;b<ny;b++){const i0=a*(ny+1)+b;B.quad(ids[i0],ids[i0+ny+1],ids[i0+ny+2],ids[i0+1]);}}}
function autosPoly(B,pts,z,nz,off,s,mirror=true){for(const sx of (mirror?[1,-1]:[1])){let cx=0,cy=0;for(const p of pts){cx+=p[0]/pts.length;cy+=p[1]/pts.length;}
  const n=[0,0,nz],c0=B.v([sx*cx,cy,z+nz*off],n,s),ids=pts.map(p=>B.v([sx*p[0],p[1],z+nz*off],n,s));for(let k=0;k<ids.length;k++)B.tri(c0,ids[k],ids[(k+1)%ids.length]);}}
function autosBox(B,c,sz,s){const h=[sz[0]/2,sz[1]/2,sz[2]/2];
  for(const [ax,sg] of [[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]]){const n=[0,0,0];n[ax]=sg;const u=(ax+1)%3,v=(ax+2)%3;
    const ids=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{const p=[0,0,0];p[ax]=c[ax]+sg*h[ax];p[u]=c[u]+a*h[u];p[v]=c[v]+b*h[v];return B.v(p,n,s);});B.quad(ids[0],ids[1],ids[2],ids[3]);}}
function autosEll(B,c,r,s,seg,rings){const ids=[];for(let a=0;a<=rings;a++){const th=a/rings*Math.PI;for(let b=0;b<=seg;b++){const ph=b/seg*Math.PI*2,u=[Math.sin(th)*Math.cos(ph),Math.cos(th),Math.sin(th)*Math.sin(ph)];
    const nn=[u[0]/r[0],u[1]/r[1],u[2]/r[2]],l=Math.hypot(nn[0],nn[1],nn[2]);ids.push(B.v([c[0]+u[0]*r[0],c[1]+u[1]*r[1],c[2]+u[2]*r[2]],[nn[0]/l,nn[1]/l,nn[2]/l],s));}}
  for(let a=0;a<rings;a++)for(let b=0;b<seg;b++){const i0=a*(seg+1)+b;B.quad(ids[i0],ids[i0+seg+1],ids[i0+seg+2],ids[i0+1]);}}
// Rotationskörper um die Radachse (x); Profil [t (seitlich, außen +), r (Anteil am Radradius)]
function autosLathe(B,c,sx,prof,wr,sc,s,seg){const rows=[];for(let k=0;k<=seg;k++){const a=k/seg*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),row=[];
    for(let j=0;j<prof.length;j++){const [t,r]=prof[j],p0=prof[Math.max(0,j-1)],p1=prof[Math.min(prof.length-1,j+1)];let nt=-(p1[1]-p0[1])*wr,nr=(p1[0]-p0[0])*sc;const l=Math.hypot(nt,nr)||1;nt/=l;nr/=l;
      row.push(B.v([c[0]+sx*t*sc,c[1]+r*wr*ca,c[2]+r*wr*sa],[sx*nt,nr*ca,nr*sa],s));}rows.push(row);}
  for(let k=0;k<seg;k++)for(let j=0;j<prof.length-1;j++)B.quad(rows[k][j],rows[k+1][j],rows[k+1][j+1],rows[k][j+1]);}
function autosWheels(P,B,lod){const S=AUTOS_ST,wr=P.wr,xo=P.W/2-0.135,hz=P.wb/2,sc=0.8+0.6*wr;
  for(const [sx,sz,w] of [[1,1,1],[-1,1,2],[1,-1,3],[-1,-1,4]]){const c=[sx*xo,wr,sz*hz];
    if(lod){autosLathe(B,c,sx,[[-0.1,0.96],[0.1,0.96]],wr,sc,S.tire,6);autosLathe(B,c,sx,[[0.1,0.96],[0.1,0]],wr,sc,S.wheel1,6);continue;}
    const st=o=>Object.assign({},o,{w});
    autosLathe(B,c,sx,[[-0.11,0.66],[-0.115,0.86],[-0.1,0.97],[-0.07,1],[0.07,1],[0.1,0.97],[0.115,0.86],[0.105,0.7]],wr,sc,st(S.tire),16);
    autosLathe(B,c,sx,[[0.105,0.7],[0.098,0.63],[0.03,0.6]],wr,sc,st(S.rim),16);
    autosLathe(B,c,sx,[[0.03,0.6],[0.03,0]],wr,sc,st(S.dish),16);
    autosLathe(B,c,sx,[[0.06,0.17],[0.1,0.16],[0.11,0.1],[0.112,0]],wr,sc,st(S.hub),10);
    const rs=st(S.rim);for(let k=0;k<5;k++){const a=k/5*Math.PI*2+0.3,er=[0,Math.cos(a),Math.sin(a)],ea=[0,-Math.sin(a),Math.cos(a)];
      const P3=(t,r,q)=>[c[0]+sx*t*sc,c[1]+(er[1]*r+ea[1]*q)*wr,c[2]+(er[2]*r+ea[2]*q)*wr];const tf=0.094,tb=0.035,r0=0.15,r1=0.61,w0=0.075,w1=0.045;
      const fq=[P3(tf,r0,-w0),P3(tf,r1,-w1),P3(tf,r1,w1),P3(tf,r0,w0)],nf=[sx,0,0];const f=fq.map(p=>B.v(p,nf,rs));B.quad(f[0],f[1],f[2],f[3]);
      for(const sg of [-1,1]){const nn=[0,ea[1]*sg,ea[2]*sg];const q=[P3(tb,r0,sg*w0),P3(tb,r1,sg*w1),P3(tf,r1,sg*w1),P3(tf,r0,sg*w0)].map(p=>B.v(p,nn,rs));B.quad(q[0],q[1],q[2],q[3]);}}}}
function autosLamps(P,B,front,lod){const S=AUTOS_ST,z=front?P.hf:-P.hf,nz=front?1:-1,R=autosRing(P,z),yb=R.yb,yd=R.yd,W2=R.W2;
  const [fa,fb]=front?P.headF:P.tailF,y0=yb+(yd-yb)*fa,y1=yb+(yd-yb)*fb,ym=(y0+y1)/2,xo=y=>autosSide(P,z,y)-0.004;
  const [i0,i1]=front?P.headIn:P.tailIn,lens=front?S.lens:S.tail;
  if(P.round&&front){const r=(y1-y0)/2+0.01,cx=W2*0.64;const circ=(rr)=>Array.from({length:12},(_,k)=>[cx+Math.cos(k/12*Math.PI*2)*rr,ym+Math.sin(k/12*Math.PI*2)*rr]);
    autosPoly(B,circ(r+0.018),z,nz,0.003,S.chrome);autosPoly(B,circ(r),z,nz,0.006,lens);return;}
  const poly=[[xo(y1),y1],[W2*i0,y1],[W2*i1,y0],[xo(y0),y0],[xo(ym)+0.002,ym]];
  if(lod){autosPoly(B,poly,z,nz,0.005,lens);return;}
  const e=0.013;autosPoly(B,[[xo(y1+e),y1+e],[W2*i0-e,y1+e],[W2*i1-e,y0-e],[xo(y0-e),y0-e],[xo(ym)+0.002,ym]],z,nz,0.003,front?S.lamp:S.tailDk);
  autosPoly(B,poly,z,nz,0.006,lens);
  if(front){const t0=y1-0.008,t1=y1-0.024;autosPoly(B,[[xo(t0)-0.012,t0],[W2*i0+0.01,t0],[W2*i0+0.014,t1],[xo(t1)-0.012,t1]],z,nz,0.009,S.drl);
    if(!P.van){const a0=y0+0.006,a1=y0+0.026;autosPoly(B,[[xo(a0)-0.01,a0],[xo(a0)-0.12,a0],[xo(a1)-0.12,a1],[xo(a1)-0.01,a1]],z,nz,0.009,S.amber);}}
  const yf=f=>zz=>{const r=autosRing(P,zz);return r.yb+(r.yd-r.yb)*f;};
  autosPatch(P,B,front?P.hf-P.wrap:-P.hf,front?P.hf:-P.hf+P.wrap,8,yf(fa),yf(fb),2,0.009,lens);}
function autosFrontRear(P,B,lod){const S=AUTOS_ST;
  for(const front of [true,false]){const z=front?P.hf:-P.hf,nz=front?1:-1,R=autosRing(P,z),yb=R.yb,H=R.yd-R.yb,W2=R.W2,y=f=>yb+H*f,xo=yy=>autosSide(P,z,yy);
    if(front){const [g0,g1,a,b]=P.grille;autosPoly(B,[[-W2*a,y(g1)],[W2*a,y(g1)],[W2*b,y(g0)],[-W2*b,y(g0)]],z,nz,0.003,S.grille,false);
      if(!lod){for(const f of [0.4,0.7]){const yy=y(g0+(g1-g0)*f);autosPoly(B,[[-W2*a*0.97,yy+0.008],[W2*a*0.97,yy+0.008],[W2*a*0.97,yy-0.008],[-W2*a*0.97,yy-0.008]],z,nz,0.006,S.slat,false);}
        const c1=Math.min(W2*0.62,xo(y(0.2))-0.05),c2=Math.min(W2*0.55,xo(y(0.05))-0.06);autosPoly(B,[[-c1,y(0.2)],[c1,y(0.2)],[c2,y(0.05)],[-c2,y(0.05)]],z,nz,0.003,S.grille,false);}}
    else if(!lod){const d1=Math.min(W2*0.7,xo(y(0.13))-0.05),d2=Math.min(W2*0.6,xo(y(0.02))-0.06);autosPoly(B,[[-d1,y(0.13)],[d1,y(0.13)],[d2,y(0.02)],[-d2,y(0.02)]],z,nz,0.003,S.grille,false);}
    if(!lod){const yp=y(front?P.plateF:P.plateR),hw=0.26,hh=0.0575,zz=z+nz*0.011,n=[0,0,nz];
      const uv=[[0.004,0.5703],[0.996,0.5703],[0.996,0.992],[0.004,0.992]];const pts=[[-hw,yp-hh],[hw,yp-hh],[hw,yp+hh],[-hw,yp+hh]];
      const ids=pts.map((p,k)=>{const x=front?p[0]:-p[0];return B.v([x,p[1],zz],n,S.plate,uv[k]);});B.quad(ids[0],ids[1],ids[2],ids[3]);}}}
function autosDetails(P,B){const S=AUTOS_ST;
  // Außenspiegel
  const zM=P.zW0-(P.van?0.12:0.16),yD=autosDeck(P,zM),yM=yD+(P.van?0.25:0.07),xS=autosSide(P,zM,yD-0.02);
  for(const sx of [1,-1]){autosEll(B,[sx*(xS+0.1),yM+0.04,zM-0.02],P.van?[0.1,0.14,0.05]:[0.1,0.055,0.045],S.mirror,8,4);autosBox(B,[sx*(xS+0.03),yM,zM],[0.08,0.03,0.05],S.mirror);}
  // Fugen und Türgriffe
  for(const zd of P.doorZ)autosPatch(P,B,zd-0.004,zd+0.004,1,zz=>autosRing(P,zz).yb+0.06,zz=>autosDeck(P,zz)-0.025,4,0.0015,S.line);
  for(const zh of P.handleZ){const yh=autosDeck(P,zh)-0.085,x=autosSide(P,zh,yh);for(const sx of [1,-1])autosBox(B,[sx*(x+0.008),yh,zh],[0.025,0.028,0.14],S.handle);}}
function autosExtras(P,B,lod){const S=AUTOS_ST,T=P.T,H=P.H,W=P.W;
  if(T.police){const za=-P.wb/2+P.R+0.03,zb=P.wb/2-P.R-0.03,c=P.c,b=P.belt,ya=c+(b-c)*0.3,yb2=c+(b-c)*0.58;
    autosPatch(P,B,za,zb,lod?1:6,()=>ya,()=>yb2,lod?1:2,0.003,S.blue);
    if(!lod){const zc=(za+zb)/2;autosPatch(P,B,zc-0.55,zc+0.55,4,()=>ya+0.008,()=>yb2-0.008,1,0.005,AUTOS_ST.plate,(a,bb,sx)=>[sx>0?1-a:a,0.195+0.36*bb]);}
    const zl=P.zW1-0.45;autosBox(B,[0,H+0.015,zl],[0.95,0.05,0.28],S.bar);autosBox(B,[0.23,H+0.085,zl],[0.42,0.1,0.24],S.sirL);autosBox(B,[-0.23,H+0.085,zl],[0.42,0.1,0.24],S.sirR);}
  if(T.taxi){const zt=P.zW1-0.5,yt=H+0.1;autosBox(B,[0,yt,zt],[0.55,0.2,0.16],S.taxi);
    if(!lod)for(const s of [1,-1]){const zz=zt+s*0.083,n=[0,0,s],u=(x)=>s>0?x:1-x;const pts=[[-0.25,yt-0.08,0,0.195],[0.25,yt-0.08,1,0.195],[0.25,yt+0.08,1,0.555],[-0.25,yt+0.08,0,0.555]];
      const ids=pts.map(p=>B.v([p[0],p[1],zz],n,S.plate,[u(p[2]),p[3]]));B.quad(ids[0],ids[1],ids[2],ids[3]);}}
  if(T.rear==='cabrio'){const yB=P.belt;autosBox(B,[0,yB+0.03,P.zW1-0.85],[W-0.34,0.1,1.55],S.dk);
    for(const s of [-1,1]){autosBox(B,[s*0.42,yB+0.3,P.zW1-1.25],[0.5,0.4,0.18],S.leather);autosBox(B,[s*0.42,yB+0.6,P.zW1-1.32],[0.26,0.2,0.1],S.leather);}autosBox(B,[-0.42,yB+0.42,P.zW1-0.45],[0.36,0.04,0.36],S.dk);}
  if(T.rear==='pickup'){const cr=P.zRb,z0=-P.hf+0.14,z1=cr-0.06;autosBox(B,[0,autosDeck(P,z0)+0.0,(z0+z1)/2],[W-0.26,0.04,z1-z0],S.dk);}
  if(T.chrome){for(const s of [-1,1])autosBox(B,[0,P.c+0.14,s*(P.hf+0.03)],[W*0.96,0.1,0.08],S.chrome);
    if(!lod){const za=-P.wb/2+P.R+0.02,zb=P.wb/2-P.R-0.02,yy=P.c+(P.belt-P.c)*0.62;autosPatch(P,B,za,zb,4,()=>yy,()=>yy+0.025,1,0.003,S.chrome);}}}
function autosBuild(P,lod){const paint=new AutosBuf(false),glass=new AutosBuf(false),trim=new AutosBuf(true);
  autosLoft(P,lod,paint,glass,trim);autosLamps(P,trim,true,lod);autosLamps(P,trim,false,lod);autosFrontRear(P,trim,lod);autosWheels(P,trim,lod);if(!lod)autosDetails(P,trim);autosExtras(P,trim,lod);
  const st={paint:paint.tris,glass:glass.tris,trim:trim.tris};st.total=st.paint+st.glass+st.trim;
  return {paint:paint.geo(),glass:glass.geo(),trim:trim.geo(),stats:st};}
function autosGeo(id){const P=autosProfile(CAR_TYPES[id]);const l0=autosBuild(P,0),l1=autosBuild(P,1);AUTOS.stats[id]={l0:l0.stats,l1:l1.stats};
  return {auto:true,l0,l1,body:l0.paint,glass:l0.glass,det:l0.trim};}

// ---------- Materialien ----------
const AUTOS_U={uHead:{value:0.3}};
let AUTOS_GLASS=null;
function autosHiQ(q){return q==='ultra'||q==='hoch';}
function autosGlassMat(){if(AUTOS_GLASS)return AUTOS_GLASS;
  AUTOS_GLASS=autosHiQ(QUALITY)?new THREE.MeshPhysicalMaterial({color:0x0b0e12,roughness:0.04,metalness:0.2,clearcoat:1,clearcoatRoughness:0.03,envMapIntensity:1.5})
    :new THREE.MeshStandardMaterial({color:0x0b0e12,roughness:0.08,metalness:0.35,envMapIntensity:1.3});return AUTOS_GLASS;}
// Lack: Klarlack (MeshPhysical) auf Ultra/Hoch, günstiges MeshStandard auf Mittel/Niedrig
function autosPaintMat(color,q=QUALITY){return autosHiQ(q)?new THREE.MeshPhysicalMaterial({color,roughness:0.4,metalness:0.25,clearcoat:1,clearcoatRoughness:0.06})
  :new THREE.MeshStandardMaterial({color,roughness:0.32,metalness:0.3});}
function autosTrimCompile(sh){Object.assign(sh.uniforms,{uHead:AUTOS_U.uHead},this.userData.autosU);
  sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
attribute vec4 aM;varying vec4 vM;uniform float uSpin;uniform float uSteer;uniform vec3 uWh;uniform vec4 uSir;
vec3 autosXf(vec3 p,bool pos){float wc=floor(aM.w*255.0+0.5);if(wc>0.5){float sx=mod(wc,2.0)>0.5?1.0:-1.0;float sz=wc<2.5?1.0:-1.0;vec3 c=pos?vec3(sx*uWh.x,uWh.y,sz*uWh.z):vec3(0.0);
 vec3 v=p-c;float cs=cos(uSpin),sn=sin(uSpin);v=vec3(v.x,v.y*cs-v.z*sn,v.y*sn+v.z*cs);if(sz>0.0){float c2=cos(uSteer),s2=sin(uSteer);v=vec3(v.x*c2+v.z*s2,v.y,-v.x*s2+v.z*c2);}return c+v;}
 float gc=floor(aM.z*255.0+0.5);if(pos&&(gc==3.0||gc==4.0)&&uSir.z>0.5)return vec3(0.0);return p;}`)
    .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=autosXf(objectNormal,false);')
    .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=autosXf(transformed,true);vM=aM;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 vM;uniform float uHead;uniform vec4 uSir;')
    .replace('#include <roughnessmap_fragment>','float roughnessFactor=max(vM.x,0.04);').replace('#include <metalnessmap_fragment>','float metalnessFactor=vM.y;')
    .replace('vec3 totalEmissiveRadiance = emissive;',`float gc=floor(vM.z*255.0+0.5);float ge=gc==1.0?uHead*uSir.w:gc==2.0?emissive.r:gc==3.0?uSir.x:gc==4.0?uSir.y:gc==5.0?uHead*0.5*uSir.w:0.0;
vec3 totalEmissiveRadiance=vColor.rgb*ge;`);}
function autosTrimMat(c,tex){const T=c.T;const m=new THREE.MeshStandardMaterial({vertexColors:true,map:tex,emissive:0xffffff,emissiveIntensity:0.35,roughness:1,metalness:0});
  m.userData.autosU={uSpin:{value:0},uSteer:{value:0},uWh:{value:[T.W/2-0.135,T.wr,T.wb/2]},uSir:{value:[0,0,0,1]}};
  m.onBeforeCompile=autosTrimCompile;m.customProgramCacheKey=()=>'autosTrim1';return m;}
// Kennzeichen (oben), Schriftzug Polizei/Taxi (Mitte), weißer Streifen (unten) in einer Textur je Auto
function autosPlateTex(txt,T){const k=QS.lowLOD?0.5:1,c=document.createElement('canvas');c.width=256*k;c.height=128*k;const g=c.getContext('2d');g.scale(k,k);
  g.fillStyle='#fff';g.fillRect(0,0,256,128);
  g.fillStyle='#f4f4f0';g.fillRect(0,0,256,56);g.fillStyle='#003399';g.fillRect(0,0,26,56);g.fillStyle='#fc0';g.beginPath();g.arc(13,16,5,0,TAU);g.fill();g.fillStyle='#fff';g.font='700 14px Arial';g.textAlign='center';g.fillText('D',13,46);
  g.strokeStyle='#111';g.lineWidth=3;g.strokeRect(1.5,1.5,253,53);g.fillStyle='#111';g.font='700 36px "Barlow Condensed", Arial Narrow, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,142,30);
  if(T.police||T.taxi){g.fillStyle=T.police?'#1d3f9a':'#f2c500';g.fillRect(0,56,256,48);g.fillStyle=T.police?'#fff':'#111';g.save();g.translate(128,81);g.scale(T.police?0.78:1,1);
    g.font='800 40px "Barlow Condensed", Arial Narrow, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(T.police?'POLIZEI':'TAXI',0,0);g.restore();}
  const t=texFromCanvas(c,false);t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;return freeAfterUpload(t);}
// Aufbau eines Autos aus der geteilten Typ-Geometrie (aus dem Car-Konstruktor)
function autosDress(c,geo){const T=c.T;c.autoGeo=geo;c.bodyMat=autosPaintMat(c.color);c.plateTex=autosPlateTex(c.plateText,T);c.tailMat=autosTrimMat(c,c.plateTex);
  const mk=(g,m)=>{const me=new THREE.Mesh(g,m);me.castShadow=true;me.receiveShadow=true;c.g.add(me);return me;};
  c.bodyMesh=mk(geo.l0.paint,c.bodyMat);c.autoGlass=mk(geo.l0.glass,autosGlassMat());c.autoTrim=mk(geo.l0.trim,c.tailMat);
  c.autoP0=geo.l0.paint;c.autoLod=0;c.wheels=[];
  if(T.police){c.autoSir=[{visible:true,material:SIREN_OFF},{visible:true,material:SIREN_OFF}];c.sirens=c.autoSir;}
  if(QS.lowLOD)autosSetLod(c,1);}
function autosSetLod(c,l){if(!c.autoGeo||c.autoLod===l)return;c.autoLod=l;const G=c.autoGeo;
  c.bodyMesh.geometry=l?G.l1.paint:c.autoP0;c.autoTrim.geometry=l?G.l1.trim:G.l0.trim;c.autoGlass.visible=!l;}
const _autosSync=Car.prototype.sync;
Car.prototype.sync=function(dt){_autosSync.call(this,dt);if(!this.autoGeo)return;const u=this.tailMat.userData.autosU;
  u.uSpin.value=this.spin%(Math.PI*2);u.uSteer.value=this.steer*0.5;const s=u.uSir.value,S=this.autoSir;
  if(S&&this.sirens===S){s[0]=S[0].material===SIREN_ON?6:0;s[1]=S[1].material===SIREN_ON?6:0;s[2]=S[0].visible||S[1].visible?0:1;}s[3]=this.dead?0:1;};
// Beulen nur in der Nah-Geometrie (eigene Kopie erst beim ersten Crash, wie bisher)
const _autosDeform=Car.prototype.deform;
Car.prototype.deform=function(nx,nz,imp){if(!this.autoGeo)return _autosDeform.call(this,nx,nz,imp);const l=this.autoLod;this.bodyMesh.geometry=this.autoP0;
  _autosDeform.call(this,nx,nz,imp);this.autoP0=this.bodyMesh.geometry;if(l)this.bodyMesh.geometry=this.autoGeo.l1.paint;};
// LOD je Frame: fern (> ~60 m) einfache Geometrie, auf „Niedrig“ überall außer am Spielerauto
function updateAutos(){AUTOS_U.uHead.value=HEAD_MAT.emissiveIntensity;const cams=PLAYERS.map(P=>P.camera.position);
  for(const c of CARS){if(!c.autoGeo||c.removed)continue;let want=1;
    if(!QS.lowLOD||isPlayerCar(c)){let dm=1e18;for(const p of cams){const dx=c.x-p.x,dz=c.z-p.z;dm=Math.min(dm,dx*dx+dz*dz);}const lim=c.autoLod?AUTOS.lodDist-5:AUTOS.lodDist+5;want=dm>lim*lim?1:0;}
    autosSetLod(c,want);}}
const AUTOS={lodDist:60,stats:{},U:AUTOS_U,isAuto:id=>autosIs(CAR_TYPES[id]),setLod:autosSetLod,
  paintMatType:q=>{const m=autosPaintMat(0xffffff,q);const t=m.type;m.dispose();return t;},
  drawCalls(c){let n=0;c.g.traverse(o=>{if(o.isMesh&&o.visible&&o.geometry!==BLOB_G)n++;});return n;},
  summary(){const cars=CARS.filter(c=>c.autoGeo);return {stats:AUTOS.stats,cars:cars.length,lod1:cars.filter(c=>c.autoLod).length};}};
