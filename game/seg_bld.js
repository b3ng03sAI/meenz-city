// ===================== ECHTE GEBÄUDE AUS OPENSTREETMAP =====================
// Grundrisse, Höhen, Stockwerke und Dachformen stammen aus OSM; fehlende Werte werden plausibel ergänzt.
const HALL_ROOFS=new Set([187734152]); // Bahnsteighalle Mainz Hbf: nur Dach
const LM_SKIP=new Set([24164140,23658405,100003205,617469308]); // durch Modelle ersetzt (Christuskirche, St. Stephan, Holzturm, Eisenturm)
function triangulate(outer,holes){
  try{if(THREE.ShapeUtils&&THREE.ShapeUtils.triangulateShape){const c=outer.map(p=>new THREE.Vector2(p[0],p[1]));const hs=(holes||[]).map(h=>h.map(p=>new THREE.Vector2(p[0],p[1])));const f=THREE.ShapeUtils.triangulateShape(c,hs);if(Array.isArray(f))return f;}}catch(e){}
  const f=[];for(let i=1;i<outer.length-1;i++)f.push([0,i,i+1]);return f;}
// Ring nach innen versetzen (positiver Flächeninhalt = Außenring; negativer = Loch, wird ebenfalls "in die Masse" versetzt)
function insetRing(P,s){const n=P.length,out=[];
  for(let i=0;i<n;i++){const A=P[(i-1+n)%n],B=P[i],C=P[(i+1)%n];
    let d1x=B[0]-A[0],d1z=B[1]-A[1],l1=Math.hypot(d1x,d1z)||1;d1x/=l1;d1z/=l1;let d2x=C[0]-B[0],d2z=C[1]-B[1],l2=Math.hypot(d2x,d2z)||1;d2x/=l2;d2z/=l2;
    const n1x=-d1z,n1z=d1x,n2x=-d2z,n2z=d2x; // innen (für positive Fläche)
    const p1x=A[0]+n1x*s,p1z=A[1]+n1z*s,p2x=B[0]+n2x*s,p2z=B[1]+n2z*s;
    const den=d1x*d2z-d1z*d2x;let x,z;
    if(Math.abs(den)<1e-4){x=B[0]+n1x*s;z=B[1]+n1z*s;}else{const t=((p2x-p1x)*d2z-(p2z-p1z)*d2x)/den;x=p1x+d1x*t;z=p1z+d1z*t;}
    const mx=x-B[0],mz=z-B[1],ml=Math.hypot(mx,mz);if(ml>s*3.2){x=B[0]+mx/ml*s*3.2;z=B[1]+mz/ml*s*3.2;}
    out.push([x,z]);}
  return out;}
function ringValid(P,Q){const aP=polyArea(P),aQ=polyArea(Q);if(Math.sign(aP)!==Math.sign(aQ)||Math.abs(aQ)<Math.abs(aP)*0.04)return false;
  for(let i=0;i<P.length;i++){const j=(i+1)%P.length;const dx=P[j][0]-P[i][0],dz=P[j][1]-P[i][1],ex=Q[j][0]-Q[i][0],ez=Q[j][1]-Q[i][1];if(dx*ex+dz*ez<=0)return false;}
  // keine Selbstüberschneidung (grob)
  const n=Q.length;if(n<40)for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;if(segInter(Q[i],Q[(i+1)%n],Q[j],Q[(j+1)%n]))return false;}
  return true;}
function ringLen(P){let L=0;for(let i=0;i<P.length;i++){const j=(i+1)%P.length;L+=Math.hypot(P[j][0]-P[i][0],P[j][1]-P[i][1]);}return L;}

const OB=[];
// Gebäude-Datensatz: poly/holes sind Getter. Bis setupBldSlim() (Boot-Ende) liegen die Ringe in rgP/rgH; danach nur noch
// nahe den Spielern (Ring-Cache, p2g_bldslim.js), fern dekodiert der Getter jedes Mal frisch aus OSM.b[src].
class BldsRec{constructor(src,P,H){this.src=src;this.rgP=P;this.rgH=H;}
  get poly(){const P=this.rgP;return P!==null?P:bldsFetch(this,false);}
  get holes(){const H=this.rgH;return H!==null?H:bldsFetch(this,true);}}
function decodeBuildings(){
  const cols=OSM.cols.map(c=>new THREE.Color(c));
  for(let si=0;si<OSM.b.length;si++){const r=OSM.b[si];const [hdm,mhdm,rs,lv,typ,flags,col,rcol,rhdm,ni,ring,holes,gid]=r;if(LM_SKIP.has(gid))continue;
    const P=decRing(ring);if(P.length<3)continue;const H=holes.map(decRing).filter(h=>h.length>=3);
    const area=Math.abs(polyArea(P));const [cx,cz]=polyCentroid(P);if(cx<MINX+2||cx>MAXX-2||cz<MINZ+2||cz>MAXZ-2)continue;
    if(inRiver(cx,cz)&&area<400)continue;
    OB.push(Object.assign(new BldsRec(si,P,H),{area,x:cx,z:cz,h:hdm/10,mh:mhdm/10,rs,lv,typ,hist:!!(flags&1),isRoof:!!(flags&2)||HALL_ROOFS.has(gid),col:col>=0?cols[col]:null,rcol:rcol>=0?cols[rcol]:null,rh:rhdm/10,name:ONAME(ni),gid}));}
}
// Stil, Höhe, Dach bestimmen
function planBuilding(b){const R=mulberry32((b.gid%100000)*7+13);const dist=districtAt(b.x,b.z);b.dist=dist;
  const central=dist==='Altstadt'||dist==='Innenstadt'||dist==='Neustadt'||dist==='Hauptbahnhof';
  // Höhe
  let h=b.h;const known=h>0;
  if(!known){let lv;
    if(b.typ===4)lv=1;else if(b.typ===6)lv=2;else if(b.typ===3)lv=2;else if(b.typ===2)lv=5;
    else if(b.area<30)lv=1;else if(b.area<75)lv=2;
    else{const base={Altstadt:[3,4],Innenstadt:[4,6],Neustadt:[4,5],Hauptbahnhof:[4,6],Oberstadt:[3,4],Zitadelle:[2,3],'Mainz-Kastel':[2,4],'Mainz-Kostheim':[2,3],'Wiesbaden-Innenstadt':[4,5],'Dichterviertel':[3,4],'Wiesbaden-Südost':[3,4],'Wiesbaden-Nordost':[3,4],'Wiesbaden-Westend':[4,5],'Wiesbaden-Rheingauviertel, Hollerborn':[4,5],'Wiesbaden-Biebrich':[2,4]}[dist]||[2,3];lv=base[0]+Math.floor(R()*(base[1]-base[0]+1));if(b.area>2500)lv=Math.max(lv,4);}
    if(b.lv>0)lv=b.lv;
    h=lv*3.15+(lv>1?0.9:0.2);b.lvGuess=lv;}
  b.H=Math.max(2.4,h);
  // Dach
  let rs=b.rs;const tall=b.H-b.mh>24;
  if(rs===-1){if(b.typ===3||b.typ===4||b.area>2200||tall||(b.typ===1&&R()<0.6)||(dist==='Neustadt'&&b.area>900&&R()<0.5))rs=0;
    else if(b.typ===2)rs=1;else rs=R()<0.25&&dist!=='Altstadt'?3:2;}
  if(rs===6)rs=0;b.roof=rs;
  // Stil / Fassade
  let style='plaster',tint;
  if(b.typ===2){style='rom';tint=new THREE.Color(0xd8b8a8);}
  else if(b.typ===3){style=R()<0.35?'brick':'modern';tint=new THREE.Color(pick(PAL.modern));}
  else if(b.typ===4){style='plaster';tint=new THREE.Color(pick(PAL.city));}
  else if(b.typ===1&&(rs===0||b.H>16)){style='modern';tint=new THREE.Color(pick(PAL.modern));}
  else if(b.typ===5||b.hist){style=(dist==='Neustadt'||dist==='Innenstadt'||b.hist)&&R()<0.65?'sandstone':'plaster';tint=new THREE.Color(style==='sandstone'?pick(PAL.sand):pick(PAL.alt));}
  else if(dist==='Altstadt'){style=b.area<170&&b.H<15&&R()<0.3?'fachwerk':'plaster';tint=new THREE.Color(style==='fachwerk'?pick(PAL.fach):pick(PAL.alt));}
  else if(dist==='Neustadt'){style=R()<0.55?'sandstone':'plaster';tint=new THREE.Color(style==='sandstone'?pick(PAL.sand):pick(PAL.city));}
  else if(dist==='Oberstadt'||dist.startsWith('Mainz-')){style=R()<0.12?'modern':'plaster';tint=new THREE.Color(style==='modern'?pick(PAL.modern):pick(PAL.city));}
  else{style=R()<0.15&&rs===0?'modern':'plaster';tint=new THREE.Color(style==='modern'?pick(PAL.modern):pick(PAL.city));}
  if(b.col&&style!=='rom'){tint=b.col.clone();if(style==='modern'&&tint.getHSL({}).l<0.25)tint.multiplyScalar(1.6);}
  b.style=style;b.tint=tint;
  const slate=b.typ===2||b.hist&&R()<0.6||R()<(dist==='Neustadt'?0.55:dist==='Innenstadt'?0.35:0.18);
  b.roofKind=b.typ===2&&R()<0.3?'copper':slate?'slate':'tile';b.roofTint=b.rcol?b.rcol.clone():new THREE.Color(b.roofKind==='slate'?pick(PAL.slate):b.roofKind==='copper'?0xffffff:pick(PAL.tile));
  b.gf=b.typ===2?0:(central&&b.typ!==6&&b.typ!==4?4.2:3.3);b.fh=b.typ===5?3.8:b.typ===2?4:3.15;
  b.u0=Math.floor(R()*4)*0.25;b.v0=Math.floor(R()*4)*0.25;b.us=Math.floor(R()*8)/8;b.seed=Math.floor(R()*1e6);b.central=central;
}
// Prüfen, ob eine Kante zur Straße zeigt
function faceStreet(mx,mz,nx,nz){for(const d of [3,6,9]){const i=idx(mx+nx*d,mz+nz*d);if(i<0)return false;if(hgG(i)>0)return false;if((mfG(i)&2))return true;}return false;}
function rectInfo(P){if(P.length!==4)return null;for(let i=0;i<4;i++){const A=P[i],B=P[(i+1)%4],C=P[(i+2)%4];const d1=[B[0]-A[0],B[1]-A[1]],d2=[C[0]-B[0],C[1]-B[1]];const l1=Math.hypot(...d1),l2=Math.hypot(...d2);if(Math.abs((d1[0]*d2[0]+d1[1]*d2[1])/(l1*l2))>0.1)return null;}
  let e0=[P[1][0]-P[0][0],P[1][1]-P[0][1]],e1=[P[2][0]-P[1][0],P[2][1]-P[1][1]];let w=Math.hypot(...e0),d=Math.hypot(...e1);let dir=e0;if(w<d){[w,d]=[d,w];dir=e1;}
  const L=Math.hypot(...dir);return {w,d,rot:Math.atan2(-dir[1]/L,dir[0]/L)};}
function addPolyBuildingGeo(b){
  const ch=chunkOf(b.x,b.z);const R=mulberry32(b.seed);const det=DET;
  const y0=b.mh,tint=b.tint,rt=b.roofTint,gt=tint.clone().lerp(WHITE_C,0.25);
  const G=cg(ch,b.style),SH=cg(ch,'shop'),TR=cg(ch,'trim');const RFk=cg(ch,b.roofKind);
  // Dachhöhe
  const T=2*b.area/Math.max(1,ringLen(b.poly)+b.holes.reduce((s,h)=>s+ringLen(h),0));
  let roofH=0,inset=0;const pitched=b.roof>0;
  if(b.roof===1||b.roof===2||b.roof===3){inset=Math.min(b.roof===3?6:5.5,T*0.5);const pitch=b.typ===2?1.1:b.style==='fachwerk'?1.1:0.82;roofH=b.rh>0?b.rh:Math.max(1.2,inset*pitch);if(b.H-y0-roofH<2.6)roofH=Math.max(0,(b.H-y0)*0.35);}
  else if(b.roof===5||b.roof===4||b.roof===7){roofH=b.rh>0?b.rh:Math.min(Math.sqrt(b.area)*0.6,(b.H-y0)*0.45);}
  const top=Math.max(y0+2.2,b.H-roofH);b.wallTop=top;
  const rings=[b.poly,...b.holes];
  const shopG=b.central&&y0<0.5&&b.typ!==2&&b.typ!==4&&b.typ!==6&&top-y0>b.gf+2;
  const floors=Math.max(1,(top-y0-(shopG?b.gf:0))/b.fh);
  for(const ring of rings){const n=ring.length;
    for(let i=0;i<n;i++){const A=ring[i],B=ring[(i+1)%n];const dx=B[0]-A[0],dz=B[1]-A[1];const L=Math.hypot(dx,dz);if(L<0.05)continue;const nx=dz/L,nz=-dx/L;
      const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;const ref=[mx-nx*3,(y0+top)/2,mz-nz*3];
      const nb=Math.max(1,Math.round(L/3.4));const street=faceStreet(mx,mz,nx,nz);
      let yb=y0;
      if(shopG&&street&&L>2.5){SH.quadOut4([A[0],y0,A[1]],[B[0],y0,B[1]],[B[0],y0+b.gf,B[1]],[A[0],y0+b.gf,A[1]],[b.us,0],[b.us+nb/8,0],[b.us+nb/8,1],[b.us,1],[shade(gt,0.7),shade(gt,0.7),gt,gt],ref);yb=y0+b.gf;}
      else if(shopG){yb=y0;}
      const fv=(top-yb)/b.fh/4;const u1=L<2.2?L/13.6:nb/4;
      G.quadOut4([A[0],yb,A[1]],[B[0],yb,B[1]],[B[0],top,B[1]],[A[0],top,A[1]],[b.u0,b.v0],[b.u0+u1,b.v0],[b.u0+u1,b.v0+fv],[b.u0,b.v0+fv],[shade(tint,yb<y0+0.5?0.8:0.88),shade(tint,yb<y0+0.5?0.8:0.88),tint,tint],ref);
      if(det>=1&&L>1.5&&b.style!=='rom'){const nn=[nx,nz];const P=(x,y,z)=>[x,y,z];
        if(street||det>=2){if(pitched)ledge(TR,P,A,B,nn,top-0.42,top,0.3,shade(tint,0.98));else ledge(TR,P,A,B,nn,top-0.1,top+0.8,0.18,shade(tint,0.85));
          if(yb>y0+0.5)ledge(TR,P,A,B,nn,yb-0.04,yb+0.2,0.12,shade(tint,0.9));if(y0<0.5)ledge(TR,P,A,B,nn,0,0.45,0.05,shade(tint,0.5));}
        else if(!pitched)ledge(TR,P,A,B,nn,top-0.1,top+0.7,0.16,shade(tint,0.85));}}}
  // ---------- Dach ----------
  const flatCap=(outer,holes,y,mat,col)=>{const faces=triangulate(outer,holes);const all=[...outer,...holes.flat()];const RF=cg(ch,mat);
    for(const f of faces){const a=all[f[0]],bb=all[f[1]],c=all[f[2]];if(!a||!bb||!c)continue;RF.triOut([a[0],y,a[1]],[bb[0],y,bb[1]],[c[0],y,c[1]],[a[0]/3,a[1]/3],[bb[0]/3,bb[1]/3],[c[0]/3,c[1]/3],col,[a[0],y-5,a[1]]);}};
  const slope=(RF,P,Q,ya,yb,col)=>{const n=P.length;for(let i=0;i<n;i++){const j=(i+1)%n;const A=P[i],B=P[j],C=Q[j],D=Q[i];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<0.05)continue;
    const sl=Math.hypot(Math.hypot(D[0]-A[0],D[1]-A[1]),yb-ya)/2.5;const ex=(B[0]-A[0])/L,ez=(B[1]-A[1])/L;const ua=0,ub=L/2.5,uc=((C[0]-A[0])*ex+(C[1]-A[1])*ez)/2.5,ud=((D[0]-A[0])*ex+(D[1]-A[1])*ez)/2.5;
    const nx=(B[1]-A[1])/L,nz=-(B[0]-A[0])/L;const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;
    RF.quadOut([A[0],ya,A[1]],[B[0],ya,B[1]],[C[0],yb,C[1]],[D[0],yb,D[1]],[ua,0],[ub,0],[uc,sl],[ud,sl],col,[mx-nx*4,ya-4,mz-nz*4]);}};
  let done=false;
  if((b.roof===1||b.roof===2||b.roof===3)&&roofH>0.5){
    const o=0.35;const eavesO=rings.map(r=>insetRing(r,-o));
    const s1=b.roof===3?Math.min(1.1,inset*0.3):inset;const rise1=b.roof===3?Math.min(roofH*0.75,2.9):roofH;
    let inner=rings.map(r=>insetRing(r,s1));let ok=inner.every((q,k)=>ringValid(rings[k],q));
    if(ok&&b.holes.length){for(const h of inner.slice(1))for(const p of h)if(!pip(p[0],p[1],inner[0])){ok=false;break;}}
    if(ok){const yE=top-o*0.6;
      eavesO.forEach((E,k)=>slope(RFk,E,inner[k],yE,top+rise1,rt));
      let capY=top+rise1;
      if(b.roof===3){const s2=Math.min(inset-s1,T*0.5-s1);if(s2>0.6){const inner2=inner.map(r=>insetRing(r,s2));if(inner2.every((q,k)=>ringValid(inner[k],q))){const rise2=Math.max(0.6,roofH-rise1);inner.forEach((Q,k)=>slope(RFk,Q,inner2[k],capY,capY+rise2,shade(rt,0.95)));inner=inner2;capY+=rise2;}}}
      // Traufbrett
      if(det>=1)eavesO.forEach((E,k)=>{const r=rings[k];for(let i=0;i<r.length;i++){const j=(i+1)%r.length;TR.quadOut([E[i][0],yE,E[i][1]],[E[j][0],yE,E[j][1]],[r[j][0],top,r[j][1]],[r[i][0],top,r[i][1]],[0,0],[1,0],[1,0.1],[0,0.1],shade(tint,0.45),[(r[i][0]+r[j][0])/2,top+20,(r[i][1]+r[j][1])/2]);}});
      const capA=Math.abs(polyArea(inner[0]));flatCap(inner[0],inner.slice(1),capY,capA>40?'flat':b.roofKind,capA>40?shade(rt,0.6):rt);
      // Schornsteine
      if(det>=1&&b.style!=='rom'&&b.style!=='modern'){const nc=Math.min(3,1+Math.floor(b.area/180));const BR=cg(ch,'brick');for(let k=0;k<nc;k++){const q=inner[0][Math.floor(R()*inner[0].length)];const qq=[lerp(q[0],b.x,0.25),lerp(q[1],b.z,0.25)];if(!pip(qq[0],qq[1],inner[0]))continue;BR.box(qq[0],capY-0.6,qq[1],0.62,1.4+R()*0.8,0.62,R()*3,WHITE,1.2);}}
      done=true;}}
  if(!done&&(b.roof===5||b.roof===4||b.roof===7)&&roofH>0.5&&!b.holes.length){const c=[b.x,b.z];const RF=b.roof===5?RFk:cg(ch,'copper');const col=b.roof===5?rt:WHITE;
    if(b.roof===5){const n=b.poly.length;for(let i=0;i<n;i++){const A=b.poly[i],B=b.poly[(i+1)%n];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);RF.triOut([A[0],top,A[1]],[B[0],top,B[1]],[c[0],top+roofH,c[1]],[0,0],[L/2.5,0],[L/5,Math.hypot(roofH,L/2)/2.5],col,[c[0],top,c[1]]);}}
    else{const steps=8;let prev=b.poly,py=top;for(let s=1;s<=steps;s++){const a=s/steps*Math.PI/2;const f=b.roof===7?Math.cos(a)*(1+0.35*Math.sin(a*2)):Math.cos(a);const y=top+Math.sin(a)*roofH;const cur=b.poly.map(p=>[lerp(c[0],p[0],f),lerp(c[1],p[1],f)]);slope(RF,prev,cur,py,y,col);prev=cur;py=y;}}
    done=true;}
  if(!done){// Flachdach mit Attika und Dachaufbauten
    flatCap(b.poly,b.holes,top,'flat',{r:0.62,g:0.6,b:0.58});
    if(det>=1&&b.area>60&&b.style!=='rom'){const n=Math.min(4,1+Math.floor(b.area/400));for(let k=0;k<n;k++){const q=[lerp(b.x,b.poly[Math.floor(R()*b.poly.length)][0],R()*0.6),lerp(b.z,b.poly[Math.floor(R()*b.poly.length)][1],R()*0.6)];if(!pip(q[0],q[1],b.poly))continue;TR.box(q[0],top,q[1],1.2+R()*2.5,0.9+R()*1.6,1.2+R()*2,R()*3,{r:0.72,g:0.73,b:0.74},1.5);}}}
}
function planOSMBuilding(b){planBuilding(b);if(b.isRoof){b.mh=Math.max(b.mh,Math.max(3.4,b.H-0.7));b.roof=0;}BUILDINGS.push(b);if(b.mh>=3&&b.H>b.mh)elevPoly([b.poly,...b.holes],b.mh,b.H);if(b.mh<3)rasterPoly(HG,[b.poly,...b.holes],Math.min(254,Math.max(3,Math.ceil(b.H))));}
function addOSMBuilding(b){
  const ri=(b.holes.length||b.mh>0.5||b.roof===2||b.roof===3||b.roof>=4)?null:rectInfo(b.poly);
  if(ri&&ri.d>=4&&ri.w>=4&&(b.roof===1||b.roof===0)){const floorsH=b.H-(b.roof===1?ri.d/2*0.95*0.5:0);const gf=b.gf;const nfl=Math.max(1,Math.round((floorsH-gf)/b.fh));const fh=Math.max(2.6,(floorsH-gf)/nfl);
    const rb={x:b.x,z:b.z,w:ri.w,d:ri.d,rot:ri.rot,floors:nfl,style:b.style==='rom'?'sandstone':b.style,tint:b.tint.getHex(),roofTint:b.roofTint.getHex(),roofKind:b.roofKind==='copper'?'slate':b.roofKind,roof:b.roof===1?'gable':'flat',pitch:b.style==='fachwerk'?1.15:0.95,gf,fh,u0:b.u0,v0:b.v0,us:b.us,seed:b.seed,shopFront:b.central&&b.typ!==6&&b.typ!==4,style0:b.style};
    if(rb.style==='brick')rb.style='modern';
    b.wallTop=gf+nfl*fh;addBuildingGeo(rb);b.rect=rb;}
  else addPolyBuildingGeo(b);
}
// ---------- Detailstufen: grob für alle Kacheln, fein nur in Spielernähe (wird nachgeladen) ----------
const CITY={chunks:new Map(),t:0};
function cityMats(){return {plaster:MAT.plaster,fachwerk:MAT.fachwerk,sandstone:MAT.sandstone,modern:MAT.modern,shop:MAT.shop,trim:MAT.trim,tile:MAT.tile,slate:MAT.slate,flat:MAT.flat,brick:MAT.brick,rom:MAT.rom,copper:MAT.copper};}
function cityChunks(){for(const b of BUILDINGS){const k=chunkKey(b.x,b.z);let c=CITY.chunks.get(k);if(!c){const [i,j]=k.split(',').map(Number);c={key:k,list:[],cx:MINX+(i+0.5)*CHUNK,cz:MINZ+(j+0.5)*CHUNK,low:null,high:null,kHi:'bld:hi:'+k,kLo:'bld:lo:'+k};CITY.chunks.set(k,c);}c.list.push(b);}}
// Chunk-Gruppe in Schritten bauen (Paket 40.5): erst die Gebäude in Portionen (Kostenmaß = Ringpunkte), dann je Schritt
// wenige Meshes. Synchron (buildChunkGroup) läuft derselbe Bauer in einem Zug → Ergebnis identisch.
function cityBuilder(c,det){return {c,det,list:c.list,i:0,target:new Map(),parts:null,pi:0,g:null};}
function cityStep(B,cost,meshes){
  if(B.list!==B.c.list){if(B.g)B.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});Object.assign(B,cityBuilder(B.c,B.det));}// Liste geändert (Feature hat ein Gebäude ersetzt) → neu
  if(B.i<B.list.length){DET=B.det;CHUNK_TARGET=B.target;bldsPinBegin();let w=0;
    try{while(B.i<B.list.length&&w<cost){const b=B.list[B.i++];w+=8+b.poly.length;addOSMBuilding(b);}}finally{DET=QS.detail;CHUNK_TARGET=CHUNKS;bldsPinEnd();}
    return false;}
  if(!B.parts){B.parts=[];for(const ch of B.target.values())for(const k in ch)if(!ch[k].empty)B.parts.push(k,ch[k]);B.target=null;B.g=new THREE.Group();}
  const mats=cityMats();
  for(let n=0;B.pi<B.parts.length&&n<meshes;n++){const k=B.parts[B.pi],G=B.parts[B.pi+1];B.parts[B.pi+1]=null;B.pi+=2;
    const m=new THREE.Mesh(G.geo(),mats[k]);if(LOWMEM)dropCPU(m.geometry);m.castShadow=true;m.receiveShadow=true;B.g.add(m);}
  return B.pi>=B.parts.length;}
function buildChunkGroup(c,det){const B=cityBuilder(c,det);while(!cityStep(B,Infinity,Infinity)){}scene.add(B.g);return B.g;}
function dropCPU(geo){geo.computeBoundingSphere();geo.computeBoundingBox();const f=function(){this.array=new this.array.constructor(0);};for(const k in geo.attributes)geo.attributes[k].onUpload(f);if(geo.index)geo.index.onUpload(f);}
function disposeGroup(g){scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
const CITY_RH=()=>QS.lowLOD?280:LOWMEM?360:QS.detail>=2?620:480;
const CITY_LOW_R=QS.lowLOD?1300:LOWMEM?1700:3200;
// Kostenmaß je Bauschritt (Ringpunkte + 8 je Gebäude): Ziel < 10 ms je Paket auf dem Handy
const CITY_COST={hi:400,lo:1200};
// Im Spiel: Chunk-Bau als Pakete bld:hi:/bld:lo: über das Bild-Budget (FRAMEB); fertig erst nach dem letzten Schritt.
// Grob +150 m: am selben Chunk zuerst die sichtbare feine Stufe (die grobe liegt darunter unsichtbar bereit).
function cityQueue(c,hi){const key=hi?c.kHi:c.kLo;if(fbHas(key))return;const B=cityBuilder(c,hi?QS.detail:-1),cost=hi?CITY_COST.hi:CITY_COST.lo;
  fbJob(key,()=>{const t=performance.now();
    if(hi?c.high:c.low)return true;// inzwischen synchron gebaut
    const done=bldsPacket(()=>cityStep(B,cost,1));
    if(done){scene.add(B.g);if(hi){c.high=B.g;if(c.low)c.low.visible=false;}else{c.low=B.g;if(c.high)B.g.visible=false;}BLDS.city.built[hi?'hi':'lo']++;}
    bldsCityTime(key,hi,performance.now()-t);return done;},{x:c.cx,z:c.cz,bias:hi?0:150});}
function cityCancel(c,hi){const key=hi?c.kHi:c.kLo;if(fbHas(key)){fbCancel(key);BLDS.city.cancelled++;}}
// force (Boot, Schnellreise, S-Bahn) und Sprung (> 250 m in diesem Bild, FRAMEB.jump): nahe Chunks sofort synchron wie bisher
function updateCityLOD(px,pz,maxBuild=1,force=false,pts=null){pts=pts||[[px,pz]];const jump=!force&&FRAMEB.jump;
  if(jump){for(const p of FRAMEB.pts)pts.push([p.x,p.z]);maxBuild=99;}
  CITY.t-=1;if(CITY.t>0&&!force&&!jump)return;CITY.t=8;const RH=CITY_RH(),sync=force||jump;let built=0;
  const list=[];for(const c of CITY.chunks.values()){let d=1e9;for(const p of pts)d=Math.min(d,Math.hypot(c.cx-p[0],c.cz-p[1]));list.push([d,c]);}list.sort((a,b)=>a[0]-b[0]);
  let lowBuilt=0;for(const [d,c] of list){
    if(d<CITY_LOW_R&&!c.low){if(force&&lowBuilt<2){cityCancel(c,false);c.low=buildChunkGroup(c,-1);if(c.high)c.low.visible=false;lowBuilt++;BLDS.city.sync.lo++;}else cityQueue(c,false);}
    else if(d>CITY_LOW_R+900){cityCancel(c,false);if(c.low){disposeGroup(c.low);c.low=null;}}
    if(d<RH&&!c.high){if(sync&&built<maxBuild){cityCancel(c,true);c.high=buildChunkGroup(c,QS.detail);if(c.low)c.low.visible=false;built++;BLDS.city.sync.hi++;}else cityQueue(c,true);}
    else if(d>RH+260){cityCancel(c,true);if(c.high){disposeGroup(c.high);c.high=null;if(c.low)c.low.visible=true;}}}}
// Fassadenpunkt eines Gebäudes zur nächsten Straße (für Schilder, Türen)
function facadeSpot(x,z,maxD=40){let best=null;for(const b of BUILDINGS){if(Math.abs(b.x-x)>maxD+60||Math.abs(b.z-z)>maxD+60)continue;const P=b.poly;
  for(let i=0;i<P.length;i++){const A=P[i],B=P[(i+1)%P.length];const dx=B[0]-A[0],dz=B[1]-A[1],L=Math.hypot(dx,dz);if(L<4)continue;const nx=dz/L,nz=-dx/L;const sd=segDist(x,z,A[0],A[1],B[0],B[1]);if(sd.d>maxD)continue;
    const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;const st=faceStreet(mx,mz,nx,nz);const sc=sd.d+(st?0:25);if(!best||sc<best.sc)best={sc,x:mx,z:mz,nx,nz,face:Math.atan2(nx,nz),len:L,b};}}
  return best;}
