// ===================== ZUFALLS-POWERUPS & VERWANDLUNGEN =====================
const PU_TYPES={
  god:{n:'Unsterblich',icon:'⭐',col:0xffd23f,dur:120,msg:'UNSTERBLICH',sub:'2 Minuten unverwundbar'},
  jump:{n:'Superspringen',icon:'🦘',col:0x7bd389,dur:60,msg:'SUPERSPRUNG',sub:'Leertaste – ab in die Wolken'},
  speed:{n:'Turbo-Beine',icon:'⚡',col:0x2a9df4,dur:60,msg:'TURBO-BEINE',sub:'Shift – du bist der Blitz'},
  disco:{n:'Disko-Modus',icon:'🪩',col:0xff4fd8,dur:45,msg:'DISKO!',sub:'Alle tanzen mit'},
  llama:{n:'Lama',icon:'🦙',col:0xe9dcc0,dur:60,msg:'DU BIST EIN LAMA',sub:'Klick: spucken · alle haben Angst',morph:true},
  horse:{n:'Pferd',icon:'🐎',col:0x8b5a2b,dur:60,msg:'DU BIST EIN PFERD',sub:'Galopp durch die Altstadt',morph:true},
  mouse:{n:'Maus',icon:'🐭',col:0xb0b0b8,dur:60,msg:'DU BIST EINE MAUS',sub:'Klein, schnell, gefürchtet',morph:true}};
const PU={items:[],t:0,hud:null,disco:{light:null,osc:null,beatT:0}};
const PU_SCREAM={llama:['EIN LAMA!!','Das Lama spuckt bestimmt!','Hilfe! Ein Lama in der Fußgängerzone!','Ich hab Angst vor Lamas seit Kindheit!'],horse:['EIN PFERD! IN DE STADT!','Aus dem Weg, ein Gaul!','Wer hat sein Pferd verlore?!','Ich ruf die Reiterstaffel!'],mouse:['IIIIH! EINE MAUS!!','*springt auf die Bank*','Eine Maus! Ruft den Kammerjäger!','Die is riesig! … Na ja. Normal.']};
const PU_DISCO=['DISKO!','*tanzt*','Des is mei Lied!','Ich kann net aufhöre!','Wooo!','Mainz bleibt Mainz – und tanzt!'];
function puTex(t){const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d');g.fillStyle='#'+t.col.toString(16).padStart(6,'0');g.beginPath();g.arc(64,64,58,0,6.28);g.fill();g.strokeStyle='#fff';g.lineWidth=6;g.stroke();g.font='64px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(t.icon,64,70);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return tx;}
function spawnPowerup(P){const [px,pz]=ppos(P);for(let k=0;k<12;k++){const a=Math.random()*6.28,r=mr(50,220);const x=px+Math.sin(a)*r,z=pz+Math.cos(a)*r;if(blocked(x,z,0.5))continue;const i=idx(x,z);if(i<0||(mfG(i)&4))continue;
    const key=mpick(Object.keys(PU_TYPES));const T=PU_TYPES[key];const g=new THREE.Group();const y=groundY(x,z);g.position.set(x,y,z);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:T.tex||(T.tex=puTex(T)),depthWrite:false}));sp.scale.set(1.3,1.3,1);sp.position.y=1.4;g.add(sp);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.75,0.06,6,24),new THREE.MeshBasicMaterial({color:T.col}));ring.rotation.x=Math.PI/2;ring.position.y=0.08;g.add(ring);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,8,8,1,true),new THREE.MeshBasicMaterial({color:T.col,transparent:true,opacity:0.25,depthWrite:false}));beam.position.y=4;g.add(beam);
    scene.add(g);PU.items.push({g,sp,key,x,z,ph:Math.random()*6});return;}}
// ---------- Tiermodelle ----------
function animalModel(kind){const g=new THREE.Group();const M=(c,r=0.85)=>cmat(c,r);const legs=[];const B=(w,h,d,c,x,y,z,par=g)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x,y,z);m.castShadow=true;par.add(m);return m;};
  const leg=(x,z,len,w,c)=>{const p=new THREE.Group();p.position.set(x,len,z);g.add(p);B(w,len,w,c,0,-len/2,0,p);B(w*1.15,0.08,w*1.4,0x2a2018,0,-len+0.04,0.02,p);legs.push(p);};
  if(kind==='llama'){const c=0xe9dcc0;B(0.6,0.6,1.2,c,0,1.25,0);for(const [x,z] of [[-0.2,0.45],[0.2,0.45],[-0.2,-0.45],[0.2,-0.45]])leg(x,z,1.0,0.16,c);const n=B(0.28,1.0,0.3,c,0,1.95,0.55);B(0.32,0.32,0.5,c,0,2.5,0.72);B(0.08,0.22,0.06,c,-0.1,2.75,0.6);B(0.08,0.22,0.06,c,0.1,2.75,0.6);B(0.06,0.06,0.02,0x111111,-0.12,2.56,0.98);B(0.06,0.06,0.02,0x111111,0.12,2.56,0.98);B(0.2,0.3,0.2,c,0,1.4,-0.68);B(0.62,0.18,1.0,0xc8102e,0,1.6,0);}
  else if(kind==='horse'){const c=0x8b5a2b;B(0.7,0.8,1.8,c,0,1.45,0);for(const [x,z] of [[-0.24,0.7],[0.24,0.7],[-0.24,-0.7],[0.24,-0.7]])leg(x,z,1.1,0.17,c);const n=B(0.32,0.9,0.4,c,0,2.05,0.95);n.rotation.x=-0.5;B(0.32,0.32,0.75,c,0,2.45,1.35);B(0.06,0.8,0.5,0x2a1a10,0,2.15,0.85);B(0.12,0.9,0.12,0x2a1a10,0,1.3,-0.95).rotation.x=0.4;B(0.06,0.06,0.02,0x111111,-0.15,2.55,1.6);B(0.06,0.06,0.02,0x111111,0.15,2.55,1.6);B(0.6,0.12,0.6,0x3a2a1a,0,1.9,0);}
  else{const c=0xa8a8b0;B(0.32,0.26,0.5,c,0,0.2,0);for(const [x,z] of [[-0.1,0.15],[0.1,0.15],[-0.1,-0.15],[0.1,-0.15]])leg(x,z,0.08,0.05,0xffb6c1);B(0.24,0.22,0.24,c,0,0.26,0.3);for(const s of [-1,1]){const e=new THREE.Mesh(new THREE.CircleGeometry(0.11,12),M(0xffb6c1));e.position.set(s*0.12,0.43,0.28);g.add(e);}B(0.04,0.04,0.02,0x111111,-0.06,0.3,0.43);B(0.04,0.04,0.02,0x111111,0.06,0.3,0.43);B(0.05,0.05,0.05,0xff8fa3,0,0.24,0.43);const t=B(0.03,0.03,0.6,0xffb6c1,0,0.18,-0.5);t.rotation.x=0.3;}
  g.userData.legs=legs;scene.add(g);return g;}
const MORPH={llama:{speed:1.15,camH:2.4,dist:6},horse:{speed:1.9,camH:2.6,dist:6.5},mouse:{speed:1.3,camH:0.5,dist:2.6}};
// ---------- Aktivieren / Ablaufen ----------
function puActivate(P,key){const T=PU_TYPES[key];P.pu=P.pu||{};if(T.morph){if(P.car){hint('Erst aussteigen – Tiere können nicht Auto fahren!',2,P);return false;}puEndMorph(P);P.morph={kind:key,g:animalModel(key),...MORPH[key]};P.h.g.visible=false;}
  P.pu[key]=T.dur;showBig(T.msg,'win',2.4,T.sub);chime([660,880,1320]);if(key==='disco')discoStart();if(key==='god')puAura(P,true);return true;}
function puEndMorph(P){if(!P.morph)return;scene.remove(P.morph.g);P.morph=null;if(P.h)P.h.g.visible=true;}
function puAura(P,on){if(on&&!P.aura){const m=new THREE.Mesh(new THREE.SphereGeometry(1.2,16,12),new THREE.MeshBasicMaterial({color:0xffd23f,transparent:true,opacity:0.18,depthWrite:false}));scene.add(m);P.aura=m;}if(!on&&P.aura){scene.remove(P.aura);P.aura=null;}}
function discoStart(){const D=PU.disco;if(!D.light){D.light=new THREE.PointLight(0xff00ff,0,30,1.4);scene.add(D.light);}const ctx=AUD.ctx;if(ctx&&!D.gain){D.gain=ctx.createGain();D.gain.gain.value=0.0;D.gain.connect(AUD.master);}}
function discoBeat(){const ctx=AUD.ctx;const D=PU.disco;if(!ctx||!D.gain)return;const t=ctx.currentTime;const o=ctx.createOscillator();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(45,t+0.18);const g=ctx.createGain();g.gain.setValueAtTime(0.35,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);o.connect(g);g.connect(D.gain);o.start(t);o.stop(t+0.3);
  D.step=(D.step||0)+1;if(D.step%2===0){const s=ctx.createBufferSource();s.buffer=AUD.noise;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=7000;const g2=ctx.createGain();g2.gain.setValueAtTime(0.12,t);g2.gain.exponentialRampToValueAtTime(0.001,t+0.06);s.connect(f);f.connect(g2);g2.connect(D.gain);s.start(t,Math.random());s.stop(t+0.08);}
  const notes=[55,55,65.4,73.4];const b=ctx.createOscillator();b.type='sawtooth';b.frequency.value=notes[(D.step>>1)%4];const bf=ctx.createBiquadFilter();bf.type='lowpass';bf.frequency.value=400;const bg=ctx.createGain();bg.gain.setValueAtTime(0.1,t+0.25);bg.gain.exponentialRampToValueAtTime(0.001,t+0.48);b.connect(bf);bf.connect(bg);bg.connect(D.gain);b.start(t+0.25);b.stop(t+0.5);}
function llamaSpit(P){if(P.fireT>0)return;P.fireT=0.7;const h=P.h;const fx=Math.sin(h.facing),fz=Math.cos(h.facing);for(let i=0;i<10;i++)spawnPart(h.x+fx*1,h.y+2.4,h.z+fz*1,{color:0xe8f0d0,size:mr(0.06,0.14),vx:fx*mr(6,9)+mr(-0.5,0.5),vy:mr(0.5,2),vz:fz*mr(6,9)+mr(-0.5,0.5),life:0.6,grow:0.1});noiseHit(0.2,0.12,1500);
  for(const o of HUMANS){if(playerOfHuman(o)||!o.alive||o.inCar)continue;const dx=o.x-h.x,dz=o.z-h.z,d=Math.hypot(dx,dz);if(d<7&&(dx*fx+dz*fz)/d>0.8){say(o,mpick(['IIIH! LAMASPUCKE!','Mei Jacke! MEI JACKE!','Des riecht nach Heu!']),2.5,'loud');o.setExpr&&o.setExpr('disgust');if(o.state==='walk')pedFlee(o,h.x,h.z,6);break;}}}
function updatePowerups(dt){if(mode!=='play')return;
  if(!PU.hud){PU.hud=document.createElement('div');PU.hud.style.cssText='position:fixed;left:50%;bottom:118px;transform:translateX(-50%);display:flex;gap:6px;z-index:6;pointer-events:none';document.body.appendChild(PU.hud);}
  // Spawnen & Einsammeln
  PU.t-=dt;if(PU.t<=0){PU.t=4;const P=P1;if(P.h){const [px,pz]=ppos(P);for(let i=PU.items.length-1;i>=0;i--){const it=PU.items[i];if(Math.hypot(it.x-px,it.z-pz)>320){scene.remove(it.g);PU.items.splice(i,1);}}if(PU.items.length<9)spawnPowerup(P);}}
  for(let i=PU.items.length-1;i>=0;i--){const it=PU.items[i];it.ph+=dt;it.sp.position.y=1.4+Math.sin(it.ph*2.2)*0.18;it.g.rotation.y+=dt*1.5;it.g.visible=!INDOOR;
    for(const P of PLAYERS){if(!P.h||P.h.room)continue;const [px,pz]=ppos(P);if(Math.hypot(px-it.x,pz-it.z)<(P.car?3:1.6)){if(puActivate(P,it.key)){scene.remove(it.g);PU.items.splice(i,1);}break;}}}
  let html='';let discoOn=false;
  for(const P of PLAYERS){if(!P.pu)continue;for(const k in P.pu){if(P.pu[k]<=0)continue;P.pu[k]-=dt;const T=PU_TYPES[k];if(P.pu[k]<=0){P.pu[k]=0;if(T.morph)puEndMorph(P);if(k==='god')puAura(P,false);hint(T.n+' ist vorbei.',2,P);continue;}
      if(k==='disco')discoOn=true;html+=`<span style="background:rgba(12,16,20,.8);color:#fff;border:2px solid #${T.col.toString(16).padStart(6,'0')};border-radius:14px;padding:3px 10px;font:700 14px 'Barlow Condensed',sans-serif">${T.icon} ${T.n} ${Math.ceil(P.pu[k])}s</span>`;}
    // Verwandlung: Modell führen, Leute erschrecken
    const m=P.morph;if(m&&P.h){if(P.car||P.h.room){puEndMorph(P);}else{const h=P.h;h.g.visible=false;m.g.visible=true;m.g.position.set(h.x,h.y,h.z);m.g.rotation.y=h.facing;const sp=Math.hypot(h.vx||0,h.vz||0);m.ph=(m.ph||0)+dt*(2+sp*1.6);
        m.g.userData.legs.forEach((l,i)=>{l.rotation.x=sp>0.3?Math.sin(m.ph+(i%2?Math.PI:0)+(i>1?Math.PI/2:0))*0.7:0;});m.scareT=(m.scareT||0)-dt;
        if(m.scareT<=0){m.scareT=0.5;for(const o of HUMANS){if(playerOfHuman(o)||!o.alive||o.inCar||o.kind!=='ped'||o.mission||o.keeper)continue;if(o.state!=='walk'&&o.state!=='markt'&&o.state!=='wait')continue;const d=Math.hypot(o.x-h.x,o.z-h.z);if(d<12){if(!o.bubble&&Math.random()<0.35){say(o,mpick(PU_SCREAM[m.kind]),2.5,'loud');}o.setExpr&&o.setExpr('surprised');if(o.state!=='markt')pedFlee(o,h.x,h.z,6);}}}}}
    if(P.aura&&P.h){P.aura.position.set(P.h.x,P.h.y+1,P.h.z);P.aura.material.opacity=0.12+Math.sin(simTime*6)*0.06;}}
  PU.hud.innerHTML=html;
  // Disko
  const D=PU.disco;if(discoOn){const t=simTime;D.light.intensity=40;D.light.color.setHSL((t*1.7)%1,1,0.5);const P=PLAYERS.find(Q=>Q.pu&&Q.pu.disco>0);if(P){const [px,pz]=ppos(P);D.light.position.set(px,(P.h?P.h.y:0)+4,pz);
      for(const o of HUMANS){if(playerOfHuman(o)||!o.alive||o.inCar)continue;if(Math.abs(o.x-px)>16||Math.abs(o.z-pz)>16)continue;if(o.state==='walk'||o.state==='wait'){o.vx=o.vz=0;o.armL.rotation.x=-2.2+Math.sin(t*8+o.phase)*0.3;o.armR.rotation.x=-2.2+Math.cos(t*8+o.phase)*0.3;o.armL.rotation.z=0.8;o.armR.rotation.z=-0.8;o.hips.position.y=0.92+Math.abs(Math.sin(t*8))*0.06;o.facing+=dt*2;o.sync();if(!o.bubble&&Math.random()<dt*0.15)say(o,mpick(PU_DISCO),2,'loud');}}}
    if(D.gain){D.gain.gain.setTargetAtTime(0.5,AUD.ctx.currentTime,0.2);D.beatT-=dt;if(D.beatT<=0){D.beatT=0.25;discoBeat();}}renderer.domElement.style.filter=`hue-rotate(${(simTime*240)%360}deg) saturate(1.6)`;}
  else if(D.light&&D.light.intensity>0){D.light.intensity=0;if(D.gain)D.gain.gain.setTargetAtTime(0,AUD.ctx.currentTime,0.2);renderer.domElement.style.filter='';}}
