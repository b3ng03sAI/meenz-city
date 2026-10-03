// ===================== 41 Detail: AKK – Kastel, Kostheim, Amöneburg (rechtsrheinisch, Wiesbaden) =====================
// Reduit (Zinnen, Gesims, Schießscharten, Tafel, Kanonen, Fahnenstreit) und Brückenkopf Kastel (Portalpfeiler, Ortsschild),
// Kasteler Rheinufer (Bänke, Laternen, Abfalleimer), Maaraue mit Freibad (Becken zum Reinwaten, Sprungturm 1 m/3 m,
// Liegewiese, Kiosk, Bademeister), Mainmündung (Aussichtspunkt, Mainwasser-Streifen im Rhein), Kostheimer Schleuse (Kammer
// mit Schleusung, Tore, begehbare Kammermauern, Wehr, Steuerstand) und Industriepark Amöneburg (generisch: Tanklager,
// Schornsteine, Rohrbrücke, Werkstor mit Schranke). Begehbar: „Reduit-Kasematten“ (Ausstellung). Running Gag: wem gehört AKK?
// Lazy (Vertrag Welle 9): beim Boot nur Konstanten, vier lazyZone-Einträge, Venue mit fester Tür und Schnellreise-Ziele.
// Weltdaten (BUILDINGS, BRIDGES, POI, hgG/mfG) liest nur build(Z); Kollision über eigene Listen (blocked0-Wrapper), Stufen über
// einen stepAt-Wrapper, Becken über einen playerGroundY-Wrapper – nichts davon schreibt ins HG/ELEV.
// Kartendaten © OpenStreetMap-Mitwirkende (ODbL): Reduit-Umriss, Uferlinien, Straßen.

// ---------- Konstanten (feste Koordinaten, keine Weltdaten) ----------
const AKK_ZC={kastel:[540,-870],maaraue:[1400,320],schleuse:[3010,-470],amoeneburg:[-1330,-3650]};
const AKK_FT=[{n:'Reduit (Kastel)',x:555,z:-833,zone:'kastel'},{n:'Brückenkopf Kastel',x:438,z:-1001,zone:'kastel'},{n:'Kasteler Rheinufer',x:660,z:-662,zone:'kastel'},
  {n:'Freibad Maaraue',x:1346,z:220,zone:'maaraue'},{n:'Mainmündung (Maaraue-Spitze)',x:1505,z:398,zone:'maaraue'},{n:'Kostheimer Schleuse',x:3043,z:-530,zone:'schleuse'},
  {n:'Industriepark Amöneburg',x:-1294,z:-3640,zone:'amoeneburg'}];
// Reduit-Umriss (OSM, Fallback falls das Gebäude nicht gefunden wird) und Tür der Kasematten zum Reduit-Hof
const AKK_REDUIT_POLY=[[538.6,-881.1],[501.8,-923.9],[484.1,-912.4],[474.1,-924.3],[500.5,-941.4],[504.5,-941.9],[506.8,-941.2],[508.7,-939.6],[551.9,-888.9],[555,-884.1],
  [583.6,-820.5],[583.7,-818],[581.5,-814.1],[551.5,-792.2],[543.9,-805.7],[566.2,-822],[541.9,-875.8]];
const AKK_REDUIT_DOOR=[559.0,-834.9,Math.atan2(-0.912,0.412)];
const AKK_THB={B:[412.6,-1003.6],U:[0.8457,-0.5337],N:[0.5337,0.8457],hw:11.2};
// Freibad: lokales Feld (u entlang der Gebäudezeile, v Richtung Ufer)
const AKK_BAD={O:[1345,295],U:[0.8753,0.4837],
  pools:[{id:'schwimmer',name:'Schwimmerbecken',u0:-25,u1:25,v0:-10.5,v1:10.5,floor:-1.1,lanes:8},{id:'sprung',name:'Sprungbecken',u0:30,u1:50,v0:-9,v1:9,floor:-1.2,lanes:0},
    {id:'nichtschwimmer',name:'Nichtschwimmerbecken',u0:-62,u1:-32,v0:-10,v1:10,floor:-0.65,lanes:0},{id:'plansch',name:'Planschbecken',cu:-47,cv:27,r:5.5,floor:-0.25}],
  fence:{u0:-95,u1:75,v0:-60,v1:48,gate:[-40,-31]},tower:{u:55,v:0},T:[1512,404]};
const AKK_BAND=[[1522,440],[1450,438],[1380,425],[1320,400],[1265,362],[1215,322],[1165,278],[1115,225],[1065,165],[1020,100],[975,30]];
// Schleuse: Kammerachse im nördlichen Mainarm (Unterhaupt Westen, Oberhaupt Osten), Wehr quer im Hauptarm
const AKK_LOCK={C:[3000,-495],rot:0.3141,L:50,W:6,wall:3,top:0.4,low:-5,high:-1.6,T:64,weirX:3168,weir:[-451,-252]};
// Industriepark: Tanklager (achsparallel), Tor nach Osten, Schornsteine und Rohrbrücke
const AKK_IND={lot:[-1330,-3632,40,26],gate:[-1310,-3631,10],booth:[-1303,-3643],chim:[[-1348,-3698],[-1336,-3684]],rack:[[-1332,-3646],[-1342,-3690]]};

const AKK={zones:{},live:[],hitOn:0,stepOn:0,poolOn:0,stats:{},scenes:[],texts:[],ft:AKK_FT,venue:null,roomsFreed:0,
  reduit:null,brueckenkopf:null,ufer:null,bad:null,muendung:null,schleuse:null,industrie:null,
  gag:{flag:'mz',swaps:0,hour:-1,lines:0,last:'',side:'wi',signs:[]},swim:{in:false,splashes:0,jumps:0,boardT:-99},
  BRAND_RX:/dyckerhoff|kalle|albert|clariant|infraserv|sgl|basf|hoechst|linde|esso|aral|shell|rewe|edeka|bayer|evonik/i,
  K:{ZC:AKK_ZC,LOCK:AKK_LOCK,BAD:AKK_BAD,IND:AKK_IND,DOOR:AKK_REDUIT_DOOR,THB:AKK_THB},
  drawCalls:k=>AKK.zones[k]?lazyDrawCalls(AKK.zones[k]):0,
  api:{build:k=>lazyBuild(AKK.zones[k]),dispose:k=>lazyDispose(AKK.zones[k]),poolAt:(x,z)=>akkPoolAt(x,z),hit:(x,z,y)=>akkHit(x,z,y)}};

// ---------- Eigener Zufallsstrom (Bau und Update ziehen nie aus dem globalen Math.random) ----------
const AKK_RNG=mulberry32(4141);
function akkRng(fn){const r=Math.random;Math.random=AKK_RNG;try{return fn();}finally{Math.random=r;}}
const akkLow=()=>!!QS.lowLOD;
function akkKeep(list){return akkLow()?list.filter((_,i)=>i%2===0):list;}
const akkC=h=>({r:((h>>16)&255)/255,g:((h>>8)&255)/255,b:(h&255)/255});

// ---------- Freiflächen-Prüfung (nur im Bau) ----------
function akkFree(x,z){const i=idx(x,z);return i>=0&&hgG(i)===0&&!(mfG(i)&6)&&stepAt(x,z)===undefined&&!bridgeLocal(x,z);}
function akkFreeR(x,z,r){if(!akkFree(x,z))return false;for(const [a,b] of [[r,0],[-r,0],[0,r],[0,-r]])if(!akkFree(x+a,z+b))return false;return true;}
// deterministische Spiralsuche: erster freier Punkt um (x,z)
function akkSpot(x,z,r=0.6,max=14){for(let rad=0;rad<=max;rad+=1)for(let k=0;k<(rad?12:1);k++){const a=k/12*TAU;const px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;if(akkFreeR(px,pz,r))return [px,pz];}return null;}

// ---------- Lokales Bezugssystem (Drehung wie GB.box) ----------
function akkLF(x,z,rot,y0=0){const c=Math.cos(rot),s=Math.sin(rot);const P=(lx,ly,lz)=>[x+c*lx+s*lz,y0+ly,z-s*lx+c*lz];
  return {P,c,s,rot,box:(G,lx,ly,lz,w,h,d,col,r2=0)=>{const p=P(lx,ly,lz);G.box(p[0],p[1],p[2],w,h,d,rot+r2,col);},
    toL:(wx,wz)=>{const dx=wx-x,dz=wz-z;return [c*dx-s*dz,s*dx+c*dz];}};}
function akkCyl(G,x,y0,z,r,h,col,seg=12,top=true,r2){r2=r2??r;const ref=[x,y0+h/2,z];const P=(a,rr,y)=>[x+Math.cos(a)*rr,y,z+Math.sin(a)*rr];
  for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;G.quadOut(P(a0,r,y0),P(a1,r,y0),P(a1,r2,y0+h),P(a0,r2,y0+h),[0,0],[1,0],[1,1],[0,1],col,ref);
    if(top&&r2>0.01)G.triOut([x,y0+h,z],P(a0,r2,y0+h),P(a1,r2,y0+h),[0,0],[1,0],[0,1],col,[x,y0,z]);}}
function akkTube(G,a,b,r,col,seg=8){const d=norm3(sub3(b,a));let s=norm3(cross3(d,[0,1,0]));if(!isFinite(s[0])||Math.abs(d[1])>0.999)s=[1,0,0];const u=norm3(cross3(s,d));
  const P=(c,t)=>[c[0]+(s[0]*Math.cos(t)+u[0]*Math.sin(t))*r,c[1]+(s[1]*Math.cos(t)+u[1]*Math.sin(t))*r,c[2]+(s[2]*Math.cos(t)+u[2]*Math.sin(t))*r];
  const m=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
  for(let i=0;i<seg;i++){const t0=i/seg*TAU,t1=(i+1)/seg*TAU;G.quadOut(P(a,t0),P(a,t1),P(b,t1),P(b,t0),[0,0],[1,0],[1,1],[0,1],col,m);
    G.triOut(a,P(a,t0),P(a,t1),[0,0],[1,0],[0,1],col,b);G.triOut(b,P(b,t1),P(b,t0),[0,0],[1,0],[0,1],col,a);}}
// waagerechte Fläche (Rechteck im lokalen System) in Höhe y
function akkFlat(G,lf,u0,u1,v0,v1,y,col){const c=lf.P((u0+u1)/2,y-1,(v0+v1)/2);G.quadOut(lf.P(u0,y,v1),lf.P(u1,y,v1),lf.P(u1,y,v0),lf.P(u0,y,v0),[0,0],[1,0],[1,1],[0,1],col,c);}
// waagerechtes Viereck (Weltkoordinaten), Normale nach oben
function akkUp(G,a,b,c,d,col){G.quadOut(a,b,c,d,[0,0],[1,0],[1,1],[0,1],col,[(a[0]+c[0])/2,a[1]-1,(a[2]+c[2])/2]);}
// senkrechtes Schild aus dem Atlas: Mitte (cx,cz), Normale [sin face, cos face], Text liest von links nach rechts
function akkSign(G,uv,cx,y0,cz,w,h,face){const rx=Math.cos(face),rz=-Math.sin(face);const a=[cx-rx*w/2,y0,cz-rz*w/2],b=[cx+rx*w/2,y0,cz+rz*w/2];
  G.quad(a,b,[b[0],y0+h,b[2]],[a[0],y0+h,a[2]],[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]);}

// ---------- Materialien, Meshes, Atlas je Zone (lazyOwn) ----------
function akkMat(Z,k){const C=Z.mats;if(C[k])return C[k];const own=m=>lazyOwn(Z,m);
  const D={stone:()=>stdMat({vertexColors:true,roughness:0.88}),metal:()=>stdMat({vertexColors:true,roughness:0.45,metalness:0.5}),glow:()=>new THREE.MeshBasicMaterial({vertexColors:true}),
    pool:()=>stdMat({vertexColors:true,roughness:0.12,metalness:0.15}),band:()=>new THREE.MeshBasicMaterial({color:0x8a7442,transparent:true,opacity:0.32,depthWrite:false}),
    river:()=>stdMat({color:0x4f7480,roughness:0.08,metalness:0.2}),inst:()=>stdMat({roughness:0.75}),instM:()=>stdMat({roughness:0.45,metalness:0.55}),
    red:()=>new THREE.MeshBasicMaterial({color:0xff2a1a}),green:()=>new THREE.MeshBasicMaterial({color:0x22ff55})}[k];
  return C[k]=own(D());}
function akkStats(k){return AKK.stats[k]||(AKK.stats[k]={meshes:0,inst:0,props:0,cast:0,verts:0,tris:0,texPx:0});}
function akkMesh(Z,G,k,cast=true,par){if(G.empty)return null;const st=akkStats(Z.o.key);st.verts+=G.p.length/3;st.tris+=G.i.length/3;
  const m=new THREE.Mesh(lazyOwn(Z,G.geo()),typeof k==='string'?akkMat(Z,k):k);m.castShadow=cast&&!QS.noShadow;m.receiveShadow=true;(par||Z.group).add(m);st.meshes++;if(m.castShadow)st.cast++;return m;}
function akkInst(Z,geo,mat,list,cast=true,colors=null){lazyOwn(Z,geo);if(!list.length)return null;const im=new THREE.InstancedMesh(geo,mat,list.length);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  list.forEach((o,i)=>{q.setFromAxisAngle(up,o.face||0);p.set(o.x,o.y||0,o.z);s.setScalar(o.s||1);m.compose(p,q,s);im.setMatrixAt(i,m);if(colors)im.setColorAt(i,new THREE.Color(colors[i%colors.length]));});
  im.computeBoundingSphere();im.castShadow=cast&&!QS.noShadow;im.receiveShadow=true;Z.group.add(im);const st=akkStats(Z.o.key);st.inst++;st.props+=list.length;if(im.castShadow)st.cast++;return im;}
// Atlas: Schilder einer Zone teilen sich eine Textur (Zeilenpackung, Breite 1024)
function akkAtlas(Z,panels){const W=1024;let x=0,y=0,rowH=0;const pos={};
  for(const p of panels){if(x+p.w>W){x=0;y+=rowH;rowH=0;}pos[p.k]=[x,y];x+=p.w;rowH=Math.max(rowH,p.h);}
  const H=Math.ceil((y+rowH)/64)*64;const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');const uv={};
  for(const p of panels){const [px,py]=pos[p.k];g.save();g.translate(px,py);g.beginPath();g.rect(0,0,p.w,p.h);g.clip();p.draw(g,p.w,p.h);g.restore();uv[p.k]=[px/W,1-(py+p.h)/H,(px+p.w)/W,1-py/H];}
  akkStats(Z.o.key).texPx+=W*H;const tex=lazyOwn(Z,freeAfterUpload(texFromCanvas(c,false)));Z.mats.atlas=lazyOwn(Z,stdMat({map:tex,roughness:0.7}));return uv;}
const akkFont=(w,s)=>`${w} ${s}px "Barlow Condensed", Arial Narrow, sans-serif`;
function akkText(g,t,x,y,w,s,col,al='center'){g.fillStyle=col;g.textAlign=al;g.textBaseline='middle';let fs=s;do{g.font=akkFont(700,fs);fs-=2;}while(g.measureText(t).width>w&&fs>12);g.fillText(t,x,y);}
function akkTexts(...t){for(const s of t)if(!AKK.texts.includes(s))AKK.texts.push(s);}

// ---------- Kollision und Stufen der gebauten Zonen ----------
function akkHits(Z){return Z.hits||(Z.hits={bb:[1e9,1e9,-1e9,-1e9],obb:[],circ:[]});}
function akkBB(H,x,z,r){H.bb[0]=Math.min(H.bb[0],x-r);H.bb[1]=Math.min(H.bb[1],z-r);H.bb[2]=Math.max(H.bb[2],x+r);H.bb[3]=Math.max(H.bb[3],z+r);}
function akkHitObb(Z,x,z,w,d,rot,top){const H=akkHits(Z);H.obb.push([x,z,w/2,d/2,Math.cos(rot),Math.sin(rot),top]);akkBB(H,x,z,(w+d)/2);}
function akkHitCirc(Z,x,z,r,top){const H=akkHits(Z);H.circ.push([x,z,r,top]);akkBB(H,x,z,r);}
// wie das HG-Raster: blockiert, solange man nicht oben drüber ist (y < Oberkante − 0,4)
function akkHit(x,z,y){for(const Z of AKK.live){const H=Z.hits;if(!H||x<H.bb[0]||x>H.bb[2]||z<H.bb[1]||z>H.bb[3])continue;
  for(const o of H.obb){if(y!==undefined&&y>=o[6]-0.4)continue;const dx=x-o[0],dz=z-o[1];if(Math.abs(dx*o[4]-dz*o[5])<o[2]&&Math.abs(dx*o[5]+dz*o[4])<o[3])return true;}
  for(const c of H.circ){if(y!==undefined&&y>=c[3]-0.4)continue;const dx=x-c[0],dz=z-c[1];if(dx*dx+dz*dz<c[2]*c[2])return true;}}return false;}
const _akkBlocked0=blocked0;
blocked0=function(x,z,y){if(AKK.hitOn&&akkHit(x,z,y))return true;return _akkBlocked0(x,z,y);};
// Stufen: Rechteck im lokalen System, Höhe fest oder als Funktion (Treppe)
function akkStepRect(Z,lf,u0,u1,v0,v1,h){const pts=[lf.P(u0,0,v0),lf.P(u1,0,v0),lf.P(u1,0,v1),lf.P(u0,0,v1)];const bb=[1e9,1e9,-1e9,-1e9];for(const p of pts){bb[0]=Math.min(bb[0],p[0]);bb[1]=Math.min(bb[1],p[2]);bb[2]=Math.max(bb[2],p[0]);bb[3]=Math.max(bb[3],p[2]);}
  (Z.steps||(Z.steps=[])).push({bb,lf,u0,u1,v0,v1,h});}
function akkStep(x,z){for(const Z of AKK.live){if(!Z.steps)continue;for(const S of Z.steps){if(x<S.bb[0]||x>S.bb[2]||z<S.bb[1]||z>S.bb[3])continue;const [u,v]=S.lf.toL(x,z);
  if(u<S.u0||u>S.u1||v<S.v0||v>S.v1)continue;return typeof S.h==='function'?S.h(u,v):S.h;}}return undefined;}
const _akkStepAt=stepAt;
stepAt=function(x,z){if(AKK.stepOn){const h=akkStep(x,z);if(h!==undefined)return h;}return _akkStepAt(x,z);};
// Becken: im Wasser steht der Spieler auf dem Beckenboden (Oberkörper schaut raus); unter dem Sprungbrett zählt das Brett
function akkPoolAt(x,z){if(!AKK.poolOn)return null;const B=AKK_BAD,dx=x-B.O[0],dz=z-B.O[1];const u=dx*B.U[0]+dz*B.U[1],v=-dx*B.U[1]+dz*B.U[0];
  for(const p of B.pools){if(p.r!==undefined){if(Math.hypot(u-p.cu,v-p.cv)<p.r-0.3)return p;}else if(u>p.u0+0.3&&u<p.u1-0.3&&v>p.v0+0.3&&v<p.v1-0.3)return p;}return null;}
const _akkPlayerGroundY=playerGroundY;
playerGroundY=function(P,x,z,y){if(AKK.poolOn){const p=akkPoolAt(x,z);if(p){const s=stepAt(x,z);if(!(s!==undefined&&y!==undefined&&y>s-1.2))return p.floor;}}return _akkPlayerGroundY(P,x,z,y);};

// ---------- Mundart: Running Gag, Gespräche, Sprüche ----------
const AKK_GAG={
  mz:['Kastel is Meenz! Guck doch uffs Schild: Mainz-Kastel. MAINZ steht vorne dran!','Mir hawwe de Dom, mir hawwe die Brück – AKK gehört hääm nach Meenz!',
    'Mei Oma hot hier Fassenacht gefeiert, do war des noch Meenz. Basta.','Die Wissbadener hawwe uns nur ausgeliehe. Seit 1945. Des is e lang Leihfrist.'],
  wi:['Ei, des is Wissbaade! Postleitzahl, Kennzeiche, Müllabfuhr – alles WI.','Schreib Mainz uffs Schild, so viel de willst – die Grundsteuer kommt aus Wissbaade.',
    'Mir hawwe euch AKK net weggenomme, mir hawwe’s gerettet!','Ihr Meenzer hätt doch eh kää Platz mehr. Mir basse druff uff.']};
AKK.gagText=AKK_GAG;
const AKK_CONV={
  ortsschild:{o:'Sach du emol: Is Kastel jetzt Meenz odder Wissbaade?',m:'surprised',c:[['Mainz, ganz klar.','Ha! Hörste, Klaus? Sogar die Leut vun auswärts wisse des!','laugh'],
    ['Wiesbaden, steht doch drunter.','Drunner! Erst kimmt „Mainz“. Wer zuerst kimmt, hot recht!','angry'],['Mir doch egal.','Egal?! Des is die wichtigst Frag seit 1945!','surprised']]},
  fahne:{o:()=>'Ei Gude! Isch bin de Fahnewart vum Reduit. Grad weht owwe '+(AKK.gag.flag==='mz'?'rot-weiß – Meenz!':'blau-gelb – Wissbaade!'),m:'smile',c:[
    ['Warum wechselt ihr die Fahnen?','Jede Stund e anner Fahn – rot-weiß fer Meenz, blau-gelb fer Wissbaade. So bleibt de Friede in Kastel.','smug'],
    ['Was ist das Reduit?','E Festungsbau aus de Zeit vun de Bundesfestung Meenz. Die Mauern sin dick genuch fer jeden Streit.','neutral'],
    ['Und wer hat recht?','Isch bin neutral. Isch hab nur die Kordel in de Hand.','laugh']]},
  bank:{o:'Ei Gude! Hock disch, vun hier sieht mer de Dom am beste.',m:'smile',c:[['Schöner Blick!','Gell? De Dom steht dribbe in Meenz – un mir gucke druff. Des is Kastel.','smile'],
    ['Gehört Kastel zu Mainz?','Uff de Landkart net, im Herze schon. Frach bloß net mei Fraa, die is aus Biebrich.','laugh'],['Tschüss!','Machs gut! Un fall net in de Rhoi!','neutral']]},
  angler:{o:'Pssst! Die Rhoifisch sin heut nervös – die wisse aach net, ob se Meenzer odder Wissbadener sin.',m:'neutral',c:[['Beißt was?','E Brasse vorhin. Hot uff Hessisch geguckt, also zurück ins Wasser.','laugh'],
    ['Darf man hier angeln?','Mit Schein, logisch. Isch hab zwää – ään vun dribbe, ään vun hibbe.','smug'],['Petri Heil!','Petri Dank! Un jetzt leis, gell?','smile']]},
  bademeister:{o:'Halt! Erst dusche, dann ins Becke!',m:'angry',c:[['Wo geht’s zum Sprungturm?','Dribbe am Sprungbecke. Uff drei Meter immer nur ääner – un kää Arschbomb uff die Leut!','neutral'],
    ['Wie warm ist das Wasser?','Erfrischend. Des secht mer so, wenn’s kalt is.','laugh'],['Ist das Bad Mainz oder Wiesbaden?','Im Becke sin alle gleich nass. Die Eintrittskaart kimmt awwer aus Wissbaade.','smug']]},
  badegast:{o:'Ah, e neu Gesicht! Leg disch hie, die Sunn scheint fer alle.',m:'smile',c:[['Was ist gut am Kiosk?','Pommes rot-weiß. Des Einzische, wo Meenz un Wissbaade sich eenisch sin.','laugh'],
    ['Kommst du oft her?','Jeden Daach seit de Schulzeit. Mei Handtuch hot schon en Stammplatz.','smug'],['Ich geh schwimmen.','Vorsicht, des Wasser hot heut Mainz-Temperatur: frisch!','smile']]},
  kiosk:{o:'Pommes, Eis, Fleischworscht – was derf’s sei?',m:'smile',c:[['Pommes rot-weiß bitte.','Kommt sofort! Rot fer Meenz, weiß fer … ach, mir sache einfach Mayo.','laugh'],
    ['Ein Eis, bitte.','Wassereis odder Kugel? Mer hawwe aach Spundekäs-Eis. Spaß!','laugh'],['Nichts, danke.','Dann eben net. Awwer wer schwimmt, kriecht Hunger!','neutral']]},
  muendung:{o:'Guck emol – do vorne kimmt de Main in de Rhoi. Siehste den braune Streife?',m:'smile',c:[
    ['Warum ist das Wasser zweifarbig?','De Main is brauner, de Rhoi grüner. Die vermische sich erst kilometerweit hinne – wie Meenzer un Wissbadener.','smile'],
    ['Wo kommt der Main her?','Vun weit hinne aus Franke. Hier hört er uff – un zwar mit Blick uff de Dom.','smug'],['Schöner Platz hier.','De schennste vun ganz AKK. Sach’s awwer net weiter.','laugh']]},
  schleuse:{o:'Moin! Schleusewärter Kostheim, was gibt’s?',m:'neutral',c:[
    ['Wie funktioniert die Schleuse?','Tor zu, Wasser rei, Schiff hoch, Tor uff. Un dann des Ganze retour. Wie Fassenacht: ruff un runner.','laugh'],
    ['Wie hoch hebt ihr die Schiffe?','E paar Meter. Fer die Kapitäne fühlt sich des an wie de Feldberg.','smug'],['Gehört die Schleuse zu Mainz?','Owwe Hesse, unne Hesse – un isch mittedrin. Des is mei Grenz.','neutral']]},
  kostheim:{o:'Ei Gude! Hier in Kostheim beißt mehr wie dribbe am Rhoi.',m:'smile',c:[['Was fängt man am Main?','Zander, Barsch, un manchmal en Schlappe vun de Kerb.','laugh'],
    ['Ist Kostheim Mainz?','Kostheim is Kostheim. Die anner zwää solle sich streite, mir angle.','smug'],['Viel Glück!','Glück brauch isch net. Isch hab Fleischworscht als Köder.','laugh']]},
  pfoertner:{o:'Halt! Werksausweis, bitte!',m:'angry',c:[['Ich hab keinen.','Dann bleibste dribbe. Hier is Industriepark, kää Streichelzoo.','angry'],
    ['Was wird hier gemacht?','Tanks, Rohre, Dampf – mehr derf isch net sache. Un mehr wääß isch aach net.','smug'],['Ist das hier Mainz oder Wiesbaden?','Amöneburg. Die Rohre do hinne wisse aach net, wohin se gehörn – die laafe in alle Richtunge.','laugh']]},
  arbeiter:{o:'Moin. Frühstückspaus – die heilischst Zeit vum Daach.',m:'neutral',c:[['Was macht ihr hier?','Mir passe uff, dass die Tanks voll un die Rohre dicht bleiwe. Klingt langweilisch, is es aach.','smug'],
    ['Schichtende bald?','Noch drei Stund. Odder vier Kaffee.','sad'],['Guten Appetit!','Merci! Fleischworscht-Weck, wie jeden Daach.','smile']]}};
const AKK_LINES={
  fahne:['Gleich is Fahnewechsel – dann gibt’s widder Krach.','Rot-weiß owwe, blau-gelb unne – odder umgekehrt. Isch komm selbst durchenanner.','Die Kordel is des Wichtigste am Reduit.'],
  bank:['Guck, en Frachter! Der fährt bestimmt nach Holland.','Vun hier is de Dom schenner wie vun dribbe.','Kastel hot de beste Blick uff Meenz – des ärgert die Meenzer.'],
  angler:['Leis! Die Fisch höre mit.','Heut beißt nix. Nur die Schnooke.','Gestern en Hecht, so groß wie die Theodor-Heuss-Brück. Fast.'],
  bademeister:['Net renne am Beckerand!','Uff de Dreier immer nur ääner!','Kinner ins Planschbecke, Pommes an de Kiosk!','Pfeif! Du do, raus aus’m Sprungbecke!'],
  badegast:['Ach, is des herrlich.','Noch e Runde Sunn, dann e Runde Wasser.','Pommes rot-weiß, des is Kultur.'],
  kiosk:['Pommes rot-weiß, frisch aus de Fritteus!','Eis gibt’s, solang’s kalt is!','Fleischworscht im Freibad – des is Maaraue!'],
  muendung:['Hier fängt de Rhoi a, braun zu werde.','Main-Kilometer null – weiter geht’s net.','Dribbe die Mainspitz, hibbe die Maaraue.'],
  schleuse:['Schleusung läuft – bitte Abstand vun de Kante!','Owwe Wasser, unne Wasser, dezwische isch.','Die Tore sin älter wie isch – un besser geölt.'],
  kostheim:['Leis, die Zander höre mit.','Am Main is es ruhiger wie am Rhoi.','Kostheim: Main-Blick inklusiv.'],
  pfoertner:['Kää Ausweis, kää Eintritt!','Dampf is ganz normal, nur kää Panik.','Werksverkehr hot Vorfahrt!'],
  arbeiter:['Helm uff, Hirn ei.','Noch zwää Rohre, dann Feierabend.','De Schornstein raacht, also läuft’s.']};

// ---------- Begehbarer Ort: Reduit-Kasematten (Muster p4p_venues.js) ----------
const AKK_MUSEUM_TAFEL=['Wem gehört AKK?','Seit 1945 verwaltet Wiesbaden die drei','rechtsrheinischen Stadtteile Amöneburg,','Kastel und Kostheim. Gestritten wird bis heute.'];
const AKK_MUSEUM_LINES=['Bitte nix aafasse, die Kanon is älter wie mei Oma.','Des Modell zeigt die Bundesfestung mit dem Brückekopp Kastel.','Rechts die Tafel: Wem gehört AKK? Mir wisse’s aach net.','Die Mauern hier sin drei Meter dick – do kimmt kää Wissbadener durch. Un kää Meenzer.'];
const AKK_VISITOR=['Des is ja spannend!','Do war mei Opa Soldat. Odder Koch, isch wääß nimmer.','Meenz odder Wissbaade – isch stimm fer Kastel!','Wo is denn hier des Klo?'];
AKK.venue={id:'akkreduit',name:'Reduit-Kasematten',sub:'Kastel · Festungsausstellung & AKK-Geschichte',W:16,D:10,H:4.6,wall:0xcfa680,ceil:0xb89272,hemiI:0.65,exp:1.0,lampI:22,lampD:18,
  door:AKK_REDUIT_DOOR,lights:[[-4,3.6,0],[4,3.6,0]],wp:[[-5,1.5],[5,1.5],[0,2.2],[-4,-1.5],[4,-1.5],[0,0]],spawn:[0,3.0,Math.PI],exits:[{x:0,z:4.4,w:1.4,d:0.8,to:'door'}],
  hints:[{x:-5,z:-2.6,r:2.2,t:'<b>Festungsmodell:</b> Bundesfestung Mainz mit dem Brückenkopf Kastel und dem Reduit.'},{x:5,z:-2.6,r:2.2,t:'<b>Kanone</b> aus der Festungszeit – bitte nicht berühren.'},
    {x:0,z:-3.6,r:2.4,t:'<b>'+AKK_MUSEUM_TAFEL[0]+'</b> '+AKK_MUSEUM_TAFEL.slice(1).join(' ')}],
  build(r,B){const fl=r.grp.children[0];fl.material.dispose();fl.material=r.akkFloor=stdMat({color:0x8d7d6a,roughness:0.9});r.akkDispose=[];
    // Gewölbebögen (Gurtbögen) quer zur Längsachse
    const rib=new THREE.TorusGeometry(4.55,0.22,6,18,Math.PI);for(const x of [-5.5,0,5.5]){const m=new THREE.Mesh(rib,vm('stone'));m.rotation.y=Math.PI/2;m.position.set(x,0,0);r.grp.add(m);}
    B.box('stone',0,4.3,0,16,0.3,10,0xbfa182);
    // Festungsmodell auf dem Tisch, Kanone, Vitrinen
    B.sbox('wood',-5,0,-2.6,3.2,0.9,2.2,0x6b4426);B.box('sand',-5.6,0.9,-2.8,1.2,0.35,0.9,0xc9b089);B.box('sand',-4.4,0.9,-2.3,0.8,0.25,0.6,0xc9b089);B.box('glow',-5,0.91,-1.75,3.0,0.02,0.45,0x4a7fa8);
    B.sbox('wood',5,0,-2.6,1.4,0.7,2.6,0x4a3020);for(const s of [-1,1])B.box('dark',5+s*0.75,0,-2.6+0.6,0.12,0.9,0.9,0x2a2a2a);
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.24,2.6,10).rotateX(Math.PI/2),vm('metal'));bar.position.set(5,1.05,-2.3);bar.rotation.x=-0.12;r.grp.add(bar);
    for(const x of [-2.2,2.2]){B.sbox('wood',x,0,-4.2,1.6,0.9,0.8,0x5a3a22);B.box('glass',x,0.9,-4.2,1.5,0.7,0.7,0xbfe0ff);B.box('gold',x,1.0,-4.2,0.4,0.2,0.3,0xc9a227);}
    // Tafel „Wem gehört AKK?“ mit Fahnen rot-weiß / blau-gelb
    const tex=canvasTex(512,256,(g)=>{g.fillStyle='#2e2a24';g.fillRect(0,0,512,256);g.strokeStyle='#c9a96e';g.lineWidth=6;g.strokeRect(5,5,502,246);
      akkText(g,AKK_MUSEUM_TAFEL[0],256,48,470,46,'#f3e6c8');AKK_MUSEUM_TAFEL.slice(1).forEach((t,i)=>akkText(g,t,256,110+i*42,480,28,'#e8dcc0'));},false);
    r.akkDispose.push(tex);const pl=B.plane(tex,0,1.9,-4.75,3.4,1.7,0,true);r.akkDispose.push(pl.material);
    for(const [x,c1,c2] of [[-2.4,0xd0021b,0xffffff],[2.4,0x1d4f9c,0xf2c200]]){B.box('glow',x,2.4,-4.78,0.9,0.5,0.03,c1);B.box('glow',x,1.9,-4.78,0.9,0.5,0.03,c2);}
    for(let k=0;k<4;k++)B.sbox('wood',-6+k*4,0,3.3,1.6,0.45,0.5,0x5a3a22);},
  npcs(r){const g=vPerson(r,0,-2.2,0,{role:'stand',lines:AKK_MUSEUM_LINES});g.npcName='Museumsführerin Annegret';
    vPerson(r,-4,0.5,0,{lines:AKK_VISITOR});vPerson(r,4,0.8,0,{lines:AKK_VISITOR});if(!akkLow())vPerson(r,0,1.5,0,{lines:AKK_VISITOR});},
  onEnter(){venueMusic('mall');}};
VENUES.push(AKK.venue);
function akkFreeRoom(){const v=AKK.venue,r=v.room;if(!r||INDOOR===r||PLAYERS.some(P=>P.h&&P.h.room===r))return;
  for(const o of r.people)if(!o.removed)o.remove();r.people=[];scene.remove(r.grp);
  r.grp.traverse(m=>{if(m.geometry)m.geometry.dispose();});if(r.akkFloor)r.akkFloor.dispose();for(const x of r.akkDispose||[])if(x&&x.dispose)x.dispose();v.room=null;AKK.roomsFreed++;}

// ---------- Schnellreise (eigene Gruppe, keine „besonderen Orte“) ----------
const _akkFtSpecials=ftSpecials;
ftSpecials=function(){const S=_akkFtSpecials();for(const d of AKK.ft)if(!S.some(o=>o.n===d.n))S.push({n:d.n,g:'AKK',x:d.x,z:d.z});return S;};
const _akkStartTalk=startTalk;
startTalk=function(P,npc){if(npc&&npc.akkConv)npc.forceConv=npc.akkConv;return _akkStartTalk(P,npc);};

// ---------- Szenen (Figuren entstehen mit der Zone) ----------
function akkScene(Z,id,name,x,z,npcs,o={}){const sc=Object.assign({id,name,zone:Z.o.key,x,z,npcs,people:[],lineT:3+Math.random()*4,lines:AKK_LINES[id]||[]},o);AKK.scenes.push(sc);return sc;}
function akkSpawnScenes(Z){for(const sc of AKK.scenes){if(sc.zone!==Z.o.key||sc.people.length)continue;if(akkLow()&&sc.extra)continue;
  for(const o of (akkLow()&&!sc.gag?sc.npcs.slice(0,1):sc.npcs)){const h=lazyNpc(Z,new Human('ped'));h.x=o.x;h.z=o.z;h.y=o.y??groundY(o.x,o.z);h.facing=o.face||0;h.state='roof';h.walkSpeed=1;
    h.akkScene=sc;h.akkPose=o.pose||'stand';h.npcName=o.name;h.akkConv=AKK_CONV[o.conv]||null;h.akkSide=o.side||null;
    if(o.pose==='sit'){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;}
    if(o.pose==='lie'){h.g.rotation.order='YXZ';h.akkLie=true;}
    if(o.pose==='rod'){const g=Z.mats.rodG||(Z.mats.rodG=lazyOwn(Z,new THREE.CylinderGeometry(0.012,0.03,3.2,5).translate(0,1.6,0)));const m=new THREE.Mesh(g,cmat(0x3b2a1a,0.6));m.position.set(0,-0.6,0);m.rotation.x=1.86;h.armR.add(m);h.armR.rotation.x=-0.9;}
    if(o.pose==='helmet'){const g=Z.mats.helmG||(Z.mats.helmG=lazyOwn(Z,new THREE.SphereGeometry(0.15,10,6,0,TAU,0,Math.PI/2)));const m=new THREE.Mesh(g,cmat(o.helm||0xf2c200,0.5));m.position.set(0,0.84,0);h.hips.add(m);}
    h.sync();sc.people.push(h);}}}
function akkDropScenes(Z){for(let i=AKK.scenes.length-1;i>=0;i--){if(AKK.scenes[i].zone!==Z.o.key)continue;if(TALK&&AKK.scenes[i].people.includes(TALK.npc))endTalk();AKK.scenes.splice(i,1);}}
const akkSc=id=>AKK.scenes.find(s=>s.id===id)||null;

// =====================================================================================================================
// KASTEL: Reduit, Brückenkopf, Rheinufer
// =====================================================================================================================
function akkReduitPoly(){const R=POI.reduit||[530,-854];let best=null,bd=1e9;
  for(const b of BUILDINGS){if(!b||(b.area||0)<1500||Math.abs(b.x-R[0])>120||Math.abs(b.z-R[1])>120)continue;const d=Math.hypot(b.x-R[0],b.z-R[1]);if(d<bd){bd=d;best=b;}}
  return best?{poly:best.poly.map(p=>[p[0],p[1]]),h:best.h||10,osm:true}:{poly:AKK_REDUIT_POLY,h:10,osm:false};}
function akkBuildReduit(Z,Gs,Gm,Gg,Gt,uv){const src=akkReduitPoly(),P=src.poly,H=src.h;let a2=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];a2+=a[0]*b[1]-b[0]*a[1];}const sg=a2>0?1:-1;
  const SAND=akkC(0xb07a5e),LIGHT=akkC(0xd9c3a0),DARK=akkC(0x2b2420),MOSS=akkC(0x5f6e48);const D=AKK_REDUIT_DOOR;let merlons=0,slits=0,edges=0;
  for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<2.5)continue;edges++;
    const ex=(b[0]-a[0])/L,ez=(b[1]-a[1])/L,nx=sg*ez,nz=-sg*ex,rot=Math.atan2(-ez,ex);const at=(t,o)=>[a[0]+ex*t+nx*o,a[1]+ez*t+nz*o];
    // Gesims, Brüstung mit Zinnen auf dem Dach
    {const c=at(L/2,0.15);Gs.box(c[0],H-0.7,c[1],L+0.3,0.45,0.5,rot,LIGHT);const w=at(L/2,-0.3);Gs.box(w[0],H,w[1],L,0.55,0.6,rot,SAND);}
    for(let t=1.2;t<L-0.8;t+=2.4){const m=at(t,-0.3);Gs.box(m[0],H+0.55,m[1],1.2,0.7,0.6,rot,SAND);merlons++;}
    // Schießscharten in zwei Reihen (nicht an der Kasemattentür)
    for(let t=2;t<L-1.5;t+=3.6){const s=at(t,0.05);if(Math.hypot(s[0]-D[0],s[1]-D[1])<4)continue;for(const y of [1.6,H-3.6]){Gs.box(s[0],y,s[1],0.28,1.25,0.1,rot,DARK);slits++;}}
    // Sockel mit Moos
    {const c=at(L/2,0.12);Gs.box(c[0],0,c[1],L+0.2,0.5,0.35,rot,MOSS);}}
  // Kasemattentür, Sandsteinrahmen, Tafel
  const fx=Math.sin(D[2]),fz=Math.cos(D[2]),rx=Math.cos(D[2]),rz=-Math.sin(D[2]);const W0=[D[0]-fx*1.2,D[1]-fz*1.2];
  Gs.box(W0[0]+fx*0.05,0,W0[1]+fz*0.05,2.2,3.0,0.2,D[2],DARK);for(const s of [-1,1])Gs.box(W0[0]+fx*0.12+rx*s*1.25,0,W0[1]+fz*0.12+rz*s*1.25,0.35,3.4,0.3,D[2],LIGHT);Gs.box(W0[0]+fx*0.12,3.0,W0[1]+fz*0.12,2.9,0.45,0.32,D[2],LIGHT);
  akkSign(Gt,uv.reduit,W0[0]+fx*0.18+rx*3.0,1.3,W0[1]+fz*0.18+rz*3.0,2.2,1.3,D[2]);
  // Hof: Kanonen beidseits der Tür (Rohr zum Rhein), zwei Fahnenmasten, Infotafel
  const yard=(o,s)=>[D[0]+fx*o+rx*s,D[1]+fz*o+rz*s];const cannons=[];
  for(const s of [-4.5,4.5]){const p=yard(3.2,s);const q=akkSpot(p[0],p[1],1.2,6);if(!q)continue;const lf=akkLF(q[0],q[1],D[2]-Math.PI/2);
    lf.box(Gs,0,0.25,0,1.6,0.5,1.1,akkC(0x5a3a22));for(const w of [-0.65,0.65])akkTube(Gs,lf.P(-0.35,0.55,w),lf.P(-0.35,0.55,w*1.25),0.55,akkC(0x3a2614),10);
    akkTube(Gm,lf.P(-0.9,0.95,0),lf.P(1.9,1.0,0),0.22,akkC(0x2f3436),10);akkTube(Gm,lf.P(-1.05,0.95,0),lf.P(-0.85,0.95,0),0.27,akkC(0x2f3436),10);
    cannons.push({x:q[0],z:q[1]});akkHitObb(Z,q[0],q[1],3.0,1.6,D[2]-Math.PI/2,1.4);}
  const flags=[];for(const s of [-1.6,1.6]){const p=yard(8,s);const q=akkSpot(p[0],p[1],0.5,6);if(!q)continue;akkCyl(Gm,q[0],0,q[1],0.08,10,akkC(0xdddddd),8,true,0.06);Gg.box(q[0],10,q[1],0.25,0.25,0.25,0,akkC(0xffd27a));
    akkHitCirc(Z,q[0],q[1],0.3,10);flags.push({x:q[0],z:q[1],side:s<0?'mz':'wi',y:2,mesh:null});}
  {const p=yard(6,7);const q=akkSpot(p[0],p[1],0.8,6);if(q){for(const o of [-0.8,0.8])Gs.box(q[0]+rx*o,0,q[1]+rz*o,0.12,1.4,0.12,D[2],DARK);Gs.box(q[0],1.3,q[1],2.0,1.15,0.08,D[2],DARK);
    akkSign(Gt,uv.akk,q[0]+fx*0.05,1.35,q[1]+fz*0.05,1.9,1.05,D[2]);akkHitObb(Z,q[0],q[1],2.0,0.4,D[2],2.5);}}
  AKK.reduit={x:src.poly.reduce((a,p)=>a+p[0],0)/P.length,z:src.poly.reduce((a,p)=>a+p[1],0)/P.length,h:H,osm:src.osm,edges,merlons,slits,cannons,flags,door:D};}
// Fahnen (eigene Meshes, damit sie hoch- und runterfahren)
function akkBuildFlags(Z,uv){const g=lazyOwn(Z,new THREE.PlaneGeometry(1.8,1.2).translate(0.92,0,0));
  for(const f of AKK.reduit.flags){const k=f.side==='mz'?'flagMz':'flagWi';const geo=lazyOwn(Z,g.clone());const u=uv[k];const a=geo.attributes.uv;
    for(let i=0;i<a.count;i++){a.setXY(i,u[0]+(u[2]-u[0])*a.getX(i),u[1]+(u[3]-u[1])*a.getY(i));}
    const m=new THREE.Mesh(geo,Z.mats.flag||(Z.mats.flag=lazyOwn(Z,stdMat({map:Z.mats.atlas.map,side:THREE.DoubleSide,roughness:0.8}))));m.position.set(f.x,f.y,f.z);m.rotation.y=AKK_REDUIT_DOOR[2]-Math.PI/2;Z.group.add(m);f.mesh=m;akkStats('kastel').meshes++;}}
function akkBuildBrueckenkopf(Z,Gs,Gm,Gg,Gt,uv){const B0=BRIDGES[0];const T=B0?{B:B0.B,U:B0.U,N:B0.N,hw:B0.hw}:AKK_THB;const {B,U,N,hw}=T;const SAND=akkC(0xb98a64),LIGHT=akkC(0xdcc6a2);const pyl=[];
  for(const s of [-1,1]){const want=[B[0]+U[0]*10+N[0]*s*(hw+2.6),B[1]+U[1]*10+N[1]*s*(hw+2.6)];const q=akkSpot(want[0],want[1],1.6,8);if(!q)continue;const rot=Math.atan2(-U[1],U[0]);
    Gs.box(q[0],0,q[1],2.4,1.0,2.4,rot,LIGHT);Gs.box(q[0],1.0,q[1],2.0,6.0,2.0,rot,SAND);Gs.box(q[0],7.0,q[1],2.4,0.5,2.4,rot,LIGHT);Gs.box(q[0],7.5,q[1],1.2,0.8,1.2,rot,SAND);
    Gg.box(q[0],8.3,q[1],0.6,0.8,0.6,rot,akkC(0xffd98a));Gm.box(q[0],9.1,q[1],0.8,0.15,0.8,rot,akkC(0x2a2a2a));akkHitObb(Z,q[0],q[1],2.4,2.4,rot,9);pyl.push({x:q[0],z:q[1]});}
  // Ortsschild (Gag) für den Verkehr von der Brücke, Wegweiser auf der Rückseite
  const want=[B[0]+U[0]*34+N[0]*(hw+1.8),B[1]+U[1]*34+N[1]*(hw+1.8)];const q=akkSpot(want[0],want[1],0.5,10);let sign=null;
  if(q){const face=Math.atan2(-U[0],-U[1]);const rx=Math.cos(face),rz=-Math.sin(face);for(const o of [-0.7,0.7])Gm.box(q[0]+rx*o,0,q[1]+rz*o,0.08,3.0,0.08,face,akkC(0x8a9096));
    Gm.box(q[0],1.75,q[1],2.2,1.2,0.06,face,akkC(0xf2c200));akkSign(Gt,uv.ortsschild,q[0]+Math.sin(face)*0.04,1.78,q[1]+Math.cos(face)*0.04,2.1,1.14,face);
    akkSign(Gt,uv.wegweiser,q[0]-Math.sin(face)*0.04,1.85,q[1]-Math.cos(face)*0.04,2.1,0.95,face+Math.PI);akkHitObb(Z,q[0],q[1],1.6,0.3,face,3);sign={x:q[0],z:q[1],face};}
  AKK.brueckenkopf={B,U,N,hw,pylons:pyl,sign,osm:!!B0};AKK.gag.signs=AKK_SIGN_TEXTS.ortsschild.concat(AKK_SIGN_TEXTS.wegweiser);}
// Rheinufer: Uferlinie aus dem Wasserraster (Strahlen von einer Grundlinie im Land zum Wasser)
function akkBuildUfer(Z){const A=[470,-985],Bp=[720,-640];const L=Math.hypot(Bp[0]-A[0],Bp[1]-A[1]);const d=[(Bp[0]-A[0])/L,(Bp[1]-A[1])/L],n=[-d[1],d[0]];
  const path=[];for(let t=0;t<=L;t+=4){const bx=A[0]+d[0]*t,bz=A[1]+d[1]*t;let sw=null;for(let s=0;s<150;s+=1){const i=idx(bx+n[0]*s,bz+n[1]*s);if(i<0)break;if(mfG(i)&4){sw=s;break;}}if(sw!==null)path.push({t,bx,bz,sw});}
  const at=(p,o)=>[p.bx+n[0]*(p.sw-o),p.bz+n[1]*(p.sw-o)];const face=Math.atan2(n[0],n[1]);const U={path,n,benches:[],lamps:[],bins:[],bushes:[]};let lb=-99,ll=-99,lbin=-99;
  for(const p of path){if(p.t-lb>=26){const [x,z]=at(p,4.5);if(akkFreeR(x,z,1.0)){U.benches.push({x,z,face});lb=p.t;}}
    if(p.t-ll>=20){const [x,z]=at(p,8);if(akkFreeR(x,z,0.4)){U.lamps.push({x,z,face});ll=p.t;}}
    if(p.t-lbin>=60){const [x,z]=at(p,6.5);if(akkFreeR(x,z,0.4)){U.bins.push({x,z,face});lbin=p.t;}}
    if(p.t%12===0){const [x,z]=at(p,12+(p.t%24?1.5:0));if(akkFreeR(x,z,1.0)&&!U.lamps.some(l=>Math.hypot(l.x-x,l.z-z)<3))U.bushes.push({x,z,face:p.t,s:0.8+((p.t*7)%5)/10});}}
  U.benches=akkKeep(U.benches);U.lamps=akkKeep(U.lamps);U.bushes=akkKeep(U.bushes);
  for(const b of U.benches)akkHitObb(Z,b.x,b.z,1.9,0.6,b.face,1);for(const l of U.lamps)akkHitCirc(Z,l.x,l.z,0.2,6);for(const b of U.bins)akkHitCirc(Z,b.x,b.z,0.3,1);
  const bg=new GB();for(const zz of [-0.2,0,0.2])bg.box(0,0.45,zz,1.8,0.04,0.12,0,WHITE,1);bg.box(0,0.55,-0.27,1.8,0.12,0.04,0,WHITE,1);bg.box(0,0.72,-0.29,1.8,0.12,0.04,0,WHITE,1);
  for(const x of [-0.75,0.75])bg.box(x,0,0,0.08,0.45,0.5,0,akkC(0x262626),1);
  const benchMat=Z.mats.bench||(Z.mats.bench=lazyOwn(Z,stdMat({vertexColors:true,color:0x8a5a36,roughness:0.7})));akkInst(Z,bg.geo(),benchMat,U.benches);
  akkInst(Z,new THREE.CylinderGeometry(0.07,0.09,4.6,8).translate(0,2.3,0),akkMat(Z,'instM'),U.lamps);akkInst(Z,new THREE.SphereGeometry(0.28,10,8).translate(0,4.7,0),lampMat,U.lamps,false);
  akkInst(Z,new THREE.CylinderGeometry(0.28,0.24,0.9,10).translate(0,0.45,0),akkMat(Z,'instM'),U.bins,true,[0x2f6b3a]);
  akkInst(Z,new THREE.IcosahedronGeometry(1.0,0).translate(0,0.7,0),akkMat(Z,'inst'),U.bushes,true,[0x4f7a32,0x5d8a3a,0x46702c]);
  AKK.ufer=U;return U;}
function akkKastelScenes(Z){const D=AKK_REDUIT_DOOR,fx=Math.sin(D[2]),fz=Math.cos(D[2]),rx=Math.cos(D[2]),rz=-Math.sin(D[2]);const R=AKK.reduit,U=AKK.ufer,BK=AKK.brueckenkopf;
  if(R.flags.length){const f=R.flags[0];const p=akkSpot(f.x+fx*1.6+rx*0.8,f.z+fz*1.6+rz*0.8,0.5,5)||[f.x+fx*1.6,f.z+fz*1.6];
    akkScene(Z,'fahne','Fahnewart am Reduit',p[0],p[1],[{x:p[0],z:p[1],face:D[2]+Math.PI,pose:'stand',name:'Fahnewart Erwin',conv:'fahne'}]);}
  if(BK.sign){const s=BK.sign;const lf=akkLF(s.x,s.z,s.face);const a=lf.P(-1.4,0,1.6),b=lf.P(1.4,0,1.6);const pa=akkSpot(a[0],a[2],0.4,4),pb=akkSpot(b[0],b[2],0.4,4);
    if(pa&&pb)akkScene(Z,'ortsschild','Streit am Ortsschild',(pa[0]+pb[0])/2,(pa[1]+pb[1])/2,[{x:pa[0],z:pa[1],face:Math.atan2(pb[0]-pa[0],pb[1]-pa[1]),name:'Meenzer Fritz',conv:'ortsschild',side:'mz'},
      {x:pb[0],z:pb[1],face:Math.atan2(pa[0]-pb[0],pa[1]-pb[1]),name:'Wissbadener Klaus',conv:'ortsschild',side:'wi'}],{gag:true});}
  const bench=U.benches.slice().sort((a,b)=>Math.hypot(a.x-500,a.z+905)-Math.hypot(b.x-500,b.z+905))[0];
  if(bench){const lf=akkLF(bench.x,bench.z,bench.face);const p0=lf.P(-0.45,0,-0.05),p1=lf.P(0.45,0,-0.05);
    akkScene(Z,'bank','Rentner am Rheinufer',bench.x,bench.z,[{x:p0[0],z:p0[2],y:0,face:bench.face,pose:'sit',name:'Hannelore aus Kastel',conv:'bank'},{x:p1[0],z:p1[2],y:0,face:bench.face,pose:'sit',name:'Günther aus Kastel',conv:'bank'}]);}
  const ap=U.path.slice().sort((a,b)=>Math.abs(a.t-300)-Math.abs(b.t-300))[0];
  if(ap){const x=ap.bx+U.n[0]*(ap.sw-1.5),z=ap.bz+U.n[1]*(ap.sw-1.5);akkScene(Z,'angler','Angler am Kasteler Ufer',x,z,[{x,z,y:0,face:Math.atan2(U.n[0],U.n[1]),pose:'rod',name:'Angler-Rudi',conv:'angler'}],{extra:true});}}
const AKK_SIGN_TEXTS={reduit:['REDUIT','Festungsbau der Bundesfestung Mainz','19. Jahrhundert · heute Museum'],akk:['Wem gehört AKK?','Amöneburg · Kastel · Kostheim','seit 1945 bei Wiesbaden – im Herzen?'],
  ortsschild:['Mainz-Kastel','Landeshauptstadt Wiesbaden','AKK bleibt Meenzerisch!'],wegweiser:['Mainz  0,5 km','Wiesbaden  9 km','(noch Fragen?)'],
  bad:['FREIBAD MAARAUE','Täglich 9 – 20 Uhr · Bitte vor dem Baden duschen'],kiosk:['KIOSK','Pommes · Eis · Fleischworscht'],
  muendung:['Mainmündung','Hier fließt der Main in den Rhein.','Main-Kilometer 0 · Gegenüber: die Mainspitze','Der braune Streifen ist Mainwasser.'],
  schleuse:['SCHLEUSE KOSTHEIM','Staustufe am Main'],ind:['INDUSTRIEPARK AMÖNEBURG','Werkstor 3 · Zutritt nur mit Werksausweis'],
  warn:['Achtung Werksverkehr'],amoe:['Mainz-Amöneburg','Landeshauptstadt Wiesbaden','Wem gehör’ mir eichentlich?']};
for(const k in AKK_SIGN_TEXTS)akkTexts(...AKK_SIGN_TEXTS[k]);
function akkFlagPanel(cols,stripes){return (g,w,h)=>{const n=cols.length;for(let i=0;i<n;i++){g.fillStyle=cols[i];if(stripes==='h')g.fillRect(0,i*h/n,w,h/n);else g.fillRect(i*w/n,0,w/n,h);}};}
function akkSignPanel(k,lines,bg,fg,sub,{border='#ffffff',sticker=null}={}){return {k,w:512,h:256,draw(g,w,h){g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=border;g.lineWidth=10;g.strokeRect(8,8,w-16,h-16);
  akkText(g,lines[0],w/2,h*0.3,w-60,72,fg);for(let i=1;i<lines.length;i++)akkText(g,lines[i],w/2,h*0.3+i*h*0.22+8,w-60,34,sub);
  if(sticker){g.save();g.translate(w*0.66,h*0.84);g.rotate(-0.12);g.fillStyle='#ffffff';g.fillRect(-170,-26,340,52);g.strokeStyle='#d0021b';g.lineWidth=4;g.strokeRect(-170,-26,340,52);akkText(g,sticker,0,2,320,34,'#d0021b');g.restore();}}};}
function akkKastelBuild(Z){const uv=akkAtlas(Z,[
    akkSignPanel('reduit',AKK_SIGN_TEXTS.reduit,'#3a3226','#f3e6c8','#e0d2b0',{border:'#c9a96e'}),akkSignPanel('akk',AKK_SIGN_TEXTS.akk,'#2f4a2f','#ffffff','#ffd23f'),
    {k:'ortsschild',w:512,h:256,draw(g,w,h){g.fillStyle='#f2c200';g.fillRect(0,0,w,h);g.strokeStyle='#111';g.lineWidth=12;g.strokeRect(10,10,w-20,h-20);akkText(g,AKK_SIGN_TEXTS.ortsschild[0],w/2,92,w-60,86,'#111');
      akkText(g,AKK_SIGN_TEXTS.ortsschild[1],w/2,170,w-80,34,'#111');g.save();g.translate(w*0.62,h*0.83);g.rotate(-0.1);g.fillStyle='#fff';g.fillRect(-180,-24,360,48);g.strokeStyle='#d0021b';g.lineWidth=4;g.strokeRect(-180,-24,360,48);akkText(g,AKK_SIGN_TEXTS.ortsschild[2],0,2,340,32,'#d0021b');g.restore();}},
    akkSignPanel('wegweiser',AKK_SIGN_TEXTS.wegweiser,'#1f5fa8','#ffffff','#ffffff'),
    {k:'flagMz',w:192,h:128,draw:akkFlagPanel(['#d0021b','#ffffff'],'h')},{k:'flagWi',w:192,h:128,draw:akkFlagPanel(['#1d4f9c','#f2c200'],'h')}]);
  const Gs=new GB(),Gm=new GB(),Gg=new GB(),Gt=new GB();akkBuildReduit(Z,Gs,Gm,Gg,Gt,uv);akkBuildBrueckenkopf(Z,Gs,Gm,Gg,Gt,uv);
  akkMesh(Z,Gs,'stone');akkMesh(Z,Gm,'metal');akkMesh(Z,Gg,'glow',false);akkMesh(Z,Gt,Z.mats.atlas,false);akkBuildFlags(Z,uv);akkBuildUfer(Z);akkKastelScenes(Z);}

// =====================================================================================================================
// MAARAUE: Freibad und Mainmündung
// =====================================================================================================================
function akkBadLF(){const B=AKK_BAD;return akkLF(B.O[0],B.O[1],Math.atan2(-B.U[1],B.U[0]));}
function akkMaaraueBuild(Z){const B=AKK_BAD,lf=akkBadLF();const uv=akkAtlas(Z,[akkSignPanel('bad',AKK_SIGN_TEXTS.bad,'#1d6fa5','#ffffff','#ffd23f'),akkSignPanel('kiosk',AKK_SIGN_TEXTS.kiosk,'#e63946','#ffffff','#ffe9a8'),
    akkSignPanel('muendung',AKK_SIGN_TEXTS.muendung,'#2f4a2f','#ffffff','#e8e0c8',{border:'#e8e0c8'})]);
  const Gs=new GB(),Gm=new GB(),Gp=new GB(),Gt=new GB();const DECK=akkC(0xd8d4c8),COP=akkC(0xf4f4f0),TILE=akkC(0x3fa9d9),LANE=akkC(0x1d4f8c),CON=akkC(0xb8b4aa),WH=akkC(0xffffff),BLUE=akkC(0x1d6fa5);
  const S={pools:[],fence:0,umbrellas:[],towels:[],tower:null,boards:[]};
  // Becken: Wasserfläche knapp über dem Boden (der Boden deckt alles darunter ab), Bahnen, Beckenrand, Deck
  for(const p of B.pools){if(p.r!==undefined){const c=lf.P(p.cu,0,p.cv);const n=20;for(let k=0;k<n;k++){const a0=k/n*TAU,a1=(k+1)/n*TAU;
      const q0=lf.P(p.cu+Math.cos(a0)*p.r,0.07,p.cv+Math.sin(a0)*p.r),q1=lf.P(p.cu+Math.cos(a1)*p.r,0.07,p.cv+Math.sin(a1)*p.r);Gp.triOut([c[0],0.07,c[2]],q1,q0,[0,0],[1,0],[0,1],akkC(0x6cc6e8),[c[0],-1,c[2]]);
      const o0=lf.P(p.cu+Math.cos(a0)*(p.r+0.5),0,p.cv+Math.sin(a0)*(p.r+0.5)),o1=lf.P(p.cu+Math.cos(a1)*(p.r+0.5),0,p.cv+Math.sin(a1)*(p.r+0.5));akkUp(Gs,[q0[0],0.16,q0[2]],[q1[0],0.16,q1[2]],[o1[0],0.16,o1[2]],[o0[0],0.16,o0[2]],COP);}
      S.pools.push({id:p.id,name:p.name,x:c[0],z:c[2]});continue;}
    akkFlat(Gp,lf,p.u0,p.u1,p.v0,p.v1,0.07,TILE);
    if(p.lanes){const w=(p.v1-p.v0)/p.lanes;for(let k=0;k<p.lanes;k++){const v=p.v0+w*(k+0.5);akkFlat(Gp,lf,p.u0+2,p.u1-2,v-0.12,v+0.12,0.075,LANE);}}
    for(const [u0,u1,v0,v1] of [[p.u0-0.6,p.u1+0.6,p.v0-0.6,p.v0],[p.u0-0.6,p.u1+0.6,p.v1,p.v1+0.6],[p.u0-0.6,p.u0,p.v0,p.v1],[p.u1,p.u1+0.6,p.v0,p.v1]])lf.box(Gs,(u0+u1)/2,0,(v0+v1)/2,u1-u0,0.18,v1-v0,COP);
    akkFlat(Gs,lf,p.u0-4,p.u1+4,p.v0-4,p.v0-0.6,0.03,DECK);akkFlat(Gs,lf,p.u0-4,p.u1+4,p.v1+0.6,p.v1+4,0.03,DECK);akkFlat(Gs,lf,p.u0-4,p.u0-0.6,p.v0-0.6,p.v1+0.6,0.03,DECK);akkFlat(Gs,lf,p.u1+0.6,p.u1+4,p.v0-0.6,p.v1+0.6,0.03,DECK);
    if(p.id==='schwimmer')for(let k=0;k<p.lanes;k++){const v=p.v0+(p.v1-p.v0)/p.lanes*(k+0.5);lf.box(Gs,p.u0-1.4,0,v,0.8,0.7,0.6,k%2?WH:BLUE);}
    const c=lf.P((p.u0+p.u1)/2,0,(p.v0+p.v1)/2);S.pools.push({id:p.id,name:p.name,x:c[0],z:c[2]});}
  // Sprungturm: Treppe (Rampe als Stufe), Plattform 3 m mit Brett, 1-m-Brett mit eigener Rampe
  {const T=B.tower,RL=akkC(0x9aa0a6);for(let k=0;k<8;k++){const v0=-10+k;lf.box(Gs,T.u,0,v0+0.5,1.4,(k+1)*3/8,1.0,CON);}
    lf.box(Gs,T.u,0,0,3.0,3.0,4.0,CON);lf.box(Gm,T.u+1.45,3.0,0,0.06,1.0,4.0,RL);lf.box(Gm,T.u,3.0,1.95,3.0,1.0,0.06,RL);
    for(const s of [-1,1]){const a=lf.P(T.u+s*0.75,1.0,-10),b=lf.P(T.u+s*0.75,4.0,-2);Gm.beam(a,b,0.06,0.06,RL);for(const v of [-10,-6])lf.box(Gm,T.u+s*0.75,0,v,0.06,1.0+(v+10)/8*3,0.06,RL);}
    lf.box(Gm,T.u-4.75,2.88,0,6.5,0.12,0.7,BLUE);
    for(let k=0;k<3;k++)lf.box(Gs,T.u+2-k,0,6,1.0,(k+1)/3,0.9,CON);lf.box(Gm,T.u-4,0.9,6,7.0,0.1,0.6,BLUE);
    akkStepRect(Z,lf,T.u-0.7,T.u+0.7,-10,-2,(u,v)=>clamp((v+10)/8*3,0,3));akkStepRect(Z,lf,T.u-1.5,T.u+1.5,-2,2,3);akkStepRect(Z,lf,T.u-8,T.u-1.5,-0.35,0.35,3);
    akkStepRect(Z,lf,T.u-0.5,T.u+2.5,5.55,6.45,(u,v)=>clamp((T.u+2.5-u)/3,0,1));akkStepRect(Z,lf,T.u-7.5,T.u-0.5,5.7,6.3,1);
    const top=lf.P(T.u,0,0);S.tower={x:top[0],z:top[2],h:3,board:lf.P(T.u-7.6,3,0),board1:lf.P(T.u-7,1,6),stairs:lf.P(T.u,0,-9.5),face:lf.rot+Math.PI/2};}
  // Bademeisterstuhl, Duschen, Kiosk, Umkleide-Schild
  {const c=lf.P(0,0,-13.5);for(const [du,dv] of [[-0.5,-0.4],[0.5,-0.4],[-0.5,0.4],[0.5,0.4]])lf.box(Gm,du,0,-13.5+dv,0.08,1.7,0.08,WH);lf.box(Gm,0,1.7,-13.5,1.2,0.1,1.0,WH);lf.box(Gm,0,1.8,-13.9,1.2,0.8,0.08,WH);
    akkHitObb(Z,c[0],c[2],1.4,1.2,lf.rot,2.4);S.chair={x:c[0],z:c[2],y:1.8};}
  for(const u of [-28,-29.5]){lf.box(Gm,u,0,-12.5,0.12,2.4,0.12,akkC(0x9aa0a6));lf.box(Gm,u,2.3,-12.2,0.1,0.1,0.6,akkC(0x9aa0a6));}
  {const k=lf.P(-20,0,-42);lf.box(Gs,-20,0,-42,4.5,2.8,3.2,akkC(0xf1e3c4));lf.box(Gs,-20,2.8,-42,5.3,0.2,4.0,akkC(0xc0392b));lf.box(Gs,-20,0.95,-40.2,4.0,0.12,0.6,akkC(0x8a5a30));
    for(let i=0;i<6;i++)lf.box(Gs,-22+i*0.8,2.25,-39.6,0.8,0.06,1.0,i%2?WH:akkC(0xe63946));
    lf.box(Gs,-20,3.0,-40.5,3.4,1.7,0.1,akkC(0xe63946));const sp=lf.P(-20,0,-40.43);akkSign(Gt,uv.kiosk,sp[0],3.05,sp[2],3.2,1.6,lf.rot);akkHitObb(Z,k[0],k[2],4.7,3.4,lf.rot,3);S.kiosk={x:k[0],z:k[2]};}
  // Zaun mit Tor (Schild über dem Eingang), Kollision je Seite, Lücke am Tor
  {const F=B.fence,FC=akkC(0x3f6b4a);const sides=[[[F.u0,F.v0],[F.gate[0],F.v0]],[[F.gate[1],F.v0],[F.u1,F.v0]],[[F.u1,F.v0],[F.u1,F.v1]],[[F.u1,F.v1],[F.u0,F.v1]],[[F.u0,F.v1],[F.u0,F.v0]]];
    for(const [a,b] of sides){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const du=(b[0]-a[0])/L,dv=(b[1]-a[1])/L;let run=null;
      const flush=()=>{if(!run)return;const m=[(run.a[0]+run.b[0])/2,(run.a[1]+run.b[1])/2],len=Math.hypot(run.b[0]-run.a[0],run.b[1]-run.a[1]);if(len>0.5){const w=lf.P(m[0],0,m[1]);
        const r=lf.rot+Math.atan2(-(run.b[1]-run.a[1]),run.b[0]-run.a[0]);for(const y of [0.9,1.75])Gm.box(w[0],y,w[2],len,0.05,0.05,r,FC);Gm.box(w[0],0.05,w[2],len,1.7,0.02,r,akkC(0x2d4a36));akkHitObb(Z,w[0],w[2],len,0.4,r,1.9);S.fence+=len;}run=null;};
      for(let t=0;t<=L;t+=2.5){const u=a[0]+du*t,v=a[1]+dv*t;const w=lf.P(u,0,v);const ok=akkFree(w[0],w[2]);
        if(ok){lf.box(Gm,u,0,v,0.08,1.9,0.08,FC);if(!run)run={a:[u,v],b:[u,v]};else run.b=[u,v];}else flush();}flush();}
    const g0=lf.P(F.gate[0],0,F.v0),g1=lf.P(F.gate[1],0,F.v0);for(const g of [g0,g1]){Gs.box(g[0],0,g[2],0.4,3.6,0.4,lf.rot,WH);akkHitCirc(Z,g[0],g[2],0.3,3.6);}
    const gm=lf.P((F.gate[0]+F.gate[1])/2,0,F.v0-0.1);Gs.box(gm[0],3.2,gm[2],F.gate[1]-F.gate[0],1.3,0.12,lf.rot,BLUE);const ov=[B.U[1],-B.U[0]];akkSign(Gt,uv.bad,gm[0]+ov[0]*0.08,3.15,gm[2]+ov[1]*0.08,8.0,1.4,Math.atan2(ov[0],ov[1]));
    S.gate={x:gm[0],z:gm[2]};}
  // Liegewiese: Handtücher und Sonnenschirme
  {const R=mulberry32(4142);const spots=[];for(let k=0;k<200&&spots.length<(akkLow()?18:36);k++){const u=-90+R()*160,v=-55+R()*12+(R()<0.5?0:85);if(v>45||v<-56)continue;
      if(B.pools.some(p=>p.r!==undefined?Math.hypot(u-p.cu,v-p.cv)<p.r+5:u>p.u0-5&&u<p.u1+5&&v>p.v0-5&&v<p.v1+5))continue;if(Math.abs(u-B.tower.u)<9&&v<8&&v>-12)continue;if(u>-26&&u<-14&&v<-37&&v>-47)continue;
      const w=lf.P(u,0,v);if(!akkFree(w[0],w[2])||spots.some(s=>Math.hypot(s.u-u,s.v-v)<4))continue;spots.push({u,v,x:w[0],z:w[2],face:lf.rot+(R()-0.5)*0.6});}
    S.towels=spots.map(s=>({x:s.x,y:0.02,z:s.z,face:s.face}));S.umbrellas=spots.filter((_,i)=>i%3===0).map(s=>{const w=lf.P(s.u+1.2,0,s.v-0.8);return {x:w[0],z:w[2],face:0};});
    akkInst(Z,new THREE.BoxGeometry(0.95,0.03,1.9),akkMat(Z,'inst'),S.towels,false,[0xe63946,0xffd23f,0x2a9df4,0x6a4c93,0x52b788,0xff7a3d,0xf4f4f0]);
    akkInst(Z,new THREE.CylinderGeometry(0.035,0.035,2.3,6).translate(0,1.15,0),akkMat(Z,'instM'),S.umbrellas);akkInst(Z,new THREE.ConeGeometry(1.4,0.55,10).translate(0,2.35,0),akkMat(Z,'inst'),S.umbrellas,true,[0xd62828,0xfcbf49,0x1d6fa5,0xf4f4f0]);
    for(const u of S.umbrellas)akkHitCirc(Z,u.x,u.z,0.12,2.6);}
  // Mainmündung: Aussichtsdeck an der Spitze, Tafel, Bank, Fernrohr; Mainwasser-Streifen im Rhein
  {const T=akkSpot(B.T[0],B.T[1],2.0,10)||B.T;const face=Math.atan2(-0.35,0.94);const ml=akkLF(T[0],T[1],face);const WOOD=akkC(0x8a6440);
    ml.box(Gs,0,0,0,5.0,0.25,4.0,WOOD);for(const s of [-1,1])ml.box(Gm,s*2.45,0.25,0,0.06,1.0,4.0,akkC(0x6b5a48));ml.box(Gm,0,0.25,1.95,5.0,1.0,0.06,akkC(0x6b5a48));
    ml.box(Gs,-1.0,0.25,-1.0,1.8,0.45,0.5,WOOD);ml.box(Gs,-1.0,0.7,-1.25,1.8,0.45,0.08,WOOD);ml.box(Gm,1.6,0.25,1.2,0.12,1.1,0.12,akkC(0x9aa0a6));akkTube(Gm,ml.P(1.6,1.4,1.0),ml.P(1.6,1.45,1.6),0.1,akkC(0x9aa0a6),8);
    const bp=ml.P(0,0,-2.6);for(const o of [-1,1]){const q=ml.P(o,0,-2.6);Gs.box(q[0],0,q[2],0.1,1.4,0.1,face,akkC(0x2b2420));}Gs.box(bp[0],1.25,bp[2],2.4,1.25,0.08,face,akkC(0x2b2420));
    akkSign(Gt,uv.muendung,bp[0]+Math.sin(face+Math.PI)*0.05,1.3,bp[2]+Math.cos(face+Math.PI)*0.05,2.3,1.15,face+Math.PI);
    akkHitObb(Z,bp[0],bp[2],2.4,0.3,face,2.6);akkStepRect(Z,ml,-2.5,2.5,-2.0,2.0,0.25);
    const band=[];for(const p of AKK_BAND){const i=idx(p[0],p[1]);if(i>=0&&(mfG(i)&4))band.push(p);}const Gb=new GB();const BW=16;
    for(let i=1;i<band.length;i++){const a=band[i-1],b=band[i];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const nx=-(b[1]-a[1])/L*BW,nz=(b[0]-a[0])/L*BW;const y=WATER_LEVEL+0.04;
      akkUp(Gb,[a[0]-nx,y,a[1]-nz],[b[0]-nx,y,b[1]-nz],[b[0]+nx,y,b[1]+nz],[a[0]+nx,y,a[1]+nz],WHITE);}
    const bm=akkMesh(Z,Gb,'band',false);if(bm)bm.renderOrder=2;
    AKK.muendung={x:T[0],z:T[1],deck:{x:T[0],z:T[1],y:0.25},band,board:{x:bp[0],z:bp[2]}};}
  akkMesh(Z,Gs,'stone');akkMesh(Z,Gm,'metal');akkMesh(Z,Gp,'pool',false);akkMesh(Z,Gt,Z.mats.atlas,false);AKK.bad=S;
  // Szenen
  {const c=S.chair;akkScene(Z,'bademeister','Bademeister am Schwimmerbecken',c.x,c.z,[{x:c.x,z:c.z,y:c.y-0.55,face:lf.rot+Math.PI,pose:'sit',name:'Bademeister Horst',conv:'bademeister'}]);}
  {const tw=S.towels.slice().sort((a,b)=>Math.hypot(a.x-S.pools[0].x,a.z-S.pools[0].z)-Math.hypot(b.x-S.pools[0].x,b.z-S.pools[0].z));const n=[];
    if(tw[0])n.push({x:tw[0].x,z:tw[0].z,y:0.12,face:tw[0].face,pose:'lie',name:'Sonnenanbeterin Petra',conv:'badegast'});if(tw[1])n.push({x:tw[1].x,z:tw[1].z,y:0,face:tw[1].face,pose:'sit',name:'Badegast Jürgen',conv:'badegast'});
    if(n.length)akkScene(Z,'badegast','Liegewiese',n[0].x,n[0].z,n,{extra:true});}
  {const k=lf.P(-20,0,-38.6);akkScene(Z,'kiosk','Kiosk im Freibad',k[0],k[2],[{x:k[0],z:k[2],face:lf.rot+Math.PI,pose:'stand',name:'Kiosk-Gaby',conv:'kiosk'}]);}
  {const M=AKK.muendung;const p=akkLF(M.x,M.z,Math.atan2(-0.35,0.94)).P(-1.0,0,-0.85);akkScene(Z,'muendung','Aussichtspunkt Mainmündung',p[0],p[2],[{x:p[0],z:p[2],y:0.25,face:Math.atan2(-0.35,0.94),pose:'sit',name:'Rentner Willi vun de Maaraue',conv:'muendung'}]);}}

// =====================================================================================================================
// KOSTHEIM: Schleuse und Wehr
// =====================================================================================================================
function akkLockLF(){const K=AKK_LOCK;return akkLF(K.C[0],K.C[1],K.rot);}
function akkSchleuseBuild(Z){const K=AKK_LOCK,lf=akkLockLF();const uv=akkAtlas(Z,[akkSignPanel('schleuse',AKK_SIGN_TEXTS.schleuse,'#ffffff','#1d3557','#1d3557',{border:'#1d3557'})]);
  const Gs=new GB(),Gm=new GB(),Gw=new GB(),Gt=new GB();const CON=akkC(0xa9a59b),DARK=akkC(0x5b5852),Y=akkC(0xf2c200),STEEL=akkC(0x58626b),WH=akkC(0xffffff);const L=K.L,W=K.W,T=K.wall;
  const S={walls:2,gates:[],bollards:0,level:K.low,phase:'einfahrt',t:0,cycles:0,weirPiers:0,building:null,barge:null};
  // Kammermauern (oben begehbar), Poller, gelbe Kante; Häupter mit Laufsteg über das Tor bis an beide Ufer
  for(const s of [-1,1]){const lz=s*(W+T/2);lf.box(Gs,0,-7,lz,2*L+4,7+K.top,T,CON);lf.box(Gs,0,K.top,s*(W+0.15),2*L+4,0.03,0.3,Y);
    for(let u=-L+5;u<=L-5;u+=10){lf.box(Gm,u,K.top,s*(W+0.7),0.35,0.5,0.35,DARK);S.bollards++;}akkStepRect(Z,lf,-L-2,L+2,s>0?W:-W-T,s>0?W+T:-W,K.top);}
  const bridges=[[-L-1.2,-24,22],[L+1.2,-17,18]];
  for(const [u,v0,v1] of bridges){lf.box(Gs,u,K.top-0.25,(v0+v1)/2,2.4,0.25,v1-v0,DARK);for(const s of [-1,1])lf.box(Gm,u+s*1.15,K.top,(v0+v1)/2,0.05,1.05,v1-v0,WH);akkStepRect(Z,lf,u-1.2,u+1.2,v0,v1,K.top);}
  // Tore: je zwei Stemmtorflügel an Drehpunkten in den Mauern (eigene Meshes, Winkel animiert)
  const leafG=new GB();leafG.box(W/2+0.15,0,0,W+0.3,7.5,0.5,0,STEEL);for(let y=0.5;y<7.5;y+=1.6)leafG.box(W/2+0.15,y,0.3,W,0.15,0.12,0,DARK);leafG.box(W/2+0.15,7.2,0,W+0.3,0.3,0.7,0,Y);
  const leafGeo=lazyOwn(Z,leafG.geo());
  for(const [gid,u,up] of [['unter',-L,-1],['ober',L,1]]){const g={id:gid,u,open:gid==='unter'?1:0,leaves:[]};
    for(const s of [-1,1]){const pv=lf.P(u,0,s*W);const piv=new THREE.Group();piv.position.set(pv[0],K.low-1.5,pv[2]);Z.group.add(piv);
      const m=new THREE.Mesh(leafGeo,akkMat(Z,'metal'));m.castShadow=!QS.noShadow;piv.add(m);g.leaves.push({piv,s,up});akkStats('schleuse').meshes++;}
    S.gates.push(g);}
  // Kammerwasser (Höhe animiert) und Oberwasser oberhalb des Oberhaupts bzw. des Wehrs
  {const wg=new GB();akkFlat(wg,akkLF(0,0,K.rot),-L,L,-W,W,0,WHITE);const geo=lazyOwn(Z,wg.geo());geo.translate(K.C[0],0,K.C[1]);const m=new THREE.Mesh(geo,akkMat(Z,'river'));m.position.y=K.low+0.02;Z.group.add(m);S.water=m;akkStats('schleuse').meshes++;}
  for(let u=L+2;u<L+40;u+=2)for(let v=-24;v<24;v+=2){const c=lf.P(u+1,0,v+1);const i=idx(c[0],c[2]);if(i<0||!(mfG(i)&4))continue;akkFlat(Gw,lf,u,u+2.05,v,v+2.05,K.high,WHITE);}
  let wz0=K.weir[0],wz1=K.weir[1];{let a=null,b=null;for(let z=-480;z<=-220;z+=1){const i=idx(K.weirX,z);if(i>=0&&(mfG(i)&4)){if(a===null)a=z;b=z;}}if(a!==null){wz0=a;wz1=b;}}
  for(let x=K.weirX+3;x<K.weirX+40;x+=2)for(let z=wz0;z<wz1;z+=2){const i=idx(x+1,z+1);if(i<0||!(mfG(i)&4))continue;akkUp(Gw,[x,K.high,z+2.05],[x+2.05,K.high,z+2.05],[x+2.05,K.high,z],[x,K.high,z],WHITE);}
  // Wehr: Pfeiler mit Maschinenhäuschen, Stahlschütze dazwischen, Steg obenauf
  {const n=5,span=(wz1-wz0)/n;const x=K.weirX;for(let k=0;k<=n;k++){const z=wz0+span*k;Gs.box(x,-7,z,14,10,3,0,CON);Gs.box(x,3,z,4,2.6,3.2,0,akkC(0xd9d4c4));Gs.box(x,5.6,z,4.4,0.3,3.6,0,akkC(0x8a3b2a));akkHitObb(Z,x,z,14,3,0,6);S.weirPiers++;}
    for(let k=0;k<n;k++){const z=wz0+span*(k+0.5);Gm.box(x+1.5,-6,z,0.8,K.high+6+0.2,span-3,0,STEEL);Gm.box(x+1.5,K.high+0.2,z,1.0,0.25,span-3,0,Y);akkHitObb(Z,x+1.5,z,1.2,span-3,0,K.high+0.3);}
    Gs.box(x-4,3,(wz0+wz1)/2,2.2,0.3,wz1-wz0+3,0,CON);for(const s of [-1,1])Gm.box(x-4+s*1.05,3.3,(wz0+wz1)/2,0.05,1.0,wz1-wz0+3,0,WH);S.weir={x,z0:wz0,z1:wz1};}
  // Steuerstand auf der Insel
  {const want=lf.P(-4,0,27);const q=akkSpot(want[0],want[2],4.5,12)||[want[0],want[2]];const bl=akkLF(q[0],q[1],K.rot);
    bl.box(Gs,0,0,0,8,6,6,akkC(0xe8e2d4));bl.box(Gs,0,6,0,8.6,0.3,6.6,DARK);bl.box(Gm,0,6.3,0,5,3,4,akkC(0x7fb3c8));bl.box(Gs,0,9.3,0,5.6,0.3,4.6,DARK);bl.box(Gs,0,0,-3.05,1.4,2.3,0.1,akkC(0x3a2a1a));
    const sp=bl.P(0,0,-3.08);akkSign(Gt,uv.schleuse,sp[0],4.2,sp[2],5.6,1.4,K.rot+Math.PI);akkHitObb(Z,q[0],q[1],8.2,6.2,K.rot,9);S.building={x:q[0],z:q[1]};}
  // Signale an den Häuptern (rot/grün umschaltbar)
  S.signals=[];for(const [gid,u] of [['unter',-L-3],['ober',L+3]]){const p=lf.P(u,0,-(W+T+0.8));Gm.box(p[0],0,p[2],0.2,4.2,0.2,K.rot,DARK);
    const r=new THREE.Mesh(Z.mats.sigG||(Z.mats.sigG=lazyOwn(Z,new THREE.SphereGeometry(0.28,10,8))),akkMat(Z,'red'));r.position.set(p[0],4.4,p[2]);Z.group.add(r);
    const g=new THREE.Mesh(Z.mats.sigG,akkMat(Z,'green'));g.position.set(p[0],3.8,p[2]);Z.group.add(g);S.signals.push({gid,r,g});akkStats('schleuse').meshes+=2;}
  // Frachtkahn in der Kammer (schwimmt mit dem Kammerwasser)
  {const bg=new GB(),HULL=akkC(0x2b3a4a),RED=akkC(0x8a1c1c),DECKC=akkC(0x5a4a3a);bg.box(0,-1.2,0,40,2.2,8.6,0,HULL);bg.box(0,0.95,0,40.2,0.2,8.8,0,RED);bg.box(-2,1.0,0,30,1.0,7.2,0,DECKC);
    for(let k=0;k<5;k++)bg.box(-15+k*6.5,2.0,0,5.6,0.25,7.0,0,akkC(0x6b7f3a));bg.box(17,1.0,0,5,3.2,7.6,0,WH);bg.box(17,4.2,0,4.4,1.6,6.8,0,akkC(0x3a6f8f));bg.box(17,5.8,0,5,0.2,8.0,0,HULL);bg.box(14.5,1.1,0,1,2.6,0.6,0,WH);
    const geo=lazyOwn(Z,bg.geo());const m=new THREE.Mesh(geo,akkMat(Z,'stone'));m.castShadow=!QS.noShadow;const p=lf.P(-6,0,0);m.position.set(p[0],K.low,p[2]);m.rotation.y=K.rot;Z.group.add(m);S.barge=m;akkStats('schleuse').meshes++;}
  akkMesh(Z,Gs,'stone');akkMesh(Z,Gm,'metal');akkMesh(Z,Gw,'river',false);akkMesh(Z,Gt,Z.mats.atlas,false);AKK.schleuse=S;akkLockSet(S,0);
  // Szenen: Schleusenwärter vor dem Steuerstand, Angler am Kostheimer Ufer, Bank
  {const b=S.building,bl=akkLF(b.x,b.z,K.rot);const p=bl.P(1.5,0,-4.6);akkScene(Z,'schleuse','Steuerstand Schleuse Kostheim',p[0],p[2],[{x:p[0],z:p[2],face:K.rot+Math.PI,pose:'stand',name:'Schleusewärter Bernd',conv:'schleuse'}]);}
  {const s=akkSpot(2952,-509,0.6,8);if(s)akkScene(Z,'kostheim','Angler am Kostheimer Mainufer',s[0],s[1],[{x:s[0],z:s[1],face:Math.atan2(0.3,0.95),pose:'rod',name:'Kostheimer Angler Heinz',conv:'kostheim'}],{extra:true});}}
// Schleusung: Einfahrt (unten offen) → Tor zu → Füllen → Obertor auf → oben → Tor zu → Leeren → Untertor auf
const AKK_LOCK_PHASES=[['einfahrt',8],['unter_zu',4],['fuellen',18],['ober_auf',4],['oben',8],['ober_zu',4],['leeren',14],['unter_auf',4]];
function akkLockSet(S,t){const K=AKK_LOCK;let T=0;for(const p of AKK_LOCK_PHASES)T+=p[1];t=((t%T)+T)%T;let a=0,ph=AKK_LOCK_PHASES[0],f=0;for(const p of AKK_LOCK_PHASES){if(t<a+p[1]){ph=p;f=(t-a)/p[1];break;}a+=p[1];}
  const sm=x=>x*x*(3-2*x);const lv={einfahrt:K.low,unter_zu:K.low,fuellen:lerp(K.low,K.high,sm(f)),ober_auf:K.high,oben:K.high,ober_zu:K.high,leeren:lerp(K.high,K.low,sm(f)),unter_auf:K.low}[ph[0]];
  const openU={einfahrt:1,unter_zu:1-f,unter_auf:f}[ph[0]]??0,openO={ober_auf:f,oben:1,ober_zu:1-f}[ph[0]]??0;
  S.phase=ph[0];S.level=lv;S.gates[0].open=openU;S.gates[1].open=openO;if(S.water)S.water.position.y=lv+0.02;if(S.barge)S.barge.position.y=lv;
  // Flügel: zu = quer zur Kammer (vom Drehpunkt zur Mitte), offen = an die Mauer geklappt (Oberhaupt nach oben, Unterhaupt nach unten)
  for(const g of S.gates)for(const l of g.leaves)l.piv.rotation.y=K.rot+l.s*Math.PI/2-l.s*l.up*Math.PI/2*g.open;
  for(const s of S.signals||[]){const g=S.gates.find(x=>x.id===s.gid);const go=g.open>0.98;s.g.visible=go;s.r.visible=!go;}}

// =====================================================================================================================
// AMÖNEBURG: Industriepark (generisch, ohne Firmennamen/Logos)
// =====================================================================================================================
function akkIndustrieBuild(Z){const I=AKK_IND;const uv=akkAtlas(Z,[akkSignPanel('ind',AKK_SIGN_TEXTS.ind,'#0f4c81','#ffffff','#ffd23f'),akkSignPanel('warn',AKK_SIGN_TEXTS.warn,'#ffd23f','#111111','#111111',{border:'#111111'}),
    {k:'amoe',w:512,h:256,draw(g,w,h){g.fillStyle='#f2c200';g.fillRect(0,0,w,h);g.strokeStyle='#111';g.lineWidth=12;g.strokeRect(10,10,w-20,h-20);akkText(g,AKK_SIGN_TEXTS.amoe[0],w/2,92,w-60,80,'#111');
      akkText(g,AKK_SIGN_TEXTS.amoe[1],w/2,170,w-80,34,'#111');g.save();g.translate(w*0.6,h*0.83);g.rotate(0.08);g.fillStyle='#fff';g.fillRect(-180,-24,360,48);g.strokeStyle='#1d4f9c';g.lineWidth=4;g.strokeRect(-180,-24,360,48);akkText(g,AKK_SIGN_TEXTS.amoe[2],0,2,340,30,'#1d4f9c');g.restore();}}]);
  const Gs=new GB(),Gm=new GB(),Gg=new GB(),Gt=new GB();const WH=akkC(0xe9ecef),GREY=akkC(0x9aa1a8),CON=akkC(0xa8a49a),STEEL=akkC(0x6c757d),RED=akkC(0xc1121f),Y=akkC(0xf2c200),PIPE=akkC(0x8d99ae);
  const S={tanks:[],chimneys:[],rack:0,supports:0,fence:0,barrier:0,steam:0,booth:null,gate:null};const [lx,lz,lw,ld]=I.lot;
  // Auffangwanne (niedrige Betonmauer) mit Lücke am Tor im Osten
  const gz0=I.gate[1]-I.gate[2]/2,gz1=I.gate[1]+I.gate[2]/2,x0=lx-lw/2,x1=lx+lw/2,z0=lz-ld/2,z1=lz+ld/2;
  for(const [a,b] of [[[x0,z0],[x1,z0]],[[x0,z1],[x1,z1]],[[x0,z0],[x0,z1]],[[x1,z0],[x1,gz0]],[[x1,gz1],[x1,z1]]]){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const r=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    Gs.box(m[0],0,m[1],L+0.4,0.9,0.4,r,CON);Gm.box(m[0],0.9,m[1],L,1.5,0.03,r,akkC(0x3b4a52));for(let t=0;t<=L;t+=3)Gm.box(a[0]+(b[0]-a[0])*t/L,0.9,a[1]+(b[1]-a[1])*t/L,0.08,1.6,0.08,0,STEEL);akkHitObb(Z,m[0],m[1],L+0.4,0.5,r,2.4);S.fence+=L;}
  akkUp(Gs,[x0,0.04,z1],[x1,0.04,z1],[x1,0.04,z0],[x0,0.04,z0],akkC(0x8f8b82));
  // Tanks 2×2 mit Dachkegel, Wendeltreppe, Rohrverteiler
  for(const [dx,dz] of [[-9,-6],[8,-6],[-9,6.5],[8,6.5]]){const x=lx+dx,z=lz+dz,r=5.2,h=12+((dx>0)?2:0);akkCyl(Gs,x,0,z,r,h,WH,20,false);akkCyl(Gs,x,h,z,r,1.6,GREY,20,true,0.6);
    for(let k=0;k<3;k++)akkCyl(Gm,x,3.5+k*3.5,z,r+0.05,0.18,GREY,20,false);for(let k=0;k<10;k++){const a=k*0.55,y=k*h/10;Gm.box(x+Math.cos(a)*(r+0.5),y,z+Math.sin(a)*(r+0.5),1.0,0.12,0.7,-a,STEEL);}
    Gg.box(x+r*0.7,h-1.5,z-r*0.7,0.4,0.4,0.05,0,RED);akkHitCirc(Z,x,z,r+0.6,h+1.6);S.tanks.push({x,z,r,h});}
  for(const z of [lz-0.4,lz+0.4])akkTube(Gm,[x0+2,1.2,z],[x1-1,1.2,z],0.22,PIPE,8);for(const t of S.tanks)akkTube(Gm,[t.x,1.2,t.z+(t.z<lz?t.r:-t.r)],[t.x,1.2,lz],0.18,PIPE,8);
  // Schornsteine mit Warnbändern und Flugwarnlampen (Dampf im Update)
  for(const c of I.chim){const q=akkSpot(c[0],c[1],2.8,6);if(!q)continue;const H=68;akkCyl(Gs,q[0],0,q[1],2.6,H-6,akkC(0xd6d2c8),16,false,1.9);
    for(let k=0;k<3;k++)akkCyl(Gs,q[0],H-6+k*2,q[1],1.9-k*0.02,2,k%2?WH:RED,16,k===2,1.88-k*0.02);Gg.box(q[0]+1.95,H-3,q[1],0.3,0.3,0.3,0,RED);Gs.box(q[0],0,q[1],6,2.2,6,0,CON);
    akkHitCirc(Z,q[0],q[1],3.2,H);S.chimneys.push({x:q[0],z:q[1],h:H});}
  // Rohrbrücke über die Werkstraße: Portale auf freien Zellen, drei Rohre auf 6–7 m
  {const [a,b]=I.rack;const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const ux=(b[0]-a[0])/L,uz=(b[1]-a[1])/L,nx=-uz,nz=ux;const rot=Math.atan2(-uz,ux);
    for(let t=0;t<=L;t+=L/4){const x=a[0]+ux*t,z=a[1]+uz*t;if(!akkFree(x+nx*1.4,z+nz*1.4)||!akkFree(x-nx*1.4,z-nz*1.4))continue;for(const s of [-1,1]){Gm.box(x+nx*1.4*s,0,z+nz*1.4*s,0.35,7.4,0.35,rot,STEEL);akkHitCirc(Z,x+nx*1.4*s,z+nz*1.4*s,0.3,7.4);}
      Gm.box(x,7.2,z,0.3,0.3,3.4,rot,STEEL);S.supports++;}
    for(const [o,y,r,col] of [[-0.9,6.4,0.3,PIPE],[0,6.5,0.4,akkC(0xb5651d)],[0.9,6.4,0.25,Y]])akkTube(Gm,[a[0]+nx*o,y,a[1]+nz*o],[b[0]+nx*o,y,b[1]+nz*o],r,col,8);S.rack=L;}
  // Werkstor: Pförtnerhaus, Schranke (eigenes Mesh, öffnet bei Annäherung), Schilder; Ortsschild-Gag an der Zufahrt
  {const bq=akkSpot(I.booth[0],I.booth[1],2.0,6)||I.booth;const bl=akkLF(bq[0],bq[1],0);bl.box(Gs,0,0,0,3.4,2.8,3.0,WH);bl.box(Gs,0,2.8,0,3.9,0.25,3.5,akkC(0x1d3557));bl.box(Gm,0,1.1,1.52,2.6,1.1,0.05,akkC(0x7fb3c8));
    akkHitObb(Z,bq[0],bq[1],3.6,3.2,0,3.1);S.booth={x:bq[0],z:bq[1]};
    const gx=x1+0.8;const post=[gx,gz0-0.6];Gs.box(post[0],0,post[1],0.6,1.1,0.6,0,akkC(0xd62828));
    const armG=new GB();for(let k=0;k<6;k++)armG.box(0,0,0.6+k*1.6+0.8,0.14,0.14,1.6,0,k%2?WH:RED);const piv=new THREE.Group();piv.position.set(post[0],1.05,post[1]);Z.group.add(piv);
    const arm=new THREE.Mesh(lazyOwn(Z,armG.geo()),akkMat(Z,'metal'));piv.add(arm);akkStats('amoeneburg').meshes++;S.arm=piv;S.gate={x:gx,z:I.gate[1]};
    const sp=[x1+3.2,z0-1.5];for(const o of [-1.4,1.4])Gm.box(sp[0],0,sp[1]+o,0.12,3.2,0.12,0,STEEL);Gm.box(sp[0],2.0,sp[1],0.06,1.4,3.2,0,akkC(0x0f4c81));
    akkSign(Gt,uv.ind,sp[0]+0.05,2.05,sp[1],3.1,1.3,Math.PI/2);akkHitObb(Z,sp[0],sp[1],0.4,3.2,0,3.3);
    const wp=[x1+3.2,z1+2.0];Gm.box(wp[0],0,wp[1],0.1,2.4,0.1,0,STEEL);akkSign(Gt,uv.warn,wp[0]+0.07,1.6,wp[1],1.6,0.8,Math.PI/2);akkHitCirc(Z,wp[0],wp[1],0.2,2.4);
    const op=akkSpot(lx+lw/2+16,lz+20,0.5,10);if(op){for(const o of [-0.7,0.7])Gm.box(op[0],0,op[1]+o,0.08,3.0,0.08,0,akkC(0x8a9096));Gm.box(op[0],1.75,op[1],0.06,1.2,2.2,0,Y);
      akkSign(Gt,uv.amoe,op[0]+0.04,1.78,op[1],2.1,1.14,Math.PI/2);akkSign(Gt,uv.amoe,op[0]-0.04,1.78,op[1],2.1,1.14,-Math.PI/2);akkHitObb(Z,op[0],op[1],0.3,1.6,0,3);S.ortsschild={x:op[0],z:op[1]};}}
  akkMesh(Z,Gs,'stone');akkMesh(Z,Gm,'metal');akkMesh(Z,Gg,'glow',false);akkMesh(Z,Gt,Z.mats.atlas,false);AKK.industrie=S;
  {const b=S.booth;akkScene(Z,'pfoertner','Pförtner am Werkstor',b.x+0.2,b.z+2.4,[{x:b.x+0.2,z:b.z+2.4,face:Math.PI/2,pose:'helmet',helm:0xffffff,name:'Pförtner Manfred',conv:'pfoertner'}]);}
  {const p=akkSpot(S.gate.x+4,S.gate.z+7,0.8,8);if(p)akkScene(Z,'arbeiter','Frühstückspause am Werkstor',p[0],p[1],[{x:p[0]-0.6,z:p[1],face:Math.PI/2,pose:'helmet',name:'Schichtarbeiter Ali',conv:'arbeiter'},{x:p[0]+0.6,z:p[1],face:-Math.PI/2,pose:'helmet',helm:0xff7a00,name:'Schichtarbeiterin Sabine',conv:'arbeiter'}],{extra:true});}}

// =====================================================================================================================
// ZONEN, AUFBAU, LAUFZEIT
// =====================================================================================================================
const AKK_BUILD={kastel:akkKastelBuild,maaraue:akkMaaraueBuild,schleuse:akkSchleuseBuild,amoeneburg:akkIndustrieBuild};
function akkZoneBuild(Z){akkRng(()=>{const k=Z.o.key;AKK.stats[k]={meshes:0,inst:0,props:0,cast:0,verts:0,tris:0,texPx:0};Z.mats={};Z.hits=null;Z.steps=null;
  AKK.live.push(Z);AKK.hitOn++;AKK.stepOn++;if(k==='maaraue')AKK.poolOn++;
  AKK_BUILD[k](Z);akkSpawnScenes(Z);if(k==='schleuse')akkLockSet(AKK.schleuse,AKK.schleuse.t);});}
function akkZoneDispose(Z){const k=Z.o.key;akkDropScenes(Z);const i=AKK.live.indexOf(Z);if(i>=0){AKK.live.splice(i,1);AKK.hitOn--;AKK.stepOn--;if(k==='maaraue')AKK.poolOn--;}
  Z.hits=null;Z.steps=null;Z.mats=null;
  if(k==='kastel'){akkFreeRoom();if(AKK.reduit)for(const f of AKK.reduit.flags)f.mesh=null;}
  if(k==='schleuse'&&AKK.schleuse){const S=AKK.schleuse;S.water=null;S.barge=null;S.signals=[];for(const g of S.gates)g.leaves=[];}
  if(k==='amoeneburg'&&AKK.industrie)AKK.industrie.arm=null;
  if(k==='maaraue')AKK.swim.in=false;}

function setupAkk(){
  for(const k in AKK_ZC)AKK.zones[k]=lazyZone({name:'akk_'+k,key:k,x:AKK_ZC[k][0],z:AKK_ZC[k][1],build:akkZoneBuild,dispose:akkZoneDispose});
  label('Reduit-Hof',AKK_REDUIT_DOOR[0]-10,AKK_REDUIT_DOOR[1]+5,'small');label('Freibad Maaraue',AKK_BAD.O[0],AKK_BAD.O[1],'lm');label('Mainmündung',AKK_BAD.T[0],AKK_BAD.T[1]+15,'small');
  label('Schleuse Kostheim',AKK_LOCK.C[0],AKK_LOCK.C[1],'lm');label('Industriepark Amöneburg',AKK_IND.lot[0],AKK_IND.lot[1],'small');label('Kasteler Rheinufer',600,-720,'small');}

function updateAkk(dt){const P=P1;if(!P||!P.h)return;if(AKK.venue.room&&!AKK.zones.kastel.built)akkFreeRoom();if(!AKK.live.length)return;akkRng(()=>akkUpdate(dt,P));}
function akkUpdate(dt,P){const [px,pz]=ppos(P);const indoor=!!P.h.room;for(const Z of AKK.live)if(Z.group)Z.group.visible=!indoor;
  // Szenen: Blick zum Spieler, Sprüche in der Nähe; Ortsschild-Streit wechselt Meenz/Wissbaade ab
  for(const sc of AKK.scenes){if(!sc.people.length)continue;const d=Math.hypot(sc.x-px,sc.z-pz);
    for(const h of sc.people){if(h.removed||!h.alive||h.state!=='roof')continue;
      if(h.akkPose==='stand'||h.akkPose==='helmet'){const dx=P.h.x-h.x,dz=P.h.z-h.z;if(dx*dx+dz*dz<49)faceTo(h,dx,dz,dt,2);}
      if(h.akkLie){h.g.rotation.x=-Math.PI/2;}if(h.fx&&h.face.visible)h.updateFace();h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}
    sc.lineT-=dt;if(sc.lineT>0)continue;sc.lineT=sc.gag?5+Math.random()*3:8+Math.random()*7;if(d>(sc.gag?24:22)||indoor)continue;
    const c=sc.people.filter(h=>!h.removed&&h.alive&&h.state==='roof'&&!h.bubble);if(!c.length)continue;
    if(sc.gag){const G=AKK.gag;const side=G.side==='mz'?'wi':'mz';const h=c.find(o=>o.akkSide===side);if(!h)continue;const L=AKK_GAG[side];const t=L[G.lines%L.length];say(h,t,4.2);G.side=side;G.lines++;G.last=t;}
    else if(sc.lines.length)say(mpick(c),mpick(sc.lines),3.6);}
  if(AKK.zones.kastel.built)akkUpdateKastel(dt,P,px,pz);
  if(AKK.zones.maaraue.built)akkUpdateBad(dt,P);
  if(AKK.zones.schleuse.built&&AKK.schleuse){const S=AKK.schleuse;const ph=S.phase;S.t+=dt;akkLockSet(S,S.t);if(ph==='leeren'&&S.phase==='unter_auf')S.cycles++;akkLockLadder(dt,P);}
  if(AKK.zones.amoeneburg.built&&AKK.industrie)akkUpdateIndustrie(dt,P,px,pz);}
// Wer in die Kammer fällt, kommt über die Steigleiter wieder auf die Mauer
function akkLockLadder(dt,P){const S=AKK.schleuse,K=AKK_LOCK,h=P.h;if(P.car||h.room)return;const [u,v]=akkLockLF().toL(h.x,h.z);
  if(Math.abs(u)<K.L+2.4&&Math.abs(v)<K.W+0.3&&h.y<-1.5){S.trapT=(S.trapT||0)+dt;if(S.trapT>3){S.trapT=0;S.ladders=(S.ladders||0)+1;const p=akkLockLF().P(u,0,(v<0?-1:1)*(K.W+1.5));
    h.x=p[0];h.z=p[2];h.y=K.top;P.vy=0;h.sync();hint('Über die Steigleiter raus aus de Kammer!',2.5,P);}}else S.trapT=0;}
// Fahnenstreit: jede volle Spielstunde wechselt die obere Fahne (rot-weiß ↔ blau-gelb)
function akkUpdateKastel(dt,P,px,pz){const R=AKK.reduit,G=AKK.gag;if(!R)return;const hr=Math.floor(gameMin/60);const side=hr%2===0?'mz':'wi';
  if(G.hour!==hr){const first=G.hour<0;G.hour=hr;if(!first&&side!==G.flag){G.swaps++;const near=R.flags.length&&Math.hypot(R.flags[0].x-px,R.flags[0].z-pz)<120;
    if(near){hint(`<b>Reduit:</b> Fahnewechsel! Jetzt weht ${side==='mz'?'rot-weiß fer Meenz':'blau-gelb fer Wissbaade'} owwe.`,3.5,P);const sc=akkSc('fahne');const h=sc&&sc.people.find(o=>!o.removed&&o.alive);
      if(h)say(h,side==='mz'?'Rot-weiß nuff! Helau, Kastel!':'Blau-gelb nuff! Ei Gude, Wissbaade!',3.4);}}G.flag=side;}
  for(const f of R.flags){if(!f.mesh)continue;const want=f.side===G.flag?8.6:2.4;f.y+=(want-f.y)*Math.min(1,dt*1.5);f.mesh.position.y=f.y;f.mesh.rotation.y=AKK_REDUIT_DOOR[2]-Math.PI/2+Math.sin(simTime*1.7+f.x)*0.12;}}
// Freibad: Platscher beim Reinspringen, Sprung vom Brett zählt
function akkUpdateBad(dt,P){const h=P.h,W=AKK.swim;if(P.car||h.room){W.in=false;return;}const s=stepAt(h.x,h.z);if(s!==undefined&&s>=0.9&&h.y>=s-0.1)W.boardT=simTime;
  const p=akkPoolAt(h.x,h.z);const inn=!!p&&h.y<-0.2;
  if(inn&&!W.in){W.splashes++;const k=simTime-W.boardT<3?2:1;for(let i=0;i<14*k;i++)spawnPart(h.x+mr(-0.7,0.7),0.15,h.z+mr(-0.7,0.7),{color:0xeaf4f8,size:mr(0.3,0.9),vx:mr(-1.5,1.5),vy:mr(2,4.5)*k,vz:mr(-1.5,1.5),life:0.8,grow:0.6,alpha:0.7});
    if(k>1){W.jumps++;hint(W.jumps%3===0?'<b>Arschbomb!</b> Die halb Liegewies is nass.':'<b>Platsch!</b> Saubere Sprung vum Brett.',2.5,P);}else if(W.splashes===1)hint(`<b>${p.name}</b> – Wasser is erfrischend, Kopp bleibt drauße.`,3,P);}
  if(inn&&Math.hypot(h.vx||0,h.vz||0)>0.5&&Math.random()<dt*4)spawnPart(h.x+mr(-0.4,0.4),0.12,h.z+mr(-0.4,0.4),{color:0xeef6f8,size:mr(0.3,0.7),vy:0.3,life:0.7,grow:1.2,alpha:0.45});
  W.in=inn;}
// Industriepark: Dampf aus dem ersten Schornstein und den Tanks, Schranke öffnet bei Annäherung
function akkUpdateIndustrie(dt,P,px,pz){const S=AKK.industrie;const c=S.chimneys[0];
  if(c&&Math.hypot(c.x-px,c.z-pz)<420){S.steamT=(S.steamT||0)-dt;if(S.steamT<=0){S.steamT=0.14;S.steam++;spawnPart(c.x+mr(-0.8,0.8),c.h+1,c.z+mr(-0.8,0.8),{color:0xf4f4f4,size:mr(2.5,4.5),vx:mr(0.6,1.6),vy:mr(0.8,1.6),vz:mr(-0.4,0.4),life:mr(4,6),grow:1.8,alpha:0.32});}}
  const near=S.gate&&PLAYERS.some(Q=>{if(!Q.h)return false;const [x,z]=ppos(Q);return Math.hypot(x-S.gate.x,z-S.gate.z)<10;});S.barrier+=((near?1:0)-S.barrier)*Math.min(1,dt*2.5);
  if(S.arm)S.arm.rotation.x=-S.barrier*1.45;}
