// ===================== MENÜ-KAMERA =====================
let menuA=0;
function menuCamera(dt){menuA+=dt*0.035;const cx=40,cz=-250;camera.position.set(cx+Math.sin(menuA)*460,190,cz+Math.cos(menuA)*460);camera.lookAt(cx,10,cz);clouds.position.copy(camera.position);stars.position.copy(camera.position);}

// ===================== HAUPTSCHLEIFE =====================
const headLights=[0,1].map(()=>{const l=new THREE.SpotLight(0xfff2d6,0,90,0.55,0.5,1);scene.add(l);scene.add(l.target);return l;});
function lackiererei(P){if(!P.car||wanted===0||activeMission&&activeMission.id==='blau')return;if(Math.hypot(P.car.x-POI.lack[0],P.car.z-POI.lack[1])>8)return;
  const cost=Math.min(G.money,250);G.money-=cost;clearWanted();P.car.bodyMat.color.setHex(mpick(CAR_COLORS));P.car.plateText=plateText('WI');if(P.car.plateTex&&P.car.updatePlate)P.car.updatePlate();showBig('NEU LACKIERT','win',3,`Fahndung aufgehoben · €${cost}`);chime([523,784]);}
function update(dt){simTime+=dt;updateSky(dt);
  for(const P of PLAYERS){updateGameOver(P,dt);updatePlayer(P,dt);}
  fbBegin(dt);updateStream(dt);updateHgCold(dt);updateBldSlim(dt);
  if(flashT>0){flashT-=dt;if(flashT<=0){flashLight.intensity=0;flashLight.distance=12;}}
  for(const c of CARS){if(c.ctrl==='player'){const P=PLAYERS.find(Q=>Q.car===c);if(!P||P.gameOver){c.inp.throttle=0;c.inp.brake=1;c.inp.steer=0;}}
    else if(c.ai.mode==='traffic')aiTraffic(c,dt);else if(c.ai.mode==='police')aiPolice(c,dt);else{c.inp.throttle=0;c.inp.brake=c.T.boat?0:1;c.inp.steer=0;c.inp.hand=false;}}
  for(const c of CARS){if(c.ctrl==='none'&&Math.abs(c.vx)+Math.abs(c.vz)<0.02&&!c.burn&&!c.T.boat){c.vx=c.vz=0;c.speed=0;continue;}c.physics(dt);}
  resolveCars();carHumanContacts();
  for(const c of CARS)c.sync(dt);
  for(let i=HUMANS.length-1;i>=0;i--){const h=HUMANS[i];if(h.inCar||h.removed||playerOfHuman(h))continue;
    if(h.keeper){if(h.state!=='keeper')updatePed(h,dt);continue;}
    if(h.state==='wait'){h.animate(dt,0);h.sync();continue;}
    if(h.state==='talk'||h.state==='markt'||h.state==='roof'||h.state==='board'||h.state==='venue')continue;
    if(h.state==='shout'||h.state==='approach'||h.state==='brawl'){updateActivePed(h,dt);continue;}
    if(h.kind==='cop')updateCop(h,dt);else if(h.kind==='gang')updateGang(h,dt);else updatePed(h,dt);}
  updateProjectiles(dt);updateFires(dt);updatePolice(dt);updateMissions(dt);updatePickups(dt);updateShops(dt);updateParts(dt);updateTracers(dt);updateShips(dt);managePopulation(dt);updateZone(dt);
  for(const P of PLAYERS){lackiererei(P);shoeEffects(P,dt);}updateTalk(dt);updateAmbient(dt);updateMarkt(dt);updateDogs(dt);updateDrunk(dt);updateUI();updateRoofs(dt);updateTrip(dt);updateBuses(dt);updateHbf(dt);updateRhein(dt);humanShadowLOD();perfGovernor(dt);updatePoliticians(dt);updatePowerups(dt);updateEgg(dt);updateFlug(dt);updateRockets(dt);updateBurning(dt);updateUfo(dt);updateKart(dt);updateRad(dt);updateLeih(dt);updateRadio(dt);updateStunt(dt);updateGautsch(dt);updateHubi(dt);updateWiWahr(dt);updateJobs(dt);updateStraba(dt);updateRosenmo(dt);updateNero(dt);updateRevier(dt);updateCoup(dt);updateAltst(dt);updateNeust(dt);updateOberst(dt);updateLazy();updateAutos();updateBretz(dt);updateGons(dt);updateMomb(dt);updateWeis(dt);updateAkk(dt);updateWiesi(dt);updateEich(dt);updateSprung(dt);updateOma(dt);updateAndreas(dt);updateNessie(dt);updateJga(dt);updateSpielbank(dt);updateSbahn(dt);updateWaffenwelt(dt);updateIntro(dt);
  talkHintT-=dt;if(talkHintT<=0){talkHintT=0.6;if(!TALK&&!P1.car&&P1.h&&(!P1.h.room||P1.h.room.venue)&&!SHOP_UI.open){const c=talkCandidate(P1);if(c&&!shopNear(P1.h.x,P1.h.z,1.9))hint('<b>E</b>: ansprechen',0.8);}}
  for(const P of PLAYERS)updateCamera(P,dt);
  {const pts=PLAYERS.filter(P=>P.h).map(P=>P.h.room?[P.h.room.shop.doorX,P.h.room.shop.doorZ]:[P.camera.position.x,P.camera.position.z]);updateCityLOD(0,0,1,false,pts);if(pts[0])updateStaticLOD(pts[0][0],pts[0][1]);updateGround(0,0,false,1,pts);}
  updateRuck(dt);fbPump();
  clouds.position.copy(camera.position);stars.position.copy(camera.position);
  updateAudio();skidV*=0.9;
  // Sichtbarkeit nach Entfernung zur nächsten Kamera
  const cams=PLAYERS.map(P=>P.camera.position);
  for(const h of HUMANS){if(h.inCar)continue;if(playerOfHuman(h)){const PP=playerOfHuman(h);h.g.visible=!(PP&&PP.morph);continue;}if(h.keeper){h.g.visible=!!(INDOOR&&INDOOR.keeper===h);continue;}let v=false,fv=false;for(const c of cams){const dx=Math.abs(h.x-c.x),dz=Math.abs(h.z-c.z);if(dx<160&&dz<160)v=true;if(dx<28&&dz<28)fv=true;}h.g.visible=v&&(!INDOOR||h.room===INDOOR);if(h.face)h.face.visible=fv;}
  for(const c of CARS){let v=false;for(const cp of cams)if(Math.abs(c.x-cp.x)<380&&Math.abs(c.z-cp.z)<380){v=true;break;}c.g.visible=v&&!INDOOR;}
  PLAYERS.forEach((P,i)=>{const L=headLights[i];if(P.car&&nightF>0.25&&!P.car.T.boat&&!P.car.T.pedal){const c=P.car;const fx=Math.sin(c.h),fz=Math.cos(c.h);L.position.set(c.x+fx*c.T.L*0.5,c.y+0.8,c.z+fz*c.T.L*0.5);L.target.position.set(c.x+fx*30,c.y,c.z+fz*30);L.intensity=60*nightF;}else L.intensity=0;});
  autoSaveT-=dt;if(autoSaveT<=0){autoSaveT=120;if(!activeMission&&wanted===0&&PLAYERS.every(P=>!P.gameOver))autoSave();}}
let lastT=performance.now();let talkHintT=0;
function resizeAll(){const W=innerWidth,H=innerHeight;renderer.setSize(W,H);if(composer)composer.setSize(W,H);if(G.split){for(const P of PLAYERS){P.camera.aspect=(W/2)/H;P.camera.updateProjectionMatrix();}}else{camera.aspect=W/H;camera.updateProjectionMatrix();}}
addEventListener('resize',()=>setTimeout(resizeAll,50));
function renderSplit(){const W=innerWidth,H=innerHeight;renderer.setScissorTest(true);
  PLAYERS.forEach((P,i)=>{renderer.setViewport(i*W/2,0,W/2,H);renderer.setScissor(i*W/2,0,W/2,H);if(P.camera.aspect!==(W/2)/H){P.camera.aspect=(W/2)/H;P.camera.updateProjectionMatrix();}clouds.position.copy(P.camera.position);renderer.render(scene,P.camera);});
  renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);}
let miniT=0;
function frame(now){requestAnimationFrame(frame);const rdt=Math.min(0.05,(now-lastT)/1000);lastT=now;
  try{
    if(mode==='play'&&!window.__MANUAL){update(rdt*timeScale);updateHUD(rdt);miniT-=rdt;if(miniT<=0){miniT=1/30;drawMinimap(P1,$('mini'));if(P2)drawMinimap(P2,$('mini2'));}}
    else if(mode==='menu'&&!window.__MANUAL){updateSky(rdt*0.4);updateShips(rdt);menuCamera(rdt);}
    if(mode!=='loading'&&!window.__NORENDER){if(G.split&&mode!=='menu')renderSplit();else renderFrame();}
  }catch(e){showErr(e);}}
function showErr(e){console.error(e);if(window.__splashHide)window.__splashHide();const b=$('errbox');if(b&&!b.dataset.n){b.hidden=false;b.textContent=(e&&e.stack||String(e)).slice(0,1200);b.dataset.n=1;}}

// ===================== SPIELSTÄNDE =====================
let autoSaveT=120;
const SAVE_KEY='meenz-save-';
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}
function snapshot(){const P=P1;const [x,z]=P.h.room?[P.h.room.shop.doorX,P.h.room.shop.doorZ]:ppos(P);
  return {v:2,t:Date.now(),money:G.money,stats:G.stats,done:G.done,mapSchoppen:!!G.mapSchoppen,phone:!!G.phone,superShoes:!!G.superShoes,fahrradSchein:!!G.fahrradSchein,schoppen:SCHOPPEN.map(s=>s.got?1:0),gameMin,weather:WEATHER.kind,
    p:{x,z,yaw:P.cam.yaw,health:P.h.health,armor:P.armor,owned:P.owned,ammo:P.ammo,mag:P.mag,weapon:P.weapon},zone:zoneAt(x,z)};}
function saveGame(slot,quick=false){if(mode!=='play'&&mode!=='pause')return false;if(P1.gameOver){hint('Jetzt nicht speichern.',2);return false;}const ok=lsSet(SAVE_KEY+slot,JSON.stringify(snapshot()));
  const msg=ok?`Gespeichert in ${slot===0?'Autosave':'Slot '+slot}.`:'Speichern nicht möglich – der Browser blockiert den Speicher.';if(quick||mode==='play')hint(msg,2.5);$('savemsg').textContent=msg;renderSlots();return ok;}
function autoSave(){if(mode==='play'&&!P1.gameOver)lsSet(SAVE_KEY+0,JSON.stringify(snapshot()));}
function escHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function readSave(slot){const s=lsGet(SAVE_KEY+slot);if(!s)return null;try{const d=JSON.parse(s);if(!d||typeof d!=='object'||(d.money!==undefined&&!Number.isFinite(d.money))||(d.t!==undefined&&!Number.isFinite(d.t))||(d.zone!==undefined&&typeof d.zone!=='string'))return null;return d;}catch(e){return null;}}
function latestSave(){let best=null,bs=-1;for(const k of [0,1,2,3]){const d=readSave(k);if(d&&d.t>(best?best.t:0)){best=d;bs=k;}}return bs;}
function applySave(d){if(!d)return false;
  if(activeMission)endMission('fail');clearWanted();
  G.money=d.money??G.money;Object.assign(G.stats,d.stats||{});G.done=Object.assign({},d.done||{});G.mapSchoppen=!!d.mapSchoppen;G.phone=!!d.phone;G.superShoes=!!d.superShoes;G.fahrradSchein=!!d.fahrradSchein;
  (d.schoppen||[]).forEach((v,i)=>{const s=SCHOPPEN[i];if(!s)return;if(v){s.got=true;s.g.visible=false;}else{s.got=false;s.g.visible=true;}});
  gameMin=d.gameMin??gameMin;envDirty=true;setWeather(d.weather||'klar');
  const P=P1,p=d.p||{};P.owned=Object.assign({fist:true},p.owned||{});P.ammo=Object.assign({},p.ammo||{});P.mag=Object.assign({},p.mag||{});P.armor=p.armor||0;
  respawnPlayer(P,p.x??POI.start[0],p.z??POI.start[1],p.yaw??0);P.h.health=clamp(p.health??100,10,100);selectWeapon(P,P.owned[p.weapon]?p.weapon:'fist');
  for(let i=CARS.length-1;i>=0;i--){const c=CARS[i];if(c.T.police&&!c.mission)c.remove();}managePopulation(0,true);return true;}
function loadGame(slot){const d=readSave(slot);if(!d){$('savemsg').textContent='Kein Spielstand vorhanden.';return;}applySave(d);$('savemsg').textContent='Geladen.';hint(`Spielstand geladen: ${escHtml(d.zone||'')}`,3);if(mode==='pause')resumeGame();}
function fmtDate(t){const d=new Date(t);return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});}
function renderSlots(){const box=$('slots');if(!box)return;box.innerHTML='';
  for(const k of [0,1,2,3]){const d=readSave(k);const el=document.createElement('div');el.className='slot';
    const nDone=d?Object.keys(d.done||{}).length:0;
    el.innerHTML=`<div class="t">${k===0?'Autosave':'Slot '+k}</div><div class="d">${d?`${fmtDate(d.t)} · ${escHtml(d.zone||'Mainz')}<br>€${escHtml(d.money)} · ${nDone}/${MISSIONS.length} Missionen`:'leer'}</div><div class="b">${k?'<button class="save">Speichern</button>':''}<button class="load"${d?'':' disabled'}>Laden</button></div>`;
    if(k)el.querySelector('.save').addEventListener('click',()=>saveGame(k));el.querySelector('.load').addEventListener('click',()=>loadGame(k));box.appendChild(el);}}

// ===================== MENÜS =====================
function lockPointer(){if(!IS_TOUCH&&cvs.requestPointerLock){try{const r=cvs.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(_){}}}
function startGame(opts={}){audioInit();if(AUD.ctx&&AUD.ctx.state==='suspended')AUD.ctx.resume();$('start').hidden=true;$('hud').hidden=false;mode='play';P1.cam.init=false;lastT=performance.now();
  if(opts.split&&!P2)enableSplit();resizeAll();lockPointer();
  if(opts.load!=null){const d=readSave(opts.load);if(d)applySave(d);}
  if(!startGame.done){startGame.done=true;showBig('MEENZ CITY','title',3.5,G.split?'Zwei Spieler · Willkommen in Mainz':'Willkommen in Mainz');setTimeout(()=>hint(document.documentElement.classList.contains('touchmode')?'<b>Linker Kreis</b> laufen · rechts <b>wischen</b> umsehen · <b>EIN/AUS</b> Auto knacken oder Laden betreten · <b>KARTE</b> · Gelbe Marker = Missionen':'<b>WASD</b> laufen · <b>Maus</b> umsehen · <b>F</b> Auto knacken oder Laden betreten · <b>M</b> Karte · Gelbe Marker = Missionen',9),3500);}}
function enableSplit(){G.split=true;P2=makePlayer(1);PLAYERS.push(P2);const h=P2.h=new Human('player');restyle(h);attachJetpack(P2);const tor=h.hips.children[0];if(tor&&tor.material)tor.material=stdMat({color:0x2f5fb0,roughness:0.85});for(const a of [h.armL,h.armR]){const c=a.children[0];if(c)c.material=tor.material;}
  const [x,z]=freeSpot(P1.h.x+2.5,P1.h.z,0.5);h.x=x;h.z=z;h.y=groundY(x,z);h.facing=P1.h.facing;h.sync();P2.cam.yaw=P1.cam.yaw;updateWeaponModel(P2);
  document.body.classList.add('split');$('hud2').hidden=false;}
function pauseGame(){if(mode!=='play')return;mode='pause';closeShopMenu();$('pause').hidden=false;$('savemsg').textContent='';renderSlots();if(document.pointerLockElement)document.exitPointerLock();}
function resumeGame(){$('pause').hidden=true;mode='play';lastT=performance.now();lockPointer();}
function openMap(){if(mode!=='play')return;mode='map';closeShopMenu();$('map').hidden=false;if(document.pointerLockElement)document.exitPointerLock();MAPV.open=false;drawBigMap();ftPanel();ftHooks();}
function closeMap(){$('map').hidden=true;mode='play';lastT=performance.now();}
$('btn-play').addEventListener('click',()=>startGame());
$('btn-split').addEventListener('click',()=>startGame({split:true}));
$('btn-continue').addEventListener('click',()=>{const k=latestSave();startGame({load:k>=0?k:null});});
$('btn-resume').addEventListener('click',resumeGame);
$('btn-quit').addEventListener('click',()=>{autoSave();location.reload();});
$('btn-map-close').addEventListener('click',closeMap);
$('btn-pause-map').addEventListener('click',()=>{$('pause').hidden=true;mode='play';openMap();});
for(const id of ['btn-sound','btn-sound2'])$(id).addEventListener('click',()=>{AUD.on=!AUD.on;if(AUD.master)AUD.master.gain.value=AUD.on?0.55:0;document.querySelectorAll('.snd').forEach(b=>b.textContent=AUD.on?'Ton: an':'Ton: aus');});
$('btn-hud-pause').addEventListener('click',pauseGame);
document.querySelectorAll('.wx').forEach(b=>b.addEventListener('click',()=>{const ks=Object.keys(WEATHER_TYPES);setWeather(ks[(ks.indexOf(WEATHER.kind)+1)%ks.length]);}));
const QNAMES={ultra:'Ultra',hoch:'Hoch',mittel:'Mittel',niedrig:'Niedrig'};
document.querySelectorAll('.qual').forEach(b=>{b.textContent='Grafik: '+QNAMES[QUALITY];b.addEventListener('click',()=>{const ks=IS_MOBILE?['mittel','niedrig']:['ultra','hoch','mittel','niedrig'];const n=ks[(ks.indexOf(QUALITY)+1)%ks.length];try{localStorage.setItem('meenz-quality',n);}catch(e){}
  document.querySelectorAll('.qual').forEach(x=>x.textContent='Grafik: '+QNAMES[n]+' (lädt neu …)');setTimeout(()=>location.reload(),400);});});

// ===================== START =====================
async function boot(){
  const bar=$('loadbar'),lt=$('loadtxt');
  try{
    await generateWorld((f,t)=>{bar.style.width=Math.round(f*100)+'%';lt.textContent=t+' …';});setupStream();
    lt.textContent='Missionen …';await nextFrame();
    buildRoadSegHash();setupLackiererei();defineMissions();setupPickups();buildHeli();setupVehicles();setupJetskis();setupRad();setupLeih();setupWiWahr();setupRadio();setupStunt();setupGautsch();setupHubi();setupJobs();setupStraba();setupRosenmo();setupNero();setupRevier();setupCoup();setupAltst();setupNeust();setupOberst();setupBretz();setupGons();setupMomb();setupWeis();setupAkk();setupWiesi();setupEich();setupSprung();setupOma();setupAndreas();setupNessie();setupJga();setupSpielbank();setupSbahn();setupTheat();setupTouchUI();extraMissions();setupNewWeapons();setupWaffenwelt();
    P1.h=new Human('player');attachJetpack(P1);const [sx,sz]=freeSpot(POI.start[0],POI.start[1],0.5);P1.h.x=sx;P1.h.z=sz;P1.h.facing=Math.PI/2;P1.h.sync();P1.cam.yaw=Math.PI/2;
    {const r=roadSpot(POI.start[0]+10,POI.start[1]);const c=new Car('sport',r[0],r[1],r[2]||0,{ctrl:'none',color:0xc8102e,plate:'MZ-MZ 1105'});if(c.collides()){const [x,z]=freeSpot(r[0],r[1],1.6);c.x=x;c.z=z;}c.ai={mode:'parked'};}
    managePopulation(0,true);setupBldSlim();setupHgCold();
    await setupPost();updateSky(0);updateEnv(true);setupRuck();bar.style.width='100%';
    lt.textContent=`${BUILDINGS.length.toLocaleString('de-DE')} Gebäude · ${ROADS.length.toLocaleString('de-DE')} Straßen · ${SHOPS.length.toLocaleString('de-DE')} Geschäfte · ${TREES.length.toLocaleString('de-DE')} Bäume · bereit`;
    $('btn-play').disabled=false;$('btn-play').textContent='Neues Spiel';$('btn-split').disabled=false;if(latestSave()>=0)$('btn-continue').hidden=false;mode='menu';setupTouch();if(window.__splashReady)window.__splashReady();
    window.__MEENZ={get QUALITY(){return QUALITY},IS_MOBILE,IS_PHONE,QS,OSM_SANITIZED,HALTUNG,TOUCHUI,INTRO,updateHUD:(dt)=>updateHUD(dt),drawMinimaps:()=>{drawMinimap(P1,$('mini'));if(P2)drawMinimap(P2,$('mini2'));},Car,RAD,LEIH,radSpawnCop,RADIO,STUNT,GAUTSCH,HUBI,WIWAHR,JOBS,STRABA,ROSENMO,NERO,REVIER,COUP,ALTST,NEUST,OBERST,LAZY,AUTOS,knockHuman,FOOT,touch,readInput:(P)=>readInput(P),THEAT,ANDREAS,FP,fpTouchMap,BRETZ,GONS,MOMB,WEIS,AKK,WIESI,STREAM,FRAMEB,HGC,BLDS,RUCK,EICH,SPRUNG,OMA,NESSIE,JGA,SPIELBANK,SBAHN,WWELT,kartRoute,swimBlocked,get activeMission(){return activeMission},FLUG,UFO,KART,kartOffer,ufoStart,enterCar,exitCar,swimHere,CHEAT,WEAPONS,ROCKETS,playerFire:(P,I)=>playerFire(P,I),flugP,mfG,idx,MAT,GROUND,CITY,SIGN_ATLASES:()=>SIGN_ATLASES,EGG,AREAS,ROADSx:ROADS,mkHuman:(k)=>new Human(k||"ped"),snap:(n=3,hide)=>{for(let i=0;i<n;i++)update(0.016);updateHUD(0.016);if(hide)P1.h.g.visible=false;renderFrame();return renderer.domElement.toDataURL('image/jpeg',0.88);},PU,puActivate,FT,fastTravel,ftDestinations,POL,spawnPolitician,ELEV,groundYFn:(x,z,y)=>groundY(x,z,y),blockedFn:(x,z,y)=>blocked(x,z,y),RHEIN,HBF,hbfToPlatform,stepAt,exitShop,VENUES,enterVenue,exitVenue,venueNear,Car,BUS_STOPS,TRIP,get mushT(){return mushT},set mushT(v){mushT=v},ROOF,ENGINES,MAPV,DOGS,BRIDGES,MARKT,BREZEL,marktPuke,startTalk,chooseTalk,get TALK(){return TALK;},setWeather,WEATHER,get gameMin(){return gameMin;},set gameMin(v){gameMin=v;envDirty=true;},BUILDINGS,ROADS,NODES,EDGES,CARS,HUMANS,P1,PLAYERS,TREES,LAMPS,SHOPS,OVERVIEW,HG,keys,update,startGame,tryEnterExit,get wanted(){return wanted;},setWanted,get mode(){return mode;},MISSIONS,startMission,get activeMission(){return activeMission;},crime,ppos,gridH,blocked,spawnPolice,damagePlayer,busted,enterShop,exitShop,shopNear,saveGame,loadGame,applySave,snapshot,G,POI,giveWeapon,makeRoom,enableSplit,INDOOR:()=>INDOOR};
  }catch(err){showErr(err);lt.textContent='Fehler beim Laden: '+err.message;}
}
function setupLackiererei(){const cand=SHOPS.filter(s=>/car_repair|car|motorcycle/.test(s.kind)&&rhineSide(s.x,s.z)>0);let best=null,bd=1e9;for(const s of cand){const d=Math.hypot(s.x-700,s.z+760);if(d<bd){bd=d;best=s;}}
  const p=best?[best.doorX+best.nx*3,best.doorZ+best.nz*3]:roadSpot(700,-760);const r=roadSpot(p[0],p[1]);POI.lack=[lerp(p[0],r[0],0.5),lerp(p[1],r[1],0.5)];if(blocked(POI.lack[0],POI.lack[1]))POI.lack=[r[0],r[1]];
  label('Lackiererei'+(best?' ('+best.name+')':''),POI.lack[0],POI.lack[1],'service');}
requestAnimationFrame(frame);
boot();
