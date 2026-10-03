// ===================== MOBIL-UX (Handy-Audit): Touch-Texte, Karte, Laden, Ton, Zielhilfe, Sichtweite „niedrig“ =====================
// Layout/Stapelung steckt im CSS von shell.html; hier nur das Verhalten. Gemeinsame Dateien bleiben unberührt:
// RINFO wird an __MEENZ gehängt, sobald p4e_main das Objekt setzt (Setter auf window).
const MUX={touch:()=>typeof TOUCHUI!=='undefined'&&TOUCHUI.mode==='touch',
  audio:{hooked:false,resumes:0},aim:{snaps:0,last:null,CONE:12*Math.PI/180,R:40},
  cull:{on:!!QS.lowLOD,list:[],t:0,hidden:0,R:{bld:600,stat:450,road:300,tree:320,ped:80,car:160,detail:18,small:0.07,roofDy:1.5}},pinch:{pts:new Map(),d0:0,zooms:0}};

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
// Kategorien: Gebäude-Kacheln, Straßen-Kacheln, sonstige statische Szene, Bäume (Instanzen), Passanten, Autos. Spieler und sein Auto nie.
// Die Kugel je Objekt liegt relativ zu seiner Position (bewegte Gruppen wandern mit). Weltmatrix und Geometrie-Kugel werden vor
// dem Messen aktualisiert: sonst landet alles, was noch nie gezeichnet wurde, beim Ursprung (Dom) und bleibt immer sichtbar.
let _muxS=null;
function muxGeoSphere(g){if(!g)return false;if(g.boundingSphere)return true;const p=g.attributes&&g.attributes.position;
  if(!p||!p.array||!p.array.length)return false;g.computeBoundingSphere();return !!g.boundingSphere&&isFinite(g.boundingSphere.radius);}
function muxSphereOf(o){_muxS=_muxS||new THREE.Sphere();o.updateWorldMatrix(true,false);
  if(o.isInstancedMesh){if(!o.boundingSphere&&o.computeBoundingSphere)try{o.computeBoundingSphere();}catch(_){}return o.boundingSphere?_muxS.copy(o.boundingSphere).applyMatrix4(o.matrixWorld):null;}
  if(o.isMesh)return muxGeoSphere(o.geometry)?_muxS.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld):null;
  if(o.isGroup){let r=null;o.updateMatrixWorld(true);o.traverse(m=>{if(!m.isMesh||!muxGeoSphere(m.geometry))return;const s=m.geometry.boundingSphere.clone().applyMatrix4(m.matrixWorld);if(!r)r=s;else r.union(s);});return r;}
  return null;}
// Kleinteile einer Figur/des Fliegerdackels (Ohren, Knöpfe, Nase, Brille: Kugel < R.small m) – ab R.detail m um ein Pixel am Handy
let _muxV=null;
function muxSmallParts(g){_muxV=_muxV||new THREE.Vector3();const out=[],lim=MUX.cull.R.small;g.updateMatrixWorld(true);
  g.traverse(m=>{if(!m.isMesh||!muxGeoSphere(m.geometry))return;m.getWorldScale(_muxV);if(m.geometry.boundingSphere.radius*Math.max(_muxV.x,_muxV.y,_muxV.z)<lim)out.push(m);});
  return out;}
function muxCullBuild(){const C=MUX.cull,L=[];const own=new Map();
  for(const h of HUMANS)if(h&&h.g)own.set(h.g,['ped',h]);for(const c of CARS)if(c&&c.g)own.set(c.g,['car',c]);
  const chunk=new Set();for(const c of CITY.chunks.values()){if(c.low)chunk.add(c.low);if(c.high)chunk.add(c.high);}
  const sky=new Set([GROUND.far,typeof OVERVIEW!=='undefined'?OVERVIEW:null]);
  for(const o of scene.children){if(!o||o.isLight||o.isCamera||o.isPoints||o.frustumCulled===false||sky.has(o)||o.userData.muxProp)continue;
    const ow=own.get(o);if(ow){L.push({o,k:ow[0],a:ow[1],x:0,z:0,r:3,sm:ow[0]==='ped'?muxSmallParts(o):null});continue;}
    if(!o.isMesh&&!o.isGroup)continue;
    let s=o.userData.muxS;if(!s){const t=muxSphereOf(o);if(!t||!isFinite(t.radius)||t.radius<=0)continue;s=o.userData.muxS=[t.center.x-o.position.x,t.center.z-o.position.z,t.radius];}
    if(s[2]>900)continue;// Riesenflächen (Boden, Rhein) bleiben
    // Straßen/Gehwege/Bordsteine der Kacheln (p2e_stream): weiter weg trägt der gemalte Boden (GROUND) dasselbe Bild
    const k=chunk.has(o)?'bld':(o.isInstancedMesh&&(o.material===MAT.leaf||o.material===MAT.bark))?'tree':STREAM.live.has(o)?'road':'stat';
    L.push({o,k,x:s[0],z:s[1],r:s[2],sm:DOGS.some(D=>D.g===o)?muxSmallParts(o):null});}
  C.list=L;C.n=scene.children.length;}
function muxCullApply(cam){const C=MUX.cull,R=C.R,px=cam.position.x,pz=cam.position.z,hid=[];const myCar=P1&&P1.car;
  for(const e of C.list){const o=e.o;if(!o.visible||o.parent!==scene)continue;let x=o.position.x+e.x,z=o.position.z+e.z;
    if(e.k==='ped'){if(e.a===P1.h)continue;x=e.a.x;z=e.a.z;}else if(e.k==='car'){if(e.a===myCar)continue;x=e.a.x;z=e.a.z;}
    const dx=x-px,dz=z-pz,d2=dx*dx+dz*dz,lim=R[e.k]+e.r;if(d2>lim*lim){o.visible=false;hid.push(o);continue;}
    if(e.sm&&d2>R.detail*R.detail)for(const m of e.sm)if(m.visible){m.visible=false;hid.push(m);}}
  // Dach-Aufbauten und Dach-Szenen (p4m_roofs): von unterhalb der Dachkante sieht man von ihnen höchstens ein paar Pixel
  const cy=cam.position.y-R.roofDy;
  for(const g of ROOF.clutter.values())if(g&&g.visible&&cy<g.position.y){g.visible=false;hid.push(g);}
  for(const sc of ROOF.active.values())if(sc&&sc.g.visible&&cy<sc.v){sc.g.visible=false;hid.push(sc.g);}
  C.hidden=hid.length;return hid;}

// ---------- Stadtweite Requisiten auf „niedrig“: nur Instanzen in Kameranähe zeichnen ----------
// Laternen, Bänke, Mülleimer, Poller, Litfaßsäulen, Ampelmasten, Café-Tische: je Art ein InstancedMesh über die ganze Stadt
// (instGeo) – ein Draw-Call, aber alle Instanzen laufen durch die GPU (Laternen allein ~0,6 Mio. Dreiecke). Hier rücken nur die
// Instanzen im Umkreis R der Kamera nach vorn (count = Treffer); neu sortiert wird erst nach `step` Metern Kamerabewegung.
// Quell-Matrizen je Liste einmal kopiert (Mast + Leuchte teilen sie). Ausgenommen: Meshes mit Instanzfarben (Ampel-Lichter
// schreiben ihre Farben je Index) und in Zonen-Gruppen verschobene (Lazy-Stadtteile) – die prüft erst das nächste Bild.
MUX.props={list:[],pending:[],src:new Map(),R:420,step:30,x:NaN,z:NaN,runs:0,shown:0,total:0,full:true};
const _muxInstGeo=instGeo;
instGeo=function(geo,mat,list,cast){const im=_muxInstGeo(geo,mat,list,cast);if(im&&MUX.cull.on&&list.length>=64)MUX.props.pending.push({im,list,n:list.length,hid:false});return im;};
function muxPropsShow(e,k){const im=e.im,A=im.instanceMatrix;im.count=k;A.clearUpdateRanges();A.addUpdateRange(0,k*16);A.needsUpdate=true;
  if(k){im.computeBoundingSphere();if(e.hid){im.visible=true;e.hid=false;}}else if(im.visible){im.visible=false;e.hid=true;}}
function muxPropsUpdate(cam){const P=MUX.props;
  if(P.pending.length){for(const e of P.pending)if(e.im.parent===scene&&!e.im.instanceColor){e.im.userData.muxProp=true;P.list.push(e);}P.pending.length=0;P.x=NaN;}
  const x=cam.position.x,z=cam.position.z;if(Math.abs(x-P.x)<P.step&&Math.abs(z-P.z)<P.step)return;
  P.x=x;P.z=z;P.runs++;P.full=false;const R2=P.R*P.R;let shown=0,total=0;
  for(const e of P.list){const a=e.im.instanceMatrix.array;let src=P.src.get(e.list);if(!src){src=a.slice(0,e.n*16);P.src.set(e.list,src);}
    let k=0;for(let i=0;i<e.n;i++){const o=i*16,dx=src[o+12]-x,dz=src[o+14]-z;if(dx*dx+dz*dz>R2)continue;a.set(src.subarray(o,o+16),k*16);k++;}
    muxPropsShow(e,k);shown+=k;total+=e.n;}
  P.shown=shown;P.total=total;}
// Geteilter Bildschirm zeichnet ohne renderFrame (zwei Kameras): dann wieder alle Instanzen
function muxPropsAll(){const P=MUX.props;if(P.full)return;P.full=true;P.x=NaN;
  for(const e of P.list){const src=P.src.get(e.list);if(src)e.im.instanceMatrix.array.set(src);muxPropsShow(e,e.n);}}
{const _muxSplit=renderSplit;renderSplit=function(){muxPropsAll();return _muxSplit();};}

const _muxRender=renderFrame;
renderFrame=function(){const C=MUX.cull;
  if(!C.on||INDOOR||!Array.isArray(scene.children)||!P1||!P1.h)return _muxRender();
  if(--C.t<=0||scene.children.length!==C.n){C.t=30;muxCullBuild();}
  muxPropsUpdate(camera);
  const hid=muxCullApply(camera);try{return _muxRender();}finally{for(const o of hid)o.visible=true;}};

// ---------- Messwerte für Tests/Audit: Draw-Calls und Dreiecke genau eines Bildes, aufgeteilt nach Durchgang ----------
// main = Szene (einmal je Bild, scenePasses), shadow = Schattenkarte, post = Nachbearbeitung (Bloom, Grading …);
// renders = Aufrufe von renderer.render (Szene + Vollbild-Pässe). calls/triangles = Summe, wie bisher.
function muxRenderInfo(){const C=MUX.cull,out={calls:0,triangles:0,culled:C.hidden,renders:0,scenePasses:0,
    main:{calls:0,triangles:0},shadow:{calls:0,triangles:0},post:{calls:0,triangles:0}};
  let I=null,SM=null,smR=null;const own=k=>Object.prototype.hasOwnProperty.call(scene,k),hadB=own('onBeforeRender'),hadA=own('onAfterRender'),ob=scene.onBeforeRender,oa=scene.onAfterRender;
  try{I=renderer.info;if(!I||!I.render)return out;const R=I.render;I.autoReset=false;I.reset();const f0=R.frame;let c0=0,t0=0,s0c=0,s0t=0;
    SM=renderer.shadowMap;smR=SM.render;
    SM.render=function(a,b,c){const c1=R.calls,t1=R.triangles;try{return smR.call(this,a,b,c);}finally{out.shadow.calls+=R.calls-c1;out.shadow.triangles+=R.triangles-t1;}};
    scene.onBeforeRender=function(){out.scenePasses++;c0=R.calls;t0=R.triangles;s0c=out.shadow.calls;s0t=out.shadow.triangles;};
    scene.onAfterRender=function(){out.main.calls+=R.calls-c0-(out.shadow.calls-s0c);out.main.triangles+=R.triangles-t0-(out.shadow.triangles-s0t);};
    renderFrame();
    out.calls=R.calls;out.triangles=R.triangles;out.renders=R.frame-f0;out.culled=C.hidden;
    out.post.calls=out.calls-out.main.calls-out.shadow.calls;out.post.triangles=out.triangles-out.main.triangles-out.shadow.triangles;
    return out;}
  catch(_){return out;}
  finally{if(I)I.autoReset=true;if(SM&&smR)SM.render=smR;
    if(hadB)scene.onBeforeRender=ob;else delete scene.onBeforeRender;if(hadA)scene.onAfterRender=oa;else delete scene.onAfterRender;}}
MUX.renderInfo=muxRenderInfo;MUX.aimTarget=muxAimTarget;MUX.touchText=muxTouchText;
{let v;Object.defineProperty(window,'__MEENZ',{configurable:true,enumerable:true,get(){return v;},
  set(x){v=x;if(x&&typeof x==='object'&&!('RINFO' in x)){Object.defineProperty(x,'RINFO',{get:muxRenderInfo,enumerable:true});x.MUX=MUX;}}});}
// Testzugriff (window.__MEENZ.MUX.t)
MUX.t={openShop:s=>openShopMenu(P1,s),get shopOpen(){return SHOP_UI.open;},AUD,fire:I=>playerFire(P1,I||{}),openMap:()=>openMap(),get mapScale(){return MAPV.s;}};
