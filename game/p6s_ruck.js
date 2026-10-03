// ===================== Ruckler: Messhaken, Vorwärmen (Welle 10) =====================
// Vertrag: .claude/plans/2026-10-03-welle-10.md (Paket „ruckler“).
// 1. Messhaken: verdächtige Funktionen (Rendern, Minimap, Bodenkacheln, Chunks, Lazy-Zonen, Bild-Budget …) werden
//    umwickelt und messen ihre Zeit je Bild (RUCK.fr = letztes volles Bild, RUCK.max = Höchstwerte). Dauert ein Bild
//    länger als RUCK.spikeMs, landet es mit den teuersten Haken des Bilds davor in RUCK.spikes (tests/manual/ruck_tour.py).
//    Keine Allokation je Bild: feste Objekte, Wrapper mit fester Stelligkeit.
// 2. Vorwärmen: Shader/Programme und Texturen einer Lazy-Zone werden in eigenen Paketschritten vorbereitet, bevor die
//    Gruppe in die Szene kommt (ruckWarmZone, aufgerufen aus p6_lazy.js); beim Boot einmal die ganze Szene kompilieren.
const RUCK={hooks:[],acc:{},fr:{},max:{},spikes:[],spikeMs:50,lastNow:0,frames:0,
  job:{key:'',ms:0},jobMax:{key:'',ms:0},
  prewarm:{scene:0,sceneMs:0,zones:0,tex:0,ms:0,timeouts:0}};
function ruckHook(name,fn){const R=RUCK;R.hooks.push(name);R.acc[name]=0;R.fr[name]=0;R.max[name]=0;
  return function(a,b,c,d,e){const t=performance.now();try{return fn.call(this,a,b,c,d,e);}finally{R.acc[name]+=performance.now()-t;}};}
update=ruckHook('update',update);renderFrame=ruckHook('render',renderFrame);drawMinimap=ruckHook('mini',drawMinimap);updateHUD=ruckHook('hud',updateHUD);
updateGround=ruckHook('ground',updateGround);updateCityLOD=ruckHook('cityLOD',updateCityLOD);
updateStaticLOD=ruckHook('staticLOD',updateStaticLOD);updateLazy=ruckHook('lazy',updateLazy);fbPump=ruckHook('fbPump',fbPump);
updateStream=ruckHook('stream',updateStream);updateHgCold=ruckHook('hgCold',updateHgCold);updateBldSlim=ruckHook('bldSlim',updateBldSlim);
managePopulation=ruckHook('pop',managePopulation);updateUI=ruckHook('ui',updateUI);perfGovernor=ruckHook('perf',perfGovernor);
updateAmbient=ruckHook('ambient',updateAmbient);updateAudio=ruckHook('audio',updateAudio);updatePolice=ruckHook('police',updatePolice);
updatePlayer=ruckHook('player',updatePlayer);updateCamera=ruckHook('camera',updateCamera);humanShadowLOD=ruckHook('shadowLOD',humanShadowLOD);
updateSky=ruckHook('sky',updateSky);updateEnv=ruckHook('env',updateEnv);resolveCars=ruckHook('resolveCars',resolveCars);
carHumanContacts=ruckHook('carHuman',carHumanContacts);updateZone=ruckHook('zone',updateZone);updateMissions=ruckHook('missions',updateMissions);
updateTalk=ruckHook('talk',updateTalk);updateBuses=ruckHook('buses',updateBuses);updateStraba=ruckHook('straba',updateStraba);
updateAutos=ruckHook('autos',updateAutos);updateRhein=ruckHook('rhein',updateRhein);updateShips=ruckHook('ships',updateShips);
texFromCanvas=ruckHook('texCanvas',texFromCanvas);muxCullBuild=ruckHook('muxCull',muxCullBuild);
// Langsamstes Paket je Bild (Schlüssel + ms), zusätzlich zu FRAMEB.timing.slowest (Höchstwert seit Start)
{const _ruckFbStep=fbStep;fbStep=function(J){const t=performance.now();try{return _ruckFbStep(J);}finally{const d=performance.now()-t;const R=RUCK;
  if(d>R.job.ms){R.job.ms=d;R.job.key=J.key;}if(d>R.jobMax.ms){R.jobMax.ms=d;R.jobMax.key=J.key;}}};}
// Bild-Rahmen: Haken zurücksetzen, nach dem Bild nach RUCK.fr kopieren; ein langes Intervall zum Vorbild → RUCK.spikes
{const _ruckFrame=frame;frame=function(now){const R=RUCK,A=R.acc,H=R.hooks;const iv=R.lastNow?now-R.lastNow:0;R.lastNow=now;
  if(iv>R.spikeMs&&mode==='play'&&!window.__MANUAL)ruckSpike(iv);
  for(let i=0;i<H.length;i++)A[H[i]]=0;R.job.ms=0;R.job.key='';
  const t=performance.now();try{_ruckFrame(now);}finally{const F=R.fr,M=R.max;F.frame=performance.now()-t;if(F.frame>(M.frame||0))M.frame=F.frame;
    for(let i=0;i<H.length;i++){const k=H[i],v=A[k];F[k]=v;if(v>M[k])M[k]=v;}F.job=R.job.ms;F.jobKey=R.job.key;R.frames++;}};}
// Ein Bild hat länger als spikeMs gedauert: Haken des Bilds davor (das die Arbeit gemacht hat) festhalten
function ruckSpike(iv){const R=RUCK,F=R.fr;const top=R.hooks.filter(k=>F[k]>2&&k!=='update').sort((a,b)=>F[b]-F[a]).slice(0,5).map(k=>[k,Math.round(F[k]*10)/10]);
  R.spikes.push({t:Math.round(simTime*100)/100,iv:Math.round(iv),js:Math.round((F.frame||0)*10)/10,job:F.jobKey,jobMs:Math.round(F.job*10)/10,top});
  if(R.spikes.length>60)R.spikes.shift();}

// ---------- Vorwärmen ----------
function ruckWarmOn(){return !window.__NORENDER&&typeof renderer!=='undefined'&&typeof renderer.compileAsync==='function'&&!RUCK.warmOff;}
// Texturen aller Materialien unter obj (ohne Würfel-/Render-Ziel-Texturen), jede einmal
function ruckTextures(obj){const out=[],seen=new Set();
  obj.traverse(o=>{const ms=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
    for(const m of ms){if(seen.has(m))continue;seen.add(m);for(const k in m){const v=m[k];if(v&&v.isTexture&&!v.isCubeTexture&&!v.isRenderTargetTexture&&!seen.has(v)){seen.add(v);out.push(v);}}}});
  return out;}
// Ein Vorwärm-Schritt für eine fertig gebaute Zone (Gruppe noch nicht in der Szene). true = fertig.
// Schritt 1: Programme asynchron kompilieren (KHR_parallel_shader_compile, falls vorhanden); danach je Schritt
// höchstens zwei Texturen hochladen; fertig, wenn alles hochgeladen und die Programme bereit sind (Notbremse 1,5 s).
function ruckWarmZone(Z){if(!ruckWarmOn()||!Z.group)return true;const P=RUCK.prewarm;let W=Z.ruckWarm;const t=performance.now();
  try{
    if(!W){W=Z.ruckWarm={t0:t,ready:false,tex:ruckTextures(Z.group)};P.zones++;
      try{renderer.compileAsync(Z.group,camera,scene).then(()=>{W.ready=true;},()=>{W.ready=true;});}catch(e){W.ready=true;}
      return false;}
    for(let i=0;i<2&&W.tex.length;i++){const tx=W.tex.pop();if(tx.image||tx.isDataTexture){renderer.initTexture(tx);P.tex++;}}
    if(W.tex.length)return false;
    if(W.ready||t-W.t0>1500){if(!W.ready)P.timeouts++;Z.ruckWarm=null;return true;}
    return false;
  }finally{P.ms+=performance.now()-t;}}

function setupRuck(){
  // Alles, was beim Boot schon existiert (auch unsichtbare LOD-Stufen, ferne Kacheln), einmal kompilieren: neue Kacheln
  // und Chunks mit denselben Materialien (MAT.*) finden ihr Programm danach im Cache.
  if(!ruckWarmOn())return;const t=performance.now();
  try{renderer.compile(scene,camera);RUCK.prewarm.scene++;}catch(e){console.warn('ruck: compile',e);}
  RUCK.prewarm.sceneMs=Math.round(performance.now()-t);}
function updateRuck(dt){}
