// ===================== MARKTFRÜHSTÜCK (jeden Morgen 9–12 Uhr am Dom) =====================
const MARKT={t0:9*60,t1:12*60,on:false,built:false,grp:null,stands:[],tables:[],people:[],puddles:[],announced:-1,welcomed:false};
const MK_WINZER=['Weingut Schoppehannes','Weingut Rheinblick','Weingut Fassenacht','Weingut Meenzer Woi','Sekt-Bude Helau','Weck, Worscht & Woi','Weingut Domspatz','Spundekäs-Stübche'];
const MK_SHOUT=['NOCH EN SCHOPPE!','HELAAAU!','MEENZ BLEIBT MEENZ!','WER HAT MEI BREZEL GEGESSE?!','ICH LIEB EUCH ALL!!','PROOOST!','DES IS DE BESTE TAG VOM JAHR!','KELLNER! ÄH … WINZER!','ICH BIN NET BETRUNKE, ICH BIN FRÖHLICH!','HEINZ! HEINZ!! … wo is de Heinz?','EINS, ZWEI, G’SUFFA!','RIESLING IS EIN GEMÜSE!'];
const MK_LAUGH=['HAHAHAHA!','HÖHÖHÖHÖ','*grunzlach*','HAHA – nee – HAHAHA!','Hihihi … hick!','BWAHAHAHA!','*Lachtränen*'];
const MK_LALL=['Ich sach dir was … ich sach dir was … was wollt ich sage?','De Dom is heut irgendwie schief.','Weisch, de Riesling, der … der versteht mich.','Isch hab disch lieb, Mann. Echt jetzt.','Wer hat die Tische so wackelig gemacht?','Mei Frau denkt, ich bin beim Bäcker.','Noch einer, dann geh ich. Hab ich vor zwei Stunden auch gesagt.','Is des mei Glas oder deins? … Egal.','Ich kann noch gerade gehen. Guck. … Nee, guck net.','Eigentlich trink ich nur samstags. Heut is Samstag, oder?','Spundekäs is auch Salat.','Isch ruf jetzt mein Chef an und sag ihm die Wahrheit. … Nee.'];
const MK_PUKE=['BLUÄÄÄRGH','HÖÖÖRKS','*plätscher*','BLÖÖÄÄRGH – ’tschuldigung','UÄÄÄRGH'];
const MK_EW=['Iiiih!','Der Klassiker!','Jedes Jahr, Uwe! JEDES JAHR!','Ach du Scheiße, meine Schuh!','Nicht schon wieder vor elf!','Respekt, des war viel.','Weiter gehts, Leute, weiter gehts!','Ich hab nix gesehen.'];
const MK_AFTER=['Geht schon wieder. Wer will noch en Schoppe?','Des war de Spundekäs. Ganz sicher.','So. Platz für mehr.','Ich hab mich nur … verbeugt.'];
const MK_PROST=['Prost!','Zum Wohl!','Auf Meenz!','Prösterchen!','Auf uns!','Auf de Heinz! … Wo is de Heinz?'];
const MK_VENDOR=['Schoppe, Schoppe, frische Schoppe!','Weck, Worscht un Woi – nur hier!','Riesling halbtrocken, für die Feiglinge!','Wer noch kann, kriegt noch was!','Frisch vom Fass, direkt in de Kopp!'];
const MARKT_CONVS=[
  {o:'EY! DU! Trinkste en Schoppe mit? Ich lad dich ein! … Glaub ich.',m:'laugh',c:[
    ['Klar, Prost!','PROOOOST! Auf Meenz und auf … dich, wie heißt du nochmal?','laugh',{drink:1}],
    ['Nee, ich muss noch fahren.','FAHREN?! Am Marktfrühstück?! Du bist ja schlimmer wie mei Frau.','disgust'],
    ['Ich trink nur Wasser.','*erstarrt* … Leute. LEUTE! Der hier trinkt WASSER!','surprised']]},
  {o:'Weisch was des Geheimnis vom Lebe is? … Ich hab’s grad noch gewusst.',m:'cringe',c:[
    ['Riesling?','JA! GENAU! Du verstehst mich! *umarmt dich zu lang*','laugh',{drink:1}],
    ['Weniger trinken?','*starrt dich 8 Sekunden an* … Du bist kein guter Mensch.','angry'],
    ['Erzähl!','Also. Es fängt an mit ’ner Fleischworscht … nee. Vergiss es.','sad']]},
  {o:'Ich bin heut um sieben aufgestanden, nur für des hier. SIEBEN! Wie en Bäcker!',m:'smug',c:[
    ['Respekt.','Danke. Des is mei fünfter. Ich zähl mit de Finger. Also … mit de Finger von dem da.','laugh'],
    ['Und jetzt?','Jetzt bleib ich bis Montag. Ich hab mei Zahnbürst dabei. Guck. *zeigt eine Gabel*','cringe']]},
  {o:'Psst. Willste was Verbotenes? … SPUNDEKÄS MIT ZWIEBELN. Drei Euro.',m:'smug',c:[
    ['Her damit! (3 €)','Gute Entscheidung. Ab jetzt redet keiner mehr mit dir. Wegen de Zwiebeln.','laugh',{money:-3,heal:20}],
    ['Zu verboten.','Feigling. Echte Meenzer esse des zum Frühstück. Und zum Mittag. Und als Parfüm.','disgust']]},
  {o:'*hält dich an der Schulter fest* … Des is nur, damit ich net umfall. Erzähl was.',m:'cringe',c:[
    ['Schönes Wetter heute.','Wetter? WETTER?! … *fängt an zu weinen* Mei Oma hat auch immer übers Wetter geredet.','sad'],
    ['Lass los.','*lässt los, kippt elegant in die Bierbank* … Alles nach Plan.','smug'],
    ['Prost!','PROST! Endlich mal einer, der’s kapiert! *Wein spritzt dir ins Gesicht*','laugh',{drink:1}]]},
  {o:'Kennste den? Kommt en Riesling in en Bar … *lacht schon* … HAHAHA ich kann net mehr …',m:'laugh',c:[
    ['Und weiter?','*wischt Tränen weg* … Des war’s. Des is der Witz. HAHAHAHA!','laugh'],
    ['Haha, gut.','Du hast ihn net verstanden. Ich seh des. Ich hab ihn auch net verstanden.','sad']]},
  {o:'Mir habbe e Wett laufe: Wer zuerst kotzt, zahlt die nächste Rund. Machste mit?',m:'smug',c:[
    ['Bin dabei!','Super! Ich verlier eh gleich. *wird grün* … Gleich.','laugh',{drink:1}],
    ['Ihr seid eklig.','Des is Tradition, du Banause! Seit 1983! Oder so.','angry']]},
  {o:'Ich hab de Bischof gesehe! Glaub ich. Oder en Mann mit sehr schönem Hut.',m:'surprised',c:[
    ['Wo?','Da! … Nee, des is en Tauben. Sehr schöner Tauben aber.','cringe'],
    ['Sicher?','Sicher bin ich mir nur, dass ich noch en Schoppe brauch.','smile',{drink:1}]]},
];
const _mkG={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(0.5,0.5,1,10),glass:new THREE.CylinderGeometry(0.035,0.03,0.13,8),puddle:new THREE.CircleGeometry(1,14)};
const _mkM={wood:cmat(0x7a5432,0.85),dark:cmat(0x3a2a1c,0.9),white:cmat(0xf2efe6,0.9),red:cmat(0xb3202a,0.8),pole:cmat(0x8c8c8c,0.5),barrel:cmat(0x6b4426,0.8),
  wine:new THREE.MeshStandardMaterial({color:0xf2dc8a,roughness:0.1,transparent:true,opacity:0.75}),
  puke:new THREE.MeshBasicMaterial({color:0xa8a25a,transparent:true,opacity:0.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})};
function mkBox(g,m,w,h,d,x,y,z,ry=0){const o=new THREE.Mesh(_mkG.box,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.rotation.y=ry;o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function mkSign(text){const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');x.fillStyle='#f4ead0';x.fillRect(0,0,512,96);x.strokeStyle='#7a1a1a';x.lineWidth=8;x.strokeRect(4,4,504,88);
  x.fillStyle='#7a1a1a';x.font='bold 46px Georgia,serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,50,480);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:0.8});}
function mkFree(x,z,r){for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const i=idx(x+dx,z+dz);if(i<0||hgG(i)||(mfG(i)&4))return false;}return true;}
// Plätze rund um den Markt/Domplatz suchen
function marktLayout(){const [cx,cz]=POI.markt;const cand=[];for(let z=-50;z<=50;z+=3)for(let x=-50;x<=50;x+=3){const px=cx+x,pz=cz+z;const d=Math.hypot(x,z);if(d<=50)cand.push([px,pz,d]);}
  cand.sort((a,b)=>a[2]-b[2]);const used=[];const far=(x,z,r)=>used.every(u=>Math.hypot(u[0]-x,u[1]-z)>r+u[2]);
  for(const [x,z] of cand){if(MARKT.stands.length>=8)break;if(mkFree(x,z,3)&&far(x,z,4.5)){const a=Math.atan2(cx-x,cz-z);MARKT.stands.push({x,z,a,name:MK_WINZER[MARKT.stands.length]});used.push([x,z,4.5]);}}
  for(const [x,z] of cand){if(MARKT.tables.length>=10)break;if(mkFree(x,z,2)&&far(x,z,2.6)){MARKT.tables.push({x,z});used.push([x,z,2.6]);}}}
function buildMarkt(){marktLayout();const g=MARKT.grp=new THREE.Group();scene.add(g);
  for(const s of MARKT.stands){const sg=new THREE.Group();sg.position.set(s.x,groundY(s.x,s.z),s.z);sg.rotation.y=s.a;g.add(sg);
    mkBox(sg,_mkM.wood,3.2,1.05,0.9,0,0.52,0.6);mkBox(sg,_mkM.white,3.25,0.05,0.95,0,1.07,0.6);// Theke
    for(const px of [-1.55,1.55])for(const pz of [-0.9,0.95])mkBox(sg,_mkM.pole,0.07,2.5,0.07,px,1.25,pz);
    for(let i=0;i<6;i++)mkBox(sg,i%2?_mkM.white:_mkM.red,0.54,0.06,2.2,-1.35+i*0.54,2.55,0.02).rotation.x=0.12;// gestreiftes Dach
    const sign=new THREE.Mesh(_mkG.box,mkSign(s.name));sign.scale.set(3.0,0.5,0.04);sign.position.set(0,2.2,1.08);sg.add(sign);
    for(const bx of [-1.1,1.1]){const b=new THREE.Mesh(_mkG.cyl,_mkM.barrel);b.scale.set(0.7,0.95,0.7);b.position.set(bx,0.48,-0.55);b.castShadow=true;sg.add(b);}
    for(let i=0;i<7;i++){const gl=new THREE.Mesh(_mkG.glass,_mkM.wine);gl.position.set(-1.2+i*0.4,1.16,0.75);sg.add(gl);}}
  for(const t of MARKT.tables){const y=groundY(t.x,t.z);const p=new THREE.Mesh(_mkG.cyl,_mkM.pole);p.scale.set(0.08,1.08,0.08);p.position.set(t.x,y+0.54,t.z);g.add(p);
    const top=new THREE.Mesh(_mkG.cyl,_mkM.white);top.scale.set(0.8,0.05,0.8);top.position.set(t.x,y+1.1,t.z);top.castShadow=true;g.add(top);
    const cloth=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.5,0.9,12,1,true),_mkM.white);cloth.position.set(t.x,y+0.65,t.z);g.add(cloth);
    for(let i=0;i<3;i++){const gl=new THREE.Mesh(_mkG.glass,_mkM.wine);gl.position.set(t.x+mr(-0.2,0.2),y+1.19,t.z+mr(-0.2,0.2));g.add(gl);}}
  g.visible=false;MARKT.built=true;}
function marktPerson(x,z,face,role){const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.facing=face;h.state='markt';h.walkSpeed=1.1;
  h.mk={role,home:[x,z],face,drunk:role==='vendor'?0.1:mr(0.2,0.6),evT:mr(1,10),drinkT:mr(2,8),act:'stand',actT:0};
  if(role!=='vendor'){const gl=new THREE.Mesh(_mkG.glass,_mkM.wine);gl.position.set(0,-0.62,0.06);h.armR.add(gl);h.mk.glass=gl;}
  h.npcName=mpick(NPC_NAMES)+(role==='vendor'?' vom Weinstand':' vom Marktfrühstück');h.sync();MARKT.people.push(h);return h;}
function spawnMarkt(rush=false){if(!MARKT.built)buildMarkt();
  for(const s of MARKT.stands){const fx=Math.sin(s.a),fz=Math.cos(s.a);marktPerson(s.x-fx*0.3,s.z-fz*0.3,s.a,'vendor');}
  const cap=marktCap();
  for(const t of MARKT.tables){if(MARKT.people.length>=cap)break;const n=3+(Math.random()<0.5?1:0);const a0=Math.random()*6.28;for(let i=0;i<n;i++){const a=a0+i*6.28/n;const x=t.x+Math.sin(a)*0.85,z=t.z+Math.cos(a)*0.85;if(blocked(x,z,0.5))continue;marktPerson(x,z,a+Math.PI,'guest').mk.table=t;}}
  for(let i=0;i<6&&MARKT.people.length<cap;i++){const s=mpick(MARKT.stands)||{x:POI.markt[0],z:POI.markt[1],a:0};const x=s.x+Math.sin(s.a)*2.6+mr(-1,1),z=s.z+Math.cos(s.a)*2.6+mr(-1,1);if(!blocked(x,z,0.5))marktPerson(x,z,s.a+Math.PI,'queue');}
  if(rush){for(const h of MARKT.people){const mk=h.mk;for(let k=0;k<6;k++){const a=Math.random()*6.28,r=mr(22,65);const x=mk.home[0]+Math.sin(a)*r,z=mk.home[1]+Math.cos(a)*r;if(!blocked(x,z,0.5)){h.x=x;h.z=z;h.y=groundY(x,z);break;}}mk.arrive=true;mk.spd=mr(3.6,5.6);mk.stuck=0;h.sync();}
    // Passanten in der Nähe rennen mit
    let n=0;const [cx,cz]=POI.markt;for(const o of HUMANS){if(n>=14||MARKT.people.length>=cap+10)break;if(o.kind!=='ped'||!o.alive||o.inCar||o.mission||o.keeper||o.state!=='walk'||o.mk)continue;if(Math.hypot(o.x-cx,o.z-cz)>170)continue;
      let spot=null;for(let k=0;k<12&&!spot;k++){const a=Math.random()*6.28,r=mr(5,24);const x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r;if(mkFree(x,z,0)&&MARKT.people.every(p=>Math.hypot(p.mk.home[0]-x,p.mk.home[1]-z)>0.9))spot=[x,z];}if(!spot)continue;
      o.state='markt';o.mk={role:'crowd',home:spot,face:Math.atan2(cx-spot[0],cz-spot[1])+mr(-1,1),drunk:mr(0.1,0.4),evT:mr(3,12),drinkT:mr(4,9),act:'stand',actT:0,arrive:true,spd:mr(3.8,5.8),stuck:0};const gl=new THREE.Mesh(_mkG.glass,_mkM.wine);gl.position.set(0,-0.62,0.06);o.armR.add(gl);o.mk.glass=gl;MARKT.people.push(o);n++;}}
  MARKT.on=true;}
function marktResetPose(h){h.hips.rotation.x=0;h.hips.rotation.z=0;}
function despawnMarkt(soft){for(const h of MARKT.people){if(!h.alive||h.removed){continue;}marktResetPose(h);if(soft&&minPlayerDist(h.x,h.z)<60&&h.state==='markt'){h.state='walk';pedFlee(h,h.x,h.z,1);h.mk=null;if(Math.random()<0.3)say(h,mpick(['Tschüss, ihr Säck!','Bis nächste Woch!','Wo wohn ich nochmal?','Ich fahr jetzt heim. … Mit wem?']),3);}else h.remove();}
  MARKT.people=[];for(const p of MARKT.puddles){scene.remove(p);}MARKT.puddles=[];MARKT.on=false;}
function marktPuke(h){const mk=h.mk;mk.act='puke';mk.actT=2.6;h.setExpr('disgust');say(h,mpick(MK_PUKE),2.4,'loud');
  const fx=Math.sin(h.facing),fz=Math.cos(h.facing);const px=h.x+fx*0.7,pz=h.z+fz*0.7;
  setTimeout(()=>{if(!h.alive||h.removed||!MARKT.on)return;for(let i=0;i<26;i++)spawnPart(h.x+fx*0.35,h.y+1.35,h.z+fz*0.35,{color:mpick([0xb8b060,0x9c9a48,0xd0c070]),size:mr(0.08,0.18),vx:fx*mr(1.5,3)+mr(-0.4,0.4),vy:mr(-1,1),vz:fz*mr(1.5,3)+mr(-0.4,0.4),life:0.7,grow:0.2});
    const p=new THREE.Mesh(_mkG.puddle,_mkM.puke);p.rotation.x=-Math.PI/2;const s=mr(0.35,0.6);p.scale.set(s,s*mr(0.6,1),1);p.position.set(px,groundY(px,pz)+0.025,pz);scene.add(p);MARKT.puddles.push(p);
    if(MARKT.puddles.length>25){scene.remove(MARKT.puddles.shift());}
    for(const o of MARKT.people){if(o!==h&&o.alive&&o.state==='markt'&&Math.hypot(o.x-h.x,o.z-h.z)<5&&Math.random()<0.6){setTimeout(()=>{if(o.alive&&!o.removed){say(o,mpick(MK_EW),2.5);o.setExpr(mpick(['disgust','laugh','surprised']));}},mr(200,1200));}}
    marktSfx('puke',h);},700);
  setTimeout(()=>{if(h.alive&&!h.removed&&h.mk){say(h,mpick(MK_AFTER),3);h.setExpr('smug');h.mk.drunk-=0.25;}},3400);}
function marktProst(h){const t=h.mk.table;const grp=MARKT.people.filter(o=>o.alive&&o.state==='markt'&&o.mk&&o.mk.table===t);say(h,mpick(MK_PROST),2,'loud');
  for(const o of grp){o.mk.act='prost';o.mk.actT=1.6;o.setExpr('laugh');o.mk.drunk+=0.06;}marktSfx('clink',h);}
function marktEvent(h){const mk=h.mk;const r=Math.random();
  if(mk.role==='vendor'){if(r<0.5)say(h,mpick(MK_VENDOR),3,r<0.2?'loud':'');return;}
  if(mk.drunk>0.75&&r<0.16){marktPuke(h);return;}
  if(r<0.3&&mk.table){marktProst(h);}
  else if(r<0.55){say(h,mpick(MK_LAUGH),2,'loud');h.setExpr('laugh');mk.act='laugh';mk.actT=2;marktSfx('laugh',h);}
  else if(r<0.75){say(h,mpick(MK_SHOUT),2.6,'loud');h.setExpr(mpick(['laugh','surprised','smug']));mk.act='shout';mk.actT=1.4;}
  else if(r<0.92){say(h,mpick(MK_LALL),4,'quiet');h.setExpr(mpick(['cringe','smile','sad']));}
  else{const P=nearestPlayer(h.x,h.z);if(P.h&&Math.hypot(P.h.x-h.x,P.h.z-h.z)<8){say(h,mpick(['DU DA! TRINK EN SCHOPPE MIT!','Ey, du hast ja gar nix im Glas!','Guck mal, en Tourist! HALLO TOURIST!']),3,'loud');h.setExpr('laugh');}}}
function updateMarktPerson(h,dt){const mk=h.mk;
  if(mk.arrive){const dx=mk.home[0]-h.x,dz=mk.home[1]-h.z,L=Math.hypot(dx,dz);if(L<0.35){mk.arrive=false;h.setExpr('laugh');}else{const ox=h.x,oz=h.z;moveHuman(h,dx,dz,Math.min(mk.spd,L*3+1),dt);faceTo(h,dx,dz,dt,10);h.animate(dt,mk.spd);
      if(Math.hypot(h.x-ox,h.z-oz)<mk.spd*dt*0.3){mk.stuck+=dt;if(mk.stuck>2.5){h.x=mk.home[0];h.z=mk.home[1];}}else mk.stuck=0;
      if(Math.random()<dt*0.12&&!h.bubble)say(h,mpick(['MARKTFRÜHSTÜÜÜCK!','SCHOPPE! SCHOPPE!','WARTET AUF MICH!','ICH HAB NOCH NIX GETRUNKE!','AUS DEM WEG, ICH HAB DURST!','Es is 9 Uhr!! NEUN UHR!!']),2,'loud');
      h.y=groundY(h.x,h.z);h.sync();return;}}mk.drinkT-=dt;mk.evT-=dt;mk.actT-=dt;const t=simTime+h.phase;
  if(mk.role!=='vendor')mk.drunk=Math.min(1.1,mk.drunk+dt*0.0035);
  h.animate(dt,0);const d=Math.max(0,mk.drunk);
  h.hips.rotation.z=Math.sin(t*1.1)*0.07*d;h.hips.rotation.x=Math.sin(t*0.7)*0.03*d;
  h.facing+=angDiff(h.facing,mk.face+Math.sin(t*0.5)*0.25*d)*Math.min(1,dt*3);
  // leichtes Schwanken um den Platz
  const sx=mk.home[0]+Math.sin(t*0.6)*0.12*d,sz=mk.home[1]+Math.cos(t*0.45)*0.12*d;h.x+=(sx-h.x)*Math.min(1,dt*2);h.z+=(sz-h.z)*Math.min(1,dt*2);
  if(mk.act==='puke'&&mk.actT>0){const k=Math.min(1,(2.6-mk.actT)*3)*Math.min(1,mk.actT*2);h.hips.rotation.x=0.85*k;h.armL.rotation.x=-0.6*k;h.armR.rotation.x=-0.6*k;}
  else if(mk.act==='prost'&&mk.actT>0){h.armR.rotation.x=-3.05;h.armR.rotation.z=0.12;}
  else if(mk.act==='laugh'&&mk.actT>0){h.hips.rotation.x=-0.12+Math.sin(t*22)*0.05;h.hips.position.y=0.92+Math.abs(Math.sin(t*20))*0.02;if(mk.glass)h.armR.rotation.x=-0.5;}
  else if(mk.act==='shout'&&mk.actT>0){h.armL.rotation.x=-3.05;h.armL.rotation.z=-0.12;h.armR.rotation.x=-3.05;h.armR.rotation.z=0.12;}
  else{if(mk.actT<=0&&mk.act!=='stand'){mk.act='stand';h.setExpr(mk.drunk>0.7?'cringe':'smile');}
    if(mk.glass){const dp=mk.drinkT<0?Math.min(1,-mk.drinkT*3,(1.5+mk.drinkT)*3):0;h.armR.rotation.x=-0.45-0.6*dp;h.armR.rotation.z=-0.06+0.75*dp;if(mk.drinkT<-1.5){mk.drinkT=mr(4,10);mk.drunk+=0.04;}}}
  if(mk.evT<=0){mk.evT=mr(6,16)*(mk.role==='vendor'?1.4:1)/(0.7+d*0.6);if(minPlayerDist(h.x,h.z)<70)marktEvent(h);}
  h.y=groundY(h.x,h.z);h.sync();}
// ---------- Sound ----------
function marktSfx(kind,h){const ctx=AUD.ctx;if(!ctx)return;if(kind==='laugh'){const now=ctx.currentTime;if(now-(MARKT.lastLaugh||0)<0.4)return;MARKT.lastLaugh=now;}const d=minPlayerDist(h.x,h.z);if(d>45)return;const vol=Math.max(0.05,1-d/45);const t=ctx.currentTime;
  if(kind==='clink'){for(let i=0;i<3;i++){const o=ctx.createOscillator();o.type='sine';o.frequency.value=2300+Math.random()*900;const g=ctx.createGain();g.gain.setValueAtTime(0.12*vol,t+i*0.06);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.06+0.35);o.connect(g);g.connect(AUD.master);o.start(t+i*0.06);o.stop(t+i*0.06+0.4);}}
  else if(kind==='laugh'){const f0=h.voice||(h.voice=mr(160,420));for(let i=0;i<5;i++){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f0*(1.25-i*0.05),t+i*0.14);const fl=ctx.createBiquadFilter();fl.type='bandpass';fl.frequency.value=900;fl.Q.value=1.2;const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t+i*0.14);g.gain.exponentialRampToValueAtTime(0.09*vol,t+i*0.14+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.14+0.11);o.connect(fl);fl.connect(g);g.connect(AUD.master);o.start(t+i*0.14);o.stop(t+i*0.14+0.13);}}
  else if(kind==='puke'){const s=ctx.createBufferSource();s.buffer=AUD.noise;const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(900,t);fl.frequency.linearRampToValueAtTime(250,t+0.9);const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.25*vol,t+0.08);g.gain.exponentialRampToValueAtTime(0.0001,t+1);s.connect(fl);fl.connect(g);g.connect(AUD.master);s.start(t);s.stop(t+1.05);}}
function marktCrowd(){const ctx=AUD.ctx;if(!ctx)return;if(!AUD.mkGain){const s=ctx.createBufferSource();s.buffer=AUD.noise;s.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=650;f.Q.value=0.8;const g=AUD.mkGain=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(AUD.master);s.start();}
  const d=MARKT.on?minPlayerDist(POI.markt[0],POI.markt[1]):999;AUD.mkGain.gain.setTargetAtTime(MARKT.on&&!INDOOR?0.16*clamp(1-(d-20)/90,0,1):0,ctx.currentTime,0.3);}
// ---------- Spieler betrunken ----------
function playerDrunk(P,dt){if(!P.drunk||P.drunk<=0){P.drunk=0;return;}P.drunk=Math.max(0,P.drunk-dt*0.006);const h=P.h;
  if(h&&!P.car&&!h.room&&Math.hypot(h.vx||0,h.vz||0)>0.5){const a=Math.sin(simTime*0.9)*P.drunk*1.1*dt;const nx=h.x+Math.cos(h.facing)*a,nz=h.z-Math.sin(h.facing)*a;if(!blocked(nx,nz,h.y+0.3)){h.x=nx;h.z=nz;}}}
// ---------- Steuerung ----------
function updateMarkt(dt){const m=gameMin;const inWin=m>=MARKT.t0&&m<MARKT.t1;const stallWin=m>=MARKT.t0-60&&m<MARKT.t1+30;const [cx,cz]=POI.markt;const pd=minPlayerDist(cx,cz);
  if(stallWin&&!MARKT.built)buildMarkt();if(MARKT.grp)MARKT.grp.visible=stallWin;
  if(inWin&&!MARKT.on&&pd<450)spawnMarkt();
  if(MARKT.on&&(!inWin||pd>650))despawnMarkt(!inWin);
  if(inWin&&m<MARKT.t0+30&&pd<1500&&!MARKT.annNow){MARKT.annNow=true;hint('🍷 <b>Marktfrühstück am Dom!</b> 9–12 Uhr: Schoppe, Spundekäs und Chaos.',5);}
  if(!inWin)MARKT.annNow=false;
  if(MARKT.on){for(let i=MARKT.people.length-1;i>=0;i--){const h=MARKT.people[i];if(h.removed||!h.alive){if(h.removed)MARKT.people.splice(i,1);continue;}
      if(h.state==='markt')updateMarktPerson(h,dt);else if(h.state!=='talk'&&h.mk&&!h.mkReset){marktResetPose(h);h.mkReset=true;}}
    if(!MARKT.welcomed&&pd<35){MARKT.welcomed=true;hint('🍷 Marktfrühstück! <b>E</b>: Leute ansprechen – vielleicht gibt’s en Schoppe.',4,P1);}}
  else MARKT.welcomed=false;
  marktCrowd();updateBrezel(dt);}

// ---------- Brezel-Schalter an der Heunensäule ----------
const BREZEL={x:0,z:0,grp:null,press:0,cool:0};
function buildBrezel(){const H=(OSM.pl&&OSM.pl.heunen)||[-28,-82];let pos=null;for(let r=1.6;r<5&&!pos;r+=0.4)for(let k=0;k<16&&!pos;k++){const a=k/16*6.28;const x=H[0]+Math.sin(a)*r,z=H[1]+Math.cos(a)*r;if(mkFree(x,z,0))pos=[x,z,a];}
  if(!pos)pos=[H[0]+2,H[1],0];BREZEL.x=pos[0];BREZEL.z=pos[1];const g=BREZEL.grp=new THREE.Group();g.position.set(pos[0],groundY(pos[0],pos[1]),pos[1]);g.rotation.y=pos[2];scene.add(g);
  const brown=new THREE.MeshStandardMaterial({color:0x8a4a1a,roughness:0.45,metalness:0.05}),salt=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.9});
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,1.15,10),cmat(0x2a2a2a,0.5));post.position.y=0.575;post.castShadow=true;g.add(post);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.62,0.08),cmat(0xb08a3a,0.35));plate.position.set(0,1.38,0);g.add(plate);
  const btn=BREZEL.btn=new THREE.Group();btn.position.set(0,1.38,0.07);g.add(btn);
  const tb=new THREE.TorusGeometry(0.15,0.045,8,20);const big=new THREE.Mesh(new THREE.TorusGeometry(0.24,0.055,8,24,Math.PI*1.25),brown);big.rotation.z=-Math.PI*0.125;big.position.y=0.02;btn.add(big);
  for(const s of [-1,1]){const l=new THREE.Mesh(tb,brown);l.position.set(s*0.1,-0.02,0.01);l.scale.set(0.75,0.75,1);btn.add(l);}
  for(let i=0;i<14;i++){const sd=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.018,0.018),salt);const a=Math.random()*6.28;sd.position.set(Math.cos(a)*mr(0.08,0.26),Math.sin(a)*mr(0.05,0.24),0.06);btn.add(sd);}
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(0.72,0.14),mkSign('MARKTFRÜHSTÜCK'));sign.position.set(0,1.78,0.01);g.add(sign);
  label('Brezel-Schalter',pos[0],pos[1],'small');}
function brezelNear(P){return BREZEL.grp&&P.h&&!P.car&&!P.h.room&&Math.hypot(P.h.x-BREZEL.x,P.h.z-BREZEL.z)<2.3;}
function pressBrezel(P){if(BREZEL.cool>0)return;BREZEL.cool=3;BREZEL.press=0.5;chime([523,659,784,1046]);
  if(MARKT.on)despawnMarkt(false);gameMin=MARKT.t0;envDirty=true;MARKT.annNow=true;spawnMarkt(true);
  showBig('MARKTFRÜHSTÜCK!','win',3,'Es ist 9 Uhr – alle zum Markt!');}
function updateBrezel(dt){if(!BREZEL.grp)buildBrezel();BREZEL.cool-=dt;if(BREZEL.press>0){BREZEL.press-=dt;BREZEL.btn.position.z=0.07-0.05*Math.sin(Math.min(1,BREZEL.press*2)*Math.PI);}
  for(const P of PLAYERS){if(brezelNear(P)&&!TALK){P._bzT=(P._bzT||0)-dt;if(P._bzT<=0){P._bzT=0.8;hint('<b>E</b>: Brezel-Schalter drücken – sofort Marktfrühstück!',1,P);}}}}
