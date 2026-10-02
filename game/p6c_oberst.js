// ===================== 36 Detail: Oberstadt, Hartenberg-Münchfeld + Zitadelle (Mainz) =====================
// Zitadelle begehbar (Wälle, Bastionen, Treppen, Tordurchfahrten, Drususstein, Museum in den Kasematten),
// Volkspark (Spielplatz, Wiesen, Picknick, Hundegassi), Universitätsmedizin (Beschilderung, Liegendanfahrt),
// Hartenberg-Münchfeld (Vorgärten mit Hecken und Zäunen). Alles läuft über die eigenen Wrapper unten.
const OBERST={zita:{walls:[],gates:[],stairs:[],venue:null,WH:7,T:null,I:null,C:null,tips:[],raster:null},drusus:null,
  volkspark:{poly:null,play:[],blankets:[],swings:[]},klinik:{signs:[],bay:null,helipad:null,heliR:32},
  hartenberg:{hedges:0,fences:0,mesh:[]},scenes:[],ft:[],placed:[],objs:[],meshes:0,geoBytes:0,mem:null};
const OBERST_WH=7,OBERST_PAR=1.1,OBERST_RW=12,OBERST_GATE_B=4.4;
// gemeinsame Bausteine (Materialien/Geometrien nur einmal)
const OBERST_C=h=>new THREE.Color(h);
function oberstGeoBytes(g){let n=g.index?g.index.count*4:0;for(const k in g.attributes){const a=g.attributes[k];n+=a.count*a.itemSize*4;}return n;}
function oberstAdd(m,cast=true){m.castShadow=cast;m.receiveShadow=true;scene.add(m);OBERST.meshes++;OBERST.objs.push(m);if(m.geometry&&m.geometry.attributes)OBERST.geoBytes+=oberstGeoBytes(m.geometry);return m;}
function oberstGBMesh(G,mat,cast=true){if(G.empty)return null;return oberstAdd(staticMesh(new THREE.Mesh(G.geo(),mat)),cast);}
// Zylinder/Kegelstumpf in einen GB (n Segmente, optional unregelmäßiger Radius für Bruchstein)
function oberstCyl(G,x,y0,z,r0,r1,h,n,col,jag=0,seed=1){const R=mulberry32(seed);const j=[];for(let i=0;i<n;i++)j.push(1+(R()-0.5)*jag);
  for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU,k0=j[i],k1=j[(i+1)%n];const p=(a,r,y,k)=>[x+Math.sin(a)*r*k,y,z+Math.cos(a)*r*k];
    G.quadOut(p(a0,r0,y0,k0),p(a1,r0,y0,k1),p(a1,r1,y0+h,k1),p(a0,r1,y0+h,k0),[i/n*r0*2,0],[(i+1)/n*r0*2,0],[(i+1)/n*r0*2,h/2],[i/n*r0*2,h/2],col,[x,y0+h/2,z]);
    if(r1>0.01)G.triOut([x,y0+h,z],p(a0,r1,y0+h,k0),p(a1,r1,y0+h,k1),[0,0],[1,0],[0,1],col,[x,y0-1,z]);}}
function oberstPlaced(x,z,r){OBERST.placed.push([x,z,r]);}
function oberstFree(x,z){const i=idx(x,z);return i>=0&&hgG(i)===0&&!(mfG(i)&4)&&!(mfG(i)&2)&&stepAt(x,z)===undefined&&!oberstNearHeli(x,z,2);}
function oberstNearHeli(x,z,r=0){const H=OBERST.klinik.helipad||POI.klinik;return Math.hypot(x-H[0],z-H[1])<OBERST.klinik.heliR+r;}
function oberstSign(text,x,y,z,face,w=2.6,h=0.55,bg='#f4f1ea',fg='#1d3557'){const t=freeAfterUpload(textTex(text,{w:512,h:Math.round(512*h/w),bg,fg,font:`700 ${Math.round(512*h/w*0.56)}px "Barlow Condensed", Arial Narrow, sans-serif`}));
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:0.7,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=face;return oberstAdd(m,false);}

// ===================== ZITADELLE: Grundriss =====================
// Bastionärer Grundriss (vier Bastionen, Kurtinen dazwischen), an die OSM-Lage angepasst: Spitzen nach O/S/W/N,
// Seitenlänge ≈ 325 m (real etwa 340 × 320 m). Bastion Drusus ist die Südspitze (Drususstein davor).
function oberstLineX(p,d,q,e){const den=d[0]*e[1]-d[1]*e[0];const t=((q[0]-p[0])*e[1]-(q[1]-p[1])*e[0])/den;return [p[0]+d[0]*t,p[1]+d[1]*t];}
function oberstZitaGeom(){const Z=OBERST.zita;const C=[27,636],D=[230,232,230,223],th=0.06;const u=[Math.cos(th),Math.sin(th)],v=[-Math.sin(th),Math.cos(th)];
  const dirs=[u,v,[-u[0],-u[1]],[-v[0],-v[1]]];const A=dirs.map((d,k)=>[C[0]+d[0]*D[k],C[1]+d[1]*D[k]]);const T=[],curt=[];
  for(let k=0;k<4;k++){const a=A[k],b=A[(k+1)%4];const s=Math.hypot(b[0]-a[0],b[1]-a[1]);const M=[(a[0]+b[0])/2,(a[1]+b[1])/2];let n=[C[0]-M[0],C[1]-M[1]];const nl=Math.hypot(n[0],n[1]);n=[n[0]/nl,n[1]/nl];
    const P=[M[0]+n[0]*s/8,M[1]+n[1]*s/8],f=s*2/7;const da=[P[0]-a[0],P[1]-a[1]],la=Math.hypot(da[0],da[1]),db=[P[0]-b[0],P[1]-b[1]],lb=Math.hypot(db[0],db[1]);
    const F1=[a[0]+da[0]/la*f,a[1]+da[1]/la*f],F2=[b[0]+db[0]/lb*f,b[1]+db[1]/lb*f];const G1=oberstLineX(F1,n,b,db),G2=oberstLineX(F2,n,a,da);
    T.push(a,F1,G1,G2,F2);curt.push({G1,G2,n});}
  // Innenkante der Wälle: Kurtinen um OBERST_RW nach innen versetzt, Schnittpunkte = Hofecken
  const I=[];for(let k=0;k<4;k++){const c0=curt[(k+3)%4],c1=curt[k];const off=c=>[c.G1[0]+c.n[0]*OBERST_RW,c.G1[1]+c.n[1]*OBERST_RW];const dir=c=>[c.G2[0]-c.G1[0],c.G2[1]-c.G1[1]];I.push(oberstLineX(off(c0),dir(c0),off(c1),dir(c1)));}
  Z.C=C;Z.T=T;Z.I=I;Z.tips=A.map((p,k)=>({x:p[0],z:p[1],name:['Ostbastion','Bastion Drusus','Westbastion','Nordbastion'][k]}));Z.D=D;}
// Raster 1 m: 0 = frei, 1 = Wallkrone, 2 = Brustwehr. Gebäudezellen bleiben 0 (deren Kollision gilt weiter).
function oberstZitaRaster(){const Z=OBERST.zita;const [x0,z0,x1,z1]=polyBBox(Z.T);const R={x0:Math.floor(x0)-1,z0:Math.floor(z0)-1};R.w=Math.ceil(x1)-R.x0+2;R.h=Math.ceil(z1)-R.z0+2;R.a=new Uint8Array(R.w*R.h);
  const T=Z.T;for(let j=0;j<R.h;j++)for(let i=0;i<R.w;i++){const x=R.x0+i+0.5,z=R.z0+j+0.5;if(!pip(x,z,T)||pip(x,z,Z.I))continue;const g=idx(x,z);if(g<0)continue;const hv=hgG(g);if(hv>0)continue;
    let dm=9;for(let k=0,l=T.length-1;k<T.length;l=k++){const d=segDist(x,z,T[l][0],T[l][1],T[k][0],T[k][1]).d;if(d<dm)dm=d;}R.a[j*R.w+i]=dm<0.9?2:1;}
  Z.raster=R;}
function oberstZitaAt(x,z){const R=OBERST.zita.raster;if(!R)return 0;const i=Math.floor(x-R.x0),j=Math.floor(z-R.z0);if(i<0||j<0||i>=R.w||j>=R.h)return 0;return R.a[j*R.w+i];}
function oberstStepFn(bb,f){STEP_FNS.push({bb,f});STEP_BB[0]=Math.min(STEP_BB[0],bb[0]);STEP_BB[1]=Math.min(STEP_BB[1],bb[1]);STEP_BB[2]=Math.max(STEP_BB[2],bb[2]);STEP_BB[3]=Math.max(STEP_BB[3],bb[3]);}
// Tordurchfahrten: Straßen (keine Fußwege), die den Wall kreuzen, werden zu Tunneln (ELEV: unten frei, oben begehbar)
function oberstZitaGates(){const Z=OBERST.zita;const R=Z.raster;const [x0,z0,x1,z1]=[R.x0,R.z0,R.x0+R.w,R.z0+R.h];
  for(const r of ROADS){if(r.type==='path'||r.bridge||!r.pts||r.pts.length<2)continue;if(!r.pts.some(p=>p[0]>x0&&p[0]<x1&&p[1]>z0&&p[1]<z1))continue;
    const hw=Math.max(3,(r.w||5)/2+0.6);let run=null;const flush=()=>{if(run&&run.pts.length>2)Z.gates.push(run);run=null;};
    for(let k=0;k+1<r.pts.length;k++){const a=r.pts[k],b=r.pts[k+1];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const n=Math.max(1,Math.ceil(L/0.5));
      for(let s=0;s<=n;s++){const x=a[0]+(b[0]-a[0])*s/n,z=a[1]+(b[1]-a[1])*s/n;const inR=pip(x,z,Z.T)&&!pip(x,z,Z.I);
        if(inR){if(!run)run={pts:[],hw,name:r.name||'',dir:[(b[0]-a[0])/L,(b[1]-a[1])/L]};run.pts.push([x,z]);}else flush();}}
    flush();}
  oberstRampPassages();
  // Haupttor: die Durchfahrt am Kommandantenbau (Bau A, 1696 über dem Tor zur Stadt errichtet)
  const kb=BUILDINGS.find(b=>b.name&&/Kommandantenbau/.test(b.name));const ref=kb?[kb.x,kb.z]:[90,575];let best=null,bd=1e9;
  Z.gates.forEach(g=>{const m=g.pts[g.pts.length>>1];const d=Math.hypot(m[0]-ref[0],m[1]-ref[1]);g.mid=m;if(!g.ramp&&d<bd){bd=d;best=g;}});
  Z.gates.forEach((g,k)=>{g.name=g.ramp?'Rampendurchfahrt':g===best?'Haupttor':'Tor '+(k+1);});
  for(const g of Z.gates){for(const p of g.pts){const r=Math.ceil(g.hw);for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dz*dz>g.hw*g.hw)continue;const x=p[0]+dx,z=p[1]+dz;const i=Math.floor(x-R.x0),j=Math.floor(z-R.z0);
        if(i<0||j<0||i>=R.w||j>=R.h||!R.a[j*R.w+i])continue;R.a[j*R.w+i]=0;elevSetI(idx(x,z),OBERST_GATE_B,OBERST_WH);}}}}
// Stuntrampen (Welle 1) liegen schon, bevor der Wall entsteht: kreuzt eine Anlauf-/Sprung-/Landebahn den Wall
// abseits der Straßentore, bekommt sie eine eigene Durchfahrt wie ein Tor.
function oberstRampPassages(){if(typeof STUNT==='undefined')return;const Z=OBERST.zita;const S=STUNT;
  for(const R of S.ramps){if(Math.hypot(R.x-Z.C[0],R.z-Z.C[1])>600)continue;let run=null;const flush=()=>{if(run&&run.pts.length>2)Z.gates.push(run);run=null;};
    for(let t=-S.RUN;t<=S.LEN+S.LAND;t+=0.5){const x=R.x+R.dx*t,z=R.z+R.dz*t;let hit=false;
      for(const l of [-2.6,-1.3,0,1.3,2.6]){const px=x+R.rx*l,pz=z+R.rz*l;if(pip(px,pz,Z.T)&&!pip(px,pz,Z.I)){hit=true;break;}}
      if(hit){if(!run)run={pts:[],hw:3.6,name:'',ramp:R.id,dir:[R.dx,R.dz]};run.pts.push([x,z]);}else flush();}
    flush();}}
function oberstNearGate(x,z,r){for(const g of OBERST.zita.gates)for(const p of g.pts)if(Math.hypot(p[0]-x,p[1]-z)<g.hw+r)return g;return null;}
// Treppen innen an der Hofmauer, parallel zur Wand (Stufe 0,3 m hoch, 0,5 m tief)
function oberstZitaStairs(){const Z=OBERST.zita;const I=Z.I;const W=3.2,L=Math.ceil(OBERST_WH/0.3)*0.5;
  const prefer=[[0.5,0.38,0.62,0.28,0.72],[0.82,0.72,0.6,0.5,0.4],[0.18,0.3,0.42,0.55,0.65],[0.5,0.4,0.6,0.3,0.7]];
  for(let k=0;k<4;k++){const a=I[k],b=I[(k+1)%4];const len=Math.hypot(b[0]-a[0],b[1]-a[1]);const e=[(b[0]-a[0])/len,(b[1]-a[1])/len];
    let m=[-e[1],e[0]];const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(!pip(mid[0]+m[0]*2,mid[1]+m[1]*2,I))m=[-m[0],-m[1]];
    // Bastion Drusus (Südecke = I[1]) bekommt die Treppe nahe der Ecke: Kanten 0 (Ende) und 1 (Anfang)
    const fr=k===0?prefer[1]:k===1?prefer[2]:prefer[k===2?0:3];
    for(const f of fr){const s0=[a[0]+e[0]*(len*f-L/2)+m[0]*0.6,a[1]+e[1]*(len*f-L/2)+m[1]*0.6];let ok=true;
      for(let du=0;du<=L&&ok;du+=0.5)for(let dv=0.4;dv<=W&&ok;dv+=0.5){const x=s0[0]+e[0]*du+m[0]*dv,z=s0[1]+e[1]*du+m[1]*dv;const i=idx(x,z);if(i<0||hgG(i)>0||(mfG(i)&2)||oberstZitaAt(x,z)||oberstNearGate(x,z,4))ok=false;}
      // die Wallkrone hinter der obersten Stufe muss begehbar sein
      if(ok){const t=[s0[0]+e[0]*(L-0.5)-m[0]*2.5,s0[1]+e[1]*(L-0.5)-m[1]*2.5];if(oberstZitaAt(t[0],t[1])!==1)ok=false;}
      if(!ok)continue;
      const st={x:s0[0],z:s0[1],e,m,L,W,top:[s0[0]+e[0]*L-m[0]*3,s0[1]+e[1]*L-m[1]*3],bottom:[s0[0]-e[0]*1.5+m[0]*W/2,s0[1]-e[1]*1.5+m[1]*W/2],face:Math.atan2(e[0],e[1])};Z.stairs.push(st);
      const xs=[],zs=[];for(const du of [0,L])for(const dv of [-1.2,W]){xs.push(s0[0]+e[0]*du+m[0]*dv);zs.push(s0[1]+e[1]*du+m[1]*dv);}
      oberstStepFn([Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)],(x,z)=>{const dx=x-st.x,dz=z-st.z;const du=dx*e[0]+dz*e[1],dv=dx*m[0]+dz*m[1];if(du<0||du>L||dv>W||dv<(du>L-1.2?-1.2:0))return undefined;const h=Math.min(OBERST_WH,Math.ceil(du/0.5)*0.3);return h>0?h:undefined;});
      break;}}}
function oberstZitaCollision(){const R=OBERST.zita.raster;oberstStepFn([R.x0,R.z0,R.x0+R.w,R.z0+R.h],(x,z)=>{const v=oberstZitaAt(x,z);return v===1?OBERST_WH:v===2?OBERST_WH+OBERST_PAR:undefined;});}
// Bäume auf den Wällen mit anheben (sonst stecken sie im Wall)
function oberstLiftTrees(){const Z=OBERST.zita;const R=Z.raster;const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();let n=0;
  for(const o of (Array.isArray(scene.children)?scene.children:[])){if(!o.isInstancedMesh||(o.material!==MAT.leaf&&o.material!==MAT.bark))continue;const bs=o.boundingSphere;if(bs&&(bs.center.x+bs.radius<R.x0||bs.center.x-bs.radius>R.x0+R.w||bs.center.z+bs.radius<R.z0||bs.center.z-bs.radius>R.z0+R.h))continue;
    let ch=false;for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.decompose(p,q,s);if(p.y>0.01)continue;const v=oberstZitaAt(p.x,p.z);if(!v&&!oberstNearGate(p.x,p.z,0))continue;p.y=OBERST_WH;m.compose(p,q,s);o.setMatrixAt(i,m);ch=true;n++;}
    if(ch){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();}}
  for(const t of TREES)if(oberstZitaAt(t.x,t.z))t.y=OBERST_WH;Z.treesLifted=n;}

// ===================== ZITADELLE: Modell =====================
const OBERST_WALL=0xc9a684,OBERST_WALL2=0xb48e6c,OBERST_CORD=0xd8bf9c;
function oberstZitaBuild(){const Z=OBERST.zita;const G=new GB();const WH=OBERST_WH,PAR=OBERST_PAR;
  const gateEnd=(x,z,r)=>{for(const g of Z.gates){const a=g.pts[0],b=g.pts[g.pts.length-1];if(Math.hypot(a[0]-x,a[1]-z)<g.hw+r||Math.hypot(b[0]-x,b[1]-z)<g.hw+r)return g;}return null;};
  const wallRing=(P,outer)=>{for(let k=0;k<P.length;k++){const a=P[k],b=P[(k+1)%P.length];const len=Math.hypot(b[0]-a[0],b[1]-a[1]);const e=[(b[0]-a[0])/len,(b[1]-a[1])/len];let n=[-e[1],e[0]];
      const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];const inside=outer?pip(mid[0]+n[0]*1.5,mid[1]+n[1]*1.5,Z.T):!pip(mid[0]+n[0]*1.5,mid[1]+n[1]*1.5,Z.I);if(!inside)n=[-n[0],-n[1]];
      const rot=Math.atan2(e[0],e[1]);const np=Math.max(1,Math.ceil(len/3));const pl=len/np;Z.walls.push({a,b,outer,len});
      for(let s=0;s<np;s++){const t=(s+0.5)*pl;const cx=a[0]+e[0]*t,cz=a[1]+e[1]*t;const g=gateEnd(cx,cz,0.8);const y0=g?OBERST_GATE_B:-0.3;const col=((s+k)%5===0)?OBERST_C(OBERST_WALL2):OBERST_C(OBERST_WALL);
        if(outer){G.box(cx+n[0]*0.7,y0,cz+n[1]*0.7,1.4,WH-y0,pl+0.02,rot,col,3,false);G.box(cx-n[0]*0.15,WH-1.0,cz-n[1]*0.15,0.5,0.32,pl+0.02,rot,OBERST_C(OBERST_CORD),2,true);
          G.box(cx+n[0]*0.4,WH,cz+n[1]*0.4,0.8,PAR,pl+0.02,rot,OBERST_C(OBERST_CORD),2,true);}
        else G.box(cx+n[0]*0.45,y0,cz+n[1]*0.45,0.9,WH-y0+0.15,pl+0.02,rot,col,3,true);}}};
  wallRing(Z.T,true);wallRing(Z.I,false);
  // Schilderhäuschen an den Bastionsspitzen
  for(const t of Z.tips){const dx=Z.C[0]-t.x,dz=Z.C[1]-t.z,L=Math.hypot(dx,dz);const x=t.x+dx/L*1.6,z=t.z+dz/L*1.6;oberstCyl(G,x,WH+0.2,z,1.0,1.0,2.4,10,OBERST_C(OBERST_CORD));oberstCyl(G,x,WH+2.6,z,1.25,0.05,1.5,10,OBERST_C(0x5d6670));oberstCyl(G,x,WH-1.4,z,0.35,1.0,1.6,10,OBERST_C(OBERST_WALL2));}
  // Tordurchfahrten: Seitenwände und Decke
  for(const g of Z.gates){for(let k=0;k+1<g.pts.length;k+=2){const a=g.pts[k],b=g.pts[Math.min(g.pts.length-1,k+2)];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.2)continue;const e=[(b[0]-a[0])/L,(b[1]-a[1])/L],n=[-e[1],e[0]];const rot=Math.atan2(e[0],e[1]);const cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
      for(const s of [-1,1])G.box(cx+n[0]*s*(g.hw+0.4),0,cz+n[1]*s*(g.hw+0.4),0.8,OBERST_GATE_B,L+0.05,rot,OBERST_C(OBERST_WALL2),3,false);G.box(cx,OBERST_GATE_B-0.05,cz,g.hw*2+1.6,0.4,L+0.05,rot,OBERST_C(0x9c7f62),3,false);}
    if(g.name==='Haupttor'){const a=g.pts[0];label('Haupttor (Zitadelle)',a[0],a[1],'small');}}
  // Treppenstufen
  for(const st of Z.stairs){const n=Math.round(st.L/0.5);for(let s=1;s<=n;s++){const du=(s-0.5)*0.5,h=Math.min(WH,s*0.3);const cx=st.x+st.e[0]*du+st.m[0]*st.W/2,cz=st.z+st.e[1]*du+st.m[1]*st.W/2;G.box(cx,0,cz,st.W,h,0.5,st.face,OBERST_C(s%2?0xc2a383:0xb89a7b),2,true);}}
  oberstGBMesh(G,MAT.trim);
  // Wallkrone: Rasen mit Loch für den Hof
  const sh=new THREE.Shape(Z.T.map(p=>new THREE.Vector2(p[0],-p[1])));sh.holes.push(new THREE.Path(Z.I.map(p=>new THREE.Vector2(p[0],-p[1]))));
  const geo=new THREE.ShapeGeometry(sh);geo.rotateX(-Math.PI/2);{const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/6,uv.getY(i)/6);}
  const top=new THREE.Mesh(geo,MAT.grass);top.position.y=WH+0.02;oberstAdd(staticMesh(top),false);
  // Wege auf der Wallkrone (Kies) entlang der Brustwehr
  const P=new GB();for(let k=0;k<Z.T.length;k++){const a=Z.T[k],b=Z.T[(k+1)%Z.T.length];const len=Math.hypot(b[0]-a[0],b[1]-a[1]);const e=[(b[0]-a[0])/len,(b[1]-a[1])/len];let n=[-e[1],e[0]];const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(!pip(mid[0]+n[0]*1.5,mid[1]+n[1]*1.5,Z.T))n=[-n[0],-n[1]];
    P.box(mid[0]+n[0]*2.6,WH,mid[1]+n[1]*2.6,2.6,0.05,len,Math.atan2(e[0],e[1]),OBERST_C(0xcfc3ad),2,true);}
  oberstGBMesh(P,MAT.flat,false);
  for(const t of Z.tips)label(t.name,t.x+(Z.C[0]-t.x)*0.25,t.z+(Z.C[1]-t.z)*0.25,'small');}

// ===================== DRUSUSSTEIN =====================
// Römisches Ehrenmal (Kenotaph) für den Feldherrn Drusus, gest. 9 v. Chr.; heute ein etwa 20 m hoher Kern aus Gussmauerwerk.
function oberstDrusus(){const p=(OSM.pl&&OSM.pl.drusus)||[13,740];const x=p[0],z=p[1];
  // altes Klötzchen-Gebäude aus den OSM-Daten durch das Modell ersetzen
  const old=BUILDINGS.filter(b=>b.name==='Drususstein'&&Math.hypot(b.x-x,b.z-z)<20);
  for(const b of old)BUILDINGS.splice(BUILDINGS.indexOf(b),1);
  if(old.length){const k=chunkKey(x,z);const c=CITY.chunks.get(k);if(c){c.list=c.list.filter(b=>!old.includes(b));if(c.low){disposeGroup(c.low);c.low=buildChunkGroup(c,-1);}if(c.high){disposeGroup(c.high);c.high=buildChunkGroup(c,QS.detail);if(c.low)c.low.visible=false;}}}
  const G=new GB();const st=OBERST_C(0xa49884),dk=OBERST_C(0x8a7f6c),lt=OBERST_C(0xb8ad98);
  oberstCyl(G,x,0,z,6.4,6.2,0.8,16,lt);oberstCyl(G,x,0.8,z,5.6,5.6,0.4,16,OBERST_C(0xc4b9a4));
  oberstCyl(G,x,1.2,z,5.0,4.8,7.5,16,st,0.08,3);oberstCyl(G,x,8.7,z,4.8,4.4,0.5,16,lt,0.06,4);
  oberstCyl(G,x,9.2,z,4.3,3.9,6.5,14,dk,0.12,5);oberstCyl(G,x,15.7,z,3.9,2.4,4.6,12,st,0.28,6);
  // ausgebrochene Krone
  const R=mulberry32(77);for(let i=0;i<6;i++){const a=R()*TAU,r=R()*1.4;G.box(x+Math.sin(a)*r,19.6,z+Math.cos(a)*r,1.2+R(),0.6+R()*1.4,1.1+R(),a,dk,2,true);}
  // Infotafel
  const ax=x+7.2,az=z-1;G.box(ax,0,az,0.12,1.1,0.12,0,OBERST_C(0x333333),2,true);
  oberstGBMesh(G,MAT.trim);oberstSign('DRUSUSSTEIN · Römisches Ehrenmal für Drusus · 9 v. Chr.',ax,1.45,az,Math.PI/2,2.6,0.5,'#2b3a42','#f1e9d6');
  label('Drususstein',x,z,'lm');oberstPlaced(x,z,7);
  OBERST.drusus={x,z,h:20.2,r:5.0,replaced:old.length};}

// ===================== MUSEUM IN DEN KASEMATTEN (Bau D) =====================
function oberstVenue(){const bd=BUILDINGS.find(b=>b.name==='Bau D')||null;const Z=OBERST.zita;
  const c=bd?[bd.x,bd.z]:[8,703];const dx=Z.C[0]-c[0],dz=Z.C[1]-c[1],L=Math.hypot(dx,dz)||1;const door=rayDoor(c[0]+dx/L*25,c[1]+dz/L*25,c[0],c[1]);
  const W=16,D=36,H=7;
  const v={id:'zitamuseum',name:'Stadthistorisches Museum',sub:'Zitadelle · Bau D · Kasematten',W,D,H,wall:0xb8a48a,ceil:0x9d8a70,hemiI:0.42,exp:0.95,lampI:26,lampD:22,door,
    lights:[[0,5,-12],[0,5,0],[0,5,12],[-5,4,-4],[5,4,6]],
    wp:[[0,12],[0,4],[0,-4],[0,-12],[-4,-8],[4,-8],[-4,6],[4,6]],
    spawn:[0,D/2-2.4,Math.PI],exits:[{x:0,z:D/2-0.6,w:1.6,d:0.8,to:'door'}],
    hints:[{x:0,z:-14,r:3.5,t:'Modell der Zitadelle – ab 1655 unter Kurfürst Johann Philipp von Schönborn ausgebaut.'},{x:-5.5,z:-2,r:3,t:'Römische Steine aus Mogontiacum.'},{x:5.5,z:4,r:3,t:'Kasematte: bombensicherer Raum im Wall.'}],
    build(r,B){const hw=W/2;
      // Tonnengewölbe als abgetreppte Bögen
      for(let s=0;s<5;s++){const y=3.4+s*0.62,w=Math.max(1,W-1.6-s*2.6);for(const sd of [-1,1])B.box('stone',sd*(w/2+0.65),y,0,1.3,0.62,D,0xa6927a);}
      for(let z=-D/2+3;z<D/2-1;z+=6)for(const sd of [-1,1])B.box('sand',sd*(hw-0.45),0,z,0.9,3.4,1.0,0x9c8468);
      // Vitrinen mit Fundstücken
      for(const [x,z] of [[-5,-8],[5,-8],[-5,2],[5,10]]){B.sbox('wood',x,0,z,2.2,0.9,1.2,0x5a3a22);B.box('glass',x,0.9,z,2.1,0.8,1.1,0xbfd9e6);B.box('gold',x-0.4,0.95,z,0.3,0.2,0.3,0xc9a23a);B.box('dark',x+0.4,0.95,z,0.5,0.12,0.25,0x4a3a2a);}
      // Römische Steine
      for(const [x,z,h] of [[-6,-2,1.6],[-6,0.5,1.1],[-5.6,-4.2,1.3]])B.sbox('stone',x,0,z,1.0,h,0.7,0xc8bba4);
      // Kanone auf Lafette
      B.sbox('wood',4.8,0,0,1.4,0.7,2.2,0x6b4426);B.box('dark',4.8,0.7,0.3,0.42,0.42,2.6,0x2a2a2a);for(const s of [-1,1])B.box('dark',4.8+s*0.75,0,-0.3,0.12,0.9,0.9,0x3a2a1a);
      // Modell der Zitadelle (Sternform)
      B.sbox('wood',0,0,-14,4.4,0.8,4.4,0x5a3a22,Math.PI/4);B.box('floor',0,0.8,-14,3.6,0.12,3.6,0x7a9a5a,Math.PI/4);for(let k=0;k<4;k++){const a=k*Math.PI/2;B.box('sand',Math.sin(a)*1.9,0.8,-14+Math.cos(a)*1.9,0.9,0.35,0.9,0xc9a684,Math.PI/4);}
      B.box('sand',0,0.8,-14,2.6,0.3,0.25,0xc9a684);B.box('sand',0,0.8,-14,0.25,0.3,2.6,0xc9a684);
      // Bänke, Eingangstür
      B.sbox('wood',0,0,6,3,0.45,0.6,0x6b4426);B.box('wood',0,0,D/2-0.2,2.6,3.2,0.3,0x3a2512);B.box('glow',0,3.3,D/2-0.25,2.6,0.3,0.05,0xfff1c8);},
    npcs(r){vPerson(r,0,D/2-4,Math.PI,{role:'stand',lines:['Ei gude! Eintritt is heut frei, wie immer.','Bitte die Vitrine net abschlabbern.','Die Kanon is net gelade. Hoff ich.','Die Römer warn vor uns hier – un die habbe aach schon gebabbelt.']});
      vPerson(r,0,-11.5,0,{role:'stand',lines:['Die Zitadell is ab 1655 gebaut worn. Vier Bastione, gell!','Do drübbe steht de Drususstein. Älter als jeder Schoppe.','Der Kommandantebau übberm Tor is von 1696.']});
      const T=['Guck emol, die alt Kanon!','Hier unne is es schee kühl.','Die Römer hadde aach schon Woi, wusst isch’s doch.','Wo geht’s dann do zur Bastion?','Isch hab Hunger. Gibt’s hier Weck?'];
      for(let k=0;k<4;k++)vPerson(r,mr(-5,5),mr(-12,12),mr(0,6),{lines:T});}};
  VENUES.push(v);if(VEN_PLACED&&!v.labeled){v.labeled=true;label(v.name+' (begehbar)',door[0],door[1],'small');}
  OBERST.zita.venue=v;oberstPlaced(door[0],door[1],2);}

function oberstZitadelle(){oberstZitaGeom();oberstZitaRaster();oberstZitaGates();oberstZitaStairs();oberstZitaCollision();oberstZitaBuild();oberstLiftTrees();oberstDrusus();oberstVenue();}


// ===================== SZENEN: Figuren mit Mundart, werden nur in Spielernähe erzeugt =====================
function oberstScene(id,name,x,z,spawn,lines,o={}){const s={id,name,x,z,spawn,lines,people:[],walkers:[],swingers:[],active:false,lineT:mr(2,5),R:o.R||170};OBERST.scenes.push(s);return s;}
function oberstDress(h,col){let sm=null;h.g.traverse(m=>{if(m.geometry&&(m.geometry===BODY.torsoM||m.geometry===BODY.torsoF))sm=m.material;});if(!sm)return;const nm=clothMat(col,'shirt');h.g.traverse(m=>{if(m.material===sm)m.material=nm;});}
function oberstPerson(s,x,z,y,face,o={}){const h=new Human('ped');h.x=x;h.z=z;h.y=y;h.facing=face;h.state='roof';h.oberst=s.id;h.walkSpeed=o.speed||1.1;
  if(o.sit){h.hips.position.y=o.sitH??0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;}
  if(o.kid)h.g.scale.setScalar(0.62);if(o.coat)oberstDress(h,o.coat);if(o.prop){const m=new THREE.Mesh(o.prop.g,o.prop.m);m.position.set(0.1,-0.85,0.25);h.armR.add(m);}
  h.oberstSit=!!o.sit;h.sync();s.people.push(h);return h;}
const OBERST_DOG={};
function oberstDog(){if(!OBERST_DOG.body){OBERST_DOG.body=new THREE.BoxGeometry(0.28,0.24,0.62);OBERST_DOG.head=new THREE.BoxGeometry(0.22,0.22,0.26);OBERST_DOG.leg=new THREE.BoxGeometry(0.07,0.26,0.07);OBERST_DOG.tail=new THREE.BoxGeometry(0.05,0.05,0.28);}
  const mat=cmat(mpick([0x8a5a2b,0x2b2017,0xd9c7a0,0x5c4a3a,0xf0f0ea]),0.85);const g=new THREE.Group();const add=(geo,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
  add(OBERST_DOG.body,0,0.4,0);add(OBERST_DOG.head,0,0.56,0.38);const legs=[[-0.1,0.2],[0.1,0.2],[-0.1,-0.2],[0.1,-0.2]].map(([x,z])=>add(OBERST_DOG.leg,x,0.14,z));const tail=add(OBERST_DOG.tail,0,0.52,-0.4);tail.rotation.x=0.6;
  scene.add(g);return {g,legs,tail,ph:Math.random()*6};}
function oberstWalker(s,path,o={}){const p=path[0];const h=oberstPerson(s,p[0],p[1],groundY(p[0],p[1]),0,o);const w={h,path,i:1,dir:1,stuck:0,dog:o.dog?oberstDog():null};s.walkers.push(w);return w;}
function oberstSpawn(s){s.active=true;try{s.spawn(s);}catch(e){console.warn('oberst scene',s.id,e);}}
function oberstDespawn(s){s.active=false;for(const h of s.people)if(!h.removed)h.remove();for(const w of s.walkers)if(w.dog)scene.remove(w.dog.g);for(const k of s.swingers)scene.remove(k.seat);s.people=[];s.walkers=[];s.swingers=[];}
function oberstUpdateScene(s,dt,px,pz){
  for(const h of s.people){if(h.removed||!h.alive||h.state!=='roof'||s.walkers.some(w=>w.h===h))continue;if(h.fx&&h.face.visible)h.updateFace();h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}
  for(const w of s.walkers){const h=w.h;if(h.removed||!h.alive||h.state!=='roof')continue;const t=w.path[w.i];const dx=t[0]-h.x,dz=t[1]-h.z;
    if(Math.hypot(dx,dz)<1.2||w.stuck>2.5){w.stuck=0;w.i+=w.dir;if(w.i>=w.path.length||w.i<0){w.dir=-w.dir;w.i+=2*w.dir;w.i=clamp(w.i,0,w.path.length-1);}}
    const mv=moveHuman(h,dx,dz,h.walkSpeed,dt);if(mv<0.05)w.stuck+=dt;faceTo(h,dx,dz,dt,5);h.animate(dt,mv);h.y=groundY(h.x,h.z,h.y);h.sync();
    if(w.dog){const d=w.dog;d.ph+=dt*8;const fx=Math.sin(h.facing),fz=Math.cos(h.facing);const tx=h.x+fx*1.6+fz*0.7,tz=h.z+fz*1.6-fx*0.7;d.g.position.x+=(tx-d.g.position.x)*Math.min(1,dt*3);d.g.position.z+=(tz-d.g.position.z)*Math.min(1,dt*3);d.g.position.y=h.y;d.g.rotation.y=h.facing;
      const k=mv>0.1?0.5:0;d.legs.forEach((l,i)=>{l.rotation.x=Math.sin(d.ph+(i%2?Math.PI:0))*k;});d.tail.rotation.z=Math.sin(d.ph*1.6)*0.5;}}
  for(const k of s.swingers){k.ph+=dt*k.sp;const a=Math.sin(k.ph)*0.55;k.a=a;k.seat.rotation.x=a;const h=k.h;if(h&&!h.removed&&h.alive&&h.state==='roof'){const L=k.L-0.45;h.x=k.x+k.fx*Math.sin(a)*L;h.z=k.z+k.fz*Math.sin(a)*L;h.y=k.y-Math.cos(a)*L-0.5;h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=k.face;}}
  s.lineT-=dt;if(s.lineT<=0){s.lineT=mr(5,10);const c=s.people.filter(h=>!h.removed&&h.alive&&h.state==='roof'&&!h.bubble&&Math.hypot(h.x-px,h.z-pz)<32);if(c.length){const h=mpick(c);say(h,mpick(s.lines),3.8,'quiet');s.said=(s.said||0)+1;}}}

// ===================== ZITADELLE: Szenen =====================
function oberstZitaScenes(){const Z=OBERST.zita;const d=OBERST.drusus;const S=Z.tips[1];const sx=S.x+(Z.C[0]-S.x)*0.3,sz=S.z+(Z.C[1]-S.z)*0.3;
  oberstScene('zita_wall','Zwei Rentner auf der Bastion Drusus',sx,sz,s=>{const f=Math.atan2(S.x-sx,S.z-sz);for(const o of [-0.9,0.9])oberstPerson(s,sx+Math.cos(f)*o,sz-Math.sin(f)*o,OBERST_WH,f,{speed:0.8});},
    ['Ei gude, do owwe sieht mer bis nach Wissbade. Leider.','Hier hawwe die Franzose schon gestanne. Un die Preuße. Un jetzt mir.','Mei Opa hot gesacht: Die Zitadell hält alles aus. Nur kaa Fassenacht.','Gugg emol, de Dom! Der steht immer noch.','Die Bastion heißt Drusus. Wie de Stein. Logisch, gell?','Weck, Worscht un Woi – un dann uff die Mauer. So geht Sonntag.']);
  if(d)oberstScene('zita_drusus','Führung am Drususstein',d.x,d.z,s=>{const gx=d.x+7.5,gz=d.z+2;oberstPerson(s,gx,gz,0,-Math.PI/2,{coat:0x2a6f97});for(let k=0;k<4;k++){const a=-0.7+k*0.45;oberstPerson(s,gx+4+Math.cos(a)*2.4,gz+Math.sin(a)*2.4,0,-Math.PI/2+mr(-0.3,0.3));}},
    ['Des do is de Drususstein – zwanzisch Meter Römer-Beton.','Errichtet fer de Drusus, 9 vor Christus. Da war Meenz noch Mogontiacum.','Nein, mer derf net nuffklettern. Aach net, wenn de Opa sacht, er hätt’s gemacht.','Die Römer hawwe hier Spiele abgehalte. Mir mache des heut mit de Fassenacht.','Bitte zusammebleiwe, die Grupp! Do hinne geht’s ins Museum.']);}

// ===================== VOLKSPARK =====================
function oberstPathsIn(bb){return ROADS.filter(r=>r.type==='path'&&r.pts&&r.pts.length>1&&r.pts.some(p=>p[0]>bb[0]&&p[0]<bb[2]&&p[1]>bb[1]&&p[1]<bb[3]));}
function oberstDistPaths(x,z,paths){let d=1e9;for(const r of paths)for(let k=0;k+1<r.pts.length;k++){const a=r.pts[k],b=r.pts[k+1];const q=segDist(x,z,a[0],a[1],b[0],b[1]).d;if(q<d)d=q;}return d;}
function oberstVolkspark(){const V=OBERST.volkspark;const park=AREAS.find(a=>a.name==='Volkspark'&&a.kind==='park');if(!park)return;V.poly=park.poly;const pg=AREAS.find(a=>a.name==='Spielplatz Volkspark')||null;
  const R=mulberry32(36);const G=new GB();const C=OBERST_C;const bb=polyBBox(park.poly);const paths=oberstPathsIn(bb);
  // Spielplatz-Geräte im Spielplatz-Polygon
  const pp=pg?pg.poly:park.poly;const pb=polyBBox(pp);const taken=[];
  const spot=(r)=>{for(let k=0;k<400;k++){const x=pb[0]+R()*(pb[2]-pb[0]),z=pb[1]+R()*(pb[3]-pb[1]);if(!pip(x,z,pp))continue;let ok=true;for(let a=0;a<8&&ok;a++){const q=a/8*TAU;if(!oberstFree(x+Math.sin(q)*r,z+Math.cos(q)*r)||!pip(x+Math.sin(q)*r,z+Math.cos(q)*r,pp))ok=false;}
      if(!ok||!oberstFree(x,z)||taken.some(t=>Math.hypot(t[0]-x,t[1]-z)<t[2]+r+1)||oberstDistPaths(x,z,paths)<r+0.5)continue;taken.push([x,z,r]);oberstPlaced(x,z,r);return [x,z];}return null;};
  const wood=C(0x8a5a32),red=C(0xd62828),yel=C(0xf4b400),blu=C(0x1d70b8),grn=C(0x3a9d4a),steel=C(0x8d99a6),sand=C(0xe8d5a3);
  // Schaukeln (zwei Gestelle à zwei Sitze, Sitze bewegen sich)
  for(let n=0;n<2;n++){const p=spot(4.2);if(!p)continue;const face=R()*Math.PI;const ex=[Math.cos(face),-Math.sin(face)],ez=[Math.sin(face),Math.cos(face)];const H=2.6;
    for(const s of [-1.7,1.7])for(const t of [-0.8,0.8]){const a=[p[0]+ex[0]*s+ez[0]*t,0,p[1]+ex[1]*s+ez[1]*t],b=[p[0]+ex[0]*s,H,p[1]+ex[1]*s];G.beam(a,b,0.12,0.12,steel);}
    G.beam([p[0]-ex[0]*1.9,H,p[1]-ex[1]*1.9],[p[0]+ex[0]*1.9,H,p[1]+ex[1]*1.9],0.14,0.14,steel);
    for(const s of [-0.75,0.75])V.swings.push({x:p[0]+ex[0]*s,z:p[1]+ex[1]*s,y:H,L:H-0.5,face,fx:ez[0],fz:ez[1]});
    V.play.push({kind:'schaukel',x:p[0],z:p[1]});}
  // Rutsche mit Turm
  {const p=spot(4.5);if(p){const f=R()*TAU,ex=[Math.cos(f),-Math.sin(f)],ez=[Math.sin(f),Math.cos(f)];G.box(p[0],0,p[1],1.6,1.6,1.6,f,wood,2,true);for(const a of [-0.7,0.7])for(const b of [-0.7,0.7])G.box(p[0]+ex[0]*a+ez[0]*b,1.6,p[1]+ex[1]*a+ez[1]*b,0.12,1.4,0.12,f,wood,2,true);
      G.box(p[0],3.0,p[1],1.9,0.9,1.9,f,red,2,true);const s0=[p[0]+ez[0]*0.8,1.6,p[1]+ez[1]*0.8],s1=[p[0]+ez[0]*4.2,0.25,p[1]+ez[1]*4.2];G.beam(s0,s1,0.75,0.12,yel);
      for(let k=0;k<5;k++)G.box(p[0]-ez[0]*(1.0+k*0.25),k*0.32,p[1]-ez[1]*(1.0+k*0.25),0.8,0.08,0.25,f,steel,2,true);V.play.push({kind:'rutsche',x:p[0],z:p[1]});}}
  // Wippe
  {const p=spot(2.6);if(p){const f=R()*TAU,ez=[Math.sin(f),Math.cos(f)];G.box(p[0],0,p[1],0.3,0.55,0.4,f,steel,2,true);G.beam([p[0]-ez[0]*2.2,0.3,p[1]-ez[1]*2.2],[p[0]+ez[0]*2.2,0.8,p[1]+ez[1]*2.2],0.3,0.08,blu);V.play.push({kind:'wippe',x:p[0],z:p[1]});}}
  // Klettergerüst
  {const p=spot(2.6);if(p){const f=R()*TAU;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(a&&b)continue;const ex=[Math.cos(f),-Math.sin(f)],ez=[Math.sin(f),Math.cos(f)];G.box(p[0]+ex[0]*a*1.1+ez[0]*b*1.1,0,p[1]+ex[1]*a*1.1+ez[1]*b*1.1,0.1,2.2,0.1,f,grn,2,true);}
      for(const y of [0.7,1.4,2.1])for(const r of [0,Math.PI/2])G.box(p[0],y,p[1],2.4,0.08,0.08,f+r,grn,2,true);V.play.push({kind:'klettergeruest',x:p[0],z:p[1]});}}
  // Sandkasten
  {const p=spot(2.4);if(p){const f=R()*TAU;G.box(p[0],0,p[1],3.6,0.12,3.6,f,sand,2,true);const ex=[Math.cos(f),-Math.sin(f)],ez=[Math.sin(f),Math.cos(f)];for(const s of [-1,1]){G.box(p[0]+ex[0]*s*1.8,0,p[1]+ex[1]*s*1.8,0.25,0.3,3.85,f,wood,2,true);G.box(p[0]+ez[0]*s*1.8,0,p[1]+ez[1]*s*1.8,3.85,0.3,0.25,f,wood,2,true);}V.play.push({kind:'sandkasten',x:p[0],z:p[1]});}}
  // Federwipptiere
  for(let n=0;n<2;n++){const p=spot(0.9);if(!p)continue;const f=R()*TAU;G.box(p[0],0,p[1],0.15,0.5,0.15,f,steel,2,true);G.box(p[0],0.5,p[1],0.45,0.5,0.9,f,n?grn:yel,2,true);G.box(p[0],0.95,p[1],0.3,0.35,0.3,f,n?grn:yel,2,true);V.play.push({kind:'federtier',x:p[0],z:p[1]});}
  // Bänke am Spielplatz
  V.benches=[];for(let n=0;n<2;n++){const p=spot(1.4);if(!p)continue;const f=Math.atan2((pb[0]+pb[2])/2-p[0],(pb[1]+pb[3])/2-p[1]);G.box(p[0],0.42,p[1],1.8,0.08,0.45,f,wood,2,true);for(const s of [-0.7,0.7]){const ex=[Math.cos(f),-Math.sin(f)];G.box(p[0]+ex[0]*s,0,p[1]+ex[1]*s,0.08,0.42,0.4,f,steel,2,true);}V.benches.push([p[0],p[1],f]);}
  // Picknickdecken auf den Wiesen (weit weg von Wegen und Bäumen)
  const cols=[[0xd62828,0xf1f1f1],[0x1d70b8,0xf1f1f1],[0xf4b400,0x3a9d4a],[0x6a4c93,0xf1f1f1],[0xe76f51,0x264653]];
  for(let k=0;k<600&&V.blankets.length<5;k++){const x=bb[0]+R()*(bb[2]-bb[0]),z=bb[1]+R()*(bb[3]-bb[1]);if(!pip(x,z,park.poly)||(pg&&pip(x,z,pg.poly)))continue;if(!oberstFree(x,z)||treeNear(x,z,5)||oberstDistPaths(x,z,paths)<7)continue;if(V.blankets.some(b=>Math.hypot(b.x-x,b.z-z)<14))continue;
    const f=R()*TAU,ex=[Math.cos(f),-Math.sin(f)],ez=[Math.sin(f),Math.cos(f)];const [c1,c2]=cols[V.blankets.length];for(let a=0;a<3;a++)for(let b=0;b<2;b++)G.box(x+ex[0]*(a-1)*0.75+ez[0]*(b-0.5)*0.8,0.01,z+ex[1]*(a-1)*0.75+ez[1]*(b-0.5)*0.8,0.75,0.025,0.8,f,C((a+b)%2?c1:c2),2,true);
    G.box(x+ex[0]*0.6,0.03,z+ex[1]*0.6,0.5,0.32,0.34,f,C(0xb08850),2,true);G.box(x-ex[0]*0.7+ez[0]*0.2,0.03,z-ex[1]*0.7+ez[1]*0.2,0.08,0.3,0.08,f,C(0x2f6b3a),2,true);
    V.blankets.push({x,z,face:f});oberstPlaced(x,z,2);}
  oberstGBMesh(G,stdMat({vertexColors:true,roughness:0.65}));
  // Schaukelsitze (eigene Gruppen, weil sie schwingen)
  const chain=new THREE.BoxGeometry(0.03,1,0.03),seatG=new THREE.BoxGeometry(0.5,0.05,0.22);const cm=cmat(0x6d7b78,0.4),sm=cmat(0x222222,0.7);
  V.seatGeo={chain,seatG,cm,sm};
  if(pg){let cx=0,cz=0;for(const q of pg.poly){cx+=q[0];cz+=q[1];}label('Spielplatz Volkspark',cx/pg.poly.length,cz/pg.poly.length,'small');}
  // Szenen
  const pc=V.play.length?V.play[0]:null;
  if(pc)oberstScene('vp_play','Spielplatz im Volkspark',pc.x,pc.z,s=>{for(const sw of V.swings.slice(0,3)){const seat=new THREE.Group();seat.position.set(sw.x,sw.y,sw.z);seat.rotation.y=sw.face;for(const o of [-0.22,0.22]){const c=new THREE.Mesh(chain,cm);c.scale.y=sw.L;c.position.set(o,-sw.L/2,0);seat.add(c);}const st=new THREE.Mesh(seatG,sm);st.position.y=-sw.L;seat.add(st);scene.add(seat);
      const kid=oberstPerson(s,sw.x,sw.z,sw.y-sw.L,sw.face,{kid:true,sit:true,sitH:0.6});s.swingers.push({seat,h:kid,x:sw.x,z:sw.z,y:sw.y,L:sw.L,face:sw.face,fx:sw.fx,fz:sw.fz,ph:Math.random()*6,sp:mr(2.0,2.6)});}
      for(const b of V.benches.slice(0,2)){const [x,z,f]=b;oberstPerson(s,x+Math.sin(f)*0.1,z+Math.cos(f)*0.1,0,f,{sit:true});}},
    ['Noch emol schaukele! Höher!','Mama, guck emol, ohne Händ!','Kevin-Lukas, mer gehe gleich, gell!','Ei, wer hot dann jetzt widder Sand im Schuh?','Rutsche is net zum Hochlaafe da!','Isch bin de Schnellst vom ganze Volkspark!']);
  const b0=V.blankets[0];if(b0)oberstScene('vp_picnic','Picknick auf der Wiese',b0.x,b0.z,s=>{for(const b of V.blankets.slice(0,3)){const ex=[Math.cos(b.face),-Math.sin(b.face)];for(const o of [-0.6,0.6])oberstPerson(s,b.x+ex[0]*o,b.z+ex[1]*o,0,b.face+(o<0?0.4:-0.4),{sit:true,sitH:0.25});}},
    ['Reich mer emol die Fleischworscht, gell.','Des is Riesling vom Onkel. Der is schee trocke. Wie de Onkel.','Gugg, die Wolk sieht aus wie de Dom!','Ei, Ameise! Ameise im Kardoffelsalat!','Im Volkspark is es halt am schönste, gell. Basta.','Ei, mach emol Platz uff de Deck!']);
  // Gassigeher auf dem längsten Parkweg
  const inPark=paths.map(r=>r.pts.filter(p=>pip(p[0],p[1],park.poly))).filter(p=>p.length>3).sort((a,b)=>b.length-a.length);
  const lp=inPark[0];if(lp){const dense=[];for(let k=0;k+1<lp.length;k++){const a=lp[k],b=lp[k+1];const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/6));for(let s=0;s<n;s++)dense.push([a[0]+(b[0]-a[0])*s/n,a[1]+(b[1]-a[1])*s/n]);}dense.push(lp[lp.length-1]);V.dogPath=dense;
    const m=dense[dense.length>>1];oberstScene('vp_dogs','Gassigeher im Volkspark',m[0],m[1],s=>{for(let k=0;k<3;k++){const st=Math.floor(dense.length*k/3);const w=oberstWalker(s,dense.slice(st).concat(dense.slice(0,st)),{dog:true,speed:mr(1.0,1.4)});if(k===2){w.dir=-1;w.i=w.path.length-2;}}},
      ['Bello, aus! Des is kaa Wurstbrot, des is en Schuh!','Der will nur spiele. Glaab ich.','Na, aach widder Gassi? Bei dem Wetter!','Der Hund hot mehr Freunde im Volkspark als ich.','Sitz! … Sitz! … Ei, dann halt net.','Gude! Isch hab immer Leckerli dabei – fer de Hund, net fer Sie.']);}
  OBERST.ft.push({n:'Volkspark – Spielplatz',x:pc?pc.x+5:bb[0]+50,z:pc?pc.z+5:bb[1]+50});}

// ===================== UNIVERSITÄTSMEDIZIN =====================
function oberstNearRoadDir(x,z){for(let r=2;r<25;r+=1.5)for(let a=0;a<16;a++){const q=a/16*TAU;const i=idx(x+Math.sin(q)*r,z+Math.cos(q)*r);if(i>=0&&(mfG(i)&2))return q;}return 0;}
function oberstSpotNear(x,z,maxR=18,clear=1.2){for(let r=0;r<maxR;r+=1)for(let a=0;a<12;a++){const q=a/12*TAU;const px=x+Math.sin(q)*r,pz=z+Math.cos(q)*r;let ok=oberstFree(px,pz);for(let b=0;b<6&&ok;b++){const w=b/6*TAU;if(!oberstFree(px+Math.sin(w)*clear,pz+Math.cos(w)*clear))ok=false;}if(ok)return [px,pz];}return null;}
function oberstKlinik(){const K=OBERST.klinik;K.helipad=[POI.klinik[0],POI.klinik[1]];const G=new GB();const C=OBERST_C;
  const tex=freeAfterUpload(canvasTex(512,256,g=>{g.fillStyle='#f4f6f8';g.fillRect(0,0,512,256);g.fillStyle='#0b3c68';g.fillRect(0,0,512,22);g.fillRect(0,234,512,22);g.font='700 66px "Barlow Condensed", Arial Narrow, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('Universitätsmedizin',256,98);g.fillStyle='#3a5a78';g.font='500 40px "Barlow Condensed", Arial Narrow, sans-serif';g.fillText('Campus Mainz · Besuchereingang',256,170);},false));
  const signMat=new THREE.MeshStandardMaterial({map:tex,roughness:0.6,side:THREE.DoubleSide});const signGeo=new THREE.PlaneGeometry(2.4,1.2);
  for(const c of [[-948,560],[-1000,650],[-1160,890],[-1320,700]]){const p=oberstSpotNear(c[0],c[1]);if(!p)continue;const f=oberstNearRoadDir(p[0],p[1]);G.box(p[0],0,p[1],2.6,0.25,0.5,f,C(0x9aa4ad),2,true);G.box(p[0],0.25,p[1],0.18,2.6,0.4,f,C(0x0b3c68),2,true);
    const m=new THREE.Mesh(signGeo,signMat);m.position.set(p[0],2.0,p[1]);m.rotation.y=f;oberstAdd(m,false);K.signs.push({x:p[0],z:p[1],text:'Universitätsmedizin'});oberstPlaced(p[0],p[1],1.5);}
  // Wegweiser
  {const p=oberstSpotNear(-962,575);if(p){const f=oberstNearRoadDir(p[0],p[1]);G.box(p[0],0,p[1],0.12,3.2,0.12,0,C(0x6d7b78),2,true);
      const wt=freeAfterUpload(canvasTex(256,256,g=>{g.fillStyle='#0b3c68';g.fillRect(0,0,256,256);g.fillStyle='#fff';g.font='700 34px "Barlow Condensed", Arial Narrow, sans-serif';g.textBaseline='middle';['← Notaufnahme','Hörsäle →','Kinderklinik ↓','Parkhaus →'].forEach((t,i)=>{g.fillText(t,14,34+i*62);g.fillRect(0,64+i*62,256,3);});},false));
      const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),new THREE.MeshStandardMaterial({map:wt,roughness:0.6,side:THREE.DoubleSide}));m.position.set(p[0],2.4,p[1]);m.rotation.y=f;oberstAdd(m,false);K.signs.push({x:p[0],z:p[1],text:'Wegweiser'});oberstPlaced(p[0],p[1],1);}}
  // Liegendanfahrt der Notaufnahme an einer Klinik-Fassade zur Straße (ohne Fahrzeuge – die bringt Welle 2)
  let best=null;for(const b of BUILDINGS){const d=Math.hypot(b.x-K.helipad[0],b.z-K.helipad[1]);if(d<45||d>170||!b.name||!/^\d/.test(b.name))continue;const P=b.poly;
    for(let i=0;i<P.length;i++){const A=P[i],B=P[(i+1)%P.length];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<14)continue;let nx=(B[1]-A[1])/L,nz=-(B[0]-A[0])/L;const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;if(pip(mx+nx*0.5,mz+nz*0.5,P)){nx=-nx;nz=-nz;}
      if(!faceStreet(mx,mz,nx,nz))continue;let ok=true;for(let u=-5;u<=5&&ok;u+=2.5)for(let v=1;v<=8&&ok;v+=1.5){const x=mx+(B[0]-A[0])/L*u+nx*v,z=mz+(B[1]-A[1])/L*u+nz*v;const i2=idx(x,z);if(i2<0||hgG(i2)>0||(mfG(i2)&4)||oberstNearHeli(x,z,12))ok=false;}
      if(!ok)continue;const sc=Math.abs(d-90);if(!best||sc<best.sc)best={sc,mx,mz,nx,nz,ex:(B[0]-A[0])/L,ez:(B[1]-A[1])/L,b};}}
  if(best){const {mx,mz,nx,nz,ex,ez}=best;const f=Math.atan2(nx,nz);const cx=mx+nx*4.5,cz=mz+nz*4.5;
    for(const u of [-5.5,5.5])G.box(cx+ex*u+nx*3.6,0,cz+ez*u+nz*3.6,0.25,4.2,0.25,f,C(0xdfe3e6),2,true);G.box(cx,4.2,cz,12.4,0.35,9.4,f,C(0xe9edf0),2,true);G.box(cx+nx*4.6,3.7,cz+nz*4.6,12.4,0.5,0.2,f,C(0xc8102e),2,true);
    for(const u of [-3.2,0,3.2]){G.box(cx+ex*(u-1.3)+nx*0.6,0.01,cz+ez*(u-1.3)+nz*0.6,0.12,0.02,7.6,f,C(0xf4d03f),2,true);G.box(cx+ex*(u+1.3)+nx*0.6,0.01,cz+ez*(u+1.3)+nz*0.6,0.12,0.02,7.6,f,C(0xf4d03f),2,true);}
    oberstSign('NOTAUFNAHME',cx+nx*4.75,3.95,cz+nz*4.75,f,5.2,0.5,'#c8102e','#ffffff');oberstSign('Liegendanfahrt · nur Rettungsdienst',mx+nx*0.12+ex*7.5,2.2,mz+nz*0.12+ez*7.5,f,2.6,0.42,'#ffffff','#c8102e');
    K.bay={x:cx,z:cz,face:f,w:12.4,d:9.4};oberstPlaced(cx,cz,7);label('Notaufnahme (Liegendanfahrt)',cx,cz,'small');
    oberstScene('kl_raucher','Raucherecke vor der Notaufnahme',cx,cz,s=>{const px=mx+nx*2+ex*9,pz=mz+nz*2+ez*9;const ivG=new THREE.CylinderGeometry(0.025,0.025,1.9,6);const ivM=cmat(0xb0b6bb,0.4);
      for(const o of [0,1.3]){const h=oberstPerson(s,px+ex*o,pz+ez*o,0,f+(o?-2.2:2.2),{coat:0x9fb7d0});const st=new THREE.Mesh(ivG,ivM);st.position.set(0.45,0,0.1);h.g.add(st);st.position.y=0.95;}
      for(const o of [-1,1])oberstPerson(s,cx+ex*o*0.8+nx*7,cz+ez*o*0.8+nz*7,0,f+(o>0?Math.PI/2:-Math.PI/2),{coat:0xf6f6f2});},
      ['Ei, isch bin nur korz zum Luftschnappe raus. Mit Infusion.','Herr Doktor, mei Knie macht widder so … knack.','Gude! Notaufnahme is do hinne. Wartezeit: frag net.','Die Kantine hot heut Fleischworscht. Des is aach Medizin.','Nur noch ein Dienst, dann hab isch frei. Seit drei Woche.','De Hubschrauber landet gleich – bitte net uffs H stelle!']);
  }
  oberstGBMesh(G,stdMat({vertexColors:true,roughness:0.6}));
  const sp=K.signs[0];OBERST.ft.push({n:'Universitätsmedizin – Besuchereingang',x:sp?sp.x+2:-948,z:sp?sp.z+2:560});}

// ===================== HARTENBERG-MÜNCHFELD: Vorgärten =====================
function oberstHartenberg(){const H=OBERST.hartenberg;const place=PLACES.find(p=>p.name==='Hartenberg-Münchfeld');if(!place)return;const cx=place.x,cz=place.z;
  const hedges=[],fences=[];const R=mulberry32(4711);const MAXI=1400;
  for(const b of BUILDINGS){if(Math.abs(b.x-cx)>1100||Math.abs(b.z-cz)>1100)continue;if(hedges.length+fences.length>MAXI)break;const P=b.poly;const ar=Math.abs(polyArea(P));if(ar<40||ar>420)continue;if(districtAt(b.x,b.z)!=='Hartenberg-Münchfeld')continue;
    for(let i=0;i<P.length;i++){const A=P[i],B=P[(i+1)%P.length];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<5)continue;let nx=(B[1]-A[1])/L,nz=-(B[0]-A[0])/L;const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;if(pip(mx+nx*0.4,mz+nz*0.4,P)){nx=-nx;nz=-nz;}
      let road=0;for(let d=1;d<=13;d+=1){const k=idx(mx+nx*d,mz+nz*d);if(k<0||hgG(k)>0||(mfG(k)&4))break;if(mfG(k)&2){road=d;break;}}if(road<3.5)continue;
      const off=road-1.0,ex=(B[0]-A[0])/L,ez=(B[1]-A[1])/L;const fence=R()<0.4;const len=L+1.2;const gate=L>7?1.2:0;
      for(const [u0,u1] of gate?[[-len/2,-gate/2],[gate/2,len/2]]:[[-len/2,len/2]]){const seg=u1-u0;if(seg<0.8)continue;const um=(u0+u1)/2;const x=mx+ex*um+nx*off,z=mz+ez*um+nz*off;
        let ok=true;for(const t of [-0.45,0,0.45]){const q=[x+ex*seg*t,z+ez*seg*t];const k=idx(q[0],q[1]);if(k<0||hgG(k)>0||(mfG(k)&2)||(mfG(k)&4))ok=false;}if(!ok)continue;
        const rot=Math.atan2(ex,ez);if(fence){const n=Math.max(1,Math.round(seg/2));for(let s=0;s<n;s++){const u=-seg/2+(s+0.5)*seg/n;fences.push([x+ex*u,z+ez*u,rot,seg/n]);}}else hedges.push([x,z,rot,seg,0.95+R()*0.5]);}}}
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  if(hedges.length){const geo=new THREE.BoxGeometry(1,1,1).translate(0,0.5,0);const im=new THREE.InstancedMesh(geo,stdMat({color:0x3f6b2f,roughness:0.95}),hedges.length);
    hedges.forEach((h,i)=>{q.setFromAxisAngle(up,h[2]);p.set(h[0],0,h[1]);s.set(0.7,h[4],h[3]);m.compose(p,q,s);im.setMatrixAt(i,m);});im.computeBoundingSphere();oberstAdd(staticInst(im));H.mesh.push(im);}
  if(fences.length){const tex=canvasTex(128,64,g=>{g.clearRect(0,0,128,64);g.fillStyle='#f2efe6';for(let x=4;x<128;x+=16){g.fillRect(x,6,9,58);g.beginPath();g.moveTo(x,6);g.lineTo(x+4.5,0);g.lineTo(x+9,6);g.fill();}g.fillRect(0,18,128,6);g.fillRect(0,46,128,6);},false);
    const geo=new THREE.PlaneGeometry(1,0.9).translate(0,0.45,0).rotateY(Math.PI/2);const im=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({map:freeAfterUpload(tex),alphaTest:0.5,side:THREE.DoubleSide,roughness:0.8}),fences.length);
    fences.forEach((f,i)=>{q.setFromAxisAngle(up,f[2]+Math.PI/2);p.set(f[0],0,f[1]);s.set(1,1,f[3]);m.compose(p,q,s);im.setMatrixAt(i,m);});im.computeBoundingSphere();oberstAdd(staticInst(im),false);H.mesh.push(im);}
  H.hedges=hedges.length;H.fences=fences.length;H.list=hedges.slice(0,400);
  // Nachbarn an der Hecke
  let hs=null,hd=1e9;for(const h of hedges){const d=Math.hypot(h[0]-cx,h[1]-cz);if(d<hd&&h[3]>4){hd=d;hs=h;}}
  if(hs){const [x,z,rot]=hs;const nx=Math.cos(rot),nz=-Math.sin(rot);H.scene=[x,z];
    const trim={g:new THREE.BoxGeometry(0.12,0.12,0.9),m:cmat(0xd62828,0.5)};
    oberstScene('hb_hecke','Nachbarn an der Hecke',x,z,s=>{oberstPerson(s,x+nx*1.0,z+nz*1.0,0,Math.atan2(-nx,-nz),{prop:trim});oberstPerson(s,x-nx*1.4,z-nz*1.4,0,Math.atan2(nx,nz));},
      ['Ei, Ihr Heck is aber widder gewachse, Herr Nachbar!','Bei uns am Hartenberg wird die Heck uff Kante geschnitte. Uff Kante!','Mei Gartezwerg guckt immer zu Ihne riwwer. Der is neidisch.','Kehrwoch is in Schwabe. Hier mache mir des freiwillisch.','Gude! Kommt Ihr am Samstag zum Grille? Isch bring de Woi.','Die Laube is neu gestriche. Grün. Wie immer.']);}
  OBERST.ft.push({n:'Hartenberg-Münchfeld – Wohnstraßen',x:hs?hs[0]:cx,z:hs?hs[1]:cz});}

// ===================== SCHNELLREISE =====================
const _oberstFtSpecials=ftSpecials;
ftSpecials=function(){const S=_oberstFtSpecials();for(const d of OBERST.ft){if(!S.some(o=>o.n===d.n))S.push({n:d.n,g:'Besondere Orte',x:d.x,z:d.z,y:d.y,face:d.face||0,special:true});}return S;};
function oberstFtTargets(){const Z=OBERST.zita;const S=Z.tips[1];const x=S.x+(Z.C[0]-S.x)*0.3+3,z=S.z+(Z.C[1]-S.z)*0.3;if(oberstZitaAt(x,z)===1)OBERST.ft.push({n:'Zitadelle – Bastion Drusus (Wall)',x,z,y:OBERST_WH+0.05});
  const v=Z.venue;if(v&&v.door)OBERST.ft.push({n:'Zitadelle – Stadthistorisches Museum',x:v.door[0]+Math.sin(v.door[2])*1.6,z:v.door[1]+Math.cos(v.door[2])*1.6,face:v.door[2]});}

// ===================== SETUP / UPDATE =====================
function setupOberst(){const pm=performance.memory;const h0=pm?pm.usedJSHeapSize:0;const m0=OBERST.meshes;const t0=performance.now();
  oberstZitadelle();oberstZitaScenes();oberstFtTargets();oberstVolkspark();oberstKlinik();oberstHartenberg();
  const R=OBERST.zita.raster;OBERST.mem={heap0:h0,heap1:pm?pm.usedJSHeapSize:0,meshes:OBERST.meshes-m0,geoBytes:OBERST.geoBytes,rasterBytes:R?R.a.byteLength:0,ms:Math.round(performance.now()-t0)};
  OBERST.zitaAt=oberstZitaAt;OBERST.nearGate=oberstNearGate;}
function updateOberst(dt){if(mode!=='play'||!P1.h)return;const [px,pz]=ppos(P1);const indoor=!!INDOOR;
  for(const s of OBERST.scenes){const d=minPlayerDist(s.x,s.z);if(!s.active&&d<s.R&&!indoor)oberstSpawn(s);else if(s.active&&d>s.R+90)oberstDespawn(s);if(s.active)oberstUpdateScene(s,dt,px,pz);}}
