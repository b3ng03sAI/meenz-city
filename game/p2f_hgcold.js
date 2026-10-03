// ===================== HG/MFLAG kalt komprimieren (Paket 40.5, Phase B) =====================
// Vertrag: .claude/plans/2026-10-03-welle-10.md, Plan §4B/§5/§10. Die Raster HG (1 m) und MFLAG (2 m) bleiben weltweit
// lesbar; roh („heiß“) liegen nur die Kacheln nahe den Spielern, der Rest lauflängenkodiert („kalt“, seg_masks.js).
//   heiß:  Kachel näher als 1000 m an einer Spieler-Kapsel (FRAMEB.pts: Position → Vorausschau) oder näher als 900 m an
//          einer Lazy-Zone, die gleich gebaut wird (damit der Zonenbau die Umgebung roh vorfindet)
//   kalt:  weiter als 1300 m bzw. 1200 m (Hysterese 300 m)
// Die Arbeit läuft in Paketen über FRAMEB: je 512-m-Block ein Paket („hg:u:bx,bz“ entpacken, Bias 0; „hg:p:bx,bz“ packen,
// Bias +3000) mit höchstens 64 HG- + 16 MFLAG-Kacheln. Sprung (FRAMEB.jump): < 300 m und die Umgebung der Zonen, die jetzt
// synchron gebaut werden, sofort roh. Ferne Viel-Leser (≥ 2048 kalte Lesezugriffe je Kachel in 0,25 s) bekommen ihre
// Kachel als LRU-Extra roh (höchstens 256).
const HGC={zoneBuildsCold:0,zoneBuildsNoted:0,hotR:1000,coldR:1300,zoneR:900,jumpR:300,tick:0.25,t:0,
  lru:[],lruMax:256,lruTTL:10,lruUnpacks:0,clock:0,cen:[],bootMs:0,bootPacked:0,jumpMs:0,jumpMax:0,jobMaxMs:0,jobs:0,ticks:0,
  get packs(){return HGG.packs+MFG.packs;},get unpacks(){return HGG.unpacks+MFG.unpacks;},get coldReads(){return HGG.cr+MFG.cr;},
  get rawBytes(){let n=0;for(const G of [HGG,MFG])for(const a of G.tiles)if(a)n+=a.byteLength;return n;},
  get rleBytes(){let n=0;for(const G of [HGG,MFG])for(const r of G.rle)if(r)n+=r.byteLength;return n;},
  // Zustand der HG- und MFLAG-Kachel unter (x,z): 'raw' | 'rle' | 'uni'
  tileState(x,z){const T=hgcTileAt(x,z);if(!T)return null;const st=(G,t)=>G.tiles[t]?'raw':G.rle[t]?'rle':'uni';return {hg:st(HGG,T.h),mf:st(MFG,T.m)};},
  // Vergleichswert: Kachel als Kopie entpacken (ohne Zähler, ohne Zustandswechsel)
  rawAt(x,z){const T=hgcTileAt(x,z);if(!T)return null;return {hg:hgcCopy(HGG,T.h)[T.hk],mf:hgcCopy(MFG,T.m)[T.mk]};},
  // Prüfsumme (CRC-32) der entpackten HG- und MFLAG-Kachel unter (x,z) – unabhängig vom Zustand
  crc(x,z){const T=hgcTileAt(x,z);if(!T)return null;return {hg:hgcCrc(hgcCopy(HGG,T.h)),mf:hgcCrc(hgcCopy(MFG,T.m))};},
  // Lesen/Schreiben über den normalen Weg (hgG/mfG bzw. hgS) – für Tests
  get(x,z){const i=idx(x,z);return {hg:hgG(i),mf:mfG(i)};},
  setHG(x,z,v){hgS(idx(x,z),v);},
  coldNear(x,z,R){return hgcColdNear(x,z,R);},
  // Kachel-Zähler je Zustand
  counts(){const c=G=>{let raw=0,rle=0;for(let t=0;t<G.tiles.length;t++){if(G.tiles[t])raw++;else if(G.rle[t])rle++;}return {raw,rle,uni:G.tiles.length-raw-rle};};return {hg:c(HGG),mf:c(MFG)};}};
function hgcTileAt(x,z){const ix=Math.floor(x-MINX),iz=Math.floor(z-MINZ);if(ix<0||iz<0||ix>=WW||iz>=WH)return null;
  const mx=ix>>1,mz=iz>>1;return {h:(iz>>6)*HGG.TW+(ix>>6),hk:((iz&63)<<6)|(ix&63),m:(mz>>6)*MFG.TW+(mx>>6),mk:((mz&63)<<6)|(mx&63)};}
function hgcCopy(G,t){const a=G.tiles[t];if(a)return a.slice();const r=G.rle[t];if(r)return sgDecodeInto(r,new Uint8Array(4096));return new Uint8Array(4096).fill(G.uni[t]);}
let hgcCRCT=null;
function hgcCrc(a){if(!hgcCRCT){hgcCRCT=new Int32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;hgcCRCT[n]=c;}}
  let c=-1;for(let i=0;i<a.length;i++)c=hgcCRCT[(c^a[i])&255]^(c>>>8);return (c^-1)>>>0;}

// Kachel-Geometrie: HG-Kachel 64 m, MFLAG-Kachel 128 m (64 Zellen à 2 m); Abstand = Mitte − halbe Diagonale
const hgcGrids=[{G:HGG,S:64,B:8},{G:MFG,S:128,B:4}]; // B = Kacheln je 512-m-Block und Achse
// Abstand eines Punkts zur Kapsel p (wie fbDist für einen Punkt)
function hgcCapD(p,x,z){const dx=p.ax-p.x,dz=p.az-p.z,L2=dx*dx+dz*dz;let t=L2>0?((x-p.x)*dx+(z-p.z)*dz)/L2:0;t=t<0?0:t>1?1:t;
  return Math.hypot(x-p.x-dx*t,z-p.z-dz*t);}
// „Heiß-Abstand“ eines Punkts: min über Kapseln (Radius hotR) und aktive Zonen (Radius zoneR, auf hotR normiert)
function hgcHotD(x,z){let d=1e9;for(const c of HGC.cen){const e=c.zone?Math.hypot(x-c.x,z-c.z)+HGC.hotR-HGC.zoneR:hgcCapD(c,x,z);if(e<d)d=e;}return d;}
function hgcTileD(g,t){const tx=t%g.G.TW,tz=(t/g.G.TW)|0,h=g.S/2;return hgcHotD(MINX+tx*g.S+h,MINZ+tz*g.S+h)-h*1.4143;}
// Zonen, die demnächst gebaut werden (oder gebaut sind) – deren 900-m-Umgebung soll roh sein, bevor der Bau beginnt
function hgcZones(pts){const out=[];if(typeof LAZY==='undefined')return out;const pre=(LAZY.rPre||0);
  for(const Z of LAZY.zones){let d=1e9;for(const p of pts){const e=hgcCapD(p,Z.x,Z.z);if(e<d)d=e;}
    if(Z.built||d<Math.max(Z.rIn||0,pre)+400)out.push({zone:true,x:Z.x,z:Z.z,d,Z});}
  return out;}
function hgcPts(){if(FRAMEB.pts.length)return FRAMEB.pts;const o=[];for(const P of PLAYERS){if(!P.h)continue;const p=ppos(P);o.push({x:p[0],z:p[1],ax:p[0],az:p[1]});}return o;}
function hgcCenters(){const pts=hgcPts();HGC.cen=pts.map(p=>({x:p.x,z:p.z,ax:p.ax,az:p.az})).concat(hgcZones(pts));}
// Kacheln (Index-Bereich) im Rechteck um einen Mittelpunkt c mit Radius R
function hgcEachNear(g,c,R,fn){const G=g.G,S=g.S,x0=Math.min(c.x,c.zone?c.x:c.ax)-R,x1=Math.max(c.x,c.zone?c.x:c.ax)+R,
  z0=Math.min(c.z,c.zone?c.z:c.az)-R,z1=Math.max(c.z,c.zone?c.z:c.az)+R;
  const tx0=Math.max(0,Math.floor((x0-MINX)/S)),tx1=Math.min(G.TW-1,Math.floor((x1-MINX)/S)),tz0=Math.max(0,Math.floor((z0-MINZ)/S)),tz1=Math.min(G.TH-1,Math.floor((z1-MINZ)/S));
  for(let tz=tz0;tz<=tz1;tz++)for(let tx=tx0;tx<=tx1;tx++)fn(tz*G.TW+tx,tx,tz);}
function hgcPinned(G,t){return G.pin&&G.pin.has(t);}
// Ein Block-Paket: alle passenden Kacheln des 512-m-Blocks in einem Schritt (≤ 64 HG + 16 MFLAG)
function hgcBlockStep(bx,bz,unpack){const t0=performance.now();let n=0;
  for(const g of hgcGrids){const G=g.G;for(let tz=bz*g.B;tz<Math.min(G.TH,bz*g.B+g.B);tz++)for(let tx=bx*g.B;tx<Math.min(G.TW,bx*g.B+g.B);tx++){const t=tz*G.TW+tx;
    if(unpack){if(G.rle[t]&&hgcTileD(g,t)<HGC.hotR){sgUnpack(G,t);n++;}}
    else if(G.tiles[t]&&!hgcPinned(G,t)&&hgcTileD(g,t)>HGC.coldR){sgPack(G,t);n++;}}}
  const d=performance.now()-t0;HGC.jobs++;if(d>HGC.jobMaxMs)HGC.jobMaxMs=d;return true;}
function hgcQueue(bx,bz,unpack){const k=(unpack?'hg:u:':'hg:p:')+bx+','+bz;fbCancel((unpack?'hg:p:':'hg:u:')+bx+','+bz);
  fbJob(k,()=>hgcBlockStep(bx,bz,unpack),{x:MINX+bx*512+256,z:MINZ+bz*512+256,bias:unpack?0:3000});}
// Soll-Menge neu bestimmen und Pakete anmelden
function hgcTick(){HGC.ticks++;hgcCenters();const up=new Set(),pk=new Set();
  for(const g of hgcGrids){const G=g.G;
    for(const c of HGC.cen)hgcEachNear(g,c,c.zone?HGC.zoneR+g.S:HGC.hotR+g.S,(t,tx,tz)=>{if(G.rle[t]&&hgcTileD(g,t)<HGC.hotR)up.add(((tx/g.B)|0)+','+((tz/g.B)|0));});
    for(const t of G.hot)if(!hgcPinned(G,t)&&hgcTileD(g,t)>HGC.coldR)pk.add((((t%G.TW)/g.B)|0)+','+((((t/G.TW)|0)/g.B)|0));}
  for(const k of up){const [bx,bz]=k.split(',').map(Number);hgcQueue(bx,bz,true);}
  for(const k of pk)if(!up.has(k)){const [bx,bz]=k.split(',').map(Number);hgcQueue(bx,bz,false);}
  hgcLru();}
// LRU für ferne Viel-Leser: Kacheln mit vielen kalten Lesezugriffen roh halten – höchstens lruMax, je lruTTL s Spielzeit
// (danach normal: fern → wieder gepackt; liest jemand weiter viel, wird die Kachel erneut angeheftet)
function hgcLru(){for(const g of hgcGrids){const G=g.G;if(!G.pin)G.pin=new Set();
    for(const t of G.want){if(!G.rle[t])continue;sgUnpack(G,t);G.pin.add(t);HGC.lru.push({G,t,until:HGC.clock+HGC.lruTTL});HGC.lruUnpacks++;}
    G.want.length=0;if(G.crt)G.crt.fill(0);}
  while(HGC.lru.length&&(HGC.lru.length>HGC.lruMax||HGC.lru[0].until<=HGC.clock)){const o=HGC.lru.shift();o.G.pin.delete(o.t);}}
// Sprung-Kern: < jumpR um die Spieler und die Umgebung der Zonen, die jetzt (synchron) gebaut werden, sofort roh
function hgcSyncHot(){const t0=performance.now();hgcCenters();
  for(const g of hgcGrids){const G=g.G;for(const c of HGC.cen){
    const R=c.zone?HGC.zoneR:HGC.jumpR;if(c.zone&&(c.Z.built||c.d>=Math.max(c.Z.rIn||0,(typeof LAZY!=='undefined'&&LAZY.rPre)||0)))continue;
    hgcEachNear(g,c,R+g.S,(t)=>{if(!G.rle[t])return;const tx=t%G.TW,tz=(t/G.TW)|0,h=g.S/2,x=MINX+tx*g.S+h,z=MINZ+tz*g.S+h;
      const d=(c.zone?Math.hypot(x-c.x,z-c.z):hgcCapD(c,x,z))-h*1.4143;if(d<R)sgUnpack(G,t);});}}
  const d=performance.now()-t0;HGC.jumpMs=d;if(d>HGC.jumpMax)HGC.jumpMax=d;}
// Boot (nach allen Feature-Setups): alles außerhalb des Heiß-Bereichs um den Start packen
function setupHgCold(){const t0=performance.now();hgcCenters();let n=0;
  for(const g of hgcGrids){const G=g.G;G.crt=new Uint16Array(G.tiles.length);G.hot.clear();
    for(let t=0;t<G.tiles.length;t++){if(!G.tiles[t])continue;if(hgcTileD(g,t)<HGC.hotR)G.hot.add(t);else if(sgPack(G,t))n++;}}
  HGC.bootPacked=n;HGC.bootMs=performance.now()-t0;}
function updateHgCold(dt){HGC.t-=dt;HGC.clock+=dt;
  if(FRAMEB.jump){hgcSyncHot();HGC.t=0;}
  if(HGC.t<=0){HGC.t=HGC.tick;hgcTick();}}
// Zahl der kalten (RLE-)Kacheln, die näher als R an (x,z) liegen (HG + MFLAG)
function hgcColdNear(x,z,R){let n=0;const c={zone:true,x,z};
  for(const g of hgcGrids){const G=g.G,h=g.S/2;hgcEachNear(g,c,R+g.S,(t,tx,tz)=>{
    if(G.rle[t]&&Math.hypot(MINX+tx*g.S+h-x,MINZ+tz*g.S+h-z)-h*1.4143<R)n++;});}
  return n;}
// ruckler ruft das beim START eines Lazy-Zonen-Baus: liegen im Umkreis 900 m noch kalte Kacheln, zählt zoneBuildsCold
function hgcNoteZoneBuild(Z){HGC.zoneBuildsNoted++;const cold=hgcColdNear(Z.x,Z.z,HGC.zoneR)>0;if(cold)HGC.zoneBuildsCold++;return cold;}
