// ===================== 39 Detail: Mombach (Mainz) =====================
// Industrie am Industriehafen, Güterbahnhof mit abgestellten Wagen, Kleingärten mit Vereinsheim (begehbar),
// Mainzer Sand als offene Dünenfläche, Rheinufer mit Bänken und Anglern, Waggonbau-Denkmal, Schnellreise-Ziele.
// Alle Firmen/Vereine sind fiktiv, keine Logos. Die Auffahrt zur Schiersteiner Brücke bleibt frei.
// Lazy (Vertrag Welle 8): Mombach ist ~2 km breit, deshalb sechs Teilzonen (lazyZone, je ≤ 300 m um ihr Zentrum).
// Beim Boot werden nur Konstanten, Zonen, Karten-Labels, der Venue-Eintrag und Schnellreise-Ziele angelegt.
const MOMB={zones:{},zone:null,industrie:[],wagons:[],denkmal:null,
  kleingaerten:{area:null,plots:[],gnomes:0,clubhouse:null,venue:null,sitzung:{step:0,top:7}},
  sand:{area:null,pines:0,tufts:0},rhein:{path:[],benches:[],anglers:[]},scenes:[],ft:[],props:[],roomBuilds:0,roomDisposes:0};
// Mainzer Sand: offene Dünenfläche östlich der A643 (aus der OSM-Karte abgelesen, keine Gebäude darin)
const MOMB_SAND_POLY=[[-4660,-2000],[-4560,-2040],[-4455,-1990],[-4440,-1700],[-4452,-1455],[-4720,-1432],[-4880,-1530],[-4872,-1640],[-4720,-1720],[-4682,-1850]];
const MOMB_SAND_BB=bboxOf(MOMB_SAND_POLY);
const MOMB_KGV_PT=[-3615,-2060];          // grüne Freifläche mitten in Mombach (OSM: grass, unbebaut)
const MOMB_IND_BOX=[-3950,-3620,-2600,-2700]; // Industrie zwischen Bahn und Rhein
const MOMB_YARD_BOX=[-3780,-2845,-2730,-2515]; // Güterbahnhof
const MOMB_YARD_SPLIT=-3180;                   // Güterbahnhof West/Ost (zwei Zonen)
const MOMB_RHEIN_X=[-4390,-3960];
const MOMB_NAME='KGV Rheinwiese Mombach e.V.';
// Teilzonen: Name, Zentrum (Bauroutine in MOMB_BUILD). Alles einer Zone liegt ≤ 300 m vom Zentrum (gebaut, bevor man davorsteht).
const MOMB_ZONES=[['hafen',-3600,-3400],['rhein',-4175,-3640],['bahnw',-3420,-2690],['bahno',-2960,-2650],['kgv',-3620,-2060],['sand',-4613,-1692]];
const MOMB_ZONE_R=300;

// ---------- Hilfen ----------
const mombLin=v=>Math.pow(v,2.2);
function mombC(hex){return {r:mombLin(((hex>>16)&255)/255),g:mombLin(((hex>>8)&255)/255),b:mombLin((hex&255)/255)};}
function mombRoad(i){return (mfG(i)&6)!==0;}
function mombCellFree(x,z){const i=idx(x,z);return i>=0&&hgG(i)===0&&!mombRoad(i);}
function mombNearBridge(x,z,m=40){for(const br of BRIDGES){const dx=x-br.A[0],dz=z-br.A[1];const t=dx*br.U[0]+dz*br.U[1],l=dx*br.N[0]+dz*br.N[1];if(t>-350&&t<br.L+350&&Math.abs(l)<br.hw+m)return true;}return false;}
function mombInSand(x,z){return x>=MOMB_SAND_BB[0]&&x<=MOMB_SAND_BB[2]&&z>=MOMB_SAND_BB[1]&&z<=MOMB_SAND_BB[3]&&pip(x,z,MOMB_SAND_POLY);}
// Kreisfläche frei: kein Gebäude/Hindernis, keine Straße, kein Wasser, nicht an der Brücke, nicht im Mainzer Sand
function mombFree(x,z,r){if(mombNearBridge(x,z)||mombInSand(x,z))return false;for(let a=-r;a<=r;a+=1.5)for(let b=-r;b<=r;b+=1.5){if(a*a+b*b>r*r+0.01)continue;if(!mombCellFree(x+a,z+b))return false;}return mombCellFree(x,z);}
function mombFindSpot(x,z,r,maxR=60,avoid=null,sep=0,ok=mombFree){for(let rad=0;rad<=maxR;rad+=3){const n=Math.max(1,Math.round(rad*TAU/4));for(let k=0;k<n;k++){const a=k/n*TAU;const px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;
  if(avoid&&avoid.some(p=>Math.hypot(p[0]-px,p[1]-pz)<sep))continue;if(ok(px,pz,r))return [px,pz];}}return null;}
function mombRailZ(x){const a=[-4347,-3003],b=[-2741,-2533];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}
function mombDrop(arr,zone){for(let i=arr.length-1;i>=0;i--)if(arr[i].zone===zone)arr.splice(i,1);}
function mombNear(Z,x,z){return Math.hypot(x-Z.x,z-Z.z)<=MOMB_ZONE_R;}

// ---------- Lazy-Bau: aktuelle Zone, Kollision mit exaktem Rückbau ----------
let mombCurZ=null;
function mombProp(kind,x,z){MOMB.props.push({kind,x,z,zone:mombCurZ.name});}
function mombShadow(cast){return cast&&!QS.noShadow;}
// HG-Schreibzugriff mit gemerktem Altwert (Rückbau in mombZoneDispose, rückwärts)
function mombHG(ix,iz,val){const i=idx(ix+0.5,iz+0.5);if(i<0)return;const o=hgG(i);if(o!==255&&o<val){mombCurZ.mombHG.push(i,o);hgS(i,val);}}
function mombOBB(x,z,w,d,rot,val){const c=Math.cos(rot),s=Math.sin(rot);const r=Math.hypot(w,d)/2+1;
  for(let iz=Math.floor(z-r);iz<=Math.ceil(z+r);iz++)for(let ix=Math.floor(x-r);ix<=Math.ceil(x+r);ix++){const dx=ix+0.5-x,dz=iz+0.5-z;const lx=dx*c-dz*s,lz=dx*s+dz*c;
    if(Math.abs(lx)<=w/2&&Math.abs(lz)<=d/2)mombHG(ix,iz,val);}}
function mombCirc(x,z,r,val){for(let iz=Math.floor(z-r);iz<=Math.ceil(z+r);iz++)for(let ix=Math.floor(x-r);ix<=Math.ceil(x+r);ix++){const dx=ix+0.5-x,dz=iz+0.5-z;if(dx*dx+dz*dz<=r*r)mombHG(ix,iz,val);}}
function mombMat(o){return lazyOwn(mombCurZ,stdMat(o));}
function mombGeo(g){return lazyOwn(mombCurZ,g);}
function mombMesh(gb,mat,cast=true){if(gb.empty)return null;const m=new THREE.Mesh(mombGeo(gb.geo()),mat);mombCurZ.mombMeshes++;m.castShadow=mombShadow(cast);m.receiveShadow=true;mombCurZ.group.add(m);return m;}
function mombInst(geo,mat,list,cast=true){mombGeo(geo);const im=instGeo(geo,mat,list,mombShadow(cast));if(im){mombCurZ.mombMeshes++;scene.remove(im);mombCurZ.group.add(im);}return im;}
function mombPlaque(text,o,w,h,x,y,z,ry){const tex=lazyOwn(mombCurZ,freeAfterUpload(textTex(text,o)));
  const m=new THREE.Mesh(mombGeo(new THREE.PlaneGeometry(w,h)),lazyOwn(mombCurZ,new THREE.MeshBasicMaterial({map:tex})));m.position.set(x,y,z);m.rotation.y=ry;mombCurZ.group.add(m);mombCurZ.mombMeshes++;return m;}
// Zylinder (Achse y oder z) aus Vierecken, nach außen orientiert
function mombCyl(gb,cx,cy,cz,r0,r1,h,seg,col,axis='y',cap=true){const P=(a,r,t)=>{const u=Math.cos(a)*r,v=Math.sin(a)*r;return axis==='y'?[cx+u,cy+t,cz+v]:[cx+u,cy+v,cz+t];};const A=t=>axis==='y'?[cx,cy+t,cz]:[cx,cy,cz+t];
  for(let k=0;k<seg;k++){const a0=k/seg*TAU,a1=(k+1)/seg*TAU;const ref=A(h/2);gb.quadOut(P(a0,r0,0),P(a1,r0,0),P(a1,r1,h),P(a0,r1,h),[0,0],[1,0],[1,1],[0,1],col,ref);
    if(cap){gb.triOut(A(h),P(a0,r1,h),P(a1,r1,h),[0,0],[1,0],[0,1],col,A(h/2-0.01));if(axis==='z')gb.triOut(A(0),P(a0,r0,0),P(a1,r0,0),[0,0],[1,0],[0,1],col,A(h/2));}}}
function mombPyramid(gb,x,y,z,s,h,cols){const c=[[x-s,y,z-s],[x+s,y,z-s],[x+s,y,z+s],[x-s,y,z+s]],t=[x,y+h,z];for(let k=0;k<4;k++)gb.triOut(c[k],c[(k+1)%4],t,[0,0],[1,0],[0,1],cols[k%cols.length],[x,y+h*0.3,z]);}

// ---------- Mainzer Sand: Sandboden in die Bodenkacheln malen ----------
let MOMB_SANDPAT=null;
function mombSandPattern(){if(MOMB_SANDPAT)return MOMB_SANDPAT;const R=mulberry32(3939);MOMB_SANDPAT=patCanvas(32,(g,n)=>{const id=g.createImageData(n,n);for(let i=0;i<n*n;i++){const v=(R()-0.5)*30,sp=R()<0.04?-40:0;id.data[i*4]=200+v+sp;id.data[i*4+1]=176+v+sp;id.data[i*4+2]=126+v*0.8+sp;id.data[i*4+3]=255;}g.putImageData(id,0,0);});return MOMB_SANDPAT;}
function mombPaintSand(g,view){const bb=MOMB_SAND_BB;if(view&&(bb[2]<view[0]||bb[0]>view[2]||bb[3]<view[1]||bb[1]>view[3]))return;
  g.save();pathPoly(g,MOMB_SAND_POLY);g.clip();g.fillStyle=g.createPattern(mombSandPattern(),'repeat');g.fillRect(bb[0],bb[1],bb[2]-bb[0],bb[3]-bb[1]);
  {const R=mulberry32(4040);for(let k=0;k<420;k++){const x=lerp(bb[0],bb[2],R()),z=lerp(bb[1],bb[3],R()),r=3+R()*14;g.fillStyle=k%3?'rgba(118,122,72,0.28)':'rgba(236,214,160,0.35)';g.beginPath();g.ellipse(x,z,r,r*(0.5+R()*0.5),R()*3,0,TAU);g.fill();}}
  // Trampelpfade und Straßen wieder sichtbar machen
  for(const r of ROADS){if(r.bridge)continue;const rb=r.bb||(r.bb=bboxOf(r.pts,r.w/2+r.sw+2));if(rb[2]<bb[0]||rb[0]>bb[2]||rb[3]<bb[1]||rb[1]>bb[3])continue;
    g.strokeStyle=r.type==='path'||r.type==='ped'?'#e3d4a8':'#3a3b3f';strokePts(g,r.pts,r.w);}
  g.restore();}
const _mombPaintWorld=paintWorld;
paintWorld=function(g,px,mapMode=false,view=null){_mombPaintWorld(g,px,mapMode,view);mombPaintSand(g,view);};

// ---------- Schnellreise: eigene Gruppe „Mombach“ (feste Punkte, ftSpot sucht beim Reisen eine freie Stelle) ----------
MOMB.ft.push({n:'Kleingärten Mombach – Vereinsheim',g:'Mombach',x:-3620.2,z:-2023.1},{n:'Mainzer Sand (Naturschutzgebiet)',g:'Mombach',x:-4613.3,z:-1692.0},
  {n:'Rheinufer Mombach',g:'Mombach',x:-4174,z:-3643},{n:'Waggonbau-Denkmal Mombach',g:'Mombach',x:-3533.9,z:-2649.5});
const _mombFtDest=ftDestinations;
ftDestinations=function(){const L=_mombFtDest();if(!L.mombDone){L.mombDone=true;for(const d of MOMB.ft)L.push(d);}return L;};

// ---------- Industrie ----------
function mombChimney(gb,x,z,h){const red=mombC(0xb3261e),wh=mombC(0xece8e0),brick=mombC(0x8a4a38);gb.box(x,0,z,4.2,2,4.2,0,mombC(0x6d6a66),2);
  const n=6;for(let k=0;k<n;k++){const t0=2+(h-2)*k/n,t1=2+(h-2)*(k+1)/n;const r0=1.7-0.6*k/n,r1=1.7-0.6*(k+1)/n;mombCyl(gb,x,t0,z,r0,r1,t1-t0,12,k>=n-2?(k%2?wh:red):brick,'y',k===n-1);}
  mombCirc(x,z,1.9,Math.min(250,Math.ceil(h)));}
function mombCrane(gb,x,z,face,col){const c=Math.cos(face),s=Math.sin(face);const W=(u,v)=>[x+u*s+v*c,z+u*c-v*s];// u: Richtung Wasser, v: quer
  const grey=mombC(0x55595e),dark=mombC(0x2b2e31),H=15;
  for(const u of [-3,3])for(const v of [-4,4]){const [px,pz]=W(u,v);gb.box(px,0,pz,0.7,H,0.7,face,col,2);mombOBB(px,pz,1.0,1.0,face,H);}
  {const [px,pz]=W(0,0);gb.box(px,H,pz,7.4,1.0,9.4,face,col,2);gb.box(px,H+1,pz,3.2,3.0,3.2,face,mombC(0xd8d4c8),2);gb.box(px,H+4,pz,2.4,0.3,2.4,face,grey,2);}
  const top=W(0,0),tip=W(24,0),back=W(-8,0);gb.beam([top[0],H+3.2,top[1]],[tip[0],H+8,tip[1]],0.9,1.1,col);gb.beam([top[0],H+3.2,top[1]],[back[0],H+4.2,back[1]],0.9,1.0,col);
  gb.box(back[0],H+2.6,back[1],2.4,2.2,2.4,face,grey,2);gb.beam([tip[0],H+7.4,tip[1]],[tip[0],H-4,tip[1]],0.06,0.06,dark);gb.box(tip[0],H-5,tip[1],1.0,1.0,1.0,face,mombC(0xe0b020),1);}
function mombTank(gb,x,z,r,h){const wh=mombC(0xdcdcd6),gr=mombC(0x9aa0a4);mombCyl(gb,x,0,z,r,r,h,16,wh,'y',false);
  for(let k=0;k<16;k++){const a0=k/16*TAU,a1=(k+1)/16*TAU;gb.triOut([x,h+1.6,z],[x+Math.cos(a0)*r,h,z+Math.sin(a0)*r],[x+Math.cos(a1)*r,h,z+Math.sin(a1)*r],[0,0],[1,0],[0,1],gr,[x,h-1,z]);}
  mombCirc(x,z,r+0.2,Math.ceil(h));}
function mombContainers(gb,x,z,rot,R){const pal=[0x2f6f9f,0xb7412e,0x3e7d4a,0xd08a1e,0x6e6e74,0x1d3557];const rows=QS.lowLOD?2:3;
  for(let row=0;row<rows;row++)for(let col=0;col<4;col++){const n=1+Math.floor(R()*3);const lx=(col-1.5)*6.6,lz=(row-1)*2.9;const px=x+Math.cos(rot)*lx+Math.sin(rot)*lz,pz=z-Math.sin(rot)*lx+Math.cos(rot)*lz;
    for(let k=0;k<n;k++){gb.box(px,k*2.6,pz,6.1,2.55,2.44,rot,mombC(pal[Math.floor(R()*pal.length)]),2);gb.box(px,k*2.6+2.55,pz,6.12,0.04,2.46,rot,mombC(0x333333),2);}
    mombOBB(px,pz,6.1,2.44,rot,Math.ceil(n*2.6));}}
function mombWaterDir(x,z){let best=null;for(let k=0;k<8;k++){const a=k/8*TAU,dx=Math.sin(a),dz=Math.cos(a);for(let d=6;d<=14;d+=2){const i=idx(x+dx*d,z+dz*d);if(i>=0&&(mfG(i)&4)){if(!best||d<best[1])best=[a,d];break;}}}return best&&best[0];}
// Schornsteine neben großen Hallen nördlich der Bahn, nur im Umkreis der Zone
function mombChimneys(gb,Z,max){const [x0,z0,x1,z1]=MOMB_IND_BOX;const zone=Z.name;
  const big=BUILDINGS.filter(b=>b.x>x0&&b.x<x1&&b.z>z0&&b.z<z1&&b.z<mombRailZ(b.x)-25&&mombNear(Z,b.x,b.z)&&Math.abs(polyArea(b.poly))>2500).sort((a,b)=>Math.abs(polyArea(b.poly))-Math.abs(polyArea(a.poly)));
  const chim=[];for(const b of big){if(chim.length>=max)break;if(chim.some(c=>Math.hypot(c[0]-b.x,c[1]-b.z)<150))continue;const s=mombFindSpot(b.x,b.z,2.5,70);if(!s||!mombNear(Z,s[0],s[1])||chim.some(c=>Math.hypot(c[0]-s[0],c[1]-s[1])<150))continue;chim.push(s);}
  chim.forEach(([x,z],k)=>{const h=34+k*4;mombChimney(gb,x,z,h);MOMB.industrie.push({kind:'schornstein',x,z,h,zone});mombProp('schornstein',x,z);});}
function mombBuildHafen(Z,R){const gb=new GB();const [,z0,x1,z1]=MOMB_IND_BOX;const north=(x,z)=>z<mombRailZ(x)-25;const zone=Z.name;
  // Hafenkräne an der Kaikante
  const cranes=[],nMax=QS.lowLOD?2:4;for(let x=-3720;x<=x1-100&&cranes.length<nMax;x+=6)for(let z=z0;z<=z1&&cranes.length<nMax;z+=6){if(!north(x,z)||!mombNear(Z,x,z))continue;if(cranes.some(c=>Math.hypot(c[0]-x,c[1]-z)<90))continue;
    const f=mombWaterDir(x,z);if(f===undefined||f===null)continue;if(!mombFree(x,z,6))continue;cranes.push([x,z,f]);}
  cranes.forEach(([x,z,f],k)=>{mombCrane(gb,x,z,f,mombC(k%2?0x2f5f8f:0xd9a21b));MOMB.industrie.push({kind:'kran',x,z,face:f,zone});mombProp('kran',x,z);});
  mombChimneys(gb,Z,2);
  // Tanklager und Containerstapel auf der Brachfläche am Hafen
  const tk=mombFindSpot(-3500,-3290,15,90);if(tk){for(let k=0;k<3;k++){const a=k/3*TAU;mombTank(gb,tk[0]+Math.cos(a)*8.5,tk[1]+Math.sin(a)*8.5,5,10);}MOMB.industrie.push({kind:'tanks',x:tk[0],z:tk[1],solid:[tk[0]+8.5,tk[1]],zone});mombProp('tanks',tk[0],tk[1]);}
  const ct=mombFindSpot(-3620,-3380,15,90,tk?[tk]:null,40);if(ct){mombContainers(gb,ct[0],ct[1],0.32,R);MOMB.industrie.push({kind:'container',x:ct[0],z:ct[1],solid:[ct[0]+Math.cos(0.32)*3.3,ct[1]-Math.sin(0.32)*3.3],zone});mombProp('container',ct[0],ct[1]);}
  mombMesh(gb,mombMat({vertexColors:true,roughness:0.7,metalness:0.15}));
  // Hafenarbeiter am ersten Kran
  if(cranes.length){const [x,z,f]=cranes[0];const spots=[];for(const [u,v] of (QS.lowLOD?[[-6,-1]]:[[-6,-1],[-6,1.2]])){const px=x+u*Math.sin(f)+v*Math.cos(f),pz=z+u*Math.cos(f)-v*Math.sin(f);if(mombCellFree(px,pz))spots.push({x:px,z:pz,face:f+(v<0?0.9:-2.2),pose:'stand',prop:'helm'});}
    if(spots.length)mombScene(Z,'hafen','hafen',x,z,spots,MOMB_CONV_HAFEN,MOMB_LINES.hafen);}}

// ---------- Güterbahnhof: abgestellte Güterwagen (instanziert) ----------
function mombWagonGeo(tank){const gb=new GB();const wh=WHITE,dk=mombC(0x3a3a3a);
  for(const z of [-4.6,4.6])gb.box(0,0.15,z,2.3,0.75,2.8,0,dk,1);gb.box(0,0.9,0,2.6,0.35,14,0,dk,1);for(const z of [-7.15,7.15])for(const x of [-0.8,0.8])gb.box(x,1.0,z,0.25,0.25,0.3,0,dk,1);
  if(tank){mombCyl(gb,0,2.55,-6.2,1.45,1.45,12.4,14,wh,'z',true);gb.box(0,3.9,0,0.9,0.4,0.9,0,dk,1);}
  else{gb.box(0,1.25,0,2.9,2.9,13.6,0,wh,2);gb.box(0,4.15,0,2.6,0.25,13.4,0,wh,2);for(const s of [-1,1])gb.box(s*1.47,1.4,0,0.03,2.5,3.2,0,dk,1);}
  return gb.geo();}
function mombBuildWagons(Z,R,west){const box=MOMB_YARD_BOX,inBox=p=>p[0]>box[0]&&p[0]<box[2]&&p[1]>box[1]&&p[1]<box[3];const zone=Z.name;
  const half=x=>west?x<MOMB_YARD_SPLIT:x>=MOMB_YARD_SPLIT;const gap=QS.lowLOD?30.8:15.4;
  const sid=RAILS.filter(r=>!r.tram&&r.pts.every(inBox)).map(r=>{let L=0;for(let i=1;i<r.pts.length;i++)L+=Math.hypot(r.pts[i][0]-r.pts[i-1][0],r.pts[i][1]-r.pts[i-1][1]);return {r,L};}).filter(o=>o.L>40&&o.L<800);
  const lists=[[],[]],cols=[[],[]];const PAL=[[0x7a3b24,0x5d4a3a,0x2e5a3c,0x5f6a72,0x8a2e1e],[0xd8d8d0,0x2b2b2b,0x8c9196]];
  for(const {r} of sid){const pts=r.pts;let acc=4,run=0;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.5)continue;const dx=(b[0]-a[0])/L,dz=(b[1]-a[1])/L;
    for(let t=acc;t+7.5<=L;t+=gap){const x=a[0]+dx*(t+7),z=a[1]+dz*(t+7);if(!half(x))continue;if(mombNearBridge(x,z)||!mombCellFree(x,z)){run=0;continue;}if(run>=6&&R()<0.5){run=0;continue;}run++;
      const tank=R()<0.35?1:0;const face=Math.atan2(dx,dz);lists[tank].push({x,z,face});cols[tank].push(PAL[tank][Math.floor(R()*PAL[tank].length)]);mombOBB(x,z,3.0,14.4,face,4);MOMB.wagons.push({x,z,face,tank:!!tank,zone});}
    acc=0;}}
  const mat=mombMat({vertexColors:true,roughness:0.75,metalness:0.2});
  for(const k of [0,1]){if(!lists[k].length)continue;const im=mombInst(mombWagonGeo(k===1),mat,lists[k]);if(!im)continue;const c=new THREE.Color();cols[k].forEach((h,i)=>{c.setHex(h);im.setColorAt(i,c);});if(im.instanceColor)im.instanceColor.needsUpdate=true;}}

// ---------- Wahrzeichen: Waggonbau-Denkmal (historischer Güterwagen auf Sockel) ----------
// Platzfläche (Fußgängerbereich erlaubt), aber kein Gebäude, kein Wasser, keine Fahrbahn
function mombPlazaFree(x,z,r){for(let a=-r;a<=r;a+=1.5)for(let b=-r;b<=r;b+=1.5){const i=idx(x+a,z+b);if(i<0||hgG(i)!==0||(mfG(i)&4))return false;}return !mombNearBridge(x,z);}
function mombBuildDenkmal(){const plaza=AREAS.find(a=>a.kind==='square'&&a.name==='Heinz-Schier-Platz');const c0=plaza?polyCentroid(plaza.poly):[-3506,-2647];const s=mombFindSpot(c0[0],c0[1],8,80,null,0,mombPlazaFree);if(!s)return;const [x,z]=s;const rot=Math.atan2(-(-2533+3003),(-2741+4347));// parallel zur Bahn
  const gb=new GB();const stone=mombC(0x9c958a),wood=mombC(0x6b3a22),dk=mombC(0x2a2a2a),rail=mombC(0x6f6a64);const c=Math.cos(rot),sn=Math.sin(rot);const W=(u,v)=>[x+c*u+sn*v,z-sn*u+c*v];
  gb.box(x,0,z,15,0.8,4.6,rot,stone,2);for(let u=-6.5;u<=6.5;u+=1){const [px,pz]=W(u,0);gb.box(px,0.8,pz,0.25,0.12,2.6,rot,mombC(0x4a3a2c),1);}
  for(const v of [-0.72,0.72]){const [px,pz]=W(0,v);gb.box(px,0.92,pz,14,0.12,0.08,rot,rail,1);}
  for(const u of [-3.2,3.2]){const [px,pz]=W(u,0);gb.box(px,0.95,pz,2.4,0.7,2.4,rot,dk,1);}
  gb.box(x,1.6,z,10.5,0.3,2.7,rot,dk,1);gb.box(x,1.9,z,10,2.8,2.8,rot,wood,2);for(let u=-4.5;u<=4.5;u+=1.5){const [px,pz]=W(u,0);gb.box(px,1.9,pz,0.12,2.8,2.86,rot,mombC(0x4a2716),1);}
  gb.box(x,4.7,z,10.3,0.35,3.0,rot,mombC(0x3c3c3c),2);
  {const [px,pz]=W(0,3.6);gb.box(px,0,pz,1.6,1.1,0.4,rot,stone,1);}
  mombMesh(gb,mombMat({vertexColors:true,roughness:0.8}));
  {const [px,pz]=W(0,3.81);mombPlaque('Erinnerung an den Mombacher Waggonbau',{w:1024,h:96,bg:'#2c2a26',fg:'#e8d9a8',font:'700 44px "Barlow Condensed",sans-serif'},1.5,0.16,px,0.75,pz,rot);}
  mombOBB(x,z,15,4.6,rot,5);mombOBB(...W(0,3.6),1.6,0.4,rot,2);
  MOMB.denkmal={x,z,rot};mombProp('denkmal',x,z);}
function mombBuildBahnW(Z,R){mombBuildDenkmal();mombBuildWagons(Z,R,true);const gb=new GB();mombChimneys(gb,Z,1);mombMesh(gb,mombMat({vertexColors:true,roughness:0.7,metalness:0.15}));}
function mombBuildBahnO(Z,R){mombBuildWagons(Z,R,false);}

// ---------- Kleingärten ----------
function mombGnome(gb,x,z,f){// eigener Entwurf: Meenzer Fassenachts-Zwerg mit Narrenkappe in Rot-Weiß-Blau-Gelb
  gb.box(x,0,z,0.22,0.06,0.22,f,mombC(0x5a4632),1);gb.box(x,0.06,z,0.2,0.16,0.16,f,mombC(0x2f6b3a),1);gb.box(x,0.22,z,0.22,0.14,0.18,f,mombC(0xc0392b),1);
  gb.box(x,0.36,z,0.14,0.1,0.14,f,mombC(0xf1c7a5),1);gb.box(x+Math.sin(f)*0.06,0.3,z+Math.cos(f)*0.06,0.12,0.1,0.04,f,mombC(0xf4f4f4),1);
  mombPyramid(gb,x,0.46,z,0.09,0.22,[mombC(0xd52b1e),mombC(0xffffff),mombC(0x1f4fa8),mombC(0xf2c500)]);gb.box(x,0.68,z,0.05,0.05,0.05,0,mombC(0xf2c500),1);}
function mombShed(gb,x,z,rot,col){const w=2.6,d=2.2,h=2.1;gb.box(x,0,z,w,h,d,rot,col,2);const c=Math.cos(rot),s=Math.sin(rot);const P=(u,y,v)=>[x+c*u+s*v,y,z-s*u+c*v];const roof=mombC(0x5b3a2a);
  gb.quadOut(P(-w/2-0.2,h,-d/2-0.2),P(w/2+0.2,h,-d/2-0.2),P(w/2+0.2,h+0.7,0),P(-w/2-0.2,h+0.7,0),[0,0],[1,0],[1,1],[0,1],roof,[x,h-1,z]);
  gb.quadOut(P(-w/2-0.2,h,d/2+0.2),P(w/2+0.2,h,d/2+0.2),P(w/2+0.2,h+0.7,0),P(-w/2-0.2,h+0.7,0),[0,0],[1,0],[1,1],[0,1],roof,[x,h-1,z]);
  for(const sg of [-1,1])gb.triOut(P(sg*w/2,h,-d/2),P(sg*w/2,h,d/2),P(sg*w/2,h+0.7,0),[0,0],[1,0],[0,1],col,[x,h,z]);
  const dp=P(0,0,d/2+0.01);gb.box(dp[0],0,dp[2],0.8,1.8,0.04,rot,mombC(0x4a3020),1);
  mombOBB(x,z,w,d,rot,3);}
function mombBuildKgv(Z,R){const K=MOMB.kleingaerten;const area=AREAS.find(a=>(a.kind==='grass'||a.kind==='garden'||a.kind==='park')&&pip(MOMB_KGV_PT[0],MOMB_KGV_PT[1],a.poly));
  const poly=area?area.poly:[[-3667,-2154],[-3572,-2154],[-3572,-1975],[-3667,-1975]];
  // Ausrichtung entlang der längsten Kante
  let best=0,rot=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L>best){best=L;rot=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);}}
  const [cx,cz]=polyCentroid(poly);const c=Math.cos(rot),s=Math.sin(rot);const W=(u,v)=>[cx+c*u+s*v,cz-s*u+c*v];const Lc=(x,z)=>{const dx=x-cx,dz=z-cz;return [dx*c-dz*s,dx*s+dz*c];};
  let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const p of poly){const [u,v]=Lc(p[0],p[1]);u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
  const inside=(u,v)=>{const [x,z]=W(u,v);return pip(x,z,poly)&&mombCellFree(x,z)&&!mombNearBridge(x,z);};
  const rectOK=(uc,vc,hu,hv)=>{for(let u=-hu;u<=hu;u+=2)for(let v=-hv;v<=hv;v+=2)if(!inside(uc+u,vc+v))return false;return inside(uc+hu,vc+hv)&&inside(uc-hu,vc-hv)&&inside(uc+hu,vc-hv)&&inside(uc-hu,vc+hv);};
  K.area={poly,cx,cz,rot};
  const gb=new GB();const vm=(v0+v1)/2;
  // Vereinsheim am einen Ende
  let club=null;for(let u=u0+8;u<u1-8&&!club;u+=2)for(const dv of [0,-4,4,-8,8])if(rectOK(u,vm+dv,7.5,5.5)){club=[u,vm+dv];break;}
  if(club){const [x,z]=W(club[0],club[1]);const wall=mombC(0xe6d7b0),roof=mombC(0x8c3b2a);gb.box(x,0,z,12,3.2,8,rot,wall,2);
    const P=(u,y,v)=>{const [px,pz]=W(club[0]+u,club[1]+v);return [px,y,pz];};
    for(const sg of [-1,1])gb.quadOut(P(-6.4,3.2,sg*4.4),P(6.4,3.2,sg*4.4),P(6.4,5.2,0),P(-6.4,5.2,0),[0,0],[1,0],[1,1],[0,1],roof,[x,2,z]);
    for(const sg of [-1,1])gb.triOut(P(sg*6,3.2,-4),P(sg*6,3.2,4),P(sg*6,5.2,0),[0,0],[1,0],[0,1],wall,[x,3.2,z]);
    const df=P(6.02,0,0);gb.box(df[0],0,df[2],0.06,2.2,1.3,rot,mombC(0x5a3a22),1);for(const v of [-2.6,2.6]){const wf=P(6.02,0,v);gb.box(wf[0],1.1,wf[2],0.05,1.1,1.4,rot,mombC(0xbfd9e6),1);}
    mombOBB(x,z,12,8,rot,4);
    {const sp=P(6.08,0,0);mombPlaque('Vereinsheim · '+MOMB_NAME,{w:1024,h:110,bg:'#2f4f2f',fg:'#f3e6b0',font:'700 54px "Barlow Condensed",sans-serif'},5.6,0.6,sp[0],2.75,sp[2],rot+Math.PI/2);}
    const front=W(club[0]+16,club[1]);K.clubhouse={x,z,rot,front};mombProp('vereinsheim',x,z);
    const v=MOMB_VENUE;v.door=rayDoor(front[0],front[1],x,z);K.venue=v;}
  // Parzellen im Raster: 11 x 9 m, 1 m Weg dazwischen (niedrige Qualität: Zäune ohne Pfosten, keine Fahnen)
  const shedCols=[0x6f8f4e,0x9c4a3a,0x4a6f8f,0xc9b27c,0x7b6a58,0x3f7a6a];const fence=mombC(0x8b6d4a),bed=mombC(0x5a4030),leaf=mombC(0x4f8a35);const low=QS.lowLOD;
  for(let u=u0+6;u<=u1-6;u+=12)for(let v=v0+5;v<=v1-5;v+=10){if(club&&Math.abs(u-club[0])<14&&Math.abs(v-club[1])<11)continue;if(!rectOK(u,v,5.5,4.5))continue;
    const [x,z]=W(u,v);const P=(a,b)=>W(u+a,v+b);
    for(const [a,b,w,d] of [[0,-4.5,11,0.05],[-5.5,0,0.05,9],[5.5,0,0.05,9],[-3.25,4.5,4.5,0.05],[3.25,4.5,4.5,0.05]]){const [px,pz]=P(a,b);for(const y of (low?[0.5]:[0.3,0.65]))gb.box(px,y,pz,w,0.07,d,rot,fence,1);
      if(low)continue;const L=Math.max(w,d),n=Math.max(1,Math.round(L/1.8));for(let k=0;k<=n;k++){const o=-L/2+L*k/n;const [qx,qz]=P(a+(w>d?o:0),b+(w>d?0:o));gb.box(qx,0,qz,0.08,0.85,0.08,rot,fence,1);}}
    const sp=P(-3.6,-2.8);const col=mombC(shedCols[Math.floor(R()*shedCols.length)]);mombShed(gb,sp[0],sp[1],rot,col);
    for(const b of [-0.6,1.6]){const [px,pz]=P(1.6,b);gb.box(px,0,pz,5,0.18,1.2,rot,bed,1);for(let a=-2.1;a<=2.1;a+=low?1.2:0.6){const [qx,qz]=P(1.6+a,b+(R()-0.5)*0.4);const s=0.18+R()*0.14;gb.box(qx,0.18,qz,s,0.12+R()*0.2,s,rot+R(),leaf,1);}}
    let gnome=false;if(R()<0.55){const gp=P(-1.2+R()*1.5,3.4);mombGnome(gb,gp[0],gp[1],rot+Math.PI/2*(R()<0.5?1:-1));gnome=true;K.gnomes++;}
    if(R()<0.25&&!low){const fp=P(4.6,-3.6);gb.box(fp[0],0,fp[1],0.06,4,0.06,0,mombC(0xdddddd),1);const f1=P(4.6+0.55,-3.6);gb.box(f1[0],3.4,f1[1],1.0,0.3,0.03,rot,mombC(0xc8102e),1);gb.box(f1[0],3.1,f1[1],1.0,0.3,0.03,rot,WHITE,1);}
    K.plots.push({x,z,rot,shed:sp,gnome});mombProp('parzelle',x,z);}
  mombMesh(gb,mombMat({vertexColors:true,roughness:0.85}));
  // Gärtner-Szene mit Grill
  if(K.plots.length){const ps=[K.plots[Math.floor(K.plots.length*0.2)],K.plots[Math.floor(K.plots.length*0.55)],K.plots[Math.floor(K.plots.length*0.85)]].filter(Boolean);const spots=[];
    ps.forEach((p,k)=>{const c=Math.cos(p.rot),s=Math.sin(p.rot);const W=(u,v)=>[p.x+c*u+s*v,p.z-s*u+c*v];const a=W(1.5,3.2);spots.push({x:a[0],z:a[1],face:p.rot+Math.PI,pose:k===2?'sit':'stand',prop:k===0?'kanne':k===1?'grill':null});
      if(k===1&&!QS.lowLOD){const b=W(3,3.2);spots.push({x:b[0],z:b[1],face:p.rot-Math.PI/2,pose:'stand'});}});
    const sc=mombScene(Z,'kleingarten','garten',K.area.cx,K.area.cz,spots.filter(o=>mombCellFree(o.x,o.z)).slice(0,QS.lowLOD?2:4),MOMB_CONV_ZWERG,MOMB_LINES.garten);
    const p=ps[1];if(p){const c=Math.cos(p.rot),s=Math.sin(p.rot);const gx=p.x+c*2.2+s*1.8,gz=p.z-s*2.2+c*1.8;const g=new THREE.Group();g.position.set(gx,0,gz);g.rotation.y=p.rot;
      const top=new THREE.Mesh(mombGeo(new THREE.BoxGeometry(0.9,0.12,0.5)),cmat(0x222222,0.4));top.position.y=0.86;g.add(top);const leg=mombGeo(new THREE.BoxGeometry(0.05,0.8,0.05));
      for(const [a,b] of [[-0.4,-0.2],[0.4,-0.2],[-0.4,0.2],[0.4,0.2]]){const l=new THREE.Mesh(leg,cmat(0x444444,0.5));l.position.set(a,0.4,b);g.add(l);}Z.group.add(g);Z.mombMeshes+=5;sc.grillMesh=g;}}}

// ---------- Vereinsheim innen: Vorstandssitzung ----------
const MOMB_CONV_VORSTAND={o:'Gude! Sie sin net im Verein, gell? Wolle Se e Parzell? Die Wartelist is nur siebzeh Johr.',m:'smile',c:[
  ['Ich nehm eine!','Prima. Dann sin Se ab 2043 dabei. Un bringe Se Kuche mit – des is Pflicht.','laugh'],
  ['Wie hoch darf die Hecke sein?','Ein Meter fuffzisch. Ab ein Meter dreiunfuffzisch gibt’s e Abmahnung un Kuchedienst.','smile'],
  ['Ich will nur ein Bier.','Getränk gibt’s erst nach TOP 23. Mir sin bei TOP 7. Seit drei Stund.','sad']]};
const MOMB_SITZUNG=[[0,'Ruhe bitte! TOP 7: Die Heck vun Parzell 14 is drei Zentimeter zu hoch.'],[1,'Des is gege die Satzung! Paragraph 12, Absatz Zwerch!'],[2,'Ich beantrag, dass mer erst emol en Schoppe trinke.'],
  [0,'Mir stimme ab: Wer is dafür, dass die Heck bleibt?'],[3,'Ich enthalt mich. Wie seit 1987.'],[4,'Ich bin dafür – awwer nur, wenn’s Kuche gibt.'],[0,'Gegenstimme? … Keine. Enthaltunge? … Alle. Dann vertage mer uff nächst Johr.'],
  [5,'Un wer hot widder die Gießkann vum Verein mitgenomme?'],[1,'Antrag: Gartezwerch nur noch in Meenzer Farbe – rot, weiß, blau, gelb!'],[0,'Angenomme! Helau!']];
const MOMB_VENUE={id:'momb_kgv',name:'Vereinsheim '+MOMB_NAME,sub:'Kleingärten Mombach · Vorstandssitzung (fiktiv)',W:16,D:12,H:3.6,wall:0xe8dcc0,ceil:0xf2ead8,hemiI:0.6,exp:1.0,lampI:22,lampD:16,
  lights:[[0,3.1,-1],[-5,3.1,2],[5,3.1,2]],wp:[[-5,3.5],[5,3.5],[0,4],[6,0]],spawn:[0,4.4,Math.PI],exits:[{x:0,z:5.4,w:1.4,d:0.8,to:'door'}],
  hints:[{x:0,z:-4.6,r:2.5,t:'Tagesordnung: TOP 7 – Heckenhöhe Parzelle 14. Vertagt seit 1987.'},{x:-7,z:0,r:2,t:'Vereinsfahne des '+MOMB_NAME+' (fiktiv).'}],
  build(r,B){MOMB.roomBuilds++;B.sbox('wood',0,0,-1,7.2,0.76,1.6,0x7a5232);for(const x of [-3,-1.5,0,1.5,3]){B.box('wood',x,0,-2.3,0.45,0.46,0.45,0x5a3a22);B.box('wood',x,0,0.3,0.45,0.46,0.45,0x5a3a22);}
    B.box('cloth',0,0.76,-1,6.8,0.02,1.3,0xf4f1e8);for(const x of [-2.4,-0.6,1.2,2.8])B.box('sand',x,0.78,-1,0.35,0.12,0.35,0xc98a4b);B.box('glass',-1.8,0.78,-0.7,0.1,0.25,0.1,0x9fc5d8);B.box('glass',2,0.78,-1.2,0.1,0.25,0.1,0x9fc5d8);
    B.sbox('wood',6.6,0,-1,1.2,1.1,6,0x6b4426);B.box('dark',6.6,1.1,-1,1.3,0.06,6.2,0x2a2a2a);B.box('wood',7.6,1.4,-3,0.3,1.6,3,0x5a3a22);for(let z=-4.2;z<=-1.8;z+=0.5)B.box('gold',7.5,1.5+((z*4)&1)*0.6,z,0.2,0.35,0.2,0xd4af37);
    B.sbox('sand',-6.8,0,4.6,1.2,0.4,0.8,0xc8c0b0);
    const board=freeAfterUpload(canvasTex(512,384,g=>{g.fillStyle='#24392a';g.fillRect(0,0,512,384);g.fillStyle='#f3efe0';g.font='700 34px "Barlow Condensed",sans-serif';g.fillText('TAGESORDNUNG',150,46);g.font='500 24px "Barlow Condensed",sans-serif';
      ['TOP 1 – Begrüßung (2 Std.)','TOP 4 – Kuchendienst-Plan','TOP 7 – Heckenhöhe Parzelle 14','TOP 9 – Zwergenordnung','TOP 12 – Gießkanne vermisst','TOP 23 – Getränke'].forEach((t,i)=>g.fillText(t,40,100+i*44));},false));
    B.plane(board,0,1.8,-5.75,3.2,2.4,0);
    const flag=freeAfterUpload(canvasTex(256,384,g=>{g.fillStyle='#2f6b3a';g.fillRect(0,0,256,384);g.fillStyle='#f2c500';g.fillRect(0,170,256,40);g.fillStyle='#fff';g.font='700 34px "Barlow Condensed",sans-serif';g.textAlign='center';g.fillText('KGV',128,90);g.fillText('Rheinwiese',128,130);g.font='600 26px "Barlow Condensed",sans-serif';g.fillText('Mombach',128,270);},false));
    B.plane(flag,-7.75,1.9,-1,1.4,2.1,Math.PI/2);},
  npcs(r){const L=['Ich hab Antrag gestellt. Worum’s ging, weiß ich nimmer.','Des Protokoll schreibt widder die Gisela – „alles wie immer“.','Kann mer des net vertage? Die Fassenacht fängt bald aa.','Mei Zucchini is größer wie dei Zucchini.'];
    const seats=[[-3,-2.3,0],[-1.5,-2.3,0],[0,-2.3,0],[1.5,-2.3,0],[3,0.3,Math.PI]];
    const chair=vPerson(r,-4.6,-1,Math.PI/2,{role:'stand',lines:null});chair.npcName='Vorsitzender Hans-Jürgen (fiktiv)';chair.forceConv=MOMB_CONV_VORSTAND;
    const names=['Kassenwartin Elfriede','Schriftführerin Gisela','Beisitzer Rudi','Zwergenbeauftragter Klaus-Peter','Gießkannenwart Horst'];
    seats.forEach((s,i)=>{const h=vPerson(r,s[0],s[1],s[2],{pose:'sit',role:'stand',lines:L});h.npcName=names[i]+' (fiktiv)';});
    r.mombSeqT=1.5;r.mombSeq=0;},
  onEnter(r){hint('Vorstandssitzung läuft. Mit <b>E</b> den Vorsitzenden ansprechen.',3);},
  update(r,dt,P){const ch=r.people[0];if(ch&&ch.alive&&!ch.removed&&ch.state==='venue'&&!ch.forceConv)ch.forceConv=MOMB_CONV_VORSTAND;
    r.mombSeqT-=dt;if(r.mombSeqT>0||TALK)return;r.mombSeqT=4.2;const [who,txt]=MOMB_SITZUNG[r.mombSeq%MOMB_SITZUNG.length];const h=r.people[who];
    if(h&&h.alive&&!h.removed){say(h,txt,3.8,'');MOMB.kleingaerten.sitzung.last=txt;}r.mombSeq++;MOMB.kleingaerten.sitzung.step=r.mombSeq;}};
VENUES.push(MOMB_VENUE);
// Raum abseits der Karte: erst freigeben, wenn niemand drin ist und die Kleingarten-Zone entsorgt ist
function mombRoomDispose(v){const r=v.room;for(const o of r.people)if(!o.removed)o.remove();r.people=[];scene.remove(r.grp);const shared=new Set(Object.values(VMATS));
  r.grp.traverse(m=>{if(m.geometry)m.geometry.dispose();const ms=Array.isArray(m.material)?m.material:m.material?[m.material]:[];for(const x of ms){if(shared.has(x))continue;if(x.map)x.map.dispose();x.dispose();}});
  v.room=null;MOMB.roomDisposes++;}
function mombRoomGC(){const v=MOMB_VENUE,r=v.room;if(!r||INDOOR===r||MOMB.zones.kgv.built)return;for(const P of PLAYERS)if(P.h&&P.h.room===r)return;mombRoomDispose(v);}

// ---------- Mainzer Sand: Kiefern, Trockengras ----------
function mombPineGeo(){const gb=new GB();gb.box(0,0,0,0.42,4.2,0.42,0,mombC(0x5e4634),1);gb.box(0.05,4.2,0,0.32,2.6,0.32,0.2,mombC(0xc06a3c),1);gb.beam([0,5.2,0],[1.4,6.4,0.5],0.18,0.18,mombC(0xc06a3c));gb.beam([0,5.6,0],[-1.2,6.6,-0.6],0.16,0.16,mombC(0xc06a3c));
  const g1=mombC(0x2c4628),g2=mombC(0x3d5a2e),g3=mombC(0x4a6534);for(const [x,y,z,w,h,d,r,c] of [[0,5.8,0,4.4,1.6,3.6,0.3,g1],[1.5,6.4,0.6,3.0,1.4,2.8,-0.5,g2],[-1.3,6.6,-0.6,2.8,1.3,2.6,0.9,g3],[0.2,7.2,0,2.6,1.0,2.4,0.1,g2],[2.0,5.6,-0.8,1.8,1.0,1.6,0.6,g1]])gb.box(x,y,z,w,h,d,r,c,2);return gb.geo();}
function mombTuftGeo(){const gb=new GB();const cs=[mombC(0xc9b27a),mombC(0xa89660),mombC(0x8f8a52)];for(let k=0;k<5;k++){const a=k/5*TAU;const dx=Math.cos(a),dz=Math.sin(a),px=-dz*0.05,pz=dx*0.05;const col=cs[k%3];const tip=[dx*0.28,0.32+0.08*(k%3),dz*0.28];
  gb.tri([-px,0,-pz],[px,0,pz],tip,[0,0],[1,0],[0.5,1],col);gb.tri([px,0,pz],[-px,0,-pz],tip,[0,0],[1,0],[0.5,1],col);}return gb.geo();}
function mombBuildSand(Z,R){const S=MOMB.sand;const bb=MOMB_SAND_BB;const pts=MOMB_SAND_POLY;const [cx,cz]=polyCentroid(pts);
  S.area={poly:pts,bb,cx,cz,m2:Math.round(Math.abs(polyArea(pts)))};
  const ok=(x,z)=>{const i=idx(x,z);return i>=0&&hgG(i)===0&&!mombRoad(i)&&pip(x,z,pts);};
  const nPine=QS.lowLOD?23:46,nTuft=QS.lowLOD?700:1400;
  const pines=[],tufts=[];for(let t=0;t<4000&&pines.length<nPine;t++){const x=lerp(bb[0],bb[2],R()),z=lerp(bb[1],bb[3],R());if(!ok(x,z)||pines.some(p=>Math.hypot(p.x-x,p.z-z)<18))continue;pines.push({x,z,face:R()*TAU,s:0.8+R()*0.5});}
  for(let t=0;t<9000&&tufts.length<nTuft;t++){const x=lerp(bb[0],bb[2],R()),z=lerp(bb[1],bb[3],R());if(!ok(x,z))continue;tufts.push({x,z,face:R()*TAU,s:0.7+R()*0.9});}
  for(const p of pines)mombCirc(p.x,p.z,0.4,7);
  mombInst(mombPineGeo(),mombMat({vertexColors:true,roughness:0.9}),pines);
  mombInst(mombTuftGeo(),mombMat({vertexColors:true,roughness:1,side:THREE.DoubleSide}),tufts,false);
  S.pines=pines.length;S.tufts=tufts.length;
  // Spaziergänger auf Rundwegen durch die Düne
  const sc=mombScene(Z,'sand','sand',cx,cz,[],MOMB_CONV_SAND,MOMB_LINES.sand);
  for(let k=0;k<(QS.lowLOD?2:3);k++){const wp=[];for(let t=0;t<400&&wp.length<5;t++){const x=lerp(bb[0],bb[2],R()),z=lerp(bb[1],bb[3],R());const i=idx(x,z);if(i>=0&&hgG(i)===0&&pip(x,z,pts))wp.push([x,z]);}if(wp.length)sc.spots.push({x:wp[0][0],z:wp[0][1],face:0,pose:'walk',wp});}}

// ---------- Rheinufer Mombach: Weg, Bänke, Angler ----------
function mombBankZ(x){for(let z=-3450;z>-3950;z-=1){const i=idx(x,z);if(i>=0&&(mfG(i)&4))return z;}return null;}
function mombBuildRhein(Z){const RH=MOMB.rhein;const gb=new GB();const grav=mombC(0xb8ab92);let prev=null;
  for(let x=MOMB_RHEIN_X[0];x<=MOMB_RHEIN_X[1];x+=6){const bz=mombBankZ(x);if(bz===null){prev=null;continue;}const p=[x,bz+8];if(!mombFree(p[0],p[1],1.2)){prev=null;continue;}
    if(prev&&Math.hypot(p[0]-prev[0],p[1]-prev[1])<9){const mx=(p[0]+prev[0])/2,mz=(p[1]+prev[1])/2;const L=Math.hypot(p[0]-prev[0],p[1]-prev[1]);gb.box(mx,0.02,mz,2.4,0.04,L+1,Math.atan2(p[0]-prev[0],p[1]-prev[1]),grav,2);}
    RH.path.push({x:p[0],z:p[1],bz});prev=p;}
  mombMesh(gb,mombMat({vertexColors:true,roughness:0.95}),false);
  // Bänke Richtung Wasser
  const bench=new GB();for(const zz of [-0.2,0,0.2])bench.box(0,0.45,zz,1.8,0.04,0.12,0,mombC(0x8a5a36),1);bench.box(0,0.55,-0.27,1.8,0.12,0.04,0,mombC(0x8a5a36),1);bench.box(0,0.72,-0.29,1.8,0.12,0.04,0,mombC(0x8a5a36),1);
  for(const x of [-0.75,0.75])bench.box(x,0,0,0.08,0.45,0.5,0,mombC(0x262628),1);
  const list=[];RH.path.forEach((p,k)=>{if(k%6!==2)return;const x=p.x,z=p.bz+4.6;if(!mombFree(x,z,1))return;list.push({x,z,face:Math.PI});mombOBB(x,z,1.8,0.6,Math.PI,1);RH.benches.push({x,z});mombProp('bank',x,z);});
  mombInst(bench.geo(),mombMat({vertexColors:true,roughness:0.7}),list);
  // Angelplätze direkt an der Kante
  const n=RH.path.length;for(const f of (QS.lowLOD?[0.3,0.7]:[0.2,0.5,0.8])){const p=RH.path[Math.floor(n*f)];if(!p)continue;for(const off of [1.6,2.4,3.2]){const z=p.bz+off;if(mombCellFree(p.x,z)){RH.anglers.push({x:p.x,z,face:Math.PI});break;}}}
  if(RH.anglers.length){const mid=RH.path[Math.floor(n/2)];mombScene(Z,'rhein','rhein',mid.x,mid.z,RH.anglers.map(a=>({x:a.x,z:a.z,face:a.face,pose:'sit',prop:'angel'})),MOMB_CONV_ANGLER,MOMB_LINES.rhein);}}

// ---------- Straßenszenen mit Mundart ----------
const MOMB_CONV_ZWERG={o:'Ei gude! Gugge Se net so uff mein Zwerch – der is beim Verein ordnungsgemäß angemeldet!',m:'smile',c:[
  ['Schöner Zwerg!','Gell? Die Kapp is in Meenzer Farbe. Rot, weiß, blau, gelb – Helau!','laugh'],
  ['Ist der überhaupt erlaubt?','Paragraph 9: ein Zwerch pro Parzell. Ich hab Zwilling – des is e Grauzon.','smile'],
  ['Krieg ich Tomaten?','Nur im Tausch gege Weck. Oder Woi.','neutral']]};
const MOMB_CONV_SAND={o:'Psst! Net uff die Dün trampele – hier wachse Sache, die gibt’s sonst kaum noch in Deutschland.',m:'neutral',c:[
  ['Was wächst denn hier?','Sand-Silberscharte, Adonisröschen, Steppegras. Meenz hat e Steppe – wer hätt’s gedacht!','smile'],
  ['Ist doch nur Sand.','NUR Sand?! Den hot de Wind vor Tausende vun Johr hergeweht, junger Mensch!','angry'],
  ['Wo ist hier der Strand?','Am Rhein, da hinne. Hier is nur die Wüst ohne Wasser.','laugh']]};
const MOMB_CONV_ANGLER={o:'Gude. Wenn de Fisch sehe willst, musste warte. Viel warte.',m:'neutral',c:[
  ['Was beißt denn heute?','Heut beiße nur die Schnooke.','laugh'],
  ['Darf man hier angeln?','Mit Schein, logisch. Ich hab sogar zwei: Angelschein un Fassenachtsorde.','smile'],
  ['Ich spring mal rein.','Bloß net! Die Strömung nimmt dich mit bis Bingen.','angry']]};
const MOMB_CONV_HAFEN={o:'Ei, was mache Sie dann hier? Des is Hafegelände, do flieje Container!',m:'angry',c:[
  ['Ich schau mich nur um.','Dann gugge Se mit Abstand. Un mit Helm, wenn’s geht.','neutral'],
  ['Was wird hier verladen?','Alles, was uff de Rhein passt. Nur kei Fassenachtswage – die fahrn selber.','laugh'],
  ['Ich such Arbeit.','Frühschicht fängt um sechs aa. Des is vor de erschte Weck – überleg’s dir.','smile']]};
const MOMB_LINES={
  garten:['Mei Tomate sin dies Johr so dick wie Fassenachtskrapfe!','Die Schnecke kriege bald aach Stimmrecht im Verein.','Wer will noch e Werschtche? Is grad fertig!','Des is kein Grill, des is Kulturgut!','Ich mach Gartearbeit. Mit de Auge.'],
  sand:['Die Sand-Silberscharte blüht – des gibt’s fast nur noch hier!','Bleiwe Se uff’m Weg, des is Naturschutzgebiet!','Hier is Meenz wie in de Steppe. Fehlt nur des Kamel.','Mein Hund find Sand toll. Mein Staubsauger net.'],
  rhein:['Psst! Die Fisch höre alles.','Ich angel hier seit dreißig Johr. Gefange hab ich zwei Schuh un e Fahrrad.','Wenn die Schiffe vorbeifahrn, beißt nix.','Gestern hatt ich en Waller so groß wie mei Auto. Ehrlich!'],
  hafen:['Kumm mer net zu nah, hier wern Container gestapelt!','Mittagspaus is heilig – do steht aach de Kran.','De Kran hot mehr Dienstjahre wie ich.']};
// Szene = Leute einer Zone; sie entstehen beim Zonenbau (mombSpawnScene) und gehen mit der Zone (lazyNpc).
function mombScene(Z,id,kind,x,z,spots,conv,lines){const sc={id,kind,x,z,spots,conv,lines,people:[],lineT:4,active:false,said:0,zone:Z.name,Z};MOMB.scenes.push(sc);return sc;}
function mombVest(h){h.g.traverse(o=>{if(o.isMesh&&o.geometry===HGEO.torso)o.material=cmat(0xff7a1a,0.6);});}
function mombSpawnScene(Z,sc){const need=new Set(sc.spots.map(s=>s.prop));const G0={};
  if(need.has('angel'))G0.rod=mombGeo(new THREE.CylinderGeometry(0.015,0.025,3.2,5));if(need.has('helm'))G0.helm=mombGeo(new THREE.SphereGeometry(0.17,10,6,0,TAU,0,Math.PI/2));if(need.has('kanne'))G0.can=mombGeo(new THREE.BoxGeometry(0.22,0.24,0.14));
  sc.active=true;sc.people=[];
  for(const sp of sc.spots){const h=lazyNpc(Z,new Human('ped'));h.x=sp.x;h.z=sp.z;h.y=groundY(sp.x,sp.z);h.facing=sp.face;h.state='roof';h.walkSpeed=sp.pose==='walk'?mr(0.9,1.2):0;h.mombSpot=sp;h.mombScene=sc;h.forceConv=sc.conv;
    if(sp.pose==='sit'){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;}
    if(sp.prop==='angel'){const r=new THREE.Mesh(G0.rod,cmat(0x3a3a3a,0.5));r.position.set(0,-0.55,0.9);r.rotation.x=1.1;h.armR.add(r);h.armR.rotation.x=-0.9;h.armL.rotation.x=-0.7;}
    if(sp.prop==='helm'){const m=new THREE.Mesh(G0.helm,cmat(0xf2c500,0.4));m.position.y=0.12;h.head.add(m);mombVest(h);}
    if(sp.prop==='kanne'){const m=new THREE.Mesh(G0.can,cmat(0x2e7d4f,0.5));m.position.set(0,-0.62,0.1);h.armR.add(m);}
    h.mombWi=0;h.sync();sc.people.push(h);}}
function mombUpdateScene(sc,dt,px,pz){const d=Math.hypot(px-sc.x,pz-sc.z);
  sc.people=sc.people.filter(h=>!h.removed&&h.alive);
  for(const h of sc.people){if(h.state!=='roof')continue;if(!h.forceConv)h.forceConv=sc.conv;const sp=h.mombSpot;
    if(sp.pose==='walk'&&sp.wp){const w=sp.wp[h.mombWi%sp.wp.length];const dx=w[0]-h.x,dz=w[1]-h.z;if(Math.hypot(dx,dz)<1.5||(h.mombStuck||0)>4){h.mombWi++;h.mombStuck=0;}
      const mv=moveHuman(h,dx,dz,h.walkSpeed,dt);if(mv<0.05)h.mombStuck=(h.mombStuck||0)+dt;faceTo(h,dx,dz,dt,5);h.animate(dt,h.walkSpeed);h.y=groundY(h.x,h.z);h.sync();}
    else if(sp.pose==='sit'){if(h.fx&&h.face&&h.face.visible)h.updateFace&&h.updateFace();h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}
    else{if(sp.prop==='kanne'||sp.prop==='angel'){h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}else{h.animate(dt,0);h.sync();}}}
  sc.lineT-=dt;if(sc.lineT<=0){sc.lineT=mr(6,12);if(d<40&&sc.people.length){const h=mpick(sc.people);if(h.state==='roof'&&!h.bubble){say(h,mpick(sc.lines),3.4,'quiet');sc.said++;}}}}

// ---------- Zonen: Bau und Rückbau ----------
const MOMB_BUILD={hafen:mombBuildHafen,rhein:mombBuildRhein,bahnw:mombBuildBahnW,bahno:mombBuildBahnO,kgv:mombBuildKgv,sand:mombBuildSand};
const MOMB_SEED={hafen:3939,rhein:3940,bahnw:3941,bahno:3942,kgv:3943,sand:3944};
function mombZoneBuild(Z){Z.mombHG=[];Z.mombMeshes=0;mombCurZ=Z;
  try{MOMB_BUILD[Z.mombKey](Z,mulberry32(MOMB_SEED[Z.mombKey]));for(const sc of MOMB.scenes)if(sc.Z===Z)mombSpawnScene(Z,sc);}finally{mombCurZ=null;}}
function mombZoneDispose(Z){const n=Z.name,key=Z.mombKey;
  for(const sc of MOMB.scenes)if(sc.Z===Z)for(const h of sc.people)if(TALK&&TALK.npc===h)endTalk();
  mombDrop(MOMB.scenes,n);mombDrop(MOMB.industrie,n);mombDrop(MOMB.wagons,n);mombDrop(MOMB.props,n);
  if(key==='bahnw')MOMB.denkmal=null;
  if(key==='kgv'){const K=MOMB.kleingaerten;K.area=null;K.plots=[];K.gnomes=0;K.clubhouse=null;K.venue=null;}// v.door bleibt (Daten), der Raum folgt in mombRoomGC
  if(key==='sand')MOMB.sand={area:null,pines:0,tufts:0};
  if(key==='rhein')MOMB.rhein={path:[],benches:[],anglers:[]};
  const H=Z.mombHG||[];for(let k=H.length-2;k>=0;k-=2)hgS(H[k],H[k+1]);Z.mombHG=[];Z.mombMeshes=0;}

// Umgehung für den three-Stub (test.html): dort ist eine Group ein Proxy auf eine Funktion, deren `name` schreibgeschützt ist –
// lazyBuild wirft beim Setzen von group.name. Nur für Mombach-Zonen, gleiche Schritte wie lazyBuild; entfällt mit einer zentralen Korrektur.
const _mombLazyBuild=lazyBuild;
lazyBuild=function(Z){if(!Z.mombKey||Z.built)return _mombLazyBuild(Z);
  Z.group=new THREE.Group();try{Z.group.name='lazy_'+Z.name;}catch(e){}scene.add(Z.group);Z.built=true;Z.builds++;Z.o.build(Z);};

function setupMomb(){if(MOMB.zone)return;
  for(const [name,x,z] of MOMB_ZONES)MOMB.zones[name]=lazyZone({name:'momb_'+name,x,z,build:mombZoneBuild,dispose:mombZoneDispose});
  for(const [k,Z] of Object.entries(MOMB.zones))Z.mombKey=k;
  MOMB.zone=MOMB.zones.kgv;
  // Karten-Labels (reine Daten)
  label('Industriehafen Mombach',-3720,-3482,'small');label('Güterbahnhof Mombach',-3300,-2690,'small');label('Waggonbau-Denkmal',-3532,-2654,'lm');
  label('Kleingärten Mombach',-3627,-2062,'small');label(MOMB_VENUE.name+' (begehbar)',-3619.3,-2020.3,'small');MOMB_VENUE.labeled=true;
  label('Mainzer Sand (Naturschutzgebiet)',-4613,-1692,'small');label('Rheinufer Mombach',-4174,-3643,'small');}
// Kennzahlen je Zone (Test/Bericht)
function mombStats(){const o={};for(const [k,Z] of Object.entries(MOMB.zones)){o[k]={built:Z.built,meshes:Z.mombMeshes||0,npcs:Z.npcs.length,owned:Z.owned.length,dc:lazyDrawCalls(Z),hg:(Z.mombHG||[]).length/2,builds:Z.builds,disposes:Z.disposes};}return o;}
MOMB.stats=mombStats;
function updateMomb(dt){mombRoomGC();if(mode!=='play'||!P1.h)return;let any=false;for(const Z of Object.values(MOMB.zones))if(Z.built){any=true;break;}if(!any)return;
  const [px,pz]=ppos(P1);for(const sc of MOMB.scenes)if(sc.Z.built)mombUpdateScene(sc,dt,px,pz);}
