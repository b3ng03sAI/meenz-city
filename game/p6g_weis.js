// ===================== 40 Detail: Weisenau (Mainz) =====================
// Synagoge Weisenau als Modell an der OSM-Position (Ruhezone, Gedenktafel), Zementwerk + Kalksteinbruch am Südrand
// (generisch, ohne Firmennamen/Logos), Weisenauer Rheinufer (Promenade, Bänke, Strandkiosk als begehbarer Ort),
// Großberg-Siedlung (Hecken, Garagenhöfe), Mundart-Szenen, Schnellreise-Ziele.
// Lazy (Vertrag Welle 8): setupWeis berechnet nur das Layout (Zahlen) und meldet drei Zonen an (Synagoge, Rheinufer,
// Süd = Zementwerk + Steinbruch + Großberg). Meshes, Materialien, Texturen, NPCs und Kollision entstehen erst beim Bau
// der Zone und werden beim Entsorgen exakt zurückgenommen (HG/ELEV über ein Journal).
const WEIS={zones:{},blocks:{syn:[],ufer:[],sued:[]},J0:null,qOn:false,
  zement:{rect:[2392,2330,2530,2430],silos:[],tower:null,kiln:null,cooler:null,chimney:null,halls:[],crusher:null,belts:[],fence:0,gate:null,texts:[],emit:[]},
  steinbruch:{rect:null,floor:null,rim:16,terraces:[],viewpoint:null,fence:0,fenceCells:null,fenceLines:[],excavators:[],truck:null,bushes:0},
  synagoge:null,calm:null,kiosk:{venue:null,pos:null},ufer:{path:[],benches:[],lamps:[],chairs:[],sand:0},
  grossberg:{rect:[2060,2150,2390,2420],hedges:[],garages:[]},scenes:[],ft:[],texts:[],
  stats:{},dustT:0,hintT:0,calmT:0,calmed:0,roomsFreed:0,
  BRAND_RX:/heidelberg|dyckerhoff|portland|holcim|cemex|lafarge|schwenk|buzzi|materials/i};

// ---------- Kollisions-Journal: jede HG/ELEV-Änderung merkt den alten Wert, weisUndo stellt rückwärts exakt wieder her ----------
function weisJ(){return {hg:[],el:[]};}
function weisHg(J,i,v){if(i<0)return;const o=hgG(i);if(o===255||o>=v)return;J.hg.push(i,o);hgS(i,v);}
// b: Kiste {x,z,w,d,rot,h} oder Kreis {x,z,r,h} (gleiche Rasterregeln wie rasterOBB/rasterCirc)
function weisBlock(J,b){const {x,z,h}=b;
  if(b.r!==undefined){const r=b.r;for(let iz=Math.floor(z-r);iz<=Math.ceil(z+r);iz++)for(let ix=Math.floor(x-r);ix<=Math.ceil(x+r);ix++){const dx=ix+0.5-x,dz=iz+0.5-z;if(dx*dx+dz*dz<=r*r)weisHg(J,idx(ix+0.5,iz+0.5),h);}return;}
  const c=Math.cos(b.rot||0),s=Math.sin(b.rot||0),r=Math.hypot(b.w,b.d)/2+1;
  for(let iz=Math.floor(z-r);iz<=Math.ceil(z+r);iz++)for(let ix=Math.floor(x-r);ix<=Math.ceil(x+r);ix++){const dx=ix+0.5-x,dz=iz+0.5-z;
    if(Math.abs(dx*c-dz*s)<=b.w/2&&Math.abs(dx*s+dz*c)<=b.d/2)weisHg(J,idx(ix+0.5,iz+0.5),h);}}
function weisElev(J,i,b,t){if(i<0)return;const e=ELEV.get(i);J.el.push(i,e?{b:e.b,t:e.t}:null);elevSetI(i,b,t);}
function weisElevOBB(J,x,z,w,d,b,t){for(let iz=Math.floor(z-d/2-1);iz<=Math.ceil(z+d/2+1);iz++)for(let ix=Math.floor(x-w/2-1);ix<=Math.ceil(x+w/2+1);ix++){
  if(Math.abs(ix+0.5-x)<=w/2&&Math.abs(iz+0.5-z)<=d/2)weisElev(J,idx(ix+0.5,iz+0.5),b,t);}}
function weisUndo(J){if(!J)return;
  for(let k=J.el.length-2;k>=0;k-=2){const i=J.el[k],e=J.el[k+1],c=ELEV.get(i);if(!e)ELEV.delete(i);else if(c){c.b=e.b;c.t=e.t;}else ELEV.set(i,{b:e.b,t:e.t});}
  for(let k=J.hg.length-2;k>=0;k-=2)hgS(J.hg[k],J.hg[k+1]);J.hg.length=0;J.el.length=0;}
// Beim Layout gilt die Kollision vorläufig (J0), damit spätere Elemente ausweichen; danach wird alles zurückgenommen
function weisFixed(zone,b){WEIS.blocks[zone].push(b);weisBlock(WEIS.J0,b);}
function weisProp(o,b){o.b=b;weisBlock(WEIS.J0,b);return o;}
// Qualität „niedrig“: etwa die Hälfte der Requisiten und Figuren
function weisKeep(list){return QS.lowLOD?list.filter((_,i)=>i%2===0):list;}

// ---------- Steinbruch: Hang-Steinbruch mit Terrassen (Höhenfeld über STEP_FNS, Sohle auf Bodenhöhe) ----------
// Sohle (fx0..fx1, z0..fz1) nach Norden offen, ringsum 4 Terrassen à 4 m, außen begehbarer Grashang, oben Plateau bis zum Kartenrand
const WEIS_Q={x0:2208,x1:2386,z0:2488,z1:MAXZ-0.5,fx0:2272,fx1:2322,fz1:2556,th:4,tn:4,td:6.5,slope:0.75};
function weisQH(x,z){const Q=WEIS_Q;if(x<=Q.x0||x>=Q.x1||z<=Q.z0)return 0;const dIn=Math.max(Q.fx0-x,x-Q.fx1,z-Q.fz1);if(dIn<=0)return 0;
  return Math.min(Q.th*Math.min(Q.tn,Math.ceil(dIn/Q.td)),Math.min(x-Q.x0,Q.x1-x,z-Q.z0)*Q.slope);}
// Höhenfeld als Stufenfläche: stepAt-Wrapper statt STEP_BB zu vergrößern (sonst verliert die ganze Stadt den Schnellausstieg)
const _weisStepAt=stepAt;
stepAt=function(x,z){if(WEIS.qOn&&x>WEIS_Q.x0&&x<WEIS_Q.x1&&z>WEIS_Q.z0){const h=weisQH(x,z);if(h>0.01)return h;}return _weisStepAt(x,z);};

// ---------- Weltgenerierung: keine Bäume im Werk/Steinbruch, OSM-Gebäude der Synagoge durch das Modell ersetzen ----------
function weisSegDist(x,z,a,b){const dx=b[0]-a[0],dz=b[2]-a[2],L2=dx*dx+dz*dz||1;const t=clamp(((x-a[0])*dx+(z-a[2])*dz)/L2,0,1);return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);}
function weisNoTree(x,z){const Q=WEIS_Q,R=WEIS.zement.rect;if(x>Q.x0-2&&x<Q.x1+2&&z>Q.z0-2)return true;if(x>R[0]-3&&x<R[2]+3&&z>R[1]-3&&z<R[3]+3)return true;
  for(const b of WEIS_BELTS)if(weisSegDist(x,z,b.a,b.b)<5)return true;return false;}
const WEIS_BELTS=[{a:[2318,6,2493],b:[2404,13,2408]},{a:[2420,11,2392],b:[2427,31,2356]},{a:[2460,18,2410],b:[2476,40,2368]}];
const _weisAddTree=addTree;
addTree=function(x,z,s,force){if(weisNoTree(x,z))return false;return _weisAddTree(x,z,s,force);};
const _weisPlanOSM=planOSMBuilding;
planOSMBuilding=function(b){if(b&&b.name==='Weisenauer Synagoge'){WEIS.synSrc=b;return;}return _weisPlanOSM(b);};

// ---------- Geometrie-Helfer (Weltkoordinaten, GB mit Vertexfarben) ----------
function weisCyl(G,x,y0,z,r,h,col,seg=16,top=true,r2){r2=r2??r;const ref=[x,y0+h/2,z];const P=(a,rr,y)=>[x+Math.cos(a)*rr,y,z+Math.sin(a)*rr];
  for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;G.quadOut(P(a0,r,y0),P(a1,r,y0),P(a1,r2,y0+h),P(a0,r2,y0+h),[0,0],[1,0],[1,1],[0,1],col,ref);
    if(top&&r2>0.01)G.triOut([x,y0+h,z],P(a0,r2,y0+h),P(a1,r2,y0+h),[0,0],[1,0],[0,1],col,[x,y0,z]);}}
function weisTube(G,a,b,r,col,seg=12){const d=norm3(sub3(b,a));let s=norm3(cross3(d,[0,1,0]));if(!isFinite(s[0])||Math.abs(d[1])>0.999)s=[1,0,0];const u=norm3(cross3(s,d));
  const P=(c,t)=>[c[0]+(s[0]*Math.cos(t)+u[0]*Math.sin(t))*r,c[1]+(s[1]*Math.cos(t)+u[1]*Math.sin(t))*r,c[2]+(s[2]*Math.cos(t)+u[2]*Math.sin(t))*r];
  const m=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
  for(let i=0;i<seg;i++){const t0=i/seg*TAU,t1=(i+1)/seg*TAU;G.quadOut(P(a,t0),P(a,t1),P(b,t1),P(b,t0),[0,0],[1,0],[1,1],[0,1],col,m);
    G.triOut(a,P(a,t0),P(a,t1),[0,0],[1,0],[0,1],col,b);G.triOut(b,P(b,t1),P(b,t0),[0,0],[1,0],[0,1],col,a);}}
function weisGable(G,x,z,w,d,rot,y,rh,col,end){const c=Math.cos(rot),s=Math.sin(rot);const P=(lx,yy,lz)=>[x+c*lx+s*lz,yy,z-s*lx+c*lz];const hw=w/2,hd=d/2,ref=[x,y,z];
  G.quadOut(P(-hw,y,-hd),P(hw,y,-hd),P(hw,y+rh,0),P(-hw,y+rh,0),[0,0],[1,0],[1,1],[0,1],col,ref);G.quadOut(P(hw,y,hd),P(-hw,y,hd),P(-hw,y+rh,0),P(hw,y+rh,0),[0,0],[1,0],[1,1],[0,1],col,ref);
  G.triOut(P(-hw,y,-hd),P(-hw,y,hd),P(-hw,y+rh,0),[0,0],[1,0],[0.5,1],end||col,ref);G.triOut(P(hw,y,hd),P(hw,y,-hd),P(hw,y+rh,0),[0,0],[1,0],[0.5,1],end||col,ref);}
function weisHip(G,x,z,L,W,rot,y,rh,col){const c=Math.cos(rot),s=Math.sin(rot);const P=(lx,yy,lz)=>[x+c*lx+s*lz,yy,z-s*lx+c*lz];const hl=L/2,hw=W/2,rr=Math.max(0.05,hl-hw),ref=[x,y,z];
  G.quadOut(P(-hl,y,hw),P(hl,y,hw),P(rr,y+rh,0),P(-rr,y+rh,0),[0,0],[1,0],[1,1],[0,1],col,ref);G.quadOut(P(hl,y,-hw),P(-hl,y,-hw),P(-rr,y+rh,0),P(rr,y+rh,0),[0,0],[1,0],[1,1],[0,1],col,ref);
  G.triOut(P(hl,y,hw),P(hl,y,-hw),P(rr,y+rh,0),[0,0],[1,0],[0.5,1],col,ref);G.triOut(P(-hl,y,-hw),P(-hl,y,hw),P(-rr,y+rh,0),[0,0],[1,0],[0.5,1],col,ref);}
// lokales Bezugssystem (Drehung wie GB.box): Punkt und Kiste relativ zu (x,y,z,rot)
function weisLF(x,y,z,rot){const c=Math.cos(rot),s=Math.sin(rot);const P=(lx,ly,lz)=>[x+c*lx+s*lz,y+ly,z-s*lx+c*lz];
  return {P,box:(G,lx,ly,lz,w,h,d,col)=>{const p=P(lx,ly,lz);G.box(p[0],p[1],p[2],w,h,d,rot,col);}};}
// Textur-Quad (Atlas): Unterkante links bei (x,z), nach rechts entlang (rx,rz), Blick von außen
function weisTexQuad(G,x,z,rx,rz,w,y0,h,uv){G.quad([x,y0,z],[x+rx*w,y0,z+rz*w],[x+rx*w,y0+h,z+rz*w],[x,y0+h,z],uv[0],uv[1],uv[2],uv[3]);}
const WEIS_ATL={W:1024,H:512,win:[0,0,128,320],door:[128,0,256,320],plaque:[256,0,768,320],kiosk:[0,320,512,416],view:[512,320,1024,512]};
function weisUV(r){const u0=r[0]/WEIS_ATL.W,u1=r[2]/WEIS_ATL.W,v0=1-r[3]/WEIS_ATL.H,v1=1-r[1]/WEIS_ATL.H;return [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];}

// ---------- Texte ----------
const WEIS_PLAQUE=['Synagoge Weisenau','Historische Synagoge der jüdischen','Gemeinde Weisenau, erbaut im','18. Jahrhundert. Ein Ort der Erinnerung.'];
const WEIS_KIOSK_SIGN='Strandkiosk am Leinpfad';
const WEIS_VIEW_SIGN=['Aussichtspunkt Steinbruch','Kalkstein aus dem Mainzer Becken','Bitte hinter dem Zaun bleiben!'];
WEIS.texts.push(...WEIS_PLAQUE,WEIS_KIOSK_SIGN,...WEIS_VIEW_SIGN);

// ---------- Strandkiosk (begehbar, Muster p4p_venues.js) ----------
const WEIS_WIRT=['Ei Gude! En Schoppe oder e Fleischworscht?','Rhoiblick is gratis. Des Bier net.','Mir hawwe bis zum Sunneunnergang uff.','Die Weck sin vun heit morsche, versproche!','Wer hier Ärger macht, kriegt Hausverbot – un kää Worscht!'];
const WEIS_GAST=['Do sitz isch jeden Daach. Mei Fraa denkt, isch bin im Turnverein.','Noch ään Schoppe, dann geh isch hääm. Ehrlich.','Die Schiffe do drauß, die fahrn all nach Bingen. Odder Holland.','Weisenau is des schennste Eck vun Meenz – sach’s net weiter!'];
WEIS.kiosk.venue={id:'weiskiosk',name:'Strandkiosk am Leinpfad',sub:'Weisenauer Rheinufer · Kiosk & Biergarten',W:12,D:9,H:3.8,wall:0xd9c7a3,ceil:0xb8946a,hemiI:0.75,exp:1.0,lampI:20,lampD:16,
  lights:[[-3,3,0],[3,3,0]],wp:[[-3,1.2],[3,1.2],[0,2.4],[-4,-1],[4,-1],[0,-1.5]],spawn:[0,2.8,Math.PI],exits:[{x:0,z:3.9,w:1.4,d:0.8,to:'door'}],
  hints:[{x:0,z:-2.6,r:2.2,t:'Theke vum Strandkiosk: Schoppe, Bier un Fleischworscht.'}],
  build(r,B){const fl=r.grp.children[0];fl.material.dispose();fl.material=r.weisFloor=stdMat({color:0x9a7650,roughness:0.85});
    B.sbox('wood',0,0,-3,6,1.1,0.8,0x6b4426);B.box('wood',0,1.1,-3,6.3,0.08,0.95,0x8a5a30);                          // Theke
    B.box('wood',0,0.9,-4.25,8,1.9,0.35,0x5a3a22);for(let k=0;k<14;k++)B.box('glow',-3.4+k*0.52,1.55+(k%2)*0.45,-4.05,0.12,0.32,0.12,[0x2e7d32,0xc9a227,0x8d0801,0x1d3557][k%4]); // Flaschen
    B.box('metal',1.2,1.18,-3,0.12,0.42,0.12,0xcccccc);B.box('metal',1.6,1.18,-3,0.12,0.42,0.12,0xcccccc);                  // Zapfhähne
    B.sbox('metal',-5.2,0,-3.8,1.1,2.0,0.8,0xdfe6ea);B.box('glow',-5.2,0.25,-3.39,0.95,1.5,0.02,0xbfe8ff);                   // Kühlschrank
    for(const [x,z] of [[-3.5,1],[3.5,1],[-2,2.6],[-3.8,-0.8],[3.8,-0.8]]){B.sbox('wood',x,0,z,0.8,1.05,0.8,0x7a5230);B.box('wood',x,1.05,z,1.0,0.06,1.0,0x9a6a3a);}
    B.box('glow',-5.92,1.0,0.5,0.04,1.4,3.6,0x9fd3ff);B.box('glow',5.92,1.0,0.5,0.04,1.4,3.6,0x9fd3ff);                       // Rhoiblick-Fenster
    for(let k=0;k<11;k++)B.box('glow',-5+k,3.5,2.6+Math.sin(k)*0.15,0.12,0.12,0.12,[0xffd27a,0xff7a5c,0x9fe0ff][k%3]); // Lichterkette
    B.box('wood',0,0,4.4,1.6,2.4,0.2,0x3a2512);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.1,6,16),cmat(0xe63946,0.6));ring.position.set(-2.5,2.2,-4.05);r.grp.add(ring);},
  npcs(r){vPerson(r,0,-3.75,0,{role:'stand',lines:WEIS_WIRT});
    vPerson(r,-3.5,0.45,0,{pose:'sit',lines:WEIS_GAST});vPerson(r,3.5,0.45,0,{pose:'sit',lines:WEIS_GAST});
    for(let k=0;k<2;k++)vPerson(r,mr(-3,3),mr(-1,2),mr(0,6),{lines:WEIS_GAST});},
  onEnter(){venueMusic('mall');}};
VENUES.push(WEIS.kiosk.venue);

// ---------- Aufbau (Boot): Layout, Kollision, Ort, Szenen, Schnellreise ----------
function weisSetupSynagoge(){const src=WEIS.synSrc;const poly=src?src.poly:[[1760.1,1456.4],[1766.3,1463.0],[1758.7,1470.1],[1752.5,1463.5]];
  let best=0,ux=1,uz=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L>best){best=L;ux=(b[0]-a[0])/L;uz=(b[1]-a[1])/L;}}
  const vx=-uz,vz=ux;let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;for(const p of poly){const a=p[0]*ux+p[1]*uz,b=p[0]*vx+p[1]*vz;a0=Math.min(a0,a);a1=Math.max(a1,a);b0=Math.min(b0,b);b1=Math.max(b1,b);}
  const ca=(a0+a1)/2,cb=(b0+b1)/2,x=ca*ux+cb*vx,z=ca*uz+cb*vz,L=a1-a0,W=b1-b0,rot=Math.atan2(-uz,ux);
  // Eingangsseite: die Seite, die zum nächsten Weg zeigt
  const n=nearestNode(x,z,false);const tx=n>=0?NODES[n].x-x:1,tz=n>=0?NODES[n].z-z:0;
  const sides=[[0,1,L,W/2],[0,-1,L,W/2],[1,0,W,L/2],[-1,0,W,L/2]].map(([lx,lz,len,off])=>{const nx=lx*ux+lz*vx,nz=lx*uz+lz*vz;return {lx,lz,nx,nz,len,off,dot:nx*tx+nz*tz};});
  const ds=sides.reduce((a,b)=>b.dot>a.dot?b:a);const rx=ds.nz,rz=-ds.nx;
  const door={x:x+ds.nx*ds.off,z:z+ds.nz*ds.off,face:Math.atan2(ds.nx,ds.nz)};
  const plaque={x:door.x+ds.nx*1.9+rx*2.6,z:door.z+ds.nz*1.9+rz*2.6,face:door.face,text:WEIS_PLAQUE[0]+' – '+WEIS_PLAQUE.slice(1).join(' ')};
  WEIS.synagoge={x,z,L,W,rot,H:7.2,roofH:4,door,plaque,doorSide:ds,osm:!!src,name:'Synagoge Weisenau'};WEIS.calm={x,z,r:28};
  weisFixed('syn',{x,z,w:L,d:W,rot,h:12});label('Synagoge Weisenau',x,z);}

function weisSetupQuarry(){const Q=WEIS_Q,S=WEIS.steinbruch;S.rect=[Q.x0,Q.z0,Q.x1,Q.z1];S.floor={x0:Q.fx0,x1:Q.fx1,z0:Q.z0,z1:Q.fz1,y:0};
  for(let k=1;k<=Q.tn;k++)S.terraces.push({level:k,y:k*Q.th});S.rim=Q.th*Q.tn;
  // Zaun an der Abbruchkante der obersten Terrasse (ELEV-Streifen blockiert oben, die Terrasse darunter bleibt frei; gesetzt erst beim Bau)
  const rim=S.rim;const cells=[];for(let iz=Math.floor(Q.z0);iz<Math.ceil(Q.z1);iz++)for(let ix=Math.floor(Q.x0);ix<Math.ceil(Q.x1);ix++){const x=ix+0.5,z=iz+0.5;
    const hs=[weisQH(x,z),weisQH(x+1,z),weisQH(x-1,z),weisQH(x,z+1),weisQH(x,z-1)];const hi=Math.max(...hs),lo=Math.min(...hs);
    if(hi>=rim-0.01&&lo<=rim-3.5&&lo>=rim-4.5&&idx(x,z)>=0)cells.push(idx(x,z));}
  S.fenceCells=Int32Array.from(cells);S.fence=cells.length;const fx=Q.fx0-Q.td*(Q.tn-1)-0.5,ex=Q.fx1+Q.td*(Q.tn-1)+0.5,sz=Q.fz1+Q.td*(Q.tn-1)+0.5,zs=Math.ceil(Q.z0+rim/Q.slope)+1;
  S.fenceLines=[[[fx,zs],[fx,sz]],[[fx,sz],[ex,sz]],[[ex,sz],[ex,zs]]];
  // Aussichtskanzel hinter dem Zaun auf dem West-Plateau
  S.viewpoint={x:fx-3.25,z:2540,y:rim+0.25,w:4.5,d:8,face:Math.PI/2};
  S.excavators=[{x:2292,z:2526,y:0,rot:0.6,ph:0},{x:2306,z:2545,y:0,rot:-2.2,ph:2},{x:Q.fx0-3.4,z:2522,y:Q.th,rot:Math.PI/2,ph:4}];
  S.truck={x:2300,z:2508,rot:0.25};label('Steinbruch',(Q.fx0+Q.fx1)/2,(Q.z0+Q.fz1)/2);}

function weisSetupZement(){const Z=WEIS.zement;Z.silos=[2408,2421,2434,2447].map(x=>({x,z:2352,r:5.6,h:30}));Z.tower={x:2482,z:2362,w:12,h:50,top:58};
  Z.kiln={a:[2482,9,2370],b:[2482,6.5,2419],r:2.4};Z.cooler={x:2482,z:2424,w:9,d:7,h:9};Z.chimney={x:2516,z:2345,r:2.2,h:72};
  Z.halls=[{x:2425,z:2400,w:44,d:20,h:10,rh:5},{x:2457,z:2416,w:14,d:12,h:18,rh:0}];Z.crusher={x:2318,z:2498,w:7,d:7,h:6};Z.belts=WEIS_BELTS;
  const [x0,z0,x1,z1]=Z.rect;Z.gate={x:2444,z:z0,w:14};
  const B=b=>weisFixed('sued',b);
  for(const s of Z.silos)B({x:s.x,z:s.z,r:s.r,h:s.h});B({x:Z.tower.x,z:Z.tower.z,w:Z.tower.w+6,d:Z.tower.w+6,h:Z.tower.top});
  for(const t of [0.15,0.5,0.85]){const p=weisLerp3(Z.kiln.a,Z.kiln.b,t);B({x:p[0],z:p[2],w:3.4,d:2.2,h:7});}
  B({x:Z.cooler.x,z:Z.cooler.z,w:Z.cooler.w,d:Z.cooler.d,h:Z.cooler.h});B({x:Z.chimney.x,z:Z.chimney.z,r:Z.chimney.r,h:Z.chimney.h});
  for(const h of Z.halls)B({x:h.x,z:h.z,w:h.w,d:h.d,h:Math.ceil(h.h+h.rh)});B({x:Z.crusher.x,z:Z.crusher.z,w:Z.crusher.w,d:Z.crusher.d,h:Z.crusher.h});
  // Zaun mit Tor im Norden
  const g0=Z.gate.x-Z.gate.w/2,g1=Z.gate.x+Z.gate.w/2;
  for(const [a,b] of [[[x0,z0],[g0,z0]],[[g1,z0],[x1,z0]],[[x1,z0],[x1,z1]],[[x1,z1],[x0,z1]],[[x0,z1],[x0,z0]]]){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
    B({x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,w:L,d:1,rot:Math.atan2(-(b[1]-a[1]),b[0]-a[0]),h:2});Z.fence+=L;}
  Z.emit=[...Z.silos.map(s=>[s.x,s.h+2,s.z,0xd8d2c4]),[Z.kiln.b[0],Z.kiln.b[1],Z.kiln.b[2]+2,0xcfc8b8],[Z.crusher.x,Z.crusher.h+0.5,Z.crusher.z,0xd6ccb4],[2404,13,2408,0xd8d2c4],[Z.chimney.x,Z.chimney.h+1,Z.chimney.z,0xf2f2f2]];
  label('Zementwerk',(x0+x1)/2,(z0+z1)/2);}
function weisLerp3(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}

function weisFree(x,z){const i=idx(x,z);return i>=0&&hgG(i)===0&&!(mfG(i)&4)&&stepAt(x,z)===undefined;}
function weisSetupUfer(){const U=WEIS.ufer;const A=[2060,1595],B=[2370,1885];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);const u=[(B[0]-A[0])/L,(B[1]-A[1])/L],n=[u[1],-u[0]];U.n=n;U.u=u;
  const rails=RAILS.flatMap(r=>{const o=[];for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i];if(Math.max(a[0],b[0])<1950||Math.min(a[0],b[0])>2500||Math.max(a[1],b[1])<1450||Math.min(a[1],b[1])>2000)continue;o.push([a[0],0,a[1]],[b[0],0,b[1]]);}return o;});
  const railD=(x,z)=>{let d=1e9;for(let i=0;i<rails.length;i+=2)d=Math.min(d,weisSegDist(x,z,rails[i],rails[i+1]));return d;};U.railD=railD;
  const raw=[];for(let t=0;t<=L;t+=4){const bx=A[0]+u[0]*t,bz=A[1]+u[1]*t;let sw=null;for(let s=-25;s<90;s+=0.5){const i=idx(bx+n[0]*s,bz+n[1]*s);if(i<0)break;if(mfG(i)&4||hgG(i)===255){sw=s;break;}}raw.push({t,bx,bz,sw});}
  for(let k=0;k<raw.length;k++){const q=raw.slice(Math.max(0,k-2),k+3).filter(p=>p.sw!==null);if(!q.length)continue;const sw=q.reduce((a,p)=>a+p.sw,0)/q.length;const p=raw[k];
    const sp=sw-9;const x=p.bx+n[0]*sp,z=p.bz+n[1]*sp;if(!weisFree(x,z)||railD(x,z)<4.5)continue;U.path.push({t:p.t,x,z,sp,sw,bx:p.bx,bz:p.bz});}
  // Strandkiosk: zwischen Promenade und Bahn, möglichst nah an t≈215 (Hüsch-Brücke)
  const fr=Math.atan2(n[0],n[1]);let K=null;
  for(const p of U.path.slice().sort((a,b)=>Math.abs(a.t-215)-Math.abs(b.t-215))){const s=p.sw-16;const x=p.bx+n[0]*s,z=p.bz+n[1]*s;const lf=weisLF(x,0,z,fr);let ok=true;
    for(let lx=-4;lx<=4.5&&ok;lx+=1)for(let lz=-2.6;lz<=2.6&&ok;lz+=1){const q=lf.P(lx,0,lz);if(!weisFree(q[0],q[2])||railD(q[0],q[2])<3.5)ok=false;}
    if(ok){K={x,z,rot:fr,t:p.t,s};break;}}
  if(!K){const p=U.path[Math.floor(U.path.length/2)]||{bx:2215,bz:1745,sw:30,t:215};K={x:p.bx+n[0]*(p.sw-14),z:p.bz+n[1]*(p.sw-14),rot:fr,t:p.t,s:p.sw-14};}
  WEIS.kiosk.pos=K;const lf=weisLF(K.x,0,K.z,K.rot);const dp=lf.P(3.6,0,-0.4);const v=WEIS.kiosk.venue;v.door=[dp[0],dp[2],Math.atan2(Math.cos(K.rot),-Math.sin(K.rot))];
  if(!v.labeled){v.labeled=true;label(v.name+' (begehbar)',v.door[0],v.door[1],'small');}
  weisFixed('ufer',{x:K.x,z:K.z,w:6.2,d:4.2,rot:K.rot,h:3});
  // Bänke (zum Wasser), Laternen, Liegestühle am Kiosk
  let lastB=-1e9,lastL=-1e9;for(const p of U.path){const nearK=Math.abs(p.t-K.t)<12;
    if(!nearK&&p.t-lastB>=28){const x=p.x+n[0]*2.6,z=p.z+n[1]*2.6;if(weisFree(x,z)){U.benches.push(weisProp({x,z,face:fr},{x,z,w:1.9,d:0.6,rot:fr,h:1}));lastB=p.t;}}
    if(p.t-lastL>=24){const x=p.x-n[0]*2.6,z=p.z-n[1]*2.6;if(weisFree(x,z)){U.lamps.push(weisProp({x,z,face:fr},{x,z,r:0.2,h:6}));lastL=p.t;}}}
  for(const [lx,lz] of [[-6,6.5],[-3.6,6.8],[4,6.6],[6.4,6.3]]){const q=lf.P(lx,0,lz);if(weisFree(q[0],q[2]))U.chairs.push({x:q[0],z:q[2],face:K.rot});}
  label('Weisenauer Rheinufer',K.x,K.z,'small');}

function weisSetupGrossberg(){const GB_=WEIS.grossberg,[rx0,rz0,rx1,rz1]=GB_.rect;const R=mulberry32(4040);const inR=(x,z)=>x>rx0&&x<rx1&&z>rz0&&z<rz1;
  const cells=(x,z,w,d,rot,step=1)=>{const lf=weisLF(x,0,z,rot);for(let lx=-w/2;lx<=w/2+0.01;lx+=step)for(let lz=-d/2;lz<=d/2+0.01;lz+=step){const q=lf.P(lx,0,lz);const i=idx(q[0],q[2]);if(i<0||hgG(i)||(mfG(i)&6)||stepAt(q[0],q[2])!==undefined)return false;}return true;};
  const segs=[];for(const r of ROADS){if(r.cls<3||r.cls>5||r.bridge)continue;for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<6)continue;
    if(!inR(a[0],a[1])&&!inR(b[0],b[1]))continue;segs.push({a,b,L,r});}}
  // Garagenhöfe: 4 Garagen nebeneinander, Tore zur Straße
  const order=segs.slice();for(let i=order.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  for(const s of order){if(GB_.garages.length>=4)break;const {a,b,L,r}=s;const d=[(b[0]-a[0])/L,(b[1]-a[1])/L];
    for(const side of [1,-1]){const nn=[-d[1]*side,d[0]*side];const o=r.w/2+(r.sw||0)+4.2;const cx=(a[0]+b[0])/2+nn[0]*o,cz=(a[1]+b[1])/2+nn[1]*o;if(!inR(cx,cz))continue;
      const face=Math.atan2(-nn[0],-nn[1]);if(GB_.garages.some(g=>Math.hypot(g.x-cx,g.z-cz)<50))continue;if(!cells(cx,cz,12.8,6.4,face))continue;
      const lf=weisLF(cx,0,cz,face);const units=[];for(let k=0;k<4;k++){const p=lf.P(-4.65+k*3.1,0,0);units.push({x:p[0],z:p[2],face});}
      GB_.garages.push({x:cx,z:cz,face,units});weisFixed('sued',{x:cx,z:cz,w:12.6,d:6.2,rot:face,h:3});break;}}
  // Hecken an den Vorgärten (Lücken = Einfahrten)
  const hash=new Set();for(const s of segs){const {a,b,L,r}=s;const d=[(b[0]-a[0])/L,(b[1]-a[1])/L];const face=Math.atan2(-d[1],d[0]);
    for(let t=3;t<L-3&&GB_.hedges.length<260;t+=4.2){for(const side of [1,-1]){if(R()<0.35)continue;const nn=[-d[1]*side,d[0]*side];const o=r.w/2+(r.sw||0)+1.0;
      const x=a[0]+d[0]*t+nn[0]*o,z=a[1]+d[1]*t+nn[1]*o;if(!inR(x,z))continue;const key=Math.floor(x/3)+','+Math.floor(z/3);if(hash.has(key))continue;
      if(!cells(x,z,3.4,0.8,face,0.85))continue;const bx=x+nn[0]*1.6,bz=z+nn[1]*1.6;const bi=idx(bx,bz);if(bi>=0&&hgG(bi)>0)continue;
      hash.add(key);GB_.hedges.push(weisProp({x,z,face,s:0.9+R()*0.2},{x,z,w:3.4,d:0.8,rot:face,h:2}));}}}
  label('Großberg-Siedlung',(rx0+rx1)/2,(rz0+rz1)/2-40,'small');}

// ---------- Mundart-Szenen (Figuren erscheinen erst in der Nähe) ----------
const WEIS_CONV={
  bank:{o:'Ei Gude! Hockste disch e bissje zu uns uff die Bank?',m:'smile',c:[['Gern. Was gibt’s Neues in Weisenau?','Nix. Un des is aach gut so. Mir gucke Schiffe.','laugh'],['Keine Zeit, ich muss weiter.','Immer des Gehetze! De Rhoi laaft aach net fort.','neutral'],['Habt ihr was zu essen dabei?','Nur e Fleischworscht vun gestern. Die is awwer noch gut … glaab isch.','smug']]},
  angler:{o:'Pssst! Net so laut, sonst sin die Fisch fort!',m:'neutral',c:[['Beißt was?','Heit beißt nix. Nur die Schnooke.','sad'],['Was fängt man hier so?','Mal en Barsch, mal en Schuh. Gestern e Fahrrad – ohne Führerschein, logisch.','laugh'],['Viel Glück noch!','Glück hot mit Angle nix zu due. Des is Geduld!','smug']]},
  wirt:{o:'Ei Gude! Komm ruff uff de Sand – drin im Kiosk gibt’s Schoppe un Worscht!',m:'smile',c:[['Was empfiehlst du?','De Spundekäs. Un en Schoppe. Un dann noch en Schoppe.','laugh'],['Wie läuft’s Geschäft?','Bei Sunneschein brummt’s, bei Rejje zähl isch die Ente.','neutral'],['Später vielleicht.','Mir sin do! De Rhoi un isch, mir laafe net fort.','smile']]},
  geo:{o:'Guck emol die Schichte do unne – Kalkstoi, Millione Johr alt!',m:'smile',c:[['Woher kommt der Kalkstein?','Des Mainzer Becke war mol e warmes Meer. Do drin finnste heit noch Schneckehäusjer.','smile'],['Was passiert mit dem Stein?','Der werd gebroche, gemahle, gebrannt – un dribbe im Werk werd Zement draus.','neutral'],['Darf man da runter?','Uffbasse! Hinter de Zaun bleibe, do geht’s steil nunner.','surprised']]},
  arbeiter:{o:'Moin. Paus. Die erste seit sechs Uhr.',m:'neutral',c:[['Was macht ihr hier?','Mir brenne Kalkstoi zu Klinker un mahle den zu Zement. Ohne uns kää Haus in Meenz.','smug'],['Ganz schön staubig hier.','Mei Auto is jeden Daach grau. Isch hab’s uffgegewwe.','sad'],['Schönen Feierabend!','Feierabend? Isch hab Spätschicht, Kumbel.','laugh']]},
  nachbar:{o:'Halt! Net uff mei Rase trete!',m:'angry',c:[['Schöne Hecke!','Genau ään Meter achtzig. Net ään Zentimeter mehr. Des is Großberg-Standard.','smug'],['Wohnen Sie schon lange hier?','Seit vierzig Johr. Die Garaach is älter wie mei Ehe.','laugh'],['Entschuldigung!','Is schon gut. Die Junge wisse halt net, was e Rase is.','neutral']]},
  fuehrung:{o:'Willkommen an der Synagoge Weisenau. Bitte e bissje leiser hier.',m:'neutral',c:[['Was ist das für ein Gebäude?','Die Synagog vun Weisenau, erbaut im 18. Jahrhundert. Sie erinnert an die jüdisch Gemeinde vun Weisenau.','neutral'],['Kann man da rein?','Heut net. Vorne an de Tafel steht e bissje was zur Geschicht.','neutral'],['Danke für die Info.','Gern. Schee, dass Sie sich Zeit nemme.','smile']]}};
const WEIS_LINES={
  bank:['Frieher hammer do unne gebadt. Heit dät isch do net emol mei Fieß neihalte.','Mei Fraa secht, isch soll mehr laafe. Isch sitz uff de Bank, des is aach Sport.','Guck, en Kahn! … Fort is er.','Weisenau is des schennste Eck vun Meenz – sach’s awwer net de Neustädter!'],
  angler:['Heit beißt nix. Nur die Schnooke.','Den Hecht do hab isch schon dreimal gefange. Mir kenne uns.','Wenn de Kahn vorbeifährt, wackelt mei Schwimmer wie verrückt.'],
  wirt:['Spundekäs, frisch gemacht!','En Schoppe uff de Sand, des is Urlaub uff Meenzerisch.','Liegestühl gibt’s gratis – Sunnebrand aach.'],
  geo:['Do drin finnste Schneckehäusjer vum Urmeer!','Uffbasse am Zaun, do geht’s steil nunner.','Des is de Geopfad. Laaf ruhig mol rum!'],
  arbeiter:['Ohne Zement kää Haus, ohne Haus kää Fassenachtssitzung.','De Ofe laaft Daach un Nacht. Isch net.','Frühschicht, Spätschicht – un dezwische e Weck mit Worscht.'],
  nachbar:['Samstags werd die Garaach gekehrt. Des is Gesetz hier owwe.','Vum Großberg sieht mer bis nach Wissbade. Leider.','Die Heck schneid isch mit de Nagelschere. Präzision!'],
  fuehrung:['Bitte e bissje leiser – des is en Ort der Erinnerung.','Die Tafel do vorne erklärt die Geschicht vum Haus.','Die Synagog erinnert an die jüdisch Gemeinde vun Weisenau.']};
function weisSetupScenes(){const S=[],U=WEIS.ufer,K=WEIS.kiosk.pos,Q=WEIS.steinbruch,Z=WEIS.zement,Y=WEIS.synagoge,GBx=WEIS.grossberg;
  const ZONE={bank:'ufer',angler:'ufer',wirt:'ufer',geo:'sued',arbeiter:'sued',nachbar:'sued',fuehrung:'syn'};
  const add=(id,name,x,z,npcs,o={})=>S.push(Object.assign({id,name,x,z,npcs,zone:ZONE[id],people:[],lineT:4,lines:WEIS_LINES[id]||[]},o));
  const bench=U.benches.slice().sort((a,b)=>Math.hypot(a.x-K.x,a.z-K.z)-Math.hypot(b.x-K.x,b.z-K.z))[0];
  if(bench){const lf=weisLF(bench.x,0,bench.z,bench.face);const p0=lf.P(-0.45,0,-0.05),p1=lf.P(0.45,0,-0.05);
    add('bank','Rentner uff de Bank',bench.x,bench.z,[{x:p0[0],z:p0[2],y:0,face:bench.face,pose:'sit',name:'Hildegard vum Rheinufer',conv:'bank'},{x:p1[0],z:p1[2],y:0,face:bench.face,pose:'sit',name:'Erwin vum Rheinufer',conv:'bank'}]);}
  const ap=U.path.slice().sort((a,b)=>Math.abs(a.t-K.t-55)-Math.abs(b.t-K.t-55))[0];
  if(ap){const s=ap.sw-1.4;const x=ap.bx+U.n[0]*s,z=ap.bz+U.n[1]*s;add('angler','Angler am Rhoi',x,z,[{x,z,y:0,face:Math.atan2(U.n[0],U.n[1]),pose:'rod',name:'Angler-Karl',conv:'angler'}],{extra:true});}
  {const lf=weisLF(K.x,0,K.z,K.rot);const p=lf.P(1.6,0,3.0),g=lf.P(-0.8,0,3.4);add('wirt','Strandkiosk',p[0],p[2],[{x:p[0],z:p[2],y:0,face:K.rot+Math.PI,pose:'stand',name:'Kiosk-Rosi',conv:'wirt'},{x:g[0],z:g[2],y:0,face:K.rot+Math.PI,pose:'stand',name:'Stammgast Helmut',conv:'bank'}]);}
  {const v=Q.viewpoint;add('geo','Aussichtspunkt Steinbruch',v.x,v.z,[{x:v.x+0.6,z:v.z-2.4,y:v.y,face:Math.PI/2,pose:'stand',name:'Hobby-Geologin Gisela',conv:'geo'}]);}
  {const x=Z.gate.x,z=Z.gate.z-5;add('arbeiter','Werkstor Zementwerk',x,z,[{x:x-0.8,z,y:0,face:Math.PI/2,pose:'helmet',name:'Schichtarbeiter Dieter',conv:'arbeiter'},{x:x+0.8,z,y:0,face:-Math.PI/2,pose:'helmet',name:'Schichtarbeiterin Elke',conv:'arbeiter'}],{extra:true});}
  {const c=[(GBx.rect[0]+GBx.rect[2])/2,(GBx.rect[1]+GBx.rect[3])/2];const h=GBx.hedges.slice().sort((a,b)=>Math.hypot(a.x-c[0],a.z-c[1])-Math.hypot(b.x-c[0],b.z-c[1]))[0];
    if(h){const lf=weisLF(h.x,0,h.z,h.face);const p=lf.P(0,0,1.1),q=lf.P(0,0,-1.1);const pp=weisFree(p[0],p[2])?p:q;
      add('nachbar','Großberg-Siedlung',pp[0],pp[2],[{x:pp[0],z:pp[2],y:0,face:Math.atan2(h.x-pp[0],h.z-pp[2]),pose:'stand',name:'Nachbar Heinz vum Großberg',conv:'nachbar'}]);}}
  {const P=Y.plaque,ds=Y.doorSide;const x=P.x+ds.nx*1.2-ds.nz*1.4,z=P.z+ds.nz*1.2+ds.nx*1.4;add('fuehrung','Synagoge Weisenau',x,z,[{x,z,y:0,face:Math.atan2(-ds.nx,-ds.nz),pose:'stand',name:'Stadtführerin Ruth',conv:'fuehrung'}],{calm:true});}
  WEIS.scenes=S;}
function weisSetupFt(){const Y=WEIS.synagoge,K=WEIS.kiosk.venue.door,v=WEIS.steinbruch.viewpoint,Z=WEIS.zement.gate,GBx=WEIS.grossberg;const L=WEIS.ft;
  L.push({n:'Synagoge Weisenau',g:'Weisenau',x:Y.door.x+Y.doorSide.nx*6,z:Y.door.z+Y.doorSide.nz*6,face:Y.door.face+Math.PI});
  L.push({n:'Weisenauer Rheinufer (Strandkiosk)',g:'Weisenau',x:K[0]+Math.sin(K[2])*2.5,z:K[1]+Math.cos(K[2])*2.5});
  L.push({n:'Steinbruch-Aussichtspunkt',g:'Weisenau',x:v.x-0.5,z:v.z+1.5,y:v.y+0.05,face:v.face});
  L.push({n:'Zementwerk Weisenau',g:'Weisenau',x:Z.x,z:Z.z-8});
  const s=WEIS.scenes.find(s=>s.id==='nachbar');L.push({n:'Großberg-Siedlung',g:'Weisenau',x:s?s.x:(GBx.rect[0]+GBx.rect[2])/2,z:s?s.z:(GBx.rect[1]+GBx.rect[3])/2});}
const _weisFtDest=ftDestinations;
ftDestinations=function(){const fresh=!FT.list;const L=_weisFtDest();if(fresh)for(const d of WEIS.ft)if(!L.some(o=>o.n===d.n))L.push(d);return L;};
const _weisStartTalk=startTalk;
startTalk=function(P,npc){if(npc&&npc.weisConv)npc.forceConv=npc.weisConv;return _weisStartTalk(P,npc);};

// Zonenzentren: Synagoge, Mitte der Promenade, Mitte zwischen Großberg, Zementwerk und Steinbruch (alles < 350 m vom Zentrum)
function setupWeis(){WEIS.J0=weisJ();
  weisSetupSynagoge();weisSetupQuarry();weisSetupZement();weisSetupUfer();weisSetupGrossberg();weisSetupScenes();weisSetupFt();
  weisUndo(WEIS.J0);WEIS.J0=null;
  const Y=WEIS.synagoge,mk=(key,x,z)=>WEIS.zones[key]=lazyZone({name:'weis_'+key,key,x,z,build:weisZoneBuild,dispose:weisZoneDispose});
  mk('syn',Y.x,Y.z);mk('ufer',2215,1740);mk('sued',2300,2390);}

// ---------- Modelle (lazy) ----------
// Materialien je Zone (lazyOwn): beim Entsorgen der Zone werden sie freigegeben, beim nächsten Bau neu erzeugt
const WEIS_MSPEC={conc:{vertexColors:true,roughness:0.9},metal:{vertexColors:true,roughness:0.5,metalness:0.45},
  rock:{vertexColors:true,roughness:0.95,flatShading:true},hedge:{color:0x3d6b2a,roughness:0.95},bush:{color:0x4f6f2c,roughness:0.95,flatShading:true},
  bench:{vertexColors:true,color:0x8a5a36,roughness:0.7},pole:{color:0x2f3438,metalness:0.6,roughness:0.45},garage:{vertexColors:true,roughness:0.75}};
function weisMat(Z,k){const C=Z.mats;if(C[k])return C[k];
  return C[k]=lazyOwn(Z,stdMat(k==='atlas'?{map:lazyOwn(Z,weisAtlas()),roughness:0.75}:WEIS_MSPEC[k]));}
function weisAtlas(){const c=document.createElement('canvas');c.width=WEIS_ATL.W;c.height=WEIS_ATL.H;const g=c.getContext('2d');const R=mulberry32(4042);
  const font=(w,s)=>`${w} ${s}px "Barlow Condensed", Arial Narrow, sans-serif`;
  // Fensterachse / Türachse der Synagoge: Putz, Sockel, Gesims, Rundbogen mit Sandsteingewände
  for(const [x0,door] of [[0,false],[128,true]]){g.fillStyle='#e8dcc2';g.fillRect(x0,0,128,320);for(let i=0;i<500;i++){g.fillStyle=R()<0.5?'rgba(0,0,0,0.05)':'rgba(255,255,255,0.08)';g.fillRect(x0+R()*128,R()*320,2,2);}
    g.fillStyle='#a8735a';g.fillRect(x0,296,128,24);g.fillStyle='#d9ccb0';g.fillRect(x0,0,128,10);
    const arch=(cx,y0,y1,w,frame,fill)=>{g.fillStyle=frame;g.beginPath();g.moveTo(cx-w/2-6,y1);g.lineTo(cx-w/2-6,y0+w/2);g.arc(cx,y0+w/2,w/2+6,Math.PI,0);g.lineTo(cx+w/2+6,y1);g.closePath();g.fill();
      g.fillStyle=fill;g.beginPath();g.moveTo(cx-w/2,y1);g.lineTo(cx-w/2,y0+w/2);g.arc(cx,y0+w/2,w/2,Math.PI,0);g.lineTo(cx+w/2,y1);g.closePath();g.fill();};
    if(!door){const gr=g.createLinearGradient(0,60,0,250);gr.addColorStop(0,'#4d5f6e');gr.addColorStop(1,'#2a3540');arch(x0+64,60,250,50,'#b07a5e',gr);
      g.strokeStyle='rgba(220,230,235,0.35)';g.lineWidth=1.5;for(let y=100;y<250;y+=22){g.beginPath();g.moveTo(x0+39,y);g.lineTo(x0+89,y);g.stroke();}g.beginPath();g.moveTo(x0+64,70);g.lineTo(x0+64,250);g.stroke();
      g.fillStyle='#b07a5e';g.fillRect(x0+34,250,60,8);}
    else{arch(x0+64,150,296,58,'#b07a5e','#5a3a22');g.fillStyle='#4a2f1a';g.fillRect(x0+62,180,4,116);g.strokeStyle='#3a2414';g.lineWidth=3;g.strokeRect(x0+42,200,18,40);g.strokeRect(x0+68,200,18,40);g.strokeRect(x0+42,248,18,40);g.strokeRect(x0+68,248,18,40);
      g.fillStyle='#b07a5e';g.beginPath();g.arc(x0+64,96,24,0,TAU);g.fill();g.fillStyle='#3d4d5a';g.beginPath();g.arc(x0+64,96,18,0,TAU);g.fill();}}
  // Gedenktafel
  {const [x0,y0,x1,y1]=WEIS_ATL.plaque,w=x1-x0,h=y1-y0;g.fillStyle='#3a3226';g.fillRect(x0,y0,w,h);g.strokeStyle='#c9a96e';g.lineWidth=8;g.strokeRect(x0+6,y0+6,w-12,h-12);
    g.fillStyle='#f0e2c0';g.textAlign='center';g.textBaseline='middle';g.font=font(700,52);g.fillText(WEIS_PLAQUE[0],x0+w/2,y0+62);g.fillStyle='#c9a96e';g.fillRect(x0+90,y0+100,w-180,3);
    g.fillStyle='#efe6d2';g.font=font(500,34);WEIS_PLAQUE.slice(1).forEach((t,i)=>g.fillText(t,x0+w/2,y0+150+i*48));}
  // Kioskschild
  {const [x0,y0,x1,y1]=WEIS_ATL.kiosk,w=x1-x0,h=y1-y0;g.fillStyle='#1d6fa5';g.fillRect(x0,y0,w,h);g.strokeStyle='#ffffff';g.lineWidth=6;g.strokeRect(x0+4,y0+4,w-8,h-8);
    g.fillStyle='#ffd23f';g.font=font(700,56);g.textAlign='center';g.textBaseline='middle';g.fillText(WEIS_KIOSK_SIGN,x0+w/2,y0+h/2+2);}
  // Infotafel Aussichtspunkt
  {const [x0,y0,x1,y1]=WEIS_ATL.view,w=x1-x0,h=y1-y0;g.fillStyle='#2f4a2f';g.fillRect(x0,y0,w,h);g.strokeStyle='#e8e0c8';g.lineWidth=6;g.strokeRect(x0+5,y0+5,w-10,h-10);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ffffff';g.font=font(700,50);g.fillText(WEIS_VIEW_SIGN[0],x0+w/2,y0+48);
    g.font=font(500,34);g.fillStyle='#e8e0c8';g.fillText(WEIS_VIEW_SIGN[1],x0+w/2,y0+108);g.fillStyle='#ffd23f';g.fillText(WEIS_VIEW_SIGN[2],x0+w/2,y0+152);}
  return freeAfterUpload(texFromCanvas(c,false));}
function weisMesh(Z,G,mat,cast=true){if(G.empty)return null;const st=WEIS.stats[Z.o.key];st.verts+=G.p.length/3;st.tris+=G.i.length/3;
  const m=new THREE.Mesh(lazyOwn(Z,G.geo()),mat);m.castShadow=cast&&!QS.noShadow;m.receiveShadow=true;Z.group.add(m);st.meshes++;if(m.castShadow)st.cast++;return m;}
function weisInst(Z,geo,mat,list,cast=true){lazyOwn(Z,geo);const im=instGeo(geo,mat,list,cast&&!QS.noShadow);if(!im)return null;scene.remove(im);Z.group.add(im);const st=WEIS.stats[Z.o.key];st.inst++;st.props+=list.length;if(im.castShadow)st.cast++;return im;}

function weisBuildSynagoge(Gs,Gt){const Y=WEIS.synagoge,{x,z,L,W,rot,H}=Y;const lf=weisLF(x,0,z,rot);const c=Math.cos(rot),s=Math.sin(rot);const ux=c,uz=-s,vx=s,vz=c;
  const SAND={r:0.66,g:0.43,b:0.34},LIGHT={r:0.86,g:0.81,b:0.71},TILE={r:0.5,g:0.25,b:0.19},DARK={r:0.25,g:0.22,b:0.2};
  for(const sd of [[0,1,L],[0,-1,L],[1,0,W],[-1,0,W]]){const [lx,lz,len]=sd;const nx=lx*ux+lz*vx,nz=lx*uz+lz*vz;const off=lx?L/2:W/2;const rx=nz,rz=-nx;
    const nb=len>=L-0.01?5:3;const isDoor=Math.abs(nx-Y.doorSide.nx)<1e-6&&Math.abs(nz-Y.doorSide.nz)<1e-6;const bw=len/nb;
    for(let b=0;b<nb;b++){const sx=x+nx*off-rx*len/2+rx*b*bw,sz=z+nz*off-rz*len/2+rz*b*bw;weisTexQuad(Gt,sx,sz,rx,rz,bw,0,H,weisUV(isDoor&&b===(nb-1)/2?WEIS_ATL.door:WEIS_ATL.win));}}
  lf.box(Gs,0,0,0,L+0.18,0.55,W+0.18,SAND);lf.box(Gs,0,H-0.4,0,L+0.4,0.45,W+0.4,LIGHT);lf.box(Gs,0,H+0.05,0,L+0.8,0.12,W+0.8,DARK);
  for(const sx of [-1,1])for(const sz of [-1,1])lf.box(Gs,sx*L/2,0.55,sz*W/2,0.5,H-0.95,0.5,SAND);
  weisHip(Gs,x,z,L+0.8,W+0.8,rot,H+0.17,4,TILE);
  // Eingang: Stufe, kleiner Vorplatz, Gedenktafel auf Pfosten
  const D=Y.door,ds=Y.doorSide;const st=[D.x+ds.nx*0.5,D.z+ds.nz*0.5];Gs.box(st[0],0,st[1],2.4,0.22,1.0,D.face,SAND);
  {const cx=D.x+ds.nx*2.5,cz=D.z+ds.nz*2.5;const lf2=weisLF(cx,0,cz,D.face);const a=lf2.P(-3,0.07,-1.5),b=lf2.P(-3,0.07,1.5),cc=lf2.P(3,0.07,1.5),d=lf2.P(3,0.07,-1.5);
    Gs.quad(a,b,cc,d,[0,0],[0,1],[1,1],[1,0],{r:0.72,g:0.68,b:0.62});}
  const P=Y.plaque;const rx=ds.nz,rz=-ds.nx;Gs.box(P.x-ds.nx*0.06,0,P.z-ds.nz*0.06,0.12,1.3,0.12,P.face,DARK);Gs.box(P.x-ds.nx*0.04,1.25,P.z-ds.nz*0.04,1.02,0.66,0.06,P.face,DARK);
  weisTexQuad(Gt,P.x-rx*0.48,P.z-rz*0.48,rx,rz,0.96,1.28,0.6,weisUV(WEIS_ATL.plaque));}

function weisBuildZement(Gc,Gm){const Z=WEIS.zement,[x0,z0,x1,z1]=Z.rect;const CON={r:0.74,g:0.73,b:0.7},CON2={r:0.62,g:0.61,b:0.58},DARK={r:0.33,g:0.33,b:0.34},STEEL={r:0.6,g:0.62,b:0.64},
    RUST={r:0.5,g:0.38,b:0.31},CLAD={r:0.62,g:0.66,b:0.7},ROOF={r:0.4,g:0.42,b:0.45},RED={r:0.8,g:0.12,b:0.1},WH={r:0.95,g:0.95,b:0.95};
  Gc.quad([x0,0.08,z0],[x0,0.08,z1],[x1,0.08,z1],[x1,0.08,z0],[0,0],[0,1],[1,1],[1,0],{r:0.6,g:0.59,b:0.55});
  for(const s of Z.silos){weisCyl(Gc,s.x,0,s.z,s.r,s.h,CON,20,false);weisCyl(Gc,s.x,s.h,s.z,s.r,1.6,CON2,20,true,s.r*0.35);for(let k=1;k<=3;k++)weisCyl(Gm,s.x,k*8,s.z,s.r+0.08,0.3,STEEL,20,false);}
  {const a=Z.silos[0],b=Z.silos[Z.silos.length-1];Gm.box((a.x+b.x)/2,a.h+1.2,a.z,b.x-a.x+6,2.6,3.2,0,CLAD);}
  const T=Z.tower;Gc.box(T.x,0,T.z,T.w,T.h,T.w,0,CON);Gm.box(T.x,T.h,T.z,T.w-3,T.top-T.h,T.w-3,0,CLAD);Gm.box(T.x,T.top,T.z,T.w-2,0.4,T.w-2,0,DARK);
  for(const y of [12,22,32,42])for(const sx of [-1,1]){const cx=T.x+sx*7.6;weisCyl(Gm,cx,y,T.z,2.6,5,STEEL,14,true);weisCyl(Gm,cx,y-3,T.z,0.7,3,STEEL,14,false,2.6);
    Gm.beam([cx,y+5,T.z],[T.x+sx*T.w/2,y+7,T.z],1.3,1.3,RUST);Gm.box(cx,y-3.6,T.z,6,0.3,7,0,DARK);}
  for(const sx of [-1,1])for(const sz of [-1,1])Gm.beam([T.x+sx*(T.w/2+4.5),0,T.z+sz*3.2],[T.x+sx*(T.w/2+4.5),46,T.z+sz*3.2],0.5,0.5,STEEL);
  const K=Z.kiln;weisTube(Gm,K.a,K.b,K.r,RUST,16);for(const t of [0.15,0.5,0.85]){const p=weisLerp3(K.a,K.b,t);weisTube(Gm,p,weisLerp3(K.a,K.b,t+0.025),K.r+0.35,DARK,16);Gc.box(p[0],0,p[2],3.4,p[1]-K.r+0.2,2.2,0,CON2);}
  const C=Z.cooler;Gc.box(C.x,0,C.z,C.w,C.h,C.d,0,CLAD);Gm.box(C.x,C.h,C.z,C.w+0.4,0.3,C.d+0.4,0,ROOF);
  const Ch=Z.chimney;weisCyl(Gc,Ch.x,0,Ch.z,Ch.r,Ch.h-3,CON,16,false,Ch.r*0.78);weisCyl(Gc,Ch.x,Ch.h-3,Ch.z,Ch.r*0.78,3,DARK,16,true,Ch.r*0.75);
  for(const h of Z.halls){Gc.box(h.x,0,h.z,h.w,h.h,h.d,0,CLAD);if(h.rh)weisGable(Gm,h.x,h.z,h.w+0.6,h.d+0.6,0,h.h,h.rh,ROOF,CLAD);else{Gm.box(h.x,h.h,h.z,h.w+0.3,0.3,h.d+0.3,0,ROOF);Gc.box(h.x+2,h.h+0.3,h.z,6,4,6,0,CLAD);}
    for(let k=-h.w/2+3;k<h.w/2-2;k+=6)Gc.box(h.x+k,0,h.z-h.d/2-0.05,0.4,h.h,0.15,0,CON2);}
  for(const b of Z.belts){Gm.beam(b.a,b.b,2.2,1.8,CLAD);const L=Math.hypot(b.b[0]-b.a[0],b.b[2]-b.a[2]);const n=Math.max(1,Math.floor(L/12));
    for(let k=1;k<n;k++){const p=weisLerp3(b.a,b.b,k/n);if(p[1]<2.5)continue;const gy=weisQH(p[0],p[2]);Gm.box(p[0],gy,p[2],0.5,p[1]-0.9-gy,0.5,0,STEEL);Gm.box(p[0],p[1]-1.3,p[2],2.6,0.3,0.4,Math.atan2(-(b.b[2]-b.a[2]),b.b[0]-b.a[0])+Math.PI/2,STEEL);}}
  const Cr=Z.crusher;Gc.box(Cr.x,0,Cr.z,Cr.w,Cr.h-2,Cr.d,0,CON2);weisCyl(Gm,Cr.x,Cr.h-2,Cr.z,2.2,2.4,STEEL,4,false,3.8);
  // Zaun + Tor mit Schranke (rot-weiß)
  const g0=Z.gate.x-Z.gate.w/2,g1=Z.gate.x+Z.gate.w/2;
  for(const [a,b] of [[[x0,z0],[g0,z0]],[[g1,z0],[x1,z0]],[[x1,z0],[x1,z1]],[[x1,z1],[x0,z1]],[[x0,z1],[x0,z0]]]){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const dx=(b[0]-a[0])/L,dz=(b[1]-a[1])/L;const rot=Math.atan2(-dz,dx);
    for(let t=0;t<=L;t+=3)Gm.box(a[0]+dx*t,0,a[1]+dz*t,0.1,2.2,0.1,rot,DARK);for(const y of [1.0,2.05])Gm.box((a[0]+b[0])/2,y,(a[1]+b[1])/2,L,0.05,0.05,rot,STEEL);}
  for(const gx of [g0,g1])Gm.box(gx,0,z0,0.5,2.6,0.5,0,DARK);for(let k=0;k<6;k++)Gm.box(g0+0.5+k*2.1+1.05,1.1,z0,2.1,0.14,0.14,0,k%2?WH:RED);}

function weisBuildQuarry(Z,Gc,Gm,Gt){const Q=WEIS_Q,S=WEIS.steinbruch;const R=mulberry32(4041);
  // Höhenfeld (1 m), Felswände geschichtet, Terrassen geschottert, Hang/Plateau grün
  const x0=Math.floor(Q.x0),x1=Math.ceil(Q.x1),z0=Math.floor(Q.z0),z1=Math.floor(Q.z1);const nx=x1-x0+1,nz=z1-z0+1;
  const pos=new Float32Array(nx*nz*3),col=new Float32Array(nx*nz*3);
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=x0+i,z=z0+j;let h=weisQH(x,z);const k=(j*nx+i)*3;
    const nb=[weisQH(x+1,z),weisQH(x-1,z),weisQH(x,z+1),weisQH(x,z-1)];const steep=Math.max(h,...nb)-Math.min(h,...nb)>2;
    const dIn=Math.max(Q.fx0-x,x-Q.fx1,z-Q.fz1);const hIn=dIn>0?Q.th*Math.min(Q.tn,Math.ceil(dIn/Q.td)):0;const green=dIn>0&&(dIn>Q.td*Q.tn+1||Math.min(x-Q.x0,Q.x1-x,z-Q.z0)*Q.slope<hIn-0.01);
    if(steep)h+=(R()-0.5)*0.6;h=Math.max(h,0.06);pos[k]=x;pos[k+1]=h;pos[k+2]=z;let c;
    if(steep&&!green){const band=Math.floor(h/1.2)%3,v=0.9+R()*0.12;c=band===0?[0.8*v,0.73*v,0.6*v]:band===1?[0.7*v,0.66*v,0.58*v]:[0.86*v,0.8*v,0.68*v];}
    else if(green){const v=0.8+R()*0.3;c=[0.33*v,0.46*v,0.22*v];}else{const v=0.88+R()*0.12;c=[0.75*v,0.72*v,0.65*v];}
    col[k]=c[0];col[k+1]=c[1];col[k+2]=c[2];}
  const ind=new (nx*nz>65535?Uint32Array:Uint16Array)((nx-1)*(nz-1)*6);let q=0;
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;ind[q++]=a;ind[q++]=c;ind[q++]=b;ind[q++]=b;ind[q++]=c;ind[q++]=d;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setIndex(new THREE.BufferAttribute(ind,1));geo.computeVertexNormals();geo.computeBoundingSphere();
  const st=WEIS.stats.sued;const tm=new THREE.Mesh(lazyOwn(Z,geo),weisMat(Z,'rock'));tm.castShadow=!QS.noShadow;tm.receiveShadow=true;Z.group.add(tm);st.meshes++;if(tm.castShadow)st.cast++;st.verts+=nx*nz;st.tris+=ind.length/3;S.mesh={nx,nz};
  // Zaun an der Kante, Aussichtskanzel mit Bank, Fernrohr, Infotafel
  const DARKG={r:0.2,g:0.3,b:0.22},WOOD={r:0.55,g:0.38,b:0.22},STEEL={r:0.55,g:0.57,b:0.6},Y={r:0.93,g:0.66,b:0.1},D={r:0.18,g:0.18,b:0.19};const rim=S.rim;
  for(const [a,b] of S.fenceLines){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const dx=(b[0]-a[0])/L,dz=(b[1]-a[1])/L,rot=Math.atan2(-dz,dx);
    for(let t=0;t<=L;t+=2.5)Gm.box(a[0]+dx*t,rim,a[1]+dz*t,0.09,1.15,0.09,rot,DARKG);for(const y of [0.55,1.1])Gm.box((a[0]+b[0])/2,rim+y,(a[1]+b[1])/2,L,0.06,0.06,rot,DARKG);}
  const v=S.viewpoint;Gc.box(v.x,rim-0.4,v.z,v.w,v.y-rim+0.4,v.d,0,WOOD);Gc.box(v.x-0.9,v.y,v.z+1.2,0.5,0.45,1.8,0,WOOD);Gc.box(v.x-1.15,v.y+0.45,v.z+1.2,0.08,0.45,1.8,0,WOOD);
  Gm.box(v.x+1.6,v.y,v.z-1.5,0.12,1.1,0.12,0,STEEL);weisTube(Gm,[v.x+1.45,v.y+1.25,v.z-1.5],[v.x+1.95,v.y+1.3,v.z-1.5],0.12,STEEL,8);
  Gc.box(v.x,v.y,v.z-v.d/2+0.3,0.12,1.5,0.12,0,WOOD);Gc.box(v.x,v.y+1.4,v.z-v.d/2+0.25,2.2,1.0,0.06,0,WOOD);weisTexQuad(Gt,v.x-1.05,v.z-v.d/2+0.29,1,0,2.1,v.y+1.45,0.9,weisUV(WEIS_ATL.view));
  // Kipper und Brecher-Zulauf: statisch; Bagger-Unterwagen statisch, Oberwagen drehbar (eigene Meshes)
  {const t=S.truck,lf=weisLF(t.x,0,t.z,t.rot);lf.box(Gc,0,0.85,0,2.4,0.5,7.2,D);lf.box(Gc,0,1.35,2.6,2.4,1.9,1.5,Y);lf.box(Gc,0,1.9,2.6,2.3,0.7,1.52,{r:0.25,g:0.32,b:0.38});lf.box(Gc,0,1.4,-1.0,2.9,1.7,4.8,{r:0.85,g:0.6,b:0.1});
    for(const wz of [2.4,-1.3,-2.7])for(const sx of [-1,1])weisTube(Gc,lf.P(sx*1.05,0.78,wz),lf.P(sx*1.5,0.78,wz),0.78,D,10);}
  for(const e of S.excavators){const lf=weisLF(e.x,e.y,e.z,e.rot);for(const sx of [-1,1])lf.box(Gc,sx*1.15,0,0,0.75,0.8,4.2,D);lf.box(Gc,0,0.3,0,1.6,0.5,2.6,D);}
  const eg=lazyOwn(Z,weisExcGeo());for(const e of S.excavators){const m=new THREE.Mesh(eg,weisMat(Z,'conc'));m.position.set(e.x,e.y+0.8,e.z);m.rotation.y=e.rot;m.castShadow=!QS.noShadow;Z.group.add(m);e.mesh=m;st.meshes++;if(m.castShadow)st.cast++;}
  // Büsche auf Hang und Plateau
  const nB=QS.lowLOD?45:90,B=[];for(let k=0;k<600&&B.length<nB;k++){const x=lerp(Q.x0+2,Q.x1-2,R()),z=lerp(Q.z0+2,Q.z1-2,R());const dIn=Math.max(Q.fx0-x,x-Q.fx1,z-Q.fz1);if(dIn<Q.td*Q.tn+3)continue;
    if(Math.hypot(x-v.x,z-v.z)<9)continue;B.push({x,y:weisQH(x,z)-0.2,z,s:0.7+R()*0.9,face:R()*TAU});}
  S.bushes=B.length;weisInst(Z,new THREE.IcosahedronGeometry(1.3,0).translate(0,0.9,0),weisMat(Z,'bush'),B);
  for(const i of S.fenceCells)weisElev(Z.J,i,S.rim,S.rim+1.15);weisElevOBB(Z.J,v.x,v.z,v.w,v.d,S.rim-0.4,v.y);}
function weisExcGeo(){const G=new GB();const Y={r:0.93,g:0.66,b:0.1},D={r:0.18,g:0.18,b:0.19},GL={r:0.25,g:0.32,b:0.38},S={r:0.7,g:0.72,b:0.74};
  weisCyl(G,0,0,0,1.0,0.3,D,12,true);G.box(0,0.3,-0.4,2.6,1.2,3.0,0,Y);G.box(0,0.3,-2.05,2.6,1.0,0.6,0,D);G.box(0.7,1.5,0.5,1.1,1.5,1.3,0,GL);G.box(0.7,3.0,0.5,1.15,0.08,1.35,0,Y);
  G.beam([-0.3,1.2,0.9],[-0.3,4.2,3.4],0.5,0.6,Y);G.beam([-0.3,4.2,3.4],[-0.3,1.3,5.6],0.4,0.45,Y);G.beam([-0.6,1.4,1.2],[-0.6,3.4,2.9],0.16,0.16,S);G.box(-0.3,0.4,5.8,1.1,0.9,0.9,0,D);
  WEIS.stats.sued.verts+=G.p.length/3;WEIS.stats.sued.tris+=G.i.length/3;return G.geo();}

function weisBuildUfer(Z,Gc,Gt){const U=WEIS.ufer;U.sand=0;const K=WEIS.kiosk.pos,n=U.n;const PAVE={r:0.74,g:0.7,b:0.62},EDGE={r:0.55,g:0.53,b:0.5},SAND={r:0.87,g:0.79,b:0.58};
  for(let i=1;i<U.path.length;i++){const a=U.path[i-1],b=U.path[i];if(b.t-a.t>4.5)continue;
    const Q=(p,o,y)=>[p.x+n[0]*o,y,p.z+n[1]*o];Gc.quad(Q(a,-1.8,0.075),Q(b,-1.8,0.075),Q(b,1.8,0.075),Q(a,1.8,0.075),[0,0],[1,0],[1,1],[0,1],PAVE);
    for(const o of [-1.95,1.95])Gc.quad(Q(a,o-0.15,0.09),Q(b,o-0.15,0.09),Q(b,o+0.15,0.09),Q(a,o+0.15,0.09),[0,0],[1,0],[1,1],[0,1],EDGE);
    if(Math.abs(a.t-K.t)<16&&Math.abs(b.t-K.t)<16){const w0=a.sw-a.sp-1.5,w1=b.sw-b.sp-1.5;if(w0>3&&w1>3){Gc.quad(Q(a,2.2,0.07),Q(b,2.2,0.07),Q(b,w1,0.07),Q(a,w0,0.07),[0,0],[1,0],[1,1],[0,1],SAND);U.sand++;}}}
  // Kiosk-Hütte: Holz, Durchreiche zum Wasser, Markise, Schild auf dem Dach
  const lf=weisLF(K.x,0,K.z,K.rot);const WOOD={r:0.58,g:0.4,b:0.24},DW={r:0.36,g:0.24,b:0.14},W={r:0.95,g:0.95,b:0.95},BL={r:0.12,g:0.42,b:0.66};
  lf.box(Gc,0,0,0,6,2.9,4,WOOD);lf.box(Gc,0,2.9,0.2,7,0.25,5.2,DW);lf.box(Gc,0,1.0,2.02,3.6,1.3,0.06,{r:0.12,g:0.1,b:0.09});lf.box(Gc,0,1.0,2.25,3.8,0.08,0.5,DW);
  for(let k=0;k<8;k++)lf.box(Gc,-2.1+k*0.6,2.45,2.6,0.6,0.06,1.2,k%2?W:BL);lf.box(Gc,3.02,0,-0.4,0.06,2.2,1.1,DW);
  lf.box(Gc,0,3.15,1.9,4.2,0.8,0.08,DW);{const p=lf.P(-2,3.2,1.95);const rx=Math.cos(K.rot),rz=-Math.sin(K.rot);weisTexQuad(Gt,p[0],p[2],rx,rz,4,3.2,0.7,weisUV(WEIS_ATL.kiosk));}
  // Sonnenschirme + Liegestühle
  for(const [lx,lz] of [[-4.8,7.6],[5.2,7.4]]){const p=lf.P(lx,0,lz);weisCyl(Gc,p[0],0,p[2],0.05,2.4,DW,6,false);weisCyl(Gc,p[0],2.2,p[2],1.6,0.6,{r:0.85,g:0.2,b:0.15},10,true,0.05);}
  for(const c of weisKeep(U.chairs)){const l2=weisLF(c.x,0,c.z,c.face);l2.box(Gc,0,0.25,0,0.6,0.06,1.0,{r:0.9,g:0.5,b:0.15});l2.box(Gc,0,0.3,-0.55,0.6,0.7,0.06,{r:0.9,g:0.5,b:0.15});for(const sx of [-0.28,0.28])l2.box(Gc,sx,0,0,0.04,0.25,1.0,DW);}
  // Bänke + Laternen (instanziert)
  const bg=new GB();for(const zz of [-0.2,0,0.2])bg.box(0,0.45,zz,1.8,0.04,0.12,0,WHITE,1);bg.box(0,0.55,-0.27,1.8,0.12,0.04,0,WHITE,1);bg.box(0,0.72,-0.29,1.8,0.12,0.04,0,WHITE,1);
  const benches=weisKeep(U.benches),lamps=weisKeep(U.lamps);for(const o of benches)weisBlock(Z.J,o.b);for(const o of lamps)weisBlock(Z.J,o.b);
  for(const x of [-0.75,0.75])bg.box(x,0,0,0.08,0.45,0.5,0,{r:0.15,g:0.15,b:0.16},1);weisInst(Z,bg.geo(),weisMat(Z,'bench'),benches);
  weisInst(Z,new THREE.CylinderGeometry(0.07,0.09,4.2,8).translate(0,2.1,0),weisMat(Z,'pole'),lamps);weisInst(Z,new THREE.SphereGeometry(0.26,10,8).translate(0,4.3,0),lampMat,lamps,false);}

function weisBuildGrossberg(Z){const GBx=WEIS.grossberg,hedges=weisKeep(GBx.hedges);for(const o of hedges)weisBlock(Z.J,o.b);
  weisInst(Z,new THREE.BoxGeometry(3.4,1.3,0.8).translate(0,0.65,0),weisMat(Z,'hedge'),hedges);
  const units=GBx.garages.flatMap(g=>g.units);if(!units.length)return;const G=new GB();const C={r:0.78,g:0.76,b:0.72},R={r:0.42,g:0.43,b:0.45},D={r:0.56,g:0.62,b:0.68};
  G.box(0,0,0,3.0,2.6,6.0,0,C);G.box(0,2.6,0.1,3.1,0.15,6.3,0,R);G.box(0,0.05,3.02,2.5,2.1,0.06,0,D);for(let k=1;k<7;k++)G.box(0,k*0.3,3.06,2.4,0.04,0.03,0,{r:0.45,g:0.5,b:0.55});
  weisInst(Z,G.geo(),weisMat(Z,'garage'),units);}

const WEIS_BUILD={
  syn(Z){const Gs=new GB(),Gt=new GB();weisBuildSynagoge(Gs,Gt);weisMesh(Z,Gs,weisMat(Z,'conc'));weisMesh(Z,Gt,weisMat(Z,'atlas'));},
  ufer(Z){const Uc=new GB(),Ut=new GB();weisBuildUfer(Z,Uc,Ut);weisMesh(Z,Uc,weisMat(Z,'conc'));weisMesh(Z,Ut,weisMat(Z,'atlas'),false);},
  *sued(Z){WEIS.qOn=true;const Zc=new GB(),Zm=new GB();weisBuildZement(Zc,Zm);weisMesh(Z,Zc,weisMat(Z,'conc'));weisMesh(Z,Zm,weisMat(Z,'metal'));yield;
    const Qc=new GB(),Qm=new GB(),Qt=new GB();weisBuildQuarry(Z,Qc,Qm,Qt);yield;weisMesh(Z,Qc,weisMat(Z,'conc'));weisMesh(Z,Qm,weisMat(Z,'metal'));weisMesh(Z,Qt,weisMat(Z,'atlas'),false);yield;
    weisBuildGrossberg(Z);}};
// Generator (p6_lazy: ein Teil je Bild-Paket): Raster-Sperren, Bauteile (Süd in mehreren Teilen), Szenen
function* weisZoneBuild(Z){const k=Z.o.key;WEIS.stats[k]={meshes:0,inst:0,props:0,cast:0,verts:0,tris:0};Z.J=weisJ();Z.mats={};
  for(const b of WEIS.blocks[k])weisBlock(Z.J,b);yield;
  const it=WEIS_BUILD[k](Z);if(it&&typeof it.next==='function')yield* it;yield;
  for(const sc of WEIS.scenes)if(sc.zone===k)weisSpawnScene(Z,sc);}
function weisZoneDispose(Z){const k=Z.o.key;for(const sc of WEIS.scenes)if(sc.zone===k)sc.people=[];
  if(k==='ufer')weisFreeRoom();
  if(k==='sued'){WEIS.qOn=false;for(const e of WEIS.steinbruch.excavators)e.mesh=null;}
  weisUndo(Z.J);Z.J=null;Z.mats=null;}
// Kiosk-Innenraum nur freigeben, wenn niemand drin ist (sonst holt updateWeis das nach)
function weisFreeRoom(){const v=WEIS.kiosk.venue,r=v.room;if(!r||INDOOR===r||PLAYERS.some(P=>P.h&&P.h.room===r))return;
  for(const o of r.people)if(!o.removed)o.remove();r.people=[];scene.remove(r.grp);
  r.grp.traverse(m=>{if(m.geometry)m.geometry.dispose();});if(r.weisFloor)r.weisFloor.dispose();v.room=null;WEIS.roomsFreed++;}
WEIS.drawCalls=k=>lazyDrawCalls(WEIS.zones[k]);

// ---------- Laufzeit ----------
// Szenenfiguren entstehen mit der Zone (lazyNpc); bei „niedrig“ ohne Zusatzszenen und nur die erste Figur je Szene
function weisSpawnScene(Z,sc){if(QS.lowLOD&&sc.extra)return;for(const o of (QS.lowLOD?sc.npcs.slice(0,1):sc.npcs)){const h=lazyNpc(Z,new Human('ped'));h.x=o.x;h.z=o.z;h.y=o.y||0;h.facing=o.face;h.state='roof';h.weisScene=sc;h.weisPose=o.pose;h.walkSpeed=1;
    h.npcName=o.name;h.weisConv=WEIS_CONV[o.conv]||null;
    if(o.pose==='sit'){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;}
    if(o.pose==='rod'){const g=Z.mats.rodG||(Z.mats.rodG=lazyOwn(Z,new THREE.CylinderGeometry(0.012,0.03,3.2,5).translate(0,1.6,0)));const r=new THREE.Mesh(g,cmat(0x3b2a1a,0.6));r.position.set(0,-0.6,0);r.rotation.x=1.86;h.armR.add(r);h.armR.rotation.x=-0.9;}
    if(o.pose==='helmet'){const g=Z.mats.helmG||(Z.mats.helmG=lazyOwn(Z,new THREE.SphereGeometry(0.15,10,6,0,TAU,0,Math.PI/2)));const m=new THREE.Mesh(g,cmat(0xf2c200,0.5));m.position.set(0,0.84,0);h.hips.add(m);}
    if(sc.calm)h.setExpr('neutral');h.sync();sc.people.push(h);}}
function updateWeis(dt){const P=P1;if(!P||!P.h)return;const Zs=WEIS.zones;
  if(WEIS.kiosk.venue.room&&!Zs.ufer.built)weisFreeRoom();
  if(!Zs.syn.built&&!Zs.ufer.built&&!Zs.sued.built)return;
  const [px,pz]=ppos(P);const indoor=!!P.h.room;
  for(const k in Zs)if(Zs[k].group)Zs[k].group.visible=!indoor;
  for(const sc of WEIS.scenes){if(!sc.people.length)continue;const d=Math.hypot(sc.x-px,sc.z-pz);
    for(const h of sc.people){if(h.removed||!h.alive||h.state!=='roof')continue;
      if(h.weisPose!=='sit'&&h.weisPose!=='rod'){const dx=P.h.x-h.x,dz=P.h.z-h.z;if(dx*dx+dz*dz<49)faceTo(h,dx,dz,dt,2);}
      if(h.fx&&h.face.visible)h.updateFace();h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}
    sc.lineT-=dt;if(sc.lineT<=0){sc.lineT=8+Math.random()*7;if(d<24&&sc.lines.length){const c=sc.people.filter(h=>!h.removed&&h.alive&&h.state==='roof'&&!h.bubble);if(c.length)say(mpick(c),mpick(sc.lines),3.6,sc.calm?'quiet':'');}}}
  if(Zs.syn.built){
    // Gedenktafel: Hinweistext in der Nähe
    const Y=WEIS.synagoge;WEIS.hintT-=dt;if(!P.car&&!indoor&&WEIS.hintT<=0&&Math.hypot(P.h.x-Y.plaque.x,P.h.z-Y.plaque.z)<3.2){WEIS.hintT=1;hint('<b>'+WEIS_PLAQUE[0]+'</b> · '+WEIS_PLAQUE.slice(1).join(' '),1.3,P);}
    // Ruhezone an der Synagoge: keine Prügeleien
    WEIS.calmT-=dt;if(WEIS.calmT<=0){WEIS.calmT=0.25;const C=WEIS.calm;if(Math.hypot(px-C.x,pz-C.z)<C.r+60)for(const o of HUMANS){if(o.state!=='brawl'||!o.alive)continue;if(Math.hypot(o.x-C.x,o.z-C.z)>C.r)continue;
      o.state='walk';o.walkSpeed=1.3;o.setExpr('neutral');say(o,'… Nee, net hier. Des is kää Ort fer Streit.',3);WEIS.calmed++;}}}
  if(Zs.sued.built){
    // Zementstaub, Bagger schwenken
    const Z=WEIS.zement,zc=[(Z.rect[0]+Z.rect[2])/2,(Z.rect[1]+Z.rect[3])/2];
    if(Math.hypot(px-zc[0],pz-zc[1])<280){WEIS.dustT-=dt;if(WEIS.dustT<=0){WEIS.dustT=0.12;const e=mpick(Z.emit);Z.dust=(Z.dust||0)+1;spawnPart(e[0]+mr(-2,2),e[1],e[2]+mr(-2,2),{color:e[3],size:mr(1.5,3.2),vx:mr(0.3,1.2),vz:mr(-0.4,0.4),vy:mr(0.3,0.9),life:mr(3,5),grow:1.6,alpha:0.28});}}
    const Q=WEIS_Q;if(Math.hypot(px-(Q.x0+Q.x1)/2,pz-(Q.z0+Q.z1)/2)<320)for(const e of WEIS.steinbruch.excavators)if(e.mesh)e.mesh.rotation.y=e.rot+Math.sin(simTime*0.35+e.ph)*0.8;}}
