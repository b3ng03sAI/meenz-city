// ===================== FLIEGERDACKEL (Modellflugzeug auf Kopfhöhe) =====================
const DOGS=[];
const DOG_SAY=['Wuff!','WUFF WUFF!','*Propellergeräusch mit dem Mund*','Wuuuuff! (Kurs Richtung Dom)','*bellt einen Fahrplan*','Wau. Wau. Over.','Grrr – Ausweichmanöver!','*hechelt im Fahrtwind*'];
const DOG_BUZZ=['WUFF! Platz da, Zweibeiner!','KNAPP! Wuff!','Wuff wuff – Vorfahrt für Flieger!','Duck dich, du Dackel! … Oh, ich bin de Dackel.','WUUUFF! Hab dich fast gehabt!','Tschuldigung, mei Brille is beschlage!','Kurs Dom, nicht Kopf! WUFF!','Bremse kaputt! BREMSE KAPUTT!','Hihi, Tiefflug! Wuff!','Du riechst nach Fleischworscht! WUFF!'];
const DOG_REACT=['War des grad en Hund?!','Der hat ’ne Fliegerbrille auf …','Ich trink nie wieder.','HEY! Hier is Flugverbot!','Guck mal, Mama, en Hund im Flieger!','Der hat mich angebellt. Im Vorbeifliegen.','Is der überhaupt versichert?','Des is bestimmt de Hund vom Bürgermeister.','Ich hab auch mal so angefangen.'];
function makeFlyDog(){const g=new THREE.Group();g.scale.setScalar(1.75);scene.add(g);const M=(c,r=0.6,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const red=M(0xc8352a,0.45),cream=M(0xf0e2c0,0.5),grey=M(0x777777,0.4,0.6),fur=M(0x8a4f22,0.85),dark=M(0x2a1a10,0.8),nose=M(0x111111,0.3),leather=M(0x5a3818,0.7),lens=M(0x9fd8ff,0.05,0.3),scarfM=M(0xf4f4f0,0.9);
  const plane=new THREE.Group();g.add(plane);const add=(geo,mat,x,y,z,par=plane)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;par.add(m);return m;};
  // Rumpf (Längsachse = +z)
  const fus=add(new THREE.CylinderGeometry(0.16,0.07,1.2,10).rotateX(Math.PI/2),red,0,0,-0.1);
  add(new THREE.SphereGeometry(0.16,10,8),red,0,0,0.5);
  add(new THREE.CylinderGeometry(0.05,0.07,0.12,8).rotateX(Math.PI/2),grey,0,0,0.66);
  const prop=new THREE.Group();prop.position.set(0,0,0.73);plane.add(prop);add(new THREE.BoxGeometry(0.6,0.05,0.02),M(0x3a2a1a,0.6),0,0,0,prop);
  const disc=add(new THREE.CircleGeometry(0.32,16),new THREE.MeshBasicMaterial({color:0xcccccc,transparent:true,opacity:0.18,depthWrite:false}),0,0,0.01,prop);
  // Flügel (Doppeldecker)
  for(const y of [-0.1,0.28]){add(new THREE.BoxGeometry(1.7,0.03,0.32),cream,0,y,0.22);}
  for(const s of [-1,1]){add(new THREE.CylinderGeometry(0.012,0.012,0.38,5),grey,s*0.6,0.09,0.22);add(new THREE.SphereGeometry(0.05,6,5),red,s*0.86,-0.1,0.22);}
  add(new THREE.BoxGeometry(0.62,0.03,0.2),cream,0,0.02,-0.62);add(new THREE.BoxGeometry(0.03,0.24,0.2),red,0,0.13,-0.62);
  // Fahrwerk
  for(const s of [-1,1]){add(new THREE.CylinderGeometry(0.01,0.01,0.2,4),grey,s*0.13,-0.2,0.32);add(new THREE.CylinderGeometry(0.06,0.06,0.03,10).rotateZ(Math.PI/2),dark,s*0.13,-0.3,0.32);}
  // Dackel im Cockpit
  const dog=new THREE.Group();dog.position.set(0,0.12,0.02);plane.add(dog);
  add(new THREE.SphereGeometry(0.11,10,8),fur,0,0.02,0,dog).scale.set(1,1.1,1.2);
  const head=new THREE.Group();head.position.set(0,0.17,0.05);dog.add(head);
  add(new THREE.SphereGeometry(0.085,10,8),fur,0,0,0,head);
  add(new THREE.CylinderGeometry(0.035,0.045,0.11,8).rotateX(Math.PI/2),fur,0,-0.02,0.1,head);
  add(new THREE.SphereGeometry(0.022,6,5),nose,0,-0.01,0.16,head);
  const ears=[-1,1].map(s=>{const e=add(new THREE.BoxGeometry(0.03,0.13,0.07),dark,s*0.085,-0.04,-0.01,head);return e;});
  // Fliegerbrille
  for(const s of [-1,1]){add(new THREE.TorusGeometry(0.028,0.009,6,12),leather,s*0.036,0.03,0.07,head);add(new THREE.CircleGeometry(0.026,10),lens,s*0.036,0.03,0.071,head);}
  add(new THREE.TorusGeometry(0.088,0.01,4,20,Math.PI*1.1).rotateY(Math.PI/2).rotateX(Math.PI/2),leather,0,0.03,-0.005,head);
  // Fliegermütze-Kappe
  add(new THREE.SphereGeometry(0.088,10,6,0,Math.PI*2,0,Math.PI/2.2),leather,0,0.01,-0.005,head);
  // Schal (flatternde Segmente)
  add(new THREE.TorusGeometry(0.07,0.025,6,14).rotateX(Math.PI/2),scarfM,0,0.1,0.02,dog);
  const scarf=[];let par=dog;for(let i=0;i<6;i++){const sg=new THREE.Group();sg.position.set(i?0:0.04,i?0:0.1,i?-0.09:-0.05);par.add(sg);add(new THREE.BoxGeometry(0.06,0.012,0.09),scarfM,0,0,-0.045,sg);scarf.push(sg);par=sg;}
  dogMergeStatic(plane);dogMergeStatic(head,new Set(ears));
  const o={g,plane,prop,disc,head,ears,scarf,x:0,y:1.8,z:0,h:0,bank:0,speed:9,tgt:null,tgtT:0,sayT:mr(8,16),reactT:2,mode:'off',nextT:mr(25,70),modeT:0,bob:Math.random()*10,bub:{x:0,y:0,z:0,alive:true,removed:false,g}};
  DOGS.push(o);return o;}
// Unbewegte Teile eines Knotens (gleiches Material) zu einem Mesh zusammenfügen: Flieger + Kopf hatten 36 Draw-Calls.
// Nur direkte Kinder; bewegte Teile (Propeller, Ohren, Schal) bleiben eigene Objekte. Eigener Zufallsstrom für die UUIDs.
let DOG_MERGE_N=0;
function dogMergeStatic(par,keep){if(!Array.isArray(par.children))return 0;const byM=new Map();
  for(const m of par.children){if(!m.isMesh||keep&&keep.has(m)||Array.isArray(m.material))continue;let L=byM.get(m.material);if(!L)byM.set(m.material,L=[]);L.push(m);}
  const rnd=Math.random;Math.random=mulberry32(0x646f67+(++DOG_MERGE_N)*7919);let n=0;
  try{for(const [mat,L] of byM){if(L.length<2)continue;
      const keys=g=>Object.keys(g.attributes).sort().join();if(L.some(m=>!m.geometry.index||keys(m.geometry)!==keys(L[0].geometry)))continue;// sonst meldet mergeGeometries einen Fehler
      const geos=L.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
      const geo=mergeGeometries(geos);for(const g of geos)g.dispose();if(!geo)continue;
      const mm=new THREE.Mesh(geo,mat);mm.castShadow=L.some(m=>m.castShadow);mm.receiveShadow=L.some(m=>m.receiveShadow);
      for(const m of L){par.remove(m);m.geometry.dispose();}par.add(mm);n++;}}
  finally{Math.random=rnd;}
  return n;}
function dogPlace(o,P){const [px,pz]=ppos(P);for(let k=0;k<30;k++){const a=Math.random()*6.28,r=mr(25,55);const x=px+Math.sin(a)*r,z=pz+Math.cos(a)*r;if(!dogBlocked(x,z,1.8)){o.x=x;o.z=z;o.y=1.8;o.h=Math.random()*6.28;o.tgt=null;return true;}}return false;}
function dogBlocked(x,z,y){const i=idx(x,z);if(i<0)return true;const v=hgG(i);return v>0&&(v===255?y<1:y<v+0.5);}
function dogTarget(o,P){const [px,pz]=ppos(P);for(let k=0;k<20;k++){const a=Math.random()*6.28,r=mr(6,40);const x=px+Math.sin(a)*r,z=pz+Math.cos(a)*r;if(dogBlocked(x,z,1.8))continue;
    // freie Sichtlinie?
    let ok=true;const L=Math.hypot(x-o.x,z-o.z);for(let t=1.5;t<L;t+=1.5){const sx=o.x+(x-o.x)*t/L,sz=o.z+(z-o.z)*t/L;if(dogBlocked(sx,sz,1.8)){ok=false;break;}}if(ok){o.tgt=[x,z];o.tgtT=12;return;}}
  o.tgt=null;o.tgtT=1;}
function updateDogs(dt){if(mode!=='play')return;if(!DOGS.length){makeFlyDog();const d2=makeFlyDog();d2.speed=10.5;d2.nextT=mr(110,200);}
  const P=P1;if(!P.h)return;const indoor=!!(P.h.room);const [px,pz]=ppos(P);
  for(const o of DOGS){
    if(o.mode==='off'){o.g.visible=false;o.nextT-=dt;if(o.nextT<=0&&!indoor&&!P.car){if(dogPlace(o,P)){o.mode='visit';o.modeT=mr(14,28);}else o.nextT=5;}continue;}
    o.g.visible=!indoor;if(indoor)continue;
    const dist=Math.hypot(o.x-px,o.z-pz);
    if(o.mode==='visit'){o.modeT-=dt;if(o.modeT<=0||dist>160){o.mode='leave';const a=Math.atan2(o.x-px,o.z-pz);o.tgt=[px+Math.sin(a)*400,pz+Math.cos(a)*400];o.tgtT=40;}}
    if(o.mode==='leave'&&dist>130){o.mode='off';o.nextT=mr(70,170);o.g.visible=false;continue;}
    if(o.mode==='visit'&&!o.buzz&&!P.car&&Math.random()<dt*0.07&&dist>14&&dist<45){o.buzz={t:6,said:false,side:mpick([-1,1])};}
    if(o.buzz){const B=o.buzz;B.t-=dt;const hx=P.h.x,hz=P.h.z;const ax=Math.atan2(hx-o.x,hz-o.z);const off=1.45*B.side;o.tgt=[hx+Math.cos(ax)*off+Math.sin(ax)*20*(B.said?1:0.02),hz-Math.sin(ax)*off+Math.cos(ax)*20*(B.said?1:0.02)];o.tgtT=1;
      const dd=Math.hypot(hx-o.x,hz-o.z);if(!B.said&&dd<2.6){B.said=true;say(o.bub,mpick(DOG_BUZZ),2.8,'loud');dogBark(2);P.cam.shake=Math.max(P.cam.shake,0.18);P.h.setExpr&&P.h.setExpr('surprised');setTimeout(()=>P.h.setExpr&&P.h.setExpr('neutral'),1500);}
      if(B.t<=0||B.said&&dd>15)o.buzz=null;}
    o.tgtT-=dt;if(o.mode==='visit'&&!o.buzz&&(!o.tgt||o.tgtT<=0||Math.hypot(o.tgt[0]-o.x,o.tgt[1]-o.z)<3))dogTarget(o,P);else if(o.mode==='leave'&&o.tgtT<=0){const a=Math.atan2(o.x-px,o.z-pz)+mr(-0.8,0.8);o.tgt=[px+Math.sin(a)*400,pz+Math.cos(a)*400];o.tgtT=3;}
    let want=o.h;if(o.tgt)want=Math.atan2(o.tgt[0]-o.x,o.tgt[1]-o.z);
    // Hindernis voraus? ausweichen
    const look=3.5;const fx=Math.sin(o.h),fz=Math.cos(o.h);if(dogBlocked(o.x+fx*look,o.z+fz*look,o.y)){const l=dogBlocked(o.x+Math.sin(o.h-0.8)*look,o.z+Math.cos(o.h-0.8)*look,o.y),r=dogBlocked(o.x+Math.sin(o.h+0.8)*look,o.z+Math.cos(o.h+0.8)*look,o.y);want=o.h+(l&&!r?1.4:!l&&r?-1.4:2.4);o.tgt=null;o.tgtT=0.6;}
    const turn=clamp(angDiff(o.h,want),-(o.buzz?3.4:2.2)*dt,(o.buzz?3.4:2.2)*dt);o.h+=turn;o.bank+=(clamp(-turn/dt*0.35,-0.7,0.7)-o.bank)*Math.min(1,dt*4);
    const spd=o.buzz?13:o.speed;const nx=o.x+Math.sin(o.h)*spd*dt,nz=o.z+Math.cos(o.h)*spd*dt;if(!dogBlocked(nx,nz,o.y)){o.x=nx;o.z=nz;}else{o.h+=Math.PI*0.6;}
    if(o.buzz){const dx=o.x-P.h.x,dz=o.z-P.h.z,dd=Math.hypot(dx,dz);if(dd<1.25&&dd>0.01){o.x=P.h.x+dx/dd*1.25;o.z=P.h.z+dz/dd*1.25;}}
    o.bob+=dt;o.y=groundY(o.x,o.z)+(o.buzz?1.45:1.85)+Math.sin(o.bob*1.7)*(o.buzz?0.08:0.25);
    o.g.position.set(o.x,o.y,o.z);o.g.rotation.set(0,o.h,0);o.plane.rotation.z=o.bank;o.plane.rotation.x=Math.sin(o.bob*1.7)*0.06;
    o.prop.rotation.z+=dt*60;o.head.rotation.y=Math.sin(o.bob*0.9)*0.5;for(const e of o.ears)e.rotation.x=-0.9+Math.sin(o.bob*25+e.position.x)*0.25;
    o.scarf.forEach((s,i)=>{s.rotation.x=Math.sin(o.bob*14-i*0.9)*0.35;s.rotation.y=Math.sin(o.bob*9-i*0.7)*0.3-o.bank*0.4;});
    o.bub.x=o.x;o.bub.y=o.y-1.4;o.bub.z=o.z;
    o.sayT-=dt;if(o.sayT<=0){o.sayT=mr(10,20);if(Math.hypot(o.x-px,o.z-pz)<35){say(o.bub,mpick(DOG_SAY),2.2,'quiet');dogBark(1,0.5);}}
    // Passanten reagieren / ducken
    o.reactT-=dt;if(o.reactT<=0){for(const h of HUMANS){if(h.kind!=='ped'||!h.alive||h.inCar||h.state!=='walk'||h.bubble)continue;if(Math.hypot(h.x-o.x,h.z-o.z)<3.5){o.reactT=mr(3,7);say(h,mpick(DOG_REACT),2.8);h.setExpr(mpick(['surprised','laugh','cringe']));break;}}if(o.reactT<=0)o.reactT=0.4;}
    // Spieler gestreift
    for(const Q of PLAYERS){if(!Q.h||Q.car)continue;const d=Math.hypot(Q.h.x-o.x,Q.h.z-o.z);if(d<0.9&&Math.abs(Q.h.y+1.5-o.y)<0.9&&!(o.bonk>0)){o.bonk=2;o.h+=Math.PI;Q.cam.shake=0.25;say(o.bub,'WUFF! (Entschuldigung)',2);hint('Ein Dackel im Flugzeug hat dich gestreift.',2,Q);}}
    if(o.bonk>0)o.bonk-=dt;}
  dogSound(px,pz,indoor);}
function dogSound(px,pz,indoor){const ctx=AUD.ctx;if(!ctx)return;if(!AUD.dogGain){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=190;const lfo=ctx.createOscillator();lfo.frequency.value=38;const lg=ctx.createGain();lg.gain.value=40;lfo.connect(lg);lg.connect(o.frequency);
    const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=650;const g=AUD.dogGain=ctx.createGain();g.gain.value=0;o.connect(f);f.connect(g);g.connect(AUD.master);o.start();lfo.start();AUD.dogOsc=o;}
  let d=1e9;for(const o of DOGS)if(o.mode!=='off')d=Math.min(d,Math.hypot(o.x-px,o.z-pz));AUD.dogGain.gain.setTargetAtTime(indoor||mode!=='play'?0:0.013*clamp(1-d/30,0,1)**2,ctx.currentTime,0.1);AUD.dogOsc.frequency.setTargetAtTime(180+clamp(30-d,0,30)*2,ctx.currentTime,0.2);}

function dogBark(n=1,v=1){const ctx=AUD.ctx;if(!ctx)return;let t=ctx.currentTime;for(let i=0;i<n;i++){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(mr(620,760),t);o.frequency.exponentialRampToValueAtTime(mr(300,380),t+0.12);
  const s=ctx.createBufferSource();s.buffer=AUD.noise;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1100;bp.Q.value=1.1;const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.12*v,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+0.16);
  o.connect(bp);s.connect(bp);bp.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+0.18);s.start(t,Math.random());s.stop(t+0.18);t+=mr(0.2,0.28);}}
