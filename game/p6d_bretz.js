// ===================== 37 Detail: Bretzenheim, Zahlbach + Uni-Campus (Mainz) =====================
// Römersteine (Aquädukt-Reste) in Zahlbach, Uni-Campus mit begehbarer Zentralmensa und Hörsaal, Fahrradständer,
// Ortskern Alt-Bretzenheim mit Weinstubb-Fassaden und Mundart-Szenen, Schnellreise-Ziele.
// Lage aus den OSM-Namen in p1_osm.js; die Konstanten greifen nur, falls ein Name fehlt.
const BRETZ={built:false,campus:{mensa:null,hoersaal:null,bikes:0,racks:0,props:[],signs:0},roemersteine:null,scenes:[],ft:[],taverns:[],meshes:[],mem:null};
const BRETZ_GROUP='Bretzenheim & Uni';
const bretzLL=(lat,lon)=>[(lon-8.2740)*71540,-(lat-49.9988)*111200];
// Römersteine: 49.989323 N, 8.250718 E (vici.org / Pleiades)
const BRETZ_RS_POS=bretzLL(49.989323,8.250718);
const BRETZ_FALLBACK={mensa:[-2875,775],atrium:[-2030,510],forum:[-2077,422],philo:[-2470,500],biblio:[-2310,410],ortskern:[-2152,1823]};

// ---------- Hilfsfunktionen ----------
function bretzAdd(m,cast=true){m.castShadow=cast;m.receiveShadow=true;scene.add(m);BRETZ.meshes.push(m);return m;}
function bretzStatic(gb,mat,cast=true){if(gb.empty)return null;const m=new THREE.Mesh(gb.geo(),mat);return staticMesh(bretzAdd(m,cast));}
function bretzInst(geo,mat,list,colors){if(!list.length)return null;const im=new THREE.InstancedMesh(geo,mat,list.length);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  list.forEach((o,i)=>{q.setFromAxisAngle(up,o.face||0);p.set(o.x,o.y||0,o.z);m.compose(p,q,s);im.setMatrixAt(i,m);if(colors)im.setColorAt(i,new THREE.Color(colors[i]));});
  im.computeBoundingSphere();return staticInst(bretzAdd(im));}
// Senkrechtes Rechteck mit Normale [sin face, cos face], in Weltkoordinaten gebaut, damit das statische LOD die richtige Lage sieht
function bretzQuad(gb,cx,y0,cz,w,h,face){const rx=Math.cos(face),rz=-Math.sin(face);const a=[cx-rx*w/2,y0,cz-rz*w/2],b=[cx+rx*w/2,y0,cz+rz*w/2];
  gb.quad(a,b,[b[0],y0+h,b[2]],[a[0],y0+h,a[2]],[0,0],[1,0],[1,1],[0,1]);}
function bretzFree(x,z,r=0.6){for(const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){const i=idx(x+dx,z+dz);if(i<0||hgG(i)!==0||(mfG(i)&6))return false;}return true;}
function bretzTex(w,h,draw){BRETZ.texPx=(BRETZ.texPx||0)+w*h;return freeAfterUpload(canvasTex(w,h,draw,false));}
function bretzBuildings(name){return BUILDINGS.filter(b=>b.name===name);}
function bretzCentroid(list,fb){if(!list.length)return fb;let A=0,x=0,z=0;for(const b of list){A+=b.area;x+=b.x*b.area;z+=b.z*b.area;}return [x/A,z/A];}
// Erster Wandtreffer des Strahls (fx,fz)+t·(dx,dz) an den Gebäude-Polygonen: {t,x,z,ex,ez,len,u,b}
function bretzRayWall(fx,fz,dx,dz,list,maxT=400){let best=null;for(const b of list){for(const ring of [b.poly,...(b.holes||[])]){for(let i=0,j=ring.length-1;i<ring.length;j=i++){const ax=ring[j][0],az=ring[j][1],ex=ring[i][0]-ax,ez=ring[i][1]-az;
  const den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const t=((ax-fx)*ez-(az-fz)*ex)/den,u=((ax-fx)*dz-(az-fz)*dx)/den;if(t<0.05||t>maxT||u<0||u>1)continue;
  if(!best||t<best.t){const len=Math.hypot(ex,ez);best={t,x:fx+dx*t,z:fz+dz*t,ex:ex/len,ez:ez/len,len,u,b};}}}}return best;}
// Eingang an der Wand, die zum Bezugspunkt zeigt: [x,z,face] (face zeigt aus dem Gebäude heraus)
function bretzDoor(list,refs,fb){const c=bretzCentroid(list,fb);const tries=refs.slice();for(let k=0;k<16;k++){const a=k/16*TAU;tries.push([c[0]+Math.sin(a)*90,c[1]+Math.cos(a)*90]);}
  for(const r of tries){if(!list.length)break;const L=Math.hypot(c[0]-r[0],c[1]-r[1]);if(L<1)continue;const dx=(c[0]-r[0])/L,dz=(c[1]-r[1])/L;const hit=bretzRayWall(r[0],r[1],dx,dz,list,L+60);if(!hit)continue;
    let nx=-hit.ez,nz=hit.ex;if(nx*(r[0]-hit.x)+nz*(r[1]-hit.z)<0){nx=-nx;nz=-nz;}const x=hit.x+nx*1.0,z=hit.z+nz*1.0;if(!blocked(x,z)&&!blocked(x+nx,z+nz))return [x,z,Math.atan2(nx,nz)];}
  const d=rayDoor(c[0]+60,c[1],c[0],c[1]);return d;}

// ---------- Römersteine ----------
function bretzRoemersteine(){const R=mulberry32(7070);const [cx,cz]=BRETZ_RS_POS;
  // die Pfeilerreihe läuft parallel zur gleichnamigen Straße
  const st=ROADS.filter(r=>r.name==='An den Römersteinen');let ux=0.983,uz=-0.183;
  if(st.length){const pts=st.flatMap(r=>r.pts);let a=pts[0],b=pts[0],bd=0;for(const p of pts)for(const q of pts){const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d>bd){bd=d;a=p;b=q;}}if(bd>50){ux=(b[0]-a[0])/bd;uz=(b[1]-a[1])/bd;if(ux<0){ux=-ux;uz=-uz;}}}
  const rot=Math.atan2(-uz,ux);// lokales x der Box entlang der Reihe (GB.box: x -> [cos rot,-sin rot])
  const gb=new GB(),pillars=[];const N=26,SP=7.4;
  const fits=(x,z)=>{if(treeNear(x,z,2.4))return false;for(const [a,b] of [[0,0],[1.5,1.5],[-1.5,1.5],[1.5,-1.5],[-1.5,-1.5]]){const i=idx(x+a,z+b);if(i<0||hgG(i)!==0||(mfG(i)&6))return false;}return true;};
  for(let k=0;k<N;k++){const s0=(k-(N-1)/2)*SP;const w=2.6+R()*0.5,d=2.9+R()*0.4;let x=0,z=0,ok=false;
    // Bäume aus OSM stehen zwischen den Pfeilern: Pfeiler leicht verschieben statt durch den Stamm bauen
    for(const o of [0,1.6,-1.6,3.2,-3.2]){x=cx+ux*(s0+o);z=cz+uz*(s0+o);if(fits(x,z)){ok=true;break;}}if(!ok)continue;
    const h=k%9===4?7.5+R()*1.5:2.2+R()*4.8;const v=0.82+R()*0.14;const col={r:0.66*v,g:0.6*v,b:0.52*v};const dk=f=>({r:col.r*f,g:col.g*f,b:col.b*f});
    // Gusskern in drei Lagen, nach oben schmaler und versetzt – die Quaderverkleidung fehlt, die Krone ist ausgefranst
    const h1=h*0.62,h2=h*0.26;gb.box(x,0,z,w,h1,d,rot+(R()-0.5)*0.06,col,2);
    gb.box(x+(R()-0.5)*0.4,h1,z+(R()-0.5)*0.4,w*(0.78+R()*0.15),h2,d*(0.8+R()*0.15),rot+(R()-0.5)*0.15,dk(0.95),2);
    gb.box(x+(R()-0.5)*0.6,h1+h2,z+(R()-0.5)*0.6,w*(0.45+R()*0.25),h-h1-h2+0.3,d*(0.5+R()*0.25),rot+(R()-0.5)*0.5,dk(0.9),2);
    if(R()<0.5)gb.box(x+(R()-0.5)*w*0.6,h1-0.2,z+(R()-0.5)*d*0.6,0.7,0.5+R()*0.6,0.6,rot+R(),dk(0.88),2);
    gb.box(x,0,z,w+0.5,0.35,d+0.5,rot,{r:0.45,g:0.42,b:0.36},2);// Sockel im Gras
    rasterOBB(HG,x,z,w,d,rot,Math.min(254,Math.round(h)));pillars.push({x,z,h:Math.round(h*10)/10});}
  const tex=bretzTex(128,128,(g)=>{g.fillStyle='#bdb3a2';g.fillRect(0,0,128,128);const Q=mulberry32(5);for(let i=0;i<260;i++){const v=150+Q()*80|0;g.fillStyle=`rgb(${v},${v-8},${v-22})`;const r=2+Q()*6;g.beginPath();g.ellipse(Q()*128,Q()*128,r,r*0.7,Q()*3,0,TAU);g.fill();}
    g.fillStyle='rgba(60,50,40,0.25)';for(let i=0;i<500;i++)g.fillRect(Q()*128,Q()*128,1.5,1.5);});
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  bretzStatic(gb,stdMat({map:tex,vertexColors:true,roughness:0.97}));
  // Infotafel am Ostende, auf der Straßenseite der Reihe
  const nx=uz,nz=-ux;let sgn=1;if(st.length){let bp=null,bd=1e9;for(const r of st)for(const p of r.pts){const d=Math.hypot(p[0]-cx,p[1]-cz);if(d<bd){bd=d;bp=p;}}if((bp[0]-cx)*nx+(bp[1]-cz)*nz<0)sgn=-1;}// Straßenseite
  const ex=cx+ux*((N-1)/2*SP+6)+nx*4*sgn,ez=cz+uz*((N-1)/2*SP+6)+nz*4*sgn;const [bx,bz]=bretzFree(ex,ez,1)?[ex,ez]:freeSpot(ex,ez,0.8);
  const face=Math.atan2(nx,nz);const post=new GB();for(const o of [-0.8,0.8])post.box(bx+Math.cos(face)*o,0,bz-Math.sin(face)*o,0.1,1.2,0.1,face,{r:0.25,g:0.25,b:0.27},1);post.box(bx,1.15,bz,1.9,1.15,0.06,face,{r:0.2,g:0.22,b:0.24},1);
  bretzStatic(post,stdMat({vertexColors:true,roughness:0.6}));
  const ttex=bretzTex(512,320,(g)=>{g.fillStyle='#f3efe4';g.fillRect(0,0,512,320);g.fillStyle='#7a2a1e';g.fillRect(0,0,512,70);g.fillStyle='#fff';g.font='800 50px "Barlow Condensed",Arial Narrow,sans-serif';g.textAlign='center';g.fillText('RÖMERSTEINE',256,52);
    g.fillStyle='#222';g.font='500 27px "Barlow Condensed",Arial Narrow,sans-serif';['Pfeilerreste der römischen Wasserleitung','(um 70 n. Chr.) von den Quellen bei Finthen','und Drais zum Legionslager auf dem Kästrich.','Rund 9 km lang, im Zahlbachtal auf Bögen','bis zu 30 m hoch. Die Quader-Verkleidung','holten sich später die Mainzer als Baustoff.'].forEach((t,i)=>g.fillText(t,256,108+i*35));});
  const tg=new GB();bretzQuad(tg,bx+Math.sin(face)*0.04,1.2,bz+Math.cos(face)*0.04,1.8,1.05,face);bretzStatic(tg,stdMat({map:ttex,roughness:0.7}),false);
  label('Römersteine',cx,cz,'small');
  BRETZ.roemersteine={x:cx,z:cz,ux,uz,n:pillars.length,pillars,board:[bx,bz,face],side:[nx*sgn,nz*sgn]};}

// ---------- Uni-Campus ----------
const BRETZ_BIKE_COLS=[0x2a6f97,0xb3202a,0x222222,0xe8e8e8,0x3f7a2a,0xf4c430,0x7a4b9a,0xd2691e,0x8c949c,0x1d3557];
function bretzBikeGeos(){const fr=new GB(),ti=new GB();const W={r:1,g:1,b:1};const R=0.33,seg=10;
  for(const wz of [-0.52,0.52]){for(let k=0;k<seg;k++){const a0=k/seg*TAU,a1=(k+1)/seg*TAU;ti.beam([0,0.34+Math.sin(a0)*R,wz+Math.cos(a0)*R],[0,0.34+Math.sin(a1)*R,wz+Math.cos(a1)*R],0.05,0.06,{r:0.08,g:0.08,b:0.09});}}
  const P=(y,z)=>[0,y,z];fr.beam(P(0.34,-0.52),P(0.36,0),0.04,0.04,W);fr.beam(P(0.36,0),P(0.9,0.38),0.045,0.045,W);fr.beam(P(0.36,0),P(0.86,-0.12),0.04,0.04,W);fr.beam(P(0.86,-0.12),P(0.9,0.38),0.04,0.04,W);
  fr.beam(P(0.34,-0.52),P(0.86,-0.12),0.03,0.03,W);fr.beam(P(0.34,0.52),P(0.9,0.38),0.035,0.035,W);fr.beam(P(0.9,0.38),P(1.05,0.36),0.035,0.035,W);
  fr.box(0,1.05,0.36,0.55,0.03,0.04,0,{r:0.15,g:0.15,b:0.15},1);fr.box(0,0.93,-0.14,0.12,0.05,0.26,0,{r:0.1,g:0.1,b:0.1},1);
  const rack=new GB();const st={r:0.62,g:0.64,b:0.66};rack.beam([0,0,-0.4],[0,0.75,-0.4],0.05,0.05,st);rack.beam([0,0,0.4],[0,0.75,0.4],0.05,0.05,st);rack.beam([0,0.75,-0.4],[0,0.75,0.4],0.05,0.05,st);
  return {frame:fr.geo(),tires:ti.geo(),rack:rack.geo()};}
function bretzBikeRows(door,R,bikes,racks){const [dx,dz,face]=door;const nx=Math.sin(face),nz=Math.cos(face),tx=Math.cos(face),tz=-Math.sin(face);let n=0;
  for(const side of [-1,1]){for(let k=0;k<16;k++){const s=side*(4+k*0.8),o=4.5;const x=dx+tx*s+nx*o,z=dz+tz*s+nz*o;if(!bretzFree(x,z,0.5)||!bretzFree(x+nx*0.9,z+nz*0.9,0.3))break;
    bikes.push({x:x+nx*0.2,z:z+nz*0.2,face:face+Math.PI+(R()-0.5)*0.12,col:BRETZ_BIKE_COLS[(R()*BRETZ_BIKE_COLS.length)|0]});if(k%2===0)racks.push({x:x-nx*0.3,z:z-nz*0.3,face});n++;}}
  return n;}
function bretzSignBoard(gb,x,z,face,w,h,y0){bretzQuad(gb,x,y0,z,w,h,face);}
function bretzCampus(){const R=mulberry32(4711);
  const mensaB=bretzBuildings('Zentralmensa'),atrB=bretzBuildings('Alte Mensa / Atrium Maximum'),forumB=bretzBuildings('Forum Universitatis'),philoB=bretzBuildings('Philosophicum'),bibB=bretzBuildings('Zentralbibliothek');
  const terrace=(AREAS.find(a=>a.name==='Außenbereich Zentralmensa')||{}).poly;const tc=terrace?polyCentroid(terrace):[BRETZ_FALLBACK.mensa[0]+44,BRETZ_FALLBACK.mensa[1]-20];
  const forumC=bretzCentroid(forumB,BRETZ_FALLBACK.forum);
  const doors={mensa:bretzDoor(mensaB,[tc],BRETZ_FALLBACK.mensa),atrium:bretzDoor(atrB,[forumC],BRETZ_FALLBACK.atrium),philo:bretzDoor(philoB,[forumC,bretzCentroid(bibB,BRETZ_FALLBACK.biblio)],BRETZ_FALLBACK.philo),biblio:bretzDoor(bibB,[forumC],BRETZ_FALLBACK.biblio)};
  BRETZ.campus.doors=doors;
  // Fahrradständer: viele Räder, drei instanzierte Draw-Calls für alle
  const bikes=[],racks=[];for(const k of ['mensa','atrium','philo','biblio'])bretzBikeRows(doors[k],R,bikes,racks);
  const G=bretzBikeGeos();
  const fm=bretzInst(G.frame,stdMat({roughness:0.45,metalness:0.4}),bikes,bikes.map(b=>b.col));bretzInst(G.tires,stdMat({color:0x111111,roughness:0.9}),bikes);bretzInst(G.rack,stdMat({color:0x9aa0a6,roughness:0.4,metalness:0.6}),racks);
  for(const b of racks)rasterOBB(HG,b.x,b.z,0.3,1.6,b.face,1);
  BRETZ.campus.bikes=bikes.length;BRETZ.campus.racks=racks.length;BRETZ.campus.props.push({kind:'bike',n:bikes.length,inst:fm},{kind:'rack',n:racks.length});
  // generische Beschilderung (nur Text, kein Logo)
  const signs=[['ZENTRALMENSA',doors.mensa,'#0f4c81'],['HÖRSAAL · ATRIUM MAXIMUM',doors.atrium,'#0f4c81'],['PHILOSOPHICUM',doors.philo,'#0f4c81'],['ZENTRALBIBLIOTHEK',doors.biblio,'#0f4c81']];
  const plate=new GB();for(const [txt,d,bg] of signs){const t=textTex(txt,{w:512,h:80,bg,fg:'#ffffff',font:'700 48px "Barlow Condensed",Arial Narrow,sans-serif'});freeAfterUpload(t);BRETZ.texPx=(BRETZ.texPx||0)+512*80;
    const nx=Math.sin(d[2]),nz=Math.cos(d[2]);const g=new GB();bretzQuad(g,d[0]-nx*0.5,3.1,d[1]-nz*0.5,4.2,0.66,d[2]);bretzStatic(g,stdMat({map:t,roughness:0.5}),false);
    plate.box(d[0]-nx*0.56,3.0,d[1]-nz*0.56,4.4,0.86,0.06,d[2],{r:0.85,g:0.86,b:0.88},1);plate.box(d[0]-nx*0.62,0,d[1]-nz*0.62,2.2,2.7,0.5,d[2],{r:0.22,g:0.3,b:0.38},1);}
  // Haupteingang: freistehende Steinstele
  const stop=(()=>{for(let i=0;i<OSM.stops.length;i+=3)if(ONAME(OSM.stops[i+2])==='Universität / Haupteingang')return [OSM.stops[i]/10,OSM.stops[i+1]/10];return null;})();
  const sp=stop||[forumC[0]+40,forumC[1]-40];const [sx,sz]=freeSpot(sp[0]+(forumC[0]-sp[0])*0.08,sp[1]+(forumC[1]-sp[1])*0.08,1.6);const sf=Math.atan2(sp[0]-forumC[0],sp[1]-forumC[1]);
  plate.box(sx,0,sz,3.4,1.6,0.6,sf,{r:0.78,g:0.76,b:0.72},2);rasterOBB(HG,sx,sz,3.4,0.6,sf,2);
  bretzStatic(plate,stdMat({vertexColors:true,roughness:0.8}));
  const st=bretzTex(512,192,(g)=>{g.fillStyle='#c8c2b8';g.fillRect(0,0,512,192);g.fillStyle='#1d2a3a';g.textAlign='center';g.font='800 64px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText('UNIVERSITÄT',256,80);g.font='600 34px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText('Campus · Forum · Mensa · Hörsäle',256,140);});
  const sg=new GB();bretzQuad(sg,sx+Math.sin(sf)*0.31,0.25,sz+Math.cos(sf)*0.31,3.2,1.2,sf);bretzStatic(sg,stdMat({map:st,roughness:0.8}),false);
  BRETZ.campus.signs=signs.length+1;BRETZ.campus.stele=[sx,sz];BRETZ.campus.forum=forumC;}

// ---------- begehbare Orte: Zentralmensa + Hörsaal ----------
const BRETZ_MENSA_STUD=['Schnitzel „Hausmacher Art“ – ich will gar net wisse, wessen Haus.','Heut gibt’s Grie Soß. Oder warn des Kartoffel mit Grie Soß?','Des Veggie-Curry is so scharf, des hätt mei Klausur verdient.',
  'Ich ess hier seit acht Semester. Mei Mage hat schon en Bachelor.','Nachtisch is Wackelpudding. Der wackelt, weil er Angst hat.','Wer hat mei Tablett? Do war mei Spundekäs druff!',
  'Mensakart leer. Kann ich mit Pfandflasche zahle?','Die Pommes sin heut knusprisch! Gestern aach – vom Vortach.','Freitag gibt’s Fisch. Der Fisch weiß des noch net.'];
const BRETZ_MENSA_STAFF=['Kelle oder halbe Kelle?','Nächster! Un net drängle!','Soß kost extra. Spaß. Oder?','Des is kein Eintopf, des is e Überraschung.','Nachschlag gibt’s nur mit Lächeln.'];
const BRETZ_KASSE=['Zwei achtzig. Studentenausweis?','Die Kart, bitte. Net die Bibliothekskart!','Des Tablett bleibt hier, gell!'];
function bretzMenuTex(){return bretzTex(512,256,(g)=>{g.fillStyle='#14281d';g.fillRect(0,0,512,256);g.strokeStyle='#c9a227';g.lineWidth=6;g.strokeRect(6,6,500,244);g.fillStyle='#ffd23f';g.textAlign='center';g.font='800 40px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText('HEUTE IN DER MENSA',256,50);
  g.fillStyle='#f2f2ea';g.font='500 28px "Barlow Condensed",Arial Narrow,sans-serif';g.textAlign='left';
  [['Schnitzel „Hausmacher Art“','2,80'],['Grie Soß mit Kartoffeln','2,40'],['Veggie-Curry (scharf!)','2,60'],['Pommes vom Vortag, frisch','1,50'],['Wackelpudding, nervös','0,90']].forEach(([a,b],i)=>{g.fillText(a,30,98+i*33);g.textAlign='right';g.fillText(b+' €',482,98+i*33);g.textAlign='left';});});}
function bretzTray(h){const t=new THREE.Mesh(_mkG.box,_mkM.red);t.scale.set(0.45,0.03,0.32);t.position.set(-0.05,-0.62,0.22);h.armR.add(t);}
VENUES.push({id:'bretz_mensa',name:'Zentralmensa',sub:'Uni-Campus · Essen für alle, die müssen',W:30,D:22,H:5.5,wall:0xe8e4dc,ceil:0xf4f4f0,hemiI:0.75,exp:1.0,lampI:26,lampD:24,
  lights:[[-8,4.6,-5],[8,4.6,-5],[-8,4.6,5],[8,4.6,5]],wp:[[-12,-2],[-12,8],[0,-2],[0,8],[12,-2],[12,8],[-6,3],[6,3],[3,-5],[-3,-5]],
  spawn:[0,8.6,Math.PI],exits:[{x:0,z:10.6,w:1.6,d:0.8,to:'door'}],
  hints:[{x:0,z:-7,r:4,t:'Die Essensausgabe. Heute: alles mit Soß.'},{x:9,z:-4.5,r:2.5,t:'Die Kasse. Zwei achtzig, egal was.'}],
  build(r,B){r.grp.children[0].material=stdMat({color:0xb9b2a5,roughness:0.5});
    B.sbox('metal',-3,0,-8.4,18,1.0,1.3,0x9aa3ab);B.box('metal',-3,1.0,-8.4,18,0.06,1.4,0xc9ccd2);
    const food=[0xd98c2b,0x7a4b2a,0x4f8a3a,0xf0c94a,0xc23b22,0xe8dcc0];for(let k=0;k<12;k++)B.box('cloth',-11+k*1.45,1.03,-8.4,1.1,0.12,0.7,food[k%food.length]);
    B.box('glow',-3,2.3,-8.4,18,0.06,0.5,0xfff2c0);B.box('metal',-3,2.32,-8.6,18,0.04,0.9,0x8c949c);
    B.plane(bretzMenuTex(),-3,3.1,-10.75,6,3,0);
    B.sbox('wood',9,0,-4.6,2.2,1.0,1.0,0x5a6b7a);B.box('dark',9,1.0,-4.6,0.5,0.35,0.4,0x222222);// Kasse
    B.sbox('metal',12.5,0,-8.6,3,1.1,1.2,0x8c949c);for(let k=0;k<8;k++)B.box('cloth',12.5,1.1+k*0.035,-8.6,0.5,0.03,0.36,0xb3202a);// Tablettstapel
    for(const x of [-10,-5,0,5,10])for(const z of [-1.5,3,7]){B.sbox('wood',x,0,z,3,0.76,1.1,0xd8d2c4);for(const s of [-1,1])for(const o of [-0.8,0.8])B.box('cloth',x+o,0,z+s*0.85,0.45,0.45,0.45,0x2a6f97);}
    B.box('wood',0,0,10.9,2.4,2.6,0.2,0x2a6f97);B.box('glow',0,2.65,10.9,2.4,0.3,0.1,0xeaf6ff);},
  npcs(r){vPerson(r,-6,-9.6,0,{role:'stand',lines:BRETZ_MENSA_STAFF});vPerson(r,1,-9.6,0,{role:'stand',lines:BRETZ_MENSA_STAFF});vPerson(r,9,-5.5,0,{role:'stand',lines:BRETZ_KASSE});
    const seats=[];for(const x of [-10,-5,0,5,10])for(const z of [-1.5,3,7])for(const s of [-1,1])seats.push([x+(s>0?0.8:-0.8),z+s*0.85,s>0?Math.PI:0]);
    const R=mulberry32(99);for(let k=0;k<10;k++){const i=(R()*seats.length)|0;const [x,z,f]=seats.splice(i,1)[0];vPerson(r,x,z,f,{pose:'sit',lines:BRETZ_MENSA_STUD});}
    for(let k=0;k<3;k++)bretzTray(vPerson(r,-12+k*6,9-k,Math.PI,{lines:BRETZ_MENSA_STUD}));},
  onEnter(r,P){BRETZ.campus.mensaVisits=(BRETZ.campus.mensaVisits||0)+1;}});
const BRETZ_PROF=['Das ist alles klausurrelevant. Auch das hier.','Wer da hinten schläft: bitte leiser schnarchen.','Die Römer hatten ein Aquädukt. Sie haben nicht mal ein Skript.','Ich seh Sie, da oben mit dem Handy!','Fragen? … Keine? Dann war’s wohl verständlich.'];
const BRETZ_HOER=['Is des klausurrelevant?','Ich bin nur wege der Heizung hier.','Hat jemand e Ladekabel?','Nach der Vorlesung: Mensa oder Weinstubb?','Psst, ich schlaf.','Ich versteh nur Bahnhof. Un ich studier Verkehrswesen.'];
VENUES.push({id:'bretz_hoersaal',name:'Hörsaal im Atrium Maximum',sub:'Uni-Campus · Vorlesung läuft',W:26,D:24,H:8,wall:0xd9d4c8,ceil:0xeeeeea,hemiI:0.65,exp:1.0,lampI:24,lampD:26,
  lights:[[0,7,-8],[-7,7,2],[7,7,2],[0,7,8]],wp:[[-11.5,-6],[-11.5,6],[11.5,-6],[11.5,6],[0,9.5]],
  spawn:[0,9.6,Math.PI],exits:[{x:0,z:11.6,w:1.6,d:0.8,to:'door'}],
  hints:[{x:0,z:-7,r:3.5,t:'Das Pult. Wer hier steht, muss was sagen.'}],
  build(r,B){r.grp.children[0].material=stdMat({color:0x6e5a48,roughness:0.7});
    B.box('wood',0,0,-9.5,14,0.3,4,0x8a6a4a);B.sbox('wood',0,0.3,-8.6,1.2,1.15,0.7,0x5a3a22);
    const bt=bretzTex(512,256,(g)=>{g.fillStyle='#1f3a2c';g.fillRect(0,0,512,256);g.fillStyle='#e8efe8';g.textAlign='center';g.font='700 34px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText('Einführung in die Meenzer Mundart',256,60);
      g.font='500 28px "Barlow Condensed",Arial Narrow,sans-serif';['Lektion 3: „Gell?“ als Satzende','„Ei gude wie!“ = Guten Tag, wie geht’s?','„Weck, Worscht un Woi“ = Grundnahrungsmittel','Klausur: nächsten Donnerstag (gell?)'].forEach((t,i)=>g.fillText(t,256,112+i*36));});
    B.plane(bt,0,3.6,-11.75,9,4.5,0);
    for(let z=-4;z<=8;z+=2.4)for(const s of [-1,1]){B.sbox('wood',s*5.5,0,z,8,0.78,0.5,0x9a7a52);B.box('cloth',s*5.5,0,z+0.75,8,0.45,0.45,0x7a1a1a);}
    B.box('wood',0,0,11.9,2.4,2.6,0.2,0x3a2512);},
  npcs(r){vPerson(r,0,-9.4,0,{role:'stand',lines:BRETZ_PROF});const R=mulberry32(31);const seats=[];for(let z=-4;z<=8;z+=2.4)for(const s of [-1,1])for(let k=0;k<5;k++)seats.push([s*(2.6+k*1.45),z+0.75]);
    for(let k=0;k<12;k++){const i=(R()*seats.length)|0;const [x,z]=seats.splice(i,1)[0];vPerson(r,x,z,Math.PI,{pose:'sit',lines:BRETZ_HOER});}},
  onEnter(){BRETZ.campus.hoersaalVisits=(BRETZ.campus.hoersaalVisits||0)+1;}});

// ---------- Alt-Bretzenheim: Weinstubb-Fassaden ----------
function bretzFacadeTex(){return bretzTex(512,512,(g)=>{g.fillStyle='#efe3c8';g.fillRect(0,0,512,512);const Q=mulberry32(3);for(let i=0;i<1600;i++){g.fillStyle=`rgba(120,100,70,${Q()*0.06})`;g.fillRect(Q()*512,Q()*512,3,3);}
  g.fillStyle='#4a2c1a';const beam=(x,y,w,h)=>g.fillRect(x,y,w,h);beam(0,0,512,16);beam(0,240,512,16);beam(0,496,512,16);for(const x of [0,128,256,384,496])beam(x,0,16,512);
  g.strokeStyle='#4a2c1a';g.lineWidth=12;for(const [x0,y0,x1,y1] of [[16,16,128,240],[240,16,128,240],[272,16,384,240],[496,16,384,240]]){g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();}
  const win=(x,y)=>{g.fillStyle='#2f5d3a';g.fillRect(x-14,y,14,88);g.fillRect(x+70,y,14,88);g.fillStyle='#fff6dc';g.fillRect(x,y,70,88);g.fillStyle='#3a5a6a';g.fillRect(x+5,y+5,27,36);g.fillRect(x+38,y+5,27,36);g.fillRect(x+5,y+47,27,36);g.fillRect(x+38,y+47,27,36);};
  win(42,100);win(170,100);win(298,100);win(426-10,100);win(42,320);win(298,320);
  g.fillStyle='#5a3418';g.fillRect(166,300,96,196);g.fillStyle='#3a2210';g.fillRect(176,312,76,184);g.fillStyle='#d9b45a';g.beginPath();g.arc(240,410,5,0,TAU);g.fill();});}
function bretzSignTex(name){return bretzTex(512,128,(g)=>{g.fillStyle='#3a2210';g.fillRect(0,0,512,128);g.strokeStyle='#d9b45a';g.lineWidth=6;g.strokeRect(8,8,496,112);g.fillStyle='#f5e6b8';g.textAlign='center';g.textBaseline='middle';let fs=54;do{g.font=`italic 700 ${fs}px Georgia,serif`;fs-=2;}while(g.measureText(name).width>470&&fs>20);g.fillText(name,256,68);});}
function bretzTaverns(){const C=bretzCentroid(bretzBuildings('Rathaus Bretzenheim'),BRETZ_FALLBACK.ortskern);const near=BUILDINGS.filter(b=>Math.hypot(b.x-C[0],b.z-C[1])<200&&b.H>=5);const cands=[];
  for(const r of ROADS){if(r.type!=='street'||r.bridge)continue;for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<2)continue;const ux=(b[0]-a[0])/L,uz=(b[1]-a[1])/L;
    for(let t=2;t<L;t+=6){const px=a[0]+ux*t,pz=a[1]+uz*t;if(Math.hypot(px-C[0],pz-C[1])>150)continue;
      for(const s of [-1,1]){const nx=-uz*s,nz=ux*s;const hit=bretzRayWall(px,pz,nx,nz,near,r.w/2+9);if(!hit||hit.t<r.w/2+1.2||hit.len<10)continue;
        const W=8;const tt=clamp(hit.u*hit.len,W/2+0.3,hit.len-W/2-0.3);const ax=hit.x-hit.ex*hit.u*hit.len,az=hit.z-hit.ez*hit.u*hit.len;const fx=ax+hit.ex*tt,fz=az+hit.ez*tt;
        let on=-hit.ez,onz=hit.ex;if(on*(px-fx)+onz*(pz-fz)<0){on=-on;onz=-onz;}
        if(SHOPS.some(sh=>Math.hypot(sh.x-fx,sh.z-fz)<10))continue;const tx=fx+on*2.3,tz=fz+onz*2.3;
        cands.push({x:fx,z:fz,face:Math.atan2(on,onz),nx:on,nz:onz,ex:hit.ex,ez:hit.ez,h:Math.min(6.4,hit.b.H-0.6),table:bretzFree(tx,tz,1.3)?[tx,tz]:null,d:Math.hypot(fx-C[0],fz-C[1])});}}}}
  cands.sort((a,b)=>(!!b.table-!!a.table)||a.d-b.d);const pick=[];for(const c of cands){if(pick.length>=2)break;if(pick.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<35))continue;pick.push(c);}
  const fac=bretzFacadeTex();const fg=new GB(),furn=new GB(),glow=new GB();const NAMES=['Weinstubb Zur Alten Kelter','Straußwirtschaft Rebeheisje'];const wood={r:0.45,g:0.3,b:0.18};
  pick.forEach((c,i)=>{const o=0.07;bretzQuad(fg,c.x+c.nx*o,0.02,c.z+c.nz*o,8,Math.max(4,c.h),c.face);
    const sg=new GB();bretzQuad(sg,c.x+c.nx*0.5,Math.min(c.h,6)-0.2-1.0,c.z+c.nz*0.5,3.6,0.9,c.face);bretzStatic(sg,stdMat({map:bretzSignTex(NAMES[i]),roughness:0.6}),false);
    // Schildhalter, Laternen, Strauß (Grünbuschen = geöffnet)
    furn.box(c.x+c.nx*0.25,Math.min(c.h,6)-0.25,c.z+c.nz*0.25,3.8,0.08,0.5,c.face,{r:0.12,g:0.12,b:0.12},1);
    for(const s of [-1,1]){const lx=c.x+c.ex*s*2.2+c.nx*0.35,lz=c.z+c.ez*s*2.2+c.nz*0.35;furn.box(lx,2.6,lz,0.08,0.08,0.5,c.face,{r:0.1,g:0.1,b:0.1},1);glow.box(lx+c.nx*0.25,2.35,lz+c.nz*0.25,0.26,0.4,0.26,c.face,{r:1,g:0.82,b:0.45},1);}
    if(i===1){const bx=c.x-c.ex*2.8+c.nx*0.9,bz=c.z-c.ez*2.8+c.nz*0.9;furn.box(bx,2.9,bz,0.6,0.7,0.6,c.face+0.4,{r:0.25,g:0.45,b:0.18},1);furn.box(bx-c.nx*0.45,3.2,bz-c.nz*0.45,0.06,0.06,0.9,c.face,{r:0.2,g:0.15,b:0.1},1);}
    if(c.table){const [tx,tz]=c.table;const rot=Math.atan2(-c.ez,c.ex);// entlang der Wand
      furn.box(tx,0,tz,2.2,0.76,0.7,rot,wood,1);for(const s of [-1,1])furn.box(tx+c.nx*s*0.7,0,tz+c.nz*s*0.7,2.2,0.45,0.3,rot,wood,1);rasterOBB(HG,tx,tz,2.2,1.8,rot,1);
      furn.box(c.x-c.ex*3.3+c.nx*0.7,0,c.z-c.ez*3.3+c.nz*0.7,0.8,1.0,0.8,rot,{r:0.42,g:0.27,b:0.15},1);}// Weinfass
    BRETZ.taverns.push({name:NAMES[i],x:c.x,z:c.z,face:c.face,nx:c.nx,nz:c.nz,ex:c.ex,ez:c.ez,table:c.table});label(NAMES[i],c.x+c.nx*3,c.z+c.nz*3,'small');});
  bretzStatic(fg,stdMat({map:fac,roughness:0.85}),false);bretzStatic(furn,stdMat({vertexColors:true,roughness:0.8}));bretzStatic(glow,new THREE.MeshBasicMaterial({vertexColors:true}),false);
  BRETZ.ortskern=C;}

// ---------- Straßenszenen mit Mundart-Dialogen ----------
// spot: [x,z,face,pose,rolle]; Dialogzeile: [spot-Index, Text]
function bretzScene(id,name,x,z,spots,convs,idle){const s={id,name,x,z,spots,convs,idle,people:[],ci:0,li:0,t:mr(2,4),pause:0,spawned:false,lines:0};BRETZ.scenes.push(s);return s;}
function bretzScenes(){
  for(const t of BRETZ.taverns){const c=t.table?t.table:[t.x+t.nx*2.2,t.z+t.nz*2.2];const fWall=Math.atan2(-t.nx,-t.nz),fOut=t.face;
    const sp=[[t.x+t.ex*2.9+t.nx*1.0,t.z+t.ez*2.9+t.nz*1.0,fOut,'stand','wirt']];
    if(t.table)for(const s of [-1,1])for(const o of [-0.6,0.6])sp.push([c[0]+t.nx*s*0.7+t.ex*o,c[1]+t.nz*s*0.7+t.ez*o,s>0?fWall:fOut,'sit','gast']);
    else for(const o of [-1,1])sp.push([c[0]+t.ex*o,c[1]+t.ez*o,o>0?fOut+1.2:fOut-1.2,'stand','gast']);
    const tavernConvs=t===BRETZ.taverns[0]?[[[1,'Ei gude wie! Is de Platz noch frei?'],[2,'Ajo, setz disch hie. Schoppe?'],[1,'Zwaa! Ich hab Dorscht wie e Wingertsmaus.'],[0,'Kommt glei! Un en Spundekäs dezu, gell?']],
      [[2,'Frieher war do hinne alles Wingert, bis nunner noch Zahlbach.'],[1,'Un heut? Alles Studente.'],[2,'Die trinke aach Woi. Nur billischer.']],
      [[1,'Mei Fraa sacht, ich soll nur aaner trinke.'],[2,'Un?'],[1,'Des is mei aaner. Er is halt e bissi größer.']]]
      :[[[0,'Wenn de Strauß drauße hängt, is uff. So war des schon immer.'],[1,'Un wann kimmt de Strauß widder rei?'],[0,'Wenn de Woi all is.']],
      [[1,'Weck, Worscht un Woi – meh brauch de Mensch net.'],[2,'Un e Klo.'],[1,'Des aach.']]];
    bretzScene('wein'+BRETZ.scenes.length,t.name,c[0],c[1],sp,tavernConvs,['Prost!','Zum Wohl, die Pfalz! … Ei, Rheinhesse natürlich!','Noch en Schoppe?']);}
  {const d=BRETZ.campus.doors.mensa;const nx=Math.sin(d[2]),nz=Math.cos(d[2]);const [cx,cz]=freeSpot(d[0]+nx*9,d[1]+nz*9,1.2);
    const sp=[0,1,2,3].map(k=>{const a=k/4*TAU+0.4;return [cx+Math.sin(a)*1.3,cz+Math.cos(a)*1.3,a+Math.PI,'stand','student'];});
    bretzScene('campus','Studierende vor der Mensa',cx,cz,sp,[[[0,'Hast du die Klausur in Statistik bestanne?'],[1,'Statistisch gesehe: vielleicht.'],[2,'Ich geh erst mal in die Mensa. Nervenfutter.']],
      [[1,'Wo is mei Rad? Ich hab’s doch hier abgestellt!'],[0,'Do stehn ungefähr tausend Räder.'],[1,'Meins is des mit dem Sattel.']],
      [[2,'Ich bin jetzt im zwölfte Semester.'],[3,'Respekt. Was studierst du?'],[2,'Des is e gute Frage.']]],['Mensa?','Mensa.','Erst Mensa, dann Bib. Oder umgekehrt.']);}
  {const S=BRETZ.roemersteine;const [nx,nz]=S.side;const [gx,gz]=freeSpot(S.x+nx*7,S.z+nz*7,0.8);const f=Math.atan2(-nx,-nz);
    const sp=[[gx,gz,f+Math.PI*0.85,'stand','guide']];for(let k=0;k<4;k++){const o=(k-1.5)*1.3;const [x,z]=freeSpot(gx+nx*2.6+S.ux*o,gz+nz*2.6+S.uz*o,0.5);sp.push([x,z,f+(k-1.5)*0.15,'stand','tourist']);}
    bretzScene('roemer','Führung an den Römersteinen',gx,gz,sp,[[[0,'Des hier sin die Römersteine – Reste vom Aquädukt, so um 70 nach Christus.'],[1,'Un wofür war des?'],[0,'Do is Wasser von de Quelle bei Finthe nuff ins Legionslager uffm Kästrich geflosse.'],[2,'Wasser? Ich dacht, die Römer hätte Woi getrunke.'],[0,'Ei, des aach. Awwer gewasche hawwe se sich mit Wasser.']],
      [[0,'Die Pfeiler warn mal mit Quader verkleidet. Die hawwe sich die Leut spätter für ihr Häuser geholt.'],[3,'Also des erste Recycling in Meenz!'],[0,'Genau. En Meenzer schmeißt nix fort.']]],['Gell, des is alt?','Älter wie mei Schwiegermudder.']);}}
function bretzSpawn(s){for(const [x,z,face,pose] of s.spots){const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.facing=face;h.state='roof';h.bretzScene=s;h.bretzPose=pose;h.walkSpeed=1;
    if(pose==='sit'){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;}
    if(s.id.startsWith('wein')&&pose==='sit'){const gl=new THREE.Mesh(_mkG.glass,_mkM.wine);gl.position.set(0,-0.62,0.06);h.armR.add(gl);h.armR.rotation.x=-0.6;}
    h.npcName=mpick(NPC_NAMES)+' ('+s.name+')';h.sync();s.people.push(h);}
  s.spawned=true;s.ci=0;s.li=0;s.t=mr(1.5,3);}
function bretzDespawn(s){for(const h of s.people)if(!h.removed)h.remove();s.people=[];s.spawned=false;}
function bretzUpdateScene(s,dt,px,pz){const pd=Math.hypot(s.x-px,s.z-pz);
  if(!s.spawned&&pd<170)bretzSpawn(s);if(s.spawned&&pd>260){bretzDespawn(s);return;}if(!s.spawned)return;
  for(const h of s.people){if(h.removed||!h.alive||h.state!=='roof')continue;if(h.bretzPose==='sit'){if(h.fx&&h.face.visible)h.updateFace();h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}else{h.animate(dt,0);h.y=groundY(h.x,h.z);h.sync();}}
  s.t-=dt;if(s.t>0||pd>32)return;const conv=s.convs[s.ci%s.convs.length];const [who,text]=conv[s.li];const h=s.people[who];
  if(h&&!h.removed&&h.alive&&h.state==='roof'){say(h,text,3.6,'');s.lines++;}
  s.li++;s.t=3.8;if(s.li>=conv.length){s.li=0;s.ci++;s.t=mr(7,12);const idle=s.people.filter(o=>!o.removed&&o.alive&&o.state==='roof'&&!o.bubble);if(idle.length&&s.idle)setTimeout(()=>{const o=mpick(idle);if(o.alive&&!o.removed&&!o.bubble)say(o,mpick(s.idle),2.6,'quiet');},2000);}}

// ---------- Schnellreise ----------
const _bretzFtDest=ftDestinations;
ftDestinations=function(){const had=!!FT.list;const L=_bretzFtDest();if(!had)for(const d of BRETZ.ft)if(!L.includes(d))L.push(d);return L;};
function bretzFt(){const add=(n,x,z)=>{const [fx,fz]=freeSpot(x,z,0.6);BRETZ.ft.push({n,g:BRETZ_GROUP,x:fx,z:fz});};const D=BRETZ.campus.doors;
  const out=(d,k)=>[d[0]+Math.sin(d[2])*k,d[1]+Math.cos(d[2])*k];
  add('Uni-Campus · Zentralmensa',...out(D.mensa,3));add('Uni-Campus · Hörsaal (Atrium Maximum)',...out(D.atrium,3));
  const S=BRETZ.roemersteine;add('Römersteine (Zahlbach)',S.x+S.side[0]*10,S.z+S.side[1]*10);
  if(BRETZ.taverns.length){const t=BRETZ.taverns[0];add('Alt-Bretzenheim · Weinstubb',t.x+t.nx*4,t.z+t.nz*4);}}

// ---------- Setup / Update ----------
function setupBretz(){if(BRETZ.built)return;BRETZ.built=true;const mem=()=>(performance.memory&&performance.memory.usedJSHeapSize)||0;const m0=mem();
  bretzRoemersteine();bretzCampus();bretzTaverns();
  const D=BRETZ.campus.doors;for(const [id,d] of [['bretz_mensa',D.mensa],['bretz_hoersaal',D.atrium]]){const v=VENUES.find(v=>v.id===id);v.door=d;}
  BRETZ.campus.mensa=VENUES.find(v=>v.id==='bretz_mensa');BRETZ.campus.hoersaal=VENUES.find(v=>v.id==='bretz_hoersaal');
  bretzScenes();bretzFt();
  // Geometrie-Puffer + Canvas-Pixel (Canvas wird nach dem GPU-Upload freigegeben) als Schätzung, Heap-Differenz nur mit --enable-precise-memory-info genau
  let geo=0;const ab=a=>Number(a&&a.array&&a.array.byteLength)||0;for(const m of BRETZ.meshes){const G=m.geometry;for(const k in G.attributes)geo+=ab(G.attributes[k]);geo+=ab(G.index)+ab(m.instanceMatrix)+ab(m.instanceColor);}
  BRETZ.mem={heapMB:Math.round((mem()-m0)/1e4)/100,geoMB:Math.round(geo/1e4)/100,canvasMB:Math.round(BRETZ.texPx*4/1e4)/100,drawCalls:BRETZ.meshes.length};}
function updateBretz(dt){if(mode!=='play'||!BRETZ.built)return;const P=P1;if(!P.h||P.h.room)return;const [px,pz]=ppos(P);for(const s of BRETZ.scenes)bretzUpdateScene(s,dt,px,pz);}
// Gerenderte Draw-Calls der Welt-Meshes dieses Pakets (Differenz mit/ohne) – Messhilfe für Tests
BRETZ.renderCalls=()=>{const I=renderer.info;const n=()=>{I.autoReset=false;I.reset();renderFrame();const c=I.render.calls;I.autoReset=true;return c;};const on=n();for(const m of BRETZ.meshes)m.visible=false;const off=n();for(const m of BRETZ.meshes)m.visible=true;return {on,off,diff:on-off};};
// update() blendet bei INDOOR alle Nicht-Spieler aus (p4e_main) – damit wären auch die Leute in Mensa/Hörsaal unsichtbar;
// vor dem Rendern die Personen des eigenen Innenraums wieder einblenden
const _bretzRenderFrame=renderFrame;
renderFrame=function(){const r=INDOOR;if(r&&r.venue&&r.venue.id.startsWith('bretz_'))for(const o of r.people)if(!o.removed)o.g.visible=true;_bretzRenderFrame();};
