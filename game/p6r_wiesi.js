// ===================== 42 Detail: Wiesbaden Innenstadt + Westend =====================
// Schlossplatz mit Marktbrunnen (goldener Löwe), Neues Rathaus (Portal, Fahnen, Ratskeller – begehbar), Landtag im
// Stadtschloss (Plakette, Stele, Fahnen, Poller), Standesamt im Alten Rathaus (Blumenbogen, Hochzeit); Wilhelmstraße
// („Rue“: Bänke, Litfaßsäulen, Café-Tische, Flaneure mit Pudel) und Warmer Damm (Fontäne im Teich, Enten, Bänke);
// Luisenplatz mit Waterloo-Obelisk, Tauben und Straßenmusiker; Wellritzstraße im Westend (Obst- und Gemüseauslagen,
// Lichterketten, Pflanzkübel, Kicker, Teestubb – begehbar). Mundart-Szenen auf Hessisch, alle Figuren frei erfunden.
// Marktkirche, Kurhaus, Hbf und Biebricher Schloss baut p5h_wiwahr.js – hier nur Ergänzungen um sie herum.
// Lazy (Vertrag Welle 9): beim Boot nur Konstanten, Zonen, Venues und Schnellreise-Ziele (feste Koordinaten). Weltdaten
// (HG/MFLAG, PONDS, ROADS, SHOPS, Bäume) liest nur build(Z), ohne Referenzen über das Entsorgen hinaus. Kollision über
// eigene Hindernislisten je gebauter Zone (Wrapper um blocked0), keine HG-Schreibzugriffe. Bau und Update ziehen aus
// einem eigenen Zufallsstrom.
// Kartendaten © OpenStreetMap-Mitwirkende (ODbL): Schlossplatz, Neues/Altes Rathaus, Stadtschloss, Luisenplatz,
// Warmer Damm, Wilhelmstraße, Wellritzstraße.
const WIESI={zones:[],zone:{},st:{},scenes:[],ft:[],venues:{},stats:{handkaes:0,tee:0,ratskeller:0,teestubb:0,roomFrees:0},hitOn:0,sceneT:0,convs:null,
  drawCalls:()=>Object.fromEntries(WIESI.zones.filter(Z=>Z.built).map(Z=>[Z.wiesiKey,lazyDrawCalls(Z)]))};
// Schnellreise-Gruppe: „Wiesbaden“ belegt p5h_wiwahr (test_wiwahr zählt dort genau vier Ziele) – daher eigene Gruppe daneben
const WIESI_GROUP='Wiesbaden – Innenstadt & Westend';
const WIESI_ZONES={schloss:[-2285,-9295],wilhelm:[-2040,-9235],luisen:[-2451,-8862],westend:[-2990,-9326]};
// Türen [x,z,Blickrichtung nach draußen]: Ratskeller an der Nordfassade des Neuen Rathauses, Teestubb an der Wellritzstraße
const WIESI_DOORS={ratskeller:[-2264.35,-9263.26,2.565],teestubb:[-3110.5,-9322.4,0.08]};
const WIESI_FT=[['Wilhelmstraße & Warmer Damm',-2080,-9200],['Luisenplatz (Waterloo-Obelisk)',-2451,-8840],['Wellritzstraße (Westend)',-2990,-9326]];
// Achse der Wellritzstraße (OSM-Weg), Fußgängerzone zwischen x −3042 und −2831
const WIESI_WELLRITZ=[[-3212,-9309],[-3166,-9311],[-3042,-9321],[-2951,-9329],[-2880,-9334],[-2831,-9338],[-2740,-9345]];
const WIESI_PED=[-3040,-2834];
// Fassaden (OSM-Grundrisse): Ratskeller-Tür → Rathaus-Nordfassade, Landtag-Ostfassade, Altes Rathaus (Standesamt)
const WIESI_LANDTAG={x:-2314.5,z:-9293,f:0.9924},WIESI_STANDESAMT={x:-2353.5,z:-9254.5,f:2.223};

// ---------- Zufall, Qualität, Hilfen ----------
const WIESI_RNG=mulberry32(4242);
function wiesiRng(fn){const r=Math.random;Math.random=WIESI_RNG;try{return fn();}finally{Math.random=r;}}
const wiesiLow=()=>!!(QS.lowLOD||LOWMEM);
const wiesiCast=()=>!QS.noShadow&&!wiesiLow();
const wiesiN=(n)=>wiesiLow()?Math.max(1,Math.ceil(n/2)):n;
function wiesiHG(x,z){const i=idx(x,z);return i<0?255:hgG(i);}
// frei: kein Gebäude/Wasser, kein Baumstamm; road=true schließt auch Straßenflächen aus
function wiesiFree(x,z,r=0.8,road=false){for(const [a,b] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){const i=idx(x+a,z+b);if(i<0||hgG(i)!==0)return false;const f=mfG(i);if(f&4||road&&f&2)return false;}
  return !treeNear(x,z,r+0.5)&&!wiesiHit(x,z);}
function wiesiSpot(x,z,r,road=false,max=14){for(let rad=0;rad<=max;rad+=1.5)for(let k=0;k<(rad?12:1);k++){const a=k/12*TAU;const px=x+Math.sin(a)*rad,pz=z+Math.cos(a)*rad;if(wiesiFree(px,pz,r,road))return [px,pz];}return null;}
const wiesiDir=f=>({nx:Math.sin(f),nz:Math.cos(f),tx:Math.cos(f),tz:-Math.sin(f)});
function wiesiOut(p,f,n,t=0){const d=wiesiDir(f);return [p[0]+d.nx*n+d.tx*t,p[1]+d.nz*n+d.tz*t];}
// erster Wandtreffer entlang (nx,nz) ab (x,z), in Metern (Schritt 0,25 m)
function wiesiWall(x,z,nx,nz,max=14){for(let k=0;k<max;k+=0.25)if(wiesiHG(x+nx*k,z+nz*k)>0)return k;return null;}
function wiesiDress(h,top,bot){const T=new Set([BODY.torsoM,BODY.torsoF,BODY.armM,BODY.armF]),B=new Set([BODY.pelvisM,BODY.pelvisF,BODY.legM,BODY.legF]);
  h.g.traverse(m=>{if(!m.isMesh)return;if(top!==null&&T.has(m.geometry))m.material=cmat(top,0.85);else if(bot!==null&&B.has(m.geometry))m.material=cmat(bot,0.88);});}

// ---------- Kollision: eigene Hindernisse je Zone statt HG ----------
function wiesiHits(Z){return Z.hits||(Z.hits={bb:[1e9,1e9,-1e9,-1e9],obb:[],circ:[]});}
function wiesiBB(H,x,z,r){H.bb[0]=Math.min(H.bb[0],x-r);H.bb[1]=Math.min(H.bb[1],z-r);H.bb[2]=Math.max(H.bb[2],x+r);H.bb[3]=Math.max(H.bb[3],z+r);}
function wiesiObb(Z,x,z,hw,hd,rot,h=1){const H=wiesiHits(Z);H.obb.push([x,z,hw,hd,Math.cos(rot),Math.sin(rot),h]);wiesiBB(H,x,z,hw+hd);}
function wiesiCirc(Z,x,z,r,h=1){const H=wiesiHits(Z);H.circ.push([x,z,r,h]);wiesiBB(H,x,z,r);}
function wiesiHit(x,z,y){
  for(const Z of WIESI.zones){const H=Z.hits;if(!Z.built||!H||x<H.bb[0]||x>H.bb[2]||z<H.bb[1]||z>H.bb[3])continue;
    for(const o of H.obb){if(y!==undefined&&y>=o[6])continue;const dx=x-o[0],dz=z-o[1];if(Math.abs(dx*o[4]-dz*o[5])<o[2]&&Math.abs(dx*o[5]+dz*o[4])<o[3])return true;}
    for(const c of H.circ){if(y!==undefined&&y>=c[3])continue;const dx=x-c[0],dz=z-c[1];if(dx*dx+dz*dz<c[2]*c[2])return true;}}
  return false;}
const _wiesiBlocked0=blocked0;
blocked0=function(x,z,y){if(WIESI.hitOn&&wiesiHit(x,z,y))return true;return _wiesiBlocked0(x,z,y);};

// ---------- Materialien, Sammler, Schilder (je Zone, werden mit der Zone entsorgt) ----------
function wiesiMats(Z){if(Z.wmats)return Z.wmats;const own=m=>lazyOwn(Z,m);const vc=(r,m=0)=>own(new THREE.MeshStandardMaterial({vertexColors:true,roughness:r,metalness:m}));
  return Z.wmats={stone:vc(0.85),wood:vc(0.75),metal:vc(0.4,0.6),gold:vc(0.3,0.85),cloth:vc(0.92),plant:vc(0.95),glow:own(new THREE.MeshBasicMaterial({vertexColors:true})),
    water:own(new THREE.MeshStandardMaterial({color:0x4d7f8c,roughness:0.06,metalness:0.2})),spray:own(new THREE.MeshStandardMaterial({color:0xe6f6ff,roughness:0.1,transparent:true,opacity:0.55,depthWrite:false}))};}
function wiesiGBs(){const o={};return {get:k=>o[k]||(o[k]=new GB()),flush(Z){const mats=wiesiMats(Z),cast=wiesiCast();let n=0;
  for(const k in o){if(o[k].empty)continue;const m=new THREE.Mesh(lazyOwn(Z,o[k].geo()),mats[k]);m.castShadow=cast&&k!=='glow'&&k!=='water'&&k!=='spray';m.receiveShadow=k!=='glow'&&k!=='spray';Z.group.add(m);n++;}return n;}};}
function wiesiGeo(Z,k,fn){const c=Z.wgeo||(Z.wgeo={});return c[k]||(c[k]=lazyOwn(Z,fn()));}
// Schilder einer Zone in einer Textur (Zeilen-Atlas); rows: [Text, Hintergrund, Schrift, Schriftart]
function wiesiSigns(Z,rows){const H=96;const tex=lazyOwn(Z,freeAfterUpload(canvasTex(512,H*rows.length,g=>{rows.forEach(([t,bg,fg,font],i)=>{const y=i*H;g.fillStyle=bg;g.fillRect(0,y,512,H);g.strokeStyle=fg;g.lineWidth=4;g.strokeRect(6,y+6,500,H-12);
    g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';let fs=58;do{g.font=(font||'700 ')+fs+'px "Barlow Condensed", Arial Narrow, sans-serif';fs-=2;}while(g.measureText(t).width>470&&fs>18);g.fillText(t,256,y+H/2+2);});},false)));
  const mat=lazyOwn(Z,new THREE.MeshStandardMaterial({map:tex,roughness:0.7}));const gb=new GB();const n=rows.length;
  // senkrechte Tafel mit Normale (sin f, cos f), Zeile i
  const quad=(i,cx,y0,cz,w,h,f)=>{const {tx,tz}=wiesiDir(f);const v0=1-(i+1)/n,v1=1-i/n;const a=[cx-tx*w/2,y0,cz-tz*w/2],b=[cx+tx*w/2,y0,cz+tz*w/2];gb.quad(a,b,[b[0],y0+h,b[2]],[a[0],y0+h,a[2]],[0,v0],[1,v0],[1,v1],[0,v1]);};
  // Litfaßsäule: Zylindermantel mit Zeile i rundum
  const round=(i,cx,y0,cz,r,h,seg=12)=>{const v0=1-(i+1)/n,v1=1-i/n;for(let k=0;k<seg;k++){const a0=k/seg*TAU,a1=(k+1)/seg*TAU;const p=(a,y)=>[cx+Math.sin(a)*r,y,cz+Math.cos(a)*r];
    gb.quadOut(p(a0,y0),p(a1,y0),p(a1,y0+h),p(a0,y0+h),[k/seg*2,v0],[(k+1)/seg*2,v0],[(k+1)/seg*2,v1],[k/seg*2,v1],WHITE,[cx,y0+h/2,cz]);}};
  return {quad,round,flush(){if(gb.empty)return 0;const m=new THREE.Mesh(lazyOwn(Z,gb.geo()),mat);m.receiveShadow=true;Z.group.add(m);return 1;}};}

// ---------- Bausteine ----------
function wiesiBench(G,Z,x,z,face){const wd=G.get('wood'),mt=G.get('metal');const {nx,nz,tx,tz}=wiesiDir(face);const at=(a,b)=>[x+tx*a+nx*b,z+tz*a+nz*b];
  for(const a of [-0.75,0.75]){const [lx,lz]=at(a,0);mt.box(lx,0,lz,0.08,0.45,0.42,face,C3(0x2f3438));}
  {const [sx,sz]=at(0,0.02);wd.box(sx,0.42,sz,1.7,0.06,0.42,face,C3(0x7a5532));}{const [bx,bz]=at(0,-0.22);wd.box(bx,0.55,bz,1.7,0.36,0.05,face,C3(0x7a5532));}
  wiesiObb(Z,x,z,0.95,0.35,face,1);return {x,z,face};}
function wiesiPlanter(G,Z,x,z,flowers){const s=G.get('stone'),p=G.get('plant');s.box(x,0,z,1.3,0.6,1.3,0.3,C3(0x9a8f80));p.box(x,0.6,z,1.1,0.35,1.1,0.3,C3(0x3d6b2e));
  if(flowers)for(let k=0;k<6;k++){const a=k/6*TAU;p.box(x+Math.sin(a)*0.35,0.9,z+Math.cos(a)*0.35,0.18,0.14,0.18,a,C3([0xd1304a,0xf2c230,0xffffff,0xb05ad1][k%4]));}
  wiesiCirc(Z,x,z,0.8,1);}
// Fahne am Mast: Tuch entlang der Fassade (Tangente von face), Streifen von oben nach unten
const WIESI_FLAGS={hessen:[0xd0202e,0xf4f4f0],deutschland:[0x111111,0xdd0000,0xffcc00],wiesbaden:[0x1d4f9c],europa:[0x003399]};
function wiesiFlag(G,Z,x,z,face,kind){const mt=G.get('metal'),cl=G.get('cloth'),go=G.get('gold');const H=9.5,W=2.3,FH=1.45;const {tx,tz}=wiesiDir(face);
  mt.beam([x,0,z],[x,H,z],0.12,0.12,C3(0xd8d8d8));go.box(x,H,z,0.22,0.22,0.22,0,C3(0xd4af37));
  const cols=WIESI_FLAGS[kind];const cx=x+tx*(W/2+0.08),cz=z+tz*(W/2+0.08);const sh=FH/cols.length;
  cols.forEach((c,i)=>cl.box(cx,H-0.2-(i+1)*sh,cz,W,sh,0.03,face,C3(c)));
  if(kind==='europa')for(let k=0;k<12;k++){const a=k/12*TAU;const lx=Math.sin(a)*0.45,ly=H-0.2-FH/2+Math.cos(a)*0.45;go.box(cx+tx*lx,ly-0.05,cz+tz*lx,0.1,0.1,0.06,face,C3(0xffcc00));}
  if(kind==='wiesbaden')for(const [lx,ly] of [[-0.42,0.3],[0.42,0.3],[0,-0.32]]){const y=H-0.2-FH/2+ly;go.box(cx+tx*lx,y-0.17,cz+tz*lx,0.1,0.34,0.07,face,C3(0xf2c230));go.box(cx+tx*lx,y-0.02,cz+tz*lx,0.3,0.08,0.07,face,C3(0xf2c230));for(const s of [-1,1])go.box(cx+tx*(lx+s*0.11),y+0.02,cz+tz*(lx+s*0.11),0.08,0.16,0.07,face,C3(0xf2c230));}
  wiesiCirc(Z,x,z,0.2,H);return {x,z,kind};}
function wiesiLitfass(G,S,Z,x,z,row){const mt=G.get('metal');mt.box(x,0,z,1.25,0.3,1.25,0,C3(0x2e4a3a));S.round(row,x,0.3,z,0.6,2.5);mt.box(x,2.8,z,1.35,0.2,1.35,0,C3(0x2e4a3a));mt.box(x,3.0,z,0.9,0.35,0.9,0.785,C3(0x2e4a3a));
  wiesiCirc(Z,x,z,0.7,3.3);return {x,z};}

// ---------- Schlossplatz: Marktbrunnen, Rathaus, Landtag, Standesamt ----------
function wiesiBrunnen(G,x,z){const st=G.get('stone'),go=G.get('gold'),wa=G.get('water'),sp=G.get('spray');const S1=C3(0xc9b89a),S2=C3(0xa8977c),n=8,R=2.4;
  for(let i=0;i<n;i++){const a=i/n*TAU;st.box(x+Math.sin(a)*R,0,z+Math.cos(a)*R,2*R*Math.tan(Math.PI/n)+0.12,0.75,0.35,a,S1);}
  for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU;wa.tri([x,0.58,z],[x+Math.sin(a1)*(R-0.15),0.58,z+Math.cos(a1)*(R-0.15)],[x+Math.sin(a0)*(R-0.15),0.58,z+Math.cos(a0)*(R-0.15)],[0.5,0.5],[1,0],[0,0]);}
  st.box(x,0,z,0.9,3.2,0.9,0,S2);st.box(x,3.2,z,1.3,0.3,1.3,0,S1);st.box(x,1.4,z,1.6,0.25,1.6,0.785,S1);
  for(let k=0;k<4;k++){const a=k/4*TAU+0.39;sp.beam([x+Math.sin(a)*0.5,1.5,z+Math.cos(a)*0.5],[x+Math.sin(a)*1.5,0.6,z+Math.cos(a)*1.5],0.07,0.07);}
  // Nassauer Löwe, sitzend, Wappenschild vor der Brust (Blick nach Osten zur Marktkirche)
  const f=Math.PI/2,{nx,nz}=wiesiDir(f),Gc=C3(0xd4af37);const P=(b,y,o=0)=>[x+nx*b,y,z+nz*b];
  {const [bx,,bz]=P(-0.1,0);go.box(bx,3.5,bz,0.5,0.55,0.8,f,Gc);}{const [bx,,bz]=P(0.22,0);go.box(bx,3.9,bz,0.46,0.6,0.42,f,Gc);}
  {const [bx,,bz]=P(0.38,0);go.box(bx,4.3,bz,0.34,0.36,0.34,f,Gc);}{const [bx,,bz]=P(0.58,0);go.box(bx,4.32,bz,0.16,0.14,0.14,f,Gc);}
  for(const s of [-1,1]){const {tx,tz}=wiesiDir(f);const [bx,,bz]=P(0.35,0);go.box(bx+tx*s*0.14,3.5,bz+tz*s*0.14,0.12,0.45,0.12,f,Gc);}
  {const [bx,,bz]=P(0.5,0);G.get('cloth').box(bx,3.65,bz,0.42,0.5,0.06,f,C3(0x1d4f9c));go.box(bx+nx*0.04,3.9,bz+nz*0.04,0.18,0.18,0.03,f,Gc);}
  go.beam(P(-0.45,3.55),P(-0.7,4.2),0.07,0.07,Gc);}
function wiesiSchlossBuild(Z){const S=WIESI.st.schloss={brunnen:null,flags:[],benches:[],planters:0,poller:0,arch:null,signs:0,stele:null,plaque:null,portal:null};
  const G=wiesiGBs(),low=wiesiLow();const SG=wiesiSigns(Z,[['RATSKELLER','#1f3b2c','#e7d27a','italic 700 '],['RATHAUS','#d8cdb6','#3a2e22','700 '],['HESSISCHER LANDTAG','#3b2f20','#e3c98a','700 '],['STANDESAMT','#e9e2d2','#2a2a2a','600 ']]);
  // Rathaus: Portal mit Ratskeller-Schild, Laternen, Schriftzug, drei Fahnen vor der Nordfassade
  {const D=WIESI_DOORS.ratskeller,f=D[2],{nx,nz,tx,tz}=wiesiDir(f);const wx=D[0]-nx*1.2,wz=D[1]-nz*1.2;const st=G.get('stone'),C=C3(0xb9ab90);
    for(const s of [-1,1])st.box(wx+tx*s*1.35+nx*0.15,0,wz+tz*s*1.35+nz*0.15,0.45,3.5,0.4,f,C);st.box(wx+nx*0.15,3.5,wz+nz*0.15,3.2,0.45,0.42,f,C);
    G.get('wood').box(wx+nx*0.05,0,wz+nz*0.05,2.2,3.2,0.12,f,C3(0x3a2516));st.box(wx+nx*0.8,0,wz+nz*0.8,3.4,0.14,1.4,f,C3(0xa49a8a));
    SG.quad(0,wx+nx*0.4,3.98,wz+nz*0.4,3.0,0.56,f);SG.quad(1,wx+nx*0.12+tx*3.5,9.2,wz+nz*0.12+tz*3.5,7.2,1.0,f);S.signs+=2;
    for(const s of [-1,1]){const lx=wx+tx*s*2.0+nx*0.35,lz=wz+tz*s*2.0+nz*0.35;G.get('metal').box(lx-nx*0.2,2.9,lz-nz*0.2,0.06,0.06,0.45,f,C3(0x1a1a1a));G.get('glow').box(lx,2.55,lz,0.24,0.4,0.24,f,C3(0xffd27a));}
    S.portal={x:wx,z:wz};
    ['hessen','deutschland','wiesbaden'].forEach((k,i)=>{const [px,pz]=wiesiOut([wx,wz],f,6,4+i*3.6);if(wiesiFree(px,pz,0.4))S.flags.push(wiesiFlag(G,Z,px,pz,f,k));});}
  // Landtag (Stadtschloss): Bronzeplakette, Stele, Fahnen, Pollerreihe
  {const L=WIESI_LANDTAG,f=L.f,{nx,nz}=wiesiDir(f);G.get('gold').box(L.x+nx*0.05,1.6,L.z+nz*0.05,2.4,0.8,0.08,f,C3(0x8a6a2a));SG.quad(2,L.x+nx*0.1,1.68,L.z+nz*0.1,2.2,0.64,f);S.plaque={x:L.x,z:L.z};S.signs++;
    const sp=wiesiSpot(...wiesiOut([L.x,L.z],f,8,4),1.2);if(sp){const [sx,sz]=sp;G.get('stone').box(sx,0,sz,3.4,1.5,0.55,f,C3(0x9d978b));SG.quad(2,sx+nx*0.29,0.55,sz+nz*0.29,3.0,0.75,f);wiesiObb(Z,sx,sz,1.75,0.33,f,1.6);S.stele={x:sx,z:sz};S.signs++;}
    ['hessen','deutschland','europa'].forEach((k,i)=>{const [px,pz]=wiesiOut([L.x,L.z],f,5,(i-1)*3.6-6);if(wiesiFree(px,pz,0.4))S.flags.push(wiesiFlag(G,Z,px,pz,f,k));});
    for(let t=-9;t<=9;t+=3){const [px,pz]=wiesiOut([L.x,L.z],f,12,t);if(!wiesiFree(px,pz,0.3))continue;G.get('metal').box(px,0,pz,0.22,0.9,0.22,f,C3(0x3a3f44));G.get('metal').box(px,0.9,pz,0.26,0.06,0.26,f,C3(0xb0b4b8));wiesiCirc(Z,px,pz,0.18,0.9);S.poller++;}}
  // Standesamt (Altes Rathaus): Schild + Blumenbogen
  {const A=WIESI_STANDESAMT,f=A.f,{nx,nz,tx,tz}=wiesiDir(f);SG.quad(3,A.x+nx*0.1,3.2,A.z+nz*0.1,2.6,0.5,f);S.signs++;
    const [ax,az]=wiesiOut([A.x,A.z],f,4.5);if(wiesiFree(ax,az,1.2)){const wd=G.get('wood'),pl=G.get('plant');for(const s of [-1,1]){wd.box(ax+tx*s*1.3,0,az+tz*s*1.3,0.14,2.6,0.14,f,C3(0xf2efe6));wiesiCirc(Z,ax+tx*s*1.3,az+tz*s*1.3,0.15,2.6);}
      for(let k=0;k<=8;k++){const a=k/8*Math.PI;const lx=-Math.cos(a)*1.3,ly=2.6+Math.sin(a)*0.9;pl.box(ax+tx*lx,ly-0.15,az+tz*lx,0.34,0.3,0.34,a,C3(k%2?0xf5b8c8:0xffffff));pl.box(ax+tx*lx,ly-0.25,az+tz*lx,0.38,0.12,0.38,a+0.4,C3(0x4a7a3a));}
      S.arch={x:ax,z:az};}}
  // Marktbrunnen mitten auf dem Schlossplatz, Bänke rundherum, Pflanzkübel
  {const bp=wiesiSpot(-2283,-9305,3.2);if(bp){const [x,z]=bp;wiesiBrunnen(G,x,z);wiesiCirc(Z,x,z,2.65,1.1);S.brunnen={x,z,r:2.65};
    for(const a of low?[0.6,3.75]:[0.6,2.2,3.75,5.35]){const bx=x+Math.sin(a)*6.8,bz=z+Math.cos(a)*6.8;if(wiesiFree(bx,bz,1))S.benches.push(wiesiBench(G,Z,bx,bz,Math.atan2(x-bx,z-bz)));}
    for(const [dx,dz] of [[12,0],[-12,0],[0,12],[0,-12]]){const p=wiesiSpot(x+dx,z+dz,0.9,false,4);if(p){wiesiPlanter(G,Z,p[0],p[1],true);S.planters++;}}}}
  S.meshes=G.flush(Z)+SG.flush();
  wiesiSchlossScenes(Z,S);}

// ---------- Wilhelmstraße + Warmer Damm ----------
function wiesiRoadAt(name,z){let best=null;for(const r of ROADS){if(r.name!==name)continue;for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i];if((a[1]-z)*(b[1]-z)>0)continue;const f=(z-a[1])/((b[1]-a[1])||1e-6);const x=a[0]+(b[0]-a[0])*f;
  if(!best||Math.abs(x-WIESI_ZONES.wilhelm[0])<Math.abs(best[0]-WIESI_ZONES.wilhelm[0]))best=[x,r.w];}}return best;}
function wiesiDuckGeo(){const g=new GB();g.box(0,0,0,0.3,0.16,0.46,0,C3(0x7a5a3a));g.box(0,0.12,0.18,0.14,0.14,0.14,0,C3(0x1f6b3a));g.box(0,0.15,0.29,0.06,0.04,0.09,0,C3(0xe08a1e));g.box(0,0.08,-0.24,0.12,0.06,0.08,0,C3(0x4a3a2a));return g.geo();}
function wiesiWilhelmBuild(Z){const S=WIESI.st.wilhelm={pond:null,jet:null,ducks:[],duckMesh:null,benches:[],litfass:[],cafe:[],rue:null};const G=wiesiGBs(),low=wiesiLow();
  const SG=wiesiSigns(Z,[['KURKONZERT · SONNTAG 11 UHR · WEINFEST · THEATER','#f3e7c8','#5a2a1a','700 '],['CAFÉ AN DER RUE','#20332a','#f0e3b0','italic 700 ']]);
  // Teich im Warmen Damm (OSM): Fontäne in der Mitte, Enten, Bänke am Ufer
  let pond=null;for(const p of PONDS){if(p.fountain)continue;const [cx,cz]=polyCentroid(p.poly);if(Math.hypot(cx+2015,cz+9238)<140&&Math.abs(polyArea(p.poly))>500){pond={c:[cx,cz],poly:p.poly.map(q=>[q[0],q[1]])};break;}}
  if(pond){S.pond={x:pond.c[0],z:pond.c[1],n:pond.poly.length};const [cx,cz]=pond.c;
    const jet=new THREE.Mesh(wiesiGeo(Z,'jet',()=>new THREE.CylinderGeometry(0.1,0.55,1,12,1,true).translate(0,0.5,0)),wiesiMats(Z).spray);jet.position.set(cx,0.12,cz);jet.scale.set(1,7,1);Z.group.add(jet);S.jet={m:jet,x:cx,z:cz,h:7};
    const foam=new THREE.Mesh(wiesiGeo(Z,'foam',()=>new THREE.CylinderGeometry(1.4,1.6,0.08,16)),wiesiMats(Z).spray);foam.position.set(cx,0.14,cz);Z.group.add(foam);
    const inP=(x,z)=>pip(x,z,pond.poly);const nD=wiesiN(8);
    for(let k=0,tries=0;S.ducks.length<nD&&tries<400;tries++){const bb=polyBBox(pond.poly);const x=bb[0]+Math.random()*(bb[2]-bb[0]),z=bb[1]+Math.random()*(bb[3]-bb[1]),r=2+Math.random()*4;
      let ok=Math.hypot(x-cx,z-cz)>r+3;for(let a=0;ok&&a<8;a++)ok=inP(x+Math.sin(a/8*TAU)*(r+1.6),z+Math.cos(a/8*TAU)*(r+1.6));if(!ok)continue;
      S.ducks.push({cx:x,cz:z,r,a:Math.random()*TAU,sp:(0.25+Math.random()*0.3)*(Math.random()<0.5?-1:1),x,z});k++;}
    if(S.ducks.length){const im=new THREE.InstancedMesh(wiesiGeo(Z,'duck',wiesiDuckGeo),wiesiMats(Z).cloth,S.ducks.length);im.frustumCulled=false;Z.group.add(im);S.duckMesh=im;wiesiDucks(S,0);}
    // Bänke am Ufer, Blick zum Teich
    const P=pond.poly,per=[];let L=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];per.push([a,b,L]);L+=Math.hypot(b[0]-a[0],b[1]-a[1]);}
    const want=wiesiN(6);for(let s=L/want/2;s<L&&S.benches.length<want;s+=L/want){const seg=per.find(q=>q[2]<=s&&s<q[2]+Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1]))||per[0];const l=Math.hypot(seg[1][0]-seg[0][0],seg[1][1]-seg[0][1])||1;const f=(s-seg[2])/l;
      const ex=seg[0][0]+(seg[1][0]-seg[0][0])*f,ez=seg[0][1]+(seg[1][1]-seg[0][1])*f;const dx=ex-cx,dz=ez-cz,dl=Math.hypot(dx,dz)||1;
      for(const off of [4,5.5,7]){const bx=ex+dx/dl*off,bz=ez+dz/dl*off;if(!inP(bx,bz)&&wiesiFree(bx,bz,1.1)){S.benches.push(Object.assign(wiesiBench(G,Z,bx,bz,Math.atan2(-dx,-dz)),{pond:true}));break;}}}}
  // Rue: Ostseite (Bänke, Litfaßsäulen), Westseite (Café-Tische vor den Fassaden)
  const rows=[];for(let z=-9340;z<=-9120;z+=4){const r=wiesiRoadAt('Wilhelmstraße',z);if(r)rows.push([z,r[0],r[1]]);}
  const east=[];for(const [z,x,w] of rows){const ex=x+w/2;let k=1;while(k<6&&wiesiHG(ex+k,z)===0&&(mfG(idx(ex+k,z))&2))k+=0.5;east.push([z,ex+k]);}
  if(east.length>2){S.rue={z0:east[0][0],z1:east[east.length-1][0],pts:east.map(([z,x])=>[x+1.4,z])};
    let lastB=-1e9;for(const [z,x] of east){if(z-lastB<(low?60:36))continue;const bx=x+4.2;if(wiesiFree(bx,z,1.1)){S.benches.push(wiesiBench(G,Z,bx,z,-Math.PI/2));lastB=z;}}
    for(const zz of [-9300,-9165]){const e=east.reduce((a,b)=>Math.abs(b[0]-zz)<Math.abs(a[0]-zz)?b:a);const p=wiesiSpot(e[1]+4.4,e[0]+2,0.8,false,4);if(p)S.litfass.push(wiesiLitfass(G,SG,Z,p[0],p[1],0));}}
  {const cz=-9282;const r=wiesiRoadAt('Wilhelmstraße',cz);if(r){const wx=r[0]-r[1]/2,d=wiesiWall(wx,cz,-1,0,10);if(d!==null&&d>=3.2){const fx=wx-d;
    SG.quad(1,fx+0.12,2.9,cz,4.2,0.7,Math.PI/2);G.get('cloth').quad([fx+0.1,3.6,cz-2.3],[fx+0.1,3.6,cz+2.3],[fx+1.6,3.1,cz+2.3],[fx+1.6,3.1,cz-2.3],[0,0],[1,0],[1,1],[0,1],C3(0x20332a));
    G.get('cloth').quad([fx+1.6,3.1,cz-2.3],[fx+1.6,3.1,cz+2.3],[fx+0.1,3.6,cz+2.3],[fx+0.1,3.6,cz-2.3],[0,0],[1,0],[1,1],[0,1],C3(0x20332a));
    for(const dz of low?[-1.5,1.5]:[-3,0,3]){const tx=fx+Math.min(d-1.2,1.7),tz=cz+dz;if(!wiesiFree(tx,tz,0.5))continue;const mt=G.get('metal'),wd=G.get('wood');
      mt.box(tx,0,tz,0.08,0.72,0.08,0,C3(0x222222));wd.box(tx,0.72,tz,0.7,0.04,0.7,0.785,C3(0xe8e2d4));for(const s of [-1,1]){mt.box(tx,0,tz+s*0.62,0.4,0.45,0.4,0,C3(0x3a3f44));mt.box(tx,0.45,tz+s*0.8,0.4,0.4,0.04,0,C3(0x3a3f44));}
      wiesiCirc(Z,tx,tz,0.55,1);S.cafe.push({x:tx,z:tz});}}}}
  S.meshes=G.flush(Z)+SG.flush();
  wiesiWilhelmScenes(Z,S);}
function wiesiDucks(S,dt){const m=S.duckMesh;if(!m)return;const M=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  S.ducks.forEach((d,i)=>{d.a+=d.sp*dt/Math.max(1,d.r)*1.6;d.x=d.cx+Math.sin(d.a)*d.r;d.z=d.cz+Math.cos(d.a)*d.r;q.setFromAxisAngle(up,d.a+(d.sp>0?Math.PI/2:-Math.PI/2));
    p.set(d.x,0.12+Math.sin(d.a*7+i)*0.015,d.z);M.compose(p,q,s);m.setMatrixAt(i,M);});m.instanceMatrix.needsUpdate=true;}

// ---------- Luisenplatz: Waterloo-Obelisk, Tauben ----------
function wiesiObelisk(G,x,z){const st=G.get('stone'),go=G.get('gold');const C1=C3(0xc2b8a6),C2=C3(0xa69c8a);
  st.box(x,0,z,5,0.35,5,0,C2);st.box(x,0.35,z,4.2,0.35,4.2,0,C2);st.box(x,0.7,z,2.6,2.4,2.6,0,C1);st.box(x,3.1,z,3,0.3,3,0,C2);
  const y0=3.4,y1=16.8,a0=0.85,a1=0.5,top=18.0;const P=(s,t,y,a)=>[x+s*a,y,z+t*a];const cs=[[-1,-1],[1,-1],[1,1],[-1,1]];
  for(let i=0;i<4;i++){const [s0,t0]=cs[i],[s1,t1]=cs[(i+1)%4];st.quadOut(P(s0,t0,y0,a0),P(s1,t1,y0,a0),P(s1,t1,y1,a1),P(s0,t0,y1,a1),[0,0],[1,0],[1,4],[0,4],C1,[x,(y0+y1)/2,z]);
    st.triOut(P(s0,t0,y1,a1),P(s1,t1,y1,a1),[x,top,z],[0,0],[1,0],[0.5,1],C1,[x,y1,z]);}
  go.box(x,1.4,z+1.32,1.4,0.8,0.05,0,C3(0x8a6a2a));
  for(const [s,t] of cs){st.box(x+s*3.4,0,z+t*3.4,0.22,0.8,0.22,0,C2);}for(let i=0;i<4;i++){const [s0,t0]=cs[i],[s1,t1]=cs[(i+1)%4];G.get('metal').beam([x+s0*3.4,0.62,z+t0*3.4],[x+s1*3.4,0.62,z+t1*3.4],0.04,0.04,C3(0x2a2a2a));}}
function wiesiPigeonGeo(){const g=new GB();g.box(0,0,0,0.16,0.13,0.28,0,C3(0x8a8f99));g.box(0,0.1,0.12,0.09,0.09,0.09,0,C3(0x4f6f6a));g.box(0,0.11,0.18,0.03,0.025,0.05,0,C3(0xd9a066));g.box(0,0.04,-0.17,0.12,0.03,0.1,0,C3(0x5a5f69));return g.geo();}
function wiesiLuisenBuild(Z){const S=WIESI.st.luisen={obelisk:null,benches:[],pigeons:[],pigMesh:null,litfass:[]};const G=wiesiGBs(),low=wiesiLow();
  const SG=wiesiSigns(Z,[['STADTFEST · LESUNG · FLOHMARKT AM SAMSTAG','#e8eef3','#1d3557','700 '],['WATERLOO 1815','#6b5226','#f1dba0','700 ']]);
  const c=wiesiSpot(WIESI_ZONES.luisen[0],WIESI_ZONES.luisen[1],3.2);
  if(c){const [x,z]=c;wiesiObelisk(G,x,z);SG.quad(1,x,1.43,z+1.36,1.3,0.7,0);wiesiObb(Z,x,z,2.6,2.6,0,18);S.obelisk={x,z,h:18};
    for(let k=0;k<wiesiN(6);k++){const a=(k+0.5)/wiesiN(6)*TAU;for(const r of [9,10.5,8]){const bx=x+Math.sin(a)*r,bz=z+Math.cos(a)*r;if(wiesiFree(bx,bz,1.1)){S.benches.push(wiesiBench(G,Z,bx,bz,Math.atan2(x-bx,z-bz)));break;}}}
    for(let k=0;k<wiesiN(12);k++){const a=Math.random()*TAU,r=4.2+Math.random()*3.5;const hx=x+Math.sin(a)*r,hz=z+Math.cos(a)*r;S.pigeons.push({hx,hz,x:hx,z:hz,y:0,f:Math.random()*TAU,st:'peck',t:Math.random()*3,ph:Math.random()*TAU,flown:0});}
    const im=new THREE.InstancedMesh(wiesiGeo(Z,'pigeon',wiesiPigeonGeo),wiesiMats(Z).cloth,S.pigeons.length);im.frustumCulled=false;Z.group.add(im);S.pigMesh=im;wiesiPigeons(S,0);}
  const lp=wiesiSpot(-2425,-8812,0.8,false,8);if(lp)S.litfass.push(wiesiLitfass(G,SG,Z,lp[0],lp[1],0));
  S.meshes=G.flush(Z)+SG.flush();
  wiesiLuisenScenes(Z,S);}
// Tauben picken, hüpfen, fliegen vor Spielern auf und landen woanders wieder
function wiesiPigeons(S,dt){const m=S.pigMesh;if(!m)return;const M=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),qx=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),ax=new THREE.Vector3(1,0,0);
  const near=(x,z)=>{for(const P of PLAYERS){if(!P.h||P.h.room)continue;const [px,pz]=ppos(P);if(Math.hypot(px-x,pz-z)<3)return [px,pz];}return null;};
  S.pigeons.forEach((g,i)=>{g.t-=dt;g.ph+=dt*9;let pitch=0;
    if(g.st==='peck'){pitch=Math.max(0,Math.sin(g.ph))*0.5;const pl=dt?near(g.x,g.z):null;if(pl){g.st='fly';g.t=2.4;g.flown++;g.f=Math.atan2(g.x-pl[0],g.z-pl[1]);}
      else if(g.t<=0){g.t=1+Math.random()*3;g.f+=(Math.random()-0.5)*2;const nx=g.x+Math.sin(g.f)*0.4,nz=g.z+Math.cos(g.f)*0.4;if(Math.hypot(nx-g.hx,nz-g.hz)<3)g.x=nx,g.z=nz;}}
    else{g.x+=Math.sin(g.f)*dt*5;g.z+=Math.cos(g.f)*dt*5;g.y=Math.min(6,g.y+dt*3.5);if(g.t<=0){g.st='peck';g.y=0;const a=Math.random()*TAU;g.x=g.hx+Math.sin(a)*1.5;g.z=g.hz+Math.cos(a)*1.5;g.t=2;}}
    q.setFromAxisAngle(up,g.f);qx.setFromAxisAngle(ax,pitch);q.multiply(qx);p.set(g.x,g.y,g.z);M.compose(p,q,s);m.setMatrixAt(i,M);});m.instanceMatrix.needsUpdate=true;}

// ---------- Westend: Wellritzstraße ----------
function wiesiWellritzAt(x){const L=WIESI_WELLRITZ;for(let i=1;i<L.length;i++){const a=L[i-1],b=L[i];if(x<a[0]||x>b[0])continue;const f=(x-a[0])/(b[0]-a[0]);const l=Math.hypot(b[0]-a[0],b[1]-a[1]);return {x,z:a[1]+(b[1]-a[1])*f,ux:(b[0]-a[0])/l,uz:(b[1]-a[1])/l};}return null;}
const WIESI_FRUIT=[0xf28c28,0xd62d20,0x8fbf3a,0xf2d230,0x6a2c70,0x2f7d32,0xe94f37,0xffb347];
function wiesiStand(G,x,z,f,big){const wd=G.get('wood'),cl=G.get('cloth'),{nx,nz,tx,tz}=wiesiDir(f);const W=big?3.2:2.2;
  for(const [b,y,hh] of [[0.0,0.0,0.55],[-0.45,0.0,0.9]]){wd.box(x+nx*b,y,z+nz*b,W,hh,0.5,f,C3(0x8a6a48));
    const n=Math.round(W/0.55);for(let k=0;k<n;k++){const lt=-W/2+0.275+k*0.55;const col=WIESI_FRUIT[(k*3+(b<0?1:0)+Math.round(x))&7];const cx=x+nx*b+tx*lt,cz=z+nz*b+tz*lt;
      wd.box(cx,hh,cz,0.5,0.12,0.42,f,C3(0xb08a5a));cl.box(cx,hh+0.12,cz,0.44,0.1,0.36,f,C3(col));if(!wiesiLow())cl.box(cx,hh+0.22,cz,0.28,0.06,0.22,f+0.5,C3(col));
      if(k%2===0)G.get('glow').box(cx+nx*0.22,hh+0.02,cz+nz*0.22,0.14,0.09,0.01,f,C3(0xffffff));}}}
function wiesiWestendBuild(Z){const S=WIESI.st.westend={stands:[],main:null,lights:0,bulbs:0,planters:0,tea:[],ball:null};const G=wiesiGBs(),low=wiesiLow();
  const SG=wiesiSigns(Z,[['OBST & GEMÜSE','#2f6b2a','#ffffff','800 '],['TEESTUBB AM WELLRITZ','#6b1f1f','#f2d48a','italic 700 ']]);
  const doorsNear=(x,z,r)=>SHOPS.some(s=>Math.hypot((s.doorX??s.x)-x,(s.doorZ??s.z)-z)<r);
  // Hauptstand „Obst & Gemüse“ mit Markise auf der Südseite (ohne Ladenschild an dieser Stelle)
  const stand=(x,side,big)=>{const p=wiesiWellritzAt(x);if(!p)return null;const nx=-p.uz*side,nz=p.ux*side;const d=wiesiWall(p.x,p.z,nx,nz,12);if(d===null||d<4.2)return null;
    const sx=p.x+nx*(d-0.75),sz=p.z+nz*(d-0.75),f=Math.atan2(-nx,-nz);if(doorsNear(sx,sz,2.4)||Math.hypot(sx-WIESI_DOORS.teestubb[0],sz-WIESI_DOORS.teestubb[1])<4)return null;
    wiesiStand(G,sx,sz,f,big);const {tx,tz}=wiesiDir(f);wiesiObb(Z,sx-nx*0.2,sz-nz*0.2,(big?3.2:2.2)/2+0.05,0.55,f,1.2);return {x:sx,z:sz,f,wx:p.x+nx*d,wz:p.z+nz*d,side,big:!!big,tx,tz};};
  {const s=stand(-3086,1,true);if(s){S.main=s;S.stands.push(s);const {nx,nz}=wiesiDir(s.f);const wx=s.wx,wz=s.wz,cl=G.get('cloth');
    for(let k=0;k<8;k++){const a=-1.9+k*0.475,b=a+0.475,col=C3(k%2?0xffffff:0x2f8a3a);const P=(t,o,y)=>[wx+s.tx*t+nx*o,y,wz+s.tz*t+nz*o];
      cl.quad(P(a,0.1,3.2),P(b,0.1,3.2),P(b,2.0,2.6),P(a,2.0,2.6),[0,0],[1,0],[1,1],[0,1],col);cl.quad(P(a,2.0,2.6),P(b,2.0,2.6),P(b,0.1,3.2),P(a,0.1,3.2),[0,0],[1,0],[1,1],[0,1],col);}
    SG.quad(0,wx+nx*0.1,3.3,wz+nz*0.1,3.4,0.6,s.f);}}
  const xs=[];for(let x=-3196;x<=-2752;x+=8)xs.push(x);
  for(const x of xs){if(S.stands.length>=wiesiN(7))break;for(const side of [1,-1]){if(S.stands.some(o=>Math.hypot(o.x-x,o.z-(wiesiWellritzAt(x)||{z:0}).z)<38))continue;const s=stand(x,side,false);if(s){S.stands.push(s);break;}}}
  // Teestubb: Schild über der Tür, draußen ein Tisch mit Hockern
  {const D=WIESI_DOORS.teestubb,f=D[2],{nx,nz,tx,tz}=wiesiDir(f);const wx=D[0]-nx*1.2,wz=D[1]-nz*1.2;SG.quad(1,wx+nx*0.1,2.9,wz+nz*0.1,3.6,0.6,f);
    G.get('wood').box(wx+nx*0.05,0,wz+nz*0.05,1.6,2.6,0.1,f,C3(0x5a2a1a));
    for(const s of [-1,1]){const p=[wx+nx*1.9+tx*s*2.8,wz+nz*1.9+tz*s*2.8];if(!wiesiFree(p[0],p[1],0.5))continue;const wd=G.get('wood');wd.box(p[0],0,p[1],0.8,0.5,0.8,f,C3(0x7a4a26));
      wd.box(p[0],0.5,p[1],0.5,0.04,0.34,f,C3(0x3a2214));for(const o of [-0.65,0.65])wd.box(p[0]+tx*o,0,p[1]+tz*o,0.38,0.38,0.38,f,C3(0xb3202a));wiesiCirc(Z,p[0],p[1],0.55,0.8);S.tea.push({x:p[0],z:p[1],f});}}
  // Fußgängerzone: Lichterketten zwischen den Fassaden, Pflanzkübel in der Mitte
  if(!low)for(let x=WIESI_PED[0]+6;x<WIESI_PED[1];x+=14){const p=wiesiWellritzAt(x);if(!p)continue;const n=[-p.uz,p.ux];const dS=wiesiWall(p.x,p.z,n[0],n[1],12),dN=wiesiWall(p.x,p.z,-n[0],-n[1],12);if(dS===null||dN===null)continue;
    const A=[p.x-n[0]*(dN-0.2),5.4,p.z-n[1]*(dN-0.2)],B=[p.x+n[0]*(dS-0.2),5.4,p.z+n[1]*(dS-0.2)];const seg=8;let prev=A;
    for(let k=1;k<=seg;k++){const t=k/seg;const q=[A[0]+(B[0]-A[0])*t,5.4-Math.sin(t*Math.PI)*0.7,A[2]+(B[2]-A[2])*t];G.get('metal').beam(prev,q,0.025,0.025,C3(0x1a1a1a));
      G.get('glow').box(q[0],q[1]-0.16,q[2],0.12,0.14,0.12,0,C3([0xffd27a,0xff8a5c,0xfff1b0,0x9fd8ff][(k+Math.round(x))&3]));S.bulbs++;prev=q;}S.lights++;}
  for(let x=WIESI_PED[0]+18;x<WIESI_PED[1];x+=low?56:28){const p=wiesiWellritzAt(x);if(p&&wiesiFree(p.x,p.z,0.9)){wiesiPlanter(G,Z,p.x,p.z,false);S.planters++;}}
  S.meshes=G.flush(Z)+SG.flush();
  wiesiWestendScenes(Z,S);}

// ---------- Gespräche (Hessisch, frei erfundene Figuren) ----------
const WIESI_CONVS={
  landtag:[{o:'Gude! Ich bin Abgeordneter. Frei erfunden – awwer mit Diätenerhöhung.',m:'smug',c:[['Was machen Sie so?','Sitzunge. Un zwische de Sitzunge: Vorbereitung uff die nächst Sitzung.','smile'],['Und Mainz?','Meenz? Des is die Landeshauptstadt vun drübe. Mir sin die vun hibbe.','laugh']]},
    {o:'Pssst! Im Stadtschloss tagt de Landtag. Do drin werd gebabbelt, bis die Glock läut.',m:'surprised',c:[['Darf ich rein?','Nur uff die Besuchertribün. Un do musst du still sei – des is des Schwerste.','smile'],['Worüber reden die?','Über die Brück nach Meenz. Die Brück steht, awwer die Debatt is noch net fertig.','cringe']]}],
  reporter:[{o:'Jutta Schlagzeil vom Wiesbadener Abendblättche – frei erfunden! Habbe Sie e Meinung?',m:'smile',c:[['Wiesbaden ist schön!','Des druck ich: „Passant begeistert – Meenzer verzweifelt!“','laugh'],['Mainz ist schöner!','Uiuiui. Des druck ich lieber net. Sonst krieh ich Leserbriefe bis Biebrich.','cringe']]}],
  hochzeit:[{o:'Mir habbe grad Ja gesagt! Im Standesamt, im Alte Rathaus! Ei, is des schee!',m:'laugh',c:[['Herzlichen Glückwunsch!','Danke! Heut Abend werd gefeiert – mit Sekt, wie sich’s in Wiesbade gehört.','smile'],['Wo feiert ihr?','In Meenz! Do is mehr los. Awwer verrat’s net de Schwiegermudder.','smug']]},
    {o:'Ich bin de Trauzeuge. Ich hab die Ring verlegt. Zwaamol.',m:'cringe',c:[['Und jetzt?','Jetzt sin se am Finger. Un ich hab’s Zittern.','sad'],['Typisch.','Ei, des kann jedem passiern! Jedem Trauzeuge.','sad']]}],
  brunnen:[{o:'Gell, schee? De Marktbrunne mit em goldne Löwe. Der passt uff, ob die Meenzer brav sin.',m:'smug',c:[['Und, sind sie brav?','Die meiste. Die annern fahrn widder üwwer die Brück.','laugh'],['Wieso ein Löwe?','Nassauer Wappe. Die Meenzer hätte aach gern en Löwe, awwer die habbe nur e Rad.','smug']]},
    {o:'Mir sin aus Meenz, mir gucke nur. Net, dass mer sich hier noch verliebt.',m:'smile',c:[['In Wiesbaden?','Des wär e Skandal. Mei Oma tät sich im Grab erumdrehe – un die lebt noch.','laugh'],['Zu spät!','Ach, du aach? Komm, mir trinke uff de Schreck en Schoppe. In Meenz.','laugh']]}],
  rue:[{o:'Mer flaniert uff de Rue, Schätzche, mer rennt net. Des is die Wilhelmstraß!',m:'smug',c:[['Pardon!','Scho gut. Mei Pudel hat’s aach net gesehe.','smile'],['Was ist die Rue?','So sacht mer in Wiesbade. Klingt nach Paris, is awwer Hesse.','laugh']]},
    {o:'Mei Pudel kommt aus Biebrich. Der hat mehr Stammbaum wie de Landtag Sitzplätz.',m:'smug',c:[['Darf ich ihn streicheln?','Nur mit Handschuh. Der war heut schon beim Frisör.','cringe'],['Schöner Hund.','Gell? Un er bellt nur uff Meenzer. Des hab ich ihm net beigebracht, des kann er so.','laugh']]}],
  enten:[{o:'Die Ente im Warme Damm sin verwöhnt. Die nehme nur Brioche, kei Weck.',m:'smile',c:[['Darf man die füttern?','Eigentlich net. Awwer ich bin achtzisch, ich darf alles.','laugh'],['Warum Warmer Damm?','Weil’s hier im Winter warm is, sacht mer. Ich frier trotzdem.','cringe']]}],
  kurgast:[{o:'Ich bin zur Kur hier. Seit 1987. Wann ich fertig bin, sag ich Bescheid.',m:'smug',c:[['Was kurieren Sie?','Mei Laune. Die is noch net ganz fertig.','smile'],['Hilft es?','De Kochbrunne riecht wie faule Eier, awwer danach fühlt mer sich wie neu. Odder wie e Ei.','laugh']]}],
  cafe:[{o:'Ei gude! Uff de Rue trinkt mer de Kaffee mit abgespreiztem Finger. So!',m:'smug',c:[['So?','Noch e bissi feiner … ja, jetzt bist du fast e Wiesbadener.','laugh'],['Ich nehm einen Schoppen.','Schoppe? Do musst du nach Meenz. Hier gibt’s Riesling im Stielglas.','smug']]}],
  musikant:[{o:'Für e Lied en Euro, für Ruh zwaa! Wünsch dir was!',m:'laugh',c:[['Spiel was! (1 €)','Danke! Jetzt kimmt: „Am Luiseplatz, do wohnt mei Schatz“ – selbst gedichtet!','laugh',{money:-1}],['Ruhe bitte! (2 €)','Gut, ich mach e Päusche. Des is mei liebstes Lied.','smile',{money:-2}]]}],
  studis:[{o:'Mir studiere hier. Also, mir sitze hier. Des Studiere kommt noch.',m:'smile',c:[['Was studiert ihr?','Wirtschaft. Mir übe grad des Sitze uff de Bank. Bank – verstehste?','laugh'],['Und der Obelisk?','Waterloo-Denkmal, für die Soldate vun 1815. Steht im Skript. Glaab ich.','smug']]}],
  gemuese:[{o:'Tomate, Gurke, Granatäpfel! Zwaa Kilo drei Euro! Aach für Meenzer!',m:'laugh',c:[['Zwei Kilo, bitte! (3 €)','Bitteschön! Un e Petersilie dezu, umsonst. Weil du so nett guckst.','smile',{money:-3,heal:10}],['Auch für Mainzer?','Ei sicher! Die zahle bei mir des Gleiche. Nur die Tüt kost extra – Spaß!','laugh']]}],
  tavla:[{o:'Psst, ich gewinn grad! Er weiß es nur noch net.',m:'smug',c:[['Wer liegt vorn?','Ich! … Gut, er. Awwer nur, weil er Pasch gewürfelt hat. Dreimal.','sad'],['Kann ich mitspielen?','Erst Tee trinke, dann zugucke, dann verliere. So geht des hier.','laugh']]}],
  kiosk:[{o:'Hast du’s gehört? Die Meenzer wolle Kastel zurück!',m:'surprised',c:[['Wirklich?','Seit Johrzehnte! Die gebbe net uff. Mir aach net.','smug'],['Sollen sie doch!','Dann nehme mir die Fastnacht. Tausch!','laugh']]}],
  kicker:[{o:'Ey, spielst du mit? Tor is zwische de Blumekübel!',m:'laugh',c:[['Klar!','Awwer net so fest! Letzt Woch is de Ball im Gemüsestand gelandet.','laugh'],['Keine Zeit.','Dann halt net. Mir werde trotzdem Weltmeister. Vun de Wellritz.','smug']]}]};
// NPC-Gespräche als Sprechblasen: [Sprecher-Index, Text]
const WIESI_DLG={
  landtag:[[[2,'Herr Babbelbach, was sagen Sie zur Rheinbrück?'],[0,'Die Brück is wichtig. Damit die Meenzer zu uns komme – zum Schaffe.'],[1,'Un mir zu dene – zum Fastnacht feiern.'],[2,'Also Einigkeit im Landtag?'],[0,'Do muss ich erst mei Fraktion frage.']],
    [[1,'Mer brauche mehr Bänk uffm Schlossplatz!'],[0,'Un mehr Schatte!'],[2,'Und wer bezahlt das?'],[1,'Des klärt de Ausschuss.'],[0,'Nächst Johr. Odder übernächst.']],
    [[2,'Ihr Lieblingsort in Wiesbaden?'],[1,'De Plenarsaal. Do is es so schee ruhig, wenn kenner zuhört.'],[0,'Mei Stammplatz im Ratskeller. Do werd mehr entschiede wie im Plenum.']]],
  hochzeit:[[[3,'Hoch soll’n se lebe!'],[4,'Dreimal hoch!'],[0,'Ich hab Ja gesagt! In Wiesbade!'],[1,'Un gefeiert werd in Meenz. Kompromiss.'],[2,'Wo sin die Ring? … Ah, am Finger. Gut.']],
    [[4,'Die Braut is so schee wie des Kurhaus bei Nacht!'],[3,'Un de Bräutigam so nervös wie die Ampel am Ring.'],[1,'Ich hör euch!'],[0,'Losst en doch. Heut darf er nervös sei.']]],
  brunnen:[[[0,'Des is de Marktbrunne. Obe druff: de Nassauer Löwe.'],[1,'In Meenz habbe mir de Fastnachtsbrunne. Mit über hunnert Figurn!'],[0,'Un mir habbe heißes Wasser aus de Erd. Kochbrunne!'],[2,'Heißes Wasser hab ich daheim aach. Aus’m Hahn.']],
    [[2,'Is des Gold echt?'],[0,'Echt vergoldet. Wie alles in Wiesbade: mehr Glanz als … äh, schee!'],[1,'Hat se grad was zugegebe?'],[0,'Nix hab ich. Weiter geht’s zum Landtag!']]],
  cafe:[[[0,'Siehst du die Dame mit dem Pudel? Die flaniert hier seit dreißig Johr.'],[1,'Un der Pudel?'],[0,'Is de dritte. Die Dame is die erste.']],
    [[1,'Ich war gestern in Meenz.'],[0,'Un? Hast du’s überlebt?'],[1,'Mit drei Schoppe. Die habbe do e anner Tempo.']]],
  studis:[[[2,'Gehe mir noch in die Bib?'],[0,'Erst Mittag uffm Luiseplatz.'],[1,'Un dann Mittagsschlaf. Wege de Verdauung.'],[2,'Ihr seid hoffnungslos.']],
    [[0,'Wie hoch is der Obelisk eigentlich?'],[1,'Höher wie mei Notedurchschnitt.'],[2,'Des is net schwer.']]],
  gemuese:[[[0,'Frische Granatäpfel! Süß wie die Wiesbadener Luft!'],[1,'Was koste die Tomate?'],[0,'Für dich: Kilo zwaa Euro. Für de Bürgermeister: drei.'],[1,'Dann nehm ich zwaa Kilo.']],
    [[1,'Habbe Sie aach Spundekäs?'],[0,'Spundekäs? Do musst du nach Meenz! Ich hab Schafskäs.'],[1,'Aach gut. Der riecht wenigstens net nach Fastnacht.']]],
  tavla:[[[0,'Pasch! Schon widder!'],[1,'Du hast mit dem Würfel geredd, gell?'],[0,'Ich red mit jedem. Aach mit de Würfel.']],[[1,'Noch e Glas Tee?'],[0,'Ei sicher. Ohne Tee kann ich net verliere.']]],
  kiosk:[[[0,'Gude Nachbar! Hast du die Lichterkett gesehe?'],[1,'Jo, do leucht die Wellritz wie de Kurpark.'],[0,'Nur mit besserm Esse.']],
    [[1,'Mei Schwager wohnt in Kastel. Er sacht, er is Meenzer.'],[0,'Uffm Ausweis steht Wiesbade.'],[1,'Des sach ich em jed Johr an Fastnacht.']]]};
const WIESI_LINES={gemuese:['Tomate, Gurke, Granatäpfel!','Zwaa Kilo drei Euro!','Frische Minz, frische Petersilie!','Melone! Probiere kost nix!'],
  kicker:['Pass!','Tor! … Odder Blumekübel?','Nochmal!','Du foulst!'],musikant:['Für e Lied en Euro!','Am Luiseplatz, do wohnt mei Schatz …','Noch e Strophe? Kost extra!'],
  enten:['Put put put! Kommt, ihr Ente!','Die Dick do hinne kriegt nix mehr.','Brioche, nur vom Feinste.'],kurgast:['Kur is, wenn mer trotzdem lacht.','Im Kurier steht widder nix üwwer mich.'],
  rue:['Fiffi, bei Fuß!','Mer flaniert, mer rennt net.','Schätzche, guck emol, die Auslage!']};

// ---------- Szenen: NPCs nur in der Nähe und nur, solange ihre Zone gebaut ist ----------
function wiesiHuman(any){let h=new Human('ped');for(let k=0;k<4&&!any&&(h.age==='kid'||h.age==='teen');k++){h.remove();h=new Human('ped');}return h;}
function wiesiSitPose(h){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;}
function wiesiNpc(Z,x,z,face,o={}){Z.npcs=Z.npcs.filter(h=>!h.removed);const h=lazyNpc(Z,wiesiHuman(o.any));h.x=x;h.z=z;h.y=groundY(x,z);h.facing=face;h.state='venue';h.walkSpeed=0;
  if(o.name)h.npcName=o.name;h.wsit=!!o.sit;if(h.wsit)wiesiSitPose(h);h.wconv=o.conv||null;h.wlines=o.lines||null;h.wsayT=mr(2,7);h.wpose=o.pose||null;if(o.dress)wiesiDress(h,o.dress[0],o.dress[1]);h.sync();return h;}
function wiesiScene(Z,id,name,x,z,spawn,extra){const sc=Object.assign({id,name,zone:Z,x,z,npcs:[],active:false,spawn,dlg:WIESI_DLG[id]||null,ci:0,li:0,dt:2,lines:0},extra||{});WIESI.scenes.push(sc);return sc;}
function wiesiSceneOff(sc){for(const h of sc.npcs)if(!h.removed){if(TALK&&TALK.npc===h)endTalk();h.remove();}sc.npcs=[];sc.active=false;if(sc.off)sc.off(sc);}
function wiesiUpdateScenes(){for(const sc of WIESI.scenes){const d=minPlayerDist(sc.x,sc.z);if(!sc.active&&d<150){sc.active=true;sc.npcs=[];sc.ci=0;sc.li=0;sc.dt=mr(1,3);sc.spawn(sc);}else if(sc.active&&d>220)wiesiSceneOff(sc);}}
function wiesiDialog(sc,dt){sc.dt-=dt;if(sc.dt>0)return;if(minPlayerDist(sc.x,sc.z)>32){sc.dt=1;return;}const conv=sc.dlg[sc.ci%sc.dlg.length];const [who,text]=conv[sc.li];const h=sc.npcs[who];
  if(h&&!h.removed&&h.alive&&h.state==='venue'){say(h,text,3.8);sc.lines++;}sc.li++;sc.dt=4.2;if(sc.li>=conv.length){sc.li=0;sc.ci++;sc.dt=mr(8,13);}}
function wiesiTickScenes(dt){for(const sc of WIESI.scenes){if(!sc.active)continue;if(sc.update)sc.update(sc,dt);
  for(const h of sc.npcs){if(h.removed||!h.alive||h.state!=='venue')continue;if(h.wconv&&!h.forceConv)h.forceConv=mpick(WIESI_CONVS[h.wconv]);
    if(!h.wwalk){h.animate(dt,0);if(h.wsit)wiesiSitPose(h);h.y=groundY(h.x,h.z);if(h.wpose)h.wpose(h,simTime);h.sync();}
    if(h.wlines){h.wsayT-=dt;if(h.wsayT<=0){h.wsayT=mr(9,16);if(minPlayerDist(h.x,h.z)<18&&!h.bubble)say(h,mpick(h.wlines),3.4);}}}
  if(sc.dlg)wiesiDialog(sc,dt);}}
// Posen (nach animate): Arme nach vorn/unten, nie hoch – Haltungsregel
const WIESI_POSE={
  clap:(h,t)=>{const a=-0.75-Math.max(0,Math.sin(t*7+h.x))*0.15;h.armL.rotation.x=h.armR.rotation.x=a;h.armL.rotation.z=-0.35;h.armR.rotation.z=0.35;},
  mic:(h)=>{h.armR.rotation.x=-0.85;h.armR.rotation.z=0.3;},
  hold:(h)=>{h.armL.rotation.x=h.armR.rotation.x=-0.8;h.armL.rotation.z=-0.2;h.armR.rotation.z=0.2;},
  feed:(h,t)=>{h.armR.rotation.x=-0.45-Math.max(0,Math.sin(t*2.2))*0.3;h.armR.rotation.z=0.2;},
  wave:(h,t)=>{h.armR.rotation.x=-0.55+Math.sin(t*2.5)*0.2;h.armR.rotation.z=-0.3;},
  squeeze:(h,t)=>{h.armL.rotation.x=h.armR.rotation.x=-0.9;h.armL.rotation.z=-0.25-Math.sin(t*3)*0.12;h.armR.rotation.z=0.25+Math.sin(t*3)*0.12;if(h.wacc)h.wacc.scale.x=1+Math.sin(t*3)*0.35;},
  dice:(h,t)=>{h.armR.rotation.x=-0.6-Math.max(0,Math.sin(t*1.7+h.z))*0.25;},
  bouquet:(h)=>{h.armR.rotation.x=-0.5;h.armR.rotation.z=0.25;},
  kick:(h)=>{if(h.wkick)h.legR.rotation.x=-h.wkick;}};
function wiesiProp(Z,h,k,geo,col,pos,par='armR'){const m=new THREE.Mesh(wiesiGeo(Z,k,geo),cmat(col,0.6));m.position.set(...pos);h[par==='hips'?'hips':par].add(m);return m;}
function wiesiSchlossScenes(Z,S){
  {const L=WIESI_LANDTAG,base=S.stele?[S.stele.x,S.stele.z]:wiesiOut([L.x,L.z],L.f,8,4);const [cx,cz]=wiesiOut(base,L.f,3.2);const f=L.f+Math.PI;
    wiesiScene(Z,'landtag','Vor dem Landtag',cx,cz,sc=>{const {tx,tz}=wiesiDir(f);
      sc.npcs.push(wiesiNpc(Z,cx-tx*0.8,cz-tz*0.8,f,{name:'Abgeordneter Friedhelm Babbelbach (frei erfunden)',conv:'landtag',dress:[0x2b2f3a,0x2b2f3a]}));
      sc.npcs.push(wiesiNpc(Z,cx+tx*0.8,cz+tz*0.8,f,{name:'Abgeordnete Gudrun Kochbrunner (frei erfunden)',conv:'landtag',dress:[0x7a1f2b,0x2b2f3a]}));
      const r=wiesiNpc(Z,cx+wiesiDir(f).nx*1.8,cz+wiesiDir(f).nz*1.8,f+Math.PI,{name:'Reporterin Jutta Schlagzeil (frei erfunden)',conv:'reporter',pose:WIESI_POSE.mic});
      wiesiProp(Z,r,'mic',()=>new THREE.BoxGeometry(0.05,0.22,0.05),0x1a1a1a,[0,-0.62,0.08]);sc.npcs.push(r);});}
  {const A=WIESI_STANDESAMT,[cx,cz]=wiesiOut([A.x,A.z],A.f,7.5);const f=A.f+Math.PI;
    wiesiScene(Z,'hochzeit','Hochzeit am Standesamt',cx,cz,sc=>{const {tx,tz,nx,nz}=wiesiDir(f);const P=(t,n)=>[cx+tx*t+nx*n,cz+tz*t+nz*n];
      const b=wiesiNpc(Z,...P(-0.45,0),A.f,{name:'Braut Annegret (frei erfunden)',conv:'hochzeit',dress:[0xf7f5ef,0xf7f5ef]});wiesiProp(Z,b,'veil',()=>new THREE.BoxGeometry(0.34,0.55,0.03),0xffffff,[0,0.6,-0.14],'hips');
      wiesiProp(Z,b,'bouquet',()=>new THREE.SphereGeometry(0.12,8,6),0xe86a8a,[0,-0.62,0.1]);b.wpose=WIESI_POSE.bouquet;sc.npcs.push(b);
      sc.npcs.push(wiesiNpc(Z,...P(0.45,0),A.f,{name:'Bräutigam Klaus-Dieter (frei erfunden)',conv:'hochzeit',dress:[0x1f2430,0x1f2430]}));
      sc.npcs.push(wiesiNpc(Z,...P(1.4,-1.2),A.f+0.4,{name:'Trauzeuge Bernd (frei erfunden)',conv:'hochzeit',pose:WIESI_POSE.clap}));
      for(const [t,n] of wiesiLow()?[[-1.6,-1.4]]:[[-1.6,-1.4],[0,-2.3]])sc.npcs.push(wiesiNpc(Z,...P(t,n),A.f+(t<0?-0.4:0),{conv:'hochzeit',pose:WIESI_POSE.clap}));});}
  if(S.brunnen){const B=S.brunnen,cx=B.x-4.2,cz=B.z+1.5;
    wiesiScene(Z,'brunnen','Am Marktbrunnen',cx,cz,sc=>{sc.npcs.push(wiesiNpc(Z,cx,cz,Math.atan2(B.x-cx,B.z-cz),{name:'Stadtführerin Lieselotte (frei erfunden)',conv:'brunnen',pose:WIESI_POSE.wave}));
      sc.npcs.push(wiesiNpc(Z,cx-1.6,cz-1.2,0.9,{name:'Tourist Heinz aus Meenz',conv:'brunnen'}));sc.npcs.push(wiesiNpc(Z,cx-1.7,cz+0.4,1.6,{name:'Touristin Hannelore aus Meenz',conv:'brunnen'}));});}}
// kleiner Pudel (Flaneure auf der Rue)
function wiesiPoodle(Z){const G=wiesiGeo(Z,'poodle',()=>{const g=new GB(),W=C3(0xf2efe8),D=C3(0x2a2a2a);g.box(0,0.22,0,0.2,0.18,0.4,0,W);g.box(0,0.36,0.22,0.17,0.17,0.17,0,W);g.box(0,0.33,0.33,0.08,0.07,0.1,0,W);g.box(0,0.34,0.38,0.04,0.04,0.02,0,D);
    for(const [x,z] of [[0.07,0.14],[-0.07,0.14],[0.07,-0.14],[-0.07,-0.14]])g.box(x,0,z,0.06,0.24,0.06,0,W);g.box(0,0.32,-0.24,0.05,0.12,0.05,0,W);g.box(0,0.42,-0.26,0.1,0.08,0.1,0,W);g.box(0,0.46,0.22,0.15,0.08,0.15,0,W);return g.geo();});
  const m=new THREE.Mesh(G,wiesiMats(Z).cloth);m.castShadow=wiesiCast();Z.group.add(m);return {m,x:0,z:0,f:0};}
function wiesiWilhelmScenes(Z,S){
  if(S.rue){const R=S.rue,mid=R.pts[R.pts.length>>1];
    wiesiScene(Z,'rue','Flaneure auf der Rue',mid[0],mid[1],sc=>{const a=wiesiNpc(Z,mid[0],mid[1],Math.PI,{name:'Gräfin Edeltraud vom Sonnenberg (frei erfunden)',conv:'rue',lines:WIESI_LINES.rue,dress:[0x6b2a5a,0x2a2a2a]});
      const b=wiesiNpc(Z,mid[0]+0.8,mid[1],Math.PI,{name:'Herr Kommerzienrat a. D. Waldemar (frei erfunden)',conv:'rue',dress:[0x3a3a2a,0x3a3a2a]});
      for(const [h,o] of [[a,0],[b,0.75]])h.wwalk={s:R.pts.length/2,dir:1,sp:0.55,o};a.wdog=wiesiPoodle(Z);sc.npcs.push(a,b);},
      {update(sc,dt){for(const h of sc.npcs){if(!h.wwalk||h.removed||!h.alive||h.state!=='venue')continue;const w=h.wwalk,P=R.pts;w.s+=w.dir*w.sp*dt/4*(sc.npcs[0]&&sc.npcs[0].state==='talk'?0:1);
        if(w.s>=P.length-1){w.s=P.length-1;w.dir=-1;}else if(w.s<=0){w.s=0;w.dir=1;}const i=Math.min(P.length-2,Math.floor(w.s)),f=w.s-i;const x=P[i][0]+(P[i+1][0]-P[i][0])*f+w.o,z=P[i][1]+(P[i+1][1]-P[i][1])*f;
        const dx=x-h.x,dz=z-h.z;h.x=x;h.z=z;h.y=groundY(x,z);if(Math.hypot(dx,dz)>1e-4)faceTo(h,dx,dz,Math.max(dt,0.05),8);h.animate(dt,dt?w.sp*0.9:0);h.sync();
        const d=h.wdog;if(d){d.x=x-0.8;d.z=z-w.dir*1.2;d.f=w.dir>0?0:Math.PI;d.m.position.set(d.x,groundY(d.x,d.z),d.z);d.m.rotation.y=d.f;}}},
       off(sc){}});}
  const pb=S.benches.find(b=>b.pond),rb=S.benches.find(b=>!b.pond);
  if(pb)wiesiScene(Z,'enten','Entenfüttern am Warmen Damm',pb.x,pb.z,sc=>{const {tx,tz}=wiesiDir(pb.face);sc.npcs.push(wiesiNpc(Z,pb.x+tx*0.4,pb.z+tz*0.4,pb.face,{sit:true,name:'Oma Hildegard (frei erfunden)',conv:'enten',lines:WIESI_LINES.enten,pose:WIESI_POSE.feed}));});
  if(rb)wiesiScene(Z,'kurgast','Kurgast auf der Bank',rb.x,rb.z,sc=>{const {tx,tz}=wiesiDir(rb.face);const h=wiesiNpc(Z,rb.x-tx*0.4,rb.z-tz*0.4,rb.face,{sit:true,name:'Kurgast Herbert (frei erfunden)',conv:'kurgast',lines:WIESI_LINES.kurgast,pose:WIESI_POSE.hold});
    wiesiProp(Z,h,'paper',()=>new THREE.BoxGeometry(0.42,0.3,0.02),0xece6d6,[0,-0.6,0.12]);sc.npcs.push(h);});
  if(S.cafe.length){const T=S.cafe[0];wiesiScene(Z,'cafe','Café an der Rue',T.x,T.z,sc=>{for(const s of [-1,1])sc.npcs.push(wiesiNpc(Z,T.x,T.z+s*0.66,s>0?Math.PI:0,{sit:true,conv:'cafe'}));});}}
function wiesiLuisenScenes(Z,S){if(!S.obelisk)return;const O=S.obelisk;
  {const x=O.x,z=O.z+5.2;wiesiScene(Z,'musikant','Straßenmusik am Obelisk',x,z,sc=>{const h=wiesiNpc(Z,x,z,0,{name:'Akkordeon-Karl (frei erfunden)',conv:'musikant',lines:WIESI_LINES.musikant,pose:WIESI_POSE.squeeze});
    h.wacc=wiesiProp(Z,h,'acc',()=>new THREE.BoxGeometry(0.42,0.3,0.2),0xb3202a,[0,0.38,0.24],'hips');const hat=new THREE.Mesh(wiesiGeo(Z,'hat',()=>new THREE.CylinderGeometry(0.16,0.14,0.1,10)),cmat(0x2a2a2a,0.8));hat.position.set(x,0.05,z+0.8);Z.group.add(hat);sc.hat=hat;sc.npcs.push(h);},
    {off(sc){if(sc.hat&&sc.hat.parent)sc.hat.parent.remove(sc.hat);sc.hat=null;}});}
  const b=S.benches[0];if(b)wiesiScene(Z,'studis','Studis auf der Bank',b.x,b.z,sc=>{const {tx,tz,nx,nz}=wiesiDir(b.face);for(const s of [-1,1])sc.npcs.push(wiesiNpc(Z,b.x+tx*s*0.42,b.z+tz*s*0.42,b.face,{sit:true,conv:'studis'}));
    sc.npcs.push(wiesiNpc(Z,b.x+nx*1.3,b.z+nz*1.3,b.face+Math.PI,{conv:'studis'}));});}
function wiesiWestendScenes(Z,S){
  if(S.main){const M=S.main;const {nx,nz}=wiesiDir(M.f);const vx=M.x+nx*0.9+M.tx*2.0,vz=M.z+nz*0.9+M.tz*2.0;
    wiesiScene(Z,'gemuese','Obst & Gemüse Wellritz',vx,vz,sc=>{sc.npcs.push(wiesiNpc(Z,vx,vz,M.f,{name:'Gemüsehändler Cem (frei erfunden)',conv:'gemuese',lines:WIESI_LINES.gemuese,pose:WIESI_POSE.wave}));
      sc.npcs.push(wiesiNpc(Z,M.x+nx*1.6-M.tx*0.6,M.z+nz*1.6-M.tz*0.6,M.f+Math.PI,{name:'Kundin Erika (frei erfunden)',conv:'gemuese'}));});}
  if(S.tea.length){const T=S.tea[0],{tx,tz}=wiesiDir(T.f);wiesiScene(Z,'tavla','Tavla vor der Teestubb',T.x,T.z,sc=>{for(const s of [-1,1])sc.npcs.push(wiesiNpc(Z,T.x+tx*s*0.65,T.z+tz*s*0.65,T.f+(s>0?-Math.PI/2:Math.PI/2),{sit:true,conv:'tavla',pose:WIESI_POSE.dice}));});}
  {const p=wiesiWellritzAt(-3060);if(p){const n=[-p.uz,p.ux];const d=wiesiWall(p.x,p.z,-n[0],-n[1],10)||6;const x=p.x-n[0]*(d-1.6),z=p.z-n[1]*(d-1.6);
    wiesiScene(Z,'kiosk','Nachbarn am Kiosk',x,z,sc=>{sc.npcs.push(wiesiNpc(Z,x-0.6,z,Math.PI/2,{conv:'kiosk'}),wiesiNpc(Z,x+0.6,z,-Math.PI/2,{conv:'kiosk'}));});}}
  {const p=wiesiWellritzAt(-2905);if(p){const A=[p.x-p.ux*4,p.z-p.uz*4],B=[p.x+p.ux*4,p.z+p.uz*4];
    wiesiScene(Z,'kicker','Kicken in der Fußgängerzone',p.x,p.z,sc=>{const a=wiesiNpc(Z,A[0],A[1],Math.atan2(B[0]-A[0],B[1]-A[1]),{any:true,conv:'kicker',lines:WIESI_LINES.kicker,pose:WIESI_POSE.kick});
      const b=wiesiNpc(Z,B[0],B[1],Math.atan2(A[0]-B[0],A[1]-B[1]),{any:true,conv:'kicker',pose:WIESI_POSE.kick});sc.npcs.push(a,b);
      const ball=new THREE.Mesh(wiesiGeo(Z,'ball',()=>new THREE.SphereGeometry(0.11,10,8)),cmat(0xf4f4f4,0.5));ball.castShadow=wiesiCast();Z.group.add(ball);sc.ball={m:ball,t:0,from:0,kicks:0,x:A[0],z:A[1]};S.ball=sc.ball;},
      {update(sc,dt){const bl=sc.ball;if(!bl)return;const [a,b]=sc.npcs;if(!a||!b||a.state!=='venue'||b.state!=='venue'){bl.m.visible=false;return;}bl.m.visible=true;bl.t+=dt/1.3;
        if(bl.t>=1){bl.t=0;bl.from^=1;bl.kicks++;}const P=bl.from?[b,a]:[a,b];const f=bl.t;bl.x=P[0].x+(P[1].x-P[0].x)*f;bl.z=P[0].z+(P[1].z-P[0].z)*f;bl.m.position.set(bl.x,0.11+Math.sin(f*Math.PI)*0.9,bl.z);
        P[0].wkick=f<0.15?0.9*(1-f/0.15):0;P[1].wkick=0;},off(sc){if(sc.ball&&sc.ball.m.parent)sc.ball.m.parent.remove(sc.ball.m);sc.ball=null;S.ball=null;}});}}}

// ---------- Begehbare Orte: Ratskeller (Neues Rathaus), Teestubb (Wellritzstraße) ----------
const WIESI_RK_LINES={wirt:['Handkäs mit Musik? Zwiebel extra!','Platz is überall, außer am Stammtisch.','Riesling odder Äbbelwoi? Hier gibt’s beides.'],
  stamm:['Ich stell en Antrag: noch e Runde!','Angenomme! Einstimmig!','Im Rathaus babbele mer, im Ratskeller entscheide mer.','Die Meenzer habbe aach en Ratskeller? Unser Gewölb is älter. Glaab ich.'],
  gast:['Des Handkäs riecht, awwer er schmeckt!','Prost, Nachbar!','Mei Fraa denkt, ich bin noch im Büro.','Noch e Schoppe Äbbelwoi, bitte!']};
const WIESI_RATSKELLER={id:'wiesi_ratskeller',name:'Ratskeller',sub:'Im Neuen Rathaus · Handkäs, Woi un Stammtisch',wiesi:'schloss',W:22,D:16,H:4.4,wall:0xcdbfa6,ceil:0xd9cdb5,hemiI:0.6,exp:0.95,lampI:24,lampD:20,
  door:WIESI_DOORS.ratskeller,lights:[[-6,3.8,-3],[6,3.8,-3],[-6,3.8,4],[6,3.8,4]],wp:[[-8,0],[8,0],[0,4],[-4,5.5],[4,5.5],[0,-1.5]],
  spawn:[0,6.6,Math.PI],exits:[{x:0,z:7.6,w:1.4,d:0.8,to:'door'}],
  hints:[{x:7.5,z:-5,r:2.6,t:'<b>F</b>: Handkäs mit Musik (5 €)'},{x:-6,z:-4,r:3,t:'De Stammtisch. Do werd Politik gemacht – mit Woi.'}],
  build(r,B){r.grp.children[0].material=stdMat({map:stoneTileTex,roughness:0.7});const W=22,D=16,H=4.4;
    for(let x=-9;x<=9;x+=3){B.box('stone',x,H-0.55,0,0.5,0.55,D,0xb9ab90);}for(const x of [-4.5,4.5])for(const z of [-3,3])B.sbox('stone',x,0,z,0.8,H,0.8,0xb9ab90);
    for(const [x,z] of [[-6,-4],[-1,-4],[-6,1.5],[-1,1.5],[4,1.5]]){B.sbox('wood',x,0,z,3.6,0.76,1.1,0x6b4426);for(const s of [-1,1])B.box('wood',x,0,z+s*0.95,3.6,0.45,0.4,0x4a2f1a);}
    B.sbox('wood',7.5,0,-6.4,5,1.1,1.0,0x5a3a22);B.box('wood',7.5,1.1,-6.4,5.2,0.06,1.2,0x3a2414);for(let i=0;i<6;i++)B.box('glass',5.6+i*0.7,1.16,-6.4,0.12,0.22,0.12,0xf3d27a);
    for(const z of [-7.2,-4.5])B.sbox('wood',-10,0,z,1.1,1.3,1.1,0x7a4a26);B.box('cloth',-6,2.4,-7.74,4,0.9,0.05,0x1f3b2c);B.box('wood',0,0,-7.76,21.2,1.2,0.06,0x5a3a22);for(const x of [-10.76,10.76])B.box('wood',x,0,0,0.06,1.2,15.2,0x5a3a22);
    B.plane(textTex('Stammtisch',{w:384,h:96,bg:'#1f3b2c',fg:'#e7d27a'}),-6,2.85,-7.7,2.6,0.65,0);B.box('wood',0,0,7.9,2.4,2.6,0.2,0x3a2516);},
  npcs(r){vPerson(r,7.5,-7.3,0,{role:'stand',lines:WIESI_RK_LINES.wirt});
    for(const [x,z,f] of [[-7,-3.05,Math.PI],[-5,-3.05,Math.PI],[-7,-4.95,0],[-5,-4.95,0]])vPerson(r,x,z,f,{pose:'sit',lines:WIESI_RK_LINES.stamm});
    for(const [x,z,f] of [[-1.5,2.45,Math.PI],[-0.5,0.55,0],[4,2.45,Math.PI],[4.8,0.55,0]])vPerson(r,x,z,f,{pose:'sit',lines:WIESI_RK_LINES.gast});
    vPerson(r,0,3,0,{lines:['Kommt sofort!','Zwaa Handkäs, ein Riesling – un was für dich?']});},
  interact(P,r){const h=P.h;if(Math.hypot(h.x-r.ox-7.5,h.z-r.oz+5)>2.8){hint('Geh an die Theke hinne rechts.',2,P);return;}
    if(G.money<5){hint('Fünf Euro fehle dir. Ohne Geld kei Handkäs – un kei Musik.',2.5,P);return;}G.money-=5;h.health=Math.min(100,(h.health||0)+30);WIESI.stats.handkaes++;
    const k=r.people[0];if(k&&k.alive)say(k,'Bitteschön: Handkäs mit Musik! Die Musik kimmt später.',3);hint('Handkäs mit Musik: +30 Gesundheit',2.5,P);chime([660,880]);},
  onEnter(){WIESI.stats.ratskeller++;}};
const WIESI_TEESTUBB={id:'wiesi_teestubb',name:'Teestubb am Wellritz',sub:'Wellritzstraße · Tee, Tavla un Gebabbel',wiesi:'westend',W:12,D:14,H:3.4,wall:0xe8d9bd,ceil:0xd8c7a8,hemiI:0.65,exp:1.0,lampI:20,lampD:16,
  door:WIESI_DOORS.teestubb,lights:[[-3,3,-3],[3,3,-3],[0,3,3]],wp:[[-3,-1],[3,-1],[0,3],[-3,4],[3,4]],
  spawn:[0,5.6,Math.PI],exits:[{x:0,z:6.6,w:1.2,d:0.8,to:'door'}],
  hints:[{x:3.5,z:-5,r:2.4,t:'<b>F</b>: Glas Tee (1 €)'},{x:-3,z:0,r:2.5,t:'Tavla – wer verliert, zahlt de nächste Tee.'}],
  build(r,B){r.grp.children[0].material=stdMat({color:0x8a5a3a,roughness:0.8});
    for(const [x,z,c] of [[-3,-1,0x9b2335],[3,-1,0x1d4e89],[-3,3.5,0x2f6b4a],[3,3.5,0x8a5a1a]]){B.box('cloth',x,0.01,z,3.8,0.02,2.4,c);B.sbox('wood',x,0,z,1.0,0.48,1.0,0x7a4a26);
      B.box('wood',x,0.48,z,0.6,0.05,0.4,0x3a2214);for(const s of [-1,1])B.box('cloth',x+s*1.45,0,z,0.5,0.38,0.5,0xb3202a);}
    B.sbox('wood',3.5,0,-6.2,4.4,1.05,0.9,0x6b4426);B.box('metal',4.6,1.05,-6.2,0.45,0.7,0.45,0xc0c4c8);B.box('metal',4.6,1.75,-6.2,0.3,0.25,0.3,0xd4af37);
    for(let i=0;i<5;i++)B.box('glass',2+i*0.4,1.05,-6.0,0.08,0.14,0.08,0xb0401a);
    for(const x of [-5.76,5.76])B.box('cloth',x,0.8,0,0.05,1.8,5,0x9b2335);B.box('cloth',-2,1.2,-6.76,3.5,1.4,0.05,0x1d4e89);B.box('wood',0,0,6.9,1.8,2.4,0.2,0x5a2a1a);},
  npcs(r){vPerson(r,3.5,-7.0,0,{role:'stand',lines:['Tee is fertisch! Zwaa Stück Zucker, wie immer?','Setz dich, hier hat jeder Zeit.','Des Glas Tee kost en Euro. Des Gebabbel is umsonst.']});
    const T=['Pasch!','Noch en Tee, bitte!','Mei Enkel studiert in Meenz. Mer verzeiht’s em.','In de Wellritz kennt jeder jeden. Un jeder weiß alles.'];
    for(const [x,z,f] of [[-4.45,-1,Math.PI/2],[-1.55,-1,-Math.PI/2],[1.55,3.5,Math.PI/2],[4.45,3.5,-Math.PI/2],[1.55,-1,Math.PI/2]])vPerson(r,x,z,f,{pose:'sit',lines:T});vPerson(r,0,1.5,0,{lines:T});},
  interact(P,r){const h=P.h;if(Math.hypot(h.x-r.ox-3.5,h.z-r.oz+5)>2.6){hint('Die Theke is hinne rechts.',2,P);return;}
    if(G.money<1){hint('En Euro fehlt dir. Frag de Wirt – vielleicht schreibt er’s an.',2.5,P);return;}G.money-=1;h.health=Math.min(100,(h.health||0)+10);WIESI.stats.tee++;
    const k=r.people[0];if(k&&k.alive)say(k,'Bitteschön, frisch gebrüht! Vorsicht, heiß.',3);hint('Glas Tee: +10 Gesundheit',2.5,P);chime([700,880]);},
  onEnter(){WIESI.stats.teestubb++;}};
VENUES.push(WIESI_RATSKELLER,WIESI_TEESTUBB);
function wiesiRoomBusy(v){const r=v.room;return !!r&&(INDOOR===r||PLAYERS.some(P=>P.h&&P.h.room===r));}
// Innenraum freigeben, sobald er leer ist und seine Zone entsorgt wurde (geteilte Venue-Materialien bleiben)
function wiesiRoomGC(){for(const v of [WIESI_RATSKELLER,WIESI_TEESTUBB]){const r=v.room;const Z=WIESI.zone[v.wiesi];if(!r||wiesiRoomBusy(v)||Z&&Z.built)continue;
  for(const o of r.people)if(!o.removed)o.remove();r.people=[];scene.remove(r.grp);const keep=new Set([...Object.values(VMATS),...mcache.values()]);
  r.grp.traverse(o=>{if(o.geometry)o.geometry.dispose();const m=o.material;if(m)for(const x of Array.isArray(m)?m:[m])if(!keep.has(x)){if(x.map&&x.map!==stoneTileTex)x.map.dispose();x.dispose();}});
  v.room=null;WIESI.stats.roomFrees++;}}
// update() blendet bei INDOOR alle Nicht-Spieler aus – die Gäste im eigenen Raum vor dem Rendern wieder einblenden
const _wiesiRenderFrame=renderFrame;
renderFrame=function(){const r=INDOOR;if(r&&r.venue&&r.venue.wiesi)for(const o of r.people)if(!o.removed)o.g.visible=true;_wiesiRenderFrame();};

// ---------- Schnellreise: feste Koordinaten, eigene Gruppe, keine „besonderen Orte“ ----------
const _wiesiFtSpecials=ftSpecials;
ftSpecials=function(){const S=_wiesiFtSpecials();for(const d of WIESI.ft)S.push(d);return S;};

// ---------- Zonen, Setup, Update ----------
const WIESI_BUILD={schloss:wiesiSchlossBuild,wilhelm:wiesiWilhelmBuild,luisen:wiesiLuisenBuild,westend:wiesiWestendBuild};
function wiesiZoneDispose(Z){for(let i=WIESI.scenes.length-1;i>=0;i--){const sc=WIESI.scenes[i];if(sc.zone!==Z)continue;wiesiSceneOff(sc);WIESI.scenes.splice(i,1);}
  WIESI.st[Z.wiesiKey]=null;Z.wmats=null;Z.wgeo=null;Z.hits=null;WIESI.hitOn--;}
// Beim Boot nur Zahlen (Vertrag Welle 9): Zonen, Schnellreise-Ziele, Kartenbeschriftungen – keine Geometrie, keine NPCs
function setupWiesi(){if(WIESI.zones.length)return;WIESI.convs=WIESI_CONVS;WIESI.dlg=WIESI_DLG;
  for(const k in WIESI_ZONES){const [x,z]=WIESI_ZONES[k];const Z=lazyZone({name:'wiesi_'+k,x,z,build(Z){WIESI.hitOn++;wiesiRng(()=>WIESI_BUILD[k](Z));},dispose:wiesiZoneDispose});Z.wiesiKey=k;WIESI.zones.push(Z);WIESI.zone[k]=Z;}
  for(const [n,x,z] of WIESI_FT)WIESI.ft.push({n,g:WIESI_GROUP,x,z});
  WIESI.venues={ratskeller:WIESI_RATSKELLER,teestubb:WIESI_TEESTUBB};
  for(const [n,x,z] of [['Schlossplatz',-2290,-9310],['Luisenplatz',-2451,-8880],['Warmer Damm',-1990,-9150],['Wellritzstraße',-2990,-9340]])label(n,x,z,'small');}
function wiesiUpdate(dt){wiesiRoomGC();if(!WIESI.hitOn)return;
  WIESI.sceneT-=dt;if(WIESI.sceneT<=0){WIESI.sceneT=0.5;wiesiUpdateScenes();}
  wiesiTickScenes(dt);
  const W=WIESI.st.wilhelm;if(W){if(W.duckMesh&&minPlayerDist(W.pond.x,W.pond.z)<160)wiesiDucks(W,dt);if(W.jet)W.jet.m.scale.y=W.jet.h*(0.9+Math.sin(simTime*2.3)*0.1);}
  const L=WIESI.st.luisen;if(L&&L.pigMesh&&minPlayerDist(L.obelisk.x,L.obelisk.z)<120)wiesiPigeons(L,dt);}
function updateWiesi(dt){if(mode!=='play')return;wiesiRng(()=>wiesiUpdate(dt));}
// Test-Zugang: Zone direkt bauen/entsorgen bzw. einen Update-Schritt ausführen (ohne Spielerbewegung)
WIESI.forceBuild=k=>lazyBuild(WIESI.zone[k]);WIESI.forceDispose=k=>lazyDispose(WIESI.zone[k]);WIESI.tick=dt=>updateWiesi(dt);
