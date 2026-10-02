// ===================== 26 ROSENMONTAGSZUG =====================
// Fastnachtszug durch die Mainzer Innenstadt auf echten Straßen (Große Bleiche ab Schloss → Schillerstraße → Spritzengasse →
// Schillerplatz → Ludwigsstraße → Markt): Absperrgitter an den Seitenstraßen, Zuschauer, Polizei, Motivwagen mit
// frei erfundenen Figuren, Schwellköpp, Garden, Musikzug und das Minispiel „Kamelle fangen“.
// Start: 11:11 Uhr an jedem Rosenmontag (Spieltag 1, 4, 7 …), über die Mission am Fastnachtsbrunnen oder die Karte.
const ROSENMO={on:false,reason:'',route:[],routeNodes:[],routeEdges:[],cum:[],hw:[],len:0,units:[],crowd:[],cops:[],barriers:[],
  kamelle:{caught:0,best:0,flying:[],ground:[]},head:0,day:0,lastMin:-1,doneDay:-1,announced:-1,
  START:11*60+11,EVERY:3,SPEED:3,GAP:12,WIN:110,GOAL:15,
  blockSet:new Set(),routeSet:new Set(),hash:null,slots:null,slotHash:null,bgroups:null,mesh:null,hud:null,mus:null,winT:0,sayT:0,carT:0,missionStart:null};

const ROSENMO_RUFE=['Helau!','HELAU!','Helau, Meenz!','Kamelle! Kamelle!','Strüssjer! Hier!','Hier! HIER! Kamelle!','Meenz bleibt Meenz!','Rizzambaa!','Ei, guck emol de Wagen!','Wolle mer se reilosse?'];
const ROSENMO_GARDE=['Gaaarde – marsch!','Links, zwo, drei, vier!','Helau, ihr Leut!','Gewehr üüüber!'];
const ROSENMO_SCHWELL=['Ei gude wie!','Helau, ihr Leut!','Mei Kopp is schwer!','Wer hat mei Nas gesehe?'];
const ROSENMO_FARBEN=[0xc8102e,0xf4f4f4,0x1d4e89,0xffd23f];
// Motivwagen: nur frei erfundene Figuren und Typen, keine echten Personen, keine Marken
const ROSENMO_FIGS=[
  {name:'De Baustell-Kaiser',motto:'FERTIG WERD’S 2099!',skin:0xf0c8a0,suit:0xff8a00,hat:'helm',hatCol:0xffd23f},
  {name:'Dr. Hubertus Schoppenhauer',motto:'DIÄTE? NUR FÜR ANNERE!',skin:0xf2c9a8,suit:0x1c2230,hat:'none',glasses:true,tie:0x8b1a1a},
  {name:'Die Parkplatz-Fee',motto:'HEUT LEIDER AUSGEBUCHT',skin:0xf6d0b4,suit:0x9b59b6,hat:'krone',hatCol:0xe0b020},
  {name:'Professor Schoppe',motto:'RIESLING IS GEMÜS!',skin:0xe8b890,suit:0x6b4426,hat:'doktor',hatCol:0x1a1a1a,glasses:true},
  {name:'De Zuch-Schneck',motto:'DE ZUCH KIMMT … IRGENDWANN',skin:0x9ccc65,suit:0x5d8a2e,hat:'none',shell:0xd88a2a},
  {name:'Bürokratius',motto:'FORMULAR 27b – DREIFACH!',skin:0xe0b494,suit:0x5b6168,hat:'papier',hatCol:0xf6f6f0},
  {name:'De Fassenachts-Narr',motto:'MEENZ BLEIBT MEENZ!',skin:0xf4cfae,suit:0xc8102e,hat:'kappe',hatCol:0x1d4e89}];
const ROSENMO_SCHWELLTYPEN=[{skin:0xf2c9a8,hat:'zylinder',hatCol:0x151515},{skin:0xf6d6b8,hat:'krone',hatCol:0xe0b020},{skin:0xe8b890,hat:'baecker',hatCol:0xf8f8f8},
  {skin:0xf0c0a0,hat:'kappe',hatCol:0xc8102e},{skin:0xdcae8c,hat:'none',hair:0xb5542c}];
const ROSENMO_MEL=[[65,1],[69,1],[72,1],[69,1],[77,2],[76,1],[74,1],[72,1],[69,1],[70,1],[67,1],[72,3],[0,1],
  [74,1],[70,1],[67,1],[70,1],[72,1],[69,1],[65,1],[69,1],[67,1],[72,1],[76,1],[79,1],[77,3],[0,1]];
const ROSENMO_BASS=[41,41,36,41,46,41,36,41];

// ---------- Route: Wegpunkte auf benannten Straßen, dazwischen kürzeste Wege im Straßengraph ----------
function rosenmoNamedNode(name,near,maxD=600){let best=-1,bd=maxD*maxD;
  for(const r of ROADS){if(r.name!==name||!r.nodes)continue;for(const n of r.nodes){const N=NODES[n];const d=(N.x-near[0])**2+(N.z-near[1])**2;if(d<bd){bd=d;best=n;}}}return best;}
function rosenmoEdgeBetween(a,b){let best=-1,bl=1e9;for(const e of NODES[a].e){if(edgeOther(e,a)===b&&EDGES[e].len<bl){bl=EDGES[e].len;best=e;}}return best;}
// Kürzester Weg, der die Zugstraßen bevorzugt und Fußwege/Treppen meidet
const ROSENMO_STRASSEN=new Set(['Große Bleiche','Münsterplatz','Schillerstraße','Schillerplatz','Ludwigsstraße','Markt','Höfchen']);
function rosenmoPath(s,t){const dist=new Map([[s,0]]),prev=new Map();const H=[[0,s]];
  const push=it=>{H.push(it);let i=H.length-1;while(i>0){const p=(i-1)>>1;if(H[p][0]<=H[i][0])break;[H[p],H[i]]=[H[i],H[p]];i=p;}};
  const pop=()=>{const top=H[0];const last=H.pop();if(H.length){H[0]=last;let i=0;for(;;){const l=i*2+1,r=l+1;let m=i;if(l<H.length&&H[l][0]<H[m][0])m=l;if(r<H.length&&H[r][0]<H[m][0])m=r;if(m===i)break;[H[m],H[i]]=[H[i],H[m]];i=m;}}return top;};
  let it=0;while(H.length&&it++<40000){const [d,n]=pop();if(n===t)break;if(d>dist.get(n))continue;
    for(const e of NODES[n].e){const E=EDGES[e];const o=edgeOther(e,n);const r=E.road;if(r.bridge)continue;const k=(r.type==='path'?12:1)*(ROSENMO_STRASSEN.has(r.name)?1:2.5);const nd=d+E.len*k;
      if(nd<(dist.get(o)??Infinity)){dist.set(o,nd);prev.set(o,n);push([nd,o]);}}}
  if(!prev.has(t))return [];const path=[t];while(path[path.length-1]!==s)path.push(prev.get(path[path.length-1]));return path.reverse();}
function rosenmoBuildRoute(){const R=ROSENMO;
  const wp=[['Große Bleiche',POI.schloss],['Münsterplatz',POI.fastnacht],['Schillerplatz',POI.fastnacht],['Ludwigsstraße',POI.markt],['Markt',POI.markt]]
    .map(([n,p])=>p?rosenmoNamedNode(n,p):-1).filter(n=>n>=0);
  const nodes=[];for(let i=0;i<wp.length-1;i++){const p=rosenmoPath(wp[i],wp[i+1]);for(const n of p)if(nodes[nodes.length-1]!==n)nodes.push(n);}
  // Schleifen entfernen (falls ein Teilweg denselben Knoten zweimal berührt)
  const seen=new Map();for(let i=0;i<nodes.length;i++){const n=nodes[i];if(seen.has(n)){const j=seen.get(n);for(const k of nodes.slice(j+1,i))seen.delete(k);nodes.splice(j+1,i-j);i=j;}else seen.set(n,i);}
  const pts=[],edges=[],cum=[0],hw=[];
  for(let i=0;i<nodes.length;i++){const N=NODES[nodes[i]];pts.push([N.x,N.z]);if(i){const e=rosenmoEdgeBetween(nodes[i-1],nodes[i]);edges.push(e);cum.push(cum[i-1]+Math.hypot(N.x-pts[i-1][0],N.z-pts[i-1][1]));
      const r=e>=0?EDGES[e].road:null;hw.push(r?Math.max(2.5,r.w/2):3);}}
  R.route=pts;R.routeNodes=nodes;R.routeEdges=edges;R.cum=cum;R.hw=hw;R.len=cum[cum.length-1]||0;R.routeSet=new Set(edges.filter(e=>e>=0));
  // Raster für schnelle Abstandsabfragen
  const H=new Map();for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const x0=Math.floor((Math.min(a[0],b[0])-14)/30),x1=Math.floor((Math.max(a[0],b[0])+14)/30),z0=Math.floor((Math.min(a[1],b[1])-14)/30),z1=Math.floor((Math.max(a[1],b[1])+14)/30);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const k=x+','+z;if(!H.has(k))H.set(k,[]);H.get(k).push(i);}}
  R.hash=H;}
// Nächster Routenpunkt: Abstand d, Laufmeter s, Segment i, halbe Straßenbreite hw
function rosenmoNearest(x,z){const R=ROSENMO;const out={d:1e9,s:0,i:-1,hw:3};if(!R.hash)return out;const l=R.hash.get(Math.floor(x/30)+','+Math.floor(z/30));if(!l)return out;
  for(const i of l){const a=R.route[i],b=R.route[i+1];const dx=b[0]-a[0],dz=b[1]-a[1];const L2=dx*dx+dz*dz||1e-6;const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1);const px=a[0]+dx*t,pz=a[1]+dz*t;const d=Math.hypot(x-px,z-pz);
    if(d<out.d){out.d=d;out.s=R.cum[i]+t*Math.sqrt(L2);out.i=i;out.hw=R.hw[i];}}
  return out;}
// Position auf der Route (vor dem Anfang/nach dem Ende geradlinig verlängert): [x,z,Richtung,Segment]
function rosenmoPosAt(s){const R=ROSENMO,C=R.cum,P=R.route;const n=P.length;if(n<2)return [0,0,0,0];let i;
  if(s<=0)i=0;else if(s>=R.len)i=n-2;else{let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(C[m]<=s)lo=m;else hi=m;}i=lo;}
  const a=P[i],b=P[i+1];const L=Math.max(1e-6,C[i+1]-C[i]);const t=(s-C[i])/L;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.atan2(b[0]-a[0],b[1]-a[1]),i];}
function rosenmoHeading(s){const a=rosenmoPosAt(s-4),b=rosenmoPosAt(s+4);return Math.atan2(b[0]-a[0],b[1]-a[1]);}

// ---------- Zuschauerplätze (beide Straßenseiten) und Absperrungen an den Seitenstraßen ----------
function rosenmoSlots(){const R=ROSENMO;if(R.slots)return R.slots;const S=[];const step=LOWMEM?3.2:2.4;const rows=LOWMEM?1:2;
  for(let i=0;i<R.route.length-1;i++){const e=R.routeEdges[i];const r=e>=0?EDGES[e].road:null;const a=R.route[i],b=R.route[i+1];const L=R.cum[i+1]-R.cum[i];if(L<1)continue;
    const fx=(b[0]-a[0])/L,fz=(b[1]-a[1])/L;const base=r&&r.type==='ped'?Math.max(3,r.w/2-0.6):R.hw[i]+Math.min(1.4,(r&&r.sw||1.6)*0.45)+0.4;
    for(let t=1.2;t<L-1.2;t+=step)for(const side of [-1,1])for(let row=0;row<rows;row++){const off=base+row*0.85;const x=a[0]+fx*t+fz*off*side,z=a[1]+fz*t-fx*off*side;
      if(blocked(x,z)||blocked(x+0.3,z)||blocked(x-0.3,z))continue;const q=rosenmoNearest(x,z);if(q.d<off-0.6)continue;
      S.push({x:x+mr(-0.25,0.25),z:z+mr(-0.2,0.2),face:Math.atan2(-fz*side,fx*side),s:R.cum[i]+t,h:null});}}
  const H=new Map();S.forEach((s,k)=>{const key=Math.floor(s.x/40)+','+Math.floor(s.z/40);if(!H.has(key))H.set(key,[]);H.get(key).push(k);});
  R.slots=S;R.slotHash=H;return S;}
function rosenmoBarrierGroups(){const R=ROSENMO;if(R.bgroups)return R.bgroups;const G=[];const used=new Set();
  R.routeNodes.forEach((n,k)=>{const hwr=R.hw[Math.min(k,R.hw.length-1)]||3;for(const e of NODES[n].e){if(R.routeSet.has(e)||used.has(e))continue;const E=EDGES[e];if(E.road.type==='path')continue;used.add(e);
      const d=edgeDir(e,n);const dist=Math.min(hwr+2.4,E.len*0.6);const cx=NODES[n].x+d[0]*dist,cz=NODES[n].z+d[1]*dist;const span=E.road.w+(E.road.type==='ped'?0:2*(E.road.sw||0)*0.6);
      const cnt=Math.max(1,Math.min(6,Math.ceil(span/2.5)));const el=[];for(let j=0;j<cnt;j++){const o=(j-(cnt-1)/2)*2.5;el.push({x:cx+d[1]*o,z:cz-d[0]*o,h:Math.atan2(d[0],d[1])});}
      G.push({e,n,x:cx,z:cz,dir:d,el,cop:{x:cx+d[1]*(cnt*1.25+0.8)-d[0]*1.2,z:cz-d[0]*(cnt*1.25+0.8)-d[1]*1.2,face:Math.atan2(-d[0],-d[1])},h:null});}});
  R.bgroups=G;return G;}

// ---------- Geteilte Geometrien und Materialien (einmal angelegt, über alle Züge geteilt) ----------
let ROSENMO_GEO=null;
function rosenmoGeo(){if(ROSENMO_GEO)return ROSENMO_GEO;const col=c=>{const k=new THREE.Color(c);return {r:k.r,g:k.g,b:k.b};};
  // Absperrgitter: Rahmen, Stäbe, Füße
  const gb=new GB();const grey=col(0xa9b0b6),dark=col(0x3a3f44),red=col(0xc8102e),white=col(0xf4f4f4);
  for(const x of [-1.2,1.2])gb.beam([x,0.08,0],[x,1.1,0],0.05,0.05,grey);for(const y of [0.18,1.08])gb.beam([-1.2,y,0],[1.2,y,0],0.05,0.05,grey);
  for(let i=1;i<12;i++){const x=-1.2+i*0.2;gb.beam([x,0.18,0],[x,1.08,0],0.018,0.018,grey);}
  for(const x of [-1.1,1.1])gbox(gb,x,0.04,0,0.12,0.08,0.6,dark);
  for(let i=0;i<4;i++)gbox(gb,-0.9+i*0.6,0.95,0.03,0.6,0.16,0.02,i%2?white:red);
  // Wagen-Unterbau: Zugmaschine, Plattform, Schürze in Meenzer Farben, Geländer
  const wb=new GB();const green=col(0x2e7d32),black=col(0x1b1b1b),gold=col(0xe0b020);
  gbox(wb,0,0.95,4.5,1.9,1.3,1.6,green);gbox(wb,0,1.85,4.3,1.5,0.7,1.0,{r:0.15,g:0.18,b:0.2});gbox(wb,0,0.35,4.5,2.0,0.5,1.7,black);
  gbox(wb,0,1.0,-0.6,3.0,0.18,8.0,col(0xece6d6));
  for(let k=0;k<8;k++){const c=col(ROSENMO_FARBEN[k%4]);gbox(wb,0,0.52,-4.1+k*1.0,3.04,0.8,1.0,c);}
  for(const x of [-1.45,1.45]){wb.beam([x,1.1,-4.5],[x,1.1,3.3],0.06,0.06,gold);wb.beam([x,1.55,-4.5],[x,1.55,3.3],0.06,0.06,gold);for(let k=0;k<6;k++)wb.beam([x,1.1,-4.5+k*1.55],[x,1.55,-4.5+k*1.55],0.05,0.05,gold);}
  const vc=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.75});
  ROSENMO_GEO={barrier:gb.geo(),wagen:wb.geo(),vc,sphere:new THREE.SphereGeometry(1,18,14),cyl:new THREE.CylinderGeometry(1,1,1,16),cone:new THREE.ConeGeometry(1,1,12),
    smile:new THREE.TorusGeometry(1,0.18,8,18,Math.PI),ring:new THREE.TorusGeometry(1,0.12,8,20),bust:new THREE.CylinderGeometry(0.8,1.1,1,16),box:new THREE.BoxGeometry(1,1,1),
    sign:new THREE.PlaneGeometry(1,1),shell:new THREE.TorusGeometry(1,0.55,10,20),
    candy:new THREE.BoxGeometry(0.13,0.07,0.09),bouquet:new THREE.ConeGeometry(0.1,0.26,6),
    candyMats:[0xff3b3b,0xffd23f,0x3bb2ff,0x7ad94f,0xff7ad9].map(c=>cmat(c,0.4)),bouquetMat:cmat(0xff5fa0,0.6),
    signMats:new Map()};
  return ROSENMO_GEO;}
function rosenmoSignMat(text,bg){const G=rosenmoGeo();if(G.signMats.has(text))return G.signMats.get(text);const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');
  x.fillStyle=bg;x.fillRect(0,0,512,96);x.strokeStyle='#ffd23f';x.lineWidth=8;x.strokeRect(4,4,504,88);x.fillStyle='#fff';x.font='bold 40px "Bungee","Barlow Condensed",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,50,488);
  const t=freeAfterUpload(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshStandardMaterial({map:t,roughness:0.8});G.signMats.set(text,m);return m;}
function rosenmoMesh(parent,geo,mat,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);m.castShadow=true;parent.add(m);return m;}
// Pappmaché-Kopf mit Gesicht und Hut; R = Kopfradius, y = Mittelpunkt
function rosenmoHead(par,y,R,o){const G=rosenmoGeo();const skin=cmat(o.skin,0.7),white=cmat(0xffffff,0.4),black=cmat(0x111111,0.4),red=cmat(0xb3202a,0.5),cheek=cmat(0xf08080,0.7);
  rosenmoMesh(par,G.sphere,skin,0,y,0,R,R*1.08,R*0.95);
  for(const s of [-1,1]){rosenmoMesh(par,G.sphere,white,s*R*0.36,y+R*0.22,R*0.8,R*0.22,R*0.26,R*0.16);rosenmoMesh(par,G.sphere,black,s*R*0.36,y+R*0.2,R*0.93,R*0.1,R*0.12,R*0.06);
    rosenmoMesh(par,G.sphere,cheek,s*R*0.55,y-R*0.18,R*0.72,R*0.17,R*0.13,R*0.08);rosenmoMesh(par,G.sphere,skin,s*R*1.0,y,0,R*0.2,R*0.3,R*0.12);}
  rosenmoMesh(par,G.sphere,cmat(o.nose||o.skin,0.6),0,y-R*0.02,R*0.98,R*0.24,R*0.22,R*0.32);
  rosenmoMesh(par,G.smile,red,0,y-R*0.36,R*0.84,R*0.34,R*0.3,R*0.3,0,0,Math.PI);
  if(o.glasses){for(const s of [-1,1])rosenmoMesh(par,G.ring,black,s*R*0.36,y+R*0.22,R*0.97,R*0.27,R*0.27,R*0.27);rosenmoMesh(par,G.box,black,0,y+R*0.24,R*0.99,R*0.2,R*0.04,R*0.04);}
  const hc=cmat(o.hatCol||0x222222,0.5),top=y+R*1.02;
  if(o.hat==='helm'){rosenmoMesh(par,G.sphere,hc,0,top-R*0.18,0,R*1.02,R*0.62,R*1.0);rosenmoMesh(par,G.cyl,hc,0,top-R*0.22,R*0.1,R*1.25,R*0.06,R*1.2);}
  else if(o.hat==='zylinder'){rosenmoMesh(par,G.cyl,hc,0,top+R*0.45,0,R*0.62,R*1.0,R*0.62);rosenmoMesh(par,G.cyl,hc,0,top-R*0.06,0,R*1.0,R*0.06,R*1.0);rosenmoMesh(par,G.cyl,red,0,top+R*0.05,0,R*0.63,R*0.14,R*0.63);}
  else if(o.hat==='krone'){rosenmoMesh(par,G.cyl,hc,0,top,0,R*0.7,R*0.35,R*0.7);for(let k=0;k<6;k++){const a=k/6*TAU;rosenmoMesh(par,G.cone,hc,Math.sin(a)*R*0.62,top+R*0.32,Math.cos(a)*R*0.62,R*0.14,R*0.32,R*0.14);}}
  else if(o.hat==='doktor'){rosenmoMesh(par,G.cyl,hc,0,top,0,R*0.62,R*0.3,R*0.62);rosenmoMesh(par,G.box,hc,0,top+R*0.18,0,R*1.6,R*0.07,R*1.6,0,0.785,0);rosenmoMesh(par,G.sphere,cmat(0xffd23f,0.5),R*0.55,top+R*0.05,R*0.55,R*0.09,R*0.3,R*0.09);}
  else if(o.hat==='papier'){for(let k=0;k<5;k++)rosenmoMesh(par,G.box,hc,mr(-0.1,0.1)*R,top+R*(0.05+k*0.16),mr(-0.1,0.1)*R,R*1.1,R*0.14,R*0.8,0,mr(-0.3,0.3),0);}
  else if(o.hat==='kappe'){rosenmoMesh(par,G.cone,hc,R*0.15,top+R*0.55,0,R*0.75,R*1.4,R*0.75,0,0,-0.35);rosenmoMesh(par,G.sphere,cmat(0xffd23f,0.5),R*0.48,top+R*1.2,0,R*0.2,R*0.2,R*0.2);
    rosenmoMesh(par,G.cyl,cmat(0xf4f4f4,0.8),0,top-R*0.1,0,R*0.85,R*0.14,R*0.85);}
  else if(o.hat==='baecker'){rosenmoMesh(par,G.cyl,hc,0,top+R*0.2,0,R*0.8,R*0.6,R*0.8);rosenmoMesh(par,G.sphere,hc,0,top+R*0.55,0,R*0.95,R*0.4,R*0.95);}
  else if(o.hair){for(const s of [-1,1])rosenmoMesh(par,G.sphere,cmat(o.hair,0.9),s*R*0.75,top-R*0.25,-R*0.1,R*0.42,R*0.42,R*0.42);rosenmoMesh(par,G.sphere,cmat(o.hair,0.9),0,top-R*0.2,-R*0.2,R*0.9,R*0.5,R*0.85);}}

// ---------- Motivwagen ----------
function rosenmoWagen(fig){const G=rosenmoGeo();const F=ROSENMO_FIGS[fig%ROSENMO_FIGS.length];const g=new THREE.Group();
  const base=new THREE.Mesh(G.wagen,G.vc);base.castShadow=true;base.receiveShadow=true;g.add(base);
  const sm=rosenmoSignMat(F.motto,'#7a1a1a'),nm=rosenmoSignMat(F.name.toUpperCase(),'#1d4e89');
  for(const s of [-1,1]){rosenmoMesh(g,G.sign,sm,s*1.54,0.62,-0.6,5.6,0.62,1,0,s*Math.PI/2,0);rosenmoMesh(g,G.sign,nm,s*1.54,1.33,-2.2,3.4,0.42,1,0,s*Math.PI/2,0);}
  rosenmoMesh(g,G.bust,cmat(F.suit,0.6),0,2.0,-1.2,1,1.8,0.85);
  if(F.tie)rosenmoMesh(g,G.box,cmat(F.tie,0.5),0,2.3,-0.32,0.28,1.0,0.06);
  if(F.shell)rosenmoMesh(g,G.shell,cmat(F.shell,0.6),0,2.8,-3.1,1.3,1.3,1.3,0,Math.PI/2,0);
  rosenmoHead(g,4.2,1.35,{skin:F.skin,hat:F.hat,hatCol:F.hatCol,glasses:F.glasses,nose:F.shell?0x7cb342:undefined});
  g.position.y=-100;scene.add(g);return g;}

// ---------- Fußgruppen: Garde, Musikzug, Schwellköpp ----------
function rosenmoDress(h,top,bottom){const T=cmat(top,0.6),B=cmat(bottom,0.7);
  h.g.traverse(o=>{if(!o.geometry)return;const G=o.geometry;if(G===HGEO.torso||G===HGEO.arm||G===SG.shoulder||G===BODY.torsoM||G===BODY.torsoF||G===BODY.armM||G===BODY.armF)o.material=T;
    else if(G===HGEO.pelvis||G===HGEO.leg||G===BODY.legM||G===BODY.legF||G===BODY.pelvisM||G===BODY.pelvisF)o.material=B;});
  h.g.scale.set(1,1,1);h.bodyScale=1;h.baseScale=[1,1,1];}
function rosenmoMember(u,i){const G=rosenmoGeo();const h=new Human('ped');h.state='venue';h.mission=true;h.walkSpeed=0;h.rosenmo={unit:u};h.npcName=u.name;let back=0,lat=0;
  if(u.kind==='garde'){rosenmoDress(h,u.jacket,u.pants);const row=Math.floor(i/2);back=row*1.7;lat=(i%2?1:-1)*1.15;
    rosenmoMesh(h.hips,G.cyl,cmat(u.hat,0.5),0,1.0,-0.01,0.15,0.3,0.15);rosenmoMesh(h.hips,G.cone,cmat(u.plume,0.6),0,1.24,-0.01,0.05,0.2,0.05);
    rosenmoMesh(h.hips,G.box,cmat(0xffd23f,0.4),0,0.36,0.13,0.3,0.06,0.02);}
  else if(u.kind==='musik'){rosenmoDress(h,0x1d4e89,0xf4f4f4);const row=Math.floor(i/3);back=row*1.9;lat=((i%3)-1)*1.5;rosenmoMesh(h.hips,G.cyl,cmat(0xf4f4f4,0.5),0,0.98,-0.01,0.14,0.18,0.14);
    const gold=cmat(0xe0b020,0.25);h.instr=['trompete','trompete','trompete','trommel','tuba','trommel'][i%6];
    if(h.instr==='trompete'){rosenmoMesh(h.hips,G.cyl,gold,0,0.76,0.36,0.025,0.42,0.025,Math.PI/2,0,0);rosenmoMesh(h.hips,G.cone,gold,0,0.76,0.62,0.08,0.14,0.08,-Math.PI/2,0,0);}
    else if(h.instr==='tuba')rosenmoMesh(h.hips,G.ring,gold,0,0.55,0.05,0.3,0.3,1.6,0,Math.PI/2,0);
    else rosenmoMesh(h.hips,G.cyl,cmat(0xc8102e,0.5),0,0.22,0.3,0.26,0.24,0.26,0,0,Math.PI/2);}
  else{const T=ROSENMO_SCHWELLTYPEN[i%ROSENMO_SCHWELLTYPEN.length];rosenmoDress(h,mpick([0x6a1f3a,0x2f4b3a,0x3b5f8a,0x7a5432,0x8a1d22]),0x2a2c30);back=i*2.4;lat=(i%2?1.6:-1.6)+mr(-0.3,0.3);
    const ch=h.hips.children;if(Array.isArray(ch))for(const c of ch)if(c.position.y>0.68)c.visible=false;if(h.face)h.face.visible=false;h.bigHead=true;
    rosenmoHead(h.hips,0.95,0.42,{skin:T.skin,hat:T.hat,hatCol:T.hatCol,hair:T.hair});}
  return {h,back,lat};}
function rosenmoThrower(u){const h=new Human('ped');h.state='venue';h.mission=true;h.walkSpeed=0;h.rosenmo={unit:u};h.npcName='Zugteilnehmer';
  rosenmoDress(h,mpick(ROSENMO_FARBEN),0xf4f4f4);rosenmoMesh(h.hips,rosenmoGeo().cone,cmat(mpick(ROSENMO_FARBEN),0.6),0.03,1.08,0,0.13,0.32,0.13,0,0,-0.3);return h;}

// ---------- Aufstellung des Zugs ----------
function rosenmoPlan(){const L=LOWMEM;const P=[];
  P.push({kind:'garde',name:'Meenzer Schoppe-Garde',n:L?6:8,jacket:0xc8102e,pants:0xf4f4f4,hat:0xf4f4f4,plume:0xc8102e});
  P.push({kind:'musik',name:'Spielmannszug Rheinwelle',n:L?4:6});
  P.push({kind:'wagen',fig:0});P.push({kind:'schwell',name:'Schwellköpp',n:L?3:5});P.push({kind:'wagen',fig:1});P.push({kind:'wagen',fig:2});
  if(!L)P.push({kind:'garde',name:'Kasteler Kreppel-Garde',n:6,jacket:0x1d4e89,pants:0xf4f4f4,hat:0x1d4e89,plume:0xffd23f});
  P.push({kind:'wagen',fig:3});P.push({kind:'wagen',fig:4});if(!L){P.push({kind:'wagen',fig:5});P.push({kind:'wagen',fig:6});}
  let off=0;for(const u of P){u.len=u.kind==='wagen'?10:u.kind==='garde'?Math.ceil(u.n/2)*1.7:u.kind==='musik'?Math.ceil(u.n/3)*1.9:u.n*2.4;if(u.kind==='wagen')u.name=ROSENMO_FIGS[u.fig].name;
    u.off=off;off+=u.len+ROSENMO.GAP;u.s=0;u.spawned=false;u.done=false;u.members=[];u.g=null;u.thrower=null;u.throwT=mr(0.5,1.5);u.sayT=mr(2,6);}
  return P;}
function rosenmoSpawnUnit(u){u.spawned=true;if(u.kind==='wagen'){u.g=rosenmoWagen(u.fig);if(!LOWMEM)u.thrower=rosenmoThrower(u);}else for(let i=0;i<u.n;i++)u.members.push(rosenmoMember(u,i));}
function rosenmoFreeUnit(u){for(const m of u.members)rosenmoRemoveHuman(m.h);u.members=[];if(u.thrower)rosenmoRemoveHuman(u.thrower);u.thrower=null;if(u.g){scene.remove(u.g);u.g=null;}u.done=true;}
function rosenmoRemoveHuman(h){if(!h||h.removed)return;if(TALK&&TALK.npc===h)endTalk();h.remove();}
function rosenmoTrainLen(){const U=ROSENMO.units;return U.length?U[U.length-1].off+U[U.length-1].len:0;}

// ---------- Start / Ende ----------
function rosenmoStart(o={}){const R=ROSENMO;if(R.on||R.len<500)return false;R.on=true;R.reason=o.reason||'start';R.doneDay=R.day;
  R.head=0;if(o.near){const q=rosenmoNearest(o.near[0],o.near[1]);if(q.i>=0)R.head=clamp(q.s-(o.lead??60),0,R.len-50);}
  R.units=rosenmoPlan();R.kamelle.caught=0;rosenmoSlots();
  // Absperrgitter + gesperrte Kanten
  const G=rosenmoBarrierGroups();const geo=rosenmoGeo();R.blockSet=new Set(R.routeSet);const el=[];for(const g of G){R.blockSet.add(g.e);for(const b of g.el)el.push(b);}
  R.barriers=G.map(g=>({x:g.x,z:g.z,e:g.e,n:g.el.length}));
  const im=R.mesh=new THREE.InstancedMesh(geo.barrier,geo.vc,Math.max(1,el.length));const M4=new THREE.Matrix4();
  el.forEach((b,i)=>{M4.makeRotationY(b.h);M4.setPosition(b.x,groundY(b.x,b.z),b.z);im.setMatrixAt(i,M4);});im.count=el.length;im.instanceMatrix.needsUpdate=true;im.frustumCulled=false;im.castShadow=true;scene.add(im);
  rosenmoClearCars(true);
  for(const c of CARS)if(c.ai&&c.ai.mode==='traffic'&&c.ai.next&&R.blockSet.has(c.ai.next.e)&&c.ai.e!==undefined)c.ai.next=chooseNext(c.ai.e,c.ai.from,true);
  rosenmoHud();showBig('ROSENMONTAGSZUG','mission',3.5,'Helau! De Zug kimmt – Kamelle fange!');chime([523,659,784,1046]);
  hint('🎭 <b>Rosenmontagszug</b> durch die Innenstadt! Stell dich an de Straßenrand – <b>Leertaste</b>: hochspringe un Kamelle fange.',6);
  return true;}
function rosenmoEnd(reason='ende'){const R=ROSENMO;if(!R.on)return false;
  for(const u of R.units)rosenmoFreeUnit(u);R.units=[];
  for(const h of R.crowd){if(h.rosenmo&&h.rosenmo.slot)h.rosenmo.slot.h=null;rosenmoRemoveHuman(h);}R.crowd=[];
  for(const h of R.cops){if(h.rosenmo&&h.rosenmo.grp)h.rosenmo.grp.h=null;rosenmoRemoveHuman(h);}R.cops=[];
  if(R.slots)for(const s of R.slots)s.h=null;if(R.bgroups)for(const g of R.bgroups)g.h=null;
  if(R.mesh){scene.remove(R.mesh);R.mesh.dispose&&R.mesh.dispose();R.mesh=null;}R.barriers=[];R.blockSet=new Set();
  for(const k of R.kamelle.flying.concat(R.kamelle.ground))scene.remove(k.m);R.kamelle.flying=[];R.kamelle.ground=[];
  R.kamelle.best=Math.max(R.kamelle.best,R.kamelle.caught);R.on=false;R.reason='';if(R.hud)R.hud.style.display='none';
  if(R.mus&&R.mus.gain&&AUD.ctx)R.mus.gain.gain.setTargetAtTime(0,AUD.ctx.currentTime,0.2);
  if(reason==='ende'&&PLAYERS.some(P=>P.h&&rosenmoNearest(...ppos(P)).d<250))showBig('ZUG VORBEI','win',3,`Bis nächst Johr – Helau! · ${R.kamelle.caught} Kamelle gefange`);
  return true;}

// ---------- Verkehr: keine Autos in der Zugstrecke ----------
function rosenmoInRoute(x,z,extra=1.5){const q=rosenmoNearest(x,z);return q.d<q.hw+extra;}
function rosenmoClearCars(all){for(let i=CARS.length-1;i>=0;i--){const c=CARS[i];if(!c.ai||(c.ai.mode!=='traffic'&&c.ai.mode!=='parked')||c.persist||c.mission||isPlayerCar(c))continue;
    if(rosenmoInRoute(c.x,c.z,all?2.5:1.5))c.remove();}}
const _rosenmoChooseNext=chooseNext;
chooseNext=function(e,from,carOnly){let r=_rosenmoChooseNext(e,from,carOnly);const B=ROSENMO.blockSet;if(!ROSENMO.on||!carOnly||!B.size)return r;
  for(let k=0;k<8&&B.has(r.e)&&r.e!==e;k++)r=_rosenmoChooseNext(e,from,carOnly);if(B.has(r.e)&&r.e!==e)r={e,from:edgeOther(e,from)};return r;};
const _rosenmoAiTraffic=aiTraffic;
aiTraffic=function(car,dt){_rosenmoAiTraffic(car,dt);if(!ROSENMO.on)return;const fx=Math.sin(car.h),fz=Math.cos(car.h);
  if(rosenmoInRoute(car.x+fx*(car.T.L/2+5),car.z+fz*(car.T.L/2+5),2)){car.inp.throttle=0;car.inp.brake=1;}};
const _rosenmoSpawnTraffic=spawnTraffic;
spawnTraffic=function(px,pz,rmin,rmax){const n=CARS.length;_rosenmoSpawnTraffic(px,pz,rmin,rmax);if(ROSENMO.on&&CARS.length>n){const c=CARS[CARS.length-1];if(rosenmoInRoute(c.x,c.z,4)||(c.ai&&ROSENMO.blockSet.has(c.ai.e)))c.remove();}};
const _rosenmoSpawnParked=spawnParked;
spawnParked=function(px,pz,rmin,rmax){const n=CARS.length;_rosenmoSpawnParked(px,pz,rmin,rmax);if(ROSENMO.on&&CARS.length>n){const c=CARS[CARS.length-1];if(rosenmoInRoute(c.x,c.z,3))c.remove();}};

// ---------- Kamelle ----------
function rosenmoThrow(u,tx,tz){const R=ROSENMO,K=R.kamelle;if(!u||!u.g||K.flying.length>=(LOWMEM?24:48))return null;const G=rosenmoGeo();
  const big=Math.random()<0.08;const m=new THREE.Mesh(big?G.bouquet:G.candy,big?G.bouquetMat:mpick(G.candyMats));
  const [x0,z0]=[u.x+mr(-0.6,0.6),u.z+mr(-0.6,0.6)];const y0=u.y+2.7;const ty=groundY(tx,tz)+1.35;const T=mr(0.9,1.25);
  const k={m,x:x0,y:y0,z:z0,vx:(tx-x0)/T,vz:(tz-z0)/T,vy:(ty-y0+0.5*9.8*T*T)/T,val:big?3:1,t:0};m.position.set(x0,y0,z0);scene.add(m);K.flying.push(k);
  if(u.thrower){u.thrower.throwT=0.45;}return k;}
function rosenmoCatch(P,k,how){const K=ROSENMO.kamelle;const before=K.caught;K.caught+=k.val;K.best=Math.max(K.best,K.caught);scene.remove(k.m);
  if(Math.floor(K.caught/10)>Math.floor(before/10)){G.money+=10;chime([784,988,1175]);hint(`🍬 <b>${K.caught} Kamelle!</b> Die Zuschauer schenke dir €10. Helau!`,2.5,P);}
  else if(k.val>1)hint('💐 E <b>Strüssje</b>! (+3)',1.6,P);else if(how==='air')hint('🍬 Gefange!',0.8,P);}
function rosenmoUpdateKamelle(dt){const K=ROSENMO.kamelle;const hs=PLAYERS.filter(P=>P.h&&!P.car&&!P.gameOver&&!P.h.room);
  for(let i=K.flying.length-1;i>=0;i--){const k=K.flying[i];k.t+=dt;k.vy-=9.8*dt;k.x+=k.vx*dt;k.y+=k.vy*dt;k.z+=k.vz*dt;k.m.position.set(k.x,k.y,k.z);k.m.rotation.x+=dt*9;k.m.rotation.y+=dt*7;
    let got=null;for(const P of hs){const h=P.h;const air=!P.ground;const r=air?1.7:1.05;if(Math.hypot(k.x-h.x,k.z-h.z)<r&&k.y>h.y+0.4&&k.y<h.y+(air?2.9:2.3)){got=P;break;}}
    if(got){K.flying.splice(i,1);rosenmoCatch(got,k,'air');continue;}
    const gy=groundY(k.x,k.z);if(k.y<=gy+0.05||k.t>4){k.y=gy+0.04;k.m.position.y=k.y;k.m.rotation.set(0,k.m.rotation.y,0);k.t=0;K.flying.splice(i,1);K.ground.push(k);}}
  for(let i=K.ground.length-1;i>=0;i--){const k=K.ground[i];k.t+=dt;let got=null;for(const P of hs)if(Math.hypot(k.x-P.h.x,k.z-P.h.z)<0.9){got=P;break;}
    if(got){K.ground.splice(i,1);rosenmoCatch(got,k,'ground');continue;}if(k.t>6||K.ground.length>40){K.ground.splice(i,1);scene.remove(k.m);}}}

// ---------- Musikzug: eigene Marschmelodie, Bass, Trommeln (WebAudio) ----------
function rosenmoMusic(u){const ctx=AUD.ctx;const R=ROSENMO;if(!ctx)return;if(!R.mus){const g=ctx.createGain();g.gain.value=0;g.connect(AUD.master);R.mus={gain:g,next:0,hb:0,mi:0,rem:0};}const M=R.mus;
  const d=u&&u.spawned&&!u.done?minPlayerDist(u.x,u.z):999;const vol=AUD.on&&!INDOOR?0.32*clamp(1-(d-12)/120,0,1):0;M.gain.gain.setTargetAtTime(vol,ctx.currentTime,0.25);
  if(vol<=0.001){M.next=0;return;}const BEAT=0.42,now=ctx.currentTime;if(M.next<now)M.next=now+0.05;
  const tone=(f,t,dur,type,v,cut)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=f;const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut;const g=ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.03);g.gain.setValueAtTime(v,t+Math.max(0.04,dur-0.08));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(fl);fl.connect(g);g.connect(M.gain);o.start(t);o.stop(t+dur+0.02);};
  const noise=(t,dur,type,f,v)=>{const s=ctx.createBufferSource();s.buffer=AUD.noise;const fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.value=f;const g=ctx.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(M.gain);s.start(t,Math.random()*1.5);s.stop(t+dur+0.02);};
  const hz=m=>440*Math.pow(2,(m-69)/12);
  while(M.next<now+0.3){const t=M.next,hb=M.hb;
    if(M.rem<=0){const [n,len]=ROSENMO_MEL[M.mi];M.mi=(M.mi+1)%ROSENMO_MEL.length;M.rem=len;if(n){const dur=len*BEAT/2*0.92;for(const det of [-0.004,0.004])tone(hz(n)*(1+det),t,dur,'sawtooth',0.07,2100);}}
    M.rem--;
    if(hb%2===0){const bar=Math.floor(hb/4)%ROSENMO_BASS.length;const root=ROSENMO_BASS[bar];tone(hz(hb%4===0?root:root+7),t,BEAT*0.8,'triangle',0.16,600);}
    if(hb%4===0)noise(t,0.18,'lowpass',140,0.5);else if(hb%4===2)noise(t,0.12,'highpass',1600,0.18);else noise(t,0.04,'highpass',6000,0.05);
    M.hb++;M.next+=BEAT/2;}}

// ---------- Zuschauer + Polizei im Umkreis der Spieler ----------
function rosenmoCostume(h){const top=mpick([0xc8102e,0xffd23f,0x1d4e89,0x2e7d32,0xff7ad9,0xf4f4f4,0x9b59b6,0xff8a00]);const T=cmat(top,0.8);
  h.g.traverse(o=>{if(!o.geometry)return;const G=o.geometry;if(G===HGEO.torso||G===HGEO.arm||G===SG.shoulder||G===BODY.torsoM||G===BODY.torsoF||G===BODY.armM||G===BODY.armF)o.material=T;});
  const G=rosenmoGeo();const r=Math.random();
  if(r<0.45){rosenmoMesh(h.hips,G.cone,cmat(mpick(ROSENMO_FARBEN),0.6),0.02,1.06,-0.01,0.13,0.3,0.13,0,0,-0.3);rosenmoMesh(h.hips,G.sphere,cmat(0xffd23f,0.5),0.08,1.21,-0.01,0.04,0.04,0.04);}
  else if(r<0.6)rosenmoMesh(h.hips,G.sphere,cmat(mpick([0xff3b3b,0x3bb2ff,0x7ad94f,0xffd23f]),0.9),0,0.86,-0.02,0.16,0.13,0.15);
  if(Math.random()<0.35)rosenmoMesh(h.hips,G.sphere,cmat(0xe01010,0.4),0,0.785,0.14,0.035,0.035,0.035);}
function rosenmoSpawnSpectator(s){const h=new Human('ped');rosenmoCostume(h);h.x=s.x;h.z=s.z;h.y=groundY(s.x,s.z);h.facing=s.face;h.state='venue';h.walkSpeed=0;h.rosenmo={slot:s,cheer:0};
  h.npcName=mpick(NPC_NAMES)+' (Zugzuschauer)';h.sync();s.h=h;ROSENMO.crowd.push(h);return h;}
function rosenmoSpawnCop(g){const c=spawnCop(g.cop.x,g.cop.z,null);c.state='venue';c.facing=g.cop.face;c.walkSpeed=0;c.rosenmo={grp:g};if(c.gun)c.gun.visible=false;c.sync();g.h=c;ROSENMO.cops.push(c);return c;}
function rosenmoManageCrowd(){const R=ROSENMO;const pts=PLAYERS.filter(P=>P.h&&!P.gameOver).map(P=>ppos(P));if(!pts.length)return;
  const dist=(x,z)=>{let d=1e9;for(const p of pts)d=Math.min(d,Math.hypot(x-p[0],z-p[1]));return d;};
  for(let i=R.crowd.length-1;i>=0;i--){const h=R.crowd[i];const lost=h.removed||!h.alive||(h.state!=='venue'&&h.state!=='talk');
    if(lost||dist(h.x,h.z)>R.WIN+40){R.crowd.splice(i,1);if(h.rosenmo&&h.rosenmo.slot)h.rosenmo.slot.h=null;if(lost){h.rosenmo=null;h.mission=false;}else rosenmoRemoveHuman(h);}}
  for(let i=R.cops.length-1;i>=0;i--){const c=R.cops[i];const lost=c.removed||!c.alive||c.state!=='venue';
    if(lost||dist(c.x,c.z)>R.WIN+60){R.cops.splice(i,1);if(c.rosenmo&&c.rosenmo.grp)c.rosenmo.grp.h=null;if(lost)c.rosenmo=null;else rosenmoRemoveHuman(c);}}
  const cap=LOWMEM?24:48,copCap=LOWMEM?3:5;
  if(R.crowd.length<cap){const cand=[];const seen=new Set();for(const p of pts){const cx=Math.floor(p[0]/40),cz=Math.floor(p[1]/40);const rr=Math.ceil(R.WIN/40);
      for(let a=-rr;a<=rr;a++)for(let b=-rr;b<=rr;b++){const l=R.slotHash.get((cx+a)+','+(cz+b));if(!l)continue;for(const k of l){if(seen.has(k))continue;seen.add(k);const s=R.slots[k];if(s.h)continue;const d=dist(s.x,s.z);if(d<R.WIN&&d>4)cand.push([d,s]);}}}
    cand.sort((a,b)=>a[0]-b[0]);for(const [,s] of cand){if(R.crowd.length>=cap)break;rosenmoSpawnSpectator(s);}}
  if(R.cops.length<copCap&&wanted===0){const cand=R.bgroups.filter(g=>!g.h&&dist(g.cop.x,g.cop.z)<R.WIN&&!blocked(g.cop.x,g.cop.z)).sort((a,b)=>dist(a.cop.x,a.cop.z)-dist(b.cop.x,b.cop.z));
    for(const g of cand){if(R.cops.length>=copCap)break;rosenmoSpawnCop(g);}}}
// Jubeln: Arme schräg nach vorn-oben, nie senkrecht (höchstens ~40° über der Waagrechten)
function rosenmoCheerPose(h,t,k){const w=Math.sin(t*9+h.phase)*0.12;rosenmoArms(h,-(Math.PI/2+0.5*k)+w*k,-(Math.PI/2+0.5*k)-w*k,0.35,-0.35);}
// Armstellung setzen und am Menschen merken (Tests prüfen den Winkel über h.rosenmo.arms)
function rosenmoArms(h,xl,xr,zl,zr){h.armL.rotation.x=xl;h.armR.rotation.x=xr;h.armL.rotation.z=zl;h.armR.rotation.z=zr;if(h.rosenmo)h.rosenmo.arms=[xl,xr,zl,zr];}
function rosenmoUpdateCrowd(dt,floats){const R=ROSENMO;const t=simTime;let cand=null;
  for(const h of R.crowd){if(h.state!=='venue')continue;const S=h.rosenmo;let near=1e9;for(const f of floats){const d=Math.abs(f.x-h.x)+Math.abs(f.z-h.z);if(d<near)near=d;}
    h.animate(dt,0);const cheer=near<22;S.cheer+=((cheer?1:0)-S.cheer)*Math.min(1,dt*4);
    if(S.cheer>0.05)rosenmoCheerPose(h,t,S.cheer);else{h.armL.rotation.x=-0.35+Math.sin(t*2+h.phase)*0.05;h.armR.rotation.x=-0.35-Math.sin(t*2+h.phase)*0.05;}
    if(cheer&&!h.bubble&&minPlayerDist(h.x,h.z)<40)cand=h;if(cheer&&h.fx&&h.fx.exprName!=='laugh')h.setExpr('laugh');
    h.facing+=angDiff(h.facing,S.slot.face+Math.sin(t*0.4+h.phase)*0.25)*Math.min(1,dt*3);h.y=groundY(h.x,h.z);h.sync();}
  R.sayT-=dt;if(cand&&R.sayT<=0){R.sayT=mr(0.5,1.4);say(cand,mpick(ROSENMO_RUFE),2.2,'loud');}
  for(const c of R.cops){if(c.state!=='venue')continue;if(wanted>0){c.state='cop';c.rosenmo=null;continue;}c.animate(dt,0);c.armL.rotation.x=-0.25;c.armR.rotation.x=-0.25;c.y=groundY(c.x,c.z);c.sync();}}

// ---------- Hauptschleife ----------
function rosenmoUpdateUnits(dt){const R=ROSENMO;R.head+=R.SPEED*dt;const floats=[];let musik=null;
  for(const u of R.units){if(u.done)continue;u.s=R.head-u.off;if(u.s<-2)continue;if(u.s-u.len>R.len){rosenmoFreeUnit(u);continue;}if(!u.spawned)rosenmoSpawnUnit(u);
    const [x,z]=rosenmoPosAt(u.s-u.len/2);u.x=x;u.z=z;
    if(u.kind==='wagen'){const s=u.s-5;const p=rosenmoPosAt(s);const hd=rosenmoHeading(s);const gy=groundY(p[0],p[1]);u.x=p[0];u.z=p[1];u.y=gy;u.g.position.set(p[0],gy,p[1]);u.g.rotation.y=hd;floats.push(u);
      const fx=Math.sin(hd),fz=Math.cos(hd);
      if(u.thrower){const h=u.thrower;const sw=Math.sin(simTime*0.8+u.fig)*0.9;h.x=p[0]-fx*3.4+fz*sw;h.z=p[1]-fz*3.4-fx*sw;h.y=gy+1.09;h.facing=hd+Math.PI/2*Math.sign(Math.sin(simTime*0.3+u.fig)||1);h.animate(dt,0);
        h.throwT=(h.throwT||0)-dt;rosenmoArms(h,-0.5,h.throwT>0?-(Math.PI/2+0.6):-0.6+Math.sin(simTime*3)*0.15,0.06,h.throwT>0?-0.2:-0.06);h.sync();}
      u.throwT-=dt;const pd=minPlayerDist(p[0],p[1]);
      if(u.throwT<=0&&pd<90){u.throwT=mr(0.35,0.9);const P=nearestPlayer(p[0],p[1]);const [px,pz]=ppos(P);
        if(P.h&&!P.car&&Math.hypot(px-p[0],pz-p[1])<16&&Math.random()<0.55)rosenmoThrow(u,px+mr(-0.5,0.5),pz+mr(-0.5,0.5));
        else{const side=Math.random()<0.5?-1:1;const q=rosenmoPosAt(s+mr(-6,8));const off=R.hw[q[3]]+mr(0.8,3);rosenmoThrow(u,q[0]+Math.cos(q[2])*off*side,q[1]-Math.sin(q[2])*off*side);}}
      continue;}
    for(const m of u.members){const h=m.h;if(h.removed)continue;if(h.state!=='venue'){continue;}const sm=u.s-m.back;const p=rosenmoPosAt(sm);const hd=rosenmoHeading(sm);
      h.x=p[0]+Math.cos(hd)*m.lat;h.z=p[1]-Math.sin(hd)*m.lat;h.facing=hd;h.animate(dt,R.SPEED*(u.kind==='schwell'?0.8:1));
      if(u.kind==='musik'){if(h.instr==='trompete'){h.armR.rotation.x=-1.45;h.armL.rotation.x=-1.35;h.armR.rotation.z=0.25;h.armL.rotation.z=-0.25;}
        else if(h.instr==='tuba'){h.armR.rotation.x=-1.0;h.armL.rotation.x=-0.9;}else{const b=Math.abs(Math.sin(simTime*7.48));h.armR.rotation.x=-0.6-b*0.5;h.armL.rotation.x=-0.6-(1-b)*0.5;}}
      if(u.kind==='schwell'){h.hips.rotation.z=Math.sin(simTime*2.2+h.phase)*0.08;}
      h.y=groundY(h.x,h.z,h.y);h.sync();}
    if(u.kind==='musik')musik=u;
    u.sayT-=dt;if(u.sayT<=0){u.sayT=mr(5,11);const lead=u.members.find(m=>!m.h.removed&&m.h.state==='venue');if(lead&&minPlayerDist(lead.h.x,lead.h.z)<35){if(u.kind==='garde')say(lead.h,mpick(ROSENMO_GARDE),2.4,'loud');else if(u.kind==='schwell')say(lead.h,mpick(ROSENMO_SCHWELL),2.4);}}}
  rosenmoMusic(musik);
  if(R.units.every(u=>u.done))rosenmoEnd('ende');
  return floats;}
function rosenmoHud(){const R=ROSENMO;if(!R.hud){const d=document.createElement('div');d.id='rosenmo-hud';d.style.cssText='position:absolute;left:50%;top:64px;transform:translateX(-50%);padding:6px 14px;border-radius:10px;background:rgba(122,26,26,.82);color:#fff;font:700 18px "Barlow Condensed",sans-serif;letter-spacing:.03em;pointer-events:none;z-index:5;display:none;box-shadow:0 4px 16px rgba(0,0,0,.35)';
    ($('hud')||document.body).appendChild(d);R.hud=d;}return R.hud;}
function rosenmoUpdateHud(){const R=ROSENMO;const d=rosenmoHud();if(!R.on){d.style.display='none';return;}const near=PLAYERS.some(P=>P.h&&rosenmoNearest(...ppos(P)).d<160);
  d.style.display=near?'':'none';if(near){const t=`🍬 Kamelle: ${R.kamelle.caught} · Rekord ${R.kamelle.best}`;if(d.textContent!==t)d.textContent=t;}}
function rosenmoCrowdNoise(){const ctx=AUD.ctx;const R=ROSENMO;if(!ctx)return;if(!R.noiseGain){const s=ctx.createBufferSource();s.buffer=AUD.noise;s.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=700;f.Q.value=0.7;
    const g=R.noiseGain=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(AUD.master);s.start();}
  let v=0;if(R.on&&!INDOOR&&R.crowd.length){const d=Math.min(...PLAYERS.filter(P=>P.h).map(P=>rosenmoNearest(...ppos(P)).d));v=0.12*clamp(1-(d-15)/100,0,1);}R.noiseGain.gain.setTargetAtTime(v,ctx.currentTime,0.4);}
function updateRosenmo(dt){const R=ROSENMO;if(!R.len)return;
  if(R.lastMin>1300&&gameMin<140)R.day++;R.lastMin=gameMin;
  const rm=rosenmoIsRosenmontag();
  if(rm&&!R.on&&R.announced!==R.day&&gameMin>=10*60+30&&gameMin<R.START){R.announced=R.day;hint('🎭 Heut is <b>Rosenmontag</b>! Um <b>11:11 Uhr</b> zieht de Zug ab de Große Bleiche dorch die Innenstadt – Helau!',7);}
  if(rm&&!R.on&&R.doneDay!==R.day&&gameMin>=R.START&&gameMin<R.START+30)rosenmoStart({reason:'zeit'});
  if(R.on){const floats=rosenmoUpdateUnits(dt);if(R.on){R.winT-=dt;if(R.winT<=0){R.winT=0.5;rosenmoManageCrowd();rosenmoClearCars(false);}rosenmoUpdateCrowd(dt,floats);}}
  rosenmoUpdateKamelle(dt);rosenmoUpdateHud();rosenmoCrowdNoise();}
function rosenmoIsRosenmontag(day=ROSENMO.day){return day%ROSENMO.EVERY===1;}

// ---------- Karte, Mission, Speicherstand ----------
const _rosenmoBlipList=blipList;
blipList=function(forP){const out=_rosenmoBlipList(forP);if(ROSENMO.on){let first=true;for(const u of ROSENMO.units)if(u.spawned&&!u.done&&u.kind==='wagen'){out.push({x:u.x,z:u.z,c:'#ff4fd8',r:4,label:first?'Zug':''});first=false;}}return out;};
const _rosenmoFtSpecials=ftSpecials;
ftSpecials=function(){const S=_rosenmoFtSpecials();const p=ROSENMO.missionStart;if(p)S.push({n:'Rosenmontagszug starten',g:'Fastnacht',x:p[0],z:p[1],rosenmo:true});return S;};
const _rosenmoFastTravel=fastTravel;
fastTravel=function(d){if(d&&d.rosenmo&&!ROSENMO.on&&wanted===0&&P1.h&&!P1.h.room&&!(P1.car&&P1.car.T.boat)&&!P1.gameOver)rosenmoStart({reason:'karte',near:[d.x,d.z]});return _rosenmoFastTravel(d);};
const _rosenmoSnapshot=snapshot;
snapshot=function(){const d=_rosenmoSnapshot();d.rosenmo={best:ROSENMO.kamelle.best,day:ROSENMO.day};return d;};
const _rosenmoApplySave=applySave;
applySave=function(d){const r=_rosenmoApplySave(d);if(r&&d&&d.rosenmo){ROSENMO.kamelle.best=Math.max(0,d.rosenmo.best|0);if(Number.isFinite(d.rosenmo.day))ROSENMO.day=d.rosenmo.day|0;ROSENMO.lastMin=gameMin;}return r;};
function rosenmoMission(start){return {id:'rosenmo',tag:'K',free:true,title:'Kamelle-König',start,
  begin(m){if(!ROSENMO.on)rosenmoStart({reason:'mission',near:start});m.c0=ROSENMO.kamelle.caught;m.goal=ROSENMO.GOAL;
    missionText(`De <b>Rosenmontagszug</b> kimmt! Fang <b>${m.goal} Kamelle</b>, bevor de Zug vorbei is. <b>Leertaste</b> = hochspringe.`,7);},
  update(m){const got=ROSENMO.kamelle.caught-m.c0;if(got>=m.goal)return 'win';if(!ROSENMO.on)return 'fail';
    const P=mP(m);const [px,pz]=ppos(P);let best=null,bd=1e9;for(const u of ROSENMO.units)if(u.spawned&&!u.done&&u.kind==='wagen'){const d=Math.hypot(u.x-px,u.z-pz);if(d<bd){bd=d;best=u;}}
    m.target=best&&bd>25?[best.x,best.z]:null;if(Math.floor(simTime)%4===0&&m.shown!==Math.floor(simTime)){m.shown=Math.floor(simTime);missionText(`Kamelle: <b>${got}/${m.goal}</b>`,2);}},
  end(m){},reward:250,win:'Du bist de Kamelle-König vom Rosenmontag! Helau!'};}
function setupRosenmo(){const R=ROSENMO;try{rosenmoBuildRoute();}catch(e){console.warn('Rosenmontagszug: keine Route',e);R.len=0;}
  R.lastMin=gameMin;if(R.len<500)return;
  const q=rosenmoNearest(POI.fastnacht[0],POI.fastnacht[1]);const p=rosenmoPosAt(q.s);const off=R.hw[p[3]]+3.5;let st=null;
  for(const side of [1,-1]){const x=p[0]+Math.cos(p[2])*off*side,z=p[1]-Math.sin(p[2])*off*side;if(!blocked(x,z)){st=[x,z];break;}}
  st=st||freeSpot(POI.fastnacht[0]+6,POI.fastnacht[1]+6,0.5);R.missionStart=st;
  const m=rosenmoMission(st);MISSIONS.push(m);const b=beacon();setBeacon(b,st[0],st[1]);b.userData.m=m;startBeacons.push(b);
  label('Rosenmontagszug (11:11)',R.route[0][0],R.route[0][1],'small');
  Object.assign(R,{start:rosenmoStart,end:rosenmoEnd,posAt:rosenmoPosAt,nearest:rosenmoNearest,throwAt:(i,x,z)=>!!rosenmoThrow(R.units[i],x,z),isRosenmontag:rosenmoIsRosenmontag,inRoute:rosenmoInRoute});}
