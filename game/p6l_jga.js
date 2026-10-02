// ===================== 50 Sondermission: JGA-Planung =====================
// Fictional bachelor party chain, family friendly: groom "Kalle" phones, the player rounds up four friends, buys
// matching "Team Kalle" shirts, sells Kurze/Weck from a tray, completes three Altstadt dares, keeps the tipsy groom
// from wandering off and finishes with a pub tour and a party on the Rheinufer. Alcohol only as light humour.
// Stage: 0 not started, 1 crew, 2 shirts, 3 tray, 4 dares, 5 groom, 6 finale, 7 done.
const JGA={stage:0,group:[],groom:null,friends:[],shirts:false,sold:0,declined:0,dares:[],groomLost:false,catches:0,
  pubs:[],visited:[],party:false,partyT:0,done:false,menu:null,rhythm:null,wander:null,catchT:0,callT:0,albumT:0,
  meet:null,partySpot:null,dt:1/60,spots:{},stranger:null,cust:null,menuCD:0,musicOn:false,
  SELL_N:5,SHIRT_P:90,CATCH_N:3,CATCH_T:40,PARTY_T:20,ALBUM_T:30,REWARD:5000,
  BEAT:0.6,BEATS:8,HITS_NEED:5,WINDOW:0.16};

const JGA_FRIENDS=[
  {id:'hotte',name:'De Hotte',sex:'m',at:'theater',
    lines:['Ei Gude! De Kalle heirat? Do bin ich dabei, des is Ehrensach!','Ich hab mer extra frei genomme – vom Sofa.']},
  {id:'gerdi',name:'Gerdi',sex:'f',at:'holzturm',
    lines:['Was, de Kalle traut sich? Des muss ich sehe!','Ich bring gute Laune mit – un e Tüt Weck.']},
  {id:'ralf',name:'Schnudel-Ralf',sex:'m',at:'eisenturm',
    lines:['De Kalle? Den kenn ich noch aus de Krabbelgrupp!','Lass mers krache – awwer gemütlich.']},
  {id:'elfi',name:'Elfi',sex:'f',at:'stephan',
    lines:['Ei, ich war grad bei de blaue Fenster. Jetzt wird gefeiert!','Ich bin die mit de Kamera – fürs Fotoalbum!']}];
const JGA_DARES={brunnen:'Am Fastnachtsbrunnen e Ständche singe',foto:'Gruppefoto vorm Dom',
  schoppe:'E Fremde höflich um e Schoppe bitte',polonaise:'Polonaise um die Heunensäule'};
const JGA_BUY=['Ei, fer de Kalle immer!','Gib her – uff die Lieb!','Spundekäs? Do sag ich net naa.','Zwaa Stück! … Ach naa, aaner langt.','Alles Gude fer die Eh, Kalle!'];
const JGA_DECLINE=['Naa danke, ich bin mim Fahrrad do.','Heut net, mei Fraa guckt vom Fenster.','Hab kaa Kleingeld, nur Fastnachtsorde.','Is do Fleischworscht drin? Ich bin Vegetarier.','Ich hab’s eilig, mei Straßebahn!','Ich kauf nix vun Leut in gleiche T-Shirts.'];
const JGA_SLOTS=[[0,-2.2],[-1.4,-2.7],[1.4,-2.7],[-0.8,-4],[0.8,-4]];
// own melody (semitones over C4), 3/4 schunkel time - one entry per beat
const JGA_TUNE=[0,4,7,7,9,7,5,4,2,4,0,-1,0,4,7,12,11,9,7,5,2,0,0,-5,2,5,9,9,7,5,4,7,12,11,9,7,5,4,2,0,0,0];

function jgaSetStage(n){JGA.stage=Math.max(JGA.stage,n);}
function jgaMission(){const m=activeMission;return m&&m.id&&m.id.startsWith('jga_')?m:null;}
function jgaActive(id){const m=activeMission;return m&&m.id===id?m:null;}

// ---------- shared resources (built once) ----------
const JGA_RES={};
function jgaShirtTex(groom){return freeAfterUpload(canvasTex(512,256,g=>{
  g.fillStyle=groom?'#f6f3ea':'#f2c200';g.fillRect(0,0,512,256);
  g.fillStyle=groom?'#c8102e':'#1d1a16';g.textAlign='center';g.textBaseline='middle';
  // the loft torso puts the chest at u=0.5 and the back on the u=0/1 seam: back print is drawn at both edges
  // u runs right-to-left across the chest, so the front print is mirrored on the canvas
  g.save();g.translate(512,0);g.scale(-1,1);
  g.font='900 30px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText(groom?'KALLE':'TEAM KALLE',256,58);
  g.font='italic 700 19px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText(groom?'de Bräutigam':'Lass mers krache!',256,88);g.restore();
  for(const x of [0,512]){g.font='900 44px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText(groom?'DE BRÄUTIGAM':'TEAM KALLE',x,62);
    g.font='italic 700 24px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText('Lass mers krache!',x,100);}
  g.fillStyle=groom?'#1d1a16':'#c8102e';g.fillRect(0,118,70,5);g.fillRect(442,118,70,5);},false));}
function jgaRes(){if(JGA_RES.shirt)return JGA_RES;
  JGA_RES.shirt=stdMat({map:jgaShirtTex(false),roughness:0.85});JGA_RES.shirtPlain=stdMat({color:0xf2c200,roughness:0.85});
  JGA_RES.groomShirt=stdMat({map:jgaShirtTex(true),roughness:0.85});JGA_RES.groomPlain=stdMat({color:0xf6f3ea,roughness:0.85});
  JGA_RES.crown=new THREE.CylinderGeometry(0.135,0.125,0.09,10,1,true);JGA_RES.crownM=stdMat({color:0xe8c040,roughness:0.5,metalness:0.3,side:THREE.DoubleSide});
  JGA_RES.tray=new THREE.BoxGeometry(0.5,0.05,0.3);JGA_RES.trayM=stdMat({color:0x8a5a30,roughness:0.7});
  JGA_RES.strap=new THREE.BoxGeometry(0.035,0.42,0.02);JGA_RES.strapM=stdMat({color:0x2a2a2a,roughness:0.8});
  JGA_RES.glass=new THREE.CylinderGeometry(0.024,0.019,0.06,8);JGA_RES.glassM=stdMat({color:0xd9a441,roughness:0.15,transparent:true,opacity:0.8});
  JGA_RES.sign=new THREE.PlaneGeometry(0.46,0.07);
  JGA_RES.signM=stdMat({map:freeAfterUpload(textTex('KURZE · WECK',{w:256,h:40,bg:'#f2c200',fg:'#1d1a16',font:'700 30px "Barlow Condensed",Arial Narrow,sans-serif'})),roughness:0.8});
  return JGA_RES;}

// ---------- group members ----------
function jgaHuman(sex){let h=null;
  for(let k=0;k<25&&!h;k++){h=new Human('ped');if(h.sex!==sex||h.age!=='adult'){h.remove();h=null;}}
  return h||new Human('ped');}
function jgaSpawn(def,x,z){const h=jgaHuman(def.sex);const [fx,fz]=freeSpot(x,z,0.45);h.x=fx;h.z=fz;h.y=groundY(fx,fz);
  h.mission=true;h.state='jga';h.walkSpeed=0;h.health=1e5;h.jga={id:def.id,name:def.name,stuckT:0};h.sync();
  if(JGA.shirts)jgaDress(h);return h;}
function jgaDress(h){const R=jgaRes();const groom=h===JGA.groom;const body=groom?R.groomShirt:R.shirt,plain=groom?R.groomPlain:R.shirtPlain;
  h.g.traverse(m=>{const G2=m.geometry;if(!G2)return;
    if(G2===BODY.torsoM||G2===BODY.torsoF)m.material=body;else if(G2===BODY.armM||G2===BODY.armF||G2===SG.shoulder)m.material=plain;});
  h.jgaShirt=true;}
function jgaDressAll(){for(const h of JGA.group)jgaDress(h);if(P1.h)jgaDress(P1.h);}
function jgaSpawnGroom(x,z){const R=jgaRes();const h=jgaSpawn({id:'kalle',name:'Kalle',sex:'m'},x,z);JGA.groom=h;
  const c=new THREE.Mesh(R.crown,R.crownM);c.position.set(0,0.92,-0.01);h.hips.add(c);
  const tray=new THREE.Group();tray.position.set(0,0.1,0.3);h.hips.add(tray);
  tray.add(new THREE.Mesh(R.tray,R.trayM));
  for(let i=0;i<8;i++){const gl=new THREE.Mesh(R.glass,R.glassM);gl.position.set(-0.18+(i%4)*0.12,0.055,i<4?-0.06:0.06);tray.add(gl);}
  for(const s of [-1,1]){const st=new THREE.Mesh(R.strap,R.strapM);st.position.set(s*0.16,0.24,-0.12);st.rotation.x=-0.6;tray.add(st);}
  const sign=new THREE.Mesh(R.sign,R.signM);sign.position.set(0,-0.01,0.152);tray.add(sign);
  h.jgaTray=tray;tray.visible=false;if(JGA.shirts)jgaDress(h);return h;}
// respawn the group lazily after a load or when it got lost
function jgaEnsureGroup(){if(JGA.stage<1||JGA.done)return;const P=P1;if(!P.h||P.h.room)return;
  JGA.group=JGA.group.filter(h=>!h.removed);const [px,pz]=ppos(P);
  if(!JGA.groom||JGA.groom.removed){jgaSpawnGroom(px-2,pz-2);JGA.group.unshift(JGA.groom);}
  for(const id of JGA.friends){if(JGA.group.some(h=>h.jga.id===id))continue;const d=JGA_FRIENDS.find(f=>f.id===id);if(d)JGA.group.push(jgaSpawn(d,px-2,pz+2));}}
function jgaDespawn(){for(const h of JGA.group)if(!h.removed)h.remove();if(JGA.stranger&&!JGA.stranger.removed)JGA.stranger.remove();
  JGA.group=[];JGA.groom=null;JGA.stranger=null;}
function jgaRelease(){for(const h of JGA.group){if(h.removed)continue;h.mission=false;h.health=50;if(h.jgaTray)h.jgaTray.visible=false;radToPed(h);}
  JGA.group=[];JGA.groom=null;}

// ---------- movement ----------
function jgaStand(h,dt,face){if(face)faceTo(h,face[0]-h.x,face[1]-h.z,dt,5);h.animate(dt,0);h.y=groundY(h.x,h.z,h.y);h.sync();}
function jgaGo(h,tx,tz,speed,dt){const dx=tx-h.x,dz=tz-h.z;const mv=moveHuman(h,dx,dz,speed,dt);if(mv>0.05)faceTo(h,dx,dz,dt,8);
  h.animate(dt,mv);h.y=groundY(h.x,h.z,h.y);h.sync();return mv;}
function jgaTeleport(h,x,z){const [fx,fz]=freeSpot(x,z,0.45);h.x=fx;h.z=fz;h.y=groundY(fx,fz);h.jga.stuckT=0;h.sync();}
function jgaFollow(h,i,dt){const P=P1;const [px,pz]=ppos(P);
  if(P.h.room){jgaStand(h,dt,null);return;}
  const f=P.car?P.car.h:P.h.facing;const fx=Math.sin(f),fz=Math.cos(f);const o=JGA_SLOTS[i%JGA_SLOTS.length];
  const tx=px+fz*o[0]+fx*o[1],tz=pz-fx*o[0]+fz*o[1];const d=Math.hypot(tx-h.x,tz-h.z);
  if(d>70&&!P.car){jgaTeleport(h,tx,tz);return;}
  if(d<0.6){jgaStand(h,dt,[px,pz]);return;}
  const sp=d>8?4.8:d>1.6?2.0:1.1;const mv=jgaGo(h,tx,tz,sp,dt);
  if(mv<0.05&&d>3){h.jga.stuckT+=dt;if(h.jga.stuckT>2.5&&!P.car)jgaTeleport(h,tx,tz);}else h.jga.stuckT=0;}
function jgaArms(h,lx,lz,rx,rz){const L=h.armL.rotation,R=h.armR.rotation;L.x=lx;L.z=lz;R.x=rx;R.z=rz;}
function jgaHoldTray(h){jgaArms(h,-0.55,0.18,-0.55,-0.18);}
// party dance: hips bob and sway, arms low and out to the side (never raised above the shoulders)
function jgaDance(h,i,dt){const S=JGA.partySpot;const a=i/Math.max(1,JGA.group.length)*TAU+simTime*0.15;const r=2.6;
  const tx=S[0]+Math.sin(a)*r,tz=S[1]+Math.cos(a)*r;
  const d=Math.hypot(tx-h.x,tz-h.z);if(d>40){jgaTeleport(h,tx,tz);return;}
  if(d>0.5){jgaGo(h,tx,tz,d>6?4.8:2.2,dt);return;}
  faceTo(h,S[0]-h.x,S[1]-h.z,dt,4);h.animate(dt,0);const t=simTime*3.4+i*0.9,s=Math.sin(t);
  h.hips.position.y=0.92+Math.abs(Math.sin(t))*0.06;h.hips.rotation.y=s*0.25;
  jgaArms(h,-0.3+0.15*s,0.55+0.3*s,-0.3-0.15*s,-(0.55-0.3*s));
  h.legL.rotation.x=Math.max(0,s)*0.35;h.legR.rotation.x=Math.max(0,-s)*0.35;
  h.y=groundY(h.x,h.z,h.y);h.sync();}
function jgaUpdateGroup(dt){const P=P1;if(!P.h)return;
  JGA.group.forEach((h,i)=>{if(h.removed)return;h.health=Math.max(h.health,1e5);
    if(h.state==='flee'||h.state==='walk'||h.state==='wait')h.state='jga';if(h.state!=='jga')return;   // knocked down: ped code recovers them
    if(h===JGA.groom&&JGA.wander){jgaWanderStep(h,dt);return;}
    if(JGA.party){jgaDance(h,i,dt);return;}
    jgaFollow(h,i,dt);
    if(h===JGA.groom&&h.jgaTray&&h.jgaTray.visible)jgaHoldTray(h);
    if(h===JGA.groom&&JGA.stage===5&&!P.h.room)h.hips.rotation.z=Math.sin(simTime*1.7)*0.08;});}

// ---------- generic menu (digit keys only while open, buttons clickable) ----------
function jgaEl(id,css){let el=document.getElementById(id);if(el)return el;el=document.createElement('div');el.id=id;el.hidden=true;el.style.cssText=css;document.body.appendChild(el);return el;}
function jgaOpenMenu(kind,title,text,opts,extra=''){
  const el=jgaEl('jgamenu','position:fixed;left:50%;bottom:9%;transform:translateX(-50%);z-index:60;width:min(520px,92vw);background:rgba(24,20,14,0.93);color:#fbf4df;border:2px solid #f2c200;border-radius:10px;padding:14px 18px;font:16px "Barlow Condensed",Arial Narrow,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.55)');
  el.innerHTML=`<div style="font:800 22px Bungee,'Barlow Condensed',sans-serif;color:#f2c200;margin-bottom:4px">${title}</div><div style="opacity:.9;margin-bottom:8px">${text}</div>${extra}`+
    opts.map((o,i)=>`<button data-i="${i}" style="display:block;width:100%;text-align:left;margin:5px 0;padding:8px 12px;background:#3a3020;color:#fff;border:1px solid #6b5a2a;border-radius:6px;font:inherit;cursor:pointer"><kbd style="background:#f2c200;color:#111;border-radius:3px;padding:0 6px;margin-right:8px">${i+1}</kbd>${o.label}</button>`).join('');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>jgaChoose(+b.dataset.i)));
  JGA.menu={kind,opts};el.hidden=false;if(document.pointerLockElement)document.exitPointerLock();}
function jgaCloseMenu(){JGA.menu=null;const el=document.getElementById('jgamenu');if(el)el.hidden=true;}
function jgaChoose(i){const M=JGA.menu;if(!M||!M.opts[i])return;M.opts[i].fn();}
JGA.choose=jgaChoose;
addEventListener('keydown',e=>{if(!JGA.menu||mode!=='play')return;const k=/^Digit([1-9])$/.exec(e.code);if(!k)return;const i=+k[1]-1;
  if(i>=JGA.menu.opts.length)return;jgaChoose(i);e.stopImmediatePropagation();e.preventDefault();},true);

// ---------- stage 3: selling from the tray ----------
function jgaCustomer(P){const h=P.h;let best=null,bd=2.4;
  for(const o of HUMANS){if(o.kind!=='ped'||!o.alive||o.inCar||o.mission||o.keeper||o.jgaAsked||o.state!=='walk')continue;
    const d=Math.hypot(o.x-h.x,o.z-h.z);if(d<bd){bd=d;best=o;}}return best;}
function jgaOffer(o){JGA.cust=o;o.state='wait';o.jgaAsked=true;faceTo(o,P1.h.x-o.x,P1.h.z-o.z,1,1);o.sync();
  jgaOpenMenu('sale','Bauchlade',`Was bietste <b>${o.sex==='f'?'der Dame':'dem Herrn'}</b> aa? (${JGA.sold}/${JGA.SELL_N} verkauft)`,
    [{label:'E Kurze uff de Kalle – €3',fn:()=>jgaSell(3,0.55)},{label:'Weck mit Spundekäs – €2',fn:()=>jgaSell(2,0.65)},{label:'Ach, doch net',fn:()=>jgaEndOffer()}]);
  if(JGA.groom)say(JGA.groom,mpick(['Kurze! Frische Kurze!','Weck, Weck, Weck – un e Lächle gratis!','Kaaft eppes, ich heirat!']),2.2,'loud');}
function jgaSell(price,chance){const o=JGA.cust;if(!o){jgaCloseMenu();return;}
  if(Math.random()<chance){JGA.sold++;G.money+=price;say(o,mpick(JGA_BUY),2.6);o.setExpr&&o.setExpr('laugh');chime([784,988]);
    hint(`Verkauft! <b>${JGA.sold}/${JGA.SELL_N}</b> · +€${price}`,2,P1);}
  else{JGA.declined++;say(o,mpick(JGA_DECLINE),2.8);o.setExpr&&o.setExpr('disgust');hint('Naa danke. Weiter zum Nächste!',2,P1);}
  jgaEndOffer();}
function jgaEndOffer(){const o=JGA.cust;JGA.cust=null;if(o&&!o.removed&&o.alive&&o.state==='wait')o.state='walk';jgaCloseMenu();JGA.menuCD=0.8;}

// ---------- stage 4: dares ----------
function jgaDare(id){return JGA.dares.find(d=>d.id===id);}
function jgaDareDone(id,msg){const d=jgaDare(id);if(!d||d.done)return;d.done=true;chime([523,659,784]);
  showBig('AUFGAB ERFÜLLT','win',2.2,`${JGA_DARES[id]} (${JGA.dares.filter(d=>d.done).length}/${JGA.dares.length})`);if(msg)missionText(msg,4);}
function jgaRhythmStart(){JGA.rhythm={t:-1.5,hits:Array(JGA.BEATS).fill(false),presses:0,tick:-1,endT:0};
  const dots=Array.from({length:JGA.BEATS},(_,i)=>`<span data-b="${i}" style="display:inline-block;width:22px;height:22px;margin:0 4px;border-radius:50%;border:2px solid #f2c200"></span>`).join('');
  jgaOpenMenu('rhythm','Ständche am Fastnachtsbrunnen','Drück im Takt, wenn de Punkt uffleucht! Mindestens 5 von 8.',[{label:'Singe! ♪',fn:jgaSing}],
    `<div id="jgabeats" style="text-align:center;margin:6px 0 4px">${dots}</div>`);}
function jgaSing(){const R=JGA.rhythm;if(!R)return;R.presses++;let best=-1,bd=JGA.WINDOW;
  for(let i=0;i<JGA.BEATS;i++){const d=Math.abs(R.t-i*JGA.BEAT);if(!R.hits[i]&&d<=bd){bd=d;best=i;}}
  if(best>=0){R.hits[best]=true;const el=document.querySelector(`#jgabeats [data-b="${best}"]`);if(el)el.style.background='#3fbf5a';chime([392+best*40]);}
  else noiseHit(0.15,0.08,400);}
function jgaUpdateRhythm(dt){const R=JGA.rhythm;if(!R)return;R.t+=dt;const b=Math.floor((R.t+0.05)/JGA.BEAT);
  if(b!==R.tick&&b>=0&&b<JGA.BEATS){R.tick=b;const el=document.querySelector(`#jgabeats [data-b="${b}"]`);if(el&&!R.hits[b])el.style.background='#f2c200';
    if(JGA.groom)say(JGA.groom,mpick(['♪ Kalle, Kalle … ♪','♪ Heut werd gefeiert ♪','♪ Lalala-la ♪']),0.6);}
  if(R.t>(JGA.BEATS-1)*JGA.BEAT+0.4){const n=R.hits.filter(Boolean).length;JGA.rhythm=null;jgaCloseMenu();
    if(n>=JGA.HITS_NEED)jgaDareDone('brunnen',`Bravo! ${n} von ${JGA.BEATS} Töne getroffe – de Brunne klatscht.`);
    else{hint(`Nur ${n} von ${JGA.BEATS} – des war nix. Glei nochemol!`,2.5,P1);JGA.menuCD=2;}}}
function jgaStrangerMenu(){jgaOpenMenu('schoppe','Winzer Ewald','„Ei, was wollt’er dann?“',[
  {label:'„Ei Gude! Mir feiern de Kalle sei Abschied – hätt’ste e Schöppche fer uns?“',fn:()=>{jgaCloseMenu();say(JGA.stranger,'Fer e Bräutigam? Do, e Schorle – un alles Gude!',3);jgaDareDone('schoppe','De Ewald spendiert e Weinschorle. Des nennt mer Meenzer Gastfreundschaft!');}},
  {label:'„Her mit dem Woi, awwer dalli!“',fn:()=>{jgaCloseMenu();say(JGA.stranger,'Ei, so redt mer net mit eme Winzer!',3);JGA.menuCD=2.5;}},
  {label:'„Ich tausch mei Schuh gege e Schoppe.“',fn:()=>{jgaCloseMenu();say(JGA.stranger,'Dei Schuh? Die riech ich bis hierher. Naa!',3);JGA.menuCD=2.5;}}]);}
function jgaFlash(){const el=jgaEl('jgaflash','position:fixed;inset:0;background:#fff;z-index:59;pointer-events:none;opacity:0;transition:opacity .6s');
  el.hidden=false;el.style.transition='none';el.style.opacity='0.95';requestAnimationFrame(()=>{el.style.transition='opacity .6s';el.style.opacity='0';});}
function jgaUpdateDares(m,dt){const P=P1;const h=P.h;if(P.car||h.room)return;const S=JGA.spots;
  const at=(p,r)=>Math.hypot(h.x-p[0],h.z-p[1])<r;
  for(const d of JGA.dares){if(d.done)continue;
    if(d.id==='brunnen'&&!JGA.rhythm&&!JGA.menu&&JGA.menuCD<=0&&at(S.brunnen,4))jgaRhythmStart();
    if(d.id==='foto'){if(at(S.foto,2)){const near=JGA.group.filter(o=>Math.hypot(o.x-h.x,o.z-h.z)<10).length;m.fotoT=(m.fotoT||0)+dt;
        if(m.fotoT>0.4&&m.fotoT-dt<=0.4)hint('Stillhalte – alle in die Kamera gucke!',2,P);
        if(m.fotoT>2.5){if(near>=3){jgaFlash();chime([1200]);jgaDareDone('foto','Klick! Die ganze Truppe vorm Dom – des Bild kimmt ins Album.');}else{m.fotoT=0;hint('Wart, bis die Truppe beisamme is!',2,P);}}}
      else m.fotoT=0;}
    if(d.id==='schoppe'&&JGA.stranger&&!JGA.menu&&JGA.menuCD<=0&&Math.hypot(h.x-JGA.stranger.x,h.z-JGA.stranger.z)<2.5)jgaStrangerMenu();
    if(d.id==='polonaise'){const k=m.polo||0;const p=S.polo[k];if(at(p,2.5)){m.polo=k+1;chime([440+k*110]);
        if(m.polo>=S.polo.length)jgaDareDone('polonaise','Eimol rund um die Heunensäule – die Truppe hängt dran wie e Zugplakettche.');
        else hint(`Polonaise: ${m.polo}/${S.polo.length}`,1.5,P);}}}
  if(JGA.menu&&JGA.menu.kind==='schoppe'&&JGA.stranger&&Math.hypot(h.x-JGA.stranger.x,h.z-JGA.stranger.z)>4)jgaCloseMenu();
  if(JGA.rhythm&&!at(S.brunnen,7)){JGA.rhythm=null;jgaCloseMenu();}}
function jgaDareMarks(m){const S=JGA.spots;const out=[];
  for(const d of JGA.dares){if(d.done)continue;if(d.id==='polonaise')out.push(S.polo[Math.min(m.polo||0,S.polo.length-1)]);
    else if(d.id==='schoppe')out.push(JGA.stranger?[JGA.stranger.x,JGA.stranger.z]:S.schoppe);else out.push(S[d.id]);}return out;}

// ---------- stage 5: the tipsy groom wanders off ----------
function jgaWanderStart(){const g=JGA.groom;if(!g)return;const [px,pz]=ppos(P1);
  JGA.wander={a:Math.atan2(g.x-px,g.z-pz)+mr(-0.6,0.6),sayT:0,far:false};JGA.groomLost=true;JGA.catchT=JGA.CATCH_T;
  say(g,mpick(['Ich hol nur schnell e Brezel!','Gugg emol, e Taub! … Taub!','Ich geh nur kurz Luft schnappe …','Wo is dann de Rhoi? Ich such’en!']),3,'loud');
  hint('<b>Kalle</b> is abgehaue! Fang ihn ei, bevor er verschwunne is!',3,P1);}
function jgaWanderStep(g,dt){const W=JGA.wander;const a=W.a+Math.sin(simTime*1.3)*0.5;const fx=Math.sin(a),fz=Math.cos(a);
  if(blocked(g.x+fx*1.2,g.z+fz*1.2))W.a+=(Math.random()<0.5?1:-1)*mr(0.7,1.5);
  const mv=moveHuman(g,fx,fz,1.7,dt);faceTo(g,fx,fz,dt,5);g.animate(dt,mv);g.hips.rotation.z=Math.sin(simTime*2.3)*0.14;
  W.sayT-=dt;if(W.sayT<=0){W.sayT=mr(3,5);say(g,mpick(DRUNK_HICK),2,'quiet');}
  g.y=groundY(g.x,g.z,g.y);g.sync();}
function jgaCatch(){const g=JGA.groom;JGA.wander=null;JGA.groomLost=false;JGA.catches++;g.hips.rotation.z=0;
  say(g,mpick(['Ei, do seid’er jo! Ich hab euch gesucht!','Hoppla – ich war nur kurz weg. Oder?','Ich lieb euch all!']),3,'loud');chime([660,880]);
  hint(`Kalle eingefange! <b>${JGA.catches}/${JGA.CATCH_N}</b>`,2,P1);}

// ---------- stage 6: pubs + party ----------
function jgaPubVisited(s){const m=jgaActive('jga_finale');if(!m||m.phase!=='pubs'||!JGA.pubs.includes(s)||JGA.visited.includes(s))return;
  JGA.visited.push(s);chime([523,784]);
  for(const h of JGA.group)if(!h.removed)say(h,mpick(['Prost uff de Kalle!','Zum Wohl!','Noch e Kneip!','Uff die Lieb!']),2.5);
  showBig(`KNEIP ${JGA.visited.length}/3`,'win',2,s.name);}
function jgaMusic(){const ctx=AUD.ctx;if(!ctx||!AUD.master){JGA.musicOn=false;return;}JGA.musicOn=true;const M=JGA.mus||(JGA.mus={next:ctx.currentTime+0.1,i:0});
  const beat=0.42;
  while(M.next<ctx.currentTime+0.4){const st=JGA_TUNE[M.i%JGA_TUNE.length];const t=M.next;
    const o=ctx.createOscillator();o.type='triangle';o.frequency.value=261.63*Math.pow(2,st/12);const gn=ctx.createGain();
    gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(0.16,t+0.02);gn.gain.exponentialRampToValueAtTime(0.0001,t+beat*0.9);o.connect(gn);gn.connect(AUD.master);o.start(t);o.stop(t+beat);
    if(M.i%3===0){const b=ctx.createOscillator();b.type='square';b.frequency.value=65.41*Math.pow(2,(st<5?0:7)/12);const bg=ctx.createGain();
      bg.gain.setValueAtTime(0.05,t);bg.gain.exponentialRampToValueAtTime(0.0001,t+beat*0.8);b.connect(bg);bg.connect(AUD.master);b.start(t);b.stop(t+beat);}
    else noiseHit(0.05,0.05,5000);
    M.next+=beat;M.i++;}}

// ---------- photo album ----------
function jgaThumb(kind){const c=document.createElement('canvas');c.width=200;c.height=130;const g=c.getContext('2d');
  const night=kind==='party'||kind==='pubs';const sky=g.createLinearGradient(0,0,0,90);
  sky.addColorStop(0,night?'#16224a':'#7fb6e8');sky.addColorStop(1,night?'#5a3a6a':'#d8ecf7');g.fillStyle=sky;g.fillRect(0,0,200,130);
  g.fillStyle=kind==='party'?'#2c5c86':'#b9ac94';g.fillRect(0,92,200,38);
  if(kind==='foto'){g.fillStyle='#a4473a';g.fillRect(70,20,60,72);for(const x of [62,130]){g.fillRect(x,10,10,82);g.beginPath();g.moveTo(x-2,10);g.lineTo(x+5,-6);g.lineTo(x+12,10);g.fill();}}
  if(kind==='brunnen'){g.fillStyle='#8a8f96';g.fillRect(80,62,40,30);g.beginPath();g.moveTo(84,62);g.lineTo(100,18);g.lineTo(116,62);g.fill();}
  if(kind==='pubs'){g.fillStyle='#6a4a2a';g.fillRect(20,30,160,62);g.fillStyle='#ffd27a';for(const x of [36,86,136])g.fillRect(x,46,28,22);}
  if(kind==='party'){g.fillStyle='#ffe9a8';g.beginPath();g.arc(170,22,10,0,TAU);g.fill();for(let i=0;i<7;i++){g.fillStyle=['#f2c200','#c8102e','#3fbf5a'][i%3];g.fillRect(14+i*26,12+((i*7)%10),8,8);}}
  if(kind==='shop'){g.fillStyle='#e9e2d4';g.fillRect(30,28,140,64);g.fillStyle='#c8102e';g.fillRect(30,28,140,14);}
  if(kind==='polonaise'){g.fillStyle='#d9cdb5';g.fillRect(94,24,12,68);}
  const n=kind==='groom'?2:5;
  for(let i=0;i<n;i++){const x=n===2?80+i*40:30+i*35,y=92;const groom=i===(n===2?0:2);
    g.fillStyle=groom?'#f6f3ea':'#f2c200';g.fillRect(x-8,y-34,16,22);g.fillStyle='#2f4766';g.fillRect(x-7,y-12,6,12);g.fillRect(x+1,y-12,6,12);
    g.fillStyle='#e7b98f';g.beginPath();g.arc(x,y-41,7,0,TAU);g.fill();
    if(groom){g.fillStyle='#e8c040';g.fillRect(x-7,y-52,14,5);}
    g.strokeStyle=groom?'#f6f3ea':'#f2c200';g.lineWidth=4;g.beginPath();const sw=kind==='party'?10:4;g.moveTo(x-8,y-32);g.lineTo(x-8-sw,y-18);g.moveTo(x+8,y-32);g.lineTo(x+8+sw,y-18);g.stroke();}
  if(kind==='tray'){g.fillStyle='#8a5a30';g.fillRect(90,64,22,6);}
  return c.toDataURL('image/jpeg',0.8);}
function jgaAlbum(){const pics=[['crew','Die Truppe komplett: Kalle, de Hotte, Gerdi, Schnudel-Ralf un Elfi.'],
    ['shop','„Team Kalle – Lass mers krache!“ Sechs gelbe Shirts, kaans passt richtig.'],
    ['tray',`Bauchlade-Bilanz: ${JGA.sold} Sache verkauft, ${JGA.declined}× „naa danke“ kassiert.`],
    ...JGA.dares.map(d=>[d.id==='schoppe'?'crew':d.id,{brunnen:'Ständche am Fastnachtsbrunnen – die Taube sin geflüchtet.',foto:'Gruppefoto vorm Dom. Elfi hat de Daume vorm Objektiv.',
      schoppe:'Winzer Ewald spendiert e Schorle. Danke, Ewald!',polonaise:'Polonaise um die Heunensäule – dreimal rum, aamol verlaafe.'}[d.id]]),
    ['groom',`Kalle ${JGA.catches}× wiedergefunne – aamol am Brezelstand, aamol bei de Taube.`],
    ['pubs','Kneipetour: drei Wirtschafte, drei Mol „Uff de Kalle!“.'],
    ['party','Rheinufer-Party: geschunkelt, bis die Laterne angange sin.']];
  const el=jgaEl('jgaalbum','position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(760px,95vw);max-height:92vh;overflow:auto;background:#3b2a1c;color:#2a1d12;padding:16px 18px 12px;border-radius:12px;box-shadow:0 14px 50px rgba(0,0,0,0.7);cursor:pointer;font:14px "Barlow Condensed",Arial Narrow,sans-serif');
  el.innerHTML=`<div style="font:900 30px Bungee,'Barlow Condensed',sans-serif;color:#f2c200;text-align:center;margin-bottom:2px">Fotoalbum: JGA vom Kalle</div>
<div style="color:#f1e6cf;text-align:center;margin-bottom:10px">Team Kalle – Lass mers krache!</div>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">${pics.map(([k,cap],i)=>
  `<figure style="margin:0;background:#fbf8f0;padding:8px 8px 10px;box-shadow:0 3px 10px rgba(0,0,0,.4);transform:rotate(${((i*37)%7-3)*0.8}deg)"><img alt="" src="${jgaThumb(k)}" style="width:100%;display:block"><figcaption style="margin-top:6px;line-height:1.2">${cap}</figcaption></figure>`).join('')}</div>
<div style="color:#d8cbb0;font-size:11px;text-align:center;margin-top:10px">Alle Personen sin frei erfunne. Klick zum Weiterspiele.</div>`;
  el.onclick=()=>{el.hidden=true;JGA.albumT=0;};el.hidden=false;JGA.albumT=JGA.ALBUM_T;}
function jgaFinish(){JGA.done=true;JGA.stage=7;JGA.party=false;jgaAlbum();}

// ===================== MISSION CHAIN =====================
function jgaWin(m){m.jgaWon=true;JGA.callT=6;return 'win';}
function jgaEnd(m){jgaCloseMenu();JGA.rhythm=null;if(!m.jgaWon&&!JGA.done&&JGA.stage>=1)JGA.callT=15;}
function jgaMissions(){const meet=JGA.meet;
  const add=(o)=>{MISSIONS.push(Object.assign({tag:'J',free:true,start:meet},o));};
  // 1: crew
  add({id:'jga_truppe',title:'JGA I: Truppe zusammetrommle',
    begin(m){jgaSetStage(1);jgaEnsureGroup();
      m.npcs=JGA_FRIENDS.filter(f=>!JGA.friends.includes(f.id)).map(f=>{const p=POI[f.at]||POI.dom;const h=jgaSpawn(f,p[0]+5,p[1]+5);h.jgaDef=f;return h;});
      missionText('<b>Kalle</b> am Telefon: „Ei Gude! Ich heirat nächst Woch – mei Junggeselleabschied muss krache! Trommel die <b>Truppe</b> zusamme: de Hotte, Gerdi, Ralf un Elfi.“',9);},
    update(m){const P=mP(m);const [px,pz]=ppos(P);
      for(const h of m.npcs){if(h.jgaJoined||h.removed)continue;faceTo(h,px-h.x,pz-h.z,JGA.dt,4);h.animate(JGA.dt,0);h.sync();
        if(!P.car&&!P.h.room&&Math.hypot(px-h.x,pz-h.z)<3){const f=h.jgaDef;h.jgaJoined=true;JGA.friends.push(f.id);JGA.group.push(h);
          say(h,f.lines[0]+' '+f.lines[1],5,'loud');chime([660,880]);missionText(`<b>${f.name}</b> is dabei! Truppe: ${JGA.friends.length}/4`,4);}}
      const rest=m.npcs.filter(h=>!h.jgaJoined&&!h.removed);m.marks=rest.map(h=>[h.x,h.z]);
      m.target=rest.length?rest.reduce((a,b)=>Math.hypot(a.x-px,a.z-pz)<Math.hypot(b.x-px,b.z-pz)?a:b):null;if(m.target)m.target=[m.target.x,m.target.z];
      if(JGA.friends.length>=4){jgaSetStage(2);return jgaWin(m);}},
    end(m){for(const h of m.npcs||[])if(!h.jgaJoined&&!h.removed)h.remove();jgaEnd(m);},
    reward:300,win:'Die Truppe steht! Jetzt fehle nur noch die passende Shirts.'});
  // 2: shirts
  add({id:'jga_shirts',jgaNeed:'jga_truppe',title:'JGA II: Team-Shirts',
    begin(m){jgaSetStage(2);missionText('Kalle: „Mir brauche <b>Team-Shirts</b>! Geh in en <b>Modelade</b> un kauf „Team Kalle – Lass mers krache!“ fer all.“',8);},
    update(m){if(JGA.shirts){jgaSetStage(3);return jgaWin(m);}const P=mP(m);const [px,pz]=ppos(P);
      m.scanT=(m.scanT||0)-1;if(m.scanT<=0){m.scanT=60;let b=null,bd=1e18;for(const s of SHOPS){if(s.cat!==2||s.inVenue)continue;const d=(s.x-px)**2+(s.z-pz)**2;if(d<bd){bd=d;b=s;}}m.target=b?[b.x,b.z]:null;}},
    end(m){jgaEnd(m);},reward:200,win:'Sechs gelbe Shirts – mer sieht euch bis Wissbaade.'});
  // 3: tray
  add({id:'jga_bauchladen',jgaNeed:'jga_shirts',title:'JGA III: De Bauchlade',
    begin(m){jgaSetStage(3);if(JGA.groom&&JGA.groom.jgaTray)JGA.groom.jgaTray.visible=true;
      missionText(`Kalle hot en <b>Bauchlade</b> um. Geh zu de Passante un verkauf <b>${JGA.SELL_N}</b> Kurze odder Weck mit Spundekäs!`,8);},
    update(m){if(JGA.sold>=JGA.SELL_N){jgaSetStage(4);if(JGA.groom&&JGA.groom.jgaTray)JGA.groom.jgaTray.visible=false;return jgaWin(m);}
      const P=mP(m);if(JGA.cust){const o=JGA.cust;if(o.removed||!o.alive||Math.hypot(o.x-P.h.x,o.z-P.h.z)>4||P.car||P.h.room)jgaEndOffer();else{faceTo(o,P.h.x-o.x,P.h.z-o.z,JGA.dt,6);o.sync();}return;}
      if(JGA.menu||JGA.menuCD>0||P.car||P.h.room||TALK||SHOP_UI.open)return;const o=jgaCustomer(P);if(o)jgaOffer(o);},
    end(m){if(JGA.cust)jgaEndOffer();jgaEnd(m);},reward:300,win:'De Bauchlade is leer – Kalle zählt die Münze.'});
  // 4: dares
  add({id:'jga_aufgaben',jgaNeed:'jga_bauchladen',title:'JGA IV: Aufgabe in de Altstadt',
    begin(m){jgaSetStage(4);if(!JGA.dares.length){const ids=Object.keys(JGA_DARES);while(JGA.dares.length<3){const id=mpick(ids);if(!jgaDare(id))JGA.dares.push({id,done:false});}}
      const s=jgaDare('schoppe');if(s&&!s.done){const p=JGA.spots.schoppe;const h=jgaSpawn({id:'ewald',name:'Winzer Ewald',sex:'m'},p[0],p[1]);h.jga.stranger=true;JGA.stranger=h;}
      m.polo=0;missionText('Drei <b>Aufgabe</b> fer de Bräutigam: '+JGA.dares.map(d=>`<b>${JGA_DARES[d.id]}</b>`).join(' · '),9);},
    update(m){if(JGA.dares.every(d=>d.done)){jgaSetStage(5);return jgaWin(m);}
      if(JGA.stranger){const P=mP(m);jgaStand(JGA.stranger,JGA.dt,ppos(P));}
      jgaUpdateDares(m,JGA.dt);const [px,pz]=ppos(mP(m));m.marks=jgaDareMarks(m);
      m.target=m.marks.length?m.marks.reduce((a,b)=>Math.hypot(a[0]-px,a[1]-pz)<Math.hypot(b[0]-px,b[1]-pz)?a:b):null;},
    end(m){if(JGA.stranger&&!JGA.stranger.removed)JGA.stranger.remove();JGA.stranger=null;jgaEnd(m);},
    reward:600,win:'Alle Aufgabe erfüllt. De Kalle is stolz – un e bissi heiser.'});
  // 5: don't lose the groom
  add({id:'jga_braeutigam',jgaNeed:'jga_aufgaben',title:'JGA V: De Bräutigam net verliere',
    begin(m){jgaSetStage(5);JGA.catches=0;JGA.wander=null;JGA.groomLost=false;m.calmT=4;
      missionText(`De <b>Kalle</b> is e bissi beschwipst un macht sich immer widder devun. Fang ihn <b>${JGA.CATCH_N}×</b> ei, bevor er weg is!`,8);},
    update(m){const P=mP(m);const g=JGA.groom;if(!g||g.removed)return;
      if(JGA.catches>=JGA.CATCH_N){jgaSetStage(6);return jgaWin(m);}
      if(!JGA.wander){m.target=null;m.calmT-=JGA.dt;if(m.calmT<=0)jgaWanderStart();return;}
      m.target=[g.x,g.z];JGA.catchT-=JGA.dt;
      // he only counts as lost once he got clear of the player - otherwise the first step would already catch him
      const d=Math.hypot(P.h.x-g.x,P.h.z-g.z);if(d>6)JGA.wander.far=true;
      if(JGA.wander.far&&!P.car&&!P.h.room&&d<2.5){jgaCatch();m.calmT=mr(10,16);return;}
      if(JGA.catchT<=0)return 'fail';},
    end(m){const g=JGA.groom;JGA.wander=null;JGA.groomLost=false;if(g&&!g.removed){g.hips.rotation.z=0;const [px,pz]=ppos(P1);if(!P1.h.room)jgaTeleport(g,px-1.5,pz-1.5);}jgaEnd(m);},
    reward:800,win:'Kalle is noch do. Mehr odder weniger.'});
  // 6: finale
  add({id:'jga_finale',jgaNeed:'jga_braeutigam',title:'JGA VI: Kneipetour un Rheinufer-Party',
    begin(m){jgaSetStage(6);JGA.visited=[];JGA.party=false;JGA.partyT=0;m.phase='pubs';
      missionText('Finale! Erst e <b>Kneipetour</b> durch drei Wirtschafte in de Altstadt (rein un widder raus), dann <b>Party am Rheinufer</b>.',8);},
    update(m){const P=mP(m);const [px,pz]=ppos(P);
      if(m.phase==='pubs'){const left=JGA.pubs.filter(s=>!JGA.visited.includes(s));m.marks=left.map(s=>[s.x,s.z]);
        if(!left.length&&!P.h.room){m.phase='party';m.marks=null;missionText('Uff zum <b>Rheinufer</b> – do steigt die Party!',5);}
        else m.target=left.length?m.marks.reduce((a,b)=>Math.hypot(a[0]-px,a[1]-pz)<Math.hypot(b[0]-px,b[1]-pz)?a:b):null;return;}
      const S=JGA.partySpot;m.target=m.phase==='party'?S:null;
      if(m.phase==='party'){if(!P.car&&!P.h.room&&Math.hypot(px-S[0],pz-S[1])<7){m.phase='dance';JGA.party=true;JGA.partyT=0;JGA.mus=null;
          showBig('RHEINUFER-PARTY','mission',3,'Schunkele, tanze, feiern – uff de Kalle!');}return;}
      JGA.partyT+=JGA.dt;jgaMusic();if(JGA.partyT>=JGA.PARTY_T){jgaFinish();return jgaWin(m);}},
    end(m){JGA.party=false;JGA.musicOn=false;JGA.mus=null;jgaEnd(m);},
    reward:JGA.REWARD,win:'De JGA vom Kalle – legendär. Des Fotoalbum kriegt en Ehreplatz.'});
  for(const m of MISSIONS.filter(m=>m.id.startsWith('jga_'))){const b=beacon();setBeacon(b,m.start[0],m.start[1]);b.userData.m=m;startBeacons.push(b);}}

// the next chain mission only appears once the previous one is done
const _jgaAvailable=availableMissions;
availableMissions=function(){return _jgaAvailable().filter(m=>!m.jgaNeed||G.done[m.jgaNeed]);};
// matching shirts are sold in clothing shops while stage 2 is open
const _jgaShopItems=shopItems;
shopItems=function(shop){const L=_jgaShopItems(shop);if(JGA.stage!==2||JGA.shirts||shop.cat!==2)return L;
  L.push({n:'Team-Kalle-Shirts (6 Stück)',p:JGA.SHIRT_P,f:()=>{JGA.shirts=true;jgaDressAll();return '„Team Kalle – Lass mers krache!“ – fer all sechs.';}});return L;};
const _jgaExitShop=exitShop;
exitShop=function(P){const r=P.h&&P.h.room;const s=r&&r.shop;_jgaExitShop(P);if(s)jgaPubVisited(s);};

// ===================== SAVE GAME =====================
function jgaState(){return {stage:JGA.stage,friends:[...JGA.friends],shirts:JGA.shirts,sold:JGA.sold,declined:JGA.declined,
  dares:JGA.dares.map(d=>({id:d.id,done:d.done})),catches:JGA.catches,done:JGA.done};}
function jgaLoad(d){d=d||{};jgaDespawn();jgaCloseMenu();
  JGA.stage=clamp(Math.floor(+d.stage||0),0,7);JGA.friends=[...new Set((Array.isArray(d.friends)?d.friends:[]).filter(id=>JGA_FRIENDS.some(f=>f.id===id)))];
  JGA.shirts=!!d.shirts;JGA.sold=clamp(Math.floor(+d.sold||0),0,99);JGA.declined=clamp(Math.floor(+d.declined||0),0,999);
  JGA.dares=(Array.isArray(d.dares)?d.dares:[]).filter(x=>x&&JGA_DARES[x.id]).slice(0,3).map(x=>({id:x.id,done:!!x.done}));
  JGA.catches=clamp(Math.floor(+d.catches||0),0,JGA.CATCH_N);JGA.done=!!d.done;
  JGA.groomLost=false;JGA.wander=null;JGA.party=false;JGA.rhythm=null;JGA.cust=null;JGA.visited=[];JGA.callT=0;}
const _jgaSnapshot=snapshot;
snapshot=function(){const s=_jgaSnapshot();s.jga=jgaState();return s;};
const _jgaApplySave=applySave;
applySave=function(d){const ok=_jgaApplySave(d);if(ok)jgaLoad(d.jga);return ok;};

// ===================== SETUP / UPDATE =====================
function setupJga(){const H=PL.heunen||[-27.8,-82];
  JGA.meet=freeSpot(POI.markt[0]-26,POI.markt[1]-16,0.6);
  JGA.spots={brunnen:freeSpot(POI.fastnacht[0]+6,POI.fastnacht[1]+6,0.5),foto:freeSpot(-12,-58,0.6),
    schoppe:freeSpot((PL.gutdenk||[-172,-5])[0]+5,(PL.gutdenk||[-172,-5])[1]+5,0.5),
    polo:[0,1,2,3].map(k=>freeSpot(H[0]+Math.sin(k*TAU/4)*7,H[1]+Math.cos(k*TAU/4)*7,0.5))};
  // party on the river bank: walk east from the Rathaus until the water starts, then step back onto land
  const R=PL.rathaus||[174,-189];let wx=R[0]+60;for(let x=R[0];x<R[0]+500;x+=2){const i=idx(x,R[1]);if(i>=0&&(mfG(i)&4)){wx=x-12;break;}}
  JGA.partySpot=landSpotNear(wx,R[1],20)||freeSpot(wx,R[1],0.6);
  // three Altstadt restaurants near the market, spread out a bit
  const M=POI.markt;const cands=SHOPS.filter(s=>s.cat===4&&!s.inVenue&&districtAt(s.x,s.z)==='Altstadt').sort((a,b)=>Math.hypot(a.x-M[0],a.z-M[1])-Math.hypot(b.x-M[0],b.z-M[1]));
  for(const s of cands){if(JGA.pubs.length>=3)break;if(JGA.pubs.every(p=>Math.hypot(p.x-s.x,p.z-s.z)>30))JGA.pubs.push(s);}
  for(const s of SHOPS){if(JGA.pubs.length>=3)break;if((s.cat===4||s.cat===3)&&!s.inVenue&&!JGA.pubs.includes(s)&&Math.hypot(s.x-M[0],s.z-M[1])<600)JGA.pubs.push(s);}
  jgaMissions();}
function updateJga(dt){JGA.dt=dt||1/60;
  if(JGA.albumT>0){JGA.albumT-=dt;if(JGA.albumT<=0){const el=document.getElementById('jgaalbum');if(el)el.hidden=true;}}
  if(JGA.done&&JGA.group.length&&JGA.albumT<=0&&!JGA.party)jgaRelease();
  if(mode!=='play')return;
  if(JGA.menuCD>0)JGA.menuCD-=dt;
  if(JGA.callT>0){JGA.callT-=dt;if(JGA.callT<=0&&JGA.stage>=1&&!JGA.done){
    if(activeMission||!P1.h||P1.h.room||P1.gameOver)JGA.callT=3;
    else{const next=availableMissions().find(m=>m.id.startsWith('jga_'));if(next){hint('📞 <b>Kalle</b> ruft aa: „Weiter geht’s!“',3,P1);startMission(next,P1);}}}}
  if(JGA.stage>=1&&!JGA.done&&!JGA.group.length)jgaEnsureGroup();
  jgaUpdateGroup(dt);jgaUpdateRhythm(dt);
  if(JGA.menu&&!jgaMission())jgaCloseMenu();}
