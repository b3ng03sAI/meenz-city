// ===================== Staatstheater Mainz (Großes Haus am Gutenbergplatz) =====================
// Georg Moller 1829–33: erstmals zeigt die Fassade das Halbrund des Zuschauerraums nach außen. Heute (nach 1910, 1951,
// 1998–2001): flach gekrümmte Schauseite aus rotem Mainsandstein mit 5 Achsen – Rustika-Arkaden im Erdgeschoss,
// hohe Rundbogenfenster mit Balkonen dazwischen Lisenen, Gebälk mit Konsolen, Balustrade –, zwei Eckpavillons mit
// Reliefs und Zeltdach-Türmchen, darüber die gläserne Rotunde („Glashaus“). Recherche: .claude/plans/2026-10-03-staatstheater.md
// Eigenes prozedurales Modell (AGPL), ersetzt die sieben OSM-Teile (gid 23655731) – gebaut im Wrapper um buildLandmarks(),
// damit Kollision (HG) und Übersichtskarte (SOLIDS) es mitnehmen. Ein Mesh pro Material; „niedrig“ baut eine schlichtere Stufe.
const THEAT={gid:23655731,built:false,low:false,meshes:[],draws:0,
  C:[-199.7,-64.0],F:[0.4202,0.9074],U:[0.9074,-0.4202],R:27,TH:0,osm:null,bbox:null,stairs:null,nParts:0};
LM_SKIP.add(THEAT.gid);

// ---------- Rahmen aus den OSM-Teilen: Rotunden-Mitte und Richtung zu den Eck-Türmen (= zum Gutenbergplatz) ----------
function theatFrame(){const parts=[];
  for(const r of OSM.b){if(r[12]!==THEAT.gid)continue;const P=decRing(r[10]);if(P.length<3)continue;parts.push({P,a:Math.abs(polyArea(P)),c:polyCentroid(P),n:P.length,rs:r[2]});}
  THEAT.nParts=parts.length;if(!parts.length)return;
  const bb=[1e9,1e9,-1e9,-1e9];for(const p of parts)for(const q of p.P){bb[0]=Math.min(bb[0],q[0]);bb[1]=Math.min(bb[1],q[1]);bb[2]=Math.max(bb[2],q[0]);bb[3]=Math.max(bb[3],q[1]);}
  THEAT.osm=bb;
  // Rotunde: das rundeste Teil (viele Punkte, Fläche 500–1200 m²); Türme: die zwei kleinen Teile mit Zeltdach
  const rot=parts.filter(p=>p.n>=14&&p.a>500&&p.a<1200).sort((a,b)=>b.n-a.n)[0];const tw=parts.filter(p=>p.rs===5&&p.a<120);
  if(rot&&tw.length===2){const mx=(tw[0].c[0]+tw[1].c[0])/2,mz=(tw[0].c[1]+tw[1].c[1])/2;const dx=mx-rot.c[0],dz=mz-rot.c[1],L=Math.hypot(dx,dz);
    if(L>10&&L<40){THEAT.C=[rot.c[0],rot.c[1]];THEAT.F=[dx/L,dz/L];THEAT.U=[dz/L,-dx/L];}}}

// ---------- Farben, Texturen, Materialien ----------
const THEAT_COLS=new Map();
function theatLin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function theatC(h){let c=THEAT_COLS.get(h);if(!c){c={r:theatLin((h>>16)&255),g:theatLin((h>>8)&255),b:theatLin(h&255)};THEAT_COLS.set(h,c);}return c;}
// Kachelgrößen in Metern (u entlang der Wand, v nach oben)
const THEAT_TILE={ashlar:[2.4,2.4],rustic:[3.2,3.2],plaster:[3.6,4.2]};
function theatTex(k,R){const low=THEAT.low,S=low?128:256;const rgb=(r,g,b)=>`rgb(${r|0},${g|0},${b|0})`;
  const D={
    // glattes Quaderwerk: 4 Lagen à 0,6 m, Blöcke 1,2 m, versetzt; jeder Block leicht anders getönt
    ashlar:[S,S,g=>{g.fillStyle='#bf8a77';g.fillRect(0,0,S,S);const ch=S/4,bw=S/2;
      for(let j=0;j<4;j++)for(let i=-1;i<2;i++){const x=i*bw+(j%2?bw/2:0),f=0.9+R()*0.16,h=R()*10-5;g.fillStyle=rgb(184*f+h,112*f,94*f-h*0.5);g.fillRect(x+1,j*ch+1,bw-2,ch-2);
        for(let n=0;n<(low?6:18);n++){g.fillStyle=`rgba(${R()<0.5?'90,40,30':'230,190,170'},${0.05+R()*0.07})`;g.fillRect(x+R()*bw,j*ch+R()*ch,1+R()*4,1+R()*2);}}}],
    // Rustika: grobe Bossen mit Fase (Licht oben/links, Schatten unten/rechts), 0,8-m-Lagen
    rustic:[S,S,g=>{g.fillStyle='#4e281f';g.fillRect(0,0,S,S);const ch=S/4,b=Math.max(3,S/22);
      for(let j=0;j<4;j++){const ws=R()<0.5?[0.5,0.5]:[0.36,0.3,0.34];let x0=R()*S;for(const wf of ws){const bw=wf*S,f=0.84+R()*0.22,y=j*ch+2,h=ch-4;
        for(const sh of [0,-S]){const x=x0+sh+2,w=bw-4;g.fillStyle=rgb(146*f,80*f,64*f);g.fillRect(x,y,w,h);g.fillStyle='rgba(255,210,185,0.2)';g.fillRect(x,y,w,b);g.fillRect(x,y,b,h);
          g.fillStyle='rgba(30,10,6,0.4)';g.fillRect(x,y+h-b,w,b);g.fillRect(x+w-b,y,b,h);}
        const R2=mulberry32((j*7+x0)|0);for(let n=0;n<(low?8:30);n++){const px=x0+b+R2()*(bw-2*b),py=y+b+R2()*(h-2*b);g.fillStyle=`rgba(${R2()<0.5?'60,25,18':'215,165,140'},${0.08+R2()*0.1})`;
          for(const sh of [0,-S]){g.beginPath();g.arc(px+sh,py,1+R2()*3,0,TAU);g.fill();}}
        x0+=bw;}}}],
    // rosa Putz mit Sandstein-Fensterrahmen (eine Fensterachse 3,6 × 4,2 m)
    plaster:[S/2,S*0.6,(g,w,h)=>{g.fillStyle='#dcb2a2';g.fillRect(0,0,w,h);for(let n=0;n<(low?20:60);n++){g.fillStyle=`rgba(${R()<0.5?'150,100,90':'250,225,215'},0.06)`;g.fillRect(R()*w,R()*h,3,3);}
      const fx=w*0.33,fw=w*0.34,fy=h*0.2,fh=h*0.55;g.fillStyle='#b27565';g.fillRect(fx-3,fy-4,fw+6,fh+7);g.fillStyle='#2f3439';g.fillRect(fx,fy,fw,fh);
      g.fillStyle='#e8e2da';g.fillRect(fx+fw/2-1,fy,2,fh);g.fillRect(fx,fy+fh*0.3,fw,2);g.fillStyle='#a56a5a';g.fillRect(fx-5,fy+fh+3,fw+10,3);}],
    plasterE:[32,40,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);g.fillStyle='#ffd7a0';g.fillRect(w*0.33,h*0.2,w*0.34,h*0.55);}],
    // Reliefs der Eckpavillons (eigene Gestaltung): links Komödie, rechts Tragödie – Maske mit zwei gelagerten Gewandfiguren
    relief:[low?512:1024,low?128:256,(g,w,h)=>{const H=h;g.fillStyle='#b57866';g.fillRect(0,0,w,h);
      const shape=(f,dx,dy,col)=>{g.save();g.translate(dx,dy);g.fillStyle=col;f();g.restore();};
      const relief=(f)=>{shape(f,H*0.025,H*0.03,'rgba(70,30,22,0.55)');shape(f,-H*0.015,-H*0.015,'rgba(245,205,185,0.5)');shape(f,0,0,'#c48a76');};
      for(let side=0;side<2;side++){const ox=side*w/2,cx=ox+w/4,cy=H*0.5;
        g.strokeStyle='rgba(80,35,25,0.6)';g.lineWidth=H*0.03;g.strokeRect(ox+H*0.05,H*0.05,w/2-H*0.1,H*0.9);
        // gelagerte Figuren links/rechts der Maske
        for(const s of [-1,1]){relief(()=>{g.beginPath();g.ellipse(cx+s*H*0.62,cy+H*0.16,H*0.36,H*0.12,s*0.25,0,TAU);g.fill();g.beginPath();g.arc(cx+s*H*0.9,cy-H*0.06,H*0.08,0,TAU);g.fill();
          g.beginPath();g.moveTo(cx+s*H*0.86,cy-H*0.02);g.quadraticCurveTo(cx+s*H*0.55,cy-H*0.2,cx+s*H*0.4,cy-H*0.02);g.lineTo(cx+s*H*0.45,cy+H*0.08);g.fill();});}
        relief(()=>{g.beginPath();g.ellipse(cx,cy-H*0.02,H*0.17,H*0.23,0,0,TAU);g.fill();});
        // Gesicht: Augen, Mund lachend (Komödie) bzw. klagend (Tragödie)
        g.fillStyle='rgba(60,25,18,0.5)';for(const s of [-1,1]){g.beginPath();g.ellipse(cx+s*H*0.07,cy-H*0.08,H*0.035,H*0.022,side?s*0.4:-s*0.3,0,TAU);g.fill();}
        g.strokeStyle='rgba(60,25,18,0.5)';g.lineWidth=H*0.018;g.beginPath();if(side===0)g.arc(cx,cy+H*0.02,H*0.08,0.15*Math.PI,0.85*Math.PI);else g.arc(cx,cy+H*0.15,H*0.08,1.15*Math.PI,1.85*Math.PI);g.stroke();
        // Lorbeer-Bogen über der Maske
        g.strokeStyle='rgba(120,60,45,0.8)';g.lineWidth=H*0.018;for(let i=0;i<9;i++){const a=Math.PI*(1.15+i*0.09);g.beginPath();g.ellipse(cx+Math.cos(a)*H*0.3,cy+Math.sin(a)*H*0.3,H*0.035,H*0.014,a+1.2,0,TAU);g.stroke();}}}],
    // Schrift: oben das Banner am Balkongesims, unten die Schaukasten-Schilder
    sign:[low?512:1024,low?64:128,(g,w,h)=>{g.fillStyle='#f2ede4';g.fillRect(0,0,w,h/2);g.fillStyle='#2b2523';g.font=`700 ${Math.round(h*0.36)}px "Barlow Condensed", Arial Narrow, sans-serif`;g.textAlign='center';g.textBaseline='middle';
      g.fillText('STAATSTHEATER  MAINZ',w/2,h*0.26);g.fillStyle='#8e1b1b';g.fillRect(0,h*0.02,w,h*0.025);g.fillRect(0,h*0.455,w,h*0.025);
      g.fillStyle='#262426';g.fillRect(0,h/2,w,h/2);g.fillStyle='#f4f1ea';g.font=`600 ${Math.round(h*0.3)}px "Barlow Condensed", Arial Narrow, sans-serif`;g.fillText('Staatstheater Mainz',w/2-h*0.25,h*0.76);
      const sx=w/2+h*1.75,sy=h*0.75,r=h*0.13;g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.45:r;g.lineTo(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr);}g.closePath();g.fill();}],
  }[k];
  const t=canvasTex(D[0],D[1],D[2],k!=='relief'&&k!=='sign');return freeAfterUpload(t);}
const THEAT_MATS={};
function theatMat(k){if(THEAT_MATS[k])return THEAT_MATS[k];const R=mulberry32(7331+k.length*17);let m;
  if(k==='ashlar'||k==='rustic'){const t=theatTex(k,R);m=stdMat({map:t,vertexColors:true,roughness:0.9,emissiveMap:t,emissive:0xffd2b0,emissiveIntensity:0});nightMat(m,0.075);}// Anstrahlung abends
  else if(k==='plaster'){m=stdMat({map:theatTex('plaster',R),vertexColors:true,roughness:0.92,emissiveMap:theatTex('plasterE',R),emissive:0xffffff,emissiveIntensity:0});nightMat(m,0.8);}
  else if(k==='glass'){m=stdMat({vertexColors:true,roughness:0.1,metalness:0.65,emissive:0xffc68a,emissiveIntensity:0});nightMat(m,0.32);}
  else if(k==='metal')m=stdMat({vertexColors:true,roughness:0.5,metalness:0.45});
  else if(k==='relief'){const t=theatTex('relief',R);m=stdMat({map:t,roughness:0.9,emissiveMap:t,emissive:0xffd2b0,emissiveIntensity:0});nightMat(m,0.075);}
  else m=stdMat({map:theatTex('sign',R),roughness:0.75});
  return THEAT_MATS[k]=m;}

// ---------- Baukasten (lokal: u seitlich, v nach vorn zum Platz, Ursprung = Rotunden-Mitte) ----------
const THEAT_GB={};
function theatG(k){return THEAT_GB[k]||(THEAT_GB[k]=new GB());}
function theatW(u,y,v){const C=THEAT.C,U=THEAT.U,F=THEAT.F;return [C[0]+u*U[0]+v*F[0],y,C[1]+u*U[1]+v*F[1]];}
function theatP(r,th,y){return theatW(r*Math.sin(th),y,r*Math.cos(th));}
function theatTileOf(k){return THEAT_TILE[k]||[3,3];}
// Quader mit Mitte (cu,cv), Achse t=(tu,tv) (Breite w entlang t, Tiefe d quer), y0..y0+h; yb: Bezug der Textur-Höhe
function theatBox(k,cu,cv,tu,tv,w,d,y0,h,col,o={}){const [su,sv]=o.tile||theatTileOf(k),yb=o.yb??0,nu=-tv,nv=tu,c=theatC(col??0xffffff),g=theatG(k);
  const cs=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[cu+tu*a*w/2+nu*b*d/2,cv+tv*a*w/2+nv*b*d/2]);const ref=theatW(cu,y0+h/2,cv),y1=y0+h;
  for(let i=0;i<4;i++){const A=cs[i],B=cs[(i+1)%4];const L=Math.hypot(B[0]-A[0],B[1]-A[1])/su;
    g.quadOut(theatW(A[0],y0,A[1]),theatW(B[0],y0,B[1]),theatW(B[0],y1,B[1]),theatW(A[0],y1,A[1]),[0,(y0-yb)/sv],[L,(y0-yb)/sv],[L,(y1-yb)/sv],[0,(y1-yb)/sv],c,ref);}
  if(o.top!==false){const tk=o.topK||k,tc=o.topCol!==undefined?theatC(o.topCol):c;theatG(tk).quadOut(...cs.map(p=>theatW(p[0],y1,p[1])),[0,0],[w/su,0],[w/su,d/su],[0,d/su],tc,theatW(cu,y0,cv));}
  if(o.bot)g.quadOut(...cs.map(p=>theatW(p[0],y0,p[1])),[0,0],[w/su,0],[w/su,d/su],[0,d/su],c,theatW(cu,y1,cv));}
// Quader tangential an den Bogen bei Winkel th, Mitte auf Radius r
function theatBoxT(k,r,th,w,d,y0,h,col,o){theatBox(k,r*Math.sin(th),r*Math.cos(th),Math.cos(th),-Math.sin(th),w,d,y0,h,col,o);}
// Ringstück zwischen r0 und r1, y0..y1, Winkel a..b: Vorderseite (r1), Ober-/Unterseite, optional Rückseite/Enden
function theatRing(k,r0,r1,y0,y1,a,b,n,col,o={}){const g=theatG(k),c=theatC(col??0xffffff),[su,sv]=o.tile||theatTileOf(k),yb=o.yb??0,ym=(y0+y1)/2;
  for(let i=0;i<n;i++){const ta=a+(b-a)*i/n,tb=a+(b-a)*(i+1)/n,tm=(ta+tb)/2,ua=r1*(ta-a)/su,ub=r1*(tb-a)/su;
    if(o.front!==false)g.quadOut(theatP(r1,ta,y0),theatP(r1,tb,y0),theatP(r1,tb,y1),theatP(r1,ta,y1),[ua,(y0-yb)/sv],[ub,(y0-yb)/sv],[ub,(y1-yb)/sv],[ua,(y1-yb)/sv],c,theatP(0,0,ym));
    if(o.back)g.quadOut(theatP(r0,ta,y0),theatP(r0,tb,y0),theatP(r0,tb,y1),theatP(r0,ta,y1),[ua,(y0-yb)/sv],[ub,(y0-yb)/sv],[ub,(y1-yb)/sv],[ua,(y1-yb)/sv],c,theatP(r1+5,tm,ym));
    if(r1-r0>0.01){const d=(r1-r0)/su;
      if(o.top!==false)g.quadOut(theatP(r0,ta,y1),theatP(r1,ta,y1),theatP(r1,tb,y1),theatP(r0,tb,y1),[ua,0],[ua,d],[ub,d],[ub,0],c,theatP((r0+r1)/2,tm,y1-1));
      if(o.bot!==false)g.quadOut(theatP(r0,ta,y0),theatP(r1,ta,y0),theatP(r1,tb,y0),theatP(r0,tb,y0),[ua,0],[ua,d],[ub,d],[ub,0],c,theatP((r0+r1)/2,tm,y0+1));}}
  if(o.ends)for(const [t,s] of [[a,-1],[b,1]])g.quadOut(theatP(r0,t,y0),theatP(r1,t,y0),theatP(r1,t,y1),theatP(r0,t,y1),[0,0],[(r1-r0)/su,0],[(r1-r0)/su,(y1-y0)/sv],[0,(y1-y0)/sv],c,theatP((r0+r1)/2,t-s*0.05,ym));}
// gekrümmte Wand (Radius r, Winkel a..b, Höhe y0..y1) mit einer Rundbogen-Öffnung um th0: halbe Breite hw (m),
// Brüstung yB, Kämpfer yS, Laibungstiefe dep; Rückwand (Tür/Glas) im Material kb
function theatArchWall(k,kb,r,a,b,th0,hw,yB,yS,y0,y1,dep,n,col,colB,o={}){const g=theatG(k),c=theatC(col),cb=theatC(colB),[su,sv]=theatTileOf(k),rb=r-dep,ym=(y0+y1)/2;
  const U=t=>r*(t-(o.uRef??a))/su,V=y=>y/sv,ref=theatP(0,0,ym);const ea=th0-hw/r,eb=th0+hw/r;
  const wall=(ta,tb,ya,yb2,yt)=>g.quadOut(theatP(r,ta,ya),theatP(r,tb,yb2),theatP(r,tb,yt),theatP(r,ta,yt),[U(ta),V(ya)],[U(tb),V(yb2)],[U(tb),V(yt)],[U(ta),V(yt)],c,ref);
  const segs=(t0,t1)=>{const m=Math.max(1,Math.ceil(Math.abs(t1-t0)/0.035));for(let i=0;i<m;i++)wall(t0+(t1-t0)*i/m,t0+(t1-t0)*(i+1)/m,y0,y0,y1);};
  segs(a,ea);segs(eb,b);
  const top=s=>yS+Math.sqrt(Math.max(0,hw*hw-s*s));
  for(let i=0;i<n;i++){const sa=-hw+2*hw*i/n,sb=-hw+2*hw*(i+1)/n,ta=th0+sa/r,tb=th0+sb/r,tA=th0+sa/rb,tB=th0+sb/rb,ya=top(sa),yb2=top(sb);
    wall(ta,tb,ya,yb2,y1);if(yB>y0+0.01)wall(ta,tb,y0,y0,yB);
    // Bogenlaibung (Unterseite), Rückwand, Brüstung/Boden
    g.quadOut(theatP(r,ta,ya),theatP(r,tb,yb2),theatP(rb,tB,yb2),theatP(rb,tA,ya),[U(ta),0],[U(tb),0],[U(tb),dep/sv],[U(ta),dep/sv],c,theatP(r-dep/2,(ta+tb)/2,yS+hw+3));
    theatG(kb).quadOut(theatP(rb,tA,yB),theatP(rb,tB,yB),theatP(rb,tB,yb2),theatP(rb,tA,ya),[0,0],[1,0],[1,1],[0,1],cb,theatP(0,0,(yB+yS)/2));
    g.quadOut(theatP(r,ta,yB),theatP(r,tb,yB),theatP(rb,tB,yB),theatP(rb,tA,yB),[U(ta),0],[U(tb),0],[U(tb),dep/sv],[U(ta),dep/sv],c,theatP(r-dep/2,(ta+tb)/2,yB-2));}
  for(const s of [-1,1]){const t=th0+s*hw/r,tb2=th0+s*hw/rb;// Gewände (seitliche Laibungen)
    g.quadOut(theatP(r,t,yB),theatP(rb,tb2,yB),theatP(rb,tb2,yS),theatP(r,t,yS),[0,V(yB)],[dep/su,V(yB)],[dep/su,V(yS)],[0,V(yS)],c,theatP(r-dep/2,th0+s*(hw+1)/(r-dep/2),(yB+yS)/2));}}
// Satteldach (First entlang u) über Rechteck, Giebel im Material kg
function theatGable(k,kg,u0,u1,v0,v1,y,rise,col,colG){const g=theatG(k),c=theatC(col),cg=theatC(colG),vm=(v0+v1)/2,ref=theatW((u0+u1)/2,y,vm),L=(u1-u0)/3,sl=Math.hypot(rise,(v1-v0)/2)/3;
  g.quadOut(theatW(u0,y,v0),theatW(u1,y,v0),theatW(u1,y+rise,vm),theatW(u0,y+rise,vm),[0,0],[L,0],[L,sl],[0,sl],c,ref);
  g.quadOut(theatW(u0,y,v1),theatW(u1,y,v1),theatW(u1,y+rise,vm),theatW(u0,y+rise,vm),[0,0],[L,0],[L,sl],[0,sl],c,ref);
  const [su,sv]=theatTileOf(kg);for(const u of [u0,u1])theatG(kg).triOut(theatW(u,y,v0),theatW(u,y,v1),theatW(u,y+rise,vm),[0,(y-5)/sv],[(v1-v0)/su,(y-5)/sv],[(v1-v0)/2/su,(y+rise-5)/sv],cg,ref);}
// Mansard-/Zeltdach über Rechteck: Traufe y, oben um inset eingezogen (inset >= halbe Breite → Spitze)
function theatHip(k,u0,u1,v0,v1,y,rise,inset,col){const g=theatG(k),c=theatC(col),cu=(u0+u1)/2,cv=(v0+v1)/2,iu=Math.max(0,(u1-u0)/2-inset),iv=Math.max(0,(v1-v0)/2-inset),ref=theatW(cu,y,cv);
  const lo=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(p=>theatW(p[0],y,p[1])),hi=[[cu-iu,cv-iv],[cu+iu,cv-iv],[cu+iu,cv+iv],[cu-iu,cv+iv]].map(p=>theatW(p[0],y+rise,p[1]));
  for(let i=0;i<4;i++){const j=(i+1)%4;const L=Math.hypot(lo[j][0]-lo[i][0],lo[j][2]-lo[i][2])/3;if(iu<0.01&&iv<0.01)g.triOut(lo[i],lo[j],hi[0],[0,0],[L,0],[L/2,1],c,ref);else g.quadOut(lo[i],lo[j],hi[j],hi[i],[0,0],[L,0],[L,1],[0,1],c,ref);}
  if(iu>0.01&&iv>0.01)g.quadOut(...hi,[0,0],[1,0],[1,1],[0,1],c,theatW(cu,y,cv));}
// senkrechte Fläche mit Blick nach (nu,nv) – Schrift, Relief; uv-Bereich [u0,u1]×[v0,v1]
function theatPlane(k,cu,cv,nu,nv,w,y0,h,uvr,col){const tu=nv,tv=-nu;// rechts für einen Betrachter, der auf die Fläche schaut
  const a=theatW(cu-tu*w/2,y0,cv-tv*w/2),b=theatW(cu+tu*w/2,y0,cv+tv*w/2),c2=theatW(cu+tu*w/2,y0+h,cv+tv*w/2),d=theatW(cu-tu*w/2,y0+h,cv-tv*w/2);
  theatG(k).quadOut(a,b,c2,d,[uvr[0],uvr[2]],[uvr[1],uvr[2]],[uvr[1],uvr[3]],[uvr[0],uvr[3]],theatC(col??0xffffff),theatW(cu-nu,y0+h/2,cv-nv));}

// ---------- Maße (aus Fotos/OSM, s. Plan) ----------
const THEAT_M={stepN:6,stepH:0.17,stepD:0.36,uStairs:20.4,uPav0:11.3,uPav1:19.7,vPavB:16.7,uSide:19.7,
  yRus:7.0,yBand:7.45,yEnt:15.6,yFri:16.2,yCor:16.9,yRoof:17.4,yBal:19.0,yTow:21.4,yApex:24.4,drumR:15.9,drumTop:27.7,
  rearU:30,rearV0:-36,rearH:20,stageU:12,stageV0:-27.2,stageV1:-11.6,stageH:33,stageTop:38};
function theatVf(u){const M=THEAT_M,R=THEAT.R,a=Math.abs(u);return a<=M.uPav0?Math.sqrt(R*R-u*u):Math.sqrt(R*R-M.uPav0*M.uPav0);}// Fassadenlinie (Front) je u

// ---------- Aufbau ----------
function theatBuild(){THEAT.low=!!QS.lowLOD;theatFrame();const low=THEAT.low,M=THEAT_M,R=THEAT.R,TH=Math.asin(M.uPav0/R);THEAT.TH=TH;
  const nb=5,bay=2*TH/nb,thC=i=>-TH+bay*(i+0.5),thE=i=>-TH+bay*i,Y0=M.stepN*M.stepH,vP=theatVf(M.uPav0);
  const SAND=0xffffff,SAND2=0xf4e4dc,LIGHT=0xffeee6,DARK=0xe2cfc6;
  // --- Erdgeschoss: Rustika mit 5 offenen Rundbogen-Arkaden, Türen zurückgesetzt ---
  for(let i=0;i<nb;i++){theatArchWall('rustic','glass',R,thE(i),thE(i+1),thC(i),1.35,Y0,4.6,0,M.yRus,1.6,low?6:10,SAND,0x2e2620,{uRef:-TH});
    if(!low){// Keilsteinring (Archivolte) leicht vorstehend, Schlussstein als Konsole
      const n=10,hw=1.35,top=s=>4.6+Math.sqrt(Math.max(0,hw*hw-s*s));
      for(let j=0;j<n;j++){const sa=-hw-0.05+(2*hw+0.1)*j/n,sb=-hw-0.05+(2*hw+0.1)*(j+1)/n,ta=thC(i)+sa/R,tb=thC(i)+sb/R,ya=top(Math.min(hw,Math.abs(sa)))+0.02,yb=top(Math.min(hw,Math.abs(sb)))+0.02;
        theatG('rustic').quadOut(theatP(R+0.1,ta,ya),theatP(R+0.1,tb,yb),theatP(R+0.1,tb,yb+0.75),theatP(R+0.1,ta,ya+0.75),[0,0],[0.25,0],[0.25,0.25],[0,0.25],theatC(DARK),theatP(0,0,ya));
        theatG('rustic').quadOut(theatP(R,ta,ya),theatP(R,tb,yb),theatP(R+0.1,tb,yb),theatP(R+0.1,ta,ya),[0,0],[0.25,0],[0.25,0.03],[0,0.03],theatC(DARK),theatP(R,thC(i),ya+3));}
      theatBoxT('ashlar',R+0.25,thC(i),0.62,0.5,4.6+1.35-0.15,M.yRus-(4.6+1.35-0.15),LIGHT);}}
  // Konsolen über den Pfeilern tragen das Balkongesims
  for(let i=1;i<nb;i++)theatBoxT('ashlar',R+0.22,thE(i),low?0.7:0.55,0.45,6.1,0.9,LIGHT,{});
  if(!low)for(let i=0;i<=nb;i++)for(const s of [-1,1]){if((i===0&&s<0)||(i===nb&&s>0))continue;theatBoxT('ashlar',R+0.2,thE(i)+s*0.06,0.32,0.4,6.3,0.7,LIGHT);}
  // Balkongesims + Fensterbalkone
  theatRing('ashlar',R-0.2,R+0.55,M.yRus,M.yBand,-TH,TH,low?12:30,LIGHT);
  // --- Obergeschoss: Quaderwerk mit 5 hohen Rundbogenfenstern, Lisenen dazwischen ---
  const rU=R-0.1;
  for(let i=0;i<nb;i++){theatArchWall('ashlar','glass',rU,thE(i),thE(i+1),thC(i),1.2,7.9,13.4,M.yBand,M.yEnt,0.6,low?6:10,SAND,0x46525a,{uRef:-TH});
    theatBoxT('ashlar',R+0.2,thC(i),2.9,0.6,M.yBand,0.16,LIGHT);// Balkonplatte
    if(!low){theatBoxT('metal',R+0.46,thC(i),2.8,0.06,8.45,0.07,0x2a2b2d);theatBoxT('metal',R+0.46,thC(i),2.8,0.05,7.7,0.05,0x2a2b2d);
      for(let j=0;j<=13;j++)theatBoxT('metal',R+0.46,thC(i)+(-1.35+2.7*j/13)/(R+0.46),0.035,0.035,7.62,0.85,0x2a2b2d,{top:false});
      // Fensterkreuz (Kämpfer + Pfosten) in der Laibung
      theatBoxT('metal',rU-0.55,thC(i),2.4,0.08,11.5,0.12,0xd9d4cc);theatBoxT('metal',rU-0.55,thC(i),0.1,0.08,7.9,6.6,0xd9d4cc,{top:false});}
    else theatBoxT('metal',R+0.46,thC(i),2.8,0.05,7.62,0.85,0x2a2b2d);}
  // Lisenen mit Basis und Kapitell (vereinfacht)
  for(let i=0;i<=nb;i++){const t=thE(i);theatBoxT('ashlar',rU+0.1,t,0.9,0.4,M.yBand,M.yEnt-M.yBand,SAND2,{top:false});
    if(!low){theatBoxT('ashlar',rU+0.13,t,1.08,0.46,M.yBand,0.4,LIGHT);theatBoxT('ashlar',rU+0.15,t,1.12,0.5,M.yEnt-0.45,0.45,LIGHT);}}
  // --- Gebälk: Architrav, Fries mit Konsolen, Kranzgesims ---
  theatRing('ashlar',R-0.3,R+0.1,M.yEnt,M.yFri,-TH,TH,low?12:30,LIGHT);
  theatRing('ashlar',R-0.3,R-0.1,M.yFri,M.yCor,-TH,TH,low?12:30,SAND2,{bot:false});
  if(!low)for(let i=0;i<nb*4;i++){const t=-TH+bay*(i+0.5)/4;theatBoxT('ashlar',R+0.05,t,0.3,0.32,M.yFri+0.05,M.yCor-M.yFri-0.05,LIGHT);}
  theatRing('ashlar',R-0.3,R+0.45,M.yCor,M.yCor+0.22,-TH,TH,low?12:30,LIGHT);
  theatRing('ashlar',R-0.3,R+0.95,M.yCor+0.22,M.yRoof,-TH,TH,low?12:30,LIGHT);
  // --- Balustrade auf dem Gesims ---
  const rB=R+0.2;theatRing('ashlar',rB-0.35,rB+0.3,M.yRoof,M.yRoof+0.28,-TH,TH,low?12:30,LIGHT,{back:true});
  if(low)theatRing('ashlar',rB-0.15,rB+0.1,M.yRoof+0.28,M.yBal-0.3,-TH,TH,12,DARK,{back:true});
  else{const L=2*TH*rB,n=Math.floor(L/0.34);for(let j=0;j<n;j++){const t=-TH+(j+0.5)*2*TH/n;if(Math.abs(((t+TH)/bay)-Math.round((t+TH)/bay))*bay*rB<0.45)continue;
    theatBoxT('ashlar',rB,t,0.15,0.15,M.yRoof+0.28,M.yBal-0.3-M.yRoof-0.28,LIGHT,{top:false});theatBoxT('ashlar',rB,t,0.22,0.22,M.yRoof+0.45,0.26,LIGHT,{top:false});}}
  theatRing('ashlar',rB-0.3,rB+0.25,M.yBal-0.3,M.yBal,-TH,TH,low?12:30,LIGHT,{back:true});
  for(let i=0;i<=nb;i++)theatBoxT('ashlar',rB,thE(i),0.62,0.62,M.yRoof+0.28,M.yBal-M.yRoof-0.2,LIGHT);
  // --- Eckpavillons mit Turmgeschoss und Zeltdach ---
  for(const s of [-1,1]){const u0=M.uPav0,u1=M.uPav1,cu=s*(u0+u1)/2,w=u1-u0,cv=(M.vPavB+vP)/2,d=vP-M.vPavB;
    theatBox('rustic',cu,cv,1,0,w,d,0,M.yRus,SAND,{top:false});
    theatBox('ashlar',cu,cv+0.12,1,0,w+0.5,d+0.24,M.yRus,M.yBand-M.yRus,LIGHT);
    theatBox('ashlar',cu,cv,1,0,w,d,M.yBand,M.yEnt-M.yBand,SAND,{top:false});
    theatBox('ashlar',cu,cv+0.05,1,0,w+0.2,d+0.1,M.yEnt,M.yCor-M.yEnt,LIGHT,{top:false});
    theatBox('ashlar',cu,cv+0.22,1,0,w+0.9,d+0.45,M.yCor,0.22,LIGHT);theatBox('ashlar',cu,cv+0.45,1,0,w+1.8,d+0.9,M.yCor+0.22,M.yRoof-M.yCor-0.22,LIGHT,{bot:true});
    // Relief (links Komödie, rechts Tragödie vom Platz aus) mit Rahmen; Ecklisenen
    const pc=s*(u0+w*0.5);if(low)theatPlane('ashlar',pc,vP+0.04,0,1,w-1.6,13.4,2.5,[0,1,0,1],DARK);
    else{theatPlane('relief',pc,vP+0.06,0,1,w-1.6,13.4,2.5,s<0?[0,0.5,0,1]:[0.5,1,0,1]);theatBox('ashlar',pc,vP+0.08,1,0,w-1.2,0.16,13.2,0.2,LIGHT);theatBox('ashlar',pc,vP+0.08,1,0,w-1.2,0.16,15.9,0.2,LIGHT);
      for(const e of [-1,1])theatBox('ashlar',cu+e*(w/2-0.4),vP+0.08,1,0,0.8,0.16,M.yBand,M.yEnt-M.yBand,SAND2,{top:false});}
    // Erdgeschoss: Rechteckfenster + Schaukasten mit Schild
    theatPlane('glass',pc,vP+0.03,0,1,1.5,5.2,1.0,[0,1,0,1],0x46525a);
    theatBox('metal',pc,vP+0.14,1,0,1.7,0.24,1.1,2.3,0x2c2c2e);theatPlane('glass',pc,vP+0.27,0,1,1.5,1.25,1.85,[0,1,0,1],0x6d7c86);
    theatPlane('sign',pc,vP+0.27,0,1,1.6,3.0,0.32,[0.12,0.88,0,0.5]);
    // Turmgeschoss mit Dreifachfenster vorn und an der Außenseite, Traufgesims, Zeltdach mit Kugel
    const tu0=u0+0.25,tu1=u1-0.25,tc=s*(tu0+tu1)/2,tw=tu1-tu0,tv0=M.vPavB+0.3,tv1=vP-0.25,tcv=(tv0+tv1)/2,td=tv1-tv0;
    theatBox('ashlar',tc,tcv,1,0,tw,td,M.yRoof,M.yTow-M.yRoof,LIGHT,{top:false});
    for(let j=-1;j<=1;j++){theatPlane('glass',tc+j*1.05,tv1+0.02,0,1,0.75,18.6,1.7,[0,1,0,1],0x46525a);theatPlane('glass',s*(tu1+0.02),tcv+j*1.05,s,0,0.75,18.6,1.7,[0,1,0,1],0x46525a);}
    theatBox('ashlar',tc,tv1+0.05,1,0,3.6,0.18,18.45,0.15,LIGHT);
    theatBox('ashlar',tc,tcv,1,0,tw+0.7,td+0.7,M.yTow,0.5,LIGHT,{bot:true});
    theatHip('metal',tc-(tw+0.9)/2,tc+(tw+0.9)/2,tcv-(td+0.9)/2,tcv+(td+0.9)/2,M.yTow+0.5,M.yApex-M.yTow-0.5,99,0x8b9297);
    theatBox('metal',tc,tcv,1,0,0.08,0.08,M.yApex,0.75,0x8b9297,{top:false});theatBox('metal',tc,tcv,1,0,0.42,0.42,M.yApex+0.25,0.42,0x9aa0a4);}
  // --- Seitenflügel und Hinterhaus: EG Rustika, darüber rosa Putz mit Fenstern; Mansarddach, Bühnenturm ---
  for(const s of [-1,1]){const cu=s*(M.uSide+17.5)/2,w=M.uSide-17.5;
    theatBox('rustic',cu,M.vPavB/2,1,0,w,M.vPavB,0,M.yRus,SAND,{top:false});theatBox('ashlar',cu,M.vPavB/2,1,0,w+0.5,M.vPavB,M.yRus,M.yBand-M.yRus,LIGHT,{top:false});
    theatBox('ashlar',cu,M.vPavB/2,1,0,w,M.vPavB,M.yBand,M.yRoof-M.yBand,SAND,{top:false});theatBox('ashlar',cu,M.vPavB/2,1,0,w+0.9,M.vPavB,M.yRoof-0.5,0.5,LIGHT,{topK:'metal',topCol:0x6b6866,bot:true});
    for(const v of [3.2,8.2,13.2])for(const [y,h] of [[1.6,1.6],[4.6,1.5],[8.6,2.4],[12.2,2.4]]){const uf=s*(M.uSide+0.03);theatPlane('glass',uf,v,s,0,1.15,y,h,[0,1,0,1],0x46525a);
      if(!low){theatBox('ashlar',s*(M.uSide+0.06),v,0,1,1.45,0.14,y-0.18,0.16,LIGHT);if(y>7)theatBox('ashlar',s*(M.uSide+0.06),v,0,1,1.4,0.12,y+h,0.22,LIGHT);}}}
  {const u=M.rearU,v0=M.rearV0,cv=v0/2,d=-v0;theatBox('rustic',0,cv,1,0,2*u,d,0,5,DARK,{top:false});
    theatBox('plaster',0,cv,1,0,2*u,d,5,M.rearH-5,0xffffff,{yb:5,tile:[3.6,(M.rearH-5)/4],top:false});theatBox('ashlar',0,cv,1,0,2*u+0.6,d+0.6,M.rearH-0.45,0.45,LIGHT,{top:false});
    theatHip('metal',-u-0.3,u+0.3,v0-0.3,0.3,M.rearH,5,3.2,0x4d5258);
    theatBox('plaster',0,(M.stageV0+M.stageV1)/2,1,0,2*M.stageU,M.stageV1-M.stageV0,M.rearH+4,M.stageH-M.rearH-4,0xffffff,{yb:5,tile:[3.6,4.2],top:false});
    theatGable('metal','plaster',-M.stageU-0.3,M.stageU+0.3,M.stageV0-0.3,M.stageV1+0.3,M.stageH,M.stageTop-M.stageH,0x4d5258,0xffffff);}
  // --- Dachterrasse zwischen Fassade und Rotunde ---
  {const pts=[[-M.uSide,0],[M.uSide,0],[M.uSide,M.vPavB],[M.uPav0,M.vPavB]];const n=low?8:20;for(let i=0;i<=n;i++){const t=TH-2*TH*i/n;pts.push([(R-0.3)*Math.sin(t),(R-0.3)*Math.cos(t)]);}
    pts.push([-M.uPav0,M.vPavB],[-M.uSide,M.vPavB]);const g=theatG('metal'),c=theatC(0x6b6866);
    for(const f of triangulate(pts,[])){const [a,b,cc]=f.map(i=>pts[i]);if(!a||!b||!cc)continue;g.triOut(theatW(a[0],M.yRoof,a[1]),theatW(b[0],M.yRoof,b[1]),theatW(cc[0],M.yRoof,cc[1]),[0,0],[1,0],[0,1],c,theatW(a[0],M.yRoof-1,a[1]));}}
  // --- Gläserne Rotunde („Glashaus“) ---
  {const r=M.drumR,y0=M.yRoof,y1=M.drumTop,n=low?28:56,g=theatG("glass"),c=theatC(0xd2e6ea),ref=theatP(0,0,(y0+y1)/2);
    for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU;g.quadOut(theatP(r,a,y0),theatP(r,b,y0),theatP(r,b,y1),theatP(r,a,y1),[0,0],[1,0],[1,1],[0,1],c,ref);}
    if(!low){for(const yb of [y0+0.5,19.7,22.0,24.3,26.5])theatRing('metal',r-0.02,r+0.1,yb-0.08,yb+0.08,0,TAU,n,0x9aa2a6);
      for(let i=0;i<n;i+=2)theatBoxT('metal',r+0.04,i/n*TAU,0.08,0.12,y0,y1-y0,0x9aa2a6,{top:false});}
    theatRing('metal',r-0.4,r+0.75,y1-0.1,y1+0.28,0,TAU,n,0xc8ccce);
    const gm=theatG('metal'),cm=theatC(0x7a7d80);for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU;gm.triOut(theatP(0,0,y1+0.2),theatP(r-0.4,a,y1+0.2),theatP(r-0.4,b,y1+0.2),[0,0],[1,0],[0,1],cm,theatP(0,0,y1-1));}}
  // --- Freitreppe über die ganze Front (begehbar über STEP_FNS) ---
  {const g=theatG('ashlar'),c=theatC(0xe9d6cc),us=[-M.uStairs,-M.uPav0];const n=low?8:24;for(let i=1;i<n;i++)us.push(-M.uPav0+2*M.uPav0*i/n);us.push(M.uPav0,M.uStairs);
    for(let k=0;k<M.stepN;k++){const o0=k*M.stepD,o1=o0+M.stepD,yt=(M.stepN-k)*M.stepH,ybt=yt-M.stepH;
      for(let i=0;i<us.length-1;i++){const ua=us[i],ub=us[i+1],va=theatVf(ua),vb=theatVf(ub);
        g.quadOut(theatW(ua,yt,va+o0),theatW(ub,yt,vb+o0),theatW(ub,yt,vb+o1),theatW(ua,yt,va+o1),[ua/2.4,o0/2.4],[ub/2.4,o0/2.4],[ub/2.4,o1/2.4],[ua/2.4,o1/2.4],c,theatW((ua+ub)/2,yt-1,(va+vb)/2+o0));
        g.quadOut(theatW(ua,ybt,va+o1),theatW(ub,ybt,vb+o1),theatW(ub,yt,vb+o1),theatW(ua,yt,va+o1),[ua/2.4,0],[ub/2.4,0],[ub/2.4,0.07],[ua/2.4,0.07],c,theatW((ua+ub)/2,yt/2,(va+vb)/2));}
      for(const s of [-1,1]){const u=s*M.uStairs,v=theatVf(u);g.quadOut(theatW(u,0,v+o0),theatW(u,0,v+o1),theatW(u,yt,v+o1),theatW(u,yt,v+o0),[0,0],[0.15,0],[0.15,0.4],[0,0.4],c,theatW(u-s,yt/2,v+o0));}}}
  // --- Banner am Balkongeländer der drei mittleren Achsen ---
  {const r=R+0.62,a=-1.5*bay,b=1.5*bay,n=low?6:16,g=theatG('sign'),c=theatC(0xffffff);
    for(let i=0;i<n;i++){const ta=a+(b-a)*i/n,tb=a+(b-a)*(i+1)/n;g.quadOut(theatP(r,ta,7.66),theatP(r,tb,7.66),theatP(r,tb,8.4),theatP(r,ta,8.4),[i/n,0.5],[(i+1)/n,0.5],[(i+1)/n,1],[i/n,1],c,theatP(0,0,8));}}
  theatFinish();}

// Abschluss: ein Mesh je Material, Kollision ins Raster, Umrisse für die Übersichtskarte
function theatFinish(){const bb=[1e9,1e9,1e9,-1e9,-1e9,-1e9];const M=THEAT_M,R=THEAT.R,TH=THEAT.TH;
  for(const k in THEAT_GB){const gb=THEAT_GB[k];if(gb.empty)continue;const p=gb.p;for(let i=0;i<p.length;i+=3)for(let a=0;a<3;a++){if(p[i+a]<bb[a])bb[a]=p[i+a];if(p[i+a]>bb[a+3])bb[a+3]=p[i+a];}
    const m=new THREE.Mesh(gb.geo(),theatMat(k));m.castShadow=k!=='sign'&&k!=='relief';m.receiveShadow=true;LM.add(m);staticMesh(m);THEAT.meshes.push(m);}
  THEAT.bbox=bb;THEAT.draws=THEAT.meshes.length;
  // Kollision: Hauptbaukörper bis knapp hinter die Fassadenflucht (Treppe davor bleibt frei), Hinterhaus, Bühnenturm, Rotunde, Türme
  const L=pts=>pts.map(p=>{const w=theatW(p[0],0,p[1]);return [w[0],w[2]];});
  const front=[[-M.uSide,0],[M.uSide,0],[M.uSide,M.vPavB],[M.uPav1,M.vPavB],[M.uPav1,theatVf(M.uPav1)-0.3]];
  for(let i=0;i<=16;i++){const t=TH-2*TH*i/16;front.push([(R-0.3)*Math.sin(t),(R-0.3)*Math.cos(t)]);}
  front.push([-M.uPav1,theatVf(M.uPav1)-0.3],[-M.uPav1,M.vPavB],[-M.uSide,M.vPavB]);
  const polys=[[front,M.yBal],[[[-M.rearU,M.rearV0],[M.rearU,M.rearV0],[M.rearU,0.5],[-M.rearU,0.5]],M.rearH+5],
    [[[-M.stageU,M.stageV0],[M.stageU,M.stageV0],[M.stageU,M.stageV1],[-M.stageU,M.stageV1]],M.stageTop]];
  for(const s of [-1,1])polys.push([[[s*M.uPav0,M.vPavB],[s*M.uPav1,M.vPavB],[s*M.uPav1,theatVf(M.uPav1)-0.3],[s*M.uPav0,theatVf(M.uPav1)-0.3]],M.yApex]);
  {const c=[];for(let i=0;i<24;i++){const a=i/24*TAU;c.push([M.drumR*Math.sin(a),M.drumR*Math.cos(a)]);}polys.push([c,M.drumTop]);}
  for(const [P,h] of polys)rasterPoly(HG,[L(P)],Math.min(254,Math.ceil(h)));
  // Übersichtskarte (h:0 rastert nichts): Rechtecke für Hinterhaus/Seiten/Pavillons, Kreis für die Rotunde, Stücke für die Rundung
  const ang=-Math.atan2(THEAT.U[1],THEAT.U[0]);const ob=(u,v,w,d,rot=0)=>{const q=theatW(u,0,v);SOLIDS.push({k:'obb',x:q[0],z:q[2],w,d,rot:ang+rot,h:0});};
  ob(0,M.rearV0/2,2*M.rearU,-M.rearV0);ob(0,M.vPavB/2,2*M.uSide,M.vPavB);for(const s of [-1,1])ob(s*(M.uPav0+M.uPav1)/2,(M.vPavB+theatVf(M.uPav1))/2,M.uPav1-M.uPav0,theatVf(M.uPav1)-M.vPavB);
  for(let i=0;i<5;i++){const t=-TH+(i+0.5)*2*TH/5;ob(23*Math.sin(t),23*Math.cos(t),2*TH/5*R+0.3,8,t);}
  THEAT.built=true;}

// Freitreppe: Höhe je Stufe (begehbar), außerhalb undefined
function theatStairH(x,z){const C=THEAT.C,dx=x-C[0],dz=z-C[1],u=dx*THEAT.U[0]+dz*THEAT.U[1],v=dx*THEAT.F[0]+dz*THEAT.F[1],M=THEAT_M;
  if(Math.abs(u)>M.uStairs)return undefined;const o=v-theatVf(u);if(o>=M.stepN*M.stepD)return undefined;
  if(o<0){// in die Arkaden hinein (Boden auf Treppenhöhe), Pfeiler bleiben über das Raster massiv
    if(o<-1.5||Math.abs(u)>M.uPav0)return undefined;const bay=2*THEAT.TH/5,t=Math.atan2(u,v),i=Math.floor((t+THEAT.TH)/bay),s=(t-(-THEAT.TH+bay*(i+0.5)))*THEAT.R;
    return Math.abs(s)<1.05?M.stepN*M.stepH:undefined;}
  return (M.stepN-Math.floor(o/M.stepD))*M.stepH;}
function theatLocal(x,z){const C=THEAT.C,dx=x-C[0],dz=z-C[1];return [dx*THEAT.U[0]+dz*THEAT.U[1],dx*THEAT.F[0]+dz*THEAT.F[1]];}
function theatWorld(u,v){const w=theatW(u,0,v);return [w[0],w[2]];}

const _theatBuildLandmarks=buildLandmarks;
buildLandmarks=function(){_theatBuildLandmarks();theatBuild();};

function setupTheat(){if(!THEAT.built)return;
  const M=THEAT_M,cs=[];for(const u of [-M.uStairs,M.uStairs])for(const o of [0,M.stepN*M.stepD]){const w=theatW(u,0,theatVf(0)+o);cs.push(w);const w2=theatW(u,0,theatVf(M.uPav0)+o);cs.push(w2);}
  const bb=[Math.min(...cs.map(p=>p[0]))-1,Math.min(...cs.map(p=>p[2]))-1,Math.max(...cs.map(p=>p[0]))+1,Math.max(...cs.map(p=>p[2]))+1];
  STEP_FNS.push({bb,f:theatStairH});STEP_BB[0]=Math.min(STEP_BB[0],bb[0]);STEP_BB[1]=Math.min(STEP_BB[1],bb[1]);STEP_BB[2]=Math.max(STEP_BB[2],bb[2]);STEP_BB[3]=Math.max(STEP_BB[3],bb[3]);
  THEAT.stairs={bb,top:M.stepN*M.stepH,depth:M.stepN*M.stepD};
  THEAT.local=theatLocal;THEAT.world=theatWorld;THEAT.stairH=theatStairH;}
