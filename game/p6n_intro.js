// ===================== EINLEITUNG: DIE BÜRGERMEISTERIN (vor Release v32) =====================
// Beim ersten Spawn eines NEUEN Spiels (nicht „Weiterspielen“) kommt die fiktive Bürgermeisterin Rosi Spundekäs-Fleischworscht,
// eine Maus dreht sich auf ihrem Kopf, sie erklärt das Spiel in höchstens fünf Sätzen, trinkt dreimal aus einer (markenlosen)
// Wodkaflasche und stellt zwei Fragen – egal was man antwortet: „Is mir egal.“
// Haltungsregel: Trinken immer beidhändig, beide Arme schräg zur Körpermitte (siehe CLAUDE.md / p3c_haltung.js).
const INTRO_NAME='Rosi Spundekäs-Fleischworscht';
const INTRO={active:false,step:-1,done:false,drinks:0,answers:[],h:null,mouse:null,bottle:null,force:false,
  touch:()=>typeof TOUCHUI!=='undefined'&&TOUCHUI.mode==='touch'};
function introScript(){const t=INTRO.touch();return [
  {say:`Ei Gude! Ich bin ${INTRO_NAME}, die Bürgermeisterin vun Meenz – willkomme in Meenz City!`},
  {drink:1},
  {ask:'Bist du zum erschte Mal in Meenz?',opts:['Ja, ganz neu hier!','Nee, ich komm aus Wissbaade.']},
  {say:'Is mir egal.'},
  {say:t?'Mit dem linke Kreis läufst du überall hin, mit EIN/AUS knackst du Autos un betrittst Läde.':'Mit WASD läufst du überall hin, mit F knackst du Autos un betrittst Läde.'},
  {say:'Die gelbe Marker uff de Karte sin Missione – die bringe Geld un Ruhm.'},
  {drink:2},
  {ask:'Was is dir wischtischer: Weck, Worscht oder Woi?',opts:['Woi, natürlich!','Ich hätt gern en Smoothie.']},
  {say:'Is mir egal.'},
  {say:'Wenn die Polizei dir hinnerher is, hau ab – je mehr Rädscher leuchte, desto schlimmer.'},
  {say:t?'Halt SPRUNG gedrückt, dann fliegt dein Jetpack übers Dach.':'Halt die Leertaste, dann fliegt dein Jetpack übers Dach.'},
  {drink:3},
  {say:'So, jetzt mach, ich hab noch e Sitzung … hicks … Helau!'}];}

// ---------- Figur, Maus, Flasche ----------
function introMayor(x,z){let h=null;for(let i=0;i<14;i++){const c=new Human('ped');if(c.sex==='f'&&c.age!=='kid'&&c.age!=='teen'){h=c;break;}c.remove();}
  if(!h)h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.state='intro';h.mission=true;h.walkSpeed=0;h.npcName='Bürgermeisterin '+INTRO_NAME;
  if(typeof polDress==='function')polDress(h,0xb3122e,0xf4f4f4,0xffd23f,false);
  const chain=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.014,6,24),stdMat({color:0xe8c040,metalness:0.9,roughness:0.25}));chain.rotation.x=Math.PI/2.4;chain.position.set(0,0.62,0.04);h.hips.add(chain);
  const medal=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.012,16),stdMat({color:0xe8c040,metalness:0.9,roughness:0.25}));medal.rotation.x=Math.PI/2;medal.position.set(0,0.5,0.15);h.hips.add(medal);
  // Maus auf dem Kopf (Modell der Maus-Verwandlung, verkleinert), dreht sich die ganze Zeit
  const m=new THREE.Group();try{const a=animalModel('mouse');a.scale.setScalar(0.28);m.add(a);}catch(e){const b=new THREE.Mesh(new THREE.SphereGeometry(0.06,10,8),stdMat({color:0xb0b0b8}));m.add(b);}
  m.position.set(0,0.15,0);h.head.add(m);INTRO.mouse=m;
  // Flasche (ohne Etikett/Marke) in der rechten Hand
  const bt=new THREE.Group();const glass=new THREE.MeshStandardMaterial({color:0xdfe9ef,transparent:true,opacity:0.5,roughness:0.05});// ohne transmission: die zwingt three.js zu einem zweiten Durchgang über alle undurchsichtigen Objekte
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.2,12),glass);body.position.y=0.1;const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.03,0.09,10),glass);neck.position.y=0.245;
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.025,8),stdMat({color:0xc81c2e}));cap.position.y=0.3;bt.add(body,neck,cap);bt.rotation.x=Math.PI;bt.position.set(0,-0.6,0.04);h.armR.add(bt);INTRO.bottle=bt;
  h.sync();return h;}

// ---------- Dialog-Oberfläche (#talk) ----------
let introLine='',introShown=0,introT=0,introWait=0,introDrinkT=0;
function introUI(){const el=$('talk');el.hidden=false;el.innerHTML=`<div class="who">Bürgermeisterin ${INTRO_NAME}</div><div class="line" id="introline"></div><div class="opts" id="introopts"></div><div class="hint2" id="introhint"></div><button id="introskip" type="button">Überspringen ▸▸</button>`;
  el.onclick=e=>{if(e.target.closest('button'))return;introNext();};
  // Touch hat kein Esc: eigener Knopf, beendet die Einleitung wie Esc
  $('introskip').addEventListener('click',e=>{e.stopPropagation();introEnd();});}
function introSet(text){introLine=text;introShown=0;introT=0;$('introopts').innerHTML='';$('introhint').textContent=INTRO.touch()?'Tippen: weiter':'Leertaste / Klick: weiter · Esc: überspringen';if(INTRO.h)say(INTRO.h,text,Math.min(6,1.6+text.length*0.05));}
function introAsk(s){introSet(s.ask);const o=$('introopts');s.opts.forEach((txt,i)=>{const b=document.createElement('button');b.className='opt';b.innerHTML=`<kbd>${i+1}</kbd>${txt}`;b.onclick=()=>introAnswer(i);o.appendChild(b);});$('introhint').textContent='';}
function introAnswer(i){const s=introScript()[INTRO.step];if(!s||!s.ask)return;INTRO.answers.push(s.opts[i]);introNext(true);}
function introNext(force){if(!INTRO.active)return;const s=introScript()[INTRO.step];
  if(s&&s.say&&introShown<introLine.length&&!force){introShown=introLine.length;return;}// erst ganz anzeigen
  if(s&&s.ask&&!force)return;if(s&&s.drink&&introDrinkT>0&&!force)return;
  INTRO.step++;const n=introScript()[INTRO.step];if(!n){introEnd();return;}
  if(n.say)introSet(n.say);else if(n.ask)introAsk(n);else if(n.drink){introDrinkT=2.4;INTRO.drinks++;introGluck();}}
function introGluck(){const C=AUD&&AUD.ctx;if(!C||C.state!=='running')return;const t=C.currentTime;for(let i=0;i<3;i++){const o=C.createOscillator(),g=C.createGain();o.type='sine';o.frequency.setValueAtTime(320,t+0.7+i*0.38);o.frequency.exponentialRampToValueAtTime(140,t+0.88+i*0.38);
  g.gain.setValueAtTime(0.0001,t+0.7+i*0.38);g.gain.exponentialRampToValueAtTime(0.25,t+0.72+i*0.38);g.gain.exponentialRampToValueAtTime(0.0001,t+0.95+i*0.38);o.connect(g);g.connect(AUD.master||C.destination);o.start(t+0.7+i*0.38);o.stop(t+1+i*0.38);}}

// ---------- Ablauf ----------
function introStart(){if(INTRO.active||!P1||!P1.h)return;const P=P1,h=P.h;const fx=Math.sin(h.facing),fz=Math.cos(h.facing);let x=h.x+fx*2.4,z=h.z+fz*2.4;if(blocked(x,z))[x,z]=freeSpot(x,z,0.4);
  INTRO.h=introMayor(x,z);INTRO.h.facing=Math.atan2(h.x-x,h.z-z);INTRO.h.sync();h.facing=Math.atan2(x-h.x,z-h.z);
  INTRO.active=true;INTRO.step=-1;INTRO.drinks=0;INTRO.answers=[];introUI();introNext(true);}
function introEnd(){INTRO.active=false;INTRO.done=true;const el=$('talk');el.hidden=true;el.onclick=null;el.innerHTML='';
  const h=INTRO.h;if(h&&!h.removed){if(INTRO.bottle)INTRO.bottle.visible=true;h.mission=false;h.state='walk';const n=nearestNode(h.x,h.z,false);if(n>=0&&NODES[n].e.length)pedEnterEdge(h,NODES[n].e[0],n);else h.state='flee';h.walkSpeed=1.2;}
  hint(INTRO.touch()?'Viel Spaß in Meenz! <b>KARTE</b> zeigt dir Missionen.':'Viel Spaß in Meenz! <b>M</b> Karte · <b>K</b> alle Tasten',5);}
function introPose(h,dt){const t=simTime;h.animate(dt,0);
  if(introDrinkT>0){introDrinkT-=dt;const k=Math.min(1,(2.4-introDrinkT)*3,Math.max(0,introDrinkT)*3);// beidhändig zum Mund, Arme laufen zur Mitte zusammen
    h.armR.rotation.set(-1.45*k,0,0.95*k);h.armL.rotation.set(-1.45*k,0,-0.95*k);h.head.rotation.x=-0.6*k;h.hips.rotation.x=-0.12*k;
    if(INTRO.bottle){INTRO.bottle.rotation.x=Math.PI-1.9*k;}
    if(introDrinkT<=0){h.head.rotation.x=0;h.hips.rotation.x=0;if(INTRO.drinks===3)say(h,'Hicks!',1.5);introNext(true);}}
  else{const talk=introShown<introLine.length;h.armR.rotation.set(-0.35+Math.sin(t*3)*0.12,0,0.15);h.armL.rotation.set(-0.25,0,-0.2+Math.sin(t*2.4)*0.08);if(h.fx)h.fx.talk=talk?0.8:0;
    if(INTRO.bottle)INTRO.bottle.rotation.x=Math.PI;}
  h.y=groundY(h.x,h.z,h.y);h.sync();}
function updateIntro(dt){if(INTRO.mouse)INTRO.mouse.rotation.y+=dt*4.2;// Maus dreht sich auch nach der Einleitung weiter
  if(!INTRO.active)return;const h=INTRO.h;if(!h||h.removed||!h.alive){introEnd();return;}
  introPose(h,dt);
  if(introShown<introLine.length){introT+=dt;const n=Math.min(introLine.length,Math.floor(introT*38));if(n!==introShown){introShown=n;const e=$('introline');if(e)e.textContent=introLine.slice(0,n);}}
  const P=P1;if(P&&P.h){P.h.facing=Math.atan2(h.x-P.h.x,h.z-P.h.z);}}
// Neues Spiel → Einleitung (nicht beim Weiterspielen, nicht im Testmodus außer erzwungen)
const _introStartGame=startGame;
startGame=function(opts={}){_introStartGame(opts);if(opts&&opts.load!=null)return;if(INTRO.done&&!INTRO.force)return;if(window.__MANUAL&&!INTRO.force)return;
  setTimeout(()=>{if(mode==='play'&&!P1.car)introStart();},window.__MANUAL?0:3800);/* nach dem großen Titel */};
// während der Einleitung: keine Bewegung/Schüsse, Kamera auf die Bürgermeisterin
const _introReadInput=readInput;
readInput=function(P){const I=_introReadInput(P);if(INTRO.active&&P===P1){I.mx=I.mz=0;I.fire=I.aim=I.jump=I.enter=I.weapon=I.weaponPrev=I.sprint=false;I.throttle=I.brake=I.steer=0;}return I;};
const _introCam=updateCamera;
updateCamera=function(P,dt){if(INTRO.active&&P===P1&&INTRO.h){const h=P.h,n=INTRO.h;const mx=(h.x+n.x)/2,mz=(h.z+n.z)/2;const dx=n.x-h.x,dz=n.z-h.z,L=Math.hypot(dx,dz)||1;
    const sx=-dz/L,sz=dx/L;P.camera.position.set(mx+sx*3.2-dx/L*0.6,h.y+1.75,mz+sz*3.2-dz/L*0.6);P.camera.lookAt(n.x*0.65+h.x*0.35,n.y+1.55,n.z*0.65+h.z*0.35);return;}
  _introCam(P,dt);};
addEventListener('keydown',e=>{if(!INTRO.active)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();introEnd();return;}
  const s=introScript()[INTRO.step];if(s&&s.ask&&(e.code==='Digit1'||e.code==='Digit2'||e.code==='Numpad1'||e.code==='Numpad2')){introAnswer(e.code.endsWith('1')?0:1);e.stopImmediatePropagation();return;}
  if(e.code==='Space'||e.code==='Enter'||e.code==='KeyE'){e.preventDefault();e.stopImmediatePropagation();introNext();}},true);
INTRO.start=introStart;INTRO.next=introNext;INTRO.answer=introAnswer;INTRO.end=introEnd;INTRO.script=introScript;

// Schutz während der Einleitung (+ kurze Schonfrist danach): der Spieler ist gesperrt und kann sich nicht wehren.
const INTRO_GRACE=4;
function introProtected(P){return !!(P&&P===P1&&(INTRO.active||(INTRO.done&&simTime<(INTRO.endT||0)+INTRO_GRACE)));}
{const _end=introEnd;introEnd=function(){INTRO.endT=simTime;return _end.apply(this,arguments);};}
const _introDamage=damagePlayer;
damagePlayer=function(P,d){if(introProtected(P))return;return _introDamage(P,d);};
const _introKnock=knockHuman;
knockHuman=function(h,vx,vz,vy,dmg,byPlayer){if(P1&&h===P1.h&&introProtected(P1))return;return _introKnock(h,vx,vz,vy,dmg,byPlayer);};
const _introNearbyPed=nearbyPed;
nearbyPed=function(P,rmin,rmax){return introProtected(P)?null:_introNearbyPed(P,rmin,rmax);};
const _introActivePed=updateActivePed;
updateActivePed=function(o,dt){if(introProtected(nearestPlayer(o.x,o.z))){o.state='walk';pedFlee(o,o.x,o.z,1);o.setExpr('neutral');return;}_introActivePed(o,dt);};
