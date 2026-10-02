// ===================== 34 Detail: Altstadt + Bleichenviertel (Mainz) =====================
// Kirschgarten mit Fachwerk + Brunnen + Kopfsteinpflaster, begehbare Weinstube mit Meenzer Stammtisch in der
// Augustinerstraße, Café-Tische mit Domblick am Leichhof, belebte Bleichen (mehr Passanten mit Tüten, Schaufenster,
// Fahrradbügel), Straßenszenen in Mundart, Schnellreise-Ziele. Gutenberg-Museum gehört Welle 3 (Coup) – hier nicht.
// Positionen kommen aus den OSM-Namen (Straßen „Kirschgarten“, „Augustinerstraße“, Platz „Leichhof“, die drei Bleichen).
const ALTST={fachwerk:[],weinstube:null,scenes:[],ft:[],cafe:[],displays:[],racks:[],stands:[],shoppers:[],meshes:[],sitters:[],
  on:true,kg:null,fountain:null,lh:null,bl:null,blEdges:[],
  scenesOn:true,BIAS:0.55,BL_R:320,BL_NEAR:150,SCENE_ON:45,SCENE_OFF:60,FACH_D:3.5,FACH_C:12};
const ALTST_FACH_TINT=[0xf3e3c3,0xeec9a8,0xe9d6a0,0xd9e2c8,0xf2d0c9,0xf6efe2,0xe8c88e,0xdfe6ee];
const ALTST_BLEICHEN=new Set(['Große Bleiche','Mittlere Bleiche','Hintere Bleiche']);

// ---------- Kirschgarten: Zone aus OSM (Straße + Platz) ----------
let ALTST_KG_ZONE=null;
function altstKgZone(){if(ALTST_KG_ZONE)return ALTST_KG_ZONE;const segs=[];
  for(const r of ROADS)if(r.name==='Kirschgarten')for(let i=1;i<r.pts.length;i++)segs.push([r.pts[i-1],r.pts[i]]);
  const sq=AREAS.find(a=>a.kind==='square'&&a.name==='Kirschgarten');const poly=sq?sq.poly:null;
  if(poly)for(let i=0;i<poly.length;i++)segs.push([poly[i],poly[(i+1)%poly.length]]);
  return ALTST_KG_ZONE={segs,poly,c:poly?polyCentroid(poly):segs.length?segs[0][0]:[-32,158]};}
function altstKgDist(x,z){const Z=altstKgZone();if(Z.poly&&pip(x,z,Z.poly))return 0;let d=1e9;for(const [a,b] of Z.segs)d=Math.min(d,segDist(x,z,a[0],a[1],b[0],b[1]).d);return d;}
function altstKgBuilding(b){if(altstKgDist(b.x,b.z)<ALTST.FACH_C)return true;for(const p of b.poly)if(altstKgDist(p[0],p[1])<ALTST.FACH_D)return true;return false;}

// Häuser am Kirschgarten werden zu bunten Fachwerkhäusern (gemeinsame Fachwerk-Fassade aus p2_tex, nur andere Tönung)
const _altstPlanBuilding=planBuilding;
planBuilding=function(b){_altstPlanBuilding(b);
  if(b.typ===1||b.typ===2||b.typ===3||b.typ===4||b.typ===6||b.isRoof||b.area>700||b.H>22||!altstKgBuilding(b))return;
  const R=mulberry32(((b.gid||0)%100000)+3434);b.style='fachwerk';b.tint=new THREE.Color(ALTST_FACH_TINT[Math.floor(R()*ALTST_FACH_TINT.length)]);
  if(b.roofKind==='copper')b.roofKind='tile';ALTST.fachwerk.push({x:b.x,z:b.z,gid:b.gid,H:b.H,b});};

// Plastisches Fachwerk: vorstehende Schwellen je Geschoss + Eckständer an freien Fassaden (ein Mesh, ein Material)
function altstFachwerkBeams(){const G=new GB();const wood={r:0.29,g:0.17,b:0.11};let n=0;
  for(const f of ALTST.fachwerk){const b=f.b;const top=b.wallTop||b.H;const gf=b.rect?b.rect.gf:b.gf;const fh=b.rect?b.rect.fh:b.fh;if(!(top>gf+1.5))continue;
    const P=b.poly;for(let i=0;i<P.length;i++){const A=P[i],B=P[(i+1)%P.length];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<2)continue;
      let nx=(B[1]-A[1])/L,nz=-(B[0]-A[0])/L;const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;if(pip(mx+nx*0.8,mz+nz*0.8,P)){nx=-nx;nz=-nz;}
      const q=idx(mx+nx*1.6,mz+nz*1.6);if(q<0||hgG(q)>0)continue;// Brandwand zum Nachbarhaus
      const o=0.07,ax=A[0]+nx*o,az=A[1]+nz*o,bx=B[0]+nx*o,bz=B[1]+nz*o;
      for(let y=gf;y<top-0.5;y+=fh)G.beam([ax,y+0.1,az],[bx,y+0.1,bz],0.16,0.22,wood);
      G.beam([ax,top-0.12,az],[bx,top-0.12,bz],0.16,0.2,wood);
      for(const [x,z] of [[ax,az],[bx,bz]])G.beam([x,gf,z],[x,top,z],0.2,0.2,wood);n++;}}
  if(!n)return null;const m=new THREE.Mesh(G.geo(),stdMat({vertexColors:true,roughness:0.85}));m.castShadow=true;m.receiveShadow=true;return altstAdd(staticMesh(m));}
function altstAdd(m){scene.add(m);ALTST.meshes.push(m);return m;}

// ---------- Kirschgartenbrunnen + Pflaster ----------
function altstFountain(){const Z=altstKgZone();const c=Z.c;let best=null,bd=40;
  for(let i=0;i<OSM.fountains.length;i+=2){const x=OSM.fountains[i]/10,z=OSM.fountains[i+1]/10;const d=Math.hypot(x-c[0],z-c[1]);if(d<bd&&!blocked(x,z)){bd=d;best=[x,z];}}
  const [x,z]=best||freeSpot(c[0],c[1],2.4);const G=new GB(),stone={r:0.72,g:0.66,b:0.58},dark={r:0.52,g:0.47,b:0.41};
  for(let k=0;k<8;k++){const a=k/8*TAU;G.box(x+Math.cos(a)*1.75,0,z+Math.sin(a)*1.75,1.5,0.7,0.32,-a+Math.PI/2,stone,1);}
  G.box(x,0,z,0.62,0.4,0.62,0,dark,1);G.box(x,0.4,z,0.42,1.9,0.42,Math.PI/4,stone,1);G.box(x,2.3,z,0.8,0.18,0.8,0,dark,1);
  G.box(x,2.48,z,0.5,0.32,0.5,0,{r:0.45,g:0.3,b:0.16},1);// Korb
  for(let k=0;k<7;k++){const a=k/7*TAU;G.box(x+Math.cos(a)*0.17,2.8,z+Math.sin(a)*0.17,0.11,0.11,0.11,a,{r:0.7,g:0.04,b:0.08},1);}// Kirschen
  for(let k=0;k<4;k++){const a=k/4*TAU+0.4;G.beam([x+Math.cos(a)*0.22,1.7,z+Math.sin(a)*0.22],[x+Math.cos(a)*0.75,1.25,z+Math.sin(a)*0.75],0.06,0.06,dark);}// Wasserspeier
  const m=new THREE.Mesh(G.geo(),stdMat({vertexColors:true,roughness:0.8}));m.castShadow=true;m.receiveShadow=true;altstAdd(staticMesh(m));
  const w=new THREE.Mesh(new THREE.CircleGeometry(1.62,16).rotateX(-Math.PI/2).translate(x,0.55,z),MAT.water||stdMat({color:0x2d5b6e,roughness:0.05}));altstAdd(staticMesh(w));
  rasterCirc(HG,x,z,1.95,1);ALTST.fountain={x,z};}
function altstCobble(poly){if(!poly)return;const m=shapeMesh(poly,0.05,MAT.cobble||stdMat({color:0x77706a}),2);ALTST.meshes.push(staticMesh(m));}

// ---------- Leichhof: Café-Tische mit Domblick ----------
// Sichtachse: kein Gebäude außerhalb des Doms ragt über die Linie vom Auge (1,2 m) zur Domspitze (45 m)
function altstDomView(x,z){const D=(OSM.pl&&OSM.pl.dom)||[-10.6,-8.9];const bb=OSM.lm&&OSM.lm.dom&&OSM.lm.dom.bbox||[-70,-44,51,26];const L=Math.hypot(D[0]-x,D[1]-z);
  for(let t=1;t<L;t+=1){const px=x+(D[0]-x)*t/L,pz=z+(D[1]-z)*t/L;if(px>bb[0]&&px<bb[2]&&pz>bb[1]&&pz<bb[3])return true;const i=idx(px,pz);if(i<0)continue;const h=hgG(i);if(h>0&&h<255&&h>1.2+(45-1.2)*t/L)return false;}return true;}
function altstCafe(){const A=AREAS.find(a=>a.kind==='square'&&a.name==='Leichhof');if(!A)return;const poly=A.poly;const c=polyCentroid(poly);ALTST.lh={x:c[0],z:c[1],poly};
  const fnt=[];for(let i=0;i<OSM.fountains.length;i+=2){const x=OSM.fountains[i]/10,z=OSM.fountains[i+1]/10;if(pip(x,z,poly))fnt.push([x,z]);}
  const free=(x,z)=>{for(const [dx,dz] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const i=idx(x+dx,z+dz);if(i<0||hgG(i)>0||(mfG(i)&4))return false;}return pip(x,z,poly)&&!fnt.some(f=>Math.hypot(f[0]-x,f[1]-z)<3.5);};
  const [x0,z0,x1,z1]=polyBBox(poly);const cand=[];for(let x=x0+2;x<x1-1;x+=3.4)for(let z=z0+2;z<z1-1;z+=3.4)if(free(x,z))cand.push([x,z,altstDomView(x,z)]);
  const view=cand.filter(p=>p[2]);const pool=(view.length>=4?view:cand).sort((a,b)=>Math.hypot(a[0]-c[0],a[1]-c[1])-Math.hypot(b[0]-c[0],b[1]-c[1])).slice(0,8);
  const D=(OSM.pl&&OSM.pl.dom)||[-10.6,-8.9];const tables=[],chairs=[];
  for(const [x,z,v] of pool){const f=Math.atan2(D[0]-x,D[1]-z);const bx=-Math.sin(f)*0.75,bz=-Math.cos(f)*0.75,sx=Math.cos(f)*0.55,sz=-Math.sin(f)*0.55;
    tables.push({x,z,face:f,view:v});for(const s of [-1,1])chairs.push({x:x+bx+sx*s,z:z+bz+sz*s,face:f});rasterCirc(HG,x,z,0.5,1);}
  ALTST.cafe=tables;if(!tables.length)return;
  const tg=new GB(),cg=new GB(),pg=new GB();const wood={r:0.55,g:0.36,b:0.2},iron={r:0.13,g:0.13,b:0.14},cloth={r:0.55,g:0.08,b:0.12};
  tg.beam([0,0,0],[0,0.72,0],0.07,0.07,iron);tg.box(0,0.72,0,0.75,0.04,0.75,0,wood,1);tg.box(0,0.76,0,0.09,0.15,0.09,0,{r:0.9,g:0.82,b:0.45},1);// Schoppeglas
  cg.box(0,0.43,0,0.44,0.05,0.42,0,wood,1);cg.box(0,0.45,-0.19,0.44,0.48,0.04,0,wood,1);for(const [a,b] of [[-0.19,-0.18],[0.19,-0.18],[-0.19,0.18],[0.19,0.18]])cg.beam([a,0,b],[a,0.43,b],0.04,0.04,iron);
  pg.beam([0,0.7,0],[0,2.35,0],0.05,0.05,{r:0.85,g:0.85,b:0.82});for(let k=0;k<8;k++){const a=k/8*TAU,b2=(k+1)/8*TAU;pg.tri([0,2.6,0],[Math.cos(a)*1.4,2.2,Math.sin(a)*1.4],[Math.cos(b2)*1.4,2.2,Math.sin(b2)*1.4],[0,0],[1,0],[0,1],cloth);
    pg.tri([0,2.6,0],[Math.cos(b2)*1.4,2.2,Math.sin(b2)*1.4],[Math.cos(a)*1.4,2.2,Math.sin(a)*1.4],[0,0],[1,0],[0,1],cloth);}
  const mat=stdMat({vertexColors:true,roughness:0.7});
  for(const [g,l] of [[tg,tables],[cg,chairs],[pg,tables]]){const m=instGeo(g.geo(),mat,l);if(m){scene.remove(m);altstAdd(staticInst(m));}}}

// ---------- Bleichenviertel: Schaufenster, Kleiderständer, Fahrradbügel ----------
const ALTST_WIN_CELLS=4;
function altstWindowTex(){return canvasTex(512,128,g=>{const R=mulberry32(34);
  for(let k=0;k<ALTST_WIN_CELLS;k++){const x=k*128;const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#fff6e0');gr.addColorStop(1,'#d8c8a8');g.fillStyle=gr;g.fillRect(x,0,128,128);
    g.fillStyle='#3a3026';g.fillRect(x,0,128,6);g.fillRect(x,122,128,6);g.fillRect(x,0,5,128);g.fillRect(x+123,0,5,128);
    if(k===0)for(const mx of [30,64,98]){g.fillStyle=['#b3202a','#24395e','#2f6b3a','#c28a2a'][Math.floor(R()*4)];g.fillRect(x+mx-12,38,24,44);g.fillStyle='#e8dcc8';g.beginPath();g.arc(x+mx,28,8,0,TAU);g.fill();g.fillStyle='#222';g.fillRect(x+mx-10,82,8,30);g.fillRect(x+mx+2,82,8,30);}
    else if(k===1)for(let r=0;r<3;r++){g.fillStyle='#8a6a48';g.fillRect(x+8,40+r*30,112,4);for(let s=0;s<4;s++){g.fillStyle=['#1d1d1d','#7a3b1f','#c9c2b0','#b3202a'][Math.floor(R()*4)];g.fillRect(x+14+s*27,28+r*30,20,11);}}
    else if(k===2){g.fillStyle='#8a6a48';g.fillRect(x+8,70,112,5);g.fillRect(x+8,104,112,5);for(let s=0;s<5;s++){g.fillStyle=['#d9a860','#7a4a22','#f2e2c0','#c43a3a'][Math.floor(R()*4)];g.beginPath();g.ellipse(x+20+s*22,62,9,7,0,0,TAU);g.fill();g.beginPath();g.ellipse(x+20+s*22,97,9,6,0,0,TAU);g.fill();}}
    else for(let s=0;s<6;s++){g.fillStyle=['#24395e','#b3202a','#e8c547','#2f6b3a','#6b2a5c'][Math.floor(R()*5)];g.fillRect(x+12+s*18,46+R()*20,14,40);g.fillStyle='#f4efe4';g.fillRect(x+14+s*18,56+R()*10,10,4);}
    g.fillStyle='rgba(255,255,255,0.18)';g.beginPath();g.moveTo(x+10,8);g.lineTo(x+50,8);g.lineTo(x+16,120);g.lineTo(x+8,120);g.fill();}},false);}
function altstWinCell(s){if(/shoe/.test(s.kind))return 1;if(s.cat===2||s.cat===12)return 0;if(s.cat===0||s.cat===3)return 2;return 3;}
function altstOnCarriageway(x,z){const n=nearestNode(x,z,true);if(n<0)return false;for(const e of NODES[n].e){const E=EDGES[e];if(!E.car)continue;const A=NODES[E.a],B=NODES[E.b];if(segDist(x,z,A.x,A.z,B.x,B.z).d<E.road.w/2+0.5)return true;}return false;}
function altstNearBleiche(x,z,d){for(const e of ALTST.blEdges){const E=EDGES[e];const A=NODES[E.a],B=NODES[E.b];if(segDist(x,z,A.x,A.z,B.x,B.z).d<d)return true;}return false;}
function altstBleichen(){const ed=[];let sx=0,sz=0;
  EDGES.forEach((E,i)=>{if(E.dead||!ALTST_BLEICHEN.has(E.road.name))return;const A=NODES[E.a],B=NODES[E.b];ed.push(i);sx+=(A.x+B.x)/2;sz+=(A.z+B.z)/2;});
  ALTST.blEdges=ed;if(!ed.length)return;ALTST.bl={x:sx/ed.length,z:sz/ed.length};
  const free=(x,z)=>{const i=idx(x,z);return i>=0&&!hgG(i)&&!(mfG(i)&4);};
  // Schaufenster neben den Ladentüren (ein Mesh, ein Atlas)
  const win=new GB(),rack=new GB(),shops=SHOPS.filter(s=>!s.inVenue&&Math.hypot(s.x-ALTST.bl.x,s.z-ALTST.bl.z)<ALTST.BL_R+80&&altstNearBleiche(s.x,s.z,22));
  for(const s of shops){if(ALTST.displays.length>=70)break;const tx=-s.nz,tz=s.nx,cell=altstWinCell(s),u0=cell/ALTST_WIN_CELLS,u1=(cell+1)/ALTST_WIN_CELLS;
    const hw=Math.min(0.95,(s.len/2-0.85)/2);if(hw<0.4)continue;// Schaufenster neben der Tür, nie über die Fassade hinaus
    for(const side of [-1,1]){const a=side*(0.85+hw),c=[s.x+tx*a+s.nx*0.06,s.z+tz*a+s.nz*0.06];const P=(l,y)=>[c[0]+tx*l,y,c[1]+tz*l];
      win.quadOut(P(-hw,0.55),P(hw,0.55),P(hw,2.55),P(-hw,2.55),[u0,0],[u1,0],[u1,1],[u0,1],WHITE,[c[0]-s.nx*2,1.5,c[1]-s.nz*2]);ALTST.displays.push({x:c[0],z:c[1],shop:s.name});}
    if(s.cat===2&&ALTST.racks.length<24){const x=s.x+s.nx*1.3+tx*-2.2,z=s.z+s.nz*1.3+tz*-2.2;if(free(x,z)&&!altstOnCarriageway(x,z)){const f=Math.atan2(-tz,tx);
      rack.beam([x-tx*0.6,0,z-tz*0.6],[x-tx*0.6,1.55,z-tz*0.6],0.04,0.04,{r:0.7,g:0.7,b:0.72});rack.beam([x+tx*0.6,0,z+tz*0.6],[x+tx*0.6,1.55,z+tz*0.6],0.04,0.04,{r:0.7,g:0.7,b:0.72});
      rack.beam([x-tx*0.62,1.52,z-tz*0.62],[x+tx*0.62,1.52,z+tz*0.62],0.04,0.04,{r:0.7,g:0.7,b:0.72});const R=mulberry32(ALTST.racks.length+9);
      for(let k=0;k<6;k++){const l=-0.5+k*0.2;const col=new THREE.Color([0xb3202a,0x24395e,0x2f6b3a,0xe8c547,0xf2f0ea,0x6b2a5c,0x1d1d1d][Math.floor(R()*7)]);rack.box(x+tx*l,0.72,z+tz*l,0.06,0.75,0.5,f,col,1);}
      rasterCirc(HG,x,z,0.45,2);ALTST.racks.push({x,z});}}}
  if(!win.empty){const t=freeAfterUpload(altstWindowTex());const m=new THREE.Mesh(win.geo(),nightMat(stdMat({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:0.15,roughness:0.25,polygonOffset:true,polygonOffsetFactor:-2}),1.2));altstAdd(staticMesh(m));}
  if(!rack.empty){const m=new THREE.Mesh(rack.geo(),stdMat({vertexColors:true,roughness:0.8}));m.castShadow=true;altstAdd(staticMesh(m));}
  // Fahrradbügel am Gehweg, an manchen lehnt ein Rad
  const stands=[],bikes=[];for(const e of ed){const E=EDGES[e];if(E.len<14)continue;const A=NODES[E.a],B=NODES[E.b];const d=[(B.x-A.x)/E.len,(B.z-A.z)/E.len],n=[-d[1],d[0]];
    const off=E.road.w/2+Math.max(1.2,E.road.sw*0.6);let k=0;for(let t=7;t<E.len-5&&stands.length<48;t+=24,k++){const s=k%2?1:-1;const x=A.x+d[0]*t+n[0]*off*s,z=A.z+d[1]*t+n[1]*off*s;
      if(!free(x,z)||stands.some(o=>Math.hypot(o.x-x,o.z-z)<6))continue;const o={x,z,face:Math.atan2(d[0],d[1])+Math.PI/2};stands.push(o);if((stands.length*7)%5<2)bikes.push(o);rasterCirc(HG,x,z,0.35,1);}}
  ALTST.stands=stands;
  const sg=new GB(),bg=new GB(),steel={r:0.62,g:0.64,b:0.66};sg.beam([0,0,-0.35],[0,0.78,-0.35],0.05,0.05,steel);sg.beam([0,0,0.35],[0,0.78,0.35],0.05,0.05,steel);sg.beam([0,0.78,-0.37],[0,0.78,0.37],0.05,0.05,steel);
  const fr={r:0.15,g:0.3,b:0.55},tire={r:0.08,g:0.08,b:0.09};for(const cz of [-0.52,0.52])for(let k=0;k<10;k++){const a=k/10*TAU,b2=(k+1)/10*TAU;bg.beam([0.12,0.33+Math.sin(a)*0.32,cz+Math.cos(a)*0.32],[0.12,0.33+Math.sin(b2)*0.32,cz+Math.cos(b2)*0.32],0.04,0.04,tire);}
  for(const [p,q] of [[[0.12,0.33,-0.52],[0.12,0.62,-0.05]],[[0.12,0.33,-0.52],[0.12,0.33,0]],[[0.12,0.33,0],[0.12,0.62,-0.05]],[[0.12,0.33,0],[0.12,0.68,0.42]],[[0.12,0.62,-0.05],[0.12,0.68,0.42]],[[0.12,0.68,0.42],[0.12,0.33,0.52]],[[0.12,0.62,-0.05],[0.12,0.82,-0.12]],[[0.12,0.68,0.42],[0.12,0.92,0.36]]])bg.beam(p,q,0.035,0.035,fr);
  bg.box(0.12,0.82,-0.14,0.1,0.04,0.24,0,tire,1);bg.beam([-0.12,0.92,0.36],[0.36,0.92,0.36],0.03,0.03,tire);
  const mat=stdMat({vertexColors:true,roughness:0.5,metalness:0.4});for(const [g,l] of [[sg,stands],[bg,bikes]]){const m=instGeo(g.geo(),mat,l);if(m){scene.remove(m);altstAdd(staticInst(m));}}}

// Mehr Passanten auf den Bleichen: ein Teil der regulären Spawns landet auf Bleichen-Kanten (gleiches Budget wie überall)
function altstInBleichen(x,z){return ALTST.on&&ALTST.bl&&Math.hypot(x-ALTST.bl.x,z-ALTST.bl.z)<ALTST.BL_R;}
function altstPickEdge(px,pz,rmin,rmax){const L=ALTST.blEdges;const hi=Math.min(rmax,ALTST.BL_NEAR),lo=Math.min(rmin,25);
  for(let k=0;k<24;k++){const e=L[(Math.random()*L.length)|0];const E=EDGES[e];if(E.dead)continue;const A=NODES[E.a],B=NODES[E.b];const d=Math.hypot((A.x+B.x)/2-px,(A.z+B.z)/2-pz);if(d>=lo&&d<=hi)return e;}return -1;}
let ALTST_PICK=null;
const _altstRandomEdgeNear=randomEdgeNear;
randomEdgeNear=function(px,pz,rmin,rmax,carOnly){if(ALTST_PICK&&!carOnly){const e=altstPickEdge(px,pz,rmin,rmax);if(e>=0){ALTST_PICK.hit=true;return e;}}return _altstRandomEdgeNear(px,pz,rmin,rmax,carOnly);};
let ALTST_BAG=null;
function altstGiveBag(h){if(!ALTST_BAG)ALTST_BAG={geo:new THREE.BoxGeometry(0.3,0.36,0.11).translate(0,-0.2,0),handle:new THREE.BoxGeometry(0.2,0.02,0.02).translate(0,0.0,0),cols:[0xc9a46a,0xf2f0ea,0x1d3557,0xb3202a,0x2f6b3a]};
  const g=new THREE.Group();g.position.set(0.02,-0.66,0.04);g.add(new THREE.Mesh(ALTST_BAG.geo,cmat(mpick(ALTST_BAG.cols),0.9)));g.add(new THREE.Mesh(ALTST_BAG.handle,cmat(0x222222,0.6)));h.armR.add(g);h.altstBag=g;ALTST.shoppers.push(h);}
const _altstSpawnPed=spawnPed;
spawnPed=function(px,pz,rmin,rmax){if(!altstInBleichen(px,pz)||!ALTST.blEdges.length||Math.random()>=ALTST.BIAS)return _altstSpawnPed(px,pz,rmin,rmax);
  const n=HUMANS.length;ALTST_PICK={hit:false};try{_altstSpawnPed(px,pz,rmin,rmax);}finally{const hit=ALTST_PICK.hit;ALTST_PICK=null;if(hit&&HUMANS.length>n){const h=HUMANS[HUMANS.length-1];if(h.kind==='ped'&&!h.removed){h.walkSpeed*=0.85;if(Math.random()<0.7)altstGiveBag(h);}}}};

// ---------- Weinstube in der Augustinerstraße ----------
const ALTST_WS_NAME='Weinstubb „Zum Dubbeglas“';
const ALTST_STAMM=[
  {who:'Schorsch (Stammgast)',lines:['Ei gude wie!','Prost, ihr Leut!','Des is mei Stuhl. Seit 1979.'],conv:{o:'Ei gude wie? Hock disch hie – awwer net uff de Stuhl vum Heinz, der is heilisch!',m:'smile',c:[
    ['Wo is dann de Heinz?','Der is seit Rosemondaach uffem Klo. Mer warte noch.','laugh'],
    ['Ich hock mich, wo ich will.','Uiuiui. Des gibt Ärscher mit de Hannelore.','surprised'],
    ['En Schoppe für alle! (6 €)','Jetzt schwätzte wie en echte Meenzer! Prost!','laugh',{money:-6,drink:true}]]}},
  {who:'Hannelore (Stammgast)',lines:['Ich sach nur: Wiesbade!','Des war früher alles Weinberg.','Kinner, wie die Zeit vergeht.'],conv:{o:'Kenne Se de Unnerschied zwische Meenz un Wiesbade? Mir hawwe de Dom – die hawwe nur Parkplätz.',m:'smug',c:[
    ['Hahaha!','Gell! Ich mach des seit fuffzich Johr Fassenacht.','laugh'],
    ['Ich bin aus Wiesbaden.','… Ei, des macht nix. Jeder hot sei Kreuz zu trage.','cringe'],
    ['Der war schlecht.','Schlecht? Der hot im Saal drei Minute Applaus kriggt!','angry']]}},
  {who:'Rudi (Stammgast)',lines:['Weck, Worscht un Woi!','Noch e Worscht, Elfriede!','Senf? Immer!'],conv:{o:'Weck, Worscht un Woi – mehr brauch de Mensch net. Gut, vielleicht noch e bissi Senf.',m:'smile',c:[
    ['Un Spundekäs!','Ganz genau! Du bist jo gar net so domm, wie de aussiehst.','smile'],
    ['Ich ess vegan.','De Woi is vegan. De Weck aach. Die Worscht … lasse mer weg.','surprised'],
    ['Gibb mer dei Worscht. (3 €)','Fer drei Euro? Na gut. Awwer de Senf bleibt bei mir.','smug',{money:-3,heal:20}]]}},
  {who:'Fritz (Stammgast)',lines:['Helau!','Elf Uhr elf, do geht’s los!','Ritsch, ratsch, Narrekapp!'],conv:{o:'Am Elfte Elfte, elf Uhr elf, geht’s los – un bis Aschermittwoch bin isch net zu spreche.',m:'laugh',c:[
    ['Helau!','HELAU! Endlich emol aaner mit Kultur.','laugh'],
    ['Alaaf!','… Raus. Des sacht mer hier net. Des is Kölle.','angry',{leave:'angry'}],
    ['Was is Fassenacht?','Ach Gott … Hannelore, gebb dem Kind emol e Programmheft.','cringe']]}}];
// Die Sichtbarkeits-Schleife in update() blendet drinnen alle Figuren aus (INDOOR) – Gäste der Weinstube bleiben im Raum sichtbar
function altstIndoorVisible(h,r){Object.defineProperty(h.g,'visible',{configurable:true,get:()=>INDOOR===r&&!h.removed,set(){}});}
function altstSitPose(h){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;h.armL.rotation.x=-0.45;h.armR.rotation.x=-0.45;}
function altstSitter(h){h.altstSit=true;altstSitPose(h);ALTST.sitters.push(h);return h;}
const ALTST_WS={id:'altst_weinstube',name:ALTST_WS_NAME,sub:'Augustinerstraße · Schoppe, Weck un Worscht',W:12,D:16,H:4.2,wall:0xd9c3a0,ceil:0x6b4a30,hemiI:0.5,exp:1.0,lampI:20,lampD:14,
  lights:[[0,3.5,-4],[0,3.5,3],[-3,3.4,-2],[3.5,3.4,-6]],wp:[[0,4],[1,0],[0,-4],[2,2]],
  spawn:[0,6.6,Math.PI],exits:[{x:0,z:7.75,w:1.2,d:0.6,to:'door'}],
  hints:[{x:3.5,z:-5.3,r:1.6,t:'<b>F</b>: Weck, Worscht un Woi bestelle (5 €)'},{x:-3,z:-2,r:2.6,t:'De Meenzer Stammtisch – mit <b>E</b> aaschwätze.'}],
  floorMat:stdMat({color:0x6e4a2e,roughness:0.75}),
  build(r,B){const W=12,D=16;
    for(const [x,z,w,d] of [[0,-D/2+0.25,W,0.1],[0,D/2-0.25,W,0.1],[-W/2+0.25,0,0.1,D],[W/2-0.25,0,0.1,D]])B.box('wood',x,0,z,w,1.15,d,0x5a3a22);// Holzvertäfelung
    for(let z=-7;z<=7;z+=2)B.box('wood',0,3.85,z,W,0.3,0.28,0x4a2c1a);// Deckenbalken
    // Theke, Regal mit Flaschen, Fässer
    B.sbox('wood',3.5,0,-6.1,4.4,1.1,0.8,0x5a3a22);B.box('wood',3.5,1.1,-6.1,4.6,0.06,0.95,0x3a2512);
    for(const y of [1.45,2.15])B.box('wood',3.5,y,-7.55,4.4,0.05,0.35,0x4a2c1a);
    for(let k=0;k<16;k++)B.box('glass',1.55+k*0.26,k%2?1.5:2.2,-7.55,0.08,0.34,0.08,k%3?0x2f5a2a:0x7a3b1f);
    const bar=new THREE.CylinderGeometry(0.45,0.45,0.9,14).rotateZ(Math.PI/2);const bm=stdMat({color:0x7a4a26,roughness:0.8});
    for(const [x,y] of [[-4.2,0.5],[-3.2,0.5],[-3.7,1.3]]){const m=new THREE.Mesh(bar,bm);m.rotation.y=Math.PI/2;m.position.set(x,y,-7.2);r.grp.add(m);}B.solid(-3.7,-7.2,2.4,1.2);
    // Stammtisch (rund) mit Schild, Schoppegläsern, Weck un Worscht
    const tab=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,0.07,20),stdMat({color:0x5a3a22,roughness:0.6}));tab.position.set(-3,0.74,-2);r.grp.add(tab);B.box('wood',-3,0,-2,0.18,0.74,0.18,0x3a2512);B.solid(-3,-2,1.6,1.6);
    const sign=B.plane(textTex('STAMMTISCH',{w:256,h:64,bg:'#3a2512',fg:'#f2d7a8',font:'700 40px "Barlow Condensed", Arial Narrow, sans-serif'}),-3,1.3,-2,0.62,0.16,0);sign.material.side=THREE.DoubleSide;B.box('metal',-3,0.78,-2,0.03,0.45,0.03,0x222222);
    for(let k=0;k<4;k++){const a=k/4*TAU+Math.PI/4;const x=-3+Math.cos(a)*0.62,z=-2+Math.sin(a)*0.62;B.box('glass',x,0.78,z,0.09,0.15,0.09,0xe6d27c);
      const px=-3+Math.cos(a+0.45)*0.55,pz=-2+Math.sin(a+0.45)*0.55;B.box('stone',px,0.78,pz,0.26,0.02,0.26,0xf2f2ee);B.box('cloth',px,0.8,pz,0.2,0.06,0.06,0x9a4a3a,a);B.box('sand',px+0.05,0.8,pz+0.06,0.1,0.07,0.08,0xd9a860);B.box('glow',px-0.08,0.81,pz-0.06,0.05,0.02,0.05,0xe8c020);
      B.box('wood',-3+Math.cos(a)*1.3,0,-2+Math.sin(a)*1.3,0.45,0.45,0.45,0x4a2c1a);}
    // kleine Tische
    for(const [x,z] of [[3,1],[3,4.5],[-3.5,3.5]]){B.sbox('wood',x,0,z,0.9,0.74,0.9,0x5a3a22);B.box('glass',x+0.2,0.74,z,0.09,0.15,0.09,0xe6d27c);for(const s of [-1,1])B.box('wood',x+s*0.85,0,z,0.42,0.45,0.42,0x4a2c1a);}
    // Fenster, Fassenacht-Wimpel, Bild
    for(const z of [-4,0,4]){B.box('glow',-5.92,1.3,z,0.04,1.4,1.3,0xffe9b8);B.box('wood',-5.88,1.95,z,0.06,0.06,1.3,0x3a2512);B.box('wood',-5.88,1.3,z,0.06,1.4,0.06,0x3a2512);}
    const fc=[0xc8102e,0xf2f2f2,0x1d4e89,0xf2c500];for(let k=0;k<22;k++)B.box('cloth',-5.5+k*0.5,3.45,-1+Math.sin(k*0.6)*0.2,0.3,0.32,0.02,fc[k%4]);
    B.plane(textTex('Meenz · Helau!',{w:512,h:128,bg:'#f2e6c8',fg:'#7a1f1f',border:'#3a2512'}),0,2.2,-7.68,2.4,0.6,0);
    for(const [x,z] of [[0,-4],[0,3],[-3,-2],[3.5,-6]])B.box('glow',x,3.55,z,0.5,0.18,0.5,0xffd9a0);
    B.box('wood',0,0,7.82,1.4,2.3,0.14,0x3a2512);
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W,D).rotateX(Math.PI/2),stdMat({color:0x6b4a30,roughness:0.85}));ceil.position.y=4.18;r.grp.add(ceil);},// die Raum-Decke ist nur von oben sichtbar
  npcs(r){const wirt=vPerson(r,3.5,-7.0,0,{role:'stand',lines:['Noch en Schoppe?','Weck, Worscht un Woi – fünf Euro, wie immer.','Bei mir gibt’s kaa Cola. Des is e Weinstubb!','Die Gläser sin noch vun meiner Oma.']});wirt.npcName='Elfriede (Wirtin)';
    ALTST_STAMM.forEach((s,k)=>{const a=k/4*TAU+Math.PI/4;const x=-3+Math.cos(a)*1.3,z=-2+Math.sin(a)*1.3;const h=vPerson(r,x,z,Math.atan2(-3-x,-2-z),{pose:'sit',lines:s.lines});h.npcName=s.who;h.altstConv=s.conv;h.altstStamm=true;altstSitter(h);});
    for(const [x,z,f] of [[3.85,1,-Math.PI/2],[2.15,4.5,Math.PI/2]])altstSitter(vPerson(r,x,z,f,{pose:'sit',lines:['Mmh, de Riesling is gut heut.','Noch eins, dann geh ich. Ehrlich.','Prost!']}));
    vPerson(r,1.6,-5.2,Math.PI,{role:'stand',lines:['Ich wart nur uff mein Schoppe.','Die Elfriede is die Beste.']});
    for(const h of r.people)altstIndoorVisible(h,r);},
  interact(P,r){const h=P.h;const lx=h.x-r.ox,lz=h.z-r.oz;if(Math.abs(lx-3.5)>2.6||lz>-4.2)return;
    if(G.money<5){hint('Fünf Euro hoste net? Dann gibt’s nur Leitungswasser.',2.5,P);return;}G.money-=5;h.health=Math.min(100,h.health+30);drinkAdd(P);ALTST.orders=(ALTST.orders||0)+1;
    hint('<b>Weck, Worscht un Woi</b> – Ei gude! (–5 €)',2.5,P);const w=r.people.find(o=>o.npcName==='Elfriede (Wirtin)');if(w&&w.alive)say(w,mpick(['Wohl bekomm’s!','Lass der’s schmecke!','Un de Senf is umsonst.']),2.5);},
  update(r,dt,P){r.altstT=(r.altstT||0)-dt;if(r.altstT<=0){r.altstT=mr(9,16);const s=r.people.filter(o=>o.altstStamm&&o.alive&&!o.bubble&&o.state==='venue');if(s.length)say(mpick(s),mpick(['Prost!','Zum Wohl, die Pfalz – äh, Rheinhesse!','Noch e Runde!','Helau!']),2.6);}}};
VENUES.push(ALTST_WS);
const _altstStartTalk=startTalk;
startTalk=function(P,npc){if(npc&&npc.altstConv&&!npc.forceConv)npc.forceConv=npc.altstConv;return _altstStartTalk(P,npc);};

// Tür: Hausfront an der Augustinerstraße ohne Ladentür in der Nähe, möglichst mittig in der Straße
function altstWeinstubeDoor(){const want=[45,207];const cands=[];
  for(const r of ROADS){if(r.name!=='Augustinerstraße')continue;for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1)continue;const d=[(b[0]-a[0])/L,(b[1]-a[1])/L],n=[-d[1],d[0]];
    for(let t=1.5;t<L-1;t+=3)for(const s of [-1,1]){const px=a[0]+d[0]*t,pz=a[1]+d[1]*t;const D=rayDoor(px,pz,px+n[0]*s*12,pz+n[1]*s*12,0.25);const dd=Math.hypot(D[0]-px,D[1]-pz);
      if(dd<1||dd>8)continue;if(SHOPS.some(o=>Math.hypot(o.doorX-D[0],o.doorZ-D[1])<5))continue;cands.push([D,Math.hypot(D[0]-want[0],D[1]-want[1])]);}}}
  cands.sort((p,q)=>p[1]-q[1]);return cands.length?cands[0][0]:rayDoor(want[0],want[1],want[0]+8,want[1]-8);}
function altstWeinstubeSign(d){const fx=Math.sin(d[2]),fz=Math.cos(d[2]),tx=fz,tz=-fx;const x=d[0]+tx*1.3-fx*0.6,z=d[1]+tz*1.3-fz*0.6;const G=new GB();const iron={r:0.1,g:0.1,b:0.11};
  G.beam([x,3.3,z],[x+fx*1.1,3.3,z+fz*1.1],0.05,0.05,iron);G.box(x+fx*0.75,2.7,z+fz*0.75,0.08,0.5,0.04,d[2]+Math.PI/2,iron,1);
  for(let k=0;k<6;k++)G.box(x+fx*(0.62+(k%3)*0.09),2.15-Math.floor(k/3)*0.1,z+fz*(0.62+(k%3)*0.09),0.08,0.08,0.08,0,{r:0.35,g:0.08,b:0.25},1);// Traube
  const m=new THREE.Mesh(G.geo(),stdMat({vertexColors:true,roughness:0.6}));altstAdd(staticMesh(m));
  const t=freeAfterUpload(textTex(ALTST_WS_NAME,{w:512,h:96,bg:'#5a1f2a',fg:'#f6e2b8',font:'700 44px "Barlow Condensed", Arial Narrow, sans-serif',border:'#d4af37'}));
  const pm=new THREE.Mesh(new THREE.PlaneGeometry(1.0,0.2),stdMat({map:t,side:THREE.DoubleSide,roughness:0.6}));pm.position.set(x+fx*0.75,3.05,z+fz*0.75);pm.rotation.y=d[2]+Math.PI/2;altstAdd(pm);}

// ---------- Straßenszenen (erscheinen nur in der Nähe – spart Draw-Calls und Speicher) ----------
let ALTST_PROP=null;
function altstProps(){if(ALTST_PROP)return ALTST_PROP;return ALTST_PROP={cap:new THREE.ConeGeometry(0.15,0.34,10).translate(0,0.27,0).rotateZ(-0.35),bell:new THREE.SphereGeometry(0.035,8,6).translate(-0.13,0.43,0),
  ruff:new THREE.TorusGeometry(0.11,0.035,6,14).rotateX(Math.PI/2),glass:new THREE.CylinderGeometry(0.035,0.03,0.12,8),barrel:new THREE.CylinderGeometry(0.42,0.42,1.0,14).translate(0,0.5,0)};}
function altstGlass(h){const m=new THREE.Mesh(altstProps().glass,cmat(0xe6d27c,0.15));m.position.set(0,-0.62,0.06);h.armR.add(m);h.altstGlass=m;}
const ALTST_SCENE_DEFS={
  fastnacht:{n:3,lines:['Helau! Un nochemol vun vorn!','Ritsch, ratsch – wer hot mei Narrekapp?','Schunkele, Leut, schunkele!','Mer üwe fer die Sitzung!','Am Rosemondaach steh ich ganz vorne!','Ei, des Kostüm is noch vun meim Vadder.'],
    who:['Gardist Ewald (Fastnachter)','Gisela (Fastnachterin)','Bubi (Fastnachter)'],
    dress(h,k){const P=altstProps();const cols=[0xc8102e,0x1d4e89,0xf2c500];const c=new THREE.Mesh(P.cap,cmat(cols[k%3],0.7));c.position.set(0,0.83,0);h.hips.add(c);const b=new THREE.Mesh(P.bell,cmat(0xd4af37,0.3));b.position.set(0,0.83,0);h.hips.add(b);
      const r=new THREE.Mesh(P.ruff,cmat(0xf2f2f2,0.9));r.position.set(0,0.63,0);h.hips.add(r);},
    anim(h,k,t){h.g.rotation.z=Math.sin(t*2.2)*0.1;h.armL.rotation.z=0.35;h.armR.rotation.z=-0.35;h.armL.rotation.x=-0.2;h.armR.rotation.x=-0.2;}},
  weinprobe:{n:3,lines:['Des is en Silvaner aus Rheinhesse – riech emol, des is Sommer im Glas!','Ich schmeck … Holz. Un Hoffnung.','Noch e Schlückche – fer die Wissenschaft!','Spucke? Ei, des wär ja Verschwendung!','Mineralisch, sacht die Fraa. Ich sach: lecker.'],
    who:['Winzerin Anneliese','Herr Hebestreit (Weinprobe)','Frau Kuhnert (Weinprobe)'],
    dress(h,k){altstGlass(h);},anim(h,k,t){if(k)h.armR.rotation.x=-0.9-Math.max(0,Math.sin(t*0.9+k))*0.6;else h.armR.rotation.x=-0.9;}},
  stammtisch:{n:3,sit:true,lines:['Guck emol, de Dom – steht immer noch.','Noch e Schoppe, Gerda!','Früher war mehr Lametta. Un billischer Woi.','Vun hier sieht mer de Dom am schönste.','Mer sin de Stammtisch vum Leichhof, seit 1972.'],
    who:['Gerda (Stammtisch)','Willi (Stammtisch)','Karl-Heinz (Stammtisch)'],
    dress(h,k){altstGlass(h);},anim(h,k,t){h.armR.rotation.x=-0.55-Math.max(0,Math.sin(t*0.7+k*2))*0.9;}}};
// Szenen-Leute ersetzen ferne Passanten, damit das Passanten-Budget gleich bleibt
function altstMakeRoom(n,px,pz){const far=HUMANS.filter(h=>h.kind==='ped'&&h.alive&&h.state==='walk'&&!h.mission&&!h.room&&!h.keeper&&!h.inCar&&Math.hypot(h.x-px,h.z-pz)>60)
    .sort((a,b)=>Math.hypot(b.x-px,b.z-pz)-Math.hypot(a.x-px,a.z-pz));for(const h of far.slice(0,n))h.remove();}
function altstScene(key,x,z,face){const s={key,x,z,face,people:[],active:false,sayT:mr(2,5),t:0};ALTST.scenes.push(s);return s;}
function altstSpawnScene(s){const D=ALTST_SCENE_DEFS[s.key];s.people=[];s.active=true;
  for(let k=0;k<D.n;k++){let x,z,f;
    if(D.sit){const T=ALTST.cafe.length?ALTST.cafe[0]:{x:s.x,z:s.z,face:s.face};const a=T.face+Math.PI+(k-1)*0.9;x=T.x+Math.sin(a)*0.85;z=T.z+Math.cos(a)*0.85;f=Math.atan2(T.x-x,T.z-z);}
    else{const a=k/D.n*TAU+s.face;[x,z]=freeSpot(s.x+Math.sin(a)*1.1,s.z+Math.cos(a)*1.1,0.3);f=Math.atan2(s.x-x,s.z-z);}
    const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.facing=f;h.state='wait';h.walkSpeed=0;h.npcName=D.who[k];h.altstScene=s;if(s.key==='stammtisch')h.altstConv=mpick(ALTST_STAMM).conv;
    D.dress(h,k);if(D.sit)altstSitter(h);h.sync();s.people.push(h);}
  if(s.key==='weinprobe'&&!s.barrel){const m=new THREE.Mesh(altstProps().barrel,stdMat({color:0x7a4a26,roughness:0.8}));m.position.set(s.x,groundY(s.x,s.z),s.z);s.barrel=altstAdd(m);}}
function altstDespawnScene(s){for(const h of s.people)if(!h.removed&&h.altstScene===s&&(h.state==='wait'||h.state==='talk')){if(TALK&&TALK.npc===h)endTalk();h.remove();}s.people=[];s.active=false;}
function altstUpdateScene(s,dt,px,pz){const d=Math.hypot(s.x-px,s.z-pz);
  if(!s.active){if(ALTST.on&&ALTST.scenesOn&&d<ALTST.SCENE_ON){altstMakeRoom(ALTST_SCENE_DEFS[s.key].n,px,pz);altstSpawnScene(s);}return;}
  if(!ALTST.on||!ALTST.scenesOn||d>ALTST.SCENE_OFF){altstDespawnScene(s);return;}
  const D=ALTST_SCENE_DEFS[s.key];s.t+=dt;
  // Wer erschreckt wegläuft oder umgefahren wurde, gehört nicht mehr zur Szene
  s.people=s.people.filter(h=>{const ok=!h.removed&&h.alive&&(h.state==='wait'||h.state==='talk');if(!ok){h.altstScene=null;h.altstSit=false;h.g.rotation.z=0;}return ok;});
  s.people.forEach((h,k)=>{if(h.state==='wait')D.anim(h,k,s.t);});
  s.sayT-=dt;if(s.sayT<=0&&d<28){s.sayT=mr(4,8);const o=s.people.filter(h=>h.state==='wait'&&!h.bubble);if(o.length)say(mpick(o),mpick(D.lines),3.4);}}

// ---------- Schnellreise: Ziele im Altstadt-Abschnitt (keine „besonderen Orte“) ----------
const _altstFtSpecials=ftSpecials;
ftSpecials=function(){const S=_altstFtSpecials();for(const d of ALTST.ft)S.push({n:d.n,g:'Altstadt',x:d.x,z:d.z});return S;};

// ---------- Aufbau ----------
function setupAltst(){if(window.__ALTST_SKIP)return;// Vergleichslauf fürs Speicherbudget: tests/test_altst.py mem skip
  const kg=altstKgZone();ALTST.kg={x:kg.c[0],z:kg.c[1]};
  altstFachwerkBeams();altstFountain();altstCobble(kg.poly);
  altstCafe();if(ALTST.lh)altstCobble(ALTST.lh.poly);
  altstBleichen();
  // Weinstube
  const d=altstWeinstubeDoor();ALTST_WS.door=d;ALTST.weinstube={venue:ALTST_WS,door:d};altstWeinstubeSign(d);
  if(VEN_PLACED&&!ALTST_WS.labeled){ALTST_WS.labeled=true;label(ALTST_WS.name+' (begehbar)',d[0],d[1],'small');}
  const fx=Math.sin(d[2]),fz=Math.cos(d[2]);
  // Szenen
  {const f=ALTST.fountain||ALTST.kg;altstScene('fastnacht',f.x+3.2,f.z+2.2,0);}
  {const tx=fz,tz=-fx;altstScene('weinprobe',d[0]+fx*2.6+tx*3.5,d[1]+fz*2.6+tz*3.5,0);}
  if(ALTST.cafe.length){const T=ALTST.cafe[0];altstScene('stammtisch',T.x,T.z,T.face);}
  // Schnellreise
  const kgs=ALTST.fountain?freeSpot(ALTST.fountain.x+3.5,ALTST.fountain.z,0.5):freeSpot(ALTST.kg.x,ALTST.kg.z,0.5);
  ALTST.ft=[{n:'Kirschgarten (Fachwerk)',x:kgs[0],z:kgs[1]},{n:ALTST_WS_NAME+' – Augustinerstraße',x:d[0]+fx*1.5,z:d[1]+fz*1.5}];
  if(ALTST.lh){const p=freeSpot(ALTST.lh.x,ALTST.lh.z,0.5);ALTST.ft.push({n:'Leichhof (Domblick)',x:p[0],z:p[1]});}
  if(ALTST.bl){let best=null,bd=1e9;for(const e of ALTST.blEdges)for(const n of [EDGES[e].a,EDGES[e].b]){const N=NODES[n],d=Math.hypot(N.x-ALTST.bl.x,N.z-ALTST.bl.z);if(d<bd){bd=d;best=N;}}
    ALTST.ft.push({n:'Bleichenviertel – Einkaufsstraßen',x:best.x,z:best.z});}}

let ALTST_T=0,ALTST_DOMHINT=0;
function updateAltst(dt){if(mode!=='play')return;
  for(let i=ALTST.sitters.length-1;i>=0;i--){const h=ALTST.sitters[i];if(h.removed||!h.alive||!h.altstSit){ALTST.sitters.splice(i,1);continue;}altstSitPose(h);}
  for(let i=ALTST.shoppers.length-1;i>=0;i--)if(ALTST.shoppers[i].removed)ALTST.shoppers.splice(i,1);
  for(const m of ALTST.meshes)if(m.visible!==ALTST.on&&!LOWMEM)m.visible=ALTST.on;
  const P=P1;if(!P.h)return;const [px,pz]=ppos(P);
  for(const s of ALTST.scenes)altstUpdateScene(s,dt,px,pz);
  ALTST_T-=dt;ALTST_DOMHINT-=dt;if(ALTST_T>0)return;ALTST_T=0.5;
  if(ALTST.on&&ALTST.lh&&!P.car&&!P.h.room&&ALTST_DOMHINT<=0&&pip(P.h.x,P.h.z,ALTST.lh.poly)){ALTST_DOMHINT=40;hint('<b>Leichhof</b> · Domblick: Vun hier gucke die Domtürm üwwer die Dächer.',3,P);}}
// Test-Hooks: Bevölkerung neu verteilen, Draw-Calls eines Bilds zählen (Haupt-Pass + Schatten + Post)
ALTST.populate=()=>managePopulation(0,true);
ALTST.pedCap=()=>Q.peds*(G.split?1.3:1);
ALTST.drawCalls=()=>{const I=renderer.info;I.autoReset=false;I.reset();renderFrame();const n=I.render.calls;I.autoReset=true;return n;};
