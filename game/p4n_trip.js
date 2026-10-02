// ===================== PILZ-ANGEBOTE & TRIP =====================
const MUSH_CONV={o:'Psst. Du da. Willst du Pilze? Ganz natürlich. Aus’m Lennebergwald. Mei Oma schwört drauf.',m:'smug',c:[
  ['Her damit! (€15)','Gute Wahl. Und red net mit de Tauben – die lüge.','smile',{money:-15,trip:1}],
  ['Nee, danke.','Schad. Mehr für mich. *isst einen* … Oh. Oh nein. Die Ampel guckt mich an.','cringe'],
  ['Ich ruf die Polizei!','Ich bin gar net da. Du hast mich nie gesehe. *rennt*','surprised',{leave:'flee'}]]};
const MUSH_CONV2={o:'*flüstert* Pilze. Pilze. Pilze. … Sorry, Tick. Aber im Ernst: Willste welche?',m:'cringe',c:[
  ['Klar, gib her (€15)','Viel Spaß. Wenn de Dom anfängt zu singe – einfach mitsinge.','laugh',{money:-15,trip:1}],
  ['Was sind das für Pilze?','Champignons. Glaub ich. Ich hab se im Schlosspark gefunde. Neben ’nem Eichhörnche, des mich komisch angeguckt hat.','smug'],
  ['Verschwinde.','Okay. Ich verschwinde. … *bleibt stehen* … Des war ein Test.','sad']]};
const TRIP_THOUGHTS=['Der Rhein klingt heute wie ein Akkordeon.','Hast du schon immer zehn Finger gehabt?','Die Ampel hat dir gerade zugezwinkert.','Was, wenn Mainz eigentlich ein sehr großer Spundekäs ist?','Die Häuser atmen. Ganz langsam. Wie Omas.','Du kannst den Dom riechen. Er riecht nach Mittwoch.','Jede Taube hier kennt deinen Namen.','Die Straßenbahn hat Gefühle. Sei nett zu ihr.','Farben haben Geschmack. Rot schmeckt nach Fleischworscht.','Bist du schon immer so groß gewesen? Oder ist der Boden kleiner?'];
const TRIP_PED=['Du hast ’ne Aura wie ’ne Fleischworscht.','Warum glitzerst du?','Hallo. Ich bin ein Baum. … Bin ich nicht.','Psst. Die Wolken folgen dir.','Deine Schuhe singen.','Ich seh dich in Neon.','Bist du aus Wiesbaden? Du leuchtest so komisch.','Mei Schatten is heut ganz alleine losgelaufen.'];
let mushT=mr(90,180);const TRIP={shapes:[],scaled:new Set(),thinkT:0,pedT:0,osc:null,gain:null};
function startTrip(P){P.trip={t:0,dur:110};P.tripK=0;hint('Du isst die Pilze. Schmeckt nach Waldboden … und Abenteuer.',3,P);for(const d of DOGS)d.nextT=Math.min(d.nextT,8);
  for(const h of HUMANS){if(h.kind==='cop'&&h.alive&&Math.hypot(h.x-P.h.x,h.z-P.h.z)<25){setWanted(Math.max(wanted,1));hint('Ein Polizist hat den Deal gesehen!',2.5,P);break;}}}
function tripFilter(){let k=0;for(const P of PLAYERS)k=Math.max(k,P.tripK||0);if(k<0.01||mode!=='play')return '';return `hue-rotate(${((simTime*38)%360*k).toFixed(0)}deg) saturate(${(1+2.2*k).toFixed(2)}) contrast(${(1+0.22*k).toFixed(2)})`;}
function tripShapes(on,P,k){if(on&&!TRIP.shapes.length){const geos=[new THREE.TorusKnotGeometry(0.6,0.18,64,8),new THREE.IcosahedronGeometry(0.8,0),new THREE.TorusGeometry(0.7,0.2,8,24),new THREE.OctahedronGeometry(0.8,0)];
    for(let i=0;i<12;i++){const m=new THREE.Mesh(geos[i%4],new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}));m.userData={r:mr(5,16),a:Math.random()*6.28,y:mr(2,9),s:mr(0.6,1.6),sp:mr(0.15,0.4)*(Math.random()<0.5?-1:1),hue:Math.random()};scene.add(m);TRIP.shapes.push(m);}}
  if(!on&&TRIP.shapes.length){for(const m of TRIP.shapes){scene.remove(m);m.material.dispose();}TRIP.shapes=[];return;}
  if(!on)return;const [px,pz]=ppos(P);const y0=P.car?P.car.y:P.h.y;for(const m of TRIP.shapes){const u=m.userData;u.a+=u.sp*0.016;m.position.set(px+Math.cos(u.a)*u.r,y0+u.y+Math.sin(simTime+u.a)*0.8,pz+Math.sin(u.a)*u.r);m.rotation.x+=0.02;m.rotation.y+=0.03;m.scale.setScalar(u.s*(0.8+0.3*Math.sin(simTime*2+u.a)));
    m.material.color.setHSL((u.hue+simTime*0.1)%1,0.9,0.6);m.material.opacity=0.75*k;m.visible=!INDOOR;}}
function tripSound(k){const ctx=AUD.ctx;if(!ctx)return;if(!TRIP.gain){const g=TRIP.gain=ctx.createGain();g.gain.value=0;g.connect(AUD.master);TRIP.osc=[];
    for(const f of [110,138.6,164.8,220]){const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;const l=ctx.createOscillator();l.frequency.value=mr(0.08,0.25);const lg=ctx.createGain();lg.gain.value=f*0.02;l.connect(lg);lg.connect(o.frequency);o.connect(g);o.start();l.start();TRIP.osc.push(o);}}
  TRIP.gain.gain.setTargetAtTime(0.03*k,ctx.currentTime,0.5);}
function updateTrip(dt){if(mode!=='play')return;let maxK=0;
  for(const P of PLAYERS){if(!P.trip){P.tripK=0;continue;}const T=P.trip;T.t+=dt;const r=T.t/T.dur;P.tripK=clamp(Math.min(T.t/12,(T.dur-T.t)/20),0,1);maxK=Math.max(maxK,P.tripK);
    if(T.t>=T.dur){P.trip=null;P.tripK=0;hint('Der Trip lässt nach. Du hast plötzlich unfassbar Hunger auf Spundekäs.',4,P);}}
  const P=PLAYERS.reduce((a,b)=>(b.tripK||0)>(a.tripK||0)?b:a,P1);const k=maxK;
  // wabbelnde Menschen
  if(k>0.01){const [px,pz]=ppos(P);const t=simTime;for(const h of HUMANS){if(playerOfHuman(h)||h.inCar)continue;const d=Math.hypot(h.x-px,h.z-pz);if(d<45){{const B=h.baseScale||[1,1,1];h.g.scale.set(B[0]*(1+0.25*k*Math.sin(t*2.1+h.phase)),B[1]*(1+0.35*k*Math.sin(t*1.6+h.phase*1.3)),B[2]*(1+0.25*k*Math.sin(t*2.6+h.phase*0.7)));}TRIP.scaled.add(h);}
      else if(TRIP.scaled.has(h)){h.g.scale.set(...(h.baseScale||[1,1,1]));TRIP.scaled.delete(h);}}
    TRIP.thinkT-=dt;if(TRIP.thinkT<=0){TRIP.thinkT=mr(9,14);if(k>0.3)hint('<i>'+mpick(TRIP_THOUGHTS)+'</i>',4,P);}
    TRIP.pedT-=dt;if(TRIP.pedT<=0){TRIP.pedT=mr(5,9);const o=nearbyPed(P,2,18);if(o&&!o.bubble)say(o,mpick(TRIP_PED),3);}}
  else if(TRIP.scaled.size){for(const h of TRIP.scaled)h.g.scale.set(...(h.baseScale||[1,1,1]));TRIP.scaled.clear();}
  tripShapes(k>0.01,P,k);tripSound(k);
  // Pilz-Angebot von zufälligen Passanten
  const Q=P1;if(!Q.h||Q.car||Q.h.room||TALK||Q.trip||Q.gameOver||wanted>0)return;mushT-=dt;if(mushT>0)return;mushT=mr(240,420);
  const o=nearbyPed(Q,6,45);if(!o){mushT=15;return;}o.forceConv=Math.random()<0.5?MUSH_CONV:MUSH_CONV2;o.state='approach';o.apT=0;say(o,mpick(['Psst! Du da! Komm mal her …','Ey. EY. Pssssst!','Hallo Freund. Ich hab was für dich. Was Natürliches.']),3,'quiet');o.setExpr('smug');}
