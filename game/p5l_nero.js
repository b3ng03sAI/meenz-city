// ===================== 29 NEROBERGBAHN + KOCHBRUNNEN =====================
// Wasserballast-Standseilbahn (1888) auf dem echten Viadukt-Verlauf aus OSM (railway=funicular, Talstation „Nerotal“).
// Die Karte endet ~95 m hinter der Talstation (OSM.bounds, Nordrand z=-10752); die echte Bergstation (438 m Strecke)
// liegt außerhalb. Darum endet die Bahn an einer Aussichts-Bergstation am Kartenrand, dahinter ein Kulissen-Neroberg.
// Kochbrunnen: eigener Brunnentempel am echten Ort (OSM amenity=drinking_water „Kochbrunnen“), E = trinken.
const NERO_A=[-3472.5,-10668.7];                      // unteres Gleisende in der Talstation (OSM way 144909156)
const NERO_U=(()=>{const dx=-3417.0-NERO_A[0],dz=-10748.6-NERO_A[1],l=Math.hypot(dx,dz);return [dx/l,dz/l];})(); // bergauf, Richtung Kartenrand
const NERO_N=[-NERO_U[1],NERO_U[0]];                  // quer, zeigt nach Ostsüdost (Stadtseite)
const NERO_TH=Math.atan2(NERO_U[0],NERO_U[1]);        // rotation.y für lokale +z = bergauf
const NERO_L=94,NERO_G=0.19,NERO_Y0=0.35;             // Gleislänge im Kartenbereich, Steigung 19 % (echter Mittelwert), Bahnsteighöhe
const NERO_SB=5,NERO_ST=NERO_L-5,NERO_SM=NERO_L/2;    // Wagenmitte an Tal-/Bergstation, Ausweiche in der Mitte
const NERO_LOOP=1.45,NERO_DWELL=14,NERO_RIDE=32,NERO_FARE=4,NERO_COOL=60,NERO_STINK=30;
const NERO_STAT=11;                                   // Länge der Bahnhofsbereiche an beiden Enden
const NERO={cars:[],stations:{tal:null,berg:null},riding:null,brunnen:{x:-2298.6,z:-9736.9},stinkT:0,cool:0,stinkId:0,reacts:0,
  phase:'halt',t:NERO_DWELL*0.5,prog:0,p0:0,p1:1,trips:0,ready:false,schaffner:null,hintT:0,partT:0,
  STINK_LINES:['Bäh! Was stinkt dann do so?!','Ei, hasde im Kochbrunne gebade?','Uff, des riecht wie faule Eier – geh mer fott!',
    'Pfui Deiwel! Abstand, gell!','Hier hat aaner Schwefel gesse!','Du riechst wie de Kochbrunne an em heiße Dag!','Mach emol e Fenster uff … ach, mir sinn ja drauße.'],
  SCHAFFNER_LINES:['Ei gude! Vier Euro, un gut festhalte!','Eisteige, die Bahn fährt gleich!','Mit Wasser nuff – des is Physik, Schätzelsche!']};

function neroW(s,l){return [NERO_A[0]+NERO_U[0]*s+NERO_N[0]*l,NERO_A[1]+NERO_U[1]*s+NERO_N[1]*l];}
function neroP3(s,l,y){const p=neroW(s,l);return [p[0],y,p[1]];}
function neroLocal(x,z){const dx=x-NERO_A[0],dz=z-NERO_A[1];return [dx*NERO_U[0]+dz*NERO_U[1],dx*NERO_N[0]+dz*NERO_N[1]];}
function neroDeckY(s){return NERO_Y0+NERO_G*clamp(s,0,NERO_L);}
function neroBump(s){return smoothstep(NERO_SM-18,NERO_SM-8,s)*(1-smoothstep(NERO_SM+8,NERO_SM+18,s));}
function neroOff(s,side){return side*NERO_LOOP*neroBump(s);}
function neroInStation(s){return s<NERO_STAT||s>NERO_L-NERO_STAT;}
function neroLo(s){return neroInStation(s)?-3.6:-2.6;}
function neroHi(s){return neroInStation(s)?6.0:4.4;}
function neroCol(h){return {r:((h>>16)&255)/255,g:((h>>8)&255)/255,b:(h&255)/255};}
const NERO_TOP=neroDeckY(NERO_L);                     // Höhe der Aussichtsterrasse

// Bäume/Laternen aus OSM nicht durchs Viadukt bzw. den Brunnentempel wachsen lassen; OSM-Gebäude durch eigene Modelle ersetzen
function neroClear(x,z){const [s,l]=neroLocal(x,z);if(s>-13&&s<NERO_L+6&&l>-7&&l<15)return true;return Math.hypot(x-NERO.brunnen.x,z-NERO.brunnen.z)<6;}
const _neroAddTree=addTree;
addTree=function(x,z,s,force){if(neroClear(x,z))return false;return _neroAddTree(x,z,s,force);};
{const L=OSM.lamps,out=[];for(let i=0;i<L.length;i+=2)if(!neroClear(L[i]/10,L[i+1]/10))out.push(L[i],L[i+1]);OSM.lamps=out;}
LM_SKIP.add(145208459);LM_SKIP.add(175765813);        // OSM: Nerobergbahn Talstation, Kochbrunnen Tempel

// ---------- Materialien (geteilt) ----------
let NERO_MAT=null;
function neroMats(){if(NERO_MAT)return NERO_MAT;
  NERO_MAT={vc:stdMat({vertexColors:true,roughness:0.72,metalness:0.12}),stone:M.redStone,light:M.lightStone,roof:M.slate,
    water:stdMat({color:0x3d8fc4,roughness:0.12,metalness:0.1,transparent:true,opacity:0.82}),copper:M.copper,
    sinter:stdMat({color:0xb36a34,roughness:0.9}),hot:stdMat({color:0x9fb8a8,roughness:0.08,metalness:0.1}),
    forest:stdMat({vertexColors:true,roughness:1}),tree:stdMat({color:0x3f6a33,roughness:0.95})};
  return NERO_MAT;}
function neroMesh(geo,mat,cast=true){const m=new THREE.Mesh(geo,mat);m.castShadow=cast;m.receiveShadow=true;scene.add(m);return staticMesh(m);}

// ---------- Strecke: Gleisbett, Treppenweg, Geländer, Fachwerkträger, Pfeiler ----------
function neroBuildTrack(){const Mt=neroMats();const tr=new GB(),st=new GB();
  const gravel=neroCol(0x6b655c),step=neroCol(0xb9b2a4),steel=neroCol(0x34433d),sleeper=neroCol(0x4a3626),rail=neroCol(0x8a8f92),rack=neroCol(0x2a2a2a);
  const P=neroP3;
  for(let s=-9.5;s<NERO_L+3;s+=1){const s1=s+1,y0=neroDeckY(s),y1=neroDeckY(s1),lo=neroLo(s+0.5),hi=neroHi(s+0.5),ym=neroDeckY(s+0.5);
    const below=P(s+0.5,0.9,ym-3);
    tr.quadOut(P(s,lo,y0),P(s,2.6,y0),P(s1,2.6,y1),P(s1,lo,y1),[0,0],[1,0],[1,1],[0,1],gravel,below);
    tr.quadOut(P(s,2.6,ym),P(s,hi,ym),P(s1,hi,ym),P(s1,2.6,ym),[0,0],[1,0],[1,1],[0,1],step,below);        // Stufe
    if(ym>neroDeckY(s-0.5)+0.01)tr.quadOut(P(s,2.6,ym-NERO_G),P(s,hi,ym-NERO_G),P(s,hi,ym),P(s,2.6,ym),[0,0],[1,0],[1,1],[0,1],step,P(s+1,0.9,ym));
    if(s>=NERO_STAT&&s<NERO_L-NERO_STAT){const ref=P(s+0.5,0.9,ym-0.4);
      tr.quadOut(P(s,lo,y0+0.05),P(s1,lo,y1+0.05),P(s1,lo,y1-0.8),P(s,lo,y0-0.8),[0,0],[1,0],[1,1],[0,1],steel,ref);
      tr.quadOut(P(s,hi,y0+0.05),P(s1,hi,y1+0.05),P(s1,hi,y1-0.8),P(s,hi,y0-0.8),[0,0],[1,0],[1,1],[0,1],steel,ref);
      tr.quadOut(P(s,lo,y0-0.8),P(s,hi,y0-0.8),P(s1,hi,y1-0.8),P(s1,lo,y1-0.8),[0,0],[1,0],[1,1],[0,1],steel,P(s+0.5,0.9,ym+3));}
    // Schwellen + Schienen + Zahnstange (Riggenbach) je Ausweichgleis
    if(s>=-0.5&&s<NERO_L+0.3)for(const side of [1,-1]){if(side<0&&neroBump(s+0.5)<0.001)continue;const o0=neroOff(s,side),o1=neroOff(s1,side);
      for(const so of [0,0.5])tr.beam(P(s+so,neroOff(s+so,side)-0.85,neroDeckY(s+so)+0.04),P(s+so,neroOff(s+so,side)+0.85,neroDeckY(s+so)+0.04),0.22,0.1,sleeper);
      for(const g of [-0.5,0.5])tr.beam(P(s,o0+g,y0+0.14),P(s1,o1+g,y1+0.14),0.07,0.12,rail);
      tr.beam(P(s,o0,y0+0.12),P(s1,o1,y1+0.12),0.12,0.1,rack);}}
  // Geländer außerhalb der Bahnhöfe
  for(let s=NERO_STAT;s<NERO_L-NERO_STAT;s+=2){const s1=s+2;for(const l of [neroLo(s)+0.08,neroHi(s)-0.08]){
    tr.beam(P(s,l,neroDeckY(s)),P(s,l,neroDeckY(s)+1.05),0.06,0.06,steel);tr.beam(P(s,l,neroDeckY(s)+1.0),P(s1,l,neroDeckY(s1)+1.0),0.06,0.06,steel);
    tr.beam(P(s,l,neroDeckY(s)+0.5),P(s1,l,neroDeckY(s1)+0.5),0.04,0.04,steel);}}
  // Fachwerkträger unter der Fahrbahn
  for(let s=NERO_STAT;s<NERO_L-NERO_STAT;s+=3){const s1=Math.min(s+3,NERO_L-NERO_STAT);for(const l of [neroLo(s)+0.1,neroHi(s)-0.1]){
    const a=neroDeckY(s)-0.8,b=neroDeckY(s1)-0.8;tr.beam(P(s,l,a),P(s,l,a-1.3),0.12,0.12,steel);tr.beam(P(s,l,a-1.3),P(s1,l,b-1.3),0.16,0.16,steel);tr.beam(P(s,l,a-1.3),P(s1,l,b),0.08,0.08,steel);}}
  // Pfeiler (Sandstein), nicht auf Straßen
  const roadAt=(s,l)=>{const p=neroW(s,l);const i=idx(p[0],p[1]);return i>=0&&(mfG(i)&2);};
  for(let s0=14;s0<NERO_L-NERO_STAT-1;s0+=10){let s=null;for(const d of [0,2,-2,4,-4,6])if(![-1.6,3.4].some(l=>roadAt(s0+d,l-0.7)||roadAt(s0+d,l+0.7))){s=s0+d;break;}
    if(s===null)continue;const top=neroDeckY(s)-2.1;
    for(const l of [-1.6,3.4]){const p=neroW(s,l);st.box(p[0],0,p[1],1.3,top,1.3,NERO_TH,WHITE,2);elevOBB(p[0],p[1],1.3,1.3,NERO_TH,0,neroDeckY(s));}
    const c=neroW(s,0.9);st.box(c[0],top-0.45,c[1],7.4,0.5,1.5,NERO_TH,WHITE,2);}
  // Bahnhofssockel: unten bis s=STAT, oben gemauerter Turm unter Bahnsteig und Terrasse
  for(let s=-9.5;s<NERO_STAT;s+=1){const c=neroW(s+0.5,1.2);st.box(c[0],0,c[1],9.6,neroDeckY(s+0.5)-0.02,1,NERO_TH,WHITE,2,false);}
  for(let s=NERO_L-NERO_STAT;s<NERO_L+3;s+=1){const c=neroW(s+0.5,1.2);st.box(c[0],0,c[1],9.6,neroDeckY(s+0.5)-0.02,1,NERO_TH,WHITE,2,false);}
  {const c=neroW(NERO_L-2,9);st.box(c[0],0,c[1],6,NERO_TOP,10,NERO_TH,WHITE,2);}
  // Terrassenboden + Brüstung, Bänke, Fernrohr
  const ter=[[NERO_L,NERO_L+3,-3.6,6],[NERO_L-7,NERO_L+3,6,12]];
  for(const [s0,s1,l0,l1] of ter)tr.quadOut(P(s0,l0,NERO_TOP+0.02),P(s0,l1,NERO_TOP+0.02),P(s1,l1,NERO_TOP+0.02),P(s1,l0,NERO_TOP+0.02),[0,0],[1,0],[1,1],[0,1],step,P((s0+s1)/2,(l0+l1)/2,NERO_TOP-3));
  const bal=[[NERO_L+3,-3.6,NERO_L+3,12],[NERO_L-7,12,NERO_L+3,12],[NERO_L-7,6,NERO_L-7,12]];
  for(const [sa,la,sb,lb] of bal){const n=Math.ceil(Math.hypot(sb-sa,lb-la)/1.5);for(let k=0;k<=n;k++){const s=lerp(sa,sb,k/n),l=lerp(la,lb,k/n);tr.beam(P(s,l,NERO_TOP),P(s,l,NERO_TOP+1.05),0.07,0.07,steel);}
    tr.beam(P(sa,la,NERO_TOP+1.05),P(sb,lb,NERO_TOP+1.05),0.1,0.08,steel);tr.beam(P(sa,la,NERO_TOP+0.55),P(sb,lb,NERO_TOP+0.55),0.05,0.05,steel);}
  const wood=neroCol(0x7a5230);for(const s of [NERO_L-5.5,NERO_L-2]){const c=neroW(s,11.2);tr.box(c[0],NERO_TOP+0.45,c[1],0.5,0.08,1.8,NERO_TH,wood,1);tr.box(c[0],NERO_TOP,c[1],0.4,0.45,1.6,NERO_TH,steel,1);
    const b=neroW(s,11.5);tr.box(b[0],NERO_TOP+0.5,b[1],0.08,0.5,1.8,NERO_TH,wood,1);}
  {const p=P(NERO_L+1.5,10.8,NERO_TOP);tr.beam(p,[p[0],NERO_TOP+1.2,p[2]],0.1,0.1,steel);const d=neroW(NERO_L+0.9,11.6);tr.beam([p[0],NERO_TOP+1.25,p[2]],[d[0],NERO_TOP+1.45,d[1]],0.16,0.16,neroCol(0x7d6a3a));}
  // Prellböcke, Wasserrohr zum Befüllen oben
  tr.beam(P(NERO_L+0.3,-0.9,NERO_TOP+0.1),P(NERO_L+0.3,0.9,NERO_TOP+0.1),0.3,0.5,neroCol(0xb23a2a));tr.beam(P(-0.4,-0.9,NERO_Y0+0.1),P(-0.4,0.9,NERO_Y0+0.1),0.3,0.5,neroCol(0xb23a2a));
  const pipeY=neroDeckY(NERO_ST)+3.6;tr.beam(P(NERO_ST,-3.5,pipeY),P(NERO_ST,-1.6,pipeY),0.18,0.18,steel);tr.beam(P(NERO_ST,-1.6,pipeY),P(NERO_ST,-1.6,neroDeckY(NERO_ST)+1.2),0.18,0.18,steel);
  NERO.pipe=P(NERO_ST,-1.25,neroDeckY(NERO_ST)+1.2);
  neroMesh(tr.geo(),Mt.vc);neroMesh(st.geo(),Mt.stone);}

// ---------- Bahnhöfe (eigener Entwurf: Sandsteinsäulen, Fachwerkwand, Schieferdach) ----------
function neroHall(s0,s1,eave,ridgeUp,door,walls,roofs,cols,tim){const P=neroP3,lo=-3.6,hi=6.0,lm=1.2,ridge=eave+ridgeUp;const wood=neroCol(0x3b2a1e);
  const fl=s=>s<NERO_STAT+1&&s0<0?NERO_Y0:neroDeckY(s);
  // linke Fachwerkwand (Straßenseite), Wandunterkante folgt dem Gleis
  for(let s=s0;s<s1;s+=2){const a=Math.min(s+2,s1);walls.quadOut(P(s,lo,fl(s)),P(a,lo,fl(a)),P(a,lo,eave),P(s,lo,eave),[s/3,fl(s)/3],[a/3,fl(a)/3],[a/3,eave/3],[s/3,eave/3],WHITE,P((s+a)/2,lm,eave/2));
    walls.quadOut(P(s,lo-0.3,fl(s)),P(a,lo-0.3,fl(a)),P(a,lo-0.3,eave),P(s,lo-0.3,eave),[s/3,fl(s)/3],[a/3,fl(a)/3],[a/3,eave/3],[s/3,eave/3],WHITE,P((s+a)/2,lm,eave/2));}
  // Giebel (beide Enden), hinten unten mit Tür
  for(const [s,out] of [[s0,-1],[s1,1]]){const ref=P(s-out,lm,eave);walls.triOut(P(s,lo-0.3,eave),P(s,hi+0.3,eave),P(s,lm,ridge),[0,0],[3,0],[1.5,1],WHITE,ref);
    if(door){const y=fl(s);if(out<0){walls.quadOut(P(s,lo,y),P(s,door[0],y),P(s,door[0],eave),P(s,lo,eave),[0,0],[1,0],[1,2],[0,2],WHITE,ref);
      walls.quadOut(P(s,door[1],y),P(s,hi,y),P(s,hi,eave),P(s,door[1],eave),[0,0],[1,0],[1,2],[0,2],WHITE,ref);
      walls.quadOut(P(s,door[0],y+2.9),P(s,door[1],y+2.9),P(s,door[1],eave),P(s,door[0],eave),[0,0],[1,0],[1,1],[0,1],WHITE,ref);}}}
  // Fachwerk: Balken außen auf Wand und Giebeln
  const lw=lo-0.34;for(let s=s0;s<s1-0.1;s+=2){const a=Math.min(s+2,s1);tim.beam(P(s,lw,fl(s)+1),P(a,lw,fl(a)+1),0.18,0.18,wood);tim.beam(P(s,lw,fl(s)),P(s,lw,eave),0.2,0.2,wood);
    if(Math.round(s-s0)%4===0)tim.beam(P(s,lw,fl(s)+1),P(a,lw,eave-0.2),0.15,0.15,wood);}
  tim.beam(P(s0,lw,eave-0.1),P(s1,lw,eave-0.1),0.22,0.22,wood);tim.beam(P(s1,lw,fl(s1)),P(s1,lw,eave),0.2,0.2,wood);
  for(const [s,out] of [[s0-0.03,-1],[s1+0.03,1]]){const sg=s+out*0.03;tim.beam(P(sg,lo-0.3,eave),P(sg,hi+0.3,eave),0.2,0.2,wood);
    for(let l=lo;l<=hi+0.01;l+=(hi-lo)/6){const top=eave+ridgeUp*(1-Math.abs(l-lm)/(hi+0.3-lm));tim.beam(P(sg,l,eave),P(sg,l,top),0.16,0.16,wood);}
    tim.beam(P(sg,lo-0.3,eave),P(sg,lm,ridge),0.2,0.2,wood);tim.beam(P(sg,hi+0.3,eave),P(sg,lm,ridge),0.2,0.2,wood);}
  // Säulen auf der offenen Bahnsteigseite und an der Wand
  for(let s=s0+0.4;s<=s1;s+=Math.max(2,(s1-s0-0.8)/4)){for(const l of [lo+0.1,hi-0.2]){const p=neroW(s,l);const y=fl(s);cols.box(p[0],y,p[1],0.55,eave-y,0.55,NERO_TH,WHITE,1.5);}}
  // Satteldach mit Überstand, Unterseite sichtbar
  const e0=s0-0.6,e1=s1+0.6,L0=lo-0.5,L1=hi+0.5;
  roofs.quadOut(P(e0,L0,eave-0.2),P(e1,L0,eave-0.2),P(e1,lm,ridge),P(e0,lm,ridge),[0,0],[(e1-e0)/2,0],[(e1-e0)/2,2.5],[0,2.5],WHITE,P((e0+e1)/2,lm,eave-4));
  roofs.quadOut(P(e0,L1,eave-0.2),P(e1,L1,eave-0.2),P(e1,lm,ridge),P(e0,lm,ridge),[0,0],[(e1-e0)/2,0],[(e1-e0)/2,2.5],[0,2.5],WHITE,P((e0+e1)/2,lm,eave-4));
  roofs.quadOut(P(e0,L0,eave-0.22),P(e1,L0,eave-0.22),P(e1,lm,ridge-0.02),P(e0,lm,ridge-0.02),[0,0],[1,0],[1,1],[0,1],WHITE,P((e0+e1)/2,lm,ridge+4));
  roofs.quadOut(P(e0,L1,eave-0.22),P(e1,L1,eave-0.22),P(e1,lm,ridge-0.02),P(e0,lm,ridge-0.02),[0,0],[1,0],[1,1],[0,1],WHITE,P((e0+e1)/2,lm,ridge+4));
  // Wand blockiert (Straßenseite)
  for(let s=s0;s<s1;s+=1){const p=neroW(s+0.5,lo-0.2);elevOBB(p[0],p[1],1.2,1.2,NERO_TH,0,eave);}
  if(door)for(let l=lo;l<hi;l+=1)if(l+1<=door[0]||l>=door[1]){const p=neroW(s0-0.1,l+0.5);elevOBB(p[0],p[1],1.2,1.2,NERO_TH,0,eave);}}
function neroSign(text,sub,w,h){const t=canvasTex(512,128,g=>{g.fillStyle='#1f3d2c';g.fillRect(0,0,512,128);g.strokeStyle='#c9a54a';g.lineWidth=6;g.strokeRect(6,6,500,116);
    g.fillStyle='#e8c766';g.font='bold 54px Georgia,serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,sub?52:66);if(sub){g.font='italic 26px Georgia,serif';g.fillText(sub,256,100);}},false);
  freeAfterUpload(t);return new THREE.Mesh(new THREE.PlaneGeometry(w,h),stdMat({map:t,roughness:0.6}));}
function neroBuildStations(){const Mt=neroMats();const walls=new GB(),roofs=new GB(),tim=new GB();
  neroHall(-9.5,NERO_STAT,6.8,2.6,[-0.2,2.6],walls,roofs,walls,tim);
  neroHall(NERO_L-NERO_STAT,NERO_L+3,NERO_TOP+4.6,2.2,null,walls,roofs,walls,tim);
  neroMesh(walls.geo(),Mt.light);neroMesh(roofs.geo(),Mt.roof);neroMesh(tim.geo(),Mt.vc);
  // Schilder: Talstation hinten zur Stadt, Bergstation zur Stadtseite
  const a=neroSign('NEROBERGBAHN','seit 1888',4.6,1.15);const pa=neroW(-9.95,1.2);a.position.set(pa[0],7.6,pa[1]);a.rotation.y=Math.atan2(-NERO_U[0],-NERO_U[1]);scene.add(a);
  const b=neroSign('NEROBERG','Bergstation · Aussicht',4.2,1.05);const pb=neroW(NERO_L-4,6.45);b.position.set(pb[0],NERO_TOP+3.6,pb[1]);b.rotation.y=Math.atan2(NERO_N[0],NERO_N[1]);scene.add(b);}

// ---------- Wagen: drei gestufte Abteile, Wassertank darunter (Scherung = Steigung) ----------
let NERO_WATER_GEO=null;
function neroCarGeo(paint){const g=new GB();const G=NERO_G;const pc=neroCol(paint),cream=neroCol(0xeee3c4),glass=neroCol(0x30424f),dark=neroCol(0x1b1d1f),roofc=neroCol(0x4b4f52),brass=neroCol(0xc9a54a),steel=neroCol(0x56605c);
  for(let k=0;k<3;k++){const zc=(k-1)*2.65,yb=1.15+G*zc;
    g.box(0,yb-0.15,zc,2.3,1.1,2.62,0,pc,1);g.box(0,yb+0.72,zc,2.33,0.1,2.64,0,cream,1);
    g.box(0,yb+0.95,zc,2.18,0.85,2.5,0,glass,1,false);
    for(const zz of [zc-1.25,zc,zc+1.25])for(const x of [-1.11,1.11])g.box(x,yb+0.95,zz,0.13,0.86,0.13,0,cream,1,false);
    g.box(0,yb+1.8,zc,2.46,0.14,2.78,0,cream,1);g.box(0,yb+1.94,zc,2.1,0.12,2.5,0,roofc,1);}
  for(const z of [-4.05,4.05]){const yb=1.15+G*z;g.box(0,yb-0.15,z,2.3,0.12,0.25,0,dark,1);g.box(0,yb+0.95,z,1.6,0.08,0.06,0,brass,1);g.box(0,yb+1.5,z,0.22,0.22,0.12,0,neroCol(0xfff1b0),1);}
  g.beam([0,0.42-G*3.95,-3.95],[0,0.42+G*3.95,3.95],1.7,0.28,dark);
  for(const z of [-3,3])for(const x of [-0.5,0.5])g.box(x,0.02+G*z,z,0.14,0.5,0.62,0,dark,1);
  // offener Stahlkäfig für den Wassertank (Scherung entlang der Steigung)
  const sh=(x,y,z)=>[x,y+G*z,z];const X=0.86,Y0=0.32,Y1=1.0,Z=3.25;
  for(const x of [-X,X])for(const y of [Y0,Y1])g.beam(sh(x,y,-Z),sh(x,y,Z),0.07,0.07,steel);
  for(const z of [-Z,Z])for(const y of [Y0,Y1])g.beam(sh(-X,y,z),sh(X,y,z),0.07,0.07,steel);
  for(let z=-Z;z<=Z+0.01;z+=Z/4)for(const x of [-X,X])g.beam(sh(x,Y0,z),sh(x,Y1,z),0.05,0.05,steel);
  g.beam(sh(-X,Y0-0.02,-Z),sh(X,Y0-0.02,Z),0.05,0.05,steel);
  return g.geo();}
function neroMakeCar(id,paint,side){const Mt=neroMats();const grp=new THREE.Group();scene.add(grp);
  const body=new THREE.Mesh(neroCarGeo(paint),Mt.vc);body.castShadow=true;grp.add(body);
  const tank=new THREE.Group();tank.position.set(0,0.34,0);tank.rotation.x=-Math.atan(NERO_G);grp.add(tank);
  if(!NERO_WATER_GEO)NERO_WATER_GEO=new THREE.BoxGeometry(1.62,0.64,6.4).translate(0,0.32,0);
  const water=new THREE.Mesh(NERO_WATER_GEO,Mt.water);tank.add(water);
  return {id,g:grp,water,side,s:NERO_SB,x:0,y:0,z:0,off:0,ballast:0,docked:null};}

// ---------- Kulisse: Neroberg hinter dem Kartenrand (Hang, Wald, Tempelchen) ----------
function neroHillH(lx,d){const plat=(NERO_TOP+1)*smoothstep(0,30,d)*(1-smoothstep(28,75,Math.abs(lx)));
  const base=78*Math.pow(smoothstep(-20,280,d),0.85)*(1-smoothstep(150,260,Math.abs(lx)));const n=3.5*Math.sin(lx*0.045+d*0.031)+2.5*Math.sin(lx*0.11-d*0.07);
  return Math.max(0,Math.max(plat,base)+n*smoothstep(0,25,d));}
function neroBuildHill(){const Mt=neroMats();const cx=neroW(NERO_L,0)[0];const NX=27,ND=22,pos=[],col=[],ix=[];
  for(let j=0;j<ND;j++)for(let i=0;i<NX;i++){const lx=(i/(NX-1)-0.5)*520,d=j*15;const h=neroHillH(lx,d);pos.push(cx+lx,h,MINZ-0.6-d);
    const c=new THREE.Color().setHSL(0.28+0.03*Math.sin(i*1.7+j),0.42,0.2+0.04*Math.sin(i*0.9+j*1.3));col.push(c.r,c.g,c.b);}
  for(let j=0;j<ND-1;j++)for(let i=0;i<NX-1;i++){const a=j*NX+i,b=a+1,c=a+NX,d=c+1;ix.push(a,b,c,b,d,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(ix);g.computeVertexNormals();
  const hill=new THREE.Mesh(g,Mt.forest);hill.receiveShadow=false;scene.add(hill);staticMesh(hill);
  // Wald
  const n=LOWMEM?90:200;const cone=new THREE.ConeGeometry(3.2,11,7).translate(0,5.5,0);const im=new THREE.InstancedMesh(cone,Mt.tree,n);const R=mulberry32(2929);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),p=new THREE.Vector3();let k=0;
  for(let t=0;t<n*4&&k<n;t++){const lx=(R()-0.5)*480,d=8+R()*300;const h=neroHillH(lx,d);if(h<3)continue;const s=0.7+R()*0.7;p.set(cx+lx,h-0.5,MINZ-0.6-d);sc.set(s,s*(0.8+R()*0.5),s);m4.compose(p,q,sc);im.setMatrixAt(k++,m4);}
  im.count=k;im.castShadow=false;scene.add(im);if(im.computeBoundingSphere)im.computeBoundingSphere();staticInst(im);
  // Tempelchen auf der Kuppe (eigener Entwurf: acht Säulen, Kupferkuppel)
  const tx=cx-40,td=220,ty=neroHillH(-40,td);const tg=new GB();
  for(let a=0;a<8;a++){const an=a/8*TAU;tg.box(tx+Math.sin(an)*4,ty+0.8,MINZ-0.6-td+Math.cos(an)*4,0.6,6,0.6,an,WHITE,1);}
  tg.box(tx,ty,MINZ-0.6-td,10,0.8,10,0,WHITE,2);tg.box(tx,ty+6.8,MINZ-0.6-td,9.4,0.7,9.4,0,WHITE,2);
  neroMesh(tg.geo(),Mt.light,false);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(4.6,14,6,0,TAU,0,Math.PI/2),Mt.copper);dome.position.set(tx,ty+7.5,MINZ-0.6-td);dome.scale.set(1,0.6,1);scene.add(dome);}

// ---------- Kochbrunnen: Brunnentempel (eigener Entwurf), Sinterbecken, Dampf ----------
function neroBuildBrunnen(){const Mt=neroMats();const B=NERO.brunnen;const st=new GB(),cl=new GB();
  st.box(B.x,0,B.z,8.4,0.3,8.4,Math.PI/8,WHITE,2);
  for(let a=0;a<8;a++){const an=a/8*TAU+Math.PI/8;cl.box(B.x+Math.sin(an)*3.4,0.3,B.z+Math.cos(an)*3.4,0.42,3.6,0.42,an,WHITE,1);}
  for(let a=0;a<8;a++){const a0=a/8*TAU,a1=(a+1)/8*TAU;st.beam([B.x+Math.sin(a0)*3.55,4.1,B.z+Math.cos(a0)*3.55],[B.x+Math.sin(a1)*3.55,4.1,B.z+Math.cos(a1)*3.55],0.6,0.5);}
  neroMesh(st.geo(),Mt.light);neroMesh(cl.geo(),Mt.light);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(3.9,16,7,0,TAU,0,Math.PI/2),Mt.copper);dome.position.set(B.x,4.35,B.z);dome.scale.set(1,0.62,1);scene.add(dome);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.35,1.2,8),Mt.copper);tip.position.set(B.x,7.3,B.z);scene.add(tip);
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.2,0.8,16),Mt.sinter);basin.position.set(B.x,0.7,B.z);scene.add(basin);
  const pool=new THREE.Mesh(new THREE.CylinderGeometry(0.88,0.88,0.05,16),Mt.hot);pool.position.set(B.x,1.08,B.z);scene.add(pool);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.28,1.5,8),Mt.sinter);col.position.set(B.x,1.5,B.z);scene.add(col);
  const tap=new GB();for(let a=0;a<4;a++){const an=a/4*TAU;tap.beam([B.x+Math.sin(an)*0.2,1.75,B.z+Math.cos(an)*0.2],[B.x+Math.sin(an)*0.6,1.6,B.z+Math.cos(an)*0.6],0.08,0.08,neroCol(0xc9a54a));}
  neroMesh(tap.geo(),Mt.vc,false);
  elevOBB(B.x,B.z,8.4,8.4,Math.PI/8,0,0.3);elevCirc(B.x,B.z,1.25,0,1.1);}

// ---------- Aufbau ----------
function setupNero(){
  // Himmelsbox (p0_render) reicht nur bis |z|=10000, der Nordrand liegt bei -10752: dort wäre der Himmel nach Norden schwarz
  const skyHalf=Math.max(-MINX,MAXX,-MINZ,MAXZ)+1500;if(sky.scale.x<2*skyHalf)sky.scale.setScalar(2*skyHalf);
  neroMats();neroBuildTrack();neroBuildStations();neroBuildHill();neroBuildBrunnen();
  // begehbares Viadukt: Gleisbett + Treppenweg, Bahnhöfe massiv, Terrasse oben
  const rS=[-10,NERO_L+3.5],rL=[-3.8,12.5];const c=[neroW(rS[0],rL[0]),neroW(rS[0],rL[1]),neroW(rS[1],rL[0]),neroW(rS[1],rL[1])];
  const x0=Math.floor(Math.min(...c.map(p=>p[0]))),x1=Math.ceil(Math.max(...c.map(p=>p[0]))),z0=Math.floor(Math.min(...c.map(p=>p[1]))),z1=Math.ceil(Math.max(...c.map(p=>p[1])));
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const px=x+0.5,pz=z+0.5;const [s,l]=neroLocal(px,pz);const i=idx(px,pz);if(i<0)continue;
    const terr=(s>=NERO_L&&s<=NERO_L+3&&l>=-3.6&&l<=12)||(s>=NERO_L-7&&s<=NERO_L+3&&l>=6&&l<=12);
    if(terr){elevSetI(i,0,NERO_TOP);continue;}
    if(s<-9.5||s>NERO_L+3||l<neroLo(s)||l>neroHi(s))continue;const t=neroDeckY(s);elevSetI(i,neroInStation(s)?0:t-0.7,t);}
  NERO.cars=[neroMakeCar(0,0x2f5d3a,1),neroMakeCar(1,0x7a2430,-1)];NERO.cars[0].ballast=0.7;NERO.cars[1].ballast=0.35;
  const mk=(key,s,name)=>{const b=neroW(s,3.5),c=neroW(s,1.2);return {key,name,s,x:c[0],z:c[1],y:neroDeckY(s),board:[b[0],b[1]]};};
  NERO.stations.tal=mk('tal',NERO_SB,'Talstation Nerotal');NERO.stations.berg=mk('berg',NERO_ST,'Bergstation Neroberg');
  // Schaffner (fiktiv) an der Talstation
  const h=new Human('ped');const p=neroW(-4.5,4.6);h.x=p[0];h.z=p[1];h.y=NERO_Y0;h.mission=true;h.state='idle';h.walkSpeed=0;h.facing=Math.atan2(-NERO_N[0],-NERO_N[1]);h.sync();NERO.schaffner=h;
  NERO.w=neroW;NERO.deckY=neroDeckY;NERO.L=NERO_L;NERO.RIDE=NERO_RIDE;NERO.DWELL=NERO_DWELL;NERO.FARE=NERO_FARE;
  NERO.ready=true;neroPlaceCars();}

// ---------- Betrieb ----------
function neroDockedAt(c){if(NERO.phase!=='halt')return null;if(Math.abs(c.s-NERO_SB)<0.05)return NERO.stations.tal;if(Math.abs(c.s-NERO_ST)<0.05)return NERO.stations.berg;return null;}
function neroPlaceCars(){const [a,b]=NERO.cars;a.s=NERO_SB+(NERO_ST-NERO_SB)*NERO.prog;b.s=NERO_SB+NERO_ST-a.s;
  for(const c of NERO.cars){const o=neroOff(c.s,c.side),d=(neroOff(c.s+0.5,c.side)-neroOff(c.s-0.5,c.side));const p=neroW(c.s,o);
    c.off=o;c.x=p[0];c.z=p[1];c.y=neroDeckY(c.s)+0.2;c.g.position.set(c.x,c.y,c.z);c.g.rotation.y=NERO_TH-Math.atan(d);
    c.docked=(neroDockedAt(c)||{}).key||null;c.water.scale.y=Math.max(0.03,c.ballast);}}
function neroNextDeparture(){return Math.max(0,Math.ceil(NERO.phase==='halt'?NERO_DWELL-NERO.t:NERO_RIDE-NERO.t+NERO_DWELL));}
function neroStationNear(P){const h=P.h;if(!h||P.car||h.room)return null;for(const st of [NERO.stations.tal,NERO.stations.berg]){if(!st)continue;
  if(Math.hypot(h.x-st.board[0],h.z-st.board[1])<7&&Math.abs(h.y-st.y)<3)return st;}return null;}
function neroBoard(P,st){const c=NERO.cars.find(c=>neroDockedAt(c)===st);
  if(!c){hint(`Nerobergbahn: die Bahn is grad unnerwegs – nächste Abfahrt in ${neroNextDeparture()} s`,2,P);return false;}
  if(G.money<NERO_FARE){hint(`Kaa Geld für die Nerobergbahn (${NERO_FARE} €)`,2,P);return false;}
  G.money-=NERO_FARE;P.neroRide={car:c,from:st.key};if(P===P1)NERO.riding={car:c};const h=P.h;h.aiming=false;h.vx=h.vz=0;
  const city=[NERO.brunnen.x-st.x,NERO.brunnen.z-st.z];P.cam.yaw=Math.atan2(city[0],city[1]);P.cam.pitch=0.12;P.cam.lastLook=simTime;
  hint(`<b>Nerobergbahn</b> · ${NERO_FARE} € · Wasserballast: de obere Wage tankt Wasser, werd schwerer un zieht de unnere nuff!`,5,P);chime([523,659]);
  if(st.key==='tal'&&NERO.schaffner&&NERO.schaffner.alive)say(NERO.schaffner,mpick(NERO.SCHAFFNER_LINES),3);return true;}
function neroLeave(P,st){const c=P.neroRide&&P.neroRide.car;P.neroRide=null;if(P===P1)NERO.riding=null;if(!st||!P.h)return;const h=P.h;
  const off=Math.max(3.4,(c?c.off:0)+2.4);const p=neroW(st.s,off);h.x=p[0];h.z=p[1];h.y=groundY(h.x,h.z,neroDeckY(st.s)+0.5);P.vy=0;P.ground=true;P.airT=0;
  h.facing=Math.atan2(NERO_N[0],NERO_N[1]);h.stand();h.sync();
  hint(st.key==='berg'?'<b>Bergstation Neroberg</b> – Aussicht über Wiesbade genieße!':'<b>Talstation Nerotal</b> – alles aussteige!',3,P);}
function neroRideStep(P,dt){const c=P.neroRide.car,h=P.h;if(Math.hypot(h.x-c.x,h.z-c.z)>12){neroLeave(P,null);return;}const p=neroW(c.s,c.off+0.45);h.x=p[0];h.z=p[1];h.y=c.y+1.15;
  h.facing=Math.atan2(NERO_N[0],NERO_N[1]);h.vx=h.vz=0;P.vy=0;P.ground=true;P.airT=0;h.animate(dt,0);h.sync();}

const _neroUpdatePlayer=updatePlayer;
updatePlayer=function(P,dt){if(!P.neroRide||!P.h)return _neroUpdatePlayer(P,dt);const I=readInput(P);P.inp=I;
  if(I.lookX||I.lookY){const fk=P.camera.fov/60;P.cam.yaw-=I.lookX*0.0026*fk;P.cam.pitch=clamp(P.cam.pitch+I.lookY*0.002*fk,-0.35,1.25);P.cam.lastLook=simTime;}
  if(P.gameOver){neroLeave(P,null);return;}
  if(I.enterP)tryEnterExit(P);};
const _neroTryEnterExit=tryEnterExit;
tryEnterExit=function(P){if(P.neroRide){const st=neroDockedAt(P.neroRide.car);if(st)neroLeave(P,st);else hint('Während de Fahrt bleibste drin – sonst gibt’s Ärger mim Schaffner!',1.5,P);return;}
  if(!P.gameOver&&!P.morph){const st=neroStationNear(P);if(st){neroBoard(P,st);return;}}
  _neroTryEnterExit(P);};
const _neroUpdateCamera=updateCamera;
updateCamera=function(P,dt){if(!P.neroRide)return _neroUpdateCamera(P,dt);const c=P.neroRide.car,cam=P.cam,camera=P.camera;
  const tx=c.x,ty=c.y+2.6,tz=c.z,dist=12*(cam.zoom||1),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
  _cp.set(tx-Math.sin(cam.yaw)*cp*dist,Math.max(ty+sp*dist,1),tz-Math.cos(cam.yaw)*cp*dist);
  if(cam.init)camera.position.lerp(_cp,1-Math.exp(-dt*6));else{camera.position.copy(_cp);cam.init=true;}
  _ct.set(tx,ty,tz);camera.lookAt(_ct);camera.fov+=(58-camera.fov)*Math.min(1,dt*3);camera.updateProjectionMatrix();};

// ---------- Kochbrunnen trinken ----------
function neroBrunnenNear(P){const h=P&&P.h;if(!h||P.car||h.room||P.neroRide||P.gameOver)return false;return Math.hypot(h.x-NERO.brunnen.x,h.z-NERO.brunnen.z)<2.8&&h.y<2;}
function neroDrink(P){if(NERO.cool>0){hint(`Langsam! Zu viel Schwefelwasser is ungesund – noch ${Math.ceil(NERO.cool)} s`,2,P);return false;}
  P.h.health=100;NERO.cool=NERO_COOL;NERO.stinkT=NERO_STINK;NERO.stinkId++;NERO.stinkP=P;chime([392,523,659]);
  say(P.h,'Bäh … schmeckt wie e faul Ei. Awwer gesund!',3);hint('<b>Kochbrunnen</b>: Gesundheit voll – awwer du stinkst jetzt nach Schwefel!',3,P);return true;}
const _neroTalkCandidate=talkCandidate;
talkCandidate=function(P){if(neroBrunnenNear(P))return null;return _neroTalkCandidate(P);};
addEventListener('keydown',e=>{if(e.code!=='KeyE'||mode!=='play'||TALK||SHOP_UI.open)return;if(neroBrunnenNear(P1))neroDrink(P1);});

function neroStink(dt){const P=NERO.stinkP;NERO.stinkT=Math.max(0,NERO.stinkT-dt);if(NERO.stinkT<=0||!P||!P.h)return;const [px,pz]=ppos(P);const py=P.car?P.car.y:P.h.y;
  NERO.partT-=dt;if(NERO.partT<=0){NERO.partT=0.06;spawnPart(px+mr(-0.8,0.8),py+0.4+mr(0,1.5),pz+mr(-0.8,0.8),{color:mpick([0xa8c43a,0xc9c23a,0x8fb03a]),alpha:0.6,size:0.65,grow:0.9,vy:0.35,life:1.6});}
  for(const h of HUMANS){if(h===P.h||!h.alive||h.inCar||h.kind!=='ped'||h.mission||h.keeper||playerOfHuman(h))continue;if(h.neroEkelId===NERO.stinkId)continue;
    if(h.state!=='walk'&&h.state!=='wait'&&h.state!=='idle')continue;if(Math.hypot(h.x-px,h.z-pz)>8||Math.abs(h.y-py)>3)continue;
    h.neroEkelId=NERO.stinkId;NERO.reacts++;h.setExpr('disgust');say(h,mpick(NERO.STINK_LINES),3);pedFlee(h,px,pz,2.5);}}

function updateNero(dt){if(!NERO.ready)return;NERO.t+=dt;NERO.cool=Math.max(0,NERO.cool-dt);
  if(NERO.phase==='halt'){for(const c of NERO.cars){const st=neroDockedAt(c);if(!st)continue;
      if(st.key==='berg')c.ballast=Math.min(1,c.ballast+dt/(NERO_DWELL*0.8));else c.ballast=Math.max(0,c.ballast-dt/(NERO_DWELL*0.6));}
    if(NERO.t>=NERO_DWELL){NERO.phase='fahrt';NERO.t=0;NERO.p0=NERO.prog;NERO.p1=NERO.prog<0.5?1:0;
      for(const P of PLAYERS)if(P.neroRide){hint('Abfahrt! Festhalte!',1.5,P);chime([440]);}}}
  else{const f=Math.min(1,NERO.t/NERO_RIDE);NERO.prog=NERO.p0+(NERO.p1-NERO.p0)*(1-Math.cos(Math.PI*f))/2;
    if(f>=1){NERO.prog=NERO.p1;NERO.phase='halt';NERO.t=0;NERO.trips++;}}
  neroPlaceCars();
  for(const P of PLAYERS){if(!P.neroRide)continue;const st=NERO.phase==='halt'&&NERO.t===0?neroDockedAt(P.neroRide.car):null;
    if(st&&st.key!==P.neroRide.from)neroLeave(P,st);else neroRideStep(P,dt);}
  // Fußgänger auf dem Gleis vor dem Wagen wegschieben
  for(const P of PLAYERS){const h=P.h;if(!h||P.neroRide||P.car)continue;const [s,l]=neroLocal(h.x,h.z);if(s<-1||s>NERO_L+1||l<-2.7||l>2.6||h.y<neroDeckY(s)-1)continue;
    for(const c of NERO.cars)if(Math.abs(s-c.s)<4.6&&Math.abs(l-c.off)<1.5){const p=neroW(s,3.5);h.x=p[0];h.z=p[1];h.y=groundY(h.x,h.z,neroDeckY(s)+0.5);hint('Obacht, die Bahn!',1.2,P);break;}}
  // Wasserspiel: oben läuft Wasser in den Tank, unten wird abgelassen; Dampf am Kochbrunnen
  const cam=P1.camera&&P1.camera.position;const near=(x,z,r)=>!cam||Math.hypot(cam.x-x,cam.z-z)<r;
  NERO.wT=(NERO.wT||0)-dt;if(NERO.wT<=0){NERO.wT=0.08;
    for(const c of NERO.cars){const st=neroDockedAt(c);if(!st||!near(c.x,c.z,220))continue;
      if(st.key==='berg'&&c.ballast<1&&NERO.pipe)spawnPart(NERO.pipe[0]+mr(-0.1,0.1),NERO.pipe[1],NERO.pipe[2]+mr(-0.1,0.1),{color:0x9fd4f5,alpha:0.7,size:0.25,grow:0.2,vy:-3,vx:0,vz:0,life:0.35});
      if(st.key==='tal'&&c.ballast>0){const p=neroW(c.s-3.3,c.off-1.0);spawnPart(p[0],c.y+0.4,p[1],{color:0xbfe6ff,alpha:0.7,size:0.3,grow:0.5,vy:-1.2,vx:-NERO_N[0]*1.5+mr(-0.3,0.3),vz:-NERO_N[1]*1.5+mr(-0.3,0.3),life:0.6});}}
    const B=NERO.brunnen;if(near(B.x,B.z,160))for(let k=0;k<2;k++)spawnPart(B.x+mr(-0.6,0.6),1.15,B.z+mr(-0.6,0.6),{color:0xffffff,alpha:0.55,size:0.6,grow:1.0,vy:0.9,life:2.4});}
  neroStink(dt);
  // Hinweise
  NERO.hintT-=dt;if(NERO.hintT<=0){NERO.hintT=0.8;for(const P of PLAYERS){if(P.neroRide||TALK)continue;
    const st=neroStationNear(P);if(st){const c=NERO.cars.find(c=>neroDockedAt(c)===st);hint(c?`<b>F</b>: Nerobergbahn fahre (${NERO_FARE} €)`:`Nerobergbahn: nächste Abfahrt in ${neroNextDeparture()} s`,0.9,P);}
    else if(neroBrunnenNear(P))hint(NERO.cool>0?`Kochbrunnen · wieder trinkbar in ${Math.ceil(NERO.cool)} s`:'<b>E</b>: Vom Kochbrunne trinke (heilt – awwer stinkt!)',0.9,P);}}}
