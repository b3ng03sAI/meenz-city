// ===================== 7 Wiesbadener Wahrzeichen (Kurhaus, Marktkirche, Hbf Wiesbaden, Biebricher Schloss) =====================
// Handgebaute Modelle auf den echten OSM-Grundrissen. Die OSM-Gebäude dort fallen per LM_SKIP weg (wie bei Dom & Co.),
// gebaut wird in einem Wrapper um buildLandmarks(), damit Kollision (SOLIDS/HG) und Übersichtskarte sie mitnehmen.
// Kurhaus begehbar (Foyer unter der Kuppel + großer Saal, der in Paket 28 die Spielbank bekommt), alle vier als Schnellreiseziele.
const WIWAHR={models:{},positions:{},venue:null,hall:null,ft:[],built:false};
// gids: OSM-Gebäude (auch Multipolygon-Teile), front: grobe Weltrichtung der Schauseite (zum Ausrichten des Modells)
const WIWAHR_DEFS={
  kurhaus:{name:'Kurhaus Wiesbaden',gids:[36866422],front:[-1,0],fb:[-1890,-9561]},
  marktkirche:{name:'Marktkirche',gids:[57403233,1028767753],front:[-0.86,-0.5],fb:[-2218,-9275]},
  hbf:{name:'Hauptbahnhof Wiesbaden',gids:[10260640],front:[0.35,-0.94],fb:[-2160,-7960]},
  biebrich:{name:'Biebricher Schloss',gids:[145482673],front:[0.2,1],fb:[-2850,-4300]},
};
for(const k in WIWAHR_DEFS)for(const g of WIWAHR_DEFS[k].gids)LM_SKIP.add(g);

// ---------- Hilfen: Farben, Rahmen, Grundrisse ----------
const WIWAHR_COLS=new Map();
function wiwahrLin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function wiwahrC(h){let c=WIWAHR_COLS.get(h);if(!c){c={r:wiwahrLin((h>>16)&255),g:wiwahrLin((h>>8)&255),b:wiwahrLin(h&255)};WIWAHR_COLS.set(h,c);}return c;}
// Lokaler Rahmen: u = (cos a, sin a), v = (-sin a, cos a) in (x,z)
function wiwahrFrame(x,z,ang){const c=Math.cos(ang),s=Math.sin(ang);return {x,z,ang,c,s,w:(u,v)=>[x+u*c-v*s,z+u*s+v*c],dir:(du,dv)=>[du*c-dv*s,du*s+dv*c]};}
// kleinstes umschließendes Rechteck (Kanten-Richtungen des Polygons durchprobieren)
function wiwahrOBB(P){let best=null;for(let i=0;i<P.length;i++){const A=P[i],B=P[(i+1)%P.length];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<0.5)continue;const ux=(B[0]-A[0])/L,uz=(B[1]-A[1])/L;
  let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const p of P){const u=p[0]*ux+p[1]*uz,v=-p[0]*uz+p[1]*ux;if(u<u0)u0=u;if(u>u1)u1=u;if(v<v0)v0=v;if(v>v1)v1=v;}
  const a=(u1-u0)*(v1-v0);if(!best||a<best.a-1e-6){const cu=(u0+u1)/2,cv=(v0+v1)/2;best={a,ang:Math.atan2(uz,ux),x:cu*ux-cv*uz,z:cu*uz+cv*ux,lu:u1-u0,lv:v1-v0};}}
  return best;}
// Rahmen aus einem Rechteck: u entlang der langen Seite, Schauseite (front) auf +v bzw. +u (axis)
function wiwahrOrient(o,axis,front){let ang=o.ang,lu=o.lu,lv=o.lv;if(lv>lu){ang+=Math.PI/2;[lu,lv]=[lv,lu];}
  const f=axis==='v'?-Math.sin(ang)*front[0]+Math.cos(ang)*front[1]:Math.cos(ang)*front[0]+Math.sin(ang)*front[1];if(f<0)ang+=Math.PI;
  return Object.assign(wiwahrFrame(o.x,o.z,ang),{lu,lv});}
// alle OSM-Teile der Wahrzeichen in einem Durchlauf einsammeln
function wiwahrParts(){const want=new Map();for(const k in WIWAHR_DEFS)for(const g of WIWAHR_DEFS[k].gids)want.set(g,k);const out={};for(const k in WIWAHR_DEFS)out[k]=[];
  for(const r of OSM.b){const k=want.get(r[12]);if(!k)continue;const P=decRing(r[10]);if(P.length<3)continue;const area=Math.abs(polyArea(P));if(area<2)continue;
    out[k].push({P,area,sa:polyArea(P),c:polyCentroid(P),obb:wiwahrOBB(P),gid:r[12],n:P.length,h:r[0]/10});}
  return out;}
function wiwahrCentroid(parts){let a=0,x=0,z=0;for(const p of parts){a+=p.area;x+=p.c[0]*p.area;z+=p.c[1]*p.area;}return a?[x/a,z/a]:null;}

// ---------- Materialien & Texturen (je eine Fensterachse pro Kachel, maßstäblich in Metern) ----------
const WIWAHR_TEX={kur:[5,7.5],brick:[5,17.5],hbf:[6,7],schloss:[4.5,6],hall:[4,3]};
const WIWAHR_MATS={};
function wiwahrArch(g,x0,x1,yTop,yBot,pointed){const r=(x1-x0)/2,cx=(x0+x1)/2;g.beginPath();g.moveTo(x0,yBot);g.lineTo(x0,yTop);
  if(pointed){g.quadraticCurveTo(x0,yTop-r*1.3,cx,yTop-r*1.9);g.quadraticCurveTo(x1,yTop-r*1.3,x1,yTop);}else g.arc(cx,yTop,r,Math.PI,0);g.lineTo(x1,yBot);g.closePath();}
// eigenes Rauschen mit festem Seed: noiseFill zöge Math.random beim Laden und verschöbe alle späteren Zufallsfolgen (Spawns, Tests)
function wiwahrNoise(g,w,h,amt,n,seed){const R=mulberry32(seed);for(let i=0;i<n;i++){g.fillStyle=R()<0.5?`rgba(0,0,0,${amt})`:`rgba(255,255,255,${amt})`;g.fillRect(R()*w,R()*h,1+R()*2,1+R()*2);}}
function wiwahrTex(k){const D={
  kur:[160,240,g=>{g.fillStyle='#e6dbc3';g.fillRect(0,0,160,240);wiwahrNoise(g,160,240,0.04,900,701);g.fillStyle='rgba(120,100,70,0.16)';for(let y=12;y<240;y+=22)g.fillRect(0,y,160,2);
    g.fillStyle='#f0e8d6';g.fillRect(0,0,18,240);g.fillRect(142,0,18,240);g.fillStyle='#d3c4a4';g.fillRect(0,0,160,12);g.fillRect(0,226,160,14);
    g.fillStyle='#f4eee2';wiwahrArch(g,46,114,96,214,false);g.fill();g.fillStyle='#283036';wiwahrArch(g,54,106,96,206,false);g.fill();
    g.fillStyle='#f4eee2';g.fillRect(77,62,6,144);g.fillRect(54,138,52,5);g.fillStyle='rgba(160,185,205,0.25)';g.fillRect(58,100,16,34);}],
  brick:[128,448,g=>{g.fillStyle='#a5452f';g.fillRect(0,0,128,448);wiwahrNoise(g,128,448,0.06,2500,702);g.fillStyle='rgba(60,20,10,0.22)';for(let y=0;y<448;y+=7)g.fillRect(0,y,128,1.4);
    g.fillStyle='#c98f63';for(let y=40;y<448;y+=140)g.fillRect(0,y,128,5);
    g.fillStyle='#d9c6a2';wiwahrArch(g,34,94,150,400,true);g.fill();g.fillStyle='#232b35';wiwahrArch(g,40,88,152,394,true);g.fill();
    g.fillStyle='#d9c6a2';g.fillRect(62,110,4,284);for(let y=190;y<394;y+=50)g.fillRect(40,y,48,3);
    g.fillStyle='rgba(190,60,60,0.35)';g.fillRect(44,200,16,40);g.fillStyle='rgba(70,110,190,0.35)';g.fillRect(68,250,16,40);}],
  hbf:[192,224,g=>{g.fillStyle='#a95b44';g.fillRect(0,0,192,224);wiwahrNoise(g,192,224,0.05,1500,703);g.fillStyle='rgba(60,20,10,0.25)';for(let y=10;y<224;y+=16)g.fillRect(0,y,192,1.6);
    for(let y=10,k=0;y<224;y+=16,k++)for(let x=(k%2)*24;x<192;x+=48)g.fillRect(x,y,1.6,16);
    g.fillStyle='#c98a6c';g.fillRect(0,208,192,16);g.fillRect(0,0,192,8);
    g.fillStyle='#d7b49a';wiwahrArch(g,52,140,92,196,false);g.fill();g.fillStyle='#262c31';wiwahrArch(g,60,132,92,190,false);g.fill();
    g.fillStyle='#d7b49a';g.fillRect(93,48,6,142);g.fillRect(60,120,72,5);g.fillRect(88,40,16,12);}],
  schloss:[144,192,g=>{g.fillStyle='#dba98c';g.fillRect(0,0,144,192);wiwahrNoise(g,144,192,0.04,900,704);g.fillStyle='#f2ece2';g.fillRect(0,0,14,192);g.fillRect(130,0,14,192);g.fillRect(0,0,144,10);g.fillRect(0,182,144,10);
    g.fillStyle='#f4efe6';g.fillRect(40,34,64,138);g.beginPath();g.moveTo(34,36);g.quadraticCurveTo(72,6,110,36);g.closePath();g.fill();
    g.fillStyle='#2a3036';g.fillRect(48,42,48,122);g.fillStyle='#f4efe6';g.fillRect(70,42,4,122);for(let y=72;y<164;y+=30)g.fillRect(48,y,48,3);}],
  hall:[128,96,g=>{g.fillStyle='#4f5960';g.fillRect(0,0,128,96);g.fillStyle='#9db4c2';for(let x=0;x<128;x+=32)for(let y=0;y<96;y+=24)g.fillRect(x+3,y+3,26,18);g.fillStyle='rgba(255,255,255,0.18)';g.fillRect(6,6,10,12);}],
  clock:[128,128,g=>{g.fillStyle='#2b2620';g.fillRect(0,0,128,128);g.fillStyle='#f3efe4';g.beginPath();g.arc(64,64,58,0,TAU);g.fill();g.strokeStyle='#1d1a16';g.lineWidth=5;g.stroke();
    for(let i=0;i<12;i++){const a=i/12*TAU;g.lineWidth=i%3?3:6;g.beginPath();g.moveTo(64+Math.cos(a)*44,64+Math.sin(a)*44);g.lineTo(64+Math.cos(a)*54,64+Math.sin(a)*54);g.stroke();}
    g.lineWidth=6;g.beginPath();g.moveTo(64,64);g.lineTo(64+30*Math.cos(-2.6),64+30*Math.sin(-2.6));g.stroke();g.lineWidth=4;g.beginPath();g.moveTo(64,64);g.lineTo(64+44*Math.cos(-1.2),64+44*Math.sin(-1.2));g.stroke();}],
}[k];const t=canvasTex(D[0],D[1],D[2]);return freeAfterUpload(t);}
function wiwahrMat(k){if(WIWAHR_MATS[k])return WIWAHR_MATS[k];let m;
  if(k==='slate')m=MAT.slate;else if(k==='copper')m=MAT.copper;
  else if(k==='plain')m=stdMat({vertexColors:true,roughness:0.82});
  else if(k==='metal')m=stdMat({vertexColors:true,roughness:0.45,metalness:0.55});
  else if(k==='hall')m=stdMat({map:wiwahrTex('hall'),vertexColors:true,roughness:0.35,metalness:0.3,side:THREE.DoubleSide});
  else if(k==='clock')m=stdMat({map:wiwahrTex('clock'),roughness:0.5});
  else if(k==='sign')m=stdMat({map:textTex('AQUIS MATTIACIS',{w:512,h:64,bg:'#e6dbc3',fg:'#4e4030',font:'700 46px "Barlow Condensed", Arial Narrow, sans-serif'}),roughness:0.7});
  else m=stdMat({map:wiwahrTex(k),vertexColors:true,roughness:0.85});
  return WIWAHR_MATS[k]=m;}

// ---------- Baukasten: Geometrie je Material in einem GB (Weltkoordinaten), am Ende ein Mesh pro Material ----------
function wiwahrKit(F){const gbs={};const G=k=>gbs[k]||(gbs[k]=new GB());const K={F,solids:[],rasters:[]};
  const uvOf=k=>WIWAHR_TEX[k]||[4,4];
  // Quader: Mitte (u,v), Breite w entlang u, Tiefe d entlang v
  K.box=(k,u,v,w,d,y,h,o={})=>{const col=wiwahrC(o.col??0xffffff),[su,sv]=o.uv||uvOf(k),yb=o.yb??0;const cs=[[u-w/2,v-d/2],[u+w/2,v-d/2],[u+w/2,v+d/2],[u-w/2,v+d/2]].map(p=>F.w(p[0],p[1]));
    const c=F.w(u,v),ref=[c[0],y+h/2,c[1]],v0=(y-yb)/sv,v1=(y+h-yb)/sv;
    for(let i=0;i<4;i++){const A=cs[i],B=cs[(i+1)%4];const L=Math.hypot(B[0]-A[0],B[1]-A[1])/su;G(k).quadOut([A[0],y,A[1]],[B[0],y,B[1]],[B[0],y+h,B[1]],[A[0],y+h,A[1]],[0,v0],[L,v0],[L,v1],[0,v1],col,ref);}
    if(o.top!==false){const tk=o.topK||k,tc=o.topCol!==undefined?wiwahrC(o.topCol):col;G(tk).quadOut(...cs.map(p=>[p[0],y+h,p[1]]),[0,0],[w/4,0],[w/4,d/4],[0,d/4],tc,[c[0],y,c[1]]);}
    if(o.solid)K.solids.push({k:'obb',x:c[0],z:c[1],w,d,rot:-F.ang,h:y+h});return K;};
  // Drehkörper um (u,v): Profil [[r,y],…] von unten außen nach oben innen; ph = Startwinkel (Achtecke ausrichten)
  K.lathe=(k,u,v,prof,seg,o={})=>{const col=wiwahrC(o.col??0xffffff),[su,sv]=o.uv||uvOf(k),yb=o.yb??0,ph=o.ph||0;const g=G(k);const C=F.w(u,v);
    const dirs=[];for(let j=0;j<=seg;j++){const a=ph+j/seg*TAU;dirs.push(F.dir(Math.cos(a),Math.sin(a)));}
    for(let i=0;i<prof.length-1;i++){const [r0,y0]=prof[i],[r1,y1]=prof[i+1];const nl=Math.hypot(r1-r0,y1-y0)||1;const nr=(y1-y0)/nl,ny=-(r1-r0)/nl;const rU=Math.max(r0,r1,0.05);const s=g.p.length/3;
      for(let j=0;j<=seg;j++){const d=dirs[j],U=j/seg*TAU*rU/su,n=[d[0]*nr,ny,d[1]*nr];g._v([C[0]+d[0]*r0,y0,C[1]+d[1]*r0],[U,(y0-yb)/sv],col,n);g._v([C[0]+d[0]*r1,y1,C[1]+d[1]*r1],[U,(y1-yb)/sv],col,n);}
      // Wicklung prüfen: Dreieck (unten j, unten j+1, oben j) muss nach außen zeigen
      const P=t=>g.p.slice((s+t)*3,(s+t)*3+3);const A=P(r0>0.01?0:1),B=P(r0>0.01?2:3),Cc=P(r0>0.01?1:0);const cr=cross3(sub3(B,A),sub3(Cc,A));const flip=(cr[0]*dirs[0][0]*nr+cr[1]*ny+cr[2]*dirs[0][1]*nr)*(r0>0.01?1:-1)<0;
      for(let j=0;j<seg;j++){const a=s+2*j,b=a+1,c=a+2,d=a+3;if(!flip)g.i.push(a,c,b,c,d,b);else g.i.push(a,b,c,c,b,d);}}
    if(o.cap){const [r,y]=prof[prof.length-1];if(r>0.01)for(let j=0;j<seg;j++){const a=dirs[j],b=dirs[j+1];g.triOut([C[0],y,C[1]],[C[0]+a[0]*r,y,C[1]+a[1]*r],[C[0]+b[0]*r,y,C[1]+b[1]*r],[0,0],[1,0],[0,1],col,[C[0],y-1,C[1]]);}}
    if(o.solid){const r=Math.max(...prof.map(p=>p[0]));K.solids.push({k:'circ',x:C[0],z:C[1],r,h:prof[prof.length-1][1]});}return K;};
  // Walmdach / Mansarde auf Rechteck: Traufe auf y, oberes Rechteck um 'inset' eingezogen (inset >= halbe Tiefe → First)
  K.roof4=(k,u,v,w,d,y,rise,inset,o={})=>{const col=wiwahrC(o.col??0xffffff),t=o.tile||3;const g=G(k);const iu=Math.max(0,w/2-inset),iv=Math.max(0,d/2-inset);const yt=y+rise;
    const P=(a,b,yy)=>{const q=F.w(u+a,v+b);return [q[0],yy,q[1]];};const c=F.w(u,v),ref=[c[0],y,c[1]];
    const lo=[P(-w/2,-d/2,y),P(w/2,-d/2,y),P(w/2,d/2,y),P(-w/2,d/2,y)],hi=[P(-iu,-iv,yt),P(iu,-iv,yt),P(iu,iv,yt),P(-iu,iv,yt)];
    for(let i=0;i<4;i++){const j=(i+1)%4;const L=Math.hypot(lo[j][0]-lo[i][0],lo[j][2]-lo[i][2]),sl=Math.hypot(rise,inset);g.quadOut(lo[i],lo[j],hi[j],hi[i],[0,0],[L/t,0],[L/t,sl/t],[0,sl/t],col,ref);}
    if(iu>0.01&&iv>0.01)G(o.topK||k).quadOut(...hi,[0,0],[iu/t,0],[iu/t,iv/t],[0,iv/t],o.topCol!==undefined?wiwahrC(o.topCol):col,[c[0],y,c[1]]);return K;};
  // Satteldach, First entlang u (alongV: entlang v); Giebeldreiecke optional in eigenem Material
  K.gable=(k,u,v,w,d,y,rise,o={})=>{const col=wiwahrC(o.col??0xffffff),t=o.tile||3;const L=o.alongV?d:w,W=o.alongV?w:d,hl=L/2,hw=W/2,sl=Math.hypot(hw,rise);
    const P=(a,b,yy)=>{const q=o.alongV?F.w(u+b,v+a):F.w(u+a,v+b);return [q[0],yy,q[1]];};const c=F.w(u,v),ref=[c[0],y,c[1]];
    G(k).quadOut(P(-hl,-hw,y),P(hl,-hw,y),P(hl,0,y+rise),P(-hl,0,y+rise),[0,0],[L/t,0],[L/t,sl/t],[0,sl/t],col,ref);
    G(k).quadOut(P(hl,hw,y),P(-hl,hw,y),P(-hl,0,y+rise),P(hl,0,y+rise),[0,0],[L/t,0],[L/t,sl/t],[0,sl/t],col,ref);
    const gk=o.gableK||k,gc=o.gableCol!==undefined?wiwahrC(o.gableCol):col,[su,sv]=o.gableK?uvOf(gk):[t,t],yb=o.yb??0;
    for(const e of [-1,1])G(gk).triOut(P(e*hl,-hw,y),P(e*hl,hw,y),P(e*hl,0,y+rise),[0,(y-yb)/sv],[W/su,(y-yb)/sv],[W/2/su,(y+rise-yb)/sv],gc,ref);return K;};
  // Tonnendach (Bahnsteighalle) entlang u über die Spannweite span
  K.vault=(k,u,v,L,span,y,rise,seg,o={})=>{const col=wiwahrC(o.col??0xffffff),[su,sv]=o.uv||uvOf(k);const c=F.w(u,v),ref=[c[0],y-span,c[1]];let s0=0;
    for(let i=0;i<seg;i++){const t0=i/seg,t1=(i+1)/seg;const b0=-span/2+span*t0,b1=-span/2+span*t1,y0=y+rise*Math.sin(Math.PI*t0),y1=y+rise*Math.sin(Math.PI*t1);const sl=Math.hypot(b1-b0,y1-y0);
      const P=(a,b,yy)=>{const q=F.w(u+a,v+b);return [q[0],yy,q[1]];};G(k).quadOut(P(-L/2,b0,y0),P(L/2,b0,y0),P(L/2,b1,y1),P(-L/2,b1,y1),[0,s0/sv],[L/su,s0/sv],[L/su,(s0+sl)/sv],[0,(s0+sl)/sv],col,ref);s0+=sl;}return K;};
  // senkrechte Fläche (Tür, Uhr, Inschrift) mit Blick in lokale Richtung (du,dv); Textur 0..1, von vorn lesbar
  K.plane=(k,u,v,y,w,h,du,dv,o={})=>{const col=wiwahrC(o.col??0xffffff);const n=F.dir(du,dv),rt=[n[1],-n[0]];const c=F.w(u+du*0.06,v+dv*0.06);
    const a=[c[0]-rt[0]*w/2,y,c[1]-rt[1]*w/2],b=[c[0]+rt[0]*w/2,y,c[1]+rt[1]*w/2];G(k).quad(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],[0,0],[1,0],[1,1],[0,1],col);return K;};
  // Prisma aus einem echten OSM-Grundriss (Weltkoordinaten), Kollision über das HG-Raster
  K.prism=(k,P,sa,y,h,o={})=>{const col=wiwahrC(o.col??0xffffff),[su,sv]=o.uv||uvOf(k),yb=o.yb??0;const g=G(k);
    for(let i=0;i<P.length;i++){const A=P[i],B=P[(i+1)%P.length];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<0.05)continue;const [p,q]=sa>0?[B,A]:[A,B];
      g.quad([p[0],y,p[1]],[q[0],y,q[1]],[q[0],y+h,q[1]],[p[0],y+h,p[1]],[0,(y-yb)/sv],[L/su,(y-yb)/sv],[L/su,(y+h-yb)/sv],[0,(y+h-yb)/sv],col);}
    if(o.top!==false){const tc=o.topCol!==undefined?wiwahrC(o.topCol):col;const tg=G(o.topK||k);for(const f of triangulate(P,[])){const [a,b,c]=f.map(i=>P[i]);if(!a||!b||!c)continue;
      tg.triOut([a[0],y+h,a[1]],[b[0],y+h,b[1]],[c[0],y+h,c[1]],[a[0]/4,a[1]/4],[b[0]/4,b[1]/4],[c[0]/4,c[1]/4],tc,[a[0],y+h-1,a[1]]);}}
    if(o.solid)K.rasters.push({P,h:y+h});return K;};
  // Abschluss: ein Mesh pro Material, Umriss (bbox) merken, Kollision eintragen
  K.done=()=>{const bb=[1e9,1e9,1e9,-1e9,-1e9,-1e9];const meshes=[];
    for(const k in gbs){const gb=gbs[k];if(gb.empty)continue;const p=gb.p;for(let i=0;i<p.length;i+=3){for(let a=0;a<3;a++){if(p[i+a]<bb[a])bb[a]=p[i+a];if(p[i+a]>bb[a+3])bb[a+3]=p[i+a];}}
      const m=new THREE.Mesh(gb.geo(),wiwahrMat(k));m.castShadow=k!=='sign'&&k!=='clock';m.receiveShadow=true;LM.add(m);staticMesh(m);meshes.push(m);}
    for(const s of K.solids)SOLIDS.push(s);
    // Grundriss-Prismen: Kollision direkt ins Raster, für die Übersichtskarte ein Rechteck ohne Höhe (h:0 rastert nichts)
    for(const r of K.rasters){rasterPoly(HG,[r.P],Math.min(254,Math.ceil(r.h)));const o=wiwahrOBB(r.P);if(o)SOLIDS.push({k:'obb',x:o.x,z:o.z,w:o.lu,d:o.lv,rot:-o.ang,h:0});}
    return {meshes,bbox:bb};};
  return K;}

// ---------- Kurhaus: Säulenportikus mit Inschrift, Kuppel über dem Mittelbau, lange Flügel mit Eckpavillons ----------
function wiwahrKurhaus(parts){const main=parts.slice().sort((a,b)=>b.area-a.area)[0];
  const F=main?wiwahrOrient(main.obb,'v',WIWAHR_DEFS.kurhaus.front):Object.assign(wiwahrFrame(-1889.7,-9561.5,1.515),{lu:124.5,lv:61.7});
  // Haupttrakt ist laut Grundriss 51 m tief (vb..vf), davor der Portikus bis +lv/2, Portikusachse bei u=2,25
  const K=wiwahrKit(F);const hu=F.lu/2,vb=-F.lv/2,vf=vb+51.3,pu=2.25,trim=0xd8cbae,kurTop={topK:'plain',topCol:0x8d8a84};
  // Flügel, Mittelbau, Eckpavillons (zweigeschossig, Rundbogenfenster)
  K.box('kur',(-hu-12)/2,(vb+vf)/2,hu-12,vf-vb,0,14,Object.assign({solid:true},kurTop));
  K.box('kur',(hu+16)/2,(vb+vf)/2,hu-16,vf-vb,0,14,Object.assign({solid:true},kurTop));
  K.box('kur',pu,(vb+vf)/2,28,vf-vb,0,19,Object.assign({solid:true},kurTop));
  for(const e of [-1,1])K.box('kur',e*(hu-6),(vb+vf)/2,12,vf-vb+1.2,0,16.5,Object.assign({solid:true},kurTop));
  // Gesimse und Balustraden
  for(const [u,w,h] of [[(-hu-12)/2,hu-12,14],[(hu+16)/2,hu-16,14],[pu,28,19]]){K.box('plain',u,(vb+vf)/2,w+0.8,vf-vb+0.8,h-0.7,0.7,{col:trim});K.box('plain',u,vf-0.1,w,0.5,h,1.1,{col:0xe9e0cc,top:false});}
  for(const e of [-1,1]){K.box('plain',e*(hu-6),(vb+vf)/2,12.8,vf-vb+2,15.8,0.7,{col:trim});K.roof4('slate',e*(hu-6),(vb+vf)/2,12,vf-vb+1.2,16.5,3.2,4,{col:0x8a9096});}
  // Portikus: Podest, sechs ionische Säulen, Gebälk mit Inschrift, Dreiecksgiebel
  const pv0=vf,pv1=F.lv/2,pc=(pv0+pv1)/2,pd=pv1-pv0;
  K.box('plain',pu,pc,24,pd,0,0.45,{col:0xcfc6b4});K.box('plain',pu,pv1-0.3,24,0.9,0,0.22,{col:0xcfc6b4});
  const colProf=[[0.95,0.45],[0.95,0.8],[0.72,0.95],[0.66,1.3],[0.58,12.3],[0.78,12.55],[0.9,12.95]];
  for(let i=0;i<6;i++)K.lathe('plain',pu-10+i*4,pv1-1.2,colProf,12,{col:0xeee6d6,solid:true});
  for(const e of [-1,1])K.lathe('plain',pu+e*10,pv0+2.2,colProf,12,{col:0xeee6d6});
  for(let i=0;i<6;i++)K.box('plain',pu-10+i*4,pv1-1.2,2.0,2.0,12.95,0.4,{col:0xe2d8c2});
  K.box('plain',pu,pc,24.6,pd+0.4,13.35,2.2,{col:0xe4d9c1});K.box('plain',pu,pc,25.2,pd+0.9,15.45,0.45,{col:trim});
  K.plane('sign',pu,pv1+0.2,13.75,14,1.4,0,1);
  K.gable('plain',pu,pc,25.2,pd+0.9,15.9,4.6,{alongV:true,col:0x9b958b,gableCol:0xe6dcc6});
  // Hauptportal hinter den Säulen
  K.plane('plain',pu,pv0,0.45,3.8,5.6,0,1,{col:0x3b2a1c});K.plane('plain',pu,pv0+0.01,6.05,4.4,0.5,0,1,{col:0xc8a54a});
  // Kuppel über dem Kuppelsaal: Tambour, Kupferkuppel, Laterne
  const dv=(vb+vf)/2+3;K.lathe('kur',pu,dv,[[9.6,19],[9.6,24.2]],24,{yb:19});K.lathe('plain',pu,dv,[[10.2,24.2],[10.2,24.9],[9.4,24.9]],24,{col:trim});
  const dome=[];for(let i=0;i<=8;i++){const a=i/8*Math.PI/2;dome.push([9.4*Math.cos(a),24.9+8.2*Math.sin(a)]);}dome[8][0]=1.6;
  K.lathe('copper',pu,dv,dome,28,{col:0xffffff});K.lathe('plain',pu,dv,[[1.6,33.1],[1.6,35.4],[2,35.4],[0.15,38]],10,{col:0xe9e0cc});
  const r=K.done();const door0=F.w(pu,pv1+12),doorT=F.w(pu,(vb+vf)/2);
  return Object.assign(r,{F,door:[door0,doorT],front:F.w(pu,pv1+22),label:F.w(pu,(vb+vf)/2)});}

// ---------- Marktkirche: neugotischer Backstein, Hauptturm im Westen + vier Nebentürme ----------
function wiwahrMarktkirche(parts){const main=parts.slice().sort((a,b)=>b.area-a.area)[0];
  const F=main?wiwahrOrient(main.obb,'u',WIWAHR_DEFS.marktkirche.front):Object.assign(wiwahrFrame(-2217.5,-9274.7,-2.608),{lu:64,lv:28.6});
  const K=wiwahrKit(F);const hu=F.lu/2,brick=0x9f4430,spire=0x4f565e,stone=0xd6c4a0,sp={col:spire};
  // Langhaus mit Strebepfeilern und steilem Schieferdach
  K.box('brick',(-20+hu-9)/2,0,hu-9+20,25,0,18,{solid:true,topK:'plain',topCol:0x555b62});
  for(let u=-17;u<=hu-12;u+=5.5)for(const e of [-1,1]){K.box('plain',u,e*13,1.3,1.8,0,15,{col:brick});K.lathe('slate',u,e*13,[[1.0,15],[0,17.5]],4,Object.assign({ph:Math.PI/4},sp));}
  K.gable('slate',(-20+hu-9)/2,0,hu-9+20,26.2,18,13,{col:0x6b737c,gableK:'brick',yb:0});
  // Chor mit Apsis
  K.box('brick',-24,0,8,18,0,18,{solid:true,topK:'plain',topCol:0x555b62});K.gable('slate',-24,0,8,19,18,10,{col:0x6b737c,gableK:'brick'});
  K.lathe('brick',-hu+9,0,[[8.6,0],[8.6,18]],8,{ph:Math.PI/8,solid:true});K.lathe('slate',-hu+9,0,[[9.2,18],[0,28]],8,Object.assign({ph:Math.PI/8},{col:0x6b737c}));
  // Hauptturm: quadratischer Schaft, Eckfialen, schlanker achteckiger Helm (98 m)
  const tu=hu-4.8;K.box('brick',tu,0,9.6,9.6,0,64,{solid:true,topK:'plain',topCol:0x555b62});K.box('plain',tu,0,10.4,10.4,63.2,1.2,{col:stone});
  for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){K.lathe('plain',tu+a*4.8,b*4.8,[[0.75,64.4],[0.75,67]],6,{col:brick});K.lathe('slate',tu+a*4.8,b*4.8,[[0.95,67],[0,73]],6,sp);}
  K.lathe('slate',tu,0,[[5.2,64.4],[0.3,97],[0,98]],8,Object.assign({ph:Math.PI/8},sp));K.lathe('plain',tu,0,[[0.5,95.5],[0.5,96.3],[0.05,99.5]],6,{col:0xc9a33f});
  K.plane('plain',hu,0,0,3.6,7.5,1,0,{col:0x3a2416});K.plane('plain',hu+0.01,0,7.5,4.6,0.6,1,0,{col:stone});
  // zwei Westtürmchen und zwei Chortürme
  for(const e of [-1,1]){K.box('brick',hu-2.4,e*11.2,4.6,4.6,0,34,{solid:true,topK:'plain',topCol:0x555b62});K.lathe('slate',hu-2.4,e*11.2,[[2.9,34],[0,48]],8,Object.assign({ph:Math.PI/8},sp));
    K.box('brick',-20,e*10.6,5.4,5.4,0,46,{solid:true,topK:'plain',topCol:0x555b62});K.box('plain',-20,e*10.6,6,6,45.4,0.8,{col:stone});K.lathe('slate',-20,e*10.6,[[3.3,46],[0,66]],8,Object.assign({ph:Math.PI/8},sp));}
  const r=K.done();return Object.assign(r,{F,front:F.w(hu+16,0),label:F.w(0,0)});}

// ---------- Hauptbahnhof Wiesbaden: roter Sandstein, Uhrturm, Querbahnsteighalle, fünfschiffige Bahnsteighalle ----------
function wiwahrHbf(parts){if(!parts.length)return null;const L=parts.slice().sort((a,b)=>b.area-a.area);const hall=L[0];
  const quer=L.find(p=>p!==hall&&p.area>1500&&Math.max(p.obb.lu,p.obb.lv)/Math.min(p.obb.lu,p.obb.lv)>4);
  const smallRound=L.filter(p=>p.area<120&&p.n>=10);
  // Uhrturm: kleiner runder Grundriss am weitesten vor der Halle (Richtung Bahnhofsplatz)
  const HF=wiwahrOrient(hall.obb,'u',WIWAHR_DEFS.hbf.front);const ahead=p=>(p.c[0]-HF.x)*HF.c+(p.c[1]-HF.z)*HF.s;
  const tower=smallRound.sort((a,b)=>ahead(b)-ahead(a))[0];
  const blocks=L.filter(p=>p!==hall&&p!==quer&&p!==tower);
  const entry=tower?blocks.filter(p=>p.area>400).sort((a,b)=>Math.hypot(a.c[0]-tower.c[0],a.c[1]-tower.c[1])-Math.hypot(b.c[0]-tower.c[0],b.c[1]-tower.c[1]))[0]:null;
  const K=wiwahrKit(HF);
  // Bahnsteighalle: fünf Tonnendächer auf Stützen (offen, unten frei begehbar)
  const nS=5,span=HF.lv/nS;for(let i=0;i<nS;i++){const v=-HF.lv/2+(i+0.5)*span;K.vault('hall',0,v,HF.lu,span,10,6.5,10,{col:0xffffff});}
  for(let i=0;i<=nS;i++){const v=-HF.lv/2+i*span;K.box('metal',0,v,HF.lu,0.5,9.4,0.6,{col:0x59626a});for(let u=-HF.lu/2+4;u<=HF.lu/2-2;u+=16){K.box('metal',u,v,0.45,0.45,0,9.6,{col:0x59626a,top:false});const q=HF.w(u,v);K.solids.push({k:'circ',x:q[0],z:q[1],r:0.35,h:9.6});}}
  // Querbahnsteighalle: Satteldach aus Glas auf Stützen
  if(quer){const QF=wiwahrOrient(quer.obb,'u',[1,0]);const Q=wiwahrKit(QF);Q.gable('hall',0,0,QF.lu,QF.lv+1,12,5,{col:0xffffff,gableK:'hbf',tile:4});
    for(const e of [-1,1]){Q.box('metal',0,e*QF.lv/2,QF.lu,0.5,11.4,0.6,{col:0x59626a});for(let u=-QF.lu/2+3;u<=QF.lu/2-2;u+=12)Q.box('metal',u,e*QF.lv/2,0.5,0.5,0,11.6,{col:0x59626a,top:false});}
    K.sub=Q.done();}
  // Empfangsgebäude: echte Grundrisse hochgezogen, Walm-/Satteldächer aus Schiefer
  for(const p of blocks){const o=p.obb,full=p.area/(o.lu*o.lv),isEntry=p===entry;const h=isEntry?19:p.area>=600?16:p.area>=150?14:p.area<70?15:12;
    K.prism('hbf',p.P,p.sa,0,h,{solid:true,topK:'plain',topCol:0x6c6660});K.prism('plain',wiwahrInset(p.P,p.sa,-0.35),1,h-0.6,0.6,{col:0xc98a6c,topK:'plain',topCol:0x6c6660});
    if(full>0.8){const BF=wiwahrOrient(o,'u',[1,0]);const B=wiwahrKit(BF);
      if(isEntry)B.gable('copper',0,0,BF.lu,BF.lv+0.6,h,7.5,{col:0xffffff,gableK:'hbf',yb:0});
      else if(BF.lu/BF.lv>2.2)B.gable('slate',0,0,BF.lu+0.4,BF.lv+0.6,h,Math.min(5,BF.lv*0.35),{col:0x7a8086,gableK:'hbf'});
      else B.roof4('slate',0,0,BF.lu+0.6,BF.lv+0.6,h,Math.min(5,BF.lv*0.4),Math.min(BF.lu,BF.lv)*0.45,{col:0x7a8086});
      (K.subs=K.subs||[]).push(B.done());}}
  // Uhrturm mit Zifferblättern und geschwungener Haube
  if(tower){const TF=wiwahrOrient(entry?entry.obb:tower.obb,'u',[1,0]);const TK=wiwahrKit(wiwahrFrame(tower.c[0],tower.c[1],TF.ang));const w=Math.max(6.5,Math.sqrt(tower.area)*1.05);
    TK.box('hbf',0,0,w,w,0,38,{solid:true,topK:'plain',topCol:0x6c6660});TK.box('plain',0,0,w+0.8,w+0.8,37.4,0.8,{col:0xc98a6c});
    for(const [du,dv] of [[1,0],[-1,0],[0,1],[0,-1]])TK.plane('clock',du*w/2,dv*w/2,31,4.2,4.2,du,dv);
    const R=w/2*Math.SQRT2+0.4;TK.lathe('copper',0,0,[[R,38.2],[R*0.9,40.5],[R*0.55,42.5],[R*0.62,43.6],[0.9,46.5]],4,{ph:Math.PI/4,col:0xffffff});
    TK.lathe('plain',0,0,[[0.9,46.5],[0.9,48.3],[1.2,48.3],[0,50.5]],8,{col:0xc9a33f});K.tw=TK.done();}
  const r=K.done();for(const s of [K.sub,K.tw,...(K.subs||[])])if(s){for(let a=0;a<3;a++){r.bbox[a]=Math.min(r.bbox[a],s.bbox[a]);r.bbox[a+3]=Math.max(r.bbox[a+3],s.bbox[a+3]);}r.meshes.push(...s.meshes);}
  const tc=tower?tower.c:HF.w(HF.lu/2+40,0);const fwd=HF.dir(1,0);
  return Object.assign(r,{F:HF,front:[tc[0]+fwd[0]*28,tc[1]+fwd[1]*28],label:tc,hall:[HF.x,HF.z]});}
// Polygon um s nach innen (s>0) bzw. außen (s<0) versetzen, Ergebnis mit positiver Fläche – für Gesimse
function wiwahrInset(P,sa,s){return insetRing(sa>0?P:P.slice().reverse(),s);}

// ---------- Biebricher Schloss: Rotunde mit Kuppel und Figuren, Galerien, Pavillons mit Mansarddächern, am Rhein ----------
function wiwahrBiebrich(parts){if(!parts.length)return null;
  const rot=parts.filter(p=>p.area>150&&p.n>=14&&Math.abs(p.obb.lu-p.obb.lv)<2.5).sort((a,b)=>b.area-a.area)[0];
  const RF=wiwahrFrame(rot?rot.c[0]:-2852.5,rot?rot.c[1]:-4294.4,0);const K=wiwahrKit(RF);const trim=0xf0e9de;
  for(const p of parts){if(p===rot)continue;const o=p.obb,full=p.area/(o.lu*o.lv),h=p.area>550?13:p.area>100?10.5:10;
    K.prism('schloss',p.P,p.sa,0,h,{solid:true,topK:'plain',topCol:0x5d646c});K.prism('plain',wiwahrInset(p.P,p.sa,-0.3),1,h-0.6,0.6,{col:trim,topK:'plain',topCol:0x5d646c});
    if(full>0.78&&p.area>100){const BF=wiwahrOrient(o,'u',[1,0]);const B=wiwahrKit(BF);const lv=Math.min(BF.lv,BF.lu);
      B.roof4('slate',0,0,BF.lu+0.4,BF.lv+0.4,h,p.area>550?5.5:3.4,lv*0.32,{col:0x6f7a86,topK:'slate'});(K.subs=K.subs||[]).push(B.done());}}
  if(rot){const R=Math.sqrt(rot.area/Math.PI);
    K.lathe('schloss',0,0,[[R,0],[R,15]],28,{solid:true});K.lathe('plain',0,0,[[R+0.5,15],[R+0.5,15.8],[R-0.2,15.8]],28,{col:trim});
    K.lathe('plain',0,0,[[R-0.2,15.8],[R-0.2,17]],28,{col:0xe8e0d2});
    const dome=[];for(let i=0;i<=7;i++){const a=i/7*Math.PI/2;dome.push([(R-0.8)*Math.cos(a),17+6.2*Math.sin(a)]);}dome[7][0]=1.2;K.lathe('copper',0,0,dome,28,{col:0xffffff});
    K.lathe('plain',0,0,[[1.2,23.2],[1.2,24.6],[0,26]],8,{col:0xe8e0d2});
    for(let i=0;i<12;i++){const a=i/12*TAU;K.lathe('plain',Math.cos(a)*(R-0.2),Math.sin(a)*(R-0.2),[[0.42,17],[0.34,18.2],[0.22,18.5],[0.27,18.8],[0,19.15]],6,{col:0xe2dccf});}}
  const r=K.done();for(const s of K.subs||[]){for(let a=0;a<3;a++){r.bbox[a]=Math.min(r.bbox[a],s.bbox[a]);r.bbox[a+3]=Math.max(r.bbox[a+3],s.bbox[a+3]);}r.meshes.push(...s.meshes);}
  const f=WIWAHR_DEFS.biebrich.front,fl=Math.hypot(f[0],f[1]);
  return Object.assign(r,{F:RF,front:[RF.x+f[0]/fl*26,RF.z+f[1]/fl*26],label:[RF.x,RF.z]});}

function wiwahrBuild(){if(WIWAHR.built)return;WIWAHR.built=true;const parts=wiwahrParts();
  const B={kurhaus:wiwahrKurhaus,marktkirche:wiwahrMarktkirche,hbf:wiwahrHbf,biebrich:wiwahrBiebrich};
  for(const k in B){const def=WIWAHR_DEFS[k];let r=null;try{r=B[k](parts[k]);}catch(e){console.warn('Wahrzeichen '+k+':',e);}if(!r)continue;const bb=r.bbox;
    WIWAHR.models[k]={name:def.name,x:(bb[0]+bb[3])/2,z:(bb[2]+bb[5])/2,height:bb[4],bbox:bb,meshes:r.meshes.length,ang:r.F.ang,osm:wiwahrCentroid(parts[k])||def.fb,osmFound:parts[k].length>0,parts:parts[k].length,gids:def.gids,core:r.label,door:r.door||null,hall:r.hall||null};
    WIWAHR.positions[k]=r.front;label(def.name,r.label[0],r.label[1],'lm');}}
// in die Weltgenerierung einhängen: läuft vor dem Rastern von SOLIDS und vor der Übersichtskarte
const _wiwahrBuildLandmarks=buildLandmarks;
buildLandmarks=function(){_wiwahrBuildLandmarks();wiwahrBuild();};

// ---------- Kurhaus innen: Foyer unter der Kuppel + großer Saal (Platzhalter für die Spielbank aus Paket 28) ----------
WIWAHR.hall={x0:-13,x1:13,z0:-22,z1:6};   // lokale Fläche im Saal, die frei bleibt
WIWAHR.venue={id:'kurhaus',name:'Kurhaus Wiesbaden',sub:'Foyer unter der Kuppel · Großer Saal · Spielbank bald',W:36,D:56,H:16,wall:0xd8cbb0,ceil:0xefe6d2,noCeil:true,hemiI:0.5,exp:0.9,lampI:30,lampD:28,
  lights:[[0,12,19],[0,10,-2],[0,10,-16],[-12,8,-9],[12,8,-9],[0,6,24]],
  wp:[[0,22],[-5,17],[5,17],[0,6],[-8,-2],[8,-2],[0,-10],[-8,-18],[8,-18],[0,-21]],
  spawn:[0,25.5,Math.PI],exits:[{x:0,z:27.6,w:2,d:0.8,to:'door'}],
  hints:[{x:0,z:19,r:4,t:'Das Foyer unter der Kuppel – schau nach oben.'},{x:0,z:-8,r:6,t:'Der große Saal. Hier zieht bald die Spielbank ein.'},{x:-14,z:19,r:3,t:'Die Garderobe. Heut ohne Marke.'}],
  build(r,B){r.grp.children[0].material=stdMat({map:marbleTex,roughness:0.35});const W=36,H=16,wall=0xd6c9ad;
    // Trennwand Foyer | Saal mit breitem Durchgang
    B.sbox('stone',-11.5,0,10,13,H,0.8,wall);B.sbox('stone',11.5,0,10,13,H,0.8,wall);B.box('stone',0,8.5,10,10,H-8.5,0.8,wall);B.box('gold',0,8.2,10.45,10.4,0.3,0.1,0xd4af37);
    // Decke: Saal flach, Foyer mit Öffnung zur Kuppel; negative Höhe → Deckfläche zeigt nach unten (sonst von innen unsichtbar)
    const ceil=(x,z,w,d)=>B.box('stone',x,H+0.3,z,w,-0.3,d,0xefe6d2);ceil(0,-9,W,38);ceil(-13,19,10,18);ceil(13,19,10,18);ceil(0,27.5,16,1);ceil(0,10.5,16,1);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(8,32,14,0,TAU,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xf1e6cf,roughness:0.6,side:THREE.BackSide}));dome.position.set(0,H,19);B.mesh(dome);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(8,0.25,8,48),new THREE.MeshStandardMaterial({color:0xd4af37,roughness:0.3,metalness:0.8}));ring.rotation.x=Math.PI/2;ring.position.set(0,H+0.2,19);B.mesh(ring);
    for(let k=0;k<12;k++){const a=k/12*TAU;B.box('glow',Math.cos(a)*7.7,H+1,19+Math.sin(a)*7.7,0.5,1.6,0.5,0xfff1c9);}B.box('glow',0,H+7.9,19,2,0.1,2,0xfff8e0);
    // Säulenkranz im Foyer
    for(let k=0;k<8;k++){const a=Math.PI/8+k*Math.PI/4,x=Math.cos(a)*7.2,z=19+Math.sin(a)*7.2;B.sbox('stone',x,0,z,1.1,H,1.1,0xefe6d6);B.box('gold',x,H-1,z,1.4,0.5,1.4,0xd4af37);B.box('stone',x,0,z,1.5,0.5,1.5,0xd8ccb4);}
    // Garderobe
    B.sbox('wood',-15.5,0,19,2,1.1,6,0x6b4426);B.box('gold',-15.5,1.1,19,2.1,0.08,6.1,0xd4af37);B.plane(textTex('Garderobe',{w:384,h:96,bg:'#3a2512',fg:'#e9d9a8'}),-17.7,3.4,19,3.2,0.8,Math.PI/2);
    // Saal: Parkett, Säulen, hohe Fenster, Kronleuchter, Bühne
    B.box('wood',0,0,-9,34.4,0.03,37,0x8a5a32);
    for(let z=-24;z<=6;z+=6)for(const s of [-1,1]){B.sbox('stone',s*15.6,0,z,1.2,H,1.2,0xefe6d6);B.box('gold',s*15.6,H-1.2,z,1.5,0.6,1.5,0xd4af37);if(z<6)B.box('glow',s*17.75,3,z+3,0.05,8,2.6,0xfff4dc);}
    for(const z of [-20,-9,2]){const g=new THREE.Mesh(new THREE.TorusGeometry(1.6,0.07,6,24),new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.8,roughness:0.3}));g.rotation.x=Math.PI/2;g.position.set(0,11,z);B.mesh(g);
      for(let k=0;k<12;k++){const a=k/12*TAU;B.box('glow',Math.cos(a)*1.6,11.05,z+Math.sin(a)*1.6,0.08,0.2,0.08,0xfff1c9);}B.box('metal',0,11,z,0.03,5,0.03,0x555555);}
    B.sbox('wood',0,0,-25.6,20,1.0,4.6,0x5a3a22);B.box('cloth',0,1,-27.6,20,9,0.2,0x8a1020);B.box('gold',0,10,-27.5,20.4,0.5,0.3,0xd4af37);
    B.plane(textTex('SPIELBANK – BALD GEÖFFNET',{w:768,h:96,bg:'#1b2a1f',fg:'#ffd23f'}),0,6.5,-27.4,10,1.25,0);
    // Eingangstür
    B.box('wood',0,0,27.75,3.2,4.4,0.3,0x3a2512);B.box('gold',0,4.4,27.7,3.6,0.2,0.3,0xd4af37);},
  npcs(r){vPerson(r,3,24.5,Math.PI,{role:'stand',lines:['Gude! Willkommen im Kurhaus.','Die Spielbank? Die mache mer grad schee. Kommense später widder.','Bitte die Schuh abputze, des is Parkett.','Aus Meenz? Ei, des sieht mer.']});
    const T=['Ei gude wie?','Hier trinkt mer Sekt, kein Schoppe.','Die Kuppel! Do werd mer ganz feierlich.','Mei Oma hat hier schon getanzt.','Babbel net so laut, hier is Kultur!','Wo is dann des Kasino? Isch hab extra mei Glückssocke an.','Wiesbade is halt die schönere Seit vom Rhein. Sag des bloß kaam Meenzer.'];
    for(let k=0;k<7;k++)vPerson(r,mr(-10,10),mr(-20,22),mr(0,6),{lines:T});
    vPerson(r,-14.2,19,Math.PI/2,{role:'stand',lines:['Mantel abgeben? Kost nix. Heut.','Garderobe is hier, net im Saal.']});},
  onEnter(){venueMusic('kurhaus');}};
VENUES.push(WIWAHR.venue);

// ---------- Schnellreise: die vier Wahrzeichen (Gruppe „Wiesbaden“; test_ft zählt die besonderen Orte fest, daher kein Extra-Eintrag dort) ----------
const _wiwahrFtDest=ftDestinations;
ftDestinations=function(){if(FT.list)return FT.list;const L=_wiwahrFtDest();
  for(const k in WIWAHR.positions){const p=WIWAHR.positions[k];if(!p||L.some(d=>d.n===WIWAHR_DEFS[k].name))continue;const d={n:WIWAHR_DEFS[k].name,g:'Wiesbaden',x:p[0],z:p[1]};L.push(d);WIWAHR.ft.push(d);}
  return L;};

function setupWiWahr(){const m=WIWAHR.models.kurhaus,v=WIWAHR.venue;
  if(m&&m.door&&!v.door){const [a,b]=m.door;v.door=rayDoor(a[0],a[1],b[0],b[1]);}
  if(v.door&&!v.labeled){v.labeled=true;label(v.name+' (begehbar)',v.door[0],v.door[1],'small');}}
function updateWiWahr(dt){}
