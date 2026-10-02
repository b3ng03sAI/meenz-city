// ===================== SPIELZUSTAND =====================
const $=id=>document.getElementById(id);
const G={money:250,stats:{kills:0,cars:0,missions:0,schoppen:0},done:{},split:false};
function makePlayer(id){return {id,h:null,car:null,armor:0,owned:{fist:true},ammo:{},mag:{},weapon:'fist',reloadT:0,fireT:0,vy:0,ground:true,hurtT:0,aimT:0,
  cam:{yaw:Math.PI/2,pitch:0.22,lastLook:-10,shake:0,zoom:1,init:false},camera:id===0?camera:new THREE.PerspectiveCamera(60,1,0.5,13000),gameOver:null,gameOverT:0,bustT:0,prev:{},inp:{},thrown:0};}
const P1=makePlayer(0);let P2=null;const PLAYERS=[P1];
const player=P1;
let mode='loading',simTime=0,timeScale=1;
let wanted=0,heat=0,seenT=0,seeCheckT=0,playerSeen=false,policeSpawnT=0;
let gameMin=17*60+5;let nightF=0;
const keys={};const keysP={};const mouse={left:false,right:false,locked:false,drag:false,dx:0,dy:0};
const touch={mx:0,mz:0,active:false};
function ppos(P=P1){if(P.car)return [P.car.x,P.car.z];if(P.h.room)return [P.h.room.shop.doorX,P.h.room.shop.doorZ];return [P.h.x,P.h.z];}
function pvel(P=P1){return P.car?[P.car.vx,P.car.vz]:[P.h.vx||0,P.h.vz||0];}
function nearestPlayer(x,z){let best=P1,bd=1e18;for(const P of PLAYERS){if(P.gameOver)continue;const [px,pz]=ppos(P);const d=(px-x)**2+(pz-z)**2;if(d<bd){bd=d;best=P;}}return best;}
function playerOfHuman(h){return PLAYERS.find(P=>P.h===h)||null;}
function isPlayerCar(c){return PLAYERS.some(P=>P.car===c);}

// ===================== EINGABE =====================
// Spieler 1: WASD + Maus (+ Pfeiltasten und Gamepad, wenn allein). Spieler 2: Pfeiltasten, Enter, rechte Strg/Shift, Minus – oder Gamepad.
function padState(i){try{const ps=navigator.getGamepads?navigator.getGamepads():[];const p=ps&&ps[i];if(!p||!p.connected)return null;const b=k=>p.buttons[k]&&(p.buttons[k].pressed||p.buttons[k].value>0.4);const ax=k=>{const v=p.axes[k]||0;return Math.abs(v)<0.15?0:v;};
  return {mx:ax(0),mz:-ax(1),lx:ax(2),ly:ax(3),fire:b(7),aim:b(6),jump:b(0),enter:b(3)||b(1),weapon:b(5)||b(2),weaponPrev:b(4),reload:b(2),map:b(8),pause:b(9),rt:p.buttons[7]?p.buttons[7].value:0,lt:p.buttons[6]?p.buttons[6].value:0};}catch(e){return null;}}
function readInput(P){const I={mx:0,mz:0,lookX:0,lookY:0,sprint:false,jump:false,fire:false,aim:false,enter:false,weapon:false,weaponPrev:false,reload:false,throttle:0,brake:0,steer:0,hand:false};
  const split=G.split;
  if(P.id===0){I.mz=(keys.KeyW?1:0)-(keys.KeyS?1:0);I.mx=(keys.KeyD?1:0)-(keys.KeyA?1:0);
    if(!split){I.mz+=(keys.ArrowUp?1:0)-(keys.ArrowDown?1:0);I.mx+=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0);}
    I.sprint=!!(keys.ShiftLeft||(!split&&keys.ShiftRight));I.jump=!!keys.Space;I.fire=mouse.left;I.aim=mouse.right;I.enter=!!(keys.KeyF||keysP.KeyF||(!split&&(keys.Enter||keysP.Enter)));I.weapon=!!(keys.KeyQ||keys.Tab||keysP.KeyQ||keysP.Tab);I.reload=!!(keys.KeyR||keysP.KeyR);I.jump=I.jump||!!keysP.Space;
    for(const k of ['KeyF','Enter','KeyQ','Tab','KeyR','Space'])keysP[k]=false;
    I.lookX=mouse.dx;I.lookY=mouse.dy;mouse.dx=0;mouse.dy=0;
    if(touch.active){I.mx+=touch.mx;I.mz+=touch.mz;}
    const gp=padState(split?99:0);if(gp)mergePad(I,gp);}
  else{I.mz=(keys.ArrowUp?1:0)-(keys.ArrowDown?1:0);I.mx=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0);I.sprint=!!keys.ShiftRight;I.jump=!!keys.ShiftRight;I.fire=!!(keys.ControlRight||keys.Numpad0);I.enter=!!(keys.Enter||keys.NumpadEnter);I.weapon=!!(keys.Minus||keys.NumpadSubtract||keys.Slash);
    I.lookX=((keys.Numpad6||keys.Period)?1:0)-((keys.Numpad4||keys.Comma)?1:0);I.lookX*=8;
    const gp=padState(0)||padState(1);if(gp)mergePad(I,gp);}
  I.mx=clamp(I.mx,-1,1);I.mz=clamp(I.mz,-1,1);
  I.throttle=Math.max(0,I.mz,I.rt||0);I.brake=Math.max(0,-I.mz,I.lt||0);I.steer=-I.mx;I.hand=I.jump;
  // Flanken (einmal pro Tastendruck)
  for(const k of ['enter','weapon','weaponPrev','reload','jump']){I[k+'P']=I[k]&&!P.prev[k];P.prev[k]=I[k];}
  I.fireP=I.fire&&!P.prev.fire;P.prev.fire=I.fire;
  return I;}
function mergePad(I,gp){I.mx+=gp.mx;I.mz+=gp.mz;I.lookX+=gp.lx*14;I.lookY+=gp.ly*9;I.fire=I.fire||gp.fire;I.aim=I.aim||gp.aim;I.jump=I.jump||gp.jump;I.enter=I.enter||gp.enter;I.weapon=I.weapon||gp.weapon;I.weaponPrev=gp.weaponPrev;I.reload=I.reload||gp.reload;I.sprint=I.sprint||gp.jump;I.rt=gp.rt;I.lt=gp.lt;
  if(gp.pause&&!mergePad.p&&mode==='play')pauseGame();mergePad.p=gp.pause;}
addEventListener('keydown',e=>{keys[e.code]=true;if(!e.repeat)keysP[e.code]=true;
  if(mode==='play'){
    if(e.code==='KeyH'&&P1.car)horn();
    if(e.code==='KeyM')openMap();
    if(e.code==='KeyP'||e.code==='Escape')pauseGame();
    if(e.code==='KeyT'){gameMin=(gameMin+60)%1440;envDirty=true;hint('Uhrzeit: +1 Stunde',2);}
    if(e.code==='KeyZ'){const ks=Object.keys(WEATHER_TYPES);setWeather(ks[(ks.indexOf(WEATHER.kind)+1)%ks.length]);hint('Wetter: '+WEATHER_TYPES[WEATHER.kind].label,2);}
    if(e.code==='F5'){e.preventDefault();saveGame(1,true);}
    if(e.code.startsWith('Digit')&&!SHOP_UI.open){const n=+e.code.slice(5);const list=weaponList(P1);if(n>=1&&n<=list.length)selectWeapon(P1,list[n-1]);}
    if(e.code==='Space'||e.code.startsWith('Arrow')||e.code==='Tab')e.preventDefault();
  }else if(mode==='map'&&(e.code==='KeyM'||e.code==='Escape'))closeMap();
  else if(mode==='pause'&&e.code==='KeyP')resumeGame();
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.left=mouse.right=false;});
const cvs=renderer.domElement;
cvs.addEventListener('contextmenu',e=>e.preventDefault());
cvs.addEventListener('mousedown',e=>{if(mode!=='play')return;if(!IS_TOUCH&&!mouse.locked&&cvs.requestPointerLock){try{const r=cvs.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(_){}}
  if(e.button===0)mouse.left=true;if(e.button===2)mouse.right=true;mouse.drag=true;});
addEventListener('mouseup',e=>{if(e.button===0)mouse.left=false;if(e.button===2)mouse.right=false;mouse.drag=false;});
addEventListener('mousemove',e=>{if(mode!=='play')return;if(mouse.locked||mouse.drag){mouse.dx+=e.movementX;mouse.dy+=e.movementY;}});
document.addEventListener('pointerlockchange',()=>{const was=mouse.locked;mouse.locked=document.pointerLockElement===cvs;if(was&&!mouse.locked&&mode==='play'&&!SHOP_UI.open)hint('Maus frei – ins Bild klicken zum Weiterspielen, <b>P</b> für Pause.',3);});
addEventListener('wheel',e=>{if(mode==='play'){P1.cam.zoom=clamp(P1.cam.zoom+Math.sign(e.deltaY)*0.12,0.6,1.8);}},{passive:true});
function setupTouch(){if(!IS_TOUCH)return;$('touch').hidden=false;const pad=$('tpad'),knob=$('tknob');let pid=null,cx=0,cy=0;
  pad.addEventListener('pointerdown',e=>{pid=e.pointerId;const r=pad.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;pad.setPointerCapture(pid);mv(e);});
  const mv=e=>{if(e.pointerId!==pid)return;let dx=e.clientX-cx,dy=e.clientY-cy;const L=Math.hypot(dx,dy),Mx=50;if(L>Mx){dx*=Mx/L;dy*=Mx/L;}knob.style.transform=`translate(${dx}px,${dy}px)`;touch.mx=dx/Mx;touch.mz=-dy/Mx;touch.active=true;};
  pad.addEventListener('pointermove',mv);const up=e=>{if(e.pointerId!==pid)return;pid=null;knob.style.transform='';touch.mx=touch.mz=0;touch.active=false;};pad.addEventListener('pointerup',up);pad.addEventListener('pointercancel',up);
  let lid=null,lx=0,ly=0;const look=$('tlook');look.addEventListener('pointerdown',e=>{lid=e.pointerId;lx=e.clientX;ly=e.clientY;look.setPointerCapture(lid);});
  look.addEventListener('pointermove',e=>{if(e.pointerId!==lid)return;mouse.dx+=(e.clientX-lx)*2.2;mouse.dy+=(e.clientY-ly)*2;lx=e.clientX;ly=e.clientY;});
  look.addEventListener('pointerup',()=>lid=null);
  const btn=(id,down,upf)=>{const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();down();});if(upf){b.addEventListener('pointerup',upf);b.addEventListener('pointercancel',upf);}};
  btn('tb-enter',()=>keys.KeyF=true,()=>keys.KeyF=false);btn('tb-fire',()=>{mouse.left=true;mouse.right=true;},()=>{mouse.left=false;mouse.right=false;});
  btn('tb-jump',()=>keys.Space=true,()=>keys.Space=false);btn('tb-weapon',()=>keys.KeyQ=true,()=>keys.KeyQ=false);btn('tb-map',()=>mode==='map'?closeMap():openMap());
  btn('tb-brake',()=>keys.KeyS=true,()=>keys.KeyS=false);}

// ===================== AUDIO =====================
const AUD={ctx:null,on:true};
function audioInit(){if(AUD.ctx)return;try{const C=window.AudioContext||window.webkitAudioContext;const ctx=AUD.ctx=new C();AUD.master=ctx.createGain();AUD.master.gain.value=AUD.on?0.55:0;AUD.master.connect(ctx.destination);
  const so=AUD.siren=ctx.createOscillator();so.type='triangle';so.frequency.value=440;const sg=AUD.sirenGain=ctx.createGain();sg.gain.value=0;const sf=ctx.createBiquadFilter();sf.type='bandpass';sf.frequency.value=700;sf.Q.value=0.7;so.connect(sf);sf.connect(sg);sg.connect(AUD.master);so.start();
  const nb=AUD.noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const rs=ctx.createBufferSource();rs.buffer=nb;rs.loop=true;const rf=ctx.createBiquadFilter();rf.type='highpass';rf.frequency.value=900;const rg=AUD.rainGain=ctx.createGain();rg.gain.value=0;rs.connect(rf);rf.connect(rg);rg.connect(AUD.master);rs.start();
  const fs=ctx.createBufferSource();fs.buffer=nb;fs.loop=true;const ff=ctx.createBiquadFilter();ff.type='bandpass';ff.frequency.value=500;const fg=AUD.fireGain=ctx.createGain();fg.gain.value=0;fs.connect(ff);ff.connect(fg);fg.connect(AUD.master);fs.start();}catch(e){AUD.ctx=null;}}
function noiseHit(vol,dur,freq){const ctx=AUD.ctx;if(!ctx||vol<0.01)return;const s=ctx.createBufferSource();s.buffer=AUD.noise;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=ctx.createGain();const t=ctx.currentTime;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(AUD.master);s.start(t,Math.random());s.stop(t+dur+0.05);}
function distVol(x,z,r=120){let best=0;for(const P of PLAYERS){const [px,pz]=ppos(P);best=Math.max(best,clamp(1-Math.hypot(x-px,z-pz)/r,0,1));}return best;}
function sfxShot(x,z,v=0.7,f=2600){noiseHit(v*distVol(x,z,160),0.16,f);}
function sfxCrash(x,z,imp){noiseHit(Math.min(0.9,imp/18)*distVol(x,z,90),0.35,700);}
function sfxBoom(x,z){noiseHit(1.0*distVol(x,z,300),1.4,320);}
function sfxThunder(){const ctx=AUD.ctx;if(!ctx)return;setTimeout(()=>noiseHit(0.9,3.2,160),300+Math.random()*1800);}
function chime(fs){const ctx=AUD.ctx;if(!ctx)return;let t=ctx.currentTime;for(const f of fs){const o=ctx.createOscillator();o.type='triangle';o.frequency.value=f;const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.25,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.35);o.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+0.4);t+=0.11;}}
function horn(){const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;for(const f of [392,494]){const o=ctx.createOscillator();o.type='square';o.frequency.value=f;const g=ctx.createGain();g.gain.setValueAtTime(0.06,t);g.gain.linearRampToValueAtTime(0.0001,t+0.45);o.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+0.5);}}
function updateAudio(){const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;
  updateEngines();
  let best=1e9;for(const c2 of CARS)if(c2.sirenOn){const [px,pz]=ppos();const d=Math.hypot(c2.x-px,c2.z-pz);if(d<best)best=d;}
  const sv=best<1e8?clamp(1-best/220,0,1)*0.16:0;AUD.sirenGain.gain.setTargetAtTime(sv,t,0.1);if(sv>0)AUD.siren.frequency.setValueAtTime(((simTime/0.62)|0)%2?587:440,t);
  AUD.rainGain.gain.setTargetAtTime(WEATHER.cur.rain*0.05,t,0.5);
  let fv=0;for(const f of FIRES){fv=Math.max(fv,distVol(f.x,f.z,40));}AUD.fireGain.gain.setTargetAtTime(fv*0.12,t,0.2);}
