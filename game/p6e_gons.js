// ===================== 38 Detail: Gonsenheim + Gonsbachterrassen (Mainz) =====================
// Ortskern Alt-Gonsenheim (Turmhelm St. Stephan, Dorfbrunnen, Bank-Babbler), dichter Lennebergwald (instanziert, eigene
// Distanz-LOD, Jogger + Hundegassi), Gonsbach im Gonsbachtal (Bach, Stege, Bänke), Gonsenheimer Kerb auf dem Juxplatz
// (Zeitfenster, Buden, Karussell, Kerbebaum, Kerbespruch, Blasmusik per WebAudio) mit begehbarem Kerbezelt.
// Kartendaten © OpenStreetMap-Mitwirkende (ODbL): Talachse „Gonsbachtal“ (natural=valley, Weg 804221470), Juxplatz,
// Lennebergwald, St. Stephan.
const GONS={
  kerb:{on:false,built:false,from:15*60,to:23*60,stalls:[],closed:[],carousel:null,tree:null,podium:null,grp:null,boxes:[],circles:[],bb:null,
    frame:null,speech:{i:0,t:0,pause:0,said:0},greeted:false},
  wald:{trees:0,cells:[],paths:[],walkers:[],bb:null,visibleMeshes:0,meshes:0},
  bach:{len:0,water:0,benches:[],bridges:[],mesh:null},
  ort:{church:null,fountain:null,benches:[]},
  scenes:[],ft:[],shoes:null,convs:null,tent:null,music:{mode:null,vol:0,notes:0},stats:{},lodT:0,sceneT:0};
const GONS_LINE=[[-4673.2,61.1],[-4612.5,39.0],[-4605.3,31.4],[-4591.7,22.5],[-4500.0,9.3],[-4489.9,2.8],[-4478.7,-6.1],[-4461.2,-21.5],[-4448.0,-30.0],[-4434.1,-33.4],
  [-4416.8,-35.5],[-4294.9,-84.5],[-4047.7,-155.0],[-3863.2,-155.8],[-3675.6,-202.3],[-3509.0,-230.2],[-3458.6,-223.1],[-3430.8,-225.3],[-3329.3,-243.6],[-3244.8,-278.3],
  [-3181.1,-319.2],[-3117.0,-351.7],[-3016.7,-425.3],[-2922.2,-530.6],[-2829.1,-695.6],[-2725.3,-928.7],[-2666.4,-1051.0],[-2626.1,-1195.0],[-2698.9,-1450.5],[-2678.0,-1630.9],[-2577.2,-1801.3]];
let GONS_MATS=null;
function gonsMats(){if(GONS_MATS)return GONS_MATS;const vc=(r,m=0)=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:r,metalness:m});
  return GONS_MATS={cloth:vc(0.92),wood:vc(0.75),stone:vc(0.85),metal:vc(0.38,0.6),glow:new THREE.MeshBasicMaterial({vertexColors:true}),
    water:stdMat({color:0x3d6c78,roughness:0.06,metalness:0.15}),bank:stdMat({color:0x5a4a36,roughness:0.95})};}
// GB-Sammler je Material → Meshes (ein Draw-Call je Material)
function gonsGBs(){const o={};return {get:k=>o[k]||(o[k]=new GB()),meshes(par,mats,cast=true){const out=[];for(const k in o){if(o[k].empty)continue;const m=new THREE.Mesh(o[k].geo(),mats[k]);m.castShadow=cast&&k!=='glow';m.receiveShadow=true;par.add(m);out.push(m);}return out;}};}
const gonsCol=h=>C3(h);
function gonsDist(P,x,z){const [px,pz]=ppos(P);return Math.hypot(px-x,pz-z);}
function gonsNearest(x,z){let d=1e9;for(const P of PLAYERS)if(P.h)d=Math.min(d,gonsDist(P,x,z));return d;}
function gonsFree(x,z){const i=idx(x,z);return i>=0&&hgG(i)===0&&!(mfG(i)&6);}

// ===================== LENNEBERGWALD: dichter Wald, instanziert, Distanz-LOD =====================
// Dicht nur am Gonsenheimer Waldrand (Kreis um einen Punkt 350 m im Wald), sonst reicht der normale OSM-Baumbestand
function gonsBuildForest(){const W=GONS.wald;const rings=AREAS.filter(a=>a.kind==='forest'&&a.name==='Lennebergwald').map(a=>a.poly);if(!rings.length)return;
  const ref=GONS.kerb.frame?[GONS.kerb.frame.cx,GONS.kerb.frame.cz]:[-4960,-240];let edge=null,ed=1e9;for(const P of rings)for(const p of P){const d=Math.hypot(p[0]-ref[0],p[1]-ref[1]);if(d<ed){ed=d;edge=p;}}
  const RAD=W.RAD=600,cx=edge[0]-350,cz=edge[1];W.c=[cx,cz];const inF=(x,z)=>Math.hypot(x-cx,z-cz)<RAD&&rings.some(P=>pip(x,z,P));W.inForest=inF;
  const bb=[cx-RAD,cz-RAD,cx+RAD,cz+RAD];W.bb=bb;
  // Wege im Wald: Bäume halten Abstand, Spaziergänger laufen darauf
  const SEG=new Map(),sk=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16);
  for(const r of ROADS){const pts=r.pts;if(!pts.some(p=>p[0]>bb[0]-10&&p[0]<bb[2]+10&&p[1]>bb[1]-10&&p[1]<bb[3]+10))continue;
    for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1],s=[a[0],a[1],b[0],b[1],r.w/2+1.3];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);
      for(let t=0;t<=L+8;t+=8){const f=Math.min(1,t/(L||1));const k=sk(lerp(a[0],b[0],f),lerp(a[1],b[1],f));if(!SEG.has(k))SEG.set(k,new Set());SEG.get(k).add(s);}}
    let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);const m=pts[pts.length>>1];
    if((r.type==='path'||r.cls>=5)&&L>=60&&inF(m[0],m[1])){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));W.paths.push({pts,cum,L});}}
  const nearPath=(x,z)=>{for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=SEG.get((Math.floor(x/16)+a)+','+(Math.floor(z/16)+b));if(l)for(const s of l)if(segDist(x,z,s[0],s[1],s[2],s[3]).d<s[4])return true;}return false;};
  const R=mulberry32(3801),sp=LOWMEM?9:6.6,CS=300,cells=new Map();let n=0;
  for(let z=bb[1];z<bb[3];z+=sp)for(let x=bb[0];x<bb[2];x+=sp){const px=x+(R()-0.5)*sp*0.8,pz=z+(R()-0.5)*sp*0.8;const kind=R()<0.66?1:0,s=0.8+R()*0.6,rot=R()*TAU,col=R();
    if(!inF(px,pz)||!gonsFree(px,pz)||nearPath(px,pz)||treeNear(px,pz,3))continue;
    const k=Math.floor((px-bb[0])/CS)+','+Math.floor((pz-bb[1])/CS);let c=cells.get(k);if(!c){c={list:[],x:0,z:0};cells.set(k,c);}c.list.push([px,pz,kind,s,rot,col]);n++;}
  W.trees=n;if(!n)return;
  const crowns=[gonsCrown(0),gonsCrown(1)],trunk=gonsTrunk();
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),p=new THREE.Vector3(),c=new THREE.Color(),up=new THREE.Vector3(0,1,0);
  for(const cell of cells.values()){const L=cell.list;for(let i=L.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=L[i];L[i]=L[j];L[j]=t;}// gemischt → .count = gleichmäßige Ausdünnung
    let sx=0,sz=0;for(const t of L){sx+=t[0];sz+=t[1];}cell.x=sx/L.length;cell.z=sz/L.length;let r=0;for(const t of L)r=Math.max(r,Math.hypot(t[0]-cell.x,t[1]-cell.z));cell.r=r+6;
    const byK=[L.filter(t=>t[2]===0),L.filter(t=>t[2]===1)];cell.meshes=[];
    const tm=new THREE.InstancedMesh(trunk,MAT.bark,L.length);
    byK.forEach((list,kind)=>{if(!list.length)return;const cm=new THREE.InstancedMesh(crowns[kind],MAT.leaf,list.length);
      list.forEach((t,i)=>{q.setFromAxisAngle(up,t[4]);p.set(t[0],0,t[1]);sc.set(t[3],t[3]*(kind?1.25:1.05),t[3]);m.compose(p,q,sc);cm.setMatrixAt(i,m);
        if(kind)c.setHSL(0.27+t[5]*0.07,0.32+t[5]*0.15,0.24+t[5]*0.1);else c.setHSL(0.2+t[5]*0.1,0.38+t[5]*0.2,0.33+t[5]*0.12);cm.setColorAt(i,c);});
      cm.receiveShadow=true;cm.computeBoundingSphere();scene.add(cm);cell.meshes.push({m:cm,n:list.length});});
    L.forEach((t,i)=>{q.setFromAxisAngle(up,t[4]);p.set(t[0],0,t[1]);sc.set(t[3]*0.9,t[3]*(t[2]?1.25:1.0),t[3]*0.9);m.compose(p,q,sc);tm.setMatrixAt(i,m);rasterCirc(HG,t[0],t[1],0.4,6);});
    tm.receiveShadow=true;tm.computeBoundingSphere();scene.add(tm);cell.meshes.push({m:tm,n:L.length});
    cell.n=L.length;cell.list=null;W.cells.push(cell);W.meshes+=cell.meshes.length;}
  gonsForestLOD(true);}
// Kiefer (Lennebergwald = Kiefern auf Sand) und Laubbaum, niedrige Detailstufe: wenige Ikosaeder-Kugeln
function gonsCrown(kind){const blobs=kind?[[0,0,0,1.5],[0,1.5,0,1.25],[0,2.8,0,0.95]]:[[0,0,0,2.0],[1.1,0.5,0.4,1.5],[-1.0,0.6,-0.5,1.5]];const parts=[];
  for(const [bx,by,bz,br] of blobs){const g=new THREE.IcosahedronGeometry(br,0);g.translate(bx,by+(kind?6.2:4.6),bz);parts.push(g);}
  const pos=[],nor=[];for(const g of parts){const P=g.attributes.position,N=g.attributes.normal;for(let i=0;i<P.count;i++){pos.push(P.getX(i),P.getY(i),P.getZ(i));nor.push(N.getX(i),N.getY(i),N.getZ(i));}g.dispose();}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  const n=pos.length/3;geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(n*2).fill(0.5),2));geo.setAttribute('color',new THREE.Float32BufferAttribute(new Array(n*3).fill(0.85),3));geo.computeBoundingSphere();return geo;}
function gonsTrunk(){const g=new GB();g.beam([0,0,0],[0,6.4,0],0.3,0.3,WHITE);g.beam([0,3.6,0],[0.8,5.2,0.2],0.13,0.13);return g.geo();}
// Nah: alle Bäume + Schatten; mittel: ausgedünnt; fern: aus
function gonsForestLOD(force){const W=GONS.wald;let vis=0;const near=LOWMEM?220:320,mid=LOWMEM?650:1000;
  for(const c of W.cells){let d=1e9;for(const P of PLAYERS)if(P.h&&!P.h.room)d=Math.min(d,gonsDist(P,c.x,c.z)-c.r);
    const on=d<mid;const f=d<near?1:Math.max(0.18,1-(d-near)/(mid-near));for(const {m,n} of c.meshes){m.visible=on;m.count=Math.max(1,Math.round(n*f));m.castShadow=d<180&&!LOWMEM;if(on)vis++;}}
  W.visibleMeshes=vis;}

// ===================== WALDSPAZIERGÄNGER: Jogger + Hundegassi =====================
const GONS_WALD_SAY={jog:['Ei gude! Kei Zeit – mei Puls!','Noch zwei Runde, dann gibt’s Worscht.','Lenneberg nuff, Lenneberg runner …','Links! Links vorbei!','Ich lauf für die Kerb. Do muss Platz sei.'],
  dog:['Waldi, aus! Des is kein Stöckche, des is en Ast!','Der will nur spiele. Glaab ich.','Bello, hierher! … Bello? BELLO!','Net an de Kiefer! Die is älter wie du!','Mir gehe jeden Daach hier. Er zieht, ich lauf.']};
const GONS_DOG_SAY=['Wuff!','Wuff wuff!','*schnüffelt an deinem Schuh*','*wedelt*'];
let GONS_DOGGEO=null;
function gonsDog(){if(!GONS_DOGGEO){GONS_DOGGEO={body:new THREE.BoxGeometry(0.26,0.24,0.62),head:new THREE.BoxGeometry(0.2,0.2,0.24),ear:new THREE.BoxGeometry(0.06,0.12,0.05),
    leg:new THREE.BoxGeometry(0.07,0.26,0.07).translate(0,-0.13,0),tail:new THREE.BoxGeometry(0.04,0.04,0.26).translate(0,0,-0.13)};}
  const G=GONS_DOGGEO,g=new THREE.Group(),mat=cmat(mpick([0x8a5a2b,0x2b2118,0xd9c39a,0x6b6b6b]),0.85),dark=cmat(0x1a1410,0.6);
  const add=(geo,mt,x,y,z,par=g)=>{const o=new THREE.Mesh(geo,mt);o.position.set(x,y,z);o.castShadow=true;par.add(o);return o;};
  add(G.body,mat,0,0.4,0);const head=add(G.head,mat,0,0.56,0.38);add(G.ear,dark,0.07,0.12,0,head);add(G.ear,dark,-0.07,0.12,0,head);add(G.ear,dark,0,-0.02,0.13,head).scale.set(0.8,0.5,0.6);
  const legs=[[0.09,0.22],[-0.09,0.22],[0.09,-0.22],[-0.09,-0.22]].map(([x,z])=>add(G.leg,mat,x,0.28,z));const tail=add(G.tail,mat,0,0.48,-0.31);tail.rotation.x=-0.6;
  scene.add(g);return {g,legs,tail,x:0,y:0,z:0,ph:0,alive:true,removed:false};}
function gonsWalkerSpawn(kind,P){const W=GONS.wald;if(!W.paths.length)return null;const [px,pz]=ppos(P);
  const near=W.paths.map(pt=>{let d=1e9;for(const q of pt.pts)d=Math.min(d,Math.hypot(q[0]-px,q[1]-pz));return [d,pt];}).sort((a,b)=>a[0]-b[0]).slice(0,6);
  const path=mpick(near)[1];const h=new Human('ped');h.state='venue';h.npcName=kind==='jog'?'Joggerin aus Gonsenheim':'Hundebesitzer vom Lenneberg';
  h.gw={path,s:mr(0,path.L),dir:Math.random()<0.5?1:-1,sp:kind==='jog'?mr(2.8,3.4):mr(1.1,1.4),side:mr(0.4,0.9),kind,sayT:mr(2,6)};if(kind==='dog'){h.gdog=gonsDog();h.gdog.npcName='Hund';}
  gonsWalkerPlace(h,0);W.walkers.push(h);return h;}
function gonsPathAt(path,s){const P=path.pts,C=path.cum;let i=1;while(i<P.length-1&&C[i]<s)i++;const a=P[i-1],b=P[i],L=(C[i]-C[i-1])||1,f=clamp((s-C[i-1])/L,0,1);return [lerp(a[0],b[0],f),lerp(a[1],b[1],f),(b[0]-a[0])/L,(b[1]-a[1])/L];}
function gonsWalkerPlace(h,dt){const w=h.gw;w.s+=w.dir*w.sp*dt;if(w.s>w.path.L){w.s=w.path.L;w.dir=-1;}else if(w.s<0){w.s=0;w.dir=1;}
  const [x,z,dx,dz]=gonsPathAt(w.path,w.s);const fx=dx*w.dir,fz=dz*w.dir;h.x=x-fz*w.side;h.z=z+fx*w.side;h.y=groundY(h.x,h.z);faceTo(h,fx,fz,Math.max(dt,0.2),6);h.animate(dt,dt?w.sp:0);h.sync();
  const d=h.gdog;if(d){const [qx,qz]=gonsPathAt(w.path,clamp(w.s-w.dir*1.1,0,w.path.L));d.x=qx+fz*0.5;d.z=qz-fx*0.5;d.y=groundY(d.x,d.z)-1.35;d.ph+=dt*w.sp*7;
    d.g.position.set(d.x,d.y+1.35,d.z);d.g.rotation.y=Math.atan2(fx,fz);d.legs.forEach((l,i)=>{l.rotation.x=Math.sin(d.ph+(i%2?Math.PI:0)+(i>1?Math.PI/2:0))*0.6;});d.tail.rotation.y=Math.sin(d.ph*1.6)*0.5;}}
function gonsWalkerRemove(h){if(!h.removed)h.remove();if(h.gdog){scene.remove(h.gdog.g);h.gdog.removed=true;}}
function gonsUpdateWalkers(dt){const W=GONS.wald;if(!W.bb)return;const bb=W.bb;let d=1e9;
  for(const P of PLAYERS)if(P.h&&!P.h.room){const [px,pz]=ppos(P);d=Math.min(d,Math.hypot(Math.max(bb[0]-px,0,px-bb[2]),Math.max(bb[1]-pz,0,pz-bb[3])));}
  const want=d<300?(LOWMEM?2:4):0;
  if(d>420||!want){for(const h of W.walkers)gonsWalkerRemove(h);W.walkers.length=0;}
  if(W.walkers.length<want&&W.paths.length){const kinds=['jog','dog','jog','dog'];gonsWalkerSpawn(kinds[W.walkers.length],P1);}
  for(let i=W.walkers.length-1;i>=0;i--){const h=W.walkers[i];if(h.removed||!h.alive){if(h.gdog&&!h.gdog.removed){scene.remove(h.gdog.g);h.gdog.removed=true;}if(h.removed){W.walkers.splice(i,1);}continue;}
    if(h.state==='talk'){if(h.gdog)h.gdog.tail.rotation.y=Math.sin(simTime*9)*0.6;continue;}if(h.state!=='venue')continue;
    if(!h.forceConv)h.forceConv=mpick(GONS_CONVS[h.gw.kind==='jog'?'jog':'dog']);gonsWalkerPlace(h,dt);
    h.gw.sayT-=dt;if(h.gw.sayT<=0){h.gw.sayT=mr(7,14);if(gonsDist(P1,h.x,h.z)<14){if(h.gdog&&Math.random()<0.35)say(h.gdog,mpick(GONS_DOG_SAY),2.2);else say(h,mpick(GONS_WALD_SAY[h.gw.kind]),3.2);}}}}

// ===================== GONSBACH: Bach im Gonsbachtal, Stege, Bänke =====================
function gonsBuildBach(){const B=GONS.bach;const L=GONS_LINE;const pts=[];
  for(let i=0;i+1<L.length;i++){const a=L[i],b=L[i+1];const len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=0;t<len;t+=2)pts.push([lerp(a[0],b[0],t/len),lerp(a[1],b[1],t/len)]);}
  pts.push(L[L.length-1]);
  // leichtes Mäandern, nur auf freiem Boden (Gebäude/Plätze: Bach verdolt, Straße: Brücke/Durchlass)
  const vb=polyBBox(pts),paved=AREAS.filter(a=>/square|parking|pitch|rail|construction/.test(a.kind)).map(a=>[a.poly,polyBBox(a.poly)]).filter(([,b])=>b[2]>vb[0]-10&&b[0]<vb[2]+10&&b[3]>vb[1]-10&&b[1]<vb[3]+10);
  const onPaved=(x,z)=>paved.some(([P,b])=>x>b[0]-3&&x<b[2]+3&&z>b[1]-3&&z<b[3]+3&&pip(x,z,P));
  const S=[];let s=0;for(let i=0;i<pts.length;i++){if(i)s+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];const l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
    const tx=(b[0]-a[0])/l,tz=(b[1]-a[1])/l,off=2.4*Math.sin(s/37)+1.3*Math.sin(s/11.5);const x=pts[i][0]-tz*off,z=pts[i][1]+tx*off;const k=idx(x,z);
    const bld=k<0||(hgG(k)>0&&hgG(k)<255&&[[2,0],[-2,0],[0,2],[0,-2]].filter(([u,v])=>{const j=idx(x+u,z+v);return j<0||hgG(j)>0;}).length>=3);
    S.push({x,z,tx,tz,s,st:bld||onPaved(x,z)?0:(k>=0&&(mfG(k)&2))?1:2});}
  const G=gonsGBs(),wat=new GB(),bank=new GB(),grass=new GB();let run=[];B.len=s;
  const flush=()=>{if(run.length>=5){B.water+=run[run.length-1].s-run[0].s;for(let i=0;i+1<run.length;i++){const a=run[i],b=run[i+1];
      const q=(p,w,y)=>[[p.x-p.tz*w,y,p.z+p.tx*w],[p.x+p.tz*w,y,p.z-p.tx*w]];const [a0,a1]=q(a,1.15,0.045),[b0,b1]=q(b,1.15,0.045);wat.quad(a0,b0,b1,a1,[0,a.s/4],[0,b.s/4],[1,b.s/4],[1,a.s/4]);
      for(const sd of [-1,1]){const [c0]=q(a,sd*1.1,0.04),[c1]=q(a,sd*1.9,0.032),[d0]=q(b,sd*1.1,0.04),[d1]=q(b,sd*1.9,0.032);if(sd>0)bank.quad(c1,d1,d0,c0,[0,0],[1,0],[1,1],[0,1]);else bank.quad(c0,d0,d1,c1,[0,0],[1,0],[1,1],[0,1]);
        const [g0]=q(a,sd*1.9,0.03),[g1]=q(a,sd*4.8,0.03),[h0]=q(b,sd*1.9,0.03),[h1]=q(b,sd*4.8,0.03),uv=p=>[p[0]/3,-p[2]/3];if(sd>0)grass.quad(g1,h1,h0,g0,uv(g1),uv(h1),uv(h0),uv(g0));else grass.quad(g0,h0,h1,g1,uv(g0),uv(h0),uv(h1),uv(g1));}}}run=[];};
  for(const p of S){if(p.st===2)run.push(p);else flush();}flush();
  // Durchlässe/Brücken: Straßenquerungen zwischen zwei offenen Abschnitten → Brüstungen links + rechts der Straße
  const wood=G.get('wood'),stone=G.get('stone');const C={wood:gonsCol(0x7a5532),dark:gonsCol(0x4a3420),st:gonsCol(0xa49a8a)};
  for(let i=1;i<S.length;i++){if(S[i].st!==1||S[i-1].st!==2)continue;let j=i;while(j<S.length&&S[j].st===1)j++;if(j>=S.length||S[j].st!==2||j-i>8)continue;
    const a=S[i-1],b=S[j];const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,rot=Math.atan2(a.tx,a.tz);const half=Math.hypot(b.x-a.x,b.z-a.z)/2+0.2;
    for(const sd of [-1,1])stone.box(mx+a.tx*sd*half,0,mz+a.tz*sd*half,3.4,0.75,0.35,rot,C.st);B.bridges.push({x:mx,z:mz,kind:'strasse'});}
  // Holzstege über offene Abschnitte, Bänke am Ufer
  let lastBr=-1e9,lastBe=-1e9,side=1;
  for(let i=4;i<S.length-4;i++){const p=S[i];if(p.st!==2||S[i-3].st!==2||S[i+3].st!==2)continue;
    if(p.s-lastBr>230&&!B.bridges.some(b=>Math.hypot(b.x-p.x,b.z-p.z)<40)){lastBr=p.s;gonsFootbridge(wood,p,C);B.bridges.push({x:p.x,z:p.z,kind:'steg'});continue;}
    if(p.s-lastBe>110&&p.s-lastBr>25){const bx=p.x-p.tz*3.6*side,bz=p.z+p.tx*3.6*side;if(gonsFree(bx,bz)&&gonsFree(bx+p.tx*1.2,bz+p.tz*1.2)&&gonsFree(bx-p.tx*1.2,bz-p.tz*1.2)){
      const face=Math.atan2(p.tz*side,-p.tx*side);gonsBench(wood,bx,bz,face,C);B.benches.push({x:bx,z:bz,face});rasterOBB(HG,bx,bz,1.8,0.6,face,1);lastBe=p.s;side=-side;}}}
  const mats=gonsMats();const par=new THREE.Group();scene.add(par);
  const hasW=!wat.empty,hasB=!bank.empty,hasG=!grass.empty;if(hasG){const m=new THREE.Mesh(grass.geo(),MAT.grass);m.receiveShadow=true;par.add(staticMesh(m));}
if(hasW){const m=new THREE.Mesh(wat.geo(),mats.water);m.receiveShadow=true;par.add(staticMesh(m));B.mesh=m;}
  if(hasB){const m=new THREE.Mesh(bank.geo(),mats.bank);m.receiveShadow=true;par.add(staticMesh(m));}
  const ms=G.meshes(par,mats);for(const m of ms)staticMesh(m);GONS.stats.bachMeshes=ms.length+hasW+hasB+hasG;}
function gonsFootbridge(gb,p,C){const rot=Math.atan2(-p.tz,p.tx);// Steg quer zum Bach
  gb.box(p.x,0.12,p.z,1.6,0.14,4.6,rot,C.wood);for(const sd of [-1,1]){const ox=p.tx*sd*0.75,oz=p.tz*sd*0.75;
    for(const e of [-1.9,0,1.9])gb.box(p.x+ox-p.tz*e,0.12,p.z+oz+p.tx*e,0.1,0.95,0.1,rot,C.dark);gb.box(p.x+ox,1.0,p.z+oz,0.08,0.08,4.2,rot,C.dark);}}
function gonsBench(gb,x,z,face,C){const s=Math.sin(face),c=Math.cos(face);const at=(a,b)=>[x+c*a+s*b,z-s*a+c*b];
  for(const a of [-0.75,0.75]){const [lx,lz]=at(a,0);gb.box(lx,0,lz,0.08,0.45,0.42,face,C.dark);}
  const [sx,sz]=at(0,0.02);gb.box(sx,0.42,sz,1.7,0.06,0.42,face,C.wood);const [bx,bz]=at(0,-0.22);gb.box(bx,0.55,bz,1.7,0.36,0.05,face,C.wood);}

// ===================== ORTSKERN ALT-GONSENHEIM: St. Stephan (Turmuhren, Kugel + Kreuz), Dorfbrunnen =====================
// Die Doppeltürme samt Helmen baut schon der OSM-Gebäudegenerator (Höhe 63 m, Helm 23 m); hier kommen Uhren und Kreuze dazu.
function gonsBuildOrt(){const O=GONS.ort;const ni=OSM.names.indexOf('Sankt Stephan');const towers=[];let main=null;
  if(ni>=0)for(const r of OSM.b){if(r[9]!==ni)continue;const P=decRing(r[10]);const [cx,cz]=polyCentroid(P);if(Math.hypot(cx+4600,cz+100)>600)continue;const t={h:r[0]/10,rh:r[8]/10,P,x:cx,z:cz,area:Math.abs(polyArea(P))};
    if(!main||t.area>main.area)main=t;if(t.h>=45&&t.rh>0)towers.push(t);}
  const mats=gonsMats(),G=gonsGBs(),par=new THREE.Group();scene.add(par);
  if(towers.length){const tex=freeAfterUpload(canvasTex(128,128,g=>{g.fillStyle='#f3efe4';g.beginPath();g.arc(64,64,60,0,TAU);g.fill();g.strokeStyle='#c9a227';g.lineWidth=6;g.stroke();g.fillStyle='#1d1d1d';
      for(let k=0;k<12;k++){const a=k/12*TAU;g.fillRect(64+Math.sin(a)*47-3,64-Math.cos(a)*47-3,6,6);}g.strokeStyle='#1d1d1d';g.lineWidth=6;g.beginPath();g.moveTo(64,64);g.lineTo(64,24);g.stroke();g.lineWidth=7;g.beginPath();g.moveTo(64,64);g.lineTo(90,72);g.stroke();},false));
    const cg=new GB(),go=G.get('metal'),GO=gonsCol(0xd4af37);
    for(const t of towers){let e=0,ang=0;for(let i=0;i<t.P.length;i++){const a=t.P[i],b=t.P[(i+1)%t.P.length];const l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>e){e=l;ang=Math.atan2(b[0]-a[0],b[1]-a[1]);}}
      const cy=t.h-t.rh-3.2;let small=1e9;
      for(let k=0;k<4;k++){const f=ang+k*Math.PI/2,fx=Math.sin(f),fz=Math.cos(f),rx=Math.cos(f),rz=-Math.sin(f);let o=0;for(const p of t.P)o=Math.max(o,(p[0]-t.x)*fx+(p[1]-t.z)*fz);small=Math.min(small,o);
        const cr=Math.min(1.5,o*0.55),cx=t.x+fx*(o+0.08),cz=t.z+fz*(o+0.08);cg.quad([cx-rx*cr,cy-cr,cz-rz*cr],[cx+rx*cr,cy-cr,cz+rz*cr],[cx+rx*cr,cy+cr,cz+rz*cr],[cx-rx*cr,cy+cr,cz-rz*cr],[0,0],[1,0],[1,1],[0,1],WHITE);}
      go.box(t.x,t.h-0.3,t.z,0.6,0.6,0.6,ang,GO);go.beam([t.x,t.h+0.2,t.z],[t.x,t.h+2.6,t.z],0.12,0.12,GO);go.beam([t.x-Math.cos(ang)*0.55,t.h+1.9,t.z+Math.sin(ang)*0.55],[t.x+Math.cos(ang)*0.55,t.h+1.9,t.z-Math.sin(ang)*0.55],0.1,0.1,GO);}
    const cm=new THREE.Mesh(cg.geo(),new THREE.MeshStandardMaterial({map:tex,roughness:0.6}));par.add(cm);O.extra=(O.extra||0)+1;
    O.church={x:main.x,z:main.z,towers:towers.length,h:towers[0].h,clockY:towers[0].h-towers[0].rh-3.2};}
  const best=main;
  // Dorfbrunnen + Bänke auf dem Platz vor der Kirche (Abstand zum Superschuh-Versteck)
  const cx=best?best.x:-4680,cz=best?best.z:-55;const shoe=GONS.shoes;let spot=null;
  for(let r=16;r<60&&!spot;r+=4)for(let k=0;k<16;k++){const a=k/16*TAU;const x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r;let ok=true;
    for(let u=-4;u<=4&&ok;u+=2)for(let v=-4;v<=4&&ok;v+=2)if(!gonsFree(x+u,z+v))ok=false;if(ok&&shoe&&Math.hypot(shoe.x-x,shoe.z-z)<10)ok=false;if(ok){spot=[x,z];break;}}
  if(spot){const [x,z]=spot,st=G.get('stone'),S1=gonsCol(0xb7a68e),S2=gonsCol(0x8f8170);const n=8;
    for(let i=0;i<n;i++){const a=i/n*TAU+Math.PI/8;st.box(x+Math.sin(a)*1.55,0,z+Math.cos(a)*1.55,1.3,0.7,0.25,a,S1);}
    st.box(x,0,z,0.7,2.2,0.7,0,S2);st.box(x,2.2,z,1.0,0.25,1.0,0,S1);st.box(x,2.45,z,0.3,0.5,0.3,Math.PI/4,S2);
    const w=new GB();for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU;w.tri([x,0.55,z],[x+Math.sin(a1)*1.45,0.55,z+Math.cos(a1)*1.45],[x+Math.sin(a0)*1.45,0.55,z+Math.cos(a0)*1.45],[0.5,0.5],[1,0],[0,0]);}
    const wm=new THREE.Mesh(w.geo(),mats.water);par.add(wm);O.extra=(O.extra||0)+1;rasterCirc(HG,x,z,1.75,1);O.fountain={x,z};
    const C={wood:gonsCol(0x7a5532),dark:gonsCol(0x2f3438)};for(const a of [0.6,2.6]){const bx=x+Math.sin(a)*4.6,bz=z+Math.cos(a)*4.6,face=Math.atan2(x-bx,z-bz);if(!gonsFree(bx,bz))continue;gonsBench(G.get('wood'),bx,bz,face,C);rasterOBB(HG,bx,bz,1.8,0.6,face,1);O.benches.push({x:bx,z:bz,face});}}
  const ms=G.meshes(par,mats);for(const m of ms)staticMesh(m);GONS.stats.ortMeshes=ms.length+(O.extra||0);}

// ===================== GESPRÄCHE (Mundart, frei erfundene Figuren) =====================
const GONS_CONVS={
  dorf:[{o:'Ei gude! Bist du aach wege de Kerb do? Mir Gonsenheimer feiern, bis de Kerchturm wackelt.',m:'laugh',c:[['Wo ist die Kerb?','Uff’m Juxplatz, am Waldrand. Immer de Musik nooch.','smile'],['Wackelt der wirklich?','Nur wenn de Kerbeborsch singt. Dann wackelt alles.','laugh']]},
    {o:'Unser Kerchturm, der Sankt Stephan, der is höher wie alles in Gonsenheim. Außer de Mieten.',m:'smug',c:[['Wie hoch denn?','Hoch genug, dass mer en vum Lennebergwald aus sieht. Wenn mer net verlaafe is.','smile'],['Und die Mieten?','Do frag mol net. Do werd mer traurisch.','sad']]},
    {o:'Früher war do, wo jetzt die Autos stehe, nur Sand und Kiefern. Un mir mittedrin, barfuß.',m:'smile',c:[['Klingt schön.','Des war schee. Bis mer en Kiefernzappe getrete hat.','cringe'],['Und heute?','Heut hab ich Schlabbe. Mit Klett. Fortschritt.','smug']]}],
  bach:[{o:'Psst! Net so laut. Die Fisch im Gonsbach höre mit.',m:'surprised',c:[['Gibt’s hier Fische?','Ei sicher. Ich hab letzt Johr einen gesehe. Odder e Blatt. Mer weiß es net.','cringe'],['Tschuldigung.','Scho gut. Du bist ja kein Fisch.','smile']]},
    {o:'Im Gonsbach is mehr Wasser in meim Eimer als im Bach. Awwer schee isses trotzdem.',m:'smile',c:[['Warum angeln Sie dann?','Angle is net Fische fange. Angle is Ruh habbe.','smug'],['Soll ich helfen?','Hock dich hie un sei still. Des is die ganz Kunst.','smile']]}],
  jog:[{o:'*schnauf* Ei gude! *schnauf* Ich mach grad mei zehnte Rund im Lennebergwald.',m:'surprised',c:[['Respekt!','Danke. Die erste neun warn aus Versehe. Ich hab mich verlaafe.','cringe'],['Lauf weiter!','Jo, sonst werd mei Muskel kalt. Un mei Worscht aach.','laugh']]},
    {o:'Weißt du, wo’s hier zum Juxplatz geht? Ich hör die Kerbmusik, awwer ich seh nur Kiefern.',m:'sad',c:[['Immer Richtung Osten.','Osten! Klar! … Wo is Osten?','surprised'],['Folg der Musik.','Gut. Dann renn ich jetzt zum Takt. Polka-Tempo!','laugh']]}],
  dog:[{o:'Keine Angst, der beißt net. Der leckt nur. Viel.',m:'smile',c:[['Darf ich ihn streicheln?','Ei sicher. Awwer dann musst du mit, der lässt dich nimmer los.','laugh'],['Wie heißt er?','Schorsch. Wie mei Schwiegervadder. Die zwei sin sich ähnlich.','smug']]},
    {o:'Mir zwei gehn jeden Daach in de Lennebergwald. Er sucht Stöckcher, ich such Ruh.',m:'smile',c:[['Und wer findet mehr?','Er. Immer er. Ich find nur Kiefernzappe im Schuh.','cringe'],['Schöner Wald.','Gell? Un im Herbst rieche die Kiefern wie Weihnachte.','smile']]}],
  kerb:[{o:'Wem is die Kerb?',m:'laugh',c:[['UNSER!','Richtig! Un jetzt e Schoppe druff!','laugh',{drink:1}],['Äh … euch?','Dir aach, dir aach! Heut is jeder Gonsenheimer.','smile']]},
    {o:'Drei Lose, en Euro! Jedes Los gewinnt! Fast jedes. Manche. Eins bestimmt.',m:'smug',c:[['Gib mir drei! (1 €)','Ohh … Niete, Niete … un e Plastikrose! Glückwunsch!','laugh',{money:-1}],['Nee, danke.','Dann halt net. Die Plastikros’ krieht en anderer.','sad']]},
    {o:'Gebrannte Mandeln! Frisch aus’m Kessel! Heiß wie die Gerüchte uff de Kerb!',m:'smile',c:[['Eine Tüte, bitte. (3 €)','Bitteschön. Vorsicht, die sin heißer wie de Kerbeborsch sei Redd.','laugh',{money:-3}],['Was für Gerüchte?','Dass de Kerbeborsch dies Johr sein Spruch auswendig kann. Glaabt kenner.','smug']]}]};
const GONS_BABBEL=[[0,'Ei gude, Karl-Heinz! Wie?'],[1,'Ei, wie soll’s sei? De Rücke zwickt, die Knie knacke – awwer die Kerb mach ich mit.'],
  [0,'Hast gehört? Am Gonsbach habbe se e neu Bänkche hingestellt.'],[1,'Jo. Ich hab’s schon eingeweiht. Zwei Stunn gehockt.'],
  [0,'Un im Lennebergwald renne die junge Leut widder im Kreis. Jogge heißt des.'],[1,'Mir sin früher aach im Kreis gerennt. Hinner de Gäns her.'],
  [0,'Unser Kerchturm is doch de schönste weit un breit.'],[1,'Jo. Un de Pfarrer läut immer fünf Minute zu früh. Damit mer pünktlich zum Schoppe kommt.']];
const GONS_SWEEP=['Die Blätter aus’m Lennebergwald fliege bis in mei Hof. Jedes Johr!','Bub, tritt mer net in mei Haufe!','Vor de Kerb werd gekehrt. Des war schon immer so.'];
const GONS_ANGLER=['Psst! Die Fisch höre mit.','Gestern hab ich en Fisch gesehe. Glaab ich.','Am Gonsbach is die Welt noch in Ordnung.'];

// ===================== SZENEN: NPCs nur in der Nähe =====================
function gonsSitPose(h){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;h.gonsSit=true;}
function gonsNpc(x,z,face,o={}){const h=new Human('ped');h.x=x;h.z=z;h.y=o.y??groundY(x,z);h.facing=face;h.state='venue';if(o.name)h.npcName=o.name;if(o.sit)gonsSitPose(h);h.gconv=o.conv||null;h.glines=o.lines||null;h.gsayT=mr(2,7);h.sync();return h;}
function gonsSceneDefs(){const S=GONS.scenes;const O=GONS.ort,B=GONS.bach;
  if(O.fountain){const f=O.fountain;S.push({id:'dorfplatz',name:'Dorfplatz an St. Stephan',x:f.x,z:f.z,npcs:[],active:false,talkI:0,talkT:2,spawn(sc){
    const b=O.benches[0];if(b){const s=Math.sin(b.face),c=Math.cos(b.face);for(const a of [-0.45,0.45])sc.npcs.push(gonsNpc(b.x+c*a,b.z-s*a,b.face,{sit:true,conv:'dorf',name:a<0?'Rentner Heinz (Gonsenheim)':'Rentner Karl-Heinz (Gonsenheim)'}));}
    else{sc.npcs.push(gonsNpc(f.x+2.5,f.z,-Math.PI/2,{conv:'dorf'}),gonsNpc(f.x-2.5,f.z,Math.PI/2,{conv:'dorf'}));}
    const sw=gonsNpc(f.x+mr(-6,6),f.z+mr(5,8),mr(0,TAU),{conv:'dorf',lines:GONS_SWEEP,name:'Frau Becker (Kehrwoch)'});const br=new THREE.Mesh(new THREE.BoxGeometry(0.05,1.3,0.05),cmat(0x8a6a3a,0.8));br.position.set(0,-0.55,0.15);br.rotation.x=0.5;sw.armR.add(br);sw.armR.rotation.x=-0.5;sc.npcs.push(sw);},
    update(sc,dt){const [a,b]=sc.npcs;if(!a||!b||a.state!=='venue'||b.state!=='venue'||!a.alive||!b.alive)return;sc.talkT-=dt;if(sc.talkT>0)return;const L=GONS_BABBEL[sc.talkI%GONS_BABBEL.length];sc.talkI++;
      sc.talkT=sc.talkI%GONS_BABBEL.length===0?14:4.2;if(gonsNearest(sc.x,sc.z)<30)say(L[0]?b:a,L[1],4);}});}
  if(B.benches.length){const b=B.benches[B.benches.length>>1];S.push({id:'gonsbach',name:'Gonsbachtal',x:b.x,z:b.z,npcs:[],active:false,spawn(sc){
    const s=Math.sin(b.face),c=Math.cos(b.face);const h=gonsNpc(b.x+c*0.4,b.z-s*0.4,b.face,{sit:true,conv:'bach',lines:GONS_ANGLER,name:'Angler Schorsch'});
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.02,2.6,5),cmat(0x2a2a2a,0.5));rod.position.set(0,-0.5,0.9);rod.rotation.x=1.1;h.armR.add(rod);h.armR.rotation.x=-0.9;sc.npcs.push(h);}});}
  if(GONS.kerb.frame){const F=GONS.kerb.frame;S.push({id:'kerb',name:'Gonsenheimer Kerb',x:F.cx,z:F.cz,npcs:[],active:false,kerb:true,spawn:gonsKerbNpcs,update:gonsKerbSceneUpdate});}
  if(GONS.wald.bb){const bb=GONS.wald.bb;S.push({id:'wald',name:'Lennebergwald',x:(bb[0]+bb[2])/2,z:(bb[1]+bb[3])/2,npcs:GONS.wald.walkers,dynamic:true,active:false});}}
function gonsUpdateScenes(dt){for(const sc of GONS.scenes){if(sc.dynamic){sc.active=sc.npcs.length>0;continue;}
    const d=gonsNearest(sc.x,sc.z);const ok=!sc.kerb||GONS.kerb.on;
    if(!sc.active&&ok&&d<150){sc.active=true;sc.npcs=[];sc.spawn(sc);}
    else if(sc.active&&(!ok||d>220)){for(const h of sc.npcs)if(!h.removed)h.remove();sc.npcs=[];sc.active=false;}}}
function gonsTickScenes(dt){for(const sc of GONS.scenes){if(!sc.active||sc.dynamic)continue;if(sc.update)sc.update(sc,dt);
  for(const h of sc.npcs){if(h.removed||!h.alive||h.state!=='venue')continue;if(h.gconv&&!h.forceConv)h.forceConv=mpick(GONS_CONVS[h.gconv]);
    if(h.gwalk){gonsKerbWalk(h,dt);continue;}h.animate(dt,0);if(h.gonsSit){h.hips.position.y=0.55;h.legL.rotation.x=h.legR.rotation.x=-1.5;}
    if(h.y!==undefined&&h.gy!==undefined)h.y=h.gy;h.sync();
    if(h.glines){h.gsayT-=dt;if(h.gsayT<=0){h.gsayT=mr(9,16);if(gonsDist(P1,h.x,h.z)<16)say(h,mpick(h.glines),3.4);}}}}}

// ===================== GONSENHEIMER KERB auf dem Juxplatz =====================
function gonsKerbFrame(){const A=AREAS.find(a=>a.kind==='parking'&&a.name==='Juxplatz');if(!A)return null;const P=A.poly;
  let best=0,ux=0,uz=1;for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const d=Math.hypot(P[j][0]-P[i][0],P[j][1]-P[i][1]);if(d>best){best=d;ux=(P[j][0]-P[i][0])/d;uz=(P[j][1]-P[i][1])/d;}}
  if(uz<0){ux=-ux;uz=-uz;}const vx=uz,vz=-ux;let mx=0,mz=0;for(const p of P){mx+=p[0];mz+=p[1];}mx/=P.length;mz/=P.length;
  let z0=1e9,z1=-1e9;for(const p of P){const lz=(p[0]-mx)*ux+(p[1]-mz)*uz;z0=Math.min(z0,lz);z1=Math.max(z1,lz);}const zc=(z0+z1)/2;
  // Breite in der Mitte → Querachse zentrieren
  let xa=1e9,xb=-1e9;for(let k=0;k<P.length;k++){const a=P[k],b=P[(k+1)%P.length];const la=[(a[0]-mx)*vx+(a[1]-mz)*vz,(a[0]-mx)*ux+(a[1]-mz)*uz],lb=[(b[0]-mx)*vx+(b[1]-mz)*vz,(b[0]-mx)*ux+(b[1]-mz)*uz];
    if((la[1]-zc)*(lb[1]-zc)<=0&&la[1]!==lb[1]){const x=la[0]+(zc-la[1])/(lb[1]-la[1])*(lb[0]-la[0]);xa=Math.min(xa,x);xb=Math.max(xb,x);}}
  const xc=xa<xb?(xa+xb)/2:0;const cx=mx+vx*xc+ux*zc,cz=mz+vz*xc+uz*zc;
  const F={cx,cz,ux,uz,vx,vz,ang:Math.atan2(ux,uz),poly:P,half:(z1-z0)/2,w:xb-xa};
  F.W=(lx,lz)=>[cx+lx*vx+lz*ux,cz+lx*vz+lz*uz];F.L=(x,z)=>[(x-cx)*vx+(z-cz)*vz,(x-cx)*ux+(z-cz)*uz];
  const r=Math.hypot(F.half,F.w/2)+6;F.bb=[cx-r,cz-r,cx+r,cz+r];return F;}
// Fläche im Platz und ohne Gebäude?
function gonsKerbFits(F,x0,z0,x1,z1){for(let x=x0;x<=x1+0.01;x+=Math.max(0.5,(x1-x0)/4))for(let z=z0;z<=z1+0.01;z+=Math.max(0.5,(z1-z0)/4)){const [wx,wz]=F.W(x,z);if(!pip(wx,wz,F.poly))return false;const i=idx(wx,wz);if(i<0||hgG(i)>0)return false;}return true;}
const GONS_STALLS=[['Gebrannte Mandeln','#7a2e12','#ffd9a0'],['Lose – jedes gewinnt!','#1d4e89','#ffe36b'],['Weck, Worscht un Woi','#8b1a1a','#fff3d6'],['Schießbude','#2b5d34','#f4f4f0'],
  ['Zuckerwatte','#d4588a','#ffffff'],['Lebkuchenherzen','#6b3a1a','#ffd23f'],['Backfisch','#155e75','#e8f6ff'],['Kerbeschoppe','#5a1a4a','#ffd9f0']];
function gonsKerbAtlas(){return freeAfterUpload(canvasTex(512,1024,g=>{GONS_STALLS.forEach(([t,bg,fg],k)=>{const y=k*128;g.fillStyle=bg;g.fillRect(0,y,512,128);g.strokeStyle=fg;g.lineWidth=6;g.strokeRect(8,y+8,496,112);
  g.fillStyle=fg;g.font='700 54px "Barlow Condensed", Arial Narrow, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(t,256,y+66,470);});},false));}
function gonsKerbBuild(){const K=GONS.kerb,F=K.frame;if(!F||K.built)return;K.built=true;const mats=gonsMats();const grp=new THREE.Group();grp.position.set(F.cx,0,F.cz);grp.rotation.y=F.ang;scene.add(grp);K.grp=grp;
  const G=gonsGBs(),sign=new GB(),C=k=>gonsCol(k);K.boxes=[];K.circles=[];K.stalls=[];
  const hz=Math.min(F.half-4,44),wx=Math.min(F.w/2-1.5,12.5);
  // Buden: zwei Reihen entlang der Längsachse, Front zur Gasse
  const sx=Math.max(7,wx-2);let k=0;
  for(const z of [-30,-21,-12,12,21,30])for(const side of [-1,1]){if(k>=GONS_STALLS.length||Math.abs(z)>hz-2)continue;const x=side*sx;
    if(!gonsKerbFits(F,x-1.6,z-2.5,x+1.6,z+2.5))continue;gonsStall(G,sign,x,z,side>0?-Math.PI/2:Math.PI/2,k,C);const [wx2,wz2]=F.W(x-side*1.6,z);
    K.stalls.push({name:GONS_STALLS[k][0],lx:x,lz:z,x:wx2,z:wz2,face:F.ang+(side>0?-Math.PI/2:Math.PI/2)});K.boxes.push([x-1.5,z-2.4,x+1.5,z+2.4]);k++;}
  // Karussell in der Mitte (dreht sich), Kerbebaum + Bühne für den Kerbeborsch am einen Ende, Zelt am anderen
  const car=gonsCarousel(G,C);grp.add(car.g);K.carousel=car;K.circles.push([0,0,5.6]);
  const pz=-Math.min(hz-2,36);let podZ=pz;for(const z of [pz,pz+4,pz+8,pz+12])if(gonsKerbFits(F,-2,z-1.5,2,z+1.5)){podZ=z;break;}
  const wd=G.get('wood');wd.box(0,0,podZ,4,0.8,3,0,C(0x6b4a2a));wd.box(0,0.8,podZ-1.2,4,0.9,0.12,0,C(0x8a5a2b));for(let i=0;i<5;i++)G.get('cloth').box(-1.6+i*0.8,0.8,podZ+1.52,0.8,0.5,0.04,0,C(i%2?0xc8102e:0xf4f4f0));
  K.podium={lx:0,lz:podZ,y:0.8};K.boxes.push([-2,podZ-1.5,2,podZ+1.5]);
  const tx=-Math.min(5,wx-1.5);gonsKerbebaum(G,tx,podZ+0.5,C);K.tree={lx:tx,lz:podZ+0.5,h:15};K.circles.push([tx,podZ+0.5,0.6]);
  const tz=Math.min(hz-5,37);let tentZ=null;for(const z of [tz,tz-3,tz-6])if(gonsKerbFits(F,-5.5,z-5,5.5,z+5)){tentZ=z;break;}
  if(tentZ===null)tentZ=tz;gonsTent(G,tentZ,C);K.boxes.push([-5.5,tentZ-5,5.5,tentZ+5]);const [dx,dz]=F.W(0,tentZ-5.1);K.tentDoor=[dx,dz,F.ang+Math.PI];K.tentLz=tentZ;
  // Wimpelketten über der Gasse
  const cl=G.get('cloth');const flags=[0xc8102e,0xffd23f,0x1d4e89,0x2b8a3e,0xf4f4f0];for(const x of [-sx+1.8,sx-1.8]){for(let z=-28,i=0;z<28;z+=0.9,i++){if(Math.abs(z)<6.5)continue;const y=4.3-0.4*Math.sin(((z+28)%14)/14*Math.PI);cl.triOut([x,y,z],[x,y,z+0.7],[x,y-0.55,z+0.35],[0,0],[1,0],[0.5,1],C(flags[i%5]),[x+1,y,z]);}}
  const ms=G.meshes(grp,mats,!LOWMEM);
  K.signTex=gonsKerbAtlas();K.signMat=new THREE.MeshStandardMaterial({map:K.signTex,roughness:0.8});if(!sign.empty){const sm=new THREE.Mesh(sign.geo(),K.signMat);grp.add(sm);}
  GONS.stats.kerbMeshes=ms.length+(sign.empty?0:1)+3;// + Karussell: Dach, Lichter, Pferdchen
  // Zufahrten über den Platz sind während der Kerb gesperrt, abgestellte Autos werden weggeräumt
  for(const E of EDGES){if(!E.car)continue;const a=NODES[E.a],b=NODES[E.b];for(let t=0;t<=1;t+=0.05){const [lx,lz]=F.L(lerp(a.x,b.x,t),lerp(a.z,b.z,t));if(Math.abs(lx)<F.w/2-1&&Math.abs(lz)<F.half-1&&pip(lerp(a.x,b.x,t),lerp(a.z,b.z,t),F.poly)){E.car=false;K.closed.push(E);break;}}}
  for(let i=CARS.length-1;i>=0;i--){const c=CARS[i];if(c.persist||c.mission||isPlayerCar(c)||c.ai.mode!=='parked')continue;const [lx,lz]=F.L(c.x,c.z);if(Math.abs(lx)<F.w/2+1&&Math.abs(lz)<F.half+1)c.remove();}
  // Kerbezelt: Tür nur während der Kerb
  GONS_TENT.door=K.tentDoor;}
function gonsStall(G,sign,x,z,face,k,C){const s=Math.sin(face),c=Math.cos(face);const P=(a,y,b)=>[x+c*a+s*b,y,z-s*a+c*b];const at=(a,b)=>[x+c*a+s*b,z-s*a+c*b];
  const wd=G.get('wood'),cl=G.get('cloth'),mt=G.get('metal');const [bg]=GONS_STALLS[k].slice(1);const col=C(parseInt(bg.slice(1),16));
  {const [px,pz]=at(0,1.0);wd.box(px,0,pz,4.6,1.0,0.8,face,col);}{const [px,pz]=at(0,-1.4);wd.box(px,0,pz,4.6,2.6,0.1,face,C(0x8a6a48));}
  for(const a of [-2.3,2.3]){const [px,pz]=at(a,-0.2);wd.box(px,0,pz,0.08,2.6,2.4,face,C(0x9a7a58));}
  for(const [a,b] of [[-2.25,1.35],[2.25,1.35]]){const [px,pz]=at(a,b);mt.box(px,0,pz,0.09,2.75,0.09,face,C(0x777777));}
  for(let i=0;i<8;i++){const a0=-2.4+i*0.6,a1=a0+0.6,rc=i%2?C(0xf4f4f0):col;cl.quad(P(a0,2.7,1.5),P(a1,2.7,1.5),P(a1,3.05,-1.5),P(a0,3.05,-1.5),[0,0],[1,0],[1,1],[0,1],rc);cl.quad(P(a0,2.69,1.5),P(a0,3.04,-1.5),P(a1,3.04,-1.5),P(a1,2.69,1.5),[0,0],[0,1],[1,1],[1,0],rc);
    cl.tri(P(a0,2.7,1.5),P(a0+0.3,2.4,1.52),P(a1,2.7,1.5),[0,0],[0.5,1],[1,0],i%2?col:C(0xf4f4f0));}
  for(let i=0;i<6;i++){const [px,pz]=at(-1.9+i*0.75,1.05);wd.box(px,1.0,pz,0.42,0.18+((i*7+k)%3)*0.08,0.35,face,C([0xffd23f,0xe8743b,0xc8102e,0xf2e8d5,0x6b3a1a][(i+k)%5]));}
  const v0=1-(k+1)/8,v1=1-k/8;sign.quad(P(-2,3.1,1.56),P(2,3.1,1.56),P(2,3.75,1.56),P(-2,3.75,1.56),[0,v0],[1,v0],[1,v1],[0,v1],WHITE);}
function gonsCarousel(G,C){const g=new THREE.Group();const base=G.get('wood'),mt=G.get('metal'),R=5.2,n=16;
  for(let i=0;i<n;i++){const a=i/n*TAU;base.box(Math.sin(a)*R*0.92,0,Math.cos(a)*R*0.92,R*2*Math.sin(Math.PI/n)+0.05,0.35,0.9,a,C(i%2?0xd4af37:0x7a2e12));}
  base.box(0,0,0,R*1.5,0.32,R*1.5,0,C(0x8a6a48));base.box(0,0,0,R*1.2,0.33,R*1.2,Math.PI/4,C(0x8a6a48));
  // drehender Teil: ein Mesh für Dach + Mittelsäule + Stangen, Pferdchen instanziert (heben und senken sich)
  const rot=new GB(),glow=new GB(),top=[0,6.6,0];
  for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU;const p0=[Math.sin(a0)*R,4.3,Math.cos(a0)*R],p1=[Math.sin(a1)*R,4.3,Math.cos(a1)*R];rot.triOut(p0,p1,top,[0,0],[1,0],[0.5,1],C(i%2?0xf4f4f0:0xc8102e),[0,5,0]);
    rot.quadOut([p0[0],3.7,p0[2]],[p1[0],3.7,p1[2]],p1,p0,[0,0],[1,0],[1,1],[0,1],C(i%2?0xd4af37:0x1d4e89),[0,4,0]);glow.box(p0[0]*1.01,3.95,p0[2]*1.01,0.16,0.16,0.16,0,C(0xfff1b0));}
  rot.beam([0,0.3,0],[0,6.6,0],0.7,0.7,C(0xd4af37));for(let i=0;i<8;i++){const a=i/8*TAU;rot.beam([Math.sin(a)*3.9,0.35,Math.cos(a)*3.9],[Math.sin(a)*3.9,4.3,Math.cos(a)*3.9],0.07,0.07,C(0xd8d8d8));}
  const spin=new THREE.Group();g.add(spin);const mats=gonsMats();spin.add(new THREE.Mesh(rot.geo(),mats.cloth));spin.add(new THREE.Mesh(glow.geo(),mats.glow));
  const hg=new GB();hg.box(0,0,0,0.32,0.5,1.1,0,C(0xf4f4f0));hg.box(0,0.35,0.5,0.26,0.55,0.3,0,C(0xf4f4f0));hg.box(0,0.5,-0.05,0.34,0.08,0.4,0,C(0xc8102e));
  const horses=new THREE.InstancedMesh(hg.geo(),mats.cloth,8);spin.add(horses);
  return {g,spin,horses,rot:0,speed:0.55,bob:0,n:8};}
function gonsCarouselStep(car,dt){car.rot=(car.rot+car.speed*dt)%TAU;car.spin.rotation.y=car.rot;car.bob+=dt*2.2;const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  for(let i=0;i<car.n;i++){const a=i/car.n*TAU;q.setFromAxisAngle(up,a+Math.PI/2);p.set(Math.sin(a)*3.9,1.3+Math.sin(car.bob+i*1.7)*0.3,Math.cos(a)*3.9);m.compose(p,q,s);car.horses.setMatrixAt(i,m);}
  car.horses.instanceMatrix.needsUpdate=true;}
function gonsKerbebaum(G,x,z,C){const wd=G.get('wood'),cl=G.get('cloth');wd.beam([x,0,z],[x,15,z],0.32,0.32,C(0xd9cfb8));
  for(let i=0;i<10;i++){const a=i/10*TAU;cl.beam([x+Math.sin(a)*0.75,11,z+Math.cos(a)*0.75],[x+Math.sin(a+0.6)*0.75,11,z+Math.cos(a+0.6)*0.75],0.22,0.22,C(0x2b6b2e));
    cl.beam([x+Math.sin(a)*0.7,11,z+Math.cos(a)*0.7],[x+Math.sin(a)*0.9,8.2,z+Math.cos(a)*0.9],0.05,0.02,C([0xc8102e,0xffd23f,0x1d4e89,0xf4f4f0,0x2b8a3e][i%5]));}
  for(const [dx,dy,dz,r] of [[0,15.6,0,1.1],[0.5,16.6,0.2,0.8],[-0.4,16.5,-0.3,0.8],[0,17.4,0,0.6]])cl.box(x+dx,dy-r,z+dz,r*1.4,r*1.8,r*1.4,dx,C(0x5a8f3a));}
function gonsTent(G,z,C){const cl=G.get('cloth'),wd=G.get('wood');const W=11,D=10,h=3.2,top=6.2,z0=z-D/2,z1=z+D/2;
  for(let i=0;i<14;i++){const a=-W/2+i*W/14,b=a+W/14,c=i%2?C(0xf4f0e2):C(0x1d4e89);if(Math.abs((a+b)/2)>1.2)cl.quadOut([a,0,z0],[b,0,z0],[b,h,z0],[a,h,z0],[0,0],[1,0],[1,1],[0,1],c,[0,1,z]);
    cl.quadOut([a,0,z1],[b,0,z1],[b,h,z1],[a,h,z1],[0,0],[1,0],[1,1],[0,1],c,[0,1,z]);}
  for(const sx of [-W/2,W/2])for(let i=0;i<12;i++){const a=z0+i*D/12,b=a+D/12;cl.quadOut([sx,0,a],[sx,0,b],[sx,h,b],[sx,h,a],[0,0],[1,0],[1,1],[0,1],i%2?C(0xf4f0e2):C(0x1d4e89),[0,1,z]);}
  for(let i=0;i<12;i++){const a=z0+i*D/12,b=a+D/12,c=i%2?C(0xf4f0e2):C(0x1d4e89);cl.quadOut([-W/2,h,a],[-W/2,h,b],[0,top,b],[0,top,a],[0,0],[1,0],[1,1],[0,1],c,[0,1,z]);cl.quadOut([W/2,h,a],[W/2,h,b],[0,top,b],[0,top,a],[0,0],[1,0],[1,1],[0,1],c,[0,1,z]);}
  for(const zz of [z0,z1])cl.triOut([-W/2,h,zz],[W/2,h,zz],[0,top,zz],[0,0],[1,0],[0.5,1],C(0xf4f0e2),[0,h,z]);
  wd.box(0,0,z0-0.05,2.2,2.6,0.08,0,C(0x3a2512));G.get('glow').box(0,2.7,z0-0.08,2.6,0.4,0.05,0,C(0xffe7a0));
  for(let i=0;i<6;i++)cl.triOut([-3+i*1.2,top+0.1,z],[-3+i*1.2,top+1.1,z],[-2.6+i*1.2,top+0.85,z],[0,0],[0,1],[1,1],C([0xc8102e,0xffd23f,0x1d4e89][i%3]),[0,0,z+5]);}
function gonsKerbNpcs(sc){const K=GONS.kerb,F=K.frame;if(!K.built)return;
  const [bx,bz]=F.W(K.podium.lx,K.podium.lz);const kb=gonsNpc(bx,bz,F.ang,{y:K.podium.y,conv:'kerb',name:'Kerbeborsch Lukas (frei erfunden)'});kb.gy=K.podium.y;gonsHat(kb);sc.npcs.push(kb);sc.kb=kb;
  const n=LOWMEM?3:4;K.stalls.slice(0,n).forEach(s=>{const [x,z]=F.W(s.lx+(s.lx>0?0.5:-0.5),s.lz);const h=gonsNpc(x,z,s.face,{conv:'kerb',name:'Budenbesitzer'});h.glines=[`${s.name}! Kommt her, Leut!`,'Hereinspaziert! Hier gibt’s alles, was de Mage net braucht!','Ei gude! Heut zum Kerbepreis!'];sc.npcs.push(h);});
  for(let i=0;i<(LOWMEM?3:5);i++){const lz=mr(-26,26),lx=Math.abs(lz)<7?mpick([-6,6]):mr(-5,5);const [x,z]=F.W(lx,lz);const h=gonsNpc(x,z,mr(0,TAU),{conv:'kerb'});h.gwalk={t:null,T:0};h.walkSpeed=mr(0.9,1.3);sc.npcs.push(h);}}
let GONS_HAT=null;
function gonsHat(h){if(!GONS_HAT)GONS_HAT={brim:new THREE.CylinderGeometry(0.24,0.24,0.025,14),crown:new THREE.CylinderGeometry(0.12,0.135,0.13,12),band:new THREE.CylinderGeometry(0.137,0.137,0.04,12)};
  const add=(g,c,y)=>{const m=new THREE.Mesh(g,cmat(c,0.8));m.position.set(0,y,0);h.hips.add(m);return m;};add(GONS_HAT.brim,0xe8d38a,0.905);add(GONS_HAT.crown,0xe8d38a,0.98);add(GONS_HAT.band,0xc8102e,0.94);}
function gonsKerbWalk(h,dt){const K=GONS.kerb,F=K.frame,w=h.gwalk;if(!w.t||w.T<=0||Math.hypot(w.t[0]-h.x,w.t[1]-h.z)<0.9){const lz=mr(-26,26),lx=Math.abs(lz)<7.5?mpick([-6.4,6.4]):mr(-5,5);w.t=F.W(lx,lz);w.T=mr(8,18);}
  w.T-=dt;const dx=w.t[0]-h.x,dz=w.t[1]-h.z;const mv=moveHuman(h,dx,dz,h.walkSpeed,dt);if(mv<0.05)w.T-=dt*3;faceTo(h,dx,dz,dt,6);h.animate(dt,h.walkSpeed);h.y=groundY(h.x,h.z);h.sync();}
// Kerbespruch: frei erfunden, Mundart
const GONS_SPRUCH=['Ruhe! Ruhe! De Kerbeborsch hot’s Wort!','Ihr liebe Leit aus Gonsenheim – heut is Kerb, drum kehrt mer ein!',
  'Im Lennebergwald, do hot’s gekracht: en Jogger hot sich verlaafe – die ganze Nacht!','Am Gonsbach hot de Schorsch geangelt, mit viel Geduld – gefange hot er nix, de Bach war schuld!',
  'Die Elektrisch kommt, die Elektrisch geht – nur net, wenn mer an de Haltestell steht!','Un de Ortsbeirat, der tagt un tagt – bis aaner Weck, Worscht un Woi mitbracht!',
  'Drum hebt die Gläser, hebt se hoch – die Gonsenheimer Kerb, die lebt noch!','Wem is die Kerb?'];
const GONS_RUF=['UNSER!','Ei jo!','Hoch soll se lebe!','Hallo!','Bravo, Lukas!'];
function gonsKerbSceneUpdate(sc,dt){const K=GONS.kerb,S=K.speech,kb=sc.kb;if(!kb||!kb.alive||kb.removed)return;
  if(kb.state==='venue'){kb.armR.rotation.x=-0.6+Math.sin(simTime*2)*0.25;kb.armR.rotation.z=-0.35;}
  if(gonsNearest(sc.x,sc.z)>45||kb.state!=='venue')return;S.t-=dt;if(S.t>0)return;
  if(S.i>=GONS_SPRUCH.length){S.i=0;S.t=35;return;}const line=GONS_SPRUCH[S.i++];say(kb,line,4.4,'loud');S.said++;S.t=4.8;
  if(S.i===GONS_SPRUCH.length||S.i%3===0){const crowd=sc.npcs.filter(h=>h!==kb&&h.alive&&!h.removed&&h.state==='venue');const c=crowd.length?mpick(crowd):null;
    if(c)setTimeout(()=>{if(c.alive&&!c.removed)say(c,S.i===GONS_SPRUCH.length?'UNSER!':mpick(GONS_RUF),2.4,'loud');},1500);}}
function gonsKerbClear(){const K=GONS.kerb;if(!K.built)return;for(const sc of GONS.scenes)if(sc.kerb&&sc.active){for(const h of sc.npcs)if(!h.removed)h.remove();sc.npcs=[];sc.active=false;}
  if(K.grp){scene.remove(K.grp);K.grp.traverse(o=>{if(o.geometry&&o.geometry.dispose)o.geometry.dispose();});}if(K.signTex)K.signTex.dispose();if(K.signMat)K.signMat.dispose();
  for(const E of K.closed)E.car=true;K.closed=[];K.grp=null;K.signTex=K.signMat=null;K.stalls=[];K.carousel=null;K.tree=null;K.podium=null;K.boxes=[];K.circles=[];K.built=false;K.greeted=false;K.speech.i=0;K.speech.t=0;GONS_TENT.door=null;}
// Kollision: Buden, Karussell, Bühne, Zelt (nur während der Kerb, schneller Bounding-Box-Test vorab)
function gonsKerbHit(x,z){const K=GONS.kerb,bb=K.frame.bb;if(x<bb[0]||x>bb[2]||z<bb[1]||z>bb[3])return false;const [lx,lz]=K.frame.L(x,z);
  for(const b of K.boxes)if(lx>b[0]&&lx<b[2]&&lz>b[1]&&lz<b[3])return true;for(const c of K.circles)if(Math.hypot(lx-c[0],lz-c[1])<c[2])return true;return false;}
const _gonsBlocked0=blocked0;
blocked0=function(x,z,y){if(GONS.kerb.built&&(y===undefined||y<3)&&gonsKerbHit(x,z))return true;return _gonsBlocked0(x,z,y);};
function gonsKerbOn(){const m=gameMin;return m>=GONS.kerb.from&&m<GONS.kerb.to;}
function gonsUpdateKerb(dt){const K=GONS.kerb;if(!K.frame)return;K.on=gonsKerbOn();const inside=PLAYERS.some(P=>P.h&&P.h.room&&P.h.room.venue===GONS_TENT);
  if(K.on&&!K.built)gonsKerbBuild();else if(!K.on&&K.built&&!inside)gonsKerbClear();
  if(!K.built)return;if(K.carousel)gonsCarouselStep(K.carousel,dt);
  const d=gonsNearest(K.frame.cx,K.frame.cz);if(K.on&&!K.greeted&&d<60){K.greeted=true;showBig('GONSENHEIMER KERB','mission',2.6,'Juxplatz · Buden, Karussell, Kerbezelt · bis 23 Uhr');}}

// ===================== KERBEZELT (begehbar, Muster p4p_venues) =====================
const GONS_TENT={id:'gonszelt',name:'Kerbezelt',sub:'Gonsenheimer Kerb · Juxplatz',W:14,D:22,H:7,wall:0xf2eee0,ceil:0xe6dcc0,hemiI:0.62,exp:1.0,lampI:30,lampD:24,labeled:true,door:null,
  lights:[[0,5.5,-6],[0,5.5,2],[0,5.5,8],[-5,4,0],[5,4,0]],wp:[[0,-2],[0,4],[0,8],[-5.5,-4],[5.5,-4],[-5.5,6],[5.5,6]],
  spawn:[0,8.8,Math.PI],exits:[{x:0,z:10.6,w:1.4,d:0.8,to:'door'}],
  hints:[{x:5.2,z:3,r:2.4,t:'<b>F</b>: Weck, Worscht un Woi (4 €)'},{x:0,z:-8,r:3,t:'Die Kerbekapell spielt – zum Schunkele!'}],
  build(r,B){r.grp.children[0].material=stdMat({color:0x8a6a48,roughness:0.85});const W=14,D=22;
    for(let z=-D/2+0.5;z<D/2;z+=1)for(const x of [-W/2+0.25,W/2-0.25])B.box('cloth',x,0,z,0.05,6.8,1,Math.round(z+D/2)%2?0xf4f0e2:0x1d4e89);
    for(let x=-W/2+0.5;x<W/2;x+=1)for(const z of [-D/2+0.25,D/2-0.25])if(z<0||Math.abs(x)>1.2)B.box('cloth',x,0,z,1,6.8,0.05,Math.round(x+W/2)%2?0xf4f0e2:0x1d4e89);
    for(let i=0;i<14;i++)B.box('cloth',-W/2+0.5+i,6.85,0,1,0.1,D,i%2?0xf4f0e2:0x1d4e89);
    for(const x of [-4,4]){for(const z0 of [-4,3]){B.sbox('wood',x,0,z0+2.5,0.7,0.75,5.5,0x9a7448);for(const s of [-1,1])B.sbox('wood',x+s*0.75,0,z0+2.5,0.3,0.45,5.5,0x8a6438);}}
    B.box('cloth',0,0,-8.5,9,0.08,3.4,0x7a1a1a);for(const x of [-3.5,3.5])B.sbox('metal',x,0,-9.6,0.8,1.6,0.6,0x2a2a2a);
    B.sbox('wood',6,0,3,1.0,1.1,5,0x6b4426);B.box('wood',6,1.1,3,1.2,0.06,5.2,0x4a2f1a);for(let i=0;i<8;i++)B.box('glass',6,1.16,1+i*0.55,0.12,0.18,0.12,0xffe7a0);
    B.box('wood',6.7,1.4,3,0.1,1.4,4,0x5a3a22);for(let i=0;i<6;i++)B.box('dark',6.65,1.6+(i%2)*0.5,1.4+Math.floor(i/2)*1.2,0.2,0.32,0.2,0x2b4a2b);
    for(let z=-9;z<=9;z+=0.9)for(const x of [-6.6,6.6])B.box('glow',x,5.6+0.25*Math.sin(z),z,0.1,0.1,0.1,[0xffd27a,0xff7a3d,0xfff1b0][Math.abs(Math.round(z))%3]);
    for(let x=-6;x<=6;x+=0.9)B.box('glow',x,6.2,-10.6,0.1,0.1,0.1,0xffd27a);},
  npcs(r){const T=['Ei, is des schee heut!','Noch e Schoppe, dann geh ich hoam. Gelooche.','Schunkele! Alle schunkele!','Die Kapell spielt besser wie letzt Johr. Lauter jedenfalls.','Wer hot mei Lebkuchenherz gesse?!'];
    for(const [x,z,f] of [[-3.25,-0.5,-Math.PI/2],[-3.25,2,-Math.PI/2],[-4.75,4,Math.PI/2],[3.25,-0.5,-Math.PI/2],[4.75,1.5,Math.PI/2],[4.75,6.5,Math.PI/2],[-4.75,7,Math.PI/2]])vPerson(r,x,z,f,{pose:'sit',lines:T});
    for(let i=0;i<3;i++)vPerson(r,mr(-1,1),mr(-4,7),mr(0,TAU),{lines:T});
    const band=[[-2.5,'tuba'],[0,'akk'],[2.5,'trommel']];for(const [x,k] of band){const h=vPerson(r,x,-8.6,0,{role:'stand',lines:['Un jetzt alle!','Eins, zwei, drei – Polka!','Die nächst Nummer is für die Kerbeborsch!']});gonsInstrument(h,k);}
    vPerson(r,6.6,3,-Math.PI/2,{role:'stand',lines:['Weck, Worscht un Woi! Vier Euro!','Schoppe? Weiß odder rot?','Bei mir gibt’s kei Wasser. Nur Woischorle.']});},
  interact(P,r){const h=P.h;const lx=h.x-r.ox,lz=h.z-r.oz;if(Math.hypot(lx-5.2,lz-3)>2.6){hint('Geh an die Theke rechts.',2,P);return;}
    if(G.money<4){hint('Vier Euro fehlen dir. Kerb ohne Geld is wie Weck ohne Worscht.',2.5,P);return;}G.money-=4;h.health=Math.min(100,(h.health||0)+25);GONS.kerb.bought=(GONS.kerb.bought||0)+1;
    const k=r.people[r.people.length-1];if(k&&k.alive)say(k,'Bitteschön! Weck, Worscht un Woi – Gonsenheimer Dreifaltigkeit!',3);hint('Weck, Worscht un Woi: +25 Gesundheit',2.5,P);chime([660,880]);},
  onEnter(){GONS.music.inTent=true;},onExit(){GONS.music.inTent=false;}};
VENUES.push(GONS_TENT);
// Die Hauptschleife blendet alle Menschen aus, sobald INDOOR gesetzt ist – auch die Gäste im Zelt. Vor dem Rendern wieder einblenden.
const _gonsRenderFrame=renderFrame;
renderFrame=function(){if(INDOOR&&INDOOR.venue===GONS_TENT)for(const o of INDOOR.people)if(!o.removed)o.g.visible=true;_gonsRenderFrame();};
function gonsInstrument(h,k){const gold=cmat(0xd4af37,0.3);let m;if(k==='tuba'){m=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.07,6,14),gold);m.position.set(0,0.4,0.22);h.hips.add(m);const b=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.07,0.35,10),gold);b.position.set(0,0.75,0.25);h.hips.add(b);}
  else if(k==='akk'){m=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.3,0.2),cmat(0xb3202a,0.5));m.position.set(0,0.38,0.22);h.hips.add(m);}
  else{m=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.24,14),cmat(0xf4f0e2,0.7));m.rotation.x=Math.PI/2;m.position.set(0,0.25,0.3);h.hips.add(m);}h.armL.rotation.x=h.armR.rotation.x=-0.9;}

// ===================== KERBMUSIK (WebAudio, eigene Polka-Melodie) =====================
// 16 Takte à vier Achtel (MIDI, 0 = Pause), Harmonien F / C7 / B
const GONS_MEL=[[72,69,72,77],[76,74,72,0],[70,72,74,70],[69,67,64,0],[65,69,72,69],[70,74,77,74],[72,70,67,64],[65,0,65,0],
  [74,74,77,74],[72,72,69,65],[67,69,70,72],[69,0,72,0],[70,74,70,67],[69,72,69,65],[67,72,70,64],[65,0,0,0]];
const GONS_HAR='FFCCFBCFBFCFBFCF';const GONS_CHORD={F:[[41,48],[57,60,65]],C:[[36,43],[55,58,64]],B:[[46,41],[58,62,65]]};
const GONS_MUS={g:null,lp:null,next:0,step:0};
function gonsTone(ctx,dest,midi,t,dur,type,vol){const o=ctx.createOscillator();o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);const e=ctx.createGain();
  e.gain.setValueAtTime(0.0001,t);e.gain.exponentialRampToValueAtTime(vol,t+0.015);e.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(e);e.connect(dest);o.start(t);o.stop(t+dur+0.05);GONS.music.notes++;}
function gonsMusicUpdate(){const M=GONS.music,K=GONS.kerb;let mode=null,vol=0;
  if(M.inTent&&K.built){mode='zelt';vol=0.1;}else if(K.on&&K.built){const d=gonsNearest(K.frame.cx,K.frame.cz);if(d<130&&!PLAYERS.some(P=>P.h&&P.h.room)){mode='kerb';vol=0.085*Math.pow(1-d/130,1.5);}}
  M.mode=mode;M.vol=vol;const ctx=AUD.ctx;if(!ctx||!AUD.master)return;
  if(!mode){if(GONS_MUS.g){const g=GONS_MUS.g;g.gain.setTargetAtTime(0,ctx.currentTime,0.4);setTimeout(()=>{try{g.disconnect();}catch(e){}},2500);GONS_MUS.g=null;}return;}
  if(!GONS_MUS.g){const g=GONS_MUS.g=ctx.createGain();g.gain.value=0;const lp=GONS_MUS.lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;g.connect(lp);lp.connect(AUD.master);GONS_MUS.next=ctx.currentTime+0.1;}
  GONS_MUS.g.gain.setTargetAtTime(vol,ctx.currentTime,0.3);GONS_MUS.lp.frequency.setTargetAtTime(mode==='zelt'?3200:1800,ctx.currentTime,0.3);
  const e8=0.24;if(GONS_MUS.next<ctx.currentTime)GONS_MUS.next=ctx.currentTime+0.05;
  while(GONS_MUS.next<ctx.currentTime+0.35){const t=GONS_MUS.next,st=GONS_MUS.step,bar=Math.floor(st/4)%16,b8=st%4;const ch=GONS_CHORD[GONS_HAR[bar]];
    const n=GONS_MEL[bar][b8];if(n){gonsTone(ctx,GONS_MUS.g,n,t,e8*0.95,'square',0.16);gonsTone(ctx,GONS_MUS.g,n-12,t,e8*0.9,'triangle',0.22);}
    if(b8%2===0)gonsTone(ctx,GONS_MUS.g,ch[0][b8/2],t,e8*1.6,'triangle',0.5);else for(const c of ch[1])gonsTone(ctx,GONS_MUS.g,c,t,e8*0.5,'sawtooth',0.05);
    GONS_MUS.step++;GONS_MUS.next+=e8;}}

// ===================== SCHNELLREISE =====================
const _gonsFtSpecials=ftSpecials;
ftSpecials=function(){const S=_gonsFtSpecials();for(const d of GONS.ft)S.push({n:d.n,g:'Besondere Orte',x:d.x,z:d.z,special:true});return S;};
function gonsFtTargets(){const L=GONS.ft;const add=(n,x,z)=>{const [fx,fz]=freeSpot(x,z,0.6);L.push({n,x:fx,z:fz});};
  const F=GONS.kerb.frame;if(F){const [x,z]=F.W(0,-12);add('Juxplatz – Gonsenheimer Kerb',x,z);}
  const W=GONS.wald;if(W.paths.length&&W.bb){const cx=(W.bb[0]+W.bb[2])/2,cz=(W.bb[1]+W.bb[3])/2;let best=null,bd=1e9;for(const p of W.paths)for(const q of p.pts){const d=Math.hypot(q[0]-cx,q[1]-cz);if(d<bd){bd=d;best=q;}}if(best)add('Lennebergwald – Waldweg',best[0],best[1]);}
  const B=GONS.bach.benches;if(B.length){const b=B[B.length>>1];add('Gonsbachtal – Bank am Bach',b.x+Math.sin(b.face)*1.5,b.z+Math.cos(b.face)*1.5);}
  const f=GONS.ort.fountain;if(f)add('Alt-Gonsenheim – Dorfbrunnen',f.x+2.6,f.z);}

// ===================== SETUP / UPDATE =====================
function setupGons(){GONS.convs=GONS_CONVS;GONS.tent=GONS_TENT;const hg0=HGG.tiles.reduce((n,t)=>n+(t?1:0),0);
  {const ap=PLACES.find(p=>/Gonsenheim/.test(p.name));if(ap)GONS.shoes=PICKUPS.find(p=>p.kind==='shoes'&&Math.hypot(p.x-ap.x,p.z-ap.z)<60)||null;}
  GONS.kerb.frame=gonsKerbFrame();
  gonsBuildForest();gonsBuildBach();gonsBuildOrt();gonsSceneDefs();gonsFtTargets();
  for(const [n,x,z] of [['Lennebergwald',GONS.wald.bb&&(GONS.wald.bb[0]+GONS.wald.bb[2])/2,GONS.wald.bb&&(GONS.wald.bb[1]+GONS.wald.bb[3])/2],['Gonsbachtal',-3600,-205]])if(x!==undefined&&x!==null)label(n,x,z,'lm');
  const S=GONS.stats,W=GONS.wald;S.hgTilesAdded=HGG.tiles.reduce((n,t)=>n+(t?1:0),0)-hg0;S.instBytes=W.trees*(64*2+12);S.forestMeshes=W.meshes;
  S.staticMeshes=W.meshes+(S.bachMeshes||0)+(S.ortMeshes||0);}
function updateGons(dt){if(mode!=='play')return;
  GONS.lodT-=dt;if(GONS.lodT<=0){GONS.lodT=0.4;gonsForestLOD(false);}
  gonsUpdateKerb(dt);
  GONS.sceneT-=dt;if(GONS.sceneT<=0){GONS.sceneT=0.5;gonsUpdateScenes(dt);}
  gonsTickScenes(dt);gonsUpdateWalkers(dt);gonsMusicUpdate();}
