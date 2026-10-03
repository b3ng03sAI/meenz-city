// Dünnbesetzte Raster in 64er-Kacheln: leere/gleichförmige Kacheln kosten kein RAM (wichtig fürs Handy)
// Kalte Kacheln (Paket 40.5 B, Pflege in p2f_hgcold.js) liegen lauflängenkodiert in rle[t] (Uint16Array):
// [0..64] = Startindex der Läufe je Zeile (Zeile y: rle[y]…rle[y+1]-1), danach je Lauf ((Länge-1)<<8)|Wert.
// Lesen aus einer kalten Kachel ohne Entpacken (≤ 64 Läufe der Zeile), Schreiben entpackt sie zuerst → Werte bleiben exakt.
// hot = Menge der rohen Kacheln (Kandidaten fürs Packen), crt = Kalt-Lesezähler je Kachel (für den LRU in p2f_hgcold.js).
function SGrid(W,H){const TW=Math.ceil(W/64),TH=Math.ceil(H/64);return {W,H,TW,TH,tiles:new Array(TW*TH).fill(null),uni:new Uint8Array(TW*TH),
  rle:new Array(TW*TH).fill(null),hot:new Set(),crt:null,want:[],cr:0,packs:0,unpacks:0};}
function sgGet(G,ix,iz){const t=(iz>>6)*G.TW+(ix>>6);const a=G.tiles[t];if(a)return a[((iz&63)<<6)|(ix&63)];const r=G.rle[t];return r?sgCold(G,r,t,ix&63,iz&63):G.uni[t];}
function sgCold(G,r,t,x,y){G.cr++;if(G.crt&&++G.crt[t]===2048)G.want.push(t);
  let s=0;for(let k=r[y],e=r[y+1];k<e;k++){const w=r[k];s+=(w>>8)+1;if(x<s)return w&255;}return 0;}
function sgSet(G,ix,iz,v){const t=(iz>>6)*G.TW+(ix>>6);let a=G.tiles[t];
  if(!a){if(G.rle[t])a=sgUnpack(G,t);else{if(G.uni[t]===v)return;a=G.tiles[t]=new Uint8Array(4096);if(G.uni[t])a.fill(G.uni[t]);G.hot.add(t);}}
  a[((iz&63)<<6)|(ix&63)]=v;}
const SG_BUF=new Uint16Array(65+4096);
function sgEncode(a){const B=SG_BUF;let n=65;
  for(let y=0;y<64;y++){B[y]=n;const o=y<<6;let v=a[o],L=1;for(let x=1;x<64;x++){const w=a[o+x];if(w===v)L++;else{B[n++]=((L-1)<<8)|v;v=w;L=1;}}B[n++]=((L-1)<<8)|v;}
  B[64]=n;return B.slice(0,n);}
function sgDecodeInto(r,a){for(let y=0;y<64;y++){let o=y<<6;for(let k=r[y],e=r[y+1];k<e;k++){const w=r[k],v=w&255,L=(w>>8)+1;
  if(L<8){for(let j=0;j<L;j++)a[o+j]=v;}else a.fill(v,o,o+L);o+=L;}}return a;}
// Rohe Kachel kalt machen: gleichförmig → uni (wie sgCompact), sonst RLE. true, wenn gepackt.
function sgPack(G,t){const a=G.tiles[t];if(!a)return false;const v=a[0];let u=true;for(let k=1;k<4096;k++)if(a[k]!==v){u=false;break;}
  if(u)G.uni[t]=v;else G.rle[t]=sgEncode(a);G.tiles[t]=null;G.hot.delete(t);G.packs++;return true;}
function sgUnpack(G,t){const r=G.rle[t];if(!r)return G.tiles[t];const a=sgDecodeInto(r,new Uint8Array(4096));G.tiles[t]=a;G.rle[t]=null;G.hot.add(t);G.unpacks++;return a;}
function sgCompact(G){let n=0;for(let t=0;t<G.tiles.length;t++){const a=G.tiles[t];if(!a)continue;const v=a[0];let u=true;for(let k=1;k<4096;k++)if(a[k]!==v){u=false;break;}if(u){G.tiles[t]=null;G.uni[t]=v;G.hot.delete(t);}else n++;}return n;}
const HGG=SGrid(WW,WH); // Höhenraster 1 m (0 frei, 1..254 Höhe, 255 Wasser)
const MF_W=Math.ceil(WW/2),MF_H=Math.ceil(WH/2),MFG=SGrid(MF_W,MF_H); // 2-m-Raster, Bits: 1 Park, 2 Straße, 4 Wasser
const HG={grid:HGG},MFLAG={grid:MFG};
function hgG(i){if(i<0)return 255;const iz=(i/WW)|0;return sgGet(HGG,i-iz*WW,iz);}
function hgS(i,v){if(i<0)return;const iz=(i/WW)|0;sgSet(HGG,i-iz*WW,iz,v);}
function mfi(i){if(i<0)return -1;const iz=(i/WW)|0,ix=i-iz*WW;return (iz>>1)*MF_W+(ix>>1);}
function mfG(i){if(i<0)return 0;const iz=(i/WW)|0,ix=i-iz*WW;return sgGet(MFG,ix>>1,iz>>1);}
function mfGj(j){const iz=(j/MF_W)|0;return sgGet(MFG,j-iz*MF_W,iz);}
function waterToHG(){for(let ty=0;ty<MFG.TH;ty++)for(let tx=0;tx<MFG.TW;tx++){const t=ty*MFG.TW+tx,a=MFG.tiles[t];
  if(!a){if(!(MFG.uni[t]&4))continue;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const hx=tx*2+dx,hy=ty*2+dy;if(hx>=HGG.TW||hy>=HGG.TH)continue;const h=hy*HGG.TW+hx;if(!HGG.tiles[h])HGG.uni[h]=255;else HGG.tiles[h].fill(255);}continue;}
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(a[(y<<6)|x]&4){const gx=(tx*64+x)*2,gy=(ty*64+y)*2;for(let dz=0;dz<2;dz++)for(let dx=0;dx<2;dx++)if(gx+dx<WW&&gy+dz<WH)sgSet(HGG,gx+dx,gy+dz,255);}}}
function gridCompact(){const a=sgCompact(HGG),b=sgCompact(MFG);return {hgTiles:a,mfTiles:b,mb:Math.round((a+b)*4096/1e6)};}
function idx(x,z){const ix=Math.floor(x-MINX),iz=Math.floor(z-MINZ);if(ix<0||iz<0||ix>=WW||iz>=WH)return -1;return iz*WW+ix;}
// Masken werden kachelweise gezeichnet (die Karte ist zu groß für eine Leinwand)
const MASK_T=2048;const maskC=document.createElement('canvas'); maskC.width=MASK_T; maskC.height=MASK_T;
const maskG=maskC.getContext('2d',{willReadFrequently:true});
function maskInto(arr,draw,thr=110,bit=1){if(maskC.width!==MASK_T){maskC.width=MASK_T;maskC.height=MASK_T;}const G=arr.grid;const S=arr===MFLAG?2:1,AW=arr===MFLAG?MF_W:WW,AH=arr===MFLAG?MF_H:WH;for(let ty=0;ty<AH;ty+=MASK_T)for(let tx=0;tx<AW;tx+=MASK_T){const w=Math.min(MASK_T,AW-tx),h=Math.min(MASK_T,AH-ty);
  maskG.setTransform(1,0,0,1,0,0);maskG.clearRect(0,0,MASK_T,MASK_T);maskG.setTransform(1/S,0,0,1/S,-MINX/S-tx,-MINZ/S-ty);maskG.fillStyle='#fff';maskG.strokeStyle='#fff';maskG.lineJoin='round';maskG.lineCap='round';
  draw(maskG,[MINX+tx*S,MINZ+ty*S,MINX+(tx+w)*S,MINZ+(ty+h)*S]);const d=maskG.getImageData(0,0,w,h).data;for(let y=0;y<h;y++){let j=y*w*4+3;for(let x=0;x<w;x++,j+=4)if(d[j]>thr){const gx=tx+x,gy=ty+y;sgSet(G,gx,gy,sgGet(G,gx,gy)|bit);}}}}
function pathPoly(g,poly){g.beginPath();g.moveTo(poly[0][0],poly[0][1]);for(let i=1;i<poly.length;i++)g.lineTo(poly[i][0],poly[i][1]);g.closePath();}
function fillShape(g,s){if(s.circle){g.beginPath();g.arc(s.circle[0],s.circle[1],s.circle[2],0,TAU);g.fill();}else{pathPoly(g,s.poly||s);g.fill();}}
function strokePts(g,pts,w){g.lineWidth=w;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.stroke();}
function rasterOBB(arr,x,z,w,d,rot,val){const c=Math.cos(rot),s=Math.sin(rot);const exx=c,exz=-s,ezx=s,ezz=c;const r=Math.hypot(w,d)/2+1;
  const x0=Math.floor(x-r),x1=Math.ceil(x+r),z0=Math.floor(z-r),z1=Math.ceil(z+r);
  for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){const dx=ix+0.5-x,dz=iz+0.5-z;const lx=dx*exx+dz*exz,lz=dx*ezx+dz*ezz;
    if(Math.abs(lx)<=w/2&&Math.abs(lz)<=d/2){const i=idx(ix+0.5,iz+0.5);if(i>=0){const o=hgG(i);if(o!==255&&o<val)hgS(i,val);}}}}
function rasterCirc(arr,x,z,r,val){for(let iz=Math.floor(z-r);iz<=Math.ceil(z+r);iz++)for(let ix=Math.floor(x-r);ix<=Math.ceil(x+r);ix++){const dx=ix+0.5-x,dz=iz+0.5-z;if(dx*dx+dz*dz<=r*r){const i=idx(ix+0.5,iz+0.5);if(i>=0){const o=hgG(i);if(o!==255&&o<val)hgS(i,val);}}}}
// Polygon mit Löchern rastern (Scanline, gerade-ungerade Regel)
function rasterPoly(arr,rings,val){let z0=1e9,z1=-1e9;for(const r of rings)for(const p of r){if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1];}
  for(let iz=Math.floor(z0);iz<=Math.ceil(z1);iz++){const zc=iz+0.5;const xs=[];
    for(const r of rings)for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[j],b=r[i];if((a[1]>zc)!==(b[1]>zc))xs.push(a[0]+(zc-a[1])/(b[1]-a[1])*(b[0]-a[0]));}
    xs.sort((a,b)=>a-b);for(let k=0;k+1<xs.length;k+=2){for(let ix=Math.ceil(xs[k]-0.5);ix<=Math.floor(xs[k+1]-0.5);ix++){const i=idx(ix+0.5,zc);if(i>=0){const o=hgG(i);if(o!==255&&o<val)hgS(i,val);}}}}}

// ===================== Farbpaletten =====================
const PAL={
  alt:[0xe8c98f,0xd9a07a,0xe2b4a8,0xc9d3c0,0xf0e3c8,0xb8c6d4,0xe6d2a4,0xd48f7c,0xefe6d6,0xc7a77f,0xd7b9d1,0xa9c4a0,0xf2d6a2,0xcf8b6a],
  city:[0xe9e1d0,0xd8cfbf,0xcfc3ad,0xe4d6bd,0xd6d0c6,0xc9bfae,0xead9b8,0xdcd2c4,0xe8dcc6,0xd3c8b4],
  sand:[0xc98c74,0xd9b48c,0xe2cfab,0xbf7b67,0xd8c7aa,0xcfa98a,0xe0d4c0,0xc7957a],
  fach:[0xffffff,0xf5ecdc,0xefe0c8,0xf7f0e6],
  modern:[0xd8d8d8,0xc9cdd0,0xe6e6e2,0xb9c3c9,0xa9b2b8,0xe2ddd2],
  tile:[0xc0603e,0xb0553a,0xa34f36,0xc86e46,0xb46242,0x9a4a34,0x8f4a38],
  slate:[0x6a707a,0x5c626b,0x767a82,0x4f555c],
};

// ---------- Straßengraph aus den gemeinsamen OSM-Knoten ----------
const NODES=[],EDGES=[];
function buildGraph(){
  const map=new Map();
  const nid=i=>{let n=map.get(i);if(n===undefined){n=NODES.length;NODES.push({x:RN[i][0],z:RN[i][1],e:[],osm:i});map.set(i,n);}return n;};
  for(const r of ROADS){r.nodes=[];for(let k=0;k<r.ids.length;k++)r.nodes.push(nid(r.ids[k]));
    for(let k=0;k<r.nodes.length-1;k++){const a=r.nodes[k],b=r.nodes[k+1];if(a===b)continue;const A=NODES[a],B=NODES[b];EDGES.push({a,b,len:Math.max(0.05,Math.hypot(B.x-A.x,B.z-A.z)),road:r,dead:false,ow:r.oneway});}}
  for(let i=0;i<EDGES.length;i++){NODES[EDGES[i].a].e.push(i);NODES[EDGES[i].b].e.push(i);}
  const carRoad=r=>r.type==='main'||r.type==='street';
  // größte Komponente für Autos
  const comp=new Int32Array(NODES.length).fill(-1);let best=-1,bestSize=0,cid=0;
  for(let s=0;s<NODES.length;s++){if(comp[s]>=0)continue;if(!NODES[s].e.some(e=>carRoad(EDGES[e].road)))continue;const st=[s];comp[s]=cid;let size=0;
    while(st.length){const n=st.pop();size++;for(const e of NODES[n].e){const E=EDGES[e];if(!carRoad(E.road))continue;const o=E.a===n?E.b:E.a;if(comp[o]<0){comp[o]=cid;st.push(o);}}}
    if(size>bestSize){bestSize=size;best=cid;}cid++;}
  for(const E of EDGES){E.car=carRoad(E.road)&&comp[E.a]===best&&comp[E.b]===best;}
  NODES.forEach((N,i)=>{N.car=comp[i]===best;N.deg=N.e.filter(e=>EDGES[e].road.type!=='path').length;});
  const H=new Map();NODES.forEach((N,i)=>{if(!N.e.length)return;const k=Math.floor(N.x/50)+','+Math.floor(N.z/50);if(!H.has(k))H.set(k,[]);H.get(k).push(i);});
  NODE_HASH=H;
}
let NODE_HASH=null;
function nearestNode(x,z,carOnly=true){const cx=Math.floor(x/50),cz=Math.floor(z/50);let best=-1,bd=1e18;
  for(let r=1;r<=5&&best<0;r++)for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const l=NODE_HASH.get((cx+a)+','+(cz+b));if(!l)continue;for(const n of l){const N=NODES[n];if(carOnly&&!N.car)continue;const d=(N.x-x)**2+(N.z-z)**2;if(d<bd){bd=d;best=n;}}}
  return best;}
function edgeOther(e,n){const E=EDGES[e];return E.a===n?E.b:E.a;}
// Darf man die Kante von Knoten n aus befahren? (Einbahnstraßen)
function edgeAllowed(e,from){const E=EDGES[e];return !E.ow||E.a===from;}
