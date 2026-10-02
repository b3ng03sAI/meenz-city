// ===================== LEISTUNGSSCHUTZ: Schatten-LOD, Auto-Grafikbremse, WebGL-Absturzrettung =====================
const PERF={acc:0,n:0,t:0,level:0,pr:null,ctxLost:false};
// Schatten nur für Figuren in Kameranähe (spart tausende Draw-Calls bei Menschenmengen)
function humanShadowLOD(){const cams=PLAYERS.map(P=>P.camera.position);const R=PERF.level>=2?14:26;
  for(const h of HUMANS){let d=1e9;for(const c of cams){const dd=Math.abs(h.x-c.x)+Math.abs(h.z-c.z);if(dd<d)d=dd;}const want=d<R;if(h._sh!==want){h._sh=want;h.g.traverse(o=>{if(o.isMesh)o.castShadow=want;});}
    // ganz weit weg: Hände/Nase/Schuhe sparen
    const far=d>70;if(h._far!==far){h._far=far;if(h.face)h.face.visible=!far&&h.face.visible;}}}
function perfGovernor(dt){if(mode!=='play'||PERF.ctxLost)return;PERF.acc+=dt;PERF.n++;PERF.t+=dt;if(PERF.t<4)return;const avg=PERF.acc/PERF.n;PERF.acc=0;PERF.n=0;PERF.t=0;
  if(avg>1/20&&PERF.level<4){PERF.level++;
    if(PERF.level===1){PERF.pr=Math.max(0.75,renderer.getPixelRatio()-0.35);renderer.setPixelRatio(PERF.pr);if(composer)composer.setPixelRatio?composer.setPixelRatio(PERF.pr):0;resizeAll();}
    else if(PERF.level===2){if(aoPass)aoPass.enabled=false;}
    else if(PERF.level===3){if(bloomPass)bloomPass.enabled=false;PERF.pr=0.75;renderer.setPixelRatio(0.75);resizeAll();}
    else if(PERF.level===4){renderer.shadowMap.autoUpdate=false;setInterval(()=>{renderer.shadowMap.needsUpdate=true;},250);}
    hint('Grafik automatisch reduziert, damit das Spiel flüssig bleibt (Stufe '+PERF.level+').',3);}}
function marktCap(){return {ultra:50,hoch:40,mittel:26,niedrig:16}[QUALITY]||36;}
(function(){const cv=renderer.domElement;cv.addEventListener('webglcontextlost',e=>{e.preventDefault();PERF.ctxLost=true;try{autoSave();}catch(_){}
  const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:rgba(10,12,16,.92);color:#fff;font:600 18px "Barlow Condensed",sans-serif;text-align:center;padding:24px';
  const lower={ultra:'hoch',hoch:'mittel',mittel:'niedrig',niedrig:'niedrig'}[QUALITY]||'niedrig';
  let tried=null;try{tried=sessionStorage.getItem('meenz-ctxretry');}catch(_){}
  if(lower!==QUALITY&&tried!==lower){try{localStorage.setItem('meenz-quality',lower);sessionStorage.setItem('meenz-ctxretry',lower);}catch(_){}location.reload();return;}
  d.innerHTML=`<div><div style="font-size:30px;margin-bottom:10px">Die Grafikkarte war überlastet</div><div style="opacity:.8;max-width:520px;margin:0 auto 18px">Das Spiel wurde automatisch gespeichert. Mit einer niedrigeren Grafikstufe läuft es stabiler.</div><button id="ctxreload" style="font:700 18px 'Barlow Condensed';padding:10px 22px;border-radius:8px;border:0;background:#ffd23f;cursor:pointer">Neu laden mit Grafik „${lower}“</button></div>`;
  document.body.appendChild(d);d.querySelector('#ctxreload').onclick=()=>{try{localStorage.setItem('meenz-quality',lower);}catch(_){}location.reload();};},false);})();
