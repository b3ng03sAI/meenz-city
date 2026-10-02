// ===================== 35 Detail: Neustadt + Zollhafen (Mainz) =====================
// Gründerzeit-Fassaden (Gesimse, Erker, Balkone) für die Neustadt-Blockränder, Wochenmarkt am Gartenfeldplatz,
// Café-Terrassen und Spielplatz am Feldbergplatz, Zollhafen mit Kranhaus, Hafenpromenade und der „Kranbar“
// (begehbar), dichterer Verkehr auf der Rheinallee, Straßenszenen auf Meenzerisch und Schnellreiseziele.
// Christuskirche (Modell + Innenraum) und Bäume/Bänke/Laternen nach OSM gibt es schon – hier nur, was fehlt.
const NEUST={markt:{on:false,stands:[],vendors:[],shoppers:[],t0:7*60,t1:13*60,grp:null,built:false,x:0,z:0,welcomed:false},
  kranhaus:null,venue:null,scenes:[],ft:[],cafe:{tables:[],grp:null},playground:null,promenade:[],
  gz:0,gzBuilt:0,zoll:0,ra:{edges:[],mids:[],bias:0.5,near:330,spawned:0,onRa:0,cap:0},ready:false};

// ---------- Hilfen ----------
const neustFree=(x,z)=>{const i=idx(x,z);return i>=0&&hgG(i)===0&&!(mfG(i)&6);};
function neustFreeR(x,z,r){for(let dz=-r;dz<=r;dz+=1)for(let dx=-r;dx<=r;dx+=1)if(!neustFree(x+dx,z+dz))return false;return true;}
function neustArea(name,fb){const a=AREAS.find(a=>a.name===name);return a?polyCentroid(a.poly):fb;}
// Spirale um (cx,cz): erster Punkt, der pred erfüllt
function neustSpiral(cx,cz,rMax,step,pred){for(let r=0;r<=rMax;r+=step){const n=Math.max(1,Math.round(TAU*r/step));for(let k=0;k<n;k++){const a=k/n*TAU;const x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r;if(pred(x,z))return [x,z];}}return null;}
function neustNearWater(x,z,r){for(let a=0;a<TAU;a+=Math.PI/4){const i=idx(x+Math.sin(a)*r,z+Math.cos(a)*r);if(i>=0&&(mfG(i)&4))return a;}return null;}
function neustMesh(gb,mat,grp){if(gb.empty)return null;const m=new THREE.Mesh(gb.geo(),mat);m.castShadow=true;m.receiveShadow=true;(grp||scene).add(m);if(!grp)staticMesh(m);return m;}
// Lokales Koordinatensystem (lx entlang Achse a, lz quer dazu) → Welt
function neustFrame(x,z,a){const ux=Math.sin(a),uz=Math.cos(a);return (lx,y,lz)=>[x+ux*lx+uz*lz,y,z+uz*lx-ux*lz];}
// Zollhafen: zwischen Rheinallee und Rhein, nördlich des Feldbergplatzes (Neubaugebiet)
function neustInZoll(x,z){if(z>-1540||z<-2480||x<-1600||x>-500||rhineSide(x,z)>0)return false;const A=[-700,-1350],B=[-1400,-1890];return (B[0]-A[0])*(z-A[1])-(B[1]-A[1])*(x-A[0])>0;}

// ===================== GRÜNDERZEIT-FASSADEN =====================
// Markierung beim Planen (vor dem ersten Chunk-Bau), Details beim Chunk-Bau – gehen in die Chunk-Meshes ein, also
// keine zusätzlichen Draw-Calls. Neubauten am Zollhafen werden modern (hell/anthrazit, Flachdach).
const NEUST_ZOLL_TINTS=[0xf0eee8,0xdedbd3,0x3d4247,0xc9c3b6,0xe8e2d6,0x9aa0a6];
const _neustPlanOSM=planOSMBuilding;
planOSMBuilding=function(b){_neustPlanOSM(b);
  if(b.isRoof||b.typ===2||b.hist)return;
  if(neustInZoll(b.x,b.z)){if(b.H<8||b.typ===4||b.typ===6)return;b.style='modern';b.tint=new THREE.Color(NEUST_ZOLL_TINTS[b.gid%NEUST_ZOLL_TINTS.length]);b.roof=0;b.neustZoll=true;NEUST.zoll++;return;}
  if(b.dist!=='Neustadt'||b.typ===3||b.typ===4||b.typ===6||b.mh>0.5)return;
  if(b.H<9.5||b.H>26||b.area<60||b.area>4000||(b.style!=='sandstone'&&b.style!=='plaster'))return;
  if(mulberry32(b.gid%1000003+35)()<0.8){b.neustGz=true;NEUST.gz++;}};
const _neustAddOSM=addOSMBuilding;
addOSMBuilding=function(b){_neustAddOSM(b);if(b.neustGz&&DET>=1){neustGzDetail(b);NEUST.gzBuilt++;}};
function neustGzDetail(b){const ch=chunkOf(b.x,b.z);const TR=cg(ch,'trim'),G=cg(ch,b.style);const R=mulberry32(b.seed^0x5a17);
  const rb=b.rect;const gf=rb?rb.gf:b.gf,fh=rb?rb.fh:b.fh,y0=b.mh||0,top=b.wallTop||b.H;const nFl=Math.floor((top-y0-gf)/fh+0.01);if(nFl<2)return;
  const P=(x,y,z)=>[x,y,z];const tint=b.tint,iron={r:0.13,g:0.13,b:0.14};const ring=b.poly,n=ring.length;
  let erker=R()<0.7?1:0;const balFl=1+Math.floor(R()*2);let bal=0;
  for(let i=0;i<n;i++){const A=ring[i],B=ring[(i+1)%n];const dx=B[0]-A[0],dz=B[1]-A[1],L=Math.hypot(dx,dz);if(L<6)continue;
    const ux=dx/L,uz=dz/L;let nx=uz,nz=-ux;const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;if(pip(mx+nx*0.8,mz+nz*0.8,ring)){nx=-nx;nz=-nz;}
    if(!faceStreet(mx,mz,nx,nz))continue;const nn=[nx,nz];
    // Stockwerksgesimse + kräftiges Kranzgesims mit Konsolenband
    for(let k=1;k<nFl;k++){const y=y0+gf+k*fh-0.1;ledge(TR,P,A,B,nn,y,y+0.16,0.09,shade(tint,0.93));}
    ledge(TR,P,A,B,nn,top-0.8,top-0.5,0.2,shade(tint,0.78));ledge(TR,P,A,B,nn,top-0.5,top-0.08,0.4,shade(tint,0.96));
    const W=(t,o,y)=>[A[0]+ux*t+nx*o,y,A[1]+uz*t+nz*o];const rot=Math.atan2(-uz,ux);
    let te=-99;
    // Erker über 2–4 Obergeschosse
    if(erker&&L>=11){erker=0;te=L*(0.3+R()*0.4);const w=L>=18?6.8:3.4,d=0.85,yb=y0+gf+0.25,ye=Math.min(top-0.9,y0+gf+Math.min(nFl,4)*fh-0.2);
      const c=W(te,d/2,0);G.box(c[0],yb,c[2],w,ye-yb,d,rot,shade(tint,0.97),13.6,false);
      TR.box(c[0],ye,c[2],w+0.3,0.28,d+0.3,rot,shade(tint,0.82),2);
      const c2=W(te,0.35,0);TR.box(c2[0],yb-0.55,c2[2],w*0.85,0.55,0.7,rot,shade(tint,0.85),2);
      // kleiner Turmhelm
      if(ye<top-1.6){const h0=ye+0.28,h1=h0+1.1,q=W(te,d/2,0);const RF=cg(ch,'slate');const hw=w/2+0.12,hd=d/2+0.12;const sl={r:0.42,g:0.44,b:0.48};
        const cs=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([a,o])=>[q[0]+ux*a+nx*o,q[2]+uz*a+nz*o]);
        for(let k=0;k<4;k++){const p0=cs[k],p1=cs[(k+1)%4];RF.triOut([p0[0],h0,p0[1]],[p1[0],h0,p1[1]],[q[0],h1,q[2]],[0,0],[1,0],[0.5,0.5],sl,[q[0],h0-2,q[2]]);}}}
    // Balkone mit schmiedeeisernem Geländer
    const slots=te>0?[te-(L>=18?6.8:3.4)/2-1.6,te+(L>=18?6.8:3.4)/2+1.6]:L>=14?[L*0.25,L*0.75]:[L/2];
    for(const t of slots){if(t<1.5||t>L-1.5||bal>=4)continue;
      for(let j=2;j<=Math.min(1+balFl,nFl-1);j++){const y=y0+gf+(j-1)*fh;const c=W(t,0.5,0);bal++;
        TR.box(c[0],y-0.14,c[2],2.4,0.14,1.0,rot,shade(tint,0.85),2);
        const f0=W(t-1.15,0.97,y),f1=W(t+1.15,0.97,y),w0=W(t-1.15,0.02,y),w1=W(t+1.15,0.02,y);const up=(p,h)=>[p[0],p[1]+h,p[2]];
        TR.beam(up(f0,1.0),up(f1,1.0),0.06,0.06,iron);TR.beam(up(f0,0.12),up(f1,0.12),0.04,0.04,iron);
        TR.beam(up(w0,1.0),up(f0,1.0),0.05,0.05,iron);TR.beam(up(w1,1.0),up(f1,1.0),0.05,0.05,iron);
        for(const p of [f0,f1,W(t,0.97,y)])TR.beam(p,up(p,1.0),0.05,0.05,iron);}}}}

// ===================== ZOLLHAFEN: KRANHAUS, HISTORISCHER KRAN, PROMENADE =====================
// Kranhaus: Bürohaus auf Portalbeinen, dessen Baukörper wie ein Kranausleger übers Hafenbecken auskragt, mit
// rotem Ausleger auf dem Dach. In OSM ist es nicht benannt – Lage am Südende des Zollhafenbeckens (Kai-Seite).
const NEUST_KRAN_TARGET=[-770,-1650];
function neustKranSite(){
  // freie Grundfläche 20 x 11 m auf Land, Ausleger-Richtung zum nächsten Wasser
  const ok=(x,z,a)=>{const F=neustFrame(x,z,a);for(let lx=-10;lx<=10;lx+=2)for(let lz=-5.5;lz<=5.5;lz+=1.8){const p=F(lx,0,lz);const i=idx(p[0],p[2]);if(i<0||hgG(i)!==0||(mfG(i)&6))return false;}return true;};
  for(let r=0;r<=160;r+=4){const n=Math.max(1,Math.round(TAU*r/6));for(let k=0;k<n;k++){const q=k/n*TAU;const x=NEUST_KRAN_TARGET[0]+Math.sin(q)*r,z=NEUST_KRAN_TARGET[1]+Math.cos(q)*r;
    if(!neustFree(x,z))continue;let wa=null;for(const d of [14,20,26,32]){wa=neustNearWater(x,z,d);if(wa!==null)break;}if(wa===null)continue;
    for(const da of [0,0.4,-0.4,0.8,-0.8]){if(ok(x,z,wa+da))return {x,z,a:wa+da};}}}
  return {x:NEUST_KRAN_TARGET[0],z:NEUST_KRAN_TARGET[1],a:Math.PI*0.8};}
function neustSignAtlas(rows,w=512,rh=64){return canvasTex(w,rh*rows.length,(g)=>{rows.forEach(([t,bg,fg,font],k)=>{const y=k*rh;g.fillStyle=bg;g.fillRect(0,y,w,rh);g.strokeStyle=fg;g.lineWidth=5;g.strokeRect(4,y+4,w-8,rh-8);
  g.fillStyle=fg;g.font=font||'700 40px Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillText(t,w/2,y+rh/2+2,w-24);});},false);}
// Schild-Quad aus einer Atlas-Zeile k (von n) – Vorderseite zeigt in Richtung (fx,fz)
function neustSignQuad(S,k,n,c,y,w,h,fx,fz){const rx=fz,rz=-fx;const v0=1-(k+1)/n,v1=1-k/n;const p=(s,t)=>[c[0]+rx*s*w/2,y+t*h,c[1]+rz*s*w/2];
  S.quadOut(p(-1,0),p(1,0),p(1,1),p(-1,1),[0,v0],[1,v0],[1,v1],[0,v1],WHITE,[c[0]-fx*2,y+h/2,c[1]-fz*2]);}
function neustLattice(M,p0,p1,w,col){// Gitterträger aus zwei Gurten + Diagonalen
  const d=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]];const L=Math.hypot(...d);const hl=Math.hypot(d[0],d[2])||1;const s=[-d[2]/hl*w,0,d[0]/hl*w];
  const a0=[p0[0]+s[0],p0[1],p0[2]+s[2]],a1=[p1[0]+s[0],p1[1],p1[2]+s[2]],b0=[p0[0]-s[0],p0[1],p0[2]-s[2]],b1=[p1[0]-s[0],p1[1],p1[2]-s[2]];
  const t0=[p0[0],p0[1]+w*1.4,p0[2]],t1=[p1[0],p1[1]+w*0.7,p1[2]];
  for(const [u,v] of [[a0,a1],[b0,b1],[t0,t1]])M.beam(u,v,0.18,0.18,col);
  const n=Math.max(2,Math.round(L/3));const at=(A,B,f)=>[lerp(A[0],B[0],f),lerp(A[1],B[1],f),lerp(A[2],B[2],f)];
  for(let k=0;k<n;k++){const f=k/n,g=(k+1)/n;M.beam(at(a0,a1,f),at(t0,t1,g),0.1,0.1,col);M.beam(at(b0,b1,f),at(t0,t1,g),0.1,0.1,col);M.beam(at(a0,a1,f),at(b0,b1,f),0.08,0.08,col);}}
function neustBuildZollhafen(){const site=neustKranSite();const {x,z,a}=site;const F=neustFrame(x,z,a);
  const ST=new GB(),GL=new GB(),MT=new GB(),GW=new GB(),WD=new GB(),SG=new GB();const rot=a-Math.PI/2;// Box-Achse x = Auslegerrichtung
  const box=(M,lx,y,lz,w,h,d,col,uvs=2,top=true)=>{const p=F(lx,0,lz);M.box(p[0],y,p[2],w,h,d,rot,typeof col==='number'?C3(col):col,uvs,top);};
  // Portalbeine (Beton) + verglaste Café-Etage dazwischen
  for(const lx of [-8.5,8.5])for(const lz of [-4.2,4.2])box(ST,lx,0,lz,2,10.2,1.6,0xd9d6cf);
  box(GL,0,0,0,15,4.6,8.2,0x5f7f93,4);for(const lx of [-7.5,-4.5,-1.5,1.5,4.5,7.5])box(MT,lx,0,4.15,0.14,4.6,0.14,0x30363c);box(MT,0,4.6,0,15.2,0.35,8.4,0x30363c);
  // Baukörper: sechs Geschosse, kragt 16 m übers Wasser
  const L0=-11,L1=26,BW=11;const cx=(L0+L1)/2,len=L1-L0;
  for(let k=0;k<6;k++){const y=10.2+k*3.2;box(ST,cx,y,0,len,0.95,BW,0xeceae4);box(GL,cx,y+0.95,0,len-0.3,2.25,BW-0.3,0x3e5566,6);}
  box(ST,cx,29.4,0,len+0.4,0.6,BW+0.4,0xd2cfc7);box(ST,cx,9.6,0,len,0.6,BW,0xbdb9b0);
  // Streben vom Bein zur Auskragung
  for(const lz of [-4.6,4.6]){const p0=F(9.5,0,lz),p1=F(24,0,lz);MT.beam([p0[0],5.5,p0[2]],[p1[0],9.7,p1[2]],0.5,0.5,C3(0xb3261e));}
  // Dachkran: Maschinenhaus, Turm, Ausleger, Gegenausleger, Abspannung, Haken
  const red=C3(0xc0392b),dark=C3(0x2b2f33);box(MT,-1,30,0,8,4,6,0xb3261e);box(MT,-1,34,0,8.4,0.3,6.4,0x2b2f33);
  const tw=F(0,0,0);const top=[tw[0],41,tw[2]];for(const lz of [-2.2,2.2]){const q=F(-2,0,lz),r=F(2,0,lz);MT.beam([q[0],34,q[2]],top,0.3,0.3,red);MT.beam([r[0],34,r[2]],top,0.3,0.3,red);}
  const j0=F(2,0,0),j1=F(44,0,0),c0=F(-3,0,0),c1=F(-15,0,0);neustLattice(MT,[j0[0],35,j0[2]],[j1[0],37,j1[2]],0.9,red);neustLattice(MT,[c0[0],35,c0[2]],[c1[0],35.5,c1[2]],0.9,red);
  box(ST,-14,32.3,0,3,3,3,0x8f8a82);
  MT.beam(top,[j1[0],37.9,j1[2]],0.07,0.07,dark);MT.beam(top,[c1[0],36.4,c1[2]],0.07,0.07,dark);
  const hk=F(40,0,0);MT.beam([hk[0],36.5,hk[2]],[hk[0],12,hk[2]],0.05,0.05,dark);box(MT,40,10.8,0,1.2,1.2,0.8,0xf1c40f);
  // Beschriftung + Tür der Kranbar (Landseite)
  const tex=freeAfterUpload(neustSignAtlas([['KRANHAUS','#eceae4','#b3261e','700 46px Barlow Condensed, Arial Narrow, sans-serif'],['Kranbar · Café & Bar','#20262c','#ffd23f','700 38px Barlow Condensed, Arial Narrow, sans-serif']]));
  {const s=F(L0-0.25,0,0);neustSignQuad(SG,0,2,[s[0],s[2]],24.2,9,1.4,-Math.sin(a),-Math.cos(a));const d=F(-7.6,0,0);neustSignQuad(SG,1,2,[d[0],d[2]],3.2,4.5,0.9,-Math.sin(a),-Math.cos(a));}
  const door=F(-10.3,0,0);
  // Kollision: Café + Beine am Boden, Baukörper als erhöhte Fläche (Dach begehbar)
  rasterOBB(HG,x,z,18.8,9.8,rot,6);{const c=F(cx,0,0);elevOBB(c[0],c[2],len,BW,rot,9.6,30);}
  // historischer Portalkran am Kai
  const crane=neustSpiral(x,z,80,4,(qx,qz)=>Math.hypot(qx-x,qz-z)>32&&neustFreeR(qx,qz,3)&&neustNearWater(qx,qz,6)!==null);
  if(crane){const ca=neustNearWater(crane[0],crane[1],6);const C=neustFrame(crane[0],crane[1],ca);const grn=C3(0x2e5a4c);
    for(const [lx,lz] of [[-2.5,-2.5],[2.5,-2.5],[2.5,2.5],[-2.5,2.5]]){const p=C(lx,0,lz);MT.beam([p[0],0,p[2]],[p[0],7,p[2]],0.35,0.35,grn);}
    const cc=C(0,0,0);MT.box(cc[0],7,cc[2],6,0.8,6,ca,grn,2);MT.box(cc[0],7.8,cc[2],3.2,3,3.2,ca,C3(0x6d8a6f),2);const c1=C(16,0,0);neustLattice(MT,[cc[0],10,cc[2]],[c1[0],16,c1[2]],0.55,grn);
    MT.beam([c1[0],15.8,c1[2]],[c1[0],5,c1[2]],0.05,0.05,dark);for(const [lx,lz] of [[-2.5,-2.5],[2.5,2.5]]){const p=C(lx,0,lz);rasterCirc(HG,p[0],p[2],0.4,7);}}
  // Promenade am Hafenbecken: Poller, Bänke, Laternen, Pflanzkübel
  const edge=[];for(let gz=-170;gz<=170;gz+=3)for(let gx=-170;gx<=170;gx+=3){const px=x+gx,pz=z+gz;if(gx*gx+gz*gz>170*170||!neustFree(px,pz))continue;const wa=neustNearWater(px,pz,3);if(wa!==null)edge.push([px,pz,wa]);}
  edge.sort((p,q)=>Math.hypot(p[0]-x,p[1]-z)-Math.hypot(q[0]-x,q[1]-z));
  const used=[[x,z,16]];for(const [px,pz,wa] of edge){if(NEUST.promenade.length>=42)break;if(used.some(u=>Math.hypot(u[0]-px,u[1]-pz)<u[2]))continue;used.push([px,pz,8]);
    const kind=['poller','bank','laterne','poller','kuebel'][NEUST.promenade.length%5];NEUST.promenade.push({kind,x:px,z:pz,a:wa});
    const Q=neustFrame(px,pz,wa);const rr=wa;// Box-Breite parallel zur Kaikante
    if(kind==='poller'){const p=Q(1.2,0,0);MT.box(p[0],0,p[2],0.45,0.7,0.45,rr,dark,1);MT.box(p[0],0.7,p[2],0.6,0.12,0.6,rr,dark,1);}
    else if(kind==='bank'){const p=Q(-0.6,0,0);WD.box(p[0],0.42,p[2],2,0.08,0.5,rr,C3(0x8a5a30),2);const b=Q(-0.85,0,0);WD.box(b[0],0.5,b[2],2,0.5,0.08,rr,C3(0x8a5a30),2);for(const s of [-0.8,0.8]){const l=Q(-0.6,0,s);MT.box(l[0],0,l[2],0.1,0.42,0.5,rr,dark,1);}}
    else if(kind==='laterne'){const p=Q(-1,0,0);MT.beam([p[0],0,p[2]],[p[0],4.6,p[2]],0.12,0.12,dark);GW.box(p[0],4.6,p[2],0.45,0.35,0.45,0,C3(0xfff1c9),1);}
    else{const p=Q(-1.2,0,0);ST.box(p[0],0,p[2],1.1,0.6,1.1,rr,C3(0x8e8a84),1);WD.box(p[0],0.6,p[2],0.9,0.5,0.9,rr,C3(0x3f7a2a),1);}}
  const grp=new THREE.Group();scene.add(grp);const meshes=[[ST,vm('stone')],[GL,vm('glass')],[MT,vm('metal')],[GW,vm('glow')],[WD,vm('wood')],[SG,stdMat({map:tex,roughness:0.7})]].map(([g,m])=>neustMesh(g,m,grp)).filter(Boolean);
  for(const m of meshes)staticMesh(m);
  label('Kranhaus (Zollhafen)',x,z,'lm');
  NEUST.kranhaus={x,z,a,door:[door[0],door[2],a+Math.PI],crane,meshes:meshes.length,grp};}

// ===================== KRANBAR (begehbar, im Erdgeschoss des Kranhauses) =====================
function neustVenueDef(){return {id:'kranbar',name:'Kranbar am Zollhafen',sub:'Café & Bar im Kranhaus · Zollhafen',W:20,D:14,H:5.2,wall:0xdedbd3,ceil:0x3a3f45,hemiI:0.55,exp:1.0,lampI:26,lampD:22,
  lights:[[0,4.4,-3],[-6,4.4,2],[6,4.4,2]],wp:[[-6,3],[0,2],[6,3],[-3,-1],[3,-1],[0,4.5]],
  spawn:[0,5,Math.PI],exits:[{x:0,z:6.6,w:1.6,d:0.8,to:'door'}],
  hints:[{x:0,z:-4.6,r:2.4,t:'Die Theke der Kranbar – Hafen-Spritz und Schoppe.'},{x:-9,z:0,r:2.2,t:'Durchs Fenster: das Zollhafenbecken.'}],
  build(r,B){r.grp.children[0].material=stdMat({color:0x6b5a4a,roughness:0.55});
    // Theke + Regal mit leuchtenden Flaschen
    B.sbox('wood',0,0,-4.9,8,1.1,0.9,0x5a3a22);B.box('stone',0,1.1,-4.9,8.2,0.06,1.0,0x2b2f33);B.box('wood',0,0,-6.7,9,2.6,0.4,0x3a2512);
    for(let k=0;k<18;k++)B.box('glow',-4+k*0.47,1.35+(k%3)*0.62,-6.45,0.12,0.36,0.12,mpick([0xffd27a,0x9be37a,0xff8a65,0xfff1c9]));
    for(let k=0;k<5;k++)B.sbox('metal',-3.2+k*1.6,0,-3.9,0.4,0.75,0.4,0x30363c);
    // Tische mit Hockern
    for(const [x,z] of [[-6,-1],[-6,3],[6,-1],[6,3],[-2.2,3.4],[2.2,3.4]]){B.sbox('wood',x,0,z,1.1,0.76,1.1,0x8a5a30);for(const s of [-1,1])B.box('metal',x+s*0.95,0,z,0.4,0.46,0.4,0x30363c);}
    // Fensterfront zum Hafen (links) + Glastür
    B.box('glow',-9.75,0.9,0,0.05,3.2,12,0x9cc7e0);for(let z=-6;z<=6;z+=2)B.box('metal',-9.7,0,z,0.12,5.2,0.12,0x2b2f33);
    B.box('glow',9.75,1.6,0,0.05,2,6,0xbfe0f0);B.box('metal',0,0,6.8,2.4,3.2,0.2,0x2b2f33);B.box('glow',0,0.2,6.68,1.8,2.8,0.04,0xcfe6f3);
    // rote Kran-Hakenlampe über der Theke
    B.box('metal',0,3.6,-4,0.05,1.6,0.05,0x2b2f33);B.box('metal',0,3.1,-4,0.6,0.5,0.4,0xc0392b);B.box('glow',0,2.9,-4,0.4,0.2,0.3,0xfff1c9);},
  npcs(r){vPerson(r,0,-5.8,0,{role:'stand',lines:['Ei gude! Was derf’s sein – en Schoppe oder en Hafe-Spritz?','Früher hot do en Kran gestanne. Heut steht do mei Theke.','De Sonneunnergang üwwerm Hafe gibt’s gratis dezu.','Bitte net vom Balkon ins Hafebecke springe. Is schon zwaamol passiert.']});
    const G2=['Mir wohne do drüwwe im Neubau. Die Miet is höher wie de Kran.','Früher war hier nur Zoll un Schrott. Jetzt gibt’s Hafer-Latte.','Guck emol, die Möwe klaut dem Mann sei Brezel!','Isch bin nur wesche de Aussicht do. Unn wesche em Woi.'];
    for(const [x,z,f] of [[-6.8,-1,Math.PI/2],[-5.2,3,-Math.PI/2],[6.8,-1,-Math.PI/2],[5.2,3,Math.PI/2]])vPerson(r,x,z,f,{pose:'sit',lines:G2});
    const T=['In de Neustadt sacht mer „Gartefeld“, in de Altstadt sacht mer „wo?“','Isch hab de Kran fotografiert. Fuffzischmol.','Is des hier Hipster oder schon Meenz?'];for(let k=0;k<3;k++)vPerson(r,mr(-3,3),mr(-1,4),mr(0,6),{lines:T});},
  onEnter(){venueMusic('mall');}};}

// ===================== FELDBERGPLATZ: CAFÉ-TERRASSEN + SPIELPLATZ =====================
function neustBuildFeldberg(){const c=neustArea('Feldbergplatz',[-669,-1466]);const WD=new GB(),MT=new GB(),CL=new GB(),SD=new GB();const dark=C3(0x2b2f33);
  const nearFacade=(x,z)=>{for(let r=2;r<=6;r+=2)for(let a=0;a<TAU;a+=Math.PI/4){const i=idx(x+Math.sin(a)*r,z+Math.cos(a)*r);if(i>=0){const v=hgG(i);if(v>8&&v<255)return true;}}return false;};
  const tabs=NEUST.cafe.tables;const umb=[0xc0392b,0x2a6f97,0xe8e2d6,0x6a994e];
  for(let r=4;r<=60&&tabs.length<10;r+=2){const n=Math.round(TAU*r/2.5);for(let k=0;k<n&&tabs.length<10;k++){const q=k/n*TAU;const x=c[0]+Math.sin(q)*r,z=c[1]+Math.cos(q)*r;
    if(!neustFreeR(x,z,1)||!nearFacade(x,z)||tabs.some(t=>Math.hypot(t.x-x,t.z-z)<3.4))continue;tabs.push({x,z,a:q});}}
  for(const [i,t] of tabs.entries()){MT.beam([t.x,0,t.z],[t.x,0.74,t.z],0.08,0.08,dark);WD.box(t.x,0.74,t.z,0.9,0.05,0.9,t.a,C3(0xf2efe6),1);
    t.seats=[];for(let s=0;s<3;s++){const sa=t.a+s*TAU/3;const sx=t.x+Math.sin(sa)*0.95,sz=t.z+Math.cos(sa)*0.95;t.seats.push([sx,sz,sa+Math.PI]);
      // Bistrostuhl: Sitzfläche, vier dünne Beine, Lehne
      const C=neustFrame(sx,sz,sa);WD.box(sx,0.42,sz,0.42,0.05,0.42,sa,C3(0x9c6b3e),1);for(const [lx,lz] of [[-0.17,-0.17],[0.17,-0.17],[0.17,0.17],[-0.17,0.17]])MT.beam(C(lx,0,lz),C(lx,0.42,lz),0.035,0.035,dark);
      const b0=C(0.19,0.47,-0.18),b1=C(0.19,0.47,0.18);MT.beam(b0,[b0[0],0.9,b0[2]],0.035,0.035,dark);MT.beam(b1,[b1[0],0.9,b1[2]],0.035,0.035,dark);const t0=C(0.19,0.82,0);WD.box(t0[0],0.72,t0[2],0.4,0.18,0.06,sa,C3(0x9c6b3e),1);}
    if(i%2===0){MT.beam([t.x,0.79,t.z],[t.x,2.6,t.z],0.05,0.05,dark);const col=C3(umb[(i/2)%umb.length]);const ap=[t.x,2.75,t.z];const cs=[[1,1],[1,-1],[-1,-1],[-1,1]].map(([u,v])=>[t.x+u*1.25,2.25,t.z+v*1.25]);
      for(let k=0;k<4;k++){CL.triOut(cs[k],cs[(k+1)%4],ap,[0,0],[1,0],[0.5,1],col,[t.x,1.5,t.z]);CL.triOut(cs[k],cs[(k+1)%4],ap,[0,0],[1,0],[0.5,1],shade(col,0.7),[t.x,4,t.z]);}}}
  // Spielplatz im Grün: Schaukel, Rutsche, Sandkasten, Wippe
  const pg=neustSpiral(c[0],c[1],45,2,(x,z)=>{const i=idx(x,z);return i>=0&&(mfG(i)&1)&&neustFreeR(x,z,4);})||neustSpiral(c[0],c[1],60,2,(x,z)=>neustFreeR(x,z,4));
  if(pg){const [x,z]=pg;const Q=neustFrame(x,z,0.3);const blue=C3(0x2a6f97),yel=C3(0xf1c40f),wood=C3(0x8a5a30);
    for(const lx of [-1.6,1.6])for(const lz of [-0.9,0.9])MT.beam(Q(lx,0,lz-2.5),Q(lx,2.4,-2.5),0.12,0.12,blue);
    {const a=Q(-1.4,0,-2.5),b=Q(1.4,0,-2.5);MT.beam([a[0],2.4,a[2]],[b[0],2.4,b[2]],0.14,0.14,blue);for(const lx of [-0.6,0.6]){const s=Q(lx,0,-2.5);MT.beam([s[0],2.4,s[2]],[s[0],0.5,s[2]],0.03,0.03,dark);WD.box(s[0],0.45,s[2],0.5,0.05,0.25,0.3,wood,1);}}
    {const l=Q(2.2,0,1.5);MT.box(l[0],0,l[2],0.9,1.6,0.9,0.3,yel,1);const s0=Q(2.2,1.6,2),s1=Q(2.2,0.3,4.8);const w=0.35;const e=[Math.cos(0.3)*w,0,-Math.sin(0.3)*w];
      MT.quadOut([s0[0]-e[0],1.6,s0[2]-e[2]],[s0[0]+e[0],1.6,s0[2]+e[2]],[s1[0]+e[0],0.3,s1[2]+e[2]],[s1[0]-e[0],0.3,s1[2]-e[2]],[0,0],[1,0],[1,1],[0,1],C3(0xc0392b),[s0[0],-3,s0[2]]);}
    {const s=Q(-2,0,2.2);WD.box(s[0],0,s[2],3,0.3,3,0.3,wood,1);SD.box(s[0],0.02,s[2],2.7,0.26,2.7,0.3,C3(0xe3cf9a),1);}
    {const w=Q(0,0,4.5),w0=Q(-1.6,0,4.5),w1=Q(1.6,0,4.5);MT.box(w[0],0,w[2],0.3,0.45,0.3,0.3,blue,1);MT.beam([w0[0],0.35,w0[2]],[w1[0],0.6,w1[2]],0.25,0.08,yel);}
    NEUST.playground={x,z};rasterCirc(HG,Q(2.2,0,1.5)[0],Q(2.2,0,1.5)[2],0.5,2);}
  const grp=new THREE.Group();scene.add(grp);const meshes=[[WD,vm('wood')],[MT,vm('metal')],[CL,vm('cloth')],[SD,vm('sand')]].map(([g,m])=>neustMesh(g,m,grp)).filter(Boolean);for(const m of meshes)staticMesh(m);
  NEUST.cafe.grp=grp;NEUST.cafe.x=c[0];NEUST.cafe.z=c[1];label('Feldbergplatz (Cafés)',c[0],c[1],'small');}

// ===================== WOCHENMARKT GARTENFELDPLATZ (7–13 Uhr) =====================
const NEUST_STANDS=[['Obst & Gemüse Hahn',0x2e7d32],['Spargel & Erdbeern',0xc0392b],['Käs vom Hof',0xf1c40f],['Blumme Gartefeld',0x8e44ad],['Eier aus Ebersheim',0xe67e22],['Brot & Weck',0x8d6e63],['Fleischworscht-Stand',0xb71c1c],['Kräuter & Grumbeern',0x558b2f]];
const NEUST_VENDOR=['Spargel, frisch gestoche heut Morsche!','Erdbeern aus Rheinhesse – kost’ emol!','Zwaa Kilo Grumbeern, en Euro fuffzisch!','Kerschen, Kerschen, die Kerschen sin do!','Fleischworscht, die is noch warm, Herzi!','Weck, frisch aus’m Ofe!','Handkäs mit Musik – wer will?','Blumme für die Liebste – odder fürs schlechte Gewisse!','Eier vom glückliche Huhn, ganz frisch!'];
const NEUST_SHOPPER=['Was koste die Tomate?','Gell, des sin awwer net die vom letzte Mal?','Isch nemm e Pfund, awwer die Schöne!','Hach, de Gartefeldplatz am Morsche – des is Meenz!','Kann isch emol probiern?','Die Kerschen sin ja widder deier dies Johr!','Ei gude, wie?','Mei Mann wollt nur Fleischworscht. Typisch.','Habt ihr aach Spundekäs?'];
const NEUST_REPLY=['Für disch mach isch en Sonnerpreis!','Do kannste net meckern, des is Qualität!','Gell, des schmeckt?','Noch was dezu?','Des is aus Bretzenheim, net aus Spanie!'];
function neustMarktLayout(){const M=NEUST.markt;const c=neustArea('Gartenfeldplatz',[-1011,-751]);M.x=c[0];M.z=c[1];
  const cand=[];for(let dz=-36;dz<=36;dz+=3)for(let dx=-36;dx<=36;dx+=3){const d=Math.hypot(dx,dz);if(d<=36)cand.push([c[0]+dx,c[1]+dz,d]);}cand.sort((a,b)=>a[2]-b[2]);
  for(const [x,z] of cand){if(M.stands.length>=NEUST_STANDS.length)break;if(!neustFreeR(x,z,2)||M.stands.some(s=>Math.hypot(s.x-x,s.z-z)<7))continue;
    const a=Math.atan2(c[0]-x,c[1]-z)||0;const [name,col]=NEUST_STANDS[M.stands.length];M.stands.push({x,z,a,name,col});}}
function neustBuildMarkt(){const M=NEUST.markt;const WD=new GB(),MT=new GB(),CL=new GB(),FR=new GB(),SG=new GB();const dark=C3(0x55595e),white=C3(0xf4f1ea);
  const tex=freeAfterUpload(neustSignAtlas(NEUST_STANDS.map(([n])=>[n,'#f4ead0','#5a2a12'])));
  M.stands.forEach((s,k)=>{const Q=neustFrame(s.x,s.z,s.a);const rot=s.a,col=C3(s.col);// rot: Box-Breite quer zur Blickrichtung
    const p=Q(0.55,0,0);WD.box(p[0],0,p[2],3.0,0.9,1.0,rot,C3(0x7a5432),2);WD.box(p[0],0.9,p[2],3.1,0.05,1.1,rot,white,2);
    for(const [lx,lz] of [[1.05,-1.5],[1.05,1.5],[-0.9,-1.5],[-0.9,1.5]]){const q=Q(lx,0,lz);MT.beam([q[0],0,q[2]],[q[0],lx>0?2.35:2.65,q[2]],0.06,0.06,dark);}
    for(let i=0;i<6;i++){const l0=-1.6+i*0.533,l1=l0+0.533;const a0=Q(1.4,2.3,l0),b0=Q(1.4,2.3,l1),a1=Q(-1.1,2.7,l0),b1=Q(-1.1,2.7,l1);
      CL.quadOut([a0[0],2.3,a0[2]],[b0[0],2.3,b0[2]],[b1[0],2.7,b1[2]],[a1[0],2.7,a1[2]],[0,0],[1,0],[1,1],[0,1],i%2?white:col,[p[0],0,p[2]]);
      CL.quadOut([a0[0],2.3,a0[2]],[b0[0],2.3,b0[2]],[b1[0],2.7,b1[2]],[a1[0],2.7,a1[2]],[0,0],[1,0],[1,1],[0,1],shade(i%2?white:col,0.7),[p[0],5,p[2]]);}
    const goods=[0xc0392b,0xe67e22,0x7cb342,0xf1c40f,0x6d4c41,0xd81b60];for(let i=0;i<4;i++){const q=Q(0.65,0,-1.1+i*0.73);WD.box(q[0],0.95,q[2],0.6,0.18,0.5,rot,C3(0xa1887f),1);FR.box(q[0],1.13,q[2],0.52,0.1,0.42,rot,C3(goods[(k+i)%goods.length]),1);}
    const sg=Q(1.45,0,0);neustSignQuad(SG,k,NEUST_STANDS.length,[sg[0],sg[2]],1.85,2.6,0.42,Math.sin(s.a),Math.cos(s.a));});
  const grp=M.grp=new THREE.Group();scene.add(grp);for(const [g,m] of [[WD,vm('wood')],[MT,vm('metal')],[CL,vm('cloth')],[FR,vm('cloth')],[SG,stdMat({map:tex,roughness:0.8})]]){const ms=neustMesh(g,m,grp);if(ms)staticMesh(ms);}
  grp.visible=false;M.built=true;}
function neustMarktPerson(x,z,face,role){const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.facing=face;h.state='venue';h.neust={role,home:[x,z],face,evT:mr(2,9),wait:0,tgt:null};
  h.npcName=mpick(NPC_NAMES)+(role==='vendor'?' vom Wochenmarkt':' vom Gartenfeldplatz');h.walkSpeed=mr(0.9,1.25);h.sync();return h;}
function neustMarktSpawn(){const M=NEUST.markt;if(!M.built)neustBuildMarkt();
  // Handy: weniger Figuren (jede Figur kostet ~20 Draw-Calls), Stände ohne Händler bleiben trotzdem stehen
  M.stands.forEach((s,k)=>{if(LOWMEM&&k%2)return;const Q=neustFrame(s.x,s.z,s.a);const p=Q(-0.3,0,0);M.vendors.push(neustMarktPerson(p[0],p[2],s.a,'vendor'));});
  for(let i=0;i<(LOWMEM?3:8)&&M.stands.length;i++){const s=M.stands[i%M.stands.length];const Q=neustFrame(s.x,s.z,s.a);const p=Q(2.6+mr(0,1.5),0,mr(-1.2,1.2));if(blocked(p[0],p[2],0.5))continue;M.shoppers.push(neustMarktPerson(p[0],p[2],s.a+Math.PI,'shopper'));}
  M.on=true;}
function neustMarktDespawn(){const M=NEUST.markt;for(const h of [...M.vendors,...M.shoppers]){if(h.removed)continue;if(h.alive&&h.state==='talk')continue;h.remove();}M.vendors=[];M.shoppers=[];M.on=false;}
function neustMarktStep(h,dt){const nb=h.neust;if(!h.alive||h.removed||h.state!=='venue')return;
  if(nb.role==='shopper'){if(nb.tgt){const dx=nb.tgt[0]-h.x,dz=nb.tgt[1]-h.z,L=Math.hypot(dx,dz);if(L<0.5||nb.wait<-25){nb.tgt=null;nb.wait=mr(4,11);h.animate(dt,0);}else{moveHuman(h,dx,dz,h.walkSpeed,dt);faceTo(h,dx,dz,dt,6);h.animate(dt,h.walkSpeed);nb.wait-=dt;}}
    else{h.animate(dt,0);nb.wait-=dt;if(nb.stand)faceTo(h,nb.stand.x-h.x,nb.stand.z-h.z,dt,3);if(nb.wait<=0){const s=mpick(NEUST.markt.stands);const Q=neustFrame(s.x,s.z,s.a);const p=Q(2.4+mr(0,1.2),0,mr(-1.3,1.3));nb.tgt=[p[0],p[2]];nb.stand=s;nb.wait=0;}}}
  else{h.animate(dt,0);h.facing+=angDiff(h.facing,nb.face+Math.sin(simTime*0.4+h.phase)*0.4)*Math.min(1,dt*2);}
  nb.evT-=dt;if(nb.evT<=0){nb.evT=mr(7,16);if(minPlayerDist(h.x,h.z)<40&&!h.bubble){if(nb.role==='vendor')say(h,mpick(NEUST_VENDOR),3.2,Math.random()<0.4?'loud':'');
      else if(!nb.tgt){say(h,mpick(NEUST_SHOPPER),3);const v=NEUST.markt.vendors.find(o=>o.alive&&!o.removed&&nb.stand&&Math.hypot(o.x-nb.stand.x,o.z-nb.stand.z)<3);if(v)setTimeout(()=>{if(v.alive&&!v.removed&&!v.bubble)say(v,mpick(NEUST_REPLY),3);},1400);}}}
  h.y=groundY(h.x,h.z);h.sync();}
function neustUpdateMarkt(dt){const M=NEUST.markt;if(!M.stands.length)return;const m=gameMin;const inWin=m>=M.t0&&m<M.t1;const stallWin=m>=M.t0-60&&m<M.t1+30;const pd=minPlayerDist(M.x,M.z);
  if(stallWin&&!M.built&&pd<900)neustBuildMarkt();if(M.grp)M.grp.visible=stallWin;
  if(inWin&&!M.on&&pd<400)neustMarktSpawn();
  if(M.on&&(!inWin||pd>600))neustMarktDespawn();
  if(M.on){for(const h of M.vendors)neustMarktStep(h,dt);for(const h of M.shoppers)neustMarktStep(h,dt);
    if(!M.welcomed&&pd<30){M.welcomed=true;hint('<b>Wochenmarkt am Gartenfeldplatz</b> – 7 bis 13 Uhr: Obst, Gemüse, Worscht. <b>E</b>: Leute ansprechen.',4,P1);}}
  else M.welcomed=false;}

// ===================== STRASSENSZENEN AUF MEENZERISCH =====================
// Jede Szene: zwei, drei Leute, die sich unterhalten (Sprechblasen im Wechsel), sobald der Spieler in der Nähe ist.
const NEUST_SCENE_DEFS=[
  {id:'feldberg',name:'Studis am Feldbergplatz',pose:'sit',n:3,dialog:[[0,'Isch hab morsche Klausur. Isch sitz trotzdem hier.'],[1,'Lerne kannste aach im Café. Theoretisch.'],[2,'Die Mensa hat heut widder Weck, Worscht un Woi. Ohne Woi.'],[0,'Studiere in Meenz is wie Fassenacht: anstrengend, awwer schee.'],[1,'Noch en Latte, dann geh isch in die Bib. Versproche.'],[2,'Du sachst des seit drei Semestern.']]},
  {id:'spielplatz',name:'Spielplatz Feldbergplatz',n:2,dialog:[[0,'Kevin! Net so hoch schaukele, du Bub!'],[1,'Mei Klaa will nur noch in de Sandkaste. Mit Schuh.'],[0,'Gell, die Neustadt is e Kinnerparadies. Bloß Parkplätz gibt’s kaa.'],[1,'Unn wer hat widder die Schippe gemopst? KEVIN!']]},
  {id:'frauenlob',name:'Nachbarschaftsstreit Frauenlobstraße',n:2,dialog:[[0,'Des is MEI Parkplatz! Do steh isch seit 1987!'],[1,'Des is e öffentlich Stroß, Herr Schmitt!'],[0,'Öffentlich? In de Frauenlobstroß? Do lach isch!'],[1,'Unn Ihr Mülltonn steht aach widder uff meiner Seit!'],[0,'Die Tonn steht, wo se will. Wie isch.'],[1,'Isch ruf die Hausverwaltung. Morsche. Odder übermorsche.']]},
  {id:'zollhafen',name:'Kranhaus-Gucker am Zollhafen',n:2,dialog:[[0,'Guck emol, des Kranhaus! Wie en Kran, nur mit Fenster.'],[1,'Früher hamm se do Kohle verlade. Heut Cappuccino.'],[0,'Die Wohnunge do drüwwe koste mehr wie mei ganz Lebe.'],[1,'Dafür hast du de schönste Blick uff de Hafe. Umsonst.']]},
  {id:'rheinallee',name:'Autozähler an der Rheinallee',pose:'sit',n:2,dialog:[[0,'Zwaahunnertdreiunsiebzisch … zwaahunnertvierunsiebzisch …'],[1,'Was zählst’n du do, Hans?'],[0,'Die Autos uff de Rheinallee. Des is mei Hobby seit de Rente.'],[1,'Unn? Wie viel?'],[0,'Jetzt hab isch mich verzählt. Wieder von vorne. Eins …']]},
];
function neustRoadPoint(name,near,cls){let best=null,bd=1e9;for(const r of ROADS){if(r.name!==name||(cls!==undefined&&r.cls!==cls))continue;for(let i=0;i<r.pts.length-1;i++){const s=segDist(near[0],near[1],r.pts[i][0],r.pts[i][1],r.pts[i+1][0],r.pts[i+1][1]);if(s.d<bd){bd=s.d;const A=r.pts[i],B=r.pts[i+1];const L=Math.hypot(B[0]-A[0],B[1]-A[1])||1;best={x:near[0],z:near[1],r,ux:(B[0]-A[0])/L,uz:(B[1]-A[1])/L,A,B};}}}
  if(!best)return null;const p=segDist(near[0],near[1],best.A[0],best.A[1],best.B[0],best.B[1]);best.x=p.x;best.z=p.z;return best;}
function neustSidewalk(name,near,cls){const q=neustRoadPoint(name,near,cls);if(!q)return null;const off=q.r.w/2+Math.max(1.2,q.r.sw*0.6);for(const s of [1,-1]){const x=q.x-q.uz*off*s,z=q.z+q.ux*off*s;const p=neustSpiral(x,z,6,1,(a,b)=>neustFreeR(a,b,1));if(p)return {x:p[0],z:p[1],face:Math.atan2(q.ux,q.uz),toRoad:Math.atan2(q.x-p[0],q.z-p[1])};}return null;}
function neustSceneSpots(id){const K=NEUST.kranhaus;
  if(id==='feldberg'){const t=NEUST.cafe.tables[0];return t?t.seats.map(s=>[s[0],s[1],s[2]]):null;}
  if(id==='spielplatz'){const p=NEUST.playground;if(!p)return null;return [[p.x+3.2,p.z-0.5,-Math.PI/2],[p.x+3.4,p.z+0.9,-Math.PI/2-0.6]];}
  if(id==='frauenlob'){const s=neustSidewalk('Frauenlobstraße',neustArea('Frauenlobplatz',[-787,-1063]),4)||neustSidewalk('Frauenlobstraße',[-850,-900]);if(!s)return null;
    const ux=Math.sin(s.face),uz=Math.cos(s.face);return [[s.x-ux*0.8,s.z-uz*0.8,s.face],[s.x+ux*0.8,s.z+uz*0.8,s.face+Math.PI]];}
  if(id==='zollhafen'){const P=NEUST.promenade.find(p=>p.kind==='bank')||NEUST.promenade[0];if(!P)return K?[[K.door[0]+2,K.door[1],0],[K.door[0]+3,K.door[1],Math.PI]]:null;const Q=neustFrame(P.x,P.z,P.a);const a=Q(-0.2,0,1.6),b=Q(-0.2,0,2.6);return [[a[0],a[2],P.a],[b[0],b[2],P.a-0.5]];}
  if(id==='rheinallee'){const s=neustSidewalk('Rheinallee',[-905,-1495])||neustSidewalk('Rheinallee',[-800,-1420]);if(!s)return null;const ux=Math.sin(s.face),uz=Math.cos(s.face);
    return [[s.x,s.z,s.toRoad],[s.x+ux*0.9,s.z+uz*0.9,s.toRoad]];}
  return null;}
function neustSetupScenes(){for(const d of NEUST_SCENE_DEFS){const spots=neustSceneSpots(d.id);if(!spots||!spots.length)continue;let x=0,z=0;for(const s of spots){x+=s[0];z+=s[1];}x/=spots.length;z/=spots.length;
  if(d.id==='rheinallee'){const WD=new GB();WD.box(x,0,z,2.2,0.45,0.6,spots[0][2],C3(0x6b4426),1);neustMesh(WD,vm('wood'));}// Bank für die Autozähler
  NEUST.scenes.push({id:d.id,name:d.name,x,z,spots:spots.slice(0,d.n),pose:d.pose,dialog:d.dialog,people:[],active:false,line:0,t:mr(1,4),said:0});}}
function neustSceneSpawn(sc){sc.people=sc.spots.map(([x,z,f],i)=>{const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.facing=f;h.state='venue';h.neustScene=sc;h.npcName=mpick(NPC_NAMES)+' ('+sc.name.split(' ')[0]+')';
  if(sc.pose==='sit'){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;h.neustSit=true;}h.sync();return h;});sc.active=true;}
function neustSceneDespawn(sc){for(const h of sc.people)if(!h.removed&&!(h.alive&&h.state==='talk'))h.remove();sc.people=[];sc.active=false;}
function neustUpdateScenes(dt){for(const sc of NEUST.scenes){const d=minPlayerDist(sc.x,sc.z);
  if(!sc.active&&d<120)neustSceneSpawn(sc);else if(sc.active&&d>200)neustSceneDespawn(sc);if(!sc.active)continue;
  const live=sc.people.filter(h=>h.alive&&!h.removed);for(const h of live){if(h.state!=='venue')continue;if(h.neustSit){if(h.fx&&h.face.visible)h.updateFace();h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}else{h.animate(dt,0);h.sync();}}
  sc.t-=dt;if(sc.t<=0&&d<35&&live.length){const [who,text]=sc.dialog[sc.line%sc.dialog.length];const h=sc.people[who];sc.t=mr(3.6,5.2);if(h&&h.alive&&!h.removed&&h.state==='venue'){say(h,text,3.4);h.setExpr(mpick(['smile','laugh','smug','surprised']));sc.said++;}sc.line++;}}}

// ===================== RHEINALLEE: DICHTERER VERKEHR =====================
// Innerhalb der bestehenden Verkehrs-Obergrenze: ein Teil der Neuspawns landet gezielt auf Rheinallee-Kanten.
let neustRaPick=false;
function neustRaNear(px,pz){const R=NEUST.ra;for(const m of R.mids)if(Math.abs(m[0]-px)<R.near&&Math.abs(m[1]-pz)<R.near&&Math.hypot(m[0]-px,m[1]-pz)<R.near)return true;return false;}
const _neustSpawnTraffic=spawnTraffic;
spawnTraffic=function(px,pz,rmin,rmax){const R=NEUST.ra;if(!R.edges.length||!neustRaNear(px,pz))return _neustSpawnTraffic(px,pz,rmin,rmax);
  const n0=CARS.length;neustRaPick=R.bias>0&&Math.random()<R.bias;try{_neustSpawnTraffic(px,pz,rmin,rmax);}finally{neustRaPick=false;}
  // Statistik für den Test: Anteil der Neuspawns in Rheinallee-Nähe, die auf der Rheinallee landen
  if(CARS.length>n0){const c=CARS[CARS.length-1];R.spawned++;if(c.ai&&c.ai.e!==undefined&&EDGES[c.ai.e].road.name==='Rheinallee')R.onRa++;}};
const _neustRandomEdge=randomEdgeNear;
randomEdgeNear=function(px,pz,rmin,rmax,carOnly){if(neustRaPick&&carOnly){const R=NEUST.ra;for(let k=0;k<24;k++){const j=(Math.random()*R.edges.length)|0;const E=EDGES[R.edges[j]];if(E.dead)continue;const m=R.mids[j];const d=Math.hypot(m[0]-px,m[1]-pz);if(d<rmin||d>rmax)continue;return R.edges[j];}}
  return _neustRandomEdge(px,pz,rmin,rmax,carOnly);};
function neustSetupRheinallee(){const R=NEUST.ra;R.cap=Q.traffic;EDGES.forEach((E,e)=>{if(E.car&&!E.dead&&E.road.name==='Rheinallee'&&E.len>=8){const A=NODES[E.a],B=NODES[E.b];R.edges.push(e);R.mids.push([(A.x+B.x)/2,(A.z+B.z)/2]);}});}

// ===================== SCHNELLREISE =====================
const _neustFtSpecials=ftSpecials;
ftSpecials=function(){const S=_neustFtSpecials();for(const d of NEUST.ft)S.push(d);return S;};
function neustSetupTravel(){const K=NEUST.kranhaus,M=NEUST.markt,C=NEUST.cafe;
  if(K)NEUST.ft.push({n:'Zollhafen & Kranhaus',g:'Neustadt',x:K.door[0]+Math.sin(K.door[2])*3,z:K.door[1]+Math.cos(K.door[2])*3});
  if(M.stands.length)NEUST.ft.push({n:'Gartenfeldplatz (Wochenmarkt)',g:'Neustadt',x:M.x,z:M.z});
  if(C.tables.length)NEUST.ft.push({n:'Feldbergplatz',g:'Neustadt',x:C.x,z:C.z});}

// ===================== SETUP / UPDATE =====================
function setupNeust(){
  neustBuildZollhafen();
  const v=neustVenueDef();const K=NEUST.kranhaus;v.door=K.door;v.labeled=true;VENUES.push(v);NEUST.venue=v;label(v.name+' (begehbar)',K.door[0],K.door[1],'small');
  neustBuildFeldberg();neustMarktLayout();neustSetupScenes();neustSetupRheinallee();neustSetupTravel();
  NEUST.ready=true;}
function updateNeust(dt){if(!NEUST.ready||mode!=='play')return;neustUpdateMarkt(dt);neustUpdateScenes(dt);}
