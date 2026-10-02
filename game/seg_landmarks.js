const LM=new THREE.Group(); scene.add(LM);
const SOLIDS=[]; const ELEVS=[]; const RESERVES=[]; const LANDMARK_LABELS=[];
function obbPoly(x,z,w,d,rot){const c=Math.cos(rot),s=Math.sin(rot);const ex=[c,-s],ez=[s,c];return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[x+ex[0]*a*w/2+ez[0]*b*d/2,z+ex[1]*a*w/2+ez[1]*b*d/2]);}
// Verschiebung/Drehung der handgebauten Modelle an die echte OSM-Position
const LT={ox:0,oz:0,nx:0,nz:0,r:0};
function T2(x,z){const dx=x-LT.ox,dz=z-LT.oz,c=Math.cos(LT.r),s=Math.sin(LT.r);return [LT.nx+dx*c+dz*s,LT.nz-dx*s+dz*c];}
function withLM(ox,oz,nx,nz,r,fn){Object.assign(LT,{ox,oz,nx,nz,r});try{fn();}finally{Object.assign(LT,{ox:0,oz:0,nx:0,nz:0,r:0});}}
function lmesh(geo,mat,x,y,z,rot=0,cast=true){const m=new THREE.Mesh(geo,mat);const q=T2(x,z);m.position.set(q[0],y,q[1]);m.rotation.y=rot+LT.r;m.castShadow=cast;m.receiveShadow=true;LM.add(m);return m;}
function lbox(x,z,w,d,h,mat,o={}){const y=o.y||0,rot=o.rot||0;const m=lmesh(boxGeo(w,h,d,o.tw||0,o.th||0),mat,x,y+h/2,z,rot,o.cast!==false);
  const q=T2(x,z);if(o.solid!==false&&y<3)SOLIDS.push({k:'obb',x:q[0],z:q[1],w,d,rot:rot+LT.r,h:y+h});else if(y>=3)ELEVS.push({k:'obb',x:q[0],z:q[1],w,d,rot:rot+LT.r,b:y,t:y+h});if(o.reserve!==false)RESERVES.push(obbPoly(q[0],q[1],w+6,d+6,rot+LT.r));return m;}
function lcyl(x,z,r1,r2,h,mat,o={}){const y=o.y||0;const m=lmesh(scaleUV(new THREE.CylinderGeometry(r1,r2,h,o.seg||16),Math.max(1,Math.round(TAU*Math.max(r1,r2)/(o.tw||4))),h/(o.th||4)),mat,x,y+h/2,z,o.rot||0);
  const q=T2(x,z);if(o.solid!==false&&y<3)SOLIDS.push({k:'circ',x:q[0],z:q[1],r:Math.max(r1,r2),h:y+h});else if(y>=3)ELEVS.push({k:'circ',x:q[0],z:q[1],r:Math.max(r1,r2),b:y,t:y+h});if(o.reserve!==false)RESERVES.push(circlePts(q[0],q[1],Math.max(r1,r2)+3,12));return m;}
function lcone(x,z,r,h,mat,y,seg=8,rot=0){if(y>=3){const q=T2(x,z);ELEVS.push({k:'circ',x:q[0],z:q[1],r,b:y,t:y+h,cone:true});}return lmesh(scaleUV(new THREE.ConeGeometry(r,h,seg),Math.max(1,Math.round(TAU*r/3)),Math.hypot(r,h)/3),mat,x,y+h/2,z,rot);}
function lroof(x,z,w,d,rot,y,rh,mat,tile=3){{const q=T2(x,z);ELEVS.push({k:'obb',x:q[0],z:q[1],w,d,rot:rot+LT.r,b:y,t:y+rh*0.7});} // Satteldach, First entlang lokaler x
  const g=new GB();const c=Math.cos(rot),s=Math.sin(rot);const ex=[c,-s],ez=[s,c];const P=(lx,yy,lz)=>[x+ex[0]*lx+ez[0]*lz,yy,z+ex[1]*lx+ez[1]*lz];
  const hw=w/2,hd=d/2,ref=[x,y,z],sl=Math.hypot(hd,rh);
  g.quadOut(P(-hw,y,-hd),P(hw,y,-hd),P(hw,y+rh,0),P(-hw,y+rh,0),[0,0],[w/tile,0],[w/tile,sl/tile],[0,sl/tile],WHITE,ref);
  g.quadOut(P(hw,y,hd),P(-hw,y,hd),P(-hw,y+rh,0),P(hw,y+rh,0),[0,0],[w/tile,0],[w/tile,sl/tile],[0,sl/tile],WHITE,ref);
  g.triOut(P(-hw,y,-hd),P(-hw,y,hd),P(-hw,y+rh,0),[0,0],[d/tile,0],[d/2/tile,rh/tile],WHITE,ref);
  g.triOut(P(hw,y,hd),P(hw,y,-hd),P(hw,y+rh,0),[0,0],[d/tile,0],[d/2/tile,rh/tile],WHITE,ref);
  return lmesh(g.geo(),mat,0,0,0,0);}
function lpyr(x,z,w,h,mat,y,rot=0){if(y>=3){const q=T2(x,z);ELEVS.push({k:'circ',x:q[0],z:q[1],r:w*0.55,b:y,t:y+h,cone:true});}const m=lmesh(new THREE.ConeGeometry(w*Math.SQRT1_2,h,4),mat,x,y+h/2,z,rot+Math.PI/4);return m;}
function lsign(text,x,y,z,rot,w,h,opts){const t=textTex(text,opts);const m=lmesh(new THREE.PlaneGeometry(w,h),stdMat({map:t,roughness:0.6}),x,y,z,rot,false);return m;}
function label(name,x,z,cat='lm'){const q=T2(x,z);LANDMARK_LABELS.push({name,x:q[0],z:q[1],cat});}

function buildLandmarks(){
  const pl=(k,d)=>PL[k]||d;
  // Hoher Dom St. Martin: echtes Modell aus den OSM-Bauteilen (Türme, Schiffe, Höhen)
  label('Mainzer Dom',-10,-5);
  // Markt: Heunensäule und Marktbrunnen
  {const p=pl('heunen',[-28,-82]);withLM(100,-10,p[0],p[1],0,()=>{  // Markt: Heunensäule, Marktbrunnen
  lbox(100,-10,2.2,2.2,0.8,M.lightStone,{reserve:false}); lcyl(100,-10,0.65,0.55,6.5,M.redPlain,{y:0.8,reserve:false});
});}
  {const p=pl('marktbrunnen',[7,-74]);withLM(125,-25,p[0],p[1],0,()=>{  lcyl(125,-25,3.2,3.2,0.8,M.lightStone,{seg:8,reserve:false}); lmesh(new THREE.CircleGeometry(2.9,8).rotateX(-Math.PI/2),M.water,125,0.75,-25);
});}
  // Gutenberg-Denkmal
  {const p=pl('gutdenk',[-172,-5]);withLM(-90,-45,p[0],p[1],0,()=>{  lbox(-90,-45,3,3,4,M.lightStone,{reserve:false}); lcyl(-90,-45,0.7,0.95,2.3,M.bronze,{y:4,solid:false,reserve:false});
  lmesh(new THREE.SphereGeometry(0.36,10,8),M.bronze,-90,6.65,-45);label('Gutenberg-Denkmal',-90,-45,'small');});}
  {const p=pl('fastnacht',[-428,83]);withLM(-358,111,p[0],p[1],0,()=>{  // Schillerplatz: Fastnachtsbrunnen
  const fx=-358,fz=111;
  lcyl(fx,fz,6,6.2,0.9,M.lightStone,{seg:8}); lmesh(new THREE.CircleGeometry(5.6,8).rotateX(-Math.PI/2),M.water,fx,0.82,fz);
  const fcols=[0xc8102e,0xf2f2ee,0x1f4fa0,0xf2c500,0xc8102e,0xf2f2ee];
  for(let i=0;i<6;i++){const r0=2.4-i*0.3,r1=r0-0.3;lcyl(fx,fz,r1,r0,1.2,stdMat({color:fcols[i]}),{y:0.9+i*1.2,seg:10,solid:false,reserve:false});
    for(let k=0;k<5;k++){const a=k/5*TAU+i;lmesh(new THREE.SphereGeometry(0.32,6,5),stdMat({color:mpick([0xc8102e,0xf2c500,0x1f4fa0,0xe8c7a8,0x2f7d3a])}),fx+Math.cos(a)*(r0-0.1),1.5+i*1.2,fz+Math.sin(a)*(r0-0.1));}}
  const cap=lcone(fx,fz,0.7,1.6,stdMat({color:0xc8102e}),8.1,10); cap.rotation.z=0.35;
  lmesh(new THREE.SphereGeometry(0.22,8,6),stdMat({color:0xf2c500}),fx+0.5,9.8,fz);
  label('Fastnachtsbrunnen',fx,fz,'small');
});}
  {const L=OSM.lm.holzturm,p=pl('holzturm',[294,186]);withLM(285,200,p[0],p[1],L?-L.axis:0,()=>{  // Holzturm & Eisenturm
  lbox(285,200,12,12,26,M.rom,{tw:6,th:8}); lpyr(285,200,12.5,13,M.slate,26);
  for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]) lcone(285+a*5.8,200+b*5.8,0.9,4,M.slate,26,8);
  lmesh(new THREE.PlaneGeometry(4,5.5),M.dark,285,2.75,206.05,0,false); label('Holzturm',285,200);
});}
  {const L=OSM.lm.eisenturm,p=pl('eisenturm',[95,-256]);withLM(215,-75,p[0],p[1],L?-L.axis:0,()=>{  lbox(215,-75,10,10,24,M.rom,{tw:6,th:8}); lpyr(215,-75,10.4,8,M.slate,24);
  lmesh(new THREE.PlaneGeometry(3.6,5),M.dark,220.05,2.5,-75,Math.PI/2,false); label('Eisenturm',215,-75);
});}
  {const L=OSM.lm.christus,p=pl('christus',[-535,-950]);const KAISER_C=[-650,-635];withLM(KAISER_C[0],KAISER_C[1],p[0],p[1],(L?-L.axis:1)-Math.atan2(0.735,0.678),()=>{  // Christuskirche
  const [ccx,ccz]=KAISER_C; const crot=Math.atan2(0.735,0.678);
  for(const r of [crot,crot+Math.PI/2]){lbox(ccx,ccz,46,20,26,M.stone,{rot:r,tw:7,th:9});lroof(ccx,ccz,46,20.6,r,26,7,M.copper);}
  lcyl(ccx,ccz,14,14,16,M.lightStone,{y:26,seg:24,solid:false,reserve:false});
  const dome=lmesh(new THREE.SphereGeometry(14.4,28,12,0,TAU,0,Math.PI/2),M.copper,ccx,42,ccz); dome.scale.y=1.25;{const q=T2(ccx,ccz);ELEVS.push({k:'circ',x:q[0],z:q[1],r:14.4,b:26,t:60,dome:true});}
  lcyl(ccx,ccz,2.6,2.6,7,M.lightStone,{y:59,seg:10,solid:false,reserve:false}); lcone(ccx,ccz,3,11,M.copper,66,10);
  lmesh(new THREE.SphereGeometry(0.6,8,6),M.bronze,ccx,77.4,ccz);
  {const d=[-0.685,0.728],n=[-0.728,-0.685];for(const s of [-1,1]){const tx=ccx+d[0]*27+n[0]*11*s,tz=ccz+d[1]*27+n[1]*11*s;lcyl(tx,tz,3.2,3.2,34,M.lightStone,{seg:10});lcone(tx,tz,3.6,8,M.copper,34,10);}}
  label('Christuskirche',ccx,ccz);
});}
  {const L=OSM.lm.stephan,p=pl('stephan',[-367,348]);withLM(-300,420,p[0],p[1],L?-L.axis:0,()=>{  // St. Stephan (Chagall-Fenster)
  lbox(-300,420,52,24,20,M.romBlue,{tw:7,th:9}); lroof(-300,420,52,24.6,0,20,9,M.slate);
  lcyl(-330,420,6,6,46,M.redPlain,{seg:8}); lcone(-330,420,6.4,16,M.slate,46,8);
  label('St. Stephan',-300,420);
});}
  {const p=pl('rtheater',[288,631]);withLM(60,600,p[0],p[1],0,()=>{  // Römisches Theater
  for(let k=0;k<5;k++){const ri0=14+k*4,ro=ri0+4,y=0.6*(k+1);
    lmesh(new THREE.RingGeometry(ri0,ro,24,1,Math.PI,Math.PI).rotateX(-Math.PI/2),stdMat({color:0xbfae92,side:THREE.DoubleSide}),60,y,600,0,false);
    lmesh(new THREE.CylinderGeometry(ri0,ri0,0.6,24,1,true,-Math.PI/2,Math.PI),stdMat({color:0xa89a80,side:THREE.DoubleSide}),60,y-0.3,600,0,false);}
  label('Römisches Theater',60,600,'small');
});}
  for(const [k,n,c] of [['schloss','Kurfürstliches Schloss','lm'],['theater','Staatstheater','lm'],['rathaus','Rathaus','lm'],['rheingold','Rheingoldhalle','small'],['deutschhaus','Landtag (Deutschhaus)','small'],['reduit','Reduit','lm'],['drusus','Drususstein','small'],['proviant','Proviant-Magazin','small'],['gutmus','Gutenberg-Museum','small'],['kupferberg','Kupferberg','small']])if(PL[k])label(n,PL[k][0],PL[k][1],c);
  label('Hauptbahnhof',-1000,-230);label('Zitadelle',60,660);label('Universitätsmedizin',-1040,620,'service');label('Polizeiinspektion',POI.polizei[0],POI.polizei[1],'service');
}
const MANUAL=[];
function flag(x,z,kind){
  lcyl(x,z,0.08,0.1,10,M.white,{seg:6,reserve:false});
  const t=canvasTex(192,128,g=>{
    if(kind==='de'){['#111','#d00','#fc0'].forEach((c,i)=>{g.fillStyle=c;g.fillRect(0,i*43,192,43);});}
    else if(kind==='rlp'){['#111','#d00','#fc0'].forEach((c,i)=>{g.fillStyle=c;g.fillRect(0,i*43,192,43);});g.fillStyle='#fff';g.fillRect(16,30,36,46);g.fillStyle='#d00';g.fillRect(24,38,20,30);}
    else if(kind==='eu'){g.fillStyle='#003399';g.fillRect(0,0,192,128);g.fillStyle='#fc0';for(let i=0;i<12;i++){const a=i/12*TAU;g.beginPath();g.arc(96+Math.cos(a)*38,64+Math.sin(a)*38,5,0,TAU);g.fill();}}
    else {g.fillStyle='#c8102e';g.fillRect(0,0,192,64);g.fillStyle='#fff';g.fillRect(0,64,192,64);drawWheel(g,96,40,22,'#fff');}
  },false);
  const m=lmesh(new THREE.PlaneGeometry(2.4,1.6),stdMat({map:t,side:THREE.DoubleSide}),x+1.25,8.9,z,0,false); FLAGS.push(m);
}
const FLAGS=[];
function drawWheel(g,x,y,r,c){g.strokeStyle=c;g.lineWidth=r*0.18;g.beginPath();g.arc(x,y,r*0.82,0,TAU);g.stroke();g.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU;g.moveTo(x,y);g.lineTo(x+Math.cos(a)*r*0.82,y+Math.sin(a)*r*0.82);}g.stroke();g.fillStyle=c;g.beginPath();g.arc(x,y,r*0.18,0,TAU);g.fill();}
function train(x,z,len,kind){
  const body=kind==='ice'?0xf3f4f2:0xc8102e;
  lbox(x,z,3,len,3.6,stdMat({color:body,roughness:0.4}),{y:0.6,reserve:false});
  lbox(x,z,3.04,len-2,0.9,stdMat({color:kind==='ice'?0xc8102e:0xf3f4f2}),{y:1.6,solid:false,reserve:false});
  lbox(x,z,3.06,len-4,0.9,M.dark,{y:2.6,solid:false,reserve:false});
  SOLIDS.push({k:'obb',x,z,w:3,d:len,rot:0,h:4.2});
}
function crane(x,z,col){
  const m=stdMat({color:col,roughness:0.6});const g=new GB();
  for(const [a,b] of [[-3,-3],[3,-3],[3,3],[-3,3]]) g.beam([x+a,0,z+b],[x+a*0.6,12,z+b*0.6],0.6,0.6);
  g.beam([x-3,6,z-3],[x+3,6,z+3],0.3,0.3);g.beam([x+3,6,z-3],[x-3,6,z+3],0.3,0.3);
  lmesh(g.geo(),m,0,0,0); lbox(x,z,5,5,4,m,{y:12,solid:false,reserve:false});
  lmesh(boxGeo(26,1,1),m,x-9,15.5,z); lmesh(boxGeo(4,2,2),M.dark,x+5,15,z);
  SOLIDS.push({k:'circ',x,z,r:3.5,h:16});
}

