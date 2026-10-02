// ===================== MOBIL-UX (Handy-Audit): Touch-Texte, Karte, Laden, Ton, Zielhilfe, Sichtweite „niedrig“ =====================
// Layout/Stapelung steckt im CSS von shell.html; hier nur das Verhalten. Gemeinsame Dateien bleiben unberührt:
// RINFO wird an __MEENZ gehängt, sobald p4e_main das Objekt setzt (Setter auf window).
const MUX={touch:()=>typeof TOUCHUI!=='undefined'&&TOUCHUI.mode==='touch',
  audio:{hooked:false,resumes:0},aim:{snaps:0,last:null,CONE:12*Math.PI/180,R:40},
  cull:{on:!!QS.lowLOD,list:[],t:0,hidden:0,R:{bld:600,stat:450,tree:320,ped:80,car:160}},pinch:{pts:new Map(),d0:0,zooms:0}};

// ---------- Touch-Texte: Tastennamen in Hinweisen durch die Knopf-Beschriftung ersetzen ----------
const MUX_KEYS={F:'EIN/AUS',E:'AKTION',Leertaste:'SPRUNG','Leertaste halten':'SPRUNG halten',M:'KARTE',P:'II',G:'PROST',U:'SCHUHE',H:'HUPE',N:'RADIO',J:'JOB',Q:'WAFFE',R:'WAFFE'};
function muxTouchText(t){return typeof t!=='string'?t:t.replace(/<b>([^<]{1,16})<\/b>/g,(m,k)=>MUX_KEYS[k]?`<b>${MUX_KEYS[k]}</b>`:m).replace(/\bdrück(e)? F\b/g,'drück EIN/AUS');}
const _muxHint=hint;
hint=function(text,dur,P){return _muxHint(MUX.touch()?muxTouchText(text):text,dur,P);};
const _muxRenderTalk=renderTalk;
renderTalk=function(){_muxRenderTalk();if(!MUX.touch())return;const e=document.querySelector('#talk .hint2');if(e&&e.textContent==='E: weiter')e.textContent='Tippen: weiter';};
const _muxFtRender=ftRenderPanel;
ftRenderPanel=function(){_muxFtRender();if(!MUX.touch()||!FT.panel)return;for(const s of FT.panel.querySelectorAll('span'))if(s.textContent==='Ort wählen oder Marker anklicken')s.textContent='Ort oder Marker antippen';};

// ---------- Gespräch: Antippen des Kastens = weiter (wie E), Antwortknöpfe bleiben eigene Ziele ----------
$('talk').addEventListener('click',e=>{if(!TALK||INTRO.active||e.target.closest('button'))return;window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true}));});

// ---------- Geschäft: sichtbarer Schließen-Knopf (Touch hat kein F, EIN/AUS liegt evtl. darunter) ----------
$('shopclose').addEventListener('click',()=>closeShopMenu());

// ---------- Umsehen: abgebrochene Gesten (Anruf, Systemgeste) wie Loslassen behandeln ----------
$('tlook').addEventListener('pointercancel',e=>{$('tlook').dispatchEvent(new PointerEvent('pointerup',{pointerId:e.pointerId,bubbles:true}));});

// ---------- Startbildschirm: Grafik-Hinweis passend zur echten Stufe ----------
{const N={ultra:'Ultra',hoch:'Hoch',mittel:'Mittel',niedrig:'Niedrig'};const el=$('qualnote');
  if(el&&IS_MOBILE)el.textContent=`Grafik-Stufe „${N[QUALITY]||QUALITY}“ – fürs Handy eingestellt, schont Akku un Speicher. „Mittel“ sieht schöner aus, kann aber ruckeln oder abstürzen.`;}

// ---------- Grafik-Knopf: vor dem Neuladen automatisch speichern (Start- und Pausemenü) ----------
// Läuft in der Capture-Phase, also vor dem Klick-Handler in p4e_main, der nach 400 ms neu lädt.
document.addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('.qual'))return;
  if((mode==='play'||mode==='pause')&&P1&&P1.h&&!P1.gameOver){try{lsSet(SAVE_KEY+0,JSON.stringify(snapshot()));MUX.qualSaved=(MUX.qualSaved||0)+1;}catch(_){}
    const m=$('savemsg');if(m)m.textContent='Automatisch gespeichert – nach dem Neuladen „Weiterspielen“.';}},true);

// ---------- Ton: iOS hält den AudioContext nach App-Wechsel/Sperre an → beim Zurückkehren bzw. nächsten Tippen fortsetzen ----------
function muxAudioResume(){const C=AUD&&AUD.ctx;if(!C||C.state==='running'||C.state==='closed')return false;MUX.audio.resumes++;try{const r=C.resume();if(r&&r.catch)r.catch(()=>{});}catch(_){}return true;}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)muxAudioResume();});
addEventListener('pointerdown',muxAudioResume,{capture:true,passive:true});
MUX.audio.hooked=true;MUX.audio.resume=muxAudioResume;

// ---------- Karte: ein Finger schiebt (p4d), zwei Finger zoomen um den Mittelpunkt ----------
function muxPinchDist(){const p=[...MUX.pinch.pts.values()];return p.length<2?0:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}
function muxPinchMid(c){const p=[...MUX.pinch.pts.values()];const r=c.getBoundingClientRect();return [(p[0][0]+p[1][0])/2-r.left,(p[0][1]+p[1][1])/2-r.top];}
{const c=$('mapc');const PP=MUX.pinch;
  c.addEventListener('pointerdown',e=>{PP.pts.set(e.pointerId,[e.clientX,e.clientY]);if(PP.pts.size<2)return;
    // zweiter Finger: kein Verschieben/kein Antippen-Auswählen mehr, nur Zoom
    e.stopImmediatePropagation();MAPV.drag=null;FT.down=null;try{c.setPointerCapture(e.pointerId);}catch(_){}PP.d0=muxPinchDist();PP.mid=muxPinchMid(c);},true);
  c.addEventListener('pointermove',e=>{if(!PP.pts.has(e.pointerId))return;PP.pts.set(e.pointerId,[e.clientX,e.clientY]);if(PP.pts.size<2)return;e.stopImmediatePropagation();
    const d=muxPinchDist(),m=muxPinchMid(c);if(PP.d0>10&&d>10){MAPV.cx-=(m[0]-PP.mid[0])/MAPV.s;MAPV.cz-=(m[1]-PP.mid[1])/MAPV.s;mapZoom(d/PP.d0,m[0],m[1]);PP.zooms++;}PP.d0=d;PP.mid=m;},true);
  const up=e=>{if(!PP.pts.has(e.pointerId))return;const was=PP.pts.size;PP.pts.delete(e.pointerId);
    if(was>=2){e.stopImmediatePropagation();FT.down=null;const rest=[...PP.pts.values()][0];MAPV.drag=rest?[rest[0],rest[1],MAPV.cx,MAPV.cz]:null;}};
  c.addEventListener('pointerup',up,true);c.addEventListener('pointercancel',up,true);
  // Schnellreise-Liste ein-/ausklappen (nur Touch sichtbar)
  const b=document.createElement('button');b.id='muxftbtn';b.className='btn ghost';b.type='button';b.textContent='Orte';
  b.addEventListener('click',()=>{$('map').classList.toggle('muxzu');b.textContent=$('map').classList.contains('muxzu')?'Orte zeigen':'Orte';});
  $('btn-map-close').before(b);}

// ---------- Zielhilfe (nur Touch): FEUER richtet auf das nächste feindliche Ziel im ±12°-Kegel bis 40 m aus ----------
function muxAimTarget(P){const h=P.h;if(!h)return null;const yaw=P.cam.yaw;let best=null,bs=1e9;
  for(const o of HUMANS){if(o===h||!o.alive||o.inCar||o.removed||o.state==='dead'||playerOfHuman(o))continue;
    if(!(o.hostile||o.kind==='gang'||(o.kind==='cop'&&wanted>0)))continue;
    const dx=o.x-h.x,dz=o.z-h.z,d=Math.hypot(dx,dz);if(d>MUX.aim.R||d<0.5)continue;
    const a=Math.abs(angDiff(yaw,Math.atan2(dx,dz)));if(a>MUX.aim.CONE)continue;const sc=a*20+d;if(sc<bs){bs=sc;best=o;}}
  return best;}
const _muxFire=playerFire;
playerFire=function(P,I){if(P===P1&&MUX.touch()&&!P.car&&P.h&&!(P.fireT>0)){const W=WEAPONS[P.weapon];
    if(W&&!W.melee&&!W.thrown){const o=muxAimTarget(P);if(o){P.cam.yaw=Math.atan2(o.x-P.h.x,o.z-P.h.z);P.h.facing=P.cam.yaw;P.camera.lookAt(o.x,o.y+1.2,o.z);P.camera.updateMatrixWorld();MUX.aim.snaps++;MUX.aim.last=o;}}}
  return _muxFire(P,I);};

// ---------- Sichtweite auf „niedrig“: ferne Objekte nur fürs Zeichnen ausblenden (Sichtbarkeit wird danach zurückgesetzt) ----------
// Kategorien: Gebäude-Kacheln, sonstige statische Szene, Bäume (Instanzen), Passanten, Autos. Spieler und sein Auto nie.
let _muxS=null;
function muxSphereOf(o){_muxS=_muxS||new THREE.Sphere();if(o.isInstancedMesh){if(!o.boundingSphere&&o.computeBoundingSphere)try{o.computeBoundingSphere();}catch(_){}return o.boundingSphere?_muxS.copy(o.boundingSphere).applyMatrix4(o.matrixWorld):null;}
  if(o.isMesh){const g=o.geometry;if(!g||!g.boundingSphere)return null;return _muxS.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);}
  if(o.isGroup){let r=null;o.updateMatrixWorld(true);o.traverse(m=>{if(!m.isMesh||!m.geometry||!m.geometry.boundingSphere)return;const s=m.geometry.boundingSphere.clone().applyMatrix4(m.matrixWorld);if(!r)r=s;else r.union(s);});return r;}
  return null;}
function muxCullBuild(){const C=MUX.cull,L=[];const own=new Map();
  for(const h of HUMANS)if(h&&h.g)own.set(h.g,['ped',h]);for(const c of CARS)if(c&&c.g)own.set(c.g,['car',c]);
  const chunk=new Set();for(const c of CITY.chunks.values()){if(c.low)chunk.add(c.low);if(c.high)chunk.add(c.high);}
  const sky=new Set([GROUND.far,typeof OVERVIEW!=='undefined'?OVERVIEW:null]);
  for(const o of scene.children){if(!o||o.isLight||o.isCamera||o.isPoints||o.frustumCulled===false||sky.has(o))continue;
    const ow=own.get(o);if(ow){L.push({o,k:ow[0],a:ow[1],x:0,z:0,r:3});continue;}
    if(!o.isMesh&&!o.isGroup)continue;
    let s=o.userData.muxS;if(!s){const t=muxSphereOf(o);if(!t||!isFinite(t.radius)||t.radius<=0)continue;s=o.userData.muxS=[t.center.x,t.center.z,t.radius];}
    if(s[2]>900)continue;// Riesenflächen (Boden, Rhein) bleiben
    const k=chunk.has(o)?'bld':(o.isInstancedMesh&&(o.material===MAT.leaf||o.material===MAT.bark))?'tree':'stat';L.push({o,k,x:s[0],z:s[1],r:s[2]});}
  C.list=L;}
function muxCullApply(cam){const C=MUX.cull,R=C.R,px=cam.position.x,pz=cam.position.z,hid=[];const myCar=P1&&P1.car;
  for(const e of C.list){const o=e.o;if(!o.visible||o.parent!==scene)continue;let x=e.x,z=e.z;
    if(e.k==='ped'){if(e.a===P1.h)continue;x=e.a.x;z=e.a.z;}else if(e.k==='car'){if(e.a===myCar)continue;x=e.a.x;z=e.a.z;}
    const dx=x-px,dz=z-pz,lim=R[e.k]+e.r;if(dx*dx+dz*dz>lim*lim){o.visible=false;hid.push(o);}}
  C.hidden=hid.length;return hid;}
const _muxRender=renderFrame;
renderFrame=function(){const C=MUX.cull;
  if(!C.on||INDOOR||!Array.isArray(scene.children)||!P1||!P1.h)return _muxRender();
  if(--C.t<=0){C.t=30;muxCullBuild();}
  const hid=muxCullApply(camera);try{return _muxRender();}finally{for(const o of hid)o.visible=true;}};

// ---------- Messwerte für Tests/Audit: Draw-Calls und Dreiecke eines vollen Bildes ----------
function muxRenderInfo(){try{const I=renderer.info;if(!I||!I.render)return {calls:0,triangles:0,culled:MUX.cull.hidden};I.autoReset=false;I.reset();renderFrame();const r={calls:I.render.calls,triangles:I.render.triangles,culled:MUX.cull.hidden};I.autoReset=true;return r;}
  catch(_){return {calls:0,triangles:0,culled:MUX.cull.hidden};}}
MUX.renderInfo=muxRenderInfo;MUX.aimTarget=muxAimTarget;MUX.touchText=muxTouchText;
{let v;Object.defineProperty(window,'__MEENZ',{configurable:true,enumerable:true,get(){return v;},
  set(x){v=x;if(x&&typeof x==='object'&&!('RINFO' in x)){Object.defineProperty(x,'RINFO',{get:muxRenderInfo,enumerable:true});x.MUX=MUX;}}});}
// Testzugriff (window.__MEENZ.MUX.t)
MUX.t={openShop:s=>openShopMenu(P1,s),get shopOpen(){return SHOP_UI.open;},AUD,fire:I=>playerFire(P1,I||{}),openMap:()=>openMap(),get mapScale(){return MAPV.s;}};
